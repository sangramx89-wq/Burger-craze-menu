import React from 'react';
import { m } from 'motion/react';
import { HERO_BANNER_IMG } from '../lib/menuDefaults.ts';
import { StorefrontTheme } from '../types/index.ts';
import { ProgressiveImage } from './ProgressiveImage.tsx';

interface PromoHeroProps {
  cafeName?: string;
  theme?: StorefrontTheme;
  isLiteMode?: boolean;
}

export const PromoHero: React.FC<PromoHeroProps> = React.memo(({
  cafeName = 'The Burger Craze',
  theme = 'classic',
  isLiteMode = false,
}) => {
  const isNeu = theme === 'warm-amber-neumorphism';

  const heroBody = (
    <div
      className={`relative overflow-hidden rounded-3xl transition-colors duration-300 ${
        isNeu
          ? 'neu-surface bg-gradient-to-br from-[#FAEFDD] via-[#F5E4C8] to-[#EDD2AA]'
          : 'cream-neu-surface'
      }`}
    >
      {/* Subtle ambient corner tint (desktop/high-end only to save mobile GPU fill-rate) */}
      {!isLiteMode &&
        (isNeu ? (
          <div
            aria-hidden="true"
            className="absolute -top-12 -right-8 w-64 h-64 rounded-full bg-amber-400/20 blur-3xl pointer-events-none"
          />
        ) : (
          <div
            aria-hidden="true"
            className="absolute -bottom-14 -left-10 w-56 h-56 rounded-full bg-[#B94F2E]/6 blur-3xl pointer-events-none"
          />
        ))}

      {/* Delicate botanical culinary line accent */}
      <div
        aria-hidden="true"
        className="absolute top-3 right-32 md:right-56 w-28 md:w-44 h-28 md:h-44 opacity-20 pointer-events-none"
      >
        <svg viewBox="0 0 100 100" fill="none" stroke={isNeu ? '#B45309' : '#B94F2E'} strokeWidth="1.2">
          <path d="M50 90 C 50 60, 80 40, 85 20 C 70 30, 50 50, 48 85" />
          <path d="M50 70 C 40 50, 20 40, 15 25 C 30 35, 45 55, 48 70" />
          <path d="M60 45 C 75 35, 85 15, 80 10 C 65 15, 55 35, 60 45" />
        </svg>
      </div>

      <div className="flex items-center justify-between p-4 sm:p-7 md:p-9 lg:p-10 min-h-[156px] sm:min-h-[172px] md:min-h-[224px] relative z-10 gap-3.5 sm:gap-8">
        {/* Left Editorial Copy */}
        <div className="flex-1 min-w-0">
          {/* Quiet Editorial Kicker */}
          <div className="mb-2 md:mb-3">
            <div
              className={`text-[10px] md:text-xs uppercase font-bold tracking-[0.2em] leading-snug ${
                isNeu ? 'text-[#B45309]' : 'text-[#B94F2E]'
              }`}
            >
              Good Food <span aria-hidden="true">·</span> Better Mood
            </div>
            <div
              className={`w-10 md:w-14 h-[2px] mt-1.5 md:mt-2 rounded-full ${
                isNeu ? 'bg-amber-600/75' : 'bg-[#B94F2E]/70'
              }`}
            />
          </div>

          {/* Headline */}
          <h1
            className={`font-serif text-[23px] sm:text-[30px] md:text-[36px] lg:text-[42px] leading-[1.12] font-bold mb-2 md:mb-4 text-balance ${
              isNeu ? 'text-[#2A180B]' : 'text-[#2D1B12]'
            }`}
          >
            Fresh Flavours, Every Day
          </h1>

          {/* Unboxed Descriptors */}
          <div
            className={`text-[11px] md:text-xs font-medium flex flex-wrap items-center gap-x-2 gap-y-1 ${
              isNeu ? 'text-[#745335]' : 'text-[#7A5C48]'
            }`}
          >
            <span>Handcrafted Kitchen</span>
            <span aria-hidden="true" className={isNeu ? 'text-[#D97706]' : 'text-[#B94F2E]'}>·</span>
            <span>Cozy Vibes</span>
            <span aria-hidden="true" className={isNeu ? 'text-[#D97706]' : 'text-[#B94F2E]'}>·</span>
            <span>Made Fresh to Order</span>
          </div>
        </div>

        {/* Right Framed Dish Photography */}
        <div
          className={`relative w-28 h-24 sm:w-44 sm:h-36 md:w-60 md:h-48 lg:w-72 lg:h-54 shrink-0 rounded-2xl md:rounded-3xl p-1.5 overflow-hidden transition-transform duration-200 ${
            isLiteMode ? '' : 'hover:scale-[1.03] hover:-translate-y-0.5'
          } ${isNeu ? 'neu-card' : 'cream-neu-card'}`}
        >
          <div className="w-full h-full rounded-[14px] md:rounded-[20px] overflow-hidden">
            <ProgressiveImage
              src={HERO_BANNER_IMG}
              alt={`Signature artisan platter at ${cafeName}`}
              eager
              fetchPriority="high"
              theme={theme}
              className="w-full h-full object-cover object-center"
            />
          </div>
        </div>
      </div>
    </div>
  );

  if (isLiteMode) {
    return <section className="px-3.5 sm:px-6 lg:px-8 pt-3 pb-1 w-full max-w-6xl mx-auto">{heroBody}</section>;
  }

  return (
    <m.section
      initial={{ opacity: 0, y: 12, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26, mass: 0.85 }}
      className="px-4 sm:px-6 lg:px-8 pt-3 pb-1 w-full max-w-6xl mx-auto"
    >
      {heroBody}
    </m.section>
  );
});

