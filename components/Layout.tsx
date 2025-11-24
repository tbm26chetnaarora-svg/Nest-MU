import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { LogOut, Map, LayoutDashboard, Compass, User, Settings, Bell } from 'lucide-react';

interface LayoutProps {
  session: Session;
}

export const Layout: React.FC<LayoutProps> = ({ session }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex h-screen bg-nest-950 overflow-hidden text-nest-50">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-nest-900 border-r border-nest-800 h-full relative z-20">
        <div className="p-6">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
            <div className="h-10 w-10 bg-gradient-to-br from-primary-400 to-accent-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary-900/20 group-hover:shadow-primary-900/40 transition-all duration-300">
              <Map size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">NEST</h1>
              <p className="text-[10px] text-nest-400 font-medium tracking-widest uppercase">Travel OS</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          <button
            onClick={() => navigate('/')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
              isActive('/') 
                ? 'bg-primary-900/20 text-primary-400 border border-primary-900/50' 
                : 'text-nest-400 hover:bg-nest-800 hover:text-nest-100'
            }`}
          >
            <LayoutDashboard size={20} className={isActive('/') ? 'text-primary-400' : 'group-hover:text-white'} />
            <span className="font-medium">Dashboard</span>
          </button>
          
          <button
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-not-allowed opacity-60 ${
              isActive('/explore') ? 'bg-nest-800 text-white' : 'text-nest-400 hover:bg-nest-800'
             }`}
          >
             <Compass size={20} />
             <span className="font-medium">Explore</span>
             <span className="ml-auto text-[10px] bg-nest-800 text-nest-400 px-1.5 py-0.5 rounded border border-nest-700">SOON</span>
          </button>
        </nav>

        <div className="p-4 border-t border-nest-800 bg-nest-900/50">
           <div className="glass-card rounded-xl p-3 flex items-center gap-3">
             <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-accent-600 to-primary-500 flex items-center justify-center text-white font-bold shadow-inner">
               {session.user.email?.[0].toUpperCase()}
             </div>
             <div className="overflow-hidden flex-1">
               <p className="text-sm font-medium text-white truncate">{session.user.email}</p>
               <button onClick={handleLogout} className="text-xs text-nest-400 hover:text-red-400 flex items-center gap-1 transition-colors mt-0.5">
                 <LogOut size={10} /> Sign Out
               </button>
             </div>
           </div>
        </div>
      </aside>

      {/* Mobile Header (Only visible on small screens) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-nest-900 border-b border-nest-800 z-50 flex items-center justify-between px-4">
         <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-gradient-to-br from-primary-400 to-accent-500 rounded-lg flex items-center justify-center">
               <Map size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg">NEST</span>
         </div>
         <button onClick={handleLogout} className="p-2 text-nest-400 hover:text-white">
            <LogOut size={20} />
         </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden md:pl-0 pt-16 md:pt-0">
        {/* Top Header */}
        <header className="hidden md:flex h-16 border-b border-nest-800/50 bg-nest-950/80 backdrop-blur-md items-center justify-end px-8 gap-4 sticky top-0 z-30">
           <button className="p-2 text-nest-400 hover:text-primary-400 transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 h-2 w-2 bg-accent-500 rounded-full border border-nest-950"></span>
           </button>
           <button className="p-2 text-nest-400 hover:text-primary-400 transition-colors">
              <Settings size={20} />
           </button>
        </header>

        <div className="flex-1 overflow-y-auto bg-nest-950 scroll-smooth">
          <div className="w-full mx-auto p-4 md:p-8 lg:p-10 max-w-7xl">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};