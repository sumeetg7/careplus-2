export interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  headDoctor: string;
  roomNumber: string;
  doctorCount: number;
  icon: string;
}

export interface DoctorReview {
  id: string;
  patientName: string;
  rating: number;
  date: string;
  comment: string;
}

export interface Doctor {
  id: string;
  name: string;
  qualification: string;
  specialization: string;
  departmentId: string;
  departmentName: string;
  experienceYears: number;
  consultationFee: number;
  availableDays: string[];
  availableTime: string;
  roomNumber: string;
  rating: number;
  reviewCount: number;
  bio: string;
  photoUrl: string;
  isAvailableToday: boolean;
  avgConsultationMinutes?: number; // Configurable per doctor, defaults to 10 mins
  avgConsultationOverride?: boolean; // True when admin manually sets a fixed average duration
  reviews: DoctorReview[];
}

export interface DiagnosticService {
  id: string;
  name: string;
  category: 'Radiology' | 'Pathology' | 'Cardiology' | 'General';
  description: string;
  approxFee: number;
  duration: string;
  reportDeliveryTime: string;
  preparationInstructions: string;
  availableSlots: string[];
  isAvailableToday: boolean;
  roomNumber: string;
}

export type TokenStatus =
  | 'WAITING'
  | 'CALLED'
  | 'IN CONSULTATION'
  | 'COMPLETED'
  | 'SKIPPED'
  | 'CANCELLED';

export type AppointmentStatus = TokenStatus;

export interface Appointment {
  id: string; // e.g. SC-2026-4821 (Token / Appointment ID)
  patientId?: string;
  patientName: string;
  age: number;
  gender: string;
  phone: string;
  email?: string;
  serviceType: 'doctor' | 'diagnostic';
  targetId: string; // doctorId or diagnosticId
  doctorId?: string; // explicit doctor reference for doctor appointments
  targetTitle: string; // doctorName or diagnostic service name
  departmentId?: string;
  departmentName: string;
  date: string;
  timeSlot: string;
  reason: string;
  tokenNumber: number;
  estimatedWaitMinutes?: number;
  estimatedTime?: string;
  patientsAhead?: number;
  status: TokenStatus;
  createdAt: string;
  calledAt?: string;
  consultationStartAt?: string;
  consultationEndAt?: string;
  actualDurationMinutes?: number;
}

export interface QueueState {
  departmentId: string;
  departmentName: string;
  currentServingToken: number;
  totalTokensToday: number;
  estimatedMinutesPerPatient: number;
  lastUpdated: string;
}

export interface DoctorQueueState {
  targetId: string; // doctorId or diagnosticId
  targetName: string;
  departmentId: string;
  departmentName: string;
  serviceType: 'doctor' | 'diagnostic';
  currentServingToken: number;
  activeTokenId: string | null;
  activePatientName: string | null;
  activeStatus: 'CALLED' | 'IN CONSULTATION' | null;
  activeCalledAt: string | null;
  activeConsultationStartAt: string | null;
  totalTokensToday: number;
  avgConsultationMinutes: number;
  rollingAvgMinutes: number | null;
  completedCount: number;
  waitingCount: number;
  remainingCurrentMinutes: number;
  isAvailable: boolean;
  lastUpdated: string;
}

export interface FeedbackItem {
  id: string;
  patientName: string;
  appointmentId: string;
  departmentName: string;
  rating: number;
  comments: string;
  date: string;
  verified: boolean;
}

export interface UserSession {
  id: string;
  name: string;
  phone: string;
  role: 'patient' | 'admin';
  authToken?: string;
}

/* ==================== BLOOD BANK TYPES ==================== */

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-';

export type BloodComponent = 'Whole Blood' | 'PRBC' | 'Platelets' | 'Plasma';

export type BloodAvailabilityStatus = 'Available' | 'Low Stock' | 'Out of Stock';

export type BloodVerificationStatus = 'Pending Verification' | 'Verified' | 'Rejected';

export type BloodRequestStatus =
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'Completed';

export interface BloodStockItem {
  bloodGroup: BloodGroup;
  availableUnits: number;
  availabilityStatus: BloodAvailabilityStatus;
  hospitalName: string;
  contactNumber: string;
  location: string;
  lastUpdated: string;
}

export interface HospitalDeskContact {
  deskName: string;
  coordinatorTitle: string;
  phone: string;
  extension: string;
  hours: string;
  deskLocation: string;
}

export interface BloodRequest {
  id: string;
  referenceCode: string; // Request ID e.g. SC-BLD-1041
  patientName: string;
  bloodGroup: BloodGroup;
  bloodComponent?: BloodComponent;
  unitsRequired: number;
  hospitalName: string;
  contactNumber: string;
  cityOrArea?: string;
  requiredDate: string;
  additionalInfo: string;
  requestStatus: BloodRequestStatus;
  verificationStatus?: BloodVerificationStatus;
  hospitalDeskContact?: HospitalDeskContact;
  isDemoRecord?: boolean;
  submittedByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BloodRequestPrivateContact {
  requestId: string;
  requesterName: string;
  requesterPhone: string;
  requesterEmail?: string;
  internalDepartmentNote?: string;
  createdAt: string;
}

export interface DonorPledge {
  id: string;
  requestId: string;
  referenceCode: string;
  donorName: string;
  donorBloodGroup: BloodGroup | 'Unsure';
  contactPreference: string;
  preferredTimeWindow: string;
  note?: string;
  createdAt: string;
}

