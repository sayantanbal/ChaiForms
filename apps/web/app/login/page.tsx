import { env } from "~/env.js";
import { DemoLoginButtons } from "./demo-login-buttons";
import { EmailSignInForm } from "./email-sign-in-form";

export default async function LoginPage() {
  const neonAuthEnabled = Boolean(env.NEON_AUTH_BASE_URL);
  const showDemo = env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === "true";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-white to-rose-50 px-6 py-12">
      <section className="w-full max-w-md rounded-2xl border border-amber-100 bg-white/80 p-8 shadow-lg backdrop-blur">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
            ChaiForms
          </p>
          <h1 className="text-3xl font-semibold text-slate-900">Sign in</h1>
          <p className="text-sm text-slate-600">Build, publish, and analyze forms in minutes.</p>
        </div>

        <div className="mt-6 space-y-4">
          {!neonAuthEnabled ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Neon Auth is not configured yet. Set NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET to
              enable login.
            </p>
          ) : null}
          <EmailSignInForm disabled={!neonAuthEnabled} />
        </div>

        {showDemo ? (
          <div className="mt-6">
            <DemoLoginButtons />
          </div>
        ) : null}
      </section>
    </main>
  );
}
