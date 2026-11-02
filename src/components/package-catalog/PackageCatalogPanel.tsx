"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Icon } from "@/components/ui/icons";
import { usePermissions } from "@/components/auth/PermissionsProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatPackageDateTime } from "@/lib/format-date";
import {
  createPackageCatalog,
  deletePackageCatalog,
  listPackageCatalog,
  updatePackageCatalog,
} from "@/lib/package-catalog-api";
import {
  PACKAGE_CATALOG_CONFIG,
  PACKAGE_CATALOG_SORT_OPTIONS,
  PACKAGE_CATALOG_STATUS_FILTER_OPTIONS,
  type PackageCatalogKind,
  type PackageCatalogRecord,
  type PackageCatalogStatusFilter,
} from "@/lib/package-catalog-types";
import { slugify } from "@/lib/slug";
import { createPackageCatalogSchema, type CreatePackageCatalogFormValues } from "@/lib/validation";

const GOLD = "#A68231";
const filterControlClass =
  "h-10 rounded-lg border border-[#E5E7EB] bg-white text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A68231]/25 focus:border-[#A68231] transition-colors";
const inputClass =
  "w-full h-11 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/30 focus:border-[#B48A2C]";
const textareaClass =
  "w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/30 focus:border-[#B48A2C] resize-y min-h-[88px]";

export type PackageCatalogPanelHandle = {
  openCreate: () => void;
};

function titleCase(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function CatalogForm({
  kind,
  initialData,
  isSaving,
  onSubmit,
  onCancel,
}: {
  kind: PackageCatalogKind;
  initialData?: PackageCatalogRecord | null;
  isSaving?: boolean;
  onSubmit: (data: CreatePackageCatalogFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const config = PACKAGE_CATALOG_CONFIG[kind];
  const isEdit = Boolean(initialData);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreatePackageCatalogFormValues>({
    resolver: zodResolver(createPackageCatalogSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      slug: initialData?.slug ?? "",
      description: initialData?.description ?? "",
      display_order: initialData?.display_order ?? 0,
      status: initialData?.status ?? "active",
    },
  });
  const nameValue = useWatch({ control, name: "name" }) ?? "";
  const slugValue = useWatch({ control, name: "slug" }) ?? "";
  const [slugTouched, setSlugTouched] = useState(Boolean(initialData));

  useEffect(() => {
    if (!initialData) return;
    reset({
      name: initialData.name,
      slug: initialData.slug,
      description: initialData.description ?? "",
      display_order: initialData.display_order,
      status: initialData.status,
    });
    queueMicrotask(() => setSlugTouched(true));
  }, [initialData, reset]);

  useEffect(() => {
    if (!slugTouched && nameValue && !isEdit) {
      setValue("slug", slugify(nameValue));
    }
  }, [nameValue, slugTouched, setValue, isEdit]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`${kind}-name`} className="block text-sm font-semibold text-[#334155] mb-1.5">
            Name <span className="text-red-500">*</span>
          </Label>
          <Input id={`${kind}-name`} className={inputClass} {...register("name")} />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor={`${kind}-slug`} className="block text-sm font-semibold text-[#334155] mb-1.5">
            Slug
          </Label>
          <Input
            id={`${kind}-slug`}
            className={inputClass}
            {...register("slug", { onChange: () => setSlugTouched(true) })}
          />
          <p className="mt-1 text-xs text-gray-400">Auto-generated from the name. Example: family-holidays</p>
          {errors.slug && <p className="mt-1 text-xs text-red-600">{errors.slug.message}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor={`${kind}-description`} className="block text-sm font-semibold text-[#334155] mb-1.5">
          Description
        </Label>
        <Textarea id={`${kind}-description`} className={textareaClass} {...register("description")} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`${kind}-order`} className="block text-sm font-semibold text-[#334155] mb-1.5">
            Display order
          </Label>
          <Input
            id={`${kind}-order`}
            type="number"
            min="0"
            className={inputClass}
            {...register("display_order", { valueAsNumber: true })}
          />
          {errors.display_order && (
            <p className="mt-1 text-xs text-red-600">{errors.display_order.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor={`${kind}-status`} className="block text-sm font-semibold text-[#334155] mb-1.5">
            Status
          </Label>
          <NativeSelect id={`${kind}-status`} className={inputClass} {...register("status")}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </NativeSelect>
        </div>
      </div>

      {slugValue && (
        <p className="text-xs text-gray-400">
          Preview URL slug: <span className="font-mono text-gray-600">{slugValue}</span>
        </p>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="h-11 px-5 rounded-xl border border-[#E5E7EB] text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSaving}
          className="inline-flex h-11 px-5 items-center gap-2 text-sm font-semibold text-white bg-[#B48A2C] rounded-xl hover:bg-[#B48A2C]/90 disabled:opacity-50"
        >
          {isSaving && <Icon name="Loader2" size={16} className="animate-spin" />}
          {isSaving ? "Saving…" : isEdit ? `Update ${titleCase(config.singular)}` : `Create ${titleCase(config.singular)}`}
        </Button>
      </div>
    </form>
  );
}

export default forwardRef<PackageCatalogPanelHandle, { kind: PackageCatalogKind }>(
  function PackageCatalogPanel({ kind }, ref) {
    const config = PACKAGE_CATALOG_CONFIG[kind];
    const { can } = usePermissions();
    const canDelete = can(config.permissionKey, "delete");

    const [items, setItems] = useState<PackageCatalogRecord[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<PackageCatalogStatusFilter>("all");
    const [sort, setSort] = useState<"display_order" | "created_at">("display_order");
    const [order, setOrder] = useState<"asc" | "desc">("asc");
    const [page, setPage] = useState(1);
    const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
    const [editing, setEditing] = useState<PackageCatalogRecord | null>(null);
    const [viewing, setViewing] = useState<PackageCatalogRecord | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const loadItems = useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await listPackageCatalog(kind, {
          search: search.trim() || undefined,
          status: statusFilter,
          sort,
          order,
          page,
          limit: 20,
        });
        setItems(result.items);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      } catch (err) {
        setError(err instanceof Error ? err.message : `Failed to load ${config.plural}`);
      } finally {
        setLoading(false);
      }
    }, [kind, search, statusFilter, sort, order, page, config.plural]);

    useEffect(() => {
      queueMicrotask(() => {
        void loadItems();
      });
    }, [loadItems]);

    const activeCount = useMemo(() => items.filter((item) => item.status === "active").length, [items]);
    const emptyMessage = useMemo(() => {
      if (search.trim()) return `No ${config.plural} match "${search.trim()}".`;
      if (statusFilter !== "all") return `No ${statusFilter} ${config.plural} found.`;
      return `No ${config.plural} yet. Add the first ${config.singular} to use it on packages.`;
    }, [search, statusFilter, config.plural, config.singular]);

    function openCreate() {
      setEditing(null);
      setViewing(null);
      setFormMode("create");
    }

    useImperativeHandle(ref, () => ({ openCreate }), []);

    function closeForm() {
      if (isSaving) return;
      setFormMode(null);
      setEditing(null);
    }

    async function handleSubmit(data: CreatePackageCatalogFormValues) {
      setIsSaving(true);
      setError(null);
      try {
        const payload = {
          ...data,
          description: data.description || null,
          display_order: Number.isFinite(data.display_order) ? data.display_order : 0,
        };
        if (formMode === "edit" && editing) {
          const { item } = await updatePackageCatalog(kind, editing.id, payload);
          setItems((prev) => prev.map((row) => (row.id === item.id ? item : row)));
        } else {
          await createPackageCatalog(kind, payload);
          setPage(1);
          await loadItems();
        }
        setFormMode(null);
        setEditing(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : `Failed to save ${config.singular}`);
      } finally {
        setIsSaving(false);
      }
    }

    async function handleDelete(item: PackageCatalogRecord) {
      if (!window.confirm(`Delete "${item.name}"? Packages that already use this name keep the saved value.`)) {
        return;
      }
      setDeletingId(item.id);
      try {
        await deletePackageCatalog(kind, item.id);
        setItems((prev) => prev.filter((row) => row.id !== item.id));
        setTotal((value) => Math.max(0, value - 1));
      } catch (err) {
        window.alert(err instanceof Error ? err.message : `Failed to delete ${config.singular}`);
      } finally {
        setDeletingId(null);
      }
    }

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <div className="flex items-center gap-3 rounded-xl border border-[#E8ECF0] bg-white px-4 py-3.5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${GOLD}14`, color: GOLD }}>
              <Icon name={kind === "type" ? "Tags" : "Star"} size={18} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total</p>
              <p className="text-xl font-semibold text-[#1F2A44]">{loading ? "—" : total}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-[#E8ECF0] bg-white px-4 py-3.5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Icon name="CheckCircle" size={18} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Active on this page</p>
              <p className="text-xl font-semibold text-[#1F2A44]">{loading ? "—" : activeCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E8ECF0] bg-white shadow-sm overflow-hidden">
          <div className="flex flex-col gap-3 px-4 py-4 border-b border-[#E8ECF0] bg-gradient-to-r from-[#FFFCF7] via-white to-white sm:flex-row sm:items-center">
            <div className="relative flex-1 min-w-0">
              <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <Input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder={`Search ${config.plural}…`}
                className={`w-full pl-9 pr-3 ${filterControlClass}`}
              />
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <NativeSelect
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as PackageCatalogStatusFilter);
                  setPage(1);
                }}
                wrapperClassName="w-auto shrink-0"
                className={`min-w-[130px] px-3 pr-9 ${filterControlClass}`}
              >
                {PACKAGE_CATALOG_STATUS_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect>
              <NativeSelect
                value={sort}
                onChange={(event) => setSort(event.target.value as "display_order" | "created_at")}
                wrapperClassName="w-auto shrink-0"
                className={`min-w-[150px] px-3 pr-9 ${filterControlClass}`}
              >
                {PACKAGE_CATALOG_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    Sort: {option.label}
                  </option>
                ))}
              </NativeSelect>
              <NativeSelect
                value={order}
                onChange={(event) => setOrder(event.target.value as "asc" | "desc")}
                wrapperClassName="w-auto shrink-0"
                className={`min-w-[120px] px-3 pr-9 ${filterControlClass}`}
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </NativeSelect>
            </div>
          </div>

          {error && (
            <div className="mx-4 mt-4 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              <Icon name="AlertCircle" size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="px-4 py-3 border-b border-[#F1F5F9] bg-[#FAFBFC]">
            <p className="text-xs text-gray-500">
              {loading
                ? `Loading ${config.plural}…`
                : total > 0
                  ? `Showing ${items.length} of ${total} ${config.plural}`
                  : `No ${config.plural} to display`}
            </p>
          </div>

          {loading ? (
            <div className="divide-y divide-[#F1F5F9]">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center gap-4 px-4 py-4">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="ml-auto h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm text-gray-500">{emptyMessage}</p>
              <Button
                type="button"
                onClick={openCreate}
                className="mt-4 h-10 px-4 rounded-lg bg-[#B48A2C] text-sm font-semibold text-white hover:bg-[#B48A2C]/90"
              >
                {config.addLabel}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#FAFBFC] text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Slug</th>
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Updated</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {items.map((item) => (
                    <tr key={item.id} className="text-[#1F2A44]">
                      <td className="px-4 py-3 font-medium">{item.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.slug}</td>
                      <td className="px-4 py-3">{item.display_order}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
                            item.status === "active"
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                              : "bg-gray-100 text-gray-600 ring-gray-500/10"
                          }`}
                        >
                          {item.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatPackageDateTime(item.updated_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setViewing(item)}
                            className="inline-flex size-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#A68231] hover:bg-[#FFFCF7]"
                            title="View"
                          >
                            <Icon name="Eye" size={15} />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setEditing(item);
                              setViewing(null);
                              setFormMode("edit");
                            }}
                            className="inline-flex size-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#A68231] hover:bg-[#FFFCF7]"
                            title="Edit"
                          >
                            <Icon name="Pencil" size={15} />
                          </Button>
                          {canDelete && (
                            <Button
                              type="button"
                              variant="ghost"
                              disabled={deletingId === item.id}
                              onClick={() => void handleDelete(item)}
                              className="inline-flex size-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                              title="Delete"
                            >
                              <Icon name="Trash2" size={15} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-[#E8ECF0] bg-[#FAFBFC]">
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((value) => value - 1)}
                  className="h-9 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                >
                  <Icon name="ChevronLeft" size={16} className="mr-1" />
                  Previous
                </Button>
                <Button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((value) => value + 1)}
                  className="h-9 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                >
                  Next
                  <Icon name="ChevronRight" size={16} className="ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {formMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <button type="button" className="absolute inset-0 bg-[#1F2A44]/55 backdrop-blur-[3px]" aria-label="Close" onClick={closeForm} />
            <div role="dialog" aria-modal="true" className="relative flex w-full max-w-2xl max-h-[min(90vh,720px)] flex-col overflow-hidden rounded-2xl border border-[#E8ECF0] bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-[#E8ECF0] bg-gradient-to-r from-[#FFFCF7] via-white to-white px-6 py-5">
                <div>
                  <h2 className="text-lg font-semibold text-[#1F2A44]">
                    {formMode === "edit" ? `Edit ${titleCase(config.singular)}` : `Create ${titleCase(config.singular)}`}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">{config.description}</p>
                </div>
                <Button type="button" onClick={closeForm} disabled={isSaving} className="size-9 rounded-lg border border-[#E5E7EB] bg-white text-gray-400" aria-label="Close">
                  <Icon name="X" size={18} />
                </Button>
              </div>
              <div className="overflow-y-auto p-6">
                <CatalogForm
                  kind={kind}
                  initialData={editing}
                  isSaving={isSaving}
                  onSubmit={handleSubmit}
                  onCancel={closeForm}
                />
              </div>
            </div>
          </div>
        )}

        {viewing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button type="button" className="absolute inset-0 bg-[#1F2A44]/55" aria-label="Close" onClick={() => setViewing(null)} />
            <div role="dialog" aria-modal="true" className="relative w-full max-w-lg rounded-2xl border border-[#E8ECF0] bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-[#1F2A44]">{viewing.name}</h2>
                  <p className="mt-1 font-mono text-xs text-gray-500">{viewing.slug}</p>
                </div>
                <Button type="button" onClick={() => setViewing(null)} className="size-9 rounded-lg border border-[#E5E7EB] bg-white text-gray-400" aria-label="Close">
                  <Icon name="X" size={18} />
                </Button>
              </div>
              <dl className="mt-5 space-y-3 text-sm">
                <div>
                  <dt className="text-gray-500">Status</dt>
                  <dd className="font-medium text-[#1F2A44]">{viewing.status === "active" ? "Active" : "Inactive"}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Display order</dt>
                  <dd className="font-medium text-[#1F2A44]">{viewing.display_order}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Description</dt>
                  <dd className="text-[#1F2A44]">{viewing.description || "—"}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Updated</dt>
                  <dd className="text-[#1F2A44]">{formatPackageDateTime(viewing.updated_at)}</dd>
                </div>
              </dl>
              <div className="mt-6 flex justify-end">
                <Button
                  type="button"
                  onClick={() => {
                    setEditing(viewing);
                    setViewing(null);
                    setFormMode("edit");
                  }}
                  className="h-10 px-4 rounded-lg bg-[#B48A2C] text-sm font-semibold text-white"
                >
                  Edit
                </Button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }
);
