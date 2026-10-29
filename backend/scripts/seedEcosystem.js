/**
 * seedEcosystem.js
 * Creates a full demo ecosystem for Localyze:
 *   - 7 business accounts (with logo photos uploaded to Cloudinary)
 *   - 7 consumer accounts (with avatar photos uploaded to Cloudinary)
 *   - 18 posts with relevant images (uploaded to Cloudinary)
 *   - Consumer follows, post likes
 *   - Business collaborations (sent + accepted)
 *   - Business connections (sent + accepted)
 *   - accounts.xlsx saved at project root
 *
 * Run from project root or /backend:  node scripts/seedEcosystem.js
 */

require('dotenv').config();
const https = require('https');
const http = require('http');
const path = require('path');
const fs = require('fs');

const BASE_URL = `http://localhost:${process.env.PORT || 5000}/api`;

// ─── Generic HTTP JSON helper ─────────────────────────────────────────────────
function request(method, urlPath, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + urlPath);
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (payload) options.headers['Content-Length'] = Buffer.byteLength(payload);
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ─── Download image buffer from a URL (follows redirects) ────────────────────
function downloadImage(imageUrl) {
  return new Promise((resolve, reject) => {
    const lib = imageUrl.startsWith('https') ? https : http;
    lib.get(imageUrl, { headers: { 'User-Agent': 'LocalyzeSeed/1.0' } }, (res) => {
      // Follow redirect
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadImage(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Image download failed: ${res.statusCode} for ${imageUrl}`));
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: res.headers['content-type'] || 'image/jpeg' }));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// ─── Upload image buffer to /api/uploads/image (multipart form-data) ─────────
function uploadImage(buffer, filename, contentType, token, type = 'profile') {
  return new Promise((resolve, reject) => {
    const boundary = `----FormBoundary${Math.random().toString(16).slice(2)}`;
    const CRLF = '\r\n';

    const header = [
      `--${boundary}`,
      `Content-Disposition: form-data; name="image"; filename="${filename}"`,
      `Content-Type: ${contentType}`,
      '',
      '',
    ].join(CRLF);

    const footer = `${CRLF}--${boundary}--${CRLF}`;
    const bodyBuf = Buffer.concat([
      Buffer.from(header),
      buffer,
      Buffer.from(footer),
    ]);

    const url = new URL(`${BASE_URL}/uploads/image?type=${type}`);
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': bodyBuf.length,
        'Authorization': `Bearer ${token}`,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.write(bodyBuf);
    req.end();
  });
}

// ─── Download + upload helper (returns { url, publicId } or null on failure) ──
async function fetchAndUpload(imageUrl, filename, token, type = 'profile') {
  try {
    const { buffer, contentType } = await downloadImage(imageUrl);
    const res = await uploadImage(buffer, filename, contentType, token, type);
    if (res.status === 200 || res.status === 201) {
      return { url: res.body.url, publicId: res.body.publicId };
    }
    warn(`    Upload failed (${res.status}): ${JSON.stringify(res.body)}`);
    return null;
  } catch (e) {
    warn(`    fetchAndUpload error for ${filename}: ${e.message}`);
    return null;
  }
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function log(msg) { console.log(`[SEED] ${msg}`); }
function warn(msg) { console.warn(`[WARN] ${msg}`); }

// ─── Curated Unsplash image URLs ──────────────────────────────────────────────
// All use the stable cdn URL format with w=800 for reasonable file size.
const IMG = {
  // Business logos
  brewbites:    'https://images.unsplash.com/photo-1556742526-795a8eac090e?w=800&q=80&fm=jpg&fit=crop',
  pixelstudio: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80&fm=jpg&fit=crop',
  greenleaf:   'https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?w=800&q=80&fm=jpg&fit=crop',
  neonthreads: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800&q=80&fm=jpg&fit=crop',
  techhive:    'https://images.unsplash.com/photo-1531539427495-97c44a449837?w=800&q=80&fm=jpg&fit=crop',
  spiceroute:  'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&q=80&fm=jpg&fit=crop',
  luminary:    'https://images.unsplash.com/photo-1519741347686-c1e0aadf4611?w=800&q=80&fm=jpg&fit=crop',

  // Consumer avatars
  aanya:   'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&q=80&fm=jpg&fit=crop&crop=face',
  rohan:   'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80&fm=jpg&fit=crop&crop=face',
  priya:   'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80&fm=jpg&fit=crop&crop=face',
  vikram:  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80&fm=jpg&fit=crop&crop=face',
  meera:   'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400&q=80&fm=jpg&fit=crop&crop=face',
  arjun:   'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&q=80&fm=jpg&fit=crop&crop=face',
  sneha:   'https://images.unsplash.com/photo-1521252659862-eec69941b071?w=400&q=80&fm=jpg&fit=crop&crop=face',

  // Post images (per business, per post index)
  brewbites_p0: 'https://images.unsplash.com/photo-1504630083234-14187a9df0f5?w=800&q=80&fm=jpg&fit=crop', // brunch table
  brewbites_p1: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80&fm=jpg&fit=crop', // cold brew coffee
  brewbites_p2: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80&fm=jpg&fit=crop', // latte art / collab post

  pixelstudio_p0: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=80&fm=jpg&fit=crop', // design desk
  pixelstudio_p1: 'https://images.unsplash.com/photo-1572044162444-ad60f128bdea?w=800&q=80&fm=jpg&fit=crop', // brand audit / colors

  greenleaf_p0: 'https://images.unsplash.com/photo-1588286840104-8957b019727f?w=800&q=80&fm=jpg&fit=crop', // morning yoga
  greenleaf_p1: 'https://images.unsplash.com/photo-1594058573823-d8edf1ad3380?w=800&q=80&fm=jpg&fit=crop', // wellness membership
  greenleaf_p2: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80&fm=jpg&fit=crop', // wellness collab

  neonthreads_p0: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80&fm=jpg&fit=crop', // clothing rack
  neonthreads_p1: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&q=80&fm=jpg&fit=crop', // hoodie

  techhive_p0: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&q=80&fm=jpg&fit=crop', // coworking open house
  techhive_p1: 'https://images.unsplash.com/photo-1526378722484-bd91ca387e72?w=800&q=80&fm=jpg&fit=crop', // desk pass
  techhive_p2: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80&fm=jpg&fit=crop', // startup event collab

  spiceroute_p0: 'https://images.unsplash.com/photo-1617391258031-f8d80b22fb77?w=800&q=80&fm=jpg&fit=crop', // south indian food
  spiceroute_p1: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&q=80&fm=jpg&fit=crop', // thali / lunch

  luminary_p0: 'https://images.unsplash.com/photo-1519741347686-c1e0aadf4611?w=800&q=80&fm=jpg&fit=crop', // wedding decor
  luminary_p1: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80&fm=jpg&fit=crop', // venue consultation
  luminary_p2: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=80&fm=jpg&fit=crop', // collab / photography
};

// ─── Account Definitions ──────────────────────────────────────────────────────

const BUSINESSES = [
  {
    businessName: 'Brew & Bites Mumbai',
    username: 'brewbites.mumbai',
    email: 'brewbites.mumbai@localyze.demo',
    password: 'Brew@1234',
    industry: 'Food & Beverage',
    description: 'Artisan coffee roasters and all-day brunch cafe in the heart of Mumbai. Locally sourced, freshly brewed.',
    city: 'Mumbai',
    logoKey: 'brewbites',
  },
  {
    businessName: 'Pixel Studio Delhi',
    username: 'pixelstudio.delhi',
    email: 'pixelstudio.delhi@localyze.demo',
    password: 'Pixel@1234',
    industry: 'Creative & Design',
    description: 'Award-winning graphic design and branding agency based in New Delhi.',
    city: 'Delhi',
    logoKey: 'pixelstudio',
  },
  {
    businessName: 'GreenLeaf Wellness Bengaluru',
    username: 'greenleaf.blr',
    email: 'greenleaf.blr@localyze.demo',
    password: 'Green@1234',
    industry: 'Health & Wellness',
    description: 'Holistic wellness center offering yoga, nutrition coaching, and Ayurvedic therapies in Bengaluru.',
    city: 'Bengaluru',
    logoKey: 'greenleaf',
  },
  {
    businessName: 'Neon Threads Pune',
    username: 'neonthreads.pune',
    email: 'neonthreads.pune@localyze.demo',
    password: 'Neon@1234',
    industry: 'Fashion & Apparel',
    description: 'Sustainable streetwear brand handcrafted in Pune. Bold designs, ethical choices.',
    city: 'Pune',
    logoKey: 'neonthreads',
  },
  {
    businessName: 'TechHive Hyderabad',
    username: 'techhive.hyd',
    email: 'techhive.hyd@localyze.demo',
    password: 'Tech@1234',
    industry: 'Technology',
    description: 'Co-working space and startup incubator in Hyderabad. Fueling the next generation of tech founders.',
    city: 'Hyderabad',
    logoKey: 'techhive',
  },
  {
    businessName: 'Spice Route Chennai',
    username: 'spiceroute.chennai',
    email: 'spiceroute.chennai@localyze.demo',
    password: 'Spice@1234',
    industry: 'Food & Beverage',
    description: 'Authentic South Indian restaurant celebrating regional flavours.',
    city: 'Chennai',
    logoKey: 'spiceroute',
  },
  {
    businessName: 'Luminary Events Jaipur',
    username: 'luminary.jaipur',
    email: 'luminary.jaipur@localyze.demo',
    password: 'Lumin@1234',
    industry: 'Events & Entertainment',
    description: 'Full-service event management company crafting unforgettable weddings, corporate events, and festivals in Jaipur.',
    city: 'Jaipur',
    logoKey: 'luminary',
  },
];

const CONSUMERS = [
  { name: 'Aanya Sharma',  username: 'aanya.sharma',  email: 'aanya.sharma@localyze.demo',  password: 'Aanya@1234',  bio: 'Coffee addict and design enthusiast. Always exploring Mumbai one cafe at a time.', interests: ['Food & Beverage', 'Creative & Design'], city: 'Mumbai',    avatarKey: 'aanya'  },
  { name: 'Rohan Mehta',   username: 'rohan.mehta',   email: 'rohan.mehta@localyze.demo',   password: 'Rohan@1234',  bio: 'Tech entrepreneur and fitness buff in Hyderabad. Loves discovering local startups.', interests: ['Technology', 'Health & Wellness'], city: 'Hyderabad',  avatarKey: 'rohan'  },
  { name: 'Priya Nair',    username: 'priya.nair',    email: 'priya.nair@localyze.demo',    password: 'Priya@1234',  bio: 'Yoga instructor and wellness blogger from Bengaluru.', interests: ['Health & Wellness', 'Food & Beverage'], city: 'Bengaluru',  avatarKey: 'priya'  },
  { name: 'Vikram Joshi',  username: 'vikram.joshi',  email: 'vikram.joshi@localyze.demo',  password: 'Vikram@1234', bio: 'Fashion-forward professional in Pune. Supports local brands over fast fashion.', interests: ['Fashion & Apparel', 'Creative & Design'], city: 'Pune',       avatarKey: 'vikram' },
  { name: 'Meera Iyer',   username: 'meera.iyer',   email: 'meera.iyer@localyze.demo',   password: 'Meera@1234',  bio: 'Food critic and culture writer in Chennai. Life is too short for bad food.', interests: ['Food & Beverage', 'Events & Entertainment'], city: 'Chennai',    avatarKey: 'meera'  },
  { name: 'Arjun Kapoor',  username: 'arjun.kapoor',  email: 'arjun.kapoor@localyze.demo',  password: 'Arjun@1234',  bio: 'Event planner and photographer based in Jaipur.', interests: ['Events & Entertainment', 'Creative & Design'], city: 'Jaipur',     avatarKey: 'arjun'  },
  { name: 'Sneha Reddy',   username: 'sneha.reddy',   email: 'sneha.reddy@localyze.demo',   password: 'Sneha@1234',  bio: 'Delhi-based marketing professional who loves discovering new brands.', interests: ['Creative & Design', 'Fashion & Apparel'], city: 'Delhi',      avatarKey: 'sneha'  },
];

// Post definitions — imageKey maps to IMG above
const POSTS = {
  'brewbites.mumbai': [
    { title: 'Weekend Brunch Special', content: 'Join us every Saturday & Sunday for our signature brunch spread — eggs benedict, sourdough toast, fresh-pressed juices, and unlimited filter coffee. Reservations open now!', tags: ['brunch', 'coffee', 'weekend', 'mumbai'], postType: 'promotion', visibility: 'public', imageKey: 'brewbites_p0' },
    { title: '30% Off Cold Brews — This Week Only!', content: 'Beat the Mumbai heat with our award-winning cold brew collection. Vanilla Nitro, Classic Cold Brew, and our new Coconut Cold Brew — all at 30% off until Sunday.', tags: ['coldbrew', 'offer', 'coffee', 'mumbai'], postType: 'offer', visibility: 'public', validFrom: new Date().toISOString(), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), imageKey: 'brewbites_p1' },
    { title: 'Looking for Brand Collab Partner', content: 'Brew & Bites is looking for a local creative agency or design studio to co-create our next seasonal campaign. If you believe in great coffee and great design, let\'s talk!', tags: ['collaboration', 'branding', 'coffee'], postType: 'collaboration', visibility: 'businesses_only', imageKey: 'brewbites_p2' },
  ],
  'pixelstudio.delhi': [
    { title: 'Brand Identity Packages — Now Open', content: 'We\'re accepting new clients for Q4 brand identity projects. Full-package includes logo, typography system, color palette, brand guidelines, and social media kit.', tags: ['branding', 'design', 'delhi', 'identity'], postType: 'promotion', visibility: 'public', imageKey: 'pixelstudio_p0' },
    { title: 'Free Brand Audit — 48 Hours Only', content: 'Get a free 30-minute brand audit session with our senior designer. Only 5 slots available!', tags: ['brandaudit', 'offer', 'design', 'delhi'], postType: 'offer', visibility: 'public', validFrom: new Date().toISOString(), expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), imageKey: 'pixelstudio_p1' },
  ],
  'greenleaf.blr': [
    { title: 'Morning Yoga & Meditation — New Batch', content: 'Our popular 6 AM sunrise yoga + guided meditation program is starting a new batch next Monday. Limited to 12 participants.', tags: ['yoga', 'meditation', 'wellness', 'bengaluru'], postType: 'promotion', visibility: 'public', imageKey: 'greenleaf_p0' },
    { title: 'First Month Free — Annual Wellness Membership', content: 'Sign up for our annual wellness membership and get your first month completely free. Includes unlimited yoga sessions, monthly nutrition consultation, and access to our wellness library.', tags: ['membership', 'offer', 'wellness', 'yoga'], postType: 'offer', visibility: 'public', validFrom: new Date().toISOString(), expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), imageKey: 'greenleaf_p1' },
    { title: 'Wellness x Cafe Collab Opportunity', content: 'Looking to partner with a local cafe or food brand in Bengaluru for a "Wellness Morning" pop-up event series.', tags: ['collaboration', 'wellness', 'popup', 'bengaluru'], postType: 'collaboration', visibility: 'businesses_only', imageKey: 'greenleaf_p2' },
  ],
  'neonthreads.pune': [
    { title: 'Winter Drop 2026 — Available Now', content: 'Our most anticipated collection is here. 12 new pieces, all made from organic cotton and recycled fabrics. Each item is numbered — once sold, it\'s gone forever.', tags: ['fashion', 'sustainable', 'newdrop', 'pune'], postType: 'promotion', visibility: 'public', imageKey: 'neonthreads_p0' },
    { title: 'Flat 25% Off on All Hoodies', content: 'Pune winters call for our bestselling hoodies. Use code NEONWINTER at checkout for 25% off your entire hoodie order. Valid until stocks last.', tags: ['hoodies', 'offer', 'fashion', 'discount'], postType: 'offer', visibility: 'public', validFrom: new Date().toISOString(), expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), imageKey: 'neonthreads_p1' },
  ],
  'techhive.hyd': [
    { title: 'Open House — Hyderabad\'s Coolest Co-working Space', content: 'Come tour TechHive this Friday! See our hot desks, private pods, podcast studio, and rooftop event space. Free coffee and snacks for all visitors.', tags: ['coworking', 'startup', 'hyderabad', 'openhouse'], postType: 'promotion', visibility: 'public', imageKey: 'techhive_p0' },
    { title: '3-Month Desk Pass — Launch Offer', content: 'Founding member rate: get a dedicated desk at TechHive for 3 months at ₹8,999/month (regular ₹12,500). Only 10 desks available at this rate.', tags: ['coworking', 'offer', 'hyderabad', 'startup'], postType: 'offer', visibility: 'public', validFrom: new Date().toISOString(), expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), imageKey: 'techhive_p1' },
    { title: 'Seeking Event Partner for Startup Summit', content: 'TechHive is organizing Hyderabad\'s biggest startup networking event in November. Looking for an events company, branding partner, and F&B sponsor.', tags: ['collaboration', 'startup', 'event', 'hyderabad'], postType: 'collaboration', visibility: 'businesses_only', imageKey: 'techhive_p2' },
  ],
  'spiceroute.chennai': [
    { title: 'Chef\'s Table Experience — Every Friday', content: 'Join our Head Chef for an intimate 8-course tasting menu every Friday evening. Only 10 seats per evening.', tags: ['chefstable', 'dining', 'chennai', 'southindian'], postType: 'promotion', visibility: 'public', imageKey: 'spiceroute_p0' },
    { title: 'Lunch Thali at ₹199 — Weekdays Only', content: 'Our legendary lunch thali is now at ₹199 on all weekdays. 7 items, unlimited rice, and a filter coffee.', tags: ['thali', 'offer', 'lunch', 'chennai'], postType: 'offer', visibility: 'public', validFrom: new Date().toISOString(), expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), imageKey: 'spiceroute_p1' },
  ],
  'luminary.jaipur': [
    { title: 'Now Booking: Wedding Season 2027', content: 'Luminary Events is now accepting bookings for the 2027 wedding season. We craft bespoke, unforgettable celebrations from intimate ceremonies to grand royal-themed receptions.', tags: ['wedding', 'events', 'jaipur', '2027'], postType: 'promotion', visibility: 'public', imageKey: 'luminary_p0' },
    { title: 'Free Venue Consultation — October Special', content: 'Book a free 1-hour venue consultation with our lead event planner this October. No strings attached.', tags: ['wedding', 'offer', 'consultation', 'jaipur'], postType: 'offer', visibility: 'public', validFrom: new Date().toISOString(), expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), imageKey: 'luminary_p1' },
    { title: 'Collab: Looking for Photography & Decor Partners', content: 'We\'re building our preferred vendor network for the 2027 wedding season. Seeking talented photographers, videographers, and decor studios in Rajasthan.', tags: ['collaboration', 'photography', 'decor', 'jaipur'], postType: 'collaboration', visibility: 'businesses_only', imageKey: 'luminary_p2' },
  ],
};

const FOLLOW_MAP = {
  'aanya.sharma':  ['brewbites.mumbai', 'pixelstudio.delhi'],
  'rohan.mehta':   ['techhive.hyd', 'greenleaf.blr'],
  'priya.nair':    ['greenleaf.blr', 'brewbites.mumbai'],
  'vikram.joshi':  ['neonthreads.pune', 'pixelstudio.delhi'],
  'meera.iyer':    ['spiceroute.chennai', 'luminary.jaipur'],
  'arjun.kapoor':  ['luminary.jaipur', 'techhive.hyd'],
  'sneha.reddy':   ['pixelstudio.delhi', 'neonthreads.pune'],
};

const COLLAB_REQUESTS = [
  { from: 'brewbites.mumbai',   to: 'pixelstudio.delhi',  message: 'Would love to collaborate on our seasonal branding campaign!' },
  { from: 'greenleaf.blr',      to: 'brewbites.mumbai',   message: 'A wellness x cafe pop-up series would be perfect for both our audiences.' },
  { from: 'techhive.hyd',       to: 'luminary.jaipur',    message: 'Looking for an events partner for our upcoming Startup Summit in Hyderabad.' },
  { from: 'neonthreads.pune',   to: 'pixelstudio.delhi',  message: 'Keen to work on our Winter Drop 2026 campaign visuals together.' },
];

const CONNECTION_REQUESTS = [
  { from: 'spiceroute.chennai', to: 'luminary.jaipur' },
  { from: 'techhive.hyd',       to: 'neonthreads.pune' },
  { from: 'pixelstudio.delhi',  to: 'greenleaf.blr' },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const credentials = [];
  const businessTokens = {};
  const businessIds = {};
  const consumerTokens = {};

  // ── 1. Register / login businesses ──────────────────────────────────────────
  log('=== Registering Businesses ===');
  for (const biz of BUSINESSES) {
    const { logoKey, ...payload } = biz;
    const res = await request('POST', '/business/auth/register', payload);
    let token = null;
    if (res.status === 201 || res.status === 200) {
      token = res.body.token;
      log(`  ✓ Registered: ${biz.businessName} (@${biz.username})`);
    } else {
      const lr = await request('POST', '/business/auth/login', { email: biz.email, password: biz.password });
      if (lr.status === 200) { token = lr.body.token; log(`  ↩ Logged in: ${biz.businessName}`); }
      else { warn(`  ✗ Could not register/login ${biz.businessName}: ${JSON.stringify(res.body)}`); }
    }
    if (token) {
      businessTokens[biz.username] = token;
      credentials.push({ type: 'Business', name: biz.businessName, username: biz.username, email: biz.email, password: biz.password, city: biz.city, industry: biz.industry });
    }
    await sleep(200);
  }

  // ── 2. Fetch business IDs ────────────────────────────────────────────────────
  log('\n=== Fetching Business IDs ===');
  for (const biz of BUSINESSES) {
    if (!businessTokens[biz.username]) continue;
    const res = await request('GET', '/business/auth/me', null, businessTokens[biz.username]);
    if (res.status === 200) {
      businessIds[biz.username] = res.body._id;
      log(`  ✓ @${biz.username} → ${res.body._id}`);
    }
    await sleep(100);
  }

  // ── 3. Upload business logos ─────────────────────────────────────────────────
  log('\n=== Uploading Business Logos ===');
  for (const biz of BUSINESSES) {
    const token = businessTokens[biz.username];
    if (!token) continue;
    log(`  Uploading logo for @${biz.username}...`);
    const imgUrl = IMG[biz.logoKey];
    const result = await fetchAndUpload(imgUrl, `${biz.username}-logo.jpg`, token, 'profile');
    if (result) {
      const upd = await request('PUT', '/business/auth/me', { logoUrl: result.url }, token);
      if (upd.status === 200) log(`  ✓ Logo set for @${biz.username}`);
      else warn(`  ✗ Logo update failed: ${JSON.stringify(upd.body)}`);
    }
    await sleep(300);
  }

  // ── 4. Register / login consumers ────────────────────────────────────────────
  log('\n=== Registering Consumers ===');
  for (const user of CONSUMERS) {
    const { avatarKey, ...payload } = user;
    const res = await request('POST', '/user/auth/register', payload);
    let token = null;
    if (res.status === 201 || res.status === 200) {
      token = res.body.token;
      log(`  ✓ Registered: ${user.name} (@${user.username})`);
    } else {
      const lr = await request('POST', '/user/auth/login', { email: user.email, password: user.password });
      if (lr.status === 200) { token = lr.body.token; log(`  ↩ Logged in: ${user.name}`); }
      else { warn(`  ✗ Could not register/login ${user.name}: ${JSON.stringify(res.body)}`); }
    }
    if (token) {
      consumerTokens[user.username] = token;
      credentials.push({ type: 'Consumer', name: user.name, username: user.username, email: user.email, password: user.password, city: user.city, industry: '' });
    }
    await sleep(200);
  }

  // ── 5. Upload consumer avatars ───────────────────────────────────────────────
  log('\n=== Uploading Consumer Avatars ===');
  for (const user of CONSUMERS) {
    const token = consumerTokens[user.username];
    if (!token) continue;
    log(`  Uploading avatar for @${user.username}...`);
    const result = await fetchAndUpload(IMG[user.avatarKey], `${user.username}-avatar.jpg`, token, 'profile');
    if (result) {
      const upd = await request('PUT', '/user/auth/me', { avatarUrl: result.url }, token);
      if (upd.status === 200) log(`  ✓ Avatar set for @${user.username}`);
      else warn(`  ✗ Avatar update failed: ${JSON.stringify(upd.body)}`);
    }
    await sleep(300);
  }

  // ── 6. Create posts with images ──────────────────────────────────────────────
  log('\n=== Creating Posts with Images ===');
  for (const [bizUsername, posts] of Object.entries(POSTS)) {
    const token = businessTokens[bizUsername];
    if (!token) { warn(`  No token for @${bizUsername}`); continue; }

    for (const post of posts) {
      const { imageKey, ...postPayload } = post;
      log(`  Uploading image for "${post.title}"...`);

      // Upload post image first
      const imgResult = await fetchAndUpload(IMG[imageKey], `${bizUsername}-${imageKey}.jpg`, token, 'post');
      if (imgResult) {
        postPayload.imageUrl = imgResult.url;
        postPayload.imagePublicId = imgResult.publicId;
      }

      const res = await request('POST', '/posts', postPayload, token);
      if (res.status === 201 || res.status === 200) {
        log(`  ✓ Post created: "${post.title}" (${bizUsername})`);
      } else {
        warn(`  ✗ Post failed (${bizUsername}): ${JSON.stringify(res.body)}`);
      }
      await sleep(300);
    }
  }

  // ── 7. Consumer follows ──────────────────────────────────────────────────────
  log('\n=== Setting Up Consumer Follows ===');
  for (const [consumerUsername, bizUsernames] of Object.entries(FOLLOW_MAP)) {
    const token = consumerTokens[consumerUsername];
    if (!token) continue;
    for (const biz of bizUsernames) {
      const bizId = businessIds[biz];
      if (!bizId) continue;
      const res = await request('POST', `/follows/${bizId}`, null, token);
      if (res.status === 201 || res.status === 200) log(`  ✓ @${consumerUsername} follows @${biz}`);
      else warn(`  ✗ Follow failed: ${JSON.stringify(res.body)}`);
      await sleep(150);
    }
  }

  // ── 8. Collaboration requests + accept ───────────────────────────────────────
  log('\n=== Collaborations ===');
  const collabIds = {};
  for (const c of COLLAB_REQUESTS) {
    const fromToken = businessTokens[c.from];
    const toId = businessIds[c.to];
    if (!fromToken || !toId) continue;
    const res = await request('POST', '/collaborations', { recipientId: toId, message: c.message }, fromToken);
    if (res.status === 201 || res.status === 200) {
      collabIds[`${c.from}->${c.to}`] = res.body._id;
      log(`  ✓ Collab request: @${c.from} → @${c.to}`);
    } else {
      warn(`  ✗ Collab failed: ${JSON.stringify(res.body)}`);
    }
    await sleep(200);
  }
  for (const c of COLLAB_REQUESTS) {
    const id = collabIds[`${c.from}->${c.to}`];
    const token = businessTokens[c.to];
    if (!id || !token) continue;
    const res = await request('PUT', `/collaborations/${id}`, { status: 'active' }, token);
    if (res.status === 200) log(`  ✓ Collab accepted: @${c.to} ← @${c.from}`);
    else warn(`  ✗ Accept failed: ${JSON.stringify(res.body)}`);
    await sleep(200);
  }

  // ── 9. Connection requests + accept ─────────────────────────────────────────
  log('\n=== Connections ===');
  const connIds = {};
  for (const c of CONNECTION_REQUESTS) {
    const fromToken = businessTokens[c.from];
    const toId = businessIds[c.to];
    if (!fromToken || !toId) continue;
    const res = await request('POST', `/connections/${toId}`, null, fromToken);
    if (res.status === 201 || res.status === 200) {
      connIds[`${c.from}->${c.to}`] = res.body._id;
      log(`  ✓ Connection request: @${c.from} → @${c.to}`);
    } else {
      warn(`  ✗ Connection failed: ${JSON.stringify(res.body)}`);
    }
    await sleep(200);
  }
  for (const c of CONNECTION_REQUESTS) {
    const id = connIds[`${c.from}->${c.to}`];
    const token = businessTokens[c.to];
    if (!id || !token) continue;
    const res = await request('PUT', `/connections/${id}`, { status: 'accepted' }, token);
    if (res.status === 200) log(`  ✓ Connection accepted: @${c.to} ← @${c.from}`);
    else warn(`  ✗ Connection accept failed: ${JSON.stringify(res.body)}`);
    await sleep(200);
  }

  // ── 10. Consumers like posts ─────────────────────────────────────────────────
  log('\n=== Consumers Liking Posts ===');
  for (const [consumerUsername, bizUsernames] of Object.entries(FOLLOW_MAP)) {
    const token = consumerTokens[consumerUsername];
    if (!token) continue;
    for (const biz of bizUsernames) {
      const bizId = businessIds[biz];
      if (!bizId) continue;
      const postsRes = await request('GET', `/businesses/${bizId}/posts`, null, token);
      if (postsRes.status === 200 && Array.isArray(postsRes.body) && postsRes.body.length > 0) {
        const post = postsRes.body[0];
        const likeRes = await request('PUT', `/posts/${post._id}/like`, null, token);
        if (likeRes.status === 200) log(`  ✓ @${consumerUsername} liked a post from @${biz}`);
      }
      await sleep(150);
    }
  }

  // ── 11. Write accounts.xlsx ──────────────────────────────────────────────────
  log('\n=== Writing accounts.xlsx ===');
  await writeExcel(credentials);

  log('\n✅ Done!');
  log(`   Businesses : ${BUSINESSES.length}`);
  log(`   Consumers  : ${CONSUMERS.length}`);
  log(`   Posts      : ${Object.values(POSTS).flat().length} (with images)`);
  log(`   Collabs    : ${COLLAB_REQUESTS.length} (accepted)`);
  log(`   Connections: ${CONNECTION_REQUESTS.length} (accepted)`);
}

// ─── Excel Writer ─────────────────────────────────────────────────────────────
async function writeExcel(credentials) {
  const outDir = path.join(__dirname, '../..');
  const xlsxPath = path.join(outDir, 'accounts.xlsx');
  const csvPath  = path.join(outDir, 'accounts.csv');
  try {
    const XLSX = require('xlsx');
    const rows = [
      ['Type', 'Name / Business Name', 'Username', 'Email', 'Password', 'City', 'Industry'],
      ...credentials.map((c) => [c.type, c.name, c.username, c.email, c.password, c.city, c.industry]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 10 }, { wch: 28 }, { wch: 22 }, { wch: 35 }, { wch: 16 }, { wch: 18 }, { wch: 24 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Accounts');
    XLSX.writeFile(wb, xlsxPath);
    log(`  ✓ accounts.xlsx saved → ${xlsxPath}`);
  } catch (e) {
    warn(`  xlsx not found (${e.message}) — writing CSV instead`);
    const header = 'Type,Name / Business Name,Username,Email,Password,City,Industry';
    const rows = credentials.map((c) =>
      [c.type, `"${c.name}"`, c.username, c.email, c.password, c.city, c.industry].join(',')
    );
    fs.writeFileSync(csvPath, [header, ...rows].join('\n'), 'utf8');
    log(`  ✓ accounts.csv saved → ${csvPath}`);
  }
}

main().catch((err) => { console.error('[SEED] Fatal:', err); process.exit(1); });
