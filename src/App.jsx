import React, { useState, useEffect, useRef } from 'react';
import { Home, Tag, ShoppingBasket, Sparkles, User, Bell, X } from 'lucide-react';
import { AuthProvider, useAuth } from './components/AuthProvider';
import ErrorBoundary from './components/ErrorBoundary';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabaseService } from './services/supabase';
import Login from './Login';
import HomePage from './Home';
import Offers from './Offers';
import Shopping from './Shopping';
import AIAdvisor from './AIAdvisor';
import Profile from './Profile';

const TABS = ['home', 'offers', 'shopping', 'ai', 'profile'];

// ── In-App Notification Toast ──────────────────────────────
function NotificationToast({ notification, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 7000);
    return () => clearTimeout(timer);
  }, [notification]);

  if (!notification) return null;

  const icons = {
    birthday: '🎂', size: '👟', school: '🏫',
    test: '🎉', welcome_suggestion: '🛍️',
    seasonal: '🌤️', christmas: '🎄', default: '🔔',
  };
  const icon = icons[notification.data?.type] || icons.default;
  const hasLink = !!notification.data?.link;

  const handleTap = () => {
    if (hasLink) {
      if (Capacitor.isNativePlatform()) {
        Browser.open({ url: notification.data.link });
      } else {
        window.open(notification.data.link, '_blank');
      }
    }
    onClose();
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] max-w-md mx-auto px-4"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
      <div onClick={handleTap} style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        padding: '14px 16px', display: 'flex', alignItems: 'flex-start',
        gap: 12, animation: 'slideDown 0.3s ease', cursor: hasLink ? 'pointer' : 'default',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: 'rgba(255,77,109,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, flexShrink: 0,
        }}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: '#fff', fontWeight: 800, fontSize: 13, margin: 0, marginBottom: 2 }}>
            {notification.title || 'Smart Kids'}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, margin: 0, lineHeight: 1.4 }}>
            {notification.body || ''}
          </p>
          {hasLink && (
            <p style={{ color: '#ff4d6d', fontSize: 10, fontWeight: 800, marginTop: 4 }}>
              Πάτα για να δεις →
            </p>
          )}
        </div>
        <button onClick={(e) => { e.stopPropagation(); onClose(); }}
          style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0, padding: 2 }}>
          <X size={14} />
        </button>
      </div>
      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────
function AppContent() {
  const { user, isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [showLogin, setShowLogin] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [toastNotification, setToastNotification] = useState(null);
  const [notificationInbox, setNotificationInbox] = useState(() => {
    try { return JSON.parse(localStorage.getItem('notification-inbox') || '[]'); } catch { return []; }
  });
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const [pendingSearch, setPendingSearch] = useState('');

  // Αποθηκεύει notification στο inbox (localStorage + state)
  const saveNotification = (notif) => {
    setNotificationInbox(prev => {
      const updated = [notif, ...prev].slice(0, 30); // max 30
      localStorage.setItem('notification-inbox', JSON.stringify(updated));
      return updated;
    });
  };

  const clearNotificationInbox = () => {
    setNotificationInbox([]);
    localStorage.removeItem('notification-inbox');
  };

  // ── Login visibility logic ──
  useEffect(() => {
    if (loading) return; // περιμένουμε να ξέρουμε το auth state
    const guestMode  = localStorage.getItem('guest-mode') === 'true';
    const hasVisited = localStorage.getItem('has-visited');
    if (isAuthenticated) {
      // Logged in — πάντα show app
      setShowLogin(false);
      if (!hasVisited) localStorage.setItem('has-visited', 'true');
    } else if (guestMode || hasVisited) {
      // Guest ή επιστρέφων επισκέπτης — show app
      setShowLogin(false);
    } else {
      // Νέος χρήστης χωρίς login/guest — show login
      setShowLogin(true);
    }
  }, [isAuthenticated, loading]);

  // ── Reset migration flag on logout so next login re-syncs ──
  useEffect(() => {
    if (!isAuthenticated) {
      // Όταν αποσυνδεθεί, καθαρίζουμε το flag ώστε στο επόμενο login να γίνει migrate
      localStorage.removeItem('supabase-migrated');
    }
  }, [isAuthenticated]);

  // ── Auto-migrate localStorage → Supabase μόλις συνδεθεί ──
  useEffect(() => {
    if (!isAuthenticated) return;
    const migrated = localStorage.getItem('supabase-migrated');
    if (migrated) {
      // Ήδη migrated — απλώς ειδοποίησε τις σελίδες να φορτώσουν από Supabase
      window.dispatchEvent(new CustomEvent('kids-updated'));
      window.dispatchEvent(new CustomEvent('shopping-list-updated'));
      return;
    }
    supabaseService.migrateLocalStorage()
      .then(result => {
        console.log(`✅ Migrated: ${result.kids} kids, ${result.wishlist} wishlist items`);
        localStorage.setItem('supabase-migrated', 'true');
        window.dispatchEvent(new CustomEvent('kids-updated'));
        window.dispatchEvent(new CustomEvent('shopping-list-updated'));
      })
      .catch(() => {
        window.dispatchEvent(new CustomEvent('kids-updated'));
      });
  }, [isAuthenticated]);

  // ── Navigate-home event από υπενθυμίσεις ──
  useEffect(() => {
    const handler = (e) => {
      setActiveTab('home');
      if (e.detail?.query) setPendingSearch(e.detail.query);
    };
    window.addEventListener('navigate-home', handler);
    return () => window.removeEventListener('navigate-home', handler);
  }, []);

  // Push notification received (in-app toast)
  useEffect(() => {
    const handler = (e) => setToastNotification(e.detail);
    window.addEventListener('push-notification', handler);
    return () => window.removeEventListener('push-notification', handler);
  }, []);

  // Android back button
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const handler = CapApp.addListener('backButton', () => {
      setShowExitDialog(true);
    });
    return () => { handler.then(h => h.remove()); };
  }, []);

  // FCM Push Notifications setup
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const setupPush = async () => {
      try {
        const permission = await PushNotifications.requestPermissions();
        if (permission.receive !== 'granted') return;

        if (Capacitor.getPlatform() === 'android') {
          await PushNotifications.createChannel({
            id: 'smart_kids',
            name: 'Smart Kids Ειδοποιήσεις',
            description: 'Ειδοποιήσεις για γενέθλια, μεγέθη και προσφορές',
            importance: 5,
            visibility: 1,
            sound: 'default',
            vibration: true,
            lights: true,
          });
        }

        await PushNotifications.register();

        PushNotifications.addListener('registration', async (token) => {
          console.log('📱 FCM Token:', token.value);
          localStorage.setItem('fcm_token', token.value);

          try {
            const userId = localStorage.getItem('user-id') ||
                          'guest_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('user-id', userId);

            const profileRaw = localStorage.getItem('kids-profile');
            const profile = profileRaw ? JSON.parse(profileRaw) : null;

            const response = await fetch('https://smart-kids-api.onrender.com/api/register-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId, token: token.value, profile }),
              signal: AbortSignal.timeout(10000) // 10 second timeout
            });
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            console.log('✅ FCM token registered');
          } catch (err) {
            console.error('Token registration error:', err.message);
            // Don't throw error - continue app functionality
          }
        });

        // In-app toast όταν έρθει notification ενώ το app είναι ανοιχτό
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('🔔 Notification received:', notification.title);
          const notif = {
            title: notification.title,
            body:  notification.body,
            data:  notification.data || {},
            receivedAt: new Date().toISOString(),
          };
          setToastNotification(notif);
          // Αποθήκευση στο localStorage ώστε να μην χαθεί
          saveNotification(notif);
        });

        // Tap σε notification → ανοίγει link ή navigate
        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          const data = action.notification.data;
          if (data?.link) {
            Browser.open({ url: data.link });
          } else if (data?.type === 'welcome_suggestion') {
            setActiveTab('shopping');
          } else {
            setActiveTab('home');
          }
        });

      } catch (err) {
        console.error('Push setup error:', err.message);
      }
    };

    setupPush();
  }, []);

  const handleGuestMode = () => {
    localStorage.setItem('guest-mode', 'true');
    localStorage.setItem('has-visited', 'true');
    setShowLogin(false);
  };

  // Περιμένουμε να φορτώσει το auth state πριν αποφασίσουμε τι να δείξουμε
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 20,
          background: 'linear-gradient(135deg, #ff4d6d, #a855f7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32,
        }}>👶</div>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          border: '3px solid rgba(255,255,255,0.1)',
          borderTop: '3px solid #ff4d6d',
          animation: 'spin 0.8s linear infinite',
        }}/>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (showLogin) return <Login onGuestMode={handleGuestMode} />;

  // ── Swipe gesture ──
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(deltaX) < 60 || Math.abs(deltaX) < Math.abs(deltaY) * 1.5) return;
    const currentIndex = TABS.indexOf(activeTab);
    if (deltaX < 0 && currentIndex < TABS.length - 1) setActiveTab(TABS[currentIndex + 1]);
    else if (deltaX > 0 && currentIndex > 0) setActiveTab(TABS[currentIndex - 1]);
    touchStartX.current = null;
    touchStartY.current = null;
  };

  if (showLogin) return <Login onGuestMode={handleGuestMode} />;

  return (
    <div className="relative">

      {/* In-App Notification Toast */}
      {toastNotification && (
        <NotificationToast
          notification={toastNotification}
          onClose={() => setToastNotification(null)}
        />
      )}

      {/* Exit confirmation dialog */}
      {showExitDialog && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xs shadow-2xl">
            <p className="text-lg font-black text-slate-800 text-center mb-2">Έξοδος;</p>
            <p className="text-sm text-slate-500 text-center mb-6">
              Θέλεις σίγουρα να βγεις από την εφαρμογή;
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitDialog(false)}
                className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 font-black text-sm active:scale-95">
                Άκυρο
              </button>
              <button
                onClick={async () => { try { await CapApp.exitApp(); } catch(e) {} }}
                className="flex-1 py-3 rounded-2xl bg-rose-500 text-white font-black text-sm active:scale-95">
                Έξοδος
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs — όλα mounted, κρύβονται με display:none */}
      <div className="pb-20" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div style={{ display: activeTab === 'home'     ? 'block' : 'none' }}>
          <HomePage pendingSearch={pendingSearch} onSearchConsumed={() => setPendingSearch('')} />
        </div>
        <div style={{ display: activeTab === 'offers'   ? 'block' : 'none' }}><Offers /></div>
        <div style={{ display: activeTab === 'shopping' ? 'block' : 'none' }}>
          <Shopping
            notificationInbox={notificationInbox}
            onClearInbox={clearNotificationInbox}
          />
        </div>
        <div style={{ display: activeTab === 'ai'       ? 'block' : 'none' }}><AIAdvisor /></div>
        <div style={{ display: activeTab === 'profile'  ? 'block' : 'none' }}><Profile /></div>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div style={{
          background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #0f0f1a 100%)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)',
        }} className="flex items-center justify-around py-2">
          {[
            { id:'home',     Icon: Home,          label:'Αρχική',    color:'#ff4d6d' },
            { id:'offers',   Icon: Tag,           label:'Προσφορές', color:'#fbbf24' },
            { id:'shopping', Icon: ShoppingBasket,label:'Λίστα',     color:'#34d399' },
            { id:'ai',       Icon: Sparkles,      label:'AI',        color:'#a78bfa' },
            { id:'profile',  Icon: User,          label:'Προφίλ',    color:'#60a5fa' },
          ].map(({ id, Icon, label, color }) => {
            const isActive = activeTab === id;
            // Badge για unread notifications στο Shopping
            const badge = id === 'shopping' && notificationInbox.length > 0 && !isActive
              ? notificationInbox.length : 0;
            return (
              <button key={id} onClick={() => setActiveTab(id)}
                className="flex flex-col items-center gap-0.5 flex-1 py-1.5 transition-all active:scale-90 relative">
                {isActive && (
                  <span style={{
                    position:'absolute', top:0, left:'50%', transform:'translateX(-50%)',
                    width:32, height:2, borderRadius:2,
                    background: color, boxShadow: `0 0 8px ${color}`,
                  }}/>
                )}
                <div style={{
                  width:40, height:36, borderRadius:12,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  background: isActive ? `${color}22` : 'transparent',
                  transition:'all 0.2s', position:'relative',
                }}>
                  <Icon size={20} style={{ color: isActive ? color : 'rgba(255,255,255,0.35)', transition:'color 0.2s' }} />
                  {badge > 0 && (
                    <span style={{
                      position:'absolute', top:2, right:2,
                      width:16, height:16, borderRadius:'50%',
                      background:'#ff4d6d', color:'white',
                      fontSize:9, fontWeight:900,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      boxShadow:'0 0 6px rgba(255,77,109,0.6)',
                    }}>{badge > 9 ? '9+' : badge}</span>
                  )}
                </div>
                <span style={{
                  fontSize:9, fontWeight:700, letterSpacing:'0.03em',
                  color: isActive ? color : 'rgba(255,255,255,0.3)',
                  transition:'color 0.2s',
                }}>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {import.meta.env.DEV && (
        <div className="fixed top-2 right-2 z-50">
          <div className={`text-xs px-2 py-1 rounded-full font-bold ${isAuthenticated ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
            {isAuthenticated ? '🔒 Logged In' : '👤 Guest Mode'}
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </AuthProvider>
  );
}

export default App;
