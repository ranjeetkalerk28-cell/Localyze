const mongoose = require('mongoose');

const connectionSchema = new mongoose.Schema(
  {
    requester: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

connectionSchema.index({ requester: 1, status: 1 });
connectionSchema.index({ recipient: 1, status: 1 });

module.exports = mongoose.model('Connection', connectionSchema);
