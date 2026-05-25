/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Integration test: Full response submission flow (Live DB)
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";

vi.mock("@repo/trpc/server/utils/submit-rate-limit", () => ({
  assertSubmitRateLimit: vi.fn().mockResolvedValue(undefined),
  resetInMemorySubmitRateLimit: vi.fn(),
}));

vi.mock("@repo/trpc/server/utils/client-context", () => ({
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

vi.mock("@repo/trpc/server/utils/jwt", () => ({
  verifyUnlockToken: vi.fn(() => false),
}));

vi.mock("@repo/services/notification", () => ({
  notificationService: {
    sendSubmissionEmails: vi.fn(),
  },
}));

import { responsesRouter } from "@repo/trpc/server/routes/responses/route";
import { db, clearDatabase, eq } from "@repo/database";
import { usersTable, formsTable, responsesTable, answersTable } from "@repo/database/schema";
import { notificationService } from "@repo/services/notification";
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, createCsrfToken } from "@repo/trpc/server/utils/csrf";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const FIELD_NAME = "b1a1a2f5-1e76-4013-aad1-4c6bb78ddf7f";
const FIELD_EMAIL = "34d1e84e-44e1-4d35-9c2e-59a7d840a1b9";
const CREATOR_EMAIL = "creator@chaiforms.dev";
const CREATOR_ID = "a1b2c3d4-e5f6-4789-a012-3456789abcde";
const FORM_ID = "e8c95b2b-9848-43d4-8a25-0e4c5fa0a222";

const baseForm = {
  id: FORM_ID,
  creatorId: CREATOR_ID,
  title: "Widget Feedback",
  slug: "test-slug-submit-flow",
  status: "published" as const,
  visibility: "unlisted" as const,
  theme: "default" as const,
  scope: "global" as const,
  requiresAuth: false,
  sendRespondentConfirmation: false,
  fields: [
    { id: FIELD_NAME, type: "short_text", label: "Your name", required: true },
    { id: FIELD_EMAIL, type: "email", label: "Email", required: false },
  ] as any,
};

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

beforeEach(async () => {
  await clearDatabase();
  vi.mocked(notificationService.sendSubmissionEmails).mockReset();

  // Insert creator
  await db.insert(usersTable).values({
    id: CREATOR_ID,
    email: CREATOR_EMAIL,
    fullName: "Creator",
  });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("responses.submit — full flow", () => {
  it("persists responsesTable + answersTable rows and calls sendSubmissionEmails", async () => {
    await db.insert(formsTable).values(baseForm);

    const caller = responsesRouter.createCaller(buildCtx() as any);

    const result = await caller.submit({
      formId: FORM_ID,
      startedAt: new Date("2024-06-01T10:00:00.000Z").toISOString(),
      answers: [
        { fieldId: FIELD_NAME, value: "Rohan" },
        { fieldId: FIELD_EMAIL, value: "rohan@example.com" },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.responseId).toBeDefined();

    // Verify DB insertion
    const dbResponses = await db
      .select()
      .from(responsesTable)
      .where(eq(responsesTable.id, result.responseId));
    expect(dbResponses).toHaveLength(1);

    const dbAnswers = await db
      .select()
      .from(answersTable)
      .where(eq(answersTable.responseId, result.responseId));
    expect(dbAnswers).toHaveLength(2);

    expect(notificationService.sendSubmissionEmails).toHaveBeenCalledTimes(1);
    expect(notificationService.sendSubmissionEmails).toHaveBeenCalledWith(
      expect.objectContaining({
        creatorEmail: CREATOR_EMAIL,
        formTitle: "Widget Feedback",
        responseId: result.responseId,
      }),
    );
  });

  it("rejects submissions where required fields are missing", async () => {
    await db.insert(formsTable).values(baseForm);

    const caller = responsesRouter.createCaller(buildCtx() as any);

    await expect(
      caller.submit({
        formId: FORM_ID,
        startedAt: new Date().toISOString(),
        answers: [], // FIELD_NAME is required — should fail
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    const dbResponses = await db.select().from(responsesTable);
    expect(dbResponses).toHaveLength(0);
    expect(notificationService.sendSubmissionEmails).not.toHaveBeenCalled();
  });

  it("rejects submissions to a draft form", async () => {
    await db.insert(formsTable).values({ ...baseForm, status: "draft" });

    const caller = responsesRouter.createCaller(buildCtx() as any);

    await expect(
      caller.submit({
        formId: FORM_ID,
        startedAt: new Date().toISOString(),
        answers: [{ fieldId: FIELD_NAME, value: "Rohan" }],
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects submissions to an archived form", async () => {
    await db.insert(formsTable).values({ ...baseForm, status: "archived" });

    const caller = responsesRouter.createCaller(buildCtx() as any);

    await expect(
      caller.submit({
        formId: FORM_ID,
        startedAt: new Date().toISOString(),
        answers: [{ fieldId: FIELD_NAME, value: "Rohan" }],
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects when form is not found", async () => {
    const caller = responsesRouter.createCaller(buildCtx() as any);

    await expect(
      caller.submit({
        formId: "5f8a0a99-9999-4444-8888-000000000000",
        startedAt: new Date().toISOString(),
        answers: [{ fieldId: FIELD_NAME, value: "Rohan" }],
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
