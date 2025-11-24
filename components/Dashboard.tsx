import React, { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { Trip } from '../types';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Plus, ChevronRight } from 'lucide-react';
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
      // 1. Create Trip
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

      // 2. Generate Days automatically based on range
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
        // Add 1 day
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
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Your Trips</h1>
          <p className="text-gray-500 mt-1">Manage your upcoming adventures.</p>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="bg-nest-600 hover:bg-nest-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-nest-200 flex items-center gap-2 transition-all active:scale-95"
        >
          <Plus size={20} />
          {isCreating ? 'Cancel' : 'New Trip'}
        </button>
      </div>

      {isCreating && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-fade-in-down">
          <form onSubmit={handleCreateTrip} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Trip Name</label>
              <input required type="text" placeholder="Summer Vacation" className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-nest-500"
                value={newTrip.title} onChange={e => setNewTrip({...newTrip, title: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Destination</label>
              <input required type="text" placeholder="Paris, France" className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-nest-500"
                value={newTrip.destination} onChange={e => setNewTrip({...newTrip, destination: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-2">
               <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Start</label>
                  <input required type="date" className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-nest-500"
                    value={newTrip.start_date} onChange={e => setNewTrip({...newTrip, start_date: e.target.value})} />
               </div>
               <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">End</label>
                  <input required type="date" className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-nest-500"
                    value={newTrip.end_date} onChange={e => setNewTrip({...newTrip, end_date: e.target.value})} />
               </div>
            </div>
            <button type="submit" disabled={loading} className="bg-gray-900 text-white font-medium p-2.5 rounded-lg hover:bg-black transition-colors">
              {loading ? 'Creating...' : 'Create Trip'}
            </button>
          </form>
        </div>
      )}

      {loading && !isCreating ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {[1,2,3].map(i => <div key={i} className="h-64 bg-gray-200 animate-pulse rounded-2xl"></div>)}
        </div>
      ) : trips.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
          <MapPin className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No trips yet</h3>
          <p className="text-gray-500">Create your first trip to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => (
            <Link to={`/trip/${trip.id}`} key={trip.id} className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100">
              <div className="h-48 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent z-10" />
                <img src={trip.cover_image} alt={trip.destination} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute bottom-4 left-4 z-20 text-white">
                  <h3 className="font-bold text-xl">{trip.destination}</h3>
                  <p className="text-sm opacity-90">{trip.title}</p>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center text-sm text-gray-500 mb-4">
                  <Calendar size={16} className="mr-2" />
                  <span>{new Date(trip.start_date).toLocaleDateString()} — {new Date(trip.end_date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide
                    ${trip.status === 'confirmed' ? 'bg-green-100 text-green-700' : 
                      trip.status === 'completed' ? 'bg-gray-100 text-gray-700' : 'bg-amber-100 text-amber-700'}`}>
                    {trip.status}
                  </span>
                  <div className="flex items-center text-nest-600 font-medium text-sm group-hover:translate-x-1 transition-transform">
                    Plan <ChevronRight size={16} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};