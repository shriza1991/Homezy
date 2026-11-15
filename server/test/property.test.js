const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { app } = require("../server");

describe("Homezy Property CRUD & Search Tests", () => {
  let server;
  let baseUrl;
  const jwtSecret = process.env.JWT_SECRET || "homezy_development_secret_key";

  const adminToken = jwt.sign(
    { id: "admin999", role: "admin", name: "Property Admin", email: "padmin@homezy.com" },
    jwtSecret,
    { expiresIn: "1h" }
  );

  const ownerToken = jwt.sign(
    { id: "owner888", role: "owner", name: "Property Owner", email: "owner@homezy.com" },
    jwtSecret,
    { expiresIn: "1h" }
  );

  const tenantToken = jwt.sign(
    { id: "tenant777", role: "tenant", name: "Property Tenant", email: "tenant@homezy.com" },
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

  test("GET /api/properties returns list of properties", async () => {
    const res = await fetch(`${baseUrl}/api/properties`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.properties));
    assert.ok(data.properties.length >= 4);
  });

  test("GET /api/properties filters by search keyword in location or title", async () => {
    const res = await fetch(`${baseUrl}/api/properties?search=Andheri`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.properties.length >= 1);
    const hasAndheri = data.properties.some((p) => p.location.includes("Andheri") || p.title.includes("Andheri"));
    assert.equal(hasAndheri, true);
  });

  test("GET /api/properties filters by property type / category", async () => {
    const res = await fetch(`${baseUrl}/api/properties?type=Flat`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.properties.length >= 1);
    const allFlats = data.properties.every((p) => p.type.toLowerCase() === "flat");
    assert.equal(allFlats, true);
  });

  test("GET /api/properties/:id returns single property details", async () => {
    const listRes = await fetch(`${baseUrl}/api/properties`);
    const listData = await listRes.json();
    const firstProp = listData.properties[0];
    const targetId = firstProp._id || firstProp.id;

    const res = await fetch(`${baseUrl}/api/properties/${targetId}`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.property.title, firstProp.title);
  });

  test("POST /api/properties rejects unauthenticated user with 401", async () => {
    const res = await fetch(`${baseUrl}/api/properties`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Unauthorized Listing",
        description: "Test description",
        location: "Khar, Mumbai",
        price: "35,000",
      }),
    });
    assert.equal(res.status, 401);
  });

  test("POST /api/properties blocks tenant from creating listing with 403 Forbidden", async () => {
    const res = await fetch(`${baseUrl}/api/properties`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tenantToken}`,
      },
      body: JSON.stringify({
        title: "Tenant Listing Attempt",
        description: "Test description",
        location: "Bandra, Mumbai",
        price: "30,000",
      }),
    });
    assert.equal(res.status, 403);
  });

  let createdPropId;

  test("POST /api/properties allows owner to create listing with 201 Created", async () => {
    const res = await fetch(`${baseUrl}/api/properties`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        title: "Sunny 2 BHK Sea View",
        description: "Spectacular sea-facing apartment with modern kitchen.",
        location: "Juhu, Mumbai",
        price: "60,000",
        type: "Apartment",
        bedrooms: "2 BHK",
        bathrooms: 2,
        area: "1100 sq.ft",
      }),
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.property.title, "Sunny 2 BHK Sea View");
    createdPropId = data.property._id || data.property.id;
  });

  test("PUT /api/properties/:id updates listing details", async () => {
    assert.ok(createdPropId);
    const res = await fetch(`${baseUrl}/api/properties/${createdPropId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        price: "65,000",
        status: "Available",
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.property.price, "65,000");
  });

  test("DELETE /api/properties/:id deletes listing", async () => {
    assert.ok(createdPropId);
    const res = await fetch(`${baseUrl}/api/properties/${createdPropId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
  });
});
