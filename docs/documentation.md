# ChaiForms — Technical Documentation

This document provides an in-depth look at the architecture, schema design, features, and implementation details for the ChaiForms form builder SaaS. It is intended for developers maintaining and extending the Turborepo monorepo.

For high-level project information and local setup instructions, please see the [root README](../README.md). For an audit of remaining tasks, see [REMAINING_WORK.md](../REMAINING_WORK.md).

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Packages Breakdown](#packages-breakdown)
3. [Database Schema](#database-schema)
4. [Authentication & Security](#authentication--security)
5. [tRPC API Layer](#trpc-api-layer)
6. [Frontend (Next.js) Implementation](#frontend-nextjs-implementation)
7. [Theme System](#theme-system)
8. [Form Builder & Conditional Logic](#form-builder--conditional-logic)
9. [Deployment](#deployment)
10. [Implementation of Phases](#implementation-of-phases)

---

## Architecture Overview

ChaiForms is structured as a Turborepo monorepo with the following stack:

- **Frontend (`apps/web`)**: Next.js 16 (App Router), Tailwind CSS v4, shadcn/ui, tRPC React Query client.
- **Backend (`apps/api`)**: Node.js / Express server, tRPC server routers, Scalar OpenAPI documentation.
- **Database**: PostgreSQL (managed via Neon), queried with Drizzle ORM.
- **Rate Limiting / Caching**: Upstash Redis `@upstash/ratelimit`.
- **Validation**: Zod (shared across frontend and backend).

### Data Flow Example (Form Submission)
1. **Client**: User submits form on `/f/[slug]`.
2. **Middleware**: Rate limiter checks Upstash Redis (by IP and device fingerprint).
3. **API**: `responses.submit` tRPC procedure validates payload against `@repo/schemas`.
4. **Logic**: API checks form status, password protection, expiry, and response limits.
5. **Database**: Inserts into `responses` and `answers` tables inside a transaction.
6. **Async**: Triggers `NotificationService` (Resend) for emails and broadcasts WebSocket updates for real-time analytics.

---

## Packages Breakdown

### `@repo/schemas`
The single source of truth for data validation.
- Implements a discriminated union for all 9 field types (`short_text`, `long_text`, `email`, `number`, `single_select`, `multi_select`, `checkbox`, `rating`, `date`).
- Defines `baseField` properties like `id`, `label`, `required`, and `conditionalRules`.
- Exports `formSettingsSchema`, `submitResponseSchema`, and `analyticsSummarySchema`.
- Vigorously tested using `fast-check` property-based testing.

### `@repo/database`
Manages the PostgreSQL schema using Drizzle ORM.
- Defines all tables, relationships, and custom Enums.
- Handles migrations (`drizzle-kit`) and provides a robust, idempotent `seed.ts` script for populating demo environments.

### `@repo/trpc`
Contains all server-side logic and API definitions.
- Defines routers: `forms`, `responses`, `analytics`, `explore`, `admin` (and planned `workspaces`).
- Implements context and middleware (auth checks, CSRF validation).

### `@repo/services`
Shared business logic services.
- `NotificationService`: Wraps the Resend SDK for sending submission confirmation and creator notification emails.

---

## Database Schema

The relational schema is designed for multi-tenancy and complex form structures.

- **`users`**: Platform users (creators/admins). Includes `role`, `isBlocked`, `emailVerified`.
- **`refreshTokens`**: Tracks JWT refresh token families for secure rotation and revocation.
- **`workspaces` & `workspaceMembers`**: Enable collaborative form building (team management).
- **`forms`**: Core form metadata (`title`, `slug`, `status`, `theme`, `scope`, `requiresAuth`, `deletedAt`). The actual fields structure is stored as a JSONB column (`fields`) validating against `FieldSchemaUnion[]`.
- **`pages`**: Defines multi-page forms, storing an array of `fieldIds` mapped to the JSONB fields.
- **`responses`**: Individual form submissions. Tracks metadata like `startedAt`, `submittedAt`, and respondent identity/device fingerprints.
- **`answers`**: Normalized table containing individual answers. Links a `responseId`, a `fieldId`, and a text `value`.
- **`templates`**: Global form templates available in the Explore gallery.

---

## Authentication & Security

ChaiForms uses a robust custom JWT implementation integrated with Neon Auth and Google OAuth.

### Tokens & Cookies
- **Access Token (`chaiforms-access`)**: Short-lived (15m) JWT cookie used for API authorization.
- **Refresh Token (`chaiforms-refresh`)**: Long-lived (30d) JWT cookie mapped to the `refreshTokens` table. Implements token rotation and family reuse detection to mitigate theft.
- **CSRF Token (`chaiforms-csrf`)**: `SameSite=Strict` signed cookie. The API requires an `x-csrf-token` header matching this cookie's value and HMAC signature for all mutations.

### Route Protection
- **Backend (tRPC)**: Procedures are protected via `protectedProcedure` (requires valid access token) and `adminProcedure` (requires admin role).
- **Frontend (Next.js)**: The Next.js Proxy/Middleware intercepts requests to `/dashboard/*` and `/admin/*`, validating the access token via `jose` on the Edge Runtime, redirecting unauthenticated users to `/login`.

---

## tRPC API Layer

The API is fully typed end-to-end. Key routers include:

- **Forms Router**: Standard CRUD, plus specialized procedures like `publish`, `clone`, `fieldsUpsert`, `createFromTemplate`, and `unlock` (for password-protected forms).
- **Responses Router**: `submit` (with extensive validation and rate limiting), `list` (paginated), and `exportCsv`.
- **Analytics Router**: Calculates `getSummary` (completion rate, time), `getFieldBreakdown`, and `getResponsesOverTime`.
- **Admin Router**: Platform-wide stats, user and form moderation.

### Rate Limiting
Implemented using Upstash Redis.
- Form submissions are aggressively limited (e.g., 10 / 60s) using a composite key of `IP:deviceFingerprint` to prevent spam while handling NATs gracefully.

---

## Frontend (Next.js) Implementation

The web application is built on the Next.js App Router for optimal Server Components usage.

### Key Pages
- **Marketing & Explore (`/`, `/explore`, `/templates`)**: Server-rendered pages highlighting public forms.
- **Creator Dashboard (`/dashboard/*`)**: Client-heavy interfaces utilizing tRPC React Query for immediate UI feedback.
- **Public Form Renderer (`/f/[slug]`)**: Dynamic renderer that maps JSONB field definitions to React components, handles multi-page navigation, and evaluates conditional logic on the client.

### Theme System
Forms can be heavily customized using 8 built-in themes (e.g., Default, Anime, Movie, Game, Startup, OS).
- Themes are implemented via a combination of a `ThemeProvider` context and CSS variables.
- Specific themes inject custom wrapper components and override base Shadcn UI field components to drastically alter the look and feel (e.g., retro Windows XP styling for the OS theme).

---

## Form Builder & Conditional Logic

### Drag-and-Drop Builder
Located at `/dashboard/forms/[formId]/edit`, the builder uses `react-resizable-panels` and `dnd-kit`.
- **Three-Panel Layout**:
  - Left: Palette of draggable field types.
  - Center: Sortable live-preview canvas of the form.
  - Right: Field configuration and settings drawer.
- Implements a `use-form-autosave` hook (1s debounce) for a seamless creation experience.

### Conditional Logic
Fields can define `conditionalRules` (e.g., show Field B only if Field A equals "Yes").
- Client-side evaluation engine (`evaluateConditionalRules`) processes `equals`, `not_equals`, `contains`, `is_empty`, and `is_not_empty` operators.
- The `FormRenderer` uses this engine to dynamically show/hide fields and skip empty pages during submission.

---

## Deployment

- **Web (`apps/web`)**: Optimized for Vercel. Requires standard `NEXT_PUBLIC_*` environment variables.
- **API (`apps/api`)**: Containerized Node.js application, suitable for Google Cloud Run, AWS AppRunner, or Railway.
- **Database**: Serverless PostgreSQL via Neon Database.
- **Redis**: Upstash Redis for rate limiting and potential WebSocket pub/sub.

---

## Implementation of Phases

This section describes how the 22 phases defined in the specifications (`tasks.md`, `design.md`, `requirements.md`) were implemented.

### Phase 1: Monorepo & Package Infrastructure
- Set up `@repo/schemas` using Zod for 9 distinct field types (`short_text`, `long_text`, `email`, `number`, `single_select`, `multi_select`, `checkbox`, `rating`, `date`).
- Created a discriminated union (`FieldSchemaUnion`) for robust type-safety across the monorepo.
- Wrote rigorous unit tests and property-based tests (`fast-check`) to ensure schema constraints (e.g. maxRating between 2-10).

### Phase 2: Database Schema & Migrations
- Used Drizzle ORM to design models in `packages/database`.
- Implemented `users`, `refresh_tokens`, `workspaces`, `workspace_members`, `forms`, `pages`, `responses`, `answers`, and `templates`.
- Handled advanced Postgres enums for form statuses, themes, scopes, and user roles.
- Structured form fields as JSONB mapped to the `FieldSchemaUnion`.

### Phase 3: Auth — JWT Refresh, CSRF Hardening, & Middleware
- Implemented a dual-cookie JWT architecture: a 15m `chaiforms-access` token and a 30d `chaiforms-refresh` token.
- Ensured token rotation and family-based revocation in the database to prevent reuse attacks.
- Configured CSRF protection using a double-submit pattern with an HMAC-signed `chaiforms-csrf` strict cookie.
- Created `protectedProcedure` and `adminProcedure` tRPC middlewares.

### Phase 4: tRPC Routers & Rate Limiting
- Built the `forms`, `responses`, `analytics`, `explore`, and `admin` routers.
- Enforced complex access logic: global vs workspace scope, auth requirements, soft-delete filtering, and response limits.
- Set up Upstash Redis rate limiting via tRPC middleware (10/min for auth, 60/min for mutations, 200/min for queries).
- Form submission specifically limits 10 requests per 60s per `IP:deviceFingerprint`.

### Phase 5: Email Notification Service
- Created `NotificationService` wrapping Resend.
- Added fire-and-forget submission confirmation emails for respondents and creator notifications.

### Phase 6: Next.js Auth Middleware & Route Guards
- Used Next.js `proxy.ts` (Next 16 edge runtime replacement for middleware) to parse `chaiforms-access`.
- Guarded `/dashboard/*` and `/admin/*` routes against unauthorized access.
- Setup a client-side interceptor to automatically hit `auth.refreshToken` on 401 responses.

### Phase 7: Theme System & Immersive Engine
- Created a component-based Theme Registry allowing completely custom React context wrappers.
- Handled 8 themes (e.g., Anime, Movie, Game, OS) by injecting tailored wrappers over shadcn defaults, achieving a fully distinct layout per theme rather than just CSS variable overrides.

### Phase 8: Form Builder UI
- Implemented a 3-panel drag-and-drop WYSIWYG editor using `react-resizable-panels` and `dnd-kit`.
- Created live preview that runs on the same Theme engine the respondents see.
- Implemented `use-form-autosave` debounced to 1s.

### Phase 9: Conditional Logic Engine
- Developed client-side `evaluateConditionalRules` handling `equals`, `not_equals`, `contains`, `is_empty`, and `is_not_empty` operators to dynamically show/hide fields during submission.

### Phase 10: Public Form Submission Page
- Built `/f/[slug]` to render forms. Handles conditional logic, password gates, empty page skipping, and strict input validation.
- Mapped tRPC validation errors natively into `react-hook-form`.

### Phase 11: Creator Dashboard & Workspaces
- Designed the `/dashboard` UI with stats overview, a data grid for form management, and individual response tables.
- Implemented workspace collaboration features mapping to the `workspacesTable` (pending UI completion per remaining tasks).

### Phase 12: QR Code Sharing
- Integrated QR code generation to allow physical sharing of form links from the dashboard.

### Phase 13: Marketing & Public Pages
- Built the Landing page (`/`), Explore page (`/explore`), Pricing page (`/pricing`), and Template gallery showing global, published, public forms.

### Phase 14: Admin Dashboard
- Developed an `/admin` UI limited to `admin` role users.
- Provided platform-wide statistics, user moderation (block/unblock), and visibility over all forms.

### Phase 15: WebSocket Real-Time Analytics
- Built a WebSocket server on the Express app (`apps/api/src/websocket.ts`).
- Created a `useAnalyticsWs` hook to subscribe clients and broadcast real-time submission deltas to the analytics dashboard charts without polling.

### Phase 16: Seed Script
- Developed an idempotent Drizzle seed script to generate a Demo Creator, Admin, multiple themed sample forms, and dozens of responses/answers to pre-populate charts.

### Phase 17: UX Polish — Loading, Empty, Error States
- Added skeleton loaders, empty states, and `sonner` toast notifications globally.
- Ensured graceful error handling from tRPC endpoints.

### Phase 18: Accessibility & Responsiveness
- Guaranteed ARIA compatibility across all 9 custom field renderers.
- Ensured form pages render correctly from mobile to desktop breakpoints.

### Phase 19: OpenAPI / Scalar Docs Coverage
- Attached `.meta({ openapi: ... })` definitions to all tRPC procedures.
- Exposed the Swagger/OpenAPI interface via Scalar at `/docs`.

### Phase 20: README & Repository Artifacts
- Standardized documentation, setup instructions, and demo credentials.

### Phase 21: Integration & End-to-End Verification
- Performed end-to-end smoke testing spanning auth, submission, logic gating, and real-time updates.

### Phase 22: Deployed Demo
- Prepared production configurations for Next.js (Vercel) and Express/tRPC (Google Cloud Run).
- Handled CORS cross-origin credentials to allow Vercel frontends to securely hit Cloud Run APIs with HttpOnly cookies.
