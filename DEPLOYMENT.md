# ChaiForms — Deployment & Smoke Test Guide

## Prerequisites

Ensure these environment variables are set before deployment:

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | HS256 signing secret (min 32 chars) |
| `CSRF_SECRET` | ✅ | CSRF double-submit secret (min 32 chars) |
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | ✅ | e.g. `https://yourdomain.com/auth/callback` |
| `WEB_ORIGIN` | ✅ | CORS origin (e.g. `https://yourdomain.com`) |
| `BASE_URL` | ✅ | API base URL |
| `NEXT_PUBLIC_API_URL` | ✅ | API URL visible in browser |
| `NEXT_PUBLIC_WEB_BASE_URL` | ✅ | Web base URL for share links |
| `ENABLE_DEMO_LOGIN` | ✅ for judges | Set `true` to enable demo bypass buttons |
| `NEXT_PUBLIC_ENABLE_DEMO_LOGIN` | ✅ for judges | Same flag for browser |
| `RESEND_API_KEY` | Optional | Email notifications via Resend |

---

## Local Quick Start

```sh
# Install
pnpm install

# Configure
cp .env.example .env
# Fill DATABASE_URL, JWT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

# Database
pnpm db:migrate
pnpm db:seed

# Start
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:3001
- Docs: http://localhost:3001/docs

---

## Manual Smoke Test Checklist (P0)

Run this checklist on every deployment to verify the critical paths.

### 1. Landing Page

| Step | Expected |
| --- | --- |
| Open `/` | Landing page loads with ChaiForms hero, features, testimonials |
| Nav links visible | Explore, Templates, Pricing, Sign In |
| "Get Started" CTA button visible | `id="hero-get-started"` is present |
| Featured forms section (if seeded) | Shows up to 3 form cards |

### 2. Public Explore Gallery

| Step | Expected |
| --- | --- |
| Open `/explore` | Grid of public forms loads |
| Seeded forms appear | "Which Anime Character Are You?" and "Rate Your Favorite OS" cards visible |
| Clicking a form card | Navigates to `/f/{slug}` |
| Pagination (if >24 forms) | Prev/Next buttons work |

### 3. Public Form Submission

| Step | Expected |
| --- | --- |
| Open `/f/which-anime-character-are-you` | Themed form loads (anime theme — pink/purple) |
| Fill required fields | No validation errors |
| Click "Next →" | Navigates to page 2 |
| Complete page 2 and click "Submit" | Thank you screen appears with custom message |
| Open `/f/startup-idea-validator` | Password gate appears (🔒) |
| Enter `demo1234` | Form unlocks and fields appear |

### 4. API Documentation

| Step | Expected |
| --- | --- |
| Open `{API_BASE_URL}/docs` | Scalar UI loads with "ChaiForms API" title |
| Expand any endpoint | Schema and request/response visible |
| `GET {API_BASE_URL}/health` | Returns `{ healthy: true }` |
| `GET {API_BASE_URL}/openapi.json` | Returns valid OpenAPI JSON |

### 5. Demo Login → Dashboard

| Step | Expected |
| --- | --- |
| Open `/login` | Login page loads with Google Sign In button |
| If `ENABLE_DEMO_LOGIN=true` | "Continue as Demo Creator" button visible |
| Click "Continue as Demo Creator" | Redirected to `/dashboard` |
| Dashboard stat cards | Shows total forms, published, responses (non-zero after seed) |
| Click "My Forms" | 3 seeded forms visible with actions |
| Click "Analytics" on any form | Analytics page shows response charts |
| Click "Responses" on any form | Response table with 25+ rows and Export CSV button |

### 6. Form Builder

| Step | Expected |
| --- | --- |
| Click "+ New Form" | Redirected to form editor |
| Add a "Short Text" field via "+" | Field appears in canvas |
| Drag field to reorder | Field moves in the list |
| Change form title inline | Title updates in header |
| Click "Publish" | Status badge changes to "published" |
| Copy share link | URL copied to clipboard, toast shows |

### 7. Admin Dashboard

| Step | Expected |
| --- | --- |
| Open `/login` → "Continue as Admin" | Redirected to `/admin` |
| Platform stats visible | User count, form count, response count |
| Users table | `demo@chaiforms.dev` and `admin@chaiforms.dev` present |
| Forms table | All seeded forms visible |

---

## Automated Test Suite

```sh
# Run all tests (unit + property-based + integration)
pnpm test

# Expected output — all tests pass:
# packages/schemas      — FieldSchemaUnion validation tests
# packages/trpc/server  — 26 test files (unit + property-based)
# apps/api              — 4 test files (rate-limit + 3 integration)
# apps/web              — conditional logic tests
```

### Idempotency Check

```sh
# Run seed twice — should not create duplicate records
pnpm db:seed
pnpm db:seed

# Verify: only 3 templates, 3 forms, 2 users in DB
```

---

## Smoke Test Results

| Check | Status | Notes |
| --- | --- | --- |
| `/` loads | ⬜ Pending | |
| `/explore` shows public forms | ⬜ Pending | |
| `/f/{public-slug}` form submission | ⬜ Pending | |
| `/f/{password-slug}` password gate | ⬜ Pending | |
| `/docs` Scalar UI | ⬜ Pending | |
| Demo login → dashboard | ⬜ Pending | |
| Dashboard analytics (seeded data) | ⬜ Pending | |
| Admin login → `/admin` | ⬜ Pending | |
| `pnpm test` all pass | ⬜ Pending | |
| `pnpm build` no errors | ⬜ Pending | |
| `pnpm db:seed` idempotent | ⬜ Pending | |

> **Update this table after each deployment.**

---

## Deployment Targets

| Service | Platform | Notes |
| --- | --- | --- |
| `apps/web` | Vercel | Next.js SSR, set all `NEXT_PUBLIC_*` vars |
| `apps/api` | Google Cloud Run | Stateless, Docker image from `tsup` build |
| PostgreSQL | Neon (serverless) | Uses connection pooling |

### Deploy API to Cloud Run

```sh
# Build Docker image
docker build -t chaiforms-api ./apps/api

# Push to Google Container Registry
docker tag chaiforms-api gcr.io/YOUR_PROJECT/chaiforms-api
docker push gcr.io/YOUR_PROJECT/chaiforms-api

# Deploy
gcloud run deploy chaiforms-api \
  --image gcr.io/YOUR_PROJECT/chaiforms-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "DATABASE_URL=...,JWT_SECRET=..."
```

### Deploy Web to Vercel

```sh
vercel --prod
# Set environment variables in Vercel dashboard
```
