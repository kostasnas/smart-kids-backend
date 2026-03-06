// server.js - Smart Kids with Linkwise + SerpAPI fallback
import http from 'http';
import { URL } from 'url';

const PORT = process.env.PORT || 3001;
const SERPAPI_KEY = process.env.SERPAPI_KEY;

// ============================================================
// LINKWISE CONFIG
// ============================================================
const LINKWISE_FEED_URL = 'https://affiliate.linkwi.se/feeds/1.2/CD28202/programs-joined/columns-product_name,category,brand_name,tracking_url,thumb_url,in_stock,on_sale,price,discount,size/catinc-0/catex-0/proginc-10784-281,11307-622,11036-369,11562-711,14015-2746,13506-2267/progex-0/feed.json';

// Cache για το Linkwise feed (ανανεώνεται κάθε 12 ώρες)
let linkwiseCache = null;
let linkwiseCacheTime = 0;
const CACHE_TTL = 12 * 60 * 60 * 1000;

// ============================================================
// FETCH LINKWISE FEED
// ============================================================
async function fetchLinkwiseFeed() {
  const now = Date.now();
  if (linkwiseCache && (now - linkwiseCacheTime) < CACHE_TTL) {
    console.log('📦 Linkwise cache hit');
    return linkwiseCache;
  }

  try {
    console.log('🔄 Fetching Linkwise feed...');
    const res = await fetch(LINKWISE_FEED_URL);
    if (!res.ok) throw new Error(`Linkwise HTTP ${res.status}`);
    const data = await res.json();
    const all = Array.isArray(data) ? data : (data.products || data.items || []);
    linkwiseCache = all.slice(0, 1000);
    linkwiseCacheTime = now;
    console.log(`✅ Linkwise feed: ${linkwiseCache.length}/${all.length} products cached`);
    return linkwiseCache;
  } catch (err) {
    console.error('❌ Linkwise feed error:', err.message);
    return linkwiseCache || [];
  }
}

// ============================================================
// NORMALIZE GREEK
// ============================================================
function nm(str) {
  return (str || '').toLowerCase()
    .replace(/ά/g,'α').replace(/έ/g,'ε').replace(/ή/g,'η')
    .replace(/ί/g,'ι').replace(/ό/g,'ο').replace(/ύ/g,'υ')
    .replace(/ώ/g,'ω').replace(/ϊ/g,'ι').replace(/ϋ/g,'υ')
    .replace(/ΐ/g,'ι').replace(/ΰ/g,'υ');
}

// ============================================================
// QUERY MAP - Ελληνικοί όροι → λέξεις στα Linkwise δεδομένα
// ============================================================
const QUERY_MAP = {
  'παπουτσι':  ['shoes','sneaker','boot','sandal','παπουτσ','πεδιλ','σανδαλ','μποτ'],
  'παπουτσια': ['shoes','sneaker','boot','sandal','παπουτσ','πεδιλ','σανδαλ','μποτ'],
  'ρουχα':     ['ρουχ','μπλουζ','παντελον','φορεμ','ζακετ','μπουφαν','φορμ','shirt','jeans','dress'],
  'μπλουζα':   ['μπλουζ','shirt','t-shirt'],
  'παιχνιδι':  ['toy','lego','playmobil','κουκλ','αυτοκινητ','τουβλ','game','figure','παιχνιδ'],
  'παιχνιδια': ['toy','lego','playmobil','κουκλ','αυτοκινητ','τουβλ','game','figure','παιχνιδ'],
  'toys':      ['toy','lego','playmobil','τουβλ','game','figure'],
  'lego':      ['lego'],
  'playmobil': ['playmobil'],
  'σχολικ':    ['school','bag','τσαντ','σχολικ'],
  'αθλητικ':   ['sport','μπαλ','football','basketball','αθλητικ'],
  'ποδηλατ':   ['bike','bicycle','scooter','ποδηλατ','πατιν'],
  'bike':      ['bike','bicycle','ποδηλατ'],
  'tablet':    ['tablet','ipad','fire'],
  'gaming':    ['gaming','nintendo','playstation','game'],
  'δωρο':      ['toy','lego','κουκλ','game','figure','παιχνιδ'],
  'βρεφικ':    ['baby','βρεφικ','νεογν','μωρ'],
  'baby':      ['baby','βρεφικ','νεογν','μωρ'],
};

function getSearchTerms(query) {
  const q = nm(query);
  const terms = new Set();
  q.split(' ').filter(w => w.length > 2).forEach(w => terms.add(w));
  for (const [key, expansions] of Object.entries(QUERY_MAP)) {
    if (q.includes(key)) expansions.forEach(e => terms.add(e));
  }
  return Array.from(terms);
}

function cleanCategory(cat) {
  return nm((cat || '').replace(/&gt;/g,' ').replace(/&lt;/g,' ').replace(/&amp;/g,' '));
}

// ============================================================
// SEARCH LINKWISE PRODUCTS
// ============================================================
function searchLinkwise(products, query, gender, age, shoeSize, clothingSize) {
  const genderGr  = gender === 'Αγόρι' ? 'αγορι' : 'κοριτσι';
  const genderEn  = gender === 'Αγόρι' ? 'boy'   : 'girl';
  const searchTerms = getSearchTerms(query);

  return products
    .filter(p => {
      if (p.in_stock === '0' || p.in_stock === 'false') return false;

      const title    = nm(p.product_name || '');
      const category = cleanCategory(p.category);
      const brand    = nm(p.brand_name || '');
      const combined = `${title} ${category} ${brand}`;

      // Τουλάχιστον 1 term να ταιριάζει
      if (!searchTerms.some(term => combined.includes(term))) return false;

      // Φίλτρο μεγέθους παπουτσιών
      if (shoeSize && p.size) {
        const sizeStr    = nm(p.size);
        const targetSize = parseInt(shoeSize);
        const sizeMatch  = [targetSize-1, targetSize, targetSize+1].some(s => sizeStr.includes(String(s)));
        if (!sizeMatch) return false;
      }

      // Φίλτρο μεγέθους ρούχων
      if (clothingSize && p.size && !shoeSize) {
        if (!nm(p.size).includes(nm(clothingSize))) return false;
      }

      return true;
    })
    .map(p => {
      const priceValue = parseFloat((p.price || '0').replace(',','.').replace('€','').trim()) || 0;
      const title      = nm(p.product_name || '');

      let genderScore = 0;
      if (title.includes(genderGr) || title.includes(genderEn)) genderScore = 80;
      const oppGr = gender === 'Αγόρι' ? 'κοριτσι' : 'αγορι';
      const oppEn = gender === 'Αγόρι' ? 'girl'    : 'boy';
      if (title.includes(oppGr) || title.includes(oppEn)) genderScore = -150;

      if (!isAgeRelevant(p.product_name, age)) return null;

      const priceScore = priceValue ? Math.max(0, 100 - priceValue/2) : 50;

      return {
        product_id:  `lw_${Math.random().toString(36).substr(2,9)}`,
        title:       p.product_name,
        price:       priceValue ? `${priceValue.toFixed(2)}€` : 'N/A',
        priceValue,
        source:      extractStoreName(p.tracking_url || ''),
        thumbnail:   p.thumb_url || null,
        link:        p.tracking_url,
        buyLink:     p.tracking_url,   // ← ΠΑΝΤΑ το affiliate link, ποτέ Skroutz
        rating:      null,
        reviews:     0,
        brand:       p.brand_name || null,
        discount:    p.discount || null,
        on_sale:     p.on_sale === '1' || p.on_sale === 'true',
        isAffiliate: true,
        genderScore,
        finalScore:  Math.round(priceScore * 0.4 + 60 * 0.4 + genderScore * 0.1 + 10),
        source_type: 'linkwise',
        attributes:  {},
        category:    detectCategory(p.category || query),
      };
    })
    .filter(Boolean);
}

function extractStoreName(url) {
  try {
    const decoded  = decodeURIComponent(url.split('lnkurl=')[1] || url);
    const hostname = new URL(decoded).hostname.replace('www.','');
    return hostname;
  } catch {
    return 'Κατάστημα';
  }
}

// ============================================================
// AGE TO SIZE MAPPINGS
// ============================================================
function getShoeSize(age) {
  if (age < 1)  return ['17','18','19'];
  if (age < 2)  return ['19','20','21','22'];
  if (age < 3)  return ['22','23','24','25'];
  if (age < 4)  return ['25','26','27'];
  if (age < 5)  return ['27','28','29'];
  if (age < 6)  return ['29','30','31'];
  if (age < 7)  return ['31','32','33'];
  if (age < 8)  return ['32','33','34'];
  if (age < 9)  return ['33','34','35'];
  if (age < 10) return ['34','35','36'];
  if (age < 11) return ['35','36','37'];
  if (age < 12) return ['36','37','38'];
  return ['37','38','39','40'];
}

function getClothingSize(age) {
  if (age < 0.25) return ['50','56'];
  if (age < 0.5)  return ['56','62'];
  if (age < 1)    return ['62','68','74'];
  if (age < 1.5)  return ['74','80'];
  if (age < 2)    return ['80','86'];
  if (age < 3)    return ['86','92'];
  if (age < 4)    return ['92','98','104'];
  if (age < 5)    return ['104','110'];
  if (age < 6)    return ['110','116'];
  if (age < 7)    return ['116','122'];
  if (age < 8)    return ['122','128'];
  if (age < 9)    return ['128','134'];
  if (age < 10)   return ['134','140'];
  if (age < 11)   return ['140','146'];
  if (age < 12)   return ['146','152'];
  if (age < 14)   return ['152','158','164'];
  return ['164','170','176'];
}

// ============================================================
// CATEGORIES
// ============================================================
const CATEGORIES = {
  SHOES: {
    label:    'Παιδικά Παπούτσια',
    triggers: ['παπουτσια','παπουτσι','πεδιλα','μποτακια','μπαλαρινες','sneakers','shoes','boots','σανδαλια'],
    filters:  {
      size:  ['17','18','19','20','21','22','23','24','25','26','27','28','29','30','31','32','33','34','35','36','37','38','39','40'],
      brand: ['Nike','Adidas','Puma','Geox','Clarks','Skechers','Converse'],
    },
    keywords: {
      size:  Object.fromEntries([...Array(24)].map((_,i)=>{ const s=String(17+i); return [s,[s]]; })),
      brand: { 'Nike':['nike'],'Adidas':['adidas'],'Puma':['puma'],'Geox':['geox'],'Clarks':['clarks'] }
    }
  },
  CLOTHES: {
    label:    'Παιδική & Βρεφική Μόδα',
    triggers: ['ρουχα','μπλουζα','παντελονι','φορμα','φουστα','μπουφαν','φορεμα','ζακετα'],
    filters:  {
      size: ['50','56','62','68','74','80','86','92','98','104','110','116','122','128','134','140','146','152','158','164','170'],
    },
    keywords: {
      size: { '50':['50'],'56':['56'],'62':['62'],'68':['68'],'74':['74'],'80':['80'],
              '86':['86'],'92':['92'],'98':['98'],'104':['104'],'110':['110'],'116':['116'],
              '122':['122'],'128':['128'],'134':['134'],'140':['140'],'146':['146'],'152':['152'],
              '158':['158'],'164':['164'],'170':['170'] }
    }
  },
  TOYS: {
    label:    'Παιχνίδια',
    triggers: ['παιχνιδι','παιχνιδια','κουκλα','lego','playmobil','toy','δωρο'],
    filters:  { brand: ['LEGO','Playmobil','Mattel','Hasbro','Fisher-Price'] },
    keywords: {}
  }
};

function detectCategory(query) {
  const q = nm(query);
  for (const [name, cat] of Object.entries(CATEGORIES)) {
    if (cat.triggers?.some(t => q.includes(nm(t)))) return name;
  }
  return 'GENERAL';
}

function extractAttributes(item, category) {
  const title = nm(item.title || '');
  const attrs = {};
  const cat   = CATEGORIES[category];
  if (!cat?.keywords) return attrs;
  for (const [filterType, valueKeywords] of Object.entries(cat.keywords)) {
    for (const [value, keywords] of Object.entries(valueKeywords)) {
      if (keywords.some(kw => title.includes(nm(kw)))) {
        if (!attrs[filterType]) attrs[filterType] = [];
        if (!attrs[filterType].includes(value)) attrs[filterType].push(value);
      }
    }
  }
  return attrs;
}

function collectFilters(products, category) {
  const sets = {};
  products.forEach(p => {
    Object.entries(p.attributes || {}).forEach(([key, value]) => {
      if (!sets[key]) sets[key] = new Set();
      if (Array.isArray(value)) value.forEach(v => v && sets[key].add(v));
      else if (value) sets[key].add(value);
    });
  });
  const result = {};
  const cat = CATEGORIES[category];
  if (cat?.filters) {
    Object.keys(cat.filters).forEach(filterType => {
      if (sets[filterType]?.size > 0) {
        const defined = cat.filters[filterType];
        const found   = Array.from(sets[filterType]);
        const sorted  = [...defined.filter(d => found.includes(d)), ...found.filter(f => !defined.includes(f))];
        if (sorted.length > 0) result[filterType] = sorted;
      }
    });
  }
  return result;
}

// ============================================================
// AGE RELEVANCE
// ============================================================
function isAgeRelevant(title, age) {
  const t         = nm(title || '');
  const babyKws   = ['βρεφικ','0-2','bebe','βρεφ','walker','περιπατητης','παρκοκρεβατ'];
  const toddlerKws= ['τρικυκλ','tricycle','2-4 ετων','3-5 ετων'];
  const olderKws  = ['10-12','12 ετων','14 ετων','εφηβ'];
  const isBaby    = babyKws.some(k => t.includes(k));
  const isToddler = toddlerKws.some(k => t.includes(k));
  const isOlder   = olderKws.some(k => t.includes(k));
  if (age < 3)  return !isOlder;
  if (age < 6)  return !isBaby && !isOlder;
  if (age < 10) return !isBaby && !isToddler;
  return !isBaby && !isToddler;
}

// ============================================================
// GENERATE STORE LINK για SerpAPI
// Χρησιμοποιεί το ΑΠΕΥΘΕΙΑΣ link του καταστήματος — ποτέ Skroutz fallback
// ============================================================
function generateStoreLink(item) {
  // Αν έχει direct link (όχι google.com) → το χρησιμοποιούμε
  if (item.link && !item.link.includes('google.com/')) return item.link;

  // Αν έχει product_link (SerpAPI field) → ακόμα καλύτερα
  if (item.product_link && !item.product_link.includes('google.com/')) return item.product_link;

  // Fallback: αναζήτηση στο Skroutz μόνο αν ΔΕΝ έχουμε link καθόλου
  const title  = encodeURIComponent(item.title || '');
  const source = (item.source || '').toLowerCase();
  if (source.includes('public'))  return `https://www.public.gr/search/?text=${title}`;
  if (source.includes('jumbo'))   return `https://www.e-jumbo.gr/search?q=${title}`;
  if (source.includes('kotsovolos')) return `https://www.kotsovolos.gr/search?q=${title}`;
  return `https://www.skroutz.gr/search?keyphrase=${title}`;
}

// ============================================================
// SCORE SERPAPI PRODUCT
// ============================================================
function scoreProduct(item, gender, age) {
  const title  = nm(item.title || '');
  const source = (item.source || '').toLowerCase();

  let priceValue = null;
  if (item.price) {
    const m = item.price.match(/[\d.,]+/);
    if (m) priceValue = parseFloat(m[0].replace(',','.'));
  }

  const genderKws = {
    'Αγόρι':   { pos:['αγορι','boys','boy'], neg:['κοριτσι','girls','girl','ροζ','pink'] },
    'Κορίτσι': { pos:['κοριτσι','girls','girl','ροζ','pink'], neg:['αγορι','boys','boy'] }
  };

  let genderScore = 0;
  if (gender && genderKws[gender]) {
    if (genderKws[gender].pos.some(k => title.includes(k))) genderScore += 100;
    if (genderKws[gender].neg.some(k => title.includes(k))) genderScore -= 150;
  }

  const shopScores = { 'skroutz':95,'public':90,'intersport':90,'jumbo':85,'zara':85,'h&m':85 };
  let shopScore = 50;
  for (const [s, sc] of Object.entries(shopScores)) {
    if (source.includes(s)) { shopScore = sc; break; }
  }

  const priceScore   = priceValue ? Math.max(0, 100 - priceValue/2) : 50;
  const ratingScore  = item.rating ? (item.rating / 5) * 100 : 50;
  const reviewsScore = Math.min((item.reviews || 0) / 10, 50);

  return {
    priceValue,
    rating:      item.rating || null,
    reviews:     item.reviews || 0,
    genderScore,
    isAffiliate: false,
    source_type: 'serpapi',
    finalScore:  Math.round(priceScore*0.35 + ratingScore*0.25 + reviewsScore*0.15 + shopScore*0.15 + genderScore*0.10),
    buyLink:     generateStoreLink(item),
  };
}

// ============================================================
// FETCH SERPAPI
// ============================================================
async function fetchQuery(query) {
  if (!SERPAPI_KEY) return null;
  try {
    const url  = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(query)}&hl=el&gl=gr&num=20&api_key=${SERPAPI_KEY}`;
    const res  = await fetch(url);
    const data = await res.json();
    if (data.error) { console.warn('⚠️ SerpAPI error:', data.error); return null; }
    return data;
  } catch {
    return null;
  }
}

// ============================================================
// MERGE & DEDUPLICATE
// ============================================================
function mergeResults(linkwiseResults, serpResults) {
  const seen   = new Set();
  const merged = [];

  for (const p of linkwiseResults) {
    const key = nm(p.title || '').substring(0, 30);
    if (!seen.has(key)) { seen.add(key); merged.push(p); }
  }

  for (const p of serpResults) {
    const key = nm(p.title || '').substring(0, 30);
    if (!seen.has(key)) { seen.add(key); merged.push(p); }
  }

  return merged;
}

// ============================================================
// SERVER
// ============================================================
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);

  if (parsedUrl.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status:'ok', linkwiseCached:!!linkwiseCache, cacheSize:linkwiseCache?.length||0 }));
    return;
  }

  if (parsedUrl.pathname === '/api/search' && req.method === 'GET') {
    try {
      const baseQuery    = parsedUrl.searchParams.get('q') || '';
      const gender       = parsedUrl.searchParams.get('gender') || '';
      const age          = parseInt(parsedUrl.searchParams.get('age')) || 5;
      const shoeSize     = parsedUrl.searchParams.get('shoeSize') || '';
      const clothingSize = parsedUrl.searchParams.get('clothingSize') || '';

      const category = detectCategory(baseQuery);
      const catLabel = CATEGORIES[category]?.label || 'Γενικά';

      console.log(`\n${'='.repeat(55)}`);
      console.log(`🔍 "${baseQuery}" → 📂 ${catLabel}`);
      console.log(`👤 ${gender} | 🎂 ${age} | 👟 ${shoeSize} | 👕 ${clothingSize}`);
      console.log(`${'='.repeat(55)}`);

      // ── 1. LINKWISE ───────────────────────────────────────
      const feedProducts   = await fetchLinkwiseFeed();
      const linkwiseResults = searchLinkwise(feedProducts, baseQuery, gender, age, shoeSize, clothingSize)
        .map(p => ({ ...p, attributes: extractAttributes(p, category) }));
      console.log(`📦 Linkwise: ${linkwiseResults.length} results`);

      // ── 2. SERPAPI ────────────────────────────────────────
      let serpResults = [];
      const genderGr = gender === 'Αγόρι' ? 'αγόρι' : 'κορίτσι';
      const genderEn = gender === 'Αγόρι' ? 'boys'  : 'girls';

      let sizeHint = '';
      if (category === 'SHOES')   sizeHint = `νούμερο ${(shoeSize     || getShoeSize(age)[0])}`;
      if (category === 'CLOTHES') sizeHint = `μέγεθος ${(clothingSize || getClothingSize(age)[0])}`;

      const queries = [
        `${baseQuery} παιδικά ${genderGr} ${sizeHint}`.trim(),
        `kids ${baseQuery} ${genderEn}`,
        `${baseQuery} ${genderGr} ${age} ετών`,
      ];

      const serpRaw  = await Promise.all(queries.map(fetchQuery));
      const seenSerp = new Set();

      serpRaw.forEach(data => {
        data?.shopping_results?.forEach(item => {
          const id = item.product_id || item.link || item.title;
          if (!seenSerp.has(id)) {
            seenSerp.add(id);
            const scored = scoreProduct(item, gender, age);
            if (scored.genderScore > -50 && isAgeRelevant(item.title, age)) {
              serpResults.push({ ...item, ...scored, attributes: extractAttributes(item, category), category });
            }
          }
        });
      });
      console.log(`🌐 SerpAPI: ${serpResults.length} results`);

      // ── 3. MERGE & SORT ───────────────────────────────────
      const merged = mergeResults(linkwiseResults, serpResults);

      // Affiliate πρώτα, μετά κατά score
      merged.sort((a, b) => {
        if (a.isAffiliate && !b.isAffiliate) return -1;
        if (!a.isAffiliate && b.isAffiliate) return 1;
        return b.finalScore - a.finalScore;
      });

      const availableFilters = collectFilters(merged, category);
      if (category === 'SHOES')   availableFilters.suggestedSize = shoeSize     ? [shoeSize]     : getShoeSize(age);
      if (category === 'CLOTHES') availableFilters.suggestedSize = clothingSize ? [clothingSize] : getClothingSize(age);

      console.log(`✅ Total: ${merged.length} (${linkwiseResults.length} affiliate + ${serpResults.length} serp)`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        shopping_results: merged,
        metadata: {
          total:            merged.length,
          affiliateCount:   linkwiseResults.length,
          serpCount:        serpResults.length,
          category,
          categoryLabel:    catLabel,
          availableFilters,
          sizeSource:       shoeSize || clothingSize ? 'profile' : 'age',
        }
      }));

    } catch (err) {
      console.error('❌', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Search failed', message: err.message }));
    }
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n${'='.repeat(55)}`);
  console.log(`🚀 SMART KIDS - Linkwise + SerpAPI`);
  console.log(`   Server live on port ${PORT}`);
  console.log(`${'='.repeat(55)}\n`);
  fetchLinkwiseFeed().catch(console.error);
});
