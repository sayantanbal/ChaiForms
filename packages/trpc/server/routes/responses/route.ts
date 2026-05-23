import { TRPCError } from "@trpc/server";
import { db, eq } from "@repo/database";
import { formsTable, responsesTable } from "@repo/database/schema";
import { submitResponseSchema } from "@repo/schemas";
import { z } from "zod";

import { publicProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import {
  buildRateLimitKey,
  parseClientContext,
} from "../../utils/client-context";
import { assertSubmitRateLimit } from "../../utils/submit-rate-limit";
import { verifyUnlockToken } from "../../utils/jwt";

const TAGS = ["Responses"];
const getPath = generatePath("/responses");

export const responsesRouter = router({
  submit: publicProcedure
    .meta({
      openapi: {
        method: "POST",
        path: getPath("/submit"),
        tags: TAGS,
        description:
          "Submit a form response. Rate limited to 10 requests per 60 seconds per IP+device. Requires CSRF header `x-csrf-token` matching `chaiforms-csrf` cookie.",
      },
    })
    .input(submitResponseSchema)
    .output(
      z.object({
        success: z.boolean(),
        responseId: z.uuid(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const client = parseClientContext(ctx.req, input.clientContext);
      const rateLimitKey = buildRateLimitKey(
        client.ipAddress,
        client.deviceFingerprint,
      );
      await assertSubmitRateLimit(rateLimitKey);

      const [form] = await db
        .select()
        .from(formsTable)
        .where(eq(formsTable.id, input.formId))
        .limit(1);

      if (!form) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }

      if (form.status !== "published") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Form is not accepting responses",
        });
      }

      if (form.expiryDate && form.expiryDate < new Date()) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Form has expired",
        });
      }

      if (form.accessPasswordHash) {
        if (
          !input.unlockToken ||
          !verifyUnlockToken(input.unlockToken, form.id)
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Valid unlock token required",
          });
        }
      }

      const [response] = await db
        .insert(responsesTable)
        .values({
          formId: input.formId,
          startedAt: new Date(input.startedAt),
          respondentEmail: null,
          unlockToken: input.unlockToken ?? null,
          ipAddress: client.ipAddress,
          userAgent: client.userAgent,
          deviceFingerprint: client.deviceFingerprint,
          deviceType: client.deviceType,
          osName: client.osName,
          osVersion: client.osVersion,
          browserName: client.browserName,
          browserVersion: client.browserVersion,
          deviceVendor: client.deviceVendor,
          deviceModel: client.deviceModel,
          latitude: client.latitude,
          longitude: client.longitude,
          geoCountry: client.geoCountry,
          geoRegion: client.geoRegion,
          geoCity: client.geoCity,
        })
        .returning({ id: responsesTable.id });

      if (!response) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to persist response",
        });
      }

      // Answer persistence and field validation — Phase 4.5
      return { success: true, responseId: response.id };
    }),
});
