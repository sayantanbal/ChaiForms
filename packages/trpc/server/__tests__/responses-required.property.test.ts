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

vi.mock("../utils/analytics-broadcast", () => ({
  broadcastDelta: vi.fn(),
}));

vi.mock("@repo/database", () => ({
  isNull: vi.fn(),
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
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, createCsrfToken } from "../utils/csrf";

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

describe("responses.submit required fields", () => {
  // Feature: form-builder-saas, Property 8: Required field enforcement on submission
  it("rejects when required fields are missing", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uniqueArray(fc.uuid(), { minLength: 1, maxLength: 5 }),
        async (fieldIds) => {
          const fields = fieldIds.map((id, index) => ({
            id,
            type: "short_text",
            label: `Field ${index + 1}`,
            required: true,
          }));

          const form = {
            id: "4c2f2b9c-e840-4fbb-8cd1-9e8ef4e54a3f",
            status: "published",
            expiryDate: null,
            responseLimit: null,
            accessPasswordHash: null,
            fields,
          };

          mockDb.select.mockImplementation(() => ({
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue([form]),
          }));

          const ctx = createContext();
          const caller = responsesRouter.createCaller(ctx);

          let error: unknown;
          try {
            await caller.submit({
              formId: form.id,
              startedAt: new Date().toISOString(),
              answers: [],
            });
          } catch (err) {
            error = err;
          }

          const fieldErrors = (error as { cause?: { fieldErrors?: Record<string, string> } })?.cause
            ?.fieldErrors;

          expect(fieldErrors).toBeTruthy();
          if (fieldErrors) {
            for (const id of fieldIds) {
              expect(fieldErrors[id]).toBeTruthy();
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
