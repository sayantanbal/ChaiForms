import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@repo/database", () => ({
  db: {
    select: vi.fn(),
  },
  eq: vi.fn(),
  count: vi.fn(),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

vi.mock("@repo/database/schema", () => ({
  usersTable: {
    id: "id",
    email: "email",
    createdAt: "createdAt",
  },
  formsTable: {
    id: "id",
    creatorId: "creatorId",
    status: "status",
    createdAt: "createdAt",
    visibility: "visibility",
    theme: "theme",
    title: "title",
  },
  responsesTable: {
    formId: "formId",
  },
}));

import { adminRouter } from "../routes/admin/route";
import { db } from "@repo/database";

const mockDb = db as unknown as {
  select: ReturnType<typeof vi.fn>;
};

const adminContext = {
  user: { id: "admin", role: "admin" as const },
  req: { headers: {}, cookies: {} },
  res: { cookie: vi.fn(), clearCookie: vi.fn() },
};

const creatorContext = {
  user: { id: "creator", role: "creator" as const },
  req: { headers: {}, cookies: {} },
  res: { cookie: vi.fn(), clearCookie: vi.fn() },
};

beforeEach(() => {
  mockDb.select.mockReset();
});

describe("admin router", () => {
  it("rejects non-admin users", async () => {
    const caller = adminRouter.createCaller(creatorContext);
    await expect(caller.getStats()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns platform stats", async () => {
    mockDb.select
      .mockImplementationOnce(() => ({
        from: vi.fn().mockResolvedValue([{ count: 2 }]),
      }))
      .mockImplementationOnce(() => ({
        from: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockResolvedValue([
          { status: "draft", cnt: 1 },
          { status: "published", cnt: 2 },
        ]),
      }))
      .mockImplementationOnce(() => ({
        from: vi.fn().mockResolvedValue([{ count: 5 }]),
      }));

    const caller = adminRouter.createCaller(adminContext);
    const result = await caller.getStats();

    expect(result.userCount).toBe(2);
    expect(result.formCountByStatus.published).toBe(2);
    expect(result.totalResponses).toBe(5);
  });

  it("lists forms with response counts", async () => {
    mockDb.select
      .mockImplementationOnce(() => ({
        from: vi.fn().mockResolvedValue([{ count: 1 }]),
      }))
      .mockImplementationOnce(() => ({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue([
          {
            id: "c0dd8d10-388f-4dcb-92c2-8419db1ca347",
            title: "Form",
            ownerEmail: "creator@chaiforms.dev",
            status: "published",
            visibility: "public",
            theme: "default",
            createdAt: new Date("2024-01-01T00:00:00.000Z"),
          },
        ]),
      }))
      .mockImplementationOnce(() => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockResolvedValue([
          { formId: "c0dd8d10-388f-4dcb-92c2-8419db1ca347", cnt: 3 },
        ]),
      }));

    const caller = adminRouter.createCaller(adminContext);
    const result = await caller.listForms({ page: 1, pageSize: 20 });

    expect(result.items[0]!.responseCount).toBe(3);
    expect(result.total).toBe(1);
  });

  it("lists users with form counts", async () => {
    mockDb.select
      .mockImplementationOnce(() => ({
        from: vi.fn().mockResolvedValue([{ count: 1 }]),
      }))
      .mockImplementationOnce(() => ({
        from: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue([
          {
            id: "080f55cf-5095-460b-8dce-09d5dd2bd5ea",
            email: "creator@chaiforms.dev",
            fullName: "Creator",
            role: "creator",
            isBlocked: false,
            createdAt: new Date("2024-01-01T00:00:00.000Z"),
          },
        ]),
      }))
      .mockImplementationOnce(() => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockResolvedValue([
          { creatorId: "080f55cf-5095-460b-8dce-09d5dd2bd5ea", cnt: 4 },
        ]),
      }));

    const caller = adminRouter.createCaller(adminContext);
    const result = await caller.listUsers({ page: 1, pageSize: 20 });

    expect(result.items[0]!.formCount).toBe(4);
  });
});
