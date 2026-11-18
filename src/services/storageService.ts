/**
 * SmartCare Hospital Management System - Authoritative API + LocalStorage Mirror & Real-Time Sync Service
 *
 * Implements:
 * 1. Backend API integration (/api/queue/*, /api/tokens/*, /api/doctors/*) with atomic per-doctor locking
 * 2. Real-time Server-Sent Events (SSE) + BroadcastChannel cross-tab synchronization
 * 3. Shared estimated waiting time calculation engine (queueEstimator.ts)
 * 4. Graceful LocalStorage mirror & offline fallback with strict RBAC guards
 */

import type {
  Appointment,
  Department,
  DiagnosticService,
  Doctor,
  DoctorQueueState,
  FeedbackItem,
  QueueState,
  TokenStatus,
  UserSession,
} from '../types';
import {
  INITIAL_APPOINTMENTS,
  INITIAL_DEPARTMENTS,
  INITIAL_DIAGNOSTICS,
  INITIAL_DOCTORS,
  INITIAL_FEEDBACKS,
  INITIAL_QUEUES,
} from '../data/initialData';
import { initBloodStorage, resetBloodDemoDatabase } from './bloodRequestService';
import {
  DEFAULT_AVG_CONSULTATION_MINUTES,
  computeActualDurationMinutes,
  normalizeTokenStatus,
  recalculateHospitalQueues,
} from './queueEstimator';

const KEYS = {
  DEPARTMENTS: 'smartcare_departments_v1',
  DOCTORS: 'smartcare_doctors_v1',
  DIAGNOSTICS: 'smartcare_diagnostics_v1',
  APPOINTMENTS: 'smartcare_appointments_v2',
  LEGACY_APPOINTMENTS: 'smartcare_appointments_v1',
  DOCTOR_QUEUES: 'smartcare_doctor_queues_v1',
  QUEUES: 'smartcare_queues_v1',
  FEEDBACKS: 'smartcare_feedbacks_v1',
  SESSION: 'smartcare_user_session_v1',
};

const LEGACY_KEYS: Record<string, string> = {
  smartcare_departments_v1: 'careplus_departments_v1',
  smartcare_doctors_v1: 'careplus_doctors_v1',
  smartcare_diagnostics_v1: 'careplus_diagnostics_v1',
  smartcare_appointments_v1: 'careplus_appointments_v1',
  smartcare_queues_v1: 'careplus_queues_v1',
  smartcare_feedbacks_v1: 'careplus_feedbacks_v1',
  smartcare_user_session_v1: 'careplus_user_session_v1',
};

const ADMIN_DEMO_PIN = '1234';
const BROADCAST_CHANNEL_NAME = 'smartcare_queue_sync_v1';

export interface ServerStateSnapshot {
  departments: Department[];
  doctors: Doctor[];
  diagnostics: DiagnosticService[];
  appointments: Appointment[];
  doctorQueues: Record<string, DoctorQueueState>;
  departmentQueues: Record<string, QueueState>;
  feedbacks: FeedbackItem[];
  serverTime?: string;
}

export interface QueueRealtimeEvent {
  type:
    | 'token:created'
    | 'token:called'
    | 'token:started'
    | 'token:completed'
    | 'token:skipped'
    | 'token:cancelled'
    | 'doctor:updated'
    | 'diagnostic:updated'
    | 'feedback:created'
    | 'db:reset'
    | 'state:sync';
  targetId?: string;
  tokenId?: string;
  tokenNumber?: number;
  patientName?: string;
  phone?: string;
  status?: string;
  message: string;
  timestamp: string;
  state?: ServerStateSnapshot;
}

function getBroadcastChannel(): BroadcastChannel | null {
  try {
    if (typeof window !== 'undefined' && typeof window.BroadcastChannel === 'function') {
      return new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    }
  } catch {
    // Ignore if unsupported
  }
  return null;
}

function emitCrossTabSync(event: Omit<QueueRealtimeEvent, 'timestamp'>): void {
  const ch = getBroadcastChannel();
  if (!ch) return;
  try {
    ch.postMessage({
      ...event,
      timestamp: new Date().toISOString(),
    });
  } catch {
    // Ignore serialization errors
  } finally {
    try {
      ch.close();
    } catch {
      // ignore
    }
  }
}

function readStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      const legacyKey = LEGACY_KEYS[key];
      const legacyRaw = legacyKey ? localStorage.getItem(legacyKey) : null;
      if (legacyRaw) {
        localStorage.setItem(key, legacyRaw);
        return JSON.parse(legacyRaw) as T;
      }
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`Error reading localStorage key "${key}", using default.`, err);
    return defaultValue;
  }
}

function writeStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Error saving to localStorage key "${key}".`, err);
  }
}

function applyRecalculatedLocalSnapshot(): ServerStateSnapshot {
  const departments = readStorage<Department[]>(KEYS.DEPARTMENTS, INITIAL_DEPARTMENTS);
  const doctors = readStorage<Doctor[]>(KEYS.DOCTORS, INITIAL_DOCTORS).map((d) => ({
    ...d,
    avgConsultationMinutes: d.avgConsultationMinutes ?? DEFAULT_AVG_CONSULTATION_MINUTES,
  }));
  const diagnostics = readStorage<DiagnosticService[]>(KEYS.DIAGNOSTICS, INITIAL_DIAGNOSTICS);

  let rawAppointments = localStorage.getItem(KEYS.APPOINTMENTS);
  if (!rawAppointments) {
    const v1Raw = localStorage.getItem(KEYS.LEGACY_APPOINTMENTS);
    if (v1Raw) {
      try {
        const parsedV1 = JSON.parse(v1Raw) as Appointment[];
        const migrated = parsedV1.map((a) => ({
          ...a,
          status: normalizeTokenStatus(a.status),
        }));
        writeStorage(KEYS.APPOINTMENTS, migrated);
        rawAppointments = JSON.stringify(migrated);
      } catch {
        // ignore
      }
    }
  }

  const appointments = readStorage<Appointment[]>(KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);
  const existingQueues = readStorage<Record<string, QueueState>>(KEYS.QUEUES, INITIAL_QUEUES);
  const feedbacks = readStorage<FeedbackItem[]>(KEYS.FEEDBACKS, INITIAL_FEEDBACKS);

  const recalculated = recalculateHospitalQueues({
    departments,
    doctors,
    diagnostics,
    appointments,
    existingDepartmentQueues: existingQueues,
    nowMs: Date.now(),
  });

  writeStorage(KEYS.DOCTORS, doctors);
  writeStorage(KEYS.APPOINTMENTS, recalculated.appointments);
  writeStorage(KEYS.DOCTOR_QUEUES, recalculated.doctorQueues);
  writeStorage(KEYS.QUEUES, recalculated.departmentQueues);

  return {
    departments,
    doctors,
    diagnostics,
    appointments: recalculated.appointments,
    doctorQueues: recalculated.doctorQueues,
    departmentQueues: recalculated.departmentQueues,
    feedbacks,
  };
}

export function applyServerSnapshotToCache(snapshot: ServerStateSnapshot): void {
  if (!snapshot) return;
  if (Array.isArray(snapshot.departments)) writeStorage(KEYS.DEPARTMENTS, snapshot.departments);
  if (Array.isArray(snapshot.doctors)) writeStorage(KEYS.DOCTORS, snapshot.doctors);
  if (Array.isArray(snapshot.diagnostics)) writeStorage(KEYS.DIAGNOSTICS, snapshot.diagnostics);
  if (Array.isArray(snapshot.appointments)) {
    writeStorage(
      KEYS.APPOINTMENTS,
      snapshot.appointments.map((a) => ({
        ...a,
        status: normalizeTokenStatus(a.status),
      }))
    );
  }
  if (snapshot.doctorQueues) writeStorage(KEYS.DOCTOR_QUEUES, snapshot.doctorQueues);
  if (snapshot.departmentQueues) writeStorage(KEYS.QUEUES, snapshot.departmentQueues);
  if (Array.isArray(snapshot.feedbacks)) writeStorage(KEYS.FEEDBACKS, snapshot.feedbacks);
}

// Initialize local storage on app startup
export function initLocalStorage(): void {
  readStorage(KEYS.DEPARTMENTS, INITIAL_DEPARTMENTS);
  readStorage(KEYS.DOCTORS, INITIAL_DOCTORS);
  readStorage(KEYS.DIAGNOSTICS, INITIAL_DIAGNOSTICS);
  readStorage(KEYS.FEEDBACKS, INITIAL_FEEDBACKS);
  applyRecalculatedLocalSnapshot();
  initBloodStorage();
}

export async function syncFromServer(): Promise<ServerStateSnapshot | null> {
  try {
    const res = await fetch('/api/queue/state', {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as ServerStateSnapshot;
    applyServerSnapshotToCache(data);
    return data;
  } catch {
    // Offline/static fallback
    return null;
  }
}

export function subscribeToQueueEvents(
  onUpdate: (event: QueueRealtimeEvent) => void
): () => void {
  let eventSource: EventSource | null = null;
  const ch = getBroadcastChannel();

  if (typeof window !== 'undefined' && typeof window.EventSource === 'function') {
    try {
      eventSource = new EventSource('/api/queue/events');
      eventSource.addEventListener('state', (e) => {
        try {
          const snapshot = JSON.parse((e as MessageEvent).data) as ServerStateSnapshot;
          applyServerSnapshotToCache(snapshot);
          onUpdate({
            type: 'state:sync',
            message: 'Queue state synchronized.',
            timestamp: snapshot.serverTime || new Date().toISOString(),
            state: snapshot,
          });
        } catch {
          // ignore malformed payload
        }
      });

      eventSource.addEventListener('queue_update', (e) => {
        try {
          const evt = JSON.parse((e as MessageEvent).data) as QueueRealtimeEvent;
          if (evt.state) {
            applyServerSnapshotToCache(evt.state);
          }
          onUpdate(evt);
        } catch {
          // ignore malformed payload
        }
      });
    } catch {
      // ignore
    }
  }

  const handleBroadcast = (msg: MessageEvent<QueueRealtimeEvent>) => {
    const evt = msg.data;
    if (!evt) return;
    if (evt.state) {
      applyServerSnapshotToCache(evt.state);
    }
    onUpdate(evt);
  };

  if (ch) {
    ch.addEventListener('message', handleBroadcast);
  }

  const handleStorageEvent = (e: StorageEvent) => {
    if (
      e.key === KEYS.APPOINTMENTS ||
      e.key === KEYS.DOCTOR_QUEUES ||
      e.key === KEYS.QUEUES ||
      e.key === KEYS.DOCTORS
    ) {
      const snapshot = applyRecalculatedLocalSnapshot();
      onUpdate({
        type: 'state:sync',
        message: 'Queue synchronized across browser tabs.',
        timestamp: new Date().toISOString(),
        state: snapshot,
      });
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorageEvent);
  }

  return () => {
    if (eventSource) eventSource.close();
    if (ch) {
      ch.removeEventListener('message', handleBroadcast);
      ch.close();
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorageEvent);
    }
  };
}

/**
 * RBAC guard for client/local mutations.
 */
function assertAdminSession(callerSession?: UserSession | null): UserSession {
  const storedSession = getSession();
  if (!storedSession || storedSession.role !== 'admin') {
    throw new Error('Unauthorized: Administrator privileges are required for this action.');
  }
  if (callerSession !== undefined && (!callerSession || callerSession.role !== 'admin')) {
    throw new Error('Unauthorized: Patient accounts cannot execute administrator actions.');
  }
  return storedSession;
}

function buildAdminHeaders(session: UserSession): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-smartcare-role': session.role,
    'x-smartcare-admin-token': session.authToken || '',
  };
}

async function callServerApi<T>(
  url: string,
  options: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; networkError: boolean; error: string }> {
  try {
    const res = await fetch(url, options);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        networkError: false,
        error: body?.error || `Server error (${res.status})`,
      };
    }
    return { ok: true, data: body as T };
  } catch (err: any) {
    return {
      ok: false,
      networkError: true,
      error: err?.message || 'Network unavailable',
    };
  }
}

/* ==================== DEPARTMENTS ==================== */
export function getDepartments(): Department[] {
  return readStorage<Department[]>(KEYS.DEPARTMENTS, INITIAL_DEPARTMENTS);
}

export function getDepartmentById(id: string): Department | undefined {
  return getDepartments().find((d) => d.id === id);
}

/* ==================== DOCTORS ==================== */
export function getDoctors(): Doctor[] {
  return readStorage<Doctor[]>(KEYS.DOCTORS, INITIAL_DOCTORS).map((d) => ({
    ...d,
    avgConsultationMinutes: d.avgConsultationMinutes ?? DEFAULT_AVG_CONSULTATION_MINUTES,
  }));
}

export function getDoctorById(id: string): Doctor | undefined {
  return getDoctors().find((doc) => doc.id === id);
}

export function getDoctorsByDepartment(departmentId: string): Doctor[] {
  return getDoctors().filter((doc) => doc.departmentId === departmentId);
}

export function saveDoctors(doctors: Doctor[]): void {
  writeStorage(KEYS.DOCTORS, doctors);
}

export async function addDoctorAsync(
  doctor: Omit<Doctor, 'id' | 'rating' | 'reviewCount' | 'reviews'>,
  callerSession?: UserSession | null
): Promise<Doctor> {
  const adminSession = assertAdminSession(callerSession);
  const apiRes = await callServerApi<{ doctor: Doctor; state: ServerStateSnapshot }>(
    '/api/doctors',
    {
      method: 'POST',
      headers: buildAdminHeaders(adminSession),
      body: JSON.stringify(doctor),
    }
  );
  if (apiRes.ok) {
    applyServerSnapshotToCache(apiRes.data.state);
    emitCrossTabSync({
      type: 'doctor:updated',
      targetId: apiRes.data.doctor.id,
      message: `Added ${apiRes.data.doctor.name}`,
      state: apiRes.data.state,
    });
    return apiRes.data.doctor;
  }
  if (!apiRes.networkError) {
    throw new Error(apiRes.error);
  }
  return addDoctor(doctor, adminSession);
}

export function addDoctor(
  doctor: Omit<Doctor, 'id' | 'rating' | 'reviewCount' | 'reviews'>,
  callerSession?: UserSession | null
): Doctor {
  assertAdminSession(callerSession);
  const doctors = getDoctors();
  const newDoctor: Doctor = {
    ...doctor,
    id: `doc-${Date.now()}`,
    rating: 4.8,
    reviewCount: 0,
    avgConsultationMinutes: doctor.avgConsultationMinutes ?? DEFAULT_AVG_CONSULTATION_MINUTES,
    reviews: [],
  };
  doctors.push(newDoctor);
  saveDoctors(doctors);

  const depts = getDepartments();
  const dept = depts.find((d) => d.id === doctor.departmentId);
  if (dept) {
    dept.doctorCount += 1;
    writeStorage(KEYS.DEPARTMENTS, depts);
  }
  applyRecalculatedLocalSnapshot();
  return newDoctor;
}

export function updateDoctor(updated: Doctor, callerSession?: UserSession | null): void {
  assertAdminSession(callerSession);
  const doctors = getDoctors().map((d) => (d.id === updated.id ? updated : d));
  saveDoctors(doctors);
  applyRecalculatedLocalSnapshot();
}

export async function updateDoctorQueueConfigAsync(
  doctorId: string,
  config: {
    avgConsultationMinutes?: number;
    avgConsultationOverride?: boolean;
    isAvailableToday?: boolean;
  },
  callerSession?: UserSession | null
): Promise<{ doctor: Doctor; state: ServerStateSnapshot }> {
  const adminSession = assertAdminSession(callerSession);
  const apiRes = await callServerApi<{ doctor: Doctor; state: ServerStateSnapshot }>(
    `/api/doctors/${encodeURIComponent(doctorId)}/config`,
    {
      method: 'PATCH',
      headers: buildAdminHeaders(adminSession),
      body: JSON.stringify(config),
    }
  );
  if (apiRes.ok) {
    applyServerSnapshotToCache(apiRes.data.state);
    emitCrossTabSync({
      type: 'doctor:updated',
      targetId: doctorId,
      message: `Updated queue configuration for ${apiRes.data.doctor.name}`,
      state: apiRes.data.state,
    });
    return apiRes.data;
  }
  if (!apiRes.networkError) {
    throw new Error(apiRes.error);
  }

  // Offline local fallback
  const doctors = getDoctors();
  const existing = doctors.find((d) => d.id === doctorId);
  if (!existing) throw new Error('Doctor not found.');
  const updatedDoc: Doctor = {
    ...existing,
    isAvailableToday:
      typeof config.isAvailableToday === 'boolean'
        ? config.isAvailableToday
        : existing.isAvailableToday,
    avgConsultationMinutes:
      typeof config.avgConsultationMinutes === 'number'
        ? Math.max(1, Math.min(120, Math.round(config.avgConsultationMinutes)))
        : existing.avgConsultationMinutes ?? 10,
    avgConsultationOverride:
      typeof config.avgConsultationOverride === 'boolean'
        ? config.avgConsultationOverride
        : config.avgConsultationMinutes !== undefined
        ? true
        : existing.avgConsultationOverride,
  };
  saveDoctors(doctors.map((d) => (d.id === doctorId ? updatedDoc : d)));
  const state = applyRecalculatedLocalSnapshot();
  emitCrossTabSync({
    type: 'doctor:updated',
    targetId: doctorId,
    message: `Updated queue configuration for ${updatedDoc.name}`,
    state,
  });
  return { doctor: updatedDoc, state };
}

export async function toggleDoctorAvailabilityAsync(
  id: string,
  callerSession?: UserSession | null
): Promise<boolean> {
  const adminSession = assertAdminSession(callerSession);
  const apiRes = await callServerApi<{ doctor: Doctor; state: ServerStateSnapshot }>(
    `/api/doctors/${encodeURIComponent(id)}/toggle`,
    {
      method: 'POST',
      headers: buildAdminHeaders(adminSession),
    }
  );
  if (apiRes.ok) {
    applyServerSnapshotToCache(apiRes.data.state);
    emitCrossTabSync({
      type: 'doctor:updated',
      targetId: id,
      message: `${apiRes.data.doctor.name} availability updated.`,
      state: apiRes.data.state,
    });
    return apiRes.data.doctor.isAvailableToday;
  }
  if (!apiRes.networkError) {
    throw new Error(apiRes.error);
  }
  return toggleDoctorAvailability(id, adminSession);
}

export function toggleDoctorAvailability(id: string, callerSession?: UserSession | null): boolean {
  assertAdminSession(callerSession);
  const doctors = getDoctors();
  const target = doctors.find((d) => d.id === id);
  if (target) {
    target.isAvailableToday = !target.isAvailableToday;
    saveDoctors(doctors);
    applyRecalculatedLocalSnapshot();
    return target.isAvailableToday;
  }
  return false;
}

/* ==================== DIAGNOSTIC SERVICES ==================== */
export function getDiagnostics(): DiagnosticService[] {
  return readStorage<DiagnosticService[]>(KEYS.DIAGNOSTICS, INITIAL_DIAGNOSTICS);
}

export function getDiagnosticById(id: string): DiagnosticService | undefined {
  return getDiagnostics().find((s) => s.id === id);
}

export function saveDiagnostics(services: DiagnosticService[]): void {
  writeStorage(KEYS.DIAGNOSTICS, services);
}

export async function updateDiagnosticFeeAsync(
  id: string,
  newFee: number,
  callerSession?: UserSession | null
): Promise<void> {
  const adminSession = assertAdminSession(callerSession);
  const apiRes = await callServerApi<{ diagnostic: DiagnosticService; state: ServerStateSnapshot }>(
    `/api/diagnostics/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: buildAdminHeaders(adminSession),
      body: JSON.stringify({ approxFee: newFee }),
    }
  );
  if (apiRes.ok) {
    applyServerSnapshotToCache(apiRes.data.state);
    return;
  }
  if (!apiRes.networkError) throw new Error(apiRes.error);
  updateDiagnosticFee(id, newFee, adminSession);
}

export function updateDiagnosticFee(
  id: string,
  newFee: number,
  callerSession?: UserSession | null
): void {
  assertAdminSession(callerSession);
  const list = getDiagnostics().map((s) => (s.id === id ? { ...s, approxFee: newFee } : s));
  saveDiagnostics(list);
}

export async function toggleDiagnosticAvailabilityAsync(
  id: string,
  callerSession?: UserSession | null
): Promise<void> {
  const adminSession = assertAdminSession(callerSession);
  const current = getDiagnosticById(id);
  const apiRes = await callServerApi<{ diagnostic: DiagnosticService; state: ServerStateSnapshot }>(
    `/api/diagnostics/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: buildAdminHeaders(adminSession),
      body: JSON.stringify({ isAvailableToday: current ? !current.isAvailableToday : true }),
    }
  );
  if (apiRes.ok) {
    applyServerSnapshotToCache(apiRes.data.state);
    return;
  }
  if (!apiRes.networkError) throw new Error(apiRes.error);
  toggleDiagnosticAvailability(id, adminSession);
}

export function toggleDiagnosticAvailability(
  id: string,
  callerSession?: UserSession | null
): void {
  assertAdminSession(callerSession);
  const list = getDiagnostics().map((s) =>
    s.id === id ? { ...s, isAvailableToday: !s.isAvailableToday } : s
  );
  saveDiagnostics(list);
  applyRecalculatedLocalSnapshot();
}

/* ==================== APPOINTMENTS & TOKENS ==================== */
export function getAppointments(): Appointment[] {
  const raw = readStorage<Appointment[]>(KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);
  return raw.map((a) => ({
    ...a,
    status: normalizeTokenStatus(a.status),
  }));
}

export function getAppointmentById(id: string): Appointment | undefined {
  return getAppointments().find((a) => a.id.toLowerCase() === id.trim().toLowerCase());
}

export function getAppointmentsByPhone(phone: string): Appointment[] {
  const clean = phone.trim();
  return getAppointments().filter((a) => a.phone.includes(clean));
}

export async function createAppointmentAsync(
  data: Omit<Appointment, 'id' | 'tokenNumber' | 'status' | 'createdAt'>
): Promise<Appointment> {
  const apiRes = await callServerApi<{ appointment: Appointment; state: ServerStateSnapshot }>(
    '/api/tokens',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
  if (apiRes.ok) {
    applyServerSnapshotToCache(apiRes.data.state);
    emitCrossTabSync({
      type: 'token:created',
      targetId: apiRes.data.appointment.targetId,
      tokenId: apiRes.data.appointment.id,
      tokenNumber: apiRes.data.appointment.tokenNumber,
      patientName: apiRes.data.appointment.patientName,
      phone: apiRes.data.appointment.phone,
      status: apiRes.data.appointment.status,
      message: `Token #${apiRes.data.appointment.tokenNumber} issued.`,
      state: apiRes.data.state,
    });
    return apiRes.data.appointment;
  }
  if (!apiRes.networkError) {
    throw new Error(apiRes.error);
  }
  return createAppointment(data);
}

export function createAppointment(
  data: Omit<Appointment, 'id' | 'tokenNumber' | 'status' | 'createdAt'>
): Appointment {
  const appointments = getAppointments();
  const targetTokens = appointments.filter(
    (a) => a.targetId === data.targetId || a.doctorId === data.targetId
  );
  const maxToken = targetTokens.reduce((max, t) => Math.max(max, t.tokenNumber), 0);
  const nextToken = maxToken + 1;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);

  const newAppointment: Appointment = {
    ...data,
    id: `SC-2026-${randomSuffix}`,
    doctorId: data.serviceType === 'doctor' ? data.targetId : undefined,
    tokenNumber: nextToken,
    status: 'WAITING',
    createdAt: new Date().toISOString(),
  };

  writeStorage(KEYS.APPOINTMENTS, [newAppointment, ...appointments]);
  const state = applyRecalculatedLocalSnapshot();
  const enriched = state.appointments.find((a) => a.id === newAppointment.id) || newAppointment;
  emitCrossTabSync({
    type: 'token:created',
    targetId: enriched.targetId,
    tokenId: enriched.id,
    tokenNumber: enriched.tokenNumber,
    patientName: enriched.patientName,
    phone: enriched.phone,
    status: enriched.status,
    message: `Token #${enriched.tokenNumber} issued.`,
    state,
  });
  return enriched;
}

export async function updateAppointmentStatusAsync(
  id: string,
  status: TokenStatus,
  callerSession?: UserSession | null
): Promise<{ token: Appointment; message: string }> {
  const adminSession = assertAdminSession(callerSession);
  const apiRes = await callServerApi<{
    token: Appointment;
    message: string;
    state: ServerStateSnapshot;
  }>(`/api/tokens/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: buildAdminHeaders(adminSession),
    body: JSON.stringify({ status }),
  });
  if (apiRes.ok) {
    applyServerSnapshotToCache(apiRes.data.state);
    emitCrossTabSync({
      type: 'state:sync',
      targetId: apiRes.data.token.targetId,
      tokenId: apiRes.data.token.id,
      tokenNumber: apiRes.data.token.tokenNumber,
      status: apiRes.data.token.status,
      message: apiRes.data.message,
      state: apiRes.data.state,
    });
    return { token: apiRes.data.token, message: apiRes.data.message };
  }
  if (!apiRes.networkError) {
    throw new Error(apiRes.error);
  }

  updateAppointmentStatus(id, status, adminSession);
  const updated = getAppointmentById(id)!;
  return { token: updated, message: `Token #${updated.tokenNumber} updated to ${status}.` };
}

export function updateAppointmentStatus(
  id: string,
  status: TokenStatus,
  callerSession?: UserSession | null
): void {
  assertAdminSession(callerSession);
  const normalized = normalizeTokenStatus(status);
  const nowIso = new Date().toISOString();
  const appointments = getAppointments().map((a) => {
    if (a.id !== id) return a;
    const patch: Partial<Appointment> = { status: normalized };
    if (normalized === 'CALLED' && !a.calledAt) patch.calledAt = nowIso;
    if (normalized === 'IN CONSULTATION') {
      patch.calledAt = a.calledAt || nowIso;
      patch.consultationStartAt = a.consultationStartAt || nowIso;
    }
    if (normalized === 'COMPLETED') {
      patch.calledAt = a.calledAt || nowIso;
      patch.consultationStartAt = a.consultationStartAt || a.calledAt || nowIso;
      patch.consultationEndAt = nowIso;
      patch.actualDurationMinutes = computeActualDurationMinutes(
        patch.consultationStartAt,
        nowIso
      );
    }
    return { ...a, ...patch };
  });
  writeStorage(KEYS.APPOINTMENTS, appointments);
  applyRecalculatedLocalSnapshot();
}

export async function cancelPatientAppointmentAsync(
  appointmentId: string,
  session: UserSession | null
): Promise<{ token: Appointment; message: string }> {
  const activeSession = getSession() || session;
  if (!activeSession) {
    throw new Error('Authentication required to cancel your appointment.');
  }

  const apiRes = await callServerApi<{
    token: Appointment;
    message: string;
    state: ServerStateSnapshot;
  }>(`/api/tokens/${encodeURIComponent(appointmentId)}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-smartcare-role': activeSession.role,
      'x-smartcare-admin-token': activeSession.authToken || '',
      'x-smartcare-phone': activeSession.phone,
      'x-smartcare-name': activeSession.name,
    },
    body: JSON.stringify({
      phone: activeSession.phone,
      patientName: activeSession.name,
    }),
  });

  if (apiRes.ok) {
    applyServerSnapshotToCache(apiRes.data.state);
    emitCrossTabSync({
      type: 'token:cancelled',
      targetId: apiRes.data.token.targetId,
      tokenId: apiRes.data.token.id,
      tokenNumber: apiRes.data.token.tokenNumber,
      status: 'CANCELLED',
      message: apiRes.data.message,
      state: apiRes.data.state,
    });
    return { token: apiRes.data.token, message: apiRes.data.message };
  }
  if (!apiRes.networkError) {
    throw new Error(apiRes.error);
  }

  cancelPatientAppointment(appointmentId, activeSession);
  const cancelled = getAppointmentById(appointmentId)!;
  return {
    token: cancelled,
    message: `Token #${cancelled.tokenNumber} has been cancelled.`,
  };
}

/**
 * Patients may cancel ONLY their own upcoming appointment.
 */
export function cancelPatientAppointment(
  appointmentId: string,
  session: UserSession | null
): void {
  const activeSession = getSession();
  if (!activeSession || !session) {
    throw new Error('Authentication required to cancel your appointment.');
  }
  const appointments = getAppointments();
  const target = appointments.find((a) => a.id === appointmentId);
  if (!target) {
    throw new Error('Appointment not found.');
  }
  const ownsAppointment =
    target.phone === activeSession.phone ||
    target.patientName.toLowerCase() === activeSession.name.toLowerCase();
  if (!ownsAppointment && activeSession.role !== 'admin') {
    throw new Error('Forbidden: You can only cancel your own appointment.');
  }

  const next = appointments.map((a) =>
    a.id === appointmentId ? { ...a, status: 'CANCELLED' as const } : a
  );
  writeStorage(KEYS.APPOINTMENTS, next);
  const state = applyRecalculatedLocalSnapshot();
  emitCrossTabSync({
    type: 'token:cancelled',
    targetId: target.targetId,
    tokenId: target.id,
    tokenNumber: target.tokenNumber,
    status: 'CANCELLED',
    message: `Token #${target.tokenNumber} cancelled.`,
    state,
  });
}

/* ==================== QUEUE MANAGEMENT (ADMIN-ONLY MUTATIONS) ==================== */
export function getQueues(): Record<string, QueueState> {
  return readStorage<Record<string, QueueState>>(KEYS.QUEUES, INITIAL_QUEUES);
}

export function getDoctorQueues(): Record<string, DoctorQueueState> {
  const existing = localStorage.getItem(KEYS.DOCTOR_QUEUES);
  if (existing) {
    try {
      return JSON.parse(existing) as Record<string, DoctorQueueState>;
    } catch {
      // fall through
    }
  }
  return applyRecalculatedLocalSnapshot().doctorQueues;
}

export function getQueueByDepartment(deptId: string): QueueState {
  const queues = getQueues();
  return (
    queues[deptId] || {
      departmentId: deptId,
      departmentName: 'OPD Queue',
      currentServingToken: 1,
      totalTokensToday: 10,
      estimatedMinutesPerPatient: DEFAULT_AVG_CONSULTATION_MINUTES,
      lastUpdated: 'Just now',
    }
  );
}

export interface TokenTransitionResult {
  token: Appointment;
  message: string;
  state: ServerStateSnapshot;
}

/**
 * ADMIN-ONLY: Calls the next WAITING patient in a doctor's independent queue -> CALLED.
 */
export async function callNextPatientAsync(
  targetId: string,
  callerSession?: UserSession | null
): Promise<TokenTransitionResult> {
  const adminSession = assertAdminSession(callerSession);
  const apiRes = await callServerApi<TokenTransitionResult>(
    `/api/queue/${encodeURIComponent(targetId)}/call-next`,
    {
      method: 'POST',
      headers: buildAdminHeaders(adminSession),
    }
  );

  if (apiRes.ok) {
    applyServerSnapshotToCache(apiRes.data.state);
    emitCrossTabSync({
      type: 'token:called',
      targetId,
      tokenId: apiRes.data.token.id,
      tokenNumber: apiRes.data.token.tokenNumber,
      patientName: apiRes.data.token.patientName,
      phone: apiRes.data.token.phone,
      status: 'CALLED',
      message: apiRes.data.message,
      state: apiRes.data.state,
    });
    return apiRes.data;
  }
  if (!apiRes.networkError) {
    throw new Error(apiRes.error);
  }

  // Offline local fallback (same strict guards!)
  const doctors = getDoctors();
  const doc = doctors.find((d) => d.id === targetId);
  if (doc && !doc.isAvailableToday) {
    throw new Error(`${doc.name} is currently unavailable / off-duty.`);
  }
  const appts = getAppointments();
  const targetTokens = appts.filter(
    (a) => a.targetId === targetId || a.doctorId === targetId
  );
  const active = targetTokens.find(
    (t) => t.status === 'CALLED' || t.status === 'IN CONSULTATION'
  );
  if (active) {
    throw new Error(
      `Active patient already in progress: Token #${active.tokenNumber} (${active.status}). Complete or skip first.`
    );
  }
  const nextWaiting = targetTokens
    .filter((t) => t.status === 'WAITING')
    .sort((a, b) => a.tokenNumber - b.tokenNumber)[0];
  if (!nextWaiting) {
    throw new Error('No waiting patients remaining in this queue.');
  }
  const nowIso = new Date().toISOString();
  writeStorage(
    KEYS.APPOINTMENTS,
    appts.map((a) =>
      a.id === nextWaiting.id ? { ...a, status: 'CALLED' as const, calledAt: nowIso } : a
    )
  );
  const state = applyRecalculatedLocalSnapshot();
  const updated = state.appointments.find((a) => a.id === nextWaiting.id)!;
  const message = `Token #${updated.tokenNumber} (${updated.patientName}) called.`;
  emitCrossTabSync({
    type: 'token:called',
    targetId,
    tokenId: updated.id,
    tokenNumber: updated.tokenNumber,
    patientName: updated.patientName,
    phone: updated.phone,
    status: 'CALLED',
    message,
    state,
  });
  return { token: updated, message, state };
}

/**
 * ADMIN-ONLY: Start Consultation (CALLED -> IN CONSULTATION)
 */
export async function startConsultationAsync(
  tokenId: string,
  callerSession?: UserSession | null
): Promise<TokenTransitionResult> {
  const adminSession = assertAdminSession(callerSession);
  const apiRes = await callServerApi<TokenTransitionResult>(
    `/api/tokens/${encodeURIComponent(tokenId)}/start`,
    {
      method: 'POST',
      headers: buildAdminHeaders(adminSession),
    }
  );
  if (apiRes.ok) {
    applyServerSnapshotToCache(apiRes.data.state);
    emitCrossTabSync({
      type: 'token:started',
      targetId: apiRes.data.token.targetId,
      tokenId: apiRes.data.token.id,
      tokenNumber: apiRes.data.token.tokenNumber,
      patientName: apiRes.data.token.patientName,
      phone: apiRes.data.token.phone,
      status: 'IN CONSULTATION',
      message: apiRes.data.message,
      state: apiRes.data.state,
    });
    return apiRes.data;
  }
  if (!apiRes.networkError) {
    throw new Error(apiRes.error);
  }

  const appts = getAppointments();
  const current = appts.find((a) => a.id === tokenId);
  if (!current) throw new Error('Token not found.');
  if (current.status !== 'CALLED' && current.status !== 'WAITING') {
    throw new Error(`Cannot start consultation from ${current.status} status.`);
  }
  const nowIso = new Date().toISOString();
  writeStorage(
    KEYS.APPOINTMENTS,
    appts.map((a) =>
      a.id === tokenId
        ? {
            ...a,
            status: 'IN CONSULTATION' as const,
            calledAt: a.calledAt || nowIso,
            consultationStartAt: nowIso,
          }
        : a
    )
  );
  const state = applyRecalculatedLocalSnapshot();
  const updated = state.appointments.find((a) => a.id === tokenId)!;
  const message = `Consultation started for Token #${updated.tokenNumber}.`;
  return { token: updated, message, state };
}

/**
 * ADMIN-ONLY: Complete Consultation (IN CONSULTATION / CALLED -> COMPLETED)
 */
export async function completeConsultationAsync(
  tokenId: string,
  callerSession?: UserSession | null
): Promise<TokenTransitionResult> {
  const adminSession = assertAdminSession(callerSession);
  const apiRes = await callServerApi<TokenTransitionResult>(
    `/api/tokens/${encodeURIComponent(tokenId)}/complete`,
    {
      method: 'POST',
      headers: buildAdminHeaders(adminSession),
    }
  );
  if (apiRes.ok) {
    applyServerSnapshotToCache(apiRes.data.state);
    emitCrossTabSync({
      type: 'token:completed',
      targetId: apiRes.data.token.targetId,
      tokenId: apiRes.data.token.id,
      tokenNumber: apiRes.data.token.tokenNumber,
      patientName: apiRes.data.token.patientName,
      phone: apiRes.data.token.phone,
      status: 'COMPLETED',
      message: apiRes.data.message,
      state: apiRes.data.state,
    });
    return apiRes.data;
  }
  if (!apiRes.networkError) {
    throw new Error(apiRes.error);
  }

  const appts = getAppointments();
  const current = appts.find((a) => a.id === tokenId);
  if (!current) throw new Error('Token not found.');
  if (current.status !== 'IN CONSULTATION' && current.status !== 'CALLED') {
    throw new Error(`Only CALLED or IN CONSULTATION tokens can be completed.`);
  }
  const nowIso = new Date().toISOString();
  const startIso = current.consultationStartAt || current.calledAt || nowIso;
  const duration = computeActualDurationMinutes(startIso, nowIso);
  writeStorage(
    KEYS.APPOINTMENTS,
    appts.map((a) =>
      a.id === tokenId
        ? {
            ...a,
            status: 'COMPLETED' as const,
            calledAt: a.calledAt || startIso,
            consultationStartAt: startIso,
            consultationEndAt: nowIso,
            actualDurationMinutes: duration,
          }
        : a
    )
  );
  const state = applyRecalculatedLocalSnapshot();
  const updated = state.appointments.find((a) => a.id === tokenId)!;
  const message = `Consultation completed for Token #${updated.tokenNumber}.`;
  return { token: updated, message, state };
}

/**
 * ADMIN-ONLY: Skip Patient Token (WAITING / CALLED / IN CONSULTATION -> SKIPPED)
 */
export async function skipPatientTokenAsync(
  tokenId: string,
  callerSession?: UserSession | null
): Promise<TokenTransitionResult> {
  const adminSession = assertAdminSession(callerSession);
  const apiRes = await callServerApi<TokenTransitionResult>(
    `/api/tokens/${encodeURIComponent(tokenId)}/skip`,
    {
      method: 'POST',
      headers: buildAdminHeaders(adminSession),
    }
  );
  if (apiRes.ok) {
    applyServerSnapshotToCache(apiRes.data.state);
    emitCrossTabSync({
      type: 'token:skipped',
      targetId: apiRes.data.token.targetId,
      tokenId: apiRes.data.token.id,
      tokenNumber: apiRes.data.token.tokenNumber,
      patientName: apiRes.data.token.patientName,
      phone: apiRes.data.token.phone,
      status: 'SKIPPED',
      message: apiRes.data.message,
      state: apiRes.data.state,
    });
    return apiRes.data;
  }
  if (!apiRes.networkError) {
    throw new Error(apiRes.error);
  }

  const appts = getAppointments();
  const current = appts.find((a) => a.id === tokenId);
  if (!current) throw new Error('Token not found.');
  writeStorage(
    KEYS.APPOINTMENTS,
    appts.map((a) => (a.id === tokenId ? { ...a, status: 'SKIPPED' as const } : a))
  );
  const state = applyRecalculatedLocalSnapshot();
  const updated = state.appointments.find((a) => a.id === tokenId)!;
  const message = `Token #${updated.tokenNumber} skipped.`;
  return { token: updated, message, state };
}

export async function resetDemoDatabaseAsync(callerSession?: UserSession | null): Promise<void> {
  const adminSession = assertAdminSession(callerSession);
  const apiRes = await callServerApi<{ state: ServerStateSnapshot }>('/api/admin/reset', {
    method: 'POST',
    headers: buildAdminHeaders(adminSession),
  });
  if (apiRes.ok) {
    applyServerSnapshotToCache(apiRes.data.state);
    resetBloodDemoDatabase();
    emitCrossTabSync({
      type: 'db:reset',
      message: 'SmartCare demo database reset.',
      state: apiRes.data.state,
    });
    return;
  }
  if (!apiRes.networkError) throw new Error(apiRes.error);
  resetDemoDatabase(adminSession);
}

export function resetDemoDatabase(callerSession?: UserSession | null): void {
  assertAdminSession(callerSession);
  localStorage.setItem(KEYS.DEPARTMENTS, JSON.stringify(INITIAL_DEPARTMENTS));
  localStorage.setItem(KEYS.DOCTORS, JSON.stringify(INITIAL_DOCTORS));
  localStorage.setItem(KEYS.DIAGNOSTICS, JSON.stringify(INITIAL_DIAGNOSTICS));
  localStorage.setItem(KEYS.APPOINTMENTS, JSON.stringify(INITIAL_APPOINTMENTS));
  localStorage.setItem(KEYS.QUEUES, JSON.stringify(INITIAL_QUEUES));
  localStorage.setItem(KEYS.FEEDBACKS, JSON.stringify(INITIAL_FEEDBACKS));
  applyRecalculatedLocalSnapshot();
  resetBloodDemoDatabase();
}

/* ==================== FEEDBACK ==================== */
export function getFeedbacks(): FeedbackItem[] {
  return readStorage<FeedbackItem[]>(KEYS.FEEDBACKS, INITIAL_FEEDBACKS);
}

export async function addFeedbackAsync(
  data: Omit<FeedbackItem, 'id' | 'date' | 'verified'>
): Promise<FeedbackItem> {
  const apiRes = await callServerApi<{ feedback: FeedbackItem; state: ServerStateSnapshot }>(
    '/api/feedback',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
  if (apiRes.ok) {
    applyServerSnapshotToCache(apiRes.data.state);
    return apiRes.data.feedback;
  }
  return addFeedback(data);
}

export function addFeedback(data: Omit<FeedbackItem, 'id' | 'date' | 'verified'>): FeedbackItem {
  const list = getFeedbacks();
  const appointments = getAppointments();
  const match = appointments.find(
    (a) => a.id.toLowerCase() === data.appointmentId.trim().toLowerCase()
  );

  const newFeedback: FeedbackItem = {
    ...data,
    id: `fb-${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    verified: Boolean(match),
  };

  list.unshift(newFeedback);
  writeStorage(KEYS.FEEDBACKS, list);
  return newFeedback;
}

/* ==================== SESSION / AUTH ==================== */
export function getSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(KEYS.SESSION);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setSession(session: UserSession | null): void {
  if (!session) {
    localStorage.removeItem(KEYS.SESSION);
    return;
  }
  if (session.role === 'admin') {
    throw new Error('Administrator sessions require PIN authentication via loginAsAdminAsync().');
  }
  const safePatientSession: UserSession = {
    ...session,
    role: 'patient',
  };
  localStorage.setItem(KEYS.SESSION, JSON.stringify(safePatientSession));
}

export async function loginAsAdminAsync(pin: string): Promise<UserSession> {
  const apiRes = await callServerApi<{ session: UserSession }>('/api/auth/admin-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
  if (apiRes.ok) {
    localStorage.setItem(KEYS.SESSION, JSON.stringify(apiRes.data.session));
    return apiRes.data.session;
  }
  if (!apiRes.networkError) {
    throw new Error(apiRes.error);
  }
  return loginAsAdmin(pin);
}

export function loginAsAdmin(pin: string): UserSession {
  if (pin.trim() !== ADMIN_DEMO_PIN) {
    throw new Error('Invalid Administrator Security PIN. Access denied.');
  }
  const adminSession: UserSession = {
    id: 'admin-01',
    name: 'Hospital Administrator',
    phone: '9999900000',
    role: 'admin',
  };
  localStorage.setItem(KEYS.SESSION, JSON.stringify(adminSession));
  return adminSession;
}
