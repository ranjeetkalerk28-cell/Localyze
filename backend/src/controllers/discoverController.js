const Post = require('../models/Post');
const Business = require('../models/Business');
const Follow = require('../models/Follow');
const { visibleNowFilter } = require('../utils/postVisibility');
const { currentCityOf } = require('../utils/location');
const { buildAffinity } = require('../utils/affinity');
const RANKING = require('../constants/ranking');

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

const HOUR_MS = 60 * 60 * 1000;

// Human-readable reasons for a ranked post, most personal first. They mirror
// the score terms in constants/ranking.js, so what the card says is exactly
// what moved the post up.
const rankReasonsFor = (post, { isBusiness, interests, businessLikes, industrySignals, city }) => {
  const reasons = [];
  const businessId = (post.business?._id || post.business).toString();
  const industry = post.business?.industry || '';
  const industryKey = industry.toLowerCase();

  if (industryKey && interests.includes(industryKey)) {
    reasons.push(isBusiness ? 'In your industry' : 'Matches your interests');
  }
  if (businessLikes.has(businessId)) {
    reasons.push('You liked posts from this business');
  } else if (industryKey && industrySignals.has(industryKey)) {
    reasons.push(`You often engage with ${industry}`);
  }
  const likeCount = (post.likes?.length || 0) + (post.businessLikes?.length || 0);
  if (likeCount >= RANKING.POPULAR_MIN_LIKES) reasons.push(`Popular in ${city}`);
  if (Date.now() - new Date(post.createdAt).getTime() < RANKING.NEW_MAX_AGE_HOURS * HOUR_MS) {
    reasons.push('New today');
  }
  return reasons;
};

// @desc    Explore: posts from businesses in the account's current city,
//          regardless of follow status, ranked by a transparent score:
//          interest match + the consumer's recent likes/follows (Activity
//          log) + popularity + freshness. See constants/ranking.js for the
//          weights. Each post carries `rankReasons` explaining its position.
// @route   GET /api/discover/explore
const discoverExplore = async (req, res) => {
  try {
    const isBusiness = req.role === 'business';
    const account = isBusiness ? req.business : req.user;
    const interests = lowerInterests(isBusiness ? [account.industry].filter(Boolean) : account.interests);
    const city = currentCityOf(account);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    if (!city) return res.json([]);

    const businessQuery = { city };
    if (isBusiness) businessQuery._id = { $ne: account._id };
    const localBusinesses = await Business.find(businessQuery).select('_id industry').lean();
    if (localBusinesses.length === 0) return res.json([]);

    // Activity is a consumer-only log, so businesses rank on industry,
    // popularity and freshness alone.
    const { businessLikes, industrySignals } = isBusiness
      ? { businessLikes: new Map(), industrySignals: new Map() }
      : await buildAffinity(account._id);

    // Per-business part of the score, computed here (small: one city's
    // businesses) and handed to the pipeline as two parallel arrays.
    const baseIds = [];
    const baseScores = [];
    for (const business of localBusinesses) {
      const industry = (business.industry || '').toLowerCase();
      const likes = Math.min(businessLikes.get(business._id.toString()) || 0, RANKING.BUSINESS_LIKE_CAP);
      const signals = Math.min(industrySignals.get(industry) || 0, RANKING.INDUSTRY_SIGNAL_CAP);
      const base = (interests.includes(industry) ? RANKING.INTEREST : 0)
        + likes * RANKING.BUSINESS_LIKE
        + signals * RANKING.INDUSTRY_SIGNAL;
      if (base > 0) {
        baseIds.push(business._id);
        baseScores.push(base);
      }
    }

    const visibility = isBusiness
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
      {
        $addFields: {
          baseIndex: { $indexOfArray: [baseIds, '$business'] },
          likeCount: { $add: [{ $size: { $ifNull: ['$likes', []] } }, { $size: { $ifNull: ['$businessLikes', []] } }] },
          ageHours: { $max: [0, { $divide: [{ $subtract: ['$$NOW', '$createdAt'] }, HOUR_MS] }] },
        },
      },
      {
        $addFields: {
          score: {
            $add: [
              { $cond: [{ $gte: ['$baseIndex', 0] }, { $arrayElemAt: [baseScores, '$baseIndex'] }, 0] },
              { $multiply: [RANKING.POPULARITY, { $log10: { $add: [1, '$likeCount'] } }] },
              {
                $divide: [
                  RANKING.FRESHNESS,
                  { $add: [1, { $divide: ['$ageHours', RANKING.FRESHNESS_HALF_LIFE_HOURS] }] },
                ],
              },
            ],
          },
        },
      },
      { $sort: { score: -1, createdAt: -1, _id: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      { $project: { _id: 1 } },
    ]);
    const posts = await Post.find({ _id: { $in: ranked.map((post) => post._id) } })
      .populate('business', 'businessName logoUrl industry');
    const postsById = new Map(posts.map((post) => [post._id.toString(), post]));
    const context = { isBusiness, interests, businessLikes, industrySignals, city };

    res.json(ranked
      .map((post) => postsById.get(post._id.toString()))
      .filter(Boolean)
      .map((post) => ({ ...post.toJSON(), rankReasons: rankReasonsFor(post, context) })));
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
