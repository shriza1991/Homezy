const mongoose = require("mongoose");

// Track whether connection event listeners have been registered
let listenersRegistered = false;

function registerConnectionEvents() {
  if (listenersRegistered) return;
  listenersRegistered = true;

  mongoose.connection.on("connected", () => {
    console.log(`[MongoDB] Connected successfully to database: ${mongoose.connection.name || "default"}`);
  });

  mongoose.connection.on("error", (err) => {
    console.error(`[MongoDB] Runtime connection error: ${err.message}`);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("[MongoDB] Disconnected from database");
  });
}

/**
 * Connect to MongoDB or MongoDB Atlas with resilient startup.
 * Does not terminate the Node process on initial failure so that
 * the HTTP server can continue serving health checks and diagnostic endpoints.
 */
const connectDB = async (customUri) => {
  registerConnectionEvents();

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const uri = customUri || process.env.MONGO_URI;

  if (!uri) {
    console.warn(
      "[MongoDB] WARNING: MONGO_URI is not set in environment variables.\n" +
      "  The server will run in database-disconnected mode.\n" +
      "  Configure MONGO_URI in server/.env with your MongoDB Atlas or local connection string."
    );
    return null;
  }

  const isAtlas = uri.startsWith("mongodb+srv://");
  const timeoutMs = Number(process.env.MONGO_TIMEOUT_MS) || 5000;

  console.log(
    `[MongoDB] Connecting to ${isAtlas ? "MongoDB Atlas" : "MongoDB"} (timeout: ${timeoutMs}ms)...`
  );

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: timeoutMs,
    });

    console.log(`[MongoDB] Connected to host: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB] Connection failed: ${error.message}`);
    if (isAtlas) {
      console.error(
        "[MongoDB] Troubleshooting MongoDB Atlas:\n" +
        "  1. Network Access: Ensure your IP address (or 0.0.0.0/0) is added to the IP Access List in Atlas.\n" +
        "  2. Credentials: Check the username and password in MONGO_URI. URL-encode special characters (e.g., @ as %40).\n" +
        "  3. Cluster State: Ensure your cluster is active and not paused.\n" +
        "  4. Database Name: Ensure a database name is specified in the connection string (e.g., .../property_rental_portal?retryWrites=true...)."
      );
    }
    // Return null instead of calling process.exit(1) to allow graceful operation and health reporting
    return null;
  }
};

module.exports = connectDB;
