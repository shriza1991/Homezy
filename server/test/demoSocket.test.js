const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const ioClient = require("socket.io-client");
const { app, createHttpServer } = require("../server");
const jwt = require("jsonwebtoken");

describe("Homezy M8: Automated Full Demonstration Socket.IO Verification", () => {
  let server;
  let baseUrl;
  let socketUrl;
  let tenantToken;
  let adminToken;
  let tenantSocket;
  let adminSocket;

  const jwtSecret = process.env.JWT_SECRET || "homezy_development_secret_key";

  before(async () => {
    // Start HTTP server with Socket.IO initialized
    const serverObj = createHttpServer(app);
    server = serverObj.server;

    await new Promise((resolve) => {
      server.listen(0, () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        socketUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });

    // Reset and seed demo database
    await fetch(`${baseUrl}/api/demo/seed`, { method: "POST" });

    // Authenticate demo tenant
    const tenantLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "tenant@homezy.com", password: "password123" }),
    });
    const tData = await tenantLogin.json();
    tenantToken = tData.token;

    // Authenticate demo admin
    const adminLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@homezy.com", password: "password123" }),
    });
    const aData = await adminLogin.json();
    adminToken = aData.token;
  });

  after(async () => {
    if (tenantSocket && tenantSocket.connected) tenantSocket.disconnect();
    if (adminSocket && adminSocket.connected) adminSocket.disconnect();
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test("1. Authenticated Socket Handshake connects both Tenant & Admin", async () => {
    // Connect Tenant socket
    tenantSocket = ioClient(socketUrl, {
      auth: { token: tenantToken },
      transports: ["websocket", "polling"],
      reconnection: false,
    });

    // Connect Admin socket
    adminSocket = ioClient(socketUrl, {
      auth: { token: adminToken },
      transports: ["websocket", "polling"],
      reconnection: false,
    });

    await Promise.all([
      new Promise((resolve) => tenantSocket.on("connect", resolve)),
      new Promise((resolve) => adminSocket.on("connect", resolve)),
    ]);

    assert.equal(tenantSocket.connected, true);
    assert.equal(adminSocket.connected, true);
  });

  test("2. Socket Ping/Pong Heartbeat response", async () => {
    const pongPromise = new Promise((resolve) => {
      tenantSocket.once("pong", (data) => resolve(data));
    });
    tenantSocket.emit("ping");
    const data = await pongPromise;
    assert.equal(data.status, "pong");
    assert.ok(data.timestamp);
  });

  let submittedReqId;
  test("3. Real-Time Application Submission: Admin receives socket alert", async () => {
    const adminNotificationPromise = new Promise((resolve) => {
      adminSocket.once("notification", (payload) => resolve(payload));
    });

    // Tenant submits application via REST API
    const res = await fetch(`${baseUrl}/api/rental-requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tenantToken}`,
      },
      body: JSON.stringify({
        propertyTitle: "Luxury 2 BHK Apartment",
        propertyLocation: "Worli, Mumbai",
        monthlyRent: "55,000",
        phone: "9876543210",
        moveInDate: "2026-12-01",
        message: "Socket real-time demonstration test",
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    submittedReqId = body.rentalRequest._id || body.rentalRequest.id;

    // Await real-time delivery to Admin socket
    const notif = await adminNotificationPromise;
    assert.ok(notif);
    assert.match(notif.title, /Rental Application/i);
    assert.match(notif.message, /Luxury 2 BHK Apartment/i);
    assert.equal(notif.type, "application_submitted");
  });

  test("4. Real-Time Application Approval: Tenant receives socket alert", async () => {
    const tenantNotificationPromise = new Promise((resolve) => {
      tenantSocket.once("notification", (payload) => resolve(payload));
    });

    // Admin approves application via REST API
    const updateRes = await fetch(`${baseUrl}/api/rental-requests/${submittedReqId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: "Approved",
        adminNotes: "Real-time socket approval verification successful.",
        updatePropertyStatus: true,
      }),
    });
    assert.equal(updateRes.status, 200);

    // Await real-time delivery to Tenant socket
    const notif = await tenantNotificationPromise;
    assert.ok(notif);
    assert.match(notif.title, /Approved/i);
    assert.match(notif.message, /Luxury 2 BHK Apartment/i);
    assert.equal(notif.type, "application_approved");
  });

  test("5. Socket Reconnect Resilience: Recovers and receives subsequent event", async () => {
    // Force disconnect tenant socket
    tenantSocket.disconnect();
    assert.equal(tenantSocket.connected, false);

    // Reconnect tenant socket with auth
    tenantSocket = ioClient(socketUrl, {
      auth: { token: tenantToken },
      transports: ["websocket", "polling"],
      reconnection: false,
    });

    await new Promise((resolve) => tenantSocket.on("connect", resolve));
    assert.equal(tenantSocket.connected, true);

    // Test ping response after reconnect
    const pongPromise = new Promise((resolve) => {
      tenantSocket.once("pong", resolve);
    });
    tenantSocket.emit("ping");
    const pongData = await pongPromise;
    assert.equal(pongData.status, "pong");
  });
});
