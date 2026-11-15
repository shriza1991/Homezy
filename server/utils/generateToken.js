const jwt = require("jsonwebtoken");
const { getJwtSecret } = require("../config/jwt");

const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    getJwtSecret(),
    {
      expiresIn: "1d",
    }
  );
};

module.exports = generateToken;
