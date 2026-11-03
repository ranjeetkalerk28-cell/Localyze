const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Each test file gets its own in-memory MongoDB instance -- no cross-process
// env sharing needed, and suites can run in parallel without colliding.
let mongoServer;

const setupTestDb = () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    await mongoose.connect(mongoServer.getUri());
  });

  afterEach(async () => {
    const { collections } = mongoose.connection;
    await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });
};

module.exports = { setupTestDb };
