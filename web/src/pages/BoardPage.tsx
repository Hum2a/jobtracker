import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
  useDroppable,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Application, Status } from "@shared/schema";
import { STATUSES } from "@shared/schema";
import { api } from "../lib/api";
import { Modal } from "../components/Modal";
import { StatusSelect } from "../components/StatusSelect";

const STATUS_LABEL: Record<Status, string> = {
  wishlist: "Wishlist",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

function Card({
  app,
  busy,
  onDelete,
  onStatusChange,
}: {
  app: Application;
  busy?: boolean;
  onDelete: (id: number) => void;
  onStatusChange: (id: number, status: Status) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(app.id),
    data: { app },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`card ${isDragging ? "dragging" : ""}`}
      {...listeners}
      {...attributes}
    >
      <h3>{app.company}</h3>
      <p className="meta">{app.roleTitle}</p>
      <p className="meta">{app.industry}</p>
      {app.salaryRange && <p className="meta">{app.salaryRange}</p>}
      {app.appliedDate && <p className="meta">Applied {app.appliedDate}</p>}
      <StatusSelect
        value={app.status}
        disabled={busy}
        stopDrag
        onChange={(status) => onStatusChange(app.id, status)}
      />
      <div className="card-actions">
        <div>
          {app.dueSoon && <span className="badge badge-due">Due</span>}
        </div>
        <div style={{ display: "flex", gap: "0.35rem" }}>
          <Link to={`/apps/${app.id}`} onPointerDown={(e) => e.stopPropagation()}>
            Open
          </Link>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: "0.2rem 0.45rem", fontSize: "0.8rem" }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onDelete(app.id)}
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

function Column({
  status,
  apps,
  busyId,
  onDelete,
  onStatusChange,
}: {
  status: Status;
  apps: Application[];
  busyId: number | null;
  onDelete: (id: number) => void;
  onStatusChange: (id: number, status: Status) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      className={`column ${status}`}
      style={{ outline: isOver ? "2px solid var(--accent)" : undefined }}
    >
      <div className="column-head">
        <h2>{STATUS_LABEL[status]}</h2>
        <span className="column-count">{apps.length}</span>
      </div>
      {apps.length === 0 ? (
        <div className="empty">No applications</div>
      ) : (
        apps.map((a) => (
          <Card
            key={a.id}
            app={a}
            busy={busyId === a.id}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
          />
        ))
      )}
    </section>
  );
}

export function BoardPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [form, setForm] = useState({
    company: "",
    roleTitle: "",
    industry: "",
    salaryRange: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setApps(await api.listApplications());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const byStatus = useMemo(() => {
    const map: Record<Status, Application[]> = {
      wishlist: [],
      applied: [],
      interview: [],
      offer: [],
      rejected: [],
    };
    for (const a of apps) map[a.status].push(a);
    return map;
  }, [apps]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  async function onDelete(id: number) {
    if (!confirm("Delete this application? This cannot be undone.")) return;
    const prev = apps;
    setApps((a) => a.filter((x) => x.id !== id));
    try {
      await api.deleteApplication(id);
    } catch (e) {
      setApps(prev);
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function onStatusChange(id: number, status: Status) {
    const app = apps.find((a) => a.id === id);
    if (!app || app.status === status) return;

    const prev = apps;
    setBusyId(id);
    setApps((list) => list.map((a) => (a.id === id ? { ...a, status } : a)));
    try {
      await api.updateApplication(id, { status });
    } catch (err) {
      setApps(prev);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const appId = Number(active.id);

    let newStatus: Status | null = null;
    if (STATUSES.includes(over.id as Status)) {
      newStatus = over.id as Status;
    } else {
      const overApp = apps.find((a) => String(a.id) === String(over.id));
      if (overApp) newStatus = overApp.status;
    }
    if (!newStatus) return;

    const app = apps.find((a) => a.id === appId);
    if (!app || app.status === newStatus) return;

    const prev = apps;
    setApps((list) =>
      list.map((a) => (a.id === appId ? { ...a, status: newStatus } : a))
    );

    try {
      await api.updateApplication(appId, { status: newStatus });
    } catch (err) {
      setApps(prev);
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company.trim() || !form.roleTitle.trim() || !form.industry.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await api.createApplication({
        company: form.company.trim(),
        roleTitle: form.roleTitle.trim(),
        industry: form.industry.trim(),
        salaryRange: form.salaryRange.trim() || null,
        status: "wishlist",
      });
      setApps((a) => [created, ...a]);
      setForm({ company: "", roleTitle: "", industry: "", salaryRange: "" });
      setShowCreate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  const activeApp = activeId ? apps.find((a) => String(a.id) === activeId) : null;

  return (
    <div className="page-enter">
      <div className="page-head">
        <h1>Board</h1>
        <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
          Quick create
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : apps.length === 0 ? (
        <div className="panel section">
          <p className="empty">No applications yet. Create your first one to fill the board.</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <div className="board stagger">
            {STATUSES.map((s) => (
              <Column
                key={s}
                status={s}
                apps={byStatus[s]}
                busyId={busyId}
                onDelete={onDelete}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>
          <DragOverlay>
            {activeApp ? (
              <article className="card dragging">
                <h3>{activeApp.company}</h3>
                <p className="meta">{activeApp.roleTitle}</p>
              </article>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {showCreate && (
        <Modal title="Quick create" onClose={() => setShowCreate(false)}>
          <form onSubmit={onCreate}>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="company">Company *</label>
                <input
                  id="company"
                  required
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="role">Position *</label>
                <input
                  id="role"
                  required
                  value={form.roleTitle}
                  onChange={(e) => setForm({ ...form, roleTitle: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="industry">Industry *</label>
                <input
                  id="industry"
                  required
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="salary">Salary (optional)</label>
                <input
                  id="salary"
                  value={form.salaryRange}
                  onChange={(e) => setForm({ ...form, salaryRange: e.target.value })}
                />
              </div>
            </div>
            <p className="muted" style={{ marginTop: "0.75rem" }}>
              New applications start in Wishlist.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Create"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
