require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  const Business = mongoose.model('Business', new mongoose.Schema({}, { strict: false }));
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Post = mongoose.model('Post', new mongoose.Schema({}, { strict: false }));
  const Follow = mongoose.model('Follow', new mongoose.Schema({}, { strict: false }));
  const Connection = mongoose.model('Connection', new mongoose.Schema({}, { strict: false }));
  const Collaboration = mongoose.model('Collaboration', new mongoose.Schema({}, { strict: false }));
  const Activity = mongoose.model('Activity', new mongoose.Schema({}, { strict: false }));

  console.log({
    businesses: await Business.countDocuments(),
    users: await User.countDocuments(),
    posts: await Post.countDocuments({ status: { $ne: 'deleted' } }),
    follows: await Follow.countDocuments(),
    connections: await Connection.countDocuments(),
    collaborations: await Collaboration.countDocuments(),
    activities: await Activity.countDocuments(),
  });

  await mongoose.disconnect();
}

check().catch(console.error);
