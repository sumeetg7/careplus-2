import React, { useState } from 'react';
import { UserSession } from '../types';
import { setSession } from '../services/storageService';
import { X, User, ShieldCheck, HeartPulse, Sparkles, Lock } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (session: UserSession) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [mode, setMode] = useState<'patient' | 'admin'>('patient');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePatientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError('Please provide your name and 10-digit mobile number.');
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

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const session: UserSession = {
      id: 'admin-01',
      name: 'Hospital Administrator',
      phone: '9999900000',
      role: 'admin',
    };
    setSession(session);
    onLoginSuccess(session);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-1.5 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-700 to-teal-500 text-white flex items-center justify-center mx-auto mb-2 shadow-sm">
            <HeartPulse className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            CarePlus Hospital Portal
          </h2>
          <p className="text-xs text-slate-500">
            Sign in to access your appointments and live token queue.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100 rounded-xl mb-5 text-xs font-bold">
          <button
            onClick={() => {
              setMode('patient');
              setError(null);
            }}
            className={`py-2 rounded-lg transition-all cursor-pointer ${
              mode === 'patient'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Patient Sign In
          </button>
          <button
            onClick={() => {
              setMode('admin');
              setError(null);
            }}
            className={`py-2 rounded-lg transition-all cursor-pointer ${
              mode === 'admin'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hospital Admin
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl mb-4 font-medium">
            {error}
          </div>
        )}

        {mode === 'patient' ? (
          <div className="space-y-4">
            <form onSubmit={handlePatientSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  placeholder="10-digit number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
              >
                Sign In to Patient Portal
              </button>
            </form>

            <div className="pt-3 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 text-center">
                Quick Demo Profiles (1-Click)
              </span>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickPatient('Devendra Sharma', '9876543210')}
                  className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs text-left flex items-center justify-between text-slate-700 cursor-pointer transition-colors"
                >
                  <span className="font-semibold">Devendra Sharma</span>
                  <span className="text-[11px] text-teal-700 font-mono font-bold">Has Token #24</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPatient('Pooja Bhatt', '9811223344')}
                  className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs text-left flex items-center justify-between text-slate-700 cursor-pointer transition-colors"
                >
                  <span className="font-semibold">Pooja Bhatt</span>
                  <span className="text-[11px] text-teal-700 font-mono font-bold">Has Token #27</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleAdminSubmit} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed">
              Hospital Admin mode grants direct controls to call OPD tokens, manage doctor schedules, and edit diagnostic test pricing.
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Admin Security PIN (Demo: 1234)
              </label>
              <input
                type="password"
                placeholder="Enter demo PIN (or click button below)"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
            >
              Sign In as Administrator &rarr;
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
