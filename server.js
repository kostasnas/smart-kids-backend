// server.js - Smart Kids — Notification Engine + Search
import http from 'http';
import { URL } from 'url';
import { readFileSync } from 'fs';

const PORT = process.env.PORT || 3001;
const SERPAPI_KEY         = process.env.SERPAPI_KEY;
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
    const name = child.name || 'Το παιδί σου';

    if (child.birthday && child.notifyBirthday !== false) {
      const bday = new Date(child.birthday);
      const thisYear = new Date(now.getFullYear(), bday.getMonth(), bday.getDate());
      if (thisYear < now) thisYear.setFullYear(now.getFullYear() + 1);
      const daysUntil = Math.round((thisYear - now) / (1000 * 60 * 60 * 24));
      if (daysUntil === 7) reminders.push({ type:'birthday', title:`🎂 Γενέθλια ${name} σε 7 μέρες!`, body:'Έχεις ετοιμάσει δώρο; Δες ιδέες στο Smart Kids!', data:{ child:name, type:'birthday', daysUntil:'7' } });
      if (daysUntil === 3) reminders.push({ type:'birthday', title:`🎂 ${name} — 3 μέρες για γενέθλια!`, body:'Τελευταία ευκαιρία για δώρο γενεθλίων! 🎁', data:{ child:name, type:'birthday', daysUntil:'3' } });
    }

    if (child.lastShoeUpdate && child.notifySize !== false) {
      const monthsAgo = (now - new Date(child.lastShoeUpdate)) / (1000 * 60 * 60 * 24 * 30);
      if (monthsAgo >= 6) reminders.push({ type:'size', title:`👟 ${name} — Ώρα για νέο νούμερο;`, body:`Πέρασαν 6 μήνες από την τελευταία αγορά παπουτσιών.`, data:{ child:name, type:'size', category:'shoes' } });
    }

    if (child.lastClothesUpdate && child.notifySize !== false) {
      const monthsAgo = (now - new Date(child.lastClothesUpdate)) / (1000 * 60 * 60 * 24 * 30);
      if (monthsAgo >= 6) reminders.push({ type:'size', title:`👕 ${name} — Νέα ρούχα;`, body:`Πέρασαν 6 μήνες από τα τελευταία ρούχα.`, data:{ child:name, type:'size', category:'clothes' } });
    }

    const month = now.getMonth();
    const day   = now.getDate();
    if (month === 7 && day === 1 && child.notifySchool !== false) reminders.push({ type:'school', title:`🏫 Σχολείο σε 1 μήνα!`, body:`Ετοίμασε τη σχολική λίστα για ${name}!`, data:{ child:name, type:'school' } });

    if (child.notifySeasonal !== false) {
      if (month === 5 && day === 1) reminders.push({ type:'seasonal', title:`☀️ Καλοκαίρι! Ετοιμάσου!`, body:`Μαγιό, σανδάλια και καλοκαιρινά ρούχα για ${name}!`, data:{ child:name, type:'seasonal', season:'summer' } });
      if (month === 8 && day === 1) reminders.push({ type:'seasonal', title:`🍂 Φθινόπωρο — Ανανέωσε τη γκαρνταρόμπα!`, body:`Ζεστά ρούχα και μπουφάν για ${name}.`, data:{ child:name, type:'seasonal', season:'autumn' } });
      if (month === 11 && day === 1) reminders.push({ type:'christmas', title:`🎄 Χριστούγεννα σε 25 μέρες!`, body:`Ψάξε δώρα για ${name} πριν εξαντληθούν τα αποθέματα!`, data:{ child:name, type:'christmas' } });
    }
  }
  return reminders;
}

// ============================================================
// WELCOME SUGGESTIONS — στέλνει 2 notifications αμέσως
// μετά προσθήκη παιδιού, με top προϊόντα από SerpAPI
// ============================================================
async function sendWelcomeSuggestions(deviceToken, kid) {
  const name   = kid.name   || 'παιδί σου';
  const gender = kid.gender === 'Αγόρι' ? 'αγόρι' : 'κορίτσι';
  const age    = kid.age    || 5;
  const shoe   = kid.shoeSize || kid.shoe_size || getShoeSize(age)[0];

  // 2 κατηγορίες: παπούτσια + μπλούζες
  const searches = [
    { q: `παιδικά παπούτσια ${gender} ${shoe}`, label: 'παπούτσια', emoji: '👟' },
    { q: `παιδικές μπλούζες ${gender}`,          label: 'μπλούζες',  emoji: '👕' },
  ];

  let sent = 0;
  for (const s of searches) {
    try {
      const serpData = await fetchSerpApi(s.q);
      const results  = (serpData?.shopping_results || []).filter(r => r.price && r.title);
      if (results.length === 0) {
        // Fallback: στείλε generic Skroutz link
        await sendFCMNotification(
          deviceToken,
          `${s.emoji} Βρήκα ${s.label} για τον/την ${name}!`,
          `Δες τα καλύτερα αποτελέσματα στο Skroutz →`,
          { type: 'welcome_suggestion', category: s.label, link: `https://www.skroutz.gr/search?keyphrase=${encodeURIComponent(s.q)}`, kidName: name }
        );
        sent++;
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }

      // Βρίσκουμε top προϊόν: καλύτερος συνδυασμός rating + τιμή
      const top = results.sort((a, b) => {
        const pa = parseFloat((a.price||'').replace(/[^\d.,]/g,'').replace(',','.')) || 999;
        const pb = parseFloat((b.price||'').replace(/[^\d.,]/g,'').replace(',','.')) || 999;
        const ra = a.rating || 3, rb = b.rating || 3;
        return (rb * 15 - pb * 0.5) - (ra * 15 - pa * 0.5);
      })[0];

      const price = top.price || '';
      const title = (top.title || '').substring(0, 55);
      const link  = top.link || `https://www.skroutz.gr/search?keyphrase=${encodeURIComponent(s.q)}`;

      const ok = await sendFCMNotification(
        deviceToken,
        `${s.emoji} ${name}: βρήκα ${s.label}!`,
        `${title} — ${price}`,
        { type: 'welcome_suggestion', category: s.label, link, kidName: name }
      );
      if (ok) sent++;

      // 3 δευτερόλεπτα μεταξύ notifications
      await new Promise(r => setTimeout(r, 3000));
    } catch (err) {
      console.error(`welcome suggestion [${s.label}] error:`, err.message);
    }
  }
  console.log(`🎉 Welcome suggestions: ${sent}/2 sent for ${name}`);
  return sent;
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
// HELPERS
// ============================================================
function clean(str) { return (str || '').replace(/\s+/g, ' ').trim(); }
function nm(str) {
  return clean(str).toLowerCase()
    .replace(/ά/g,'α').replace(/έ/g,'ε').replace(/ή/g,'η')
    .replace(/ί/g,'ι').replace(/ό/g,'ο').replace(/ύ/g,'υ')
    .replace(/ώ/g,'ω').replace(/ϊ/g,'ι').replace(/ϋ/g,'υ')
    .replace(/ΐ/g,'ι').replace(/ΰ/g,'υ');
}

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

function detectCategory(query) {
  const q = nm(query);
  const cats = {
    SHOES:    ['παπουτσια','παπουτσι','πεδιλα','μποτακια','sneakers','shoes','boots','σανδαλια','μπαλαρινα'],
    CLOTHES:  ['ρουχα','μπλουζα','παντελονι','φορμα','φουστα','μπουφαν','φορεμα','ζακετα','κολαν','πιτζαμα','jeans','φουτερ'],
    SWIMWEAR: ['μαγιο','μπικινι','swimwear','swim','παραλια'],
    TOYS:     ['παιχνιδι','παιχνιδια','κουκλα','lego','playmobil','toy','puzzle','παζλ','επιτραπεζιο'],
    SCHOOL:   ['σχολικα','τσαντα','κασετινα','μολυβι','τετραδιο','σχολειο','school'],
    SPORTS:   ['αθλητικα','ποδοσφαιρο','μπαλα','sport','basketball','κολυμβηση'],
    BABY:     ['βρεφικα','βρεφος','μωρο','baby','νεογεννητο'],
  };
  for (const [name, triggers] of Object.entries(cats)) {
    if (triggers.some(t => q.includes(nm(t)))) return name;
  }
  return 'GENERAL';
}

function isAgeRelevant(title, age) {
  const t = nm(title || '');
  if (age < 3 && ['10-12','12 ετων','14 ετων','εφηβ'].some(k => t.includes(k))) return false;
  if (age >= 3 && ['βρεφικ','0-2','bebe','walker','περιπατητης'].some(k => t.includes(k))) return false;
  return true;
}

function generateStoreLink(item) {
  if (item.link && !item.link.includes('google.com/')) return item.link;
  if (item.product_link && !item.product_link.includes('google.com/')) return item.product_link;
  const title = encodeURIComponent(item.title || '');
  const source = (item.source || '').toLowerCase();
  if (source.includes('public'))     return `https://www.public.gr/search/?text=${title}`;
  if (source.includes('jumbo'))      return `https://www.e-jumbo.gr/search?q=${title}`;
  if (source.includes('intersport')) return `https://www.intersport.gr/search?q=${title}`;
  return `https://www.skroutz.gr/search?keyphrase=${title}`;
}

function scoreProduct(item, gender, age) {
  const title = nm(item.title || '');
  let priceValue = null;
  if (item.price) { const m = item.price.match(/[\d.,]+/); if (m) priceValue = parseFloat(m[0].replace(',','.')); }
  const genderKws = {
    'Αγόρι':   { pos:['αγορι','boys','boy'], neg:['κοριτσι','girls','girl','ροζ','pink'] },
    'Κορίτσι': { pos:['κοριτσι','girls','girl','ροζ','pink'], neg:['αγορι','boys','boy'] }
  };
  let genderScore = 0;
  if (gender && genderKws[gender]) {
    if (genderKws[gender].pos.some(k => title.includes(k))) genderScore += 100;
    if (genderKws[gender].neg.some(k => title.includes(k))) genderScore -= 150;
  }
  const priceScore   = priceValue ? Math.max(0, 100 - priceValue/2) : 50;
  const ratingScore  = item.rating ? (item.rating/5)*100 : 50;
  const reviewsScore = Math.min((item.reviews||0)/10, 50);
  return {
    priceValue, rating: item.rating || null, reviews: item.reviews || 0,
    genderScore, isAffiliate: false, source_type: 'serpapi',
    finalScore: Math.round(priceScore*0.35 + ratingScore*0.25 + reviewsScore*0.15 + 50*0.15 + genderScore*0.10),
    buyLink: generateStoreLink(item),
  };
}

async function fetchSerpApi(query) {
  if (!SERPAPI_KEY) return null;
  try {
    const url = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(query)}&hl=el&gl=gr&num=20&api_key=${SERPAPI_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) { console.warn('⚠️ SerpAPI:', data.error); return null; }
    return data;
  } catch { return null; }
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

  // ── /api/search ──
  if (parsedUrl.pathname === '/api/search' && req.method === 'GET') {
    try {
      const baseQuery      = parsedUrl.searchParams.get('q') || '';
      const gender         = parsedUrl.searchParams.get('gender') || '';
      const age            = parseInt(parsedUrl.searchParams.get('age')) || 5;
      const shoeSize       = parsedUrl.searchParams.get('shoeSize') || '';
      const clothingSize   = parsedUrl.searchParams.get('clothingSize') || '';
      const offersCategory = parsedUrl.searchParams.get('offersCategory') || '';
      const category       = detectCategory(baseQuery);

      console.log(`\n${'='.repeat(50)}`);
      console.log(`🔍 "${baseQuery}" | cat:${offersCategory || category}`);
      console.log(`👤 ${gender} | 🎂 ${age} | 👟 ${shoeSize} | 👕 ${clothingSize}`);
      console.log(`${'='.repeat(50)}`);

      const effectiveCategory = offersCategory || category;
      let serpResults = [];

      const genderGr = gender === 'Αγόρι' ? 'αγόρι' : 'κορίτσι';
      const genderEn = gender === 'Αγόρι' ? 'boys'  : 'girls';
      let sizeHint   = '';
      if (category === 'SHOES')   sizeHint = `νούμερο ${shoeSize || getShoeSize(age)[0]}`;
      if (category === 'CLOTHES') sizeHint = `μέγεθος ${clothingSize || getClothingSize(age)[0]}`;

      const serpQueries = [
        `${baseQuery} παιδικά ${genderGr} ${sizeHint}`.trim(),
        `${baseQuery} ${genderEn} ${age} years`,
      ];

      const serpRaw = await Promise.all(serpQueries.map(fetchSerpApi));
      const seenSerp = new Set();
      serpRaw.forEach(data => {
        data?.shopping_results?.forEach(item => {
          const id = item.product_id || item.link || item.title;
          if (!seenSerp.has(id)) {
            seenSerp.add(id);
            const scored = scoreProduct(item, gender, age);
            if (scored.genderScore > -50 && isAgeRelevant(item.title, age)) {
              serpResults.push({ ...item, ...scored, category: effectiveCategory });
            }
          }
        });
      });

      serpResults.sort((a, b) => b.finalScore - a.finalScore);
      console.log(`✅ SerpAPI: ${serpResults.length}`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        shopping_results: serpResults,
        metadata: { total: serpResults.length, category, gender, age, shoeSize, clothingSize }
      }));

    } catch (err) {
      console.error('❌ Search error:', err);
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

  // ── /api/welcome-suggestions ── ← ΝΕΟ
  // Καλείται αμέσως μετά αποθήκευση παιδιού
  if (parsedUrl.pathname === '/api/welcome-suggestions' && req.method === 'POST') {
    try {
      const { userId, token, kid } = await readBody();
      if (!token || !kid) { res.writeHead(400); res.end(JSON.stringify({ error: 'Missing token or kid' })); return; }

      // Τρέχει async — δεν περιμένει να τελειώσει για να απαντήσει
      sendWelcomeSuggestions(token, kid).catch(err => console.error('welcome bg error:', err.message));

      console.log(`🎉 Welcome suggestions triggered for: ${kid.name}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, message: 'Suggestions sending in background' }));
    } catch (err) {
      console.error('welcome-suggestions error:', err.message);
      res.writeHead(500); res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ── /api/test-notification ──
  if (parsedUrl.pathname === '/api/test-notification' && req.method === 'POST') {
    try {
      const { userId, token: directToken } = await readBody();
      let deviceToken = directToken;

      // Αν δεν δόθηκε token απευθείας, ψάξε από Supabase
      if (!deviceToken && userId && SUPABASE_URL && SUPABASE_KEY) {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/fcm_tokens?user_id=eq.${userId}&select=token`, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        const rows = await r.json();
        deviceToken = rows?.[0]?.token;
      }

      if (!deviceToken) { res.writeHead(400); res.end(JSON.stringify({ error: 'Token not found' })); return; }

      const ok = await sendFCMNotification(deviceToken, '🎉 Smart Kids', 'Οι ειδοποιήσεις λειτουργούν! ✅', { type: 'test' });
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
  console.log(`   SerpAPI: ${SERPAPI_KEY ? '✅' : '❌'}`);
  console.log(`   Supabase:${SUPABASE_URL ? '✅' : '❌'}`);
  console.log(`${'='.repeat(50)}\n`);

  setTimeout(() => {
    runDailyReminders();
    setInterval(runDailyReminders, 24 * 60 * 60 * 1000);
  }, 10000);
});
