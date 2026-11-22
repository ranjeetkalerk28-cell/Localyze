/**
 * seedEvents.js
 * Adds a handful of demo events (dates are relative to today, so they are
 * always upcoming/ongoing) for the demo businesses created by seedEcosystem.js.
 * Includes a single-day overnight event, a multi-day event with daily hours,
 * and paid and free entries.
 *
 * Run from /backend:  node scripts/seedEvents.js
 * Safe to run again: it skips events that already exist (same business + name).
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Business = require('../src/models/Business');
const Event = require('../src/models/Event');
const { addDays, istDateString } = require('../src/utils/eventTime');

const today = istDateString(new Date());
const inDays = (days) => addDays(today, days);

const events = [
  {
    username: 'brewbites.mumbai',
    name: 'Midnight Brew & Jazz Night',
    description: 'A single-night pop-up: live jazz, cold brew flights and a late-night menu. Runs past midnight and ends at sunrise coffee.',
    category: 'show',
    startDate: inDays(2), endDate: inDays(2),
    timeMode: 'daily_hours', startTime: '20:00', endTime: '06:00',
    venueName: 'Brew & Bites Terrace', address: 'Bandra West', city: 'Mumbai',
    entryType: 'paid',
    passes: [{ name: 'Standing', price: 299, note: 'Includes one cold brew' }, { name: 'Table for 4', price: 1499, note: 'Reserved seating' }],
    contactEmail: 'brewbites.mumbai@localyze.demo',
  },
  {
    username: 'pixelstudio.delhi',
    name: 'Open Studio Weekend',
    description: 'Walk through our studio, meet the designers and see live brand-identity work. Free brand audits on the spot.',
    category: 'workshop',
    startDate: inDays(4), endDate: inDays(5),
    timeMode: 'daily_hours', startTime: '10:00', endTime: '18:00',
    venueName: 'Pixel Studio', address: 'Hauz Khas Village', city: 'Delhi',
    entryType: 'free',
    contactEmail: 'pixelstudio.delhi@localyze.demo',
  },
  {
    username: 'greenleaf.blr',
    name: 'Sunrise Yoga Fair',
    description: 'Three days of yoga sessions, herbal tea stalls and a wellness marketplace. Bring your own mat.',
    category: 'fair',
    startDate: today, endDate: inDays(2),
    timeMode: 'all_day',
    venueName: 'Cubbon Park Bandstand', address: 'Kasturba Road', city: 'Bengaluru',
    entryType: 'free',
    contactPhone: '+919876500001',
  },
  {
    username: 'neonthreads.pune',
    name: 'Winter Drop Pop-up Market',
    description: 'Our newest collection plus six local makers. Limited numbered pieces; first-day crowd gets a free tote.',
    category: 'market',
    startDate: inDays(7), endDate: inDays(9),
    timeMode: 'daily_hours', startTime: '11:00', endTime: '21:00',
    venueName: 'FC Road Courtyard', city: 'Pune',
    entryType: 'free',
    contactEmail: 'neonthreads.pune@localyze.demo',
  },
  {
    username: 'techhive.hyd',
    name: 'Hyderabad Startup Summit',
    description: 'Talks, demos and an investor speed-meet for early-stage founders. Passes include lunch.',
    category: 'festival',
    startDate: inDays(10), endDate: inDays(10),
    timeMode: 'daily_hours', startTime: '09:30', endTime: '17:30',
    venueName: 'TechHive Rooftop', address: 'HITEC City', city: 'Hyderabad',
    entryType: 'paid',
    passes: [{ name: 'Founder', price: 799 }, { name: 'Investor', price: 1999 }, { name: 'Student', price: 299, note: 'ID required' }],
    contactEmail: 'techhive.hyd@localyze.demo', contactPhone: '+919876500002',
  },
  {
    username: 'luminary.jaipur',
    name: 'Royal Garba & Dandiya Night',
    description: 'A grand evening of garba and dandiya with live dhol, traditional dress and festive food stalls.',
    category: 'festival',
    startDate: inDays(3), endDate: inDays(3),
    timeMode: 'daily_hours', startTime: '19:00', endTime: '01:00',
    venueName: 'Luminary Grounds', address: 'Civil Lines', city: 'Jaipur',
    entryType: 'paid',
    passes: [{ name: 'Couple', price: 600 }, { name: 'Group of 4', price: 1000 }],
    contactEmail: 'luminary.jaipur@localyze.demo',
  },
];

async function seed() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not configured');
  await mongoose.connect(process.env.MONGO_URI, { autoIndex: false });

  for (const { username, ...fields } of events) {
    const business = await Business.findOne({ username });
    if (!business) {
      console.warn(`Skipped "${fields.name}": business @${username} not found (run seedEcosystem.js first)`);
      continue;
    }
    if (await Event.exists({ business: business._id, name: fields.name, status: 'active' })) {
      console.log(`Already exists: "${fields.name}"`);
      continue;
    }
    await Event.create({ ...fields, business: business._id });
    console.log(`Created event "${fields.name}" for @${username} (${fields.city})`);
  }
}

seed()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
