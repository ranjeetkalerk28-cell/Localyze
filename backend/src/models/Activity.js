const mongoose = require('mongoose');

// Timestamped consumer engagement log (likes, follows) — the signal the
// future Explore page's ranking will need ("recent activity") that neither
// Post.likes (no per-like timestamp) nor Follow (relationship, not a log
// entry — overwritten by unfollow) can answer on their own. Purely additive:
// it doesn't change any existing collection, so it can be introduced at any
// time without migrating current data.
const activitySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['like', 'unlike', 'follow', 'unfollow'], required: true },
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', default: null },
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
  },
  { timestamps: true }
);

activitySchema.index({ user: 1, createdAt: -1 });
activitySchema.index({ business: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);
