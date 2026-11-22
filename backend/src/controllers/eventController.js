const mongoose = require('mongoose');
const Event = require('../models/Event');
const cloudinary = require('../config/cloudinary');
const CITIES = require('../constants/cities');
const EVENT_CATEGORIES = require('../constants/eventCategories');
const { currentCityOf } = require('../utils/location');
const { eventVisibleFilter } = require('../utils/eventVisibility');
const { addDays, istDateString, istInstant } = require('../utils/eventTime');
const { validateEventInput } = require('../utils/eventValidation');

const BUSINESS_FIELDS = 'businessName username logoUrl';
const EDITABLE_FIELDS = [
  'name', 'description', 'category', 'imageUrl', 'imagePublicId',
  'startDate', 'endDate', 'timeMode', 'startTime', 'endTime',
  'venueName', 'address', 'city', 'mapsUrl',
  'entryType', 'passes', 'bookingUrl', 'contactEmail', 'contactPhone',
];

const destroyPoster = async (publicId, eventId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Failed to delete Cloudinary asset for event', eventId, error.message);
  }
};

// @desc    Create an event (business only)
// @route   POST /api/events
const createEvent = async (req, res) => {
  try {
    const { error, value } = validateEventInput(req.body, { requireNotEnded: true });
    if (error) return res.status(400).json({ message: error });

    const event = await Event.create({ ...value, business: req.business._id });
    res.status(201).json(await event.populate('business', BUSINESS_FIELDS));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    List events that have not ended yet (upcoming and ongoing), soonest
//          first. Scoped to the account's current city unless `city` or
//          `business` is given.
// @route   GET /api/events?city=&when=all|today|week&category=&free=true&business=&page=&limit=
const listEvents = async (req, res) => {
  try {
    const account = req.role === 'business' ? req.business : req.user;
    const now = new Date();
    const filter = eventVisibleFilter(now);

    if (req.query.business) {
      if (!mongoose.isValidObjectId(req.query.business)) return res.status(400).json({ message: 'Invalid business' });
      filter.business = req.query.business;
    } else {
      const city = req.query.city || currentCityOf(account);
      if (!CITIES.includes(city)) return res.status(400).json({ message: 'A valid city is required' });
      filter.city = city;
    }

    if (req.query.category) {
      if (!EVENT_CATEGORIES.includes(req.query.category)) return res.status(400).json({ message: 'Invalid category' });
      filter.category = req.query.category;
    }
    if (req.query.free === 'true') filter.entryType = 'free';

    // "today" / "week" mean: starts before the end of that period. Events
    // already underway (including overnight ones that began yesterday) still
    // qualify because the endsAt check above keeps only those not yet over.
    const today = istDateString(now);
    if (req.query.when === 'today') filter.startsAt = { $lt: istInstant(addDays(today, 1)) };
    else if (req.query.when === 'week') filter.startsAt = { $lt: istInstant(addDays(today, 7)) };
    else if (req.query.when && req.query.when !== 'all') return res.status(400).json({ message: 'Invalid time filter' });

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 30, 1), 100);
    const events = await Event.find(filter)
      .populate('business', BUSINESS_FIELDS)
      .sort({ startsAt: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit);
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get one event (also after it has ended, for direct links)
// @route   GET /api/events/:id
const getEventById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Event not found' });
    const event = await Event.findOne({ _id: req.params.id, status: 'active' }).populate('business', BUSINESS_FIELDS);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update an event (business only, must be the owner)
// @route   PUT /api/events/:id
const updateEvent = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Event not found' });
    const event = await Event.findOne({ _id: req.params.id, status: 'active' });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.business.toString() !== req.business._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this event' });
    }

    // Validate the whole event as it would look after the edit.
    const merged = event.toObject();
    for (const field of EDITABLE_FIELDS) {
      if (req.body[field] !== undefined) merged[field] = req.body[field];
    }
    const { error, value } = validateEventInput(merged);
    if (error) return res.status(400).json({ message: error });

    const previousPoster = event.imagePublicId;
    Object.assign(event, value);
    const updated = await event.save();
    if (previousPoster && previousPoster !== updated.imagePublicId) await destroyPoster(previousPoster, event._id);

    res.json(await updated.populate('business', BUSINESS_FIELDS));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete an event (business only, must be the owner): soft-delete plus
//          Cloudinary poster cleanup, like posts.
// @route   DELETE /api/events/:id
const deleteEvent = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Event not found' });
    const event = await Event.findOne({ _id: req.params.id, status: 'active' });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.business.toString() !== req.business._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this event' });
    }

    event.status = 'deleted';
    event.deletedAt = new Date();
    await event.save();
    await destroyPoster(event.imagePublicId, event._id);

    res.json({ message: 'Event deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createEvent, listEvents, getEventById, updateEvent, deleteEvent };
