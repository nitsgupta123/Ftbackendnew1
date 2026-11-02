"use client";

import { Icon } from "@/components/ui/icons";
import type { PromotionRecord } from "@/lib/promotion-types";
import { formatPackageDate } from "@/lib/format-date";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  inactive: "bg-gray-100 text-gray-600 ring-gray-500/10",
};

function formatWindow(
  from: string | null,
  to: string | null,
  openStart: string,
  openEnd: string
): string {
  if (!from && !to) return `${openStart} – ${openEnd}`;
  return `${from ? formatPackageDate(from) : openStart} – ${to ? formatPackageDate(to) : openEnd}`;
}

function formatDiscountType(type: PromotionRecord["discount_type"]): string {
  return type === "percentage" ? "Percentage" : "Fixed Amount";
}

function formatValue(promotion: PromotionRecord): string {
  if (promotion.discount_type === "percentage") {
    return `${promotion.value.toFixed(2)}%`;
  }
  return promotion.value.toFixed(2);
}

function packageCountLabel(promotion: PromotionRecord): string {
  const count = promotion.package_keys.length;
  if (count === 0) return "All packages";
  return `${count} selected package(s)`;
}

interface PromotionListTableProps {
  promotions: PromotionRecord[];
  loading?: boolean;
  onEdit: (promotion: PromotionRecord) => void;
  onToggleStatus: (promotion: PromotionRecord) => void;
  onDelete: (promotion: PromotionRecord) => void;
}

export default function PromotionListTable({
  promotions,
  loading = false,
  onEdit,
  onToggleStatus,
  onDelete,
}: PromotionListTableProps) {
  if (loading) {
    return (
      <div className="p-12 text-center text-sm text-gray-500">Loading promotions…</div>
    );
  }

  if (!promotions.length) {
    return (
      <div className="p-12 text-center text-sm text-gray-500">
        No promotions found. Create your first promotion to offer package discounts.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table className="w-full text-sm">
        <TableHeader>
          <TableRow className="border-b border-[#E8ECF0] bg-[#FAFBFC] hover:bg-[#FAFBFC]">
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
              Promotion Title
            </TableHead>
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
              Booking window
            </TableHead>
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
              Travel window
            </TableHead>
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
              Discount Type
            </TableHead>
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
              Value
            </TableHead>
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
              Status
            </TableHead>
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-[#F1F5F9]">
          {promotions.map((promotion) => (
            <TableRow
              key={promotion.id}
              className="group hover:bg-[#FFFCF7]/60 transition-colors"
            >
              <TableCell className="px-4 py-3.5">
                <div className="font-semibold text-[#1F2A44]">{promotion.title}</div>
                <div className="text-xs text-gray-400 mt-0.5">{packageCountLabel(promotion)}</div>
              </TableCell>
              <TableCell className="px-4 py-3.5 text-gray-600 whitespace-nowrap">
                {formatWindow(promotion.booking_from, promotion.booking_to, "Immediately", "No expiry")}
              </TableCell>
              <TableCell className="px-4 py-3.5 text-gray-600 whitespace-nowrap">
                {formatWindow(promotion.travel_from, promotion.travel_to, "Any date", "Any date")}
              </TableCell>
              <TableCell className="px-4 py-3.5 text-gray-600">
                {formatDiscountType(promotion.discount_type)}
              </TableCell>
              <TableCell className="px-4 py-3.5 font-semibold text-[#1F2A44]">
                {formatValue(promotion)}
              </TableCell>
              <TableCell className="px-4 py-3.5">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ring-inset ${
                    STATUS_STYLES[promotion.status] ?? STATUS_STYLES.inactive
                  }`}
                >
                  {promotion.status}
                </span>
              </TableCell>
              <TableCell className="px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onEdit(promotion)}
                    className="inline-flex items-center justify-center size-8 rounded-lg text-[#A68231] hover:bg-[#FFFCF7] hover:border-[#A68231]/30 transition-colors"
                    title="Edit"
                  >
                    <Icon name="Pencil" size={16} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onToggleStatus(promotion)}
                    className="inline-flex items-center justify-center size-8 rounded-lg text-[#EA580C] hover:bg-orange-50 transition-colors"
                    title={promotion.status === "active" ? "Deactivate" : "Activate"}
                  >
                    <Icon name="Power" size={16} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onDelete(promotion)}
                    className="inline-flex items-center justify-center size-8 rounded-lg text-[#DC2626] hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <Icon name="Trash2" size={16} />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
