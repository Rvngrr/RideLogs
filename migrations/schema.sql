-- Schema for MotoLog app (for Supabase / Postgres)

-- Bike profile (single row expected)
CREATE TABLE IF NOT EXISTS bike (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  year TEXT NOT NULL,
  odometer INTEGER NOT NULL,
  avatarColor TEXT NOT NULL
);

-- Maintenance logs
CREATE TABLE IF NOT EXISTS maintenance (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  odometer INTEGER NOT NULL,
  category TEXT NOT NULL,
  cost NUMERIC NOT NULL,
  diy INTEGER NOT NULL,
  description TEXT NOT NULL,
  notes TEXT
);

-- PMS schedules
CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  intervalKm INTEGER,
  intervalMonths INTEGER,
  lastOdo INTEGER NOT NULL,
  lastDate TEXT NOT NULL
);

-- Rides
CREATE TABLE IF NOT EXISTS rides (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  route TEXT NOT NULL,
  distance NUMERIC NOT NULL,
  duration TEXT,
  fuelLiters NUMERIC,
  fuelCost NUMERIC,
  notes TEXT
);

-- Upgrades
CREATE TABLE IF NOT EXISTS upgrades (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  partName TEXT NOT NULL,
  category TEXT NOT NULL,
  cost NUMERIC NOT NULL,
  odometer INTEGER NOT NULL,
  status TEXT NOT NULL,
  notes TEXT
);
