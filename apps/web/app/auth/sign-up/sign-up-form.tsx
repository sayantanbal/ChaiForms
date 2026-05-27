"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AuthDivider } from "~/components/auth/auth-divider";
import { GoogleSignInButton } from "~/components/auth/google-sign-in-button";
import { authClient } from "~/lib/auth/client";

async function signUpAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const { error } = await authClient.signUp.email({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    name: formData.get("name") as string,
  });

  if (error) {
    return { error: error.message ?? "Sign up failed" };
  }

  window.location.href = "/dashboard";
  return null;
}

type SignUpFormProps = {
  neonAuthEnabled: boolean;
};

export function SignUpForm({ neonAuthEnabled }: SignUpFormProps) {
  const [state, formAction, isPending] = useActionState(signUpAction, null);
  const formDisabled = !neonAuthEnabled || isPending;

  return (
    <>
      {!neonAuthEnabled ? (
        <p className="w-full max-w-sm rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Neon Auth is not configured yet. Set NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET to
          enable sign up.
        </p>
      ) : null}

      {neonAuthEnabled ? (
        <div className="flex w-full max-w-sm flex-col gap-4">
          <GoogleSignInButton
            label="Sign up with Google"
            className="flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-slate-50 disabled:opacity-50"
          />
          <AuthDivider label="or sign up with email" />
        </div>
      ) : null}

      <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Name</span>
          <input
            name="name"
            type="text"
            required
            disabled={formDisabled}
            className="rounded-md border px-3 py-2 disabled:bg-slate-100"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Email</span>
          <input
            name="email"
            type="email"
            required
            disabled={formDisabled}
            className="rounded-md border px-3 py-2 disabled:bg-slate-100"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            disabled={formDisabled}
            className="rounded-md border px-3 py-2 disabled:bg-slate-100"
          />
        </label>
        {state?.error && (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={formDisabled}
          className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {isPending ? "Creating account…" : "Sign up"}
        </button>
      </form>
    </>
  );
}

export function SignUpFooter() {
  return (
    <p className="text-sm text-muted-foreground">
      Already have an account?{" "}
      <Link href="/login" className="underline">
        Sign in
      </Link>
    </p>
  );
}
