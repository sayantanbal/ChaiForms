# ChaiForms ☕

ChaiForms is a Typeform-style form builder SaaS built on a Turborepo monorepo. Creators authenticate with Google OAuth, build themed forms with drag-and-drop, publish shareable links (including QR codes), and view real-time analytics. Respondents submit forms without an account.

## Features

- **🎨 8 Stunning Themes:** Anime, startup, tech, OS, game, movie, event — each form tells a story.
- **⚡ Drag & Drop Builder:** 9 field types, conditional logic, multi-page forms.
- **📊 Real-time Analytics:** Track responses, completion rates, and field breakdowns with beautiful charts.
- **🔒 Password Protection & Visibility:** Public, unlisted, and password-protected forms.
- **📧 Email Notifications:** Creators get notified on every submission; respondents get confirmation emails.
- **📱 QR Code Sharing:** Generate and download QR codes for any form from the dashboard action menu.
- **🌐 Public Explore Gallery:** Discover public forms and start from community templates.

## Monorepo structure

| Path | Purpose |
| --- | --- |
| `apps/web` | Next.js 16 frontend with Tailwind CSS & tRPC Client |
| `apps/api` | Express + tRPC API server with Scalar OpenAPI docs |
| `packages/schemas` | Shared Zod schemas (`FieldSchemaUnion`, form settings, responses, analytics) |
| `packages/trpc` | tRPC routers (auth, forms, analytics, explore, admin, responses) |
| `packages/database` | Drizzle ORM schema, migrations, and seed script |
| `packages/services` | `NotificationService` (Resend email) |

## Local Development Setup

```sh
# 1. Install dependencies
pnpm install

# 2. Copy and fill environment variables
cp .env.example .env
# Required: DATABASE_URL, JWT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
# Optional: RESEND_API_KEY (email), ENABLE_DEMO_LOGIN=true (for demo bypass)

# 3. Apply database migrations
pnpm db:migrate

# 4. Seed demo data (users, templates, forms, 75+ responses)
pnpm db:seed

# 5. Start all apps in parallel
pnpm dev
```

- **Web App:** http://localhost:3000
- **API Server:** http://localhost:3001
- **Scalar API Docs:** http://localhost:3001/docs

### Required Environment Variables

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | HS256 signing secret (min 32 chars) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | OAuth callback (e.g. `http://localhost:3000/auth/callback`) |
| `WEB_ORIGIN` | CORS origin for the web app (e.g. `http://localhost:3000`) |
| `BASE_URL` | API base URL (e.g. `http://localhost:3001`) |
| `NEXT_PUBLIC_API_URL` | API URL visible in browser |
| `NEXT_PUBLIC_WEB_BASE_URL` | Web base URL for form share links |
| `RESEND_API_KEY` | Resend key for email notifications (optional) |
| `ENABLE_DEMO_LOGIN` | `true` to enable demo bypass buttons on `/login` |
| `NEXT_PUBLIC_ENABLE_DEMO_LOGIN` | Same flag exposed to browser |

## Demo Credentials

After running `pnpm db:seed`:

| Account | Email | Role |
| --- | --- | --- |
| Demo Creator | `demo@chaiforms.dev` | creator |
| Admin | `admin@chaiforms.dev` | admin |

**Password-protected form slug:** `startup-idea-validator`  
**Demo form password:** `demo1234`

### Demo Bypass (for Judges)

Set `ENABLE_DEMO_LOGIN=true` and `NEXT_PUBLIC_ENABLE_DEMO_LOGIN=true` in your environment, then visit `/login`. Two buttons will appear — **"Continue as Demo Creator"** and **"Continue as Admin"** — which sign in instantly without Google OAuth.

## Implementation Status

| Phase | Priority | Status | Description |
| --- | --- | --- | --- |
| 1 — Schemas | P0 | ✅ Complete | `@repo/schemas` package with FieldSchemaUnion + tests |
| 2 — Database | P0 | ✅ Complete | Forms, responses, answers, templates, pages + migrations |
| 3 — Auth & JWT | P0 | ✅ Complete | Google OAuth, JWT cookies, protectedProcedure, demoLogin |
| 4 — tRPC Routers | P0 | ✅ Complete | forms, responses, analytics, explore, admin |
| 5 — Email | P1 | ✅ Complete | NotificationService via Resend |
| 6 — Next.js Auth Middleware | P0 | ✅ Complete | JWT edge middleware, route guards |
| 7 — Theme System | P1 | ✅ Complete | 8 themes with CSS variables |
| 8 — Form Builder UI | P0/P1 | ✅ Complete | Drag-and-drop editor with DnD Kit |
| 9 — Conditional Logic | P2 | ✅ Complete | Client-side field visibility engine |
| 10 — Public Form Page | P0 | ✅ Complete | `/f/[slug]` renderer with multi-page + conditional logic |
| 11 — Creator Dashboard | P0 | ✅ Complete | Analytics, responses, builder, preview |
| 12 — QR Code Sharing | P2 | ✅ Complete | QR modal in dashboard action menu |
| 13 — Marketing Pages | P0 | ✅ Complete | Landing, Explore, Templates, Pricing |
| 14 — Admin Dashboard | P2 | ✅ Complete | Platform stats, user and form tables |
| 15 — Seed Script | P0 | ✅ Complete | Idempotent seed with 3 templates, 3 forms, 75+ responses |
| 18 — OpenAPI / Scalar | P0 | ✅ Complete | `/docs` with all tagged tRPC procedures |
| 19 — README | P0 | ✅ Complete | This file |

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start web + API in development |
| `pnpm build` | Build all apps and packages |
| `pnpm test` | Run Vitest tests across packages |
| `pnpm db:migrate` | Apply Drizzle migrations |
| `pnpm db:seed` | Seed database with demo data (idempotent) |
| `pnpm db:generate` | Generate new migration after schema changes |
| `pnpm check-types` | TypeScript check across monorepo |

## Submission Artifacts

| Artifact | URL |
| --- | --- |
| GitHub Repository | _Add your repo URL here_ |
| Deployed Web App | _Add your Vercel URL here_ |
| Deployed API | _Add your API base URL here_ |
| Scalar API Docs | `{API_BASE_URL}/docs` |

## Specs

Product requirements, design doc, and implementation tasks live in `.kiro/specs/form-builder-saas/`.
