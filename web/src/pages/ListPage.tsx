import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Application, Status } from "@shared/schema";
import { STATUSES } from "@shared/schema";
import { api } from "../lib/api";
import { StatusSelect } from "../components/StatusSelect";

type SortKey =
  | "company"
  | "roleTitle"
  | "industry"
  | "status"
  | "salaryRange"
  | "location"
  | "source"
  | "appliedDate"
  | "updatedAt";

export function ListPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [industry, setIndustry] = useState("");
  const [position, setPosition] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir] = useState<-1 | 1>(-1);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [statusBusyId, setStatusBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setApps(await api.listApplications());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const industries = useMemo(
    () => [...new Set(apps.map((a) => a.industry).filter(Boolean))].sort(),
    [apps]
  );
  const positions = useMemo(
    () => [...new Set(apps.map((a) => a.roleTitle).filter(Boolean))].sort(),
    [apps]
  );

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    let list = apps.filter((r) => {
      if (status && r.status !== status) return false;
      if (industry && r.industry !== industry) return false;
      if (position && r.roleTitle !== position) return false;
      if (from && (r.appliedDate ?? "") < from) return false;
      if (to && (r.appliedDate ?? "") > to) return false;
      if (query) {
        const hay = [
          r.company,
          r.roleTitle,
          r.industry,
          r.location ?? "",
          r.source ?? "",
          r.salaryRange ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      const av = (a[sortKey] ?? "") as string;
      const bv = (b[sortKey] ?? "") as string;
      if (av < bv) return -1 * sortDir;
      if (av > bv) return 1 * sortDir;
      return 0;
    });
    return list;
  }, [apps, q, status, industry, position, from, to, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setSortDir(key === "updatedAt" ? -1 : 1);
    }
  }

  async function onDelete(id: number) {
    if (!confirm("Delete this application? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await api.deleteApplication(id);
      setApps((a) => a.filter((x) => x.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeleting(null);
    }
  }

  async function onStatusChange(id: number, next: Status) {
    const app = apps.find((a) => a.id === id);
    if (!app || app.status === next) return;
    const prev = apps;
    setStatusBusyId(id);
    setApps((list) => list.map((a) => (a.id === id ? { ...a, status: next } : a)));
    try {
      await api.updateApplication(id, { status: next });
    } catch (e) {
      setApps(prev);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setStatusBusyId(null);
    }
  }

  const th = (key: SortKey, label: string, className = "") => (
    <th className={className} onClick={() => toggleSort(key)}>
      {label}
      {sortKey === key ? (sortDir === 1 ? " ↑" : " ↓") : ""}
    </th>
  );

  return (
    <div className="page-enter">
      <div className="page-head">
        <h1>List</h1>
        <span className="muted">{filtered.length} shown</span>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="toolbar">
        <input
          type="search"
          placeholder="Search company, role, industry…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ minWidth: 220 }}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select value={industry} onChange={(e) => setIndustry(e.target.value)}>
          <option value="">All industries</option>
          {industries.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
        <select value={position} onChange={(e) => setPosition(e.target.value)}>
          <option value="">All positions</option>
          {positions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} title="From" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} title="To" />
      </div>

      <div className="panel table-wrap">
        <table className="data">
          <thead>
            <tr>
              {th("company", "Company", "col-company")}
              {th("roleTitle", "Position", "col-role")}
              {th("industry", "Industry")}
              {th("status", "Status", "col-status")}
              {th("salaryRange", "Salary", "col-salary")}
              {th("location", "Location")}
              {th("source", "Source", "col-source")}
              {th("appliedDate", "Applied", "col-date")}
              {th("updatedAt", "Updated", "col-updated")}
              <th className="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="empty">
                  No applications match.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id}>
                  <td className="col-company" title={r.company}>
                    {r.company}
                  </td>
                  <td className="col-role" title={r.roleTitle}>
                    {r.roleTitle}
                  </td>
                  <td title={r.industry}>{r.industry}</td>
                  <td className="col-status">
                    <StatusSelect
                      value={r.status}
                      disabled={statusBusyId === r.id}
                      onChange={(next) => onStatusChange(r.id, next)}
                    />
                  </td>
                  <td className="col-salary" title={r.salaryRange ?? ""}>
                    {r.salaryRange ?? ""}
                  </td>
                  <td title={r.location ?? ""}>{r.location ?? ""}</td>
                  <td className="col-source" title={r.source ?? ""}>
                    {r.source ?? ""}
                  </td>
                  <td className="col-date">{r.appliedDate ?? ""}</td>
                  <td className="col-date col-updated">{r.updatedAt?.slice(0, 10)}</td>
                  <td className="col-actions">
                    <span className="actions-cell">
                      <Link to={`/apps/${r.id}`}>Edit</Link>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ padding: "0.1rem 0.35rem", fontSize: "0.75rem" }}
                        disabled={deleting === r.id}
                        onClick={() => onDelete(r.id)}
                      >
                        {deleting === r.id ? "…" : "Del"}
                      </button>
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
