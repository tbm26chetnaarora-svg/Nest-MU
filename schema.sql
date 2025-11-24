-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Trips table
create table trips (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  name text not null,
  destination text not null,
  start_date date not null,
  end_date date not null,
  created_at timestamp with time zone default now()
);

-- Days table
create table days (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid not null references trips(id) on delete cascade,
  day_number integer not null,
  date date not null
);

-- Activities table
create table activities (
  id uuid primary key default uuid_generate_v4(),
  day_id uuid not null references days(id) on delete cascade,
  title text not null,
  type text check (type in ('Food', 'Sightseeing', 'Travel', 'Rest')),
  time text,
  estimated_cost numeric default 0,
  notes text
);

-- Enable RLS
alter table trips enable row level security;
alter table days enable row level security;
alter table activities enable row level security;

-- Policies: Only allow users to access their own trips
create policy "Users can manage their trips"
  on trips
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policies for days
create policy "Users can access days inside their trips"
  on days
  for all
  using (exists (
    select 1 from trips
    where trips.id = days.trip_id
    and trips.user_id = auth.uid()
  ));

-- Policies for activities
create policy "Users can access activities inside their days"
  on activities
  for all
  using (exists (
    select 1 from days
    join trips on trips.id = days.trip_id
    where days.id = activities.day_id
    and trips.user_id = auth.uid()
  ));
