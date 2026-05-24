"use client";

import Link from "next/link";
import { useState } from "react";
import { trpc } from "~/trpc/client";
import { toast } from "sonner";

export default function WorkspacesPage() {
  const [name, setName] = useState("");
  const { data: workspaces = [], isLoading, refetch } = trpc.workspaces.list.useQuery(undefined);

  const createMutation = trpc.workspaces.create.useMutation({
    onSuccess: () => {
      toast.success("Workspace created");
      setName("");
      void refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 bg-gray-800 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Workspaces</h1>
          <p className="text-gray-400 text-sm mt-1">
            Collaborate with your team on shared forms.
          </p>
        </div>
      </div>

      <form
        className="flex gap-2 mb-8"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          createMutation.mutate({ name: name.trim() });
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New workspace name"
          className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-white/10 text-sm"
        />
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          Create
        </button>
      </form>

      {workspaces.length === 0 ? (
        <div className="text-center py-16 text-gray-500 border border-dashed border-white/10 rounded-xl">
          No workspaces yet
        </div>
      ) : (
        <div className="space-y-3">
          {workspaces.map((ws) => (
            <Link
              key={ws.id}
              href={`/dashboard/workspaces/${ws.id}`}
              className="block p-4 bg-gray-800/50 border border-white/10 rounded-xl hover:border-orange-500/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{ws.name}</div>
                  {ws.description && (
                    <div className="text-sm text-gray-400 mt-1">{ws.description}</div>
                  )}
                </div>
                <span className="text-xs px-2 py-1 rounded bg-white/5 text-gray-400 capitalize">
                  {ws.memberRole}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
