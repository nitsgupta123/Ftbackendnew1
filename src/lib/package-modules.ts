import type { PackageStatus } from "./package-types";

export interface PackageModuleConfig {
  slug: string;
  title: string;
  description: string;
  breadcrumbs: { label: string; href?: string }[];
  status?: PackageStatus;
  endpoint?: "list" | "tbl-list" | "expiring-rates" | "supplier-quotes" | "guide" | "categories" | "types" | "themes" | "pricing-rules" | "templates";
}

export const PACKAGE_MODULES: Record<string, PackageModuleConfig> = {
  dashboard: {
    slug: "dashboard",
    title: "Package Dashboard",
    description: "Overview of package pipeline, status counts, and recent activity.",
    breadcrumbs: [
      { label: "Dashboard", href: "/" },
      { label: "Packages", href: "/packages" },
      { label: "Package Dashboard" },
    ],
    endpoint: "list",
  },
  all: {
    slug: "all",
    title: "All Packages",
    description: "Browse wizard packages and legacy catalogue from the API.",
    breadcrumbs: [
      { label: "Dashboard", href: "/" },
      { label: "Package Dashboard", href: "/packages" },
      { label: "All Packages" },
    ],
    endpoint: "tbl-list",
  },
  drafts: {
    slug: "drafts",
    title: "Draft Packages",
    description: "Packages still being built across the 14-step wizard.",
    breadcrumbs: [
      { label: "Dashboard", href: "/" },
      { label: "Package Dashboard", href: "/packages" },
      { label: "Draft Packages" },
    ],
    status: "draft",
    endpoint: "list",
  },
  "pending-review": {
    slug: "pending-review",
    title: "Pending Reviews",
    description: "Packages submitted and waiting for final approval.",
    breadcrumbs: [
      { label: "Dashboard", href: "/" },
      { label: "Package Dashboard", href: "/packages" },
      { label: "Pending Reviews" },
    ],
    status: "pending_review",
    endpoint: "list",
  },
  "expiring-rates": {
    slug: "expiring-rates",
    title: "Expiring Rates",
    description: "Supplier rates expiring within the next 30 days.",
    breadcrumbs: [
      { label: "Dashboard", href: "/" },
      { label: "Package Dashboard", href: "/packages" },
      { label: "Expiring Rates" },
    ],
    endpoint: "expiring-rates",
  },
  "supplier-quotes": {
    slug: "supplier-quotes",
    title: "Supplier Quote Requests",
    description: "Packages with supplier quote tool data saved.",
    breadcrumbs: [
      { label: "Dashboard", href: "/" },
      { label: "Package Dashboard", href: "/packages" },
      { label: "Supplier Quote Requests" },
    ],
    endpoint: "supplier-quotes",
  },
  categories: {
    slug: "categories",
    title: "Package Categories",
    description: "Organize travel packages into categories for landing pages and merchandising.",
    breadcrumbs: [
      { label: "Dashboard", href: "/" },
      { label: "Package Dashboard", href: "/packages" },
      { label: "Package Categories" },
    ],
    endpoint: "categories",
  },
  types: {
    slug: "types",
    title: "Package Type",
    description: "Tour types used on Package Basics, such as Leisure, Safari, and Cruise.",
    breadcrumbs: [
      { label: "Dashboard", href: "/" },
      { label: "Package Dashboard", href: "/packages" },
      { label: "Package Type" },
    ],
    endpoint: "types",
  },
  themes: {
    slug: "themes",
    title: "Package Themes",
    description: "Merchandising themes for packages, separate from categories and landing pages.",
    breadcrumbs: [
      { label: "Dashboard", href: "/" },
      { label: "Package Dashboard", href: "/packages" },
      { label: "Package Themes" },
    ],
    endpoint: "themes",
  },
  "pricing-rules": {
    slug: "pricing-rules",
    title: "Pricing Rules",
    description: "Global markup, exchange rate, and finance approval rules.",
    breadcrumbs: [
      { label: "Dashboard", href: "/" },
      { label: "Package Dashboard", href: "/packages" },
      { label: "Pricing Rules" },
    ],
    endpoint: "pricing-rules",
  },
  templates: {
    slug: "templates",
    title: "Package Templates",
    description: "Reusable package skeletons for faster product uploads.",
    breadcrumbs: [
      { label: "Dashboard", href: "/" },
      { label: "Package Dashboard", href: "/packages" },
      { label: "Package Templates" },
    ],
    endpoint: "templates",
  },
  guide: {
    slug: "guide",
    title: "Package Guide",
    description: "Internal guides for pricing, images, slugs, and SEO.",
    breadcrumbs: [
      { label: "Dashboard", href: "/" },
      { label: "Package Dashboard", href: "/packages" },
      { label: "Package Guide" },
    ],
    endpoint: "guide",
  },
  archived: {
    slug: "archived",
    title: "Archived Packages",
    description: "Packages removed from active sales but kept for reference.",
    breadcrumbs: [
      { label: "Dashboard", href: "/" },
      { label: "Package Dashboard", href: "/packages" },
      { label: "Archived Packages" },
    ],
    status: "archived",
    endpoint: "list",
  },
};

export const PACKAGE_MODULE_SLUGS = Object.keys(PACKAGE_MODULES);
