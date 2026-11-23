/**
 * Client-Side Image Compression & Optimization Utility
 * Enforces strict 200 KB (204,800 bytes) maximum size limit.
 * Automatically downscales dimensions and tunes quality to fit under the limit.
 */

export interface CompressionResult {
  dataUrl: string;
  sizeBytes: number;
  formattedSize: string;
  originalSizeBytes: number;
  formattedOriginalSize: string;
  wasCompressed: boolean;
}

export const MAX_IMAGE_SIZE_BYTES = 200 * 1024; // 204,800 bytes (200 KB)

/**
 * Formats byte count to clean human-readable string (e.g. "148 KB", "2.4 MB")
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 KB';
  const k = 1024;
  if (bytes < k) {
    return `${bytes} B`;
  }
  const kb = bytes / k;
  if (kb < 1000) {
    return `${Math.round(kb)} KB`;
  }
  const mb = kb / k;
  return `${mb.toFixed(1)} MB`;
}

/**
 * Calculates byte size of a Base64 data URL
 */
export function estimateDataUrlSizeBytes(dataUrl: string): number {
  if (!dataUrl) return 0;
  // Strip metadata header (e.g. "data:image/jpeg;base64,")
  const base64Str = dataUrl.split(',')[1] || dataUrl;
  const padding = (base64Str.endsWith('==') ? 2 : base64Str.endsWith('=') ? 1 : 0);
  return Math.round((base64Str.length * 3) / 4) - padding;
}

/**
 * Reads a File into an HTMLImageElement
 */
function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to decode image file'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses an uploaded image file so its final output is strictly under maxSizeBytes (default 200 KB).
 * Preserves high visual fidelity while downsampling resolution and quality iteratively.
 */
export async function compressImageUnder200KB(
  file: File,
  maxSizeBytes = MAX_IMAGE_SIZE_BYTES
): Promise<CompressionResult> {
  const originalSizeBytes = file.size;

  // If the file is already an image under maxSizeBytes and is JPEG/PNG/WebP,
  // we can read it directly without loss of original fidelity
  if (originalSizeBytes <= maxSizeBytes && file.type.startsWith('image/')) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const calculatedSize = estimateDataUrlSizeBytes(dataUrl);
    // If the Base64 representation is still within limit, return directly
    if (calculatedSize <= maxSizeBytes) {
      return {
        dataUrl,
        sizeBytes: calculatedSize,
        formattedSize: formatBytes(calculatedSize),
        originalSizeBytes,
        formattedOriginalSize: formatBytes(originalSizeBytes),
        wasCompressed: false,
      };
    }
  }

  // File is larger than 200 KB: optimize using offscreen canvas
  const img = await loadImageFromFile(file);

  // Maximum dimension steps to test (high DPI mobile screens look razor sharp at 1000px)
  const dimensionSteps = [1200, 1000, 800, 600, 480];
  const qualitySteps = [0.9, 0.82, 0.75, 0.68, 0.58, 0.48];

  let bestDataUrl = '';
  let bestSizeBytes = Infinity;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  for (const maxDim of dimensionSteps) {
    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;

    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    canvas.width = width;
    canvas.height = height;

    // High quality canvas smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    for (const quality of qualitySteps) {
      const candidateUrl = canvas.toDataURL('image/jpeg', quality);
      const candidateSize = estimateDataUrlSizeBytes(candidateUrl);

      if (candidateSize < bestSizeBytes) {
        bestSizeBytes = candidateSize;
        bestDataUrl = candidateUrl;
      }

      // Found an optimal candidate under the limit!
      if (candidateSize <= maxSizeBytes) {
        return {
          dataUrl: candidateUrl,
          sizeBytes: candidateSize,
          formattedSize: formatBytes(candidateSize),
          originalSizeBytes,
          formattedOriginalSize: formatBytes(originalSizeBytes),
          wasCompressed: true,
        };
      }
    }
  }

  // Fallback: return the smallest version achieved
  return {
    dataUrl: bestDataUrl,
    sizeBytes: bestSizeBytes,
    formattedSize: formatBytes(bestSizeBytes),
    originalSizeBytes,
    formattedOriginalSize: formatBytes(originalSizeBytes),
    wasCompressed: true,
  };
}

export type ImageFitMode = 'cover' | 'contain';

export interface FramingTransform {
  fitMode: ImageFitMode;
  zoom: number;
  /** Normalized horizontal offset relative to viewport width */
  panX: number;
  /** Normalized vertical offset relative to viewport height */
  panY: number;
}

export interface CropCompressOptions extends FramingTransform {
  srcUrl: string;
  originalSizeBytes: number;
  targetWidth: number;
  targetHeight: number;
  backgroundColor?: string;
  preserveTransparency?: boolean;
  maxSizeBytes?: number;
}

/**
 * Computes image width/height ratios relative to a viewport of aspect targetAspect
 * so CSS preview and Canvas drawing match pixel-for-pixel.
 */
export function computeFramingRatios(
  naturalWidth: number,
  naturalHeight: number,
  targetAspect: number,
  fitMode: ImageFitMode,
  zoom: number
): { ratioW: number; ratioH: number } {
  const safeW = Math.max(1, naturalWidth);
  const safeH = Math.max(1, naturalHeight);
  const imgAspect = safeW / safeH;

  let baseRatioW = 1;
  let baseRatioH = 1;

  if (fitMode === 'cover') {
    if (imgAspect > targetAspect) {
      baseRatioH = 1;
      baseRatioW = imgAspect / targetAspect;
    } else {
      baseRatioW = 1;
      baseRatioH = targetAspect / imgAspect;
    }
  } else {
    if (imgAspect > targetAspect) {
      baseRatioW = 1;
      baseRatioH = targetAspect / imgAspect;
    } else {
      baseRatioH = 1;
      baseRatioW = imgAspect / targetAspect;
    }
  }

  return {
    ratioW: baseRatioW * zoom,
    ratioH: baseRatioH * zoom,
  };
}

/**
 * Clamps normalized pan offsets so the framed image stays cleanly anchored to the viewport.
 */
export function clampFramingPan(
  panX: number,
  panY: number,
  ratioW: number,
  ratioH: number
): { panX: number; panY: number } {
  const maxPanX = Math.abs(ratioW - 1) / 2;
  const maxPanY = Math.abs(ratioH - 1) / 2;
  return {
    panX: Math.max(-maxPanX, Math.min(maxPanX, panX)),
    panY: Math.max(-maxPanY, Math.min(maxPanY, panY)),
  };
}

function loadImageFromUrl(srcUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to decode uploaded image'));
    img.src = srcUrl;
  });
}

/**
 * Renders the user-framed crop (zoom, pan, cover/contain) onto a target-sized canvas
 * and compresses strictly under maxSizeBytes (default 200 KB).
 */
export async function cropAndCompressImageUnder200KB(
  options: CropCompressOptions
): Promise<CompressionResult> {
  const {
    srcUrl,
    originalSizeBytes,
    targetWidth,
    targetHeight,
    fitMode,
    zoom,
    panX,
    panY,
    backgroundColor = '#FFFFFF',
    preserveTransparency = false,
    maxSizeBytes = MAX_IMAGE_SIZE_BYTES,
  } = options;

  const img = await loadImageFromUrl(srcUrl);
  const naturalWidth = img.naturalWidth || img.width;
  const naturalHeight = img.naturalHeight || img.height;
  const targetAspect = targetWidth / targetHeight;

  const { ratioW, ratioH } = computeFramingRatios(
    naturalWidth,
    naturalHeight,
    targetAspect,
    fitMode,
    zoom
  );
  const clamped = clampFramingPan(panX, panY, ratioW, ratioH);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  const drawFrame = (w: number, h: number, fillBg: boolean) => {
    canvas.width = w;
    canvas.height = h;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, w, h);

    if (fillBg) {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, w, h);
    }

    const drawW = ratioW * w;
    const drawH = ratioH * h;
    const drawX = (0.5 - ratioW / 2 + clamped.panX) * w;
    const drawY = (0.5 - ratioH / 2 + clamped.panY) * h;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  };

  // Try preserving transparency (PNG/WebP) when requested (e.g. brand logos)
  if (preserveTransparency) {
    drawFrame(targetWidth, targetHeight, false);
    const pngUrl = canvas.toDataURL('image/png');
    const pngSize = estimateDataUrlSizeBytes(pngUrl);
    if (pngSize <= maxSizeBytes) {
      return {
        dataUrl: pngUrl,
        sizeBytes: pngSize,
        formattedSize: formatBytes(pngSize),
        originalSizeBytes,
        formattedOriginalSize: formatBytes(originalSizeBytes),
        wasCompressed: true,
      };
    }

    for (const q of [0.92, 0.84, 0.74]) {
      const webpUrl = canvas.toDataURL('image/webp', q);
      if (webpUrl.startsWith('data:image/webp')) {
        const webpSize = estimateDataUrlSizeBytes(webpUrl);
        if (webpSize <= maxSizeBytes) {
          return {
            dataUrl: webpUrl,
            sizeBytes: webpSize,
            formattedSize: formatBytes(webpSize),
            originalSizeBytes,
            formattedOriginalSize: formatBytes(originalSizeBytes),
            wasCompressed: true,
          };
        }
      }
    }
  }

  // Standard high-quality JPEG compression across scale & quality steps to guarantee <= 200 KB
  const scaleSteps = [1, 0.85, 0.7, 0.55];
  const qualitySteps = [0.92, 0.85, 0.78, 0.7, 0.6, 0.5];

  let bestDataUrl = '';
  let bestSizeBytes = Infinity;

  for (const scale of scaleSteps) {
    const w = Math.max(120, Math.round(targetWidth * scale));
    const h = Math.max(120, Math.round(targetHeight * scale));
    drawFrame(w, h, true);

    for (const quality of qualitySteps) {
      const candidateUrl = canvas.toDataURL('image/jpeg', quality);
      const candidateSize = estimateDataUrlSizeBytes(candidateUrl);

      if (candidateSize < bestSizeBytes) {
        bestSizeBytes = candidateSize;
        bestDataUrl = candidateUrl;
      }

      if (candidateSize <= maxSizeBytes) {
        return {
          dataUrl: candidateUrl,
          sizeBytes: candidateSize,
          formattedSize: formatBytes(candidateSize),
          originalSizeBytes,
          formattedOriginalSize: formatBytes(originalSizeBytes),
          wasCompressed: true,
        };
      }
    }
  }

  return {
    dataUrl: bestDataUrl,
    sizeBytes: bestSizeBytes,
    formattedSize: formatBytes(bestSizeBytes),
    originalSizeBytes,
    formattedOriginalSize: formatBytes(originalSizeBytes),
    wasCompressed: true,
  };
}

