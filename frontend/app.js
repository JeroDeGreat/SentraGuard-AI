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

const VIEW_META = {
  overview: {
    kicker: "Overview",
    title: "Risk posture and active pressure",
    copy: "See the current workforce posture, identify which signals are changing the story, and move straight into the people who need review.",
  },
  investigations: {
    kicker: "Investigations",
    title: "Search people and inspect live cases",
    copy: "Move from alert or signal to a specific employee, then compare current risk to baseline behavior without leaving context.",
  },
  activity: {
    kicker: "Activity",
    title: "Track the signal stream as it lands",
    copy: "Filter the live event feed, scan severity, and understand which triggers or departments are shaping the current picture.",
  },
  operations: {
    kicker: "Operations",
    title: "Run scenarios and prove real monitoring",
    copy: "Control the sim, inject live events, and use the exact commands your judges, teammates, or friend PCs need.",
  },
};

const TEMPO_META = {
  calm: {
    label: "Calm",
    copy: "Calm keeps the simulation believable and measured, with longer quiet stretches and fewer anomaly bursts.",
  },
  balanced: {
    label: "Balanced",
    copy: "Balanced keeps the feed active enough for a presentation without turning every minute into a breach story.",
  },
  demo: {
    label: "Demo",
    copy: "Demo increases activity and shortens quiet periods so the system feels lively during a hackathon without becoming constant chaos.",
  },
};

const MANUAL_EVENT_META = {
  login_failed: {
    placeholder: "External IP or unusual VPN location",
    build: (context, index) => ({
      location: context || "External VPN gateway",
      attempts: 3 + index,
      signal: "credential failure burst",
    }),
  },
  login_success: {
    placeholder: "After-hours VPN, hotel Wi-Fi, or new location",
    build: (context) => ({
      location: context || "03:14 AM remote VPN",
      session: "new-device",
    }),
  },
  file_download: {
    placeholder: "Payroll export, case archive, or report package",
    build: (context, index) => ({
      resource: context || "Quarterly payroll archive",
      files: 14 + index,
      volume_mb: 280 + index * 60,
    }),
  },
  usb_inserted: {
    placeholder: "Unmanaged USB device label",
    build: (context) => ({
      device_label: context || "Unmanaged USB",
      managed: false,
    }),
  },
  data_transfer: {
    placeholder: "Dropbox, USB, Google Drive, or external destination",
    build: (context, index) => ({
      channel: "external",
      destination: context || "Dropbox external share",
      bytes_mb: 650 + index * 180,
    }),
  },
  sensitive_access: {
    placeholder: "Vault, dossier, restricted archive, or deal room",
    build: (context) => ({
      resource: context || "finance-restricted-archive",
      sensitivity: "restricted",
    }),
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
  globalSearch: document.querySelector("#global-search"),
  statusSummary: document.querySelector("#status-summary"),
  refreshButton: document.querySelector("#refresh-button"),
  reloadUiButton: document.querySelector("#reload-ui-button"),
  logoutButton: document.querySelector("#logout-button"),
  operatorAvatar: document.querySelector("#operator-avatar"),
  operatorEmail: document.querySelector("#operator-email"),
  operatorRole: document.querySelector("#operator-role"),
  modeIndicator: document.querySelector("#mode-indicator"),
  sidebarModeLabel: document.querySelector("#sidebar-mode-label"),
  sidebarModeCopy: document.querySelector("#sidebar-mode-copy"),
  metricStrip: document.querySelector("#metric-strip"),
  heroModeLabel: document.querySelector("#hero-mode-label"),
  heroTempoLabel: document.querySelector("#hero-tempo-label"),
  heroRefreshLabel: document.querySelector("#hero-refresh-label"),
  refreshTime: document.querySelector("#refresh-time"),
  riskTrend: document.querySelector("#risk-trend"),
  riskDistribution: document.querySelector("#risk-distribution"),
  recommendedActions: document.querySelector("#recommended-actions"),
  watchlistList: document.querySelector("#watchlist-list"),
  overviewWatchlistCount: document.querySelector("#overview-watchlist-count"),
  alertsFeed: document.querySelector("#alerts-feed"),
  alertCountLabel: document.querySelector("#alert-count-label"),
  departmentRisk: document.querySelector("#department-risk"),
  triggerBreakdown: document.querySelector("#trigger-breakdown"),
  employeeSearch: document.querySelector("#employee-search"),
  employeeRiskFilter: document.querySelector("#employee-risk-filter"),
  employeeFocusFilter: document.querySelector("#employee-focus-filter"),
  employeeResultCount: document.querySelector("#employee-result-count"),
  employeeTableBody: document.querySelector("#employee-table-body"),
  employeeInspector: document.querySelector("#employee-inspector"),
  activitySearch: document.querySelector("#activity-search"),
  activityTypeFilter: document.querySelector("#activity-type-filter"),
  activitySeverityFilter: document.querySelector("#activity-severity-filter"),
  activityResultCount: document.querySelector("#activity-result-count"),
  activityFeed: document.querySelector("#activity-feed"),
  activityTriggerBreakdown: document.querySelector("#activity-trigger-breakdown"),
  activityDepartmentRisk: document.querySelector("#activity-department-risk"),
  alertsRunbook: document.querySelector("#alerts-runbook"),
  integrationModeLabel: document.querySelector("#integration-mode-label"),
  integrationModeCopy: document.querySelector("#integration-mode-copy"),
  simulationTempoCopy: document.querySelector("#simulation-tempo-copy"),
  modeSimulation: document.querySelector("#mode-simulation"),
  modeReal: document.querySelector("#mode-real"),
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
  studioGuideList: document.querySelector("#studio-guide-list"),
  studioScenarioCards: document.querySelector("#studio-scenario-cards"),
  studioQuickResult: document.querySelector("#studio-quick-result"),
  studioLocalSteps: document.querySelector("#studio-local-steps"),
  studioRemoteSteps: document.querySelector("#studio-remote-steps"),
  studioLocalSnippet: document.querySelector("#studio-local-snippet"),
  studioRemoteSnippet: document.querySelector("#studio-remote-snippet"),
  manualEmployeeSelect: document.querySelector("#manual-employee-select"),
  manualEventTypeSelect: document.querySelector("#manual-event-type-select"),
  manualRepeatInput: document.querySelector("#manual-repeat-input"),
  manualSourceInput: document.querySelector("#manual-source-input"),
  manualContextInput: document.querySelector("#manual-context-input"),
  manualSendButton: document.querySelector("#manual-send-button"),
  manualSendFeedback: document.querySelector("#manual-send-feedback"),
  platformModeSteps: document.querySelector("#platform-mode-steps"),
  platformSystemTips: document.querySelector("#platform-system-tips"),
  ingestSnippet: document.querySelector("#ingest-snippet"),
  ruleList: document.querySelector("#rule-list"),
  riskThresholdLabel: document.querySelector("#risk-threshold-label"),
  adminAuditFeed: document.querySelector("#admin-audit-feed"),
  toastStack: document.querySelector("#toast-stack"),
  navOverviewCount: document.querySelector("#nav-overview-count"),
  navInvestigationsCount: document.querySelector("#nav-investigations-count"),
  navActivityCount: document.querySelector("#nav-activity-count"),
  navOperationsCount: document.querySelector("#nav-operations-count"),
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
  activeView: "overview",
  selectedEmployeeId: null,
  selectedScenarioId: null,
  lastControlResult: null,
  detail: null,
  socket: null,
  refreshTimeout: null,
  pingInterval: null,
  filters: {
    employeeSearch: "",
    employeeRisk: "all",
    employeeFocus: "all",
    activitySearch: "",
    activityType: "all",
    activitySeverity: "all",
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
  window.setTimeout(() => toast.remove(), 4200);
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
  return normalized === "admin" ? "Administrator" : normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function watchlistIds() {
  return new Set((state.overview?.watchlist || []).map((employee) => employee.id));
}

function alertedIds() {
  return new Set((state.overview?.alerts || []).map((alert) => alert.employee_id));
}

function defaultRemoteTarget() {
  return state.systemGuide?.network_targets?.[0]?.url || "http://YOUR-PC-IP:8000";
}

function detectedNetworkTarget() {
  return state.systemGuide?.network_targets?.[0]?.url || null;
}

function updateModeUi(mode) {
  const isSimulation = mode === "simulation";
  const label = isSimulation ? "Simulation" : "Real monitoring";
  const sidebarCopy = isSimulation
    ? "Synthetic telemetry is active with mostly normal workplace behavior and occasional multi-step anomalies."
    : "The sim is paused. SentraGuard is waiting for real ingestion or intentionally forced events in the live pipeline.";
  const integrationCopy = isSimulation
    ? "Use simulation when you want the system to stay alive on its own and surface believable insider-risk stories."
    : "Use real monitoring when you want to prove that outside events, helper scripts, or another machine can change risk in real time.";

  elements.modeSimulation.classList.toggle("is-active", isSimulation);
  elements.modeReal.classList.toggle("is-active", !isSimulation);
  elements.sidebarModeLabel.textContent = `${label} mode`;
  elements.sidebarModeCopy.textContent = sidebarCopy;
  elements.integrationModeLabel.textContent = label;
  elements.integrationModeCopy.textContent = integrationCopy;
  elements.heroModeLabel.textContent = label;
  elements.navOperationsCount.textContent = isSimulation ? "SIM" : "REAL";
}

function updateSimulationTempoUi(tempo) {
  state.simulationTempo = TEMPO_META[tempo] ? tempo : "balanced";
  elements.tempoCalm?.classList.toggle("is-active", state.simulationTempo === "calm");
  elements.tempoBalanced?.classList.toggle("is-active", state.simulationTempo === "balanced");
  elements.tempoDemo?.classList.toggle("is-active", state.simulationTempo === "demo");
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

function buildAlertRunbook() {
  if (!state.overview) {
    return [];
  }

  const actions = [];
  if (state.overview.active_alerts) {
    actions.push(
      `Review ${state.overview.active_alerts} alert${state.overview.active_alerts === 1 ? "" : "s"} and confirm each escalation has a response owner.`
    );
  }
  if (state.rules?.threshold) {
    actions.push(`Treat any employee at or above ${state.rules.threshold} as a potential breach candidate until cleared.`);
  }
  actions.push(...state.overview.recommended_actions);
  return [...new Set(actions)].slice(0, 5);
}

function buildStudioGuide() {
  return [
    "Use Studio when you want a guaranteed story on screen instead of waiting for the simulation to create one naturally.",
    "Choose current mode to keep the scenario aligned with the active platform mode, or force simulation or real when you need a specific demo flow.",
    "Increase repeat to make the story stronger during a short hackathon pitch without touching backend code.",
    "Use credential_stuffing for a fast escalation path and usb_exfiltration when you want a clearer insider-threat narrative.",
  ];
}

function buildStudioLocalSteps() {
  return [
    "Use this command on the same machine when you want a repeatable demo outside the Operations screen.",
    "The local helper targets the exact app host and port you are using right now, so it works for the desktop shell and the browser version.",
    "This is the fastest way to force a scenario during a live walkthrough if you want to keep the UI clean.",
  ];
}

function buildStudioRemoteSteps() {
  const shareTarget = detectedNetworkTarget();
  return [
    "Run Launch SentraGuard Network Demo.bat on the main machine first so SentraGuard listens on 0.0.0.0:8000.",
    "Switch the app to Real monitoring before you send events from another machine so the live pipeline is the active source.",
    shareTarget
      ? `This app already detected a reachable network target. The best current address is ${shareTarget}.`
      : "Replace YOUR-PC-IP in the helper command with the host machine's LAN IP on the same Wi-Fi or wired network.",
  ];
}

function buildPlatformModeSteps() {
  const shareTarget = detectedNetworkTarget();
  return [
    "Open Operations and switch the monitoring mode to Real monitoring before you send outside events.",
    shareTarget
      ? `Another machine can target ${shareTarget}.`
      : state.systemGuide?.share_mode_enabled
        ? "Network sharing is enabled, but no LAN address was detected automatically. Use the host machine's IP address."
        : "If another PC needs to reach this app, start Launch SentraGuard Network Demo.bat on the host machine first.",
    "Use Send SentraGuard Interaction.ps1 for quick presets or the live ingestion console in this app for a one-off real event.",
    "Watch Overview, Activity, and Investigations update immediately after the event lands.",
  ];
}

function buildRefreshTips() {
  return [
    "Use Sync when you want fresh metrics and activity without reloading the whole interface.",
    "Use Reload when you want a full browser or desktop-shell refresh with a cache-busting timestamp.",
    "F5 and Ctrl + R both trigger a full UI reload inside the browser version and the desktop app shell.",
    "Use the desktop app for the cleanest demo flow and the browser version when you need friend-PC network access.",
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
  const repeat = Math.min(Math.max(Number(elements.studioRepeatInput.value || 1), 1), 5);
  const selectedEmployee = state.overview?.employees.find(
    (employee) => String(employee.id) === String(elements.studioEmployeeSelect.value)
  );
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
    `  -Repeat ${repeat} \\`,
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

function updateManualContextPlaceholder() {
  const meta = MANUAL_EVENT_META[elements.manualEventTypeSelect.value] || MANUAL_EVENT_META.login_failed;
  elements.manualContextInput.placeholder = meta.placeholder;
}

function buildManualEventDetails(eventType, context, index) {
  const meta = MANUAL_EVENT_META[eventType] || MANUAL_EVENT_META.login_failed;
  return {
    ...meta.build(context, index),
    emitted_by: "manual-console",
  };
}

function updateNavCounts() {
  if (!state.overview) {
    return;
  }

  const investigationCount = new Set([
    ...state.overview.watchlist.map((employee) => employee.id),
    ...state.overview.alerts.map((alert) => alert.employee_id),
  ]).size;

  elements.navOverviewCount.textContent = String(state.overview.high_risk_employees);
  elements.navInvestigationsCount.textContent = String(investigationCount);
  elements.navActivityCount.textContent = String(state.overview.recent_events);
}

function renderConnectionTargets() {
  if (!state.systemGuide) {
    elements.platformConnectionTargets.innerHTML =
      '<p class="empty-state">Connection targets will appear after the system guide loads.</p>';
    return;
  }

  const targets = [...state.systemGuide.local_targets];
  if (state.systemGuide.network_targets.length) {
    targets.push(...state.systemGuide.network_targets);
  } else if (state.systemGuide.share_mode_enabled) {
    targets.push({
      label: "Network sharing enabled",
      url: "Use your host machine's LAN IP",
      note: "This app is listening for remote traffic, but it could not auto-detect the best LAN address.",
    });
  } else {
    targets.push({
      label: "Friend PC access",
      url: "Run Launch SentraGuard Network Demo.bat",
      note: "Another PC cannot reach this app until the host machine starts the network demo launcher.",
    });
  }

  elements.platformConnectionTargets.innerHTML = targets
    .map((target) => {
      const isUrl = String(target.url).startsWith("http");
      return `
        <article class="connection-card">
          <div class="connection-card__head">
            <div>
              <p class="surface__kicker">${escapeHtml(target.label)}</p>
              <strong class="connection-card__url">${escapeHtml(target.url)}</strong>
            </div>
          </div>
          <p class="connection-note">${escapeHtml(target.note || "")}</p>
          <div class="inline-actions">
            ${
              isUrl
                ? `<button class="button button--subtle button--small" type="button" data-open-url="${escapeHtml(target.url)}">Open</button>`
                : ""
            }
            <button class="button button--subtle button--small" type="button" data-copy-value="${escapeHtml(target.url)}">Copy</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function filteredEmployees() {
  if (!state.overview) {
    return [];
  }

  const watchlist = watchlistIds();
  const alerted = alertedIds();
  const search = state.filters.employeeSearch.trim().toLowerCase();

  return [...state.overview.employees]
    .filter((employee) => {
      const matchesSearch =
        !search ||
        employee.name.toLowerCase().includes(search) ||
        employee.employee_code.toLowerCase().includes(search) ||
        employee.department.toLowerCase().includes(search) ||
        employee.title.toLowerCase().includes(search);
      const matchesRisk =
        state.filters.employeeRisk === "all" || employee.current_risk_level === state.filters.employeeRisk;
      const matchesFocus =
        state.filters.employeeFocus === "all" ||
        (state.filters.employeeFocus === "watchlist" && watchlist.has(employee.id)) ||
        (state.filters.employeeFocus === "alerted" && alerted.has(employee.id)) ||
        (state.filters.employeeFocus === "high" && employee.current_risk_level === "High");

      return matchesSearch && matchesRisk && matchesFocus;
    })
    .sort((left, right) => {
      if (right.current_risk_score !== left.current_risk_score) {
        return right.current_risk_score - left.current_risk_score;
      }
      return left.name.localeCompare(right.name);
    });
}

function filteredActivity() {
  if (!state.overview) {
    return [];
  }

  const query = state.filters.activitySearch.trim().toLowerCase();
  return [...state.overview.activity_feed]
    .filter((item) => {
      const matchesSearch =
        !query ||
        item.employee_name.toLowerCase().includes(query) ||
        item.employee_code.toLowerCase().includes(query) ||
        item.department.toLowerCase().includes(query) ||
        item.source.toLowerCase().includes(query) ||
        item.event_type.toLowerCase().includes(query);
      const matchesType = state.filters.activityType === "all" || item.event_type === state.filters.activityType;
      const matchesSeverity =
        state.filters.activitySeverity === "all" ||
        String(item.severity || "").toLowerCase() === state.filters.activitySeverity;
      return matchesSearch && matchesType && matchesSeverity;
    })
    .sort((left, right) => new Date(right.happened_at) - new Date(left.happened_at));
}

function summarizeActivity(items) {
  const triggerMap = new Map();
  const departmentMap = new Map();

  items.forEach((item) => {
    triggerMap.set(item.event_type, (triggerMap.get(item.event_type) || 0) + 1);

    const departmentEntry = departmentMap.get(item.department) || { value: 0, secondary: 0 };
    departmentEntry.value += 1;
    if (String(item.severity || "").toLowerCase() === "high") {
      departmentEntry.secondary += 1;
    }
    departmentMap.set(item.department, departmentEntry);
  });

  const triggers = [...triggerMap.entries()]
    .map(([label, value]) => ({ label: label.replaceAll("_", " "), value }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 6)
    .map((item) => ({ ...item, label: item.label.replace(/\b\w/g, (character) => character.toUpperCase()) }));

  const departments = [...departmentMap.entries()]
    .map(([label, payload]) => ({
      label,
      value: payload.value,
      secondary: payload.secondary,
      metric_label: `${payload.value} event${payload.value === 1 ? "" : "s"}`,
      meta_label: `${payload.secondary} high-severity event${payload.secondary === 1 ? "" : "s"}`,
    }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 6);

  return { triggers, departments };
}

function renderEmployeeTable() {
  const employees = filteredEmployees();
  renderEmployees(elements.employeeTableBody, employees, state.selectedEmployeeId);
  elements.employeeResultCount.textContent = `${employees.length} result${employees.length === 1 ? "" : "s"}`;
}

function renderActivitySection() {
  const activityItems = filteredActivity();
  const summary = summarizeActivity(activityItems);

  renderActivityFeed(elements.activityFeed, activityItems);
  elements.activityResultCount.textContent = `${activityItems.length} event${activityItems.length === 1 ? "" : "s"}`;
  renderTriggerBreakdown(
    elements.activityTriggerBreakdown,
    summary.triggers.length ? summary.triggers : state.overview?.top_triggers || []
  );
  renderDepartmentRisk(
    elements.activityDepartmentRisk,
    summary.departments.length ? summary.departments : state.overview?.department_risk || []
  );
  renderActions(elements.alertsRunbook, buildAlertRunbook());
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

  if (!visibleEmployees.some((employee) => employee.id === state.selectedEmployeeId)) {
    state.selectedEmployeeId = visibleEmployees[0].id;
  }
}

function populateEmployeeSelect(selectElement, preferredId) {
  if (!state.overview) {
    return;
  }

  const previous = preferredId || selectElement.value;
  selectElement.innerHTML = state.overview.employees
    .slice(0, 80)
    .map(
      (employee) =>
        `<option value="${employee.id}">${employee.employee_code} · ${employee.name} · ${employee.department}</option>`
    )
    .join("");

  if (previous && state.overview.employees.some((employee) => String(employee.id) === String(previous))) {
    selectElement.value = String(previous);
  } else if (state.overview.watchlist[0]) {
    selectElement.value = String(state.overview.watchlist[0].id);
  } else if (state.overview.employees[0]) {
    selectElement.value = String(state.overview.employees[0].id);
  }
}

function populateScenarioSelect() {
  if (!state.controlScenarios.length) {
    return;
  }

  elements.studioScenarioSelect.innerHTML = state.controlScenarios
    .map(
      (scenario) =>
        `<option value="${scenario.id}">${scenario.label} · ${scenario.category} · ${scenario.steps} step${scenario.steps === 1 ? "" : "s"}</option>`
    )
    .join("");

  if (state.selectedScenarioId && state.controlScenarios.some((scenario) => scenario.id === state.selectedScenarioId)) {
    elements.studioScenarioSelect.value = state.selectedScenarioId;
  } else {
    state.selectedScenarioId = state.controlScenarios[0].id;
    elements.studioScenarioSelect.value = state.selectedScenarioId;
  }
}

function populateActivityTypeFilter() {
  if (!state.overview) {
    return;
  }

  const types = [...new Set(state.overview.activity_feed.map((item) => item.event_type))].sort();
  const previous = state.filters.activityType;

  elements.activityTypeFilter.innerHTML = [
    '<option value="all">All events</option>',
    ...types.map((type) => `<option value="${type}">${type.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase())}</option>`),
  ].join("");

  elements.activityTypeFilter.value = types.includes(previous) ? previous : "all";
  state.filters.activityType = elements.activityTypeFilter.value;
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
  renderActions(elements.platformSystemTips, buildRefreshTips());
  renderConnectionTargets();
  buildPlatformIngestSnippet();
}

async function focusEmployee(employeeId) {
  if (!employeeId) {
    return;
  }

  state.filters.employeeSearch = "";
  state.filters.employeeRisk = "all";
  state.filters.employeeFocus = "all";
  elements.employeeSearch.value = "";
  elements.employeeRiskFilter.value = "all";
  elements.employeeFocusFilter.value = "all";
  setView("investigations");
  await loadEmployeeDetail(employeeId);
}

async function runGlobalSearch() {
  const query = elements.globalSearch.value.trim().toLowerCase();
  if (!query) {
    showToast("Search is empty", "Type an employee, scenario, or workspace first.");
    return;
  }

  const employeeMatch = state.overview?.employees.find((employee) => {
    return (
      employee.name.toLowerCase().includes(query) ||
      employee.employee_code.toLowerCase().includes(query) ||
      employee.department.toLowerCase().includes(query) ||
      employee.title.toLowerCase().includes(query)
    );
  });

  if (employeeMatch) {
    state.filters.employeeSearch = elements.globalSearch.value.trim();
    elements.employeeSearch.value = elements.globalSearch.value.trim();
    state.filters.employeeRisk = "all";
    state.filters.employeeFocus = "all";
    elements.employeeRiskFilter.value = "all";
    elements.employeeFocusFilter.value = "all";
    setView("investigations");
    renderEmployeeTable();
    await loadEmployeeDetail(employeeMatch.id, { skipTableRender: false });
    showToast("Employee found", `${employeeMatch.name} is ready in Investigations.`);
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
    renderStudio();
    showToast("Scenario selected", `${scenarioMatch.label} is ready in Operations.`);
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

  showToast("No match found", "Try an employee code, a scenario like usb_exfiltration, or a workspace name.", "alert");
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
  renderPlatformGuides();
}

async function loadControlScenarios() {
  state.controlScenarios = await api.controlScenarios();
  populateScenarioSelect();
  renderStudio();
}

async function loadOverview() {
  state.overview = await api.overview();

  renderMetrics(elements.metricStrip, state.overview);
  renderTrend(elements.riskTrend, state.overview.risk_trend);
  renderRiskDistribution(elements.riskDistribution, state.overview.risk_distribution);
  renderActions(elements.recommendedActions, state.overview.recommended_actions);
  renderWatchlist(elements.watchlistList, state.overview.watchlist);
  renderAlertsFeed(elements.alertsFeed, state.overview.alerts.slice(0, 4));
  renderDepartmentRisk(elements.departmentRisk, state.overview.department_risk);
  renderTriggerBreakdown(elements.triggerBreakdown, state.overview.top_triggers);

  elements.overviewWatchlistCount.textContent = `${state.overview.watchlist.length} user${state.overview.watchlist.length === 1 ? "" : "s"}`;
  elements.alertCountLabel.textContent = `${state.overview.alerts.length} alert${state.overview.alerts.length === 1 ? "" : "s"}`;
  elements.refreshTime.textContent = `Updated ${formatRelativeTime(state.overview.refreshed_at)}`;
  elements.heroRefreshLabel.textContent = formatRelativeTime(state.overview.refreshed_at);

  updateModeUi(state.overview.system_mode);
  updateNavCounts();
  populateActivityTypeFilter();
  populateEmployeeSelect(elements.studioEmployeeSelect, elements.studioEmployeeSelect.value);
  populateEmployeeSelect(elements.manualEmployeeSelect, elements.manualEmployeeSelect.value);
  renderStudio();
  renderPlatformGuides();
  renderActivitySection();

  setStatus(
    `${state.overview.high_risk_employees} high-risk employees · ${state.overview.recent_events} recent signals · ${state.overview.watchlist.length} in review`
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
      repeat: Math.min(Math.max(Number(elements.studioRepeatInput.value || 1), 1), 5),
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

async function emitManualEvent() {
  if (!state.overview) {
    return;
  }

  const selectedEmployee = state.overview.employees.find(
    (employee) => String(employee.id) === String(elements.manualEmployeeSelect.value)
  );
  if (!selectedEmployee) {
    showToast("Employee missing", "Choose an employee before sending an event.", "alert");
    return;
  }

  const eventType = elements.manualEventTypeSelect.value;
  const source = elements.manualSourceInput.value.trim() || "manual-console";
  const context = elements.manualContextInput.value.trim();
  const repeat = Math.min(Math.max(Number(elements.manualRepeatInput.value || 1), 1), 5);

  const events = Array.from({ length: repeat }, (_, index) => ({
    employee_code: selectedEmployee.employee_code,
    employee_name: selectedEmployee.name,
    department: selectedEmployee.department,
    title: selectedEmployee.title,
    event_type: eventType,
    source,
    details: buildManualEventDetails(eventType, context, index),
  }));

  elements.manualSendButton.disabled = true;
  elements.manualSendFeedback.textContent = "Sending live ingestion payload...";

  try {
    const response = await api.ingestEvents({ events });
    elements.manualSendFeedback.textContent = `${response.accepted} event${response.accepted === 1 ? "" : "s"} accepted for ${selectedEmployee.employee_code}.`;
    showToast("Live event accepted", `${response.accepted} real-mode event${response.accepted === 1 ? "" : "s"} processed.`);
    if (state.overview.system_mode !== "real") {
      showToast("Tip", "Switch the platform to Real monitoring if you want live ingestion to be the active source.");
    }
    await refreshDashboard();
  } catch (error) {
    elements.manualSendFeedback.textContent = error.message || "Live ingestion failed";
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

    if (message.type === "system.mode_changed" || message.type === "system.connected" || message.type === "system.tempo_changed") {
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
  renderPlatformGuides();
  updateManualContextPlaceholder();
  elements.manualSourceInput.value = elements.manualSourceInput.value || "local-console";
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
    setView(item.dataset.view || "overview");
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

elements.tempoCalm?.addEventListener("click", async () => {
  try {
    await changeSimulationTempo("calm");
  } catch (error) {
    handleUnauthorized(error);
  }
});

elements.tempoBalanced?.addEventListener("click", async () => {
  try {
    await changeSimulationTempo("balanced");
  } catch (error) {
    handleUnauthorized(error);
  }
});

elements.tempoDemo?.addEventListener("click", async () => {
  try {
    await changeSimulationTempo("demo");
  } catch (error) {
    handleUnauthorized(error);
  }
});

elements.employeeSearch.addEventListener("input", async (event) => {
  state.filters.employeeSearch = event.target.value;
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
  state.filters.employeeRisk = event.target.value;
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

elements.employeeFocusFilter.addEventListener("change", async (event) => {
  state.filters.employeeFocus = event.target.value;
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

elements.activitySearch.addEventListener("input", (event) => {
  state.filters.activitySearch = event.target.value;
  renderActivitySection();
});

elements.activityTypeFilter.addEventListener("change", (event) => {
  state.filters.activityType = event.target.value;
  renderActivitySection();
});

elements.activitySeverityFilter.addEventListener("change", (event) => {
  state.filters.activitySeverity = event.target.value;
  renderActivitySection();
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

elements.studioRepeatInput.addEventListener("input", () => {
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

elements.manualEventTypeSelect.addEventListener("change", () => {
  updateManualContextPlaceholder();
});

elements.manualSendButton.addEventListener("click", () => {
  emitManualEvent().catch(handleUnauthorized);
});

window.addEventListener("load", async () => {
  updateOperatorUi();
  renderPlatformGuides();
  updateManualContextPlaceholder();
  setView("overview");
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
