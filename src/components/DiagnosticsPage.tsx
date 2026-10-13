import React, { useState } from 'react';
import { DiagnosticService } from '../types';
import { DIAGNOSTIC_IMAGE } from '../data/initialData';
import {
  Search,
  Clock,
  FileText,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Calendar,
  Sparkles,
  Info,
  MapPin,
  Activity,
  Droplet,
  Layers,
} from 'lucide-react';

interface DiagnosticsPageProps {
  diagnostics: DiagnosticService[];
  onBookService: (service: DiagnosticService) => void;
}

export const DiagnosticsPage: React.FC<DiagnosticsPageProps> = ({
  diagnostics,
  onBookService,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'All' | 'Radiology' | 'Pathology'>('All');

  const filtered = diagnostics.filter((diag) => {
    const matchCat = activeCategory === 'All' || diag.category === activeCategory;
    const matchSearch =
      diag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      diag.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      diag.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const getServiceIcon = (category: string) => {
    if (category === 'Radiology') {
      return <Layers className="w-5 h-5 text-indigo-500" />;
    }
    return <Droplet className="w-5 h-5 text-rose-500" />;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 animate-page-enter">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950 text-white rounded-3xl overflow-hidden relative border border-slate-800 shadow-xl">
        <div className="absolute inset-0 z-0">
          <img
            src={DIAGNOSTIC_IMAGE}
            alt="CarePlus Diagnostic Center"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/90 to-slate-900/60" />
        </div>

        <div className="relative z-10 p-6 sm:p-10 max-w-3xl space-y-4">
          <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">
            Diagnostic &amp; Imaging Wing
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Diagnostic &amp; Pathology Services
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed font-normal">
            Precision clinical diagnostics powered by 1.5 Tesla MRI, multi-detector CT, digital X-Ray, ultrasound, and automated central pathology lab. Clear test preparation instructions and estimated reporting times provided upfront.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-2">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-400" />
              NABL Standard Protocols
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-400" />
              Transparent Demo Rates
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-400" />
              Same-day Digital Delivery
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search scans, blood tests, X-rays..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl w-full md:w-auto overflow-x-auto">
          {(['All', 'Radiology', 'Pathology'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                activeCategory === cat
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat === 'All' ? 'All Services' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Diagnostics Cards Grid with Lift & Hover */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((diag) => (
          <div
            key={diag.id}
            className="group bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between card-hover-effect relative overflow-hidden"
          >
            {/* Top gradient highlight on hover */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                    {getServiceIcon(diag.category)}
                  </div>
                  <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md">
                    {diag.category}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Approx. Fee</span>
                  <span className="text-xl font-bold font-mono text-slate-900">
                    ₹{diag.approxFee}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                  {diag.name}
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed line-clamp-2">
                  {diag.description}
                </p>
              </div>

              <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Test Duration:
                  </span>
                  <span className="font-semibold text-slate-800">{diag.duration}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    Report Delivery:
                  </span>
                  <span className="font-semibold text-slate-800">{diag.reportDeliveryTime}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    Room:
                  </span>
                  <span className="text-slate-700 truncate max-w-[150px]">{diag.roomNumber}</span>
                </div>
              </div>

              {/* Instructions Preview */}
              <div className="text-xs text-slate-600 space-y-1">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  <Info className="w-3 h-3 text-teal-600" />
                  Preparation Note:
                </div>
                <p className="text-[11px] text-slate-500 leading-normal line-clamp-2">
                  {diag.preparationInstructions}
                </p>
              </div>

              {/* Available Slots Preview */}
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                  Available Slots Today:
                </span>
                <div className="flex flex-wrap gap-1">
                  {diag.availableSlots.slice(0, 3).map((slot) => (
                    <span
                      key={slot}
                      className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] rounded font-medium"
                    >
                      {slot}
                    </span>
                  ))}
                  {diag.availableSlots.length > 3 && (
                    <span className="px-1.5 py-0.5 text-slate-400 text-[10px]">
                      +{diag.availableSlots.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100">
              <button
                onClick={() => onBookService(diag)}
                className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer text-center"
              >
                Book Service Slot
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center text-sm text-slate-500">
          No diagnostic services found for your query. Try clearing the search or category filter.
        </div>
      )}
    </div>
  );
};
