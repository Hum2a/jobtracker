export type SendResult = { sent: boolean; reason?: string };

/** Verified domain sender for Docket. */
export const DEFAULT_FROM = "Docket <Docket@Humza-Butt.space>";
export const DEFAULT_REPLY_TO = "Docket@Humza-Butt.space";

export function escapeHtml(str: string): string {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Split comma / newline / semicolon separated emails; trim empties. */
export function parseEmailList(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return [
    ...new Set(
      raw
        .split(/[,;\n]+/)
        .map((e) => e.trim())
        .filter(Boolean)
    ),
  ];
}

export async function sendResendEmail(opts: {
  apiKey?: string;
  to?: string | string[];
  from?: string;
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
  headers?: Record<string, string>;
}): Promise<SendResult> {
  if (!opts.apiKey) {
    return { sent: false, reason: "RESEND_API_KEY not configured" };
  }

  const recipients = Array.isArray(opts.to)
    ? opts.to.map((e) => e.trim()).filter(Boolean)
    : parseEmailList(opts.to);

  if (recipients.length === 0) {
    return { sent: false, reason: "No notify recipients configured (set in Settings)" };
  }

  const payload: Record<string, unknown> = {
    from: opts.from || DEFAULT_FROM,
    to: recipients,
    subject: opts.subject,
    html: opts.html,
    reply_to: opts.replyTo || DEFAULT_REPLY_TO,
  };

  if (opts.text?.trim()) payload.text = opts.text;
  if (opts.headers && Object.keys(opts.headers).length > 0) {
    payload.headers = opts.headers;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    return { sent: false, reason: `Resend error: ${text}` };
  }

  return { sent: true };
}
