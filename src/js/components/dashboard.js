/* src/js/components/dashboard.js */
import { db, saveDB } from '../db.js';
import { formatNum, formatDateString, compileTimelineData } from '../utils.js';
import { updateDashboardCharts } from '../charts.js';

// Recalculates estimated fuel cost on the fly
export const recalculateEstimatedFuelCost = (avgFuelEconomy) => {
  const distance = Number(document.getElementById("calcDistance").value) || 0;
  const fuelPrice = Number(document.getElementById("calcFuelPrice").value) || 0;
  
  const economy = avgFuelEconomy || 22.0; // fallback default
  const estimatedLiters = distance / economy;
  const estimatedCost = estimatedLiters * fuelPrice;
  
  const resultValueEl = document.getElementById("calcResultValue");
  if (resultValueEl) {
    resultValueEl.textContent = `₱${formatNum(estimatedCost, 2)}`;
  }
};

// Render recent history logs widget
const renderRecentActivity = () => {
  const container = document.getElementById("dashboardRecentActivity");
  if (!container) return;

  const timelineItems = compileTimelineData().slice(0, 5);
  
  if (timelineItems.length === 0) {
    container.innerHTML = `<div class="empty-state">No logs recorded yet. Let's make some memories!</div>`;
    return;
  }

  container.innerHTML = timelineItems.map(item => {
    return `
      <div class="timeline-item ${item.type}">
        <div class="timeline-marker"></div>
        <div class="timeline-content">
          <div class="timeline-meta">
            <span>${formatDateString(item.date)}</span>
            ${item.odometer ? `<span class="odo">${formatNum(item.odometer)} km</span>` : ''}
          </div>
          <div class="timeline-title">${item.title}</div>
          <div class="timeline-desc">${item.description}</div>
        </div>
      </div>
    `;
  }).join('');
};

// Render Dashboard main panels
export const renderDashboard = (metrics) => {
  // Stats cards
  const distEl = document.getElementById("statTotalDistance");
  const countEl = document.getElementById("statRidesCount");
  const spentEl = document.getElementById("statTotalSpent");
  const splitEl = document.getElementById("statSpentSplit");
  const nextEl = document.getElementById("statNextService");
  const nextRemEl = document.getElementById("statNextServiceRemaining");
  const fuelEl = document.getElementById("statAvgFuel");

  if (distEl) distEl.textContent = `${formatNum(metrics.totalDistance)} km`;
  if (countEl) countEl.textContent = `${db.rides.length} total rides logged`;
  if (spentEl) spentEl.textContent = `₱${formatNum(metrics.totalSpent, 2)}`;
  if (splitEl) splitEl.textContent = `Maint: ₱${formatNum(metrics.totalMaintSpent)} | Upgr: ₱${formatNum(metrics.totalUpgradeSpent)}`;
  if (nextEl) nextEl.textContent = metrics.nextServiceCategory;
  if (nextRemEl) nextRemEl.textContent = metrics.nextServiceRemaining;
  if (fuelEl) {
    fuelEl.textContent = metrics.avgFuelEconomy > 0 
      ? `${formatNum(metrics.avgFuelEconomy, 1)} km/L` 
      : `-- km/L`;
  }

  // Recalculate calculator widget
  recalculateEstimatedFuelCost(metrics.avgFuelEconomy);

  // Render compact dashboard feed
  renderRecentActivity();

  // Redraw Chart.js panels
  updateDashboardCharts(metrics.monthlyDistances, {
    "Maintenance": metrics.totalMaintSpent,
    "Upgrades": metrics.totalUpgradeSpent
  });
};

// Initialize listeners for dashboard tab specific actions
export const initDashboardListeners = (onStateChangeCallback) => {
  const calcDist = document.getElementById("calcDistance");
  const calcFuel = document.getElementById("calcFuelPrice");
  const odoForm = document.getElementById("quickOdoForm");

  if (calcDist) {
    calcDist.addEventListener("input", () => {
      // Find average fuel economy
      let totalFuelRidesDistance = 0;
      let totalFuelLiters = 0;
      db.rides.forEach(ride => {
        if (ride.fuelLiters && Number(ride.fuelLiters) > 0) {
          totalFuelRidesDistance += Number(ride.distance);
          totalFuelLiters += Number(ride.fuelLiters);
        }
      });
      const avgFuel = totalFuelLiters > 0 ? (totalFuelRidesDistance / totalFuelLiters) : 0;
      recalculateEstimatedFuelCost(avgFuel);
    });
  }

  if (calcFuel) {
    calcFuel.addEventListener("input", () => {
      let totalFuelRidesDistance = 0;
      let totalFuelLiters = 0;
      db.rides.forEach(ride => {
        if (ride.fuelLiters && Number(ride.fuelLiters) > 0) {
          totalFuelRidesDistance += Number(ride.distance);
          totalFuelLiters += Number(ride.fuelLiters);
        }
      });
      const avgFuel = totalFuelLiters > 0 ? (totalFuelRidesDistance / totalFuelLiters) : 0;
      recalculateEstimatedFuelCost(avgFuel);
    });
  }

  // Quick Odometer form submission
  if (odoForm) {
    odoForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const inputOdo = Number(document.getElementById("quickOdometerInput").value);
      if (inputOdo >= 0) {
        db.bike.odometer = inputOdo;
        try {
          await fetch('/api/bike', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(db.bike)
          });
          if (onStateChangeCallback) await onStateChangeCallback();
        } catch (err) {
          console.error("Failed to update odometer:", err);
        }
      }
    });
  }
};
