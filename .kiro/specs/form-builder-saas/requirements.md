# Requirements Document

## Introduction

ChaiForms is a production-style form builder SaaS built on top of the existing Turborepo monorepo. It enables authenticated creators to build, publish, and analyze forms, while respondents — anonymous or authenticated — can fill and submit those forms via shareable links. The product supports workspace-based collaboration, role-based access control, real-time analytics via WebSocket deltas, form archiving with a 7-day trash recovery window, and defense-in-depth security (JWT refresh tokens, CSRF hardening, Upstash Redis rate limiting).

The existing `usersTable`, Google OAuth / Neon Auth client, tRPC router, and Scalar API docs infrastructure are reused and extended.

**Product name:** ChaiForms. Use `ChaiForms` in UI copy, README, OpenAPI title, and submission artifacts.

**Scope note:** Capabilities labeled "bonus" or "encouraged" in the hackathon brief are **P1** (ship if time allows) unless listed under **P0** in `tasks.md`. Real payment integration is out of scope.

---

## Guideline Traceability

| Hackathon guideline | Requirement(s) |
| --- | --- |
| Turborepo monorepo structure | 14.1 |
| Separate `apps/web` and `apps/api` | 14.1–14.2 |
| Shared packages (schemas, types, utilities, API client) | 14.5–14.8, 14.14 |
| tRPC type-safe APIs | 14.2, 11 |
| Zod validation (field schema + responses) | 14.5–14.7, 14.10, 14.14, 3, 13.4 |
| Drizzle ORM + migrations | 14.3–14.4, 14.10–14.13 |
| Scalar API documentation | 11, 14.9, 16.3 |
| Creator authentication | 1 |
| Protected creator dashboard | 1, 19 |
| Create, edit, publish, unpublish, manage forms | 2, 19 |
| Dynamic fields, validation, required/optional | 3, 27 |
| Field types: short text, long text, email, number, single/multi select | 3.1 |
| Field types: checkbox, dropdown, rating, date | 3.1, 3.11 |
| Field placeholder, description, number range, date range | 3.12–3.14 |
| Drag-and-drop form builder UI | 27 |
| Auto-save with debounce | 27.6 |
| Public vs unlisted visibility | 5, 18 |
| Public forms in explore / templates / featured | 7, 10, 26 |
| Unlisted forms via direct link only | 5, 18 |
| Unpublished forms reject responses | 6, 18 |
| Invalid/unavailable form links handled gracefully | 6, 18 |
| Public form submission without login | 6 |
| Thank-you / confirmation screen | 6.6 |
| Response analytics and management | 8, 19.5 |
| Email notifications (creator + respondent + workspace invite) | 9 |
| Landing page | 10 |
| Pricing page (no real payments) | 10.4 |
| Rate limiting on public submit | 6.7 |
| Themes (movies, anime, games, startups, tech, OS, events, etc.) | 4 |
| ≥3 themed sample forms + seeded responses + analytics | 12, 16.2 |
| Demo credentials + demo login bypass | 12, 17 |
| Deployed judge-friendly demo | 16, tasks Phase 21 |
| `cookie-parser` + CORS credentials | 14.15–14.16 |
| Procedure-level submit rate limit | 6.7, design Rate Limiting |
| README: setup, API docs link, demo credentials, deployed link | 12.7, 16.4 |
| Form preview before publishing | 15 |
| Conditional logic between questions | 20 |
| Form expiry and response limit | 5 |
| CSV export | 8.4 |
| Charts and analytics dashboards | 8.6 |
| Custom form slugs | 2.9–2.10 |
| QR code sharing | 23 |
| Password-protected forms | 22 |
| Public explore page | 7 |
| Form templates and theme gallery | 7 |
| Response filtering and pagination | 8.3 |
| Form clone and archive | 2.4–2.5 |
| Multi-page form experience | 21 |
| Admin dashboard | 24 |
| Polished UX (loading, errors, empty states) | 13, 25 |
| Final submission artifacts (repo, deploy, credentials, API docs) | 16.4 |
| Real payment integration | **Out of scope** |

---

## Glossary

- **ChaiForms**: The SaaS product being built.
- **Creator**: An authenticated user who creates and manages forms.
- **Viewer**: A workspace member with read-only access to workspace forms, responses, and analytics.
- **Respondent**: An anonymous or authenticated user who fills out and submits a published form.
- **Form**: A collection of fields, metadata, theme, and settings owned by a Creator.
- **Scope**: A form property — `global` (discoverable on Explore if public+published) or `workspace` (only visible to workspace members).
- **RequiresAuth**: A form boolean — if `true`, respondents must be logged in to submit.
- **Field**: A single input element within a Form.
- **FieldSchema**: The JSON structure describing a Field's type, label, validation rules, and options.
- **Response**: A single submission of a Form by a Respondent.
- **Answer**: The value a Respondent provides for a specific Field within a Response.
- **Slug**: A URL-safe, human-readable identifier for a Form used in shareable links.
- **Theme**: A visual style preset applied to a Form.
- **Visibility**: `public` (discoverable in Explore) or `unlisted` (accessible only via direct link).
- **Status**: A Form property: `draft`, `published`, or `archived`.
- **DeletedAt**: A soft-delete timestamp; forms with this set appear in Trash and are recoverable for 7 days.
- **Workspace**: A named group with members; forms may be published within a workspace to restrict access.
- **WorkspaceRole**: Per-workspace role: `admin` (manage members + forms), `creator` (create forms), `viewer` (read-only).
- **Dashboard**: The authenticated creator interface for managing forms and viewing analytics.
- **Explore**: The public-facing page listing all `global` + `public` + `published` forms.
- **Analytics**: Aggregated statistics for a Form including response count, completion rate, and per-field breakdowns; updated in real time via WebSocket deltas.
- **AccessToken**: A short-lived (15 min) JWT stored in `chaiforms-access` httpOnly cookie, identifying a Creator.
- **RefreshToken**: A long-lived (30 days) JWT stored in `chaiforms-refresh` httpOnly cookie; used to issue new access tokens via `auth.refreshToken`. Stored hashed in `refreshTokensTable` with token family for reuse-attack detection.
- **CSRF Token**: An HMAC-signed token in the `chaiforms-csrf` cookie (SameSite=Strict, JS-readable) sent in `x-csrf-token` on all mutations.
- **OAuthCallback**: The redirect endpoint that receives the Google OAuth authorization code and exchanges it for sessions.
- **RateLimiter**: Upstash Redis sliding-window limiter; different limits for auth (10/min), mutations (60/min), queries (200/min), and form submissions (10/min).
- **Seed**: Pre-populated database records used for demo and development purposes.
- **Template**: A pre-built Form with sample fields and theme, available in the Template Gallery.
- **ExpiryDate**: An optional timestamp after which a Form no longer accepts new Responses.
- **ResponseLimit**: An optional integer cap on the total number of Responses a Form will accept.
- **ChaiForms_Web**: The Next.js frontend application located at `apps/web`.
- **ChaiForms_Server**: The Express/tRPC backend application located at `apps/api`.
- **SharedPackage**: A workspace package under `packages/*` consumed by both ChaiForms_Web and ChaiForms_Server.
- **DeployedDemo**: The publicly accessible production or staging deployment.
- **SubmissionArtifacts**: Links and credentials documented in the README for judges.
- **Page**: A named section within a Form grouping one or more Fields.
- **ConditionalRule**: A rule on a Field that shows/hides it based on another Field's Answer value.
- **FormPassword**: A hashed secret configured on a Form; Respondents must supply it before viewing or submitting.
- **Admin**: A privileged global user role with platform-wide oversight.
- **FieldSchemaUnion**: A discriminated-union Zod schema from `packages/schemas`.
- **Notification_Service**: The module responsible for sending emails via Resend.
- **WebSocket_Delta**: A real-time event pushed by the server to analytics subscribers on every new response submission.
- **TrashSection**: The UI section showing soft-deleted forms recoverable within 7 days.
- **ArchiveSection**: The UI section showing forms with `status = archived` (not deleted).

---

## Requirements

### Requirement 1: Creator Authentication — Neon Auth + Google OAuth + JWT Refresh Tokens

**User Story:** As a Creator, I want to sign in securely and stay signed in without re-authenticating frequently, so that I can use my ChaiForms dashboard with minimal friction.

#### Acceptance Criteria

1. THE ChaiForms_Server SHALL expose supported authentication providers via `auth.getSupportedAuthenticationProviders`, including Neon Auth and Google OAuth.
2. WHEN a Creator authenticates via Google OAuth callback or Neon Auth sync, THE ChaiForms_Server SHALL issue:
   - A **short-lived access JWT** (`chaiforms-access` httpOnly cookie, 15-minute expiry).
   - A **long-lived refresh JWT** (`chaiforms-refresh` httpOnly cookie, 30-day expiry) with a unique `jti` and `family` claim.
   - Store a hashed copy of the refresh token in `refreshTokensTable` with `family`, `userId`, and `expiresAt`.
   - A fresh HMAC-signed CSRF token (`chaiforms-csrf` cookie, SameSite=Strict).
3. WHEN a Creator calls `auth.refreshToken` with a valid `chaiforms-refresh` cookie, THE ChaiForms_Server SHALL:
   - Verify the refresh JWT and look up the hashed token in `refreshTokensTable`.
   - If found: delete the old row, insert a new row with a new `jti` (same `family`), and set new `chaiforms-access` (15 min) and `chaiforms-refresh` (30 days) cookies.
   - If NOT found (reuse attack): delete ALL rows in `refreshTokensTable` with the same `family`, return `UNAUTHORIZED`.
4. WHEN a Creator sends a request to any protected tRPC procedure without a valid `chaiforms-access` cookie, THE ChaiForms_Server SHALL reject the request with `UNAUTHORIZED`.
5. WHEN a Creator sends a request to any protected tRPC procedure with a valid `chaiforms-access` cookie and `isBlocked = false`, THE ChaiForms_Server SHALL attach the Creator's user record to the tRPC context.
6. WHEN a Creator calls `auth.signOut`, THE ChaiForms_Server SHALL clear the `chaiforms-access`, `chaiforms-refresh`, and legacy session cookies, and delete all `refreshTokensTable` rows for that user.
7. THE ChaiForms_Web SHALL redirect unauthenticated users who access any `/dashboard/*` route to `/login`.
8. THE ChaiForms_Web SHALL redirect authenticated users who access `/login` to `/dashboard`.
9. THE ChaiForms_Web SHALL implement a transparent token refresh interceptor that calls `auth.refreshToken` when a 401 is received and retries the original request once with the new access token.

---

### Requirement 2: Form CRUD and Lifecycle Management

**User Story:** As a Creator, I want to create, edit, duplicate, archive, soft-delete, and recover my forms, so that I can manage my form portfolio efficiently with a safety net.

#### Acceptance Criteria

1. WHEN a Creator calls `forms.create` with a valid title, THE ChaiForms_Server SHALL create a new Form record with `status = draft`, `visibility = unlisted`, `scope = global`, `requiresAuth = false`, a unique auto-generated Slug, and associate it with the Creator's user ID.
2. WHEN a Creator calls `forms.update` with a valid form ID and updated fields, THE ChaiForms_Server SHALL update only the provided fields on the Form record and return the updated Form.
3. WHEN a Creator calls `forms.update` for a Form that does not belong to the Creator, THE ChaiForms_Server SHALL return a `FORBIDDEN` tRPC error.
4. WHEN a Creator calls `forms.archive` with a valid form ID, THE ChaiForms_Server SHALL set `status = archived` and return the updated Form (archived forms are kept long-term, not deleted).
5. WHEN a Creator or Admin calls `forms.softDelete` with one or more form IDs:
   - THE ChaiForms_Web SHALL first show a confirmation dialog.
   - THE ChaiForms_Web SHALL offer an "Export to CSV" option before proceeding.
   - On confirmation, THE ChaiForms_Server SHALL set `deletedAt = NOW()` for each form and return `{ success: true }`.
6. WHEN a Creator calls `forms.recover` with form IDs that have `deletedAt` set within the past 7 days, THE ChaiForms_Server SHALL clear `deletedAt` and return `{ success: true }`.
7. THE ChaiForms_Server SHALL automatically purge forms where `deletedAt` is older than 7 days via a daily cron job (no API-initiated purge).
8. WHEN a Creator calls `forms.clone` with a valid form ID, THE ChaiForms_Server SHALL create a new Form with the same fields, theme, and settings, a new unique Slug, `status = draft`, and return the new Form.
9. WHEN a Creator calls `forms.publish`, THE ChaiForms_Server SHALL accept optional `scope` (`global` or `workspace`), `workspaceId` (required if scope = `workspace`), and `requiresAuth` (boolean). It SHALL set `status = published` and persist scope/auth settings.
10. WHEN a Creator calls `forms.unpublish`, THE ChaiForms_Server SHALL set `status = draft`.
11. THE ChaiForms_Server SHALL enforce that each Form's Slug is unique across all non-deleted Forms in the system.
12. WHEN a Creator provides a custom Slug via `forms.update`, THE ChaiForms_Server SHALL validate it matches `^[a-z0-9-]{3,60}$` and return `BAD_REQUEST` otherwise.
13. THE ChaiForms_Web SHALL provide a **Trash** section (`/dashboard/forms/trash`) showing soft-deleted forms with a "Recover" button. The section SHALL show the days remaining until permanent deletion.
14. THE ChaiForms_Web SHALL provide an **Archive** section (`/dashboard/forms/archive`) showing forms with `status = archived`.

---

### Requirement 3: Field Schema Management

*(Unchanged from original — see existing Requirement 3 acceptance criteria.)*

---

### Requirement 4: Form Theme and Appearance

*(Unchanged from original — see existing Requirement 4 acceptance criteria.)*

---

### Requirement 5: Form Settings — Visibility, Scope, Auth, Expiry, and Response Limit

**User Story:** As a Creator, I want to control who can discover my form, whether authentication is required to submit, and set expiry and response limits.

#### Acceptance Criteria

1. WHEN a Creator sets `scope = global` and `visibility = public`, THE ChaiForms_Server SHALL make the Form appear in the Explore page results.
2. WHEN a Creator sets `scope = global` and `visibility = unlisted`, THE ChaiForms_Server SHALL exclude the Form from Explore while keeping it accessible via direct Slug URL.
3. WHEN a Creator sets `scope = workspace` and `workspaceId`, THE ChaiForms_Server SHALL restrict the Form to that workspace's members; the form SHALL NOT appear in Explore regardless of visibility setting.
4. WHEN a Creator sets `requiresAuth = true` on a global form, THE ChaiForms_Server SHALL require respondents to be logged in to submit.
5. WHEN a Creator sets `requiresAuth = true` on a workspace-scoped form, THE ChaiForms_Server SHALL require respondents to be both logged in AND a member of that workspace.
6. WHEN a Creator sets `requiresAuth = false`, THE ChaiForms_Server SHALL allow anonymous submission regardless of form scope.
7. WHEN a Creator sets an `expiryDate` and a Respondent attempts to submit after that date, THE ChaiForms_Server SHALL return `FORBIDDEN`.
8. WHEN a Creator sets a `responseLimit` and it is reached, THE ChaiForms_Server SHALL reject further submissions with `FORBIDDEN`.
9. THE ChaiForms_Web SHALL display a clear message to Respondents when a Form is expired, at its limit, requires authentication, or is workspace-restricted.

---

### Requirement 6: Public Form Submission by Respondents

**User Story:** As a Respondent, I want to fill out and submit a form using a shareable link, with or without an account depending on the form's settings.

#### Acceptance Criteria

1. WHEN a Respondent visits `/f/{slug}` and the Form exists, is `published`, within expiry/limit, and is unlocked (per Requirement 22 if password-protected), THE ChaiForms_Web SHALL render the form submission page.
2. WHEN the Form has `requiresAuth = false`, THE ChaiForms_Web SHALL render the form for any visitor regardless of authentication status.
3. WHEN the Form has `requiresAuth = true` and the Respondent is not logged in, THE ChaiForms_Web SHALL display a "Sign in to submit this form" prompt and redirect to `/login` with a return URL.
4. WHEN a Respondent submits a Response via `responses.submit` with all required fields answered and valid values, THE ChaiForms_Server SHALL persist the Response and Answers and return `{ success: true, responseId }`.
5. WHEN a Respondent submits a Response via `responses.submit` with missing or invalid fields, THE ChaiForms_Server SHALL return `BAD_REQUEST` listing each invalid field ID.
6. AFTER a Respondent successfully submits, THE ChaiForms_Web SHALL display a thank-you screen with the Form's custom thank-you message or a default.
7. THE RateLimiter SHALL restrict each IP address to a maximum of 10 `responses.submit` calls per 60-second window using Upstash Redis and return HTTP 429 with a `Retry-After` header when exceeded.

---

### Requirement 7: Explore and Template Gallery

*(Unchanged from original — global + public + published forms only.)*

---

### Requirement 8: Analytics and Response Management

**User Story:** As a Creator, I want to view response data and real-time analytics for my forms, so that I can understand respondent engagement.

#### Acceptance Criteria

1. WHEN a Creator calls `analytics.getSummary` with a valid form ID, THE ChaiForms_Server SHALL return total response count, completion rate, and average submission duration.
2. WHEN a Creator calls `analytics.getFieldBreakdown`, THE ChaiForms_Server SHALL return, for each Field, the response count and a frequency distribution of Answer values.
3. WHEN a Creator calls `responses.list` with optional filters, THE ChaiForms_Server SHALL return paginated Responses with Answers.
4. WHEN a Creator calls `responses.exportCsv` with a valid form ID, THE ChaiForms_Server SHALL return a CSV where each row is one Response, columns are: response metadata fields (id, submittedAt, respondentEmail, deviceType, osName, browserName, geoCountry, geoCity) followed by one column per form field labeled by field label. Fields with no answer are blank.
5. WHEN a Creator calls any analytics procedure for a Form that does not belong to the Creator, THE ChaiForms_Server SHALL return `FORBIDDEN`.
6. THE ChaiForms_Web SHALL render the analytics dashboard with a response-over-time line chart, completion rate metric card, and per-field breakdown charts.
7. THE ChaiForms_Web analytics dashboard SHALL connect to the WebSocket analytics channel and apply incoming delta events to the displayed data in real time (incrementing totals, updating charts) without requiring a page reload.
8. Workspace `viewer` members SHALL be able to view analytics for workspace-scoped forms they have access to (read-only).

---

### Requirement 9: Email Notifications

**User Story:** As a Creator, workspace admin, and Respondent, I want email notifications for form submissions and workspace invitations.

#### Acceptance Criteria

1. WHEN a Response is successfully persisted, THE Notification_Service SHALL send an email to the Creator containing the Form title, submission timestamp, and a link to the response detail in the Dashboard. Sent via Resend, fire-and-forget.
2. WHEN the email delivery attempt fails, THE Notification_Service SHALL log the failure and SHALL NOT block or roll back the Response submission.
3. WHERE a Creator has enabled respondent confirmation emails on a Form, THE Notification_Service SHALL send a confirmation email to the Respondent's email address (if an `email` field is present in the Response).
4. WHEN a workspace admin adds a user to a workspace via `workspaces.addMember`, THE Notification_Service SHALL send a workspace invitation email to the invitee's email address containing the workspace name, the assigned role, and a link to the workspace dashboard.
5. THE Seed_Script SHALL configure at least one seeded Form with `sendRespondentConfirmation = true`.

---

### Requirement 10: Landing and Marketing Pages

*(Unchanged from original — see existing Requirement 10 acceptance criteria.)*

---

### Requirement 11: API Documentation Coverage

*(Unchanged from original — see existing Requirement 11 acceptance criteria. All new procedures for workspaces, refresh tokens, soft-delete, recover, WebSocket also require `.meta({ openapi: ... })`.)*

---

### Requirement 12: Seed Data and Demo Account

*(Unchanged from original, with the following additions:)*

#### Additional Acceptance Criteria

8. THE Seed_Script SHALL create a demo Workspace named `"Demo Workspace"` owned by the demo Creator, with the demo Creator as `admin` and the admin user as `creator`.
9. THE Seed_Script SHALL create at least 1 workspace-scoped published Form in the demo workspace with `requiresAuth = true` so judges can verify workspace submission gating.

---

### Requirement 13: Non-Functional — Responsiveness, Error Handling, and Code Quality

*(Unchanged from original — see existing Requirement 13 acceptance criteria.)*

---

### Requirement 14: Monorepo Architecture and Stack Compliance

**User Story:** As a maintainer or judge, I want ChaiForms to follow the mandated Turborepo stack with shared types and a clean data layer.

#### Acceptance Criteria (amended)

1–16: Unchanged from original.

17. THE `packages/database` schema SHALL include `refreshTokensTable`, `workspacesTable`, and `workspaceMembersTable` with correct FK constraints, indexes, and unique constraints as defined in the design document.
18. THE `packages/database` schema SHALL add `isBlocked` (boolean, default false) and `deletedAt` (timestamp, nullable) columns to existing tables per the design document.
19. THE ChaiForms_Server SHALL use the `chaiforms-access` cookie name for the short-lived access token and `chaiforms-refresh` for the refresh token, replacing the legacy `session` cookie name.

---

### Requirement 15: Form Preview Before Publishing (P1)

*(Unchanged from original.)*

---

### Requirement 16: Demo Deployment and Submission Artifacts (P0)

*(Unchanged from original. Add: `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` must also be documented in `.env.example`.)*

---

### Requirement 17: Judge-Friendly Demo Sign-In (P0)

*(Unchanged from original.)*

---

### Requirement 18: Visibility and Scope Enforcement on Server and Explore APIs

**User Story:** As a platform operator, I want visibility, scope, and auth requirements enforced consistently on every public endpoint.

#### Acceptance Criteria

1. WHEN `explore.listPublicForms` is called, THE ChaiForms_Server SHALL return only Forms where `status = published`, `visibility = public`, AND `scope = global`. Workspace-scoped forms SHALL be excluded even if `visibility = public`.
2. WHEN `responses.submit` is called for a Form with `status = draft` or `status = archived`, THE ChaiForms_Server SHALL reject with `FORBIDDEN`.
3. WHEN `responses.submit` is called for a Form with `requiresAuth = true` and no valid access token in the request, THE ChaiForms_Server SHALL return `UNAUTHORIZED`.
4. WHEN `responses.submit` is called for a workspace-scoped Form with `requiresAuth = true` by an authenticated user who is NOT a member of the Form's workspace, THE ChaiForms_Server SHALL return `FORBIDDEN`.
5. WHEN `responses.submit` is called for a Form with `deletedAt` set, THE ChaiForms_Server SHALL return `NOT_FOUND`.
6. THE ChaiForms_Web Explore page SHALL only render cards from `explore.listPublicForms` (global + public + published only).

---

### Requirement 19: Creator Dashboard

*(Unchanged from original, with the following additions:)*

#### Additional Acceptance Criteria

8. THE ChaiForms_Web Dashboard SHALL include a **Workspaces** section (`/dashboard/workspaces`) listing workspaces the Creator belongs to, with their workspace role.
9. FROM the workspace detail page, workspace admins SHALL be able to add, remove, and change roles of members.
10. THE ChaiForms_Web Dashboard SHALL include the **Archive** section and **Trash** section accessible from the forms navigation.
11. THE ChaiForms_Web SHALL show the remaining days until permanent deletion for each form in the Trash section.

---

### Requirement 20: Conditional Logic Between Questions

*(Unchanged from original.)*

---

### Requirement 21: Multi-Page Form Experience

*(Unchanged from original.)*

---

### Requirement 22: Password-Protected Forms

*(Unchanged from original.)*

---

### Requirement 23: QR Code Sharing

*(Unchanged from original.)*

---

### Requirement 24: Admin Dashboard

**User Story:** As an Admin, I want a platform-wide dashboard to inspect users, forms, and responses, and manage blocked users.

#### Acceptance Criteria

1. THE `users` table SHALL include a `role` column with values `creator` (default) and `admin`, and an `isBlocked` boolean column (default `false`).
2. THE Seed_Script SHALL create an Admin user with email `admin@chaiforms.dev` and `role = admin`.
3. WHEN a user with `role = admin` and a valid session accesses `/admin`, THE ChaiForms_Web SHALL render the admin dashboard; non-admin users SHALL receive HTTP 403 or redirect to `/dashboard`.
4. THE ChaiForms_Server SHALL expose admin-only tRPC procedures (`admin.*`) protected by an admin role check.
5. THE `admin.getStats` procedure SHALL return platform totals: user count, form count (by status), and total response count.
6. THE `admin.listForms` procedure SHALL return a paginated list of all Forms across all Creators with owner email, status, visibility, scope, theme, response count, and created date.
7. THE `admin.listUsers` procedure SHALL return a paginated list of users with email, display name, role, `isBlocked`, form count, and created date.
8. THE `admin.blockUser` procedure SHALL set `isBlocked = true` on the specified user. Blocked users SHALL receive `FORBIDDEN` on all protected procedures.
9. THE `admin.unblockUser` procedure SHALL set `isBlocked = false` on the specified user.
10. THE ChaiForms_Web `/admin/users` page SHALL display an "Block" / "Unblock" toggle per user row.
11. THE OpenAPI metadata for admin procedures SHALL be included in Scalar docs under an `Admin` tag.

---

### Requirement 25: Polished Product UX States

*(Unchanged from original.)*

---

### Requirement 26: Featured Public Forms on Landing Page

*(Unchanged from original.)*

---

### Requirement 27: Form Builder UI — Drag-and-Drop Editor

*(Unchanged from original, with the following addition:)*

9. THE form builder settings panel SHALL expose `scope` (global / workspace), `workspaceId` (workspace selector dropdown, shown when scope = workspace), and `requiresAuth` (boolean toggle) so Creators can configure submission access without leaving the editor.

---

### Requirement 28: Workspace Management (New)

**User Story:** As a Creator, I want to create and manage workspaces so that my team can collaborate on forms with appropriate access levels.

#### Acceptance Criteria

1. WHEN a Creator calls `workspaces.create` with a valid name, THE ChaiForms_Server SHALL create a new Workspace record with the Creator as owner and as a workspace `admin`, and return the new Workspace.
2. WHEN a workspace admin calls `workspaces.addMember` with a valid email and role, THE ChaiForms_Server SHALL upsert the user by email, insert a `workspaceMembersTable` row, and fire-and-forget a workspace invitation email via Resend.
3. WHEN a workspace admin calls `workspaces.removeMember`, THE ChaiForms_Server SHALL delete the `workspaceMembersTable` row for that user.
4. WHEN a workspace admin calls `workspaces.updateMemberRole`, THE ChaiForms_Server SHALL update the role for that member.
5. WHEN a user with `workspace role = viewer` accesses workspace forms or analytics, THE ChaiForms_Server SHALL return read-only data and SHALL reject any mutation calls (`FORBIDDEN`).
6. WHEN a user with `workspace role = creator` attempts to manage workspace members, THE ChaiForms_Server SHALL return `FORBIDDEN`.
7. Workspace admins and global admins SHALL be able to remove any member from a workspace.
8. THE ChaiForms_Web workspace detail page SHALL show a member list with roles, and an "Add Member" form for workspace admins.

---

### Requirement 29: Real-Time Analytics via WebSocket (New — P1)

**User Story:** As a Creator, I want my analytics dashboard to update in real time when new responses come in, without manual page refreshes.

#### Acceptance Criteria

1. THE ChaiForms_Server SHALL upgrade WebSocket connections at `/ws?channel=analytics:{formId}&csrf={csrfToken}`.
2. THE ChaiForms_Server SHALL validate the CSRF token before completing the WebSocket upgrade; invalid tokens SHALL result in the connection being closed with code 4000.
3. WHEN `responses.submit` successfully persists a response, THE ChaiForms_Server SHALL broadcast a delta event `{ type: "response_delta", formId, delta }` to all WebSocket clients subscribed to `analytics:{formId}`.
4. THE ChaiForms_Web analytics dashboard SHALL connect to the WebSocket channel on mount and apply delta events to the displayed analytics state (incrementing total count, updating field breakdown distributions, updating time-series chart).
5. THE ChaiForms_Web SHALL gracefully handle WebSocket disconnection by displaying a "Reconnecting…" indicator and reconnecting with exponential backoff.

---

### Requirement 30: CSRF Hardening (New)

**User Story:** As a security-conscious operator, I want CSRF protection to be robust across all mutation paths including WebSocket upgrades.

#### Acceptance Criteria

1. THE ChaiForms_Server SHALL issue a fresh HMAC-signed CSRF token alongside every authentication event (sign-in, refresh, demo login).
2. THE `chaiforms-csrf` cookie SHALL use `SameSite=Strict` (upgraded from `SameSite=Lax`) and `secure: true` in production.
3. ALL tRPC mutations SHALL require a valid `x-csrf-token` header matching the cookie and passing HMAC signature verification.
4. WHEN Origin or Referer headers are present on a mutation, THE ChaiForms_Server SHALL verify they match `WEB_ORIGIN`.
5. WebSocket upgrade requests SHALL include the CSRF token as a query parameter; THE ChaiForms_Server SHALL validate it before completing the upgrade.

---

### Requirement 31: Upstash Redis Rate Limiting Across All Route Groups (New)

**User Story:** As a platform operator, I want rate limiting on all API route groups using a persistent store so that limits survive server restarts and work across multiple instances.

#### Acceptance Criteria

1. THE ChaiForms_Server SHALL use `@upstash/ratelimit` with `@upstash/redis` for all rate limiting.
2. Auth procedures (`auth.*`) SHALL be limited to 10 requests per 60 seconds per IP.
3. Non-auth tRPC mutations SHALL be limited to 60 requests per 60 seconds per IP.
4. tRPC queries SHALL be limited to 200 requests per 60 seconds per IP.
5. `responses.submit` SHALL be limited to 10 requests per 60 seconds per IP + device fingerprint composite key.
6. WHEN Upstash credentials are not configured (development), THE ChaiForms_Server SHALL fall back to in-memory bucket rate limiting.
7. ALL rate limit responses SHALL include a `Retry-After` duration in the error message.
