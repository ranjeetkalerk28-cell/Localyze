const request = require('supertest');
const app = require('../app');
const Post = require('../models/Post');
const User = require('../models/User');
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

  test('excludes a matching-interest business in a different city', async () => {
    const { token } = await createUser({ city: 'Mumbai', interests: ['Design'] });
    const { business } = await createBusiness({ city: 'Pune', industry: 'Design' });
    await Post.create({ business: business._id, postType: 'promotion', title: 'New collection', content: 'x' });

    const response = await request(app).get('/api/discover/explore').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  test('ranks interest-matching local posts ahead of newer non-matching ones', async () => {
    const { token } = await createUser({ city: 'Mumbai', interests: ['design'] });
    const { business: designer } = await createBusiness({ city: 'Mumbai', industry: 'Design' });
    const { business: cafe } = await createBusiness({ city: 'Mumbai', industry: 'Hospitality' });
    const designPost = await Post.create({
      business: designer._id, postType: 'promotion', title: 'Older design post', content: 'x',
      createdAt: new Date(Date.now() - 60000),
    });
    const cafePost = await Post.create({ business: cafe._id, postType: 'promotion', title: 'Newer cafe post', content: 'x' });

    const response = await request(app).get('/api/discover/explore').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.map((p) => p._id)).toEqual([designPost._id.toString(), cafePost._id.toString()]);
  });

  test('follows the current city instead of the default city once set', async () => {
    const { token, user } = await createUser({ city: 'Mumbai', interests: [] });
    await User.updateOne({ _id: user._id }, { currentCity: 'Pune' });
    const { business: mumbaiBusiness } = await createBusiness({ city: 'Mumbai' });
    const { business: puneBusiness } = await createBusiness({ city: 'Pune' });
    await Post.create({ business: mumbaiBusiness._id, postType: 'promotion', title: 'Mumbai', content: 'x' });
    const punePost = await Post.create({ business: puneBusiness._id, postType: 'promotion', title: 'Pune', content: 'x' });

    const response = await request(app).get('/api/discover/explore').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.map((p) => p._id)).toEqual([punePost._id.toString()]);
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

  test('businesses can explore local posts from other businesses, including business-only posts', async () => {
    const { token, business: viewer } = await createBusiness({ city: 'Mumbai', industry: 'Design' });
    const { business: localBusiness } = await createBusiness({ city: 'Mumbai', industry: 'Hospitality' });
    const { business: industryBusiness } = await createBusiness({ city: 'Pune', industry: 'Design' });
    const ownPost = await Post.create({
      business: viewer._id, postType: 'promotion', title: 'My own post', content: 'x',
    });
    const localPost = await Post.create({
      business: localBusiness._id, postType: 'promotion', title: 'Local post', content: 'x',
      visibility: 'businesses_only',
    });
    const industryPost = await Post.create({
      business: industryBusiness._id, postType: 'promotion', title: 'Industry post', content: 'x',
    });

    const response = await request(app)
      .get('/api/discover/explore')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.map((post) => post._id)).toEqual([localPost._id.toString()]);
    expect(response.body.map((post) => post._id)).not.toContain(ownPost._id.toString());
    expect(response.body.map((post) => post._id)).not.toContain(industryPost._id.toString());
  });
});
