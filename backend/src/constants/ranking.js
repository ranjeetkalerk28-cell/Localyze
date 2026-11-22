// Explore ranking weights -- the single source of truth for how a post's
// score is built. Every term is additive, so each one doubles as a
// human-readable reason shown on the post ("transparent criteria").
//
//   score = interest match      x INTEREST
//         + business affinity   x BUSINESS_LIKE   (capped at BUSINESS_LIKE_CAP likes)
//         + industry affinity   x INDUSTRY_SIGNAL (capped at INDUSTRY_SIGNAL_CAP signals)
//         + POPULARITY x log10(1 + total likes)
//         + FRESHNESS  x 1 / (1 + ageHours / FRESHNESS_HALF_LIFE_HOURS)
//
// INTEREST (3) is deliberately larger than the most FRESHNESS can add (2),
// so a declared interest still beats "slightly newer" for a new account
// with no activity yet.
module.exports = {
  ACTIVITY_WINDOW_DAYS: 30,

  INTEREST: 3,
  BUSINESS_LIKE: 1,
  BUSINESS_LIKE_CAP: 3,
  INDUSTRY_SIGNAL: 0.5,
  INDUSTRY_SIGNAL_CAP: 4, // 4 x 0.5 = at most 2 points
  POPULARITY: 1,
  FRESHNESS: 2,
  FRESHNESS_HALF_LIFE_HOURS: 48,

  // Thresholds for the reason chips (not part of the score itself).
  POPULAR_MIN_LIKES: 3,
  NEW_MAX_AGE_HOURS: 24,
};
