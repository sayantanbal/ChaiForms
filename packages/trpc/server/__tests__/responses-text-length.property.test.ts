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
}));

vi.mock("@repo/database/schema", () => ({
  formsTable: {
    id: "id",
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

describe("responses.submit text length", () => {
  // Feature: form-builder-saas, Property 9: Text length constraint enforcement
  it("rejects text values outside min/max bounds", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 6, max: 12 }),
        fc.boolean(),
        async (minLength, maxLength, useBelowMin) => {
          fc.pre(maxLength > minLength);
          const fieldId = "f4c53db7-4e9f-4a48-bc55-2a1ec2c1d6f4";
          const length = useBelowMin ? minLength - 1 : maxLength + 1;
          fc.pre(length >= 0);
          const value = "a".repeat(length);

          const form = {
            id: "2f6d7fd7-14db-4b4d-a7ea-046e9f7689bb",
            status: "published",
            expiryDate: null,
            responseLimit: null,
            accessPasswordHash: null,
            fields: [
              {
                id: fieldId,
                type: "short_text",
                label: "Short",
                required: true,
                minLength,
                maxLength,
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
              answers: [{ fieldId, value }],
            }),
          ).rejects.toMatchObject({ code: "BAD_REQUEST" });
        },
      ),
      { numRuns: 100 },
    );
  });
});
