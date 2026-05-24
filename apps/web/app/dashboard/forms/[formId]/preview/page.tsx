"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "~/trpc/client";
import type { FieldSchemaUnion } from "@repo/schemas";
import { ThemeProvider } from "~/lib/theme-registry";
import { FormRenderer } from "~/components/form-renderer/form-renderer";
import { resolveThemeKey } from "~/lib/themes";

export default function PreviewPage() {
  const { formId } = useParams<{ formId: string }>();
  const { data: form, isLoading } = trpc.forms.getById.useQuery({ formId });
  const { data: pages, isLoading: pagesLoading } = trpc.forms.getPages.useQuery({ formId });

  if (isLoading || pagesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
          <span className="text-sm">Loading preview...</span>
        </div>
      </div>
    );
  }

  if (!form) return null;

  const fields = (form.fields as FieldSchemaUnion[]) ?? [];

  return (
    <div className="min-h-screen">
      {/* Non-dismissible Preview Mode banner */}
      <div
        id="preview-mode-banner"
        className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950 text-sm font-semibold flex items-center justify-between px-4 py-2.5 shadow-lg"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>Preview Mode — submissions are disabled</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/forms/${formId}/edit`}
            className="text-xs font-bold underline hover:no-underline"
          >
            ← Back to Builder
          </Link>
          <Link
            href={`/f/${form.slug}`}
            target="_blank"
            className="text-xs font-bold underline hover:no-underline"
          >
            Open Live Form ↗
          </Link>
        </div>
      </div>

      {/* Spacer to account for fixed banner */}
      <div className="h-10" />

      <ThemeProvider theme={resolveThemeKey(form.theme)}>
        <div className="relative z-10">
          {/* Form title header */}
          <div className="max-w-3xl mx-auto px-6 pt-12 pb-6 text-center">
            <h1 className="text-3xl sm:text-4xl font-black text-[var(--form-text)] mb-3">
              {form.title}
            </h1>
            {form.description && (
              <p className="text-[var(--form-muted)] text-lg">{form.description}</p>
            )}
          </div>

          {fields.length === 0 ? (
            <div className="max-w-3xl mx-auto px-6 py-16 text-center text-[var(--form-muted)]">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-lg">No fields added yet. Go back to the builder to add some!</p>
              <Link
                href={`/dashboard/forms/${formId}/edit`}
                className="inline-block mt-6 px-6 py-3 rounded-xl font-bold bg-[var(--form-primary)] text-[var(--form-primary-fg)] hover:opacity-90 transition-opacity"
              >
                Go to Builder
              </Link>
            </div>
          ) : (
            // Render the real FormRenderer in preview mode — submit button is visually disabled
            // We wrap with a pointer-events overlay on the submit button to block actual submissions
            <div className="relative">
              <FormRenderer
                formId={form.id}
                fields={fields}
                pages={pages}
                thankyouMessage={form.thankyouMessage}
                previewMode
              />
              {/* Overlay to block submit in preview */}
              <style>{`
                [data-preview-form] button[type=button]:last-of-type {
                  opacity: 0.5;
                  cursor: not-allowed;
                  pointer-events: none;
                }
              `}</style>
            </div>
          )}
        </div>
      </ThemeProvider>
    </div>
  );
}
