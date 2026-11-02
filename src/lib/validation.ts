import { z } from "zod";

const optionalEmail = z
  .string()
  .trim()
  .email("Invalid email address")
  .or(z.literal(""));

export const supplierPackageFileSchema = z.object({
  id: z.string().min(1),
  url: z.string().min(1),
  filename: z.string().min(1),
  mimetype: z.string().optional(),
  size: z.number().int().nonnegative().optional(),
});

export type SupplierPackageFile = z.infer<typeof supplierPackageFileSchema>;

export const supplierFormSchema = z.object({
  supplierName: z.string().min(1, "Supplier name is required"),
  supplierPackageName: z.string().min(1, "Supplier package name is required"),
  supplierCountry: z.string().optional(),
  contactPerson: z.string().optional(),
  supplierEmails: z.array(optionalEmail).min(1),
  supplierWhatsapp: z.string().optional(),
  quotationFiles: z.array(supplierPackageFileSchema).optional(),
  internalSupplierNotes: z.string().optional(),
});

export type SupplierFormValues = z.infer<typeof supplierFormSchema>;

/** Normalize legacy single-email payloads and strip removed fields on save/load. */
export function normalizeSupplierFormValues(
  data?: Partial<SupplierFormValues> & { supplierEmail?: string } | null
): SupplierFormValues {
  const emailsFromArray = Array.isArray(data?.supplierEmails)
    ? data.supplierEmails.map((email) => (typeof email === "string" ? email.trim() : ""))
    : [];
  const legacyEmail =
    typeof data?.supplierEmail === "string" && data.supplierEmail.trim()
      ? [data.supplierEmail.trim()]
      : [];
  const emails = (emailsFromArray.length > 0 ? emailsFromArray : legacyEmail).filter(Boolean);

  return {
    supplierName: data?.supplierName ?? "",
    supplierPackageName: data?.supplierPackageName ?? "",
    supplierCountry: data?.supplierCountry ?? "",
    contactPerson: data?.contactPerson ?? "",
    supplierEmails: emails.length > 0 ? emails : [""],
    supplierWhatsapp: data?.supplierWhatsapp ?? "",
    quotationFiles: normalizeQuotationFiles(
      (data as { quotationFiles?: unknown } | null | undefined)?.quotationFiles
    ),
    internalSupplierNotes: data?.internalSupplierNotes ?? "",
  };
}

/** Prepare values for persistence (drop empty email slots). */
export function serializeSupplierFormValues(data: SupplierFormValues): SupplierFormValues {
  const emails = data.supplierEmails.map((e) => e.trim()).filter(Boolean);
  return {
    supplierName: data.supplierName.trim(),
    supplierPackageName: data.supplierPackageName.trim(),
    supplierCountry: data.supplierCountry?.trim() || undefined,
    contactPerson: data.contactPerson?.trim() || undefined,
    supplierEmails: emails,
    supplierWhatsapp: data.supplierWhatsapp?.trim() || undefined,
    quotationFiles: normalizeQuotationFiles(data.quotationFiles),
    internalSupplierNotes: data.internalSupplierNotes?.trim() || undefined,
  };
}

function normalizeQuotationFiles(value: unknown): SupplierPackageFile[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const parsed = supplierPackageFileSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

export const packageBasicsSchema = z.object({
  packageTitle: z.string().min(1, "Package title is required"),
  slug: z.string().min(1, "Slug is required"),
  shortIntro: z.string().optional(),
  packageOverview: z.string().optional(),
  packageMode: z.string().min(1, "Package mode is required"),
  tourType: z.string().min(1, "Tour type is required"),
  runs: z.string().min(1, "Runs is required"),
  runsCustom: z.string().optional(),
  countriesCovered: z.string().optional(),
  citiesOrRegions: z.string().optional(),
  startingPoint: z.string().optional(),
  endingPoint: z.string().optional(),
  days: z.string().optional(),
  nights: z.string().optional(),
  categories: z.array(z.string()).optional(),
  categoryIds: z.array(z.number().int().positive()).optional(),
  packageThemes: z.array(z.string()).optional(),
  landingPages: z.array(z.string()).optional(),
  /** @deprecated Managed in Inclusions; kept optional for existing package data */
  domesticFlightsIncluded: z.boolean().optional(),
  /** @deprecated Managed in Inclusions; kept optional for existing package data */
  trainIncluded: z.boolean().optional(),
  /** @deprecated Managed in Inclusions; kept optional for existing package data */
  transfersIncluded: z.boolean().optional(),
  isSeasonalPackage: z.boolean(),
  /** @deprecated Managed in Inclusions; kept so existing Package Basics rows still load */
  importantInfo: z.string().optional(),
  /** @deprecated Removed from Package Basics; kept so existing rows still load */
  frontendNotes: z.string().optional(),
});

export type PackageBasicsValues = z.infer<typeof packageBasicsSchema>;

export const categoryStatusSchema = z.enum(["active", "inactive"]);

export const createCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  slug: z
    .string()
    .transform((s) => (s.trim() === "" ? undefined : s))
    .pipe(
      z
        .string()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase with hyphens only")
        .optional()
    )
    .optional(),
  description: z.string().optional().nullable(),
  icon_path: z.string().optional().nullable(),
  image_path: z.string().optional().nullable(),
  display_order: z.number().int().min(0, "Display order must be a non-negative number").optional(),
  status: categoryStatusSchema.optional(),
  is_featured: z.boolean().optional(),
  seo_meta_title: z.string().optional().nullable(),
  seo_meta_description: z.string().optional().nullable(),
});

export const updateCategorySchema = createCategorySchema.partial();

export type CreateCategoryFormValues = z.infer<typeof createCategorySchema>;
export type UpdateCategoryFormValues = z.infer<typeof updateCategorySchema>;

export const createPackageCatalogSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z
    .string()
    .transform((value) => (value.trim() === "" ? undefined : value))
    .pipe(
      z
        .string()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase with hyphens only")
        .optional()
    )
    .optional(),
  description: z.string().optional().nullable(),
  display_order: z.number().int().min(0, "Display order must be a non-negative number").optional(),
  status: categoryStatusSchema.optional(),
});

export const updatePackageCatalogSchema = createPackageCatalogSchema.partial();

export type CreatePackageCatalogFormValues = z.infer<typeof createPackageCatalogSchema>;
export type UpdatePackageCatalogFormValues = z.infer<typeof updatePackageCatalogSchema>;

const tieredMarkupBandSchema = z.object({
  min_pax: z.number().int().min(0).optional(),
  max_pax: z.number().int().min(0).optional(),
  markup_value: z.string().min(1, "Markup value is required"),
});

export const pricingRuleStatusSchema = z.enum(["active", "inactive"]);
export const pricingRuleScopeSchema = z.enum([
  "global",
  "destination",
  "currency",
  "supplier_country",
]);
export const exchangeRateTypeSchema = z.enum(["manual", "auto", "fixed"]);
export const markupTypeSchema = z.enum(["percentage", "fixed", "tiered"]);

export const createPricingRuleSchema = z.object({
  name: z.string().min(1, "Rule name is required"),
  description: z.string().optional().nullable(),
  scope_type: pricingRuleScopeSchema.optional(),
  scope_value: z.string().optional().nullable(),
  supplier_currency: z.string().optional().nullable(),
  display_currency: z.string().optional().nullable(),
  exchange_rate_type: exchangeRateTypeSchema.optional(),
  default_exchange_rate: z.number().min(0).optional().nullable(),
  rate_lock_days: z.number().int().min(0).optional().nullable(),
  markup_type: markupTypeSchema.optional(),
  default_markup_value: z.string().optional().nullable(),
  tiered_markup_json: z.array(tieredMarkupBandSchema).optional().nullable(),
  minimum_margin_percent: z.number().min(0).max(100).optional().nullable(),
  finance_approval_threshold: z.number().min(0).max(100).optional().nullable(),
  requires_finance_approval: z.boolean().optional(),
  status: pricingRuleStatusSchema.optional(),
  is_default: z.boolean().optional(),
  display_order: z.number().int().min(0).optional(),
});

export const updatePricingRuleSchema = createPricingRuleSchema.partial();

export type CreatePricingRuleFormValues = z.infer<typeof createPricingRuleSchema>;
export type UpdatePricingRuleFormValues = z.infer<typeof updatePricingRuleSchema>;

export const supplierStatusSchema = z.enum([
  "active",
  "inactive",
  "do_not_use",
]);
export const supplierRelationshipStatusSchema = z.enum([
  "new",
  "under_review",
  "with_issues",
  "on_probation",
  "inactive",
  "blacklisted",
  "poor",
  "average",
  "good",
  "excellent",
]);

export const createSupplierSchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  country: z.string().min(1, "Country is required"),
  city_tour_area: z.string().optional().nullable(),
  status: supplierStatusSchema.optional(),
  relationship_status: supplierRelationshipStatusSchema.optional(),
  services_offered: z.string().optional().nullable(),
  contact_person: z.string().optional().nullable(),
  email_address: z.string().optional().nullable(),
  contact_number: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  problems_with_services: z.string().optional().nullable(),
  account_details: z.string().optional().nullable(),
  tc_poc_fixed_departure: z.string().optional().nullable(),
  relationship_owner: z.string().optional().nullable(),
  date_added_updated: z.string().optional().nullable(),
});

export const updateSupplierSchema = createSupplierSchema.partial();

export type CreateSupplierFormValues = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierFormValues = z.infer<typeof updateSupplierSchema>;

export const templateStatusSchema = z.enum(["active", "inactive"]);
export const templateTypeSchema = z.enum(["full", "partial"]);

export const createPackageTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  slug: z
    .string()
    .transform((s) => (s.trim() === "" ? undefined : s))
    .pipe(
      z
        .string()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase with hyphens only")
        .optional()
    )
    .optional(),
  description: z.string().optional().nullable(),
  template_type: templateTypeSchema.optional(),
  included_steps: z
    .array(z.number().int().min(1).max(13))
    .min(1, "Select at least one wizard step")
    .optional(),
  status: templateStatusSchema.optional(),
  is_default: z.boolean().optional(),
  display_order: z.number().int().min(0).optional(),
});

export const updatePackageTemplateSchema = createPackageTemplateSchema.partial();

export type CreatePackageTemplateFormValues = z.infer<typeof createPackageTemplateSchema>;
export type UpdatePackageTemplateFormValues = z.infer<typeof updatePackageTemplateSchema>;

const slugFieldSchema = z
  .string()
  .optional()
  .nullable()
  .transform((s) => {
    if (s == null) return undefined;
    const trimmed = s.trim();
    return trimmed === "" ? undefined : trimmed;
  })
  .refine(
    (s) => s === undefined || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s),
    "Slug must be lowercase with hyphens only"
  );

export const blogPostStatusSchema = z.enum([
  "draft",
  "pending_review",
  "scheduled",
  "published",
  "archived",
]);

const blogPostFieldsSchema = z.object({
  title: z.string().min(1, "Blog title is required"),
  slug: slugFieldSchema,
  excerpt: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  featured_image_path: z.string().optional().nullable(),
  category_id: z.preprocess(
    (value) => {
      if (value === "" || value === "null" || value === undefined || value === null) return null;
      const num = typeof value === "number" ? value : Number(value);
      return Number.isFinite(num) && num > 0 ? num : null;
    },
    z.number().int().positive().nullable().optional()
  ),
  author_name: z.string().optional().nullable(),
  status: blogPostStatusSchema.optional(),
  is_featured: z.boolean().optional(),
  published_at: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  related_package_ids: z
    .array(z.number().int().positive())
    .max(20, "You can link at most 20 related packages")
    .optional(),
  seo_meta_title: z.string().optional().nullable(),
  seo_meta_description: z.string().optional().nullable(),
});

function refineScheduledPublishAt(
  data: { status?: string | null; published_at?: string | null },
  ctx: z.RefinementCtx
) {
  if (data.status !== "scheduled") return;
  const scheduledAt = data.published_at?.trim();
  if (!scheduledAt) {
    ctx.addIssue({
      code: "custom",
      path: ["published_at"],
      message: "Schedule date/time (SGT) is required for scheduled posts",
    });
  }
}

export const createBlogPostSchema = blogPostFieldsSchema.superRefine(refineScheduledPublishAt);

export const updateBlogPostSchema = blogPostFieldsSchema.partial().superRefine(refineScheduledPublishAt);

export type CreateBlogPostFormValues = z.infer<typeof createBlogPostSchema>;
export type UpdateBlogPostFormValues = z.infer<typeof updateBlogPostSchema>;

export const blogCategoryStatusSchema = z.enum(["active", "inactive"]);

export const createBlogCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  slug: slugFieldSchema,
  description: z.string().optional().nullable(),
  display_order: z.number().int().min(0, "Display order must be a non-negative number").optional(),
  status: blogCategoryStatusSchema.optional(),
  seo_meta_title: z.string().optional().nullable(),
  seo_meta_description: z.string().optional().nullable(),
});

export const updateBlogCategorySchema = createBlogCategorySchema.partial();

export type CreateBlogCategoryFormValues = z.infer<typeof createBlogCategorySchema>;
export type UpdateBlogCategoryFormValues = z.infer<typeof updateBlogCategorySchema>;

export const pageStatusSchema = z.enum(["draft", "published", "archived"]);

export const createPageSchema = z.object({
  title: z.string().min(1, "Page title is required"),
  slug: slugFieldSchema,
  excerpt: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  featured_image_path: z.string().optional().nullable(),
  page_type: z.string().optional().nullable(),
  status: pageStatusSchema.optional(),
  show_in_nav: z.boolean().optional(),
  display_order: z.number().int().min(0).optional(),
  published_at: z.string().optional().nullable(),
  seo_meta_title: z.string().optional().nullable(),
  seo_meta_description: z.string().optional().nullable(),
});

export const updatePageSchema = createPageSchema.partial();

export type CreatePageFormValues = z.infer<typeof createPageSchema>;
export type UpdatePageFormValues = z.infer<typeof updatePageSchema>;