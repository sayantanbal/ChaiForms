import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
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

vi.mock("@repo/database/schema", () => ({
  formsTable: {
    __table: "forms",
    id: "id",
    creatorId: "creatorId",
  },
  responsesTable: {
    __table: "responses",
    id: "id",
    formId: "formId",
    submittedAt: "submittedAt",
  },
  answersTable: {
    __table: "answers",
    responseId: "responseId",
    fieldId: "fieldId",
  },
}));

vi.mock("@repo/database", () => {
  const responses: Array<Record<string, unknown>> = [];
  const answers: Array<Record<string, unknown>> = [];
  let responseCounter = 0;

  let answerCounter = 0;

  const nextResponseId = () => {
    responseCounter += 1;
    const hex = responseCounter.toString(16).padStart(12, "0");
    return `00000000-0000-4000-8000-${hex}`;
  };

  const nextAnswerId = () => {
    answerCounter += 1;
    const hex = answerCounter.toString(16).padStart(12, "0");
    return `10000000-0000-4000-8000-${hex}`;
  };

  const resetStores = () => {
    responses.length = 0;
    answers.length = 0;
    responseCounter = 0;
    answerCounter = 0;
  };

  const select = vi.fn((selection?: { count?: { __count: true } }) => {
    const state: { table?: string; isCount?: boolean } = {
      isCount: selection?.count?.__count === true,
    };

    const chain = {
      from: vi.fn().mockImplementation((table: { __table?: string }) => {
        state.table = table.__table;
        return chain;
      }),
      where: vi.fn().mockImplementation(() => {
        if (state.table === "answers") {
          return Promise.resolve([...answers]);
        }
        if (state.isCount && state.table === "responses") {
          return Promise.resolve([{ count: responses.length }]);
        }
        return chain;
      }),
      limit: vi.fn().mockImplementation(() => {
        if (state.table === "forms") {
          return Promise.resolve([
            {
              id: "2f6d7fd7-14db-4b4d-a7ea-046e9f7689bb",
              creatorId: "owner",
              status: "published",
              expiryDate: null,
              responseLimit: null,
              accessPasswordHash: null,
              fields: [],
            },
          ]);
        }
        return chain;
      }),
      orderBy: vi.fn().mockReturnThis(),
      offset: vi.fn().mockImplementation(() => {
        if (state.table === "responses") {
          return Promise.resolve([...responses]);
        }
        return Promise.resolve([]);
      }),
    };

    return chain;
  });

  const insert = vi.fn((table: { __table?: string }) => {
    const tableName = table.__table;
    const chain = {
      values: vi.fn().mockImplementation((values: unknown) => {
        if (tableName === "responses") {
          const id = nextResponseId();
          responses.push({
            id,
            formId: "2f6d7fd7-14db-4b4d-a7ea-046e9f7689bb",
            startedAt: new Date("2024-01-01T00:00:00.000Z"),
            submittedAt: new Date("2024-01-01T00:01:00.000Z"),
            respondentEmail: null,
          });
          return chain;
        }
        if (tableName === "answers" && Array.isArray(values)) {
          for (const value of values) {
            answers.push({
              id: nextAnswerId(),
              responseId: responses[responses.length - 1]?.id,
              ...(value as Record<string, unknown>),
            });
          }
          return Promise.resolve(undefined);
        }
        return Promise.resolve(undefined);
      }),
      returning: vi.fn().mockImplementation(() => {
        const last = responses[responses.length - 1];
        return Promise.resolve([{ id: last?.id ?? nextResponseId() }]);
      }),
    };
    return chain;
  });

  const count = vi.fn(() => ({ __count: true }));

  return {
    db: { select, insert },
    eq: vi.fn(),
    and: vi.fn(),
    count,
    desc: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    __resetStores: resetStores,
  };
});

import { db } from "@repo/database";
import { responsesRouter } from "../routes/responses/route";
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  createCsrfToken,
} from "../utils/csrf";

const envKeys = ["CSRF_SECRET", "JWT_SECRET"];
const originalEnv: Record<string, string | undefined> = {};

function createSubmitContext() {
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

function createListContext() {
  return {
    user: { id: "owner", role: "creator" as const },
    req: { headers: {}, cookies: {} },
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

beforeEach(() => {
  (
    db as unknown as { __resetStores?: () => void }
  ).__resetStores?.();
});

describe("responses submit/list roundtrip", () => {
  // Feature: form-builder-saas, Property 12: Response submission round-trip
  it("returns the submitted answers in responses.list", async () => {
    const dataArb = fc
      .uniqueArray(fc.uuid(), { minLength: 1, maxLength: 4 })
      .chain((fieldIds) =>
        fc
          .array(fc.string({ minLength: 1, maxLength: 8 }), {
            minLength: fieldIds.length,
            maxLength: fieldIds.length,
          })
          .map((values) => ({ fieldIds, values })),
      );

    await fc.assert(
      fc.asyncProperty(dataArb, async ({ fieldIds, values }) => {
        (
          db as unknown as { __resetStores?: () => void }
        ).__resetStores?.();

        const answers = fieldIds.map((id, index) => ({
          fieldId: id,
          value: values[index] ?? "",
        }));

        const submitCaller = responsesRouter.createCaller(createSubmitContext());
        await submitCaller.submit({
          formId: "2f6d7fd7-14db-4b4d-a7ea-046e9f7689bb",
          startedAt: new Date().toISOString(),
          answers,
        });

        const listCaller = responsesRouter.createCaller(createListContext());
        const result = await listCaller.list({
          formId: "2f6d7fd7-14db-4b4d-a7ea-046e9f7689bb",
          page: 1,
          pageSize: 20,
        });

        const returned = result.items.at(-1)?.answers ?? [];
        expect(returned).toHaveLength(answers.length);
        for (const answer of answers) {
          expect(returned).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                fieldId: answer.fieldId,
                value: answer.value,
              }),
            ]),
          );
        }
      }),
      { numRuns: 100 },
    );
  });
});
