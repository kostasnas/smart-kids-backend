// server.js - Smart Kids Complete with Size Filters
import http from 'http';
import { URL } from 'url';

const PORT = process.env.PORT || 3001;
const SERPAPI_KEY = process.env.SERPAPI_KEY || 'a2377d128c1ba155eb58dd575a16079c31730f0fdeab9d05014b01b8870053f1';

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
// AGE TO SIZE MAPPINGS
// ============================================================
function getShoeSize(age) {
  // EU shoe sizes by age
  if (age < 1) return ['17','18','19'];
  if (age < 2) return ['19','20','21','22'];
  if (age < 3) return ['22','23','24','25'];
  if (age < 4) return ['25','26','27'];
  if (age < 5) return ['27','28','29'];
  if (age < 6) return ['29','30','31'];
  if (age < 7) return ['31','32','33'];
  if (age < 8) return ['32','33','34'];
  if (age < 9) return ['33','34','35'];
  if (age < 10) return ['34','35','36'];
  if (age < 11) return ['35','36','37'];
  if (age < 12) return ['36','37','38'];
  return ['37','38','39','40'];
}

function getClothingSize(age) {
  // EU clothing sizes
  if (age < 0.25) return ['50','56'];
  if (age < 0.5) return ['56','62'];
  if (age < 1) return ['62','68','74'];
  if (age < 1.5) return ['74','80'];
  if (age < 2) return ['80','86'];
  if (age < 3) return ['86','92'];
  if (age < 4) return ['92','98','104'];
  if (age < 5) return ['104','110'];
  if (age < 6) return ['110','116'];
  if (age < 7) return ['116','122'];
  if (age < 8) return ['122','128'];
  if (age < 9) return ['128','134'];
  if (age < 10) return ['134','140'];
  if (age < 11) return ['140','146'];
  if (age < 12) return ['146','152'];
  if (age < 14) return ['152','158','164'];
  return ['164','170','176'];
}

// ============================================================
// CATEGORIES WITH SIZE FILTERS
// ============================================================
const CATEGORIES = {
  SHOES: {
    label: 'Παιδικά Παπούτσια',
    triggers: ['παπουτσια','παπουτσι','πεδιλα','μποτακια','μπαλαρινες','sneakers','shoes','boots','σανδαλια'],
    filters: {
      type: ['Sneakers / Αθλητικά','Casual / Καθημερινά','Πέδιλα / Σανδάλια','Μποτάκια','Μπαλαρίνες','Παντόφλες','Πρώτα Βήματα'],
      // SIZE FILTER - EU sizes
      size: ['17','18','19','20','21','22','23','24','25','26','27','28','29','30','31','32','33','34','35','36','37','38','39','40'],
      brand: ['Nike','Adidas','Puma','New Balance','Skechers','Converse','Vans','Geox','Clarks'],
      season: ['Καλοκαιρινά','Χειμωνιάτικα','All Season']
    },
    keywords: {
      type: {
        'Sneakers / Αθλητικά': ['αθλητικα','sneakers','sport','running'],
        'Casual / Καθημερινά': ['casual','καθημερινα'],
        'Πέδιλα / Σανδάλια': ['πεδιλα','σανδαλια','sandal'],
        'Μποτάκια': ['μποτακια','boot'],
        'Μπαλαρίνες': ['μπαλαρινες','ballerina']
      },
      // Size detection
      size: {
        '17': ['17','νο 17'], '18': ['18','νο 18'], '19': ['19','νο 19'],
        '20': ['20','νο 20'], '21': ['21','νο 21'], '22': ['22','νο 22'],
        '23': ['23','νο 23'], '24': ['24','νο 24'], '25': ['25','νο 25'],
        '26': ['26','νο 26'], '27': ['27','νο 27'], '28': ['28','νο 28'],
        '29': ['29','νο 29'], '30': ['30','νο 30'], '31': ['31','νο 31'],
        '32': ['32','νο 32'], '33': ['33','νο 33'], '34': ['34','νο 34'],
        '35': ['35','νο 35'], '36': ['36','νο 36'], '37': ['37','νο 37'],
        '38': ['38','νο 38'], '39': ['39','νο 39'], '40': ['40','νο 40']
      },
      brand: {
        'Nike': ['nike'], 'Adidas': ['adidas'], 'Puma': ['puma'],
        'Geox': ['geox'], 'Clarks': ['clarks']
      }
    }
  },

  CLOTHES: {
    label: 'Παιδική & Βρεφική Μόδα',
    triggers: ['ρουχα','μπλουζα','παντελονι','φορμα','φουστα','μπουφαν','φορεμα','ζακετα'],
    filters: {
      type: ['Μπλούζες','Παντελόνια','Φόρμες','Φορέματα','Μπουφάν','Ζακέτες','Σορτς','Πιτζάμες'],
      // SIZE FILTER - EU clothing sizes
      size: ['50','56','62','68','74','80','86','92','98','104','110','116','122','128','134','140','146','152','158','164','170'],
      gender: ['Αγόρι','Κορίτσι','Unisex'],
      season: ['Καλοκαιρινά','Χειμωνιάτικα','All Season'],
      brand: ['Zara Kids','H&M','DPAM','Orchestra','Next','Mothercare']
    },
    keywords: {
      type: {
        'Μπλούζες': ['μπλουζα','t-shirt','tshirt'],
        'Παντελόνια': ['παντελονι','jeans','jean'],
        'Φόρμες': ['φορμα','tracksuit','jogging'],
        'Φορέματα': ['φορεμα','dress'],
        'Μπουφάν': ['μπουφαν','jacket']
      },
      // Size detection
      size: {
        '50': ['50','50cm'], '56': ['56','56cm'], '62': ['62','62cm'],
        '68': ['68','68cm'], '74': ['74','74cm'], '80': ['80','80cm'],
        '86': ['86','86cm'], '92': ['92','92cm'], '98': ['98','98cm'],
        '104': ['104','104cm'], '110': ['110','110cm'], '116': ['116','116cm'],
        '122': ['122','122cm'], '128': ['128','128cm'], '134': ['134','134cm'],
        '140': ['140','140cm'], '146': ['146','146cm'], '152': ['152','152cm'],
        '158': ['158','158cm'], '164': ['164','164cm'], '170': ['170','170cm']
      },
      gender: {
        'Αγόρι': ['αγορι','boy','boys'],
        'Κορίτσι': ['κοριτσι','girl','girls']
      },
      brand: {
        'Zara Kids': ['zara'], 'H&M': ['h&m','h m'],
        'DPAM': ['dpam'], 'Orchestra': ['orchestra']
      }
    }
  },

  TOYS: {
    label: 'Παιχνίδια',
    triggers: ['παιχνιδι','παιχνιδια','κουκλα','lego','playmobil','toy'],
    filters: {
      ageRange: ['0-2 ετών','3-5 ετών','6-8 ετών','9-12 ετών','12+ ετών'],
      category: ['Κούκλες','Αυτοκινητάκια','LEGO','Επιτραπέζια','Εκπαιδευτικά'],
      brand: ['LEGO','Playmobil','Mattel','Hasbro','Fisher-Price']
    },
    keywords: {
      ageRange: {
        '0-2 ετών': ['baby','βρεφικο','0-2'],
        '3-5 ετών': ['3+','3-5'],
        '6-8 ετών': ['6+','6-8'],
        '9-12 ετών': ['9+','9-12']
      }
    }
  }
};

// ============================================================
// DETECT CATEGORY
// ============================================================
function detectCategory(query) {
  const q = nm(query);
  for (const [name, cat] of Object.entries(CATEGORIES)) {
    if (cat.triggers.some(t => q.includes(nm(t)))) return name;
  }
  return 'GENERAL';
}

// ============================================================
// EXTRACT ATTRIBUTES (WITH SIZE DETECTION)
// ============================================================
function extractAttributes(item, category) {
  const title = nm(item.title || '');
  const attrs = {};
  const cat = CATEGORIES[category];
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

// ============================================================
// COLLECT FILTERS
// ============================================================
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
        const found = Array.from(sets[filterType]);
        const sorted = [...defined.filter(d => found.includes(d)), ...found.filter(f => !defined.includes(f))];
        if (sorted.length > 0) result[filterType] = sorted;
      }
    });
  }

  return result;
}

// ============================================================
// IMPROVED LINK GENERATION
// ============================================================
function generateStoreLink(item) {
  const source = (item.source || '').toLowerCase();
  
  // Priority 1: Direct merchant link (if not Google)
  if (item.merchant_link && !item.merchant_link.includes('google.com')) {
    return item.merchant_link;
  }
  
  // Priority 2: Product link (if not Google)
  if (item.product_link && !item.product_link.includes('google.com')) {
    return item.product_link;
  }
  
  // Priority 3: Generate store search
  const title = encodeURIComponent((item.title || '').substring(0, 100));
  
  const stores = {
    'skroutz': `https://www.skroutz.gr/search?keyphrase=${title}`,
    'public': `https://www.public.gr/search/?text=${title}`,
    'zara': `https://www.zara.com/gr/en/search?searchTerm=${title}`,
    'h&m': `https://www2.hm.com/el_gr/search-results.html?q=${title}`,
    'intersport': `https://www.intersport.gr/search?q=${title}`,
    'jumbo': `https://www.e-jumbo.gr/search?q=${title}`,
    'cosmos': `https://www.cosmossport.gr/search/?q=${title}`,
    'dpam': `https://www.dpam.com/gr-el/search/${title}`,
    'mothercare': `https://www.mothercare.gr/search?q=${title}`
  };

  for (const [key, url] of Object.entries(stores)) {
    if (source.includes(key)) return url;
  }

  // Fallback: Use original link
  return item.link;
}

// ============================================================
// SCORE PRODUCT
// ============================================================
function scoreProduct(item, gender, age) {
  const title = nm(item.title || '');
  const source = (item.source || '').toLowerCase();
  
  let priceValue = null;
  if (item.price) {
    const m = item.price.match(/[\d.,]+/);
    if (m) priceValue = parseFloat(m[0].replace(',', '.'));
  }

  // Gender scoring
  const genderKws = {
    'Αγόρι': { pos: ['αγορι','boys','boy'], neg: ['κοριτσι','girls','girl','ροζ','pink'] },
    'Κορίτσι': { pos: ['κοριτσι','girls','girl','ροζ','pink'], neg: ['αγορι','boys','boy'] }
  };
  
  let genderScore = 0;
  if (gender && genderKws[gender]) {
    if (genderKws[gender].pos.some(k => title.includes(k))) genderScore += 100;
    if (genderKws[gender].neg.some(k => title.includes(k))) genderScore -= 150;
  }

  // Shop preference
  const shopScores = { 
    'skroutz': 95, 'public': 90, 'intersport': 90, 
    'jumbo': 85, 'zara': 85, 'h&m': 85 
  };
  let shopScore = 50;
  for (const [s, sc] of Object.entries(shopScores)) {
    if (source.includes(s)) { shopScore = sc; break; }
  }

  const priceScore = priceValue ? Math.max(0, 100 - priceValue / 2) : 50;
  const ratingScore = item.rating ? (item.rating / 5) * 100 : 50;
  const reviewsScore = Math.min((item.reviews || 0) / 10, 50);

  return {
    priceValue,
    rating: item.rating || null,
    reviews: item.reviews || 0,
    genderScore,
    finalScore: Math.round(
      priceScore * 0.35 + 
      ratingScore * 0.25 + 
      reviewsScore * 0.15 + 
      shopScore * 0.15 + 
      genderScore * 0.10
    ),
    buyLink: generateStoreLink(item)
  };
}

// ============================================================
// FETCH SERPAPI
// ============================================================
async function fetchQuery(query) {
  try {
    const url = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(query)}&hl=el&gl=gr&num=20&api_key=${SERPAPI_KEY}`;
    const res = await fetch(url);
    return await res.json();
  } catch {
    return null;
  }
}

// ============================================================
// SERVER
// ============================================================
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  
  if (parsedUrl.pathname === '/api/search' && req.method === 'GET') {
    try {
      const baseQuery = parsedUrl.searchParams.get('q') || '';
      const gender = parsedUrl.searchParams.get('gender') || '';
      const age = parseInt(parsedUrl.searchParams.get('age')) || 5;
      
      const category = detectCategory(baseQuery);
      const catLabel = CATEGORIES[category]?.label || 'General';

      console.log(`\n${'='.repeat(55)}`);
      console.log(`🔍 "${baseQuery}" → 📂 ${catLabel}`);
      console.log(`👤 Gender: ${gender} | 🎂 Age: ${age}`);
      console.log(`${'='.repeat(55)}`);

      // Build queries with size hints
      const genderGr = gender === 'Αγόρι' ? 'αγόρι' : 'κορίτσι';
      const genderEn = gender === 'Αγόρι' ? 'boys' : 'girls';
      
      // Add size to queries if shoes or clothes
      let sizeHint = '';
      if (category === 'SHOES') {
        const sizes = getShoeSize(age);
        sizeHint = `νούμερο ${sizes.join(' ')}`;
      } else if (category === 'CLOTHES') {
        const sizes = getClothingSize(age);
        sizeHint = `μέγεθος ${sizes.join(' ')}`;
      }

      const queries = [
        `${baseQuery} παιδικά ${genderGr} ${sizeHint}`,
        `kids ${baseQuery} ${genderEn}`,
        `${baseQuery} ${genderGr} ${age} ετών`
      ];

      // Fetch results
      const raw = await Promise.all(queries.map(fetchQuery));
      const seenIds = new Set();
      const all = [];
      
      raw.forEach(data => {
        data?.shopping_results?.forEach(item => {
          const id = item.product_id || item.link || item.title;
          if (!seenIds.has(id)) {
            seenIds.add(id);
            all.push(item);
          }
        });
      });

      console.log(`✅ ${all.length} products fetched`);

      // Enrich products
      let enriched = all.map(item => ({
        ...item,
        ...scoreProduct(item, gender, age),
        attributes: extractAttributes(item, category),
        category
      })).filter(p => p.genderScore > -50);

      // Sort by score
      enriched.sort((a, b) => b.finalScore - a.finalScore);

      // Collect filters
      const availableFilters = collectFilters(enriched, category);

      // Add suggested sizes based on age
      if (category === 'SHOES') {
        availableFilters.suggestedSize = getShoeSize(age);
      } else if (category === 'CLOTHES') {
        availableFilters.suggestedSize = getClothingSize(age);
      }

      console.log(`📊 Filters: ${Object.keys(availableFilters).join(', ')}`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        shopping_results: enriched,
        metadata: {
          total: enriched.length,
          category,
          categoryLabel: catLabel,
          availableFilters
        }
      }));

    } catch (err) {
      console.error('❌', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Search failed' }));
    }
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n${'='.repeat(55)}`);
  console.log(`🚀 SMART KIDS - With Size Filters`);
  console.log(`   Server live on port ${PORT}`);
  console.log(`${'='.repeat(55)}\n`);
});
