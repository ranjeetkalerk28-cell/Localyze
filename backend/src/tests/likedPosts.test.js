const request = require('supertest');
const app = require('../app');
const Post = require('../models/Post');
const { setupTestDb } = require('./testDb');
const { createUser, createBusiness } = require('./fixtures');

setupTestDb();

describe('liked posts', () => {
  test('a consumer can list their liked visible posts, excluding deleted or business-only posts', async () => {
    const { user, token } = await createUser();
    const { business } = await createBusiness();
    const visiblePost = await Post.create({
      business: business._id,
      postType: 'promotion',
      title: 'Liked post',
      content: 'Visible',
      likes: [user._id],
    });
    await Post.create({
      business: business._id,
      postType: 'promotion',
      title: 'Business-only post',
      content: 'Private',
      visibility: 'businesses_only',
      likes: [user._id],
    });
    await Post.create({
      business: business._id,
      postType: 'promotion',
      title: 'Deleted post',
      content: 'Removed',
      status: 'deleted',
      likes: [user._id],
    });

    const response = await request(app).get('/api/posts/liked').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.map((post) => post._id)).toEqual([visiblePost._id.toString()]);
    expect(response.body[0].business).toHaveProperty('businessName');
  });

  test('business accounts cannot access a consumer liked-posts list', async () => {
    const { token } = await createBusiness();

    const response = await request(app).get('/api/posts/liked').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
  });
});
