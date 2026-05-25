import { createHash } from "node:crypto";
import {
  initTRPC,
  TRPCError,
  type TRPCProcedureBuilder,
  type TRPCRootObject,
  type TRPCRuntimeConfigOptions,
} from "@trpc/server";
import type { OpenApiMeta } from "trpc-to-openapi";
import { logger } from "@repo/logger";
import { db, eq, and } from "@repo/database";
import { apiKeys, workspacesTable, workspaceMembersTable } from "@repo/database/schema";

import type { Context } from "./context";
import { assertCsrf } from "./utils/csrf";
import { getClientIp } from "./utils/client-context";
import {
  assertAuthRateLimit,
  assertMutationRateLimit,
  assertQueryRateLimit,
} from "./utils/rate-limiter";

type TRPCContext = TRPCRootObject<
  Context,
  OpenApiMeta,
  TRPCRuntimeConfigOptions<Context, OpenApiMeta>
>;

type ProcedureBuilderWithContextOverrides<TContextOverrides> =
  TRPCContext["procedure"] extends TRPCProcedureBuilder<
    infer TContext,
    infer TMeta,
    any,
    infer TInputIn,
    infer TInputOut,
    infer TOutputIn,
    infer TOutputOut,
    infer TCaller
  >
    ? TRPCProcedureBuilder<
        TContext,
        TMeta,
        TContextOverrides,
        TInputIn,
        TInputOut,
        TOutputIn,
        TOutputOut,
        TCaller
      >
    : never;

type ProtectedContextOverrides = { user: NonNullable<Context["user"]> };
type ApiTokenContextOverrides = { apiKeyWorkspaceId: string };

type ProtectedProcedure = ProcedureBuilderWithContextOverrides<ProtectedContextOverrides>;
type ApiTokenProcedure = ProcedureBuilderWithContextOverrides<ApiTokenContextOverrides>;

export const tRPCContext: TRPCContext = initTRPC
  .meta<OpenApiMeta>()
  .context<Context>()
  .create({
    errorFormatter({ shape, error, input, path }) {
      logger.error("tRPC error", {
        procedure: path,
        code: error.code,
        message: error.message,
        inputSummary: JSON.stringify(input)?.slice(0, 200),
      });
      return shape;
    },
  });

export const router: TRPCContext["router"] = tRPCContext.router;

const csrfMiddleware = tRPCContext.middleware(({ ctx, next, type }) => {
  if (type === "mutation") {
    assertCsrf({
      headers: ctx.req.headers,
      cookies: ctx.req.cookies as Record<string, string | undefined>,
      method: ctx.req.method,
    });
  }
  return next();
});

const rateLimitMiddleware = tRPCContext.middleware(async ({ ctx, next, type, path }) => {
  if (process.env.NODE_ENV === "test" || process.env.VITEST === "true") {
    return next();
  }

  const ip = getClientIp(ctx.req) ?? "unknown";
  const isAuthRoute = path?.startsWith("auth.") ?? false;

  if (type === "mutation") {
    if (isAuthRoute) {
      await assertAuthRateLimit(ip);
    } else if (path !== "responses.submit") {
      await assertMutationRateLimit(ip);
    }
  } else if (type === "query") {
    await assertQueryRateLimit(ip);
  }

  return next();
});

const loggerMiddleware = tRPCContext.middleware(async ({ ctx, path, type, next }) => {
  const start = Date.now();
  const req = ctx.req as any;
  const correlationId = req.correlationId;
  const userId = ctx.user?.id;

  const result = await next();

  const durationMs = Date.now() - start;
  const meta = {
    procedure: path,
    type,
    durationMs,
    correlationId,
    userId,
  };

  if (result.ok) {
    logger.info(`tRPC call success`, meta);
  } else {
    logger.error(`tRPC call failed`, { ...meta, error: result.error.message });
  }

  return result;
});

export const publicProcedure: TRPCContext["procedure"] = tRPCContext.procedure
  .use(loggerMiddleware)
  .use(csrfMiddleware)
  .use(rateLimitMiddleware);

export const protectedProcedure: ProtectedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const adminProcedure: ProtectedProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});

export const workspaceAdminProcedure: ProtectedProcedure = protectedProcedure.use(
  async ({ ctx, next, getRawInput }) => {
    const input = (await getRawInput()) as { workspaceId?: string };
    const workspaceId = input?.workspaceId;

    if (!workspaceId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "workspaceId is required",
      });
    }

    const [workspace] = await db
      .select()
      .from(workspacesTable)
      .where(eq(workspacesTable.id, workspaceId))
      .limit(1);

    if (!workspace) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
    }

    if (workspace.ownerId === ctx.user.id) {
      return next({ ctx });
    }

    const [member] = await db
      .select()
      .from(workspaceMembersTable)
      .where(
        and(
          eq(workspaceMembersTable.workspaceId, workspaceId),
          eq(workspaceMembersTable.userId, ctx.user.id),
          eq(workspaceMembersTable.role, "admin"),
        ),
      )
      .limit(1);

    if (!member) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Workspace admin access required",
      });
    }

    return next({ ctx: { ...ctx, user: ctx.user } });
  },
);

const apiTokenMiddleware = tRPCContext.middleware(async ({ ctx, next }) => {
  const authHeader = ctx.req.headers.authorization;
  const apiKeyHeader = ctx.req.headers["x-api-key"];

  let token = apiKeyHeader as string | undefined;
  if (!token && authHeader?.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }

  if (!token) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Missing API Key" });
  }

  const hash = createHash("sha256").update(token).digest("hex");

  const [apiKey] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, hash)).limit(1);

  if (!apiKey) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid API Key" });
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "API Key expired" });
  }

  // Update last used at in background.
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, apiKey.id))
    .execute()
    .catch((err) => logger.error("Failed to update API key lastUsedAt", err));

  return next({ ctx: { ...ctx, apiKeyWorkspaceId: apiKey.workspaceId } });
});

export const apiTokenProcedure: ApiTokenProcedure = tRPCContext.procedure
  .use(rateLimitMiddleware)
  .use(apiTokenMiddleware);
