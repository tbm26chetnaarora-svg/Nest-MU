import React, { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { Trip } from '../types';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Plus, ArrowRight, Sparkles } from 'lucide-react';
import { PLACEHOLDER_IMAGES } from '../constants';

interface DashboardProps {
  session: Session;
}

export const Dashboard: React.FC<DashboardProps> = ({ session }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  
  // New Trip State
  const [newTrip, setNewTrip] = useState({
    title: '',
    destination: '',
    start_date: '',
    end_date: ''
  });

  const fetchTrips = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', session.user.id)
        .order('start_date', { ascending: true });

      if (error) throw error;
      setTrips(data || []);
    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .insert([{
          user_id: session.user.id,
          ...newTrip,
          cover_image: PLACEHOLDER_IMAGES[Math.floor(Math.random() * PLACEHOLDER_IMAGES.length)],
          status: 'planning'
        }])
        .select()
        .single();

      if (tripError) throw tripError;

      const start = new Date(newTrip.start_date);
      const end = new Date(newTrip.end_date);
      const daysToInsert = [];
      let current = start;
      let dayCount = 1;

      while (current <= end) {
        daysToInsert.push({
          trip_id: tripData.id,
          date: current.toISOString().split('T')[0],
          day_number: dayCount,
          notes: ''
        });
        current = new Date(current.setDate(current.getDate() + 1));
        dayCount++;
      }

      const { error: daysError } = await supabase.from('days').insert(daysToInsert);
      if (daysError) throw daysError;

      setNewTrip({ title: '', destination: '', start_date: '', end_date: '' });
      setIsCreating(false);
      fetchTrips();

    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Hero Section */}
      <div className="relative rounded-3xl overflow-hidden min-h-[300px] flex items-center border border-nest-800 shadow-2xl">
        <div className="absolute inset-0 z-0">
          <img 
             src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2021&q=80" 
             alt="Travel Hero" 
             className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-nest-950 via-nest-950/80 to-transparent"></div>
        </div>
        
        <div className="relative z-10 p-8 md:p-12 max-w-2xl">
           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/20 border border-primary-500/30 text-primary-400 text-xs font-semibold uppercase tracking-wider mb-6">
              <Sparkles size={12} /> Travel Smart
           </div>
           <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
              Plan smarter, calmer <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-400">family trips</span> with NEST.
           </h1>
           <p className="text-nest-300 text-lg mb-8 max-w-lg">
              Organize itineraries, track expenses, and coordinate details in one beautiful workspace.
           </p>
           <button
             onClick={() => setIsCreating(!isCreating)}
             className="bg-primary-500 hover:bg-primary-400 text-white px-8 py-4 rounded-xl shadow-lg shadow-primary-900/50 flex items-center gap-2 transition-all transform hover:-translate-y-1 font-semibold text-lg group"
           >
             <Plus size={24} className="group-hover:rotate-90 transition-transform duration-300" />
             {isCreating ? 'Cancel Creation' : 'Create New Trip'}
           </button>
        </div>
      </div>

      {isCreating && (
        <div className="glass-panel p-8 rounded-2xl animate-slide-up border border-nest-700/50 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-accent-500"></div>
          <h2 className="text-xl font-bold text-white mb-6">Start a new adventure</h2>
          <form onSubmit={handleCreateTrip} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-nest-400 mb-2">Trip Name</label>
              <input required type="text" placeholder="e.g. Italian Summer" className="w-full bg-nest-900/50 border border-nest-700 rounded-xl p-3 text-white outline-none focus:ring-2 focus:ring-primary-500 transition-all placeholder:text-nest-700"
                value={newTrip.title} onChange={e => setNewTrip({...newTrip, title: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-nest-400 mb-2">Destination</label>
              <input required type="text" placeholder="e.g. Rome, Italy" className="w-full bg-nest-900/50 border border-nest-700 rounded-xl p-3 text-white outline-none focus:ring-2 focus:ring-primary-500 transition-all placeholder:text-nest-700"
                value={newTrip.destination} onChange={e => setNewTrip({...newTrip, destination: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-nest-400 mb-2">Start Date</label>
                  <input required type="date" className="w-full bg-nest-900/50 border border-nest-700 rounded-xl p-3 text-white outline-none focus:ring-2 focus:ring-primary-500 transition-all [color-scheme:dark]"
                    value={newTrip.start_date} onChange={e => setNewTrip({...newTrip, start_date: e.target.value})} />
               </div>
               <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-nest-400 mb-2">End Date</label>
                  <input required type="date" className="w-full bg-nest-900/50 border border-nest-700 rounded-xl p-3 text-white outline-none focus:ring-2 focus:ring-primary-500 transition-all [color-scheme:dark]"
                    value={newTrip.end_date} onChange={e => setNewTrip({...newTrip, end_date: e.target.value})} />
               </div>
            </div>
            <button type="submit" disabled={loading} className="bg-white text-nest-950 hover:bg-nest-100 font-bold p-3 rounded-xl transition-colors shadow-lg shadow-white/10 h-[50px]">
              {loading ? 'Creating...' : 'Launch Trip 🚀'}
            </button>
          </form>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-6">
           <h2 className="text-2xl font-bold text-white">Your Trips</h2>
           <div className="text-nest-500 text-sm">{trips.length} upcoming</div>
        </div>

        {loading && !isCreating ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {[1,2,3].map(i => <div key={i} className="h-72 bg-nest-900/50 animate-pulse rounded-3xl border border-nest-800"></div>)}
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-24 glass-card rounded-3xl border border-dashed border-nest-700">
            <div className="bg-nest-800/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
               <MapPin className="h-10 w-10 text-nest-500" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">No trips yet</h3>
            <p className="text-nest-400 max-w-sm mx-auto">Your next adventure begins here. Create your first trip to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {trips.map((trip) => (
              <Link to={`/trip/${trip.id}`} key={trip.id} className="group glass-card rounded-3xl overflow-hidden hover:border-primary-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary-900/20 relative flex flex-col h-[320px]">
                <div className="h-48 overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-nest-900 to-transparent z-10 opacity-90" />
                  <img src={trip.cover_image} alt={trip.destination} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute top-4 right-4 z-20">
                     <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border shadow-lg
                      ${trip.status === 'confirmed' ? 'bg-green-500/20 text-green-300 border-green-500/30' : 
                        trip.status === 'completed' ? 'bg-nest-500/20 text-nest-300 border-nest-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>
                      {trip.status}
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-4 z-20 text-white transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                    <h3 className="font-bold text-2xl mb-1">{trip.destination}</h3>
                    <div className="flex items-center text-nest-300 text-xs font-medium bg-black/30 backdrop-blur-sm px-2 py-1 rounded-lg w-fit">
                       <Calendar size={12} className="mr-2" />
                       <span>{new Date(trip.start_date).toLocaleDateString(undefined, {month:'short', day:'numeric'})} — {new Date(trip.end_date).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'})}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 flex-1 flex flex-col justify-between bg-nest-900/30 backdrop-blur-sm">
                  <div>
                    <h4 className="text-nest-200 font-medium text-lg leading-tight line-clamp-2">{trip.title}</h4>
                  </div>
                  
                  <div className="flex justify-between items-center pt-4 border-t border-white/5 mt-auto">
                    <div className="flex -space-x-2">
                       {/* Mock avatars */}
                       {[1,2].map(i => (
                          <div key={i} className="w-6 h-6 rounded-full bg-nest-700 border border-nest-900 flex items-center justify-center text-[8px] text-white">U{i}</div>
                       ))}
                    </div>
                    <div className="flex items-center text-primary-400 font-semibold text-sm group-hover:translate-x-2 transition-transform">
                      View Itinerary <ArrowRight size={16} className="ml-1" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};