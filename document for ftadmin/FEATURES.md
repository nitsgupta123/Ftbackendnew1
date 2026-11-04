# Fayyaz Travels Admin — How Every Feature Works

**Product:** Staff admin panel at `/panel`  
**Date:** 14 August 2026  
**Purpose:** Explain what each feature does, who uses it, the click-by-click flow, and what the system does behind the scenes.

This is a **functional** guide. For tables, APIs, and file names see `DOCUMENTATION.md`.

---

## How to read this guide

Each feature is described the same way:

| Heading | Meaning |
|---|---|
| **What it is** | Why the feature exists |
| **Who uses it** | Typical staff role |
| **How it works** | The live workflow |
| **What gets saved** | Database / email / files |
| **Limits** | What it does *not* do yet |

The panel URL in production is `https://fayyaz.travel/panel/...`. Paths below omit `/panel`.

**Status legend**

- **Live** — UI + API + database
- **UI only** — screens work in the browser but do not persist to MySQL
- **Partial** — some steps are real, some are display-only

---

## 1. Signing in and the admin shell

### 1.1 Login — Live

**What it is.** Gate to the whole panel.

**How it works**

1. Open `/login`.
2. Enter email and password. Password must be at least 8 characters with a letter and a number at signup; login only checks that the stored hash matches.
3. The API looks up `admin_users`, compares bcrypt, and rejects inactive accounts with the same message as a wrong password (`Invalid email or password`).
4. On success it writes `last_login_at`, returns a JWT (default 7 days) plus the user profile.
5. The browser stores `ft_admin_token` and `ft_admin_user` in `localStorage`.
6. You are sent to `?next=` (if you were kicked off a private page) or the dashboard.

There is **no forgot-password** flow and **no server logout**. Logout only clears localStorage.

### 1.2 Signup — Live (open registration)

**How it works**

1. Open `/signup`.
2. Enter full name, email, password.
3. If the email already exists → error.
4. **First account in the database becomes Super Admin.** Every later signup becomes `admin`.

In production this should be treated as a bootstrap path. Day-to-day staff should be created under User Management by a Super Admin.

### 1.3 Session guard — Live

Every page except `/login` and `/signup` requires a token. On load the app calls `/api/auth/me`. If the token is missing or expired you are redirected to login.

Logged-in users who open login/signup are sent to the dashboard.

### 1.4 Sidebar — Live (permission-filtered)

The left nav is built from `NAV_ITEMS`. Each link is shown only if the current user’s permission matrix has **view** on that module.

Parents stay visible if any child is visible. **Promotions is not mapped to a permission**, so it always appears.

Collapsed on small screens; hamburger in the header opens it.

### 1.5 Header search — Live

Type in the top search box. It matches:

- Package titles (wizard + legacy catalogue)
- Open enquiries (name / email)
- Quick links (Packages, Add Package, Enquiries, Suppliers, Blogs, Pages, Promotions)

Click a result to open that screen or the package editor.

### 1.6 Enquiry bell — Live

The bell loads recent **open** enquiries. Clicking a row opens Enquiry. This is a notification inbox, not a separate product.

### 1.7 User menu — Live

Shows your name and initials. **View site** opens the public website (`https://fayyaztravels.com` unless `NEXT_PUBLIC_FRONTEND_URL` is set). **Logout** clears the session and returns to login.

---

## 2. Dashboard — Live

**Path:** `/`  
**Who:** everyone with `dashboard` view.

**What you see**

1. Greeting using the signed-in first name.
2. **Stat cards** (each card is a link):
   - Total Pages → `/pages/all`
   - Total Destinations → package hub (counts live website destinations)
   - Total Packages → `/packages/all`
   - Total Testimonials → Enquiry (count only; testimonials are not managed here)
   - Total Blogs → `/blogs/all`
   - Total Products → `/packages/all` (legacy `tbl_products` count)
   - Newsletter subscribers → Enquiry (`tbl_message` rows of type `popupenquery`)
3. **Overview chart** — enquiry volume for Last 7 / 30 / 90 days (Singapore time).
4. **Recent activities** — latest packages, blogs, pages, enquiries, testimonials.
5. **Quick actions** — Add Package, Write Blog, Manage Packages, View Blogs, User Management, Settings.
6. **Content summary** — short counts strip.

**Behind the scenes.** One API call: `GET /api/dashboard?chartDays=7|30|90`. Numbers mix **admin tables** (pages, blogs, wizard packages) and **legacy website tables** (destinations, products, testimonials, messages).

---

## 3. Packages

This is the core product. A package can come from two places:

| Source | Meaning |
|---|---|
| **Wizard** | Built in this admin (`add_package`). Editable in 14 steps. |
| **Legacy** | Already on the public site (`tbl_packages`) with no wizard row. Can be listed, archived, or deleted — not opened in the 14-step editor. |

Creating a wizard package also inserts a **stub row** in `tbl_packages` so the public catalogue has an ID. Title, slug, images, and SEO are copied back as you save.

### 3.1 Package dashboard — Live

**Path:** `/packages`

Shows status counts, recently published packages, and a pipeline table. Counts include wizard + legacy (deleted wizard rows are hidden).

### 3.2 Package lists — Live

| Path | What you get |
|---|---|
| `/packages/all` | Combined catalogue (wizard + legacy) |
| `/packages/drafts` | Wizard drafts |
| `/packages/pending-review` | Submitted for approval |
| `/packages/archived` | Archived |
| `/packages/expiring-rates` | Packages whose pricing `validityTo` is within **30 days** |
| `/packages/supplier-quotes` | Packages that have Supplier Quote Tool data saved |

**On each row you can**

- **View** — read-only details modal (all 14 sections)
- **Edit** — wizard packages open `/add-package?id=...`. Legacy packages cannot use the wizard
- **Archive** — wizard sets `status = archived`; legacy sets `is_archive = 1`
- **Delete** — wizard **soft-deletes** (`status = deleted`, hidden from lists). Legacy **hard-deletes** the `tbl_packages` row (and the linked wizard row via CASCADE)

Search filters the table in the browser.

### 3.3 Add / edit package wizard — Live

**Path:** `/add-package`  
**Create:** empty wizard. **Edit:** `/add-package?id=123`. **From template:** `/add-package?templateId=4`. **Jump to a step:** `?step=7`.

**Who:** Product, Finance, Ops, Sales, SEO — each step is a permission. If you cannot **view** a step, it is disabled on the stepper. If you cannot **edit**, Save is blocked.

**Chrome around the form**

- Progress: “Step N of 14”
- Status dropdown: draft / pending review / published / archived (needs an existing id)
- **Use Template** — pick an active template; copies steps 1–13 into this package
- **Duplicate** — new draft titled `Copy of …`
- **Preview** — same details modal as the list
- **Save Draft** — saves the current step without advancing, forces `draft`

**Save behaviour**

1. First successful save calls `POST /api/packages` and the URL becomes `?id=...`.
2. Later saves `PATCH` only the JSON for that step (plus title/slug on step 2).
3. Steps 1–13 “Save & continue” move to the next step and update `current_step`.
4. Step 14 stays on 14 unless you Save Draft.

Audit names (`created_by` / `updated_by`) come from the logged-in user’s name.

---

### 3.4 The 14 wizard steps

#### Step 1 — Supplier Source (Product) — Live

Record **which vendor** this package comes from.

Typical fields: supplier name, contact person, emails, phone, country, notes. Emails from here are reused in Step 10 when sending a quote request.

Saved in `add_package.supplier_source` (JSON). This is **not** a foreign key to the Suppliers directory — it is a snapshot on the package. Staff can still type a name that exists in Suppliers.

#### Step 2 — Package Basics (Product) — Live

The catalogue identity: title, URL slug (auto from title, kept unique), duration, destinations/cities, short description, **package categories** (multi-select from active `package_categories`).

Title and slug are also written to `tbl_packages.p_name` / `p_slug`. Category links go to `package_category_map` using the **wizard id**.

#### Step 3 — Media & Front-End (Product + Marketing) — Live

Hero images (desktop + mobile), gallery, highlight video, front-end CTAs, WhatsApp click-to-chat.

Images can be uploaded through **Media upload** (`POST /api/media/upload` → `/uploads/images/...`) or pasted as a path. Legacy site images are shown via the legacy-asset proxy so old `tbl_packages` photos still load.

Hero paths sync to `tbl_packages.feature_img` / `desti_image`.

#### Step 4 — Pricing (Product + Finance) — Live

Two package types:

| Type | How rates are structured |
|---|---|
| **General** | Booking date ranges with hotel categories (3★ / 4★ / 5★) |
| **Fixed departure** | Departure months and specific dates, each with a status (active, guaranteed, limited, sold out, cancelled) |

For each hotel category you set:

- Adult price **tiers** (pax bands)
- Child / infant rows (with bed, without bed, infant)
- Promotions (percentage or fixed, with dates)
- Blackout dates

Also: validity from/to (this drives **Expiring Rates**), currency, notes.

Saved in `pricing` JSON. **Pricing Rules** (global markup / FX) are a separate settings module — they are **not auto-applied** into this form today. Staff use them as reference when filling rates.

#### Step 5 — Itinerary (Product) — Live

Day-by-day programme: day number, title, description (rich text), optional meals/location. Reorder and add/remove days.

#### Step 6 — Hotels (Product + Ops) — Live

Stay list: city, hotel name, nights, star rating, room type, notes. This is the operational hotel plan, separate from the 3★/4★/5★ **price** categories in Step 4.

#### Step 7 — Inclusions (Product) — Live

Three rich-text blocks: **Included**, **Excluded**, **Add-ons**. There is a permission key called `exclusions`, but exclusions live inside this step’s JSON, not a separate column.

#### Step 8 — Booking Policy (Ops + Finance) — Live

Payment terms, cancellation table (days before departure → penalty), amendment rules, visa notes, other legal copy.

#### Step 9 — Consultant View (Sales Lead) — Live

**Internal only** — not for the public site. Sales notes, talking points, margin hints, “do not promise” warnings, consultant FAQs.

#### Step 10 — Supplier Quote Tool (Consultants) — Live

Build a quote request for the vendor:

- Quote type, supplier to send to, based-on package, reply deadline
- Travel dates, adults/children/ages, hotel preference, rooming, meals
- Requested changes, negotiation note
- Toggles: include day-by-day itinerary, include client budget

**Send email**

1. Recipients default from Step 1 supplier emails; you can add more.
2. Subject/body are generated, then editable.
3. CC/BCC come from **General Settings** (`quote_cc_emails` / `quote_bcc_emails`).
4. `POST /api/packages/:id/supplier-quotes/send` sends via Microsoft Graph or SMTP.
5. A send snapshot (time, recipients, subject) is stored on the package JSON.

If mail is not configured the API returns 503. Packages with saved quote-tool data appear under **Supplier Quote Requests**.

#### Step 11 — Front-End FAQs (Product + SEO) — Live

Public Q&A list shown on the package page. Add/remove question + answer (rich text).

#### Step 12 — Sales & Ads Assets (Marketing + Sales) — Live

Ad headlines, short/long copy, selling points, sales-card snapshot text for consultants and ads teams.

#### Step 13 — SEO (SEO Team) — Live

Meta title, meta description, focus keyword, index/noindex style flags. Synced to `tbl_packages.meta_title`, `meta_keywords`, `meta_description`.

#### Step 14 — Review & Publish (Final Approver) — Live

**Real actions**

- Save as draft
- **Submit for review** → `pending_review` (shows on Pending Reviews)
- **Publish** → `published`

Reviewers / sign-off names can be stored on `review_publish` JSON.

**Health checks** scan saved section JSON and treat a step as complete when it has real saved details (including older field names). Images (any hero/card/gallery image, plus alt text on gallery assets), Pricing (hotel category rates or booking dates, plus older pax/display-price fields), SEO (meta title, description or focus keyword), and supplier contacts. Section cards and readiness % follow the same completeness rules. Publish and Submit stay clickable regardless of these flags.

---

### 3.5 Package templates — Live

**Path:** `/packages/templates`

Reusable skeletons so Product does not start from a blank wizard.

**How it works**

1. Create a template: name, slug, description, type **full** or **partial**, which steps 1–13 to include, paste JSON for those steps.
2. Mark one as **default** (the apply picker can highlight it).
3. From Add Package → **Use Template**, or open `/add-package?templateId=`.
4. Apply copies included steps into a **new** (or current) package, increments `usage_count`. Inactive templates cannot be applied.

Review & Publish is never copied. Super Admin is required to delete a template.

### 3.6 Package categories — Live

**Path:** `/packages/categories`

Taxonomy for merchandising (Domestic, Honeymoon, Cruise, …). Fields: name, unique slug, description, icon, hero image, display order, featured flag, SEO, active/inactive.

Linking happens in **Package Basics** (step 2). Deleting a category (Super Admin) removes map rows (CASCADE). Deleting a wizard package also clears its map rows.

### 3.7 Pricing rules — Live (reference data)

**Path:** `/packages/pricing-rules`

Finance’s **rule book**, not a calculator that overwrites Step 4.

Each rule has:

- Scope: global / destination / currency / supplier country
- Supplier currency → display currency (e.g. ZAR → SGD)
- Exchange rate: manual / auto / fixed, optional lock days
- Markup: percentage / fixed / tiered bands
- Minimum margin alert and finance-approval threshold

One rule can be **default**. Duplicate names are rejected. Super Admin deletes.

**How staff should use it today:** open the matching rule, then enter selling prices in Step 4 that honour markup and FX. Automatic application inside the pricing form is not wired yet.

### 3.8 Package guide — Live (static help)

**Path:** `/packages/guide`

Internal reminders: image size (1200px, 16:9, no watermarks), slug style, pricing/SEO notes. Not a CMS — text comes from `GUIDE_ITEMS` in code.

---

## 4. Blogs — Live

**Who:** Content / marketing.

Blogs in this admin are **new tables** (`blog_posts`, `blog_categories`). They are **not** the old website `tbl_post` rows.

### 4.1 Post list

| Path | Filter |
|---|---|
| `/blogs/all` | Everything |
| `/blogs/drafts` | `draft` |
| `/blogs/scheduled` | `scheduled` |
| `/blogs/published` | `published` |
| `/blogs/archived` | `archived` |

Search, category, author, sort, pagination. Stats at the top. Super Admin can delete; others edit/archive according to permissions (UI). Delete is Super Admin on the API.

### 4.2 Write / edit a post

**Paths:** `/blogs/new`, `/blogs/edit/[id]`

1. Title → slug auto-generated (unique).
2. Excerpt, TinyMCE body, featured image (media upload).
3. Category (from active blog categories), author name, tags.
4. Featured toggle.
5. SEO title/description.
6. **Status:**
   - **Draft** — work in progress
   - **Scheduled** — requires a **Singapore** publish datetime; the API cron (`BLOG_PUBLISH_CRON`, default every minute) flips it to `published` when `published_at <= now`
   - **Published** — live as far as this admin is concerned
   - **Archived** — retired

After save, the app routes you to the list that matches the new status.

**Important:** “Published” here means the row in `blog_posts` is published. The **public website must still be wired** to read this table. Until that integration exists, publishing in admin does not automatically change fayyaztravels.com.

### 4.3 Blog categories — Live

**Path:** `/blogs/categories`

Name, slug, description, order, SEO, active/inactive. Posts keep their body if a category is deleted (`category_id` SET NULL).

---

## 5. CMS pages — Live

**Who:** Content.

Same pattern as blogs, table `cms_pages`.

| Path | Filter |
|---|---|
| `/pages/all` | All |
| `/pages/new` | Create |
| `/pages/edit/[id]` | Edit |
| `/pages/drafts` / `published` / `archived` | By status |

**Fields:** title, unique slug, excerpt, HTML body, featured image, **page type** (about, contact, legal, landing, general), show in nav, display order, SEO, status, publish time.

Same caveat as blogs: this is the **admin CMS**. The public site shows these pages only after the website is pointed at `cms_pages`.

Delete is Super Admin on the API.

---

## 6. Suppliers — Live

**Path:** `/suppliers`  
**Who:** Product / Ops / relationship owners.

Vendor directory modelled on the internal supplier spreadsheet.

**Operational status:** Active / Inactive / Do not use  
**Relationship status:** New → under review → with issues → on probation → inactive → blacklisted, plus quality badges poor / average / good / excellent.

**How it works**

1. Stats grid (counts by operational status).
2. Filter by search, country, status, relationship; sort and paginate.
3. Create/edit: company, country, city/tour area, contacts, emails, phones, website, services (preset chips + custom services stored in the browser), notes, problems, bank/account details, TC POC, relationship owner, sheet date.
4. **Excel/CSV export** downloads the current list for offline use.
5. Super Admin can delete.

**Link to packages:** optional and by **name**, not ID. Step 1 of the wizard does not require picking a row from this table.

---

## 7. Promotions — UI only

**Path:** `/promotions`

The screen looks complete: list, create/edit form, discount type (percentage or fixed amount), date range, active flag, multi-select of real packages.

**What actually happens:** records live in React state seeded from `SAMPLE_PROMOTIONS`. Refreshing the page **loses new promotions**. There is no `promotions` table and no API.

Use this as a **preview of the intended workflow**, not as production discount management. Package-level promo rows inside **Step 4 Pricing** are the live place for slashed rates today.

---

## 8. Enquiries — Live

**Path:** `/enquiry`  
**Who:** Sales / customer service.

This is the inbox for the **public website contact forms**. Data is `tbl_message` (legacy). The admin does not create enquiries; the website does.

**Types**

| Website `message_type` | Label in admin |
|---|---|
| `contactus` | Contact Us |
| `popupenquery` | Popup / Newsletter |
| `contactus_visa` | Visa |
| `contactus_corporate` | Corporate |

**Status:** Open (`status ≠ 2`) or Closed (`status = 2`).

**How it works**

1. Stats: total, open, closed, this month, counts per type.
2. Search name/email; filter type and status; sort by date, name, or email.
3. Open a row → details: traveller names, phone, origin/destination (resolved from `tbl_destinations` when the stored value is a numeric id), dates, pax, budget, message, page URL, IP.
4. **Close** or **re-open** (PATCH).
5. **Delete** removes the website row (JWT only — not Super Admin gated).

The header bell shows the latest open items.

---

## 9. User management — Live (writes = Super Admin)

**Path:** `/user-management`

**How it works**

1. Anyone with `users` view can **see** the list and stats (active / inactive / Super Admins).
2. Only **Super Admin** sees **Add User** and can create, edit, or delete.
3. Create: full name, email, password, role (built-in or custom roles from Role Management).
4. Edit: name, role, active flag. You **cannot** deactivate yourself, change your own role, delete yourself, or demote/delete the **last** Super Admin.
5. Inactive users cannot log in.

Roles are free-form strings (`admin`, `super_admin`, `owner`, or custom like `package_manager`).

---

## 10. Settings

### 10.1 General settings — Live

**Path:** `/settings/general`

Singleton row (`admin_settings.id = 1`):

- Site name, company name
- Support email, phone, office address
- Timezone field (stored; **UI dates still use Singapore time**)
- Homepage title/description (stored for the public site to consume later)
- **Maintenance mode** flag (stored; this admin does not put the public site into maintenance by itself)
- **Quote CC / BCC** — comma-separated emails attached to every Supplier Quote Tool send

Save writes `updated_by` as the current user’s name.

### 10.2 Access Control — Live (role matrix)

**Path:** `/settings/roles`  
**Who can save:** Super Admin or Owner.

A checkbox grid:

- Rows = modules (Dashboard, Blogs, each package step, Users, Roles, …)
- Columns = **View / Edit / Delete**

Saving a role replaces `role_permissions`. Reset restores code defaults:

- Super Admin: everything
- Other roles: view+edit on most modules, **no** Users/Roles, **no** delete

**How this affects the product**

- Sidebar hides modules without **view**
- Wizard steps without **view** cannot be opened; without **edit** cannot be saved
- The **API does not re-check this matrix** on each package/blog call. A user who knows the HTTP API and has a valid JWT can still hit those endpoints. Super Admin (and Owner for roles) is the extra server-side lock for deletes and user/role admin.

### 10.3 Role management — Live (roles) / Partial (designations)

**Path:** `/settings/role-management`  
**Who:** Super Admin or Owner.

**Live**

- Create a custom role (slug like `finance_lead`)
- Rename / delete custom roles (`admin`, `super_admin`, `owner` are protected)
- Deleting a role **reassigns those users to `admin`**
- Open an employee → override **this person’s** view/edit/delete per module (stored in `user_permissions`). Clear overrides to fall back to the role

Effective access = role matrix, then user overrides win where they differ.

**Partial / UI-only**

- Designation, department, access-level labels on employee cards are local UI defaults
- The activity log on this page is **browser localStorage**, not a database audit table

---

## 11. Media uploads — Live

There is no standalone “Media library” page. Uploads happen inside forms (blog image, page image, package media).

**How it works**

1. Staff pick a file.
2. `POST /api/media/upload` with the JWT.
3. Images go to `uploads/images/`, videos to `uploads/videos/`.
4. Allowed: jpeg, png, gif, webp, svg, mp4, webm, ogg, quicktime. Max **80 MB**, one file.
5. Response URL `/uploads/...` is stored on the record.

Those URLs are **public** (no JWT) so the public site or an email can display them if the path is known.

Legacy website photos are loaded through `/api/legacy-assets/...` (JWT), which reads a local folder or fetches `https://fayyaztravels.com/...`.

---

## 12. Email (Supplier quotes) — Live when configured

Used only by Package Step 10 today.

**Send order**

1. Microsoft Graph if `GRAPH_CLIENT_ID` / secret / tenant are set
2. Else SMTP if `SMTP_HOST` is set
3. Else Ethereal test inbox in non-production

CC/BCC always merge from General Settings. Brand HTML wrapper is applied around the body.

---

## 13. Permissions — how a day in the office should feel

Example: a **Travel Consultant** role with view+edit on Enquiries, Supplier Quote Tool, Consultant View; view-only on Packages; no Users.

1. Login → dashboard (if dashboard view is on).
2. Sidebar shows Enquiry and maybe Packages, hides User Management.
3. They can open a package, reach Step 9–10, send a quote.
4. They cannot see Step 4 if Pricing view is off.
5. They cannot delete a blog even if they guess the URL **in the UI**; the API still requires Super Admin for most deletes.

Super Admin sees every nav item and can manage users and roles.

---

## 14. End-to-end scenarios

### A. Launch a new tour

1. (Optional) Ensure the supplier exists under **Suppliers**.
2. (Optional) Open **Pricing Rules** for that destination/currency.
3. **Add Package**, or apply a **Template**.
4. Fill steps 1–13. Save Draft anytime.
5. Step 10: email the supplier if rates are missing.
6. Step 14: Submit for review. Lead opens **Pending Reviews**, checks Preview, Publish.
7. Public catalogue stub in `tbl_packages` now has title/slug/SEO/images. Website listing still depends on the public site reading that row (and later the JSON).

### B. Publish a blog next Tuesday 09:00 SGT

1. **Blog Categories** — create “Travel Tips” if needed.
2. **Write New Blog** — body, image, category.
3. Status **Scheduled**, datetime Tuesday 09:00.
4. Save. Post sits on `/blogs/scheduled`.
5. API cron publishes it automatically after that time.
6. Public site shows it only if it reads `blog_posts`.

### C. Work an inbound lead

1. Customer submits Contact Us on the website → row in `tbl_message`.
2. Bell and Dashboard chart update.
3. Sales opens **Enquiry**, filters Open / Contact Us, reads details, Close when done.

### D. Onboard a finance user

1. Super Admin → **Role Management** → create `finance`.
2. **Access Control** → for `finance`, enable Pricing + Pricing Rules + Booking Policy; disable Users.
3. **User Management** → Add User with role `finance`.
4. They log in and only see those areas in the sidebar.

---

## 15. Feature status cheat sheet

| Feature | Status | Notes |
|---|---|---|
| Login / session / sidebar | Live | JWT in localStorage |
| Signup | Live | First user = Super Admin |
| Dashboard | Live | Mix of admin + legacy counts |
| Package wizard (14 steps) | Live | JSON in `add_package` |
| Step 14 health cards | Live | Reads saved section JSON (images, pricing, SEO, supplier) |
| Templates / categories / pricing rules | Live | Rules not auto-applied to Step 4 |
| Package archive / soft-delete | Live | Needs `deleted` ENUM migration |
| Legacy package list / archive / delete | Live | No wizard edit |
| Blogs + schedule cron | Live | Public site must consume table |
| Blog / page CMS | Live | Same public-site caveat |
| Suppliers + CSV export | Live | Not FK-linked to wizard |
| Promotions | **UI only** | Lost on refresh |
| Enquiries inbox | Live | Legacy `tbl_message` |
| Users | Live | Writes Super Admin only |
| General settings | Live | Maintenance flag is storage only |
| Role matrix + user overrides | Live | Enforced in UI; API uses JWT + Super Admin |
| Designation / activity log | Partial | Local UI |
| Media upload | Live | Public `/uploads` |
| Supplier quote email | Live | Needs Graph or SMTP |
| Forgot password / 2FA | **Not built** | |
| Public website publish pipeline | **Outside this repo** | Admin writes tables the site may still need to read |

---

## 16. What “published” means in this admin

| You click Publish on… | What is guaranteed |
|---|---|
| A **package** | `add_package.status = published` and catalogue fields on `tbl_packages` are updated. The **website** already lists `tbl_packages`; extra wizard JSON (itinerary, hotels, FAQs) appears on the site only after the public app is taught to read it. |
| A **blog** | `blog_posts.status = published` (or cron did it). Website must query `blog_posts`. |
| A **page** | `cms_pages.status = published`. Website must query `cms_pages`. |

The admin is the **system of record for staff**. The public site is a separate consumer.

---

*When a feature is marked UI only or Partial, do not promise it to operations as a source of truth. Use the Live column in §15.*
