const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const propertyRoutes = require("./routes/propertyRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

dotenv.config();

const app = express();

// Configurable CORS
const clientOrigin = process.env.CLIENT_ORIGIN;
const corsOptions = clientOrigin && clientOrigin !== "*"
  ? { origin: clientOrigin.split(",").map((s) => s.trim()), credentials: true }
  : { origin: true, credentials: true };

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper to inspect database status
const getDatabaseHealth = () => {
  const readyStates = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };
  const code = mongoose.connection.readyState;
  return {
    status: readyStates[code] || "unknown",
    readyState: code,
    name: mongoose.connection.name || null,
    host: mongoose.connection.host || null,
  };
};

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "Homezy API is running",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
  });
});

// Comprehensive health check handler
const healthCheckHandler = (req, res) => {
  const dbHealth = getDatabaseHealth();
  const isHealthy = dbHealth.readyState === 1;

  res.status(200).json({
    status: isHealthy ? "ok" : "degraded",
    uptime: Number(process.uptime().toFixed(2)),
    timestamp: new Date().toISOString(),
    database: dbHealth,
    environment: process.env.NODE_ENV || "development",
  });
};

// Health endpoints
app.get("/health", healthCheckHandler);
app.get("/api/health", healthCheckHandler);

// Liveness probe (indicates server process is up)
app.get("/api/health/live", (req, res) => {
  res.status(200).json({
    live: true,
    uptime: Number(process.uptime().toFixed(2)),
    timestamp: new Date().toISOString(),
  });
});

// Readiness probe (indicates database is connected and ready to serve traffic)
app.get("/api/health/ready", (req, res) => {
  const dbHealth = getDatabaseHealth();
  if (dbHealth.readyState === 1) {
    return res.status(200).json({
      ready: true,
      database: dbHealth,
    });
  }
  return res.status(503).json({
    ready: false,
    message: "Database connection not ready",
    database: dbHealth,
  });
});

// Application Routes
app.use("/api/auth", authRoutes);
app.use("/api/properties", propertyRoutes);

// 404 & Central Error Handling
app.use(notFound);
app.use(errorHandler);

// Server startup function
const startServer = async (customPort) => {
  const port = customPort || process.env.PORT || 5000;

  // Initiate database connection
  await connectDB();

  const server = app.listen(port, () => {
    console.log(`[Homezy] Server running in ${process.env.NODE_ENV || "development"} mode on port ${port}`);
  });

  // Graceful shutdown handling
  const shutdown = async (signal) => {
    console.log(`\n[Homezy] Received ${signal}. Closing server gracefully...`);
    server.close(async () => {
      console.log("[Homezy] HTTP server closed.");
      try {
        await mongoose.disconnect();
        console.log("[MongoDB] Disconnected cleanly.");
      } catch (err) {
        console.error("[MongoDB] Error during disconnect:", err.message);
      }
      process.exit(0);
    });

    // Force exit if shutdown takes too long
    setTimeout(() => {
      console.error("[Homezy] Forcefully terminating server shutdown.");
      process.exit(1);
    }, 10000).unref();
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));

  return server;
};

// Start automatically when run as main module
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
