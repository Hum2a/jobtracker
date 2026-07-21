import type { Sql } from "./db";
import { listDueSoonReminders, resolveNotifyRecipients } from "./db";
import { DEFAULT_FROM, sendResendEmail } from "./email";
import { buildDigestEmail } from "./email-templates";

export async function runDigest(opts: {
  sql: Sql;
  resendApiKey?: string;
  /** Fallback when Settings has no recipients */
  digestToFallback?: string;
  from?: string;
}): Promise<{ sent: boolean; reason?: string; count: number }> {
  if (!opts.resendApiKey) {
    return { sent: false, reason: "RESEND_API_KEY not configured", count: 0 };
  }

  const to = await resolveNotifyRecipients(opts.sql, opts.digestToFallback);
  if (to.length === 0) {
    return { sent: false, reason: "No notify recipients configured (set in Settings)", count: 0 };
  }

  const items = await listDueSoonReminders(opts.sql);
  if (items.length === 0) {
    return { sent: false, reason: "nothing due", count: 0 };
  }

  const built = buildDigestEmail(items);

  const result = await sendResendEmail({
    apiKey: opts.resendApiKey,
    to,
    from: opts.from || DEFAULT_FROM,
    subject: built.subject,
    html: built.html,
    text: built.text,
    headers: built.headers,
  });

  return { ...result, count: items.length };
}
