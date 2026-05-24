import { initTRPC, TRPCError } from "@trpc/server";
import type { OpenApiMeta } from "trpc-to-openapi";
import { logger } from "@repo/logger";
import { db, eq, and } from "@repo/database";
import {
  workspacesTable,
  workspaceMembersTable,
} from "@repo/database/schema";

import type { createContext } from "./context";
import { assertCsrf } from "./utils/csrf";
import { getClientIp } from "./utils/client-context";
import {
  assertAuthRateLimit,
  assertMutationRateLimit,
  assertQueryRateLimit,
} from "./utils/rate-limiter";

export const tRPCContext = initTRPC
  .meta<OpenApiMeta>()
  .context<typeof createContext>()
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

export const router = tRPCContext.router;

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

const rateLimitMiddleware = tRPCContext.middleware(
  async ({ ctx, next, type, path }) => {
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
  },
);

export const publicProcedure = tRPCContext.procedure
  .use(csrfMiddleware)
  .use(rateLimitMiddleware);

export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});

const workspaceAdminMiddleware = tRPCContext.middleware(
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

    if (workspace.ownerId === ctx.user!.id) {
      return next({ ctx });
    }

    const [member] = await db
      .select()
      .from(workspaceMembersTable)
      .where(
        and(
          eq(workspaceMembersTable.workspaceId, workspaceId),
          eq(workspaceMembersTable.userId, ctx.user!.id),
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

    return next({ ctx });
  },
);

export const workspaceAdminProcedure = protectedProcedure.use(
  workspaceAdminMiddleware,
);
