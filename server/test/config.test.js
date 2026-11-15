const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const connectDB = require("../config/db");

describe("Database Configuration & Resilience", () => {
  test("connectDB handles empty/missing URI without throwing or exiting", async () => {
    const origEnv = process.env.MONGO_URI;
    delete process.env.MONGO_URI;

    try {
      const conn = await connectDB("");
      assert.equal(conn, null);
    } finally {
      process.env.MONGO_URI = origEnv;
    }
  });

  test("connectDB handles invalid Atlas URI with fast timeout without throwing", async () => {
    const invalidAtlasUri = "mongodb+srv://invaliduser:invalidpass@cluster0.invalid.mongodb.net/test?retryWrites=true&w=majority";
    process.env.MONGO_TIMEOUT_MS = "1000";

    const conn = await connectDB(invalidAtlasUri);
    // Should fail gracefully and return null instead of calling process.exit(1)
    assert.equal(conn, null);
  });
});
