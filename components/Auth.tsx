import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { Loader2, Map, ArrowRight } from 'lucide-react';

export const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!isSupabaseConfigured) {
      setMessage({ 
        type: 'error', 
        text: 'App is in demo mode. Connect Supabase to enable login.' 
      });
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Check your email for the confirmation link!' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-nest-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-accent-500/10 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="mb-8 text-center">
          <div className="h-20 w-20 bg-gradient-to-br from-primary-400 to-accent-500 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-primary-900/50 mx-auto mb-6 transform rotate-3 hover:rotate-6 transition-transform duration-500">
            <Map size={40} />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">NEST</h1>
          <p className="text-nest-400 font-medium tracking-wide uppercase text-sm">The Premium Family Travel OS</p>
        </div>

        <div className="glass-panel rounded-3xl p-8 md:p-10 shadow-2xl border border-nest-700/50 backdrop-blur-xl">
          <h2 className="text-2xl font-bold text-white mb-2">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-nest-400 text-sm mb-8">
            {mode === 'login' ? 'Enter your credentials to access your trips.' : 'Start planning your next family adventure today.'}
          </p>

          <form onSubmit={handleAuth} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase text-nest-500 tracking-wider ml-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-3.5 rounded-xl bg-nest-900/50 border border-nest-700 text-white placeholder-nest-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                placeholder="traveler@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase text-nest-500 tracking-wider ml-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-3.5 rounded-xl bg-nest-900/50 border border-nest-700 text-white placeholder-nest-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            {message && (
              <div className={`p-4 rounded-xl text-sm font-medium flex items-start gap-2 ${message.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary-900/30 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 mt-4 group"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : (
                 <>
                   {mode === 'login' ? 'Sign In' : 'Create Account'}
                   <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                 </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-nest-800 text-center">
            <p className="text-sm text-nest-400">
              {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
              <button 
                onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(null); }} 
                className="text-primary-400 font-bold hover:text-primary-300 transition-colors"
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};