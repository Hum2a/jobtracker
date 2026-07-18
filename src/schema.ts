// Mirrors the Neon `applications` table exactly. No migration needed;
// this is the same schema already used via the Neon SQL editor.

export interface Application {
  id: number;
  company: string;
  role: string;
  category: string | null;
  platform: string | null;
  location: string | null;
  salary: string | null;
  stack_match: string | null;
  cv_used: string | null;
  status: string;
  date_applied: string | null;
  job_ref: string | null;
  url: string | null;
  next_action: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Body shape accepted by POST /api/applications (one job, or wrap many in
// { applications: [...] }, or just post an array directly).
export interface NewApplication {
  company: string;
  role: string;
  category?: string | null;
  platform?: string | null;
  location?: string | null;
  salary?: string | null;
  stack_match?: string | null;
  cv_used?: string | null;
  status?: string | null; // defaults to "Applied"
  date_applied?: string | null;
  job_ref?: string | null;
  url?: string | null;
  next_action?: string | null;
  notes?: string | null;
}

// Body shape accepted by PATCH /api/applications/:id. Any subset of fields.
export type ApplicationUpdate = Partial<Omit<NewApplication, "company" | "role">> & {
  company?: string;
  role?: string;
};

export interface Env {
  DATABASE_URL: string;
  API_KEY: string;
}
