"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Icon } from "../ui/icons";
import { packageBasicsSchema, type PackageBasicsValues } from "@/lib/validation";
import { saveButtonLabel, stepPreviousButtonClass, stepSaveButtonClass, type StepFormBaseProps } from "./step-form-props";
import { listActiveCategories } from "@/lib/category-api";
import { listActivePackageCatalog } from "@/lib/package-catalog-api";
import { listWebsiteLandingPages } from "@/lib/page-api";
import { slugify } from "@/lib/slug";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import BlogRichTextEditor from "@/components/blogs/BlogRichTextEditor";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  PACKAGE_COUNTRIES,
  getCityOptionsForCountries,
  joinDestinationList,
  splitDestinationList,
} from "@/lib/package-destinations";

const SHORT_INTRO_HELP =
  "This appears on category pages, related package sections and package cards where clients only see a short description before clicking in.";

const PACKAGE_OVERVIEW_HELP =
  "The full package description shown on the package page. Use this for the main story, highlights and what travellers can expect.";

interface PackageBasicsFormProps extends StepFormBaseProps {
  onNext: (data: PackageBasicsValues) => void;
  onPrevious: () => void;
  initialData?: PackageBasicsValues;
}

function FieldHelp({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-[#DBEAFE] text-[#3B82F6] hover:bg-[#BFDBFE] transition-colors"
          aria-label="Field help"
        >
          <Icon name="Info" size={11} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[280px] text-left leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function SelectedTag({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#1F2A44] bg-[#1F2A44] px-2.5 py-1 text-xs font-medium text-white">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex items-center justify-center rounded-full p-0.5 hover:bg-white/20 transition-colors"
        aria-label={`Remove ${label}`}
      >
        <Icon name="X" size={12} />
      </button>
    </span>
  );
}

type SelectOption = { value: string; label: string; group?: string };

function groupSelectOptions(options: SelectOption[]) {
  const groups: { name: string; items: SelectOption[] }[] = [];
  for (const option of options) {
    const name = option.group ?? "";
    const last = groups[groups.length - 1];
    if (!last || last.name !== name) groups.push({ name, items: [option] });
    else last.items.push(option);
  }
  return groups;
}

function SearchableMultiSelect({
  label,
  options,
  selectedValues,
  onChange,
  helperText,
  loading,
  placeholder = "Search and select…",
  searchPlaceholder = "Search…",
  emptyMessage = "No options found.",
  required,
  disabled,
  allowCustom,
}: {
  label: string;
  options: SelectOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  helperText?: string;
  loading?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  required?: boolean;
  disabled?: boolean;
  allowCustom?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const grouped = useMemo(() => groupSelectOptions(filtered), [filtered]);
  const showGroupHeaders = grouped.filter((group) => group.name).length > 1;

  const customValue = search.trim();
  const canAddCustom =
    Boolean(allowCustom) &&
    customValue.length > 0 &&
    !options.some(
      (option) =>
        option.value.toLowerCase() === customValue.toLowerCase() ||
        option.label.toLowerCase() === customValue.toLowerCase()
    ) &&
    !selectedValues.some((value) => value.toLowerCase() === customValue.toLowerCase());

  const selectedLabels = useMemo(() => {
    const map = new Map(options.map((o) => [o.value, o.label]));
    return selectedValues.map((v) => ({
      value: v,
      label: map.get(v) ?? v,
    }));
  }, [options, selectedValues]);

  const toggle = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((item) => item !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const remove = (value: string) => {
    onChange(selectedValues.filter((item) => item !== value));
  };

  return (
    <div>
      <p className="text-sm font-semibold text-[#334155] mb-2.5">
        {label}
        {required ? <span className="text-red-400 ml-0.5">*</span> : null}
      </p>

      {selectedLabels.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2.5">
          {selectedLabels.map((item) => (
            <SelectedTag
              key={item.value}
              label={item.label}
              onRemove={() => remove(item.value)}
            />
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-xs text-gray-400">Loading…</p>
      ) : (
        <Popover
          open={open}
          onOpenChange={(next) => {
            if (disabled) return;
            setOpen(next);
            if (!next) setSearch("");
          }}
        >
          <PopoverTrigger asChild>
            <Button
              type="button"
              disabled={disabled}
              className="w-full h-[42px] px-4 text-sm border border-[#D1D5DB] rounded-[6px] bg-white text-left font-normal text-gray-500 hover:bg-[#F9FAFB] justify-between disabled:opacity-60"
            >
              <span className="truncate">
                {selectedValues.length > 0
                  ? `${selectedValues.length} selected`
                  : placeholder}
              </span>
              <Icon name="ChevronDown" size={16} className="text-gray-400 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="flex w-[var(--radix-popover-trigger-width)] flex-col overflow-hidden bg-white p-2"
            style={{
              maxHeight: "min(24rem, var(--radix-popover-content-available-height, 24rem))",
            }}
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              searchRef.current?.focus();
            }}
          >
            <div className="relative mb-2 shrink-0">
              <Icon
                name="Search"
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <Input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 pl-8 pr-3 text-sm border-[#D1D5DB] rounded-[6px]"
              />
            </div>
            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
              onWheel={(event) => event.stopPropagation()}
            >
              {filtered.length === 0 && !canAddCustom ? (
                <p className="px-2 py-3 text-xs text-gray-400">{emptyMessage}</p>
              ) : (
                grouped.map((group) => (
                  <div key={group.name || "options"}>
                    {showGroupHeaders && group.name ? (
                      <p className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                        {group.name}
                      </p>
                    ) : null}
                    {group.items.map((option) => {
                      const isSelected = selectedValues.includes(option.value);
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => toggle(option.value)}
                          className={`
                            w-full flex items-center gap-2 px-2.5 py-2 text-sm text-left rounded-[6px] transition-colors
                            ${isSelected ? "bg-[#F1F5F9] text-[#1F2A44] font-medium" : "text-[#334155] hover:bg-[#F8FAFC]"}
                          `}
                        >
                          <span
                            className={`
                              flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]
                              ${isSelected ? "border-[#1F2A44] bg-[#1F2A44] text-white" : "border-[#CBD5E1] bg-white"}
                            `}
                          >
                            {isSelected ? "✓" : null}
                          </span>
                          <span className="truncate">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
              {canAddCustom ? (
                <button
                  type="button"
                  onClick={() => {
                    onChange([...selectedValues, customValue]);
                    setSearch("");
                  }}
                  className="w-full px-2.5 py-2 text-left text-sm text-[#1F2A44] hover:bg-[#F8FAFC] rounded-[6px]"
                >
                  Add “{customValue}”
                </button>
              ) : null}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {helperText && <p className="text-xs text-gray-400 mt-2.5">{helperText}</p>}
    </div>
  );
}

export default function PackageBasicsForm({
  onNext,
  onPrevious,
  initialData,
  isSaving = false,
}: PackageBasicsFormProps) {
  const [categoryOptions, setCategoryOptions] = useState<
    { id: number; name: string }[]
  >([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [typeOptions, setTypeOptions] = useState<string[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [themeOptions, setThemeOptions] = useState<string[]>([]);
  const [themesLoading, setThemesLoading] = useState(true);
  const [landingOptions, setLandingOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [landingPagesLoading, setLandingPagesLoading] = useState(true);
  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PackageBasicsValues>({
    resolver: zodResolver(packageBasicsSchema),
    defaultValues: {
      packageTitle: "",
      slug: "",
      shortIntro: "",
      packageOverview: "",
      packageMode: "Enquiry first",
      tourType: "Leisure",
      runs: "Every day",
      runsCustom: "",
      countriesCovered: "",
      citiesOrRegions: "",
      startingPoint: "",
      endingPoint: "",
      days: "",
      nights: "",
      categories: [],
      categoryIds: [],
      packageThemes: [],
      landingPages: [],
      isSeasonalPackage: false,
      importantInfo: "",
      frontendNotes: "",
    },
  });

  const selectedCountry = (() => {
    const raw = watch("countriesCovered") ?? "";
    if (!raw.includes(",")) return raw;
    return splitDestinationList(raw)[0] ?? "";
  })();
  const selectedCities = splitDestinationList(watch("citiesOrRegions"));

  useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  useEffect(() => {
    let cancelled = false;
    async function loadCategories() {
      setCategoriesLoading(true);
      try {
        const result = await listActiveCategories();
        if (!cancelled) {
          setCategoryOptions(
            result.categories.map((c) => ({
              id: c.id,
              name: c.name,
            }))
          );
        }
      } catch {
        if (!cancelled) setCategoryOptions([]);
      } finally {
        if (!cancelled) setCategoriesLoading(false);
      }
    }
    loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadCatalogs() {
      setTypesLoading(true);
      setThemesLoading(true);
      try {
        const [types, themes] = await Promise.all([
          listActivePackageCatalog("type"),
          listActivePackageCatalog("theme"),
        ]);
        if (!cancelled) {
          setTypeOptions(types.items.map((item) => item.name));
          setThemeOptions(themes.items.map((item) => item.name));
        }
      } catch {
        if (!cancelled) {
          setTypeOptions([]);
          setThemeOptions([]);
        }
      } finally {
        if (!cancelled) {
          setTypesLoading(false);
          setThemesLoading(false);
        }
      }
    }
    loadCatalogs();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadLandingPages() {
      setLandingPagesLoading(true);
      try {
        const pages = await listWebsiteLandingPages();
        if (!cancelled) {
          setLandingOptions(
            pages.map((page) => ({
              value: page.slug,
              label: page.title,
            }))
          );
        }
      } catch {
        if (!cancelled) setLandingOptions([]);
      } finally {
        if (!cancelled) setLandingPagesLoading(false);
      }
    }
    loadLandingPages();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedTourType = watch("tourType");
  const selectedThemes = watch("packageThemes") ?? [];
  const packageTypeOptions = useMemo(() => {
    const names = [...typeOptions];
    if (selectedTourType && !names.includes(selectedTourType)) {
      names.unshift(selectedTourType);
    }
    return names;
  }, [typeOptions, selectedTourType]);
  const themeSelectOptions = useMemo(() => {
    const names = [...themeOptions];
    for (const theme of selectedThemes) {
      if (theme && !names.includes(theme)) names.push(theme);
    }
    return names.map((name) => ({ value: name, label: name }));
  }, [themeOptions, selectedThemes]);

  const categorySelectOptions = useMemo(
    () =>
      categoryOptions.map((c) => ({
        value: String(c.id),
        label: c.name,
      })),
    [categoryOptions]
  );

  const cityOptions = useMemo(
    () => getCityOptionsForCountries(selectedCountry ? [selectedCountry] : []),
    [selectedCountry]
  );

  const onCountryChange = (country: string) => {
    setValue("countriesCovered", country, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("citiesOrRegions", "", { shouldDirty: true });
  };

  const packageTitleRegister = register("packageTitle");
  const onSubmit = (data: PackageBasicsValues) => {
    onNext({
      ...data,
      importantInfo: initialData?.importantInfo ?? data.importantInfo ?? "",
      frontendNotes: initialData?.frontendNotes ?? data.frontendNotes ?? "",
    });
  };

  const inputClass =
    "w-full h-[42px] px-4 text-sm border border-[#D1D5DB] rounded-[6px] bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors";
  const selectClass = `${inputClass} appearance-none cursor-pointer`;
  const labelClass = "block text-sm font-semibold text-[#334155] mb-1.5";
  const requiredStar = <span className="text-red-400 ml-0.5">*</span>;
  const errorClass = "text-xs text-red-500 mt-1";

  return (
    <TooltipProvider delayDuration={200}>
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm animate-fade-in">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#1F2A44]">Package Basics</h2>
              <span
                className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-[#DBEAFE] text-[#3B82F6]"
                title="Package structure, category, route and season logic"
              >
                <Icon name="Info" size={11} />
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              Status now sits at the top beside Preview and Save Draft. This
              section is for package structure, category, route and season logic.
            </p>
          </div>

          {/* Fayyaz front-end package title */}
          <div className="mb-5">
            <Label htmlFor="packageTitle" className={labelClass}>
              Fayyaz front-end package title {requiredStar}
            </Label>
            <Input
              id="packageTitle"
              type="text"
              className={inputClass}
              {...packageTitleRegister}
              onChange={(e) => {
                packageTitleRegister.onChange(e);
                setValue("slug", slugify(e.target.value), {
                  shouldValidate: true,
                  shouldDirty: true,
                });
              }}
            />
            {errors.packageTitle && (
              <p className={errorClass}>{errors.packageTitle.message}</p>
            )}
          </div>

          {/* Slug */}
          <div className="mb-5">
            <Label htmlFor="slug" className={labelClass}>
              Slug {requiredStar}
            </Label>
            <Input
              id="slug"
              type="text"
              readOnly
              placeholder="south-africa-safari-cape-town-family-safari-t"
              className={`${inputClass} bg-[#F9FAFB] text-gray-500 cursor-not-allowed`}
              {...register("slug")}
            />
            {errors.slug && <p className={errorClass}>{errors.slug.message}</p>}
          </div>

          {/* Short intro — full width like slug */}
          <div className="mb-5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Label htmlFor="shortIntro" className="text-sm font-semibold text-[#334155]">
                Short intro line
              </Label>
              <FieldHelp text={SHORT_INTRO_HELP} />
            </div>
            <Input
              id="shortIntro"
              type="text"
              placeholder="A short package description for listing cards, category pages and related packages"
              className={inputClass}
              {...register("shortIntro")}
            />
          </div>

          {/* Package Overview */}
          <div className="mb-5">
            <div className="flex items-center gap-1.5 mb-2">
              <Label className="text-sm font-semibold text-[#334155]">
                Package Overview
              </Label>
              <FieldHelp text={PACKAGE_OVERVIEW_HELP} />
            </div>
            <Controller
              control={control}
              name="packageOverview"
              render={({ field }) => (
                <BlogRichTextEditor
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Write the full package overview — destinations, experiences, and what makes this trip special…"
                  defaultHeight={140}
                  minHeight={100}
                  maxHeight={800}
                />
              )}
            />
          </div>

          {/* Package mode + Runs (Package mode moved here from beside Short intro) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-5">
            <div>
              <Label htmlFor="packageMode" className={labelClass}>
                Package mode
              </Label>
              <div className="relative">
                <NativeSelect
                  id="packageMode"
                  className={selectClass}
                  {...register("packageMode")}
                >
                  <option value="Enquiry first">Enquiry first</option>
                  <option value="Book now">Book now</option>
                  <option value="Fixed departure">Fixed departure</option>
                  <option value="Customizable">Customizable</option>
                  <option value="Private">Private</option>
                </NativeSelect>
                <Icon
                  name="ChevronDown"
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
              </div>
              {errors.packageMode && (
                <p className={errorClass}>{errors.packageMode.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="runs" className={labelClass}>
                Runs
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <NativeSelect
                    id="runs"
                    className={selectClass}
                    {...register("runs")}
                  >
                    <option value="Every day">Every day</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Fixed dates">Fixed dates</option>
                    <option value="On request">On request</option>
                  </NativeSelect>
                  <Icon
                    name="ChevronDown"
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>
                <Input
                  id="runsCustom"
                  type="text"
                  placeholder="e.g. Every Monday, Twice Monthly"
                  className={inputClass}
                  {...register("runsCustom")}
                />
              </div>
              {errors.runs && <p className={errorClass}>{errors.runs.message}</p>}
            </div>
          </div>

          {/* Countries + cascading Cities/Regions */}
          <div className="mb-5 rounded-[8px] border border-[#E5E7EB] bg-[#FAFAFA] p-4 space-y-4">
            <div>
              <Label htmlFor="countriesCovered" className={labelClass}>
                Countries covered {requiredStar}
              </Label>
              <div className="relative">
                <NativeSelect
                  id="countriesCovered"
                  className={selectClass}
                  value={selectedCountry}
                  onChange={(e) => onCountryChange(e.target.value)}
                >
                  <option value="">Select country</option>
                  {PACKAGE_COUNTRIES.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </NativeSelect>
                <Icon
                  name="ChevronDown"
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
              </div>
            </div>

            <SearchableMultiSelect
              label="Cities or regions"
              options={cityOptions}
              selectedValues={selectedCities}
              disabled={!selectedCountry}
              allowCustom
              placeholder={
                selectedCountry ? "Select cities or regions" : "Select a country first"
              }
              searchPlaceholder="Search cities or regions…"
              emptyMessage="No matching city or region."
              helperText={
                selectedCountry
                  ? `${cityOptions.length} places for ${selectedCountry}. Regions are listed first, then cities. Select every place this package covers, or type a name to add it.`
                  : "Pick a country above — this list fills automatically."
              }
              onChange={(cities) =>
                setValue("citiesOrRegions", joinDestinationList(cities), {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            />
          </div>

          {/* Starting point, Ending point */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-5">
            <div>
              <Label htmlFor="startingPoint" className={labelClass}>
                Starting point
              </Label>
              <Input
                id="startingPoint"
                type="text"
                placeholder="Usually first city/country"
                className={inputClass}
                {...register("startingPoint")}
              />
            </div>

            <div>
              <Label htmlFor="endingPoint" className={labelClass}>
                Ending point
              </Label>
              <Input
                id="endingPoint"
                type="text"
                placeholder="Usually final city/country"
                className={inputClass}
                {...register("endingPoint")}
              />
            </div>
          </div>

          {/* Days & Nights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-6">
            <div>
              <Label htmlFor="days" className={labelClass}>
                Days
              </Label>
              <Input
                id="days"
                type="number"
                min="1"
                className={inputClass}
                {...register("days")}
              />
            </div>

            <div>
              <Label htmlFor="nights" className={labelClass}>
                Nights
              </Label>
              <Input
                id="nights"
                type="number"
                min="0"
                className={inputClass}
                {...register("nights")}
              />
            </div>
          </div>

          {/* Package categories */}
          <div className="mb-6">
            <Controller
              control={control}
              name="categoryIds"
              render={({ field }) => (
                <SearchableMultiSelect
                  label="Package categories"
                  options={categorySelectOptions}
                  selectedValues={(field.value || []).map(String)}
                  loading={categoriesLoading}
                  placeholder="Search categories…"
                  emptyMessage={
                    categoryOptions.length === 0
                      ? "No active categories. Add categories in Package Categories first."
                      : "No matching categories."
                  }
                  onChange={(values) => {
                    const ids = values
                      .map((v) => Number(v))
                      .filter((id) => Number.isInteger(id) && id > 0);
                    const names = categoryOptions
                      .filter((o) => ids.includes(o.id))
                      .map((o) => o.name);
                    field.onChange(ids);
                    setValue("categories", names);
                  }}
                  helperText="Select one or more categories. Inactive categories are not shown on the customer website."
                />
              )}
            />
          </div>

          <div className="mb-6">
            <Controller
              control={control}
              name="packageThemes"
              render={({ field }) => (
                <SearchableMultiSelect
                  label="Package themes"
                  options={themeSelectOptions}
                  selectedValues={field.value || []}
                  loading={themesLoading}
                  placeholder="Search themes…"
                  emptyMessage={
                    themeOptions.length === 0
                      ? "No active themes. Add themes in Package Themes first."
                      : "No matching themes."
                  }
                  onChange={field.onChange}
                  helperText="Audience and style tags. Manage the list under Packages → Settings → Package Themes. Separate from categories and landing pages."
                />
              )}
            />
          </div>

          {/* Package type — below themes */}
          <div className="mb-6 max-w-md">
            <Label htmlFor="tourType" className={labelClass}>
              Package type {requiredStar}
            </Label>
            <div className="relative">
              <NativeSelect
                id="tourType"
                className={selectClass}
                disabled={typesLoading}
                {...register("tourType")}
              >
                <option value="">
                  {typesLoading ? "Loading types…" : "Select type"}
                </option>
                {packageTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </NativeSelect>
              <Icon
                name="ChevronDown"
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
            {errors.tourType && (
              <p className={errorClass}>{errors.tourType.message}</p>
            )}
            <p className="text-xs text-gray-400 mt-2">
              Managed under Packages → Settings → Package Type.
            </p>
          </div>

          {/* Website landing pages from tbl_post (Deals, sales, luxury) */}
          <div className="mb-6">
            <Controller
              control={control}
              name="landingPages"
              render={({ field }) => (
                <SearchableMultiSelect
                  label="Landing pages"
                  options={landingOptions}
                  selectedValues={field.value || []}
                  onChange={field.onChange}
                  loading={landingPagesLoading}
                  placeholder="Search landing pages…"
                  emptyMessage="No live landing pages found."
                  helperText="Live pages from the website, such as Hot Deals, Short Breaks, and Luxury Holiday. Separate from Package Categories."
                />
              )}
            />
          </div>

          {/* Seasonal package — highlighted box */}
          <div className="mb-6 rounded-[10px] border border-[#FEF3C7] bg-[#FFFBEB] p-3">
            <Controller
              control={control}
              name="isSeasonalPackage"
              render={({ field }) => (
                <div className="flex items-center justify-between gap-4 rounded-[8px] border border-[#E5E7EB] bg-white px-4 py-3.5">
                  <div>
                    <p className="text-sm font-semibold text-[#1F2A44]">
                      This is a seasonal package
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Controls visibility and enquiry behaviour outside the travel
                      season.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`text-sm font-medium ${field.value ? "text-[#27AE60]" : "text-[#64748B]"}`}
                    >
                      {field.value ? "Yes" : "No"}
                    </span>
                    <ToggleSwitch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </div>
                </div>
              )}
            />
          </div>

          {/* Bottom action bar */}
          <div className="mt-8 pt-5 border-t border-[#E5E7EB] flex items-center justify-between flex-wrap gap-3">
            <Button
              type="button"
              onClick={onPrevious}
              className={stepPreviousButtonClass}
            >
              <Icon name="ChevronLeft" size={16} />
              Previous
            </Button>

            <p className="text-xs text-gray-400 text-center flex-1">
              Save as you go. Incomplete sections stay as draft.
            </p>

            <Button
              type="submit"
              disabled={isSaving}
              data-package-step-save="" className={stepSaveButtonClass}
            >
              {saveButtonLabel(isSaving)}
              <Icon name="ChevronRight" size={16} />
            </Button>
          </div>
        </form>
      </div>
    </TooltipProvider>
  );
}
