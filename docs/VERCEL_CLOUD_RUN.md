# Vercel (Web) + Google Cloud Run (API)

## Architecture

| Component  | Platform  | Root directory                                                  |
| ---------- | --------- | --------------------------------------------------------------- |
| `apps/web` | Vercel    | Set **Root Directory** to `apps/web` in Vercel project settings |
| `apps/api` | Cloud Run | Docker image from `apps/api/Dockerfile`                         |

## Vercel project settings

1. Import the GitHub repo in Vercel.
2. **Root Directory:** `apps/web`
3. **Framework:** Next.js (auto-detected)
4. **Environment variables** (Production & Preview):

| Variable                        | Example                      |
| ------------------------------- | ---------------------------- |
| `NEXT_PUBLIC_API_URL`           | `https://api.yourdomain.com` |
| `NEXT_PUBLIC_WEB_BASE_URL`      | `https://yourdomain.com`     |
| `NEXT_PUBLIC_ENABLE_DEMO_LOGIN` | `false`                      |
| `NEON_AUTH_BASE_URL`            | From Neon console            |

`apps/web/vercel.json` runs install/build from the monorepo root via pnpm.

## Google Cloud Run setup

1. Create a GCP project and enable **Cloud Run**, **Artifact Registry**, **Cloud Build**.
2. Create Artifact Registry repo: `chaiforms` (Docker format).
3. Create a service account with roles:
   - `roles/run.admin`
   - `roles/artifactregistry.writer`
   - `roles/iam.serviceAccountUser`
4. Download JSON key for GitHub Actions (`GCP_SA_KEY`).

### Cloud Run service env vars

Set in the Cloud Run console (or `--set-secrets`):

| Variable                   | Notes                                                  |
| -------------------------- | ------------------------------------------------------ |
| `DATABASE_URL`             | Neon PostgreSQL URL                                    |
| `JWT_SECRET`               | Min 32 chars                                           |
| `CSRF_SECRET`              | Min 32 chars                                           |
| `WEB_ORIGIN`               | `https://yourdomain.com` (comma-separated if multiple) |
| `BASE_URL`                 | Public API URL, e.g. `https://api.yourdomain.com`      |
| `NODE_ENV`                 | `production`                                           |
| `UPSTASH_REDIS_REST_URL`   | Optional, for distributed rate limits                  |
| `UPSTASH_REDIS_REST_TOKEN` | Optional                                               |

Cloud Run sets `PORT=8080` automatically; the API listens on `0.0.0.0`.

### Health check

Configure Cloud Run **Startup probe** and **Liveness probe**:

- Path: `/health`
- Port: `8080`
- Expect HTTP `200` when the database is reachable.

## GitHub Actions secrets

### CI (no secrets required)

`.github/workflows/ci.yml` runs lint, typecheck, tests, build, and Docker build on every PR.

### Deploy (`.github/workflows/deploy.yml`)

| Secret                      | Description                                     |
| --------------------------- | ----------------------------------------------- |
| `GCP_SA_KEY`                | Service account JSON for deploy                 |
| `GCP_PROJECT_ID`            | GCP project ID                                  |
| `GCP_REGION`                | e.g. `us-central1`                              |
| `CLOUD_RUN_SERVICE_PROD`    | Cloud Run service name (main)                   |
| `CLOUD_RUN_SERVICE_STAGING` | Cloud Run service name (develop)                |
| `VERCEL_TOKEN`              | Vercel token                                    |
| `VERCEL_ORG_ID`             | From `.vercel/project.json` or Vercel dashboard |
| `VERCEL_PROJECT_ID`         | From `.vercel/project.json`                     |

**Alternative:** Connect Vercel to GitHub for automatic web deploys and use the deploy workflow for API only.

## Local Docker stack

```sh
docker compose up --build
```

- API: http://localhost:8000
- Postgres: localhost:5432

Run migrations against compose Postgres:

```sh
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/chaiforms pnpm db:migrate
```

## CORS

Set `WEB_ORIGIN` on the API to your Vercel URL(s), e.g.:

```
https://yourdomain.com,https://your-project.vercel.app
```
