const request = require('supertest');
const app = require('../app');
const Post = require('../models/Post');
const { setupTestDb } = require('./testDb');
const { createUser, createBusiness } = require('./fixtures');

setupTestDb();

describe('comments', () => {
  test('a user can add and then read back a comment on a post', async () => {
    const { token } = await createUser();
    const { business } = await createBusiness();
    const post = await Post.create({ business: business._id, postType: 'promotion', title: 'Hello', content: 'x' });

    const addResponse = await request(app)
      .post(`/api/posts/${post._id}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Looks great!' });
    expect(addResponse.status).toBe(201);
    expect(addResponse.body.content).toBe('Looks great!');
    expect(addResponse.body.user).toHaveProperty('name');

    const listResponse = await request(app)
      .get(`/api/posts/${post._id}/comments`)
      .set('Authorization', `Bearer ${token}`);
    expect(listResponse.status).toBe(200);
    expect(listResponse.body).toHaveLength(1);
    expect(listResponse.body[0].content).toBe('Looks great!');
  });

  test('rejects an empty comment', async () => {
    const { token } = await createUser();
    const { business } = await createBusiness();
    const post = await Post.create({ business: business._id, postType: 'promotion', title: 'Hello', content: 'x' });

    const response = await request(app)
      .post(`/api/posts/${post._id}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: '   ' });
    expect(response.status).toBe(400);
  });

  test('a business account cannot post a comment', async () => {
    const { token } = await createBusiness();
    const { business: author } = await createBusiness();
    const post = await Post.create({ business: author._id, postType: 'promotion', title: 'Hello', content: 'x' });

    const response = await request(app)
      .post(`/api/posts/${post._id}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Nice' });
    expect(response.status).toBe(403);
  });

  test('404s for a comment on a nonexistent post', async () => {
    const { token } = await createUser();
    const response = await request(app)
      .post('/api/posts/64b000000000000000000000/comments')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Nice' });
    expect(response.status).toBe(404);
  });
});
