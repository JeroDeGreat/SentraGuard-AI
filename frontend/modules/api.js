const TOKEN_KEY = "sentraguard-admin-token";

export const DEFAULT_ADMIN = {
  email: "admin@sentraguard.local",
  password: "ChangeMe123!",
};

export function getToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = "GET", body, token = getToken() } = {}) {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let detail = "Request failed";
    try {
      const payload = await response.json();
      detail = payload.detail || detail;
    } catch {
      detail = response.statusText || detail;
    }
    const error = new Error(detail);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }
  return response.json();
}

export const api = {
  login(credentials) {
    return request("/api/v1/auth/login", { method: "POST", body: credentials, token: null });
  },
  me() {
    return request("/api/v1/auth/me");
  },
  overview() {
    return request("/api/v1/overview");
  },
  employee(employeeId) {
    return request(`/api/v1/employees/${employeeId}`);
  },
  rules() {
    return request("/api/v1/rules");
  },
  audit() {
    return request("/api/v1/system/audit");
  },
  setMode(mode) {
    return request("/api/v1/system/mode", { method: "POST", body: { mode } });
  },
};
