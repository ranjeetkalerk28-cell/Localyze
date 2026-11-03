const request = require('supertest');
const app = require('../app');
const Post = require('../models/Post');
const { setupTestDb } = require('./testDb');
const { createUser, createBusiness } = require('./fixtures');

setupTestDb();

describe('discover/explore', () => {
  test('surfaces posts from a same-city business even when not followed', async () => {
    const { token } = await createUser({ city: 'Mumbai', interests: [] });
    const { business } = await createBusiness({ city: 'Mumbai' });
    const post = await Post.create({ business: business._id, postType: 'promotion', title: 'Local news', content: 'x' });

    const response = await request(app).get('/api/discover/explore').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.map((p) => p._id)).toEqual([post._id.toString()]);
  });

  test('surfaces posts from a matching-interest business in a different city', async () => {
    const { token } = await createUser({ city: 'Mumbai', interests: ['Design'] });
    const { business } = await createBusiness({ city: 'Pune', industry: 'Design' });
    const post = await Post.create({ business: business._id, postType: 'promotion', title: 'New collection', content: 'x' });

    const response = await request(app).get('/api/discover/explore').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.map((p) => p._id)).toEqual([post._id.toString()]);
  });

  test('excludes a business-only post and a not-yet-started offer', async () => {
    const { token } = await createUser({ city: 'Mumbai', interests: [] });
    const { business } = await createBusiness({ city: 'Mumbai' });
    await Post.create({
      business: business._id, postType: 'collaboration', title: 'Partner with us', content: 'x',
      visibility: 'businesses_only', collaborationRequirements: 'Anyone',
    });
    await Post.create({
      business: business._id, postType: 'offer', title: 'Soon', content: 'x',
      validFrom: new Date(Date.now() + 86400000), expiresAt: new Date(Date.now() + 172800000),
    });

    const response = await request(app).get('/api/discover/explore').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  test('returns nothing for a user with no city match and no interests', async () => {
    const { token } = await createUser({ city: 'Mumbai', interests: [] });
    const { business } = await createBusiness({ city: 'Pune', industry: 'Design' });
    await Post.create({ business: business._id, postType: 'promotion', title: 'Not relevant', content: 'x' });

    const response = await request(app).get('/api/discover/explore').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });
});
