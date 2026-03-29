/**
 * imageExtractor.js
 *
 * Τρόπος λειτουργίας:
 * 1. Όταν ο χρήστης αποθηκεύει URL από PartialWebView, το Kotlin ήδη γνωρίζει το URL
 * 2. Ο server (Render) κάνει fetch το URL server-side (χωρίς CORS) και επιστρέφει το og:image
 * 3. Αποθηκεύουμε στο localStorage/Supabase με την εικόνα
 */

const SERVER = 'https://smart-kids-api.onrender.com';

// ── Εξάγει εικόνα μέσω server proxy (χωρίς CORS πρόβλημα) ───────
export async function extractProductImage(url) {
  if (!url) return null;

  // Φίλτρο: μόνο product pages — όχι search pages
  const isProductPage =
    url.includes('/s/') || url.includes('/p/') ||
    url.includes('/product') || url.includes('/products/') ||
    url.includes('/allproducts/') ||
    (url.includes('moustakastoys') && url.match(/\/[a-z0-9-]+-\d+\/?$/)) ||
    (url.includes('public.gr') && url.includes('/p/'));

  if (!isProductPage) return null;

  try {
    const res = await fetch(
      `${SERVER}/api/extract-image?url=${encodeURIComponent(url)}`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.image) return data.image;
    }
  } catch {}

  // Fallback: ψάχνουμε store-specific known patterns
  return guessImageFromUrl(url);
}

/**
 * Για sites που έχουν predictable CDN URLs
 * (πχ Skroutz: a.scdn.gr/images/sku/...)
 */
function guessImageFromUrl(url) {
  // Skroutz CDN pattern (για search αποτελέσματα που έχουν ήδη thumbnail)
  if (url.includes('scdn.gr') || url.includes('skroutz') && url.includes('/s/')) {
    return null; // thumbnail έρχεται από SerpAPI, δεν χρειάζεται extraction
  }
  return null;
}

// ── Βοηθητική: ανιχνεύει κατάστημα από URL ───────────────────
export function getStoreFromUrl(url) {
  if (!url) return { name: 'Skroutz', icon: '🛒', color: '#ff4d6d' };
  const domain = (() => { try { return new URL(url).hostname.toLowerCase(); } catch { return ''; } })();

  if (domain.includes('skroutz'))      return { name: 'Skroutz',      icon: '🛒', color: '#ff4d6d' };
  if (domain.includes('public'))       return { name: 'Public',       icon: '🏪', color: '#2563eb' };
  if (domain.includes('moustakastoys'))return { name: 'Moustakas',    icon: '🧸', color: '#16a34a' };
  if (domain.includes('intersport'))   return { name: 'Intersport',   icon: '👟', color: '#ea580c' };
  if (domain.includes('cosmossport'))  return { name: 'Cosmos Sport', icon: '⚽', color: '#7c3aed' };
  if (domain.includes('mediamarkt'))   return { name: 'MediaMarkt',   icon: '📺', color: '#e11d48' };
  if (domain.includes('plaisio'))      return { name: 'Plaisio',      icon: '💻', color: '#0284c7' };
  return { name: domain.replace('www.',''), icon: '🏬', color: '#64748b' };
}

/**
 * Κεντρική συνάρτηση αποθήκευσης στη wishlist με εικόνα
 *
 * Καλείται από:
 * - Home.jsx → saveRequested event από PartialWebView
 * - AIAdvisor.jsx → κουμπί "Αποθήκευση" σε MessageBubble
 * - Offers.jsx → κουμπί wishlist σε κάρτα προϊόντος
 */
export async function saveToWishlistWithImage(item, options = {}) {
  const { kidName = '', isAuthenticated = false, fromAI = false, fromOffers = false } = options;

  const storeInfo = getStoreFromUrl(item.link);

  // 1. Προσπαθούμε να βρούμε εικόνα
  let thumbnail = item.thumbnail || item.imageUrl || item.image || null;

  if (!thumbnail && item.link) {
    try {
      thumbnail = await extractProductImage(item.link);
    } catch {}
  }

  // 2. Φτιάχνουμε το item object
  const finalItem = {
    id:         Date.now(),
    title:      item.title || `Προϊόν από ${storeInfo.name}`,
    price:      item.price || 0,
    priceLabel: item.priceLabel || '',
    thumbnail,                           // ← εδώ η εικόνα
    imageUrl:   thumbnail,               // alias για συμβατότητα
    link:       item.link,
    store:      item.store || storeInfo.name,
    storeIcon:  item.storeIcon || storeInfo.icon,
    storeColor: item.storeColor || storeInfo.color,
    kidName,
    kidId:      item.kidId || null,
    skroutzQuery: item.skroutzQuery || item.query || '',
    addedAt:    new Date().toISOString(),
    fromAI,
    fromOffers,
  };

  // 3. Αποθήκευση
  if (isAuthenticated) {
    try {
      const { supabaseService } = await import('../services/supabase');
      await supabaseService.addToWishlist(finalItem);
    } catch (e) {
      console.error('Supabase wishlist save error:', e);
      _saveToLocalStorage(finalItem);
    }
  } else {
    _saveToLocalStorage(finalItem);
  }

  // 4. Ειδοποίηση UI
  window.dispatchEvent(new CustomEvent('shopping-list-updated'));

  return finalItem;
}

function _saveToLocalStorage(item) {
  const list = JSON.parse(localStorage.getItem('tracked-items') || '[]');
  if (!list.find(i => i.link === item.link && i.kidName === item.kidName)) {
    list.unshift(item);
    localStorage.setItem('tracked-items', JSON.stringify(list));
  }
}

/**
 * Απλή αποθήκευση URL (από PartialWebView native button)
 * Χωρίς async image extraction για να είναι άμεση
 */
export function saveUrlToWishlist(url, label, kidName) {
  const storeInfo = getStoreFromUrl(url);
  const item = {
    id:         Date.now(),
    title:      label || `Προϊόν από ${storeInfo.name}`,
    price:      0,
    priceLabel: '',
    thumbnail:  null,
    imageUrl:   null,
    link:       url,
    store:      storeInfo.name,
    storeIcon:  storeInfo.icon,
    storeColor: storeInfo.color,
    kidName:    kidName || '',
    skroutzQuery: url,
    addedAt:    new Date().toISOString(),
    fromAI:     false,
    fromOffers: false,
  };

  const list = JSON.parse(localStorage.getItem('tracked-items') || '[]');
  if (!list.find(i => i.link === url)) {
    list.unshift(item);
    localStorage.setItem('tracked-items', JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('shopping-list-updated'));

    // Async: προσπαθεί να βρει εικόνα και ενημερώνει το item
    extractProductImage(url).then(img => {
      if (!img) return;
      const saved = JSON.parse(localStorage.getItem('tracked-items') || '[]');
      const idx   = saved.findIndex(i => i.id === item.id);
      if (idx >= 0) {
        saved[idx].thumbnail = img;
        saved[idx].imageUrl  = img;
        localStorage.setItem('tracked-items', JSON.stringify(saved));
        window.dispatchEvent(new CustomEvent('shopping-list-updated'));
      }
    }).catch(() => {});
  }

  return item;
}
