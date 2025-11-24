import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { LogOut, Map, User } from 'lucide-react';

interface LayoutProps {
  session: Session;
}

export const Layout: React.FC<LayoutProps> = ({ session }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar / Mobile Header */}
      <nav className="w-full md:w-64 bg-white border-b md:border-r border-gray-200 px-6 py-4 flex flex-col justify-between shrink-0 sticky top-0 z-50 h-auto md:h-screen">
        <div>
          <div className="flex items-center gap-3 mb-8 cursor-pointer" onClick={() => navigate('/')}>
            <div className="h-10 w-10 bg-nest-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-nest-200">
              <Map size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-nest-900 tracking-tight">NEST</h1>
              <p className="text-xs text-nest-500 font-medium tracking-wider uppercase">Travel OS</p>
            </div>
          </div>
          
          <div className="hidden md:flex flex-col gap-1">
             <div className="px-3 py-2 text-sm font-medium text-nest-600 bg-nest-50 rounded-lg">
                Dashboard
             </div>
             {/* Future nav items could go here */}
          </div>
        </div>

        <div className="flex md:flex-col items-center md:items-start justify-between md:justify-end gap-4 mt-auto">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-nest-100 flex items-center justify-center text-nest-700">
              <User size={16} />
            </div>
            <div className="hidden md:block overflow-hidden">
               <p className="text-sm font-medium text-gray-700 truncate max-w-[150px]">{session.user.email}</p>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-gray-50"
          >
            <LogOut size={16} />
            <span className="hidden md:inline">Sign Out</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-nest-50 p-4 md:p-8 lg:p-12">
        <div className="max-w-6xl mx-auto animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
};