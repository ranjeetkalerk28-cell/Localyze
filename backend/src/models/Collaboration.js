const mongoose = require('mongoose');

const collaborationSchema = new mongoose.Schema(
  {
    requester: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    requestKey: { type: String, select: false },
    message: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'active', 'completed', 'rejected', 'accepted'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

// Legacy pending requests remain readable, including any pre-existing duplicates.
collaborationSchema.index({ requestKey: 1 }, {
  unique: true,
  partialFilterExpression: { status: 'pending', requestKey: { $type: 'string' } },
});

module.exports = mongoose.model('Collaboration', collaborationSchema);
