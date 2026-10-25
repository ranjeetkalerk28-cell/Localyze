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

      const account = decoded.role === 'business'
        ? await Business.findById(decoded.id).select('-password')
        : await User.findById(decoded.id).select('-password');

      // The JWT is valid, but the account it points to is gone (e.g. deleted
      // after the token was issued) — fail cleanly here instead of letting
      // every downstream controller crash on a null req.business/req.user.
      if (!account) {
        return res.status(401).json({ message: 'Not authorized, account no longer exists' });
      }

      if (decoded.role === 'business') {
        req.business = account;
      } else {
        req.user = account;
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
