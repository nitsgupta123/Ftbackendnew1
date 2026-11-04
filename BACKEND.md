# FT Backend — How It Works

**Service name:** `ftbackend`  
**Process:** Fastify on port **4000** (`server/index.ts`)  
**Database:** MySQL `fz` (session timezone **+08:00**, Singapore)  
**Document date:** 2 November 2026  
**Audience:** anyone who needs to understand what the API does, section by section

The admin panel (`ftadmin`) is two processes. Next.js draws the screens. This document is only the API: what each section stores, who may call it, and what happens when a request succeeds.

For tables, env vars, and the error catalog see [DOCUMENTATION.md](DOCUMENTATION.md). For click-by-click staff workflows see [FEATURES.md](FEATURES.md).

---

## 1. How a request travels

```
Browser
  →  Next.js  (/panel, port 3000)
       rewrite /api/* and /uploads/* 
  →  Fastify  (port 4000)
       server/routes/<section>.ts
  →  src/lib/<section>-repository.ts
  →  MySQL pool (src/lib/db.ts)
```

`npm run dev` starts MySQL check, then both processes together. The browser calls `/api/...` on the Next.js origin. Next.js forwards that path to Fastify. There are no Next.js `route.ts` handlers.

Every route file is a Fastify plugin registered in `server/index.ts` under a prefix:

| Prefix | Route file | What it owns |
|---|---|---|
| `/health` | `server/index.ts` | Process and database name |
| `/api/auth` | `routes/auth.ts` | Signup, login, email verify, current user |
| `/api/users` | `routes/users.ts` | Staff accounts |
| `/api/permissions` | `routes/permissions.ts` | Role matrix and per-user overrides |
| `/api/dashboard` | `routes/dashboard.ts` | Home overview |
| `/api/packages` | `routes/packages.ts` | Wizard packages and legacy catalogue actions |
| `/api/categories` | `routes/categories.ts` | Package categories |
| `/api/package-types` | `routes/package-catalog.ts` | Tour types |
| `/api/package-themes` | `routes/package-catalog.ts` | Merchandising themes |
| `/api/pricing-rules` | `routes/pricing-rules.ts` | Global markup and FX rules |
| `/api/package-templates` | `routes/package-templates.ts` | Reusable package skeletons |
| `/api/suppliers` | `routes/suppliers.ts` | Vendor directory |
| `/api/blogs` | `routes/blogs.ts` | Blog posts |
| `/api/blog-categories` | `routes/blog-categories.ts` | Blog categories |
| `/api/pages` | `routes/pages.ts` | CMS pages |
| `/api/enquiries` | `routes/enquiries.ts` | Public-site inbox |
| `/api/settings` | `routes/settings.ts` | Singleton site settings |
| `/api/media` | `routes/media.ts` | File upload |
| `/api/legacy-assets` | `routes/legacy-assets.ts` | Public-site image proxy |
| `/uploads/` | static plugin | Files saved by media upload |

---

## 2. Rules that apply to every section

### Authentication

`server/plugins/auth.ts` registers JWT. Almost every route runs `app.authenticate` before the handler. A missing or expired token returns **401** `{ error: "Unauthorized" }`.

Public routes are only:

- `GET /health`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/verify-email`
- `POST /api/auth/resend-verification`

The token payload is `{ sub, email, name, role }`. Default lifetime is **7 days** (`JWT_EXPIRES_IN`).

The API does not have a logout endpoint. The browser drops the token from `localStorage`.

### Who can change what

Two extra gates sit on top of “must be logged in”:

| Gate | Who passes | Used for |
|---|---|---|
| `requireSuperAdmin` | `role === "super_admin"` | Create, edit, and delete staff. Delete rows in most content sections. |
| `requireAccessManager` | `super_admin` or `owner` | Change the permission matrix, rename or delete roles, set per-user overrides |

List and edit of content (packages, blogs, pages, suppliers, and so on) only require a valid token. The panel hides menus using the permission matrix, but most content routes do not re-check `canView` / `canEdit` on the server. Deletes of content are the exception: they require Super Admin.

### Audit name

When a row stores `created_by` or `updated_by`, the name comes from the JWT (`request.user.name`). If that is missing, the API reads the `x-audit-user` header.

### Time and database

Every query sets the MySQL session to `+08:00`. Scheduled blog publish uses `NOW()` in that session, so “due” means Singapore wall-clock time.

If MySQL is down, routes return **503** with “Database is unavailable…”. The process refuses to listen if the first connection check fails.

### Two kinds of data

| Kind | Examples | Who owns the schema |
|---|---|---|
| Admin tables | `admin_users`, `add_package`, `blog_posts`, `cms_pages`, `suppliers`, `admin_settings` | This API (`scripts/migrate-*.sql`) |
| Legacy website tables | `tbl_packages`, `tbl_message`, `tbl_destinations`, `tbl_products` | The public site. This API reads and writes a subset. |

`DB_NAME` (default `fz`) is the admin database. `LEGACY_DB_NAME` prefixes legacy tables when they live in another database. By default both are `fz`.

### Errors

There is no error-code catalog. Failures are HTTP status plus `{ error: "message" }`. Validation failures add `details` from Zod.

---

## 3. Health

`GET /health` needs no token.

```json
{ "ok": true, "service": "ftbackend", "database": "fz" }
```

It confirms the process is up. It does not run a query. Database failure is caught at startup and on each route that talks to MySQL.

---

## 4. Auth — `/api/auth`

Staff identity lives in `admin_users`. Passwords are bcrypt hashes (12 rounds). A user cannot sign in until `email_verified` is true, except the very first account.

### Signup

`POST /api/auth/signup` with `{ email, password, fullName }`.

1. Email is trimmed and lowercased.
2. If that email is already verified, the API returns **409**.
3. If there are **zero verified users**, this account is created as **Super Admin**, marked verified, and a JWT is returned immediately (`status: "authenticated"`). That is the bootstrap path.
4. Every later signup is stored as a pending admin. The API emails a verification link. The response is `status: "pending_verification"`. The person does not appear in User Management until they verify.
5. If mail cannot be sent, the pending row is deleted and the API returns **503**.

### Verify and resend

`POST /api/auth/verify-email` with `{ token }` marks the account verified and returns a JWT.

`POST /api/auth/resend-verification` with `{ email }` always answers with the same sentence (“If that email needs verification, a new link has been sent.”) so it does not reveal whether the address exists. A new link is sent only when a pending, unverified account matches.

### Login

`POST /api/auth/login` with `{ email, password }`.

1. Unknown email, wrong password, or inactive account → **401** `Invalid email or password`.
2. Right password but email not verified → **403** `Please verify your email before signing in`.
3. Success updates `last_login_at` and returns `{ token, user }`.

### Current user

`GET /api/auth/me` (token required) reloads the profile from the database. A deleted user with a still-valid token gets **401**.

---

## 5. Users — `/api/users`

This is the staff directory. Only verified accounts are listed. Pending signups stay hidden until they click the email link.

All routes require a token. **Create, update, and delete require Super Admin.**

| Method | Path | What happens |
|---|---|---|
| GET | `/stats` | Counts of users |
| GET | `/` | Paginated list. Query: `search`, `role`, `status` (`active`/`inactive`/`all`), `sort`, `order`, `page`, `limit` |
| GET | `/:id` | One verified user |
| POST | `/` | Super Admin invites a user |
| PATCH | `/:id` | Super Admin changes name, role, active flag, or password |
| DELETE | `/:id` | Super Admin deletes the account |

Invite (`POST /`) works like signup after the first user:

1. Email must be configured (Microsoft Graph, SMTP, or Ethereal in development).
2. A verified email already in the table returns **409**.
3. The row is created unverified with the role the Super Admin chose.
4. A verification email is sent. The user shows up in the list only after verification.
5. If the email fails, the pending row is removed.

Safety rules on update and delete:

- You cannot deactivate yourself, change your own role, or delete yourself.
- You cannot deactivate or demote the last active Super Admin.

---

## 6. Permissions — `/api/permissions`

Access is three layers:

1. **Role** on `admin_users.role` (string such as `super_admin`, `admin`, `owner`, or a custom slug).
2. **Role matrix** in `role_permissions`: for each module, `canView`, `canEdit`, `canDelete`.
3. **User overrides** in `user_permissions`: only the cells that differ from the role. The effective matrix is role plus those diffs.

Module keys are declared in `src/lib/permission-types.ts` (`ACCESS_MODULES`). They cover the sidebar (dashboard, blogs, packages, suppliers, …) and each package-wizard step (`supplier_source`, `pricing`, `seo`, …).

Built-in defaults:

- **Super Admin** — view, edit, and delete on every module.
- **Admin** — view and edit on content modules, no delete. No access to User Management or Roles.
- A role that has never been saved is filled from those defaults the first time the matrix is read.

| Method | Path | Who | What happens |
|---|---|---|---|
| GET | `/` | any staff | Full catalog of modules and every role matrix |
| GET | `/me` | any staff | Effective matrix for the caller (role + their overrides) |
| GET | `/users/:userId` | Super Admin or Owner | Role permissions, overrides, and effective matrix |
| PUT | `/users/:userId` | Super Admin or Owner | Saves only the cells that differ from the role |
| DELETE | `/users/:userId` | Super Admin or Owner | Clears overrides; the user falls back to the role |
| PUT | `/:role` | Super Admin or Owner | Replaces that role’s matrix |
| PATCH | `/:role` | Super Admin or Owner | Renames the role (`{ role: "new_slug" }`) |
| DELETE | `/:role` | Super Admin or Owner | Deletes the role and moves its users to `admin` |
| POST | `/:role/reset` | Super Admin or Owner | Restores the built-in defaults for that role |

`admin`, `super_admin`, and `owner` cannot be renamed or deleted. Role slugs must match `^[a-z][a-z0-9_]*$`. Unknown module keys are rejected.

The sidebar uses `GET /permissions/me` to hide links. That filter is in the browser. See section 2 for what the API itself enforces.

---

## 7. Dashboard — `/api/dashboard`

`GET /api/dashboard?chartDays=7|30|90` (token required).

One call builds the home screen:

| Piece | Source |
|---|---|
| Page and blog counts | Admin tables `cms_pages`, `blog_posts` |
| Wizard package counts | `add_package` |
| Destinations, products, testimonials | Legacy `tbl_destinations`, `tbl_products`, testimonials table |
| Enquiry chart and newsletter-style counts | Legacy `tbl_message` |
| Recent activity | Latest packages, blogs, pages, enquiries, testimonials |

`chartDays` defaults to 7. The chart buckets enquiry volume in Singapore time.

---

## 8. Packages — `/api/packages`

This is the core of the backend. A sellable trip can exist in two places at once.

| Source | Table | Meaning |
|---|---|---|
| Wizard | `add_package` | Built in the 14-step editor. One JSON column per step. |
| Legacy catalogue | `tbl_packages` | The public website’s package row. |

Creating a wizard package always inserts a **stub** in `tbl_packages` first (`is_publish = 2`, `status = 1`) and stores that id as `add_package.package_id`. Later saves copy title, slug, and SEO fields back onto that stub (`p_name`, `p_slug`, `meta_title`, `meta_description`, `meta_keywords`). The rich wizard content stays in `add_package`. It is not copied field-by-field into the legacy columns.

### Status

Wizard status is one of: `draft`, `pending_review`, `published`, `archived`, `deleted`.

- New packages start as `draft`.
- Delete of a wizard package sets `status = 'deleted'`. The row stays. Lists hide it.
- Archiving a wizard package also sets `tbl_packages.is_archive = 1`.
- Delete of a **legacy** row (`?source=legacy`) removes the `tbl_packages` row and any wizard row that points at it.
- The only legacy update the API accepts is archive (`PATCH /:id?source=legacy` with `{ status: "archived" }`).

### Endpoints

| Method | Path | What it returns or does |
|---|---|---|
| GET | `/stats` | Counts by status, mixing wizard and legacy |
| GET | `/` | Wizard packages. Optional `?status=` |
| GET | `/all` | Legacy `tbl_packages` rows |
| GET | `/combined` | Wizard and legacy together for “All Packages” |
| GET | `/recently-published` | Latest published wizard packages |
| GET | `/expiring-rates` | Packages whose pricing validity ends within 30 days |
| GET | `/supplier-quotes` | Packages that have Supplier Quote Tool data saved |
| GET | `/:id` | One wizard package, all JSON sections parsed |
| POST | `/` | Creates the legacy stub and the wizard row |
| PATCH | `/:id` | Writes any subset of sections you send |
| POST | `/:id/supplier-quotes/send` | Emails the supplier quote and stores the send record |
| DELETE | `/:id` | Soft-delete wizard, or hard-delete when `?source=legacy` |

`POST` and `PATCH` accept a partial body. Only keys you send are written. `current_step` records how far the editor has gone (1–14). `created_by` / `updated_by` store the staff name.

Category ids sent inside `package_basics.categoryIds` are also written to the package–category join table.

### The 14 sections

Each step is one JSON column on `add_package`. The editor saves that column with `PATCH /api/packages/:id`. Permission keys for the steps live in `PACKAGE_STEP_PERMISSION_KEYS`.

| Step | Column | What staff put here |
|---|---|---|
| 1 | `supplier_source` | Which vendor this package comes from: name, emails, WhatsApp, country, quotation files, internal notes |
| 2 | `package_basics` | Title, slug, intro, overview, tour type, theme, countries, cities, start and end, days and nights, category ids |
| 3 | `media_frontend` | Gallery, cover, and other images the public page should show. Files themselves are uploaded via `/api/media/upload`; this column stores the URLs |
| 4 | `pricing` | Seasons, adult tiers, child prices, blackout dates, and package-level promotions (booking window, travel window, percent or fixed discount) |
| 5 | `itinerary` | Day-by-day plan |
| 6 | `hotels` | Stays: hotel, room, nights |
| 7 | `inclusions` | What the price includes. Exclusions are edited in the same step and stored in this payload |
| 8 | `booking_policy` | Payment, cancellation, and booking rules |
| 9 | `consultant_view` | Notes meant for sales consultants, not the public page |
| 10 | `supplier_quote_tool` | Quote request: recipients, subject, body, reference code, attachment flags, and the last-sent record |
| 11 | `frontend_faqs` | Customer-facing questions and answers |
| 12 | `sales_ads_assets` | Marketing files and ad copy |
| 13 | `seo` | Meta title, description, focus keyword. These three are the fields copied onto `tbl_packages` |
| 14 | `review_publish` | Final checklist and publish metadata such as `publishedAt`. Setting `status` to `published` or `pending_review` is a separate field on the same PATCH |

`GET /expiring-rates` looks at the pricing validity end date inside the `pricing` JSON and keeps packages due within 30 days.

### Sending a supplier quote

`POST /api/packages/:id/supplier-quotes/send`

Body: `{ to, additionalTo, subject, body, emailSignature?, quoteData? }`.

1. Email must be configured, or the API returns **503**.
2. The package must exist.
3. `quoteData.referenceCode` is required. It is inserted into the subject.
4. Recipients are de-duplicated. CC and BCC come from Settings (`quote_cc_emails`, `quote_bcc_emails`), not from the request.
5. Reply-To is `support_email` from Settings when that is set.
6. Attachments are built from the package (itinerary and package file) unless `quoteData` turns them off.
7. The message is signed with the caller’s name and the signature text.
8. After a successful send, `supplier_quote_tool` is updated with `lastSentAt`, `lastSentBy`, and `lastSentTo`.

Mail mode is `graph`, `smtp`, or `ethereal`. In development, Ethereal returns a `previewUrl` instead of delivering to a real inbox.

---

## 9. Package categories — `/api/categories`

Categories group packages for landing pages and merchandising. They are separate from tour types and themes.

Table: package categories, plus a join from `add_package` when a package’s basics include `categoryIds`.

| Method | Path | Notes |
|---|---|---|
| GET | `/` | Search, status, sort, pagination |
| GET | `/:id` | One category |
| POST | `/` | Creates name, slug, description, order, status |
| PUT | `/:id` | Updates the same fields |
| DELETE | `/:id` | Super Admin only |

Slug is generated from the name when omitted, and made unique if it collides. Duplicate names are rejected.

---

## 10. Package types and themes — `/api/package-types`, `/api/package-themes`

Both prefixes use the same route plugin (`registerPackageCatalogRoutes`) with a different table.

| Kind | Used on | Example |
|---|---|---|
| Type | Package Basics “tour type” | Leisure, Safari, Cruise |
| Theme | Package Basics merchandising theme | Honeymoon, Family |

Each row has `name`, `slug`, `description`, `display_order`, and `status` (`active` or `inactive`).

Same CRUD shape as categories: list, get, create, update, and Super-Admin delete. Names are unique case-insensitively. Slugs are unique.

The package wizard reads the active lists to fill dropdowns. Choosing a type or theme stores the value inside `package_basics`; it does not create a join table the way categories do.

---

## 11. Pricing rules — `/api/pricing-rules`

Global commercial rules: currency, exchange rate, markup, minimum margin, and whether finance must approve a price. A package’s own `pricing` JSON is the rate card for that trip. These rules are the company-wide defaults the editor can apply.

| Method | Path | Notes |
|---|---|---|
| GET | `/stats` | Active, inactive, and which rule is default |
| GET | `/default` | The single default rule, if one is marked |
| GET | `/` | List with search and status |
| GET | `/:id` | One rule |
| POST | `/` | Create |
| PUT | `/:id` | Update |
| DELETE | `/:id` | Super Admin only |

Important fields: `scope_type` / `scope_value` (default scope is `global`), `supplier_currency`, `display_currency`, `exchange_rate_type`, `default_exchange_rate`, `rate_lock_days`, `markup_type`, `default_markup_value`, `tiered_markup_json`, `minimum_margin_percent`, `finance_approval_threshold`, `requires_finance_approval`, `status`, `is_default`.

Only one rule can be default. Marking a new default clears the flag on the others. Names must be unique.

---

## 12. Package templates — `/api/package-templates`

A template is a reusable skeleton of wizard sections (basics, itinerary, inclusions, and so on) so staff can start a package without a blank form.

| Method | Path | Notes |
|---|---|---|
| GET | `/stats` | Counts |
| GET | `/` | List |
| GET | `/:id` | Full template |
| POST | `/` | Create |
| PUT | `/:id` | Update |
| POST | `/:id/apply` | Returns the wizard payload to copy onto a package. It does not itself insert an `add_package` row |
| DELETE | `/:id` | Super Admin only |

Apply is a read-and-shape step. The client then `POST`s or `PATCH`es `/api/packages` with that payload.

---

## 13. Suppliers — `/api/suppliers`

The vendor directory. This is the company list (imported from the internal sheet and edited here). Step 1 of a package (`supplier_source`) is the vendor **for that package**; it can be typed by hand and does not have to point at a row in this table.

| Method | Path | Notes |
|---|---|---|
| GET | `/stats` | Counts by status |
| GET | `/countries` | Distinct countries, for filters |
| GET | `/` | Search, country, status, relationship, pagination |
| GET | `/:id` | One supplier |
| POST | `/` | Create |
| PUT | `/:id` | Update |
| DELETE | `/:id` | Super Admin only |

`status` is `active`, `inactive`, or `do_not_use`. `relationship_status` is a longer scale (`new`, `under_review`, `good`, `blacklisted`, and others). Other fields cover contact, website, services, notes, account details, and the relationship owner.

---

## 14. Blogs — `/api/blogs`

Admin-owned posts in `blog_posts`. This is not the legacy `tbl_post` table.

Statuses: `draft`, `pending_review`, `scheduled`, `published`.

| Method | Path | Notes |
|---|---|---|
| GET | `/stats` | Counts by status |
| GET | `/authors` | Distinct author names already used |
| GET | `/` | Filter by status, category, author, search |
| GET | `/:id` | One post |
| POST | `/` | Create |
| PUT | `/:id` | Update |
| DELETE | `/:id` | Super Admin only. This is a real `DELETE`, not a status flag |

What gets stored: title, slug, excerpt, HTML content, featured image path, category id, author name, featured flag, tags (JSON), related package ids (JSON), SEO title and description, status, `published_at`.

Status rules:

- A post saved as `published` with a **future** `published_at` is stored as `scheduled` instead.
- `scheduled` requires a publish time.
- `published` with no time uses the current Singapore timestamp.

Slug is generated from the title and kept unique.

### Scheduler

When the API starts, `server/jobs/blog-publish-scheduler.ts` runs a cron (`BLOG_PUBLISH_CRON`, default every minute). It selects rows with `status = 'scheduled'` and `published_at <= NOW()` and sets them to `published`, with `updated_by = 'system-scheduler'`. `NOW()` uses the Singapore session timezone.

---

## 15. Blog categories — `/api/blog-categories`

Same shape as package categories, on the blog category table: name, slug, description, order, status.

List, get, create, update, and Super-Admin delete. A post stores `category_id` pointing here. Deleting a category does not rewrite existing posts in application code; the database foreign key (if present) decides what happens to those ids.

---

## 16. Pages — `/api/pages`

CMS pages in `cms_pages`. Status is `draft`, `published`, or `archived`.

| Method | Path | Notes |
|---|---|---|
| GET | `/landing-options` | Landing pages that already exist on the public site, so a CMS page can be tied to one |
| GET | `/stats` | Counts |
| GET | `/` | Filter by status and search |
| GET | `/:id` | One page |
| POST | `/` | Create |
| PUT | `/:id` | Update |
| DELETE | `/:id` | Super Admin only |

A page has title, slug, body, status, SEO fields, and an optional link to a website landing page. Slug is unique.

---

## 17. Enquiries — `/api/enquiries`

This is an inbox over the public site table `tbl_message`. The API does not create enquiries. The website inserts them. Staff read, close, and delete them here.

`status` on the legacy row: anything other than `2` is **open** (missing status is treated as open). `2` is **closed**.

`message_type` distinguishes the form that created the row:

| Type | Meaning |
|---|---|
| `contactus` | Contact form |
| `popupenquery` | Popup / newsletter-style enquiry |
| `contactus_visa` | Visa enquiry |
| `contactus_corporate` | Corporate enquiry |

Origin and destination are often stored as destination ids. The list joins `tbl_destinations` to show names.

| Method | Path | Notes |
|---|---|---|
| GET | `/stats` | Total, open, closed, this month, and counts by type |
| GET | `/` | Filters: search, status, type, page, sort |
| GET | `/:id` | One message |
| PATCH | `/:id` | Body `{ status: "open" \| "closed" }` writes `1` or `2` |
| DELETE | `/:id` | Removes the `tbl_message` row |

---

## 18. Settings — `/api/settings`

One singleton row, `admin_settings.id = 1`.

| Method | Path | Notes |
|---|---|---|
| GET | `/` | Returns defaults if the row is missing |
| PUT | `/` | Upserts id 1 and stamps `updated_by` |

Fields: `site_name`, `company_name`, `support_email`, `support_phone`, `office_address`, `timezone`, `homepage_title`, `homepage_description`, `maintenance_mode`, `quote_cc_emails`, `quote_bcc_emails`.

Quote CC and BCC are comma-separated lists. They are normalised on save and read. The supplier-quote sender (section 8) uses them on every quote email. `support_email` becomes the Reply-To of that email.

`maintenance_mode` is stored here. Turning it on does not by itself take the public website offline; the public site would have to read this flag.

---

## 19. Media — `/api/media`

`POST /api/media/upload` (token required), multipart, **one file**, max **80 MB**.

Allowed kinds:

| Kind | Types | Saved under |
|---|---|---|
| image | jpeg, png, gif, webp, svg | `uploads/images/` |
| video | mp4, webm, ogg, quicktime | `uploads/videos/` |
| document | pdf, doc, docx, xls, xlsx | `uploads/documents/` |

The stored name is a timestamp plus a short random id, so uploads do not overwrite each other. The response is `{ url, kind, filename, mimetype, size }` where `url` looks like `/uploads/images/....jpg`.

Fastify serves `uploads/` at `/uploads/`. Next.js rewrites that path, so the browser can use the returned URL directly. Package galleries, blog featured images, and page images store that URL in their own records. There is no media library table and no delete endpoint.

---

## 20. Legacy assets — `/api/legacy-assets`

Authenticated proxy for images that already live on the public site, so the admin can show them without hot-linking issues.

| Method | Path | Behaviour |
|---|---|---|
| GET | `/remote?url=` | Fetches an absolute URL and streams the bytes back |
| GET | `/*` | Treats the rest of the path as a site-relative asset |

Resolution order for a relative path:

1. If `LEGACY_ASSET_ROOT_PATH` is set, read the file from that disk folder (path traversal outside the root is rejected).
2. Otherwise fetch `LEGACY_ASSET_BASE_URL` (default `https://fayyaztravels.com/`) plus the path.

A missing file is a 404. This route does not write anything.

---

## 21. What this API does not do

- **Promotions screen.** The Promotions page in the panel keeps its list in the browser. There is no `/api/promotions` table. Discounts that belong to a package are saved inside that package’s `pricing` JSON (`promotions` array: title, booking dates, travel dates, percent or fixed value, active flag).
- **Password reset.** There is no forgot-password route.
- **Server logout or token revoke.** Tokens stay valid until they expire.
- **Public website rendering.** This API writes the stub and SEO fields on `tbl_packages`. The public site reads that table on its own.
- **Fine-grained permission checks on content routes.** The matrix drives the sidebar. Super Admin is enforced for user management and for deletes. Other content writes trust a valid staff token.

---

## 22. Start-up order

1. Load `.env.local`, then `.env`.
2. Ensure `uploads/` exists.
3. Register CORS, multipart, and `/uploads/` static files.
4. Register JWT, then every route plugin.
5. Open MySQL and retry `SELECT 1` up to 10 times. Exit if that fails.
6. Listen on `API_HOST`:`API_PORT` (default `0.0.0.0:4000`).
7. Start the blog publish cron.

A typical local start is `npm run dev`, which also waits for MySQL and starts Next.js. The API alone is `npm run dev:api` or, in production, `npm run start:api`.
