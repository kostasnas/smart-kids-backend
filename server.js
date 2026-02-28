import http from 'http';
import { URL } from 'url';

const PORT = process.env.PORT || 3001;
const SERPAPI_KEY = process.env.SERPAPI_KEY || 'a2377d128c1ba155eb58dd575a16079c31730f0fdeab9d05014b01b8870053f1';

// Καθαρισμός ελληνικών χαρακτήρων για τα links
function nm(str) {
  return (str || '').toLowerCase()
    .replace(/ά/g,'α').replace(/έ/g,'ε').replace(/ή/g,'η')
    .replace(/ί/g,'ι').replace(/ό/g,'ο').replace(/ύ/g,'υ').replace(/ώ/g,'ω');
}

function generateStoreLink(item) {
  const source = (item.source || '').toLowerCase();
  const title = item.title || '';
  // Κρατάμε μόνο τις πρώτες 4 λέξεις του τίτλου για να πετυχαίνει η αναζήτηση στο eshop
  const shortTitle = title.split(' ').slice(0, 4).join(' ');
  const enc = encodeURIComponent(shortTitle);
  
  if (item.merchant_link && !item.merchant_link.includes('google.com')) return item.merchant_link;
  
  const stores = {
    'skroutz': `https://www.skroutz.gr/search?keyphrase=${enc}`,
    'bestprice': `https://www.bestprice.gr/search?q=${enc}`,
    'zara': `https://www.zara.com/gr/el/search?searchTerm=${enc}`,
    'public': `https://www.public.gr/search/?text=${enc}`,
    'intersport': `https://www.intersport.gr/search?q=${enc}`,
    'jumbo': `https://www.e-jumbo.gr/search?q=${enc}`,
    'cosmos': `https://www.cosmossport.gr/search/?q=${enc}`,
    'dpam': `https://www.dpam.com/gr-el/search/${enc}`
  };

  for (const [k, v] of Object.entries(stores)) { if (source.includes(k)) return v; }
  return (item.product_link && !item.product_link.includes('google.com')) ? item.product_link : `https://www.bestprice.gr/search?q=${enc}`;
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
      const query = `${q} παιδικά ${gender === 'Αγόρι' ? 'αγόρι' : 'κορίτσι'}`;
      
      // Χρήση της ενσωματωμένης fetch της Node 20
      const apiRes = await fetch(`https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(query)}&hl=el&gl=gr&api_key=${SERPAPI_KEY}`);
      const data = await apiRes.json();
      
      const results = (data.shopping_results || []).map(item => ({
        ...item,
        buyLink: generateStoreLink(item)
      }));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ shopping_results: results }));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server live on port ${PORT}`));
