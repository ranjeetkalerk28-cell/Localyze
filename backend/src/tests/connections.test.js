const request = require('supertest');
const app = require('../app');
const Connection = require('../models/Connection');
const Collaboration = require('../models/Collaboration');
const { setupTestDb } = require('./testDb');
const { createBusiness } = require('./fixtures');

setupTestDb({ replicaSet: true });

const send = (sender, recipient) =>
  request(app).post(`/api/connections/${recipient.business.id}`).set('Authorization', `Bearer ${sender.token}`);

const respond = (recipient, id, status) =>
  request(app).put(`/api/connections/${id}`).set('Authorization', `Bearer ${recipient.token}`).send({ status });

test('legacy pairs allow indexing, new requests and collaboration acceptance in either direction', async () => {
  const first = await createBusiness();
  const second = await createBusiness();
  const third = await createBusiness();
  await Connection.init();
  await Connection.collection.dropIndex('unique_keyed_open_connection_pair');
  await Connection.collection.insertMany([
    { requester: second.business._id, recipient: first.business._id, status: 'pending' },
    { requester: third.business._id, recipient: first.business._id, status: 'accepted' },
  ]);
  await Connection.createIndexes();
  await send(second, third).expect(201);
  const duplicate = await send(first, second).expect(400);
  expect(duplicate.body.status).toBe('pending_received');

  const propose = () => request(app).post('/api/collaborations')
    .set('Authorization', `Bearer ${first.token}`).send({ recipientId: second.business.id, message: 'Joint offers' });
  const responses = await Promise.all([propose(), propose()]);
  expect(responses.map(r => r.status).sort()).toEqual([200, 201]);
  expect(responses[0].body._id).toBe(responses[1].body._id);
  const profile = () => request(app).get(`/api/businesses/${second.business.id}`)
    .set('Authorization', `Bearer ${first.token}`).expect(200);
  expect((await profile()).body).toMatchObject({ collaborationRequested: true, connectionStatus: 'pending_received' });
  await request(app).put(`/api/collaborations/${responses[0].body._id}`)
    .set('Authorization', `Bearer ${second.token}`).send({ status: 'active' }).expect(200);
  expect((await profile()).body).toMatchObject({
    collaborationRequested: false, connectionStatus: 'connected', connectionsCount: 1, collaborationsCount: 1,
  });
  expect(await Connection.countDocuments()).toBe(3);
});

test('simultaneous requests in either direction create only one open connection', async () => {
  const first = await createBusiness();
  const second = await createBusiness();
  const responses = await Promise.all([send(first, second), send(second, first), send(first, second)]);

  expect(responses.map(({ status }) => status).sort()).toEqual([201, 400, 400]);
  expect(await Connection.countDocuments()).toBe(1);
});

test('the first decision wins and a repeat of that decision succeeds', async () => {
  const first = await createBusiness();
  const second = await createBusiness();
  const { body } = await send(first, second).expect(201);
  await respond(first, body._id, 'accepted').expect(403);
  const responses = await Promise.all([
    respond(second, body._id, 'accepted'),
    respond(second, body._id, 'rejected'),
  ]);

  expect(responses.map(({ status }) => status).sort()).toEqual([200, 409]);
  const decision = responses.find(({ status }) => status === 200).body.status;
  await respond(second, body._id, decision).expect(200);
  expect((await Connection.findById(body._id)).status).toBe(decision);
});

test('a rejected request releases the pair and status uses the new open request', async () => {
  const first = await createBusiness();
  const second = await createBusiness();
  const { body } = await send(first, second).expect(201);
  await respond(second, body._id, 'rejected').expect(200);
  await send(second, first).expect(201);

  await request(app).get(`/api/connections/${second.business.id}/status`)
    .set('Authorization', `Bearer ${first.token}`).expect(200, { status: 'pending_received' });
});

test('accepting a collaboration and sending a request concurrently leave one accepted connection', async () => {
  const first = await createBusiness();
  const second = await createBusiness();
  const collaboration = await Collaboration.create({ requester: first.business._id, recipient: second.business._id });

  const [, response] = await Promise.all([
    request(app).put(`/api/collaborations/${collaboration.id}`)
      .set('Authorization', `Bearer ${second.token}`).send({ status: 'active' }).expect(200),
    send(second, first),
  ]);

  expect([201, 400]).toContain(response.status);
  expect(await Connection.find().distinct('status')).toEqual(['accepted']);
  expect(await Connection.countDocuments()).toBe(1);
  expect((await Collaboration.findById(collaboration.id)).status).toBe('active');
});

test('a connection write failure rolls back acceptance and the recipient can retry', async () => {
  const first = await createBusiness();
  const second = await createBusiness();
  const collaboration = await Collaboration.create({ requester: first.business._id, recipient: second.business._id });
  const accept = () => request(app).put(`/api/collaborations/${collaboration.id}`)
    .set('Authorization', `Bearer ${second.token}`).send({ status: 'active' });

  const acceptConnection = Connection.acceptForCollaboration.bind(Connection);
  const write = jest.spyOn(Connection, 'acceptForCollaboration').mockImplementationOnce(async (...args) => {
    await acceptConnection(...args);
    throw new Error('failure before commit');
  });
  try {
    await accept().expect(500);
    expect((await Collaboration.findById(collaboration.id)).status).toBe('pending');
    expect(await Connection.countDocuments()).toBe(0);
  } finally {
    write.mockRestore();
  }
  await accept().expect(200);
  await accept().expect(200);
  expect(await Connection.countDocuments({ status: 'accepted' })).toBe(1);
});
