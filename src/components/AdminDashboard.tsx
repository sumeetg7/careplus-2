import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import {
  Department,
  Doctor,
  DiagnosticService,
  Appointment,
  QueueState,
  DoctorQueueState,
  TokenStatus,
  FeedbackItem,
  BloodRequest,
  BloodRequestStatus,
  BloodStockItem,
  BloodGroup,
  UserSession,
} from '../types';
import {
  toggleDoctorAvailabilityAsync,
  updateAppointmentStatusAsync,
  callNextPatientAsync,
  startConsultationAsync,
  completeConsultationAsync,
  skipPatientTokenAsync,
  cancelPatientAppointmentAsync,
  updateDoctorQueueConfigAsync,
  updateDiagnosticFeeAsync,
  toggleDiagnosticAvailabilityAsync,
  addDoctorAsync,
  resetDemoDatabaseAsync,
} from '../services/storageService';
import {
  BLOOD_STATUSES,
  adminTransitionBloodRequest,
  adminUpdateBloodStock,
} from '../services/bloodRequestService';
import {
  translateDepartmentName,
  translateTokenStatus,
  translateGender,
  translateDiagnosticCategory,
  translateBloodAvailability,
  translateBloodRequestStatus,
} from '../i18n';
import {
  APPLE_EASE,
  SPRING_GENTLE,
  RevealSection,
  StaggerGrid,
  StaggerCard,
  AnimatedCounter,
} from './MotionPrimitives';
import { DoctorAvatar } from './DoctorAvatar';
import {
  Plus,
  CheckCircle2,
  Edit2,
  ShieldAlert,
  RotateCcw,
  Trash2,
  Lock,
  PhoneCall,
  Play,
  CheckSquare,
  SkipForward,
  Clock,
  Users,
  Search,
  AlertCircle,
  Loader2,
  Sliders,
} from 'lucide-react';

interface AdminDashboardProps {
  session: UserSession | null;
  departments: Department[];
  doctors: Doctor[];
  diagnostics: DiagnosticService[];
  appointments: Appointment[];
  queues: Record<string, QueueState>;
  doctorQueues: Record<string, DoctorQueueState>;
  feedbacks: FeedbackItem[];
  bloodStock: BloodStockItem[];
  bloodRequests: BloodRequest[];
  onOpenAuth: () => void;
  onRefreshAll: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  session,
  departments,
  doctors,
  diagnostics,
  appointments,
  queues,
  doctorQueues,
  feedbacks,
  bloodStock,
  bloodRequests,
  onOpenAuth,
  onRefreshAll,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<
    'queue' | 'appointments' | 'doctors' | 'diagnostics' | 'blood' | 'feedback'
  >('queue');
  const [bloodStatusFilter, setBloodStatusFilter] = useState<'All' | BloodRequestStatus>('All');
  const [bloodSubTab, setBloodSubTab] = useState<'stock' | 'requests'>('stock');
  const [bloodBusyId, setBloodBusyId] = useState<string | null>(null);
  const [stockEditMap, setStockEditMap] = useState<Record<string, string>>({});

  // Queue Manager State
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(doctors[0]?.id || 'doc-1');
  const [queueFilterDoctorId, setQueueFilterDoctorId] = useState<string>('ALL');
  const [queueFilterStatus, setQueueFilterStatus] = useState<'ALL' | TokenStatus>('ALL');
  const [queueSearchQuery, setQueueSearchQuery] = useState<string>('');
  const [durationInput, setDurationInput] = useState<string>('10');
  const [queueBusyAction, setQueueBusyAction] = useState<string | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);

  // Add doctor modal state
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocQual, setNewDocQual] = useState('');
  const [newDocSpec, setNewDocSpec] = useState('');
  const [newDocDeptId, setNewDocDeptId] = useState(departments[0]?.id || 'dept-cardio');
  const [newDocFee, setNewDocFee] = useState('500');
  const [newDocExp, setNewDocExp] = useState('10');
  const [newDocTime, setNewDocTime] = useState('09:00 AM - 01:00 PM');
  const [newDocBio, setNewDocBio] = useState('');

  const [toastMsg, setToastMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  useEffect(() => {
    const dq = doctorQueues[selectedDoctorId];
    if (dq) {
      setDurationInput(String(dq.avgConsultationMinutes));
    }
  }, [selectedDoctorId, doctorQueues]);

  // Defense-in-depth RBAC guard: block rendering any admin controls if caller is not an authenticated admin
  if (!session || session.role !== 'admin') {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-page-enter">
        <div className="bg-white rounded-3xl border border-rose-200 p-8 sm:p-10 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <span className="inline-block px-3 py-1 rounded-md bg-rose-50 text-rose-700 text-[11px] font-bold uppercase tracking-wider">
            {t('admin.deniedBadge')}
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {t('admin.authRequired')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            {session
              ? t('admin.deniedPatientMsg', { name: session.name, role: session.role })
              : t('admin.deniedGuestMsg')}
          </p>
          <button
            onClick={onOpenAuth}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            {t('admin.signInAdmin')}
          </button>
        </div>
      </div>
    );
  }

  const showToast = (text: string, isError = false) => {
    setToastMsg({ text, isError });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleToggleDoctor = async (id: string) => {
    try {
      await toggleDoctorAvailabilityAsync(id, session);
      onRefreshAll();
      showToast(t('admin.toastDoctorAvail'));
    } catch (err: any) {
      showToast(err?.message || t('admin.toastAdminReq'), true);
    }
  };

  const handleCallNextPatient = async (targetId: string) => {
    if (queueBusyAction) return;
    setQueueBusyAction(`call-${targetId}`);
    setQueueError(null);
    try {
      const result = await callNextPatientAsync(targetId, session);
      onRefreshAll();
      showToast(result.message);
    } catch (err: any) {
      const msg = err?.message || 'Unable to call next patient.';
      setQueueError(msg);
      showToast(msg, true);
    } finally {
      setQueueBusyAction(null);
    }
  };

  const handleStartConsultation = async (tokenId: string) => {
    if (queueBusyAction) return;
    setQueueBusyAction(`start-${tokenId}`);
    setQueueError(null);
    try {
      const result = await startConsultationAsync(tokenId, session);
      onRefreshAll();
      showToast(result.message);
    } catch (err: any) {
      const msg = err?.message || 'Unable to start consultation.';
      setQueueError(msg);
      showToast(msg, true);
    } finally {
      setQueueBusyAction(null);
    }
  };

  const handleCompleteConsultation = async (tokenId: string) => {
    if (queueBusyAction) return;
    setQueueBusyAction(`complete-${tokenId}`);
    setQueueError(null);
    try {
      const result = await completeConsultationAsync(tokenId, session);
      onRefreshAll();
      showToast(result.message);
    } catch (err: any) {
      const msg = err?.message || 'Unable to complete consultation.';
      setQueueError(msg);
      showToast(msg, true);
    } finally {
      setQueueBusyAction(null);
    }
  };

  const handleSkipPatient = async (tokenId: string) => {
    if (queueBusyAction) return;
    setQueueBusyAction(`skip-${tokenId}`);
    setQueueError(null);
    try {
      const result = await skipPatientTokenAsync(tokenId, session);
      onRefreshAll();
      showToast(result.message);
    } catch (err: any) {
      const msg = err?.message || 'Unable to skip patient token.';
      setQueueError(msg);
      showToast(msg, true);
    } finally {
      setQueueBusyAction(null);
    }
  };

  const handleCancelToken = async (tokenId: string) => {
    if (queueBusyAction) return;
    setQueueBusyAction(`cancel-${tokenId}`);
    setQueueError(null);
    try {
      const result = await cancelPatientAppointmentAsync(tokenId, session);
      onRefreshAll();
      showToast(result.message);
    } catch (err: any) {
      const msg = err?.message || 'Unable to cancel token.';
      setQueueError(msg);
      showToast(msg, true);
    } finally {
      setQueueBusyAction(null);
    }
  };

  const handleSaveAvgDuration = async (useAutoRolling: boolean) => {
    const mins = Math.max(1, Math.min(120, Math.round(Number(durationInput) || 10)));
    setQueueBusyAction('save-duration');
    setQueueError(null);
    try {
      await updateDoctorQueueConfigAsync(
        selectedDoctorId,
        useAutoRolling
          ? { avgConsultationOverride: false }
          : { avgConsultationMinutes: mins, avgConsultationOverride: true },
        session
      );
      onRefreshAll();
      showToast(
        useAutoRolling
          ? t('admin.toastAutoRolling')
          : t('admin.toastDurationSet', { mins })
      );
    } catch (err: any) {
      const msg = err?.message || 'Failed to update consultation duration.';
      setQueueError(msg);
      showToast(msg, true);
    } finally {
      setQueueBusyAction(null);
    }
  };

  const handleStatusChange = async (apptId: string, newStatus: TokenStatus) => {
    try {
      const result = await updateAppointmentStatusAsync(apptId, newStatus, session);
      onRefreshAll();
      showToast(result.message);
    } catch (err: any) {
      showToast(err?.message || t('admin.toastAdminReq'), true);
    }
  };

  const handleEditFee = async (diagId: string, currentFee: number) => {
    const input = prompt(t('admin.promptNewFee'), String(currentFee));
    if (input && !isNaN(Number(input))) {
      try {
        await updateDiagnosticFeeAsync(diagId, Number(input), session);
        onRefreshAll();
        showToast(t('admin.toastFeeUpdated'));
      } catch (err: any) {
        showToast(err?.message || t('admin.toastAdminReq'), true);
      }
    }
  };

  const handleToggleDiagnostic = async (id: string) => {
    try {
      await toggleDiagnosticAvailabilityAsync(id, session);
      onRefreshAll();
      showToast(t('admin.toastDiagToggled'));
    } catch (err: any) {
      showToast(err?.message || t('admin.toastAdminReq'), true);
    }
  };

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim() || !newDocSpec.trim()) return;

    const dept = departments.find((d) => d.id === newDocDeptId);

    try {
      await addDoctorAsync(
        {
          name: newDocName.trim(),
          qualification: newDocQual.trim() || 'MBBS, MD',
          specialization: newDocSpec.trim(),
          departmentId: newDocDeptId,
          departmentName: dept?.name || 'General Medicine',
          experienceYears: Number(newDocExp) || 5,
          consultationFee: Number(newDocFee) || 500,
          availableDays: ['Monday', 'Wednesday', 'Friday'],
          availableTime: newDocTime,
          roomNumber: 'OPD Room 205',
          bio: newDocBio.trim() || 'Clinical specialist providing consultation at SmartCare.',
          photoUrl: '',
          isAvailableToday: true,
          avgConsultationMinutes: 10,
        },
        session
      );

      onRefreshAll();
      setShowAddDocModal(false);
      setNewDocName('');
      setNewDocSpec('');
      showToast(t('admin.toastDocAdded'));
    } catch (err: any) {
      showToast(err?.message || t('admin.toastAdminReq'), true);
    }
  };

  const handleResetDatabase = async () => {
    if (window.confirm(t('admin.confirmResetDb'))) {
      try {
        await resetDemoDatabaseAsync(session);
        onRefreshAll();
        showToast(t('admin.toastDbReset'));
      } catch (err: any) {
        showToast(err?.message || t('admin.toastAdminReq'), true);
      }
    }
  };

  const handleProcessBloodRequest = async (
    id: string,
    nextStatus: 'Approved' | 'Rejected' | 'Completed'
  ) => {
    setBloodBusyId(id);
    try {
      const updated = await adminTransitionBloodRequest(id, nextStatus, session);
      onRefreshAll();
      showToast(
        t('bloodBank.admin.toastStatusUpdated', {
          code: updated.referenceCode,
          status: translateBloodRequestStatus(t, updated.requestStatus),
        })
      );
    } catch (err: any) {
      showToast(err?.message || t('admin.toastAdminReq'), true);
    } finally {
      setBloodBusyId(null);
    }
  };

  const handleAdminStockUpdate = async (
    bloodGroup: BloodGroup,
    mode: 'add' | 'set',
    units: number
  ) => {
    setBloodBusyId(bloodGroup);
    try {
      const updated = await adminUpdateBloodStock(bloodGroup, mode, units, session);
      onRefreshAll();
      showToast(
        t('bloodBank.admin.toastStockUpdated', {
          group: updated.bloodGroup,
          units: updated.availableUnits,
          status: translateBloodAvailability(t, updated.availabilityStatus),
        })
      );
    } catch (err: any) {
      showToast(err?.message || t('bloodBank.admin.errUpdateStock'), true);
    } finally {
      setBloodBusyId(null);
    }
  };

  const filteredAdminBloodRequests = bloodRequests.filter((req) => {
    if (bloodStatusFilter === 'All') return true;
    return req.requestStatus === bloodStatusFilter;
  });

  const pendingBloodCount = bloodRequests.filter((r) => r.requestStatus === 'Pending').length;

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId) || doctors[0];
  const selectedQueueState = doctorQueues[selectedDoctorId];
  const selectedDoctorTokens = appointments
    .filter((a) => a.targetId === selectedDoctorId || a.doctorId === selectedDoctorId)
    .sort((a, b) => a.tokenNumber - b.tokenNumber);

  const activePatientToken =
    selectedDoctorTokens.find((t) => t.status === 'IN CONSULTATION') ||
    selectedDoctorTokens.find((t) => t.status === 'CALLED') ||
    null;

  const waitingForSelectedDoctor = selectedDoctorTokens.filter((t) => t.status === 'WAITING');
  const completedForSelectedDoctor = selectedDoctorTokens.filter((t) => t.status === 'COMPLETED');

  const totalWaitingAllDoctors = appointments.filter((a) => a.status === 'WAITING').length;
  const totalCompletedAllDoctors = appointments.filter((a) => a.status === 'COMPLETED').length;
  const totalActiveAllDoctors = appointments.filter(
    (a) => a.status === 'CALLED' || a.status === 'IN CONSULTATION'
  ).length;

  const filteredQueueTableTokens = appointments
    .filter((a) => {
      if (queueFilterDoctorId !== 'ALL' && a.targetId !== queueFilterDoctorId && a.doctorId !== queueFilterDoctorId) {
        return false;
      }
      if (queueFilterStatus !== 'ALL' && a.status !== queueFilterStatus) {
        return false;
      }
      if (queueSearchQuery.trim()) {
        const q = queueSearchQuery.trim().toLowerCase();
        const matchesToken = String(a.tokenNumber).includes(q) || `#${a.tokenNumber}` === q;
        const matchesId = a.id.toLowerCase().includes(q);
        const matchesName = a.patientName.toLowerCase().includes(q);
        const matchesDoc = a.targetTitle.toLowerCase().includes(q);
        if (!matchesToken && !matchesId && !matchesName && !matchesDoc) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const priority = (st: TokenStatus) =>
        st === 'IN CONSULTATION' ? 0 : st === 'CALLED' ? 1 : st === 'WAITING' ? 2 : 3;
      const diff = priority(a.status) - priority(b.status);
      if (diff !== 0) return diff;
      return a.tokenNumber - b.tokenNumber;
    });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.24, ease: APPLE_EASE }}
            className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl border flex items-center gap-2 text-xs font-semibold ${
              toastMsg.isError
                ? 'bg-rose-950 text-rose-100 border-rose-700'
                : 'bg-slate-900 text-white border-slate-700'
            }`}
          >
            {toastMsg.isError ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{toastMsg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header and Reset Action */}
      <RevealSection direction="up">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-mono uppercase tracking-wider font-bold">
                {t('admin.consoleBadge')}
              </span>
              <span className="text-xs text-slate-500">{t('admin.operationsHub')}</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              {t('admin.consoleTitle')}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('admin.consoleSubtitle')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleResetDatabase}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              title={t('admin.resetDemoDb')}
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>{t('admin.resetDemoDb')}</span>
            </button>
          </div>
        </div>
      </RevealSection>

      {/* KPI Overview Metric Cards */}
      <StaggerGrid immediate className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StaggerCard className="bg-white rounded-2xl border border-slate-200 p-5 space-y-1 shadow-xs card-hover-effect">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            {t('admin.totalBookings')}
          </span>
          <div className="text-3xl font-extrabold font-mono tabular-nums text-slate-900">
            <AnimatedCounter value={appointments.length} />
          </div>
          <span className="text-[11px] text-teal-600 font-semibold">{t('admin.acrossOpdLab')}</span>
        </StaggerCard>

        <StaggerCard className="bg-white rounded-2xl border border-slate-200 p-5 space-y-1 shadow-xs card-hover-effect">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            {t('admin.activeDoctors')}
          </span>
          <div className="text-3xl font-extrabold font-mono tabular-nums text-slate-900">
            <AnimatedCounter value={doctors.filter((d) => d.isAvailableToday).length} /> /{' '}
            <AnimatedCounter value={doctors.length} />
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold">{t('admin.onDutyToday')}</span>
        </StaggerCard>

        <StaggerCard className="bg-white rounded-2xl border border-slate-200 p-5 space-y-1 shadow-xs card-hover-effect">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            {t('admin.liveOpdCounters')}
          </span>
          <div className="text-3xl font-extrabold font-mono tabular-nums text-teal-700">
            <AnimatedCounter value={Object.keys(queues).length} />
          </div>
          <span className="text-[11px] text-slate-500">{t('admin.activeCounterQueues')}</span>
        </StaggerCard>

        <StaggerCard className="bg-white rounded-2xl border border-slate-200 p-5 space-y-1 shadow-xs card-hover-effect">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            {t('admin.patientFeedback')}
          </span>
          <div className="text-3xl font-extrabold font-mono tabular-nums text-amber-600">
            <AnimatedCounter value={feedbacks.length} />
          </div>
          <span className="text-[11px] text-slate-500">{t('admin.verifiedVisitsLogged')}</span>
        </StaggerCard>
      </StaggerGrid>

      {/* Tab Navigation with gliding active pill */}
      <div className="border-b border-slate-200 flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'queue', label: t('admin.tabs.queue') },
          { id: 'appointments', label: t('admin.tabs.appointments', { count: appointments.length }) },
          { id: 'doctors', label: t('admin.tabs.doctors', { count: doctors.length }) },
          { id: 'diagnostics', label: t('admin.tabs.diagnostics', { count: diagnostics.length }) },
          {
            id: 'blood',
            label:
              pendingBloodCount > 0
                ? t('admin.tabs.bloodPending', { count: pendingBloodCount })
                : t('admin.tabs.blood', { count: bloodRequests.length }),
          },
          { id: 'feedback', label: t('admin.tabs.feedback', { count: feedbacks.length }) },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative px-4 py-2.5 text-xs font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                isActive
                  ? 'text-white'
                  : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="admin-tab-pill"
                  transition={SPRING_GENTLE}
                  className="absolute inset-0 bg-slate-900 rounded-xl shadow-sm"
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
      {/* TAB 1: LIVE QUEUE & TOKEN MANAGEMENT */}
      {activeTab === 'queue' && (
        <motion.div
          key="admin-tab-queue"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: APPLE_EASE }}
          className="space-y-6"
        >
          {/* Real-Time Queue Summary Counters */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1 shadow-xs">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
                {t('admin.totalWaitingAll')}
              </span>
              <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900">
                {totalWaitingAllDoctors}
              </div>
              <span className="text-[11px] text-slate-500">
                {t('admin.selectedDoctorWaiting', { count: waitingForSelectedDoctor.length })}
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1 shadow-xs">
              <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider block">
                {t('admin.currentlyActive')}
              </span>
              <div className="text-2xl font-extrabold font-mono tabular-nums text-teal-700">
                {totalActiveAllDoctors}
              </div>
              <span className="text-[11px] text-slate-500">
                {activePatientToken
                  ? `${selectedDoctor?.name}: #${activePatientToken.tokenNumber}`
                  : t('admin.cabinReady')}
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1 shadow-xs">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                {t('admin.completedToday')}
              </span>
              <div className="text-2xl font-extrabold font-mono tabular-nums text-emerald-700">
                {totalCompletedAllDoctors}
              </div>
              <span className="text-[11px] text-slate-500">
                {t('admin.selectedDoctorServed', { count: completedForSelectedDoctor.length })}
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                {t('admin.effectiveAvgConsult')}
              </span>
              <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900">
                {selectedQueueState?.avgConsultationMinutes ?? 10} {t('common.min')}
              </div>
              <span className="text-[11px] text-slate-500">
                {selectedQueueState?.rollingAvgMinutes
                  ? t('admin.rollingAvgText', { mins: selectedQueueState.rollingAvgMinutes })
                  : t('admin.configuredDefault')}
              </span>
            </div>
          </div>

          {queueError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{queueError}</span>
              </div>
              <button
                onClick={() => setQueueError(null)}
                className="text-rose-700 hover:text-rose-900 font-bold cursor-pointer"
              >
                {t('common.dismiss')}
              </button>
            </div>
          )}

          {/* Doctor Queue Control Console + Current Active Patient Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 5 Cols: Doctor Selector, Avg Duration Config & CALL NEXT PATIENT */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider block">
                    {t('admin.perDoctorControl')}
                  </span>
                  <h2 className="text-lg font-extrabold text-slate-900 mt-0.5">
                    {t('admin.selectDoctorQueue')}
                  </h2>
                </div>
                {selectedDoctor && (
                  <button
                    onClick={() => handleToggleDoctor(selectedDoctor.id)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                      selectedDoctor.isAvailableToday
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    {selectedDoctor.isAvailableToday
                      ? t('admin.availableTodayBadge')
                      : t('admin.offDutyEnableBadge')}
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t('admin.doctorQueueLabel')}
                </label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => {
                    setSelectedDoctorId(e.target.value);
                    setQueueError(null);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
                >
                  {doctors.map((doc) => {
                    const dq = doctorQueues[doc.id];
                    return (
                      <option key={doc.id} value={doc.id}>
                        {doc.name} ({translateDepartmentName(t, doc.departmentName)}) — {t('admin.waitingInline', { count: dq?.waitingCount ?? 0 })}
                        {!doc.isAvailableToday ? ` [${t('common.unavailable')}]` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Configurable Average Consultation Duration */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-teal-600" />
                    {t('admin.avgConsultDuration')}
                  </span>
                  {selectedDoctor?.avgConsultationOverride && (
                    <button
                      type="button"
                      onClick={() => handleSaveAvgDuration(true)}
                      className="text-[11px] font-bold text-teal-700 hover:underline cursor-pointer"
                    >
                      {t('admin.useAutoRolling')}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={durationInput}
                    onChange={(e) => setDurationInput(e.target.value)}
                    className="w-24 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveAvgDuration(false)}
                    disabled={queueBusyAction === 'save-duration'}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
                  >
                    {t('admin.updatePace')}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  {t('admin.waitFormula', {
                    rem: selectedQueueState?.remainingCurrentMinutes ?? 0,
                    avg: selectedQueueState?.avgConsultationMinutes ?? 10,
                  })}
                </p>
              </div>

              {/* PROMINENT CALL NEXT PATIENT BUTTON */}
              <div className="pt-1 space-y-2">
                <button
                  type="button"
                  onClick={() => handleCallNextPatient(selectedDoctorId)}
                  disabled={
                    Boolean(queueBusyAction) ||
                    !selectedDoctor?.isAvailableToday ||
                    Boolean(activePatientToken) ||
                    waitingForSelectedDoctor.length === 0
                  }
                  className="w-full py-3.5 px-5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-extrabold text-sm rounded-xl shadow-md hover:shadow-teal-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {queueBusyAction === `call-${selectedDoctorId}` ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <PhoneCall className="w-4 h-4" />
                  )}
                  <span>
                    {!selectedDoctor?.isAvailableToday
                      ? t('admin.callNextDoctorUnavailable', { name: selectedDoctor?.name || '' })
                      : activePatientToken
                      ? t('admin.callNextActiveInProgress', { token: activePatientToken.tokenNumber })
                      : waitingForSelectedDoctor.length === 0
                      ? t('admin.callNextQueueEmpty')
                      : t('admin.callNextPatient', { token: waitingForSelectedDoctor[0].tokenNumber })}
                  </span>
                </button>
                <p className="text-[11px] text-slate-500 text-center">
                  {t('admin.callNextHint', { name: selectedDoctor?.name || '' })}
                </p>
              </div>
            </div>

            {/* Right 7 Cols: Current Active Patient Card */}
            <div className="lg:col-span-7 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 text-white rounded-2xl border border-slate-800 p-6 flex flex-col justify-between shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider block">
                    {t('admin.currentConsultBay', { room: selectedDoctor?.roomNumber || 'OPD' })}
                  </span>
                  <h3 className="text-lg font-extrabold text-white mt-0.5">
                    {selectedDoctor?.name}
                  </h3>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-[11px] font-bold border ${
                    activePatientToken?.status === 'IN CONSULTATION'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : activePatientToken?.status === 'CALLED'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {activePatientToken ? translateTokenStatus(t, activePatientToken.status) : t('admin.idleReady')}
                </span>
              </div>

              {activePatientToken ? (
                <div className="py-5 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center font-mono tabular-nums font-extrabold text-2xl text-teal-300">
                        #{activePatientToken.tokenNumber}
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 font-mono">
                          {activePatientToken.id}
                        </div>
                        <div className="text-xl font-extrabold text-white">
                          {activePatientToken.patientName}
                        </div>
                        <div className="text-xs text-slate-300">
                          {activePatientToken.age}{t('common.yrs')}, {translateGender(t, activePatientToken.gender)} · {activePatientToken.phone}
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-950/60 rounded-xl px-4 py-3 border border-slate-800 text-center">
                      <span className="text-[10px] text-teal-300 uppercase tracking-wider block font-bold">
                        {t('admin.estRemaining')}
                      </span>
                      <strong className="text-2xl font-mono tabular-nums text-amber-300">
                        {selectedQueueState?.remainingCurrentMinutes ?? 0} {t('common.min')}
                      </strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase block">{t('admin.calledTime')}</span>
                      <strong className="font-mono text-white">
                        {activePatientToken.calledAt
                          ? new Date(activePatientToken.calledAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })
                          : '—'}
                      </strong>
                    </div>
                    <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase block">{t('admin.consultStartTime')}</span>
                      <strong className="font-mono text-white">
                        {activePatientToken.consultationStartAt
                          ? new Date(activePatientToken.consultationStartAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })
                          : t('admin.waitingToStart')}
                      </strong>
                    </div>
                    <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase block">{t('admin.nextWaitingToken')}</span>
                      <strong className="font-mono text-teal-300">
                        {waitingForSelectedDoctor[0]
                          ? `#${waitingForSelectedDoctor[0].tokenNumber} (${waitingForSelectedDoctor[0].patientName})`
                          : t('common.none')}
                      </strong>
                    </div>
                  </div>

                  {/* Lifecycle Action Buttons */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    {activePatientToken.status === 'CALLED' && (
                      <button
                        type="button"
                        onClick={() => handleStartConsultation(activePatientToken.id)}
                        disabled={Boolean(queueBusyAction)}
                        className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        <span>{t('admin.startConsultation')}</span>
                      </button>
                    )}

                    {(activePatientToken.status === 'IN CONSULTATION' ||
                      activePatientToken.status === 'CALLED') && (
                      <button
                        type="button"
                        onClick={() => handleCompleteConsultation(activePatientToken.id)}
                        disabled={Boolean(queueBusyAction)}
                        className="flex-1 py-3 px-4 bg-teal-400 hover:bg-teal-300 text-slate-950 font-extrabold text-xs rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckSquare className="w-4 h-4" />
                        <span>{t('admin.completeConsultation')}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleSkipPatient(activePatientToken.id)}
                      disabled={Boolean(queueBusyAction)}
                      className="py-3 px-4 bg-slate-800 hover:bg-rose-900/80 text-slate-200 hover:text-white border border-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                    >
                      <SkipForward className="w-4 h-4" />
                      <span>{t('admin.skipPatient')}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800/90 text-teal-400 flex items-center justify-center mx-auto border border-slate-700">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white">
                      {t('admin.noActivePatient')}
                    </p>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      {waitingForSelectedDoctor.length > 0
                        ? t('admin.waitingForDoctorDesc', {
                            count: waitingForSelectedDoctor.length,
                            name: selectedDoctor?.name || '',
                            token: waitingForSelectedDoctor[0].tokenNumber,
                          })
                        : t('admin.allServedDesc', { name: selectedDoctor?.name || '' })}
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>{t('admin.syncedLive')}</span>
                <span className="font-mono">
                  {t('admin.updatedAt', { time: selectedQueueState?.lastUpdated || t('admin.justNow') })}
                </span>
              </div>
            </div>
          </div>

          {/* Per-Doctor Quick Queue Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {doctors.slice(0, 4).map((doc) => {
              const dq = doctorQueues[doc.id];
              const isSelected = doc.id === selectedDoctorId;
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => {
                    setSelectedDoctorId(doc.id);
                    setQueueError(null);
                  }}
                  className={`text-left rounded-2xl border p-4 transition-all cursor-pointer space-y-2 ${
                    isSelected
                      ? 'bg-teal-50/70 border-teal-500 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-slate-900 truncate">
                        {doc.name}
                      </div>
                      <div className="text-[11px] text-slate-500">{translateDepartmentName(t, doc.departmentName)}</div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                        doc.isAvailableToday
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {doc.isAvailableToday ? t('admin.onDutyShort') : t('admin.offShort')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <span className="font-mono font-bold text-teal-700">
                      {t('admin.servingColon')} {dq?.currentServingToken ? `#${dq.currentServingToken}` : '—'}
                    </span>
                    <span className="font-mono text-amber-700 font-bold">
                      {t('admin.waitColon')} {dq?.waitingCount ?? 0}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Complete Waiting & Token Queue Table with Search & Filters */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/60">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  {t('admin.queueTableTitle', { count: filteredQueueTableTokens.length })}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {t('admin.queueTableSubtitle')}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={t('admin.searchTokenPatient')}
                    value={queueSearchQuery}
                    onChange={(e) => setQueueSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                <select
                  value={queueFilterDoctorId}
                  onChange={(e) => setQueueFilterDoctorId(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  <option value="ALL">{t('admin.allDoctorsServices')}</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                  {diagnostics.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>

                <select
                  value={queueFilterStatus}
                  onChange={(e) => setQueueFilterStatus(e.target.value as 'ALL' | TokenStatus)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  <option value="ALL">{t('admin.allStatuses')}</option>
                  <option value="WAITING">{translateTokenStatus(t, 'WAITING')}</option>
                  <option value="CALLED">{translateTokenStatus(t, 'CALLED')}</option>
                  <option value="IN CONSULTATION">{translateTokenStatus(t, 'IN CONSULTATION')}</option>
                  <option value="COMPLETED">{translateTokenStatus(t, 'COMPLETED')}</option>
                  <option value="SKIPPED">{translateTokenStatus(t, 'SKIPPED')}</option>
                  <option value="CANCELLED">{translateTokenStatus(t, 'CANCELLED')}</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4 font-bold">{t('admin.colToken')}</th>
                    <th className="py-3.5 px-4 font-bold">{t('admin.colPatientName')}</th>
                    <th className="py-3.5 px-4 font-bold">{t('admin.colDoctorService')}</th>
                    <th className="py-3.5 px-4 font-bold">{t('admin.colPosition')}</th>
                    <th className="py-3.5 px-4 font-bold">{t('admin.colEstimatedWait')}</th>
                    <th className="py-3.5 px-4 font-bold">{t('common.status')}</th>
                    <th className="py-3.5 px-4 font-bold text-right">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredQueueTableTokens.length > 0 ? (
                    filteredQueueTableTokens.map((tok) => (
                      <tr key={tok.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-extrabold text-sm text-teal-700">
                            #{tok.tokenNumber}
                          </div>
                          <div className="font-mono text-[10px] text-slate-400">{tok.id}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{tok.patientName}</div>
                          <div className="text-[11px] text-slate-400">{tok.phone}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">{tok.targetTitle}</div>
                          <div className="text-[11px] text-slate-400">{translateDepartmentName(t, tok.departmentName)}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          {tok.status === 'WAITING' ? (
                            <span className="font-bold text-slate-900">
                              #{(tok.patientsAhead ?? 0) + 1}{' '}
                              <span className="text-[10px] font-sans font-normal text-slate-500">
                                {t('admin.aheadCount', { count: tok.patientsAhead ?? 0 })}
                              </span>
                            </span>
                          ) : tok.status === 'IN CONSULTATION' ? (
                            <span className="text-emerald-700 font-bold font-sans">{t('admin.inCabin')}</span>
                          ) : tok.status === 'CALLED' ? (
                            <span className="text-amber-700 font-bold font-sans">{t('admin.proceeding')}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {tok.status === 'WAITING' ? (
                            <div>
                              <span className="font-mono font-bold text-amber-700">
                                ~{tok.estimatedWaitMinutes ?? 0} {t('common.min')}
                              </span>
                              <div className="text-[10px] text-slate-400">
                                {tok.estimatedTime || '—'}
                              </div>
                            </div>
                          ) : tok.status === 'COMPLETED' && tok.actualDurationMinutes ? (
                            <span className="font-mono text-[11px] text-emerald-700 font-semibold">
                              {t('admin.actualDuration', { mins: tok.actualDurationMinutes })}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              tok.status === 'WAITING'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : tok.status === 'CALLED'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : tok.status === 'IN CONSULTATION'
                                ? 'bg-teal-50 text-teal-800 border-teal-300'
                                : tok.status === 'COMPLETED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : tok.status === 'SKIPPED'
                                ? 'bg-slate-100 text-slate-700 border-slate-300'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {translateTokenStatus(t, tok.status)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            {tok.status === 'CALLED' && (
                              <button
                                type="button"
                                onClick={() => handleStartConsultation(tok.id)}
                                disabled={Boolean(queueBusyAction)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                              >
                                {t('admin.btnStart')}
                              </button>
                            )}
                            {(tok.status === 'IN CONSULTATION' || tok.status === 'CALLED') && (
                              <button
                                type="button"
                                onClick={() => handleCompleteConsultation(tok.id)}
                                disabled={Boolean(queueBusyAction)}
                                className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                              >
                                {t('admin.btnComplete')}
                              </button>
                            )}
                            {(tok.status === 'WAITING' ||
                              tok.status === 'CALLED' ||
                              tok.status === 'IN CONSULTATION') && (
                              <button
                                type="button"
                                onClick={() => handleSkipPatient(tok.id)}
                                disabled={Boolean(queueBusyAction)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold cursor-pointer"
                              >
                                {t('admin.btnSkip')}
                              </button>
                            )}
                            {tok.status === 'WAITING' && (
                              <button
                                type="button"
                                onClick={() => handleCancelToken(tok.id)}
                                disabled={Boolean(queueBusyAction)}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-bold cursor-pointer"
                              >
                                {t('common.cancel')}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                        {t('admin.noTokensMatch')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 2: APPOINTMENTS MANAGER */}
      {activeTab === 'appointments' && (
        <motion.div
          key="admin-tab-appointments"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: APPLE_EASE }}
          className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 font-bold">{t('admin.colIdToken')}</th>
                  <th className="py-3.5 px-4 font-bold">{t('admin.colPatientDetails')}</th>
                  <th className="py-3.5 px-4 font-bold">{t('admin.colDoctorService')}</th>
                  <th className="py-3.5 px-4 font-bold">{t('admin.colDateSlot')}</th>
                  <th className="py-3.5 px-4 font-bold">{t('admin.colReason')}</th>
                  <th className="py-3.5 px-4 font-bold">{t('common.status')}</th>
                  <th className="py-3.5 px-4 font-bold text-right">{t('admin.colUpdateStatus')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-slate-900">{a.id}</div>
                      <div className="text-teal-700 font-mono font-extrabold text-xs mt-0.5">
                        {t('admin.tokenNumLabel', { num: a.tokenNumber })}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{a.patientName}</div>
                      <div className="text-[11px] text-slate-400">
                        {a.age}{t('common.yrs')}, {translateGender(t, a.gender)} · {a.phone}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{a.targetTitle}</div>
                      <div className="text-[11px] text-slate-400">{translateDepartmentName(t, a.departmentName)}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">{a.date}</div>
                      <div className="text-[11px] text-slate-400">{a.timeSlot}</div>
                    </td>
                    <td className="py-3.5 px-4 max-w-[180px] truncate" title={a.reason}>
                      {a.reason}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          a.status === 'WAITING'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : a.status === 'CALLED'
                            ? 'bg-amber-50 text-amber-800 border border-amber-300'
                            : a.status === 'IN CONSULTATION'
                            ? 'bg-teal-50 text-teal-700 border border-teal-200'
                            : a.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : a.status === 'SKIPPED'
                            ? 'bg-slate-100 text-slate-700 border border-slate-300'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {translateTokenStatus(t, a.status)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      <select
                        value={a.status}
                        onChange={(e) => handleStatusChange(a.id, e.target.value as TokenStatus)}
                        className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 font-semibold focus:outline-none"
                      >
                        <option value="WAITING">{translateTokenStatus(t, 'WAITING')}</option>
                        <option value="CALLED">{translateTokenStatus(t, 'CALLED')}</option>
                        <option value="IN CONSULTATION">{translateTokenStatus(t, 'IN CONSULTATION')}</option>
                        <option value="COMPLETED">{translateTokenStatus(t, 'COMPLETED')}</option>
                        <option value="SKIPPED">{translateTokenStatus(t, 'SKIPPED')}</option>
                        <option value="CANCELLED">{translateTokenStatus(t, 'CANCELLED')}</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* TAB 3: DOCTORS MANAGER */}
      {activeTab === 'doctors' && (
        <motion.div
          key="admin-tab-doctors"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: APPLE_EASE }}
          className="space-y-6"
        >
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-slate-900">
              {t('admin.manageFaculty')}
            </h2>
            <button
              onClick={() => setShowAddDocModal(true)}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold btn-interactive shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('admin.addNewDoctor')}</span>
            </button>
          </div>

          <StaggerGrid immediate className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map((doc) => (
              <StaggerCard
                key={doc.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs card-hover-effect"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <DoctorAvatar
                      name={doc.name}
                      photoUrl={doc.photoUrl}
                      isAvailableToday={doc.isAvailableToday}
                      availabilityTitle={doc.isAvailableToday ? t('admin.activeLabel') : t('common.offDuty')}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 truncate">{doc.name}</h3>
                      <p className="text-xs text-teal-700 font-semibold truncate">{doc.specialization}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">{translateDepartmentName(t, doc.departmentName)}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">{t('admin.feeLabel')}</span>
                    <span className="text-sm font-mono font-bold text-slate-900">
                      ₹{doc.consultationFee}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div>{t('admin.timingsPrefix', { time: doc.availableTime })}</div>
                  <div>{t('admin.roomPrefix', { room: doc.roomNumber })}</div>
                  <div>{t('admin.expPrefix', { years: doc.experienceYears })}</div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    {t('admin.opdDutyLabel')} <strong>{doc.isAvailableToday ? t('admin.activeLabel') : t('common.offDuty')}</strong>
                  </span>
                  <button
                    onClick={() => handleToggleDoctor(doc.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      doc.isAvailableToday
                        ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    {doc.isAvailableToday ? t('admin.setOffDuty') : t('admin.setActiveToday')}
                  </button>
                </div>
              </StaggerCard>
            ))}
          </StaggerGrid>
        </motion.div>
      )}

      {/* TAB 4: DIAGNOSTICS MANAGER */}
      {activeTab === 'diagnostics' && (
        <motion.div
          key="admin-tab-diagnostics"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: APPLE_EASE }}
          className="space-y-6"
        >
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-slate-900">
              {t('admin.diagManagerTitle')}
            </h2>
          </div>

          <StaggerGrid immediate className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {diagnostics.map((diag) => (
              <StaggerCard
                key={diag.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs card-hover-effect"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded">
                      {translateDiagnosticCategory(t, diag.category)}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm mt-1">{diag.name}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">{t('admin.feeLabel')}</span>
                    <span className="text-base font-bold font-mono text-slate-900">
                      ₹{diag.approxFee}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div>{t('admin.durationPrefix', { duration: diag.duration })}</div>
                  <div>{t('admin.turnaroundPrefix', { time: diag.reportDeliveryTime })}</div>
                  <div>{t('admin.roomPrefix', { room: diag.roomNumber })}</div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleEditFee(diag.id, diag.approxFee)}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>{t('admin.changeFee')}</span>
                  </button>

                  <button
                    onClick={() => handleToggleDiagnostic(diag.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      diag.isAvailableToday
                        ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    {diag.isAvailableToday ? t('admin.markMaintenance') : t('admin.markAvailable')}
                  </button>
                </div>
              </StaggerCard>
            ))}
          </StaggerGrid>
        </motion.div>
      )}

      {/* TAB 5: SIMPLIFIED BLOOD BANK MANAGEMENT */}
      {activeTab === 'blood' && (
        <motion.div
          key="admin-tab-blood"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: APPLE_EASE }}
          className="space-y-6"
        >
          {!session || session.role !== 'admin' ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                {t('admin.authRequired')}
              </h2>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                {t('admin.bloodAuthMsg')}
              </p>
              <button
                onClick={onOpenAuth}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                {t('admin.signInAdmin')}
              </button>
            </div>
          ) : (
            <>
              {/* Clean Blood Bank Admin Switcher */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBloodSubTab('stock')}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                      bloodSubTab === 'stock'
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {t('bloodBank.tabs.stock')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBloodSubTab('requests')}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                      bloodSubTab === 'requests'
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {t('bloodBank.tabs.requestsPending', { count: pendingBloodCount })}
                  </button>
                </div>

                <div className="text-xs text-slate-500 font-mono tabular-nums">
                  {t('bloodBank.admin.totalUnitsInStock')}:{' '}
                  <strong className="text-slate-900">
                    {bloodStock.reduce((s, item) => s + item.availableUnits, 0)}
                  </strong>
                </div>
              </div>

              {bloodSubTab === 'stock' ? (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-3.5 px-4 font-bold">{t('bloodBank.bloodGroup')}</th>
                          <th className="py-3.5 px-4 font-bold">{t('bloodBank.availableUnits')}</th>
                          <th className="py-3.5 px-4 font-bold">{t('bloodBank.admin.lastUpdated')}</th>
                          <th className="py-3.5 px-4 font-bold">{t('bloodBank.admin.availabilityStatus')}</th>
                          <th className="py-3.5 px-4 font-bold text-right">{t('bloodBank.admin.updateStock')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {bloodStock.map((item) => {
                          const inputVal =
                            stockEditMap[item.bloodGroup] ?? String(item.availableUnits);
                          const isBusy = bloodBusyId === item.bloodGroup;
                          return (
                            <tr key={item.bloodGroup} className="hover:bg-sky-50/30 transition-colors">
                              <td className="py-3.5 px-4 font-mono font-bold text-sm text-slate-900">
                                {item.bloodGroup}
                              </td>
                              <td className="py-3.5 px-4 font-mono tabular-nums font-bold text-slate-900">
                                {item.availableUnits} {item.availableUnits === 1 ? t('common.unit') : t('common.units')}
                              </td>
                              <td className="py-3.5 px-4 font-mono tabular-nums text-slate-500">
                                {new Date(item.lastUpdated).toLocaleString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td className="py-3.5 px-4">
                                <span
                                  className={`px-2.5 py-1 rounded-lg font-semibold ${
                                    item.availabilityStatus === 'Available'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : item.availabilityStatus === 'Low Stock'
                                      ? 'bg-amber-50 text-amber-800'
                                      : 'bg-rose-50 text-rose-700'
                                  }`}
                                >
                                  {translateBloodAvailability(t, item.availabilityStatus)}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <div className="inline-flex items-center gap-2 justify-end">
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() =>
                                      handleAdminStockUpdate(item.bloodGroup, 'add', 2)
                                    }
                                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-semibold rounded-lg cursor-pointer whitespace-nowrap"
                                  >
                                    {t('admin.add2Units')}
                                  </button>
                                  <input
                                    type="number"
                                    min={0}
                                    max={500}
                                    value={inputVal}
                                    onChange={(e) =>
                                      setStockEditMap((prev) => ({
                                        ...prev,
                                        [item.bloodGroup]: e.target.value,
                                      }))
                                    }
                                    className="w-20 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono tabular-nums text-slate-900"
                                  />
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => {
                                      const parsed = Number(inputVal);
                                      if (!Number.isInteger(parsed) || parsed < 0 || parsed > 500) {
                                        showToast(t('bloodBank.admin.errSetRange'), true);
                                        return;
                                      }
                                      void handleAdminStockUpdate(item.bloodGroup, 'set', parsed);
                                    }}
                                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-semibold rounded-lg cursor-pointer whitespace-nowrap"
                                  >
                                    {t('bloodBank.admin.update')}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <>
                  {/* Status Filter */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      {(['All', ...BLOOD_STATUSES] as const).map((st) => (
                        <button
                          key={st}
                          onClick={() => setBloodStatusFilter(st)}
                          className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                            bloodStatusFilter === st
                              ? 'bg-sky-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {st === 'All' ? t('common.all') : translateBloodRequestStatus(t, st)}
                        </button>
                      ))}
                    </div>
                    <span className="text-xs text-slate-500 font-mono tabular-nums">
                      {t('bloodBank.admin.showingOf', {
                        shown: filteredAdminBloodRequests.length,
                        total: bloodRequests.length,
                      })}
                    </span>
                  </div>

                  {/* Requests Table */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                          <tr>
                            <th className="py-3.5 px-4 font-bold">{t('admin.reqIdNeed')}</th>
                            <th className="py-3.5 px-4 font-bold">{t('admin.patientContact')}</th>
                            <th className="py-3.5 px-4 font-bold">{t('admin.hospitalDate')}</th>
                            <th className="py-3.5 px-4 font-bold">{t('common.status')}</th>
                            <th className="py-3.5 px-4 font-bold text-right">{t('admin.adminActions')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredAdminBloodRequests.map((req) => {
                            const isBusy = bloodBusyId === req.id;
                            return (
                              <tr key={req.id} className="hover:bg-sky-50/30 transition-colors">
                                <td className="py-4 px-4 space-y-1">
                                  <div className="font-mono font-bold text-slate-900">
                                    {req.referenceCode}
                                  </div>
                                  <div className="font-semibold text-sky-700 font-mono">
                                    {req.bloodGroup} · {req.unitsRequired}{' '}
                                    {req.unitsRequired === 1 ? t('common.unit') : t('common.units')}
                                  </div>
                                </td>
                                <td className="py-4 px-4 space-y-1">
                                  <div className="font-semibold text-slate-900">{req.patientName}</div>
                                  <div className="font-mono tabular-nums text-slate-600">
                                    {req.contactNumber}
                                  </div>
                                </td>
                                <td className="py-4 px-4 space-y-1">
                                  <div className="font-semibold text-slate-900">{req.hospitalName}</div>
                                  <div className="font-mono tabular-nums text-slate-500">
                                    {t('bloodBank.admin.requiredLabel', { date: req.requiredDate })}
                                  </div>
                                </td>
                                <td className="py-4 px-4">
                                  <span
                                    className={`px-2.5 py-1 rounded-lg font-semibold ${
                                      req.requestStatus === 'Approved'
                                        ? 'bg-sky-50 text-sky-800'
                                        : req.requestStatus === 'Completed'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : req.requestStatus === 'Rejected'
                                        ? 'bg-rose-50 text-rose-700'
                                        : 'bg-amber-50 text-amber-800'
                                    }`}
                                  >
                                    {translateBloodRequestStatus(t, req.requestStatus)}
                                  </span>
                                </td>
                                <td className="py-4 px-4 text-right">
                                  <div className="inline-flex items-center gap-2 justify-end">
                                    {req.requestStatus === 'Pending' && (
                                      <>
                                        <button
                                          type="button"
                                          disabled={isBusy}
                                          onClick={() => handleProcessBloodRequest(req.id, 'Approved')}
                                          className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white rounded-lg font-semibold cursor-pointer whitespace-nowrap"
                                        >
                                          {t('bloodBank.admin.approve')}
                                        </button>
                                        <button
                                          type="button"
                                          disabled={isBusy}
                                          onClick={() => handleProcessBloodRequest(req.id, 'Rejected')}
                                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 disabled:opacity-60 text-rose-700 border border-rose-200 rounded-lg font-semibold cursor-pointer whitespace-nowrap"
                                        >
                                          {t('bloodBank.admin.reject')}
                                        </button>
                                      </>
                                    )}
                                    {req.requestStatus === 'Approved' && (
                                      <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={() => handleProcessBloodRequest(req.id, 'Completed')}
                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg font-semibold cursor-pointer whitespace-nowrap"
                                      >
                                        {t('bloodBank.admin.markCompleted')}
                                      </button>
                                    )}
                                    {(req.requestStatus === 'Completed' ||
                                      req.requestStatus === 'Rejected') && (
                                      <span className="text-slate-400 font-medium">{t('bloodBank.admin.processed')}</span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </motion.div>
      )}

      {/* TAB 6: PATIENT FEEDBACK LIST */}
      {activeTab === 'feedback' && (
        <motion.div
          key="admin-tab-feedback"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: APPLE_EASE }}
          className="space-y-4"
        >
          <h2 className="text-base font-bold text-slate-900">
            {t('admin.feedbackLogsTitle')}
          </h2>

          <StaggerGrid immediate className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {feedbacks.map((fb) => (
              <StaggerCard
                key={fb.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2 shadow-xs card-hover-effect"
              >
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <strong className="text-slate-900">{fb.patientName}</strong>
                    <span className="text-slate-400 ml-1">{t('admin.tokenIdPrefix', { id: fb.appointmentId })}</span>
                  </div>
                  <span className="text-amber-500 font-bold">{fb.rating} / 5 ★</span>
                </div>
                <div className="text-[11px] text-teal-700 font-semibold">{translateDepartmentName(t, fb.departmentName)}</div>
                <p className="text-xs text-slate-700 italic">"{fb.comments}"</p>
                <div className="text-[10px] text-slate-400 text-right">{fb.date}</div>
              </StaggerCard>
            ))}
          </StaggerGrid>
        </motion.div>
      )}
      </AnimatePresence>

      {/* ADD DOCTOR MODAL */}
      <AnimatePresence>
        {showAddDocModal && (
          <motion.div
            key="add-doc-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              key="add-doc-card"
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.26, ease: APPLE_EASE }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-4 shadow-2xl border border-slate-200"
            >
            <h3 className="text-lg font-bold text-slate-900">{t('admin.addDocModalTitle')}</h3>

            <form onSubmit={handleCreateDoctor} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('admin.docNameLabel')}</label>
                <input
                  type="text"
                  required
                  placeholder={t('admin.docNamePlaceholder')}
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('booking.department')}</label>
                <select
                  value={newDocDeptId}
                  onChange={(e) => setNewDocDeptId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {translateDepartmentName(t, d.name)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('admin.qualificationLabel')}</label>
                  <input
                    type="text"
                    placeholder={t('admin.qualificationPlaceholder')}
                    value={newDocQual}
                    onChange={(e) => setNewDocQual(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('admin.specializationLabel')}</label>
                  <input
                    type="text"
                    required
                    placeholder={t('admin.specializationPlaceholder')}
                    value={newDocSpec}
                    onChange={(e) => setNewDocSpec(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('admin.feeCurrencyLabel')}</label>
                  <input
                    type="number"
                    value={newDocFee}
                    onChange={(e) => setNewDocFee(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('admin.expYearsLabel')}</label>
                  <input
                    type="number"
                    value={newDocExp}
                    onChange={(e) => setNewDocExp(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('admin.hoursLabel')}</label>
                  <input
                    type="text"
                    value={newDocTime}
                    onChange={(e) => setNewDocTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('admin.docBioLabel')}</label>
                <textarea
                  rows={2}
                  placeholder={t('admin.docBioPlaceholder')}
                  value={newDocBio}
                  onChange={(e) => setNewDocBio(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddDocModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 cursor-pointer shadow-xs"
                >
                  {t('admin.saveDoctor')}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
