/**
 * multiStoreSearch.js
 * Σωστά URLs και category paths για κάθε ελληνικό κατάστημα
 * Βασισμένο σε επαληθευμένα real URLs από κάθε site
 */

// ── STORES ────────────────────────────────────────────────────
export const STORES = {

  SKROUTZ: {
    name: 'Skroutz',
    domain: 'skroutz.gr',
    icon: '🛒',
    color: '#ff4d6d',
    // Χρησιμοποιεί το skroutzUrlBuilder — δεν χρειάζεται searchUrl εδώ
    searchUrl: (query) =>
      `https://www.skroutz.gr/search?keyphrase=${encodeURIComponent(query)}`,
    categories: ['all', 'toys', 'shoes', 'clothes', 'sports', 'baby', 'school'],
  },

  PUBLIC: {
    name: 'Public',
    domain: 'public.gr',
    icon: '🏪',
    color: '#2563eb',
    // Επαληθευμένα URLs: /root/kids-and-toys, /root/toys-games κλπ
    searchUrl: (query, category) => {
      const base = 'https://www.public.gr';
      const catMap = {
        toys:     `/root/kids-and-toys?term=${encodeURIComponent(query)}`,
        baby:     `/root/kids-and-toys?term=${encodeURIComponent(query)}`,
        school:   `/root/kids-and-toys?term=${encodeURIComponent(query)}`,
        books:    `/root/books?term=${encodeURIComponent(query)}`,
        tech:     `/root/computers-tablets?term=${encodeURIComponent(query)}`,
        electronics: `/root/computers-tablets?term=${encodeURIComponent(query)}`,
      };
      const path = catMap[category] || `/search?term=${encodeURIComponent(query)}`;
      return `${base}${path}`;
    },
    categories: ['all', 'toys', 'baby', 'books', 'tech', 'electronics', 'school'],
  },

  MOUSTAKAS: {
    name: 'Moustakas',
    domain: 'moustakastoys.gr',
    icon: '🧸',
    color: '#16a34a',
    // Επαληθευμένα URLs: /allproducts/?s=..., κατηγορίες με slug
    searchUrl: (query, category) => {
      const base = 'https://www.moustakastoys.gr';
      const catMap = {
        toys:     `/allproducts/?s=${encodeURIComponent(query)}`,
        baby:     `/vrefika/?s=${encodeURIComponent(query)}`,
        books:    `/vivlia/?s=${encodeURIComponent(query)}`,
        school:   `/sxolika/?s=${encodeURIComponent(query)}`,
        outdoor:  `/athlitika-paixnidia/?s=${encodeURIComponent(query)}`,
      };
      const path = catMap[category] || `/?s=${encodeURIComponent(query)}`;
      return `${base}${path}`;
    },
    categories: ['all', 'toys', 'baby', 'books', 'school', 'outdoor'],
  },

  INTERSPORT: {
    name: 'Intersport',
    domain: 'intersport.gr',
    icon: '👟',
    color: '#ea580c',
    // Επαληθευμένα URLs: /el/paidika/papoutsia/, /el/paidika/rouxa/
    searchUrl: (query, category) => {
      const base = 'https://www.intersport.gr';
      const catMap = {
        shoes:    `/el/paidika/papoutsia/`,
        clothes:  `/el/paidika/rouxa/`,
        sports:   `/el/paidika/`,
        kids:     `/el/paidika/`,
        football: `/el/paidika/papoutsia/podosfairo/`,
        basket:   `/el/paidika/papoutsia/basket/`,
      };
      // Intersport δεν έχει text search URL — πηγαίνει στην κατηγορία
      return catMap[category] || `${base}/el/paidika/`;
    },
    categories: ['all', 'shoes', 'clothes', 'sports', 'kids', 'football', 'basket'],
  },

  COSMOS: {
    name: 'Cosmos Sport',
    domain: 'cosmossport.gr',
    icon: '⚽',
    color: '#7c3aed',
    // Επαληθευμένα URLs: /el/paidika-papoutsia, /el/paidika-rouxa
    // Cosmos χρησιμοποιεί numeric IDs για κατηγορίες
    searchUrl: (query, category) => {
      const base = 'https://www.cosmossport.gr';
      const catMap = {
        shoes:    `${base}/el/paidika-papoutsia/`,
        clothes:  `${base}/el/paidika-rouxa/`,
        sports:   `${base}/el/paidika/`,
        kids:     `${base}/el/paidika/`,
        football: `${base}/el/paidika-papoutsia/podosfairo/`,
        basket:   `${base}/el/paidika-papoutsia/basket/`,
        running:  `${base}/el/paidika-papoutsia/treximat/`,
      };
      return catMap[category] || `${base}/el/paidika/`;
    },
    categories: ['all', 'shoes', 'clothes', 'sports', 'kids', 'football', 'basket'],
  },
};

// ── Βοηθητικές ────────────────────────────────────────────────

export const getStoreByDomain = (url) => {
  if (!url) return null;
  try {
    const domain = new URL(url).hostname.toLowerCase().replace('www.', '');
    for (const store of Object.values(STORES)) {
      if (domain.includes(store.domain)) return store;
    }
  } catch {}
  return null;
};

/**
 * Επιστρέφει λίστα store objects που ταιριάζουν στην κατηγορία
 * Χρησιμοποιείται από το Offers.jsx για να φτιάξει κουμπιά
 */
export function getStoresForCategory(category = 'all') {
  return Object.values(STORES).filter(
    s => s.categories.includes(category) || s.categories.includes('all')
  );
}

/**
 * Χτίζει search URL για ένα συγκεκριμένο κατάστημα + query + kid profile
 * Χρησιμοποιείται ως fallback όταν δεν υπάρχει category URL
 */
export function buildStoreUrl(storeKey, query, kid, category = 'all') {
  const store = STORES[storeKey];
  if (!store) return null;
  return store.searchUrl(query, category);
}

/**
 * Χτίζει τη λίστα "store links" για ένα query — για εμφάνιση ως tabs/chips στο UI
 */
export function buildStoreLinks(query, kid, category = 'all') {
  const gender = kid?.gender === 'Αγόρι' ? 'αγόρι' : 'κορίτσι';
  const age    = kid?.age || 5;
  const shoe   = kid?.shoeSize || kid?.shoe_size || '';
  const fullQ  = `${query} ${gender}`.trim();

  return Object.entries(STORES).map(([key, store]) => ({
    key,
    name:    store.name,
    icon:    store.icon,
    color:   store.color,
    domain:  store.domain,
    url:     store.searchUrl(fullQ, category),
  }));
}

/**
 * Mapping από ελληνικό query keyword → category key (για store routing)
 */
export function detectStoreCategory(query) {
  const q = (query || '').toLowerCase()
    .replace(/ά/g,'α').replace(/έ/g,'ε').replace(/ή/g,'η')
    .replace(/ί/g,'ι').replace(/ό/g,'ο').replace(/ύ/g,'υ').replace(/ώ/g,'ω');

  if (['παπουτσ','sneaker','μποτ','πεδιλ','σανδαλ'].some(k => q.includes(k))) return 'shoes';
  if (['μπλουζ','παντελον','φορμ','φουτερ','ρουχ','φορεμ'].some(k => q.includes(k))) return 'clothes';
  if (['παιχνιδ','lego','playmobil','κουκλ','λουτριν'].some(k => q.includes(k))) return 'toys';
  if (['βιβλι','παραμυθ'].some(k => q.includes(k))) return 'books';
  if (['ποδοσφαιρ','μπαλ','ποδοσφαιρ'].some(k => q.includes(k))) return 'football';
  if (['μπασκετ','basket'].some(k => q.includes(k))) return 'basket';
  if (['αθλητ','sport'].some(k => q.includes(k))) return 'sports';
  if (['σχολικ','τσαντ','κασετιν'].some(k => q.includes(k))) return 'school';
  if (['βρεφ','μωρ','baby','νεογεν'].some(k => q.includes(k))) return 'baby';
  return 'all';
}

export const MOBILE_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 12; Mobile) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
