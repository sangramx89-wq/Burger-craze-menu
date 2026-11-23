import React, { useState, useEffect } from 'react';

interface BrandEmblemProps {
  logoUrl?: string | null;
  brandName?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<'sm' | 'md' | 'lg', { box: string; svg: string }> = {
  sm: { box: 'w-10 h-10', svg: 'w-5 h-5' },
  md: { box: 'w-12 h-12', svg: 'w-6 h-6' },
  lg: { box: 'w-16 h-16', svg: 'w-8 h-8' },
};

export const BrandEmblem: React.FC<BrandEmblemProps> = ({
  logoUrl,
  brandName = 'The Burger Craze',
  size = 'sm',
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [logoUrl]);

  const dims = SIZE_CLASSES[size];
  const showCustomLogo = Boolean(logoUrl?.trim() && !hasError);

  return (
    <div
      className={`${dims.box} rounded-full overflow-hidden border border-[#B94F2E]/45 bg-[#FDF6EE] flex items-center justify-center text-[#B94F2E] shrink-0 shadow-[_-2px_-2px_6px_rgba(255,252,247,0.85),2px_2px_7px_rgba(168,122,86,0.18)] ${className}`}
    >
      {showCustomLogo ? (
        <img
          src={logoUrl!}
          alt={`${brandName} logo`}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
        />
      ) : (
        <svg
          viewBox="0 0 32 32"
          fill="none"
          stroke="currentColor"
          className={`${dims.svg} stroke-[1.8]`}
        >
          <path d="M11 6v7a2 2 0 0 0 4 0V6" strokeLinecap="round" />
          <path d="M13 15v11" strokeLinecap="round" />
          <path d="M21 6c-1.5 0-2.5 2-2.5 5s1 4.5 2.5 4.5V26" strokeLinecap="round" />
          <circle cx="16" cy="18" r="1.5" fill="currentColor" />
          <path d="M16 19.5c0 3 2 4.5 4 4.5" strokeLinecap="round" />
        </svg>
      )}
    </div>
  );
};
