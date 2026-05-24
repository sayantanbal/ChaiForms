"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "~/trpc/client";
import { ThemeProvider } from "~/lib/theme-registry";
import { FormRenderer } from "~/components/form-renderer/form-renderer";
import { resolveThemeKey } from "~/lib/themes";

export default function TemplatePreviewPage() {
  const { id } = useParams<{ id: string }>();

  const { data: template, isLoading, error } = trpc.explore.getTemplateById.useQuery({ id });

  if (isLoading) {
    return (
      <ThemeProvider theme="default">
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-[var(--form-muted)]">
            <div className="w-8 h-8 rounded-full border-2 border-[var(--form-primary)] border-t-transparent animate-spin" />
            <span className="text-sm">Loading template preview...</span>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  if (error || !template) {
    return (
      <ThemeProvider theme="default">
        <div className="flex min-h-screen flex-col items-center justify-center text-center p-6">
          <div className="text-5xl mb-4">🤷</div>
          <h2 className="text-2xl font-bold text-[var(--form-text)] mb-2">Template not found</h2>
          <p className="text-[var(--form-muted)] mb-8">
            The template you are looking for does not exist or has been removed.
          </p>
          <Link
            href="/templates"
            className="px-6 py-3 rounded-xl font-bold bg-[var(--form-primary)] text-[var(--form-primary-fg)] hover:opacity-90 transition-opacity"
          >
            ← Back to Templates
          </Link>
        </div>
      </ThemeProvider>
    );
  }

  const theme = resolveThemeKey(template.theme);

  return (
    <ThemeProvider theme={theme}>
      <div className="relative z-10 w-full min-h-screen">
        {/* Banner */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-[var(--form-primary)] text-[var(--form-primary-fg)] px-4 py-3 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold">Template Preview</span>
            <span className="opacity-80 hidden sm:inline">—</span>
            <span className="opacity-80 hidden sm:inline text-sm">Use this template to create your own form.</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/templates"
              className="text-sm font-semibold opacity-90 hover:opacity-100 hover:underline"
            >
              Back to Gallery
            </Link>
            <Link
              href={`/dashboard/forms/new?templateId=${template.id}`}
              className="text-sm font-bold bg-[var(--form-bg)] text-[var(--form-text)] px-4 py-1.5 rounded-full hover:shadow-md transition-shadow"
            >
              Use Template →
            </Link>
          </div>
        </div>

        {/* Spacer for banner */}
        <div className="h-16" />

        {/* Form header */}
        <div className="max-w-3xl mx-auto px-6 pt-12 pb-6 text-center">
          <h1 className="text-3xl sm:text-4xl font-black text-[var(--form-text)] mb-3">
            {template.title}
          </h1>
          {template.description && (
            <p className="text-[var(--form-muted)] text-lg">{template.description}</p>
          )}
        </div>

        {/* Form renderer in preview mode */}
        <div className="relative pb-20">
          <FormRenderer
            formId={template.id}
            fields={template.fields}
            previewMode
          />
          {/* Overlay to block submit in preview */}
          <style>{`
            button[type=button]:last-of-type {
              opacity: 0.5;
              cursor: not-allowed;
              pointer-events: none;
            }
          `}</style>
        </div>
      </div>
    </ThemeProvider>
  );
}
