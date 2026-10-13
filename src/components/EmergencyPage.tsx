import React from 'react';
import {
  PhoneCall,
  AlertTriangle,
  HeartPulse,
  Clock,
  ShieldCheck,
  MapPin,
  Ambulance,
  Activity,
  CheckCircle2,
  FileWarning,
} from 'lucide-react';

export const EmergencyPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 animate-page-enter">
      {/* Red Alert Header Banner */}
      <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-slate-950 text-white rounded-3xl p-6 sm:p-10 border border-rose-800 shadow-xl relative overflow-hidden">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-600/30 border border-rose-500/40 text-rose-200 text-xs font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping"></span>
            24x7 Emergency &amp; Trauma Care Centre
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Emergency Care Services
          </h1>

          <p className="text-sm sm:text-base text-rose-100 leading-relaxed font-normal">
            If you or someone nearby is experiencing acute chest pain, severe breathlessness, stroke symptoms, major trauma, or uncontrolled bleeding, do not wait. Immediate medical attention is available round-the-clock.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <a
              href="tel:108"
              className="px-6 py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-rose-600/30 hover:-translate-y-0.5 active:translate-y-0 transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <PhoneCall className="w-4 h-4 animate-bounce" />
              <span>Dial 108 (National Ambulance)</span>
            </a>

            <div className="px-5 py-3.5 bg-rose-900/60 border border-rose-700 rounded-xl text-sm text-rose-200 font-mono font-bold">
              CarePlus ER Hotline: <strong className="text-white">+91 800 227 3758</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Ethical Emergency Declaration */}
      <div className="bg-white rounded-3xl border-2 border-emerald-500/80 p-6 sm:p-8 space-y-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
              Ethical Hospital Charter
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Emergency Treatment is Never Contingent on Payment or VIP Priority
            </h2>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
          At CarePlus Hospital, emergency admission, resuscitation, and life-saving stabilization are administered strictly on the basis of <strong>clinical urgency (triage acuity)</strong>. Emergency treatment is <strong>never dependent on paying extra money, deposits, or purchasing commercial priority passes</strong>. Every citizen receives immediate, impartial life-saving intervention.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <strong className="text-slate-900 block mb-1">Zero Upfront Barrier</strong>
            <span className="text-slate-600">Immediate critical care starts before any administrative billing formalities.</span>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <strong className="text-slate-900 block mb-1">Standardized Triage</strong>
            <span className="text-slate-600">Cases are sorted by vital parameters (Airway, Breathing, Circulation).</span>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <strong className="text-slate-900 block mb-1">Universal Patient Rights</strong>
            <span className="text-slate-600">Strict adherence to clinical ethics and national trauma protocols.</span>
          </div>
        </div>
      </div>

      {/* Triage Acuity System */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs">
        <div>
          <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">
            Clinical Protocol
          </span>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Emergency Triage Priority Levels
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Upon arrival at the ER, a specialized triage nursing officer evaluates vitals to assign immediate care:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl border border-rose-200 bg-rose-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-bold text-xs">
                RED · Resuscitation
              </span>
              <span className="text-xs font-mono font-bold text-rose-700">Immediate (0 mins)</span>
            </div>
            <h4 className="text-sm font-bold text-slate-900">Life-Threatening Emergency</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Cardiac arrest, severe respiratory failure, unconsciousness, massive arterial hemorrhage, major vehicular trauma.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-600 text-white font-bold text-xs">
                YELLOW · Urgent
              </span>
              <span className="text-xs font-mono font-bold text-amber-700">&lt; 15 mins</span>
            </div>
            <h4 className="text-sm font-bold text-slate-900">Potentially Serious</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Severe asthma attack, open fractures, persistent high fever with seizures, intense abdominal colic, deep lacerations.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-xs">
                GREEN · Non-Urgent
              </span>
              <span className="text-xs font-mono font-bold text-emerald-700">Routine Queue</span>
            </div>
            <h4 className="text-sm font-bold text-slate-900">Minor Illness &amp; Injury</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Minor sprains, mild abrasions, chronic backache, suture removals. Patients are safely routed to regular OPD counters.
            </p>
          </div>
        </div>
      </div>

      {/* Emergency First-Aid Guidelines */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs">
        <h2 className="text-xl font-bold text-slate-900">
          What To Do While Help Is On The Way
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-700">
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-rose-600" />
              Suspected Heart Attack
            </h4>
            <ul className="space-y-1.5 list-disc list-inside text-slate-600">
              <li>Have the patient sit down in a relaxed half-sitting position with knees bent.</li>
              <li>Loosen tight clothing around neck and waist.</li>
              <li>Do not give heavy food or water. Keep patient calm and reassure them.</li>
              <li>Call 108 or our Emergency Desk immediately.</li>
            </ul>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" />
              Suspected Stroke (F.A.S.T.)
            </h4>
            <ul className="space-y-1.5 list-disc list-inside text-slate-600">
              <li><strong>Face:</strong> Ask to smile. Does one side of the face droop?</li>
              <li><strong>Arms:</strong> Ask to raise both arms. Does one arm drift downward?</li>
              <li><strong>Speech:</strong> Ask to repeat a simple sentence. Is speech slurred?</li>
              <li><strong>Time:</strong> Call emergency immediately. Note the exact time symptoms started.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ER Location & Arrival Protocol */}
      <div className="bg-slate-100 rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-xs">
        <div className="space-y-1">
          <strong className="text-sm font-bold text-slate-900 block flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-teal-600" />
            Direct ER Ramp &amp; Ambulance Bay
          </strong>
          <p className="text-slate-600">
            Dedicated North Gate Ramp (Gate 2). Direct stretcher access into Trauma Bay Room 01. Open 24/7/365.
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-slate-400 block text-[11px]">Direct Casualty Tel</span>
          <span className="text-base font-mono font-bold text-slate-900">+91 22 2899 0108</span>
        </div>
      </div>
    </div>
  );
};
