/**
 * JWT Configuration Helper
 * Enforces strict JWT secret requirements in production:
 * - In production (NODE_ENV === 'production'), process.env.JWT_SECRET is strictly mandatory.
 * - No insecure default/fallback signing secret is permitted in production.
 * - In development or test environments, falls back to a default secret for local convenience.
 */

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    if (!secret || typeof secret !== "string" || secret.trim() === "" || secret === "homezy_development_secret_key") {
      throw new Error(
        "FATAL: JWT_SECRET environment variable is strictly required in production mode. Fallback secret is not permitted."
      );
    }
    return secret.trim();
  }

  return secret && secret.trim() !== "" ? secret.trim() : "homezy_development_secret_key";
}

module.exports = { getJwtSecret };
