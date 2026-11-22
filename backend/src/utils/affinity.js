const Activity = require('../models/Activity');
const Business = require('../models/Business');
const { ACTIVITY_WINDOW_DAYS } = require('../constants/ranking');

const DAY_MS = 24 * 60 * 60 * 1000;

// Reads a consumer's recent Activity log and turns it into two affinity maps:
//   businessLikes:  businessId -> number of that business's posts the user
//                   currently likes (liked within the window, not unliked since)
//   industrySignals: lowercased industry -> current likes + current follows
//                   for businesses in that industry
// Only the LATEST event per post (like/unlike) and per business
// (follow/unfollow) counts, so "like then unlike" nets to nothing.
const buildAffinity = async (userId) => {
  const since = new Date(Date.now() - ACTIVITY_WINDOW_DAYS * DAY_MS);

  const latest = await Activity.aggregate([
    { $match: { user: userId, createdAt: { $gte: since } } },
    { $sort: { createdAt: -1, _id: -1 } },
    {
      $group: {
        // Likes are keyed per post, follows per business, so the two kinds
        // of event never overwrite each other.
        _id: {
          kind: { $cond: [{ $in: ['$type', ['like', 'unlike']] }, 'like', 'follow'] },
          target: { $cond: [{ $in: ['$type', ['like', 'unlike']] }, '$post', '$business'] },
        },
        type: { $first: '$type' },
        business: { $first: '$business' },
      },
    },
    { $match: { type: { $in: ['like', 'follow'] } } },
  ]);

  const businessLikes = new Map();
  const businessSignals = new Map();
  for (const event of latest) {
    if (!event.business) continue;
    const id = event.business.toString();
    businessSignals.set(id, (businessSignals.get(id) || 0) + 1);
    if (event.type === 'like') businessLikes.set(id, (businessLikes.get(id) || 0) + 1);
  }

  // Liked/followed businesses can be in any city, so look their industries up
  // directly rather than relying on the caller's local-business list.
  const businesses = await Business.find({ _id: { $in: [...businessSignals.keys()] } })
    .select('industry')
    .lean();
  const industrySignals = new Map();
  for (const business of businesses) {
    const industry = (business.industry || '').toLowerCase();
    if (!industry) continue;
    const signals = businessSignals.get(business._id.toString());
    industrySignals.set(industry, (industrySignals.get(industry) || 0) + signals);
  }

  return { businessLikes, industrySignals };
};

module.exports = { buildAffinity };
