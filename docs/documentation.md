# ChaiForms - Technical Documentation

This document provides an in-depth look at the architecture, schema design, features, and implementation details for the ChaiForms form builder SaaS. It is intended for developers maintaining and extending the Turborepo monorepo.

For high-level project information and local setup instructions, please see the [root README](../README.md). For an audit of remaining tasks, see [REMAINING_WORK.md](../REMAINING_WORK.md).

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Repository Layout](#repository-layout)
3. [Runtime and Tooling](#runtime-and-tooling)
4. [Environment Variables](#environment-variables)
5. [Packages Breakdown](#packages-breakdown)
6. [Schema Definitions](#schema-definitions)
7. [Database Schema](#database-schema)
8. [Authentication and Security](#authentication-and-security)
9. [API Layer (tRPC + OpenAPI)](#api-layer-trpc--openapi)
10. [Frontend (Next.js) Implementation](#frontend-nextjs-implementation)
11. [Analytics and Real-time Updates](#analytics-and-real-time-updates)
12. [Background Jobs and Monitoring](#background-jobs-and-monitoring)
13. [Deployment](#deployment)
14. [Testing and Quality](#testing-and-quality)
15. [Implementation of Phases](#implementation-of-phases)

---

## Architecture Overview

ChaiForms is a Turborepo monorepo that ships a Next.js frontend and an Express API server, backed by PostgreSQL and a shared schema layer.

Key architectural choices:

- Frontend: Next.js 16 (App Router) with React 19, Tailwind CSS v4, and shared UI primitives from `@repo/ui`.
- Backend: Express 5 + tRPC v11, with Scalar OpenAPI documentation and a parallel OpenAPI surface on `/api/v1`.
- Database: PostgreSQL (Neon recommended) accessed via Drizzle ORM and repository helpers.
- Auth: Neon Auth session sync plus legacy Google OAuth; access and refresh JWT cookies are issued by the API.
- Security: Double-submit CSRF tokens, strict CORS checks, per-route rate limiting, and API key auth for workspace automation.
- Observability: Prometheus metrics endpoint, request duration histogram, and background health checks with alert hooks.
- Real-time: WebSocket server on the API for analytics updates using channel-based subscriptions.

---

## Repository Layout

| Path                         | Purpose                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------- |
| `apps/web`                   | Next.js 16 frontend (App Router) with tRPC React Query client                    |
| `apps/api`                   | Express + tRPC API server with OpenAPI docs and WebSocket analytics              |
| `packages/schemas`           | Zod schema contracts for fields, forms, responses, analytics, and client context |
| `packages/trpc`              | tRPC routers, middleware, shared utilities, and client types                     |
| `packages/database`          | Drizzle schema, repositories, migrations, and seed tools                         |
| `packages/services`          | Business services (forms, auth, notifications, webhooks, alerting)               |
| `packages/ui`                | Shared UI component library (shadcn/ui + Radix wrappers)                         |
| `packages/types`             | Shared API and webhook payload types                                             |
| `packages/logger`            | Pino-based structured logger                                                     |
| `packages/eslint-config`     | Shared ESLint presets                                                            |
| `packages/typescript-config` | Shared TypeScript presets                                                        |
| `packages/fonts`             | Custom font assets                                                               |

---

## Runtime and Tooling

- Node.js: `>=18` (see root `package.json` engines)
- Package manager: `pnpm` (root `packageManager` set to pnpm 9)
- Task runner: `turbo` orchestrates build, test, lint, and type-check tasks across packages
- API build: `tsup` compiles the API package for production
- API dev: `tsx watch` runs `apps/api/src/index.ts`
- Web build: `next build`
- Web dev: `next dev --port 3000 --webpack`

Root scripts (from `package.json`):

- `pnpm dev`: turbo dev for all packages
- `pnpm build`: turbo build with production env
- `pnpm test`: run Vitest across packages
- `pnpm check-types`: `tsc --noEmit` across packages
- `pnpm db:migrate`: Drizzle migrations
- `pnpm db:seed`: idempotent seed for demo data
- `pnpm db:generate`: generate migrations from schema changes
- `pnpm db:migrate-answers-v2`: backfill typed answers table

---

## Environment Variables

All runtime configuration is read from a single `.env` file at the monorepo root. The API and database packages load this file at runtime, so local development should always start with `.env.example` copied to `.env`.

### API and shared variables

| Variable                     | Required   | Notes                                                                                |
| ---------------------------- | ---------- | ------------------------------------------------------------------------------------ |
| `DATABASE_URL`               | Yes        | PostgreSQL connection string used by Drizzle (`@repo/database`).                     |
| `BASE_URL`                   | Yes        | API base URL for OpenAPI and docs (default `http://localhost:8000`).                 |
| `WEB_ORIGIN`                 | Yes        | Comma-separated origins allowed by CORS and CSRF origin checks. Use `*` only in dev. |
| `PORT`                       | No         | API server port (default `8000`).                                                    |
| `JWT_SECRET`                 | Yes (prod) | 32+ char secret for access/refresh JWT signing.                                      |
| `CSRF_SECRET`                | Yes (prod) | 32+ char secret for CSRF token signing. Falls back to JWT/Neon secret in dev.        |
| `NEON_AUTH_BASE_URL`         | No         | Neon Auth base URL (Better Auth sessions). Enables `/auth/sign-in` flow.             |
| `NEON_AUTH_COOKIE_SECRET`    | No         | 32+ char secret for Neon Auth cookies. Required when Neon Auth is enabled.           |
| `GOOGLE_OAUTH_CLIENT_ID`     | No         | Legacy Google OAuth client ID.                                                       |
| `GOOGLE_OAUTH_CLIENT_SECRET` | No         | Legacy Google OAuth client secret.                                                   |
| `GOOGLE_OAUTH_REDIRECT_URI`  | No         | OAuth callback URL (for legacy Google OAuth).                                        |
| `UPSTASH_REDIS_REST_URL`     | No         | Upstash REST URL for rate limiting; falls back to in-memory limits when absent.      |
| `UPSTASH_REDIS_REST_TOKEN`   | No         | Upstash REST token.                                                                  |
| `ENABLE_DEMO_LOGIN`          | No         | `true` to enable the demo login API.                                                 |
| `RESEND_API_KEY`             | No         | Resend API key for submission and invite emails.                                     |
| `LOGGER_LEVEL`               | No         | `error`, `debug`, or `info`; defaults to `debug` in dev and `info` in prod.          |
| `SLACK_WEBHOOK_URL`          | No         | Optional alerting webhook used by `AlertService`.                                    |
| `SKIP_ENV_VALIDATION`        | No         | When set, skips schema validation in the web app env loader.                         |

### Web variables

| Variable                        | Required | Notes                                                              |
| ------------------------------- | -------- | ------------------------------------------------------------------ |
| `NEXT_PUBLIC_API_URL`           | Yes      | API base URL used by `/trpc` and `/csrf` rewrites.                 |
| `NEXT_PUBLIC_WEB_BASE_URL`      | No       | Base URL for share links and emails.                               |
| `NEXT_PUBLIC_ENABLE_DEMO_LOGIN` | No       | `true` to show demo login buttons on `/login`.                     |
| `NEON_AUTH_BASE_URL`            | No       | Required for Neon Auth client runtime when using `/auth/*` routes. |
| `NEON_AUTH_COOKIE_SECRET`       | No       | Required for Neon Auth cookie validation.                          |
| `JWT_SECRET`                    | No       | Needed on the web server for route guarding in `proxy.ts`.         |

Notes:

- Do not set `NODE_ENV` in `.env` for local development. Next.js requires it to be managed by the runtime and build tools.
- `WEB_ORIGIN` accepts a comma-delimited list of origins, and it is also used by CSRF origin checks.

---

## Demo Credentials (Hackathon Judges 🏆)

> **No sign-up or OAuth required.** Visit the login page and click a demo button for instant access.

**Login page:** https://chaiforms.sayantanbal.in/login

| Account      | Email                 | Role    |
| ------------ | --------------------- | ------- |
| Demo Creator | `demo@chaiforms.dev`  | creator |
| Admin        | `admin@chaiforms.dev` | admin   |

### What to explore

| Feature                                       | Where to find it                                   |
| --------------------------------------------- | -------------------------------------------------- |
| Form builder (drag & drop, conditional logic) | Dashboard → New Form                               |
| Response table & CSV export                   | Dashboard → any form → Responses                   |
| Analytics charts                              | Dashboard → any form → Analytics                   |
| Multi-page form with theming                  | `/f/which-anime-character-are-you`                 |
| Password-protected form                       | `/f/startup-idea-validator` (password: `Demo1234`) |
| Admin panel (user & form moderation)          | `/admin` (use Admin account)                       |
| API documentation (Scalar UI)                 | https://api-1001546091343.asia-south1.run.app/docs |

### `@repo/schemas`

- Central Zod schemas used across the API and web.
- Exports field schemas, form settings, response submission payloads, analytics summary schemas, and client context payloads.

### `@repo/database`

- Drizzle ORM schema definitions and repository helpers.
- Includes materialized view refreshes, response partitioning scripts, and answer-type utilities.

### `@repo/trpc`

- Shared tRPC server routers, middleware, and OpenAPI metadata.
- Client-side type exports for `RouterInputs` and `RouterOutputs`.
- CSRF helpers and WebSocket analytics channel broadcaster.

### `@repo/services`

- `FormsService` for slug generation, publish logic, and settings validation.
- `NotificationService` for Resend-based submission and invite emails.
- `WebhookService` for signed webhook delivery.
- `Neon Auth` sync helpers for sessions.
- `AlertService` for background alerts.

### `@repo/ui`

- Shared shadcn/ui and Radix wrappers used by the web app.

### `@repo/types`

- Shared API response types and webhook event contracts.

### `@repo/logger`

- Central Pino logger with environment-aware formatting.

---

## Schema Definitions

### Field Schema Union

`FieldSchemaUnion` is a Zod discriminated union based on `type` with the following field types:

- `short_text`: `minLength`, `maxLength`, `validationRegex`
- `long_text`: `minLength`, `maxLength`
- `email`
- `number`: `min`, `max`
- `single_select`: `options` (array of strings or `{ id, label, value }`)
- `multi_select`: `options` (array of strings or `{ id, label, value }`)
- `checkbox`
- `rating`: `maxRating` between 2 and 10
- `date`: `minDate`, `maxDate` (ISO strings)

Each field extends the shared `baseField` shape:

- `id`, `label`, `required`, `placeholder`, `description`
- `conditionalRules`: rule groups with nested `AND` / `OR`
- `dynamicOptionRules`: conditional option logic for select fields

Supported rule operators:

- `equals`, `not_equals`, `contains`, `not_contains`
- `greater_than`, `less_than`, `greater_than_equal`, `less_than_equal`
- `starts_with`, `ends_with`
- `is_empty`, `is_not_empty`
- `in`, `not_in`

### Form Settings Schema

`formSettingsSchema` validates edits to form metadata and supports:

- `slug` pattern: `^[a-z0-9-]{3,60}$`
- `theme`: `default`, `anime`, `movie`, `game`, `startup`, `tech_company`, `os`, `event`
- `customTheme`: `{ primaryColor, backgroundColor, textColor, fontFamily }`
- `pages`: ordered lists of `fieldIds` for multi-page forms

### Response Submission Schema

`submitResponseSchema` includes:

- `formId`
- `startedAt`
- `answers`: `{ fieldId, value }` string pairs
- `unlockToken` for password-protected forms
- Optional `clientContext` (geo data)

---

## Database Schema

### Enums

- `user_role`: `creator`, `admin`
- `workspace_role`: `admin`, `creator`, `viewer`
- `form_status`: `draft`, `published`, `archived`
- `form_visibility`: `public`, `unlisted`
- `form_scope`: `global`, `workspace`
- `form_theme`: `default`, `anime`, `movie`, `game`, `startup`, `tech_company`, `os`, `event`

### Tables

#### `users`

- `id` (uuid, PK)
- `full_name`, `email` (unique), `email_verified`
- `profile_image_url`, `neon_auth_user_id` (unique)
- `role`, `is_blocked`
- `created_at`, `updated_at`

#### `refresh_tokens`

- `id` (uuid, PK)
- `user_id` (FK -> users)
- `token_hash` (unique, hashed refresh token)
- `family` (uuid for reuse detection)
- `expires_at`, `revoked_at`, `created_at`

#### `workspaces`

- `id` (uuid, PK)
- `name`, `description`
- `owner_id` (FK -> users)
- `created_at`, `updated_at`

#### `workspace_members`

- `id` (uuid, PK)
- `workspace_id` (FK -> workspaces)
- `user_id` (FK -> users)
- `role` (`admin`, `creator`, `viewer`)
- `invited_at`, `accepted_at`
- Unique index on `(workspace_id, user_id)`

#### `forms`

- `id` (uuid, PK)
- `creator_id` (FK -> users)
- `workspace_id` (nullable FK -> workspaces)
- `scope` (`global` or `workspace`), `requires_auth`
- `title`, `description`, `slug` (unique)
- `status`, `visibility`, `theme`
- `fields` (JSONB array of `FieldSchemaUnion`)
- `custom_theme` (JSONB)
- `thankyou_message`, `expiry_date`, `response_limit`
- `access_password_hash` (nullable)
- `send_respondent_confirmation`
- `deleted_at` (soft delete), `created_at`, `updated_at`

#### `pages`

- `id` (uuid, PK)
- `form_id` (FK -> forms)
- `title`, `order`
- `field_ids` (uuid array)

#### `responses`

- Composite primary key: `(id, submitted_at)`
- `form_id` (FK -> forms)
- `started_at`, `submitted_at`
- `respondent_email`, `unlock_token`
- Device and client context: `ip_address`, `user_agent`, `device_fingerprint`, `device_type`
- UA metadata: `os_name`, `os_version`, `browser_name`, `browser_version`, `device_vendor`, `device_model`
- Geo: `latitude`, `longitude`, `geo_country`, `geo_region`, `geo_city`

`responses` is partitioned by month. A background job creates partitions for the current and next month.

#### `answers`

- `id` (uuid, PK)
- `response_id` (FK -> responses)
- `field_id`
- `value` (text)

#### `answers_v2`

- `id` (uuid, PK)
- `response_id` (FK -> responses)
- `field_id`
- Typed columns: `value_text`, `value_number`, `value_date`, `value_boolean`, `value_json`
- `created_at`
- Indexes to support analytics queries by field and value type

The API writes to both `answers` and `answers_v2` for compatibility. Analytics prefers `answers_v2` and falls back to `answers` if no v2 rows exist.

#### `templates`

- `id` (uuid, PK)
- `title`, `description`, `theme`
- `fields` (JSONB)
- `created_at`

#### `api_keys`

- `id` (cuid, PK)
- `workspace_id` (FK -> workspaces)
- `name`, `key_hash`
- `last_used_at`, `expires_at`, `created_at`

#### `webhooks`

- `id` (cuid, PK)
- `workspace_id` (FK -> workspaces)
- `url`, `secret`, `events` (JSONB array)
- `is_active`, `created_at`

### Materialized Views

- `form_summary_stats` (used by analytics summary)
- Refreshed every 5 minutes by the API cron job

---

## Authentication and Security

### Authentication Providers

- Neon Auth (Better Auth sessions) is the primary flow when configured.
- Legacy Google OAuth is supported via `GOOGLE_OAUTH_*` env vars.

### JWT Cookies

- Access token cookie: `chaiforms-access` (15 min)
- Refresh token cookie: `chaiforms-refresh` (30 days, format `plain:jwt`)
- Refresh tokens are hashed and stored with a `family` for reuse detection.

### CSRF Protection

- Token cookie: `chaiforms-csrf` (signed, 1 hour TTL)
- Header: `x-csrf-token`
- Double-submit cookie validation is enforced on mutations.
- Optional origin checks are enforced using `WEB_ORIGIN`.

### CORS

- `WEB_ORIGIN` controls allowed origins (comma separated list or `*` for dev).
- Credentials are enabled; methods are `GET`, `POST`, and `OPTIONS`.

### Rate Limiting

- Auth routes: 10 requests / 60s
- Mutations (non-auth): 60 requests / 60s
- Queries: 200 requests / 60s
- Form submissions: 10 requests / 60s per IP + device fingerprint
- Password unlock attempts: 5 requests / 60 minutes

Upstash Redis is used when configured; otherwise the API falls back to in-memory buckets.

### API Keys

- Workspace admins can create API keys.
- Keys are hashed with SHA-256 and stored in `api_keys`.
- API requests can send `x-api-key` or `Authorization: Bearer`.

### Webhooks

- Webhooks are stored per workspace and signed with HMAC SHA-256.
- Headers:
  - `x-chaiforms-signature`
  - `x-chaiforms-event`
  - `x-chaiforms-delivery`

---

## API Layer (tRPC + OpenAPI)

### Base Paths

- tRPC endpoint: `/trpc`
- OpenAPI endpoint: `/api/v1`
- OpenAPI spec: `/openapi.json`
- Scalar API docs: `/docs`
- CSRF token endpoint: `/csrf`
- Health endpoint: `/health`

All routers export OpenAPI metadata and are served through both `/trpc` and `/api/v1`.

### Router Map

#### `health`

- `health.getHealth` - `GET /health` (simple status response)

#### `auth`

- `auth.getSupportedAuthenticationProviders` - `GET /authentication/supported-providers`
- `auth.callback` - `GET /authentication/callback`
- `auth.refreshToken` - `POST /authentication/refresh-token`
- `auth.me` - `GET /authentication/me`
- `auth.signOut` - `POST /authentication/sign-out`
- `auth.syncSession` - `POST /authentication/sync-session`
- `auth.demoLogin` - `POST /authentication/demo-login`

#### `forms`

- `forms.create` - `POST /forms`
- `forms.list` - `GET /forms`
- `forms.getById` - `GET /forms/{formId}`
- `forms.getBySlug` - `GET /forms/slug/{slug}`
- `forms.update` - `PATCH /forms/{formId}`
- `forms.publish` - `POST /forms/{formId}/publish`
- `forms.unpublish` - `POST /forms/{formId}/unpublish`
- `forms.archive` - `POST /forms/{formId}/archive`
- `forms.listArchived` - `GET /forms/archived`
- `forms.delete` - `DELETE /forms/{formId}` (soft delete)
- `forms.softDelete` - `POST /forms/soft-delete` (bulk)
- `forms.recover` - `POST /forms/recover`
- `forms.listTrash` - `GET /forms/trash`
- `forms.clone` - `POST /forms/{formId}/clone`
- `forms.fieldsUpsert` - `PUT /forms/{formId}/fields`
- `forms.unlock` - `POST /forms/slug/{slug}/unlock`
- `forms.createFromTemplate` - `POST /forms/from-template/{templateId}`
- `forms.getPages` - `GET /forms/{formId}/pages`

#### `responses`

- `responses.submit` - `POST /responses/submit`
- `responses.list` - `GET /responses`
- `responses.exportCsv` - `GET /responses/export-csv`

#### `analytics`

- `analytics.getSummary` - `GET /analytics/summary`
- `analytics.getFieldBreakdown` - `GET /analytics/field-breakdown`
- `analytics.getResponsesOverTime` - `GET /analytics/responses-over-time`

#### `explore`

- `explore.listPublicForms` - `GET /explore/forms`
- `explore.listFeaturedForms` - `GET /explore/featured`
- `explore.listTemplates` - `GET /explore/templates`
- `explore.getTemplateById` - `GET /explore/templates/{id}`

#### `admin`

- `admin.getStats` - `GET /admin/stats`
- `admin.listForms` - `GET /admin/forms`
- `admin.listUsers` - `GET /admin/users`
- `admin.blockUser` - `POST /admin/users/{userId}/block`
- `admin.unblockUser` - `POST /admin/users/{userId}/unblock`

#### `workspaces`

- `workspaces.create` - `POST /workspaces`
- `workspaces.list` - `GET /workspaces`
- `workspaces.getById` - `GET /workspaces/{workspaceId}`
- `workspaces.addMember` - `POST /workspaces/{workspaceId}/members`
- `workspaces.removeMember` - `DELETE /workspaces/{workspaceId}/members/{userId}`
- `workspaces.updateMemberRole` - `PATCH /workspaces/{workspaceId}/members/{userId}`
- `workspaces.listMembers` - `GET /workspaces/{workspaceId}/members`
- `workspaces.createApiKey` - `POST /workspaces/{workspaceId}/api-keys`
- `workspaces.listApiKeys` - `GET /workspaces/{workspaceId}/api-keys`
- `workspaces.revokeApiKey` - `DELETE /workspaces/{workspaceId}/api-keys/{keyId}`
- `workspaces.createWebhook` - `POST /workspaces/{workspaceId}/webhooks`
- `workspaces.listWebhooks` - `GET /workspaces/{workspaceId}/webhooks`
- `workspaces.deleteWebhook` - `DELETE /workspaces/{workspaceId}/webhooks/{webhookId}`

---

## Frontend (Next.js) Implementation

### App Router and Middleware

- Next.js App Router is used for routing and layouts.
- `apps/web/proxy.ts` handles route protection for `/dashboard/*`, `/admin/*`, and `/login`.
- Access validation uses the server-side JWT secret; Neon Auth sessions are checked through `/api/auth/get-session`.

### API Proxy and CSRF

- `next.config.js` rewrites `/trpc/*` and `/csrf` to the API server based on `NEXT_PUBLIC_API_URL`.
- CSRF tokens are fetched from `/csrf` and attached to mutation requests as `x-csrf-token`.

### Form Builder and Renderer

- Drag-and-drop editor uses `dnd-kit` and resizable panels.
- The renderer maps JSONB fields to React field components.
- Conditional logic is evaluated client-side using the rule groups described in `@repo/schemas`.

### Themes

- Themes are implemented as a combination of CSS variables and custom wrappers.
- `form_theme` enum supports: `default`, `anime`, `movie`, `game`, `startup`, `tech_company`, `os`, `event`.

---

## Analytics and Real-time Updates

### Analytics Queries

- Summary metrics are computed from `responses` and optionally from the `form_summary_stats` materialized view.
- Field breakdown uses `answers_v2` for typed values and falls back to legacy `answers`.

### WebSocket Streaming

- WebSocket server is attached to the API HTTP server.
- Clients subscribe to `analytics:{formId}` channels.
- Server broadcasts `response_delta` events after successful submissions.
- WS upgrade requests must pass CSRF validation and include `channel` and `csrf` query parameters.

---

## Background Jobs and Monitoring

### Cron Jobs (API)

- `purgeExpiredForms`: removes soft-deleted forms after a 7-day recovery window.
- `refreshAnalyticsMaterializedViews`: refreshes `form_summary_stats` every 5 minutes.
- `createResponsePartitions`: creates monthly partitions for `responses` (current and next month).

### Health Checks

- `/health` runs database and Redis pings and returns a structured health payload.
- A background health checker continuously pings the database and sends alerts on failure.

### Metrics

- `/metrics` exposes Prometheus metrics for:
  - HTTP request duration histogram
  - Total form submissions counter

---

## Deployment

### Web (Vercel)

- `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WEB_BASE_URL` must be set.
- The `proxy.ts` middleware requires `JWT_SECRET` if access token validation is needed server-side.

### API (Cloud Run or similar)

- Use the `apps/api` container build and set `PORT`, `BASE_URL`, `WEB_ORIGIN`.
- `BASE_URL` must be the public URL so OpenAPI links are correct.

### Database

- Neon is the default target but any PostgreSQL 13+ instance is compatible.
- Run migrations before starting the API in production.

---

## Testing and Quality

- Vitest is used across packages for unit tests.
- `apps/web` includes component tests and property-based tests for conditional logic.
- `apps/api` includes Supertest-based integration tests.
- Playwright is configured for end-to-end browser tests.

---

## Implementation of Phases

This section describes how the original build phases map to the final codebase.

### Phase 1: Monorepo and Package Infrastructure

- Turborepo layout with shared configs and versioned packages.
- Shared ESLint and TypeScript configs are centralized under `packages/*`.

### Phase 2: Database Schema and Migrations

- Drizzle ORM schema for users, workspaces, forms, pages, responses, and templates.
- Answer normalization with `answers` and typed `answers_v2` tables.
- Response partitions and analytics materialized view support.

### Phase 3: Auth - JWT Refresh and CSRF

- Access and refresh JWT cookies with rotation and reuse detection.
- CSRF double-submit tokens and origin checks.
- Neon Auth session sync and legacy Google OAuth fallback.

### Phase 4: tRPC Routers and Rate Limiting

- Routers for health, auth, forms, responses, analytics, explore, admin, workspaces.
- Upstash-backed rate limits with in-memory fallbacks.

### Phase 5: Email and Notifications

- Resend integration for submission confirmations and workspace invites.

### Phase 6: Next.js Route Guards

- `proxy.ts` guards protected routes using JWT and Neon Auth sessions.

### Phase 7: Theme System

- Theme registry with CSS variables and custom wrappers per theme.

### Phase 8: Form Builder UI

- Drag-and-drop builder with autosave and live preview.

### Phase 9: Conditional Logic Engine

- Rule group evaluator for field visibility and dynamic options.

### Phase 10: Public Form Submission

- Password-protected forms, response limits, and unlock flow.

### Phase 11: Creator Dashboard and Workspaces

- Workspace APIs, member roles, API keys, and webhook setup.
- Dashboard views for forms, responses, and analytics.

### Phase 12: QR Code Sharing

- QR modal for share links and public form access.

### Phase 13: Marketing and Explore

- Landing, Explore, Templates, and Pricing pages.

### Phase 14: Admin Dashboard

- Platform stats, form listings, and user moderation.

### Phase 15: Real-time Analytics

- WebSocket analytics channel with response deltas.

### Phase 16: Seed Script

- Idempotent seed data with demo users, templates, forms, and responses.

### Phase 17: UX Polish

- Skeleton loaders, empty states, and unified toast notifications.

### Phase 18: Accessibility and Responsiveness

- ARIA-compliant field renderers and mobile-friendly layouts.

### Phase 19: OpenAPI and Scalar

- OpenAPI generation from tRPC metadata and Scalar UI at `/docs`.

### Phase 20: README and Repository Artifacts

- Root README plus this technical documentation.

### Phase 21: Integration and E2E

- Vitest, Supertest, and Playwright test coverage.

### Phase 22: Deployed Demo

- Vercel frontend and Cloud Run API with cross-origin cookie support.
