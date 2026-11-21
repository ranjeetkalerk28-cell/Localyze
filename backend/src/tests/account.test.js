const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const Business = require('../models/Business');
const Post = require('../models/Post');
const Follow = require('../models/Follow');
const { setupTestDb } = require('./testDb');
const { createUser, createBusiness } = require('./fixtures');

setupTestDb();

describe('current location', () => {
  test('sets currentCity without touching the default city', async () => {
    const { token, user } = await createUser({ city: 'Mumbai' });
    const response = await request(app)
      .put('/api/user/auth/location')
      .set('Authorization', `Bearer ${token}`)
      .send({ city: 'Pune' });

    expect(response.status).toBe(200);
    const saved = await User.findById(user._id);
    expect(saved.currentCity).toBe('Pune');
    expect(saved.city).toBe('Mumbai');
  });

  test('rejects a city outside the supported list', async () => {
    const { token } = await createBusiness();
    const response = await request(app)
      .put('/api/business/auth/location')
      .set('Authorization', `Bearer ${token}`)
      .send({ city: 'Atlantis' });
    expect(response.status).toBe(400);
  });
});

describe('change password', () => {
  test('requires the current password and then accepts the new one at login', async () => {
    const { token, user } = await createUser({ password: 'oldpass1' });
    const auth = { Authorization: `Bearer ${token}` };

    const wrong = await request(app).put('/api/user/auth/password').set(auth)
      .send({ currentPassword: 'nope', newPassword: 'newpass1' });
    expect(wrong.status).toBe(400);

    const ok = await request(app).put('/api/user/auth/password').set(auth)
      .send({ currentPassword: 'oldpass1', newPassword: 'newpass1' });
    expect(ok.status).toBe(200);

    const login = await request(app).post('/api/user/auth/login')
      .send({ identifier: user.username, password: 'newpass1' });
    expect(login.status).toBe(200);
  });

  test('rejects a too-short new password', async () => {
    const { token } = await createBusiness({ password: 'oldpass1' });
    const response = await request(app).put('/api/business/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'oldpass1', newPassword: '123' });
    expect(response.status).toBe(400);
  });
});

describe('delete account', () => {
  test('a user is removed along with their follows after password confirmation', async () => {
    const { token, user } = await createUser({ password: 'secret12' });
    const { business } = await createBusiness();
    await Follow.create({ user: user._id, business: business._id });
    const auth = { Authorization: `Bearer ${token}` };

    expect((await request(app).delete('/api/user/auth/me').set(auth).send({ password: 'wrong' })).status).toBe(400);
    expect((await request(app).delete('/api/user/auth/me').set(auth).send({ password: 'secret12' })).status).toBe(200);

    expect(await User.findById(user._id)).toBeNull();
    expect(await Follow.countDocuments({ user: user._id })).toBe(0);
    expect((await request(app).get('/api/user/auth/me').set(auth)).status).toBe(401);
  });

  test('a business is removed along with its posts and followers', async () => {
    const { token, business } = await createBusiness({ password: 'secret12' });
    const { user } = await createUser();
    await Follow.create({ user: user._id, business: business._id });
    await Post.create({ business: business._id, postType: 'promotion', title: 'Bye', content: 'x' });

    const response = await request(app).delete('/api/business/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'secret12' });

    expect(response.status).toBe(200);
    expect(await Business.findById(business._id)).toBeNull();
    expect(await Post.countDocuments({ business: business._id })).toBe(0);
    expect(await Follow.countDocuments({ business: business._id })).toBe(0);
  });
});
