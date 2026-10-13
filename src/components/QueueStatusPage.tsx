import React, { useState, useEffect } from 'react';
import { Department, Appointment, QueueState } from '../types';
import { getQueues, advanceQueue, getAppointments } from '../services/storageService';
import {
  Clock,
  Search,
  RefreshCw,
  Users,
  AlertCircle,
  CheckCircle2,
  Hourglass,
  ArrowRight,
  Volume2,
  Activity,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

interface QueueStatusPageProps {
  departments: Department[];
  initialSearchToken?: string;
  onNavigateBooking: () => void;
}

export const QueueStatusPage: React.FC<QueueStatusPageProps> = ({
  departments,
  initialSearchToken,
  onNavigateBooking,
}) => {
  const [queues, setQueues] = useState<Record<string, QueueState>>({});
  const [selectedDeptId, setSelectedDeptId] = useState<string>('dept-cardio');
  const [tokenInput, setTokenInput] = useState<string>(initialSearchToken || '29');
  const [searchedToken, setSearchedToken] = useState<number>(Number(initialSearchToken) || 29);
  const [matchedAppointment, setMatchedAppointment] = useState<Appointment | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [announcementMsg, setAnnouncementMsg] = useState<string | null>(null);
  const [tokenCallEffect, setTokenCallEffect] = useState(false);

  const loadData = () => {
    const qData = getQueues();
    setQueues(qData);

    const appts = getAppointments();
    const tokenNum = parseInt(tokenInput.replace(/\D/g, ''), 10);
    const found = appts.find(
      (a) => a.tokenNumber === tokenNum || a.id.toLowerCase() === tokenInput.trim().toLowerCase()
    );
    if (found) {
      setMatchedAppointment(found);
      const dept = departments.find(
        (d) => d.name.toLowerCase() === found.departmentName.toLowerCase()
      );
      if (dept) setSelectedDeptId(dept.id);
    } else {
      setMatchedAppointment(null);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(tokenInput.replace(/\D/g, ''), 10);
    if (!isNaN(num) && num > 0) {
      setSearchedToken(num);
    }
    loadData();
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      loadData();
      setIsRefreshing(false);
    }, 450);
  };

  const handleSimulateNext = () => {
    setTokenCallEffect(true);
    const updated = advanceQueue(selectedDeptId);
    setQueues((prev) => ({ ...prev, [selectedDeptId]: updated }));
    setAnnouncementMsg(`Chime: Token #${updated.currentServingToken} called to OPD Consultation Room.`);
    setTimeout(() => setTokenCallEffect(false), 800);
    setTimeout(() => setAnnouncementMsg(null), 4500);
  };

  const currentQueue = queues[selectedDeptId] || {
    departmentId: selectedDeptId,
    departmentName: 'Cardiology OPD',
    currentServingToken: 24,
    totalTokensToday: 35,
    estimatedMinutesPerPatient: 8,
    lastUpdated: 'Just now',
  };

  const activeDept = departments.find((d) => d.id === selectedDeptId);

  // Queue Math
  const currentToken = currentQueue.currentServingToken;
  const userToken = searchedToken;
  const patientsAhead = Math.max(0, userToken - currentToken);
  const estimatedWaitMinutes = patientsAhead * currentQueue.estimatedMinutesPerPatient;

  let queueStatusText = 'Waiting in Lounge';
  let queueStatusBadgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/30';

  if (userToken === currentToken) {
    queueStatusText = 'Now Serving (Please enter cabin)';
    queueStatusBadgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-400 font-bold';
  } else if (userToken < currentToken) {
    queueStatusText = 'Consultation Completed / Token Passed';
    queueStatusBadgeColor = 'bg-slate-700/60 text-slate-300 border-slate-600';
  } else if (patientsAhead === 1) {
    queueStatusText = 'Next in Line (Prepare at door)';
    queueStatusBadgeColor = 'bg-teal-500/20 text-teal-300 border-teal-400 font-semibold';
  }

  const progressPercentage = Math.min(
    100,
    Math.max(5, (currentToken / Math.max(1, currentQueue.totalTokensToday)) * 100)
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="space-y-2">
          <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">
            Real-Time Patient Flow
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Live OPD Waiting Room &amp; Token Tracker
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
            Monitor hospital digital display boards in real time. Track token movement, counter announcements, and queue position from your device.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer hover:shadow-sm"
          >
            <RefreshCw
              className={`w-4 h-4 text-teal-600 transition-transform duration-500 ${
                isRefreshing ? 'animate-spin' : ''
              }`}
            />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {/* Public Address Audio Announcement Banner */}
      {announcementMsg && (
        <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-teal-100 px-5 py-3.5 rounded-2xl flex items-center justify-between shadow-md border border-teal-700 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3 text-xs font-semibold">
            <Volume2 className="w-5 h-5 text-teal-300 animate-bounce shrink-0" />
            <span>{announcementMsg}</span>
          </div>
          <span className="text-[10px] text-teal-300 uppercase tracking-widest font-mono bg-teal-950/60 px-2 py-1 rounded">
            Waiting Hall Broadcast
          </span>
        </div>
      )}

      {/* Controls: Department Selector & Token Search */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Department tabs */}
        <div className="md:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-xs">
          <label className="text-xs font-bold text-slate-700 block">
            Select OPD Department Counter:
          </label>
          <div className="flex flex-wrap gap-2">
            {departments.map((dept) => {
              const q = queues[dept.id];
              const isSelected = selectedDeptId === dept.id;
              return (
                <button
                  key={dept.id}
                  onClick={() => setSelectedDeptId(dept.id)}
                  className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{dept.name}</span>
                  {q && (
                    <span className="text-[10px] font-mono opacity-80 bg-white/20 px-1.5 py-0.5 rounded">
                      #{q.currentServingToken}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Token Search Input */}
        <form
          onSubmit={handleSearch}
          className="md:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between space-y-2 shadow-xs"
        >
          <label className="text-xs font-bold text-slate-700 block">
            Enter Your Token Number / ID:
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="e.g. 29 or CP-2026-1021"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
            >
              Track
            </button>
          </div>
        </form>
      </div>

      {/* Main Digital Waiting-Room Display Board (High Visual Polish) */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
        {/* Top Digital Board Header */}
        <div className="px-6 sm:px-8 py-5 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span>{currentQueue.departmentName || activeDept?.name}</span>
                <span className="text-xs font-mono text-teal-400 font-normal">
                  ({activeDept?.roomNumber || 'Room 102'})
                </span>
              </h2>
              <span className="text-xs text-slate-400">
                Pace: ~{currentQueue.estimatedMinutesPerPatient} mins per consultation
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-400">
              Synced: {currentQueue.lastUpdated}
            </span>
            <button
              onClick={handleSimulateNext}
              className="px-3.5 py-1.5 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              title="Advances queue counter to test real-time update"
            >
              <span>Call Next Token &rarr;</span>
            </button>
          </div>
        </div>

        {/* 4 Large Highlighted Digital Number Metric Blocks */}
        <div className="p-6 sm:p-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 border-b border-slate-800/60">
          {/* 1. CURRENT TOKEN */}
          <div
            className={`rounded-2xl p-6 text-center border transition-all duration-300 ${
              tokenCallEffect
                ? 'bg-teal-500/30 border-teal-300 scale-102'
                : 'bg-teal-950/40 border-teal-500/30'
            }`}
          >
            <span className="text-xs font-bold text-teal-400 uppercase tracking-widest block">
              CURRENT TOKEN
            </span>
            <div className="text-5xl sm:text-6xl font-extrabold font-mono text-teal-300 mt-2 tracking-tight">
              #{currentToken}
            </div>
            <p className="text-xs text-teal-200/80 mt-2 font-medium">Inside doctor cabin</p>
          </div>

          {/* 2. YOUR TOKEN */}
          <div className="bg-slate-900/60 rounded-2xl p-6 text-center border border-slate-700/60">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
              YOUR TOKEN
            </span>
            <div className="text-5xl sm:text-6xl font-extrabold font-mono text-white mt-2 tracking-tight">
              #{userToken}
            </div>
            <p className="text-xs text-slate-400 mt-2 truncate">
              {matchedAppointment ? matchedAppointment.patientName : 'Registered Patient'}
            </p>
          </div>

          {/* 3. PATIENTS AHEAD */}
          <div className="bg-slate-900/60 rounded-2xl p-6 text-center border border-slate-700/60">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
              PATIENTS AHEAD
            </span>
            <div className="text-5xl sm:text-6xl font-extrabold font-mono text-cyan-300 mt-2 tracking-tight">
              {patientsAhead}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {patientsAhead === 0 ? 'Your turn is called!' : 'Patients before you'}
            </p>
          </div>

          {/* 4. ESTIMATED WAIT */}
          <div className="bg-amber-950/30 rounded-2xl p-6 text-center border border-amber-500/30">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">
              ESTIMATED WAIT
            </span>
            <div className="text-5xl sm:text-6xl font-extrabold font-mono text-amber-300 mt-2 tracking-tight">
              {patientsAhead === 0 ? '0' : estimatedWaitMinutes}
              <span className="text-xl font-normal ml-1">min</span>
            </div>
            <p className="text-xs text-amber-200/80 mt-2 font-medium">Dynamic estimate</p>
          </div>
        </div>

        {/* Animated Visual Progress Bar & Status */}
        <div className="p-6 sm:p-10 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
                Queue State for Token #{userToken}
              </span>
              <div className="text-base font-bold text-white mt-0.5">
                {queueStatusText}
              </div>
            </div>

            <div className={`px-4 py-1.5 rounded-full text-xs border ${queueStatusBadgeColor}`}>
              {queueStatusText}
            </div>
          </div>

          {/* Animated Queue Progression Bar */}
          <div className="space-y-2.5">
            <div className="flex justify-between text-xs text-slate-400 font-mono">
              <span>Token #1</span>
              <span className="text-teal-400 font-bold">Serving #{currentToken}</span>
              <span>Your Token #{userToken}</span>
              <span>Total Cap #{currentQueue.totalTokensToday}</span>
            </div>

            <div className="w-full h-3.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 rounded-full transition-all duration-700 relative"
                style={{ width: `${progressPercentage}%` }}
              >
                <div className="absolute right-0 top-0 bottom-0 w-2 bg-white rounded-full animate-ping" />
              </div>
            </div>
          </div>

          {/* Explicit Clinical Disclaimer */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-200/90">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong>Important Notice:</strong> Estimated waiting time — subject to change based on patient medical complexity and emergency triage protocols.
            </div>
          </div>
        </div>
      </div>

      {/* Matched appointment card if found */}
      {matchedAppointment && (
        <div className="bg-white rounded-2xl border border-teal-200 p-6 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
              Linked Patient Token Record
            </span>
            <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
              {matchedAppointment.id}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-slate-700 pt-1">
            <div>
              <span className="text-slate-400 block text-[11px]">Patient Name</span>
              <strong className="text-slate-900 text-sm">{matchedAppointment.patientName}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Consultant / Service</span>
              <strong className="text-teal-800">{matchedAppointment.targetTitle}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Time Window</span>
              <span>{matchedAppointment.timeSlot}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Reason for Visit</span>
              <span className="truncate block text-slate-600">{matchedAppointment.reason}</span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Booking Callout */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Need another consultation or diagnostic slot?</h4>
          <p className="text-xs text-slate-500 mt-0.5">Instant booking with digital token generation.</p>
        </div>
        <button
          onClick={onNavigateBooking}
          className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
        >
          Book New Consultation Slot &rarr;
        </button>
      </div>
    </div>
  );
};
