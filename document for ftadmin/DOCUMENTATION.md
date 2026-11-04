# Fayyaz Travels Admin (`ftadmin`) — Technical Documentation

**Product:** Internal admin panel for Fayyaz Travels  
**Codebase:** `ftadmin` (Next.js UI + Fastify API, shared MySQL `fz` database)  
**Public URL (production):** `https://fayyaz.travel/panel/`  
**API service name:** `ftbackend`  
**Document date:** 14 August 2026  
**Audience:** engineers joining or maintaining this repository

This document is a researched inventory of the running system: architecture, folder layout, database, HTTP API, frontend routes, file/function catalog, and every error the backend currently returns. There is **no formal error-ID catalog** in the codebase (no `ERR_*` / `FT-*` codes). Errors are HTTP status + `{ error: string }` payloads. Those messages are listed in [§10 Error catalog](#10-error-catalog).

For a section-by-section explanation of how the API behaves, see [BACKEND.md](BACKEND.md).

---

## Table of contents

1. [System overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Getting started](#3-getting-started)
4. [Environment variables](#4-environment-variables)
5. [Folder structure](#5-folder-structure)
6. [Database](#6-database)
7. [HTTP API](#7-http-api)
8. [Frontend routes](#8-frontend-routes)
9. [File and function catalog](#9-file-and-function-catalog)
10. [Error catalog](#10-error-catalog)
11. [Authentication and permissions](#11-authentication-and-permissions)
12. [Package wizard (14 steps)](#12-package-wizard-14-steps)
13. [Scripts, seeds, and migrations](#13-scripts-seeds-and-migrations)
14. [Deployment](#14-deployment)
15. [Conventions and known gaps](#15-conventions-and-known-gaps)

---

## 1. System overview

`ftadmin` is the **staff admin** for Fayyaz Travels. It is not the public website. It manages:

| Domain | What staff do |
|---|---|
| Packages | 14-step wizard that writes `add_package` and syncs a stub into the public catalogue `tbl_packages` |
| Package categories / templates / pricing rules | Taxonomy, reusable skeletons, markup/FX rules |
| Suppliers | Vendor directory (from the internal vendor sheet) |
| Blogs / CMS pages | New admin-owned content (`blog_posts`, `cms_pages`) — **not** the legacy `tbl_post` tables |
| Enquiries | Inbox over the public-site table `tbl_message` |
| Users / roles | Staff accounts, role matrices, per-user overrides |
| Settings | Singleton site config, including supplier-quote CC/BCC |
| Dashboard | Counts and activity mixed from admin tables + legacy website tables |
| Promotions | UI only (sample data; no API or table yet) |

**Stack**

| Layer | Technology |
|---|---|
| Admin UI | Next.js **16.2.9** App Router, React **19**, Tailwind **4**, shadcn/Radix, TinyMCE, TipTap |
| API | Fastify **5** on port **4000**, `@fastify/jwt`, `@fastify/multipart`, `@fastify/static` |
| Database | MySQL / MariaDB, database **`fz`**, `utf8mb4_unicode_ci`, session TZ **`+08:00` (SGT)** |
| Auth | JWT in `localStorage` (`ft_admin_token`), bcrypt (12 rounds) |
| Email | Microsoft Graph if configured, else SMTP, else Ethereal (dev) |
| Jobs | `node-cron` publishes due scheduled blog posts every minute |
| Validation | Zod (API + forms), Yup is a dependency but Zod is the live path |
| Process model | Two processes: `tsx server/index.ts` (API) + `next dev` / `next start` (web) |

The Next.js app is mounted at **`basePath: /panel`**. `next.config.ts` rewrites `/api/*` and `/uploads/*` to the Fastify process so the browser can call `fetch("/api/...")` without knowing the API port.

---

## 2. Architecture

```
Browser  ──►  Next.js :3000  (/panel/...)
                │  rewrites
                ▼
             Fastify :4000  (/api/..., /uploads/..., /health)
                │
                ▼
             MySQL `fz`   (admin tables + legacy tbl_* tables)
                │
                └──  uploads/  (images/videos served at /uploads/)
```

**Request path in development (`npm run dev`)**

1. `scripts/ensure-mysql.mjs` waits for MySQL.
2. `concurrently` starts:
   - `tsx watch server/index.ts` → Fastify on `API_PORT` (default 4000)
   - `next dev` → UI on 3000
3. UI pages call `src/lib/*-api.ts` → `fetch("/api/...")` → Next rewrite → Fastify.
4. Fastify route handlers call `src/lib/*-repository.ts` → `query()` in `src/lib/db.ts`.

**Layering (important)**

| Layer | Location | Runs in |
|---|---|---|
| Pages | `src/app/**/page.tsx` | Browser (almost all `"use client"`) |
| Feature UI | `src/components/<domain>/` | Browser |
| API clients | `src/lib/*-api.ts` | Browser |
| Types / Zod | `src/lib/*-types.ts`, `validation.ts` | Shared |
| Repositories | `src/lib/*-repository.ts` | **API process only** (mysql2) |
| Routes | `server/routes/*.ts` | API process |

There are **no** Next.js `route.ts` handlers. Do not import `*-repository.ts`, `db.ts`, or `email.ts` from React components.

**Data ownership**

- **Admin-owned tables** are created by `scripts/init-db.sql` and `scripts/migrate-*.sql`.
- **Legacy website tables** (`tbl_packages`, `tbl_message`, `tbl_destinations`, `tbl_testimonials`, `tbl_products`) live in the same `fz` database (or `LEGACY_DB_NAME` if split). This app reads/writes a subset of them. It does **not** own their schema.

---

## 3. Getting started

```bash
npm install
# copy env: create .env.local with DB_* and JWT_SECRET
npm run db:init          # creates add_package (requires tbl_packages already present)
npm run admin:seed       # bootstrap super_admin (ADMIN_EMAIL / ADMIN_PASSWORD)
npm run dev              # API + Next.js
```

Open `http://localhost:3000` — it redirects to `/panel`.

Useful scripts:

| Script | Purpose |
|---|---|
| `npm run dev` | Ensure MySQL, then API + Next concurrently |
| `npm run dev:api` / `dev:web` | Start one process |
| `npm run build` / `start` | Production Next.js |
| `npm run start:api` | Production Fastify (`tsx server/index.ts`) |
| `npm run db:init` | Run `scripts/init-db.sql` |
| `npm run db:migrate:*` | Incremental schema (see §13) |
| `npm run admin:seed` | Upsert super admin |
| `npm run lint` | ESLint |

First user created via **signup** becomes `super_admin`; later signups become `admin`. Prefer `admin:seed` in production.

---

## 4. Environment variables

Loaded by Fastify from `.env.local` then `.env`. Next.js also reads `NEXT_PUBLIC_*`.

| Variable | Default | Used by |
|---|---|---|
| `DB_HOST` | `localhost` | MySQL pool |
| `DB_PORT` | `3306` | MySQL pool |
| `DB_USER` | `root` | MySQL pool |
| `DB_PASSWORD` | `""` | MySQL pool |
| `DB_NAME` | `fz` | Admin schema |
| `LEGACY_DB_NAME` | same as `DB_NAME` | Prefix for `tbl_*` queries if split |
| `API_PORT` | `4000` | Fastify listen |
| `API_HOST` | `0.0.0.0` | Fastify listen |
| `API_LOG_LEVEL` | `info` | Fastify logger |
| `API_URL` | `http://localhost:4000` | Next.js rewrites (server-side) |
| `CORS_ORIGIN` | `http://localhost:3000,http://127.0.0.1:3000` | CORS allow-list (comma-split) |
| `JWT_SECRET` | **required in production** (≥32 chars); hardcoded **dev fallback** otherwise | JWT sign/verify |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `BLOG_PUBLISH_CRON` | `* * * * *` | Scheduled blog publisher |
| `LEGACY_ASSET_BASE_URL` | `https://fayyaztravels.com/` | Remote image proxy |
| `LEGACY_ASSET_ROOT_PATH` | unset | Optional local disk root for legacy images |
| `NEXT_PUBLIC_API_URL` | same-origin `/api` | Browser API base (optional) |
| `NEXT_PUBLIC_AUDIT_USER` | `"Admin User"` | Fallback audit name |
| `NEXT_PUBLIC_LEGACY_ASSET_BASE_URL` | `https://fayyaztravels.com` | Client image URLs |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | — | `admin:seed` |
| `GRAPH_CLIENT_ID` / `GRAPH_CLIENT_SECRET` / `GRAPH_TENANT_ID` | — | Microsoft Graph mail |
| `GRAPH_FROM_EMAIL` / `GRAPH_FROM_NAME` | `notifications@fayyaztravels.com` / `Fayyaz Travels` | Graph from-header |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_SECURE` | — | SMTP fallback |
| `SMTP_USE_ETHEREAL` | on in non-production | Ethereal test inbox |
| `SKIP_DB_INIT` | — | Docker entrypoint skip |
| `NODE_ENV` | — | JWT secret enforcement, Ethereal |

---

## 5. Folder structure

```
ftadmin/
├── src/                      Next.js admin UI + shared lib
│   ├── app/                  App Router pages (basePath /panel)
│   ├── components/           Feature UI + shadcn primitives
│   └── lib/                  Types, Zod, API clients, MySQL repositories
├── server/                   Fastify API process
│   ├── index.ts              Bootstrap, CORS, static, route registration
│   ├── plugins/auth.ts       JWT plugin + authenticate decorator
│   ├── lib/                  Route helpers (audit, errors)
│   ├── jobs/                 Cron (blog publisher)
│   ├── routes/               One plugin per domain
│   └── types/fastify.d.ts    JWT user typing
├── scripts/                  SQL migrations, seeds, DB tooling
├── public/                   Logo, TinyMCE (copied on postinstall)
├── uploads/                  Runtime media (gitignored); served at /uploads/
├── docker/entrypoint.sh      Container start: optional db:init then CMD
├── Dockerfile
├── docker-compose.yml        Dev: MySQL 8 + app (ports 3000/4000/3306)
├── docker-compose.prod.yml   App only, bind 127.0.0.1 for Apache
├── apache-ftpadmin.conf      Proxy /panel, /_next, /api, /uploads
├── next.config.ts            basePath /panel + API rewrites
├── package.json
└── DOCUMENTATION.md          This file
```

### `src/app/` — pages

| Path | Role |
|---|---|
| `layout.tsx` | Root layout, Geist fonts, metadata “Fayyaz Travels Admin” |
| `providers.tsx` | `AuthProvider` → `PermissionsProvider` → `RouteGuard` + Sonner |
| `globals.css` | Tailwind / theme |
| `page.tsx` | Dashboard |
| `login/` `signup/` | Auth (server Suspense wrapper + client form) |
| `add-package/` | 14-step wizard (`layout.tsx` is a Suspense boundary) |
| `packages/` `packages/[module]/` | Package hub + module views |
| `blogs/` `blogs/[module]/` `blogs/new/` `blogs/edit/[id]/` | Blog posts + categories |
| `pages/` `pages/[module]/` `pages/new/` `pages/edit/[id]/` | CMS pages |
| `suppliers/` | Supplier directory |
| `promotions/` | Promotions (client sample data) |
| `enquiry/` | Enquiry inbox |
| `user-management/` | Staff accounts |
| `settings/general/` | Site settings |
| `settings/roles/` | Access-control matrix |
| `settings/role-management/` | Create/rename/delete roles + employee overrides |

There is **no** `src/middleware.ts` and **no** `src/app/**/route.ts`.

### `src/components/` — UI by domain

| Directory | Role |
|---|---|
| `layout/` | `AdminShell`, `Sidebar`, `Header`, `BrandLogo`, `ListPageHeader` |
| `auth/` | Session, route guard, permission context, login card |
| `dashboard/` | Stat cards, chart, activity, quick actions, content summary |
| `package/` | Wizard chrome + 14 step forms |
| `packages/` | List/dashboard (not the wizard) |
| `blogs/` | Posts + blog categories |
| `pages/` | CMS pages |
| `suppliers/` | Vendor directory |
| `categories/` | Package categories |
| `templates/` | Package templates |
| `pricing-rules/` | Markup / FX rules |
| `enquiries/` | Lead inbox |
| `users/` | Admin users |
| `settings/` + `settings/access-control/` | Settings and RBAC UI |
| `promotions/` | Promotions UI (no backend) |
| `ui/` | shadcn/Radix primitives |

### `server/` — API

| File | Role |
|---|---|
| `index.ts` | Build Fastify, plugins, prefixes, global 503/500 handler, listen |
| `plugins/auth.ts` | `@fastify/jwt` + `app.authenticate` |
| `lib/audit.ts` | Audit user from JWT / `x-audit-user`; Super Admin gate |
| `lib/errors.ts` | `sendRouteError` (used by auth routes) |
| `jobs/blog-publish-scheduler.ts` | Cron → `publishDueScheduledBlogPosts()` |
| `types/fastify.d.ts` | JWT payload `{ sub, email, name, role }` |
| `routes/*.ts` | Domain plugins (see §7) |

### `scripts/`

Flat folder. SQL files are the schema source of truth. Matching `run-migrate-*.mjs` files execute them. See §13.

### `public/`

| File | Role |
|---|---|
| `fayyaz-logo.png` | Brand logo (`/panel/fayyaz-logo.png` because of `basePath`) |
| `tinymce/` | Copied from `node_modules` by `scripts/copy-tinymce.mjs` (`postinstall`) |
| `*.svg` | Default Next.js placeholders |

---

## 6. Database

**Name:** `fz`  
**Charset:** `utf8mb4` / `utf8mb4_unicode_ci`  
**Connection:** `src/lib/db.ts` (`mysql2` pool, limit 10, session `time_zone = '+08:00'`)

Audit columns (`created_by`, `updated_by`) store **display names**, not user IDs.

### 6.1 Tables owned by this app (13)

#### `add_package` — 14-step package wizard

Created by `scripts/init-db.sql`. One row per wizard package. **1:1** with `tbl_packages` via `package_id`.

| Column | Type | Role |
|---|---|---|
| `id` | `BIGINT UNSIGNED` AI | PK (this is what `package_category_map.package_id` points at) |
| `package_id` | `INT` UNIQUE | FK → `tbl_packages.id` **ON DELETE CASCADE** |
| `status` | ENUM `draft`, `pending_review`, `published`, `archived`, `deleted` | Workflow. Soft delete = `deleted`. Requires `migrate-add-deleted-status.sql` |
| `current_step` | `TINYINT UNSIGNED` default `1` | Last wizard step (1–14) |
| `supplier_source` … `review_publish` | `JSON` NULL | One JSON blob per step (NULL = not filled) |
| `created_by` / `updated_by` | `VARCHAR(255)` | Audit names |
| `created_at` / `updated_at` | `TIMESTAMP` | |

JSON columns: `supplier_source`, `package_basics`, `media_frontend`, `pricing`, `itinerary`, `hotels`, `inclusions`, `booking_policy`, `consultant_view`, `supplier_quote_tool`, `frontend_faqs`, `sales_ads_assets`, `seo`, `review_publish`.

Indexes: status, current_step, created_at, created_by, updated_by.

**Create path:** insert stub `tbl_packages` (`is_publish = 2`) → insert `add_package`. Updates copy title/slug/SEO back to `tbl_packages`.

#### `admin_users` — staff login

| Column | Role |
|---|---|
| `id` | PK |
| `email` | Unique login identity |
| `password_hash` | bcrypt |
| `full_name` | Display / JWT `name` |
| `role` | `VARCHAR(60)` — `admin`, `super_admin`, `owner`, or custom |
| `is_active` | `1` active, `0` disabled (login fails same as bad password) |
| `last_login_at` | Set on successful login |
| timestamps | |

#### `admin_settings` — singleton (`id = 1`)

Site name, company, support email/phone, office address, timezone (default `Asia/Kolkata`), homepage title/description, `maintenance_mode`, `quote_cc_emails` / `quote_bcc_emails` (comma-separated for supplier quotes), `updated_by`.

#### `role_permissions` — role × module matrix

| Column | Role |
|---|---|
| `role` | Matches `admin_users.role` (logical, no FK) |
| `module_key` | See §11 |
| `can_view` / `can_edit` / `can_delete` | Flags. Edit/delete imply view when saved |

Unique `(role, module_key)`. `super_admin` is treated as full access in code even without rows.

#### `user_permissions` — per-user overrides

Same flags as role permissions, keyed by `user_id`. **No FK.** `user_id` is `INT UNSIGNED` while `admin_users.id` is `BIGINT UNSIGNED`. Unique `(user_id, module_key)`. Also ensured at runtime by `ensureUserPermissionsTable()`.

#### `cms_pages` — CMS pages

Title, unique slug, excerpt, HTML `content`, featured image, `page_type` (`about` / `contact` / `legal` / `landing` / …), status `draft|published|archived`, `show_in_nav`, `display_order`, `published_at`, SEO, audit.

#### `suppliers` — vendor directory

Company, country, city/tour area, operational `status` (`active|inactive|do_not_use`), `relationship_status` (`new`, `under_review`, `with_issues`, `on_probation`, `inactive`, `blacklisted`, `poor`, `average`, `good`, `excellent`), services (CSV), contacts, website, notes, problems, account details, TC POC, relationship owner, sheet date.

#### `blog_categories` / `blog_posts`

Categories: unique name/slug, description, order, `active|inactive`, SEO, audit.

Posts: title, unique slug, excerpt, HTML, featured image, `category_id` **FK SET NULL**, `author_name`, status `draft|scheduled|published|archived`, `is_featured`, `published_at` (required when scheduled), `tags` JSON, SEO, audit.

Cron: `publishDueScheduledBlogPosts()` sets `scheduled` → `published` when `published_at <= NOW()`.

#### `package_categories` / `package_category_map`

Categories: name, slug, description, `icon_path`, `image_path`, order, `active|inactive`, `is_featured`, SEO.

Map: composite PK (`package_id`, `category_id`). **`package_id` is `add_package.id`, not `tbl_packages.id`.** Both FKs CASCADE.

#### `package_templates` — reusable wizard skeletons

Same JSON step columns as `add_package` **except** `review_publish`. Extra: `template_type` (`full|partial`), `included_steps` JSON (step numbers 1–13), `is_default`, `display_order`, `usage_count`. Unique name and slug.

#### `pricing_rules` — markup / FX / finance thresholds

`scope_type`: `global|destination|currency|supplier_country` + `scope_value`. Currencies, `exchange_rate_type` (`manual|auto|fixed`), `default_exchange_rate`, `rate_lock_days`, `markup_type` (`percentage|fixed|tiered`) + `default_markup_value` / `tiered_markup_json`, `minimum_margin_percent`, `finance_approval_threshold`, `requires_finance_approval`, `is_default` (app clears others), order, audit.

### 6.2 Legacy tables this app actually queries (5)

These have **no CREATE TABLE in this repo**. Schema is owned by the public website.

#### `tbl_packages` — public catalogue

PK `id INT`. Wizard create inserts a stub (`p_name`, `p_slug`, empty content, `package_currency = SGD`, `is_publish = 2`, `status = 1`). Later updates sync title, slug, heroes, meta.

**Status mapping used by the admin UI** (`mapTblPackageStatus`):

1. `is_archive = 1` → `archived`
2. else `is_publish = 2` → `draft`
3. else `status = 2` → `pending_review`
4. else → `published`

Hard-deleting a legacy row also deletes the linked `add_package` row (FK CASCADE). Archiving sets `is_archive = 1`.

Columns the admin cares about: `p_name`, `p_slug`, `feature_img`, `desti_image`, `desti_list`, `day_night`, `package_currency`, `insert_date`, `edit_date`, `is_archive`, `is_publish`, `status`, `user_id`, `meta_title`, `meta_keywords`, `meta_description`.

#### `tbl_message` — enquiries (there is no `enquiries` table)

This **is** the Enquiry module. `status`: `1` (or NULL) = open, `2` = closed. `message_type` is a string, not a SQL ENUM:

| Value | Meaning |
|---|---|
| `contactus` | Contact Us |
| `popupenquery` | Popup / newsletter (legacy spelling) |
| `contactus_visa` | Visa |
| `contactus_corporate` | Corporate |

Dashboard “newsletter subscribers” = `message_type = 'popupenquery'`. `origin` / `destination` are often destination IDs stored as strings; the list query CASTs them and joins `tbl_destinations`.

#### `tbl_destinations`

`id`, `d_name`, `status` (`2` = hidden). Used for enquiry origin/destination labels and dashboard destination counts.

#### `tbl_testimonials`

Dashboard counts + recent activity. Hidden when `status = 2`.

#### `tbl_products`

Dashboard product counts only (`entry_date`). Hidden when `status = 2`.

### 6.3 Relationships

```
tbl_packages.id  1 ── CASCADE ── 1  add_package.package_id
                                      │
                                      │ CASCADE
                                      ▼
                           package_category_map.package_id  (= add_package.id)
                                      │
                                      │ CASCADE
                                      ▼
                           package_categories.id

blog_categories.id  1 ── SET NULL ── *  blog_posts.category_id

tbl_destinations.id  ── logical CAST ──  tbl_message.origin / destination

admin_users.role     ── string match ──  role_permissions.role
admin_users.id       ── logical, no FK ──  user_permissions.user_id
```

**Declared FKs (four only):** `fk_add_package_tbl_packages`, `fk_pcm_package`, `fk_pcm_category`, `fk_blog_posts_category`.

### 6.4 Tables in `fz` that this app does **not** use

Do not confuse these with the admin schema: `packages` (old wizard, replaced by `add_package`), `travel_enquiries` / `leads` / `travel_plans`, `bookings`, `tbl_booking*`, `tbl_post*`, `tbl_user`, `tbl_settings`, `tbl_itinerary`, `tbl_price`, and other `tbl_*` website tables.

### 6.5 Seed data

| Script | What it inserts |
|---|---|
| `migrate-add-settings.sql` | `admin_settings` row `id=1` |
| `seed-admin.mjs` | Super admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD` |
| `seed-pages.sql` | About Us, Contact Us |
| `seed-blogs.sql` | Travel Tips / Destinations / News categories + sample posts |
| `seed-package-categories.sql` | 13 catalog categories (Domestic, International, Honeymoon, …) |
| `seed-package-templates.sql` | Four skeletons (International Group Tour is default full) |
| `seed-pricing-rules.sql` | Global 18% ZAR→SGD (default) + UAE 22% AED→SGD |
| `seed-suppliers-from-sheet.mjs` | Optional Google Sheet import |

Seeds are idempotent (`INSERT IGNORE` / `WHERE NOT EXISTS` / upsert).

---

## 7. HTTP API

**Base:** Fastify, default `http://localhost:4000`  
**Health:** `GET /health` → `{ ok: true, service: "ftbackend", database }`  
**Uploads:** `GET /uploads/**` — **public** static files from `uploads/`  
**Auth:** `Authorization: Bearer <jwt>` on almost every `/api/*` route  
**Audit:** mutating routes take `{ user }` from JWT `name`, else header `x-audit-user`

Multipart: max **80 MB**, **1** file. Images → `uploads/images/`, videos → `uploads/videos/`. Filename `{timestamp}-{uuid8}{ext}`.

### Auth gates used on the API

| Gate | Meaning |
|---|---|
| Public | No JWT |
| JWT | Valid bearer token |
| Super Admin | `request.user.role === "super_admin"` |
| Access manager | `super_admin` **or** `owner` |

The **module permission matrix is not enforced on individual API routes**. Any valid JWT can call package/blog/page CRUD. The matrix is for the Next.js UI. Super Admin (and Owner for roles) is the only extra server-side RBAC.

### 7.1 Route index

#### Public

| Method | Path | Role |
|---|---|---|
| GET | `/health` | Liveness |
| GET | `/uploads/**` | Serve uploaded files |
| POST | `/api/auth/signup` | Create account; first user → `super_admin` |
| POST | `/api/auth/login` | `{ token, user }` |

#### Auth (JWT)

| Method | Path | Role |
|---|---|---|
| GET | `/api/auth/me` | Reload current user by `sub` |

#### Packages `/api/packages` — JWT (delete is **not** Super-Admin-gated)

| Method | Path | Role |
|---|---|---|
| GET | `/stats` | Combined wizard + legacy counts |
| GET | `/expiring-rates` | Rates with `validityTo` within 30 days |
| GET | `/supplier-quotes` | Packages with non-empty `supplier_quote_tool` |
| GET | `/recently-published` | Recent published (skip placeholders) |
| GET | `/combined` | Wizard + unlinked legacy |
| GET | `/all` | `tbl_packages` only |
| GET | `/` | Wizard list; `?status=` |
| POST | `/` | Create wizard package |
| GET | `/:id` | Get wizard package |
| PATCH | `/:id` | Update; `?source=legacy` only allows archive |
| POST | `/:id/supplier-quotes/send` | Email quote request (SMTP/Graph); 503 if mail unconfigured |
| DELETE | `/:id` | Soft-delete wizard or hard-delete legacy (`?source=legacy`) |

#### Categories `/api/categories` — JWT; DELETE Super Admin

CRUD + list (`search`, `status`, `sort`, `order`, `page`, `limit`). Duplicate name → 409.

#### Users `/api/users` — JWT; writes Super Admin

`GET /stats`, list, get, create, patch, delete. Cannot deactivate/delete self; cannot deactivate/demote last active Super Admin.

#### Pricing rules `/api/pricing-rules` — JWT; DELETE Super Admin

Stats, default, list, CRUD. Duplicate name → 409.

#### Package templates `/api/package-templates` — JWT; DELETE Super Admin

Stats, list, CRUD, `POST /:id/apply` (inactive → 400). Increments `usage_count`.

#### Blogs `/api/blogs` — JWT; DELETE Super Admin

Stats, authors, list, CRUD. Status `draft|scheduled|published|archived`.

#### Blog categories `/api/blog-categories` — JWT; DELETE Super Admin

CRUD. Duplicate name → 409.

#### Pages `/api/pages` — JWT; DELETE Super Admin

Stats, list (`page_type`), CRUD.

#### Dashboard `/api/dashboard` — JWT

`GET /` with `?chartDays=` **7, 30, or 90** (else 7).

#### Enquiries `/api/enquiries` — JWT (delete **not** Super-Admin-gated)

Stats, list (`type`, `status` open/closed), get, `PATCH` status, delete. Reads `tbl_message`.

#### Settings `/api/settings` — JWT

`GET` / `PUT` singleton. Quote CC/BCC validated as email lists.

#### Media `/api/media` — JWT

`POST /upload` multipart. Allowed: jpeg/png/gif/webp/svg; mp4/webm/ogg/quicktime.

#### Permissions `/api/permissions` — JWT; role writes = Access manager

| Method | Path | Role |
|---|---|---|
| GET | `/` | All role matrices |
| GET | `/me` | Effective matrix for current user |
| GET | `/users/:userId` | Role + overrides + effective |
| PUT | `/users/:userId` | Save diffs from role defaults |
| DELETE | `/users/:userId` | Clear overrides |
| PUT | `/:role` | Replace role matrix |
| PATCH | `/:role` | Rename (not `admin` / `super_admin` / `owner`) |
| DELETE | `/:role` | Delete custom role; users reassigned to `admin` |
| POST | `/:role/reset` | Restore catalog defaults |

#### Suppliers `/api/suppliers` — JWT; DELETE Super Admin

Stats, countries, list, CRUD.

#### Legacy assets `/api/legacy-assets` — JWT

`GET /remote?url=` fetch remote image. `GET /*` try local `LEGACY_ASSET_ROOT_PATH` (path-traversal checked) else remote `LEGACY_ASSET_BASE_URL`. Cache-Control `public, max-age=3600`.

**Endpoint count:** ~86 named routes plus `/uploads/**`.

---

## 8. Frontend routes

All paths below are App Router paths. In the browser they are prefixed with **`/panel`**.

| Route | Page | Renders |
|---|---|---|
| `/` | Dashboard | Stat cards, 7/30/90 chart, recent activity, quick actions |
| `/login` | Login | `AuthLayout` + `loginSchema` |
| `/signup` | Signup | Open registration |
| `/add-package` | Wizard | `?id=` `?step=` `?templateId=` |
| `/packages` | Package dashboard | Stats, pipeline, list |
| `/packages/[module]` | Package modules | See slugs below |
| `/blogs` | Redirect | → `/blogs/all` |
| `/blogs/[module]` | Blog hub | `all`, `drafts`, `scheduled`, `published`, `archived`, `categories` |
| `/blogs/new` `/blogs/edit/[id]` | Blog editor | `BlogForm` |
| `/pages` | Redirect | → `/pages/all` |
| `/pages/[module]` | CMS hub | `all`, `drafts`, `published`, `archived` |
| `/pages/new` `/pages/edit/[id]` | Page editor | `PageForm` |
| `/suppliers` | Suppliers | `SuppliersPanel` |
| `/promotions` | Promotions | Sample data only |
| `/enquiry` | Enquiries | `EnquiryManagementPanel` |
| `/user-management` | Users | Add User only if `role === "super_admin"` |
| `/settings/general` | General settings | |
| `/settings/roles` | Access Control | Permission matrix |
| `/settings/role-management` | Role Management | Roles + employee overrides |

**`/packages/[module]` slugs:** `all`, `drafts`, `pending-review`, `expiring-rates`, `supplier-quotes`, `categories`, `pricing-rules`, `templates`, `guide`, `archived`. Slug `dashboard` redirects to `/packages`.

---

## 9. File and function catalog

### 9.1 Server

| File | Exports | Purpose |
|---|---|---|
| `server/index.ts` | *(none; `start()` invoked)* | Bootstrap. Internal: `buildServer`, `start` |
| `server/plugins/auth.ts` | `registerAuthPlugin` | JWT + `app.authenticate` |
| `server/lib/audit.ts` | `getRequestAudit`, `requireSuperAdmin` | Audit user; 403 unless Super Admin |
| `server/lib/errors.ts` | `sendRouteError` | DB → 503, else 500 |
| `server/jobs/blog-publish-scheduler.ts` | `startBlogPublishScheduler` | Cron publisher |
| `server/routes/auth.ts` | `registerAuthRoutes` | signup / login / me |
| `server/routes/packages.ts` | `registerPackageRoutes` | Package CRUD, quotes, email |
| `server/routes/categories.ts` | `registerCategoryRoutes` | Package category CRUD |
| `server/routes/users.ts` | `registerUserRoutes` | Staff CRUD |
| `server/routes/pricing-rules.ts` | `registerPricingRulesRoutes` | Pricing rule CRUD |
| `server/routes/package-templates.ts` | `registerPackageTemplateRoutes` | Templates + apply |
| `server/routes/blogs.ts` | `registerBlogRoutes` | Blog posts |
| `server/routes/blog-categories.ts` | `registerBlogCategoryRoutes` | Blog categories |
| `server/routes/pages.ts` | `registerPageRoutes` | CMS pages |
| `server/routes/dashboard.ts` | `registerDashboardRoutes` | Overview |
| `server/routes/enquiries.ts` | `registerEnquiryRoutes` | `tbl_message` inbox |
| `server/routes/settings.ts` | `registerSettingsRoutes` | Singleton settings |
| `server/routes/media.ts` | `registerMediaRoutes` | Multipart upload |
| `server/routes/permissions.ts` | `registerPermissionRoutes` | Roles + user overrides |
| `server/routes/suppliers.ts` | `registerSupplierRoutes` | Supplier CRUD |
| `server/routes/legacy-assets.ts` | `registerLegacyAssetRoutes` | Image proxy |

Internal helpers in routes (not exported): `parseStatus`, `parseRole`, `parseScope`, `parseType`, `parseSort`, `parseChartDays`, `parseRelationship`, `parseTemplateType`, `canManageAccess`, `requireAccessManager`, `extensionFor`, `readLocalAsset`, `fetchRemoteAsset`, etc.

### 9.2 `src/lib` — shared / server repositories / browser clients

#### Infrastructure

| File | Key exports |
|---|---|
| `db.ts` | `getDbConfig`, `getPool`, `isDbConnectionError`, `verifyDbConnection`, `query`, `DB_TIME_ZONE` |
| `utils.ts` | `cn` (clsx + tailwind-merge) |
| `slug.ts` | `slugify`, `uniqueSlug` |
| `format-date.ts` | `SGT_TIME_ZONE`, `nowMysqlDateTimeSgt`, `toValidDate`, `formatPackageDate`, `formatPackageDateTime`, `formatPackageDateTimeSgt`, `formatPackageTime`, `toDatetimeLocalValue`, `fromDatetimeLocalValue` |
| `parse-api-response.ts` | `parseApiResponse<T>` — JSON + friendly 502/HTML errors |
| `audit-context.ts` | `AUDIT_USER_HEADER`, `DEFAULT_AUDIT_USER`, `resolveAuditUser`, `auditContextFromHeader` |
| `constants.ts` | `NAV_ITEMS`, `STEPS`, `GUIDE_ITEMS` |
| `types.ts` | `NavItem`, `Step`, `SupplierFormData` |
| `email-list.ts` | `parseEmailList`, `isValidEmail`, `formatEmailList`, `validateEmailList` |
| `email.ts` | `isEmailConfigured`, `buildEmailHtml`, `sendMail` (**server only**) |
| `validation.ts` | Zod schemas for wizard step 1–2, categories, pricing rules, suppliers, templates, blogs, blog categories, pages |

#### Auth

| File | Key exports |
|---|---|
| `auth-config.ts` | `BCRYPT_ROUNDS`, storage keys, `getJwtSecret`, `getJwtExpiresIn` |
| `auth-types.ts` | `AdminUser`, `AuthTokenPayload`, `SignupInput`, `LoginInput`, `AuthResponse` |
| `auth-storage.ts` | `getStoredToken`, `setStoredAuth`, `getStoredUser`, `clearStoredAuth`, `getUserInitials` |
| `auth-validation.ts` | `signupSchema`, `loginSchema`, `createUserSchema`, `updateUserSchema` |
| `auth-api.ts` | `signupRequest`, `loginRequest`, `fetchCurrentUser`, `getAuthHeadersForApi` |
| `auth-repository.ts` | `countAdminUsers`, `getAdminUserStats`, `listAdminUsers`, `findAdminUserById`, `deleteAdminUser`, `updateAdminUser`, `createAdminUserByAdmin`, `findAdminByEmail`, `findAdminById`, `createAdminUser`, `verifyAdminPassword`, `touchAdminLastLogin`, `toAuthTokenPayload` |

#### Permissions / users

| File | Key exports |
|---|---|
| `permission-types.ts` | `ACCESS_MODULES`, `ACCESS_MODULE_KEYS`, `NAV_HREF_MODULE`, `PACKAGE_STEP_PERMISSION_KEYS`, `defaultPermissionForRole`, `buildDefaultMatrix`, `hasModulePermission` |
| `permission-api.ts` | `getPermissions`, `getMyPermissions`, `getUserPermissions`, `updateUserPermissions`, `resetUserPermissions`, `updateRolePermissions`, `resetRolePermissions`, `renameRole`, `deleteRole` |
| `permission-repository.ts` | `ensureRolePermissionsSeeded`, `getPermissionsPayload`, `getRolePermissionMatrix`, `getUserPermissionOverrides`, `setUserPermissionOverrides`, `clearUserPermissionOverrides`, `getEffectivePermissionMatrix`, `diffFromRoleDefaults`, `updateRolePermissions`, `resetRolePermissions`, `renameRole`, `deleteRole` |
| `role-catalog.ts` | `normalizeRoleKey`, `isValidRoleKey`, `getKnownRolesFromStorage`, `rememberKnownRoles`, `rememberKnownRole`, `setKnownRoles`, `forgetKnownRole`, `replaceKnownRole` |
| `user-types.ts` | Filters, `ROLE_LABELS`, `formatRoleLabel` |
| `user-api.ts` | `getUserStats`, `listUsers`, `createUser`, `updateUser`, `deleteUser` |

#### Packages

| File | Key exports |
|---|---|
| `package-types.ts` | All wizard JSON types, `PackageRecord`, `PACKAGE_STEP_FIELDS`, status helpers |
| `package-modules.ts` | `PACKAGE_MODULES`, `PACKAGE_MODULE_SLUGS` |
| `package-api.ts` | `createPackage`, `updatePackage`, `getPackage`, `listPackages`, `listAllPackages`, `getPackageStats`, `listExpiringPackages`, `listSupplierQuoteRequests`, `deletePackage`, `archivePackage`, `duplicatePackage`, `sendSupplierQuoteEmail`, `getPackageEditHref`, `isWizardPackage`, `getPackageRecordKey` |
| `package-repository.ts` | `listTblPackages`, `listPackages`, `getPackageById`, `createPackage`, `updatePackage`, `deletePackage`, `deleteLegacyPackage`, `archiveLegacyPackage`, `listAllPackages`, `getPackageStats`, `listExpiringPackages`, `listSupplierQuoteRequests`, `listRecentlyPublishedPackages` |
| `package-images.ts` | `normalizeLegacyImagePath`, `getPackageImagePath`, `resolvePackageImageUrl`, `resolvePackageProxyUrl`, `getPackageImageUrl`, `getPackageImageSources` |
| `package-detail-sections.ts` | `PACKAGE_DETAIL_SECTIONS`, `getFieldLabel` |

#### Templates / categories / pricing

| File | Key exports |
|---|---|
| `package-template-api.ts` | `getPackageTemplateStats`, `listPackageTemplates`, `getPackageTemplate`, `createPackageTemplate`, `updatePackageTemplate`, `deletePackageTemplate`, `applyPackageTemplate`, `listActiveTemplates` |
| `package-template-repository.ts` | Same operations + `resolveTemplateSlug`, `buildApplyTemplatePayload`, `listActiveTemplateOptions` |
| `category-api.ts` | `listCategories`, `getCategory`, `createCategory`, `updateCategory`, `deleteCategory`, `listActiveCategories` |
| `category-repository.ts` | Same + `resolveCategorySlug`, `syncPackageCategories`, `getPackageCategoryIds`, `getPackageCategoryNames`, `listActiveCategoryOptions` |
| `pricing-rules-api.ts` | `listPricingRules`, `getPricingRulesStats`, `getDefaultPricingRule`, `getPricingRule`, CRUD |
| `pricing-rules-repository.ts` | Matching SQL CRUD |

#### Content (blogs, pages)

| File | Key exports |
|---|---|
| `blog-api.ts` | `listBlogPosts`, `getBlogStats`, `listBlogAuthors`, `getBlogPost`, CRUD |
| `blog-repository.ts` | Same + `resolveBlogPostSlug`, `publishDueScheduledBlogPosts` |
| `blog-modules.ts` | `BLOG_MODULES` |
| `blog-category-api.ts` / `blog-category-repository.ts` | Blog category CRUD + slug resolve |
| `page-api.ts` | `listPages`, `getPageStats`, `getPage`, CRUD |
| `page-repository.ts` | Same + `resolvePageSlug` |
| `page-modules.ts` | `PAGE_MODULES` |

#### Suppliers / enquiries / dashboard / settings / media / promotions

| File | Key exports |
|---|---|
| `supplier-api.ts` | `listSuppliers`, `getSuppliersStats`, `listSupplierCountries`, CRUD |
| `supplier-repository.ts` | Matching SQL |
| `supplier-types.ts` | Status/relationship enums, service helpers, `buildSupplierSummary` |
| `supplier-excel.ts` | `suppliersToExcelCsv`, `downloadSuppliersExcel` |
| `supplier-quote-email.ts` | `buildQuoteEmailSubject`, `buildQuoteEmailBody` |
| `enquiry-api.ts` | `getEnquiryStats`, `listEnquiries`, `getEnquiry`, `updateEnquiryStatus`, `deleteEnquiry` |
| `enquiry-repository.ts` | SQL on `tbl_message` |
| `enquiry-types.ts` | `enquiryDisplayName`, `enquiryTypeLabel`, `isEnquiryOpen` |
| `dashboard-api.ts` | `getDashboardOverview` |
| `dashboard-repository.ts` | `getDashboardOverview` (server) |
| `dashboard-data.ts` | `STAT_CARD_CONFIG`, `QUICK_ACTIONS`, `buildStatCards`, `formatRelativeTime`, `mapActivities` |
| `settings-api.ts` | `getSettings`, `updateSettings` |
| `settings-repository.ts` | `getAdminSettings`, `updateAdminSettings` |
| `media-api.ts` | `uploadMediaFile` |
| `promotion-types.ts` | `SAMPLE_PROMOTIONS`, `packageOptionKey` — **no API** |

### 9.3 Components (feature files)

**Layout:** `AdminShell`, `Sidebar` (filters nav with `can(module, "view")`), `Header` (search, enquiry notifications, logout), `BrandLogo`, `ListPageHeader`.

**Auth:** `AuthProvider` / `useAuth`, `PermissionsProvider` / `usePermissions`, `RouteGuard`, `AuthLayout`.

**Wizard (`components/package/`):** `PageHeader`, `Stepper`, `ProgressCard`, `GuideCard`, `PackageAuditCard` (`formatAuditSummary`), `PackageRichTextEditor`, `DuplicatePackageModal`, plus one form per step: `SupplierForm`, `PackageBasicsForm`, `MediaFrontendForm`, `PricingForm`, `ItineraryForm`, `HotelsForm`, `InclusionsForm`, `BookingPolicyForm`, `ConsultantViewForm`, `SupplierQuoteTool`, `FrontEndFaqsForm`, `SalesAdsAssetsForm`, `SeoForm`, `ReviewPublishForm`. Shared: `StepFormBaseProps`, `PACKAGE_STEP_SAVE_SELECTOR`.

**List panels:** `*Panel`, `*ListTable`, `*Form`, `*DetailsModal`, `*StatsGrid` for packages, blogs, pages, suppliers, categories, templates, pricing rules, enquiries, users.

**Settings access-control:** `RolesPanel`, `RoleManagementDesignPanel`, `useRolePermissions`, `useEmployeeOverrides`, `RoleManagementSection`, `RoleFormModal`, `PermissionMatrixSection`, `EmployeeAccessDrawer`, `UserDesignationManagementSection`, `ActivityLogTable` (UI-only log).

**UI primitives (`components/ui/`):** Alert, AlertDialog, Badge, Button, Card, Checkbox, Dialog, DropdownMenu, Icon, Input, Label, NativeSelect, Popover, RadioGroup, Select, Separator, Sheet, Skeleton, Toaster, Switch, Table, Tabs, Textarea, ToggleSwitch, Tooltip.

### 9.4 App pages

Each `src/app/**/page.tsx` is a thin client wrapper around a panel, except login/signup (forms) and `add-package/page.tsx` (wizard orchestrator: load, save, step change, template apply, duplicate).

---

## 10. Error catalog

### 10.1 There are no application error IDs

The codebase does **not** define codes such as `ERR_AUTH_001` or `FT-404`. Clients must branch on:

1. **HTTP status**
2. JSON body `{ error: string }` (sometimes also `{ message }`, `{ details }` for Zod)
3. Node/MySQL **driver codes** on the server (`ECONNREFUSED`, `PROTOCOL_CONNECTION_LOST`)

`parseApiResponse` maps failed responses to `Error.message = body.error` (or `"Validation failed"` if `details` is present).

### 10.2 HTTP statuses used by the API

| Status | When |
|---|---|
| **200** | Success (GET/PATCH/PUT/DELETE) |
| **201** | Created (signup, most POSTs) |
| **400** | Bad id, bad query, Zod validation, business rule |
| **401** | Missing/invalid JWT, bad login |
| **403** | Not Super Admin / not access manager |
| **404** | Resource not found |
| **409** | Duplicate email / name / role |
| **500** | Uncaught / repository throw |
| **503** | MySQL down, or email not configured (quote send) |

### 10.3 Global / infrastructure

| Status | Message | Meaning |
|---|---|---|
| 503 | `Database is unavailable. Start MySQL and try again.` | `isDbConnectionError` — `ECONNREFUSED` or `PROTOCOL_CONNECTION_LOST` |
| 500 | `Internal server error` | Unhandled non-Error throw |
| 500 | *(Error.message)* | Unhandled `Error` (global handler) |
| 401 | `Unauthorized` | JWT missing or invalid (`app.authenticate`) |
| 403 | `Forbidden` + `Only Super Admin can perform this action` | `requireSuperAdmin` |
| 403 | `Forbidden` + `Only Super Admin or Owner can manage roles` | `requireAccessManager` (permissions routes) |

**Client-side (`parseApiResponse`) when the proxy returns HTML/502:**

| Thrown message | Meaning |
|---|---|
| `Invalid JSON response from server` | `Content-Type: json` but body is not JSON |
| `API server is unavailable. Make sure the backend is running on port 4000.` | 502/503 or plain `Internal Server Error` |
| `API route not found (N). Restart the dev server if you recently added new API routes.` | HTML 404 from Next instead of Fastify |
| `Unexpected non-JSON response from server` | Success-looking non-JSON |
| `Validation failed` | `{ details }` without `error` |
| `Request failed (N)` | Fallback |

**Auth React hooks:**

| Thrown message | Meaning |
|---|---|
| `useAuth must be used within AuthProvider` | Hook used outside provider |
| `usePermissions must be used within PermissionsProvider` | Same |

### 10.4 Auth (`/api/auth`)

| Status | Message | Meaning |
|---|---|---|
| 400 | Zod field errors in `details` | Invalid signup/login body |
| 409 | `An account with this email already exists` | Signup email taken |
| 401 | `Invalid email or password` | Bad password, unknown email, **or inactive user** (same message on purpose) |
| 401 | `Unauthorized` | `/me` with bad/missing user |

Repository: `Failed to create admin user` → 500.

### 10.5 Users (`/api/users`)

| Status | Message | Meaning |
|---|---|---|
| 400 | `Invalid user ID` | Non-numeric `:id` |
| 400 | `You cannot deactivate your own account` | Self disable |
| 400 | `You cannot change your own role` | Self role patch |
| 400 | `You cannot delete your own account` | Self delete |
| 400 | `Cannot delete the last active Super Admin` | Last Super Admin protection |
| 400 | (Zod / last-Super-Admin demote text) | Role/active guards |
| 404 | `User not found` | |
| 409 | `An account with this email already exists` | Create duplicate |

### 10.6 Generic resource IDs (pattern repeated across domains)

Replace `X` with the resource:

| Status | Message |
|---|---|
| 400 | `Invalid package id` / `Invalid blog post ID` / `Invalid category ID` / `Invalid page ID` / `Invalid template ID` / `Invalid pricing rule ID` / `Invalid supplier ID` / `Invalid enquiry ID` / `Invalid user id` |
| 400 | `Invalid status filter` (packages) |
| 404 | `Package not found` / `Blog post not found` / `Category not found` / `Page not found` / `Template not found` / `Pricing rule not found` / `Supplier not found` / `Enquiry not found` |

### 10.7 Packages extra

| Status | Message | Meaning |
|---|---|---|
| 400 | `Unsupported update for legacy package` | PATCH legacy with anything other than archive |
| 400 | `At least one recipient is required` | Quote email with empty `to` |
| 400 | Zod `details` | Quote payload invalid |
| 503 | Email-not-configured message | `isEmailConfigured()` false |

### 10.8 Enquiries extra

| Status | Message |
|---|---|
| 400 | `Status must be open or closed` |

### 10.9 Media

| Status | Message | Meaning |
|---|---|---|
| 400 | `No file uploaded` | Empty multipart |
| 400 | (unsupported type text) | MIME not in image/video allow-list |
| 400 | `Upload aborted or file too large` | > 80 MB or aborted stream |

### 10.10 Legacy assets

| Status | Message |
|---|---|
| 400 | `Image url is required` |
| 400 | `Asset path is required` |
| 404 | `Asset not found` |

### 10.11 Permissions extra

| Status | Message | Meaning |
|---|---|---|
| 400 | `Invalid role` | Role slug failed Zod |
| 400 | `This role cannot be renamed` / `cannot be deleted` | Protected: `admin`, `super_admin`, `owner` |
| 400 | Unknown module key in body | Not in `ACCESS_MODULE_KEYS` |
| 409 | `A role with that name already exists` | Rename collision |

### 10.12 Settings

| Status | Message |
|---|---|
| 400 | Zod / `validateEmailList` text for quote CC/BCC |

### 10.13 Repository throws (surface as HTTP 500 unless mapped to 409)

These `throw new Error(...)` strings become `{ error: "<message>" }` on 500 (or 409 when the route catches duplicates):

| Message | Source |
|---|---|
| `Unable to generate a valid slug` | blog / blog-category / page / category / template slugify |
| `Schedule date/time (SGT) is required for scheduled posts` | `blog-repository` |
| `Blog title is required` | `blog-repository` |
| `Failed to load blog post after create` | `blog-repository` |
| `Category name is required` | category + blog-category repos |
| `A category with this name already exists` | same (often mapped 409) |
| `Failed to load category after create` | same |
| `Page title is required` | `page-repository` |
| `Failed to load page after create` | `page-repository` |
| `Template name is required` | `package-template-repository` |
| `A template with this name already exists` | same |
| `Failed to load template after create` | same |
| `Only active templates can be applied` | apply endpoint → 400 |
| `Rule name is required` | `pricing-rules-repository` |
| `A pricing rule with this name already exists` | same |
| `Failed to load pricing rule after create` | same |
| `Company name is required` / `Country is required` | `supplier-repository` |
| `Failed to load created supplier` | `supplier-repository` |
| `Failed to load package after create` | `package-repository` |
| `Cannot delete the last active Super Admin` | `auth-repository` |
| `Failed to create admin user` | `auth-repository` |
| `JWT_SECRET must be set ...` | `getJwtSecret()` in production |
| Graph/SMTP send failures | `email.ts` (`Failed to get Graph access token`, `Graph sendMail failed`, `Microsoft Graph is not configured`) |

### 10.14 Node / MySQL driver codes (server-side only)

| Code | Meaning in this app |
|---|---|
| `ECONNREFUSED` | MySQL not running → treated as 503 |
| `PROTOCOL_CONNECTION_LOST` | Dropped MySQL connection → 503 |
| Duplicate key `ER_DUP_ENTRY` | Usually wrapped as 409 “already exists” on email/name, otherwise 500 |

---

## 11. Authentication and permissions

### Login flow

```
POST /api/auth/login
  → findAdminByEmail → bcrypt compare + is_active
  → touchAdminLastLogin → jwtSign({ sub, email, name, role })
  → localStorage ft_admin_token / ft_admin_user
```

- No refresh token. No logout/revoke endpoint (client clears storage).
- JWT role is **not** re-read from DB on each request except `GET /api/auth/me`. Role changes apply to the API after re-login (UI may refresh via `/me`).

### Frontend tree

```
RootLayout
  └─ AppProviders
       ├─ AuthProvider          localStorage + /api/auth/me
       │    └─ PermissionsProvider   GET /api/permissions/me
       │         ├─ RouteGuard       login required (not module ACL)
       │         └─ Toaster
```

**RouteGuard** public paths: `/login`, `/signup` only. Authenticated users hitting those go to `/`. Unauthenticated users on private paths go to `/login?next=`.

**`can(moduleKey, action)`:** Super Admin with an empty matrix fail-opens to `true`. Otherwise `hasModulePermission`. Sidebar uses `NAV_HREF_MODULE`. **Promotions is not mapped**, so it always shows. Wizard steps use `PACKAGE_STEP_PERMISSION_KEYS`.

### Permission module keys

**Panel:** `dashboard`, `blogs`, `blog_categories`, `pages`, `packages`, `package_categories`, `suppliers`, `pricing_rules`, `package_templates`, `media`, `enquiries`, `settings`, `users`, `roles`.

**Package builder:** `supplier_source`, `package_basics`, `media_frontend`, `pricing`, `itinerary`, `hotels`, `inclusions`, `exclusions`, `booking_policy`, `consultant_view`, `supplier_quote_tool`, `frontend_faqs`, `sales_ads_assets`, `seo`, `review_publish`.

`exclusions` is a permission key only — there is no `add_package.exclusions` column (exclusions live inside `inclusions` JSON).

**Default matrix:** `super_admin` all true. Other roles: view+edit on most modules, **no** view/edit/delete on `users` and `roles`, **no** delete anywhere else until granted.

**API enforcement vs UI:** deletes of categories, pricing rules, templates, blogs, blog categories, pages, suppliers, and all user writes require Super Admin. Role CRUD requires Super Admin or Owner. Package delete and enquiry delete are JWT-only.

---

## 12. Package wizard (14 steps)

**Route:** `/add-package` (`src/app/add-package/page.tsx`)

| Query | Meaning |
|---|---|
| `?id=` | Existing `add_package.id` |
| `?step=1–14` | Jump to a form |
| `?templateId=` | Apply template, `createPackage`, rewrite URL to `?id=` |

**Persistence:** first save → `POST /api/packages` → URL gains `?id=`. Later saves → `PATCH` with the JSON field from `PACKAGE_STEP_FIELDS`. Save Draft clicks `[data-package-step-save]` and forces `status: "draft"`.

| Step | Title | Department | Form | JSON column |
|---|---|---|---|---|
| 1 | Supplier Source | Product | `SupplierForm` | `supplier_source` |
| 2 | Package Basics | Product | `PackageBasicsForm` | `package_basics` |
| 3 | Media & Front-End | Product + Marketing | `MediaFrontendForm` | `media_frontend` |
| 4 | Pricing | Product + Finance | `PricingForm` | `pricing` |
| 5 | Itinerary | Product | `ItineraryForm` | `itinerary` |
| 6 | Hotels | Product + Ops | `HotelsForm` | `hotels` |
| 7 | Inclusions | Product | `InclusionsForm` | `inclusions` |
| 8 | Booking Policy | Ops + Finance | `BookingPolicyForm` | `booking_policy` |
| 9 | Consultant View | Sales Lead | `ConsultantViewForm` | `consultant_view` |
| 10 | Supplier Quote Tool | Consultants | `SupplierQuoteTool` | `supplier_quote_tool` |
| 11 | Front-End FAQs | Product + SEO | `FrontEndFaqsForm` | `frontend_faqs` |
| 12 | Sales & Ads Assets | Marketing + Sales | `SalesAdsAssetsForm` | `sales_ads_assets` |
| 13 | SEO | SEO Team | `SeoForm` | `seo` |
| 14 | Review & Publish | Final Approver | `ReviewPublishForm` | `review_publish` |

Step 14 actions: save draft / submit → `pending_review` / publish → `published`. Templates copy steps 1–13 only. Duplicate creates a new draft titled `Copy of …`.

Wizard packages and legacy `tbl_packages` rows can share numeric IDs. The UI keys records as `wizard-{id}` / `legacy-{id}` (`getPackageRecordKey`).

---

## 13. Scripts, seeds, and migrations

| npm script | SQL / JS | Effect |
|---|---|---|
| `db:init` | `init-db.sql` | Create `add_package` (needs `tbl_packages`) |
| `db:migrate:audit` | `migrate-add-audit-fields.sql` | `created_by` / `updated_by` on wizard |
| `db:migrate:admin` | `migrate-add-admin-users.sql` | `admin_users` |
| `db:migrate:admin-role-string` | alter role column to `VARCHAR` | Custom roles |
| `db:migrate:permissions` | `migrate-add-permissions.sql` | `role_permissions` |
| `db:migrate:permissions-role-string` | alter role column | |
| `db:migrate:user-permissions` | `migrate-add-user-permissions.sql` | `user_permissions` |
| `db:migrate:categories` | package categories + map | |
| `db:migrate:pricing-rules` | `pricing_rules` | |
| `db:migrate:templates` | `package_templates` | |
| `db:migrate:settings` | `admin_settings` | |
| `db:migrate:quote-emails` | CC/BCC columns | |
| `db:migrate:blogs` | `blog_categories` + `blog_posts` | |
| `db:migrate:blog-scheduled` | add `scheduled` to post status | |
| `db:migrate:pages` | `cms_pages` | |
| `db:migrate:suppliers` | `suppliers` | |
| `db:seed:suppliers` | sheet import | |
| `admin:seed` | bootstrap Super Admin | |
| `test:audit` / `test:categories` | HTTP smoke tests | |

Other SQL without a dedicated npm alias (run the matching `run-migrate-*.mjs` or the SQL by hand): `migrate-add-deleted-status.sql`, `migrate-alter-supplier-relationship-status.sql`, `migrate-alter-supplier-active-status.sql`.

Tooling: `ensure-mysql.mjs` (dev wait), `check-db.mjs`, `copy-tinymce.mjs`, `promote-super-admin.mjs`, `migrate-to-shadcn.mjs` (one-off).

---

## 14. Deployment

**Docker (dev):** `docker-compose.yml` — MySQL 8 (`fz`/`fz`) + app, ports 3000/4000/3306, `uploads` volume. Entrypoint runs `init-db.mjs` unless `SKIP_DB_INIT=true`.

**Docker (prod):** `docker-compose.prod.yml` — app only, `.env.production`, bind `127.0.0.1:3000` and `:4000`.

**Apache:** `apache-ftpadmin.conf`

| Public path | Upstream |
|---|---|
| `/panel/` | Next.js `:3000/panel/` |
| `/_next/` | Next.js `:3000/_next/` |
| `/api/` | Fastify `:4000/api/` |
| `/uploads/` | Fastify `:4000/uploads/` |

The public Fayyaz site stays on `/`. `X-Forwarded-Proto` / `X-Forwarded-Host` are set for the app.

**Dockerfile:** Node 22 Alpine, `npm ci` + `next build`, runner copies `.next`, `src`, `server`, `scripts`, installs `tsx` + `concurrently`, exposes 3000 + 4000, CMD starts API + web.

---

## 15. Conventions and known gaps

**Conventions**

- New tables: `BIGINT UNSIGNED` PKs, `TIMESTAMP`, audit **names**, JSON step blobs.
- Legacy `tbl_*`: `INT` PKs, `DATETIME` `insert_date`/`edit_date`, integer `status` (`2` often means hidden/closed).
- Dates in the admin UI are **Singapore time** (`Asia/Singapore`, `+08:00`), even though `admin_settings.timezone` defaults to `Asia/Kolkata`.
- Browser talks to Fastify via `*-api.ts`. Repositories stay on the API process.
- Soft-delete for wizard packages is `status = 'deleted'` (not a `deleted_at` column).

**Known gaps / drift**

1. **No error-ID system** — see §10.
2. **Promotions** has UI + `SAMPLE_PROMOTIONS` only; no table, repository, or API.
3. **Module ACL is UI-only** — a JWT can call most write APIs regardless of `can_edit`.
4. **Package / enquiry DELETE** are not Super-Admin-gated.
5. **`add_package.status` `deleted`** must be applied via `migrate-add-deleted-status.sql`. If that migration is missing, soft-delete writes fail.
6. **`user_permissions.user_id`** is `INT` vs `admin_users.id` `BIGINT`; no FK.
7. **Signup is public** — first account is Super Admin; lock this down in production if the panel is reachable.
8. **Uploads are public** if the URL is known (`GET /uploads/**` has no JWT).
9. **JWT secret** has a hardcoded development fallback; production must set `JWT_SECRET`.
10. **`exclusions` permission key** does not map to a wizard column.
11. **ActivityLogTable** in role management is local UI state, not an audit table.
12. Legacy website tables (`tbl_post`, `tbl_user`, …) are **not** the admin blogs/users.

---

## Appendix A — npm scripts (from `package.json`)

`dev`, `dev:api`, `dev:web`, `build`, `build:api`, `start`, `start:api`, `lint`, `db:init`, `db:migrate:audit`, `db:migrate:admin`, `db:migrate:admin-role-string`, `db:migrate:permissions-role-string`, `db:migrate:categories`, `db:migrate:pricing-rules`, `db:migrate:templates`, `db:migrate:settings`, `db:migrate:quote-emails`, `db:migrate:permissions`, `db:migrate:user-permissions`, `db:migrate:blogs`, `db:migrate:blog-scheduled`, `db:migrate:pages`, `db:migrate:suppliers`, `db:seed:suppliers`, `admin:seed`, `postinstall`, `test:audit`, `test:categories`.

## Appendix B — Wizard JSON ↔ `tbl_packages` sync (mental model)

```
Staff fills wizard
    → add_package JSON columns (source of truth for admin)
    → selected fields copied to tbl_packages (public catalogue stub)
    → package_category_map links add_package.id → package_categories
```

Legacy-only packages (rows in `tbl_packages` with no `add_package`) still appear in `/packages/all` via `listAllPackages` / `listTblPackages`. Editing them in the wizard is not supported; the UI can archive or delete them as legacy.

---

*End of document. When you add a module: table + migrate SQL + repository + route plugin + `*-api.ts` + `ACCESS_MODULES` entry + nav item.*
