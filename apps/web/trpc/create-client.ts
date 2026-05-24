import { httpLink, httpBatchStreamLink } from "@repo/trpc/client";
import { getTrpcHeaders } from "~/lib/csrf";

interface CreateTRPCHttpBatchClientClientOpts {
  enableStreaming?: boolean;
}

export const createTRPCHttpBatchClientClient = (opts?: CreateTRPCHttpBatchClientClientOpts) => {
  const c = opts?.enableStreaming ? httpBatchStreamLink : httpLink;
  // In the browser, use same-origin path (proxied by Next.js rewrites).
  // On the server (SSR), call the API directly.
  const apiUrl =
    typeof window === "undefined"
      ? (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000")
      : "";
  return c({
    url: `${apiUrl}/trpc`,
    async headers() {
      return getTrpcHeaders();
    },
    fetch(url, options) {
      return fetch(url, {
        ...options,
        credentials: "include",
      });
    },
  });
};
