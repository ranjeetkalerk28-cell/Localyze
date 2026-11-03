const request = require('supertest');
const app = require('../app');
const Post = require('../models/Post');
const { setupTestDb } = require('./testDb');
const { createUser, createBusiness } = require('./fixtures');

setupTestDb();

describe('saved posts', () => {
  test('a user can save a post, see it listed, then unsave it', async () => {
    const { token } = await createUser();
    const { business } = await createBusiness();
    const post = await Post.create({ business: business._id, postType: 'promotion', title: 'Hello', content: 'x' });

    const saveResponse = await request(app).post(`/api/saved/${post._id}`).set('Authorization', `Bearer ${token}`);
    expect(saveResponse.status).toBe(201);

    const listResponse = await request(app).get('/api/saved').set('Authorization', `Bearer ${token}`);
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.map((p) => p._id)).toEqual([post._id.toString()]);

    const unsaveResponse = await request(app).delete(`/api/saved/${post._id}`).set('Authorization', `Bearer ${token}`);
    expect(unsaveResponse.status).toBe(200);
    expect(unsaveResponse.body.saved).toBe(false);

    const listAfter = await request(app).get('/api/saved').set('Authorization', `Bearer ${token}`);
    expect(listAfter.body).toEqual([]);
  });

  test('saving the same post twice is a conflict, not a duplicate row', async () => {
    const { token } = await createUser();
    const { business } = await createBusiness();
    const post = await Post.create({ business: business._id, postType: 'promotion', title: 'Hello', content: 'x' });

    await request(app).post(`/api/saved/${post._id}`).set('Authorization', `Bearer ${token}`);
    const secondSave = await request(app).post(`/api/saved/${post._id}`).set('Authorization', `Bearer ${token}`);
    expect(secondSave.status).toBe(409);

    const listResponse = await request(app).get('/api/saved').set('Authorization', `Bearer ${token}`);
    expect(listResponse.body).toHaveLength(1);
  });

  test('a saved posts list omits a post that was since deleted', async () => {
    const { token } = await createUser();
    const { business } = await createBusiness();
    const post = await Post.create({ business: business._id, postType: 'promotion', title: 'Hello', content: 'x' });
    await request(app).post(`/api/saved/${post._id}`).set('Authorization', `Bearer ${token}`);

    post.status = 'deleted';
    await post.save();

    const listResponse = await request(app).get('/api/saved').set('Authorization', `Bearer ${token}`);
    expect(listResponse.body).toEqual([]);
  });

  test('a business account cannot use the saved-posts routes', async () => {
    const { token } = await createBusiness();
    const response = await request(app).get('/api/saved').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(403);
  });
});
