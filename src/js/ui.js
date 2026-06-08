/* src/js/ui.js */
import { db, saveDB } from './db.js';
import { formatNum } from './utils.js';

// Open Modal Dialog
export const openModal = (modalId) => {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("open");
  }
};

// Close Modal Dialog
export const closeModal = (modalId) => {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("open");
  }
};

// Close all modal instances
export const closeAllModals = () => {
  document.querySelectorAll(".modal-backdrop").forEach(modal => {
    modal.classList.remove("open");
  });
};

// Sync Odometer widgets across header and sidebar cards
export const renderOdometerWidgets = () => {
  document.getElementById("headerOdometer").textContent = `${formatNum(db.bike.odometer)} km`;
  document.getElementById("quickOdometerInput").value = db.bike.odometer;
  document.getElementById("profileBikeMeta").textContent = `${db.bike.year} // ${formatNum(db.bike.odometer)} km`;
  document.getElementById("profileBikeName").textContent = db.bike.name;
  
  const bikeAvatarEl = document.querySelector(".bike-avatar");
  if (bikeAvatarEl) {
    bikeAvatarEl.className = "bike-avatar " + (db.bike.avatarColor || "cyan");
  }
};

// Bind listeners for global elements like modal cancel buttons and profile submissions
export const initGlobalUI = (onStateChangeCallback) => {
  // Modal close buttons (cancel buttons & X buttons)
  document.querySelectorAll(".close-modal-btn, .close-modal").forEach(btn => {
    btn.addEventListener("click", closeAllModals);
  });

  // Close modals on clicking outside of dialog-card
  document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        closeAllModals();
      }
    });
  });

  // Profile Form submit
  const profileForm = document.getElementById("profileForm");
  if (profileForm) {
    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const bikeRecord = {
        name: document.getElementById("bikeNameInput").value,
        year: document.getElementById("bikeYearInput").value,
        odometer: Number(document.getElementById("bikeOdoInput").value),
        avatarColor: document.getElementById("bikeAvatarInput").value
      };
      
      try {
        const response = await fetch('/api/bike', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bikeRecord)
        });
        if (response.ok) {
          closeModal("profileModal");
          if (onStateChangeCallback) await onStateChangeCallback();
        } else {
          console.error("Server returned non-ok status for profile update:", response.status);
        }
      } catch (err) {
        console.error("Failed to update bike profile:", err);
      }
    });
  }

  // Edit Profile Trigger button click
  const editProfileBtn = document.getElementById("editProfileBtn");
  if (editProfileBtn) {
    editProfileBtn.addEventListener("click", () => {
      document.getElementById("bikeNameInput").value = db.bike.name;
      document.getElementById("bikeYearInput").value = db.bike.year;
      document.getElementById("bikeOdoInput").value = db.bike.odometer;
      document.getElementById("bikeAvatarInput").value = db.bike.avatarColor || "cyan";
      
      openModal("profileModal");
    });
  }
};

// Custom async confirmation modal to bypass iframe block policies on native alert/confirm
export const showConfirmModal = (message) => {
  return new Promise((resolve) => {
    const modal = document.getElementById("confirmDeleteModal");
    if (!modal) {
      // Fallback
      resolve(confirm(message));
      return;
    }
    
    // Set message text
    const msgEl = modal.querySelector(".modal-body p");
    if (msgEl) msgEl.textContent = message;
    
    const confirmBtn = document.getElementById("confirmDeleteBtn");
    const closeBtns = modal.querySelectorAll(".close-modal-btn, .close-modal");
    
    const cleanup = () => {
      confirmBtn.removeEventListener("click", onConfirm);
      closeBtns.forEach(btn => btn.removeEventListener("click", onCancel));
      modal.removeEventListener("click", onBackdropClick);
    };
    
    const onConfirm = () => {
      cleanup();
      modal.classList.remove("open");
      resolve(true);
    };
    
    const onCancel = () => {
      cleanup();
      modal.classList.remove("open");
      resolve(false);
    };
    
    const onBackdropClick = (e) => {
      if (e.target === modal) {
        onCancel();
      }
    };
    
    confirmBtn.addEventListener("click", onConfirm, { once: true });
    closeBtns.forEach(btn => btn.addEventListener("click", onCancel, { once: true }));
    modal.addEventListener("click", onBackdropClick);
    
    modal.classList.add("open");
  });
};
