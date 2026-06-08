/* src/js/components/rides.js */
import { db, saveDB, generateId } from '../db.js';
import { formatNum, formatDateString, calculateMetrics } from '../utils.js';
import { openModal, closeModal, showConfirmModal } from '../ui.js';

// Renders the rides logs table list
export const renderRides = () => {
  const listEl = document.getElementById("ridesList");
  if (!listEl) return;

  const searchQuery = document.getElementById("rideSearch").value.toLowerCase();

  const filteredRides = db.rides.filter(ride => {
    return ride.route.toLowerCase().includes(searchQuery) ||
           (ride.notes && ride.notes.toLowerCase().includes(searchQuery));
  });

  // Sort descending by date
  filteredRides.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Render stats bar metrics
  const metrics = calculateMetrics();
  
  const distEl = document.getElementById("ridesTotalDist");
  const avgDistEl = document.getElementById("ridesAvgDist");
  const bestEl = document.getElementById("ridesBestFuel");
  const costEl = document.getElementById("ridesTotalFuelSpent");

  if (distEl) distEl.textContent = `${formatNum(metrics.totalDistance)} km`;
  if (avgDistEl) {
    avgDistEl.textContent = db.rides.length > 0 
      ? `${formatNum(metrics.totalDistance / db.rides.length)} km`
      : `0 km`;
  }
  if (bestEl) {
    bestEl.textContent = metrics.bestFuelEconomy > 0
      ? `${formatNum(metrics.bestFuelEconomy, 1)} km/L`
      : `-- km/L`;
  }
  if (costEl) costEl.textContent = `₱${formatNum(metrics.totalFuelCost, 2)}`;

  if (filteredRides.length === 0) {
    listEl.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 32px 0;">
          No ride records logged. Go throttle out!
        </td>
      </tr>
    `;
    return;
  }

  listEl.innerHTML = filteredRides.map(item => {
    const fuelEfficiency = item.fuelLiters && Number(item.fuelLiters) > 0
      ? `${formatNum(Number(item.distance) / Number(item.fuelLiters), 1)} km/L`
      : `&ndash;`;
      
    const fuelUsed = item.fuelLiters ? `${formatNum(item.fuelLiters, 1)} L` : `&ndash;`;
    const fuelCost = item.fuelCost ? `₱${formatNum(item.fuelCost, 2)}` : `&ndash;`;

    return `
      <tr>
        <td>${formatDateString(item.date)}</td>
        <td>
          <strong>${item.route}</strong>
          ${item.notes ? `<div class="table-subnotes text-muted" style="font-size: 11px; margin-top:4px;">Notes: ${item.notes}</div>` : ''}
        </td>
        <td class="odo">${formatNum(item.distance, 1)} km</td>
        <td>${item.duration || '&ndash;'}</td>
        <td>${fuelUsed}</td>
        <td>${fuelEfficiency}</td>
        <td class="cost">${fuelCost}</td>
        <td>
          <div class="actions-cell">
            <button class="action-btn edit" data-action="edit" data-id="${item.id}" title="Edit Ride">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </button>
            <button class="action-btn delete" data-action="delete" data-id="${item.id}" title="Delete Ride">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
};

// Edit Ride record
const editRide = (id) => {
  const ride = db.rides.find(r => r.id === id);
  if (!ride) return;

  document.getElementById("rideModalTitle").textContent = "Edit Ride Record";
  document.getElementById("rideIdInput").value = ride.id;
  document.getElementById("rideDateInput").value = ride.date;
  document.getElementById("rideRouteInput").value = ride.route;
  document.getElementById("rideDistanceInput").value = ride.distance;
  document.getElementById("rideDurationInput").value = ride.duration || '';
  document.getElementById("rideFuelInput").value = ride.fuelLiters || '';
  document.getElementById("rideFuelCostInput").value = ride.fuelCost || '';
  document.getElementById("rideNotesInput").value = ride.notes || '';
  
  // Disable automatic odometer update during edit to avoid infinite increments
  document.getElementById("rideUpdateOdoCheckbox").checked = false;

  openModal("rideModal");
};

// Delete Ride record
const deleteRide = async (id, onStateChangeCallback) => {
  if (await showConfirmModal("Are you sure you want to delete this ride record?")) {
    try {
      const response = await fetch(`/api/rides/${id}`, { method: 'DELETE' });
      if (response.ok) {
        if (onStateChangeCallback) await onStateChangeCallback();
      }
    } catch (e) {
      console.error("Failed to delete ride:", e);
    }
  }
};

export const initRidesListeners = (onStateChangeCallback) => {
  // Event delegation for table edit/delete actions
  const listEl = document.getElementById("ridesList");
  if (listEl) {
    listEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".action-btn");
      if (!btn) return;
      const action = btn.getAttribute("data-action");
      const id = btn.getAttribute("data-id");
      if (action === "edit") {
        editRide(id);
      } else if (action === "delete") {
        deleteRide(id, onStateChangeCallback);
      }
    });
  }

  // Form submission handler
  const form = document.getElementById("rideForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const rideId = document.getElementById("rideIdInput").value;
      const isEditing = !!rideId;

      const distance = Number(document.getElementById("rideDistanceInput").value);
      const triggerOdoUpdate = document.getElementById("rideUpdateOdoCheckbox").checked;

      const rideRecord = {
        id: isEditing ? rideId : generateId("r"),
        date: document.getElementById("rideDateInput").value,
        route: document.getElementById("rideRouteInput").value,
        distance: distance,
        duration: document.getElementById("rideDurationInput").value,
        fuelLiters: document.getElementById("rideFuelInput").value ? Number(document.getElementById("rideFuelInput").value) : null,
        fuelCost: document.getElementById("rideFuelCostInput").value ? Number(document.getElementById("rideFuelCostInput").value) : null,
        notes: document.getElementById("rideNotesInput").value
      };

      try {
        if (isEditing) {
          if (triggerOdoUpdate && !isNaN(distance)) {
            const oldRide = db.rides.find(r => r.id === rideId);
            const oldDistance = oldRide ? (Number(oldRide.distance) || 0) : 0;
            db.bike.odometer += (distance - oldDistance);
            await fetch('/api/bike', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(db.bike)
            });
          }

          await fetch(`/api/rides/${rideId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rideRecord)
          });
        } else {
          await fetch(`/api/rides`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rideRecord)
          });

          if (triggerOdoUpdate && !isNaN(distance)) {
            db.bike.odometer += distance;
            await fetch('/api/bike', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(db.bike)
            });
          }
        }

        closeModal("rideModal");
        if (onStateChangeCallback) await onStateChangeCallback();
      } catch (err) {
        console.error("Failed to save ride record:", err);
      }
    });
  }

  // Filter input listeners
  const searchInput = document.getElementById("rideSearch");
  if (searchInput) {
    searchInput.addEventListener("input", renderRides);
  }
};
