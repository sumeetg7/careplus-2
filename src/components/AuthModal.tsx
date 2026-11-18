import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { UserSession } from '../types';
import { setSession, loginAsAdminAsync } from '../services/storageService';
import { APPLE_EASE, SPRING_GENTLE } from './MotionPrimitives';
import { X, HeartPulse } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (session: UserSession) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'patient' | 'admin'>('patient');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handlePatientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError(t('auth.errNamePhone'));
      return;
    }

    const session: UserSession = {
      id: `usr-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      role: 'patient',
    };

    setSession(session);
    onLoginSuccess(session);
    onClose();
  };

  const handleQuickPatient = (sampleName: string, samplePhone: string) => {
    const session: UserSession = {
      id: `usr-${Date.now()}`,
      name: sampleName,
      phone: samplePhone,
      role: 'patient',
    };
    setSession(session);
    onLoginSuccess(session);
    onClose();
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPin.trim()) {
      setError(t('auth.errAdminPin'));
      return;
    }
    try {
      const adminSession = await loginAsAdminAsync(adminPin);
      setAdminPin('');
      setError(null);
      onLoginSuccess(adminSession);
      onClose();
    } catch (err: any) {
      setError(err?.message || t('auth.errInvalidPin'));
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="auth-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4"
        >
          <motion.div
            key="auth-card"
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.26, ease: APPLE_EASE }}
            className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative"
          >
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label={t('common.close')}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1.5 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-700 to-teal-500 text-white flex items-center justify-center mx-auto mb-2 shadow-sm">
                <HeartPulse className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {t('auth.title')}
              </h2>
              <p className="text-xs text-slate-500">
                {t('auth.subtitle')}
              </p>
            </div>

            {/* Mode Selector with sliding indicator */}
            <div className="grid grid-cols-2 p-1.5 bg-slate-100 rounded-xl mb-5 text-xs font-bold relative">
              <button
                type="button"
                onClick={() => {
                  setMode('patient');
                  setError(null);
                }}
                className={`relative py-2 rounded-lg transition-colors cursor-pointer ${
                  mode === 'patient'
                    ? 'text-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode === 'patient' && (
                  <motion.span
                    layoutId="auth-mode-pill"
                    transition={SPRING_GENTLE}
                    className="absolute inset-0 bg-white rounded-lg shadow-sm"
                  />
                )}
                <span className="relative z-10">{t('auth.patientTab')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('admin');
                  setError(null);
                }}
                className={`relative py-2 rounded-lg transition-colors cursor-pointer ${
                  mode === 'admin'
                    ? 'text-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode === 'admin' && (
                  <motion.span
                    layoutId="auth-mode-pill"
                    transition={SPRING_GENTLE}
                    className="absolute inset-0 bg-white rounded-lg shadow-sm"
                  />
                )}
                <span className="relative z-10">{t('auth.adminTab')}</span>
              </button>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2, ease: APPLE_EASE }}
                  className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl mb-4 font-medium"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {mode === 'patient' ? (
                <motion.div
                  key="auth-patient-form"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2, ease: APPLE_EASE }}
                  className="space-y-4"
                >
                  <form onSubmit={handlePatientSubmit} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {t('auth.fullName')}
                      </label>
                      <input
                        type="text"
                        placeholder={t('auth.fullNamePlaceholder')}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white focus:shadow-sm transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {t('auth.mobileNumber')}
                      </label>
                      <input
                        type="tel"
                        placeholder={t('auth.mobilePlaceholder')}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white focus:shadow-sm transition-all"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md btn-interactive cursor-pointer"
                    >
                      {t('auth.signInPatientBtn')}
                    </button>
                  </form>

                  <div className="pt-3 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 text-center">
                      {t('auth.quickDemoTitle')}
                    </span>
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => handleQuickPatient('Devendra Sharma', '9876543210')}
                        className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs text-left flex items-center justify-between text-slate-700 cursor-pointer transition-colors"
                      >
                        <span className="font-semibold">Devendra Sharma</span>
                        <span className="text-[11px] text-teal-700 font-mono font-bold">
                          {t('auth.hasToken', { token: 24 })}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickPatient('Pooja Bhatt', '9811223344')}
                        className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs text-left flex items-center justify-between text-slate-700 cursor-pointer transition-colors"
                      >
                        <span className="font-semibold">Pooja Bhatt</span>
                        <span className="text-[11px] text-teal-700 font-mono font-bold">
                          {t('auth.hasToken', { token: 27 })}
                        </span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.form
                  key="auth-admin-form"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2, ease: APPLE_EASE }}
                  onSubmit={handleAdminSubmit}
                  className="space-y-4"
                >
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed">
                    {t('auth.adminNotice')}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t('auth.adminPinLabel')}{' '}
                      <span className="text-slate-400 font-normal">{t('auth.adminPinDemo')}</span>
                    </label>
                    <input
                      type="password"
                      required
                      placeholder={t('auth.adminPinPlaceholder')}
                      value={adminPin}
                      onChange={(e) => setAdminPin(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white focus:shadow-sm transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md btn-interactive cursor-pointer"
                  >
                    {t('auth.signInAdminBtn')}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
