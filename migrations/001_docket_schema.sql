-- Docket schema migration.
-- Run once against Neon. Safe to re-run only if applications_legacy does not already exist.

BEGIN;

-- 1. Preserve legacy table
ALTER TABLE IF EXISTS applications RENAME TO applications_legacy;

-- 2. New applications table
CREATE TABLE IF NOT EXISTS applications (
  id            SERIAL PRIMARY KEY,
  company       TEXT NOT NULL,
  role_title    TEXT NOT NULL,
  industry      TEXT NOT NULL,
  location      TEXT,
  job_url       TEXT,
  status        TEXT NOT NULL DEFAULT 'wishlist'
                CHECK (status IN ('wishlist', 'applied', 'interview', 'offer', 'rejected')),
  applied_date  DATE,
  salary_range  TEXT,
  source        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS applications_status_idx ON applications (status);
CREATE INDEX IF NOT EXISTS applications_updated_idx ON applications (updated_at DESC);
CREATE INDEX IF NOT EXISTS applications_industry_idx ON applications (industry);

-- 3. Notes (create/delete only)
CREATE TABLE IF NOT EXISTS notes (
  id              SERIAL PRIMARY KEY,
  application_id  INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  body            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notes_application_idx ON notes (application_id);

-- 4. Reminders
CREATE TABLE IF NOT EXISTS reminders (
  id              SERIAL PRIMARY KEY,
  application_id  INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  due_date        DATE NOT NULL,
  message         TEXT NOT NULL,
  completed       BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reminders_application_idx ON reminders (application_id);
CREATE INDEX IF NOT EXISTS reminders_due_idx ON reminders (due_date) WHERE NOT completed;

-- 5. Documents (application_id NULL = Settings templates)
CREATE TABLE IF NOT EXISTS documents (
  id              SERIAL PRIMARY KEY,
  type            TEXT NOT NULL CHECK (type IN ('resume', 'cover_letter')),
  filename        TEXT NOT NULL,
  storage_key     TEXT NOT NULL UNIQUE,
  application_id  INTEGER REFERENCES applications(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS documents_application_idx ON documents (application_id);

-- 6. Map legacy rows into Docket schema
INSERT INTO applications (
  id, company, role_title, industry, location, job_url, status,
  applied_date, salary_range, source, created_at, updated_at
)
SELECT
  id,
  company,
  role,
  COALESCE(NULLIF(TRIM(category::text), ''), 'Unknown'),
  location,
  url,
  CASE status
    WHEN 'Queued' THEN 'wishlist'
    WHEN 'Applied' THEN 'applied'
    WHEN 'Interviewing' THEN 'interview'
    WHEN 'Offer' THEN 'offer'
    WHEN 'Rejected' THEN 'rejected'
    WHEN 'Skipped' THEN 'rejected'
    ELSE 'wishlist'
  END,
  -- date_applied is a timestamp in the legacy table (not text)
  CASE
    WHEN date_applied IS NULL THEN NULL
    ELSE date_applied::date
  END,
  salary,
  platform,
  created_at,
  updated_at
FROM applications_legacy
ON CONFLICT (id) DO NOTHING;

-- Reset serial to max(id)
SELECT setval(
  pg_get_serial_sequence('applications', 'id'),
  COALESCE((SELECT MAX(id) FROM applications), 1),
  true
);

-- 7. Convert flat notes text into note rows
INSERT INTO notes (application_id, body, created_at)
SELECT id, notes, COALESCE(updated_at, created_at, now())
FROM applications_legacy
WHERE notes IS NOT NULL AND TRIM(notes::text) <> '';

-- Optional: keep status_history pointing at new applications ids (same ids preserved).
-- No schema change required if FK was never enforced.

COMMIT;

-- After verifying counts, you may drop the legacy table:
-- DROP TABLE IF EXISTS applications_legacy;
