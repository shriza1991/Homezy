const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { io: Client } = require("socket.io-client");
const { app, createHttpServer } = require("../server");

describe("Homezy Multi-Owner Targeted Notifications Verification", () => {
  let httpServer;
  let baseUrl;
  let socketUrl;
  let tenantToken;
  let ownerTokens = {};
  let ownerSockets = {};

  before(async () => {
    const { server } = createHttpServer(app);
    httpServer = server;

    await new Promise((resolve) => {
      httpServer.listen(0, () => {
        const address = httpServer.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        socketUrl = baseUrl;
        resolve();
      });
    });

    // 1. Authenticate Tenant
    const tenantRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "tenant@homezy.com", password: "password123" }),
    });
    const tenantData = await tenantRes.json();
    tenantToken = tenantData.token;
    assert.ok(tenantToken, "Tenant token must be generated");

    // 2. Authenticate all 4 Owners
    for (let i = 1; i <= 4; i++) {
      const email = `owner${i}@homezy.com`;
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "password123" }),
      });
      assert.equal(res.status, 200, `Owner ${i} login must succeed with 200 OK`);
      const data = await res.json();
      assert.equal(data.user.role, "owner", `Owner ${i} role must be 'owner'`);
      ownerTokens[i] = data.token;
    }

    // 3. Connect real-time sockets for all 4 owners
    for (let i = 1; i <= 4; i++) {
      ownerSockets[i] = Client(socketUrl, {
        auth: { token: ownerTokens[i] },
        transports: ["websocket", "polling"],
        reconnection: false,
      });

      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Owner ${i} socket connection timeout`)), 3000);
        ownerSockets[i].on("connect", () => {
          clearTimeout(timer);
          resolve();
        });
        ownerSockets[i].on("connect_error", (err) => {
          clearTimeout(timer);
          reject(err);
        });
      });
    }
  });

  after(async () => {
    for (let i = 1; i <= 4; i++) {
      if (ownerSockets[i]) {
        ownerSockets[i].disconnect();
      }
    }
    if (httpServer) {
      await new Promise((resolve) => httpServer.close(resolve));
    }
  });

  test("Tenant request for 'Modern 2 BHK Apartment' notifies only Owner 1", async () => {
    let owner1Received = null;
    let otherOwnersReceived = [];

    const p1 = new Promise((resolve) => {
      ownerSockets[1].once("notification", (notif) => {
        owner1Received = notif;
        resolve();
      });
    });

    const unexpectedNotifs = [];
    const checkOthers = (ownerIdx) => {
      const handler = (notif) => {
        unexpectedNotifs.push({ owner: ownerIdx, notif });
      };
      ownerSockets[ownerIdx].on("notification", handler);
      return () => ownerSockets[ownerIdx].off("notification", handler);
    };

    const cleanups = [checkOthers(2), checkOthers(3), checkOthers(4)];

    // Submit request for Modern 2 BHK Apartment (Owner 1's listing)
    const res = await fetch(`${baseUrl}/api/rental-requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tenantToken}`,
      },
      body: JSON.stringify({
        propertyTitle: "Modern 2 BHK Apartment",
        propertyLocation: "Andheri, Mumbai",
        monthlyRent: "25,000",
        message: "Application specifically for Modern 2 BHK",
      }),
    });

    assert.equal(res.status, 201);
    await p1;
    cleanups.forEach((c) => c());

    assert.ok(owner1Received, "Owner 1 must receive the notification");
    assert.match(owner1Received.message, /Modern 2 BHK Apartment/i);
    assert.equal(unexpectedNotifs.length, 0, "Owners 2, 3, and 4 must NOT receive this notification");
  });

  test("Tenant request for 'Spacious 3 BHK House' notifies only Owner 2", async () => {
    let owner2Received = null;
    const p2 = new Promise((resolve) => {
      ownerSockets[2].once("notification", (notif) => {
        owner2Received = notif;
        resolve();
      });
    });

    const unexpectedNotifs = [];
    const checkOthers = (ownerIdx) => {
      const handler = (notif) => {
        unexpectedNotifs.push({ owner: ownerIdx, notif });
      };
      ownerSockets[ownerIdx].on("notification", handler);
      return () => ownerSockets[ownerIdx].off("notification", handler);
    };

    const cleanups = [checkOthers(1), checkOthers(3), checkOthers(4)];

    // Submit request for Spacious 3 BHK House (Owner 2's listing)
    const res = await fetch(`${baseUrl}/api/rental-requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tenantToken}`,
      },
      body: JSON.stringify({
        propertyTitle: "Spacious 3 BHK House",
        propertyLocation: "Powai, Mumbai",
        monthlyRent: "40,000",
        message: "Application specifically for Spacious 3 BHK House",
      }),
    });

    assert.equal(res.status, 201);
    await p2;
    cleanups.forEach((c) => c());

    assert.ok(owner2Received, "Owner 2 must receive the notification");
    assert.match(owner2Received.message, /Spacious 3 BHK House/i);
    assert.equal(unexpectedNotifs.length, 0, "Owners 1, 3, and 4 must NOT receive this notification");
  });

  test("Tenant request for 'Cozy 1 BHK Flat' notifies only Owner 3", async () => {
    let owner3Received = null;
    const p3 = new Promise((resolve) => {
      ownerSockets[3].once("notification", (notif) => {
        owner3Received = notif;
        resolve();
      });
    });

    const unexpectedNotifs = [];
    const checkOthers = (ownerIdx) => {
      const handler = (notif) => {
        unexpectedNotifs.push({ owner: ownerIdx, notif });
      };
      ownerSockets[ownerIdx].on("notification", handler);
      return () => ownerSockets[ownerIdx].off("notification", handler);
    };

    const cleanups = [checkOthers(1), checkOthers(2), checkOthers(4)];

    // Submit request for Cozy 1 BHK Flat (Owner 3's listing)
    const res = await fetch(`${baseUrl}/api/rental-requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tenantToken}`,
      },
      body: JSON.stringify({
        propertyTitle: "Cozy 1 BHK Flat",
        propertyLocation: "Bandra, Mumbai",
        monthlyRent: "20,000",
        message: "Application specifically for Cozy 1 BHK Flat",
      }),
    });

    assert.equal(res.status, 201);
    await p3;
    cleanups.forEach((c) => c());

    assert.ok(owner3Received, "Owner 3 must receive the notification");
    assert.match(owner3Received.message, /Cozy 1 BHK Flat/i);
    assert.equal(unexpectedNotifs.length, 0, "Owners 1, 2, and 4 must NOT receive this notification");
  });

  test("Tenant request for 'Luxury 2 BHK Apartment' notifies only Owner 4", async () => {
    let owner4Received = null;
    const p4 = new Promise((resolve) => {
      ownerSockets[4].once("notification", (notif) => {
        owner4Received = notif;
        resolve();
      });
    });

    const unexpectedNotifs = [];
    const checkOthers = (ownerIdx) => {
      const handler = (notif) => {
        unexpectedNotifs.push({ owner: ownerIdx, notif });
      };
      ownerSockets[ownerIdx].on("notification", handler);
      return () => ownerSockets[ownerIdx].off("notification", handler);
    };

    const cleanups = [checkOthers(1), checkOthers(2), checkOthers(3)];

    // Submit request for Luxury 2 BHK Apartment (Owner 4's listing)
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
        message: "Application specifically for Luxury 2 BHK Apartment",
      }),
    });

    assert.equal(res.status, 201);
    await p4;
    cleanups.forEach((c) => c());

    assert.ok(owner4Received, "Owner 4 must receive the notification");
    assert.match(owner4Received.message, /Luxury 2 BHK Apartment/i);
    assert.equal(unexpectedNotifs.length, 0, "Owners 1, 2, and 3 must NOT receive this notification");
  });

  test("Each owner's historical notifications endpoint returns only their notifications", async () => {
    for (let i = 1; i <= 4; i++) {
      const res = await fetch(`${baseUrl}/api/notifications`, {
        headers: { Authorization: `Bearer ${ownerTokens[i]}` },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.success);
      assert.equal(data.count, 1, `Owner ${i} must have exactly 1 notification`);
      assert.equal(data.unreadCount, 1, `Owner ${i} must have 1 unread notification`);
    }
  });
});
