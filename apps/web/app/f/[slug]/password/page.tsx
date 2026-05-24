"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";
import { toast } from "sonner";
import { ThemeProvider } from "~/lib/theme-registry";
import { resolveThemeKey } from "~/lib/themes";

export default function FormPasswordPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [password, setPassword] = useState("");

  // Fetch form to get theme
  const { data: form } = trpc.forms.getBySlug.useQuery({ slug });
  const theme = resolveThemeKey(form?.theme);

  const unlockMutation = trpc.forms.unlock.useMutation({
    onSuccess: (data) => {
      // Persist token in sessionStorage so the main page picks it up
      if (form?.id) {
        sessionStorage.setItem(`unlock_${form.id}`, data.unlockToken);
      }
      toast.success("Form unlocked!");
      router.push(`/f/${slug}`);
    },
    onError: (e) => toast.error(e.message || "Incorrect password. Please try again."),
  });

  const handleUnlock = () => {
    if (!password.trim()) return;
    unlockMutation.mutate({ slug, password });
  };

  return (
    <ThemeProvider theme={theme}>
      <div className="flex items-center justify-center min-h-screen p-4 relative z-10">
        <div className="mx-auto w-full max-w-sm rounded-3xl border border-[var(--form-border)] bg-[var(--form-surface)] p-8 sm:p-10 text-center shadow-xl">
          <div className="mb-6 flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-[var(--form-primary)]/10">
            <svg className="w-8 h-8 text-[var(--form-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <h1 className="mb-2 text-2xl font-bold text-[var(--form-text)]">Password Required</h1>
          <p className="mb-6 text-sm text-[var(--form-muted)] leading-relaxed">
            {form?.title
              ? `"${form.title}" is password protected. Enter the password to access this form.`
              : "This form is password protected. Enter the password to continue."}
          </p>

          <div className="space-y-3">
            <input
              id="form-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleUnlock();
              }}
              placeholder="Enter password..."
              autoComplete="current-password"
              aria-label="Form password"
              className="w-full rounded-xl border border-[var(--form-border)] bg-[var(--form-bg)] px-4 py-3 text-[var(--form-text)] placeholder:text-[var(--form-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--form-primary)] transition-all"
            />
            <button
              id="unlock-form-btn"
              type="button"
              onClick={handleUnlock}
              disabled={!password.trim() || unlockMutation.isPending}
              className="w-full px-4 py-3 rounded-xl font-bold bg-[var(--form-primary)] text-[var(--form-primary-fg)] hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {unlockMutation.isPending ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Unlocking...
                </>
              ) : (
                "Unlock Form →"
              )}
            </button>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}
