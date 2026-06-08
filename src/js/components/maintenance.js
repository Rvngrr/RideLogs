/* src/js/components/maintenance.js */
import { db, saveDB, generateId } from '../db.js';
import { formatNum, formatDateString } from '../utils.js';
import { openModal, closeModal, showConfirmModal } from '../ui.js';

// Renders the maintenance logs table list
export const renderMaintenanceLogs = () => {
  const listEl = document.getElementById("maintLogList");
  if (!listEl) return;

  const searchQuery = document.getElementById("maintSearch").value.toLowerCase();
  const categoryFilter = document.getElementById("maintCategoryFilter").value;

  const filteredLogs = db.maintenance.filter(item => {
    const matchesSearch = item.category.toLowerCase().includes(searchQuery) ||
                          item.description.toLowerCase().includes(searchQuery) ||
                          (item.notes && item.notes.toLowerCase().includes(searchQuery));
    const matchesCategory = categoryFilter === "All" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Sort descending by date
  filteredLogs.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (filteredLogs.length === 0) {
    listEl.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 32px 0;">
          No maintenance logs match your criteria.
        </td>
      </tr>
    `;
    return;
  }

  listEl.innerHTML = filteredLogs.map(item => {
    return `
      <tr>
        <td>${formatDateString(item.date)}</td>
        <td class="odo">${formatNum(item.odometer)} km</td>
        <td><strong>${item.category}</strong></td>
        <td>
          <div class="maint-desc">${item.description}</div>
          ${item.notes ? `<div class="table-subnotes text-muted" style="font-size: 11px; margin-top:4px;">Note: ${item.notes}</div>` : ''}
        </td>
        <td class="cost">₱${formatNum(item.cost, 2)}</td>
        <td>
          <span class="badge ${item.diy ? 'badge-diy' : 'badge-shop'}">
            ${item.diy ? 'DIY' : 'Shop'}
          </span>
        </td>
        <td>
          <div class="actions-cell">
            <button class="action-btn edit" data-action="edit" data-id="${item.id}" title="Edit Log">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </button>
            <button class="action-btn delete" data-action="delete" data-id="${item.id}" title="Delete Log">
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

// Edit Maintenance log
const editMaintLog = (id) => {
  const log = db.maintenance.find(m => m.id === id);
  if (!log) return;

  document.getElementById("maintModalTitle").textContent = "Edit Maintenance Log";
  document.getElementById("maintIdInput").value = log.id;
  document.getElementById("maintDateInput").value = log.date;
  document.getElementById("maintOdoInput").value = log.odometer;
  document.getElementById("maintCategorySelect").value = log.category;
  document.getElementById("maintCostInput").value = log.cost;
  
  if (log.diy) {
    document.querySelector('input[name="maintDiy"][value="true"]').checked = true;
  } else {
    document.querySelector('input[name="maintDiy"][value="false"]').checked = true;
  }
  
  document.getElementById("maintDescInput").value = log.description;
  document.getElementById("maintNotesInput").value = log.notes || '';

  openModal("maintModal");
};

// Delete Maintenance log
const deleteMaintLog = async (id, onStateChangeCallback) => {
  if (await showConfirmModal("Are you sure you want to delete this maintenance log?")) {
    try {
      const response = await fetch(`/api/maintenance/${id}`, { method: 'DELETE' });
      if (response.ok) {
        if (onStateChangeCallback) await onStateChangeCallback();
      }
    } catch (e) {
      console.error("Failed to delete maintenance log:", e);
    }
  }
};

export const initMaintenanceListeners = (onStateChangeCallback) => {
  // Event delegation for table edit/delete actions
  const listEl = document.getElementById("maintLogList");
  if (listEl) {
    listEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".action-btn");
      if (!btn) return;
      const action = btn.getAttribute("data-action");
      const id = btn.getAttribute("data-id");
      if (action === "edit") {
        editMaintLog(id);
      } else if (action === "delete") {
        deleteMaintLog(id, onStateChangeCallback);
      }
    });
  }

  // Form submission handler
  const form = document.getElementById("maintForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const logId = document.getElementById("maintIdInput").value;
      const isEditing = !!logId;
      
      const odo = Number(document.getElementById("maintOdoInput").value);
      const category = document.getElementById("maintCategorySelect").value;
      const date = document.getElementById("maintDateInput").value;

      const logRecord = {
        id: isEditing ? logId : generateId("m"),
        date: date,
        odometer: odo,
        category: category,
        cost: Number(document.getElementById("maintCostInput").value) || 0,
        diy: document.querySelector('input[name="maintDiy"]:checked').value === "true",
        description: document.getElementById("maintDescInput").value,
        notes: document.getElementById("maintNotesInput").value
      };

      try {
        if (isEditing) {
          await fetch(`/api/maintenance/${logId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(logRecord)
          });
        } else {
          await fetch(`/api/maintenance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(logRecord)
          });

          // Sync odometer
          if (odo > db.bike.odometer) {
            db.bike.odometer = odo;
            await fetch('/api/bike', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(db.bike)
            });
          }
        }

        // Automatically reset matching PMS thresholds
        const matchedPms = db.schedules.find(s => s.category === category);
        if (matchedPms && odo >= matchedPms.lastOdo) {
          matchedPms.lastOdo = odo;
          matchedPms.lastDate = date;
          await fetch(`/api/schedules/${matchedPms.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(matchedPms)
          });
        }

        closeModal("maintModal");
        if (onStateChangeCallback) await onStateChangeCallback();
      } catch (err) {
        console.error("Failed to save maintenance log:", err);
      }
    });
  }

  // Filter input event triggers
  const maintSearch = document.getElementById("maintSearch");
  const maintCatFilter = document.getElementById("maintCategoryFilter");
  
  if (maintSearch) maintSearch.addEventListener("input", renderMaintenanceLogs);
  if (maintCatFilter) maintCatFilter.addEventListener("change", renderMaintenanceLogs);
};
