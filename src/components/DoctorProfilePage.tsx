import React from 'react';
import { useTranslation } from 'react-i18next';
import { Doctor } from '../types';
import { translateDepartmentName, translateDayName } from '../i18n';
import { motion } from 'motion/react';
import { APPLE_EASE, RevealSection, StaggerGrid, StaggerCard } from './MotionPrimitives';
import { DoctorAvatar } from './DoctorAvatar';
import {
  ArrowLeft,
  Clock,
  MapPin,
  Star,
  Award,
  CheckCircle2,
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
  const { t } = useTranslation();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back button */}
      <motion.button
        whileHover={{ x: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        <span>{t('doctorProfile.backToDirectory')}</span>
      </motion.button>

      {/* Main Profile Header Card */}
      <RevealSection direction="up">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm group">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <DoctorAvatar
              name={doctor.name}
              photoUrl={doctor.photoUrl}
              isAvailableToday={doctor.isAvailableToday}
              availabilityTitle={t('common.available')}
              size="xl"
            />

          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-teal-700 uppercase tracking-wider bg-teal-50 px-2.5 py-0.5 rounded-md">
                  {t('doctorProfile.opdSuffix', { department: translateDepartmentName(t, doctor.departmentName) })}
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                  {doctor.name}
                </h1>
              </div>

              <div className="text-right">
                <div className="text-[11px] font-bold text-slate-400 uppercase">{t('doctorProfile.consultationFee')}</div>
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
                {t('doctorProfile.experienceYears', { years: doctor.experienceYears })}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                {t('doctorProfile.certifiedFaculty')}
              </span>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Clock className="w-4 h-4 text-teal-600 shrink-0" />
            <span>{t('doctorProfile.todayStatus')} </span>
            <strong className={doctor.isAvailableToday ? 'text-emerald-700' : 'text-slate-500'}>
              {doctor.isAvailableToday ? t('doctorProfile.onOpdDuty') : t('doctorProfile.offDutyNextSlot')}
            </strong>
          </div>

          <motion.button
            whileHover={{ y: -1.5, scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.18, ease: APPLE_EASE }}
            onClick={() => onBookAppointment(doctor)}
            className="w-full sm:w-auto px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer text-center"
          >
            {t('doctorProfile.bookWith', { name: doctor.name })}
          </motion.button>
        </div>
        </div>
      </RevealSection>

      {/* Grid: Schedule details and Biography */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 1 Col: Schedule Card */}
        <RevealSection direction="left" delay={0.05} className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            {t('doctorProfile.scheduleTitle')}
          </h3>

          <div className="space-y-3.5 text-xs text-slate-600">
            <div>
              <span className="text-slate-400 block mb-0.5 text-[11px] font-semibold">{t('doctorProfile.consultationHours')}</span>
              <span className="text-sm font-bold text-slate-800">{doctor.availableTime}</span>
            </div>

            <div>
              <span className="text-slate-400 block mb-1 text-[11px] font-semibold">{t('doctorProfile.consultationDays')}</span>
              <div className="flex flex-wrap gap-1.5">
                {doctor.availableDays.map((day) => (
                  <span
                    key={day}
                    className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium"
                  >
                    {translateDayName(t, day)}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5 text-[11px] font-semibold">{t('doctorProfile.consultationRoom')}</span>
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-teal-600" />
                {doctor.roomNumber}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-slate-400 block mb-0.5 text-[11px] font-semibold">{t('doctorProfile.estimatedDuration')}</span>
              <span className="text-slate-700">{t('doctorProfile.durationEstimateValue')}</span>
            </div>
          </div>
        </RevealSection>

        {/* Right 2 Cols: Doctor Biography and Clinical Focus */}
        <RevealSection direction="right" delay={0.08} className="md:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 space-y-4 shadow-xs">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            {t('doctorProfile.clinicalBackground')}
          </h3>

          <p className="text-sm text-slate-700 leading-relaxed font-normal">
            {doctor.bio}
          </p>

          <div className="pt-3 border-t border-slate-100 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              {t('doctorProfile.clinicalFocus')}
            </h4>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
              <li>{t('doctorProfile.focus1')}</li>
              <li>{t('doctorProfile.focus2')}</li>
              <li>{t('doctorProfile.focus3')}</li>
              <li>{t('doctorProfile.focus4')}</li>
            </ul>
          </div>
        </RevealSection>
      </div>

      {/* Verified Patient Feedback Section */}
      <RevealSection direction="up" delay={0.1}>
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {t('doctorProfile.reviewsTitle')}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('doctorProfile.reviewsSubtitle')}
            </p>
          </div>

          <div className="text-right shrink-0">
            <div className="flex items-center gap-1 text-amber-500 text-sm font-extrabold">
              <Star className="w-4 h-4 fill-amber-400" />
              <span>{doctor.rating} / 5</span>
            </div>
            <div className="text-[11px] text-slate-400">{t('doctorProfile.basedOnVisits', { count: doctor.reviewCount })}</div>
          </div>
        </div>

        <StaggerGrid className="space-y-4">
          {doctor.reviews.length > 0 ? (
            doctor.reviews.map((rev) => (
              <StaggerCard
                key={rev.id}
                className="bg-slate-50 rounded-2xl p-4.5 border border-slate-100 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{rev.patientName}</span>
                    <span className="text-emerald-700 text-[10px] font-bold flex items-center gap-0.5 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      {t('common.verifiedVisit')}
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
              </StaggerCard>
            ))
          ) : (
            <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
              {t('doctorProfile.noReviews')}
            </div>
          )}
        </StaggerGrid>
        </div>
      </RevealSection>
    </div>
  );
};
