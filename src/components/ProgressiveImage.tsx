import React, { useEffect, useRef, useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { StorefrontTheme } from '../types/index.ts';

interface ProgressiveImageProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  theme?: StorefrontTheme;
  eager?: boolean;
  fetchPriority?: 'high' | 'low' | 'auto';
}

export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  alt,
  className = '',
  containerClassName = '',
  theme = 'classic',
  eager = false,
  fetchPriority,
}) => {
  const isNeu = theme === 'warm-amber-neumorphism';
  const imgRef = useRef<HTMLImageElement | null>(null);
  const isMountedRef = useRef(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const resolvedPriority = fetchPriority ?? (eager ? 'high' : 'low');

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const revealWhenDecoded = () => {
    const imgEl = imgRef.current;
    if (!imgEl || typeof imgEl.decode !== 'function') {
      if (isMountedRef.current) setIsLoaded(true);
      return;
    }
    imgEl
      .decode()
      .catch(() => {})
      .finally(() => {
        if (isMountedRef.current) {
          setIsLoaded(true);
        }
      });
  };

  useEffect(() => {
    setHasError(false);
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      if (isMountedRef.current) setIsLoaded(true);
    } else {
      setIsLoaded(false);
    }
  }, [src]);

  return (
    <div className={`relative w-full h-full overflow-hidden ${containerClassName}`}>
      {!isLoaded && !hasError && (
        <div
          aria-hidden="true"
          className={`absolute inset-0 ${isNeu ? 'bg-[#EAD7BA]' : 'bg-[#EFE0CE]'}`}
        />
      )}

      {hasError ? (
        <div
          aria-label={alt}
          className={`w-full h-full flex flex-col items-center justify-center p-2 text-center ${
            isNeu ? 'bg-[#EAD7BA] text-[#8E6C48]' : 'bg-[#EFE0CE] text-[#7A5C48]'
          }`}
        >
          <UtensilsCrossed className="w-5 h-5 opacity-70" />
        </div>
      ) : (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={resolvedPriority}
          referrerPolicy="no-referrer"
          onLoad={revealWhenDecoded}
          onError={() => {
            setHasError(true);
            setIsLoaded(true);
          }}
          className={`transition-opacity duration-200 ease-out ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${className}`}
        />
      )}
    </div>
  );
};

