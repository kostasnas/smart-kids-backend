import React, { useState, useEffect } from 'react';
import { Tag, Flame, ExternalLink, RefreshCw, Loader2, AlertCircle } from 'lucide-react';

const Offers = () => {
  const [kids, setKids] = useState([]);
  const [selectedKid, setSelectedKid] = useState(null);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);

  // 1. Φόρτωση παιδιών και σωστός υπολογισμός ηλικίας
  useEffect(() => {
    const saved = localStorage.getItem('smart-kids-list');
    if (saved) {
      const parsed = JSON.parse(saved).map(kid => {
        const birth = new Date(kid.birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
          age--;
        }
        return { ...kid, age: age || 0 }; // Αν η ηλικία είναι NaN, βάζουμε 0
      });

      setKids(parsed);
      if (parsed.length > 0) {
        setSelectedKid(parsed[0]);
        fetchOffers(parsed[0]);
      }
    }
  }, []);

  // 2. Λήψη προσφορών από τον Server (IP: 192.168.178.65)
  const fetchOffers = async (kid) => {
    if (!kid) return;
    setLoading(true);

    // Fail-safe για την ηλικία
    const finalAge = kid.age !== undefined ? kid.age : 0;

    try {
      // Δημιουργούμε ένα τυχαίο query προσφοράς
      const queries = [
        `προσφορές παιδικά ρούχα ${kid.gender === 'Αγόρι' ? 'αγόρι' : 'κορίτσι'} ${finalAge} ετών`,
        `εκπτώσεις παιχνίδια για ${finalAge} ετών`,
        `παπούτσια προσφορές ${kid.gender === 'Αγόρι' ? 'αγόρι' : 'κορίτσι'}`
      ];
      const query = queries[Math.floor(Math.random() * queries.length)];

      // Χρήση της IP του υπολογιστή σου αντί για localhost
      const url = `http://192.168.178.65:3001/api/search?q=${encodeURIComponent(query)}&gender=${encodeURIComponent(kid.gender)}&age=${finalAge}`;

      console.log("FETCHING FROM:", url); // Θα το δούμε στο Logcat

      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');

      const data = await response.json();

      // Διαμόρφωση των αποτελεσμάτων
      const formatted = (data.shopping_results || []).map(item => ({
        id: item.product_id || Math.random().toString(),
        title: item.title,
        price: item.price,
        store: item.source || 'Κατάστημα',
        image: item.thumbnail,
        link: item.link || item.product_link,
        discount: item.extracted_price < (item.old_price || 999) ? 'ΠΡΟΣΦΟΡΑ' : null
      }));

      setOffers(formatted);
    } catch (error) {
      console.error("Error fetching offers:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 pb-24 bg-slate-50 min-h-screen">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Flame className="text-amber-500" fill="currentColor" />
            Προσφορές
          </h1>
          <button
            onClick={() => fetchOffers(selectedKid)}
            className="p-2 bg-white rounded-full shadow-sm active:rotate-180 transition-transform duration-500"
          >
            <RefreshCw size={20} className="text-slate-600" />
          </button>
        </div>

        {/* Επιλογή Παιδιού */}
        <div className="flex gap-2 mb-8 overflow-x-auto py-2 no-scrollbar">
          {kids.map(kid => (
            <button
              key={kid.id}
              onClick={() => { setSelectedKid(kid); fetchOffers(kid); }}
              className={`px-5 py-2.5 rounded-2xl whitespace-nowrap text-xs font-bold transition-all ${
                selectedKid?.id === kid.id
                ? 'bg-amber-500 text-white shadow-lg shadow-amber-200 scale-105'
                : 'bg-white text-slate-600 border border-slate-100'
              }`}
            >
              {kid.name} ({kid.age} ετών)