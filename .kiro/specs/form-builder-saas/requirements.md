# Requirements Document

## Introduction

ChaiForms is a production-style form builder SaaS built on top of the existing Turborepo monorepo. It enables authenticated creators to build, publish, and analyze forms, while unauthenticated respondents can fill and submit those forms via shareable links. The product is a Typeform-style experience with themed forms, a public explore/gallery page, per-form analytics, and email notifications — all wired through the existing tRPC + Drizzle + Next.js stack.

The existing "Streamyst" branding is replaced entirely by ChaiForms. The existing `usersTable`, Google OAuth client, tRPC router, and Scalar API docs infrastructure are reused and extended.

**Product name:** The hackathon track refers to **ChaiForms**. Use `ChaiForms` in UI copy, README, OpenAPI title, and submission artifacts. Repository and package names may remain `trpc-monorepo` / `@repo/*`.

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
| Email notifications (creator + respondent) | 9 |
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
- **Respondent**: An unauthenticated (or optionally authenticated) user who fills out and submits a published form.
- **Form**: A collection of fields, metadata, theme, and settings owned by a Creator.
- **Field**: A single input element within a Form (e.g., short text, rating, date).
- **FieldSchema**: The JSON structure describing a Field's type, label, validation rules, and options.
- **Response**: A single submission of a Form by a Respondent, containing answers to each Field.
- **Answer**: The value a Respondent provides for a specific Field within a Response.
- **Slug**: A URL-safe, human-readable identifier for a Form used in shareable links.
- **Theme**: A visual style preset applied to a Form (e.g., "anime", "startup", "OS").
- **Visibility**: A Form property that is either `public` (discoverable in Explore) or `unlisted` (accessible only via direct link).
- **Status**: A Form property that is either `draft`, `published`, or `archived`.
- **Dashboard**: The authenticated creator interface for managing forms and viewing analytics.
- **Explore**: The public-facing page listing all `public` + `published` forms.
- **Analytics**: Aggregated statistics for a Form including response count, completion rate, and per-field breakdowns.
- **Session**: A JWT-based authentication token stored in an HTTP-only cookie, identifying a Creator.
- **OAuthCallback**: The redirect endpoint that receives the Google OAuth authorization code and exchanges it for a Session.
- **RateLimiter**: The server-side middleware that restricts the number of Form submission requests per IP address within a time window.
- **Seed**: Pre-populated database records used for demo and development purposes.
- **Template**: A pre-built Form with sample fields and theme, available in the Template Gallery.
- **ExpiryDate**: An optional timestamp after which a Form no longer accepts new Responses.
- **ResponseLimit**: An optional integer cap on the total number of Responses a Form will accept.
- **ChaiForms_Web**: The Next.js frontend application located at `apps/web`.
- **ChaiForms_Server**: The Express/tRPC backend application located at `apps/api`.
- **SharedPackage**: A workspace package under `packages/*` consumed by both ChaiForms_Web and ChaiForms_Server.
- **DeployedDemo**: The publicly accessible production or staging deployment used for hackathon evaluation without local setup.
- **SubmissionArtifacts**: The set of links and credentials documented in the README for judges (repository, deployed app, API docs, demo sign-in).
- **Page**: A named section within a Form that groups one or more Fields; multi-page Forms present one Page at a time to Respondents.
- **ConditionalRule**: A rule on a Field that shows, hides, or marks required based on another Field's Answer value.
- **FormPassword**: A hashed secret configured on a Form that Respondents must supply before viewing or submitting the Form.
- **Admin**: A privileged user role with cross-tenant read access to users, forms, and responses for platform oversight.
- **FeaturedSection**: A public marketing area on the landing page that highlights selected `public` + `published` Forms.
- **FieldSchemaUnion**: A discriminated-union Zod schema exported from `packages/schemas` where each variant corresponds to one Field type and carries only the properties valid for that type.
- **Notification_Service**: The server-side module responsible for sending emails to Creators and Respondents on form submission events.

---

## Requirements

### Requirement 1: Creator Authentication via Google OAuth

**User Story:** As a Creator, I want to sign in with my Google account, so that I can securely access my ChaiForms dashboard without managing a separate password.

#### Acceptance Criteria

1. THE ChaiForms_Server SHALL expose a Google OAuth authorization URL via the existing `auth.getSupportedAuthenticationProviders` tRPC procedure.
2. WHEN a Creator visits the `/auth/callback` route with a valid Google OAuth authorization code, THE ChaiForms_Server SHALL exchange the code for a Google ID token, upsert the Creator record in the `users` table, and issue a signed JWT stored in an HTTP-only `session` cookie.
3. WHEN a Creator visits the `/auth/callback` route with an invalid or expired authorization code, THE ChaiForms_Server SHALL return an error response with HTTP status 400 and a descriptive message.
4. WHEN a Creator sends a request to any protected tRPC procedure without a valid `session` cookie, THE ChaiForms_Server SHALL reject the request with a `UNAUTHORIZED` tRPC error.
5. WHEN a Creator sends a request to any protected tRPC procedure with a valid `session` cookie, THE ChaiForms_Server SHALL attach the Creator's user record to the tRPC context.
6. WHEN a Creator calls the `auth.signOut` tRPC procedure, THE ChaiForms_Server SHALL clear the `session` cookie (stateless JWT — no server-side session store).
7. THE ChaiForms_Web SHALL redirect unauthenticated users who access any `/dashboard/*` route to the `/login` page.
8. THE ChaiForms_Web SHALL redirect authenticated users who access the `/login` page to `/dashboard`.

---

### Requirement 2: Form CRUD and Lifecycle Management

**User Story:** As a Creator, I want to create, edit, duplicate, archive, and delete my forms, so that I can manage my form portfolio efficiently.

#### Acceptance Criteria

1. WHEN a Creator calls `forms.create` with a valid title, THE ChaiForms_Server SHALL create a new Form record with `status = draft`, `visibility = unlisted`, a unique auto-generated Slug, and associate it with the Creator's user ID.
2. WHEN a Creator calls `forms.update` with a valid form ID and updated fields, THE ChaiForms_Server SHALL update only the provided fields on the Form record and return the updated Form.
3. WHEN a Creator calls `forms.update` for a Form that does not belong to the Creator, THE ChaiForms_Server SHALL return a `FORBIDDEN` tRPC error.
4. WHEN a Creator calls `forms.delete` with a valid form ID, THE ChaiForms_Server SHALL soft-delete the Form by setting `status = archived` and return a success confirmation.
5. WHEN a Creator calls `forms.clone` with a valid form ID, THE ChaiForms_Server SHALL create a new Form record with the same fields, theme, and settings as the original, a new unique Slug, `status = draft`, and return the new Form.
6. WHEN a Creator calls `forms.publish` with a valid form ID, THE ChaiForms_Server SHALL set `status = published` and return the updated Form.
7. WHEN a Creator calls `forms.unpublish` with a valid form ID, THE ChaiForms_Server SHALL set `status = draft` and return the updated Form.
8. WHEN a Creator calls `forms.list`, THE ChaiForms_Server SHALL return all Forms owned by the Creator, ordered by `updatedAt` descending, with pagination support (page, pageSize).
9. THE ChaiForms_Server SHALL enforce that each Form's Slug is unique across all Forms in the system.
10. WHEN a Creator provides a custom Slug via `forms.update`, THE ChaiForms_Server SHALL validate that the Slug matches the pattern `^[a-z0-9-]{3,60}$` and return a `BAD_REQUEST` error if it does not.

---

### Requirement 3: Field Schema Management

**User Story:** As a Creator, I want to add, reorder, configure, and remove fields in my form, so that I can collect exactly the data I need from respondents.

#### Acceptance Criteria

1. THE ChaiForms_Server SHALL support the following Field types: `short_text`, `long_text`, `email`, `number`, `single_select`, `multi_select`, `checkbox`, `rating`, `date`.
2. WHEN a Creator calls `forms.fieldsUpsert` with a valid form ID and a FieldSchema array, THE ChaiForms_Server SHALL replace the Form's field list with the provided FieldSchema array and return the updated Form.
3. WHEN a Creator calls `forms.fieldsUpsert` for a Form that does not belong to the Creator, THE ChaiForms_Server SHALL return a `FORBIDDEN` tRPC error.
4. THE ChaiForms_Server SHALL validate that each FieldSchema in the array contains a non-empty `label` string, a valid `type` from the supported list, and a unique `id` within the Form.
5. THE ChaiForms_Server SHALL validate that `single_select` and `multi_select` FieldSchemas contain a non-empty `options` array with at least 2 string entries.
6. THE ChaiForms_Server SHALL validate that `rating` FieldSchemas contain a `maxRating` integer between 2 and 10 inclusive.
7. WHERE a FieldSchema has `required = true`, THE ChaiForms_Server SHALL enforce that the corresponding Answer is present and non-empty during Response submission.
8. WHERE a FieldSchema has `minLength` or `maxLength` set, THE ChaiForms_Server SHALL enforce those constraints on `short_text` and `long_text` Answer values during Response submission.
9. WHERE a FieldSchema has a `validationRegex` set, THE ChaiForms_Server SHALL validate the Answer value against the regex during Response submission and return a `BAD_REQUEST` error if it does not match.
10. THE ChaiForms_Server SHALL validate that `email` type Answer values match a standard email format (Zod `.email()`) during Response submission.
11. THE ChaiForms_Web SHALL render `single_select` Fields using a dropdown-style control (native `<select>` or equivalent accessible combobox) on the public form submission page.
12. THE FieldSchema structure SHALL include an optional `placeholder` string and optional `description` string that the ChaiForms_Web SHALL render as helper text beneath the field label on both the editor and public submission page.
13. THE ChaiForms_Server SHALL validate that `number` type FieldSchemas optionally include `min` and `max` integer constraints, and SHALL enforce those bounds on Answer values during Response submission.
14. WHEN a Creator calls `forms.fieldsUpsert` with a `date` type FieldSchema that includes optional `minDate` or `maxDate` ISO-8601 strings, THE ChaiForms_Server SHALL validate that Answer values fall within the specified range during Response submission.
15. THE ChaiForms_Server SHALL serialize `multi_select` answers as a JSON string array in `answers.value` (e.g. `["Option A","Option B"]`) and SHALL validate that every selected value is in the field's `options` list during Response submission.

---

### Requirement 4: Form Theme and Appearance

**User Story:** As a Creator, I want to choose a visual theme for my form, so that respondents experience a branded and engaging form presentation.

#### Acceptance Criteria

1. THE ChaiForms_Server SHALL support the following Theme identifiers: `default`, `anime`, `movie`, `game`, `startup`, `tech_company`, `os`, `event`.
2. WHEN a Creator calls `forms.update` with a valid `theme` value, THE ChaiForms_Server SHALL persist the theme on the Form record.
3. WHEN a Creator calls `forms.update` with an invalid `theme` value, THE ChaiForms_Server SHALL return a `BAD_REQUEST` tRPC error listing the valid theme identifiers.
4. THE ChaiForms_Web SHALL render the public form submission page using the CSS variables and visual assets corresponding to the Form's Theme.
5. THE ChaiForms_Web SHALL provide a theme preview in the form editor that updates in real time when the Creator selects a different Theme.

---

### Requirement 5: Form Settings — Visibility, Expiry, and Response Limit

**User Story:** As a Creator, I want to control who can discover my form and set expiry and response limits, so that I can manage form distribution and data collection scope.

#### Acceptance Criteria

1. WHEN a Creator calls `forms.update` with `visibility = public`, THE ChaiForms_Server SHALL make the Form appear in the Explore page results.
2. WHEN a Creator calls `forms.update` with `visibility = unlisted`, THE ChaiForms_Server SHALL exclude the Form from Explore page results while keeping it accessible via its direct Slug URL.
3. WHEN a Creator sets an `expiryDate` on a Form and a Respondent attempts to submit a Response after that date, THE ChaiForms_Server SHALL reject the submission with a `FORBIDDEN` tRPC error and a message indicating the form has expired.
4. WHEN a Creator sets a `responseLimit` on a Form and the total accepted Response count reaches that limit, THE ChaiForms_Server SHALL reject further submissions with a `FORBIDDEN` tRPC error and a message indicating the response limit has been reached.
5. THE ChaiForms_Web SHALL display a clear expiry or limit-reached message to Respondents on the public form page when the Form is no longer accepting submissions.

---

### Requirement 6: Public Form Submission by Respondents

**User Story:** As a Respondent, I want to fill out and submit a form using a shareable link without creating an account, so that I can respond quickly and easily.

#### Acceptance Criteria

1. WHEN a Respondent visits `/f/{slug}` and the Form exists, is `published`, is within its expiry and response limit, and is unlocked per Requirement 22 when password-protected, THE ChaiForms_Web SHALL render the form submission page with all Fields (using multi-page navigation per Requirement 21 when `pages` is defined).
2. WHEN a Respondent visits `/f/{slug}` and the Form does not exist or has an invalid Slug, THE ChaiForms_Web SHALL render a 404 error page with a message indicating the form was not found.
3. WHEN a Respondent visits `/f/{slug}` and the Form exists but has `status = draft` or `status = archived`, THE ChaiForms_Web SHALL render an informational page indicating the form is not currently accepting responses.
4. WHEN a Respondent submits a Response via `responses.submit` with all required fields answered and valid values, THE ChaiForms_Server SHALL persist the Response and all Answers, associate them with the Form, record the submission timestamp, and return a success confirmation.
5. WHEN a Respondent submits a Response via `responses.submit` with one or more required fields missing or invalid, THE ChaiForms_Server SHALL return a `BAD_REQUEST` tRPC error listing each invalid field ID and the reason for rejection.
6. AFTER a Respondent successfully submits a Response, THE ChaiForms_Web SHALL display a thank-you confirmation screen with the Form's custom thank-you message or a default message.
7. THE RateLimiter SHALL restrict each IP address to a maximum of 10 `responses.submit` calls per 60-second window and return HTTP 429 with a `Retry-After` header when the limit is exceeded.

---

### Requirement 7: Explore and Template Gallery

**User Story:** As a Respondent or visitor, I want to browse publicly available forms and templates, so that I can discover interesting forms or get inspiration for my own.

#### Acceptance Criteria

1. WHEN a visitor calls `explore.listPublicForms` with optional `page` and `pageSize` parameters, THE ChaiForms_Server SHALL return all Forms with `status = published` and `visibility = public`, ordered by `createdAt` descending, with pagination metadata.
2. WHEN a visitor calls `explore.listTemplates`, THE ChaiForms_Server SHALL return all Template records with their associated FieldSchemas and Theme.
3. WHEN a Creator calls `forms.createFromTemplate` with a valid template ID, THE ChaiForms_Server SHALL create a new Form pre-populated with the Template's fields, theme, and title, with `status = draft`, and return the new Form.
4. THE ChaiForms_Web SHALL render the `/explore` page with a grid of public Form cards, each showing the Form title, theme badge, response count, and a link to `/f/{slug}`.
5. THE ChaiForms_Web SHALL render the `/templates` page with a grid of Template cards, each showing the template title, theme, and a "Use Template" button that creates a new Form from the template and redirects the Creator to the editor.

---

### Requirement 8: Analytics and Response Management

**User Story:** As a Creator, I want to view response data and analytics for my forms, so that I can understand how respondents are engaging with my content.

#### Acceptance Criteria

1. WHEN a Creator calls `analytics.getSummary` with a valid form ID, THE ChaiForms_Server SHALL return the total response count, completion rate (percentage of started submissions that were fully submitted), and average submission duration in seconds for that Form.
2. WHEN a Creator calls `analytics.getFieldBreakdown` with a valid form ID, THE ChaiForms_Server SHALL return, for each Field, the response count and a frequency distribution of Answer values.
3. WHEN a Creator calls `responses.list` with a valid form ID and optional `page`, `pageSize`, and `startDate`/`endDate` filter parameters, THE ChaiForms_Server SHALL return the paginated list of Responses with their Answers and submission timestamps.
4. WHEN a Creator calls `responses.exportCsv` with a valid form ID, THE ChaiForms_Server SHALL return a CSV file where each row represents one Response and each column represents one Field, with the first row as a header.
5. WHEN a Creator calls `analytics.getSummary` for a Form that does not belong to the Creator, THE ChaiForms_Server SHALL return a `FORBIDDEN` tRPC error.
6. THE ChaiForms_Web SHALL render the analytics dashboard with a response-over-time line chart, a completion rate metric card, and per-field breakdown charts using the existing recharts library.

---

### Requirement 9: Email Notifications (Mandatory)

**User Story:** As a Creator and Respondent, I want email notifications on form submission, so that creators stay informed and respondents receive confirmation when enabled.

#### Acceptance Criteria

1. WHEN a Response is successfully persisted, THE Notification_Service SHALL send an email to the Creator's registered email address containing the Form title, submission timestamp, and a link to the response detail in the Dashboard.
2. WHEN the email delivery attempt fails, THE Notification_Service SHALL log the failure with the form ID, response ID, and error message using the existing Winston logger, and SHALL NOT block or roll back the Response submission.
3. WHERE a Creator has enabled respondent confirmation emails on a Form, THE Notification_Service SHALL send a confirmation email to the Respondent's email address (if an `email` field is present in the Response) containing the Form title and a thank-you message.
4. THE ChaiForms_Server SHALL expose a `forms.update` field `sendRespondentConfirmation` (boolean) that Creators can toggle to enable or disable respondent confirmation emails per Form.
5. THE Seed_Script SHALL configure at least one seeded Form with `sendRespondentConfirmation = true` so judges can verify the respondent email path in documentation.

---

### Requirement 10: Landing and Marketing Pages

**User Story:** As a visitor, I want to see a compelling landing page and pricing information, so that I can understand what ChaiForms offers and decide whether to sign up.

#### Acceptance Criteria

1. THE ChaiForms_Web SHALL render a `/` landing page containing a hero section with a headline, subheadline, and a "Get Started" call-to-action button that links to the Google OAuth sign-in flow.
2. THE ChaiForms_Web SHALL render a features section on the landing page listing at least 4 key ChaiForms capabilities with icons and short descriptions.
3. THE ChaiForms_Web SHALL render a social proof section on the landing page with at least 3 static testimonial cards.
4. THE ChaiForms_Web SHALL render a `/pricing` page with exactly 3 pricing tiers (Free, Pro, Enterprise), each listing its included features and a call-to-action button (no real payment processing required).
5. THE ChaiForms_Web SHALL render a navigation header on the landing and pricing pages with links to `/explore`, `/templates`, `/pricing`, and a "Sign In" button.

---

### Requirement 11: API Documentation Coverage

**User Story:** As a developer or judge, I want to explore all ChaiForms API endpoints via the Scalar docs UI, so that I can understand and test the API without reading source code.

#### Acceptance Criteria

1. THE ChaiForms_Server SHALL expose OpenAPI metadata (via `trpc-to-openapi` `.meta({ openapi: ... })`) on every tRPC procedure that is part of the public or creator-facing API surface.
2. THE ChaiForms_Server SHALL update the `generateOpenApiDocument` call in `apps/api/src/server.ts` to use the title `"ChaiForms API"` and version `"1.0.0"`.
3. THE ChaiForms_Server SHALL group OpenAPI operations using tags: `Authentication`, `Forms`, `Fields`, `Responses`, `Analytics`, `Explore`, `Templates`, `Admin`, `Sharing`. (Email delivery is internal via `NotificationService` — no public REST procedure required.)
4. WHEN a developer visits `/docs`, THE ChaiForms_Server SHALL serve the Scalar API reference UI populated with all tagged operations and their request/response schemas.

---

### Requirement 12: Seed Data and Demo Account

**User Story:** As a judge or evaluator, I want pre-seeded demo data and a working demo account, so that I can evaluate ChaiForms without manually creating content.

#### Acceptance Criteria

1. THE Seed_Script SHALL create a demo Creator account with email `demo@chaiforms.dev` and display name `ChaiForms Demo` in the `users` table.
2. THE Seed_Script SHALL create at least 3 Template records in `templatesTable`: "Which Anime Character Are You?" (`anime`), "Rate Your Favorite OS" (`os`), and "Startup Idea Validator" (`startup`).
3. THE Seed_Script SHALL create at least 3 published Forms owned by the demo Creator account, each using a distinct Theme (`anime`, `os`, `startup`), with `status = published`, realistic fields, and at least one Form with `visibility = public`.
4. THE Seed_Script SHALL create a minimum of 20 pre-seeded Responses per seeded published Form so that analytics dashboards and field breakdowns display non-empty demo data.
5. THE Seed_Script SHALL be executable via `pnpm db:seed` from the monorepo root and SHALL be idempotent (running it multiple times SHALL NOT create duplicate records).
6. THE README SHALL document local setup steps (`pnpm install`, `pnpm db:migrate`, `pnpm db:seed`, `pnpm dev`), demo sign-in instructions (Requirement 17), and all SubmissionArtifacts URLs (Requirement 16).
7. THE Seed_Script SHALL include at least one published Form demonstrating each advanced capability: ConditionalRules (Requirement 20), multi-page layout (Requirement 21), and password protection with a documented demo password (Requirement 22).

---

### Requirement 13: Non-Functional — Responsiveness, Error Handling, and Code Quality

**User Story:** As a Creator or Respondent on any device, I want the ChaiForms UI to be usable and visually correct, so that I can interact with forms regardless of screen size.

#### Acceptance Criteria

1. THE ChaiForms_Web SHALL render all pages with a responsive layout that adapts correctly to viewport widths of 375px (mobile), 768px (tablet), and 1280px (desktop) using Tailwind CSS v4 responsive utilities.
2. WHEN a tRPC procedure returns an error, THE ChaiForms_Web SHALL display a user-facing error message using the existing `sonner` toast component rather than exposing raw error stack traces.
3. WHEN a tRPC query is in a loading state, THE ChaiForms_Web SHALL display a skeleton or spinner placeholder in place of the loading content.
4. THE ChaiForms_Server SHALL return structured Zod-validated error responses for all `BAD_REQUEST` errors, including a `fieldErrors` map keyed by field name.
5. THE ChaiForms_Server SHALL use the existing Winston logger (`@repo/logger`) to log all unhandled errors at the `error` level with the procedure name, input summary, and error message.
6. THE ChaiForms_Web SHOULD target a Lighthouse accessibility score of at least 90 on the form submission page (`/f/{slug}`) by using semantic HTML, ARIA labels on all interactive elements, and sufficient color contrast ratios (best-effort for hackathon; manual audit acceptable).

---

### Requirement 14: Monorepo Architecture and Stack Compliance

**User Story:** As a maintainer or judge, I want ChaiForms to follow the mandated Turborepo stack with shared types and a clean data layer, so that the codebase is type-safe, consistent, and evaluable against hackathon rules.

#### Acceptance Criteria

1. THE monorepo SHALL retain separate runnable applications at `apps/web` (ChaiForms_Web) and `apps/api` (ChaiForms_Server), orchestrated via the existing Turborepo configuration.
2. THE ChaiForms_Server SHALL expose all ChaiForms business logic through type-safe tRPC procedures defined in `packages/trpc` and mounted by `apps/api`.
3. THE SharedPackage at `packages/database` SHALL define all ChaiForms tables (forms, responses, answers, templates, pages, conditional metadata, user roles, and related entities) using Drizzle ORM schema definitions and versioned SQL migrations under `packages/database/drizzle/`.
4. WHEN the database schema changes, THE maintainer SHALL generate and commit a new Drizzle migration and document the migrate command (`pnpm db:migrate`) in the README.
5. THE SharedPackage at `packages/trpc` (or a dedicated `packages/schemas` package if introduced) SHALL export Zod schemas for FieldSchema, form settings, and response submission payloads.
6. WHEN a Creator calls `forms.fieldsUpsert` or `forms.update` with field or settings data, THE ChaiForms_Server SHALL validate the input using the shared Zod schemas before persisting to the database.
7. WHEN a Respondent calls `responses.submit`, THE ChaiForms_Server SHALL validate the submission payload using the shared Zod schemas derived from the Form's current FieldSchema before persisting Answers.
8. THE ChaiForms_Web and ChaiForms_Server SHALL import form and field types exclusively from SharedPackages, not duplicate inline type definitions for the same structures.
9. THE ChaiForms_Server SHALL continue to serve Scalar API documentation at `/docs` using the existing Scalar integration, backed by OpenAPI metadata generated from tRPC procedures.
10. THE `packages/database` schema SHALL store FieldSchema arrays as a JSONB column on the `forms` table (not as normalized rows), enabling schema-less field evolution without migrations per form change; the Drizzle column SHALL be typed using the exported `FieldSchema` Zod type inferred via `z.infer`.
11. THE `packages/database` schema SHALL store each Answer as a row in a dedicated `answers` table with columns `responseId`, `fieldId`, and `value` (text), enabling per-field analytics queries without JSON parsing at query time.
12. THE `packages/database` schema SHALL define indexes on `forms(creatorId)`, `forms(slug)` (unique), `responses(formId)`, `responses(createdAt)`, and `answers(responseId)` to support paginated list and analytics queries without full-table scans.
13. THE `packages/database` schema SHALL use Drizzle's `pgEnum` for the `status` (`draft`, `published`, `archived`), `visibility` (`public`, `unlisted`), `role` (`creator`, `admin`), and `theme` columns so that invalid enum values are rejected at the database level.
14. THE SharedPackage at `packages/schemas` (or equivalent) SHALL export a discriminated-union Zod schema `FieldSchemaUnion` where each variant corresponds to one Field type and carries only the properties valid for that type (e.g., `options` only on `single_select`/`multi_select`, `maxRating` only on `rating`), ensuring compile-time exhaustiveness checking across both apps.
15. THE ChaiForms_Server SHALL use `cookie-parser` middleware in `apps/api` so `createContext` can read the `session` HTTP-only cookie on tRPC and OpenAPI requests.
16. WHEN ChaiForms_Web and ChaiForms_Server run on different origins in local or deployed environments, THE ChaiForms_Server SHALL configure CORS with `credentials: true` and an explicit allowed origin (not `*`); THE ChaiForms_Web tRPC client SHALL use `credentials: "include"` for authenticated requests.

---

### Requirement 15: Form Preview Before Publishing (P1)

**User Story:** As a Creator, I want to preview my form exactly as respondents will see it before I publish, so that I can verify layout, themes, and field order without submitting a test response.

#### Acceptance Criteria

1. THE ChaiForms_Web SHALL provide a "Preview" action in the form editor for any Form owned by the Creator, regardless of `status`.
2. WHEN a Creator opens form preview from the editor, THE ChaiForms_Web SHALL render the form at `/dashboard/forms/{formId}/preview` using the same field-rendering components as the public submission page (`/f/{slug}`).
3. WHILE a Creator is viewing `/dashboard/forms/{formId}/preview`, THE ChaiForms_Web SHALL display a non-dismissible banner indicating preview mode and SHALL NOT persist any submitted data as a Response.
4. WHEN a Creator attempts to submit from preview mode, THE ChaiForms_Web SHALL either disable the submit control or show an informational message that submissions are disabled in preview.
5. THE preview page SHALL reflect the Form's current Theme, Field order, labels, required indicators, and validation messages without requiring `status = published`.

---

### Requirement 16: Demo Deployment and Submission Artifacts (P0)

**User Story:** As a hackathon judge, I want a live deployed demo with seeded data and clear documentation links, so that I can evaluate ChaiForms immediately without cloning or running the project locally.

#### Acceptance Criteria

1. THE project SHALL provide a DeployedDemo consisting of a publicly reachable ChaiForms_Web URL and ChaiForms_Server URL (or a single origin with API proxying documented in the README). See `tasks.md` Phase 21 for the deployment checklist.
2. THE DeployedDemo environment SHALL run `pnpm db:migrate` and `pnpm db:seed` as part of its initial deploy (or a documented one-time release command) so that judges see at least 3 themed published Forms with Responses and populated analytics without manual data entry.
3. THE DeployedDemo SHALL expose Scalar API documentation at `{API_BASE_URL}/docs` and the README SHALL include the full API documentation URL as a SubmissionArtifact.
4. THE README SHALL include a **Submission Artifacts** section listing all of the following:
   - Public GitHub repository URL
   - DeployedDemo application URL (ChaiForms_Web)
   - DeployedDemo API base URL
   - Scalar API documentation URL
   - Demo sign-in instructions (per Requirement 17)
   - Local development setup commands
5. WHEN a judge opens the DeployedDemo application URL, THE ChaiForms_Web landing page, `/explore`, and at least one public seeded Form at `/f/{slug}` SHALL be reachable without authentication.
6. THE DeployedDemo SHALL NOT require judges to run `pnpm install`, Docker, or local database setup to review core functionality (form fill, explore, landing, pricing, API docs).
7. THE repository SHALL include a committed `.env.example` listing all required environment variables with placeholder values (no secrets).
8. THE DeployedDemo production environment SHALL set `ENABLE_DEMO_LOGIN=true` so judges can use `auth.demoLogin` per Requirement 17.5.

---

### Requirement 17: Judge-Friendly Demo Sign-In (P0)

**User Story:** As a judge, I want documented demo credentials and a reliable way to access the creator dashboard on the DeployedDemo, so that I can review form management, analytics, and response data.

#### Acceptance Criteria

1. THE README SHALL document explicit demo sign-in instructions under a **Demo Credentials** heading, including the demo Creator email (`demo@chaiforms.dev`), the Admin email (`admin@chaiforms.dev`), any password-protected form demo password(s), and authentication steps for both local and DeployedDemo environments.
2. THE README SHALL document the **primary judge path**: sign in with Google on DeployedDemo; on first sign-in, seeded Forms are owned by the Google account used (see 17.6) OR judges use the demo bypass below.
3. THE Seed_Script SHALL associate all seeded published Forms, Templates, and Responses with the demo Creator user record identified by `demo@chaiforms.dev` when that user exists in the database.
4. WHEN a judge signs in on the DeployedDemo and navigates to `/dashboard`, THE ChaiForms_Web SHALL display at least 3 Forms with non-zero response counts and accessible analytics views (seeded data visible to the signed-in account per 17.6).
5. **Demo auth bypass (P0):** WHEN `ENABLE_DEMO_LOGIN=true` is set on ChaiForms_Server (DeployedDemo and optional local), THE ChaiForms_Server SHALL expose `auth.demoLogin` (public mutation) accepting `{ email: "demo@chaiforms.dev" | "admin@chaiforms.dev" }` and, only in that mode, issue a `session` cookie for the matching seeded user without Google OAuth. THE README SHALL document this for judges. WHEN `ENABLE_DEMO_LOGIN` is not `true`, `auth.demoLogin` SHALL return `NOT_FOUND` or `FORBIDDEN`.
6. **Seed ownership on first OAuth sign-in (P0):** WHEN a user signs in via Google OAuth and their email matches `demo@chaiforms.dev` or `admin@chaiforms.dev`, THE ChaiForms_Server SHALL upsert that user and attach the existing seeded `creatorId` / admin role so seeded Forms remain visible on the dashboard.

---

### Requirement 18: Visibility Enforcement on Server and Explore APIs

**User Story:** As a platform operator, I want visibility and publish status enforced consistently on every public endpoint, so that unlisted, draft, and archived forms never leak through listings or accept unintended submissions.

#### Acceptance Criteria

1. WHEN `explore.listPublicForms` is called, THE ChaiForms_Server SHALL return only Forms where `status = published` AND `visibility = public`, excluding draft, archived, and unlisted Forms.
2. WHEN `responses.submit` is called for a Form with `status = draft` or `status = archived`, THE ChaiForms_Server SHALL reject the request with a `FORBIDDEN` tRPC error and SHALL NOT persist a Response.
3. WHEN `responses.submit` is called for a Form with `status = published` but the Slug does not exist, THE ChaiForms_Server SHALL return a `NOT_FOUND` tRPC error.
4. WHEN a visitor requests a Form by Slug through any public read procedure, THE ChaiForms_Server SHALL apply the same publish-status and expiry/limit checks used by `responses.submit` before returning field definitions.
5. THE ChaiForms_Web Explore page SHALL only render cards returned by `explore.listPublicForms` and SHALL NOT client-side include unlisted Forms.

---

### Requirement 19: Creator Dashboard

**User Story:** As a Creator, I want a central dashboard to manage my forms and jump to editing, analytics, and sharing, so that I can operate ChaiForms as a daily-use SaaS product.

#### Acceptance Criteria

1. THE ChaiForms_Web SHALL render `/dashboard` as the authenticated home showing a summary of the Creator's Forms (total count, published count, total responses across owned Forms).
2. THE ChaiForms_Web SHALL render `/dashboard/forms` as a paginated list of the Creator's Forms with columns or cards for title, status, visibility, theme, response count, and last updated timestamp.
3. FROM the forms list, THE ChaiForms_Web SHALL provide actions to edit, preview (Requirement 15), publish/unpublish, clone, archive, copy share link (`/f/{slug}`), and open analytics.
4. THE ChaiForms_Web SHALL render `/dashboard/forms/{formId}/edit` as the form builder (fields, theme, settings, visibility, expiry, response limit).
5. THE ChaiForms_Web SHALL render `/dashboard/forms/{formId}/analytics` with charts and tables backed by `analytics.getSummary`, `analytics.getFieldBreakdown`, and `responses.list`.
6. ALL `/dashboard/*` routes except those explicitly documented as preview SHALL require a valid Session per Requirement 1.
7. FROM the forms list and form editor, THE ChaiForms_Web SHALL provide share actions for the public link (`/f/{slug}`) and QR code download per Requirement 23.

---

### Requirement 20: Conditional Logic Between Questions

**User Story:** As a Creator, I want to show or hide fields based on earlier answers, so that respondents only see relevant questions.

#### Acceptance Criteria

1. THE FieldSchema structure SHALL support an optional `conditionalRules` array on any Field, where each ConditionalRule specifies: `sourceFieldId`, `operator` (`equals`, `not_equals`, `contains`, `is_empty`, `is_not_empty`), and `value` (when applicable).
2. WHEN a Creator calls `forms.fieldsUpsert` with ConditionalRules, THE ChaiForms_Server SHALL validate that every `sourceFieldId` references another Field in the same Form that appears earlier in display order, and SHALL return `BAD_REQUEST` if a rule references a non-existent or later Field.
3. WHEN a Respondent views or submits a Form, THE ChaiForms_Web SHALL evaluate ConditionalRules client-side in real time and SHALL hide Fields whose conditions are not satisfied.
4. WHEN `responses.submit` is called, THE ChaiForms_Server SHALL ignore Answers for Fields that were hidden by ConditionalRules at submission time and SHALL NOT require Answers for hidden non-required Fields.
5. WHEN `responses.submit` is called and a visible required Field has no Answer, THE ChaiForms_Server SHALL return `BAD_REQUEST` regardless of ConditionalRules on other Fields.
6. THE ChaiForms_Web form editor SHALL provide a UI to add, edit, and remove ConditionalRules per Field without raw JSON editing.
7. THE Seed_Script SHALL include at least one published seeded Form demonstrating ConditionalRules (e.g., show a follow-up question only when a select option is chosen).

---

### Requirement 21: Multi-Page Form Experience

**User Story:** As a Creator, I want to split long forms into multiple pages, so that respondents have a guided step-by-step experience similar to Typeform.

#### Acceptance Criteria

1. THE Form schema SHALL support an ordered `pages` array, where each Page has a unique `id`, `title`, and ordered list of Field IDs belonging to that Page.
2. WHEN a Creator calls `forms.fieldsUpsert` or `forms.update`, THE ChaiForms_Server SHALL persist the `pages` array and SHALL validate that every Field ID appears on exactly one Page.
3. WHEN a Respondent views a multi-page Form at `/f/{slug}`, THE ChaiForms_Web SHALL display one Page at a time with "Next" and "Back" navigation controls.
4. WHEN a Respondent clicks "Next", THE ChaiForms_Web SHALL validate all visible required Fields on the current Page before advancing.
5. WHEN a Respondent is on the final Page and submits, THE ChaiForms_Web SHALL call `responses.submit` once with Answers from all Pages.
6. THE ChaiForms_Web form editor SHALL allow Creators to create, rename, reorder, and delete Pages and assign Fields to Pages via drag-and-drop or equivalent ordering controls.
7. THE Seed_Script SHALL include at least one published seeded Form with two or more Pages.

---

### Requirement 22: Password-Protected Forms

**User Story:** As a Creator, I want to protect a form with a password, so that only people I share the password with can view and submit it.

#### Acceptance Criteria

1. THE ChaiForms_Server SHALL support an optional `accessPassword` on a Form, stored only as a salted hash (never plaintext) in the database.
2. WHEN a Creator sets or updates `accessPassword` via `forms.update`, THE ChaiForms_Server SHALL hash the value and persist the hash; WHEN a Creator clears `accessPassword`, THE ChaiForms_Server SHALL remove password protection from the Form.
3. WHEN a Respondent visits `/f/{slug}` for a password-protected published Form without a valid unlock token, THE ChaiForms_Web SHALL render a password prompt and SHALL NOT display Fields or accept submission.
4. THE ChaiForms_Server SHALL expose `forms.unlock` (public) accepting `slug` and `password`, returning a short-lived signed `unlockToken` JWT in the response body when the password matches. THE ChaiForms_Web SHALL store this token in `sessionStorage` and send it in the `responses.submit` payload (not the `session` cookie).
5. WHEN a Respondent calls `responses.submit` for a password-protected Form without a valid `unlockToken` in the payload, THE ChaiForms_Server SHALL return `FORBIDDEN`.
6. Password protection SHALL apply to both `public` and `unlisted` published Forms and SHALL NOT bypass visibility rules in Requirement 18 (unlisted Forms remain absent from Explore).
7. THE Seed_Script SHALL include at least one published seeded Form with password protection documented in the README (demo password listed under Demo Credentials).

---

### Requirement 23: QR Code Sharing

**User Story:** As a Creator, I want a QR code for my form link, so that I can share it offline or in print materials.

#### Acceptance Criteria

1. THE ChaiForms_Web SHALL generate a QR code encoding the absolute URL `{WEB_BASE_URL}/f/{slug}` for any published Form from the dashboard forms list and form editor share panel.
2. THE QR code SHALL be downloadable as a PNG file with filename `{slug}-qr.png`.
3. THE QR code image SHALL be at least 256×256 pixels and scannable by standard mobile camera apps when printed at reasonable size.
4. THE ChaiForms_Web SHALL display the QR code in a modal or drawer without requiring a page navigation away from the editor.
5. THE README SHALL mention QR sharing as a supported distribution method.

---

### Requirement 24: Admin Dashboard

**User Story:** As an Admin, I want a platform-wide dashboard to inspect users, forms, and responses, so that I can oversee system health and demo content.

#### Acceptance Criteria

1. THE `users` table SHALL include an `role` column with values `creator` (default) and `admin`.
2. THE Seed_Script SHALL create an Admin user with email `admin@chaiforms.dev` and `role = admin`, with credentials documented in the README Demo Credentials section.
3. WHEN a user with `role = admin` and a valid Session accesses `/admin`, THE ChaiForms_Web SHALL render the admin dashboard; non-admin users SHALL receive HTTP 403 or redirect to `/dashboard`.
4. THE ChaiForms_Server SHALL expose admin-only tRPC procedures (namespace `admin.*`) protected by an admin role check that return `FORBIDDEN` for non-admin users.
5. THE `admin.getStats` procedure SHALL return platform totals: user count, form count (by status), and total response count.
6. THE `admin.listForms` procedure SHALL return a paginated list of all Forms across all Creators with owner email, status, visibility, theme, response count, and created date.
7. THE `admin.listUsers` procedure SHALL return a paginated list of users with email, display name, role, form count, and created date.
8. THE ChaiForms_Web `/admin` page SHALL render summary stat cards and tables backed by `admin.getStats`, `admin.listForms`, and `admin.listUsers`.
9. THE OpenAPI metadata for admin procedures SHALL be included in Scalar docs under an `Admin` tag.

---

### Requirement 25: Polished Product UX States

**User Story:** As any user of ChaiForms, I want consistent loading, empty, success, and error states across the product, so that the application feels production-ready and judge-friendly.

#### Acceptance Criteria

1. THE ChaiForms_Web SHALL render dedicated empty states (illustration or message + primary action) on `/dashboard/forms` when the Creator has no forms, on analytics when a form has zero responses, and on `/explore` when no public forms exist.
2. THE ChaiForms_Web SHALL render inline field-level validation errors on the public form and multi-page flows before calling `responses.submit`.
3. AFTER successful form publish, unpublish, clone, archive, template use, or CSV export, THE ChaiForms_Web SHALL show a success toast via `sonner`.
4. THE ChaiForms_Web SHALL disable primary action buttons and show a loading indicator while the corresponding tRPC mutation is in flight.
5. THE ChaiForms_Web SHALL use a consistent layout shell (header, navigation, content area) across landing, explore, templates, pricing, dashboard, and admin routes.
6. THE public form submission flow SHALL include visible progress indication for multi-page Forms (e.g., "Page 2 of 4" or progress bar).

---

### Requirement 26: Featured Public Forms on Landing Page

**User Story:** As a visitor, I want to see featured public forms on the landing page, so that I can immediately try the product without navigating to Explore.

#### Acceptance Criteria

1. THE ChaiForms_Server SHALL expose `explore.listFeaturedForms` returning up to 6 Forms with `status = published`, `visibility = public`, ordered by response count descending.
2. THE ChaiForms_Web landing page (`/`) SHALL render a **Featured Forms** section displaying cards from `explore.listFeaturedForms` with title, theme badge, and link to `/f/{slug}`.
3. THE Seed_Script SHALL ensure at least 3 seeded public published Forms are eligible for the featured section (sufficient response counts for meaningful ordering).
4. Unlisted Forms SHALL NEVER appear in the featured section.

---

### Requirement 27: Form Builder UI — Drag-and-Drop Editor

**User Story:** As a Creator, I want a visual drag-and-drop form editor, so that I can build and rearrange my form without writing JSON or code.

#### Acceptance Criteria

1. THE ChaiForms_Web form editor at `/dashboard/forms/{formId}/edit` SHALL render a left panel listing available Field types and a center canvas showing the current ordered list of Fields, with a right panel showing configuration options for the selected Field.
2. THE ChaiForms_Web SHALL allow Creators to add a new Field by clicking or dragging a Field type from the left panel onto the canvas; the new Field SHALL be appended at the bottom of the current page or at the drop position.
3. THE ChaiForms_Web SHALL allow Creators to reorder Fields on the canvas via drag-and-drop; the new order SHALL be persisted by calling `forms.fieldsUpsert` with the updated FieldSchema array on drop.
4. THE ChaiForms_Web SHALL allow Creators to delete a Field from the canvas via a delete action on the Field card; deletion SHALL call `forms.fieldsUpsert` with the Field removed from the array.
5. WHEN a Creator selects a Field on the canvas, THE ChaiForms_Web SHALL display an inline configuration panel allowing edits to `label`, `required`, `placeholder`, `description`, and all type-specific properties (`options`, `maxRating`, `minLength`, `maxLength`, `validationRegex`, `min`, `max`, `minDate`, `maxDate`).
6. THE ChaiForms_Web form editor SHALL auto-save field changes to the server via `forms.fieldsUpsert` no more than 1 second after the Creator stops typing or reordering, using a debounced mutation, and SHALL display a "Saving…" / "Saved" indicator in the editor header.
7. THE ChaiForms_Web form editor SHALL display a real-time field count and an estimated completion time (based on field count × 30 seconds) in the editor header so Creators can gauge respondent effort.
8. WHEN a Creator attempts to publish a Form that has zero Fields, THE ChaiForms_Web SHALL block the publish action and display an inline error message indicating at least one Field is required before publishing.
