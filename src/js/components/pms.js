/* src/js/components/pms.js */
import { db, saveDB, generateId } from '../db.js';
import { formatNum, formatDateString } from '../utils.js';
import { openModal, closeModal, showConfirmModal } from '../ui.js';

// Renders the list of service schedule cards
export const renderPmsSchedules = () => {
  const gridEl = document.getElementById("pmsList");
  if (!gridEl) return;

  if (db.schedules.length === 0) {
    gridEl.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;">No maintenance schedules configured. Click 'Add Schedule' to create.</div>`;
    return;
  }

  const currentOdometer = db.bike.odometer;
  const today = new Date();

  gridEl.innerHTML = db.schedules.map(schedule => {
    const dueOdo = Number(schedule.lastOdo) + Number(schedule.intervalKm || 0);
    const remainingKm = schedule.intervalKm ? (dueOdo - currentOdometer) : null;
    
    let remainingDays = null;
    let dueDate = null;
    if (schedule.intervalMonths) {
      const last = new Date(schedule.lastDate);
      dueDate = new Date(last.setMonth(last.getMonth() + Number(schedule.intervalMonths)));
      const diffTime = dueDate.getTime() - today.getTime();
      remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    let status = "healthy";
    let statusText = "Healthy";
    
    const isKmOverdue = remainingKm !== null && remainingKm <= 0;
    const isDateOverdue = remainingDays !== null && remainingDays <= 0;
    const isKmDueSoon = remainingKm !== null && remainingKm > 0 && remainingKm <= 500;
    const isDateDueSoon = remainingDays !== null && remainingDays > 0 && remainingDays <= 15;

    if (isKmOverdue || isDateOverdue) {
      status = "overdue";
      statusText = "Overdue";
    } else if (isKmDueSoon || isDateDueSoon) {
      status = "due";
      statusText = "Due Soon";
    }

    let progressPercentage = 0;
    if (schedule.intervalKm) {
      const distanceAccumulated = currentOdometer - schedule.lastOdo;
      progressPercentage = Math.min(Math.max((distanceAccumulated / schedule.intervalKm) * 100, 0), 100);
    } else if (schedule.intervalMonths && remainingDays !== null) {
      const lastDateObj = new Date(schedule.lastDate);
      const totalIntervalDays = Math.ceil((dueDate.getTime() - lastDateObj.getTime()) / (1000 * 60 * 60 * 24));
      const daysPassed = totalIntervalDays - remainingDays;
      progressPercentage = Math.min(Math.max((daysPassed / totalIntervalDays) * 100, 0), 100);
    }

    const intervalsDesc = [];
    if (schedule.intervalKm) intervalsDesc.push(`every ${formatNum(schedule.intervalKm)} km`);
    if (schedule.intervalMonths) intervalsDesc.push(`every ${schedule.intervalMonths} months`);
    const intervalString = intervalsDesc.join(" or ");

    let dueDetails = "";
    if (remainingKm !== null) {
      dueDetails += remainingKm <= 0 
        ? `<span class="text-danger">Due: ${formatNum(dueOdo)} km (${formatNum(Math.abs(remainingKm))} km past due)</span>`
        : `Due at ${formatNum(dueOdo)} km (${formatNum(remainingKm)} km left)`;
    }
    
    let dateDueDetails = "";
    if (dueDate) {
      dateDueDetails += remainingDays <= 0
        ? `<span class="text-danger">Due: ${formatDateString(dueDate)} (${Math.abs(remainingDays)} days overdue)</span>`
        : `Due by ${formatDateString(dueDate)} (${remainingDays} days left)`;
    }

    return `
      <div class="pms-card ${status}">
        <div class="pms-status-indicator ${status}">
          <div class="status-dot"></div>
          <span class="status-label-text">${statusText}</span>
        </div>
        
        <div class="pms-card-header">
          <h3>${schedule.category}</h3>
          <p class="interval">${intervalString}</p>
        </div>

        <div class="pms-progress-block">
          <div class="progress-labels">
            <span>Last Done: ${formatNum(schedule.lastOdo)} km</span>
            <span>Usage: ${formatNum(progressPercentage)}%</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${progressPercentage}%"></div>
          </div>
        </div>

        <div class="pms-card-stats">
          <div class="pms-stat">
            <span class="label">Distance Target</span>
            <span class="val">${dueDetails || 'N/A'}</span>
          </div>
          <div class="pms-stat">
            <span class="label">Date Target</span>
            <span class="val">${dateDueDetails || 'N/A'}</span>
          </div>
        </div>

        <div class="pms-card-actions">
          <button class="btn btn-sm btn-primary" data-action="perform" data-id="${schedule.id}" title="Log this service now">
            <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Performed
          </button>
          
          <div class="actions-cell">
            <button class="action-btn edit" data-action="edit" data-id="${schedule.id}" title="Edit Schedule">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </button>
            <button class="action-btn delete" data-action="delete" data-id="${schedule.id}" title="Delete Schedule">
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

// Edit PMS Schedule
const editPms = (id) => {
  const pms = db.schedules.find(s => s.id === id);
  if (!pms) return;

  document.getElementById("pmsModalTitle").textContent = "Edit Service Schedule";
  document.getElementById("pmsIdInput").value = pms.id;
  document.getElementById("pmsCategorySelect").value = pms.category;
  document.getElementById("pmsIntervalKmInput").value = pms.intervalKm || '';
  document.getElementById("pmsIntervalMonthsInput").value = pms.intervalMonths || '';
  document.getElementById("pmsLastOdoInput").value = pms.lastOdo;
  document.getElementById("pmsLastDateInput").value = pms.lastDate;

  openModal("pmsModal");
};

// Delete PMS Schedule
const deletePms = async (id, onStateChangeCallback) => {
  if (await showConfirmModal("Are you sure you want to delete this maintenance schedule?")) {
    try {
      const response = await fetch(`/api/schedules/${id}`, { method: 'DELETE' });
      if (response.ok) {
        if (onStateChangeCallback) await onStateChangeCallback();
      }
    } catch (e) {
      console.error("Failed to delete schedule:", e);
    }
  }
};

// Log matched PMS done
const markPmsDone = (id) => {
  const schedule = db.schedules.find(s => s.id === id);
  if (!schedule) return;

  // Prepopulate maintenance form with this PMS details
  document.getElementById("maintModalTitle").textContent = "Log Service Task";
  document.getElementById("maintIdInput").value = ""; // Brand new log
  document.getElementById("maintDateInput").value = new Date().toISOString().split('T')[0];
  document.getElementById("maintOdoInput").value = db.bike.odometer;
  document.getElementById("maintCategorySelect").value = schedule.category;
  document.getElementById("maintCostInput").value = "";
  document.getElementById("maintDescInput").value = `Completed periodic service for ${schedule.category}`;
  document.getElementById("maintNotesInput").value = "Completed PMS task checklist.";

  openModal("maintModal");
};

export const initPmsListeners = (onStateChangeCallback) => {
  // Event delegation for PMS card actions
  const gridEl = document.getElementById("pmsList");
  if (gridEl) {
    gridEl.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const action = btn.getAttribute("data-action");
      const id = btn.getAttribute("data-id");
      if (!action || !id) return;

      if (action === "perform") {
        markPmsDone(id);
      } else if (action === "edit") {
        editPms(id);
      } else if (action === "delete") {
        deletePms(id, onStateChangeCallback);
      }
    });
  }

  // Form submission handler
  const form = document.getElementById("pmsForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const pmsId = document.getElementById("pmsIdInput").value;
      const isEditing = !!pmsId;

      const scheduleRecord = {
        id: isEditing ? pmsId : generateId("s"),
        category: document.getElementById("pmsCategorySelect").value,
        intervalKm: document.getElementById("pmsIntervalKmInput").value ? Number(document.getElementById("pmsIntervalKmInput").value) : 0,
        intervalMonths: document.getElementById("pmsIntervalMonthsInput").value ? Number(document.getElementById("pmsIntervalMonthsInput").value) : 0,
        lastOdo: Number(document.getElementById("pmsLastOdoInput").value) || 0,
        lastDate: document.getElementById("pmsLastDateInput").value
      };

      try {
        if (isEditing) {
          await fetch(`/api/schedules/${pmsId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(scheduleRecord)
          });
        } else {
          await fetch(`/api/schedules`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(scheduleRecord)
          });
        }

        closeModal("pmsModal");
        if (onStateChangeCallback) await onStateChangeCallback();
      } catch (err) {
        console.error("Failed to save schedule:", err);
      }
    });
  }
};
