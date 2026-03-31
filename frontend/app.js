import { api, clearToken, DEFAULT_ADMIN, getToken, setToken } from "./modules/api.js";
import {
  formatRelativeTime,
  renderActivityFeed,
  renderAlertsFeed,
  renderDepartmentRisk,
  renderEmployees,
  renderInspector,
  renderMetrics,
  renderRiskDistribution,
  renderRules,
  renderTrend,
} from "./modules/render.js";

const elements = {
  loginShell: document.querySelector("#login-shell"),
  loginForm: document.querySelector("#login-form"),
  loginEmail: document.querySelector("#login-email"),
  loginPassword: document.querySelector("#login-password"),
  loginFeedback: document.querySelector("#login-feedback"),
  demoFill: document.querySelector("#demo-fill"),
  refreshButton: document.querySelector("#refresh-button"),
  logoutButton: document.querySelector("#logout-button"),
  metricStrip: document.querySelector("#metric-strip"),
  riskDistribution: document.querySelector("#risk-distribution"),
  departmentRisk: document.querySelector("#department-risk"),
  riskTrend: document.querySelector("#risk-trend"),
  employeeTableBody: document.querySelector("#employee-table-body"),
  employeeInspector: document.querySelector("#employee-inspector"),
  activityFeed: document.querySelector("#activity-feed"),
  alertsFeed: document.querySelector("#alerts-feed"),
  statusSummary: document.querySelector("#status-summary"),
  refreshTime: document.querySelector("#refresh-time"),
  ruleList: document.querySelector("#rule-list"),
  riskThresholdLabel: document.querySelector("#risk-threshold-label"),
  modeIndicator: document.querySelector("#mode-indicator"),
  modeSimulation: document.querySelector("#mode-simulation"),
  modeReal: document.querySelector("#mode-real"),
  modeCopy: document.querySelector("#mode-copy"),
  ingestSnippet: document.querySelector("#ingest-snippet"),
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
};

function showLogin(feedback = "") {
  elements.loginShell.classList.remove("is-hidden");
  elements.loginFeedback.textContent = feedback;
}

function hideLogin() {
  elements.loginShell.classList.add("is-hidden");
  elements.loginFeedback.textContent = "";
}

function updateModeUi(mode) {
  const isSimulation = mode === "simulation";
  elements.modeSimulation.classList.toggle("is-active", isSimulation);
  elements.modeReal.classList.toggle("is-active", !isSimulation);
  elements.modeCopy.textContent = isSimulation
    ? "Synthetic telemetry is active. Employees evolve over time with both safe and risky behavior."
    : "Simulation pauses and the platform expects real logs on the ingestion API.";
}

function setStatus(text) {
  elements.statusSummary.textContent = text;
}

function showToast(title, message, variant = "") {
  const toast = document.createElement("article");
  toast.className = `toast ${variant ? `toast--${variant}` : ""}`.trim();
  toast.innerHTML = `<strong>${title}</strong><div>${message}</div>`;
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
      "event_type": "login_failed",
      "details": { "location": "External IP" }
    }
  ]
}'`;
}

async function loadRules() {
  state.rules = await api.rules();
  renderRules(elements.ruleList, state.rules);
  elements.riskThresholdLabel.textContent = `Threshold ${state.rules.threshold}`;
}

async function loadOverview() {
  state.overview = await api.overview();
  renderMetrics(elements.metricStrip, state.overview);
  renderRiskDistribution(elements.riskDistribution, state.overview.risk_distribution);
  renderTrend(elements.riskTrend, state.overview.risk_trend);
  renderDepartmentRisk(elements.departmentRisk, state.overview.department_risk);
  renderEmployees(elements.employeeTableBody, state.overview.employees, state.selectedEmployeeId);
  renderActivityFeed(elements.activityFeed, state.overview.activity_feed);
  renderAlertsFeed(elements.alertsFeed, state.overview.alerts);
  updateModeUi(state.overview.system_mode);
  elements.refreshTime.textContent = `Updated ${formatRelativeTime(state.overview.refreshed_at)}`;
  setStatus(
    `${state.overview.high_risk_employees} high-risk employees | ${state.overview.recent_events} recent events`
  );

  if (!state.selectedEmployeeId && state.overview.employees.length) {
    state.selectedEmployeeId = state.overview.employees[0].id;
  }
  if (state.selectedEmployeeId) {
    await loadEmployeeDetail(state.selectedEmployeeId);
  } else {
    renderInspector(elements.employeeInspector, null);
  }
}

async function loadEmployeeDetail(employeeId) {
  state.selectedEmployeeId = employeeId;
  state.detail = await api.employee(employeeId);
  renderEmployees(elements.employeeTableBody, state.overview?.employees || [], state.selectedEmployeeId);
  renderInspector(elements.employeeInspector, state.detail);
}

function scheduleRefresh(delay = 250) {
  window.clearTimeout(state.refreshTimeout);
  state.refreshTimeout = window.setTimeout(() => {
    loadOverview().catch(handleUnauthorized);
  }, delay);
}

function connectSocket() {
  if (state.socket) {
    state.socket.close();
  }
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
      showToast("High-risk alert", "A new high-risk escalation crossed the threshold.", "alert");
    }
    if (message.type === "system.mode_changed") {
      showToast("Mode updated", `Monitoring switched to ${message.payload.mode}.`);
    }
    scheduleRefresh();
  });

  state.socket.addEventListener("close", () => {
    window.clearInterval(state.pingInterval);
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
    showLogin("Your session expired. Sign in again.");
    if (state.socket) {
      state.socket.close();
    }
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

elements.refreshButton.addEventListener("click", () => {
  loadOverview().catch(handleUnauthorized);
});

elements.logoutButton.addEventListener("click", () => {
  clearToken();
  if (state.socket) {
    state.socket.close();
  }
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

elements.employeeTableBody.addEventListener("click", (event) => {
  const row = event.target.closest("tr[data-employee-id]");
  if (!row) {
    return;
  }
  loadEmployeeDetail(Number(row.dataset.employeeId)).catch(handleUnauthorized);
});

window.addEventListener("load", async () => {
  buildIngestSnippet();
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
