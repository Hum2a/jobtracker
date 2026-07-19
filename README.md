# Docket

Personal single-owner job application tracker — Board, List, Detail, Stats, Settings — served as a React SPA from a Cloudflare Worker (Hono) with Neon Postgres, R2 document storage, and optional Resend emails (create/status alerts + daily digests).

## Stack

- **Frontend:** React + Vite + React Router + Recharts + `@dnd-kit`
- **API:** Cloudflare Worker (Hono)
- **DB:** Neon Postgres (`migrations/001_docket_schema.sql`)
- **Files:** R2 bucket `docket-documents` (binding `DOCS`)
- **Auth:** No login. Writes require `X-Api-Key`. Reads are open.

## First-time setup

1. **Install**
   ```bash
   npm install
   ```

2. **Local secrets** — create `.dev.vars` (gitignored):
   ```
   DATABASE_URL=...
   API_KEY=dev-local-key-change-me
   RESEND_API_KEY=
   DIGEST_TO=
   DIGEST_FROM=
   ```

3. **Migrate Neon** (reads `DATABASE_URL` from `.dev.vars`):
   ```bash
   npm run db:ping      # connectivity check
   npm run db:status    # pending vs applied
   npm run db:migrate   # apply migrations/*.sql
   ```
   This renames the legacy `applications` table, creates Docket tables, and maps existing rows. Already applied manually? Mark it so migrate skips it:
   ```sql
   CREATE TABLE IF NOT EXISTS schema_migrations (
     id TEXT PRIMARY KEY,
     applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
   );
   INSERT INTO schema_migrations (id) VALUES ('001_docket_schema.sql')
   ON CONFLICT DO NOTHING;
   ```

4. **Cloudflare login**
   ```bash
   npx wrangler login
   ```

5. **R2 bucket** — uses existing `docket-documents` (create with `npm run r2:create` if missing).

6. **Production secrets**
   ```bash
   npm run secrets:db          # DATABASE_URL
   npm run secrets:key         # API_KEY
   npm run secrets:resend      # RESEND_API_KEY (event emails + digests)
   npm run secrets:digest-to   # DIGEST_TO (your inbox)
   npm run secrets:digest-from # DIGEST_FROM e.g. Docket <alerts@your-verified-domain>
   ```
   After Resend is set, use **Settings → Send test email** to verify delivery.

7. **Build & deploy**
   ```bash
   npm run deploy
   ```
   Live at `https://jobtracker.humza-butt.space` (custom domain in `wrangler.toml`).

## Local development

```bash
npm run dev
```

Runs Vite on `http://localhost:5173` (proxies `/api` → Worker) and `wrangler dev` on `http://localhost:8787`.

Or build the SPA and serve everything from the Worker:

```bash
npm run build:web
npx wrangler dev
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Vite + Wrangler together |
| `npm run build:web` | Build React app → `dist/` |
| `npm run deploy` | Build + `wrangler deploy` |
| `npm run typecheck` | Worker + web TypeScript |
| `npm run db:migrate` | Apply pending `migrations/*.sql` |
| `npm run db:status` | Show applied vs pending migrations |
| `npm run db:ping` | Test DB connectivity |
| `npm run r2:create` | Create R2 buckets for docs |

## API overview

| Method | Path | Auth |
|---|---|---|
| GET | `/api/health` | — |
| GET/POST | `/api/applications` | write: key |
| GET/PATCH/DELETE | `/api/applications/:id` | write: key |
| GET/POST | `/api/applications/:id/notes` | write: key |
| DELETE | `/api/notes/:id` | key |
| GET/POST | `/api/applications/:id/reminders` | write: key |
| PATCH/DELETE | `/api/reminders/:id` | key |
| GET/POST | `/api/documents` | write: key |
| GET | `/api/documents/:id/url` | key (signed download) |
| DELETE | `/api/documents/:id` | key |
| GET | `/api/stats` | — |
| POST | `/api/import` | key |
| POST | `/api/digest/run` | key |
| POST | `/api/email/test` | key |

When `RESEND_API_KEY` + `DIGEST_TO` are set, creating an application or changing its status sends a detailed email (bulk import does not). Daily cron (`0 8 * * *`) still runs the reminder digest.

## Import JSON shape

```json
{
  "applications": [{
    "company": "",
    "roleTitle": "",
    "industry": "",
    "status": "wishlist",
    "location": "",
    "jobUrl": "",
    "appliedDate": "YYYY-MM-DD",
    "salaryRange": "",
    "source": "",
    "notes": ["..."],
    "reminders": [{ "dueDate": "YYYY-MM-DD", "message": "" }]
  }]
}
```

## Product notes

- Single owner, no multi-user / login / billing
- Notes are create/delete only (no edit)
- Reminder fields are not editable after create (toggle complete / delete)
- App deletes confirm; notes / reminders / docs do not
- Due soon = incomplete reminder due within 3 days
