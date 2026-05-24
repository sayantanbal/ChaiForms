import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import * as fc from "fast-check";

vi.mock("../utils/submit-rate-limit", () => ({
  assertSubmitRateLimit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../utils/client-context", () => ({
  parseClientContext: vi.fn(() => ({
    ipAddress: "127.0.0.1",
    userAgent: "test",
    deviceFingerprint: "device",
    deviceType: "desktop",
    osName: null,
    osVersion: null,
    browserName: null,
    browserVersion: null,
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

vi.mock("../utils/jwt", () => ({
  verifyUnlockToken: vi.fn(() => true),
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
}));

vi.mock("@repo/database/schema", () => ({
  formsTable: {
    id: "id",
    deletedAt: "deletedAt",
  },
  responsesTable: {
    id: "id",
    formId: "formId",
    submittedAt: "submittedAt",
  },
  answersTable: {
    responseId: "responseId",
  },
}));

import { responsesRouter } from "../routes/responses/route";
import { db } from "@repo/database";
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  createCsrfToken,
} from "../utils/csrf";

const mockDb = db as unknown as {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
};

const envKeys = ["CSRF_SECRET", "JWT_SECRET"];
const originalEnv: Record<string, string | undefined> = {};

function createContext() {
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

describe("responses.submit number range", () => {
  // Feature: form-builder-saas, Property 11: Number range constraint enforcement
  it("rejects values outside min/max bounds", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 12, max: 20 }),
        fc.boolean(),
        async (min, max, useBelowMin) => {
          fc.pre(max > min);
          const value = useBelowMin ? min - 1 : max + 1;
          const fieldId = "f37290c5-772d-45f9-a8b0-834e5b1fdb5d";

          const form = {
            id: "0f9ce9b9-5086-46d6-a0c3-916de8d0e5ae",
            status: "published",
            expiryDate: null,
            responseLimit: null,
            accessPasswordHash: null,
            fields: [
              {
                id: fieldId,
                type: "number",
                label: "Score",
                min,
                max,
              },
            ],
          };

          mockDb.select.mockImplementation(() => ({
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue([form]),
          }));

          const ctx = createContext();
          const caller = responsesRouter.createCaller(ctx);

          await expect(
            caller.submit({
              formId: form.id,
              startedAt: new Date().toISOString(),
              answers: [{ fieldId, value: String(value) }],
            }),
          ).rejects.toMatchObject({ code: "BAD_REQUEST" });
        },
      ),
      { numRuns: 100 },
    );
  });
});
