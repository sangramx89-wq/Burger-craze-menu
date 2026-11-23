import React from 'react';
import { Clock, MapPin, Phone, Utensils } from 'lucide-react';
import { CafeInfo, StorefrontTheme } from '../types/index.ts';

interface CafeInfoStripProps {
  cafeInfo: CafeInfo;
  tableLabel?: string | null;
  theme?: StorefrontTheme;
}

export const CafeInfoStrip: React.FC<CafeInfoStripProps> = React.memo(({
  cafeInfo,
  tableLabel,
  theme = 'classic',
}) => {
  const isNeu = theme === 'warm-amber-neumorphism';
  const sanitizedPhone = cafeInfo.contactNumber.replace(/[^\d+]/g, '');

  return (
    <div className="px-3.5 sm:px-6 lg:px-8 w-full max-w-6xl mx-auto">
      <div
        className={`rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs transition-colors duration-300 ${
          isNeu
            ? 'neu-card text-[#5E4229]'
            : 'cream-neu-card text-[#5E4232]'
        }`}
      >
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <Clock
              className={`w-3.5 h-3.5 shrink-0 ${
                isNeu ? 'text-[#B45309]' : 'text-[#B94F2E]'
              }`}
            />
            <span className="font-medium truncate">{cafeInfo.openingHours}</span>
          </div>

          <span
            aria-hidden="true"
            className="hidden sm:inline text-[#C9AE97]"
          >
            ·
          </span>

          <div className="flex items-center gap-2 min-w-0">
            <MapPin
              className={`w-3.5 h-3.5 shrink-0 ${
                isNeu ? 'text-[#B45309]' : 'text-[#B94F2E]'
              }`}
            />
            <span className="truncate">{cafeInfo.location}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {sanitizedPhone ? (
            <a
              href={`tel:${sanitizedPhone}`}
              className={`flex items-center gap-1.5 font-semibold tabular-nums hover:underline ${
                isNeu ? 'text-[#B45309]' : 'text-[#B94F2E]'
              }`}
            >
              <Phone className="w-3.5 h-3.5 shrink-0" />
              <span>{cafeInfo.contactNumber}</span>
            </a>
          ) : (
            <span className="flex items-center gap-1.5 font-medium tabular-nums">
              <Phone className="w-3.5 h-3.5 shrink-0" />
              <span>{cafeInfo.contactNumber}</span>
            </span>
          )}

          {tableLabel && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold tabular-nums ${
                isNeu
                  ? 'neu-inset text-[#B45309]'
                  : 'cream-neu-inset text-[#B94F2E]'
              }`}
            >
              <Utensils className="w-3 h-3 shrink-0" />
              <span>Table {tableLabel}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
});
