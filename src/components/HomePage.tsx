import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Department, Doctor, DiagnosticService, QueueState } from '../types';
import { translateDepartmentName, translateDiagnosticCategory } from '../i18n';
import {
  motion,
  useScroll,
  useReducedMotion,
} from 'motion/react';
import {
  APPLE_EASE,
  RevealSection,
  StaggerGrid,
  StaggerCard,
  AnimatedCounter,
} from './MotionPrimitives';
import { HeroHealthcareBackdrop } from './HeroHealthcareBackdrop';
import { DoctorAvatar } from './DoctorAvatar';
import {
  Calendar,
  Clock,
  Search,
  HeartPulse,
  Brain,
  Bone,
  Eye,
  Stethoscope,
  ArrowRight,
  Star,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  PhoneCall,
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
  const { t } = useTranslation();
  const [quickTokenSearch, setQuickTokenSearch] = useState('');
  const [isDesktop, setIsDesktop] = useState(false);
  const prefersReduced = useReducedMotion();
  const heroRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(min-width: 1024px) and (hover: hover)');
      setIsDesktop(mq.matches);
      const listener = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
      mq.addEventListener('change', listener);
      return () => mq.removeEventListener('change', listener);
    }
  }, []);

  // Gentle scroll-linked progress for layered backdrop parallax on desktop
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

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
    <div className="space-y-16 pb-16">
      {/* 1. Cinematic Apple-Inspired Hero Section with Layered Healthcare Background */}
      <section
        ref={heroRef}
        className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 text-white min-h-[600px] lg:min-h-[640px] flex items-center"
      >
        <HeroHealthcareBackdrop
          scrollYProgress={scrollYProgress}
          isDesktop={isDesktop}
          prefersReduced={Boolean(prefersReduced)}
          currentServingToken={queues['dept-cardio']?.currentServingToken ?? 24}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-22 w-full">
          <div className="max-w-3xl mx-auto text-center space-y-7">
            <motion.div
              initial={prefersReduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.04, ease: APPLE_EASE }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-400/12 border border-cyan-300/30 text-cyan-200 text-xs font-semibold backdrop-blur-md shadow-sm"
            >
              <span>{t('home.heroBadge')}</span>
            </motion.div>

            <div className="space-y-4">
              <motion.h1
                initial={prefersReduced ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.62, delay: 0.1, ease: APPLE_EASE }}
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15] [text-wrap:balance]"
              >
                {t('home.heroTitleLine1')}<br />
                <span className="bg-gradient-to-r from-cyan-200 via-sky-200 to-teal-300 bg-clip-text text-transparent">
                  {t('home.heroTitleLine2')}
                </span>
              </motion.h1>
              <motion.p
                initial={prefersReduced ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: APPLE_EASE }}
                className="text-base sm:text-lg text-slate-200/90 leading-relaxed font-normal max-w-xl mx-auto"
              >
                {t('home.heroSubtitle')}
              </motion.p>
            </div>

            {/* Staggered Animated Action Buttons */}
            <motion.div
              initial={prefersReduced ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.28, ease: APPLE_EASE }}
              className="pt-2 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-center gap-3 sm:gap-4 w-full max-w-xs mx-auto sm:max-w-none">
                <motion.button
                  whileHover={prefersReduced ? undefined : { y: -2, scale: 1.015 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.18, ease: APPLE_EASE }}
                  onClick={() => onNavigate('doctors')}
                  className="group w-full sm:w-auto min-h-[48px] px-6 py-3 bg-gradient-to-r from-teal-400 to-cyan-400 hover:from-teal-300 hover:to-cyan-300 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-cyan-950/40 hover:shadow-cyan-400/25 transition-all duration-200 cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <Search className="w-4 h-4 text-slate-950 group-hover:scale-110 transition-transform shrink-0" />
                  <span>{t('home.findDoctor')}</span>
                </motion.button>

                <motion.button
                  whileHover={prefersReduced ? undefined : { y: -2, scale: 1.015 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.18, ease: APPLE_EASE }}
                  onClick={() => onNavigate('appointments')}
                  className="group w-full sm:w-auto min-h-[48px] px-6 py-3 bg-white/10 hover:bg-white/16 text-white border border-cyan-200/30 hover:border-cyan-200/50 font-semibold text-sm rounded-xl backdrop-blur-md transition-all duration-200 cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <Calendar className="w-4 h-4 text-cyan-300 group-hover:scale-110 transition-transform shrink-0" />
                  <span>{t('home.bookAppointment')}</span>
                </motion.button>

                <motion.button
                  whileHover={prefersReduced ? undefined : { y: -2, scale: 1.015 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.18, ease: APPLE_EASE }}
                  onClick={() => onNavigate('emergency')}
                  className="group w-full sm:w-auto min-h-[48px] px-6 py-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-100 border border-rose-400/45 hover:border-rose-300/70 font-semibold text-sm rounded-xl backdrop-blur-md transition-all duration-200 cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <PhoneCall className="w-4 h-4 text-rose-300 group-hover:scale-110 transition-transform shrink-0" />
                  <span>{t('nav.emergency')}</span>
                </motion.button>
              </div>

              <div className="flex justify-center">
                <motion.button
                  whileHover={prefersReduced ? undefined : { x: 2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onNavigate('queue')}
                  className="group px-4 py-2 min-h-[40px] text-xs text-cyan-100/90 hover:text-white font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Clock className="w-4 h-4 text-cyan-300 shrink-0" />
                  <span>{t('home.liveQueueStatus')}</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 group-hover:opacity-100 transition-all shrink-0" />
                </motion.button>
              </div>
            </motion.div>

            {/* Real-time Stats Grid with Smooth Animated Counters */}
            <motion.div
              initial={prefersReduced ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.36, ease: APPLE_EASE }}
              className="pt-8 border-t border-cyan-200/15 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl mx-auto"
            >
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-white font-mono tabular-nums">
                  <AnimatedCounter value={departments.length || 5} />
                </div>
                <div className="text-xs text-slate-300/80 mt-0.5">{t('home.statOpds')}</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-cyan-300 font-mono tabular-nums">
                  <AnimatedCounter value={doctors.length || 10} suffix="+" />
                </div>
                <div className="text-xs text-slate-300/80 mt-0.5">{t('home.statSpecialists')}</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-white font-mono tabular-nums">
                  <AnimatedCounter value={diagnostics.length || 6} />
                </div>
                <div className="text-xs text-slate-300/80 mt-0.5">{t('home.statSuites')}</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-emerald-300 font-mono tabular-nums">
                  {t('home.statWaitingZero')}
                </div>
                <div className="text-xs text-slate-300/80 mt-0.5">{t('home.statWaitingLabel')}</div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Floating Glassmorphic Quick Token Search Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        <RevealSection direction="up" delay={0.08}>
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-900/5 border border-slate-200/90 p-5 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            <div className="md:col-span-5">
              <span className="text-xs font-bold text-teal-700 uppercase tracking-wider block mb-1">
                {t('home.quickSearchEyebrow')}
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {t('home.quickSearchTitle')}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('home.quickSearchSubtitle')}
              </p>
            </div>

            <form onSubmit={handleQuickTokenTrack} className="md:col-span-7 flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={t('home.quickSearchPlaceholder')}
                  value={quickTokenSearch}
                  onChange={(e) => setQuickTokenSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white focus:shadow-sm transition-all"
                />
              </div>
              <motion.button
                whileHover={{ y: -1.5, scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
                type="submit"
                className="group px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer shrink-0 shadow-sm hover:shadow-md flex items-center justify-center gap-1.5"
              >
                <span>{t('home.trackToken')}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </motion.button>
            </form>
          </div>
        </RevealSection>
      </section>

      {/* 2. Interactive Department / Clinical Capability Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <RevealSection direction="up">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">
                {t('home.deptEyebrow')}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">
                {t('home.deptTitle')}
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                {t('home.deptSubtitle')}
              </p>
            </div>
            <button
              onClick={() => onNavigate('departments')}
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer transition-colors group"
            >
              <span>{t('home.exploreDepts')}</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </RevealSection>

        <StaggerGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((dept) => {
            const queueInfo = queues[dept.id];
            return (
              <StaggerCard
                key={dept.id}
                enableTilt
                onClick={() => onNavigate('doctors', { departmentId: dept.id })}
                className="group bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between card-hover-effect cursor-pointer relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:scale-110 group-hover:bg-teal-50 group-hover:border-teal-100 transition-all duration-300">
                      {getDeptIcon(dept.code)}
                    </div>
                    {queueInfo && (
                      <span className="text-xs text-slate-500 font-mono bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100 tabular-nums">
                        {t('home.nowPrefix')} <strong className="text-teal-700 font-bold">#{queueInfo.currentServingToken}</strong>
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                    {translateDepartmentName(t, dept.name)}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed mt-2 mb-4 line-clamp-2">
                    {dept.description}
                  </p>

                  <div className="text-xs text-slate-500 space-y-1 mb-4">
                    <div>
                      {t('home.deptLead')} <strong className="text-slate-800 font-medium">{dept.headDoctor}</strong>
                    </div>
                    <div>
                      {t('home.location')} <span className="text-slate-700">{dept.roomNumber}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    {t('home.doctorsAvailableCount', { count: dept.doctorCount })}
                  </span>
                  <span className="text-xs font-bold text-teal-600 group-hover:translate-x-1 transition-transform duration-200 flex items-center gap-1">
                    <span>{t('home.viewDoctors')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </StaggerCard>
            );
          })}
        </StaggerGrid>
      </section>

      {/* 3. Featured Doctors with Staggered Reveal & Smooth Image Zoom */}
      <section className="bg-slate-100/60 py-16 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealSection direction="up">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
              <div>
                <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">
                  {t('home.doctorsEyebrow')}
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">
                  {t('home.doctorsTitle')}
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  {t('home.doctorsSubtitle')}
                </p>
              </div>
              <button
                onClick={() => onNavigate('doctors')}
                className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer transition-colors group"
              >
                <span>{t('home.viewAllDoctors')}</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </RevealSection>

          <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.slice(0, 3).map((doctor) => (
              <StaggerCard
                key={doctor.id}
                className="group bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between card-hover-effect relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div>
                  <div className="flex items-start gap-4 mb-4">
                    <DoctorAvatar
                      name={doctor.name}
                      photoUrl={doctor.photoUrl}
                      isAvailableToday={doctor.isAvailableToday}
                      availabilityTitle={t('home.inOpdToday')}
                      size="md"
                    />

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
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 group-hover:scale-110 transition-transform duration-200" />
                          {doctor.rating}
                        </span>
                        <span>·</span>
                        <span>{doctor.experienceYears} {t('common.yrsExp')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Availability Banner */}
                  <div className="flex items-center justify-between text-xs py-2 px-3 rounded-lg bg-slate-50 border border-slate-100 mb-3">
                    <span className="text-slate-600 font-medium">{translateDepartmentName(t, doctor.departmentName)}</span>
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
                      {doctor.isAvailableToday ? t('home.inOpdToday') : t('home.nextShift')}
                    </span>
                  </div>

                  <div className="text-xs space-y-1.5 py-3 border-t border-b border-slate-100 text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{t('home.consultationFee')}</span>
                      <strong className="text-slate-900 font-mono text-sm tabular-nums">₹{doctor.consultationFee}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{t('home.timings')}</span>
                      <span className="font-medium text-slate-800">{doctor.availableTime}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{t('common.room')}:</span>
                      <span>{doctor.roomNumber}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 grid grid-cols-2 gap-2">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onNavigate('doctor-profile', { doctorId: doctor.id })}
                    className="py-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer text-center"
                  >
                    {t('home.viewProfile')}
                  </motion.button>
                  <motion.button
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onBookDoctor(doctor)}
                    className="py-2.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-all duration-200 cursor-pointer text-center shadow-xs hover:shadow-md"
                  >
                    {t('home.bookSlot')}
                  </motion.button>
                </div>
              </StaggerCard>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* 4. Diagnostic Services Preview (Slide-in Left & Staggered Grid Right) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <RevealSection direction="left" className="lg:col-span-5 space-y-5">
            <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">
              {t('home.diagEyebrow')}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {t('home.diagTitle')}
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              {t('home.diagSubtitle')}
            </p>

            <div className="space-y-2.5 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>{t('home.diagPoint1')}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>{t('home.diagPoint2')}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>{t('home.diagPoint3')}</span>
              </div>
            </div>

            <motion.button
              whileHover={{ y: -1.5, scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onNavigate('diagnostics')}
              className="group px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <span>{t('home.exploreDiagnostics')}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </RevealSection>

          <StaggerGrid className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {diagnostics.slice(0, 4).map((diag) => (
              <StaggerCard
                key={diag.id}
                className="group bg-white rounded-2xl border border-slate-200 p-5 card-hover-effect flex flex-col justify-between relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span className="font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                      {translateDiagnosticCategory(t, diag.category)}
                    </span>
                    <span className="font-mono text-slate-900 font-bold tabular-nums">₹{diag.approxFee}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1 group-hover:text-teal-700 transition-colors">{diag.name}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                    {diag.description}
                  </p>
                  <div className="text-[11px] text-slate-600 space-y-0.5">
                    <div>{t('home.durationLabel', { duration: diag.duration })}</div>
                    <div>{t('home.reportDeliveryLabel', { time: diag.reportDeliveryTime })}</div>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {t('home.slotsOpen')}
                  </span>
                  <button
                    onClick={() => onBookDiagnostic(diag)}
                    className="group/btn text-xs font-bold text-teal-600 hover:text-teal-700 cursor-pointer inline-flex items-center gap-1"
                  >
                    <span>{t('home.bookService')}</span>
                    <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </StaggerCard>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* 5. Live Queue System Demonstration Card (Scale-up Cinematic Reveal) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <RevealSection direction="scale">
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950 text-white rounded-3xl p-6 sm:p-10 relative overflow-hidden border border-slate-800 shadow-xl">
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none animate-ambient-glow" />
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center relative z-10">
              <div className="md:col-span-7 space-y-4">
                <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                  {t('home.queueEyebrow')}
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {t('home.queueTitle')}
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {t('home.queueSubtitle')}
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <motion.button
                    whileHover={{ y: -1.5, scale: 1.015 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onNavigate('queue')}
                    className="group px-6 py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-md hover:shadow-teal-400/20 transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span>{t('home.openQueueMonitor')}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </motion.button>
                  <span className="text-xs text-slate-400">
                    {t('home.estimatedWaitDisclaimer')}
                  </span>
                </div>
              </div>

              <div className="md:col-span-5 bg-slate-900/80 rounded-2xl p-6 border border-slate-700/80 backdrop-blur-md space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-slate-200">{t('home.cardiologyWaitingStatus')}</span>
                  <span className="text-emerald-400 flex items-center gap-1.5 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    {t('home.activeNow')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-slate-950/90 rounded-xl p-4 border border-slate-800">
                    <div className="text-[11px] text-slate-400 uppercase tracking-wider">{t('home.currentServing')}</div>
                    <div className="text-3xl sm:text-4xl font-extrabold text-teal-400 font-mono mt-1 tabular-nums">
                      #{queues['dept-cardio']?.currentServingToken ?? 24}
                    </div>
                  </div>
                  <div className="bg-slate-950/90 rounded-xl p-4 border border-slate-800">
                    <div className="text-[11px] text-slate-400 uppercase tracking-wider">{t('home.nextInLine')}</div>
                    <div className="text-3xl sm:text-4xl font-extrabold text-slate-200 font-mono mt-1 tabular-nums">
                      #{(queues['dept-cardio']?.currentServingToken ?? 24) + 1}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-400 flex items-center justify-between pt-1">
                  <span>{t('home.paceLabel')}</span>
                  <span>{t('home.totalRegistered', { count: queues['dept-cardio']?.totalTokensToday ?? 35 })}</span>
                </div>
              </div>
            </div>
          </div>
        </RevealSection>
      </section>

      {/* 6. Emergency Ethical Protocol Notice */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <RevealSection direction="up">
          <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-xs uppercase tracking-wide">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>{t('home.emergencyEyebrow')}</span>
              </div>
              <h3 className="text-lg font-bold text-rose-950">
                {t('home.emergencyTitle')}
              </h3>
              <p className="text-xs text-rose-900 leading-relaxed">
                {t('home.emergencySubtitle')}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0">
              <motion.button
                whileHover={{ y: -1.5 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onNavigate('blood-bank')}
                className="group w-full sm:w-auto min-h-[44px] px-5 py-2.5 bg-white hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold text-xs rounded-xl transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <span>{t('home.bloodRequirements')}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </motion.button>
              <motion.button
                whileHover={{ y: -1.5 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onNavigate('emergency')}
                className="group w-full sm:w-auto min-h-[44px] px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <span>{t('home.emergencyProtocols')}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </motion.button>
            </div>
          </div>
        </RevealSection>
      </section>
    </div>
  );
};
