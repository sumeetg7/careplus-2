import React, { useState } from 'react';
import { Department, Doctor, DiagnosticService, QueueState } from '../types';
import {
  HERO_IMAGE,
  DIAGNOSTIC_IMAGE,
  DR_SHARMA_IMAGE,
  DR_ARJUN_IMAGE,
} from '../data/initialData';
import {
  Calendar,
  Clock,
  Search,
  Activity,
  ShieldCheck,
  HeartPulse,
  Brain,
  Bone,
  Eye,
  Stethoscope,
  ArrowRight,
  PhoneCall,
  UserCheck,
  Star,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Users,
} from 'lucide-react';

interface HomePageProps {
  departments: Department[];
  doctors: Doctor[];
  diagnostics: DiagnosticService[];
  queues: Record<string, QueueState>;
  onNavigate: (tab: string, state?: any) => void;
  onBookDoctor: (doctor: Doctor) => void;
  onBookDiagnostic: (service: DiagnosticService) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  departments,
  doctors,
  diagnostics,
  queues,
  onNavigate,
  onBookDoctor,
  onBookDiagnostic,
}) => {
  const [quickTokenSearch, setQuickTokenSearch] = useState('');

  const getDeptIcon = (code: string) => {
    switch (code) {
      case 'CARD':
        return <HeartPulse className="w-6 h-6 text-rose-500" />;
      case 'NEUR':
        return <Brain className="w-6 h-6 text-indigo-500" />;
      case 'ORTH':
        return <Bone className="w-6 h-6 text-amber-500" />;
      case 'OPHT':
        return <Eye className="w-6 h-6 text-sky-500" />;
      case 'GMED':
      default:
        return <Stethoscope className="w-6 h-6 text-teal-600" />;
    }
  };

  const handleQuickTokenTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickTokenSearch.trim()) {
      onNavigate('queue', { searchToken: quickTokenSearch.trim() });
    } else {
      onNavigate('queue');
    }
  };

  return (
    <div className="space-y-16 pb-16 animate-page-enter">
      {/* Premium Hero Section with Animated Shapes & Floating Doctor Preview */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 text-white min-h-[580px] flex items-center">
        {/* Subtle Ambient Background Gradient Orbs */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-teal-500/15 rounded-full blur-3xl pointer-events-none animate-float-slow" />
        <div className="absolute bottom-10 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none animate-float-reverse" />
        <div className="absolute top-10 right-1/4 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Subtle Grid Backdrop Pattern */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '28px 28px',
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left 7 Cols: Value Proposition */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs font-semibold backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
                <span>Central Hospital Information &amp; OPD Management</span>
              </div>

              <div className="space-y-3">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
                  Better Care.<br />
                  <span className="bg-gradient-to-r from-teal-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
                    Easier Access.
                  </span>
                </h1>
                <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal max-w-xl">
                  Find doctors, explore diagnostic services, book appointments and track your queue — all in one place.
                </p>
              </div>

              {/* Animated Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-3">
                <button
                  onClick={() => onNavigate('doctors')}
                  className="px-6 py-3.5 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-teal-900/30 hover:shadow-teal-500/25 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer flex items-center gap-2"
                >
                  <Search className="w-4 h-4 text-slate-950" />
                  <span>Find a Doctor</span>
                </button>

                <button
                  onClick={() => onNavigate('appointments')}
                  className="px-6 py-3.5 bg-white/10 hover:bg-white/15 text-white border border-white/20 hover:border-white/30 font-semibold text-sm rounded-xl backdrop-blur-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4 text-teal-300" />
                  <span>Book Appointment</span>
                </button>

                <button
                  onClick={() => onNavigate('queue')}
                  className="px-4 py-3.5 text-xs text-slate-300 hover:text-white font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Clock className="w-4 h-4 text-teal-400" />
                  <span>Live Queue Status</span>
                </button>
              </div>

              {/* Real-time Stats Grid */}
              <div className="pt-8 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-6">
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-white font-mono tabular-nums">5</div>
                  <div className="text-xs text-slate-400 mt-0.5">Specialized OPDs</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-teal-400 font-mono tabular-nums">10+</div>
                  <div className="text-xs text-slate-400 mt-0.5">Senior Specialists</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-white font-mono tabular-nums">6</div>
                  <div className="text-xs text-slate-400 mt-0.5">Diagnostic Suites</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono tabular-nums">0 min</div>
                  <div className="text-xs text-slate-400 mt-0.5">Waiting Anxiety</div>
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Floating Visual Card with Smooth Animation */}
            <div className="lg:col-span-5 relative flex justify-center">
              <div className="relative w-full max-w-md animate-float-slow">
                {/* Background Glow */}
                <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-3xl blur-xl opacity-25" />

                {/* Card Container */}
                <div className="relative bg-slate-900/90 border border-slate-700/80 rounded-2xl p-6 shadow-2xl backdrop-blur-xl space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-mono font-bold text-sm border border-teal-500/30">
                        OPD
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Live OPD Status</h4>
                        <span className="text-[11px] text-teal-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping"></span>
                          Hospital Central Screen
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-slate-400">Cardiology #102</span>
                  </div>

                  {/* Highlight Doctor Avatar */}
                  <div className="flex items-center gap-4 bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60">
                    <img
                      src={DR_SHARMA_IMAGE}
                      alt="Dr. Ananya Sharma"
                      referrerPolicy="no-referrer"
                      className="w-13 h-13 rounded-xl object-cover border border-teal-500/40 shadow-sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">
                          In Cabin Now
                        </span>
                      </div>
                      <div className="text-sm font-bold text-white truncate">Dr. Ananya Sharma</div>
                      <div className="text-xs text-slate-400 truncate">Cardiology Specialist</div>
                    </div>
                  </div>

                  {/* Token Status Display */}
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                      <span className="text-[11px] text-slate-400 block uppercase">Now Calling</span>
                      <span className="text-3xl font-extrabold font-mono text-teal-400 mt-1 block">
                        #24
                      </span>
                    </div>
                    <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                      <span className="text-[11px] text-slate-400 block uppercase">Next In Line</span>
                      <span className="text-3xl font-extrabold font-mono text-slate-200 mt-1 block">
                        #25
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <span>Average Duration: 8 mins</span>
                    <button
                      onClick={() => onNavigate('queue')}
                      className="text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <span>Check Your Token</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Glassmorphic Quick Token Search Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl shadow-slate-900/5 border border-slate-200/90 p-5 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          <div className="md:col-span-5">
            <span className="text-xs font-bold text-teal-700 uppercase tracking-wider block mb-1">
              Have an appointment today?
            </span>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Check Your Real-Time Queue &amp; Token
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your token number or Appointment ID to see live patients ahead of you.
            </p>
          </div>

          <form onSubmit={handleQuickTokenTrack} className="md:col-span-7 flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Enter Token (e.g. 24) or ID (e.g. CP-2026-1021)"
                value={quickTokenSearch}
                onChange={(e) => setQuickTokenSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer shrink-0 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-1.5"
            >
              <span>Track Token</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </section>

      {/* 2. Interactive Department Cards with Smooth Hover & Scale */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">
              Clinical Specializations
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">
              Hospital Departments
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Experienced medical leadership and dedicated outpatient units across 5 core faculties.
            </p>
          </div>
          <button
            onClick={() => onNavigate('departments')}
            className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer transition-colors group"
          >
            <span>Explore All 5 Departments</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((dept) => {
            const queueInfo = queues[dept.id];
            return (
              <div
                key={dept.id}
                className="group bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between card-hover-effect cursor-pointer"
                onClick={() => onNavigate('doctors', { departmentId: dept.id })}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:scale-110 group-hover:bg-teal-50 transition-all duration-300">
                      {getDeptIcon(dept.code)}
                    </div>
                    {queueInfo && (
                      <span className="text-xs text-slate-500 font-mono bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                        Now: <strong className="text-teal-700 font-bold">#{queueInfo.currentServingToken}</strong>
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                    {dept.name}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed mt-2 mb-4 line-clamp-2">
                    {dept.description}
                  </p>

                  <div className="text-xs text-slate-500 space-y-1 mb-4">
                    <div>
                      Department Lead: <strong className="text-slate-800 font-medium">{dept.headDoctor}</strong>
                    </div>
                    <div>
                      Location: <span className="text-slate-700">{dept.roomNumber}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    {dept.doctorCount} Doctors Available
                  </span>
                  <span className="text-xs font-bold text-teal-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    <span>View Doctors</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Featured Doctors with Animated Pulsing Availability */}
      <section className="bg-slate-100/60 py-16 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">
                Consulting Specialists
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">
                Senior Outpatient Physicians
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Transparent information with clinical credentials, timings, and fees for informed choices.
              </p>
            </div>
            <button
              onClick={() => onNavigate('doctors')}
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer transition-colors group"
            >
              <span>View All Doctors Directory</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.slice(0, 3).map((doctor) => (
              <div
                key={doctor.id}
                className="group bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between card-hover-effect"
              >
                <div>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="relative shrink-0 overflow-hidden rounded-2xl">
                      {doctor.photoUrl ? (
                        <img
                          src={doctor.photoUrl}
                          alt={doctor.name}
                          referrerPolicy="no-referrer"
                          className="w-18 h-18 rounded-2xl object-cover border border-slate-200 group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-18 h-18 rounded-2xl bg-teal-50 text-teal-700 font-bold text-xl flex items-center justify-center border border-teal-100">
                          {doctor.name.split(' ')[1]?.[0] || 'Dr'}
                        </div>
                      )}
                      {doctor.isAvailableToday && (
                        <span className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-xs" title="Available in OPD today" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-base font-bold text-slate-900 truncate group-hover:text-teal-700 transition-colors">
                          {doctor.name}
                        </h3>
                      </div>
                      <p className="text-xs text-teal-700 font-medium truncate mt-0.5">
                        {doctor.specialization}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {doctor.qualification}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1.5">
                        <span className="flex items-center gap-1 text-amber-600 font-semibold">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          {doctor.rating}
                        </span>
                        <span>·</span>
                        <span>{doctor.experienceYears} yrs exp</span>
                      </div>
                    </div>
                  </div>

                  {/* Pulsing Availability Banner */}
                  <div className="flex items-center justify-between text-xs py-2 px-3 rounded-lg bg-slate-50 border border-slate-100 mb-3">
                    <span className="text-slate-600 font-medium">{doctor.departmentName}</span>
                    <span
                      className={`text-[11px] font-semibold flex items-center gap-1.5 ${
                        doctor.isAvailableToday ? 'text-emerald-700' : 'text-slate-400'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          doctor.isAvailableToday ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                        }`}
                      />
                      {doctor.isAvailableToday ? 'In OPD Today' : 'Next Shift'}
                    </span>
                  </div>

                  <div className="text-xs space-y-1.5 py-3 border-t border-b border-slate-100 text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Consultation Fee:</span>
                      <strong className="text-slate-900 font-mono text-sm">₹{doctor.consultationFee}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Timings:</span>
                      <span className="font-medium text-slate-800">{doctor.availableTime}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Room:</span>
                      <span>{doctor.roomNumber}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onNavigate('doctor-profile', { doctorId: doctor.id })}
                    className="py-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer text-center"
                  >
                    View Profile
                  </button>
                  <button
                    onClick={() => onBookDoctor(doctor)}
                    className="py-2.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-all duration-200 cursor-pointer text-center shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
                  >
                    Book Slot
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Diagnostic Services Preview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-5">
            <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">
              Diagnostic &amp; Pathology
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Advanced Diagnostic &amp; Lab Services
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Equipped with 1.5 Tesla MRI, 128-slice CT, High-Resolution Ultrasound, and automated biochemistry analyzers. Timely clinical reports directly synchronized with your doctor records.
            </p>

            <div className="space-y-2.5 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Zero hidden charges: Demo rates published for all investigations</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>NABL standard sample collection protocols</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Fast turnaround: Routine blood reports delivered within 2–4 hours</span>
              </div>
            </div>

            <button
              onClick={() => onNavigate('diagnostics')}
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <span>Explore All Diagnostic Services</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {diagnostics.slice(0, 4).map((diag) => (
              <div
                key={diag.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 card-hover-effect flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span className="font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                      {diag.category}
                    </span>
                    <span className="font-mono text-slate-900 font-bold">₹{diag.approxFee}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">{diag.name}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                    {diag.description}
                  </p>
                  <div className="text-[11px] text-slate-600 space-y-0.5">
                    <div>Duration: {diag.duration}</div>
                    <div>Report Delivery: {diag.reportDeliveryTime}</div>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Slots Open
                  </span>
                  <button
                    onClick={() => onBookDiagnostic(diag)}
                    className="text-xs font-bold text-teal-600 hover:text-teal-700 cursor-pointer"
                  >
                    Book Service &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Live Queue System Demonstration Card */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950 text-white rounded-3xl p-6 sm:p-10 relative overflow-hidden border border-slate-800 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-7 space-y-4">
              <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                Digital Waiting Lounge
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Live Token &amp; OPD Waiting Room Tracker
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Avoid crowded corridors. Every appointment receives a transparent digital token. Monitor counter status from anywhere on campus or directly on your phone.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() => onNavigate('queue')}
                  className="px-6 py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-md hover:shadow-teal-400/20 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                >
                  Open Live Queue Monitor
                </button>
                <span className="text-xs text-slate-400">
                  Estimated waiting time — subject to change.
                </span>
              </div>
            </div>

            <div className="md:col-span-5 bg-slate-900/80 rounded-2xl p-6 border border-slate-700/80 backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-200">Cardiology OPD Waiting Status</span>
                <span className="text-emerald-400 flex items-center gap-1.5 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active Now
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-slate-950/90 rounded-xl p-4 border border-slate-800">
                  <div className="text-[11px] text-slate-400 uppercase tracking-wider">Current Serving</div>
                  <div className="text-3xl sm:text-4xl font-extrabold text-teal-400 font-mono mt-1">#24</div>
                </div>
                <div className="bg-slate-950/90 rounded-xl p-4 border border-slate-800">
                  <div className="text-[11px] text-slate-400 uppercase tracking-wider">Next in Line</div>
                  <div className="text-3xl sm:text-4xl font-extrabold text-slate-200 font-mono mt-1">#25</div>
                </div>
              </div>

              <div className="text-xs text-slate-400 flex items-center justify-between pt-1">
                <span>Pace: ~8 mins/patient</span>
                <span>Total Registered: 35</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Emergency Ethical Protocol Notice */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-rose-700 font-bold text-xs uppercase tracking-wide">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Emergency Triage Priority Standard</span>
            </div>
            <h3 className="text-lg font-bold text-rose-950">
              Immediate Emergency Care Without Payment Barriers
            </h3>
            <p className="text-xs text-rose-900 leading-relaxed">
              At CarePlus Hospital, emergency admission and life-saving interventions are prioritized strictly by clinical urgency. Emergency treatment is never dependent on paying extra fees or purchasing priority passes.
            </p>
          </div>
          <button
            onClick={() => onNavigate('emergency')}
            className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer shrink-0"
          >
            Emergency Protocols &amp; Contacts &rarr;
          </button>
        </div>
      </section>
    </div>
  );
};
