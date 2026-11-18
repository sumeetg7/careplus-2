import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { Department, Doctor, DiagnosticService, Appointment } from '../types';
import { createAppointmentAsync } from '../services/storageService';
import {
  translateDepartmentName,
  translateDiagnosticCategory,
  translateGender,
  translateTokenStatus,
} from '../i18n';
import { APPLE_EASE, SPRING_GENTLE } from './MotionPrimitives';
import {
  X,
  ArrowRight,
  Printer,
  CheckCircle2,
  QrCode,
  Check,
  Loader2,
  AlertCircle,
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
  onTrackQueue: (token: number, targetId?: string) => void;
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
  const { t } = useTranslation();
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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSubmitError(null);
      setErrors({});
    }
  }, [isOpen]);

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
    if (!patientName.trim()) errs.patientName = t('booking.errName');
    if (!age || Number(age) <= 0 || Number(age) > 120) errs.age = t('booking.errAge');
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10)
      errs.phone = t('booking.errPhone');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs: Record<string, string> = {};
    if (serviceType === 'doctor' && !selectedDoctorId)
      errs.doctor = t('booking.errDoctor');
    if (serviceType === 'diagnostic' && !selectedDiagnosticId)
      errs.diagnostic = t('booking.errDiagnostic');
    if (!appointmentDate) errs.date = t('booking.errDate');
    if (!selectedTimeSlot) errs.timeSlot = t('booking.errTimeSlot');
    if (!reason.trim()) errs.reason = t('booking.errReason');

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleClose = () => {
    if (confirmedAppointment) {
      setConfirmedAppointment(null);
      setStep(1);
    }
    setSubmitError(null);
    setErrors({});
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validateStep2() || isSubmitting) return;

    setIsSubmitting(true);
    try {
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

      const newAppt = await createAppointmentAsync({
        patientName: patientName.trim(),
        age: Number(age),
        gender,
        phone: phone.trim(),
        email: email.trim() || undefined,
        serviceType,
        targetId,
        doctorId: serviceType === 'doctor' ? targetId : undefined,
        targetTitle,
        departmentName: deptName,
        date: appointmentDate,
        timeSlot: selectedTimeSlot,
        reason: reason.trim(),
      });

      setConfirmedAppointment(newAppt);
      onBookingSuccess(newAppt);
    } catch (err: any) {
      setSubmitError(err?.message || t('booking.errSubmit'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="booking-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4"
        >
          <motion.div
            key="booking-modal-card"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.28, ease: APPLE_EASE }}
            className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200/80 overflow-hidden my-8"
          >
            {/* Header */}
            <div className="px-6 py-4.5 bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950 text-white flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider block">
                  {t('common.hospitalFullName')}
                </span>
                <h2 className="text-lg font-bold">
                  {confirmedAppointment ? t('booking.modalConfirmedTitle') : t('booking.modalBookTitle')}
                </h2>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label={t('common.close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {confirmedAppointment ? (
                /* Polished Digital Token Pass Screen */
                <motion.div
                  key="booking-confirmed"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: APPLE_EASE }}
                  className="p-6 sm:p-8 space-y-6"
                >
                  <div className="text-center space-y-1.5">
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={SPRING_GENTLE}
                      className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm"
                    >
                      <Check className="w-8 h-8 stroke-[2.5]" />
                    </motion.div>
                    <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                      {t('booking.confirmedHeading')}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {t('booking.confirmedSubheading')}
                    </p>
                  </div>

                  {/* Token Pass Card Styled Like a Boarding/Medical Pass */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.97, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.08, ease: APPLE_EASE }}
                    className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-white rounded-2xl p-6 shadow-xl border border-slate-700 relative overflow-hidden"
                  >
                    {/* Background watermark */}
                    <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
                      <QrCode className="w-48 h-48 text-white" />
                    </div>

                    <div className="flex justify-between items-start border-b border-slate-700/80 pb-4">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-teal-400 block font-bold">
                          {t('booking.officialPass')}
                        </span>
                        <div className="text-sm font-mono font-bold text-slate-200 mt-0.5">
                          {confirmedAppointment.id}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">{t('booking.queueToken')}</span>
                        <div className="text-4xl font-extrabold font-mono tabular-nums text-teal-300">
                          #{confirmedAppointment.tokenNumber}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 text-xs">
                      <div>
                        <span className="text-[11px] text-slate-400 block">{t('booking.patientName')}</span>
                        <strong className="text-sm font-bold text-white block truncate">
                          {confirmedAppointment.patientName}
                        </strong>
                        <span className="text-[11px] text-slate-400">
                          {confirmedAppointment.age} {t('common.yrs')} · {translateGender(t, confirmedAppointment.gender)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] text-slate-400 block">{t('booking.consultantService')}</span>
                        <strong className="text-sm font-bold text-teal-200 block truncate">
                          {confirmedAppointment.targetTitle}
                        </strong>
                        <span className="text-[11px] text-slate-400">
                          {translateDepartmentName(t, confirmedAppointment.departmentName)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] text-slate-400 block">{t('booking.dateTimeWindow')}</span>
                        <strong className="text-sm font-bold text-white block">
                          {confirmedAppointment.date}
                        </strong>
                        <span className="text-[11px] text-teal-300">{confirmedAppointment.timeSlot}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-700/70 grid grid-cols-3 gap-3 text-xs">
                      <div className="bg-slate-950/50 rounded-xl px-3 py-2 border border-slate-700/60">
                        <span className="text-[10px] text-slate-400 uppercase block">{t('booking.patientsAhead')}</span>
                        <strong className="font-mono tabular-nums text-white text-sm">
                          {confirmedAppointment.patientsAhead ?? 0}
                        </strong>
                      </div>
                      <div className="bg-slate-950/50 rounded-xl px-3 py-2 border border-slate-700/60">
                        <span className="text-[10px] text-slate-400 uppercase block">{t('booking.estWaitLabel')}</span>
                        <strong className="font-mono tabular-nums text-amber-300 text-sm">
                          ~{confirmedAppointment.estimatedWaitMinutes ?? 0} {t('common.mins')}
                        </strong>
                      </div>
                      <div className="bg-slate-950/50 rounded-xl px-3 py-2 border border-slate-700/60">
                        <span className="text-[10px] text-slate-400 uppercase block">{t('booking.estConsultTime')}</span>
                        <strong className="font-mono tabular-nums text-teal-300 text-sm">
                          {confirmedAppointment.estimatedTime || t('common.pending')}
                        </strong>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-300">
                      <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {t('common.status')}: {translateTokenStatus(t, confirmedAppointment.status)}
                      </span>
                      <span className="font-mono text-slate-400">
                        {t('booking.mobileLabel', { phone: confirmedAppointment.phone })}
                      </span>
                    </div>
                  </motion.div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                    <button
                      onClick={() => {
                        const tok = confirmedAppointment.tokenNumber;
                        const tgt = confirmedAppointment.targetId;
                        handleClose();
                        onTrackQueue(tok, tgt);
                      }}
                      className="w-full sm:flex-1 py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-teal-500/25 btn-interactive cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>{t('booking.trackLiveBtn')}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      onClick={handlePrintSlip}
                      className="w-full sm:w-auto py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Printer className="w-4 h-4 text-slate-600" />
                      <span>{t('booking.printPass')}</span>
                    </button>

                    <button
                      onClick={handleClose}
                      className="w-full sm:w-auto py-3 px-4 text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer"
                    >
                      {t('common.close')}
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* Step-Based Booking Form */
                <motion.div
                  key="booking-form-wrapper"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-6 sm:p-8 space-y-6"
                >
                  {/* Step Progress Indicators */}
                  <div className="flex items-center justify-center gap-4 text-xs font-bold border-b border-slate-100 pb-4">
                    <div
                      className={`flex items-center gap-2 transition-colors ${
                        step === 1 ? 'text-teal-700' : 'text-emerald-700'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                          step === 1
                            ? 'bg-teal-600 text-white shadow-xs'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {step === 2 ? <Check className="w-3.5 h-3.5" /> : '1'}
                      </span>
                      <span>{t('booking.step1Title')}</span>
                    </div>

                    <div className="w-16 h-1 bg-slate-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={false}
                        animate={{ scaleX: step === 2 ? 1 : 0.35 }}
                        transition={{ duration: 0.35, ease: APPLE_EASE }}
                        style={{ transformOrigin: 'left' }}
                        className="h-full w-full bg-teal-600 rounded-full"
                      />
                    </div>

                    <div
                      className={`flex items-center gap-2 transition-colors ${
                        step === 2 ? 'text-teal-700' : 'text-slate-400'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                          step === 2
                            ? 'bg-teal-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        2
                      </span>
                      <span>{t('booking.step2Title')}</span>
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    {/* STEP 1: PATIENT INFORMATION */}
                    {step === 1 ? (
                      <motion.div
                        key="booking-step-1"
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        transition={{ duration: 0.22, ease: APPLE_EASE }}
                        className="space-y-4"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              {t('booking.patientFullName')} <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              placeholder={t('auth.fullNamePlaceholder')}
                              value={patientName}
                              onChange={(e) => setPatientName(e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white focus:shadow-sm transition-all"
                            />
                            {errors.patientName && (
                              <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.patientName}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              {t('booking.age')} <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="number"
                              placeholder={t('booking.agePlaceholder')}
                              value={age}
                              onChange={(e) => setAge(e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white focus:shadow-sm transition-all"
                            />
                            {errors.age && (
                              <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.age}</p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">{t('booking.gender')}</label>
                            <select
                              value={gender}
                              onChange={(e) => setGender(e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
                            >
                              <option value="Female">{t('common.female')}</option>
                              <option value="Male">{t('common.male')}</option>
                              <option value="Other">{t('common.other')}</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              {t('auth.mobileNumber')} <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="tel"
                              placeholder={t('auth.mobilePlaceholder')}
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white focus:shadow-sm transition-all"
                            />
                            {errors.phone && (
                              <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.phone}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              {t('booking.emailOptional')}
                            </label>
                            <input
                              type="email"
                              placeholder={t('booking.emailPlaceholder')}
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white focus:shadow-sm transition-all"
                            />
                          </div>
                        </div>

                        <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                          <span className="text-[11px] text-slate-400">
                            {t('booking.step1Hint')}
                          </span>
                          <button
                            type="button"
                            onClick={handleNextStep}
                            className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md btn-interactive cursor-pointer flex items-center gap-1.5"
                          >
                            <span>{t('booking.proceedStep2')}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      /* STEP 2: DOCTOR / DIAGNOSTIC & TIME SLOT */
                      <motion.form
                        key="booking-step-2"
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 12 }}
                        transition={{ duration: 0.22, ease: APPLE_EASE }}
                        onSubmit={handleSubmit}
                        className="space-y-4"
                      >
                        {submitError && (
                          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{submitError}</span>
                          </div>
                        )}

                        {/* Sliding Service Toggle */}
                        <div className="grid grid-cols-2 p-1.5 bg-slate-100 rounded-xl relative">
                          <button
                            type="button"
                            onClick={() => {
                              setServiceType('doctor');
                              setErrors({});
                            }}
                            className={`relative py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                              serviceType === 'doctor'
                                ? 'text-slate-900'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {serviceType === 'doctor' && (
                              <motion.span
                                layoutId="booking-service-pill"
                                transition={SPRING_GENTLE}
                                className="absolute inset-0 bg-white rounded-lg shadow-sm"
                              />
                            )}
                            <span className="relative z-10">{t('booking.doctorConsult')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setServiceType('diagnostic');
                              setErrors({});
                            }}
                            className={`relative py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                              serviceType === 'diagnostic'
                                ? 'text-slate-900'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {serviceType === 'diagnostic' && (
                              <motion.span
                                layoutId="booking-service-pill"
                                transition={SPRING_GENTLE}
                                className="absolute inset-0 bg-white rounded-lg shadow-sm"
                              />
                            )}
                            <span className="relative z-10">{t('booking.diagnosticTest')}</span>
                          </button>
                        </div>

                        {serviceType === 'doctor' ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                {t('booking.department')}
                              </label>
                              <select
                                value={selectedDeptName}
                                onChange={(e) => {
                                  setSelectedDeptName(e.target.value);
                                  setSelectedDoctorId('');
                                }}
                                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
                              >
                                {departments.map((d) => (
                                  <option key={d.id} value={d.name}>
                                    {translateDepartmentName(t, d.name)}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                {t('booking.consultingDoctor')} <span className="text-rose-500">*</span>
                              </label>
                              <select
                                value={selectedDoctorId}
                                onChange={(e) => setSelectedDoctorId(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
                              >
                                <option value="">{t('booking.chooseDoctor')}</option>
                                {filteredDoctors.map((doc) => (
                                  <option key={doc.id} value={doc.id}>
                                    {doc.name} {t('booking.feeTag', { fee: doc.consultationFee })}
                                  </option>
                                ))}
                              </select>
                              {errors.doctor && (
                                <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.doctor}</p>
                              )}
                              {activeDoc && !activeDoc.isAvailableToday && (
                                <p className="text-[11px] text-amber-700 mt-1 font-medium">
                                  {t('booking.offDutyNotice', { name: activeDoc.name })}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              {t('booking.chooseDiagnosticLabel')} <span className="text-rose-500">*</span>
                            </label>
                            <select
                              value={selectedDiagnosticId}
                              onChange={(e) => {
                                setSelectedDiagnosticId(e.target.value);
                                const d = diagnostics.find((item) => item.id === e.target.value);
                                if (d) setSelectedDeptName(d.category);
                              }}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
                            >
                              <option value="">{t('booking.chooseDiagnosticOpt')}</option>
                              {diagnostics.map((diag) => (
                                <option key={diag.id} value={diag.id}>
                                  {diag.name} ({translateDiagnosticCategory(t, diag.category)} · ₹{diag.approxFee})
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
                              {t('common.date')} <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="date"
                              value={appointmentDate}
                              min="2026-10-04"
                              onChange={(e) => setAppointmentDate(e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
                            />
                            {errors.date && (
                              <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.date}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              {t('booking.timeWindow')} <span className="text-rose-500">*</span>
                            </label>
                            <select
                              value={selectedTimeSlot}
                              onChange={(e) => setSelectedTimeSlot(e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
                            >
                              <option value="">{t('booking.selectTimeSlot')}</option>
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
                            {t('booking.reasonLabel')} <span className="text-rose-500">*</span>
                          </label>
                          <textarea
                            rows={2}
                            placeholder={t('booking.reasonPlaceholder')}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
                          />
                          {errors.reason && (
                            <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.reason}</p>
                          )}
                        </div>

                        {/* Counter Fee Banner */}
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                          <span className="text-slate-600">{t('booking.counterFee')}</span>
                          <strong className="text-slate-900 font-mono tabular-nums text-sm">
                            ₹{serviceType === 'doctor' ? activeDoc?.consultationFee || 500 : activeDiag?.approxFee || 350}
                          </strong>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setStep(1)}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer disabled:opacity-50"
                          >
                            {t('booking.backToPatient')}
                          </button>

                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-70 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md btn-interactive cursor-pointer inline-flex items-center gap-2"
                          >
                            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            <span>
                              {isSubmitting ? t('booking.generatingToken') : t('booking.confirmGenerateToken')}
                            </span>
                          </button>
                        </div>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
