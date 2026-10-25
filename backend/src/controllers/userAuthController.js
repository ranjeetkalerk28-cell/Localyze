const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const CITIES = require('../constants/cities');
const { isValidUsername } = require('../constants/username');

// @desc    Register a new user
// @route   POST /api/user/auth/register
const registerUser = async (req, res) => {
  try {
    const { name, email, password, interests, city } = req.body;
    const username = (req.body.username || '').toLowerCase().trim();

    if (!isValidUsername(username)) {
      return res.status(400).json({ message: 'Username must be 3-30 characters: lowercase letters, numbers, periods, or underscores' });
    }
    if (!CITIES.includes(city)) return res.status(400).json({ message: 'A valid city is required' });

    const usernameTaken = await User.findOne({ username });
    if (usernameTaken) return res.status(400).json({ message: 'Username already taken' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'User already registered' });

    const user = await User.create({ name, username, email, password, interests, city });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      token: generateToken(user._id, 'user'),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/user/auth/login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        token: generateToken(user._id, 'user'),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get the logged-in consumer's profile
// @route   GET /api/user/auth/me
const getMyProfile = async (req, res) => {
  res.json(req.user);
};

// @desc    Update the logged-in consumer's profile
// @route   PUT /api/user/auth/me
const updateMyProfile = async (req, res) => {
  try {
    if (req.body.city !== undefined && !CITIES.includes(req.body.city)) {
      return res.status(400).json({ message: 'A valid city is required' });
    }

    if (req.body.username !== undefined) {
      const username = String(req.body.username).toLowerCase().trim();
      if (!isValidUsername(username)) {
        return res.status(400).json({ message: 'Username must be 3-30 characters: lowercase letters, numbers, periods, or underscores' });
      }
      const usernameTaken = await User.findOne({ username, _id: { $ne: req.user._id } });
      if (usernameTaken) return res.status(400).json({ message: 'Username already taken' });
      req.body.username = username;
    }

    const allowedFields = ['name', 'username', 'bio', 'interests', 'avatarUrl', 'city'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) req.user[field] = req.body[field];
    });
    const updated = await req.user.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { registerUser, loginUser, getMyProfile, updateMyProfile };
