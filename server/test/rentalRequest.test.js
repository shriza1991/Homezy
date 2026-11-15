const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { app } = require("../server");

describe("Homezy Rental Requests, History & Access Validation Tests", () => {
  let server;
  let baseUrl;
  const jwtSecret = process.env.JWT_SECRET || "homezy_development_secret_key";

  const adminToken = jwt.sign(
    { id: "admin888", role: "admin", name: "Admin Reviewer", email: "admin@homezy.com" },
    jwtSecret,
    { expiresIn: "1h" }
  );

  const tenantTokenA = jwt.sign(
    { id: "tenantAAA", role: "tenant", name: "Tenant Alice", email: "alice@homezy.com", phone: "9876543210" },
    jwtSecret,
    { expiresIn: "1h" }
  );

  const tenantTokenB = jwt.sign(
    { id: "tenantBBB", role: "tenant", name: "Tenant Bob", email: "bob@homezy.com", phone: "9876543211" },
    jwtSecret,
    { expiresIn: "1h" }
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

  let createdRequestId;

  test("POST /api/rental-requests rejects unauthenticated user with 401", async () => {
    const res = await fetch(`${baseUrl}/api/rental-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyTitle: "Modern 2 BHK Apartment" }),
    });
    assert.equal(res.status, 401);
  });

  test("POST /api/rental-requests allows tenant to submit application with 201 Created", async () => {
    const res = await fetch(`${baseUrl}/api/rental-requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tenantTokenA}`,
      },
      body: JSON.stringify({
        propertyTitle: "Modern 2 BHK Apartment",
        propertyLocation: "Andheri, Mumbai",
        monthlyRent: "25,000",
        moveInDate: "2026-12-01",
        message: "Looking for an apartment near the metro station.",
      }),
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.request.status, "Pending");
    assert.equal(data.request.propertyTitle, "Modern 2 BHK Apartment");
    createdRequestId = data.request._id;
  });

  test("DUPLICATE PREVENTION: Second pending request for same property is rejected with 409 Conflict", async () => {
    const res = await fetch(`${baseUrl}/api/rental-requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tenantTokenA}`,
      },
      body: JSON.stringify({
        propertyTitle: "Modern 2 BHK Apartment",
        propertyLocation: "Andheri, Mumbai",
        monthlyRent: "25,000",
        message: "Duplicate submission attempt",
      }),
    });
    assert.equal(res.status, 409);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.match(data.message, /already have an active pending request/i);
  });

  test("TENANT HISTORY: GET /api/rental-requests/my returns tenant's personal history", async () => {
    const res = await fetch(`${baseUrl}/api/rental-requests/my`, {
      headers: { Authorization: `Bearer ${tenantTokenA}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.requests.length >= 1);
    assert.equal(data.requests[0].propertyTitle, "Modern 2 BHK Apartment");
    assert.equal(data.requests[0].tenantName, "Tenant Alice");
  });

  test("ACCESS VALIDATION: Tenant cannot access all rental requests (403 Forbidden)", async () => {
    const res = await fetch(`${baseUrl}/api/rental-requests`, {
      headers: { Authorization: `Bearer ${tenantTokenA}` },
    });
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.match(data.message, /not authorized/i);
  });

  test("ACCESS VALIDATION: Tenant B cannot inspect Tenant A's rental request (403 Forbidden)", async () => {
    assert.ok(createdRequestId);
    const res = await fetch(`${baseUrl}/api/rental-requests/${createdRequestId}`, {
      headers: { Authorization: `Bearer ${tenantTokenB}` },
    });
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.match(data.message, /not authorized to view another tenant/i);
  });

  test("ADMIN APPROVAL: Admin can view and approve pending request", async () => {
    assert.ok(createdRequestId);

    // 1. Admin lists all requests
    const listRes = await fetch(`${baseUrl}/api/rental-requests`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(listRes.status, 200);
    const listData = await listRes.json();
    assert.ok(listData.requests.length >= 1);

    // 2. Admin approves request
    const approveRes = await fetch(`${baseUrl}/api/rental-requests/${createdRequestId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: "Approved",
        adminNotes: "Application documents verified. Welcome to Homezy!",
      }),
    });
    assert.equal(approveRes.status, 200);
    const approveData = await approveRes.json();
    assert.equal(approveData.success, true);
    assert.equal(approveData.request.status, "Approved");
  });

  test("TENANT HISTORY: Tenant sees updated Approved status and admin notes", async () => {
    const res = await fetch(`${baseUrl}/api/rental-requests/my`, {
      headers: { Authorization: `Bearer ${tenantTokenA}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    const target = data.requests.find((r) => String(r._id) === String(createdRequestId));
    assert.ok(target);
    assert.equal(target.status, "Approved");
    assert.equal(target.adminNotes, "Application documents verified. Welcome to Homezy!");
  });
});
