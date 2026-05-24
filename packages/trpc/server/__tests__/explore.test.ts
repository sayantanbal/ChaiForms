import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@repo/database", () => ({
  db: {
    select: vi.fn(),
  },
  eq: vi.fn(),
  and: vi.fn(),
  count: vi.fn(),
  desc: vi.fn(),
  isNull: vi.fn(),
}));

vi.mock("@repo/database/schema", () => ({
  formsTable: {
    status: "status",
    visibility: "visibility",
    createdAt: "createdAt",
  },
  templatesTable: {
    id: "id",
  },
}));

import { exploreRouter } from "../routes/explore/route";
import { db } from "@repo/database";

const mockDb = db as unknown as {
  select: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  mockDb.select.mockReset();
});

describe("explore router", () => {
  it("lists public forms with response counts", async () => {
    mockDb.select
      .mockImplementationOnce(() => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 1 }]),
      }))
      .mockImplementationOnce(() => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue([
          {
            id: "3b9d6bef-3932-4876-b6ab-1d9de62e9154",
            title: "Public Form",
            description: null,
            slug: "public-form",
            status: "published",
            visibility: "public",
            theme: "default",
            fields: [],
            thankyouMessage: null,
            expiryDate: null,
            responseLimit: null,
            accessPasswordHash: null,
            sendRespondentConfirmation: false,
            createdAt: new Date("2024-01-01T00:00:00.000Z"),
            updatedAt: null,
          },
        ]),
      }));

    const caller = exploreRouter.createCaller({
      user: null,
      req: { headers: {}, cookies: {} },
      res: { cookie: vi.fn(), clearCookie: vi.fn() },
    });

    const result = await caller.listPublicForms({ page: 1, pageSize: 12 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.responseCount).toBe(0);
    expect(result.total).toBe(1);
  });

  it("lists featured forms", async () => {
    mockDb.select.mockImplementationOnce(() => ({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        {
          id: "3b9d6bef-3932-4876-b6ab-1d9de62e9154",
          title: "Featured",
          description: null,
          slug: "featured",
          status: "published",
          visibility: "public",
          theme: "default",
          fields: [],
          thankyouMessage: null,
          expiryDate: null,
          responseLimit: null,
          accessPasswordHash: null,
          sendRespondentConfirmation: false,
          createdAt: new Date("2024-01-01T00:00:00.000Z"),
          updatedAt: null,
        },
      ]),
    }));

    const caller = exploreRouter.createCaller({
      user: null,
      req: { headers: {}, cookies: {} },
      res: { cookie: vi.fn(), clearCookie: vi.fn() },
    });

    const result = await caller.listFeaturedForms();
    expect(result[0]!.responseCount).toBe(0);
  });

  it("lists templates", async () => {
    mockDb.select.mockImplementationOnce(() => ({
      from: vi.fn().mockResolvedValue([
        {
          id: "928fcaf4-4e2b-4dc9-9800-ec8980b3dc53",
          title: "Template",
          description: "Desc",
          theme: "startup",
          fields: [],
          createdAt: new Date("2024-01-01T00:00:00.000Z"),
        },
      ]),
    }));

    const caller = exploreRouter.createCaller({
      user: null,
      req: { headers: {}, cookies: {} },
      res: { cookie: vi.fn(), clearCookie: vi.fn() },
    });

    const result = await caller.listTemplates();
    expect(result[0]!.title).toBe("Template");
  });
});
