# ChaiForms — Implementation Audit & Remaining Work

> Audited against `requirements.md`, `design.md`, and `tasks.md` on 2026-05-24.

---

## Summary

| Area | Status |
|---|---|
| packages/schemas | ✅ Complete |
| packages/database models | ✅ Complete |
| packages/trpc — auth router | ✅ Complete |
| packages/trpc — forms router | ⚠️ Partial (missing softDelete/recover/listTrash/archive procedures) |
| packages/trpc — responses router | ✅ Complete |
| packages/trpc — analytics router | ✅ Complete |
| packages/trpc — explore router | ✅ Complete |
| packages/trpc — admin router | ⚠️ Partial (missing blockUser/unblockUser) |
| packages/trpc — workspaces router | ❌ Not implemented |
| packages/services — notification | ✅ Complete (creator + respondent emails) |
| packages/services — workspace invite email | ❌ Not implemented |
| apps/api — server | ⚠️ Partial (rate limiting uses express-rate-limit, not Upstash; no WebSocket server; no cron) |
| apps/web — middleware.ts | ❌ Not implemented |
| apps/web — dashboard pages | ⚠️ Partial (missing trash, archive, workspaces pages) |
| apps/web — admin pages | ⚠️ Partial (missing block/unblock UI, isBlocked column in table) |
| apps/web — form builder settings | ⚠️ Partial (missing scope/workspaceId/requiresAuth controls) |
| apps/web — analytics WebSocket | ❌ Not implemented |
| Seed script | ⚠️ Partial (missing workspace seed, workspace-scoped form) |

---

## ✅ What Is Fully Implemented


### Phase 1 — packages/schemas (Tasks 1.1–1.19)
All 9 field type schemas (`short_text`, `long_text`, `email`, `number`, `single_select`, `multi_select`, `checkbox`, `rating`, `date`) with discriminated union, conditional rules on `baseField`, `formSettingsSchema`, `submitResponseSchema`, `analyticsSummarySchema`, unit tests, and property-based tests.

### Phase 2 — Database Schema (Tasks 2.1–2.12)
All tables implemented: `usersTable` (with `role`, `isBlocked`, `profileImageUrl`, `emailVerified`), `refreshTokensTable`, `workspacesTable`, `workspaceMembersTable`, `formsTable` (with `scope`, `requiresAuth`, `deletedAt`, `workspaceId`), `pagesTable`, `responsesTable`, `answersTable`, `templatesTable`. Migrations generated and committed.

### Phase 3 — Auth / JWT / CSRF (Tasks 3.1–3.9)
JWT utilities (`signAccessJwt`, `verifyAccessJwt`, `signRefreshJwt`, `verifyRefreshJwt`, `hashToken`, `generateTokenId`), CSRF hardened to `SameSite=Strict`, `createContext` with triple-fallback auth (access JWT → Neon Auth → demo cookie), `protectedProcedure` + `adminProcedure`, `auth.refreshToken` with family-based reuse detection, `auth.signOut` (revokes all refresh tokens), `auth.demoLogin`, `auth.callback` (Google OAuth), `auth.syncSession`, `auth.me`. Property tests for refresh token rotation.

### Phase 4 — tRPC Routers (core)

**forms router** (Tasks 5.1, 5.7): `create`, `list`, `getById`, `getBySlug`, `update`, `publish`, `unpublish`, `clone`, `fieldsUpsert`, `unlock`, `createFromTemplate`, `getPages`. Slug uniqueness, bcrypt password hashing, conditional rule forward-reference validation.

**responses router** (Tasks 6.1–6.4): `submit` (full pipeline: rate limit → status/expiry/limit/password → field-level validation → persist → email notification), `list` (paginated with date filter), `exportCsv`. Property tests for required fields, expiry, limits, workspace enforcement.

**analytics router** (Tasks 7.1–7.4): `getSummary`, `getFieldBreakdown`, `getResponsesOverTime`. Property tests.

**explore router** (Tasks 8.1–8.3): `listPublicForms` (global+public+published only), `listFeaturedForms`, `listTemplates`.

**admin router** (Tasks 9.1): `getStats`, `listForms`, `listUsers`.

**Rate limiting** (Task 4.1–4.3): `assertSubmitRateLimit` with Upstash Redis + in-memory fallback for `responses.submit`. Per-IP + device fingerprint composite key.

### Phase 5 — Email Notifications (Tasks 11.1–11.4)
`NotificationService` with `sendSubmissionEmails` (creator notification + optional respondent confirmation). Wired into `responses.submit`. Fire-and-forget with error logging.

### Phase 6 — Next.js Auth (partial — see gaps below)
tRPC client with CSRF header injection (`getTrpcHeaders`), `ensureCsrfToken` auto-fetch, `/auth/callback` page, `/login` page with demo login buttons. Note: the existing `apps/web/proxy.ts` is a dev-server proxy config — the Next.js 16 route-guard Proxy (`export function proxy`) still needs to be implemented there.

### Phase 7 — Theme System (Tasks 13.1–13.3)
`THEMES` map with 8 themes and CSS variable definitions, `ThemedFormWrapper` component, `ThemePicker` component.

### Phase 8 — Form Builder UI (Tasks 14.1–14.4)
3-panel layout with `react-resizable-panels`, `FieldTypePalette` (dnd-kit draggable), `FormCanvas` (DnD sortable), `FieldCard`, `FieldConfigPanel` (all 9 field types), `ConditionalRuleEditor`, `ThemePicker`, `SettingsPanel`, `useFormAutosave` (1s debounce).

### Phase 9 — Conditional Logic (Tasks 15.1–15.2)
`evaluateConditionalRules` and `getVisibleFields` in `lib/conditional-logic.ts`. All 5 operators. Tests included.

### Phase 10 — Public Form Submission (Tasks 16.1–16.5)
`/f/[slug]` page with password gate, `FormRenderer` (multi-page, conditional logic, all 9 field renderers, ARIA-compliant), `ThankYouScreen`, `FormNotFound`, `FormClosed`, password unlock flow.

### Phase 11 — Creator Dashboard (partial — see gaps below)
`/dashboard` overview, `/dashboard/forms` list (publish/unpublish/clone/archive/copy-link), `/dashboard/forms/new`, form builder, preview, responses table with CSV export, analytics with charts.

### Phase 13 — Marketing Pages (Tasks 19.1–19.4)
Landing page (`/`) with featured forms, Explore page, Templates page, Pricing page.

### Phase 16 — Seed Script (partial — see gaps below)
Demo creator + admin users, 3 templates (anime/OS/startup), 3 published forms (anime public, OS public, startup unlisted+password-protected), 25 responses per form. `sendRespondentConfirmation = true` on anime form.

### Phase 19 — OpenAPI/Scalar Docs
All implemented procedures have `.meta({ openapi: ... })`. Scalar UI at `/docs`.

---

## ❌ / ⚠️ What Remains


---

### 1. forms tRPC Router — Missing Procedures (Task 5.2–5.6, Req 2.5–2.14)

The current `forms.delete` procedure sets `status = "archived"` — it does **not** implement the true soft-delete (`deletedAt = NOW()`) specified in the design. The following procedures are entirely absent:

| Procedure | Task | Requirement |
|---|---|---|
| `forms.softDelete` | 5.3 | Req 2.5 — set `deletedAt = NOW()`, accept array of formIds, show confirm+export dialog in UI |
| `forms.recover` | 5.4 | Req 2.6 — clear `deletedAt` within 7-day window |
| `forms.listTrash` | 5.5 | Req 2.13 — list forms with `deletedAt` set (within 7 days) |
| `forms.archive` | 5.6 | Req 2.4 — set `status = archived` (separate from delete) |
| `forms.listArchived` | 5.6 | Req 2.14 — list forms with `status = archived` |

**Also:** `forms.publish` does not accept `scope`, `workspaceId`, or `requiresAuth` parameters (Task 5.2, Req 2.9). It only sets `status = published`.

**Also:** `forms.list` does not filter out soft-deleted forms (`WHERE deletedAt IS NULL`). Deleted forms currently appear in the main list.

**Also:** `forms.getBySlug` does not check `deletedAt IS NULL` — deleted forms are still accessible via slug.

**Fix needed in:** `packages/trpc/server/routes/forms/route.ts`

---

### 2. admin tRPC Router — Missing blockUser/unblockUser (Task 9.2, Req 24.8–24.9)

`admin.blockUser` and `admin.unblockUser` procedures are defined in the design but not implemented in `packages/trpc/server/routes/admin/route.ts`. The `adminUserSchema` also omits `isBlocked` from its output.

**Fix needed in:** `packages/trpc/server/routes/admin/route.ts`

---

### 3. workspaces tRPC Router — Entirely Missing (Task 10.1–10.3, Req 28)

The `workspacesRouter` does not exist. The `serverRouter` in `packages/trpc/server/index.ts` has no `workspaces` key. Required procedures:

- `workspaces.create` — create workspace, add creator as admin member
- `workspaces.list` — list workspaces where user is member or owner
- `workspaces.getById` — get workspace by ID (membership check)
- `workspaces.addMember` — upsert user by email, insert member row, send invite email
- `workspaces.removeMember` — delete member row
- `workspaces.updateMemberRole` — update role
- `workspaces.listMembers` — list members (workspace members/admins only)

A `workspaceAdminProcedure` middleware (checks `workspaceMembersTable.role = admin` for the given `workspaceId`) is also needed.

**Fix needed in:** `packages/trpc/server/routes/` (new file), `packages/trpc/server/index.ts`

---

### 4. Workspace Invite Email — Missing (Task 11.3, Req 9.4)

`NotificationService` has `sendSubmissionEmails` but no `sendWorkspaceInviteEmail` method. Required by `workspaces.addMember`.

**Fix needed in:** `packages/services/notification/index.ts` and `packages/services/notification/templates.ts`

---

### 5. apps/api — WebSocket Server Missing (Task 21.1–21.3, Req 29)

`apps/api/src/server.ts` has no WebSocket setup. Required:
- `apps/api/src/websocket.ts` — `setupWebSocketServer(server)` and `broadcastDelta(formId, delta)`
- Wire `server.on("upgrade", ...)` in `apps/api/src/index.ts`
- CSRF token validation before upgrade
- Call `broadcastDelta` inside `responses.submit` after successful DB insert

**Fix needed in:** `apps/api/src/websocket.ts` (new), `apps/api/src/index.ts`, `packages/trpc/server/routes/responses/route.ts`

---

### 6. apps/api — Upstash Rate Limiting Not Applied to All Route Groups (Task 4.2, Req 31)

`apps/api/src/server.ts` uses `express-rate-limit` (in-memory) for the `/api` and `/docs` routes. The design requires Upstash Redis `@upstash/ratelimit` applied via tRPC middleware for:
- Auth procedures: 10/min/IP
- Non-auth mutations: 60/min/IP
- Queries: 200/min/IP

Currently only `responses.submit` uses Upstash (via `assertSubmitRateLimit`). The `rateLimitMiddleware` in `trpc.ts` that applies to all mutations/queries is not present.

**Fix needed in:** `packages/trpc/server/utils/rate-limiter.ts` (new), `packages/trpc/server/trpc.ts`

---

### 7. apps/api — Purge Cron Job Missing (Task 22.6, Req 2.7)

No cron job exists for purging soft-deleted forms older than 7 days. Required:
- `apps/api/src/cron/purge-deleted-forms.ts` — `purgeExpiredForms()` function
- Schedule it (setInterval or external Cloud Scheduler trigger)

**Fix needed in:** `apps/api/src/cron/purge-deleted-forms.ts` (new), `apps/api/src/index.ts`

---

### 8. apps/web — proxy.ts Missing (Task 12.1, Req 1.7–1.8)

`apps/web/proxy.ts` does not exist. In Next.js 16, `middleware.ts` has been renamed to `proxy.ts` and the exported function is `proxy` instead of `middleware`. The Proxy defaults to the full Node.js runtime (not the Edge Runtime sandbox), so `jose` is still usable but standard Node.js modules are also available.

Required behavior:
- Redirect `/dashboard/*` → `/login` if `chaiforms-access` cookie is absent/invalid (JWT verification)
- Redirect `/admin/*` → `/dashboard` if user is not admin
- Redirect authenticated users from `/login` → `/dashboard`

```ts
// apps/web/proxy.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  // ... route guard logic
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login"],
};
```

> Note: The existing `apps/web/proxy.ts` file is a dev-server proxy config (Vite-style), not the Next.js Proxy. Check its contents before creating the route-guard file to avoid a naming collision.

**Fix needed in:** `apps/web/proxy.ts` (new file — verify no conflict with existing `proxy.ts`)

---

### 9. apps/web — Trash and Archive Dashboard Pages Missing (Task 17.5, Req 2.13–2.14, 19.10–19.11)

Neither page exists:
- `/dashboard/forms/trash` — list soft-deleted forms, show days until permanent deletion, "Recover" button
- `/dashboard/forms/archive` — list archived forms

The sidebar navigation in `DashboardShell` also has no links to these sections.

**Fix needed in:**
- `apps/web/app/dashboard/forms/trash/page.tsx` (new)
- `apps/web/app/dashboard/forms/archive/page.tsx` (new)
- `apps/web/components/dashboard/shell.tsx` — add nav links

---

### 10. apps/web — Workspaces Dashboard Pages Missing (Task 17.6, Req 19.8–19.9, 28.8)

No workspace UI exists:
- `/dashboard/workspaces` — list workspaces with user's role
- `/dashboard/workspaces/[workspaceId]` — member list, add/remove/update member role (admin only)
- `/dashboard/workspaces/[workspaceId]/forms` — workspace-scoped forms

The sidebar has no "Workspaces" nav link.

**Fix needed in:**
- `apps/web/app/dashboard/workspaces/page.tsx` (new)
- `apps/web/app/dashboard/workspaces/[workspaceId]/page.tsx` (new)
- `apps/web/components/dashboard/shell.tsx` — add nav link

---

### 11. apps/web — Admin Block/Unblock UI Missing (Task 20.3, Req 24.8–24.10)

`/admin/users/page.tsx` renders a static table with no block/unblock buttons. Required:
- Convert to a client component
- Add `isBlocked` column to the table
- Add "Block" / "Unblock" toggle button per row calling `admin.blockUser` / `admin.unblockUser`

**Fix needed in:** `apps/web/app/admin/users/page.tsx`

---

### 12. apps/web — Form Builder Settings Panel Missing scope/requiresAuth (Task 14.5, Req 27.9)

`SettingsPanel` has visibility, slug, expiry, response limit, password, thank-you message, and respondent confirmation — but is missing:
- `scope` toggle (global / workspace)
- `workspaceId` dropdown (shown when scope = workspace, lists user's workspaces)
- `requiresAuth` boolean toggle

These are required by Req 27.9 and the design's three-panel layout spec.

**Fix needed in:** `apps/web/components/form-builder/settings-panel.tsx`

---

### 13. apps/web — WebSocket Analytics Hook and Dashboard Integration Missing (Task 21.4–21.5, Req 29.4–29.5)

- `apps/web/hooks/use-analytics-ws.ts` does not exist
- The analytics dashboard page does not connect to the WebSocket channel
- No "Reconnecting…" indicator with exponential backoff

**Fix needed in:**
- `apps/web/hooks/use-analytics-ws.ts` (new)
- `apps/web/app/dashboard/forms/[formId]/analytics/page.tsx` — wire up the hook

---

### 14. Seed Script — Missing Workspace Seed (Task 22.2, 22.4, Req 12.8–12.9)

The seed script does not create:
- A `"Demo Workspace"` owned by the demo creator
- Workspace members (demo creator as admin, admin user as creator)
- A workspace-scoped published form with `requiresAuth = true` (for judges to verify workspace submission gating)

**Fix needed in:** `packages/database/seed.ts`

---

### 15. forms.list / getBySlug — Missing deletedAt Filter (Req 18.5, 2.5)

`forms.list` returns all forms including soft-deleted ones. `forms.getBySlug` returns soft-deleted forms. Both need `WHERE deletedAt IS NULL` guards.

**Fix needed in:** `packages/trpc/server/routes/forms/route.ts`

---

### 16. forms.delete — Incorrect Implementation (Req 2.5)

`forms.delete` sets `status = "archived"` instead of `deletedAt = NOW()`. This conflates archiving and soft-deletion. The procedure should be renamed/replaced with `forms.softDelete` that sets `deletedAt`.

**Fix needed in:** `packages/trpc/server/routes/forms/route.ts`

---

## Priority Order for Remaining Work

| Priority | Item | Tasks |
|---|---|---|
| **P0** | `proxy.ts` — route guards (Next.js 16 Proxy, replaces middleware.ts) | 12.1 |
| **P0** | `forms.softDelete` / `forms.recover` / `forms.listTrash` / `forms.archive` / `forms.listArchived` | 5.3–5.6 |
| **P0** | Fix `forms.delete` (currently archives instead of soft-deletes) | 5.3 |
| **P0** | Fix `forms.list` and `forms.getBySlug` to filter `deletedAt IS NULL` | — |
| **P0** | `admin.blockUser` / `admin.unblockUser` | 9.2 |
| **P0** | Trash and Archive dashboard pages + sidebar nav links | 17.5 |
| **P0** | Admin users page — block/unblock UI | 20.3 |
| **P0** | Seed script — workspace + workspace-scoped form | 22.2, 22.4 |
| **P1** | `workspacesRouter` (all 7 procedures) | 10.1–10.3 |
| **P1** | `sendWorkspaceInviteEmail` in NotificationService | 11.3 |
| **P1** | Workspace dashboard pages + sidebar nav | 17.6 |
| **P1** | Form builder settings — scope/workspaceId/requiresAuth | 14.5 |
| **P1** | WebSocket server (`apps/api/src/websocket.ts`) | 21.1–21.3 |
| **P1** | `useAnalyticsWs` hook + analytics dashboard integration | 21.4–21.5 |
| **P1** | Upstash rate limiting middleware for all tRPC route groups | 4.2 |
| **P2** | Purge cron job (`purge-deleted-forms.ts`) | 22.6 |

---

## Notes on Already-Implemented Items That Need Minor Fixes

- **`forms.publish`** accepts only `{ formId }` — needs `scope`, `workspaceId`, `requiresAuth` params (Req 2.9, Task 5.2).
- **`admin.listUsers` output schema** omits `isBlocked` — needs to be added alongside the blockUser/unblockUser procedures.
- **`DashboardShell` NAV_ITEMS** only has "Overview" and "My Forms" — needs "Archive", "Trash", and "Workspaces" entries.
- **`responses.submit`** does not call `broadcastDelta` (WebSocket) — needs to be wired once the WebSocket server exists.
- **`apps/web/proxy.ts`** — the existing file at this path is a dev-server proxy config, not the Next.js 16 route-guard Proxy. The route-guard logic needs to be added here (or the existing file needs to be checked for conflicts). In Next.js 16, `middleware.ts` → `proxy.ts` and `export function middleware` → `export function proxy`. Since the Proxy now runs on the full Node.js runtime by default, `jsonwebtoken` can be used directly instead of `jose`.
