/* src/js/db.js */

// Global state cache that other modules bind to
export const db = {};

// Load database from the Node server SQLite database
export const initDB = async () => {
  try {
    const response = await fetch('/api/db');
    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }
    const data = await response.json();
    
    // Clear existing cache attributes while maintaining reference
    for (const key in db) {
      if (db.hasOwnProperty(key)) delete db[key];
    }
    
    // Populate with server data
    Object.assign(db, data);
    updateStorageMeter();
  } catch (e) {
    console.error("Failed loading database state from backend server:", e);
    // If the server is offline or fails, initialize empty arrays to prevent frontend crash
    Object.assign(db, {
      bike: { name: "Offline Mode", year: "2024", odometer: 0, avatarColor: "cyan" },
      maintenance: [],
      schedules: [],
      rides: [],
      upgrades: []
    });
  }
};

// Obsoleted by API: mutations occur instantly on server. 
// We keep it as a stub for compatibility with metrics recalculations if needed.
export const saveDB = () => {
  updateStorageMeter();
};

// Storage meter utilization calculator (displays sqlite DB size representation)
export const updateStorageMeter = () => {
  const serialized = JSON.stringify(db);
  const sizeBytes = new Blob([serialized]).size;
  // SQLite doesn't have a strict 5MB limit, but let's represent relative size in UI
  const percentUsed = ((sizeBytes / 5242880) * 100).toFixed(2);
  const meterEl = document.getElementById("storageUsage");
  if (meterEl) {
    meterEl.textContent = `DB File: ~${(sizeBytes / 1024).toFixed(1)} KB (${percentUsed}% space)`;
  }
};

// Reset database back to default SQL tables and seed arrays
export const resetToSeed = async () => {
  if (confirm("Are you sure you want to reset the SQL database file back to default seed records?")) {
    try {
      const response = await fetch('/api/reset', { method: 'POST' });
      if (response.ok) {
        await initDB();
        return true;
      }
    } catch (e) {
      console.error("Failed to reset backend database:", e);
    }
  }
  return false;
};

// Generate unique ID for records (frontend side helper before database entry)
export const generateId = (prefix) => {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};
