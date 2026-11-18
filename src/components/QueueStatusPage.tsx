import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import {
  Department,
  Doctor,
  Appointment,
  DoctorQueueState,
  UserSession,
} from '../types';
import {
  getDoctorQueues,
  getAppointments,
  getDoctors,
  syncFromServer,
} from '../services/storageService';
import { calculateQueueForTarget, normalizeTokenStatus } from '../services/queueEstimator';
import { translateDepartmentName, translateTokenStatus } from '../i18n';
import {
  APPLE_EASE,
  SPRING_GENTLE,
  RevealSection,
  AnimatedCounter,
} from './MotionPrimitives';
import {
  Search,
  RefreshCw,
  AlertCircle,
  BellRing,
  Clock,
} from 'lucide-react';

interface QueueStatusPageProps {
  departments: Department[];
  doctors?: Doctor[];
  appointments?: Appointment[];
  doctorQueues?: Record<string, DoctorQueueState>;
  session?: UserSession | null;
  initialSearchToken?: string;
  initialTargetId?: string;
  onNavigateBooking: () => void;
  onQueueUpdated?: () => void;
}

export const QueueStatusPage: React.FC<QueueStatusPageProps> = ({
  departments,
  doctors: propDoctors,
  appointments: propAppointments,
  doctorQueues: propDoctorQueues,
  initialSearchToken,
  initialTargetId,
  onNavigateBooking,
  onQueueUpdated,
}) => {
  const { t } = useTranslation();
  const [doctorsList, setDoctorsList] = useState<Doctor[]>(propDoctors || getDoctors());
  const [doctorQueuesMap, setDoctorQueuesMap] = useState<Record<string, DoctorQueueState>>(
    propDoctorQueues || getDoctorQueues()
  );
  const [appointmentsList, setAppointmentsList] = useState<Appointment[]>(
    propAppointments || getAppointments()
  );

  const [selectedDeptId, setSelectedDeptId] = useState<string>('dept-cardio');
  const [selectedTargetId, setSelectedTargetId] = useState<string>(initialTargetId || 'doc-1');
  const [tokenInput, setTokenInput] = useState<string>(initialSearchToken || '27');
  const [searchedToken, setSearchedToken] = useState<number>(Number(initialSearchToken) || 27);
  const [matchedAppointment, setMatchedAppointment] = useState<Appointment | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Sync whenever parent state changes (via SSE / BroadcastChannel)
  useEffect(() => {
    if (propDoctors) setDoctorsList(propDoctors);
    if (propDoctorQueues) setDoctorQueuesMap(propDoctorQueues);
    if (propAppointments) setAppointmentsList(propAppointments);
  }, [propDoctors, propDoctorQueues, propAppointments]);

  //Periodic 15s tick for smooth remaining consultation countdown
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  const resolveMatch = (
    input: string,
    appts: Appointment[],
    targetIdFilter?: string
  ) => {
    const trimmed = input.trim();
    const tokenNum = parseInt(trimmed.replace(/\D/g, ''), 10);

    // Prefer exact Appointment ID match first
    const byId = appts.find((a) => a.id.toLowerCase() === trimmed.toLowerCase());
    if (byId) return byId;

    if (!isNaN(tokenNum) && tokenNum > 0) {
      // Check currently selected doctor's queue first, then fall back across all queues
      if (targetIdFilter) {
        const sameTarget = appts.find(
          (a) =>
            (a.targetId === targetIdFilter || a.doctorId === targetIdFilter) &&
            a.tokenNumber === tokenNum
        );
        if (sameTarget) return sameTarget;
      }
      return appts.find((a) => a.tokenNumber === tokenNum) || null;
    }
    return null;
  };

  useEffect(() => {
    const found = resolveMatch(tokenInput, appointmentsList, selectedTargetId);
    setMatchedAppointment(found);
    if (found) {
      setSelectedTargetId(found.targetId);
      const doc = doctorsList.find((d) => d.id === found.targetId);
      if (doc) setSelectedDeptId(doc.departmentId);
    }
  }, [appointmentsList]);

  useEffect(() => {
    if (initialSearchToken) {
      setTokenInput(initialSearchToken);
      const num = parseInt(initialSearchToken.replace(/\D/g, ''), 10);
      if (!isNaN(num) && num > 0) setSearchedToken(num);
      const found = resolveMatch(initialSearchToken, appointmentsList, initialTargetId || selectedTargetId);
      if (found) {
        setMatchedAppointment(found);
        setSelectedTargetId(found.targetId);
        const doc = doctorsList.find((d) => d.id === found.targetId);
        if (doc) setSelectedDeptId(doc.departmentId);
      }
    }
    if (initialTargetId) {
      setSelectedTargetId(initialTargetId);
    }
  }, [initialSearchToken, initialTargetId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(tokenInput.replace(/\D/g, ''), 10);
    if (!isNaN(num) && num > 0) {
      setSearchedToken(num);
    }
    const found = resolveMatch(tokenInput, appointmentsList, selectedTargetId);
    setMatchedAppointment(found);
    if (found) {
      setSelectedTargetId(found.targetId);
      const doc = doctorsList.find((d) => d.id === found.targetId);
      if (doc) setSelectedDeptId(doc.departmentId);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await syncFromServer();
    setDoctorsList(getDoctors());
    setDoctorQueuesMap(getDoctorQueues());
    setAppointmentsList(getAppointments());
    setNowMs(Date.now());
    onQueueUpdated?.();
    setTimeout(() => setIsRefreshing(false), 350);
  };

  const activeDoctor =
    doctorsList.find((d) => d.id === selectedTargetId) ||
    doctorsList.find((d) => d.departmentId === selectedDeptId) ||
    doctorsList[0];

  const activeTargetId = activeDoctor?.id || selectedTargetId;
  const cachedDq = doctorQueuesMap[activeTargetId];

  const calc = calculateQueueForTarget({
    targetId: activeTargetId,
    targetName: activeDoctor?.name || cachedDq?.targetName || 'Doctor OPD',
    departmentId: activeDoctor?.departmentId || selectedDeptId,
    departmentName: activeDoctor?.departmentName || cachedDq?.departmentName || 'OPD',
    serviceType: cachedDq?.serviceType || 'doctor',
    configuredAvgMinutes: activeDoctor?.avgConsultationMinutes ?? cachedDq?.avgConsultationMinutes ?? 10,
    avgOverride: activeDoctor?.avgConsultationOverride,
    isAvailable: activeDoctor?.isAvailableToday ?? true,
    appointments: appointmentsList,
    nowMs,
  });

  const liveQueue = calc.queueState;
  const activeDept = departments.find((d) => d.id === liveQueue.departmentId);

  const deptDoctors = doctorsList.filter((d) => d.departmentId === selectedDeptId);

  // Determine metrics for tracked token
  const trackedAppt =
    matchedAppointment && matchedAppointment.targetId === activeTargetId
      ? calc.updatedAppointments.find((a) => a.id === matchedAppointment.id) || matchedAppointment
      : calc.updatedAppointments.find((a) => a.tokenNumber === searchedToken) || null;

  const userToken = trackedAppt ? trackedAppt.tokenNumber : searchedToken;
  const trackedStatus = trackedAppt ? normalizeTokenStatus(trackedAppt.status) : null;
  const currentToken = liveQueue.currentServingToken;

  let patientsAhead = 0;
  let estimatedWaitMinutes = 0;
  let estimatedTimeLabel = '—';

  if (trackedAppt) {
    patientsAhead = trackedAppt.patientsAhead ?? 0;
    estimatedWaitMinutes = trackedAppt.estimatedWaitMinutes ?? 0;
    estimatedTimeLabel = trackedAppt.estimatedTime || '—';
  } else if (userToken > currentToken) {
    // Fallback if searching an unregistered walk-in token number
    const waitingSmaller = calc.updatedAppointments.filter(
      (a) => a.status === 'WAITING' && a.tokenNumber < userToken
    ).length;
    patientsAhead = Math.max(waitingSmaller, Math.max(0, userToken - Math.max(currentToken, 0) - 1));
    estimatedWaitMinutes =
      liveQueue.remainingCurrentMinutes + patientsAhead * liveQueue.avgConsultationMinutes;
  }

  let queueStatusText = t('queue.states.waiting');
  let queueStatusBadgeColor = 'bg-amber-500/10 text-amber-300 border-amber-500/30';

  if (trackedStatus === 'CALLED') {
    queueStatusText = t('queue.states.called');
    queueStatusBadgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-400 font-bold';
  } else if (trackedStatus === 'IN CONSULTATION') {
    queueStatusText = t('queue.states.inConsultation');
    queueStatusBadgeColor = 'bg-teal-500/20 text-teal-300 border-teal-400 font-bold';
  } else if (trackedStatus === 'COMPLETED') {
    queueStatusText = t('queue.states.completed');
    queueStatusBadgeColor = 'bg-slate-700/60 text-slate-300 border-slate-600';
  } else if (trackedStatus === 'SKIPPED') {
    queueStatusText = t('queue.states.skipped');
    queueStatusBadgeColor = 'bg-slate-700/60 text-slate-300 border-slate-600';
  } else if (trackedStatus === 'CANCELLED') {
    queueStatusText = t('queue.states.cancelled');
    queueStatusBadgeColor = 'bg-rose-500/20 text-rose-300 border-rose-400';
  } else if (patientsAhead === 0 && currentToken === 0) {
    queueStatusText = t('queue.states.nextReady');
    queueStatusBadgeColor = 'bg-teal-500/20 text-teal-300 border-teal-400 font-semibold';
  } else if (patientsAhead === 0) {
    queueStatusText = t('queue.states.nextDoor');
    queueStatusBadgeColor = 'bg-teal-500/20 text-teal-300 border-teal-400 font-semibold';
  }

  const progressPercentage = Math.min(
    100,
    Math.max(
      8,
      liveQueue.totalTokensToday > 0
        ? (Math.max(1, currentToken) / liveQueue.totalTokensToday) * 100
        : 10
    )
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <RevealSection direction="up">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200">
          <div className="space-y-2">
            <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">
              {t('queue.eyebrow')}
            </span>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {t('queue.title')}
            </h1>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              {t('queue.subtitle')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer hover:shadow-sm btn-interactive"
            >
              <RefreshCw
                className={`w-4 h-4 text-teal-600 transition-transform duration-500 ${
                  isRefreshing ? 'animate-spin' : ''
                }`}
              />
              <span>{t('queue.refreshQueue')}</span>
            </button>
          </div>
        </div>
      </RevealSection>

      {/* Controls: Department & Doctor Selector + Token Search */}
      <RevealSection direction="up" delay={0.05}>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Department & Doctor selector */}
          <div className="md:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-xs">
            <label className="text-xs font-bold text-slate-700 block">
              {t('queue.selectDeptDoctor')}
            </label>
            <div className="flex flex-wrap gap-2">
              {departments.map((dept) => {
                const isSelected = selectedDeptId === dept.id;
                return (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => {
                      setSelectedDeptId(dept.id);
                      const firstDoc = doctorsList.find((d) => d.departmentId === dept.id);
                      if (firstDoc) setSelectedTargetId(firstDoc.id);
                    }}
                    className={`relative px-3.5 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {isSelected && (
                      <motion.span
                        layoutId="queue-dept-pill"
                        transition={SPRING_GENTLE}
                        className="absolute inset-0 bg-slate-900 rounded-xl shadow-sm"
                      />
                    )}
                    <span className="relative z-10">{translateDepartmentName(t, dept.name)}</span>
                  </button>
                );
              })}
            </div>

            {deptDoctors.length > 0 && (
              <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
                {deptDoctors.map((doc) => {
                  const dq = doctorQueuesMap[doc.id];
                  const isDocSelected = activeTargetId === doc.id;
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setSelectedTargetId(doc.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                        isDocSelected
                          ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>{doc.name}</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          isDocSelected ? 'bg-white/20 text-white' : 'bg-white text-teal-700'
                        }`}
                      >
                        {dq?.currentServingToken ? `#${dq.currentServingToken}` : t('common.idle')} · {t('queue.waitingShort', { count: dq?.waitingCount ?? 0 })}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Token Search Input */}
          <form
            onSubmit={handleSearch}
            className="md:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between space-y-2 shadow-xs"
          >
            <label className="text-xs font-bold text-slate-700 block">
              {t('queue.enterTokenLabel')}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder={t('queue.tokenPlaceholder')}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer shrink-0 btn-interactive"
              >
                {t('queue.trackBtn')}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              {t('queue.autoStreamHint')}
            </p>
          </form>
        </div>
      </RevealSection>

      {/* Token Called High-Priority Alert */}
      {trackedStatus === 'CALLED' && (
        <RevealSection direction="up">
          <div className="bg-emerald-600 text-white rounded-2xl p-5 shadow-lg border border-emerald-400 flex items-center gap-3">
            <BellRing className="w-6 h-6 shrink-0 animate-bounce" />
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-emerald-100 font-bold">
                {t('queue.tokenCalledBannerTitle', { token: userToken })}
              </div>
              <div className="text-sm sm:text-base font-extrabold">
                {t('queue.tokenCalledBannerBody', { room: activeDoctor?.roomNumber || activeDept?.roomNumber || 'OPD' })}
              </div>
            </div>
          </div>
        </RevealSection>
      )}

      {/* Main Digital Waiting-Room Display Board */}
      <RevealSection direction="scale" delay={0.08}>
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
          {/* Top Digital Board Header */}
          <div className="px-6 sm:px-8 py-5 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  liveQueue.isAvailable ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                }`}
              />
              <div>
                <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                  <span>{liveQueue.targetName}</span>
                  <span className="text-xs font-mono text-teal-400 font-normal">
                    ({translateDepartmentName(t, liveQueue.departmentName)} · {activeDoctor?.roomNumber || activeDept?.roomNumber || 'OPD'})
                  </span>
                </h2>
                <span className="text-xs text-slate-400">
                  {t('queue.avgConsultSummary', { mins: liveQueue.avgConsultationMinutes })}{' '}
                  {liveQueue.isAvailable
                    ? t('queue.waitingPatientsCount', { count: liveQueue.waitingCount })
                    : t('queue.doctorUnavailable')}
                </span>
              </div>
            </div>
          </div>

          {/* 4 Large Highlighted Digital Number Metric Blocks */}
          <div className="p-6 sm:p-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 border-b border-slate-800/60">
            {/* 1. CURRENT TOKEN */}
            <div className="rounded-2xl p-6 text-center border transition-all duration-300 bg-teal-950/40 border-teal-500/30">
              <span className="text-xs font-bold text-teal-400 uppercase tracking-widest block">
                {t('queue.currentTokenTitle')}
              </span>
              <div className="text-5xl sm:text-6xl font-extrabold font-mono tabular-nums text-teal-300 mt-2 tracking-tight">
                {currentToken > 0 ? <AnimatedCounter prefix="#" value={currentToken} /> : '—'}
              </div>
              <p className="text-xs text-teal-200/80 mt-2 font-medium">
                {liveQueue.activeStatus
                  ? t('queue.activeRemaining', {
                      status: translateTokenStatus(t, liveQueue.activeStatus),
                      mins: liveQueue.remainingCurrentMinutes,
                    })
                  : t('queue.cabinReady')}
              </p>
            </div>

            {/* 2. YOUR TOKEN */}
            <div className="bg-slate-900/60 rounded-2xl p-6 text-center border border-slate-700/60">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
                {t('queue.yourTokenTitle')}
              </span>
              <div className="text-5xl sm:text-6xl font-extrabold font-mono tabular-nums text-white mt-2 tracking-tight">
                <AnimatedCounter prefix="#" value={userToken} />
              </div>
              <p className="text-xs text-slate-400 mt-2 truncate">
                {trackedAppt ? trackedAppt.patientName : t('queue.lookupToken')}
              </p>
            </div>

            {/* 3. PATIENTS AHEAD */}
            <div className="bg-slate-900/60 rounded-2xl p-6 text-center border border-slate-700/60">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
                {t('queue.patientsAheadTitle')}
              </span>
              <div className="text-5xl sm:text-6xl font-extrabold font-mono tabular-nums text-cyan-300 mt-2 tracking-tight">
                <AnimatedCounter value={patientsAhead} />
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {trackedStatus === 'CALLED'
                  ? t('queue.proceedToRoom')
                  : trackedStatus === 'IN CONSULTATION'
                  ? t('queue.currentlyInside')
                  : patientsAhead === 0
                  ? t('queue.nextWhenCalled')
                  : t('queue.eligibleWaitingAhead')}
              </p>
            </div>

            {/* 4. ESTIMATED WAIT */}
            <div className="bg-amber-950/30 rounded-2xl p-6 text-center border border-amber-500/30">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">
                {t('queue.estimatedWaitTitle')}
              </span>
              <div className="text-5xl sm:text-6xl font-extrabold font-mono tabular-nums text-amber-300 mt-2 tracking-tight">
                <AnimatedCounter value={estimatedWaitMinutes} />
                <span className="text-xl font-normal ml-1">{t('common.min')}</span>
              </div>
              <p className="text-xs text-amber-200/80 mt-2 font-medium flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{t('queue.estNotGuaranteed', { time: estimatedTimeLabel })}</span>
              </p>
            </div>
          </div>

          {/* Animated Visual Progress Bar & Status */}
          <div className="p-6 sm:p-10 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div>
                <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
                  {t('queue.queueStateForToken', { token: userToken })}{' '}
                  {trackedStatus ? `· ${translateTokenStatus(t, trackedStatus)}` : ''}
                </span>
                <div className="text-base font-bold text-white mt-0.5">
                  {queueStatusText}
                </div>
              </div>

              <div className={`px-4 py-1.5 rounded-full text-xs border ${queueStatusBadgeColor}`}>
                {trackedStatus ? translateTokenStatus(t, trackedStatus) : t('queue.liveTracking')}
              </div>
            </div>

            {/* Animated Queue Progression Bar */}
            <div className="space-y-2.5">
              <div className="flex justify-between text-xs text-slate-400 font-mono">
                <span>{t('queue.queueStart')}</span>
                <span className="text-teal-400 font-bold">
                  {t('queue.servingLabel', { token: currentToken > 0 ? `#${currentToken}` : t('common.idle') })}
                </span>
                <span>{t('queue.yourTokenLine', { token: userToken })}</span>
                <span>{t('queue.totalIssued', { total: liveQueue.totalTokensToday })}</span>
              </div>

              <div className="w-full h-3.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                <motion.div
                  initial={{ width: '8%' }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 0.75, ease: APPLE_EASE }}
                  className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 rounded-full relative"
                >
                  <div className="absolute right-0 top-0 bottom-0 w-2 bg-white rounded-full animate-ping" />
                </motion.div>
              </div>
            </div>

            {/* Explicit Clinical Disclaimer */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-200/90">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>{t('queue.waitNoticeTitle')}</strong>{' '}
                {t('queue.waitNoticeBody', {
                  wait: estimatedWaitMinutes,
                  rem: liveQueue.remainingCurrentMinutes,
                  ahead: patientsAhead,
                  avg: liveQueue.avgConsultationMinutes,
                })}
              </div>
            </div>
          </div>
        </div>
      </RevealSection>

      {/* Matched appointment card if found */}
      {trackedAppt && (
        <RevealSection direction="up">
          <div className="bg-white rounded-2xl border border-teal-200 p-6 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
                {t('queue.linkedRecordHeader', { status: translateTokenStatus(t, trackedAppt.status) })}
              </span>
              <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                {trackedAppt.id}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-slate-700 pt-1">
              <div>
                <span className="text-slate-400 block text-[11px]">{t('queue.patientName')}</span>
                <strong className="text-slate-900 text-sm">{trackedAppt.patientName}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">{t('queue.consultantService')}</span>
                <strong className="text-teal-800">{trackedAppt.targetTitle}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">{t('queue.estimatedTime')}</span>
                <span className="font-semibold">{trackedAppt.estimatedTime || trackedAppt.timeSlot}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">{t('queue.reasonForVisit')}</span>
                <span className="truncate block text-slate-600">{trackedAppt.reason}</span>
              </div>
            </div>
          </div>
        </RevealSection>
      )}

      {/* Quick Booking Callout */}
      <RevealSection direction="up" delay={0.05}>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
          <div>
            <h4 className="text-sm font-bold text-slate-900">{t('queue.calloutTitle')}</h4>
            <p className="text-xs text-slate-500 mt-0.5">{t('queue.calloutSubtitle')}</p>
          </div>
          <button
            onClick={onNavigateBooking}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer shrink-0 btn-interactive"
          >
            {t('queue.bookNewSlot')}
          </button>
        </div>
      </RevealSection>
    </div>
  );
};
