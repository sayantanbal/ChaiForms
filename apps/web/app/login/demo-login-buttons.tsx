"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";

export function DemoLoginButtons() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const demoLogin = trpc.auth.demoLogin.useMutation({
    onSuccess: () => {
      router.replace("/dashboard");
    },
    onError: (err) => {
      setError(err.message ?? "Demo login failed");
    },
  });

  const handleLogin = (email: "demo@chaiforms.dev" | "admin@chaiforms.dev") => {
    setError(null);
    demoLogin.mutate({ email });
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Demo Access
        </p>
        <p className="text-sm text-slate-600">
          Jump straight into seeded forms and analytics.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => handleLogin("demo@chaiforms.dev")}
          disabled={demoLogin.isPending}
          className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-amber-300 hover:bg-amber-50 disabled:opacity-60"
        >
          Continue as Demo Creator
        </button>
        <button
          type="button"
          onClick={() => handleLogin("admin@chaiforms.dev")}
          disabled={demoLogin.isPending}
          className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-amber-300 hover:bg-amber-50 disabled:opacity-60"
        >
          Continue as Admin
        </button>
      </div>
      {error ? (
        <p className="text-xs text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
