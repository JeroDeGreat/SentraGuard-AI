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
    return "Exfiltration check";
  }
  if (normalized.includes("sensitive") || normalized.includes("access")) {
    return "Access review";
  }
  if (normalized.includes("ingestion") || normalized.includes("forwarder")) {
    return "Pipeline verification";
  }
  return `Action ${String(index + 1).padStart(2, "0")}`;
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
      label: "Monitored Employees",
      value: overview.total_employees,
      note: `${overview.recent_events} events processed in the last hour`,
    },
    {
      label: "Watchlist Pressure",
      value: overview.watchlist.length,
      note: `${overview.high_risk_employees} employees are currently high risk`,
    },
    {
      label: "Alert Queue",
      value: overview.active_alerts,
      note: overview.active_alerts
        ? "Escalations need acknowledgement and review"
        : "No active high-risk escalations right now",
    },
    {
      label: "Monitoring Mode",
      value: overview.system_mode === "simulation" ? "SIM" : "REAL",
      note:
        overview.system_mode === "simulation"
          ? "Synthetic telemetry is generating realistic pressure"
          : "External logs are expected from live systems",
    },
  ];

  container.innerHTML = metrics
    .map(
      (metric) => `
        <article class="metric">
          <div class="metric__label">${escapeHtml(metric.label)}</div>
          <div class="metric__value">${escapeHtml(metric.value)}</div>
          <div class="metric__note">${escapeHtml(metric.note)}</div>
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
  container.innerHTML = `<div class="bar-list">${items
    .map((item) => {
      const ratio = (item.value / total) * 100;
      const accentClass = item.label === "High" ? "bar-fill--alert" : "";
      return `
        <div class="bar-row">
          <div class="bar-row__top">
            <span>${escapeHtml(item.label)}</span>
            <strong>${item.value}</strong>
          </div>
          <div class="bar-track"><div class="bar-fill ${accentClass}" style="width:${ratio}%"></div></div>
        </div>
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
      (item) => `
        <div class="bar-row">
          <div class="bar-row__top">
            <span>${escapeHtml(item.label)}</span>
            <strong>${item.value.toFixed(1)} avg</strong>
          </div>
          <div class="bar-track"><div class="bar-fill" style="width:${(item.value / maxValue) * 100}%"></div></div>
          <div class="feed-meta">${item.secondary || 0} high-risk employee${item.secondary === 1 ? "" : "s"}</div>
        </div>
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

  container.innerHTML = `
    <div class="trend-shell">
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-label="Risk trend chart">
        <g transform="translate(${padding.left}, ${padding.top})">
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
        <div class="bar-row">
          <div class="bar-row__top">
            <span>${escapeHtml(item.label)}</span>
            <strong>${item.value}</strong>
          </div>
          <div class="bar-track">
            <div class="bar-fill ${index === 0 ? "bar-fill--alert" : ""}" style="width:${(item.value / maxValue) * 100}%"></div>
          </div>
        </div>
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
        <article class="watch-item" data-employee-id="${employee.id}" tabindex="0">
          <div class="watch-item__top">
            <div class="watch-item__name">
              <strong>${escapeHtml(employee.name)}</strong>
              <span>${escapeHtml(employee.employee_code)} | ${escapeHtml(employee.department)}</span>
            </div>
            <span class="risk-pill ${levelClass(employee.current_risk_level)}">${escapeHtml(employee.current_risk_level)}</span>
          </div>
          <div class="feed-meta">Priority ${index + 1} | Score ${employee.current_risk_score.toFixed(1)} | ${escapeHtml(formatRelativeTime(employee.last_seen_at))}</div>
          <div class="activity-detail">${escapeHtml(employee.latest_reasons[0] || "No suspicious trigger summary available yet.")}</div>
        </article>
      `
    )
    .join("");
}

export function renderActions(container, actions) {
  if (!actions.length) {
    container.innerHTML = renderEmptyState("No operator actions are recommended right now.");
    return;
  }

  container.innerHTML = actions
    .map(
      (action, index) => `
        <li>
          <span>${escapeHtml(actionLabel(action, index))}</span>
          <strong>${escapeHtml(action)}</strong>
        </li>
      `
    )
    .join("");
}

export function renderRules(container, payload) {
  container.innerHTML = payload.rules
    .map(
      (rule) => `
        <div class="rule-item">
          <div class="feed-top">
            <strong>${escapeHtml(rule.name)}</strong>
            <span class="badge">${rule.points} pts</span>
          </div>
          <p>${escapeHtml(rule.description)}</p>
        </div>
      `
    )
    .join("");
}

export function renderEmployees(tbody, employees, selectedId) {
  if (!employees.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="table-empty">
          <p class="empty-state">No employees match the current search and filter.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = employees
    .map(
      (employee) => `
        <tr data-employee-id="${employee.id}" class="${employee.id === selectedId ? "is-selected" : ""}">
          <td>
            <div class="employee-name">
              <strong>${escapeHtml(employee.name)}</strong>
              <span>${escapeHtml(employee.employee_code)} | ${escapeHtml(employee.title)}</span>
            </div>
          </td>
          <td>${escapeHtml(employee.department)}</td>
          <td>${employee.current_risk_score.toFixed(1)}</td>
          <td><span class="risk-pill ${levelClass(employee.current_risk_level)}">${escapeHtml(employee.current_risk_level)}</span></td>
          <td>${escapeHtml(employee.latest_reasons[0] || formatRelativeTime(employee.last_seen_at))}</td>
        </tr>
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
  const recentActivity = detail.recent_activity.slice(0, 6);
  const recentAlerts = detail.alerts.slice(0, 3);

  container.innerHTML = `
    <div class="inspector-card">
      <div class="inspector-header">
        <div>
          <p class="panel-kicker">${escapeHtml(employee.employee_code)}</p>
          <h4>${escapeHtml(employee.name)}</h4>
          <p>${escapeHtml(employee.department)} | ${escapeHtml(employee.title)}</p>
        </div>
        <span class="risk-pill ${levelClass(employee.current_risk_level)}">${escapeHtml(employee.current_risk_level)}</span>
      </div>

      <p class="inspector-note">
        Current score ${employee.current_risk_score.toFixed(1)}. Last activity ${escapeHtml(formatRelativeTime(employee.last_seen_at))}.
      </p>

      <div class="baseline-list">
        ${baselineEntries
          .map(
            ([key, value]) => `
              <div class="baseline-item">
                <span>${escapeHtml(humanizeLabel(key))}</span>
                <strong>${escapeHtml(typeof value === "object" ? JSON.stringify(value) : value)}</strong>
              </div>
            `
          )
          .join("")}
      </div>

      <div class="stack-list">
        <div>
          <p class="panel-kicker">Recent Activity</p>
          <div class="timeline">
            ${
              recentActivity.length
                ? recentActivity
                    .map(
                      (item) => `
                        <div class="timeline-item">
                          <strong>${escapeHtml(humanizeLabel(item.event_type))}</strong>
                          <span class="feed-meta">${escapeHtml(formatTimestamp(item.happened_at))}</span>
                          <span class="activity-detail">${escapeHtml(item.risk_reasons.join(", ") || "No risk explanation recorded.")}</span>
                        </div>
                      `
                    )
                    .join("")
                : renderEmptyState("No recent activity is available for this employee.")
            }
          </div>
        </div>

        <div>
          <p class="panel-kicker">Alert History</p>
          <div class="stack-list">
            ${
              recentAlerts.length
                ? recentAlerts
                    .map(
                      (alert) => `
                        <article class="feed-item">
                          <div class="feed-top">
                            <strong>${escapeHtml(alert.message)}</strong>
                            <span class="risk-pill ${levelClass(alert.risk_level)}">${escapeHtml(alert.risk_level)}</span>
                          </div>
                          <div class="activity-detail">${escapeHtml(alert.reasons.join(", ") || "No reasons recorded.")}</div>
                          <div class="feed-meta">${escapeHtml(formatTimestamp(alert.created_at))} | ${escapeHtml(alert.channel)}</div>
                        </article>
                      `
                    )
                    .join("")
                : renderEmptyState("No alert history for this employee.")
            }
          </div>
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
        <article class="feed-item" data-employee-id="${item.employee_id}" tabindex="0">
          <div class="feed-top">
            <strong>${escapeHtml(item.employee_name)}</strong>
            <span class="feed-meta">${escapeHtml(formatRelativeTime(item.happened_at))}</span>
          </div>
          <div class="feed-text">${escapeHtml(humanizeLabel(item.event_type))} | ${escapeHtml(item.department)}</div>
          <div class="activity-detail">${escapeHtml(item.risk_reasons.join(", ") || "Behavior matched baseline")}</div>
          <div class="feed-meta">Delta ${item.risk_delta >= 0 ? "+" : ""}${item.risk_delta.toFixed(1)} | ${escapeHtml(item.mode)} mode | ${escapeHtml(item.source)}</div>
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
        <article class="feed-item" data-employee-id="${item.employee_id}" tabindex="0">
          <div class="feed-top">
            <strong>${escapeHtml(item.employee_name)}</strong>
            <span class="risk-pill ${levelClass(item.risk_level)}">${escapeHtml(item.risk_level)}</span>
          </div>
          <div class="alert-message">${escapeHtml(item.message)}</div>
          <div class="activity-detail">${escapeHtml(item.reasons.join(", ") || "No escalation reasons recorded.")}</div>
          <div class="feed-meta">${escapeHtml(formatTimestamp(item.created_at))} | ${escapeHtml(item.channel)} | ${escapeHtml(item.status)}</div>
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
        <article class="feed-item">
          <div class="feed-top">
            <strong>${escapeHtml(item.actor_email)}</strong>
            <span class="badge">${escapeHtml(item.actor_role)}</span>
          </div>
          <div class="feed-text">${escapeHtml(humanizeLabel(item.action))}</div>
          <div class="activity-detail">${escapeHtml(item.target)}${item.details?.mode ? ` | ${item.details.mode}` : ""}</div>
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
          <div class="scenario-card__top">
            <span class="badge">${escapeHtml(item.category)}</span>
            <span class="feed-meta">${escapeHtml(item.default_mode)}</span>
          </div>
          <strong>${escapeHtml(item.label)}</strong>
          <p>${escapeHtml(item.description)}</p>
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
    <article class="feed-item">
      <div class="feed-top">
        <strong>${escapeHtml(humanizeLabel(payload.scenario_id))}</strong>
        <span class="badge">${escapeHtml(payload.target_mode)}</span>
      </div>
      <div class="feed-text">${escapeHtml(payload.employee_code)} | ${payload.accepted} event${payload.accepted === 1 ? "" : "s"} emitted</div>
      <div class="activity-detail">
        ${payload.flagged_high_risk ? "High-risk threshold reached during the scenario." : "Scenario completed without creating a high-risk user."}
      </div>
      <div class="feed-meta">${payload.alerts_created} alert${payload.alerts_created === 1 ? "" : "s"} created</div>
    </article>
  `;
}
