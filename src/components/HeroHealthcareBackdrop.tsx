import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useTransform, type MotionValue } from 'motion/react';
import {
  Activity,
  CalendarCheck2,
  FileHeart,
  HeartPulse,
  ShieldCheck,
  Stethoscope,
  UserRoundCheck,
} from 'lucide-react';
import { APPLE_EASE } from './MotionPrimitives';

interface HeroHealthcareBackdropProps {
  scrollYProgress: MotionValue<number>;
  isDesktop: boolean;
  prefersReduced: boolean;
  currentServingToken: number;
}

/**
 * Full-bleed Apple-inspired layered healthcare background animation.
 * Renders original SmartCare light-cyan / sky-blue glassmorphic clinical panels,
 * floating medical medallions, and a continuous ECG wave behind the centered hero copy.
 */
export const HeroHealthcareBackdrop: React.FC<HeroHealthcareBackdropProps> = ({
  scrollYProgress,
  isDesktop,
  prefersReduced,
  currentServingToken,
}) => {
  const { t } = useTranslation();
  const activeParallax = isDesktop && !prefersReduced;

  // Differentiated depth-plane parallax offsets (compositor-only transforms)
  const farPlaneY = useTransform(scrollYProgress, [0, 1], [0, activeParallax ? 34 : 0]);
  const midPlaneY = useTransform(scrollYProgress, [0, 1], [0, activeParallax ? 56 : 0]);
  const nearLeftX = useTransform(scrollYProgress, [0, 1], [0, activeParallax ? -26 : 0]);
  const nearRightX = useTransform(scrollYProgress, [0, 1], [0, activeParallax ? 26 : 0]);
  const nearPlaneY = useTransform(scrollYProgress, [0, 1], [0, activeParallax ? 42 : 0]);

  const nextToken = currentServingToken + 1;

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none select-none z-[1]"
    >
      {/* Subtle Clinical Dot Matrix */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(165, 243, 252, 0.9) 1px, transparent 0)',
          backgroundSize: '30px 30px',
        }}
      />

      {/* Ambient Moving Cyan / Sky / Teal Atmospheric Glows */}
      <motion.div style={{ y: farPlaneY }} className="absolute inset-0">
        <div className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full bg-cyan-400/12 blur-3xl animate-ambient-glow" />
        <div className="absolute -bottom-28 -right-16 w-[460px] h-[460px] rounded-full bg-sky-400/12 blur-3xl animate-float-reverse" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[560px] h-[280px] rounded-full bg-teal-400/10 blur-3xl animate-float-slow" />
      </motion.div>

      {/* Continuous SVG ECG Pulse Wave Across Mid-Lower Horizon */}
      <motion.div
        style={{ y: midPlaneY }}
        initial={prefersReduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.1, delay: 0.25, ease: APPLE_EASE }}
        className="absolute inset-x-0 bottom-[16%] sm:bottom-[14%] flex items-center justify-center opacity-45"
      >
        <svg
          viewBox="0 0 1440 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full max-w-[1440px] h-28 sm:h-36"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="smartcareEcgBase" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
              <stop offset="22%" stopColor="#38bdf8" stopOpacity="0.22" />
              <stop offset="50%" stopColor="#67e8f9" stopOpacity="0.35" />
              <stop offset="78%" stopColor="#38bdf8" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="smartcareEcgPulse" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#a5f3fc" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.15" />
            </linearGradient>
          </defs>

          {/* Subtle Baseline ECG Trace */}
          <path
            d="M0 92 H260 L282 92 L296 76 L310 112 L326 32 L344 134 L360 80 L374 92 H640 L664 92 L678 78 L692 108 L708 28 L726 136 L742 82 L756 92 H1040 L1062 92 L1076 76 L1090 110 L1106 34 L1124 132 L1140 80 L1154 92 H1440"
            stroke="url(#smartcareEcgBase)"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Flowing Highlighted Cardiac Pulse Segment */}
          {!prefersReduced && (
            <path
              d="M0 92 H260 L282 92 L296 76 L310 112 L326 32 L344 134 L360 80 L374 92 H640 L664 92 L678 78 L692 108 L708 28 L726 136 L742 82 L756 92 H1040 L1062 92 L1076 76 L1090 110 L1106 34 L1124 132 L1140 80 L1154 92 H1440"
              stroke="url(#smartcareEcgPulse)"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-ecg-flow"
            />
          )}
        </svg>
      </motion.div>

      {/* Desktop Layered Glassmorphic Healthcare Panels (Peripheral Depth Planes) */}
      <div className="hidden lg:block absolute inset-0 max-w-[1440px] mx-auto">
        {/* 1. Top-Left Depth Plane: Doctor Profile Glass Card */}
        <motion.div
          style={{ x: nearLeftX, y: farPlaneY }}
          initial={prefersReduced ? false : { opacity: 0, x: -48, y: -16, scale: 0.94 }}
          animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          transition={{ duration: 0.85, delay: 0.1, ease: APPLE_EASE }}
          className="absolute top-12 left-6 xl:left-12 w-64"
        >
          <div className="animate-hero-drift-x rounded-2xl bg-gradient-to-br from-cyan-400/14 via-sky-300/8 to-white/5 border border-cyan-200/25 backdrop-blur-xl p-4 shadow-[0_24px_48px_-12px_rgba(8,145,178,0.28)] -rotate-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-300/20 border border-cyan-200/35 flex items-center justify-center text-cyan-200 shrink-0">
                <UserRoundCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-cyan-200/90">
                  {t('heroBackdrop.specialistOpd')}
                </div>
                <div className="text-sm font-bold text-white/95 truncate">
                  Dr. Ananya Sharma
                </div>
                <div className="text-[11px] text-sky-100/75 truncate">
                  {t('common.departments.Cardiology')} · {t('heroBackdrop.cabin')}
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-cyan-200/15 flex items-center justify-between text-[11px] text-cyan-100/85">
              <span>{t('heroBackdrop.consultationActive')}</span>
              <span className="font-mono font-semibold text-cyan-300">{t('heroBackdrop.onTime')}</span>
            </div>
          </div>
        </motion.div>

        {/* 2. Bottom-Left Depth Plane: Diagnostic & Medical Report Preview Panel */}
        <motion.div
          style={{ x: nearLeftX, y: nearPlaneY }}
          initial={prefersReduced ? false : { opacity: 0, x: -56, y: 24, scale: 0.92 }}
          animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          transition={{ duration: 0.92, delay: 0.24, ease: APPLE_EASE }}
          className="absolute bottom-14 left-10 xl:left-16 w-68"
        >
          <div className="animate-hero-drift-vertical rounded-2xl bg-gradient-to-br from-sky-300/14 via-cyan-200/8 to-white/5 border border-sky-200/25 backdrop-blur-xl p-4 shadow-[0_24px_48px_-14px_rgba(14,165,233,0.26)] rotate-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-300/20 border border-sky-200/30 flex items-center justify-center text-sky-200">
                  <FileHeart className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white/95">{t('heroBackdrop.diagnosticReport')}</div>
                  <div className="text-[10px] text-cyan-100/75">{t('heroBackdrop.cardiacLipidSuite')}</div>
                </div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-cyan-300/20 text-cyan-200 border border-cyan-200/25">
                {t('common.verified')}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-sky-100/80">
                <span>{t('heroBackdrop.sinusRhythm')}</span>
                <span className="font-mono text-cyan-200">72 BPM</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full w-4/5 rounded-full bg-gradient-to-r from-cyan-300 to-sky-300" />
              </div>
              <div className="flex items-center justify-between text-[11px] text-sky-100/80 pt-0.5">
                <span>{t('heroBackdrop.spo2Saturation')}</span>
                <span className="font-mono text-cyan-200">99%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full w-[92%] rounded-full bg-gradient-to-r from-sky-300 to-teal-300" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* 3. Top-Right Depth Plane: Medical Queue Dashboard Panel */}
        <motion.div
          style={{ x: nearRightX, y: farPlaneY }}
          initial={prefersReduced ? false : { opacity: 0, x: 48, y: -18, scale: 0.94 }}
          animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          transition={{ duration: 0.88, delay: 0.16, ease: APPLE_EASE }}
          className="absolute top-12 right-6 xl:right-12 w-68"
        >
          <div className="animate-hero-drift-x-reverse rounded-2xl bg-gradient-to-bl from-cyan-300/14 via-sky-300/8 to-white/5 border border-cyan-200/25 backdrop-blur-xl p-4 shadow-[0_24px_48px_-12px_rgba(8,145,178,0.28)] rotate-3">
            <div className="flex items-center justify-between border-b border-cyan-200/15 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-300/20 border border-cyan-200/30 flex items-center justify-center text-cyan-200">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white/95">{t('heroBackdrop.opdTelemetry')}</div>
                  <div className="text-[10px] text-cyan-100/75">{t('heroBackdrop.centralScreenSync')}</div>
                </div>
              </div>
              <span className="text-[10px] font-mono text-cyan-200">{t('common.live')}</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 text-center">
              <div className="rounded-xl bg-slate-950/35 border border-cyan-200/20 py-2 px-2">
                <div className="text-[10px] uppercase tracking-wider text-sky-100/70">{t('heroBackdrop.serving')}</div>
                <div className="text-xl font-extrabold font-mono text-cyan-300 tabular-nums">
                  #{currentServingToken}
                </div>
              </div>
              <div className="rounded-xl bg-slate-950/35 border border-sky-200/20 py-2 px-2">
                <div className="text-[10px] uppercase tracking-wider text-sky-100/70">{t('heroBackdrop.nextUp')}</div>
                <div className="text-xl font-extrabold font-mono text-white/90 tabular-nums">
                  #{nextToken}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 4. Bottom-Right Depth Plane: Appointment Booking Card */}
        <motion.div
          style={{ x: nearRightX, y: nearPlaneY }}
          initial={prefersReduced ? false : { opacity: 0, x: 56, y: 24, scale: 0.92 }}
          animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          transition={{ duration: 0.94, delay: 0.3, ease: APPLE_EASE }}
          className="absolute bottom-14 right-10 xl:right-16 w-64"
        >
          <div className="animate-hero-drift-x rounded-2xl bg-gradient-to-tl from-sky-300/14 via-cyan-300/8 to-white/5 border border-sky-200/25 backdrop-blur-xl p-4 shadow-[0_24px_48px_-14px_rgba(14,165,233,0.26)] -rotate-2">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-sky-300/20 border border-sky-200/30 flex items-center justify-center text-sky-200">
                <CalendarCheck2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white/95">{t('heroBackdrop.appointmentSlot')}</div>
                <div className="text-[10px] text-sky-100/75">{t('heroBackdrop.instantTokenIssued')}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono text-center">
              <div className="py-1.5 rounded-lg bg-white/10 text-sky-100/80 border border-white/10">
                10:00
              </div>
              <div className="py-1.5 rounded-lg bg-cyan-300/25 text-cyan-100 font-bold border border-cyan-200/40">
                10:30
              </div>
              <div className="py-1.5 rounded-lg bg-white/10 text-sky-100/80 border border-white/10">
                11:15
              </div>
            </div>
          </div>
        </motion.div>

        {/* 5. Floating Translucent Healthcare Icon Medallions */}
        <motion.div
          style={{ y: midPlaneY }}
          initial={prefersReduced ? false : { opacity: 0, scale: 0.85 }}
          animate={{ opacity: 0.85, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.36, ease: APPLE_EASE }}
          className="absolute top-1/2 left-[21%] -translate-y-1/2"
        >
          <div className="animate-hero-drift-vertical w-11 h-11 rounded-2xl bg-cyan-300/12 border border-cyan-200/25 backdrop-blur-md flex items-center justify-center text-cyan-200/85 shadow-lg">
            <HeartPulse className="w-5 h-5" />
          </div>
        </motion.div>

        <motion.div
          style={{ y: farPlaneY }}
          initial={prefersReduced ? false : { opacity: 0, scale: 0.85 }}
          animate={{ opacity: 0.8, scale: 1 }}
          transition={{ duration: 0.85, delay: 0.4, ease: APPLE_EASE }}
          className="absolute top-[20%] left-[25%]"
        >
          <div className="animate-hero-drift-x-reverse w-10 h-10 rounded-xl bg-sky-300/10 border border-sky-200/20 backdrop-blur-md flex items-center justify-center text-sky-200/80">
            <Stethoscope className="w-4 h-4" />
          </div>
        </motion.div>

        <motion.div
          style={{ y: midPlaneY }}
          initial={prefersReduced ? false : { opacity: 0, scale: 0.85 }}
          animate={{ opacity: 0.85, scale: 1 }}
          transition={{ duration: 0.85, delay: 0.42, ease: APPLE_EASE }}
          className="absolute top-1/2 right-[21%] -translate-y-1/2"
        >
          <div className="animate-hero-drift-x w-11 h-11 rounded-2xl bg-sky-300/12 border border-sky-200/25 backdrop-blur-md flex items-center justify-center text-sky-200/85 shadow-lg">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </motion.div>
      </div>

      {/* Compact Mobile/Tablet Corner Accents (Lightweight, Zero 3D Parallax) */}
      <div className="lg:hidden absolute inset-0">
        <div className="animate-hero-drift-vertical absolute top-5 right-4 rounded-xl bg-cyan-300/12 border border-cyan-200/20 backdrop-blur-md px-3 py-2 text-right">
          <div className="text-[10px] uppercase tracking-wider text-cyan-200/80">{t('heroBackdrop.serving')}</div>
          <div className="text-sm font-extrabold font-mono text-cyan-200 tabular-nums">
            #{currentServingToken}
          </div>
        </div>
        <div className="animate-hero-drift-x absolute bottom-10 left-4 w-9 h-9 rounded-xl bg-sky-300/12 border border-sky-200/20 backdrop-blur-md flex items-center justify-center text-cyan-200/80">
          <HeartPulse className="w-4 h-4" />
        </div>
      </div>

      {/* Dark Navy Radial Readability Scrim Behind Centered Foreground Content */}
      <div
        className="absolute inset-0 z-[5]"
        style={{
          background:
            'radial-gradient(ellipse 68% 66% at 50% 50%, rgba(2, 6, 23, 0.78) 0%, rgba(15, 23, 42, 0.56) 52%, rgba(2, 6, 23, 0.14) 100%)',
        }}
      />
    </div>
  );
};
