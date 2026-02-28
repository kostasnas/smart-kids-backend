// server.js - Smart Kids Search - Fixes Applied
import http from 'http';
import { URL } from 'url';

const PORT = process.env.PORT || 3001;
const SERPAPI_KEY = process.env.SERPAPI_KEY || 'a2377d128c1ba155eb58dd575a16079c31730f0fdeab9d05014b01b8870053f1';

// Καθαρισμός ελληνικών χαρακτήρων (Normalization)
function nm(str) {
  return (str || '').toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/ά/g,'α').replace(/έ/g,'ε').replace(/ή/g,'η')
    .replace(/ί/g,'ι').replace(/ό/g,'ο').replace(/ύ/g,'υ').replace(/ώ/g,'ω');
}

// ============================================================
// GENERATE DIRECT STORE LINK - THOROUGHLY FIXED
// ============================================================
function generateStoreLink(item) {
  const source = (item.source || '').toLowerCase();
  const title = item.title || '';
  
  // Καθαρίζουμε τον τίτλο: αφαιρούμε ειδικούς χαρακτήρες, κρατάμε τις πρώτες 5 λέξεις ( >2 χαρακτήρες)
  const cleanTitle = title.replace(/[^\w\s\u0370-\u03ff]/gi, ' '); 
  const shortTitle = cleanTitle.split(' ').filter(w => w.length > 2).slice(0, 5).join(' ');
  const enc = encodeURIComponent(shortTitle);
  
  // 1. Αν η Google μας δίνει απευθείας link εμπόρου, το χρησιμοποιούμε (αν δεν είναι google.com)
  if (item.merchant_link && !item.merchant_link.includes('google.com')) {
    return item.merchant_link;
  }
  
  // 2. Διορθωμένα URLs αναζήτησης για τα γνωστά ελληνικά eshops
  const stores = {
    'skroutz': `https://www.skroutz.gr/search?keyphrase=${enc}`,
    'bestprice': `https://www.bestprice.gr/search?q=${enc}`,
    'zara': `https://www.zara.com/gr/el/search?searchTerm=${enc}`,
    'public': `https://www.public.gr/search/?text=${enc}`,
    'intersport': `https://www.intersport.gr/search?q=${enc}`,
    'jumbo': `https://www.e-jumbo.gr/search?q=${enc}`,
    'cosmos': `https://www.cosmossport.gr/search/?q=${enc}`,
    // ΔΙΟΡΘΩΣΗ DPAM
    'dpam': `https://www.dpam.gr/catalogsearch/result/?q=${enc}`,
    'mothercare': `https://www.mothercare.gr/search?q=${enc}`,
    'moustakas': `https://www.moustakastoys.gr/search?q=${enc}`,
    'orchestra': `https://www.orchestra.gr/search?q=${enc}`
  };

  // Έλεγχος αν το source περιέχει κάποιο από τα γνωστά eshops
  for (const [key, url] of Object.entries(stores)) {
    if (source.includes(key)) return url;
  }

  // 3. FALLBACK: Αν δεν ξέρουμε το μαγαζί, πάμε στο BestPrice (πιο αξιόπιστο για direct product)
  return `https://www.bestprice.gr/search?q=${enc}`;
}

// ============================================================
// SERVER LOGIC
// ============================================================
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
      
      // Χρήση της ενσωματωμένης fetch της Node 20 (Render uses v20)
      const apiRes = await fetch(`https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(query)}&hl=el&gl=gr&api_key=${SERPAPI_KEY}`);
      const data = await apiRes.json();
      
      // Δημιουργία των αποτελεσμάτων με τα διορθωμένα links
      const results = (data.shopping_results || []).map(item => ({
        ...item,
        buyLink: generateStoreLink(item) // Εδώ εφαρμόζεται η διόρθωση
      }));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ shopping_results: results }));
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
