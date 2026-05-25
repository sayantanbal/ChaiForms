export type WebhookEvent =
  | "form.submitted"
  | "form.published"
  | "form.unpublished"
  | "form.response.submitted";

export interface WebhookPayload<T = unknown> {
  id: string;
  event: WebhookEvent;
  createdAt: string;
  data: T;
}
