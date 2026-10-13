/**
 * Hospital Management System - LocalStorage Service Layer
 * 
 * College Project Note:
 * This module acts as the Data Access Object (DAO) for the prototype.
 * All records are serialized to JSON and persisted in the browser's localStorage.
 * 
 * Migration Guide for Future Database:
 * To swap this with Supabase or Firebase:
 * 1. Replace `localStorage.getItem/setItem` calls with async `supabase.from('table').select/insert`.
 * 2. Keep the same interface signatures (`getDoctors()`, `createAppointment()`, etc.).
 */

import {
  Department,
  Doctor,
  DiagnosticService,
  Appointment,
  QueueState,
  FeedbackItem,
  UserSession,
} from '../types';

import {
  INITIAL_DEPARTMENTS,
  INITIAL_DOCTORS,
  INITIAL_DIAGNOSTICS,
  INITIAL_APPOINTMENTS,
  INITIAL_QUEUES,
  INITIAL_FEEDBACKS,
} from '../data/initialData';

const KEYS = {
  DEPARTMENTS: 'careplus_departments_v1',
  DOCTORS: 'careplus_doctors_v1',
  DIAGNOSTICS: 'careplus_diagnostics_v1',
  APPOINTMENTS: 'careplus_appointments_v1',
  QUEUES: 'careplus_queues_v1',
  FEEDBACKS: 'careplus_feedbacks_v1',
  SESSION: 'careplus_user_session_v1',
};

// Safe helper to read from LocalStorage
function readStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`Error reading localStorage key "${key}", using default.`, err);
    return defaultValue;
  }
}

// Safe helper to write to LocalStorage
function writeStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Error saving to localStorage key "${key}".`, err);
  }
}

// Initialize all storage on app startup
export function initLocalStorage(): void {
  readStorage(KEYS.DEPARTMENTS, INITIAL_DEPARTMENTS);
  readStorage(KEYS.DOCTORS, INITIAL_DOCTORS);
  readStorage(KEYS.DIAGNOSTICS, INITIAL_DIAGNOSTICS);
  readStorage(KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);
  readStorage(KEYS.QUEUES, INITIAL_QUEUES);
  readStorage(KEYS.FEEDBACKS, INITIAL_FEEDBACKS);
}

// Reset data to initial demo state (useful for demonstrations and vivas)
export function resetDemoDatabase(): void {
  localStorage.setItem(KEYS.DEPARTMENTS, JSON.stringify(INITIAL_DEPARTMENTS));
  localStorage.setItem(KEYS.DOCTORS, JSON.stringify(INITIAL_DOCTORS));
  localStorage.setItem(KEYS.DIAGNOSTICS, JSON.stringify(INITIAL_DIAGNOSTICS));
  localStorage.setItem(KEYS.APPOINTMENTS, JSON.stringify(INITIAL_APPOINTMENTS));
  localStorage.setItem(KEYS.QUEUES, JSON.stringify(INITIAL_QUEUES));
  localStorage.setItem(KEYS.FEEDBACKS, JSON.stringify(INITIAL_FEEDBACKS));
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
  return readStorage<Doctor[]>(KEYS.DOCTORS, INITIAL_DOCTORS);
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

export function addDoctor(doctor: Omit<Doctor, 'id' | 'rating' | 'reviewCount' | 'reviews'>): Doctor {
  const doctors = getDoctors();
  const newDoctor: Doctor = {
    ...doctor,
    id: `doc-${Date.now()}`,
    rating: 4.8,
    reviewCount: 0,
    reviews: [],
  };
  doctors.push(newDoctor);
  saveDoctors(doctors);

  // Update department doctor count
  const depts = getDepartments();
  const dept = depts.find((d) => d.id === doctor.departmentId);
  if (dept) {
    dept.doctorCount += 1;
    writeStorage(KEYS.DEPARTMENTS, depts);
  }

  return newDoctor;
}

export function updateDoctor(updated: Doctor): void {
  const doctors = getDoctors().map((d) => (d.id === updated.id ? updated : d));
  saveDoctors(doctors);
}

export function toggleDoctorAvailability(id: string): boolean {
  const doctors = getDoctors();
  const target = doctors.find((d) => d.id === id);
  if (target) {
    target.isAvailableToday = !target.isAvailableToday;
    saveDoctors(doctors);
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

export function updateDiagnosticFee(id: string, newFee: number): void {
  const list = getDiagnostics().map((s) => (s.id === id ? { ...s, approxFee: newFee } : s));
  saveDiagnostics(list);
}

export function toggleDiagnosticAvailability(id: string): void {
  const list = getDiagnostics().map((s) => (s.id === id ? { ...s, isAvailableToday: !s.isAvailableToday } : s));
  saveDiagnostics(list);
}

/* ==================== APPOINTMENTS & TOKENS ==================== */
export function getAppointments(): Appointment[] {
  return readStorage<Appointment[]>(KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);
}

export function getAppointmentById(id: string): Appointment | undefined {
  return getAppointments().find((a) => a.id.toLowerCase() === id.trim().toLowerCase());
}

export function getAppointmentsByPhone(phone: string): Appointment[] {
  const clean = phone.trim();
  return getAppointments().filter((a) => a.phone.includes(clean));
}

export function createAppointment(
  data: Omit<Appointment, 'id' | 'tokenNumber' | 'status' | 'createdAt'>
): Appointment {
  const appointments = getAppointments();
  const queues = getQueues();

  // Find department to increment token
  let deptKey = 'dept-genmed';
  const depts = getDepartments();
  const matchedDept = depts.find((d) => d.name.toLowerCase() === data.departmentName.toLowerCase());
  if (matchedDept) {
    deptKey = matchedDept.id;
  }

  const queue = queues[deptKey] || {
    departmentId: deptKey,
    departmentName: data.departmentName,
    currentServingToken: 1,
    totalTokensToday: 0,
    estimatedMinutesPerPatient: 8,
    lastUpdated: 'Just now',
  };

  // Generate next token
  const nextToken = queue.totalTokensToday + 1;
  queue.totalTokensToday = nextToken;
  queues[deptKey] = queue;
  writeStorage(KEYS.QUEUES, queues);

  // Generate readable Appointment ID: CP-YEAR-XXXX
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const newAppointment: Appointment = {
    ...data,
    id: `CP-2026-${randomSuffix}`,
    tokenNumber: nextToken,
    status: 'Confirmed',
    createdAt: new Date().toISOString(),
  };

  appointments.unshift(newAppointment);
  writeStorage(KEYS.APPOINTMENTS, appointments);

  return newAppointment;
}

export function updateAppointmentStatus(id: string, status: Appointment['status']): void {
  const appointments = getAppointments().map((a) => (a.id === id ? { ...a, status } : a));
  writeStorage(KEYS.APPOINTMENTS, appointments);
}

/* ==================== QUEUE MANAGEMENT ==================== */
export function getQueues(): Record<string, QueueState> {
  return readStorage<Record<string, QueueState>>(KEYS.QUEUES, INITIAL_QUEUES);
}

export function getQueueByDepartment(deptId: string): QueueState {
  const queues = getQueues();
  return (
    queues[deptId] || {
      departmentId: deptId,
      departmentName: 'OPD Queue',
      currentServingToken: 1,
      totalTokensToday: 10,
      estimatedMinutesPerPatient: 8,
      lastUpdated: 'Just now',
    }
  );
}

export function advanceQueue(deptId: string): QueueState {
  const queues = getQueues();
  const q = queues[deptId];
  if (q) {
    if (q.currentServingToken < q.totalTokensToday) {
      q.currentServingToken += 1;
    }
    q.lastUpdated = 'Just now';
    queues[deptId] = q;
    writeStorage(KEYS.QUEUES, queues);
    return q;
  }
  return getQueueByDepartment(deptId);
}

export function setServingToken(deptId: string, token: number): QueueState {
  const queues = getQueues();
  const q = queues[deptId];
  if (q) {
    q.currentServingToken = Math.max(1, token);
    q.lastUpdated = 'Just now';
    queues[deptId] = q;
    writeStorage(KEYS.QUEUES, queues);
    return q;
  }
  return getQueueByDepartment(deptId);
}

/* ==================== FEEDBACK ==================== */
export function getFeedbacks(): FeedbackItem[] {
  return readStorage<FeedbackItem[]>(KEYS.FEEDBACKS, INITIAL_FEEDBACKS);
}

export function addFeedback(data: Omit<FeedbackItem, 'id' | 'date' | 'verified'>): FeedbackItem {
  const list = getFeedbacks();
  const appointments = getAppointments();
  const match = appointments.find((a) => a.id.toLowerCase() === data.appointmentId.trim().toLowerCase());

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
  } else {
    localStorage.setItem(KEYS.SESSION, JSON.stringify(session));
  }
}
