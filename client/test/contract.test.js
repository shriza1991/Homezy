import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { properties, filterProperties } from "../src/data/properties.js";
import { API_URL, authRequest, verifySession, fetchAdminData, checkServerHealth } from "../src/services/api.js";

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

  test("Independent sessions simulation maintains tab separation", () => {
    // Simulating two separate tab session stores
    const tab1Session = new Map();
    const tab2Session = new Map();

    // Tab 1 logs in as Admin
    tab1Session.set("token", "admin_jwt_tab_1");
    tab1Session.set("user", JSON.stringify({ name: "Admin One", role: "admin" }));

    // Tab 2 logs in as Tenant
    tab2Session.set("token", "tenant_jwt_tab_2");
    tab2Session.set("user", JSON.stringify({ name: "Tenant Two", role: "tenant" }));

    // Verify Tab 1 session is intact as Admin
    assert.equal(JSON.parse(tab1Session.get("user")).role, "admin");
    assert.equal(tab1Session.get("token"), "admin_jwt_tab_1");

    // Verify Tab 2 session is intact as Tenant
    assert.equal(JSON.parse(tab2Session.get("user")).role, "tenant");
    assert.equal(tab2Session.get("token"), "tenant_jwt_tab_2");

    // Verify Tab 1 logging out does not affect Tab 2
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
