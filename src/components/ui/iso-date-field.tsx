"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icons";
import { NativeSelect } from "@/components/ui/native-select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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

const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function yearChoices(selected?: number) {
  const current = new Date().getFullYear();
  const start = Math.min(current - 5, selected ?? current);
  const end = Math.max(current + 6, selected ?? current);
  const years: number[] = [];
  for (let year = start; year <= end; year += 1) years.push(year);
  return years;
}

function monthCalendarCells(year: number, month: number) {
  const dayCount = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const leadingBlanks = (firstWeekday + 6) % 7;
  const cells: Array<string | null> = Array.from({ length: leadingBlanks }, () => null);
  for (let day = 1; day <= dayCount; day += 1) {
    cells.push(
      `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
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

interface IsoDateFieldProps {
  id: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  className?: string;
}

export default function IsoDateField({
  id,
  name,
  value,
  onChange,
  onBlur,
  className,
}: IsoDateFieldProps) {
  const [open, setOpen] = useState(false);
  const parsed = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const today = new Date();
  const [viewYear, setViewYear] = useState(parsed ? Number(parsed[1]) : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed ? Number(parsed[2]) : today.getMonth() + 1);

  const cells = monthCalendarCells(viewYear, viewMonth);
  const viewMonthValue = String(viewMonth).padStart(2, "0");

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) {
          const current = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
          const now = new Date();
          setViewYear(current ? Number(current[1]) : now.getFullYear());
          setViewMonth(current ? Number(current[2]) : now.getMonth() + 1);
        }
        setOpen(next);
        if (!next) onBlur?.();
      }}
    >
      <PopoverTrigger asChild>
        <button
          id={id}
          name={name}
          type="button"
          className={cn(
            "relative w-full h-11 px-3 pr-10 text-left rounded-lg border border-[#E5E7EB] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/30 focus:border-[#B48A2C]",
            className
          )}
        >
          <span className={value ? "text-gray-900" : "text-gray-400"}>
            {value ? formatIsoDateLabel(value) : "dd-mm-yyyy"}
          </span>
          <Icon
            name="Calendar"
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[300px] p-3">
        <div className="grid grid-cols-2 gap-2">
          <NativeSelect
            className="h-10 px-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
            value={viewMonthValue}
            onChange={(event) => setViewMonth(Number(event.target.value))}
          >
            {MONTH_NAMES.map((monthName, index) => (
              <option key={monthName} value={String(index + 1).padStart(2, "0")}>
                {monthName}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            className="h-10 px-2 text-sm border border-[#E5E7EB] rounded-lg bg-white"
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
            )
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
