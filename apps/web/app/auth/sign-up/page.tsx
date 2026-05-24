"use client";

import Link from "next/link";
import { useActionState } from "react";
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

export default function SignUpPage() {
  const [state, formAction, isPending] = useActionState(signUpAction, null);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-3xl font-bold">Create your ChaiForms account</h1>
      <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Name</span>
          <input name="name" type="text" required className="rounded-md border px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Email</span>
          <input name="email" type="email" required className="rounded-md border px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            className="rounded-md border px-3 py-2"
          />
        </label>
        {state?.error && (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {isPending ? "Creating account…" : "Sign up"}
        </button>
      </form>
      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
