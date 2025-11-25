
export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

export interface Trip {
  id: string;
  user_id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  cover_image: string;
  video_url?: string; // New field for the Veo teaser
  status: 'planning' | 'confirmed' | 'completed';
  created_at: string;
}

export interface Day {
  id: string;
  trip_id: string;
  date: string;
  day_number: number;
  notes?: string;
}

export enum ActivityCategory {
  FOOD = 'Food',
  ADVENTURE = 'Adventure',
  SIGHTSEEING = 'Sightseeing',
  RELAX = 'Relax',
  TRAVEL = 'Travel',
  OTHER = 'Other'
}

export interface Activity {
  id: string;
  day_id: string;
  trip_id: string;
  title: string;
  time?: string;
  location?: string;
  cost: number;
  category: ActivityCategory;
  notes?: string;
  is_booked: boolean;
  created_at: string;
  assigned_to?: string[];
}

export interface DateRange {
  start: string;
  end: string;
}
