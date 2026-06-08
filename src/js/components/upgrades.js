/* src/js/components/upgrades.js */
import { db, saveDB, generateId } from '../db.js';
import { formatNum, formatDateString } from '../utils.js';
import { openModal, closeModal, showConfirmModal } from '../ui.js';

// Renders the upgrades grid list
export const renderUpgrades = () => {
  const gridEl = document.getElementById("upgradesList");
  if (!gridEl) return;

  const searchQuery = document.getElementById("upgradeSearch").value.toLowerCase();
  const categoryFilter = document.getElementById("upgradeCategoryFilter").value;

  const filteredUpgrades = db.upgrades.filter(item => {
    const matchesSearch = item.partName.toLowerCase().includes(searchQuery) ||
      (item.notes && item.notes.toLowerCase().includes(searchQuery));
    const matchesCategory = categoryFilter === "All" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Calculate local spent metrics
  const totalSpent = db.upgrades.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
  const installedCount = db.upgrades.filter(item => item.status === "Installed").length;
  const wishlistCount = db.upgrades.filter(item => item.status === "Planned").length;

  const spentEl = document.getElementById("upgradesTotalSpent");
  const instCountEl = document.getElementById("upgradesInstalledCount");
  const wishCountEl = document.getElementById("upgradesWishlistCount");

  if (spentEl) spentEl.textContent = `₱${formatNum(totalSpent, 2)}`;
  if (instCountEl) instCountEl.textContent = installedCount;
  if (wishCountEl) wishCountEl.textContent = wishlistCount;

  if (filteredUpgrades.length === 0) {
    gridEl.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;">No upgrades found matching the search.</div>`;
    return;
  }

  // Sort: Installed items first, then by date descending
  filteredUpgrades.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "Installed" ? -1 : 1;
    }
    return new Date(b.date) - new Date(a.date);
  });

  gridEl.innerHTML = filteredUpgrades.map(item => {
    const statusClass = item.status === "Installed" ? "installed" : "planned";
    const odometerDisplay = item.odometer ? `${formatNum(item.odometer)} km` : '&ndash;';

    return `
      <div class="upgrade-card">
        <div class="upgrade-header">
          <div>
            <span class="small-label" style="text-transform: uppercase;">${item.category}</span>
            <h3 class="upgrade-title">${item.partName}</h3>
          </div>
          <span class="upgrade-badge ${statusClass}">${item.status}</span>
        </div>

        <div class="upgrade-details-list">
          <div class="upgrade-detail">
            <span class="lbl">Installed On</span>
            <span class="val">${formatDateString(item.date)}</span>
          </div>
          <div class="upgrade-detail">
            <span class="lbl">Install Odo</span>
            <span class="val">${odometerDisplay}</span>
          </div>
        </div>

        <div class="upgrade-notes">${item.notes || 'No description notes.'}</div>

        <div class="upgrade-footer">
          <span class="upgrade-cost">₱${formatNum(item.cost, 2)}</span>
          
          <div class="actions-cell">
            ${item.status === "Planned" ? `
              <button class="btn btn-sm btn-outline text-green" data-action="install" data-id="${item.id}" title="Mark Installed" style="padding: 4px 8px; border-color: rgba(0, 255, 135, 0.2)">
                Install
              </button>
            ` : ''}
            <button class="action-btn edit" data-action="edit" data-id="${item.id}" title="Edit Upgrade">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </button>
            <button class="action-btn delete" data-action="delete" data-id="${item.id}" title="Delete Upgrade">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
};

// Edit Upgrade
const editUpgrade = (id) => {
  const item = db.upgrades.find(u => u.id === id);
  if (!item) return;

  document.getElementById("upgradeModalTitle").textContent = "Edit Upgrade Details";
  document.getElementById("upgradeIdInput").value = item.id;
  document.getElementById("upgradeDateInput").value = item.date;
  document.getElementById("upgradeNameInput").value = item.partName;
  document.getElementById("upgradeCategorySelect").value = item.category;
  document.getElementById("upgradeCostInput").value = item.cost;
  document.getElementById("upgradeOdoInput").value = item.odometer;

  if (item.status === "Installed") {
    document.querySelector('input[name="upgradeStatus"][value="Installed"]').checked = true;
  } else {
    document.querySelector('input[name="upgradeStatus"][value="Planned"]').checked = true;
  }

  document.getElementById("upgradeNotesInput").value = item.notes || '';

  openModal("upgradeModal");
};

// Delete Upgrade
const deleteUpgrade = async (id, onStateChangeCallback) => {
  if (await showConfirmModal("Are you sure you want to delete this upgrade entry?")) {
    try {
      const response = await fetch(`/api/upgrades/${id}`, { method: 'DELETE' });
      if (response.ok) {
        if (onStateChangeCallback) await onStateChangeCallback();
      }
    } catch (e) {
      console.error("Failed to delete upgrade:", e);
    }
  }
};

// Mark wishlist item as installed
const installPlannedUpgrade = async (id, onStateChangeCallback) => {
  const item = db.upgrades.find(u => u.id === id);
  if (!item) return;

  item.status = "Installed";
  item.date = new Date().toISOString().split('T')[0];
  item.odometer = db.bike.odometer;

  try {
    const response = await fetch(`/api/upgrades/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    if (response.ok) {
      if (onStateChangeCallback) await onStateChangeCallback();
    }
  } catch (e) {
    console.error("Failed to mark upgrade as installed:", e);
  }
};

export const initUpgradesListeners = (onStateChangeCallback) => {
  // Event delegation for upgrades list card actions
  const listEl = document.getElementById("upgradesList");
  if (listEl) {
    listEl.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const action = btn.getAttribute("data-action");
      const id = btn.getAttribute("data-id");
      if (!action || !id) return;

      if (action === "install") {
        installPlannedUpgrade(id, onStateChangeCallback);
      } else if (action === "edit") {
        editUpgrade(id);
      } else if (action === "delete") {
        deleteUpgrade(id, onStateChangeCallback);
      }
    });
  }

  // Form submission handler
  const form = document.getElementById("upgradeForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const id = document.getElementById("upgradeIdInput").value;
      const isEditing = !!id;

      const upgradeRecord = {
        id: isEditing ? id : generateId("u"),
        date: document.getElementById("upgradeDateInput").value,
        partName: document.getElementById("upgradeNameInput").value,
        category: document.getElementById("upgradeCategorySelect").value,
        cost: Number(document.getElementById("upgradeCostInput").value) || 0,
        odometer: Number(document.getElementById("upgradeOdoInput").value) || 0,
        status: document.querySelector('input[name="upgradeStatus"]:checked').value,
        notes: document.getElementById("upgradeNotesInput").value
      };

      try {
        if (isEditing) {
          await fetch(`/api/upgrades/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(upgradeRecord)
          });
        } else {
          await fetch(`/api/upgrades`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(upgradeRecord)
          });
        }

        closeModal("upgradeModal");
        if (onStateChangeCallback) await onStateChangeCallback();
      } catch (err) {
        console.error("Failed to save upgrade:", err);
      }
    });
  }

  // Filter input listeners
  const searchInput = document.getElementById("upgradeSearch");
  const filterCat = document.getElementById("upgradeCategoryFilter");

  if (searchInput) searchInput.addEventListener("input", renderUpgrades);
  if (filterCat) filterCat.addEventListener("change", renderUpgrades);
};
