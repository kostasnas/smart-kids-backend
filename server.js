// server.js - Smart Kids with Linkwise + SerpAPI
import http from 'http';
import { URL } from 'url';

const PORT = process.env.PORT || 3001;
const SERPAPI_KEY = process.env.SERPAPI_KEY;

// ============================================================
// LINKWISE — Feed URLs (φορτώνονται από τον CLIENT, όχι server)
// ============================================================
const LW_BASE = 'https://affiliate.linkwi.se/feeds/1.2/CD28202/programs-joined/columns-product_name,category,brand_name,tracking_url,thumb_url,in_stock,on_sale,price,discount,size/catinc-0/catex-0';

const LW_FEED_URLS = {
  shoes:   `${LW_BASE}/proginc-385-251/progex-0/feed.json`,   // Sneaker10
  toys:    `${LW_BASE}/proginc-11307-622/progex-0/feed.json`, // Παιχνίδια
  clothes: `${LW_BASE}/proginc-14015-2746/progex-0/feed.json`, // Παιδικά ρούχα
};

// Ποιες κατηγορίες χρησιμοποιούν ΜΟΝΟ SerpAPI (δεν υπάρχουν στο Linkwise)
const SERP_ONLY_CATEGORIES = ['sports', 'bikes', 'tech', 'gaming', 'school_bags', 'school_supplies', 'baby_gear', 'baby_safety'];

// No server-side feed cache — feeds processed by client

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

function getFeedTypeForCategory(offersCategory) {
  if (['shoes','baby_shoes'].includes(offersCategory))                        return 'shoes';
  if (['toys','baby_toys'].includes(offersCategory))                          return 'toys';
  if (['clothes','baby_clothes','baby_essentials'].includes(offersCategory))  return 'clothes';
  // Home search categories
  if (offersCategory === 'SHOES')                                             return 'shoes';
  if (offersCategory === 'TOYS' || offersCategory === 'SCHOOL')               return 'toys';
  if (['CLOTHES','SWIMWEAR','BABY','SUMMER'].includes(offersCategory))        return 'clothes';
  if (offersCategory === 'SPORTS')                                            return 'shoes'; // shoes feed has sports too
  // GENERAL: load shoes + clothes (most common) — toys separate
  if (offersCategory === 'GENERAL')                                           return 'general';
  return 'general';
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
// CATEGORY DETECTION
// ============================================================
const CATEGORIES = {
  SHOES: {
    label:    'Παιδικά Παπούτσια',
    triggers: ['παπουτσια','παπουτσι','πεδιλα','μποτακια','sneakers','shoes','boots','σανδαλια','υποδηματα','μπαλαρινα','αθλητικο παπουτσι'],
    filters:  {
      size:   ['17','18','19','20','21','22','23','24','25','26','27','28','29','30','31','32','33','34','35','36','37','38','39','40'],
      type:   ['Sneakers/Αθλητικά','Μποτάκια','Πέδιλα','Μπαλαρίνες','Σανδάλια','Ποδοσφαιρικά'],
      closure:['Σκρατς','Κορδόνια','Slip-on','Κλιπ/Κουμπί'],
      feature:['Αδιάβροχα','Φωτάκια','Memory Foam','Ανατομικά'],
    },
    keywords: {
      size:    Object.fromEntries([...Array(24)].map((_,i)=>{ const s=String(17+i); return [s,[s]]; })),
      type:    { 'Sneakers/Αθλητικά':['sneaker','αθλητικ','sport','runner','running'], 'Μποτάκια':['μποτ','boot','ankle'], 'Πέδιλα':['πεδιλ','sandal','σανδαλ'], 'Μπαλαρίνες':['μπαλαρ','ballerina','flat'], 'Σανδάλια':['σανδαλ','sandal','πεδιλ'], 'Ποδοσφαιρικά':['ποδοσφαιρ','football','soccer','turf'] },
      closure: { 'Σκρατς':['σκρατς','velcro','scratch'], 'Κορδόνια':['κορδον','lace'], 'Slip-on':['slip','μοκασ','loafer'], 'Κλιπ/Κουμπί':['κλιπ','κουμπ','buckle'] },
      feature: { 'Αδιάβροχα':['αδιαβροχ','waterproof','gore-tex'], 'Φωτάκια':['φωτ','light','led'], 'Memory Foam':['memory','foam','ανατομ'], 'Ανατομικά':['ανατομ','ortho','εργονομ'] },
    }
  },
  CLOTHES: {
    label:    'Παιδική & Βρεφική Μόδα',
    triggers: ['ρουχα','μπλουζα','παντελονι','φορμα','φουστα','μπουφαν','φορεμα','ζακετα','κολαν','πιτζαμα','εσωρουχα','καλτσες','σετ ρουχων','jacket','jeans','φορμακι'],
    filters:  {
      size:   ['50','56','62','68','74','80','86','92','98','104','110','116','122','128','134','140','146','152','158','164','170'],
      type:   ['Μπλούζες/T-shirts','Παντελόνια/Τζιν','Φορέματα/Φούστες','Σετ','Μπουφάν/Μπλέιζερ','Φόρμες','Πιτζάμες','Εσώρουχα/Κάλτσες'],
      season: ['Καλοκαιρινό','Χειμωνιάτικο','Demi/Ανοιξιάτικο'],
      material:['Βαμβάκι','Fleece/Πολυεστέρας','Αδιάβροχο','Οργανικό/Eco'],
    },
    keywords: {
      size:     { '50':['50'],'56':['56'],'62':['62'],'68':['68'],'74':['74'],'80':['80'],'86':['86'],'92':['92'],'98':['98'],'104':['104'],'110':['110'],'116':['116'],'122':['122'],'128':['128'],'134':['134'],'140':['140'],'146':['146'],'152':['152'],'158':['158'],'164':['164'],'170':['170'] },
      type:     { 'Μπλούζες/T-shirts':['μπλουζ','t-shirt','tshirt','polo','top'], 'Παντελόνια/Τζιν':['παντελον','jeans','τζιν','κολαν','legging'], 'Φορέματα/Φούστες':['φορεμ','φουστ','dress','skirt'], 'Σετ':['σετ','set','σύνολο'], 'Μπουφάν/Μπλέιζερ':['μπουφαν','jacket','blazer','παλτο'], 'Φόρμες':['φορμ','tracksuit','jogging','sweatshirt','hoodie'], 'Πιτζάμες':['πιτζαμ','pajama','νυχτ'], 'Εσώρουχα/Κάλτσες':['εσωρουχ','καλτσ','underwear','sock'] },
      season:   { 'Καλοκαιρινό':['καλοκαιρ','summer','αμανικ','κοντομαν'], 'Χειμωνιάτικο':['χειμ','winter','ζεστ','μαλλιν','fleece'], 'Demi/Ανοιξιάτικο':['demi','ανοιξ','φθινοπ','spring'] },
      material: { 'Βαμβάκι':['βαμβακ','cotton','100%'], 'Fleece/Πολυεστέρας':['fleece','πολυεστ','polyester'], 'Αδιάβροχο':['αδιαβροχ','waterproof','softshell'], 'Οργανικό/Eco':['οργαν','eco','gots','βιολογ'] },
    }
  },
  SWIMWEAR: {
    label:    'Παιδικά Μαγιό & Καλοκαιρινά',
    triggers: ['μαγιο','μαγιω','swimwear','μπικινι','ολοσωμο μαγιο','παιδικο μαγιο','swim','παραλια'],
    filters:  {
      size:    ['74','80','86','92','98','104','110','116','122','128','134','140','146','152','158','164'],
      type:    ['Ολόσωμο','Μπικίνι/Δύο τεμάχια','Σορτς/Μπόξερ','Παρεό'],
      feature: ['UV Protection','Αντιχλωριακό','Γρήγορο Στέγνωμα'],
    },
    keywords: {
      size:    { '74':['74'],'80':['80'],'86':['86'],'92':['92'],'98':['98'],'104':['104'],'110':['110'],'116':['116'],'122':['122'],'128':['128'],'134':['134'],'140':['140'],'146':['146'],'152':['152'],'158':['158'],'164':['164'] },
      type:    { 'Ολόσωμο':['ολοσωμ','one piece','swimsuit'], 'Μπικίνι/Δύο τεμάχια':['μπικιν','bikini','δυο τεμ'], 'Σορτς/Μπόξερ':['σορτς','boxer','swim short','boardshort'], 'Παρεό':['παρεο','pareo','sarong'] },
      feature: { 'UV Protection':['uv','upf','αντηλιακ'], 'Αντιχλωριακό':['χλωρ','chlorine'], 'Γρήγορο Στέγνωμα':['στεγν','quick dry','dri'] },
    }
  },
  TOYS: {
    label:    'Παιχνίδια',
    triggers: ['παιχνιδι','παιχνιδια','κουκλα','lego','playmobil','toy','δωρο','puzzle','παζλ','επιτραπεζιο','κατασκευη','σετ παιχνιδιων'],
    filters:  {
      brand:   ['LEGO','Playmobil','Mattel','Hasbro','Fisher-Price','Clementoni','Ravensburger','Spin Master'],
      type:    ['Κατασκευές/LEGO','Κούκλες & Αξεσουάρ','Αυτοκίνητα/Οχήματα','Εκπαιδευτικά','Puzzle/Παζλ','Επιτραπέζια','Υπαίθρια Παιχνίδια'],
      ageRange:['0-2 ετών','3-5 ετών','6-8 ετών','9-12 ετών'],
    },
    keywords: {
      brand:    { 'LEGO':['lego'],'Playmobil':['playmobil'],'Mattel':['mattel','barbie','hot wheels'],'Hasbro':['hasbro','nerf','monopoly'],'Fisher-Price':['fisher'],'Clementoni':['clementoni'],'Ravensburger':['ravensburger'],'Spin Master':['spin master','paw patrol'] },
      type:     { 'Κατασκευές/LEGO':['lego','κατασκευ','τουβλ','block'],'Κούκλες & Αξεσουάρ':['κουκλ','doll','barbie','baby'],'Αυτοκίνητα/Οχήματα':['αυτοκιν','car','vehicle','τρακτερ','οχημ'],'Εκπαιδευτικά':['εκπαιδ','educational','μαθ','αλφαβητ'],'Puzzle/Παζλ':['puzzle','παζλ','jigsaw'],'Επιτραπέζια':['επιτραπεζ','board game','σκακ','ντομινο'],'Υπαίθρια Παιχνίδια':['υπαιθρ','outdoor','ποδηλ','σκουτερ','τρολευ'] },
      ageRange: { '0-2 ετών':['0-2','βρεφ','baby','0 μην','6 μην','12 μην','18 μην'],'3-5 ετών':['3-5','3 ετ','4 ετ','5 ετ'],'6-8 ετών':['6-8','6 ετ','7 ετ','8 ετ'],'9-12 ετών':['9-12','9 ετ','10 ετ','11 ετ','12 ετ'] },
    }
  },
  SCHOOL: {
    label:    'Σχολικά Είδη',
    triggers: ['σχολικα','τσαντα','κασετινα','μολυβι','τετραδιο','σχολειο','school','σχολικη τσαντα','γυμνασιο','δημοτικο'],
    filters:  {
      type:    ['Τσάντες Πλάτης','Κασετίνες','Γραφική Ύλη','Τετράδια/Μπλοκ','Αξεσουάρ'],
      feature: ['Ανακλαστικά','Ενισχυμένη Πλάτη','Αδιάβροχο','Εργονομική'],
    },
    keywords: {
      type:    { 'Τσάντες Πλάτης':['τσαντ','backpack','σακιδ'],'Κασετίνες':['κασετ','pencil case'],'Γραφική Ύλη':['μολυβ','στυλο','μαρκαδ','ψαλιδ'],'Τετράδια/Μπλοκ':['τετραδ','μπλοκ','notebook'],'Αξεσουάρ':['κλειδοθηκ','μπρελοκ','θηκ'] },
      feature: { 'Ανακλαστικά':['ανακλαστ','reflect'],'Ενισχυμένη Πλάτη':['ενισχυ','ενισχ','lumbar'],'Αδιάβροχο':['αδιαβροχ','waterproof'],'Εργονομική':['εργονομ','orthop','ανατομ'] },
    }
  },
  SPORTS: {
    label:    'Αθλητικά Είδη',
    triggers: ['αθλητικα','ποδοσφαιρο','μπαλα','ποδοσφαιρικα','αθλητισμος','sport','basketball','κολυμβηση','γυμναστικη'],
    filters:  {
      sport:   ['Ποδόσφαιρο','Μπάσκετ','Κολύμβηση','Γυμναστική','Τένις','Ποδηλασία'],
      type:    ['Ρούχα','Παπούτσια','Εξοπλισμός','Αξεσουάρ'],
    },
    keywords: {
      sport:   { 'Ποδόσφαιρο':['ποδοσφαιρ','football','soccer'],'Μπάσκετ':['μπασκετ','basketball'],'Κολύμβηση':['κολυμβ','swim','πισιν'],'Γυμναστική':['γυμναστ','gymnastics'],'Τένις':['τενιs','tennis'],'Ποδηλασία':['ποδηλ','cycling','bike'] },
      type:    { 'Ρούχα':['ρουχ','jersey','short','φανελ'],'Παπούτσια':['παπουτσ','shoes','boot','cleat'],'Εξοπλισμός':['μπαλ','ball','ρακετ','εξοπλ'],'Αξεσουάρ':['γαντ','κηνεμ','επικαρπ','αξεσ'] },
    }
  },
  BABY: {
    label:    'Βρεφικά Είδη',
    triggers: ['βρεφικα','βρεφος','μωρο','baby','νεογεννητο','βρεφη','βρεφικο'],
    filters:  {
      size:    ['50','56','62','68','74','80','86','92'],
      type:    ['Ρούχα','Παπούτσια','Παιχνίδια','Φροντίδα','Αξεσουάρ'],
    },
    keywords: {
      size:    { '50':['50'],'56':['56'],'62':['62'],'68':['68'],'74':['74'],'80':['80'],'86':['86'],'92':['92'] },
      type:    { 'Ρούχα':['ρουχ','φορμ','body','romper'],'Παπούτσια':['παπουτσ','shoes','boot'],'Παιχνίδια':['παιχνιδ','toy','κουδουν'],'Φροντίδα':['φροντ','κρεμ','σαμπουαν','πανα'],'Αξεσουάρ':['καπελ','σκουφ','γαντ','αξεσ'] },
    }
  },
};

function detectCategory(query) {
  const q = nm(query);
  for (const [name, cat] of Object.entries(CATEGORIES)) {
    if (cat.triggers?.some(t => q.includes(nm(t)))) return name;
  }
  return 'GENERAL';
}

// Εξαγωγή attributes από τίτλο προϊόντος
function extractAttributes(item, category) {
  const rawTitle = item.title || item.product_name || '';
  const title    = nm(rawTitle);
  const attrs    = {};
  const cat      = CATEGORIES[category];
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

// Συγκεντρώνει διαθέσιμα φίλτρα από τα αποτελέσματα
function collectFilters(products, category) {
  const sets = {};
  products.forEach(p => {
    Object.entries(p.attributes || {}).forEach(([key, vals]) => {
      if (!sets[key]) sets[key] = new Set();
      (Array.isArray(vals) ? vals : [vals]).forEach(v => v && sets[key].add(v));
    });
  });
  const result = {};
  const cat = CATEGORIES[category];
  if (cat?.filters) {
    Object.keys(cat.filters).forEach(ft => {
      if (sets[ft]?.size > 0) {
        const defined = cat.filters[ft];
        const found   = Array.from(sets[ft]);
        const sorted  = [...defined.filter(d => found.includes(d)), ...found.filter(f => !defined.includes(f))];
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
    res.end(JSON.stringify({ status:'ok', feeds: Object.keys(LW_FEED_URLS) }));
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

      // Linkwise feed URL — client will fetch & filter directly
      const feedType = getFeedTypeForCategory(effectiveCategory);
      const feedUrl  = feedType ? LW_FEED_URLS[feedType] : null;

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
      for (const p of [...serpResults]) {
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

      console.log(`✅ Total: ${merged.length} (serp:${serpResults.length})`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        shopping_results: merged,
        metadata: { total: merged.length, serpCount: serpResults.length, category, categoryLabel: catLabel, availableFilters, sizeSource: shoeSize||clothingSize ? 'profile':'age', feedUrl, feedType, gender, age, shoeSize, clothingSize }
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
  // Load feeds on-demand to save RAM — no preload at startup

});
