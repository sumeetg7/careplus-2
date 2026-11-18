import type {
  Appointment,
  Department,
  DiagnosticService,
  Doctor,
  DoctorQueueState,
  QueueState,
  TokenStatus,
} from '../types/index.ts';

export const DEFAULT_AVG_CONSULTATION_MINUTES = 10;

export function normalizeTokenStatus(raw: string | undefined | null): TokenStatus {
  const val = String(raw || '').trim().toUpperCase();
  if (val === 'CONFIRMED' || val === 'WAITING') return 'WAITING';
  if (val === 'CALLED') return 'CALLED';
  if (val === 'IN CONSULTATION' || val === 'IN_CONSULTATION') return 'IN CONSULTATION';
  if (val === 'COMPLETED' || val === 'SERVED') return 'COMPLETED';
  if (val === 'SKIPPED') return 'SKIPPED';
  if (val === 'CANCELLED' || val === 'CANCELED') return 'CANCELLED';
  return 'WAITING';
}

export function formatClockTime(timestampMs: number): string {
  return new Date(timestampMs).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function computeActualDurationMinutes(
  startIso?: string,
  endIso?: string
): number | undefined {
  if (!startIso || !endIso) return undefined;
  const startMs = Date.parse(startIso);
  const endMs = Date.parse(endIso);
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) {
    return undefined;
  }
  const mins = (endMs - startMs) / 60000;
  return Math.max(0.1, Math.round(mins * 10) / 10);
}

/**
 * Computes rolling average duration (in minutes) across the last 10 COMPLETED consultations
 * that have valid start and end timestamps (>= 1 minute clinical consultation).
 */
export function computeRollingAverageMinutes(targetTokens: Appointment[]): number | null {
  const completedWithDuration = targetTokens
    .filter((t) => normalizeTokenStatus(t.status) === 'COMPLETED')
    .map((t) => {
      const computed =
        typeof t.actualDurationMinutes === 'number' && t.actualDurationMinutes > 0
          ? t.actualDurationMinutes
          : computeActualDurationMinutes(t.consultationStartAt, t.consultationEndAt);
      return {
        endMs: t.consultationEndAt ? Date.parse(t.consultationEndAt) : Date.parse(t.createdAt),
        duration: computed,
      };
    })
    .filter((item): item is { endMs: number; duration: number } =>
      typeof item.duration === 'number' && item.duration >= 1
    )
    .sort((a, b) => b.endMs - a.endMs)
    .slice(0, 10);

  if (completedWithDuration.length === 0) return null;
  const total = completedWithDuration.reduce((sum, item) => sum + item.duration, 0);
  return Math.max(1, Math.round(total / completedWithDuration.length));
}

export interface TargetQueueCalculation {
  queueState: DoctorQueueState;
  updatedAppointments: Appointment[];
}

export function calculateQueueForTarget(params: {
  targetId: string;
  targetName: string;
  departmentId: string;
  departmentName: string;
  serviceType: 'doctor' | 'diagnostic';
  configuredAvgMinutes?: number;
  avgOverride?: boolean;
  isAvailable: boolean;
  appointments: Appointment[];
  nowMs?: number;
}): TargetQueueCalculation {
  const nowMs = params.nowMs ?? Date.now();
  const targetTokens = params.appointments
    .filter((a) => a.targetId === params.targetId || a.doctorId === params.targetId)
    .map((a) => ({
      ...a,
      status: normalizeTokenStatus(a.status),
      doctorId: a.serviceType === 'doctor' ? a.doctorId || a.targetId : a.doctorId,
      departmentId: a.departmentId || params.departmentId,
    }));

  const rollingAvgMinutes = computeRollingAverageMinutes(targetTokens);
  const configured =
    typeof params.configuredAvgMinutes === 'number' && params.configuredAvgMinutes > 0
      ? Math.round(params.configuredAvgMinutes)
      : DEFAULT_AVG_CONSULTATION_MINUTES;

  // Use explicit admin configuration if manually overridden; otherwise use rolling avg of last 10 completed consultations if available, falling back to configured default (10 mins)
  const effectiveAvgMinutes = params.avgOverride
    ? configured
    : rollingAvgMinutes ?? configured;

  // Identify single active token (IN CONSULTATION takes priority if any, then CALLED)
  const inConsultationToken = targetTokens.find((t) => t.status === 'IN CONSULTATION') || null;
  const calledToken = targetTokens.find((t) => t.status === 'CALLED') || null;
  const activeToken = inConsultationToken || calledToken;

  let remainingCurrentMinutes = 0;
  if (inConsultationToken) {
    if (inConsultationToken.consultationStartAt) {
      const startMs = Date.parse(inConsultationToken.consultationStartAt);
      const elapsedMinutes = Number.isNaN(startMs)
        ? 0
        : Math.max(0, (nowMs - startMs) / 60000);
      remainingCurrentMinutes = Math.max(0, Math.round(effectiveAvgMinutes - elapsedMinutes));
    } else {
      remainingCurrentMinutes = effectiveAvgMinutes;
    }
  } else if (calledToken) {
    // Patient called to consultation room, waiting to begin consult
    remainingCurrentMinutes = effectiveAvgMinutes;
  }

  // Strictly eligible WAITING patients sorted ascending by tokenNumber
  const waitingTokens = targetTokens
    .filter((t) => t.status === 'WAITING')
    .sort((a, b) => a.tokenNumber - b.tokenNumber);

  const waitingMap = new Map<
    string,
    { patientsAhead: number; estimatedWaitMinutes: number; estimatedTime: string }
  >();

  waitingTokens.forEach((tok, idx) => {
    const patientsAhead = idx;
    const estimatedWaitMinutes = remainingCurrentMinutes + patientsAhead * effectiveAvgMinutes;
    const estimatedTime = formatClockTime(nowMs + estimatedWaitMinutes * 60000);
    waitingMap.set(tok.id, {
      patientsAhead,
      estimatedWaitMinutes,
      estimatedTime,
    });
  });

  const highestTokenNumber = targetTokens.reduce(
    (max, t) => Math.max(max, t.tokenNumber),
    0
  );

  const lastCompleted = targetTokens
    .filter((t) => t.status === 'COMPLETED')
    .sort((a, b) => b.tokenNumber - a.tokenNumber)[0];

  const currentServingToken = activeToken
    ? activeToken.tokenNumber
    : lastCompleted
    ? lastCompleted.tokenNumber
    : 0;

  const updatedAppointments = targetTokens.map((tok) => {
    if (tok.status === 'WAITING') {
      const calc = waitingMap.get(tok.id);
      return {
        ...tok,
        patientsAhead: calc?.patientsAhead ?? 0,
        estimatedWaitMinutes: calc?.estimatedWaitMinutes ?? 0,
        estimatedTime: calc?.estimatedTime ?? formatClockTime(nowMs),
      };
    }
    if (tok.status === 'CALLED') {
      return {
        ...tok,
        patientsAhead: 0,
        estimatedWaitMinutes: 0,
        estimatedTime: 'Now Called',
      };
    }
    if (tok.status === 'IN CONSULTATION') {
      return {
        ...tok,
        patientsAhead: 0,
        estimatedWaitMinutes: 0,
        estimatedTime: 'In Consultation',
      };
    }
    return {
      ...tok,
      patientsAhead: 0,
      estimatedWaitMinutes: 0,
    };
  });

  const completedCount = targetTokens.filter((t) => t.status === 'COMPLETED').length;

  const queueState: DoctorQueueState = {
    targetId: params.targetId,
    targetName: params.targetName,
    departmentId: params.departmentId,
    departmentName: params.departmentName,
    serviceType: params.serviceType,
    currentServingToken,
    activeTokenId: activeToken ? activeToken.id : null,
    activePatientName: activeToken ? activeToken.patientName : null,
    activeStatus: activeToken
      ? (activeToken.status as 'CALLED' | 'IN CONSULTATION')
      : null,
    activeCalledAt: activeToken?.calledAt || null,
    activeConsultationStartAt: activeToken?.consultationStartAt || null,
    totalTokensToday: highestTokenNumber,
    avgConsultationMinutes: effectiveAvgMinutes,
    rollingAvgMinutes,
    completedCount,
    waitingCount: waitingTokens.length,
    remainingCurrentMinutes,
    isAvailable: params.isAvailable,
    lastUpdated: formatClockTime(nowMs),
  };

  return { queueState, updatedAppointments };
}

export function recalculateHospitalQueues(params: {
  departments: Department[];
  doctors: Doctor[];
  diagnostics: DiagnosticService[];
  appointments: Appointment[];
  existingDepartmentQueues?: Record<string, QueueState>;
  nowMs?: number;
}): {
  appointments: Appointment[];
  doctorQueues: Record<string, DoctorQueueState>;
  departmentQueues: Record<string, QueueState>;
} {
  const nowMs = params.nowMs ?? Date.now();
  const normalizedAppointments = params.appointments.map((a) => ({
    ...a,
    status: normalizeTokenStatus(a.status),
  }));

  const doctorQueues: Record<string, DoctorQueueState> = {};
  const appointmentById = new Map<string, Appointment>();

  // 1. Calculate independent queue for every doctor
  for (const doc of params.doctors) {
    const calc = calculateQueueForTarget({
      targetId: doc.id,
      targetName: doc.name,
      departmentId: doc.departmentId,
      departmentName: doc.departmentName,
      serviceType: 'doctor',
      configuredAvgMinutes: doc.avgConsultationMinutes ?? DEFAULT_AVG_CONSULTATION_MINUTES,
      avgOverride: doc.avgConsultationOverride,
      isAvailable: doc.isAvailableToday,
      appointments: normalizedAppointments,
      nowMs,
    });
    doctorQueues[doc.id] = calc.queueState;
    for (const appt of calc.updatedAppointments) {
      appointmentById.set(appt.id, appt);
    }
  }

  // 2. Calculate independent queue for every diagnostic service
  for (const diag of params.diagnostics) {
    const calc = calculateQueueForTarget({
      targetId: diag.id,
      targetName: diag.name,
      departmentId: `diag-${diag.category.toLowerCase()}`,
      departmentName: diag.category,
      serviceType: 'diagnostic',
      configuredAvgMinutes: 15,
      avgOverride: false,
      isAvailable: diag.isAvailableToday,
      appointments: normalizedAppointments,
      nowMs,
    });
    doctorQueues[diag.id] = calc.queueState;
    for (const appt of calc.updatedAppointments) {
      appointmentById.set(appt.id, appt);
    }
  }

  // Preserve original order of appointments with updated estimates
  const finalAppointments = normalizedAppointments.map(
    (a) => appointmentById.get(a.id) || a
  );

  // 3. Derive department-level summary queues (for HomePage & DepartmentsPage cards)
  const departmentQueues: Record<string, QueueState> = {};
  for (const dept of params.departments) {
    const deptDoctorQueues = params.doctors
      .filter((d) => d.departmentId === dept.id)
      .map((d) => doctorQueues[d.id])
      .filter(Boolean);

    const activeQueue =
      deptDoctorQueues.find((dq) => dq.activeTokenId) ||
      deptDoctorQueues.find((dq) => dq.totalTokensToday > 0) ||
      deptDoctorQueues[0];

    const fallback = params.existingDepartmentQueues?.[dept.id];
    const totalTokens = deptDoctorQueues.reduce((sum, dq) => sum + dq.totalTokensToday, 0);
    const avgPace =
      deptDoctorQueues.length > 0
        ? Math.round(
            deptDoctorQueues.reduce((sum, dq) => sum + dq.avgConsultationMinutes, 0) /
              deptDoctorQueues.length
          )
        : fallback?.estimatedMinutesPerPatient ?? DEFAULT_AVG_CONSULTATION_MINUTES;

    departmentQueues[dept.id] = {
      departmentId: dept.id,
      departmentName: `${dept.name} OPD`,
      currentServingToken: activeQueue?.currentServingToken || fallback?.currentServingToken || 0,
      totalTokensToday: totalTokens || fallback?.totalTokensToday || 0,
      estimatedMinutesPerPatient: avgPace,
      lastUpdated: formatClockTime(nowMs),
    };
  }

  return {
    appointments: finalAppointments,
    doctorQueues,
    departmentQueues,
  };
}
