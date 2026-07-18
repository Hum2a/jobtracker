# JobTracker

Live dashboard + write API for the job search Neon database. See `../JobTracker-Scope.md` for the full design writeup.

## What's here

Single Cloudflare Worker (Hono) serving both the API (`/api/*`) and the static dashboard (`public/`). Talks to the existing Neon Postgres `applications` / `status_history` tables over HTTP via `@neondatabase/serverless` — no schema changes, same data as the Neon SQL editor workflow.

Already done and verified locally: `npm install`, `tsc --noEmit` (clean), `wrangler dev` (static assets serve, auth middleware rejects unkeyed writes, validation rejects incomplete jobs). The only thing not verified from this machine is a live query against Neon, since this sandbox's network can't reach it directly — that will work fine once deployed, since Cloudflare's network isn't restricted the way this one is.

## First-time setup (run these yourself)

1. **Install dependencies** (from this folder):
   ```
   npm install
   ```

2. **Log in to Cloudflare** (opens a browser window):
   ```
   npx wrangler login
   ```

3. **Set the two secrets.** `DATABASE_URL` is the same Neon connection string already in use. `API_KEY` should be a new random string, generate one yourself, e.g.:
   ```
   openssl rand -hex 32
   ```
   Then set both:
   ```
   npm run secrets:db
   npm run secrets:key
   ```
   Each command prompts you to paste the value, nothing is stored in this repo.

4. **Make sure `humza-butt.space` is on Cloudflare** (DNS proxied through Cloudflare, orange cloud). If it isn't set up yet, either add it first or comment out the `routes` block in `wrangler.toml` for the first deploy and add the custom domain afterwards from the Cloudflare dashboard (Workers & Pages → jobtracker → Settings → Domains & Routes).

5. **Deploy:**
   ```
   npm run deploy
   ```
   This runs `wrangler deploy`, which builds and ships the Worker + static assets in one step, and (once the domain is wired up) makes the site live at `jobtracker.humza-butt.space`.

6. **Smoke test:**
   ```
   curl https://jobtracker.humza-butt.space/api/health
   ```
   Should return `{"ok":true,"db":"connected"}`. Then load the site in a browser and confirm the table renders.

## Local development

```
npm run dev
```
Runs the same Worker locally via Miniflare on `http://localhost:8787`, using `.dev.vars` for secrets (already populated with the real `DATABASE_URL` and a placeholder `API_KEY` of `dev-local-key-change-me`, gitignored, never committed).

## Using the API (this is the part that matters for Claude)

All write calls need `X-Api-Key: <the API_KEY secret>`.

Add one or many applications:
```
curl -X POST https://jobtracker.humza-butt.space/api/applications \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: <key>" \
  -d '{"company":"Acme","role":"Software Engineer","platform":"Reed","job_ref":"12345","status":"Applied","date_applied":"2026-07-14 09:00","url":"https://..."}'
```
Or post `{"applications": [ {...}, {...} ]}` for a batch. Duplicates (same `platform` + `job_ref`) are silently skipped — safe to re-post the same job twice by accident.

Update a status:
```
curl -X PATCH https://jobtracker.humza-butt.space/api/applications/429 \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: <key>" \
  -d '{"status":"Interviewing"}'
```

Read (no auth needed):
```
curl https://jobtracker.humza-butt.space/api/applications
```

## Known trade-off

The dashboard is public but unlisted (no login). The inline status dropdown on the page asks for the API key once via a browser prompt and caches it in `localStorage`, so the key is never shipped in the page source, but anyone who has both the URL and the key can write to the table. Fine for this project's stakes; revisit if that ever changes.
