import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { PushNotifications } from '@capacitor/push-notifications';
import { useAuth } from './components/AuthProvider';
import { supabaseService } from './services/supabase';
import { UnifiedModal } from './components/UnifiedModal';
import {
  ShoppingBasket, Trash2, ExternalLink, Bell, BellOff,
  TrendingDown, Calendar, ChevronRight, RefreshCw, X, Sparkles
} from 'lucide-react';

function getSeasonalReminders(kids) {
  const now = new Date();
  const month = now.getMonth();
  const reminders = [];

  kids.forEach(kid => {
    const age    = kid.age || 5;
    const name   = kid.name || 'Παιδί';
    const gender = kid.gender === 'Αγόρι' ? 'αγόρι' : 'κορίτσι';
    const shoe   = kid.shoeSize || kid.shoe_size || '';
    const cloth  = kid.clothingSize || kid.clothing_size || '';
    const char   = kid.favoriteCharacter || kid.favorite_character || '';

    // Σεπτέμβριος — νέο νούμερο παπουτσιού
    if (month === 8) {
      reminders.push({
        id: `size-${kid.id}-sep`, icon: '👟',
        title: `Έλεγξε νούμερο για ${name}!`,
        body: `Σεπτέμβριος — μήπως χρειάζεται νέο νούμερο; (τρέχον: ${shoe || 'άγνωστο'})`,
        color: 'blue',
        skroutzUrl: `https://www.skroutz.gr/search?keyphrase=${encodeURIComponent('παιδικά παπούτσια ' + gender + (shoe ? ' ' + shoe : ''))}`,
        urgency: 'medium',
      });
    }
    // Μάρτιος — ανοιξιάτικα ρούχα
    if (month === 2) {
      reminders.push({
        id: `size-${kid.id}-mar`, icon: '🌸',
        title: `Ανοιξιάτικα ρούχα για ${name}`,
        body: `Μπλούζες, παντελόνια — μέγεθος ${cloth || 'άγνωστο'}`,
        color: 'blue',
        skroutzUrl: `https://www.skroutz.gr/search?keyphrase=${encodeURIComponent('παιδικές μπλούζες ' + gender)}`,
        urgency: 'medium',
      });
    }
    // Αύγουστος/Σεπτέμβριος — σχολικά
    if (age >= 5 && (month === 7 || month === 8)) {
      reminders.push({
        id: `school-${kid.id}`, icon: '🎒',
        title: `Σχολικά για ${name}!`,
        body: `Νέα σχολική χρονιά — τσάντα, κασετίνα, βιβλία!`,
        color: 'green',
        skroutzUrl: `https://www.skroutz.gr/search?keyphrase=${encodeURIComponent('σχολική τσάντα ' + gender)}`,
        urgency: month === 8 ? 'high' : 'medium',
      });
    }
    // Οκτώβριος/Νοέμβριος — χειμωνιάτικα
    if (month === 9 || month === 10) {
      reminders.push({
        id: `winter-${kid.id}`, icon: '🧥',
        title: `Χειμωνιάτικα για ${name}`,
        body: `Φούτερ, μπουφάν — μέγεθος ${cloth || 'άγνωστο'}`,
        color: 'indigo',
        skroutzUrl: `https://www.skroutz.gr/search?keyphrase=${encodeURIComponent('φούτερ ' + gender)}`,
        urgency: 'low',
      });
    }
    // Νοέμβριος/Δεκέμβριος — Χριστούγεννα
    if (month === 10 || month === 11) {
      reminders.push({
        id: `xmas-${kid.id}`, icon: '🎄',
        title: `Χριστουγεννιάτικα δώρα για ${name}`,
        body: `Ψάξε νωρίς για καλύτερες τιμές!`,
        color: 'red',
        skroutzUrl: `https://www.skroutz.gr/search?keyphrase=${encodeURIComponent(char ? 'παιχνίδια ' + char + ' ' + (gender === 'αγόρι' ? 'αγόρια' : 'κορίτσια') : 'παιχνίδια ' + (gender === 'αγόρι' ? 'αγόρια' : 'κορίτσια'))}`,
        urgency: month === 11 ? 'high' : 'medium',
      });
    }
    // Απρίλιος/Μάιος — καλοκαιρινά
    if (month === 3 || month === 4) {
      reminders.push({
        id: `summer-${kid.id}`, icon: '☀️',
        title: `Καλοκαιρινά για ${name}`,
        body: `Μαγιό, πέδιλα — νούμερο ${shoe || 'άγνωστο'}`,
        color: 'amber',
        skroutzUrl: `https://www.skroutz.gr/search?keyphrase=${encodeURIComponent('μαγιό ' + gender + ' ' + age + ' ετών')}`,
        urgency: 'low',
      });
    }
    // Μάρτιος/Απρίλιος — Πάσχα λαμπάδες
    if (month === 2 || month === 3) {
      reminders.push({
        id: `easter-${kid.id}`, icon: '🕯️',
        title: `Λαμπάδα για ${name}`,
        body: `Πάσχα — ψάξε λαμπάδα έγκαιρα!`,
        color: 'amber',
        skroutzUrl: `https://www.skroutz.gr/search?keyphrase=${encodeURIComponent(char ? 'λαμπάδα ' + char + ' ' + gender : 'λαμπάδα ' + gender)}`,
        urgency: 'medium',
      });
    }
  });
  return reminders;
}

const URGENCY_STYLES = {
  high:   { bg: 'bg-rose-50',  border: 'border-rose-200',  badge: 'bg-rose-500 text-white',  text: 'text-rose-700'  },
  medium: { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-500 text-white', text: 'text-amber-700' },
  low:    { bg: 'bg-slate-50', border: 'border-slate-200', badge: 'bg-slate-500 text-white', text: 'text-slate-600' },
};

const Shopping = ({ notificationInbox = [], onClearInbox }) => {
  const { user, isAuthenticated } = useAuth();
  const [items, setItems]                           = useState([]);
  const [kids, setKids]                             = useState([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [priceDrops, setPriceDrops]                 = useState([]);
  const [reminders, setReminders]                   = useState([]);
  const [dismissedReminders, setDismissedReminders] = useState([]);
  const [checkingPrices, setCheckingPrices]         = useState(false);
  const [lastChecked, setLastChecked]               = useState(null);
  const [activeTab, setActiveTab]                   = useState('list');
  const [previewItem, setPreviewItem]               = useState(null);
  const [modalItem, setModalItem]                   = useState(null);
  const [isModalOpen, setIsModalOpen]               = useState(false);

  const openLink = async (url) => {
    if (Capacitor.isNativePlatform()) { await Browser.open({ url }); }
    else { window.open(url, '_blank'); }
  };

  const handleOpenModal = (item) => {
    setModalItem(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalItem(null);
  };

  function calcAge(birthDate) {
    if (!birthDate) return 5;
    const today = new Date(); const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return Math.max(0, age);
  }

  useEffect(() => {
    loadItems(); loadKids(); checkNotificationPermission();
    const dismissed = JSON.parse(localStorage.getItem('dismissed-reminders') || '[]');
    setDismissedReminders(dismissed);
    const interval = setInterval(() => checkPrices(), 5 * 60 * 1000);
    // Ακούμε αλλαγές από AI Advisor
    const handler = () => loadItems();
    window.addEventListener('shopping-list-updated', handler);
    window.addEventListener('kids-updated', loadKids);
    return () => {
      clearInterval(interval);
      window.removeEventListener('shopping-list-updated', handler);
      window.removeEventListener('kids-updated', loadKids);
    };
  }, []);

  useEffect(() => {
    if (kids.length > 0) setReminders(getSeasonalReminders(kids));
  }, [kids]);

  const loadKids = async () => {
    try {
      let parsed = [];
      if (isAuthenticated) { parsed = await supabaseService.getKids(); }
      else { const s = localStorage.getItem('smart-kids-list'); if (s) parsed = JSON.parse(s); }
      setKids(parsed.map(k => ({ ...k, age: calcAge(k.birthDate || k.birthdate) })));
    } catch (e) {
      const s = localStorage.getItem('smart-kids-list');
      if (s) setKids(JSON.parse(s).map(k => ({ ...k, age: calcAge(k.birthDate) })));
    }
  };

  const loadItems = async () => {
    try {
      // Πάντα φορτώνουμε από localStorage (AI suggestions αποθηκεύονται εκεί)
      const s = localStorage.getItem('tracked-items');
      const localItems = s ? JSON.parse(s) : [];
      if (isAuthenticated && localItems.filter(i => !i.fromAI).length === 0) {
        // Αν δεν υπάρχουν local items, φόρτωσε από Supabase
        try {
          const data = await supabaseService.getWishlist();
          const supaItems = data.map(i => ({ id: i.id, title: i.title, thumbnail: i.thumbnail, price: i.current_price, store: i.store, link: i.product_link, kidName: i.kids_profiles?.name, addedAt: i.created_at }));
          setItems([...localItems, ...supaItems]);
        } catch { setItems(localItems); }
      } else {
        setItems(localItems);
      }
    } catch (e) { const s = localStorage.getItem('tracked-items'); if (s) setItems(JSON.parse(s)); }
  };

  const checkNotificationPermission = async () => {
    if (Capacitor.isNativePlatform()) {
      const { receive } = await PushNotifications.checkPermissions();
      setNotificationsEnabled(receive === 'granted');
    } else if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  };

  const requestNotificationPermission = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        // Ζητάμε άδεια
        const { receive } = await PushNotifications.requestPermissions();
        if (receive === 'granted') {
          // Εγγραφή στο FCM
          await PushNotifications.register();

          // Παίρνουμε το FCM token
          PushNotifications.addListener('registration', token => {
            console.log('📱 FCM Token:', token.value);
            localStorage.setItem('fcm-token', token.value);
            setNotificationsEnabled(true);
          });

          PushNotifications.addListener('registrationError', err => {
            console.error('FCM registration error:', err);
          });

          // Λαμβάνουμε notifications όταν είναι ανοιχτή η app
          PushNotifications.addListener('pushNotificationReceived', notification => {
            console.log('📬 Push received:', notification);
          });

          // Κλικ σε notification
          PushNotifications.addListener('pushNotificationActionPerformed', action => {
            console.log('👆 Push action:', action);
          });
        }
      } else {
        const p = await Notification.requestPermission();
        setNotificationsEnabled(p === 'granted');
        if (p === 'granted') {
          new Notification('Smart Kids 🎉', {
            body: 'Θα σε ειδοποιώ για πτώσεις τιμών!',
            icon: '/icon.png',
          });
        }
      }
    } catch (e) { console.error(e); }
  };

  const sendPriceDropNotification = async (item, oldPrice, newPrice, discount) => {
    const title = `🔥 Μείωση -${discount}%!`;
    const body = `${item.title.substring(0, 50)}: ${oldPrice}€ → ${newPrice}€`;
    try {
      if (!Capacitor.isNativePlatform() && notificationsEnabled) {
        new Notification(title, { body, icon: item.thumbnail, tag: `drop-${item.id}` });
      }
      // Native: το FCM στέλνει από τον server αυτόματα
    } catch (e) { console.error(e); }
  };

  const checkPrices = async () => {
    if (items.length === 0) return;
    setCheckingPrices(true);
    const drops = [];
    for (const item of items) {
      try {
        const res = await fetch(`https://smart-kids-api.onrender.com/api/search?q=${encodeURIComponent(item.title)}`);
        const data = await res.json();
        if (data.shopping_results?.[0]) {
          const match = data.shopping_results[0].price?.match(/[\d.,]+/)?.[0];
          if (match) {
            const currentPrice = parseFloat(match.replace(',', '.'));
            if (currentPrice < item.price * 0.95) {
              const discount = Math.round(((item.price - currentPrice) / item.price) * 100);
              drops.push({ ...item, oldPrice: item.price, newPrice: currentPrice, discount });
              await sendPriceDropNotification(item, item.price, currentPrice, discount);
              updateItemPrice(item.id, currentPrice);
            }
          }
        }
      } catch (e) {}
    }
    if (drops.length > 0) setPriceDrops(drops);
    setLastChecked(new Date());
    setCheckingPrices(false);
  };

  const updateItemPrice = (id, newPrice) => {
    const updated = items.map(i => i.id === id ? { ...i, price: newPrice } : i);
    setItems(updated);
    localStorage.setItem('tracked-items', JSON.stringify(updated));
  };

  const removeItem = async (id) => {
    try {
      if (isAuthenticated) await supabaseService.removeFromWishlist(id);
      const updated = items.filter(i => i.id !== id);
      setItems(updated);
      if (!isAuthenticated) localStorage.setItem('tracked-items', JSON.stringify(updated));
    } catch (e) {}
  };

  const sendTestNotification = async () => {
    const userId = localStorage.getItem('user-id');
    const token  = localStorage.getItem('fcm_token');
    if (!userId || !token) {
      alert('Δεν βρέθηκε FCM token. Βεβαιώσου ότι έχεις δώσει άδεια notifications.');
      return;
    }
    try {
      const res = await fetch(`https://smart-kids-api.onrender.com/api/test-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.success) alert('✅ Test notification στάλθηκε!');
      else alert('❌ Σφάλμα: ' + (data.error || 'άγνωστο'));
    } catch (e) {
      alert('❌ Σφάλμα σύνδεσης στον server');
    }
  };

  const visibleReminders = reminders.filter(r => !dismissedReminders.includes(r.id));

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 pb-28">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 px-5 pt-12 pb-6 rounded-b-[2rem] shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <ShoppingBasket size={24} /> Λίστα μου
            </h1>
            {/* Auth sync indicator */}
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isAuthenticated ? 'bg-emerald-400' : 'bg-amber-400'}`}/>
              <span className="text-[10px] text-white/40 font-semibold">
                {isAuthenticated ? 'Συνδεδεμένος · Cloud sync' : 'Guest · Τοπική αποθήκευση'}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {/* Test notification button */}
            <button onClick={sendTestNotification}
              className="bg-white/10 p-2.5 rounded-xl active:scale-95"
              title="Test notification">
              <Bell size={18} className="text-white/70" />
            </button>
            <button onClick={() => checkPrices()} disabled={checkingPrices}
              className="bg-white/10 p-2.5 rounded-xl active:scale-95 disabled:opacity-50">
              <RefreshCw size={18} className={`text-white ${checkingPrices ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={notificationsEnabled ? undefined : requestNotificationPermission}
              className={`p-2.5 rounded-xl active:scale-95 ${notificationsEnabled ? 'bg-emerald-500' : 'bg-white/10'}`}>
              {notificationsEnabled ? <Bell size={18} className="text-white" /> : <BellOff size={18} className="text-white/60" />}
            </button>
          </div>
        </div>
        <div className="flex bg-white/10 rounded-xl p-1 gap-1">
          <button onClick={() => setActiveTab('list')}
            className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'list' ? 'bg-white text-slate-800' : 'text-white/70'}`}>
            🛒 Λίστα ({items.length})
          </button>
          <button onClick={() => setActiveTab('notifications')}
            className={`flex-1 py-2 rounded-lg text-xs font-black transition-all relative ${activeTab === 'notifications' ? 'bg-white text-slate-800' : 'text-white/70'}`}>
            🔔 Ειδοπ.
            {notificationInbox.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-[8px] font-black text-white flex items-center justify-center">{notificationInbox.length}</span>}
          </button>
          <button onClick={() => setActiveTab('reminders')}
            className={`flex-1 py-2 rounded-lg text-xs font-black transition-all relative ${activeTab === 'reminders' ? 'bg-white text-slate-800' : 'text-white/70'}`}>
            📅 Υπενθ.
            {visibleReminders.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-[8px] font-black text-white flex items-center justify-center">{visibleReminders.length}</span>}
          </button>
        </div>
        {lastChecked && <p className="text-white/40 text-[9px] text-center mt-2">Τελευταίος έλεγχος: {lastChecked.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}</p>}
      </div>

      <div className="px-4 mt-4">
        {/* OLD PREVIEW MODAL - REMOVED */}
        {/* Now using UnifiedModal below */}
      </div>

      {/* Unified Modal */}
      <UnifiedModal 
        isOpen={isModalOpen}
        item={modalItem}
        onClose={handleCloseModal}
        hideSaveButton={true}
        source="shopping"
      />

      {activeTab === 'list' && (
        <>
          {!notificationsEnabled && items.length > 0 && (
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-4 mb-4 flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl shrink-0"><Bell size={20} className="text-white" /></div>
              <div className="flex-1">
                <p className="text-white font-black text-xs mb-0.5">Ενεργοποίησε ειδοποιήσεις!</p>
                <p className="text-white/80 text-[10px]">Μάθε πρώτος για πτώσεις τιμών</p>
              </div>
              <button onClick={requestNotificationPermission}
                className="bg-white text-amber-600 px-3 py-2 rounded-xl text-[10px] font-black shrink-0 active:scale-95">ΟΝ</button>
            </div>
            )}
            {priceDrops.length > 0 && (
              <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingDown size={18} className="text-emerald-600" />
                  <h3 className="font-black text-emerald-800 text-sm flex-1">🎉 Μειώσεις τιμών!</h3>
                  <button onClick={() => setPriceDrops([])} className="text-emerald-400 text-[10px] font-bold">Καθαρισμός</button>
                </div>
                {priceDrops.map(drop => (
                  <div key={drop.id}
                    onClick={() => openLink(drop.link)}
                    className="bg-white rounded-xl p-3 mb-2 last:mb-0 cursor-pointer active:scale-98 transition-all">
                    <p className="text-[11px] font-bold text-slate-700 line-clamp-1 mb-1">{drop.title}</p>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 line-through text-xs">{drop.oldPrice}€</span>
                        <span className="text-emerald-700 font-black text-sm">{drop.newPrice}€</span>
                        <span className="bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">-{drop.discount}%</span>
                      </div>
                      <span className="text-[9px] text-emerald-600 font-bold flex items-center gap-1">
                        <ExternalLink size={9} /> Αγορά
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {items.length > 0 && (
              <div className="flex justify-end mb-2">
                <button onClick={() => {
                  if (window.confirm('Καθαρισμός όλης της λίστας;')) {
                    setItems([]);
                    localStorage.removeItem('tracked-items');
                  }
                }} className="text-[10px] text-rose-400 font-bold flex items-center gap-1">
                  <X size={10} /> Καθαρισμός λίστας
                </button>
              </div>
            )}
            {items.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border-2 border-dashed border-slate-200 mt-4">
                <ShoppingBasket size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-500 font-black mb-2">Κενή λίστα αγορών</p>
                <p className="text-slate-400 text-xs leading-relaxed mb-4">Πήγαινε στον <strong>AI Σύμβουλος</strong> και ρώτησέ τον για προϊόντα.<br/>Πάτα "Αποθήκευση" σε κάθε πρόταση που σου αρέσει!</p>
                <div className="flex flex-col gap-2">
                  <div className="bg-violet-50 rounded-xl p-3 text-left flex items-center gap-3">
                    <span className="text-2xl">✨</span>
                    <div>
                      <p className="text-xs font-black text-violet-800">π.χ. "Τι παπούτσια να πάρω;"</p>
                      <p className="text-[10px] text-violet-600">Ο AI ξέρει το νούμερο του παιδιού σου</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map(item => (
                  <div key={item.id} className={`bg-white rounded-3xl p-4 shadow-sm border-2 flex gap-3 ${item.fromAI ? 'border-violet-100' : 'border-slate-100'}`}>
                    {/* Icon ή thumbnail */}
                    {item.fromAI ? (
                      <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg,#ede9fe,#fae8ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 24 }}>
                        ✨
                      </div>
                    ) : item.thumbnail ? (
                      <img src={item.thumbnail} alt="" onClick={() => handleOpenModal(item)} className="w-14 h-14 rounded-2xl object-cover bg-slate-100 shrink-0 cursor-pointer active:scale-95 transition-transform" onError={e => e.target.style.display = 'none'} referrerPolicy="no-referrer" />
                    ) : null}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 text-[11px] leading-tight line-clamp-2 mb-1.5">{item.title}</p>
                      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                        {item.fromAI && <span className="text-[8px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md">AI Πρόταση</span>}
                        {item.kidName && <span className="text-[8px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md">{item.kidName}</span>}
                        {item.priceLabel && <span className="text-[8px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{item.priceLabel}</span>}
                        {item.addedAt && <span className="text-[8px] text-slate-300">{new Date(item.addedAt).toLocaleDateString('el-GR', { day: 'numeric', month: 'short' })}</span>}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-900 font-black text-xl">{item.price}€</span>
                        <div className="flex gap-2">
                          <button onClick={() => openLink(item.link)} className="bg-amber-500 text-white px-3 py-2 rounded-xl text-[9px] font-black uppercase flex items-center gap-1 active:scale-90 transition-transform">ΑΓΟΡΑ <ExternalLink size={9}/></button>
                          <button onClick={() => removeItem(item.id)} className="p-2.5 bg-rose-50 text-rose-500 rounded-xl active:scale-90 transition-transform"><Trash2 size={14}/></button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'notifications' && (
          <>
            {notificationInbox.length === 0 ? (
              <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-slate-200 mt-4">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Bell size={32} className="text-slate-300" />
                </div>
                <p className="text-slate-500 font-black mb-1">Δεν υπάρχουν ειδοποιήσεις</p>
                <p className="text-slate-400 text-xs">Θα εμφανίζονται εδώ οι ειδοποιήσεις για γενέθλια, μεγέθη και προσφορές</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">🔔 Πρόσφατες ειδοποιήσεις</p>
                {notificationInbox.map((notif, i) => {
                  const hasLink = !!notif.data?.link;
                  const icons = { birthday:'🎂', size:'👟', school:'🏫', welcome_suggestion:'🛍️', seasonal:'🌤️', christmas:'🎄', default:'🔔' };
                  const icon = icons[notif.data?.type] || icons.default;
                  return (
                    <div key={i}
                      onClick={() => hasLink && openLink(notif.data.link)}
                      className={`bg-white rounded-2xl p-4 shadow-sm border-2 border-slate-100 flex gap-3 ${hasLink ? 'cursor-pointer active:scale-98 transition-all' : ''}`}>
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center shrink-0 text-2xl">
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 text-sm mb-1">{notif.title}</p>
                        <p className="text-slate-500 text-xs leading-relaxed">{notif.body}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[9px] text-slate-300">{notif.timestamp}</span>
                          {hasLink && (
                            <span className="text-[9px] text-amber-600 font-bold flex items-center gap-1">
                              <ExternalLink size={9} /> Δες
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <button onClick={onClearInbox} className="w-full py-2 text-center text-[10px] text-slate-400 font-bold border-t border-slate-100">Καθαρισμός</button>
              </div>
            )}
          </>
        )}

        {activeTab === 'reminders' && (
          <>
            {visibleReminders.length === 0 ? (
              <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-slate-200 mt-4">
                <Sparkles size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-500 font-black mb-1">Όλα καλά!</p>
                <p className="text-slate-400 text-xs">Δεν υπάρχουν υπενθυμίσεις αυτή τη στιγμή.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">📅 Εποχιακές υπενθυμίσεις</p>
                {visibleReminders.map(reminder => {
                  const style = URGENCY_STYLES[reminder.urgency] || URGENCY_STYLES.low;
                  return (
                    <div key={reminder.id} className={`${style.bg} border-2 ${style.border} rounded-2xl p-4 relative`}>
                      <button onClick={() => dismissReminder(reminder.id)} className="absolute top-3 right-3 text-slate-300 active:scale-90"><X size={14} /></button>
                      <div className="flex items-start gap-3">
                        <span className="text-2xl shrink-0">{reminder.icon}</span>
                        <div className="flex-1 pr-4">
                          <p className={`font-black text-sm ${style.text} mb-0.5`}>{reminder.title}</p>
                          <p className="text-slate-500 text-[11px] leading-relaxed mb-3">{reminder.body}</p>
                          <button
                            onClick={() => openLink(reminder.skroutzUrl)}
                            className={`${style.badge} px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-1.5 w-fit active:scale-95`}>
                            <ExternalLink size={11} /> Δες στο Skroutz
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Shopping;