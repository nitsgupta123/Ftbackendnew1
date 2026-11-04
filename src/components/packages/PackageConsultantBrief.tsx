"use client";

import type { ReactNode } from "react";
import type {
  BookingPolicyData,
  ConsultantViewData,
  DepartureStatus,
  HotelEntry,
  InclusionsData,
  ItineraryDay,
  PricingData,
  PricingDetailsBlock,
  PackageRecord,
} from "@/lib/package-types";
import type { PackageBasicsValues } from "@/lib/validation";

const HOTEL_CATEGORY_LABELS: Record<string, string> = {
  "3star": "3 Star",
  "4star": "4 Star",
  "5star": "5 Star",
};

const CHILD_TYPE_LABELS: Record<string, string> = {
  child_with_bed: "Child with bed",
  child_without_bed: "Child no bed",
  infant: "Infant",
};

const DEPARTURE_STATUS_LABELS: Record<DepartureStatus, string> = {
  active: "Active",
  guaranteed: "Guaranteed",
  limited: "Limited",
  sold_out: "Sold out",
  cancelled: "Cancelled",
};

const CONSULTANT_GROUPS: { title: string; hint: string; fields: [keyof ConsultantViewData, string][] }[] = [
  {
    title: "How to pitch it",
    hint: "The story to lead with.",
    fields: [
      ["internalSummary", "Internal summary"],
      ["howToSell", "How to sell"],
      ["bestClientProfile", "Best client"],
      ["upsellIdeas", "Upsell ideas"],
    ],
  },
  {
    title: "Objections",
    hint: "What clients push back on, and what to say.",
    fields: [
      ["commonObjections", "Common objections"],
      ["suggestedResponse", "Suggested response"],
    ],
  },
  {
    title: "Do not say",
    hint: "Promises and risks that must stay off the call.",
    fields: [
      ["doNotPromise", "Do not promise"],
      ["knownRisks", "Known risks"],
    ],
  },
  {
    title: "Before you confirm",
    hint: "Checks to make before the booking is locked.",
    fields: [
      ["visaPassportReminders", "Visa and passport"],
      ["halalDietaryPositioning", "Halal and dietary"],
      ["clientSuitabilityNotes", "Who it suits"],
      ["urgencyFollowUpGuidance", "When to follow up"],
    ],
  },
];

interface BriefSection {
  id: string;
  label: string;
  title: string;
  hint?: string;
  body: ReactNode;
}

function text(value?: string | null): string {
  return value?.trim() ?? "";
}

function hasText(value?: string | null): boolean {
  return Boolean(text(value));
}

function isHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function formatDay(value?: string | null): string {
  const raw = text(value);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return raw;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatMonth(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})/);
  if (!match) return value;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatRange(from?: string, to?: string): string {
  const start = formatDay(from);
  const end = formatDay(to);
  if (start && end && start !== end) return `${start} – ${end}`;
  return start || end;
}

function money(amount?: string | null, currency?: string): string {
  const value = text(amount);
  if (!value) return "—";
  if (!currency) return value;
  if (value.toUpperCase().includes(currency.toUpperCase())) return value;
  return `${currency} ${value}`;
}

function durationLabel(basics?: PackageBasicsValues | null): string {
  const days = text(basics?.days);
  const nights = text(basics?.nights);
  if (days && nights) return `${days}D / ${nights}N`;
  if (days) return `${days} days`;
  if (nights) return `${nights} nights`;
  return "";
}

function routeLabel(basics?: PackageBasicsValues | null): string {
  const places = [basics?.countriesCovered, basics?.citiesOrRegions].map((part) => text(part)).filter(Boolean);
  const start = text(basics?.startingPoint);
  const end = text(basics?.endingPoint);
  const route = start && end ? `${start} → ${end}` : start || end;
  return [...places, route].filter(Boolean).join(" · ");
}

function RichCopy({ value }: { value?: string | null }) {
  const raw = text(value);
  if (!raw) return null;
  if (isHtml(raw)) {
    return (
      <div
        className="blog-editor-content blog-content-preview text-sm text-gray-800 break-words"
        dangerouslySetInnerHTML={{ __html: raw }}
      />
    );
  }
  return <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{raw}</p>;
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#F3F4F6] px-2.5 py-1 text-xs font-medium text-[#374151]">
      {children}
    </span>
  );
}

function Fact({ label, value }: { label: string; value?: string | null }) {
  const raw = text(value);
  if (!raw) return null;
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap break-words">{raw}</dd>
    </div>
  );
}

function BulletColumn({ title, items }: { title: string; items?: string[] }) {
  const list = (items ?? []).map((item) => item.trim()).filter(Boolean);
  if (!list.length) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{title}</p>
      <ul className="mt-2 space-y-1.5">
        {list.map((item) => (
          <li key={item} className="text-sm text-gray-800 leading-snug">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Note({ label, value }: { label: string; value?: string | null }) {
  if (!hasText(value)) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <div className="mt-1">
        <RichCopy value={value} />
      </div>
    </div>
  );
}

function InternalNote({ label, value }: { label: string; value?: string | null }) {
  if (!hasText(value)) return null;
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">{label}</p>
      <p className="mt-1 text-sm text-amber-950 whitespace-pre-wrap">{text(value)}</p>
    </div>
  );
}

function PriceTable({
  rows,
  currency,
}: {
  rows: { key: string; label: string; net?: string; margin?: string; retail?: string }[];
  currency?: string;
}) {
  if (!rows.length) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            <th className="py-2 pr-3 font-semibold">Who</th>
            <th className="py-2 pr-3 font-semibold">Selling</th>
            <th className="py-2 pr-3 font-semibold">Net</th>
            <th className="py-2 font-semibold">Margin</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t border-[#EEF2F7]">
              <td className="py-2 pr-3 font-medium text-[#1F2A44]">{row.label}</td>
              <td className="py-2 pr-3 font-semibold text-[#1F2A44]">{money(row.retail, currency)}</td>
              <td className="py-2 pr-3 text-gray-600">{money(row.net, currency)}</td>
              <td className="py-2 text-gray-600">{text(row.margin) || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function priceRows(block?: PricingDetailsBlock | null) {
  const adults = (block?.adultTiers ?? [])
    .filter((tier) => hasText(tier.pax) || hasText(tier.retailPrice) || hasText(tier.netPrice))
    .map((tier) => ({
      key: tier.id || tier.pax,
      label: text(tier.pax) || "Adult",
      net: tier.netPrice,
      margin: tier.margin,
      retail: tier.retailPrice,
    }));
  const children = (block?.childRows ?? [])
    .filter((row) => hasText(row.retailPrice) || hasText(row.netPrice))
    .map((row) => ({
      key: row.id || row.type,
      label: CHILD_TYPE_LABELS[row.type] ?? row.type,
      net: row.netPrice,
      margin: row.margin,
      retail: row.retailPrice,
    }));
  return [...adults, ...children];
}

function PriceDetails({
  block,
  currency,
}: {
  block?: PricingDetailsBlock | null;
  currency?: string;
}) {
  const rows = priceRows(block);
  const promotions = (block?.promotions ?? []).filter(
    (promo) => hasText(promo.title) || hasText(promo.value)
  );
  if (!rows.length && !promotions.length) return null;

  return (
    <div className="space-y-3">
      <PriceTable rows={rows} currency={currency} />
      {promotions.length > 0 && (
        <div className="space-y-2">
          {promotions.map((promo) => {
            const discount = text(promo.value);
            const discountLabel =
              promo.discountType === "percentage" && discount
                ? `${discount}% off`
                : discount
                  ? `${money(discount, currency)} off`
                  : "";
            return (
              <div key={promo.id || promo.title} className="rounded-lg bg-[#F8F9FB] px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-[#1F2A44]">{text(promo.title) || "Promotion"}</span>
                  {discountLabel && <Chip>{discountLabel}</Chip>}
                  <span className={`text-xs font-medium ${promo.active ? "text-emerald-700" : "text-gray-400"}`}>
                    {promo.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {[
                    formatRange(promo.bookingFrom || promo.validFrom, promo.bookingTo || promo.validTo)
                      ? `Book ${formatRange(promo.bookingFrom || promo.validFrom, promo.bookingTo || promo.validTo)}`
                      : "",
                    formatRange(promo.travelFrom, promo.travelTo)
                      ? `Travel ${formatRange(promo.travelFrom, promo.travelTo)}`
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" · ") || "No dates saved"}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function departureTone(status: DepartureStatus): string {
  if (status === "guaranteed") return "bg-emerald-50 text-emerald-700";
  if (status === "limited") return "bg-amber-50 text-amber-700";
  if (status === "sold_out") return "bg-red-50 text-red-700";
  if (status === "cancelled") return "bg-slate-100 text-slate-500";
  return "bg-sky-50 text-sky-700";
}

function PricingBrief({ pricing }: { pricing: PricingData }) {
  const currency = text(pricing.displayCurrency);
  const categories = pricing.hotelCategories ?? [];
  const legacyRows = (pricing.paxRows ?? [])
    .filter((row) => hasText(row.tier) || hasText(row.adultSelling) || hasText(row.adultNet))
    .map((row) => ({
      key: row.id || row.tier,
      label: text(row.tier) || "Adult",
      net: row.adultNet,
      margin: "",
      retail: row.adultSelling,
    }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {pricing.pricingType && (
          <Chip>{pricing.pricingType === "fixed_departure" ? "Fixed departure" : "Seasonal / general"}</Chip>
        )}
        {currency && <Chip>{currency}</Chip>}
        {hasText(pricing.defaultRoomBasis) && <Chip>{pricing.defaultRoomBasis}</Chip>}
        {hasText(pricing.hotelCategory) && <Chip>{pricing.hotelCategory}</Chip>}
      </div>

      {categories.map((category) => {
        const ranges = category.bookingRanges ?? [];
        const months = category.departureMonths ?? [];
        const hasRanges = ranges.some(
          (range) => priceRows(range.pricing).length > 0 || (range.pricing?.promotions?.length ?? 0) > 0 || (range.blackouts?.length ?? 0) > 0
        );
        const hasDepartures = months.some((month) => (month.dates ?? []).length > 0);
        if (!hasRanges && !hasDepartures) return null;

        return (
          <div key={category.category} className="rounded-xl border border-[#E5E7EB] overflow-hidden">
            <div className="bg-[#1F2A44] px-4 py-2.5">
              <p className="text-sm font-semibold text-white">
                {HOTEL_CATEGORY_LABELS[category.category] ?? category.category}
              </p>
            </div>
            <div className="space-y-4 p-4">
              {ranges.map((range, index) => {
                const blackouts = (range.blackouts ?? []).filter(
                  (item) => hasText(item.fromDate) || hasText(item.reason)
                );
                const hasPrices =
                  priceRows(range.pricing).length > 0 ||
                  (range.pricing?.promotions ?? []).some((promo) => hasText(promo.title) || hasText(promo.value));
                if (!hasPrices && !blackouts.length) return null;
                return (
                  <div key={range.id || index} className="space-y-2">
                    <div>
                      <p className="text-sm font-semibold text-[#1F2A44]">
                        {text(range.name) || `Season ${index + 1}`}
                      </p>
                      <p className="text-xs text-gray-500">{formatRange(range.fromDate, range.toDate) || "Dates not set"}</p>
                    </div>
                    {hasPrices && <PriceDetails block={range.pricing} currency={currency} />}
                    {blackouts.length > 0 && (
                      <ul className="text-xs text-gray-600 space-y-1">
                        {blackouts.map((item) => (
                          <li key={item.id}>
                            Blackout: {item.kind === "single" ? formatDay(item.fromDate) : formatRange(item.fromDate, item.toDate)}
                            {hasText(item.reason) ? ` — ${item.reason}` : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}

              {months.map((month) => {
                const dates = month.dates ?? [];
                if (!dates.length) return null;
                return (
                  <div key={month.id || month.month} className="space-y-3">
                    <p className="text-sm font-semibold text-[#1F2A44]">{formatMonth(month.month)}</p>
                    {dates.map((entry) => (
                      <div key={entry.id || entry.date} className="rounded-lg border border-[#E5E7EB] p-3 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-[#1F2A44]">{formatDay(entry.date) || "Date not set"}</p>
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${departureTone(entry.status)}`}>
                            {DEPARTURE_STATUS_LABELS[entry.status] ?? entry.status}
                          </span>
                        </div>
                        <PriceDetails block={entry.pricing} currency={currency} />
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {legacyRows.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Adult pricing</p>
          <PriceTable
            rows={legacyRows.map((row) => ({ ...row, margin: row.margin || undefined }))}
            currency={currency}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Note label="Hotel pricing notes" value={pricing.hotelPricingNotes} />
        <Note label="Child pricing rules" value={pricing.childPricingRules} />
        <Note label="Promo note" value={pricing.promoDisplayNote} />
      </div>
    </div>
  );
}

function pricingHasContent(pricing?: PricingData | null): boolean {
  if (!pricing) return false;
  if (hasText(pricing.hotelPricingNotes) || hasText(pricing.childPricingRules) || hasText(pricing.promoDisplayNote)) {
    return true;
  }
  if ((pricing.paxRows ?? []).some((row) => hasText(row.adultSelling) || hasText(row.adultNet) || hasText(row.tier))) {
    return true;
  }
  return (pricing.hotelCategories ?? []).some((category) => {
    const ranges = category.bookingRanges ?? [];
    const months = category.departureMonths ?? [];
    return (
      ranges.some(
        (range) =>
          priceRows(range.pricing).length > 0 ||
          (range.pricing?.promotions ?? []).some((promo) => hasText(promo.title) || hasText(promo.value)) ||
          (range.blackouts?.length ?? 0) > 0
      ) ||
      months.some((month) => (month.dates ?? []).length > 0)
    );
  });
}

function DayCard({ day }: { day: ItineraryDay }) {
  const meals = [
    day.breakfast ? "Breakfast" : "",
    day.lunch ? "Lunch" : "",
    day.dinner ? "Dinner" : "",
  ].filter(Boolean);
  const heading = `Day ${day.dayNumber}${text(day.title) ? ` — ${text(day.title)}` : ""}`;

  return (
    <article className="rounded-xl border border-[#E5E7EB] bg-[#FAFBFD] p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-[#1F2A44]">{heading}</h4>
        {meals.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {meals.map((meal) => (
              <Chip key={meal}>{meal}</Chip>
            ))}
          </div>
        )}
      </div>
      <RichCopy value={day.description} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Note label="Activities" value={day.activitiesIncluded} />
        <Note label="Highlights" value={day.highlights} />
        <Note label="Optional" value={day.optionalActivities} />
        <Fact label="City" value={day.city} />
        <Fact label="Transport" value={day.transport} />
        <Fact label="Hotel that night" value={day.hotelThatNight} />
        <Note label="Dietary" value={day.dietaryNotes || day.halalFoodNote} />
      </div>
      <div className="space-y-2">
        <InternalNote label="Consultant note" value={day.internalNotes} />
        <InternalNote label="Mobility" value={day.mobilityWarning} />
        <InternalNote label="Supplier note" value={day.supplierNotes} />
      </div>
    </article>
  );
}

function HotelCard({ hotel }: { hotel: HotelEntry }) {
  const name = text(hotel.hotelName) || "Hotel";
  const breakfast =
    hotel.breakfastIncluded == null
      ? ""
      : hotel.breakfastIncluded
        ? hotel.halalBreakfast
          ? "Breakfast included (halal)"
          : "Breakfast included"
        : "Breakfast not included";

  return (
    <article className="rounded-xl border border-[#E5E7EB] p-4 space-y-3">
      <div>
        <h4 className="text-sm font-semibold text-[#1F2A44]">{name}</h4>
        <p className="text-xs text-gray-500">
          {[text(hotel.city), text(hotel.starRating)].filter(Boolean).join(" · ")}
        </p>
      </div>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Fact label="Room" value={hotel.roomType} />
        <Fact label="Nights" value={hotel.nights} />
        <Fact label="Max occupancy" value={hotel.maxOccupancy} />
        <Fact label="Child policy" value={hotel.childPolicy} />
        <Fact label="Address" value={hotel.address} />
        <Fact label="Breakfast" value={breakfast} />
        <Fact label="Connecting rooms" value={hotel.connectingRooms == null ? "" : hotel.connectingRooms ? "Yes" : "No"} />
        <Fact label="Extra bed" value={hotel.extraBed == null ? "" : hotel.extraBed ? "Yes" : "No"} />
      </dl>
      {hasText(hotel.googleMapsLink) && (
        <a
          href={hotel.googleMapsLink}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium text-[#B48A2C] hover:underline"
        >
          Open map
        </a>
      )}
      <InternalNote label="Internal note" value={hotel.internalNotes} />
    </article>
  );
}

function importantInfo(inclusions?: InclusionsData | null, basics?: PackageBasicsValues | null): string {
  if (inclusions && Object.prototype.hasOwnProperty.call(inclusions, "importantInfo")) {
    return inclusions.importantInfo ?? "";
  }
  return basics?.importantInfo ?? "";
}

function InclusionsBrief({
  inclusions,
  basics,
}: {
  inclusions: InclusionsData;
  basics?: PackageBasicsValues | null;
}) {
  const flags = [
    inclusions.flightsIncluded || basics?.domesticFlightsIncluded ? "Flights included" : "",
    inclusions.trainIncluded || basics?.trainIncluded ? "Train included" : "",
    inclusions.transfersIncluded || basics?.transfersIncluded ? "Transfers included" : "",
  ].filter(Boolean);

  return (
    <div className="space-y-4">
      {flags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {flags.map((flag) => (
            <Chip key={flag}>{flag}</Chip>
          ))}
        </div>
      )}
      {hasText(importantInfo(inclusions, basics)) && (
        <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Important notes</p>
          <div className="mt-1">
            <RichCopy value={importantInfo(inclusions, basics)} />
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <BulletColumn title="Included" items={inclusions.included} />
        <BulletColumn title="Excluded" items={inclusions.excluded} />
        <BulletColumn title="Optional add-ons" items={inclusions.optionalAddons} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Note label="Local fees" value={inclusions.localFees} />
        <Note label="Non-refundable" value={inclusions.nonRefundable} />
      </div>
      {inclusions.consultantMustExplain && (
        <p className="text-xs font-medium text-amber-800">Consultant must explain these conditions before booking.</p>
      )}
    </div>
  );
}

function BookingBrief({ policy }: { policy: BookingPolicyData }) {
  const rows = (policy.cancellationRows ?? []).filter(
    (row) => hasText(row.from) || hasText(row.to) || hasText(row.clientCharge)
  );

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Fact label="Payment" value={policy.paymentMode} />
        <Fact label="Deposit" value={policy.depositAmount} />
        <Fact label="Balance due" value={policy.balanceDue} />
        <Fact label="Confirmation" value={policy.confirmationRule} />
      </dl>
      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[360px] text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                <th className="py-2 pr-3 font-semibold">From</th>
                <th className="py-2 pr-3 font-semibold">To</th>
                <th className="py-2 font-semibold">Client charge</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-[#EEF2F7]">
                  <td className="py-2 pr-3">{text(row.from) || "—"}</td>
                  <td className="py-2 pr-3">{text(row.to) || "—"}</td>
                  <td className="py-2 font-medium text-[#1F2A44]">{text(row.clientCharge) || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Note label="Amendments" value={policy.amendmentPolicy} />
        <Note label="Exception approval" value={policy.exceptionApproval} />
        <Note label="Refundable" value={policy.refundableComponents} />
        <Note label="Non-refundable" value={policy.nonRefundableComponents} />
      </div>
    </div>
  );
}

function ConsultantBriefNotes({ notes }: { notes: ConsultantViewData }) {
  const groups = CONSULTANT_GROUPS.map((group) => ({
    ...group,
    filled: group.fields.filter(([key]) => hasText(notes[key])),
  })).filter((group) => group.filled.length > 0);

  if (!groups.length) return null;

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.title} className="rounded-xl border border-[#E5E7EB] p-4">
          <p className="text-sm font-semibold text-[#1F2A44]">{group.title}</p>
          <p className="mt-0.5 text-xs text-gray-500">{group.hint}</p>
          <div className="mt-3 space-y-3">
            {group.filled.map(([key, label]) => (
              <Note key={key} label={label} value={notes[key]} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function sameCopy(left?: string | null, right?: string | null): boolean {
  const a = text(left);
  const b = text(right);
  return Boolean(a && b && a === b);
}

function buildSections(pkg: PackageRecord): BriefSection[] {
  const basics = pkg.package_basics;
  const sections: BriefSection[] = [];

  const overviewFacts = [
    basics?.packageMode,
    basics?.tourType,
    basics?.runsCustom || basics?.runs,
    basics?.isSeasonalPackage ? "Seasonal" : "",
  ].filter((item): item is string => Boolean(item && String(item).trim()));
  const themes = (basics?.packageThemes ?? []).map((item) => item.trim()).filter(Boolean);
  const categories = (basics?.categories ?? []).map((item) => item.trim()).filter(Boolean);
  const story = text(basics?.packageOverview) || text(basics?.shortIntro);
  const extraIntro = sameCopy(basics?.shortIntro, story) ? "" : text(basics?.shortIntro);
  const websiteNotes = sameCopy(basics?.frontendNotes, story) ? "" : basics?.frontendNotes;
  const hasOverviewCopy =
    Boolean(story) || Boolean(extraIntro) || hasText(websiteNotes) || hasText(pkg.media_frontend?.whyChooseThisPackage);
  if (hasOverviewCopy || overviewFacts.length || themes.length || categories.length) {
    sections.push({
      id: "tc-overview",
      label: "Glance",
      title: "At a glance",
      hint: "One story to repeat. Route and duration sit in the title.",
      body: (
        <div className="space-y-4">
          {(overviewFacts.length > 0 || themes.length > 0 || categories.length > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {overviewFacts.map((item) => (
                <Chip key={item}>{item}</Chip>
              ))}
              {themes.map((item) => (
                <Chip key={`theme-${item}`}>{item}</Chip>
              ))}
              {categories.map((item) => (
                <Chip key={`cat-${item}`}>{item}</Chip>
              ))}
            </div>
          )}
          {story && <RichCopy value={story} />}
          <Note label="Also say" value={extraIntro} />
          <Note label="Why choose this" value={pkg.media_frontend?.whyChooseThisPackage} />
          <Note label="Website notes" value={websiteNotes} />
        </div>
      ),
    });
  }

  const hasPricing = Boolean(pricingHasContent(pkg.pricing) && pkg.pricing);
  const policy = pkg.booking_policy;
  const policyReady = Boolean(
    policy &&
      (hasText(policy.paymentMode) ||
        hasText(policy.depositAmount) ||
        hasText(policy.balanceDue) ||
        hasText(policy.confirmationRule) ||
        hasText(policy.amendmentPolicy) ||
        (policy.cancellationRows?.length ?? 0) > 0 ||
        hasText(policy.refundableComponents) ||
        hasText(policy.nonRefundableComponents))
  );
  if (hasPricing || policyReady) {
    sections.push({
      id: "tc-pricing",
      label: "Price",
      title: "Price and booking",
      hint: "Selling price is the client figure. Net, margin, and payment rules stay with it.",
      body: (
        <div className="space-y-6">
          {hasPricing && pkg.pricing && <PricingBrief pricing={pkg.pricing} />}
          {policyReady && policy && (
            <div className="space-y-3 border-t border-[#E5E7EB] pt-4">
              <p className="text-sm font-semibold text-[#1F2A44]">How the booking works</p>
              <BookingBrief policy={policy} />
            </div>
          )}
        </div>
      ),
    });
  }

  const days = (pkg.itinerary?.days ?? []).filter(
    (day) =>
      hasText(day.title) ||
      hasText(day.description) ||
      hasText(day.activitiesIncluded) ||
      hasText(day.highlights) ||
      hasText(day.internalNotes)
  );
  const hotels = (pkg.hotels ?? []).filter(
    (hotel) => hasText(hotel.hotelName) || hasText(hotel.city) || hasText(hotel.roomType)
  );
  if (days.length || hotels.length) {
    sections.push({
      id: "tc-itinerary",
      label: "Trip",
      title: "The trip",
      hint: "Days first, then the hotels. Amber notes are for the consultant only.",
      body: (
        <div className="space-y-6">
          {days.length > 0 && (
            <div className="space-y-3">
              {days.map((day) => (
                <DayCard key={`${day.dayNumber}-${day.title ?? ""}`} day={day} />
              ))}
            </div>
          )}
          {hotels.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-[#1F2A44]">Where they stay</p>
              {hotels.map((hotel, index) => (
                <HotelCard key={`${hotel.hotelName ?? "hotel"}-${index}`} hotel={hotel} />
              ))}
            </div>
          )}
        </div>
      ),
    });
  }

  const inclusions = pkg.inclusions;
  const inclusionReady = Boolean(
    inclusions &&
      ((inclusions.included?.some((item) => item.trim()) ?? false) ||
        (inclusions.excluded?.some((item) => item.trim()) ?? false) ||
        (inclusions.optionalAddons?.some((item) => item.trim()) ?? false) ||
        hasText(inclusions.localFees) ||
        hasText(inclusions.nonRefundable) ||
        hasText(importantInfo(inclusions, basics)) ||
        inclusions.flightsIncluded ||
        inclusions.trainIncluded ||
        inclusions.transfersIncluded ||
        basics?.domesticFlightsIncluded ||
        basics?.trainIncluded ||
        basics?.transfersIncluded)
  );
  const faqs = (pkg.frontend_faqs ?? []).filter((item) => hasText(item.question) || hasText(item.answer));
  const hasPlaybook = Boolean(
    pkg.consultant_view && CONSULTANT_GROUPS.some((group) => group.fields.some(([key]) => hasText(pkg.consultant_view?.[key])))
  );
  const share = text(pkg.sales_ads_assets?.consultantShareMessage);
  const whatsapp = text(pkg.sales_ads_assets?.whatsappLink || pkg.media_frontend?.whatsappLink);
  if (inclusionReady || faqs.length || hasPlaybook || share || whatsapp) {
    sections.push({
      id: "tc-call",
      label: "On the call",
      title: "On the call",
      hint: "What is included, what clients ask, and what you can send. Amber playbook notes stay internal.",
      body: (
        <div className="space-y-6">
          {inclusionReady && inclusions && <InclusionsBrief inclusions={inclusions} basics={basics} />}
          {faqs.length > 0 && (
            <div className="space-y-3 border-t border-[#E5E7EB] pt-4">
              <p className="text-sm font-semibold text-[#1F2A44]">Questions clients ask</p>
              {faqs.map((item, index) => (
                <div key={item.id || index}>
                  <p className="text-sm font-semibold text-[#1F2A44]">{text(item.question) || "Question"}</p>
                  <div className="mt-1">
                    <RichCopy value={item.answer} />
                  </div>
                </div>
              ))}
            </div>
          )}
          {hasPlaybook && pkg.consultant_view && (
            <div className="space-y-3 border-t border-[#E5E7EB] pt-4">
              <p className="text-sm font-semibold text-[#1F2A44]">How to sell it</p>
              <ConsultantBriefNotes notes={pkg.consultant_view} />
            </div>
          )}
          {(share || whatsapp) && (
            <div className="space-y-3 border-t border-[#E5E7EB] pt-4">
              <p className="text-sm font-semibold text-[#1F2A44]">Message you can send</p>
              <RichCopy value={share} />
              {whatsapp && (
                <a href={whatsapp} target="_blank" rel="noreferrer" className="text-sm font-medium text-[#B48A2C] hover:underline break-all">
                  {whatsapp}
                </a>
              )}
            </div>
          )}
        </div>
      ),
    });
  }

  const supplier = pkg.supplier_source;
  const emails = (supplier?.supplierEmails ?? []).map((email) => email.trim()).filter(Boolean);
  const files = supplier?.quotationFiles ?? [];
  if (supplier && (hasText(supplier.supplierName) || emails.length || files.length || hasText(supplier.internalSupplierNotes))) {
    sections.push({
      id: "tc-supplier",
      label: "Supplier",
      title: "Supplier",
      hint: "Internal. Do not forward supplier cost notes to the client.",
      body: (
        <div className="space-y-4">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Fact label="Supplier" value={supplier.supplierName} />
            <Fact label="Their package name" value={supplier.supplierPackageName} />
            <Fact label="Country" value={supplier.supplierCountry} />
            <Fact label="Contact" value={supplier.contactPerson} />
            <Fact label="WhatsApp" value={supplier.supplierWhatsapp} />
            <Fact label="Email" value={emails.join(", ")} />
          </dl>
          {files.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Package files</p>
              <ul className="mt-2 space-y-1">
                {files.map((file) => (
                  <li key={file.id || file.url}>
                    <a href={file.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-[#B48A2C] hover:underline">
                      {file.filename || "Open file"}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <InternalNote label="Supplier notes" value={supplier.internalSupplierNotes} />
        </div>
      ),
    });
  }

  return sections;
}

function briefGaps(pkg: PackageRecord, sections: BriefSection[]): string[] {
  const present = new Set(sections.map((section) => section.id));
  const gaps = [
    ["tc-overview", "At a glance"],
    ["tc-pricing", "Price and booking"],
    ["tc-itinerary", "The trip"],
  ].filter(([id]) => !present.has(id)).map(([, label]) => label);

  const inclusions = pkg.inclusions;
  const basics = pkg.package_basics;
  const hasInclusions = Boolean(
    inclusions &&
      ((inclusions.included?.some((item) => item.trim()) ?? false) ||
        (inclusions.excluded?.some((item) => item.trim()) ?? false) ||
        inclusions.flightsIncluded ||
        inclusions.trainIncluded ||
        inclusions.transfersIncluded ||
        basics?.domesticFlightsIncluded ||
        basics?.trainIncluded ||
        basics?.transfersIncluded)
  );
  const hasPlaybook = Boolean(
    pkg.consultant_view && CONSULTANT_GROUPS.some((group) => group.fields.some(([key]) => hasText(pkg.consultant_view?.[key])))
  );
  if (!hasInclusions) gaps.push("Inclusions");
  if (!hasPlaybook) gaps.push("How to sell");
  return gaps;
}

export function consultantBriefHeadline(pkg: PackageRecord): string {
  return [durationLabel(pkg.package_basics), routeLabel(pkg.package_basics)].filter(Boolean).join(" · ");
}

export default function PackageConsultantBrief({ pkg }: { pkg: PackageRecord }) {
  const sections = buildSections(pkg);
  const missing = briefGaps(pkg, sections);

  function jump(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!sections.length) {
    return (
      <p className="rounded-xl border border-dashed border-[#E5E7EB] px-4 py-8 text-center text-sm text-gray-500">
        Nothing has been saved on this package yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {missing.length > 0 && (
        <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Still missing for consultants: {missing.map((item) => item.label).join(", ")}
        </p>
      )}

      <div className="sticky top-0 z-10 -mx-1 flex gap-2 overflow-x-auto bg-white/95 px-1 py-2 backdrop-blur-sm">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => jump(section.id)}
            className="shrink-0 rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-xs font-medium text-[#1F2A44] hover:border-[#B48A2C]/50 hover:text-[#B48A2C]"
          >
            {section.label}
          </button>
        ))}
      </div>

      {sections.map((section) => (
        <section
          key={section.id}
          id={section.id}
          className="scroll-mt-3 overflow-hidden rounded-xl border border-[#E5E7EB]"
        >
          <div className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
            <h3 className="text-sm font-bold text-[#1F2A44]">{section.title}</h3>
            {section.hint && <p className="mt-0.5 text-xs text-gray-500">{section.hint}</p>}
          </div>
          <div className="p-4">{section.body}</div>
        </section>
      ))}
    </div>
  );
}
