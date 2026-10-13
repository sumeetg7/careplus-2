import React, { useState, useEffect } from 'react';
import { UserSession } from '../types';
import {
  HeartPulse,
  Menu,
  X,
  PhoneCall,
  User,
  ShieldCheck,
  ChevronDown,
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { id: 'home', label: 'Home' },
    { id: 'departments', label: 'Departments' },
    { id: 'doctors', label: 'Doctors' },
    { id: 'diagnostics', label: 'Diagnostics' },
    { id: 'appointments', label: 'Appointments' },
    { id: 'queue', label: 'Queue Status' },
    { id: 'feedback', label: 'Feedback' },
    { id: 'emergency', label: 'Emergency' },
  ];

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 transition-all duration-300">
      {/* Top Clinical & Emergency Bar */}
      <div className="bg-slate-900 text-slate-300 px-4 sm:px-6 lg:px-8 py-1.5 text-xs border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-rose-400 font-semibold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              24x7 Emergency &amp; Trauma Care
            </span>
            <span className="hidden md:inline text-slate-500">·</span>
            <span className="hidden md:inline text-slate-300">
              Hotline: <strong className="text-white font-mono font-bold tracking-wider">108 / +91-800-CAREPLUS</strong>
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span className="hidden sm:inline text-[11px] text-teal-400/90 font-medium">
              OPD Hours: Mon - Sat (8:00 AM - 8:00 PM)
            </span>
            <span className="hidden sm:inline text-slate-600">|</span>
            <button
              onClick={() => handleNavClick('emergency')}
              className="text-rose-400 hover:text-rose-300 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <PhoneCall className="w-3 h-3" />
              <span>ER Help</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Glass Navbar */}
      <div
        className={`transition-all duration-300 ${
          isScrolled
            ? 'bg-white/90 backdrop-blur-md shadow-sm border-b border-slate-200/80 py-2.5'
            : 'bg-white/95 backdrop-blur-sm border-b border-slate-200 py-3.5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Zone 1: Single text element Brand Wordmark */}
            <button
              onClick={() => handleNavClick('home')}
              className="flex items-center gap-3 text-left group cursor-pointer focus:outline-none"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-700 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-teal-500/20 group-hover:scale-105 transition-transform duration-200">
                <HeartPulse className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-slate-900 block leading-tight">
                  CarePlus Hospital
                </span>
                <span className="text-[11px] text-teal-600 font-medium block tracking-wide">
                  Better Care. Easier Access.
                </span>
              </div>
            </button>

            {/* Zone 2: Navigation Links with Animated Underline */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
              {navLinks.map((link) => {
                const isActive = activeTab === link.id;
                const isEmergency = link.id === 'emergency';
                return (
                  <button
                    key={link.id}
                    onClick={() => handleNavClick(link.id)}
                    className={`relative px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'text-teal-700 font-bold bg-teal-50/70'
                        : isEmergency
                        ? 'text-rose-600 hover:text-rose-700 hover:bg-rose-50/50'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {link.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-teal-600 rounded-full animate-in fade-in duration-200" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Zone 3: Primary Actions */}
            <div className="hidden sm:flex items-center gap-3">
              <button
                onClick={onQuickBook}
                className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 rounded-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer whitespace-nowrap"
              >
                Book Appointment
              </button>

              {session ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleNavClick(session.role === 'admin' ? 'admin' : 'dashboard')}
                    className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap border border-slate-200/60"
                  >
                    <User className="w-3.5 h-3.5 text-teal-600" />
                    <span>{session.role === 'admin' ? 'Admin Panel' : session.name.split(' ')[0]}</span>
                  </button>
                  <button
                    onClick={onLogout}
                    className="text-xs text-slate-400 hover:text-slate-700 px-1 py-1 transition-colors cursor-pointer"
                    title="Sign out"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap shadow-xs"
                >
                  Login / Register
                </button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="flex items-center sm:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none transition-colors"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 pt-2 pb-5 space-y-1 shadow-lg animate-in slide-in-from-top-2 duration-200">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => handleNavClick(link.id)}
              className={`block w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === link.id
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {link.label}
            </button>
          ))}
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <button
              onClick={() => {
                onQuickBook();
                setMobileMenuOpen(false);
              }}
              className="w-full py-2.5 text-center text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-sm"
            >
              Book Appointment
            </button>
            {session ? (
              <div className="flex items-center justify-between px-2 pt-2">
                <button
                  onClick={() => {
                    handleNavClick(session.role === 'admin' ? 'admin' : 'dashboard');
                  }}
                  className="text-sm font-medium text-teal-700 flex items-center gap-1.5"
                >
                  <User className="w-4 h-4" />
                  {session.role === 'admin' ? 'Admin Dashboard' : 'Patient Dashboard'}
                </button>
                <button
                  onClick={() => {
                    onLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="text-xs text-rose-600 font-semibold"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  onOpenAuth();
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2.5 text-center text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Login / Register (Demo)
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
