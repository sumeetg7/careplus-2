import React from 'react';
import { useTranslation } from 'react-i18next';
import { RevealSection, StaggerGrid, StaggerCard } from './MotionPrimitives';
import {
  PhoneCall,
  HeartPulse,
  ShieldCheck,
  MapPin,
  Activity,
} from 'lucide-react';

export const EmergencyPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Red Alert Header Banner */}
      <RevealSection direction="up">
        <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-slate-950 text-white rounded-3xl p-6 sm:p-10 border border-rose-800 shadow-xl relative overflow-hidden">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-600/30 border border-rose-500/40 text-rose-200 text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
              {t('emergency.badge')}
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              {t('emergency.title')}
            </h1>

            <p className="text-sm sm:text-base text-rose-100 leading-relaxed font-normal">
              {t('emergency.subtitle')}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <a
                href="tel:108"
                className="px-6 py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-rose-600/30 btn-interactive inline-flex items-center gap-2 cursor-pointer"
              >
                <PhoneCall className="w-4 h-4" />
                <span>{t('emergency.dial108')}</span>
              </a>

              <div className="px-5 py-3.5 bg-rose-900/60 border border-rose-700 rounded-xl text-sm text-rose-200 font-mono font-bold">
                {t('emergency.hotlineLabel')} <strong className="text-white">+91 800 227 3758</strong>
              </div>
            </div>
          </div>
        </div>
      </RevealSection>

      {/* Ethical Emergency Declaration */}
      <RevealSection direction="up" delay={0.04}>
        <div className="bg-white rounded-3xl border-2 border-emerald-500/80 p-6 sm:p-8 space-y-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
                {t('emergency.charterEyebrow')}
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                {t('emergency.charterTitle')}
              </h2>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            {t('emergency.charterBody')}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <strong className="text-slate-900 block mb-1">{t('emergency.pillar1Title')}</strong>
              <span className="text-slate-600">{t('emergency.pillar1Desc')}</span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <strong className="text-slate-900 block mb-1">{t('emergency.pillar2Title')}</strong>
              <span className="text-slate-600">{t('emergency.pillar2Desc')}</span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <strong className="text-slate-900 block mb-1">{t('emergency.pillar3Title')}</strong>
              <span className="text-slate-600">{t('emergency.pillar3Desc')}</span>
            </div>
          </div>
        </div>
      </RevealSection>

      {/* Triage Acuity System */}
      <RevealSection direction="up" delay={0.05}>
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">
              {t('emergency.triageEyebrow')}
            </span>
            <h2 className="text-xl font-bold text-slate-900 mt-1">
              {t('emergency.triageTitle')}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {t('emergency.triageSubtitle')}
            </p>
          </div>

          <StaggerGrid className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StaggerCard className="p-5 rounded-2xl border border-rose-200 bg-rose-50/50 space-y-2 card-hover-effect">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-bold text-xs">
                  {t('emergency.redBadge')}
                </span>
                <span className="text-xs font-mono font-bold text-rose-700">{t('emergency.redTime')}</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">{t('emergency.redTitle')}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t('emergency.redDesc')}
              </p>
            </StaggerCard>

            <StaggerCard className="p-5 rounded-2xl border border-amber-200 bg-amber-50/50 space-y-2 card-hover-effect">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-600 text-white font-bold text-xs">
                  {t('emergency.yellowBadge')}
                </span>
                <span className="text-xs font-mono font-bold text-amber-700">{t('emergency.yellowTime')}</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">{t('emergency.yellowTitle')}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t('emergency.yellowDesc')}
              </p>
            </StaggerCard>

            <StaggerCard className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-2 card-hover-effect">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-xs">
                  {t('emergency.greenBadge')}
                </span>
                <span className="text-xs font-mono font-bold text-emerald-700">{t('emergency.greenTime')}</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">{t('emergency.greenTitle')}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t('emergency.greenDesc')}
              </p>
            </StaggerCard>
          </StaggerGrid>
        </div>
      </RevealSection>

      {/* Emergency First-Aid Guidelines */}
      <RevealSection direction="up" delay={0.05}>
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs">
          <h2 className="text-xl font-bold text-slate-900">
            {t('emergency.firstAidTitle')}
          </h2>

          <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-700">
            <StaggerCard className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 card-hover-effect">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-rose-600 shrink-0" />
                {t('emergency.heartAttackTitle')}
              </h4>
              <ul className="space-y-1.5 list-disc list-inside text-slate-600">
                <li>{t('emergency.haPoint1')}</li>
                <li>{t('emergency.haPoint2')}</li>
                <li>{t('emergency.haPoint3')}</li>
                <li>{t('emergency.haPoint4')}</li>
              </ul>
            </StaggerCard>

            <StaggerCard className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 card-hover-effect">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600 shrink-0" />
                {t('emergency.strokeTitle')}
              </h4>
              <ul className="space-y-1.5 list-disc list-inside text-slate-600">
                <li><strong>{t('emergency.strokeFaceLabel')}</strong> {t('emergency.strokeFaceText')}</li>
                <li><strong>{t('emergency.strokeArmsLabel')}</strong> {t('emergency.strokeArmsText')}</li>
                <li><strong>{t('emergency.strokeSpeechLabel')}</strong> {t('emergency.strokeSpeechText')}</li>
                <li><strong>{t('emergency.strokeTimeLabel')}</strong> {t('emergency.strokeTimeText')}</li>
              </ul>
            </StaggerCard>
          </StaggerGrid>
        </div>
      </RevealSection>

      {/* ER Location & Arrival Protocol */}
      <RevealSection direction="up" delay={0.05}>
        <div className="bg-slate-100 rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-xs">
          <div className="space-y-1">
            <strong className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
              {t('emergency.rampTitle')}
            </strong>
            <p className="text-slate-600">
              {t('emergency.rampDesc')}
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-slate-400 block text-[11px]">{t('emergency.directTel')}</span>
            <span className="text-base font-mono font-bold text-slate-900">+91 22 2899 0108</span>
          </div>
        </div>
      </RevealSection>
    </div>
  );
};
