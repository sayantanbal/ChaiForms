"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { trpc } from "~/trpc/client";
import { toast } from "sonner";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: "📊", exact: true },
  { href: "/dashboard/forms", label: "My Forms", icon: "📝" },
  { href: "/dashboard/forms/archive", label: "Archive", icon: "📦" },
  { href: "/dashboard/forms/trash", label: "Trash", icon: "🗑️" },
  { href: "/dashboard/workspaces", label: "Workspaces", icon: "👥" },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const utils = trpc.useUtils();
  const triedSessionSync = useRef(false);
  const { data: me, error: meError } = trpc.auth.me.useQuery(undefined, { retry: false });
  const syncSession = trpc.auth.syncSession.useMutation({
    onSuccess: () => {
      void utils.auth.me.invalidate();
    },
  });
  const signOutMutation = trpc.auth.signOut.useMutation({
    onSuccess: () => {
      toast.success("Signed out");
      router.push("/");
    },
  });

  // Neon sign-in sets a web-origin session; sync once to issue API cookies.
  useEffect(() => {
    if (meError?.data?.code !== "UNAUTHORIZED" || triedSessionSync.current) return;
    triedSessionSync.current = true;
    syncSession.mutate(undefined);
  }, [meError, syncSession]);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-gray-900 border-r border-white/10 flex flex-col h-screen sticky top-0">
        <div className="p-4 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">☕</span>
            <span className="font-bold text-lg bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
              ChaiForms
            </span>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : item.href === "/dashboard/forms"
                ? pathname === "/dashboard/forms" ||
                  (pathname.startsWith("/dashboard/forms/") &&
                    !pathname.startsWith("/dashboard/forms/archive") &&
                    !pathname.startsWith("/dashboard/forms/trash"))
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}

          {me?.role === "admin" && (
            <Link
              href="/admin"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                pathname.startsWith("/admin")
                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span>🛡️</span>
              Admin Panel
            </Link>
          )}
        </nav>

        <div className="p-3 border-t border-white/10">
          {me && (
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {me.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{me.fullName}</div>
                <div className="text-xs text-gray-500 truncate">{me.email}</div>
              </div>
            </div>
          )}
          <button
            onClick={() => signOutMutation.mutate(undefined)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <span>🚪</span>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
