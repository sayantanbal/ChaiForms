import { z } from "zod";
import { FieldSchemaUnion } from "./fields/index.ts";

export const accessPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    "Password must contain uppercase, lowercase, and number",
  );

export const slugPattern = /^[a-z0-9-]{3,60}$/;

export const pageSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  order: z.number().int().min(0),
  fieldIds: z.array(z.string().min(1)),
});

export const formSettingsSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  slug: z.string().regex(slugPattern).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  visibility: z.enum(["public", "unlisted"]).optional(),
  theme: z
    .enum(["default", "anime", "movie", "game", "startup", "tech_company", "os", "event"])
    .optional(),
  customTheme: z
    .object({
      primaryColor: z.string().optional(),
      backgroundColor: z.string().optional(),
      textColor: z.string().optional(),
      fontFamily: z.string().optional(),
    })
    .nullable()
    .optional(),
  thankyouMessage: z.string().max(1000).optional(),
  expiryDate: z.iso.datetime().nullable().optional(),
  responseLimit: z.number().int().min(1).nullable().optional(),
  accessPassword: accessPasswordSchema.nullable().optional(),
  sendRespondentConfirmation: z.boolean().optional(),
  scope: z.enum(["global", "workspace"]).optional(),
  workspaceId: z.uuid().nullable().optional(),
  requiresAuth: z.boolean().optional(),
  pages: z.array(pageSchema).optional(),
});

export const fieldsUpsertSchema = z.object({
  formId: z.uuid(),
  fields: z.array(FieldSchemaUnion),
  pages: z.array(pageSchema).optional(),
});

export type PageSchema = z.infer<typeof pageSchema>;
export type FormSettingsSchema = z.infer<typeof formSettingsSchema>;
export type FieldsUpsertSchema = z.infer<typeof fieldsUpsertSchema>;
