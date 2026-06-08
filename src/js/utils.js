/* src/js/utils.js */
import { db } from './db.js';

// Format numeric values
export const formatNum = (num, decimals = 0) => {
  return Number(num).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

// Format date strings
export const formatDateString = (dateStr) => {
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

// Calculate all high level metrics from db
export const calculateMetrics = () => {
  // Total Distance
  const totalDistance = db.rides.reduce((sum, ride) => sum + Number(ride.distance), 0);

  // Total Expenditures
  const totalMaintSpent = db.maintenance.reduce((sum, item) => sum + Number(item.cost), 0);
  const totalUpgradeSpent = db.upgrades.reduce((sum, item) => sum + Number(item.cost), 0);
  const totalSpent = totalMaintSpent + totalUpgradeSpent;

  // Average Fuel Efficiency (km/L)
  let totalFuelRidesDistance = 0;
  let totalFuelLiters = 0;
  db.rides.forEach(ride => {
    if (ride.fuelLiters && Number(ride.fuelLiters) > 0) {
      totalFuelRidesDistance += Number(ride.distance);
      totalFuelLiters += Number(ride.fuelLiters);
    }
  });
  const avgFuelEconomy = totalFuelLiters > 0 ? (totalFuelRidesDistance / totalFuelLiters) : 0;

  // Best fuel economy
  let bestFuelEconomy = 0;
  db.rides.forEach(ride => {
    if (ride.fuelLiters && Number(ride.fuelLiters) > 0) {
      const economy = Number(ride.distance) / Number(ride.fuelLiters);
      if (economy > bestFuelEconomy) {
        bestFuelEconomy = economy;
      }
    }
  });

  // Total Fuel Cost
  const totalFuelCost = db.rides.reduce((sum, ride) => sum + (Number(ride.fuelCost) || 0), 0);

  // Next Service Calculation
  let nextServiceCategory = "None";
  let nextServiceRemaining = "No schedules defined";
  let minRemainingKm = Infinity;
  const currentOdo = db.bike.odometer;

  db.schedules.forEach(schedule => {
    if (schedule.intervalKm && schedule.intervalKm > 0) {
      const targetOdo = Number(schedule.lastOdo) + Number(schedule.intervalKm);
      const remainingKm = targetOdo - currentOdo;

      if (remainingKm < minRemainingKm) {
        minRemainingKm = remainingKm;
        nextServiceCategory = schedule.category;

        if (remainingKm <= 0) {
          nextServiceRemaining = `Overdue by ${formatNum(Math.abs(remainingKm))} km`;
        } else {
          nextServiceRemaining = `${formatNum(remainingKm)} km remaining`;
        }
      }
    }
  });

  // Calculate monthly mileage (last 6 months relative to today)
  const monthlyDistances = {};
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const today = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const label = `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
    monthlyDistances[label] = 0;
  }

  db.rides.forEach(ride => {
    const rideDate = new Date(ride.date);
    if (!isNaN(rideDate)) {
      const label = `${monthNames[rideDate.getMonth()]} ${String(rideDate.getFullYear()).slice(-2)}`;
      if (monthlyDistances.hasOwnProperty(label)) {
        monthlyDistances[label] += Number(ride.distance);
      }
    }
  });

  return {
    totalDistance,
    totalMaintSpent,
    totalUpgradeSpent,
    totalSpent,
    avgFuelEconomy,
    bestFuelEconomy,
    totalFuelCost,
    nextServiceCategory,
    nextServiceRemaining,
    monthlyDistances
  };
};

// Generate chronological feed data compiled from rides, maintenance, and upgrades
export const compileTimelineData = () => {
  const list = [];

  // Maintenance logs
  db.maintenance.forEach(item => {
    list.push({
      id: item.id,
      type: "maintenance",
      date: item.date,
      odometer: item.odometer,
      title: `Maintenance: ${item.category}`,
      description: item.description,
      details: `₱${formatNum(item.cost, 2)} // ${item.diy ? 'DIY' : 'Shop service'}`,
      raw: item
    });
  });

  // Upgrades
  db.upgrades.forEach(item => {
    if (item.status === "Installed") {
      list.push({
        id: item.id,
        type: "upgrade",
        date: item.date,
        odometer: item.odometer,
        title: `Installed Upgrade: ${item.partName}`,
        description: item.notes || "No details provided.",
        details: `₱${formatNum(item.cost, 2)} // Category: ${item.category}`,
        raw: item
      });
    }
  });

  // Rides
  db.rides.forEach(item => {
    list.push({
      id: item.id,
      type: "ride",
      date: item.date,
      odometer: null,
      title: `Ride: ${item.route}`,
      description: `Covered ${formatNum(item.distance, 1)} km in ${item.duration || 'N/A'}.`,
      details: item.notes || "Logged ride record.",
      raw: item
    });
  });

  // Sort descending by date
  list.sort((a, b) => new Date(b.date) - new Date(a.date));
  return list;
};
