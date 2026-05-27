# ChaiForms ☕

ChaiForms is a Typeform-style form builder SaaS built on a Turborepo monorepo. Creators authenticate with Google OAuth, build themed forms with drag-and-drop, publish shareable links (including QR codes), and view real-time analytics. Respondents submit forms without an account.

## Documentation

For the full technical deep dive, see [docs/documentation.md](docs/documentation.md).

## Features

- **🎨 8 Stunning Themes:** Anime, startup, tech, OS, game, movie, event — each form tells a story.
- **⚡ Drag & Drop Builder:** 9 field types, conditional logic, multi-page forms.
- **📊 Real-time Analytics:** Track responses, completion rates, and field breakdowns with beautiful charts.
- **🔒 Password Protection & Visibility:** Public, unlisted, and password-protected forms.
- **📧 Email Notifications:** Creators get notified on every submission; respondents get confirmation emails.
- **📱 QR Code Sharing:** Generate and download QR codes for any form from the dashboard action menu.
- **🌐 Public Explore Gallery:** Discover public forms and start from community templates.
- **Workspaces & Integrations:** Workspace roles, API keys, and webhook delivery for teams.

## Production Endpoints (Hackathon Submission)

- **Frontend Web App:** https://chaiforms.sayantanbal.in
- **Backend API:** https://api-1001546091343.asia-south1.run.app
- **Scalar API Docs:** https://api-1001546091343.asia-south1.run.app/docs

## Monorepo structure

| Path                         | Purpose                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------ |
| `apps/web`                   | Next.js 16 frontend with Tailwind CSS & tRPC Client                                  |
| `apps/api`                   | Express + tRPC API server with Scalar OpenAPI docs                                   |
| `packages/schemas`           | Shared Zod schemas (`FieldSchemaUnion`, form settings, responses, analytics)         |
| `packages/trpc`              | tRPC routers (health, auth, forms, responses, analytics, explore, admin, workspaces) |
| `packages/database`          | Drizzle ORM schema, migrations, repositories, and seed script                        |
| `packages/services`          | Auth, forms, notification, webhook, and alerting services                            |
| `packages/ui`                | Shared shadcn/ui + Radix component library                                           |
| `packages/types`             | Shared API + webhook contracts                                                       |
| `packages/logger`            | Pino-based logger                                                                    |
| `packages/eslint-config`     | Shared ESLint presets                                                                |
| `packages/typescript-config` | Shared TypeScript presets                                                            |

## Local Development Setup

```sh
# 1. Install dependencies
pnpm install

# 2. Copy and fill environment variables
cp .env.example .env
# Required: DATABASE_URL, JWT_SECRET, CSRF_SECRET
# Optional: NEON_AUTH_*, GOOGLE_OAUTH_*, UPSTASH_REDIS_*, RESEND_API_KEY, ENABLE_DEMO_LOGIN

# 3. Apply database migrations
pnpm db:migrate

# 4. Seed demo data (users, templates, forms, 75+ responses)
pnpm db:seed

# 5. Start all apps in parallel
pnpm dev
```

- **Web App:** http://localhost:3000
- **API Server:** http://localhost:8000
- **Scalar API Docs:** http://localhost:8000/docs

### Environment Variables

| Variable                        | Required   | Description                                                                         |
| ------------------------------- | ---------- | ----------------------------------------------------------------------------------- |
| `DATABASE_URL`                  | Yes        | PostgreSQL connection string (Neon or local Postgres).                              |
| `JWT_SECRET`                    | Yes (prod) | 32+ char secret for access + refresh JWT signing.                                   |
| `CSRF_SECRET`                   | Yes (prod) | 32+ char secret for CSRF signing; falls back to JWT/Neon secret in dev.             |
| `BASE_URL`                      | Yes        | API base URL used for OpenAPI + docs (default `http://localhost:8000`).             |
| `WEB_ORIGIN`                    | Yes        | Comma-separated allowed origins for CORS + CSRF origin checks. Use `*` only in dev. |
| `PORT`                          | No         | API port (default `8000`).                                                          |
| `NEXT_PUBLIC_API_URL`           | Yes        | API URL visible in the browser (used for `/trpc` + `/csrf` rewrites).               |
| `NEXT_PUBLIC_WEB_BASE_URL`      | No         | Web base URL for share links and emails.                                            |
| `NEXT_PUBLIC_ENABLE_DEMO_LOGIN` | No         | `true` to show demo login buttons on `/login`.                                      |
| `NEON_AUTH_BASE_URL`            | No         | Neon Auth base URL (Better Auth sessions).                                          |
| `NEON_AUTH_COOKIE_SECRET`       | No         | 32+ char secret for Neon Auth cookies. Required when Neon Auth is enabled.          |
| `GOOGLE_OAUTH_CLIENT_ID`        | No         | Legacy Google OAuth client ID.                                                      |
| `GOOGLE_OAUTH_CLIENT_SECRET`    | No         | Legacy Google OAuth client secret.                                                  |
| `GOOGLE_OAUTH_REDIRECT_URI`     | No         | OAuth callback (e.g. `http://localhost:3000/auth/callback`).                        |
| `UPSTASH_REDIS_REST_URL`        | No         | Upstash REST URL for rate limiting (falls back to in-memory).                       |
| `UPSTASH_REDIS_REST_TOKEN`      | No         | Upstash REST token for rate limiting.                                               |
| `ENABLE_DEMO_LOGIN`             | No         | `true` to enable demo login API.                                                    |
| `RESEND_API_KEY`                | No         | Resend key for submission + invite emails.                                          |

## Demo Credentials

After running `pnpm db:seed`:

| Account      | Email                 | Role    |
| ------------ | --------------------- | ------- |
| Demo Creator | `demo@chaiforms.dev`  | creator |
| Admin        | `admin@chaiforms.dev` | admin   |

**Password-protected form slug:** `startup-idea-validator`  
**Demo form password:** `demo1234`

### Demo Bypass (for Judges)

Set `ENABLE_DEMO_LOGIN=true` and `NEXT_PUBLIC_ENABLE_DEMO_LOGIN=true` in your environment, then visit `/login`. Two buttons will appear — **"Continue as Demo Creator"** and **"Continue as Admin"** — which sign in instantly without Google OAuth.

## Implementation Status

| Phase                       | Priority | Status      | Description                                              |
| --------------------------- | -------- | ----------- | -------------------------------------------------------- |
| 1 — Schemas                 | P0       | ✅ Complete | `@repo/schemas` package with FieldSchemaUnion + tests    |
| 2 — Database                | P0       | ✅ Complete | Forms, responses, answers, templates, pages + migrations |
| 3 — Auth & JWT              | P0       | ✅ Complete | Google OAuth, JWT cookies, protectedProcedure, demoLogin |
| 4 — tRPC Routers            | P0       | ✅ Complete | forms, responses, analytics, explore, admin              |
| 5 — Email                   | P1       | ✅ Complete | NotificationService via Resend                           |
| 6 — Next.js Auth Middleware | P0       | ✅ Complete | JWT edge middleware, route guards                        |
| 7 — Theme System            | P1       | ✅ Complete | 8 themes with CSS variables                              |
| 8 — Form Builder UI         | P0/P1    | ✅ Complete | Drag-and-drop editor with DnD Kit                        |
| 9 — Conditional Logic       | P2       | ✅ Complete | Client-side field visibility engine                      |
| 10 — Public Form Page       | P0       | ✅ Complete | `/f/[slug]` renderer with multi-page + conditional logic |
| 11 — Creator Dashboard      | P0       | ✅ Complete | Analytics, responses, builder, preview                   |
| 12 — QR Code Sharing        | P2       | ✅ Complete | QR modal in dashboard action menu                        |
| 13 — Marketing Pages        | P0       | ✅ Complete | Landing, Explore, Templates, Pricing                     |
| 14 — Admin Dashboard        | P2       | ✅ Complete | Platform stats, user and form tables                     |
| 15 — Seed Script            | P0       | ✅ Complete | Idempotent seed with 3 templates, 3 forms, 75+ responses |
| 18 — OpenAPI / Scalar       | P0       | ✅ Complete | `/docs` with all tagged tRPC procedures                  |
| 19 — README                 | P0       | ✅ Complete | This file                                                |

## Scripts

| Command                      | Description                                 |
| ---------------------------- | ------------------------------------------- |
| `pnpm dev`                   | Start web + API in development              |
| `pnpm build`                 | Build all apps and packages                 |
| `pnpm test`                  | Run Vitest tests across packages            |
| `pnpm db:migrate`            | Apply Drizzle migrations                    |
| `pnpm db:seed`               | Seed database with demo data (idempotent)   |
| `pnpm db:generate`           | Generate new migration after schema changes |
| `pnpm db:migrate-answers-v2` | Backfill typed answers table (v2)           |
| `pnpm check-types`           | TypeScript check across monorepo            |
| `pnpm lint`                  | Run ESLint across packages                  |
| `pnpm format`                | Format TS/TSX/MD files with Prettier        |

## Submission Artifacts

| Artifact          | URL                                                |
| ----------------- | -------------------------------------------------- |
| GitHub Repository | _Add your repo URL here_                           |
| Deployed Web App  | https://chaiforms.sayantanbal.in                   |
| Deployed API      | https://api-1001546091343.asia-south1.run.app      |
| Scalar API Docs   | https://api-1001546091343.asia-south1.run.app/docs |

## Specs

Product requirements, design doc, and implementation tasks live in `.kiro/specs/form-builder-saas/`.
