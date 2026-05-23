import { initTRPC, TRPCError } from "@trpc/server";
import type { OpenApiMeta } from "trpc-to-openapi";
import { logger } from "@repo/logger";

import type { createContext } from "./context";
import { assertCsrf } from "./utils/csrf";

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

export const publicProcedure = tRPCContext.procedure.use(csrfMiddleware);

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
