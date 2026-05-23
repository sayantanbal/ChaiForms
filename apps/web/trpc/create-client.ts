import { httpLink, httpBatchStreamLink } from "@repo/trpc/client";
import { env } from "~/env.js";
import { getTrpcHeaders } from "~/lib/csrf";

interface CreateTRPCHttpBatchClientClientOpts {
  enableStreaming?: boolean;
}

export const createTRPCHttpBatchClientClient = (
  opts?: CreateTRPCHttpBatchClientClientOpts,
) => {
  const c = opts?.enableStreaming ? httpBatchStreamLink : httpLink;
  return c({
    url: `${env.NEXT_PUBLIC_API_URL}/trpc`,
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
