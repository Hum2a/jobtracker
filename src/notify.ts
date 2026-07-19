import type { Application, Status } from "../shared/schema";
import type { Env } from "./schema";
import type { Sql } from "./db";
import { resolveNotifyRecipients } from "./db";
import { DEFAULT_FROM, escapeHtml, sendResendEmail, type SendResult } from "./email";

const APP_ORIGIN = "https://jobtracker.humza-butt.space";

async function mailConfig(sql: Sql, env: Env) {
  return {
    apiKey: env.RESEND_API_KEY,
    to: await resolveNotifyRecipients(sql, env.DIGEST_TO),
    from: env.DIGEST_FROM || DEFAULT_FROM,
  };
}

function row(label: string, value: string | null | undefined): string {
  if (value == null || String(value).trim() === "") return "";
  return `<tr>
    <td style="padding:8px 12px 8px 0;color:#5a6578;vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td>
    <td style="padding:8px 0;color:#1a2332;font-weight:500">${escapeHtml(String(value))}</td>
  </tr>`;
}

function linkRow(label: string, url: string | null | undefined): string {
  if (!url?.trim()) return "";
  const safe = escapeHtml(url);
  return `<tr>
    <td style="padding:8px 12px 8px 0;color:#5a6578;vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td>
    <td style="padding:8px 0"><a href="${safe}" style="color:#0f6e56">${safe}</a></td>
  </tr>`;
}

function applicationDetailsHtml(app: Application, extraRows = ""): string {
  return `
    <table style="border-collapse:collapse;width:100%;font-family:system-ui,sans-serif;font-size:14px;margin:16px 0">
      <tbody>
        ${row("Company", app.company)}
        ${row("Position", app.roleTitle)}
        ${row("Industry", app.industry)}
        ${extraRows}
        ${row("Status", app.status)}
        ${row("Location", app.location)}
        ${row("Salary", app.salaryRange)}
        ${row("Source", app.source)}
        ${row("Applied", app.appliedDate)}
        ${linkRow("Job URL", app.jobUrl)}
      </tbody>
    </table>
    <p style="font-family:system-ui,sans-serif;font-size:14px;margin:20px 0 0">
      <a href="${APP_ORIGIN}/apps/${app.id}" style="display:inline-block;background:#0f6e56;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600">
        Open in Docket
      </a>
    </p>
  `;
}

function wrapEmail(title: string, subtitle: string, body: string): string {
  return `
    <div style="font-family:Georgia,serif;color:#1a2332;max-width:560px;margin:0 auto">
      <h1 style="color:#0f6e56;font-size:22px;margin:0 0 8px">${title}</h1>
      <p style="color:#5a6578;font-family:system-ui,sans-serif;font-size:14px;margin:0 0 8px">${subtitle}</p>
      ${body}
    </div>
  `;
}

export async function notifyApplicationCreated(
  env: Env,
  sql: Sql,
  app: Application
): Promise<SendResult> {
  const html = wrapEmail(
    "Docket — new application",
    "A job was added to your pipeline.",
    applicationDetailsHtml(app)
  );

  return sendResendEmail({
    ...(await mailConfig(sql, env)),
    subject: `Docket: added ${app.company} · ${app.roleTitle}`,
    html,
  });
}

export async function notifyStatusChanged(
  env: Env,
  sql: Sql,
  opts: { app: Application; previousStatus: Status }
): Promise<SendResult> {
  const { app, previousStatus } = opts;
  const changeRow = row("Status change", `${previousStatus} → ${app.status}`);
  const html = wrapEmail(
    "Docket — status updated",
    `${escapeHtml(app.company)} moved from <strong>${escapeHtml(previousStatus)}</strong> to <strong>${escapeHtml(app.status)}</strong>.`,
    applicationDetailsHtml(app, changeRow)
  );

  return sendResendEmail({
    ...(await mailConfig(sql, env)),
    subject: `Docket: ${app.company} → ${app.status}`,
    html,
  });
}

/** Combined sample email for Settings test button. */
export async function sendTestEventEmail(env: Env, sql: Sql): Promise<SendResult> {
  const sample: Application = {
    id: 0,
    company: "Acme Corp",
    roleTitle: "Software Engineer",
    industry: "Technology",
    location: "London",
    jobUrl: "https://example.com/jobs/123",
    status: "interview",
    appliedDate: "2026-07-01",
    salaryRange: "£70–85k",
    source: "LinkedIn",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const html = wrapEmail(
    "Docket — test email",
    "If you received this, Resend is configured correctly for create + status alerts.",
    `
      <h2 style="font-size:16px;margin:20px 0 8px;font-family:system-ui,sans-serif">Sample: new application</h2>
      ${applicationDetailsHtml({ ...sample, status: "wishlist", id: 0 })}
      <hr style="border:none;border-top:1px solid #d5dde8;margin:24px 0" />
      <h2 style="font-size:16px;margin:0 0 8px;font-family:system-ui,sans-serif">Sample: status change</h2>
      ${applicationDetailsHtml(sample, row("Status change", "applied → interview"))}
    `
  );

  return sendResendEmail({
    ...(await mailConfig(sql, env)),
    subject: "Docket: test email (create + status alerts)",
    html,
  });
}
