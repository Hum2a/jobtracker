# Docket

Personal single-owner job application tracker — Board, List, Detail, Stats, Settings — served as a React SPA from a Cloudflare Worker (Hono) with Neon Postgres, R2 document storage, and optional Resend digests.

## Stack

- **Frontend:** React + Vite + React Router + Recharts + `@dnd-kit`
- **API:** Cloudflare Worker (Hono)
- **DB:** Neon Postgres (`migrations/001_docket_schema.sql`)
- **Files:** R2 bucket `docket-docs` (binding `DOCS`)
- **Auth:** No login. Writes require `X-Api-Key`. Reads are open.

## First-time setup

1. **Install**
   ```bash
   npm install
   ```

2. **Migrate Neon** — run [`migrations/001_docket_schema.sql`](migrations/001_docket_schema.sql) in the Neon SQL editor. This renames the legacy `applications` table, creates Docket tables, and maps existing rows.

3. **Cloudflare login**
   ```bash
   npx wrangler login
   ```

4. **Create R2 buckets** (once)
   ```bash
   npx wrangler r2 bucket create docket-docs
   npx wrangler r2 bucket create docket-docs-preview
   ```

5. **Secrets**
   ```bash
   npm run secrets:db          # DATABASE_URL
   npm run secrets:key         # API_KEY
   npm run secrets:resend      # optional RESEND_API_KEY
   npm run secrets:digest-to   # optional DIGEST_TO
   npm run secrets:digest-from # optional DIGEST_FROM
   ```

6. **Local secrets** — put the same values in `.dev.vars` (gitignored):
   ```
   DATABASE_URL=...
   API_KEY=dev-local-key-change-me
   RESEND_API_KEY=
   DIGEST_TO=
   DIGEST_FROM=
   ```

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

Daily cron (`0 8 * * *`) runs the reminder digest when Resend + `DIGEST_TO` are set.

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
