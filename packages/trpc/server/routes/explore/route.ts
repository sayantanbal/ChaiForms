import { z } from "zod";
import { db, eq, and, count, desc, isNull } from "@repo/database";
import { formsTable, templatesTable } from "@repo/database/schema";
import type { FieldSchemaUnion } from "@repo/schemas";

import { publicProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import { zodUndefinedModel } from "../../schema";
import { formOutputSchema } from "../forms/route";

const TAGS_EXPLORE = ["Explore"];
const TAGS_TEMPLATES = ["Explore", "Templates"];
const getPath = generatePath("/explore");

const publicFormCardSchema = formOutputSchema
  .omit({ creatorId: true, deletedAt: true })
  .extend({ responseCount: z.number().int() });

const paginatedPublicFormsSchema = z.object({
  items: z.array(publicFormCardSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

const templateOutputSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
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
  fields: z.array(z.any()),
  createdAt: z.string().datetime().nullable(),
});

export { publicFormCardSchema, templateOutputSchema, paginatedPublicFormsSchema };

export const exploreRouter = router({
  // -------------------------------------------------------------------------
  // explore.listPublicForms
  // -------------------------------------------------------------------------
  listPublicForms: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: getPath("/forms"),
        tags: TAGS_EXPLORE,
      },
    })
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(50).default(12),
      }),
    )
    .output(paginatedPublicFormsSchema)
    .query(async ({ input }) => {
      const offset = (input.page - 1) * input.pageSize;

      const [totalResult, items] = await Promise.all([
        db
          .select({ count: count() })
          .from(formsTable)
          .where(
            and(
              eq(formsTable.status, "published"),
              eq(formsTable.visibility, "public"),
              isNull(formsTable.deletedAt),
            ),
          ),
        db
          .select()
          .from(formsTable)
          .where(
            and(
              eq(formsTable.status, "published"),
              eq(formsTable.visibility, "public"),
              isNull(formsTable.deletedAt),
            ),
          )
          .orderBy(desc(formsTable.createdAt))
          .limit(input.pageSize)
          .offset(offset),
      ]);

      return {
        items: items.map((form) => ({
          id: form.id,
          title: form.title,
          description: form.description,
          slug: form.slug,
          status: form.status,
          visibility: form.visibility,
          theme: form.theme,
          fields: (form.fields as FieldSchemaUnion[]) ?? [],
          thankyouMessage: form.thankyouMessage,
          expiryDate: form.expiryDate ? form.expiryDate.toISOString() : null,
          responseLimit: form.responseLimit,
          hasPassword: !!form.accessPasswordHash,
          sendRespondentConfirmation: form.sendRespondentConfirmation,
          scope: form.scope ?? "global",
          workspaceId: form.workspaceId ?? null,
          requiresAuth: form.requiresAuth ?? false,
          createdAt: form.createdAt ? form.createdAt.toISOString() : null,
          updatedAt: form.updatedAt ? form.updatedAt.toISOString() : null,
          responseCount: 0, // Will be enhanced with join later
        })),
        total: Number(totalResult[0]?.count ?? 0),
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  // -------------------------------------------------------------------------
  // explore.listFeaturedForms
  // -------------------------------------------------------------------------
  listFeaturedForms: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: getPath("/featured"),
        tags: TAGS_EXPLORE,
      },
    })
    .input(zodUndefinedModel)
    .output(z.array(publicFormCardSchema))
    .query(async () => {
      // Get public published forms ordered by response count (subquery)
      const forms = await db
        .select()
        .from(formsTable)
        .where(
          and(
            eq(formsTable.status, "published"),
            eq(formsTable.visibility, "public"),
            isNull(formsTable.deletedAt),
          ),
        )
        .orderBy(desc(formsTable.createdAt))
        .limit(6);

      return forms.map((form) => ({
        id: form.id,
        title: form.title,
        description: form.description,
        slug: form.slug,
        status: form.status,
        visibility: form.visibility,
        theme: form.theme,
        fields: (form.fields as FieldSchemaUnion[]) ?? [],
        thankyouMessage: form.thankyouMessage,
        expiryDate: form.expiryDate ? form.expiryDate.toISOString() : null,
        responseLimit: form.responseLimit,
        hasPassword: !!form.accessPasswordHash,
        sendRespondentConfirmation: form.sendRespondentConfirmation,
        scope: form.scope ?? "global",
        workspaceId: form.workspaceId ?? null,
        requiresAuth: form.requiresAuth ?? false,
        createdAt: form.createdAt ? form.createdAt.toISOString() : null,
        updatedAt: form.updatedAt ? form.updatedAt.toISOString() : null,
        responseCount: 0,
      }));
    }),

  // -------------------------------------------------------------------------
  // explore.listTemplates
  // -------------------------------------------------------------------------
  listTemplates: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: getPath("/templates"),
        tags: TAGS_TEMPLATES,
      },
    })
    .input(zodUndefinedModel)
    .output(z.array(templateOutputSchema))
    .query(async () => {
      const templates = await db.select().from(templatesTable);
      return templates.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        theme: t.theme,
        fields: (t.fields as FieldSchemaUnion[]) ?? [],
        createdAt: t.createdAt ? t.createdAt.toISOString() : null,
      }));
    }),

  // -------------------------------------------------------------------------
  // explore.getTemplateById
  // -------------------------------------------------------------------------
  getTemplateById: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: getPath("/templates/{id}"),
        tags: TAGS_TEMPLATES,
      },
    })
    .input(z.object({ id: z.string().uuid() }))
    .output(templateOutputSchema)
    .query(async ({ input }) => {
      const [template] = await db
        .select()
        .from(templatesTable)
        .where(eq(templatesTable.id, input.id))
        .limit(1);

      if (!template) {
        throw new Error("Template not found");
      }

      return {
        id: template.id,
        title: template.title,
        description: template.description,
        theme: template.theme,
        fields: (template.fields as FieldSchemaUnion[]) ?? [],
        createdAt: template.createdAt ? template.createdAt.toISOString() : null,
      };
    }),
});

export type ExploreRouter = typeof exploreRouter;
