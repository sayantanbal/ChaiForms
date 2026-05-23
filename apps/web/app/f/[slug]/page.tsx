"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "~/trpc/client";
import { toast } from "sonner";
import type { FieldSchemaUnion } from "@repo/schemas";

const THEME_GRADIENTS: Record<string, string> = {
  anime: "from-pink-900 via-purple-900 to-indigo-900",
  startup: "from-orange-900 via-amber-900 to-yellow-900",
  os: "from-gray-900 via-cyan-900 to-blue-900",
  game: "from-emerald-900 via-green-900 to-teal-900",
  movie: "from-red-900 via-rose-900 to-pink-900",
  tech_company: "from-blue-900 via-indigo-900 to-purple-900",
  event: "from-yellow-900 via-orange-900 to-red-900",
  default: "from-gray-900 via-gray-900 to-gray-800",
};

const THEME_ACCENT: Record<string, string> = {
  anime: "from-pink-500 to-purple-500",
  startup: "from-orange-500 to-amber-500",
  os: "from-cyan-500 to-blue-500",
  game: "from-green-500 to-emerald-500",
  movie: "from-red-500 to-rose-500",
  tech_company: "from-blue-500 to-indigo-500",
  event: "from-yellow-500 to-orange-500",
  default: "from-gray-500 to-gray-400",
};

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
  const accentCls = "border-white/30 bg-white/10";
  const inputCls = "w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/20 transition-all";

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
      <label className="flex items-center gap-3 cursor-pointer group">
        <div
          className={`w-6 h-6 rounded border-2 ${value === "true" ? "bg-white border-white" : "border-white/30 bg-white/5"} flex items-center justify-center transition-all`}
          onClick={() => onChange(value === "true" ? "false" : "true")}
        >
          {value === "true" && <span className="text-gray-900 text-xs">✓</span>}
        </div>
        <span className="text-white/80">{field.label}</span>
      </label>
    );
  }

  if (field.type === "single_select") {
    return (
      <div className="flex flex-wrap gap-2">
        {field.options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(value === opt ? "" : opt)}
            className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
              value === opt
                ? "bg-white text-gray-900 border-white"
                : "border-white/30 text-white/80 hover:border-white/60 hover:bg-white/10"
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
    try { selected = value ? JSON.parse(value) as string[] : []; } catch { selected = []; }
    const toggle = (opt: string) => {
      const next = selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt];
      onChange(JSON.stringify(next));
    };
    return (
      <div className="flex flex-wrap gap-2">
        {field.options.map((opt) => (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
              selected.includes(opt)
                ? "bg-white text-gray-900 border-white"
                : "border-white/30 text-white/80 hover:border-white/60 hover:bg-white/10"
            }`}
          >
            {selected.includes(opt) ? "✓ " : ""}{opt}
          </button>
        ))}
      </div>
    );
  }

  if (field.type === "rating") {
    const current = value ? parseInt(value) : 0;
    return (
      <div className="flex gap-2">
        {[...Array(field.maxRating)].map((_, i) => (
          <button
            key={i}
            onClick={() => onChange(String(i + 1))}
            className={`text-3xl transition-all hover:scale-110 ${
              i < current ? "text-yellow-400" : "text-white/20"
            }`}
          >
            ★
          </button>
        ))}
        {current > 0 && (
          <span className="self-end text-white/60 text-sm ml-2">{current}/{field.maxRating}</span>
        )}
      </div>
    );
  }

  return null;
}

export default function PublicFormPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const [answers, setAnswers] = useState<AnswerMap>({});
  const [submitted, setSubmitted] = useState(false);
  const [startedAt] = useState(new Date().toISOString());
  const [unlockToken, setUnlockToken] = useState<string | null>(null);
  const [showPasswordGate, setShowPasswordGate] = useState(false);
  const [password, setPassword] = useState("");

  const { data: form, isLoading, error } = trpc.forms.getBySlug.useQuery({ slug });

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

    // Client-side required validation
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

  const gradient = THEME_GRADIENTS[form?.theme ?? "default"] ?? THEME_GRADIENTS.default!;
  const accent = THEME_ACCENT[form?.theme ?? "default"] ?? THEME_ACCENT.default!;

  if (isLoading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${gradient} flex items-center justify-center`}>
        <div className="text-white/60 animate-pulse">Loading form...</div>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4 text-white">
        <div className="text-5xl">😢</div>
        <h1 className="text-2xl font-bold">Form not found</h1>
        <p className="text-gray-400">This form may have been removed or the link is incorrect.</p>
        <Link href="/" className="text-orange-400 hover:underline">← Go home</Link>
      </div>
    );
  }

  const fields = (form.fields as FieldSchemaUnion[]) ?? [];

  // Password gate
  if (showPasswordGate) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${gradient} flex items-center justify-center p-4`}>
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 max-w-sm w-full text-white text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-xl font-bold mb-2">Password Protected</h2>
          <p className="text-white/60 text-sm mb-6">Enter the password to access this form</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && password) unlockMutation.mutate({ slug, password }); }}
            placeholder="Enter password..."
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/50 mb-4"
          />
          <button
            onClick={() => unlockMutation.mutate({ slug, password })}
            disabled={!password || unlockMutation.isPending}
            className={`w-full bg-gradient-to-r ${accent} text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50`}
          >
            {unlockMutation.isPending ? "Unlocking..." : "Unlock Form"}
          </button>
        </div>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${gradient} flex items-center justify-center p-4`}>
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 max-w-lg w-full text-white text-center">
          <div className="text-6xl mb-6">🎉</div>
          <h2 className="text-2xl font-bold mb-3">Thank you!</h2>
          <p className="text-white/70 mb-6 text-lg">
            {form.thankyouMessage ?? "Your response has been recorded."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-sm font-semibold transition-all"
            >
              ☕ ChaiForms
            </Link>
            <button
              onClick={() => { setSubmitted(false); setAnswers({}); }}
              className={`px-6 py-3 bg-gradient-to-r ${accent} text-white font-bold rounded-xl text-sm transition-all`}
            >
              Submit Another Response
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${gradient}`}>
      {/* Branding */}
      <div className="absolute top-4 right-4">
        <Link
          href="/"
          className="text-white/50 hover:text-white/80 text-xs flex items-center gap-1.5 transition-colors"
        >
          <span>☕</span>
          <span>Made with ChaiForms</span>
        </Link>
      </div>

      <div className="min-h-screen flex flex-col items-center justify-start py-12 px-4">
        <div className="w-full max-w-xl">
          {/* Form header */}
          <div className="text-white mb-8 text-center">
            <h1 className="text-3xl font-black mb-2">{form.title}</h1>
            {form.description && <p className="text-white/70">{form.description}</p>}
          </div>

          {/* Fields */}
          <div className="space-y-6">
            {fields.map((field) => (
              <div
                key={field.id}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 text-white"
              >
                {field.type !== "checkbox" && (
                  <label className="block mb-2 font-semibold">
                    {field.label}
                    {field.required && <span className="text-red-300 ml-1">*</span>}
                  </label>
                )}
                {field.description && (
                  <p className="text-white/60 text-sm mb-3">{field.description}</p>
                )}
                <FieldRenderer
                  field={field}
                  value={answers[field.id] ?? ""}
                  onChange={(v) => setAnswers((a) => ({ ...a, [field.id]: v }))}
                />
              </div>
            ))}
          </div>

          {/* Submit */}
          {fields.length > 0 && (
            <button
              id="submit-form-btn"
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
              className={`mt-6 w-full bg-gradient-to-r ${accent} text-white font-bold py-4 rounded-2xl text-lg transition-all hover:scale-[1.02] disabled:opacity-60 shadow-lg`}
            >
              {submitMutation.isPending ? "Submitting..." : "Submit →"}
            </button>
          )}

          {fields.length === 0 && (
            <div className="text-center text-white/40 py-8">
              This form has no fields yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
