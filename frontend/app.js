import { api, clearToken, DEFAULT_ADMIN, getToken, setToken } from "./modules/api.js";
import {
  formatRelativeTime,
  renderActions,
  renderActivityFeed,
  renderAuditFeed,
  renderAlertsFeed,
  renderControlResult,
  renderDepartmentRisk,
  renderEmployees,
  renderInspector,
  renderMetrics,
  renderRiskDistribution,
  renderRules,
  renderScenarioCards,
  renderTrend,
  renderTriggerBreakdown,
  renderWatchlist,
} from "./modules/render.js";

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

const VIEW_META = {
  dashboard: {
    kicker: "Dashboard",
    title: "Risk posture and active pressure",
    copy: "See the current workforce posture, which signals are moving the story, and who needs review first.",
  },
  employees: {
    kicker: "Employees",
    title: "Inspect people case by case",
    copy: "Search the workforce, compare live risk to baseline behavior, and move from queue to detail without losing context.",
  },
  alerts: {
    kicker: "Alerts",
    title: "Escalations that need action",
    copy: "Focus on the incidents that already crossed the threshold and need an owner, a decision, and a next step.",
  },
  activity: {
    kicker: "Activity",
    title: "Live behavior across the organization",
    copy: "Track the latest events, filter by signal type, and understand where pressure is building across teams.",
  },
  operations: {
    kicker: "Operations",
    title: "Control simulation and live ingestion",
    copy: "Launch realistic stories, switch monitoring modes, and use the exact commands your demo team needs.",
  },
};

const TEMPO_META = {
  calm: {
    label: "Calm",
    copy: "Calm keeps the feed believable, with longer quiet stretches and fewer anomaly bursts.",
  },
  balanced: {
    label: "Balanced",
    copy: "Balanced keeps the feed active enough for a presentation without turning every minute into a breach story.",
  },
  demo: {
    label: "Demo",
    copy: "Demo increases activity and shortens quiet periods so the app stays lively during a hackathon.",
  },
};

const elements = {
  workspace: document.querySelector(".workspace"),
  loginShell: document.querySelector("#login-shell"),
  loginForm: document.querySelector("#login-form"),
  loginEmail: document.querySelector("#login-email"),
  loginPassword: document.querySelector("#login-password"),
  loginFeedback: document.querySelector("#login-feedback"),
  demoFill: document.querySelector("#demo-fill"),
  globalSearch: document.querySelector("#global-search"),
  operatorAvatar: document.querySelector("#operator-avatar"),
  operatorEmail: document.querySelector("#operator-email"),
  operatorRole: document.querySelector("#operator-role"),
  navItems: Array.from(document.querySelectorAll(".sidebar-nav__item")),
  views: Array.from(document.querySelectorAll(".view")),
  viewKicker: document.querySelector("#view-kicker"),
  viewTitle: document.querySelector("#view-title"),
  viewCopy: document.querySelector("#view-copy"),
  refreshButton: document.querySelector("#refresh-button"),
  reloadUiButton: document.querySelector("#reload-ui-button"),
  logoutButton: document.querySelector("#logout-button"),
  metricStrip: document.querySelector("#metric-strip"),
  statusSummary: document.querySelector("#status-summary"),
  refreshTime: document.querySelector("#refresh-time"),
  heroModeLabel: document.querySelector("#hero-mode-label"),
  heroTempoLabel: document.querySelector("#hero-tempo-label"),
  heroRefreshLabel: document.querySelector("#hero-refresh-label"),
  modeIndicator: document.querySelector("#mode-indicator"),
  sidebarModeLabel: document.querySelector("#sidebar-mode-label"),
  sidebarModeCopy: document.querySelector("#sidebar-mode-copy"),
  navDashboardCount: document.querySelector("#nav-dashboard-count"),
  navEmployeesCount: document.querySelector("#nav-employees-count"),
  navAlertsCount: document.querySelector("#nav-alerts-count"),
  navActivityCount: document.querySelector("#nav-activity-count"),
  navOperationsCount: document.querySelector("#nav-operations-count"),
  overviewWatchlistCount: document.querySelector("#overview-watchlist-count"),
  watchlistList: document.querySelector("#watchlist-list"),
  recommendedActions: document.querySelector("#recommended-actions"),
  riskTrend: document.querySelector("#risk-trend"),
  riskDistribution: document.querySelector("#risk-distribution"),
  departmentRisk: document.querySelector("#department-risk"),
  triggerBreakdown: document.querySelector("#trigger-breakdown"),
  employeeSearch: document.querySelector("#employee-search"),
  employeeRiskFilter: document.querySelector("#employee-risk-filter"),
  employeeFocusFilter: document.querySelector("#employee-focus-filter"),
  employeeResultCount: document.querySelector("#employee-result-count"),
  employeeTableBody: document.querySelector("#employee-table-body"),
  employeeInspector: document.querySelector("#employee-inspector"),
  alertsSearch: document.querySelector("#alerts-search"),
  alertsLevelFilter: document.querySelector("#alerts-level-filter"),
  alertsStatusFilter: document.querySelector("#alerts-status-filter"),
  alertsResultCount: document.querySelector("#alerts-result-count"),
  alertsFeed: document.querySelector("#alerts-feed"),
  alertsRunbook: document.querySelector("#alerts-runbook"),
  activitySearch: document.querySelector("#activity-search"),
  activityTypeFilter: document.querySelector("#activity-type-filter"),
  activitySeverityFilter: document.querySelector("#activity-severity-filter"),
  activityResultCount: document.querySelector("#activity-result-count"),
  activityFeed: document.querySelector("#activity-feed"),
  activityTriggerBreakdown: document.querySelector("#activity-trigger-breakdown"),
  activityDepartmentRisk: document.querySelector("#activity-department-risk"),
  integrationModeLabel: document.querySelector("#integration-mode-label"),
  integrationModeCopy: document.querySelector("#integration-mode-copy"),
  modeSimulation: document.querySelector("#mode-simulation"),
  modeReal: document.querySelector("#mode-real"),
  simulationTempoCopy: document.querySelector("#simulation-tempo-copy"),
  tempoCalm: document.querySelector("#tempo-calm"),
  tempoBalanced: document.querySelector("#tempo-balanced"),
  tempoDemo: document.querySelector("#tempo-demo"),
  platformConnectionTargets: document.querySelector("#platform-connection-targets"),
  studioEmployeeSelect: document.querySelector("#studio-employee-select"),
  studioScenarioSelect: document.querySelector("#studio-scenario-select"),
  studioModeSelect: document.querySelector("#studio-mode-select"),
  studioRepeatInput: document.querySelector("#studio-repeat-input"),
  studioLaunchButton: document.querySelector("#studio-launch-button"),
  studioLaunchFeedback: document.querySelector("#studio-launch-feedback"),
  studioQuickResult: document.querySelector("#studio-quick-result"),
  studioScenarioCards: document.querySelector("#studio-scenario-cards"),
  studioGuideList: document.querySelector("#studio-guide-list"),
  platformModeSteps: document.querySelector("#platform-mode-steps"),
  studioLocalSteps: document.querySelector("#studio-local-steps"),
  studioRemoteSteps: document.querySelector("#studio-remote-steps"),
  platformSystemTips: document.querySelector("#platform-system-tips"),
  manualEmployeeSelect: document.querySelector("#manual-employee-select"),
  manualEventTypeSelect: document.querySelector("#manual-event-type-select"),
  manualRepeatInput: document.querySelector("#manual-repeat-input"),
  manualSourceInput: document.querySelector("#manual-source-input"),
  manualContextInput: document.querySelector("#manual-context-input"),
  manualSendButton: document.querySelector("#manual-send-button"),
  manualSendFeedback: document.querySelector("#manual-send-feedback"),
  studioLocalSnippet: document.querySelector("#studio-local-snippet"),
  studioRemoteSnippet: document.querySelector("#studio-remote-snippet"),
  ingestSnippet: document.querySelector("#ingest-snippet"),
  ruleList: document.querySelector("#rule-list"),
  riskThresholdLabel: document.querySelector("#risk-threshold-label"),
  adminAuditFeed: document.querySelector("#admin-audit-feed"),
  toastStack: document.querySelector("#toast-stack"),
  copyButtons: Array.from(document.querySelectorAll("[data-copy-target]")),
};

const state = {
  overview: null,
  rules: null,
  audit: [],
  systemGuide: null,
  controlScenarios: [],
  simulationTempo: "balanced",
  admin: {
    email: DEFAULT_ADMIN.email,
    role: "admin",
  },
  selectedEmployeeId: null,
  selectedScenarioId: null,
  lastControlResult: null,
  detail: null,
  socket: null,
  refreshTimeout: null,
  pingInterval: null,
  activeView: "dashboard",
  filters: {
    employees: {
      search: "",
      risk: "all",
      focus: "all",
    },
    alerts: {
      search: "",
      level: "all",
      status: "all",
    },
    activity: {
      search: "",
      type: "all",
      severity: "all",
    },
  },
};

function showLogin(feedback = "") {
  elements.loginShell.classList.remove("is-hidden");
  elements.loginFeedback.textContent = feedback;
}

function hideLogin() {
  elements.loginShell.classList.add("is-hidden");
  elements.loginFeedback.textContent = "";
}

function setStatus(text) {
  elements.statusSummary.textContent = text;
}

function setView(viewName) {
  const metadata = VIEW_META[viewName] || VIEW_META.dashboard;
  state.activeView = viewName;
  document.body.dataset.view = viewName;

  elements.navItems.forEach((item) => {
    item.classList.toggle("is-active", item.dataset.view === viewName);
  });

  elements.views.forEach((view) => {
    view.classList.toggle("view--active", view.id === `view-${viewName}`);
  });

  elements.viewKicker.textContent = metadata.kicker;
  elements.viewTitle.textContent = metadata.title;
  elements.viewCopy.textContent = metadata.copy;

  elements.workspace?.scrollTo({ top: 0, behavior: "smooth" });
}

function showToast(title, message, variant = "") {
  const toast = document.createElement("article");
  const heading = document.createElement("strong");
  const body = document.createElement("div");

  toast.className = `toast ${variant ? `toast--${variant}` : ""}`.trim();
  heading.textContent = title;
  body.textContent = message;
  toast.append(heading, body);
  elements.toastStack.appendChild(toast);
  window.setTimeout(() => toast.remove(), 4500);
}

function quoteIfNeeded(value) {
  return /\s/.test(value) ? `"${value}"` : value;
}

function operatorInitials(value) {
  const safeValue = String(value || "SG");
  if (safeValue.includes("@")) {
    return safeValue.slice(0, 2).toUpperCase();
  }

  return (
    safeValue
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "SG"
  );
}

function prettyRole(role) {
  const normalized = String(role || "admin").toLowerCase();
  if (normalized === "admin") {
    return "Administrator";
  }
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function defaultRemoteTarget() {
  return state.systemGuide?.network_targets?.[0]?.url || "http://YOUR-PC-IP:8000";
}

function detectedNetworkTarget() {
  return state.systemGuide?.network_targets?.[0]?.url || null;
}

function currentEmployees() {
  return state.overview?.employees || [];
}

function currentAlerts() {
  return state.overview?.alerts || [];
}

function currentActivity() {
  return state.overview?.activity_feed || [];
}

function getEmployeeById(employeeId) {
  return currentEmployees().find((employee) => String(employee.id) === String(employeeId)) || null;
}

function updateModeUi(mode) {
  const isSimulation = mode === "simulation";
  const label = isSimulation ? "Simulation" : "Real Monitoring";
  const sidebarCopy = isSimulation
    ? "Synthetic telemetry is active with steady workplace behavior, visible activity, and occasional multi-step anomalies."
    : "Simulation is paused. The system is waiting for live ingestion or deliberate operator-triggered events in real mode.";
  const operationsCopy = isSimulation
    ? "Use simulation when you want the product to stay alive on its own and mix normal behavior with believable anomalies."
    : "Use real monitoring when you want outside interactions, helper scripts, or forwarded logs to drive the story instantly.";

  elements.modeSimulation.classList.toggle("is-active", isSimulation);
  elements.modeReal.classList.toggle("is-active", !isSimulation);
  elements.sidebarModeLabel.textContent = `${label} mode`;
  elements.sidebarModeCopy.textContent = sidebarCopy;
  elements.integrationModeLabel.textContent = label;
  elements.integrationModeCopy.textContent = operationsCopy;
  elements.heroModeLabel.textContent = label;
  elements.navOperationsCount.textContent = isSimulation ? "SIM" : "REAL";
}

function updateSimulationTempoUi(tempo) {
  state.simulationTempo = TEMPO_META[tempo] ? tempo : "balanced";
  elements.tempoCalm.classList.toggle("is-active", state.simulationTempo === "calm");
  elements.tempoBalanced.classList.toggle("is-active", state.simulationTempo === "balanced");
  elements.tempoDemo.classList.toggle("is-active", state.simulationTempo === "demo");
  elements.heroTempoLabel.textContent = TEMPO_META[state.simulationTempo].label;
  elements.simulationTempoCopy.textContent = TEMPO_META[state.simulationTempo].copy;
}

function updateOperatorUi(admin = state.admin) {
  state.admin = {
    email: admin?.email || DEFAULT_ADMIN.email,
    role: admin?.role || "admin",
  };
  elements.operatorEmail.textContent = state.admin.email;
  elements.operatorRole.textContent = prettyRole(state.admin.role);
  elements.operatorAvatar.textContent = operatorInitials(state.admin.email);
}

function buildOperationGuide() {
  return [
    "Use this workspace when you want a guaranteed story on screen instead of waiting for the simulation to produce one naturally.",
    "Launch a scenario for a controlled insider-risk narrative, then move to Alerts or Employees to show the impact.",
    "Use the manual ingestion form when you want to mimic a single live event instead of a multi-step scenario.",
    "If another PC needs to drive the demo, copy the detected network target below instead of guessing the host address.",
  ];
}

function buildLocalSteps() {
  return [
    "Use the local command when you want a repeatable test outside the UI but still from this machine.",
    "The local helper points at the same host and port as the browser or desktop app you are currently viewing.",
    "Use the control channel for full scenario stories and the ingest channel when you want to mimic raw log forwarding.",
  ];
}

function buildRemoteSteps() {
  const shareTarget = detectedNetworkTarget();
  return [
    "Run `Launch SentraGuard Network Demo.bat` on the main machine first so SentraGuard listens on 0.0.0.0:8000.",
    "Switch the app to `Real Monitoring` before sending events from the other computer.",
    shareTarget
      ? `The best detected address right now is ${shareTarget}.`
      : "Replace YOUR-PC-IP in the command below with the local IP address of the host machine on the same Wi-Fi or LAN.",
  ];
}

function buildModeSteps() {
  const shareTarget = detectedNetworkTarget();
  return [
    "Switch to `Real Monitoring` before using helper scripts or another computer.",
    shareTarget
      ? `This app is network-ready. Another PC can target ${shareTarget}.`
      : state.systemGuide?.share_mode_enabled
        ? "Network sharing is enabled, but the app could not auto-detect the best LAN address. Use the host machine IP in the helper command."
        : "If another PC needs to reach this app, run `Launch SentraGuard Network Demo.bat` on the host machine first.",
    "Use Swagger in the API docs when you want to test ingestion payloads manually.",
    "Move back to Dashboard, Activity, or Alerts right after sending data so the demo impact is visible immediately.",
  ];
}

function buildRefreshTips() {
  return [
    "Use `Sync` when you want fresh metrics and feeds without reloading the whole interface.",
    "Use `Reload` when you want a full browser or desktop refresh with a cache-busting timestamp.",
    "Keyboard shortcuts work too: F5 and Ctrl + R both trigger a full interface reload.",
    "The browser version and the desktop app both use the same refresh flow and the same backend state.",
  ];
}

function buildPlatformIngestSnippet() {
  const targetOrigin = state.systemGuide?.share_mode_enabled ? defaultRemoteTarget() : window.location.origin;
  elements.ingestSnippet.textContent = [
    'powershell -ExecutionPolicy Bypass -File ".\\Send SentraGuard Interaction.ps1" \\',
    `  -Server ${targetOrigin} \\`,
    "  -Channel ingest \\",
    "  -Mode real \\",
    "  -Preset usb_exfiltration",
  ].join("\n");
}

function buildStudioSnippets() {
  const localOrigin = window.location.origin;
  const scenarioId = state.selectedScenarioId || "credential_stuffing";
  const selectedEmployee = getEmployeeById(elements.studioEmployeeSelect.value);
  const employeeCode = selectedEmployee?.employee_code || "EMP-014";
  const employeeName = selectedEmployee?.name || "Jordan Vale";
  const department = selectedEmployee?.department || "Finance";
  const title = selectedEmployee?.title || "Senior Analyst";
  const remoteTarget = defaultRemoteTarget();

  elements.studioLocalSnippet.textContent = [
    'powershell -ExecutionPolicy Bypass -File ".\\Send SentraGuard Interaction.ps1" \\',
    `  -Server ${localOrigin} \\`,
    "  -Channel control \\",
    `  -Mode ${elements.studioModeSelect.value} \\`,
    `  -Preset ${scenarioId} \\`,
    `  -EmployeeCode ${quoteIfNeeded(employeeCode)} \\`,
    `  -EmployeeName ${quoteIfNeeded(employeeName)} \\`,
    `  -Department ${quoteIfNeeded(department)} \\`,
    `  -Title ${quoteIfNeeded(title)}`,
  ].join("\n");

  elements.studioRemoteSnippet.textContent = [
    'powershell -ExecutionPolicy Bypass -File ".\\Send SentraGuard Interaction.ps1" \\',
    `  -Server ${remoteTarget} \\`,
    "  -Channel ingest \\",
    "  -Mode real \\",
    `  -Preset ${scenarioId} \\`,
    `  -EmployeeCode ${quoteIfNeeded(employeeCode)} \\`,
    `  -EmployeeName ${quoteIfNeeded(employeeName)}`,
  ].join("\n");
}

function updateNavCounts() {
  if (!state.overview) {
    return;
  }

  elements.navDashboardCount.textContent = String(state.overview.high_risk_employees);
  elements.navEmployeesCount.textContent = String(state.overview.total_employees);
  elements.navAlertsCount.textContent = String(state.overview.active_alerts);
  elements.navActivityCount.textContent = String(state.overview.recent_events);
}

function renderConnectionTargets() {
  if (!state.systemGuide) {
    elements.platformConnectionTargets.innerHTML =
      '<div class="empty-state">Connection targets will appear after the system guide loads.</div>';
    return;
  }

  const targets = [...state.systemGuide.local_targets];

  if (state.systemGuide.network_targets.length) {
    targets.push(...state.systemGuide.network_targets);
  } else if (state.systemGuide.share_mode_enabled) {
    targets.push({
      label: "Network sharing enabled",
      url: "Use your host machine LAN IP",
      note: "The app is listening for remote traffic, but it could not auto-detect the best LAN address.",
    });
  } else {
    targets.push({
      label: "Network sharing is off",
      url: "Run Launch SentraGuard Network Demo.bat",
      note: "Another PC cannot reach this app until the host machine starts the network demo launcher.",
    });
  }

  elements.platformConnectionTargets.innerHTML = targets
    .map((target) => {
      const isUrl = String(target.url).startsWith("http");
      return `
        <article class="endpoint-card">
          <div class="endpoint-card__content">
            <p class="panel-kicker">${escapeHtml(target.label)}</p>
            <strong class="endpoint-card__url">${escapeHtml(target.url)}</strong>
            <p class="endpoint-card__note">${escapeHtml(target.note || "")}</p>
          </div>
          <div class="inline-actions">
            ${
              isUrl
                ? `<button class="ghost-button ghost-button--small" type="button" data-open-url="${escapeHtml(target.url)}">Open</button>
                   <button class="ghost-button ghost-button--small" type="button" data-copy-value="${escapeHtml(target.url)}">Copy</button>`
                : `<button class="ghost-button ghost-button--small" type="button" data-copy-value="${escapeHtml(target.url)}">Copy</button>`
            }
          </div>
        </article>
      `;
    })
    .join("");
}

function buildAlertRunbook(alerts = currentAlerts()) {
  if (!state.overview) {
    return [];
  }

  const actions = [];
  if (alerts.length) {
    actions.push(
      `Review ${alerts.length} alert${alerts.length === 1 ? "" : "s"} in the queue and confirm each escalation has an owner.`
    );
  }
  if (state.rules?.threshold) {
    actions.push(
      `Any employee at or above the threshold of ${state.rules.threshold} should be treated as a breach candidate until cleared.`
    );
  }
  actions.push(...state.overview.recommended_actions);

  return [...new Set(actions)].slice(0, 5);
}

function filteredEmployees() {
  const employees = currentEmployees();
  const search = state.filters.employees.search.trim().toLowerCase();
  const watchlistIds = new Set((state.overview?.watchlist || []).map((employee) => employee.id));
  const alertedIds = new Set(currentAlerts().map((alert) => alert.employee_id));

  return employees.filter((employee) => {
    const matchesSearch =
      !search ||
      employee.name.toLowerCase().includes(search) ||
      employee.employee_code.toLowerCase().includes(search) ||
      employee.department.toLowerCase().includes(search) ||
      employee.title.toLowerCase().includes(search);

    const matchesRisk =
      state.filters.employees.risk === "all" || employee.current_risk_level === state.filters.employees.risk;

    const matchesFocus =
      state.filters.employees.focus === "all" ||
      (state.filters.employees.focus === "watchlist" && watchlistIds.has(employee.id)) ||
      (state.filters.employees.focus === "alerted" && alertedIds.has(employee.id)) ||
      (state.filters.employees.focus === "high" && employee.current_risk_level === "High");

    return matchesSearch && matchesRisk && matchesFocus;
  });
}

function renderEmployeeTable() {
  const employees = filteredEmployees();
  renderEmployees(elements.employeeTableBody, employees, state.selectedEmployeeId);
  elements.employeeResultCount.textContent = `${employees.length} result${employees.length === 1 ? "" : "s"}`;
}

async function ensureSelectedEmployee() {
  const employees = filteredEmployees();
  if (!employees.length) {
    state.selectedEmployeeId = null;
    state.detail = null;
    renderInspector(elements.employeeInspector, null);
    return;
  }

  const currentVisible = employees.some((employee) => employee.id === state.selectedEmployeeId);
  if (!currentVisible) {
    state.selectedEmployeeId = employees[0].id;
  }
}

function filteredAlerts() {
  const search = state.filters.alerts.search.trim().toLowerCase();
  return currentAlerts().filter((alert) => {
    const matchesSearch =
      !search ||
      alert.employee_name.toLowerCase().includes(search) ||
      alert.employee_code.toLowerCase().includes(search) ||
      alert.message.toLowerCase().includes(search) ||
      alert.reasons.some((reason) => reason.toLowerCase().includes(search));

    const matchesLevel =
      state.filters.alerts.level === "all" || alert.risk_level === state.filters.alerts.level;

    const matchesStatus =
      state.filters.alerts.status === "all" || alert.status.toLowerCase() === state.filters.alerts.status;

    return matchesSearch && matchesLevel && matchesStatus;
  });
}

function filteredActivity() {
  const search = state.filters.activity.search.trim().toLowerCase();
  return currentActivity().filter((item) => {
    const detailsText = Object.values(item.details || {})
      .map((value) => String(value))
      .join(" ")
      .toLowerCase();
    const matchesSearch =
      !search ||
      item.employee_name.toLowerCase().includes(search) ||
      item.employee_code.toLowerCase().includes(search) ||
      item.department.toLowerCase().includes(search) ||
      item.event_type.toLowerCase().includes(search) ||
      item.source.toLowerCase().includes(search) ||
      item.risk_reasons.some((reason) => reason.toLowerCase().includes(search)) ||
      detailsText.includes(search);

    const matchesType =
      state.filters.activity.type === "all" || item.event_type === state.filters.activity.type;

    const matchesSeverity =
      state.filters.activity.severity === "all" ||
      String(item.severity || "").toLowerCase() === state.filters.activity.severity;

    return matchesSearch && matchesType && matchesSeverity;
  });
}

function summarizeTriggers(items) {
  const counts = new Map();
  items.forEach((item) => {
    counts.set(item.event_type, (counts.get(item.event_type) || 0) + 1);
  });

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6)
    .map(([label, value]) => ({ label: humanizeLabel(label), value }));
}

function summarizeDepartments(items) {
  const counts = new Map();
  items.forEach((item) => {
    const current = counts.get(item.department) || { total: 0, high: 0 };
    current.total += 1;
    if (String(item.severity || "").toLowerCase() === "high") {
      current.high += 1;
    }
    counts.set(item.department, current);
  });

  return [...counts.entries()]
    .sort((left, right) => right[1].total - left[1].total)
    .slice(0, 6)
    .map(([label, data]) => ({
      label,
      value: data.total,
      secondary: data.high,
      metric_label: `${data.total} events`,
      meta_label: `${data.high} high-severity event${data.high === 1 ? "" : "s"}`,
    }));
}

function renderAlertsView() {
  const alerts = filteredAlerts();
  renderAlertsFeed(elements.alertsFeed, alerts);
  renderActions(elements.alertsRunbook, buildAlertRunbook(alerts));
  elements.alertsResultCount.textContent = `${alerts.length} alert${alerts.length === 1 ? "" : "s"}`;
}

function renderActivityView() {
  const items = filteredActivity();
  renderActivityFeed(elements.activityFeed, items);
  renderTriggerBreakdown(elements.activityTriggerBreakdown, summarizeTriggers(items));
  renderDepartmentRisk(elements.activityDepartmentRisk, summarizeDepartments(items));
  elements.activityResultCount.textContent = `${items.length} event${items.length === 1 ? "" : "s"}`;
}

function populateEmployeeSelect(selectElement, fallbackId = null) {
  const previous = selectElement.value;
  const employees = currentEmployees().slice(0, 80);

  selectElement.innerHTML = employees
    .map(
      (employee) =>
        `<option value="${employee.id}">${employee.employee_code} | ${employee.name} | ${employee.department}</option>`
    )
    .join("");

  if (previous && employees.some((employee) => String(employee.id) === previous)) {
    selectElement.value = previous;
    return;
  }

  if (fallbackId && employees.some((employee) => String(employee.id) === String(fallbackId))) {
    selectElement.value = String(fallbackId);
    return;
  }

  if (state.overview?.watchlist?.[0]) {
    selectElement.value = String(state.overview.watchlist[0].id);
    return;
  }

  if (employees[0]) {
    selectElement.value = String(employees[0].id);
  }
}

function populateEmployeeSelects() {
  const selectedId = state.selectedEmployeeId || state.overview?.watchlist?.[0]?.id || state.overview?.employees?.[0]?.id;
  populateEmployeeSelect(elements.studioEmployeeSelect, selectedId);
  populateEmployeeSelect(elements.manualEmployeeSelect, selectedId);
}

function populateScenarioSelect() {
  if (!state.controlScenarios.length) {
    return;
  }

  elements.studioScenarioSelect.innerHTML = state.controlScenarios
    .map(
      (scenario) =>
        `<option value="${scenario.id}">${scenario.label} | ${scenario.category} | ${scenario.steps} step${scenario.steps === 1 ? "" : "s"}</option>`
    )
    .join("");

  if (
    state.selectedScenarioId &&
    state.controlScenarios.some((scenario) => scenario.id === state.selectedScenarioId)
  ) {
    elements.studioScenarioSelect.value = state.selectedScenarioId;
  } else {
    state.selectedScenarioId = state.controlScenarios[0].id;
    elements.studioScenarioSelect.value = state.selectedScenarioId;
  }
}

function populateActivityTypeFilter() {
  const previous = elements.activityTypeFilter.value;
  const eventTypes = [...new Set(currentActivity().map((item) => item.event_type))].sort();
  const options = ['<option value="all">All events</option>']
    .concat(eventTypes.map((eventType) => `<option value="${eventType}">${humanizeLabel(eventType)}</option>`))
    .join("");

  elements.activityTypeFilter.innerHTML = options;
  if (eventTypes.includes(previous)) {
    elements.activityTypeFilter.value = previous;
  } else {
    elements.activityTypeFilter.value = "all";
    state.filters.activity.type = "all";
  }
}

function renderOperations() {
  renderActions(elements.studioGuideList, buildOperationGuide());
  renderActions(elements.platformModeSteps, buildModeSteps());
  renderActions(elements.studioLocalSteps, buildLocalSteps());
  renderActions(elements.studioRemoteSteps, buildRemoteSteps());
  renderActions(elements.platformSystemTips, buildRefreshTips());
  renderScenarioCards(elements.studioScenarioCards, state.controlScenarios, state.selectedScenarioId);
  renderControlResult(elements.studioQuickResult, state.lastControlResult);
  renderConnectionTargets();
  buildStudioSnippets();
  buildPlatformIngestSnippet();
}

async function focusEmployee(employeeId) {
  if (!employeeId) {
    return;
  }

  state.filters.employees.search = "";
  state.filters.employees.risk = "all";
  state.filters.employees.focus = "all";
  elements.employeeSearch.value = "";
  elements.employeeRiskFilter.value = "all";
  elements.employeeFocusFilter.value = "all";
  setView("employees");
  await loadEmployeeDetail(employeeId);
}

async function runGlobalSearch() {
  const query = elements.globalSearch.value.trim().toLowerCase();
  if (!query) {
    showToast("Search is empty", "Type an employee, scenario, or tab name first.");
    return;
  }

  const employeeMatch = currentEmployees().find((employee) => {
    return (
      employee.name.toLowerCase().includes(query) ||
      employee.employee_code.toLowerCase().includes(query) ||
      employee.department.toLowerCase().includes(query) ||
      employee.title.toLowerCase().includes(query)
    );
  });

  if (employeeMatch) {
    state.filters.employees.search = elements.globalSearch.value.trim();
    state.filters.employees.risk = "all";
    state.filters.employees.focus = "all";
    elements.employeeSearch.value = elements.globalSearch.value.trim();
    elements.employeeRiskFilter.value = "all";
    elements.employeeFocusFilter.value = "all";
    setView("employees");
    renderEmployeeTable();
    await loadEmployeeDetail(employeeMatch.id, { skipTableRender: false });
    showToast("Employee found", `${employeeMatch.name} is ready in Employees.`);
    return;
  }

  const scenarioMatch = state.controlScenarios.find((scenario) => {
    return (
      scenario.id.toLowerCase().includes(query) ||
      scenario.label.toLowerCase().includes(query) ||
      scenario.category.toLowerCase().includes(query)
    );
  });

  if (scenarioMatch) {
    state.selectedScenarioId = scenarioMatch.id;
    elements.studioScenarioSelect.value = scenarioMatch.id;
    setView("operations");
    renderOperations();
    showToast("Scenario ready", `${scenarioMatch.label} is loaded in Operations.`);
    return;
  }

  const viewMatch = Object.entries(VIEW_META).find(([viewName, meta]) => {
    return (
      viewName.includes(query) ||
      meta.kicker.toLowerCase().includes(query) ||
      meta.title.toLowerCase().includes(query)
    );
  });

  if (viewMatch) {
    setView(viewMatch[0]);
    showToast("Workspace opened", `${viewMatch[1].title} is active.`);
    return;
  }

  showToast("No match found", "Try an employee code, a scenario like usb_exfiltration, or a tab name.", "alert");
}

async function loadRules() {
  state.rules = await api.rules();
  renderRules(elements.ruleList, state.rules);
  elements.riskThresholdLabel.textContent = `Threshold ${state.rules.threshold}`;
}

async function loadAdminSummary() {
  const admin = await api.me();
  updateOperatorUi(admin);
}

async function loadAudit() {
  state.audit = await api.audit();
  renderAuditFeed(elements.adminAuditFeed, state.audit);
}

async function loadSystemGuide() {
  state.systemGuide = await api.systemGuide();
  updateSimulationTempoUi(state.systemGuide.simulation_tempo);
  renderOperations();
}

async function loadControlScenarios() {
  state.controlScenarios = await api.controlScenarios();
  populateScenarioSelect();
  renderOperations();
}

async function loadOverview() {
  state.overview = await api.overview();

  renderMetrics(elements.metricStrip, state.overview);
  renderWatchlist(elements.watchlistList, state.overview.watchlist);
  renderTrend(elements.riskTrend, state.overview.risk_trend);
  renderActions(elements.recommendedActions, state.overview.recommended_actions);
  renderRiskDistribution(elements.riskDistribution, state.overview.risk_distribution);
  renderDepartmentRisk(elements.departmentRisk, state.overview.department_risk);
  renderTriggerBreakdown(elements.triggerBreakdown, state.overview.top_triggers);

  elements.overviewWatchlistCount.textContent = `${state.overview.watchlist.length} user${state.overview.watchlist.length === 1 ? "" : "s"}`;
  elements.refreshTime.textContent = `Updated ${formatRelativeTime(state.overview.refreshed_at)}`;
  elements.heroRefreshLabel.textContent = formatRelativeTime(state.overview.refreshed_at);

  updateModeUi(state.overview.system_mode);
  updateNavCounts();
  populateEmployeeSelects();
  populateActivityTypeFilter();
  renderAlertsView();
  renderActivityView();
  renderOperations();

  setStatus(
    `${state.overview.high_risk_employees} high-risk employees | ${state.overview.active_alerts} active alerts | ${state.overview.websocket_clients} live client${state.overview.websocket_clients === 1 ? "" : "s"}`
  );

  await ensureSelectedEmployee();
  renderEmployeeTable();

  if (state.selectedEmployeeId) {
    await loadEmployeeDetail(state.selectedEmployeeId, { skipTableRender: true });
  }
}

async function loadEmployeeDetail(employeeId, { skipTableRender = false } = {}) {
  state.selectedEmployeeId = employeeId;
  state.detail = await api.employee(employeeId);

  if (!skipTableRender) {
    renderEmployeeTable();
  } else {
    renderEmployees(elements.employeeTableBody, filteredEmployees(), state.selectedEmployeeId);
  }

  renderInspector(elements.employeeInspector, state.detail);
  populateEmployeeSelects();
  buildStudioSnippets();
}

async function emitSelectedScenario() {
  if (!state.selectedScenarioId) {
    return;
  }

  elements.studioLaunchButton.disabled = true;
  elements.studioLaunchFeedback.textContent = "Launching scenario...";

  try {
    const response = await api.emitControlScenario({
      scenario_id: state.selectedScenarioId,
      employee_id: Number(elements.studioEmployeeSelect.value),
      target_mode: elements.studioModeSelect.value,
      repeat: Number(elements.studioRepeatInput.value || 1),
    });

    state.lastControlResult = response;
    renderOperations();
    elements.studioLaunchFeedback.textContent = `${response.accepted} event${response.accepted === 1 ? "" : "s"} emitted for ${response.employee_code}.`;
    showToast(
      "Scenario launched",
      `${humanizeLabel(response.scenario_id)} pushed ${response.accepted} event${response.accepted === 1 ? "" : "s"}.`
    );
    await refreshDashboard();
  } catch (error) {
    elements.studioLaunchFeedback.textContent = error.message || "Scenario launch failed";
    handleUnauthorized(error);
  } finally {
    elements.studioLaunchButton.disabled = false;
  }
}

function buildManualEventDetails(eventType, contextValue, repeatIndex) {
  const context = contextValue?.trim();

  switch (eventType) {
    case "login_failed":
      return {
        location: context || "Unexpected VPN region",
        attempts: repeatIndex + 1,
      };
    case "login_success":
      return {
        location: context || "Remote login",
      };
    case "file_download":
      return {
        resource: context || "quarterly_finance_pack",
        files_downloaded: 4 + repeatIndex * 2,
      };
    case "usb_inserted":
      return {
        device_label: context || "USB-External-Drive",
      };
    case "data_transfer":
      return {
        destination: context || "External storage target",
        megabytes: 120 + repeatIndex * 35,
      };
    case "sensitive_access":
      return {
        resource: context || "restricted-archive",
      };
    default:
      return {};
  }
}

async function sendManualEvents() {
  const employee = getEmployeeById(elements.manualEmployeeSelect.value);
  if (!employee) {
    showToast("Employee missing", "Choose an employee before sending an event.", "alert");
    return;
  }

  const repeat = Number(elements.manualRepeatInput.value || 1);
  const source = elements.manualSourceInput.value.trim() || "manual-operator";
  const eventType = elements.manualEventTypeSelect.value;
  const contextValue = elements.manualContextInput.value;

  const events = Array.from({ length: repeat }, (_, index) => ({
    employee_code: employee.employee_code,
    employee_name: employee.name,
    department: employee.department,
    title: employee.title,
    event_type: eventType,
    source,
    details: buildManualEventDetails(eventType, contextValue, index),
  }));

  elements.manualSendButton.disabled = true;
  elements.manualSendFeedback.textContent = "Sending event...";

  try {
    const response = await api.ingestEvents({ events });
    elements.manualSendFeedback.textContent = `${response.accepted} event${response.accepted === 1 ? "" : "s"} accepted. ${response.alerts_created} alert${response.alerts_created === 1 ? "" : "s"} created.`;
    showToast(
      "Real event accepted",
      `${response.accepted} ${humanizeLabel(eventType)} event${response.accepted === 1 ? "" : "s"} recorded for ${employee.name}.`
    );
    await refreshDashboard();
  } catch (error) {
    elements.manualSendFeedback.textContent = error.message || "Manual event send failed";
    handleUnauthorized(error);
  } finally {
    elements.manualSendButton.disabled = false;
  }
}

async function refreshDashboard() {
  await loadOverview();
  await loadAudit();
}

function scheduleRefresh(delay = 250) {
  window.clearTimeout(state.refreshTimeout);
  state.refreshTimeout = window.setTimeout(() => {
    refreshDashboard().catch(handleUnauthorized);
  }, delay);
}

function disconnectSocket() {
  window.clearInterval(state.pingInterval);
  state.pingInterval = null;
  if (state.socket) {
    state.socket.close();
    state.socket = null;
  }
}

function connectSocket() {
  disconnectSocket();

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  state.socket = new WebSocket(`${protocol}//${window.location.host}/ws/live`);

  state.socket.addEventListener("open", () => {
    setStatus("Live telemetry connected");
    elements.modeIndicator.style.background = "var(--success)";
    state.pingInterval = window.setInterval(() => {
      if (state.socket?.readyState === WebSocket.OPEN) {
        state.socket.send(JSON.stringify({ type: "ping" }));
      }
    }, 15000);
  });

  state.socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);

    if (message.type === "alert.created") {
      const employeeName = message.payload?.alert?.employee_name || "An employee";
      showToast("High-risk alert", `${employeeName} crossed the escalation threshold.`, "alert");
    }

    if (
      message.type === "system.mode_changed" ||
      message.type === "system.connected" ||
      message.type === "system.tempo_changed"
    ) {
      const nextMode = message.payload?.mode;
      if (nextMode) {
        updateModeUi(nextMode);
      }

      if (message.type === "system.mode_changed") {
        showToast("Mode updated", `Monitoring switched to ${nextMode}.`);
      }

      if (message.type === "system.tempo_changed") {
        const nextTempo = message.payload?.tempo;
        if (nextTempo) {
          updateSimulationTempoUi(nextTempo);
          showToast("Simulation tempo updated", `${TEMPO_META[nextTempo]?.label || nextTempo} tempo is active.`);
        }
      }
    }

    scheduleRefresh();
  });

  state.socket.addEventListener("close", () => {
    window.clearInterval(state.pingInterval);
    state.pingInterval = null;
    elements.modeIndicator.style.background = "var(--warning)";
    setStatus("Live socket disconnected, retrying");
    window.setTimeout(() => {
      if (getToken()) {
        connectSocket();
      }
    }, 2500);
  });
}

function handleUnauthorized(error) {
  if (error?.status === 401) {
    clearToken();
    disconnectSocket();
    updateOperatorUi({ email: DEFAULT_ADMIN.email, role: "admin" });
    showLogin("Your session expired. Sign in again.");
    return;
  }

  setStatus(error?.message || "Unable to load dashboard");
  showToast("Request failed", error?.message || "Unknown error", "alert");
}

async function initializeDashboard() {
  renderOperations();
  await Promise.all([loadRules(), loadControlScenarios(), loadSystemGuide(), loadAdminSummary()]);
  await refreshDashboard();
  connectSocket();
  setView(state.activeView);
  document.body.classList.add("app-ready");
}

function handleEmployeeCardKeyboard(event) {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  const card = event.target.closest("[data-employee-id]");
  if (!card) {
    return;
  }

  event.preventDefault();
  focusEmployee(Number(card.dataset.employeeId)).catch(handleUnauthorized);
}

async function copySnippet(targetId) {
  const target = document.getElementById(targetId);
  if (!target) {
    return;
  }

  await copyText(target.textContent || "");
}

async function copyText(value) {
  try {
    await window.navigator.clipboard.writeText(value);
    showToast("Copied", "Command copied to clipboard.");
  } catch {
    showToast("Copy failed", "Clipboard access was blocked on this device.", "alert");
  }
}

async function changeSimulationTempo(tempo) {
  const previousTempo = state.simulationTempo;
  updateSimulationTempoUi(tempo);

  try {
    const response = await api.setSimulationTempo(tempo);
    updateSimulationTempoUi(response.tempo);
    showToast("Simulation tempo updated", `${TEMPO_META[response.tempo]?.label || response.tempo} tempo is active.`);
  } catch (error) {
    updateSimulationTempoUi(previousTempo);
    throw error;
  }
}

function reloadUi() {
  disconnectSocket();
  const target = new URL(window.location.href);
  target.searchParams.set("refresh", String(Date.now()));
  window.location.replace(target.toString());
}

async function updateEmployeeSelectionAfterFilter() {
  renderEmployeeTable();
  const employees = filteredEmployees();
  if (employees.length && !employees.some((employee) => employee.id === state.selectedEmployeeId)) {
    await loadEmployeeDetail(employees[0].id, { skipTableRender: false });
    return;
  }

  if (!employees.length) {
    state.selectedEmployeeId = null;
    state.detail = null;
    renderInspector(elements.employeeInspector, null);
  }
}

elements.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  elements.loginFeedback.textContent = "Signing in...";

  try {
    const response = await api.login({
      email: elements.loginEmail.value,
      password: elements.loginPassword.value,
    });
    setToken(response.access_token);
    updateOperatorUi({ email: response.admin_email, role: "admin" });
    hideLogin();
    await initializeDashboard();
  } catch (error) {
    elements.loginFeedback.textContent = error.message || "Login failed";
  }
});

elements.demoFill.addEventListener("click", () => {
  elements.loginEmail.value = DEFAULT_ADMIN.email;
  elements.loginPassword.value = DEFAULT_ADMIN.password;
});

elements.navItems.forEach((item) => {
  item.addEventListener("click", () => {
    setView(item.dataset.view || "dashboard");
  });
});

elements.globalSearch?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    runGlobalSearch().catch(handleUnauthorized);
  }
});

elements.copyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    copySnippet(button.dataset.copyTarget).catch(() => {
      showToast("Copy failed", "Clipboard access was blocked on this device.", "alert");
    });
  });
});

elements.platformConnectionTargets?.addEventListener("click", (event) => {
  const copyButton = event.target.closest("[data-copy-value]");
  if (copyButton) {
    copyText(copyButton.dataset.copyValue || "").catch(() => {
      showToast("Copy failed", "Clipboard access was blocked on this device.", "alert");
    });
    return;
  }

  const openButton = event.target.closest("[data-open-url]");
  if (openButton) {
    window.open(openButton.dataset.openUrl, "_blank", "noopener,noreferrer");
  }
});

elements.refreshButton.addEventListener("click", () => {
  refreshDashboard().catch(handleUnauthorized);
});

elements.reloadUiButton.addEventListener("click", () => {
  reloadUi();
});

elements.logoutButton.addEventListener("click", () => {
  clearToken();
  disconnectSocket();
  updateOperatorUi({ email: DEFAULT_ADMIN.email, role: "admin" });
  showLogin("Signed out.");
});

elements.modeSimulation.addEventListener("click", async () => {
  try {
    await api.setMode("simulation");
    showToast("Simulation active", "The behavior engine is driving live activity again.");
    scheduleRefresh(0);
  } catch (error) {
    handleUnauthorized(error);
  }
});

elements.modeReal.addEventListener("click", async () => {
  try {
    await api.setMode("real");
    showToast("Real mode active", "Simulation paused. Waiting for live or helper-triggered events.");
    scheduleRefresh(0);
  } catch (error) {
    handleUnauthorized(error);
  }
});

elements.tempoCalm.addEventListener("click", async () => {
  try {
    await changeSimulationTempo("calm");
  } catch (error) {
    handleUnauthorized(error);
  }
});

elements.tempoBalanced.addEventListener("click", async () => {
  try {
    await changeSimulationTempo("balanced");
  } catch (error) {
    handleUnauthorized(error);
  }
});

elements.tempoDemo.addEventListener("click", async () => {
  try {
    await changeSimulationTempo("demo");
  } catch (error) {
    handleUnauthorized(error);
  }
});

elements.employeeSearch.addEventListener("input", async (event) => {
  state.filters.employees.search = event.target.value;
  await updateEmployeeSelectionAfterFilter();
});

elements.employeeRiskFilter.addEventListener("change", async (event) => {
  state.filters.employees.risk = event.target.value;
  await updateEmployeeSelectionAfterFilter();
});

elements.employeeFocusFilter.addEventListener("change", async (event) => {
  state.filters.employees.focus = event.target.value;
  await updateEmployeeSelectionAfterFilter();
});

elements.employeeTableBody.addEventListener("click", (event) => {
  const row = event.target.closest("[data-employee-id]");
  if (!row) {
    return;
  }

  loadEmployeeDetail(Number(row.dataset.employeeId)).catch(handleUnauthorized);
});

elements.watchlistList.addEventListener("click", (event) => {
  const card = event.target.closest("[data-employee-id]");
  if (!card) {
    return;
  }

  focusEmployee(Number(card.dataset.employeeId)).catch(handleUnauthorized);
});

elements.activityFeed.addEventListener("click", (event) => {
  const card = event.target.closest("[data-employee-id]");
  if (!card) {
    return;
  }

  focusEmployee(Number(card.dataset.employeeId)).catch(handleUnauthorized);
});

elements.alertsFeed.addEventListener("click", (event) => {
  const card = event.target.closest("[data-employee-id]");
  if (!card) {
    return;
  }

  focusEmployee(Number(card.dataset.employeeId)).catch(handleUnauthorized);
});

elements.watchlistList.addEventListener("keydown", handleEmployeeCardKeyboard);
elements.activityFeed.addEventListener("keydown", handleEmployeeCardKeyboard);
elements.alertsFeed.addEventListener("keydown", handleEmployeeCardKeyboard);

elements.alertsSearch.addEventListener("input", (event) => {
  state.filters.alerts.search = event.target.value;
  renderAlertsView();
});

elements.alertsLevelFilter.addEventListener("change", (event) => {
  state.filters.alerts.level = event.target.value;
  renderAlertsView();
});

elements.alertsStatusFilter.addEventListener("change", (event) => {
  state.filters.alerts.status = event.target.value;
  renderAlertsView();
});

elements.activitySearch.addEventListener("input", (event) => {
  state.filters.activity.search = event.target.value;
  renderActivityView();
});

elements.activityTypeFilter.addEventListener("change", (event) => {
  state.filters.activity.type = event.target.value;
  renderActivityView();
});

elements.activitySeverityFilter.addEventListener("change", (event) => {
  state.filters.activity.severity = event.target.value;
  renderActivityView();
});

elements.studioScenarioSelect.addEventListener("change", (event) => {
  state.selectedScenarioId = event.target.value;
  renderOperations();
});

elements.studioEmployeeSelect.addEventListener("change", () => {
  renderOperations();
});

elements.studioModeSelect.addEventListener("change", () => {
  renderOperations();
});

elements.studioRepeatInput.addEventListener("input", () => {
  renderOperations();
});

elements.studioScenarioCards.addEventListener("click", (event) => {
  const card = event.target.closest("[data-scenario-id]");
  if (!card) {
    return;
  }

  state.selectedScenarioId = card.dataset.scenarioId;
  elements.studioScenarioSelect.value = state.selectedScenarioId;
  renderOperations();
});

elements.studioLaunchButton.addEventListener("click", () => {
  emitSelectedScenario().catch(handleUnauthorized);
});

elements.manualEmployeeSelect.addEventListener("change", () => {
  renderOperations();
});

elements.manualEventTypeSelect.addEventListener("change", () => {
  renderOperations();
});

elements.manualSendButton.addEventListener("click", () => {
  sendManualEvents().catch(handleUnauthorized);
});

window.addEventListener("load", async () => {
  updateOperatorUi();
  renderOperations();
  setView("dashboard");
  window.requestAnimationFrame(() => document.body.classList.add("app-ready"));

  if (!getToken()) {
    showLogin("");
    return;
  }

  hideLogin();
  try {
    await initializeDashboard();
  } catch (error) {
    handleUnauthorized(error);
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "F5" || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "r")) {
    event.preventDefault();
    reloadUi();
  }
});

window.addEventListener("focus", () => {
  if (getToken()) {
    scheduleRefresh(0);
  }
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && getToken()) {
    scheduleRefresh(0);
  }
});

window.addEventListener("beforeunload", () => {
  disconnectSocket();
});
