// server.js - Smart Kids — Notification Engine
import http from 'http';
import { URL } from 'url';
import { readFileSync } from 'fs';

const PORT = process.env.PORT || 3001;
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'smat-kids-app';
const SUPABASE_URL        = process.env.SUPABASE_URL;
const SUPABASE_KEY        = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

// ============================================================
// FIREBASE FCM HTTP v1
// ============================================================
let serviceAccount = null;
try {
  const raw = readFileSync('/etc/secrets/firebase-service-account.json', 'utf8');
  serviceAccount = JSON.parse(raw);
  console.log('✅ Firebase Service Account loaded from Secret File');
} catch {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
    if (serviceAccount.private_key) console.log('✅ Firebase Service Account loaded from ENV');
  } catch { console.warn('⚠️ Firebase Service Account not found'); }
}

let _fcmTokenCache = null;
let _fcmTokenExpiry = 0;

async function getFCMToken() {
  if (!serviceAccount?.private_key) throw new Error('No service account');
  const now = Math.floor(Date.now() / 1000);
  if (_fcmTokenCache && now < _fcmTokenExpiry) return _fcmTokenCache;

  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  })).toString('base64url');

  const { createSign } = await import('crypto');
  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const sig = sign.sign(serviceAccount.private_key, 'base64url');
  const jwt = `${header}.${payload}.${sig}`;

  const res  = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('FCM token failed: ' + JSON.stringify(data));

  _fcmTokenCache  = data.access_token;
  _fcmTokenExpiry = now + 3500;
  return _fcmTokenCache;
}

async function sendFCMNotification(deviceToken, title, body, data = {}) {
  try {
    const accessToken = await getFCMToken();
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            token: deviceToken,
            notification: { title, body },
            data: Object.fromEntries(Object.entries(data).map(([k,v]) => [k, String(v)])),
            android: { priority: 'high', notification: { sound: 'default', channel_id: 'smart_kids' } },
          }
        }),
      }
    );
    const result = await res.json();
    if (result.name) { console.log('📬 FCM sent:', result.name); return true; }
    console.warn('⚠️ FCM error:', JSON.stringify(result));
    return false;
  } catch (err) {
    console.error('❌ FCM send error:', err.message);
    return false;
  }
}

// ============================================================
// REMINDER LOGIC
// ============================================================
function calcReminders(profile) {
  const reminders = [];
  const now = new Date();

  for (const child of (profile.children || [])) {
    const name = child.name || 'Your child';

    if (child.birthday && child.notifyBirthday !== false) {
      const bday = new Date(child.birthday);
      const thisYear = new Date(now.getFullYear(), bday.getMonth(), bday.getDate());
      if (thisYear < now) thisYear.setFullYear(now.getFullYear() + 1);
      const daysUntil = Math.round((thisYear - now) / (1000 * 60 * 60 * 24));
      if (daysUntil === 7) reminders.push({ type:'birthday', title:`🎂 ${name}'s birthday in 7 days!`, body:'Have you prepared a gift? Check ideas in Smart Kids!', data:{ child:name, type:'birthday', daysUntil:'7' } });
      if (daysUntil === 3) reminders.push({ type:'birthday', title:`🎂 ${name} — 3 days until birthday!`, body:'Last chance to get a birthday gift! 🎁', data:{ child:name, type:'birthday', daysUntil:'3' } });
    }

    if (child.lastShoeUpdate && child.notifySize !== false) {
      const monthsAgo = (now - new Date(child.lastShoeUpdate)) / (1000 * 60 * 60 * 24 * 30);
      if (monthsAgo >= 6) reminders.push({ type:'size', title:`👟 ${name} — Time for a new shoe size?`, body:`It's been 6 months since the last shoe purchase.`, data:{ child:name, type:'size', category:'shoes' } });
    }

    if (child.lastClothesUpdate && child.notifySize !== false) {
      const monthsAgo = (now - new Date(child.lastClothesUpdate)) / (1000 * 60 * 60 * 24 * 30);
      if (monthsAgo >= 6) reminders.push({ type:'size', title:`👕 ${name} — New clothes needed?`, body:`It's been 6 months since the last clothes purchase.`, data:{ child:name, type:'size', category:'clothes' } });
    }

    const month = now.getMonth();
    const day   = now.getDate();
    if (month === 7 && day === 1 && child.notifySchool !== false) reminders.push({ type:'school', title:`🏫 School starts in 1 month!`, body:`Get ${name}'s school list ready!`, data:{ child:name, type:'school' } });

    if (child.notifySeasonal !== false) {
      if (month === 5 && day === 1) reminders.push({ type:'seasonal', title:`☀️ Summer is here!`, body:`Swimwear, sandals and summer clothes for ${name}!`, data:{ child:name, type:'seasonal', season:'summer' } });
      if (month === 8 && day === 1) reminders.push({ type:'seasonal', title:`🍂 Autumn — Time to refresh the wardrobe!`, body:`Warm clothes and jackets for ${name}.`, data:{ child:name, type:'seasonal', season:'autumn' } });
      if (month === 11 && day === 1) reminders.push({ type:'christmas', title:`🎄 Christmas in 25 days!`, body:`Find gifts for ${name} before stock runs out!`, data:{ child:name, type:'christmas' } });
    }
  }
  return reminders;
}

// ============================================================
// HELPERS
// ============================================================
function getShoeSize(age) {
  if (age < 1) return ['17','18','19']; if (age < 2) return ['19','20','21','22'];
  if (age < 3) return ['22','23','24','25']; if (age < 4) return ['25','26','27'];
  if (age < 5) return ['27','28','29']; if (age < 6) return ['29','30','31'];
  if (age < 7) return ['31','32','33']; if (age < 8) return ['32','33','34'];
  if (age < 9) return ['33','34','35']; if (age < 10) return ['34','35','36'];
  if (age < 11) return ['35','36','37']; if (age < 12) return ['36','37','38'];
  return ['37','38','39','40'];
}

function getClothingSize(age) {
  if (age < 0.5) return ['50','56','62']; if (age < 1) return ['62','68','74'];
  if (age < 2) return ['80','86']; if (age < 3) return ['86','92'];
  if (age < 4) return ['92','98','104']; if (age < 5) return ['104','110'];
  if (age < 6) return ['110','116']; if (age < 7) return ['116','122'];
  if (age < 8) return ['122','128']; if (age < 9) return ['128','134'];
  if (age < 10) return ['134','140']; if (age < 12) return ['140','146','152'];
  if (age < 14) return ['152','158','164']; return ['164','170','176'];
}

// ============================================================
// AMAZON SEARCH REDIRECT HELPER
// Generates Amazon search URL based on child profile
// (Will be replaced with PA API once Associates account is approved)
// ============================================================
function buildAmazonSearchUrl(query, age, gender, shoeSize, clothingSize, category) {
  const genderTerm = gender === 'boy' ? 'boys' : gender === 'girl' ? 'girls' : 'kids';
  let searchQuery = '';

  if (category === 'shoes') {
    searchQuery = `${genderTerm} shoes size ${shoeSize || getShoeSize(age)[0]}`;
  } else if (category === 'clothes') {
    searchQuery = `${genderTerm} clothing size ${clothingSize || getClothingSize(age)[0]}`;
  } else {
    searchQuery = query || `${genderTerm} kids age ${age}`;
  }

  return `https://www.amazon.com/s?k=${encodeURIComponent(searchQuery)}&tag=ASSOCIATE_TAG_HERE`;
}

// ============================================================
// DAILY REMINDER ENGINE
// ============================================================
async function runDailyReminders() {
  console.log('\n🔔 Running daily reminder check...');
  if (!SUPABASE_URL || !SUPABASE_KEY) { console.warn('⚠️ Supabase not configured — skipping'); return; }
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/fcm_tokens?select=user_id,token,profile&order=updated_at.desc`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const tokens = await res.json();
    if (!Array.isArray(tokens)) { console.warn('⚠️ No tokens found'); return; }
    console.log(`📋 Found ${tokens.length} users`);
    let sent = 0;
    for (const row of tokens) {
      if (!row.token || !row.profile) continue;
      const reminders = calcReminders(row.profile);
      for (const r of reminders) {
        const ok = await sendFCMNotification(row.token, r.title, r.body, r.data);
        if (ok) sent++;
        await new Promise(r => setTimeout(r, 200));
      }
    }
    console.log(`✅ Daily reminders done — ${sent} notifications sent\n`);
  } catch (err) { console.error('❌ Daily reminder error:', err.message); }
}

// ============================================================
// SERVER
// ============================================================
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);

  function readBody() {
    return new Promise((resolve) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch { resolve({}); } });
    });
  }

  // ── /health ──
  if (parsedUrl.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status:'ok', supabase: !!SUPABASE_URL, fcm: !!serviceAccount?.private_key }));
    return;
  }

  // ── /api/amazon-search ──
  // Returns Amazon search URL for frontend to open (redirect approach)
  // Replace with full PA API once Associates account is approved
  if (parsedUrl.pathname === '/api/amazon-search' && req.method === 'GET') {
    try {
      const query        = parsedUrl.searchParams.get('q') || '';
      const gender       = parsedUrl.searchParams.get('gender') || '';
      const age          = parseInt(parsedUrl.searchParams.get('age')) || 5;
      const shoeSize     = parsedUrl.searchParams.get('shoeSize') || '';
      const clothingSize = parsedUrl.searchParams.get('clothingSize') || '';
      const category     = parsedUrl.searchParams.get('category') || '';

      const amazonUrl = buildAmazonSearchUrl(query, age, gender, shoeSize, clothingSize, category);

      console.log(`🛒 Amazon redirect: "${query}" | ${gender} | age:${age}`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ url: amazonUrl }));
    } catch (err) {
      console.error('❌ Amazon search error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Search failed', message: err.message }));
    }
    return;
  }

  // ── /api/register-token ──
  if (parsedUrl.pathname === '/api/register-token' && req.method === 'POST') {
    try {
      const { userId, token, profile } = await readBody();
      if (!userId || !token) { res.writeHead(400); res.end(JSON.stringify({ error: 'Missing userId or token' })); return; }

      if (SUPABASE_URL && SUPABASE_KEY) {
        await fetch(`${SUPABASE_URL}/rest/v1/fcm_tokens`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Prefer': 'resolution=merge-duplicates',
          },
          body: JSON.stringify({ user_id: userId, token, profile, updated_at: new Date().toISOString() }),
        });
      }

      const reminders = profile ? calcReminders(profile) : [];
      for (const r of reminders) {
        await sendFCMNotification(token, r.title, r.body, r.data);
      }

      console.log(`📱 Token registered: ${userId.substring(0,8)}... | reminders: ${reminders.length}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, reminders: reminders.length }));
    } catch (err) {
      console.error('register-token error:', err.message);
      res.writeHead(500); res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ── /api/test-notification ──
  if (parsedUrl.pathname === '/api/test-notification' && req.method === 'POST') {
    try {
      const { userId, token: directToken } = await readBody();
      let deviceToken = directToken;

      if (!deviceToken && userId && SUPABASE_URL && SUPABASE_KEY) {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/fcm_tokens?user_id=eq.${userId}&select=token`, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        const rows = await r.json();
        deviceToken = rows?.[0]?.token;
      }

      if (!deviceToken) { res.writeHead(400); res.end(JSON.stringify({ error: 'Token not found' })); return; }

      const ok = await sendFCMNotification(deviceToken, '🎉 Smart Kids', 'Notifications are working! ✅', { type: 'test' });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok, success: ok }));
    } catch (err) {
      console.error('test-notification error:', err.message);
      res.writeHead(500); res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  res.writeHead(404); res.end('Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🚀 SMART KIDS Server on port ${PORT}`);
  console.log(`   FCM:     ${serviceAccount?.private_key ? '✅' : '❌'}`);
  console.log(`   Supabase:${SUPABASE_URL ? '✅' : '❌'}`);
  console.log(`${'='.repeat(50)}\n`);

  setTimeout(() => {
    runDailyReminders();
    setInterval(runDailyReminders, 24 * 60 * 60 * 1000);
  }, 10000);
});
