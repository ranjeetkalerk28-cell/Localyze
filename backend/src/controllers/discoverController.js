const Post = require('../models/Post');
const Business = require('../models/Business');
const Follow = require('../models/Follow');

// @desc    Discover posts relevant to the logged-in user
//          Matches post tags against the user's interests when available,
//          otherwise falls back to the most recent posts.
// @route   GET /api/discover/posts
const discoverPosts = async (req, res) => {
  try {
    const { interests } = req.user;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const query = {
      visibility: { $in: ['consumers_and_businesses', null] },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      ...(interests && interests.length > 0 ? { tags: { $in: interests } } : {}),
    };

    const posts = await Post.find(query)
      .populate('business', 'businessName logoUrl industry')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Fill remaining slots with recent posts if interest-matching returned too few
    if (posts.length < limit && interests && interests.length > 0) {
      const excludeIds = posts.map((p) => p._id);
      const fillerPosts = await Post.find({
        _id: { $nin: excludeIds },
        visibility: { $in: ['consumers_and_businesses', null] },
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      })
        .populate('business', 'businessName logoUrl industry')
        .sort({ createdAt: -1 })
        .limit(limit - posts.length);
      return res.json([...posts, ...fillerPosts]);
    }

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Discover businesses relevant to the logged-in user
// @route   GET /api/discover/businesses
const discoverBusinesses = async (req, res) => {
  try {
    const { interests } = req.user;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const query = interests && interests.length > 0 ? { industry: { $in: interests } } : {};

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
