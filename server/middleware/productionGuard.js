/**
 * Production Guard Middleware
 * Disables sensitive demo, reset, and seeding endpoints when running in production.
 */

const blockInProduction = (req, res, next) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({
      success: false,
      message: "Endpoint disabled in production environment",
    });
  }
  next();
};

module.exports = { blockInProduction };
