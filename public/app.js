const STATUSES = ["Applied", "Queued", "Interviewing", "Offer", "Rejected", "Skipped"];

let rows = [];
let sortKey = "id";
let sortDir = -1;

const tbody = document.getElementById("tbody");
const summaryEl = document.getElementById("summary");
const searchEl = document.getElementById("search");
const statusFilterEl = document.getElementById("statusFilter");
const categoryFilterEl = document.getElementById("categoryFilter");
const platformFilterEl = document.getElementById("platformFilter");

function getApiKey() {
  let key = localStorage.getItem("jobtracker_api_key");
  if (!key) {
    key = window.prompt("Enter the JobTracker API key (only needed once, saved in this browser):");
    if (key) localStorage.setItem("jobtracker_api_key", key);
  }
  return key;
}

function populateFilterOptions(select, values) {
  const current = select.value;
  select.querySelectorAll("option:not(:first-child)").forEach((o) => o.remove());
  [...new Set(values.filter(Boolean))].sort().forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    select.appendChild(opt);
  });
  select.value = current;
}

function applyFiltersAndSort() {
  const q = searchEl.value.trim().toLowerCase();
  const status = statusFilterEl.value;
  const category = categoryFilterEl.value;
  const platform = platformFilterEl.value;

  let filtered = rows.filter((r) => {
    if (status && r.status !== status) return false;
    if (category && r.category !== category) return false;
    if (platform && r.platform !== platform) return false;
    if (q) {
      const hay = `${r.company ?? ""} ${r.role ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    const av = a[sortKey] ?? "";
    const bv = b[sortKey] ?? "";
    if (av < bv) return -1 * sortDir;
    if (av > bv) return 1 * sortDir;
    return 0;
  });

  render(filtered);
}

function render(list) {
  tbody.innerHTML = "";
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10">No applications match.</td></tr>`;
    return;
  }

  for (const r of list) {
    const tr = document.createElement("tr");

    const statusSelect = document.createElement("select");
    statusSelect.className = `status-select status-${r.status}`;
    for (const s of STATUSES) {
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s;
      if (s === r.status) opt.selected = true;
      statusSelect.appendChild(opt);
    }
    statusSelect.addEventListener("change", async () => {
      const newStatus = statusSelect.value;
      const key = getApiKey();
      if (!key) return;
      try {
        const res = await fetch(`/api/applications/${r.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "X-Api-Key": key },
          body: JSON.stringify({ status: newStatus }),
        });
        if (res.status === 401) {
          localStorage.removeItem("jobtracker_api_key");
          alert("Invalid API key, please try again.");
          return;
        }
        if (!res.ok) throw new Error(await res.text());
        r.status = newStatus;
        statusSelect.className = `status-select status-${newStatus}`;
      } catch (err) {
        alert("Failed to update status: " + err.message);
      }
    });

    tr.innerHTML = `
      <td>${r.id}</td>
      <td>${escapeHtml(r.company)}</td>
      <td>${escapeHtml(r.role)}</td>
      <td>${escapeHtml(r.category ?? "")}</td>
      <td>${escapeHtml(r.platform ?? "")}</td>
      <td>${escapeHtml(r.location ?? "")}</td>
      <td>${escapeHtml(r.salary ?? "")}</td>
      <td class="status-cell"></td>
      <td>${escapeHtml(r.date_applied ?? "")}</td>
      <td>${r.url ? `<a href="${escapeAttr(r.url)}" target="_blank" rel="noopener">Open</a>` : ""}</td>
    `;
    tr.querySelector(".status-cell").appendChild(statusSelect);
    tbody.appendChild(tr);
  }
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttr(str) {
  return escapeHtml(str).replaceAll('"', "&quot;");
}

async function loadData() {
  tbody.innerHTML = `<tr><td colspan="10">Loading...</td></tr>`;
  try {
    const res = await fetch("/api/applications");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    rows = await res.json();

    populateFilterOptions(statusFilterEl, rows.map((r) => r.status));
    populateFilterOptions(categoryFilterEl, rows.map((r) => r.category));
    populateFilterOptions(platformFilterEl, rows.map((r) => r.platform));

    const counts = rows.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, {});
    summaryEl.textContent = `${rows.length} total — ` +
      Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(" · ");

    applyFiltersAndSort();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="10">Failed to load: ${escapeHtml(err.message)}</td></tr>`;
  }
}

document.querySelectorAll("th[data-key]").forEach((th) => {
  th.addEventListener("click", () => {
    const key = th.dataset.key;
    if (sortKey === key) {
      sortDir *= -1;
    } else {
      sortKey = key;
      sortDir = 1;
    }
    applyFiltersAndSort();
  });
});

searchEl.addEventListener("input", applyFiltersAndSort);
statusFilterEl.addEventListener("change", applyFiltersAndSort);
categoryFilterEl.addEventListener("change", applyFiltersAndSort);
platformFilterEl.addEventListener("change", applyFiltersAndSort);
document.getElementById("refresh").addEventListener("click", loadData);

loadData();
