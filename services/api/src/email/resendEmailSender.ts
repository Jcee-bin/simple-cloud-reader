import type { EmailSender } from "./emailSender.js";

interface ResendEmailSenderOptions {
  apiKey: string;
  fromEmail: string;
  fetchImpl?: typeof fetch;
}

export function createResendEmailSender(
  options: ResendEmailSenderOptions,
): EmailSender {
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async sendMagicLink({ to, url }): Promise<void> {
      const response = await fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: options.fromEmail,
          to: [to],
          subject: "Sign in to Simple Cloud Reader",
          text: `Open this link to sign in. It expires in 15 minutes:\n\n${url}`,
          html: [
            "<p>Open this link to sign in to Simple Cloud Reader.</p>",
            `<p><a href="${url}">Sign in</a></p>`,
            "<p>This link expires in 15 minutes and can be used once.</p>",
          ].join(""),
        }),
      });
      if (!response.ok) {
        throw new Error("Email provider rejected magic-link delivery");
      }
    },
  };
}
