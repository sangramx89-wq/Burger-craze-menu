import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  Maximize2,
  Minimize2,
  AlertCircle,
} from 'lucide-react';
import {
  CompressionResult,
  ImageFitMode,
  clampFramingPan,
  computeFramingRatios,
  cropAndCompressImageUnder200KB,
  formatBytes,
} from '../lib/imageCompressor.ts';

export type ImageFramingPreset = 'logo' | 'dish' | 'banner';

interface PresetConfig {
  title: string;
  subtitle: string;
  targetWidth: number;
  targetHeight: number;
  aspectLabel: string;
  dimensionsLabel: string;
  circularGuide: boolean;
  preserveTransparency: boolean;
  backgroundColor: string;
  viewportAspectClass: string;
  viewportMaxWidthClass: string;
}

const PRESET_CONFIGS: Record<ImageFramingPreset, PresetConfig> = {
  logo: {
    title: 'Set & Confirm Brand Logo',
    subtitle: 'Drag to position, zoom, and choose fit mode before updating the live Header and Menu.',
    targetWidth: 400,
    targetHeight: 400,
    aspectLabel: '1:1 Square / Circular Emblem',
    dimensionsLabel: '400 × 400 px',
    circularGuide: true,
    preserveTransparency: true,
    backgroundColor: '#FFFFFF',
    viewportAspectClass: 'aspect-square',
    viewportMaxWidthClass: 'max-w-[260px] sm:max-w-[290px]',
  },
  dish: {
    title: 'Set & Confirm Dish Image',
    subtitle: 'Drag to center your dish inside the 4:3 menu card frame before applying.',
    targetWidth: 800,
    targetHeight: 600,
    aspectLabel: '4:3 Landscape',
    dimensionsLabel: '800 × 600 px',
    circularGuide: false,
    preserveTransparency: false,
    backgroundColor: '#FAF7EE',
    viewportAspectClass: 'aspect-[4/3]',
    viewportMaxWidthClass: 'max-w-[360px] sm:max-w-[400px]',
  },
  banner: {
    title: 'Set & Confirm Promotional Banner',
    subtitle: 'Adjust zoom and position for the 16:9 promotional pop-up banner before applying.',
    targetWidth: 1200,
    targetHeight: 675,
    aspectLabel: '16:9 Widescreen',
    dimensionsLabel: '1200 × 675 px',
    circularGuide: false,
    preserveTransparency: false,
    backgroundColor: '#FAF7EE',
    viewportAspectClass: 'aspect-video',
    viewportMaxWidthClass: 'max-w-[440px]',
  },
};

interface ImageFramingModalProps {
  isOpen: boolean;
  draftFile: File | null;
  preset: ImageFramingPreset;
  onCancel: () => void;
  onConfirm: (result: CompressionResult) => void;
}

export const ImageFramingModal: React.FC<ImageFramingModalProps> = ({
  isOpen,
  draftFile,
  preset,
  onCancel,
  onConfirm,
}) => {
  const config = PRESET_CONFIGS[preset];
  const targetAspect = config.targetWidth / config.targetHeight;

  const [srcUrl, setSrcUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number }>({ w: 1, h: 1 });
  const [fitMode, setFitMode] = useState<ImageFitMode>('cover');
  const [zoom, setZoom] = useState<number>(1);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    startPanX: number;
    startPanY: number;
    rectW: number;
    rectH: number;
  } | null>(null);

  useEffect(() => {
    if (!isOpen || !draftFile) {
      setSrcUrl(null);
      setError(null);
      setIsConfirming(false);
      return;
    }

    let cancelled = false;
    setError(null);
    setZoom(1);
    setPanX(0);
    setPanY(0);

    const reader = new FileReader();
    reader.onload = () => {
      if (cancelled) return;
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        if (cancelled) return;
        const w = img.naturalWidth || img.width || 1;
        const h = img.naturalHeight || img.height || 1;
        setNaturalSize({ w, h });
        // For rectangular logos, default to 'contain' so letters/emblems aren't clipped
        const imgAspect = w / h;
        const initialFit: ImageFitMode =
          preset === 'logo' && Math.abs(imgAspect - 1) > 0.15 ? 'contain' : 'cover';
        setFitMode(initialFit);
        setSrcUrl(dataUrl);
      };
      img.onerror = () => {
        if (!cancelled) {
          setError('Could not load this image file. Please select a valid PNG, JPG, or WebP.');
        }
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      if (!cancelled) {
        setError('Could not read the selected file. Please try again.');
      }
    };
    reader.readAsDataURL(draftFile);

    return () => {
      cancelled = true;
    };
  }, [isOpen, draftFile, preset]);

  if (!isOpen || !draftFile) return null;

  const { ratioW, ratioH } = computeFramingRatios(
    naturalSize.w,
    naturalSize.h,
    targetAspect,
    fitMode,
    zoom
  );
  const clampedPan = clampFramingPan(panX, panY, ratioW, ratioH);

  const handleFitModeChange = (nextMode: ImageFitMode) => {
    setFitMode(nextMode);
    const nextRatios = computeFramingRatios(
      naturalSize.w,
      naturalSize.h,
      targetAspect,
      nextMode,
      zoom
    );
    const nextPan = clampFramingPan(panX, panY, nextRatios.ratioW, nextRatios.ratioH);
    setPanX(nextPan.panX);
    setPanY(nextPan.panY);
  };

  const handleZoomChange = (nextZoomRaw: number) => {
    const nextZoom = Math.max(1, Math.min(3, Number(nextZoomRaw.toFixed(2))));
    setZoom(nextZoom);
    const nextRatios = computeFramingRatios(
      naturalSize.w,
      naturalSize.h,
      targetAspect,
      fitMode,
      nextZoom
    );
    const nextPan = clampFramingPan(panX, panY, nextRatios.ratioW, nextRatios.ratioH);
    setPanX(nextPan.panX);
    setPanY(nextPan.panY);
  };

  const handleResetCenter = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!viewportRef.current || !srcUrl) return;
    e.preventDefault();
    const rect = viewportRef.current.getBoundingClientRect();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      startPanX: clampedPan.panX,
      startPanY: clampedPan.panY,
      rectW: Math.max(1, rect.width),
      rectH: Math.max(1, rect.height),
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current) return;
    const { pointerX, pointerY, startPanX, startPanY, rectW, rectH } = dragStartRef.current;
    const dx = (e.clientX - pointerX) / rectW;
    const dy = (e.clientY - pointerY) / rectH;
    const nextPan = clampFramingPan(startPanX + dx, startPanY + dy, ratioW, ratioH);
    setPanX(nextPan.panX);
    setPanY(nextPan.panY);
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const handleConfirmClick = async () => {
    if (!srcUrl || isConfirming) return;
    setIsConfirming(true);
    setError(null);
    try {
      const result = await cropAndCompressImageUnder200KB({
        srcUrl,
        originalSizeBytes: draftFile.size,
        targetWidth: config.targetWidth,
        targetHeight: config.targetHeight,
        fitMode,
        zoom,
        panX: clampedPan.panX,
        panY: clampedPan.panY,
        backgroundColor: config.backgroundColor,
        preserveTransparency: config.preserveTransparency,
      });
      onConfirm(result);
    } catch {
      setError('Could not process the framed image. Please try another image.');
      setIsConfirming(false);
    }
  };

  const canPanHorizontally = Math.abs(ratioW - 1) > 0.005;
  const canPanVertically = Math.abs(ratioH - 1) > 0.005;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={config.title}
      className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in"
    >
      <div className="absolute inset-0" onClick={onCancel} />

      <div className="relative z-10 w-full max-w-lg bg-[#FFFDF9] rounded-3xl shadow-2xl border border-[#EDE2D2] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#FAF7EE] border-b border-[#EFE5D6] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-serif text-base sm:text-lg font-bold text-[#2C1C12] leading-tight">
              {config.title}
            </h3>
            <p className="text-[11px] text-[#8C7662] mt-0.5 leading-snug">
              {config.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel image upload"
            className="w-9 h-9 rounded-full bg-white hover:bg-[#EFE5D6] text-[#6B5746] flex items-center justify-center shrink-0 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 no-scrollbar">
          {/* Interactive Framing Viewport */}
          <div className="flex flex-col items-center gap-2">
            <div
              ref={viewportRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUpOrCancel}
              onPointerCancel={handlePointerUpOrCancel}
              className={`relative w-full ${config.viewportMaxWidthClass} ${config.viewportAspectClass} rounded-2xl overflow-hidden border border-[#E0D2C2] shadow-inner touch-none select-none ${
                fitMode === 'contain' && config.preserveTransparency
                  ? 'bg-white'
                  : 'bg-[#FAF6EE]'
              } ${
                canPanHorizontally || canPanVertically
                  ? isDragging
                    ? 'cursor-grabbing'
                    : 'cursor-grab'
                  : 'cursor-default'
              }`}
            >
              {srcUrl ? (
                <img
                  src={srcUrl}
                  alt="Framing preview"
                  draggable={false}
                  style={{
                    position: 'absolute',
                    maxWidth: 'none',
                    maxHeight: 'none',
                    width: `${(ratioW * 100).toFixed(4)}%`,
                    height: `${(ratioH * 100).toFixed(4)}%`,
                    left: `${((0.5 - ratioW / 2 + clampedPan.panX) * 100).toFixed(4)}%`,
                    top: `${((0.5 - ratioH / 2 + clampedPan.panY) * 100).toFixed(4)}%`,
                  }}
                  className="pointer-events-none select-none"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-[#8C7662]">
                  Loading preview...
                </div>
              )}

              {/* Subtle 3x3 Rule-of-Thirds Alignment Grid */}
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute inset-0 transition-opacity duration-150 ${
                  isDragging ? 'opacity-70' : 'opacity-25'
                }`}
              >
                <div className="absolute inset-y-0 left-1/3 w-px bg-white/70 shadow-2xs" />
                <div className="absolute inset-y-0 left-2/3 w-px bg-white/70 shadow-2xs" />
                <div className="absolute inset-x-0 top-1/3 h-px bg-white/70 shadow-2xs" />
                <div className="absolute inset-x-0 top-2/3 h-px bg-white/70 shadow-2xs" />
              </div>

              {/* Circular Emblem Crop Guide for Brand Logo */}
              {config.circularGuide && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 flex items-center justify-center"
                >
                  <div className="w-[92%] h-[92%] rounded-full border-2 border-dashed border-[#D4621A]/80 shadow-[0_0_0_999px_rgba(44,28,18,0.22)]" />
                </div>
              )}
            </div>

            {/* Quiet Guidance Line */}
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[11px] text-[#8C7662] tabular-nums">
              <span className="inline-flex items-center gap-1 font-medium text-[#5C4533]">
                <Move className="w-3 h-3 text-[#D4621A]" />
                <span>Drag image to reposition</span>
              </span>
              <span aria-hidden="true">·</span>
              <span>{config.aspectLabel}</span>
              <span aria-hidden="true">·</span>
              <span>
                {config.dimensionsLabel} (Original {formatBytes(draftFile.size)})
              </span>
            </div>
          </div>

          {/* Framing Controls Panel */}
          <div className="p-3.5 rounded-2xl bg-[#FAF6EE] border border-[#E8DDCE] space-y-3">
            {/* Fit Mode & Reset Row */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div
                role="group"
                aria-label="Image fit mode"
                className="inline-flex items-center p-1 rounded-xl bg-white border border-[#E0D2C2] gap-1"
              >
                <button
                  type="button"
                  onClick={() => handleFitModeChange('cover')}
                  className={`min-h-[34px] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    fitMode === 'cover'
                      ? 'bg-[#D4621A] text-white shadow-2xs'
                      : 'text-[#6B5746] hover:bg-[#FAF6EE]'
                  }`}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Fill Frame</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleFitModeChange('contain')}
                  className={`min-h-[34px] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    fitMode === 'contain'
                      ? 'bg-[#D4621A] text-white shadow-2xs'
                      : 'text-[#6B5746] hover:bg-[#FAF6EE]'
                  }`}
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Fit Whole</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleResetCenter}
                className="min-h-[34px] px-3 py-1.5 rounded-xl bg-white hover:bg-[#EFE5D6] text-[#5C4533] border border-[#E0D2C2] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#D4621A]" />
                <span>Reset Center</span>
              </button>
            </div>

            {/* Zoom Slider Row */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#5C4533]">Zoom Level</span>
                <span className="font-mono font-semibold text-[#D4621A] tabular-nums">
                  {Math.round(zoom * 100)}%
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleZoomChange(zoom - 0.15)}
                  disabled={zoom <= 1}
                  aria-label="Zoom out"
                  className="w-9 h-9 rounded-xl bg-white border border-[#E0D2C2] text-[#5C4533] hover:bg-[#EFE5D6] disabled:opacity-45 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer shrink-0"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>

                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  aria-label="Zoom level"
                  onChange={(e) => handleZoomChange(Number(e.target.value))}
                  className="flex-1 accent-[#D4621A] cursor-pointer h-2 rounded-lg"
                />

                <button
                  type="button"
                  onClick={() => handleZoomChange(zoom + 0.15)}
                  disabled={zoom >= 3}
                  aria-label="Zoom in"
                  className="w-9 h-9 rounded-xl bg-white border border-[#E0D2C2] text-[#5C4533] hover:bg-[#EFE5D6] disabled:opacity-45 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer shrink-0"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 px-3 py-2 rounded-xl border border-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-white border-t border-[#EFE5D6] flex items-center justify-between gap-3">
          <span className="text-[11px] text-[#8C7662] tabular-nums hidden sm:inline">
            Output auto-compressed &le; 200 KB
          </span>

          <div className="flex items-center gap-2.5 ml-auto w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={isConfirming}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-[#FAF6EE] hover:bg-[#EFE5D6] text-[#6B5746] font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirmClick}
              disabled={!srcUrl || isConfirming}
              className="min-h-[40px] px-5 py-2 rounded-xl bg-[#D4621A] hover:bg-[#B84E0F] disabled:opacity-60 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{isConfirming ? 'Compressing...' : 'Confirm Image'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
