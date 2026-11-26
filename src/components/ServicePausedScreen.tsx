import React from 'react';
import { Clock, MapPin, Phone, PauseCircle } from 'lucide-react';
import { BrandEmblem } from './BrandEmblem.tsx';
import { CafeInfo, ServiceControlState } from '../types/index.ts';
import { DEFAULT_CAFE_INFO } from '../catalog/menuData.ts';

interface ServicePausedScreenProps {
  brandLogo?: string | null;
  cafeInfo?: CafeInfo;
  serviceControl: ServiceControlState;
}

export const ServicePausedScreen: React.FC<ServicePausedScreenProps> = ({
  brandLogo,
  cafeInfo = DEFAULT_CAFE_INFO,
  serviceControl,
}) => {
  const cafeName = cafeInfo.cafeName?.trim() || DEFAULT_CAFE_INFO.cafeName || 'The Burger Craze';
  const tagline = cafeInfo.tagline?.trim() || DEFAULT_CAFE_INFO.tagline || 'Gourmet Burgers & Café';
  const sanitizedPhone = cafeInfo.contactNumber.replace(/[^\d+]/g, '');

  return (
    <div className="min-h-screen bg-[#F8EBDD] text-[#2D1B12] flex items-center justify-center p-4 sm:p-6 selection:bg-[#B94F2E]/20 selection:text-[#B94F2E]">
      <div className="w-full max-w-lg cream-neu-surface rounded-3xl overflow-hidden">
        {/* Top Espresso Brand Header */}
        <div className="bg-gradient-to-br from-[#2D1B12] via-[#3B2519] to-[#4A2E20] text-[#FFFDF9] px-6 py-7 flex flex-col items-center text-center">
          <BrandEmblem logoUrl={brandLogo} brandName={cafeName} size="lg" />
          <span className="mt-4 text-[10px] uppercase tracking-[0.26em] font-serif font-bold text-[#F3B08E]">
            {cafeName}
          </span>
          <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-[#E69A73] mt-0.5">
            {tagline}
          </span>
        </div>

        {/* Maintenance Message Body */}
        <div className="p-6 sm:p-8 space-y-6 text-center">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B94F2E]">
              <PauseCircle className="w-4 h-4 text-[#B94F2E]" />
              <span>Service Paused</span>
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#2D1B12] leading-tight text-balance">
              {serviceControl.pauseTitle}
            </h1>

            <p className="text-xs sm:text-sm text-[#7A5C48] leading-relaxed max-w-md mx-auto">
              {serviceControl.pauseMessage}
            </p>
          </div>

          {/* Café Contact & Hours Details */}
          <div className="cream-neu-inset rounded-2xl p-4 sm:p-5 text-left space-y-3 text-xs sm:text-sm text-[#5E4232]">
            <h2 className="font-serif text-sm font-bold text-[#2D1B12] pb-2 border-b border-[#B98660]/25">
              Storefront Hours &amp; Direct Contact
            </h2>

            <div className="flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-[#B94F2E] shrink-0 mt-0.5" />
              <span>{cafeInfo.openingHours}</span>
            </div>

            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-[#B94F2E] shrink-0 mt-0.5" />
              <span>{cafeInfo.location}</span>
            </div>

            <div className="flex items-start gap-2.5">
              <Phone className="w-4 h-4 text-[#B94F2E] shrink-0 mt-0.5" />
              {sanitizedPhone ? (
                <a
                  href={`tel:${sanitizedPhone}`}
                  className="font-semibold text-[#B94F2E] hover:underline tabular-nums"
                >
                  {cafeInfo.contactNumber}
                </a>
              ) : (
                <span className="tabular-nums">{cafeInfo.contactNumber}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
