# ChaiForms — Technical Documentation

This document tracks detailed implementation notes, schemas, and progress for the ChaiForms form builder SaaS. The [README](../README.md) provides a high-level overview.

---

## Table of contents

1. [Architecture](#architecture)
2. [Decisions & deployment](#decisions--deployment)
3. [Phase 1: Shared schemas (`@repo/schemas`)](#phase-1-shared-schemas-reposchemas)
4. [Phase 2: Database schema](#phase-2-database-schema)
5. [Upcoming phases](#upcoming-phases)
6. [Environment variables](#environment-variables)
7. [Testing strategy](#testing-strategy)

---

## Architecture

ChaiForms extends an existing Turborepo stack:

- **ChaiForms_Web** (`apps/web`) — Next.js App Router, Tailwind v4, shadcn/ui, tRPC React Query client
- **ChaiForms_Server** (`apps/api`) — Express 5, tRPC v11, Scalar OpenAPI at `/docs`
- **Shared types** — `packages/schemas` is the single source of truth for Zod validation used by both web and server

Data flow for form submission:

```
Respondent → /f/{slug} → forms.getBySlug → FormRenderer
         → responses.submit → answersTable + responsesTable
         → NotificationService (fire-and-forget email)
```

---

## Decisions & deployment

| Topic | Decision |
| --- | --- |
| Zod types | Zod v4 (`z.uuid()`, `z.iso.datetime()`) — kept as implemented in Phase 1 |
| Database | **Neon PostgreSQL** via root `.env` `DATABASE_URL` — no local Docker Postgres required |
| Phase order | All **P0** phases first, then P1, then P2 stretch |
| Rebranding | Incremental when touching files (Streamyst → ChaiForms); full pass in Phase 19 |
| Web deploy | **Vercel** (`apps/web`) |
| API deploy | **Google Cloud Run** (`apps/api`) |
| Migrations | `pnpm db:generate` then `pnpm db:migrate` (loads `../../.env` from `packages/database`) |

### Cross-origin setup (Vercel + Cloud Run)

- API sets CORS `origin: WEB_ORIGIN` (your Vercel URL) and `credentials: true`
- Web tRPC client uses `credentials: "include"` for session cookies
- `JWT_SECRET` must match on both Vercel (middleware) and Cloud Run (tRPC)
- `NEXT_PUBLIC_API_URL` on Vercel points to the Cloud Run service URL

---

## Phase 1: Shared schemas (`@repo/schemas`)

**Status:** ✅ Complete  
**Priority:** P0  
**Completed:** 2026-05-23

### Goal

Provide a discriminated-union Zod schema for all nine field types, plus form settings, response submission, and analytics output schemas. Both `apps/web` and `packages/trpc` import from this package — no duplicated inline types.

### Package layout

```
packages/schemas/
  src/
    fields/
      base.ts           # baseField + conditionalRuleSchema
      short-text.ts
      long-text.ts
      email.ts
      number.ts
      single-select.ts
      multi-select.ts
      checkbox.ts
      rating.ts
      date.ts
      index.ts          # FieldSchemaUnion + exports
    form-settings.ts    # slugPattern, pageSchema, formSettingsSchema, fieldsUpsertSchema
    response.ts         # answerSchema, submitResponseSchema
    analytics.ts        # analyticsSummarySchema, fieldBreakdownItemSchema
    index.ts
    __tests__/
      field-schema.test.ts
      field-schema.property.test.ts
```

### Exports (`package.json`)

| Subpath | Module |
| --- | --- |
| `@repo/schemas` | `./src/index.ts` |
| `@repo/schemas/fields` | `./src/fields/index.ts` |
| `@repo/schemas/form-settings` | `./src/form-settings.ts` |
| `@repo/schemas/response` | `./src/response.ts` |
| `@repo/schemas/analytics` | `./src/analytics.ts` |

### Base field shape

Every field shares:

| Property | Type | Notes |
| --- | --- | --- |
| `id` | UUID | Unique within a form |
| `label` | string (min 1) | Display label |
| `required` | boolean | Default `false` |
| `placeholder` | string? | Optional |
| `description` | string? | Helper text |
| `conditionalRules` | array? | Show/hide logic (client-evaluated) |

Each conditional rule:

| Property | Type |
| --- | --- |
| `sourceFieldId` | UUID |
| `operator` | `equals` \| `not_equals` \| `contains` \| `is_empty` \| `is_not_empty` |
| `value` | string? (required for equals/not_equals/contains) |

### Field types (`FieldSchemaUnion`)

| `type` | Type-specific properties |
| --- | --- |
| `short_text` | `minLength?`, `maxLength?`, `validationRegex?` |
| `long_text` | `minLength?`, `maxLength?` |
| `email` | — |
| `number` | `min?`, `max?` (integers) |
| `single_select` | `options` (min 2 non-empty strings) |
| `multi_select` | `options` (min 2 non-empty strings) |
| `checkbox` | — |
| `rating` | `maxRating` (int 2–10, required) |
| `date` | `minDate?`, `maxDate?` (ISO datetime strings) |

Discriminant key: `type`.

### Form settings (`formSettingsSchema`)

Updatable form metadata via `forms.update`:

- `title`, `description`, `slug` (pattern `^[a-z0-9-]{3,60}$`)
- `status`: `draft` \| `published` \| `archived`
- `visibility`: `public` \| `unlisted`
- `theme`: `default` \| `anime` \| `movie` \| `game` \| `startup` \| `tech_company` \| `os` \| `event`
- `thankyouMessage`, `expiryDate`, `responseLimit`, `accessPassword`, `sendRespondentConfirmation`
- `pages`: ordered page definitions with `fieldIds`

### Response submission (`submitResponseSchema`)

```typescript
{
  formId: uuid,
  startedAt: iso datetime,
  answers: [{ fieldId: uuid, value: string }],
  unlockToken?: string  // password-protected forms
}
```

`multi_select` answers are stored as JSON-stringified string arrays in `value`.

### Analytics (`analyticsSummarySchema`)

```typescript
{
  totalResponses: number,
  completionRate: number,      // 0–100
  avgDurationSeconds: number | null
}
```

### Workspace dependencies

`@repo/schemas` is declared in:

- `packages/trpc/package.json`
- `apps/web/package.json`
- `apps/api/package.json`

### Tests

Run from repo root:

```sh
pnpm --filter @repo/schemas test
```

| File | Coverage |
| --- | --- |
| `field-schema.test.ts` | All 9 types, boundary values, invalid inputs, slug pattern, submit/analytics schemas |
| `field-schema.property.test.ts` | Property 1 — rating bounds, select options, valid variants (`fast-check`, 100 runs) |

### Tasks completed (Phase 1)

- [x] 1.1–1.17 — Package scaffold, all schemas, workspace deps
- [x] 1.18–1.19 — Unit and property tests

---

## Phase 2: Database schema

**Status:** ✅ Complete  
**Priority:** P0  
**Completed:** 2026-05-23  
**Migration:** `packages/database/drizzle/0001_narrow_apocalypse.sql` (applied to Neon)

### Tables

| Table | Purpose |
| --- | --- |
| `users` | Creators/admins — added `role` enum (`creator`, `admin`) |
| `forms` | Form metadata, `fields` JSONB (`FieldSchemaUnion[]`), theme, slug, settings |
| `pages` | Multi-page layout — `field_ids` uuid array per page |
| `responses` | Submissions — `started_at`, `submitted_at`, optional `respondent_email` |
| `answers` | Normalized per-field values (`field_id`, `value` text) |
| `templates` | Gallery templates with `fields` JSONB |

### Enums (`pgEnum`)

- `user_role`: `creator`, `admin`
- `form_status`: `draft`, `published`, `archived`
- `form_visibility`: `public`, `unlisted`
- `form_theme`: `default`, `anime`, `movie`, `game`, `startup`, `tech_company`, `os`, `event`

### Indexes

- `forms`: unique `slug`, `creator_id`, `(status, visibility)`
- `pages`: `form_id`
- `responses`: `form_id`, `submitted_at`
- `answers`: `response_id`, `field_id`

### Commands

```sh
pnpm db:generate   # after schema changes in packages/database/models/
pnpm db:migrate    # applies pending migrations to DATABASE_URL in .env
```

Database package scripts load env from **monorepo root** `.env` via `dotenv -e ../../.env`.

### Tasks completed (Phase 2)

- [x] 2.1–2.9 — All models, schema exports, migration generated and applied

---

## Upcoming phases

### Phase 3: Auth (P0)

- JWT utilities, `protectedProcedure`, `adminProcedure`
- Cookie parser, CORS credentials, demo login

### Phase 4+: tRPC routers, UI, seed, deploy

See `.kiro/specs/form-builder-saas/tasks.md` for the full dependency graph.

---

## Environment variables

A root `.env.example` will be added in Phase 19. Expected variables:

| Variable | App | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | API / database | PostgreSQL connection |
| `JWT_SECRET` | API, web middleware | Session signing (min 32 chars) |
| `GOOGLE_CLIENT_ID` | API | OAuth |
| `GOOGLE_CLIENT_SECRET` | API | OAuth |
| `GOOGLE_REDIRECT_URI` | API | OAuth callback |
| `WEB_ORIGIN` | API | CORS allowed origin |
| `BASE_URL` | API | Public API URL |
| `RESEND_API_KEY` | API | Email (Phase 5) |
| `ENABLE_DEMO_LOGIN` | API | Judge demo bypass |
| `NEXT_PUBLIC_API_URL` | Web | tRPC client |
| `NEXT_PUBLIC_WEB_BASE_URL` | Web | Share links, QR |
| `NEXT_PUBLIC_ENABLE_DEMO_LOGIN` | Web | Demo sign-in UI |

---

## Testing strategy

- **Unit tests** — concrete examples per procedure/schema
- **Property tests** — `fast-check` with `numRuns: 100`, tagged `// Feature: form-builder-saas, Property N: ...`
- **Runner** — Vitest (`pnpm test` via Turborepo)

Properties 2–21 are implemented in later phases alongside their respective routers and UI modules.
