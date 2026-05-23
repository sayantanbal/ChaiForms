# ChaiForms ☕

ChaiForms is a Typeform-style form builder SaaS built on a Turborepo monorepo. Creators authenticate with Neon Auth (Better Auth), build themed forms with drag-and-drop, publish shareable links, and view real-time analytics. Respondents submit forms without an account.

## Features
- **🎨 8 Stunning Themes:** Anime, startup, tech, OS, game, movie, event — each form tells a story.
- **⚡ Drag & Drop Builder:** 9 field types, conditional logic, multi-page forms.
- **📊 Real-time Analytics:** Track responses, completion rates, and field breakdowns with beautiful charts.
- **🔒 Password Protection & Visibility:** Public, unlisted, and password-protected forms.
- **🌐 Public Explore Gallery:** Discover public forms and start from community templates.

## Monorepo structure

| Path | Purpose |
| --- | --- |
| `apps/web` | Next.js 15 frontend with Tailwind CSS v4 & tRPC Client |
| `apps/api` | Express + tRPC API server with SWC compilation |
| `packages/schemas` | Shared Zod schemas (`FieldSchemaUnion`, form settings, responses, analytics) |
| `packages/trpc` | tRPC routers (forms, analytics, explore, admin, responses) |
| `packages/database` | Drizzle ORM schema, migrations, and seed script |

## Local development

```sh
pnpm install
# Create .env based on .env.example (Add your PostgreSQL URL and Neon Auth keys)
cp .env.example .env

pnpm db:migrate        # applies migrations
pnpm db:seed           # creates demo users, 3 templates, 3 published forms, and 75+ responses
pnpm dev               # starts both apps/api and apps/web
```

- Web App: http://localhost:3000
- API Server: http://localhost:3001

## Demo credentials

After running `pnpm db:seed`, you can log in using the `chaiforms-demo-session` bypass (if configured) or standard email flow:

- **Creator Account:** `demo@chaiforms.dev`
- **Admin Account:** `admin@chaiforms.dev`
- **Password-protected demo form slug:** `startup-idea-validator`
- **Demo form password:** `demo1234`

## Implementation status

| Phase | Status | Description |
| --- | --- | --- |
| 1 — Schemas | ✅ Complete | `@repo/schemas` package with field union + tests |
| 2 — Database | ✅ Complete | Forms, responses, answers, templates + migrations |
| 3 — Auth & security | ✅ Complete | Neon Auth integration, Upstash rate limit |
| 4 — Backend Routers | ✅ Complete | tRPC routers for forms, analytics, explore, admin, and responses |
| 5 — Web Pages | ✅ Complete | Next.js pages: builder, dashboard, analytics, public `/f/[slug]`, templates |
| 6 — Deployment | 🔲 Pending | Vercel (web) and Cloud Run (api) deployment |

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start web + API in development |
| `pnpm build` | Build all apps and packages |
| `pnpm test` | Run Vitest tests across packages |
| `pnpm db:migrate` | Apply Drizzle migrations |
| `pnpm db:seed` | Seed database with demo data |
| `pnpm check-types` | TypeScript check across monorepo |

## Specs

Product requirements and implementation tasks live in `.kiro/specs/form-builder-saas/`.
