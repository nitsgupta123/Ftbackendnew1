"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Icon } from "@/components/ui/icons";
import PromotionListTable from "@/components/promotions/PromotionListTable";
import PromotionForm, { type PromotionFormValues } from "@/components/promotions/PromotionForm";
import { listAllPackages } from "@/lib/package-api";
import {
  createPromotion,
  deletePromotion,
  listPromotions,
  updatePromotion,
} from "@/lib/promotion-api";
import {
  packageOptionKey,
  type PromotionPackageOption,
  type PromotionRecord,
  type PromotionStatus,
} from "@/lib/promotion-types";
import { Button } from "@/components/ui/button";

type FormMode = "create" | "edit" | null;

function toPayload(data: PromotionFormValues) {
  return {
    title: data.title.trim(),
    booking_from: data.booking_from || null,
    booking_to: data.booking_to || null,
    travel_from: data.travel_from || null,
    travel_to: data.travel_to || null,
    discount_type: data.discount_type,
    value: data.value,
    package_keys: data.package_keys,
    status: (data.is_active ? "active" : "inactive") as PromotionStatus,
  };
}

export interface PromotionsPanelHandle {
  openCreate: () => void;
}

const PromotionsPanel = forwardRef<PromotionsPanelHandle>(function PromotionsPanel(_, ref) {
  const { user } = useAuth();
  const canDelete = user?.role === "super_admin";
  const [promotions, setPromotions] = useState<PromotionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [packageOptions, setPackageOptions] = useState<PromotionPackageOption[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingPromotion, setEditingPromotion] = useState<PromotionRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadPromotions = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const result = await listPromotions();
      setPromotions(result.promotions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load promotions");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

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
      setPackageOptions([]);
    } finally {
      setPackagesLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadPromotions();
      void loadPackages();
    });
  }, [loadPromotions, loadPackages]);

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
    setError(null);
    try {
      const payload = toPayload(data);
      if (formMode === "edit" && editingPromotion) {
        await updatePromotion(editingPromotion.id, payload);
      } else {
        await createPromotion(payload);
      }
      await loadPromotions(true);
      setFormMode(null);
      setEditingPromotion(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save promotion");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleStatus(promotion: PromotionRecord) {
    setError(null);
    try {
      const status: PromotionStatus = promotion.status === "active" ? "inactive" : "active";
      const { promotion: updated } = await updatePromotion(promotion.id, { status });
      setPromotions((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update promotion");
    }
  }

  async function handleDelete(promotion: PromotionRecord) {
    if (!window.confirm(`Delete "${promotion.title}"? This cannot be undone.`)) return;
    setError(null);
    try {
      await deletePromotion(promotion.id);
      setPromotions((prev) => prev.filter((item) => item.id !== promotion.id));
      if (editingPromotion?.id === promotion.id) {
        setFormMode(null);
        setEditingPromotion(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete promotion");
    }
  }

  return (
    <>
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          <Icon name="AlertCircle" size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
        <PromotionListTable
          promotions={promotions}
          loading={loading}
          canDelete={canDelete}
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
