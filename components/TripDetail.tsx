
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { Trip, Day, Activity, ActivityCategory } from '../types';
import { Plus, Calendar, MapPin, Clock, Trash2, X, ArrowLeft, Sparkles, Bot, Loader2, Globe, Zap, ExternalLink, Phone, Star, Edit2, Wand2, Users, Video, Map as MapIcon } from 'lucide-react';
import { DEMO_USER_ID, MOCK_ACTIVITIES, MOCK_DAYS, MOCK_TRIPS } from '../constants';
import { generateDaySuggestions, getQuickTip, getLiveDestinationInfo, getActivityDetails, editTripImage, AiSuggestion, GroundedResponse, ActivityDetail } from '../aiClient';

interface TripDetailProps {
  session: Session;
}

// Visual assets for categories
const CATEGORY_IMAGES: Record<ActivityCategory, string> = {
  [ActivityCategory.FOOD]: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2070&auto=format&fit=crop',
  [ActivityCategory.ADVENTURE]: 'https://images.unsplash.com/photo-1533692328991-08159ff19fca?q=80&w=2069&auto=format&fit=crop',
  [ActivityCategory.SIGHTSEEING]: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop',
  [ActivityCategory.RELAX]: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=2070&auto=format&fit=crop',
  [ActivityCategory.TRAVEL]: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=2074&auto=format&fit=crop',
  [ActivityCategory.OTHER]: 'https://images.unsplash.com/photo-1512418490979-92798cec1380?q=80&w=2070&auto=format&fit=crop',
};

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
        default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
}

export const TripDetail: React.FC<TripDetailProps> = ({ session }) => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Modals & Tabs
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'itinerary' | 'live' | 'map'>('itinerary');
  
  // Selected Activity Detail Modal
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activityDetails, setActivityDetails] = useState<ActivityDetail | null>(null);

  // AI State
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);
  
  // Fast AI Tip
  const [quickTip, setQuickTip] = useState<string>('');

  // Live Grounding State
  const [liveQuery, setLiveQuery] = useState('');
  const [liveResult, setLiveResult] = useState<GroundedResponse | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);

  // Magic Image Edit State
  const [showImageEdit, setShowImageEdit] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditingImage, setIsEditingImage] = useState(false);

  // New Activity State
  const [newActivity, setNewActivity] = useState<Partial<Activity>>({
    title: '',
    cost: 0,
    category: ActivityCategory.OTHER,
    is_booked: false,
    assigned_to: []
  });

  useEffect(() => {
    if (tripId) {
      fetchTripData();
    }
  }, [tripId]);

  useEffect(() => {
      if (trip?.destination) {
          getQuickTip(trip.destination).then(setQuickTip);
      }
  }, [trip?.destination]);

  // When an activity is selected, fetch deep details from AI
  useEffect(() => {
      if (selectedActivity && trip?.destination) {
          setDetailLoading(true);
          setActivityDetails(null);
          getActivityDetails(selectedActivity.title, selectedActivity.location || trip.destination)
            .then(details => {
                setActivityDetails(details);
                setDetailLoading(false);
            })
            .catch(() => setDetailLoading(false));
      }
  }, [selectedActivity, trip?.destination]);

  const fetchTripData = async () => {
    setLoading(true);

    if (session.user.id === DEMO_USER_ID) {
      const mockTrip = MOCK_TRIPS.find(t => t.id === tripId);
      if (mockTrip) {
        setTrip(mockTrip);
        const tripDays = MOCK_DAYS.filter(d => d.trip_id === tripId);
        const tripActivities = MOCK_ACTIVITIES.filter(a => a.trip_id === tripId);
        setDays(tripDays);
        setActivities(tripActivities);
        if (tripDays.length > 0 && !selectedDayId) setSelectedDayId(tripDays[0].id);
      }
      setLoading(false);
      return;
    }

    try {
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
      if (daysRes.data.length > 0 && !selectedDayId) setSelectedDayId(daysRes.data[0].id);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleMagicEdit = async () => {
      if (!editPrompt.trim() || !trip) return;
      setIsEditingImage(true);

      try {
          // 1. Convert current image to base64 if it's a URL
          let base64Img = trip.cover_image;
          
          if (trip.cover_image.startsWith('http')) {
              try {
                  const response = await fetch(trip.cover_image);
                  const blob = await response.blob();
                  base64Img = await new Promise<string>((resolve) => {
                      const reader = new FileReader();
                      reader.onloadend = () => resolve(reader.result as string);
                      reader.readAsDataURL(blob);
                  });
              } catch (e) {
                 // Fallback: If CORS blocks fetch, we can't edit. 
                 alert("Cannot edit this specific image due to security restrictions. Try generating a new one first.");
                 setIsEditingImage(false);
                 return;
              }
          }

          // 2. Call AI
          const newImage = await editTripImage(base64Img, editPrompt);
          
          if (newImage) {
              // 3. Update Trip
              setTrip({ ...trip, cover_image: newImage });
              setShowImageEdit(false);
              setEditPrompt('');
              
              if (session.user.id !== DEMO_USER_ID) {
                  await supabase.from('trips').update({ cover_image: newImage }).eq('id', trip.id);
              }
          } else {
              alert("Could not generate edited image. Try a different prompt.");
          }

      } catch (err) {
          console.error(err);
          alert("Image editing failed.");
      } finally {
          setIsEditingImage(false);
      }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDayId || !tripId) return;
    await createActivity(newActivity);
    setShowActivityForm(false);
    setNewActivity({ title: '', cost: 0, category: ActivityCategory.OTHER, is_booked: false, assigned_to: [] });
  };

  const createActivity = async (activityData: Partial<Activity>) => {
    if (!selectedDayId || !tripId) return;

    if (session.user.id === DEMO_USER_ID) {
        const mockNew: Activity = {
            id: `mock-act-${Date.now()}`,
            trip_id: tripId,
            day_id: selectedDayId,
            title: activityData.title || 'New Activity',
            cost: activityData.cost || 0,
            category: activityData.category || ActivityCategory.OTHER,
            is_booked: false,
            created_at: new Date().toISOString(),
            time: activityData.time,
            location: activityData.location,
            notes: activityData.notes,
            assigned_to: activityData.assigned_to
        };
        MOCK_ACTIVITIES.push(mockNew);
        setActivities(prev => [...prev, mockNew]);
        return;
    }

    try {
      const { data, error } = await supabase.from('activities').insert([{
        ...activityData,
        trip_id: tripId,
        day_id: selectedDayId
      }]).select().single();

      if (error) throw error;
      setActivities(prev => [...prev, data]);
    } catch (error) {
      console.error("Error creating activity:", error);
    }
  };

  const handleDeleteActivity = async (id: string) => {
    if (!confirm("Remove this activity?")) return;
    
    // If we are in the detail modal, close it
    if (selectedActivity?.id === id) setSelectedActivity(null);

    if (session.user.id === DEMO_USER_ID) {
        const idx = MOCK_ACTIVITIES.findIndex(a => a.id === id);
        if (idx > -1) MOCK_ACTIVITIES.splice(idx, 1);
        setActivities(activities.filter(a => a.id !== id));
        return;
    }

    const { error } = await supabase.from('activities').delete().eq('id', id);
    if (!error) {
      setActivities(activities.filter(a => a.id !== id));
    }
  };

  const handleAiGenerate = async () => {
    if (!trip || !currentDay) return;
    setAiLoading(true);
    setAiError(null);
    setAiSuggestions([]);

    const currentTitles = activities
        .filter(a => a.day_id === selectedDayId)
        .map(a => a.title);

    try {
        if (session.user.id === DEMO_USER_ID) {
            await new Promise(resolve => setTimeout(resolve, 1500));
            setAiSuggestions([
                { title: "Local Café Breakfast", category: ActivityCategory.FOOD, time: "09:00", cost: 25, notes: "Start the day with famous pastries.", location: "Old Town" },
                { title: "City Museum Tour", category: ActivityCategory.SIGHTSEEING, time: "11:00", cost: 15, notes: "Family friendly history exhibits.", location: "Museum District" },
                { title: "River Boat Cruise", category: ActivityCategory.ADVENTURE, time: "15:00", cost: 40, notes: "See the city from the water.", location: "Pier 4" },
            ]);
            return;
        }

        const suggestions = await generateDaySuggestions(
            trip.destination,
            new Date(currentDay.date).toDateString(),
            currentDay.day_number,
            aiPrompt,
            currentTitles
        );
        setAiSuggestions(suggestions);
    } catch (err: any) {
        console.error(err);
        setAiError(err.message || "Failed to generate suggestions.");
    } finally {
        setAiLoading(false);
    }
  };

  const handleLiveSearch = async () => {
      if (!liveQuery.trim()) return;
      setLiveLoading(true);
      try {
          const res = await getLiveDestinationInfo(liveQuery + ` in ${trip?.destination}`);
          setLiveResult(res);
      } catch (e) {
          console.error(e);
      } finally {
          setLiveLoading(false);
      }
  }

  const handleAddSuggestion = async (suggestion: AiSuggestion) => {
      await createActivity({
          title: suggestion.title,
          category: suggestion.category,
          time: suggestion.time,
          cost: suggestion.cost,
          location: suggestion.location,
          notes: suggestion.notes,
          is_booked: false
      });
      setAiSuggestions(prev => prev.filter(s => s.title !== suggestion.title));
  };

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
    <div className="flex flex-col h-full animate-fade-in pb-20">
      {/* Page Title Header with Background Video or Image */}
      <div className="relative mb-6 rounded-3xl overflow-hidden shadow-2xl group/header min-h-[240px]">
         {/* Background Layer */}
         <div className="absolute inset-0">
             {trip.video_url ? (
                 <video 
                    src={trip.video_url} 
                    autoPlay 
                    loop 
                    muted 
                    playsInline 
                    className="w-full h-full object-cover" 
                 />
             ) : (
                 <img src={trip.cover_image} alt={trip.destination} className="w-full h-full object-cover transition-transform duration-700 group-hover/header:scale-105" />
             )}
             
             {/* Gradient Overlays */}
             <div className="absolute inset-0 bg-gradient-to-r from-nest-950 via-nest-950/80 to-nest-950/20 md:via-nest-950/60 md:to-transparent"></div>
             <div className="absolute inset-0 bg-gradient-to-t from-nest-950 to-transparent opacity-80"></div>
         </div>

         {/* Content Layer */}
         <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row md:items-end justify-between gap-6 h-full">
            <div className="flex gap-4 items-start w-full md:w-auto mt-auto">
                <button 
                    onClick={() => navigate('/')}
                    className="mt-1 p-2 rounded-xl bg-nest-950/50 border border-nest-800 text-white/80 hover:text-white hover:bg-nest-950 transition-all group backdrop-blur-md"
                >
                    <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                </button>

                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded border border-white/10 bg-black/30 backdrop-blur-sm text-[10px] text-white/80 font-mono uppercase tracking-widest shadow-sm">Trip Details</span>
                        {trip.video_url && (
                            <span className="flex items-center gap-1.5 text-[10px] text-accent-300 bg-accent-950/50 backdrop-blur-md px-2 py-0.5 rounded-full border border-accent-500/30 animate-pulse">
                                <Video size={10} fill="currentColor" /> CINEMATIC TEASER ACTIVE
                            </span>
                        )}
                        {quickTip && (
                            <span className="hidden md:flex items-center gap-1.5 text-xs text-primary-300 bg-primary-950/50 backdrop-blur-md px-2 py-0.5 rounded-full border border-primary-500/30 shadow-lg animate-fade-in">
                                <Zap size={10} fill="currentColor" /> {quickTip}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                         <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 tracking-tight drop-shadow-lg">{trip.title}</h1>
                         {/* Edit Image Button (Only show if video is not active, or allow overriding) */}
                         <button 
                            onClick={() => setShowImageEdit(!showImageEdit)}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all opacity-0 group-hover/header:opacity-100"
                            title="Magic Edit Cover Image"
                         >
                            <Wand2 size={16} />
                         </button>
                    </div>
                    
                    <div className="flex items-center gap-4 text-white/80 text-sm font-medium">
                        <span className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-lg backdrop-blur-sm"><MapPin size={14} className="text-primary-400"/> {trip.destination}</span>
                        <span className="w-1 h-1 rounded-full bg-white/40"></span>
                        <span className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-lg backdrop-blur-sm"><Calendar size={14} className="text-primary-400"/> {new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
            
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                <button onClick={() => setActiveTab('itinerary')} className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-all backdrop-blur-md border border-white/10 ${activeTab === 'itinerary' ? 'bg-primary-500/90 text-white shadow-lg shadow-primary-900/40' : 'bg-nest-950/40 text-white/70 hover:text-white hover:bg-nest-950/60'}`}>
                    Itinerary Planner
                </button>
                <button onClick={() => setActiveTab('map')} className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 backdrop-blur-md border border-white/10 ${activeTab === 'map' ? 'bg-emerald-600/90 text-white shadow-lg shadow-emerald-900/40' : 'bg-nest-950/40 text-white/70 hover:text-white hover:bg-nest-950/60'}`}>
                    <MapIcon size={14} /> Map View
                </button>
                <button onClick={() => setActiveTab('live')} className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 backdrop-blur-md border border-white/10 ${activeTab === 'live' ? 'bg-accent-600/90 text-white shadow-lg shadow-accent-900/40' : 'bg-nest-950/40 text-white/70 hover:text-white hover:bg-nest-950/60'}`}>
                    <Globe size={14} /> Live Explore
                </button>
            </div>
         </div>

         {/* Magic Edit Overlay */}
         {showImageEdit && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 w-80 bg-nest-950/90 backdrop-blur-xl border border-accent-500 rounded-2xl p-4 shadow-2xl animate-fade-in">
                <h4 className="text-white text-sm font-bold mb-2 flex items-center gap-2"><Wand2 size={14} className="text-accent-400" /> Magic Edit Cover</h4>
                <textarea 
                    className="w-full bg-nest-900 rounded-lg p-2 text-sm text-white border border-nest-700 focus:border-accent-500 outline-none resize-none mb-3"
                    rows={2}
                    placeholder="e.g. Add a retro filter, remove people..."
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                />
                <div className="flex gap-2">
                    <button 
                        onClick={() => setShowImageEdit(false)}
                        className="flex-1 py-1.5 text-xs text-nest-400 hover:text-white"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleMagicEdit}
                        disabled={isEditingImage || !editPrompt.trim()}
                        className="flex-1 py-1.5 bg-accent-600 hover:bg-accent-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2"
                    >
                        {isEditingImage ? <Loader2 size={12} className="animate-spin" /> : 'Apply Magic'}
                    </button>
                </div>
            </div>
         )}
      </div>

      {activeTab === 'map' ? (
        // --- MAP VIEW TAB ---
        <div className="animate-fade-in flex-1 relative min-h-[500px] bg-nest-900 rounded-3xl border border-nest-800 overflow-hidden">
            <iframe
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                marginHeight={0}
                marginWidth={0}
                className="absolute inset-0 w-full h-full opacity-80 hover:opacity-100 transition-opacity"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(trip.destination)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                title="Trip Destination Map"
            ></iframe>
            <div className="absolute top-4 left-4 z-10 bg-nest-950/80 backdrop-blur-md p-4 rounded-xl border border-nest-700 max-w-xs">
                <h3 className="text-white font-bold mb-1 flex items-center gap-2"><MapPin size={16} className="text-emerald-500"/> {trip.destination}</h3>
                <p className="text-xs text-nest-400">Explore the area map. Activities are located around the city center.</p>
            </div>
        </div>
      ) : activeTab === 'live' ? (
        // --- LIVE EXPLORE TAB ---
        <div className="animate-fade-in flex-1">
            <div className="max-w-3xl mx-auto">
                <div className="bg-nest-900 border border-nest-800 rounded-3xl p-8 text-center mb-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-accent-900/20 to-primary-900/20"></div>
                    <div className="relative z-10">
                        <h2 className="text-2xl font-bold text-white mb-2">Explore {trip.destination} Live</h2>
                        <p className="text-nest-400 mb-6 text-sm">Use Google Search & Maps to find real-time events, news, and top-rated spots.</p>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                placeholder="e.g. Best pizza nearby, Weather this week, Trending events..." 
                                className="flex-1 bg-nest-950 border border-nest-700 rounded-xl px-4 py-3 text-white focus:border-accent-500 outline-none"
                                value={liveQuery}
                                onChange={(e) => setLiveQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleLiveSearch()}
                            />
                            <button onClick={handleLiveSearch} disabled={liveLoading} className="px-6 py-3 bg-white text-nest-950 font-bold rounded-xl hover:bg-nest-200 transition-colors flex items-center gap-2">
                                {liveLoading ? <Loader2 className="animate-spin" /> : 'Search'}
                            </button>
                        </div>
                    </div>
                </div>

                {liveResult && (
                    <div className="bg-nest-900/50 border border-nest-800 rounded-3xl p-6 animate-slide-up">
                        <div className="prose prose-invert max-w-none">
                            <p className="text-nest-200 leading-relaxed whitespace-pre-wrap">{liveResult.text}</p>
                        </div>
                        
                        {(liveResult.webSources || liveResult.mapSources) && (
                            <div className="mt-6 pt-6 border-t border-nest-800">
                                <h4 className="text-xs font-bold text-nest-500 uppercase tracking-widest mb-3">Sources & Maps</h4>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {liveResult.webSources?.map((source, idx) => (
                                        <a key={idx} href={source.uri} target="_blank" rel="noopener noreferrer" className="text-xs bg-nest-950 text-primary-400 px-3 py-1.5 rounded-lg border border-nest-700 hover:border-primary-500 flex items-center gap-1.5 transition-colors">
                                            <Globe size={10} /> {source.title}
                                        </a>
                                    ))}
                                    {liveResult.mapSources?.map((source, idx) => (
                                        <a key={idx} href={source.uri} target="_blank" rel="noopener noreferrer" className="text-xs bg-nest-950 text-accent-400 px-3 py-1.5 rounded-lg border border-nest-700 hover:border-accent-500 flex items-center gap-1.5 transition-colors">
                                            <MapPin size={10} /> {source.title}
                                        </a>
                                    ))}
                                </div>
                                {/* Embed first map source if available */}
                                {liveResult.mapSources && liveResult.mapSources.length > 0 && (
                                    <div className="rounded-xl overflow-hidden border border-nest-800 h-64 w-full mt-4">
                                         <iframe
                                            width="100%"
                                            height="100%"
                                            frameBorder="0"
                                            src={`https://maps.google.com/maps?q=${encodeURIComponent(liveResult.mapSources[0].title || liveQuery)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                                            title="Live Result Map"
                                        ></iframe>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
      ) : (
        // --- ITINERARY TAB ---
        <div className="flex flex-col lg:flex-row gap-8 items-start relative animate-fade-in">
            {/* Days Navigation Sidebar */}
            <div className="w-full lg:w-64 flex-shrink-0 space-y-2 lg:sticky lg:top-24">
                <h3 className="text-xs font-bold text-nest-500 uppercase tracking-widest px-2 mb-4">Itinerary Days</h3>
                <div className="flex lg:flex-col overflow-x-auto lg:overflow-visible gap-2 pb-2 lg:pb-0 custom-scrollbar">
                    {days.map((day) => {
                        const isActive = selectedDayId === day.id;
                        const dayCost = activities.filter(a => a.day_id === day.id).reduce((s, a) => s + (a.cost || 0), 0);
                        
                        return (
                            <button
                                key={day.id}
                                onClick={() => { setSelectedDayId(day.id); setShowAiPanel(false); setAiSuggestions([]); }}
                                className={`flex-shrink-0 lg:w-full text-left p-3 rounded-xl transition-all duration-200 group relative overflow-hidden min-w-[120px] lg:min-w-0
                                ${isActive 
                                    ? 'bg-primary-900/20 border border-primary-500/30 shadow-[0_0_15px_rgba(56,189,248,0.1)]' 
                                    : 'bg-nest-900/40 border border-transparent hover:bg-nest-800 hover:border-nest-700'
                                }`}
                            >
                                {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-500 hidden lg:block"></div>}
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
                <div className="glass-panel p-6 rounded-t-3xl border-b border-nest-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white">
                            Day {currentDay?.day_number || '?'}
                        </h2>
                        <p className="text-nest-400 text-sm mt-1">
                            {currentDay && new Date(currentDay.date).toLocaleDateString(undefined, {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}
                            {!currentDay && 'Select a day to view activities'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button
                            onClick={() => setShowAiPanel(!showAiPanel)}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold border transition-all ${showAiPanel ? 'bg-accent-900/30 text-accent-300 border-accent-500' : 'bg-nest-900/50 text-nest-300 border-nest-700 hover:bg-nest-800 hover:text-white'}`}
                        >
                            <Bot size={18} /> 
                            <span className="hidden sm:inline">{showAiPanel ? 'Close AI' : 'Plan Day with AI'}</span>
                            <span className="sm:hidden">AI</span>
                        </button>
                        <button 
                            onClick={() => setShowActivityForm(true)}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-400 text-white px-4 py-2.5 rounded-xl font-semibold shadow-lg shadow-primary-900/30 transition-all hover:scale-105"
                        >
                            <Plus size={18} /> <span>Add Activity</span>
                        </button>
                    </div>
                </div>

                {/* AI PANEL */}
                {showAiPanel && (
                    <div className="mb-8 bg-gradient-to-b from-nest-900 to-nest-950 rounded-3xl border border-accent-500/30 overflow-hidden shadow-2xl animate-slide-up relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent-500 via-primary-500 to-accent-500"></div>
                        
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                                <Sparkles size={18} className="text-accent-400" /> NEST AI Day Planner
                            </h3>
                            
                            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                                <input 
                                    type="text" 
                                    placeholder="What's the vibe? e.g. 'Relaxed morning, adventurous afternoon'"
                                    className="flex-1 bg-nest-950 border border-nest-700 rounded-xl px-4 py-3 text-white focus:border-accent-500 focus:ring-1 focus:ring-accent-500 outline-none placeholder:text-nest-600"
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAiGenerate()}
                                />
                                <button 
                                    onClick={handleAiGenerate}
                                    disabled={aiLoading}
                                    className="px-6 py-3 bg-accent-600 hover:bg-accent-500 text-white font-bold rounded-xl shadow-lg shadow-accent-900/40 transition-all disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                                >
                                    {aiLoading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                                    Generate
                                </button>
                            </div>

                            {aiError && (
                                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                                    {aiError}
                                </div>
                            )}

                            {/* AI Results */}
                            {aiSuggestions.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {aiSuggestions.map((sugg, idx) => (
                                        <div key={idx} className="relative group overflow-hidden rounded-xl border border-nest-800 bg-nest-900 hover:border-accent-500/50 transition-all duration-300">
                                            {/* Background Image with Overlay */}
                                            <div className="absolute inset-0 z-0">
                                                <img src={CATEGORY_IMAGES[sugg.category]} alt={sugg.category} className="w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-nest-950 via-nest-950/80 to-nest-900/50"></div>
                                            </div>
                                            
                                            <div className="relative z-10 p-5 flex flex-col h-full">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xl shadow-sm">{getCategoryIcon(sugg.category)}</span>
                                                        <span className="text-xs font-mono bg-nest-950/80 backdrop-blur px-1.5 py-0.5 rounded border border-nest-700 text-nest-300">{sugg.time}</span>
                                                    </div>
                                                    <div className="text-sm font-bold text-accent-300 bg-accent-900/20 px-2 py-0.5 rounded-lg border border-accent-500/20">${sugg.cost}</div>
                                                </div>
                                                
                                                <h4 className="font-bold text-lg text-white mb-1 leading-tight">{sugg.title}</h4>
                                                
                                                {sugg.location && (
                                                    <div className="flex items-center gap-1 text-xs text-nest-400 mb-2">
                                                        <MapPin size={10} /> {sugg.location}
                                                    </div>
                                                )}
                                                
                                                <p className="text-xs text-nest-300 mb-4 line-clamp-2">{sugg.notes}</p>
                                                
                                                <button 
                                                    onClick={() => handleAddSuggestion(sugg)}
                                                    className="mt-auto w-full py-2.5 bg-accent-600 hover:bg-accent-500 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-accent-900/20"
                                                >
                                                    <Plus size={14} /> Add to Itinerary
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {aiSuggestions.length === 0 && !aiLoading && !aiError && (
                                <div className="text-center py-8 text-nest-500 text-sm border-2 border-dashed border-nest-800/50 rounded-xl bg-nest-900/20">
                                    Enter your preferences or just click Generate to get AI suggestions.
                                </div>
                            )}
                        </div>
                    </div>
                )}

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
                            <div 
                                key={act.id} 
                                onClick={() => setSelectedActivity(act)}
                                className="group relative bg-nest-900 border border-nest-800 hover:border-primary-500/30 hover:bg-nest-800/50 rounded-2xl overflow-hidden transition-all hover:translate-x-1 cursor-pointer"
                            >
                                {/* Connector Line */}
                                {index !== selectedDayActivities.length - 1 && (
                                    <div className="absolute left-[2.4rem] top-16 bottom-[-30px] w-0.5 bg-nest-800 z-0 group-hover:bg-nest-700 transition-colors"></div>
                                )}

                                {/* Background Image Strip */}
                                <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none">
                                    <img src={CATEGORY_IMAGES[act.category]} alt="" className="w-full h-full object-cover mask-image-gradient" />
                                    <div className="absolute inset-0 bg-gradient-to-r from-nest-900 to-transparent"></div>
                                </div>

                                <div className="p-5 flex gap-5 items-start relative z-10">
                                    <div className="flex flex-col items-center gap-2 mt-1">
                                        <div className="w-14 h-14 rounded-2xl bg-nest-950 border border-nest-800 flex items-center justify-center text-2xl shadow-inner relative z-10">
                                            {getCategoryIcon(act.category)}
                                        </div>
                                        <div className="text-xs font-mono text-nest-500 bg-nest-950 px-2 py-0.5 rounded border border-nest-800 z-10">
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

                                        {/* Assigned To Section */}
                                        {act.assigned_to && act.assigned_to.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-1.5">
                                                {act.assigned_to.map((name, i) => (
                                                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-nest-950 border border-nest-700 text-[10px] font-medium text-nest-300">
                                                        <Users size={10} className="text-primary-400" /> {name}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        
                                        <div className="mt-3 flex items-center gap-2 text-xs text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            Click to view details <ExternalLink size={10} />
                                        </div>
                                    </div>

                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteActivity(act.id); }}
                                        className="absolute top-4 right-4 text-nest-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-2 bg-nest-950/80 rounded-lg backdrop-blur-sm z-20"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
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
                                <label className="text-xs font-bold text-nest-400 uppercase tracking-wider">Assign To</label>
                                <input placeholder="e.g. Mom, Dad, Kids (comma separated)"
                                    className="w-full bg-nest-950 border border-nest-700 rounded-xl p-3 text-white focus:border-primary-500 outline-none placeholder:text-nest-700" 
                                    onChange={e => setNewActivity({...newActivity, assigned_to: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})} 
                                />
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

            {/* Activity Detail Modal with AI Search Data */}
            {selectedActivity && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-nest-950/90 backdrop-blur-md animate-fade-in" onClick={() => setSelectedActivity(null)}>
                    <div className="w-full max-w-2xl bg-nest-900 border border-nest-700 rounded-3xl shadow-2xl overflow-hidden animate-slide-up flex flex-col md:flex-row max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        
                        {/* Image Side */}
                        <div className="w-full md:w-1/3 relative h-48 md:h-auto group">
                            <img src={CATEGORY_IMAGES[selectedActivity.category]} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-nest-900 via-transparent to-transparent"></div>
                            <div className="absolute top-4 left-4">
                                <span className={`text-[10px] px-2 py-1 rounded-full border font-bold uppercase tracking-wider bg-black/40 backdrop-blur-md text-white border-white/20`}>
                                    {selectedActivity.category}
                                </span>
                            </div>
                            {/* Mini Map Overlay */}
                            <div className="absolute bottom-4 left-4 right-4 h-24 rounded-lg overflow-hidden border border-white/20 shadow-lg bg-nest-900">
                                <iframe
                                    width="100%"
                                    height="100%"
                                    frameBorder="0"
                                    src={`https://maps.google.com/maps?q=${encodeURIComponent((selectedActivity.location || trip?.destination) + ' ' + selectedActivity.title)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                                    title="Mini Map"
                                    className="opacity-80 hover:opacity-100 transition-opacity"
                                ></iframe>
                            </div>
                        </div>

                        {/* Content Side */}
                        <div className="flex-1 p-6 md:p-8 overflow-y-auto">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-1">{selectedActivity.title}</h2>
                                    <div className="flex items-center gap-2 text-nest-400 text-sm">
                                        <MapPin size={14} className="text-primary-500" />
                                        {selectedActivity.location || trip?.destination || 'Location not specified'}
                                    </div>
                                </div>
                                <button onClick={() => setSelectedActivity(null)} className="p-2 bg-nest-800 rounded-full text-nest-400 hover:text-white transition-colors">
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-nest-950/50 p-3 rounded-xl border border-nest-800">
                                    <span className="text-xs text-nest-500 uppercase font-bold block mb-1">Time</span>
                                    <div className="flex items-center gap-2 text-white font-mono">
                                        <Clock size={14} className="text-accent-400" />
                                        {selectedActivity.time || '--:--'}
                                    </div>
                                </div>
                                <div className="bg-nest-950/50 p-3 rounded-xl border border-nest-800">
                                    <span className="text-xs text-nest-500 uppercase font-bold block mb-1">Cost</span>
                                    <div className="flex items-center gap-2 text-white font-mono">
                                        <span className="text-green-400">$</span>
                                        {selectedActivity.cost}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Assigned To Modal Display */}
                            {selectedActivity.assigned_to && selectedActivity.assigned_to.length > 0 && (
                                <div className="mb-6">
                                     <span className="text-xs text-nest-500 uppercase font-bold block mb-2">Assigned To</span>
                                     <div className="flex flex-wrap gap-2">
                                        {selectedActivity.assigned_to.map((name, i) => (
                                            <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-nest-800 border border-nest-700 text-sm font-medium text-nest-200">
                                                <Users size={12} className="text-primary-400" /> {name}
                                            </span>
                                        ))}
                                     </div>
                                </div>
                            )}

                            {/* AI Generated Details Section */}
                            <div className="mb-6 space-y-3">
                                <h4 className="text-sm font-bold text-nest-300 uppercase tracking-widest flex items-center gap-2">
                                    <Sparkles size={12} className="text-accent-500" /> 
                                    Details & Info
                                </h4>
                                
                                {detailLoading ? (
                                    <div className="space-y-2 animate-pulse">
                                        <div className="h-4 bg-nest-800 rounded w-3/4"></div>
                                        <div className="h-4 bg-nest-800 rounded w-1/2"></div>
                                        <div className="h-20 bg-nest-800 rounded w-full mt-2"></div>
                                    </div>
                                ) : activityDetails ? (
                                    <div className="space-y-3 text-sm text-nest-300">
                                        {activityDetails.rating && (
                                            <div className="flex items-center gap-2 text-yellow-400">
                                                <Star size={14} fill="currentColor" />
                                                <span className="font-bold">{activityDetails.rating}</span>
                                            </div>
                                        )}
                                        
                                        <p className="leading-relaxed bg-nest-950/30 p-3 rounded-xl border border-nest-800/50">
                                            {activityDetails.description || selectedActivity.notes || "No description available."}
                                        </p>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                            {activityDetails.openingHours && (
                                                <div className="flex items-center gap-2 text-xs text-nest-400 bg-nest-950/50 px-3 py-2 rounded-lg">
                                                    <Clock size={12} /> {activityDetails.openingHours}
                                                </div>
                                            )}
                                            {activityDetails.phoneNumber && (
                                                <div className="flex items-center gap-2 text-xs text-nest-400 bg-nest-950/50 px-3 py-2 rounded-lg">
                                                    <Phone size={12} /> {activityDetails.phoneNumber}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {activityDetails.website && (
                                                <a href={activityDetails.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300 hover:underline text-xs bg-nest-950 px-3 py-1.5 rounded-lg border border-nest-800">
                                                    <Globe size={12} /> Visit Website
                                                </a>
                                            )}
                                            <a 
                                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((selectedActivity.location || trip?.destination) + ' ' + selectedActivity.title)}`}
                                                target="_blank" rel="noopener noreferrer" 
                                                className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 hover:underline text-xs bg-nest-950 px-3 py-1.5 rounded-lg border border-nest-800"
                                            >
                                                <MapIcon size={12} /> View on Google Maps
                                            </a>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-nest-500 text-sm italic">Could not fetch additional details.</p>
                                )}
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-nest-800 mt-auto">
                                <button 
                                    onClick={() => handleDeleteActivity(selectedActivity.id)}
                                    className="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-bold transition-colors flex items-center gap-2"
                                >
                                    <Trash2 size={16} /> Delete
                                </button>
                                <button 
                                    onClick={() => setSelectedActivity(null)}
                                    className="flex-1 px-4 py-3 bg-white text-nest-950 rounded-xl font-bold hover:bg-nest-200 transition-colors"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
      )}
    </div>
  );
};
