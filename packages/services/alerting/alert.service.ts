import { logger } from "@repo/logger";
// Note: In a real environment, you'd import Resend and configure it.
// import { Resend } from "resend";
// const resend = new Resend(process.env.RESEND_API_KEY);

export class AlertService {
  async sendAlert(alert: {
    severity: "critical" | "warning" | "info";
    title: string;
    description: string;
    metadata?: Record<string, unknown>;
  }) {
    logger.error("Alert triggered", { ...alert });

    // Send email to on-call engineer for critical
    if (alert.severity === "critical") {
      await this.sendEmailAlert(alert);
    }

    // Send to Slack
    await this.sendSlackAlert(alert);
  }

  private async sendEmailAlert(alert: any) {
    // Mock implementation
    logger.debug(`[MOCK EMAIL] Alert sent to on-call: ${alert.title}`);
  }

  private async sendSlackAlert(alert: any) {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      logger.debug(`[MOCK SLACK] Webhook URL not configured. Alert: ${alert.title}`);
      return;
    }

    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `🚨 ${alert.title}`,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*${alert.title}*\n${alert.description}`,
              },
            },
          ],
        }),
      });
    } catch (err) {
      logger.error("Failed to send slack alert", { error: err });
    }
  }
}

export const alertService = new AlertService();
