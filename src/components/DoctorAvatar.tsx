import React, { useEffect, useState } from 'react';
import { Stethoscope } from 'lucide-react';

/**
 * Normalizes legacy `/src/assets/images/...` paths (which only resolve in Vite dev mode)
 * to `/images/...` served reliably from `/public/images/` in both dev and production builds.
 */
export function resolveHospitalAssetUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/src/assets/images/')) {
    return `/images/${trimmed.slice('/src/assets/images/'.length)}`;
  }
  return trimmed;
}

export function getDoctorInitials(name: string): string {
  const cleaned = name
    .replace(/^(dr\.?|prof\.?)\s+/i, '')
    .trim();
  if (!cleaned) return 'DR';
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export type DoctorAvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface DoctorAvatarProps {
  name: string;
  photoUrl?: string | null;
  isAvailableToday?: boolean;
  availabilityTitle?: string;
  size?: DoctorAvatarSize;
  className?: string;
}

const SIZE_CLASSES: Record<DoctorAvatarSize, string> = {
  sm: 'w-12 h-12 rounded-xl',
  md: 'w-18 h-18 rounded-2xl',
  lg: 'w-20 h-20 rounded-2xl',
  xl: 'w-28 h-28 sm:w-36 sm:h-36 rounded-2xl',
};

const INITIALS_TEXT_CLASSES: Record<DoctorAvatarSize, string> = {
  sm: 'text-sm font-bold',
  md: 'text-lg font-extrabold',
  lg: 'text-xl font-extrabold',
  xl: 'text-3xl sm:text-4xl font-extrabold',
};

const ICON_SIZE_CLASSES: Record<DoctorAvatarSize, string> = {
  sm: 'w-3.5 h-3.5 top-1 right-1',
  md: 'w-4 h-4 top-1.5 right-1.5',
  lg: 'w-4.5 h-4.5 top-1.5 right-1.5',
  xl: 'w-6 h-6 top-2.5 right-2.5',
};

const DOT_SIZE_CLASSES: Record<DoctorAvatarSize, string> = {
  sm: 'w-2.5 h-2.5 -bottom-0.5 -right-0.5',
  md: 'w-3.5 h-3.5 -bottom-0.5 -right-0.5',
  lg: 'w-3.5 h-3.5 -bottom-0.5 -right-0.5',
  xl: 'w-4 h-4 bottom-1 right-1',
};

/**
 * Professional doctor portrait with automatic asset-path normalization,
 * aspect-square object-cover framing, smooth hover scale, and resilient
 * healthcare-themed fallback avatar if a photo is missing or fails to load.
 */
export const DoctorAvatar: React.FC<DoctorAvatarProps> = ({
  name,
  photoUrl,
  isAvailableToday = false,
  availabilityTitle,
  size = 'md',
  className = '',
}) => {
  const resolvedSrc = resolveHospitalAssetUrl(photoUrl);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [resolvedSrc]);

  const showImage = Boolean(resolvedSrc) && !hasError;
  const initials = getDoctorInitials(name);

  return (
    <div className={`relative shrink-0 ${className}`}>
      <div
        className={`${SIZE_CLASSES[size]} aspect-square overflow-hidden border border-slate-200/90 shadow-xs bg-gradient-to-br from-teal-50 via-cyan-50 to-sky-100`}
      >
        {showImage ? (
          <img
            src={resolvedSrc}
            alt={name}
            referrerPolicy="no-referrer"
            onError={() => setHasError(true)}
            className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          />
        ) : (
          <div
            role="img"
            aria-label={name}
            className="w-full h-full relative flex flex-col items-center justify-center bg-gradient-to-br from-teal-600/10 via-cyan-500/12 to-sky-500/18 text-teal-800 select-none group-hover:scale-105 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          >
            <Stethoscope
              aria-hidden="true"
              className={`absolute text-teal-600/20 pointer-events-none ${ICON_SIZE_CLASSES[size]}`}
            />
            <span className={`tracking-tight leading-none ${INITIALS_TEXT_CLASSES[size]}`}>
              {initials}
            </span>
            {size !== 'sm' && (
              <span
                aria-hidden="true"
                className="w-5 h-0.5 rounded-full bg-teal-500/40 mt-1"
              />
            )}
          </div>
        )}
      </div>

      {isAvailableToday && (
        <span
          className={`absolute bg-emerald-500 border-2 border-white rounded-full shadow-xs ${DOT_SIZE_CLASSES[size]}`}
          title={availabilityTitle}
          aria-label={availabilityTitle}
        />
      )}
    </div>
  );
};
