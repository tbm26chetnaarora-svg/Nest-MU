import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { Trip, Day, Activity, ActivityCategory } from '../types';
import { Plus, Calendar, MapPin, DollarSign, Clock, Trash2 } from 'lucide-react';
import { CATEGORY_COLORS } from '../constants';

interface TripDetailProps {
  session: Session;
}

export const TripDetail: React.FC<TripDetailProps> = ({ session }) => {
  const { tripId } = useParams();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showActivityForm, setShowActivityForm] = useState(false);

  // New Activity State
  const [newActivity, setNewActivity] = useState<Partial<Activity>>({
    title: '',
    cost: 0,
    category: ActivityCategory.OTHER,
    is_booked: false
  });

  useEffect(() => {
    if (tripId) {
      fetchTripData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  const fetchTripData = async () => {
    try {
      setLoading(true);
      
      const [tripRes, daysRes, actRes] = await Promise.all([
        supabase.from('trips').select('*').eq('id', tripId).single(),
        supabase.from('days').select('*').eq('trip_id', tripId).order('date', { ascending: true }),
        supabase.from('activities').select('*').eq('trip_id', tripId)
      ]);

      if (tripRes.error) throw tripRes.error;
      if (daysRes.error) throw daysRes.error;
      if (actRes.error) throw actRes.error;

      setTrip(tripRes.data);
      setDays(daysRes.data);
      setActivities(actRes.data);
      
      if (daysRes.data.length > 0 && !selectedDayId) {
        setSelectedDayId(daysRes.data[0].id);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDayId || !tripId) return;

    try {
      const { data, error } = await supabase.from('activities').insert([{
        ...newActivity,
        trip_id: tripId,
        day_id: selectedDayId
      }]).select().single();

      if (error) throw error;

      setActivities([...activities, data]);
      setShowActivityForm(false);
      setNewActivity({ title: '', cost: 0, category: ActivityCategory.OTHER, is_booked: false });
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteActivity = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    const { error } = await supabase.from('activities').delete().eq('id', id);
    if (!error) {
      setActivities(activities.filter(a => a.id !== id));
    }
  };

  const totalCost = useMemo(() => activities.reduce((sum, act) => sum + (act.cost || 0), 0), [activities]);
  
  const selectedDayActivities = useMemo(() => {
    if (!selectedDayId) return [];
    return activities
      .filter(a => a.day_id === selectedDayId)
      .sort((a, b) => (a.time || '') > (b.time || '') ? 1 : -1);
  }, [activities, selectedDayId]);

  if (loading || !trip) return <div className="p-8 text-center text-gray-500">Loading trip details...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{trip.title}</h1>
          <div className="flex items-center gap-4 mt-2 text-gray-500 text-sm">
            <span className="flex items-center gap-1"><MapPin size={14} /> {trip.destination}</span>
            <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex flex-col items-end">
           <div className="text-sm text-gray-500 uppercase font-semibold">Total Estimated Cost</div>
           <div className="text-2xl font-bold text-nest-700">${totalCost.toLocaleString()}</div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Days Sidebar */}
        <div className="w-full lg:w-72 flex-shrink-0 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-fit">
          <div className="p-4 bg-gray-50 border-b border-gray-100 font-semibold text-gray-700">Itinerary</div>
          <div className="max-h-[500px] overflow-y-auto">
            {days.map((day) => (
              <button
                key={day.id}
                onClick={() => setSelectedDayId(day.id)}
                className={`w-full text-left p-4 border-l-4 transition-all hover:bg-gray-50 flex justify-between items-center group
                  ${selectedDayId === day.id ? 'border-nest-500 bg-nest-50/50' : 'border-transparent'}`}
              >
                <div>
                  <div className="font-bold text-gray-800">Day {day.day_number}</div>
                  <div className="text-xs text-gray-500">{new Date(day.date).toLocaleDateString(undefined, {weekday: 'short', month: 'short', day: 'numeric'})}</div>
                </div>
                <div className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">
                  {activities.filter(a => a.day_id === day.id).length} Acts
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Activity Area */}
        <div className="flex-1">
           <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                 Day {days.find(d => d.id === selectedDayId)?.day_number} Activities
              </h2>
              <button 
                onClick={() => setShowActivityForm(!showActivityForm)}
                className="flex items-center gap-2 text-sm bg-nest-600 text-white px-3 py-2 rounded-lg hover:bg-nest-700 transition-colors shadow-md shadow-nest-200"
              >
                <Plus size={16} /> Add Activity
              </button>
           </div>

           {/* Add Form */}
           {showActivityForm && (
             <div className="bg-white p-5 rounded-xl border border-nest-200 shadow-lg mb-6 animate-fade-in-down">
                <form onSubmit={handleAddActivity} className="space-y-4">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input required autoFocus placeholder="Activity Title (e.g. Louvre Museum)" className="border p-2 rounded-lg w-full" 
                        value={newActivity.title} onChange={e => setNewActivity({...newActivity, title: e.target.value})} />
                      <select className="border p-2 rounded-lg w-full"
                        value={newActivity.category} onChange={e => setNewActivity({...newActivity, category: e.target.value as ActivityCategory})}>
                          {Object.values(ActivityCategory).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <input type="time" className="border p-2 rounded-lg w-full" 
                        value={newActivity.time || ''} onChange={e => setNewActivity({...newActivity, time: e.target.value})} />
                      <div className="relative">
                         <span className="absolute left-3 top-2 text-gray-400">$</span>
                         <input type="number" placeholder="Cost" className="border p-2 pl-6 rounded-lg w-full" 
                           value={newActivity.cost || ''} onChange={e => setNewActivity({...newActivity, cost: parseFloat(e.target.value)})} />
                      </div>
                      <input placeholder="Location / Notes" className="border p-2 rounded-lg w-full" 
                           value={newActivity.location || ''} onChange={e => setNewActivity({...newActivity, location: e.target.value})} />
                   </div>
                   <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setShowActivityForm(false)} className="px-4 py-2 text-gray-500 hover:text-gray-700">Cancel</button>
                      <button type="submit" className="px-4 py-2 bg-nest-600 text-white rounded-lg hover:bg-nest-700">Save Activity</button>
                   </div>
                </form>
             </div>
           )}

           {/* List */}
           <div className="space-y-3">
              {selectedDayActivities.length === 0 ? (
                 <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                    <p className="text-gray-400">No activities planned for this day yet.</p>
                 </div>
              ) : (
                selectedDayActivities.map(act => (
                  <div key={act.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex gap-4">
                     <div className="flex flex-col items-center justify-center w-16 text-gray-400 border-r border-gray-100 pr-4">
                        <Clock size={16} className="mb-1" />
                        <span className="text-xs font-mono">{act.time || '--:--'}</span>
                     </div>
                     <div className="flex-1">
                        <div className="flex justify-between items-start">
                           <h3 className="font-bold text-gray-800">{act.title}</h3>
                           <span className={`text-[10px] px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[act.category]}`}>
                              {act.category}
                           </span>
                        </div>
                        {act.location && <div className="text-sm text-gray-500 mt-1 flex items-center gap-1"><MapPin size={12}/> {act.location}</div>}
                     </div>
                     <div className="flex flex-col items-end justify-between pl-4 border-l border-gray-100">
                        <div className="font-medium text-gray-700 flex items-center"><DollarSign size={12}/>{act.cost}</div>
                        <button onClick={() => handleDeleteActivity(act.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                           <Trash2 size={16} />
                        </button>
                     </div>
                  </div>
                ))
              )}
           </div>
        </div>
      </div>
    </div>
  );
};