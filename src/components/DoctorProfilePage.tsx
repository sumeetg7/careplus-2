import React from 'react';
import { Doctor } from '../types';
import {
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  MapPin,
  Star,
  Award,
  CheckCircle2,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';

interface DoctorProfilePageProps {
  doctor: Doctor;
  onBack: () => void;
  onBookAppointment: (doctor: Doctor) => void;
}

export const DoctorProfilePage: React.FC<DoctorProfilePageProps> = ({
  doctor,
  onBack,
  onBookAppointment,
}) => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-page-enter">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        <span>Back to Doctors Directory</span>
      </button>

      {/* Main Profile Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="relative shrink-0">
            {doctor.photoUrl ? (
              <img
                src={doctor.photoUrl}
                alt={doctor.name}
                referrerPolicy="no-referrer"
                className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl object-cover border border-slate-200 shadow-sm"
              />
            ) : (
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-teal-50 text-teal-700 font-extrabold text-3xl flex items-center justify-center border border-teal-100">
                {doctor.name.split(' ')[1]?.[0] || 'Dr'}
              </div>
            )}
            {doctor.isAvailableToday && (
              <span className="absolute bottom-2 right-2 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm" title="Available today" />
            )}
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-teal-700 uppercase tracking-wider bg-teal-50 px-2.5 py-0.5 rounded-md">
                  {doctor.departmentName} OPD
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                  {doctor.name}
                </h1>
              </div>

              <div className="text-right">
                <div className="text-[11px] font-bold text-slate-400 uppercase">Consultation Fee</div>
                <div className="text-2xl font-extrabold font-mono text-slate-900">
                  ₹{doctor.consultationFee}
                </div>
              </div>
            </div>

            <p className="text-sm font-semibold text-slate-700">
              {doctor.specialization}
            </p>
            <p className="text-xs text-slate-500">
              {doctor.qualification}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-2 border-t border-slate-100">
              <span className="flex items-center gap-1 font-bold text-amber-600">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                {doctor.rating} / 5.0
              </span>
              <span>·</span>
              <span className="flex items-center gap-1 font-medium">
                <Award className="w-4 h-4 text-teal-600" />
                {doctor.experienceYears} Years Clinical Experience
              </span>
              <span>·</span>
              <span className="flex items-center gap-1 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Certified Medical Faculty
              </span>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Clock className="w-4 h-4 text-teal-600" />
            <span>Today's Status: </span>
            <strong className={doctor.isAvailableToday ? 'text-emerald-700' : 'text-slate-500'}>
              {doctor.isAvailableToday ? 'On OPD Duty Today' : 'Off-duty today (Available next scheduled slot)'}
            </strong>
          </div>

          <button
            onClick={() => onBookAppointment(doctor)}
            className="w-full sm:w-auto px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer text-center"
          >
            Book Appointment with {doctor.name}
          </button>
        </div>
      </div>

      {/* Grid: Schedule details and Biography */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 1 Col: Schedule Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            OPD Schedule &amp; Room
          </h3>

          <div className="space-y-3.5 text-xs text-slate-600">
            <div>
              <span className="text-slate-400 block mb-0.5 text-[11px] font-semibold">Consultation Hours</span>
              <span className="text-sm font-bold text-slate-800">{doctor.availableTime}</span>
            </div>

            <div>
              <span className="text-slate-400 block mb-1 text-[11px] font-semibold">Consultation Days</span>
              <div className="flex flex-wrap gap-1.5">
                {doctor.availableDays.map((day) => (
                  <span
                    key={day}
                    className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium"
                  >
                    {day}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5 text-[11px] font-semibold">Consultation Room</span>
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-teal-600" />
                {doctor.roomNumber}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-slate-400 block mb-0.5 text-[11px] font-semibold">Estimated Duration</span>
              <span className="text-slate-700">15–20 minutes per consultation</span>
            </div>
          </div>
        </div>

        {/* Right 2 Cols: Doctor Biography and Clinical Focus */}
        <div className="md:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 space-y-4 shadow-xs">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Clinical Background &amp; Profile
          </h3>

          <p className="text-sm text-slate-700 leading-relaxed font-normal">
            {doctor.bio}
          </p>

          <div className="pt-3 border-t border-slate-100 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Specialist Clinical Focus
            </h4>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
              <li>Comprehensive diagnostic clinical evaluation and patient counseling</li>
              <li>Evidence-based medical management tailored to chronic or acute presentations</li>
              <li>Collaborative inter-departmental referrals with radiology and pathology</li>
              <li>Post-treatment follow-up and preventive wellness care</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Verified Patient Feedback Section */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Verified Patient Reviews &amp; Feedback
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Authentic reviews submitted by patients with confirmed CarePlus appointment tokens.
            </p>
          </div>

          <div className="text-right">
            <div className="flex items-center gap-1 text-amber-500 text-sm font-extrabold">
              <Star className="w-4 h-4 fill-amber-400" />
              <span>{doctor.rating} / 5</span>
            </div>
            <div className="text-[11px] text-slate-400">Based on {doctor.reviewCount} visits</div>
          </div>
        </div>

        <div className="space-y-4">
          {doctor.reviews.length > 0 ? (
            doctor.reviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-slate-50 rounded-2xl p-4.5 border border-slate-100 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{rev.patientName}</span>
                    <span className="text-emerald-700 text-[10px] font-bold flex items-center gap-0.5 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Verified Visit
                    </span>
                  </div>
                  <span className="text-slate-400 font-medium">{rev.date}</span>
                </div>

                <div className="flex items-center gap-1 text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                      }`}
                    />
                  ))}
                </div>

                <p className="text-xs text-slate-700 leading-relaxed italic">
                  "{rev.comment}"
                </p>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
              No individual written reviews logged yet for this specialist. OPD exit ratings are aggregated above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
