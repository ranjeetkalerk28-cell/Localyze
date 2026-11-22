const request = require('supertest');
const app = require('../app');
const Post = require('../models/Post');
const User = require('../models/User');
const Activity = require('../models/Activity');
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

describe('discover/explore personalised ranking', () => {
  const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60000);
  const explore = (token) => request(app).get('/api/discover/explore').set('Authorization', `Bearer ${token}`);
  const ids = (response) => response.body.map((post) => post._id);
  const like = (token, postId) => request(app).put(`/api/posts/${postId}/like`).set('Authorization', `Bearer ${token}`);

  test('ranks a business whose posts you liked above a newer unrelated post', async () => {
    const { token } = await createUser({ city: 'Mumbai', interests: [] });
    const { business: liked } = await createBusiness({ city: 'Mumbai', industry: 'Bakery' });
    const { business: other } = await createBusiness({ city: 'Mumbai', industry: 'Fitness' });
    const likedPost = await Post.create({ business: liked._id, postType: 'promotion', title: 'Liked', content: 'x', createdAt: minutesAgo(10) });
    const olderPost = await Post.create({ business: liked._id, postType: 'promotion', title: 'Older', content: 'x', createdAt: minutesAgo(5) });
    const newerPost = await Post.create({ business: other._id, postType: 'promotion', title: 'Newer', content: 'x' });
    expect((await like(token, likedPost._id)).status).toBe(200);

    const response = await explore(token);
    expect(response.status).toBe(200);
    expect(ids(response).indexOf(olderPost._id.toString())).toBeLessThan(ids(response).indexOf(newerPost._id.toString()));
  });

  test('liking one business lifts a different business in the same industry', async () => {
    const { token } = await createUser({ city: 'Mumbai', interests: [] });
    const { business: cafeA } = await createBusiness({ city: 'Mumbai', industry: 'Cafe' });
    const { business: cafeB } = await createBusiness({ city: 'Mumbai', industry: 'Cafe' });
    const { business: salon } = await createBusiness({ city: 'Mumbai', industry: 'Salon' });
    const likedPost = await Post.create({ business: cafeA._id, postType: 'promotion', title: 'Cafe A', content: 'x', createdAt: minutesAgo(10) });
    const cafeBPost = await Post.create({ business: cafeB._id, postType: 'promotion', title: 'Cafe B', content: 'x', createdAt: minutesAgo(5) });
    const salonPost = await Post.create({ business: salon._id, postType: 'promotion', title: 'Salon', content: 'x' });
    await like(token, likedPost._id);

    const response = await explore(token);
    expect(ids(response).indexOf(cafeBPost._id.toString())).toBeLessThan(ids(response).indexOf(salonPost._id.toString()));
    const cafeBResult = response.body.find((post) => post._id === cafeBPost._id.toString());
    expect(cafeBResult.rankReasons).toContain('You often engage with Cafe');
  });

  test('following a business lifts other businesses in its industry', async () => {
    const { token } = await createUser({ city: 'Mumbai', interests: [] });
    const { business: followed } = await createBusiness({ city: 'Mumbai', industry: 'Cafe' });
    const { business: similar } = await createBusiness({ city: 'Mumbai', industry: 'Cafe' });
    const { business: salon } = await createBusiness({ city: 'Mumbai', industry: 'Salon' });
    const similarPost = await Post.create({ business: similar._id, postType: 'promotion', title: 'Similar', content: 'x', createdAt: minutesAgo(5) });
    const salonPost = await Post.create({ business: salon._id, postType: 'promotion', title: 'Salon', content: 'x' });
    expect((await request(app).post(`/api/follows/${followed._id}`).set('Authorization', `Bearer ${token}`)).status).toBeLessThan(300);

    const response = await explore(token);
    expect(ids(response)).toEqual([similarPost._id.toString(), salonPost._id.toString()]);
  });

  test('a like followed by an unlike counts for nothing', async () => {
    const { token } = await createUser({ city: 'Mumbai', interests: [] });
    const { business: undone } = await createBusiness({ city: 'Mumbai', industry: 'Bakery' });
    const { business: other } = await createBusiness({ city: 'Mumbai', industry: 'Fitness' });
    const olderPost = await Post.create({ business: undone._id, postType: 'promotion', title: 'Older', content: 'x', createdAt: minutesAgo(5) });
    const newerPost = await Post.create({ business: other._id, postType: 'promotion', title: 'Newer', content: 'x' });
    await like(token, olderPost._id);
    await like(token, olderPost._id);

    const response = await explore(token);
    expect(ids(response)).toEqual([newerPost._id.toString(), olderPost._id.toString()]);
    expect(response.body[1].rankReasons).not.toContain('You liked posts from this business');
  });

  test('ignores activity older than the ranking window', async () => {
    const { token, user } = await createUser({ city: 'Mumbai', interests: [] });
    const { business: stale } = await createBusiness({ city: 'Mumbai', industry: 'Bakery' });
    const { business: other } = await createBusiness({ city: 'Mumbai', industry: 'Fitness' });
    const olderPost = await Post.create({ business: stale._id, postType: 'promotion', title: 'Older', content: 'x', createdAt: minutesAgo(5) });
    const newerPost = await Post.create({ business: other._id, postType: 'promotion', title: 'Newer', content: 'x' });
    const fortyDaysAgo = new Date(Date.now() - 40 * 86400000);
    // Raw insert so Mongoose timestamps can't overwrite the backdated createdAt.
    await Activity.collection.insertOne({
      user: user._id, type: 'like', business: stale._id, post: olderPost._id,
      createdAt: fortyDaysAgo, updatedAt: fortyDaysAgo,
    });

    const response = await explore(token);
    expect(ids(response)).toEqual([newerPost._id.toString(), olderPost._id.toString()]);
  });

  test('explains each post with rankReasons', async () => {
    const { token } = await createUser({ city: 'Mumbai', interests: ['design'] });
    const { business: designer } = await createBusiness({ city: 'Mumbai', industry: 'Design' });
    const post = await Post.create({ business: designer._id, postType: 'promotion', title: 'Studio', content: 'x' });
    await like(token, post._id);

    const response = await explore(token);
    expect(response.body[0].rankReasons).toEqual([
      'Matches your interests',
      'You liked posts from this business',
      'New today',
    ]);
  });
});
