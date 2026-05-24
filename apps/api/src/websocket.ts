import { WebSocketServer, type WebSocket } from "ws";
import type { Server } from "node:http";
import {
  assertCsrf,
  subscribeToChannel,
  unsubscribeFromChannel,
} from "@repo/trpc/server";

export function setupWebSocketServer(server: Server): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
    const channel = url.searchParams.get("channel");
    const csrfToken = url.searchParams.get("csrf") ?? undefined;

    try {
      assertCsrf({
        headers: request.headers,
        method: "GET",
        csrfToken,
        cookies: parseCookieHeader(request.headers.cookie),
      });
    } catch {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      if (!channel) {
        ws.close(4000, "Missing channel");
        return;
      }

      const analyticsSocket = ws as WebSocket & { readyState: number };
      subscribeToChannel(channel, analyticsSocket);

      ws.on("close", () => {
        unsubscribeFromChannel(channel, analyticsSocket);
      });
    });
  });
}

function parseCookieHeader(
  cookieHeader: string | undefined,
): Record<string, string | undefined> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(";").map((part) => {
      const [name, ...rest] = part.trim().split("=");
      return [name, rest.join("=")];
    }),
  );
}
