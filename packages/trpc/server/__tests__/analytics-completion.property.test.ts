import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import * as fc from "fast-check";
import { analyticsRouter } from "../routes/analytics/route";
import { db } from "@repo/database";

vi.mock("@repo/database", () => ({
  isNull: vi.fn(),
  db: {
    select: vi.fn(),
    execute: vi.fn().mockResolvedValue({ rows: [] }),
  },
  eq: vi.fn(),
  and: vi.fn(),
  sql: vi.fn(),
}));

vi.mock("@repo/database/schema", () => ({
  formsTable: {
    id: "id",
    creatorId: "creatorId",
  },
  responsesTable: {
    formId: "formId",
    startedAt: "startedAt",
    submittedAt: "submittedAt",
  },
}));

const mockDb = db as unknown as {
  select: ReturnType<typeof vi.fn>;
};

const user = {
  id: "8a1b5c4d-1234-5678-9abc-def012345678",
  role: "creator" as const,
};

function createContext() {
  return {
    user,
    req: { headers: {}, cookies: {} },
    res: { cookie: vi.fn(), clearCookie: vi.fn() },
  };
}

describe("analytics.getSummary completion and duration", () => {
  // Feature: form-builder-saas, Property 15: Analytics accurately computes completion rates and durations
  it("calculates correct completion rate and average duration", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            startedAt: fc.date({
              min: new Date("2024-01-01T00:00:00.000Z"),
              max: new Date("2024-12-31T23:59:59.000Z"),
            }),
            durationSeconds: fc.integer({ min: 1, max: 3600 }).map((d) => d * 1000),
            completed: fc.boolean(),
          }),
          { minLength: 1, maxLength: 50 },
        ),
        async (responsesData) => {
          fc.pre(responsesData.every((d) => !Number.isNaN(d.startedAt.getTime())));
          const formId = "9b2c6d5e-2345-6789-abcd-ef0123456789";
          const form = {
            id: formId,
            creatorId: user.id,
            fields: [],
          };

          const responses = responsesData.map((d) => ({
            startedAt: d.startedAt,
            submittedAt: d.completed ? new Date(d.startedAt.getTime() + d.durationSeconds) : null,
          }));

          const selectQueue: unknown[][] = [[form], responses];

          let selectCall = 0;
          mockDb.select.mockImplementation(() => {
            selectCall += 1;
            if (selectCall === 1) {
              return {
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                limit: vi.fn().mockImplementation(() => Promise.resolve(selectQueue.shift() ?? [])),
              } as any;
            }
            return {
              from: vi.fn().mockReturnThis(),
              where: vi.fn().mockImplementation(() => Promise.resolve(selectQueue.shift() ?? [])),
            } as any;
          });

          const ctx = createContext();
          const caller = analyticsRouter.createCaller(ctx);

          const result = await caller.getSummary({ formId });

          const completedCount = responsesData.filter((d) => d.completed).length;
          const expectedCompletionRate = (completedCount / responsesData.length) * 100;

          const totalDuration = responsesData
            .filter((d) => d.completed)
            .reduce((sum, d) => sum + d.durationSeconds / 1000, 0);
          const expectedAvgDuration = completedCount > 0 ? totalDuration / completedCount : 0;

          expect(result.totalResponses).toBe(responsesData.length);
          expect(result.completionRate).toBeCloseTo(expectedCompletionRate, 2);
          expect(result.avgDurationSeconds).toBe(
            expectedAvgDuration === 0 ? null : Math.round(expectedAvgDuration),
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
