const Business = require('../models/Business');
const Follow = require('../models/Follow');
const Connection = require('../models/Connection');
const Collaboration = require('../models/Collaboration');
const Post = require('../models/Post');

// @desc    Search businesses by name/industry, filtered by city (defaults to the caller's own city)
// @route   GET /api/businesses/search
const searchBusinesses = async (req, res) => {
  try {
    const { q = '' } = req.query;
    const city = req.query.city || req.user?.city || req.business?.city;

    const query = {};
    if (city) query.city = city;
    if (q.trim()) {
      query.$or = [
        { businessName: { $regex: q.trim(), $options: 'i' } },
        { industry: { $regex: q.trim(), $options: 'i' } },
      ];
    }

    const businesses = await Business.find(query)
      .select('businessName username industry logoUrl city')
      .sort({ businessName: 1 })
      .limit(30);

    res.json(businesses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a single business's public profile, with follower/connection/collaboration counts
// @route   GET /api/businesses/:id
const getBusinessById = async (req, res) => {
  try {
    const { id } = req.params;
    const business = await Business.findById(id).select('businessName username industry description logoUrl city createdAt');
    if (!business) return res.status(404).json({ message: 'Business not found' });

    const acceptedEitherDirection = { status: 'accepted', $or: [{ requester: id }, { recipient: id }] };
    const [followersCount, connectionsCount, collaborationsCount] = await Promise.all([
      Follow.countDocuments({ business: id }),
      Connection.countDocuments(acceptedEitherDirection),
      Collaboration.countDocuments(acceptedEitherDirection),
    ]);

    res.json({ ...business.toObject(), followersCount, connectionsCount, collaborationsCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    List a business's followers
// @route   GET /api/businesses/:id/followers
const getBusinessFollowers = async (req, res) => {
  try {
    const follows = await Follow.find({ business: req.params.id })
      .populate('user', 'name avatarUrl')
      .sort({ createdAt: -1 });
    res.json(follows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    List a business's accepted connections
// @route   GET /api/businesses/:id/connections
const getBusinessConnections = async (req, res) => {
  try {
    const { id } = req.params;
    const connections = await Connection.find({ status: 'accepted', $or: [{ requester: id }, { recipient: id }] })
      .populate('requester', 'businessName logoUrl industry')
      .populate('recipient', 'businessName logoUrl industry')
      .sort({ createdAt: -1 });

    const otherBusinesses = connections.map((connection) =>
      connection.requester._id.toString() === id ? connection.recipient : connection.requester
    );
    res.json(otherBusinesses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    List a business's posts, optionally filtered by postType, visibility-aware
// @route   GET /api/businesses/:id/posts
const getBusinessPosts = async (req, res) => {
  try {
    const { id } = req.params;
    const { postType } = req.query;

    let canSeeAll = false;
    if (req.role === 'business') {
      if (req.business._id.toString() === id) {
        canSeeAll = true;
      } else {
        const connection = await Connection.findOne({
          status: 'accepted',
          $or: [
            { requester: req.business._id, recipient: id },
            { requester: id, recipient: req.business._id },
          ],
        });
        canSeeAll = Boolean(connection);
      }
    }

    const query = { business: id, status: 'active' };
    if (postType) query.postType = postType;
    if (!canSeeAll) query.visibility = 'consumers_and_businesses';

    const posts = await Post.find(query)
      .populate('business', 'businessName logoUrl industry')
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { searchBusinesses, getBusinessById, getBusinessFollowers, getBusinessConnections, getBusinessPosts };
