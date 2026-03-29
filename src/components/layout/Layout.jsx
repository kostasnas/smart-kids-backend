import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Baby, ShoppingBag, Settings, Calendar, Bot } from 'lucide-react';

const Layout = ({ children }) => {
  const location = useLocation();

  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/' },
    { icon: <Baby size={20} />, label: 'Τα Παιδιά μου', path: '/kids' },
    { icon: <ShoppingBag size={20} />, label: 'Αγορές', path: '/shopping' },
    { icon: <Bot size={20} />, label: 'AI Σύμβουλος', path: '/ai-advisor' },
    { icon: <Calendar size={20} />, label: 'Ημερολόγιο', path: '/calendar' },
    { icon: <Settings size={20} />, label: 'Ρυθμίσεις', path: '/settings' },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-6">
          <Link to="/" className="text-xl font-bold text-indigo-600 flex items-center gap-2">
            <ShoppingBag /> SmartKids
          </Link>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {menuItems.map((item, index) => (
            <Link
              key={index}
              to={item.path}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                location.pathname === item.path 
                ? 'bg-indigo-50 text-indigo-600 shadow-sm' 
                : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

export default Layout;