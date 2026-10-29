require('dotenv').config();
const http = require('http');
const https = require('https');

const BASE_URL = `http://localhost:${process.env.PORT || 5000}/api`;

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

function downloadImage(imageUrl) {
  return new Promise((resolve, reject) => {
    const lib = imageUrl.startsWith('https') ? https : http;
    lib.get(imageUrl, { headers: { 'User-Agent': 'LocalyzeSeed/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadImage(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Download failed: ${res.statusCode} for ${imageUrl}`));
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: res.headers['content-type'] || 'image/jpeg' }));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function uploadImage(buffer, filename, contentType, token, type = 'post') {
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

async function fetchAndUpload(imageUrl, filename, token, type = 'post') {
  try {
    const { buffer, contentType } = await downloadImage(imageUrl);
    const res = await uploadImage(buffer, filename, contentType, token, type);
    if (res.status === 200 || res.status === 201) {
      return { url: res.body.url, publicId: res.body.publicId };
    }
    console.warn(`Upload failed (${res.status}): ${JSON.stringify(res.body)}`);
    return null;
  } catch (e) {
    console.warn(`fetchAndUpload error: ${e.message}`);
    return null;
  }
}

const COLLAB_POSTS = [
  {
    bizEmail: 'brewbites.mumbai@localyze.demo',
    bizPassword: 'Brew@1234',
    title: 'Looking for Brand Collab Partner',
    content: "Brew & Bites is looking for a local creative agency or design studio to co-create our next seasonal campaign. If you believe in great coffee and great design, let's talk!",
    tags: ['collaboration', 'branding', 'coffee'],
    postType: 'collaboration',
    visibility: 'businesses_only',
    imgUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80&fm=jpg&fit=crop',
    filename: 'brewbites-collab.jpg',
  },
  {
    bizEmail: 'greenleaf.blr@localyze.demo',
    bizPassword: 'Green@1234',
    title: 'Wellness x Cafe Collab Opportunity',
    content: 'Looking to partner with a local cafe or food brand in Bengaluru for a "Wellness Morning" pop-up event series. Healthy brunch, yoga sessions, and mindful living talks.',
    tags: ['collaboration', 'wellness', 'popup', 'bengaluru'],
    postType: 'collaboration',
    visibility: 'businesses_only',
    imgUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80&fm=jpg&fit=crop',
    filename: 'greenleaf-collab.jpg',
  },
  {
    bizEmail: 'techhive.hyd@localyze.demo',
    bizPassword: 'Tech@1234',
    title: 'Seeking Event Partner for Startup Summit',
    content: "TechHive is organizing Hyderabad's biggest startup networking event in November. Looking for an events company, branding partner, and F&B sponsor.",
    tags: ['collaboration', 'startup', 'event', 'hyderabad'],
    postType: 'collaboration',
    visibility: 'businesses_only',
    imgUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80&fm=jpg&fit=crop',
    filename: 'techhive-collab.jpg',
  },
  {
    bizEmail: 'luminary.jaipur@localyze.demo',
    bizPassword: 'Lumin@1234',
    title: 'Collab: Looking for Photography & Decor Partners',
    content: "We're building our preferred vendor network for the 2027 wedding season. Seeking talented photographers, videographers, and decor studios in Rajasthan.",
    tags: ['collaboration', 'photography', 'decor', 'jaipur'],
    postType: 'collaboration',
    visibility: 'businesses_only',
    imgUrl: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=80&fm=jpg&fit=crop',
    filename: 'luminary-collab.jpg',
  },
];

async function run() {
  for (const item of COLLAB_POSTS) {
    const loginRes = await request('POST', '/business/auth/login', { email: item.bizEmail, password: item.bizPassword });
    if (loginRes.status !== 200) {
      console.error(`Login failed for ${item.bizEmail}:`, loginRes.body);
      continue;
    }
    const token = loginRes.body.token;

    console.log(`Uploading image for: "${item.title}"`);
    const imgData = await fetchAndUpload(item.imgUrl, item.filename, token, 'post');

    const postPayload = {
      title: item.title,
      content: item.content,
      tags: item.tags,
      postType: item.postType,
      visibility: item.visibility,
    };
    if (imgData) {
      postPayload.imageUrl = imgData.url;
      postPayload.imagePublicId = imgData.publicId;
    }

    const postRes = await request('POST', '/posts', postPayload, token);
    if (postRes.status === 201 || postRes.status === 200) {
      console.log(`✓ Collaboration post created: "${item.title}"`);
    } else {
      console.error(`✗ Failed to create post "${item.title}":`, postRes.body);
    }
  }
}

run().catch(console.error);
