export type AnalyticsSocket = {
  readyState: number;
  send: (data: string) => void;
};

const OPEN = 1;
const channels = new Map<string, Set<AnalyticsSocket>>();

export function subscribeToChannel(channel: string, ws: AnalyticsSocket): void {
  if (!channels.has(channel)) {
    channels.set(channel, new Set());
  }
  channels.get(channel)!.add(ws);
}

export function unsubscribeFromChannel(
  channel: string,
  ws: AnalyticsSocket,
): void {
  channels.get(channel)?.delete(ws);
}

/** Called after a successful response insert to push live analytics updates. */
export function broadcastDelta(formId: string, delta: object): void {
  const channel = `analytics:${formId}`;
  const message = JSON.stringify({ type: "response_delta", formId, delta });
  channels.get(channel)?.forEach((ws) => {
    if (ws.readyState === OPEN) {
      ws.send(message);
    }
  });
}

/** @internal Clear channels between tests. */
export function resetAnalyticsChannels(): void {
  channels.clear();
}
