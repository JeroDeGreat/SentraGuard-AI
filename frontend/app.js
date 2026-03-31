import { api, clearToken, DEFAULT_ADMIN, getToken, setToken } from "./modules/api.js";
import {
  formatRelativeTime,
  renderActions,
  renderActivityFeed,
  renderAlertsFeed,
  renderDepartmentRisk,
  renderEmployees,
  renderInspector,
  renderMetrics,
  renderRiskDistribution,
  renderRules,
  renderTrend,
  renderTriggerBreakdown,
  renderWatchlist,
} from "./modules/render.js";

const VIEW_META = {
  overview: {
    kicker: "Operational view",
    title: "Security posture overview",
    copy: "Start here to understand overall risk, why pressure is rising, and which employees need attention first.",
  },
  employees: {
    kicker: "Investigation workspace",
    title: "Employee risk investigator",
    copy: "Search the workforce, inspect a single employee profile, and compare their latest behavior against baseline expectations.",
  },
  activity: {
    kicker: "Telemetry stream",
    title: "Live organization activity",
    copy: "Review the most recent behavior events, understand which triggers dominate, and spot pressure building before it becomes an alert.",
  },
  alerts: {
    kicker: "Escalation queue",
    title: "High-risk alert response",
    copy: "Focus on employees who already crossed the threshold and use the runbook to move from detection into response.",
  },
  integrations: {
    kicker: "System controls",
    title: "Monitoring mode and ingest setup",
    copy: "Switch between simulation and live monitoring, then connect external logs through the ingestion API and current rule set.",
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
  navOverviewCount: document.querySelector("#nav-overview-count"),
  navEmployeesCount: document.querySelector("#nav-employees-count"),
  navActivityCount: document.querySelector("#nav-activity-count"),
  navAlertsCount: document.querySelector("#nav-alerts-count"),
  navIntegrationsCount: document.querySelector("#nav-integrations-count"),
  toastStack: document.querySelector("#toast-stack"),
};

const state = {
  overview: null,
  rules: null,
  selectedEmployeeId: null,
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

function updateModeUi(mode) {
  const isSimulation = mode === "simulation";
  const label = isSimulation ? "Simulation" : "Real Monitoring";
  const sidebarCopy = isSimulation
    ? "Synthetic telemetry is currently driving the dashboard for demo and testing."
    : "Simulation is paused and SentraGuard is waiting for real log ingestion events.";
  const integrationCopy = isSimulation
    ? "Synthetic telemetry is active. Employees evolve over time with both safe and risky behavior."
    : "Simulation pauses and the platform expects real logs on the ingestion API.";

  elements.modeSimulation.classList.toggle("is-active", isSimulation);
  elements.modeReal.classList.toggle("is-active", !isSimulation);
  elements.sidebarModeLabel.textContent = `${label} mode`;
  elements.sidebarModeCopy.textContent = sidebarCopy;
  elements.integrationModeLabel.textContent = label;
  elements.integrationModeCopy.textContent = integrationCopy;
  elements.navIntegrationsCount.textContent = isSimulation ? "SIM" : "REAL";
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

function buildIngestSnippet() {
  elements.ingestSnippet.textContent = `curl -X POST ${window.location.origin}/api/v1/logs/ingest
-H "Content-Type: application/json"
-H "X-Ingest-Token: sentra-ingest-key"
-d '{
  "events": [
    {
      "employee_code": "EMP-401",
      "employee_name": "A. Mensah",
      "department": "Finance",
      "title": "Risk Analyst",
      "event_type": "login_failed",
      "details": { "location": "External IP" }
    }
  ]
}'`;
}

function updateNavCounts() {
  if (!state.overview) {
    return;
  }

  elements.navOverviewCount.textContent = String(state.overview.high_risk_employees);
  elements.navEmployeesCount.textContent = String(state.overview.total_employees);
  elements.navActivityCount.textContent = String(state.overview.recent_events);
  elements.navAlertsCount.textContent = String(state.overview.active_alerts);
}

function buildAlertRunbook() {
  if (!state.overview) {
    return [];
  }

  const actions = [];
  if (state.overview.active_alerts) {
    actions.push(
      `Review ${state.overview.active_alerts} alert${state.overview.active_alerts === 1 ? "" : "s"} in the queue and confirm that every escalation has an owner.`
    );
  }
  if (state.rules?.threshold) {
    actions.push(
      `Any employee at or above the threshold of ${state.rules.threshold} should be treated as a confirmed breach candidate until cleared.`
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
    const matchesRisk =
      state.filters.risk === "all" || employee.current_risk_level === state.filters.risk;
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

function scheduleRefresh(delay = 250) {
  window.clearTimeout(state.refreshTimeout);
  state.refreshTimeout = window.setTimeout(() => {
    loadOverview().catch(handleUnauthorized);
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
  buildIngestSnippet();
  await loadRules();
  await loadOverview();
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

elements.refreshButton.addEventListener("click", () => {
  loadOverview().catch(handleUnauthorized);
});

elements.logoutButton.addEventListener("click", () => {
  clearToken();
  disconnectSocket();
  showLogin("Signed out.");
});

elements.modeSimulation.addEventListener("click", async () => {
  try {
    await api.setMode("simulation");
    showToast("Simulation active", "The demo behavior engine is running again.");
    scheduleRefresh(0);
  } catch (error) {
    handleUnauthorized(error);
  }
});

elements.modeReal.addEventListener("click", async () => {
  try {
    await api.setMode("real");
    showToast("Real mode active", "Simulation paused. Waiting for external logs.");
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

window.addEventListener("load", async () => {
  buildIngestSnippet();
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
