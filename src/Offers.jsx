import React, { useState, useEffect } from 'react';
import { useStreamingOffers } from './hooks/useStreamingOffers';
import { Capacitor } from '@capacitor/core';
import { useAuth } from './components/AuthProvider';
import SearchSourceModal from './components/SearchSourceModal';
import { supabaseService } from './services/supabase';
import { saveToWishlistWithImage } from './utils/imageExtractor';
import {
  Tag, RefreshCw, AlertCircle, SlidersHorizontal, X, ShoppingCart
} from 'lucide-react';
import { registerPlugin } from '@capacitor/core';

const PartialWebView = registerPlugin('PartialWebView');

// ── Helpers ──────────────────────────────────────────────
function checkIsProduct(url) {
  if (!url) return false;
  return url.includes('/s/') || url.includes('/products/') || url.includes('/p/');
}

// ── Hooks ────────────────────────────────────────────────
function useSmartBrowser() {
  const [state, setState]           = useState(null);
  const [currentUrl, setCurrentUrl] = useState('');
  const [isProduct, setIsProduct]   = useState(false);

  const open = async (url, opts = {}) => {
    setState({ url, label: opts.label || '', kidName: opts.kidName || '' });
    setCurrentUrl(url);
    if (!Capacitor.isNativePlatform()) {
      window.open(url, '_blank');
      return;
    }
    try {
      await PartialWebView.open({ url, label: opts.label || '', kidName: opts.kidName || '' });
    } catch (err) { window.open(url, '_blank'); }
  };

  const close = async () => {
    try { await PartialWebView.close(); } catch {}
    setState(null);
  };

  return { state, open, close, currentUrl, isProduct, isOpen: !!state };
}

function estimateShoeSize(age) {
  if (age < 1) return '17'; if (age < 2) return '20'; if (age < 3) return '23';
  if (age < 5) return '28'; if (age < 7) return '32'; return '35';
}

function buildKidQueries(kid) {
  const gender = kid.gender === 'Αγόρι' ? 'αγόρι' : 'κορίτσι';
  const age = kid.age || 5;
  const shoeSize = kid.shoeSize || estimateShoeSize(age);
  return [
    { q: `παιδικά παπούτσια ${gender} ${shoeSize}`, category: 'shoes', label: '👟 Παπούτσια' },
    { q: `παιχνίδια ${gender}`, category: 'toys', label: '🧸 Παιχνίδια' }
  ];
}

const CATEGORY_LABELS = { shoes: '👟 Παπούτσια', clothes: '👕 Ρούχα', toys: '🧸 Παιχνίδια' };

const Offers = () => {
  const { user, isAuthenticated } = useAuth();
  const [kids, setKids] = useState([]);
  const [selectedKid, setSelectedKid] = useState(null);
  const smartBrowser = useSmartBrowser();
  
  const [showFilters, setShowFilters] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortBy, setSortBy] = useState('score');
  const [priceRange, setPriceRange] = useState('all');
  const [showSearchSourceModal, setShowSearchSourceModal] = useState(false);

  const {
    items: offers,
    loading: streamLoading,
    error: streamError,
    progress: streamProgress,
    isStreaming,
    fetchStream,
    clearItems,
  } = useStreamingOffers('https://smart-kids-api.onrender.com');

  const loading = streamLoading || isStreaming;
  const loadingProgress = streamProgress?.label || "Περίμενε...";
  const loadingStep = { current: streamProgress?.current || 0, total: streamProgress?.total || 2 };

  const openLink = (url, label = '') => {
    smartBrowser.open(url, { label, kidName: selectedKid?.name || '' });
  };

  const fetchOffers = async (kid) => {
    if (!kid) return;
    clearItems();
    setActiveCategory('all');
    try { await fetchStream(buildKidQueries(kid)); } catch (err) { console.error(err); }
  };

  useEffect(() => {
    async function loadKids() {
      let parsed = [];
      if (isAuthenticated) parsed = await supabaseService.getKids();
      else {
        const saved = localStorage.getItem('smart-kids-list');
        if (saved) parsed = JSON.parse(saved);
      }
      setKids(parsed);
      if (parsed.length > 0 && !selectedKid) setSelectedKid(parsed[0]);
    }
    loadKids();
  }, [isAuthenticated]);

  const addToWishlist = async (offer) => {
    const item = { title: offer.title, price: offer.priceValue || 0, priceLabel: offer.price || '', thumbnail: offer.thumbnail, link: offer.link };
    await saveToWishlistWithImage(item, { kidName: selectedKid?.name, isAuthenticated, fromOffers: true });
  };

  // Η ΜΟΝΑΔΙΚΗ ΔΗΛΩΣΗ ΤΟΥ filteredOffers
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
      {loading && (
        <div className="fixed bottom-24 left-4 right-4 z-50 bg-orange-500 rounded-full px-4 py-3 shadow-xl">
          <div className="flex items-center justify-between text-white text-sm">
            <span>{loadingStep.current}/{loadingStep.total} {loadingProgress}</span>
            <button onClick={() => clearItems()}><X size={16} /></button>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-amber-500 to-orange-600 px-5 pt-12 pb-6 rounded-b-[2rem] shadow-xl text-white">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-black flex items-center gap-2"><Tag /> Προσφορές</h1>
          <button onClick={() => selectedKid && fetchOffers(selectedKid)} className="p-2 bg-white/20 rounded-xl">
            <RefreshCw className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        {selectedKid && <div className="bg-white/20 rounded-xl px-4 py-2">{selectedKid.avatar} {selectedKid.name}</div>}
      </div>

      <div className="px-4 mt-4">
        {!loading && offers.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button onClick={() => setActiveCategory('all')} className={`px-4 py-2 rounded-xl text-xs font-black ${activeCategory === 'all' ? 'bg-amber-500 text-white' : 'bg-white'}`}>Όλα</button>
            {availableCategories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded-xl text-xs font-black ${activeCategory === cat ? 'bg-amber-500 text-white' : 'bg-white'}`}>{CATEGORY_LABELS[cat] || cat}</button>
            ))}
          </div>
        )}

        <div className="space-y-3 mt-4">
          {filteredOffers.map(offer => (
            <div key={offer.id} className="bg-white rounded-3xl p-4 shadow-sm flex gap-3">
              <img src={offer.thumbnail} className="w-20 h-20 rounded-2xl object-cover" onClick={() => openLink(offer.link)} />
              <div className="flex-1">
                <p className="font-bold text-[11px] line-clamp-2">{offer.title}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-rose-600 font-black">{offer.price}</span>
                  <div className="flex gap-2">
                    <button onClick={() => addToWishlist(offer)} className="p-2 bg-slate-900 text-white rounded-lg"><ShoppingCart size={14} /></button>
                    <button onClick={() => openLink(offer.link)} className="bg-amber-500 text-white px-3 py-1.5 rounded-lg text-[9px] font-black">ΑΓΟΡΑ</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Offers;