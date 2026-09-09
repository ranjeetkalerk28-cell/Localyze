const Business = require('../models/Business');
const generateToken = require('../utils/generateToken');

// @desc    Register a new business
// @route   POST /api/business/auth/register
const registerBusiness = async (req, res) => {
  try {
    const { businessName, email, password, industry } = req.body;

    const exists = await Business.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Business already registered' });

    const business = await Business.create({ businessName, email, password, industry });

    res.status(201).json({
      _id: business._id,
      businessName: business.businessName,
      email: business.email,
      token: generateToken(business._id, 'business'),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login business
// @route   POST /api/business/auth/login
const loginBusiness = async (req, res) => {
  try {
    const { email, password } = req.body;
    const business = await Business.findOne({ email });

    if (business && (await business.matchPassword(password))) {
      res.json({
        _id: business._id,
        businessName: business.businessName,
        email: business.email,
        token: generateToken(business._id, 'business'),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get the logged-in business's profile
// @route   GET /api/business/auth/me
const getMyProfile = async (req, res) => {
  res.json(req.business);
};

// @desc    Update the logged-in business's profile
// @route   PUT /api/business/auth/me
const updateMyProfile = async (req, res) => {
  try {
    const allowedFields = ['businessName', 'industry', 'description', 'logoUrl'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) req.business[field] = req.body[field];
    });
    const updated = await req.business.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { registerBusiness, loginBusiness, getMyProfile, updateMyProfile };
