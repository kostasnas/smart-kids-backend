import React, { useState, useEffect, useCallback } from 'react';
import { useStreamingOffers } from './hooks/useStreamingOffers';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { useAuth } from './components/AuthProvider';
import SearchSourceModal from './components/SearchSourceModal';
import { supabaseService } from './services/supabase';
import { toAffiliateLink, hasAffiliateProgram } from './services/linkwise';
import { saveToWishlistWithImage } from './utils/imageExtractor';
import {
  Tag, Flame, ExternalLink, RefreshCw, Loader2,
  AlertCircle, SlidersHorizontal, X, Star, ShoppingCart
} from 'lucide-react';
import { registerPlugin } from '@capacitor/core';
import { createProductCardProps, MOBILE_USER_AGENT } from './services/multiStoreSearch';

// Register the PartialWebView plugin
const PartialWebView = registerPlugin('PartialWebView');

// ── Helpers ──────────────────────────────────────────────
function skroutzUrl(query) {
  return `https://www.skroutz.gr/search?keyphrase=${encodeURIComponent(query)}`;
}

function checkIsProduct(url) {
  if (!url) return false;
  return url.includes('/s/') || url.includes('/products/') || url.includes('/p/');
}

function saveUrlToList(url, label, kidName) {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    const store = hostname.includes('skroutz') ? 'Skroutz' : hostname;

    const item = {
      id: Date.now(),
      title: label || `Προϊόν από ${store}`,
      price: 0, priceLabel: '',
      thumbnail: null,
      link: url,
      store,
      kidName: kidName || '',
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

// ── Hooks ────────────────────────────────────────────────
function useSmartBrowser() {
  const [state, setState]           = useState(null);
  const [currentUrl, setCurrentUrl] = useState('');
  const [isProduct, setIsProduct]   = useState(false);

  const open = async (url, opts = {}) => {
    setState({ url, label: opts.label || '', kidName: opts.kidName || '' });
    setCurrentUrl(url);
    setIsProduct(false);

    if (!Capacitor.isNativePlatform()) return;

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

// ── Logic Helpers ────────────────────────────────────────
function estimateShoeSize(age) {
  if (age < 1) return '17'; if (age < 2) return '20'; if (age < 3) return '23';
  if (age < 4) return '26'; if (age < 5) return '28'; if (age < 6) return '30';
  if (age < 7) return '32'; if (age < 8) return '33'; if (age < 9) return '34';
  return '35';
}

function estimateClothingSize(age) {
  if (age < 1) return '74';  if (age < 2) return '86';  if (age < 3) return '92';
  if (age < 5) return '110'; if (age < 7) return '122'; if (age < 9) return '134';
  return '140';
}

function buildKidQueries(kid) {
  const gender   = kid.gender === 'Αγόρι' ? 'αγόρι' : 'κορίτσι';
  const age      = kid.age || 5;
  const shoeSize     = kid.shoeSize     || kid.shoe_size     || estimateShoeSize(age);
  const clothingSize = kid.clothingSize || kid.clothing_size || estimateClothingSize(age);

  return [
    { q: `παιδικά παπούτσια ${gender} ${shoeSize}`,   category: 'shoes',    label: '👟 Παπούτσια',    shoeSize },
    { q: `παιδικές μπλούζες ${gender}`,               category: 'clothes',  label: '👕 Ρούχα',        clothingSize },
    { q: `παιχνίδια ${gender}`,                       category: 'toys',     label: '🧸 Παιχνίδια' },
    { q: `σχολική τσάντα ${gender}`,                  category: 'school_bags', label: '🎒 Σχολικά' }
  ];
}

const CATEGORY_LABELS = {
  shoes: '👟 Παπούτσια',
  clothes: '👕 Ρούχα',
  toys: '🧸 Παιχνίδια',
  school_bags: '🎒 Σχολικά',
  baby_clothes: '👶 Βρεφικά',
};


// ── Component ────────────────────────────────────────────
const Offers = () => {
  const { user, isAuthenticated } = useAuth();
  const [kids, setKids] = useState([]);
  const [selectedKid, setSelectedKid] = useState(null);
  
  // States για φίλτρα και UI
  
  const [showFilters, setShowFilters] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortBy, setSortBy] = useState('score');
  const [priceRange, setPriceRange] = useState('all');
  const [searchSource, setSearchSource] = useState('linkwise'); // Προεπιλογή Linkwise
const cancelStream = () => clearItems();
const [showSearchSourceModal, setShowSearchSourceModal] = useState(false);
  // 1. Χρήση του Streaming Hook
  // ΠΡΟΣΟΧΗ: Βάλε το URL του Render σου εδώ αν δεν το έχεις κάνει στο hook
  const {
    items: streamItems,
    loading: streamLoading,
    error: streamError,
    progress: streamProgress,
    isStreaming,
    fetchStream,
    clearItems,
  } = useStreamingOffers('https://smart-kids-api.onrender.com');

  // 2. Computed τιμές από το stream (ΜΙΑ ΦΟΡΑ)
  const offers = streamItems;
  const loading = streamLoading || isStreaming;
  const loadingProgress = streamProgress?.label || "Περίμενε...";
  const loadingStep = { 
    current: streamProgress?.current || 0, 
    total: streamProgress?.total || 4 
  };

  const openLink = (url, label = '') => {
    if (window.smartBrowser) {
      window.smartBrowser.open(url, { label, kidName: selectedKid?.name || '', isWishlist: false });
    } else {
      window.open(url, '_blank');
    }
  };

  // 3. Η διορθωμένη fetchOffers
  const fetchOffers = async (kid) => {
    if (!kid) return;
    
    // Καθαρίζουμε τα παλιά αποτελέσματα
    clearItems();
    setActiveCategory('all');

    const queries = buildKidQueries(kid);
    
    // Κλήση του streaming
    try {
      await fetchStream(queries);
    } catch (err) {
      console.error("Failed to fetch stream:", err);
    }
  };

  // ... το υπόλοιπο component

  // Profile Data Loading
  async function loadKids() {
    try {
      let parsed = [];
      if (isAuthenticated) {
        parsed = await supabaseService.getKids();
      } else {
        const saved = localStorage.getItem('smart-kids-list');
        if (saved) parsed = JSON.parse(saved);
      }
      const withAge = parsed.map(k => ({ ...k, age: 5 })); // Simplified for example
      setKids(withAge);
      if (withAge.length > 0 && !selectedKid) setSelectedKid(withAge[0]);
    } catch (e) { console.error(e); }
  }

  useEffect(() => { loadKids(); }, [isAuthenticated]);

  const addToWishlist = async (offer) => {
    try {
      const item = {
        title: offer.title,
        price: offer.priceValue || 0,
        priceLabel: offer.price || '',
        thumbnail: offer.thumbnail || null,
        link: offer.link,
        store: offer.store || 'Skroutz',
      };
      await saveToWishlistWithImage(item, { kidName: selectedKid?.name, isAuthenticated, fromOffers: true });
      setWishlistToast(true);
      setTimeout(() => setWishlistToast(false), 2000);
    } catch (e) { console.error(e); }
  };

  // Filter Logic
  const filteredOffers = offers.filter(offer => {
    if (activeCategory !== 'all' && offer.category !== activeCategory) return false;
    if (priceRange !== 'all') {
      const p = offer.priceValue || 0;
      if (priceRange === 'under20') return p < 20;
      if (priceRange === '20to50') return p >= 20 && p <= 50;
      if (priceRange === 'over50') return p > 50;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'price_low') return a.priceValue - b.priceValue;
    if (sortBy === 'price_high') return b.priceValue - a.priceValue;
    return b.finalScore - a.finalScore;
  });

  const availableCategories = [...new Set(offers.map(o => o.category))];

  return (
   <div className={`max-w-md mx-auto min-h-screen bg-slate-50 ${smartBrowser.isOpen ? 'pb-[108px]' : 'pb-28'}`}>
      
      {/* 3. Floating Progress Bar */}
      {loading && (
        <div className="fixed bottom-24 left-4 right-4 z-50 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full px-4 py-3 shadow-xl max-w-md mx-auto">
          <div className="flex items-center justify-between text-white text-sm">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span className="font-bold">{loadingStep.current}/{loadingStep.total}</span>
            </div>
            <span className="font-medium text-xs truncate flex-1 text-center px-2">
              {loadingProgress || 'Φόρτωση...'}
            </span>
            <button onClick={cancelStream} className="text-white/70 hover:text-white">
              <X size={16} />
            </button>
          </div>
          <div className="mt-2 h-1 bg-white/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${(loadingStep.current / loadingStep.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 px-5 pt-12 pb-6 rounded-b-[2rem] shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Tag size={24} /> Προσφορές
          </h1>
          <div className="flex gap-2">
            <button onClick={() => setShowFilters(!showFilters)} className="p-2 rounded-xl bg-white/20">
              <SlidersHorizontal size={18} className="text-white" />
            </button>
            <button onClick={() => selectedKid && fetchOffers(selectedKid)} disabled={loading} className="bg-white/20 p-2 rounded-xl">
              <RefreshCw size={18} className={`text-white ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        
        {/* Kid Selector */}
        {kids.length > 0 && (
          <div className="flex items-center gap-3 bg-white/20 rounded-xl px-4 py-2">
            <span className="text-xl">{selectedKid?.avatar}</span>
            <div className="flex-1">
              <p className="text-white font-black text-sm">{selectedKid?.name}</p>
            </div>
          </div>
        )}
      </div>

      {/* ERROR DISPLAY */}
      {streamError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mx-4 mt-4">
          <p className="text-red-600 text-sm font-medium">⚠️ {streamError}</p>
          <button onClick={() => fetchOffers(selectedKid)} className="mt-2 text-red-600 text-xs font-bold underline">
            Δοκίμασε ξανά
          </button>
        </div>
      )}

      {/* CONTENT */}
      <div className="px-4 mt-4">
        {/* Category Tabs */}
        {!loading && offers.length > 0 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-3">
            <button onClick={() => setActiveCategory('all')} className={`px-4 py-2 rounded-xl text-xs font-black shrink-0 ${activeCategory === 'all' ? 'bg-amber-500 text-white' : 'bg-white text-slate-600'}`}>
              Όλα ({offers.length})
            </button>
            {availableCategories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded-xl text-xs font-black shrink-0 ${activeCategory === cat ? 'bg-amber-500 text-white' : 'bg-white text-slate-600'}`}>
                {CATEGORY_LABELS[cat] || cat}
              </button>
            ))}
          </div>
        )}

        {/* Product List */}
        <div className="space-y-3">
          {filteredOffers.map(offer => (
            <div key={offer.id} className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 flex gap-3">
              <div className="w-20 h-20 rounded-2xl bg-slate-100 shrink-0 overflow-hidden flex items-center justify-center" onClick={() => openLink(offer.link, offer.title)}>
                {offer.thumbnail ? <img src={offer.thumbnail} alt="" className="w-full h-full object-cover" /> : <span>🛍️</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 text-[11px] line-clamp-2 mb-1">{offer.title}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-rose-600 font-black text-base">{offer.price}</span>
                  <div className="flex gap-2">
                    <button onClick={() => addToWishlist(offer)} className="p-2 bg-slate-900 text-white rounded-lg">
                      <ShoppingCart size={14} />
                    </button>
                    <button onClick={() => openLink(offer.link, offer.title)} className="bg-amber-500 text-white px-3 py-1.5 rounded-lg text-[9px] font-black">
                      ΑΓΟΡΑ
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {!loading && offers.length === 0 && (
          <div className="py-20 text-center">
            <AlertCircle size={40} className="mx-auto text-slate-300 mb-2" />
            <p className="text-slate-400 font-bold">Πάτα ανανέωση για προσφορές</p>
          </div>
        )}
      </div>

      <SearchSourceModal
        isOpen={showSearchSourceModal}
        onSelectSource={(source) => {
          setSearchSource(source);
          setShowSearchSourceModal(false);
          if (selectedKid) fetchOffers(selectedKid);
        }}
        onClose={() => setShowSearchSourceModal(false)}
      />
    </div>
  );
};

export default Offers;