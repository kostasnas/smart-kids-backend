import React, { useState, useEffect } from 'react';
import { Trash2, CheckCircle, Circle, ShoppingBasket } from 'lucide-react';

const NeedsList = () => {
  const [needs, setNeeds] = useState([]);

  // Λειτουργία για το φόρτωμα των δεδομένων
  const loadNeeds = () => {
    const saved = localStorage.getItem('needs-list');
    if (saved) {
      setNeeds(JSON.parse(saved));
    }
  };

  // 1. Φόρτωση κατά την εκκίνηση
  useEffect(() => {
    loadNeeds();

    // 2. ΑΥΤΟ ΕΙΝΑΙ ΤΟ ΚΛΕΙΔΙ: Ακούει για αλλαγές από άλλες σελίδες (όπως ο AI Advisor)
    const handleStorageChange = () => {
      loadNeeds();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const toggleNeed = (id) => {
    const updated = needs.map(n => 
      n.id === id ? { ...n, completed: !n.completed } : n
    );
    setNeeds(updated);
    localStorage.setItem('needs-list', JSON.stringify(updated));
  };

  const deleteNeed = (id) => {
    const updated = needs.filter(n => n.id !== id);
    setNeeds(updated);
    localStorage.setItem('needs-list', JSON.stringify(updated));
  };

  if (needs.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400">
        <ShoppingBasket className="mx-auto mb-2 opacity-20" size={48} />
        <p>Η λίστα είναι άδεια.</p>
        <p className="text-xs mt-1">Ζητήστε από τον AI Σύμβουλο να βρει προσφορές!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {needs.map((need) => (
        <div 
          key={need.id} 
          className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
            need.completed ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-3">
            <button 
              onClick={() => toggleNeed(need.id)}
              className={need.completed ? 'text-green-500' : 'text-slate-300'}
            >
              {need.completed ? <CheckCircle size={22} /> : <Circle size={22} />}
            </button>
            <span className={`text-sm font-medium ${need.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
              {need.text}
            </span>
          </div>
          <button 
            onClick={() => deleteNeed(need.id)}
            className="text-slate-400 hover:text-red-500 p-1 transition-colors"
          >
            <Trash2 size={18} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default NeedsList;