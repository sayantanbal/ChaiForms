import { describe, it, expect, vi, beforeEach } from "vitest";

const sendMock = vi.fn().mockResolvedValue({ id: "email_123" });

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: sendMock },
  })),
}));

vi.mock("@repo/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { NotificationService } from "../index";

describe("NotificationService", () => {
  beforeEach(() => {
    sendMock.mockClear();
  });

  it("sends creator email on every submission", async () => {
    const service = new NotificationService("re_test_key");

    service.sendSubmissionEmails({
      creatorEmail: "creator@example.com",
      formTitle: "Demo Form",
      formId: "00000000-0000-4000-8000-000000000001",
      responseId: "00000000-0000-4000-8000-000000000002",
      sendRespondentConfirmation: false,
      webBaseUrl: "http://localhost:3000",
    });

    await vi.waitFor(() => expect(sendMock).toHaveBeenCalledTimes(1));
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "creator@example.com",
        subject: "New response: Demo Form",
      }),
    );
  });

  it("sends respondent email only when enabled and email present", async () => {
    const service = new NotificationService("re_test_key");

    service.sendSubmissionEmails({
      creatorEmail: "creator@example.com",
      formTitle: "Demo Form",
      formId: "00000000-0000-4000-8000-000000000001",
      responseId: "00000000-0000-4000-8000-000000000002",
      sendRespondentConfirmation: true,
      respondentEmail: "respondent@example.com",
      webBaseUrl: "http://localhost:3000",
    });

    await vi.waitFor(() => expect(sendMock).toHaveBeenCalledTimes(2));
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: "respondent@example.com" }),
    );
  });

  it("does not throw when Resend send fails", async () => {
    sendMock.mockRejectedValueOnce(new Error("Resend API down"));
    const service = new NotificationService("re_test_key");

    expect(() =>
      service.sendSubmissionEmails({
        creatorEmail: "creator@example.com",
        formTitle: "Demo Form",
        formId: "00000000-0000-4000-8000-000000000001",
        responseId: "00000000-0000-4000-8000-000000000002",
        sendRespondentConfirmation: false,
        webBaseUrl: "http://localhost:3000",
      }),
    ).not.toThrow();

    await vi.waitFor(() => expect(sendMock).toHaveBeenCalled());
  });
});
