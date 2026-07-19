export type SendResult = { sent: boolean; reason?: string };

const DEFAULT_FROM = "Docket <onboarding@resend.dev>";

export function escapeHtml(str: string): string {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function sendResendEmail(opts: {
  apiKey?: string;
  to?: string;
  from?: string;
  subject: string;
  html: string;
}): Promise<SendResult> {
  if (!opts.apiKey) {
    return { sent: false, reason: "RESEND_API_KEY not configured" };
  }
  if (!opts.to) {
    return { sent: false, reason: "DIGEST_TO not configured" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: opts.from || DEFAULT_FROM,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { sent: false, reason: `Resend error: ${text}` };
  }

  return { sent: true };
}
