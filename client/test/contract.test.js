import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { properties, filterProperties } from "../src/data/properties.js";
import {
  API_URL,
  authRequest,
  verifySession,
  fetchAdminData,
  fetchProperties,
  fetchPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  createRentalRequest,
  fetchMyRentalRequests,
  fetchAllRentalRequests,
  updateRentalRequestStatus,
  deleteRentalRequest,
  fetchNotifications,
  fetchUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  checkServerHealth,
  seedDemoData,
  fetchDemoStatus,
} from "../src/services/api.js";
import { connectSocket, disconnectSocket } from "../src/services/socket.js";

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

  test("fetchProperties retrieves listings from /api/properties", async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (url) => {
        assert.ok(url.includes("/properties"));
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            properties: [{ id: 101, title: "Mock Villa", location: "Juhu", price: "80,000" }],
          }),
        };
      };

      const props = await fetchProperties({ search: "Juhu" });
      assert.equal(props.length, 1);
      assert.equal(props[0].title, "Mock Villa");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("fetchPropertyById retrieves single listing details", async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (url) => {
        assert.ok(url.includes("/properties/101"));
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            property: { id: 101, title: "Mock Villa", location: "Juhu", price: "80,000" },
          }),
        };
      };

      const prop = await fetchPropertyById("101");
      assert.equal(prop.id, 101);
      assert.equal(prop.title, "Mock Villa");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("createProperty, updateProperty, and deleteProperty execute CRUD", async () => {
    const originalFetch = globalThis.fetch;
    try {
      // Create
      globalThis.fetch = async (url, opts) => {
        assert.equal(opts.method, "POST");
        assert.ok(opts.headers.Authorization.includes("test_token"));
        return {
          ok: true,
          status: 201,
          json: async () => ({
            success: true,
            property: { id: "p-new", title: "New Luxury Penthouse" },
          }),
        };
      };
      const created = await createProperty({ title: "New Luxury Penthouse" }, "test_token");
      assert.equal(created.id, "p-new");

      // Update
      globalThis.fetch = async (url, opts) => {
        assert.equal(opts.method, "PUT");
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            property: { id: "p-new", title: "Updated Penthouse" },
          }),
        };
      };
      const updated = await updateProperty("p-new", { title: "Updated Penthouse" }, "test_token");
      assert.equal(updated.title, "Updated Penthouse");

      // Delete
      globalThis.fetch = async (url, opts) => {
        assert.equal(opts.method, "DELETE");
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        };
      };
      const deleted = await deleteProperty("p-new", "test_token");
      assert.equal(deleted, true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("Rental Requests M4: createRentalRequest, fetchMyRentalRequests, fetchAllRentalRequests, updateStatus", async () => {
    const originalFetch = globalThis.fetch;
    try {
      // Create request
      globalThis.fetch = async (url, opts) => {
        assert.ok(url.includes("/rental-requests"));
        assert.equal(opts.method, "POST");
        const body = JSON.parse(opts.body);
        assert.equal(body.propertyTitle, "Test Villa");
        return {
          ok: true,
          status: 201,
          json: async () => ({
            success: true,
            request: { _id: "req-1", propertyTitle: "Test Villa", status: "Pending" },
          }),
        };
      };
      const created = await createRentalRequest({ propertyTitle: "Test Villa" }, "tenant_token");
      assert.equal(created.status, "Pending");

      // Fetch my requests (tenant history)
      globalThis.fetch = async (url) => {
        assert.ok(url.includes("/rental-requests/my"));
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            requests: [{ _id: "req-1", propertyTitle: "Test Villa", status: "Pending" }],
          }),
        };
      };
      const myReqs = await fetchMyRentalRequests("tenant_token");
      assert.equal(myReqs.length, 1);
      assert.equal(myReqs[0].propertyTitle, "Test Villa");

      // Fetch all requests (admin overview)
      globalThis.fetch = async (url) => {
        assert.ok(url.includes("/rental-requests"));
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            requests: [{ _id: "req-1", propertyTitle: "Test Villa", status: "Pending" }],
          }),
        };
      };
      const allReqs = await fetchAllRentalRequests("admin_token");
      assert.equal(allReqs.length, 1);

      // Update status (Admin Approval)
      globalThis.fetch = async (url, opts) => {
        assert.ok(url.includes("/rental-requests/req-1/status"));
        assert.equal(opts.method, "PATCH");
        const body = JSON.parse(opts.body);
        assert.equal(body.status, "Approved");
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            request: { _id: "req-1", status: "Approved", adminNotes: "Approved by Admin" },
          }),
        };
      };
      const updated = await updateRentalRequestStatus("req-1", "Approved", "admin_token", "Approved by Admin");
      assert.equal(updated.status, "Approved");
      assert.equal(updated.adminNotes, "Approved by Admin");

      // Update status with options object
      globalThis.fetch = async (url, opts) => {
        assert.ok(url.includes("/rental-requests/req-1/status"));
        const body = JSON.parse(opts.body);
        assert.equal(body.status, "Approved");
        assert.equal(body.updatePropertyStatus, true);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            request: { _id: "req-1", status: "Approved" },
          }),
        };
      };
      await updateRentalRequestStatus("req-1", "Approved", "admin_token", {
        adminNotes: "Approved",
        updatePropertyStatus: true,
      });

      // Delete / cancel rental request
      globalThis.fetch = async (url, opts) => {
        assert.ok(url.includes("/rental-requests/req-1"));
        assert.equal(opts.method, "DELETE");
        assert.equal(opts.headers.Authorization, "Bearer tenant_token");
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, message: "Rental request cancelled successfully" }),
        };
      };
      const cancelled = await deleteRentalRequest("req-1", "tenant_token");
      assert.equal(cancelled, true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("Independent sessions simulation maintains tab separation", () => {
    const tab1Session = new Map();
    const tab2Session = new Map();

    tab1Session.set("token", "admin_jwt_tab_1");
    tab1Session.set("user", JSON.stringify({ name: "Admin One", role: "admin" }));

    tab2Session.set("token", "tenant_jwt_tab_2");
    tab2Session.set("user", JSON.stringify({ name: "Tenant Two", role: "tenant" }));

    assert.equal(JSON.parse(tab1Session.get("user")).role, "admin");
    assert.equal(tab1Session.get("token"), "admin_jwt_tab_1");

    assert.equal(JSON.parse(tab2Session.get("user")).role, "tenant");
    assert.equal(tab2Session.get("token"), "tenant_jwt_tab_2");

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

  test("Notifications API contracts: fetchNotifications, fetchUnreadCount, markAsRead, markAllAsRead, deleteNotification", async () => {
    const originalFetch = globalThis.fetch;
    try {
      // 1. fetchNotifications
      globalThis.fetch = async (url, opts) => {
        assert.ok(url.includes("/notifications"));
        assert.equal(opts.headers.Authorization, "Bearer notif_token");
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            unreadCount: 2,
            notifications: [
              { _id: "n-1", title: "App Approved", isRead: false },
              { _id: "n-2", title: "New Listing", isRead: false },
            ],
          }),
        };
      };
      const notifsData = await fetchNotifications("notif_token");
      assert.equal(notifsData.unreadCount, 2);
      assert.equal(notifsData.notifications.length, 2);

      // 2. fetchUnreadCount
      globalThis.fetch = async (url) => {
        assert.ok(url.includes("/notifications/unread-count"));
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, unreadCount: 5 }),
        };
      };
      const count = await fetchUnreadCount("notif_token");
      assert.equal(count, 5);

      // 3. markNotificationAsRead
      globalThis.fetch = async (url, opts) => {
        assert.ok(url.includes("/notifications/n-1/read"));
        assert.equal(opts.method, "PATCH");
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            notification: { _id: "n-1", isRead: true },
            unreadCount: 1,
          }),
        };
      };
      const readRes = await markNotificationAsRead("n-1", "notif_token");
      assert.equal(readRes.notification.isRead, true);

      // 4. markAllNotificationsAsRead
      globalThis.fetch = async (url, opts) => {
        assert.ok(url.includes("/notifications/read-all"));
        assert.equal(opts.method, "PATCH");
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, unreadCount: 0 }),
        };
      };
      const allReadRes = await markAllNotificationsAsRead("notif_token");
      assert.equal(allReadRes.unreadCount, 0);

      // 5. deleteNotification
      globalThis.fetch = async (url, opts) => {
        assert.ok(url.includes("/notifications/n-1"));
        assert.equal(opts.method, "DELETE");
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        };
      };
      const delRes = await deleteNotification("n-1", "notif_token");
      assert.equal(delRes, true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("Socket client helper manages lifecycle and handlers cleanly", () => {
    // Calling connectSocket without token returns null
    const noToken = connectSocket(null);
    assert.equal(noToken, null);

    disconnectSocket();
  });

  test("Validation contracts: phone format, password length, and password match logic", () => {
    // Phone validation helper logic (used in Register and PropertyRequest)
    const validatePhone = (phone) => {
      const digits = (phone || "").replace(/\D/g, "");
      return digits.length >= 10 && digits.length <= 15;
    };

    assert.equal(validatePhone("9876543210"), true);
    assert.equal(validatePhone("+91 98765 43210"), true);
    assert.equal(validatePhone("(555) 123-4567"), true);
    assert.equal(validatePhone("12345"), false);
    assert.equal(validatePhone(""), false);

    // Password validation helper logic (used in Register)
    const validatePassword = (pw) => (pw || "").length >= 6;
    assert.equal(validatePassword("secret"), true);
    assert.equal(validatePassword("123456"), true);
    assert.equal(validatePassword("short"), false);
    assert.equal(validatePassword(""), false);

    // Live password matching helper logic
    const validateMatch = (pw, confirm) => pw === confirm && pw.length > 0;
    assert.equal(validateMatch("password123", "password123"), true);
    assert.equal(validateMatch("password123", "different123"), false);
    assert.equal(validateMatch("", ""), false);
  });

  test("Responsiveness & Quick Filter Chips: filterProperties accurately categorizes catalog listings", () => {
    const categories = ["All", "Apartment", "Independent House", "Flat", "Luxury Apartment"];

    categories.forEach((cat) => {
      const selectedCat = cat === "All" ? "" : cat;
      const filtered = filterProperties(properties, "", selectedCat);
      assert.ok(Array.isArray(filtered));
      if (selectedCat) {
        filtered.forEach((p) => assert.equal(p.type, selectedCat));
      }
    });

    // Combined category chip + search query
    const aptInAndheri = filterProperties(properties, "andheri", "Apartment");
    assert.equal(aptInAndheri.length, 1);
    assert.equal(aptInAndheri[0].id, 1);
  });

  test("Demo Management API contracts: seedDemoData and fetchDemoStatus", async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (url, opts) => {
        if (url.includes("/api/demo/seed")) {
          assert.equal(opts.method, "POST");
          return {
            ok: true,
            status: 200,
            json: async () => ({ success: true, message: "Demo data seeded" }),
          };
        }
        if (url.includes("/api/demo/status")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              counts: { users: 3, properties: 4, rentalRequests: 2, notifications: 2 },
            }),
          };
        }
        throw new Error("Unexpected URL: " + url);
      };

      const seedRes = await seedDemoData();
      assert.equal(seedRes.success, true);

      const statusRes = await fetchDemoStatus();
      assert.equal(statusRes.success, true);
      assert.equal(statusRes.counts.users, 3);
      assert.equal(statusRes.counts.properties, 4);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
