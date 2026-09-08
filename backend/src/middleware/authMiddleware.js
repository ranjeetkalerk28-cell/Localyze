const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Business = require('../models/Business');

// Verifies the JWT and attaches the account to req. Works for either role.
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.role === 'business') {
        req.business = await Business.findById(decoded.id).select('-password');
      } else {
        req.user = await User.findById(decoded.id).select('-password');
      }
      req.role = decoded.role;
      next();
    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Restricts a route to a specific role ('business' or 'user')
const requireRole = (role) => (req, res, next) => {
  if (req.role !== role) {
    return res.status(403).json({ message: `Access restricted to ${role} accounts` });
  }
  next();
};

module.exports = { protect, requireRole };
