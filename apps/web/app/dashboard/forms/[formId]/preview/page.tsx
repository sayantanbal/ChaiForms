"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "~/trpc/client";
import type { FieldSchemaUnion } from "@repo/schemas";
import { ThemedFormWrapper } from "~/components/form-renderer/themed-form-wrapper";
import { resolveThemeKey } from "~/lib/themes";

export default function PreviewPage() {
  const { formId } = useParams<{ formId: string }>();
  const { data: form, isLoading } = trpc.forms.getById.useQuery({ formId });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400 animate-pulse">Loading preview...</div>
      </div>
    );
  }

  if (!form) return null;

  const fields = (form.fields as FieldSchemaUnion[]) ?? [];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link href={`/dashboard/forms/${formId}/edit`} className="text-sm text-gray-500 hover:text-white transition-colors">
          ← Back to builder
        </Link>
        <Link
          href={`/f/${form.slug}`}
          target="_blank"
          className="text-sm px-4 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 rounded-lg transition-all"
        >
          Open Public Link ↗
        </Link>
      </div>

      <ThemedFormWrapper
        theme={resolveThemeKey(form.theme)}
        className="min-h-0 overflow-hidden rounded-2xl border border-[var(--form-border)]"
      >
        <div className="border-b border-[var(--form-border)] p-6">
          <h1 className="mb-2 text-2xl font-bold">{form.title}</h1>
          {form.description && (
            <p className="text-[var(--form-muted)]">{form.description}</p>
          )}
        </div>

        <div className="space-y-6 p-6">
          {fields.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <div className="text-4xl mb-3">📋</div>
              <p>No fields added yet</p>
            </div>
          ) : (
            fields.map((field, idx) => (
              <div key={field.id} className="space-y-2">
                <label className="block font-medium">
                  {field.label}
                  {field.required && <span className="text-red-400 ml-1">*</span>}
                </label>
                {field.description && (
                  <p className="text-sm text-gray-500">{field.description}</p>
                )}

                {field.type === "short_text" && (
                  <input
                    type="text"
                    placeholder={field.placeholder ?? "Type your answer..."}
                    disabled
                    className="w-full bg-gray-900/50 border border-white/10 rounded-xl px-4 py-3 text-gray-500 placeholder-gray-600 cursor-not-allowed"
                  />
                )}
                {field.type === "long_text" && (
                  <textarea
                    rows={3}
                    placeholder={field.placeholder ?? "Type your answer..."}
                    disabled
                    className="w-full bg-gray-900/50 border border-white/10 rounded-xl px-4 py-3 text-gray-500 placeholder-gray-600 cursor-not-allowed resize-none"
                  />
                )}
                {field.type === "email" && (
                  <input
                    type="email"
                    placeholder={field.placeholder ?? "your@email.com"}
                    disabled
                    className="w-full bg-gray-900/50 border border-white/10 rounded-xl px-4 py-3 text-gray-500 placeholder-gray-600 cursor-not-allowed"
                  />
                )}
                {field.type === "number" && (
                  <input
                    type="number"
                    placeholder={field.placeholder ?? "Enter a number..."}
                    disabled
                    className="w-full bg-gray-900/50 border border-white/10 rounded-xl px-4 py-3 text-gray-500 placeholder-gray-600 cursor-not-allowed"
                  />
                )}
                {field.type === "date" && (
                  <input
                    type="date"
                    disabled
                    className="w-full bg-gray-900/50 border border-white/10 rounded-xl px-4 py-3 text-gray-500 cursor-not-allowed"
                  />
                )}
                {field.type === "single_select" && (
                  <div className="flex flex-wrap gap-2">
                    {field.options.map((opt) => (
                      <button
                        key={opt}
                        disabled
                        className="px-4 py-2 rounded-lg border border-white/10 text-sm text-gray-400 bg-gray-900/30 cursor-not-allowed"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
                {field.type === "multi_select" && (
                  <div className="flex flex-wrap gap-2">
                    {field.options.map((opt) => (
                      <button
                        key={opt}
                        disabled
                        className="px-4 py-2 rounded-lg border border-white/10 text-sm text-gray-400 bg-gray-900/30 cursor-not-allowed"
                      >
                        ☐ {opt}
                      </button>
                    ))}
                  </div>
                )}
                {field.type === "checkbox" && (
                  <div className="flex items-center gap-2">
                    <input type="checkbox" disabled className="rounded" />
                    <span className="text-gray-400 text-sm">{field.label}</span>
                  </div>
                )}
                {field.type === "rating" && (
                  <div className="flex gap-2">
                    {[...Array(field.maxRating)].map((_, i) => (
                      <button key={i} disabled className="text-2xl text-gray-600 cursor-not-allowed">★</button>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}

          {fields.length > 0 && (
            <button
              disabled
              className="mt-4 w-full cursor-not-allowed rounded-[var(--form-radius)] bg-[var(--form-primary)] py-3 font-bold text-[var(--form-primary-fg)] opacity-50"
            >
              Submit (Preview Mode)
            </button>
          )}
        </div>
      </ThemedFormWrapper>
    </div>
  );
}
