"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "../ui/icons";
import type {
  BookingRange,
  ChildPriceType,
  DepartureDateEntry,
  DepartureMonth,
  DepartureStatus,
  DiscountType,
  HotelCategoryKey,
  HotelCategoryPricing,
  PackagePricingType,
  PricingAdultTier,
  PricingBlackout,
  PricingChildRow,
  PricingData,
  PricingDetailsBlock,
  PricingPromotion,
} from "@/lib/package-types";
import {
  saveButtonLabel,
  stepPreviousButtonClass,
  stepSaveButtonClass,
  type StepFormBaseProps,
} from "./step-form-props";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface PricingFormProps extends StepFormBaseProps {
  onNext: (data: PricingData) => void;
  onPrevious: () => void;
  initialData?: PricingData | null;
}

const HOTEL_CATEGORIES: { key: HotelCategoryKey; label: string }[] = [
  { key: "3star", label: "3 Star" },
  { key: "4star", label: "4 Star" },
  { key: "5star", label: "5 Star" },
];

const DEPARTURE_STATUSES: { value: DepartureStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "guaranteed", label: "Guaranteed Departure" },
  { value: "limited", label: "Limited Availability" },
  { value: "sold_out", label: "Sold Out" },
  { value: "cancelled", label: "Cancelled" },
];

const CHILD_TYPES: ChildPriceType[] = [
  "child_with_bed",
  "child_without_bed",
  "infant",
];

const CHILD_TYPE_LABELS: Record<ChildPriceType, string> = {
  child_with_bed: "Child With Bed",
  child_without_bed: "Child No Bed",
  infant: "Infant",
};

const addButtonClass =
  "mt-3 w-fit h-10 px-5 text-sm font-medium rounded-[10px] transition-colors flex items-center gap-2";
const addButtonDarkClass = `${addButtonClass} text-white bg-[#1F2A44] hover:bg-[#1F2A44]/90`;
const addButtonGoldClass = `${addButtonClass} text-white bg-[#B48A2C] hover:bg-[#B48A2C]/90`;
const addButtonOutlineClass = `${addButtonClass} text-[#1F2A44] bg-white border border-[#E5E7EB] hover:bg-gray-50`;
const iconBtnClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#E5E7EB] bg-white text-gray-500 hover:text-[#1F2A44] hover:border-gray-300 transition-colors";
const tableInputClass =
  "w-full h-[40px] px-3 text-sm border border-[#E5E7EB] rounded-[8px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors";
const inputClass =
  "w-full h-[48px] px-4 text-sm border border-[#E5E7EB] rounded-[12px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors";
const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";
const sectionCardClass =
  "bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm p-6";
const nestedCardClass =
  "bg-[#F8F9FB] rounded-[12px] border border-[#E5E7EB] p-4";
const dateInputClass = `${tableInputClass} pr-9 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer`;

function uid(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type DatePickerHandle = { open: () => void };

function openDatePicker(picker: DatePickerHandle | null | undefined) {
  picker?.open();
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function yearChoices(selected?: number) {
  const current = new Date().getFullYear();
  const start = Math.min(current - 5, selected ?? current);
  const end = Math.max(current + 6, selected ?? current);
  const years: number[] = [];
  for (let year = start; year <= end; year += 1) years.push(year);
  return years;
}

function DateInput({
  value,
  onChange,
  onFocus,
  disabled,
  inputRef,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  disabled?: boolean;
  inputRef?: (el: DatePickerHandle | null) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const parsed = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const selectedYear = parsed ? Number(parsed[1]) : undefined;
  const selectedMonth = parsed ? Number(parsed[2]) : undefined;
  const today = new Date();
  const [viewYear, setViewYear] = useState(selectedYear ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedMonth ?? today.getMonth() + 1);

  useEffect(() => {
    inputRef?.({ open: () => setOpen(true) });
    return () => inputRef?.(null);
    // The parent ref callback only stores this handle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cells = monthCalendarCells(viewYear, viewMonth);
  const viewMonthValue = String(viewMonth).padStart(2, "0");

  return (
    <Popover
      open={open && !disabled}
      onOpenChange={(next) => {
        if (disabled) return;
        if (next) {
          const current = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
          const now = new Date();
          setViewYear(current ? Number(current[1]) : now.getFullYear());
          setViewMonth(current ? Number(current[2]) : now.getMonth() + 1);
        }
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          onFocus={onFocus}
          className={`${className ?? dateInputClass} relative text-left disabled:cursor-not-allowed disabled:opacity-60`}
        >
          <span className={value ? "text-gray-900" : "text-gray-400"}>
            {value ? formatIsoDateLabel(value) : "dd-mm-yyyy"}
          </span>
          <Icon
            name="Calendar"
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[300px] p-3">
        <div className="grid grid-cols-2 gap-2">
          <NativeSelect
            className={tableInputClass}
            value={viewMonthValue}
            onChange={(event) => setViewMonth(Number(event.target.value))}
          >
            {MONTH_NAMES.map((name, index) => (
              <option key={name} value={String(index + 1).padStart(2, "0")}>
                {name}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            className={tableInputClass}
            value={String(viewYear)}
            onChange={(event) => setViewYear(Number(event.target.value))}
          >
            {yearChoices(viewYear).map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-gray-400">
          {WEEKDAY_LABELS.map((label) => (
            <span key={label} className="h-7 leading-7">
              {label}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, index) =>
            cell ? (
              <button
                key={cell}
                type="button"
                onClick={() => {
                  onChange(cell);
                  setOpen(false);
                }}
                className={`h-8 rounded-full text-sm transition-colors ${
                  value === cell
                    ? "bg-[#B48A2C] text-white"
                    : "text-[#1F2A44] hover:bg-[#FFF9EB]"
                }`}
              >
                {Number(cell.slice(-2))}
              </button>
            ) : (
              <span key={`blank-${index}`} className="h-8" />
            ),
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function MonthYearInput({
  value,
  onChange,
  onFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
}) {
  const parsed = monthDateBounds(value);
  const [month, setMonth] = useState(
    parsed ? String(parsed.month).padStart(2, "0") : "",
  );
  const [year, setYear] = useState(parsed ? String(parsed.year) : "");

  useEffect(() => {
    const next = monthDateBounds(value);
    if (!next) return;
    setMonth(String(next.month).padStart(2, "0"));
    setYear(String(next.year));
  }, [value]);

  const commit = (nextMonth: string, nextYear: string) => {
    setMonth(nextMonth);
    setYear(nextYear);
    onChange(nextMonth && nextYear ? `${nextYear}-${nextMonth}` : "");
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <NativeSelect
        className={inputClass}
        value={month}
        onFocus={onFocus}
        onChange={(event) => commit(event.target.value, year)}
      >
        <option value="">Month</option>
        {MONTH_NAMES.map((name, index) => (
          <option key={name} value={String(index + 1).padStart(2, "0")}>
            {name}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect
        className={inputClass}
        value={year}
        onFocus={onFocus}
        onChange={(event) => commit(month, event.target.value)}
      >
        <option value="">Year</option>
        {yearChoices(parsed?.year).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}

function createAdultTiers(): PricingAdultTier[] {
  return [1, 2, 3, 4].map((n) => ({
    id: uid(`pax-${n}`),
    pax: `${n} Pax`,
    netPrice: "",
    margin: "",
    retailPrice: "",
  }));
}

function createChildRows(): PricingChildRow[] {
  return CHILD_TYPES.map((type) => ({
    id: uid("child"),
    type,
    netPrice: "",
    margin: "",
    retailPrice: "",
  }));
}

function ensureChildRows(rows: PricingChildRow[] | undefined): PricingChildRow[] {
  const existing = rows ?? [];
  return CHILD_TYPES.map((type) => {
    const found = existing.find((row) => row.type === type);
    return (
      found ?? {
        id: uid("child"),
        type,
        netPrice: "",
        margin: "",
        retailPrice: "",
      }
    );
  });
}

function ensurePromotion(row: PricingPromotion): PricingPromotion {
  return {
    ...row,
    bookingFrom: row.bookingFrom || row.validFrom || "",
    bookingTo: row.bookingTo || row.validTo || "",
    travelFrom: row.travelFrom || "",
    travelTo: row.travelTo || "",
  };
}

function ensurePricing(pricing: PricingDetailsBlock | undefined): PricingDetailsBlock {
  return {
    adultTiers: pricing?.adultTiers?.length ? pricing.adultTiers : createAdultTiers(),
    childRows: ensureChildRows(pricing?.childRows),
    promotions: (pricing?.promotions ?? []).map(ensurePromotion),
  };
}

function createPricingDetails(): PricingDetailsBlock {
  return {
    adultTiers: createAdultTiers(),
    childRows: createChildRows(),
    promotions: [],
  };
}

function createBookingRange(name = ""): BookingRange {
  return {
    id: uid("range"),
    name,
    fromDate: "",
    toDate: "",
    blackouts: [],
    pricing: createPricingDetails(),
  };
}

function createDepartureDate(): DepartureDateEntry {
  return {
    id: uid("dep"),
    date: "",
    status: "active",
    pricing: createPricingDetails(),
  };
}

function createDepartureMonth(month = ""): DepartureMonth {
  return {
    id: uid("month"),
    month,
    dates: [createDepartureDate()],
  };
}

function createHotelCategory(category: HotelCategoryKey): HotelCategoryPricing {
  return {
    category,
    bookingRanges: [
      createBookingRange("Low Season"),
      createBookingRange("High Season"),
      createBookingRange("Peak Season"),
    ],
    departureMonths: [createDepartureMonth()],
  };
}

function createDefaultHotelCategories(): HotelCategoryPricing[] {
  return HOTEL_CATEGORIES.map(({ key }) => createHotelCategory(key));
}

function clonePricing(pricing: PricingDetailsBlock): PricingDetailsBlock {
  return {
    adultTiers: pricing.adultTiers.map((row) => ({ ...row, id: uid("pax") })),
    childRows: pricing.childRows.map((row) => ({ ...row, id: uid("child") })),
    promotions: pricing.promotions.map((row) => ({ ...row, id: uid("promo") })),
  };
}

function formatMonthLabel(value: string) {
  if (!value) return "Untitled month";
  const [year, month] = value.split("-");
  if (!year || !month) return value;
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function formatDisplayDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function monthDateBounds(monthValue: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(monthValue);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || month < 1 || month > 12) return null;
  const dayCount = new Date(year, month, 0).getDate();
  const min = `${match[1]}-${match[2]}-01`;
  const max = `${match[1]}-${match[2]}-${String(dayCount).padStart(2, "0")}`;
  return { year, month, dayCount, min, max };
}

function dateInMonth(date: string, monthValue: string) {
  const bounds = monthDateBounds(monthValue);
  if (!bounds || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  return date >= bounds.min && date <= bounds.max;
}

function monthCalendarCells(year: number, month: number) {
  const dayCount = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const leadingBlanks = (firstWeekday + 6) % 7;
  const cells: Array<string | null> = Array.from(
    { length: leadingBlanks },
    () => null,
  );
  for (let day = 1; day <= dayCount; day += 1) {
    cells.push(
      `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    );
  }
  return cells;
}

function formatIsoDateLabel(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function scheduledDays(monthValue: string) {
  const bounds = monthDateBounds(monthValue);
  if (!bounds) return [];
  return monthCalendarCells(bounds.year, bounds.month).filter(
    (cell): cell is string => Boolean(cell),
  );
}

function DepartureDateSelect({
  value,
  month,
  onChange,
  onFocus,
  inputRef,
}: {
  value: string;
  month: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  inputRef?: (el: HTMLSelectElement | null) => void;
}) {
  const bounds = monthDateBounds(month);
  const days = scheduledDays(month);
  const label = bounds ? formatMonthLabel(month) : "";

  return (
    <NativeSelect
      ref={inputRef}
      className={tableInputClass}
      disabled={!bounds}
      value={days.includes(value) ? value : ""}
      onFocus={onFocus}
      onChange={(event) => {
        const next = event.target.value;
        if (next && !dateInMonth(next, month)) return;
        onChange(next);
      }}
      title={
        bounds
          ? `Scheduled departure dates in ${label}`
          : "Select a departure month first"
      }
    >
      <option value="">
        {bounds ? `Select a day in ${label}` : "Select month first"}
      </option>
      {days.map((iso) => (
        <option key={iso} value={iso}>
          {formatIsoDateLabel(iso)}
        </option>
      ))}
    </NativeSelect>
  );
}

function hydrateCategories(initial?: PricingData | null): HotelCategoryPricing[] {
  if (initial?.hotelCategories?.length) {
    const byKey = new Map(
      initial.hotelCategories.map((item) => [item.category, item]),
    );
    return HOTEL_CATEGORIES.map(({ key }) => {
      const existing = byKey.get(key);
      if (!existing) return createHotelCategory(key);
      return {
        category: key,
        bookingRanges: existing.bookingRanges?.length
          ? existing.bookingRanges.map((range) => ({
              ...range,
              pricing: ensurePricing(range.pricing),
            }))
          : createHotelCategory(key).bookingRanges,
        departureMonths: existing.departureMonths?.length
          ? existing.departureMonths
          : createHotelCategory(key).departureMonths,
      };
    });
  }
  return createDefaultHotelCategories();
}

/* -------------------------------------------------------------------------- */
/*  Shared pricing tables                                                     */
/* -------------------------------------------------------------------------- */

function AdultPricingTable({
  rows,
  onChange,
}: {
  rows: PricingAdultTier[];
  onChange: (rows: PricingAdultTier[]) => void;
}) {
  const update = (id: string, field: keyof PricingAdultTier, value: string) => {
    onChange(rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const remove = (id: string) => {
    onChange(rows.filter((row) => row.id !== id));
  };

  const add = () => {
    onChange([
      ...rows,
      {
        id: uid("pax"),
        pax: `${rows.length + 1} Pax`,
        netPrice: "",
        margin: "",
        retailPrice: "",
      },
    ]);
  };

  return (
    <div>
      <div className="overflow-x-auto -mx-2 sm:mx-0">
        <div className="min-w-[720px] px-2 sm:px-0">
          <div className="grid grid-cols-[1.1fr_1fr_1fr_1fr_88px] gap-3 text-xs font-semibold text-[#1F2A44] uppercase tracking-wide pb-3 border-b border-gray-100">
            <span>Pax</span>
            <span>Net Price</span>
            <span>Margin</span>
            <span>Retail Price</span>
            <span>Actions</span>
          </div>
          <div className="divide-y divide-gray-50">
            {rows.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-[1.1fr_1fr_1fr_1fr_88px] gap-3 py-2.5 items-center"
              >
                <Input
                  type="text"
                  className={tableInputClass}
                  value={row.pax}
                  onChange={(e) => update(row.id, "pax", e.target.value)}
                  placeholder="e.g. 2 Pax"
                />
                <Input
                  type="text"
                  className={tableInputClass}
                  value={row.netPrice}
                  onChange={(e) => update(row.id, "netPrice", e.target.value)}
                  placeholder="0.00"
                />
                <Input
                  type="text"
                  className={tableInputClass}
                  value={row.margin}
                  onChange={(e) => update(row.id, "margin", e.target.value)}
                  placeholder="0%"
                />
                <Input
                  type="text"
                  className={tableInputClass}
                  value={row.retailPrice}
                  onChange={(e) => update(row.id, "retailPrice", e.target.value)}
                  placeholder="0.00"
                />
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className={iconBtnClass}
                    title="Edit row"
                    onClick={() => undefined}
                  >
                    <Icon name="Pencil" size={14} />
                  </button>
                  <button
                    type="button"
                    className={iconBtnClass}
                    title="Delete row"
                    onClick={() => remove(row.id)}
                  >
                    <Icon name="Trash2" size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Button type="button" onClick={add} className={addButtonDarkClass}>
        <Icon name="Plus" size={14} />
        Add Pax Tier
      </Button>
    </div>
  );
}

function ChildPricingSection({
  rows,
  onChange,
}: {
  rows: PricingChildRow[];
  onChange: (rows: PricingChildRow[]) => void;
}) {
  const ordered = ensureChildRows(rows);

  const update = (type: ChildPriceType, field: keyof PricingChildRow, value: string) => {
    onChange(
      ordered.map((row) => (row.type === type ? { ...row, [field]: value } : row)),
    );
  };

  return (
    <div className="overflow-x-auto -mx-2 sm:mx-0">
      <div className="min-w-[640px] px-2 sm:px-0">
        <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr] gap-3 text-xs font-semibold text-[#1F2A44] uppercase tracking-wide pb-3 border-b border-gray-100">
          <span>Type</span>
          <span>Net Price</span>
          <span>Margin</span>
          <span>Retail Price</span>
        </div>
        <div className="divide-y divide-gray-50">
          {ordered.map((row) => (
            <div
              key={row.type}
              className="grid grid-cols-[1.3fr_1fr_1fr_1fr] gap-3 py-2.5 items-center"
            >
              <span className="text-sm font-medium text-[#1F2A44]">
                {CHILD_TYPE_LABELS[row.type]}
              </span>
              <Input
                type="text"
                className={tableInputClass}
                value={row.netPrice}
                onChange={(e) => update(row.type, "netPrice", e.target.value)}
                placeholder="0.00"
              />
              <Input
                type="text"
                className={tableInputClass}
                value={row.margin}
                onChange={(e) => update(row.type, "margin", e.target.value)}
                placeholder="0%"
              />
              <Input
                type="text"
                className={tableInputClass}
                value={row.retailPrice}
                onChange={(e) => update(row.type, "retailPrice", e.target.value)}
                placeholder="0.00"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PromotionsSection({
  rows,
  onChange,
}: {
  rows: PricingPromotion[];
  onChange: (rows: PricingPromotion[]) => void;
}) {
  const add = () => {
    onChange([
      ...rows,
      {
        id: uid("promo"),
        title: "",
        bookingFrom: "",
        bookingTo: "",
        travelFrom: "",
        travelTo: "",
        discountType: "percentage",
        value: "",
        active: true,
      },
    ]);
  };

  const update = <K extends keyof PricingPromotion>(
    id: string,
    field: K,
    value: PricingPromotion[K],
  ) => {
    onChange(rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const remove = (id: string) => {
    onChange(rows.filter((row) => row.id !== id));
  };

  return (
    <div>
      {rows.length === 0 && (
        <p className="text-sm text-gray-400 py-4">
          No promotions yet. Add a promotional price when needed.
        </p>
      )}
      <div className="space-y-4">
        {rows.map((row) => (
          <div
            key={row.id}
            className="rounded-[12px] border border-[#E5E7EB] bg-white p-4 space-y-4"
          >
            <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1.1fr_0.8fr_auto_auto] gap-3 items-end">
              <div>
                <Label className={labelClass}>Promotion title</Label>
                <Input
                  type="text"
                  className={tableInputClass}
                  value={row.title}
                  onChange={(e) => update(row.id, "title", e.target.value)}
                  placeholder="Promotion title"
                />
              </div>
              <div>
                <Label className={labelClass}>Discount type</Label>
                <NativeSelect
                  className={tableInputClass}
                  value={row.discountType}
                  onChange={(e) =>
                    update(row.id, "discountType", e.target.value as DiscountType)
                  }
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </NativeSelect>
              </div>
              <div>
                <Label className={labelClass}>Value</Label>
                <Input
                  type="text"
                  className={tableInputClass}
                  value={row.value}
                  onChange={(e) => update(row.id, "value", e.target.value)}
                  placeholder={row.discountType === "percentage" ? "10%" : "100"}
                />
              </div>
              <span
                className={`inline-flex h-10 items-center justify-center px-2 py-1 text-xs font-semibold rounded-full ${
                  row.active
                    ? "bg-green-100 text-green-700 border border-green-200"
                    : "bg-gray-100 text-gray-500 border border-gray-200"
                }`}
              >
                {row.active ? "Active" : "Inactive"}
              </span>
              <div className="flex items-center gap-1.5 pb-1">
                <button
                  type="button"
                  className={iconBtnClass}
                  title={row.active ? "Deactivate" : "Activate"}
                  onClick={() => update(row.id, "active", !row.active)}
                >
                  <Icon name="Power" size={14} />
                </button>
                <button
                  type="button"
                  className={iconBtnClass}
                  title="Delete"
                  onClick={() => remove(row.id)}
                >
                  <Icon name="Trash2" size={14} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-[10px] border border-[#E5E7EB] bg-[#F8F9FB] p-3">
                <p className="text-sm font-semibold text-[#1F2A44]">Booking window</p>
                <p className="text-xs text-gray-400 mt-0.5 mb-3">
                  Dates the customer must book for this offer to apply.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className={labelClass}>Valid From</Label>
                    <DateInput
                      className={inputClass}
                      value={row.bookingFrom}
                      onChange={(value) => update(row.id, "bookingFrom", value)}
                    />
                  </div>
                  <div>
                    <Label className={labelClass}>Valid To</Label>
                    <DateInput
                      className={inputClass}
                      value={row.bookingTo}
                      onChange={(value) => update(row.id, "bookingTo", value)}
                    />
                  </div>
                </div>
              </div>
              <div className="rounded-[10px] border border-[#E5E7EB] bg-[#F8F9FB] p-3">
                <p className="text-sm font-semibold text-[#1F2A44]">Travel window</p>
                <p className="text-xs text-gray-400 mt-0.5 mb-3">
                  Travel dates this offer applies to.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className={labelClass}>From date</Label>
                    <DateInput
                      className={inputClass}
                      value={row.travelFrom}
                      onChange={(value) => update(row.id, "travelFrom", value)}
                    />
                  </div>
                  <div>
                    <Label className={labelClass}>To date</Label>
                    <DateInput
                      className={inputClass}
                      value={row.travelTo}
                      onChange={(value) => update(row.id, "travelTo", value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Button type="button" onClick={add} className={addButtonGoldClass}>
        <Icon name="Plus" size={14} />
        Add Promotion
      </Button>
    </div>
  );
}

function PricingDetailsEditor({
  pricing,
  onChange,
  afterPax,
}: {
  pricing: PricingDetailsBlock;
  onChange: (pricing: PricingDetailsBlock) => void;
  afterPax?: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-[#1F2A44] mb-3">Adult Pricing</h4>
        <div className="bg-white rounded-[12px] border border-[#E5E7EB] p-4">
          <AdultPricingTable
            rows={pricing.adultTiers}
            onChange={(adultTiers) => onChange({ ...pricing, adultTiers })}
          />
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-[#1F2A44] mb-3">Child Pricing</h4>
        <div className="bg-white rounded-[12px] border border-[#E5E7EB] p-4">
          <ChildPricingSection
            rows={pricing.childRows}
            onChange={(childRows) => onChange({ ...pricing, childRows })}
          />
        </div>
      </div>

      {afterPax}

      <div>
        <h4 className="text-sm font-semibold text-[#1F2A44] mb-3">Promotions</h4>
        <div className="bg-white rounded-[12px] border border-[#E5E7EB] p-4">
          <PromotionsSection
            rows={pricing.promotions}
            onChange={(promotions) => onChange({ ...pricing, promotions })}
          />
        </div>
      </div>
    </div>
  );
}

function BlackoutDatesSection({
  rows,
  onChange,
}: {
  rows: PricingBlackout[];
  onChange: (rows: PricingBlackout[]) => void;
}) {
  const add = (kind: "single" | "range") => {
    onChange([
      ...rows,
      {
        id: uid("blackout"),
        kind,
        fromDate: "",
        toDate: "",
        reason: "",
      },
    ]);
  };

  const update = (id: string, field: keyof PricingBlackout, value: string) => {
    onChange(
      rows.map((row) => {
        if (row.id !== id) return row;
        if (field === "fromDate" && row.kind === "single") {
          return { ...row, fromDate: value, toDate: value };
        }
        return { ...row, [field]: value };
      }),
    );
  };

  const remove = (id: string) => {
    onChange(rows.filter((row) => row.id !== id));
  };

  return (
    <div>
      <div className="overflow-x-auto -mx-2 sm:mx-0">
        <div className="min-w-[760px] px-2 sm:px-0">
          <div className="grid grid-cols-[100px_1fr_1fr_1.4fr_88px] gap-3 text-xs font-semibold text-[#1F2A44] uppercase tracking-wide pb-3 border-b border-gray-100">
            <span>Type</span>
            <span>From Date</span>
            <span>To Date</span>
            <span>Reason</span>
            <span>Actions</span>
          </div>
          <div className="divide-y divide-gray-50">
            {rows.length === 0 && (
              <p className="text-sm text-gray-400 py-4">
                No blackout dates for this booking range.
              </p>
            )}
            {rows.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-[100px_1fr_1fr_1.4fr_88px] gap-3 py-2.5 items-center"
              >
                <span className="text-xs font-medium text-gray-600">
                  {row.kind === "single" ? "Single" : "Range"}
                </span>
                <DateInput
                  value={row.fromDate}
                  onChange={(value) => update(row.id, "fromDate", value)}
                />
                <DateInput
                  value={row.kind === "single" ? row.fromDate : row.toDate}
                  disabled={row.kind === "single"}
                  onChange={(value) => update(row.id, "toDate", value)}
                />
                <Input
                  type="text"
                  className={tableInputClass}
                  value={row.reason}
                  onChange={(e) => update(row.id, "reason", e.target.value)}
                  placeholder="e.g. Chinese New Year"
                />
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className={iconBtnClass}
                    title="Delete"
                    onClick={() => remove(row.id)}
                  >
                    <Icon name="Trash2" size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => add("single")} className={addButtonDarkClass}>
          <Icon name="Plus" size={14} />
          Add Single Date
        </Button>
        <Button type="button" onClick={() => add("range")} className={addButtonOutlineClass}>
          <Icon name="Plus" size={14} />
          Add Date Range
        </Button>
      </div>
    </div>
  );
}

function BookingRangesEditor({
  ranges,
  onChange,
}: {
  ranges: BookingRange[];
  onChange: (ranges: BookingRange[]) => void;
}) {
  const rangeFromDateRefs = useRef<Record<string, DatePickerHandle | null>>({});

  const updateRange = (id: string, patch: Partial<BookingRange>) => {
    onChange(ranges.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  return (
    <div className="space-y-6">
      {ranges.length === 0 && (
        <p className="text-sm text-gray-400">
          Add a season to set adult, child, and infant prices.
        </p>
      )}
      {ranges.map((range) => (
        <div
          key={range.id}
          className="rounded-[12px] border border-[#E5E7EB] bg-[#F8F9FB] p-4 space-y-6"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h4 className="text-sm font-semibold text-[#1F2A44]">
                {range.name || "Untitled season"}
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                {range.fromDate || range.toDate
                  ? `${formatDisplayDate(range.fromDate)} – ${formatDisplayDate(range.toDate)}`
                  : "Set the season dates, then enter prices for this season only."}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className={iconBtnClass}
                title="Duplicate season"
                onClick={() => {
                  const duplicate: BookingRange = {
                    ...range,
                    id: uid("range"),
                    name: `${range.name || "Season"} (copy)`,
                    blackouts: range.blackouts.map((row) => ({
                      ...row,
                      id: uid("blackout"),
                    })),
                    pricing: clonePricing(range.pricing),
                  };
                  onChange([...ranges, duplicate]);
                }}
              >
                <Icon name="Copy" size={14} />
              </button>
              <button
                type="button"
                className={iconBtnClass}
                title="Delete season"
                onClick={() => onChange(ranges.filter((item) => item.id !== range.id))}
              >
                <Icon name="Trash2" size={14} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr_auto] gap-3 items-end">
            <div>
              <Label className={labelClass}>Season name</Label>
              <Input
                type="text"
                className={inputClass}
                value={range.name}
                onChange={(e) => updateRange(range.id, { name: e.target.value })}
                placeholder="e.g. High Season"
              />
            </div>
            <div>
              <Label className={labelClass}>From date</Label>
              <DateInput
                value={range.fromDate}
                className={`${inputClass} pr-9 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer`}
                inputRef={(el) => {
                  rangeFromDateRefs.current[range.id] = el;
                }}
                onChange={(value) => updateRange(range.id, { fromDate: value })}
              />
            </div>
            <div>
              <Label className={labelClass}>To date</Label>
              <DateInput
                value={range.toDate}
                className={`${inputClass} pr-9 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer`}
                onChange={(value) => updateRange(range.id, { toDate: value })}
              />
            </div>
            <button
              type="button"
              className={`${iconBtnClass} mb-1.5`}
              title="Edit dates"
              onClick={() => openDatePicker(rangeFromDateRefs.current[range.id])}
            >
              <Icon name="Pencil" size={14} />
            </button>
          </div>

          <PricingDetailsEditor
            pricing={ensurePricing(range.pricing)}
            onChange={(pricing) => updateRange(range.id, { pricing })}
            afterPax={
              <div>
                <h4 className="text-sm font-semibold text-[#1F2A44] mb-3">
                  Blackout dates
                </h4>
                <div className="bg-white rounded-[12px] border border-[#E5E7EB] p-4">
                  <BlackoutDatesSection
                    rows={range.blackouts}
                    onChange={(blackouts) => updateRange(range.id, { blackouts })}
                  />
                </div>
              </div>
            }
          />
        </div>
      ))}

      <Button
        type="button"
        className={addButtonDarkClass}
        onClick={() =>
          onChange([
            ...ranges,
            createBookingRange(`Season ${ranges.length + 1}`),
          ])
        }
      >
        <Icon name="Plus" size={14} />
        Add Season
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main PricingForm                                                          */
/* -------------------------------------------------------------------------- */

export default function PricingForm({
  onNext,
  onPrevious,
  initialData,
  isSaving = false,
}: PricingFormProps) {
  const [pricingType, setPricingType] = useState<PackagePricingType>(
    initialData?.pricingType ?? "general",
  );
  const [hotelCategories, setHotelCategories] = useState<HotelCategoryPricing[]>(
    () => hydrateCategories(initialData),
  );
  const [activeCategory, setActiveCategory] = useState<HotelCategoryKey>("3star");
  const [activeMonthId, setActiveMonthId] = useState<string | null>(null);
  const [activeDepartureId, setActiveDepartureId] = useState<string | null>(null);
  const departureDateRefs = useRef<Record<string, HTMLSelectElement | null>>({});

  const category = hotelCategories.find((item) => item.category === activeCategory)!;

  const selectedMonth =
    category.departureMonths.find((month) => month.id === activeMonthId) ??
    category.departureMonths[0] ??
    null;

  const selectedDeparture =
    selectedMonth?.dates.find((date) => date.id === activeDepartureId) ??
    selectedMonth?.dates[0] ??
    null;

  const editDepartureDate = (departureId: string) => {
    if (!monthDateBounds(selectedMonth?.month ?? "")) return;
    setActiveDepartureId(departureId);
    const select = departureDateRefs.current[departureId];
    select?.focus();
    try {
      select?.showPicker?.();
    } catch {
      // Some browsers only open the list from a click on the select.
    }
  };

  const updateCategory = (
    categoryKey: HotelCategoryKey,
    updater: (current: HotelCategoryPricing) => HotelCategoryPricing,
  ) => {
    setHotelCategories((prev) =>
      prev.map((item) => (item.category === categoryKey ? updater(item) : item)),
    );
  };

  const handleSave = () => {
    onNext({
      pricingType,
      hotelCategories,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm px-6 pt-6 pb-5">
        <div className="flex items-center gap-2.5 mb-2">
          <h2 className="text-lg font-semibold text-[#1F2A44]">Pricing</h2>
          <Icon name="Info" size={16} className="text-gray-400" />
        </div>
        <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
          Each hotel category has its own seasons. Every season keeps a separate
          adult, child, and infant price. General Package and Fixed Departure both
          use these seasons. Fixed Departure also lists the dates customers can book.
        </p>
      </div>

      <div className={sectionCardClass}>
        <h3 className="text-base font-semibold text-[#1F2A44] mb-4">Pricing type</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(
            [
              {
                value: "general" as const,
                title: "General Package",
                description: "FIT / Solo / Group — customer picks travel date",
              },
              {
                value: "fixed_departure" as const,
                title: "Fixed Departure Package",
                description: "Customer picks from scheduled departure dates",
              },
            ] as const
          ).map((option) => {
            const selected = pricingType === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setPricingType(option.value)}
                className={`text-left rounded-[12px] border p-4 transition-colors ${
                  selected
                    ? "border-[#B48A2C] bg-[#FFF9EB]"
                    : "border-[#E5E7EB] bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="text-sm font-semibold text-[#1F2A44]">
                    {option.title}
                  </span>
                  <span
                    className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                      selected ? "border-[#B48A2C]" : "border-gray-300"
                    }`}
                  >
                    {selected && (
                      <span className="h-2 w-2 rounded-full bg-[#B48A2C]" />
                    )}
                  </span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {option.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className={sectionCardClass}>
        <h3 className="text-base font-semibold text-[#1F2A44] mb-4">
          Hotel category
        </h3>
        <div className="flex flex-wrap gap-2 mb-6">
          {HOTEL_CATEGORIES.map((tab) => {
            const active = activeCategory === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveCategory(tab.key);
                  setActiveMonthId(null);
                  setActiveDepartureId(null);
                }}
                className={`h-10 px-5 rounded-[10px] text-sm font-medium transition-colors ${
                  active
                    ? "bg-[#1F2A44] text-white"
                    : "bg-white text-[#1F2A44] border border-[#E5E7EB] hover:bg-gray-50"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Prices below belong to this hotel category only. Each season has its own adult, child, and infant prices.
        </p>

        <BookingRangesEditor
          ranges={category.bookingRanges}
          onChange={(bookingRanges) =>
            updateCategory(activeCategory, (current) => ({
              ...current,
              bookingRanges,
            }))
          }
        />

        {pricingType === "fixed_departure" ? (
          <div className="space-y-6 mt-6">
            <p className="text-sm text-gray-500">
              Add the scheduled departure dates for this package. The customer can only book one of these dates. Adult, child, and infant prices stay on the seasons above.
            </p>
            <div>
              <h4 className="text-sm font-semibold text-[#1F2A44] mb-3">
                Departure months
              </h4>
              <div className={nestedCardClass}>
                <div className="space-y-2 mb-3">
                  {category.departureMonths.map((month) => {
                    const selected = selectedMonth?.id === month.id;
                    return (
                      <div
                        key={month.id}
                        className={`flex flex-col sm:flex-row sm:items-center gap-3 rounded-[10px] border px-3 py-3 ${
                          selected
                            ? "border-[#B48A2C] bg-[#FFF9EB]"
                            : "border-[#E5E7EB] bg-white"
                        }`}
                      >
                        <div className="flex-1">
                          <Label className={labelClass}>Month</Label>
                          <MonthYearInput
                            value={month.month}
                            onFocus={() => {
                              setActiveMonthId(month.id);
                              setActiveDepartureId(null);
                            }}
                            onChange={(nextMonth) => {
                              setActiveMonthId(month.id);
                              updateCategory(activeCategory, (current) => ({
                                ...current,
                                departureMonths: current.departureMonths.map((item) =>
                                  item.id === month.id
                                    ? {
                                        ...item,
                                        month: nextMonth,
                                        dates: item.dates.map((date) =>
                                          date.date &&
                                          nextMonth &&
                                          !dateInMonth(date.date, nextMonth)
                                            ? { ...date, date: "" }
                                            : date,
                                        ),
                                      }
                                    : item,
                                ),
                              }));
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-2 sm:pt-6">
                          <span className="text-sm text-gray-500 min-w-[110px]">
                            {formatMonthLabel(month.month)}
                          </span>
                          <button
                            type="button"
                            className={iconBtnClass}
                            title="Edit dates"
                            onClick={() => {
                              setActiveMonthId(month.id);
                              setActiveDepartureId(null);
                            }}
                          >
                            <Icon name="Pencil" size={14} />
                          </button>
                          <button
                            type="button"
                            className={iconBtnClass}
                            title="Delete month"
                            onClick={() => {
                              updateCategory(activeCategory, (current) => ({
                                ...current,
                                departureMonths: current.departureMonths.filter(
                                  (item) => item.id !== month.id,
                                ),
                              }));
                              if (activeMonthId === month.id) {
                                setActiveMonthId(null);
                                setActiveDepartureId(null);
                              }
                            }}
                          >
                            <Icon name="Trash2" size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Button
                  type="button"
                  className={addButtonDarkClass}
                  onClick={() =>
                    updateCategory(activeCategory, (current) => {
                      const next = createDepartureMonth();
                      setActiveMonthId(next.id);
                      setActiveDepartureId(next.dates[0]?.id ?? null);
                      return {
                        ...current,
                        departureMonths: [...current.departureMonths, next],
                      };
                    })
                  }
                >
                  <Icon name="Plus" size={14} />
                  Add Month
                </Button>
              </div>
            </div>

            {selectedMonth ? (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-[#1F2A44] mb-1">
                    Departure dates · {formatMonthLabel(selectedMonth.month)}
                  </h4>
                  <p className="text-xs text-gray-400 mb-3">
                    {monthDateBounds(selectedMonth.month)
                      ? `Only days in ${formatMonthLabel(selectedMonth.month)} can be scheduled. The customer picks from this list.`
                      : "Choose the month and year above, then add the scheduled departure dates."}
                  </p>
                  <div className={nestedCardClass}>
                    <div className="overflow-x-auto -mx-2 sm:mx-0">
                      <div className="min-w-[640px] px-2 sm:px-0">
                        <div className="grid grid-cols-[1.2fr_1.4fr_120px] gap-3 text-xs font-semibold text-[#1F2A44] uppercase tracking-wide pb-3 border-b border-gray-100">
                          <span>Departure Date</span>
                          <span>Status</span>
                          <span>Actions</span>
                        </div>
                        <div className="divide-y divide-gray-50">
                          {selectedMonth.dates.map((dep) => {
                            const selected = selectedDeparture?.id === dep.id;
                            return (
                              <div
                                key={dep.id}
                                className={`grid grid-cols-[1.2fr_1.4fr_120px] gap-3 py-2.5 items-center ${
                                  selected ? "bg-[#FFF9EB]/80" : ""
                                }`}
                              >
                                <DepartureDateSelect
                                  value={dep.date}
                                  month={selectedMonth.month}
                                  inputRef={(el) => {
                                    departureDateRefs.current[dep.id] = el;
                                  }}
                                  onFocus={() => setActiveDepartureId(dep.id)}
                                  onChange={(value) => {
                                    if (!dateInMonth(value, selectedMonth.month)) return;
                                    updateCategory(activeCategory, (current) => ({
                                      ...current,
                                      departureMonths: current.departureMonths.map(
                                        (month) =>
                                          month.id === selectedMonth.id
                                            ? {
                                                ...month,
                                                dates: month.dates.map((item) =>
                                                  item.id === dep.id
                                                    ? {
                                                        ...item,
                                                        date: value,
                                                      }
                                                    : item,
                                                ),
                                              }
                                            : month,
                                      ),
                                    }));
                                  }}
                                />
                                <NativeSelect
                                  className={tableInputClass}
                                  value={dep.status}
                                  onFocus={() => setActiveDepartureId(dep.id)}
                                  onChange={(e) =>
                                    updateCategory(activeCategory, (current) => ({
                                      ...current,
                                      departureMonths: current.departureMonths.map(
                                        (month) =>
                                          month.id === selectedMonth.id
                                            ? {
                                                ...month,
                                                dates: month.dates.map((item) =>
                                                  item.id === dep.id
                                                    ? {
                                                        ...item,
                                                        status: e.target
                                                          .value as DepartureStatus,
                                                      }
                                                    : item,
                                                ),
                                              }
                                            : month,
                                      ),
                                    }))
                                  }
                                >
                                  {DEPARTURE_STATUSES.map((status) => (
                                    <option key={status.value} value={status.value}>
                                      {status.label}
                                    </option>
                                  ))}
                                </NativeSelect>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    className={iconBtnClass}
                                    title={
                                      monthDateBounds(selectedMonth.month)
                                        ? "Edit date"
                                        : "Select a departure month first"
                                    }
                                    disabled={!monthDateBounds(selectedMonth.month)}
                                    onClick={() => editDepartureDate(dep.id)}
                                  >
                                    <Icon name="Pencil" size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    className={iconBtnClass}
                                    title="Delete"
                                    onClick={() => {
                                      updateCategory(activeCategory, (current) => ({
                                        ...current,
                                        departureMonths: current.departureMonths.map(
                                          (month) =>
                                            month.id === selectedMonth.id
                                              ? {
                                                  ...month,
                                                  dates: month.dates.filter(
                                                    (item) => item.id !== dep.id,
                                                  ),
                                                }
                                              : month,
                                        ),
                                      }));
                                      if (activeDepartureId === dep.id) {
                                        setActiveDepartureId(null);
                                      }
                                    }}
                                  >
                                    <Icon name="Trash2" size={14} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        className={addButtonDarkClass}
                        onClick={() => {
                          const next = createDepartureDate();
                          updateCategory(activeCategory, (current) => ({
                            ...current,
                            departureMonths: current.departureMonths.map((month) =>
                              month.id === selectedMonth.id
                                ? { ...month, dates: [...month.dates, next] }
                                : month,
                            ),
                          }));
                          setActiveDepartureId(next.id);
                        }}
                      >
                        <Icon name="Plus" size={14} />
                        Add Departure Date
                      </Button>
                      <Button
                        type="button"
                        className={addButtonOutlineClass}
                        disabled={!selectedDeparture}
                        onClick={() => {
                          if (!selectedDeparture) return;
                          const duplicate: DepartureDateEntry = {
                            ...selectedDeparture,
                            id: uid("dep"),
                            pricing: clonePricing(selectedDeparture.pricing),
                          };
                          updateCategory(activeCategory, (current) => ({
                            ...current,
                            departureMonths: current.departureMonths.map((month) =>
                              month.id === selectedMonth.id
                                ? {
                                    ...month,
                                    dates: [...month.dates, duplicate],
                                  }
                                : month,
                            ),
                          }));
                          setActiveDepartureId(duplicate.id);
                        }}
                      >
                        <Icon name="Copy" size={14} />
                        Duplicate Departure Date
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                Add a departure month to manage dates.
              </p>
            )}
          </div>
        ) : null}
      </div>

      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <Button
          type="button"
          onClick={onPrevious}
          className={stepPreviousButtonClass}
        >
          <Icon name="ChevronLeft" size={14} />
          Previous
        </Button>

        <p className="text-xs text-gray-400 flex-1 text-center">
          Incomplete sections stay as draft.
        </p>

        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          data-package-step-save="" className={stepSaveButtonClass}
        >
          {saveButtonLabel(isSaving)}
          <Icon name="ChevronRight" size={14} />
        </Button>
      </div>
    </div>
  );
}
