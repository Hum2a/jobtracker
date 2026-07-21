import type { Application, Status } from "../shared/schema";
import type { Env } from "./schema";
import type { Sql } from "./db";
import { resolveNotifyRecipients } from "./db";
import { DEFAULT_FROM, sendResendEmail, type SendResult } from "./email";
import {
  buildCreatedEmail,
  buildStatusChangedEmail,
  buildTestEmail,
} from "./email-templates";

async function mailConfig(sql: Sql, env: Env) {
  return {
    apiKey: env.RESEND_API_KEY,
    to: await resolveNotifyRecipients(sql, env.DIGEST_TO),
    from: env.DIGEST_FROM || DEFAULT_FROM,
  };
}

export async function notifyApplicationCreated(
  env: Env,
  sql: Sql,
  app: Application
): Promise<SendResult> {
  const built = buildCreatedEmail(app);
  return sendResendEmail({
    ...(await mailConfig(sql, env)),
    subject: built.subject,
    html: built.html,
    text: built.text,
  });
}

export async function notifyStatusChanged(
  env: Env,
  sql: Sql,
  opts: { app: Application; previousStatus: Status }
): Promise<SendResult> {
  const built = buildStatusChangedEmail(opts.app, opts.previousStatus);
  return sendResendEmail({
    ...(await mailConfig(sql, env)),
    subject: built.subject,
    html: built.html,
    text: built.text,
  });
}

export async function sendTestEventEmail(env: Env, sql: Sql): Promise<SendResult> {
  const built = buildTestEmail();
  return sendResendEmail({
    ...(await mailConfig(sql, env)),
    subject: built.subject,
    html: built.html,
    text: built.text,
  });
}
