import { useCallback, useEffect, useState } from "react";
import type { Document, DocumentType } from "@shared/schema";
import { api } from "../lib/api";

export function SettingsPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState<DocumentType>("resume");
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [digestBusy, setDigestBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setDocs(await api.listDocuments(null));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const doc = await api.uploadDocument(file, docType, null);
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

  async function onImport(e: React.FormEvent) {
    e.preventDefault();
    setImporting(true);
    setError(null);
    setMessage(null);
    try {
      const payload = JSON.parse(importText) as unknown;
      const result = await api.importApplications(payload);
      setMessage(`Imported ${result.inserted.length} application(s).`);
      setImportText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setImporting(false);
    }
  }

  async function onDigest() {
    setDigestBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api.runDigest();
      setMessage(
        result.sent
          ? `Digest sent (${result.count} reminder(s)).`
          : `Digest skipped: ${result.reason ?? "unknown"}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDigestBusy(false);
    }
  }

  return (
    <div className="page-enter">
      <div className="page-head">
        <h1>Settings</h1>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {message && (
        <div className="panel section" style={{ marginBottom: "1rem", color: "var(--accent)" }}>
          {message}
        </div>
      )}

      <div className="detail-grid">
        <section className="panel section">
          <h2>Global templates</h2>
          <p className="muted">
            Resume and cover letter templates not tied to a specific application.
          </p>
          {docs.map((d) => (
            <div key={d.id} className="doc-item">
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                <span>
                  <strong>{d.filename}</strong>
                  <span className="muted"> · {d.type.replace("_", " ")}</span>
                </span>
                <span style={{ display: "flex", gap: "0.35rem" }}>
                  <button type="button" className="btn" onClick={() => api.downloadDocument(d.id)}>
                    Download
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => removeDoc(d.id)}>
                    Delete
                  </button>
                </span>
              </div>
            </div>
          ))}
          {docs.length === 0 && <p className="empty">No templates yet.</p>}
          <div className="form-grid" style={{ marginTop: "0.75rem" }}>
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

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <section className="panel section">
            <h2>Bulk import</h2>
            <p className="muted">
              Paste JSON with an <code>applications</code> array (optional nested notes/reminders).
            </p>
            <form onSubmit={onImport}>
              <div className="field">
                <label>JSON</label>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  style={{ minHeight: 160, fontFamily: "ui-monospace, monospace", fontSize: "0.85rem" }}
                  placeholder={`{\n  "applications": [{ "company": "", "roleTitle": "", "industry": "" }]\n}`}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ marginTop: "0.6rem" }}
                disabled={importing || !importText.trim()}
              >
                {importing ? "Importing…" : "Import"}
              </button>
            </form>
          </section>

          <section className="panel section">
            <h2>Reminder digest</h2>
            <p className="muted">
              Daily cron sends due-soon reminders when Resend is configured. Trigger manually to
              test.
            </p>
            <button type="button" className="btn" disabled={digestBusy} onClick={onDigest}>
              {digestBusy ? "Running…" : "Run digest now"}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
