"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { Icon } from "@/components/ui/icons";
import PromotionListTable from "@/components/promotions/PromotionListTable";
import PromotionForm, { type PromotionFormValues } from "@/components/promotions/PromotionForm";
import { listAllPackages } from "@/lib/package-api";
import {
  SAMPLE_PROMOTIONS,
  packageOptionKey,
  type PromotionPackageOption,
  type PromotionRecord,
} from "@/lib/promotion-types";
import { Button } from "@/components/ui/button";

type FormMode = "create" | "edit" | null;

let nextId = SAMPLE_PROMOTIONS.length + 1;

function formValuesToRecord(
  data: PromotionFormValues,
  existing?: PromotionRecord | null
): PromotionRecord {
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? nextId++,
    title: data.title.trim(),
    booking_from: data.booking_from || null,
    booking_to: data.booking_to || null,
    travel_from: data.travel_from || null,
    travel_to: data.travel_to || null,
    discount_type: data.discount_type,
    value: data.value,
    package_keys: data.package_keys,
    status: data.is_active ? "active" : "inactive",
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
}

export interface PromotionsPanelHandle {
  openCreate: () => void;
}

const PromotionsPanel = forwardRef<PromotionsPanelHandle>(function PromotionsPanel(_, ref) {
  const [promotions, setPromotions] = useState<PromotionRecord[]>(SAMPLE_PROMOTIONS);
  const [packageOptions, setPackageOptions] = useState<PromotionPackageOption[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingPromotion, setEditingPromotion] = useState<PromotionRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadPackages = useCallback(async () => {
    setPackagesLoading(true);
    try {
      const { packages } = await listAllPackages();
      setPackageOptions(
        packages
          .filter((pkg) => pkg.status !== "deleted")
          .map((pkg) => ({
            key: packageOptionKey(pkg.source, pkg.id),
            label: pkg.package_title || `Package #${pkg.id}`,
          }))
          .sort((a, b) => a.label.localeCompare(b.label))
      );
    } catch {
      setPackageOptions([
        { key: "wizard:1", label: "9 Days Japan Golden Route with Hiroshima & Mount Fuji from Osaka" },
        { key: "wizard:2", label: "9 Days Kazakhstan & Kyrgyzstan Romantic Honeymoon Tour" },
        { key: "wizard:3", label: "9 Days Melbourne and Sydney Highlights Tour" },
      ]);
    } finally {
      setPackagesLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadPackages();
    });
  }, [loadPackages]);

  function openCreate() {
    setEditingPromotion(null);
    setFormMode("create");
  }

  useImperativeHandle(ref, () => ({ openCreate }), []);

  function openEdit(promotion: PromotionRecord) {
    setEditingPromotion(promotion);
    setFormMode("edit");
  }

  function closeForm() {
    if (!isSaving) {
      setFormMode(null);
      setEditingPromotion(null);
    }
  }

  async function handleFormSubmit(data: PromotionFormValues) {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 400));

    const record = formValuesToRecord(data, editingPromotion);

    if (formMode === "edit" && editingPromotion) {
      setPromotions((prev) =>
        prev.map((item) => (item.id === editingPromotion.id ? record : item))
      );
    } else {
      setPromotions((prev) => [record, ...prev]);
    }

    setIsSaving(false);
    setFormMode(null);
    setEditingPromotion(null);
  }

  function handleToggleStatus(promotion: PromotionRecord) {
    setPromotions((prev) =>
      prev.map((item) =>
        item.id === promotion.id
          ? {
              ...item,
              status: item.status === "active" ? "inactive" : "active",
              updated_at: new Date().toISOString(),
            }
          : item
      )
    );
  }

  function handleDelete(promotion: PromotionRecord) {
    if (!window.confirm(`Delete "${promotion.title}"? This cannot be undone.`)) return;
    setPromotions((prev) => prev.filter((item) => item.id !== promotion.id));
    if (editingPromotion?.id === promotion.id) {
      setFormMode(null);
      setEditingPromotion(null);
    }
  }

  return (
    <>
      <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
        <PromotionListTable
          promotions={promotions}
          onEdit={openEdit}
          onToggleStatus={handleToggleStatus}
          onDelete={handleDelete}
        />
      </div>

      {formMode && (
        <div className="mt-5 rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[#E5E7EB]">
            <h2 className="text-base font-semibold text-[#1F2A44]">
              {formMode === "edit" ? "Edit Promotion" : "Add Promotion"}
            </h2>
            <Button
              type="button"
              onClick={closeForm}
              disabled={isSaving}
              className="size-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              aria-label="Close"
            >
              <Icon name="X" size={18} />
            </Button>
          </div>
          <div className="p-5">
            <PromotionForm
              initialData={editingPromotion}
              packageOptions={packageOptions}
              packagesLoading={packagesLoading}
              isSaving={isSaving}
              onSubmit={handleFormSubmit}
              onCancel={closeForm}
            />
          </div>
        </div>
      )}
    </>
  );
});

export default PromotionsPanel;
