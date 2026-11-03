// Shared Mongo filter for posts that are visible right now: not expired,
// and -- for offers with a validFrom -- already started. Used anywhere a
// feed, story rail, or notification list queries Post so the two date
// fields stay enforced consistently.
const visibleNowFilter = () => ({
  $and: [
    { $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] },
    { $or: [{ validFrom: null }, { validFrom: { $lte: new Date() } }] },
  ],
});

module.exports = { visibleNowFilter };
