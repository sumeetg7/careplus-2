import React from 'react';
import { HeartPulse, PhoneCall, MapPin, Mail, ShieldCheck, Heart, Clock } from 'lucide-react';

interface FooterProps {
  onNavigate: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-slate-900 text-slate-400 text-sm border-t border-slate-800">
      {/* Top Clinical Accreditation Bar */}
      <div className="bg-slate-950/80 border-b border-slate-800/80 py-3.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-teal-400"></span>
            <span>
              <strong>NABH &amp; NABL Accredited Healthcare Standards:</strong> Patient safety, digital queue transparency, and ethical consultation protocols.
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Hospital ID: <strong>CPH-DEL-0482</strong></span>
            <span>·</span>
            <span>Central Hospital Information System (CHIS)</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: About */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-sm">
                <HeartPulse className="w-5 h-5" />
              </div>
              <span className="text-white text-base font-bold tracking-tight">CarePlus Hospital</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Better Care. Easier Access. A comprehensive digital healthcare portal streamlining outpatient consultations, high-precision diagnostics, and live patient queue monitoring.
            </p>
            <div className="text-xs text-teal-400 flex items-center gap-1.5 pt-1">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>Certified Multi-Specialty Medical Center</span>
            </div>
          </div>

          {/* Col 2: Quick Navigation */}
          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">
              Clinical Services
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => onNavigate('departments')} className="hover:text-white transition-colors cursor-pointer">
                  Hospital Departments
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('doctors')} className="hover:text-white transition-colors cursor-pointer">
                  Find Doctors &amp; OPD Schedule
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('diagnostics')} className="hover:text-white transition-colors cursor-pointer">
                  Diagnostic &amp; Pathology Tests
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('appointments')} className="hover:text-white transition-colors cursor-pointer">
                  Book Consultation Slot
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('queue')} className="hover:text-white transition-colors cursor-pointer">
                  Live Token &amp; Queue Tracker
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Patient Care & Community */}
          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">
              Patient Care
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => onNavigate('feedback')} className="hover:text-white transition-colors cursor-pointer">
                  Verified Patient Feedback
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('emergency')} className="text-rose-400 hover:text-rose-300 transition-colors cursor-pointer font-medium">
                  Emergency Trauma &amp; Triage
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('dashboard')} className="hover:text-white transition-colors cursor-pointer">
                  Patient Health Dashboard
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('admin')} className="hover:text-white transition-colors cursor-pointer">
                  Hospital Admin Control Panel
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Contact & Hours */}
          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">
              Emergency &amp; Location
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <PhoneCall className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-white font-semibold">24x7 Ambulance: 108</div>
                  <div className="text-slate-400">Hospital Desk: +91 800 227 3758</div>
                </div>
              </div>
              <div className="flex items-start gap-2 pt-1">
                <MapPin className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <div>
                  CarePlus Medical Center, Civic Centre Road, Sector 4
                </div>
              </div>
              <div className="flex items-start gap-2 pt-1">
                <Clock className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <div className="text-slate-400">
                  OPD: Mon - Sat: 8:00 AM - 8:00 PM<br />
                  Emergency Trauma: 24 Hours / 365 Days
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-slate-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            © 2026 CarePlus Hospital Doctor &amp; Diagnostic Management System. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-400">
              Dedicated to compassionate, transparent healthcare
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
