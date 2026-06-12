import { describe, expect, it, vi } from "vitest";
import { createResendEmailSender } from "../src/email/resendEmailSender.js";

describe("ResendEmailSender", () => {
  it("sends the magic link without exposing the API key in the body", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify({ id: "email-1" }), { status: 200 })
    );
    const sender = createResendEmailSender({
      apiKey: "resend-secret",
      fromEmail: "Simple Reader <login@reader.example.com>",
      fetchImpl,
    });

    await sender.sendMagicLink({
      to: "reader@example.com",
      url: "https://reader.example.com/auth/redeem?token=opaque",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer resend-secret",
          "Content-Type": "application/json",
        }),
      }),
    );
    const request = fetchImpl.mock.calls[0]![1]!;
    expect(request.body as string).toContain(
      "https://reader.example.com/auth/redeem?token=opaque",
    );
    expect(request.body as string).not.toContain("resend-secret");
  });

  it("fails closed when the provider rejects delivery", async () => {
    const sender = createResendEmailSender({
      apiKey: "resend-secret",
      fromEmail: "login@reader.example.com",
      fetchImpl: vi.fn<typeof fetch>(async () =>
        new Response("provider unavailable", { status: 503 })
      ),
    });

    await expect(sender.sendMagicLink({
      to: "reader@example.com",
      url: "https://reader.example.com/auth/redeem?token=opaque",
    })).rejects.toThrow("Email provider rejected magic-link delivery");
  });
});
