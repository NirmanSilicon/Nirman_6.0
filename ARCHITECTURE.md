# EmbryoCase: Architecture

## 1. Overview

EmbryoCase is a monolithic, server-rendered Laravel 13 application for managing IVF embryo development records. It has two roles:

- **Admin**: central owner. Provisions embryologists, issues Special Keys, resets 2FA, sees all cases, reads the audit log, creates backups.
- **Embryologist**: owns cases. Uploads day-wise microscopy images, annotates, compares, writes observations, exports ZIPs.

```
Browser (Blade + Bootstrap 5 + vanilla JS + Fabric.js)
   │  HTML forms (CSRF)  /  fetch() JSON for annotation save
   ▼
routes/web.php ──► middleware: web, admin | embryologist
   ▼
Controllers (inline validation + inline ownership checks)
   │                     │
   ▼                     ▼
Eloquent models      Services
(SQLite / MySQL)     ├─ ImageStorageService  → storage/app/private/embryos/**
                     ├─ Google2FAService     → TOTP + QR (chillerlan/php-qrcode)
                     └─ OtpService + Mail    → email OTP (password reset)
   ▼
ActivityLog::record() on every meaningful action
```

**Stack:** PHP ^8.3, Laravel ^13.17, `chillerlan/php-qrcode` ^6, PHPUnit 12, Pint. Front end: Bootstrap 5.3 and Fabric.js 5.3, both vendored in `public/vendor/`, plus a hand-written `public/css/embryocase.css`. Vite 8 + Tailwind 4 are installed but only used by the default `welcome.blade.php`. Sessions, cache and queue use the database driver. Mail defaults to the `log` driver.

## 2. Directory layout

```
app/
  Console/Commands/EmbryoCaseInstall.php   embryocase:install (create/update admin)
  Http/
    Controllers/
      Auth/        AdminAuth, EmbryologistAuth, Otp (TOTP), ForgotPassword
      Admin/       AdminDashboard, EmbryologistManagement, ActivityLog, Backup
      EmbryoCaseController, EmbryoImageController, ImageComparisonController,
      ObservationController, EmbryologistDashboardController
    Middleware/    EnsureAdmin ('admin'), EnsureEmbryologist ('embryologist')
  Mail/OtpVerificationMail.php
  Models/          User, EmbryoCase, EmbryoImage, ImageAnnotation, AnnotationVersion,
                   Observation, ActivityLog, BackupLog, OtpVerification, SpecialKeyHistory
  Services/        ImageStorageService, Google2FAService, OtpService
bootstrap/app.php  routing, middleware aliases, JSON exception rendering
database/
  migrations/      users(+role/status/special_key), cache, jobs, embryocase tables, google2fa
  seeders/         DatabaseSeeder → EmbryoCaseSampleSeeder
public/
  css/embryocase.css, images/auth-bg-embryo.svg, vendor/{bootstrap,fabric}
resources/views/
  layouts/{app,auth}.blade.php
  auth/ cases/ images/ admin/ embryologist/ emails/
routes/web.php     all HTTP routes
tests/Feature/EmbryoCaseWorkflowTest.php
*.cmd              Windows wrappers around portable PHP in tools/ (gitignored)
```

## 3. Data model

```
users ─┬─< embryo_cases ─┬─< embryo_images ─┬─1 image_annotations ─< annotation_versions
       │   (user_id)     │   (case_id = PK) │
       │                 └─< observations ──┘ (image_id nullable)
       ├─< special_key_history (user_id, created_by)
       ├─< activity_logs (case_id = STRING code, not FK)
       ├─< backup_logs
       ├─< otp_verifications
       └─< users (created_by: admin who provisioned)
```

| Table | Key columns / notes |
|---|---|
| `users` | `role` (`admin`/`embryologist`), `status` (`active`/`inactive`/`suspended`), `special_key_hash` (bcrypt), `google2fa_secret` (plaintext base32), `google2fa_enabled`, `last_login_*`, `created_by` |
| `embryo_cases` | `case_id` unique `EMB-YYYY-NNNN`, `embryo_number`, `father_name`, `mother_name`, `collection_date/time`, `total_days` (default 6, can grow), `status` (`in_progress`/`completed`/`archived`), soft deletes |
| `embryo_images` | `case_id` → `embryo_cases.id`, `day_number`, `filename` (`HH-MM-SS.ext`), `storage_path`, `capture_time/date`, dimensions, `has_edit`, `edited_filename/storage_path`, `annotation_json_path`, soft deletes |
| `image_annotations` | latest Fabric JSON per image (`canvas_data`, `canvas_width/height`, `version`) |
| `annotation_versions` | immutable history row per save |
| `observations` | per case, optional `day_number` and `image_id` |
| `activity_logs` | `action`, `case_id` (string code), IP, UA, JSON `metadata`, no `updated_at` |
| `special_key_history` | `generated` / `regenerated` / `revoked` with `revoked_at` |
| `otp_verifications` | hashed 6-digit code, `purpose` (`login`/`password_reset`), attempts, 5-min expiry |
| `backup_logs` | `backup_type` (`full`/`database`/`images`), `status`, size |

**Case ID generation** (`EmbryoCase::generateCaseId`): takes the highest existing `EMB-{year}-` row (including trashed) plus one. Not concurrency-safe, but the `unique` constraint catches collisions.

**Derived helpers:** `EmbryoCase::today_development_day` (Day 1 = collection date) and `isTodayImageMissing()` drive the "pending today" panels on both dashboards.

## 4. Authentication and authorization

### 4.1 Login flows (as implemented)

```
Embryologist  /login
  Step 1  Name          → match active embryologists by case-insensitive name
                          session: embryo_auth_step=2, embryo_auth_name, embryo_auth_candidates[]
  Step 2  Special Key   → Hash::check against each candidate
                          session: embryo_auth_step=3, embryo_auth_user_id
  Step 3  Email         → must equal the matched user's email
                          session: pending_auth = {user_id, email, role}
  ──► /login/otp-verify (TOTP)

Admin  /login/admin
  Email                 → active admin with that email
                          session: pending_auth
  ──► /login/otp-verify (TOTP)

/login/otp-verify (OtpController)
  - getOrCreateSecret(user); render QR + manual key; first successful code sets google2fa_enabled
  - verifyKey(secret, code, window ±1 × 30s)  → Auth::login, regenerate session, log login_success
  - /login/otp-resend rotates the secret and sets google2fa_enabled=false
```

Rate limiting uses `RateLimiter`: admin email 5/5min, step 1 10/5min per IP, steps 2–3 7/5min. **Passwords are not checked in either login flow.** They are only used and changed in the forgot-password flow (email OTP, then new password, then all of that user's DB sessions are deleted).

A legacy all-in-one POST (`name` + `email` + `special_key` with no `step`) skips the wizard and goes straight to `pending_auth`.

### 4.2 Authorization

- `admin` middleware: authenticated, active, and `role === 'admin'`. Otherwise redirect or 403.
- `embryologist` middleware: authenticated and active (**admins also pass**).
- Per-resource ownership is checked inline in each controller: embryologists may only touch cases where `case.user_id === auth.id`. Admins bypass this.
- Admin case listing reuses `EmbryoCaseController@index`, switching the view on role.

### 4.3 Security posture notes

- Special keys, passwords and OTP codes are bcrypt-hashed. The TOTP secret is stored in plaintext and hidden from serialization.
- `ActivityLog::record` strips sensitive keys from metadata.
- **Known weaknesses:**
  1. The QR code and secret are shown to any `pending_auth` session, even for enrolled users, and `otp-resend` re-enrolls without proof of possession. With email-only admin login, this makes the admin account reachable with just an email address.
  2. Debug mode prints live codes on screen.
  3. Step 1 reveals whether an embryologist name exists.
  4. There is no password factor.

## 5. Image storage and annotation pipeline

### 5.1 On-disk layout (`local` disk → `storage/app/`)

```
storage/app/private/embryos/
  EMB-2026-0001/
    Day_1/
      09-00-00.png        ← original, byte-for-byte as uploaded (never modified)
      09-00-00_E.png      ← flattened annotated preview (PNG from canvas)
      09-00-00.json       ← Fabric.js vector JSON (re-editable)
      13-30-00.png
      13-30-00_1.png      ← collision suffix for same-second captures
    Day_2/ …
storage/app/temp_exports/  ← transient case ZIPs (deleted after send)
storage/app/backups/       ← admin backup ZIPs (kept)
```

### 5.2 Upload (`EmbryoImageController@upload`)

1. Validate `images[]` (jpg/jpeg/png/tiff/webp, ≤ 20 MB each) and `day_number`.
2. `ImageStorageService::storeOriginalImage` names the file from the manual `capture_time` or the current time (`HH-MM-SS`), de-duplicates it, stores it with `putFileAs`, reads dimensions with `getimagesize`, and derives `capture_date = collection_date + (day − 1)`.
3. Insert an `EmbryoImage` row and log `image_uploaded`. Returns JSON for AJAX requests, otherwise a redirect.

### 5.3 Serving (`images.serve`)

Streams from private storage after an ownership check, with `Cache-Control: private, no-store`. `?type=edited` serves the `_E.png`. Soft-deleted images stay servable for trash previews.

### 5.4 Annotation editor (`images/editor.blade.php`)

The original image is the Fabric canvas background. The left toolbar has select, pen, highlighter, line, arrow, circle, rect, IText and eraser. The top toolbar has undo/redo (JSON state stack), zoom, colour, stroke width, font size and save.

On save, the editor `fetch()`es `POST /images/{id}/annotations` with:

```
canvas_json      = JSON.stringify(canvas.toJSON())
canvas_width/height
flattened_image  = canvas.toDataURL(png)   // base64
```

The server writes `.json` and `_E.png`, upserts `image_annotations` (version + 1), inserts `annotation_versions`, sets `has_edit` and the paths on the image, and logs `image_annotated`.

### 5.5 Delete semantics

| Action | Effect |
|---|---|
| `DELETE /images/{id}` | soft delete (24 h trash) |
| `POST /images/{id}/restore` | restore if within 24 h, otherwise purge |
| `DELETE /images/{id}/force` | delete files, annotation and versions, then force-delete the row |
| `DELETE /images/{id}/edit` | delete only `_E.png` and `.json` and the annotation rows; original kept |
| `DELETE /cases/{id}/delete-day` | hard-delete that day's images, remove its folder, shift later days down by one (DB `day_number` and folder rename) |
| Trash purge | `purgeExpiredTrash()`, called lazily from `cases.show` and `restore` (no scheduler) |

> Known bug: after `delete-day` shifts folders, the stored `*_path` columns of shifted images still point to the old `Day_N` folder.

## 6. Feature modules

| Module | Controller / view | Notes |
|---|---|---|
| Embryologist dashboard | `EmbryologistDashboardController@index` → `embryologist/dashboard` | counts, recent cases, cases missing today's image |
| Case CRUD | `EmbryoCaseController` → `cases/*` | create pre-generates Day_1–Day_6 folders; `show` has `?view=folder\|timeline&day=N`; add-day for Day 7+ |
| Comparison | `ImageComparisonController@compare` → `images/compare` | `image_a/b`, `type_a/b` (`original`/`edited`); defaults to original vs edited of the same image |
| Image viewer | `EmbryoImageController@view` → `images/view` | metadata and version history |
| Observations | `ObservationController` | store and delete, scoped to the case |
| Case export | `EmbryoCaseController@export` | ZIP containing `Case_Metadata.json`, `Day_N/` originals, `_E` and `.json`. `exportMultipleCasesToZip` exists in the service but isn't routed |
| Admin dashboard | `AdminDashboardController` | global counts, recent activity |
| Embryologist management | `EmbryologistManagementController` | create (shows the generated `EMB-XXXX-XXXX` key and password once via flash), status changes, regenerate or revoke key, reset 2FA |
| Audit log | `ActivityLogController` | filter by action, user, case and date |
| Backups | `BackupController` | `full` / `database` / `images` ZIP into `storage/app/backups`. SQLite copies the DB file; MySQL builds a `SHOW CREATE` + `INSERT` dump in PHP |

## 7. Request lifecycle example (annotate an image)

```
GET  /images/42/editor   [embryologist mw] → ownership check → editor view
     browser loads /images/42/serve (auth-streamed original) into the Fabric canvas
POST /images/42/annotations (JSON, X-CSRF-TOKEN)
     → validate → ImageStorageService::saveAnnotation (write .json + _E.png)
     → ImageAnnotation upsert → AnnotationVersion insert → EmbryoImage update
     → ActivityLog 'image_annotated' → { success, version, edited_url }
```

## 8. Front end

- Two layouts: `layouts/app` (top bar plus a role-based sub-nav, with flash `status`/`error` alerts) and `layouts/auth` (centered card on the embryo/DNA SVG background).
- Views extend a layout and push extra assets via `@yield('styles')` / `@yield('scripts')`.
- No bundler for app pages. Assets load with `asset('vendor/...')` and `asset('css/embryocase.css')`.
- Design tokens live in `:root` in `embryocase.css` (`--bg-white`, `--border-grey`, `--text-black`, Inter / IBM Plex Mono).

## 9. Testing

`phpunit.xml` uses SQLite `:memory:`, the array cache, session and mail drivers, and the sync queue. `EmbryoCaseWorkflowTest` (with `RefreshDatabase` and `Storage::fake('local')`) covers:

- the step-by-step login wizard and resetting it
- the legacy all-in-one login
- admin email → `pending_auth`
- the TOTP screen and authorization
- `EMB-YYYY-0001` generation
- the annotation save pipeline, including how `cases.show` renders original and edited cards

## 10. Operations

- **Install:** `composer install` → `.env` → `key:generate` → `migrate --seed` (or `embryocase:install` for a clean admin).
- **Run:** `serve.cmd` / `.\artisan.cmd serve --port=8000`.
- **Health:** `GET /up`.
- **Data to back up:** the DB plus `storage/app/private/embryos/`. Both are gitignored, as are `storage/app/backups` and `temp_exports`.
- **No scheduled tasks or queue workers are required.** Mail is sent synchronously.
