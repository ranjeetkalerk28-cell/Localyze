const CITIES = require('../constants/cities');

// @desc    List supported cities, used by registration, profile, and search filters
// @route   GET /api/meta/cities
const getCities = (req, res) => {
  res.json(CITIES);
};

module.exports = { getCities };
