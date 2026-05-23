# ChaiForms

ChaiForms is a Typeform-style form builder SaaS built on a Turborepo monorepo. Creators authenticate with Google OAuth, build themed forms with drag-and-drop, publish shareable links, and view analytics. Respondents submit forms without an account.

## Monorepo structure

| Path | Purpose |
| --- | --- |
| `apps/web` | Next.js 16 frontend (ChaiForms_Web) |
| `apps/api` | Express + tRPC API server (ChaiForms_Server) |
| `packages/schemas` | Shared Zod schemas (`FieldSchemaUnion`, form settings, responses) |
| `packages/trpc` | tRPC routers and server/client exports |
| `packages/database` | Drizzle ORM schema and migrations |
| `packages/services` | Google OAuth, user services |
| `packages/logger` | Winston logging |

## Local development

```sh
pnpm install
cp .env.example .env   # DATABASE_URL can be Neon or local Postgres (see docs/documentation.md)
pnpm db:migrate        # applies migrations to DATABASE_URL
pnpm db:seed           # available after Phase 15
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:3001 (default)
- API docs (Scalar): http://localhost:3001/docs

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start web + API in development |
| `pnpm build` | Build all apps and packages |
| `pnpm test` | Run Vitest tests across packages |
| `pnpm db:migrate` | Apply Drizzle migrations |
| `pnpm db:generate` | Generate migration SQL after schema changes |
| `pnpm check-types` | TypeScript check |

## Implementation status

See [docs/documentation.md](./docs/documentation.md) for detailed architecture, schemas, and phase-by-phase progress.

| Phase | Status | Description |
| --- | --- | --- |
| 1 — Schemas | ✅ Complete | `@repo/schemas` package with field union + tests |
| 2 — Database | ✅ Complete | Forms, responses, answers, templates + migration `0001` |
| 3 — Auth & security | 🟡 Partial | Neon Auth, CSRF, Upstash rate limit, device/geo on responses |
| 4+ | 🔲 Pending | Routers, UI, seed, deploy |

## Demo credentials

Documented in full after Phase 3 and Phase 15 (seed script):

- Creator: `demo@chaiforms.dev`
- Admin: `admin@chaiforms.dev`
- Password-protected demo form: `demo1234`

## Deployment (planned)

| Component | Platform |
| --- | --- |
| ChaiForms_Web (`apps/web`) | [Vercel](https://vercel.com) |
| ChaiForms_Server (`apps/api`) | [Google Cloud Run](https://cloud.google.com/run) |
| PostgreSQL | Neon (or managed Postgres on GCP) |

Cross-origin auth requires `WEB_ORIGIN` on the API (Vercel URL) and `credentials: "include"` on the web tRPC client.

## Submission artifacts

Fill in after deployment (Phase 21):

- GitHub repository: _(TBD)_
- Deployed web app (Vercel): _(TBD)_
- API base URL (Cloud Run): _(TBD)_
- Scalar API docs: `{API_BASE_URL}/docs`

## Specs

Product requirements and implementation tasks live in `.kiro/specs/form-builder-saas/`.
