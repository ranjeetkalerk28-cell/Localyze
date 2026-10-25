// One-off dev utility: empties every collection in the connected database
// (keeps the collections, indexes, and schema — just removes documents,
// same as a SQL TRUNCATE). Run manually, never from application code.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

async function resetDatabase() {
  await mongoose.connect(process.env.MONGO_URI);
  const dbName = mongoose.connection.db.databaseName;
  const collections = await mongoose.connection.db.collections();

  if (!collections.length) {
    console.log(`No collections found in "${dbName}".`);
  }

  for (const collection of collections) {
    const { deletedCount } = await collection.deleteMany({});
    console.log(`Cleared ${collection.collectionName}: ${deletedCount} document(s) removed`);
  }

  await mongoose.disconnect();
  console.log(`Done. "${dbName}" is now empty.`);
}

resetDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Reset failed:', error.message);
    process.exit(1);
  });
