const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

// Load server environment variables
dotenv.config({ path: path.join(__dirname, "../.env") });

const connectDB = require("../config/db");
const { seedDemoData, getDemoStatus } = require("../services/demoService");

async function runSeed() {
  console.log("==================================================");
  console.log("       Homezy Repeatable Demo Seeder (M8)         ");
  console.log("==================================================");

  // Attempt database connection if URI configured
  if (process.env.MONGO_URI) {
    console.log("[Seeder] Attempting connection to MongoDB Atlas...");
    try {
      await connectDB();
    } catch (err) {
      console.warn("[Seeder] MongoDB Atlas connection error:", err.message);
      console.log("[Seeder] Falling back to in-memory demo dataset.");
    }
  } else {
    console.log("[Seeder] No MONGO_URI specified. Operating in resilient in-memory mode.");
  }

  try {
    console.log("[Seeder] Seeding canonical demo entities...");
    const result = await seedDemoData();

    console.log(`\n✓ ${result.message} (${result.mode.toUpperCase()} mode)\n`);
    console.log("Seed Counts Summary:");
    console.log(`  - Users:               ${result.counts.users}`);
    console.log(`  - Properties:          ${result.counts.properties}`);
    console.log(`  - Rental Applications: ${result.counts.rentalRequests}`);
    console.log(`  - Notifications:       ${result.counts.notifications}`);

    console.log("\nPre-configured Demo Credentials:");
    result.accounts.forEach((acc) => {
      console.log(`  [${acc.role.toUpperCase()}] ${acc.name} <${acc.email}> | Password: password123`);
    });
    console.log("==================================================");
  } catch (error) {
    console.error("[Seeder] Failed to seed demo data:", error.message);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log("[Seeder] Disconnected from database.");
    }
    process.exit(0);
  }
}

if (require.main === module) {
  runSeed();
}

module.exports = { runSeed };
