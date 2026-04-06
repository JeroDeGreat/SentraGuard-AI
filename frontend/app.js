import {
  connectLive,
  emitScenario,
  getAudit,
  getEmployeeDetail,
  getGuide,
  getMe,
  getMode,
  getOverview,
  getRules,
  getScenarios,
  getTempo,
  login,
  resetSystem,
  setMode,
  setTempo,
} from "./modules/api.js";
import {
  renderAdminCard,
  renderLandingScreen,
  renderLoginScreen,
  renderPageContent,
  renderPageHeader,
  renderRuntimeCard,
} from "./modules/render.js";

const STORAGE_KEYS = {
  token: "sentraguard.token",
  email: "sentraguard.email",
  view: "sentraguard.view",
  employee: "sentraguard.employee",
  settingsTab: "sentraguard.settingsTab",
};

const VALID_VIEWS = new Set(["overview", "investigations", "activity", "operations", "settings"]);
const VALID_SETTINGS_TABS = new Set(["rules", "audit", "info"]);

const state = {
  screen: "landing",
  token: localStorage.getItem(STORAGE_KEYS.token) || "",
  adminEmail: localStorage.getItem(STORAGE_KEYS.email) || "",
  currentView: VALID_VIEWS.has(localStorage.getItem(STORAGE_KEYS.view)) ? localStorage.getItem(STORAGE_KEYS.view) : "overview",
  selectedEmployeeId: Number(localStorage.getItem(STORAGE_KEYS.employee) || 0) || null,
  settingsTab: VALID_SETTINGS_TABS.has(localStorage.getItem(STORAGE_KEYS.settingsTab)) ? localStorage.getItem(STORAGE_KEYS.settingsTab) : "rules",
  loginEmail: localStorage.getItem(STORAGE_KEYS.email) || "admin@sentraguard.local",
  loginPassword: "",
  loginError: "",
  isAuthenticating: false,
  websocketConnected: false,
  socketHandle: null,
  reconnectTimer: null,
  refreshTimer: null,
  filterTimer: null,
  filters: {
    global: "",
    investigations: { query: "", level: "all", department: "all" },
    activity: { query: "", eventType: "all", severity: "all" },
  },
  overview: null,
  employeeDetail: null,
  rules: null,
  audit: [],
  guide: null,
  mode: null,
  tempo: null,
  scenarios: [],
  me: null,
  lastOperation: null,
};

const elements = {
  landingView: document.getElementById("landingView"),
  loginView: document.getElementById("loginView"),
  platformView: document.getElementById("platformView"),
  runtimeCard: document.getElementById("runtimeCard"),
  adminCard: document.getElementById("adminCard"),
  pageHeader: document.getElementById("pageHeader"),
  pageContent: document.getElementById("pageContent"),
  sidebarNav: document.getElementById("sidebarNav"),
  globalSearchInput: document.getElementById("globalSearchInput"),
  systemStatusChip: document.getElementById("systemStatusChip"),
  systemStatusText: document.getElementById("systemStatusText"),
  alertCounter: document.getElementById("alertCounter"),
  toastStack: document.getElementById("toastStack"),
};

function showToast(message, tone = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast--${tone}`;
  toast.textContent = message;
  elements.toastStack.appendChild(toast);
  window.setTimeout(() => {
    toast.classList.add("is-leaving");
    window.setTimeout(() => toast.remove(), 260);
  }, 3200);
}

function timeStampLabel() {
  return new Date().toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    return;
  } catch (error) {
    const probe = document.createElement("textarea");
    probe.value = value;
    document.body.appendChild(probe);
    probe.select();
    document.execCommand("copy");
    probe.remove();
  }
}

function setScreen(screen) {
  state.screen = screen;
  elements.landingView.classList.toggle("is-hidden", screen !== "landing");
  elements.loginView.classList.toggle("is-hidden", screen !== "login");
  elements.platformView.classList.toggle("is-hidden", screen !== "platform");
}

function persistSession() {
  if (state.token) {
    localStorage.setItem(STORAGE_KEYS.token, state.token);
  } else {
    localStorage.removeItem(STORAGE_KEYS.token);
  }

  if (state.adminEmail) {
    localStorage.setItem(STORAGE_KEYS.email, state.adminEmail);
  } else {
    localStorage.removeItem(STORAGE_KEYS.email);
  }

  localStorage.setItem(STORAGE_KEYS.view, state.currentView);
  localStorage.setItem(STORAGE_KEYS.settingsTab, state.settingsTab);

  if (state.selectedEmployeeId) {
    localStorage.setItem(STORAGE_KEYS.employee, String(state.selectedEmployeeId));
  } else {
    localStorage.removeItem(STORAGE_KEYS.employee);
  }
}

function clearSession() {
  if (state.socketHandle) {
    state.socketHandle.close();
    state.socketHandle = null;
  }
  if (state.reconnectTimer) {
    window.clearTimeout(state.reconnectTimer);
    state.reconnectTimer = null;
  }

  state.token = "";
  state.adminEmail = "";
  state.me = null;
  state.overview = null;
  state.employeeDetail = null;
  state.audit = [];
  state.rules = null;
  state.guide = null;
  state.mode = null;
  state.tempo = null;
  state.scenarios = [];
  state.websocketConnected = false;
  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.email);
  localStorage.removeItem(STORAGE_KEYS.employee);
}

function render() {
  elements.landingView.innerHTML = renderLandingScreen();
  elements.loginView.innerHTML = renderLoginScreen(state);

  if (state.screen === "platform") {
    elements.runtimeCard.innerHTML = renderRuntimeCard(state);
    elements.adminCard.innerHTML = renderAdminCard(state);
    elements.pageHeader.innerHTML = renderPageHeader(state);
    elements.pageContent.innerHTML = renderPageContent(state);
    elements.globalSearchInput.value = state.filters.global;
    elements.systemStatusText.textContent = state.websocketConnected ? "System Online" : "Syncing";
    elements.systemStatusChip.classList.toggle("is-offline", !state.websocketConnected);
    elements.alertCounter.textContent = String(state.overview?.active_alerts || 0);

    [...elements.sidebarNav.querySelectorAll("[data-nav]")].forEach((button) => {
      button.classList.toggle("is-active", button.dataset.nav === state.currentView);
    });
  }

  setScreen(state.screen);
  persistSession();
}

function scheduleWorkspaceRefresh(delay = 900) {
  if (!state.token) {
    return;
  }
  if (state.refreshTimer) {
    window.clearTimeout(state.refreshTimer);
  }
  state.refreshTimer = window.setTimeout(() => {
    refreshWorkspace({ silent: true });
  }, delay);
}

async function loadSelectedEmployee() {
  if (!state.token || !state.selectedEmployeeId) {
    state.employeeDetail = null;
    return;
  }

  try {
    state.employeeDetail = await getEmployeeDetail(state.token, state.selectedEmployeeId);
  } catch (error) {
    state.employeeDetail = null;
  }
}

async function refreshWorkspace(options = {}) {
  if (!state.token) {
    return;
  }

  const silent = Boolean(options.silent);

  try {
    const [me, overview, rules, guide, mode, tempo, audit, scenarios] = await Promise.all([
      getMe(state.token),
      getOverview(state.token),
      getRules(state.token),
      getGuide(state.token),
      getMode(state.token),
      getTempo(state.token),
      getAudit(state.token),
      getScenarios(state.token),
    ]);

    state.me = me;
    state.adminEmail = me.email;
    state.overview = overview;
    state.rules = rules;
    state.guide = guide;
    state.mode = mode;
    state.tempo = tempo;
    state.audit = audit;
    state.scenarios = scenarios;

    const employeeExists = (overview.employees || []).some((employee) => employee.id === state.selectedEmployeeId);
    if (!state.selectedEmployeeId || !employeeExists) {
      state.selectedEmployeeId = overview.watchlist?.[0]?.id || overview.employees?.[0]?.id || null;
    }

    if (state.currentView === "investigations" || !silent) {
      await loadSelectedEmployee();
    }

    if (state.screen !== "platform") {
      state.screen = "platform";
    }
    render();
  } catch (error) {
    clearSession();
    state.loginError = "Your session expired. Sign in again to continue.";
    state.screen = "login";
    render();
    showToast(error.message || "Unable to refresh workspace.", "danger");
  }
}

function connectSocket() {
  if (!state.token || state.socketHandle) {
    return;
  }

  state.socketHandle = connectLive((payload) => {
    if (payload.type === "system.connected") {
      state.websocketConnected = true;
      render();
      return;
    }

    if (payload.type === "alert.created") {
      const alert = payload.payload?.alert;
      if (alert) {
        showToast(`${alert.employee_name} triggered a ${alert.risk_level.toLowerCase()} alert.`, "danger");
      }
    }

    scheduleWorkspaceRefresh(600);
  });

  state.socketHandle.socket.addEventListener("open", () => {
    state.websocketConnected = true;
    render();
  });

  state.socketHandle.socket.addEventListener("close", () => {
    state.websocketConnected = false;
    state.socketHandle = null;
    render();
    if (state.token) {
      state.reconnectTimer = window.setTimeout(connectSocket, 1600);
    }
  });
}

async function startPlatformSession() {
  state.screen = "platform";
  render();
  await refreshWorkspace();
  connectSocket();
}

async function authenticate(email, password) {
  state.isAuthenticating = true;
  state.loginError = "";
  state.loginEmail = email;
  state.loginPassword = password;
  render();

  try {
    const response = await login(email, password);
    state.token = response.access_token;
    state.adminEmail = response.admin_email;
    state.isAuthenticating = false;
    await startPlatformSession();
    showToast("Signed in to SentraGuard.", "success");
  } catch (error) {
    state.isAuthenticating = false;
    state.loginError = error.message || "Unable to sign in.";
    state.screen = "login";
    render();
  }
}

function goToView(view) {
  state.currentView = view;
  if (view !== "settings") {
    state.settingsTab = state.settingsTab || "rules";
  }
  render();
  if (view === "investigations") {
    loadSelectedEmployee().then(render);
  }
}

function scheduleFilterRender(focusId, value) {
  if (state.filterTimer) {
    window.clearTimeout(state.filterTimer);
  }
  state.filterTimer = window.setTimeout(() => {
    render();
    if (focusId) {
      const input = document.getElementById(focusId);
      if (input) {
        input.focus();
        if (typeof value === "string" && input.setSelectionRange) {
          input.setSelectionRange(value.length, value.length);
        }
      }
    }
  }, 120);
}

document.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-open-login], [data-show-landing], [data-nav], [data-select-employee], [data-jump-employee], [data-set-mode], [data-set-tempo], [data-reset-system], [data-copy-url], [data-emit-scenario], [data-settings-tab], #refreshButton, #alertsButton, #logoutButton, #demoCredentialsButton, #sidebarHomeButton");
  if (!target) {
    return;
  }

  try {
    if (target.matches("[data-open-login]")) {
      state.loginError = "";
      state.screen = "login";
      render();
      return;
    }

    if (target.matches("[data-show-landing]")) {
      state.screen = "landing";
      render();
      return;
    }

    if (target.id === "sidebarHomeButton") {
      goToView("overview");
      return;
    }

    if (target.matches("[data-nav]")) {
      goToView(target.dataset.nav);
      return;
    }

    if (target.matches("[data-select-employee]")) {
      state.selectedEmployeeId = Number(target.dataset.selectEmployee);
      await loadSelectedEmployee();
      render();
      return;
    }

    if (target.matches("[data-jump-employee]")) {
      state.selectedEmployeeId = Number(target.dataset.jumpEmployee);
      state.currentView = "investigations";
      await loadSelectedEmployee();
      render();
      return;
    }

    if (target.id === "refreshButton") {
      await refreshWorkspace();
      showToast("Workspace refreshed.", "success");
      return;
    }

    if (target.id === "alertsButton") {
      goToView("overview");
      window.setTimeout(() => {
        document.querySelector(".alert-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 60);
      return;
    }

    if (target.id === "logoutButton") {
      clearSession();
      state.screen = "landing";
      render();
      showToast("Signed out.", "success");
      return;
    }

    if (target.id === "demoCredentialsButton") {
      await authenticate("admin@sentraguard.local", "ChangeMe123!");
      return;
    }

    if (target.matches("[data-set-mode]")) {
      await setMode(state.token, target.dataset.setMode);
      state.lastOperation = {
        title: "Monitoring mode changed",
        message: `Platform switched to ${target.dataset.setMode} mode.`,
        time: timeStampLabel(),
      };
      await refreshWorkspace();
      showToast(`Mode changed to ${target.dataset.setMode}.`, "success");
      return;
    }

    if (target.matches("[data-set-tempo]")) {
      await setTempo(state.token, target.dataset.setTempo);
      state.lastOperation = {
        title: "Simulation tempo changed",
        message: `Simulation tempo is now ${target.dataset.setTempo}.`,
        time: timeStampLabel(),
      };
      await refreshWorkspace();
      showToast(`Tempo changed to ${target.dataset.setTempo}.`, "success");
      return;
    }

    if (target.matches("[data-reset-system]")) {
      await resetSystem(state.token);
      state.lastOperation = {
        title: "Platform reset",
        message: "Threats, alerts, activity, audit history, and scores were reset to a clean baseline.",
        time: timeStampLabel(),
      };
      await refreshWorkspace();
      showToast("Platform reset to zero.", "success");
      return;
    }

    if (target.matches("[data-copy-url]")) {
      const url = target.dataset.copyUrl;
      await copyText(url);
      showToast("Connection target copied.", "success");
      return;
    }

    if (target.matches("[data-emit-scenario]")) {
      const scenarioId = target.dataset.emitScenario;
      const response = await emitScenario(state.token, {
        scenario_id: scenarioId,
        target_mode: "current",
        employee_id: state.selectedEmployeeId,
        repeat: 1,
      });
      state.lastOperation = {
        title: "Scenario launched",
        message: `${scenarioId} emitted ${response.accepted} event(s) for ${response.employee_code}.`,
        time: timeStampLabel(),
      };
      await refreshWorkspace();
      showToast(`${scenarioId} scenario launched.`, response.flagged_high_risk ? "danger" : "success");
      return;
    }

    if (target.matches("[data-settings-tab]")) {
      state.settingsTab = target.dataset.settingsTab;
      render();
    }
  } catch (error) {
    showToast(error.message || "Action failed.", "danger");
  }
});

document.addEventListener("submit", async (event) => {
  const form = event.target.closest("#loginForm");
  if (!form) {
    return;
  }

  event.preventDefault();
  const email = document.getElementById("loginEmailInput")?.value.trim() || "";
  const password = document.getElementById("loginPasswordInput")?.value || "";
  await authenticate(email, password);
});

document.addEventListener("input", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  if (target.id === "loginEmailInput") {
    state.loginEmail = target.value;
    return;
  }

  if (target.id === "loginPasswordInput") {
    state.loginPassword = target.value;
    return;
  }

  if (target.id === "globalSearchInput") {
    state.filters.global = target.value;
    scheduleFilterRender("globalSearchInput", target.value);
    return;
  }

  if (target.id === "investigationSearchInput") {
    state.filters.investigations.query = target.value;
    scheduleFilterRender("investigationSearchInput", target.value);
    return;
  }

  if (target.id === "activitySearchInput") {
    state.filters.activity.query = target.value;
    scheduleFilterRender("activitySearchInput", target.value);
  }
});

document.addEventListener("change", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement)) {
    return;
  }

  if (target.id === "investigationLevelSelect") {
    state.filters.investigations.level = target.value;
    render();
    return;
  }

  if (target.id === "investigationDepartmentSelect") {
    state.filters.investigations.department = target.value;
    render();
    return;
  }

  if (target.id === "activityEventTypeSelect") {
    state.filters.activity.eventType = target.value;
    render();
    return;
  }

  if (target.id === "activitySeveritySelect") {
    state.filters.activity.severity = target.value;
    render();
  }
});

window.addEventListener("focus", () => {
  if (state.token) {
    scheduleWorkspaceRefresh(250);
  }
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && state.token) {
    scheduleWorkspaceRefresh(250);
  }
});

async function initialize() {
  render();
  if (state.token) {
    try {
      await startPlatformSession();
      return;
    } catch (error) {
      clearSession();
    }
  }

  state.screen = "landing";
  render();
}

initialize();
