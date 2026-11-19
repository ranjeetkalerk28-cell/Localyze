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
  name: 'unique_open_connection_pair',
  unique: true,
  partialFilterExpression: { status: { $in: ['pending', 'accepted'] } },
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

connectionSchema.statics.acceptForCollaboration = async function (requester, recipient, session) {
  const key = pairKey(requester, recipient);
  const filter = { pairKey: key, status: { $in: ['pending', 'accepted'] } };
  const update = {
    $set: { status: 'accepted' },
    $setOnInsert: { requester, recipient },
  };
  await this.updateOne(filter, update, { upsert: true, session });
};

module.exports = mongoose.model('Connection', connectionSchema);
