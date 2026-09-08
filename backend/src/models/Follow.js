const mongoose = require('mongoose');

const followSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  },
  { timestamps: true }
);

followSchema.index({ user: 1, business: 1 }, { unique: true });
followSchema.index({ business: 1, createdAt: -1 });
followSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Follow', followSchema);
