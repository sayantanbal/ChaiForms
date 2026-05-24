"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { trpc } from "~/trpc/client";
import { toast } from "sonner";

export default function WorkspaceDetailPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "creator" | "viewer">("creator");

  const { data: workspace } = trpc.workspaces.getById.useQuery({ workspaceId });
  const { data: members = [], refetch } = trpc.workspaces.listMembers.useQuery({
    workspaceId,
  });

  const isAdmin = workspace?.memberRole === "admin";

  const addMemberMutation = trpc.workspaces.addMember.useMutation({
    onSuccess: () => {
      toast.success("Member invited");
      setEmail("");
      void refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const removeMemberMutation = trpc.workspaces.removeMember.useMutation({
    onSuccess: () => {
      toast.success("Member removed");
      void refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateRoleMutation = trpc.workspaces.updateMemberRole.useMutation({
    onSuccess: () => {
      toast.success("Role updated");
      void refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/dashboard/workspaces"
          className="text-sm text-gray-500 hover:text-white"
        >
          ← Workspaces
        </Link>
        <h1 className="text-2xl font-bold mt-2">{workspace?.name ?? "..."}</h1>
        {workspace?.description && (
          <p className="text-gray-400 text-sm mt-1">{workspace.description}</p>
        )}
      </div>

      {isAdmin && (
        <form
          className="flex flex-wrap gap-2 mb-8 p-4 bg-gray-800/50 border border-white/10 rounded-xl"
          onSubmit={(e) => {
            e.preventDefault();
            if (!email.trim()) return;
            addMemberMutation.mutate({
              workspaceId,
              email: email.trim(),
              role,
            });
          }}
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="member@example.com"
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-gray-900 border border-white/10 text-sm"
          />
          <select
            value={role}
            onChange={(e) =>
              setRole(e.target.value as "admin" | "creator" | "viewer")
            }
            className="px-3 py-2 rounded-lg bg-gray-900 border border-white/10 text-sm"
          >
            <option value="creator">Creator</option>
            <option value="viewer">Viewer</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            disabled={addMemberMutation.isPending}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            Add member
          </button>
        </form>
      )}

      <h2 className="font-semibold mb-3">Members</h2>
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 text-gray-400 bg-gray-900/50">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              {isAdmin && <th className="px-4 py-3 font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.userId} className="border-b border-white/5">
                <td className="px-4 py-3">{member.fullName}</td>
                <td className="px-4 py-3 text-gray-400">{member.email}</td>
                <td className="px-4 py-3 capitalize">
                  {isAdmin && member.role !== "admin" ? (
                    <select
                      value={member.role}
                      onChange={(e) =>
                        updateRoleMutation.mutate({
                          workspaceId,
                          userId: member.userId,
                          role: e.target.value as "admin" | "creator" | "viewer",
                        })
                      }
                      className="bg-gray-800 border border-white/10 rounded px-2 py-1 text-xs"
                    >
                      <option value="creator">Creator</option>
                      <option value="viewer">Viewer</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    member.role
                  )}
                </td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    {member.role !== "admin" && (
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${member.email}?`)) {
                            removeMemberMutation.mutate({
                              workspaceId,
                              userId: member.userId,
                            });
                          }
                        }}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
