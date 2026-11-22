const CITIES = require('../constants/cities');
const EVENT_CATEGORIES = require('../constants/eventCategories');
const { isValidMapsUrl } = require('../constants/mapsUrl');
const { normalizePhone, isValidPhone } = require('../constants/phone');
const {
  computeEventWindow,
  daysBetween,
  isValidDateString,
  isValidTimeString,
} = require('./eventTime');

const MAX_DURATION_DAYS = 60;
const MAX_PASSES = 6;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const text = (value) => (typeof value === 'string' ? value.trim() : '');
const fail = (message) => ({ error: message });

const isValidBookingUrl = (value) => {
  if (value.length > 500) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
};

const validatePasses = (input) => {
  if (!Array.isArray(input) || input.length === 0) return fail('A paid event needs at least one pass');
  if (input.length > MAX_PASSES) return fail(`An event can have at most ${MAX_PASSES} passes`);
  const passes = [];
  for (const raw of input) {
    const name = text(raw?.name);
    const note = text(raw?.note);
    const price = typeof raw?.price === 'string' && raw.price.trim() !== '' ? Number(raw.price) : raw?.price;
    if (!name || name.length > 40) return fail('Each pass needs a name of up to 40 characters');
    if (!Number.isInteger(price) || price < 0 || price > 100000) {
      return fail('Pass prices must be whole rupees between 0 and 1,00,000');
    }
    if (note.length > 100) return fail('Pass notes must be 100 characters or fewer');
    passes.push({ name, price, note });
  }
  return { passes };
};

// Validates and normalises a full event (create, or an update merged onto the
// existing event). Returns { error } or { value }. `requireNotEnded` is for
// creation: you cannot publish an event that has already finished.
const validateEventInput = (input, { requireNotEnded = false, now = new Date() } = {}) => {
  const name = text(input.name);
  if (!name) return fail('Event name is required');
  if (name.length > 100) return fail('Event name must be 100 characters or fewer');

  const description = text(input.description);
  if (!description) return fail('Event description is required');
  if (description.length > 2000) return fail('Description must be 2000 characters or fewer');

  const category = input.category || 'other';
  if (!EVENT_CATEGORIES.includes(category)) return fail('Choose a valid event category');

  const startDate = text(input.startDate);
  const endDate = text(input.endDate) || startDate;
  if (!isValidDateString(startDate)) return fail('A valid start date is required');
  if (!isValidDateString(endDate)) return fail('The end date is not a valid date');
  if (endDate < startDate) return fail('The end date cannot be before the start date');
  if (daysBetween(startDate, endDate) + 1 > MAX_DURATION_DAYS) {
    return fail(`An event can run for at most ${MAX_DURATION_DAYS} days`);
  }

  const timeMode = input.timeMode || 'all_day';
  if (!['all_day', 'daily_hours'].includes(timeMode)) return fail('Choose all day or set daily hours');
  let startTime = '';
  let endTime = '';
  if (timeMode === 'daily_hours') {
    startTime = text(input.startTime);
    endTime = text(input.endTime);
    if (!isValidTimeString(startTime) || !isValidTimeString(endTime)) return fail('Enter a valid start and end time');
    if (startTime === endTime) return fail('The start and end time cannot be the same');
  }

  const venueName = text(input.venueName);
  if (!venueName) return fail('Venue is required');
  if (venueName.length > 100) return fail('Venue name must be 100 characters or fewer');
  const address = text(input.address);
  if (address.length > 150) return fail('Address must be 150 characters or fewer');
  const city = text(input.city);
  if (!CITIES.includes(city)) return fail('A valid city is required');
  const mapsUrl = text(input.mapsUrl);
  if (mapsUrl && !isValidMapsUrl(mapsUrl)) return fail('Please paste a Google Maps link');

  const entryType = input.entryType || 'free';
  if (!['free', 'paid'].includes(entryType)) return fail('Entry must be free or paid');
  let passes = [];
  if (entryType === 'paid') {
    const result = validatePasses(input.passes);
    if (result.error) return result;
    passes = result.passes;
  }
  const bookingUrl = text(input.bookingUrl);
  if (bookingUrl && !isValidBookingUrl(bookingUrl)) return fail('The booking link must be a valid https link');

  const contactEmail = text(input.contactEmail).toLowerCase();
  const contactPhone = normalizePhone(text(input.contactPhone));
  if (!contactEmail && !contactPhone) return fail('Add an email or phone number for this event');
  if (contactEmail && (contactEmail.length > 254 || !EMAIL_RE.test(contactEmail))) return fail('Enter a valid contact email');
  if (contactPhone && !isValidPhone(contactPhone)) return fail('Enter a valid contact phone number (10-13 digits)');

  if (requireNotEnded) {
    const { endsAt } = computeEventWindow({ startDate, endDate, timeMode, startTime, endTime });
    if (endsAt <= now) return fail('This event has already ended');
  }

  return {
    value: {
      name, description, category,
      imageUrl: typeof input.imageUrl === 'string' ? input.imageUrl : '',
      imagePublicId: typeof input.imagePublicId === 'string' ? input.imagePublicId : '',
      startDate, endDate, timeMode, startTime, endTime,
      venueName, address, city, mapsUrl,
      entryType, passes, bookingUrl,
      contactEmail, contactPhone,
    },
  };
};

module.exports = { validateEventInput, MAX_DURATION_DAYS, MAX_PASSES };
