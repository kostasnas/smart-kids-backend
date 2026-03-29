import React, { createContext, useContext, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase } from '../services/supabase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Έλεγχος τρέχουσας session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Ακρόαση για αλλαγές auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event, session?.user?.email);
        setUser(session?.user ?? null);
        setLoading(false);
        if (event === 'SIGNED_IN' && Capacitor.isNativePlatform()) {
          try { await Browser.close(); } catch {}
        }
      }
    );

    // ── Deep link handler ──
    let appUrlListener = null;
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener('appUrlOpen', async ({ url }) => {
        console.log('📱 Deep link URL:', url);

        if (!url.startsWith('com.smartkids.app://')) return;

        try {
          // Hash fragment: com.smartkids.app://login-callback#access_token=...
          const hashIndex = url.indexOf('#');
          if (hashIndex !== -1) {
            const params = new URLSearchParams(url.substring(hashIndex + 1));
            const access_token  = params.get('access_token');
            const refresh_token = params.get('refresh_token');
            if (access_token && refresh_token) {
              const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
              if (!error && data?.session) {
                setUser(data.session.user);
                setLoading(false);
                console.log('✅ Logged in (hash):', data.session.user.email);
                return;
              }
            }
          }

          // PKCE flow: com.smartkids.app://login-callback?code=...
          const queryIndex = url.indexOf('?');
          if (queryIndex !== -1) {
            const params = new URLSearchParams(url.substring(queryIndex + 1).split('#')[0]);
            const code = params.get('code');
            if (code) {
              const { data, error } = await supabase.auth.exchangeCodeForSession(code);
              if (!error && data?.session) {
                setUser(data.session.user);
                setLoading(false);
                console.log('✅ Logged in (code):', data.session.user.email);
                return;
              }
            }
          }

          // Fallback: ίσως το onAuthStateChange το έχει ήδη πιάσει
          await new Promise(r => setTimeout(r, 1000));
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setUser(session.user);
            setLoading(false);
            console.log('✅ Session (fallback):', session.user.email);
          }
        } catch (err) {
          console.error('Deep link error:', err);
        }
      }).then(l => { appUrlListener = l; });
    }

    return () => {
      subscription.unsubscribe();
      if (appUrlListener) appUrlListener.remove();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: 'com.smartkids.app://login-callback',
            skipBrowserRedirect: true,
          }
        });
        if (error) throw error;
        if (data?.url) {
          await Browser.open({ url: data.url, windowName: '_self' });
        }
      } else {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin }
        });
        if (error) throw error;
      }
    } catch (error) {
      console.error('signInWithGoogle error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      localStorage.removeItem('guest-mode');
      localStorage.removeItem('has-visited');
      localStorage.removeItem('supabase-migrated');
    } catch (error) {
      console.error('signOut error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      user, loading,
      isAuthenticated: !!user,
      signInWithGoogle,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
