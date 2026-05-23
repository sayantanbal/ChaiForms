# Implementation Plan: ChaiForms — Form Builder SaaS

## Implementation priorities

| Priority | Meaning | Examples |
| --- | --- | --- |
| **P0** | Required for hackathon submission and judging | Auth, core CRUD, public submit, visibility, seed, deploy, demo login, landing/pricing, Scalar docs |
| **P1** | High rubric value; ship after P0 | Analytics charts, CSV, themes, email, explore, form builder polish |
| **P2** | Bonus / stretch | Conditional logic, multi-page, password forms, QR, admin, extensive property tests |

Phases are tagged **P0**, **P1**, or **P2** below. Complete all P0 phases before starting P2.

## Task Dependency Graph

```
Phase 1 (packages/schemas) → Phase 2 (DB schema) → Phase 3 (Auth/JWT)
Phase 3 → Phase 4 (tRPC routers: forms, responses, analytics, explore, admin)
Phase 4 → Phase 5 (Email notifications)
Phase 1 + Phase 3 → Phase 6 (Next.js middleware)
Phase 1 → Phase 7 (Theme system)
Phase 7 → Phase 8 (Form builder UI)
Phase 1 → Phase 9 (Conditional logic engine)
Phase 7 + Phase 9 → Phase 10 (Public form submission page)
Phase 6 + Phase 4 → Phase 11 (Creator dashboard)
Phase 11 → Phase 12 (QR code sharing)
Phase 6 → Phase 13 (Marketing pages)
Phase 6 + Phase 4 → Phase 14 (Admin dashboard)
Phase 2 + Phase 4 → Phase 15 (Seed script)
Phase 10 + Phase 11 → Phase 16 (UX polish)
Phase 10 → Phase 17 (Accessibility & responsiveness)
Phase 4 → Phase 18 (OpenAPI/Scalar docs)
All phases → Phase 19 (README & deployment artifacts)
All phases → Phase 20 (Integration & end-to-end verification)
All P0 phases → Phase 21 (Deployed demo)
```

## Notes

- All property-based tests use `fast-check` with `numRuns: 100` minimum, tagged with `// Feature: form-builder-saas, Property N: <text>`
- All tRPC procedures include `.meta({ openapi: ... })` for Scalar docs coverage
- `packages/schemas` must be built before any package that imports `@repo/schemas`
- Database migrations must be generated (`pnpm db:generate`) and committed after schema changes
- The seed script must be idempotent — safe to run multiple times without creating duplicates
- `jose` is used in Next.js middleware (Edge Runtime); `jsonwebtoken` is used in the tRPC server (Node.js)
- Rate limiting runs **inside** `responses.submit` via `assertSubmitRateLimit` (not Express path `/trpc/responses.submit`)
- `cookie-parser` + CORS `credentials: true` required for session cookies across web/api origins

## Tasks

---

### Phase 1: Monorepo & Package Infrastructure (P0)

- [x] 1. Create `packages/schemas` package
  - [x] 1.1 Scaffold `packages/schemas/package.json` with name `@repo/schemas`, add `zod` dependency, configure `exports` for `./fields`, `./form-settings`, `./response`, `./analytics`, and `.` (index)
  - [x] 1.2 Add `packages/schemas/tsconfig.json` extending `@repo/typescript-config/base.json`
  - [x] 1.3 Implement `packages/schemas/src/fields/short-text.ts` — `shortTextFieldSchema` with `baseField` + `type: "short_text"`, optional `minLength`, `maxLength`, `validationRegex`
  - [x] 1.4 Implement `packages/schemas/src/fields/long-text.ts` — `longTextFieldSchema`
  - [x] 1.5 Implement `packages/schemas/src/fields/email.ts` — `emailFieldSchema`
  - [x] 1.6 Implement `packages/schemas/src/fields/number.ts` — `numberFieldSchema` with optional `min`, `max`
  - [x] 1.7 Implement `packages/schemas/src/fields/single-select.ts` — `singleSelectFieldSchema` with `options` array (min 2)
  - [x] 1.8 Implement `packages/schemas/src/fields/multi-select.ts` — `multiSelectFieldSchema` with `options` array (min 2)
  - [x] 1.9 Implement `packages/schemas/src/fields/checkbox.ts` — `checkboxFieldSchema`
  - [x] 1.10 Implement `packages/schemas/src/fields/rating.ts` — `ratingFieldSchema` with `maxRating` int [2,10]
  - [x] 1.11 Implement `packages/schemas/src/fields/date.ts` — `dateFieldSchema` with optional `minDate`, `maxDate` ISO strings
  - [x] 1.12 Implement `packages/schemas/src/fields/index.ts` — export `FieldSchemaUnion` discriminated union, `FieldType`, and all individual schemas; include `conditionalRules` array on `baseField`
  - [x] 1.13 Implement `packages/schemas/src/form-settings.ts` — `formSettingsSchema`, `pageSchema`, `fieldsUpsertSchema`, `slugPattern`
  - [x] 1.14 Implement `packages/schemas/src/response.ts` — `answerSchema`, `submitResponseSchema`
  - [x] 1.15 Implement `packages/schemas/src/analytics.ts` — `analyticsSummarySchema`, `fieldBreakdownItemSchema`
  - [x] 1.16 Implement `packages/schemas/src/index.ts` — re-export all schemas
  - [x] 1.17 Add `@repo/schemas` as a workspace dependency in `packages/trpc/package.json`, `apps/web/package.json`, and `apps/api/package.json`
  - [x] 1.18 Write unit tests in `packages/schemas/src/__tests__/field-schema.test.ts` covering all 9 field types, boundary values, and invalid inputs
  - [x] 1.19 Write property-based test `packages/schemas/src/__tests__/field-schema.property.test.ts` — **Property 1: FieldSchemaUnion discriminated-union correctness** using `fast-check`; test `rating` rejects `maxRating` outside [2,10], `single_select`/`multi_select` reject fewer than 2 options, valid variants are accepted

---

### Phase 2: Database Schema & Migrations (P0)

- [x] 2. Extend database schema with ChaiForms tables
  - [x] 2.1 Extend `packages/database/models/user.ts` — add `userRoleEnum` (`creator`, `admin`), add `role` column (default `creator`), add `profileImageUrl` and `emailVerified` columns; update `SelectUser` / `InsertUser` types
  - [x] 2.2 Create `packages/database/models/form.ts` — define `formStatusEnum`, `formVisibilityEnum`, `formThemeEnum`, and `formsTable` with all columns per design; add indexes on `creatorId`, unique index on `slug`, composite index on `(status, visibility)`; export `SelectForm`, `InsertForm`
  - [x] 2.3 Create `packages/database/models/page.ts` — define `pagesTable` with `formId` FK, `title`, `order`, `fieldIds` uuid array; add index on `formId`; export `SelectPage`, `InsertPage`
  - [x] 2.4 Create `packages/database/models/response.ts` — define `responsesTable` with `formId` FK, `startedAt`, `submittedAt`, `respondentEmail`, `unlockToken`; add indexes on `formId` and `submittedAt`; export `SelectResponse`, `InsertResponse`
  - [x] 2.5 Create `packages/database/models/answer.ts` — define `answersTable` with `responseId` FK, `fieldId` uuid, `value` text; add indexes on `responseId` and `fieldId`; export `SelectAnswer`, `InsertAnswer`
  - [x] 2.6 Create `packages/database/models/template.ts` — define `templatesTable` with `title`, `description`, `theme`, `fields` JSONB typed as `FieldSchemaUnion[]`, `createdAt`; export `SelectTemplate`, `InsertTemplate`
  - [x] 2.7 Update `packages/database/schema.ts` to re-export all new models alongside the existing user model
  - [x] 2.8 Run `pnpm db:generate` to generate the Drizzle migration SQL for all new tables and enum types; commit the generated migration file under `packages/database/drizzle/`
  - [x] 2.9 Verify migration applies cleanly with `pnpm db:migrate` against a local PostgreSQL instance


---

### Phase 3: Auth — JWT, Procedures & Middleware (P0)

- [ ] 3. Implement JWT utilities and auth middleware
  - [ ] 3.0 Add `cookie-parser` and `@types/cookie-parser` to `apps/api`; call `app.use(cookieParser())` in `apps/api/src/server.ts` before tRPC/OpenAPI adapters
  - [ ] 3.0b Configure CORS in `apps/api/src/server.ts`: `origin: env.WEB_ORIGIN`, `credentials: true` (replace `origin: "*"` for authenticated flows); add `WEB_ORIGIN` to `apps/api/src/env.ts` and `.env.example`
  - [ ] 3.0c Configure ChaiForms_Web tRPC client with `credentials: "include"` on fetch/httpBatchLink
  - [ ] 3.1 Create `packages/trpc/server/utils/jwt.ts` — implement `signJwt(userId: string): string` (HS256, 7d expiry) and `verifyJwt(token: string): { sub: string }` using `jsonwebtoken`; add `JWT_SECRET` env validation
  - [ ] 3.2 Update `packages/trpc/server/context.ts` — read `session` HTTP-only cookie from `req.cookies`, call `verifyJwt`, query `usersTable` by id, attach `user` (or null) to context; export `Context` type including `req` and `res`
  - [ ] 3.3 Update `packages/trpc/server/trpc.ts` — add `protectedProcedure` middleware (throws `UNAUTHORIZED` if `ctx.user` is null) and `adminProcedure` middleware (chains after `protectedProcedure`, throws `FORBIDDEN` if `ctx.user.role !== "admin"`); add `errorFormatter` that logs via `@repo/logger`
  - [ ] 3.4 Extend `packages/trpc/server/routes/auth/route.ts` — implement `callback` public procedure: exchange Google OAuth code for ID token via `GoogleOAuth2Client`, upsert user in `usersTable`, call `signJwt`, set `session` HTTP-only cookie (`sameSite: lax`, `secure` in prod, `maxAge: 7d`), return `{ user }`
  - [ ] 3.5 Implement `auth.signOut` protected procedure — clear `session` cookie, return `{ success: true }`
  - [ ] 3.6 Implement `auth.me` protected procedure — return `ctx.user`
  - [ ] 3.6b Implement `auth.demoLogin` public mutation (P0) — only when `ENABLE_DEMO_LOGIN=true`; input `email` enum `demo@chaiforms.dev` \| `admin@chaiforms.dev`; load seeded user, `signJwt`, set `session` cookie; return `{ user }`; otherwise `NOT_FOUND`; add OpenAPI meta
  - [ ] 3.6c On OAuth `auth.callback`, if Google email matches `demo@chaiforms.dev` or `admin@chaiforms.dev`, upsert user with that email and preserve/link existing seeded user id so dashboard shows seeded forms
  - [ ] 3.6d Add `ENABLE_DEMO_LOGIN` to `apps/api/src/env.ts` and `.env.example`; document in README Demo Credentials
  - [ ] 3.6e Add demo sign-in UI on `/login` when `NEXT_PUBLIC_ENABLE_DEMO_LOGIN=true` — buttons "Continue as Demo Creator" / "Continue as Admin" calling `auth.demoLogin`
  - [ ] 3.7 Write unit tests in `packages/trpc/server/__tests__/auth.test.ts` — callback success, callback with invalid code (400), signOut clears cookie, `protectedProcedure` rejects missing/invalid JWT, `adminProcedure` rejects non-admin role, `demoLogin` gated by env flag
  - [ ] 3.8 Write property-based test `packages/trpc/server/__tests__/jwt.property.test.ts` — **Property 20: JWT authentication context attachment** — for any valid userId string, `signJwt` then `verifyJwt` round-trip returns the same `sub`; for any tampered token string, `verifyJwt` throws


---

### Phase 4: tRPC Routers — Backend Business Logic (P0 core; P1/P2 procedures noted in subtasks)

- [ ] 4. Implement `forms` tRPC router
  - [ ] 4.1 Create `packages/trpc/server/routes/forms/route.ts` — scaffold router with all procedure stubs and `.meta({ openapi: ... })` annotations (tags: `Forms`, `Fields`, `Sharing`, `Templates`)
  - [ ] 4.2 Implement `forms.create` — insert `formsTable` row with `status = draft`, `visibility = unlisted`, auto-generated unique slug (nanoid or uuid-derived), `creatorId = ctx.user.id`; return `formOutputSchema`
  - [ ] 4.3 Implement `forms.list` — query all forms where `creatorId = ctx.user.id`, order by `updatedAt` desc, paginate; return `paginatedFormsSchema`
  - [ ] 4.4 Implement `forms.getById` — query by `id` and `creatorId`; throw `NOT_FOUND` if missing; return form
  - [ ] 4.5 Implement `forms.getBySlug` — public procedure; query by `slug`; throw `NOT_FOUND` if missing; return `publicFormOutputSchema` (omit `accessPasswordHash`, include `hasPassword` boolean)
  - [ ] 4.6 Implement `forms.update` — validate ownership (throw `FORBIDDEN`); validate slug pattern if provided (throw `BAD_REQUEST`); check slug uniqueness (throw `CONFLICT`); hash `accessPassword` with bcrypt if provided; update only provided fields; return updated form
  - [ ] 4.7 Implement `forms.publish` — set `status = published`; return updated form
  - [ ] 4.8 Implement `forms.unpublish` — set `status = draft`; return updated form
  - [ ] 4.9 Implement `forms.delete` — validate ownership; set `status = archived`; return `{ success: true }`
  - [ ] 4.10 Implement `forms.clone` — validate ownership; deep-copy fields, theme, settings; generate new unique slug; set `status = draft`; insert new form row; return new form
  - [ ] 4.11 Implement `forms.fieldsUpsert` — validate ownership; validate `FieldSchemaUnion[]` array (unique ids, valid types, options/maxRating constraints); validate `conditionalRules` sourceFieldIds reference earlier fields in same form (throw `BAD_REQUEST` if not); atomically update `fields` JSONB and upsert `pagesTable` rows; return updated form
  - [ ] 4.12 Implement `forms.unlock` — public procedure; load form by slug; `bcrypt.compare(password, accessPasswordHash)`; on match sign short-lived JWT `{ formId, purpose: "unlock" }` (1h expiry); return `{ unlockToken }`; on mismatch throw `UNAUTHORIZED`
  - [ ] 4.13 Implement `forms.createFromTemplate` — load template by id (throw `NOT_FOUND`); create new form with template's fields, theme, title; `status = draft`; return new form
  - [ ] 4.14 Write unit tests in `packages/trpc/server/__tests__/forms.test.ts` — create defaults, update ownership check, slug validation, slug conflict, clone independence, publish/unpublish lifecycle, fieldsUpsert validation, unlock correct/incorrect password
  - [ ] 4.15 Write property-based test `packages/trpc/server/__tests__/forms-create.property.test.ts` — **Property 2: Form creation defaults invariant** — for any valid title, created form has `status = draft`, `visibility = unlisted`, `creatorId` matches authenticated user
  - [ ] 4.16 Write property-based test `packages/trpc/server/__tests__/forms-update.property.test.ts` — **Property 3: Partial update preserves unmodified fields** — for any existing form and any subset of updatable fields, unmodified fields retain previous values
  - [ ] 4.17 Write property-based test `packages/trpc/server/__tests__/forms-ownership.property.test.ts` — **Property 4: Ownership enforcement on mutations** — any mutation by a different user returns `FORBIDDEN` and does not modify the form
  - [ ] 4.18 Write property-based test `packages/trpc/server/__tests__/forms-clone.property.test.ts` — **Property 5: Form clone produces independent copy** — clone has same fields/theme/title, distinct id and slug, `status = draft`; mutations to clone do not affect original
  - [ ] 4.19 Write property-based test `packages/trpc/server/__tests__/slug-uniqueness.property.test.ts` — **Property 6: Slug uniqueness invariant** — no two forms share the same slug after any sequence of create/update calls
  - [ ] 4.20 Write property-based test `packages/trpc/server/__tests__/slug-validation.property.test.ts` — **Property 7: Slug validation pattern** — `forms.update` succeeds iff slug matches `^[a-z0-9-]{3,60}$`; all non-matching strings return `BAD_REQUEST`
  - [ ] 4.21 Write property-based test `packages/trpc/server/__tests__/password-hash.property.test.ts` — **Property 17: Password hash never stores plaintext** — stored `accessPasswordHash` never equals the plaintext; `bcrypt.compare(plaintext, hash)` returns true
  - [ ] 4.22 Write property-based test `packages/trpc/server/__tests__/unlock-token.property.test.ts` — **Property 18: Unlock token correctness** — correct password returns valid token; any other string returns `UNAUTHORIZED`; valid token allows submit; absent/invalid token returns `FORBIDDEN`


- [ ] 5. Implement `responses` tRPC router
  - [ ] 5.1 Create `packages/trpc/server/routes/responses/route.ts` — scaffold router with `.meta({ openapi: ... })` annotations (tag: `Responses`)
  - [ ] 5.1b Create `packages/trpc/server/utils/submit-rate-limit.ts` — `assertSubmitRateLimit(ip)` in-memory 10 req / 60s; throw `TRPCError({ code: "TOO_MANY_REQUESTS" })`
  - [ ] 5.2 Implement `responses.submit` — public procedure; call `assertSubmitRateLimit(ctx.req.ip)` first; load form by `formId`; check `status = published` (throw `FORBIDDEN` with message if draft/archived); check `expiryDate` (throw `FORBIDDEN` if past); check `responseLimit` (count existing responses, throw `FORBIDDEN` if at limit); if `accessPasswordHash` set, verify `unlockToken` JWT in payload (throw `FORBIDDEN` if missing/invalid); validate each answer against the form's `FieldSchemaUnion` fields (required, minLength, maxLength, regex, number range, date range, email format, `multi_select` JSON array in `options`); insert `responsesTable` row; bulk insert `answersTable` rows; fire-and-forget `NotificationService.sendSubmissionEmails()`; return `{ success: true, responseId }`
  - [ ] 5.3 Implement `responses.list` — protected procedure; validate form ownership; query `responsesTable` with optional `startDate`/`endDate` filter, paginate; join answers; return `paginatedResponsesSchema`
  - [ ] 5.4 Implement `responses.exportCsv` — protected procedure; validate form ownership; load all responses + answers; build CSV with header row (field labels) and one row per response; return CSV string
  - [ ] 5.5 Write unit tests in `packages/trpc/server/__tests__/responses.test.ts` — submit valid response, submit with missing required field, submit to draft form, submit past expiry, submit at response limit, submit without unlock token to password-protected form, list with date filter, CSV export format
  - [ ] 5.6 Write property-based test `packages/trpc/server/__tests__/responses-required.property.test.ts` — **Property 8: Required field enforcement on submission** — for any form with required fields, submitting with any required field absent returns `BAD_REQUEST` containing all missing field IDs
  - [ ] 5.7 Write property-based test `packages/trpc/server/__tests__/responses-text-length.property.test.ts` — **Property 9: Text length constraint enforcement** — for any `short_text`/`long_text` field with `minLength`/`maxLength`, answers outside the range return `BAD_REQUEST`
  - [ ] 5.8 Write property-based test `packages/trpc/server/__tests__/responses-regex.property.test.ts` — **Property 10: Regex validation enforcement** — answers not matching `validationRegex` return `BAD_REQUEST`; matching answers do not
  - [ ] 5.9 Write property-based test `packages/trpc/server/__tests__/responses-number-range.property.test.ts` — **Property 11: Number range constraint enforcement** — answers outside `[min, max]` return `BAD_REQUEST`; values within range do not
  - [ ] 5.10 Write property-based test `packages/trpc/server/__tests__/responses-roundtrip.property.test.ts` — **Property 12: Response submission round-trip** — for any valid answer set, submitted answers are retrievable via `responses.list` with matching `fieldId`/`value` pairs
  - [ ] 5.11 Write property-based test `packages/trpc/server/__tests__/responses-expiry.property.test.ts` — **Property 13: Expired form rejects submissions** — any form with `expiryDate` in the past returns `FORBIDDEN` and persists no rows
  - [ ] 5.12 Write property-based test `packages/trpc/server/__tests__/responses-limit.property.test.ts` — **Property 14: Response limit enforcement** — after exactly N responses, the (N+1)th call returns `FORBIDDEN` and persists no additional rows


- [ ] 6. Implement `analytics` tRPC router
  - [ ] 6.1 Create `packages/trpc/server/routes/analytics/route.ts` — scaffold router with `.meta({ openapi: ... })` annotations (tag: `Analytics`)
  - [ ] 6.2 Create `packages/trpc/server/utils/analytics.ts` — implement `computeCompletionRate(responses)` and `computeAvgDuration(responses)` pure utility functions used by the handler and property tests
  - [ ] 6.3 Implement `analytics.getSummary` — validate form ownership (throw `FORBIDDEN`); run SQL aggregation for `totalResponses`, `completionRate`, `avgDurationSeconds`; return `analyticsSummarySchema`
  - [ ] 6.4 Implement `analytics.getFieldBreakdown` — validate form ownership; run `GROUP BY field_id, value` query on `answersTable`; join with form's `fields` JSONB to attach `fieldLabel`; return `fieldBreakdownItemSchema[]`
  - [ ] 6.5 Implement `analytics.getResponsesOverTime` — validate form ownership; run `DATE_TRUNC(granularity, submitted_at)` aggregation; return `{ date, count }[]`
  - [ ] 6.6 Write unit tests in `packages/trpc/server/__tests__/analytics.test.ts` — summary with known response set, field breakdown distribution, ownership check, responses-over-time with day/week/month granularity
  - [ ] 6.7 Write property-based test `packages/trpc/server/__tests__/analytics-completion.property.test.ts` — **Property 15: Analytics completion rate correctness** — `completionRate = (submittedCount / totalCount) * 100`, `avgDurationSeconds` equals arithmetic mean of durations
  - [ ] 6.8 Write property-based test `packages/trpc/server/__tests__/analytics-breakdown.property.test.ts` — **Property 16: Field breakdown frequency correctness** — each value's count equals exact occurrences in `answers` table; sum of counts equals total answers for that field

- [ ] 7. Implement `explore` tRPC router
  - [ ] 7.1 Create `packages/trpc/server/routes/explore/route.ts` — scaffold router with `.meta({ openapi: ... })` annotations (tags: `Explore`, `Templates`)
  - [ ] 7.2 Implement `explore.listPublicForms` — query forms where `status = published AND visibility = public`, order by `createdAt` desc, paginate; return `paginatedPublicFormsSchema`
  - [ ] 7.3 Implement `explore.listFeaturedForms` — query up to 6 forms where `status = published AND visibility = public`, order by response count desc; return `publicFormCardSchema[]`
  - [ ] 7.4 Implement `explore.listTemplates` — query all `templatesTable` rows; return `templateOutputSchema[]`
  - [ ] 7.5 Write unit tests in `packages/trpc/server/__tests__/explore.test.ts` — listPublicForms excludes draft/archived/unlisted, listFeaturedForms ordered by response count, listTemplates returns all templates

- [ ] 8. Implement `admin` tRPC router
  - [ ] 8.1 Create `packages/trpc/server/routes/admin/route.ts` — scaffold router with `.meta({ openapi: ... })` annotations (tag: `Admin`); all procedures use `adminProcedure`
  - [ ] 8.2 Implement `admin.getStats` — count users, count forms by status, count total responses; return `platformStatsSchema`
  - [ ] 8.3 Implement `admin.listForms` — paginated query of all forms across all creators, join with user email; return `paginatedAdminFormsSchema`
  - [ ] 8.4 Implement `admin.listUsers` — paginated query of all users, join with form count; return `paginatedAdminUsersSchema`
  - [ ] 8.5 Write unit tests in `packages/trpc/server/__tests__/admin.test.ts` — non-admin user returns `FORBIDDEN` on all three procedures, admin user gets correct stats/lists

- [ ] 9. Wire all routers into `serverRouter` and configure rate limiting
  - [ ] 9.1 Update `packages/trpc/server/index.ts` — add `formsRouter`, `responsesRouter`, `analyticsRouter`, `exploreRouter`, `adminRouter` to `serverRouter`
  - [ ] 9.2 Add `express-rate-limit` to `packages/trpc` or `apps/api` only if used for OpenAPI path; primary limit remains `assertSubmitRateLimit` in procedure
  - [ ] 9.3 Verify rate limit via integration test calling `responses.submit` 11 times — 11th returns `TOO_MANY_REQUESTS` (not Express path middleware on `/trpc`)
  - [ ] 9.4 Update `apps/api/src/server.ts` — update `generateOpenApiDocument` title to `"ChaiForms API"` and version to `"1.0.0"`; update root `/` and `/health` messages to ChaiForms
  - [ ] 9.5 Write integration test `apps/api/src/__tests__/rate-limit.test.ts` — 10 submits succeed, 11th returns `TOO_MANY_REQUESTS`


---

### Phase 5: Email Notification Service (P1)

- [ ] 10. Implement `NotificationService` in `packages/services`
  - [ ] 10.1 Add `resend` to `packages/services/package.json` dependencies
  - [ ] 10.2 Create `packages/services/notification/index.ts` — implement `NotificationService` class with `sendSubmissionEmails(opts)` method; send creator notification email and optional respondent confirmation email via Resend SDK; catch and log all errors via `@repo/logger`; never throw or await — fire-and-forget via `void Promise.allSettled(tasks)`
  - [ ] 10.3 Create `packages/services/notification/templates.ts` — implement `creatorEmailHtml(opts)` and `respondentEmailHtml(opts)` template functions returning HTML strings with form title, submission timestamp, and dashboard link
  - [ ] 10.4 Export `NotificationService` from `packages/services/package.json` exports map
  - [ ] 10.5 Add `RESEND_API_KEY` to `apps/api/src/env.ts` validation schema
  - [ ] 10.6 Instantiate `NotificationService` in the `responses.submit` handler and call `sendSubmissionEmails` without `await` after DB writes complete
  - [ ] 10.7 Write unit tests in `packages/services/notification/__tests__/notification.test.ts` — creator email sent on every submission, respondent email sent only when `sendRespondentConfirmation = true` and `respondentEmail` present, email failure is logged and does not throw


---

### Phase 6: Next.js Auth Middleware & Route Guards (P0)

- [ ] 11. Implement Next.js auth middleware and route structure
  - [ ] 11.1 Add `jose` to `apps/web/package.json` dependencies (Edge Runtime-compatible JWT verification)
  - [ ] 11.2 Create `apps/web/middleware.ts` — read `session` cookie, verify JWT with `jose` using `JWT_SECRET`; redirect `/dashboard/*` → `/login` if unauthenticated; redirect `/login` → `/dashboard` if already authenticated; **do not** role-check `/admin/*` here (admin role enforced in `admin/layout.tsx` via server-side `admin.getStats`); export `config.matcher` including `/admin/:path*`
  - [ ] 11.3 Add `JWT_SECRET` and `NEXT_PUBLIC_API_URL` to `apps/web/env.js` validation schema
  - [ ] 11.4 Create `apps/web/app/auth/callback/page.tsx` — client component that reads `?code=` from URL, calls `trpc.auth.callback.useQuery({ code })`, on success redirects to `/dashboard`, on error shows error toast and link back to `/login`
  - [ ] 11.5 Create `apps/web/app/login/page.tsx` — render "Sign in with Google" button that calls `trpc.auth.getSupportedAuthenticationProviders` and redirects to the returned `authUrl`; redirect authenticated users to `/dashboard`
  - [ ] 11.6 Create `apps/web/app/dashboard/layout.tsx` — server component that reads session cookie, calls `trpc.auth.me` server-side; if unauthenticated redirect to `/login`; render dashboard shell (sidebar nav, header with user avatar and sign-out button)
  - [ ] 11.7 Create `apps/web/app/admin/layout.tsx` — server component; call `trpc.admin.getStats` server-side; catch `FORBIDDEN` and redirect to `/dashboard`; render admin shell


---

### Phase 7: Theme System (P1)

- [ ] 12. Implement theme system
  - [ ] 12.1 Create `apps/web/lib/themes.ts` — define `THEMES` record with all 8 theme keys (`default`, `anime`, `movie`, `game`, `startup`, `tech_company`, `os`, `event`), each mapping CSS variable names to HSL values; export `ThemeKey` type
  - [ ] 12.2 Add CSS variable contract to `apps/web/app/globals.css` — define `--form-bg`, `--form-surface`, `--form-primary`, `--form-primary-fg`, `--form-accent`, `--form-text`, `--form-muted`, `--form-border`, `--form-radius`, `--form-font` on `:root`
  - [ ] 12.3 Create `apps/web/components/form-renderer/themed-form-wrapper.tsx` — apply `THEMES[theme]` as inline `style` CSS variables on a wrapper `div` with `bg-[var(--form-bg)]` and `text-[var(--form-text)]` Tailwind classes
  - [ ] 12.4 Write unit tests in `apps/web/lib/__tests__/themes.test.ts` — all 8 themes define all required CSS variables; `ThemeKey` type covers all 8 values


---

### Phase 8: Form Builder UI (P0 minimal editor; P1 full DnD polish)

- [ ] 13. Implement form builder editor (`/dashboard/forms/{formId}/edit`)
  - [ ] 13.1 Add `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `react-resizable-panels`, `use-debounce` to `apps/web/package.json` dependencies
  - [ ] 13.2 Create `apps/web/hooks/use-form-autosave.ts` — implement `useFormAutosave(formId)` hook using `useDebouncedCallback` (1s debounce) wrapping `trpc.forms.fieldsUpsert.useMutation()`; expose `debouncedSave(fields, pages)` and `saveState: "idle" | "saving" | "saved"`
  - [ ] 13.3 Create `apps/web/components/form-builder/field-type-palette.tsx` — left panel listing all 9 field types as draggable items using `@dnd-kit/core` drag source; clicking a type appends a new field with a generated UUID to the canvas
  - [ ] 13.4 Create `apps/web/components/form-builder/field-card.tsx` — sortable field card using `useSortable`; shows field label, type badge, drag handle, delete button; highlights when selected; accessible with `aria-label` and keyboard drag support
  - [ ] 13.5 Create `apps/web/components/form-builder/form-canvas.tsx` — center panel; wraps fields in `DndContext` + `SortableContext` (vertical list strategy); handles `DragEnd` to reorder fields via `arrayMove` and trigger `debouncedSave`; handles drop from palette to add new field; renders page tabs when `pages` array is defined; "Add Field" and "Add Page" buttons
  - [ ] 13.6 Create `apps/web/components/form-builder/field-config-panel.tsx` — right panel; renders configuration form for the selected field; common fields: `label`, `required` toggle, `placeholder`, `description`; type-specific fields: `options` (single/multi select), `maxRating` (rating), `minLength`/`maxLength`/`validationRegex` (text), `min`/`max` (number), `minDate`/`maxDate` (date); conditional rules section with add/edit/remove UI
  - [ ] 13.7 Create `apps/web/app/dashboard/forms/[formId]/edit/page.tsx` — server component that fetches form data; renders three-panel layout using `react-resizable-panels` (`PanelGroup` + `Panel` + `PanelResizeHandle`); header with editable form title (calls `forms.update` on blur), save state indicator, "Preview" link, "Publish/Unpublish" button, and share panel trigger; blocks publish if zero fields with inline error message; shows real-time field count and estimated completion time
  - [ ] 13.8 Create `apps/web/components/form-builder/theme-picker.tsx` — grid of 8 theme swatches; selecting a theme calls `trpc.forms.update.useMutation({ theme })`; wraps preview in `ThemedFormWrapper` for real-time preview
  - [ ] 13.9 Create `apps/web/components/form-builder/settings-panel.tsx` — form settings drawer/sheet: visibility toggle, expiry date picker, response limit input, `sendRespondentConfirmation` toggle, custom slug input with validation feedback, thank-you message textarea, access password input
  - [ ] 13.10 Create `apps/web/components/form-builder/conditional-rule-editor.tsx` — UI to add/edit/remove `conditionalRules` on a field; source field dropdown (only fields earlier in display order), operator select, value input; validates sourceFieldId references an earlier field


---

### Phase 9: Conditional Logic Engine (P2)

- [ ] 14. Implement client-side conditional logic
  - [ ] 14.1 Create `apps/web/lib/conditional-logic.ts` — implement `evaluateConditionalRules(field, answers): boolean` supporting all 5 operators (`equals`, `not_equals`, `contains`, `is_empty`, `is_not_empty`); implement `getVisibleFields(fields, answers): FieldSchemaUnion[]`
  - [ ] 14.2 Write unit tests in `apps/web/lib/__tests__/conditional-logic.test.ts` — all 5 operators with concrete examples, field with no rules is always visible, field with multiple rules uses AND logic
  - [ ] 14.3 Write property-based test `apps/web/lib/__tests__/conditional-logic.property.test.ts` — **Property 21: Client-side conditional visibility** — `is_empty` returns true iff source value trims to empty string; `equals` returns true iff source value strictly equals rule value; `contains` returns true iff source value includes rule value; for any answer map, `getVisibleFields` returns a subset of the original fields array


---

### Phase 10: Public Form Submission Page (P0)

- [ ] 15. Implement public form renderer and submission flow (`/f/{slug}`)
  - [ ] 15.1 Create `apps/web/components/form-renderer/field-renderers/` — one component per field type: `ShortTextField`, `LongTextField`, `EmailField`, `NumberField`, `SingleSelectField`, `MultiSelectField`, `CheckboxField`, `RatingField`, `DateField`; each accepts `field: FieldSchemaUnion`, `value`, `onChange`, `error`; uses semantic HTML with `aria-label`, `aria-describedby` for description/error; `<select>` or accessible combobox for `single_select`
  - [ ] 15.2 Create `apps/web/components/form-renderer/form-page.tsx` — renders all visible fields for a single page using `getVisibleFields`; inline field-level validation before advancing; "Next" / "Back" / "Submit" navigation; progress indicator ("Page X of Y" or progress bar)
  - [ ] 15.3 Create `apps/web/components/form-renderer/form-renderer.tsx` — manages multi-page state (current page index, accumulated answers map); calls `responses.submit` on final page submit; shows thank-you screen on success; handles `BAD_REQUEST` field errors by mapping to inline field errors via `react-hook-form` `setError`
  - [ ] 15.4 Create `apps/web/app/f/[slug]/page.tsx` — server component; call `trpc.forms.getBySlug` server-side; if not found render 404 page; if draft/archived render "not accepting responses" page; if `hasPassword` and no valid `unlockToken` in session storage redirect to `/f/{slug}/password`; otherwise render `ThemedFormWrapper` + `FormRenderer`
  - [ ] 15.5 Create `apps/web/app/f/[slug]/password/page.tsx` — password prompt page; calls `trpc.forms.unlock.useMutation`; on success stores `unlockToken` in `sessionStorage` and redirects to `/f/{slug}`; shows error toast on wrong password
  - [ ] 15.6 Create `apps/web/components/form-renderer/thank-you-screen.tsx` — renders custom `thankyouMessage` or default "Thanks for your response!" message; themed with `ThemedFormWrapper`; "Fill out another response" link
  - [ ] 15.7 Create `apps/web/components/form-renderer/form-not-found.tsx` — 404 state with message and link to `/explore`
  - [ ] 15.8 Create `apps/web/components/form-renderer/form-closed.tsx` — informational page for draft/archived/expired/limit-reached states with appropriate message per state


---

### Phase 11: Creator Dashboard (P0)

- [ ] 16. Implement creator dashboard pages
  - [ ] 16.1 Create `apps/web/app/dashboard/page.tsx` — summary page; calls `trpc.forms.list` server-side; renders stat cards: total forms, published forms, total responses across owned forms; renders "Create your first form" empty state when no forms exist
  - [ ] 16.2 Create `apps/web/app/dashboard/forms/page.tsx` — paginated forms list; calls `trpc.forms.list`; renders form cards/rows with title, status badge, visibility badge, theme badge, response count, last updated; action menu per form: Edit, Preview, Publish/Unpublish, Clone, Archive, Copy Share Link, QR Code, Analytics; empty state with "Create Form" CTA; success toasts after publish/unpublish/clone/archive actions
  - [ ] 16.3 Create `apps/web/app/dashboard/forms/new/page.tsx` — "Create Form" page; renders a title input and "Create" button; calls `trpc.forms.create.useMutation`; on success redirects to `/dashboard/forms/{formId}/edit`
  - [ ] 16.4 Create `apps/web/app/dashboard/forms/[formId]/analytics/page.tsx` — analytics dashboard; calls `analytics.getSummary`, `analytics.getFieldBreakdown`, `analytics.getResponsesOverTime`; renders: response-over-time line chart (recharts), completion rate metric card, avg duration card, per-field breakdown bar/pie charts; empty state when zero responses; granularity selector (day/week/month)
  - [ ] 16.5 Create `apps/web/app/dashboard/forms/[formId]/responses/page.tsx` — paginated responses table; calls `responses.list` with optional date range filter; columns: submission time, respondent email, answers summary; "Export CSV" button calls `responses.exportCsv` and triggers browser download; empty state when no responses
  - [ ] 16.6 Create `apps/web/app/dashboard/forms/[formId]/preview/page.tsx` — renders `ThemedFormWrapper` + `FormRenderer` in preview mode; non-dismissible "Preview Mode" banner at top; submit button disabled with tooltip "Submissions are disabled in preview"; no `responses.submit` call made


---

## Phase 12: QR Code Sharing (P2)

- [ ] 17. Implement QR code generation and sharing
  - [ ] 17.1 Add `qrcode` and `@types/qrcode` to `apps/web/package.json` dependencies
  - [ ] 17.2 Create `apps/web/components/share/qr-code-modal.tsx` — shadcn `<Dialog>` component; on open calls `QRCode.toDataURL(url, { width: 512, margin: 2, errorCorrectionLevel: "M" })`; renders QR image (min 256×256); "Download PNG" button triggers download as `{slug}-qr.png`; accessible with `aria-label`
  - [ ] 17.3 Integrate `QrCodeModal` into the dashboard forms list action menu and the form editor share panel; pass `slug` and `NEXT_PUBLIC_WEB_BASE_URL` as props


---

## Phase 13: Marketing & Public Pages (P0 landing/pricing/explore; P1 templates)

- [ ] 18. Implement landing page (`/`)
  - [ ] 18.1 Create `apps/web/app/(marketing)/layout.tsx` — shared marketing layout with navigation header (links to `/explore`, `/templates`, `/pricing`, "Sign In" button); consistent footer
  - [ ] 18.2 Update `apps/web/app/page.tsx` — hero section with headline, subheadline, "Get Started" CTA → Google OAuth sign-in URL; features section (≥4 capabilities with icons); social proof section (≥3 static testimonial cards); **Featured Forms** section calling `explore.listFeaturedForms` server-side (up to 6 cards with title, theme badge, link to `/f/{slug}`); responsive layout (375px / 768px / 1280px)

- [ ] 19. Implement Explore page (`/explore`)
  - [ ] 19.1 Create `apps/web/app/(marketing)/explore/page.tsx` — calls `explore.listPublicForms` server-side; renders grid of public form cards (title, theme badge, response count, link to `/f/{slug}`); pagination controls; empty state with illustration when no public forms exist; responsive grid

- [ ] 20. Implement Templates page (`/templates`)
  - [ ] 20.1 Create `apps/web/app/(marketing)/templates/page.tsx` — calls `explore.listTemplates` server-side; renders grid of template cards (title, theme badge, description, "Use Template" button); "Use Template" calls `trpc.forms.createFromTemplate.useMutation` and redirects to `/dashboard/forms/{formId}/edit` on success; requires auth (redirect to `/login` if unauthenticated)

- [ ] 21. Implement Pricing page (`/pricing`)
  - [ ] 21.1 Create `apps/web/app/(marketing)/pricing/page.tsx` — renders exactly 3 pricing tiers (Free, Pro, Enterprise) with feature lists and CTA buttons (no real payment); responsive layout; navigation header consistent with other marketing pages


---

## Phase 14: Admin Dashboard (P2)

- [ ] 22. Implement admin dashboard pages
  - [ ] 22.1 Create `apps/web/app/admin/page.tsx` — calls `admin.getStats` server-side; renders summary stat cards (user count, form count by status, total responses); renders `admin.listForms` and `admin.listUsers` paginated tables with all required columns per requirements 24.6–24.7
  - [ ] 22.2 Create `apps/web/app/admin/forms/page.tsx` — paginated table of all forms across all creators; columns: title, owner email, status, visibility, theme, response count, created date
  - [ ] 22.3 Create `apps/web/app/admin/users/page.tsx` — paginated table of all users; columns: email, display name, role, form count, created date


---

## Phase 15: Seed Script (P0)

- [ ] 23. Implement seed script
  - [ ] 23.1 Create `packages/database/seed.ts` — idempotent seed script (upsert by email/title to avoid duplicates on re-run); executable via `pnpm db:seed` from monorepo root
  - [ ] 23.2 Seed demo Creator user: `email = demo@chaiforms.dev`, `fullName = "ChaiForms Demo"`, `role = creator`
  - [ ] 23.3 Seed Admin user: `email = admin@chaiforms.dev`, `fullName = "ChaiForms Admin"`, `role = admin`
  - [ ] 23.4 Seed 3 Template records: "Which Anime Character Are You?" (`anime`), "Rate Your Favorite OS" (`os`), "Startup Idea Validator" (`startup`) — each with ≥5 realistic fields using appropriate field types
  - [ ] 23.5 Seed 3 published Forms owned by demo Creator, each with a distinct theme (`anime`, `os`, `startup`), `status = published`; at least 1 with `visibility = public`; at least 1 with `sendRespondentConfirmation = true`
  - [ ] 23.6 Seed the anime form with ≥2 pages and multi-page layout (Requirement 21.7)
  - [ ] 23.7 Seed the os form with at least one field using `conditionalRules` (e.g., show follow-up only when a select option is chosen) (Requirement 20.7)
  - [ ] 23.8 Seed the startup form with `accessPasswordHash` (bcrypt hash of `"demo1234"`) and `visibility = unlisted` (Requirement 22.7)
  - [ ] 23.9 Seed ≥20 realistic `responsesTable` + `answersTable` rows per published form (60+ total responses) with varied answer values and `startedAt`/`submittedAt` timestamps spread over the past 30 days
  - [ ] 23.10 Ensure ≥3 seeded public published forms have sufficient response counts to populate `explore.listFeaturedForms` (Requirement 26.3)
  - [ ] 23.11 Add `db:seed` script to `packages/database/package.json`, root `package.json` scripts, and `turbo.json` pipeline (with `dependsOn: ["db:migrate"]` to ensure migrations run first)


---

## Phase 16: UX Polish — Loading, Empty, Error States (P1)

- [ ] 24. Implement consistent UX states across all pages
  - [ ] 24.1 Create `apps/web/components/ui/skeleton-card.tsx` and `apps/web/components/ui/skeleton-table.tsx` — reusable skeleton placeholders for form cards and table rows
  - [ ] 24.2 Add loading skeletons to: dashboard summary page, forms list, analytics page, responses table, explore page, templates page — shown while tRPC queries are in `isLoading` state
  - [ ] 24.3 Create `apps/web/components/ui/empty-state.tsx` — reusable empty state component with optional illustration, heading, description, and primary action button
  - [ ] 24.4 Add empty states to: `/dashboard/forms` (no forms), analytics (zero responses), `/explore` (no public forms), `/dashboard` (no forms summary)
  - [ ] 24.5 Create `apps/web/lib/trpc-error-handler.ts` — implement `handleTrpcError(error)` that reads `error.data?.cause?.fieldErrors` for form-level handling and falls back to `toast.error(error.message)` via `sonner`
  - [ ] 24.6 Apply `handleTrpcError` in all mutation `onError` callbacks across dashboard and public form pages
  - [ ] 24.7 Add loading indicators (spinner or disabled state) to all primary action buttons while mutations are in flight: publish, unpublish, clone, archive, create form, submit response, export CSV, use template
  - [ ] 24.8 Add success toasts via `sonner` after: form publish, unpublish, clone, archive, template use, CSV export download triggered


---

## Phase 17: Accessibility & Responsiveness (P1)

- [ ] 25. Ensure accessibility and responsive layout compliance
  - [ ] 25.1 Audit all field renderer components (`ShortTextField`, `LongTextField`, etc.) — ensure each has a `<label>` with `htmlFor` matching input `id`, `aria-describedby` pointing to description and error elements, `aria-required` on required fields, `aria-invalid` when in error state
  - [ ] 25.2 Audit `RatingField` — ensure star/number rating controls are keyboard navigable with `role="radiogroup"` and individual `role="radio"` items
  - [ ] 25.3 Audit `SingleSelectField` — ensure native `<select>` or accessible combobox with proper `aria-label`
  - [ ] 25.4 Audit form navigation buttons ("Next", "Back", "Submit") — ensure focus management moves to top of next page on advance; progress indicator has `aria-label="Page X of Y"`
  - [ ] 25.5 Audit drag-and-drop field cards in the builder — ensure keyboard drag support via `@dnd-kit` accessibility utilities; each draggable has `aria-roledescription="sortable field"` and announces position changes
  - [ ] 25.6 Verify all pages render correctly at 375px, 768px, and 1280px viewport widths using Tailwind responsive utilities; three-panel builder collapses to single-panel on mobile with tab navigation
  - [ ] 25.7 Ensure color contrast ratios meet WCAG AA (4.5:1 for normal text) for all 8 themes — document any themes requiring manual verification


---

## Phase 18: OpenAPI / Scalar Docs Coverage (P0)

- [ ] 26. Verify and complete OpenAPI/Scalar documentation coverage
  - [ ] 26.1 Audit all tRPC procedures across `auth`, `forms`, `responses`, `analytics`, `explore`, `admin` routers — ensure every procedure has `.meta({ openapi: { method, path, tags } })` with correct tag from: `Authentication`, `Forms`, `Fields`, `Responses`, `Analytics`, `Explore`, `Templates`, `Notifications`, `Admin`, `Sharing`
  - [ ] 26.2 Verify `generateOpenApiDocument` in `apps/api/src/server.ts` uses title `"ChaiForms API"` and version `"1.0.0"`
  - [ ] 26.3 Verify `/docs` route serves Scalar UI with all tagged operations and request/response schemas populated
  - [ ] 26.4 Add OpenAPI metadata to `responses.submit` with `Retry-After` header documented in the description


---

## Phase 19: README & Repository Artifacts (P0)

- [ ] 27. Update README and document submission artifacts
  - [ ] 27.0 Create `.env.example` at monorepo root (and/or per-app) with: `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `WEB_ORIGIN`, `BASE_URL`, `RESEND_API_KEY`, `ENABLE_DEMO_LOGIN`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WEB_BASE_URL`, `NEXT_PUBLIC_ENABLE_DEMO_LOGIN`
  - [ ] 27.0b Rebrand `apps/web/app/layout.tsx` metadata and `apps/web/app/page.tsx` from Streamyst to ChaiForms
  - [ ] 27.1 Replace all "Streamyst" branding in `README.md` with "ChaiForms"
  - [ ] 27.2 Add **Local Development Setup** section: `pnpm install`, copy `.env.example`, `pnpm db:migrate`, `pnpm db:seed`, `pnpm dev`; document all required env vars (`DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WEB_BASE_URL`)
  - [ ] 27.3 Add **Demo Credentials** section: demo Creator email (`demo@chaiforms.dev`), Admin email (`admin@chaiforms.dev`), password-protected form demo password (`demo1234`), Google OAuth instructions, and **demo bypass** (`ENABLE_DEMO_LOGIN=true` + "Continue as Demo Creator" on `/login`) for deployed judging
  - [ ] 27.4 Add **Submission Artifacts** section listing: GitHub repository URL, deployed ChaiForms_Web URL, deployed API base URL, Scalar API docs URL (`{API_BASE_URL}/docs`)
  - [ ] 27.5 Add **QR Sharing** mention under Features section
  - [ ] 27.6 Document `pnpm db:migrate` command and note that schema changes require generating and committing a new migration


---

## Phase 20: Integration & End-to-End Verification (P0 smoke tests; P1 full suite)

- [ ] 28. Integration tests and end-to-end verification
  - [ ] 28.1 Write integration test `apps/api/src/__tests__/oauth-callback.test.ts` — mock Google token exchange; verify user upsert, JWT cookie set, and `{ user }` response
  - [ ] 28.2 Write integration test `apps/api/src/__tests__/submit-flow.test.ts` — create form, publish, submit valid response, verify `responsesTable` and `answersTable` rows persisted, verify `NotificationService.sendSubmissionEmails` called
  - [ ] 28.3 Write integration test `apps/api/src/__tests__/visibility-enforcement.test.ts` — verify `explore.listPublicForms` excludes draft, archived, and unlisted forms; verify `responses.submit` rejects draft/archived forms
  - [ ] 28.4 Verify `pnpm build` passes for all packages and apps with no TypeScript errors
  - [ ] 28.5 Verify `pnpm test` (Vitest) passes all unit and property-based tests across `packages/schemas`, `packages/trpc`, `packages/services`, and `apps/web`
  - [ ] 28.6 Verify `pnpm db:seed` runs idempotently (run twice, assert no duplicate records)
  - [ ] 28.7 Manual judge smoke test (P0): open DeployedDemo `/`, `/explore`, `/f/{public-slug}`, submit response, `/docs`, demo login → `/dashboard` with seeded analytics — document pass/fail in README or DEPLOYMENT.md


---

## Phase 21: Deployed Demo (P0)

- [ ] 29. Deploy ChaiForms for hackathon submission
  - [ ] 29.1 Provision managed PostgreSQL; set `DATABASE_URL` on API service
  - [ ] 29.2 Deploy `apps/api` (e.g. Railway, Render, Fly.io) with env: `JWT_SECRET`, `GOOGLE_*`, `WEB_ORIGIN`, `BASE_URL`, `RESEND_API_KEY`, `ENABLE_DEMO_LOGIN=true`
  - [ ] 29.3 Deploy `apps/web` (e.g. Vercel) with env: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WEB_BASE_URL`, `JWT_SECRET` (for middleware), `NEXT_PUBLIC_ENABLE_DEMO_LOGIN=true`
  - [ ] 29.4 Run `pnpm db:migrate` and `pnpm db:seed` against production database (one-time release job or documented CLI from CI)
  - [ ] 29.5 Verify CORS: web origin allowed, `credentials: include`, session cookie set after `auth.demoLogin` and OAuth callback
  - [ ] 29.6 Fill README **Submission Artifacts** with live URLs: GitHub repo, web app, API base, `{API_BASE_URL}/docs`
  - [ ] 29.7 Optional: add `DEPLOYMENT.md` with platform-specific steps and rollback notes
  - [ ] 29.8 Confirm public paths work without login: `/`, `/pricing`, `/explore`, `/f/{slug}`, Scalar `/docs`

