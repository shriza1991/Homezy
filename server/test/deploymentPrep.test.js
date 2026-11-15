const { test, describe, before, after, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");
const { app } = require("../server");
const { getJwtSecret } = require("../config/jwt");

describe("Homezy Deployment Preparation & Hardening Tests", () => {
  let server;
  let baseUrl;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalJwtSecret = process.env.JWT_SECRET;

  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.JWT_SECRET = originalJwtSecret;
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  describe("Requirement 1: Reject public registration with role admin", () => {
    test("POST /api/auth/register rejects role 'admin' with 403 Forbidden", async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Attempted Admin",
          email: `admin-attempt-${Date.now()}@example.com`,
          phone: "9123456780",
          role: "admin",
          password: "password123",
        }),
      });

      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.message, /registration with role 'admin' is not permitted/i);
    });

    test("POST /api/auth/register rejects case-variant 'Admin ' with 403 Forbidden", async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Sneaky Admin",
          email: `sneaky-admin-${Date.now()}@example.com`,
          phone: "9123456781",
          role: "Admin ",
          password: "password123",
        }),
      });

      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.message, /registration with role 'admin' is not permitted/i);
    });

    test("POST /api/auth/register accepts valid 'tenant' registration with 201 Created", async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Legit Tenant",
          email: `valid-tenant-${Date.now()}@example.com`,
          phone: "9123456782",
          role: "tenant",
          password: "password123",
        }),
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.user.role, "tenant");
    });

    test("POST /api/auth/register accepts valid 'owner' registration with 201 Created", async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Legit Owner",
          email: `valid-owner-${Date.now()}@example.com`,
          phone: "9123456783",
          role: "owner",
          password: "password123",
        }),
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.user.role, "owner");
    });
  });

  describe("Requirement 2: Disable demo and seeding endpoints in production", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "production";
    });

    afterEach(() => {
      process.env.NODE_ENV = "test";
    });

    test("POST /api/demo/seed is blocked with 403 in production", async () => {
      const res = await fetch(`${baseUrl}/api/demo/seed`, { method: "POST" });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.message, /endpoint disabled in production/i);
    });

    test("POST /api/demo/reset is blocked with 403 in production", async () => {
      const res = await fetch(`${baseUrl}/api/demo/reset`, { method: "POST" });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.message, /endpoint disabled in production/i);
    });

    test("GET /api/demo/status is blocked with 403 in production", async () => {
      const res = await fetch(`${baseUrl}/api/demo/status`);
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.message, /endpoint disabled in production/i);
    });

    test("GET /api/demo/accounts is blocked with 403 in production", async () => {
      const res = await fetch(`${baseUrl}/api/demo/accounts`);
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.message, /endpoint disabled in production/i);
    });

    test("POST /api/seed is blocked with 403 in production", async () => {
      const res = await fetch(`${baseUrl}/api/seed`, { method: "POST" });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.message, /endpoint disabled in production/i);
    });

    test("POST /api/properties/seed is blocked with 403 in production", async () => {
      const res = await fetch(`${baseUrl}/api/properties/seed`, { method: "POST" });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.message, /endpoint disabled in production/i);
    });
  });

  describe("Requirement 3: Strict JWT_SECRET requirement in production", () => {
    test("Throws error in production when JWT_SECRET is unset", () => {
      process.env.NODE_ENV = "production";
      delete process.env.JWT_SECRET;

      assert.throws(
        () => getJwtSecret(),
        /JWT_SECRET environment variable is strictly required in production mode/
      );
    });

    test("Throws error in production when JWT_SECRET is the development fallback string", () => {
      process.env.NODE_ENV = "production";
      process.env.JWT_SECRET = "homezy_development_secret_key";

      assert.throws(
        () => getJwtSecret(),
        /JWT_SECRET environment variable is strictly required in production mode/
      );
    });

    test("Throws error in production when JWT_SECRET is whitespace only", () => {
      process.env.NODE_ENV = "production";
      process.env.JWT_SECRET = "   ";

      assert.throws(
        () => getJwtSecret(),
        /JWT_SECRET environment variable is strictly required in production mode/
      );
    });

    test("Returns the configured secret in production when valid", () => {
      process.env.NODE_ENV = "production";
      process.env.JWT_SECRET = "a-very-secure-random-production-secret-987654";

      const secret = getJwtSecret();
      assert.equal(secret, "a-very-secure-random-production-secret-987654");
    });

    test("Permits fallback secret in development / test environments", () => {
      process.env.NODE_ENV = "development";
      delete process.env.JWT_SECRET;

      const secret = getJwtSecret();
      assert.equal(secret, "homezy_development_secret_key");
    });
  });

  describe("Requirement 4: client/vercel.json SPA rewrite validation", () => {
    test("client/vercel.json exists and defines SPA rewrites to /index.html", () => {
      const vercelJsonPath = path.join(__dirname, "../../client/vercel.json");
      assert.ok(fs.existsSync(vercelJsonPath), "client/vercel.json must exist");

      const raw = fs.readFileSync(vercelJsonPath, "utf-8");
      const config = JSON.parse(raw);

      assert.ok(Array.isArray(config.rewrites), "rewrites must be an array");
      const spaRewrite = config.rewrites.find(
        (r) => r.source === "/(.*)" && r.destination === "/index.html"
      );
      assert.ok(spaRewrite, "Must contain rewrite rule source '/(.*)' -> destination '/index.html'");
    });
  });

  describe("Requirement 5: CORS and PORT verification", () => {
    test("Backend health check responds cleanly", async () => {
      const res = await fetch(`${baseUrl}/health`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.status);
    });

    test("Root route returns API status JSON", async () => {
      const res = await fetch(`${baseUrl}/`, {
        headers: { Accept: "application/json" },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.message, "Homezy API is running");
      assert.equal(data.version, "1.0.0");
    });

    test("POST /api/auth/login succeeds with demo credentials", async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@homezy.com",
          password: "password123",
        }),
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.token);
      assert.equal(data.user.role, "admin");
    });

    test("POST /auth/login (root alias without /api) succeeds with demo credentials", async () => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@homezy.com",
          password: "password123",
        }),
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.token);
      assert.equal(data.user.role, "admin");
    });

    test("GET /properties (root alias without /api) returns property listings", async () => {
      const res = await fetch(`${baseUrl}/properties`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data.properties));
    });
  });
});
