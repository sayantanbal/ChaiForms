"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "~/lib/auth/client";
import { trpc } from "~/trpc/client";

type EmailSignInFormProps = {
  disabled?: boolean;
};

export function EmailSignInForm({ disabled = false }: EmailSignInFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const syncSession = trpc.auth.syncSession.useMutation();
  const isDisabled = disabled || isPending;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    const formData = new FormData(event.currentTarget);
    const email = (formData.get("email") as string) ?? "";
    const password = (formData.get("password") as string) ?? "";

    const { error: signInError } = await authClient.signIn.email({ email, password });
    if (signInError) {
      setError(signInError.message ?? "Sign in failed");
      setIsPending(false);
      return;
    }

    try {
      await syncSession.mutateAsync();
      router.replace("/dashboard");
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Failed to start session");
      setIsPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Email</span>
        <input
          name="email"
          type="email"
          required
          disabled={isDisabled}
          className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 disabled:bg-slate-100"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Password</span>
        <input
          name="password"
          type="password"
          required
          disabled={isDisabled}
          className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 disabled:bg-slate-100"
        />
      </label>
      {error ? (
        <p className="text-sm text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isDisabled}
        className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
      >
        {isPending ? "Signing in..." : "Sign in"}
      </button>
      <p className="text-sm text-slate-600">
        No account?{" "}
        <Link href="/auth/sign-up" className="font-medium text-amber-700 underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}
