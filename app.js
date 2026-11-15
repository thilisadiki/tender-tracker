// app.js - South African Tender Tracker (Gauteng & Limpopo Specialization)

const state = {
  tenders: [],
  stats: {},
  discovery: [],
  filters: {
    province: "All",
    sector: "All",
    category: "All",
    status: "All",
    priority: "All",
    search: ""
  },
  currentView: "dashboard",
  activeTenderId: null,
  alertConfig: {}
};

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  setupFilterListeners();
  setupModalListeners();
  setupAlertModal();
  setupCalculator();
  loadAllData();
});

async function loadAllData() {
  await Promise.all([
    fetchTenders(),
    fetchStats(),
    fetchDiscovery(),
    loadAlertConfig()
  ]);
}

// --- Navigation ---
function setupNavigation() {
  const tabButtons = document.querySelectorAll(".nav-tab-btn");
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      tabButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const targetView = btn.getAttribute("data-view");
      switchView(targetView);
    });
  });

  document.getElementById("btn-view-urgent").addEventListener("click", () => {
    state.filters.status = "All";
    document.getElementById("filter-status").value = "All";
    switchView("kanban");
  });
}

function switchView(viewName) {
  state.currentView = viewName;
  document.querySelectorAll(".tab-view").forEach(view => {
    view.style.display = "none";
  });
  
  const activeEl = document.getElementById(`view-${viewName}`);
  if (activeEl) {
    activeEl.style.display = "block";
  }

  document.querySelectorAll(".nav-tab-btn").forEach(b => {
    b.classList.toggle("active", b.getAttribute("data-view") === viewName);
  });

  renderCurrentView();
}

function renderCurrentView() {
  if (state.currentView === "dashboard") {
    renderDashboard();
  } else if (state.currentView === "kanban") {
    renderKanban();
  } else if (state.currentView === "table") {
    renderTable();
  } else if (state.currentView === "discovery") {
    renderDiscovery();
  }
}

// --- Currency Formatter (ZAR / R) ---
function fmtZAR(val) {
  return "R " + Number(val || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

// --- API Calls ---
async function fetchTenders() {
  try {
    const params = new URLSearchParams();
    if (state.filters.province !== "All") params.append("province", state.filters.province);
    if (state.filters.sector !== "All") params.append("sector", state.filters.sector);
    if (state.filters.category !== "All") params.append("category", state.filters.category);
    if (state.filters.status !== "All") params.append("status", state.filters.status);
    if (state.filters.priority !== "All") params.append("priority", state.filters.priority);
    if (state.filters.search.trim()) params.append("search", state.filters.search.trim());

    const res = await fetch(`/api/tenders?${params.toString()}`);
    if (res.ok) {
      state.tenders = await res.json();
      renderCurrentView();
    }
  } catch (err) {
    console.error("Error fetching tenders:", err);
    showToast("Error loading South African tenders", "error");
  }
}

async function fetchStats() {
  try {
    const res = await fetch("/api/stats");
    if (res.ok) {
      state.stats = await res.json();
      renderKPIs();
      renderBreakdowns();
      checkUrgentDeadlines();
    }
  } catch (err) {
    console.error("Error fetching stats:", err);
  }
}

async function fetchDiscovery() {
  try {
    const res = await fetch("/api/discover");
    if (res.ok) {
      state.discovery = await res.json();
      if (state.currentView === "discovery") {
        renderDiscovery();
      }
    }
  } catch (err) {
    console.error("Error fetching discovery feed:", err);
  }
}

async function loadAlertConfig() {
  try {
    const res = await fetch("/api/alerts/config");
    if (res.ok) {
      state.alertConfig = await res.json();
      if (document.getElementById("cfg-wa-number")) {
        const phone = state.alertConfig.whatsapp_number || "+27727655204";
        document.getElementById("cfg-wa-number").value = phone;
        document.getElementById("cfg-wa-enabled").checked = !!state.alertConfig.whatsapp_enabled;
        document.getElementById("cfg-wa-provider").value = state.alertConfig.whatsapp_provider || "callmebot";
        if (document.getElementById("cfg-wa-apikey")) {
          document.getElementById("cfg-wa-apikey").value = state.alertConfig.callmebot_api_key || "";
        }
        document.getElementById("cfg-em-address").value = state.alertConfig.recipient_email || "";
        document.getElementById("cfg-em-enabled").checked = !!state.alertConfig.email_enabled;
        updateDirectWaLink(phone);
      }
    }
  } catch (err) {
    console.error("Error loading alert config:", err);
  }
}

function updateDirectWaLink(phone) {
  const directBtn = document.getElementById("btn-open-wa-direct");
  if (!directBtn) return;
  const clean = (phone || "").replace(/[^0-9]/g, "");
  const formatted = clean.startsWith("0") ? "27" + clean.slice(1) : (clean.startsWith("27") ? clean : "27" + clean);
  const msg = encodeURIComponent("🚨 *TenderPulse SA Alert Verification*\n\n✅ WhatsApp alerts active for Gauteng & Limpopo tenders!\nLive URL: https://tenders.thilisadiki.dev");
  directBtn.href = `https://wa.me/${formatted}?text=${msg}`;
}

// --- KPI Rendering ---
function renderKPIs() {
  const s = state.stats;
  if (!s) return;

  document.getElementById("stat-active-count").textContent = `${s.active_tenders || 0} Bids`;
  document.getElementById("stat-active-val").textContent = fmtZAR(s.active_pipeline_value);

  const gov = (s.by_sector && s.by_sector["Government"]) || { count: 0, value: 0 };
  document.getElementById("stat-gov-count").textContent = `${gov.count} Tenders`;
  document.getElementById("stat-gov-val").textContent = fmtZAR(gov.value);

  const pvt = (s.by_sector && s.by_sector["Private Sector"]) || { count: 0, value: 0 };
  document.getElementById("stat-pvt-count").textContent = `${pvt.count} RFPs`;
  document.getElementById("stat-pvt-val").textContent = fmtZAR(pvt.value);

  document.getElementById("stat-urgent-count").textContent = s.closing_soon_count || 0;

  document.getElementById("stat-win-rate").textContent = `${s.win_rate || 0}% Win Rate`;
  document.getElementById("stat-won-val").textContent = fmtZAR(s.won_value);
  document.getElementById("stat-won-count").textContent = `${s.won_tenders || 0} awarded contracts`;
}

function checkUrgentDeadlines() {
  const count = state.stats.closing_soon_count || 0;
  const banner = document.getElementById("urgent-alert");
  const textEl = document.getElementById("urgent-alert-text");

  if (count > 0) {
    banner.style.display = "flex";
    textEl.textContent = `You have ${count} tender(s) in Gauteng/Limpopo closing within 7 days. Ensure compulsory briefing certificates and SBD 4/6.1 forms are in order.`;
  } else {
    banner.style.display = "none";
  }
}

function renderBreakdowns() {
  const container = document.getElementById("breakdown-bars");
  if (!container || !state.stats) return;

  const totalVal = state.stats.total_pipeline_value || 1;
  const byProv = state.stats.by_province || {};
  const byCat = state.stats.by_category || {};

  const gpVal = byProv["Gauteng"] ? byProv["Gauteng"].value : 0;
  const lpVal = byProv["Limpopo"] ? byProv["Limpopo"].value : 0;

  const softVal = byCat["Software & Systems Development"] ? byCat["Software & Systems Development"].value : 0;
  const mktVal = byCat["Digital Marketing"] ? byCat["Digital Marketing"].value : 0;

  const gpPct = Math.round((gpVal / totalVal) * 100);
  const lpPct = Math.round((lpVal / totalVal) * 100);
  const softPct = Math.round((softVal / totalVal) * 100);
  const mktPct = Math.round((mktVal / totalVal) * 100);

  container.innerHTML = `
    <div>
      <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:4px;">
        <span><strong>📍 Gauteng:</strong> ${fmtZAR(gpVal)} (${gpPct}%)</span>
        <span><strong>📍 Limpopo:</strong> ${fmtZAR(lpVal)} (${lpPct}%)</span>
      </div>
      <div style="height: 10px; background: #0f172a; border-radius: 5px; overflow: hidden; display: flex;">
        <div style="width: ${gpPct}%; background: #38bdf8;" title="Gauteng: ${gpPct}%"></div>
        <div style="width: ${lpPct}%; background: #eab308;" title="Limpopo: ${lpPct}%"></div>
      </div>
    </div>

    <div>
      <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:4px;">
        <span><strong>💻 Software & Systems:</strong> ${fmtZAR(softVal)} (${softPct}%)</span>
        <span><strong>📣 Digital Marketing:</strong> ${fmtZAR(mktVal)} (${mktPct}%)</span>
      </div>
      <div style="height: 10px; background: #0f172a; border-radius: 5px; overflow: hidden; display: flex;">
        <div style="width: ${softPct}%; background: #10b981;" title="Software: ${softPct}%"></div>
        <div style="width: ${mktPct}%; background: #f59e0b;" title="Digital Marketing: ${mktPct}%"></div>
      </div>
    </div>
  `;
}

// --- Dashboard View Rendering ---
function renderDashboard() {
  renderBreakdowns();
  const tbody = document.getElementById("dashboard-table-body");
  const countEl = document.getElementById("dashboard-tender-count");
  if (!tbody) return;

  tbody.innerHTML = "";
  countEl.textContent = `Showing ${state.tenders.length} opportunities in Gauteng & Limpopo`;

  if (state.tenders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-dim); padding: 2rem;">No tenders match the selected filters.</td></tr>`;
    return;
  }

  state.tenders.slice(0, 8).forEach(t => {
    const tr = document.createElement("tr");
    tr.style.cursor = "pointer";
    tr.addEventListener("click", () => openDetailModal(t.id));

    const provBadge = t.province === "Limpopo"
      ? `<span class="badge" style="background:rgba(234,179,8,0.15); color:#facc15; border:1px solid rgba(234,179,8,0.3);">📍 Limpopo</span>`
      : `<span class="badge" style="background:rgba(56,189,248,0.15); color:#38bdf8; border:1px solid rgba(56,189,248,0.3);">📍 Gauteng</span>`;

    const sectorBadge = t.sector === "Government" 
      ? `<span class="badge badge-gov">🏛️ Gov</span>` 
      : `<span class="badge badge-pvt">🏢 Private</span>`;

    const catBadge = t.category.includes("Software") 
      ? `<span class="badge badge-dev">💻 Software</span>` 
      : `<span class="badge badge-mkt">📣 Marketing</span>`;

    const statusBadge = getStatusBadge(t.status);
    const deadlineStr = formatDeadlineBadge(t.submission_deadline);

    tr.innerHTML = `
      <td style="font-family: monospace; font-size: 0.78rem; color: var(--text-dim);">${escapeHtml(t.ref_number)}</td>
      <td>
        <strong style="color: #f8fafc; display: block; font-size: 0.88rem;">${escapeHtml(t.title)}</strong>
        <span style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(t.issuing_entity)} • ${escapeHtml(t.location || t.province)}</span>
      </td>
      <td>
        <div style="display:flex; flex-direction:column; gap:4px; align-items:flex-start;">
          ${provBadge}
          ${sectorBadge}
        </div>
      </td>
      <td>${catBadge}</td>
      <td style="font-weight: 700; color: #38bdf8;">${fmtZAR(t.estimated_value)}</td>
      <td>${statusBadge}</td>
      <td>${deadlineStr}</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); openDetailModal(${t.id})">Inspect</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// --- Kanban Board View Rendering ---
const KANBAN_STAGES = [
  { key: "Identified", label: "1. Identified" },
  { key: "Go/No-Go Review", label: "2. Go/No-Go Review" },
  { key: "In Preparation", label: "3. In Preparation" },
  { key: "Under Review", label: "4. Under Review" },
  { key: "Submitted", label: "5. Submitted" },
  { key: "Won", label: "6. Awarded / Won" }
];

function renderKanban() {
  const container = document.getElementById("kanban-container");
  if (!container) return;
  container.innerHTML = "";

  KANBAN_STAGES.forEach(stage => {
    const col = document.createElement("div");
    col.className = "kanban-col";

    const stageTenders = state.tenders.filter(t => {
      if (stage.key === "Won") return t.status === "Won" || t.status === "Lost";
      return t.status === stage.key;
    });

    const colHeader = document.createElement("div");
    colHeader.className = "kanban-header";
    colHeader.innerHTML = `
      <div class="kanban-col-title">
        <span>${stage.label}</span>
      </div>
      <span class="kanban-count">${stageTenders.length}</span>
    `;
    col.appendChild(colHeader);

    const colBody = document.createElement("div");
    colBody.className = "kanban-body";

    if (stageTenders.length === 0) {
      colBody.innerHTML = `<div style="text-align: center; color: var(--text-dim); font-size: 0.75rem; padding: 2rem 0;">No tenders in this stage</div>`;
    } else {
      stageTenders.forEach(t => {
        const card = document.createElement("div");
        card.className = "tender-card";
        card.addEventListener("click", () => openDetailModal(t.id));

        const provBadge = t.province === "Limpopo"
          ? `<span class="badge" style="background:rgba(234,179,8,0.15); color:#facc15;">LP</span>`
          : `<span class="badge" style="background:rgba(56,189,248,0.15); color:#38bdf8;">GP</span>`;

        const sectorBadge = t.sector === "Government" 
          ? `<span class="badge badge-gov">Gov</span>` 
          : `<span class="badge badge-pvt">Pvt</span>`;

        const catBadge = t.category.includes("Software") 
          ? `<span class="badge badge-dev">Dev</span>` 
          : `<span class="badge badge-mkt">Mkt</span>`;

        const deadlineBadge = formatDeadlineBadge(t.submission_deadline);

        card.innerHTML = `
          <div class="card-ref">${escapeHtml(t.ref_number)}</div>
          <div class="card-title">${escapeHtml(t.title)}</div>
          <div class="card-entity">${escapeHtml(t.issuing_entity)} (${escapeHtml(t.location || t.province)})</div>
          
          <div class="card-badges">
            ${provBadge}
            ${sectorBadge}
            ${catBadge}
            <span class="badge" style="background: rgba(255,255,255,0.08);">${t.priority}</span>
            ${t.go_no_go_decision === 'Go' ? '<span class="badge" style="background:rgba(16,185,129,0.15); color:#34d399;">GO</span>' : ''}
          </div>

          <div class="card-meta-row">
            <span class="card-val">${fmtZAR(t.estimated_value)}</span>
            <span class="card-deadline">${deadlineBadge}</span>
          </div>

          <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed var(--border); display: flex; justify-content: space-between; align-items: center;" onclick="event.stopPropagation();">
            <select class="form-select" style="font-size: 0.7rem; padding: 2px 6px;" onchange="updateTenderStage(${t.id}, this.value)">
              <option value="Identified" ${t.status === 'Identified' ? 'selected' : ''}>Identified</option>
              <option value="Go/No-Go Review" ${t.status === 'Go/No-Go Review' ? 'selected' : ''}>Go/No-Go</option>
              <option value="In Preparation" ${t.status === 'In Preparation' ? 'selected' : ''}>In Prep</option>
              <option value="Under Review" ${t.status === 'Under Review' ? 'selected' : ''}>Under Review</option>
              <option value="Submitted" ${t.status === 'Submitted' ? 'selected' : ''}>Submitted</option>
              <option value="Won" ${t.status === 'Won' ? 'selected' : ''}>Won</option>
              <option value="Lost" ${t.status === 'Lost' ? 'selected' : ''}>Lost</option>
            </select>
            <span style="font-size: 0.72rem; color: var(--text-dim);">${t.compliance_score || 0}% Comp</span>
          </div>
        `;
        colBody.appendChild(card);
      });
    }

    col.appendChild(colBody);
    container.appendChild(col);
  });
}

// --- Table View Rendering ---
function renderTable() {
  const tbody = document.getElementById("full-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (state.tenders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: var(--text-dim); padding: 2rem;">No South African tenders found.</td></tr>`;
    return;
  }

  state.tenders.forEach(t => {
    const tr = document.createElement("tr");

    const provBadge = t.province === "Limpopo"
      ? `<span class="badge" style="background:rgba(234,179,8,0.15); color:#facc15;">Limpopo</span>`
      : `<span class="badge" style="background:rgba(56,189,248,0.15); color:#38bdf8;">Gauteng</span>`;

    const sectorBadge = t.sector === "Government" 
      ? `<span class="badge badge-gov">Gov</span>` 
      : `<span class="badge badge-pvt">Pvt</span>`;

    const catBadge = t.category.includes("Software") 
      ? `<span class="badge badge-dev">Software</span>` 
      : `<span class="badge badge-mkt">Marketing</span>`;

    const statusBadge = getStatusBadge(t.status);
    const deadlineBadge = formatDeadlineBadge(t.submission_deadline);

    const gonogoBadge = t.go_no_go_decision === "Go" 
      ? `<span class="badge" style="background: rgba(16,185,129,0.2); color:#34d399;">GO (${t.go_no_go_score}%)</span>`
      : (t.go_no_go_decision === "Caution" 
         ? `<span class="badge" style="background: rgba(245,158,11,0.2); color:#fbbf24;">CAUTION (${t.go_no_go_score}%)</span>`
         : `<span class="badge" style="background: #334155; color:#94a3b8;">${t.go_no_go_decision}</span>`);

    tr.innerHTML = `
      <td style="font-family: monospace; font-size: 0.78rem; color: var(--text-dim);">${escapeHtml(t.ref_number)}</td>
      <td>
        <strong style="color: #f8fafc; display: block; font-size: 0.88rem; cursor:pointer;" onclick="openDetailModal(${t.id})">${escapeHtml(t.title)}</strong>
        <span style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(t.issuing_entity)}</span>
      </td>
      <td>${provBadge}</td>
      <td>${sectorBadge}</td>
      <td>${catBadge}</td>
      <td style="font-weight: 700; color: #38bdf8;">${fmtZAR(t.estimated_value)}</td>
      <td>${statusBadge}</td>
      <td>${deadlineBadge}</td>
      <td>${gonogoBadge}</td>
      <td>
        <div style="display:flex; align-items:center; gap:6px;">
          <div style="flex:1; width:50px; height:6px; background:#0f172a; border-radius:3px; overflow:hidden;">
            <div style="width:${t.compliance_score || 0}%; height:100%; background:#10b981;"></div>
          </div>
          <span style="font-size:0.75rem; color:var(--text-muted);">${t.compliance_score || 0}%</span>
        </div>
      </td>
      <td>
        <div style="display:flex; gap:6px;">
          <button class="btn btn-secondary btn-sm" onclick="openDetailModal(${t.id})">View</button>
          <button class="btn btn-secondary btn-sm" onclick="openEditModal(${t.id})">Edit</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// --- Discovery Feed & Scraper Hub Rendering ---
function renderDiscovery() {
  const container = document.getElementById("discovery-container");
  if (!container) return;
  container.innerHTML = "";

  if (state.discovery.length === 0) {
    container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-dim); padding: 3rem;">Scanning e-Tenders... Click "Run Scrapers Now" above.</div>`;
    return;
  }

  state.discovery.forEach(d => {
    const card = document.createElement("div");
    card.className = "discovery-card";

    const provBadge = d.province === "Limpopo"
      ? `<span class="badge" style="background:rgba(234,179,8,0.15); color:#facc15;">📍 Limpopo</span>`
      : `<span class="badge" style="background:rgba(56,189,248,0.15); color:#38bdf8;">📍 Gauteng</span>`;

    const sectorBadge = d.sector === "Government" 
      ? `<span class="badge badge-gov">🏛️ Government</span>` 
      : `<span class="badge badge-pvt">🏢 Private</span>`;

    const catBadge = d.category.includes("Software") 
      ? `<span class="badge badge-dev">💻 Software</span>` 
      : `<span class="badge badge-mkt">📣 Marketing</span>`;

    const keywordsHtml = (d.matched_keywords || []).map(kw => 
      `<span style="background: #0f172a; border: 1px solid var(--border); font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; color: #94a3b8;">${escapeHtml(kw)}</span>`
    ).join(" ");

    card.innerHTML = `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <span style="font-size: 0.72rem; font-family: monospace; color: var(--text-dim);">${escapeHtml(d.ref_number)}</span>
          <span class="match-score">${d.relevance_score}% Match</span>
        </div>
        <h4 style="font-size: 0.95rem; font-weight: 700; color: #f8fafc; line-height: 1.35; margin-bottom: 0.5rem;">${escapeHtml(d.title)}</h4>
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.75rem;">${escapeHtml(d.issuing_entity)}</div>
        
        <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 0.75rem;">
          ${provBadge}
          ${sectorBadge}
          ${catBadge}
        </div>

        <p style="font-size: 0.78rem; color: #cbd5e1; margin-bottom: 1rem; line-height: 1.4;">${escapeHtml(d.summary)}</p>

        <div style="margin-bottom: 1rem;">
          <span style="display: block; font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase; margin-bottom: 4px;">Matched Keywords</span>
          <div style="display: flex; flex-wrap: wrap; gap: 4px;">${keywordsHtml}</div>
        </div>
      </div>

      <div style="border-top: 1px solid var(--border); padding-top: 0.75rem; display: flex; align-items: center; justify-content: space-between;">
        <div>
          <div style="font-size: 0.85rem; font-weight: 700; color: #38bdf8;">${fmtZAR(d.estimated_value)}</div>
          <div style="font-size: 0.72rem; color: var(--text-dim);">Source: ${escapeHtml(d.source_name)}</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="importDiscoveredTender('${d.id}')">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
          Import & Alert
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

// --- Import Tender from Scraper Feed ---
async function importDiscoveredTender(discId) {
  const item = state.discovery.find(d => d.id === discId);
  if (!item) return;

  try {
    const res = await fetch("/api/discover/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item)
    });

    if (res.ok) {
      const created = await res.json();
      showToast(`Imported "${created.title.substring(0, 32)}..." into pipeline!`, "success");
      state.discovery = state.discovery.filter(d => d.id !== discId);
      renderDiscovery();
      await fetchTenders();
      await fetchStats();
    } else {
      showToast("Failed to import tender", "error");
    }
  } catch (err) {
    console.error("Error importing tender:", err);
    showToast("Server error during import", "error");
  }
}

// --- Quick Stage Update ---
async function updateTenderStage(tenderId, newStage) {
  try {
    const res = await fetch(`/api/tenders/${tenderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStage })
    });

    if (res.ok) {
      showToast(`Tender stage changed to ${newStage}`, "success");
      await fetchTenders();
      await fetchStats();
    }
  } catch (err) {
    console.error("Error updating stage:", err);
  }
}

// --- Detail Modal ---
async function openDetailModal(tenderId) {
  state.activeTenderId = tenderId;
  const modal = document.getElementById("modal-detail-view");
  const body = document.getElementById("detail-body");
  const footer = document.getElementById("detail-footer");
  body.innerHTML = `<div style="text-align: center; padding: 2rem;">Loading details...</div>`;
  modal.classList.add("active");

  try {
    const res = await fetch(`/api/tenders/${tenderId}`);
    if (!res.ok) throw new Error("Not found");
    const t = await res.json();

    document.getElementById("detail-ref").textContent = `${t.ref_number} • ${t.province.toUpperCase()} • ${t.sector} • ${t.category}`;
    document.getElementById("detail-title").textContent = t.title;

    const provBadge = t.province === "Limpopo"
      ? `<span class="badge" style="background:rgba(234,179,8,0.15); color:#facc15;">📍 Limpopo Province</span>`
      : `<span class="badge" style="background:rgba(56,189,248,0.15); color:#38bdf8;">📍 Gauteng Province</span>`;

    const sectorBadge = t.sector === "Government" 
      ? `<span class="badge badge-gov">🏛️ Government (Public Sector)</span>` 
      : `<span class="badge badge-pvt">🏢 Private Sector (Corporate / Mining)</span>`;

    const catBadge = t.category.includes("Software") 
      ? `<span class="badge badge-dev">💻 Software & Systems</span>` 
      : `<span class="badge badge-mkt">📣 Digital Marketing</span>`;

    const complianceHtml = (t.compliance_items || []).map(item => `
      <div class="checklist-item" id="comp-item-${item.id}">
        <div>
          <div class="checklist-title">${escapeHtml(item.title)}</div>
          <span style="font-size: 0.72rem; color: var(--text-dim);">${item.required ? 'Mandatory Statutory Prerequisite' : 'Supplementary'}</span>
        </div>
        <button class="btn btn-sm ${item.status === 'Verified' ? 'btn-primary' : 'btn-secondary'}" 
                style="${item.status === 'Verified' ? 'background: #10b981; border-color: #10b981;' : ''}"
                onclick="toggleCompliance(${item.id})">
          ${item.status === 'Verified' ? '✓ Verified' : 'Mark Verified'}
        </button>
      </div>
    `).join("");

    const milestonesHtml = (t.milestones || []).map(m => `
      <div class="checklist-item" id="milestone-item-${m.id}">
        <div>
          <div class="checklist-title">${escapeHtml(m.title)}</div>
          <span style="font-size: 0.72rem; color: var(--text-dim);">Due: ${m.due_date || 'N/A'} • Assignee: ${escapeHtml(m.owner || 'Unassigned')}</span>
        </div>
        <button class="btn btn-sm ${m.completed ? 'btn-primary' : 'btn-secondary'}" 
                style="${m.completed ? 'background: #38bdf8; border-color: #38bdf8;' : ''}"
                onclick="toggleMilestone(${m.id})">
          ${m.completed ? '✓ Completed' : 'Mark Done'}
        </button>
      </div>
    `).join("");

    body.innerHTML = `
      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 1.25rem;">
        ${provBadge}
        ${sectorBadge}
        ${catBadge}
        ${getStatusBadge(t.status)}
        <span class="badge" style="background: rgba(255,255,255,0.08);">${t.priority} Priority</span>
        <span class="badge" style="background: rgba(56,189,248,0.15); color: #38bdf8;">Compliance: ${t.compliance_score || 0}%</span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; margin-bottom: 1.5rem; background: #0f172a; padding: 1rem; border-radius: 10px; border: 1px solid var(--border);">
        <div>
          <span style="font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase;">Estimated Value</span>
          <div style="font-size: 1.15rem; font-weight: 700; color: #38bdf8;">${fmtZAR(t.estimated_value)}</div>
        </div>
        <div>
          <span style="font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase;">Submission Deadline</span>
          <div style="font-size: 0.95rem; font-weight: 600; color: #f8fafc;">${escapeHtml(t.submission_deadline || 'Open')}</div>
        </div>
        <div>
          <span style="font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase;">Compulsory Briefing</span>
          <div style="font-size: 0.85rem; font-weight: 500; color: #e2e8f0;">${escapeHtml(t.briefing_date || 'None')}</div>
        </div>
        <div>
          <span style="font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase;">Go/No-Go Decision</span>
          <div style="font-size: 1rem; font-weight: 700; color: ${t.go_no_go_decision === 'Go' ? '#34d399' : '#fbbf24'};">${t.go_no_go_decision} (${t.go_no_go_score}%)</div>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 1.25rem;">
        <div style="background: #0f172a; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase;">B-BBEE Preference & Subcontracting Requirement</span>
            <div style="font-size: 0.88rem; font-weight: 600; color: #facc15;">${escapeHtml(t.bbbee_requirement || 'Level 1 or 2')}</div>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase;">Submission Method</span>
            <div style="font-size: 0.85rem; font-weight: 500; color: #e2e8f0;">${escapeHtml(t.submission_method || 'Online')}</div>
          </div>
        </div>

        <div>
          <h4 style="font-size: 0.85rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem;">Scope of Work & Specification</h4>
          <div style="background: #0f172a; padding: 1rem; border-radius: 8px; border: 1px solid var(--border); font-size: 0.85rem; line-height: 1.6; white-space: pre-line; color: #e2e8f0;">${escapeHtml(t.scope_of_work || t.description || 'No detailed scope provided.')}</div>
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <h4 style="font-size: 0.85rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Mandatory SA Compliance Checklist (SBD / CSD / SARS)</h4>
            <span style="font-size: 0.75rem; color: #10b981; font-weight: 600;">Score: ${t.compliance_score || 0}%</span>
          </div>
          <div>${complianceHtml || '<div style="color:var(--text-dim); font-size:0.8rem;">No checklist items.</div>'}</div>
        </div>

        <div>
          <h4 style="font-size: 0.85rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem;">Key Proposal Milestones</h4>
          <div>${milestonesHtml || '<div style="color:var(--text-dim); font-size:0.8rem;">No milestones configured.</div>'}</div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div style="background: #0f172a; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid var(--border);">
            <span style="font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase;">Lead Assignee</span>
            <div style="font-size: 0.85rem; font-weight: 600; color: #f8fafc;">${escapeHtml(t.lead_assignee || 'Unassigned')}</div>
          </div>
          <div style="background: #0f172a; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid var(--border);">
            <span style="font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase;">Technical / Creative Lead</span>
            <div style="font-size: 0.85rem; font-weight: 600; color: #f8fafc;">${escapeHtml(t.tech_lead || 'Unassigned')}</div>
          </div>
        </div>

        ${t.portal_url ? `
          <div style="background: #0f172a; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.8rem; color: var(--text-muted);">External RFP / e-Tender Portal Link</span>
            <a href="${escapeHtml(t.portal_url)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="color: #38bdf8;">Open Portal ↗</a>
          </div>
        ` : ''}
      </div>
    `;

    footer.innerHTML = `
      <button class="btn btn-secondary btn-sm" style="color: #ef4444; border-color: rgba(239,68,68,0.3);" onclick="deleteTender(${t.id})">Delete Tender</button>
      <button class="btn btn-secondary btn-sm" onclick="openEditModal(${t.id})">Edit Tender</button>
      <button class="btn btn-primary btn-sm" onclick="document.getElementById('modal-detail-view').classList.remove('active')">Close</button>
    `;

  } catch (err) {
    body.innerHTML = `<div style="color: var(--danger); text-align: center; padding: 2rem;">Error loading tender details.</div>`;
  }
}

// --- Toggle Compliance Checklist Item ---
async function toggleCompliance(itemId) {
  try {
    const res = await fetch(`/api/compliance/${itemId}/toggle`, { method: "POST" });
    if (res.ok) {
      showToast("Compliance status updated", "success");
      if (state.activeTenderId) {
        await openDetailModal(state.activeTenderId);
      }
      await fetchTenders();
      await fetchStats();
    }
  } catch (err) {
    console.error("Error toggling compliance:", err);
  }
}

// --- Toggle Milestone ---
async function toggleMilestone(milestoneId) {
  try {
    const res = await fetch(`/api/milestones/${milestoneId}/toggle`, { method: "POST" });
    if (res.ok) {
      showToast("Milestone updated", "success");
      if (state.activeTenderId) {
        await openDetailModal(state.activeTenderId);
      }
    }
  } catch (err) {
    console.error("Error toggling milestone:", err);
  }
}

// --- Delete Tender ---
async function deleteTender(tenderId) {
  if (!confirm("Are you sure you want to delete this South African tender?")) return;

  try {
    const res = await fetch(`/api/tenders/${tenderId}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Tender deleted", "success");
      document.getElementById("modal-detail-view").classList.remove("active");
      await fetchTenders();
      await fetchStats();
    }
  } catch (err) {
    console.error("Error deleting tender:", err);
    showToast("Failed to delete tender", "error");
  }
}

// --- Modal Listeners ---
function setupModalListeners() {
  const modalForm = document.getElementById("modal-tender-form");
  const modalDetail = document.getElementById("modal-detail-view");

  document.getElementById("btn-add-tender").addEventListener("click", () => openAddModal());
  document.getElementById("btn-close-form").addEventListener("click", () => modalForm.classList.remove("active"));
  document.getElementById("btn-cancel-form").addEventListener("click", () => modalForm.classList.remove("active"));
  document.getElementById("btn-close-detail").addEventListener("click", () => modalDetail.classList.remove("active"));
  document.getElementById("btn-save-form").addEventListener("click", saveTenderForm);

  document.getElementById("btn-export-csv").addEventListener("click", () => {
    window.location.href = "/api/export?format=csv";
    showToast("Generating South African tenders CSV...", "success");
  });

  document.getElementById("btn-scan-feeds").addEventListener("click", async () => {
    showToast("Scanning National Treasury e-Tenders & Provincial boards...", "success");
    await fetchDiscovery();
    switchView("discovery");
  });

  document.getElementById("btn-refresh-feed").addEventListener("click", async () => {
    showToast("Re-running automated scrapers...", "success");
    await fetchDiscovery();
  });
}

// --- Alerts Modal Setup ---
function setupAlertModal() {
  const modalAlerts = document.getElementById("modal-alerts");
  document.getElementById("btn-open-alerts").addEventListener("click", () => {
    loadAlertConfig();
    modalAlerts.classList.add("active");
  });

  document.getElementById("btn-close-alerts").addEventListener("click", () => modalAlerts.classList.remove("active"));
  document.getElementById("btn-cancel-alerts").addEventListener("click", () => modalAlerts.classList.remove("active"));

  // Save Alert Config
  document.getElementById("btn-save-alerts").addEventListener("click", async () => {
    const phone = document.getElementById("cfg-wa-number").value.trim();
    const payload = {
      whatsapp_enabled: document.getElementById("cfg-wa-enabled").checked,
      whatsapp_number: phone,
      whatsapp_provider: document.getElementById("cfg-wa-provider").value,
      callmebot_api_key: document.getElementById("cfg-wa-apikey") ? document.getElementById("cfg-wa-apikey").value.trim() : "",
      email_enabled: document.getElementById("cfg-em-enabled").checked,
      recipient_email: document.getElementById("cfg-em-address").value.trim()
    };

    try {
      const res = await fetch("/api/alerts/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast("Alert preferences saved successfully!", "success");
        updateDirectWaLink(phone);
        modalAlerts.classList.remove("active");
      }
    } catch (err) {
      showToast("Error saving alert configuration", "error");
    }
  });

  // Test WhatsApp
  document.getElementById("btn-test-whatsapp").addEventListener("click", async () => {
    const phone = document.getElementById("cfg-wa-number").value.trim();
    const apikey = document.getElementById("cfg-wa-apikey") ? document.getElementById("cfg-wa-apikey").value.trim() : "";
    if (!phone) {
      alert("Please enter a WhatsApp mobile number (e.g. 072 765 5204).");
      return;
    }
    showToast("Sending test WhatsApp alert...", "info");
    try {
      const res = await fetch("/api/alerts/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "whatsapp", whatsapp_number: phone, callmebot_api_key: apikey })
      });
      const data = await res.json();
      if (data.results && data.results.whatsapp && data.results.whatsapp.success) {
        showToast("WhatsApp alert triggered successfully!", "success");
        if (data.results.whatsapp.direct_wa_link) {
          window.open(data.results.whatsapp.direct_wa_link, '_blank');
        }
      } else {
        showToast("WhatsApp test completed", "info");
      }
    } catch (err) {
      showToast("Error testing WhatsApp gateway", "error");
    }
  });

  // Test Email
  document.getElementById("btn-test-email").addEventListener("click", async () => {
    const email = document.getElementById("cfg-em-address").value.trim();
    if (!email) {
      alert("Please enter a valid recipient email address.");
      return;
    }
    showToast("Sending test email notification...", "info");
    try {
      const res = await fetch("/api/alerts/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "email", recipient_email: email })
      });
      const data = await res.json();
      if (data.results && data.results.email && data.results.email.success) {
        showToast("Email test sent successfully!", "success");
      }
    } catch (err) {
      showToast("Error sending test email", "error");
    }
  });
}

function openAddModal() {
  document.getElementById("form-modal-title").textContent = "Create New South African Tender";
  document.getElementById("form-id").value = "";
  document.getElementById("tender-form").reset();
  
  const now = new Date();
  now.setDate(now.getDate() + 21);
  document.getElementById("form-deadline").value = now.toISOString().split("T")[0] + " 11:00 AM";

  document.getElementById("modal-tender-form").classList.add("active");
}

async function openEditModal(tenderId) {
  try {
    const res = await fetch(`/api/tenders/${tenderId}`);
    if (!res.ok) throw new Error("Not found");
    const t = await res.json();

    document.getElementById("modal-detail-view").classList.remove("active");
    document.getElementById("form-modal-title").textContent = "Edit South African Tender";
    document.getElementById("form-id").value = t.id;
    document.getElementById("form-title").value = t.title || "";
    document.getElementById("form-entity").value = t.issuing_entity || "";
    document.getElementById("form-province").value = t.province || "Gauteng";
    document.getElementById("form-sector").value = t.sector || "Government";
    document.getElementById("form-category").value = t.category || "Software & Systems Development";
    document.getElementById("form-value").value = t.estimated_value || "";
    document.getElementById("form-deadline").value = t.submission_deadline || "";
    document.getElementById("form-briefing").value = t.briefing_date || "";
    document.getElementById("form-briefing-type").value = t.briefing_type || "None";
    document.getElementById("form-bbbee").value = t.bbbee_requirement || "";
    document.getElementById("form-method").value = t.submission_method || "";
    document.getElementById("form-location").value = t.location || "";
    document.getElementById("form-description").value = t.scope_of_work || t.description || "";

    document.getElementById("modal-tender-form").classList.add("active");
  } catch (err) {
    console.error("Error opening edit modal:", err);
  }
}

async function saveTenderForm(e) {
  e.preventDefault();

  const id = document.getElementById("form-id").value;
  const payload = {
    title: document.getElementById("form-title").value.trim(),
    issuing_entity: document.getElementById("form-entity").value.trim(),
    province: document.getElementById("form-province").value,
    sector: document.getElementById("form-sector").value,
    category: document.getElementById("form-category").value,
    estimated_value: parseFloat(document.getElementById("form-value").value) || 0,
    submission_deadline: document.getElementById("form-deadline").value.trim(),
    briefing_date: document.getElementById("form-briefing").value.trim(),
    briefing_type: document.getElementById("form-briefing-type").value,
    bbbee_requirement: document.getElementById("form-bbbee").value.trim(),
    submission_method: document.getElementById("form-method").value.trim(),
    location: document.getElementById("form-location").value.trim(),
    scope_of_work: document.getElementById("form-description").value.trim()
  };

  if (!payload.title || !payload.issuing_entity || !payload.submission_deadline) {
    alert("Please fill in Title, Issuing Entity, and Submission Deadline.");
    return;
  }

  try {
    let res;
    if (id) {
      res = await fetch(`/api/tenders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch("/api/tenders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    }

    if (res.ok) {
      showToast(id ? "Tender updated" : "New SA tender created!", "success");
      document.getElementById("modal-tender-form").classList.remove("active");
      await fetchTenders();
      await fetchStats();
    }
  } catch (err) {
    showToast("Error saving tender", "error");
  }
}

// --- Filter Listeners ---
function setupFilterListeners() {
  const debouncedFetch = debounce(() => fetchTenders(), 250);

  document.getElementById("filter-search").addEventListener("input", (e) => {
    state.filters.search = e.target.value;
    debouncedFetch();
  });

  document.getElementById("filter-province").addEventListener("change", (e) => {
    state.filters.province = e.target.value;
    fetchTenders();
  });

  document.getElementById("filter-sector").addEventListener("change", (e) => {
    state.filters.sector = e.target.value;
    fetchTenders();
  });

  document.getElementById("filter-category").addEventListener("change", (e) => {
    state.filters.category = e.target.value;
    fetchTenders();
  });

  document.getElementById("filter-status").addEventListener("change", (e) => {
    state.filters.status = e.target.value;
    fetchTenders();
  });

  document.getElementById("filter-priority").addEventListener("change", (e) => {
    state.filters.priority = e.target.value;
    fetchTenders();
  });

  document.getElementById("btn-reset-filters").addEventListener("click", () => {
    state.filters = {
      province: "All",
      sector: "All",
      category: "All",
      status: "All",
      priority: "All",
      search: ""
    };
    document.getElementById("filter-search").value = "";
    document.getElementById("filter-province").value = "All";
    document.getElementById("filter-sector").value = "All";
    document.getElementById("filter-category").value = "All";
    document.getElementById("filter-status").value = "All";
    document.getElementById("filter-priority").value = "All";
    fetchTenders();
  });
}

// --- Go / No-Go Calculator Logic ---
function setupCalculator() {
  const sliders = ["cap", "comp", "res", "marg", "rel", "win"];
  sliders.forEach(key => {
    const slider = document.getElementById(`slider-${key}`);
    const label = document.getElementById(`label-${key}`);
    slider.addEventListener("input", () => {
      label.textContent = `${slider.value} / 5`;
      recalculateGoNoGo();
    });
  });
  recalculateGoNoGo();
}

function recalculateGoNoGo() {
  const cap = parseFloat(document.getElementById("slider-cap").value);
  const comp = parseFloat(document.getElementById("slider-comp").value);
  const res = parseFloat(document.getElementById("slider-res").value);
  const marg = parseFloat(document.getElementById("slider-marg").value);
  const rel = parseFloat(document.getElementById("slider-rel").value);
  const win = parseFloat(document.getElementById("slider-win").value);

  const score = (
    (cap / 5.0) * 25 +
    (comp / 5.0) * 25 +
    (res / 5.0) * 15 +
    (marg / 5.0) * 15 +
    (rel / 5.0) * 10 +
    (win / 5.0) * 10
  );

  const scoreInt = Math.round(score);
  document.getElementById("calc-result-score").textContent = `${scoreInt}%`;

  const badgeEl = document.getElementById("calc-result-badge");
  const recEl = document.getElementById("calc-result-rec");

  if (scoreInt >= 75) {
    badgeEl.textContent = "GO";
    badgeEl.style.background = "rgba(16, 185, 129, 0.2)";
    badgeEl.style.color = "#34d399";
    badgeEl.style.borderColor = "#10b981";
    recEl.textContent = "Strong Strategic Fit: Compliant with B-BBEE & Tax requirements with healthy margin. Proceed to bid drafting.";
  } else if (scoreInt >= 60) {
    badgeEl.textContent = "CAUTION";
    badgeEl.style.background = "rgba(245, 158, 11, 0.2)";
    badgeEl.style.color = "#fbbf24";
    badgeEl.style.borderColor = "#f59e0b";
    recEl.textContent = "Moderate Fit: Review critical compliance items (TCS PIN, Briefing, Subcontracting) before allocating bid hours.";
  } else {
    badgeEl.textContent = "NO-GO";
    badgeEl.style.background = "rgba(239, 68, 68, 0.2)";
    badgeEl.style.color = "#f87171";
    badgeEl.style.borderColor = "#ef4444";
    recEl.textContent = "High Risk / Disqualification Risk: Recommend declining or bidding only as a specialized sub-contractor.";
  }
}

// --- Utilities ---
function getStatusBadge(status) {
  const map = {
    "Identified": "badge-status-identified",
    "Go/No-Go Review": "badge-status-review",
    "In Preparation": "badge-status-prep",
    "Under Review": "badge-status-submitted",
    "Submitted": "badge-status-submitted",
    "Won": "badge-status-won",
    "Lost": "badge-status-lost"
  };
  const cls = map[status] || "badge-status-identified";
  return `<span class="badge badge-status ${cls}">${status}</span>`;
}

function formatDeadlineBadge(deadlineStr) {
  if (!deadlineStr) return '<span style="color:var(--text-dim);">No date</span>';
  
  const d = new Date(deadlineStr);
  const now = new Date();
  const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `<span style="color:#ef4444; font-size:0.75rem;">Closed</span>`;
  } else if (diffDays === 0) {
    return `<span class="badge" style="background:#ef4444; color:#fff;">Closes Today!</span>`;
  } else if (diffDays <= 7) {
    return `<span class="deadline-urgent">⚠️ In ${diffDays} day${diffDays > 1 ? 's' : ''}</span>`;
  } else {
    return `<span style="color:var(--text-muted); font-size:0.78rem;">In ${diffDays} days</span>`;
  }
}

function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = "toast";
  
  const icon = type === "success" ? "✓" : (type === "error" ? "⚠️" : "ℹ️");
  toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}
