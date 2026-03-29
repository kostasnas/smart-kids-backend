import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { useAuth } from './components/AuthProvider';
import { supabaseService } from './services/supabase';
import { toAffiliateLink, hasAffiliateProgram } from './services/linkwise';
import { saveToWishlistWithImage } from './utils/imageExtractor';
import {
  Tag, Flame, ExternalLink, RefreshCw, Loader2,
  AlertCircle, SlidersHorizontal, X, Star, ShoppingCart
} from 'lucide-react';
import { registerPlugin } from '@capacitor/core';
import { searchMultipleStores, MOBILE_USER_AGENT, STORES, createProductCardProps } from './services/multiStoreSearch';

// Register the PartialWebView plugin
const PartialWebView = registerPlugin('PartialWebView');

// ── Αποθηκεύει URL στη wishlist ───────────────────────────────
function saveUrlToList(url, label, kidName) {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    const store = hostname.includes('skroutz') ? 'Skroutz'
      : hostname.includes('public') ? 'Public'
      : hostname.includes('mediamarkt') ? 'MediaMarkt'
      : hostname.includes('plaisio') ? 'Plaisio'
      : hostname;

    const item = {
      id: Date.now(),
      title: label || `Προϊόν από ${store}`,
      price: 0, priceLabel: '',
      thumbnail: null,
      link: url,
      store,
      kidName: kidName || '',
      skroutzQuery: url,
      addedAt: new Date().toISOString(),
      fromAI: true,
      isSkroutzProduct: checkIsProduct(url),
    };
    const list = JSON.parse(localStorage.getItem('tracked-items') || '[]');
    if (!list.find(i => i.link === url)) {
      list.unshift(item);
      localStorage.setItem('tracked-items', JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('shopping-list-updated'));
      return true;
    }
    return false;
  } catch { return false; }
}

// ── checkIsProduct ──────────────────────────────────────────────
function checkIsProduct(url) {
  if (!url) return false;
  return url.includes('/s/') || url.includes('/products/') || url.includes('/p/');
}

// ── useSmartBrowser — ίδιο με Home.jsx ──────────────────────────
function useSmartBrowser() {
  const [state, setState]           = useState(null);
  const [currentUrl, setCurrentUrl] = useState('');
  const [isProduct, setIsProduct]   = useState(false);

  const open = async (url, opts = {}) => {
    setState({ url, label: opts.label || '', kidName: opts.kidName || '' });
    setCurrentUrl(url);
    setIsProduct(false);

    if (!Capacitor.isNativePlatform()) return;

    try { await PartialWebView.removeAllListeners(); } catch {}

    try {
      await PartialWebView.open({
        url,
        label:      opts.label      || '',
        kidName:    opts.kidName    || '',
        isWishlist: opts.isWishlist || false,
      });

      await PartialWebView.addListener('urlChanged', ({ url: u }) => {
        setCurrentUrl(u);
        setIsProduct(checkIsProduct(u));
      });

      await PartialWebView.addListener('pageLoaded', ({ url: u }) => {
        setCurrentUrl(u);
        setIsProduct(checkIsProduct(u));
      });

      await PartialWebView.addListener('saveRequested', ({ url: u, label: l, kidName: k }) => {
        saveUrlToList(u, l, k);
      });

      await PartialWebView.addListener('browserClosed', () => {
        setState(null);
        setIsProduct(false);
      });

    } catch (err) {
      console.error('PartialWebView error:', err);
      window.open(url, '_blank');
      setState(null);
    }
  };

  const close = async () => {
    try { await PartialWebView.close(); } catch {}
    setState(null);
    setIsProduct(false);
  };

  return { state, open, close, currentUrl, isProduct, isOpen: !!state };
}

// ── SmartBrowserSheet — ΙΔΙΑ με Home.jsx (bottom bar, 80px) ────
function SmartBrowserSheet({ browserState, currentUrl, isProduct, onClose, onSave, isWishlist = false }) {
  const [saved, setSaved] = useState(false);
  const { label, kidName, url } = browserState || {};

  const handleSave = () => {
    const urlToSave = currentUrl || url;
    const didSave = saveUrlToList(urlToSave, label, kidName);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    if (onSave) onSave(didSave);
  };

  const handleGoBack = async () => {
    try { await PartialWebView.goBack(); } catch {}
  };

  if (!browserState) return null;

  // ── Native: μπάρα ΚΑΤΩ — ίδια με Home ─────────────────────────
  if (Capacitor.isNativePlatform()) {
    return (
      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        height: 80,
        zIndex: 2147483647,
        background: 'linear-gradient(135deg,#0f0f1a,#1a1a2e)',
        borderTop: '2px solid #7c3aed',
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 16px',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.8)',
        pointerEvents: 'all',
      }}>
        {/* Back button */}
        <button onClick={handleGoBack} style={{
          background: 'rgba(255,255,255,0.12)', color: 'white',
          border: 'none', borderRadius: 10, padding: '10px 12px',
          fontSize: 16, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
        }}>‹</button>

        <div style={{
          width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
          background: isProduct ? '#34d399' : '#fbbf24',
          boxShadow: `0 0 10px ${isProduct ? '#34d399' : '#fbbf24'}`,
        }} />

        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, flex: 1, margin: 0, fontWeight: 700 }}>
          {isProduct ? '✅ Βρήκες προϊόν!' : '🔍 Βρες κάτι που σου αρέσει'}
        </p>

        {!isWishlist && (
          <button onClick={handleSave} style={{
            background: saved ? '#059669' : 'linear-gradient(135deg,#7c3aed,#a855f7)',
            color: 'white', border: 'none', borderRadius: 14,
            padding: '10px 16px', fontSize: 13, fontWeight: 900,
            cursor: 'pointer', flexShrink: 0,
            boxShadow: '0 3px 12px rgba(124,58,237,0.6)',
            transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {saved ? '✅' : '💾'}
            {saved ? 'Αποθηκεύτηκε!' : 'Αποθήκευση'}
          </button>
        )}

        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.15)', color: 'white',
          border: 'none', borderRadius: 12, padding: '10px 12px',
          fontSize: 14, fontWeight: 800, cursor: 'pointer', flexShrink: 0,
        }}>✕</button>
      </div>
    );
  }

  // ── Web: bottom sheet ──────────────────────────────────────────
  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,0.6)', display:'flex', flexDirection:'column', justifyContent:'flex-end' }} onClick={onClose}>
      <div style={{ background:'white', borderRadius:'20px 20px 0 0', height:'85vh', display:'flex', flexDirection:'column', overflow:'hidden' }} onClick={e=>e.stopPropagation()}>
        <div style={{ background:'#1a1a2e', padding:'10px 16px', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background: isProduct ? '#34d399' : '#fbbf24', flexShrink:0 }} />
          <p style={{ color:'rgba(255,255,255,0.7)', fontSize:10, margin:0, flex:1 }}>
            {isProduct ? '✅ Σελίδα προϊόντος' : '🔍 Αναζήτηση'}
          </p>
          {!isWishlist && (
            <button onClick={handleSave} style={{ background: saved ? '#059669' : 'linear-gradient(135deg,#7c3aed,#a855f7)', color:'white', border:'none', borderRadius:10, padding:'7px 14px', fontSize:11, fontWeight:800, cursor:'pointer' }}>
              {saved ? '✅ Αποθηκεύτηκε' : '💾 Αποθήκευση'}
            </button>
          )}
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.1)', color:'white', border:'none', borderRadius:8, padding:'7px 10px', cursor:'pointer' }}><X size={14} /></button>
        </div>
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8', fontSize:13, flexDirection:'column', gap:8 }}>
          <ExternalLink size={24} />
          <p style={{margin:0, fontWeight:700}}>Άνοιγμα στο browser</p>
          <button onClick={() => window.open(url, '_blank')} style={{ background:'#ff4d6d', color:'white', border:'none', borderRadius:12, padding:'10px 20px', fontWeight:800, cursor:'pointer', marginTop:4 }}>
            Άνοιγμα
          </button>
        </div>
      </div>
    </div>
  );
}

function estimateShoeSize(age) {
  if (age < 1) return '17'; if (age < 2) return '20'; if (age < 3) return '23';
  if (age < 4) return '26'; if (age < 5) return '28'; if (age < 6) return '30';
  if (age < 7) return '32'; if (age < 8) return '33'; if (age < 9) return '34';
  if (age < 10) return '35'; if (age < 11) return '36'; if (age < 12) return '37';
  return '38';
}

function estimateClothingSize(age) {
  if (age < 1) return '74';  if (age < 2) return '86';  if (age < 3) return '92';
  if (age < 4) return '104'; if (age < 5) return '110'; if (age < 6) return '116';
  if (age < 7) return '122'; if (age < 8) return '128'; if (age < 9) return '134';
  if (age < 10) return '140'; if (age < 11) return '146'; if (age < 12) return '152';
  return '158';
}

function buildKidQueries(kid) {
  const gender   = kid.gender === 'Αγόρι' ? 'αγόρι' : 'κορίτσι';
  const genderPl = kid.gender === 'Αγόρι' ? 'αγόρια' : 'κορίτσια';
  const age      = kid.age || 5;
  const isBaby   = age < 3;
  const isKid    = age >= 5;
  const char     = kid.favoriteCharacter || kid.favorite_character || '';
  const sport    = kid.favoriteSport || kid.favorite_sport || '';

  const shoeSize     = kid.shoeSize     || kid.shoe_size     || estimateShoeSize(age);
  const clothingSize = kid.clothingSize || kid.clothing_size || estimateClothingSize(age);

  if (isBaby) {
    return [
      { q: `βρεφικά ρούχα`,           category: 'baby_clothes',    label: '👶 Βρεφικά Ρούχα',         clothingSize },
      { q: `παπούτσια βρέφος`,         category: 'baby_shoes',      label: '🥿 Βρεφικά Παπούτσια',     shoeSize },
      { q: `βρεφικά είδη`,             category: 'baby_essentials', label: '🍼 Βρεφικά Είδη' },
      { q: `παιχνίδια βρέφους`,        category: 'baby_toys',       label: '🧸 Παιχνίδια Βρέφους' },
      { q: `καρότσι`,                  category: 'baby_gear',       label: '🛒 Καρότσια' },
      { q: `κάθισμα αυτοκινήτου`,      category: 'baby_safety',     label: '🚗 Καθίσματα Αυτοκινήτου' },
    ];
  }

  const queries = [
    // Παπούτσια: παιδικά παπούτσια + φύλο + νούμερο
    { q: `παιδικά παπούτσια ${gender} ${shoeSize}`,   category: 'shoes',    label: '👟 Παπούτσια',    shoeSize },
    // Μπλούζες: παιδικές μπλούζες
    { q: `παιδικές μπλούζες ${gender}`,               category: 'clothes',  label: '👕 Μπλούζες',     clothingSize },
    // Παντελόνια
    { q: `παιδικά παντελόνια ${gender}`,              category: 'clothes',  label: '👖 Παντελόνια',   clothingSize },
    // Παιχνίδια — με χαρακτήρα αν υπάρχει
    { q: char ? `παιχνίδια ${char} ${genderPl}` : `παιχνίδια ${genderPl}`, category: 'toys', label: '🧸 Παιχνίδια' },
  ];

  if (isKid) {
    queries.push(
      { q: `σχολική τσάντα ${gender}`,   category: 'school_bags',     label: '🎒 Σχολικές Τσάντες' },
      { q: `σχολικά είδη`,               category: 'school_supplies', label: '✏️ Γραφική Ύλη' }
    );
  }

  if (age >= 4) {
    // Αθλητικά
    queries.push({
      q: sport ? `${sport} παιδικό ${gender}` : `αθλητικά ${gender}`,
      category: 'sports', label: '⚽ Αθλητικά',
    });
  }

  if (age >= 3) {
    // Ποδήλατα & Πατίνια
    queries.push({ q: `ποδήλατο παιδικό`,  category: 'bikes', label: '🚲 Ποδήλατα & Πατίνια' });
    // Tablet
    queries.push({ q: `tablet παιδικό`,    category: 'tech',  label: '📱 Tablet & Tech' });
  }

  if (age >= 6) {
    // Gaming
    queries.push({ q: `gaming παιχνίδια`, category: 'gaming', label: '🎮 Gaming' });
  }

  return queries;
}

const CATEGORY_LABELS = {
  shoes:           '👟 Παπούτσια',
  clothes:         '👕 Ρούχα',
  toys:            '🧸 Παιχνίδια',
  school_bags:     '🎒 Σχολικές Τσάντες',
  school_supplies: '✏️ Γραφική Ύλη',
  sports:          '⚽ Αθλητικά',
  bikes:           '🚲 Ποδήλατα & Πατίνια',
  tech:            '📱 Tablet & Tech',
  gaming:          '🎮 Gaming',
  baby_clothes:    '👶 Βρεφικά Ρούχα',
  baby_shoes:      '🥿 Βρεφικά Παπούτσια',
  baby_essentials: '🍼 Βρεφικά Είδη',
  baby_toys:       '🧸 Παιχνίδια Βρέφους',
  baby_gear:       '🛒 Καρότσια',
  baby_safety:     '🚗 Καθίσματα Αυτοκινήτου',
  other:           '📦 Άλλα',
};

const Offers = () => {
  const { user, isAuthenticated } = useAuth();
  const [kids, setKids]                               = useState([]);
  const [selectedKid, setSelectedKid]                 = useState(null);
  const [offers, setOffers]                           = useState([]);
  const [filteredOffers, setFilteredOffers]           = useState([]);
  const [loading, setLoading]                         = useState(false);
  const [loadingProgress, setLoadingProgress]         = useState('');
  const [loadingStep, setLoadingStep]                 = useState({ current: 0, total: 0 });
  const [showFilters, setShowFilters]                 = useState(false);
  const [previewItem, setPreviewItem]                 = useState(null);
  const [activeCategory, setActiveCategory]           = useState('all');
  const [sortBy, setSortBy]                           = useState('score');
  const [priceRange, setPriceRange]                   = useState('all');
  const [availableCategories, setAvailableCategories] = useState([]);

  // Smart Browser
  const smartBrowser = useSmartBrowser();

  const openLink = (url, label = '') => {
    smartBrowser.open(url, { label, kidName: selectedKid?.name || '', isWishlist: false });
  };

  const handleOpenLink = openLink; // Alias for consistency

  const handleSaveFromBrowser = async (url, label, kidName) => {
    try {
      await saveToWishlistWithImage(
        { title: label, link: url, store: 'Skroutz' },
        { kidName, isAuthenticated, fromOffers: true }
      );
    } catch (error) {
      console.error('Failed to save:', error);
    }
  };

  function calcAge(birthDate) {
    if (!birthDate) return 5;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return Math.max(0, age);
  }

  async function loadKids() {
    try {
      let parsed = [];
      if (isAuthenticated) {
        parsed = await supabaseService.getKids();
      } else {
        const saved = localStorage.getItem('smart-kids-list');
        if (saved) parsed = JSON.parse(saved).map(k => ({
          ...k,
          shoeSize: k.shoeSize || k.shoe_size || '',
          clothingSize: k.clothingSize || k.clothing_size || '',
        }));
      }
      const withAge = parsed.map(k => ({ ...k, age: calcAge(k.birthdate || k.birthDate) }));
      setKids(withAge);
      if (withAge.length > 0 && !selectedKid) {
        setSelectedKid(withAge[0]);
        fetchOffers(withAge[0]);
      }
    } catch (e) {
      const saved = localStorage.getItem('smart-kids-list');
      if (saved) {
        const parsed = JSON.parse(saved).map(k => ({ ...k, age: calcAge(k.birthdate || k.birthDate) }));
        setKids(parsed);
        if (parsed.length > 0 && !selectedKid) { setSelectedKid(parsed[0]); fetchOffers(parsed[0]); }
      }
    }
  }

  // Φόρτωση kids on mount + όταν αλλάζει auth
  useEffect(() => { loadKids(); }, [isAuthenticated]);

  // Ακούμε αλλαγές από Profile (νέο παιδί / επεξεργασία)
  useEffect(() => {
    const handler = () => loadKids();
    window.addEventListener('kids-updated', handler);
    return () => window.removeEventListener('kids-updated', handler);
  }, [isAuthenticated, selectedKid]);

  const fetchOffers = async (kid) => {
    if (!kid) return;
    setLoading(true);
    setOffers([]);
    setFilteredOffers([]);
    setActiveCategory('all');

    const API_BASE = 'https://smart-kids-api.onrender.com';
    const queries  = buildKidQueries(kid);
    const allResults = [];
    const seenIds    = new Set();

    setLoadingStep({ current: 0, total: queries.length });

    for (let i = 0; i < queries.length; i++) {
      const qItem = queries[i];
      setLoadingProgress(qItem.label);
      setLoadingStep({ current: i + 1, total: queries.length });

      try {
        const skroutzFallback = `https://www.skroutz.gr/search?keyphrase=${encodeURIComponent(qItem.q)}`;
        const params = new URLSearchParams({
          q:              qItem.q,
          gender:         kid.gender,
          age:            kid.age,
          offersCategory: qItem.category,
          ...(qItem.shoeSize     && { shoeSize:     qItem.shoeSize }),
          ...(qItem.clothingSize && { clothingSize: qItem.clothingSize }),
        });

        // Timeout 10 δευτερόλεπτα ανά κατηγορία
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const res  = await fetch(`${API_BASE}/api/search?${params}`, {
          signal: controller.signal,
          headers: {
            'User-Agent': MOBILE_USER_AGENT
          }
        });
        clearTimeout(timeout);

        const data = await res.json();

        if (data.shopping_results?.length > 0) {
          data.shopping_results.slice(0, 5).forEach(item => {
            const id = item.product_id || item.title;
            if (!seenIds.has(id)) {
              seenIds.add(id);
              const productCard = createProductCardProps({
                id: id || Math.random(),
                title: item.title,
                store: item.source || 'Διάφορα',
                price: item.price || 'N/A',
                priceValue: item.priceValue || 0,
                thumbnail: item.thumbnail,
                link: item.buyLink || item.link,
                isAffiliate: item.isAffiliate || false,
                rating: item.rating,
                reviews: item.reviews || 0,
                finalScore: item.finalScore || 50,
                category: qItem.category,
                categoryLabel: qItem.label,
              });
              allResults.push(productCard);
            }
          });
        } else {
          // Fallback: πρόσθεσε multi-store cards
          const multiStoreResults = await searchMultipleStores(qItem.query || qItem.label, qItem.category);
          multiStoreResults.forEach(result => {
            const id = result.id;
            if (!seenIds.has(id)) {
              seenIds.add(id);
              allResults.push(result);
            }
          });
        }
      } catch (e) {
        // Αν timeout ή connection error — συνεχίζουμε στην επόμενη κατηγορία
        if (e.name === 'AbortError') {
          console.warn(`⏱️ Timeout for ${qItem.category} — skipping`);
        } else {
          console.warn(`⚠️ Error fetching ${qItem.category} — skipping`);
        }
      }
    }

    const cats = [...new Set(allResults.map(r => r.category))];
    setAvailableCategories(cats);
    setOffers(allResults);
    setFilteredOffers(allResults);
    setLoadingProgress('');
    setLoadingStep({ current: 0, total: 0 });
    setLoading(false);
  };

  useEffect(() => {
    if (offers.length === 0) return;
    let filtered = [...offers];
    if (activeCategory !== 'all') filtered = filtered.filter(i => i.category === activeCategory);
    if (priceRange !== 'all') {
      filtered = filtered.filter(i => {
        const p = i.priceValue || 0;
        if (priceRange === 'under20') return p > 0 && p < 20;
        if (priceRange === '20to50')  return p >= 20 && p <= 50;
        if (priceRange === 'over50')  return p > 50;
        return true;
      });
    }
    if      (sortBy === 'price_low')  filtered.sort((a, b) => (a.priceValue || 99999) - (b.priceValue || 99999));
    else if (sortBy === 'price_high') filtered.sort((a, b) => (b.priceValue || 0)     - (a.priceValue || 0));
    else if (sortBy === 'rating')     filtered.sort((a, b) => (b.rating     || 0)     - (a.rating     || 0));
    else                              filtered.sort((a, b) => (b.finalScore || 0)     - (a.finalScore || 0));
    setFilteredOffers(filtered);
  }, [offers, activeCategory, sortBy, priceRange]);

  const [wishlistToast, setWishlistToast] = useState(false);

  const addToWishlist = async (offer) => {
    if (offer.isSkroutzFallback) return; // μην προσθέτεις fallback cards
    try {
      console.log('💾 Offers: Saving with unified image extraction:', { title: offer.title });
      
      const item = {
        title: offer.title,
        price: offer.priceValue || 0,
        priceLabel: offer.price || '',
        thumbnail: offer.thumbnail || null,
        link: offer.link,
        store: offer.store || 'Skroutz',
        kidId: selectedKid?.id || null
      };

      // Use unified saving function with image extraction
      await saveToWishlistWithImage(item, { 
        kidName: selectedKid?.name || '', 
        isAuthenticated, 
        fromOffers: true 
      });
      
      // Ειδοποίηση Shopping σελίδας
      window.dispatchEvent(new CustomEvent('shopping-list-updated'));
      setWishlistToast(true);
      setTimeout(() => setWishlistToast(false), 2000);
    } catch (e) {
      console.error('addToWishlist error:', e);
    }
  };

  const hasActiveFilters = activeCategory !== 'all' || priceRange !== 'all' || sortBy !== 'score';
  const isBaby = (selectedKid?.age || 0) < 3;

  return (
    <div className={`max-w-md mx-auto min-h-screen bg-slate-50 ${smartBrowser.state ? 'pb-[108px]' : 'pb-28'}`}>

      {/* Wishlist toast */}
      {wishlistToast && (
        <div style={{
          position:'fixed', top:'calc(env(safe-area-inset-top) + 60px)',
          left:'50%', transform:'translateX(-50%)',
          background:'#059669', color:'white', padding:'10px 20px',
          borderRadius:14, fontSize:13, fontWeight:800, zIndex:300,
          boxShadow:'0 4px 20px rgba(5,150,105,0.4)', whiteSpace:'nowrap',
        }}>
          ✅ Προστέθηκε στη Λίστα!
        </div>
      )}

      {/* HEADER */}
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 px-5 pt-12 pb-6 rounded-b-[2rem] shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Tag size={24} /> Προσφορές
          </h1>
          <div className="flex gap-2">
            <button onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-xl active:scale-95 transition-all relative ${hasActiveFilters ? 'bg-white' : 'bg-white/20'}`}>
              <SlidersHorizontal size={18} className={hasActiveFilters ? 'text-amber-600' : 'text-white'} />
              {hasActiveFilters && <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-[8px] font-black text-white flex items-center justify-center">!</span>}
            </button>
            <button onClick={() => selectedKid && fetchOffers(selectedKid)} disabled={loading}
              className="bg-white/20 p-2 rounded-xl active:scale-95 transition-all disabled:opacity-50">
              <RefreshCw size={18} className={`text-white ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        {/* Kid selector — prev/next αντί για scroll για να μη συγκρούεται με page swipe */}
        {kids.length > 0 && (
          <div className="flex items-center gap-2">
            {kids.length > 1 && (
              <button
                onClick={() => {
                  const idx = kids.findIndex(k => k.id === selectedKid?.id);
                  const prev = kids[(idx - 1 + kids.length) % kids.length];
                  setSelectedKid(prev); fetchOffers(prev);
                }}
                className="w-8 h-8 rounded-xl bg-white/20 text-white text-lg font-black flex items-center justify-center shrink-0 active:scale-90">
                ‹
              </button>
            )}
            <div className="flex-1 flex items-center gap-3 bg-white/20 rounded-xl px-4 py-2">
              <span className="text-xl">{selectedKid?.avatar}</span>
              <div className="flex-1">
                <p className="text-white font-black text-sm leading-none">{selectedKid?.name}</p>
                <p className="text-white/70 text-[10px] mt-0.5">
                  {selectedKid?.age} ετών
                  {selectedKid?.shoeSize && ` · 👟 ${selectedKid.shoeSize}`}
                  {selectedKid?.clothingSize && ` · 👕 ${selectedKid.clothingSize}`}
                </p>
              </div>
              {kids.length > 1 && (
                <span className="text-white/50 text-[10px] font-bold">
                  {kids.findIndex(k=>k.id===selectedKid?.id)+1}/{kids.length}
                </span>
              )}
            </div>
            {kids.length > 1 && (
              <button
                onClick={() => {
                  const idx = kids.findIndex(k => k.id === selectedKid?.id);
                  const next = kids[(idx + 1) % kids.length];
                  setSelectedKid(next); fetchOffers(next);
                }}
                className="w-8 h-8 rounded-xl bg-white/20 text-white text-lg font-black flex items-center justify-center shrink-0 active:scale-90">
                ›
              </button>
            )}
          </div>
        )}
      </div>

      {/* FILTERS */}
      {showFilters && (
        <div className="mx-4 mt-3 bg-white rounded-2xl shadow-lg border border-slate-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-sm">Φίλτρα</h3>
            <div className="flex gap-2">
              {hasActiveFilters && <button onClick={() => { setActiveCategory('all'); setPriceRange('all'); setSortBy('score'); }} className="text-xs text-rose-500 font-bold">Καθαρισμός</button>}
              <button onClick={() => setShowFilters(false)}><X size={18} className="text-slate-400" /></button>
            </div>
          </div>
          <div className="mb-3">
            <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wide">Τιμή</label>
            <div className="grid grid-cols-4 gap-1.5">
              {[{v:'all',l:'Όλα'},{v:'under20',l:'<20€'},{v:'20to50',l:'20-50€'},{v:'over50',l:'>50€'}].map(o => (
                <button key={o.v} onClick={() => setPriceRange(o.v)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${priceRange === o.v ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {o.l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wide">Ταξινόμηση</label>
            <div className="grid grid-cols-2 gap-1.5">
              {[{v:'score',l:'🏆 Καλύτερα'},{v:'price_low',l:'💰 Φθηνότερα'},{v:'price_high',l:'💎 Ακριβότερα'},{v:'rating',l:'⭐ Αξιολόγηση'}].map(o => (
                <button key={o.v} onClick={() => setSortBy(o.v)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${sortBy === o.v ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {o.l}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="px-4 mt-4">

        {/* LOADING */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 size={44} className="animate-spin text-amber-500" />
            <div className="text-center">
              <p className="text-slate-700 font-black text-sm mb-1">Ψάχνω {loadingProgress}</p>
              <p className="text-slate-400 text-xs">{loadingStep.current}/{loadingStep.total} κατηγορίες για {selectedKid?.name}</p>
            </div>
            <div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full transition-all duration-300"
                style={{ width: loadingStep.total > 0 ? `${(loadingStep.current / loadingStep.total) * 100}%` : '0%' }} />
            </div>
          </div>
        )}

        {/* CATEGORY TABS */}
        {!loading && offers.length > 0 && (
          <>
            <div
              className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-3"
              onTouchStart={e => e.stopPropagation()}
              onTouchMove={e => e.stopPropagation()}
              onTouchEnd={e => e.stopPropagation()}
            >
              <button onClick={() => setActiveCategory('all')}
                className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap shrink-0 transition-all ${activeCategory === 'all' ? 'bg-amber-500 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
                Όλα ({offers.length})
              </button>
              {availableCategories.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap shrink-0 transition-all ${activeCategory === cat ? 'bg-amber-500 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
                  {CATEGORY_LABELS[cat] || cat} ({offers.filter(o => o.category === cat).length})
                </button>
              ))}
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-4 py-3 mb-3 flex items-center gap-3">
              <div className="bg-amber-100 p-2 rounded-xl"><Flame size={18} className="text-amber-600" /></div>
              <div className="flex-1">
                <p className="text-xs font-black text-slate-800">{filteredOffers.length} προϊόντα για {selectedKid?.name}</p>
                <p className="text-[10px] text-slate-400">
                  {isBaby
                    ? `👶 ${selectedKid?.age === 0 ? '<1' : selectedKid?.age} ετών · 👗 ${selectedKid?.clothingSize || selectedKid?.clothing_size || estimateClothingSize(selectedKid?.age || 0)}`
                    : `👟 Νο ${selectedKid?.shoeSize || selectedKid?.shoe_size || estimateShoeSize(selectedKid?.age || 5)} · 👕 ${selectedKid?.clothingSize || selectedKid?.clothing_size || estimateClothingSize(selectedKid?.age || 5)}`}
                  {(selectedKid?.shoeSize || selectedKid?.shoe_size) ? ' ✅ Από προφίλ' : ' · Εκτίμηση'}
                </p>
              </div>
            </div>
          </>
        )}

        {/* EMPTY FILTERED */}
        {!loading && filteredOffers.length === 0 && offers.length > 0 && (
          <div className="bg-white rounded-2xl p-8 text-center">
            <p className="text-slate-400 font-bold mb-3">Κανένα αποτέλεσμα με αυτά τα φίλτρα</p>
            <button onClick={() => { setActiveCategory('all'); setPriceRange('all'); }}
              className="bg-amber-500 text-white px-5 py-2.5 rounded-xl text-xs font-black">
              Καθαρισμός φίλτρων
            </button>
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && offers.length === 0 && (
          <div className="bg-white rounded-2xl p-10 text-center border-2 border-dashed border-slate-200">
            <AlertCircle size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-400 font-bold mb-4">Δεν βρέθηκαν προσφορές</p>
            <button onClick={() => selectedKid && fetchOffers(selectedKid)}
              className="bg-amber-500 text-white px-6 py-3 rounded-xl font-bold text-sm active:scale-95 transition-all">
              Δοκίμασε ξανά
            </button>
          </div>
        )}

        {/* OLD PREVIEW MODAL - REMOVED */}
        {/* Now using UnifiedModal below */}

        {/* PRODUCTS */}
        {!loading && filteredOffers.length > 0 && (
          <div className="space-y-3">
            {filteredOffers.map(offer => (
              <div key={offer.id} className={`bg-white rounded-3xl p-4 shadow-sm border-2 flex gap-3 ${offer.isSkroutzFallback ? 'border-orange-200 bg-orange-50' : 'border-slate-100'}`}>

                {offer.isSkroutzFallback ? (
                  /* Skroutz fallback card */
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center shrink-0 text-2xl">🛍️</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-800 text-[12px] mb-1">{offer.categoryLabel}</p>
                      <p className="text-[10px] text-slate-500 mb-2">Δες τα καλύτερα αποτελέσματα στο Skroutz</p>
                      <button onClick={() => openLink(offer.link, offer.title)}
                        className="bg-orange-500 text-white px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-1.5 active:scale-95 transition-transform">
                        <ExternalLink size={10} /> Άνοιξε στο Skroutz
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Normal product card */
                  <>
                    <div className="w-20 h-20 rounded-2xl bg-slate-100 shrink-0 overflow-hidden flex items-center justify-center cursor-pointer active:scale-95 transition-transform" onClick={() => offer.thumbnail && openLink(offer.link, offer.title)}>
                      {offer.thumbnail ? (
                        <img 
                          src={offer.thumbnail} 
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                          crossOrigin="anonymous"
                          referrerPolicy="no-referrer"
                          onError={e => {
                            e.target.style.display = 'none';
                            // Εμφάνιση emoji fallback
                            const emoji = offer.category?.includes('shoes') ? '👟'
                              : offer.category?.includes('clothes') || offer.category?.includes('baby_cloth') ? '👕'
                              : offer.category?.includes('toys')   || offer.category?.includes('baby_toy')   ? '🧸'
                              : offer.category?.includes('bikes')  ? '🚲'
                              : offer.category?.includes('tech')   ? '📱'
                              : offer.category?.includes('gaming') ? '🎮'
                              : offer.category?.includes('school') ? '🎒'
                              : offer.category?.includes('sports') ? '⚽'
                              : offer.category?.includes('baby_gear')   ? '🛒'
                              : offer.category?.includes('baby_safety') ? '🚗'
                              : offer.category?.includes('baby')   ? '👶'
                              : '🛍️';
                            e.target.parentNode.innerHTML = `<span style="font-size:2.2rem">${emoji}</span>`;
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: '2.2rem' }}>
                          {offer.category?.includes('shoes') ? '👟'
                            : offer.category?.includes('clothes') ? '👕'
                            : offer.category?.includes('toys') ? '🧸'
                            : offer.category?.includes('bikes') ? '🚲'
                            : offer.category?.includes('tech') ? '📱'
                            : offer.category?.includes('gaming') ? '🎮'
                            : offer.category?.includes('school') ? '🎒'
                            : offer.category?.includes('sports') ? '⚽'
                            : offer.category?.includes('baby') ? '�'
                            : '🛍️'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 text-[11px] leading-tight line-clamp-2 mb-1.5">{offer.title}</p>
                      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                        <span className="text-[8px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">{offer.categoryLabel}</span>
                        <span className="text-[8px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                          {offer.storeIcon || '🛒'} {offer.store}
                        </span>
                        {offer.rating && (
                          <div className="flex items-center gap-0.5 bg-amber-50 px-1.5 py-0.5 rounded-md">
                            <Star size={8} className="fill-amber-400 text-amber-400" />
                            <span className="text-[8px] font-bold text-amber-700">{offer.rating}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-rose-600 font-black text-base">{offer.price}</span>
                        <div className="flex gap-1.5">
                          <button onClick={() => addToWishlist(offer)}
                            className="p-2.5 bg-slate-900 text-white rounded-xl active:scale-90 transition-transform">
                            <ShoppingCart size={14} />
                          </button>
                          <div className="flex flex-col items-end gap-1">
                            {hasAffiliateProgram(offer.link) && (
                              <span className="text-[7px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-md">
                                ✓ Verified
                              </span>
                            )}
                            <button onClick={() => openLink(offer.link, offer.title)}
                              className="bg-amber-500 text-white px-3 py-2 rounded-xl text-[9px] font-black uppercase flex items-center gap-1 active:scale-90 transition-transform">
                              ΑΓΟΡΑ <ExternalLink size={9} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

              </div>
            ))}
          </div>
        )}
      </div>

      {/* SmartBrowserSheet */}
      <SmartBrowserSheet
        browserState={smartBrowser.state}
        currentUrl={smartBrowser.currentUrl}
        isProduct={smartBrowser.isProduct}
        onClose={smartBrowser.close}
        isWishlist={false}
      />
    </div>
  );
};

export default Offers;