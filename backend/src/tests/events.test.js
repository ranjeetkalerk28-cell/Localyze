const request = require('supertest');
const app = require('../app');
const Event = require('../models/Event');
const Business = require('../models/Business');
const { setupTestDb } = require('./testDb');
const { createUser, createBusiness } = require('./fixtures');
const { addDays, computeEventWindow, isValidDateString, istDateString, istInstant } = require('../utils/eventTime');
const { eventVisibleFilter } = require('../utils/eventVisibility');

setupTestDb();

const today = () => istDateString(new Date());
const inDays = (days) => addDays(today(), days);

const eventBody = (overrides = {}) => ({
  name: 'Navratri Garba Night',
  description: 'Nine nights of garba, dandiya and street food.',
  category: 'festival',
  startDate: inDays(2),
  endDate: inDays(2),
  timeMode: 'all_day',
  venueName: 'Shivaji Park Ground',
  address: 'Dadar West',
  city: 'Mumbai',
  entryType: 'free',
  contactEmail: 'events@example.com',
  ...overrides,
});

// Inserted straight through the model, bypassing the "cannot publish an
// event that has already ended" API rule, so tests can set up past events.
const insertEvent = async (business, overrides = {}) =>
  Event.create({ ...eventBody(), contactPhone: '', business: business._id, ...overrides });

const auth = (token) => ({ Authorization: `Bearer ${token}` });
const post = (token, body) => request(app).post('/api/events').set(auth(token)).send(body);
const list = (token, query = '') => request(app).get(`/api/events${query}`).set(auth(token));
const names = (response) => response.body.map((event) => event.name);

describe('event time window', () => {
  const iso = (date) => date.toISOString();

  test('single day 12 July, 8 PM to 6 AM: starts that evening and ends the next morning (IST)', () => {
    const { startsAt, endsAt } = computeEventWindow({
      startDate: '2026-07-12', endDate: '2026-07-12', timeMode: 'daily_hours', startTime: '20:00', endTime: '06:00',
    });
    expect(iso(startsAt)).toBe('2026-07-12T14:30:00.000Z'); // 12 Jul 20:00 IST
    expect(iso(endsAt)).toBe('2026-07-13T00:30:00.000Z'); // 13 Jul 06:00 IST
  });

  test('daytime hours end on the same day', () => {
    const { endsAt } = computeEventWindow({
      startDate: '2026-07-12', endDate: '2026-07-12', timeMode: 'daily_hours', startTime: '10:00', endTime: '18:00',
    });
    expect(iso(endsAt)).toBe('2026-07-12T12:30:00.000Z'); // 12 Jul 18:00 IST
  });

  test('a multi-day overnight event ends the morning after its last date', () => {
    const { startsAt, endsAt } = computeEventWindow({
      startDate: '2026-07-12', endDate: '2026-07-14', timeMode: 'daily_hours', startTime: '20:00', endTime: '06:00',
    });
    expect(iso(startsAt)).toBe('2026-07-12T14:30:00.000Z');
    expect(iso(endsAt)).toBe('2026-07-15T00:30:00.000Z'); // 15 Jul 06:00 IST
  });

  test('an all-day event runs from midnight to midnight IST', () => {
    const { startsAt, endsAt } = computeEventWindow({ startDate: '2026-07-12', endDate: '2026-07-14', timeMode: 'all_day' });
    expect(iso(startsAt)).toBe('2026-07-11T18:30:00.000Z'); // 12 Jul 00:00 IST
    expect(iso(endsAt)).toBe('2026-07-14T18:30:00.000Z'); // 15 Jul 00:00 IST
  });

  test('IST calendar date and real-date checks', () => {
    expect(istDateString(new Date('2026-07-12T19:00:00Z'))).toBe('2026-07-13'); // already 00:30 next day in India
    expect(istDateString(new Date('2026-07-12T17:00:00Z'))).toBe('2026-07-12');
    expect(isValidDateString('2026-02-30')).toBe(false);
    expect(isValidDateString('2026-12-31')).toBe(true);
    expect(isValidDateString('12/07/2026')).toBe(false);
  });
});

describe('event visibility around an overnight window', () => {
  test('a 12 July 8 PM-6 AM event stays listed until 6 AM on 13 July, then drops out', async () => {
    const { business } = await createBusiness();
    await insertEvent(business, {
      name: 'Night market', startDate: '2026-07-12', endDate: '2026-07-12',
      timeMode: 'daily_hours', startTime: '20:00', endTime: '06:00',
    });
    const listedAt = async (instant) => (await Event.find(eventVisibleFilter(instant))).length;

    expect(await listedAt(istInstant('2026-07-10', '12:00'))).toBe(1); // upcoming
    expect(await listedAt(istInstant('2026-07-12', '19:00'))).toBe(1); // before it starts
    expect(await listedAt(istInstant('2026-07-12', '23:30'))).toBe(1); // underway
    expect(await listedAt(istInstant('2026-07-13', '02:00'))).toBe(1); // after midnight, still underway
    expect(await listedAt(istInstant('2026-07-13', '05:59'))).toBe(1);
    expect(await listedAt(istInstant('2026-07-13', '06:00'))).toBe(0); // over
    expect(await listedAt(istInstant('2026-07-13', '12:00'))).toBe(0);
  });

  test('an all-day multi-day event is listed through its last day and gone the next', async () => {
    const { business } = await createBusiness();
    await insertEvent(business, { startDate: '2026-07-12', endDate: '2026-07-14' });
    const listedAt = async (instant) => (await Event.find(eventVisibleFilter(instant))).length;

    expect(await listedAt(istInstant('2026-07-14', '23:59'))).toBe(1);
    expect(await listedAt(istInstant('2026-07-15', '00:00'))).toBe(0);
  });
});

describe('POST /api/events', () => {
  test('a business creates an event with derived timestamps', async () => {
    const { token, business } = await createBusiness();
    const response = await post(token, eventBody({ contactPhone: '+91 98765 43210' }));

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      name: 'Navratri Garba Night', category: 'festival', city: 'Mumbai', entryType: 'free',
      contactEmail: 'events@example.com', contactPhone: '+919876543210', eventStatus: 'upcoming',
    });
    expect(response.body.business._id).toBe(business._id.toString());
    expect(response.body.startsAt).toBe(istInstant(inDays(2)).toISOString());
    expect(response.body.endsAt).toBe(istInstant(inDays(3)).toISOString());
  });

  test('an overnight daily window ends the next morning', async () => {
    const { token } = await createBusiness();
    const response = await post(token, eventBody({ timeMode: 'daily_hours', startTime: '20:00', endTime: '06:00' }));

    expect(response.status).toBe(201);
    expect(response.body.startsAt).toBe(istInstant(inDays(2), '20:00').toISOString());
    expect(response.body.endsAt).toBe(istInstant(inDays(3), '06:00').toISOString());
  });

  test('stores passes for a paid event', async () => {
    const { token } = await createBusiness();
    const response = await post(token, eventBody({
      entryType: 'paid',
      passes: [{ name: 'General', price: 299 }, { name: 'VIP', price: '999', note: 'Includes dinner' }],
      bookingUrl: 'https://tickets.example.com/garba',
    }));

    expect(response.status).toBe(201);
    expect(response.body.passes).toEqual([
      { name: 'General', price: 299, note: '' },
      { name: 'VIP', price: 999, note: 'Includes dinner' },
    ]);
  });

  test('clears passes when the event is free', async () => {
    const { token } = await createBusiness();
    const response = await post(token, eventBody({ entryType: 'free', passes: [{ name: 'Leftover', price: 10 }] }));
    expect(response.status).toBe(201);
    expect(response.body.passes).toEqual([]);
  });

  test('a consumer cannot create events', async () => {
    const { token } = await createUser();
    expect((await post(token, eventBody())).status).toBe(403);
  });

  test('rejects invalid events', async () => {
    const { token } = await createBusiness();
    const invalid = {
      'missing name': { name: ' ' },
      'missing description': { description: '' },
      'bad category': { category: 'circus-of-doom' },
      'bad date': { startDate: '2026-02-30' },
      'end before start': { startDate: inDays(5), endDate: inDays(4) },
      'longer than 60 days': { startDate: inDays(1), endDate: inDays(80) },
      'daily hours without times': { timeMode: 'daily_hours' },
      'same start and end time': { timeMode: 'daily_hours', startTime: '10:00', endTime: '10:00' },
      'bad time': { timeMode: 'daily_hours', startTime: '25:00', endTime: '10:00' },
      'no venue': { venueName: '' },
      'unsupported city': { city: 'Atlantis' },
      'non-Google maps link': { mapsUrl: 'https://evil.com/map' },
      'paid without passes': { entryType: 'paid', passes: [] },
      'negative price': { entryType: 'paid', passes: [{ name: 'General', price: -5 }] },
      'fractional price': { entryType: 'paid', passes: [{ name: 'General', price: 9.5 }] },
      'too many passes': { entryType: 'paid', passes: Array.from({ length: 7 }, (_, i) => ({ name: `P${i}`, price: 1 })) },
      'http booking link': { bookingUrl: 'http://tickets.example.com' },
      'no contact at all': { contactEmail: '', contactPhone: '' },
      'bad contact email': { contactEmail: 'not-an-email' },
      'bad contact phone': { contactEmail: '', contactPhone: '12345' },
      'already ended': { startDate: addDays(today(), -3), endDate: addDays(today(), -2) },
    };
    for (const [label, overrides] of Object.entries(invalid)) {
      const response = await post(token, eventBody(overrides));
      expect({ label, status: response.status }).toEqual({ label, status: 400 });
    }
    expect(await Event.countDocuments()).toBe(0);
  });

  test('an event starting today that is still underway can be published', async () => {
    const { token } = await createBusiness();
    const response = await post(token, eventBody({ startDate: today(), endDate: today() }));
    expect(response.status).toBe(201);
    expect(response.body.eventStatus).toBe('ongoing');
  });
});

describe('GET /api/events', () => {
  test('lists upcoming and ongoing events in the current city, soonest first, and hides ended ones', async () => {
    const { token } = await createUser({ city: 'Mumbai' });
    const { business } = await createBusiness();
    await insertEvent(business, { name: 'Later', startDate: inDays(5), endDate: inDays(5) });
    await insertEvent(business, { name: 'Underway', startDate: addDays(today(), -1), endDate: inDays(1) });
    await insertEvent(business, { name: 'Soon', startDate: inDays(1), endDate: inDays(1) });
    await insertEvent(business, { name: 'Over', startDate: addDays(today(), -10), endDate: addDays(today(), -9) });
    await insertEvent(business, { name: 'Pune event', city: 'Pune' });

    const response = await list(token);
    expect(response.status).toBe(200);
    expect(names(response)).toEqual(['Underway', 'Soon', 'Later']);
    expect(response.body[0].eventStatus).toBe('ongoing');
    expect(response.body[0].business.businessName).toBe('Test Business');
  });

  test('both account types can browse, and a city filter overrides the default', async () => {
    const { business, token: businessToken } = await createBusiness({ city: 'Mumbai' });
    const { token: userToken } = await createUser({ city: 'Mumbai' });
    await insertEvent(business, { name: 'Pune event', city: 'Pune' });

    expect(names(await list(userToken))).toEqual([]);
    expect(names(await list(userToken, '?city=Pune'))).toEqual(['Pune event']);
    expect(names(await list(businessToken, '?city=Pune'))).toEqual(['Pune event']);
    expect((await list(userToken, '?city=Atlantis')).status).toBe(400);
  });

  test('filters by when, category and free', async () => {
    const { token } = await createUser();
    const { business } = await createBusiness();
    await insertEvent(business, { name: 'Today fair', category: 'fair', startDate: today(), endDate: today() });
    await insertEvent(business, {
      name: 'Midweek show', category: 'show', entryType: 'paid', passes: [{ name: 'Entry', price: 100 }],
      startDate: inDays(3), endDate: inDays(3),
    });
    await insertEvent(business, { name: 'Far party', category: 'party', startDate: inDays(20), endDate: inDays(20) });

    expect(names(await list(token, '?when=today'))).toEqual(['Today fair']);
    expect(names(await list(token, '?when=week'))).toEqual(['Today fair', 'Midweek show']);
    expect(names(await list(token, '?when=all'))).toEqual(['Today fair', 'Midweek show', 'Far party']);
    expect(names(await list(token, '?category=show'))).toEqual(['Midweek show']);
    expect(names(await list(token, '?free=true'))).toEqual(['Today fair', 'Far party']);
    expect((await list(token, '?when=yesterday')).status).toBe(400);
    expect((await list(token, '?category=nope')).status).toBe(400);
  });

  test('?business= lists one business across cities', async () => {
    const { token } = await createUser({ city: 'Mumbai' });
    const { business } = await createBusiness();
    const { business: other } = await createBusiness();
    await insertEvent(business, { name: 'Mine in Pune', city: 'Pune' });
    await insertEvent(other, { name: 'Not mine' });

    expect(names(await list(token, `?business=${business._id}`))).toEqual(['Mine in Pune']);
    expect((await list(token, '?business=abc')).status).toBe(400);
  });
});

describe('GET /api/events/:id', () => {
  test('returns an event with its organiser, even after it ended', async () => {
    const { token } = await createUser();
    const { business } = await createBusiness({ businessName: 'Garba Committee' });
    const ended = await insertEvent(business, { startDate: addDays(today(), -10), endDate: addDays(today(), -9) });

    const response = await request(app).get(`/api/events/${ended._id}`).set(auth(token));
    expect(response.status).toBe(200);
    expect(response.body.business.businessName).toBe('Garba Committee');
    expect(response.body.eventStatus).toBe('ended');
  });

  test('404s for unknown, malformed and deleted events', async () => {
    const { token } = await createUser();
    const { business } = await createBusiness();
    const deleted = await insertEvent(business, { status: 'deleted' });

    expect((await request(app).get(`/api/events/${deleted._id}`).set(auth(token))).status).toBe(404);
    expect((await request(app).get('/api/events/000000000000000000000000').set(auth(token))).status).toBe(404);
    expect((await request(app).get('/api/events/not-an-id').set(auth(token))).status).toBe(404);
  });
});

describe('PUT and DELETE /api/events/:id', () => {
  test('the owner edits an event and the timestamps follow', async () => {
    const { token, business } = await createBusiness();
    const event = await insertEvent(business);

    const response = await request(app).put(`/api/events/${event._id}`).set(auth(token)).send({
      name: 'Renamed', timeMode: 'daily_hours', startTime: '21:00', endTime: '02:00',
      entryType: 'paid', passes: [{ name: 'Couple', price: 500 }],
    });
    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Renamed');
    expect(response.body.endsAt).toBe(istInstant(inDays(3), '02:00').toISOString());
    expect(response.body.passes).toHaveLength(1);
  });

  test('an edit that would make the event invalid is rejected and nothing changes', async () => {
    const { token, business } = await createBusiness();
    const event = await insertEvent(business);

    const response = await request(app).put(`/api/events/${event._id}`).set(auth(token)).send({ entryType: 'paid' });
    expect(response.status).toBe(400);
    expect((await Event.findById(event._id)).entryType).toBe('free');
  });

  test("another business and consumers cannot edit or delete someone else's event", async () => {
    const { business } = await createBusiness();
    const { token: otherToken } = await createBusiness();
    const { token: userToken } = await createUser();
    const event = await insertEvent(business);

    for (const token of [otherToken, userToken]) {
      const edit = await request(app).put(`/api/events/${event._id}`).set(auth(token)).send({ name: 'Hijack' });
      const remove = await request(app).delete(`/api/events/${event._id}`).set(auth(token));
      expect(edit.status).toBe(403);
      expect(remove.status).toBe(403);
    }
    expect((await Event.findById(event._id)).name).toBe('Navratri Garba Night');
  });

  test('deleting soft-deletes and removes the event from the list', async () => {
    const { token, business } = await createBusiness();
    const { token: userToken } = await createUser();
    const event = await insertEvent(business);

    const response = await request(app).delete(`/api/events/${event._id}`).set(auth(token));
    expect(response.status).toBe(200);
    expect(names(await list(userToken))).toEqual([]);
    const stored = await Event.findById(event._id);
    expect(stored.status).toBe('deleted');
    expect(stored.deletedAt).toBeTruthy();
    expect((await request(app).delete(`/api/events/${event._id}`).set(auth(token))).status).toBe(404);
  });
});

describe('deleting a business account', () => {
  test('removes its events', async () => {
    const { token, business } = await createBusiness();
    await insertEvent(business);
    await insertEvent(business, { name: 'Second' });

    const response = await request(app)
      .delete('/api/business/auth/me')
      .set(auth(token))
      .send({ password: 'password123' });
    expect(response.status).toBe(200);
    expect(await Event.countDocuments({ business: business._id })).toBe(0);
    expect(await Business.findById(business._id)).toBeNull();
  });
});
