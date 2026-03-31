function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatRelativeTime(isoString) {
  if (!isoString) {
    return "No signal yet";
  }
  const target = new Date(isoString);
  const diffSeconds = Math.round((Date.now() - target.getTime()) / 1000);
  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
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
  container.innerHTML = [
    {
      label: "Total Employees",
      value: overview.total_employees,
      note: `${overview.recent_events} events in the last hour`,
    },
    {
      label: "Average Risk",
      value: overview.average_risk_score.toFixed(1),
      note: `${overview.high_risk_employees} users currently high risk`,
    },
    {
      label: "Active Alerts",
      value: overview.active_alerts,
      note: `${overview.websocket_clients} dashboard clients connected`,
    },
    {
      label: "Monitoring Mode",
      value: overview.system_mode === "simulation" ? "SIM" : "REAL",
      note: overview.system_mode === "simulation" ? "Synthetic behavior engine is live" : "External logs are prioritized",
    },
  ]
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
    container.innerHTML = '<p class="empty-state">No recent activity buckets yet.</p>';
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
    container.innerHTML = '<p class="empty-state">Select an employee to inspect recent behavior, baseline expectations, and alert history.</p>';
    return;
  }

  const employee = detail.employee;
  const baselineEntries = Object.entries(detail.baseline_profile);
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
      <p class="inspector-note">Current score ${employee.current_risk_score.toFixed(1)}. Last activity ${formatRelativeTime(employee.last_seen_at)}.</p>
      <div class="baseline-list">
        ${baselineEntries
          .map(
            ([key, value]) => `
              <div class="baseline-item">
                <span>${escapeHtml(key.replaceAll("_", " "))}</span>
                <strong>${escapeHtml(typeof value === "object" ? JSON.stringify(value) : value)}</strong>
              </div>
            `
          )
          .join("")}
      </div>
      <div class="timeline">
        ${detail.recent_activity
          .slice(0, 5)
          .map(
            (item) => `
              <div class="timeline-item">
                <strong>${escapeHtml(item.event_type.replaceAll("_", " "))}</strong>
                <span class="feed-meta">${formatTimestamp(item.happened_at)}</span>
                <span class="activity-detail">${escapeHtml(item.risk_reasons.join(", "))}</span>
              </div>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

export function renderActivityFeed(container, items) {
  if (!items.length) {
    container.innerHTML = '<p class="empty-state">No activity yet.</p>';
    return;
  }
  container.innerHTML = items
    .map(
      (item) => `
        <article class="feed-item">
          <div class="feed-top">
            <strong>${escapeHtml(item.employee_name)}</strong>
            <span class="feed-meta">${formatRelativeTime(item.happened_at)}</span>
          </div>
          <div class="feed-text">${escapeHtml(item.event_type.replaceAll("_", " "))}</div>
          <div class="activity-detail">${escapeHtml(item.risk_reasons.join(", "))}</div>
        </article>
      `
    )
    .join("");
}

export function renderAlertsFeed(container, items) {
  if (!items.length) {
    container.innerHTML = '<p class="empty-state">No high-risk escalations yet.</p>';
    return;
  }
  container.innerHTML = items
    .map(
      (item) => `
        <article class="feed-item">
          <div class="feed-top">
            <strong>${escapeHtml(item.employee_name)}</strong>
            <span class="risk-pill ${levelClass(item.risk_level)}">${escapeHtml(item.risk_level)}</span>
          </div>
          <div class="alert-message">${escapeHtml(item.message)}</div>
          <div class="feed-meta">${formatTimestamp(item.created_at)} | ${escapeHtml(item.channel)}</div>
        </article>
      `
    )
    .join("");
}
