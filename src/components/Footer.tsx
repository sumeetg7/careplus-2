import React from 'react';
import { useTranslation } from 'react-i18next';
import { HeartPulse, PhoneCall, MapPin, ShieldCheck, Clock, ArrowRight } from 'lucide-react';
import { RevealSection, StaggerGrid, StaggerCard } from './MotionPrimitives';
import { motion } from 'motion/react';

interface FooterProps {
  onNavigate: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { t } = useTranslation();

  return (
    <footer className="bg-slate-900 text-slate-400 text-sm border-t border-slate-800 overflow-hidden">
      {/* Top Clinical Accreditation Bar */}
      <RevealSection direction="none" duration={0.45}>
        <div className="bg-slate-950/80 border-b border-slate-800/80 py-3.5 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse-subtle shrink-0" />
              <span>
                <strong>{t('footer.accreditationPrefix')}</strong> {t('footer.accreditationText')}
              </span>
            </div>
            <div className="flex items-center gap-4 text-slate-400">
              <span>{t('footer.hospitalIdLabel')} <strong>SCH-DEL-0482</strong></span>
              <span>·</span>
              <span>{t('footer.systemName')}</span>
            </div>
          </div>
        </div>
      </RevealSection>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <StaggerGrid className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: About */}
          <StaggerCard className="space-y-4">
            <div className="flex items-center gap-2.5 group">
              <motion.div
                whileHover={{ scale: 1.08, rotate: 4 }}
                className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-sm"
              >
                <HeartPulse className="w-5 h-5" />
              </motion.div>
              <span className="text-white text-base font-bold tracking-tight">{t('common.hospitalName')}</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t('footer.aboutText')}
            </p>
            <div className="text-xs text-teal-400 flex items-center gap-1.5 pt-1 group">
              <ShieldCheck className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform duration-200 shrink-0" />
              <span>{t('footer.certifiedCenter')}</span>
            </div>
          </StaggerCard>

          {/* Col 2: Quick Navigation */}
          <StaggerCard>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">
              {t('footer.clinicalServices')}
            </h4>
            <ul className="space-y-2 text-xs">
              {[
                { id: 'departments', label: t('footer.links.departments') },
                { id: 'doctors', label: t('footer.links.doctors') },
                { id: 'diagnostics', label: t('footer.links.diagnostics') },
                { id: 'appointments', label: t('footer.links.appointments') },
                { id: 'blood-bank', label: t('footer.links.bloodBank'), highlight: 'text-rose-300 hover:text-white font-medium' },
                { id: 'queue', label: t('footer.links.queue') },
              ].map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => onNavigate(item.id)}
                    className={`group inline-flex items-center gap-1.5 transition-all duration-200 cursor-pointer hover:translate-x-1 text-left ${
                      item.highlight || 'hover:text-white'
                    }`}
                  >
                    <span>{item.label}</span>
                    <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          </StaggerCard>

          {/* Col 3: Patient Care & Community */}
          <StaggerCard>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">
              {t('footer.patientCare')}
            </h4>
            <ul className="space-y-2 text-xs">
              {[
                { id: 'feedback', label: t('footer.links.feedback') },
                { id: 'emergency', label: t('footer.links.emergency'), highlight: 'text-rose-400 hover:text-rose-300 font-medium' },
                { id: 'dashboard', label: t('footer.links.dashboard') },
                { id: 'admin', label: t('footer.links.admin') },
              ].map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => onNavigate(item.id)}
                    className={`group inline-flex items-center gap-1.5 transition-all duration-200 cursor-pointer hover:translate-x-1 text-left ${
                      item.highlight || 'hover:text-white'
                    }`}
                  >
                    <span>{item.label}</span>
                    <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          </StaggerCard>

          {/* Col 4: Contact & Hours */}
          <StaggerCard>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">
              {t('footer.emergencyLocation')}
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2 group">
                <PhoneCall className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-white font-semibold">{t('footer.ambulance24x7')}</div>
                  <div className="text-slate-400">{t('footer.hospitalDesk')}</div>
                </div>
              </div>
              <div className="flex items-start gap-2 pt-1 group">
                <MapPin className="w-4 h-4 text-teal-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <div>
                  {t('footer.address')}
                </div>
              </div>
              <div className="flex items-start gap-2 pt-1 group">
                <Clock className="w-4 h-4 text-teal-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <div className="text-slate-400">
                  {t('footer.opdHoursLine')}<br />
                  {t('footer.erHoursLine')}
                </div>
              </div>
            </div>
          </StaggerCard>
        </StaggerGrid>

        {/* Bottom bar */}
        <RevealSection direction="none" delay={0.12}>
          <div className="border-t border-slate-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div>
              {t('footer.copyright')}
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-slate-400">
                {t('footer.dedicatedNote')}
              </span>
            </div>
          </div>
        </RevealSection>
      </div>
    </footer>
  );
};
