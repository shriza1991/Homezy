const express = require("express");
const { seedDemoData, getDemoStatus, demoAccounts } = require("../services/demoService");

const router = express.Router();

// POST /api/demo/seed - Resets and seeds demo accounts, catalog, rental requests, notifications
router.post("/seed", async (req, res) => {
  try {
    const result = await seedDemoData();
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to seed demo data",
      error: err.message,
    });
  }
});

// POST /api/demo/reset - Alias for /seed
router.post("/reset", async (req, res) => {
  try {
    const result = await seedDemoData();
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to reset demo data",
      error: err.message,
    });
  }
});

// GET /api/demo/status - Inspect demo entities status
router.get("/status", async (req, res) => {
  try {
    const status = await getDemoStatus();
    res.status(200).json({
      success: true,
      ...status,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve demo status",
      error: err.message,
    });
  }
});

// GET /api/demo/accounts - Return canonical demo accounts
router.get("/accounts", (req, res) => {
  res.status(200).json({
    success: true,
    accounts: demoAccounts,
  });
});

module.exports = router;
