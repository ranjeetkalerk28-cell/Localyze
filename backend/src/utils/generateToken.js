const jwt = require('jsonwebtoken');

// role is either 'user' or 'business' — embedded in the token so middleware
// can tell which account type is making the request.
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

module.exports = generateToken;
