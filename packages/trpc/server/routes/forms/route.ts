import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db, eq, and, count, desc } from "@repo/database";
import {
  formsTable,
  pagesTable,
  responsesTable,
  templatesTable,
} from "@repo/database/schema";
import {
  formSettingsSchema,
  fieldsUpsertSchema,
  type FieldSchemaUnion,
} from "@repo/schemas";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

import { publicProcedure, protectedProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import { zodUndefinedModel } from "../../schema";
import { signUnlockToken } from "../../utils/jwt";

const TAGS_FORMS = ["Forms"];
const TAGS_FIELDS = ["Forms", "Fields"];
const TAGS_SHARING = ["Forms", "Sharing"];
const TAGS_TEMPLATES = ["Forms", "Templates"];
const getPath = generatePath("/forms");

// ---------------------------------------------------------------------------
// Output schemas
// ---------------------------------------------------------------------------
export const formOutputSchema = z.object({
  id: z.string().uuid(),
  creatorId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  slug: z.string(),
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
  fields: z.array(z.any()),
  thankyouMessage: z.string().nullable(),
  expiryDate: z.string().datetime().nullable(),
  responseLimit: z.number().int().nullable(),
  hasPassword: z.boolean(),
  sendRespondentConfirmation: z.boolean(),
  createdAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime().nullable(),
});

export const publicFormOutputSchema = formOutputSchema.omit({
  creatorId: true,
});

const paginatedFormsSchema = z.object({
  items: z.array(formOutputSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

const paginatedPublicFormsSchema = z.object({
  items: z.array(publicFormOutputSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function mapForm(form: typeof formsTable.$inferSelect) {
  return {
    id: form.id,
    creatorId: form.creatorId,
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
    createdAt: form.createdAt ? form.createdAt.toISOString() : null,
    updatedAt: form.updatedAt ? form.updatedAt.toISOString() : null,
  };
}

function generateSlug(): string {
  return nanoid(12)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-");
}

async function assertOwnership(formId: string, userId: string) {
  const [form] = await db
    .select()
    .from(formsTable)
    .where(and(eq(formsTable.id, formId), eq(formsTable.creatorId, userId)))
    .limit(1);
  if (!form) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Form not found or you do not own it",
    });
  }
  return form;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
export const formsRouter = router({
  // -------------------------------------------------------------------------
  // forms.create
  // -------------------------------------------------------------------------
  create: protectedProcedure
    .meta({
      openapi: { method: "POST", path: getPath(""), tags: TAGS_FORMS },
    })
    .input(z.object({ title: z.string().min(1).max(255) }))
    .output(formOutputSchema)
    .mutation(async ({ input, ctx }) => {
      let slug = generateSlug();
      // Ensure uniqueness
      for (let i = 0; i < 5; i++) {
        const [existing] = await db
          .select({ id: formsTable.id })
          .from(formsTable)
          .where(eq(formsTable.slug, slug))
          .limit(1);
        if (!existing) break;
        slug = generateSlug();
      }

      const [form] = await db
        .insert(formsTable)
        .values({
          title: input.title,
          creatorId: ctx.user.id,
          slug,
          status: "draft",
          visibility: "unlisted",
          fields: [],
        })
        .returning();

      if (!form) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return mapForm(form);
    }),

  // -------------------------------------------------------------------------
  // forms.list
  // -------------------------------------------------------------------------
  list: protectedProcedure
    .meta({
      openapi: { method: "GET", path: getPath(""), tags: TAGS_FORMS },
    })
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      }),
    )
    .output(paginatedFormsSchema)
    .query(async ({ input, ctx }) => {
      const offset = (input.page - 1) * input.pageSize;

      const [totalResult, items] = await Promise.all([
        db
          .select({ count: count() })
          .from(formsTable)
          .where(eq(formsTable.creatorId, ctx.user.id)),
        db
          .select()
          .from(formsTable)
          .where(eq(formsTable.creatorId, ctx.user.id))
          .orderBy(desc(formsTable.updatedAt))
          .limit(input.pageSize)
          .offset(offset),
      ]);

      return {
        items: items.map(mapForm),
        total: Number(totalResult[0]?.count ?? 0),
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  // -------------------------------------------------------------------------
  // forms.getById
  // -------------------------------------------------------------------------
  getById: protectedProcedure
    .meta({
      openapi: { method: "GET", path: getPath("/{formId}"), tags: TAGS_FORMS },
    })
    .input(z.object({ formId: z.string().uuid() }))
    .output(formOutputSchema)
    .query(async ({ input, ctx }) => {
      const form = await assertOwnership(input.formId, ctx.user.id);
      return mapForm(form);
    }),

  // -------------------------------------------------------------------------
  // forms.getBySlug (public)
  // -------------------------------------------------------------------------
  getBySlug: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: getPath("/slug/{slug}"),
        tags: TAGS_SHARING,
      },
    })
    .input(z.object({ slug: z.string() }))
    .output(publicFormOutputSchema)
    .query(async ({ input }) => {
      const [form] = await db
        .select()
        .from(formsTable)
        .where(eq(formsTable.slug, input.slug))
        .limit(1);

      if (!form) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
      }

      const mapped = mapForm(form);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { creatorId: _creatorId, ...pub } = mapped;
      return pub;
    }),

  // -------------------------------------------------------------------------
  // forms.update
  // -------------------------------------------------------------------------
  update: protectedProcedure
    .meta({
      openapi: {
        method: "PATCH",
        path: getPath("/{formId}"),
        tags: TAGS_FORMS,
      },
    })
    .input(z.object({ formId: z.string().uuid() }).merge(formSettingsSchema))
    .output(formOutputSchema)
    .mutation(async ({ input, ctx }) => {
      const { formId, ...settings } = input;
      const existing = await assertOwnership(formId, ctx.user.id);

      // Slug uniqueness check
      if (settings.slug && settings.slug !== existing.slug) {
        const [conflict] = await db
          .select({ id: formsTable.id })
          .from(formsTable)
          .where(eq(formsTable.slug, settings.slug))
          .limit(1);
        if (conflict) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A form with this slug already exists",
          });
        }
      }

      // Hash password if provided
      let accessPasswordHash = existing.accessPasswordHash;
      if (settings.accessPassword === null) {
        accessPasswordHash = null;
      } else if (settings.accessPassword) {
        accessPasswordHash = await bcrypt.hash(settings.accessPassword, 10);
      }

      const updateData: Partial<typeof formsTable.$inferInsert> = {};
      if (settings.title !== undefined) updateData.title = settings.title;
      if (settings.description !== undefined)
        updateData.description = settings.description;
      if (settings.slug !== undefined) updateData.slug = settings.slug;
      if (settings.visibility !== undefined)
        updateData.visibility = settings.visibility;
      if (settings.theme !== undefined) updateData.theme = settings.theme;
      if (settings.thankyouMessage !== undefined)
        updateData.thankyouMessage = settings.thankyouMessage;
      if (settings.expiryDate !== undefined)
        updateData.expiryDate = settings.expiryDate
          ? new Date(settings.expiryDate)
          : null;
      if (settings.responseLimit !== undefined)
        updateData.responseLimit = settings.responseLimit;
      if (settings.sendRespondentConfirmation !== undefined)
        updateData.sendRespondentConfirmation =
          settings.sendRespondentConfirmation;
      if (settings.accessPassword !== undefined)
        updateData.accessPasswordHash = accessPasswordHash;

      const [updated] = await db
        .update(formsTable)
        .set(updateData)
        .where(eq(formsTable.id, formId))
        .returning();

      if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return mapForm(updated);
    }),

  // -------------------------------------------------------------------------
  // forms.publish
  // -------------------------------------------------------------------------
  publish: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: getPath("/{formId}/publish"),
        tags: TAGS_FORMS,
      },
    })
    .input(z.object({ formId: z.string().uuid() }))
    .output(formOutputSchema)
    .mutation(async ({ input, ctx }) => {
      await assertOwnership(input.formId, ctx.user.id);
      const [updated] = await db
        .update(formsTable)
        .set({ status: "published" })
        .where(eq(formsTable.id, input.formId))
        .returning();
      if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return mapForm(updated);
    }),

  // -------------------------------------------------------------------------
  // forms.unpublish
  // -------------------------------------------------------------------------
  unpublish: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: getPath("/{formId}/unpublish"),
        tags: TAGS_FORMS,
      },
    })
    .input(z.object({ formId: z.string().uuid() }))
    .output(formOutputSchema)
    .mutation(async ({ input, ctx }) => {
      await assertOwnership(input.formId, ctx.user.id);
      const [updated] = await db
        .update(formsTable)
        .set({ status: "draft" })
        .where(eq(formsTable.id, input.formId))
        .returning();
      if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return mapForm(updated);
    }),

  // -------------------------------------------------------------------------
  // forms.delete (soft delete → archived)
  // -------------------------------------------------------------------------
  delete: protectedProcedure
    .meta({
      openapi: {
        method: "DELETE",
        path: getPath("/{formId}"),
        tags: TAGS_FORMS,
      },
    })
    .input(z.object({ formId: z.string().uuid() }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      await assertOwnership(input.formId, ctx.user.id);
      await db
        .update(formsTable)
        .set({ status: "archived" })
        .where(eq(formsTable.id, input.formId));
      return { success: true };
    }),

  // -------------------------------------------------------------------------
  // forms.clone
  // -------------------------------------------------------------------------
  clone: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: getPath("/{formId}/clone"),
        tags: TAGS_FORMS,
      },
    })
    .input(z.object({ formId: z.string().uuid() }))
    .output(formOutputSchema)
    .mutation(async ({ input, ctx }) => {
      const original = await assertOwnership(input.formId, ctx.user.id);

      let slug = generateSlug();
      for (let i = 0; i < 5; i++) {
        const [existing] = await db
          .select({ id: formsTable.id })
          .from(formsTable)
          .where(eq(formsTable.slug, slug))
          .limit(1);
        if (!existing) break;
        slug = generateSlug();
      }

      const [cloned] = await db
        .insert(formsTable)
        .values({
          creatorId: ctx.user.id,
          title: `${original.title} (Copy)`,
          description: original.description,
          slug,
          status: "draft",
          visibility: "unlisted",
          theme: original.theme,
          fields: original.fields,
          thankyouMessage: original.thankyouMessage,
          sendRespondentConfirmation: original.sendRespondentConfirmation,
        })
        .returning();

      if (!cloned) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Clone pages
      const pages = await db
        .select()
        .from(pagesTable)
        .where(eq(pagesTable.formId, original.id))
        .orderBy(pagesTable.order);

      if (pages.length > 0) {
        await db.insert(pagesTable).values(
          pages.map((p) => ({
            formId: cloned.id,
            title: p.title,
            order: p.order,
            fieldIds: p.fieldIds,
          })),
        );
      }

      return mapForm(cloned);
    }),

  // -------------------------------------------------------------------------
  // forms.fieldsUpsert
  // -------------------------------------------------------------------------
  fieldsUpsert: protectedProcedure
    .meta({
      openapi: {
        method: "PUT",
        path: getPath("/{formId}/fields"),
        tags: TAGS_FIELDS,
      },
    })
    .input(fieldsUpsertSchema)
    .output(formOutputSchema)
    .mutation(async ({ input, ctx }) => {
      await assertOwnership(input.formId, ctx.user.id);

      // Validate unique field IDs
      const fieldIds = input.fields.map((f) => f.id);
      if (new Set(fieldIds).size !== fieldIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Field IDs must be unique within a form",
        });
      }

      // Validate conditionalRules reference earlier fields only
      for (let i = 0; i < input.fields.length; i++) {
        const field = input.fields[i]!;
        if (field.conditionalRules && field.conditionalRules.length > 0) {
          const earlierIds = new Set(fieldIds.slice(0, i));
          for (const rule of field.conditionalRules) {
            if (!earlierIds.has(rule.sourceFieldId)) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `ConditionalRule on field "${field.label}" references field ID "${rule.sourceFieldId}" which does not appear earlier in the form`,
              });
            }
          }
        }
      }

      // Update fields
      const [updated] = await db
        .update(formsTable)
        .set({ fields: input.fields as FieldSchemaUnion[] })
        .where(eq(formsTable.id, input.formId))
        .returning();

      if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Upsert pages
      if (input.pages !== undefined) {
        // Validate each fieldId in pages exists in the field list
        const fieldIdSet = new Set(fieldIds);
        for (const page of input.pages) {
          for (const fid of page.fieldIds) {
            if (!fieldIdSet.has(fid)) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Page "${page.title}" references unknown field ID "${fid}"`,
              });
            }
          }
        }

        // Delete existing pages and re-insert
        await db.delete(pagesTable).where(eq(pagesTable.formId, input.formId));
        if (input.pages.length > 0) {
          await db.insert(pagesTable).values(
            input.pages.map((p) => ({
              id: p.id,
              formId: input.formId,
              title: p.title,
              order: p.order,
              fieldIds: p.fieldIds,
            })),
          );
        }
      }

      return mapForm(updated);
    }),

  // -------------------------------------------------------------------------
  // forms.unlock (public — password-protected forms)
  // -------------------------------------------------------------------------
  unlock: publicProcedure
    .meta({
      openapi: {
        method: "POST",
        path: getPath("/slug/{slug}/unlock"),
        tags: TAGS_SHARING,
      },
    })
    .input(z.object({ slug: z.string(), password: z.string() }))
    .output(z.object({ unlockToken: z.string() }))
    .mutation(async ({ input }) => {
      const [form] = await db
        .select()
        .from(formsTable)
        .where(eq(formsTable.slug, input.slug))
        .limit(1);

      if (!form || !form.accessPasswordHash) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Form not found or is not password protected",
        });
      }

      const match = await bcrypt.compare(input.password, form.accessPasswordHash);
      if (!match) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Incorrect password",
        });
      }

      return { unlockToken: signUnlockToken(form.id) };
    }),

  // -------------------------------------------------------------------------
  // forms.createFromTemplate
  // -------------------------------------------------------------------------
  createFromTemplate: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/forms/from-template/{templateId}",
        tags: TAGS_TEMPLATES,
      },
    })
    .input(z.object({ templateId: z.string().uuid() }))
    .output(formOutputSchema)
    .mutation(async ({ input, ctx }) => {
      const [template] = await db
        .select()
        .from(templatesTable)
        .where(eq(templatesTable.id, input.templateId))
        .limit(1);

      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found",
        });
      }

      let slug = generateSlug();
      for (let i = 0; i < 5; i++) {
        const [existing] = await db
          .select({ id: formsTable.id })
          .from(formsTable)
          .where(eq(formsTable.slug, slug))
          .limit(1);
        if (!existing) break;
        slug = generateSlug();
      }

      const [form] = await db
        .insert(formsTable)
        .values({
          creatorId: ctx.user.id,
          title: template.title,
          description: template.description,
          slug,
          status: "draft",
          visibility: "unlisted",
          theme: template.theme,
          fields: template.fields as FieldSchemaUnion[],
        })
        .returning();

      if (!form) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return mapForm(form);
    }),

  // -------------------------------------------------------------------------
  // forms.getPages
  // -------------------------------------------------------------------------
  getPages: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: getPath("/{formId}/pages"),
        tags: TAGS_FORMS,
      },
    })
    .input(z.object({ formId: z.string().uuid() }))
    .output(
      z.array(
        z.object({
          id: z.string().uuid(),
          formId: z.string().uuid(),
          title: z.string(),
          order: z.number().int(),
          fieldIds: z.array(z.string().uuid()),
        }),
      ),
    )
    .query(async ({ input, ctx }) => {
      await assertOwnership(input.formId, ctx.user.id);
      const pages = await db
        .select()
        .from(pagesTable)
        .where(eq(pagesTable.formId, input.formId))
        .orderBy(pagesTable.order);
      return pages;
    }),
});

export type FormsRouter = typeof formsRouter;
