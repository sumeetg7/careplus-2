import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { UserSession } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { APPLE_EASE } from './MotionPrimitives';
import { setAppLanguage, SupportedLanguage } from '../i18n';
import {
  HeartPulse,
  Menu,
  X,
  PhoneCall,
  User,
  Globe,
  ChevronDown,
  Check,
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  session: UserSession | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onQuickBook: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  session,
  onOpenAuth,
  onLogout,
  onQuickBook,
}) => {
  const { t, i18n } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const moreDropdownRef = useRef<HTMLDivElement>(null);

  const currentLang: SupportedLanguage = i18n.language === 'kn' ? 'kn' : 'en';
  const isKannada = currentLang === 'kn';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 18);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (langDropdownRef.current && !langDropdownRef.current.contains(target)) {
        setLangMenuOpen(false);
      }
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(target)) {
        setMoreMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLangMenuOpen(false);
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const primaryDesktopLinks = [
    { id: 'home', label: t('nav.home') },
    { id: 'departments', label: t('nav.departments') },
    { id: 'doctors', label: t('nav.doctors') },
    { id: 'diagnostics', label: t('nav.diagnostics') },
    { id: 'blood-bank', label: t('nav.bloodBank') },
    { id: 'queue', label: t('nav.queueStatus') },
  ];

  const secondaryDesktopLinks = [
    { id: 'appointments', label: t('nav.appointments') },
    { id: 'feedback', label: t('nav.feedback') },
  ];

  const navLinks = [
    { id: 'home', label: t('nav.home') },
    { id: 'departments', label: t('nav.departments') },
    { id: 'doctors', label: t('nav.doctors') },
    { id: 'diagnostics', label: t('nav.diagnostics') },
    { id: 'blood-bank', label: t('nav.bloodBank') },
    { id: 'appointments', label: t('nav.appointments') },
    { id: 'queue', label: t('nav.queueStatus') },
    { id: 'feedback', label: t('nav.feedback') },
    { id: 'emergency', label: t('nav.emergency') },
  ];

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
    setMoreMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLanguageChange = (lng: SupportedLanguage) => {
    setAppLanguage(lng);
    setLangMenuOpen(false);
  };

  const isMoreActive = secondaryDesktopLinks.some((item) => item.id === activeTab);

  return (
    <header className="sticky top-0 z-40 transition-all duration-300">
      {/* Top Clinical & Emergency Bar */}
      <div className="bg-slate-900 text-slate-300 px-4 sm:px-6 lg:px-8 py-1.5 text-xs border-b border-slate-800/80">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <span className="flex items-center gap-1.5 text-rose-400 font-semibold tracking-wide truncate">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
              <span className="truncate">{t('nav.emergencyTopBar')}</span>
            </span>
            <span className="hidden md:inline text-slate-500">·</span>
            <span className="hidden md:inline text-slate-300 whitespace-nowrap">
              {t('nav.hotlineLabel')}{' '}
              <strong className="text-white font-mono font-bold tracking-wider">108 / +91-800-SMARTCARE</strong>
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 text-slate-400 shrink-0">
            <span className="hidden sm:inline text-[11px] text-teal-400/90 font-medium whitespace-nowrap">
              {t('nav.opdHours')}
            </span>
            <span className="hidden sm:inline text-slate-600">|</span>
            <motion.button
              whileHover={{ x: 1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleNavClick('emergency')}
              className="text-rose-400 hover:text-rose-300 font-semibold transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <PhoneCall className="w-3 h-3 shrink-0" />
              <span>{t('nav.erHelp')}</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Main Frosted Glass Navbar with Smooth Scroll Reactivity */}
      <div
        className={`transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isScrolled
            ? 'bg-white/85 backdrop-blur-xl shadow-[0_8px_30px_rgb(15,23,42,0.06)] border-b border-slate-200/80 py-2.5'
            : 'bg-white/95 backdrop-blur-sm border-b border-slate-200/70 py-3.5'
        }`}
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            {/* Brand Wordmark */}
            <motion.button
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => handleNavClick('home')}
              className="flex items-center gap-2 text-left group cursor-pointer focus:outline-none shrink-0"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-700 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-teal-500/20 group-hover:scale-105 group-hover:shadow-teal-500/35 transition-all duration-300 shrink-0">
                <HeartPulse className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-slate-900 block leading-tight whitespace-nowrap">
                  {t('common.hospitalName')}
                </span>
                <span className="text-[11px] text-teal-600 font-medium block tracking-wide whitespace-nowrap">
                  {t('common.tagline')}
                </span>
              </div>
            </motion.button>

            {/* Primary Navigation Links (Desktop xl+ >= 1280px, guaranteed zero overlap) */}
            <nav className="hidden xl:flex flex-1 items-center justify-center gap-0.5 min-w-0">
              {primaryDesktopLinks.map((link) => {
                const isActive = activeTab === link.id;
                const isBloodBank = link.id === 'blood-bank';
                return (
                  <button
                    key={link.id}
                    onClick={() => handleNavClick(link.id)}
                    className={`relative py-1.5 font-semibold rounded-lg transition-colors duration-200 cursor-pointer whitespace-nowrap shrink-0 ${
                      isKannada ? 'px-1.5 2xl:px-2.5 text-[11px] 2xl:text-xs' : 'px-2.5 text-xs'
                    } ${!isActive ? 'nav-link-underline' : ''} ${
                      isActive
                        ? isBloodBank
                          ? 'text-rose-700 font-bold'
                          : 'text-teal-700 font-bold'
                        : isBloodBank
                        ? 'text-slate-700 hover:text-rose-700 hover:bg-rose-50/50'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="navbar-active-bg"
                        transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                        className={`absolute inset-0 rounded-lg -z-10 ${
                          isBloodBank ? 'bg-rose-50/90' : 'bg-teal-50/85'
                        }`}
                      />
                    )}
                    {link.label}
                    {isActive && (
                      <motion.span
                        layoutId="navbar-active-underline"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                        className={`absolute bottom-0 left-2 right-2 h-0.5 rounded-full ${
                          isBloodBank ? 'bg-rose-600' : 'bg-teal-600'
                        }`}
                      />
                    )}
                  </button>
                );
              })}

              {/* Secondary Links Dropdown ("More") */}
              <div className="relative shrink-0" ref={moreDropdownRef}>
                <button
                  type="button"
                  onClick={() => setMoreMenuOpen((prev) => !prev)}
                  aria-expanded={moreMenuOpen}
                  className={`relative py-1.5 font-semibold rounded-lg transition-colors duration-200 cursor-pointer whitespace-nowrap inline-flex items-center gap-1 ${
                    isKannada ? 'px-1.5 2xl:px-2.5 text-[11px] 2xl:text-xs' : 'px-2.5 text-xs'
                  } ${
                    isMoreActive
                      ? 'text-teal-700 font-bold bg-teal-50/85'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                  }`}
                >
                  <span>{t('nav.more')}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      moreMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {moreMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.97 }}
                      transition={{ duration: 0.16, ease: APPLE_EASE }}
                      className="absolute left-0 mt-1.5 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50"
                    >
                      {secondaryDesktopLinks.map((sub) => {
                        const selected = activeTab === sub.id;
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => handleNavClick(sub.id)}
                            className={`w-full px-3.5 py-2 text-left text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                              selected
                                ? 'bg-teal-50 text-teal-700'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span>{sub.label}</span>
                            {selected && <Check className="w-3.5 h-3.5 text-teal-600" />}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </nav>

            {/* Right Controls: Language Switcher + Clearly Separated Primary Actions + Mobile/Tablet Menu Trigger */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {/* Language Switcher Dropdown (Always Visible on Desktop & Mobile) */}
              <div className="relative" ref={langDropdownRef}>
                <button
                  type="button"
                  onClick={() => setLangMenuOpen((prev) => !prev)}
                  aria-label={t('nav.languageLabel')}
                  aria-expanded={langMenuOpen}
                  data-testid="language-switcher"
                  className="inline-flex items-center justify-center gap-1.5 h-9 px-2.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
                >
                  <Globe className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>{currentLang === 'kn' ? t('nav.kannada') : t('nav.english')}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                      langMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {langMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.97 }}
                      transition={{ duration: 0.16, ease: APPLE_EASE }}
                      className="absolute right-0 mt-1.5 w-36 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50"
                    >
                      {(
                        [
                          { code: 'en' as SupportedLanguage, label: 'English' },
                          { code: 'kn' as SupportedLanguage, label: 'ಕನ್ನಡ' },
                        ]
                      ).map((opt) => {
                        const selected = currentLang === opt.code;
                        return (
                          <button
                            key={opt.code}
                            type="button"
                            onClick={() => handleLanguageChange(opt.code)}
                            data-testid={`lang-option-${opt.code}`}
                            className={`w-full px-3 py-2 text-left text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                              selected
                                ? 'bg-teal-50 text-teal-700'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span>{opt.label}</span>
                            {selected && <Check className="w-3.5 h-3.5 text-teal-600" />}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Tablet & Desktop Primary CTA Buttons (Equal height h-9, properly separated) */}
              <div className="hidden sm:flex items-center gap-2 sm:gap-2.5 shrink-0">
                <motion.button
                  whileHover={{ y: -1.5, scale: 1.015 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.18, ease: APPLE_EASE }}
                  onClick={() => handleNavClick('emergency')}
                  className={`h-9 inline-flex items-center justify-center gap-1.5 font-semibold rounded-lg border transition-all duration-200 cursor-pointer whitespace-nowrap ${
                    isKannada ? 'px-2.5 2xl:px-3 text-[11px] 2xl:text-xs' : 'px-3 text-xs'
                  } ${
                    activeTab === 'emergency'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-600/20'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 hover:border-rose-300'
                  }`}
                >
                  <PhoneCall className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('nav.emergency')}</span>
                </motion.button>

                <motion.button
                  whileHover={{ y: -1.5, scale: 1.015 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.18, ease: APPLE_EASE }}
                  onClick={onQuickBook}
                  className={`h-9 inline-flex items-center justify-center font-semibold text-white bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 rounded-lg shadow-sm hover:shadow-md hover:shadow-teal-600/20 transition-all duration-200 cursor-pointer whitespace-nowrap ${
                    isKannada ? 'px-2.5 2xl:px-3.5 text-[11px] 2xl:text-xs' : 'px-3.5 text-xs'
                  }`}
                >
                  {t('nav.bookAppointment')}
                </motion.button>

                {session ? (
                  <div className="hidden md:flex items-center gap-1.5">
                    <motion.button
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleNavClick(session.role === 'admin' ? 'admin' : 'dashboard')}
                      className="h-9 px-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap border border-slate-200/60"
                    >
                      <User className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span>
                        {session.role === 'admin' ? t('nav.adminPanel') : session.name.split(' ')[0]}
                      </span>
                    </motion.button>
                    <button
                      onClick={onLogout}
                      className="h-9 text-xs text-slate-500 hover:text-slate-800 px-1.5 transition-colors cursor-pointer whitespace-nowrap"
                      title={t('nav.signOut')}
                    >
                      {t('nav.signOut')}
                    </button>
                  </div>
                ) : (
                  <motion.button
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={onOpenAuth}
                    className={`hidden md:inline-flex h-9 items-center justify-center font-semibold text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap shadow-xs ${
                      isKannada ? 'px-2.5 text-[11px] 2xl:text-xs' : 'px-3 text-xs'
                    }`}
                  >
                    {t('nav.loginRegister')}
                  </motion.button>
                )}
              </div>

              {/* Mobile / Tablet Menu Button */}
              <div className="flex items-center xl:hidden">
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none transition-colors"
                  aria-label={t('nav.toggleMenu')}
                >
                  {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Smooth Animated Mobile / Tablet Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.24, ease: APPLE_EASE }}
            className="xl:hidden bg-white/95 backdrop-blur-xl border-b border-slate-200 px-4 pt-2 pb-5 space-y-1 shadow-xl"
          >
            {navLinks.map((link, idx) => (
              <motion.button
                key={link.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.025, ease: APPLE_EASE }}
                onClick={() => handleNavClick(link.id)}
                className={`block w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === link.id
                    ? link.id === 'emergency'
                      ? 'bg-rose-50 text-rose-700'
                      : 'bg-teal-50 text-teal-700'
                    : link.id === 'emergency'
                    ? 'text-rose-600 hover:bg-rose-50/70'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {link.label}
              </motion.button>
            ))}

            {/* Quick Language Switch in Mobile Drawer */}
            <div className="pt-2 pb-1 px-1 flex items-center justify-between border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-teal-600" />
                {t('nav.languageLabel')}
              </span>
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                <button
                  type="button"
                  onClick={() => handleLanguageChange('en')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                    currentLang === 'en' ? 'bg-white text-teal-700 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange('kn')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                    currentLang === 'kn' ? 'bg-white text-teal-700 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  ಕನ್ನಡ
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
              <button
                onClick={() => {
                  onQuickBook();
                  setMobileMenuOpen(false);
                }}
                className="w-full min-h-[44px] py-2.5 px-4 flex items-center justify-center text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-sm"
              >
                {t('nav.bookAppointment')}
              </button>
              <button
                onClick={() => handleNavClick('emergency')}
                className="w-full min-h-[44px] py-2.5 px-4 flex items-center justify-center gap-2 text-sm font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
              >
                <PhoneCall className="w-4 h-4 shrink-0" />
                <span>{t('nav.emergency')}</span>
              </button>
              {session ? (
                <div className="flex items-center justify-between px-2 pt-1">
                  <button
                    onClick={() => {
                      handleNavClick(session.role === 'admin' ? 'admin' : 'dashboard');
                    }}
                    className="text-sm font-medium text-teal-700 flex items-center gap-1.5"
                  >
                    <User className="w-4 h-4" />
                    {session.role === 'admin' ? t('nav.adminDashboard') : t('nav.patientDashboard')}
                  </button>
                  <button
                    onClick={() => {
                      onLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="text-xs text-rose-600 font-semibold"
                  >
                    {t('nav.signOut')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    onOpenAuth();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full min-h-[44px] py-2.5 px-4 text-center text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  {t('nav.loginRegisterDemo')}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
