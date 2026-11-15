const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { app } = require("../server");

describe("Homezy API Health & Startup Checks", () => {
  let server;
  let baseUrl;

  before(async () => {
    // Start server on an ephemeral port (port 0)
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

  test("GET / returns root API welcome and version info", async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.message, "Homezy API is running");
    assert.equal(data.version, "1.0.0");
    assert.ok(data.environment);
  });

  test("GET /health returns health check structure", async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(["ok", "degraded"].includes(data.status));
    assert.equal(typeof data.uptime, "number");
    assert.ok(data.timestamp);
    assert.ok(data.database);
    assert.ok(typeof data.database.readyState === "number");
    assert.ok(data.database.status);
  });

  test("GET /api/health returns identical health structure to /health", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(["ok", "degraded"].includes(data.status));
    assert.ok(data.database);
  });

  test("GET /api/health/live returns liveness status 200", async () => {
    const res = await fetch(`${baseUrl}/api/health/live`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.live, true);
    assert.equal(typeof data.uptime, "number");
  });

  test("GET /api/health/ready returns status based on DB readiness", async () => {
    const res = await fetch(`${baseUrl}/api/health/ready`);
    const data = await res.json();
    if (data.ready) {
      assert.equal(res.status, 200);
      assert.equal(data.database.readyState, 1);
    } else {
      assert.equal(res.status, 503);
      assert.notEqual(data.database.readyState, 1);
    }
  });

  test("GET /api/nonexistent returns 404 with error message", async () => {
    const res = await fetch(`${baseUrl}/api/nonexistent`);
    assert.equal(res.status, 404);
    const data = await res.json();
    assert.match(data.message, /Not Found/);
  });

  test("POST /api/auth/login returns 503 if database is disconnected", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com", password: "password123" }),
    });
    // In disconnected state, returns 503 instead of hanging or 500
    // If DB is connected, it would return 401
    assert.ok([401, 503].includes(res.status));
  });

  test("CORS headers are returned on preflight request", async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:5173",
        "Access-Control-Request-Method": "GET",
      },
    });
    // Preflight returns 204 or 200
    assert.ok([200, 204].includes(res.status));
    assert.equal(res.headers.get("access-control-allow-origin"), "http://localhost:5173");
  });
});
