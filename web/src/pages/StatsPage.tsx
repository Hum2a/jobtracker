import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Stats } from "@shared/schema";
import { api } from "../lib/api";

const COLORS = ["#5a6578", "#3b82f6", "#8b5cf6", "#0f6e56", "#e11d48"];

export function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setStats(await api.getStats());
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  if (error) return <div className="error-banner">{error}</div>;
  if (!stats) return <p className="muted page-enter">Loading stats…</p>;

  const statusData = Object.entries(stats.byStatus).map(([name, value]) => ({ name, value }));
  const reminderData = [
    { name: "Open", value: stats.reminderHealth.open },
    { name: "Due soon", value: stats.reminderHealth.dueSoon },
    { name: "Overdue", value: stats.reminderHealth.overdue },
    { name: "Completed", value: stats.reminderHealth.completed },
  ];

  return (
    <div className="page-enter">
      <div className="page-head">
        <h1>Stats</h1>
      </div>

      <div className="tiles stagger">
        <div className="panel tile panel-lift">
          <div className="label">Total</div>
          <div className="value">{stats.total}</div>
        </div>
        <div className="panel tile panel-lift">
          <div className="label">Open pipeline</div>
          <div className="value">{stats.openPipeline}</div>
        </div>
        <div className="panel tile panel-lift">
          <div className="label">Avg / week</div>
          <div className="value">{stats.avgPerWeek}</div>
        </div>
        <div className="panel tile panel-lift">
          <div className="label">Reminders open</div>
          <div className="value">{stats.remindersOpen}</div>
        </div>
        <div className="panel tile panel-lift">
          <div className="label">Due soon</div>
          <div className="value">{stats.remindersDueSoon}</div>
        </div>
        {Object.entries(stats.byStatus).map(([status, count]) => (
          <div key={status} className="panel tile panel-lift">
            <div className="label" style={{ textTransform: "capitalize" }}>
              {status}
            </div>
            <div className="value">{count}</div>
          </div>
        ))}
      </div>

      <div className="funnel">
        <span>Wishlist → Applied: {stats.funnel.wishlistToApplied}%</span>
        <span>Applied → Interview: {stats.funnel.appliedToInterview}%</span>
        <span>Interview → Offer: {stats.funnel.interviewToOffer}%</span>
      </div>

      <div className="charts">
        <div className="panel chart-panel">
          <h3>Status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={80} label>
                {statusData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="panel chart-panel">
          <h3>Reminder health</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={reminderData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d5dde8" />
              <XAxis dataKey="name" tick={{ fill: "#5a6578", fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fill: "#5a6578", fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#0f6e56" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel chart-panel">
          <h3>By industry</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.byIndustry.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d5dde8" />
              <XAxis dataKey="name" tick={{ fill: "#5a6578", fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fill: "#5a6578", fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#1a2332" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel chart-panel">
          <h3>By source</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.bySource.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d5dde8" />
              <XAxis dataKey="name" tick={{ fill: "#5a6578", fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fill: "#5a6578", fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#0f6e56" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel chart-panel">
          <h3>Per week</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.perWeek}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d5dde8" />
              <XAxis dataKey="week" tick={{ fill: "#5a6578", fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fill: "#5a6578", fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel chart-panel">
          <h3>Per month</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.perMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d5dde8" />
              <XAxis dataKey="month" tick={{ fill: "#5a6578", fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fill: "#5a6578", fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
