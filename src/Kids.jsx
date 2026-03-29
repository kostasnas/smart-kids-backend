import React, { useState, useEffect } from 'react';
import { Baby, Plus, Trash2, Edit2, X, Info, PartyPopper, Share2, History } from 'lucide-react';

const Kids = () => {
  const [kids, setKids] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(null);
  const [formData, setFormData] = useState({
    name: '', birthDate: '', gender: 'Αγόρι', clothesSize: '', shoeSize: '', notes: '', avatar: '👶'
  });

  const avatars = ['👶', '👧', '👦', '🧸', '🦖', '🦄', '🚀', '🎨'];

  useEffect(() => {
    const savedKids = localStorage.getItem('smart-kids-list');
    if (savedKids) setKids(JSON.parse(savedKids));
  }, []);

  const saveToStorage = (updatedList) => {
    localStorage.setItem('smart-kids-list', JSON.stringify(updatedList));
    setKids(updatedList);
  };

  const getAgeInfo = (dateString) => {
    if (!dateString) return { text: '', daysUntil: 0 };
    const today = new Date();
    const birthDate = new Date(dateString);
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
      years--;
      months += 12;
    }
    return { 
      text: `${years > 0 ? years + ' ετών' : ''} ${months > 0 ? months + ' μηνών' : ''}`.trim() || 'Νεογέννητο',
      years: years
    };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.birthDate) return;

    let updatedKids;
    if (isEditing) {
      updatedKids = kids.map(k => k.id === isEditing ? { ...formData, id: k.id } : k);
      setIsEditing(null);
    } else {
      updatedKids = [...kids, { id: Date.now().toString(), ...formData }];
    }

    saveToStorage(updatedKids);
    setIsFormOpen(false);
    setFormData({ name: '', birthDate: '', gender: 'Αγόρι', clothesSize: '', shoeSize: '', notes: '', avatar: '👶' });
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 pb-24">
      <div className="bg-rose-500 p-8 pt-10 pb-12 rounded-b-[2.5rem] shadow-xl text-white flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3">
            <Baby size={24} /><h1 className="text-2xl font-black uppercase italic">Τα Παιδιά μου</h1>
          </div>
        </div>
        {!isFormOpen && <button onClick={() => setIsFormOpen(true)} className="bg-white text-rose-500 p-3 rounded-2xl shadow-lg"><Plus size={24} /></button>}
      </div>

      <div className="p-6 -mt-8">
        {isFormOpen && (
          <div className="bg-white rounded-[2.5rem] p-6 shadow-2xl mb-8 border-2 border-rose-100">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {avatars.map(av => (
                  <button key={av} type="button" onClick={() => setFormData({...formData, avatar: av})} className={`text-2xl p-2 rounded-xl border-2 ${formData.avatar === av ? 'border-rose-500' : 'border-transparent'}`}>{av}</button>
                ))}
              </div>
              <input type="text" placeholder="Όνομα" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold" />
              <div className="grid grid-cols-2 gap-4">
                <input type="date" value={formData.birthDate} onChange={(e) => setFormData({...formData, birthDate: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold" />
                <select value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold">
                  <option value="Αγόρι">Αγόρι</option>
                  <option value="Κορίτσι">Κορίτσι</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="Νο Ρούχου" value={formData.clothesSize} onChange={(e) => setFormData({...formData, clothesSize: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl font-bold" />
                <input type="text" placeholder="Νο Παπουτσιού" value={formData.shoeSize} onChange={(e) => setFormData({...formData, shoeSize: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl font-bold" />
              </div>
              <button type="submit" className="w-full py-4 rounded-2xl font-black text-white bg-rose-500 uppercase">Αποθήκευση</button>
            </form>
          </div>
        )}

        <div className="space-y-4">
          {kids.map((kid) => (
            <div key={kid.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="text-4xl w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center">{kid.avatar}</div>
                  <div>
                    <h3 className="font-black text-slate-800">{kid.name}</h3>
                    <p className="text-rose-500 text-[10px] font-bold uppercase">{getAgeInfo(kid.birthDate).text}</p>
                  </div>
                </div>
                <button onClick={() => { if(window.confirm('Διαγραφή;')) saveToStorage(kids.filter(k => k.id !== kid.id)) }} className="text-slate-300 hover:text-rose-500"><Trash2 size={18} /></button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-slate-50 p-2 rounded-xl"><p className="text-[8px] font-black uppercase text-slate-400">Ρούχα</p><p className="font-bold">{kid.clothesSize || '-'}</p></div>
                <div className="bg-slate-50 p-2 rounded-xl"><p className="text-[8px] font-black uppercase text-slate-400">Παπούτσι</p><p className="font-bold">{kid.shoeSize || '-'}</p></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Kids;