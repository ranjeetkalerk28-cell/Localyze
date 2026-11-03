const User = require('../models/User');
const Business = require('../models/Business');
const generateToken = require('../utils/generateToken');

let counter = 0;
const unique = (prefix) => `${prefix}${++counter}`;

const createUser = async (overrides = {}) => {
  const n = unique('user');
  const user = await User.create({
    name: overrides.name || 'Test User',
    username: overrides.username || n,
    email: overrides.email || `${n}@example.com`,
    password: overrides.password || 'password123',
    interests: overrides.interests || [],
    city: overrides.city || 'Mumbai',
  });
  return { user, token: generateToken(user._id, 'user') };
};

const createBusiness = async (overrides = {}) => {
  const n = unique('biz');
  const business = await Business.create({
    businessName: overrides.businessName || 'Test Business',
    username: overrides.username || n,
    email: overrides.email || `${n}@example.com`,
    password: overrides.password || 'password123',
    industry: overrides.industry || 'Hospitality',
    city: overrides.city || 'Mumbai',
  });
  return { business, token: generateToken(business._id, 'business') };
};

module.exports = { createUser, createBusiness };
