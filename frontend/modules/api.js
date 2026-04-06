const API_ROOT = "/api/v1";

function buildHeaders(token, extraHeaders = {}) {
  const headers = {
    Accept: "application/json",
    ...extraHeaders,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function request(path, options = {}) {
  const {
    method = "GET",
    token = "",
    body = undefined,
    headers = {},
  } = options;

  const init = {
    method,
    headers: buildHeaders(token, headers),
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_ROOT}${path}`, init);
  if (!response.ok) {
    let message = "Request failed";
    try {
      const payload = await response.json();
      message = payload.detail || payload.message || message;
    } catch (error) {
      message = response.statusText || message;
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export function login(email, password) {
  return request("/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export function getMe(token) {
  return request("/auth/me", { token });
}

export function getOverview(token) {
  return request("/overview", { token });
}

export function getEmployeeDetail(token, employeeId) {
  return request(`/employees/${employeeId}`, { token });
}

export function getRules(token) {
  return request("/rules", { token });
}

export function getGuide(token) {
  return request("/system/guide", { token });
}

export function getMode(token) {
  return request("/system/mode", { token });
}

export function setMode(token, mode) {
  return request("/system/mode", {
    method: "POST",
    token,
    body: { mode },
  });
}

export function getTempo(token) {
  return request("/system/tempo", { token });
}

export function setTempo(token, tempo) {
  return request("/system/tempo", {
    method: "POST",
    token,
    body: { tempo },
  });
}

export function getAudit(token) {
  return request("/system/audit", { token });
}

export function resetSystem(token) {
  return request("/system/reset", {
    method: "POST",
    token,
  });
}

export function getScenarios(token) {
  return request("/control/scenarios", { token });
}

export function emitScenario(token, payload) {
  return request("/control/emit", {
    method: "POST",
    token,
    body: payload,
  });
}

export function connectLive(onMessage) {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const socket = new WebSocket(`${protocol}//${window.location.host}/ws/live`);
  let pingTimer = null;

  socket.addEventListener("open", () => {
    pingTimer = window.setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send("ping");
      }
    }, 15000);
  });

  socket.addEventListener("message", (event) => {
    try {
      const payload = JSON.parse(event.data);
      onMessage(payload);
    } catch (error) {
      console.warn("Invalid websocket payload", error);
    }
  });

  function close() {
    if (pingTimer) {
      window.clearInterval(pingTimer);
      pingTimer = null;
    }
    socket.close();
  }

  socket.addEventListener("close", () => {
    if (pingTimer) {
      window.clearInterval(pingTimer);
      pingTimer = null;
    }
  });

  return { socket, close };
}
