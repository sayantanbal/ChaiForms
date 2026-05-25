"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "~/trpc/client";
import { toast } from "sonner";
import type { FieldSchemaUnion } from "@repo/schemas";

export default function ResponsesPage() {
  const { formId } = useParams<{ formId: string }>();
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const { data: form } = trpc.forms.getById.useQuery({ formId });
  const { data, isLoading } = trpc.responses.list.useQuery({
    formId,
    page,
    pageSize: PAGE_SIZE,
  });

  const exportCsvQuery = trpc.responses.exportCsv.useQuery({ formId }, { enabled: false });

  const handleExport = async () => {
    const result = await exportCsvQuery.refetch();
    if (result.data) {
      const blob = new Blob([result.data], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${form?.slug ?? formId}-responses.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exported!");
    }
  };

  const fields = (form?.fields as FieldSchemaUnion[]) ?? [];
  const responses = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/forms"
            className="text-gray-500 hover:text-white transition-colors text-sm"
          >
            ← Forms
          </Link>
          <span className="text-gray-600">/</span>
          <h1 className="text-xl font-bold">{form?.title ?? "..."} — Responses</h1>
        </div>
        <button
          id="export-csv-btn"
          onClick={() => void handleExport()}
          disabled={exportCsvQuery.isFetching || total === 0}
          className="text-sm px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all disabled:opacity-40"
        >
          {exportCsvQuery.isFetching ? "Exporting..." : "Export CSV"}
        </button>
      </div>

      <div className="text-sm text-gray-400 mb-4">
        {total} response{total !== 1 ? "s" : ""}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : responses.length === 0 ? (
        <div className="bg-gray-800/30 border border-dashed border-white/20 rounded-2xl p-16 text-center">
          <div className="text-5xl mb-4">📭</div>
          <h2 className="text-xl font-bold mb-2">No responses yet</h2>
          <p className="text-gray-400">
            Publish and share your form to start collecting responses.
          </p>
          {form?.status === "draft" && (
            <Link
              href={`/dashboard/forms/${formId}/edit`}
              className="inline-block mt-6 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold px-6 py-3 rounded-xl"
            >
              Go to Builder
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-3 py-3 text-gray-400 font-medium whitespace-nowrap">
                  Submitted
                </th>
                <th className="text-left px-3 py-3 text-gray-400 font-medium whitespace-nowrap">
                  Email
                </th>
                {fields.slice(0, 4).map((f) => (
                  <th
                    key={f.id}
                    className="text-left px-3 py-3 text-gray-400 font-medium whitespace-nowrap max-w-32 truncate"
                  >
                    {f.label}
                  </th>
                ))}
                {fields.length > 4 && (
                  <th className="text-left px-3 py-3 text-gray-400 font-medium">
                    +{fields.length - 4} more
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {responses.map((r) => {
                const ansMap = new Map(r.answers.map((a) => [a.fieldId, a.value]));
                return (
                  <tr
                    key={r.id}
                    className="border-b border-white/5 hover:bg-white/2 transition-colors"
                  >
                    <td className="px-3 py-3 text-gray-400 whitespace-nowrap">
                      {new Date(r.submittedAt).toLocaleDateString()}{" "}
                      <span className="text-gray-600">
                        {new Date(r.submittedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-300 whitespace-nowrap">
                      {r.respondentEmail ?? <span className="text-gray-600">—</span>}
                    </td>
                    {fields.slice(0, 4).map((f) => {
                      const val = ansMap.get(f.id);
                      return (
                        <td key={f.id} className="px-3 py-3 max-w-48">
                          <span className="text-gray-300 truncate block" title={val ?? ""}>
                            {val ?? <span className="text-gray-600">—</span>}
                          </span>
                        </td>
                      );
                    })}
                    {fields.length > 4 && <td className="px-3 py-3 text-gray-600 text-xs">…</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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
