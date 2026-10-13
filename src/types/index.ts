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

export type AppointmentStatus = 'Confirmed' | 'In Consultation' | 'Completed' | 'Cancelled';

export interface Appointment {
  id: string; // e.g. CP-2026-4821
  patientName: string;
  age: number;
  gender: string;
  phone: string;
  email?: string;
  serviceType: 'doctor' | 'diagnostic';
  targetId: string;
  targetTitle: string;
  departmentName: string;
  date: string;
  timeSlot: string;
  reason: string;
  tokenNumber: number;
  estimatedTime?: string;
  status: AppointmentStatus;
  createdAt: string;
}

export interface QueueState {
  departmentId: string;
  departmentName: string;
  currentServingToken: number;
  totalTokensToday: number;
  estimatedMinutesPerPatient: number;
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
}
