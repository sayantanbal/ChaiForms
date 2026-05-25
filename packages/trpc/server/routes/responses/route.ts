import { TRPCError } from "@trpc/server";
import { db, eq, and, count, desc, gte, lte, isNull } from "@repo/database";
import { buildTypedAnswerRow, fetchDisplayAnswersForResponses } from "@repo/database";
import {
  formsTable,
  responsesTable,
  answersTable,
  answersV2Table,
  usersTable,
} from "@repo/database/schema";
import { notificationService } from "@repo/services/notification";
import { submitResponseSchema, type FieldSchemaUnion } from "@repo/schemas";
import { z } from "zod";

import { publicProcedure, protectedProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import { buildRateLimitKey, parseClientContext } from "../../utils/client-context";
import { assertSubmitRateLimit } from "../../utils/submit-rate-limit";
import { verifyUnlockToken } from "../../utils/jwt";
import { broadcastDelta } from "../../utils/analytics-broadcast";

const TAGS = ["Responses"];
const getPath = generatePath("/responses");

// ---------------------------------------------------------------------------
// Field-level answer validation
// ---------------------------------------------------------------------------
function validateAnswers(
  fields: FieldSchemaUnion[],
  answers: { fieldId: string; value: string }[],
): { fieldId: string; reason: string }[] {
  const errors: { fieldId: string; reason: string }[] = [];
  const answerMap = new Map(answers.map((a) => [a.fieldId, a.value]));

  for (const field of fields) {
    const rawValue = answerMap.get(field.id);
    const isEmpty = rawValue === undefined || rawValue.trim() === "";

    if (field.required && isEmpty) {
      errors.push({ fieldId: field.id, reason: "This field is required" });
      continue;
    }

    if (isEmpty) continue;
    const value = rawValue!;

    switch (field.type) {
      case "short_text":
      case "long_text": {
        if (field.minLength !== undefined && value.length < field.minLength) {
          errors.push({
            fieldId: field.id,
            reason: `Minimum length is ${field.minLength} characters`,
          });
        }
        if (field.maxLength !== undefined && value.length > field.maxLength) {
          errors.push({
            fieldId: field.id,
            reason: `Maximum length is ${field.maxLength} characters`,
          });
        }
        if (
          field.type === "short_text" &&
          field.validationRegex &&
          !new RegExp(field.validationRegex).test(value)
        ) {
          errors.push({
            fieldId: field.id,
            reason: `Value does not match required pattern`,
          });
        }
        break;
      }
      case "email": {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.push({
            fieldId: field.id,
            reason: "Invalid email address",
          });
        }
        break;
      }
      case "number": {
        const num = Number(value);
        if (isNaN(num)) {
          errors.push({ fieldId: field.id, reason: "Must be a number" });
        } else {
          if (field.min !== undefined && num < field.min) {
            errors.push({
              fieldId: field.id,
              reason: `Minimum value is ${field.min}`,
            });
          }
          if (field.max !== undefined && num > field.max) {
            errors.push({
              fieldId: field.id,
              reason: `Maximum value is ${field.max}`,
            });
          }
        }
        break;
      }
      case "date": {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          errors.push({ fieldId: field.id, reason: "Invalid date" });
        } else {
          if (field.minDate && date < new Date(field.minDate)) {
            errors.push({
              fieldId: field.id,
              reason: `Date must be on or after ${field.minDate}`,
            });
          }
          if (field.maxDate && date > new Date(field.maxDate)) {
            errors.push({
              fieldId: field.id,
              reason: `Date must be on or before ${field.maxDate}`,
            });
          }
        }
        break;
      }
      case "single_select": {
        if (!field.options.includes(value)) {
          errors.push({
            fieldId: field.id,
            reason: `"${value}" is not a valid option`,
          });
        }
        break;
      }
      case "multi_select": {
        let selected: string[];
        try {
          selected = JSON.parse(value) as string[];
        } catch {
          errors.push({
            fieldId: field.id,
            reason: "Invalid multi-select format",
          });
          break;
        }
        for (const sel of selected) {
          if (!field.options.includes(sel)) {
            errors.push({
              fieldId: field.id,
              reason: `"${sel}" is not a valid option`,
            });
          }
        }
        break;
      }
      case "rating": {
        const rating = Number(value);
        if (isNaN(rating) || rating < 1 || rating > field.maxRating) {
          errors.push({
            fieldId: field.id,
            reason: `Rating must be between 1 and ${field.maxRating}`,
          });
        }
        break;
      }
      case "checkbox": {
        if (value !== "true" && value !== "false") {
          errors.push({
            fieldId: field.id,
            reason: "Checkbox value must be true or false",
          });
        }
        break;
      }
    }
  }

  return errors;
}

const paginatedResponsesSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      formId: z.string(),
      startedAt: z.string().datetime(),
      submittedAt: z.string().datetime(),
      respondentEmail: z.string().nullable(),
      answers: z.array(
        z.object({
          id: z.string(),
          fieldId: z.string(),
          value: z.string(),
        }),
      ),
    }),
  ),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

export const responsesRouter = router({
  // -------------------------------------------------------------------------
  // responses.submit (public)
  // -------------------------------------------------------------------------
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
        responseId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const client = parseClientContext(ctx.req, input.clientContext);
      const rateLimitKey = buildRateLimitKey(client.ipAddress, client.deviceFingerprint);
      await assertSubmitRateLimit(rateLimitKey);

      const [form] = await db
        .select()
        .from(formsTable)
        .where(and(eq(formsTable.id, input.formId), isNull(formsTable.deletedAt)))
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

      // Response limit check
      if (form.responseLimit !== null) {
        const totalResult = await db
          .select({ total: count() })
          .from(responsesTable)
          .where(eq(responsesTable.formId, input.formId));
        if (Number(totalResult[0]?.total ?? 0) >= form.responseLimit) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This form has reached its response limit",
          });
        }
      }

      if (form.accessPasswordHash) {
        if (!input.unlockToken || !verifyUnlockToken(input.unlockToken, form.id)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Valid unlock token required",
          });
        }
      }

      // Field-level validation
      const fields = (form.fields as FieldSchemaUnion[]) ?? [];
      const validationErrors = validateAnswers(fields, input.answers);
      if (validationErrors.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Validation failed: ${validationErrors.map((e) => `${e.fieldId}: ${e.reason}`).join("; ")}`,
          cause: {
            fieldErrors: Object.fromEntries(validationErrors.map((e) => [e.fieldId, e.reason])),
          },
        });
      }

      // Extract respondent email from email field answers
      const emailField = fields.find((f) => f.type === "email");
      const respondentEmail = emailField
        ? (input.answers.find((a) => a.fieldId === emailField.id)?.value ?? null)
        : null;

      // Insert response
      const [response] = await db
        .insert(responsesTable)
        .values({
          formId: input.formId,
          startedAt: new Date(input.startedAt),
          respondentEmail,
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

      // Bulk-insert answers (legacy + typed v2)
      if (input.answers.length > 0) {
        const fieldById = new Map(fields.map((f) => [f.id, f]));
        await db.insert(answersTable).values(
          input.answers.map((a) => ({
            responseId: response.id,
            fieldId: a.fieldId,
            value: a.value,
          })),
        );
        await db
          .insert(answersV2Table)
          .values(
            input.answers.map((a) => buildTypedAnswerRow(response.id, fieldById.get(a.fieldId), a)),
          );
      }

      const [creator] = await db
        .select({ email: usersTable.email })
        .from(usersTable)
        .where(eq(usersTable.id, form.creatorId))
        .limit(1);

      if (creator?.email) {
        const webBaseUrl =
          process.env.WEB_ORIGIN ?? process.env.NEXT_PUBLIC_WEB_BASE_URL ?? "http://localhost:3000";

        notificationService.sendSubmissionEmails({
          creatorEmail: creator.email,
          formTitle: form.title,
          formId: form.id,
          responseId: response.id,
          respondentEmail: respondentEmail ?? undefined,
          sendRespondentConfirmation: form.sendRespondentConfirmation,
          webBaseUrl,
        });
      }

      broadcastDelta(form.id, {
        responseId: response.id,
        submittedAt: new Date().toISOString(),
      });

      // Fire webhook asynchronously
      if (form.workspaceId) {
        import("@repo/services/webhook")
          .then(({ WebhookService }) => {
            WebhookService.trigger(form.workspaceId as string, "form.response.submitted", {
              formId: form.id,
              responseId: response.id,
            });
          })
          .catch((err) => console.error("Failed to load WebhookService", err));
      }

      return { success: true, responseId: response.id };
    }),

  // -------------------------------------------------------------------------
  // responses.list (protected)
  // -------------------------------------------------------------------------
  list: protectedProcedure
    .meta({
      openapi: { method: "GET", path: getPath(""), tags: TAGS },
    })
    .input(
      z.object({
        formId: z.string(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
      }),
    )
    .output(paginatedResponsesSchema)
    .query(async ({ input, ctx }) => {
      // Verify ownership
      const [form] = await db
        .select({ id: formsTable.id })
        .from(formsTable)
        .where(and(eq(formsTable.id, input.formId), eq(formsTable.creatorId, ctx.user.id)))
        .limit(1);

      if (!form) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const offset = (input.page - 1) * input.pageSize;

      // Build where conditions
      const conditions = [eq(responsesTable.formId, input.formId)];
      if (input.startDate) {
        conditions.push(gte(responsesTable.submittedAt, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(responsesTable.submittedAt, new Date(input.endDate)));
      }

      const whereClause = and(...conditions)!;

      const [totalResult, responses] = await Promise.all([
        db.select({ count: count() }).from(responsesTable).where(whereClause),
        db
          .select()
          .from(responsesTable)
          .where(whereClause)
          .orderBy(desc(responsesTable.submittedAt))
          .limit(input.pageSize)
          .offset(offset),
      ]);

      const responseIds = responses.map((r) => r.id);
      const answersByResponse = await fetchDisplayAnswersForResponses(responseIds);

      return {
        items: responses.map((r) => ({
          id: r.id,
          formId: r.formId,
          startedAt: r.startedAt.toISOString(),
          submittedAt: r.submittedAt.toISOString(),
          respondentEmail: r.respondentEmail,
          answers: answersByResponse.get(r.id) ?? [],
        })),
        total: Number(totalResult[0]?.count ?? 0),
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  // -------------------------------------------------------------------------
  // responses.exportCsv (protected)
  // -------------------------------------------------------------------------
  exportCsv: protectedProcedure
    .meta({
      openapi: { method: "GET", path: getPath("/export-csv"), tags: TAGS },
    })
    .input(z.object({ formId: z.string() }))
    .output(z.string().describe("CSV content"))
    .query(async ({ input, ctx }) => {
      const [form] = await db
        .select()
        .from(formsTable)
        .where(and(eq(formsTable.id, input.formId), eq(formsTable.creatorId, ctx.user.id)))
        .limit(1);

      if (!form) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const fields = (form.fields as FieldSchemaUnion[]) ?? [];

      const responses = await db
        .select()
        .from(responsesTable)
        .where(eq(responsesTable.formId, input.formId))
        .orderBy(responsesTable.submittedAt);

      const answersByResponse = await fetchDisplayAnswersForResponses(responses.map((r) => r.id));

      const escCsv = (v: string) => `"${v.replace(/"/g, '""').replace(/\n/g, " ")}"`;

      const headers = [
        "Response ID",
        "Submitted At",
        "Respondent Email",
        ...fields.map((f) => escCsv(f.label)),
      ].join(",");

      const rows = responses.map((r) => {
        const ansList = answersByResponse.get(r.id) ?? [];
        const ansMap = new Map(ansList.map((a) => [a.fieldId, a.value]));
        return [
          r.id,
          r.submittedAt.toISOString(),
          r.respondentEmail ?? "",
          ...fields.map((f) => escCsv(ansMap.get(f.id) ?? "")),
        ].join(",");
      });

      return [headers, ...rows].join("\n");
    }),
});

export type ResponsesRouter = typeof responsesRouter;
