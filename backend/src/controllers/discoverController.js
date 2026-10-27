const Post = require('../models/Post');
const Business = require('../models/Business');
const Follow = require('../models/Follow');

// @desc    Return posts from businesses the logged-in consumer follows
//          (newest first). No fallback to other posts yet -- an empty
//          follow list means an empty feed, by product decision, until
//          the future Explore page covers interest/city-based discovery.
// @route   GET /api/discover/posts
const discoverPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const follows = await Follow.find({ user: req.user._id }).select('business');
    const followedIds = follows.map((follow) => follow.business);

    if (followedIds.length === 0) return res.json([]);

    const posts = await Post.find({
      status: 'active',
      visibility: { $in: ['consumers_and_businesses', null] },
      business: { $in: followedIds },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    })
      .populate('business', 'businessName logoUrl industry')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Discover businesses relevant to the logged-in user, scoped to their city
// @route   GET /api/discover/businesses
const discoverBusinesses = async (req, res) => {
  try {
    const { interests, city } = req.user;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const query = { city, ...(interests && interests.length > 0 ? { industry: { $in: interests } } : {}) };

    const businesses = await Business.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const follows = await Follow.find({ user: req.user._id }).select('business');
    const followedIds = new Set(follows.map((follow) => follow.business.toString()));
    res.json(businesses.map((business) => ({
      ...business.toObject(),
      following: followedIds.has(business._id.toString()),
    })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { discoverPosts, discoverBusinesses };
