import Link from "next/link";
import { api } from "~/trpc/server";
import { env } from "~/env.js";
import { DemoLoginButtons } from "./demo-login-buttons";

export default async function LoginPage() {
  const providers = await api.auth.getSupportedAuthenticationProviders();
  const showDemo = env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === "true";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-white to-rose-50 px-6 py-12">
      <section className="w-full max-w-md rounded-2xl border border-amber-100 bg-white/80 p-8 shadow-lg backdrop-blur">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
            ChaiForms
          </p>
          <h1 className="text-3xl font-semibold text-slate-900">Sign in</h1>
          <p className="text-sm text-slate-600">
            Build, publish, and analyze forms in minutes.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {providers.length === 0 ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Authentication is not configured yet. Add an auth provider and retry.
            </p>
          ) : (
            providers.map((provider) => (
              <Link
                key={provider.provider}
                href={provider.authUrl}
                className="flex w-full items-center justify-between rounded-md border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-800 transition hover:border-amber-300 hover:bg-amber-50"
              >
                <span>
                  Continue with {provider.displayName ?? provider.provider}
                </span>
                <span className="text-xs text-slate-500">
                  {provider.displayText ?? "Secure sign-in"}
                </span>
              </Link>
            ))
          )}
        </div>

        {showDemo ? (
          <div className="mt-6">
            <DemoLoginButtons />
          </div>
        ) : null}

        <div className="mt-6 text-sm text-slate-600">
          Prefer email?{" "}
          <Link href="/auth/sign-in" className="font-medium text-amber-700 underline">
            Sign in with email and password
          </Link>
          .
        </div>
      </section>
    </main>
  );
}
