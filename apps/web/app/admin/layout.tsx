import { redirect } from "next/navigation";
import Link from "next/link";
import { TRPCClientError } from "@repo/trpc/client";
import { api } from "~/trpc/server";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await api.admin.getStats.query();
  } catch (error) {
    if (
      error instanceof TRPCClientError &&
      (error.data?.code === "FORBIDDEN" || error.data?.code === "UNAUTHORIZED")
    ) {
      redirect("/dashboard");
    }
    throw error;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-white/10 bg-gray-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-400">
              Admin
            </p>
            <h1 className="text-xl font-semibold">ChaiForms Platform</h1>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/admin" className="text-gray-300 hover:text-white">
              Overview
            </Link>
            <Link href="/admin/forms" className="text-gray-300 hover:text-white">
              Forms
            </Link>
            <Link href="/admin/users" className="text-gray-300 hover:text-white">
              Users
            </Link>
            <Link href="/dashboard" className="text-amber-400 hover:text-amber-300">
              Back to dashboard
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
