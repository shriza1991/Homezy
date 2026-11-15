const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { app } = require("../server");
const jwt = require("jsonwebtoken");

describe("Homezy M8: Automated Full Demonstration API Verification", () => {
  let server;
  let baseUrl;
  let tenantToken;
  let tenantUser;
  let adminToken;
  let adminUser;
  let ownerToken;

  before(async () => {
    // Start ephemeral server
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });

    // Reset and seed canonical demo dataset
    const seedRes = await fetch(`${baseUrl}/api/demo/seed`, { method: "POST" });
    assert.equal(seedRes.status, 200);
    const seedData = await seedRes.json();
    assert.equal(seedData.success, true);
    assert.ok(seedData.counts.users >= 3);
    assert.ok(seedData.counts.properties >= 4);
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test("1. GET /api/demo/status returns seeded counts and accounts", async () => {
    const res = await fetch(`${baseUrl}/api/demo/status`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.counts.users >= 3);
    assert.ok(data.counts.properties >= 4);
    assert.ok(Array.isArray(data.accounts));
  });

  test("2. Tenant Login with Demo Credentials and Session Restoration", async () => {
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "tenant@homezy.com", password: "password123" }),
    });
    assert.equal(loginRes.status, 200);
    const loginData = await loginRes.json();
    assert.ok(loginData.token);
    assert.equal(loginData.user.role, "tenant");
    assert.equal(loginData.user.email, "tenant@homezy.com");

    tenantToken = loginData.token;
    tenantUser = loginData.user;

    // Verify Session via /api/auth/me
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${tenantToken}` },
    });
    assert.equal(meRes.status, 200);
    const meData = await meRes.json();
    assert.equal(meData.user.email, "tenant@homezy.com");
    assert.equal(meData.user.role, "tenant");
  });

  test("3. Admin Login with Demo Credentials and Privilege Verification", async () => {
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@homezy.com", password: "password123" }),
    });
    assert.equal(loginRes.status, 200);
    const loginData = await loginRes.json();
    assert.ok(loginData.token);
    assert.equal(loginData.user.role, "admin");

    adminToken = loginData.token;
    adminUser = loginData.user;

    // Admin Dashboard endpoint permits Admin
    const dashRes = await fetch(`${baseUrl}/api/auth/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(dashRes.status, 200);
    const dashData = await dashRes.json();
    assert.ok(dashData.stats);
    assert.ok(Array.isArray(dashData.users));

    // Admin Dashboard blocks Tenant (403)
    const tenantDashRes = await fetch(`${baseUrl}/api/auth/admin/dashboard`, {
      headers: { Authorization: `Bearer ${tenantToken}` },
    });
    assert.equal(tenantDashRes.status, 403);
  });

  test("4. Owner Login with Demo Credentials", async () => {
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "owner@homezy.com", password: "password123" }),
    });
    assert.equal(loginRes.status, 200);
    const loginData = await loginRes.json();
    assert.equal(loginData.user.role, "owner");
    ownerToken = loginData.token;
    assert.ok(ownerToken);
  });

  test("5. Property Catalog Browsing, Search, and Category Filtering", async () => {
    // Fetch all listings
    const res = await fetch(`${baseUrl}/api/properties`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.success);
    assert.ok(data.properties.length >= 4);

    // Search filter: "Bandra"
    const searchRes = await fetch(`${baseUrl}/api/properties?search=Bandra`);
    const searchData = await searchRes.json();
    assert.ok(searchData.properties.length >= 1);
    assert.ok(searchData.properties.some((p) => p.location.includes("Bandra")));

    // Category filter: "Flat"
    const catRes = await fetch(`${baseUrl}/api/properties?type=Flat`);
    const catData = await catRes.json();
    assert.ok(catData.properties.length >= 1);
    assert.ok(catData.properties.every((p) => p.type === "Flat"));
  });

  let createdRequestId;
  test("6. Tenant Submits New Rental Application", async () => {
    const propRes = await fetch(`${baseUrl}/api/properties`);
    const propData = await propRes.json();
    const targetProp = propData.properties.find((p) => p.title.includes("Cozy")) || propData.properties[2];

    const appPayload = {
      propertyId: targetProp._id || targetProp.id,
      propertyTitle: targetProp.title,
      propertyLocation: targetProp.location,
      monthlyRent: targetProp.price,
      moveInDate: "2026-12-15",
      phone: "9876543210",
      message: "Automated demonstration rental submission.",
    };

    const submitRes = await fetch(`${baseUrl}/api/rental-requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tenantToken}`,
      },
      body: JSON.stringify(appPayload),
    });

    assert.equal(submitRes.status, 201);
    const submitData = await submitRes.json();
    assert.equal(submitData.success, true);
    const submittedReq = submitData.request || submitData.rentalRequest;
    assert.ok(submittedReq);
    assert.equal(submittedReq.status, "Pending");
    assert.equal(submittedReq.propertyTitle, targetProp.title);
    createdRequestId = submittedReq._id || submittedReq.id;

    // 7. Duplicate Prevention Check: Submitting duplicate pending application is rejected with 409
    const dupRes = await fetch(`${baseUrl}/api/rental-requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tenantToken}`,
      },
      body: JSON.stringify(appPayload),
    });
    assert.equal(dupRes.status, 409);
    const dupData = await dupRes.json();
    assert.match(dupData.message, /already have an active pending request/i);
  });

  test("8. Tenant History Retrieval & Verification", async () => {
    const res = await fetch(`${baseUrl}/api/rental-requests/my`, {
      headers: { Authorization: `Bearer ${tenantToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.success);
    const reqList = data.requests || data.rentalRequests;
    assert.ok(Array.isArray(reqList));

    const found = reqList.find(
      (r) => String(r._id || r.id) === String(createdRequestId)
    );
    assert.ok(found);
    assert.equal(found.status, "Pending");
  });

  test("9. Admin Reviews and Approves Application with Notes", async () => {
    // Admin fetches all applications
    const allRes = await fetch(`${baseUrl}/api/rental-requests`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(allRes.status, 200);
    const allData = await allRes.json();
    const allList = allData.requests || allData.rentalRequests;
    assert.ok(allList.length >= 1);

    // Admin updates status to Approved
    const updateRes = await fetch(`${baseUrl}/api/rental-requests/${createdRequestId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: "Approved",
        adminNotes: "Application approved by Homezy Admin. Lease contract generated.",
        updatePropertyStatus: true,
      }),
    });
    assert.equal(updateRes.status, 200);
    const updateData = await updateRes.json();
    assert.equal(updateData.success, true);
    const updatedReq = updateData.request || updateData.rentalRequest;
    assert.equal(updatedReq.status, "Approved");
    assert.equal(updatedReq.adminNotes, "Application approved by Homezy Admin. Lease contract generated.");
  });

  test("10. Tenant Confirms Updated Approval Status & Admin Feedback", async () => {
    const res = await fetch(`${baseUrl}/api/rental-requests/my`, {
      headers: { Authorization: `Bearer ${tenantToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    const reqList = data.requests || data.rentalRequests;
    const approved = reqList.find(
      (r) => String(r._id || r.id) === String(createdRequestId)
    );
    assert.ok(approved);
    assert.equal(approved.status, "Approved");
    assert.equal(approved.adminNotes, "Application approved by Homezy Admin. Lease contract generated.");
  });

  test("11. Notifications Lifecycle: Fetch, Unread Count & Mark Read", async () => {
    // Admin checks notifications
    const notifRes = await fetch(`${baseUrl}/api/notifications`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(notifRes.status, 200);
    const notifData = await notifRes.json();
    assert.ok(notifData.success);
    assert.ok(Array.isArray(notifData.notifications));
    assert.ok(typeof notifData.unreadCount === "number");

    // Mark single notification as read if available
    if (notifData.notifications.length > 0) {
      const targetNotif = notifData.notifications[0];
      const targetId = targetNotif._id || targetNotif.id;

      const readRes = await fetch(`${baseUrl}/api/notifications/${targetId}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(readRes.status, 200);
      const readData = await readRes.json();
      assert.equal(readData.notification.isRead, true);
    }
  });

  test("12. Access Validation: Unrelated Tenant cannot inspect another's request", async () => {
    const jwtSecret = process.env.JWT_SECRET || "homezy_development_secret_key";
    const strangerToken = jwt.sign(
      { id: "stranger999", role: "tenant", name: "Stranger", email: "stranger@other.com" },
      jwtSecret,
      { expiresIn: "1h" }
    );

    const res = await fetch(`${baseUrl}/api/rental-requests/${createdRequestId}`, {
      headers: { Authorization: `Bearer ${strangerToken}` },
    });
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.match(data.message, /forbidden|not authorized/i);
  });
});
