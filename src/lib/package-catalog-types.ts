export type PackageCatalogKind = "type" | "theme";
export type PackageCatalogStatus = "active" | "inactive";

export interface PackageCatalogRecord {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
  status: PackageCatalogStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePackageCatalogInput {
  name: string;
  slug?: string;
  description?: string | null;
  display_order?: number;
  status?: PackageCatalogStatus;
}

export interface UpdatePackageCatalogInput {
  name?: string;
  slug?: string;
  description?: string | null;
  display_order?: number;
  status?: PackageCatalogStatus;
}

export interface ListPackageCatalogParams {
  search?: string;
  status?: PackageCatalogStatus | "all";
  sort?: "display_order" | "created_at";
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
  activeOnly?: boolean;
}

export interface ListPackageCatalogResult {
  items: PackageCatalogRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const PACKAGE_CATALOG_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

export type PackageCatalogStatusFilter =
  (typeof PACKAGE_CATALOG_STATUS_FILTER_OPTIONS)[number]["value"];

export const PACKAGE_CATALOG_SORT_OPTIONS = [
  { value: "display_order", label: "Display order" },
  { value: "created_at", label: "Created date" },
] as const;

export const PACKAGE_CATALOG_CONFIG = {
  type: {
    kind: "type" as const,
    table: "package_types",
    apiPath: "/api/package-types",
    permissionKey: "package_types",
    singular: "package type",
    plural: "package types",
    title: "Package Type",
    addLabel: "Add Package Type",
    description: "Tour types used on Package Basics, such as Leisure, Safari, and Cruise.",
  },
  theme: {
    kind: "theme" as const,
    table: "package_themes",
    apiPath: "/api/package-themes",
    permissionKey: "package_themes",
    singular: "package theme",
    plural: "package themes",
    title: "Package Themes",
    addLabel: "Add Package Theme",
    description: "Merchandising themes for packages, separate from categories and landing pages.",
  },
} as const;
