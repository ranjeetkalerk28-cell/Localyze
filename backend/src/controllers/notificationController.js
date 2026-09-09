const Notification = require('../models/Notification');

const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .populate({ path: 'post', populate: { path: 'business', select: 'businessName logoUrl industry' } })
      .sort({ createdAt: -1 })
      .limit(50);

    // An offer notification shares its expiry with the post itself — once
    // that passes, or the post is deleted, the notification is hidden too.
    const visible = notifications.filter((notification) => {
      const post = notification.post;
      if (!post || post.status === 'deleted') return false;
      if (post.postType !== 'offer' || !post.expiresAt) return true;
      return new Date(post.expiresAt) > new Date();
    });

    res.json(visible);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getNotifications, markNotificationRead };
