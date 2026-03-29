import React, { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { PartialWebView } from './services/partial-webview';
import { Search, X, ShoppingCart, Loader2, ArrowRight, Sparkles, ExternalLink, Trophy, Star, SlidersHorizontal, Check, ChevronDown, ChevronUp, Calendar, Clock, Bell, AlertCircle, BookmarkPlus, ShoppingBag } from 'lucide-react';
import { useAuth } from './components/AuthProvider';
import { supabaseService } from './services/supabase';
import { saveToWishlistWithImage } from './utils/imageExtractor';

// ── Ανιχνεύει αν το URL είναι σελίδα προϊόντος ───────────────
function checkIsProduct(url) {
  if (!url) return false;
  return url.includes('/s/') || url.includes('/products/') || url.includes('/p/');
}

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

// ── useSmartBrowser — χρησιμοποιεί το native PartialWebView plugin ──
function useSmartBrowser() {
  const [state, setState]         = useState(null);
  const [currentUrl, setCurrentUrl] = useState('');
  const [isProduct, setIsProduct]   = useState(false);

  const open = async (url, opts = {}) => {
    setState({ url, label: opts.label || '', kidName: opts.kidName || '' });
    setCurrentUrl(url);
    setIsProduct(false);

    if (!Capacitor.isNativePlatform()) return; // web: handled by SmartBrowserSheet

    try { await PartialWebView.removeAllListeners(); } catch {}

    try {
      await PartialWebView.open({
        url,
        label:      opts.label   || '',
        kidName:    opts.kidName || '',
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

      // Το native κουμπί "Αποθήκευση" στέλνει αυτό το event
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

// ── SmartBrowserSheet — εμφανίζεται ΑΝΩ από τον browser ─────
// Native: fixed overlay με κουμπιά
// Web: iframe bottom sheet
function SmartBrowserSheet({ browserState, currentUrl, isProduct, onClose, onSave }) {
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

  // Native: μπάρα που φαίνεται κάτω από το WebView (το WebView αφήνει χώρο)
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

        <div style={{
          width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
          background: isProduct ? '#34d399' : '#fbbf24',
          boxShadow: `0 0 10px ${isProduct ? '#34d399' : '#fbbf24'}`,
        }} />
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, flex: 1, margin: 0, fontWeight: 700 }}>
          {isProduct ? '✅ Βρήκες προϊόν!' : '🔍 Βρες κάτι που σου αρέσει'}
        </p>
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
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.15)', color: 'white',
          border: 'none', borderRadius: 12, padding: '10px 12px',
          fontSize: 14, fontWeight: 800, cursor: 'pointer', flexShrink: 0,
        }}>✕</button>
      </div>
    );
  }
  // Web: iframe bottom sheet
  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,0.6)', display:'flex', flexDirection:'column', justifyContent:'flex-end' }} onClick={onClose}>
      <div style={{ background:'white', borderRadius:'20px 20px 0 0', height:'85vh', display:'flex', flexDirection:'column', overflow:'hidden' }} onClick={e=>e.stopPropagation()}>
        <div style={{ background:'#1a1a2e', padding:'10px 16px', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background: isProduct ? '#34d399' : '#fbbf24', flexShrink:0 }} />
          <p style={{ color:'rgba(255,255,255,0.7)', fontSize:10, margin:0, flex:1 }}>
            {isProduct ? '✅ Σελίδα προϊόντος' : '🔍 Αναζήτηση'}
          </p>
          <button onClick={handleSave} style={{ background: saved ? '#059669' : 'linear-gradient(135deg,#7c3aed,#a855f7)', color:'white', border:'none', borderRadius:10, padding:'7px 14px', fontSize:11, fontWeight:800, cursor:'pointer' }}>
            {saved ? '✅ Αποθηκεύτηκε' : '💾 Αποθήκευση'}
          </button>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.1)', color:'white', border:'none', borderRadius:8, padding:'7px 10px', cursor:'pointer' }}><X size={14} /></button>
        </div>
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8', fontSize:13, flexDirection:'column', gap:8 }}>
          <ExternalLink size={24} />
          <p style={{margin:0, fontWeight:700}}>Άνοιγμα στο browser</p>
          <button onClick={() => { window.open(url, '_blank'); }} style={{ background:'#ff4d6d', color:'white', border:'none', borderRadius:12, padding:'10px 20px', fontWeight:800, cursor:'pointer', marginTop:4 }}>
            Άνοιγμα
          </button>
        </div>
      </div>
    </div>
  );
}

async function fetchAndSaveToList(query, kidName, label) {
  try {
    const res = await fetch(
      `https://smart-kids-api.onrender.com/api/search?q=${encodeURIComponent(query)}&offersCategory=GENERAL`,
      { signal: AbortSignal.timeout(8000) }
    );
    const data = await res.json();
    const results = data.shopping_results || [];
    const top = results.find(r => r.price && r.title) || results[0];

    const item = {
      id: Date.now(),
      title: top ? top.title : label,
      price: top?.priceValue || 0,
      priceLabel: top?.price || '',
      thumbnail: top?.thumbnail || null,
      link: top?.buyLink || top?.link || `https://www.skroutz.gr/search?keyphrase=${encodeURIComponent(query)}`,
      store: top?.source || 'Skroutz',
      kidName: kidName || '',
      skroutzQuery: query,
      addedAt: new Date().toISOString(),
      fromAI: true,
    };
    const list = JSON.parse(localStorage.getItem('tracked-items') || '[]');
    const exists = list.find(i => i.skroutzQuery === query && i.kidName === item.kidName);
    if (!exists) {
      list.unshift(item);
      localStorage.setItem('tracked-items', JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('shopping-list-updated'));
    }
    return item;
  } catch {
    // Fallback χωρίς SerpAPI
    const item = {
      id: Date.now(),
      title: label,
      price: 0, priceLabel: '',
      thumbnail: null,
      link: `https://www.skroutz.gr/search?keyphrase=${encodeURIComponent(query)}`,
      store: 'Skroutz',
      kidName: kidName || '',
      skroutzQuery: query,
      addedAt: new Date().toISOString(),
      fromAI: true,
    };
    const list = JSON.parse(localStorage.getItem('tracked-items') || '[]');
    list.unshift(item);
    localStorage.setItem('tracked-items', JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('shopping-list-updated'));
    return item;
  }
}

// ── ActionModal — "Προβολή ή Αποθήκευση;" ────────────────
function ActionModal({ item, kidName, onClose, onOpenBrowser }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  if (!item) return null;

  const handleView = () => {
    onClose();
    // Ανοίγει SmartBrowser με μπάρα ελέγχου
    if (onOpenBrowser) onOpenBrowser(item.url, item.label);
  };

  const handleSave = async () => {
    setSaving(true);
    await fetchAndSaveToList(item.query || item.label, kidName, item.label);
    setSaving(false);
    setSaved(true);
    setTimeout(onClose, 1200);
  };

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:300,
        display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background:'white', borderRadius:'24px 24px 0 0', padding:'24px 20px 40px',
          width:'100%', maxWidth:448, boxShadow:'0 -8px 40px rgba(0,0,0,0.2)' }}
      >
        <div style={{ width:40, height:4, borderRadius:2, background:'#e2e8f0', margin:'0 auto 20px' }} />
        <p style={{ fontWeight:900, fontSize:16, color:'#1e293b', marginBottom:4 }}>{item.label}</p>
        <p style={{ fontSize:12, color:'#94a3b8', marginBottom:24 }}>Τι θέλεις να κάνεις;</p>

        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <button onClick={handleView} style={{
            background:'linear-gradient(135deg,#ff6000,#ea580c)',
            color:'white', border:'none', borderRadius:16, padding:'16px 20px',
            display:'flex', alignItems:'center', gap:12, cursor:'pointer',
            boxShadow:'0 4px 16px rgba(255,96,0,0.35)',
          }}>
            <ExternalLink size={20} />
            <div style={{ textAlign:'left' }}>
              <p style={{ fontSize:13, fontWeight:900, margin:0 }}>Άνοιγμα στο Skroutz</p>
              <p style={{ fontSize:10, opacity:0.8, margin:0 }}>Με δυνατότητα αποθήκευσης →</p>
            </div>
          </button>

          <button onClick={handleSave} disabled={saving || saved} style={{
            background: saved ? '#d1fae5' : 'linear-gradient(135deg,#7c3aed,#a855f7)',
            color: saved ? '#059669' : 'white',
            border:'none', borderRadius:16, padding:'16px 20px',
            display:'flex', alignItems:'center', gap:12, cursor: saving ? 'wait' : 'pointer',
            boxShadow: saved ? 'none' : '0 4px 16px rgba(124,58,237,0.35)',
            transition:'all 0.3s',
          }}>
            {saving ? <Loader2 size={20} style={{ animation:'spin 1s linear infinite' }} /> :
             saved   ? <span style={{ fontSize:20 }}>✅</span> :
                       <BookmarkPlus size={20} />}
            <div style={{ textAlign:'left' }}>
              <p style={{ fontSize:13, fontWeight:900, margin:0 }}>
                {saved ? 'Αποθηκεύτηκε!' : saving ? 'Ψάχνω...' : 'Αποθήκευση στη Λίστα'}
              </p>
              <p style={{ fontSize:10, opacity:0.8, margin:0 }}>
                {saved ? 'Στη Λίστα μου' : 'Με παρακολούθηση τιμής'}
              </p>
            </div>
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const FILTER_NAMES = {
  type:'Τύπος', brand:'Μάρκα', color:'Χρώμα', size:'Νούμερο/Μέγεθος',
  closure:'Κλείσιμο', sport:'Άθλημα', features:'Χαρακτηριστικά', feature:'Χαρακτηριστικά',
  season:'Εποχή', material:'Υλικό', ageRange:'Ηλικία', ageSize:'Μέγεθος',
  category:'Κατηγορία', character:'Χαρακτήρας', occasion:'Περίσταση',
  theme:'Θέμα', group:'Ομάδα Βάρους', installation:'Τοποθέτηση',
  rotation:'Περιστροφή', direction:'Κατεύθυνση', voltage:'Τάση',
  seats:'Θέσεις', weightGroup:'Ομάδα', suggestedSize:'📐 Προτεινόμενο Νούμερο',
};
const FILTER_ICONS = {
  type:'👟', brand:'⭐', size:'📏', closure:'🔗', sport:'⚽',
  feature:'✨', features:'✨', season:'🌤', material:'🧵',
  ageRange:'🎂', ageSize:'📐', suggestedSize:'📐', category:'📂',
};
const fname = k => FILTER_NAMES[k] || k;
const ficon = k => FILTER_ICONS[k] || '🔹';

// ─────────────────────────────────────────────
// PREFERENCE TRACKER — μαθαίνει από τον χρήστη
// ─────────────────────────────────────────────
function getPreferences() {
  try { return JSON.parse(localStorage.getItem('sk_preferences') || '{}'); } catch { return {}; }
}
function savePreference(category, filterType, value) {
  try {
    const prefs = getPreferences();
    const key = `${category}.${filterType}.${value}`;
    prefs[key] = (prefs[key] || 0) + 1;
    localStorage.setItem('sk_preferences', JSON.stringify(prefs));
  } catch {}
}
function getTopPreferences(category, filterType, options, limit = 3) {
  const prefs = getPreferences();
  return options
    .map(opt => ({ opt, score: prefs[`${category}.${filterType}.${opt}`] || 0 }))
    .sort((a, b) => b.score - a.score)
    .filter(x => x.score > 0)
    .slice(0, limit)
    .map(x => x.opt);
}

// ─────────────────────────────────────────────
// ORTHODOX EASTER + SEASONAL EVENTS
// ─────────────────────────────────────────────
function orthodoxEaster(y) {
  const a=y%4,b=y%7,c=y%19;
  const d=(19*c+15)%30;
  const e=(2*a+4*b-d+34)%7;
  const f=Math.floor((d+e+114)/31);
  const g=((d+e+114)%31)+1;
  return new Date(y,f-1,g+13);
}

function getUpcomingEvents() {
  const now = new Date();
  now.setHours(0,0,0,0);
  const in30 = new Date(now);
  in30.setDate(now.getDate()+30);

  const allEvents = [];

  for (let y = now.getFullYear(); y <= now.getFullYear()+1; y++) {
    const easter = orthodoxEaster(y);
    const cleanMon = new Date(easter); cleanMon.setDate(easter.getDate()-48);
    const apokries = new Date(cleanMon); apokries.setDate(cleanMon.getDate()-7);
    const tsikno   = new Date(cleanMon); tsikno.setDate(cleanMon.getDate()-10);
    const megaliEvd = new Date(easter);  megaliEvd.setDate(easter.getDate()-7);

    // For ongoing carnival: show if we're within 14 days AFTER tsikno
    const tsiknoPlus14 = new Date(tsikno); tsiknoPlus14.setDate(tsikno.getDate()+14);
    const isCarnavalPeriod = now >= tsikno && now <= tsiknoPlus14;

    const moveable = [
      // startDate, endDate (show during this range), name, icon, q
      [tsikno,   cleanMon, "Αποκριάτικη Περίοδος 🎭", "🎭", "στολή αποκριάτικη παιδική"],
      [cleanMon, cleanMon, "Καθαρά Δευτέρα",           "🪁", "χαρταετός παιδικός"],
      [megaliEvd, easter,  "Μεγάλη Εβδομάδα",          "🕯️", "λαμπάδα πάσχα παιδική"],
      [easter,   easter,   "Πάσχα",                    "🐣", "λαμπάδα πάσχα δώρα παιδικά"],
    ];

    moveable.forEach(([startD, endD, name, icon, q]) => {
      // Show if: event hasn't ended yet AND starts within 30 days
      if (startD <= in30 && endD >= now) {
        const daysLeft = Math.max(0, Math.ceil((startD - now) / 86400000));
        const isOngoing = startD <= now && endD >= now;
        const daysUntilEnd = Math.ceil((endD - now) / 86400000);
        const displayDate = isOngoing
          ? 'Μέχρι ' + endD.toLocaleDateString('el-GR', {day:'numeric', month:'long'})
          : startD.toLocaleDateString('el-GR', {day:'numeric', month:'long'});
        allEvents.push({
          name, icon, q,
          date: isOngoing ? now : startD,
          dateStr: displayDate,
          daysLeft: isOngoing ? daysUntilEnd : daysLeft,
          ongoing: isOngoing,
        });
      }
    });

    const fixed = [
      [new Date(y,1,14),  "Αγ. Βαλεντίνος",     "❤️",  "δώρα παιδικά"],
      [new Date(y,2,25),  "25η Μαρτίου",         "🇬🇷", "παιδικές στολές παρέλαση"],
      [new Date(y,4,1),   "Πρωτομαγιά",          "🌸",  "παιδικά ρούχα ανοιξιάτικα"],
      [new Date(y,5,1),   "Παγκ. Ημέρα Παιδιού", "🌍",  "παιχνίδια εκπαιδευτικά"],
      [new Date(y,8,1),   "Νέα Σχολική Χρονιά",  "🎒",  "σχολική τσάντα"],
      [new Date(y,9,28),  "28η Οκτωβρίου",       "🇬🇷", "παιδικές στολές παρέλαση"],
      [new Date(y,10,17), "Πολυτεχνείο",         "✊",  "παιδικά ρούχα"],
      [new Date(y,11,6),  "Αγ. Νικόλαος",        "🎅",  "χριστουγεννιάτικα δώρα"],
      [new Date(y,11,25), "Χριστούγεννα",        "🎄",  "χριστουγεννιάτικα δώρα παιδικά"],
    ];

    fixed.forEach(([d,name,icon,q]) => {
      if (d >= now && d <= in30) {
        const daysLeft = Math.ceil((d - now)/86400000);
        allEvents.push({ name, icon, q, date: d,
          dateStr: d.toLocaleDateString('el-GR',{day:'numeric',month:'long',year:'numeric'}),
          daysLeft, ongoing: false });
      }
    });
  }

  // Deduplicate by name, sort
  const seen = new Set();
  return allEvents
    .filter(e => { if(seen.has(e.name)) return false; seen.add(e.name); return true; })
    .sort((a,b) => a.date - b.date);
}

// ─────────────────────────────────────────────
// PRE-SEARCH FILTER SUGGESTIONS
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// DASHBOARD — Reminders & quick links for currentKid
// ─────────────────────────────────────────────
function calcDashboardReminders(kid) {
  if (!kid) return [];
  const reminders = [];
  const now = new Date();

  // 🎂 Γενέθλια countdown
  const bdate = kid.birthdate || kid.birthDate;
  if (bdate) {
    const bday = new Date(bdate);
    const next = new Date(now.getFullYear(), bday.getMonth(), bday.getDate());
    if (next < now) next.setFullYear(now.getFullYear() + 1);
    const days = Math.round((next - now) / (1000*60*60*24));
    if (days <= 30) reminders.push({
      type: 'birthday', icon: '🎂',
      title: days === 0 ? `Σήμερα τα γενέθλια!` : `Γενέθλια σε ${days} μέρες!`,
      subtitle: days === 0 ? `Χρόνια πολλά ${kid.name}! 🎉` : `Έχεις ετοιμάσει δώρο;`,
      urgency: days <= 3 ? 'high' : days <= 7 ? 'medium' : 'low',
      searchQ: `δώρα γενεθλίων παιδικά`,
    });
  }

  // 👟 Αλλαγή παπουτσιού
  if (kid.lastShoeUpdate) {
    const months = (now - new Date(kid.lastShoeUpdate)) / (1000*60*60*24*30);
    if (months >= 6) reminders.push({
      type: 'shoe_size', icon: '👟',
      title: 'Ώρα για νέο νούμερο;',
      subtitle: `${Math.floor(months)} μήνες από τελευταία αγορά`,
      urgency: months >= 9 ? 'high' : 'medium',
      searchQ: `παιδικά παπούτσια νούμερο ${kid.shoeSize || kid.shoe_size || ''}`.trim(),
    });
  }

  // 👕 Αλλαγή ρούχων
  if (kid.lastClothesUpdate) {
    const months = (now - new Date(kid.lastClothesUpdate)) / (1000*60*60*24*30);
    if (months >= 6) reminders.push({
      type: 'clothes_size', icon: '👕',
      title: 'Ανανέωσε τα ρούχα;',
      subtitle: `${Math.floor(months)} μήνες από τελευταία αγορά`,
      urgency: months >= 9 ? 'high' : 'medium',
      searchQ: `παιδικά ρούχα μέγεθος ${kid.clothingSize || kid.clothing_size || ''}`.trim(),
    });
  }

  // 🏫 Σχολείο — Αύγουστος/Σεπτέμβριος
  const month = now.getMonth();
  if (month === 7) reminders.push({
    type: 'school', icon: '🏫',
    title: 'Σχολείο σε 1 μήνα!',
    subtitle: 'Τσάντα, κασετίνα, ρούχα…',
    urgency: 'medium',
    searchQ: 'σχολική τσάντα',
  });

  return reminders;
}

// ── SKROUTZ URL BUILDER με πραγματικά filter IDs ──────────
// Format: /c/{catID}/{slug}/f/{genderFilterID}_{ageOrSizeFilterID}/{genderVal}-{ageOrSizeVal}.html
const SKROUTZ_CATS = {
  sneakers:    { id:1580, slug:'Athlitika-Paidika-Papoytsia',
    gender:{ 'Αγόρι':{ fid:'533176', val:'agori' }, 'Κορίτσι':{ fid:'533177', val:'koritsi' } },
    size:{ '17':'513520','18':'513521','19':'513522','20':'513523','21':'513524','22':'513525',
           '23':'513526','24':'513527','25':'513528','26':'513529','27':'513530','28':'513531',
           '29':'513532','30':'513538','31':'513540','32':'513541','33':'513542','34':'513543',
           '35':'513544','36':'513544','37':'513545','38':'513546','39':'513547','40':'513548' } },
  blouses:     { id:542,  slug:'paidikes-mplouzes',
    gender:{ 'Αγόρι':{ fid:'259251', val:'agori' }, 'Κορίτσι':{ fid:'259252', val:'koritsi' } },
    age:{ '1':'941342','2':'941343','3':'941344','4':'941345','5':'941346','6':'941347',
          '7':'941348','8':'941349','9':'941350','10':'941351','11':'941351','12':'941352','13':'941352','14':'941353' } },
  pants:       { id:541,  slug:'paidika-pantelonia',
    gender:{ 'Αγόρι':{ fid:'259246', val:'agori' }, 'Κορίτσι':{ fid:'259247', val:'koritsi' } },
    age:{ '2':'941360','3':'941361','4':'941362','5':'941363','6':'941364','7':'941365',
          '8':'941366','9':'941367','10':'941368','11':'941368','12':'941369','13':'941369','14':'941370' } },
  tracksuits:  { id:547,  slug:'paidikes-formes',
    gender:{ 'Αγόρι':{ fid:'605304', val:'agori' }, 'Κορίτσι':{ fid:'605305', val:'koritsi' } }, age:{} },
  hoodies:     { id:2887, slug:'paidika-fouter',
    gender:{ 'Αγόρι':{ fid:'605310', val:'agori' }, 'Κορίτσι':{ fid:'605311', val:'koritsi' } }, age:{} },
  dresses:     { id:545,  slug:'paidika-foremata', gender:{},
    age:{ '2':'946782','3':'946783','4':'946784','5':'946785','6':'946785','7':'946786',
          '8':'946787','9':'946788','10':'946789','11':'946789','12':'946790','13':'946790','14':'946791' } },
  swimwear:    { id:543,  slug:'paidika-magio',
    gender:{ 'Αγόρι':{ fid:'259265', val:'agori' }, 'Κορίτσι':{ fid:'259266', val:'koritsi' } }, age:{} },
  school_bags: { id:1383, slug:'sxolikes-tsantes',
    gender:{ 'Αγόρι':{ fid:'259290', val:'agori' }, 'Κορίτσι':{ fid:'259291', val:'koritsi' } }, age:{} },
  candles:     { id:2020, slug:'lampades-pasxa',
    gender:{ 'Αγόρι':{ fid:'260000', val:'agori' }, 'Κορίτσι':{ fid:'260001', val:'koritsi' } }, age:{} },
};

function buildCatUrl(catKey, kid) {
  const BASE = 'https://www.skroutz.gr';
  const cat  = SKROUTZ_CATS[catKey];
  if (!cat) return null;
  const gender = kid?.gender || 'Αγόρι';
  const age    = Math.min(Math.max(Math.round(kid?.age || 5), 1), 14);
  const shoe   = String(kid?.shoeSize || kid?.shoe_size || '');
  const filterIds = [], filterVals = [];
  const gf = cat.gender[gender];
  if (gf) { filterIds.push(gf.fid); filterVals.push(gf.val); }
  if (cat.size && shoe && cat.size[shoe]) {
    filterIds.push(cat.size[shoe]); filterVals.push(shoe);
  } else if (cat.age && Object.keys(cat.age).length > 0) {
    const af = cat.age[String(age)];
    if (af) { filterIds.push(af); filterVals.push(age); }
  }
  const fp = filterIds.length > 0 ? `/f/${filterIds.join('_')}/${filterVals.join('-')}` : '';
  return `${BASE}/c/${cat.id}/${cat.slug}${fp}.html`;
}

// Quick search links ανά παιδί
function getQuickLinks(kid) {
  if (!kid) return [];
  const gender = kid.gender === 'Αγόρι' ? 'αγόρι' : 'κορίτσι';
  const genderPl = kid.gender === 'Αγόρι' ? 'αγόρια' : 'κορίτσια';
  const age = kid.age || 5;
  const char = kid.favoriteCharacter || kid.favorite_character || '';
  const shoe = kid.shoeSize || kid.shoe_size || '';


  return [
    { icon:'👟', label:'Παπούτσια',  url: buildCatUrl('sneakers', kid),    searchQuery: `παπούτσια ${gender} ${shoe}`.trim() },
    { icon:'👕', label:'Μπλούζες',   url: buildCatUrl('blouses', kid),     searchQuery: `μπλούζες ${gender} ${age} ετών` },
    { icon:'👖', label:'Παντελόνια', url: buildCatUrl('pants', kid),       searchQuery: `παντελόνια ${gender} ${age} ετών` },
    { icon:'🩱', label:'Φόρμες',     url: buildCatUrl('tracksuits', kid),  searchQuery: `φόρμες ${gender} ${age} ετών` },
    { icon:'🧥', label:'Φούτερ',     url: buildCatUrl('hoodies', kid),     searchQuery: `φούτερ ${gender} ${age} ετών` },
    { icon:'👗', label:'Φορέματα',   url: buildCatUrl('dresses', kid),     searchQuery: `φορέματα κορίτσι ${age} ετών`, onlyGirl: true },
  ].filter(l => !l.onlyGirl || kid.gender === 'Κορίτσι');
}

// Seasonal tabs
function getSeasonalTabs(kid) {
  if (!kid) return [];
  const now   = new Date();
  const month = now.getMonth();
  const gender = kid.gender === 'Αγόρι' ? 'αγόρι' : 'κορίτσι';
  const genderPl = kid.gender === 'Αγόρι' ? 'αγόρια' : 'κορίτσια';
  const age   = kid.age || 5;
  const char  = kid.favoriteCharacter || kid.favorite_character || '';
  const tabs  = [];

  const easter = orthodoxEaster(now.getFullYear());
  const holyWeekStart = new Date(easter); holyWeekStart.setDate(easter.getDate() - 7);
  const daysToHolyWeek = Math.ceil((holyWeekStart - now) / 86400000);
  if (daysToHolyWeek >= 0 && daysToHolyWeek <= 21) {
    tabs.push({ icon:'🕯️', label:'Λαμπάδες',
      url: buildCatUrl('candles', kid) || `https://www.skroutz.gr/search?keyphrase=${encodeURIComponent(char ? `λαμπάδα ${char} ${gender}` : `λαμπάδα ${gender}`)}`,
      query: char ? `λαμπάδα ${char} ${gender}` : `λαμπάδα ${gender}` });
  }
  if (month >= 5 && month <= 7) {
    tabs.push({ icon:'🩱', label:'Μαγιό', url: buildCatUrl('swimwear', kid), query: `μαγιό ${gender} ${age} ετών` });
  }
  if (month === 7 || month === 8) {
    tabs.push({ icon:'🎒', label:'Σχολικά', url: buildCatUrl('school_bags', kid), query: `σχολική τσάντα ${gender}` });
  }
  if (month === 9 || month === 10) {
    tabs.push({ icon:'🧥', label:'Χειμωνιάτικα', url: buildCatUrl('hoodies', kid), query: `φούτερ ${gender} ${age} ετών` });
  }
  if (month === 11) {
    tabs.push({ icon:'🎄', label:'Παιχνίδια',
      url: `https://www.skroutz.gr/search?keyphrase=${encodeURIComponent(char ? `παιχνίδια ${char} ${genderPl}` : `παιχνίδια ${genderPl}`)}`,
      query: char ? `παιχνίδια ${char} ${genderPl}` : `παιχνίδια ${genderPl}` });
  }
  return tabs;
}

// Open in Skroutz — για manual search fallback
function skroutzLink(query) {
  return `https://www.skroutz.gr/search?keyphrase=${encodeURIComponent(query)}`;
}

// Smart Skroutz URL builder — για manual search (Home search bar)
function buildSkroutzQuery(rawQuery, kid, selectedFilters = {}) {
  function nrm(s) {
    return (s||'').toLowerCase()
      .replace(/ά/g,'α').replace(/έ/g,'ε').replace(/ή/g,'η')
      .replace(/ί/g,'ι').replace(/ό/g,'ο').replace(/ύ/g,'υ').replace(/ώ/g,'ω');
  }
  const nq      = nrm(rawQuery);
  const gender  = kid?.gender === 'Αγόρι' ? 'αγόρι' : 'κορίτσι';
  const genderPl= kid?.gender === 'Αγόρι' ? 'αγόρια' : 'κορίτσια';
  const age     = kid?.age || 5;
  const char    = kid?.favoriteCharacter || kid?.favorite_character || '';

  // Ανίχνευση κατηγορίας → χρήση category URL αν υπάρχει
  if (['παπουτσ','sneaker','πεδιλ','σανδαλ','μποτ','μπαλαρ'].some(k=>nq.includes(nrm(k)))) {
    return buildCatUrl('sneakers', kid) || skroutzLink(rawQuery);
  }
  if (['μπλουζ','t-shirt','tshirt','polo'].some(k=>nq.includes(nrm(k)))) {
    return buildCatUrl('blouses', kid) || skroutzLink(rawQuery);
  }
  if (['παντελον','τζιν','jeans','κολαν'].some(k=>nq.includes(nrm(k)))) {
    return buildCatUrl('pants', kid) || skroutzLink(rawQuery);
  }
  if (['φορμ','tracksuit','jogger'].some(k=>nq.includes(nrm(k)))) {
    return buildCatUrl('tracksuits', kid) || skroutzLink(rawQuery);
  }
  if (['φουτερ','hoodie','sweatshirt'].some(k=>nq.includes(nrm(k)))) {
    return buildCatUrl('hoodies', kid) || skroutzLink(rawQuery);
  }
  if (['φορεμ','φουστ','dress'].some(k=>nq.includes(nrm(k)))) {
    return buildCatUrl('dresses', kid) || skroutzLink(rawQuery);
  }
  if (['μαγιο','swim','παραλι','μπικιν'].some(k=>nq.includes(nrm(k)))) {
    return buildCatUrl('swimwear', kid) || skroutzLink(`μαγιό ${gender} ${age} ετών`);
  }
  if (['σχολικ τσαντ','τσαντ σχολ','backpack'].some(k=>nq.includes(nrm(k)))) {
    return buildCatUrl('school_bags', kid) || skroutzLink(rawQuery);
  }
  if (['λαμπαδ','πασχαλιν'].some(k=>nq.includes(nrm(k)))) {
    return skroutzLink(char ? `λαμπάδα ${char} ${gender}` : `λαμπάδα ${gender}`);
  }
  if (['παιχνιδ','lego','playmobil','κουκλ','παζλ'].some(k=>nq.includes(nrm(k)))) {
    return skroutzLink(char ? `παιχνίδια ${char} ${genderPl}` : `παιχνίδια ${genderPl}`);
  }
  // Γενικό fallback
  return skroutzLink(`${rawQuery} ${gender}`);
}


// Dashboard component

function Dashboard({ kid, onSearch, onOpenBrowser }) {
  const reminders    = calcDashboardReminders(kid);
  const quickLinks   = getQuickLinks(kid);
  const seasonalTabs = getSeasonalTabs(kid);
const [showFilters, setShowFilters] = useState(false);
  const [actionItem, setActionItem] = useState(null);

  const urgencyColors = {
    high:   { bg: 'rgba(255,77,109,0.12)', border: 'rgba(255,77,109,0.35)', icon: '#ff4d6d' },
    medium: { bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.3)',  icon: '#fbbf24' },
    low:    { bg: 'rgba(99,102,241,0.1)',   border: 'rgba(99,102,241,0.3)',  icon: '#818cf8' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ActionModal */}
      {actionItem && (
        <ActionModal
          item={actionItem}
          kidName={kid?.name || ''}
          onClose={() => setActionItem(null)}
          onOpenBrowser={onOpenBrowser}
        />
      )}

      {/* Reminders */}
      {reminders.length > 0 && (
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10, padding:'0 4px' }}>
            <Bell size={12} style={{ color:'#ff4d6d' }} />
            <p style={{ fontSize:11, fontWeight:900, color:'#94a3b8', letterSpacing:'0.12em', textTransform:'uppercase' }}>
              Υπενθυμίσεις
            </p>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {reminders.map((r, i) => {
              const c = urgencyColors[r.urgency];
              return (
                <div key={i}
                  onClick={() => onSearch(r.searchQ)}
                  style={{
                    background: c.bg,
                    border: `1.5px solid ${c.border}`,
                    borderRadius: 18, padding: '14px 16px',
                    display: 'flex', alignItems: 'center', gap: 12,
                    cursor: 'pointer',
                  }}
                  className="active:scale-98 transition-all"
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 14,
                    background: `${c.icon}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, flexShrink: 0,
                  }}>{r.icon}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 900, color: '#1e293b', fontSize: 13, marginBottom: 2 }}>{r.title}</p>
                    <p style={{ fontSize: 11, color: '#64748b' }}>{r.subtitle}</p>
                  </div>
                  <ArrowRight size={16} style={{ color: c.icon }} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Seasonal tabs */}
      {seasonalTabs.length > 0 && (
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10, padding:'0 4px' }}>
            <span style={{ fontSize:12 }}>🌤️</span>
            <p style={{ fontSize:11, fontWeight:900, color:'#94a3b8', letterSpacing:'0.12em', textTransform:'uppercase' }}>
              Εποχιακά
            </p>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {seasonalTabs.map((tab, i) => (
              <button key={i}
                onClick={() => setActionItem({ label: tab.label, icon: tab.icon, url: tab.url, query: tab.query || tab.label })}
                style={{
                  background: 'linear-gradient(135deg,#ff6000,#ea580c)',
                  borderRadius: 14, padding: '10px 16px',
                  display: 'flex', alignItems: 'center', gap: 8,
                  cursor: 'pointer', boxShadow: '0 3px 10px rgba(255,96,0,0.35)',
                }}
                className="active:scale-95 transition-all"
              >
                <span style={{ fontSize: 18 }}>{tab.icon}</span>
                <div style={{ textAlign:'left' }}>
                  <p style={{ fontSize: 11, fontWeight: 900, color: 'white', margin:0 }}>{tab.label}</p>
                  <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.75)', margin:0 }}>Skroutz / Αποθήκευση</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick links — 3 columns grid */}
      <div>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10, padding:'0 4px' }}>
          <span style={{ fontSize:12 }}>🔍</span>
          <p style={{ fontSize:11, fontWeight:900, color:'#94a3b8', letterSpacing:'0.12em', textTransform:'uppercase' }}>
            Γρήγορη Αναζήτηση
          </p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8 }}>
          {quickLinks.map((ql, i) => (
            <button key={i}
              onClick={() => onOpenBrowser(ql.url)}
              style={{
                background: 'white', borderRadius: 16, padding: '14px 8px',
                border: '1.5px solid #f1f5f9',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                display: 'flex', flexDirection:'column', alignItems: 'center', gap: 6,
                cursor: 'pointer',
              }}
              className="active:scale-95 transition-all"
            >
              <span style={{ fontSize: 24 }}>{ql.icon}</span>
              <span style={{ fontWeight: 800, color: '#1e293b', fontSize: 10, textAlign:'center' }}>{ql.label}</span>
              <span style={{ fontSize: 8, color: '#7c3aed', fontWeight: 800 }}>Skroutz / Αποθήκευση</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const CATEGORY_FILTERS = {
  // ── ΠΑΠΟΥΤΣΙΑ ──
  παπουτσια: {
    type:['Sneakers / Αθλητικά','Casual / Καθημερινά','Πέδιλα / Σανδάλια','Μποτάκια','Μπαλαρίνες','Γυμναστηρίου'],
    size:['20','21','22','23','24','25','26','27','28','29','30','31','32','33','34','35','36','37','38','39'],
    closure:['Κορδόνια','Velcro / Σκρατς','Slip-On','Φερμουάρ'],
    season:['Καλοκαιρινά','Χειμωνιάτικα','Ανοιξιάτικα / Φθινοπωρινά'],
    features:['Αδιάβροχα','Διαπνέοντα / Mesh','Memory Foam','Ανατομικά','Με φωτάκια'],
    brand:['Nike','Adidas','Puma','New Balance','Skechers','Converse','Geox','Clarks','Primigi'],
  },
  // ── ΡΟΥΧΑ ──
  ρουχα: {
    type:['Μπλούζες / T-Shirts','Παντελόνια / Τζιν','Φόρμες / Joggers','Φορέματα / Φούστες','Μπουφάν / Σακάκια','Εσώρουχα / Κάλτσες','Πιτζάμες'],
    size:['68','74','80','86','92','98','104','110','116','122','128','134','140','146','152','158','164','170'],
    ageSize:['0-6 μηνών','6-12 μηνών','1-2 ετών','2-4 ετών','4-6 ετών','6-8 ετών','8-10 ετών','10-12 ετών','12-14 ετών'],
    season:['Καλοκαιρινά','Χειμωνιάτικα','Ανοιξιάτικα','Φθινοπωρινά'],
    material:['Βαμβάκι','Fleece / Πολυεστέρας','Δέρμα / Συνθετικό'],
    brand:['Zara Kids','H&M','DPAM','Orchestra','Mayoral','Name It','Mango Kids'],
  },
  // ── ΜΑΓΙΟ & ΚΑΛΟΚΑΙΡΙΝΑ ──
  μαγιο: {
    type:['Ολόσωμο Μαγιό','Μπικίνι / Δύο τεμάχια','Σορτς Θαλάσσης','Παρεό','Αντηλιακό Μαγιό (UV)'],
    size:['74','80','86','92','98','104','110','116','122','128','134','140','146','152','158','164'],
    ageSize:['0-2 ετών','2-4 ετών','4-6 ετών','6-8 ετών','8-10 ετών','10-12 ετών','12-14 ετών'],
    features:['UV Protection (UPF 50+)','Αντιχλωριακό','Quick Dry','Με φούστα','Με παντελόνι'],
    brand:['Speedo','Arena','Mayoral','Chicco','H&M','Zara Kids','DPAM','Name It'],
    season:['Καλοκαιρινό 2025'],
  },
  // ── ΣΤΟΛΕΣ ──
  στολη: {
    occasion:['Απόκριες / Halloween','Πάσχα','Χριστούγεννα','Θεατρικό / Παράσταση'],
    character:['Spiderman','Batman','Superman','Elsa / Frozen','Princess','Unicorn','Pirate','Ninja','Dinosaur','Witch','Paw Patrol','Minions'],
    theme:['Superheroes / Marvel / DC','Disney Princess','Horror / Τρόμος','Animals / Ζώα','Fantasy / Μαγεία','Vintage / Ρετρό'],
    ageSize:['2-4 ετών','4-6 ετών','6-8 ετών','8-10 ετών','10-12 ετών','12-14 ετών'],
  },
  // ── ΛΑΜΠΑΔΕΣ ──
  λαμπαδα: {
    occasion:['Πάσχα'],
    character:['Spiderman','Batman','Elsa','Princess','Unicorn','Paw Patrol','Dinosaur'],
    theme:['Superheroes / Marvel / DC','Disney Princess','Animals / Ζώα','Αθλητισμός'],
    features:['Με παιχνίδι','Με άρωμα','Χειροποίητη'],
  },
  // ── ΠΑΙΧΝΙΔΙΑ ──
  παιχνιδι: {
    ageRange:['0-1 ετών','1-3 ετών','3-5 ετών','5-7 ετών','7-10 ετών','10-14 ετών'],
    category:['Κούκλες & Λούτρινα','Αυτοκινητάκια & Οχήματα','Κατασκευές & LEGO','Επιτραπέζια & Παζλ','Εκπαιδευτικά','Υπαίθρια / Κήπος','Ηλεκτρονικά / Ρομπότ','Δημιουργικά / Τέχνη'],
    brand:['LEGO','Playmobil','Mattel','Hasbro','Fisher-Price','Chicco','Clementoni','Ravensburger'],
    features:['STEM / Εκπαιδευτικό','Διαδραστικό','Πολλαπλοί παίκτες','Για εξωτερικό χώρο'],
  },
  // ── ΣΧΟΛΙΚΑ ──
  σχολικη: {
    type:['Σχολικές Τσάντες','Κασετίνες','Μολύβια & Στυλό','Τετράδια & Μπλοκ','Χρώματα & Μαρκαδόροι','Γεωμετρικά'],
    character:['Spiderman','Frozen / Elsa','Disney','Unicorn','Minecraft','Among Us','Stitch'],
    ageRange:['Νηπιαγωγείο','Δημοτικό (Α-Γ)','Δημοτικό (Δ-ΣΤ)','Γυμνάσιο'],
    brand:['Polo','Faber-Castell','Pelikan','Maped','Stabilo','Miquelrius'],
  },
  // ── ΠΟΔΗΛΑΤΑ ──
  ποδηλατο: {
    type:['Ποδήλατα','Ισορροπίας (χωρίς πετάλια)','Σκούτερ / Πατίνι','Τρίκυκλο'],
    wheelSize:['12"','14"','16"','18"','20"','24"'],
    ageRange:['2-4 ετών','4-6 ετών','6-9 ετών','9-12 ετών'],
    features:['Με βοηθητικές ρόδες','Αναδιπλούμενο','Ηλεκτρικό'],
    brand:['Kinderkraft','Puky','Decathlon','Micro','Btwin'],
  },
  // ── TABLET ──
  tablet: {
    ageRange:['2-4 ετών','4-6 ετών','6-9 ετών','9-12 ετών'],
    features:['Θήκη προστασίας','Parental Control','WiFi only','4G'],
    brand:['Apple iPad','Samsung','Amazon Fire Kids','Leapfrog','VTech'],
    storage:['16GB','32GB','64GB','128GB'],
  },
  // ── ΚΑΘΙΣΜΑ ΑΥΤΟΚΙΝΗΤΟΥ ──
  'καθισμα αυτοκινητου': {
    group:['Ομάδα 0+ (0-13kg)','Ομάδα 1 (9-18kg)','Ομάδα 2/3 (15-36kg)','i-Size (40-105cm)','i-Size (76-150cm)'],
    installation:['ISOfix','Ζώνη Αυτοκινήτου','ISOfix + Ζώνη'],
    rotation:['Στροφή 360°','Χωρίς περιστροφή'],
    features:['Side Protection','Αεριζόμενο','Πτυσσόμενο'],
    brand:['Cybex','Maxi-Cosi','Britax Römer','Chicco','Joie','BeSafe'],
  },
  // ── ΚΑΡΟΤΣΙ ──
  καροτσι: {
    type:['Μονό / Solo','Duo / Travel System','Ελαφρύ / Umbrella','Δίδυμα','Jogger'],
    features:['Ανάκλιση 180° (Flat)','Αναδιπλούμενο','Συμβατό με Car Seat','Μεγάλο καλάθι','Ανάρτηση'],
    brand:['Cybex','Bugaboo','Maxi-Cosi','Joie','Kinderkraft','Silver Cross','Nuna'],
  },
  // ── ΑΘΛΗΤΙΚΑ ──
  αθλητικα: {
    sport:['Ποδόσφαιρο','Μπάσκετ','Κολύμβηση','Τένις','Γυμναστική','Χορός','Πολεμικές Τέχνες','Σκι / Snowboard'],
    type:['Ρούχα','Παπούτσια','Εξοπλισμός','Προστατευτικά'],
    ageRange:['3-5 ετών','5-8 ετών','8-12 ετών','12+ ετών'],
    brand:['Nike','Adidas','Puma','Under Armour','Decathlon'],
  },
  // ── ΒΡΕΦΙΚΑ ──
  βρεφικα: {
    type:['Ρούχα','Παπούτσια','Παιχνίδια','Φαγητό & Σίτιση','Μπάνιο & Περιποίηση','Ύπνος','Μεταφορά'],
    ageRange:['Νεογέννητο (0-3μ)','3-6 μηνών','6-12 μηνών','12-18 μηνών','18-24 μηνών'],
    brand:['Chicco','Fisher-Price','Philips Avent','NUK','Tommee Tippee','Graco'],
  },
};

function nm(s) {
  return (s||'').toLowerCase()
    .replace(/ά/g,'α').replace(/έ/g,'ε').replace(/ή/g,'η')
    .replace(/ί/g,'ι').replace(/ό/g,'ο').replace(/ύ/g,'υ').replace(/ώ/g,'ω');
}

function detectSuggestedFilters(query) {
  const q = nm(query);
  const mapping = [
    { keys: ['παπουτσ','sneaker','boot','sandal','πεδιλ','σανδαλ','μποτ','μπαλαρ','υποδημ'], cat: 'παπουτσια' },
    { keys: ['μαγιο','μαγιω','μπικιν','ολοσωμ','swimwear','swim','παρεο','θαλασσ','παραλι','καλοκαιρ','summer','beach'], cat: 'μαγιο' },
    { keys: ['ρουχ','μπλουζ','παντελον','φορεμ','ζακετ','μπουφαν','φορμ','κολαν','shirt','jeans','dress','πιτζαμ','μπλε','κοκκ'], cat: 'ρουχα' },
    { keys: ['στολ','αποκρι','halloween','cosplay','μεταμφι'], cat: 'στολη' },
    { keys: ['λαμπαδ','πασχαλιν'], cat: 'λαμπαδα' },
    { keys: ['παιχνιδ','lego','playmobil','κουκλ','λουτριν','παζλ','επιτραπεζ','toy'], cat: 'παιχνιδι' },
    { keys: ['σχολικ','τσαντ','κασετιν','μολυβ','τετραδ'], cat: 'σχολικη' },
    { keys: ['ποδηλατ','σκουτερ','πατιν','τρικυκλ'], cat: 'ποδηλατο' },
    { keys: ['tablet','ταμπλετ','ipad'], cat: 'tablet' },
    { keys: ['καθισμα αυτοκ','car seat','καθισμα'], cat: 'καθισμα αυτοκινητου' },
    { keys: ['καροτσ','stroller'], cat: 'καροτσι' },
    { keys: ['αθλητ','ποδοσφαιρ','μπασκετ','κολυμβ','τενις','γυμναστ'], cat: 'αθλητικα' },
    { keys: ['βρεφ','νεογεν','μωρ','baby'], cat: 'βρεφικα' },
  ];
  for (const { keys, cat } of mapping) {
    if (keys.some(k => q.includes(nm(k)))) return CATEGORY_FILTERS[cat] || null;
  }
  return null;
}

// ─────────────────────────────────────────────
// BOTTOM SHEET - Fixed, sits ABOVE nav bar
// ─────────────────────────────────────────────
function FilterSheet({ open, onClose, filters, selected, onToggle, onClear, onApply, resultCount, preSearch, category }) {
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    if (open) {
      const s = {};
      Object.keys(filters).slice(0,3).forEach(k => { s[k]=true; });
      setExpanded(s);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open, filters]);

  const activeCount = Object.values(selected).flat().length;
  const keys = Object.keys(filters);

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/60" style={{zIndex: 200}} onClick={onClose} />
      )}
      <div
        className={`fixed bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 max-w-md mx-auto flex flex-col ${open ? 'translate-y-0' : 'translate-y-full'}`} style={{ left:0, right:0, bottom:0, top:'8vh', zIndex:210 }}





      >
        {/* Handle */}
        <div className="flex justify-center pt-3 shrink-0">
          <div className="w-10 h-1.5 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-black text-sm uppercase tracking-wide">Φίλτρα</span>
            {preSearch && <span className="text-[9px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full font-bold">Πριν αναζήτηση</span>}
            {activeCount > 0 && <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">{activeCount}</span>}
          </div>
          <div className="flex items-center gap-3">
            {activeCount > 0 && (
              <button onClick={onClear} className="text-xs text-rose-500 font-bold">Καθαρισμός</button>
            )}
            <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto" style={{ overscrollBehavior:'contain' }}>
          <div className="px-5 py-2 pb-4">
            {keys.length === 0 ? (
              <p className="text-center text-slate-400 py-10 text-sm">Δεν βρέθηκαν φίλτρα</p>
            ) : keys.map(ftype => {
              const opts = filters[ftype];
              if (!opts?.length) return null;
              const isExp = expanded[ftype];
              const shown = isExp ? opts : opts.slice(0,7);
              return (
                <div key={ftype} className="border-b border-slate-100 py-3 last:border-0">
                  <button
                    onClick={() => setExpanded(p => ({...p,[ftype]:!p[ftype]}))}
                    className="w-full flex items-center justify-between py-1"
                  >
                    <span className="text-xs font-black uppercase tracking-wide text-slate-700">{ficon(ftype)} {fname(ftype)}</span>
                    <div className="flex items-center gap-2">
                      {selected[ftype]?.length > 0 && (
                        <span className="text-[9px] text-rose-500 font-bold">✓{selected[ftype].length}</span>
                      )}
                      {isExp ? <ChevronUp size={14} className="text-slate-400"/> : <ChevronDown size={14} className="text-slate-400"/>}
                    </div>
                  </button>
                  {isExp && (
                    <div className="mt-2 space-y-1.5">
                      {shown.map(opt => {
                        const active = selected[ftype]?.includes(opt);
                        const topPrefs = getTopPreferences(category || '', ftype, opts);
                        const isFavorite = topPrefs.includes(opt);
                        return (
                          <button key={opt} onClick={() => onToggle(ftype,opt)}
                            className={`w-full flex items-center justify-between px-3 py-3 rounded-xl border transition-all ${active ? 'bg-rose-50 border-rose-300' : isFavorite ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-transparent'}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium ${active ? 'text-rose-700' : 'text-slate-700'}`}>{opt}</span>
                              {isFavorite && !active && <span className="text-[9px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-bold">Συχνό</span>}
                            </div>
                            {active && <div className="w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center shrink-0"><Check size={11} className="text-white"/></div>}
                          </button>
                        );
                      })}
                      {opts.length > 7 && (
                        <button onClick={() => setExpanded(p => ({...p,[ftype]:!p[ftype]}))}
                          className="text-xs text-rose-500 font-bold ml-3 py-1">
                          {isExp ? '▲ Λιγότερα' : `+ ${opts.length-7} ακόμα`}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* APPLY — always visible */}
        <div className="shrink-0 px-5 py-4 bg-white border-t border-slate-100">
          <button onClick={onApply}
            className="w-full bg-rose-500 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-wide shadow-md active:scale-95 transition-all">
            {preSearch
              ? activeCount > 0 ? `🔍 Αναζήτηση με ${activeCount} φίλτρα` : '🔍 Αναζήτηση'
              : resultCount > 0 ? `Εμφάνιση ${resultCount} αποτελεσμάτων` : 'Εφαρμογή'
            }
          </button>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
export default function Home({ pendingSearch = '', onSearchConsumed }) {
  const { user, isAuthenticated } = useAuth();

  // ── Smart Browser (InAppBrowser) ──
  const smartBrowser = useSmartBrowser();
  const [browserLabel, setBrowserLabel] = useState('');

  const openSmartBrowser = (url, label = '') => {
    setBrowserLabel(label);
    smartBrowser.open(url, { label, kidName: currentKid?.name || '' });
  };
  const handleOpenSmartBrowser = openSmartBrowser;

  const [query, setQuery] = useState('');
  const [kids, setKids] = useState([]);
  const [selectedKidId, setSelectedKidId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notif, setNotif] = useState('');
  const [previewItem, setPreviewItem] = useState(null);
  const [searchHistory, setSearchHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sk_search_history') || '[]'); } catch { return []; }
  });
  const [showHistory, setShowHistory] = useState(false);

  const upcomingEvents = getUpcomingEvents();

  // ── States για φίλτρα και αποτελέσματα ──
  const [currentFilters, setCurrentFilters] = useState({});
  const [currentSelected, setCurrentSelected] = useState({});
  const [isPreSearch, setIsPreSearch] = useState(true);
  const [filteredResults, setFilteredResults] = useState(null);
  const [preSelected, setPreSelected] = useState({});
  const [categoryLabel, setCategoryLabel] = useState('');
  const [results, setResults] = useState(null);
  const [lastQuery, setLastQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState({});
  const [sortBy, setSortBy] = useState('best');
  const [preFilters, setPreFilters] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // activeCount — πόσα φίλτρα είναι ενεργά
  const activeCount = Object.values(activeFilters).flat().length;

  // ── Filter functions ──
  const toggleFilter = (type, val) => {
    if (!val) return;
    setActiveFilters(prev => {
      const cur = prev[type] || [];
      const next = cur.includes(val) ? cur.filter(x => x !== val) : [...cur, val];
      if (!next.length) { const { [type]: _, ...rest } = prev; return rest; }
      return { ...prev, [type]: next };
    });
  };

  const clearFilters = () => {
    setActiveFilters({});
    setPreSelected({});
    setSortBy('best');
  };

  // Load kids — Supabase for Google users, localStorage for guests
  async function loadKids() {
    try {
      if (isAuthenticated) {
        const supabaseKids = await supabaseService.getKids();
        if (supabaseKids.length === 0) {
          await supabaseService.migrateLocalStorage();
          const migrated = await supabaseService.getKids();
          setKids(migrated);
          if (migrated.length > 0) setSelectedKidId(prev => prev ?? migrated[0].id);
        } else {
          setKids(supabaseKids);
          if (supabaseKids.length > 0) setSelectedKidId(prev => prev ?? supabaseKids[0].id);
        }
      } else {
        // Guest mode — localStorage
        const saved = localStorage.getItem('smart-kids-list');
        if (saved) {
          const parsed = JSON.parse(saved).map(k => ({
            ...k,
            age: calcAge(k.birthdate || k.birthDate),
            shoeSize: k.shoeSize || k.shoe_size || '',
            clothingSize: k.clothingSize || k.clothing_size || '',
          }));
          setKids(parsed);
          if (parsed.length > 0) setSelectedKidId(prev => prev ?? parsed[0].id);
        }
      }
    } catch (err) {
      console.error('loadKids error:', err);
      // Fallback to localStorage
      const saved = localStorage.getItem('smart-kids-list');
      if (saved) {
        const parsed = JSON.parse(saved).map(k => ({
          ...k,
          age: calcAge(k.birthdate || k.birthDate),
          shoeSize: k.shoeSize || k.shoe_size || '',
          clothingSize: k.clothingSize || k.clothing_size || '',
        }));
        setKids(parsed);
        if (parsed.length > 0) setSelectedKidId(prev => prev ?? parsed[0].id);
      }
    }
  }

  // Φόρτωση kids όταν αλλάζει auth state
  useEffect(() => { loadKids(); }, [isAuthenticated]);

  // Ακούμε το event από Profile όταν προστίθεται/αλλάζει παιδί
  useEffect(() => {
    const handler = async () => {
      await loadKids();
      // Αν το selected kid διαγράφηκε, reset στο πρώτο
      setSelectedKidId(prev => {
        const stillExists = kids.find(k => k.id === prev);
        return stillExists ? prev : (kids[0]?.id ?? null);
      });
    };
    window.addEventListener('kids-updated', handler);
    return () => window.removeEventListener('kids-updated', handler);
  }, [isAuthenticated, kids]);

  // Όταν έρχεται pendingSearch από υπενθυμίσεις → περιμένουμε να φορτωθούν τα kids
  useEffect(() => {
    if (!pendingSearch) return;
    setQuery(pendingSearch);
    if (onSearchConsumed) onSearchConsumed();
    // Το search θα τρέξει μόλις φορτωθεί το currentKid (παρακάτω effect)
  }, [pendingSearch]);

  // Εκτελούμε αναζήτηση μόλις έχουμε query ΚΑΙ currentKid
  const pendingSearchRef = React.useRef('');
  useEffect(() => {
    if (pendingSearch) pendingSearchRef.current = pendingSearch;
  }, [pendingSearch]);

  useEffect(() => {
    if (!pendingSearchRef.current || !currentKid) return;
    const q = pendingSearchRef.current;
    pendingSearchRef.current = '';
    handleSearch(q);
  }, [kids, selectedKidId]);

  function calcAge(d) {
    if (!d) return 5;
    try {
      const t=new Date(), b=new Date(d);
      if (isNaN(b.getTime())) return 5;
      let a=t.getFullYear()-b.getFullYear();
      if(t.getMonth()-b.getMonth()<0||(t.getMonth()===b.getMonth()&&t.getDate()<b.getDate()))a--;
      return Math.max(0, a);
    } catch { return 5; }
  }

  const currentKid = kids.find(k => k.id===selectedKidId);
  const showNotif = msg => { setNotif(msg); setTimeout(()=>setNotif(''),2500); };

  // Open link in in-app browser (mobile) or new tab (web)
  const openLink = (url, label = '') => {
    openSmartBrowser(url, label);
  };

  const handleQueryChange = val => {
    setQuery(val);
    if (!results) { setPreFilters(detectSuggestedFilters(val)); setPreSelected({}); }
  };

  function buildEnrichedQuery(base, sel) {
    // Στέλνουμε μόνο την καθαρή αναζήτηση στον server
    // Τα φίλτρα εφαρμόζονται client-side στα αποτελέσματα
    return base.trim();
  }

  const handleSearch = async (searchQuery, filtersToApply={}) => {
    if (!searchQuery?.trim()) return;

    // Αποθήκευση history
    setSearchHistory(prev => {
      const trimmed = searchQuery.trim();
      const next = [trimmed, ...prev.filter(h => h !== trimmed)].slice(0, 10);
      localStorage.setItem('sk_search_history', JSON.stringify(next));
      return next;
    });
    setShowHistory(false);

    // Χτίζουμε το Skroutz URL με φίλτρα από το profile
    const skroutzUrl = buildSkroutzQuery(searchQuery, currentKid, filtersToApply);

    // Ανοίγουμε SmartBrowser αντί για SerpAPI
    openSmartBrowser(skroutzUrl, searchQuery);
  };

  const clearSearch = () => { setQuery(''); };
  const addToList = async (item) => {
    try {
      console.log('💾 Home: Saving with unified image extraction:', { title: item.title });
      
      const itemData = {
        title: item.title,
        price: item.priceValue || 0,
        priceLabel: item.price || '',
        thumbnail: item.thumbnail || null,
        link: item.buyLink || item.link,
        store: item.source || 'Skroutz',
        kidId: currentKid?.id || null
      };

      // Use unified saving function with image extraction
      await saveToWishlistWithImage(itemData, { 
        kidName: currentKid?.name || '', 
        isAuthenticated 
      });
      
      showNotif('🛒 Προστέθηκε!');
      window.dispatchEvent(new CustomEvent('shopping-list-updated'));
    } catch (error) {
      console.error('💾 Home: Failed to save to wishlist:', error);
      showNotif('❌ Σφάλμα!');
    }
  };

  return (
    <div style={{background:'#f8f8fc',minHeight:'100vh',paddingBottom:112}} className="max-w-md mx-auto font-sans">

      {/* SmartBrowser overlay — εμφανίζεται πάνω από τον InAppBrowser */}
      <SmartBrowserSheet
        browserState={smartBrowser.state}
        currentUrl={smartBrowser.currentUrl}
        isProduct={smartBrowser.isProduct}
        onClose={smartBrowser.close}
      />

      {notif && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-xl whitespace-nowrap">
          {notif}
        </div>
      )}

      <FilterSheet
        open={showFilters}
        onClose={()=>setShowFilters(false)}
        filters={currentFilters}
        selected={currentSelected}
        onToggle={toggleFilter}
        onClear={clearFilters}
        onApply={() => {
          if (isPreSearch) { setShowFilters(false); handleSearch(query,preSelected); }
          else setShowFilters(false);
        }}
        resultCount={filteredResults?.length||0}
        preSearch={isPreSearch}
        category={categoryLabel}
      />

      {/* HEADER */}
      <div style={{
        background: 'linear-gradient(160deg, #0f0f1a 0%, #1a1a2e 40%, #16213e 70%, #1a0a2e 100%)',
        paddingTop: 'max(48px, env(safe-area-inset-top, 48px))',
        paddingBottom: 72,
        paddingLeft: 20, paddingRight: 20,
        borderRadius: '0 0 36px 36px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        position:'relative', overflow:'hidden',
      }}>
        {/* Decorative glow orbs */}
        <div style={{position:'absolute',top:-40,right:-40,width:140,height:140,borderRadius:'50%',background:'radial-gradient(circle,rgba(255,77,109,0.25) 0%,transparent 70%)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',bottom:-20,left:-20,width:100,height:100,borderRadius:'50%',background:'radial-gradient(circle,rgba(167,139,250,0.2) 0%,transparent 70%)',pointerEvents:'none'}}/>

        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 style={{fontSize:26,fontWeight:900,fontStyle:'italic',letterSpacing:'-0.03em',color:'white',lineHeight:1}}>Smart <span style={{color:'#ff4d6d'}}>Kids</span></h1>
            <p style={{fontSize:9,color:'rgba(255,255,255,0.4)',letterSpacing:'0.15em',fontWeight:600,marginTop:3}}>SMART SHOPPING FOR PARENTS</p>
          </div>
          <div style={{width:38,height:38,borderRadius:12,background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <Sparkles style={{color:'#fbbf24'}} size={18}/>
          </div>
        </div>

        {/* Kid selector — prev/next αντί για horizontal scroll για να μη συγκρούεται με page swipe */}
        {kids.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            {kids.length > 1 && (
              <button
                onClick={() => {
                  const idx = kids.findIndex(k => k.id === selectedKidId);
                  const prev = kids[(idx - 1 + kids.length) % kids.length];
                  setSelectedKidId(prev.id);
                }}
                style={{width:32,height:32,borderRadius:10,background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:16,flexShrink:0}}>
                ‹
              </button>
            )}
            <div style={{flex:1,display:'flex',alignItems:'center',gap:10,background:'linear-gradient(135deg,#ff4d6d,#c9184a)',borderRadius:16,padding:'8px 14px',boxShadow:'0 4px 16px rgba(255,77,109,0.4)'}}>
              <span style={{fontSize:22}}>{kids.find(k=>k.id===selectedKidId)?.avatar}</span>
              <div style={{flex:1}}>
                <p style={{fontSize:12,fontWeight:900,color:'white',lineHeight:1}}>{kids.find(k=>k.id===selectedKidId)?.name}</p>
                <p style={{fontSize:9,color:'rgba(255,255,255,0.7)',marginTop:2}}>
                  {kids.find(k=>k.id===selectedKidId)?.age} ετών
                  {kids.find(k=>k.id===selectedKidId)?.shoeSize && ` · 👟 ${kids.find(k=>k.id===selectedKidId).shoeSize}`}
                  {kids.find(k=>k.id===selectedKidId)?.clothingSize && ` · 👕 ${kids.find(k=>k.id===selectedKidId).clothingSize}`}
                </p>
              </div>
              {kids.length > 1 && (
                <span style={{fontSize:9,color:'rgba(255,255,255,0.5)',fontWeight:700}}>
                  {kids.findIndex(k=>k.id===selectedKidId)+1}/{kids.length}
                </span>
              )}
            </div>
            {kids.length > 1 && (
              <button
                onClick={() => {
                  const idx = kids.findIndex(k => k.id === selectedKidId);
                  const next = kids[(idx + 1) % kids.length];
                  setSelectedKidId(next.id);
                }}
                style={{width:32,height:32,borderRadius:10,background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:16,flexShrink:0}}>
                ›
              </button>
            )}
          </div>
        )}

        <div className="relative">
          <input type="text"
            placeholder="π.χ. παπούτσια, στολή, καθίσματα..."
            value={query}
            onChange={e=>handleQueryChange(e.target.value)}
            onFocus={()=>{ if(searchHistory.length>0) setShowHistory(true); }}
            onBlur={()=>setTimeout(()=>setShowHistory(false),150)}
            onKeyDown={e=>e.key==='Enter'&&handleSearch(query,preSelected)}
            className="w-full bg-white px-5 py-4 pr-28 rounded-2xl shadow-lg text-sm font-semibold text-slate-700 outline-none"
          />
          <div className="absolute right-2 top-1.5 flex gap-1.5">
            {query && <button onClick={clearSearch} style={{padding:'10px',color:'rgba(255,255,255,0.5)'}}><X size={18}/></button>}
            <button onClick={()=>handleSearch(query,preSelected)} disabled={loading}
              style={{background:'linear-gradient(135deg,#ff4d6d,#c9184a)',color:'white',padding:'10px 12px',borderRadius:12,boxShadow:'0 4px 12px rgba(255,77,109,0.4)',display:'flex',alignItems:'center'}} className="active:scale-90 transition-transform">
              {loading ? <Loader2 size={18} className="animate-spin"/> : <Search size={18}/>}
            </button>
          </div>{/* SEARCH HISTORY DROPDOWN */}
          {showHistory && searchHistory.length > 0 && (
            <div style={{position:'absolute',top:'100%',left:0,right:0,marginTop:4,background:'white',borderRadius:16,boxShadow:'0 8px 32px rgba(0,0,0,0.15)',zIndex:50,overflow:'hidden',border:'1px solid #f0f0f5'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 16px',borderBottom:'1px solid #f0f0f5'}}>
                <span style={{fontSize:10,fontWeight:900,color:'#94a3b8',letterSpacing:'0.12em',textTransform:'uppercase'}}>Πρόσφατες αναζητήσεις</span>
                <button onMouseDown={()=>{ setSearchHistory([]); localStorage.removeItem('sk_search_history'); setShowHistory(false); }}
                  style={{fontSize:10,color:'#ff4d6d',fontWeight:700}}>Καθαρισμός</button>
              </div>
              {searchHistory.map((h, i) => (
                <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 16px',borderBottom:'1px solid #f8f8fc'}}>
                  <Clock size={13} style={{color:'#94a3b8',flexShrink:0}}/>
                  <button onMouseDown={()=>{ setQuery(h); handleSearch(h, {}); }}
                    style={{flex:1,textAlign:'left',fontSize:13,color:'#334155',fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{h}</button>
                  <button onMouseDown={()=>{ const next=searchHistory.filter((_,j)=>j!==i); setSearchHistory(next); localStorage.setItem('sk_search_history',JSON.stringify(next)); }}
                    style={{color:'#cbd5e1',padding:4}}><X size={12}/></button>
                </div>
              ))}
            </div>
          )}
        </div> {/* Κλείνει το search container */}

        {/* ΕΔΩ ΞΕΚΙΝΑΝΕ ΤΑ ΑΠΟΤΕΛΕΣΜΑΤΑ - ΔΕΝ ΚΛΕΙΝΟΥΜΕ ΤΟ MAIN DIV ΑΚΟΜΑ */}
        {!results && query && (
          <div className="mt-3 flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <button onClick={() => { if (!preFilters) { const f = detectSuggestedFilters(query); setPreFilters(f || {}); } setShowFilters(true); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-white text-xs font-bold shrink-0 ${activeCount > 0 ? 'bg-white/30 border-white' : 'bg-white/10 border-white/40'}`}>
              <SlidersHorizontal size={12} />
              Φίλτρα {activeCount > 0 && `(${activeCount})`}
            </button>
            {Object.values(preSelected).flat().slice(0, 3).map((val, i) => (
              <span key={i} className="bg-white/20 text-white text-[9px] font-bold px-2 py-1 rounded-full shrink-0 border border-white/30 whitespace-nowrap">{val}</span>
            ))}
          </div>
        )}
      </div>

      {/* MAIN */}
      <div className="px-4" style={{ marginTop: filteredResults ? 12 : -40 }}>

        {filteredResults && (
          <>
            <div style={{ background: 'white', borderRadius: 16, border: '1px solid #f1f5f9', padding: '10px 16px', marginBottom: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-800">{filteredResults.length} Προϊόντα</span>
                  {categoryLabel && <span className="text-[9px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-semibold">{categoryLabel}</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setShowFilters(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 10, fontSize: 11, fontWeight: 900, background: activeCount > 0 ? 'linear-gradient(135deg,#ff4d6d,#c9184a)' : '#f1f5f9', color: activeCount > 0 ? 'white' : '#64748b', border: 'none', boxShadow: activeCount > 0 ? '0 4px 12px rgba(255,77,109,0.3)' : 'none' }}>
                    <SlidersHorizontal size={13} />
                    ΦΙΛΤΡΑ
                    {activeCount > 0 && <span className="bg-white text-rose-500 rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-black">{activeCount}</span>}
                  </button>
                  {[{ v: 'best', i: '🏆' }, { v: 'price_low', i: '💰' }, { v: 'rating', i: '⭐' }].map(({ v, i }) => (
                    <button key={v} onClick={() => setSortBy(v)}
                      className={`w-8 h-8 rounded-xl text-sm ${sortBy === v ? 'bg-rose-500 text-white' : 'bg-slate-100'}`}>{i}</button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => handleOpenSmartBrowser(buildSkroutzQuery(query, currentKid, activeFilters))}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px', borderRadius: 10, fontSize: 11, fontWeight: 800, background: 'linear-gradient(135deg,#f97316,#ea580c)', color: 'white', border: 'none', boxShadow: '0 2px 8px rgba(249,115,22,0.35)' }}>
                <ExternalLink size={13} />
                Δες {activeCount > 0 ? 'φιλτραρισμένα' : 'όλα'} στο Skroutz
              </button>
            </div>

            {activeCount > 0 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-2">
                {Object.entries(activeFilters).map(([t, vals]) => vals.map(val => (
                  <button key={`${t}-${val}`} onClick={() => toggleFilter(t, val)}
                    className="flex items-center gap-1 bg-rose-100 text-rose-700 px-3 py-1.5 rounded-full text-[10px] font-bold shrink-0 whitespace-nowrap">
                    {val} <X size={10} />
                  </button>
                )))}
                <button onClick={clearFilters} className="bg-slate-200 text-slate-600 px-3 py-1.5 rounded-full text-[10px] font-bold shrink-0">Καθαρισμός</button>
              </div>
            )}

            {filteredResults.length === 0 ? (
              <div style={{ background: 'white', borderRadius: 20, padding: '40px 20px', textAlign: 'center', margin: '0 16px', border: '1.5px solid #f1f5f9' }}>
                <p style={{ color: '#94a3b8', fontWeight: 700, marginBottom: 16, fontSize: 14 }}>Κανένα αποτέλεσμα με αυτά τα φίλτρα</p>
                <button onClick={clearFilters} style={{ background: 'linear-gradient(135deg,#ff4d6d,#c9184a)', color: 'white', padding: '10px 24px', borderRadius: 12, fontSize: 11, fontWeight: 900, letterSpacing: '0.06em', boxShadow: '0 4px 12px rgba(255,77,109,0.4)' }}>ΚΑΘΑΡΙΣΜΟΣ</button>
              </div>
            ) : (
              <div className="space-y-3 pb-20">
                {filteredResults.map((item, idx) => {
                  const isBest = idx === 0 && sortBy === 'best';
                  return (
                    <div key={idx} style={{
                      background: isBest ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' : 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)',
                      border: isBest ? '1.5px solid rgba(251,191,36,0.5)' : '1.5px solid rgba(255,255,255,0.07)',
                      borderRadius: 20, padding: '12px', display: 'flex', gap: 12, position: 'relative',
                      boxShadow: isBest ? '0 4px 24px rgba(251,191,36,0.15)' : '0 2px 12px rgba(0,0,0,0.3)',
                    }}>
                      {isBest && (
                        <div style={{ position: 'absolute', top: 0, right: 0, background: 'linear-gradient(135deg,#f59e0b,#ef4444)', borderRadius: '0 18px 0 14px', padding: '4px 10px', fontSize: 8, fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: 3, boxShadow: '0 2px 8px rgba(245,158,11,0.4)' }}>
                          <Trophy size={8} /> TOP PICK
                        </div>
                      )}
                      <div style={{ width: 80, height: 80, borderRadius: 14, overflow: 'hidden', background: 'rgba(255,255,255,0.05)', flexShrink: 0, border: '1px solid rgba(255,255,255,0.08)' }}>
                        <img src={item.thumbnail} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.88)', lineHeight: 1.35, marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.title}</p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 18, fontWeight: 900, color: '#ff4d6d' }}>{item.price}</span>
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <button onClick={() => addToList(item)} className="p-2 bg-white/5 rounded-xl text-white active:scale-90"><ShoppingCart size={14} /></button>
                            <button onClick={() => handleTrackProduct(item.buyLink || item.link)} className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 active:scale-90"><Bell size={14} /></button>
                            <button onClick={() => handleOpenSmartBrowser(item.buyLink || item.link)} className="px-3 py-2 bg-gradient-to-r from-rose-500 to-rose-600 rounded-xl text-white text-[9px] font-black active:scale-90">ΑΓΟΡΑ</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* DASHBOARD + SEASONAL EVENTS */}
        {!results && !loading && (
          <div className="pt-2" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {currentKid && (
              <Dashboard
                kid={currentKid}
                onSearch={(q) => { setQuery(q); handleSearch(q, {}); }}
                onOpenBrowser={openSmartBrowser}
              />
            )}
            
            {upcomingEvents.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px', marginBottom: 12 }}>
                  <Calendar size={12} style={{ color: '#ff4d6d' }} />
                  <p style={{ fontSize: 11, fontWeight: 900, color: '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Επόμενες 30 μέρες</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {upcomingEvents.map(ev => (
                    <div key={ev.name} onClick={() => { setQuery(ev.q); handleSearch(ev.q); }}
                      style={{ background: 'white', padding: '14px 16px', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', border: '1.5px solid #f1f5f9', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }} className="active:scale-95 transition-all">
                      <div className="flex items-center gap-3">
                        <div style={{ width: 44, height: 44, borderRadius: 14, background: '#fff5f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{ev.icon}</div>
                        <div>
                          <p style={{ fontWeight: 900, color: '#1e293b', fontSize: 14, marginBottom: 4 }}>{ev.name}</p>
                          <div className="flex items-center gap-2">
                            <span style={{ fontSize: 10, color: '#94a3b8' }}>{ev.dateStr}</span>
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${ev.ongoing ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                              {ev.ongoing ? '🔴 ΤΩΡΑ' : ev.daysLeft === 0 ? 'ΣΗΜΕΡΑ!' : `σε ${ev.daysLeft} μέρες`}
                            </span>
                          </div>
                        </div>
                      </div>
                      <ArrowRight size={16} style={{ color: '#ff4d6d' }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!currentKid && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <p style={{ fontSize: 36, marginBottom: 12 }}>👶</p>
                <p style={{ color: '#94a3b8', fontWeight: 700, fontSize: 15 }}>Πρόσθεσε το παιδί σου</p>
              </div>
            )}
          </div>
        )} {/* <--- ΕΔΩ ΗΤΑΝ ΤΟ ΛΑΘΟΣ, ΕΚΛΕΙΣΕ Η ΠΑΡΕΝΘΕΣΗ ΤΟΥ !results */}

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={36} className="animate-spin text-rose-400" />
            <p style={{ color: '#94a3b8', fontWeight: 700, fontSize: 15 }}>Ψάχνω...</p>
          </div>
        )}
      </div>
    </div>
  );
} //
