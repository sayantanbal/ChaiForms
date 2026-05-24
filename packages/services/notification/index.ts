import { Resend } from "resend";
import { logger } from "@repo/logger";

import {
  creatorEmailHtml,
  respondentEmailHtml,
  workspaceInviteEmailHtml,
  type WorkspaceInviteTemplateOpts,
} from "./templates";

export interface SendSubmissionEmailsOpts {
  creatorEmail: string;
  formTitle: string;
  formId: string;
  responseId: string;
  respondentEmail?: string;
  sendRespondentConfirmation: boolean;
  webBaseUrl: string;
}

export class NotificationService {
  private resend: Resend | null;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.RESEND_API_KEY;
    this.resend = key ? new Resend(key) : null;
  }

  sendSubmissionEmails(opts: SendSubmissionEmailsOpts): void {
    if (!this.resend) {
      logger.warn("RESEND_API_KEY not set; skipping submission emails", {
        formId: opts.formId,
        responseId: opts.responseId,
      });
      return;
    }

    const submittedAt = new Date();
    const templateBase = {
      formTitle: opts.formTitle,
      formId: opts.formId,
      responseId: opts.responseId,
      webBaseUrl: opts.webBaseUrl,
      submittedAt,
    };

    const tasks: Promise<unknown>[] = [
      this.resend.emails
        .send({
          from: "ChaiForms <notifications@chaiforms.dev>",
          to: opts.creatorEmail,
          subject: `New response: ${opts.formTitle}`,
          html: creatorEmailHtml(templateBase),
        })
        .catch((err: Error) => {
          logger.error("Creator email failed", {
            formId: opts.formId,
            responseId: opts.responseId,
            error: err.message,
          });
        }),
    ];

    if (opts.sendRespondentConfirmation && opts.respondentEmail) {
      tasks.push(
        this.resend.emails
          .send({
            from: "ChaiForms <notifications@chaiforms.dev>",
            to: opts.respondentEmail,
            subject: `Thanks for filling out: ${opts.formTitle}`,
            html: respondentEmailHtml(templateBase),
          })
          .catch((err: Error) => {
            logger.error("Respondent email failed", {
              formId: opts.formId,
              responseId: opts.responseId,
              error: err.message,
            });
          }),
      );
    }

    void Promise.allSettled(tasks);
  }

  sendWorkspaceInviteEmail(opts: WorkspaceInviteTemplateOpts): void {
    if (!this.resend) {
      logger.warn("RESEND_API_KEY not set; skipping workspace invite email", {
        workspaceId: opts.workspaceId,
      });
      return;
    }

    void this.resend.emails
      .send({
        from: "ChaiForms <notifications@chaiforms.dev>",
        to: opts.inviteeEmail,
        subject: `You've been invited to ${opts.workspaceName}`,
        html: workspaceInviteEmailHtml(opts),
      })
      .catch((err: Error) => {
        logger.error("Workspace invite email failed", {
          workspaceId: opts.workspaceId,
          error: err.message,
        });
      });
  }
}

export const notificationService = new NotificationService();
