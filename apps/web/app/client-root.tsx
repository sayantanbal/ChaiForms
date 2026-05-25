"use client";

import { ErrorBoundary } from "~/components/error-boundary";
import { GlobalCommandPalette } from "~/components/global-command-palette";
import { GlobalProviders } from "~/providers/global";

export function ClientRoot({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <GlobalProviders>
        {children}
        <GlobalCommandPalette />
      </GlobalProviders>
    </ErrorBoundary>
  );
}
