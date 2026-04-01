// server.js - Smart Kids with Linkwise + SerpAPI
import http from 'http';
import { URL } from 'url';

const PORT = process.env.PORT || 3001;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'smat-kids-app';

// ── Memory optimization ──────────────────────────────────────
if (global.gc) setInterval(() => { try { global.gc(); } catch {} }, 30000);

// ── Concurrent fetch protection — μόνο 1 feed fetch ανά τύπο ─
const feedFetchInProgress = { shoes: false, clothes: false, toys: false };

// ============================================================
// LINKWISE FEEDS ΑΝΑ ΚΑΤΗΓΟΡΙΑ
// ============================================================
const LW_BASE = 'https://affiliate.linkwi.se/feeds/1.2/CD28202/programs-joined/columns-product_name,category,brand_name,tracking_url,thumb_url,in_stock,on_sale,price,discount,size/catinc-0/catex-0';

// Split into 3 feeds to stay within 512MB RAM limit
const LW_FEEDS = {
  // Παπούτσια
  shoes: `${LW_BASE}/proginc-13255-2053,13884-2555,385-251,469-2142,469-2139,469-2136,469-301,469-300,469-299/progex-0/feed.json`,
  // Παιχνίδια + Σχολικά
  toys:  `${LW_BASE}/proginc-10784-281,11307-622,13208-2081,13506-2267,10632-237,12323-1271,12761-1652/progex-0/feed.json`,
  // Ρούχα + Βρεφικά
  clothes: `${LW_BASE}/proginc-11562-711,14015-2746,11036-369,13712-2432,11754-880,11764-1059,13604-2421,138-2273,12174-1176,14123-2770,13199-1967,12345-1289/progex-0/feed.json`,
};

const feedCache = { shoes: null, clothes: null, toys: null };
const feedCacheTime = { shoes: 0, clothes: 0, toys: 0 };
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6h — shorter to free RAM

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

function getStoreIcon(source) {
  const s = (source || '').toLowerCase();
  if (s.includes('skroutz'))    return '🛒';
  if (s.includes('public'))     return '🏪';
  if (s.includes('jumbo'))      return '🎪';
  if (s.includes('intersport')) return '⚽';
  if (s.includes('plaisio'))    return '💻';
  if (s.includes('mediamarkt')) return '📺';
  if (s.includes('zara'))       return '👗';
  if (s.includes('hm') || s.includes('h&m')) return '👕';
  if (s.includes('dpam') || s.includes('orchestra')) return '👶';
  return '🛍️';
}

// ============================================================
// FETCH LINKWISE FEED
// ============================================================
function parseFeedLimited(text, maxItems) {
  try {
    const approxCutoff = maxItems * 350;
    let sliced = text;
    if (text.length > approxCutoff) {
      const cutoff = text.lastIndexOf('},', approxCutoff);
      if (cutoff > 0) sliced = text.slice(0, cutoff + 1) + ']';
    }
    const all = JSON.parse(sliced);
    const results = [];
    for (const obj of all) {
      if (results.length >= maxItems) break;
      const stock = (obj.in_stock || '').toString().toLowerCase().trim();
      if (stock === '0' || stock === 'n' || stock === 'false') continue;
      if (!obj.price || !obj.product_name) continue;
      const cat = nm(obj.category || '');
      if (cat.includes('ανδρ') || cat.includes('men ') || cat.includes('/men')) continue;
      if (cat.includes('γυναικ') || cat.includes('women')) continue;
      results.push({
        product_name: clean(obj.product_name),
        category:     clean(obj.category),
        brand_name:   clean(obj.brand_name),
        tracking_url: obj.tracking_url,
        thumb_url:    obj.thumb_url,
        on_sale:      obj.on_sale,
        price:        clean(obj.price),
        discount:     obj.discount,
        size:         clean(obj.size),
      });
    }
    return results;
  } catch (e) {
    console.error('parseFeedLimited error:', e.message);
    return [];
  }
}

async function fetchFeed(type) {
  if (type === 'general') return fetchFeed('shoes');

  const now = Date.now();
  if (feedCache[type] && (now - feedCacheTime[type]) < CACHE_TTL) return feedCache[type];

  if (feedFetchInProgress[type]) {
    console.log(`⏳ Feed ${type} fetch already in progress — returning cached or empty`);
    await new Promise(r => setTimeout(r, 3000));
    return feedCache[type] || [];
  }

  feedFetchInProgress[type] = true;
  try {
    console.log(`🔄 Fetching feed: ${type}`);
    const res = await fetch(LW_FEEDS[type]);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const text = await res.text();
    console.log(`📥 Feed ${type} raw size: ${Math.round(text.length/1024)}KB`);
    
    const MAX_RAW_SIZE = 5 * 1024 * 1024;
    let limitedText = text;
    if (text.length > MAX_RAW_SIZE) {
      console.log(`⚠️ Feed ${type} too large (${Math.round(text.length/1024)}KB), truncating to ${Math.round(MAX_RAW_SIZE/1024)}KB`);
      limitedText = text.slice(0, MAX_RAW_SIZE);
    }
    
    const MAX_PER_FEED = 150;
    feedCache[type] = parseFeedLimited(limitedText, MAX_PER_FEED);
    feedCacheTime[type] = now;
    console.log(`✅ Feed ${type}: ${feedCache[type].length} products kept`);
    
    if (global.gc) {
      console.log(`🗑️ Forcing GC after ${type} feed...`);
      global.gc();
    }
    
    return feedCache[type];
  } catch (err) {
    console.error(`❌ Feed ${type} error:`, err.message);
    return feedCache[type] || [];
  } finally {
    feedFetchInProgress[type] = false;
  }
}

function getFeedTypeForCategory(offersCategory) {
  if (['shoes','baby_shoes'].includes(offersCategory)) return 'shoes';
  if (['toys','baby_toys'].includes(offersCategory)) return 'toys';
  if (['clothes','baby_clothes','baby_essentials'].includes(offersCategory)) return 'clothes';
  if (offersCategory === 'SHOES') return 'shoes';
  if (offersCategory === 'TOYS' || offersCategory === 'SCHOOL') return 'toys';
  if (['CLOTHES','SWIMWEAR','BABY','SUMMER'].includes(offersCategory)) return 'clothes';
  if (offersCategory === 'SPORTS') return 'shoes';
  if (['school_bags','school_supplies','bikes','tech','gaming','baby_gear','baby_safety'].includes(offersCategory)) return 'toys';
  if (offersCategory === 'GENERAL') return 'shoes';
  return 'toys';
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
// CATEGORY DETECTION & FILTERS
// ============================================================
const CATEGORIES = {
  SHOES: {
    label: 'Παιδικά Παπούτσια',
    triggers: ['παπουτσια','παπουτσι','πεδιλα','μποτακια','sneakers','shoes','boots','σανδαλια','υποδηματα','μπαλαρινα','αθλητικο παπουτσι'],
    filters: { size: ['17','18','19','20','21','22','23','24','25','26','27','28','29','30','31','32','33','34','35','36','37','38','39','40'] }
  },
  CLOTHES: {
    label: 'Παιδική & Βρεφική Μόδα',
    triggers: ['ρουχα','μπλουζα','παντελονι','φορμα','φουστα','μπουφαν','φορεμα','ζακετα','κολαν','πιτζαμα','εσωρουχα','καλτσες','σετ ρουχων','jacket','jeans','φορμακι'],
    filters: { size: ['50','56','62','68','74','80','86','92','98','104','110','116','122','128','134','140','146','152','158','164','170'] }
  },
  TOYS: {
    label: 'Παιχνίδια',
    triggers: ['παιχνιδι','παιχνιδια','κουκλα','lego','playmobil','toy','δωρο','puzzle','παζλ','επιτραπεζιο','κατασκευη','σετ παιχνιδιων'],
    filters: { brand: ['LEGO','Playmobil','Mattel','Hasbro','Fisher-Price'] }
  },
  BABY: {
    label: 'Βρεφικά Είδη',
    triggers: ['βρεφικα','βρεφος','μωρο','baby','νεογεννητο','βρεφη','βρεφικο'],
    filters: { size: ['50','56','62','68','74','80','86','92'] }
  }
};

function detectCategory(query) {
  const q = nm(query);
  for (const [name, cat] of Object.entries(CATEGORIES)) {
    if (cat.triggers?.some(t => q.includes(nm(t)))) return name;
  }
  return 'GENERAL';
}

function isAgeRelevant(title, age) {
  const t = nm(title || '');
  const babyKws = ['βρεφικ','0-2','bebe','βρεφ','walker','περιπατητης','παρκοκρεβατ'];
  const oldKws = ['10-12','12 ετων','14 ετων','εφηβ'];
  const isBaby = babyKws.some(k => t.includes(k));
  const isOlder = oldKws.some(k => t.includes(k));
  if (age < 3) return !isOlder;
  if (age < 10) return !isBaby && !isOlder;
  return !isBaby;
}

function extractStoreName(url) {
  try {
    const decoded = decodeURIComponent(url.split('lnkurl=')[1] || url);
    return new URL(decoded).hostname.replace('www.', '');
  } catch { return 'Κατάστημα'; }
}

function searchLinkwise(products, offersCategory, gender, age, shoeSize, clothingSize) {
  const genderGr = gender === 'Αγόρι' ? 'αγορι' : 'κοριτσι';
  const oppGr = gender === 'Αγόρι' ? 'κοριτσι' : 'αγορι';

  const categoryKeywords = {
    shoes: ['παπουτσ','shoes','sneaker','boot','sandal','πεδιλ','σανδαλ','μποτ','μπαλαρ'],
    toys: ['παιχνιδ','toy','lego','playmobil','κουκλ','αυτοκινητ','τουβλ','game','figure','puzzle','δωρ'],
    clothes: ['ρουχ','μπλουζ','παντελον','φορεμ','ζακετ','μπουφαν','φορμ','κολαν','shirt','jeans','dress'],
  };

  let keywords = categoryKeywords[offersCategory] || [];
  if (!keywords.length) {
    const homeCatKeywords = {
      SHOES: ['παπουτσ','shoes','sneaker','boot','πεδιλ','σανδαλ','μποτ'],
      CLOTHES: ['ρουχ','μπλουζ','παντελον','φορεμ','μπουφαν','φορμ','shirt','jeans','dress'],
      TOYS: ['παιχνιδ','toy','lego','playmobil','κουκλ','αυτοκινητ','puzzle'],
      BABY: ['βρεφ','baby','μωρ','νεογν'],
      GENERAL: ['παιδ','kid','child','baby','αγορ','κοριτσ'],
    };
    keywords = homeCatKeywords[offersCategory] || ['παιδ','kid'];
  }

  return products
    .filter(p => {
      const stock = nm(p.in_stock);
      if (stock === '0' || stock === 'n' || stock === 'false') return false;

      const title = nm(p.product_name);
      const cat = nm(p.category);
      const brand = nm(p.brand_name);
      const combined = `${title} ${cat} ${brand}`;

      if (!keywords.some(kw => combined.includes(kw))) return false;

      if (shoeSize && p.size && p.size.trim()) {
        const sizes = nm(p.size).split(/[,\s]+/).map(x => x.trim()).filter(Boolean);
        const targetSize = parseInt(shoeSize);
        const sizeMatch = [targetSize-1, targetSize, targetSize+1].some(s => sizes.includes(String(s)));
        if (!sizeMatch) return false;
      }

      if (clothingSize && p.size && p.size.trim() && !shoeSize) {
        const sizes = nm(p.size).split(/[,\s]+/).map(x => x.trim()).filter(Boolean);
        if (sizes.length > 0 && !sizes.some(s => s.includes(nm(clothingSize)))) return false;
      }

      return true;
    })
    .map(p => {
      const priceValue = parseFloat((p.price||'0').replace(',','.').replace('€','').trim()) || 0;
      const title = nm(p.product_name);
      const catNm = nm(p.category);

      let genderScore = 0;
      if (title.includes(genderGr) || catNm.includes(genderGr)) genderScore = 80;
      if (title.includes(oppGr) || catNm.includes(oppGr)) genderScore = -150;

      if (!isAgeRelevant(p.product_name, age)) return null;

      const priceScore = priceValue ? Math.max(0, 100 - priceValue/2) : 50;

      return {
        product_id: `lw_${Date.now()}_${Math.random().toString(36).substr(2,6)}`,
        title: p.product_name,
        price: priceValue ? `${priceValue.toFixed(2)}€` : 'N/A',
        priceValue,
        source: extractStoreName(p.tracking_url || ''),
        thumbnail: p.thumb_url || null,
        link: p.tracking_url,
        buyLink: p.tracking_url,
        rating: null,
        reviews: 0,
        brand: p.brand_name || null,
        isAffiliate: true,
        genderScore,
        finalScore: Math.round(priceScore*0.5 + 50*0.4 + genderScore*0.1),
        source_type: 'linkwise',
      };
    })
    .filter(Boolean);
}

// ============================================================
// STREAMING OFFERS ENDPOINT
// ============================================================
async function* streamFeedItems(feedType, maxItems = 150) {
  try {
    const res = await fetch(LW_FEEDS[feedType]);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let itemsSent = 0;
    
    while (itemsSent < maxItems) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      
      let braceDepth = 0;
      let lastCompleteIndex = -1;
      let inString = false;
      let escape = false;
      
      for (let i = 0; i < buffer.length; i++) {
        const char = buffer[i];
        
        if (escape) {
          escape = false;
          continue;
        }
        
        if (char === '\\') {
          escape = true;
          continue;
        }
        
        if (char === '"') {
          inString = !inString;
          continue;
        }
        
        if (!inString) {
          if (char === '{') braceDepth++;
          if (char === '}') {
            braceDepth--;
            if (braceDepth === 0) {
              lastCompleteIndex = i;
              break;
            }
          }
        }
      }
      
      if (lastCompleteIndex !== -1) {
        const completePart = buffer.slice(0, lastCompleteIndex + 1);
        buffer = buffer.slice(lastCompleteIndex + 1);
        
        try {
          const obj = JSON.parse(completePart);
          const stock = (obj.in_stock || '').toString().toLowerCase().trim();
          if (stock !== '0' && stock !== 'n' && stock !== 'false' && obj.price && obj.product_name) {
            const cat = nm(obj.category || '');
            if (!cat.includes('ανδρ') && !cat.includes('men ') && !cat.includes('/men') &&
                !cat.includes('γυναικ') && !cat.includes('women')) {
              yield {
                product_name: clean(obj.product_name),
                category: clean(obj.category),
                brand_name: clean(obj.brand_name),
                tracking_url: obj.tracking_url,
                thumb_url: obj.thumb_url,
                on_sale: obj.on_sale,
                price: clean(obj.price),
                discount: obj.discount,
                size: clean(obj.size),
              };
              itemsSent++;
            }
          }
        } catch (parseErr) {
          console.warn('Parse error in stream:', parseErr.message);
        }
      }
      
      if (buffer.length > 500000) {
        console.warn(`Buffer exceeded limit, truncating: ${buffer.length} bytes`);
        buffer = buffer.slice(-100000);
      }
    }
    
    reader.releaseLock();
  } catch (err) {
    console.error(`Stream error for ${feedType}:`, err.message);
    yield { error: err.message, feedType };
  }
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
    res.end(JSON.stringify({ status:'ok', cache: Object.fromEntries(Object.keys(feedCache).map(k => [k, feedCache[k]?.length || 0])) }));
    return;
  }

  // ── Existing /api/search endpoint (preserved) ──
  if (parsedUrl.pathname === '/api/search' && req.method === 'GET') {
    try {
      const baseQuery = parsedUrl.searchParams.get('q') || '';
      const gender = parsedUrl.searchParams.get('gender') || '';
      const age = parseInt(parsedUrl.searchParams.get('age')) || 5;
      const shoeSize = parsedUrl.searchParams.get('shoeSize') || '';
      const clothingSize = parsedUrl.searchParams.get('clothingSize') || '';
      const offersCategory = parsedUrl.searchParams.get('offersCategory') || '';

      const category = detectCategory(baseQuery);
      const catLabel = CATEGORIES[category]?.label || 'Γενικά';

      console.log(`\n${'='.repeat(50)}`);
      console.log(`🔍 "${baseQuery}" | cat:${offersCategory || category}`);
      console.log(`👤 ${gender} | 🎂 ${age} | 👟 ${shoeSize} | 👕 ${clothingSize}`);
      console.log(`${'='.repeat(50)}`);

      const effectiveCategory = offersCategory || category;
      let linkwiseResults = [];

      const feedType = getFeedTypeForCategory(effectiveCategory);
      if (feedType) {
        const feedProducts = await fetchFeed(feedType);
        linkwiseResults = searchLinkwise(feedProducts, effectiveCategory, gender, age, shoeSize, clothingSize);
        console.log(`📦 Linkwise [${feedType}]: ${linkwiseResults.length}`);
      }

      const merged = linkwiseResults.slice(0, 100);
      merged.sort((a, b) => b.finalScore - a.finalScore);

      console.log(`✅ Total: ${merged.length} (Linkwise only)`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        shopping_results: merged,
        metadata: { total: merged.length, affiliateCount: linkwiseResults.length, serpCount: 0, category, categoryLabel: catLabel, serpApiDisabled: true }
      }));

      if (global.gc) global.gc();

    } catch (err) {
      console.error('❌', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Search failed', message: err.message }));
      if (global.gc) global.gc();
    }
  }
  
  // ── NEW: /api/offers-stream — Streaming NDJSON endpoint ──
  else if (parsedUrl.pathname === '/api/offers-stream' && req.method === 'GET') {
    const gender = parsedUrl.searchParams.get('gender') || 'Αγόρι';
    const age = parseInt(parsedUrl.searchParams.get('age')) || 5;
    const shoeSize = parsedUrl.searchParams.get('shoeSize') || '';
    const clothingSize = parsedUrl.searchParams.get('clothingSize') || '';
    
    let queries = [];
    try { queries = JSON.parse(parsedUrl.searchParams.get('queries') || '[]'); } catch {}

    if (!queries.length) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'queries required' }));
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    });

    const write = (obj) => {
      try { res.write(JSON.stringify(obj) + '\n'); } catch {}
    };

    write({ type: 'meta', total: queries.length });

    const seenIds = new Set();
    let totalSent = 0;

    for (let i = 0; i < queries.length; i++) {
      const qItem = queries[i];
      write({ type: 'progress', current: i + 1, total: queries.length, label: qItem.label });

      try {
        const feedType = getFeedTypeForCategory(qItem.category);
        let batchResults = [];

        if (feedType) {
          let streamedItems = [];
          for await (const rawItem of streamFeedItems(feedType, 150)) {
            if (rawItem.error) continue;
            
            // Apply filters
            const title = nm(rawItem.product_name);
            let include = true;
            
            if (age !== undefined && !isAgeRelevant(rawItem.product_name, age)) include = false;
            
            if (include && gender) {
              const genderGr = gender === 'Αγόρι' ? 'αγορι' : 'κοριτσι';
              const oppGr = gender === 'Αγόρι' ? 'κοριτσι' : 'αγορι';
              if (title.includes(oppGr)) include = false;
            }
            
            if (include && qItem.shoeSize && rawItem.size) {
              const sizes = nm(rawItem.size).split(/[,\s]+/).map(x => x.trim()).filter(Boolean);
              const targetSize = parseInt(qItem.shoeSize);
              const sizeMatch = [targetSize-1, targetSize, targetSize+1].some(s => sizes.includes(String(s)));
              if (!sizeMatch && sizes.length > 0) include = false;
            }
            
            if (include && qItem.clothingSize && rawItem.size && !qItem.shoeSize) {
              const sizes = nm(rawItem.size).split(/[,\s]+/).map(x => x.trim()).filter(Boolean);
              if (sizes.length > 0 && !sizes.some(s => s.includes(nm(qItem.clothingSize)))) include = false;
            }
            
            if (include) {
              const priceValue = parseFloat((rawItem.price || '0').replace(',', '.').replace('€', '').trim()) || 0;
              streamedItems.push({
                ...rawItem,
                priceValue,
                finalScore: Math.max(0, 100 - priceValue / 2),
              });
            }
          }
          
          batchResults = streamedItems
            .sort((a, b) => b.finalScore - a.finalScore)
            .slice(0, 5)
            .map(item => ({
              product_id: `lw_${Date.now()}_${Math.random().toString(36).substr(2,6)}`,
              title: item.product_name,
              price: item.priceValue ? `${item.priceValue.toFixed(2)}€` : 'N/A',
              priceValue: item.priceValue,
              source: extractStoreName(item.tracking_url || ''),
              storeIcon: getStoreIcon(extractStoreName(item.tracking_url || '')),
              thumbnail: item.thumb_url,
              link: item.tracking_url,
              buyLink: item.tracking_url,
              isAffiliate: true,
              finalScore: item.finalScore,
              category: qItem.category,
              categoryLabel: qItem.label,
              on_sale: item.on_sale,
              discount: item.discount,
              brand: item.brand_name,
              source_type: 'linkwise',
            }));
        }

        if (batchResults.length < 3) {
          const enc = encodeURIComponent(qItem.q);
          const skroutzUrl = `https://www.skroutz.gr/search?keyphrase=${enc}`;
          batchResults.push({
            product_id: `sk_fallback_${qItem.category}`,
            title: `${qItem.label} — Δες τιμές στο Skroutz`,
            price: 'Σύγκριση →',
            priceValue: 0,
            source: 'Skroutz',
            storeIcon: '🛒',
            thumbnail: null,
            link: skroutzUrl,
            buyLink: skroutzUrl,
            isAffiliate: false,
            isSkroutzFallback: true,
            skroutzQuery: qItem.q,
            category: qItem.category,
            categoryLabel: qItem.label,
            finalScore: 0,
            source_type: 'skroutz_fallback',
          });
        }

        const newResults = batchResults.filter(r => {
          if (seenIds.has(r.product_id)) return false;
          seenIds.add(r.product_id);
          return true;
        });

        if (newResults.length > 0) {
          totalSent += newResults.length;
          write({ type: 'results', items: newResults, category: qItem.category });
        }

      } catch (err) {
        console.warn(`⚠️ Stream error for ${qItem.category}:`, err.message);
        const enc = encodeURIComponent(qItem.q);
        write({
          type: 'results',
          items: [{
            product_id: `sk_err_${qItem.category}`,
            title: `${qItem.label} — Δες στο Skroutz`,
            price: 'Σύγκριση →',
            priceValue: 0,
            source: 'Skroutz',
            storeIcon: '🛒',
            link: `https://www.skroutz.gr/search?keyphrase=${enc}`,
            buyLink: `https://www.skroutz.gr/search?keyphrase=${enc}`,
            isSkroutzFallback: true,
            category: qItem.category,
            categoryLabel: qItem.label,
            finalScore: 0,
            source_type: 'skroutz_fallback',
          }],
          category: qItem.category,
        });
      }

      await new Promise(r => setTimeout(r, 150));
    }

    write({ type: 'done', total: totalSent });
    res.end();
    if (global.gc) global.gc();
  }
  
  // ── /api/extract-image endpoint (preserved) ──
  else if (parsedUrl.pathname === '/api/extract-image' && req.method === 'GET') {
    const rawUrl = parsedUrl.searchParams.get('url');
    if (!rawUrl) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'url param required' }));
      return;
    }

    try {
      const targetUrl = decodeURIComponent(rawUrl);
      console.log(`🖼️ Extracting image from: ${targetUrl}`);

      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 12; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'el-GR,el;q=0.9,en;q=0.8',
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ image: null }));
        return;
      }

      const html = await response.text();

      const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || 
                      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
      
      if (ogMatch?.[1]) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ image: ogMatch[1] }));
        return;
      }

      const twitterMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) || 
                           html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
      
      if (twitterMatch?.[1]) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ image: twitterMatch[1] }));
        return;
      }

      const jsonLdMatch = html.match(/"image"\s*:\s*"([^"]+)"/);
      if (jsonLdMatch?.[1] && jsonLdMatch[1].startsWith('http')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ image: jsonLdMatch[1] }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ image: null }));

    } catch (err) {
      console.error('extract-image error:', err.message);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ image: null, error: err.message }));
    }
  }
  
  // ── /api/register-token endpoint (preserved) ──
  else if (parsedUrl.pathname === '/api/register-token' && (req.method === 'POST' || req.method === 'GET')) {
    try {
      const body = await new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => data += chunk.toString());
        req.on('end', () => resolve(data));
        req.on('error', reject);
      });
      
      const { token, userId, profile } = JSON.parse(body || '{}');
      
      if (!token || !userId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'token and userId are required' }));
        return;
      }
      
      console.log(`📱 FCM token registering for user ${userId.substring(0,8)}...`);

      if (SUPABASE_URL && SUPABASE_KEY) {
        try {
          const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/fcm_tokens`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Prefer': 'resolution=merge-duplicates',
            },
            body: JSON.stringify({
              user_id: userId,
              token,
              profile: profile || null,
              updated_at: new Date().toISOString(),
            }),
          });
          if (!sbRes.ok) {
            const errText = await sbRes.text();
            console.warn('⚠️ Supabase token save failed:', errText);
          } else {
            console.log(`✅ FCM token saved to Supabase for ${userId.substring(0,8)}...`);
          }
        } catch (sbErr) {
          console.warn('⚠️ Supabase unreachable:', sbErr.message);
        }
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Token registered successfully' }));
      
    } catch (err) {
      console.error('register-token error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to register token', message: err.message }));
    }
  }
  else {
    res.writeHead(404); res.end('Not Found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🚀 SMART KIDS Server on port ${PORT}`);
  console.log(`${'='.repeat(50)}\n`);

  setInterval(() => {
    const now = Date.now();
    let freed = 0;
    for (const type of ['shoes','clothes','toys']) {
      if (feedCache[type] && (now - feedCacheTime[type]) > 30 * 60 * 1000) {
        feedCache[type] = null;
        feedCacheTime[type] = 0;
        freed++;
      }
    }
    if (freed > 0) {
      console.log(`🧹 Evicted ${freed} feed cache(s) to free memory`);
      if (global.gc) global.gc();
    }
  }, 30 * 60 * 1000);
});