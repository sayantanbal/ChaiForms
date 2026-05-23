import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";
import { analyticsRouter } from "../routes/analytics/route";
import { db } from "@repo/database";

vi.mock("@repo/database", () => ({
  db: {
    select: vi.fn(),
  },
  eq: vi.fn(),
  and: vi.fn(),
  count: vi.fn(),
}));

vi.mock("@repo/database/schema", () => ({
  formsTable: {
    id: "id",
    creatorId: "creatorId",
  },
  answersTable: {
    fieldId: "fieldId",
    value: "value",
    responseId: "responseId",
  },
  responsesTable: {
    id: "id",
    formId: "formId",
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

beforeEach(() => {
  mockDb.select.mockReset();
});

describe("analytics.getFieldBreakdown distribution", () => {
  // Feature: form-builder-saas, Property 16: Form field distributions are computed correctly
  it("accurately computes the frequency distribution of answers for each field", async () => {
    const fieldIdGen = fc.uuid();
    const valueGen = fc.string({ minLength: 1, maxLength: 20 });
    
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            fieldId: fieldIdGen,
            value: valueGen,
            cnt: fc.integer({ min: 1, max: 100 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        async (groupedAnswers) => {
          const formId = "9b2c6d5e-2345-6789-abcd-ef0123456789";
          
          // Deduplicate fieldIds for the form schema
          const uniqueFieldIds = Array.from(new Set(groupedAnswers.map(a => a.fieldId)));
          const form = {
            id: formId,
            creatorId: user.id,
            fields: uniqueFieldIds.map(id => ({ id, label: `Field ${id}`, type: "short_text" })),
          };

          const selectQueue: unknown[][] = [[form], groupedAnswers];

          mockDb.select.mockImplementation(() => {
            const chain = {
              from: vi.fn().mockReturnThis(),
              where: vi.fn().mockReturnThis(),
              innerJoin: vi.fn().mockReturnThis(),
              groupBy: vi.fn().mockImplementation(() => Promise.resolve(selectQueue.shift() ?? [])),
              limit: vi.fn().mockImplementation(() => Promise.resolve(selectQueue.shift() ?? [])),
            };
            return chain as any;
          });

          const ctx = createContext();
          const caller = analyticsRouter.createCaller(ctx);
          
          const result = await caller.getFieldBreakdown({ formId });

          expect(result.length).toBe(uniqueFieldIds.length);
          
          for (const field of result) {
            const fieldAnswers = groupedAnswers.filter(a => a.fieldId === field.fieldId);
            
            // Expected distribution
            const expectedDist: Record<string, number> = {};
            let expectedTotal = 0;
            
            for (const ans of fieldAnswers) {
              expectedDist[ans.value] = (expectedDist[ans.value] || 0) + ans.cnt;
              expectedTotal += ans.cnt;
            }
            
            expect(field.responseCount).toBe(expectedTotal);
            expect(field.distribution).toEqual(expectedDist);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
