import i18n, { type TFunction } from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import kn from './locales/kn.json';

export type SupportedLanguage = 'en' | 'kn';

const LANGUAGE_STORAGE_KEY = 'smartcare_lang';

export function getSavedLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') return 'en';
  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return saved === 'kn' ? 'kn' : 'en';
  } catch {
    return 'en';
  }
}

function applyDocumentLanguage(lng: SupportedLanguage) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng;
  }
}

const initialLanguage = getSavedLanguage();
applyDocumentLanguage(initialLanguage);

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    kn: { translation: kn },
  },
  lng: initialLanguage,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export function setAppLanguage(lng: SupportedLanguage): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
    }
  } catch {
    // Ignore storage quota errors
  }
  applyDocumentLanguage(lng);
  void i18n.changeLanguage(lng);
}

export function translateDepartmentName(
  t: TFunction,
  deptName: string
): string {
  const known = [
    'Cardiology',
    'Neurology',
    'Orthopedics',
    'Ophthalmology',
    'General Medicine',
    'Diagnostics Wing',
    'Diagnostic Wing',
  ];
  if (known.includes(deptName)) {
    return t(`common.departments.${deptName}`);
  }
  return deptName;
}

export function translateDiagnosticCategory(
  t: TFunction,
  category: string
): string {
  const known = ['All', 'Radiology', 'Pathology', 'Cardiology', 'General'];
  if (known.includes(category)) {
    return t(`common.categories.${category}`);
  }
  return category;
}

export function translateTokenStatus(
  t: TFunction,
  status: string
): string {
  const known = [
    'WAITING',
    'CALLED',
    'IN CONSULTATION',
    'COMPLETED',
    'SKIPPED',
    'CANCELLED',
  ];
  if (known.includes(status)) {
    return t(`common.tokenStatus.${status}`);
  }
  return status;
}

export function translateBloodAvailability(
  t: TFunction,
  status: string
): string {
  const known = ['Available', 'Low Stock', 'Out of Stock'];
  if (known.includes(status)) {
    return t(`common.bloodAvailability.${status}`);
  }
  return status;
}

export function translateBloodRequestStatus(
  t: TFunction,
  status: string
): string {
  const known = ['Pending', 'Approved', 'Rejected', 'Completed'];
  if (known.includes(status)) {
    return t(`common.bloodRequestStatus.${status}`);
  }
  return status;
}

export function translateDayName(
  t: TFunction,
  day: string
): string {
  const known = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  if (known.includes(day)) {
    return t(`common.days.${day}`);
  }
  return day;
}

export function translateGender(
  t: TFunction,
  gender: string
): string {
  if (gender === 'Female') return t('common.female');
  if (gender === 'Male') return t('common.male');
  if (gender === 'Other') return t('common.other');
  return gender;
}

export default i18n;
