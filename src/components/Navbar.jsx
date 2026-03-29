import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, ShoppingCart, Tag, Baby, Home } from 'lucide-react';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/', icon: <Home size={24} />, label: 'Home' },
    { path: '/shopping', icon: <ShoppingCart size={24} />, label: 'Αγορές' },
    { path: '/offers', icon: <Tag size={24} />, label: 'Προσφορές' },
    { path: '/kids', icon: <Baby size={24} />, label: 'Παιδιά' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-3 pb-6 flex justify-between items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0,05)]">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center gap-1 transition-all ${
              isActive ? 'text-indigo-600 scale-110' : 'text-slate-400'
            }`}
          >
            <div className={`${isActive ? 'bg-indigo-50 p-2 rounded-xl' : ''}`}>
              {item.icon}
            </div>
            <span className="text-[10px] font-black uppercase tracking-tighter">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default Navbar;