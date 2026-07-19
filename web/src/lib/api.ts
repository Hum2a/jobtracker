import type {
  Application,
  CreateApplication,
  UpdateApplication,
  Note,
  Reminder,
  Document,
  Stats,
  DocumentType,
} from "@shared/schema";

const KEY_STORAGE = "docket_api_key";

export function getApiKey(): string | null {
  let key = localStorage.getItem(KEY_STORAGE);
  if (!key) {
    key = window.prompt("Enter the Docket API key (saved in this browser):");
    if (key) localStorage.setItem(KEY_STORAGE, key);
  }
  return key;
}

export function clearApiKey() {
  localStorage.removeItem(KEY_STORAGE);
}

async function request<T>(
  path: string,
  opts: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const headers = new Headers(opts.headers);
  if (opts.auth) {
    const key = getApiKey();
    if (!key) throw new Error("API key required");
    headers.set("X-Api-Key", key);
  }
  if (opts.body && !(opts.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(path, { ...opts, headers });
  if (res.status === 401 && opts.auth) {
    clearApiKey();
    throw new Error("Invalid API key");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  listApplications: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<Application[]>(`/api/applications${qs}`);
  },
  getApplication: (id: number) => request<Application>(`/api/applications/${id}`),
  createApplication: (body: CreateApplication) =>
    request<Application>("/api/applications", {
      method: "POST",
      auth: true,
      body: JSON.stringify(body),
    }),
  updateApplication: (id: number, body: UpdateApplication) =>
    request<Application>(`/api/applications/${id}`, {
      method: "PATCH",
      auth: true,
      body: JSON.stringify(body),
    }),
  deleteApplication: (id: number) =>
    request<{ ok: boolean }>(`/api/applications/${id}`, { method: "DELETE", auth: true }),

  listNotes: (id: number) => request<Note[]>(`/api/applications/${id}/notes`),
  createNote: (id: number, body: string) =>
    request<Note>(`/api/applications/${id}/notes`, {
      method: "POST",
      auth: true,
      body: JSON.stringify({ body }),
    }),
  deleteNote: (id: number) =>
    request<{ ok: boolean }>(`/api/notes/${id}`, { method: "DELETE", auth: true }),

  listReminders: (id: number) => request<Reminder[]>(`/api/applications/${id}/reminders`),
  createReminder: (id: number, dueDate: string, message: string) =>
    request<Reminder>(`/api/applications/${id}/reminders`, {
      method: "POST",
      auth: true,
      body: JSON.stringify({ dueDate, message }),
    }),
  toggleReminder: (id: number, completed: boolean) =>
    request<Reminder>(`/api/reminders/${id}`, {
      method: "PATCH",
      auth: true,
      body: JSON.stringify({ completed }),
    }),
  deleteReminder: (id: number) =>
    request<{ ok: boolean }>(`/api/reminders/${id}`, { method: "DELETE", auth: true }),

  listDocuments: (applicationId: number | null) =>
    request<Document[]>(
      `/api/documents?applicationId=${applicationId === null ? "null" : applicationId}`
    ),
  uploadDocument: async (file: File, type: DocumentType, applicationId: number | null) => {
    const form = new FormData();
    form.append("file", file);
    form.append("type", type);
    if (applicationId != null) form.append("applicationId", String(applicationId));
    return request<Document>("/api/documents", { method: "POST", auth: true, body: form });
  },
  downloadDocument: async (id: number) => {
    const { url } = await request<{ url: string; expires: number }>(`/api/documents/${id}/url`, {
      auth: true,
    });
    window.open(url, "_blank");
  },
  deleteDocument: (id: number) =>
    request<{ ok: boolean }>(`/api/documents/${id}`, { method: "DELETE", auth: true }),

  getStats: () => request<Stats>("/api/stats"),

  importApplications: (payload: unknown) =>
    request<{ inserted: number[] }>("/api/import", {
      method: "POST",
      auth: true,
      body: JSON.stringify(payload),
    }),

  runDigest: () =>
    request<{ sent: boolean; reason?: string; count: number }>("/api/digest/run", {
      method: "POST",
      auth: true,
    }),

  sendTestEmail: () =>
    request<{ sent: boolean; reason?: string }>("/api/email/test", {
      method: "POST",
      auth: true,
    }),
};
