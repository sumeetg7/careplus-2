import React, { useState, useMemo } from 'react';
import { Department, Doctor } from '../types';
import {
  Search,
  Star,
  Clock,
  Calendar,
  DollarSign,
  Award,
  MapPin,
  CheckCircle2,
  Filter,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface DoctorsPageProps {
  departments: Department[];
  doctors: Doctor[];
  selectedDepartmentId?: string;
  onSelectDoctor: (doctorId: string) => void;
  onBookDoctor: (doctor: Doctor) => void;
}

export const DoctorsPage: React.FC<DoctorsPageProps> = ({
  departments,
  doctors,
  selectedDepartmentId,
  onSelectDoctor,
  onBookDoctor,
}) => {
  const [activeDepartment, setActiveDepartment] = useState<string>(selectedDepartmentId || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyAvailableToday, setOnlyAvailableToday] = useState(false);

  React.useEffect(() => {
    if (selectedDepartmentId) {
      setActiveDepartment(selectedDepartmentId);
    }
  }, [selectedDepartmentId]);

  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      const matchDept = activeDepartment === 'all' || doc.departmentId === activeDepartment;
      const matchSearch =
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.departmentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.qualification.toLowerCase().includes(searchQuery.toLowerCase());
      const matchAvail = !onlyAvailableToday || doc.isAvailableToday;

      return matchDept && matchSearch && matchAvail;
    });
  }, [doctors, activeDepartment, searchQuery, onlyAvailableToday]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-page-enter">
      {/* Page Header */}
      <div className="space-y-2 pb-6 border-b border-slate-200">
        <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">
          Medical Directory
        </span>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Consulting Doctors &amp; Specialists
        </h1>
        <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
          Select a department to view specialists, their clinical background, availability, and OPD consultation fees. In accordance with ethical medical guidance, doctors are presented transparently without subjective rankings.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          {/* Search */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by doctor name, specialty, or condition..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
            />
          </div>

          {/* Availability checkbox */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer select-none bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={onlyAvailableToday}
                onChange={(e) => setOnlyAvailableToday(e.target.checked)}
                className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
              />
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Available in OPD Today
              </span>
            </label>
          </div>
        </div>

        {/* Interactive Segmented Department Filter */}
        <div className="pt-3 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveDepartment('all')}
            className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all duration-200 cursor-pointer ${
              activeDepartment === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            All Departments ({doctors.length})
          </button>
          {departments.map((dept) => {
            const count = doctors.filter((d) => d.departmentId === dept.id).length;
            const isActive = activeDepartment === dept.id;
            return (
              <button
                key={dept.id}
                onClick={() => setActiveDepartment(dept.id)}
                className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
                }`}
              >
                {dept.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Doctor Cards Grid with 1.03x Zoom and Pulsing Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDoctors.map((doc) => (
          <div
            key={doc.id}
            className="group bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between card-hover-effect relative overflow-hidden"
          >
            {/* Top accent on hover */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="space-y-4">
              {/* Doctor Header with Photo & Pulsing Status */}
              <div className="flex items-start gap-4">
                <div className="relative shrink-0 overflow-hidden rounded-2xl">
                  {doc.photoUrl ? (
                    <img
                      src={doc.photoUrl}
                      alt={doc.name}
                      referrerPolicy="no-referrer"
                      className="w-18 h-18 rounded-2xl object-cover border border-slate-200 group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-18 h-18 rounded-2xl bg-teal-50 text-teal-700 font-bold text-xl flex items-center justify-center border border-teal-100">
                      {doc.name.split(' ')[1]?.[0] || 'Dr'}
                    </div>
                  )}
                  {doc.isAvailableToday && (
                    <span
                      className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-xs"
                      title="Available in OPD today"
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-slate-900 truncate group-hover:text-teal-700 transition-colors">
                    {doc.name}
                  </h3>
                  <p className="text-xs text-teal-700 font-medium truncate mt-0.5">
                    {doc.specialization}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {doc.qualification}
                  </p>

                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                    <span className="flex items-center gap-1 text-amber-600 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      {doc.rating}
                    </span>
                    <span>·</span>
                    <span>{doc.reviewCount} reviews</span>
                    <span>·</span>
                    <span>{doc.experienceYears} yrs</span>
                  </div>
                </div>
              </div>

              {/* Status and Department Badge */}
              <div className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-700 font-medium">{doc.departmentName}</span>
                <span
                  className={`text-[11px] font-semibold flex items-center gap-1.5 ${
                    doc.isAvailableToday ? 'text-emerald-700' : 'text-slate-400'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      doc.isAvailableToday ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                    }`}
                  />
                  {doc.isAvailableToday ? 'In OPD Today' : 'Next Shift'}
                </span>
              </div>

              {/* Consultation Details */}
              <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Available Hours:
                  </span>
                  <span className="font-semibold text-slate-800">{doc.availableTime}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Days:
                  </span>
                  <span className="font-medium text-slate-700 truncate max-w-[170px]" title={doc.availableDays.join(', ')}>
                    {doc.availableDays.join(', ')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    Room:
                  </span>
                  <span className="text-slate-700">{doc.roomNumber}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-500">Consultation Fee:</span>
                  <span className="text-base font-bold font-mono text-slate-900">
                    ₹{doc.consultationFee}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 mt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
              <button
                onClick={() => onSelectDoctor(doc.id)}
                className="py-2.5 px-3 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer text-center"
              >
                View Profile
              </button>
              <button
                onClick={() => onBookDoctor(doc)}
                className="py-2.5 px-3 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer text-center"
              >
                Book Appointment
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredDoctors.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center space-y-3">
          <p className="text-sm font-semibold text-slate-700">No doctors match your selected criteria.</p>
          <button
            onClick={() => {
              setActiveDepartment('all');
              setSearchQuery('');
              setOnlyAvailableToday(false);
            }}
            className="text-xs font-bold text-teal-600 hover:text-teal-700 cursor-pointer underline"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
};
