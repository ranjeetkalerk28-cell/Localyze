const mongoose = require('mongoose');

const collaborationSchema = new mongoose.Schema(
  {
    requester: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    message: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Collaboration', collaborationSchema);
