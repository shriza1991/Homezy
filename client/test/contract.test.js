import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { properties, filterProperties } from "../src/data/properties.js";
import { API_URL, authRequest, checkServerHealth } from "../src/services/api.js";

describe("Homezy Client Data & API Contract Checks", () => {
  test("filterProperties filters by search query and category", () => {
    // 1. Empty filter returns all
    assert.equal(filterProperties(properties, "", "").length, 4);

    // 2. Whitespace trimming
    assert.equal(filterProperties(properties, "   ", "").length, 4);

    // 3. Case insensitive title
    assert.equal(filterProperties(properties, "apartment", "").length, 2);

    // 4. Case insensitive location
    assert.equal(filterProperties(properties, "powai", "").length, 1);

    // 5. Category filter
    assert.equal(filterProperties(properties, "", "Flat").length, 1);

    // 6. Combined category and title
    assert.equal(filterProperties(properties, "Luxury", "Luxury Apartment").length, 1);

    // 7. No match
    assert.equal(filterProperties(properties, "Nonexistent", "").length, 0);

    // 8. Immutability: original list unchanged
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
          json: async () => ({ token: "dummy_jwt", user: { id: "123", name: "Tester" } }),
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
