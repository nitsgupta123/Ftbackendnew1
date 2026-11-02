"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../ui/icons";
import type { ItineraryData, ItineraryDay } from "@/lib/package-types";
import {
  clearItineraryDraft,
  coerceItineraryDays,
  dayHasUserContent,
  isEmptyRichText,
  parseDurationDays,
  readItineraryDraft,
  resolveItineraryDays,
  writeItineraryDraft,
} from "@/lib/itinerary-days";
import { uploadMediaFile } from "@/lib/media-api";
import { saveButtonLabel, stepPreviousButtonClass, stepSaveButtonClass, type StepFormBaseProps } from "./step-form-props";
import { Button } from "@/components/ui/button";
import BlogRichTextEditor from "@/components/blogs/BlogRichTextEditor";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleSwitch } from "@/components/ui/toggle-switch";

interface ItineraryFormProps extends StepFormBaseProps {
  onNext: (data: ItineraryData) => void | boolean | Promise<void | boolean>;
  onPrevious: () => void;
  initialData?: ItineraryData | null;
  /** Package duration in days from Package Basics (`days` field). */
  packageDurationDays?: string | number | null;
  packageId?: number | null;
}

function ToggleBlock({
  label,
  enabled,
  onChange,
}: {
  label: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-full border border-gray-200 bg-white">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <ToggleSwitch
        checked={enabled}
        onCheckedChange={onChange}
        color="gold"
        aria-label={label}
      />
    </div>
  );
}

function PillTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-3 py-1 text-xs font-medium text-[#A8832A] border border-[#A8832A]/40 rounded-full bg-[#FFF9EB]">
      {label}
    </span>
  );
}

function storeRichText(html: string): string {
  return isEmptyRichText(html) ? "" : html;
}

function DayImageUpload({
  value,
  onChange,
}: {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const result = await uploadMediaFile(file);
      onChange(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <Label className="block text-xs font-medium text-gray-600 mb-1.5">
        Day image
      </Label>
      <div className="rounded-[12px] border border-dashed border-[#E5E7EB] bg-[#FAFAFA] p-4">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void handleUpload(file);
          }}
        />

        {value ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="overflow-hidden rounded-[10px] border border-[#E5E7EB] bg-white shrink-0 w-full sm:w-40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value}
                alt="Day"
                className="h-28 w-full object-cover"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
                className="px-4 py-2 text-xs font-semibold text-[#A8832A] bg-white border border-[#E8D5A3] rounded-[8px] hover:bg-[#FFF9EB] transition-colors"
              >
                {uploading ? "Uploading…" : "Replace"}
              </Button>
              <Button
                type="button"
                disabled={uploading}
                onClick={() => {
                  setError(null);
                  onChange(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-[#B91C1C] bg-white border border-[#FECACA] rounded-[8px] hover:bg-[#FEF2F2] transition-colors"
              >
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center py-2">
            <div className="w-11 h-11 rounded-full bg-white border border-[#E5E7EB] flex items-center justify-center mb-2 shadow-sm">
              <Icon name="Upload" size={18} className="text-[#A8832A]" />
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Optional photo for this day (JPEG, PNG, WebP)
            </p>
            <Button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="px-5 py-2 text-xs font-semibold text-[#A8832A] bg-white border border-[#E8D5A3] rounded-[8px] hover:bg-[#FFF9EB] transition-colors"
            >
              {uploading ? "Uploading…" : "Upload image"}
            </Button>
          </div>
        )}

        {error ? <p className="mt-2 text-xs text-[#B91C1C]">{error}</p> : null}
      </div>
    </div>
  );
}

interface DayCardProps {
  day: ItineraryDay;
  isOpen: boolean;
  onToggle: () => void;
  onChange: (day: ItineraryDay) => void;
}

/** App header is h-16 (64px). Keep the day heading clear of it. */
const DAY_HEADER_SCROLL_OFFSET = 96;

function scrollDayTitleIntoView(card: HTMLElement) {
  const top = card.getBoundingClientRect().top + window.scrollY - DAY_HEADER_SCROLL_OFFSET;
  window.scrollTo({ top: Math.max(0, top), left: 0, behavior: "auto" });
}

function DayCard({ day, isOpen, onToggle, onChange }: DayCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const wasOpen = useRef(isOpen);
  const alignPending = useRef(false);

  useLayoutEffect(() => {
    const justOpened = isOpen && !wasOpen.current;
    wasOpen.current = isOpen;
    if (justOpened) alignPending.current = true;
    if (!isOpen) {
      alignPending.current = false;
      return;
    }
    if (!alignPending.current) return;

    const align = () => {
      const card = cardRef.current;
      if (!card) return;
      scrollDayTitleIntoView(card);
    };

    align();
    // A second pass catches layout from the day that just collapsed, and
    // keeps focus on the title from pushing the heading back under the header.
    const frame = window.requestAnimationFrame(() => {
      align();
      titleInputRef.current?.focus({ preventScroll: true });
      align();
      alignPending.current = false;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen]);

  const update = (patch: Partial<ItineraryDay>) => {
    onChange({ ...day, ...patch });
  };

  const inputClass =
    "w-full h-[48px] px-4 text-sm border border-[#E5E7EB] rounded-[10px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors";

  const textareaClass =
    "w-full px-4 py-3 text-sm border border-[#E5E7EB] rounded-[10px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors resize-y";

  const labelClass = "block text-xs font-medium text-gray-600 mb-1.5";

  return (
    <div
      ref={cardRef}
      className="bg-white rounded-[16px] border border-[#E5E7EB] shadow-sm overflow-hidden scroll-mt-24"
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full px-6 py-4 border-b border-gray-100 bg-[#FAFAFA] flex items-center justify-between gap-3 text-left hover:bg-[#F3F4F6] transition-colors"
      >
        <h3 className="text-base font-semibold text-[#1F2A44]">
          Day {day.dayNumber}
          {day.title ? (
            <span className="ml-2 font-normal text-gray-500">— {day.title}</span>
          ) : null}
        </h3>
        <Icon
          name={isOpen ? "ChevronDown" : "ChevronRight"}
          size={18}
          className="text-gray-400 shrink-0"
        />
      </button>

      {isOpen ? (
        <div className="p-6 space-y-5">
          <div>
            <Label className={labelClass}>Day title</Label>
            <Input
              ref={titleInputRef}
              type="text"
              placeholder="e.g., Arrival in Singapore"
              className={inputClass}
              value={day.title ?? ""}
              onChange={(e) => update({ title: e.target.value })}
            />
          </div>

          <DayImageUpload
            value={day.imageUrl}
            onChange={(imageUrl) => update({ imageUrl })}
          />

          <div>
            <Label className={labelClass}>Description</Label>
            <BlogRichTextEditor
              value={day.description ?? ""}
              onChange={(html) => {
                const next = storeRichText(html);
                if (next === (day.description ?? "")) return;
                update({ description: next });
              }}
              placeholder="Structure this day for clients — morning, afternoon, evening, transfers, and what they will see…"
              defaultHeight={180}
              minHeight={120}
              maxHeight={640}
            />
            <p className="mt-1.5 text-xs italic text-gray-400">
              Use headings, bullets, and emphasis so the day reads clearly for consultants and clients.
            </p>
          </div>

          <div>
            <Label className={labelClass}>Activities included</Label>
            <Textarea
              placeholder="List included activities..."
              rows={4}
              className={textareaClass}
              value={day.activitiesIncluded ?? ""}
              onChange={(e) => update({ activitiesIncluded: e.target.value })}
            />
          </div>

          <div>
            <Label className={labelClass}>Highlights</Label>
            <Textarea
              placeholder="Key highlights for this day..."
              rows={3}
              className={textareaClass}
              value={day.highlights ?? ""}
              onChange={(e) => update({ highlights: e.target.value })}
            />
          </div>

          <div>
            <Label className={labelClass}>Internal consultant notes</Label>
            <Textarea
              placeholder="Notes visible only to consultants..."
              rows={4}
              className={textareaClass}
              value={day.internalNotes ?? ""}
              onChange={(e) => update({ internalNotes: e.target.value })}
            />
          </div>

          <div>
            <Label className={labelClass}>Mobility warnings</Label>
            <Textarea
              placeholder="e.g., Uneven terrain, stairs..."
              rows={3}
              className={textareaClass}
              value={day.mobilityWarning ?? ""}
              onChange={(e) => update({ mobilityWarning: e.target.value })}
            />
          </div>

          <div>
            <Label className={labelClass}>Supplier notes</Label>
            <Textarea
              placeholder="Supplier-specific information..."
              rows={3}
              className={textareaClass}
              value={day.supplierNotes ?? ""}
              onChange={(e) => update({ supplierNotes: e.target.value })}
            />
          </div>

          <div>
            <Label className={labelClass}>Dietary notes</Label>
            <Textarea
              placeholder="Dietary requirements or food availability notes..."
              rows={3}
              className={textareaClass}
              value={day.dietaryNotes ?? ""}
              onChange={(e) => update({ dietaryNotes: e.target.value })}
            />
          </div>

          <div>
            <Label className={labelClass}>Meals</Label>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <ToggleBlock
                label="Breakfast"
                enabled={day.breakfast ?? false}
                onChange={(value) => update({ breakfast: value })}
              />
              <ToggleBlock
                label="Lunch"
                enabled={day.lunch ?? false}
                onChange={(value) => update({ lunch: value })}
              />
              <ToggleBlock
                label="Dinner"
                enabled={day.dinner ?? false}
                onChange={(value) => update({ dinner: value })}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function ItineraryForm({
  onNext,
  onPrevious,
  isSaving = false,
  initialData,
  packageDurationDays,
  packageId = null,
}: ItineraryFormProps) {
  const duration = parseDurationDays(packageDurationDays);
  const savedDays = useMemo(() => coerceItineraryDays(initialData), [initialData]);
  const savedKey = JSON.stringify(savedDays);
  const sourceKey = `${packageId ?? "new"}|${duration}|${savedKey}`;

  const [appliedSourceKey, setAppliedSourceKey] = useState(sourceKey);
  const [days, setDays] = useState<ItineraryDay[]>(() =>
    resolveItineraryDays(
      packageDurationDays,
      savedDays,
      readItineraryDraft(packageId)
    )
  );
  const [openDayNumber, setOpenDayNumber] = useState<number | null>(() =>
    duration >= 1 ? 1 : null
  );
  const daysRef = useRef(days);
  daysRef.current = days;

  if (appliedSourceKey !== sourceKey) {
    const nextDays = resolveItineraryDays(
      packageDurationDays,
      savedDays,
      readItineraryDraft(packageId),
      days
    );
    setAppliedSourceKey(sourceKey);
    setDays(nextDays);
    const nextOpen =
      duration < 1 ? null : openDayNumber != null && openDayNumber <= Math.max(duration, nextDays.length) ? openDayNumber : 1;
    if (nextOpen !== openDayNumber) setOpenDayNumber(nextOpen);
  }

  useEffect(() => {
    if (!packageId) return;
    if (days.some(dayHasUserContent)) {
      writeItineraryDraft(packageId, days);
      return;
    }
    // Package duration can arrive a render later. Don't drop a stored draft before those days exist.
    if (duration < 1 || savedDays.some(dayHasUserContent)) return;
    clearItineraryDraft(packageId);
  }, [packageId, days, duration, savedDays]);

  const updateDay = (index: number, day: ItineraryDay) => {
    setDays((prev) => prev.map((d, i) => (i === index ? day : d)));
  };

  const handleToggleDay = (dayNumber: number) => {
    setOpenDayNumber((prev) => (prev === dayNumber ? null : dayNumber));
  };

  const itineraryGuideTags = [
    "Client copy",
    "Day image",
    "Activities",
    "Highlights",
    "Meals",
    "Mobility warnings",
    "Dietary notes",
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm px-6 pt-6 pb-5">
        <div className="flex items-center gap-2.5 mb-2">
          <h2 className="text-lg font-semibold text-[#1F2A44]">Itinerary</h2>
          <Button
            type="button"
            className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#E5E7EB] text-gray-400 hover:bg-gray-300 hover:text-gray-500 transition-colors"
            title="Info"
          >
            <span className="text-[11px] font-bold leading-none">i</span>
          </Button>
        </div>
        <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
          Days are generated automatically from the package duration. Open one day
          at a time to keep long itineraries manageable. Optional experiences belong
          in Add-ons / Inclusions.
        </p>
      </div>

      <div className="bg-[#FFFBEB] border border-[#FCD34D] rounded-[12px] p-4">
        <p className="text-sm text-[#92400E] mb-3 leading-relaxed">
          {days.length >= 1 ? (
            <>
              {duration >= 1 ? (
                <>
                  Package duration is <strong>{duration} day{duration === 1 ? "" : "s"}</strong>
                  {" — "}
                  {days.length} itinerary day{days.length === 1 ? "" : "s"} ready to edit.
                </>
              ) : (
                <>
                  {days.length} itinerary day{days.length === 1 ? "" : "s"} restored.
                  Set <strong>Days</strong> under Package Basics if this count should change.
                </>
              )}
            </>
          ) : (
            <>
              Set <strong>Days</strong> under Package Basics to generate itinerary tabs
              automatically.
            </>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          {itineraryGuideTags.map((tag) => (
            <PillTag key={tag} label={tag} />
          ))}
        </div>
      </div>

      {days.length === 0 ? (
        <div className="bg-white rounded-[12px] border border-dashed border-[#E5E7EB] px-6 py-10 text-center">
          <p className="text-sm text-gray-500">
            No itinerary days yet. Go back to Package Basics and enter the package
            duration (Days).
          </p>
        </div>
      ) : (
        days.map((day, index) => (
          <DayCard
            key={day.dayNumber}
            day={day}
            isOpen={openDayNumber === day.dayNumber}
            onToggle={() => handleToggleDay(day.dayNumber)}
            onChange={(updated) => updateDay(index, updated)}
          />
        ))
      )}

      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <Button
          type="button"
          onClick={onPrevious}
          className={stepPreviousButtonClass}
        >
          <Icon name="ChevronLeft" size={16} />
          Previous
        </Button>

        <p className="text-xs text-gray-400 flex-1 text-center">
          ... Incomplete sections stay as draft.
        </p>

        <Button
          type="button"
          onClick={() => {
            const payload = { days: daysRef.current };
            void Promise.resolve(onNext(payload)).then((saved) => {
              if (saved) clearItineraryDraft(packageId);
            });
          }}
          disabled={isSaving}
          data-package-step-save="" className={stepSaveButtonClass}
        >
          {saveButtonLabel(isSaving)}
          <Icon name="ChevronRight" size={16} />
        </Button>
      </div>
    </div>
  );
}
