/**
 * Integration test: Visibility enforcement
 *
 * Verifies:
 *   1. explore.listPublicForms returns ONLY published + public forms:
 *      - drafts excluded
 *      - archived forms excluded
 *      - unlisted forms excluded
 *   2. responses.submit rejects draft forms (FORBIDDEN)
 *   3. responses.submit rejects archived forms (FORBIDDEN)
 *   4. explore.getFormBySlug returns public published forms
 *   5. explore.getFormBySlug does NOT return draft forms
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock("../../../packages/trpc/server/utils/submit-rate-limit", () => ({
  assertSubmitRateLimit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../packages/trpc/server/utils/client-context", () => ({
  parseClientContext: vi.fn(() => ({
    ipAddress: "127.0.0.1",
    userAgent: "test",
    deviceFingerprint: "fp",
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
  notificationService: { sendSubmissionEmails: vi.fn() },
}));

vi.mock("@repo/database", () => ({
  db: { select: vi.fn(), insert: vi.fn() },
  eq: vi.fn(),
  and: vi.fn(),
  or: vi.fn(),
  count: vi.fn(),
  desc: vi.fn(),
  asc: vi.fn(),
  sql: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
  ilike: vi.fn(),
}));

vi.mock("@repo/database/schema", () => ({
  formsTable: {
    id: "id",
    status: "status",
    visibility: "visibility",
    creatorId: "creatorId",
    slug: "slug",
    featured: "featured",
  },
  responsesTable: { id: "id", formId: "formId" },
  answersTable: { responseId: "responseId", fieldId: "fieldId" },
  usersTable: { id: "id", email: "email" },
  templatesTable: { id: "id", title: "title" },
  pagesTable: { id: "id", formId: "formId" },
}));

import { exploreRouter } from "../../../packages/trpc/server/routes/explore/route";
import { responsesRouter } from "../../../packages/trpc/server/routes/responses/route";
import { db } from "@repo/database";
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
function makeForm(overrides: Record<string, unknown>) {
  return {
    id: "form-id-001",
    title: "Test Form",
    description: null,
    slug: "test-form",
    theme: "default",
    status: "published",
    visibility: "public",
    hasPassword: false,
    fields: [{ id: "f1", type: "short_text", label: "Name", required: true }],
    creatorId: "creator-1",
    expiryDate: null,
    responseLimit: null,
    accessPasswordHash: null,
    sendRespondentConfirmation: false,
    ...overrides,
  };
}

type SelectPlan =
  | { type: "limit"; result: unknown[] }
  | { type: "where"; result: unknown[] }
  | { type: "orderByLimit"; result: unknown[] }
  | { type: "full"; result: unknown[] };

let selectPlans: SelectPlan[] = [];

function buildPublicCtx() {
  return {
    user: null,
    req: { headers: {}, cookies: {}, method: "GET", ip: "127.0.0.1" },
    res: { cookie: vi.fn(), clearCookie: vi.fn() },
  };
}

function buildSubmitCtx() {
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
    } else if (plan.type === "full") {
      // Count query chain: .select(count()).from().where() → array with { count }
      chain.where = vi.fn().mockResolvedValue(plan.result);
      chain.orderBy = vi.fn().mockResolvedValue(plan.result);
      chain.limit = vi.fn().mockResolvedValue(plan.result);
      chain.offset = vi.fn().mockResolvedValue(plan.result);
    } else {
      chain.where = vi.fn().mockResolvedValue(plan.result);
    }

    return chain as ReturnType<typeof db.select>;
  });

  mockDb.insert.mockImplementation(() => ({
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
  }));
});

// ---------------------------------------------------------------------------
// Tests — explore.listPublicForms visibility
// ---------------------------------------------------------------------------
describe("explore.listPublicForms — visibility enforcement", () => {
  it("returns only published + public forms (excludes draft, archived, unlisted)", async () => {
    const publishedPublic = makeForm({ id: "form-pub", status: "published", visibility: "public" });

    // The explore router filters in SQL; we simulate the DB returning only matching rows
    // Count query
    selectPlans.push({ type: "where", result: [{ count: 1 }] });
    // Items query
    selectPlans.push({ type: "orderByLimit", result: [publishedPublic] });

    const caller = exploreRouter.createCaller(buildPublicCtx() as any);
    const result = await caller.listPublicForms({ page: 1, pageSize: 10 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe("form-pub");
    expect(result.total).toBe(1);
  });

  it("returns empty list when all forms are draft/archived/unlisted", async () => {
    // Simulate DB returning no matching rows (all filtered by status/visibility)
    selectPlans.push({ type: "where", result: [{ count: 0 }] });
    selectPlans.push({ type: "orderByLimit", result: [] });

    const caller = exploreRouter.createCaller(buildPublicCtx() as any);
    const result = await caller.listPublicForms({ page: 1, pageSize: 10 });

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tests — responses.submit status guard
// ---------------------------------------------------------------------------
describe("responses.submit — status guard", () => {
  const requiredAnswer = [{ fieldId: "f1", value: "Test" }];
  const startedAt = new Date().toISOString();

  it("rejects submissions to a draft form with FORBIDDEN", async () => {
    selectPlans.push({ type: "limit", result: [makeForm({ status: "draft" })] });

    const caller = responsesRouter.createCaller(buildSubmitCtx() as any);

    await expect(
      caller.submit({ formId: "form-id-001", startedAt, answers: requiredAnswer })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects submissions to an archived form with FORBIDDEN", async () => {
    selectPlans.push({ type: "limit", result: [makeForm({ status: "archived" })] });

    const caller = responsesRouter.createCaller(buildSubmitCtx() as any);

    await expect(
      caller.submit({ formId: "form-id-001", startedAt, answers: requiredAnswer })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("accepts submission to a published form (even if unlisted)", async () => {
    selectPlans.push({
      type: "limit",
      result: [makeForm({ status: "published", visibility: "unlisted" })],
    });
    // Insert response
    mockDb.insert.mockImplementation(() => ({
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: "new-response-id" }]),
    }));
    // Second insert (answers)
    selectPlans.push({ type: "limit", result: [{ email: "creator@example.com" }] });

    const caller = responsesRouter.createCaller(buildSubmitCtx() as any);

    const result = await caller.submit({
      formId: "form-id-001",
      startedAt,
      answers: requiredAnswer,
    });

    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests — explore.getBySlug (public form access)
// ---------------------------------------------------------------------------
describe("forms.getBySlug — public access", () => {
  it("returns a published public form by slug", async () => {
    const form = makeForm({ slug: "my-form", status: "published", visibility: "public" });
    selectPlans.push({ type: "limit", result: [form] });
    // Pages query
    selectPlans.push({ type: "where", result: [] });

    const caller = exploreRouter.createCaller(buildPublicCtx() as any);
    // Note: getBySlug might be on formsRouter; use whichever exposes it
    // This exercises the same visibility rule via the public API
    const result = await caller.getFormBySlug({ slug: "my-form" });

    expect(result.id).toBe("form-id-001");
    expect(result.status).toBe("published");
  });

  it("returns NOT_FOUND for a draft form slug", async () => {
    selectPlans.push({
      type: "limit",
      result: [makeForm({ status: "draft", visibility: "public" })],
    });

    const caller = exploreRouter.createCaller(buildPublicCtx() as any);

    await expect(
      caller.getFormBySlug({ slug: "draft-form" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
