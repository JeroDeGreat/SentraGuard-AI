const VIEW_META = {
  overview: {
    label: "Overview",
    title: "Risk Posture & Active Pressure",
    subtitle: "Monitor workforce risk, identify signal changes, and review employees requiring attention.",
  },
  investigations: {
    label: "Investigations",
    title: "Case Management",
    subtitle: "Search, inspect, and investigate monitored employees.",
  },
  activity: {
    label: "Activity",
    title: "Live Event Stream",
    subtitle: "Monitor organization behavior as it lands in real time.",
  },
  operations: {
    label: "Operations",
    title: "Operations Control Center",
    subtitle: "Manage monitoring mode, simulation tempo, and launch live scenarios.",
  },
  settings: {
    label: "Settings",
    title: "Platform Settings",
    subtitle: "Configure risk rules, review audit logs, and inspect platform information.",
  },
};

const EVENT_LABELS = {
  login_success: "Successful Login",
  login_failed: "Failed Authentication",
  file_download: "Large Data Download",
  usb_inserted: "USB Device Activity",
  data_transfer: "External Transfer",
  sensitive_access: "Sensitive Resource Access",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function formatScore(value) {
  return Number(value || 0).toFixed(1);
}

function formatPercent(value, total) {
  if (!total) {
    return 0;
  }
  return Math.round((value / total) * 100);
}

function toInitials(name) {
  return String(name || "SG")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function labelize(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatHour(hour) {
  const numeric = Number(hour || 0);
  const suffix = numeric >= 12 ? "PM" : "AM";
  const normalized = numeric % 12 || 12;
  return `${normalized}:00 ${suffix}`;
}

function formatRelativeTime(value) {
  if (!value) {
    return "No activity";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const diffSeconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (diffSeconds < 45) {
    return "Just now";
  }
  if (diffSeconds < 3600) {
    return `${Math.round(diffSeconds / 60)}m ago`;
  }
  if (diffSeconds < 86400) {
    return `${Math.round(diffSeconds / 3600)}h ago`;
  }
  return `${Math.round(diffSeconds / 86400)}d ago`;
}

function severityClass(value) {
  const severity = String(value || "").toLowerCase();
  if (severity === "critical") {
    return "critical";
  }
  if (severity === "high" || severity === "high risk") {
    return "high";
  }
  if (severity === "medium") {
    return "medium";
  }
  return "low";
}

function levelClass(value) {
  const level = String(value || "").toLowerCase();
  if (level === "high") {
    return "high";
  }
  if (level === "medium") {
    return "medium";
  }
  return "low";
}

function categoryClass(value) {
  const category = String(value || "").toLowerCase();
  if (category === "critical") {
    return "critical";
  }
  if (category === "risk") {
    return "high";
  }
  if (category === "normal") {
    return "low";
  }
  return "medium";
}

function summarizeActivity(activity) {
  const details = activity.details || {};
  if (activity.event_type === "file_download") {
    return `Downloaded ${formatNumber(details.bytes_mb || 0)}MB from ${details.resource || "internal repository"}.`;
  }
  if (activity.event_type === "data_transfer") {
    return `Transferred ${formatNumber(details.bytes_mb || 0)}MB via ${details.channel || "network"} toward ${details.destination || "internal"} destination.`;
  }
  if (activity.event_type === "login_failed") {
    return `Authentication failures recorded from ${details.location || "an unknown source"}.`;
  }
  if (activity.event_type === "usb_inserted") {
    return `Detected ${details.device_label || "an unmanaged removable device"} on the endpoint.`;
  }
  if (activity.event_type === "sensitive_access") {
    return `${labelize(details.classification || "internal")} material opened from ${details.resource || "a restricted workspace"}.`;
  }
  if (activity.event_type === "login_success") {
    return `Authenticated from ${details.location || "the normal workplace"} with ${details.network_trust || "standard"} trust.`;
  }
  return "Behavior telemetry captured for this employee.";
}

function filterBySearch(items, query, projector) {
  if (!query) {
    return items;
  }
  const lowered = query.trim().toLowerCase();
  if (!lowered) {
    return items;
  }
  return items.filter((item) => projector(item).toLowerCase().includes(lowered));
}

function buildLinePath(points, width, height, padding) {
  const values = points.map((point) => Number(point.value || 0));
  const maxValue = Math.max(...values, 1);
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const path = points.map((point, index) => {
    const x = padding + (innerWidth / Math.max(points.length - 1, 1)) * index;
    const y = padding + innerHeight - (Number(point.value || 0) / maxValue) * innerHeight;
    return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ");

  const area = [
    path,
    `L ${width - padding} ${height - padding}`,
    `L ${padding} ${height - padding}`,
    "Z",
  ].join(" ");

  return { path, area, maxValue };
}

function renderStatCard(title, value, note, tone, glyph) {
  return `
    <article class="metric-card panel panel--elevated">
      <div class="metric-card__copy">
        <span class="eyebrow">${escapeHtml(title)}</span>
        <strong>${escapeHtml(value)}</strong>
        <small>${escapeHtml(note)}</small>
      </div>
      <span class="metric-card__glyph metric-card__glyph--${escapeHtml(tone)}">${glyph}</span>
    </article>
  `;
}

function renderDistributionCard(items) {
  const total = items.reduce((sum, item) => sum + Number(item.value || 0), 0);
  return `
    <article class="panel">
      <div class="panel-heading">
        <div>
          <h3>Risk Distribution</h3>
          <p>Current exposure breakdown</p>
        </div>
      </div>
      <div class="stack-list">
        ${items.map((item) => `
          <div class="distribution-row">
            <div class="distribution-row__label">
              <span class="dot dot--${levelClass(item.label)}"></span>
              <span>${escapeHtml(item.label)}</span>
            </div>
            <strong>${formatNumber(item.value)} users</strong>
            <div class="progress-track">
              <span class="progress-fill progress-fill--${levelClass(item.label)}" style="width:${formatPercent(item.value, total)}%"></span>
            </div>
          </div>
        `).join("")}
      </div>
    </article>
  `;
}

function renderTrendCard(points, refreshedAt) {
  const width = 640;
  const height = 240;
  const padding = 24;
  const { path, area, maxValue } = buildLinePath(points, width, height, padding);
  const tickValues = [0, maxValue * 0.5, maxValue].map((value) => Math.round(value));

  return `
    <article class="panel panel--wide">
      <div class="panel-heading">
        <div>
          <h3>Risk Trajectory</h3>
          <p>Pressure over the last 12 hours</p>
        </div>
        <span class="panel-meta">Last updated: ${escapeHtml(formatRelativeTime(refreshedAt))}</span>
      </div>
      <div class="line-chart">
        <div class="line-chart__axis">
          ${tickValues.reverse().map((tick) => `<span>${tick}</span>`).join("")}
        </div>
        <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Risk trend chart">
          <defs>
            <linearGradient id="trendArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stop-color="#7c4dff" stop-opacity="0.32"></stop>
              <stop offset="100%" stop-color="#7c4dff" stop-opacity="0.02"></stop>
            </linearGradient>
          </defs>
          <g class="line-chart__grid">
            <line x1="24" y1="24" x2="616" y2="24"></line>
            <line x1="24" y1="120" x2="616" y2="120"></line>
            <line x1="24" y1="216" x2="616" y2="216"></line>
          </g>
          <path class="line-chart__area" d="${area}"></path>
          <path class="line-chart__stroke" d="${path}"></path>
          ${points.map((point, index) => {
            const x = padding + ((width - padding * 2) / Math.max(points.length - 1, 1)) * index;
            const y = padding + (height - padding * 2) - (Number(point.value || 0) / Math.max(maxValue, 1)) * (height - padding * 2);
            return `<circle class="line-chart__dot" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="4"></circle>`;
          }).join("")}
        </svg>
        <div class="line-chart__labels">
          ${points.map((point) => `<span>${escapeHtml(point.label)}</span>`).join("")}
        </div>
      </div>
    </article>
  `;
}

function renderWatchlist(items) {
  return `
    <article class="panel">
      <div class="panel-heading">
        <div>
          <h3>Watchlist Snapshot</h3>
          <p>Employees requiring the fastest review</p>
        </div>
      </div>
      <div class="queue-list">
        ${items.length ? items.map((employee) => `
          <button class="queue-row" type="button" data-jump-employee="${employee.id}">
            <span class="avatar">${escapeHtml(toInitials(employee.name))}</span>
            <span class="queue-row__copy">
              <strong>${escapeHtml(employee.name)}</strong>
              <small>${escapeHtml(employee.employee_code)} · ${escapeHtml(employee.department)}</small>
            </span>
            <span class="queue-row__score">
              <span class="pill pill--${levelClass(employee.current_risk_level)}">${escapeHtml(employee.current_risk_level)}</span>
              <strong>${formatScore(employee.current_risk_score)}</strong>
            </span>
          </button>
        `).join("") : `<p class="empty-state">No employees currently exceed the watchlist threshold.</p>`}
      </div>
    </article>
  `;
}

function renderAlertQueue(alerts) {
  return `
    <article class="panel">
      <div class="panel-heading">
        <div>
          <h3>Alert Queue</h3>
          <p>Newest notifications sent to the response channel</p>
        </div>
      </div>
      <div class="stack-list">
        ${alerts.length ? alerts.map((alert) => `
          <div class="alert-card">
            <div class="alert-card__top">
              <span class="pill pill--${levelClass(alert.risk_level)}">${escapeHtml(alert.risk_level)}</span>
              <span>${escapeHtml(formatRelativeTime(alert.created_at))}</span>
            </div>
            <strong>${escapeHtml(alert.employee_name)}</strong>
            <p>${escapeHtml(alert.message)}</p>
          </div>
        `).join("") : `<p class="empty-state">No alerts have been issued yet.</p>`}
      </div>
    </article>
  `;
}

function renderBarList(items, title, subtitle, tone = "violet") {
  const max = Math.max(...items.map((item) => Number(item.value || 0)), 1);
  return `
    <article class="panel">
      <div class="panel-heading">
        <div>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(subtitle)}</p>
        </div>
      </div>
      <div class="bar-list">
        ${items.length ? items.map((item, index) => `
          <div class="bar-row">
            <div class="bar-row__label">
              <span>${String(index + 1).padStart(2, "0")}</span>
              <strong>${escapeHtml(item.label)}</strong>
            </div>
            <div class="bar-row__track">
              <span class="bar-row__fill bar-row__fill--${escapeHtml(tone)}" style="width:${Math.max(8, (Number(item.value || 0) / max) * 100)}%"></span>
            </div>
            <strong>${formatNumber(item.value)}</strong>
          </div>
        `).join("") : `<p class="empty-state">No telemetry available yet.</p>`}
      </div>
    </article>
  `;
}

function renderOverviewPage(state) {
  const overview = state.overview;
  if (!overview) {
    return `<div class="panel"><p class="empty-state">Overview data will appear as soon as the platform connects.</p></div>`;
  }

  const employees = filterBySearch(
    overview.watchlist,
    state.filters.global,
    (employee) => `${employee.name} ${employee.employee_code} ${employee.department}`
  );

  return `
    <section class="metric-grid">
      ${renderStatCard("Total Monitored", formatNumber(overview.total_employees), `${formatScore(overview.average_risk_score)} avg risk score`, "violet", "01")}
      ${renderStatCard("High Risk", formatNumber(overview.high_risk_employees), `${overview.watchlist.length} in watchlist`, "danger", "02")}
      ${renderStatCard("Active Alerts", formatNumber(overview.active_alerts), "Requires attention", "amber", "03")}
      ${renderStatCard("Recent Events", formatNumber(overview.recent_events), `${overview.system_mode} mode`, "emerald", "04")}
    </section>

    <section class="grid grid--primary">
      ${renderTrendCard(overview.risk_trend, overview.refreshed_at)}
      ${renderDistributionCard(overview.risk_distribution)}
    </section>

    <section class="grid grid--balanced">
      ${renderWatchlist(employees.slice(0, 6))}
      ${renderAlertQueue(overview.alerts.slice(0, 4))}
    </section>

    <section class="grid grid--balanced">
      ${renderBarList(overview.department_risk, "Department Pressure", "Risk load by department")}
      ${renderBarList(overview.top_triggers, "Signal Mix", "Top triggers shaping the story", "danger")}
    </section>
  `;
}

function renderInvestigationsPage(state) {
  const overview = state.overview;
  if (!overview) {
    return `<div class="panel"><p class="empty-state">Investigation data will appear once the overview feed is ready.</p></div>`;
  }

  const filters = state.filters.investigations;
  let employees = overview.employees || [];

  employees = filterBySearch(
    employees,
    `${state.filters.global} ${filters.query}`.trim(),
    (employee) => `${employee.name} ${employee.employee_code} ${employee.department} ${employee.title}`
  );

  if (filters.level !== "all") {
    employees = employees.filter((employee) => employee.current_risk_level.toLowerCase() === filters.level);
  }

  if (filters.department !== "all") {
    employees = employees.filter((employee) => employee.department.toLowerCase() === filters.department);
  }

  const detail = state.employeeDetail;
  const baseline = detail?.baseline_profile || {};
  const activity = detail?.recent_activity || [];
  const alerts = detail?.alerts || [];

  return `
    <div class="toolbar">
      <label class="toolbar-search">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"></circle>
          <path d="M16 16L21 21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
        </svg>
        <input type="search" id="investigationSearchInput" placeholder="Search by name, code, title, or department..." value="${escapeHtml(filters.query)}">
      </label>

      <label class="toolbar-select">
        <span class="sr-only">Risk level</span>
        <select id="investigationLevelSelect">
          <option value="all" ${filters.level === "all" ? "selected" : ""}>All levels</option>
          <option value="high" ${filters.level === "high" ? "selected" : ""}>High only</option>
          <option value="medium" ${filters.level === "medium" ? "selected" : ""}>Medium only</option>
          <option value="low" ${filters.level === "low" ? "selected" : ""}>Low only</option>
        </select>
      </label>

      <label class="toolbar-select">
        <span class="sr-only">Department</span>
        <select id="investigationDepartmentSelect">
          <option value="all" ${filters.department === "all" ? "selected" : ""}>All people</option>
          ${[...new Set((overview.employees || []).map((employee) => employee.department))].sort().map((department) => `
            <option value="${escapeHtml(department.toLowerCase())}" ${filters.department === department.toLowerCase() ? "selected" : ""}>${escapeHtml(department)}</option>
          `).join("")}
        </select>
      </label>
    </div>

    <section class="split-layout">
      <article class="panel panel--queue">
        <div class="panel-heading">
          <div>
            <h3>Case Queue</h3>
            <p>${employees.length} result${employees.length === 1 ? "" : "s"}</p>
          </div>
        </div>
        <div class="queue-table">
          <div class="queue-table__head">
            <span>Employee</span>
            <span>Score</span>
            <span>Level</span>
            <span>Seen</span>
          </div>
          <div class="queue-table__body">
            ${employees.length ? employees.map((employee) => `
              <button
                class="case-row ${state.selectedEmployeeId === employee.id ? "is-active" : ""}"
                type="button"
                data-select-employee="${employee.id}"
              >
                <span class="avatar">${escapeHtml(toInitials(employee.name))}</span>
                <span class="case-row__primary">
                  <strong>${escapeHtml(employee.name)}</strong>
                  <small>${escapeHtml(employee.employee_code)} · ${escapeHtml(employee.title)}</small>
                </span>
                <strong>${formatScore(employee.current_risk_score)}</strong>
                <span class="pill pill--${levelClass(employee.current_risk_level)}">${escapeHtml(employee.current_risk_level)}</span>
                <span>${escapeHtml(formatRelativeTime(employee.last_seen_at))}</span>
              </button>
            `).join("") : `<p class="empty-state">No employees match the current filters.</p>`}
          </div>
        </div>
      </article>

      <article class="panel panel--detail">
        ${detail ? `
          <div class="detail-hero">
            <span class="avatar avatar--large">${escapeHtml(toInitials(detail.employee.name))}</span>
            <div class="detail-hero__copy">
              <small>${escapeHtml(detail.employee.employee_code)}</small>
              <h3>${escapeHtml(detail.employee.name)}</h3>
              <p>${escapeHtml(detail.employee.department)} · ${escapeHtml(detail.employee.title)}</p>
            </div>
            <span class="pill pill--${levelClass(detail.employee.current_risk_level)}">${escapeHtml(detail.employee.current_risk_level)}</span>
          </div>

          <div class="detail-metrics">
            <div class="detail-stat">
              <span>Current Score</span>
              <strong>${formatScore(detail.employee.current_risk_score)}</strong>
            </div>
            <div class="detail-stat">
              <span>Last Seen</span>
              <strong>${escapeHtml(formatRelativeTime(detail.employee.last_seen_at))}</strong>
            </div>
          </div>

          <div class="detail-section">
            <div class="panel-heading">
              <div>
                <h3>Baseline Profile</h3>
                <p>Expected behavior boundaries for this employee</p>
              </div>
            </div>
            <div class="baseline-grid">
              <div class="baseline-card"><span>Typical Hours</span><strong>${escapeHtml(`${formatHour(baseline.login_window?.start ?? 8)} - ${formatHour(baseline.login_window?.end ?? 18)}`)}</strong></div>
              <div class="baseline-card"><span>Common Location</span><strong>${escapeHtml(baseline.home_location || "HQ-West")}</strong></div>
              <div class="baseline-card"><span>Downloads / Hour</span><strong>${escapeHtml(String(baseline.downloads_per_hour || 0))}</strong></div>
              <div class="baseline-card"><span>Transfer Baseline</span><strong>${escapeHtml(`${baseline.typical_transfer_mb || 0} MB`)}</strong></div>
              <div class="baseline-card"><span>USB Policy</span><strong>${baseline.usb_allowed ? "Allowed" : "Restricted"}</strong></div>
              <div class="baseline-card"><span>Security Clearance</span><strong>${escapeHtml(labelize(baseline.sensitive_access_level || "standard"))}</strong></div>
            </div>
          </div>

          <div class="detail-section">
            <div class="panel-heading">
              <div>
                <h3>Recent Activity</h3>
                <p>Latest actions associated with this investigation</p>
              </div>
            </div>
            <div class="stack-list">
              ${activity.length ? activity.map((item) => `
                <div class="signal-card">
                  <div class="signal-card__top">
                    <strong>${escapeHtml(EVENT_LABELS[item.event_type] || labelize(item.event_type))}</strong>
                    <span>${escapeHtml(formatRelativeTime(item.happened_at))}</span>
                  </div>
                  <p>${escapeHtml(summarizeActivity(item))}</p>
                </div>
              `).join("") : `<p class="empty-state">No activity has been recorded for this employee yet.</p>`}
            </div>
          </div>

          <div class="detail-section">
            <div class="panel-heading">
              <div>
                <h3>Alert History</h3>
                <p>Most recent notifications issued for this employee</p>
              </div>
            </div>
            <div class="stack-list">
              ${alerts.length ? alerts.map((alert) => `
                <div class="alert-card">
                  <div class="alert-card__top">
                    <span class="pill pill--${levelClass(alert.risk_level)}">${escapeHtml(alert.risk_level)}</span>
                    <span>${escapeHtml(formatRelativeTime(alert.created_at))}</span>
                  </div>
                  <strong>${escapeHtml(formatScore(alert.risk_score))} score</strong>
                  <p>${escapeHtml(alert.message)}</p>
                </div>
              `).join("") : `<p class="empty-state">No alerts have been created for this employee.</p>`}
            </div>
          </div>
        ` : `
          <div class="placeholder-state">
            <div class="placeholder-state__icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="8" r="3.2" fill="none" stroke="currentColor" stroke-width="1.8"></circle>
                <path d="M6 19C6.9 16.5 9.1 15.2 12 15.2C14.9 15.2 17.1 16.5 18 19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
              </svg>
            </div>
            <p>Select an employee to inspect baseline expectations, recent activity, and alert history.</p>
          </div>
        `}
      </article>
    </section>
  `;
}

function renderActivityPage(state) {
  const overview = state.overview;
  if (!overview) {
    return `<div class="panel"><p class="empty-state">Activity will appear when the live stream is connected.</p></div>`;
  }

  const filters = state.filters.activity;
  let activities = overview.activity_feed || [];
  activities = filterBySearch(
    activities,
    `${state.filters.global} ${filters.query}`.trim(),
    (item) => `${item.employee_name} ${item.employee_code} ${item.department} ${item.event_type} ${summarizeActivity(item)}`
  );

  if (filters.eventType !== "all") {
    activities = activities.filter((item) => item.event_type === filters.eventType);
  }

  if (filters.severity !== "all") {
    activities = activities.filter((item) => item.severity === filters.severity);
  }

  return `
    <div class="toolbar">
      <label class="toolbar-search">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"></circle>
          <path d="M16 16L21 21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
        </svg>
        <input type="search" id="activitySearchInput" placeholder="Search by employee, event type, department..." value="${escapeHtml(filters.query)}">
      </label>

      <label class="toolbar-select">
        <select id="activityEventTypeSelect">
          <option value="all" ${filters.eventType === "all" ? "selected" : ""}>All events</option>
          ${Object.entries(EVENT_LABELS).map(([value, label]) => `
            <option value="${escapeHtml(value)}" ${filters.eventType === value ? "selected" : ""}>${escapeHtml(label)}</option>
          `).join("")}
        </select>
      </label>

      <label class="toolbar-select">
        <select id="activitySeveritySelect">
          <option value="all" ${filters.severity === "all" ? "selected" : ""}>All severities</option>
          <option value="critical" ${filters.severity === "critical" ? "selected" : ""}>Critical</option>
          <option value="high" ${filters.severity === "high" ? "selected" : ""}>High</option>
          <option value="medium" ${filters.severity === "medium" ? "selected" : ""}>Medium</option>
          <option value="low" ${filters.severity === "low" ? "selected" : ""}>Low</option>
        </select>
      </label>
    </div>

    <section class="grid grid--stream">
      <article class="panel panel--feed">
        <div class="panel-heading">
          <div>
            <h3>Event Feed</h3>
            <p>${activities.length} event${activities.length === 1 ? "" : "s"}</p>
          </div>
        </div>

        <div class="feed-list">
          ${activities.length ? activities.map((item) => `
            <div class="feed-card">
              <div class="feed-card__top">
                <div class="feed-card__identity">
                  <span class="avatar">${escapeHtml(toInitials(item.employee_name))}</span>
                  <div>
                    <strong>${escapeHtml(item.employee_name)}</strong>
                    <small>${escapeHtml(item.employee_code)} · ${escapeHtml(item.department)}</small>
                  </div>
                </div>
                <span class="pill pill--${severityClass(item.severity)}">${escapeHtml(labelize(item.severity))}</span>
              </div>
              <h4>${escapeHtml(EVENT_LABELS[item.event_type] || labelize(item.event_type))}</h4>
              <p>${escapeHtml(summarizeActivity(item))}</p>
              <div class="feed-card__meta">
                <span>Delta: +${escapeHtml(formatScore(item.risk_delta))}</span>
                <span>${escapeHtml(formatRelativeTime(item.happened_at))}</span>
                <span>${escapeHtml(item.mode)} mode</span>
              </div>
            </div>
          `).join("") : `<p class="empty-state">No activity matches the current filters.</p>`}
        </div>
      </article>

      <div class="side-stack">
        ${renderBarList(overview.top_triggers, "Signal Mix", "Top triggers shaping the story", "danger")}
        ${renderBarList(overview.department_risk, "Department Heat", "Pressure by department")}
      </div>
    </section>
  `;
}

function renderOperationsPage(state) {
  const scenarios = state.scenarios || [];
  const guide = state.guide || { local_targets: [], network_targets: [] };
  const tempo = state.tempo?.tempo || "balanced";
  const mode = state.mode?.mode || "simulation";

  return `
    <section class="grid grid--balanced">
      <article class="panel">
        <div class="panel-heading">
          <div>
            <h3>Monitoring Controls</h3>
            <p>Change operating mode, simulation tempo, and reset the environment.</p>
          </div>
        </div>

        <div class="control-group">
          <span class="eyebrow">Monitoring Mode</span>
          <div class="segmented">
            <button class="segment ${mode === "simulation" ? "is-active" : ""}" type="button" data-set-mode="simulation">Simulation</button>
            <button class="segment ${mode === "real" ? "is-active" : ""}" type="button" data-set-mode="real">Real Monitoring</button>
          </div>
          <p class="helper-text">Switch to real monitoring when you want to accept live ingest events from this PC or another machine.</p>
        </div>

        <div class="control-group">
          <span class="eyebrow">Simulation Tempo</span>
          <div class="segmented">
            ${["calm", "balanced", "demo"].map((value) => `
              <button class="segment ${tempo === value ? "is-active" : ""}" type="button" data-set-tempo="${value}">${escapeHtml(labelize(value))}</button>
            `).join("")}
          </div>
          <p class="helper-text">Balanced stays active enough for demos without turning every second into an incident.</p>
        </div>

        <div class="control-group">
          <span class="eyebrow">System Reset</span>
          <button class="primary-button primary-button--danger" type="button" data-reset-system>Reset Platform to Zero</button>
          <p class="helper-text">Clears alerts, activity history, risk scores, audit history, and re-seeds a clean employee baseline.</p>
        </div>
      </article>

      <article class="panel">
        <div class="panel-heading">
          <div>
            <h3>Connection Targets</h3>
            <p>Use these URLs for the browser app, docs, and same-network demos.</p>
          </div>
        </div>

        <div class="stack-list">
          ${[...(guide.local_targets || []), ...(guide.network_targets || [])].map((target) => `
            <div class="target-card">
              <div class="target-card__copy">
                <strong>${escapeHtml(target.label)}</strong>
                <code>${escapeHtml(target.url)}</code>
                <small>${escapeHtml(target.note || "")}</small>
              </div>
              <div class="target-card__actions">
                <button class="ghost-button" type="button" data-copy-url="${escapeHtml(target.url)}">Copy</button>
                <a class="ghost-button" href="${escapeHtml(target.url)}" target="_blank" rel="noreferrer">Open</a>
              </div>
            </div>
          `).join("") || `<p class="empty-state">No network targets are available until the app is started on a shared host.</p>`}
        </div>
      </article>
    </section>

    <section class="panel">
      <div class="panel-heading">
        <div>
          <h3>Available Scenarios</h3>
          <p>Launch controlled stories into simulation or real monitoring for a live demo.</p>
        </div>
      </div>

      <div class="scenario-grid">
        ${scenarios.map((scenario) => `
          <button class="scenario-card scenario-card--${categoryClass(scenario.category)}" type="button" data-emit-scenario="${escapeHtml(scenario.id)}">
            <strong>${escapeHtml(scenario.label)}</strong>
            <p>${escapeHtml(scenario.description)}</p>
            <div class="scenario-card__meta">
              <span>${escapeHtml(scenario.steps)} steps</span>
              <span>${escapeHtml(labelize(scenario.category))}</span>
              <span>${escapeHtml(labelize(scenario.default_mode))}</span>
            </div>
          </button>
        `).join("")}
      </div>
    </section>

    ${state.lastOperation ? `
      <section class="panel">
        <div class="panel-heading">
          <div>
            <h3>Last Operation</h3>
            <p>Most recent control action executed from this console.</p>
          </div>
        </div>
        <div class="signal-card">
          <div class="signal-card__top">
            <strong>${escapeHtml(state.lastOperation.title)}</strong>
            <span>${escapeHtml(state.lastOperation.time)}</span>
          </div>
          <p>${escapeHtml(state.lastOperation.message)}</p>
        </div>
      </section>
    ` : ""}
  `;
}

function renderRulesTab(rules) {
  return `
    <div class="stack-list">
      <div class="rule-threshold">
        <span class="eyebrow">High-risk threshold</span>
        <strong>${formatScore(rules.threshold)}</strong>
      </div>
      ${rules.rules.map((rule) => `
        <div class="rule-card">
          <div>
            <strong>${escapeHtml(rule.name)}</strong>
            <p>${escapeHtml(rule.description)}</p>
          </div>
          <span class="pill pill--medium">+${escapeHtml(rule.points)} pts</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderAuditTab(entries) {
  return `
    <div class="stack-list">
      ${entries.length ? entries.map((entry) => `
        <div class="signal-card">
          <div class="signal-card__top">
            <strong>${escapeHtml(labelize(entry.action))}</strong>
            <span>${escapeHtml(formatRelativeTime(entry.created_at))}</span>
          </div>
          <p>${escapeHtml(entry.actor_email)} changed ${escapeHtml(entry.target)}.</p>
        </div>
      `).join("") : `<p class="empty-state">Audit events will appear here after administrative actions occur.</p>`}
    </div>
  `;
}

function renderSystemInfoTab(state) {
  const guide = state.guide || { local_targets: [], network_targets: [] };
  return `
    <div class="info-grid">
      <div class="baseline-card">
        <span>SentraGuard AI</span>
        <strong>Enterprise Insider Threat Platform</strong>
      </div>
      <div class="baseline-card">
        <span>UI Version</span>
        <strong>2.0.0</strong>
      </div>
      <div class="baseline-card">
        <span>Current Mode</span>
        <strong>${escapeHtml(labelize(state.mode?.mode || "simulation"))}</strong>
      </div>
      <div class="baseline-card">
        <span>Simulation Tempo</span>
        <strong>${escapeHtml(labelize(state.tempo?.tempo || "balanced"))}</strong>
      </div>
    </div>

    <div class="stack-list">
      <div class="signal-card">
        <div class="signal-card__top">
          <strong>Capabilities</strong>
        </div>
        <p>Behavioral analytics and risk scoring</p>
        <p>Real-time activity monitoring</p>
        <p>Investigation workspace</p>
        <p>Scenario simulation and testing</p>
        <p>REST API and WebSocket streaming</p>
      </div>
      ${[...(guide.local_targets || []), ...(guide.network_targets || [])].map((target) => `
        <div class="target-card">
          <div class="target-card__copy">
            <strong>${escapeHtml(target.label)}</strong>
            <code>${escapeHtml(target.url)}</code>
            <small>${escapeHtml(target.note || "")}</small>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderSettingsPage(state) {
  const currentTab = state.settingsTab || "rules";
  const rules = state.rules || { threshold: 70, rules: [] };
  const audit = state.audit || [];

  let body = "";
  if (currentTab === "rules") {
    body = renderRulesTab(rules);
  } else if (currentTab === "audit") {
    body = renderAuditTab(audit);
  } else {
    body = renderSystemInfoTab(state);
  }

  return `
    <div class="settings-tabs">
      <button class="settings-tab ${currentTab === "rules" ? "is-active" : ""}" type="button" data-settings-tab="rules">Risk Rules</button>
      <button class="settings-tab ${currentTab === "audit" ? "is-active" : ""}" type="button" data-settings-tab="audit">Audit Log</button>
      <button class="settings-tab ${currentTab === "info" ? "is-active" : ""}" type="button" data-settings-tab="info">System Info</button>
    </div>
    <section class="panel">${body}</section>
  `;
}

export function renderLandingScreen() {
  return `
    <div class="landing-shell">
      <header class="landing-header">
        <button class="brand-lockup" type="button" data-show-landing>
          <span class="brand-mark brand-mark--green" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <path d="M12 3.2L17.9 5.4V10.7C17.9 14 15.4 17 12 18.2C8.6 17 6.1 14 6.1 10.7V5.4L12 3.2Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"></path>
              <path d="M12 6.6V14.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></path>
            </svg>
          </span>
          <span>
            <strong>SentraGuard</strong>
            <small>AI Security Platform</small>
          </span>
        </button>

        <nav class="landing-nav">
          <a href="#features">Features</a>
          <a href="#capabilities">Capabilities</a>
          <a href="#platform">Platform</a>
        </nav>

        <div class="landing-actions">
          <button class="ghost-button ghost-button--plain" type="button" data-open-login>Sign In</button>
          <button class="primary-button" type="button" data-open-login>Access Platform</button>
        </div>
      </header>

      <main class="landing-main">
        <section class="hero-block">
          <span class="hero-pill">Enterprise Insider Threat Platform</span>
          <h1>AI-Powered Insider Threat Detection</h1>
          <p>Behavioral analytics that monitors, scores, and surfaces insider risk in real time. Protect your organization from data exfiltration, credential abuse, and malicious actors.</p>
          <div class="hero-actions">
            <button class="primary-button" type="button" data-open-login>Access Platform</button>
            <a class="ghost-button" href="#capabilities">View Capabilities</a>
          </div>
        </section>

        <section class="landing-grid" id="features">
          <article class="landing-panel">
            <span class="eyebrow">Monitor</span>
            <h3>Score employee behavior continuously</h3>
            <p>Capture authentication, downloads, removable media activity, and sensitive access as a single insider-risk story.</p>
          </article>
          <article class="landing-panel">
            <span class="eyebrow">Investigate</span>
            <h3>Move from signal to employee context instantly</h3>
            <p>Jump from live events into baseline expectations, recent activity, and alert history without leaving the workspace.</p>
          </article>
          <article class="landing-panel">
            <span class="eyebrow">Respond</span>
            <h3>Drive demos or real ingestion from the same console</h3>
            <p>Run simulation stories for a pitch, or switch to real monitoring and accept log events from this PC or a shared network target.</p>
          </article>
        </section>

        <section class="capability-strip" id="capabilities">
          <div class="capability-chip">Behavioral analytics</div>
          <div class="capability-chip">Risk scoring engine</div>
          <div class="capability-chip">Real-time alerting</div>
          <div class="capability-chip">Case management</div>
          <div class="capability-chip">Scenario simulation</div>
          <div class="capability-chip">Live log ingestion</div>
        </section>

        <section class="landing-panel landing-panel--platform" id="platform">
          <div>
            <span class="eyebrow">Platform</span>
            <h3>One product surface from first impression to response workflow</h3>
            <p>The browser experience and desktop app share the same product shell, so demos, investigations, and real monitoring feel identical everywhere.</p>
          </div>
          <button class="primary-button" type="button" data-open-login>Launch Secure Workspace</button>
        </section>
      </main>
    </div>
  `;
}

export function renderLoginScreen(state) {
  const email = state.loginEmail || "admin@sentraguard.local";
  const password = state.loginPassword || "";
  return `
    <div class="login-shell">
      <div class="login-form-wrap">
        <button class="brand-lockup brand-lockup--login" type="button" data-show-landing>
          <span class="brand-mark brand-mark--green" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <path d="M12 3.2L17.9 5.4V10.7C17.9 14 15.4 17 12 18.2C8.6 17 6.1 14 6.1 10.7V5.4L12 3.2Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"></path>
              <path d="M12 6.6V14.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></path>
            </svg>
          </span>
          <span>
            <strong>SentraGuard</strong>
            <small>Secure platform access</small>
          </span>
        </button>

        <div class="login-copy">
          <h1>Sign in to your account</h1>
          <p>Access the insider threat detection platform.</p>
        </div>

        <div class="login-note">
          <strong>Demo Mode Available</strong>
          <p>Use the demo credentials below to explore the platform with simulated data.</p>
        </div>

        <form class="login-form" id="loginForm">
          <label>
            <span>Email address</span>
            <input id="loginEmailInput" type="email" autocomplete="username" value="${escapeHtml(email)}" required>
          </label>

          <label>
            <span>Password</span>
            <input id="loginPasswordInput" type="password" autocomplete="current-password" value="${escapeHtml(password)}" placeholder="Enter your password" required>
          </label>

          ${state.loginError ? `<div class="form-error">${escapeHtml(state.loginError)}</div>` : ""}

          <button class="primary-button primary-button--wide" type="submit">${state.isAuthenticating ? "Signing in..." : "Sign in"}</button>
          <button class="ghost-button ghost-button--wide" id="demoCredentialsButton" type="button">Use Demo Credentials</button>
        </form>

        <p class="login-footnote">Secure authentication with encrypted credentials.</p>
      </div>

      <div class="login-visual">
        <div class="login-visual__card">
          <div class="panel-heading">
            <div>
              <h3>Security Overview</h3>
            </div>
            <span class="status-inline"><span class="dot dot--emerald"></span>Monitoring Active</span>
          </div>

          <div class="login-overview__hero">
            <div>
              <span>Total Monitored</span>
              <strong>248</strong>
            </div>
            <span class="shield-badge">SG</span>
          </div>

          <div class="login-overview__stats">
            <div class="mini-stat mini-stat--danger">
              <strong>2</strong>
              <span>High Risk</span>
            </div>
            <div class="mini-stat mini-stat--amber">
              <strong>18</strong>
              <span>Medium</span>
            </div>
            <div class="mini-stat mini-stat--emerald">
              <strong>228</strong>
              <span>Low Risk</span>
            </div>
          </div>

          <p class="status-inline"><span class="dot dot--emerald"></span>All systems operational</p>
        </div>

        <p class="login-visual__caption">Real-time behavioral analytics protecting your organization from insider threats.</p>
      </div>
    </div>
  `;
}

export function renderRuntimeCard(state) {
  return `
    <div class="runtime-card__top">
      <span>Runtime</span>
      <span class="status-inline"><span class="dot dot--emerald"></span>${state.websocketConnected ? "Live" : "Syncing"}</span>
    </div>
    <strong>${escapeHtml(labelize(state.mode?.mode || "simulation"))} Mode</strong>
    <p>${escapeHtml(state.guide?.share_mode_enabled ? "Real monitoring enabled" : "Local monitoring active")}</p>
  `;
}

export function renderAdminCard(state) {
  const email = state.adminEmail || state.me?.email || "admin@sentraguard.local";
  return `
    <div class="admin-card__identity">
      <span class="avatar">${escapeHtml(toInitials(email))}</span>
      <div>
        <strong>${escapeHtml(email)}</strong>
        <small>${escapeHtml(state.me?.role || "Admin")}</small>
      </div>
    </div>
    <button class="ghost-button ghost-button--tiny" id="logoutButton" type="button">Sign out</button>
  `;
}

export function renderPageHeader(state) {
  const meta = VIEW_META[state.currentView] || VIEW_META.overview;
  return `
    <div class="breadcrumb">Dashboard <span>/</span> ${escapeHtml(meta.label)}</div>
    <h1>${escapeHtml(meta.title)}</h1>
    <p>${escapeHtml(meta.subtitle)}</p>
  `;
}

export function renderPageContent(state) {
  if (state.currentView === "investigations") {
    return renderInvestigationsPage(state);
  }
  if (state.currentView === "activity") {
    return renderActivityPage(state);
  }
  if (state.currentView === "operations") {
    return renderOperationsPage(state);
  }
  if (state.currentView === "settings") {
    return renderSettingsPage(state);
  }
  return renderOverviewPage(state);
}
