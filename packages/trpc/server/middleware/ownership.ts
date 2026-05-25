import { TRPCError } from "@trpc/server";
import { formsRepository } from "@repo/database/repositories";
import { tRPCContext } from "../trpc";

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
        form, // Pass form to procedure
      },
    });
  },
);

import { protectedProcedure } from "../trpc";
export const ownedFormProcedure = protectedProcedure.use(formOwnershipMiddleware);
