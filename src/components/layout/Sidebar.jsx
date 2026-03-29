import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Baby, 
  ShoppingBag, 
  Bot, 
  Tag,
  Settings,
  LogOut
} from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    { path: '/', icon: <LayoutDashboard size={22} />, label: 'Dashboard' },
    { path: '/kids', icon: <Baby size={22} />, label: 'Παιδιά' },
    { path: '/shopping', icon: <ShoppingBag size={22} />, label: 'Αγορές' },
    { path: '/offers', icon: <Tag size={22} />, label: 'Προσφορές' }, // Η ΝΕΑ ΚΑΡΤΕΛΑ
    { path: '/ai-advisor', icon: <Bot size={22} />, label: 'AI Advisor' },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-100 h-screen sticky top-0 flex flex-col p-6">
      <div className="flex items-center gap-3 mb-12 px-2">
        <div className="bg-indigo-600 p-2 rounded-xl text-white">
          <Sparkles size={20} />
        </div>
        <span className="text-xl font-black text-slate-900 tracking-tighter">SmartKids</span>
      </div>

      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-4 px-4 py-4 rounded-2xl font-bold text-sm transition-all ${
              location.pathname === item.path
                ? 'bg-indigo-50 text-indigo-600 shadow-sm'
                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="pt-6 border-t border-slate-50 space-y-2">
        <button className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl font-bold text-sm text-slate-400 hover:bg-slate-50 transition-all">
          <Settings size={22} /> Ρυθμίσεις
        </button>
        <button className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl font-bold text-sm text-rose-400 hover:bg-rose-50 transition-all">
          <LogOut size={22} /> Αποσύνδεση
        </button>
      </div>
    </aside>
  );
};

// Μικρό βοηθητικό icon αν δεν υπάρχει το Sparkles
const Sparkles = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
);

export default Sidebar;