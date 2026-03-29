import React, { useState, useEffect } from 'react';
import { Search, X, ShoppingCart, Loader2, ArrowRight, Sparkles, ExternalLink, Trophy, Star, SlidersHorizontal, Check, ChevronDown, ChevronUp, Calendar } from 'lucide-react';

const FILTER_NAMES = {
  type:'Τύπος', brand:'Μάρκα', color:'Χρώμα', size:'Νούμερο',
  closure:'Κλείσιμο', sport:'Άθλημα', features:'Χαρακτηριστικά',
  season:'Εποχή', material:'Υλικό', ageRange:'Ηλικία', ageSize:'Μέγεθος',
  category:'Κατηγορία', character:'Χαρακτήρας', occasion:'Περίσταση',
  theme:'Θέμα', group:'Ομάδα Βάρους', installation:'Τοποθέτηση',
  rotation:'Περιστροφή', direction:'Κατεύθυνση', voltage:'Τάση',
  seats:'Θέσεις', weightGroup:'Ομάδα',
};
const fname = k => FILTER_NAMES[k] || k;

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
const CATEGORY_FILTERS = {
  παπουτσια: {
    type:['Sneakers / Αθλητικά','Casual / Καθημερινά','Πέδιλα / Σανδάλια','Μποτάκια','Μπαλαρίνες'],
    closure:['Κορδόνια','Velcro / Σκρατς','Slip-On'],
    features:['Αδιάβροχα','Διαπνέοντα / Mesh','Memory Foam'],
    brand:['Nike','Adidas','Puma','New Balance','Skechers','Converse','Geox'],
  },
  ρουχα:{
    type:['Μπλούζες / T-Shirts','Παντελόνια','Φόρμες','Φορέματα','Μπουφάν'],
    ageSize:['2-4 ετών','4-6 ετών','6-8 ετών','8-10 ετών','10-12 ετών'],
    season:['Καλοκαιρινά','Χειμωνιάτικα'],
    brand:['Zara Kids','H&M','DPAM','Orchestra','Mayoral'],
  },
  στολη:{
    occasion:['Απόκριες / Halloween','Πάσχα','Χριστούγεννα'],
    character:['Spiderman','Batman','Elsa','Princess','Unicorn','Pirate','Ninja','Dinosaur'],
    theme:['Superheroes / Marvel / DC','Disney Princess','Horror / Τρόμος','Animals / Ζώα'],
    ageSize:['2-4 ετών','4-6 ετών','6-8 ετών','8-10 ετών','10-12 ετών'],
  },
  λαμπαδα:{
    occasion:['Πάσχα'],
    character:['Spiderman','Batman','Elsa','Princess','Unicorn','Paw Patrol'],
    theme:['Superheroes / Marvel / DC','Disney Princess','Animals / Ζώα'],
  },
  'καθισμα αυτοκινητου':{
    group:['Ομάδα 0+ (0-13kg)','Ομάδα 1 (9-18kg)','Ομάδα 2/3 (15-36kg)','i-Size (40-105cm)'],
    installation:['ISOfix','Ζώνη Αυτοκινήτου'],
    rotation:['Στροφή 360°'],
    brand:['Cybex','Maxi-Cosi','Britax Römer','Chicco','Joie'],
  },
  καροτσι:{
    type:['Mono / Solo','Duo / Travel System','Ελαφρύ / Umbrella','Δίδυμα'],
    features:['Ανάκλιση 180° (Flat)','Αναδιπλούμενο','Συμβατό με Car Seat'],
    brand:['Cybex','Bugaboo','Maxi-Cosi','Joie','Kinderkraft'],
  },
  παιχνιδι:{
    ageRange:['1-3 ετών','3-5 ετών','5-7 ετών','7-10 ετών'],
    category:['Κούκλες & Λούτρινα','Αυτοκινητάκια','Κατασκευές & LEGO','Επιτραπέζια & Παζλ'],
    brand:['LEGO','Playmobil','Mattel','Hasbro','Fisher-Price'],
  },
  σχολικη:{
    type:['Σχολικές Τσάντες','Κασετίνες','Μολύβια & Στυλό','Τετράδια'],
    character:['Spiderman','Frozen','Disney','Unicorn','Minecraft'],
    brand:['Polo','Faber-Castell','Pelikan','Maped'],
  },
  ποδηλατο:{
    type:['Ποδήλατα','Σκούτερ / Πατίνια'],
    ageRange:['2-4 ετών','4-6 ετών','6-9 ετών','9-12 ετών'],
    brand:['Kinderkraft','Puky','Decathlon','Micro'],
  },
  tablet:{
    ageRange:['3-5 ετών','5-8 ετών','8-12 ετών'],
    brand:['Apple','Samsung','Amazon Fire','Leapfrog','VTech'],
  },
};

function nm(s) {
  return (s||'').toLowerCase()
    .replace(/ά/g,'α').replace(/έ/g,'ε').replace(/ή/g,'η')
    .replace(/ί/g,'ι').replace(/ό/g,'ο').replace(/ύ/g,'υ').replace(/ώ/g,'ω');
}

function detectSuggestedFilters(query) {
  const q = nm(query);
  for (const [key,filters] of Object.entries(CATEGORY_FILTERS)) {
    if (q.includes(nm(key))) return filters;
  }
  return null;
}

// ─────────────────────────────────────────────
// BOTTOM SHEET - Fixed, sits ABOVE nav bar
// ─────────────────────────────────────────────
function FilterSheet({ open, onClose, filters, selected, onToggle, onClear, onApply, resultCount, preSearch }) {
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
                    <span className="text-xs font-black uppercase tracking-wide text-slate-700">{fname(ftype)}</span>
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
                        return (
                          <button key={opt} onClick={() => onToggle(ftype,opt)}
                            className={`w-full flex items-center justify-between px-3 py-3 rounded-xl border transition-all ${active ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 border-transparent'}`}
                          >
                            <span className={`text-sm font-medium ${active ? 'text-rose-700' : 'text-slate-700'}`}>{opt}</span>
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
export default function Home() {
  const [query, setQuery] = useState('');
  const [kids, setKids] = useState([]);
  const [selectedKidId, setSelectedKidId] = useState(null);
  const [results, setResults] = useState(null);
  const [filteredResults, setFilteredResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notif, setNotif] = useState('');
  const [categoryLabel, setCategoryLabel] = useState('');
  const [availableFilters, setAvailableFilters] = useState({});
  const [activeFilters, setActiveFilters] = useState({});
  const [sortBy, setSortBy] = useState('best');
  const [showFilters, setShowFilters] = useState(false);
  const [preFilters, setPreFilters] = useState(null);
  const [preSelected, setPreSelected] = useState({});

  const upcomingEvents = getUpcomingEvents();

  useEffect(() => {
    const saved = localStorage.getItem('smart-kids-list');
    if (saved) {
      const parsed = JSON.parse(saved).map(k => ({...k, age: calcAge(k.birthDate)}));
      setKids(parsed);
      if (parsed.length > 0) setSelectedKidId(parsed[0].id);
    }
  }, []);

  function calcAge(d) {
    if (!d) return 5;
    const t=new Date(), b=new Date(d);
    let a=t.getFullYear()-b.getFullYear();
    if(t.getMonth()-b.getMonth()<0||(t.getMonth()===b.getMonth()&&t.getDate()<b.getDate()))a--;
    return a;
  }

  const currentKid = kids.find(k => k.id===selectedKidId);
  const showNotif = msg => { setNotif(msg); setTimeout(()=>setNotif(''),2500); };

  const handleQueryChange = val => {
    setQuery(val);
    if (!results) { setPreFilters(detectSuggestedFilters(val)); setPreSelected({}); }
  };

  function buildEnrichedQuery(base, sel) {
    const extras = Object.values(sel).flat();
    return extras.length ? `${base} ${extras.join(' ')}` : base;
  }

  const doSearch = async (q) => {
      if (!q || q.trim().length < 2) return;
      setLoading(true);
      setError(null);
      setResults([]);

      try {
        // ΕΔΩ ΕΙΝΑΙ Η ΑΛΛΑΓΗ: Ορίζουμε σωστά το url για το Render

        setResults(data.results || []);
      } catch (err) {
        console.error("❌ Search Error:", err);
        setError("Αποτυχία σύνδεσης με τον διακομιστή.");
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    if (!results) return;
    let f = results.filter(p =>
      Object.entries(activeFilters).every(([t,vals]) => {
        if (!vals.length) return true;
        const v = p.attributes?.[t];
        return Array.isArray(v) ? v.some(x=>vals.includes(x)) : vals.includes(v);
      })
    );
    if (sortBy==='price_low') f.sort((a,b)=>(a.priceValue||99999)-(b.priceValue||99999));
    else if (sortBy==='price_high') f.sort((a,b)=>(b.priceValue||0)-(a.priceValue||0));
    else if (sortBy==='rating') f.sort((a,b)=>(b.rating||0)-(a.rating||0));
    else f.sort((a,b)=>(b.finalScore||0)-(a.finalScore||0));
    setFilteredResults(f);
  }, [results, activeFilters, sortBy]);

  const toggleFilter = (type,val) => {
    const setter = results ? setActiveFilters : setPreSelected;
    setter(prev => {
      const cur=prev[type]||[];
      const next=cur.includes(val)?cur.filter(x=>x!==val):[...cur,val];
      if(!next.length){const{[type]:_,...rest}=prev;return rest;}
      return {...prev,[type]:next};
    });
  };
  const clearFilters = () => { if(results){setActiveFilters({});setSortBy('best');}else setPreSelected({}); };
  const clearSearch = () => { setQuery('');setResults(null);setFilteredResults(null);setActiveFilters({});setPreFilters(null);setPreSelected({}); };
  const addToList = item => {
    const list=JSON.parse(localStorage.getItem('tracked-items')||'[]');
    list.push({id:Date.now(),title:item.title,thumbnail:item.thumbnail,price:item.priceValue||0,store:item.source||'',link:item.buyLink||item.link,kidName:currentKid?.name,addedAt:new Date().toISOString()});
    localStorage.setItem('tracked-items',JSON.stringify(list));
    showNotif('🛒 Προστέθηκε!');
  };

  const isPreSearch = !results;
  const currentFilters = results ? availableFilters : (preFilters||{});
  const currentSelected = results ? activeFilters : preSelected;
  const activeCount = Object.values(currentSelected).flat().length;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 pb-28 font-sans">

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
          if (isPreSearch) { setShowFilters(false); doSearch(query,preSelected); }
          else setShowFilters(false);
        }}
        resultCount={filteredResults?.length||0}
        preSearch={isPreSearch}
      />

      {/* HEADER */}
      <div className="bg-rose-500 pt-12 pb-20 px-5 rounded-b-[2.5rem] shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white">Smart Kids</h1>
          <Sparkles className="text-yellow-300" size={20}/>
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 mb-4">
          {kids.map(kid => (
            <button key={kid.id} onClick={()=>setSelectedKidId(kid.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 shrink-0 transition-all ${selectedKidId===kid.id?'bg-white text-rose-500 border-white scale-105':'bg-rose-600 border-rose-400 text-rose-100 opacity-80'}`}>
              <span className="text-lg">{kid.avatar}</span>
              <div>
                <p className="text-[10px] font-black uppercase leading-none">{kid.name}</p>
                <p className="text-[8px] opacity-75 mt-0.5">{kid.age} ετών</p>
              </div>
            </button>
          ))}
        </div>

        <div className="relative">
          <input type="text"
            placeholder="π.χ. παπούτσια, στολή, καθίσματα..."
            value={query}
            onChange={e=>handleQueryChange(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&doSearch(query,preSelected)}
            className="w-full bg-white px-5 py-4 pr-28 rounded-2xl shadow-lg text-sm font-semibold text-slate-700 outline-none"
          />
          <div className="absolute right-2 top-1.5 flex gap-1.5">
            {query && <button onClick={clearSearch} className="p-2.5 text-slate-400"><X size={18}/></button>}
            <button onClick={()=>doSearch(query,preSelected)} disabled={loading}
              className="bg-rose-500 text-white p-2.5 rounded-xl active:scale-90 transition-transform">
              {loading ? <Loader2 size={18} className="animate-spin"/> : <Search size={18}/>}
            </button>
          </div>
        </div>

        {!results && preFilters && query && (
          <div className="mt-3 flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <button onClick={()=>setShowFilters(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-white text-xs font-bold shrink-0 ${activeCount>0?'bg-white/30 border-white':'bg-white/10 border-white/40'}`}>
              <SlidersHorizontal size={12}/>
              Φίλτρα {activeCount>0&&`(${activeCount})`}
            </button>
            {Object.values(preSelected).flat().slice(0,3).map((val,i) => (
              <span key={i} className="bg-white/20 text-white text-[9px] font-bold px-2 py-1 rounded-full shrink-0 border border-white/30 whitespace-nowrap">{val}</span>
            ))}
          </div>
        )}
      </div>

      {/* MAIN */}
      <div className="px-4 -mt-10">

        {filteredResults && (
          <>
            <div className="bg-white rounded-2xl shadow-sm px-4 py-3 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-800">{filteredResults.length} Προϊόντα</span>
                {categoryLabel && <span className="text-[9px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-semibold">{categoryLabel}</span>}
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={()=>setShowFilters(true)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black ${activeCount>0?'bg-rose-500 text-white':'bg-slate-100 text-slate-600'}`}>
                  <SlidersHorizontal size={13}/>
                  ΦΙΛΤΡΑ
                  {activeCount>0&&<span className="bg-white text-rose-500 rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-black">{activeCount}</span>}
                </button>
                {[{v:'best',i:'🏆'},{v:'price_low',i:'💰'},{v:'rating',i:'⭐'}].map(({v,i})=>(
                  <button key={v} onClick={()=>setSortBy(v)}
                    className={`w-8 h-8 rounded-xl text-sm ${sortBy===v?'bg-rose-500':'bg-slate-100'}`}>{i}</button>
                ))}
              </div>
            </div>

            {activeCount>0 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-2">
                {Object.entries(activeFilters).map(([t,vals])=>vals.map(val=>(
                  <button key={`${t}-${val}`} onClick={()=>toggleFilter(t,val)}
                    className="flex items-center gap-1 bg-rose-100 text-rose-700 px-3 py-1.5 rounded-full text-[10px] font-bold shrink-0 whitespace-nowrap">
                    {val} <X size={10}/>
                  </button>
                )))}
                <button onClick={clearFilters} className="bg-slate-200 text-slate-600 px-3 py-1.5 rounded-full text-[10px] font-bold shrink-0">Καθαρισμός</button>
              </div>
            )}

            {filteredResults.length===0 ? (
              <div className="bg-white rounded-2xl p-10 text-center">
                <p className="text-slate-400 font-bold mb-4">Κανένα αποτέλεσμα με αυτά τα φίλτρα</p>
                <button onClick={clearFilters} className="bg-rose-500 text-white px-6 py-3 rounded-xl text-xs font-black uppercase">Καθαρισμός</button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredResults.map((item,idx)=>{
                  const isBest=idx===0&&sortBy==='best';
                  return (
                    <div key={idx} className={`bg-white rounded-3xl p-4 shadow-sm border-2 flex gap-3 relative ${isBest?'border-amber-400 bg-amber-50/30':'border-slate-100'}`}>
                      {isBest&&<div className="absolute top-0 right-0 bg-amber-400 text-amber-900 px-3 py-1 rounded-bl-2xl rounded-tr-3xl text-[8px] font-black flex items-center gap-1"><Trophy size={9}/> TOP</div>}
                      <img src={item.thumbnail} alt="" className="w-20 h-20 rounded-2xl object-cover bg-slate-100 shrink-0" onError={e=>e.target.style.display='none'}/>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-slate-800 leading-tight line-clamp-2 mb-1.5">{item.title}</p>
                        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                          {item.rating&&<div className="flex items-center gap-0.5 bg-amber-50 px-1.5 py-0.5 rounded-md"><Star size={9} className="fill-amber-400 text-amber-400"/><span className="text-[9px] font-bold text-amber-700">{item.rating}</span></div>}
                          {item.reviews>0&&<span className="text-[8px] text-slate-400">({item.reviews})</span>}
                          {item.source&&<span className="text-[8px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{item.source}</span>}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-rose-600 font-black text-base">{item.price}</span>
                          <div className="flex gap-1.5">
                            <button onClick={()=>addToList(item)} className="p-2.5 bg-slate-900 text-white rounded-xl active:scale-90 transition-transform"><ShoppingCart size={16}/></button>
                            <a href={item.buyLink} target="_blank" rel="noopener noreferrer"
                              className="bg-rose-500 text-white px-3 py-2.5 rounded-xl text-[9px] font-black uppercase flex items-center gap-1 no-underline active:scale-90">
                              ΑΓΟΡΑ <ExternalLink size={10}/>
                            </a>
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

        {/* SEASONAL EVENTS */}
        {!results && !loading && (
          <div className="pt-2">
            {upcomingEvents.length>0 ? (
              <>
                <div className="flex items-center gap-2 px-1 mb-3">
                  <Calendar size={12} className="text-rose-400"/>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Επόμενες 30 μέρες</p>
                </div>
                <div className="space-y-2">
                  {upcomingEvents.map(ev=>(
                    <div key={ev.name} onClick={()=>{setQuery(ev.q);doSearch(ev.q);}}
                      className="bg-white p-4 rounded-2xl shadow-sm flex items-center justify-between cursor-pointer border-2 border-transparent active:border-rose-100 active:scale-95 transition-all">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{ev.icon}</span>
                        <div>
                          <p className="font-black text-slate-800 text-sm">{ev.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] text-slate-500">{ev.dateStr}</span>
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${
                              ev.ongoing ? 'bg-rose-100 text-rose-600 animate-pulse' :
                              ev.daysLeft<=5 ? 'bg-red-100 text-red-600' :
                              ev.daysLeft<=14 ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-500'
                            }`}>
                              {ev.ongoing ? '🔴 ΤΩΡΑ' : ev.daysLeft===0 ? 'ΣΗΜΕΡΑ!' : ev.daysLeft===1 ? 'ΑΥΡΙΟ!' : `σε ${ev.daysLeft} μέρες`}
                            </span>
                          </div>
                        </div>
                      </div>
                      <ArrowRight size={18} className="text-rose-300 shrink-0"/>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-3xl mb-3">🔍</p>
                <p className="text-slate-400 font-bold text-sm">Αναζήτησε κάτι για {currentKid?.name}</p>
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={36} className="animate-spin text-rose-400"/>
            <p className="text-slate-400 font-bold text-sm">Ψάχνω...</p>
          </div>
        )}
      </div>
    </div>
  );
}
