import type { AdminRole } from "./auth-types";

export type PermissionAction = "view" | "edit" | "delete";

export type AccessModuleGroup = "panel" | "package_builder";

export interface AccessModuleDefinition {
  key: string;
  label: string;
  description: string;
  icon: string;
  group: AccessModuleGroup;
  sortOrder: number;
}

export interface ModulePermission {
  moduleKey: string;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface RolePermissionMatrix {
  role: AdminRole;
  permissions: ModulePermission[];
}

export interface PermissionsPayload {
  modules: AccessModuleDefinition[];
  matrices: RolePermissionMatrix[];
}

export interface UpdateRolePermissionsInput {
  permissions: ModulePermission[];
}

/** Catalog of all access-controlled modules. Add new entries here for future modules. */
export const ACCESS_MODULES: AccessModuleDefinition[] = [
  // Admin panel
  {
    key: "dashboard",
    label: "Dashboard",
    description: "Overview, stats, and recent activity",
    icon: "LayoutDashboard",
    group: "panel",
    sortOrder: 10,
  },
  {
    key: "blogs",
    label: "Blogs",
    description: "Blog posts and drafting workflow",
    icon: "FileText",
    group: "panel",
    sortOrder: 20,
  },
  {
    key: "blog_categories",
    label: "Blog Categories",
    description: "Blog category management",
    icon: "Tags",
    group: "panel",
    sortOrder: 25,
  },
  {
    key: "pages",
    label: "Pages",
    description: "CMS pages and content",
    icon: "FileStack",
    group: "panel",
    sortOrder: 30,
  },
  {
    key: "packages",
    label: "Packages",
    description: "Package list, drafts, and publishing hub",
    icon: "Package",
    group: "panel",
    sortOrder: 40,
  },
  {
    key: "package_categories",
    label: "Package Categories",
    description: "Catalog categories for packages",
    icon: "FolderTree",
    group: "panel",
    sortOrder: 45,
  },
  {
    key: "package_types",
    label: "Package Type",
    description: "Tour types used on package basics",
    icon: "Tags",
    group: "panel",
    sortOrder: 46,
  },
  {
    key: "package_themes",
    label: "Package Themes",
    description: "Merchandising themes for packages",
    icon: "Star",
    group: "panel",
    sortOrder: 46.5,
  },
  {
    key: "suppliers",
    label: "Suppliers",
    description: "Supplier contacts and source management",
    icon: "Users",
    group: "panel",
    sortOrder: 47,
  },
  {
    key: "pricing_rules",
    label: "Pricing Rules",
    description: "Global pricing rule configuration",
    icon: "Percent",
    group: "panel",
    sortOrder: 50,
  },
  {
    key: "package_templates",
    label: "Package Templates",
    description: "Reusable package templates",
    icon: "Copy",
    group: "panel",
    sortOrder: 55,
  },
  {
    key: "media",
    label: "Media",
    description: "Uploads and media library",
    icon: "Image",
    group: "panel",
    sortOrder: 60,
  },
  {
    key: "enquiries",
    label: "Enquiries",
    description: "Lead and enquiry management",
    icon: "MessageSquare",
    group: "panel",
    sortOrder: 70,
  },
  {
    key: "settings",
    label: "Settings",
    description: "General site configuration",
    icon: "Settings",
    group: "panel",
    sortOrder: 80,
  },
  {
    key: "users",
    label: "User Management",
    description: "Create and manage staff accounts",
    icon: "UserCog",
    group: "panel",
    sortOrder: 90,
  },
  {
    key: "roles",
    label: "Roles & Permissions",
    description: "Permission matrix and role access",
    icon: "Shield",
    group: "panel",
    sortOrder: 100,
  },

  // Package builder (add-package steps)
  {
    key: "supplier_source",
    label: "Supplier Source",
    description: "Package supplier and source details",
    icon: "Truck",
    group: "package_builder",
    sortOrder: 110,
  },
  {
    key: "package_basics",
    label: "Package Basics",
    description: "Title, destination, duration, and core info",
    icon: "FileStack",
    group: "package_builder",
    sortOrder: 120,
  },
  {
    key: "media_frontend",
    label: "Media & Front-End",
    description: "Package images and front-end media",
    icon: "Image",
    group: "package_builder",
    sortOrder: 130,
  },
  {
    key: "pricing",
    label: "Pricing",
    description: "Package rates, margins, and seasons",
    icon: "DollarSign",
    group: "package_builder",
    sortOrder: 140,
  },
  {
    key: "itinerary",
    label: "Itinerary",
    description: "Day-by-day itinerary content",
    icon: "Map",
    group: "package_builder",
    sortOrder: 150,
  },
  {
    key: "hotels",
    label: "Hotels",
    description: "Hotel allocations and stay details",
    icon: "Building",
    group: "package_builder",
    sortOrder: 160,
  },
  {
    key: "inclusions",
    label: "Inclusions",
    description: "What is included in the package",
    icon: "CheckCircle",
    group: "package_builder",
    sortOrder: 170,
  },
  {
    key: "exclusions",
    label: "Exclusions",
    description: "What is excluded from the package",
    icon: "XCircle",
    group: "package_builder",
    sortOrder: 175,
  },
  {
    key: "booking_policy",
    label: "Booking Policy",
    description: "Cancellation, payment, and booking rules",
    icon: "Shield",
    group: "package_builder",
    sortOrder: 180,
  },
  {
    key: "consultant_view",
    label: "Consultant View",
    description: "Sales consultant package view",
    icon: "Eye",
    group: "package_builder",
    sortOrder: 190,
  },
  {
    key: "supplier_quote_tool",
    label: "Supplier Quote Tool",
    description: "Supplier quote requests and tooling",
    icon: "Calculator",
    group: "package_builder",
    sortOrder: 200,
  },
  {
    key: "frontend_faqs",
    label: "Front-End FAQs",
    description: "Customer-facing FAQ content",
    icon: "HelpCircle",
    group: "package_builder",
    sortOrder: 210,
  },
  {
    key: "sales_ads_assets",
    label: "Sales & Ads Assets",
    description: "Marketing and sales collateral",
    icon: "Megaphone",
    group: "package_builder",
    sortOrder: 220,
  },
  {
    key: "seo",
    label: "SEO",
    description: "Search metadata and SEO fields",
    icon: "Search",
    group: "package_builder",
    sortOrder: 230,
  },
  {
    key: "review_publish",
    label: "Review & Publish",
    description: "Final review and publish controls",
    icon: "CheckCheck",
    group: "package_builder",
    sortOrder: 240,
  },
];

export const ACCESS_MODULE_KEYS = ACCESS_MODULES.map((m) => m.key);

export const ACCESS_MODULE_BY_KEY: Record<string, AccessModuleDefinition> =
  Object.fromEntries(ACCESS_MODULES.map((m) => [m.key, m]));

/** Map primary nav hrefs to permission module keys. */
export const NAV_HREF_MODULE: Record<string, string> = {
  "/": "dashboard",
  "/settings/general": "settings",
  "/settings/role-management": "roles",
  "/settings/roles": "roles",
  "/user-management": "users",
  "/blogs/all": "blogs",
  "/blogs/new": "blogs",
  "/blogs/drafts": "blogs",
  "/blogs/pending-review": "blogs",
  "/blogs/scheduled": "blogs",
  "/blogs/published": "blogs",
  "/blogs/categories": "blog_categories",
  "/pages/all": "pages",
  "/pages/new": "pages",
  "/pages/drafts": "pages",
  "/pages/published": "pages",
  "/packages": "packages",
  "/packages/all": "packages",
  "/packages/drafts": "packages",
  "/packages/pending-review": "packages",
  "/packages/expiring-rates": "packages",
  "/packages/supplier-quotes": "supplier_quote_tool",
  "/packages/categories": "package_categories",
  "/packages/types": "package_types",
  "/packages/themes": "package_themes",
  "/suppliers": "suppliers",
  "/packages/pricing-rules": "pricing_rules",
  "/add-package": "packages",
  "/enquiry": "enquiries",
};

/** Map add-package step numbers to permission keys. */
export const PACKAGE_STEP_PERMISSION_KEYS: Record<number, string> = {
  1: "supplier_source",
  2: "package_basics",
  3: "media_frontend",
  4: "pricing",
  5: "itinerary",
  6: "hotels",
  7: "inclusions",
  8: "booking_policy",
  9: "consultant_view",
  10: "supplier_quote_tool",
  11: "frontend_faqs",
  12: "sales_ads_assets",
  13: "seo",
  14: "review_publish",
};

export function defaultPermissionForRole(
  role: AdminRole,
  moduleKey: string
): ModulePermission {
  if (role === "super_admin") {
    return {
      moduleKey,
      canView: true,
      canEdit: true,
      canDelete: true,
    };
  }

  // Admin defaults mirror current panel behaviour.
  if (moduleKey === "users" || moduleKey === "roles") {
    return {
      moduleKey,
      canView: false,
      canEdit: false,
      canDelete: false,
    };
  }

  return {
    moduleKey,
    canView: true,
    canEdit: true,
    canDelete: false,
  };
}

export function buildDefaultMatrix(role: AdminRole): RolePermissionMatrix {
  return {
    role,
    permissions: ACCESS_MODULES.map((mod) =>
      defaultPermissionForRole(role, mod.key)
    ),
  };
}

export function hasModulePermission(
  permissions: ModulePermission[] | undefined,
  moduleKey: string,
  action: PermissionAction
): boolean {
  if (!permissions?.length) return false;
  const row = permissions.find((p) => p.moduleKey === moduleKey);
  if (!row) return false;
  if (action === "view") return row.canView;
  if (action === "edit") return row.canEdit;
  return row.canDelete;
}
