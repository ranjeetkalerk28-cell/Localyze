const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    // Exactly one of user/business is set, depending on who commented.
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', default: null },
    content: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

commentSchema.pre('validate', function (next) {
  if (!this.user && !this.business) return next(new Error('Comment must have an author'));
  if (this.user && this.business) return next(new Error('Comment cannot have two authors'));
  next();
});

commentSchema.index({ post: 1, createdAt: -1 });

module.exports = mongoose.model('Comment', commentSchema);
