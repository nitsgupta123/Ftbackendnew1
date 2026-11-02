export type PromotionDiscountType = "percentage" | "fixed_amount";
export type PromotionStatus = "active" | "inactive";

export interface PromotionRecord {
  id: number;
  title: string;
  /** Dates the customer must book for this offer to apply. */
  booking_from: string | null;
  booking_to: string | null;
  /** Travel dates this offer applies to. Same kind of range as a Pricing season. */
  travel_from: string | null;
  travel_to: string | null;
  discount_type: PromotionDiscountType;
  value: number;
  package_keys: string[];
  status: PromotionStatus;
  created_at: string;
  updated_at: string;
}

export interface PromotionPackageOption {
  key: string;
  label: string;
}

export function packageOptionKey(source: "wizard" | "legacy" | undefined, id: number): string {
  return `${source ?? "wizard"}:${id}`;
}

export const DISCOUNT_TYPE_OPTIONS: { value: PromotionDiscountType; label: string }[] = [
  { value: "percentage", label: "Percentage" },
  { value: "fixed_amount", label: "Fixed Amount" },
];

export const SAMPLE_PROMOTIONS: PromotionRecord[] = [
  {
    id: 1,
    title: "Global Price Offer",
    booking_from: null,
    booking_to: null,
    travel_from: null,
    travel_to: null,
    discount_type: "percentage",
    value: 15,
    package_keys: ["wizard:1"],
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];
