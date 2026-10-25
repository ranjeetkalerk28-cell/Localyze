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
    city: { type: String, required: true, enum: CITIES, index: true }, // drives city-scoped discovery/search
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
