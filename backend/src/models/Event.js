const mongoose = require('mongoose');
const CITIES = require('../constants/cities');
const EVENT_CATEGORIES = require('../constants/eventCategories');
const { computeEventWindow } = require('../utils/eventTime');

const passSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    price: { type: Number, required: true, min: 0, max: 100000 }, // whole rupees
    note: { type: String, default: '', trim: true, maxlength: 100 },
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    category: { type: String, enum: EVENT_CATEGORIES, default: 'other' },
    imageUrl: { type: String, default: '' },
    imagePublicId: { type: String, default: '' }, // Cloudinary asset id, needed to destroy the poster on delete

    // What the organiser enters (IST calendar dates / wall-clock times). A
    // single-day event has endDate === startDate.
    startDate: { type: String, required: true }, // YYYY-MM-DD
    endDate: { type: String, required: true },
    timeMode: { type: String, enum: ['all_day', 'daily_hours'], default: 'all_day' },
    startTime: { type: String, default: '' }, // HH:mm, daily_hours only
    endTime: { type: String, default: '' }, // may be earlier than startTime: overnight, ends the next morning

    // Derived from the fields above on every save (utils/eventTime.js). These
    // drive visibility, sorting and filtering.
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },

    // Location can differ from the organiser's own address.
    venueName: { type: String, required: true, trim: true, maxlength: 100 },
    address: { type: String, default: '', trim: true, maxlength: 150 },
    city: { type: String, required: true, enum: CITIES },
    mapsUrl: { type: String, default: '', trim: true },

    // Entry: information only, there is no payment or booking in Localyze.
    entryType: { type: String, enum: ['free', 'paid'], default: 'free' },
    passes: { type: [passSchema], default: [] },
    bookingUrl: { type: String, default: '', trim: true },

    // Can be the business's own contact details or different ones.
    contactEmail: { type: String, default: '', trim: true, lowercase: true },
    contactPhone: { type: String, default: '', trim: true },

    status: { type: String, enum: ['active', 'deleted'], default: 'active' },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

eventSchema.index({ status: 1, city: 1, endsAt: 1 });
eventSchema.index({ business: 1, status: 1, endsAt: 1 });

eventSchema.pre('validate', function (next) {
  if (this.startDate && this.endDate) {
    const { startsAt, endsAt } = computeEventWindow(this);
    this.startsAt = startsAt;
    this.endsAt = endsAt;
  }
  next();
});

// Derived, never stored, so it cannot drift from startsAt/endsAt.
eventSchema.virtual('eventStatus').get(function () {
  const now = Date.now();
  if (this.endsAt.getTime() <= now) return 'ended';
  if (this.startsAt.getTime() > now) return 'upcoming';
  return 'ongoing';
});

module.exports = mongoose.model('Event', eventSchema);
