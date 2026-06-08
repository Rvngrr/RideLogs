/* server.js */
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import serverless from 'serverless-http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Request logging middleware for debugging API calls
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.url}`);
  next();
});

// Resolve static routes to serve dashboard files directly on this port
app.use(express.static(projectRoot));

// ==========================================
// SQLITE DATABASE INITS
// ==========================================

import fs from 'fs';

// Resolve database path - on Vercel we must copy the database to /tmp so it is writable
const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL;
const dbDir = isVercel ? '/tmp' : projectRoot;
const dbPath = path.join(dbDir, 'database.db');

if (isVercel) {
  const sourceDbPath = path.join(projectRoot, 'database.db');
  try {
    if (fs.existsSync(sourceDbPath)) {
      if (!fs.existsSync(dbPath)) {
        fs.copyFileSync(sourceDbPath, dbPath);
        console.log('Database seeded and copied to /tmp successfully.');
      } else {
        console.log('Database already exists in /tmp.');
      }
    }
  } catch (err) {
    console.error('Failed to copy database to /tmp:', err.message);
  }
}

const sqlite = sqlite3.verbose();
const db = new sqlite.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to open SQLite database:', err.message);
  } else {
    console.log(`Connected to SQL database at ${dbPath}`);
    initDatabaseTables();
  }
});

// Promise Helpers for database queries
const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function (err) {
    if (err) reject(err);
    else resolve(this);
  });
});

const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) reject(err);
    else resolve(rows);
  });
});

const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) reject(err);
    else resolve(row);
  });
});

// Seed data definitions
const SEED_BIKE = { name: "Honda CB650R", year: "2024", odometer: 8450, avatarColor: "cyan" };

const SEED_MAINTENANCE = [
  { id: "m-1", date: "2026-04-01", odometer: 5500, category: "Engine Oil", cost: 48.50, diy: 1, description: "Oil & filter change with full synthetic", notes: "Used Motul 7100 10W-40 and K&N oil filter." },
  { id: "m-2", date: "2026-05-10", odometer: 7000, category: "Brake Pads", cost: 25.00, diy: 1, description: "Rear brake pad replacement", notes: "Installed EBC Double-H sintered brake pads. Cleaned caliper pistons." },
  { id: "m-3", date: "2026-06-01", odometer: 8100, category: "Chain / Sprocket", cost: 12.00, diy: 1, description: "Drive chain adjustment, clean & lube", notes: "Cleaned with IPONE chain cleaner and applied chain paste." }
];

const SEED_SCHEDULES = [
  { id: "s-1", category: "Engine Oil", intervalKm: 3000, intervalMonths: 6, lastOdo: 5500, lastDate: "2026-04-01" },
  { id: "s-2", category: "Spark Plugs", intervalKm: 12000, intervalMonths: 24, lastOdo: 6800, lastDate: "2026-05-02" },
  { id: "s-3", category: "Chain / Sprocket", intervalKm: 1000, intervalMonths: 2, lastOdo: 8100, lastDate: "2026-06-01" },
  { id: "s-4", category: "Tires", intervalKm: 15000, intervalMonths: 36, lastOdo: 5800, lastDate: "2026-04-10" }
];

const SEED_RIDES = [
  { id: "r-1", date: "2026-04-12", route: "Tagaytay Vista Loop", distance: 150.0, duration: "3h 45m", fuelLiters: 6.2, fuelCost: 10.20, notes: "Great scenic ride. Nice weather. Fuel economy was great." },
  { id: "r-2", date: "2026-05-02", route: "Sierra Madre Twisty Run", distance: 210.0, duration: "4h 15m", fuelLiters: 8.8, fuelCost: 14.50, notes: "Heavy twisties. Exhaust upgrade sounds crisp." },
  { id: "r-3", date: "2026-05-24", route: "Infanta Coastal Highway Cruise", distance: 280.0, duration: "5h 50m", fuelLiters: 11.2, fuelCost: 18.40, notes: "Long highway cruise. High speed runs, bike ran flawless." },
  { id: "r-4", date: "2026-06-05", route: "Evening Coffee Run (City)", distance: 60.0, duration: "1h 30m", fuelLiters: 2.6, fuelCost: 4.20, notes: "Brisk night cruise in the city. Little traffic." }
];

const SEED_UPGRADES = [
  { id: "u-1", date: "2026-04-20", partName: "Akrapovič Full Exhaust System", category: "Performance", odometer: 6200, cost: 1250.00, status: "Installed", notes: "Fitted at dealership. Perfect sound levels." },
  { id: "u-2", date: "2026-05-15", odometer: 7200, partName: "Evotech Radiator Guard", category: "Protection", cost: 95.00, status: "Installed", notes: "Simple DIY job. Fits perfectly. Solid build quality." },
  { id: "u-3", date: "2026-06-08", odometer: 8400, partName: "Quad Lock Handlebar Mount", category: "Electronics", cost: 65.00, status: "Installed", notes: "With vibration dampener. Mounted on left clip-on." },
  { id: "u-4", date: "2026-06-25", odometer: 9000, partName: "Öhlins S46 Rear Shock Absorber", category: "Performance", cost: 890.00, status: "Planned", notes: "Scheduled for install next month before trackday." }
];

// Initialize and Create schemas
async function initDatabaseTables() {
  try {
    // 1. Bike profile
    await dbRun(`CREATE TABLE IF NOT EXISTS bike (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      year TEXT NOT NULL,
      odometer INTEGER NOT NULL,
      avatarColor TEXT NOT NULL
    )`);
    
    // Seed bike if empty
    const bikeCount = await dbGet("SELECT COUNT(*) as count FROM bike");
    if (bikeCount.count === 0) {
      await dbRun("INSERT INTO bike (name, year, odometer, avatarColor) VALUES (?, ?, ?, ?)", 
        [SEED_BIKE.name, SEED_BIKE.year, SEED_BIKE.odometer, SEED_BIKE.avatarColor]);
    }

    // 2. Maintenance Logs
    await dbRun(`CREATE TABLE IF NOT EXISTS maintenance (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      odometer INTEGER NOT NULL,
      category TEXT NOT NULL,
      cost REAL NOT NULL,
      diy INTEGER NOT NULL,
      description TEXT NOT NULL,
      notes TEXT
    )`);
    
    const maintCount = await dbGet("SELECT COUNT(*) as count FROM maintenance");
    if (maintCount.count === 0) {
      for (const item of SEED_MAINTENANCE) {
        await dbRun("INSERT INTO maintenance (id, date, odometer, category, cost, diy, description, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [item.id, item.date, item.odometer, item.category, item.cost, item.diy, item.description, item.notes]);
      }
    }

    // 3. PMS Schedules
    await dbRun(`CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      intervalKm INTEGER,
      intervalMonths INTEGER,
      lastOdo INTEGER NOT NULL,
      lastDate TEXT NOT NULL
    )`);

    const scheduleCount = await dbGet("SELECT COUNT(*) as count FROM schedules");
    if (scheduleCount.count === 0) {
      for (const item of SEED_SCHEDULES) {
        await dbRun("INSERT INTO schedules (id, category, intervalKm, intervalMonths, lastOdo, lastDate) VALUES (?, ?, ?, ?, ?, ?)",
          [item.id, item.category, item.intervalKm, item.intervalMonths, item.lastOdo, item.lastDate]);
      }
    }

    // 4. Ride Records
    await dbRun(`CREATE TABLE IF NOT EXISTS rides (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      route TEXT NOT NULL,
      distance REAL NOT NULL,
      duration TEXT,
      fuelLiters REAL,
      fuelCost REAL,
      notes TEXT
    )`);

    const rideCount = await dbGet("SELECT COUNT(*) as count FROM rides");
    if (rideCount.count === 0) {
      for (const item of SEED_RIDES) {
        await dbRun("INSERT INTO rides (id, date, route, distance, duration, fuelLiters, fuelCost, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [item.id, item.date, item.route, item.distance, item.duration, item.fuelLiters, item.fuelCost, item.notes]);
      }
    }

    // 5. Upgrades
    await dbRun(`CREATE TABLE IF NOT EXISTS upgrades (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      partName TEXT NOT NULL,
      category TEXT NOT NULL,
      cost REAL NOT NULL,
      odometer INTEGER NOT NULL,
      status TEXT NOT NULL,
      notes TEXT
    )`);

    const upgradeCount = await dbGet("SELECT COUNT(*) as count FROM upgrades");
    if (upgradeCount.count === 0) {
      for (const item of SEED_UPGRADES) {
        await dbRun("INSERT INTO upgrades (id, date, partName, category, cost, odometer, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [item.id, item.date, item.partName, item.category, item.cost, item.odometer, item.status, item.notes]);
      }
    }

    console.log('SQLite tables validated and seeded successfully.');
  } catch (err) {
    console.error('Error creating SQL database schemas:', err);
  }
}

// ==========================================
// REST API ENDPOINTS
// ==========================================

// GET FULL STATE
app.get('/api/db', async (req, res) => {
  try {
    const bike = await dbGet("SELECT * FROM bike LIMIT 1");
    const maintenanceRaw = await dbAll("SELECT * FROM maintenance");
    const schedules = await dbAll("SELECT * FROM schedules");
    const rides = await dbAll("SELECT * FROM rides");
    const upgrades = await dbAll("SELECT * FROM upgrades");

    // Clean data shapes for client compatibility (converting SQLite 1/0 to true/false)
    const maintenance = maintenanceRaw.map(m => ({ ...m, diy: m.diy === 1 }));

    res.json({ bike, maintenance, schedules, rides, upgrades });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch database state: ' + err.message });
  }
});

// UPDATE BIKE DETAILS
app.put('/api/bike', async (req, res) => {
  const { name, year, odometer, avatarColor } = req.body;
  try {
    await dbRun("UPDATE bike SET name = ?, year = ?, odometer = ?, avatarColor = ? WHERE id = 1", 
      [name, year, odometer, avatarColor]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- MAINTENANCE ENDPOINTS ---
app.post('/api/maintenance', async (req, res) => {
  const { id, date, odometer, category, cost, diy, description, notes } = req.body;
  try {
    await dbRun("INSERT INTO maintenance (id, date, odometer, category, cost, diy, description, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [id, date, odometer, category, cost, diy ? 1 : 0, description, notes]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/maintenance/:id', async (req, res) => {
  const { date, odometer, category, cost, diy, description, notes } = req.body;
  try {
    await dbRun("UPDATE maintenance SET date = ?, odometer = ?, category = ?, cost = ?, diy = ?, description = ?, notes = ? WHERE id = ?",
      [date, odometer, category, cost, diy ? 1 : 0, description, notes, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/maintenance/:id', async (req, res) => {
  try {
    await dbRun("DELETE FROM maintenance WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- SCHEDULES (PMS) ENDPOINTS ---
app.post('/api/schedules', async (req, res) => {
  const { id, category, intervalKm, intervalMonths, lastOdo, lastDate } = req.body;
  try {
    await dbRun("INSERT INTO schedules (id, category, intervalKm, intervalMonths, lastOdo, lastDate) VALUES (?, ?, ?, ?, ?, ?)",
      [id, category, intervalKm, intervalMonths, lastOdo, lastDate]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/schedules/:id', async (req, res) => {
  const { category, intervalKm, intervalMonths, lastOdo, lastDate } = req.body;
  try {
    await dbRun("UPDATE schedules SET category = ?, intervalKm = ?, intervalMonths = ?, lastOdo = ?, lastDate = ? WHERE id = ?",
      [category, intervalKm, intervalMonths, lastOdo, lastDate, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/schedules/:id', async (req, res) => {
  try {
    await dbRun("DELETE FROM schedules WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- RIDES ENDPOINTS ---
app.post('/api/rides', async (req, res) => {
  const { id, date, route, distance, duration, fuelLiters, fuelCost, notes } = req.body;
  try {
    await dbRun("INSERT INTO rides (id, date, route, distance, duration, fuelLiters, fuelCost, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [id, date, route, distance, duration, fuelLiters, fuelCost, notes]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/rides/:id', async (req, res) => {
  const { date, route, distance, duration, fuelLiters, fuelCost, notes } = req.body;
  try {
    await dbRun("UPDATE rides SET date = ?, route = ?, distance = ?, duration = ?, fuelLiters = ?, fuelCost = ?, notes = ? WHERE id = ?",
      [date, route, distance, duration, fuelLiters, fuelCost, notes, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/rides/:id', async (req, res) => {
  try {
    await dbRun("DELETE FROM rides WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- UPGRADES ENDPOINTS ---
app.post('/api/upgrades', async (req, res) => {
  const { id, date, partName, category, cost, odometer, status, notes } = req.body;
  try {
    await dbRun("INSERT INTO upgrades (id, date, partName, category, cost, odometer, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [id, date, partName, category, cost, odometer, status, notes]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/upgrades/:id', async (req, res) => {
  const { date, partName, category, cost, odometer, status, notes } = req.body;
  try {
    await dbRun("UPDATE upgrades SET date = ?, partName = ?, category = ?, cost = ?, odometer = ?, status = ?, notes = ? WHERE id = ?",
      [date, partName, category, cost, odometer, status, notes, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/upgrades/:id', async (req, res) => {
  try {
    await dbRun("DELETE FROM upgrades WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// RESET ENTIRE DATABASE
app.post('/api/reset', async (req, res) => {
  try {
    await dbRun("DROP TABLE IF EXISTS bike");
    await dbRun("DROP TABLE IF EXISTS maintenance");
    await dbRun("DROP TABLE IF EXISTS schedules");
    await dbRun("DROP TABLE IF EXISTS rides");
    await dbRun("DROP TABLE IF EXISTS upgrades");
    
    await initDatabaseTables();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// START EXPRESS RUNNER
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`MotoLog Server running successfully at http://localhost:${PORT}`);
  });
}

const handler = serverless(app);
export default handler;
