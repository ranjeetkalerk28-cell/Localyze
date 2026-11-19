const request = require('supertest');
const app = require('../app');
const Post = require('../models/Post');
const Connection = require('../models/Connection');
const Follow = require('../models/Follow');
const { setupTestDb } = require('./testDb');
const { createBusiness, createUser } = require('./fixtures');

setupTestDb();
const hours = (n) => new Date(Date.now() + n * 3600000);
const offer = (business, title, end, extra = {}) => Post.create({
  business, title, content: title, postType: 'offer',
  validFrom: hours(-1), expiresAt: hours(end), ...extra,
});

test('offer stories select nearest expiry per connected business and exclude ineligible posts', async () => {
  const { business: me, token } = await createBusiness();
  const { business: first } = await createBusiness();
  const { business: second } = await createBusiness();
  const { business: stranger } = await createBusiness();
  await Connection.create([
    { requester: me._id, recipient: first._id, status: 'accepted' },
    { requester: second._id, recipient: me._id, status: 'accepted' },
    { requester: me._id, recipient: stranger._id, status: 'pending' },
  ]);
  await offer(first._id, 'Later same business', 12);
  const urgent = await offer(first._id, 'First expiry', 2);
  const later = await offer(second._id, 'Second expiry', 5);
  await offer(first._id, 'Expired', -1);
  await offer(second._id, 'Upcoming', 3, { validFrom: hours(1) });
  await offer(second._id, 'Deleted', 1, { status: 'deleted' });
  await offer(stranger._id, 'Not connected', 1);
  await Post.create({ business: first._id, title: 'New promotion', content: 'x', postType: 'promotion' });
  const response = await request(app).get('/api/stories?offers=true').set('Authorization', `Bearer ${token}`);
  expect(response.status).toBe(200);
  expect(response.body.map((post) => post._id)).toEqual([urgent.id, later.id]);
  expect(response.body[0].business.businessName).toBe(first.businessName);
});

test('regular stories retain latest-post behavior and empty business networks stay empty', async () => {
  const { business: me, token } = await createBusiness();
  expect((await request(app).get('/api/stories?offers=true').set('Authorization', `Bearer ${token}`)).body).toEqual([]);
  const { business } = await createBusiness();
  await Connection.create({ requester: me._id, recipient: business._id, status: 'accepted' });
  await offer(business._id, 'Offer', 2, { createdAt: hours(-2) });
  const promotion = await Post.create({ business: business._id, title: 'Promotion', content: 'x', postType: 'promotion' });
  const response = await request(app).get('/api/stories').set('Authorization', `Bearer ${token}`);
  expect(response.body.map((post) => post._id)).toEqual([promotion.id]);
});

test('offer query preserves consumer visibility and requires authentication', async () => {
  expect((await request(app).get('/api/stories?offers=true')).status).toBe(401);
  const { user, token } = await createUser();
  const { business } = await createBusiness();
  await Follow.create({ user: user._id, business: business._id });
  await offer(business._id, 'Private', 1, { visibility: 'businesses_only' });
  await offer(business._id, 'Expired public', -1);
  await offer(business._id, 'Upcoming public', 3, { validFrom: hours(1) });
  await Post.create({ business: business._id, title: 'Promotion', content: 'Not an offer', postType: 'promotion' });
  const { business: unfollowed } = await createBusiness();
  await offer(unfollowed._id, 'Unfollowed public', 1);
  const publicOffer = await offer(business._id, 'Public', 2, { visibility: 'consumers_and_businesses' });
  const response = await request(app).get('/api/stories?offers=true').set('Authorization', `Bearer ${token}`);
  expect(response.body.map((post) => post._id)).toEqual([publicOffer.id]);
});
