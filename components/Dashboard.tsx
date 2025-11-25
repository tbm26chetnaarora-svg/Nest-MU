
import React, { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { Trip, Day, Activity, ActivityCategory } from '../types';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Plus, ArrowRight, Sparkles, Loader2, Bot, Image as ImageIcon, Video } from 'lucide-react';
import { PLACEHOLDER_IMAGES, DEMO_USER_ID, MOCK_TRIPS, MOCK_DAYS, MOCK_ACTIVITIES } from '../constants';
import { GoogleGenAI, Type } from '@google/genai';
import { generateDestinationImage, generateTripTeaser } from '../aiClient';

interface DashboardProps {
  session: Session;
}

export const Dashboard: React.FC<DashboardProps> = ({ session }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  
  // New Trip State
  const [newTrip, setNewTrip] = useState({
    title: '',
    destination: '',
    start_date: '',
    end_date: '',
    preferences: ''
  });

  const fetchTrips = async () => {
    // DEMO MODE CHECK
    if (session.user.id === DEMO_USER_ID) {
      setTimeout(() => {
        // Sort trips by date
        const sortedTrips = [...MOCK_TRIPS].sort((a, b) => 
          new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
        );
        setTrips(sortedTrips); 
        setLoading(false);
      }, 600); 
      return;
    }

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

  const generateAIItinerary = async (destination: string, start: Date, end: Date, preferences: string) => {
      // Safe access to API Key
      let apiKey = '';
      try {
        // Try process.env first (System standard)
        if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
            apiKey = process.env.API_KEY;
        }
        // Fallback to import.meta.env for Vite
        else if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
            apiKey = (import.meta as any).env.VITE_API_KEY || (import.meta as any).env.API_KEY;
        }
      } catch (e) {
        console.error("API Key access failed", e);
      }

      if (!apiKey) {
          throw new Error("AI Configuration Missing: API_KEY not found in environment");
      }

      const ai = new GoogleGenAI({ apiKey });
      const dayCount = Math.max(1, Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

      const prompt = `
          Plan a trip to ${destination} for ${dayCount} days. 
          Preferences: ${preferences || "General sightseeing"}.
          Return a list of activities for each day.
          The response must be a strict JSON object. Do not include markdown code blocks.
      `;

      // Race condition to prevent infinite loading
      // Increased timeout to 60s because full itinerary generation can be slow
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("AI generation timed out (60s)")), 60000)
      );

      const apiCallPromise = ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
              responseMimeType: "application/json",
              responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                      days: {
                          type: Type.ARRAY,
                          items: {
                              type: Type.OBJECT,
                              properties: {
                                  day_number: { type: Type.INTEGER },
                                  theme_or_note: { type: Type.STRING },
                                  activities: {
                                      type: Type.ARRAY,
                                      items: {
                                          type: Type.OBJECT,
                                          properties: {
                                              title: { type: Type.STRING },
                                              time: { type: Type.STRING, description: "24h format HH:MM" },
                                              category: { type: Type.STRING, enum: ["Food", "Adventure", "Sightseeing", "Relax", "Travel", "Other"] },
                                              cost: { type: Type.NUMBER },
                                              location: { type: Type.STRING },
                                              notes: { type: Type.STRING }
                                          }
                                      }
                                  }
                              }
                          }
                      }
                  }
              }
          }
      });

      try {
        const response: any = await Promise.race([apiCallPromise, timeoutPromise]);
        let text = response.text || "{}";
        // Sanitize: strip markdown if present
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
      } catch (err) {
        throw err;
      }
  };

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!newTrip.destination.trim() || !newTrip.start_date || !newTrip.end_date) {
      alert("Please fill in destination and dates.");
      return;
    }

    // If Manual mode, require title
    if (!aiMode && !newTrip.title.trim()) {
        alert("Please enter a trip name.");
        return;
    }

    const startDate = new Date(newTrip.start_date);
    const endDate = new Date(newTrip.end_date);

    if (startDate > endDate) {
      alert("End date must be after start date");
      return;
    }

    setIsSubmitting(true);
    setLoadingStep('Initializing...');

    try {
      let aiData: any = null;
      let finalTitle = newTrip.title;
      let coverImage = PLACEHOLDER_IMAGES[Math.floor(Math.random() * PLACEHOLDER_IMAGES.length)];
      let videoUrl: string | null = null;

      // ATTEMPT AI GENERATION
      if (aiMode) {
          try {
              setLoadingStep('Planning Itinerary...');
              aiData = await generateAIItinerary(newTrip.destination, startDate, endDate, newTrip.preferences);
              if (!finalTitle) finalTitle = `Trip to ${newTrip.destination}`;

              // Generate Custom Image
              setLoadingStep('Capturing Visuals...');
              try {
                  const genImage = await generateDestinationImage(newTrip.destination);
                  if (genImage) coverImage = genImage;
              } catch (imgErr) {
                  console.warn("Image generation failed", imgErr);
              }
              
              // Generate Video Teaser (Veo)
              setLoadingStep('Filming Cinematic Teaser...');
              try {
                  // We attempt video generation. This might take 5-10s depending on the model speed.
                  const teaser = await generateTripTeaser(newTrip.destination, newTrip.preferences);
                  if (teaser) videoUrl = teaser;
              } catch (vidErr) {
                  console.warn("Video generation failed", vidErr);
              }

          } catch (err: any) {
              console.error("AI Generation failed", err);
              alert(`AI Planner failed (${err.message}). Creating basic trip instead.`);
              if (!finalTitle) finalTitle = `Trip to ${newTrip.destination}`;
          }
      }

      setLoadingStep('Finalizing...');
      const tripId = `trip-${Date.now()}`;
      
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const dayCount = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

      if (session.user.id === DEMO_USER_ID) {
         await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network

         const mockNewTrip: Trip = {
             id: tripId,
             user_id: DEMO_USER_ID,
             title: finalTitle,
             destination: newTrip.destination,
             start_date: newTrip.start_date,
             end_date: newTrip.end_date,
             cover_image: coverImage,
             video_url: videoUrl || undefined,
             status: 'planning',
             created_at: new Date().toISOString()
         };

         // Generate Days
         const daysList: Day[] = [];
         const activitiesList: Activity[] = [];

         for (let i = 0; i < dayCount; i++) {
             const currentDate = new Date(startDate);
             currentDate.setDate(startDate.getDate() + i);
             const dayId = `day-${tripId}-${i}`;
             
             // Check if AI has data for this day
             const aiDay = aiData?.days?.find((d: any) => d.day_number === i + 1);

             daysList.push({
                 id: dayId,
                 trip_id: tripId,
                 date: currentDate.toISOString(),
                 day_number: i + 1,
                 notes: aiDay?.theme_or_note || (i === 0 ? 'Arrival' : undefined)
             });

             // Add AI Activities if present
             if (aiDay && aiDay.activities) {
                 aiDay.activities.forEach((act: any, idx: number) => {
                    activitiesList.push({
                        id: `act-${tripId}-${i}-${idx}`,
                        day_id: dayId,
                        trip_id: tripId,
                        title: act.title,
                        category: act.category as ActivityCategory || ActivityCategory.OTHER,
                        cost: act.cost || 0,
                        time: act.time,
                        location: act.location,
                        is_booked: false,
                        created_at: new Date().toISOString(),
                        notes: act.notes
                    });
                 });
             }
         }

         // Update Global Mock Store
         MOCK_TRIPS.push(mockNewTrip);
         MOCK_DAYS.push(...daysList);
         MOCK_ACTIVITIES.push(...activitiesList);

         setTrips([...trips, mockNewTrip].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()));
      } else {
         // Real Supabase Creation
         const { data: tripData, error: tripError } = await supabase
            .from('trips')
            .insert([{
                user_id: session.user.id,
                title: finalTitle,
                destination: newTrip.destination,
                start_date: newTrip.start_date,
                end_date: newTrip.end_date,
                status: 'planning',
                cover_image: coverImage,
                video_url: videoUrl 
            }])
            .select()
            .single();

         if (tripError) throw tripError;

         // Insert days one by one to get IDs for activities
         for (let i = 0; i < dayCount; i++) {
             const currentDate = new Date(startDate);
             currentDate.setDate(startDate.getDate() + i);
             const aiDay = aiData?.days?.find((d: any) => d.day_number === i + 1);

             const { data: dayData, error: dayError } = await supabase.from('days').insert({
                 trip_id: tripData.id,
                 date: currentDate.toISOString(),
                 day_number: i + 1,
                 notes: aiDay?.theme_or_note
             }).select().single();

             if (dayError) console.error("Error inserting day", dayError);

             // Insert Activities for this day
             if (dayData && aiDay && aiDay.activities && aiDay.activities.length > 0) {
                 const activitiesToInsert = aiDay.activities.map((act: any) => ({
                    day_id: dayData.id,
                    trip_id: tripData.id,
                    title: act.title,
                    category: act.category as ActivityCategory || ActivityCategory.OTHER,
                    cost: act.cost || 0,
                    time: act.time,
                    location: act.location,
                    is_booked: false,
                    notes: act.notes
                 }));
                 
                 await supabase.from('activities').insert(activitiesToInsert);
             }
         }

         setTrips([...trips, tripData].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()));
      }
      // Reset Form
      setNewTrip({ title: '', destination: '', start_date: '', end_date: '', preferences: '' });
      setAiMode(false);

    } catch (error: any) {
        console.error("Failed to create trip:", error);
        alert(error.message || "Failed to create trip");
    } finally {
        setIsSubmitting(false);
        setLoadingStep('');
    }
  };

  if (loading) {
     return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-nest-500" /></div>;
  }

  return (
    <div className="animate-fade-in pb-20">
      <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
      <p className="text-nest-400 mb-8">Manage your upcoming trips and adventures.</p>

      {/* CREATE TRIP FORM */}
      <div className="bg-nest-900 border border-nest-800 rounded-3xl p-6 md:p-8 mb-10 relative overflow-hidden group shadow-xl">
          {/* Background glow effects */}
          <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none transition-colors duration-700 ${aiMode ? 'bg-accent-500/20' : 'bg-primary-500/10'}`}></div>

          <div className="relative z-10">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    Start a new adventure {aiMode && <Sparkles className="text-yellow-400 animate-pulse" size={18} fill="currentColor" />}
                </h2>
                
                {/* Mode Toggle */}
                <button 
                  type="button"
                  onClick={() => setAiMode(!aiMode)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider border transition-all ${
                    aiMode 
                      ? 'bg-accent-900/40 border-accent-500 text-accent-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]' 
                      : 'bg-nest-950 border-nest-700 text-nest-400 hover:border-nest-600'
                  }`}
                >
                  <Bot size={14} />
                  {aiMode ? 'AI Planner Active' : 'Enable AI Planner'}
                </button>
              </div>

              <form onSubmit={handleCreateTrip} className="flex flex-col gap-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-nest-400 uppercase tracking-wider pl-1">Destination</label>
                          <input
                              type="text"
                              placeholder="e.g. Tokyo, Japan"
                              className="w-full bg-nest-950/50 border border-nest-700 rounded-xl px-4 py-3 text-white placeholder-nest-600 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                              value={newTrip.destination}
                              onChange={(e) => setNewTrip({...newTrip, destination: e.target.value})}
                          />
                      </div>
                      {!aiMode && (
                        <div className="space-y-1.5 animate-fade-in">
                            <label className="text-[10px] font-bold text-nest-400 uppercase tracking-wider pl-1">Trip Name</label>
                            <input
                                type="text"
                                placeholder="e.g. Summer Vacation"
                                className="w-full bg-nest-950/50 border border-nest-700 rounded-xl px-4 py-3 text-white placeholder-nest-600 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                                value={newTrip.title}
                                onChange={(e) => setNewTrip({...newTrip, title: e.target.value})}
                            />
                        </div>
                      )}
                      
                      {aiMode && (
                         <div className="space-y-1.5 animate-fade-in">
                            <label className="text-[10px] font-bold text-accent-400 uppercase tracking-wider pl-1">Trip Vibe / Preferences</label>
                            <input
                                type="text"
                                placeholder="e.g. Kid friendly, focus on food & anime"
                                className="w-full bg-accent-900/10 border border-accent-500/30 rounded-xl px-4 py-3 text-white placeholder-accent-700/50 focus:border-accent-500 focus:ring-1 focus:ring-accent-500 outline-none transition-all"
                                value={newTrip.preferences}
                                onChange={(e) => setNewTrip({...newTrip, preferences: e.target.value})}
                            />
                        </div>
                      )}
                  </div>

                  <div className="flex flex-col md:flex-row gap-5 items-end">
                      <div className="grid grid-cols-2 gap-5 flex-1 w-full">
                          <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-nest-400 uppercase tracking-wider pl-1">Start Date</label>
                              <input
                                  type="date"
                                  className="w-full bg-nest-950/50 border border-nest-700 rounded-xl px-4 py-3 text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all [color-scheme:dark] min-w-0"
                                  value={newTrip.start_date}
                                  onChange={(e) => setNewTrip({...newTrip, start_date: e.target.value})}
                              />
                          </div>
                          <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-nest-400 uppercase tracking-wider pl-1">End Date</label>
                              <input
                                  type="date"
                                  className="w-full bg-nest-950/50 border border-nest-700 rounded-xl px-4 py-3 text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all [color-scheme:dark] min-w-0"
                                  value={newTrip.end_date}
                                  onChange={(e) => setNewTrip({...newTrip, end_date: e.target.value})}
                              />
                          </div>
                      </div>
                      
                      <button
                          type="submit"
                          disabled={isSubmitting}
                          className={`w-full md:w-auto px-6 py-3 font-bold rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-2 min-w-[150px] h-[50px] ${
                              aiMode 
                              ? 'bg-gradient-to-r from-accent-600 to-primary-600 text-white hover:shadow-accent-900/50' 
                              : 'bg-white text-nest-950 hover:bg-nest-200'
                          }`}
                      >
                          {isSubmitting ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="animate-spin" size={16} />
                                <span className="text-xs font-normal opacity-90">{loadingStep}</span>
                            </div>
                          ) : (
                              <>
                                {aiMode ? 'Generate Trip' : 'Launch Trip'} 
                                <span className="text-xl">{aiMode ? '✨' : '🚀'}</span>
                              </>
                          )}
                      </button>
                  </div>
              </form>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trips.length === 0 ? (
           <div className="col-span-full py-12 text-center text-nest-500 bg-nest-900/30 rounded-3xl border border-dashed border-nest-800">
              <MapPin className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No trips planned yet. Start your adventure above!</p>
           </div>
        ) : (
           trips.map((trip) => (
             <Link to={`/trip/${trip.id}`} key={trip.id} className="group bg-nest-900 rounded-3xl border border-nest-800 overflow-hidden hover:border-primary-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary-900/20 hover:-translate-y-1 relative block h-full flex flex-col">
               <div className="h-48 overflow-hidden relative">
                 {/* Use video teaser if available, else cover image */}
                 <div className="absolute inset-0 bg-gradient-to-t from-nest-900 via-transparent to-transparent z-10 opacity-80"></div>
                 {trip.video_url ? (
                     <video src={trip.video_url} autoPlay loop muted className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                 ) : (
                     <img src={trip.cover_image} alt={trip.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                 )}
                 <div className="absolute top-4 right-4 z-20 bg-nest-950/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-xs font-bold uppercase tracking-wider text-white">
                    {trip.status}
                 </div>
                 {trip.video_url && (
                    <div className="absolute top-4 left-4 z-20 bg-accent-600/80 backdrop-blur-md px-2 py-1 rounded-lg text-white text-[10px] font-bold flex items-center gap-1">
                        <Video size={10} /> TEASER
                    </div>
                 )}
               </div>
               
               <div className="p-6 flex-1 flex flex-col">
                 <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary-400 transition-colors">{trip.title}</h3>
                 <div className="flex items-center gap-2 text-nest-400 text-sm mb-4">
                    <MapPin size={14} className="text-primary-500" />
                    {trip.destination}
                 </div>
                 
                 <div className="mt-auto pt-4 border-t border-nest-800 flex justify-between items-center text-sm">
                    <div className="text-nest-500 flex items-center gap-1.5">
                       <Calendar size={14} />
                       {new Date(trip.start_date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                    </div>
                    <div className="text-primary-400 font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                       View Details <ArrowRight size={14} />
                    </div>
                 </div>
               </div>
             </Link>
           ))
        )}
      </div>
    </div>
  );
};
