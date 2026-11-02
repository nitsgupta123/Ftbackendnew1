import { NavItem, Step } from "./types";

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: "LayoutDashboard", href: "/" },
  {
    label: "Settings",
    icon: "Settings",
    children: [
      { label: "General", href: "/settings/general" },
      { label: "User Management", href: "/user-management" },
      { label: "Role Management", href: "/settings/role-management" },
      { label: "Access Control", href: "/settings/roles" },
    ],
  },
  { label: "Blogs Management", icon: "FileText", href: "/blogs/all", children: [
      { label: "All Posts", href: "/blogs/all" },
      { label: "Write New Blog", href: "/blogs/new" },
      { label: "Drafts", href: "/blogs/drafts" },
      { label: "Pending Review", href: "/blogs/pending-review" },
      { label: "Scheduled", href: "/blogs/scheduled" },
      { label: "Published", href: "/blogs/published" },
      { label: "Blog Categories", href: "/blogs/categories" },
    ] },
  { label: "Page Management", icon: "FileStack", href: "/pages/all", children: [
      { label: "All Pages", href: "/pages/all" },
      { label: "Create Page", href: "/pages/new" },
      { label: "Drafts", href: "/pages/drafts" },
      { label: "Published", href: "/pages/published" },
    ] },
  {
    label: "Packages",
    icon: "Package",
    children: [
      {
        label: "Package Dashboard",
        href: "/packages",
        children: [
          { label: "All Packages", href: "/packages/all" },
          { label: "Draft Packages", href: "/packages/drafts" },
          { label: "Pending Reviews", href: "/packages/pending-review" },
          { label: "Expiring Rates", href: "/packages/expiring-rates" },
        ],
      },
      { label: "Add Package", href: "/add-package" },
      { label: "Supplier Quote Requests", href: "/packages/supplier-quotes" },
      {
        label: "Settings",
        children: [
          { label: "Package Categories", href: "/packages/categories" },
          { label: "Package Type", href: "/packages/types" },
          { label: "Package Themes", href: "/packages/themes" },
          { label: "Pricing Rules", href: "/packages/pricing-rules" },
        ],
      },
    ],
  },
  { label: "Suppliers", icon: "Users", href: "/suppliers" },
  { label: "Promotions", icon: "Percent", href: "/promotions" },
  { label: "Enquiry", icon: "MessageSquare", href: "/enquiry" },
];

export const STEPS: Step[] = [
  { number: 1, title: "Supplier Source", department: "Product", icon: "Truck" },
  { number: 2, title: "Package Basics", department: "Product", icon: "FileStack" },
  { number: 3, title: "Media & Front-End", department: "Product + Marketing", icon: "Image" },
  { number: 4, title: "Pricing", department: "Product + Finance", icon: "DollarSign" },
  { number: 5, title: "Itinerary", department: "Product", icon: "Map" },
  { number: 6, title: "Hotels", department: "Product + Ops", icon: "Building" },
  { number: 7, title: "Inclusions", department: "Product", icon: "CheckCircle" },
  { number: 8, title: "Booking Policy", department: "Ops + Finance", icon: "Shield" },
  { number: 9, title: "Consultant View", department: "Sales Lead", icon: "Eye" },
  { number: 10, title: "Supplier Quote Tool", department: "Consultants", icon: "Calculator" },
  { number: 11, title: "Front-End FAQs", department: "Product + SEO", icon: "HelpCircle" },
  { number: 12, title: "Sales & Ads Assets", department: "Marketing + Sales", icon: "Megaphone" },
  { number: 13, title: "SEO", department: "SEO Team", icon: "Search" },
  { number: 14, title: "Review & Publish", department: "Final Approver", icon: "CheckCheck" },
];

export const GUIDE_ITEMS = [
  {
    title: "Pricing Guide",
    description: "Learn how to set competitive pricing with proper margins and seasonal adjustments.",
  },
  {
    title: "Image Rules",
    description: "Minimum 1200px width, 16:9 ratio preferred. No watermarks or text overlays.",
  },
  {
    title: "Slug Guide",
    description: "URL-friendly package names. Use hyphens, keep it short, include destination keyword.",
  },
  {
    title: "SEO Guide",
    description: "Optimize titles, meta descriptions, and alt text for better search visibility.",
  },
];
