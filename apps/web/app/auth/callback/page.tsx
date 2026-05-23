"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { trpc } from "~/trpc/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  const { data, error, isLoading } = trpc.auth.callback.useQuery(
    { code: code ?? "" },
    { enabled: !!code },
  );

  useEffect(() => {
    if (data?.user) {
      router.replace("/dashboard");
    }
  }, [data, router]);

  if (!code) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold text-slate-900">
            Missing authorization code
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Please restart sign-in from the login page.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Back to login
          </Link>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold text-slate-900">
            Sign-in failed
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Something went wrong while completing Google sign-in. Please try
            again.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Back to login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="text-center">
        <p className="text-sm uppercase tracking-[0.24em] text-slate-400">
          ChaiForms
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          {isLoading ? "Signing you in..." : "Redirecting..."}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Please keep this tab open while we finish authentication.
        </p>
      </div>
    </main>
  );
}
