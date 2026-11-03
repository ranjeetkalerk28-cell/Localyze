const request = require('supertest');
const app = require('../app');
const Post = require('../models/Post');
const { setupTestDb } = require('./testDb');
const { createBusiness } = require('./fixtures');

setupTestDb();

describe('post edits', () => {
  test('the owning business can update post details without changing its type', async () => {
    const { token, business } = await createBusiness();
    const post = await Post.create({
      business: business._id,
      postType: 'offer',
      title: 'Old title',
      content: 'Old description',
      validFrom: new Date('2026-11-04T00:00:00.000Z'),
      expiresAt: new Date('2026-11-10T00:00:00.000Z'),
    });

    const response = await request(app)
      .put(`/api/posts/${post._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Updated title',
        content: 'Updated description',
        tags: ['coffee', ' local '],
        postType: 'promotion',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      title: 'Updated title',
      content: 'Updated description',
      postType: 'offer',
      tags: ['coffee', 'local'],
      business: { businessName: business.businessName },
    });
  });

  test('rejects offer dates when the end is not after the start', async () => {
    const { token, business } = await createBusiness();
    const post = await Post.create({
      business: business._id,
      postType: 'offer',
      title: 'Offer',
      content: 'Details',
      validFrom: new Date('2026-11-04T00:00:00.000Z'),
      expiresAt: new Date('2026-11-10T00:00:00.000Z'),
    });

    const response = await request(app)
      .put(`/api/posts/${post._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ expiresAt: '2026-11-03T00:00:00.000Z' });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/after its valid-from date/i);
    expect((await Post.findById(post._id)).expiresAt.toISOString()).toBe('2026-11-10T00:00:00.000Z');
  });

  test('only the owning business can edit a post', async () => {
    const { business: owner } = await createBusiness();
    const { token: otherToken } = await createBusiness();
    const post = await Post.create({
      business: owner._id,
      postType: 'promotion',
      title: 'Promotion',
      content: 'Details',
    });

    const response = await request(app)
      .put(`/api/posts/${post._id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ title: 'Hijacked title' });

    expect(response.status).toBe(403);
  });
});
