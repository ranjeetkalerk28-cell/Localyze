const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const CITIES = require('../constants/cities');
const { USERNAME_REGEX } = require('../constants/username');

const businessSchema = new mongoose.Schema(
  {
    businessName: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true, match: USERNAME_REGEX },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    industry: { type: String, default: '' },
    description: { type: String, default: '' },
    logoUrl: { type: String, default: '' },
    address: { type: String, default: '', trim: true, maxlength: 100 }, // short: shop no, street, area, city
    mapsUrl: { type: String, default: '', trim: true }, // Google Maps link, validated in the controller
    phone: { type: String, default: '', trim: true }, // contact number, normalised + validated in the controller (constants/phone.js)
    city: { type: String, required: true, enum: CITIES, index: true }, // default location, edited in Settings
    currentCity: { type: String, enum: CITIES }, // quick-switch location; drives discovery when set
  },
  { timestamps: true }
);

businessSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

businessSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Business', businessSchema);
