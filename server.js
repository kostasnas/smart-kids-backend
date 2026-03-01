// server.js - Smart Kids Final Fixes
import http from 'http';
import { URL } from 'url';

const PORT = process.env.PORT || 3001;
const SERPAPI_KEY = process.env.SERPAPI_KEY || 'a2377d128c1ba155eb58dd575a16079c31730f0fdeab9d05014b01b8870053f1';

// ΝΟΡΜΑΛΙΖΑΣΗ ΕΛΛΗΝΙΚΩΝ
function nm(str) {
  return (str || '').toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/ά/g,'α').replace(/έ/g,'ε').replace(/ή/g,'η')
    .replace(/ί/g,'ι').replace(/ό/g,'ο').replace(/ύ/g,'υ').replace(/ώ/g,'ω');
}

// ΟΡΙΣΜΟΣ ΚΑΤΗΓΟΡΙΩΝ ΜΕ ΑΓΓΛΙΚΑ TRIGGERS
const CATEGORIES = {
  SHOES: { label: 'Παπούτσια', triggers: ['παπουτσια','shoes','sneakers','boots','πεδιλα'], keywords: 'παιδικά παπούτσια' },
  CLOTHES: { label: 'Ρούχα', triggers: ['ρουχα','clothes','clothes','tshirt','dress','dress','μπλουζα','παντελονι'], keywords: 'παιδικά ρούχα' },
  TOYS: { label: 'Παιχνίδια', triggers: ['παιχνιδια','toys','lego','παιχνιδι','barbie'], keywords: 'παιχνίδια' },
  BABY: { label: 'Βρεφικά', triggers: ['βρεφικα','baby','μωρου','πανες'], keywords: 'βρεφικά είδη' }
};

function detectCategory(query) {
  const q = nm(query);
  if (!q || q.length < 2) return 'GENERAL';
  
  for (const [name, cat] of Object.entries(CATEGORIES)) {
    if (cat.triggers.some(t => q.includes(nm(t)))) return name;
  }
  return 'GENERAL';
}

function generateStoreLink(item, category) {
  const source = (item.source || '').toLowerCase();
  const title = item.title || '';
  const cleanTitle = title.replace(/[^\w\s\u0370-\u03ff]/gi, ' '); 
  const shortTitle = cleanTitle.split(' ').filter(w => w.length > 2).slice(0, 5).join(' ');
  const enc = encodeURIComponent(shortTitle);
  
  if (item.merchant_link && !item.merchant_link.includes('google.com')) {
    return item.merchant_link;
  }
  
  const stores = {
    'skroutz': `https://www.skroutz.gr/search?keyphrase=${enc}`,
    'bestprice': `https://www.bestprice.gr/search?q=${enc}`,
    'zara': `https://www.zara.com/gr/el/search?searchTerm=${enc}`,
    'dpam': `https://www.dpam.gr/catalogsearch/result/?q=${enc}`,
    'moustakas': `https://www.moustakastoys.gr/search?q=${enc}`
  };

  for (const [key, url] of Object.entries(stores)) {
    if (source.includes(key)) return url;
  }
  return `https://www.bestprice.gr/search?q=${enc}`;
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  
  if (parsedUrl.pathname === '/api/search') {
    try {
      const q = parsedUrl.searchParams.get('q') || '';
      const gender = parsedUrl.searchParams.get('gender') || '';
      const category = detectCategory(q);
      const catLabel = CATEGORIES[category]?.label || 'Είδη';
      
      const searchQuery = `${q} παιδικά ${gender}`;
      
      const apiRes = await fetch(`https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(searchQuery)}&hl=el&gl=gr&api_key=${SERPAPI_KEY}`);
      const data = await apiRes.json();
      
      const results = (data.shopping_results || []).map(item => ({
        ...item,
        buyLink: generateStoreLink(item, category)
      }));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        shopping_results: results,
        metadata: { category: catLabel }
      }));
    } catch (err) {
      console.error(err);
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server live on port ${PORT}`));
