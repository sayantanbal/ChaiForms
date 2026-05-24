import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db, eq, and } from "@repo/database";
import {
  workspacesTable,
  workspaceMembersTable,
  usersTable,
} from "@repo/database/schema";
import { notificationService } from "@repo/services/notification";

import {
  protectedProcedure,
  router,
  workspaceAdminProcedure,
} from "../../trpc";
import { generatePath } from "../../utils/path-generator";

const TAGS = ["Workspaces"];
const getPath = generatePath("/workspaces");

const workspaceRoleSchema = z.enum(["admin", "creator", "viewer"]);

export const workspaceOutputSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  ownerId: z.string().uuid(),
  memberRole: workspaceRoleSchema,
  createdAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime().nullable(),
});

export const workspaceMemberOutputSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string(),
  role: workspaceRoleSchema,
  invitedAt: z.string().datetime().nullable(),
  acceptedAt: z.string().datetime().nullable(),
});

async function assertWorkspaceMember(
  workspaceId: string,
  userId: string,
): Promise<typeof workspaceMembersTable.$inferSelect | null> {
  const [workspace] = await db
    .select()
    .from(workspacesTable)
    .where(eq(workspacesTable.id, workspaceId))
    .limit(1);

  if (!workspace) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
  }

  if (workspace.ownerId === userId) {
    return {
      id: workspace.id,
      workspaceId: workspace.id,
      userId,
      role: "admin",
      invitedAt: workspace.createdAt,
      acceptedAt: workspace.createdAt,
    };
  }

  const [member] = await db
    .select()
    .from(workspaceMembersTable)
    .where(
      and(
        eq(workspaceMembersTable.workspaceId, workspaceId),
        eq(workspaceMembersTable.userId, userId),
      ),
    )
    .limit(1);

  if (!member) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are not a member of this workspace",
    });
  }

  return member;
}

function mapWorkspace(
  workspace: typeof workspacesTable.$inferSelect,
  memberRole: z.infer<typeof workspaceRoleSchema>,
) {
  return {
    id: workspace.id,
    name: workspace.name,
    description: workspace.description,
    ownerId: workspace.ownerId,
    memberRole,
    createdAt: workspace.createdAt ? workspace.createdAt.toISOString() : null,
    updatedAt: workspace.updatedAt ? workspace.updatedAt.toISOString() : null,
  };
}

export const workspacesRouter = router({
  create: protectedProcedure
    .meta({
      openapi: { method: "POST", path: getPath(""), tags: TAGS },
    })
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(2000).optional(),
      }),
    )
    .output(workspaceOutputSchema)
    .mutation(async ({ input, ctx }) => {
      const [workspace] = await db
        .insert(workspacesTable)
        .values({
          name: input.name,
          description: input.description ?? null,
          ownerId: ctx.user.id,
        })
        .returning();

      if (!workspace) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      await db.insert(workspaceMembersTable).values({
        workspaceId: workspace.id,
        userId: ctx.user.id,
        role: "admin",
        acceptedAt: new Date(),
      });

      return mapWorkspace(workspace, "admin");
    }),

  list: protectedProcedure
    .meta({
      openapi: { method: "GET", path: getPath(""), tags: TAGS },
    })
    .input(z.void().optional())
    .output(z.array(workspaceOutputSchema))
    .query(async ({ ctx }) => {
      const owned = await db
        .select()
        .from(workspacesTable)
        .where(eq(workspacesTable.ownerId, ctx.user.id));

      const memberships = await db
        .select({
          workspace: workspacesTable,
          role: workspaceMembersTable.role,
        })
        .from(workspaceMembersTable)
        .innerJoin(
          workspacesTable,
          eq(workspaceMembersTable.workspaceId, workspacesTable.id),
        )
        .where(eq(workspaceMembersTable.userId, ctx.user.id));

      const byId = new Map<string, z.infer<typeof workspaceOutputSchema>>();

      for (const workspace of owned) {
        byId.set(workspace.id, mapWorkspace(workspace, "admin"));
      }

      for (const row of memberships) {
        if (!byId.has(row.workspace.id)) {
          byId.set(row.workspace.id, mapWorkspace(row.workspace, row.role));
        }
      }

      return Array.from(byId.values());
    }),

  getById: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: getPath("/{workspaceId}"),
        tags: TAGS,
      },
    })
    .input(z.object({ workspaceId: z.string().uuid() }))
    .output(workspaceOutputSchema)
    .query(async ({ input, ctx }) => {
      const member = await assertWorkspaceMember(
        input.workspaceId,
        ctx.user.id,
      );
      const [workspace] = await db
        .select()
        .from(workspacesTable)
        .where(eq(workspacesTable.id, input.workspaceId))
        .limit(1);

      if (!workspace) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
      }

      const role =
        workspace.ownerId === ctx.user.id ? "admin" : member!.role;

      return mapWorkspace(workspace, role);
    }),

  addMember: workspaceAdminProcedure
    .meta({
      openapi: {
        method: "POST",
        path: getPath("/{workspaceId}/members"),
        tags: TAGS,
      },
    })
    .input(
      z.object({
        workspaceId: z.string().uuid(),
        email: z.string().email(),
        role: workspaceRoleSchema,
      }),
    )
    .output(workspaceMemberOutputSchema)
    .mutation(async ({ input, ctx }) => {
      const inviter = ctx.user;
      if (!inviter) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const [workspace] = await db
        .select()
        .from(workspacesTable)
        .where(eq(workspacesTable.id, input.workspaceId))
        .limit(1);

      if (!workspace) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
      }

      let [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, input.email))
        .limit(1);

      if (!user) {
        const [created] = await db
          .insert(usersTable)
          .values({
            email: input.email,
            fullName: input.email.split("@")[0] ?? input.email,
            role: "creator",
          })
          .returning();
        user = created!;
      }

      const [existingMember] = await db
        .select()
        .from(workspaceMembersTable)
        .where(
          and(
            eq(workspaceMembersTable.workspaceId, input.workspaceId),
            eq(workspaceMembersTable.userId, user.id),
          ),
        )
        .limit(1);

      let member = existingMember;
      if (existingMember) {
        const [updated] = await db
          .update(workspaceMembersTable)
          .set({ role: input.role })
          .where(eq(workspaceMembersTable.id, existingMember.id))
          .returning();
        member = updated!;
      } else {
        const [inserted] = await db
          .insert(workspaceMembersTable)
          .values({
            workspaceId: input.workspaceId,
            userId: user.id,
            role: input.role,
            acceptedAt: new Date(),
          })
          .returning();
        member = inserted!;
      }

      const webBaseUrl =
        process.env.WEB_ORIGIN ??
        process.env.NEXT_PUBLIC_WEB_BASE_URL ??
        "http://localhost:3000";

      notificationService.sendWorkspaceInviteEmail({
        inviteeEmail: user.email,
        workspaceName: workspace.name,
        inviterName: inviter.fullName,
        workspaceId: workspace.id,
        webBaseUrl,
      });

      return {
        id: member.id,
        workspaceId: member.workspaceId,
        userId: member.userId,
        email: user.email,
        fullName: user.fullName,
        role: member.role,
        invitedAt: member.invitedAt ? member.invitedAt.toISOString() : null,
        acceptedAt: member.acceptedAt
          ? member.acceptedAt.toISOString()
          : null,
      };
    }),

  removeMember: workspaceAdminProcedure
    .meta({
      openapi: {
        method: "DELETE",
        path: getPath("/{workspaceId}/members/{userId}"),
        tags: TAGS,
      },
    })
    .input(
      z.object({
        workspaceId: z.string().uuid(),
        userId: z.string().uuid(),
      }),
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input }) => {
      const [workspace] = await db
        .select()
        .from(workspacesTable)
        .where(eq(workspacesTable.id, input.workspaceId))
        .limit(1);

      if (!workspace) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
      }

      if (workspace.ownerId === input.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot remove the workspace owner",
        });
      }

      await db
        .delete(workspaceMembersTable)
        .where(
          and(
            eq(workspaceMembersTable.workspaceId, input.workspaceId),
            eq(workspaceMembersTable.userId, input.userId),
          ),
        );

      return { success: true };
    }),

  updateMemberRole: workspaceAdminProcedure
    .meta({
      openapi: {
        method: "PATCH",
        path: getPath("/{workspaceId}/members/{userId}"),
        tags: TAGS,
      },
    })
    .input(
      z.object({
        workspaceId: z.string().uuid(),
        userId: z.string().uuid(),
        role: workspaceRoleSchema,
      }),
    )
    .output(workspaceMemberOutputSchema)
    .mutation(async ({ input }) => {
      const [workspace] = await db
        .select()
        .from(workspacesTable)
        .where(eq(workspacesTable.id, input.workspaceId))
        .limit(1);

      if (!workspace) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
      }

      if (workspace.ownerId === input.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot change the workspace owner's role",
        });
      }

      const [updated] = await db
        .update(workspaceMembersTable)
        .set({ role: input.role })
        .where(
          and(
            eq(workspaceMembersTable.workspaceId, input.workspaceId),
            eq(workspaceMembersTable.userId, input.userId),
          ),
        )
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
      }

      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, input.userId))
        .limit(1);

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      return {
        id: updated.id,
        workspaceId: updated.workspaceId,
        userId: updated.userId,
        email: user.email,
        fullName: user.fullName,
        role: updated.role,
        invitedAt: updated.invitedAt ? updated.invitedAt.toISOString() : null,
        acceptedAt: updated.acceptedAt
          ? updated.acceptedAt.toISOString()
          : null,
      };
    }),

  listMembers: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: getPath("/{workspaceId}/members"),
        tags: TAGS,
      },
    })
    .input(z.object({ workspaceId: z.string().uuid() }))
    .output(z.array(workspaceMemberOutputSchema))
    .query(async ({ input, ctx }) => {
      await assertWorkspaceMember(input.workspaceId, ctx.user.id);

      const [workspace] = await db
        .select()
        .from(workspacesTable)
        .where(eq(workspacesTable.id, input.workspaceId))
        .limit(1);

      if (!workspace) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
      }

      const members = await db
        .select({
          member: workspaceMembersTable,
          user: usersTable,
        })
        .from(workspaceMembersTable)
        .innerJoin(usersTable, eq(workspaceMembersTable.userId, usersTable.id))
        .where(eq(workspaceMembersTable.workspaceId, input.workspaceId));

      const ownerInList = members.some((m) => m.user.id === workspace.ownerId);
      const results: z.infer<typeof workspaceMemberOutputSchema>[] = members.map(
        (row) => ({
          id: row.member.id,
          workspaceId: row.member.workspaceId,
          userId: row.member.userId,
          email: row.user.email,
          fullName: row.user.fullName,
          role: row.member.role,
          invitedAt: row.member.invitedAt
            ? row.member.invitedAt.toISOString()
            : null,
          acceptedAt: row.member.acceptedAt
            ? row.member.acceptedAt.toISOString()
            : null,
        }),
      );

      if (!ownerInList) {
        const [owner] = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.id, workspace.ownerId))
          .limit(1);

        if (owner) {
          results.unshift({
            id: workspace.id,
            workspaceId: workspace.id,
            userId: owner.id,
            email: owner.email,
            fullName: owner.fullName,
            role: "admin",
            invitedAt: workspace.createdAt
              ? workspace.createdAt.toISOString()
              : null,
            acceptedAt: workspace.createdAt
              ? workspace.createdAt.toISOString()
              : null,
          });
        }
      }

      return results;
    }),
});

export type WorkspacesRouter = typeof workspacesRouter;
