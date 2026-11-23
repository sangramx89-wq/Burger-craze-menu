import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { X, Sparkles, Clock, Pause } from 'lucide-react';
import { MenuPopup } from '../types/popup.ts';
import { isPopupInActiveSchedule } from '../lib/popupService.ts';
import { ProgressiveImage } from './ProgressiveImage.tsx';

const SESSION_SEEN_KEY = 'seen_menu_popups';

interface PromotionalModalQueueProps {
  popups: MenuPopup[];
  isOpenOverride?: boolean;
  onCloseOverride?: () => void;
  onTriggerCta: (ctaLink?: string) => void;
}

export const PromotionalModalQueue: React.FC<PromotionalModalQueueProps> = ({
  popups,
  isOpenOverride,
  onCloseOverride,
  onTriggerCta,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 100%
  const [isPaused, setIsPaused] = useState(false);

  // Filter active popups:
  // - In normal customer mode: only show popups that are active AND within their scheduled daily hours
  // - In admin test preview: show all active popups so admin can test the full queue
  const activePopups = popups
    .filter((p) => p.is_active && (isOpenOverride ? true : isPopupInActiveSchedule(p)))
    .sort((a, b) => a.priority - b.priority);

  // Determine visibility on mount (session storage control)
  useEffect(() => {
    if (isOpenOverride !== undefined) {
      setIsVisible(isOpenOverride);
      setCurrentIndex(0);
      setProgress(0);
      setIsPaused(false);
      return;
    }

    if (activePopups.length === 0) {
      setIsVisible(false);
      setProgress(0);
      return;
    }

    try {
      const alreadySeen = sessionStorage.getItem(SESSION_SEEN_KEY);
      if (!alreadySeen && activePopups.length > 0) {
        // Delay so page settles nicely before modal appears
        const timer = setTimeout(() => {
          try {
            sessionStorage.setItem(SESSION_SEEN_KEY, 'true');
          } catch {
            // Ignore
          }
          setIsVisible(true);
          setCurrentIndex(0);
          setProgress(0);
          setIsPaused(false);
        }, 600);
        return () => clearTimeout(timer);
      }
    } catch {
      // Fallback
    }
  }, [isOpenOverride, activePopups.length]);

  const currentPopup = activePopups[currentIndex];
  const duration = currentPopup?.display_duration ?? 6; // in seconds (0 = manual dismiss only)

  // Auto-advance progress timer
  const handleNextPopupRef = useRef<(triggerCta?: boolean) => void>(() => {});

  const handleCloseQueue = () => {
    setIsVisible(false);
    setProgress(0);
    setIsPaused(false);
    try {
      sessionStorage.setItem(SESSION_SEEN_KEY, 'true');
    } catch {
      // Ignore
    }
    if (onCloseOverride) {
      onCloseOverride();
    }
  };

  const handleNextPopup = (triggerCta = false) => {
    const currentItem = activePopups[currentIndex];

    if (triggerCta && currentItem?.cta_link) {
      onTriggerCta(currentItem.cta_link);
    }

    if (currentIndex + 1 < activePopups.length) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
      setIsPaused(false);
    } else {
      handleCloseQueue();
    }
  };

  handleNextPopupRef.current = handleNextPopup;

  // Timer tick effect
  useEffect(() => {
    if (!isVisible || !currentPopup || duration <= 0) {
      setProgress(0);
      return;
    }

    // Reset progress when popup changes
    setProgress(0);

    const intervalMs = 50;
    const increment = (intervalMs / (duration * 1000)) * 100;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (isPaused) return prev; // Freeze when hovered or touched
        const next = prev + increment;
        if (next >= 100) {
          clearInterval(interval);
          handleNextPopupRef.current(false);
          return 100;
        }
        return next;
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isVisible, currentIndex, duration, isPaused]);

  const shouldShow = isVisible && activePopups.length > 0 && Boolean(currentPopup);
  const totalCount = activePopups.length;
  const remainingSeconds = duration > 0 ? Math.max(1, Math.ceil(((100 - progress) / 100) * duration)) : 0;

  return (
    <AnimatePresence>
      {shouldShow && currentPopup && (
        <m.div
          key="promo-queue-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="promo-modal-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs"
        >
          {/* Backdrop */}
          <div className="absolute inset-0" onClick={handleCloseQueue} />

          {/* Centered Modal Card */}
          <m.div
            key={currentPopup.id}
            initial={{ opacity: 0, y: 18, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28, mass: 0.85 }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
            className="relative w-full max-w-sm bg-[#FDF6EE] rounded-3xl overflow-hidden shadow-2xl border border-[#B98660]/25 flex flex-col z-10"
          >
        {/* Top Header */}
        <div className="px-4 py-3.5 border-b border-[#B98660]/20 flex items-center justify-between bg-[#F8EBDD]">
          <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
            <Sparkles className="w-4 h-4 text-[#B94F2E] shrink-0" />
            <h2
              id="promo-modal-title"
              className="font-serif text-sm sm:text-base font-bold text-[#2D1B12] truncate text-center flex-1"
            >
              {currentPopup.title}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Auto-advance Countdown Timer */}
            {duration > 0 && (
              <span
                title={isPaused ? 'Timer paused (release to resume)' : `Auto-advances in ${remainingSeconds}s`}
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors tabular-nums ${
                  isPaused
                    ? 'bg-amber-100 text-[#B45309] border border-amber-300'
                    : 'bg-[#EFE0CE] text-[#9B3D20] border border-[#B98660]/25'
                }`}
              >
                {isPaused ? (
                  <>
                    <Pause className="w-2.5 h-2.5 fill-current" />
                    <span>Hold</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-2.5 h-2.5" />
                    <span>{remainingSeconds}s</span>
                  </>
                )}
              </span>
            )}

            {/* Queue Counter */}
            {totalCount > 1 && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-[#EFE0CE] text-[#9B3D20] border border-[#B98660]/25 tabular-nums">
                {currentIndex + 1}/{totalCount}
              </span>
            )}

            {/* Quick close icon */}
            <button
              onClick={handleCloseQueue}
              aria-label="Close promotion"
              className="w-8 h-8 rounded-xl cream-neu-pill text-[#5E4232] hover:text-[#2D1B12] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Visual Countdown Progress Bar */}
        {duration > 0 && (
          <div className="w-full bg-[#EFE0CE] h-1 overflow-hidden relative">
            <div
              className={`h-full transition-all duration-75 ease-linear ${
                isPaused ? 'bg-amber-600 opacity-80' : 'bg-[#B94F2E]'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}

        {/* Visual Promotional Body */}
        <div className="p-4 bg-[#FDF6EE] flex flex-col items-center">
          <div className="w-full aspect-[16/10] max-h-[48vh] rounded-2xl overflow-hidden bg-[#EFE0CE] shadow-xs border border-[#B98660]/20">
            <ProgressiveImage
              src={currentPopup.image_url}
              alt={currentPopup.title}
              eager
              className="w-full h-full object-cover"
            />
          </div>

          {currentPopup.description && (
            <p className="mt-3 px-2 text-xs text-[#5E4232] text-center leading-relaxed">
              {currentPopup.description}
            </p>
          )}

          {/* Schedule Window Notice (if testing an off-schedule banner) */}
          {isOpenOverride && currentPopup.is_scheduled && (
            <div className="mt-2.5 text-[10px] text-[#7A5C48] bg-[#EFE0CE] px-3 py-1.5 rounded-xl border border-[#B98660]/25 flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-[#B94F2E]" />
              <span>
                Scheduled window: {currentPopup.start_time} - {currentPopup.end_time}
                {' '}({isPopupInActiveSchedule(currentPopup) ? 'Active now' : 'Currently outside window'})
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions: Split when both CTA text and target are set, single full-width Cancel otherwise */}
        {(() => {
          const hasCta = Boolean(currentPopup.cta_text?.trim() && currentPopup.cta_link?.trim());
          return (
            <div className="flex items-stretch border-t border-[#B98660]/20 text-xs font-semibold bg-[#F8EBDD] select-none">
              <button
                type="button"
                onClick={() => handleNextPopup(false)}
                className={`${
                  hasCta ? 'w-1/2 border-r border-[#B98660]/20' : 'w-full'
                } py-3.5 text-[#7A5C48] hover:bg-[#EFE0CE] text-center transition-colors cursor-pointer`}
              >
                Cancel
              </button>

              {hasCta && (
                <button
                  type="button"
                  onClick={() => handleNextPopup(true)}
                  className="w-1/2 py-3.5 text-[#B94F2E] hover:bg-[#F3DFD3] font-bold text-center transition-colors cursor-pointer"
                >
                  {currentPopup.cta_text}
                </button>
              )}
            </div>
          );
        })()}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
};
