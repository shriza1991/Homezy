const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { io: ioClient } = require("socket.io-client");
const { app, createHttpServer } = require("../server");
const { closeSocket } = require("../socket");
const { createAndEmitNotification } = require("../controllers/notificationController");

describe("Homezy Socket.IO Notifications & Reconnect Tests", () => {
  let server;
  let baseUrl;
  let socketUrl;
  const jwtSecret = process.env.JWT_SECRET || "homezy_development_secret_key";

  const tenantToken = jwt.sign(
    { id: "tenant999", role: "tenant", name: "Tenant Natasha", email: "natasha@homezy.com" },
    jwtSecret,
    { expiresIn: "1h" }
  );

  const adminToken = jwt.sign(
    { id: "admin999", role: "admin", name: "Admin Peter", email: "peter@homezy.com" },
    jwtSecret,
    { expiresIn: "1h" }
  );

  const otherTenantToken = jwt.sign(
    { id: "tenant888", role: "tenant", name: "Tenant Bruce", email: "bruce@homezy.com" },
    jwtSecret,
    { expiresIn: "1h" }
  );

  before(async () => {
    await new Promise((resolve) => {
      const httpBundle = createHttpServer(app);
      server = httpBundle.server.listen(0, () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        socketUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    closeSocket();
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test("AUTHENTICATION: Socket connection without token is rejected with Authentication error", async () => {
    await new Promise((resolve) => {
      const client = ioClient(socketUrl, {
        reconnection: false,
        timeout: 3000,
      });

      client.on("connect_error", (err) => {
        assert.match(err.message, /authentication error/i);
        client.close();
        resolve();
      });

      client.on("connect", () => {
        client.close();
        assert.fail("Should not connect without token");
      });
    });
  });

  test("AUTHENTICATION: Socket connection with invalid token is rejected", async () => {
    await new Promise((resolve) => {
      const client = ioClient(socketUrl, {
        auth: { token: "invalid_expired_token_12345" },
        reconnection: false,
        timeout: 3000,
      });

      client.on("connect_error", (err) => {
        assert.match(err.message, /authentication error/i);
        client.close();
        resolve();
      });

      client.on("connect", () => {
        client.close();
        assert.fail("Should not connect with invalid token");
      });
    });
  });

  test("AUTHENTICATION: Socket connection with valid tenant token connects and responds to ping", async () => {
    await new Promise((resolve) => {
      const client = ioClient(socketUrl, {
        auth: { token: tenantToken },
        reconnection: false,
        timeout: 3000,
      });

      client.on("connect", () => {
        client.emit("ping", (res) => {
          assert.equal(res.status, "pong");
          client.close();
          resolve();
        });
      });

      client.on("connect_error", (err) => {
        assert.fail(`Connection failed: ${err.message}`);
      });
    });
  });

  test("TARGETED DELIVERY: Notification emitted to specific user is received only by recipient", async () => {
    const tenantClient = ioClient(socketUrl, {
      auth: { token: tenantToken },
      reconnection: false,
    });

    const otherClient = ioClient(socketUrl, {
      auth: { token: otherTenantToken },
      reconnection: false,
    });

    await Promise.all([
      new Promise((res) => tenantClient.on("connect", res)),
      new Promise((res) => otherClient.on("connect", res)),
    ]);

    let otherReceived = false;
    otherClient.on("notification", () => {
      otherReceived = true;
    });

    const deliveryPromise = new Promise((resolve) => {
      tenantClient.on("notification", (notif) => {
        assert.equal(notif.title, "Private Tenant Alert");
        assert.equal(notif.message, "Your document has been verified.");
        resolve();
      });
    });

    // Programmatically create and emit notification for tenant999
    await createAndEmitNotification({
      recipient: "tenant999",
      title: "Private Tenant Alert",
      message: "Your document has been verified.",
      type: "system",
    });

    await deliveryPromise;
    assert.equal(otherReceived, false, "Other tenant must not receive private notification");

    tenantClient.close();
    otherClient.close();
  });

  test("ADMIN BROADCAST: Application submission notification is delivered to Admin room", async () => {
    const adminClient = ioClient(socketUrl, {
      auth: { token: adminToken },
      reconnection: false,
    });

    await new Promise((res) => adminClient.on("connect", res));

    const adminReceivedPromise = new Promise((resolve) => {
      adminClient.on("notification", (notif) => {
        assert.equal(notif.type, "application_submitted");
        assert.match(notif.message, /submitted an application/i);
        resolve();
      });
    });

    // Tenant Natasha submits a rental application via API
    const res = await fetch(`${baseUrl}/api/rental-requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tenantToken}`,
      },
      body: JSON.stringify({
        propertyTitle: "Skyline Luxury Penthouse",
        propertyLocation: "Worli, Mumbai",
        monthlyRent: "1,20,000",
        message: "High-floor preferred.",
      }),
    });
    assert.equal(res.status, 201);

    await adminReceivedPromise;
    adminClient.close();
  });

  test("REST API: GET /api/notifications returns user's notifications and unread count", async () => {
    const res = await fetch(`${baseUrl}/api/notifications`, {
      headers: { Authorization: `Bearer ${tenantToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(typeof data.unreadCount === "number");
    assert.ok(Array.isArray(data.notifications));
    assert.ok(data.notifications.length >= 1);
  });

  test("REST API: PATCH /api/notifications/:id/read marks single notification as read", async () => {
    // 1. Fetch current notifications to find an unread one
    const listRes = await fetch(`${baseUrl}/api/notifications`, {
      headers: { Authorization: `Bearer ${tenantToken}` },
    });
    const listData = await listRes.json();
    const target = listData.notifications[0];
    assert.ok(target);
    const notifId = target._id || target.id;

    // 2. Mark as read
    const readRes = await fetch(`${baseUrl}/api/notifications/${notifId}/read`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tenantToken}` },
    });
    assert.equal(readRes.status, 200);
    const readData = await readRes.json();
    assert.equal(readData.success, true);
    assert.equal(readData.notification.isRead, true);
  });

  test("REST API: PATCH /api/notifications/read-all marks all notifications as read", async () => {
    const res = await fetch(`${baseUrl}/api/notifications/read-all`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tenantToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.unreadCount, 0);

    // Verify unread count is 0
    const countRes = await fetch(`${baseUrl}/api/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${tenantToken}` },
    });
    const countData = await countRes.json();
    assert.equal(countData.unreadCount, 0);
  });

  test("ACCESS CONTROL: Tenant B cannot mark Tenant A's notification as read (403)", async () => {
    // 1. Create notification for Tenant Natasha (tenant999)
    const notif = await createAndEmitNotification({
      recipient: "tenant999",
      title: "Confidential Alert",
      message: "Secret tenant notification.",
    });
    assert.ok(notif);
    const notifId = notif._id || notif.id;

    // 2. Tenant Bruce (tenant888) attempts to mark it as read -> 403 Forbidden
    const forbiddenRes = await fetch(`${baseUrl}/api/notifications/${notifId}/read`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${otherTenantToken}` },
    });
    assert.equal(forbiddenRes.status, 403);
    const forbiddenData = await forbiddenRes.json();
    assert.match(forbiddenData.message, /forbidden/i);
  });

  test("RELIABLE RECONNECT: Socket recovers after disconnect and receives notifications", async () => {
    const client = ioClient(socketUrl, {
      auth: { token: tenantToken },
      reconnection: true,
      reconnectionDelay: 100,
    });

    await new Promise((res) => client.on("connect", res));

    // Force client disconnection
    client.disconnect();
    assert.equal(client.connected, false);

    // Reconnect
    client.connect();
    await new Promise((res) => client.on("connect", res));
    assert.equal(client.connected, true);

    const deliveryPromise = new Promise((resolve) => {
      client.on("notification", (n) => {
        assert.equal(n.title, "Post-Reconnect Notification");
        resolve();
      });
    });

    await createAndEmitNotification({
      recipient: "tenant999",
      title: "Post-Reconnect Notification",
      message: "Delivered after reconnection.",
      type: "system",
    });

    await deliveryPromise;
    client.close();
  });
});
