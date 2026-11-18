import type {
  BloodGroup,
  BloodRequest,
  BloodRequestStatus,
  BloodStockItem,
  UserSession,
} from '../types';
import {
  INITIAL_BLOOD_REQUESTS,
  INITIAL_BLOOD_STOCK,
  computeBloodAvailabilityStatus,
} from '../data/initialData';

export const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export const BLOOD_STATUSES: BloodRequestStatus[] = [
  'Pending',
  'Approved',
  'Rejected',
  'Completed',
];

const BLOOD_KEYS = {
  STOCK: 'smartcare_blood_stock_v2',
  REQUESTS: 'smartcare_blood_requests_v2',
  MY_REFS: 'smartcare_blood_my_refs_v2',
};

const SYNC_CHANNEL_NAME = 'smartcare_queue_sync_v1';

const SUPABASE_URL = import.meta?.env?.VITE_SUPABASE_URL?.trim() || '';
const SUPABASE_ANON_KEY = import.meta?.env?.VITE_SUPABASE_ANON_KEY?.trim() || '';

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function broadcastBloodSync(type: string) {
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const ch = new BroadcastChannel(SYNC_CHANNEL_NAME);
      ch.postMessage({ type, timestamp: new Date().toISOString() });
      ch.close();
    }
  } catch {
    // Ignore channel errors in restricted contexts
  }
}

function readBloodStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeBloodStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error writing blood storage key "${key}":`, err);
  }
}

function normalizeStatus(raw: string | undefined): BloodRequestStatus {
  if (raw === 'Approved' || raw === 'Verified') return 'Approved';
  if (raw === 'Completed' || raw === 'Fulfilled') return 'Completed';
  if (raw === 'Rejected' || raw === 'Expired') return 'Rejected';
  return 'Pending';
}

function getTrackedRefs(): string[] {
  return readBloodStorage<string[]>(BLOOD_KEYS.MY_REFS, []);
}

function addTrackedRef(referenceCode: string) {
  const existing = getTrackedRefs();
  if (!existing.includes(referenceCode)) {
    writeBloodStorage(BLOOD_KEYS.MY_REFS, [referenceCode, ...existing].slice(0, 50));
  }
}

function buildAuthHeaders(session: UserSession | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (session) {
    headers['x-smartcare-role'] = session.role;
    headers['x-smartcare-user-id'] = session.id;
    if (session.authToken) {
      headers['x-smartcare-admin-token'] = session.authToken;
    }
  }
  return headers;
}

export function initBloodStorage(): void {
  readBloodStorage(BLOOD_KEYS.STOCK, INITIAL_BLOOD_STOCK);
  readBloodStorage(BLOOD_KEYS.REQUESTS, INITIAL_BLOOD_REQUESTS);
}

export function resetBloodDemoDatabase(): void {
  writeBloodStorage(BLOOD_KEYS.STOCK, INITIAL_BLOOD_STOCK);
  writeBloodStorage(BLOOD_KEYS.REQUESTS, INITIAL_BLOOD_REQUESTS);
  writeBloodStorage(BLOOD_KEYS.MY_REFS, []);
}

export function getBloodStock(): BloodStockItem[] {
  const list = readBloodStorage<BloodStockItem[]>(BLOOD_KEYS.STOCK, INITIAL_BLOOD_STOCK);
  return BLOOD_GROUPS.map((grp) => {
    const found = list.find((s) => s.bloodGroup === grp);
    if (found) {
      return {
        ...found,
        availabilityStatus: computeBloodAvailabilityStatus(found.availableUnits),
      };
    }
    return INITIAL_BLOOD_STOCK.find((s) => s.bloodGroup === grp)!;
  });
}

export function getMyBloodRequests(
  session: UserSession | null,
  lookupQuery?: string
): BloodRequest[] {
  const all = readBloodStorage<BloodRequest[]>(BLOOD_KEYS.REQUESTS, INITIAL_BLOOD_REQUESTS).map(
    (r) => ({ ...r, requestStatus: normalizeStatus(r.requestStatus) })
  );
  const trackedRefs = new Set(getTrackedRefs().map((r) => r.toLowerCase()));
  const trimmedLookup = (lookupQuery || '').trim().toLowerCase();
  const digitsLookup = (lookupQuery || '').replace(/\D/g, '');
  const sessionDigits = (session?.phone || '').replace(/\D/g, '');

  const mine = all.filter((req) => {
    if (trimmedLookup) {
      const refMatch = req.referenceCode.toLowerCase().includes(trimmedLookup);
      const phoneMatch =
        digitsLookup.length >= 4 &&
        req.contactNumber.replace(/\D/g, '').includes(digitsLookup);
      const nameMatch = req.patientName.toLowerCase().includes(trimmedLookup);
      return refMatch || phoneMatch || nameMatch;
    }
    if (trackedRefs.has(req.referenceCode.toLowerCase())) return true;
    if (session?.id && req.submittedByUserId === session.id) return true;
    if (sessionDigits.length >= 10 && req.contactNumber.replace(/\D/g, '') === sessionDigits) {
      return true;
    }
    return false;
  });

  return mine.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function getAllBloodRequestsForAdmin(session: UserSession | null): BloodRequest[] {
  if (!session || session.role !== 'admin') return [];
  return readBloodStorage<BloodRequest[]>(BLOOD_KEYS.REQUESTS, INITIAL_BLOOD_REQUESTS)
    .map((r) => ({ ...r, requestStatus: normalizeStatus(r.requestStatus) }))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export async function syncBloodBankFromServer(
  session: UserSession | null,
  lookupParams?: { ref?: string; phone?: string }
): Promise<{ bloodStock: BloodStockItem[]; bloodRequests: BloodRequest[] } | null> {
  try {
    const params = new URLSearchParams();
    const refs = getTrackedRefs();
    if (refs.length > 0) params.set('refs', refs.join(','));
    if (lookupParams?.ref) params.set('ref', lookupParams.ref.trim());
    if (lookupParams?.phone) params.set('phone', lookupParams.phone.trim());
    else if (session?.phone) params.set('phone', session.phone);

    const qs = params.toString();
    const res = await fetch(`/api/blood/state${qs ? `?${qs}` : ''}`, {
      headers: buildAuthHeaders(session),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      bloodStock?: BloodStockItem[];
      bloodRequests?: BloodRequest[];
    };

    if (Array.isArray(data.bloodStock) && data.bloodStock.length > 0) {
      writeBloodStorage(BLOOD_KEYS.STOCK, data.bloodStock);
    }

    if (Array.isArray(data.bloodRequests)) {
      if (session?.role === 'admin') {
        writeBloodStorage(BLOOD_KEYS.REQUESTS, data.bloodRequests);
      } else {
        // Merge owned/matched requests into local mirror cleanly
        const local = readBloodStorage<BloodRequest[]>(
          BLOOD_KEYS.REQUESTS,
          INITIAL_BLOOD_REQUESTS
        );
        const byId = new Map<string, BloodRequest>();
        for (const item of local) byId.set(item.id, item);
        for (const item of data.bloodRequests) byId.set(item.id, item);
        writeBloodStorage(BLOOD_KEYS.REQUESTS, Array.from(byId.values()));
      }
    }

    return {
      bloodStock: getBloodStock(),
      bloodRequests:
        session?.role === 'admin'
          ? getAllBloodRequestsForAdmin(session)
          : getMyBloodRequests(session),
    };
  } catch {
    return null;
  }
}

export interface SubmitSimpleBloodRequestInput {
  patientName: string;
  bloodGroup: BloodGroup;
  unitsRequired: number;
  hospitalName: string;
  contactNumber: string;
  requiredDate: string;
  additionalInfo?: string;
}

export async function submitSimpleBloodRequest(
  input: SubmitSimpleBloodRequestInput,
  session: UserSession | null
): Promise<BloodRequest> {
  const patientName = input.patientName.trim();
  const units = Number(input.unitsRequired);
  const hospitalName = input.hospitalName.trim();
  const contactNumber = input.contactNumber.trim();
  const requiredDate = input.requiredDate.trim();
  const additionalInfo = (input.additionalInfo || '').trim();

  if (patientName.length < 2) {
    throw new Error('Please enter the patient name (minimum 2 characters).');
  }
  if (!BLOOD_GROUPS.includes(input.bloodGroup)) {
    throw new Error('Please select a valid blood group.');
  }
  if (!Number.isInteger(units) || units < 1 || units > 20) {
    throw new Error('Required units must be a whole number between 1 and 20.');
  }
  if (hospitalName.length < 2) {
    throw new Error('Please enter the hospital name.');
  }
  if (contactNumber.replace(/\D/g, '').length < 10) {
    throw new Error('Please enter a valid 10-digit contact number.');
  }
  if (!requiredDate || Number.isNaN(Date.parse(requiredDate))) {
    throw new Error('Please select a valid required date.');
  }

  try {
    const res = await fetch('/api/blood/requests', {
      method: 'POST',
      headers: buildAuthHeaders(session),
      body: JSON.stringify({
        patientName,
        bloodGroup: input.bloodGroup,
        unitsRequired: units,
        hospitalName,
        contactNumber,
        requiredDate,
        additionalInfo,
        submittedByUserId: session?.id,
      }),
    });

    const payload = await res.json().catch(() => ({}));
    if (res.status >= 400 && res.status < 500) {
      throw new Error(payload.error || 'Could not submit blood request.');
    }
    if (res.ok && payload.request) {
      const created = payload.request as BloodRequest;
      addTrackedRef(created.referenceCode);
      const local = readBloodStorage<BloodRequest[]>(
        BLOOD_KEYS.REQUESTS,
        INITIAL_BLOOD_REQUESTS
      );
      writeBloodStorage(BLOOD_KEYS.REQUESTS, [
        created,
        ...local.filter((r) => r.id !== created.id),
      ]);
      if (isSupabaseConfigured()) {
        void syncNewBloodRequestToSupabase(created);
      }
      broadcastBloodSync('blood:request_created');
      return created;
    }
  } catch (err) {
    if (err instanceof Error && !err.message.toLowerCase().includes('fetch')) {
      throw err;
    }
  }

  // Fallback local persistence when server is unreachable
  const now = new Date().toISOString();
  const refNum = Math.floor(1050 + Math.random() * 8900);
  const fallbackRequest: BloodRequest = {
    id: `bld-${Date.now()}`,
    referenceCode: `SC-BLD-${refNum}`,
    patientName,
    bloodGroup: input.bloodGroup,
    unitsRequired: units,
    hospitalName,
    contactNumber,
    requiredDate,
    additionalInfo,
    requestStatus: 'Pending',
    submittedByUserId: session?.id,
    createdAt: now,
    updatedAt: now,
  };

  addTrackedRef(fallbackRequest.referenceCode);
  const existing = readBloodStorage<BloodRequest[]>(
    BLOOD_KEYS.REQUESTS,
    INITIAL_BLOOD_REQUESTS
  );
  writeBloodStorage(BLOOD_KEYS.REQUESTS, [fallbackRequest, ...existing]);

  if (isSupabaseConfigured()) {
    void syncNewBloodRequestToSupabase(fallbackRequest);
  }
  broadcastBloodSync('blood:request_created');
  return fallbackRequest;
}

export async function adminUpdateBloodStock(
  bloodGroup: BloodGroup,
  mode: 'add' | 'set',
  units: number,
  session: UserSession | null
): Promise<BloodStockItem> {
  if (!session || session.role !== 'admin') {
    throw new Error('Forbidden: Only authorized administrators can manage blood stock.');
  }
  if (!BLOOD_GROUPS.includes(bloodGroup)) {
    throw new Error('Invalid blood group.');
  }
  if (!Number.isInteger(units)) {
    throw new Error('Stock quantity must be a whole number.');
  }
  if (mode === 'add' && (units < 1 || units > 500)) {
    throw new Error('Added stock quantity must be between 1 and 500 units.');
  }
  if (mode === 'set' && (units < 0 || units > 500)) {
    throw new Error('Stock units must be between 0 and 500.');
  }

  try {
    const res = await fetch(`/api/blood/stock/${encodeURIComponent(bloodGroup)}`, {
      method: 'PATCH',
      headers: buildAuthHeaders(session),
      body: JSON.stringify({ mode, units }),
    });
    const payload = await res.json().catch(() => ({}));
    if (res.status >= 400 && res.status < 500) {
      throw new Error(payload.error || 'Failed to update blood stock.');
    }
    if (res.ok && payload.stockItem) {
      if (Array.isArray(payload.bloodStock)) {
        writeBloodStorage(BLOOD_KEYS.STOCK, payload.bloodStock);
      }
      broadcastBloodSync('blood:stock_updated');
      return payload.stockItem as BloodStockItem;
    }
  } catch (err) {
    if (err instanceof Error && !err.message.toLowerCase().includes('fetch')) {
      throw err;
    }
  }

  // Fallback local persistence
  const stockList = getBloodStock();
  const current = stockList.find((s) => s.bloodGroup === bloodGroup);
  if (!current) {
    throw new Error(`Blood group ${bloodGroup} not found.`);
  }
  const nextUnits = mode === 'add' ? current.availableUnits + units : units;
  if (nextUnits > 500) {
    throw new Error('Total blood bank stock for a group cannot exceed 500 units.');
  }
  const updated: BloodStockItem = {
    ...current,
    availableUnits: nextUnits,
    availabilityStatus: computeBloodAvailabilityStatus(nextUnits),
    lastUpdated: new Date().toISOString(),
  };
  writeBloodStorage(
    BLOOD_KEYS.STOCK,
    stockList.map((s) => (s.bloodGroup === bloodGroup ? updated : s))
  );
  broadcastBloodSync('blood:stock_updated');
  return updated;
}

export async function adminTransitionBloodRequest(
  requestId: string,
  nextStatus: 'Approved' | 'Rejected' | 'Completed',
  session: UserSession | null
): Promise<BloodRequest> {
  if (!session || session.role !== 'admin') {
    throw new Error('Forbidden: Only authorized administrators can process blood requests.');
  }

  try {
    const res = await fetch(
      `/api/blood/requests/${encodeURIComponent(requestId)}/status`,
      {
        method: 'PATCH',
        headers: buildAuthHeaders(session),
        body: JSON.stringify({ status: nextStatus }),
      }
    );
    const payload = await res.json().catch(() => ({}));
    if (res.status >= 400 && res.status < 500) {
      throw new Error(payload.error || 'Cannot update blood request status.');
    }
    if (res.ok && payload.request) {
      if (Array.isArray(payload.bloodRequests)) {
        writeBloodStorage(BLOOD_KEYS.REQUESTS, payload.bloodRequests);
      }
      broadcastBloodSync('blood:request_updated');
      return payload.request as BloodRequest;
    }
  } catch (err) {
    if (err instanceof Error && !err.message.toLowerCase().includes('fetch')) {
      throw err;
    }
  }

  // Fallback local persistence with strict transition guard
  const list = readBloodStorage<BloodRequest[]>(BLOOD_KEYS.REQUESTS, INITIAL_BLOOD_REQUESTS);
  const existing = list.find((r) => r.id === requestId || r.referenceCode === requestId);
  if (!existing) {
    throw new Error('Blood request not found.');
  }

  const currentStatus = normalizeStatus(existing.requestStatus);
  const valid =
    (currentStatus === 'Pending' && (nextStatus === 'Approved' || nextStatus === 'Rejected')) ||
    (currentStatus === 'Approved' && nextStatus === 'Completed');

  if (!valid) {
    throw new Error(
      `Request ${existing.referenceCode} is already ${currentStatus} and cannot be changed to ${nextStatus}.`
    );
  }

  const updated: BloodRequest = {
    ...existing,
    requestStatus: nextStatus,
    updatedAt: new Date().toISOString(),
  };

  writeBloodStorage(
    BLOOD_KEYS.REQUESTS,
    list.map((r) => (r.id === existing.id ? updated : r))
  );
  broadcastBloodSync('blood:request_updated');
  return updated;
}

async function syncNewBloodRequestToSupabase(req: BloodRequest): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/blood_requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        reference_code: req.referenceCode,
        patient_name: req.patientName,
        blood_group: req.bloodGroup,
        units_required: req.unitsRequired,
        hospital_name: req.hospitalName,
        contact_number: req.contactNumber,
        required_date: req.requiredDate,
        additional_info: req.additionalInfo,
        request_status: 'Pending',
      }),
    });
  } catch (err) {
    console.warn('Supabase sync skipped; backend & LocalStorage remain active.', err);
  }
}
