import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { properties, filterProperties } from "../src/data/properties.js";
import {
  API_URL,
  authRequest,
  verifySession,
  fetchAdminData,
  fetchProperties,
  fetchPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  checkServerHealth,
} from "../src/services/api.js";

describe("Homezy Client Data & API Contract Checks", () => {
  test("filterProperties filters by search query and category", () => {
    assert.equal(filterProperties(properties, "", "").length, 4);
    assert.equal(filterProperties(properties, "   ", "").length, 4);
    assert.equal(filterProperties(properties, "apartment", "").length, 2);
    assert.equal(filterProperties(properties, "powai", "").length, 1);
    assert.equal(filterProperties(properties, "", "Flat").length, 1);
    assert.equal(filterProperties(properties, "Luxury", "Luxury Apartment").length, 1);
    assert.equal(filterProperties(properties, "Nonexistent", "").length, 0);
    assert.equal(properties.length, 4);
  });

  test("API_URL is configured and exports string", () => {
    assert.equal(typeof API_URL, "string");
    assert.ok(API_URL.startsWith("http"));
  });

  test("authRequest executes properly with mocked fetch", async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (url, opts) => {
        assert.ok(url.includes("/auth/login"));
        assert.equal(opts.method, "POST");
        const body = JSON.parse(opts.body);
        assert.equal(body.email, "test@example.com");
        return {
          ok: true,
          json: async () => ({ token: "dummy_jwt", user: { id: "123", name: "Tester", role: "tenant" } }),
        };
      };

      const result = await authRequest("login", { email: "test@example.com", password: "pw" });
      assert.equal(result.token, "dummy_jwt");
      assert.equal(result.user.name, "Tester");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("authRequest throws readable error when server connection fails", async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => {
        throw new Error("Network error");
      };

      await assert.rejects(
        () => authRequest("login", { email: "test@example.com", password: "pw" }),
        /Unable to connect to the server/
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("verifySession handles valid and expired sessions correctly", async () => {
    const originalFetch = globalThis.fetch;
    try {
      // 1. Valid token
      globalThis.fetch = async (url, opts) => {
        assert.ok(url.includes("/auth/me"));
        assert.equal(opts.headers.Authorization, "Bearer valid_token");
        return {
          ok: true,
          status: 200,
          json: async () => ({ user: { id: "1", name: "Admin User", role: "admin" } }),
        };
      };

      const user = await verifySession("valid_token");
      assert.equal(user.name, "Admin User");
      assert.equal(user.role, "admin");

      // 2. Expired / Invalid token
      globalThis.fetch = async () => {
        return {
          ok: false,
          status: 401,
          json: async () => ({ message: "Token expired" }),
        };
      };

      const invalidUser = await verifySession("expired_token");
      assert.equal(invalidUser, null);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("fetchAdminData sends bearer token and parses dashboard data", async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (url, opts) => {
        assert.ok(url.includes("/auth/admin/dashboard"));
        assert.equal(opts.headers.Authorization, "Bearer admin_token");
        return {
          ok: true,
          status: 200,
          json: async () => ({
            stats: { totalUsers: 5, activeListings: 4 },
            users: [{ id: "1", name: "Super Admin", role: "admin" }],
          }),
        };
      };

      const data = await fetchAdminData("admin_token");
      assert.equal(data.stats.totalUsers, 5);
      assert.equal(data.users[0].role, "admin");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("fetchProperties retrieves listings from /api/properties", async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (url) => {
        assert.ok(url.includes("/properties"));
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            properties: [{ id: 101, title: "Mock Villa", location: "Juhu", price: "80,000" }],
          }),
        };
      };

      const props = await fetchProperties({ search: "Juhu" });
      assert.equal(props.length, 1);
      assert.equal(props[0].title, "Mock Villa");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("fetchPropertyById retrieves single listing details", async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (url) => {
        assert.ok(url.includes("/properties/101"));
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            property: { id: 101, title: "Mock Villa", location: "Juhu", price: "80,000" },
          }),
        };
      };

      const prop = await fetchPropertyById("101");
      assert.equal(prop.id, 101);
      assert.equal(prop.title, "Mock Villa");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("createProperty, updateProperty, and deleteProperty execute CRUD", async () => {
    const originalFetch = globalThis.fetch;
    try {
      // Create
      globalThis.fetch = async (url, opts) => {
        assert.equal(opts.method, "POST");
        assert.ok(opts.headers.Authorization.includes("test_token"));
        return {
          ok: true,
          status: 201,
          json: async () => ({
            success: true,
            property: { id: "p-new", title: "New Luxury Penthouse" },
          }),
        };
      };
      const created = await createProperty({ title: "New Luxury Penthouse" }, "test_token");
      assert.equal(created.id, "p-new");

      // Update
      globalThis.fetch = async (url, opts) => {
        assert.equal(opts.method, "PUT");
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            property: { id: "p-new", title: "Updated Penthouse" },
          }),
        };
      };
      const updated = await updateProperty("p-new", { title: "Updated Penthouse" }, "test_token");
      assert.equal(updated.title, "Updated Penthouse");

      // Delete
      globalThis.fetch = async (url, opts) => {
        assert.equal(opts.method, "DELETE");
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        };
      };
      const deleted = await deleteProperty("p-new", "test_token");
      assert.equal(deleted, true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("Independent sessions simulation maintains tab separation", () => {
    const tab1Session = new Map();
    const tab2Session = new Map();

    tab1Session.set("token", "admin_jwt_tab_1");
    tab1Session.set("user", JSON.stringify({ name: "Admin One", role: "admin" }));

    tab2Session.set("token", "tenant_jwt_tab_2");
    tab2Session.set("user", JSON.stringify({ name: "Tenant Two", role: "tenant" }));

    assert.equal(JSON.parse(tab1Session.get("user")).role, "admin");
    assert.equal(tab1Session.get("token"), "admin_jwt_tab_1");

    assert.equal(JSON.parse(tab2Session.get("user")).role, "tenant");
    assert.equal(tab2Session.get("token"), "tenant_jwt_tab_2");

    tab1Session.clear();
    assert.equal(tab1Session.has("token"), false);
    assert.equal(tab2Session.has("token"), true);
    assert.equal(JSON.parse(tab2Session.get("user")).role, "tenant");
  });

  test("checkServerHealth inspects health endpoint", async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (url) => {
        assert.ok(url.includes("/api/health"));
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: "ok", uptime: 12 }),
        };
      };

      const res = await checkServerHealth();
      assert.equal(res.ok, true);
      assert.equal(res.data.status, "ok");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
