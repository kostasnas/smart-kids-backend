import React, { useState, useEffect, useRef } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { useAuth } from './components/AuthProvider';
import { supabaseService } from './services/supabase';
import { saveToWishlistWithImage } from './utils/imageExtractor';
import {
  Bot, Send, X, Sparkles, ExternalLink, Loader2, Trash2,
  Settings, User, LogOut, ChevronRight, ShoppingBasket, ChevronDown
} from 'lucide-react';
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

    if (!Capacitor.isNativePlatform()) return; // web: SmartBrowserSheet shows iframe

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
// isWishlist=true → δεν δείχνει κουμπί Αποθήκευση
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
        {/* Back button — πλοήγηση μέσα στον browser */}
        <button onClick={handleGoBack} style={{
          background: 'rgba(255,255,255,0.12)', color: 'white',
          border: 'none', borderRadius: 10, padding: '10px 12px',
          fontSize: 16, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
        }}>‹</button>

        {/* Dot indicator */}
        <div style={{
          width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
          background: isProduct ? '#34d399' : '#fbbf24',
          boxShadow: `0 0 10px ${isProduct ? '#34d399' : '#fbbf24'}`,
        }} />

        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, flex: 1, margin: 0, fontWeight: 700 }}>
          {isProduct ? '✅ Βρήκες προϊόν!' : '🔍 Βρες κάτι που σου αρέσει'}
        </p>

        {/* Αποθήκευση — κρυμμένο στο wishlist */}
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

        {/* Κλείσιμο */}
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.15)', color: 'white',
          border: 'none', borderRadius: 12, padding: '10px 12px',
          fontSize: 14, fontWeight: 800, cursor: 'pointer', flexShrink: 0,
        }}>✕</button>
      </div>
    );
  }

  // ── Web: iframe bottom sheet (για testing) ─────────────────────
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

async function getMultiStoreUrl(query, category = 'all') {
  try {
    const results = await searchMultipleStores(query, category);
    // Return the first result (usually Skroutz)
    return results[0]?.link || `https://www.skroutz.gr/search?keyphrase=${encodeURIComponent(query)}`;
  } catch (error) {
    console.warn('Multi-store search failed, falling back to Skroutz:', error);
    return `https://www.skroutz.gr/search?keyphrase=${encodeURIComponent(query)}`;
  }
}

function skroutzUrl(query) {
  return `https://www.skroutz.gr/search?keyphrase=${encodeURIComponent(query)}`;
}

async function openLink(url) {
  if (Capacitor.isNativePlatform()) await Browser.open({ url });
  else window.open(url, '_blank');
}

// Διορθώνει ελληνικά ονόματα προϊόντων για καλύτερα Skroutz αποτελέσματα
function fixGreekProductQuery(query) {
  return query
    .replace(/παπούτσια παραλίας/gi, 'παπούτσια θαλάσσης')
    .replace(/παπούτσια θαλάσσης/gi, 'παπούτσια θαλάσσης')
    .replace(/παπούτσια beach/gi, 'παπούτσια θαλάσσης')
    .replace(/aqua shoes/gi, 'παπούτσια θαλάσσης')
    .replace(/μαγιό κολύμβησης/gi, 'μαγιό κολύμβηση')
    .replace(/αθλητικά ρούχα/gi, 'αθλητικά παιδικά ρούχα');
}

async function saveToList(suggestion, kidName, isAuthenticated) {
  const query = fixGreekProductQuery(suggestion.query || suggestion.name);
  
  try {
    console.log('💾 AI Advisor: Saving with unified image extraction:', { suggestion: suggestion.name, kidName, query });
    
    const item = {
      title: suggestion.name,
      price: 0,
      priceLabel: suggestion.priceLabel || '',
      thumbnail: suggestion.thumbnail || null,
      link: skroutzUrl(query),
      store: 'Skroutz',
      query: query
    };

    // Use unified saving function with image extraction
    await saveToWishlistWithImage(item, { kidName, isAuthenticated, fromAI: true });
    
    window.dispatchEvent(new CustomEvent('shopping-list-updated'));
    return true;
  } catch (error) {
    console.error('💾 AI Advisor: Failed to save to wishlist:', error);
    return false;
  }
}

function MessageBubble({ msg, kidName, onSaved, openLink }) {
  const [saved, setSaved]   = useState({});
  const [saving, setSaving] = useState({});

  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div style={{
          background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
          borderRadius: '20px 20px 4px 20px',
          padding: '12px 16px', maxWidth: '80%',
          boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
        }}>
          <p style={{ color: 'white', fontSize: 14, lineHeight: 1.5, margin: 0 }}>{msg.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div style={{ maxWidth: '92%' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: msg.suggestions?.length ? 10 : 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={16} color="white" />
          </div>
          <div style={{ background: 'white', borderRadius: '4px 20px 20px 20px', padding: '12px 16px', flex: 1, border: '1px solid rgba(124,58,237,0.12)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-line' }}>{msg.text}</p>
          </div>
        </div>

        {msg.suggestions?.length > 0 && (
          <div style={{ marginLeft: 40, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {msg.suggestions.map((s, i) => {
              const isSaved = saved[i];
              return (
                <div key={i} style={{ background: 'white', borderRadius: 16, border: '1px solid rgba(124,58,237,0.15)', padding: '12px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <p style={{ fontSize: 12, fontWeight: 800, color: '#1e1b4b', flex: 1, marginRight: 8, lineHeight: 1.4, margin: 0 }}>{s.name}</p>
                    {s.priceLabel && <span style={{ background: 'rgba(124,58,237,0.1)', color: '#7c3aed', fontSize: 11, fontWeight: 900, padding: '2px 8px', borderRadius: 8, flexShrink: 0 }}>{s.priceLabel}</span>}
                  </div>
                  {s.why && <p style={{ fontSize: 11, color: '#6b7280', margin: '6px 0 10px', lineHeight: 1.4 }}>{s.why}</p>}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => openLink(skroutzUrl(s.query || s.name), s.name)}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: 'linear-gradient(135deg,#f97316,#ea580c)', color: 'white', border: 'none', borderRadius: 10, padding: '8px 12px', fontSize: 11, fontWeight: 800, cursor: 'pointer', boxShadow: '0 2px 8px rgba(249,115,22,0.35)' }}>
                      <ExternalLink size={11} /> Προβολή
                    </button>
                    <button onClick={async () => {
                        if (saved[i] || saving[i]) return;
                        setSaving(p => ({...p,[i]:true}));
                        await saveToList(s, kidName);
                        setSaving(p => ({...p,[i]:false}));
                        setSaved(p => ({...p,[i]:true}));
                        if(onSaved) onSaved(true);
                      }}
                      disabled={saved[i] || saving[i]}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: saved[i] ? '#d1fae5' : 'rgba(124,58,237,0.1)', color: saved[i] ? '#059669' : '#7c3aed', border: `1px solid ${saved[i] ? '#6ee7b7' : 'rgba(124,58,237,0.25)'}`, borderRadius: 10, padding: '8px 12px', fontSize: 11, fontWeight: 800, cursor: saved[i] || saving[i] ? 'default' : 'pointer' }}>
                      {saving[i] ? <Loader2 size={11} className="animate-spin" /> : <ShoppingBasket size={11} />}
                      {saved[i] ? 'Αποθηκεύτηκε!' : saving[i] ? 'Ψάχνω...' : 'Αποθήκευση'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const QUICK_PROMPTS = [
  { icon: '☀️', label: 'Καλοκαιρινά',     q: 'Τι χρειάζεται για το καλοκαίρι;' },
  { icon: '🎂', label: 'Δώρο γενεθλίων',  q: 'Ιδέες για δώρο γενεθλίων' },
  { icon: '🎒', label: 'Σχολικά',          q: 'Τι χρειάζεται για τη σχολική χρονιά;' },
  { icon: '👟', label: 'Παπούτσια',        q: 'Πρέπει να πάρω παπούτσια' },
  { icon: '🧥', label: 'Χειμωνιάτικα',    q: 'Τι χρειάζεται για τον χειμώνα;' },
  { icon: '🎄', label: 'Χριστούγεννα',    q: 'Ιδέες για χριστουγεννιάτικα δώρα' },
];

const AIAdvisor = () => {
  const { isAuthenticated } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [kids, setKids] = useState([]);
  const [savedToast, setSavedToast] = useState(false);
  const messagesEndRef = useRef(null);

  // Smart Browser
  const smartBrowser = useSmartBrowser();
  const primaryKid = kids[0];

  const openLink = (url, label = '') => {
    smartBrowser.open(url, { label, kidName: primaryKid?.name || '', isWishlist: false });
  };

  const handleOpenLink = openLink; // Alias for MessageBubble component

  const handleSaveFromBrowser = async (url, label, kidName) => {
    try {
      await saveToWishlistWithImage(
        { title: label, link: url, store: 'Skroutz' },
        { kidName, isAuthenticated, fromAI: true }
      );
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2500);
    } catch (error) {
      console.error('Failed to save:', error);
    }
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    async function load() {
      try {
        let list = [];
        if (isAuthenticated) list = await supabaseService.getKids();
        else { const s = localStorage.getItem('smart-kids-list'); if (s) list = JSON.parse(s); }
        setKids(list);
      } catch { const s = localStorage.getItem('smart-kids-list'); if (s) setKids(JSON.parse(s)); }
    }
    load();
    window.addEventListener('kids-updated', load);
    return () => window.removeEventListener('kids-updated', load);
  }, [isAuthenticated]);

  function calcAge(d) {
    if (!d) return 5;
    const t = new Date(), b = new Date(d);
    let a = t.getFullYear() - b.getFullYear();
    if (t.getMonth() - b.getMonth() < 0 || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
    return Math.max(0, a);
  }

  function getCurrentSeason() {
    const m = new Date().getMonth();
    if (m >= 2 && m <= 4) return 'Άνοιξη';
    if (m >= 5 && m <= 7) return 'Καλοκαίρι';
    if (m >= 8 && m <= 10) return 'Φθινόπωρο';
    return 'Χειμώνας';
  }

  const sendMessage = async (text) => {
    const userMessage = (text || input).trim();
    if (!userMessage || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const GROQ_KEY   = import.meta.env.VITE_GROQ_API_KEY;
      const API_URL    = import.meta.env.VITE_API_URL || 'https://smart-kids-api.onrender.com';

      // ── Κτίζουμε το kid context για τον server ────────────────
      const kidsPayload = kids.slice(0, 3).map(k => ({
        name:             k.name,
        gender:           k.gender,
        age:              k.age || calcAge(k.birthdate || k.birthDate),
        shoeSize:         k.shoeSize || k.shoe_size || '',
        clothingSize:     k.clothingSize || k.clothing_size || '',
        favoriteCharacter: k.favoriteCharacter || k.favorite_character || '',
        favoriteSport:    k.favoriteSport || k.favorite_sport || '',
      }));

      const historyPayload = messages.slice(-4).map(m => ({
        role:    m.role,
        content: (m.content || m.text || '').slice(0, 300),
      }));

      let raw = '';

      // ── Βήμα 1: Προσπαθούμε server endpoint (llama-8b, ελαφρύ) ──
      try {
        const serverRes = await fetch(`${API_URL}/api/ai-chat`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            message: userMessage,
            kids:    kidsPayload,
            history: historyPayload,
          }),
          signal: AbortSignal.timeout(28000),
        });

        if (serverRes.ok) {
          const serverData = await serverRes.json();
          // Server επιστρέφει { text, suggestions } ήδη parsed
          const text = serverData.text || '';
          const suggestions = serverData.suggestions || null;

          setMessages(prev => [...prev, {
            role: 'assistant',
            content: text,
            text,
            suggestions,
          }]);
          setLoading(false);
          return;
        }
        console.warn('Server AI returned', serverRes.status, '— falling back to direct Groq');
      } catch (serverErr) {
        console.warn('Server AI unreachable:', serverErr.message, '— using direct Groq');
      }

      // ── Βήμα 2: Fallback — καλούμε Groq απευθείας (70b) ─────
      if (!GROQ_KEY) throw new Error('Δεν βρέθηκε AI key');

      // Tavily web search (optional)
      let webContext = '';
      const TAVILY_KEY = import.meta.env.VITE_TAVILY_API_KEY;
      if (TAVILY_KEY) {
        try {
          const tavilyRes = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              api_key:      TAVILY_KEY,
              query:        `παιδικά προϊόντα ${userMessage} Ελλάδα`,
              search_depth: 'basic',
              max_results:  3,
              include_answer: true,
            }),
            signal: AbortSignal.timeout(6000),
          });
          if (tavilyRes.ok) {
            const td = await tavilyRes.json();
            if (td.answer) webContext = `Σύνοψη: ${td.answer.slice(0, 200)}\n`;
            (td.results || []).slice(0, 3).forEach((r, i) => {
              webContext += `[${i+1}] ${(r.title||'').slice(0,80)}\n${(r.content||'').slice(0,150)}\n`;
            });
          }
        } catch {}
      }

      const kidContext = kids.length === 0
        ? 'Δεν υπάρχουν καταχωρημένα παιδιά.'
        : kids.map(k => {
            const age  = k.age || calcAge(k.birthdate || k.birthDate);
            const parts = [`${k.name}: ${k.gender || ''}, ${age} ετών`];
            if (k.shoeSize  || k.shoe_size)  parts.push(`παπούτσι νούμερο ${k.shoeSize || k.shoe_size}`);
            if (k.clothingSize || k.clothing_size) parts.push(`ρούχα μέγεθος ${k.clothingSize || k.clothing_size}`);
            if (k.favoriteCharacter || k.favorite_character) parts.push(`⭐ ${k.favoriteCharacter || k.favorite_character}`);
            return '• ' + parts.join(', ');
          }).join('\n');

      const systemPrompt = `Είσαι ο AI σύμβουλος αγορών της εφαρμογής Smart Kids για Έλληνες γονείς.

ΠΡΟΦΙΛ ΠΑΙΔΙΩΝ:
${kidContext}

ΤΡΕΧΟΥΣΑ ΕΠΟΧΗ: ${getCurrentSeason()}
${webContext ? `\nΔΕΔΟΜΕΝΑ ΑΠΟ WEB:\n${webContext}` : ''}

ΚΑΝΟΝΕΣ:
1. Απαντάς ΠΑΝΤΑ στα Ελληνικά
2. Σύντομη εισαγωγή (1-2 προτάσεις) + JSON block στο τέλος
3. 3-4 προτάσεις μόνο

ΚΑΝΟΝΕΣ ΓΙΑ "query" (3-5 λέξεις, πηγαίνει στο Skroutz):
• Παπούτσια → "παπούτσια [φύλο] [νούμερο]"
• Παπούτσια παραλίας → "παπούτσια θαλάσσης [φύλο] [νούμερο]"
• Ρούχα → "[είδος] [φύλο] [ηλικία] ετών"
• Μαγιό → "μαγιό [φύλο] [ηλικία] ετών"
• Παιχνίδια → "παιχνίδια [αγόρια/κορίτσια]"
• Λαμπάδες → "λαμπάδα [χαρακτήρας] [φύλο]"

FORMAT (ΥΠΟΧΡΕΩΤΙΚΟ):
\`\`\`json
[{"name":"Σύντομο όνομα","priceLabel":"~XX-XXέ","query":"skroutz query","why":"1 πρόταση"}]
\`\`\``;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({
          model:       'llama-3.3-70b-versatile',
          messages:    [
            { role: 'system', content: systemPrompt },
            ...messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessage },
          ],
          temperature: 0.65,
          max_tokens:  900,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) throw new Error(`Groq API ${response.status}`);
      const data = await response.json();
      raw = data.choices?.[0]?.message?.content || '';
      if (!raw) throw new Error('No response from AI');

      let suggestions = null;
      try {
        const m = raw.match(/```json\s*([\s\S]*?)```/);
        if (m) {
          const parsed = JSON.parse(m[1]);
          if (Array.isArray(parsed)) suggestions = parsed.filter(s => s.name && s.query).slice(0, 4);
        }
      } catch {}

      const aiText = raw.replace(/```json[\s\S]*?```/, '').trim();
      setMessages(prev => [...prev, { role: 'assistant', content: aiText, text: aiText, suggestions }]);

    } catch (err) {
      console.error('AI error:', err.message);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Συγγνώμη, δεν μπόρεσα να απαντήσω. Δοκίμασε ξανά.',
        text:    'Συγγνώμη, δεν μπόρεσα να απαντήσω. Δοκίμασε ξανά.',
        suggestions: null,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (suggestion) => {
    const item = {
      title: suggestion.name,
      link: skroutzUrl(suggestion.query || suggestion.name),
      priceLabel: suggestion.priceLabel,
      thumbnail: suggestion.thumbnail,
      query: suggestion.query || suggestion.name,
      kidName: primaryKid?.name || ''
    };
    setModalItem(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalItem(null);
  };

  return (
    <div style={{ maxWidth: 448, margin: '0 auto', minHeight: '100vh', background: 'linear-gradient(180deg,#faf5ff 0%,#f8fafc 100%)', display: 'flex', flexDirection: 'column', position: 'relative', paddingBottom: smartBrowser.state ? 80 : 0 }}>
      {savedToast && (
        <div style={{ position: 'fixed', top: 'calc(env(safe-area-inset-top) + 60px)', left: '50%', transform: 'translateX(-50%)', background: '#059669', color: 'white', padding: '10px 20px', borderRadius: 14, fontSize: 13, fontWeight: 800, zIndex: 300, boxShadow: '0 4px 20px rgba(5,150,105,0.4)', whiteSpace: 'nowrap' }}>
          ✅ Αποθηκεύτηκε στη Λίστα Αγορών!
        </div>
      )}

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#4c1d95 0%,#7c3aed 50%,#a855f7 100%)', paddingTop: 'max(48px, env(safe-area-inset-top, 48px))', paddingBottom: 24, paddingLeft: 20, paddingRight: 20, borderRadius: '0 0 28px 28px', boxShadow: '0 8px 32px rgba(124,58,237,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={22} color="#fbbf24" /> AI Σύμβουλος
            </h1>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 3, fontWeight: 600 }}>
              {kids.length > 0 ? `${kids.length} παιδί${kids.length > 1 ? 'ά' : ''} · ${getCurrentSeason()}` : 'Πρόσθεσε παιδί στο Προφίλ'}
            </p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {/* Κουμπί εκκαθάρισης — εμφανίζεται μόνο αν υπάρχουν μηνύματα */}
            {messages.length > 0 && (
              <button
                onClick={() => { if(window.confirm('Νέα συνομιλία;')) setMessages([]); }}
                style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:10, padding:'6px 10px', color:'white', fontSize:10, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}
              >
                🗑️ Καθαρισμός
              </button>
            )}
            {primaryKid && (
              <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 18 }}>{primaryKid.avatar || '👤'}</span>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 900, color: 'white', margin: 0 }}>{primaryKid.name}</p>
                  <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                    {primaryKid.age || calcAge(primaryKid.birthdate)}ε
                    {(primaryKid.shoeSize || primaryKid.shoe_size) ? ` · 👟${primaryKid.shoeSize || primaryKid.shoe_size}` : ''}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && (
          <div>
            <div style={{ background: 'white', borderRadius: 20, padding: 24, border: '1px solid rgba(124,58,237,0.1)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 16, textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: 18, margin: '0 auto 12px', background: 'linear-gradient(135deg,#ede9fe,#fae8ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={32} color="#7c3aed" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 900, color: '#1e1b4b', margin: '0 0 8px' }}>Γεια! Πώς μπορώ να βοηθήσω; 👋</h3>
              <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6, margin: 0 }}>
                Ρώτησέ με για αγορές για το παιδί σου.<br />
                Ξέρω τα μεγέθη και την εποχή — θα σου προτείνω<br />
                προϊόντα με άμεσο link στο Skroutz.
              </p>
            </div>
            <p style={{ fontSize: 10, fontWeight: 800, color: '#9ca3af', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10, paddingLeft: 4 }}>Γρήγορες ερωτήσεις</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {QUICK_PROMPTS.map((p, i) => (
                <button key={i} onClick={() => sendMessage(p.q)}
                  style={{ background: 'white', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 14, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', textAlign: 'left' }}>
                  <span style={{ fontSize: 20 }}>{p.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#374151' }}>{p.label}</span>
                  <ChevronRight size={12} color="#9ca3af" style={{ marginLeft: 'auto' }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <MessageBubble 
            key={idx} 
            msg={msg} 
            kidName={primaryKid?.name || ''} 
            openLink={openLink}
            onSaved={(ok) => { if(ok){ setSavedToast(true); setTimeout(()=>setSavedToast(false),2500); } }} 
          />
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'white', borderRadius: '4px 20px 20px 20px', width: 'fit-content', border: '1px solid rgba(124,58,237,0.12)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Loader2 size={16} color="#7c3aed" className="animate-spin" />
            <span style={{ fontSize: 12, color: '#7c3aed', fontWeight: 700 }}>Ψάχνω online & σκέφτομαι...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 16px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))', background: 'white', borderTop: '1px solid rgba(124,58,237,0.1)' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="π.χ. Τι χρειάζεται για το καλοκαίρι;" disabled={loading}
            style={{ flex: 1, padding: '12px 16px', borderRadius: 16, border: '2px solid rgba(124,58,237,0.2)', fontSize: 13, outline: 'none', background: '#faf5ff', color: '#1e1b4b' }} />
          <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
            style={{ width: 48, height: 48, borderRadius: 14, border: 'none', background: input.trim() ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : '#e5e7eb', cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s', boxShadow: input.trim() ? '0 4px 12px rgba(124,58,237,0.35)' : 'none' }}>
            <Send size={18} color={input.trim() ? 'white' : '#9ca3af'} />
          </button>
        </div>
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

export default AIAdvisor;
