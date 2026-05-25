"use client";

import { ApiReferenceReact } from "@scalar/api-reference-react";
import "@scalar/api-reference-react/style.css";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function ApiReferencePage() {
  const [mounted, setMounted] = useState(false);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-screen">
      <header className="flex-none px-6 py-4 bg-gray-950 border-b border-white/10 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">☕</span>
          <span className="font-bold text-lg bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
            ChaiForms API
          </span>
        </Link>
        <Link href="/dashboard" className="text-sm font-medium text-gray-400 hover:text-white">
          Back to Dashboard
        </Link>
      </header>
      <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-950">
        <ApiReferenceReact
          configuration={{
            spec: {
              url: `${apiUrl}/openapi.json`,
            },
            theme: "default",
          }}
        />
      </main>
    </div>
  );
}
