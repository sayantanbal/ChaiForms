# ChaiForms Web Application

This is the frontend application for [ChaiForms](../../README.md), a Typeform-style form builder SaaS. It is built using Next.js 16 with the App Router, providing both the creator dashboard/builder and the public-facing form submission pages.

## Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
- **Data Fetching:** [tRPC](https://trpc.io/) React Query Client (`@trpc/react-query`)
- **Drag & Drop:** [DnD Kit](https://dndkit.com/) (used in the form builder)
- **Charts:** [Recharts](https://recharts.org/) (used in the analytics dashboard)
- **Forms:** React Hook Form & Zod (via `@repo/schemas`)

## Core Features

- **Creator Dashboard (`/dashboard`)**: Analytics overview, form management, and responses data grid.
- **Form Builder (`/dashboard/forms/[formId]/edit`)**: A three-panel layout featuring a drag-and-drop canvas to visually construct multi-page forms, configure conditional logic, and set form settings.
- **Themed Form Renderer (`/f/[slug]`)**: The public-facing submission interface. Supports 8 rich themes (Anime, OS, Startup, Tech, etc.), responsive layouts, keyboard navigation, and conditional field logic.
- **Authentication**: Integrates with the backend JWT and Neon Auth system. Implements route guards via Next.js Proxy/Middleware.

## Key Directories

| Directory | Purpose |
| --- | --- |
| `app/` | Next.js App Router pages, layouts, and API routes. Includes `dashboard`, `auth`, `explore`, and the public `f/[slug]` routes. |
| `components/` | React components organized into generic `ui/` (shadcn), `form-builder/`, `dashboard/`, and `themes/`. |
| `lib/` | Utility functions, theme configurations, conditional logic engine, and TRPC client setup. |
| `hooks/` | Custom React hooks (e.g., `use-form-autosave`, analytics websockets). |
| `trpc/` | tRPC React Query client configuration and provider. |

## Available Scripts

From the `apps/web` directory (or via Turborepo from the root):

- `npm run dev` / `pnpm dev`: Starts the Next.js development server on `http://localhost:3000`.
- `npm run build` / `pnpm build`: Builds the Next.js application for production.
- `npm start` / `pnpm start`: Starts the production server.
- `npm run lint` / `pnpm lint`: Runs ESLint.
- `npm run check-types` / `pnpm check-types`: Runs TypeScript compiler checks and Next typegen.
- `npm run test` / `pnpm test`: Runs Vitest test suite.

## Environment Variables

The web app relies on the following environment variables (typically provided via the monorepo root `.env`):

- `NEXT_PUBLIC_API_URL`: The URL of the ChaiForms API (e.g., `http://localhost:3001`).
- `NEXT_PUBLIC_WEB_BASE_URL`: The base URL of this web app, used for generating shareable links and QR codes.
- `NEXT_PUBLIC_ENABLE_DEMO_LOGIN`: (Optional) Set to `true` to display demo login bypass buttons.

> **Note:** For full local development setup instructions, including database and backend API, please refer to the [monorepo root README](../../README.md).
