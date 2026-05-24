"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "~/trpc/client";
import { toast } from "sonner";
import type { FieldSchemaUnion } from "@repo/schemas";
import { ThemedFormWrapper } from "~/components/form-renderer/themed-form-wrapper";
import { FormRenderer } from "~/components/form-renderer/form-renderer";
import { FormNotFound } from "~/components/form-renderer/form-not-found";
import { FormClosed } from "~/components/form-renderer/form-closed";
import { resolveThemeKey } from "~/lib/themes";

export default function PublicFormPage() {
  const { slug } = useParams<{ slug: string }>();

  const [unlockToken, setUnlockToken] = useState<string | null>(null);
  const [showPasswordGate, setShowPasswordGate] = useState(false);
  const [password, setPassword] = useState("");

  const { data: form, isLoading, error } = trpc.forms.getBySlug.useQuery({ slug });
  const theme = resolveThemeKey(form?.theme);

  useEffect(() => {
    if (form?.hasPassword) {
      const stored = typeof window !== "undefined"
        ? sessionStorage.getItem(`unlock_${form.id}`)
        : null;
      if (stored) {
        setUnlockToken(stored);
      } else {
        setShowPasswordGate(true);
      }
    }
  }, [form]);

  const unlockMutation = trpc.forms.unlock.useMutation({
    onSuccess: (data) => {
      setUnlockToken(data.unlockToken);
      setShowPasswordGate(false);
      if (form?.id) sessionStorage.setItem(`unlock_${form.id}`, data.unlockToken);
      toast.success("Form unlocked!");
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <ThemedFormWrapper theme="default" className="flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-[var(--form-muted)]">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--form-primary)] border-t-transparent animate-spin" />
          <span className="text-sm">Loading form...</span>
        </div>
      </ThemedFormWrapper>
    );
  }

  if (error || !form) {
    return <FormNotFound />;
  }

  // Form is draft or archived
  if (form.status === "draft" || form.status === "archived") {
    return (
      <ThemedFormWrapper theme={theme}>
        <FormClosed status={form.status as "draft" | "archived"} />
      </ThemedFormWrapper>
    );
  }

  const fields = (form.fields as FieldSchemaUnion[]) ?? [];

  // Password gate
  if (showPasswordGate) {
    return (
      <ThemedFormWrapper theme={theme} className="flex items-center justify-center p-4">
        <div className="mx-auto w-full max-w-sm rounded-3xl border border-[var(--form-border)] bg-[var(--form-surface)] p-8 sm:p-10 text-center shadow-xl">
          <div className="mb-4 text-5xl">🔒</div>
          <h2 className="mb-2 text-2xl font-bold text-[var(--form-text)]">Password Protected</h2>
          <p className="mb-6 text-sm text-[var(--form-muted)]">
            Enter the password to access this form
          </p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && password) {
                unlockMutation.mutate({ slug, password });
              }
            }}
            placeholder="Enter password..."
            className="w-full rounded-xl border border-[var(--form-border)] bg-[var(--form-bg)] px-4 py-3 text-[var(--form-text)] placeholder:text-[var(--form-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--form-primary)] mb-4 transition-all"
          />
          <button
            type="button"
            onClick={() => unlockMutation.mutate({ slug, password })}
            disabled={!password || unlockMutation.isPending}
            className="w-full px-4 py-3 rounded-xl font-bold bg-[var(--form-primary)] text-[var(--form-primary-fg)] hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {unlockMutation.isPending ? "Unlocking..." : "Unlock Form →"}
          </button>
        </div>
      </ThemedFormWrapper>
    );
  }

  return (
    <ThemedFormWrapper theme={theme}>
      {/* Branding watermark */}
      <div className="fixed right-4 top-4 z-50">
        <Link
          href="/"
          className="flex items-center gap-1.5 rounded-full bg-[var(--form-surface)]/80 backdrop-blur-sm border border-[var(--form-border)] px-3 py-1.5 text-xs text-[var(--form-muted)] transition-colors hover:text-[var(--form-text)]"
        >
          <span>☕</span>
          <span>ChaiForms</span>
        </Link>
      </div>

      {/* Form header */}
      <div className="max-w-3xl mx-auto px-6 pt-16 pb-6 text-center">
        <h1 className="text-3xl sm:text-4xl font-black text-[var(--form-text)] mb-3">
          {form.title}
        </h1>
        {form.description && (
          <p className="text-[var(--form-muted)] text-lg">{form.description}</p>
        )}
      </div>

      {/* Multi-page form renderer with conditional logic */}
      <FormRenderer
        formId={form.id}
        fields={fields}
        pages={form.pages as any}
        thankyouMessage={form.thankyouMessage}
        unlockToken={unlockToken ?? undefined}
      />
    </ThemedFormWrapper>
  );
}
