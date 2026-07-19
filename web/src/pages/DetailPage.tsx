import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Application, Document, DocumentType, Note, Reminder, Status } from "@shared/schema";
import { api } from "../lib/api";
import { StatusSelect } from "../components/StatusSelect";

export function DetailPage() {
  const { id } = useParams();
  const appId = Number(id);
  const navigate = useNavigate();

  const [app, setApp] = useState<Application | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [docs, setDocs] = useState<Document[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [noteBody, setNoteBody] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [remForm, setRemForm] = useState({ dueDate: "", message: "" });
  const [addingRem, setAddingRem] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState<DocumentType>("resume");

  const load = useCallback(async () => {
    if (!Number.isInteger(appId)) return;
    setError(null);
    try {
      const [a, n, r, d] = await Promise.all([
        api.getApplication(appId),
        api.listNotes(appId),
        api.listReminders(appId),
        api.listDocuments(appId),
      ]);
      setApp(a);
      setNotes(n);
      setReminders(r);
      setDocs(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [appId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!app) return;
    if (!app.industry.trim()) {
      setError("Industry is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateApplication(app.id, {
        company: app.company,
        roleTitle: app.roleTitle,
        industry: app.industry,
        location: app.location,
        jobUrl: app.jobUrl,
        status: app.status,
        appliedDate: app.appliedDate,
        salaryRange: app.salaryRange,
        source: app.source,
      });
      setApp(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function saveStatus(next: Status) {
    if (!app || app.status === next) return;
    const previous = app.status;
    setApp({ ...app, status: next });
    setStatusSaving(true);
    setError(null);
    try {
      const updated = await api.updateApplication(app.id, { status: next });
      setApp(updated);
    } catch (err) {
      setApp({ ...app, status: previous });
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setStatusSaving(false);
    }
  }

  async function onDeleteApp() {
    if (!app || !confirm("Delete this application? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await api.deleteApplication(app.id);
      navigate("/list");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setDeleting(false);
    }
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteBody.trim()) return;
    setAddingNote(true);
    try {
      const n = await api.createNote(appId, noteBody.trim());
      setNotes((list) => [...list, n]);
      setNoteBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAddingNote(false);
    }
  }

  async function removeNote(noteId: number) {
    try {
      await api.deleteNote(noteId);
      setNotes((list) => list.filter((n) => n.id !== noteId));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function addReminder(e: React.FormEvent) {
    e.preventDefault();
    if (!remForm.dueDate || !remForm.message.trim()) return;
    setAddingRem(true);
    try {
      const r = await api.createReminder(appId, remForm.dueDate, remForm.message.trim());
      setReminders((list) => [...list, r]);
      setRemForm({ dueDate: "", message: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAddingRem(false);
    }
  }

  async function toggleRem(r: Reminder) {
    try {
      const updated = await api.toggleReminder(r.id, !r.completed);
      setReminders((list) => list.map((x) => (x.id === r.id ? updated : x)));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function removeRem(id: number) {
    try {
      await api.deleteReminder(id);
      setReminders((list) => list.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const doc = await api.uploadDocument(file, docType, appId);
      setDocs((list) => [doc, ...list]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function removeDoc(id: number) {
    try {
      await api.deleteDocument(id);
      setDocs((list) => list.filter((d) => d.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  if (!Number.isInteger(appId)) {
    return <div className="error-banner">Invalid application id</div>;
  }

  if (!app) {
    return (
      <div className="page-enter">
        {error ? <div className="error-banner">{error}</div> : <p className="muted">Loading…</p>}
      </div>
    );
  }

  return (
    <div className="page-enter">
      <div className="page-head">
        <div>
          <Link to="/list" className="muted">
            ← List
          </Link>
          <h1 style={{ marginTop: "0.35rem" }}>
            {app.company} · {app.roleTitle}
          </h1>
        </div>
        <button
          type="button"
          className="btn btn-danger"
          disabled={deleting}
          onClick={onDeleteApp}
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="detail-grid">
        <form className="panel section" onSubmit={save}>
          <h2>Application</h2>
          <div className="form-grid">
            <div className="field">
              <label>Company</label>
              <input
                value={app.company}
                onChange={(e) => setApp({ ...app, company: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>Position</label>
              <input
                value={app.roleTitle}
                onChange={(e) => setApp({ ...app, roleTitle: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>Industry *</label>
              <input
                value={app.industry}
                onChange={(e) => setApp({ ...app, industry: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>Status</label>
              <StatusSelect
                value={app.status}
                disabled={statusSaving}
                onChange={saveStatus}
              />
              <span className="muted">Saves immediately when changed</span>
            </div>
            <div className="field">
              <label>Location</label>
              <input
                value={app.location ?? ""}
                onChange={(e) => setApp({ ...app, location: e.target.value || null })}
              />
            </div>
            <div className="field">
              <label>Salary</label>
              <input
                value={app.salaryRange ?? ""}
                onChange={(e) => setApp({ ...app, salaryRange: e.target.value || null })}
              />
            </div>
            <div className="field">
              <label>Source</label>
              <input
                value={app.source ?? ""}
                onChange={(e) => setApp({ ...app, source: e.target.value || null })}
              />
            </div>
            <div className="field">
              <label>Applied date</label>
              <input
                type="date"
                value={app.appliedDate ?? ""}
                onChange={(e) => setApp({ ...app, appliedDate: e.target.value || null })}
              />
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>Job URL</label>
              <input
                value={app.jobUrl ?? ""}
                onChange={(e) => setApp({ ...app, jobUrl: e.target.value || null })}
              />
            </div>
          </div>
          <div className="modal-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <section className="panel section">
            <h2>Notes</h2>
            {notes.map((n) => (
              <div key={n.id} className="thread-item">
                <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{n.body}</p>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.4rem" }}>
                  <span className="muted">{new Date(n.createdAt).toLocaleString()}</span>
                  <button type="button" className="btn btn-ghost" onClick={() => removeNote(n.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
            <form onSubmit={addNote} style={{ marginTop: "0.6rem" }}>
              <div className="field">
                <label>Add note</label>
                <textarea value={noteBody} onChange={(e) => setNoteBody(e.target.value)} />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ marginTop: "0.5rem" }}
                disabled={addingNote || !noteBody.trim()}
              >
                {addingNote ? "Adding…" : "Add note"}
              </button>
            </form>
          </section>

          <section className="panel section">
            <h2>Reminders</h2>
            {reminders.map((r) => (
              <div key={r.id} className={`reminder-item ${r.dueSoon ? "due-soon" : ""}`}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                  <label style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                    <input
                      type="checkbox"
                      checked={r.completed}
                      onChange={() => toggleRem(r)}
                    />
                    <span>
                      <strong>{r.dueDate}</strong>
                      {r.dueSoon && !r.completed && (
                        <span className="badge badge-due" style={{ marginLeft: "0.4rem" }}>
                          Due soon
                        </span>
                      )}
                      <br />
                      {r.message}
                    </span>
                  </label>
                  <button type="button" className="btn btn-ghost" onClick={() => removeRem(r.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
            <form onSubmit={addReminder} className="form-grid" style={{ marginTop: "0.6rem" }}>
              <div className="field">
                <label>Due date</label>
                <input
                  type="date"
                  required
                  value={remForm.dueDate}
                  onChange={(e) => setRemForm({ ...remForm, dueDate: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Message</label>
                <input
                  required
                  value={remForm.message}
                  onChange={(e) => setRemForm({ ...remForm, message: e.target.value })}
                />
              </div>
              <div style={{ alignSelf: "end" }}>
                <button type="submit" className="btn btn-primary" disabled={addingRem}>
                  {addingRem ? "Adding…" : "Add reminder"}
                </button>
              </div>
            </form>
          </section>

          <section className="panel section">
            <h2>Documents</h2>
            {docs.map((d) => (
              <div key={d.id} className="doc-item">
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                  <span>
                    <strong>{d.filename}</strong>
                    <span className="muted"> · {d.type.replace("_", " ")}</span>
                  </span>
                  <span style={{ display: "flex", gap: "0.35rem" }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => api.downloadDocument(d.id)}
                    >
                      Download
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => removeDoc(d.id)}>
                      Delete
                    </button>
                  </span>
                </div>
              </div>
            ))}
            <div className="form-grid" style={{ marginTop: "0.6rem" }}>
              <div className="field">
                <label>Type</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as DocumentType)}
                >
                  <option value="resume">Resume</option>
                  <option value="cover_letter">Cover letter</option>
                </select>
              </div>
              <div className="field">
                <label>Upload</label>
                <input type="file" onChange={onUpload} disabled={uploading} />
              </div>
            </div>
            {uploading && <p className="muted">Uploading…</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
