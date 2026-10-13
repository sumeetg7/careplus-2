import React, { useState, useEffect } from 'react';
import { Department, Doctor, DiagnosticService, Appointment } from '../types';
import { createAppointment } from '../services/storageService';
import {
  X,
  Calendar,
  Clock,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  QrCode,
  Check,
} from 'lucide-react';

interface AppointmentBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: Department[];
  doctors: Doctor[];
  diagnostics: DiagnosticService[];
  preselectedDoctor?: Doctor | null;
  preselectedDiagnostic?: DiagnosticService | null;
  preselectedDepartmentName?: string;
  onBookingSuccess: (appointment: Appointment) => void;
  onTrackQueue: (token: number) => void;
}

export const AppointmentBookingModal: React.FC<AppointmentBookingModalProps> = ({
  isOpen,
  onClose,
  departments,
  doctors,
  diagnostics,
  preselectedDoctor,
  preselectedDiagnostic,
  preselectedDepartmentName,
  onBookingSuccess,
  onTrackQueue,
}) => {
  // Step indicator: 1 = Patient Info, 2 = Slot & Details
  const [step, setStep] = useState<1 | 2>(1);

  // Service mode: 'doctor' or 'diagnostic'
  const [serviceType, setServiceType] = useState<'doctor' | 'diagnostic'>('doctor');

  // Form State
  const [patientName, setPatientName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Female');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [selectedDeptName, setSelectedDeptName] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDiagnosticId, setSelectedDiagnosticId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('2026-10-04');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [reason, setReason] = useState('');

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    if (preselectedDoctor) {
      setServiceType('doctor');
      setSelectedDoctorId(preselectedDoctor.id);
      setSelectedDeptName(preselectedDoctor.departmentName);
      setSelectedTimeSlot(preselectedDoctor.availableTime.split(' - ')[0] || '10:00 AM');
      setStep(1);
    } else if (preselectedDiagnostic) {
      setServiceType('diagnostic');
      setSelectedDiagnosticId(preselectedDiagnostic.id);
      setSelectedDeptName(preselectedDiagnostic.category);
      setSelectedTimeSlot(preselectedDiagnostic.availableSlots[0] || '10:00 AM');
      setStep(1);
    } else if (preselectedDepartmentName) {
      setServiceType('doctor');
      setSelectedDeptName(preselectedDepartmentName);
    } else if (departments.length > 0) {
      setSelectedDeptName(departments[0].name);
    }
  }, [preselectedDoctor, preselectedDiagnostic, preselectedDepartmentName, departments]);

  if (!isOpen) return null;

  const filteredDoctors = doctors.filter(
    (d) => !selectedDeptName || d.departmentName.toLowerCase() === selectedDeptName.toLowerCase()
  );

  const activeDoc = doctors.find((d) => d.id === selectedDoctorId);
  const activeDiag = diagnostics.find((d) => d.id === selectedDiagnosticId);

  const availableTimeSlots =
    serviceType === 'doctor'
      ? ['09:00 AM - 09:30 AM', '10:00 AM - 10:30 AM', '11:30 AM - 12:00 PM', '02:30 PM - 03:00 PM', '04:00 PM - 04:30 PM']
      : activeDiag?.availableSlots || ['09:00 AM', '10:30 AM', '12:00 PM', '02:30 PM', '04:00 PM'];

  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!patientName.trim()) errs.patientName = 'Patient full name is required.';
    if (!age || Number(age) <= 0 || Number(age) > 120) errs.age = 'Please enter a valid age (1-120).';
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10)
      errs.phone = 'Valid 10-digit mobile number is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs: Record<string, string> = {};
    if (serviceType === 'doctor' && !selectedDoctorId)
      errs.doctor = 'Please choose a consulting doctor.';
    if (serviceType === 'diagnostic' && !selectedDiagnosticId)
      errs.diagnostic = 'Please choose a diagnostic test.';
    if (!appointmentDate) errs.date = 'Please pick a consultation date.';
    if (!selectedTimeSlot) errs.timeSlot = 'Please select a preferred time slot.';
    if (!reason.trim()) errs.reason = 'Please state a brief non-sensitive reason.';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep2()) return;

    let targetTitle = '';
    let targetId = '';
    let deptName = selectedDeptName;

    if (serviceType === 'doctor') {
      const doc = doctors.find((d) => d.id === selectedDoctorId);
      targetTitle = doc ? doc.name : 'OPD Doctor';
      targetId = selectedDoctorId;
      deptName = doc?.departmentName || selectedDeptName;
    } else {
      const diag = diagnostics.find((d) => d.id === selectedDiagnosticId);
      targetTitle = diag ? diag.name : 'Diagnostic Test';
      targetId = selectedDiagnosticId;
      deptName = diag?.category || 'Diagnostic Wing';
    }

    const newAppt = createAppointment({
      patientName: patientName.trim(),
      age: Number(age),
      gender,
      phone: phone.trim(),
      email: email.trim() || undefined,
      serviceType,
      targetId,
      targetTitle,
      departmentName: deptName,
      date: appointmentDate,
      timeSlot: selectedTimeSlot,
      reason: reason.trim(),
    });

    setConfirmedAppointment(newAppt);
    onBookingSuccess(newAppt);
  };

  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200/80 overflow-hidden my-8 transform transition-all animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950 text-white flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider block">
              CarePlus Medical Center
            </span>
            <h2 className="text-lg font-bold">
              {confirmedAppointment ? 'Consultation Token Confirmed' : 'Book OPD & Diagnostic Service'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {confirmedAppointment ? (
          /* Polished Digital Token Pass Screen */
          <div className="p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-1.5">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm animate-bounce">
                <Check className="w-8 h-8 stroke-[2.5]" />
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Appointment Confirmed!
              </h3>
              <p className="text-xs text-slate-500">
                Your consultation token is successfully registered in the hospital database.
              </p>
            </div>

            {/* Token Pass Card Styled Like a Boarding/Medical Pass */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-white rounded-2xl p-6 shadow-xl border border-slate-700 relative overflow-hidden">
              {/* Background watermark */}
              <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
                <QrCode className="w-48 h-48 text-white" />
              </div>

              <div className="flex justify-between items-start border-b border-slate-700/80 pb-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-teal-400 block font-bold">
                    Official CarePlus OPD Pass
                  </span>
                  <div className="text-sm font-mono font-bold text-slate-200 mt-0.5">
                    {confirmedAppointment.id}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Queue Token</span>
                  <div className="text-4xl font-extrabold font-mono text-teal-300">
                    #{confirmedAppointment.tokenNumber}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 block">Patient Name</span>
                  <strong className="text-sm font-bold text-white block truncate">
                    {confirmedAppointment.patientName}
                  </strong>
                  <span className="text-[11px] text-slate-400">{confirmedAppointment.age}y · {confirmedAppointment.gender}</span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 block">Consultant / Service</span>
                  <strong className="text-sm font-bold text-teal-200 block truncate">
                    {confirmedAppointment.targetTitle}
                  </strong>
                  <span className="text-[11px] text-slate-400">{confirmedAppointment.departmentName}</span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 block">Date &amp; Time Window</span>
                  <strong className="text-sm font-bold text-white block">
                    {confirmedAppointment.date}
                  </strong>
                  <span className="text-[11px] text-teal-300">{confirmedAppointment.timeSlot}</span>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-300">
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verified Hospital Entry
                </span>
                <span className="font-mono text-slate-400">Mobile: {confirmedAppointment.phone}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={() => {
                  onClose();
                  onTrackQueue(confirmedAppointment.tokenNumber);
                }}
                className="w-full sm:flex-1 py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-teal-500/25 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Track Live Queue Position</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={handlePrintSlip}
                className="w-full sm:w-auto py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Print Pass</span>
              </button>

              <button
                onClick={onClose}
                className="w-full sm:w-auto py-3 px-4 text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Step-Based Booking Form */
          <div className="p-6 sm:p-8 space-y-6">
            {/* Step Progress Indicators */}
            <div className="flex items-center justify-center gap-4 text-xs font-bold border-b border-slate-100 pb-4">
              <div
                className={`flex items-center gap-2 ${
                  step === 1 ? 'text-teal-700' : 'text-slate-400'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    step === 1
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  1
                </span>
                <span>Patient Information</span>
              </div>

              <div className="w-12 h-0.5 bg-slate-200" />

              <div
                className={`flex items-center gap-2 ${
                  step === 2 ? 'text-teal-700' : 'text-slate-400'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    step === 2
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  2
                </span>
                <span>Doctor &amp; Slot</span>
              </div>
            </div>

            {/* STEP 1: PATIENT INFORMATION */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Patient Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Kumar"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
                    />
                    {errors.patientName && (
                      <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.patientName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Age <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 38"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
                    />
                    {errors.age && (
                      <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.age}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mobile Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="10-digit number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
                    />
                    {errors.phone && (
                      <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.phone}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="For digital slip"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                  <span className="text-[11px] text-slate-400">
                    Step 1 of 2: Basic Contact Verification
                  </span>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Proceed to Slot Selection</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: DOCTOR / DIAGNOSTIC & TIME SLOT */}
            {step === 2 && (
              <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in duration-200">
                {/* Service Toggle */}
                <div className="grid grid-cols-2 p-1.5 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setServiceType('doctor');
                      setErrors({});
                    }}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      serviceType === 'doctor'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Doctor Consultation
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setServiceType('diagnostic');
                      setErrors({});
                    }}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      serviceType === 'diagnostic'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Diagnostic / Lab Test
                  </button>
                </div>

                {serviceType === 'doctor' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Department
                      </label>
                      <select
                        value={selectedDeptName}
                        onChange={(e) => {
                          setSelectedDeptName(e.target.value);
                          setSelectedDoctorId('');
                        }}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                      >
                        {departments.map((d) => (
                          <option key={d.id} value={d.name}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Consulting Doctor <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={selectedDoctorId}
                        onChange={(e) => setSelectedDoctorId(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                      >
                        <option value="">-- Choose Doctor --</option>
                        {filteredDoctors.map((doc) => (
                          <option key={doc.id} value={doc.id}>
                            {doc.name} (Fee: ₹{doc.consultationFee})
                          </option>
                        ))}
                      </select>
                      {errors.doctor && (
                        <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.doctor}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Choose Diagnostic Test / Scan <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedDiagnosticId}
                      onChange={(e) => {
                        setSelectedDiagnosticId(e.target.value);
                        const d = diagnostics.find((item) => item.id === e.target.value);
                        if (d) setSelectedDeptName(d.category);
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    >
                      <option value="">-- Choose Diagnostic Test --</option>
                      {diagnostics.map((diag) => (
                        <option key={diag.id} value={diag.id}>
                          {diag.name} ({diag.category} · ₹{diag.approxFee})
                        </option>
                      ))}
                    </select>
                    {errors.diagnostic && (
                      <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.diagnostic}</p>
                    )}
                  </div>
                )}

                {/* Date & Time Slot */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={appointmentDate}
                      min="2026-10-04"
                      onChange={(e) => setAppointmentDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                    {errors.date && (
                      <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.date}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Time Window <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedTimeSlot}
                      onChange={(e) => setSelectedTimeSlot(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    >
                      <option value="">-- Select Time Slot --</option>
                      {availableTimeSlots.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                    {errors.timeSlot && (
                      <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.timeSlot}</p>
                    )}
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Symptoms or Consultation Purpose <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Brief description (e.g. routine BP follow-up, mild cough, knee mobility check)"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                  {errors.reason && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.reason}</p>
                  )}
                </div>

                {/* Counter Fee Banner */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-600">Standard Counter Fee:</span>
                  <strong className="text-slate-900 font-mono text-sm">
                    ₹{serviceType === 'doctor' ? activeDoc?.consultationFee || 500 : activeDiag?.approxFee || 350}
                  </strong>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    &larr; Back to Patient Details
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                  >
                    Confirm &amp; Generate Token
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
