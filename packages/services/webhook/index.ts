import { createHmac } from "node:crypto";
import { logger } from "@repo/logger";
import { db, eq } from "@repo/database";
import { webhooks } from "@repo/database/schema";
import type { WebhookEvent, WebhookPayload } from "@repo/types";
import { createId } from "@paralleldrive/cuid2";

export class WebhookService {
  /**
   * Broadcast an event to all configured webhooks for a given workspace.
   * This sends the payload via fetch() and signs the request with HMAC SHA256.
   *
   * In a production environment with high traffic, this should push to a queue
   * (e.g., Redis / SQS) and a worker process should consume it to handle retries.
   */
  static async trigger(workspaceId: string, event: WebhookEvent, data: any) {
    try {
      const activeWebhooks = await db
        .select()
        .from(webhooks)
        .where(eq(webhooks.workspaceId, workspaceId));

      const matchingWebhooks = activeWebhooks.filter(
        (wh) => wh.isActive && (wh.events as string[]).includes(event),
      );

      if (matchingWebhooks.length === 0) return;

      const payload: WebhookPayload = {
        id: createId(),
        event,
        createdAt: new Date().toISOString(),
        data,
      };

      const payloadString = JSON.stringify(payload);

      // Fire and forget fetch requests
      Promise.allSettled(
        matchingWebhooks.map(async (webhook) => {
          const signature = createHmac("sha256", webhook.secret)
            .update(payloadString)
            .digest("hex");

          try {
            const res = await fetch(webhook.url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-chaiforms-signature": signature,
                "x-chaiforms-event": event,
                "x-chaiforms-delivery": payload.id,
              },
              body: payloadString,
            });

            if (!res.ok) {
              logger.warn(`Webhook delivery failed for ${webhook.url}`, {
                status: res.status,
                event,
              });
            }
          } catch (err) {
            logger.error(`Webhook delivery error for ${webhook.url}`, {
              err,
              event,
            });
          }
        }),
      );
    } catch (err) {
      logger.error("Error evaluating webhooks", { error: err });
    }
  }
}
