import { z } from "zod";
import { db, eq, count, sql } from "@repo/database";
import { usersTable, formsTable, responsesTable } from "@repo/database/schema";
import type { FieldSchemaUnion } from "@repo/schemas";

import { adminProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import { zodUndefinedModel } from "../../schema";

const TAGS = ["Admin"];
const getPath = generatePath("/admin");

const platformStatsSchema = z.object({
  userCount: z.number().int(),
  formCountByStatus: z.object({
    draft: z.number().int(),
    published: z.number().int(),
    archived: z.number().int(),
  }),
  totalResponses: z.number().int(),
});

const adminFormSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  ownerEmail: z.string().email(),
  status: z.enum(["draft", "published", "archived"]),
  visibility: z.enum(["public", "unlisted"]),
  theme: z.enum([
    "default",
    "anime",
    "movie",
    "game",
    "startup",
    "tech_company",
    "os",
    "event",
  ]),
  responseCount: z.number().int(),
  createdAt: z.string().datetime().nullable(),
});

const adminUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string(),
  role: z.enum(["creator", "admin"]),
  formCount: z.number().int(),
  createdAt: z.string().datetime().nullable(),
});

const paginatedAdminFormsSchema = z.object({
  items: z.array(adminFormSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

const paginatedAdminUsersSchema = z.object({
  items: z.array(adminUserSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

export const adminRouter = router({
  // -------------------------------------------------------------------------
  // admin.getStats
  // -------------------------------------------------------------------------
  getStats: adminProcedure
    .meta({
      openapi: { method: "GET", path: getPath("/stats"), tags: TAGS },
    })
    .input(zodUndefinedModel)
    .output(platformStatsSchema)
    .query(async () => {
      const [userCount, formsByStatus, responseCount] = await Promise.all([
        db.select({ count: count() }).from(usersTable),
        db
          .select({ status: formsTable.status, cnt: count() })
          .from(formsTable)
          .groupBy(formsTable.status),
        db.select({ count: count() }).from(responsesTable),
      ]);

      const statusMap = { draft: 0, published: 0, archived: 0 };
      for (const row of formsByStatus) {
        statusMap[row.status] = Number(row.cnt);
      }

      return {
        userCount: Number(userCount[0]?.count ?? 0),
        formCountByStatus: statusMap,
        totalResponses: Number(responseCount[0]?.count ?? 0),
      };
    }),

  // -------------------------------------------------------------------------
  // admin.listForms
  // -------------------------------------------------------------------------
  listForms: adminProcedure
    .meta({
      openapi: { method: "GET", path: getPath("/forms"), tags: TAGS },
    })
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      }),
    )
    .output(paginatedAdminFormsSchema)
    .query(async ({ input }) => {
      const offset = (input.page - 1) * input.pageSize;

      const [totalResult, items] = await Promise.all([
        db.select({ count: count() }).from(formsTable),
        db
          .select({
            id: formsTable.id,
            title: formsTable.title,
            ownerEmail: usersTable.email,
            status: formsTable.status,
            visibility: formsTable.visibility,
            theme: formsTable.theme,
            createdAt: formsTable.createdAt,
          })
          .from(formsTable)
          .innerJoin(usersTable, eq(formsTable.creatorId, usersTable.id))
          .orderBy(formsTable.createdAt)
          .limit(input.pageSize)
          .offset(offset),
      ]);

      // Get response counts for these forms
      const formIds = items.map((f) => f.id);
      const responseCounts =
        formIds.length > 0
          ? await db
              .select({
                formId: responsesTable.formId,
                cnt: count(),
              })
              .from(responsesTable)
              .where(
                sql`${responsesTable.formId} = ANY(${sql.raw(`ARRAY['${formIds.join("','")}']::uuid[]`)})`,
              )
              .groupBy(responsesTable.formId)
          : [];

      const countMap = new Map(responseCounts.map((r) => [r.formId, Number(r.cnt)]));

      return {
        items: items.map((form) => ({
          ...form,
          responseCount: countMap.get(form.id) ?? 0,
          createdAt: form.createdAt ? form.createdAt.toISOString() : null,
        })),
        total: Number(totalResult[0]?.count ?? 0),
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  // -------------------------------------------------------------------------
  // admin.listUsers
  // -------------------------------------------------------------------------
  listUsers: adminProcedure
    .meta({
      openapi: { method: "GET", path: getPath("/users"), tags: TAGS },
    })
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      }),
    )
    .output(paginatedAdminUsersSchema)
    .query(async ({ input }) => {
      const offset = (input.page - 1) * input.pageSize;

      const [totalResult, items] = await Promise.all([
        db.select({ count: count() }).from(usersTable),
        db
          .select({
            id: usersTable.id,
            email: usersTable.email,
            fullName: usersTable.fullName,
            role: usersTable.role,
            createdAt: usersTable.createdAt,
          })
          .from(usersTable)
          .orderBy(usersTable.createdAt)
          .limit(input.pageSize)
          .offset(offset),
      ]);

      // Get form counts per user
      const userIds = items.map((u) => u.id);
      const formCounts =
        userIds.length > 0
          ? await db
              .select({
                creatorId: formsTable.creatorId,
                cnt: count(),
              })
              .from(formsTable)
              .where(
                sql`${formsTable.creatorId} = ANY(${sql.raw(`ARRAY['${userIds.join("','")}']::uuid[]`)})`,
              )
              .groupBy(formsTable.creatorId)
          : [];

      const formCountMap = new Map(formCounts.map((r) => [r.creatorId, Number(r.cnt)]));

      return {
        items: items.map((user) => ({
          ...user,
          formCount: formCountMap.get(user.id) ?? 0,
          createdAt: user.createdAt ? user.createdAt.toISOString() : null,
        })),
        total: Number(totalResult[0]?.count ?? 0),
        page: input.page,
        pageSize: input.pageSize,
      };
    }),
});

export type AdminRouter = typeof adminRouter;
