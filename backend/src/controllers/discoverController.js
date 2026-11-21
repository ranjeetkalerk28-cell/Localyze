const Post = require('../models/Post');
const Business = require('../models/Business');
const Follow = require('../models/Follow');
const { visibleNowFilter } = require('../utils/postVisibility');
const { currentCityOf } = require('../utils/location');

// @desc    Return posts from businesses the logged-in consumer follows
//          (newest first). No fallback to other posts yet -- an empty
//          follow list means an empty feed, by product decision; Explore
//          covers city-based discovery.
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
      ...visibleNowFilter(),
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

const lowerInterests = (interests) => (interests || []).map((interest) => interest.toLowerCase());

// @desc    Explore: posts from businesses in the account's current city,
//          regardless of follow status. Businesses whose industry matches
//          the account's interests rank first, then newest first.
// @route   GET /api/discover/explore
const discoverExplore = async (req, res) => {
  try {
    const account = req.role === 'business' ? req.business : req.user;
    const interests = lowerInterests(req.role === 'business' ? [account.industry].filter(Boolean) : account.interests);
    const city = currentCityOf(account);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    if (!city) return res.json([]);

    const businessQuery = { city };
    if (req.role === 'business') businessQuery._id = { $ne: account._id };
    const localBusinesses = await Business.find(businessQuery).select('_id industry').lean();
    if (localBusinesses.length === 0) return res.json([]);
    const interestMatchIds = localBusinesses
      .filter((business) => interests.includes((business.industry || '').toLowerCase()))
      .map((business) => business._id);

    const visibility = req.role === 'business'
      ? { $in: ['consumers_and_businesses', 'businesses_only', null] }
      : { $in: ['consumers_and_businesses', null] };
    // Rank in the database so pagination stays consistent, then load full
    // documents (aggregate drops the offerStatus virtual).
    const ranked = await Post.aggregate([
      {
        $match: {
          status: 'active',
          visibility,
          business: { $in: localBusinesses.map((business) => business._id) },
          ...visibleNowFilter(),
        },
      },
      { $addFields: { interestMatch: { $cond: [{ $in: ['$business', interestMatchIds] }, 1, 0] } } },
      { $sort: { interestMatch: -1, createdAt: -1, _id: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      { $project: { _id: 1 } },
    ]);
    const posts = await Post.find({ _id: { $in: ranked.map((post) => post._id) } })
      .populate('business', 'businessName logoUrl industry');
    const postsById = new Map(posts.map((post) => [post._id.toString(), post]));

    res.json(ranked.map((post) => postsById.get(post._id.toString())).filter(Boolean));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Discover businesses in the user's current city, interest matches first
// @route   GET /api/discover/businesses
const discoverBusinesses = async (req, res) => {
  try {
    const interests = lowerInterests(req.user.interests);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const businesses = await Business.aggregate([
      { $match: { city: currentCityOf(req.user) } },
      { $addFields: { interestMatch: { $cond: [{ $in: [{ $toLower: { $ifNull: ['$industry', ''] } }, interests] }, 1, 0] } } },
      { $sort: { interestMatch: -1, createdAt: -1, _id: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      { $project: { password: 0, interestMatch: 0 } },
    ]);

    const follows = await Follow.find({ user: req.user._id }).select('business');
    const followedIds = new Set(follows.map((follow) => follow.business.toString()));
    res.json(businesses.map((business) => ({
      ...business,
      following: followedIds.has(business._id.toString()),
    })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { discoverPosts, discoverExplore, discoverBusinesses };
