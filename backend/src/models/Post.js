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
    imagePublicId: { type: String, default: '' }, // Cloudinary public ID, needed to destroy the asset on delete
    tags: [{ type: String }], // useful for discover matching against user interests
    expiresAt: { type: Date, default: null }, // also serves as an offer's "valid until"
    validFrom: { type: Date, default: null }, // offer-only: when the offer becomes valid
    collaborationRequirements: { type: String, default: '' },
    visibility: {
      type: String,
      enum: ['consumers_and_businesses', 'businesses_only'],
      default: 'consumers_and_businesses',
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    businessLikes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Business' }],
    status: { type: String, enum: ['active', 'deleted'], default: 'active' },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

postSchema.index({ business: 1, status: 1, createdAt: -1 });

// Derived, not stored — so it can never drift out of sync with expiresAt/validFrom.
postSchema.virtual('offerStatus').get(function () {
  if (this.postType !== 'offer') return undefined;
  if (this.expiresAt && this.expiresAt.getTime() <= Date.now()) return 'expired';
  if (this.validFrom && this.validFrom.getTime() > Date.now()) return 'upcoming';
  return 'active';
});

module.exports = mongoose.model('Post', postSchema);
