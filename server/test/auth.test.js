const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { app } = require("../server");

describe("Homezy JWT Authentication & Authorization Tests", () => {
  let server;
  let baseUrl;
  const jwtSecret = process.env.JWT_SECRET || "homezy_development_secret_key";

  const adminToken = jwt.sign(
    { id: "admin123", role: "admin", name: "Super Admin", email: "admin@homezy.com" },
    jwtSecret,
    { expiresIn: "1h" }
  );

  const tenantToken = jwt.sign(
    { id: "tenant456", role: "tenant", name: "John Tenant", email: "tenant@homezy.com" },
    jwtSecret,
    { expiresIn: "1h" }
  );

  const expiredToken = jwt.sign(
    { id: "user789", role: "tenant", name: "Old User", email: "old@homezy.com" },
    jwtSecret,
    { expiresIn: "-1s" }
  );

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
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test("GET /api/auth/me rejects requests without token with 401", async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`);
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.match(data.message, /no token provided/i);
  });

  test("GET /api/auth/me rejects expired token with 401", async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.match(data.message, /expired/i);
  });

  test("GET /api/auth/me rejects malformed token with 401", async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: "Bearer definitely-not-a-valid-jwt" },
    });
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.match(data.message, /invalid token/i);
  });

  test("GET /api/auth/me verifies valid JWT token and restores session", async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.message, "Session verified");
    assert.equal(data.user.id, "admin123");
    assert.equal(data.user.role, "admin");
    assert.equal(data.user.name, "Super Admin");
  });

  test("GET /api/auth/admin/dashboard blocks tenant with 403 Forbidden", async () => {
    const res = await fetch(`${baseUrl}/api/auth/admin/dashboard`, {
      headers: { Authorization: `Bearer ${tenantToken}` },
    });
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.match(data.message, /not authorized/i);
  });

  test("GET /api/auth/admin/dashboard permits admin with 200 OK", async () => {
    const res = await fetch(`${baseUrl}/api/auth/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.stats);
    assert.ok(Array.isArray(data.users));
  });

  test("POST /api/auth/register validates required fields", async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Incomplete User" }),
    });
    // In disconnected mode, returns 503 or 400 validation error
    assert.ok([400, 503].includes(res.status));
  });

  test("POST /api/auth/register rejects public registration with role admin (403)", async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Malicious Admin Wannabe",
        email: "hacker@example.com",
        phone: "9998887776",
        role: "admin",
        password: "secretpassword123",
      }),
    });
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.match(data.message, /role 'admin' is not permitted/i);
  });

  test("POST /api/auth/login validates required email/password", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "" }),
    });
    assert.ok([400, 503].includes(res.status));
  });
});
