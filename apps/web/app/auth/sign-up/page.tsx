import { env } from "~/env.js";
import { SignUpFooter, SignUpForm } from "./sign-up-form";

export default function SignUpPage() {
  const neonAuthEnabled = Boolean(env.NEON_AUTH_BASE_URL);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-3xl font-bold">Create your ChaiForms account</h1>
      <SignUpForm neonAuthEnabled={neonAuthEnabled} />
      <SignUpFooter />
    </main>
  );
}
