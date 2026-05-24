# Implementation Plan: ChaiForms — Form Builder SaaS

## Implementation priorities

| Priority | Meaning | Examples |
| --- | --- | --- |
| **P0** | Required for hackathon submission and judging | Auth, core CRUD, public submit, visibility, seed, deploy, demo login, landing/pricing, Scalar docs |
| **P1** | High rubric value; ship after P0 | Analytics charts, real-time WebSocket analytics, CSV, themes, email, explore, form builder polish |
| **P2** | Bonus / stretch | Conditional logic, multi-page, password forms, QR, admin, workspaces, extensive property tests |

Phases are tagged **P0**, **P1**, or **P2** below. Complete all P0 phases before starting P2.

## Task Dependency Graph

```
Phase 1 (packages/schemas) → Phase 2 (DB schema) → Phase 3 (Auth/JWT/CSRF)
Phase 3 → Phase 4 (tRPC routers: forms, responses, analytics, explore, admin, workspaces)
Phase 4 → Phase 5 (Email notifications)
Phase 1 + Phase 3 → Phase 6 (Next.js middleware)
Phase 1 → Phase 7 (Theme system)
Phase 7 → Phase 8 (Form builder UI)
Phase 1 → Phase 9 (Conditional logic engine)
Phase 7 + Phase 9 → Phase 10 (Public form submission page)
Phase 6 + Phase 4 → Phase 11 (Creator dashboard & Workspaces)
Phase 11 → Phase 12 (QR code sharing)
Phase 6 → Phase 13 (Marketing pages)
Phase 6 + Phase 4 → Phase 14 (Admin dashboard)
Phase 4 → Phase 15 (WebSocket real-time analytics)
Phase 2 + Phase 4 → Phase 16 (Seed script)
Phase 10 + Phase 11 → Phase 17 (UX polish)
Phase 10 → Phase 18 (Accessibility & responsiveness)
Phase 4 → Phase 19 (OpenAPI/Scalar docs)
All phases → Phase 20 (README & deployment artifacts)
All phases → Phase 21 (Integration & end-to-end verification)
All P0 phases → Phase 22 (Deployed demo)
```

## Notes

- All property-based tests use `fast-check` with `numRuns: 100` minimum, tagged with `// Feature: form-builder-saas, Property N: <text>`
- All tRPC procedures include `.meta({ openapi: ... })` for Scalar docs coverage
- `packages/schemas` must be built before any package that imports `@repo/schemas`
- Database migrations must be generated (`pnpm db:generate`) and committed after schema changes
- The seed script must be idempotent — safe to run multiple times without creating duplicates
- `jose` is used in Next.js middleware (Edge Runtime); `jsonwebtoken` is used in the tRPC server (Node.js)
- Rate limiting is enforced via Upstash Redis `@upstash/ratelimit` for auth, mutations, queries, and form submissions.
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

- [ ] 2. Extend database schema with ChaiForms tables
  - [ ] 2.1 Extend `packages/database/models/user.ts` — add `userRoleEnum` (`creator`, `admin`), add `role` column (default `creator`), add `profileImageUrl`, `emailVerified`, and `isBlocked` columns; update `SelectUser` / `InsertUser` types
  - [ ] 2.2 Create `packages/database/models/refresh-token.ts` — define `refreshTokensTable` with `userId` FK, `tokenHash`, `family`, `expiresAt`, `revokedAt`; add indexes on `userId` and `family`
  - [ ] 2.3 Create `packages/database/models/workspace.ts` — define `workspacesTable` with `name`, `description`, `ownerId`
  - [ ] 2.4 Create `packages/database/models/workspace-member.ts` — define `workspaceRoleEnum` (`admin`, `creator`, `viewer`), `workspaceMembersTable` with `workspaceId`, `userId`, `role`, `invitedAt`, `acceptedAt`
  - [ ] 2.5 Create `packages/database/models/form.ts` — define `formStatusEnum`, `formVisibilityEnum`, `formScopeEnum`, `formThemeEnum`, and `formsTable` with all columns per design (including `workspaceId`, `scope`, `requiresAuth`, `deletedAt`); add indexes on `creatorId`, `workspaceId`, unique index on `slug`, composite index on `(status, visibility)`
  - [ ] 2.6 Create `packages/database/models/page.ts` — define `pagesTable` with `formId` FK, `title`, `order`, `fieldIds` uuid array; add index on `formId`
  - [ ] 2.7 Create `packages/database/models/response.ts` — define `responsesTable` with `formId` FK, `startedAt`, `submittedAt`, `respondentEmail`, `unlockToken`; add indexes on `formId` and `submittedAt`
  - [ ] 2.8 Create `packages/database/models/answer.ts` — define `answersTable` with `responseId` FK, `fieldId` uuid, `value` text; add indexes on `responseId` and `fieldId`
  - [ ] 2.9 Create `packages/database/models/template.ts` — define `templatesTable` with `title`, `description`, `theme`, `fields` JSONB typed as `FieldSchemaUnion[]`, `createdAt`
  - [ ] 2.10 Update `packages/database/schema.ts` to re-export all new models
  - [ ] 2.11 Run `pnpm db:generate` to generate the Drizzle migration SQL for all new tables and enum types; commit the generated migration file under `packages/database/drizzle/`
  - [ ] 2.12 Verify migration applies cleanly with `pnpm db:migrate` against a local PostgreSQL instance


---

### Phase 3: Auth — JWT Refresh, CSRF Hardening, & Middleware (P0)

- [ ] 3. Implement JWT utilities, refresh flow, and auth middleware
  - [ ] 3.1 Create `packages/trpc/server/utils/jwt.ts` — implement `signAccessJwt`, `signRefreshJwt`, `verifyAccessJwt`, `verifyRefreshJwt`, `hashToken`, `generateTokenId`
  - [ ] 3.2 Update `packages/trpc/server/utils/csrf.ts` — harden CSRF cookie to `SameSite=Strict`, implement `assertCsrf()` to verify `x-csrf-token` header matches cookie and HMAC signature
  - [ ] 3.3 Update `packages/trpc/server/context.ts` — read `chaiforms-access` HTTP-only cookie, call `verifyAccessJwt`, query `usersTable` by id (check `!isBlocked`), attach `user` to context
  - [ ] 3.4 Update `packages/trpc/server/trpc.ts` — add `protectedProcedure` (throws `UNAUTHORIZED`), `adminProcedure` (throws `FORBIDDEN` if not admin)
  - [ ] 3.5 Extend `packages/trpc/server/routes/auth/route.ts` — update `callback` to issue `chaiforms-access` (15m), `chaiforms-refresh` (30d), and fresh CSRF token; store hashed refresh token in DB
  - [ ] 3.6 Implement `auth.refreshToken` public procedure — verify `chaiforms-refresh` cookie, check `refreshTokensTable`, rotate token (or revoke family on reuse), issue new access/refresh/CSRF cookies
  - [ ] 3.7 Implement `auth.signOut` protected procedure — clear `chaiforms-access`, `chaiforms-refresh`, CSRF cookies, and delete all `refreshTokensTable` rows for that user
  - [ ] 3.8 Add demo login bypass and `auth.demoLogin` mutation (P0) matching design
  - [ ] 3.9 Write tests for auth and refresh token rotation (**Property 22: Refresh token rotation correctness**)


---

### Phase 4: tRPC Routers & Rate Limiting (P0 core; P1/P2 procedures noted)

- [ ] 4. Implement Upstash Rate Limiting
  - [ ] 4.1 Create `packages/trpc/server/utils/rate-limiter.ts` — setup `@upstash/ratelimit` for auth (10/min), mutations (60/min), queries (200/min), submit (10/min)
  - [ ] 4.2 Add rate limiter middleware to `tRPCContext` in `trpc.ts` to apply to all mutations/queries
  - [ ] 4.3 Update `responses.submit` to use specific submit limiter with IP + device fingerprint

- [ ] 5. Implement `forms` tRPC router
  - [ ] 5.1 Implement standard CRUD (`create`, `list`, `getById`, `getBySlug`, `update`)
  - [ ] 5.2 Implement `forms.publish` — accept `scope`, `workspaceId`, `requiresAuth`
  - [ ] 5.3 Implement `forms.softDelete` — set `deletedAt = NOW()`
  - [ ] 5.4 Implement `forms.recover` — clear `deletedAt` within 7-day window
  - [ ] 5.5 Implement `forms.listTrash` — list forms with `deletedAt` set
  - [ ] 5.6 Implement `forms.archive` and `forms.listArchived`
  - [ ] 5.7 Implement `forms.clone`, `forms.fieldsUpsert`, `forms.unlock`, `forms.createFromTemplate`
  - [ ] 5.8 Write tests for form ownership, clone independence, slug validation, soft-delete recovery window (**Property 25: Soft-delete recovery window**)

- [ ] 6. Implement `responses` tRPC router
  - [ ] 6.1 Implement `responses.submit` — validate status, expiry, limits, unlock token; enforce `requiresAuth` and `workspace` scope checks; validate answers; persist; broadcast WebSocket delta; trigger emails
  - [ ] 6.2 Implement `responses.list` — paginated, join answers
  - [ ] 6.3 Implement `responses.exportCsv` — generate and return CSV string with form answers
  - [ ] 6.4 Write property tests for required fields, constraints, response limits, workspace submit enforcement (**Property 24: Workspace-scoped + requiresAuth submission enforcement**)

- [ ] 7. Implement `analytics` tRPC router
  - [ ] 7.1 Implement `getSummary` (total, completion rate, avg duration)
  - [ ] 7.2 Implement `getFieldBreakdown` (counts grouped by value)
  - [ ] 7.3 Implement `getResponsesOverTime` (date truncated grouping)
  - [ ] 7.4 Write tests for analytics correctness (**Property 15, 16**)

- [ ] 8. Implement `explore` tRPC router
  - [ ] 8.1 Implement `listPublicForms` (global + public + published only)
  - [ ] 8.2 Implement `listFeaturedForms` (top 6 by response count)
  - [ ] 8.3 Implement `listTemplates`

- [ ] 9. Implement `admin` tRPC router
  - [ ] 9.1 Implement `getStats`, `listForms`, `listUsers`
  - [ ] 9.2 Implement `admin.blockUser` and `admin.unblockUser`
  - [ ] 9.3 Write tests for admin procedures and blocked user enforcement (**Property 23: Blocked user gets FORBIDDEN**)

- [ ] 10. Implement `workspaces` tRPC router (P1)
  - [ ] 10.1 Implement `create`, `list`, `getById`
  - [ ] 10.2 Implement `addMember` (upsert user, send email via Resend), `removeMember`, `updateMemberRole`
  - [ ] 10.3 Implement `listMembers`


---

### Phase 5: Email Notification Service (P1)

- [ ] 11. Implement `NotificationService`
  - [ ] 11.1 Create `packages/services/notification/index.ts` using Resend SDK
  - [ ] 11.2 Implement `sendSubmissionEmails(opts)` (fire-and-forget, logs errors)
  - [ ] 11.3 Implement `sendWorkspaceInviteEmail(opts)`
  - [ ] 11.4 Wire into `responses.submit` and `workspaces.addMember`


---

### Phase 6: Next.js Auth Middleware & Route Guards (P0)

- [ ] 12. Implement Next.js auth middleware and interceptors
  - [ ] 12.1 Create `apps/web/middleware.ts` — verify `chaiforms-access` using `jose` Edge Runtime; redirect `/dashboard/*` → `/login` if unauthenticated
  - [ ] 12.2 Setup tRPC client interceptor in `apps/web/trpc/client.ts` to automatically call `auth.refreshToken` on 401s and retry
  - [ ] 12.3 Create `/auth/callback` page and `/login` page
  - [ ] 12.4 Add `ENABLE_DEMO_LOGIN` UI components


---

### Phase 7: Theme System (P1)

- [ ] 13. Implement theme system
  - [ ] 13.1 Define `THEMES` mapping in `apps/web/lib/themes.ts`
  - [ ] 13.2 Add CSS variable contract to `apps/web/app/globals.css`
  - [ ] 13.3 Create `ThemedFormWrapper` component


---

### Phase 8: Form Builder UI (P0 minimal editor; P1 full polish)

- [ ] 14. Implement form builder (`/dashboard/forms/{formId}/edit`)
  - [ ] 14.1 Setup `use-form-autosave` hook with 1s debounce
  - [ ] 14.2 Build Three-Panel Layout (`react-resizable-panels`)
  - [ ] 14.3 Implement left panel (Field Type Palette) and center canvas (DnD reordering)
  - [ ] 14.4 Implement right panel (Field Config) including conditional rule editor
  - [ ] 14.5 Add `scope` (global/workspace) and `requiresAuth` toggles in Settings drawer


---

### Phase 9: Conditional Logic Engine (P2)

- [ ] 15. Implement client-side conditional logic
  - [ ] 15.1 Create `apps/web/lib/conditional-logic.ts` with `evaluateConditionalRules` and `getVisibleFields`
  - [ ] 15.2 Write tests for conditional visibility (**Property 21**)


---

### Phase 10: Public Form Submission Page (P0)

- [ ] 16. Implement public form renderer (`/f/{slug}`)
  - [ ] 16.1 Create field rendering components (ShortText, SingleSelect, etc.) with accessibility (ARIA)
  - [ ] 16.2 Handle `requiresAuth=true` forms (redirect to login)
  - [ ] 16.3 Handle multi-page form navigation and inline field-level validation
  - [ ] 16.4 Handle password-protected form unlock flow (`/f/{slug}/password`)
  - [ ] 16.5 Map `BAD_REQUEST` tRPC fieldErrors to UI via `react-hook-form`


---

### Phase 11: Creator Dashboard & Workspaces (P0)

- [ ] 17. Implement creator dashboard pages
  - [ ] 17.1 Create `/dashboard` summary page
  - [ ] 17.2 Create `/dashboard/forms` list with actions (Edit, Publish, Clone, Delete, Archive, Share)
  - [ ] 17.3 Create `/dashboard/forms/[formId]/analytics` with charts (recharts)
  - [ ] 17.4 Create `/dashboard/forms/[formId]/responses` table with "Export CSV" button
  - [ ] 17.5 Create `/dashboard/forms/archive` and `/dashboard/forms/trash` (show days until deletion)
  - [ ] 17.6 Create `/dashboard/workspaces` list and `/dashboard/workspaces/[workspaceId]` management UI (admins can add/remove/update members)


---

### Phase 12: QR Code Sharing (P2)

- [ ] 18. Implement QR code generation
  - [ ] 18.1 Add `qrcode` package and create `qr-code-modal.tsx` Dialog component
  - [ ] 18.2 Integrate into dashboard list and builder share panel


---

### Phase 13: Marketing & Public Pages (P0 landing/explore; P1 templates)

- [ ] 19. Implement marketing pages
  - [ ] 19.1 Update landing page (`/`) with Featured Forms section
  - [ ] 19.2 Implement Explore page (`/explore`) fetching global + public forms
  - [ ] 19.3 Implement Templates page (`/templates`)
  - [ ] 19.4 Implement Pricing page (`/pricing`)


---

### Phase 14: Admin Dashboard (P2)

- [ ] 20. Implement admin dashboard
  - [ ] 20.1 Create `/admin` stats summary
  - [ ] 20.2 Create `/admin/forms` paginated table across all creators
  - [ ] 20.3 Create `/admin/users` paginated table with "Block/Unblock" toggle buttons


---

### Phase 15: WebSocket Real-Time Analytics (P1)

- [ ] 21. Implement real-time analytics updates
  - [ ] 21.1 Setup `ws` WebSocketServer in `apps/api/src/websocket.ts` listening on `upgrade` events
  - [ ] 21.2 Validate CSRF token before upgrading WebSocket
  - [ ] 21.3 Call `broadcastDelta(formId, delta)` inside `responses.submit` upon successful insertion
  - [ ] 21.4 Create `useAnalyticsWs(formId)` hook in `apps/web/hooks/use-analytics-ws.ts`
  - [ ] 21.5 Update Analytics Dashboard to apply WebSocket `response_delta` events to charts/totals in real-time


---

### Phase 16: Seed Script (P0)

- [ ] 22. Implement idempotent seed script (`packages/database/seed.ts`)
  - [ ] 22.1 Seed Demo Creator and Admin users
  - [ ] 22.2 Seed a Demo Workspace and assign users
  - [ ] 22.3 Seed Templates and varied published Forms (Anime, OS, Startup)
  - [ ] 22.4 Seed workspace-scoped forms with `requiresAuth = true` to verify gating
  - [ ] 22.5 Seed ≥20 realistic responses per form
  - [ ] 22.6 Add cron task script for `purge-deleted-forms`


---

### Phase 17: UX Polish — Loading, Empty, Error States (P1)

- [ ] 23. Implement consistent UX states
  - [ ] 23.1 Create reusable `skeleton-card.tsx` and `empty-state.tsx`
  - [ ] 23.2 Add empty/loading states to all lists and analytics pages
  - [ ] 23.3 Implement global tRPC error handler mapping to `sonner` toasts and inline form errors
  - [ ] 23.4 Add loading spinners to primary action buttons during mutations


---

### Phase 18: Accessibility & Responsiveness (P1)

- [ ] 24. Ensure a11y and responsive layout compliance
  - [ ] 24.1 Audit ARIA attributes on field renderers, form navigation, and DnD items
  - [ ] 24.2 Verify rendering at 375px / 768px / 1280px breakpoints
  - [ ] 24.3 Verify color contrast on all themes


---

### Phase 19: OpenAPI / Scalar Docs Coverage (P0)

- [ ] 25. Complete OpenAPI/Scalar documentation
  - [ ] 25.1 Audit all tRPC procedures across all routers to ensure `.meta({ openapi: ... })` is present with valid tags/responses
  - [ ] 25.2 Add `Retry-After` header documentation to `responses.submit` endpoint


---

### Phase 20: README & Repository Artifacts (P0)

- [ ] 26. Update README for submission
  - [ ] 26.1 Create `.env.example` including Upstash Redis variables
  - [ ] 26.2 Document Local Development Setup (`pnpm install`, `pnpm db:migrate`, `pnpm db:seed`)
  - [ ] 26.3 Document Demo Credentials & bypasses
  - [ ] 26.4 List Submission Artifacts (repo URL, deployed URLs, API docs)


---

### Phase 21: Integration & End-to-End Verification (P0 smoke tests; P1 full suite)

- [ ] 27. Verification and testing
  - [ ] 27.1 Write integration tests for auth, submit flow, visibility enforcement
  - [ ] 27.2 Verify `pnpm build` and `pnpm test` (Vitest) pass
  - [ ] 27.3 Manual judge smoke test (P0): open DeployedDemo, explore, submit, view docs, demo login, check workspace analytics


---

### Phase 22: Deployed Demo (P0)

- [ ] 28. Deploy ChaiForms
  - [ ] 28.1 Provision managed Postgres and Redis (Upstash)
  - [ ] 28.2 Deploy `apps/api` and `apps/web` with environment variables
  - [ ] 28.3 Run `pnpm db:migrate` and `pnpm db:seed` against production database
  - [ ] 28.4 Verify CORS credentials, WebSocket connections, and public paths
