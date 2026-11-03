const Post = require('../models/Post');
const Follow = require('../models/Follow');
const Connection = require('../models/Connection');
const { visibleNowFilter } = require('../utils/postVisibility');

const getStories = async (req, res) => {
  try {
    let businessIds = [];

    if (req.role === 'user') {
      const follows = await Follow.find({ user: req.user._id }).select('business');
      businessIds = follows.map((follow) => follow.business);
    } else if (req.role === 'business') {
      const connections = await Connection.find({
        status: 'accepted',
        $or: [{ requester: req.business._id }, { recipient: req.business._id }],
      }).select('requester recipient');
      businessIds = connections.map((connection) => (
        connection.requester.toString() === req.business._id.toString()
          ? connection.recipient
          : connection.requester
      ));
    }

    if (!businessIds.length) return res.json([]);

    const visibility = req.role === 'user'
      ? { $in: ['consumers_and_businesses', null] }
      : { $in: ['consumers_and_businesses', 'businesses_only', null] };

    const posts = await Post.find({
      business: { $in: businessIds },
      visibility,
      status: 'active',
      ...visibleNowFilter(),
    })
      .populate('business', 'businessName logoUrl industry')
      .sort({ createdAt: -1 })
      .limit(50);

    const latestByBusiness = [];
    const seenBusinesses = new Set();
    for (const post of posts) {
      const businessId = post.business?._id?.toString();
      if (!businessId || seenBusinesses.has(businessId)) continue;
      seenBusinesses.add(businessId);
      latestByBusiness.push(post);
      if (latestByBusiness.length === 12) break;
    }

    res.json(latestByBusiness);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getStories };
