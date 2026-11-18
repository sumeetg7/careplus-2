import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Appointment, DoctorQueueState, QueueState, UserSession } from '../types';
import { cancelPatientAppointmentAsync } from '../services/storageService';
import { calculateQueueForTarget, normalizeTokenStatus } from '../services/queueEstimator';
import { translateDepartmentName, translateTokenStatus } from '../i18n';
import {
  APPLE_EASE,
  RevealSection,
  StaggerGrid,
  StaggerCard,
  AnimatedCounter,
} from './MotionPrimitives';
import {
  Calendar,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  PlusCircle,
  MessageSquare,
  Lock,
  BellRing,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface PatientDashboardProps {
  session: UserSession;
  appointments: Appointment[];
  queues: Record<string, QueueState>;
  doctorQueues: Record<string, DoctorQueueState>;
  onTrackQueue: (token: number, targetId?: string) => void;
  onBookNew: () => void;
  onGiveFeedback: (apptId: string) => void;
  onRefreshData: () => void;
}

const PROGRESS_STEPS = ['WAITING', 'CALLED', 'IN CONSULTATION', 'COMPLETED'] as const;

export const PatientDashboard: React.FC<PatientDashboardProps> = ({
  session,
  appointments,
  doctorQueues,
  onTrackQueue,
  onBookNew,
  onGiveFeedback,
  onRefreshData,
}) => {
  const { t } = useTranslation();
  const [actionError, setActionError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Periodic UI timer tick (every 15s) so remaining consultation countdown updates smoothly
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  // Strictly scope appointments to the signed-in patient (never expose other patients' records)
  const patientAppts = appointments
    .map((a) => ({ ...a, status: normalizeTokenStatus(a.status) }))
    .filter(
      (a) =>
        a.phone === session.phone ||
        a.patientName.toLowerCase() === session.name.toLowerCase()
    );

  const upcoming = patientAppts.filter(
    (a) =>
      a.status === 'WAITING' ||
      a.status === 'CALLED' ||
      a.status === 'IN CONSULTATION'
  );
  const calledTokens = upcoming.filter((a) => a.status === 'CALLED');

  const past = patientAppts.filter(
    (a) =>
      a.status === 'COMPLETED' ||
      a.status === 'SKIPPED' ||
      a.status === 'CANCELLED'
  );
  const diagnosticBookings = patientAppts.filter((a) => a.serviceType === 'diagnostic');

  // Helper to resolve real-time per-doctor queue metrics for any appointment
  const getReadOnlyQueueMetrics = (appt: Appointment) => {
    const dq = doctorQueues[appt.targetId];
    const calc = calculateQueueForTarget({
      targetId: appt.targetId,
      targetName: appt.targetTitle,
      departmentId: appt.departmentId || 'dept-genmed',
      departmentName: appt.departmentName,
      serviceType: appt.serviceType,
      configuredAvgMinutes: dq?.avgConsultationMinutes ?? 10,
      avgOverride: true,
      isAvailable: dq?.isAvailable ?? true,
      appointments,
      nowMs,
    });

    const enrichedAppt =
      calc.updatedAppointments.find((a) => a.id === appt.id) || appt;
    const currentServing = calc.queueState.currentServingToken;
    const patientsAhead = enrichedAppt.patientsAhead ?? 0;
    const estimatedWaitMinutes = enrichedAppt.estimatedWaitMinutes ?? 0;
    const estimatedTime = enrichedAppt.estimatedTime || t('common.pending');

    let queuePositionLabel = t('patient.posNumber', { pos: patientsAhead + 1 });
    if (appt.status === 'IN CONSULTATION') {
      queuePositionLabel = t('patient.posInConsult');
    } else if (appt.status === 'CALLED') {
      queuePositionLabel = t('patient.posCalled');
    } else if (patientsAhead === 0) {
      queuePositionLabel = t('patient.posNext');
    }

    return {
      currentServing,
      patientsWaiting: patientsAhead,
      estimatedWaitMinutes,
      estimatedTime,
      queuePositionLabel,
      avgMinutes: calc.queueState.avgConsultationMinutes,
      remainingCurrentMinutes: calc.queueState.remainingCurrentMinutes,
      isAvailable: calc.queueState.isAvailable,
      lastUpdated: calc.queueState.lastUpdated,
    };
  };

  const primaryMetrics = upcoming.length > 0 ? getReadOnlyQueueMetrics(upcoming[0]) : null;

  const handleCancelAppointment = async (id: string) => {
    setActionError(null);
    if (window.confirm(t('patient.confirmCancel'))) {
      try {
        await cancelPatientAppointmentAsync(id, session);
        onRefreshData();
      } catch (err: any) {
        setActionError(err?.message || t('patient.errCancel'));
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Real-Time "Token Called" Alert Banner */}
      <AnimatePresence>
        {calledTokens.map((called) => (
          <motion.div
            key={`called-banner-${called.id}`}
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: APPLE_EASE }}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl p-5 shadow-xl border border-emerald-400 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0 animate-pulse">
                <BellRing className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-100 block">
                  {t('patient.liveQueueAlert', { token: called.tokenNumber })}
                </span>
                <p className="text-sm sm:text-base font-extrabold text-white mt-0.5">
                  {t('patient.tokenCalledMsg')}
                </p>
                <p className="text-xs text-emerald-100 mt-0.5">
                  {t('patient.doctorDeptLine', {
                    doctor: called.targetTitle,
                    dept: translateDepartmentName(t, called.departmentName),
                  })}
                </p>
              </div>
            </div>
            <button
              onClick={() => onTrackQueue(called.tokenNumber, called.targetId)}
              className="px-4 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 font-extrabold text-xs rounded-xl shadow-sm cursor-pointer shrink-0"
            >
              {t('patient.openWaitingBoard')}
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {actionError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: APPLE_EASE }}
            className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button
              onClick={() => setActionError(null)}
              className="text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
            >
              {t('common.dismiss')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Patient Welcome Hero Card */}
      <RevealSection direction="up">
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950 text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl border border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-600 to-cyan-500 text-white font-extrabold text-2xl flex items-center justify-center shadow-lg border border-teal-400/30">
              {session.name.split(' ').map((n) => n[0]).join('')}
            </div>
            <div>
              <span className="text-xs font-bold text-teal-400 uppercase tracking-wider block">
                {t('patient.portalLabel')}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-0.5">
                {t('patient.welcome', { name: session.name })}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                {t('patient.registeredPhone')} <span className="font-mono text-slate-300">{session.phone}</span> · {t('patient.healthRecord')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onBookNew}
              className="px-5 py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-md hover:shadow-teal-400/20 btn-interactive cursor-pointer flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('patient.bookNewAppt')}</span>
            </button>
          </div>
        </div>
      </RevealSection>

      {/* Summary KPI Cards */}
      <StaggerGrid immediate className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StaggerCard className="bg-white rounded-2xl border border-slate-200 p-5 space-y-1 shadow-xs card-hover-effect">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            {t('patient.upcomingConsultations')}
          </span>
          <div className="text-3xl font-extrabold font-mono tabular-nums text-teal-700">
            <AnimatedCounter value={upcoming.length} />
          </div>
          <p className="text-[11px] text-slate-500">{t('patient.activeOpdTokens')}</p>
        </StaggerCard>

        <StaggerCard className="bg-white rounded-2xl border border-slate-200 p-5 space-y-1 shadow-xs card-hover-effect">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            {t('patient.activeDigitalToken')}
          </span>
          <div className="text-3xl font-extrabold font-mono tabular-nums text-slate-900">
            {upcoming.length > 0 ? (
              <AnimatedCounter prefix="#" value={upcoming[0].tokenNumber} />
            ) : (
              t('common.none')
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            {upcoming.length > 0
              ? `${upcoming[0].targetTitle} (${translateTokenStatus(t, upcoming[0].status)})`
              : t('patient.noActiveToken')}
          </p>
        </StaggerCard>

        <StaggerCard className="bg-white rounded-2xl border border-slate-200 p-5 space-y-1 shadow-xs card-hover-effect">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            {t('patient.diagnosticInvestigations')}
          </span>
          <div className="text-3xl font-extrabold font-mono tabular-nums text-cyan-700">
            <AnimatedCounter value={diagnosticBookings.length} />
          </div>
          <p className="text-[11px] text-slate-500">{t('patient.pathologyRadiology')}</p>
        </StaggerCard>
      </StaggerGrid>

      {/* Read-Only Active Queue Telemetry Banner */}
      {upcoming.length > 0 && primaryMetrics && (
        <RevealSection direction="scale">
          <div className="bg-gradient-to-r from-teal-900 to-slate-900 text-white rounded-2xl p-6 border border-teal-700 space-y-5 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-teal-800/90 flex items-center justify-center font-mono tabular-nums font-extrabold text-2xl text-teal-200 border border-teal-600/50 shadow-sm">
                  #{upcoming[0].tokenNumber}
                </div>
                <div>
                  <span className="text-[11px] text-teal-300 font-bold uppercase tracking-wider block">
                    {t('patient.liveTokenTracking', { status: translateTokenStatus(t, upcoming[0].status) })}
                  </span>
                  <div className="text-base font-bold text-white">
                    {upcoming[0].targetTitle} ({translateDepartmentName(t, upcoming[0].departmentName)})
                  </div>
                  <div className="text-xs text-teal-200">
                    {t('patient.windowDate', { slot: upcoming[0].timeSlot, date: upcoming[0].date })}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={onRefreshData}
                  className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                  title={t('patient.syncNow')}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{t('patient.syncNow')}</span>
                </button>
                <button
                  onClick={() => onTrackQueue(upcoming[0].tokenNumber, upcoming[0].targetId)}
                  className="px-4 py-2.5 bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-xs rounded-xl shadow-md btn-interactive cursor-pointer flex items-center gap-1.5"
                >
                  <span>{t('patient.waitingLoungeBoard')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {!primaryMetrics.isAvailable && (
              <div className="bg-amber-500/20 border border-amber-400/40 rounded-xl px-4 py-2.5 text-xs text-amber-200 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-300 shrink-0" />
                <span>
                  {t('patient.doctorUnavailableNotice', { doctor: upcoming[0].targetTitle })}
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 border-t border-teal-800/80 text-xs">
              <div className="bg-slate-950/50 rounded-xl p-3 border border-teal-800/60">
                <span className="text-[10px] text-teal-300 uppercase tracking-wider block">{t('patient.yourToken')}</span>
                <strong className="text-lg font-mono tabular-nums text-white">#{upcoming[0].tokenNumber}</strong>
              </div>
              <div className="bg-slate-950/50 rounded-xl p-3 border border-teal-800/60">
                <span className="text-[10px] text-teal-300 uppercase tracking-wider block">{t('patient.nowServing')}</span>
                <strong className="text-lg font-mono tabular-nums text-teal-300">
                  {primaryMetrics.currentServing > 0 ? `#${primaryMetrics.currentServing}` : t('common.idle')}
                </strong>
              </div>
              <div className="bg-slate-950/50 rounded-xl p-3 border border-teal-800/60">
                <span className="text-[10px] text-teal-300 uppercase tracking-wider block">{t('patient.patientsAhead')}</span>
                <strong className="text-lg font-mono tabular-nums text-white">{primaryMetrics.patientsWaiting}</strong>
              </div>
              <div className="bg-slate-950/50 rounded-xl p-3 border border-teal-800/60">
                <span className="text-[10px] text-teal-300 uppercase tracking-wider block">{t('patient.estimatedWait')}</span>
                <strong className="text-lg font-mono tabular-nums text-amber-300">
                  {upcoming[0].status === 'IN CONSULTATION'
                    ? t('patient.inRoom')
                    : upcoming[0].status === 'CALLED'
                    ? t('patient.zeroMinCalled')
                    : `${primaryMetrics.estimatedWaitMinutes} ${t('common.min')}`}
                </strong>
              </div>
              <div className="bg-slate-950/50 rounded-xl p-3 border border-teal-800/60">
                <span className="text-[10px] text-teal-300 uppercase tracking-wider block">{t('patient.estTimeNotGuaranteed')}</span>
                <strong className="text-sm font-mono text-white block mt-1">
                  {primaryMetrics.estimatedTime}
                </strong>
              </div>
            </div>

            {/* Step-by-Step Lifecycle Progress */}
            <div className="bg-slate-950/40 rounded-xl p-4 border border-teal-800/50">
              <div className="grid grid-cols-4 gap-2 text-[10px] font-bold">
                {PROGRESS_STEPS.map((stepName, index) => {
                  const currentIdx = PROGRESS_STEPS.indexOf(
                    upcoming[0].status as (typeof PROGRESS_STEPS)[number]
                  );
                  const reached = currentIdx >= index;
                  const isCurrent = currentIdx === index;
                  return (
                    <div key={stepName} className="space-y-1.5 text-center">
                      <div
                        className={`h-1.5 rounded-full transition-colors ${
                          reached
                            ? isCurrent
                              ? 'bg-amber-400'
                              : 'bg-emerald-400'
                            : 'bg-slate-700'
                        }`}
                      />
                      <span
                        className={
                          isCurrent
                            ? 'text-amber-300 font-extrabold'
                            : reached
                            ? 'text-emerald-300'
                            : 'text-slate-400'
                        }
                      >
                        {translateTokenStatus(t, stepName)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-teal-200/80">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3 h-3" />
                {t('patient.disclaimerLine', { avg: primaryMetrics.avgMinutes })}
              </span>
              <span className="font-mono">{t('patient.autoSynced', { time: primaryMetrics.lastUpdated })}</span>
            </div>
          </div>
        </RevealSection>
      )}

      {/* Upcoming Appointments Timeline Grid */}
      <RevealSection direction="up" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            {t('patient.upcomingSectionTitle', { count: upcoming.length })}
          </h2>
          <span className="text-xs text-slate-500">{t('patient.readOnlyView')}</span>
        </div>

        {upcoming.length > 0 ? (
          <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {upcoming.map((appt) => {
              const qMetrics = getReadOnlyQueueMetrics(appt);
              return (
                <StaggerCard
                  key={appt.id}
                  className={`bg-white rounded-2xl border p-6 space-y-4 card-hover-effect shadow-xs ${
                    appt.status === 'CALLED'
                      ? 'border-emerald-400 ring-2 ring-emerald-500/20'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-md ${
                          appt.status === 'CALLED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : appt.status === 'IN CONSULTATION'
                            ? 'bg-teal-100 text-teal-800'
                            : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {translateTokenStatus(t, appt.status)}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-2.5">
                        {appt.targetTitle}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {translateDepartmentName(t, appt.departmentName)} · {appt.serviceType === 'doctor' ? t('patient.doctorOpdType') : t('patient.diagnosticType')}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">{t('patient.myToken')}</span>
                      <span className="text-2xl font-extrabold font-mono tabular-nums text-teal-700">
                        #{appt.tokenNumber}
                      </span>
                    </div>
                  </div>

                  {appt.status === 'CALLED' && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{t('patient.tokenCalledMsg')}</span>
                    </div>
                  )}

                  {/* Read-only Queue Metrics Row */}
                  <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block">{t('patient.servingNow')}</span>
                      <strong className="font-mono tabular-nums text-slate-900">
                        {qMetrics.currentServing > 0 ? `#${qMetrics.currentServing}` : t('common.idle')}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">{t('patient.aheadOfMe')}</span>
                      <strong className="font-mono tabular-nums text-slate-900">{qMetrics.patientsWaiting}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">{t('patient.estWaitApprox')}</span>
                      <strong className="font-mono tabular-nums text-amber-700">
                        {appt.status === 'IN CONSULTATION'
                          ? t('patient.inRoom')
                          : appt.status === 'CALLED'
                          ? t('patient.nowLabel')
                          : `${qMetrics.estimatedWaitMinutes} ${t('common.min')}`}
                      </strong>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{t('patient.appointmentId')}</span>
                      <span className="font-mono font-bold text-slate-800">{appt.id}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{t('patient.estimatedTimeLabel')}</span>
                      <span className="font-semibold text-teal-700 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {qMetrics.estimatedTime} {t('patient.estimateOnlySuffix')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{t('patient.queuePositionLabel')}</span>
                      <span className="font-semibold text-slate-800">{qMetrics.queuePositionLabel}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{t('patient.dateWindowLabel')}</span>
                      <span className="font-medium text-slate-800">{appt.date} · {appt.timeSlot}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => onTrackQueue(appt.tokenNumber, appt.targetId)}
                      className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
                    >
                      <span>{t('patient.viewLiveBoard')}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    {appt.status === 'WAITING' && (
                      <button
                        onClick={() => handleCancelAppointment(appt.id)}
                        className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                      >
                        {t('patient.cancelBooking')}
                      </button>
                    )}
                  </div>
                </StaggerCard>
              );
            })}
          </StaggerGrid>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">{t('patient.noUpcoming')}</p>
            <button
              onClick={onBookNew}
              className="text-xs font-bold text-teal-600 hover:text-teal-700 cursor-pointer underline"
            >
              {t('patient.bookFirst')}
            </button>
          </div>
        )}
      </RevealSection>

      {/* Consultation History Table */}
      <RevealSection direction="up" delay={0.05} className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          {t('patient.pastSectionTitle', { count: past.length })}
        </h2>

        {past.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4 font-bold">{t('patient.appointmentId').replace(':', '')}</th>
                    <th className="py-3.5 px-4 font-bold">{t('patient.doctorDiagnosticCol')}</th>
                    <th className="py-3.5 px-4 font-bold">{t('common.date')}</th>
                    <th className="py-3.5 px-4 font-bold">{t('patient.tokenHash')}</th>
                    <th className="py-3.5 px-4 font-bold">{t('common.status')}</th>
                    <th className="py-3.5 px-4 font-bold text-right">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {past.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{a.id}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{a.targetTitle}</div>
                        <div className="text-[11px] text-slate-400">{translateDepartmentName(t, a.departmentName)}</div>
                      </td>
                      <td className="py-3.5 px-4">{a.date}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-teal-700">#{a.tokenNumber}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            a.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : a.status === 'SKIPPED'
                              ? 'bg-slate-100 text-slate-700 border border-slate-300'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {translateTokenStatus(t, a.status)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onGiveFeedback(a.id)}
                          className="text-xs text-teal-700 hover:text-teal-800 font-bold cursor-pointer inline-flex items-center gap-1"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{t('patient.leaveFeedback')}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-400">
            {t('patient.noPastVisits')}
          </div>
        )}
      </RevealSection>
    </div>
  );
};
