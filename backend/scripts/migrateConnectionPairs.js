require('dotenv').config();
const mongoose = require('mongoose');
const Connection = require('../src/models/Connection');

async function migrate() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not configured');
  await mongoose.connect(process.env.MONGO_URI, { autoIndex: false });
  const open = { status: { $in: ['pending', 'accepted'] } };
  const projection = { requester: 1, recipient: 1, pairKey: 1 };
  const seen = new Map();

  for await (const row of Connection.collection.find(open, { projection })) {
    const key = Connection.pairKey(row.requester, row.recipient);
    if (seen.has(key)) {
      throw new Error(`Resolve duplicate open connections ${seen.get(key)} and ${row._id} before retrying`);
    }
    seen.set(key, row._id);
  }
  for await (const row of Connection.collection.find(open, { projection })) {
    const key = Connection.pairKey(row.requester, row.recipient);
    if (row.pairKey !== key) {
      await Connection.collection.updateOne({ _id: row._id }, { $set: { pairKey: key } });
    }
  }
  await Connection.createIndexes();
  console.log(`Verified ${seen.size} open connection pairs and installed the unique index`);
}

migrate()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
