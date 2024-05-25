const jwt = require('jsonwebtoken');
const config = require('../config/config');

const generateToken = (user) => {
  const secretKey = config.jwtSecret;
  const expiresIn = '168h';

  const { id, full_name, email, role } = user;

  // Create the JWT payload with additional user information
  const payload = { id, full_name, email, role };
  return jwt.sign(payload, secretKey, { expiresIn });
};

module.exports = generateToken;
