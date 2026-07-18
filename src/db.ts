import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { Application, NewApplication, ApplicationUpdate } from "./schema";

export type Sql = NeonQueryFunction<false, false>;

export function getSql(databaseUrl: string): Sql {
  return neon(databaseUrl);
}

export async function listApplications(sql: Sql): Promise<Application[]> {
  const rows = await sql`SELECT * FROM applications ORDER BY id DESC`;
  return rows as unknown as Application[];
}

export async function getApplicationById(sql: Sql, id: number): Promise<Application | null> {
  const rows = await sql`SELECT * FROM applications WHERE id = ${id}`;
  return (rows[0] as Application | undefined) ?? null;
}

/**
 * Inserts one or many jobs in a single atomic round trip. Reuses the exact
 * dedup rule already in place in Neon: (platform, job_ref) must be unique
 * when job_ref is present. Duplicates are silently skipped, not errored.
 * Each successful insert also appends a status_history row, all inside the
 * same transaction, via a CTE so history only gets written when the insert
 * actually happened.
 */
export async function insertApplications(
  sql: Sql,
  jobs: NewApplication[]
): Promise<{ insertedIds: number[]; skipped: number }> {
  if (jobs.length === 0) return { insertedIds: [], skipped: 0 };

  const queries = jobs.map((job) => {
    const status = job.status ?? "Applied";
    return sql`
      WITH ins AS (
        INSERT INTO applications (
          company, role, category, platform, location, salary,
          stack_match, cv_used, status, date_applied, job_ref, url,
          next_action, notes
        ) VALUES (
          ${job.company}, ${job.role}, ${job.category ?? null}, ${job.platform ?? null},
          ${job.location ?? null}, ${job.salary ?? null}, ${job.stack_match ?? null},
          ${job.cv_used ?? null}, ${status}, ${job.date_applied ?? null},
          ${job.job_ref ?? null}, ${job.url ?? null}, ${job.next_action ?? null},
          ${job.notes ?? null}
        )
        ON CONFLICT (platform, job_ref) WHERE job_ref IS NOT NULL AND job_ref != ''
        DO NOTHING
        RETURNING id, status
      )
      INSERT INTO status_history (application_id, status, changed_at)
      SELECT id, status, now() FROM ins
      RETURNING application_id
    `;
  });

  const results = (await sql.transaction(queries)) as { application_id: number }[][];

  const insertedIds: number[] = [];
  for (const rows of results) {
    if (rows.length > 0) insertedIds.push(rows[0].application_id);
  }
  return { insertedIds, skipped: jobs.length - insertedIds.length };
}

/**
 * Partial update. Merges the provided fields onto the existing row so the
 * caller never has to send the full object. If status changes, appends a
 * status_history row in the same transaction as the update.
 */
export async function updateApplication(
  sql: Sql,
  id: number,
  updates: ApplicationUpdate
): Promise<Application | null> {
  const existing = await getApplicationById(sql, id);
  if (!existing) return null;

  const merged: Application = { ...existing, ...updates } as Application;
  const statusChanged = Boolean(updates.status) && updates.status !== existing.status;

  const queries = [
    sql`
      UPDATE applications SET
        company = ${merged.company},
        role = ${merged.role},
        category = ${merged.category},
        platform = ${merged.platform},
        location = ${merged.location},
        salary = ${merged.salary},
        stack_match = ${merged.stack_match},
        cv_used = ${merged.cv_used},
        status = ${merged.status},
        date_applied = ${merged.date_applied},
        job_ref = ${merged.job_ref},
        url = ${merged.url},
        next_action = ${merged.next_action},
        notes = ${merged.notes},
        updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `,
  ];

  if (statusChanged) {
    queries.push(
      sql`INSERT INTO status_history (application_id, status, changed_at)
          VALUES (${id}, ${merged.status}, now())
          RETURNING application_id`
    );
  }

  const results = (await sql.transaction(queries)) as unknown[][];
  const updatedRows = results[0] as Application[];
  return updatedRows[0] ?? null;
}
