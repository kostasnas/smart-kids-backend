import React, { useState, useEffect } from 'react';
import { ShoppingBasket, Trash2, ExternalLink, ArrowLeft, Package } from 'lucide-react';
import { Link } from 'react-router-dom';

const Shopping = () => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const savedItems = localStorage.getItem('tracked-items');
    if (savedItems) {
      setItems(JSON.parse(savedItems));
    }
  }, []);

  const removeItem = (id) => {
    const filtered = items.filter(item => item.id !== id);
    setItems(filtered);
    localStorage.setItem('tracked-items', JSON.stringify(filtered));
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 pb-24 font-sans text-slate-900">
      <div className="bg-rose-500 p-8 pt-12 pb-16 rounded-b-[3.5rem] text-white shadow-xl">
        <div className="flex items-center gap-4 mb-4">
          <Link to="/" className="p-2 bg-white/20 rounded-full text-white"><ArrowLeft size={20}/></Link>
          <h1 className="text-2xl font-black italic uppercase tracking-tighter">Shopping List</h1>
        </div>
        <p className="text-rose-100 text-[10px] font-bold uppercase tracking-widest ml-12">
          {items.length} Προϊόντα στη λίστα σου
        </p>
      </div>

      <div className="p-6 -mt-10">
        {items.length === 0 ? (
          <div className="bg-white rounded-[3rem] p-12 text-center shadow-sm border border-slate-100">
            <Package size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="font-black text-slate-400 uppercase text-[10px] tracking-widest leading-relaxed">Δεν έχεις προσθέσει ακόμα κάποιο προϊόν.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-50 flex flex-col gap-4">
                <div className="flex gap-4 items-center">
                  <img src={item.thumbnail} alt="" className="w-16 h-16 rounded-3xl object-cover bg-slate-50 shadow-inner" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold text-rose-500 uppercase mb-1 tracking-tighter">{item.kidName}</p>
                    <h3 className="font-black text-slate-800 text-[11px] leading-tight uppercase line-clamp-2">{item.title}</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 italic">{item.store}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between px-2">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Τιμή</span>
                    <span className="font-black text-slate-900 text-lg">
                      {item.price ? Number(item.price).toFixed(2) : "0.00"}€
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button onClick={() => removeItem(item.id)} className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:text-rose-500 transition-colors active:scale-90">
                      <Trash2 size={18} />
                    </button>
                    {/* ΤΩΡΑ ΤΟ LINK ΕΙΝΑΙ ΕΝΕΡΓΟ ΚΑΙ ΕΔΩ */}
                    <a 
                      href={item.link} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-90 no-underline"
                    >
                      <ExternalLink size={18} />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Shopping;