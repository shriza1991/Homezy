const API_URL = "http://localhost:5000/api";

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
