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

function avatarLabel(value) {
  const safeValue = String(value ?? "SG");
  const parts = safeValue.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return safeValue.slice(0, 2).toUpperCase();
}

function renderEmptyState(message) {
  return `<div class="empty-state">${escapeHtml(message)}</div>`;
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
    return "Immediate Triage";
  }
  if (normalized.includes("password") || normalized.includes("authentication")) {
    return "Credential Review";
  }
  if (normalized.includes("usb") || normalized.includes("removable")) {
    return "Device Control";
  }
  if (normalized.includes("transfer") || normalized.includes("cloud")) {
    return "Data Movement";
  }
  if (normalized.includes("sensitive") || normalized.includes("access")) {
    return "Access Review";
  }
  if (normalized.includes("ingestion") || normalized.includes("forwarder")) {
    return "Pipeline Check";
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
  return `risk-badge--${normalized}`;
}

export function renderMetrics(container, overview) {
  const metrics = [
    {
      title: "Monitored employees",
      value: overview.total_employees,
      note: `${overview.average_risk_score.toFixed(1)} average risk score`,
      icon: "EM",
    },
    {
      title: "High-risk employees",
      value: overview.high_risk_employees,
      note: `${overview.watchlist.length} currently in the priority queue`,
      icon: "HR",
    },
    {
      title: "Open alerts",
      value: overview.active_alerts,
      note: overview.active_alerts ? "Escalations require review" : "No active escalations",
      icon: "AL",
    },
    {
      title: "Recent events",
      value: overview.recent_events,
      note: overview.system_mode === "simulation" ? "Simulation telemetry live" : "Real ingestion live",
      icon: "EV",
    },
  ];

  container.innerHTML = metrics
    .map(
      (metric) => `
        <article class="metric-card">
          <div class="metric-card__header">
            <div>
              <p class="metric-card__label">${escapeHtml(metric.title)}</p>
              <div class="metric-card__value">${escapeHtml(metric.value)}</div>
            </div>
            <span class="metric-card__icon">${escapeHtml(metric.icon)}</span>
          </div>
          <p class="metric-card__note">${escapeHtml(metric.note)}</p>
        </article>
      `
    )
    .join("");
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
    container.innerHTML = renderEmptyState("No recent trend data is available.");
    return;
  }

  const width = 720;
  const height = 260;
  const padding = { top: 20, right: 20, bottom: 36, left: 16 };
  const maxValue = Math.max(...items.map((item) => item.value), 10);
  const chartHeight = height - padding.top - padding.bottom;
  const scaled = items.map((item) => (item.value / maxValue) * chartHeight);
  const baseline = height - padding.bottom;
  const linePath = buildPath(scaled, width - padding.left - padding.right, chartHeight, baseline);
  const areaPath = `${linePath} L ${width - padding.left - padding.right} ${baseline} L 0 ${baseline} Z`;
  const labelStep = Math.max(Math.floor(items.length / 6), 1);
  const gridValues = [0.25, 0.5, 0.75, 1];

  container.innerHTML = `
    <div class="trend-chart">
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-label="Risk trend chart">
        <defs>
          <linearGradient id="dashboard-line-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#67F0D4"></stop>
            <stop offset="100%" stop-color="#5AB4FF"></stop>
          </linearGradient>
          <linearGradient id="dashboard-area-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#67F0D4" stop-opacity="0.24"></stop>
            <stop offset="100%" stop-color="#67F0D4" stop-opacity="0"></stop>
          </linearGradient>
        </defs>
        <g transform="translate(${padding.left}, ${padding.top})">
          ${gridValues
            .map((value) => {
              const y = chartHeight - chartHeight * value;
              return `<line class="trend-chart__grid" x1="0" y1="${y.toFixed(2)}" x2="${(width - padding.left - padding.right).toFixed(2)}" y2="${y.toFixed(2)}"></line>`;
            })
            .join("")}
          <path class="trend-chart__area" d="${areaPath}"></path>
          <path class="trend-chart__line" d="${linePath}"></path>
          ${scaled
            .map((value, index) => {
              const stepX = (width - padding.left - padding.right) / Math.max(items.length - 1, 1);
              const x = index * stepX;
              const y = chartHeight - value;
              return `<circle class="trend-chart__point" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="3.5"></circle>`;
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
            return `<text class="trend-chart__axis" x="${x.toFixed(2)}" y="${height - 10}" text-anchor="middle">${escapeHtml(item.label)}</text>`;
          })
          .join("")}
      </svg>
    </div>
  `;
}

export function renderRiskDistribution(container, items) {
  if (!items.length) {
    container.innerHTML = renderEmptyState("No risk distribution is available.");
    return;
  }

  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
  container.innerHTML = items
    .map((item) => {
      const percentage = (item.value / total) * 100;
      return `
        <article class="distribution-row">
          <div class="distribution-row__head">
            <strong>${escapeHtml(item.label)}</strong>
            <span>${item.value} employees</span>
          </div>
          <div class="distribution-row__track">
            <div class="distribution-row__fill distribution-row__fill--${escapeHtml(item.label.toLowerCase())}" style="--fill-width:${percentage.toFixed(2)}%;"></div>
          </div>
          <div class="distribution-row__meta">${percentage.toFixed(0)}% of the monitored workforce</div>
        </article>
      `;
    })
    .join("");
}

export function renderDepartmentRisk(container, items) {
  if (!items.length) {
    container.innerHTML = renderEmptyState("No department data is available.");
    return;
  }

  const maxValue = Math.max(...items.map((item) => item.value), 1);
  container.innerHTML = items
    .map(
      (item, index) => `
        <article class="stack-bar">
          <div class="stack-bar__head">
            <span>${String(index + 1).padStart(2, "0")} | ${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.metric_label || `${item.value.toFixed(1)} avg`)}</strong>
          </div>
          <div class="stack-bar__track">
            <div class="stack-bar__fill" style="--fill-width:${((item.value / maxValue) * 100).toFixed(2)}%;"></div>
          </div>
          <div class="stack-bar__meta">${escapeHtml(item.meta_label || `${item.secondary || 0} high-risk employee${item.secondary === 1 ? "" : "s"}`)}</div>
        </article>
      `
    )
    .join("");
}

export function renderTriggerBreakdown(container, items) {
  if (!items.length) {
    container.innerHTML = renderEmptyState("No trigger mix is available.");
    return;
  }

  const maxValue = Math.max(...items.map((item) => item.value), 1);
  container.innerHTML = items
    .map(
      (item, index) => `
        <article class="stack-bar">
          <div class="stack-bar__head">
            <span>${String(index + 1).padStart(2, "0")} | ${escapeHtml(item.label)}</span>
            <strong>${item.value}</strong>
          </div>
          <div class="stack-bar__track">
            <div class="stack-bar__fill ${index === 0 ? "stack-bar__fill--hot" : ""}" style="--fill-width:${((item.value / maxValue) * 100).toFixed(2)}%;"></div>
          </div>
        </article>
      `
    )
    .join("");
}

export function renderWatchlist(container, employees) {
  if (!employees.length) {
    container.innerHTML = renderEmptyState("No employees currently need immediate review.");
    return;
  }

  container.innerHTML = employees
    .map(
      (employee, index) => `
        <article class="case-card" data-employee-id="${employee.id}" tabindex="0">
          <div class="case-card__header">
            <div class="identity">
              <span class="identity__rank">${String(index + 1).padStart(2, "0")}</span>
              <span class="identity__avatar">${escapeHtml(avatarLabel(employee.name))}</span>
              <div class="identity__copy">
                <strong>${escapeHtml(employee.name)}</strong>
                <span>${escapeHtml(employee.employee_code)} | ${escapeHtml(employee.department)}</span>
              </div>
            </div>
            <span class="risk-badge ${levelClass(employee.current_risk_level)}">${escapeHtml(employee.current_risk_level)}</span>
          </div>
          <p class="case-card__reason">${escapeHtml(employee.latest_reasons[0] || "No suspicious trigger summary available yet.")}</p>
          <div class="case-card__meta">Score ${employee.current_risk_score.toFixed(1)} | ${escapeHtml(formatRelativeTime(employee.last_seen_at))}</div>
        </article>
      `
    )
    .join("");
}

export function renderEmployees(container, employees, selectedId) {
  if (!employees.length) {
    container.innerHTML = renderEmptyState("No employees match the current search and filter.");
    return;
  }

  container.innerHTML = employees
    .map(
      (employee) => `
        <button class="employee-row ${employee.id === selectedId ? "employee-row--active" : ""}" type="button" data-employee-id="${employee.id}">
          <span class="employee-row__identity">
            <span class="employee-row__avatar">${escapeHtml(avatarLabel(employee.name))}</span>
            <span class="employee-row__copy">
              <strong>${escapeHtml(employee.name)}</strong>
              <span>${escapeHtml(employee.employee_code)} | ${escapeHtml(employee.title)}</span>
            </span>
          </span>
          <span class="employee-row__reason">${escapeHtml(employee.latest_reasons[0] || "No risk reason recorded yet.")}</span>
          <span class="employee-row__score">${employee.current_risk_score.toFixed(1)}</span>
          <span class="risk-badge ${levelClass(employee.current_risk_level)}">${escapeHtml(employee.current_risk_level)}</span>
          <span class="employee-row__seen">${escapeHtml(formatRelativeTime(employee.last_seen_at))}</span>
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
    <div class="inspector">
      <div class="inspector__header">
        <div>
          <p class="section-kicker">${escapeHtml(employee.employee_code)}</p>
          <h4>${escapeHtml(employee.name)}</h4>
          <p>${escapeHtml(employee.department)} | ${escapeHtml(employee.title)}</p>
        </div>
        <span class="risk-badge ${levelClass(employee.current_risk_level)}">${escapeHtml(employee.current_risk_level)}</span>
      </div>

      <div class="inspector__stats">
        <article class="inspector-stat">
          <span>Current score</span>
          <strong>${employee.current_risk_score.toFixed(1)}</strong>
        </article>
        <article class="inspector-stat">
          <span>Last seen</span>
          <strong>${escapeHtml(formatRelativeTime(employee.last_seen_at))}</strong>
        </article>
      </div>

      <div>
        <p class="section-kicker">Baseline profile</p>
        <div class="inspector__stats">
          ${baselineEntries
            .map(
              ([key, value]) => `
                <article class="inspector-stat">
                  <span>${escapeHtml(humanizeLabel(key))}</span>
                  <strong>${escapeHtml(formatValue(value))}</strong>
                </article>
              `
            )
            .join("")}
        </div>
      </div>

      <div class="inspector__block">
        <p class="section-kicker">Recent activity</p>
        <div class="timeline">
          ${
            recentActivity.length
              ? recentActivity
                  .map(
                    (item) => `
                      <article class="timeline-item">
                        <strong>${escapeHtml(humanizeLabel(item.event_type))}</strong>
                        <span>${escapeHtml(formatTimestamp(item.happened_at))}</span>
                        <p>${escapeHtml(item.risk_reasons.join(", ") || "Behavior matched baseline")}</p>
                      </article>
                    `
                  )
                  .join("")
              : renderEmptyState("No recent activity is available for this employee.")
          }
        </div>
      </div>

      <div class="inspector__block">
        <p class="section-kicker">Alert history</p>
        <div class="feed-list">
          ${
            recentAlerts.length
              ? recentAlerts
                  .map(
                    (alert) => `
                      <article class="feed-card">
                        <div class="feed-card__header">
                          <strong>${escapeHtml(alert.message)}</strong>
                          <span class="risk-badge ${levelClass(alert.risk_level)}">${escapeHtml(alert.risk_level)}</span>
                        </div>
                        <p>${escapeHtml(alert.reasons.join(", ") || "No reasons recorded.")}</p>
                        <span>${escapeHtml(formatTimestamp(alert.created_at))} | ${escapeHtml(alert.channel)} | ${escapeHtml(alert.status)}</span>
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
        <article class="feed-card" data-employee-id="${item.employee_id}" tabindex="0">
          <div class="feed-card__header">
            <strong><span class="feed-card__avatar">${escapeHtml(avatarLabel(item.employee_name))}</span>${escapeHtml(item.employee_name)}</strong>
            <span class="risk-badge ${levelClass(item.severity || "Low")}">${escapeHtml(humanizeLabel(item.severity || "Low"))}</span>
          </div>
          <p>${escapeHtml(humanizeLabel(item.event_type))} | ${escapeHtml(item.department)} | ${escapeHtml(item.source)}</p>
          <div class="feed-card__detail">${escapeHtml(item.risk_reasons.join(", ") || "Behavior matched baseline")}</div>
          <span>Delta ${item.risk_delta >= 0 ? "+" : ""}${item.risk_delta.toFixed(1)} | ${escapeHtml(formatRelativeTime(item.happened_at))} | ${escapeHtml(item.mode)} mode</span>
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
        <article class="alert-card" data-employee-id="${item.employee_id}" tabindex="0">
          <div class="alert-card__header">
            <div class="identity identity--compact">
              <span class="identity__avatar">${escapeHtml(avatarLabel(item.employee_name))}</span>
              <div class="identity__copy">
                <strong>${escapeHtml(item.employee_name)}</strong>
                <span>${escapeHtml(item.employee_code)} | ${escapeHtml(item.channel)}</span>
              </div>
            </div>
            <span class="risk-badge ${levelClass(item.risk_level)}">${escapeHtml(item.risk_level)}</span>
          </div>
          <p class="alert-card__title">${escapeHtml(item.message)}</p>
          <div class="alert-card__detail">${escapeHtml(item.reasons.join(", ") || "No escalation reasons recorded.")}</div>
          <span class="alert-card__meta">${escapeHtml(formatTimestamp(item.created_at))} | ${escapeHtml(item.status)}</span>
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
        <article class="policy-card">
          <div class="policy-card__header">
            <strong>${escapeHtml(rule.name)}</strong>
            <span class="policy-card__points">${rule.points} pts</span>
          </div>
          <p>${escapeHtml(rule.description)}</p>
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
        <article class="feed-card">
          <div class="feed-card__header">
            <strong><span class="feed-card__avatar">${escapeHtml(avatarLabel(item.actor_email))}</span>${escapeHtml(item.actor_email)}</strong>
            <span class="policy-card__points">${escapeHtml(item.actor_role)}</span>
          </div>
          <p>${escapeHtml(humanizeLabel(item.action))}</p>
          <div class="feed-card__detail">${escapeHtml(item.target)}${item.details?.mode ? ` | ${item.details.mode}` : ""}</div>
          <span>${escapeHtml(formatTimestamp(item.created_at))}</span>
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
          <div class="scenario-card__header">
            <span class="policy-card__points">${escapeHtml(item.category)}</span>
            <span>${escapeHtml(item.default_mode)}</span>
          </div>
          <strong>${escapeHtml(item.label)}</strong>
          <p>${escapeHtml(item.description)}</p>
          <small>${item.steps} step${item.steps === 1 ? "" : "s"}</small>
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
    <article class="feed-card">
      <div class="feed-card__header">
        <strong>${escapeHtml(humanizeLabel(payload.scenario_id))}</strong>
        <span class="policy-card__points">${escapeHtml(payload.target_mode)}</span>
      </div>
      <p>${escapeHtml(payload.employee_code)} | ${payload.accepted} event${payload.accepted === 1 ? "" : "s"} emitted</p>
      <div class="feed-card__detail">
        ${payload.flagged_high_risk ? "High-risk threshold reached during the scenario." : "Scenario completed without creating a high-risk employee."}
      </div>
      <span>${payload.alerts_created} alert${payload.alerts_created === 1 ? "" : "s"} created</span>
    </article>
  `;
}
