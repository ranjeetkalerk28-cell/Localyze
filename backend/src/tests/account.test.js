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

describe('business address and maps link', () => {
  const save = (token, body) =>
    request(app).put('/api/business/auth/me').set('Authorization', `Bearer ${token}`).send(body);

  test('saves, publicly returns and clears address and mapsUrl', async () => {
    const { token, business } = await createBusiness();
    const body = { address: 'Shop 12, 4th Cross, Indiranagar, Bengaluru', mapsUrl: 'https://maps.app.goo.gl/abc123' };

    expect((await save(token, body)).status).toBe(200);
    const profile = await request(app).get(`/api/businesses/${business._id}`).set("Authorization", `Bearer ${token}`);
    expect(profile.body).toMatchObject(body);

    expect((await save(token, { address: '', mapsUrl: '' })).status).toBe(200);
    const cleared = await Business.findById(business._id);
    expect(cleared.address).toBe('');
    expect(cleared.mapsUrl).toBe('');
  });

  test('accepts the common Google Maps link formats', async () => {
    const { token } = await createBusiness();
    for (const mapsUrl of [
      'https://www.google.com/maps/place/Common+Ground',
      'https://google.com/maps?q=12.97,77.59',
      'https://maps.google.com/?q=shop',
      'https://goo.gl/maps/xyz',
    ]) {
      expect((await save(token, { mapsUrl })).status).toBe(200);
    }
  });

  test('rejects links that are not Google Maps', async () => {
    const { token } = await createBusiness();
    for (const mapsUrl of [
      'javascript:alert(1)',
      'https://evil.com',
      'http://maps.app.goo.gl/abc',
      'https://google.com.evil.com/maps',
      'https://www.google.com/search?q=maps',
      'https://user:pw@www.google.com/maps',
    ]) {
      expect((await save(token, { mapsUrl })).status).toBe(400);
    }
  });

  test('rejects an address over 100 characters', async () => {
    const { token } = await createBusiness();
    expect((await save(token, { address: 'a'.repeat(101) })).status).toBe(400);
  });

  test('a business with neither field still works', async () => {
    const { business, token } = await createBusiness();
    const profile = await request(app).get(`/api/businesses/${business._id}`).set("Authorization", `Bearer ${token}`);
    expect(profile.status).toBe(200);
    expect(profile.body.address || '').toBe('');
    expect(profile.body.mapsUrl || '').toBe('');
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

describe('business contact info', () => {
  const save = (token, body) =>
    request(app).put('/api/business/auth/me').set('Authorization', `Bearer ${token}`).send(body);
  const publicProfile = (viewerToken, id) =>
    request(app).get(`/api/businesses/${id}`).set('Authorization', `Bearer ${viewerToken}`);

  test("a consumer sees a business's registered email and saved phone", async () => {
    const { token, business } = await createBusiness({ email: 'hello@shop.example' });
    const { token: consumerToken } = await createUser();

    expect((await save(token, { phone: '+91 98765-43210' })).status).toBe(200);
    const profile = await publicProfile(consumerToken, business._id);
    expect(profile.status).toBe(200);
    expect(profile.body.email).toBe('hello@shop.example');
    expect(profile.body.phone).toBe('+919876543210');
    expect(profile.body.password).toBeUndefined();
  });

  test('normalises spaces, dashes and brackets before saving', async () => {
    const { token, business } = await createBusiness();
    await save(token, { phone: '(022) 2345 6789' });
    expect((await Business.findById(business._id)).phone).toBe('02223456789');
  });

  test('rejects numbers that are too short, too long or not numeric', async () => {
    const { token } = await createBusiness();
    for (const phone of ['12345', '12345678901234', 'call me', '98765x43210', '++919876543210']) {
      expect((await save(token, { phone })).status).toBe(400);
    }
  });

  test('clears the phone, and the email stays available without one', async () => {
    const { token, business } = await createBusiness();
    await save(token, { phone: '9876543210' });
    expect((await save(token, { phone: '' })).status).toBe(200);
    const profile = await publicProfile(token, business._id);
    expect(profile.body.phone || '').toBe('');
    expect(profile.body.email).toBe(business.email);
  });
});
