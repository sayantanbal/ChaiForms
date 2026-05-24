"use client";

import Link from "next/link";
import { trpc } from "~/trpc/client";
import { toast } from "sonner";

const RECOVERY_DAYS = 7;

function daysUntilPurge(deletedAt: string | null): number {
  if (!deletedAt) return 0;
  const purgeAt =
    new Date(deletedAt).getTime() + RECOVERY_DAYS * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((purgeAt - Date.now()) / (24 * 60 * 60 * 1000)));
}

export default function FormsTrashPage() {
  const { data: forms = [], isLoading, refetch } = trpc.forms.listTrash.useQuery(undefined);

  const recoverMutation = trpc.forms.recover.useMutation({
    onSuccess: () => {
      toast.success("Form recovered");
      void refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 bg-gray-800 rounded animate-pulse mb-6" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Trash</h1>
        <p className="text-gray-400 text-sm mt-1">
          Deleted forms can be recovered within {RECOVERY_DAYS} days, then they are
          permanently removed.
        </p>
      </div>

      {forms.length === 0 ? (
        <div className="text-center py-16 text-gray-500 border border-dashed border-white/10 rounded-xl">
          Trash is empty
        </div>
      ) : (
        <div className="space-y-3">
          {forms.map((form) => (
            <div
              key={form.id}
              className="flex items-center justify-between gap-4 p-4 bg-gray-800/50 border border-white/10 rounded-xl"
            >
              <div>
                <div className="font-medium">{form.title}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {daysUntilPurge(form.deletedAt)} day
                  {daysUntilPurge(form.deletedAt) !== 1 ? "s" : ""} until permanent
                  deletion
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/dashboard/forms/${form.id}/responses`}
                  className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg"
                >
                  Export / View
                </Link>
                <button
                  onClick={() => {
                    if (confirm(`Recover "${form.title}"?`)) {
                      recoverMutation.mutate({ formIds: [form.id] });
                    }
                  }}
                  disabled={recoverMutation.isPending}
                  className="text-xs px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 rounded-lg disabled:opacity-50"
                >
                  Recover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
