"use client";

import { useEffect } from "react";
import { useForm, Controller, type Control, type FieldErrors } from "react-hook-form";
import { Icon } from "@/components/ui/icons";
import IsoDateField from "@/components/ui/iso-date-field";
import PackageMultiSelect from "@/components/promotions/PackageMultiSelect";
import {
  DISCOUNT_TYPE_OPTIONS,
  type PromotionPackageOption,
  type PromotionRecord,
} from "@/lib/promotion-types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Checkbox } from "@/components/ui/checkbox";

const inputClass =
  "w-full h-11 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/30 focus:border-[#B48A2C]";

export interface PromotionFormValues {
  title: string;
  booking_from: string;
  booking_to: string;
  travel_from: string;
  travel_to: string;
  discount_type: "percentage" | "fixed_amount";
  value: number;
  package_keys: string[];
  is_active: boolean;
}

interface PromotionFormProps {
  initialData?: PromotionRecord | null;
  packageOptions: PromotionPackageOption[];
  packagesLoading?: boolean;
  isSaving?: boolean;
  onSubmit: (data: PromotionFormValues) => void;
  onCancel: () => void;
}

function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function endOnOrAfterStart(start: string, end: string) {
  if (!start || !end || end >= start) return true;
  return "End date must be on or after the start date";
}

function DateWindow({
  title,
  hint,
  fromId,
  toId,
  fromLabel,
  toLabel,
  control,
  errors,
}: {
  title: string;
  hint: string;
  fromId: "booking_from" | "travel_from";
  toId: "booking_to" | "travel_to";
  fromLabel: string;
  toLabel: string;
  control: Control<PromotionFormValues>;
  errors: FieldErrors<PromotionFormValues>;
}) {
  const toError = errors[toId]?.message;

  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-[#F8F9FB] p-4">
      <p className="text-sm font-semibold text-[#1F2A44]">{title}</p>
      <p className="text-xs text-gray-400 mt-0.5 mb-3">{hint}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor={fromId} className="block text-sm font-semibold text-[#334155] mb-1.5">
            {fromLabel}
          </Label>
          <Controller
            control={control}
            name={fromId}
            render={({ field }) => (
              <IsoDateField
                id={fromId}
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
        </div>
        <div>
          <Label htmlFor={toId} className="block text-sm font-semibold text-[#334155] mb-1.5">
            {toLabel}
          </Label>
          <Controller
            control={control}
            name={toId}
            rules={{
              validate: (value, formValues) => endOnOrAfterStart(formValues[fromId], value),
            }}
            render={({ field }) => (
              <IsoDateField
                id={toId}
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
          {toError && <p className="mt-1 text-xs text-red-600">{toError}</p>}
        </div>
      </div>
    </div>
  );
}

export default function PromotionForm({
  initialData,
  packageOptions,
  packagesLoading = false,
  isSaving = false,
  onSubmit,
  onCancel,
}: PromotionFormProps) {
  const isEdit = Boolean(initialData);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<PromotionFormValues>({
    defaultValues: {
      title: initialData?.title ?? "",
      booking_from: toDateInput(initialData?.booking_from),
      booking_to: toDateInput(initialData?.booking_to),
      travel_from: toDateInput(initialData?.travel_from),
      travel_to: toDateInput(initialData?.travel_to),
      discount_type: initialData?.discount_type ?? "percentage",
      value: initialData?.value ?? 15,
      package_keys: initialData?.package_keys ?? [],
      is_active: initialData ? initialData.status === "active" : true,
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title,
        booking_from: toDateInput(initialData.booking_from),
        booking_to: toDateInput(initialData.booking_to),
        travel_from: toDateInput(initialData.travel_from),
        travel_to: toDateInput(initialData.travel_to),
        discount_type: initialData.discount_type,
        value: initialData.value,
        package_keys: initialData.package_keys,
        is_active: initialData.status === "active",
      });
    }
  }, [initialData, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-6">
          <Label htmlFor="title" className="block text-sm font-semibold text-[#334155] mb-1.5">
            Promotion Title
          </Label>
          <Input
            id="title"
            className={inputClass}
            placeholder="Summer Sale"
            {...register("title", { required: "Promotion title is required" })}
          />
          {errors.title && (
            <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>
          )}
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DateWindow
          title="Booking window"
          hint="Dates the customer must book for this offer to apply."
          fromId="booking_from"
          toId="booking_to"
          fromLabel="Valid From"
          toLabel="Valid To"
          control={control}
          errors={errors}
        />
        <DateWindow
          title="Travel window"
          hint="Travel dates this offer applies to."
          fromId="travel_from"
          toId="travel_to"
          fromLabel="From date"
          toLabel="To date"
          control={control}
          errors={errors}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-3">
          <Label htmlFor="discount_type" className="block text-sm font-semibold text-[#334155] mb-1.5">
            Discount Type
          </Label>
          <NativeSelect id="discount_type" className={inputClass} {...register("discount_type")}>
            {DISCOUNT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="md:col-span-3">
          <Label htmlFor="value" className="block text-sm font-semibold text-[#334155] mb-1.5">
            Value
          </Label>
          <Input
            id="value"
            type="number"
            min="0"
            step="0.01"
            className={inputClass}
            placeholder="15"
            {...register("value", {
              valueAsNumber: true,
              required: "Value is required",
              min: { value: 0.01, message: "Value must be greater than 0" },
            })}
          />
          {errors.value && (
            <p className="mt-1 text-xs text-red-600">{errors.value.message}</p>
          )}
        </div>

        <div className="md:col-span-6">
          <Label className="block text-sm font-semibold text-[#334155] mb-1.5">
            Apply to Packages
          </Label>
          <Controller
            control={control}
            name="package_keys"
            render={({ field }) => (
              <PackageMultiSelect
                options={packageOptions}
                selectedKeys={field.value}
                onChange={field.onChange}
                loading={packagesLoading}
              />
            )}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
        <Controller
          control={control}
          name="is_active"
          render={({ field }) => (
            <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
              <Checkbox
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                className="size-[18px] rounded border-[#D1D5DB] data-[state=checked]:bg-[#A68231] data-[state=checked]:border-[#A68231]"
              />
              <span className="text-sm font-medium text-[#334155]">Active</span>
            </label>
          )}
        />

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="h-11 px-5 rounded-lg border border-[#E5E7EB] bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
            className="inline-flex h-11 px-5 items-center gap-2 text-sm font-semibold text-white bg-[#A68231] rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {isSaving ? (
              <Icon name="Loader2" size={16} className="animate-spin" />
            ) : (
              <Icon name="Check" size={16} />
            )}
            {isSaving ? "Saving…" : isEdit ? "Save Promotion" : "Save Promotion"}
          </Button>
        </div>
      </div>
    </form>
  );
}
