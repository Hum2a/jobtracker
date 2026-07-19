#!/usr/bin/env node
/**
 * Docket DB helpers.
 *
 * Usage:
 *   node scripts/db.mjs migrate
 *   node scripts/db.mjs status
 *   node scripts/db.mjs ping
 *
 * DATABASE_URL is read from the environment, or from .dev.vars if unset.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const migrationsDir = join(root, "migrations");

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const devVarsPath = join(root, ".dev.vars");
  if (!existsSync(devVarsPath)) {
    throw new Error(
      "DATABASE_URL not set. Export it or add it to .dev.vars (see README)."
    );
  }

  const text = readFileSync(devVarsPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key === "DATABASE_URL" && value) return value;
  }

  throw new Error("DATABASE_URL not found in environment or .dev.vars");
}

function listMigrationFiles() {
  if (!existsSync(migrationsDir)) return [];
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

async function withPool(fn) {
  const pool = new Pool({ connectionString: loadDatabaseUrl() });
  try {
    return await fn(pool);
  } finally {
    await pool.end();
  }
}

async function ensureMigrationsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id          TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function appliedSet(pool) {
  const { rows } = await pool.query(`SELECT id FROM schema_migrations ORDER BY id`);
  return new Set(rows.map((r) => r.id));
}

async function cmdPing() {
  await withPool(async (pool) => {
    const { rows } = await pool.query(`SELECT now() AS now, current_database() AS db`);
    console.log(`ok  db=${rows[0].db}  now=${rows[0].now.toISOString?.() ?? rows[0].now}`);
  });
}

async function cmdStatus() {
  await withPool(async (pool) => {
    await ensureMigrationsTable(pool);
    const applied = await appliedSet(pool);
    const files = listMigrationFiles();

    if (files.length === 0) {
      console.log("No migration files in migrations/");
      return;
    }

    console.log("Migrations:\n");
    for (const file of files) {
      const mark = applied.has(file) ? "✓ applied" : "· pending";
      console.log(`  ${mark.padEnd(10)}  ${file}`);
    }

    const pending = files.filter((f) => !applied.has(f)).length;
    console.log(`\n${files.length - pending} applied, ${pending} pending`);
  });
}

async function cmdMigrate() {
  await withPool(async (pool) => {
    await ensureMigrationsTable(pool);
    const applied = await appliedSet(pool);
    const files = listMigrationFiles();
    const pending = files.filter((f) => !applied.has(f));

    if (pending.length === 0) {
      console.log("No pending migrations.");
      return;
    }

    for (const file of pending) {
      const sql = readFileSync(join(migrationsDir, file), "utf8");
      console.log(`→ Applying ${file}…`);
      const client = await pool.connect();
      try {
        await client.query(sql);
        await client.query(`INSERT INTO schema_migrations (id) VALUES ($1)`, [file]);
        console.log(`  ✓ ${file}`);
      } catch (err) {
        console.error(`  ✗ ${file}`);
        throw err;
      } finally {
        client.release();
      }
    }

    console.log(`\nApplied ${pending.length} migration(s).`);
  });
}

const cmd = process.argv[2];

const commands = {
  migrate: cmdMigrate,
  status: cmdStatus,
  ping: cmdPing,
};

if (!cmd || !commands[cmd]) {
  console.log(`Usage: node scripts/db.mjs <command>

Commands:
  migrate   Apply pending SQL files in migrations/
  status    Show applied vs pending migrations
  ping      Test DATABASE_URL connectivity

DATABASE_URL is read from the environment or .dev.vars.`);
  process.exit(cmd ? 1 : 0);
}

commands[cmd]().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
