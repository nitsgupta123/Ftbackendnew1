"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AdminShell from "@/components/layout/AdminShell";
import ListPageHeader from "@/components/layout/ListPageHeader";
import PackageListTable from "@/components/packages/PackageListTable";
import PackageCategoriesPanel, {
  type PackageCategoriesPanelHandle,
} from "@/components/categories/PackageCategoriesPanel";
import PackageCatalogPanel, {
  type PackageCatalogPanelHandle,
} from "@/components/package-catalog/PackageCatalogPanel";
import PricingRulesPanel, {
  type PricingRulesPanelHandle,
} from "@/components/pricing-rules/PricingRulesPanel";
import PackageTemplatesPanel from "@/components/templates/PackageTemplatesPanel";
import { Icon } from "@/components/ui/icons";
import { GUIDE_ITEMS } from "@/lib/constants";
import { isSamePackageRecord, listAllPackages, listExpiringPackages, listPackages, listSupplierQuoteRequests } from "@/lib/package-api";
import { PACKAGE_MODULES } from "@/lib/package-modules";
import { PACKAGE_STATUS_FILTER_OPTIONS, packageAllPackagesHref, parsePackageStatusFilter, type PackageRecord, type PackageStatusFilter } from "@/lib/package-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

const PAGE_SIZE = 10;

function packageModuleIcon(slug: string, endpoint?: string): string {
  if (endpoint === "categories") return "Tags";
  if (endpoint === "types") return "Tags";
  if (endpoint === "themes") return "Star";
  if (endpoint === "pricing-rules") return "Calculator";
  if (endpoint === "templates") return "FileStack";
  if (endpoint === "guide") return "HelpCircle";
  if (endpoint === "expiring-rates") return "Clock";
  if (endpoint === "supplier-quotes") return "Building";
  if (slug === "pending-review") return "Eye";
  if (slug === "drafts") return "Pencil";
  if (slug === "archived") return "Archive";
  return "Package";
}
function filterPackages(packages: PackageRecord[], search: string, statusFilter: PackageStatusFilter): PackageRecord[] {
  const query = search.trim().toLowerCase();
  let result = packages;
  if (statusFilter === "all") {
    result = result.filter(pkg => pkg.status !== "deleted");
  } else {
    result = result.filter(pkg => pkg.status === statusFilter);
  }
  if (query) {
    result = result.filter(pkg => {
      const title = pkg.package_title?.toLowerCase() ?? "";
      const slug = pkg.slug?.toLowerCase() ?? "";
      const id = String(pkg.id);
      return title.includes(query) || slug.includes(query) || id.includes(query);
    });
  }
  return [...result].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}
export default function PackageModulePage({
  params
}: {
  params: Promise<{
    module: string;
  }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoriesRef = useRef<PackageCategoriesPanelHandle>(null);
  const typesRef = useRef<PackageCatalogPanelHandle>(null);
  const themesRef = useRef<PackageCatalogPanelHandle>(null);
  const pricingRulesRef = useRef<PricingRulesPanelHandle>(null);
  const [moduleSlug, setModuleSlug] = useState<string | null>(null);
  const [packages, setPackages] = useState<PackageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PackageStatusFilter>("all");
  const [page, setPage] = useState(1);
  const config = moduleSlug ? PACKAGE_MODULES[moduleSlug] : null;
  const displayedPackages = useMemo(() => {
    if (config?.endpoint !== "tbl-list") return packages;
    return filterPackages(packages, search, statusFilter);
  }, [packages, search, statusFilter, config?.endpoint]);
  const listPackagesForTable =
    config?.endpoint === "tbl-list" ? displayedPackages : packages;
  const totalPages = Math.max(1, Math.ceil(listPackagesForTable.length / PAGE_SIZE));
  const pagedPackages = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return listPackagesForTable.slice(start, start + PAGE_SIZE);
  }, [listPackagesForTable, page]);
  useEffect(() => {
    params.then(p => {
      if (p.module === "dashboard") {
        router.replace("/packages");
        return;
      }
      setModuleSlug(p.module);
    });
  }, [params, router]);
  useEffect(() => {
    if (config?.endpoint !== "tbl-list") return;
    queueMicrotask(() => {
      setStatusFilter(parsePackageStatusFilter(searchParams.get("status")));
      setSearch(searchParams.get("search") ?? "");
      setPage(1);
    });
  }, [searchParams, config?.endpoint]);
  useEffect(() => {
    setPage(1);
  }, [moduleSlug]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  useEffect(() => {
    if (!config || config.slug === "dashboard") return;
    async function load() {
      if (!config) return;
      setLoading(true);
      setError(null);
      try {
        if (config.endpoint === "tbl-list") {
          const res = await listAllPackages();
          setPackages(res.packages);
        } else if (config.endpoint === "expiring-rates") {
          const res = await listExpiringPackages();
          setPackages(res.packages);
        } else if (config.endpoint === "supplier-quotes") {
          const res = await listSupplierQuoteRequests();
          setPackages(res.packages);
        } else if (config.endpoint === "list" && config.status) {
          const res = await listPackages(config.status);
          setPackages(res.packages);
        } else if (config.endpoint === "list") {
          const res = await listPackages();
          setPackages(res.packages);
        } else {
          setPackages([]);
        }
        setPage(1);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load packages");
      } finally {
        setLoading(false);
      }
    }
    if (config && config.endpoint !== "guide") {
      load();
    } else {
      queueMicrotask(() => setLoading(false));
    }
  }, [config]);
  if (moduleSlug && !config) {
    return <AdminShell breadcrumbs={[{
      label: "Packages",
      href: "/packages"
    }, {
      label: "Not found"
    }]}>
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-8 text-center text-sm text-gray-500">
          Package module not found.
        </div>
      </AdminShell>;
  }
  if (!config) {
    return null;
  }
  if (config.slug === "dashboard") {
    return null;
  }

  const headerAction =
    config.endpoint === "list" || config.endpoint === "tbl-list"
      ? { label: "Add Package", href: "/add-package" }
      : config.endpoint === "categories"
        ? {
            label: "Add Category",
            onClick: () => categoriesRef.current?.openCreate(),
          }
        : config.endpoint === "types"
          ? {
              label: "Add Package Type",
              onClick: () => typesRef.current?.openCreate(),
            }
          : config.endpoint === "themes"
            ? {
                label: "Add Package Theme",
                onClick: () => themesRef.current?.openCreate(),
              }
        : config.endpoint === "pricing-rules"
          ? {
              label: "Add Pricing Rule",
              onClick: () => pricingRulesRef.current?.openCreate(),
            }
          : undefined;

  return <AdminShell breadcrumbs={config.breadcrumbs}>
      <ListPageHeader
        icon={packageModuleIcon(config.slug, config.endpoint)}
        title={config.title}
        description={config.description}
        action={headerAction}
        back={{ href: "/packages", label: "Back to Package Dashboard" }}
      />

      {config.endpoint === "tbl-list" && <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          
            <Input type="search" value={search} onChange={e => {
          setSearch(e.target.value);
          setPage(1);
        }} placeholder="Search packages by name, slug, or ID..." className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#E5E7EB] bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/30 focus:border-[#B48A2C]" />
          
          </div>
          <div className="flex items-center gap-2 sm:shrink-0">
            <Label htmlFor="package-status" className="text-sm text-gray-500 whitespace-nowrap">
              Status
            </Label>
            <NativeSelect id="package-status" value={statusFilter} onChange={e => {
          const next = e.target.value as PackageStatusFilter;
          setStatusFilter(next);
          setPage(1);
          router.replace(packageAllPackagesHref(next), {
            scroll: false
          });
        }} className="h-10 min-w-[150px] px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/30 focus:border-[#B48A2C]">
            
              {PACKAGE_STATUS_FILTER_OPTIONS.map(option => <option key={option.value} value={option.value}>
                  {option.label}
                </option>)}
            </NativeSelect>
          </div>
          {!loading && listPackagesForTable.length > 0 && <p className="text-xs text-gray-400 sm:ml-auto">
              Showing {pagedPackages.length} of {listPackagesForTable.length} packages
            </p>}
        </div>}

      {error && <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 text-red-700 border border-red-100 text-sm">
          {error}
        </div>}

      {config.endpoint === "guide" && <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {GUIDE_ITEMS.map(item => <div key={item.title} className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-sm">
          
              <h3 className="text-base font-bold text-[#1F2A44]">{item.title}</h3>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">{item.description}</p>
            </div>)}
        </div>}

      {(config.slug === "templates") && <PackageTemplatesPanel />}

      {config.endpoint === "categories" && <PackageCategoriesPanel ref={categoriesRef} />}

      {config.endpoint === "types" && <PackageCatalogPanel ref={typesRef} kind="type" />}

      {config.endpoint === "themes" && <PackageCatalogPanel ref={themesRef} kind="theme" />}

      {config.endpoint === "pricing-rules" && <PricingRulesPanel ref={pricingRulesRef} />}

      {(config.endpoint === "list" || config.endpoint === "tbl-list") && <>
          {(config.endpoint === "list" && !loading && listPackagesForTable.length > 0) && <p className="mb-3 text-xs text-gray-400">
              Showing {pagedPackages.length} of {listPackagesForTable.length} packages
            </p>}
          <PackageListTable packages={pagedPackages} loading={loading} showSupplier fullActions={config.endpoint === "tbl-list"} onPackageRemoved={removed => {
          setPackages(prev => prev.filter(pkg => !isSamePackageRecord(pkg, removed)));
        }} onPackageUpdated={updated => setPackages(prev => prev.map(pkg => isSamePackageRecord(pkg, updated) ? updated : pkg))} emptyMessage={config.endpoint === "tbl-list" && search.trim() ? `No packages match "${search.trim()}".` : config.endpoint === "tbl-list" && statusFilter !== "all" ? `No ${PACKAGE_STATUS_FILTER_OPTIONS.find(o => o.value === statusFilter)?.label.toLowerCase() ?? statusFilter} packages found.` : `No packages found for ${config.title.toLowerCase()}.`} />
          {totalPages > 1 && <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#E8ECF0] bg-[#FAFBFC] px-4 py-3">
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button type="button" disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)} className="h-9 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 shadow-sm">
                  <Icon name="ChevronLeft" size={16} className="mr-1" />
                  Previous
                </Button>
                <Button type="button" disabled={page >= totalPages || loading} onClick={() => setPage(p => p + 1)} className="h-9 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 shadow-sm">
                  Next
                  <Icon name="ChevronRight" size={16} className="ml-1" />
                </Button>
              </div>
            </div>}
        </>}

      {config.endpoint === "expiring-rates" && <PackageListTable packages={packages} loading={loading} showSupplier showValidity emptyMessage="No packages with rates expiring in the next 30 days." />}

      {config.endpoint === "supplier-quotes" && <PackageListTable packages={packages} loading={loading} showSupplier emptyMessage="No supplier quote requests saved yet." />}
    </AdminShell>;
}
