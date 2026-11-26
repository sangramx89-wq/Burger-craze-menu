import React, { useState } from 'react';
import {
  Plus,
  Play,
  Trash2,
  Edit3,
  X,
  Upload,
  RefreshCw,
  Clock,
  Layers,
  Sun,
  Moon,
  Sparkles,
  Coffee,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { MenuPopup } from '../types/popup.ts';
import { ResetConfirmModal } from './ResetConfirmModal.tsx';
import { ImageFramingModal } from './ImageFramingModal.tsx';
import { DEFAULT_CATEGORIES } from '../lib/menuDefaults.ts';
import {
  PRESET_PROMO_BANNERS,
  formatTime12Hour,
  generatePopupUuid,
  isPopupInActiveSchedule,
} from '../lib/popupService.ts';
import {
  CompressionResult,
  estimateDataUrlSizeBytes,
  formatBytes,
} from '../lib/imageCompressor.ts';
import { uploadCompressedMediaToStorage } from '../lib/mediaStorage.ts';

interface PopupBannerAdminProps {
  popups: MenuPopup[];
  onSavePopup: (popup: MenuPopup) => void;
  onDeletePopup: (popupId: string) => void;
  onToggleActive: (popupId: string) => void;
  onResetDefaults: () => void;
  onTestQueue: () => void;
  categories?: string[];
}

const SCHEDULE_PRESETS = [
  {
    name: 'Lunch Special',
    icon: Sun,
    start: '11:30',
    end: '15:30',
    label: '11:30 AM – 3:30 PM',
  },
  {
    name: 'Happy Hours',
    icon: Coffee,
    start: '16:00',
    end: '19:00',
    label: '4:00 PM – 7:00 PM',
  },
  {
    name: 'Dinner Feast',
    icon: Moon,
    start: '18:30',
    end: '23:00',
    label: '6:30 PM – 11:00 PM',
  },
  {
    name: 'Late Night Bites',
    icon: Sparkles,
    start: '22:00',
    end: '02:00',
    label: '10:00 PM – 2:00 AM',
  },
];

const DURATION_PRESETS = [4, 6, 8, 10, 15, 0];

export const PopupBannerAdmin: React.FC<PopupBannerAdminProps> = ({
  popups,
  onSavePopup,
  onDeletePopup,
  onToggleActive,
  onResetDefaults,
  onTestQueue,
  categories = DEFAULT_CATEGORIES,
}) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPopup, setEditingPopup] = useState<MenuPopup | null>(null);
  const [deleteConfirmPopup, setDeleteConfirmPopup] = useState<MenuPopup | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState(PRESET_PROMO_BANNERS[0].url);
  const [description, setDescription] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [ctaLink, setCtaLink] = useState('');
  const [priority, setPriority] = useState(1);
  const [isActive, setIsActive] = useState(true);

  // Time setting states
  const [displayDuration, setDisplayDuration] = useState<number>(6); // seconds (0 = manual)
  const [isScheduled, setIsScheduled] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<string>('11:30');
  const [endTime, setEndTime] = useState<string>('15:30');

  // Image upload and framing draft state
  const [pendingBannerImageFile, setPendingBannerImageFile] = useState<File | null>(null);
  const [isSavingPopup, setIsSavingPopup] = useState(false);
  const [imageUploadState, setImageUploadState] = useState<{
    isCompressing?: boolean;
    originalSize?: string;
    finalSize?: string;
    wasCompressed?: boolean;
    error?: string;
  }>({});

  // File upload reader: stage draft in interactive framing modal before confirming
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImageUploadState({});
    setPendingBannerImageFile(file);
  };

  const handleConfirmFramedBanner = (result: CompressionResult) => {
    setImageUrl(result.dataUrl);
    setImageUploadState({
      isCompressing: false,
      originalSize: result.formattedOriginalSize,
      finalSize: result.formattedSize,
      wasCompressed: result.wasCompressed,
    });
    setPendingBannerImageFile(null);
  };

  const handleOpenAddModal = () => {
    setEditingPopup(null);
    setPendingBannerImageFile(null);
    setImageUploadState({});
    setTitle('');
    setImageUrl(PRESET_PROMO_BANNERS[0].url);
    setDescription('');
    setCtaText('');
    setCtaLink('');
    setPriority(popups.length + 1);
    setIsActive(true);
    setDisplayDuration(6);
    setIsScheduled(false);
    setStartTime('11:30');
    setEndTime('15:30');
    setIsEditorOpen(true);
  };

  const handleOpenEditModal = (popup: MenuPopup) => {
    setEditingPopup(popup);
    setPendingBannerImageFile(null);
    setImageUploadState({});
    setTitle(popup.title);
    setImageUrl(popup.image_url);
    setDescription(popup.description || '');
    setCtaText(popup.cta_text || '');
    setCtaLink(popup.cta_link || '');
    setPriority(popup.priority || 1);
    setIsActive(popup.is_active);
    setDisplayDuration(popup.display_duration ?? 6);
    setIsScheduled(popup.is_scheduled ?? false);
    setStartTime(popup.start_time || '11:30');
    setEndTime(popup.end_time || '15:30');
    setIsEditorOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !imageUrl.trim() || isSavingPopup) return;

    setIsSavingPopup(true);
    try {
      const trimmedCtaText = ctaText.trim();
      const trimmedCtaLink = ctaLink.trim();
      const resolvedImageUrl = await uploadCompressedMediaToStorage(imageUrl.trim(), 'popups');

      const savedItem: MenuPopup = {
        id: editingPopup ? editingPopup.id : generatePopupUuid(),
        title: title.trim(),
        image_url: resolvedImageUrl,
        description: description.trim() || undefined,
        cta_text: trimmedCtaText || undefined,
        cta_link: trimmedCtaLink || undefined,
        is_active: isActive,
        priority: Number(priority) || 1,
        display_duration: Number(displayDuration) >= 0 ? Number(displayDuration) : 6,
        is_scheduled: isScheduled,
        start_time: isScheduled && startTime ? startTime : undefined,
        end_time: isScheduled && endTime ? endTime : undefined,
        created_at: editingPopup?.created_at || new Date().toISOString(),
      };

      onSavePopup(savedItem);
      setIsEditorOpen(false);
    } finally {
      setIsSavingPopup(false);
    }
  };

  const activeCount = popups.filter((p) => p.is_active).length;
  const sortedPopups = [...popups].sort((a, b) => a.priority - b.priority);

  // Current time preview for the schedule form
  const now = new Date();
  const currentLocalMinutes = now.getHours() * 60 + now.getMinutes();
  const [previewStartH, previewStartM] = startTime.split(':').map(Number);
  const [previewEndH, previewEndM] = endTime.split(':').map(Number);
  const previewStartMinutes = (previewStartH || 0) * 60 + (previewStartM || 0);
  const previewEndMinutes = (previewEndH || 0) * 60 + (previewEndM || 0);

  const isCurrentTimeWithinFormSchedule = isScheduled
    ? previewStartMinutes <= previewEndMinutes
      ? currentLocalMinutes >= previewStartMinutes && currentLocalMinutes <= previewEndMinutes
      : currentLocalMinutes >= previewStartMinutes || currentLocalMinutes <= previewEndMinutes
    : true;

  const currentLocalTimeFormatted = `${now.getHours() % 12 || 12}:${
    now.getMinutes() < 10 ? '0' : ''
  }${now.getMinutes()} ${now.getHours() >= 12 ? 'PM' : 'AM'}`;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#FFFDF9]">
      {/* Top Banner Control Bar */}
      <div className="px-5 py-3.5 bg-[#FAF8F5] border-b border-[#F0E6D8] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#8C7662]">
            Total: <strong className="text-[#2C1C12]">{popups.length}</strong> · Active in Queue:{' '}
            <strong className="text-emerald-700">{activeCount}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Test Queue Flow Button */}
          <button
            type="button"
            onClick={onTestQueue}
            title="Preview how active pop-ups appear sequentially to customers with countdown timers"
            className="px-3.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-[#B45309] border border-amber-200 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 shadow-2xs"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Test Pop-up Queue</span>
          </button>

          {/* Add New Banner Button */}
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-3.5 py-1.5 rounded-xl bg-[#D4621A] hover:bg-[#B84E0F] text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Banner</span>
          </button>

          {/* Reset Defaults */}
          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            title="Restore default promotional banners"
            className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#F3ECE1] text-[#7A6452] border border-[#E8DDCE] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Defaults</span>
          </button>
        </div>
      </div>

      {/* Pop-up Cards Grid */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 no-scrollbar">
        {sortedPopups.length === 0 ? (
          <div className="text-center py-12 text-[#8C7662] text-xs space-y-2">
            <Layers className="w-8 h-8 text-[#D4621A]/50 mx-auto" />
            <p>No promotional pop-up banners configured.</p>
            <button
              onClick={handleOpenAddModal}
              className="text-[#D4621A] font-bold hover:underline cursor-pointer"
            >
              Add your first announcement banner &rarr;
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {sortedPopups.map((popup) => {
              const inSchedule = isPopupInActiveSchedule(popup);
              const durationSec = popup.display_duration ?? 6;

              return (
                <div
                  key={popup.id}
                  className={`bg-white rounded-2xl p-3.5 border transition-all flex flex-col justify-between gap-3 shadow-2xs ${
                    popup.is_active ? 'border-[#EDE2D2]' : 'border-dashed border-[#E5DACD] opacity-75'
                  }`}
                >
                  {/* Header row: Priority badge + Active toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#FAF4EB] text-[#A2531F] border border-[#EEDCC8] flex items-center gap-1">
                      <span>Priority:</span>
                      <strong>#{popup.priority}</strong>
                    </span>

                    {/* Active / Inactive Switch */}
                    <button
                      type="button"
                      onClick={() => onToggleActive(popup.id)}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                        popup.is_active
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                          : 'bg-neutral-100 text-neutral-600 border border-neutral-300 hover:bg-neutral-200'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          popup.is_active ? 'bg-emerald-600' : 'bg-neutral-400'
                        }`}
                      />
                      <span>{popup.is_active ? 'Active in Queue' : 'Inactive'}</span>
                    </button>
                  </div>

                  {/* Banner Thumbnail & Info */}
                  <div className="flex items-start gap-3">
                    <div className="w-20 h-16 rounded-xl overflow-hidden shrink-0 bg-[#F4EBE0] border border-[#EAE0D2]">
                      <img
                        src={popup.image_url}
                        alt={popup.title}
                        className={`w-full h-full object-cover ${!popup.is_active ? 'grayscale-40' : ''}`}
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif font-bold text-xs sm:text-sm text-[#2C1C12] truncate">
                        {popup.title}
                      </h3>
                      {popup.description && (
                        <p className="text-[10.5px] text-[#8C7662] line-clamp-2 mt-0.5 leading-snug">
                          {popup.description}
                        </p>
                      )}
                      <div className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold">
                        <span className="text-[#8C7662]">CTA:</span>
                        {popup.cta_text?.trim() && popup.cta_link?.trim() ? (
                          <>
                            <span className="text-[#A2531F] underline">{popup.cta_text}</span>
                            <span className="text-[#8C7662] font-normal">({popup.cta_link})</span>
                          </>
                        ) : (
                          <span className="text-[#8C7662] font-normal">None (Announcement only)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Showing Time & Duration Settings Strip */}
                  <div className="p-2 rounded-xl bg-[#FAF7F0] border border-[#F2ECE1] text-[10px] space-y-1">
                    <div className="flex items-center justify-between text-[#7A6452]">
                      <span className="flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3 text-[#D4621A]" />
                        <span>Display Timer:</span>
                      </span>
                      <strong className="font-mono text-[#2C1C12]">
                        {durationSec > 0 ? `${durationSec}s auto-advance` : 'Manual click only'}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between text-[#7A6452]">
                      <span className="flex items-center gap-1 font-medium">
                        <span>Showing Hours:</span>
                      </span>
                      {popup.is_scheduled && popup.start_time && popup.end_time ? (
                        <div className="flex items-center gap-1 font-mono">
                          <span className="font-semibold text-[#2C1C12]">
                            {formatTime12Hour(popup.start_time)} – {formatTime12Hour(popup.end_time)}
                          </span>
                          <span
                            title={inSchedule ? 'Active right now' : 'Currently outside scheduled hours'}
                            className={`w-1.5 h-1.5 rounded-full ${
                              inSchedule ? 'bg-emerald-600' : 'bg-amber-600'
                            }`}
                          />
                        </div>
                      ) : (
                        <span className="font-medium text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded text-[9.5px]">
                          All Day
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions row: Edit & Delete */}
                  <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-[#F5EFE7]">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(popup)}
                      aria-label={`Edit ${popup.title}`}
                      className="px-2.5 py-1 rounded-lg bg-[#FAF6EE] hover:bg-[#EFE5D6] text-[#6B5746] hover:text-[#D4621A] border border-[#E8DDCE] transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteConfirmPopup(popup)}
                      aria-label={`Delete ${popup.title}`}
                      className="p-1 rounded-lg bg-[#FFF2F2] hover:bg-[#FFE0E0] text-rose-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Banner Dialog */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-[#EDE2D2] max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-[#F0E6D8] flex items-center justify-between bg-[#FAF7EE]">
              <h3 className="font-serif text-lg font-bold text-[#2C1C12]">
                {editingPopup ? 'Edit Promotional Banner' : 'Create New Pop-up Banner'}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="w-8 h-8 rounded-full bg-white text-[#6B5746] flex items-center justify-center hover:bg-[#EFE5D6] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="overflow-y-auto p-5 space-y-4 text-xs no-scrollbar">
              {/* Title & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#5C4533] mb-1">
                    Banner Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Weekend Pizza Fiesta!"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E0D2C2] text-[#2C1C12] font-medium focus:outline-none focus:ring-1 focus:ring-[#D4621A]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#5C4533] mb-1">
                    Queue Priority
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E0D2C2] text-[#2C1C12] font-mono focus:outline-none focus:ring-1 focus:ring-[#D4621A]"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-[#5C4533] mb-1">
                  Description / Caption (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. 20% off all artisan wood-fired pizzas every Friday through Sunday."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E0D2C2] text-[#2C1C12] font-medium focus:outline-none focus:ring-1 focus:ring-[#D4621A]"
                />
              </div>

              {/* Promotional Image Selector with 200 KB Auto-Compressing Upload */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-[#5C4533]">
                    Promotional Banner Image (Max 200 KB) *
                  </label>
                  {imageUrl && (
                    <span className="text-[10px] font-mono text-[#8C7662]">
                      {imageUrl.startsWith('data:')
                        ? formatBytes(estimateDataUrlSizeBytes(imageUrl))
                        : 'Web Asset URL'}
                    </span>
                  )}
                </div>

                {/* Upload File + URL input */}
                <div className="space-y-2">
                  <div className="flex gap-2 items-center">
                    <label className="px-3 py-2 rounded-xl bg-[#FAF6EE] hover:bg-[#EFE5D6] text-[#7A6452] border border-[#E0D2C2] font-semibold text-xs flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors">
                      <Upload className="w-3.5 h-3.5 text-[#D4621A]" />
                      <span>{imageUploadState.isCompressing ? 'Optimizing...' : 'Upload Photo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={imageUploadState.isCompressing}
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>

                    <input
                      type="url"
                      placeholder="Or paste direct image URL (https://...)"
                      value={imageUrl}
                      onChange={(e) => {
                        setImageUrl(e.target.value);
                        setImageUploadState({});
                      }}
                      className="flex-1 px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E0D2C2] text-[#2C1C12] focus:outline-none focus:ring-1 focus:ring-[#D4621A]"
                    />

                    {/* Preview box */}
                    <div className="w-12 h-10 rounded-xl overflow-hidden bg-neutral-100 shrink-0 border border-[#E0D2C2]">
                      <img
                        src={imageUrl || PRESET_PROMO_BANNERS[0].url}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>

                  <p className="text-[10.5px] text-[#8C7662] leading-snug tabular-nums">
                    Recommended aspect ratio: <strong className="font-semibold text-[#5C4533]">16:9 or 4:3 landscape</strong> (1200 × 675 px) · Auto-compressed &le; 200 KB
                  </p>

                  {/* Optimization & Size Badge */}
                  {imageUploadState.finalSize && (
                    <div className="flex items-center gap-1.5 text-[10.5px] px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>
                        Banner ready: <strong>{imageUploadState.finalSize}</strong> (Strictly &le; 200 KB)
                        {imageUploadState.wasCompressed && (
                          <span className="text-[#8C7662]"> · Auto-compressed from {imageUploadState.originalSize}</span>
                        )}
                      </span>
                    </div>
                  )}

                  {imageUploadState.error && (
                    <div className="text-[10px] text-rose-600 bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-200">
                      {imageUploadState.error}
                    </div>
                  )}

                  {/* Preset quick buttons */}
                  <div className="pt-1">
                    <span className="text-[10px] text-[#8C7662] block mb-1">
                      Or select from curated promotional banner presets:
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                      {PRESET_PROMO_BANNERS.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => {
                            setImageUrl(preset.url);
                            if (!title) setTitle(preset.title);
                            if (!description) setDescription(preset.description);
                          }}
                          className={`p-1.5 rounded-xl text-[10px] text-left transition-all border cursor-pointer flex flex-col gap-1 ${
                            imageUrl === preset.url
                              ? 'bg-[#FFF5EB] border-[#D4621A] text-[#B84E0F] font-bold'
                              : 'bg-[#FAF6EE] border-[#E8DDCE] text-[#7A6452] hover:bg-[#F0E6D8]'
                          }`}
                        >
                          <div className="w-full h-12 rounded-lg overflow-hidden bg-neutral-100">
                            <img
                              src={preset.url}
                              alt={preset.name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <span className="truncate">{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Call-to-Action (CTA) Button Settings (Optional) */}
              <div className="p-3.5 rounded-2xl bg-[#FFF9F3] border border-[#FED7AA] space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#9A3412] mb-1">
                      CTA Button Text (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Leave blank to hide CTA"
                      value={ctaText}
                      onChange={(e) => setCtaText(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#E0D2C2] text-[#2C1C12]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#9A3412] mb-1">
                      CTA Action Target (Optional)
                    </label>
                    <select
                      value={ctaLink}
                      onChange={(e) => setCtaLink(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#E0D2C2] text-[#2C1C12] font-medium"
                    >
                      <option value="">None (No CTA button)</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          Filter to {cat}
                        </option>
                      ))}
                      {ctaLink && ctaLink !== 'All' && !categories.includes(ctaLink) && (
                        <option value={ctaLink}>Filter to {ctaLink}</option>
                      )}
                      <option value="All">View Full Menu (All)</option>
                    </select>
                  </div>
                </div>

                <p className="text-[10px] text-[#8C7662]">
                  {ctaText.trim() && ctaLink.trim() ? (
                    <span className="text-emerald-700 font-medium">
                      CTA button &quot;{ctaText.trim()}&quot; will appear next to Cancel.
                    </span>
                  ) : (
                    <span>
                      CTA button is hidden unless both CTA Button Text and CTA Action Target are set.
                    </span>
                  )}
                </p>
              </div>

              {/* TIME SETTINGS SECTION */}
              <div className="p-4 rounded-2xl bg-[#FAF6EE] border border-[#E8DDCE] space-y-3.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#D4621A] text-white flex items-center justify-center">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-[#2C1C12] text-xs">
                      Banner Showing Time & Auto-Advance Settings
                    </h4>
                    <p className="text-[10px] text-[#8C7662]">
                      Configure display duration progress bar and scheduled hours.
                    </p>
                  </div>
                </div>

                {/* 1. Display Duration Setting */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-[#5C4533]">
                      Auto-Advance Duration (Seconds)
                    </label>
                    <span className="font-mono font-bold text-[#D4621A]">
                      {displayDuration > 0 ? `${displayDuration} seconds` : 'Manual Dismiss Only'}
                    </span>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {DURATION_PRESETS.map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setDisplayDuration(sec)}
                        className={`px-2.5 py-1 rounded-lg text-[10.5px] font-semibold border transition-all cursor-pointer ${
                          displayDuration === sec
                            ? 'bg-[#D4621A] text-white border-[#D4621A] shadow-2xs'
                            : 'bg-white text-[#7A6452] border-[#E0D2C2] hover:bg-[#F5ECE1]'
                        }`}
                      >
                        {sec === 0 ? 'Manual (No auto)' : `${sec}s`}
                      </button>
                    ))}

                    <div className="flex items-center gap-1 ml-auto">
                      <span className="text-[10px] text-[#8C7662]">Custom:</span>
                      <input
                        type="number"
                        min={0}
                        max={60}
                        value={displayDuration}
                        onChange={(e) => setDisplayDuration(Math.max(0, Number(e.target.value)))}
                        className="w-14 px-2 py-0.5 rounded-lg bg-white border border-[#E0D2C2] text-center font-mono text-xs text-[#2C1C12]"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-[#8C7662]">
                    A visual countdown progress bar will smoothly display this duration. Hovering or touching the banner temporarily pauses the timer.
                  </p>
                </div>

                <div className="border-t border-[#E8DDCE] pt-3 space-y-2.5">
                  {/* 2. Schedule Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#2C1C12] block">
                        Schedule Daily Showing Hours
                      </span>
                      <span className="text-[10px] text-[#8C7662]">
                        Restrict this banner to specific meal times (e.g. Lunch or Dinner).
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsScheduled((v) => !v)}
                      className={`w-11 h-6 rounded-full transition-colors cursor-pointer relative p-0.5 ${
                        isScheduled ? 'bg-[#D4621A]' : 'bg-neutral-300'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                          isScheduled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Scheduled Inputs */}
                  {isScheduled ? (
                    <div className="space-y-2.5 pt-1 bg-white p-3 rounded-xl border border-[#E2D5C5]">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10.5px] font-bold text-[#5C4533] mb-1">
                            Start Showing Time
                          </label>
                          <input
                            type="time"
                            required={isScheduled}
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E0D2C2] text-xs font-mono text-[#2C1C12]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10.5px] font-bold text-[#5C4533] mb-1">
                            End Showing Time
                          </label>
                          <input
                            type="time"
                            required={isScheduled}
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E0D2C2] text-xs font-mono text-[#2C1C12]"
                          />
                        </div>
                      </div>

                      {/* Quick Meal-time Presets */}
                      <div>
                        <span className="text-[10px] text-[#8C7662] block mb-1">
                          Quick Meal Time Presets:
                        </span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {SCHEDULE_PRESETS.map((preset) => {
                            const Icon = preset.icon;
                            const isSelected =
                              startTime === preset.start && endTime === preset.end;
                            return (
                              <button
                                key={preset.name}
                                type="button"
                                onClick={() => {
                                  setStartTime(preset.start);
                                  setEndTime(preset.end);
                                }}
                                className={`px-2 py-1.5 rounded-lg text-left text-[10px] border transition-all cursor-pointer flex items-center gap-1.5 ${
                                  isSelected
                                    ? 'bg-[#FFF5EB] border-[#D4621A] text-[#B84E0F] font-bold shadow-2xs'
                                    : 'bg-[#FAF8F5] border-[#E8DDCE] text-[#6B5746] hover:bg-[#F3ECE1]'
                                }`}
                              >
                                <Icon className="w-3 h-3 text-[#D4621A] shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <div className="truncate font-semibold">{preset.name}</div>
                                  <div className="text-[9px] text-[#8C7662] font-mono">
                                    {preset.label}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Live Schedule Status Indicator */}
                      <div className="p-2 rounded-lg bg-[#FAF8F5] border border-[#E8DDCE] flex items-center justify-between text-[10.5px]">
                        <span className="text-[#8C7662]">
                          Current Local Time: <strong>{currentLocalTimeFormatted}</strong>
                        </span>
                        <span
                          className={`font-semibold flex items-center gap-1 ${
                            isCurrentTimeWithinFormSchedule ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {isCurrentTimeWithinFormSchedule ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Active Right Now</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3 h-3" />
                              <span>Outside Hours</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 rounded-lg bg-[#FAF8F5] border border-[#EAE0D2] text-[10.5px] text-[#7A6452]">
                      🕒 <strong>All-Day Active</strong>: This banner will show anytime customers visit while the active toggle is enabled.
                    </div>
                  )}
                </div>
              </div>

              {/* Active Toggle Switch */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF8F5] border border-[#EAE0D2]">
                <div>
                  <span className="font-bold text-[#2C1C12] block">Enable Banner Immediately</span>
                  <span className="text-[10px] text-[#8C7662]">
                    If enabled, this banner will appear in the customer announcement queue.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive((v) => !v)}
                  className={`w-12 h-6 rounded-full transition-colors cursor-pointer relative p-0.5 ${
                    isActive ? 'bg-emerald-600' : 'bg-neutral-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                      isActive ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-[#F0E6D8] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-[#FAF6EE] text-[#7A6452] font-semibold hover:bg-[#F0E6D8] cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSavingPopup}
                  className="px-6 py-2.5 rounded-xl bg-[#D4621A] hover:bg-[#B84E0F] disabled:opacity-60 text-white font-semibold shadow-xs active:scale-95 cursor-pointer"
                >
                  {isSavingPopup ? 'Saving...' : editingPopup ? 'Save Banner' : 'Create Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmPopup && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 text-center shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6 stroke-[2]" />
            </div>

            <h4 className="font-serif text-lg font-bold text-[#2C1C12] mb-1">
              Delete &quot;{deleteConfirmPopup.title}&quot;?
            </h4>
            <p className="text-xs text-[#8C7662] mb-5 leading-relaxed">
              This will remove this announcement from the customer promotional queue.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmPopup(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#FAF6EE] hover:bg-[#F0E6D8] text-[#5C4533] font-semibold text-xs cursor-pointer"
              >
                Keep Banner
              </button>

              <button
                type="button"
                onClick={() => {
                  onDeletePopup(deleteConfirmPopup.id);
                  setDeleteConfirmPopup(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs cursor-pointer active:scale-95"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Two-Step Reset Pop-up Defaults Confirmation Modal */}
      <ResetConfirmModal
        isOpen={isResetConfirmOpen}
        itemLabel="Pop-up Banners"
        step1Description="This will replace all custom promotional banners, uploaded poster images, and schedule settings with the 3 default promos."
        step2Description="This action cannot be undone. Are you completely sure you want to remove custom banners and restore defaults?"
        confirmLabel="Reset Banners"
        onConfirm={onResetDefaults}
        onClose={() => setIsResetConfirmOpen(false)}
      />

      {/* Interactive Image Framing & Confirm Modal for Promotional Banner */}
      <ImageFramingModal
        isOpen={Boolean(pendingBannerImageFile)}
        draftFile={pendingBannerImageFile}
        preset="banner"
        onCancel={() => setPendingBannerImageFile(null)}
        onConfirm={handleConfirmFramedBanner}
      />
    </div>
  );
};
