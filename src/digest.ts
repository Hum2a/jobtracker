import type { Sql } from "./db";
import { listDueSoonReminders } from "./db";

export async function runDigest(opts: {
  sql: Sql;
  resendApiKey?: string;
  to?: string;
  from?: string;
}): Promise<{ sent: boolean; reason?: string; count: number }> {
  if (!opts.resendApiKey) {
    return { sent: false, reason: "RESEND_API_KEY not configured", count: 0 };
  }
  if (!opts.to) {
    return { sent: false, reason: "DIGEST_TO not configured", count: 0 };
  }

  const items = await listDueSoonReminders(opts.sql);
  if (items.length === 0) {
    return { sent: false, reason: "nothing due", count: 0 };
  }

  const from = opts.from || "Docket <onboarding@resend.dev>";
  const rows = items
    .map(
      (r) =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #d5dde8">${escapeHtml(r.dueDate)}</td>
          <td style="padding:8px;border-bottom:1px solid #d5dde8">${escapeHtml(r.company)}</td>
          <td style="padding:8px;border-bottom:1px solid #d5dde8">${escapeHtml(r.roleTitle)}</td>
          <td style="padding:8px;border-bottom:1px solid #d5dde8">${escapeHtml(r.message)}</td>
        </tr>`
    )
    .join("");

  const html = `
    <div style="font-family:Georgia,serif;color:#1a2332">
      <h1 style="color:#0f6e56">Docket — reminders due soon</h1>
      <p style="color:#5a6578">${items.length} reminder(s) due within 3 days.</p>
      <table style="border-collapse:collapse;width:100%;font-family:system-ui,sans-serif;font-size:14px">
        <thead>
          <tr style="text-align:left;background:#f3f6f9">
            <th style="padding:8px">Due</th>
            <th style="padding:8px">Company</th>
            <th style="padding:8px">Role</th>
            <th style="padding:8px">Message</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [opts.to],
      subject: `Docket: ${items.length} reminder(s) due soon`,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { sent: false, reason: `Resend error: ${text}`, count: items.length };
  }

  return { sent: true, count: items.length };
}

function escapeHtml(str: string): string {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
