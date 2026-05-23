"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "~/trpc/client";
import { toast } from "sonner";
import type { FieldSchemaUnion } from "@repo/schemas";
import { ThemedFormWrapper } from "~/components/form-renderer/themed-form-wrapper";
import { resolveThemeKey } from "~/lib/themes";

const inputCls =
  "w-full rounded-[var(--form-radius)] border border-[var(--form-border)] bg-[var(--form-surface)] px-4 py-3 text-[var(--form-text)] placeholder:text-[var(--form-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--form-primary)] transition-all";

const cardCls =
  "rounded-[var(--form-radius)] border border-[var(--form-border)] bg-[var(--form-surface)] p-5 shadow-sm";

const btnPrimaryCls =
  "bg-[var(--form-primary)] text-[var(--form-primary-fg)] font-bold rounded-[var(--form-radius)] transition-all hover:opacity-90 disabled:opacity-50";

type AnswerMap = Record<string, string>;

function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: FieldSchemaUnion;
  value: string;
  onChange: (v: string) => void;
}) {
  if (field.type === "short_text") {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder ?? "Type your answer..."}
        className={inputCls}
      />
    );
  }

  if (field.type === "long_text") {
    return (
      <textarea
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder ?? "Type your answer..."}
        className={`${inputCls} resize-none`}
      />
    );
  }

  if (field.type === "email") {
    return (
      <input
        type="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder ?? "your@email.com"}
        className={inputCls}
      />
    );
  }

  if (field.type === "number") {
    return (
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder ?? "Enter a number"}
        className={inputCls}
      />
    );
  }

  if (field.type === "date") {
    return (
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="flex cursor-pointer items-center gap-3">
        <div
          className={`flex h-6 w-6 items-center justify-center rounded border-2 transition-all ${
            value === "true"
              ? "border-[var(--form-primary)] bg-[var(--form-primary)]"
              : "border-[var(--form-border)] bg-[var(--form-surface)]"
          }`}
          onClick={() => onChange(value === "true" ? "false" : "true")}
        >
          {value === "true" && (
            <span className="text-xs text-[var(--form-primary-fg)]">✓</span>
          )}
        </div>
        <span className="text-[var(--form-text)]">{field.label}</span>
      </label>
    );
  }

  if (field.type === "single_select") {
    return (
      <div className="flex flex-wrap gap-2">
        {field.options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(value === opt ? "" : opt)}
            className={`rounded-[var(--form-radius)] border px-4 py-2.5 text-sm font-medium transition-all ${
              value === opt
                ? "border-[var(--form-primary)] bg-[var(--form-primary)] text-[var(--form-primary-fg)]"
                : "border-[var(--form-border)] bg-[var(--form-accent)] text-[var(--form-text)] hover:border-[var(--form-primary)]"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    );
  }

  if (field.type === "multi_select") {
    let selected: string[] = [];
    try {
      selected = value ? (JSON.parse(value) as string[]) : [];
    } catch {
      selected = [];
    }
    const toggle = (opt: string) => {
      const next = selected.includes(opt)
        ? selected.filter((s) => s !== opt)
        : [...selected, opt];
      onChange(JSON.stringify(next));
    };
    return (
      <div className="flex flex-wrap gap-2">
        {field.options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`rounded-[var(--form-radius)] border px-4 py-2.5 text-sm font-medium transition-all ${
              selected.includes(opt)
                ? "border-[var(--form-primary)] bg-[var(--form-primary)] text-[var(--form-primary-fg)]"
                : "border-[var(--form-border)] bg-[var(--form-accent)] text-[var(--form-text)] hover:border-[var(--form-primary)]"
            }`}
          >
            {selected.includes(opt) ? "✓ " : ""}
            {opt}
          </button>
        ))}
      </div>
    );
  }

  if (field.type === "rating") {
    const current = value ? parseInt(value, 10) : 0;
    return (
      <div className="flex gap-2">
        {[...Array(field.maxRating)].map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(String(i + 1))}
            className={`text-3xl transition-all hover:scale-110 ${
              i < current ? "text-[var(--form-primary)]" : "text-[var(--form-muted)]"
            }`}
          >
            ★
          </button>
        ))}
        {current > 0 && (
          <span className="ml-2 self-end text-sm text-[var(--form-muted)]">
            {current}/{field.maxRating}
          </span>
        )}
      </div>
    );
  }

  return null;
}

export default function PublicFormPage() {
  const { slug } = useParams<{ slug: string }>();

  const [answers, setAnswers] = useState<AnswerMap>({});
  const [submitted, setSubmitted] = useState(false);
  const [startedAt] = useState(new Date().toISOString());
  const [unlockToken, setUnlockToken] = useState<string | null>(null);
  const [showPasswordGate, setShowPasswordGate] = useState(false);
  const [password, setPassword] = useState("");

  const { data: form, isLoading, error } = trpc.forms.getBySlug.useQuery({ slug });
  const theme = resolveThemeKey(form?.theme);

  useEffect(() => {
    if (form?.hasPassword && !unlockToken) {
      setShowPasswordGate(true);
    }
  }, [form, unlockToken]);

  const unlockMutation = trpc.forms.unlock.useMutation({
    onSuccess: (data) => {
      setUnlockToken(data.unlockToken);
      setShowPasswordGate(false);
      toast.success("Form unlocked!");
    },
    onError: (e) => toast.error(e.message),
  });

  const submitMutation = trpc.responses.submit.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!form) return;
    const fields = (form.fields as FieldSchemaUnion[]) ?? [];

    for (const field of fields) {
      const val = answers[field.id] ?? "";
      if (field.required && val.trim() === "") {
        toast.error(`"${field.label}" is required`);
        return;
      }
    }

    submitMutation.mutate({
      formId: form.id,
      startedAt,
      answers: Object.entries(answers)
        .filter(([, v]) => v.trim() !== "")
        .map(([fieldId, value]) => ({ fieldId, value })),
      unlockToken: unlockToken ?? undefined,
    });
  };

  if (isLoading) {
    return (
      <ThemedFormWrapper theme="default" className="flex items-center justify-center">
        <div className="animate-pulse text-[var(--form-muted)]">Loading form...</div>
      </ThemedFormWrapper>
    );
  }

  if (error || !form) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-950 text-white">
        <div className="text-5xl">😢</div>
        <h1 className="text-2xl font-bold">Form not found</h1>
        <p className="text-gray-400">
          This form may have been removed or the link is incorrect.
        </p>
        <Link href="/" className="text-orange-400 hover:underline">
          ← Go home
        </Link>
      </div>
    );
  }

  const fields = (form.fields as FieldSchemaUnion[]) ?? [];

  if (showPasswordGate) {
    return (
      <ThemedFormWrapper theme={theme} className="flex items-center justify-center p-4">
        <div className={`${cardCls} mx-auto w-full max-w-sm text-center`}>
          <div className="mb-4 text-4xl">🔒</div>
          <h2 className="mb-2 text-xl font-bold">Password Protected</h2>
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
            className={`${inputCls} mb-4`}
          />
          <button
            type="button"
            onClick={() => unlockMutation.mutate({ slug, password })}
            disabled={!password || unlockMutation.isPending}
            className={`w-full px-4 py-3 ${btnPrimaryCls}`}
          >
            {unlockMutation.isPending ? "Unlocking..." : "Unlock Form"}
          </button>
        </div>
      </ThemedFormWrapper>
    );
  }

  if (submitted) {
    return (
      <ThemedFormWrapper theme={theme} className="flex items-center justify-center p-4">
        <div className={`${cardCls} mx-auto w-full max-w-lg text-center`}>
          <div className="mb-6 text-6xl">🎉</div>
          <h2 className="mb-3 text-2xl font-bold">Thank you!</h2>
          <p className="mb-6 text-lg text-[var(--form-muted)]">
            {form.thankyouMessage ?? "Your response has been recorded."}
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/"
              className="rounded-[var(--form-radius)] border border-[var(--form-border)] bg-[var(--form-accent)] px-6 py-3 text-sm font-semibold transition-all hover:opacity-90"
            >
              ☕ ChaiForms
            </Link>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setAnswers({});
              }}
              className={`px-6 py-3 text-sm ${btnPrimaryCls}`}
            >
              Submit Another Response
            </button>
          </div>
        </div>
      </ThemedFormWrapper>
    );
  }

  return (
    <ThemedFormWrapper theme={theme}>
      <div className="absolute right-4 top-4">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs text-[var(--form-muted)] transition-colors hover:text-[var(--form-text)]"
        >
          <span>☕</span>
          <span>Made with ChaiForms</span>
        </Link>
      </div>

      <div className="flex min-h-screen flex-col items-center justify-start px-4 py-12">
        <div className="w-full max-w-xl">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-black">{form.title}</h1>
            {form.description && (
              <p className="text-[var(--form-muted)]">{form.description}</p>
            )}
          </div>

          <div className="space-y-6">
            {fields.map((field) => (
              <div key={field.id} className={cardCls}>
                {field.type !== "checkbox" && (
                  <label className="mb-2 block font-semibold">
                    {field.label}
                    {field.required && (
                      <span className="ml-1 text-red-500">*</span>
                    )}
                  </label>
                )}
                {field.description && (
                  <p className="mb-3 text-sm text-[var(--form-muted)]">
                    {field.description}
                  </p>
                )}
                <FieldRenderer
                  field={field}
                  value={answers[field.id] ?? ""}
                  onChange={(v) => setAnswers((a) => ({ ...a, [field.id]: v }))}
                />
              </div>
            ))}
          </div>

          {fields.length > 0 && (
            <button
              id="submit-form-btn"
              type="button"
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
              className={`mt-6 w-full px-4 py-4 text-lg shadow-lg ${btnPrimaryCls}`}
            >
              {submitMutation.isPending ? "Submitting..." : "Submit →"}
            </button>
          )}

          {fields.length === 0 && (
            <div className="py-8 text-center text-[var(--form-muted)]">
              This form has no fields yet.
            </div>
          )}
        </div>
      </div>
    </ThemedFormWrapper>
  );
}
