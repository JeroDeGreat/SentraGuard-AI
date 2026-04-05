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

const VIEW_META = {
  overview: {
    kicker: "Command Center",
    title: "Threat posture at a glance",
    copy: "Track risk pressure, top triggers, and the people your operator should inspect first.",
  },
  employees: {
    kicker: "People Intelligence",
    title: "Inspect risk employee by employee",
    copy: "Search the workforce, compare live risk against baseline behavior, and review one employee without losing system context.",
  },
  activity: {
    kicker: "Signal Stream",
    title: "Live behavior across the organization",
    copy: "Watch the latest activity, spot the busiest trigger types, and see which departments are heating up.",
  },
  alerts: {
    kicker: "Response Queue",
    title: "Escalations that need action",
    copy: "Focus attention on the incidents that already crossed policy thresholds and need a response owner.",
  },
  studio: {
    kicker: "Scenario Studio",
    title: "Trigger demo stories on demand",
    copy: "Launch realistic scenarios instantly, test from this PC, or prepare a clean command for another machine.",
  },
  integrations: {
    kicker: "Platform Controls",
    title: "Run real monitoring with less guesswork",
    copy: "Switch data sources, follow the exact setup steps, and use the helper commands your team actually needs.",
  },
};

const elements = {
  loginShell: document.querySelector("#login-shell"),
  loginForm: document.querySelector("#login-form"),
  loginEmail: document.querySelector("#login-email"),
  loginPassword: document.querySelector("#login-password"),
  loginFeedback: document.querySelector("#login-feedback"),
  demoFill: document.querySelector("#demo-fill"),
  navItems: Array.from(document.querySelectorAll(".nav-item")),
  views: Array.from(document.querySelectorAll(".view")),
  viewKicker: document.querySelector("#view-kicker"),
  viewTitle: document.querySelector("#view-title"),
  viewCopy: document.querySelector("#view-copy"),
  refreshButton: document.querySelector("#refresh-button"),
  logoutButton: document.querySelector("#logout-button"),
  metricStrip: document.querySelector("#metric-strip"),
  watchlistList: document.querySelector("#watchlist-list"),
  overviewWatchlistCount: document.querySelector("#overview-watchlist-count"),
  riskDistribution: document.querySelector("#risk-distribution"),
  departmentRisk: document.querySelector("#department-risk"),
  riskTrend: document.querySelector("#risk-trend"),
  triggerBreakdown: document.querySelector("#trigger-breakdown"),
  recommendedActions: document.querySelector("#recommended-actions"),
  employeeSearch: document.querySelector("#employee-search"),
  employeeRiskFilter: document.querySelector("#employee-risk-filter"),
  employeeResultCount: document.querySelector("#employee-result-count"),
  employeeTableBody: document.querySelector("#employee-table-body"),
  employeeInspector: document.querySelector("#employee-inspector"),
  activityFeed: document.querySelector("#activity-feed"),
  activityTriggerBreakdown: document.querySelector("#activity-trigger-breakdown"),
  activityDepartmentRisk: document.querySelector("#activity-department-risk"),
  alertsFeed: document.querySelector("#alerts-feed"),
  alertsRunbook: document.querySelector("#alerts-runbook"),
  alertCountLabel: document.querySelector("#alert-count-label"),
  statusSummary: document.querySelector("#status-summary"),
  refreshTime: document.querySelector("#refresh-time"),
  ruleList: document.querySelector("#rule-list"),
  riskThresholdLabel: document.querySelector("#risk-threshold-label"),
  modeIndicator: document.querySelector("#mode-indicator"),
  sidebarModeLabel: document.querySelector("#sidebar-mode-label"),
  sidebarModeCopy: document.querySelector("#sidebar-mode-copy"),
  integrationModeLabel: document.querySelector("#integration-mode-label"),
  modeSimulation: document.querySelector("#mode-simulation"),
  modeReal: document.querySelector("#mode-real"),
  integrationModeCopy: document.querySelector("#integration-mode-copy"),
  ingestSnippet: document.querySelector("#ingest-snippet"),
  adminAuditFeed: document.querySelector("#admin-audit-feed"),
  platformModeSteps: document.querySelector("#platform-mode-steps"),
  platformLaunchGuide: document.querySelector("#platform-launch-guide"),
  navOverviewCount: document.querySelector("#nav-overview-count"),
  navEmployeesCount: document.querySelector("#nav-employees-count"),
  navActivityCount: document.querySelector("#nav-activity-count"),
  navAlertsCount: document.querySelector("#nav-alerts-count"),
  navStudioCount: document.querySelector("#nav-studio-count"),
  navIntegrationsCount: document.querySelector("#nav-integrations-count"),
  studioEmployeeSelect: document.querySelector("#studio-employee-select"),
  studioScenarioSelect: document.querySelector("#studio-scenario-select"),
  studioModeSelect: document.querySelector("#studio-mode-select"),
  studioLaunchButton: document.querySelector("#studio-launch-button"),
  studioLaunchFeedback: document.querySelector("#studio-launch-feedback"),
  studioGuideList: document.querySelector("#studio-guide-list"),
  studioScenarioCards: document.querySelector("#studio-scenario-cards"),
  studioQuickResult: document.querySelector("#studio-quick-result"),
  studioLocalSteps: document.querySelector("#studio-local-steps"),
  studioRemoteSteps: document.querySelector("#studio-remote-steps"),
  studioLocalSnippet: document.querySelector("#studio-local-snippet"),
  studioRemoteSnippet: document.querySelector("#studio-remote-snippet"),
  toastStack: document.querySelector("#toast-stack"),
  copyButtons: Array.from(document.querySelectorAll("[data-copy-target]")),
};

const state = {
  overview: null,
  rules: null,
  audit: [],
  controlScenarios: [],
  selectedEmployeeId: null,
  selectedScenarioId: null,
  lastControlResult: null,
  detail: null,
  socket: null,
  refreshTimeout: null,
  pingInterval: null,
  activeView: "overview",
  filters: {
    search: "",
    risk: "all",
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
  const metadata = VIEW_META[viewName] || VIEW_META.overview;
  state.activeView = viewName;

  elements.navItems.forEach((item) => {
    item.classList.toggle("is-active", item.dataset.view === viewName);
  });

  elements.views.forEach((view) => {
    view.classList.toggle("view--active", view.id === `view-${viewName}`);
  });

  elements.viewKicker.textContent = metadata.kicker;
  elements.viewTitle.textContent = metadata.title;
  elements.viewCopy.textContent = metadata.copy;
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

function updateModeUi(mode) {
  const isSimulation = mode === "simulation";
  const label = isSimulation ? "Simulation" : "Real Monitoring";
  const sidebarCopy = isSimulation
    ? "Synthetic telemetry is active with steady workplace behavior, visible activity, and occasional multi-step anomalies."
    : "Simulation is paused. The system is waiting for live ingestion or intentional Studio-triggered events in real mode.";
  const integrationCopy = isSimulation
    ? "Use simulation when you want the app to stay alive on its own and mix calm activity with believable security bursts."
    : "Use real monitoring when you want to prove that outside interactions, forwarded logs, or another machine can change risk instantly.";

  elements.modeSimulation.classList.toggle("is-active", isSimulation);
  elements.modeReal.classList.toggle("is-active", !isSimulation);
  elements.sidebarModeLabel.textContent = `${label} mode`;
  elements.sidebarModeCopy.textContent = sidebarCopy;
  elements.integrationModeLabel.textContent = label;
  elements.integrationModeCopy.textContent = integrationCopy;
  elements.navIntegrationsCount.textContent = isSimulation ? "SIM" : "REAL";
}

function buildStudioGuide() {
  return [
    "Use Studio when you want a guaranteed story on screen instead of waiting for the simulation to produce one naturally.",
    "Choose `current mode` if you simply want the scenario to land wherever the system is already running.",
    "Use `credential_stuffing` for a fast escalation demo and `usb_exfiltration` when you want a stronger insider-threat story.",
  ];
}

function buildStudioLocalSteps() {
  return [
    "Stay in the app on this machine and use the helper command below when you want a repeatable test outside the UI.",
    "The local helper uses the same host and port as the app you are currently viewing, so it works for the browser version and the desktop shell.",
    "Use the control channel for full scenario stories and the ingest channel when you want to mimic raw log forwarding.",
  ];
}

function buildStudioRemoteSteps() {
  return [
    "Run `Launch SentraGuard Network Demo.bat` on the main machine first so SentraGuard listens on `0.0.0.0:8000`.",
    "Switch the app to `Real Monitoring` in the Platform tab before you send events from the other computer.",
    "Replace `YOUR-PC-IP` in the command below with the IP address of the host machine on the same Wi-Fi or LAN.",
  ];
}

function buildPlatformModeSteps() {
  return [
    "Open the `Platform` tab and switch the mode to `Real Monitoring` before sending outside events.",
    "On the host machine, run `Launch SentraGuard Network Demo.bat` if another PC needs to send data into this app.",
    "From this machine or another Windows PC, use `Send SentraGuard Interaction.ps1` to push a preset into the live ingestion endpoint.",
    "Watch `Signals`, `Response`, and `People` update immediately when the helper command lands.",
  ];
}

function buildPlatformLaunchGuide() {
  return [
    "Recommended for most users: run `Start SentraGuard AI.bat`. It launches the desktop app when available and falls back safely if it is not built yet.",
    "Use `Install SentraGuard Desktop App.bat` only for first-time setup or when you want to rebuild the packaged desktop app.",
    "Use `Launch SentraGuard AI.bat` only when you specifically want the browser version, and use `Launch SentraGuard Network Demo.bat` only for cross-PC demos.",
  ];
}

function buildPlatformIngestSnippet() {
  elements.ingestSnippet.textContent = [
    'powershell -ExecutionPolicy Bypass -File ".\\Send SentraGuard Interaction.ps1" \\',
    `  -Server ${window.location.origin} \\`,
    "  -Channel ingest \\",
    "  -Mode real \\",
    "  -Preset usb_exfiltration",
  ].join("\n");
}

function buildStudioSnippets() {
  const localOrigin = window.location.origin;
  const scenarioId = state.selectedScenarioId || "credential_stuffing";
  const selectedEmployee = state.overview?.employees.find(
    (employee) => String(employee.id) === String(elements.studioEmployeeSelect.value)
  );
  const employeeCode = selectedEmployee?.employee_code || "EMP-014";
  const employeeName = selectedEmployee?.name || "Jordan Vale";
  const department = selectedEmployee?.department || "Finance";
  const title = selectedEmployee?.title || "Senior Analyst";

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
    "  -Server http://YOUR-PC-IP:8000 \\",
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

  elements.navOverviewCount.textContent = String(state.overview.high_risk_employees);
  elements.navEmployeesCount.textContent = String(state.overview.total_employees);
  elements.navActivityCount.textContent = String(state.overview.recent_events);
  elements.navAlertsCount.textContent = String(state.overview.active_alerts);
  elements.navStudioCount.textContent = state.controlScenarios.length ? String(state.controlScenarios.length) : "LIVE";
}

function buildAlertRunbook() {
  if (!state.overview) {
    return [];
  }

  const actions = [];
  if (state.overview.active_alerts) {
    actions.push(
      `Review ${state.overview.active_alerts} alert${state.overview.active_alerts === 1 ? "" : "s"} in the queue and confirm each escalation has an owner.`
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
  if (!state.overview) {
    return [];
  }

  const search = state.filters.search.trim().toLowerCase();
  return state.overview.employees.filter((employee) => {
    const matchesSearch =
      !search ||
      employee.name.toLowerCase().includes(search) ||
      employee.employee_code.toLowerCase().includes(search) ||
      employee.department.toLowerCase().includes(search);
    const matchesRisk = state.filters.risk === "all" || employee.current_risk_level === state.filters.risk;
    return matchesSearch && matchesRisk;
  });
}

function renderEmployeeTable() {
  const employees = filteredEmployees();
  renderEmployees(elements.employeeTableBody, employees, state.selectedEmployeeId);
  elements.employeeResultCount.textContent = `${employees.length} result${employees.length === 1 ? "" : "s"}`;
}

async function ensureSelectedEmployee() {
  if (!state.overview?.employees.length) {
    state.selectedEmployeeId = null;
    state.detail = null;
    renderInspector(elements.employeeInspector, null);
    return;
  }

  const visibleEmployees = filteredEmployees();
  if (!visibleEmployees.length) {
    state.selectedEmployeeId = null;
    state.detail = null;
    renderInspector(elements.employeeInspector, null);
    return;
  }

  const currentSelectionExists = visibleEmployees.some((employee) => employee.id === state.selectedEmployeeId);
  if (!currentSelectionExists) {
    state.selectedEmployeeId = visibleEmployees[0].id;
  }
}

function populateStudioEmployeeSelect() {
  if (!state.overview) {
    return;
  }

  const previous = elements.studioEmployeeSelect.value;
  elements.studioEmployeeSelect.innerHTML = state.overview.employees
    .slice(0, 80)
    .map(
      (employee) =>
        `<option value="${employee.id}">${employee.employee_code} | ${employee.name} | ${employee.department}</option>`
    )
    .join("");

  if (previous && state.overview.employees.some((employee) => String(employee.id) === previous)) {
    elements.studioEmployeeSelect.value = previous;
  } else if (state.overview.watchlist[0]) {
    elements.studioEmployeeSelect.value = String(state.overview.watchlist[0].id);
  } else if (state.overview.employees[0]) {
    elements.studioEmployeeSelect.value = String(state.overview.employees[0].id);
  }
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

function renderStudio() {
  renderActions(elements.studioGuideList, buildStudioGuide());
  renderActions(elements.studioLocalSteps, buildStudioLocalSteps());
  renderActions(elements.studioRemoteSteps, buildStudioRemoteSteps());
  renderScenarioCards(elements.studioScenarioCards, state.controlScenarios, state.selectedScenarioId);
  renderControlResult(elements.studioQuickResult, state.lastControlResult);
  buildStudioSnippets();
}

function renderPlatformGuides() {
  renderActions(elements.platformModeSteps, buildPlatformModeSteps());
  renderActions(elements.platformLaunchGuide, buildPlatformLaunchGuide());
  buildPlatformIngestSnippet();
}

async function focusEmployee(employeeId) {
  if (!employeeId) {
    return;
  }

  state.filters.search = "";
  state.filters.risk = "all";
  elements.employeeSearch.value = "";
  elements.employeeRiskFilter.value = "all";
  setView("employees");
  await loadEmployeeDetail(employeeId);
}

async function loadRules() {
  state.rules = await api.rules();
  renderRules(elements.ruleList, state.rules);
  elements.riskThresholdLabel.textContent = `Threshold ${state.rules.threshold}`;
}

async function loadAudit() {
  state.audit = await api.audit();
  renderAuditFeed(elements.adminAuditFeed, state.audit);
}

async function loadControlScenarios() {
  state.controlScenarios = await api.controlScenarios();
  populateScenarioSelect();
  updateNavCounts();
  renderStudio();
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
  renderActivityFeed(elements.activityFeed, state.overview.activity_feed);
  renderTriggerBreakdown(elements.activityTriggerBreakdown, state.overview.top_triggers);
  renderDepartmentRisk(elements.activityDepartmentRisk, state.overview.department_risk);
  renderAlertsFeed(elements.alertsFeed, state.overview.alerts);
  renderActions(elements.alertsRunbook, buildAlertRunbook());

  elements.overviewWatchlistCount.textContent = `${state.overview.watchlist.length} user${state.overview.watchlist.length === 1 ? "" : "s"}`;
  elements.alertCountLabel.textContent = `${state.overview.alerts.length} alert${state.overview.alerts.length === 1 ? "" : "s"}`;
  elements.refreshTime.textContent = `Updated ${formatRelativeTime(state.overview.refreshed_at)}`;

  updateModeUi(state.overview.system_mode);
  updateNavCounts();
  populateStudioEmployeeSelect();
  renderStudio();
  renderPlatformGuides();

  setStatus(
    `${state.overview.high_risk_employees} high-risk employees | ${state.overview.recent_events} recent events | ${state.overview.watchlist.length} on watchlist`
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
    });

    state.lastControlResult = response;
    renderStudio();
    elements.studioLaunchFeedback.textContent = `${response.accepted} event${response.accepted === 1 ? "" : "s"} emitted for ${response.employee_code}.`;
    showToast("Scenario launched", `${response.scenario_id} pushed ${response.accepted} event${response.accepted === 1 ? "" : "s"}.`);
    await refreshDashboard();
  } catch (error) {
    elements.studioLaunchFeedback.textContent = error.message || "Scenario launch failed";
    handleUnauthorized(error);
  } finally {
    elements.studioLaunchButton.disabled = false;
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
    elements.modeIndicator.style.background = "var(--accent)";
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

    if (message.type === "system.mode_changed" || message.type === "system.connected") {
      const nextMode = message.payload?.mode;
      if (nextMode) {
        updateModeUi(nextMode);
      }
      if (message.type === "system.mode_changed") {
        showToast("Mode updated", `Monitoring switched to ${nextMode}.`);
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
    showLogin("Your session expired. Sign in again.");
    return;
  }

  setStatus(error?.message || "Unable to load dashboard");
  showToast("Request failed", error?.message || "Unknown error", "alert");
}

async function initializeDashboard() {
  renderPlatformGuides();
  await Promise.all([loadRules(), loadControlScenarios()]);
  await refreshDashboard();
  connectSocket();
  setView(state.activeView);
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

  try {
    await window.navigator.clipboard.writeText(target.textContent || "");
    showToast("Copied", "Command copied to clipboard.");
  } catch {
    showToast("Copy failed", "Clipboard access was blocked on this device.", "alert");
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
    setView(item.dataset.view || "overview");
  });
});

elements.copyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    copySnippet(button.dataset.copyTarget).catch(() => {
      showToast("Copy failed", "Clipboard access was blocked on this device.", "alert");
    });
  });
});

elements.refreshButton.addEventListener("click", () => {
  refreshDashboard().catch(handleUnauthorized);
});

elements.logoutButton.addEventListener("click", () => {
  clearToken();
  disconnectSocket();
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

elements.employeeSearch.addEventListener("input", async (event) => {
  state.filters.search = event.target.value;
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
});

elements.employeeRiskFilter.addEventListener("change", async (event) => {
  state.filters.risk = event.target.value;
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
});

elements.employeeTableBody.addEventListener("click", (event) => {
  const row = event.target.closest("tr[data-employee-id]");
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

elements.studioScenarioSelect.addEventListener("change", (event) => {
  state.selectedScenarioId = event.target.value;
  renderStudio();
});

elements.studioEmployeeSelect.addEventListener("change", () => {
  renderStudio();
});

elements.studioModeSelect.addEventListener("change", () => {
  renderStudio();
});

elements.studioScenarioCards.addEventListener("click", (event) => {
  const card = event.target.closest("[data-scenario-id]");
  if (!card) {
    return;
  }

  state.selectedScenarioId = card.dataset.scenarioId;
  elements.studioScenarioSelect.value = state.selectedScenarioId;
  renderStudio();
});

elements.studioLaunchButton.addEventListener("click", () => {
  emitSelectedScenario().catch(handleUnauthorized);
});

window.addEventListener("load", async () => {
  renderPlatformGuides();
  setView("overview");

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
