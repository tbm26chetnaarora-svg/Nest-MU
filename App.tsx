import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Session } from '@supabase/supabase-js';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { TripDetail } from './components/TripDetail';
import { Layout } from './components/Layout';
import { Loader2 } from 'lucide-react';
import { DEMO_USER_ID } from './constants';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If not configured, skip network requests to prevent "Failed to fetch"
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    }).catch((error) => {
      console.error('Failed to get session:', error);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleDemoLogin = () => {
    // Create a fake session object for demo mode
    const demoSession: any = {
      access_token: 'demo-token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'demo-refresh',
      user: {
        id: DEMO_USER_ID,
        aud: 'authenticated',
        role: 'authenticated',
        email: 'demo@traveler.com',
        app_metadata: { provider: 'email' },
        user_metadata: {},
        created_at: new Date().toISOString(),
      }
    };
    setSession(demoSession);
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-nest-50">
        <Loader2 className="h-10 w-10 animate-spin text-nest-600" />
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        {!session ? (
          <Route path="*" element={<Auth onDemoLogin={handleDemoLogin} />} />
        ) : (
          <Route element={<Layout session={session} />}>
            <Route path="/" element={<Dashboard session={session} />} />
            <Route path="/trip/:tripId" element={<TripDetail session={session} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        )}
      </Routes>
    </HashRouter>
  );
}