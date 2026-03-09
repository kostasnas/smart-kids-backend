// server.js - Smart Kids with Linkwise + SerpAPI
import http from 'http';
import { URL } from 'url';

const PORT = process.env.PORT || 3001;
const SERPAPI_KEY = process.env.SERPAPI_KEY;

// ============================================================
// LINKWISE FEEDS ΑΝΑ ΚΑΤΗΓΟΡΙΑ
// ============================================================
const LW_BASE = 'https://affiliate.linkwi.se/feeds/1.2/CD28202/programs-joined/columns-product_name,category,brand_name,tracking_url,thumb_url,in_stock,on_sale,price,discount,size/catinc-0/catex-0';

const LW_FEED_URL = `${LW_BASE}/proginc-10784-281,11307-622,13208-2081,11562-711,14015-2746,11036-369,12761-1652,12323-1271,13506-2267,10632-237,13712-2432,11754-880,11764-1059,13604-2421,138-2273,12174-1176,14123-2770,13199-1967,12345-1289,385-251,469-2142,469-2139,469-2136,469-301,469-300,469-299,13255-2053,13884-2555/progex-0/feed.json`;

// Ποιες κατηγορίες χρησιμοποιούν ΜΟΝΟ SerpAPI (δεν υπάρχουν στο Linkwise)
const SERP_ONLY_CATEGORIES = ['sports', 'bikes', 'tech', 'gaming', 'school_bags', 'school_supplies', 'baby_gear', 'baby_safety'];

let feedCache = null;
let feedCacheTime = 0;
const CACHE_TTL = 12 * 60 * 60 * 1000;

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

// ============================================================
// FETCH LINKWISE FEED
// ============================================================
async function fetchFeed() {
  const now = Date.now();
  if (feedCache && (now - feedCacheTime) < CACHE_TTL) return feedCache;

  try {
    console.log('🔄 Fetching unified Linkwise feed...');
    const res  = await fetch(LW_FEED_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const all  = Array.isArray(data) ? data : (data.products || data.items || []);

    feedCache = all
      .filter(p => {
        const stock = (p.in_stock || '').toString().toLowerCase().trim();
        if (stock === '0' || stock === 'n' || stock === 'false') return false;
        const cat = nm(p.category || '');
        if (cat.includes('ανδρ') || cat.includes('men ') || cat.includes('/men')) return false;
        if (cat.includes('γυναικ') || cat.includes('women')) return false;
        return true;
      })
      .map(p => ({
        product_name: clean(p.product_name),
        category:     clean(p.category),
        brand_name:   clean(p.brand_name),
        tracking_url: p.tracking_url,
        thumb_url:    p.thumb_url,
        in_stock:     '1',
        on_sale:      p.on_sale,
        price:        clean(p.price),
        discount:     p.discount,
        size:         clean(p.size),
      }));

    feedCacheTime = now;
    console.log(`✅ Unified feed: ${feedCache.length}/${all.length} products`);
    return feedCache;
  } catch (err) {
    console.error('❌ Feed error:', err.message);
    return feedCache || [];
  }
}

// Επιλογή feed ανά κατηγορία offers
function getFeedTypeForCategory(offersCategory) {
  // All categories now use the unified feed
  const linkwiseCategories = ['shoes','baby_shoes','toys','baby_toys','clothes','baby_clothes','baby_essentials'];
  return linkwiseCategories.includes(offersCategory) ? 'all' : null;
}

// ============================================================
// AGE / SIZE MAPPINGS
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
// CATEGORY DETECTION (για Home search)
// ============================================================
const CATEGORIES = {
  SHOES: {
    label:    'Παιδικά Παπούτσια',
    triggers: ['παπουτσια','παπουτσι','πεδιλα','μποτακια','sneakers','shoes','boots','σανδαλια','υποδηματα'],
    filters:  { size: ['17','18','19','20','21','22','23','24','25','26','27','28','29','30','31','32','33','34','35','36','37','38','39','40'] },
    keywords: { size: Object.fromEntries([...Array(24)].map((_,i)=>{ const s=String(17+i); return [s,[s]]; })) }
  },
  CLOTHES: {
    label:    'Παιδική & Βρεφική Μόδα',
    triggers: ['ρουχα','μπλουζα','παντελονι','φορμα','φουστα','μπουφαν','φορεμα','ζακετα','κολαν','πιτζαμα','εσωρουχα','καλτσες','μαγιο','μαγιω','μαγιώ','swimwear','μπικινι','ολοσωμο','παρεο','swim'],
    filters:  { size: ['50','56','62','68','74','80','86','92','98','104','110','116','122','128','134','140','146','152','158','164','170'] },
    keywords: { size: { '50':['50'],'56':['56'],'62':['62'],'68':['68'],'74':['74'],'80':['80'],'86':['86'],'92':['92'],'98':['98'],'104':['104'],'110':['110'],'116':['116'],'122':['122'],'128':['128'],'134':['134'],'140':['140'],'146':['146'],'152':['152'],'158':['158'],'164':['164'],'170':['170'] } }
  },
  SWIMWEAR: {
    label:    'Παιδικά Μαγιό & Καλοκαιρινά',
    triggers: ['μαγιο','μαγιω','μαγιό','swimwear','μπικινι','ολοσωμο μαγιο','παιδικο μαγιο','swim'],
    filters:  { size: ['74','80','86','92','98','104','110','116','122','128','134','140','146','152','158','164'], type: ['Ολόσωμο','Μπικίνι / Δύο τεμάχια','Σορτς / Μπόξερ','Παρεό'] },
    keywords: {
      size: { '74':['74'],'80':['80'],'86':['86'],'92':['92'],'98':['98'],'104':['104'],'110':['110'],'116':['116'],'122':['122'],'128':['128'],'134':['134'],'140':['140'],'146':['146'],'152':['152'],'158':['158'],'164':['164'] },
      type: { 'Ολόσωμο':['ολοσωμο','one piece','swimsuit'], 'Μπικίνι / Δύο τεμάχια':['μπικινι','bikini','δυο τεμ'], 'Σορτς / Μπόξερ':['σορτς','boxer','swim short'], 'Παρεό':['παρεο','pareo'] }
    }
  },
  TOYS: {
    label:    'Παιχνίδια',
    triggers: ['παιχνιδι','παιχνιδια','κουκλα','lego','playmobil','toy','δωρο','puzzle','παζλ','επιτραπεζιο'],
    filters:  { brand: ['LEGO','Playmobil','Mattel','Hasbro','Fisher-Price','Clementoni'] },
    keywords: { brand: { 'LEGO':['lego'],'Playmobil':['playmobil'],'Mattel':['mattel'],'Hasbro':['hasbro'],'Fisher-Price':['fisher'],'Clementoni':['clementoni'] } }
  },
  SCHOOL: {
    label:    'Σχολικά Είδη',
    triggers: ['σχολικα','τσαντα','κασετινα','μολυβι','τετραδιο','σχολειο','school'],
    filters:  { type: ['Τσάντες','Κασετίνες','Γραφική Ύλη','Τετράδια'] },
    keywords: { type: { 'Τσάντες':['τσαντ'],'Κασετίνες':['κασετ'],'Γραφική Ύλη':['μολυβ','στυλο','μαρκαδ'],'Τετράδια':['τετραδ'] } }
  },
  SPORTS: {
    label:    'Αθλητικά Είδη',
    triggers: ['αθλητικα','ποδοσφαιρο','μπαλα','ποδοσφαιρικα','αθλητισμος','sport'],
    filters:  { type: ['Ρούχα','Παπούτσια','Εξοπλισμός'] },
    keywords: {}
  },
  SUMMER: {
    label:    'Καλοκαιρινά',
    triggers: ['καλοκαιρινα','summer','παραλια','θαλασσα','ηλιος','beach'],
    filters:  { size: ['80','86','92','98','104','110','116','122','128','134','140','146','152','158','164'], type: ['Μαγιό','Σορτς','Μπλούζες','Παπούτσια Θαλάσσης','Αξεσουάρ'] },
    keywords: {
      size: { '80':['80'],'86':['86'],'92':['92'],'98':['98'],'104':['104'],'110':['110'],'116':['116'],'122':['122'],'128':['128'],'134':['134'],'140':['140'],'146':['146'],'152':['152'],'158':['158'],'164':['164'] },
      type: { 'Μαγιό':['μαγιο','swimwear'],'Σορτς':['σορτς','short'],'Μπλούζες':['μπλουζ','t-shirt'],'Παπούτσια Θαλάσσης':['θαλασσ','aqua','flipflop'],'Αξεσουάρ':['καπελ','γυαλι','αντηλι'] }
    }
  },
  BABY: {
    label:    'Βρεφικά Είδη',
    triggers: ['βρεφικα','βρεφος','μωρο','baby','νεογεννητο','βρεφη'],
    filters:  { size: ['50','56','62','68','74','80','86','92'] },
    keywords: { size: { '50':['50'],'56':['56'],'62':['62'],'68':['68'],'74':['74'],'80':['80'],'86':['86'],'92':['92'] } }
  },
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
    Object.keys(cat.filters).forEach(ft => {
      if (sets[ft]?.size > 0) {
        const defined = cat.filters[ft];
        const found   = Array.from(sets[ft]);
        const sorted  = [...defined.filter(d=>found.includes(d)), ...found.filter(f=>!defined.includes(f))];
        if (sorted.length) result[ft] = sorted;
      }
    });
  }
  return result;
}

// ============================================================
// AGE RELEVANCE
// ============================================================
function isAgeRelevant(title, age) {
  const t        = nm(title || '');
  const babyKws  = ['βρεφικ','0-2','bebe','βρεφ','walker','περιπατητης','παρκοκρεβατ'];
  const oldKws   = ['10-12','12 ετων','14 ετων','εφηβ'];
  const isBaby   = babyKws.some(k => t.includes(k));
  const isOlder  = oldKws.some(k => t.includes(k));
  if (age < 3)  return !isOlder;
  if (age < 10) return !isBaby && !isOlder;
  return !isBaby;
}

// ============================================================
// SEARCH LINKWISE
// ============================================================
function searchLinkwise(products, offersCategory, gender, age, shoeSize, clothingSize) {
  const genderGr = gender === 'Αγόρι' ? 'αγορι' : 'κοριτσι';
  const oppGr    = gender === 'Αγόρι' ? 'κοριτσι' : 'αγορι';

  // Keywords ανά κατηγορία — τι να ψάξουμε στο feed
  const categoryKeywords = {
    shoes:           ['παπουτσ','shoes','sneaker','boot','sandal','πεδιλ','σανδαλ','μποτ','μπαλαρ'],
    baby_shoes:      ['παπουτσ','shoes','sneaker','boot','βρεφ','baby'],
    toys:            ['παιχνιδ','toy','lego','playmobil','κουκλ','αυτοκινητ','τουβλ','game','figure','puzzle','δωρ'],
    baby_toys:       ['παιχνιδ','toy','βρεφ','baby','μωρ','εκπαιδευτ'],
    clothes:         ['ρουχ','μπλουζ','παντελον','φορεμ','ζακετ','μπουφαν','φορμ','κολαν','shirt','jeans','dress'],
    baby_clothes:    ['ρουχ','βρεφικ','baby','μωρ','νεογν'],
    baby_essentials: ['βρεφικ','baby','μωρ','νεογν','πανα'],
  };

  const keywords = categoryKeywords[offersCategory] || [];
  if (!keywords.length) return [];

  return products
    .filter(p => {
      const stock = nm(p.in_stock);
      if (stock === '0' || stock === 'n' || stock === 'false') return false;

      const title    = nm(p.product_name);
      const cat      = nm(p.category);
      const brand    = nm(p.brand_name);
      const combined = `${title} ${cat} ${brand}`;

      // Πρέπει να ταιριάζει με κάποιο keyword της κατηγορίας
      if (!keywords.some(kw => combined.includes(kw))) return false;

      // Φίλτρο νούμερου παπουτσιού
      if (shoeSize && p.size) {
        const sizes      = nm(p.size).split(',').map(x => x.trim());
        const targetSize = parseInt(shoeSize);
        const sizeMatch  = [targetSize-1, targetSize, targetSize+1].some(s => sizes.includes(String(s)));
        if (!sizeMatch) return false;
      }

      // Φίλτρο μεγέθους ρούχου
      if (clothingSize && p.size && !shoeSize) {
        const sizes = nm(p.size).split(',').map(x => x.trim());
        if (!sizes.includes(nm(clothingSize))) return false;
      }

      return true;
    })
    .map(p => {
      const priceValue = parseFloat((p.price||'0').replace(',','.').replace('€','').trim()) || 0;
      const title      = nm(p.product_name);
      const catNm      = nm(p.category);

      let genderScore = 0;
      if (title.includes(genderGr) || catNm.includes(genderGr)) genderScore = 80;
      if (title.includes(oppGr)    || catNm.includes(oppGr))    genderScore = -150;

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
        buyLink:     p.tracking_url,
        rating:      null,
        reviews:     0,
        brand:       p.brand_name || null,
        isAffiliate: true,
        genderScore,
        finalScore:  Math.round(priceScore*0.5 + 50*0.4 + genderScore*0.1),
        source_type: 'linkwise',
        attributes:  {},
      };
    })
    .filter(Boolean);
}

function extractStoreName(url) {
  try {
    const decoded = decodeURIComponent(url.split('lnkurl=')[1] || url);
    return new URL(decoded).hostname.replace('www.','');
  } catch { return 'Κατάστημα'; }
}

// ============================================================
// SERPAPI
// ============================================================
function generateStoreLink(item) {
  if (item.link && !item.link.includes('google.com/')) return item.link;
  if (item.product_link && !item.product_link.includes('google.com/')) return item.product_link;
  const title  = encodeURIComponent(item.title || '');
  const source = (item.source || '').toLowerCase();
  if (source.includes('public'))     return `https://www.public.gr/search/?text=${title}`;
  if (source.includes('jumbo'))      return `https://www.e-jumbo.gr/search?q=${title}`;
  if (source.includes('intersport')) return `https://www.intersport.gr/search?q=${title}`;
  return `https://www.skroutz.gr/search?keyphrase=${title}`;
}

function scoreProduct(item, gender, age) {
  const title  = nm(item.title || '');
  const source = (item.source || '').toLowerCase();
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

  const shopScores = { 'skroutz':95,'public':90,'intersport':90,'jumbo':85 };
  let shopScore = 50;
  for (const [s,sc] of Object.entries(shopScores)) { if (source.includes(s)) { shopScore=sc; break; } }

  const priceScore   = priceValue ? Math.max(0, 100 - priceValue/2) : 50;
  const ratingScore  = item.rating ? (item.rating/5)*100 : 50;
  const reviewsScore = Math.min((item.reviews||0)/10, 50);

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

async function fetchSerpApi(query) {
  if (!SERPAPI_KEY) return null;
  try {
    const url  = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(query)}&hl=el&gl=gr&num=20&api_key=${SERPAPI_KEY}`;
    const res  = await fetch(url);
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);

  if (parsedUrl.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status:'ok', cacheSize: feedCache?.length || 0, cacheAge: Math.round((Date.now()-feedCacheTime)/60000) + 'min' }));
    return;
  }

  if (parsedUrl.pathname === '/api/search' && req.method === 'GET') {
    try {
      const baseQuery      = parsedUrl.searchParams.get('q') || '';
      const gender         = parsedUrl.searchParams.get('gender') || '';
      const age            = parseInt(parsedUrl.searchParams.get('age')) || 5;
      const shoeSize       = parsedUrl.searchParams.get('shoeSize') || '';
      const clothingSize   = parsedUrl.searchParams.get('clothingSize') || '';
      // offersCategory: στέλνεται από το Offers.jsx για να ξέρουμε ακριβώς τι ψάχνουμε
      const offersCategory = parsedUrl.searchParams.get('offersCategory') || '';

      const category = detectCategory(baseQuery);
      const catLabel = CATEGORIES[category]?.label || 'Γενικά';

      console.log(`\n${'='.repeat(50)}`);
      console.log(`🔍 "${baseQuery}" | cat:${offersCategory || category}`);
      console.log(`👤 ${gender} | 🎂 ${age} | 👟 ${shoeSize} | 👕 ${clothingSize}`);
      console.log(`${'='.repeat(50)}`);

      const effectiveCategory = offersCategory || category;
      let linkwiseResults = [];
      let serpResults     = [];

      // ── LINKWISE: μόνο για κατηγορίες που υπάρχουν στα feeds ──
      const feedType = getFeedTypeForCategory(effectiveCategory);
      if (feedType) {
        const feedProducts = await fetchFeed();
        linkwiseResults = searchLinkwise(feedProducts, effectiveCategory, gender, age, shoeSize, clothingSize)
          .map(p => ({ ...p, attributes: extractAttributes(p, category), category: effectiveCategory }));
        console.log(`📦 Linkwise [${feedType}]: ${linkwiseResults.length}`);
      }

      // ── SERPAPI: πάντα (supplement για linkwise ή primary για sports/bikes/tech κτλ) ──
      const genderGr = gender === 'Αγόρι' ? 'αγόρι' : 'κορίτσι';
      const genderEn = gender === 'Αγόρι' ? 'boys'  : 'girls';

      let sizeHint = '';
      if (effectiveCategory === 'shoes' || category === 'SHOES')   sizeHint = `νούμερο ${shoeSize || getShoeSize(age)[0]}`;
      if (effectiveCategory === 'clothes' || category === 'CLOTHES') sizeHint = `μέγεθος ${clothingSize || getClothingSize(age)[0]}`;

      const serpQueries = [
        `${baseQuery} παιδικά ${genderGr} ${sizeHint}`.trim(),
        `${baseQuery} ${genderEn} ${age} years`,
      ];

      const serpRaw  = await Promise.all(serpQueries.map(fetchSerpApi));
      const seenSerp = new Set();
      serpRaw.forEach(data => {
        data?.shopping_results?.forEach(item => {
          const id = item.product_id || item.link || item.title;
          if (!seenSerp.has(id)) {
            seenSerp.add(id);
            const scored = scoreProduct(item, gender, age);
            if (scored.genderScore > -50 && isAgeRelevant(item.title, age)) {
              serpResults.push({
                ...item, ...scored,
                attributes: extractAttributes(item, category),
                category:   effectiveCategory,
              });
            }
          }
        });
      });
      console.log(`🌐 SerpAPI: ${serpResults.length}`);

      // ── MERGE: Linkwise πρώτα, μετά SerpAPI ──
      const seen   = new Set();
      const merged = [];
      for (const p of [...linkwiseResults, ...serpResults]) {
        const key = nm(p.title || '').substring(0, 30);
        if (!seen.has(key)) { seen.add(key); merged.push(p); }
      }

      merged.sort((a, b) => {
        if (a.isAffiliate && !b.isAffiliate) return -1;
        if (!a.isAffiliate && b.isAffiliate) return 1;
        return b.finalScore - a.finalScore;
      });

      const availableFilters = collectFilters(merged, category);
      if (category === 'SHOES')   availableFilters.suggestedSize = shoeSize     ? [shoeSize]     : getShoeSize(age);
      if (category === 'CLOTHES') availableFilters.suggestedSize = clothingSize ? [clothingSize] : getClothingSize(age);

      console.log(`✅ Total: ${merged.length} (lw:${linkwiseResults.length} + serp:${serpResults.length})`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        shopping_results: merged,
        metadata: { total: merged.length, affiliateCount: linkwiseResults.length, serpCount: serpResults.length, category, categoryLabel: catLabel, availableFilters, sizeSource: shoeSize||clothingSize ? 'profile':'age' }
      }));

    } catch (err) {
      console.error('❌', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Search failed', message: err.message }));
    }
  } else {
    res.writeHead(404); res.end('Not Found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🚀 SMART KIDS Server on port ${PORT}`);
  console.log(`${'='.repeat(50)}\n`);
  fetchFeed().catch(console.error);
});
