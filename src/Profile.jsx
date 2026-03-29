import React, { useState, useEffect } from 'react';
import { useAuth } from './components/AuthProvider';
import { supabaseService } from './services/supabase';
import { User, UserPlus, Edit2, Trash2, LogOut, Baby, Bell, BellOff, ChevronRight, X, ShoppingBag } from 'lucide-react';

const Profile = () => {
  const { user, isAuthenticated, signOut, signInWithGoogle } = useAuth();
  const [kids, setKids] = useState([]);
  const [showAddKid, setShowAddKid] = useState(false);
  const [editingKid, setEditingKid] = useState(null);

  useEffect(() => { loadKids(); }, [isAuthenticated]);

  async function loadKids() {
    try {
      console.log('📥 Loading kids profiles...', { isAuthenticated });
      
      if (isAuthenticated) {
        console.log('🔄 Fetching from Supabase...');
        const data = await supabaseService.getKids();
        console.log('✅ Kids loaded from Supabase:', data);
        setKids(data);
      } else {
        const saved = localStorage.getItem('smart-kids-list');
        if (saved) {
          const parsed = JSON.parse(saved);
          console.log('📦 Kids loaded from localStorage:', parsed);
          setKids(parsed.map(k => ({ ...k, age: calculateAge(k.birthdate || k.birthDate) })));
        }
      }
    } catch (error) {
      console.error('❌ Error loading kids:', error);
    }
  }

  function calculateAge(birthdate) {
    if (!birthdate) return 5;
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  // Υπολογισμός ημερών μέχρι τα γενέθλια
  function daysUntilBirthday(birthdate) {
    if (!birthdate) return null;
    const today = new Date();
    const bday  = new Date(birthdate);
    const next  = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
    if (next < today) next.setFullYear(today.getFullYear() + 1);
    return Math.round((next - today) / (1000 * 60 * 60 * 24));
  }

  // Μήνες από τελευταία αγορά
  function monthsSince(dateStr) {
    if (!dateStr) return null;
    return Math.floor((new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24 * 30));
  }

  const handleSignOut = async () => {
    if (window.confirm('Αποσύνδεση;')) await signOut();
  };

  const handleDeleteKid = async (kidId) => {
    if (!window.confirm('Διαγραφή προφίλ;')) return;
    try {
      if (isAuthenticated) {
        await supabaseService.deleteKid(kidId);
      } else {
        const updated = kids.filter(k => k.id !== kidId);
        localStorage.setItem('smart-kids-list', JSON.stringify(updated));
      }
      loadKids();
    } catch (error) {
      alert('Σφάλμα διαγραφής');
    }
  };

  // Ενημέρωση FCM profile όταν αλλάξουν τα παιδιά
  function syncFCMProfile(updatedKids) {
    try {
      const token   = localStorage.getItem('fcm_token');
      const userId  = localStorage.getItem('user-id');
      if (!token || !userId) return;
      const profile = {
        children: updatedKids.map(k => ({
          name:              k.name,
          birthday:          k.birthdate || k.birthDate || '',
          lastShoeUpdate:    k.lastShoeUpdate || '',
          lastClothesUpdate: k.lastClothesUpdate || '',
          notifyBirthday:    k.notifyBirthday    !== false,
          notifySize:        k.notifySize        !== false,
          notifySchool:      k.notifySchool      !== false,
          notifySeasonal:    k.notifySeasonal    !== false,
        }))
      };
      fetch('https://smart-kids-api.onrender.com/api/register-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, token, profile }),
      }).catch(() => {});
    } catch {}
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 pb-28">

      {/* Header */}
      <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-8 pt-12 pb-10 rounded-b-[2.5rem] shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-white mb-1">Προφίλ</h1>
            <p className="text-purple-100 text-sm font-semibold">
              {isAuthenticated ? user?.email : 'Guest Mode'}
            </p>
          </div>
          {isAuthenticated ? (
            <button onClick={handleSignOut}
              className="bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 active:scale-95 transition-all">
              <LogOut size={14} /> Έξοδος
            </button>
          ) : (
            <button onClick={signInWithGoogle}
              className="bg-white text-purple-600 px-4 py-2 rounded-xl text-xs font-bold active:scale-95 transition-all">
              Σύνδεση
            </button>
          )}
        </div>
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold ${
          isAuthenticated ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'
        }`}>
          {isAuthenticated ? '🔒 Synced Account' : '📱 Local Storage'}
        </div>
      </div>

      <div className="px-4 -mt-6">

        {/* Kids Section */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-slate-800 flex items-center gap-2">
              <Baby size={20} />
              Τα Παιδιά μου ({kids.length})
            </h2>
            <button onClick={() => setShowAddKid(true)}
              className="bg-purple-500 text-white p-2 rounded-xl active:scale-95 transition-all">
              <UserPlus size={18} />
            </button>
          </div>

          {kids.length === 0 ? (
            <div className="text-center py-8">
              <Baby size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-400 text-sm font-bold mb-3">Δεν έχεις προσθέσει παιδιά ακόμα</p>
              <button onClick={() => setShowAddKid(true)}
                className="bg-purple-500 text-white px-6 py-3 rounded-xl font-bold text-sm active:scale-95 transition-all">
                Πρόσθεσε το πρώτο παιδί
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {kids.map(kid => {
                const bdayDays   = daysUntilBirthday(kid.birthdate || kid.birthDate);
                const shoeMonths = monthsSince(kid.lastShoeUpdate);
                const clothMonths = monthsSince(kid.lastClothesUpdate);
                return (
                  <div key={kid.id} className="bg-slate-50 rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-2xl shrink-0">
                        {kid.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-slate-800 text-sm">{kid.name}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span>{kid.age} ετών</span>
                          <span>•</span>
                          <span>{kid.gender}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          {(kid.shoe_size || kid.shoeSize) && (
                            <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-bold">
                              👟 {kid.shoe_size || kid.shoeSize}
                            </span>
                          )}
                          {(kid.clothing_size || kid.clothingSize) && (
                            <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-bold">
                              👕 {kid.clothing_size || kid.clothingSize}
                            </span>
                          )}
                          {/* Προτιμήσεις */}
                          {(kid.favoriteCharacter || kid.favorite_character) && (
                            <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md font-bold">
                              🦸 {kid.favoriteCharacter || kid.favorite_character}
                            </span>
                          )}
                          {(kid.favoriteSport || kid.favorite_sport) && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md font-bold">
                              ⚽ {kid.favoriteSport || kid.favorite_sport}
                            </span>
                          )}
                          {/* Birthday countdown */}
                          {bdayDays !== null && bdayDays <= 14 && (
                            <span className="text-[10px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded-md font-bold">
                              🎂 {bdayDays === 0 ? 'Σήμερα!' : `σε ${bdayDays} μέρες`}
                            </span>
                          )}
                          {/* Size alerts */}
                          {shoeMonths !== null && shoeMonths >= 6 && (
                            <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md font-bold">
                              👟 Νέο νούμερο;
                            </span>
                          )}
                          {clothMonths !== null && clothMonths >= 6 && (
                            <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md font-bold">
                              👕 Νέα ρούχα;
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setEditingKid(kid)}
                          className="p-2 bg-slate-200 rounded-xl text-slate-600 active:scale-95 transition-all">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDeleteKid(kid.id)}
                          className="p-2 bg-rose-100 rounded-xl text-rose-600 active:scale-95 transition-all">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Guest warning */}
        {!isAuthenticated && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
            <h3 className="font-bold text-amber-900 text-sm mb-2 flex items-center gap-2">
              ⚠️ Δεδομένα σε αυτήν τη συσκευή
            </h3>
            <p className="text-xs text-amber-800 leading-relaxed mb-3">
              Τα δεδομένα αποθηκεύονται μόνο τοπικά. Κάνε σύνδεση για backup στο cloud.
            </p>
            <button onClick={signInWithGoogle}
              className="w-full bg-amber-500 text-white py-2 rounded-xl text-xs font-bold active:scale-95">
              Σύνδεση με Google
            </button>
          </div>
        )}

        {/* App Info */}
        <div className="bg-white rounded-2xl p-4 text-center">
          <p className="text-slate-400 text-xs">Smart Kids App v2.0</p>
          <p className="text-slate-400 text-[10px] mt-1">Powered by Supabase & Render</p>
        </div>
      </div>

      {/* Add/Edit Kid Modal */}
      {(showAddKid || editingKid) && (
        <KidFormModal
          kid={editingKid}
          isAuthenticated={isAuthenticated}
          onClose={() => { setShowAddKid(false); setEditingKid(null); }}
          onSave={() => { loadKids(); syncFCMProfile(kids); }}
        />
      )}
    </div>
  );
};

// ── Kid Form Modal ──────────────────────────────────────────
function KidFormModal({ kid, isAuthenticated, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name:              kid?.name || '',
    avatar:            kid?.avatar || '👶',
    gender:            kid?.gender || 'Αγόρι',
    birthdate:         kid?.birthdate || kid?.birthDate || '',
    shoeSize:          kid?.shoe_size || kid?.shoeSize || '',
    clothingSize:      kid?.clothing_size || kid?.clothingSize || '',
    // Νέα πεδία
    lastShoeUpdate:    kid?.lastShoeUpdate    || '',
    lastClothesUpdate: kid?.lastClothesUpdate || '',
    // Προτιμήσεις παιδιού
    favoriteCharacter: kid?.favoriteCharacter || kid?.favorite_character || '',
    favoriteSport:     kid?.favoriteSport     || kid?.favorite_sport     || '',
    // Notification preferences
    notifyBirthday:    kid?.notifyBirthday    !== false,
    notifySize:        kid?.notifySize        !== false,
    notifySchool:      kid?.notifySchool      !== false,
    notifySeasonal:    kid?.notifySeasonal    !== false,
  });
  const [saving, setSaving]     = useState(false);
  const [showNotifPrefs, setShowNotifPrefs] = useState(false);

  const avatars       = ['👶','👧','👦','🧒','👼','🐣','🦄','🐻','🐰','🦁'];
  const shoeSizes     = ['17','18','19','20','21','22','23','24','25','26','27','28','29','30','31','32','33','34','35','36','37','38','39','40'];
  const clothingSizes = ['50','56','62','68','74','80','86','92','98','104','110','116','122','128','134','140','146','152','158','164','170'];

  const set = (key, val) => setFormData(f => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    if (!formData.name || !formData.birthdate) {
      alert('Συμπλήρωσε όνομα και ημερομηνία γέννησης!');
      return;
    }
    setSaving(true);
    try {
      console.log('💾 Saving kid profile:', { 
        isAuthenticated, 
        kid: kid?.id || 'new', 
        formData: { 
          name: formData.name, 
          birthdate: formData.birthdate,
          gender: formData.gender,
          shoeSize: formData.shoeSize,
          clothingSize: formData.clothingSize
        }
      });
      
      if (isAuthenticated) {
        if (kid) {
          console.log('🔄 Updating existing kid in Supabase...');
          await supabaseService.updateKid(kid.id, formData);
        } else {
          console.log('➕ Creating new kid in Supabase...');
          await supabaseService.createKid(formData);
        }
        console.log('✅ Kid saved successfully to Supabase!');
      } else {
        const saved = localStorage.getItem('smart-kids-list');
        const list  = saved ? JSON.parse(saved) : [];
        if (kid) {
          localStorage.setItem('smart-kids-list', JSON.stringify(list.map(k => k.id === kid.id ? { ...k, ...formData } : k)));
        } else {
          list.push({ id: Date.now(), ...formData });
          localStorage.setItem('smart-kids-list', JSON.stringify(list));
        }
      }
      onSave();
      onClose();
      // Ειδοποιούμε τις άλλες σελίδες ότι άλλαξαν τα kids
      window.dispatchEvent(new CustomEvent('kids-updated'));

      // 🎉 Welcome suggestions — μόνο για ΝΕΟ παιδί (όχι edit)
      if (!kid) {
        const fcmToken = localStorage.getItem('fcm_token');
        const userId   = localStorage.getItem('user-id');
        if (fcmToken) {
          // Υπολογισμός ηλικίας από birthdate
          const calcAge = (bd) => {
            if (!bd) return 5;
            const today = new Date(), birth = new Date(bd);
            let age = today.getFullYear() - birth.getFullYear();
            if (today.getMonth() - birth.getMonth() < 0 ||
                (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
            return Math.max(0, age);
          };
          const kidPayload = {
            name:        formData.name,
            gender:      formData.gender,
            age:         calcAge(formData.birthdate),
            shoeSize:    formData.shoeSize || '',
            clothingSize: formData.clothingSize || '',
            favoriteCharacter: formData.favoriteCharacter || '',
            favoriteSport:     formData.favoriteSport || '',
          };
          // Fire & forget — δεν περιμένουμε
          fetch('https://smart-kids-api.onrender.com/api/welcome-suggestions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, token: fcmToken, kid: kidPayload }),
          }).catch(() => {});
        }
      }
    } catch (error) {
      alert('Σφάλμα αποθήκευσης');
    } finally {
      setSaving(false);
    }
  };

  // Toggle switch component
  const Toggle = ({ value, onChange, label, icon }) => (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
      <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
        <span>{icon}</span>{label}
      </span>
      <button type="button" onClick={() => onChange(!value)}
        className={`w-12 h-6 rounded-full transition-all relative ${value ? 'bg-purple-500' : 'bg-slate-200'}`}>
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${value ? 'left-7' : 'left-1'}`} />
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900 z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
        <h2 className="text-xl font-black text-slate-800">
          {kid ? 'Επεξεργασία Παιδιού' : 'Προσθήκη Παιδιού'}
        </h2>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl">
          <X size={24} className="text-slate-600" />
        </button>
      </div>

      {/* Form */}
      <div className="max-w-md mx-auto px-6 py-6 pb-48 space-y-4">

        {/* Βασικά στοιχεία */}
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Βασικά στοιχεία</p>

          {/* Όνομα */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Όνομα *</label>
            <input type="text" value={formData.name}
              onChange={e => set('name', e.target.value)}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-semibold focus:border-purple-500 outline-none"
              placeholder="π.χ. Νίκος" />
          </div>

          {/* Avatar */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Avatar</label>
            <div className="grid grid-cols-5 gap-2">
              {avatars.map(emoji => (
                <button key={emoji} type="button" onClick={() => set('avatar', emoji)}
                  className={`text-3xl p-3 rounded-xl transition-all ${formData.avatar === emoji ? 'bg-purple-100 scale-110' : 'bg-slate-100'}`}>
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Φύλο */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Φύλο *</label>
            <div className="grid grid-cols-2 gap-3">
              {['Αγόρι','Κορίτσι'].map(g => (
                <button key={g} type="button" onClick={() => set('gender', g)}
                  className={`py-3 rounded-xl font-bold transition-all ${formData.gender === g ? 'bg-purple-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Ημερομηνία γέννησης */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              🎂 Ημερομηνία Γέννησης *
            </label>
            <input type="date" value={formData.birthdate}
              onChange={e => set('birthdate', e.target.value)}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-semibold focus:border-purple-500 outline-none"
              required />
            <p className="text-xs text-slate-400 mt-1">Θα λαμβάνεις υπενθύμιση 7 και 3 μέρες πριν τα γενέθλια</p>
          </div>
        </div>

        {/* Μεγέθη */}
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Μεγέθη</p>

          {/* Νούμερο παπουτσιού */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">👟 Νούμερο Παπουτσιού</label>
            <select value={formData.shoeSize} onChange={e => set('shoeSize', e.target.value)}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-semibold focus:border-purple-500 outline-none">
              <option value="">Επιλογή...</option>
              {shoeSizes.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Τελευταία αγορά παπουτσιών */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              📅 Τελευταία αγορά παπουτσιών
            </label>
            <input type="date" value={formData.lastShoeUpdate}
              onChange={e => set('lastShoeUpdate', e.target.value)}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-semibold focus:border-purple-500 outline-none" />
            <p className="text-xs text-slate-400 mt-1">Υπενθύμιση μετά από 6 μήνες</p>
          </div>

          {/* Μέγεθος ρούχων */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">👕 Μέγεθος Ρούχων</label>
            <select value={formData.clothingSize} onChange={e => set('clothingSize', e.target.value)}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-semibold focus:border-purple-500 outline-none">
              <option value="">Επιλογή...</option>
              {clothingSizes.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Τελευταία αγορά ρούχων */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              📅 Τελευταία αγορά ρούχων
            </label>
            <input type="date" value={formData.lastClothesUpdate}
              onChange={e => set('lastClothesUpdate', e.target.value)}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-semibold focus:border-purple-500 outline-none" />
            <p className="text-xs text-slate-400 mt-1">Υπενθύμιση μετά από 6 μήνες</p>
          </div>
        </div>

        {/* Προτιμήσεις */}
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Προτιμήσεις</p>
          <p className="text-xs text-slate-400 -mt-3">Βοηθάει τον AI Σύμβουλο να κάνει καλύτερες προτάσεις</p>

          {/* Αγαπημένος χαρακτήρας */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">🦸 Αγαπημένος Χαρακτήρας / Θέμα</label>
            <input type="text" value={formData.favoriteCharacter}
              onChange={e => set('favoriteCharacter', e.target.value)}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-semibold focus:border-purple-500 outline-none"
              placeholder="π.χ. Spiderman, Frozen, Minecraft..." />
          </div>

          {/* Αγαπημένο άθλημα */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">⚽ Αγαπημένο Άθλημα / Χόμπι</label>
            <input type="text" value={formData.favoriteSport}
              onChange={e => set('favoriteSport', e.target.value)}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-semibold focus:border-purple-500 outline-none"
              placeholder="π.χ. Ποδόσφαιρο, Κολύμβηση, Μπαλέτο..." />
          </div>
        </div>

        {/* Ειδοποιήσεις */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button type="button" onClick={() => setShowNotifPrefs(!showNotifPrefs)}
            className="w-full flex items-center justify-between p-6 active:bg-slate-50 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center">
                <Bell size={16} className="text-purple-600" />
              </div>
              <div className="text-left">
                <p className="font-black text-slate-800 text-sm">Ειδοποιήσεις</p>
                <p className="text-xs text-slate-400">
                  {[formData.notifyBirthday, formData.notifySize, formData.notifySchool, formData.notifySeasonal].filter(Boolean).length} / 4 ενεργές
                </p>
              </div>
            </div>
            <ChevronRight size={16} className={`text-slate-400 transition-transform ${showNotifPrefs ? 'rotate-90' : ''}`} />
          </button>

          {showNotifPrefs && (
            <div className="px-6 pb-4">
              <Toggle value={formData.notifyBirthday} onChange={v => set('notifyBirthday', v)}
                label="Γενέθλια" icon="🎂" />
              <Toggle value={formData.notifySize} onChange={v => set('notifySize', v)}
                label="Αλλαγή μεγέθους" icon="👟" />
              <Toggle value={formData.notifySchool} onChange={v => set('notifySchool', v)}
                label="Σχολική χρονιά" icon="🏫" />
              <Toggle value={formData.notifySeasonal} onChange={v => set('notifySeasonal', v)}
                label="Εποχιακές αγορές" icon="🌤️" />
            </div>
          )}
        </div>
      </div>

      {/* Submit — fixed above nav bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 70px)' }}>
        <div className="max-w-md mx-auto bg-white border-t border-slate-200 px-6 pt-4 pb-2">
          <button type="button" onClick={handleSubmit} disabled={saving}
            className="w-full bg-purple-600 text-white py-5 rounded-2xl font-black text-base uppercase tracking-wide active:scale-95 transition-all disabled:opacity-50 shadow-2xl">
            {saving ? '⏳ Αποθήκευση...' : kid ? '✓ ΕΝΗΜΕΡΩΣΗ' : '✓ ΔΗΜΙΟΥΡΓΙΑ'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Profile;
