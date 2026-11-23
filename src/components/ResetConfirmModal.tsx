import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, ArrowLeft } from 'lucide-react';

interface ResetConfirmModalProps {
  isOpen: boolean;
  itemLabel: string; // e.g. "Menu Dishes" or "Pop-up Banners"
  title?: string;
  step1Description: string;
  step2Description: string;
  confirmLabel: string;
  secondaryAction?: {
    label: string;
    description?: string;
    onSelect: () => void;
  };
  onConfirm: () => void;
  onClose: () => void;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({
  isOpen,
  itemLabel,
  title,
  step1Description,
  step2Description,
  confirmLabel,
  secondaryAction,
  onConfirm,
  onClose,
}) => {
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-confirm-title"
      className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
    >
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className={`relative w-full max-w-sm bg-white rounded-3xl p-6 text-center shadow-2xl border animate-in fade-in zoom-in-95 z-10 ${
          step === 1 ? 'border-amber-200' : 'border-rose-200'
        }`}
      >
        {/* Step Indicator */}
        <div className="text-[10.5px] font-mono font-semibold text-[#8C7662] mb-3">
          Step {step} of 2 · {step === 1 ? 'Initial Check' : 'Final Confirmation'}
        </div>

        {step === 1 ? (
          <>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#D4621A] flex items-center justify-center mx-auto mb-3 border border-amber-200">
              <RefreshCw className="w-6 h-6 stroke-[2]" />
            </div>

            <h4 id="reset-confirm-title" className="font-serif text-lg font-bold text-[#2C1C12] mb-1.5">
              {title || `Reset ${itemLabel} to Defaults?`}
            </h4>

            <p className="text-xs text-[#8C7662] mb-5 leading-relaxed">
              {step1Description}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-[#FAF6EE] hover:bg-[#F0E6D8] text-[#5C4533] font-semibold text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 py-2.5 rounded-xl bg-[#D4621A] hover:bg-[#B84E0F] text-white font-semibold text-xs shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                Continue
              </button>
            </div>

            {secondaryAction && (
              <div className="mt-4 pt-3.5 border-t border-[#F0E6D8] space-y-1.5">
                {secondaryAction.description && (
                  <p className="text-[11px] text-[#8C7662] leading-snug">
                    {secondaryAction.description}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    secondaryAction.onSelect();
                    setStep(1);
                  }}
                  className="text-[11px] font-semibold text-rose-700 hover:text-rose-800 hover:underline cursor-pointer"
                >
                  {secondaryAction.label}
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3 border border-rose-200">
              <AlertTriangle className="w-6 h-6 stroke-[2]" />
            </div>

            <h4 id="reset-confirm-title" className="font-serif text-lg font-bold text-[#2C1C12] mb-1.5">
              Confirm Final Reset?
            </h4>

            <p className="text-xs text-[#8C7662] mb-5 leading-relaxed">
              {step2Description}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-2.5 rounded-xl bg-[#FAF6EE] hover:bg-[#F0E6D8] text-[#5C4533] font-semibold text-xs cursor-pointer flex items-center justify-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Go Back</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                {confirmLabel}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
