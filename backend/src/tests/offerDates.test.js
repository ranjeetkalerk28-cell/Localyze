const request = require('supertest');
const app = require('../app');
const Post = require('../models/Post');
const Follow = require('../models/Follow');
const Connection = require('../models/Connection');
const Notification = require('../models/Notification');
const { setupTestDb } = require('./testDb');
const { createUser, createBusiness } = require('./fixtures');

setupTestDb();

const hoursFromNow = (hours) => new Date(Date.now() + hours * 60 * 60 * 1000);

describe('offer validFrom enforcement', () => {
  test('Post.offerStatus is "upcoming" before validFrom, "active" in range, "expired" after expiresAt', async () => {
    const { business } = await createBusiness();

    const upcoming = await Post.create({
      business: business._id, postType: 'offer', title: 'Future offer', content: 'x',
      validFrom: hoursFromNow(24), expiresAt: hoursFromNow(48),
    });
    const active = await Post.create({
      business: business._id, postType: 'offer', title: 'Live offer', content: 'x',
      validFrom: hoursFromNow(-1), expiresAt: hoursFromNow(48),
    });
    const expired = await Post.create({
      business: business._id, postType: 'offer', title: 'Past offer', content: 'x',
      validFrom: hoursFromNow(-48), expiresAt: hoursFromNow(-1),
    });

    expect(upcoming.offerStatus).toBe('upcoming');
    expect(active.offerStatus).toBe('active');
    expect(expired.offerStatus).toBe('expired');
  });

  test('discover/posts hides a followed business offer before its validFrom', async () => {
    const { user, token } = await createUser();
    const { business } = await createBusiness();
    await Follow.create({ user: user._id, business: business._id });

    await Post.create({
      business: business._id, postType: 'offer', title: 'Not yet', content: 'x',
      validFrom: hoursFromNow(24), expiresAt: hoursFromNow(48),
    });
    const live = await Post.create({
      business: business._id, postType: 'offer', title: 'Live now', content: 'x',
      validFrom: hoursFromNow(-1), expiresAt: hoursFromNow(48),
    });

    const response = await request(app).get('/api/discover/posts').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.map((post) => post._id)).toEqual([live._id.toString()]);
  });

  test('posts/feed hides a connections offer before its validFrom', async () => {
    const { business: me, token } = await createBusiness();
    const { business: connected } = await createBusiness();
    await Connection.create({ requester: me._id, recipient: connected._id, status: 'accepted' });

    await Post.create({
      business: connected._id, postType: 'offer', title: 'Not yet', content: 'x',
      validFrom: hoursFromNow(24), expiresAt: hoursFromNow(48),
    });
    const live = await Post.create({
      business: connected._id, postType: 'offer', title: 'Live now', content: 'x',
      validFrom: hoursFromNow(-1), expiresAt: hoursFromNow(48),
    });

    const response = await request(app).get('/api/posts/feed').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.map((post) => post._id)).toEqual([live._id.toString()]);
  });

  test('notifications are hidden until the offers validFrom arrives', async () => {
    const { user, token } = await createUser();
    const { business } = await createBusiness();

    const upcomingPost = await Post.create({
      business: business._id, postType: 'offer', title: 'Not yet', content: 'x',
      validFrom: hoursFromNow(24), expiresAt: hoursFromNow(48),
    });
    const livePost = await Post.create({
      business: business._id, postType: 'offer', title: 'Live now', content: 'x',
      validFrom: hoursFromNow(-1), expiresAt: hoursFromNow(48),
    });
    await Notification.create({ user: user._id, post: upcomingPost._id, type: 'offer', message: 'Not yet' });
    await Notification.create({ user: user._id, post: livePost._id, type: 'offer', message: 'Live now' });

    const response = await request(app).get('/api/notifications').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.map((notification) => notification.post._id)).toEqual([livePost._id.toString()]);
  });
});
