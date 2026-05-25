import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@repo/database", () => ({
  isNull: vi.fn(),
  db: {
    select: vi.fn(),
    execute: vi.fn().mockResolvedValue({ rows: [] }),
  },
  eq: vi.fn(),
  and: vi.fn(),
  count: vi.fn(),
  sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
    strings,
    values,
  })),
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
  answersTable: {
    fieldId: "fieldId",
    value: "value",
    responseId: "responseId",
  },
  answersV2Table: {
    fieldId: "fieldId",
    valueText: "valueText",
    valueNumber: "valueNumber",
    valueDate: "valueDate",
    valueBoolean: "valueBoolean",
    valueJson: "valueJson",
    responseId: "responseId",
  },
}));

import { analyticsRouter } from "../routes/analytics/route";
import { db } from "@repo/database";

const mockDb = db as unknown as {
  select: ReturnType<typeof vi.fn>;
};

const baseForm = {
  id: "b5ec38d2-ccff-4b0b-9a0e-8c0919d0cf9c",
  creatorId: "creator",
  fields: [
    { id: "e63a8e9e-24f6-455a-bd54-52a1eb50cb17", label: "Name", type: "short_text" },
    { id: "6c2d1b71-3315-4fa1-8207-6bcfafbc76eb", label: "Role", type: "short_text" },
  ],
};

function createContext() {
  return {
    user: { id: "creator", role: "creator" },
    req: { headers: {}, cookies: {} },
    res: { cookie: vi.fn(), clearCookie: vi.fn() },
  };
}

beforeEach(() => {
  mockDb.select.mockReset();
});

describe("analytics router", () => {
  it("returns summary metrics for owned forms", async () => {
    mockDb.select
      .mockImplementationOnce(() => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([baseForm]),
      }))
      .mockImplementationOnce(() => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([
          {
            startedAt: new Date("2024-01-01T10:00:00.000Z"),
            submittedAt: new Date("2024-01-01T10:00:10.000Z"),
          },
          {
            startedAt: new Date("2024-01-01T11:00:00.000Z"),
            submittedAt: new Date("2024-01-01T11:00:30.000Z"),
          },
          {
            startedAt: new Date("2024-01-01T12:00:00.000Z"),
            submittedAt: null,
          },
        ]),
      }));

    const ctx = createContext();
    const caller = analyticsRouter.createCaller(ctx);
    const result = await caller.getSummary({ formId: baseForm.id });

    expect(result.totalResponses).toBe(3);
    expect(result.completionRate).toBe(66.67);
    expect(result.avgDurationSeconds).toBe(20);
  });

  it("rejects summary for non-owned forms", async () => {
    mockDb.select.mockImplementationOnce(() => ({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    }));

    const ctx = createContext();
    const caller = analyticsRouter.createCaller(ctx);

    await expect(caller.getSummary({ formId: baseForm.id })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("returns field breakdown distributions", async () => {
    mockDb.select
      .mockImplementationOnce(() => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([baseForm]),
      }))
      .mockImplementationOnce(() => ({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockResolvedValue([
          { fieldId: "e63a8e9e-24f6-455a-bd54-52a1eb50cb17", value: "Ada", cnt: 2 },
          { fieldId: "e63a8e9e-24f6-455a-bd54-52a1eb50cb17", value: "Linus", cnt: 1 },
        ]),
      }));

    const ctx = createContext();
    const caller = analyticsRouter.createCaller(ctx);
    const result = await caller.getFieldBreakdown({ formId: baseForm.id });

    expect(result[0]!.fieldId).toBe("e63a8e9e-24f6-455a-bd54-52a1eb50cb17");
    expect(result[0]!.distribution["Ada"]).toBe(2);
  });

  it("returns responses over time", async () => {
    mockDb.select
      .mockImplementationOnce(() => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: baseForm.id }]),
      }))
      .mockImplementationOnce(() => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([
          { date: "2024-01-01", count: 2 },
          { date: "2024-01-02", count: 1 },
        ]),
      }));

    const ctx = createContext();
    const caller = analyticsRouter.createCaller(ctx);
    const result = await caller.getResponsesOverTime({
      formId: baseForm.id,
      granularity: "day",
    });

    expect(result).toHaveLength(2);
    expect(result[0]!.count).toBe(2);
  });
});
