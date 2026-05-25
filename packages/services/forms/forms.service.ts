import { formsRepository } from "@repo/database/repositories";
import { db, eq, and } from "@repo/database";
import { workspaceMembersTable, workspacesTable } from "@repo/database/schema";
import { generateSlug } from "../utils/slug";
import { sanitizeText } from "../utils/sanitize";
import bcrypt from "bcryptjs";
import type { SelectForm } from "@repo/database/models/form";

export class FormsService {
  async slugExists(slug: string): Promise<boolean> {
    const existing = await formsRepository.findBySlug(slug);
    return existing !== null;
  }

  async generateUniqueSlug(): Promise<string> {
    let slug = generateSlug();
    for (let i = 0; i < 5; i++) {
      if (!(await this.slugExists(slug))) {
        return slug;
      }
      slug = generateSlug();
    }
    return slug; // Fallback, though collision is unlikely
  }

  async createForm(data: { title: string; creatorId: string }): Promise<SelectForm> {
    const slug = await this.generateUniqueSlug();
    const form = await formsRepository.create({
      title: sanitizeText(data.title),
      creatorId: data.creatorId,
      slug,
      status: "draft",
      visibility: "unlisted",
      fields: [],
    });
    return form;
  }

  async updateForm(formId: string, existingForm: SelectForm, settings: any): Promise<SelectForm> {
    // Slug uniqueness check
    if (settings.slug && settings.slug !== existingForm.slug) {
      if (await this.slugExists(settings.slug)) {
        throw new Error("CONFLICT: A form with this slug already exists");
      }
    }

    // Hash password if provided
    let accessPasswordHash = existingForm.accessPasswordHash;
    if (settings.accessPassword === null) {
      accessPasswordHash = null;
    } else if (settings.accessPassword) {
      accessPasswordHash = await bcrypt.hash(settings.accessPassword, 10);
    }

    const updateData: any = {};
    if (settings.title !== undefined) updateData.title = sanitizeText(settings.title);
    if (settings.description !== undefined)
      updateData.description = settings.description
        ? sanitizeText(settings.description)
        : settings.description;
    if (settings.slug !== undefined) updateData.slug = settings.slug;
    if (settings.visibility !== undefined) updateData.visibility = settings.visibility;
    if (settings.theme !== undefined) updateData.theme = settings.theme;
    if (settings.thankyouMessage !== undefined)
      updateData.thankyouMessage = settings.thankyouMessage;
    if (settings.expiryDate !== undefined)
      updateData.expiryDate = settings.expiryDate ? new Date(settings.expiryDate) : null;
    if (settings.responseLimit !== undefined) updateData.responseLimit = settings.responseLimit;
    if (settings.sendRespondentConfirmation !== undefined)
      updateData.sendRespondentConfirmation = settings.sendRespondentConfirmation;
    if (settings.scope !== undefined) updateData.scope = settings.scope;
    if (settings.workspaceId !== undefined) updateData.workspaceId = settings.workspaceId;
    if (settings.requiresAuth !== undefined) updateData.requiresAuth = settings.requiresAuth;
    if (settings.accessPassword !== undefined) updateData.accessPasswordHash = accessPasswordHash;

    const updated = await formsRepository.update(formId, updateData);
    return updated;
  }

  async publishForm(
    formId: string,
    existingForm: SelectForm,
    userId: string,
    input: any,
  ): Promise<SelectForm> {
    const updateData: any = {
      status: "published",
    };

    if (input.scope !== undefined) {
      updateData.scope = input.scope;
      if (input.scope === "global") {
        updateData.workspaceId = null;
      }
    }

    if (input.workspaceId !== undefined) {
      updateData.workspaceId = input.workspaceId;
      if (input.workspaceId) {
        updateData.scope = "workspace";
      }
    }

    if (input.requiresAuth !== undefined) {
      updateData.requiresAuth = input.requiresAuth;
    }

    if (
      (updateData.scope ?? existingForm.scope) === "workspace" &&
      (updateData.workspaceId ?? existingForm.workspaceId)
    ) {
      const workspaceId = updateData.workspaceId ?? existingForm.workspaceId!;
      const [member] = await db
        .select({ id: workspaceMembersTable.id })
        .from(workspaceMembersTable)
        .where(
          and(
            eq(workspaceMembersTable.workspaceId, workspaceId),
            eq(workspaceMembersTable.userId, userId),
          ),
        )
        .limit(1);

      const [owned] = await db
        .select({ id: workspacesTable.id })
        .from(workspacesTable)
        .where(and(eq(workspacesTable.id, workspaceId), eq(workspacesTable.ownerId, userId)))
        .limit(1);

      if (!member && !owned) {
        throw new Error("FORBIDDEN: You are not a member of this workspace");
      }
    }

    const updated = await formsRepository.update(formId, updateData);
    return updated;
  }
}

export const formsService = new FormsService();
