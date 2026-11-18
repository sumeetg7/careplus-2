import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Department, Doctor, QueueState } from '../types';
import { translateDepartmentName } from '../i18n';
import { motion } from 'motion/react';
import { StaggerGrid, StaggerCard, RevealSection } from './MotionPrimitives';
import {
  HeartPulse,
  Brain,
  Bone,
  Eye,
  Stethoscope,
  Users,
  Clock,
  MapPin,
  ArrowRight,
  Search,
} from 'lucide-react';

interface DepartmentsPageProps {
  departments: Department[];
  doctors: Doctor[];
  queues: Record<string, QueueState>;
  onSelectDepartment: (deptId: string) => void;
  onBookAppointment: (departmentName: string) => void;
}

export const DepartmentsPage: React.FC<DepartmentsPageProps> = ({
  departments,
  doctors,
  queues,
  onSelectDepartment,
  onBookAppointment,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = departments.filter((d) => {
    const q = searchQuery.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      translateDepartmentName(t, d.name).toLowerCase().includes(q) ||
      d.description.toLowerCase().includes(q) ||
      d.headDoctor.toLowerCase().includes(q)
    );
  });

  const getDeptIcon = (code: string) => {
    switch (code) {
      case 'CARD':
        return <HeartPulse className="w-6 h-6 text-rose-500" />;
      case 'NEUR':
        return <Brain className="w-6 h-6 text-indigo-500" />;
      case 'ORTH':
        return <Bone className="w-6 h-6 text-amber-500" />;
      case 'OPHT':
        return <Eye className="w-6 h-6 text-sky-500" />;
      case 'GMED':
      default:
        return <Stethoscope className="w-6 h-6 text-teal-600" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <RevealSection direction="up">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200">
          <div className="max-w-2xl space-y-2">
            <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">
              {t('departments.eyebrow')}
            </span>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {t('departments.title')}
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              {t('departments.subtitle')}
            </p>
          </div>

          {/* Search */}
          <div className="w-full md:w-80">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={t('departments.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:shadow-sm transition-all"
              />
            </div>
          </div>
        </div>
      </RevealSection>

      {/* Interactive Department Cards Grid */}
      <StaggerGrid immediate key={searchQuery} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map((dept) => {
          const deptDoctors = doctors.filter((doc) => doc.departmentId === dept.id);
          const queue = queues[dept.id];

          return (
            <StaggerCard
              key={dept.id}
              enableTilt
              className="group bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between card-hover-effect relative overflow-hidden"
            >
              {/* Subtle top gradient accent on hover */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-13 h-13 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:scale-110 group-hover:bg-teal-50 group-hover:border-teal-200 transition-all duration-300 shadow-xs">
                    {getDeptIcon(dept.code)}
                  </div>
                  {queue && (
                    <div className="text-right bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                      <div className="text-[10px] uppercase font-bold text-slate-400">{t('departments.currentToken')}</div>
                      <div className="text-sm font-mono font-extrabold text-teal-700">
                        #{queue.currentServingToken}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                    {translateDepartmentName(t, dept.name)}
                  </h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed line-clamp-3">
                    {dept.description}
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>
                      {t('departments.departmentHead')} <strong className="text-slate-800 font-medium">{dept.headDoctor}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{t('departments.location')} {dept.roomNumber}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{t('departments.opdHours')}</span>
                  </div>
                </div>

                {/* Available Doctors preview */}
                <div className="pt-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    {t('departments.availableSpecialists', { count: deptDoctors.length })}
                  </span>
                  <div className="space-y-1.5">
                    {deptDoctors.map((doc) => (
                      <div
                        key={doc.id}
                        className="text-xs flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-50 text-slate-700 border border-slate-100"
                      >
                        <span className="font-semibold truncate">{doc.name}</span>
                        <span className="text-slate-500 text-[11px] font-mono shrink-0 ml-2">
                          ₹{doc.consultationFee}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-4 border-t border-slate-100 flex items-center gap-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onSelectDepartment(dept.id)}
                  className="flex-1 py-2.5 px-3 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 group-hover:shadow-xs"
                >
                  <span>{t('departments.viewDoctors')}</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </motion.button>
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onBookAppointment(dept.name)}
                  className="py-2.5 px-4 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer whitespace-nowrap"
                >
                  {t('departments.bookOpd')}
                </motion.button>
              </div>
            </StaggerCard>
          );
        })}
      </StaggerGrid>

      {filtered.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 space-y-2">
          <p className="text-sm font-semibold text-slate-700">{t('departments.emptyTitle', { query: searchQuery })}</p>
          <p className="text-xs text-slate-400">{t('departments.emptyHint')}</p>
        </div>
      )}
    </div>
  );
};
