import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { Trip, Day, Activity, ActivityCategory } from '../types';
import { Plus, Calendar, MapPin, DollarSign, Clock, Trash2, X, CheckCircle2 } from 'lucide-react';
import { CATEGORY_COLORS } from '../constants';

interface TripDetailProps {
  session: Session;
}

const getCategoryIcon = (category: ActivityCategory) => {
  switch (category) {
    case ActivityCategory.FOOD: return '🍽️';
    case ActivityCategory.ADVENTURE: return '🧗';
    case ActivityCategory.SIGHTSEEING: return '🏛️';
    case ActivityCategory.RELAX: return '🧖';
    case ActivityCategory.TRAVEL: return '✈️';
    case ActivityCategory.OTHER: return '📦';
    default: return '📍';
  }
};

const getCategoryColor = (category: ActivityCategory) => {
    switch (category) {
        case ActivityCategory.FOOD: return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
        case ActivityCategory.ADVENTURE: return 'text-red-400 bg-red-400/10 border-red-400/20';
        case ActivityCategory.SIGHTSEEING: return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
        case ActivityCategory.RELAX: return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
        case ActivityCategory.TRAVEL: return 'text-sky-400 bg-sky-400/10 border-sky-400/20';
        case ActivityCategory.OTHER: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
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
    if (!confirm("Remove this activity?")) return;
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

  const currentDay = useMemo(() => days.find(d => d.id === selectedDayId), [days, selectedDayId]);

  if (loading || !trip) return (
      <div className="flex h-64 items-center justify-center text-nest-500 font-mono text-sm animate-pulse">
          INITIALIZING TRIP MATRIX...
      </div>
  );

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Page Title Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-nest-800 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
               <span className="px-2 py-0.5 rounded border border-nest-700 bg-nest-900 text-[10px] text-nest-400 font-mono uppercase tracking-widest">Trip Details</span>
               <span className="h-px w-8 bg-nest-800"></span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">{trip.title}</h1>
            <div className="flex items-center gap-4 text-nest-400 text-sm font-medium">
                <span className="flex items-center gap-1.5"><MapPin size={14} className="text-primary-400"/> {trip.destination}</span>
                <span className="w-1 h-1 rounded-full bg-nest-700"></span>
                <span className="flex items-center gap-1.5"><Calendar size={14} className="text-primary-400"/> {new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6 bg-nest-900/50 p-4 rounded-2xl border border-nest-800 backdrop-blur-sm">
             <div className="text-right">
                <div className="text-[10px] text-nest-500 uppercase font-bold tracking-wider mb-1">Total Activities</div>
                <div className="text-xl font-bold text-white">{activities.length}</div>
             </div>
             <div className="w-px h-8 bg-nest-800"></div>
             <div className="text-right">
                <div className="text-[10px] text-nest-500 uppercase font-bold tracking-wider mb-1">Est. Cost</div>
                <div className="text-xl font-bold text-primary-400">${totalCost.toLocaleString()}</div>
             </div>
          </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start relative">
        {/* Days Navigation Sidebar */}
        <div className="w-full lg:w-64 flex-shrink-0 space-y-2 sticky top-24">
            <h3 className="text-xs font-bold text-nest-500 uppercase tracking-widest px-2 mb-4">Itinerary Days</h3>
            <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto pr-2 custom-scrollbar">
                {days.map((day) => {
                    const isActive = selectedDayId === day.id;
                    const dayCost = activities.filter(a => a.day_id === day.id).reduce((s, a) => s + (a.cost || 0), 0);
                    
                    return (
                        <button
                            key={day.id}
                            onClick={() => setSelectedDayId(day.id)}
                            className={`w-full text-left p-3 rounded-xl transition-all duration-200 group relative overflow-hidden
                            ${isActive 
                                ? 'bg-primary-900/20 border border-primary-500/30 shadow-[0_0_15px_rgba(56,189,248,0.1)]' 
                                : 'bg-nest-900/40 border border-transparent hover:bg-nest-800 hover:border-nest-700'
                            }`}
                        >
                            {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-500"></div>}
                            <div className="flex justify-between items-center mb-1">
                                <span className={`font-bold text-sm ${isActive ? 'text-primary-400' : 'text-nest-200'}`}>Day {day.day_number}</span>
                                {dayCost > 0 && <span className="text-[10px] text-nest-500 font-mono">${dayCost}</span>}
                            </div>
                            <div className={`text-xs ${isActive ? 'text-nest-300' : 'text-nest-500'}`}>
                                {new Date(day.date).toLocaleDateString(undefined, {weekday: 'short', month: 'short', day: 'numeric'})}
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 w-full min-h-[500px]">
            {/* Day Header */}
            <div className="glass-panel p-6 rounded-t-3xl border-b border-nest-800 flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white">
                         Day {currentDay?.day_number}
                    </h2>
                    <p className="text-nest-400 text-sm mt-1">{currentDay && new Date(currentDay.date).toLocaleDateString(undefined, {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}</p>
                </div>
                <button 
                    onClick={() => setShowActivityForm(true)}
                    className="flex items-center gap-2 bg-primary-500 hover:bg-primary-400 text-white px-4 py-2.5 rounded-xl font-semibold shadow-lg shadow-primary-900/30 transition-all hover:scale-105"
                >
                    <Plus size={18} /> <span className="hidden sm:inline">Add Activity</span>
                </button>
            </div>

            {/* Activities List */}
            <div className="space-y-4">
                {selectedDayActivities.length === 0 ? (
                    <div className="text-center py-20 rounded-3xl border border-dashed border-nest-800 bg-nest-900/20">
                        <div className="w-16 h-16 rounded-full bg-nest-800 flex items-center justify-center mx-auto mb-4 text-nest-600">
                             <Clock size={24} />
                        </div>
                        <p className="text-nest-400 font-medium">No activities planned for this day.</p>
                        <button onClick={() => setShowActivityForm(true)} className="text-primary-400 text-sm mt-2 hover:underline">Add your first stop</button>
                    </div>
                ) : (
                    selectedDayActivities.map((act, index) => (
                        <div key={act.id} className="group relative bg-nest-900/60 backdrop-blur-sm border border-nest-800 hover:border-nest-700 rounded-2xl p-5 transition-all hover:translate-x-1 flex gap-5 items-start overflow-hidden">
                            {/* Connector Line */}
                            {index !== selectedDayActivities.length - 1 && (
                                <div className="absolute left-[2.4rem] top-16 bottom-[-20px] w-0.5 bg-nest-800 -z-10 group-hover:bg-nest-700 transition-colors"></div>
                            )}

                            <div className="flex flex-col items-center gap-2 mt-1">
                                <div className="w-14 h-14 rounded-2xl bg-nest-950 border border-nest-800 flex items-center justify-center text-2xl shadow-inner">
                                    {getCategoryIcon(act.category)}
                                </div>
                                <div className="text-xs font-mono text-nest-500 bg-nest-950 px-2 py-0.5 rounded border border-nest-800">
                                    {act.time || '--:--'}
                                </div>
                            </div>

                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-bold text-nest-50 group-hover:text-primary-400 transition-colors">{act.title}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium uppercase tracking-wider ${getCategoryColor(act.category)}`}>
                                                {act.category}
                                            </span>
                                            {act.location && (
                                                <span className="text-xs text-nest-400 flex items-center gap-1">
                                                    <MapPin size={10} /> {act.location}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-nest-200 text-lg flex items-center justify-end">
                                            <span className="text-nest-600 text-xs mr-1">$</span>{act.cost}
                                        </div>
                                    </div>
                                </div>
                                
                                {act.notes && (
                                    <p className="mt-3 text-sm text-nest-400 bg-nest-950/50 p-3 rounded-lg border border-nest-800/50 italic">
                                        "{act.notes}"
                                    </p>
                                )}
                            </div>

                            <button 
                                onClick={() => handleDeleteActivity(act.id)}
                                className="absolute top-4 right-4 text-nest-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-2 bg-nest-950/80 rounded-lg backdrop-blur-sm"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* Floating Add Form Modal */}
        {showActivityForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-nest-950/80 backdrop-blur-sm animate-fade-in">
                <div className="w-full max-w-lg bg-nest-900 border border-nest-700 rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
                    <div className="p-6 border-b border-nest-800 flex justify-between items-center bg-nest-850">
                        <h3 className="font-bold text-xl text-white">Add New Activity</h3>
                        <button onClick={() => setShowActivityForm(false)} className="text-nest-400 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                    
                    <form onSubmit={handleAddActivity} className="p-6 space-y-5">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-nest-400 uppercase tracking-wider">Activity Title</label>
                            <input required autoFocus placeholder="e.g. Dinner at Le Jules Verne" 
                                className="w-full bg-nest-950 border border-nest-700 rounded-xl p-3 text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all placeholder:text-nest-700" 
                                value={newActivity.title} onChange={e => setNewActivity({...newActivity, title: e.target.value})} 
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-nest-400 uppercase tracking-wider">Category</label>
                                <select 
                                    className="w-full bg-nest-950 border border-nest-700 rounded-xl p-3 text-white focus:border-primary-500 outline-none appearance-none"
                                    value={newActivity.category} onChange={e => setNewActivity({...newActivity, category: e.target.value as ActivityCategory})}
                                >
                                    {Object.values(ActivityCategory).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-nest-400 uppercase tracking-wider">Time</label>
                                <input type="time" 
                                    className="w-full bg-nest-950 border border-nest-700 rounded-xl p-3 text-white focus:border-primary-500 outline-none [color-scheme:dark]" 
                                    value={newActivity.time || ''} onChange={e => setNewActivity({...newActivity, time: e.target.value})} 
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1">
                                <label className="text-xs font-bold text-nest-400 uppercase tracking-wider">Cost</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-3 text-nest-500">$</span>
                                    <input type="number" 
                                        className="w-full bg-nest-950 border border-nest-700 rounded-xl p-3 pl-8 text-white focus:border-primary-500 outline-none" 
                                        value={newActivity.cost || ''} onChange={e => setNewActivity({...newActivity, cost: parseFloat(e.target.value)})} 
                                    />
                                </div>
                             </div>
                             <div className="space-y-1">
                                <label className="text-xs font-bold text-nest-400 uppercase tracking-wider">Location</label>
                                <input placeholder="Optional"
                                    className="w-full bg-nest-950 border border-nest-700 rounded-xl p-3 text-white focus:border-primary-500 outline-none" 
                                    value={newActivity.location || ''} onChange={e => setNewActivity({...newActivity, location: e.target.value})} 
                                />
                             </div>
                        </div>

                        <div className="space-y-1">
                             <label className="text-xs font-bold text-nest-400 uppercase tracking-wider">Notes</label>
                             <textarea rows={3} placeholder="Any details..."
                                className="w-full bg-nest-950 border border-nest-700 rounded-xl p-3 text-white focus:border-primary-500 outline-none resize-none placeholder:text-nest-700" 
                                value={newActivity.notes || ''} onChange={e => setNewActivity({...newActivity, notes: e.target.value})} 
                             />
                        </div>

                        <div className="pt-4 flex gap-3">
                            <button type="button" onClick={() => setShowActivityForm(false)} className="flex-1 py-3 bg-nest-800 hover:bg-nest-700 text-white rounded-xl font-medium transition-colors">
                                Cancel
                            </button>
                            <button type="submit" className="flex-1 py-3 bg-primary-500 hover:bg-primary-400 text-white rounded-xl font-bold shadow-lg shadow-primary-900/40 transition-colors">
                                Save Activity
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};