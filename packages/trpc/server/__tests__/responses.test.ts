import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";

vi.mock("../utils/submit-rate-limit", () => ({
  assertSubmitRateLimit: vi.fn().mockResolvedValue(undefined),
}));

const mockClientContext = {
  ipAddress: "127.0.0.1",
  userAgent: "test-agent",
  deviceFingerprint: "device",
  deviceType: "desktop",
  osName: "TestOS",
  osVersion: "1",
  browserName: "TestBrowser",
  browserVersion: "1",
  deviceVendor: null,
  deviceModel: null,
  latitude: null,
  longitude: null,
  geoCountry: null,
  geoRegion: null,
  geoCity: null,
};

vi.mock("../utils/client-context", () => ({
  parseClientContext: vi.fn(() => mockClientContext),
  buildRateLimitKey: vi.fn(() => "ratelimit"),
}));

vi.mock("../utils/jwt", () => ({
  verifyUnlockToken: vi.fn(() => false),
}));

vi.mock("../utils/analytics-broadcast", () => ({
  broadcastDelta: vi.fn(),
}));

vi.mock("@repo/services/notification", () => ({
  notificationService: {
    sendSubmissionEmails: vi.fn(),
  },
}));

const { fetchDisplayAnswersForResponses } = vi.hoisted(() => ({
  fetchDisplayAnswersForResponses: vi.fn(),
}));

vi.mock("@repo/database", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
  eq: vi.fn(),
  and: vi.fn(),
  count: vi.fn(),
  desc: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
  isNull: vi.fn(),
  buildTypedAnswerRow: vi.fn(
    (responseId: string, _field: unknown, answer: { fieldId: string; value: string }) => ({
      responseId,
      fieldId: answer.fieldId,
      valueText: answer.value,
    }),
  ),
  fetchDisplayAnswersForResponses,
}));

vi.mock("@repo/database/schema", () => ({
  formsTable: {
    id: "id",
    status: "status",
    formId: "formId",
    creatorId: "creatorId",
    deletedAt: "deletedAt",
  },
  responsesTable: {
    id: "id",
    formId: "formId",
    submittedAt: "submittedAt",
  },
  answersTable: {
    responseId: "responseId",
    fieldId: "fieldId",
  },
  answersV2Table: {
    responseId: "responseId",
    fieldId: "fieldId",
  },
  usersTable: {
    id: "id",
    email: "email",
  },
}));

import { responsesRouter } from "../routes/responses/route";
import { db } from "@repo/database";
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, createCsrfToken } from "../utils/csrf";
import { verifyUnlockToken } from "../utils/jwt";
import { notificationService } from "@repo/services/notification";

const mockDb = db as unknown as {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
};

type SelectPlan = {
  type: "limit" | "where" | "orderBy" | "orderByLimit";
  result: unknown[];
};

type InsertPlan = { type: "returning"; result: unknown[] } | { type: "valuesOnly" };

let selectPlans: SelectPlan[] = [];
let insertPlans: InsertPlan[] = [];

const envKeys = ["CSRF_SECRET", "JWT_SECRET", "WEB_ORIGIN"];
const originalEnv: Record<string, string | undefined> = {};

const baseForm = {
  id: "e8c95b2b-9848-43d4-8a25-0e4c5fa0a222",
  creatorId: "a1b2c3d4-e5f6-4789-a012-3456789abcde",
  title: "Test Form",
  sendRespondentConfirmation: false,
  status: "published" as const,
  expiryDate: null as Date | null,
  responseLimit: null as number | null,
  accessPasswordHash: null as string | null,
  deletedAt: null as Date | null,
  fields: [
    {
      id: "b1a1a2f5-1e76-4013-aad1-4c6bb78ddf7f",
      type: "short_text",
      label: "Name",
      required: true,
    },
    {
      id: "34d1e84e-44e1-4d35-9c2e-59a7d840a1b9",
      type: "email",
      label: "Email",
    },
  ],
};

function createContext(opts?: { method?: string; withCsrf?: boolean }) {
  const token = opts?.withCsrf ? createCsrfToken() : null;
  return {
    user: null,
    req: {
      headers: token ? { [CSRF_HEADER_NAME]: token } : {},
      cookies: token ? { [CSRF_COOKIE_NAME]: token } : {},
      method: opts?.method ?? "GET",
      ip: "127.0.0.1",
    },
    res: {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    },
  } as any;
}

beforeAll(() => {
  for (const key of envKeys) {
    originalEnv[key] = process.env[key];
  }
  process.env.CSRF_SECRET = "c".repeat(32);
  process.env.JWT_SECRET = "j".repeat(32);
});

afterAll(() => {
  for (const key of envKeys) {
    const value = originalEnv[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

beforeEach(() => {
  selectPlans = [];
  insertPlans = [];
  fetchDisplayAnswersForResponses.mockReset();
  fetchDisplayAnswersForResponses.mockResolvedValue(new Map());
  mockDb.select.mockReset();
  mockDb.insert.mockReset();

  mockDb.select.mockImplementation(() => {
    const plan = selectPlans.shift() ?? { type: "where", result: [] };
    const chain: Record<string, unknown> = {
      from: vi.fn().mockReturnThis(),
    };

    if (plan.type === "limit") {
      chain.where = vi.fn().mockReturnThis();
      chain.limit = vi.fn().mockResolvedValue(plan.result);
    } else if (plan.type === "orderByLimit") {
      chain.where = vi.fn().mockReturnThis();
      chain.orderBy = vi.fn().mockReturnThis();
      chain.limit = vi.fn().mockReturnThis();
      chain.offset = vi.fn().mockResolvedValue(plan.result);
    } else if (plan.type === "orderBy") {
      chain.where = vi.fn().mockReturnThis();
      chain.orderBy = vi.fn().mockResolvedValue(plan.result);
    } else {
      chain.where = vi.fn().mockResolvedValue(plan.result);
    }

    return chain as ReturnType<typeof db.select>;
  });

  mockDb.insert.mockImplementation(() => {
    const plan = insertPlans.shift() ?? { type: "valuesOnly" };
    if (plan.type === "returning") {
      return {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue(plan.result),
      };
    }
    return {
      values: vi.fn().mockResolvedValue(undefined),
    };
  });
});

describe("responses router", () => {
  it("accepts a valid submission", async () => {
    selectPlans.push({ type: "limit", result: [baseForm] });
    insertPlans.push({
      type: "returning",
      result: [{ id: "0d7aa3e1-1c71-4f7a-b909-1f94017f0f11" }],
    });
    insertPlans.push({ type: "valuesOnly" });
    insertPlans.push({ type: "valuesOnly" });
    selectPlans.push({
      type: "limit",
      result: [{ email: "creator@example.com" }],
    });

    const ctx = createContext({ method: "POST", withCsrf: true });
    const caller = responsesRouter.createCaller(ctx);

    const result = await caller.submit({
      formId: baseForm.id,
      startedAt: new Date("2024-03-01T10:00:00.000Z").toISOString(),
      answers: [
        {
          fieldId: baseForm.fields[0]!.id,
          value: "Ada",
        },
        {
          fieldId: baseForm.fields[1]!.id,
          value: "ada@example.com",
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.responseId).toBe("0d7aa3e1-1c71-4f7a-b909-1f94017f0f11");
    expect(notificationService.sendSubmissionEmails).toHaveBeenCalledWith(
      expect.objectContaining({
        creatorEmail: "creator@example.com",
        formTitle: "Test Form",
      }),
    );
  });

  it("rejects missing required fields", async () => {
    selectPlans.push({ type: "limit", result: [baseForm] });

    const ctx = createContext({ method: "POST", withCsrf: true });
    const caller = responsesRouter.createCaller(ctx);

    await expect(
      caller.submit({
        formId: baseForm.id,
        startedAt: new Date("2024-03-01T10:00:00.000Z").toISOString(),
        answers: [],
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("rejects submissions to draft forms", async () => {
    selectPlans.push({
      type: "limit",
      result: [{ ...baseForm, status: "draft" }],
    });

    const ctx = createContext({ method: "POST", withCsrf: true });
    const caller = responsesRouter.createCaller(ctx);

    await expect(
      caller.submit({
        formId: baseForm.id,
        startedAt: new Date("2024-03-01T10:00:00.000Z").toISOString(),
        answers: [{ fieldId: baseForm.fields[0]!.id, value: "Ada" }],
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects submissions to expired forms", async () => {
    selectPlans.push({
      type: "limit",
      result: [
        {
          ...baseForm,
          expiryDate: new Date("2023-01-01T00:00:00.000Z"),
        },
      ],
    });

    const ctx = createContext({ method: "POST", withCsrf: true });
    const caller = responsesRouter.createCaller(ctx);

    await expect(
      caller.submit({
        formId: baseForm.id,
        startedAt: new Date("2024-03-01T10:00:00.000Z").toISOString(),
        answers: [{ fieldId: baseForm.fields[0]!.id, value: "Ada" }],
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects submissions past response limit", async () => {
    selectPlans.push({
      type: "limit",
      result: [{ ...baseForm, responseLimit: 2 }],
    });
    selectPlans.push({ type: "where", result: [{ total: 2 }] });

    const ctx = createContext({ method: "POST", withCsrf: true });
    const caller = responsesRouter.createCaller(ctx);

    await expect(
      caller.submit({
        formId: baseForm.id,
        startedAt: new Date("2024-03-01T10:00:00.000Z").toISOString(),
        answers: [{ fieldId: baseForm.fields[0]!.id, value: "Ada" }],
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("requires unlock token for password-protected forms", async () => {
    selectPlans.push({
      type: "limit",
      result: [{ ...baseForm, accessPasswordHash: "hashed" }],
    });

    const ctx = createContext({ method: "POST", withCsrf: true });
    const caller = responsesRouter.createCaller(ctx);

    await expect(
      caller.submit({
        formId: baseForm.id,
        startedAt: new Date("2024-03-01T10:00:00.000Z").toISOString(),
        answers: [{ fieldId: baseForm.fields[0]!.id, value: "Ada" }],
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(verifyUnlockToken).not.toHaveBeenCalled();
  });

  it("lists responses with answers", async () => {
    selectPlans.push({ type: "limit", result: [{ id: baseForm.id }] });
    selectPlans.push({ type: "where", result: [{ count: 1 }] });
    selectPlans.push({
      type: "orderByLimit",
      result: [
        {
          id: "0d7aa3e1-1c71-4f7a-b909-1f94017f0f11",
          formId: baseForm.id,
          startedAt: new Date("2024-03-01T10:00:00.000Z"),
          submittedAt: new Date("2024-03-01T10:01:00.000Z"),
          respondentEmail: "ada@example.com",
        },
      ],
    });
    fetchDisplayAnswersForResponses.mockResolvedValue(
      new Map([
        [
          "0d7aa3e1-1c71-4f7a-b909-1f94017f0f11",
          [
            {
              id: "2b5c1aa0-7b6c-4c7a-ae1f-88107b1ddcfe",
              fieldId: baseForm.fields[0]!.id,
              value: "Ada",
            },
          ],
        ],
      ]),
    );

    const ctx = createContext();
    const caller = responsesRouter.createCaller({
      ...ctx,
      user: { id: "owner", role: "creator" } as any,
    });

    const result = await caller.list({ formId: baseForm.id, page: 1, pageSize: 20 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.answers).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("exports responses as CSV", async () => {
    selectPlans.push({ type: "limit", result: [baseForm] });
    selectPlans.push({
      type: "orderBy",
      result: [
        {
          id: "0d7aa3e1-1c71-4f7a-b909-1f94017f0f11",
          formId: baseForm.id,
          submittedAt: new Date("2024-03-01T10:01:00.000Z"),
          respondentEmail: "ada@example.com",
        },
      ],
    });
    fetchDisplayAnswersForResponses.mockResolvedValue(
      new Map([
        [
          "0d7aa3e1-1c71-4f7a-b909-1f94017f0f11",
          [
            {
              id: "ans-1",
              fieldId: baseForm.fields[0]!.id,
              value: "Ada",
            },
          ],
        ],
      ]),
    );

    const ctx = createContext();
    const caller = responsesRouter.createCaller({
      ...ctx,
      user: { id: "owner", role: "creator" } as any,
    });

    const csv = await caller.exportCsv({ formId: baseForm.id });
    const lines = csv.split("\n");

    expect(lines[0]).toContain("Response ID");
    expect(lines[0]).toContain("Name");
    expect(lines[1]).toContain("Ada");
  });
});
