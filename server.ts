import 'dotenv/config';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import type {
  Appointment,
  BloodGroup,
  BloodRequest,
  BloodRequestStatus,
  BloodStockItem,
  Department,
  DiagnosticService,
  Doctor,
  DoctorQueueState,
  FeedbackItem,
  QueueState,
} from './src/types/index.ts';
import {
  INITIAL_BLOOD_REQUESTS,
  INITIAL_BLOOD_STOCK,
  INITIAL_DEPARTMENTS,
  INITIAL_DIAGNOSTICS,
  INITIAL_DOCTORS,
  INITIAL_FEEDBACKS,
  INITIAL_QUEUES,
  buildInitialAppointments,
  computeBloodAvailabilityStatus,
} from './src/data/initialData.ts';
import {
  DEFAULT_AVG_CONSULTATION_MINUTES,
  computeActualDurationMinutes,
  normalizeTokenStatus,
  recalculateHospitalQueues,
} from './src/services/queueEstimator.ts';

const ADMIN_DEMO_PIN = process.env.SMARTCARE_ADMIN_PIN || '1234';
const ADMIN_TOKEN_SECRET =
  process.env.SMARTCARE_ADMIN_SECRET || 'smartcare-hospital-rbac-secret-2026';

export interface SmartCareDbState {
  departments: Department[];
  doctors: Doctor[];
  diagnostics: DiagnosticService[];
  appointments: Appointment[];
  doctorQueues: Record<string, DoctorQueueState>;
  departmentQueues: Record<string, QueueState>;
  feedbacks: FeedbackItem[];
  bloodStock: BloodStockItem[];
  bloodRequests: BloodRequest[];
}

export interface SmartCareQueueEvent {
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
    | 'blood:stock_updated'
    | 'blood:request_created'
    | 'blood:request_updated'
    | 'db:reset';
  targetId?: string;
  tokenId?: string;
  tokenNumber?: number;
  patientName?: string;
  phone?: string;
  status?: string;
  message: string;
  timestamp: string;
  state: ReturnType<typeof serializeState>;
}

function signAdminToken(adminId: string): string {
  const issuedAt = String(Date.now());
  const payload = `${adminId}.${issuedAt}`;
  const sig = crypto
    .createHmac('sha256', ADMIN_TOKEN_SECRET)
    .update(payload)
    .digest('hex');
  return `${payload}.${sig}`;
}

function verifyAdminToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [adminId, issuedAt, providedSig] = parts;
  if (!adminId || !issuedAt || !providedSig) return false;
  const expectedSig = crypto
    .createHmac('sha256', ADMIN_TOKEN_SECRET)
    .update(`${adminId}.${issuedAt}`)
    .digest('hex');
  const a = Buffer.from(providedSig, 'utf8');
  const b = Buffer.from(expectedSig, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function buildFreshSeedState(nowMs: number = Date.now()): SmartCareDbState {
  const doctors = INITIAL_DOCTORS.map((d) => ({
    ...d,
    avgConsultationMinutes: d.avgConsultationMinutes ?? DEFAULT_AVG_CONSULTATION_MINUTES,
    avgConsultationOverride: false,
  }));
  const departments = INITIAL_DEPARTMENTS.map((d) => ({ ...d }));
  const diagnostics = INITIAL_DIAGNOSTICS.map((d) => ({ ...d }));
  const appointments = buildInitialAppointments(nowMs);
  const feedbacks = INITIAL_FEEDBACKS.map((f) => ({ ...f }));
  const bloodStock = INITIAL_BLOOD_STOCK.map((s) => ({ ...s }));
  const bloodRequests = INITIAL_BLOOD_REQUESTS.map((r) => ({ ...r }));

  const recalculated = recalculateHospitalQueues({
    departments,
    doctors,
    diagnostics,
    appointments,
    existingDepartmentQueues: INITIAL_QUEUES,
    nowMs,
  });

  return {
    departments,
    doctors,
    diagnostics,
    appointments: recalculated.appointments,
    doctorQueues: recalculated.doctorQueues,
    departmentQueues: recalculated.departmentQueues,
    feedbacks,
    bloodStock,
    bloodRequests,
  };
}

function serializeState(db: SmartCareDbState) {
  const recalculated = recalculateHospitalQueues({
    departments: db.departments,
    doctors: db.doctors,
    diagnostics: db.diagnostics,
    appointments: db.appointments,
    existingDepartmentQueues: db.departmentQueues,
    nowMs: Date.now(),
  });
  db.appointments = recalculated.appointments;
  db.doctorQueues = recalculated.doctorQueues;
  db.departmentQueues = recalculated.departmentQueues;

  return {
    departments: db.departments,
    doctors: db.doctors,
    diagnostics: db.diagnostics,
    appointments: db.appointments,
    doctorQueues: db.doctorQueues,
    departmentQueues: db.departmentQueues,
    feedbacks: db.feedbacks,
    bloodStock: db.bloodStock,
    serverTime: new Date().toISOString(),
  };
}

export function createSmartCareApp(options?: { dbFilePath?: string }) {
  const dbFilePath =
    options?.dbFilePath || path.resolve(process.cwd(), '.smartcare-db.json');

  let db: SmartCareDbState = loadOrInitDb(dbFilePath);

  function normalizeBloodRequestRecord(raw: any): BloodRequest {
    const legacyStatus = String(raw?.requestStatus || 'Pending');
    let requestStatus: BloodRequestStatus = 'Pending';
    if (legacyStatus === 'Approved' || legacyStatus === 'Verified') {
      requestStatus = 'Approved';
    } else if (legacyStatus === 'Completed' || legacyStatus === 'Fulfilled') {
      requestStatus = 'Completed';
    } else if (legacyStatus === 'Rejected' || legacyStatus === 'Expired') {
      requestStatus = 'Rejected';
    } else {
      requestStatus = 'Pending';
    }
    return {
      ...raw,
      patientName: String(raw?.patientName || 'Patient').trim(),
      contactNumber: String(raw?.contactNumber || '').trim(),
      unitsRequired: Math.max(1, Number(raw?.unitsRequired) || 1),
      requestStatus,
    };
  }

  function loadOrInitDb(filePath: string): SmartCareDbState {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw) as Partial<SmartCareDbState>;
        if (
          Array.isArray(parsed.departments) &&
          Array.isArray(parsed.doctors) &&
          Array.isArray(parsed.diagnostics) &&
          Array.isArray(parsed.appointments)
        ) {
          const doctors = parsed.doctors.map((d) => ({
            ...d,
            avgConsultationMinutes:
              d.avgConsultationMinutes ?? DEFAULT_AVG_CONSULTATION_MINUTES,
          }));
          const recalculated = recalculateHospitalQueues({
            departments: parsed.departments,
            doctors,
            diagnostics: parsed.diagnostics,
            appointments: parsed.appointments,
            existingDepartmentQueues: parsed.departmentQueues || INITIAL_QUEUES,
            nowMs: Date.now(),
          });
          const bloodStock =
            Array.isArray(parsed.bloodStock) && parsed.bloodStock.length === 8
              ? parsed.bloodStock.map((s) => ({
                  ...s,
                  availabilityStatus: computeBloodAvailabilityStatus(s.availableUnits),
                }))
              : INITIAL_BLOOD_STOCK.map((s) => ({ ...s }));
          const bloodRequests = Array.isArray(parsed.bloodRequests)
            ? parsed.bloodRequests.map(normalizeBloodRequestRecord)
            : INITIAL_BLOOD_REQUESTS.map((r) => ({ ...r }));

          return {
            departments: parsed.departments,
            doctors,
            diagnostics: parsed.diagnostics,
            appointments: recalculated.appointments,
            doctorQueues: recalculated.doctorQueues,
            departmentQueues: recalculated.departmentQueues,
            feedbacks: Array.isArray(parsed.feedbacks)
              ? parsed.feedbacks
              : INITIAL_FEEDBACKS,
            bloodStock,
            bloodRequests,
          };
        }
      }
    } catch (err) {
      console.warn('Could not read persisted DB file, recreating seed DB:', err);
    }
    const fresh = buildFreshSeedState(Date.now());
    persistDb(filePath, fresh);
    return fresh;
  }

  function persistDb(filePath: string, state: SmartCareDbState) {
    try {
      const tmpPath = `${filePath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf8');
      fs.renameSync(tmpPath, filePath);
    } catch (err) {
      console.error('Failed to persist SmartCare DB:', err);
    }
  }

  // Per-target async mutex to guarantee atomic sequential execution per doctor/service queue
  const targetLocks = new Map<string, Promise<void>>();
  async function withTargetLock<T>(targetId: string, task: () => Promise<T> | T): Promise<T> {
    const previous = targetLocks.get(targetId) || Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const queued = previous.then(() => current);
    targetLocks.set(targetId, queued);

    await previous;
    try {
      return await task();
    } finally {
      release();
      if (targetLocks.get(targetId) === queued) {
        targetLocks.delete(targetId);
      }
    }
  }

  // Connected SSE clients for instant cross-tab/cross-device real-time updates
  const sseClients = new Set<Response>();

  function broadcastEvent(
    type: SmartCareQueueEvent['type'],
    meta: Omit<SmartCareQueueEvent, 'type' | 'timestamp' | 'state'>
  ) {
    const payload: SmartCareQueueEvent = {
      type,
      ...meta,
      timestamp: new Date().toISOString(),
      state: serializeState(db),
    };
    const serialized = `event: queue_update\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const client of sseClients) {
      try {
        client.write(serialized);
      } catch {
        sseClients.delete(client);
      }
    }
    return payload;
  }

  function requireAdmin(req: Request, res: Response, next: NextFunction) {
    const role = req.header('x-smartcare-role');
    const token = req.header('x-smartcare-admin-token');
    if (role !== 'admin' || !verifyAdminToken(token)) {
      res.status(403).json({
        error:
          'Forbidden: Only authenticated hospital administrators may perform queue or management actions.',
      });
      return;
    }
    next();
  }

  const app = express();
  app.use(express.json());

  // Healthcheck
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'SmartCare Queue Engine' });
  });

  // Admin PIN Authentication (issues signed token)
  app.post('/api/auth/admin-login', (req, res) => {
    const pin = String(req.body?.pin || '').trim();
    if (pin !== ADMIN_DEMO_PIN) {
      res.status(401).json({ error: 'Invalid Administrator Security PIN. Access denied.' });
      return;
    }
    const authToken = signAdminToken('admin-01');
    res.json({
      session: {
        id: 'admin-01',
        name: 'Hospital Administrator',
        phone: '9999900000',
        role: 'admin',
        authToken,
      },
    });
  });

  // Read authoritative queue & appointment state (with live recalculated estimates)
  app.get('/api/queue/state', (_req, res) => {
    const state = serializeState(db);
    res.json(state);
  });

  // Real-time Server-Sent Events stream
  app.get('/api/queue/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const initialState = serializeState(db);
    res.write(`event: state\ndata: ${JSON.stringify(initialState)}\n\n`);
    sseClients.add(res);

    const heartbeat = setInterval(() => {
      try {
        res.write(': keepalive\n\n');
      } catch {
        clearInterval(heartbeat);
        sseClients.delete(res);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients.delete(res);
    });
  });

  // Create booking & generate sequential per-doctor token
  app.post('/api/tokens', async (req, res) => {
    const body = req.body || {};
    const targetId = String(body.targetId || body.doctorId || '').trim();
    const patientName = String(body.patientName || '').trim();
    const phone = String(body.phone || '').trim();
    const serviceType = body.serviceType === 'diagnostic' ? 'diagnostic' : 'doctor';

    if (!targetId || !patientName || !phone) {
      res.status(400).json({
        error: 'Patient name, mobile number, and doctor/diagnostic selection are required.',
      });
      return;
    }

    const result = await withTargetLock(targetId, () => {
      const doctor = db.doctors.find((d) => d.id === targetId);
      const diag = db.diagnostics.find((s) => s.id === targetId);
      if (serviceType === 'doctor' && !doctor) {
        return { errorStatus: 404, error: 'Selected doctor was not found.' };
      }
      if (serviceType === 'diagnostic' && !diag) {
        return { errorStatus: 404, error: 'Selected diagnostic service was not found.' };
      }

      const existingTargetTokens = db.appointments.filter(
        (a) => a.targetId === targetId || a.doctorId === targetId
      );
      const maxToken = existingTargetTokens.reduce(
        (max, t) => Math.max(max, t.tokenNumber),
        0
      );
      const nextToken = maxToken + 1;
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const uniqueId = `SC-2026-${randomSuffix}`;

      const newAppt: Appointment = {
        id: uniqueId,
        patientId: body.patientId ? String(body.patientId) : `pat-${Date.now()}`,
        patientName,
        age: Math.max(1, Math.min(120, Number(body.age) || 30)),
        gender: String(body.gender || 'Female'),
        phone,
        email: body.email ? String(body.email).trim() : undefined,
        serviceType,
        targetId,
        doctorId: serviceType === 'doctor' ? targetId : undefined,
        targetTitle:
          serviceType === 'doctor'
            ? doctor!.name
            : diag!.name,
        departmentId:
          serviceType === 'doctor'
            ? doctor!.departmentId
            : `diag-${diag!.category.toLowerCase()}`,
        departmentName:
          serviceType === 'doctor'
            ? doctor!.departmentName
            : diag!.category,
        date: String(body.date || new Date().toISOString().split('T')[0]),
        timeSlot: String(body.timeSlot || '10:00 AM - 10:30 AM'),
        reason: String(body.reason || 'OPD Consultation'),
        tokenNumber: nextToken,
        status: 'WAITING',
        createdAt: new Date().toISOString(),
      };

      db.appointments = [newAppt, ...db.appointments];
      const state = serializeState(db);
      persistDb(dbFilePath, db);
      const enriched = state.appointments.find((a) => a.id === newAppt.id) || newAppt;

      broadcastEvent('token:created', {
        targetId,
        tokenId: enriched.id,
        tokenNumber: enriched.tokenNumber,
        patientName: enriched.patientName,
        phone: enriched.phone,
        status: enriched.status,
        message: `Token #${enriched.tokenNumber} issued for ${enriched.patientName} (${enriched.targetTitle}).`,
      });

      return { appointment: enriched, state };
    });

    if ('errorStatus' in result) {
      res.status(result.errorStatus as number).json({ error: result.error });
      return;
    }
    res.status(201).json(result);
  });

  // ADMIN-ONLY: Call Next Patient for a specific doctor/target queue
  app.post('/api/queue/:targetId/call-next', requireAdmin, async (req, res) => {
    const targetId = String(req.params.targetId || '').trim();
    const result = await withTargetLock(targetId, () => {
      const doctor = db.doctors.find((d) => d.id === targetId);
      const diag = db.diagnostics.find((s) => s.id === targetId);
      const targetName = doctor?.name || diag?.name;
      const isAvailable = doctor ? doctor.isAvailableToday : diag?.isAvailableToday ?? false;

      if (!targetName) {
        return { errorStatus: 404, error: `Doctor or service queue "${targetId}" not found.` };
      }

      if (!isAvailable) {
        return {
          errorStatus: 409,
          error: `${targetName} is currently unavailable / off-duty. Mark them available before calling the next patient.`,
        };
      }

      const targetTokens = db.appointments.filter(
        (a) => a.targetId === targetId || a.doctorId === targetId
      );

      // Block multiple simultaneous active tokens (CALLED or IN CONSULTATION) for the same doctor
      const activeToken = targetTokens.find((t) => {
        const st = normalizeTokenStatus(t.status);
        return st === 'IN CONSULTATION' || st === 'CALLED';
      });
      if (activeToken) {
        return {
          errorStatus: 409,
          error: `${targetName} already has an active patient: Token #${activeToken.tokenNumber} (${activeToken.patientName} · ${activeToken.status}). Complete or skip the current patient before calling the next patient.`,
        };
      }

      const nextWaiting = targetTokens
        .filter((t) => normalizeTokenStatus(t.status) === 'WAITING')
        .sort((a, b) => a.tokenNumber - b.tokenNumber)[0];

      if (!nextWaiting) {
        return {
          errorStatus: 409,
          error: `No waiting patients remain in ${targetName}'s queue.`,
        };
      }

      const nowIso = new Date().toISOString();
      db.appointments = db.appointments.map((a) =>
        a.id === nextWaiting.id
          ? {
              ...a,
              status: 'CALLED',
              calledAt: nowIso,
            }
          : a
      );

      const state = serializeState(db);
      persistDb(dbFilePath, db);
      const updatedToken = state.appointments.find((a) => a.id === nextWaiting.id)!;
      const message = `Token #${updatedToken.tokenNumber} (${updatedToken.patientName}) called for ${targetName}.`;

      broadcastEvent('token:called', {
        targetId,
        tokenId: updatedToken.id,
        tokenNumber: updatedToken.tokenNumber,
        patientName: updatedToken.patientName,
        phone: updatedToken.phone,
        status: 'CALLED',
        message,
      });

      return { token: updatedToken, message, state };
    });

    if ('errorStatus' in result) {
      res.status(result.errorStatus as number).json({ error: result.error });
      return;
    }
    res.json(result);
  });

  // ADMIN-ONLY: Start Consultation (CALLED -> IN CONSULTATION)
  app.post('/api/tokens/:tokenId/start', requireAdmin, async (req, res) => {
    const tokenId = String(req.params.tokenId || '').trim();
    const found = db.appointments.find((a) => a.id === tokenId);
    if (!found) {
      res.status(404).json({ error: `Token "${tokenId}" not found.` });
      return;
    }

    const result = await withTargetLock(found.targetId, () => {
      const current = db.appointments.find((a) => a.id === tokenId);
      if (!current) {
        return { errorStatus: 404, error: `Token "${tokenId}" not found.` };
      }
      const status = normalizeTokenStatus(current.status);
      if (status === 'IN CONSULTATION') {
        return {
          errorStatus: 409,
          error: `Token #${current.tokenNumber} is already in consultation.`,
        };
      }
      if (status !== 'CALLED' && status !== 'WAITING') {
        return {
          errorStatus: 409,
          error: `Cannot start consultation for Token #${current.tokenNumber} because its status is ${status}.`,
        };
      }

      // Ensure no other token for this doctor is already active
      const conflictingActive = db.appointments.find((a) => {
        if (a.id === current.id) return false;
        if (a.targetId !== current.targetId && a.doctorId !== current.targetId) return false;
        const st = normalizeTokenStatus(a.status);
        return st === 'IN CONSULTATION' || st === 'CALLED';
      });
      if (conflictingActive) {
        return {
          errorStatus: 409,
          error: `Token #${conflictingActive.tokenNumber} (${conflictingActive.patientName}) is currently active for ${current.targetTitle}. Complete or skip them first.`,
        };
      }

      const nowIso = new Date().toISOString();
      db.appointments = db.appointments.map((a) =>
        a.id === current.id
          ? {
              ...a,
              status: 'IN CONSULTATION',
              calledAt: a.calledAt || nowIso,
              consultationStartAt: nowIso,
            }
          : a
      );

      const state = serializeState(db);
      persistDb(dbFilePath, db);
      const updatedToken = state.appointments.find((a) => a.id === current.id)!;
      const message = `Consultation started for Token #${updatedToken.tokenNumber} (${updatedToken.patientName}).`;

      broadcastEvent('token:started', {
        targetId: current.targetId,
        tokenId: updatedToken.id,
        tokenNumber: updatedToken.tokenNumber,
        patientName: updatedToken.patientName,
        phone: updatedToken.phone,
        status: 'IN CONSULTATION',
        message,
      });

      return { token: updatedToken, message, state };
    });

    if ('errorStatus' in result) {
      res.status(result.errorStatus as number).json({ error: result.error });
      return;
    }
    res.json(result);
  });

  // ADMIN-ONLY: Complete Consultation (IN CONSULTATION / CALLED -> COMPLETED)
  app.post('/api/tokens/:tokenId/complete', requireAdmin, async (req, res) => {
    const tokenId = String(req.params.tokenId || '').trim();
    const found = db.appointments.find((a) => a.id === tokenId);
    if (!found) {
      res.status(404).json({ error: `Token "${tokenId}" not found.` });
      return;
    }

    const result = await withTargetLock(found.targetId, () => {
      const current = db.appointments.find((a) => a.id === tokenId);
      if (!current) {
        return { errorStatus: 404, error: `Token "${tokenId}" not found.` };
      }
      const status = normalizeTokenStatus(current.status);
      if (status === 'COMPLETED') {
        return {
          errorStatus: 409,
          error: `Token #${current.tokenNumber} is already completed.`,
        };
      }
      if (status !== 'IN CONSULTATION' && status !== 'CALLED') {
        return {
          errorStatus: 409,
          error: `Only CALLED or IN CONSULTATION tokens can be marked completed (current: ${status}).`,
        };
      }

      const nowIso = new Date().toISOString();
      const startIso = current.consultationStartAt || current.calledAt || nowIso;
      const actualDurationMinutes = computeActualDurationMinutes(startIso, nowIso);

      db.appointments = db.appointments.map((a) =>
        a.id === current.id
          ? {
              ...a,
              status: 'COMPLETED',
              calledAt: a.calledAt || startIso,
              consultationStartAt: startIso,
              consultationEndAt: nowIso,
              actualDurationMinutes,
            }
          : a
      );

      const state = serializeState(db);
      persistDb(dbFilePath, db);
      const updatedToken = state.appointments.find((a) => a.id === current.id)!;
      const message = `Consultation completed for Token #${updatedToken.tokenNumber} (${updatedToken.patientName}).`;

      broadcastEvent('token:completed', {
        targetId: current.targetId,
        tokenId: updatedToken.id,
        tokenNumber: updatedToken.tokenNumber,
        patientName: updatedToken.patientName,
        phone: updatedToken.phone,
        status: 'COMPLETED',
        message,
      });

      return { token: updatedToken, message, state };
    });

    if ('errorStatus' in result) {
      res.status(result.errorStatus as number).json({ error: result.error });
      return;
    }
    res.json(result);
  });

  // ADMIN-ONLY: Skip Patient (WAITING / CALLED / IN CONSULTATION -> SKIPPED)
  app.post('/api/tokens/:tokenId/skip', requireAdmin, async (req, res) => {
    const tokenId = String(req.params.tokenId || '').trim();
    const found = db.appointments.find((a) => a.id === tokenId);
    if (!found) {
      res.status(404).json({ error: `Token "${tokenId}" not found.` });
      return;
    }

    const result = await withTargetLock(found.targetId, () => {
      const current = db.appointments.find((a) => a.id === tokenId);
      if (!current) {
        return { errorStatus: 404, error: `Token "${tokenId}" not found.` };
      }
      const status = normalizeTokenStatus(current.status);
      if (status === 'COMPLETED' || status === 'CANCELLED' || status === 'SKIPPED') {
        return {
          errorStatus: 409,
          error: `Token #${current.tokenNumber} is already ${status}.`,
        };
      }

      db.appointments = db.appointments.map((a) =>
        a.id === current.id ? { ...a, status: 'SKIPPED' } : a
      );

      const state = serializeState(db);
      persistDb(dbFilePath, db);
      const updatedToken = state.appointments.find((a) => a.id === current.id)!;
      const message = `Token #${updatedToken.tokenNumber} (${updatedToken.patientName}) marked as SKIPPED.`;

      broadcastEvent('token:skipped', {
        targetId: current.targetId,
        tokenId: updatedToken.id,
        tokenNumber: updatedToken.tokenNumber,
        patientName: updatedToken.patientName,
        phone: updatedToken.phone,
        status: 'SKIPPED',
        message,
      });

      return { token: updatedToken, message, state };
    });

    if ('errorStatus' in result) {
      res.status(result.errorStatus as number).json({ error: result.error });
      return;
    }
    res.json(result);
  });

  // Cancel Token (Admin OR owning Patient)
  app.post('/api/tokens/:tokenId/cancel', async (req, res) => {
    const tokenId = String(req.params.tokenId || '').trim();
    const found = db.appointments.find((a) => a.id === tokenId);
    if (!found) {
      res.status(404).json({ error: `Token "${tokenId}" not found.` });
      return;
    }

    const callerRole = req.header('x-smartcare-role');
    const adminToken = req.header('x-smartcare-admin-token');
    const isVerifiedAdmin = callerRole === 'admin' && verifyAdminToken(adminToken);

    const callerPhone = String(req.header('x-smartcare-phone') || req.body?.phone || '').trim();
    const callerName = String(req.header('x-smartcare-name') || req.body?.patientName || '').trim();
    const ownsToken =
      Boolean(callerPhone && found.phone === callerPhone) ||
      Boolean(callerName && found.patientName.toLowerCase() === callerName.toLowerCase());

    if (!isVerifiedAdmin && !ownsToken) {
      res.status(403).json({
        error: 'Forbidden: You may only cancel your own appointment token.',
      });
      return;
    }

    const result = await withTargetLock(found.targetId, () => {
      const current = db.appointments.find((a) => a.id === tokenId);
      if (!current) {
        return { errorStatus: 404, error: `Token "${tokenId}" not found.` };
      }

      db.appointments = db.appointments.map((a) =>
        a.id === current.id ? { ...a, status: 'CANCELLED' } : a
      );

      const state = serializeState(db);
      persistDb(dbFilePath, db);
      const updatedToken = state.appointments.find((a) => a.id === current.id)!;
      const message = `Token #${updatedToken.tokenNumber} (${updatedToken.patientName}) has been cancelled.`;

      broadcastEvent('token:cancelled', {
        targetId: current.targetId,
        tokenId: updatedToken.id,
        tokenNumber: updatedToken.tokenNumber,
        patientName: updatedToken.patientName,
        phone: updatedToken.phone,
        status: 'CANCELLED',
        message,
      });

      return { token: updatedToken, message, state };
    });

    if ('errorStatus' in result) {
      res.status(result.errorStatus as number).json({ error: result.error });
      return;
    }
    res.json(result);
  });

  // ADMIN-ONLY: Direct status update from appointments table
  app.patch('/api/tokens/:tokenId/status', requireAdmin, async (req, res) => {
    const tokenId = String(req.params.tokenId || '').trim();
    const nextStatus = normalizeTokenStatus(req.body?.status);
    const found = db.appointments.find((a) => a.id === tokenId);
    if (!found) {
      res.status(404).json({ error: `Token "${tokenId}" not found.` });
      return;
    }

    const result = await withTargetLock(found.targetId, () => {
      const current = db.appointments.find((a) => a.id === tokenId)!;
      if (nextStatus === 'CALLED' || nextStatus === 'IN CONSULTATION') {
        const activeOther = db.appointments.find((a) => {
          if (a.id === current.id) return false;
          if (a.targetId !== current.targetId && a.doctorId !== current.targetId) return false;
          const st = normalizeTokenStatus(a.status);
          return st === 'CALLED' || st === 'IN CONSULTATION';
        });
        if (activeOther) {
          return {
            errorStatus: 409,
            error: `Token #${activeOther.tokenNumber} is already ${activeOther.status} for ${current.targetTitle}. Complete or skip it first.`,
          };
        }
      }

      const nowIso = new Date().toISOString();
      db.appointments = db.appointments.map((a) => {
        if (a.id !== current.id) return a;
        const patch: Partial<Appointment> = { status: nextStatus };
        if (nextStatus === 'CALLED' && !a.calledAt) patch.calledAt = nowIso;
        if (nextStatus === 'IN CONSULTATION') {
          patch.calledAt = a.calledAt || nowIso;
          patch.consultationStartAt = a.consultationStartAt || nowIso;
        }
        if (nextStatus === 'COMPLETED') {
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

      const state = serializeState(db);
      persistDb(dbFilePath, db);
      const updatedToken = state.appointments.find((a) => a.id === current.id)!;
      const message = `Token #${updatedToken.tokenNumber} updated to ${nextStatus}.`;

      broadcastEvent(
        nextStatus === 'CALLED'
          ? 'token:called'
          : nextStatus === 'IN CONSULTATION'
          ? 'token:started'
          : nextStatus === 'COMPLETED'
          ? 'token:completed'
          : nextStatus === 'SKIPPED'
          ? 'token:skipped'
          : 'token:cancelled',
        {
          targetId: current.targetId,
          tokenId: updatedToken.id,
          tokenNumber: updatedToken.tokenNumber,
          patientName: updatedToken.patientName,
          phone: updatedToken.phone,
          status: nextStatus,
          message,
        }
      );

      return { token: updatedToken, message, state };
    });

    if ('errorStatus' in result) {
      res.status(result.errorStatus as number).json({ error: result.error });
      return;
    }
    res.json(result);
  });

  // ADMIN-ONLY: Configure Doctor Average Consultation Duration & Availability
  app.patch('/api/doctors/:doctorId/config', requireAdmin, async (req, res) => {
    const doctorId = String(req.params.doctorId || '').trim();
    const result = await withTargetLock(doctorId, () => {
      const idx = db.doctors.findIndex((d) => d.id === doctorId);
      if (idx === -1) {
        return { errorStatus: 404, error: `Doctor "${doctorId}" not found.` };
      }

      const currentDoc = db.doctors[idx];
      const nextDoc = { ...currentDoc };

      if (typeof req.body?.isAvailableToday === 'boolean') {
        nextDoc.isAvailableToday = req.body.isAvailableToday;
      }
      if (req.body?.avgConsultationMinutes !== undefined) {
        const parsed = Number(req.body.avgConsultationMinutes);
        if (!Number.isFinite(parsed) || parsed < 1 || parsed > 120) {
          return {
            errorStatus: 400,
            error: 'Average consultation duration must be between 1 and 120 minutes.',
          };
        }
        nextDoc.avgConsultationMinutes = Math.round(parsed);
        nextDoc.avgConsultationOverride =
          req.body.avgConsultationOverride !== undefined
            ? Boolean(req.body.avgConsultationOverride)
            : true;
      } else if (typeof req.body?.avgConsultationOverride === 'boolean') {
        nextDoc.avgConsultationOverride = req.body.avgConsultationOverride;
      }

      db.doctors = db.doctors.map((d, i) => (i === idx ? nextDoc : d));
      const state = serializeState(db);
      persistDb(dbFilePath, db);
      const message = `Updated queue configuration for ${nextDoc.name}.`;

      broadcastEvent('doctor:updated', {
        targetId: doctorId,
        message,
      });

      return { doctor: nextDoc, message, state };
    });

    if ('errorStatus' in result) {
      res.status(result.errorStatus as number).json({ error: result.error });
      return;
    }
    res.json(result);
  });

  // ADMIN-ONLY: Toggle doctor availability
  app.post('/api/doctors/:doctorId/toggle', requireAdmin, async (req, res) => {
    const doctorId = String(req.params.doctorId || '').trim();
    const doc = db.doctors.find((d) => d.id === doctorId);
    if (!doc) {
      res.status(404).json({ error: `Doctor "${doctorId}" not found.` });
      return;
    }

    const updated = { ...doc, isAvailableToday: !doc.isAvailableToday };
    db.doctors = db.doctors.map((d) => (d.id === doctorId ? updated : d));
    const state = serializeState(db);
    persistDb(dbFilePath, db);

    broadcastEvent('doctor:updated', {
      targetId: doctorId,
      message: `${updated.name} marked as ${updated.isAvailableToday ? 'Available' : 'Off-duty'}.`,
    });

    res.json({ doctor: updated, state });
  });

  // ADMIN-ONLY: Add new doctor
  app.post('/api/doctors', requireAdmin, (req, res) => {
    const body = req.body || {};
    if (!body.name || !body.specialization) {
      res.status(400).json({ error: 'Doctor name and specialization are required.' });
      return;
    }
    const newDoctor: Doctor = {
      id: `doc-${Date.now()}`,
      name: String(body.name).trim(),
      qualification: String(body.qualification || 'MBBS, MD').trim(),
      specialization: String(body.specialization).trim(),
      departmentId: String(body.departmentId || 'dept-genmed'),
      departmentName: String(body.departmentName || 'General Medicine'),
      experienceYears: Number(body.experienceYears) || 5,
      consultationFee: Number(body.consultationFee) || 500,
      availableDays: Array.isArray(body.availableDays)
        ? body.availableDays
        : ['Monday', 'Wednesday', 'Friday'],
      availableTime: String(body.availableTime || '09:00 AM - 01:00 PM'),
      roomNumber: String(body.roomNumber || 'OPD Room 205'),
      rating: 4.8,
      reviewCount: 0,
      bio: String(body.bio || 'Clinical specialist providing consultation at SmartCare.'),
      photoUrl: '',
      isAvailableToday: true,
      avgConsultationMinutes: Number(body.avgConsultationMinutes) || 10,
      avgConsultationOverride: false,
      reviews: [],
    };
    db.doctors = [...db.doctors, newDoctor];
    db.departments = db.departments.map((d) =>
      d.id === newDoctor.departmentId
        ? { ...d, doctorCount: d.doctorCount + 1 }
        : d
    );

    const state = serializeState(db);
    persistDb(dbFilePath, db);
    broadcastEvent('doctor:updated', {
      targetId: newDoctor.id,
      message: `Added ${newDoctor.name} to SmartCare directory.`,
    });
    res.status(201).json({ doctor: newDoctor, state });
  });

  // ADMIN-ONLY: Diagnostic fee & availability updates
  app.patch('/api/diagnostics/:diagId', requireAdmin, (req, res) => {
    const diagId = String(req.params.diagId || '').trim();
    const diag = db.diagnostics.find((d) => d.id === diagId);
    if (!diag) {
      res.status(404).json({ error: `Diagnostic "${diagId}" not found.` });
      return;
    }
    const updated = {
      ...diag,
      approxFee:
        typeof req.body?.approxFee === 'number' && req.body.approxFee > 0
          ? req.body.approxFee
          : diag.approxFee,
      isAvailableToday:
        typeof req.body?.isAvailableToday === 'boolean'
          ? req.body.isAvailableToday
          : diag.isAvailableToday,
    };
    db.diagnostics = db.diagnostics.map((d) => (d.id === diagId ? updated : d));
    const state = serializeState(db);
    persistDb(dbFilePath, db);
    broadcastEvent('diagnostic:updated', {
      targetId: diagId,
      message: `Updated diagnostic service ${updated.name}.`,
    });
    res.json({ diagnostic: updated, state });
  });

  // Feedback creation
  app.post('/api/feedback', (req, res) => {
    const body = req.body || {};
    if (!body.patientName || !body.comments) {
      res.status(400).json({ error: 'Patient name and feedback comments are required.' });
      return;
    }
    const apptMatch = db.appointments.find(
      (a) => a.id.toLowerCase() === String(body.appointmentId || '').trim().toLowerCase()
    );
    const item: FeedbackItem = {
      id: `fb-${Date.now()}`,
      patientName: String(body.patientName).trim(),
      appointmentId: String(body.appointmentId || '').trim(),
      departmentName: String(body.departmentName || 'General Medicine'),
      rating: Math.max(1, Math.min(5, Number(body.rating) || 5)),
      comments: String(body.comments).trim(),
      date: new Date().toISOString().split('T')[0],
      verified: Boolean(apptMatch),
    };
    db.feedbacks = [item, ...db.feedbacks];
    const state = serializeState(db);
    persistDb(dbFilePath, db);
    broadcastEvent('feedback:created', {
      message: 'New patient feedback recorded.',
    });
    res.status(201).json({ feedback: item, state });
  });

  // ==================== BLOOD BANK ROUTES ====================

  const VALID_BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

  // Read blood stock (public) and requests (full for authenticated admin; owned/matching for patients)
  app.get('/api/blood/state', (req, res) => {
    const role = req.header('x-smartcare-role');
    const adminToken = req.header('x-smartcare-admin-token');
    const isAdmin = role === 'admin' && verifyAdminToken(adminToken);

    if (isAdmin) {
      res.json({
        bloodStock: db.bloodStock,
        bloodRequests: db.bloodRequests,
        serverTime: new Date().toISOString(),
      });
      return;
    }

    const userId = String(req.header('x-smartcare-user-id') || '').trim();
    const refsQuery = String(req.query.refs || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const phoneQuery = String(req.query.phone || '').replace(/\D/g, '');
    const reqQuery = String(req.query.ref || '').trim().toLowerCase();

    const visibleRequests = db.bloodRequests.filter((r) => {
      if (userId && r.submittedByUserId && r.submittedByUserId === userId) return true;
      if (refsQuery.includes(r.referenceCode.toLowerCase()) || refsQuery.includes(r.id.toLowerCase())) {
        return true;
      }
      if (reqQuery && r.referenceCode.toLowerCase() === reqQuery) return true;
      if (phoneQuery.length >= 10 && r.contactNumber.replace(/\D/g, '') === phoneQuery) {
        return true;
      }
      return false;
    });

    res.json({
      bloodStock: db.bloodStock,
      bloodRequests: visibleRequests,
      serverTime: new Date().toISOString(),
    });
  });

  // Submit new Blood Request (ALWAYS starts as Pending — never auto-approved)
  app.post('/api/blood/requests', async (req, res) => {
    const result = await withTargetLock('blood-bank', () => {
      const body = req.body || {};
      const patientName = String(body.patientName || '').trim();
      const bloodGroup = String(body.bloodGroup || '').trim() as BloodGroup;
      const unitsNum = Number(body.unitsRequired);
      const hospitalName = String(body.hospitalName || '').trim();
      const contactNumber = String(body.contactNumber || '').trim();
      const requiredDate = String(body.requiredDate || '').trim();
      const additionalInfo = String(body.additionalInfo || '').trim();
      const submittedByUserId = String(body.submittedByUserId || '').trim() || undefined;

      if (patientName.length < 2) {
        return { errorStatus: 400, error: 'Patient name is required (minimum 2 characters).' };
      }
      if (!VALID_BLOOD_GROUPS.includes(bloodGroup)) {
        return { errorStatus: 400, error: 'Please select a valid blood group.' };
      }
      if (!Number.isInteger(unitsNum) || unitsNum < 1 || unitsNum > 20) {
        return { errorStatus: 400, error: 'Required units must be a whole number between 1 and 20.' };
      }
      if (hospitalName.length < 2) {
        return { errorStatus: 400, error: 'Hospital name is required.' };
      }
      if (contactNumber.replace(/\D/g, '').length < 10) {
        return { errorStatus: 400, error: 'Please provide a valid 10-digit contact number.' };
      }
      if (!requiredDate || Number.isNaN(Date.parse(requiredDate))) {
        return { errorStatus: 400, error: 'Please provide a valid required date.' };
      }

      const now = new Date().toISOString();
      const existingMax = db.bloodRequests.reduce((max, r) => {
        const m = r.referenceCode.match(/SC-BLD-(\d+)/);
        return m ? Math.max(max, Number(m[1])) : max;
      }, 1045);

      const newRequest: BloodRequest = {
        id: `bld-${Date.now()}-${Math.floor(100 + Math.random() * 899)}`,
        referenceCode: `SC-BLD-${existingMax + 1}`,
        patientName,
        bloodGroup,
        unitsRequired: unitsNum,
        hospitalName,
        contactNumber,
        requiredDate,
        additionalInfo,
        requestStatus: 'Pending',
        submittedByUserId,
        createdAt: now,
        updatedAt: now,
      };

      db.bloodRequests = [newRequest, ...db.bloodRequests];
      const state = serializeState(db);
      persistDb(dbFilePath, db);

      broadcastEvent('blood:request_created', {
        targetId: newRequest.referenceCode,
        patientName: newRequest.patientName,
        status: newRequest.requestStatus,
        message: `New blood request ${newRequest.referenceCode} submitted for ${newRequest.bloodGroup} (${newRequest.unitsRequired} units).`,
      });

      return { status: 201, payload: { request: newRequest, bloodStock: db.bloodStock, state } };
    });

    if ('error' in result) {
      res.status(result.errorStatus ?? 400).json({ error: result.error });
      return;
    }
    res.status(result.status ?? 201).json(result.payload);
  });

  // ADMIN-ONLY: Add or Update Blood Stock Inventory
  app.patch('/api/blood/stock/:bloodGroup', requireAdmin, async (req, res) => {
    const rawGroup = decodeURIComponent(String(req.params.bloodGroup || '').trim()) as BloodGroup;
    if (!VALID_BLOOD_GROUPS.includes(rawGroup)) {
      res.status(400).json({ error: `Invalid blood group "${rawGroup}".` });
      return;
    }

    const result = await withTargetLock('blood-bank', () => {
      const mode = req.body?.mode === 'add' ? 'add' : 'set';
      const units = Number(req.body?.units);

      if (!Number.isInteger(units)) {
        return { errorStatus: 400, error: 'Stock units must be a whole number.' };
      }
      if (mode === 'add' && (units < 1 || units > 500)) {
        return { errorStatus: 400, error: 'Added stock quantity must be between 1 and 500 units.' };
      }
      if (mode === 'set' && (units < 0 || units > 500)) {
        return { errorStatus: 400, error: 'Stock quantity must be between 0 and 500 units.' };
      }

      const idx = db.bloodStock.findIndex((s) => s.bloodGroup === rawGroup);
      if (idx === -1) {
        return { errorStatus: 404, error: `Blood group "${rawGroup}" record not found.` };
      }

      const current = db.bloodStock[idx];
      const nextUnits = mode === 'add' ? current.availableUnits + units : units;
      if (nextUnits > 500) {
        return { errorStatus: 400, error: 'Total blood bank stock for a group cannot exceed 500 units.' };
      }

      const updated: BloodStockItem = {
        ...current,
        availableUnits: nextUnits,
        availabilityStatus: computeBloodAvailabilityStatus(nextUnits),
        lastUpdated: new Date().toISOString(),
      };

      db.bloodStock = db.bloodStock.map((s) => (s.bloodGroup === rawGroup ? updated : s));
      const state = serializeState(db);
      persistDb(dbFilePath, db);

      broadcastEvent('blood:stock_updated', {
        targetId: rawGroup,
        status: updated.availabilityStatus,
        message: `${rawGroup} blood stock updated to ${updated.availableUnits} units (${updated.availabilityStatus}).`,
      });

      return { status: 200, payload: { stockItem: updated, bloodStock: db.bloodStock, state } };
    });

    if ('error' in result) {
      res.status(result.errorStatus ?? 400).json({ error: result.error });
      return;
    }
    res.json(result.payload);
  });

  // ADMIN-ONLY: Process Blood Request Status (Pending -> Approved/Rejected, Approved -> Completed)
  app.patch('/api/blood/requests/:requestId/status', requireAdmin, async (req, res) => {
    const requestId = String(req.params.requestId || '').trim();
    const nextStatus = String(req.body?.status || '').trim() as BloodRequestStatus;

    if (!['Approved', 'Rejected', 'Completed'].includes(nextStatus)) {
      res.status(400).json({ error: 'Invalid status. Allowed transitions: Approved, Rejected, or Completed.' });
      return;
    }

    const result = await withTargetLock('blood-bank', () => {
      const idx = db.bloodRequests.findIndex(
        (r) => r.id === requestId || r.referenceCode === requestId
      );
      if (idx === -1) {
        return { errorStatus: 404, error: `Blood request "${requestId}" not found.` };
      }

      const existing = db.bloodRequests[idx];
      const currentStatus = existing.requestStatus;

      // Strictly prevent reprocessing already approved, rejected, or completed requests accidentally
      const isValidTransition =
        (currentStatus === 'Pending' && (nextStatus === 'Approved' || nextStatus === 'Rejected')) ||
        (currentStatus === 'Approved' && nextStatus === 'Completed');

      if (!isValidTransition) {
        return {
          errorStatus: 409,
          error: `Request ${existing.referenceCode} is already ${currentStatus} and cannot be changed to ${nextStatus}.`,
        };
      }

      const updated: BloodRequest = {
        ...existing,
        requestStatus: nextStatus,
        updatedAt: new Date().toISOString(),
      };

      db.bloodRequests = db.bloodRequests.map((r, i) => (i === idx ? updated : r));
      const state = serializeState(db);
      persistDb(dbFilePath, db);

      broadcastEvent('blood:request_updated', {
        targetId: updated.referenceCode,
        status: updated.requestStatus,
        message: `Blood request ${updated.referenceCode} marked as ${updated.requestStatus}.`,
      });

      return { status: 200, payload: { request: updated, bloodRequests: db.bloodRequests, state } };
    });

    if ('error' in result) {
      res.status(result.errorStatus ?? 400).json({ error: result.error });
      return;
    }
    res.json(result.payload);
  });

  // ADMIN-ONLY: Reset demo DB
  app.post('/api/admin/reset', requireAdmin, (_req, res) => {
    db = buildFreshSeedState(Date.now());
    const state = serializeState(db);
    persistDb(dbFilePath, db);
    broadcastEvent('db:reset', {
      message: 'SmartCare demo database reset to default records.',
    });
    res.json({ state });
  });

  return {
    app,
    getState: () => serializeState(db),
  };
}

async function startServer() {
  const { app } = createSmartCareApp();
  const server = http.createServer(app);
  const PORT = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`SmartCare Hospital Server listening on http://0.0.0.0:${PORT}`);
  });
}

const isMainModule =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMainModule) {
  startServer().catch((err) => {
    console.error('Failed to start SmartCare server:', err);
    process.exit(1);
  });
}
