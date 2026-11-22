const User = require('../models/User');
const Business = require('../models/Business');
const Post = require('../models/Post');
const Event = require('../models/Event');
const Follow = require('../models/Follow');
const SavedPost = require('../models/SavedPost');
const Notification = require('../models/Notification');
const Activity = require('../models/Activity');
const Comment = require('../models/Comment');
const Connection = require('../models/Connection');
const Collaboration = require('../models/Collaboration');
const cloudinary = require('../config/cloudinary');
const CITIES = require('../constants/cities');

const isBusiness = (req) => req.role === 'business';
const accountOf = (req) => (isBusiness(req) ? req.business : req.user);

// req.user / req.business are loaded without the password hash, so re-fetch it to verify.
const loadWithPassword = (req) => (isBusiness(req) ? Business : User).findById(accountOf(req)._id);

// @desc    Set the logged-in account's current (quick-switch) location
// @route   PUT /api/user/auth/location, PUT /api/business/auth/location
const updateCurrentLocation = async (req, res) => {
  try {
    if (!CITIES.includes(req.body.city)) return res.status(400).json({ message: 'A valid city is required' });
    const account = accountOf(req);
    account.currentCity = req.body.city;
    res.json(await account.save());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Change the logged-in account's password
// @route   PUT /api/user/auth/password, PUT /api/business/auth/password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }
    const account = await loadWithPassword(req);
    if (!(await account.matchPassword(currentPassword || ''))) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    account.password = newPassword;
    await account.save();
    res.json({ message: 'Password updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteUserData = async (userId) => {
  await Promise.all([
    Follow.deleteMany({ user: userId }),
    SavedPost.deleteMany({ user: userId }),
    Notification.deleteMany({ user: userId }),
    Activity.deleteMany({ user: userId }),
    Comment.deleteMany({ user: userId }),
    Post.updateMany({ likes: userId }, { $pull: { likes: userId } }),
  ]);
};

const deleteBusinessData = async (businessId) => {
  const posts = await Post.find({ business: businessId }).select('_id imagePublicId').lean();
  const postIds = posts.map((post) => post._id);
  const events = await Event.find({ business: businessId }).select('_id imagePublicId').lean();
  await Promise.all([
    Comment.deleteMany({ $or: [{ post: { $in: postIds } }, { business: businessId }] }),
    SavedPost.deleteMany({ post: { $in: postIds } }),
    Notification.deleteMany({ post: { $in: postIds } }),
    Activity.deleteMany({ $or: [{ post: { $in: postIds } }, { business: businessId }] }),
    Follow.deleteMany({ business: businessId }),
    Connection.deleteMany({ $or: [{ requester: businessId }, { recipient: businessId }] }),
    Collaboration.deleteMany({ $or: [{ requester: businessId }, { recipient: businessId }] }),
    Post.updateMany({ businessLikes: businessId }, { $pull: { businessLikes: businessId } }),
    Post.deleteMany({ business: businessId }),
    Event.deleteMany({ business: businessId }),
  ]);
  await Promise.all([...posts, ...events].filter((item) => item.imagePublicId).map(async (item) => {
    try {
      await cloudinary.uploader.destroy(item.imagePublicId);
    } catch (cloudinaryError) {
      console.error('Failed to delete Cloudinary asset for', item._id, cloudinaryError.message);
    }
  }));
};

// @desc    Permanently delete the logged-in account and everything it owns
// @route   DELETE /api/user/auth/me, DELETE /api/business/auth/me
const deleteAccount = async (req, res) => {
  try {
    const account = await loadWithPassword(req);
    if (!(await account.matchPassword(req.body.password || ''))) {
      return res.status(400).json({ message: 'Password is incorrect' });
    }
    if (isBusiness(req)) await deleteBusinessData(account._id);
    else await deleteUserData(account._id);
    await account.deleteOne();
    res.json({ message: 'Account deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { updateCurrentLocation, changePassword, deleteAccount };
