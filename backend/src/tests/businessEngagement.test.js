const request = require('supertest');
const app = require('../app');
const Post = require('../models/Post');
const { setupTestDb } = require('./testDb');
const { createUser, createBusiness } = require('./fixtures');

setupTestDb();

describe('business likes and comments', () => {
  test('a business can like and unlike a post, counted alongside consumer likes', async () => {
    const { token: userToken } = await createUser();
    const { token: bizToken } = await createBusiness();
    const { business: author } = await createBusiness();
    const post = await Post.create({ business: author._id, postType: 'promotion', title: 'Hello', content: 'x' });

    const userLike = await request(app).put(`/api/posts/${post._id}/like`).set('Authorization', `Bearer ${userToken}`);
    expect(userLike.status).toBe(200);
    expect(userLike.body).toEqual({ likes: 1, liked: true });

    const bizLike = await request(app).put(`/api/posts/${post._id}/like`).set('Authorization', `Bearer ${bizToken}`);
    expect(bizLike.status).toBe(200);
    expect(bizLike.body).toEqual({ likes: 2, liked: true });

    const bizUnlike = await request(app).put(`/api/posts/${post._id}/like`).set('Authorization', `Bearer ${bizToken}`);
    expect(bizUnlike.status).toBe(200);
    expect(bizUnlike.body).toEqual({ likes: 1, liked: false });

    const stored = await Post.findById(post._id);
    expect(stored.likes).toHaveLength(1);
    expect(stored.businessLikes).toHaveLength(0);
  });

  test('a business can add a comment, populated with its business identity', async () => {
    const { token } = await createBusiness({ businessName: 'Commenter Co' });
    const { business: author } = await createBusiness();
    const post = await Post.create({ business: author._id, postType: 'promotion', title: 'Hello', content: 'x' });

    const addResponse = await request(app)
      .post(`/api/posts/${post._id}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Great post!' });
    expect(addResponse.status).toBe(201);
    expect(addResponse.body.business).toMatchObject({ businessName: 'Commenter Co' });
    expect(addResponse.body.user).toBeFalsy();

    const listResponse = await request(app)
      .get(`/api/posts/${post._id}/comments`)
      .set('Authorization', `Bearer ${token}`);
    expect(listResponse.status).toBe(200);
    expect(listResponse.body).toHaveLength(1);
    expect(listResponse.body[0].business).toMatchObject({ businessName: 'Commenter Co' });
  });

  test('a comments list distinguishes consumer and business authors', async () => {
    const { token: userToken } = await createUser({ name: 'A Consumer' });
    const { token: bizToken, business } = await createBusiness({ businessName: 'A Business' });
    const post = await Post.create({ business: business._id, postType: 'promotion', title: 'Hello', content: 'x' });

    await request(app).post(`/api/posts/${post._id}/comments`).set('Authorization', `Bearer ${userToken}`).send({ content: 'From a user' });
    await request(app).post(`/api/posts/${post._id}/comments`).set('Authorization', `Bearer ${bizToken}`).send({ content: 'From a business' });

    const listResponse = await request(app).get(`/api/posts/${post._id}/comments`).set('Authorization', `Bearer ${userToken}`);
    expect(listResponse.body).toHaveLength(2);
    expect(listResponse.body[0].user).toMatchObject({ name: 'A Consumer' });
    expect(listResponse.body[0].business).toBeFalsy();
    expect(listResponse.body[1].business).toMatchObject({ businessName: 'A Business' });
    expect(listResponse.body[1].user).toBeFalsy();
  });
});
