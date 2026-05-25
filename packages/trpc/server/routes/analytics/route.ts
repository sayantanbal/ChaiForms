import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db, eq, and, sql, count } from "@repo/database";
import { formsTable, responsesTable, answersTable, answersV2Table } from "@repo/database/schema";
import { analyticsSummarySchema, fieldBreakdownItemSchema } from "@repo/schemas";
import type { FieldSchemaUnion } from "@repo/schemas";

import { protectedProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import { computeCompletionRate, computeAvgDuration } from "../../utils/analytics";

const TAGS = ["Analytics"];
const getPath = generatePath("/analytics");

export const analyticsRouter = router({
  // -------------------------------------------------------------------------
  // analytics.getSummary
  // -------------------------------------------------------------------------
  getSummary: protectedProcedure
    .meta({
      openapi: { method: "GET", path: getPath("/summary"), tags: TAGS },
    })
    .input(z.object({ formId: z.string().uuid() }))
    .output(analyticsSummarySchema)
    .query(async ({ input, ctx }) => {
      // Verify ownership
      const [form] = await db
        .select()
        .from(formsTable)
        .where(and(eq(formsTable.id, input.formId), eq(formsTable.creatorId, ctx.user.id)))
        .limit(1);

      if (!form) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Form not found or access denied",
        });
      }

      const responses = await db
        .select({
          startedAt: responsesTable.startedAt,
          submittedAt: responsesTable.submittedAt,
        })
        .from(responsesTable)
        .where(eq(responsesTable.formId, input.formId));

      let totalResponses = responses.length;
      let avgDurationSeconds = computeAvgDuration(responses);

      try {
        const statsResult = await db.execute(sql`
          SELECT total_responses, avg_duration_seconds
          FROM form_summary_stats
          WHERE form_id = ${input.formId}
          LIMIT 1
        `);
        const rows =
          statsResult &&
          typeof statsResult === "object" &&
          "rows" in statsResult &&
          Array.isArray((statsResult as { rows: unknown[] }).rows)
            ? (statsResult as { rows: Array<Record<string, unknown>> }).rows
            : [];
        const statsRow = rows[0];
        if (statsRow) {
          totalResponses = Number(statsRow.total_responses ?? totalResponses);
          const avg = statsRow.avg_duration_seconds;
          avgDurationSeconds =
            avg !== null && avg !== undefined ? Math.round(Number(avg)) : avgDurationSeconds;
        }
      } catch {
        // Materialized view not migrated yet
      }

      const completionRate = computeCompletionRate(responses);

      return {
        totalResponses,
        completionRate,
        avgDurationSeconds,
      };
    }),

  // -------------------------------------------------------------------------
  // analytics.getFieldBreakdown
  // -------------------------------------------------------------------------
  getFieldBreakdown: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: getPath("/field-breakdown"),
        tags: TAGS,
      },
    })
    .input(z.object({ formId: z.string().uuid() }))
    .output(z.array(fieldBreakdownItemSchema))
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

      const displayValue = sql<string>`coalesce(
        ${answersV2Table.valueText},
        ${answersV2Table.valueNumber}::text,
        ${answersV2Table.valueBoolean}::text,
        to_char(${answersV2Table.valueDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"),
        ${answersV2Table.valueJson}::text
      )`;

      let rows = await db
        .select({
          fieldId: answersV2Table.fieldId,
          value: displayValue,
          cnt: count(),
        })
        .from(answersV2Table)
        .innerJoin(responsesTable, eq(answersV2Table.responseId, responsesTable.id))
        .where(eq(responsesTable.formId, input.formId))
        .groupBy(answersV2Table.fieldId, displayValue);

      if (rows.length === 0) {
        rows = await db
          .select({
            fieldId: answersTable.fieldId,
            value: answersTable.value,
            cnt: count(),
          })
          .from(answersTable)
          .innerJoin(responsesTable, eq(answersTable.responseId, responsesTable.id))
          .where(eq(responsesTable.formId, input.formId))
          .groupBy(answersTable.fieldId, answersTable.value);
      }

      // Build breakdown per field
      const byField = new Map<
        string,
        { responseCount: number; distribution: Record<string, number> }
      >();

      for (const row of rows) {
        if (!byField.has(row.fieldId)) {
          byField.set(row.fieldId, { responseCount: 0, distribution: Object.create(null) });
        }
        const entry = byField.get(row.fieldId)!;
        const cnt = Number(row.cnt);
        entry.responseCount += cnt;
        Object.defineProperty(entry.distribution, row.value, {
          value: cnt,
          enumerable: true,
          configurable: true,
          writable: true,
        });
      }

      return fields.map((field) => {
        const entry = byField.get(field.id) ?? {
          responseCount: 0,
          distribution: Object.create(null),
        };
        return {
          fieldId: field.id,
          fieldLabel: field.label,
          responseCount: entry.responseCount,
          distribution: entry.distribution,
        };
      });
    }),

  // -------------------------------------------------------------------------
  // analytics.getResponsesOverTime
  // -------------------------------------------------------------------------
  getResponsesOverTime: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: getPath("/responses-over-time"),
        tags: TAGS,
      },
    })
    .input(
      z.object({
        formId: z.string().uuid(),
        granularity: z.enum(["day", "week", "month"]).default("day"),
      }),
    )
    .output(z.array(z.object({ date: z.string(), count: z.number().int() })))
    .query(async ({ input, ctx }) => {
      const [form] = await db
        .select({ id: formsTable.id })
        .from(formsTable)
        .where(and(eq(formsTable.id, input.formId), eq(formsTable.creatorId, ctx.user.id)))
        .limit(1);

      if (!form) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const rows = await db
        .select({
          date: sql<string>`DATE_TRUNC(${input.granularity}, ${responsesTable.submittedAt})::text`,
          count: count(),
        })
        .from(responsesTable)
        .where(eq(responsesTable.formId, input.formId))
        .groupBy(sql`DATE_TRUNC(${input.granularity}, ${responsesTable.submittedAt})`)
        .orderBy(sql`DATE_TRUNC(${input.granularity}, ${responsesTable.submittedAt})`);

      return rows.map((r) => ({ date: r.date, count: Number(r.count) }));
    }),
});

export type AnalyticsRouter = typeof analyticsRouter;
