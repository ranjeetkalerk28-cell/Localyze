const mongoose = require('mongoose');

const pairKey = (first, second) => [String(first), String(second)].sort().join(':');

const connectionSchema = new mongoose.Schema(
  {
    requester: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    pairKey: { type: String, required: true, select: false },
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
connectionSchema.index({ pairKey: 1 }, {
  name: 'unique_keyed_open_connection_pair',
  unique: true,
  partialFilterExpression: { pairKey: { $type: 'string' }, status: { $in: ['pending', 'accepted'] } },
});

connectionSchema.pre('validate', function () {
  if (this.requester && this.recipient) {
    this.pairKey = pairKey(this.requester, this.recipient);
  }
});

connectionSchema.set('toJSON', {
  transform(_document, result) {
    delete result.pairKey;
  },
});

connectionSchema.statics.pairKey = pairKey;

// Older records only have participant IDs. Match both generations on reads and upgrades.
connectionSchema.statics.openPair = (first, second) => ({
  status: { $in: ['pending', 'accepted'] },
  $or: [{ requester: first, recipient: second }, { requester: second, recipient: first }],
});

connectionSchema.statics.viewerStatus = function (connection, viewer) {
  if (!connection) return 'none';
  if (connection.status === 'accepted') return 'connected';
  return connection.requester.equals(viewer) ? 'pending_sent' : 'pending_received';
};

connectionSchema.statics.acceptForCollaboration = async function (requester, recipient, session) {
  const key = pairKey(requester, recipient);
  const filter = this.openPair(requester, recipient);
  const update = {
    $set: { status: 'accepted', pairKey: key },
    $setOnInsert: { requester, recipient },
  };
  await this.updateOne(filter, update, { upsert: true, session });
};

module.exports = mongoose.model('Connection', connectionSchema);
