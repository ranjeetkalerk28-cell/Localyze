const mongoose = require('mongoose');
const Follow = require('../models/Follow');
const Business = require('../models/Business');

const isValidBusinessId = (businessId) => mongoose.isValidObjectId(businessId);

const followBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;
    if (!isValidBusinessId(businessId)) return res.status(400).json({ message: 'Invalid business id' });

    const business = await Business.findById(businessId).select('_id');
    if (!business) return res.status(404).json({ message: 'Business not found' });

    const follow = await Follow.create({ user: req.user._id, business: businessId });
    res.status(201).json({ following: true, follow });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Already following this business', following: true });
    res.status(500).json({ message: error.message });
  }
};

const unfollowBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;
    if (!isValidBusinessId(businessId)) return res.status(400).json({ message: 'Invalid business id' });

    const result = await Follow.findOneAndDelete({ user: req.user._id, business: businessId });
    if (!result) return res.status(404).json({ message: 'Follow relationship not found', following: false });
    res.json({ following: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getFollowStatus = async (req, res) => {
  try {
    const { businessId } = req.params;
    if (!isValidBusinessId(businessId)) return res.status(400).json({ message: 'Invalid business id' });

    const following = await Follow.exists({ user: req.user._id, business: businessId });
    res.json({ following: Boolean(following) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getFollowingBusinesses = async (req, res) => {
  try {
    const follows = await Follow.find({ user: req.user._id })
      .populate('business', 'businessName logoUrl industry description')
      .sort({ createdAt: -1 });
    res.json(follows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { followBusiness, unfollowBusiness, getFollowStatus, getFollowingBusinesses };
