require('dotenv').config();
const mongoose = require('mongoose');
const Business = require('../src/models/Business');
const Post = require('../src/models/Post');

const now = new Date();
const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

const posts = [
  {
    username: 'crumbwindow.bandra',
    postType: 'promotion',
    title: 'The oven opens before the shop does',
    content:
      "We start the first bake at six, and the window's open by seven for anyone walking past. Come early for the sourdough that's still ticking, or later in the day for whatever's left on the rack.",
    tags: ['bakery', 'Food & Beverage', 'Mumbai'],
  },
  {
    username: 'dogear.delhi',
    postType: 'offer',
    title: 'Trade two for one off your tab',
    content:
      "Bring in two books you've already finished and we'll take ₹50 off whatever you're buying today. We keep the ones worth a second read on the swap shelf by the door.",
    tags: ['books', 'Books & Stationery', 'Delhi'],
    validFrom: now,
    expiresAt: twoWeeksOut,
  },
  {
    username: 'sillsociety.blr',
    postType: 'promotion',
    title: 'Bring the sad one in on Sundays',
    content:
      "Sunday mornings we look over whatever's wilting on your windowsill — free, no purchase needed. Tell us how much light it gets and we'll tell you what it's missing.",
    tags: ['plants', 'Home & Garden', 'Bengaluru'],
  },
  {
    username: 'littlespoke.pune',
    postType: 'offer',
    title: 'A tune-up before the monsoon',
    content:
      '₹300 gets your chain degreased, brakes checked, and tyres topped up before the rains start. Drop the bike off in the morning, pick it up by evening.',
    tags: ['cycling', 'Cycling', 'Pune'],
    validFrom: now,
    expiresAt: twoWeeksOut,
  },
  {
    username: 'stemparcel.hyd',
    postType: 'promotion',
    title: 'A standing order for your Tuesdays',
    content:
      "Tell us a date each week and we'll have a bunch ready without you asking. Regulars get first pick of whatever came in freshest that morning.",
    tags: ['flowers', 'Flowers & Gifts', 'Hyderabad'],
  },
];

async function seed() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not configured');
  await mongoose.connect(process.env.MONGO_URI, { autoIndex: false });

  for (const entry of posts) {
    const business = await Business.findOne({ username: entry.username });
    if (!business) {
      console.warn(`Skipped ${entry.username}: business not found`);
      continue;
    }

    await Post.create({
      business: business._id,
      postType: entry.postType,
      title: entry.title,
      content: entry.content,
      tags: entry.tags,
      validFrom: entry.validFrom || null,
      expiresAt: entry.expiresAt || null,
      visibility: 'consumers_and_businesses',
    });
    console.log(`Created ${entry.postType} post "${entry.title}" for ${entry.username}`);
  }
}

seed()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
