const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    postType: {
      type: String,
      enum: ['offer', 'promotion', 'collaboration'],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    imageUrl: { type: String, default: '' },
    tags: [{ type: String }], // useful for discover matching against user interests
    expiresAt: { type: Date, default: null },
    collaborationRequirements: { type: String, default: '' },
    visibility: {
      type: String,
      enum: ['consumers_and_businesses', 'businesses_only'],
      default: 'consumers_and_businesses',
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Post', postSchema);
