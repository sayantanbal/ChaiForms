"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";
import { toast } from "sonner";

const THEME_BADGE: Record<string, string> = {
  anime: "bg-pink-500/20 text-pink-400",
  startup: "bg-orange-500/20 text-orange-400",
  os: "bg-cyan-500/20 text-cyan-400",
  game: "bg-green-500/20 text-green-400",
  movie: "bg-red-500/20 text-red-400",
  tech_company: "bg-blue-500/20 text-blue-400",
  event: "bg-yellow-500/20 text-yellow-400",
  default: "bg-gray-500/20 text-gray-400",
};

export default function FormsListPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const { data, isLoading, refetch } = trpc.forms.list.useQuery({ page, pageSize: PAGE_SIZE });

  const createMutation = trpc.forms.create.useMutation({
    onSuccess: (form) => {
      toast.success("Form created!");
      router.push(`/dashboard/forms/${form.id}/edit`);
    },
    onError: (e) => toast.error(e.message),
  });

  const publishMutation = trpc.forms.publish.useMutation({
    onSuccess: () => { toast.success("Form published!"); void refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const unpublishMutation = trpc.forms.unpublish.useMutation({
    onSuccess: () => { toast.success("Form unpublished"); void refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const cloneMutation = trpc.forms.clone.useMutation({
    onSuccess: (form) => {
      toast.success("Form cloned!");
      router.push(`/dashboard/forms/${form.id}/edit`);
    },
    onError: (e) => toast.error(e.message),
  });

  const archiveMutation = trpc.forms.archive.useMutation({
    onSuccess: () => { toast.success("Form archived"); void refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const softDeleteMutation = trpc.forms.softDelete.useMutation({
    onSuccess: () => { toast.success("Form moved to trash"); void refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const forms = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const copyLink = (slug: string) => {
    void navigator.clipboard.writeText(`${window.location.origin}/f/${slug}`);
    toast.success("Share link copied!");
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 bg-gray-800 rounded animate-pulse mb-6" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Forms</h1>
          <p className="text-gray-400 text-sm mt-1">{total} form{total !== 1 ? "s" : ""} total</p>
        </div>
        <button
          id="create-form-btn"
          onClick={() => {
            const title = prompt("Form title:");
            if (title?.trim()) createMutation.mutate({ title: title.trim() });
          }}
          disabled={createMutation.isPending}
          className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl transition-all text-sm"
        >
          {createMutation.isPending ? "Creating..." : "+ New Form"}
        </button>
      </div>

      {/* Forms list */}
      {forms.length === 0 ? (
        <div className="bg-gray-800/30 border border-dashed border-white/20 rounded-2xl p-16 text-center">
          <div className="text-5xl mb-4">📝</div>
          <h2 className="text-xl font-bold mb-2">No forms yet</h2>
          <p className="text-gray-400 mb-6">Create your first form to get started.</p>
          <Link
            href="/dashboard/forms/new"
            className="inline-block bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold px-6 py-3 rounded-xl"
          >
            Create Form
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {forms.map((form) => (
            <div
              key={form.id}
              className="bg-gray-800/50 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold truncate">{form.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${THEME_BADGE[form.theme] ?? THEME_BADGE.default}`}>
                      {form.theme.replace("_", " ")}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      form.status === "published" ? "bg-green-500/20 text-green-400" :
                      form.status === "archived" ? "bg-gray-500/20 text-gray-400" :
                      "bg-yellow-500/20 text-yellow-400"
                    }`}>
                      {form.status}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      form.visibility === "public" ? "bg-blue-500/20 text-blue-400" : "bg-gray-600/20 text-gray-500"
                    }`}>
                      {form.visibility}
                    </span>
                    {form.hasPassword && <span className="text-xs">🔒</span>}
                  </div>
                  <div className="text-xs text-gray-500">
                    /{form.slug} · Updated {form.updatedAt ? new Date(form.updatedAt).toLocaleDateString() : "—"}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                  <Link
                    href={`/dashboard/forms/${form.id}/edit`}
                    className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/dashboard/forms/${form.id}/preview`}
                    className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all"
                  >
                    Preview
                  </Link>
                  <Link
                    href={`/dashboard/forms/${form.id}/analytics`}
                    className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all"
                  >
                    Analytics
                  </Link>
                  <Link
                    href={`/dashboard/forms/${form.id}/responses`}
                    className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all"
                  >
                    Responses
                  </Link>
                  {form.status === "draft" ? (
                    <button
                      onClick={() => publishMutation.mutate({ formId: form.id })}
                      disabled={publishMutation.isPending}
                      className="text-xs px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 rounded-lg transition-all disabled:opacity-50"
                    >
                      Publish
                    </button>
                  ) : form.status === "published" ? (
                    <button
                      onClick={() => unpublishMutation.mutate({ formId: form.id })}
                      disabled={unpublishMutation.isPending}
                      className="text-xs px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30 rounded-lg transition-all disabled:opacity-50"
                    >
                      Unpublish
                    </button>
                  ) : null}
                  <button
                    onClick={() => copyLink(form.slug)}
                    className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all"
                  >
                    Copy Link
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Clone this form?")) cloneMutation.mutate({ formId: form.id });
                    }}
                    disabled={cloneMutation.isPending}
                    className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all disabled:opacity-50"
                  >
                    Clone
                  </button>
                  {form.status !== "archived" && (
                    <>
                      <button
                        onClick={() => {
                          if (confirm("Archive this form?")) {
                            archiveMutation.mutate({ formId: form.id });
                          }
                        }}
                        disabled={archiveMutation.isPending}
                        className="text-xs px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 rounded-lg transition-all disabled:opacity-50"
                      >
                        Archive
                      </button>
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              "Move this form to trash? You can recover it within 7 days.",
                            )
                          ) {
                            softDeleteMutation.mutate({ formIds: [form.id] });
                          }
                        }}
                        disabled={softDeleteMutation.isPending}
                        className="text-xs px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-all disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm disabled:opacity-30 hover:bg-white/10 transition-all"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm disabled:opacity-30 hover:bg-white/10 transition-all"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
