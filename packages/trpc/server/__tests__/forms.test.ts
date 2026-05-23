import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { formsRouter } from "../routes/forms/route";
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  createCsrfToken,
} from "../utils/csrf";
import { db } from "@repo/database";

const mockDb = db as unknown as {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

const baseUser = {
  id: "b4b44cc3-5f24-4cc8-86f8-e49a8680d02e",
  email: "creator@chaiforms.dev",
  fullName: "Creator",
  role: "creator" as const,
  profileImageUrl: null,
  emailVerified: true,
};

const baseForm = {
  id: "8c2e2c8d-827a-4d45-88f2-7c59cfbfa888",
  creatorId: baseUser.id,
  title: "Test Form",
  description: null as string | null,
  slug: "test-form",
  status: "draft" as const,
  visibility: "unlisted" as const,
  theme: "default" as const,
  fields: [],
  thankyouMessage: null as string | null,
  expiryDate: null as Date | null,
  responseLimit: null as number | null,
  accessPasswordHash: null as string | null,
  sendRespondentConfirmation: false,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: null as Date | null,
};

const envKeys = ["CSRF_SECRET", "JWT_SECRET", "WEB_ORIGIN"];
const originalEnv: Record<string, string | undefined> = {};

vi.mock("@repo/database", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  eq: vi.fn(),
  and: vi.fn(),
  count: vi.fn(),
  desc: vi.fn(),
  sql: vi.fn(),
}));

vi.mock("@repo/database/schema", () => ({
  formsTable: {
    id: "id",
    slug: "slug",
    creatorId: "creatorId",
    status: "status",
    visibility: "visibility",
    updatedAt: "updatedAt",
    createdAt: "createdAt",
  },
  pagesTable: {
    formId: "formId",
    order: "order",
  },
  templatesTable: {
    id: "id",
  },
}));

vi.mock("nanoid", () => ({
  nanoid: () => "FixedSlug123",
}));

function createContext(opts?: { method?: string; withCsrf?: boolean }) {
  const token = opts?.withCsrf ? createCsrfToken() : null;
  return {
    user: baseUser,
    req: {
      headers: token ? { [CSRF_HEADER_NAME]: token } : {},
      cookies: token ? { [CSRF_COOKIE_NAME]: token } : {},
      method: opts?.method ?? "GET",
    },
    res: {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    },
  };
}

let selectQueue: unknown[][] = [];
let insertedValues: Record<string, unknown> | null = null;

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
  selectQueue = [];
  insertedValues = null;
  mockDb.select.mockReset();
  mockDb.insert.mockReset();
  mockDb.update.mockReset();
  mockDb.delete.mockReset();

  mockDb.select.mockImplementation(() => ({
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    limit: vi
      .fn()
      .mockImplementation(() => Promise.resolve(selectQueue.shift() ?? [])),
  }));

  mockDb.insert.mockImplementation(() => {
    const chain = {
      values: vi.fn().mockImplementation((values: Record<string, unknown>) => {
        insertedValues = values;
        return chain;
      }),
      returning: vi.fn().mockImplementation(() => {
        const form = {
          ...baseForm,
          ...insertedValues,
        };
        return Promise.resolve([form]);
      }),
    };
    return chain;
  });
});

describe("forms router", () => {
  it("creates a draft unlisted form for the creator", async () => {
    selectQueue.push([]);

    const ctx = createContext({ method: "POST", withCsrf: true });
    const caller = formsRouter.createCaller(ctx);
    const result = await caller.create({ title: "My Form" });

    expect(result.creatorId).toBe(baseUser.id);
    expect(result.status).toBe("draft");
    expect(result.visibility).toBe("unlisted");
    expect(result.slug).toBe("fixedslug123");
  });

  it("blocks slug updates that conflict", async () => {
    selectQueue.push([baseForm], [{ id: "conflict" }]);

    const ctx = createContext({ method: "PATCH", withCsrf: true });
    const caller = formsRouter.createCaller(ctx);

    await expect(
      caller.update({ formId: baseForm.id, slug: "new-slug" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("rejects duplicate field IDs in fieldsUpsert", async () => {
    selectQueue.push([baseForm]);

    const ctx = createContext({ method: "PUT", withCsrf: true });
    const caller = formsRouter.createCaller(ctx);

    await expect(
      caller.fieldsUpsert({
        formId: baseForm.id,
        fields: [
          { id: "08e1e7d2-99d9-4f1d-a7b0-59420ee12d36", label: "Name", type: "short_text" },
          { id: "08e1e7d2-99d9-4f1d-a7b0-59420ee12d36", label: "Name", type: "short_text" },
        ],
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
