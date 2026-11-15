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
 * Verify JWT session token with the backend (Verified Session Restoration)
 * @param {string} token
 * @returns {Promise<{id: string, name: string, email: string, role: string} | null>}
 */
export async function verifySession(token) {
  if (!token) return null;
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 401 || response.status === 403) {
      return null;
    }

    if (!response.ok) {
      return null;
    }

    const data = await response.json().catch(() => null);
    return data?.user || null;
  } catch {
    return null;
  }
}

/**
 * Fetch admin-authorized dashboard data
 * @param {string} token
 */
export async function fetchAdminData(token) {
  if (!token) throw new Error("Authentication token required");
  const response = await fetch(`${API_URL}/auth/admin/dashboard`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || `Admin request failed with status ${response.status}`);
  }
  return data;
}

/**
 * Fetch properties from MongoDB backend with search and category filters
 * @param {Object} [params]
 * @param {string} [params.search]
 * @param {string} [params.type]
 * @param {string} [params.status]
 */
export async function fetchProperties(params = {}) {
  const query = new URLSearchParams();
  if (params.search && params.search.trim()) query.append("search", params.search.trim());
  if (params.type && params.type.trim()) query.append("type", params.type.trim());
  if (params.status && params.status.trim()) query.append("status", params.status.trim());

  const queryString = query.toString();
  const url = `${API_URL}/properties${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url);
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || "Failed to fetch properties from server");
  }
  return data?.properties || [];
}

/**
 * Fetch single property details by ID
 * @param {string} id
 */
export async function fetchPropertyById(id) {
  if (!id) return null;
  const response = await fetch(`${API_URL}/properties/${id}`);
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    return null;
  }
  return data?.property || null;
}

/**
 * Create a new property listing (Owners & Admins)
 * @param {Object} payload
 * @param {string} token
 */
export async function createProperty(payload, token) {
  if (!token) throw new Error("Authentication token required");
  const response = await fetch(`${API_URL}/properties`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || "Failed to create property listing");
  }
  return data?.property;
}

/**
 * Update an existing property listing
 * @param {string} id
 * @param {Object} payload
 * @param {string} token
 */
export async function updateProperty(id, payload, token) {
  if (!token) throw new Error("Authentication token required");
  const response = await fetch(`${API_URL}/properties/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || "Failed to update property listing");
  }
  return data?.property;
}

/**
 * Delete a property listing
 * @param {string} id
 * @param {string} token
 */
export async function deleteProperty(id, token) {
  if (!token) throw new Error("Authentication token required");
  const response = await fetch(`${API_URL}/properties/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || "Failed to delete property listing");
  }
  return true;
}

/**
 * Submit persistent rental request (Tenants)
 * @param {Object} payload
 * @param {string} token
 */
export async function createRentalRequest(payload, token) {
  if (!token) throw new Error("Please log in to submit a rental application");
  const response = await fetch(`${API_URL}/rental-requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || `Failed to submit request (HTTP ${response.status})`);
  }
  return data?.request;
}

/**
 * Fetch authenticated tenant's personal application history
 * @param {string} token
 */
export async function fetchMyRentalRequests(token) {
  if (!token) return [];
  const response = await fetch(`${API_URL}/rental-requests/my`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || "Failed to fetch rental request history");
  }
  return data?.requests || [];
}

/**
 * Fetch all rental requests across the platform (Admin only)
 * @param {string} token
 * @param {string} [status]
 */
export async function fetchAllRentalRequests(token, status) {
  if (!token) throw new Error("Authentication token required");
  const query = status && status !== "all" ? `?status=${encodeURIComponent(status)}` : "";
  const response = await fetch(`${API_URL}/rental-requests${query}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || "Failed to fetch platform rental requests");
  }
  return data?.requests || [];
}

/**
 * Update rental request status: Approve or Reject (Admin only)
 * @param {string} id
 * @param {"Approved" | "Rejected" | "Pending"} status
 * @param {string} token
 * @param {string} [adminNotes]
 */
export async function updateRentalRequestStatus(id, status, token, adminNotes) {
  if (!token) throw new Error("Authentication token required");
  const response = await fetch(`${API_URL}/rental-requests/${id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status, adminNotes }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || "Failed to update request status");
  }
  return data?.request;
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
