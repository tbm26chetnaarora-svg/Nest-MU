import { ActivityCategory, Trip, Day, Activity } from "./types";

export const CATEGORY_COLORS: Record<ActivityCategory, string> = {
  [ActivityCategory.FOOD]: 'bg-orange-100 text-orange-700 border-orange-200',
  [ActivityCategory.ADVENTURE]: 'bg-red-100 text-red-700 border-red-200',
  [ActivityCategory.SIGHTSEEING]: 'bg-blue-100 text-blue-700 border-blue-200',
  [ActivityCategory.RELAX]: 'bg-purple-100 text-purple-700 border-purple-200',
  [ActivityCategory.TRAVEL]: 'bg-slate-100 text-slate-700 border-slate-200',
  [ActivityCategory.OTHER]: 'bg-gray-100 text-gray-700 border-gray-200',
};

export const PLACEHOLDER_IMAGES = [
  "https://picsum.photos/800/600?random=1",
  "https://picsum.photos/800/600?random=2",
  "https://picsum.photos/800/600?random=3",
  "https://picsum.photos/800/600?random=4",
  "https://picsum.photos/800/600?random=5",
];

export const DEMO_USER_ID = 'demo-user-123';

export const MOCK_TRIPS: Trip[] = [
  {
    id: 'demo-trip-1',
    user_id: DEMO_USER_ID,
    title: 'Family Adventure in Tokyo',
    destination: 'Tokyo, Japan',
    start_date: new Date(Date.now() + 86400000 * 10).toISOString(), // 10 days from now
    end_date: new Date(Date.now() + 86400000 * 15).toISOString(),
    cover_image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=2994&auto=format&fit=crop',
    status: 'confirmed',
    created_at: new Date().toISOString()
  },
  {
    id: 'demo-trip-2',
    user_id: DEMO_USER_ID,
    title: 'Weekend in Paris',
    destination: 'Paris, France',
    start_date: new Date(Date.now() + 86400000 * 60).toISOString(),
    end_date: new Date(Date.now() + 86400000 * 63).toISOString(),
    cover_image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=2973&auto=format&fit=crop',
    status: 'planning',
    created_at: new Date().toISOString()
  }
];

export const MOCK_DAYS: Day[] = [
  { id: 'd1', trip_id: 'demo-trip-1', date: new Date(Date.now() + 86400000 * 10).toISOString(), day_number: 1, notes: 'Arrival Day' },
  { id: 'd2', trip_id: 'demo-trip-1', date: new Date(Date.now() + 86400000 * 11).toISOString(), day_number: 2, notes: 'Exploring Shibuya' },
  { id: 'd3', trip_id: 'demo-trip-1', date: new Date(Date.now() + 86400000 * 12).toISOString(), day_number: 3, notes: 'DisneySea' },
];

export const MOCK_ACTIVITIES: Activity[] = [
  {
    id: 'a1', day_id: 'd1', trip_id: 'demo-trip-1', title: 'Airport Pickup', category: ActivityCategory.TRAVEL, 
    cost: 150, time: '14:00', location: 'Narita Airport', is_booked: true, created_at: new Date().toISOString(), notes: 'Driver will wait at exit',
    assigned_to: ['Dad']
  },
  {
    id: 'a2', day_id: 'd1', trip_id: 'demo-trip-1', title: 'Check-in Hotel', category: ActivityCategory.RELAX, 
    cost: 0, time: '16:00', location: 'Shinjuku Prince Hotel', is_booked: true, created_at: new Date().toISOString(),
    assigned_to: ['Mom', 'Dad']
  },
  {
    id: 'a3', day_id: 'd2', trip_id: 'demo-trip-1', title: 'Shibuya Crossing', category: ActivityCategory.SIGHTSEEING, 
    cost: 0, time: '10:00', location: 'Shibuya', is_booked: false, created_at: new Date().toISOString(), notes: 'Best view from Starbucks'
  },
  {
    id: 'a4', day_id: 'd2', trip_id: 'demo-trip-1', title: 'Sushi Lunch', category: ActivityCategory.FOOD, 
    cost: 80, time: '12:30', location: 'Uobei Sushi', is_booked: false, created_at: new Date().toISOString(),
    assigned_to: ['Kids']
  },
  {
    id: 'a5', day_id: 'd2', trip_id: 'demo-trip-1', title: 'TeamLabs Planets', category: ActivityCategory.ADVENTURE, 
    cost: 120, time: '15:00', location: 'Toyosu', is_booked: true, created_at: new Date().toISOString(), notes: 'Wear shorts, water area!'
  }
];