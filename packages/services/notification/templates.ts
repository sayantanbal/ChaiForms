export interface EmailTemplateOpts {
  formTitle: string;
  formId: string;
  responseId: string;
  webBaseUrl: string;
  submittedAt?: Date;
}

function formatTimestamp(date: Date): string {
  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function creatorEmailHtml(opts: EmailTemplateOpts): string {
  const submittedAt = opts.submittedAt ?? new Date();
  const dashboardUrl = `${opts.webBaseUrl.replace(/\/$/, "")}/dashboard/forms/${opts.formId}/responses`;

  return `
    <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
      <h1 style="font-size: 20px; margin-bottom: 8px;">New response on ${escapeHtml(opts.formTitle)}</h1>
      <p style="color: #64748b; margin-top: 0;">
        Someone submitted your form at ${escapeHtml(formatTimestamp(submittedAt))}.
      </p>
      <p>
        <a href="${dashboardUrl}" style="display: inline-block; background: #ea580c; color: #fff; padding: 10px 16px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          View responses
        </a>
      </p>
      <p style="font-size: 12px; color: #94a3b8;">Response ID: ${opts.responseId}</p>
    </div>
  `.trim();
}

export function respondentEmailHtml(opts: EmailTemplateOpts): string {
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
      <h1 style="font-size: 20px; margin-bottom: 8px;">Thanks for your response</h1>
      <p style="color: #64748b; margin-top: 0;">
        Your submission for <strong>${escapeHtml(opts.formTitle)}</strong> was received.
      </p>
      <p style="color: #64748b;">We appreciate you taking the time to fill out this form.</p>
    </div>
  `.trim();
}

export interface WorkspaceInviteTemplateOpts {
  inviteeEmail: string;
  workspaceName: string;
  inviterName: string;
  workspaceId: string;
  webBaseUrl: string;
}

export function workspaceInviteEmailHtml(
  opts: WorkspaceInviteTemplateOpts,
): string {
  const workspaceUrl = `${opts.webBaseUrl.replace(/\/$/, "")}/dashboard/workspaces/${opts.workspaceId}`;

  return `
    <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
      <h1 style="font-size: 20px; margin-bottom: 8px;">You've been invited to ${escapeHtml(opts.workspaceName)}</h1>
      <p style="color: #64748b; margin-top: 0;">
        ${escapeHtml(opts.inviterName)} added you to the workspace on ChaiForms.
      </p>
      <p>
        <a href="${workspaceUrl}" style="display: inline-block; background: #ea580c; color: #fff; padding: 10px 16px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Open workspace
        </a>
      </p>
    </div>
  `.trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
