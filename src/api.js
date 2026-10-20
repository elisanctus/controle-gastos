const API = import.meta.env.VITE_API_URL || "";

export const getToken = () => localStorage.getItem("jwt") || "";
export const setToken = (t) => t ? localStorage.setItem("jwt", t) : localStorage.removeItem("jwt");

async function req(path, opts = {}) {
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...opts, headers });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  health: () => req("/api/health"),
  register: (email, password, name) => req("/api/auth/register", { method: "POST", body: JSON.stringify({ email, password, name }) }),
  login: (email, password) => req("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => req("/api/me"),
  listTx: () => req("/api/transactions"),
  createTx: (body) => req("/api/transactions", { method: "POST", body: JSON.stringify(body) }),
  deleteTx: (id) => req(`/api/transactions/${id}`, { method: "DELETE" }),
};
