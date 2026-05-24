"use client";

import Link from "next/link";
import { trpc } from "~/trpc/client";

export default function FormsArchivePage() {
  const { data: forms = [], isLoading } = trpc.forms.listArchived.useQuery();

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
        <h1 className="text-2xl font-bold">Archive</h1>
        <p className="text-gray-400 text-sm mt-1">
          Archived forms are hidden from your main list but kept for reference.
        </p>
      </div>

      {forms.length === 0 ? (
        <div className="text-center py-16 text-gray-500 border border-dashed border-white/10 rounded-xl">
          No archived forms
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
                <div className="text-xs text-gray-500 mt-1 capitalize">
                  {form.visibility} · {form.theme}
                </div>
              </div>
              <Link
                href={`/dashboard/forms/${form.id}/edit`}
                className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg"
              >
                View
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
