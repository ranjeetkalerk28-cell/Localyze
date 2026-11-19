const request = require('supertest');
const app = require('../app');
const Connection = require('../models/Connection');
const { setupTestDb } = require('./testDb');
const { createBusiness } = require('./fixtures');

setupTestDb();

test('recommendations show up to three available local businesses and exclude a newly requested connection', async () => {
  const { business: me, token } = await createBusiness({ businessName: '0 Self' });
  const [incoming, connected, ...available] = await Promise.all(
    ['0 Incoming', '0 Connected', 'A', 'B', 'C', 'D'].map((businessName) => createBusiness({ businessName }))
  );
  await createBusiness({ city: 'Delhi', businessName: '0 Other city' });
  await Connection.create([
    { requester: incoming.business._id, recipient: me._id, status: 'pending' },
    { requester: me._id, recipient: connected.business._id, status: 'accepted' },
  ]);
  const auth = { Authorization: `Bearer ${token}` };
  const recommendations = () => request(app).get('/api/connections/recommendations').set(auth).expect(200);
  const first = await recommendations();
  expect(first.body.map((item) => item.businessName)).toEqual(['A', 'B', 'C']);
  await request(app).post(`/api/connections/${available[0].business.id}`).set(auth).expect(201);
  expect((await recommendations()).body.map((item) => item.businessName)).toEqual(['B', 'C', 'D']);
});
