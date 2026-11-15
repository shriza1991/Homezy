// Resolve backend API URL from environment variable or default to local backend
const getBaseApiUrl = () => {
  const envUrl = typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL;
  return (envUrl || "http://localhost:5000/api").replace(/\/+$/, "");
};

export const API_URL = getBaseApiUrl();

/**
 * Perform authentication requests (login, register)
 * @param {'login' | 'register'} action
 * @param {Record<string, unknown>} payload
 */
export async function authRequest(action, payload) {
  let response;
  try {
    response = await fetch(`${API_URL}/auth/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("Unable to connect to the server");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || "Authentication request failed");
  if (!data) throw new Error("The server returned an invalid response");
  return data;
}

/**
 * Health check helper to verify backend connectivity
 */
export async function checkServerHealth() {
  try {
    const rootUrl = API_URL.endsWith("/api") ? API_URL.slice(0, -4) : API_URL;
    const response = await fetch(`${rootUrl}/api/health`);
    if (!response.ok) {
      return { ok: false, status: response.status, data: null };
    }
    const data = await response.json();
    return { ok: true, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 0, error: error.message };
  }
}
