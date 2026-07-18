import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Context, Next } from "hono";
import { getSql, listApplications, getApplicationById, insertApplications, updateApplication } from "./db";
import type { Env, NewApplication, ApplicationUpdate } from "./schema";

type AppContext = { Bindings: Env };

const app = new Hono<AppContext>();

app.use("/api/*", cors());

async function requireApiKey(c: Context<AppContext>, next: Next) {
  const key = c.req.header("X-Api-Key");
  if (!key || key !== c.env.API_KEY) {
    return c.json({ error: "unauthorized: missing or invalid X-Api-Key header" }, 401);
  }
  await next();
}

app.get("/api/health", async (c) => {
  try {
    const sql = getSql(c.env.DATABASE_URL);
    await sql`SELECT 1`;
    return c.json({ ok: true, db: "connected" });
  } catch (err) {
    return c.json({ ok: false, db: "error", message: String(err) }, 500);
  }
});

// GET /api/applications?status=&category=&platform=&q=
app.get("/api/applications", async (c) => {
  const sql = getSql(c.env.DATABASE_URL);
  const rows = await listApplications(sql);

  const status = c.req.query("status");
  const category = c.req.query("category");
  const platform = c.req.query("platform");
  const q = c.req.query("q")?.toLowerCase();

  let filtered = rows;
  if (status) filtered = filtered.filter((r) => r.status === status);
  if (category) filtered = filtered.filter((r) => r.category === category);
  if (platform) filtered = filtered.filter((r) => r.platform === platform);
  if (q) {
    filtered = filtered.filter(
      (r) => r.company?.toLowerCase().includes(q) || r.role?.toLowerCase().includes(q)
    );
  }

  return c.json(filtered);
});

app.get("/api/applications/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "id must be an integer" }, 400);

  const sql = getSql(c.env.DATABASE_URL);
  const row = await getApplicationById(sql, id);
  if (!row) return c.json({ error: "not found" }, 404);
  return c.json(row);
});

// POST /api/applications
// Accepts: a single job object, an array of job objects, or { applications: [...] }.
// Requires X-Api-Key. Duplicates (same platform + job_ref) are silently skipped.
app.post("/api/applications", requireApiKey, async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "body must be valid JSON" }, 400);
  }

  let jobs: NewApplication[];
  if (Array.isArray(body)) {
    jobs = body as NewApplication[];
  } else if (body && typeof body === "object" && Array.isArray((body as { applications?: unknown }).applications)) {
    jobs = (body as { applications: NewApplication[] }).applications;
  } else {
    jobs = [body as NewApplication];
  }

  if (jobs.length === 0) return c.json({ error: "no jobs provided" }, 400);

  for (const job of jobs) {
    if (!job || !job.company || !job.role) {
      return c.json({ error: "each job requires at least 'company' and 'role'" }, 400);
    }
  }

  const sql = getSql(c.env.DATABASE_URL);
  const result = await insertApplications(sql, jobs);
  return c.json({ inserted: result.insertedIds, skipped_duplicates: result.skipped }, 201);
});

// PATCH /api/applications/:id
// Partial update. Requires X-Api-Key. If `status` changes, a status_history
// row is appended automatically.
app.patch("/api/applications/:id", requireApiKey, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "id must be an integer" }, 400);

  let updates: unknown;
  try {
    updates = await c.req.json();
  } catch {
    return c.json({ error: "body must be valid JSON" }, 400);
  }

  const sql = getSql(c.env.DATABASE_URL);
  const updated = await updateApplication(sql, id, updates as ApplicationUpdate);
  if (!updated) return c.json({ error: "not found" }, 404);
  return c.json(updated);
});

export default app;
