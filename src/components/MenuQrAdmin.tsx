import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Printer,
  QrCode,
  RefreshCw,
  Smartphone,
  Wifi,
} from 'lucide-react';
import { CafeInfo } from '../types/index.ts';
import { DEFAULT_CAFE_INFO } from '../data/menuData.ts';
import { isSupabaseConfigured } from '../lib/supabaseClient.ts';
import { BrandEmblem } from './BrandEmblem.tsx';
import {
  getCustomerStorefrontUrl,
  RealtimeSyncStatus,
} from '../lib/realtimeMenuSync.ts';

interface MenuQrAdminProps {
  brandLogo: string | null;
  cafeInfo: CafeInfo;
  syncStatus: RealtimeSyncStatus;
}

const QUICK_TABLES = ['1', '2', '3', '4', '5', '6', '7', '8'];

export const MenuQrAdmin: React.FC<MenuQrAdminProps> = ({
  brandLogo,
  cafeInfo,
  syncStatus,
}) => {
  const [qrMode, setQrMode] = useState<'store' | 'table'>('store');
  const [tableInput, setTableInput] = useState<string>('1');
  const [customBaseUrl, setCustomBaseUrl] = useState<string>('');
  const [showBranding, setShowBranding] = useState<boolean>(true);
  const [includeWifiHint, setIncludeWifiHint] = useState<boolean>(true);
  const [posterCaption, setPosterCaption] = useState<string>(
    'Scan with your phone camera to view our live menu'
  );

  const [qrPngDataUrl, setQrPngDataUrl] = useState<string>('');
  const [qrSvgString, setQrSvgString] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [downloadFeedback, setDownloadFeedback] = useState<string | null>(null);

  const cafeName = cafeInfo.cafeName?.trim() || DEFAULT_CAFE_INFO.cafeName || 'The Burger Craze';
  const brandSlug =
    cafeName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'cafe-menu';
  const activeTableLabel = qrMode === 'table' ? tableInput.trim() : '';

  const targetUrl = useMemo(
    () => getCustomerStorefrontUrl(activeTableLabel || undefined, customBaseUrl || undefined),
    [activeTableLabel, customBaseUrl]
  );

  const defaultOrigin = useMemo(() => getCustomerStorefrontUrl(), []);

  useEffect(() => {
    let cancelled = false;
    setIsGenerating(true);

    Promise.all([
      QRCode.toDataURL(targetUrl, {
        width: 720,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#2C1C12',
          light: '#FFFFFF',
        },
      }),
      QRCode.toString(targetUrl, {
        type: 'svg',
        margin: 2,
        width: 512,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#2C1C12',
          light: '#FFFFFF',
        },
      }),
    ])
      .then(([pngUrl, svgStr]) => {
        if (cancelled) return;
        setQrPngDataUrl(pngUrl);
        setQrSvgString(svgStr);
      })
      .catch((err) => {
        console.warn('QR generation error:', err);
      })
      .finally(() => {
        if (!cancelled) setIsGenerating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [targetUrl]);

  const showToast = (msg: string) => {
    setDownloadFeedback(msg);
    window.setTimeout(() => {
      setDownloadFeedback((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      showToast('Copy failed — select the link field to copy manually.');
    }
  };

  const fileSlug = activeTableLabel
    ? `table-${activeTableLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    : 'store-menu';

  const triggerDownload = (href: string, filename: string) => {
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadSvg = () => {
    if (!qrSvgString) return;
    const blob = new Blob([qrSvgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, `the-burger-craze-${fileSlug}-qr.svg`);
    URL.revokeObjectURL(url);
    showToast('Vector SVG downloaded');
  };

  const handleDownloadRawPng = () => {
    if (!qrPngDataUrl) return;
    triggerDownload(qrPngDataUrl, `the-burger-craze-${fileSlug}-qr.png`);
    showToast('QR image PNG downloaded');
  };

  const handleDownloadBrandedPoster = async () => {
    if (!qrPngDataUrl) return;

    const canvas = document.createElement('canvas');
    const width = 1200;
    const height = 1580;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Warm cream background
    ctx.fillStyle = '#FAF7EE';
    ctx.fillRect(0, 0, width, height);

    // Outer card surface
    const cardX = 72;
    const cardY = 72;
    const cardW = width - 144;
    const cardH = height - 144;
    const radius = 48;

    ctx.fillStyle = '#FFFDF9';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, radius);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#E8D9C5';
    ctx.stroke();

    // Header band inside card
    const headerH = 270;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, headerH, [radius, radius, 0, 0]);
    ctx.clip();
    const grad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + headerH);
    grad.addColorStop(0, '#2D1B11');
    grad.addColorStop(0.55, '#3E271A');
    grad.addColorStop(1, '#523422');
    ctx.fillStyle = grad;
    ctx.fillRect(cardX, cardY, cardW, headerH);
    ctx.restore();

    // Title text in header
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FDBA74';
    ctx.font = '700 26px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(
      activeTableLabel ? `TABLE ${activeTableLabel.toUpperCase()} · LIVE DIGITAL MENU` : 'LIVE DIGITAL MENU',
      width / 2,
      cardY + 95
    );

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 62px "Playfair Display", Georgia, serif';
    ctx.fillText(showBranding ? cafeName : 'Our Menu', width / 2, cardY + 178);

    ctx.fillStyle = '#E7D5C1';
    ctx.font = '500 24px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(cafeInfo.location, width / 2, cardY + 226);

    // Load QR PNG image and draw centered inside framed white plate
    const qrImg = new Image();
    qrImg.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      qrImg.onload = () => resolve();
      qrImg.onerror = () => reject(new Error('Failed to load QR image'));
      qrImg.src = qrPngDataUrl;
    });

    const qrPlateSize = 720;
    const qrPlateX = (width - qrPlateSize) / 2;
    const qrPlateY = cardY + headerH + 86;

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(qrPlateX, qrPlateY, qrPlateSize, qrPlateSize, 36);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#EDE2D2';
    ctx.stroke();

    const qrDrawSize = 640;
    ctx.drawImage(
      qrImg,
      qrPlateX + (qrPlateSize - qrDrawSize) / 2,
      qrPlateY + (qrPlateSize - qrDrawSize) / 2,
      qrDrawSize,
      qrDrawSize
    );

    // Scan caption below QR
    ctx.fillStyle = '#2C1C12';
    ctx.font = '700 34px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(
      posterCaption.trim() || 'Scan with your phone camera to view our live menu',
      width / 2,
      qrPlateY + qrPlateSize + 92
    );

    // Optional Wi-Fi / hours line
    ctx.fillStyle = '#7A6452';
    ctx.font = '500 24px "Plus Jakarta Sans", system-ui, sans-serif';
    const footerLine =
      includeWifiHint && cafeInfo.wifiPassword
        ? `Guest Wi-Fi: ${cafeInfo.wifiPassword}  ·  Hours: ${cafeInfo.openingHours}`
        : `Open: ${cafeInfo.openingHours}  ·  ${cafeInfo.contactNumber}`;
    ctx.fillText(footerLine, width / 2, qrPlateY + qrPlateSize + 150);

    // Clean short link footer
    ctx.fillStyle = '#B45309';
    ctx.font = '600 22px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(targetUrl, width / 2, cardY + cardH - 54);

    const posterDataUrl = canvas.toDataURL('image/png');
    triggerDownload(posterDataUrl, `${brandSlug}-${fileSlug}-poster.png`);
    showToast('Print-ready PNG poster downloaded');
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 no-scrollbar bg-[#FAF7EE]/40">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#EFE5D6]">
          <div>
            <h2 className="font-serif text-lg sm:text-xl font-bold text-[#2C1C12]">
              Customer Menu QR Code
            </h2>
            <p className="text-xs text-[#7A6452] mt-0.5">
              Customers scan this QR code on their phones to open the live menu. Any changes made in Admin appear automatically.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#6B5746]">
            <Wifi
              className={`w-3.5 h-3.5 ${
                syncStatus === 'live'
                  ? 'text-emerald-600'
                  : syncStatus === 'connecting'
                    ? 'text-amber-600'
                    : 'text-[#8C7662]'
              }`}
            />
            <span>
              {syncStatus === 'live'
                ? 'Cross-device live sync active'
                : syncStatus === 'connecting'
                  ? 'Connecting real-time sync...'
                  : 'Local browser sync active'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: QR Setup Controls */}
          <div className="lg:col-span-6 space-y-5">
            {/* QR Type Selector */}
            <div className="bg-white rounded-2xl border border-[#EDE2D2] p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#2C1C12]">1. Choose QR Code Type</h3>
                <p className="text-xs text-[#7A6452] mt-0.5">
                  Create a general counter/door QR or generate table-specific QR codes for dine-in seating.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 p-1 bg-[#FAF6EE] rounded-xl border border-[#E8DDCE]">
                <button
                  type="button"
                  onClick={() => setQrMode('store')}
                  className={`min-h-[40px] px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    qrMode === 'store'
                      ? 'bg-[#D4621A] text-white shadow-2xs'
                      : 'text-[#6B5746] hover:text-[#2C1C12]'
                  }`}
                >
                  Store Menu QR
                </button>
                <button
                  type="button"
                  onClick={() => setQrMode('table')}
                  className={`min-h-[40px] px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    qrMode === 'table'
                      ? 'bg-[#D4621A] text-white shadow-2xs'
                      : 'text-[#6B5746] hover:text-[#2C1C12]'
                  }`}
                >
                  Table QR Code
                </button>
              </div>

              {qrMode === 'table' && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label
                      htmlFor="qr-table-input"
                      className="block text-xs font-bold text-[#5C4533] mb-1.5"
                    >
                      Table Number or Label
                    </label>
                    <input
                      id="qr-table-input"
                      type="text"
                      maxLength={20}
                      value={tableInput}
                      onChange={(e) => setTableInput(e.target.value)}
                      placeholder="e.g. 5 or Patio 2"
                      className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E0D2C2] text-xs font-semibold text-[#2C1C12] tabular-nums focus:outline-none focus:ring-1 focus:ring-[#D4621A]"
                    />
                  </div>

                  <div>
                    <span className="block text-[11px] font-semibold text-[#7A6452] mb-1.5">
                      Quick Table Presets
                    </span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {QUICK_TABLES.map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setTableInput(num)}
                          className={`min-h-[36px] px-2 py-1.5 rounded-lg text-xs font-semibold tabular-nums transition-colors cursor-pointer ${
                            tableInput.trim() === num
                              ? 'bg-[#2D1B11] text-white'
                              : 'bg-[#FAF6EE] hover:bg-[#EFE5D6] text-[#5C4533] border border-[#E8DDCE]'
                          }`}
                        >
                          Table {num}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Destination Link & Copy */}
            <div className="bg-white rounded-2xl border border-[#EDE2D2] p-5 space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-[#2C1C12]">2. Storefront Menu Link</h3>
                {customBaseUrl.trim() && (
                  <button
                    type="button"
                    onClick={() => setCustomBaseUrl('')}
                    className="text-[11px] font-semibold text-[#D4621A] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Use Current Site</span>
                  </button>
                )}
              </div>

              <div>
                <label
                  htmlFor="qr-base-url"
                  className="block text-[11px] font-semibold text-[#7A6452] mb-1"
                >
                  Custom Public Domain (optional — defaults to {defaultOrigin})
                </label>
                <input
                  id="qr-base-url"
                  type="url"
                  value={customBaseUrl}
                  onChange={(e) => setCustomBaseUrl(e.target.value)}
                  placeholder={defaultOrigin}
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E0D2C2] text-xs text-[#2C1C12] focus:outline-none focus:ring-1 focus:ring-[#D4621A]"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 rounded-xl bg-[#FAF6EE] border border-[#E8DDCE] text-xs font-mono text-[#5C4533] truncate">
                  {targetUrl}
                </div>
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#FAF6EE] hover:bg-[#EFE5D6] border border-[#E0D2C2] text-xs font-semibold text-[#2C1C12] flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#D4621A]" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Poster Customization */}
            <div className="bg-white rounded-2xl border border-[#EDE2D2] p-5 space-y-3.5">
              <h3 className="text-sm font-bold text-[#2C1C12]">3. Printable Poster Options</h3>

              <div>
                <label
                  htmlFor="qr-poster-caption"
                  className="block text-[11px] font-semibold text-[#7A6452] mb-1"
                >
                  Scan Prompt Text
                </label>
                <input
                  id="qr-poster-caption"
                  type="text"
                  maxLength={70}
                  value={posterCaption}
                  onChange={(e) => setPosterCaption(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E0D2C2] text-xs text-[#2C1C12] focus:outline-none focus:ring-1 focus:ring-[#D4621A]"
                />
              </div>

              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs text-[#5C4533] font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showBranding}
                    onChange={(e) => setShowBranding(e.target.checked)}
                    className="w-4 h-4 accent-[#D4621A] rounded cursor-pointer"
                  />
                  <span>Show cafe branding</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-[#5C4533] font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeWifiHint}
                    onChange={(e) => setIncludeWifiHint(e.target.checked)}
                    className="w-4 h-4 accent-[#D4621A] rounded cursor-pointer"
                  />
                  <span>Include Guest Wi-Fi on poster</span>
                </label>
              </div>

              {syncStatus === 'local' && !isSupabaseConfigured() && (
                <div className="pt-2 border-t border-[#F0E6D8] text-[11px] text-[#7A6452] leading-relaxed">
                  <strong>Multi-Device Tip:</strong> Browser-tab sync is ready locally. To push Admin edits live to external customer phones over the internet, configure{' '}
                  <code className="px-1 py-0.5 rounded bg-[#FAF6EE] text-[#2C1C12] font-mono">
                    VITE_SUPABASE_URL
                  </code>{' '}
                  &amp;{' '}
                  <code className="px-1 py-0.5 rounded bg-[#FAF6EE] text-[#2C1C12] font-mono">
                    VITE_SUPABASE_ANON_KEY
                  </code>{' '}
                  and run the realtime SQL migration in Supabase.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Printable QR Card Preview + Downloads */}
          <div className="lg:col-span-6 space-y-4">
            <div
              id="printable-menu-qr-card"
              className="bg-[#FFFDF9] rounded-3xl border border-[#E8D9C5] overflow-hidden shadow-xs"
            >
              {/* Branded Header */}
              <div className="bg-gradient-to-br from-[#2D1B11] via-[#3E271A] to-[#523422] text-white px-6 py-5 text-center space-y-2">
                {showBranding && (
                  <div className="flex justify-center">
                    <BrandEmblem logoUrl={brandLogo} brandName={cafeName} size="sm" />
                  </div>
                )}
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#FDBA74] tabular-nums">
                  {activeTableLabel
                    ? `Table ${activeTableLabel} · Live Digital Menu`
                    : 'Live Digital Menu'}
                </p>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-white leading-tight">
                  {showBranding ? cafeName : 'Scan Our Menu'}
                </h3>
                <p className="text-xs text-[#E7D5C1]">{cafeInfo.location}</p>
              </div>

              {/* QR Matrix Area */}
              <div className="p-6 sm:p-8 flex flex-col items-center text-center space-y-4">
                <div className="p-4 rounded-2xl bg-white border border-[#EDE2D2] shadow-2xs">
                  {qrPngDataUrl ? (
                    <img
                      src={qrPngDataUrl}
                      alt={
                        activeTableLabel
                          ? `QR code for Table ${activeTableLabel} menu`
                          : `QR code for ${cafeName} live menu`
                      }
                      className={`w-56 h-56 sm:w-64 sm:h-64 object-contain transition-opacity ${
                        isGenerating ? 'opacity-50' : 'opacity-100'
                      }`}
                    />
                  ) : (
                    <div className="w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center text-[#8C7662]">
                      <QrCode className="w-12 h-12 animate-pulse" />
                    </div>
                  )}
                </div>

                <div className="space-y-1 max-w-sm">
                  <p className="text-sm font-bold text-[#2C1C12] flex items-center justify-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-[#D4621A] shrink-0" />
                    <span>{posterCaption.trim() || 'Scan to view our live digital menu'}</span>
                  </p>
                  <p className="text-xs text-[#7A6452]">
                    {includeWifiHint && cafeInfo.wifiPassword
                      ? `Guest Wi-Fi: ${cafeInfo.wifiPassword} · Open: ${cafeInfo.openingHours}`
                      : `Open: ${cafeInfo.openingHours} · ${cafeInfo.contactNumber}`}
                  </p>
                </div>

                <div className="text-[11px] font-mono text-[#B45309] break-all max-w-full px-3">
                  {targetUrl}
                </div>
              </div>
            </div>

            {/* Download & Print Action Bar */}
            <div className="bg-white rounded-2xl border border-[#EDE2D2] p-4 space-y-3 print:hidden">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleDownloadBrandedPoster}
                  disabled={!qrPngDataUrl}
                  className="flex-1 min-w-[180px] min-h-[44px] px-4 py-2.5 rounded-xl bg-[#D4621A] hover:bg-[#B84E0F] disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-2xs transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download QR Poster (PNG)</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadRawPng}
                  disabled={!qrPngDataUrl}
                  className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#FAF6EE] hover:bg-[#EFE5D6] border border-[#E0D2C2] text-[#2C1C12] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5 text-[#D4621A]" />
                  <span>QR PNG</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadSvg}
                  disabled={!qrSvgString}
                  className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#FAF6EE] hover:bg-[#EFE5D6] border border-[#E0D2C2] text-[#2C1C12] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5 text-[#D4621A]" />
                  <span>SVG</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#F0E6D8]">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#FAF6EE] hover:bg-[#EFE5D6] border border-[#E0D2C2] text-[#5C4533] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Card</span>
                  </button>

                  <a
                    href={targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#FAF6EE] hover:bg-[#EFE5D6] border border-[#E0D2C2] text-[#5C4533] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#D4621A]" />
                    <span>Open QR Link</span>
                  </a>
                </div>

                {downloadFeedback && (
                  <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>{downloadFeedback}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
