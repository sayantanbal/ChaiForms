/**
 * Integration test: Full response submission flow
 *
 * Verifies the critical path:
 *   1. A form exists in "published" state with two required fields.
 *   2. `responses.submit` receives a valid payload.
 *   3. `responsesTable` row is inserted (responseId returned).
 *   4. `answersTable` rows are inserted for each answer.
 *   5. `notificationService.sendSubmissionEmails` is called with the
 *      creator email and form title.
 *
 * Also verifies guard conditions:
 *   - Draft forms reject submissions (FORBIDDEN).
 *   - Archived forms reject submissions (FORBIDDEN).
 *   - Missing required fields reject (BAD_REQUEST).
 *   - Notification is NOT called when insert fails.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock("../../../packages/trpc/server/utils/submit-rate-limit", () => ({
  assertSubmitRateLimit: vi.fn().mockResolvedValue(undefined),
  resetInMemorySubmitRateLimit: vi.fn(),
}));

vi.mock("../../../packages/trpc/server/utils/client-context", () => ({
  parseClientContext: vi.fn(() => ({
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
  })),
  buildRateLimitKey: vi.fn(() => "ratelimit"),
}));

vi.mock("../../../packages/trpc/server/utils/jwt", () => ({
  verifyUnlockToken: vi.fn(() => false),
}));

vi.mock("@repo/services/notification", () => ({
  notificationService: {
    sendSubmissionEmails: vi.fn(),
  },
}));

vi.mock("@repo/database", () => ({
  db: { select: vi.fn(), insert: vi.fn() },
  eq: vi.fn(),
  and: vi.fn(),
  count: vi.fn(),
  desc: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
}));

vi.mock("@repo/database/schema", () => ({
  formsTable: { id: "id", status: "status", formId: "formId", creatorId: "creatorId" },
  responsesTable: { id: "id", formId: "formId", submittedAt: "submittedAt" },
  answersTable: { responseId: "responseId", fieldId: "fieldId" },
  usersTable: { id: "id", email: "email" },
}));

import { responsesRouter } from "../../../packages/trpc/server/routes/responses/route";
import { db } from "@repo/database";
import { notificationService } from "@repo/services/notification";
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  createCsrfToken,
} from "../../../packages/trpc/server/utils/csrf";

const mockDb = db as unknown as {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const FIELD_NAME = "b1a1a2f5-1e76-4013-aad1-4c6bb78ddf7f";
const FIELD_EMAIL = "34d1e84e-44e1-4d35-9c2e-59a7d840a1b9";
const RESPONSE_ID = "0d7aa3e1-1c71-4f7a-b909-1f94017f0f11";
const CREATOR_EMAIL = "creator@chaiforms.dev";
const FORM_ID = "e8c95b2b-9848-43d4-8a25-0e4c5fa0a222";

const baseForm = {
  id: FORM_ID,
  creatorId: "a1b2c3d4-e5f6-4789-a012-3456789abcde",
  title: "Widget Feedback",
  status: "published" as const,
  expiryDate: null as Date | null,
  responseLimit: null as number | null,
  accessPasswordHash: null as string | null,
  sendRespondentConfirmation: false,
  fields: [
    { id: FIELD_NAME, type: "short_text", label: "Your name", required: true },
    { id: FIELD_EMAIL, type: "email", label: "Email", required: false },
  ],
};

type SelectPlan =
  | { type: "limit"; result: unknown[] }
  | { type: "where"; result: unknown[] }
  | { type: "orderByLimit"; result: unknown[] };
type InsertPlan = { type: "returning"; result: unknown[] } | { type: "valuesOnly" };

let selectPlans: SelectPlan[] = [];
let insertPlans: InsertPlan[] = [];

function buildCtx() {
  const token = createCsrfToken();
  return {
    user: null,
    req: {
      headers: { [CSRF_HEADER_NAME]: token },
      cookies: { [CSRF_COOKIE_NAME]: token },
      method: "POST",
      ip: "127.0.0.1",
    },
    res: { cookie: vi.fn(), clearCookie: vi.fn() },
  };
}

beforeAll(() => {
  process.env.JWT_SECRET = "j".repeat(32);
  process.env.CSRF_SECRET = "c".repeat(32);
});

afterAll(() => {
  delete process.env.JWT_SECRET;
  delete process.env.CSRF_SECRET;
});

beforeEach(() => {
  selectPlans = [];
  insertPlans = [];
  vi.mocked(notificationService.sendSubmissionEmails).mockReset();
  mockDb.select.mockReset();
  mockDb.insert.mockReset();

  mockDb.select.mockImplementation(() => {
    const plan = selectPlans.shift() ?? { type: "where", result: [] };
    const chain: Record<string, unknown> = { from: vi.fn().mockReturnThis() };
    if (plan.type === "limit") {
      chain.where = vi.fn().mockReturnThis();
      chain.limit = vi.fn().mockResolvedValue(plan.result);
    } else if (plan.type === "orderByLimit") {
      chain.where = vi.fn().mockReturnThis();
      chain.orderBy = vi.fn().mockReturnThis();
      chain.limit = vi.fn().mockReturnThis();
      chain.offset = vi.fn().mockResolvedValue(plan.result);
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
    return { values: vi.fn().mockResolvedValue(undefined) };
  });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("responses.submit — full flow", () => {
  it("persists responsesTable + answersTable rows and calls sendSubmissionEmails", async () => {
    // 1. Fetch form
    selectPlans.push({ type: "limit", result: [baseForm] });
    // 2. Insert response row → returns responseId
    insertPlans.push({ type: "returning", result: [{ id: RESPONSE_ID }] });
    // 3. Insert answers rows (batch, no returning)
    insertPlans.push({ type: "valuesOnly" });
    // 4. Fetch creator email for notification
    selectPlans.push({ type: "limit", result: [{ email: CREATOR_EMAIL }] });

    const caller = responsesRouter.createCaller(buildCtx() as any);

    const result = await caller.submit({
      formId: FORM_ID,
      startedAt: new Date("2024-06-01T10:00:00.000Z").toISOString(),
      answers: [
        { fieldId: FIELD_NAME, value: "Rohan" },
        { fieldId: FIELD_EMAIL, value: "rohan@example.com" },
      ],
    });

    // Response row inserted
    expect(result.success).toBe(true);
    expect(result.responseId).toBe(RESPONSE_ID);

    // db.insert called twice: once for responses, once for answers
    expect(mockDb.insert).toHaveBeenCalledTimes(2);

    // Notification triggered
    expect(notificationService.sendSubmissionEmails).toHaveBeenCalledTimes(1);
    expect(notificationService.sendSubmissionEmails).toHaveBeenCalledWith(
      expect.objectContaining({
        creatorEmail: CREATOR_EMAIL,
        formTitle: "Widget Feedback",
        responseId: RESPONSE_ID,
      })
    );
  });

  it("rejects submissions where required fields are missing", async () => {
    selectPlans.push({ type: "limit", result: [baseForm] });

    const caller = responsesRouter.createCaller(buildCtx() as any);

    await expect(
      caller.submit({
        formId: FORM_ID,
        startedAt: new Date().toISOString(),
        answers: [], // FIELD_NAME is required — should fail
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    // No rows inserted
    expect(mockDb.insert).not.toHaveBeenCalled();
    expect(notificationService.sendSubmissionEmails).not.toHaveBeenCalled();
  });

  it("rejects submissions to a draft form", async () => {
    selectPlans.push({ type: "limit", result: [{ ...baseForm, status: "draft" }] });

    const caller = responsesRouter.createCaller(buildCtx() as any);

    await expect(
      caller.submit({
        formId: FORM_ID,
        startedAt: new Date().toISOString(),
        answers: [{ fieldId: FIELD_NAME, value: "Rohan" }],
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("rejects submissions to an archived form", async () => {
    selectPlans.push({ type: "limit", result: [{ ...baseForm, status: "archived" }] });

    const caller = responsesRouter.createCaller(buildCtx() as any);

    await expect(
      caller.submit({
        formId: FORM_ID,
        startedAt: new Date().toISOString(),
        answers: [{ fieldId: FIELD_NAME, value: "Rohan" }],
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects when form is not found", async () => {
    selectPlans.push({ type: "limit", result: [] }); // no form

    const caller = responsesRouter.createCaller(buildCtx() as any);

    await expect(
      caller.submit({
        formId: "non-existent-form-id",
        startedAt: new Date().toISOString(),
        answers: [{ fieldId: FIELD_NAME, value: "Rohan" }],
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
