const jwt = require("jsonwebtoken");

const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET || "homezy_development_secret_key",
    {
      expiresIn: "1d",
    }
  );
};

module.exports = generateToken;
