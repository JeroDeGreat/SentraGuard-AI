function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function humanizeLabel(value) {
  return String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function renderEmptyState(message) {
  return `<p class="empty-state">${escapeHtml(message)}</p>`;
}

function avatarLabel(value) {
  const safeValue = String(value ?? "SG");
  const parts = safeValue.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return safeValue.slice(0, 2).toUpperCase();
}

function formatValue(value) {
  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "None";
  }

  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => `${humanizeLabel(key)}: ${item}`)
      .join(" | ");
  }

  if (value === null || value === undefined || value === "") {
    return "None";
  }

  return String(value);
}

function actionLabel(action, index) {
  const normalized = String(action).toLowerCase();
  if (normalized.includes("watchlist")) {
    return "Immediate triage";
  }
  if (normalized.includes("password") || normalized.includes("authentication")) {
    return "Credential response";
  }
  if (normalized.includes("usb") || normalized.includes("removable")) {
    return "Device control";
  }
  if (normalized.includes("transfer") || normalized.includes("cloud")) {
    return "Exfiltration review";
  }
  if (normalized.includes("sensitive") || normalized.includes("access")) {
    return "Access review";
  }
  if (normalized.includes("ingestion") || normalized.includes("forwarder")) {
    return "Pipeline verification";
  }
  return `Step ${String(index + 1).padStart(2, "0")}`;
}

export function formatRelativeTime(isoString) {
  if (!isoString) {
    return "No signal yet";
  }

  const target = new Date(isoString);
  const diffSeconds = Math.round((Date.now() - target.getTime()) / 1000);
  if (diffSeconds < 60) {
    return `${Math.max(diffSeconds, 0)}s ago`;
  }
  if (diffSeconds < 3600) {
    return `${Math.round(diffSeconds / 60)}m ago`;
  }
  if (diffSeconds < 86400) {
    return `${Math.round(diffSeconds / 3600)}h ago`;
  }
  return target.toLocaleString();
}

export function formatTimestamp(isoString) {
  if (!isoString) {
    return "Unknown";
  }

  return new Date(isoString).toLocaleString([], {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
}

export function levelClass(level) {
  const normalized = String(level || "Low").toLowerCase();
  return `risk-pill--${normalized}`;
}

export function renderMetrics(container, overview) {
  const metrics = [
    {
      label: "Monitored employees",
      value: overview.total_employees,
      note: `${overview.average_risk_score.toFixed(1)} average risk score across the monitored workforce`,
      tag: "WF",
    },
    {
      label: "High-risk cases",
      value: overview.high_risk_employees,
      note: `${overview.watchlist.length} people are currently in the immediate review queue`,
      tag: "HR",
    },
    {
      label: "Open alerts",
      value: overview.active_alerts,
      note:
        overview.active_alerts > 0
          ? "Escalations are waiting for acknowledgement and response."
          : "No employees are currently above the escalation threshold.",
      tag: "AL",
    },
    {
      label: "Recent signals",
      value: overview.recent_events,
      note: `Current source: ${overview.system_mode === "simulation" ? "simulation telemetry" : "real ingestion"}`,
      tag: "SG",
    },
  ];

  container.innerHTML = metrics
    .map(
      (metric) => `
        <article class="summary-card">
          <div class="summary-card__head">
            <div>
              <p class="metric-label">${escapeHtml(metric.label)}</p>
              <div class="summary-value">${escapeHtml(metric.value)}</div>
            </div>
            <span class="summary-icon">${escapeHtml(metric.tag)}</span>
          </div>
          <p class="metric-note">${escapeHtml(metric.note)}</p>
        </article>
      `
    )
    .join("");
}

export function renderRiskDistribution(container, items) {
  if (!items.length) {
    container.innerHTML = renderEmptyState("No risk distribution is available yet.");
    return;
  }

  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
  const colorMap = {
    Low: "var(--risk-low)",
    Medium: "var(--risk-medium)",
    High: "var(--risk-high)",
  };

  container.innerHTML = `<div class="mix-list">${items
    .map((item) => {
      const ratio = (item.value / total) * 100;
      return `
        <article class="mix-row">
          <div class="mix-row__head">
            <span>${escapeHtml(item.label)}</span>
            <strong>${item.value} people</strong>
          </div>
          <div class="track">
            <div class="fill ${item.label === "High" ? "fill--high" : ""}" style="--fill-width:${ratio.toFixed(2)}%; background: linear-gradient(90deg, ${colorMap[item.label] || "var(--accent)"}, ${item.label === "High" ? "var(--risk-high)" : "var(--accent-alt)"});"></div>
          </div>
          <div class="mix-row__meta">${ratio.toFixed(0)}% of monitored employees</div>
        </article>
      `;
    })
    .join("")}</div>`;
}

export function renderDepartmentRisk(container, items) {
  if (!items.length) {
    container.innerHTML = renderEmptyState("No department trends are available yet.");
    return;
  }

  const maxValue = Math.max(...items.map((item) => item.value), 1);
  container.innerHTML = `<div class="bar-list">${items
    .map(
      (item, index) => `
        <article class="bar-row">
          <div class="bar-row__head">
            <span>${String(index + 1).padStart(2, "0")} · ${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.metric_label || `${item.value.toFixed(1)} avg`)}</strong>
          </div>
          <div class="track"><div class="fill" style="--fill-width:${((item.value / maxValue) * 100).toFixed(2)}%;"></div></div>
          <div class="mix-row__meta">${escapeHtml(item.meta_label || `${item.secondary || 0} high-risk employee${item.secondary === 1 ? "" : "s"}`)}</div>
        </article>
      `
    )
    .join("")}</div>`;
}

function buildPath(points, width, height, baseline) {
  if (!points.length) {
    return "";
  }

  const stepX = width / Math.max(points.length - 1, 1);
  return points
    .map((value, index) => {
      const x = index * stepX;
      const y = baseline - value;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export function renderTrend(container, items) {
  if (!items.length) {
    container.innerHTML = renderEmptyState("No recent activity buckets yet.");
    return;
  }

  const width = 640;
  const height = 220;
  const padding = { top: 16, right: 12, bottom: 32, left: 12 };
  const maxValue = Math.max(...items.map((item) => item.value), 10);
  const chartHeight = height - padding.top - padding.bottom;
  const scaled = items.map((item) => (item.value / maxValue) * chartHeight);
  const baseline = height - padding.bottom;
  const linePath = buildPath(scaled, width - padding.left - padding.right, chartHeight, baseline);
  const areaPath = `${linePath} L ${width - padding.left - padding.right} ${baseline} L 0 ${baseline} Z`;
  const labelStep = Math.max(Math.floor(items.length / 6), 1);
  const gridValues = [0.25, 0.5, 0.75, 1];

  container.innerHTML = `
    <div class="trend-shell">
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-label="Risk trajectory">
        <defs>
          <linearGradient id="trend-line-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#5fd8c6"></stop>
            <stop offset="100%" stop-color="#7eb9ff"></stop>
          </linearGradient>
          <linearGradient id="trend-area-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#5fd8c6" stop-opacity="0.24"></stop>
            <stop offset="100%" stop-color="#5fd8c6" stop-opacity="0"></stop>
          </linearGradient>
        </defs>
        <g transform="translate(${padding.left}, ${padding.top})">
          ${gridValues
            .map((value) => {
              const y = chartHeight - chartHeight * value;
              return `<line class="trend-grid" x1="0" y1="${y.toFixed(2)}" x2="${(width - padding.left - padding.right).toFixed(2)}" y2="${y.toFixed(2)}"></line>`;
            })
            .join("")}
          <path class="trend-area" d="${areaPath}"></path>
          <path class="trend-line" d="${linePath}"></path>
          ${scaled
            .map((value, index) => {
              const stepX = (width - padding.left - padding.right) / Math.max(items.length - 1, 1);
              const x = index * stepX;
              const y = chartHeight - value;
              return `<circle class="trend-point" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="3.5"></circle>`;
            })
            .join("")}
        </g>
        ${items
          .map((item, index) => {
            if (index % labelStep !== 0 && index !== items.length - 1) {
              return "";
            }
            const stepX = (width - padding.left - padding.right) / Math.max(items.length - 1, 1);
            const x = padding.left + index * stepX;
            return `<text class="trend-axis" x="${x.toFixed(2)}" y="${height - 8}" text-anchor="middle">${escapeHtml(item.label)}</text>`;
          })
          .join("")}
      </svg>
    </div>
  `;
}

export function renderTriggerBreakdown(container, items) {
  if (!items.length) {
    container.innerHTML = renderEmptyState("No trigger breakdown is available yet.");
    return;
  }

  const maxValue = Math.max(...items.map((item) => item.value), 1);
  container.innerHTML = `<div class="bar-list">${items
    .map(
      (item, index) => `
        <article class="bar-row">
          <div class="bar-row__head">
            <span>${String(index + 1).padStart(2, "0")} · ${escapeHtml(item.label)}</span>
            <strong>${item.value}</strong>
          </div>
          <div class="track">
            <div class="fill ${index === 0 ? "fill--high" : ""}" style="--fill-width:${((item.value / maxValue) * 100).toFixed(2)}%;"></div>
          </div>
        </article>
      `
    )
    .join("")}</div>`;
}

export function renderWatchlist(container, employees) {
  if (!employees.length) {
    container.innerHTML = renderEmptyState("No employees currently need immediate triage.");
    return;
  }

  container.innerHTML = employees
    .map(
      (employee, index) => `
        <article class="priority-item" data-employee-id="${employee.id}" tabindex="0">
          <div class="priority-head">
            <div class="priority-head__identity">
              <span class="priority-index">${String(index + 1).padStart(2, "0")}</span>
              <span class="priority-avatar">${escapeHtml(avatarLabel(employee.name))}</span>
              <div>
                <strong>${escapeHtml(employee.name)}</strong>
                <span>${escapeHtml(employee.employee_code)} · ${escapeHtml(employee.department)}</span>
              </div>
            </div>
            <span class="risk-pill ${levelClass(employee.current_risk_level)}">${escapeHtml(employee.current_risk_level)}</span>
          </div>
          <div class="detail-copy">${escapeHtml(employee.latest_reasons[0] || "No suspicious trigger summary available yet.")}</div>
          <div class="feed-meta">Score ${employee.current_risk_score.toFixed(1)} · ${escapeHtml(formatRelativeTime(employee.last_seen_at))}</div>
        </article>
      `
    )
    .join("");
}

export function renderActions(container, actions) {
  if (!actions.length) {
    container.innerHTML = renderEmptyState("No guidance is available right now.");
    return;
  }

  container.innerHTML = actions
    .map(
      (action, index) => `
        <li class="action-item">
          <span>${escapeHtml(actionLabel(action, index))}</span>
          <p>${escapeHtml(action)}</p>
        </li>
      `
    )
    .join("");
}

export function renderRules(container, payload) {
  container.innerHTML = payload.rules
    .map(
      (rule) => `
        <article class="rule-item">
          <div class="detail-head">
            <strong>${escapeHtml(rule.name)}</strong>
            <span class="badge">${rule.points} pts</span>
          </div>
          <p>${escapeHtml(rule.description)}</p>
        </article>
      `
    )
    .join("");
}

export function renderEmployees(container, employees, selectedId) {
  if (!employees.length) {
    container.innerHTML = `<div class="empty-row">${renderEmptyState("No employees match the current search and filter.")}</div>`;
    return;
  }

  container.innerHTML = employees
    .map(
      (employee) => `
        <button class="investigation-row ${employee.id === selectedId ? "is-selected" : ""}" type="button" data-employee-id="${employee.id}">
          <span class="employee-identity">
            <span class="employee-avatar">${escapeHtml(avatarLabel(employee.name))}</span>
            <span class="employee-identity__copy">
              <strong>${escapeHtml(employee.name)}</strong>
              <span>${escapeHtml(employee.employee_code)} · ${escapeHtml(employee.title)}</span>
            </span>
          </span>
          <span class="investigation-row__reason">${escapeHtml(employee.latest_reasons[0] || "No risk reason recorded yet.")}</span>
          <span class="investigation-row__score">${employee.current_risk_score.toFixed(1)}</span>
          <span class="risk-pill ${levelClass(employee.current_risk_level)}">${escapeHtml(employee.current_risk_level)}</span>
          <span class="investigation-row__seen">${escapeHtml(formatRelativeTime(employee.last_seen_at))}</span>
        </button>
      `
    )
    .join("");
}

export function renderInspector(container, detail) {
  if (!detail) {
    container.innerHTML = renderEmptyState(
      "Select an employee to inspect baseline expectations, recent activity, and alert history."
    );
    return;
  }

  const employee = detail.employee;
  const baselineEntries = Object.entries(detail.baseline_profile || {});
  const recentActivity = detail.recent_activity.slice(0, 5);
  const recentAlerts = detail.alerts.slice(0, 3);

  container.innerHTML = `
    <div class="inspector-card">
      <div class="inspector-header">
        <div>
          <p class="surface__kicker">${escapeHtml(employee.employee_code)}</p>
          <h4>${escapeHtml(employee.name)}</h4>
          <p class="detail-copy">${escapeHtml(employee.department)} · ${escapeHtml(employee.title)}</p>
        </div>
        <span class="risk-pill ${levelClass(employee.current_risk_level)}">${escapeHtml(employee.current_risk_level)}</span>
      </div>

      <div class="inspector-stats">
        <div class="inspector-stat">
          <span>Current score</span>
          <strong>${employee.current_risk_score.toFixed(1)}</strong>
        </div>
        <div class="inspector-stat">
          <span>Last seen</span>
          <strong>${escapeHtml(formatRelativeTime(employee.last_seen_at))}</strong>
        </div>
      </div>

      <div>
        <p class="surface__kicker">Baseline profile</p>
        <div class="inspector-stats">
          ${baselineEntries
            .map(
              ([key, value]) => `
                <div class="inspector-stat">
                  <span>${escapeHtml(humanizeLabel(key))}</span>
                  <strong>${escapeHtml(formatValue(value))}</strong>
                </div>
              `
            )
            .join("")}
        </div>
      </div>

      <div>
        <p class="surface__kicker">Recent activity</p>
        <div class="timeline">
          ${
            recentActivity.length
              ? recentActivity
                  .map(
                    (item) => `
                      <article class="timeline-item">
                        <strong>${escapeHtml(humanizeLabel(item.event_type))}</strong>
                        <span class="feed-meta">${escapeHtml(formatTimestamp(item.happened_at))}</span>
                        <div class="detail-copy">${escapeHtml(item.risk_reasons.join(", ") || "Behavior matched baseline")}</div>
                      </article>
                    `
                  )
                  .join("")
              : renderEmptyState("No recent activity is available for this employee.")
          }
        </div>
      </div>

      <div>
        <p class="surface__kicker">Alert history</p>
        <div class="feed">
          ${
            recentAlerts.length
              ? recentAlerts
                  .map(
                    (alert) => `
                      <article class="event-card">
                        <div class="event-head">
                          <strong>${escapeHtml(alert.message)}</strong>
                          <span class="risk-pill ${levelClass(alert.risk_level)}">${escapeHtml(alert.risk_level)}</span>
                        </div>
                        <div class="detail-copy">${escapeHtml(alert.reasons.join(", ") || "No reasons recorded.")}</div>
                        <div class="feed-meta">${escapeHtml(formatTimestamp(alert.created_at))} · ${escapeHtml(alert.channel)} · ${escapeHtml(alert.status)}</div>
                      </article>
                    `
                  )
                  .join("")
              : renderEmptyState("No alert history for this employee.")
          }
        </div>
      </div>
    </div>
  `;
}

export function renderActivityFeed(container, items) {
  if (!items.length) {
    container.innerHTML = renderEmptyState("No activity has been recorded yet.");
    return;
  }

  container.innerHTML = items
    .map(
      (item) => `
        <article class="event-card" data-employee-id="${item.employee_id}" tabindex="0">
          <div class="event-head">
            <strong><span class="feed-avatar">${escapeHtml(avatarLabel(item.employee_name))}</span>${escapeHtml(item.employee_name)}</strong>
            <span class="risk-pill ${levelClass(item.severity || "Low")}">${escapeHtml(humanizeLabel(item.severity || "Low"))}</span>
          </div>
          <div class="feed-copy">${escapeHtml(humanizeLabel(item.event_type))} · ${escapeHtml(item.department)} · ${escapeHtml(item.source)}</div>
          <div class="detail-copy">${escapeHtml(item.risk_reasons.join(", ") || "Behavior matched baseline")}</div>
          <div class="feed-meta">Delta ${item.risk_delta >= 0 ? "+" : ""}${item.risk_delta.toFixed(1)} · ${escapeHtml(formatRelativeTime(item.happened_at))} · ${escapeHtml(item.mode)} mode</div>
        </article>
      `
    )
    .join("");
}

export function renderAlertsFeed(container, items) {
  if (!items.length) {
    container.innerHTML = renderEmptyState("No high-risk escalations are in the queue.");
    return;
  }

  container.innerHTML = items
    .map(
      (item) => `
        <article class="event-card" data-employee-id="${item.employee_id}" tabindex="0">
          <div class="event-head">
            <strong><span class="feed-avatar">${escapeHtml(avatarLabel(item.employee_name))}</span>${escapeHtml(item.employee_name)}</strong>
            <span class="risk-pill ${levelClass(item.risk_level)}">${escapeHtml(item.risk_level)}</span>
          </div>
          <div class="detail-copy">${escapeHtml(item.message)}</div>
          <div class="feed-copy">${escapeHtml(item.reasons.join(", ") || "No escalation reasons recorded.")}</div>
          <div class="feed-meta">${escapeHtml(formatTimestamp(item.created_at))} · ${escapeHtml(item.channel)} · ${escapeHtml(item.status)}</div>
        </article>
      `
    )
    .join("");
}

export function renderAuditFeed(container, items) {
  if (!items.length) {
    container.innerHTML = renderEmptyState("No administrator actions have been logged yet.");
    return;
  }

  container.innerHTML = items
    .map(
      (item) => `
        <article class="audit-card">
          <div class="event-head">
            <strong><span class="feed-avatar">${escapeHtml(avatarLabel(item.actor_email))}</span>${escapeHtml(item.actor_email)}</strong>
            <span class="badge">${escapeHtml(item.actor_role)}</span>
          </div>
          <div class="feed-copy">${escapeHtml(humanizeLabel(item.action))}</div>
          <div class="detail-copy">${escapeHtml(item.target)}${item.details?.mode ? ` · ${item.details.mode}` : ""}</div>
          <div class="feed-meta">${escapeHtml(formatTimestamp(item.created_at))}</div>
        </article>
      `
    )
    .join("");
}

export function renderScenarioCards(container, items, selectedId) {
  if (!items.length) {
    container.innerHTML = renderEmptyState("No control scenarios are available.");
    return;
  }

  container.innerHTML = items
    .map(
      (item) => `
        <button class="scenario-card ${item.id === selectedId ? "scenario-card--active" : ""}" type="button" data-scenario-id="${escapeHtml(item.id)}">
          <div class="scenario-card__head">
            <span class="badge">${escapeHtml(item.category)}</span>
            <span class="feed-meta">${escapeHtml(item.default_mode)}</span>
          </div>
          <strong>${escapeHtml(item.label)}</strong>
          <p class="detail-copy">${escapeHtml(item.description)}</p>
          <span class="feed-meta">${item.steps} step${item.steps === 1 ? "" : "s"}</span>
        </button>
      `
    )
    .join("");
}

export function renderControlResult(container, payload) {
  if (!payload) {
    container.innerHTML = renderEmptyState("Launch a scenario to see the result summary here.");
    return;
  }

  container.innerHTML = `
    <article class="event-card">
      <div class="event-head">
        <strong>${escapeHtml(humanizeLabel(payload.scenario_id))}</strong>
        <span class="badge">${escapeHtml(payload.target_mode)}</span>
      </div>
      <div class="feed-copy">${escapeHtml(payload.employee_code)} · ${payload.accepted} event${payload.accepted === 1 ? "" : "s"} emitted</div>
      <div class="detail-copy">
        ${payload.flagged_high_risk ? "High-risk threshold reached during the scenario." : "Scenario completed without creating a high-risk employee."}
      </div>
      <div class="feed-meta">${payload.alerts_created} alert${payload.alerts_created === 1 ? "" : "s"} created</div>
    </article>
  `;
}
