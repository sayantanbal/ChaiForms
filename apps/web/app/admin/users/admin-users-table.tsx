"use client";

import { trpc } from "~/trpc/client";
import { toast } from "sonner";

export function AdminUsersTable() {
  const { data, isLoading, refetch } = trpc.admin.listUsers.useQuery({
    page: 1,
    pageSize: 50,
  });

  const blockMutation = trpc.admin.blockUser.useMutation({
    onSuccess: () => {
      toast.success("User blocked");
      void refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const unblockMutation = trpc.admin.unblockUser.useMutation({
    onSuccess: () => {
      toast.success("User unblocked");
      void refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="h-48 bg-gray-800/50 rounded-xl animate-pulse" />;
  }

  const users = data?.items ?? [];

  return (
    <div className="rounded-xl border border-white/10 bg-gray-900">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-white/10 text-gray-400">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">Forms</th>
            <th className="px-4 py-3 font-medium">Blocked</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b border-white/5">
              <td className="px-4 py-3">{user.fullName}</td>
              <td className="px-4 py-3 text-gray-400">{user.email}</td>
              <td className="px-4 py-3 capitalize">{user.role}</td>
              <td className="px-4 py-3">{user.formCount}</td>
              <td className="px-4 py-3">
                {user.isBlocked ? (
                  <span className="text-red-400">Yes</span>
                ) : (
                  <span className="text-gray-500">No</span>
                )}
              </td>
              <td className="px-4 py-3">
                {user.isBlocked ? (
                  <button
                    onClick={() => unblockMutation.mutate({ userId: user.id })}
                    disabled={unblockMutation.isPending}
                    className="text-xs px-3 py-1.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg disabled:opacity-50"
                  >
                    Unblock
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (confirm(`Block ${user.email}?`)) {
                        blockMutation.mutate({ userId: user.id });
                      }
                    }}
                    disabled={blockMutation.isPending}
                    className="text-xs px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg disabled:opacity-50"
                  >
                    Block
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
