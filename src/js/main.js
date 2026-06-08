/* src/js/main.js */
import { initDB, db } from './db.js';
import { calculateMetrics } from './utils.js';
import { initGlobalUI, renderOdometerWidgets, openModal, closeModal } from './ui.js';
import { renderDashboard, initDashboardListeners } from './components/dashboard.js';
import { renderMaintenanceLogs, initMaintenanceListeners } from './components/maintenance.js';
import { renderPmsSchedules, initPmsListeners } from './components/pms.js';
import { renderRides, initRidesListeners } from './components/rides.js';
import { renderUpgrades, initUpgradesListeners } from './components/upgrades.js';
import { renderFullHistoryTimeline, initHistoryListeners } from './components/history.js';

// Master Refresh Orchestrator
export const renderAll = async () => {
  await initDB();
  const metrics = calculateMetrics();
  
  // Render sub-components
  renderOdometerWidgets();
  renderDashboard(metrics);
  renderMaintenanceLogs();
  renderPmsSchedules();
  renderRides();
  renderUpgrades();
  
  // Find current timeline active tab filter
  const activeTimelineFilterBtn = document.querySelector(".timeline-controls .btn.active");
  const filterType = activeTimelineFilterBtn ? activeTimelineFilterBtn.getAttribute("data-timeline-filter") : "all";
  renderFullHistoryTimeline(filterType);
};

// Sidebar Tab Router Navigation
const initNavigation = () => {
  const tabTitleMap = {
    "overview": { title: "Dashboard Overview", sub: "Keep track of your machine's heartbeat." },
    "maintenance": { title: "Maintenance Logs", sub: "Review history of service repairs and DIY checks." },
    "pms": { title: "PMS Schedules", sub: "Track mileage & chronological preventive maintenance limits." },
    "rides": { title: "Ride Records", sub: "Logs of trips, road trip odometer gains, and fuel economy stats." },
    "upgrades": { title: "Upgrades & Parts", sub: "Catalog mods, bolt-on performance additions, and future wishlist components." },
    "history": { title: "Chronological History", sub: "Unified vertical timeline feed of everything your bike went through." }
  };

  const navItems = document.querySelectorAll(".nav-item");
  const panels = document.querySelectorAll(".tab-panel");
  
  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const tabName = item.getAttribute("data-tab");
      
      // Update sidebar nav active classes
      navItems.forEach(n => n.classList.remove("active"));
      item.classList.add("active");
      
      // Toggle display of panels
      panels.forEach(panel => {
        panel.classList.remove("active");
        if (panel.id === `tab-${tabName}`) {
          panel.classList.add("active");
        }
      });
      
      // Update page headers
      const headers = tabTitleMap[tabName];
      if (headers) {
        document.getElementById("currentTabTitle").textContent = headers.title;
        document.getElementById("currentTabSubtitle").textContent = headers.sub;
      }
      
      // Re-trigger visual rendering if going to dashboard
      if (tabName === "overview") {
        renderAll();
      }
    });
  });

  // Timeline shortcut jump
  const viewHistoryBtn = document.querySelector(".view-history-shortcut");
  if (viewHistoryBtn) {
    viewHistoryBtn.addEventListener("click", () => {
      const histBtn = document.querySelector('.nav-item[data-tab="history"]');
      if (histBtn) histBtn.click();
    });
  }
};

// Initialize Quick Action Modals
const initQuickActions = () => {
  const quickAddBtn = document.getElementById("quickAddBtn");
  const qOptionRide = document.getElementById("quickOptionRide");
  const qOptionMaint = document.getElementById("quickOptionMaint");
  const qOptionUpgrade = document.getElementById("quickOptionUpgrade");

  const addMaintLogBtn = document.getElementById("addMaintLogBtn");
  const addPmsBtn = document.getElementById("addPmsBtn");
  const addRideBtn = document.getElementById("addRideBtn");
  const addUpgradeBtn = document.getElementById("addUpgradeBtn");

  if (quickAddBtn) {
    quickAddBtn.addEventListener("click", () => openModal("quickRecordModal"));
  }

  // Quick Option Modals
  if (qOptionRide) {
    qOptionRide.addEventListener("click", () => {
      closeModal("quickRecordModal");
      document.getElementById("rideModalTitle").textContent = "Log a Ride";
      document.getElementById("rideIdInput").value = "";
      document.getElementById("rideForm").reset();
      document.getElementById("rideDateInput").value = new Date().toISOString().split('T')[0];
      document.getElementById("rideUpdateOdoCheckbox").checked = true;
      openModal("rideModal");
    });
  }

  if (qOptionMaint) {
    qOptionMaint.addEventListener("click", () => {
      closeModal("quickRecordModal");
      document.getElementById("maintModalTitle").textContent = "Log Maintenance Task";
      document.getElementById("maintIdInput").value = "";
      document.getElementById("maintForm").reset();
      document.getElementById("maintDateInput").value = new Date().toISOString().split('T')[0];
      document.getElementById("maintOdoInput").value = db.bike.odometer;
      openModal("maintModal");
    });
  }

  if (qOptionUpgrade) {
    qOptionUpgrade.addEventListener("click", () => {
      closeModal("quickRecordModal");
      document.getElementById("upgradeModalTitle").textContent = "Log a Part Upgrade";
      document.getElementById("upgradeIdInput").value = "";
      document.getElementById("upgradeForm").reset();
      document.getElementById("upgradeDateInput").value = new Date().toISOString().split('T')[0];
      document.getElementById("upgradeOdoInput").value = db.bike.odometer;
      openModal("upgradeModal");
    });
  }

  // Tab Add Buttons
  if (addMaintLogBtn) {
    addMaintLogBtn.addEventListener("click", () => {
      document.getElementById("maintModalTitle").textContent = "Log Maintenance Task";
      document.getElementById("maintIdInput").value = "";
      document.getElementById("maintForm").reset();
      document.getElementById("maintDateInput").value = new Date().toISOString().split('T')[0];
      document.getElementById("maintOdoInput").value = db.bike.odometer;
      openModal("maintModal");
    });
  }

  if (addPmsBtn) {
    addPmsBtn.addEventListener("click", () => {
      document.getElementById("pmsModalTitle").textContent = "Add PMS Schedule";
      document.getElementById("pmsIdInput").value = "";
      document.getElementById("pmsForm").reset();
      document.getElementById("pmsLastDateInput").value = new Date().toISOString().split('T')[0];
      document.getElementById("pmsLastOdoInput").value = db.bike.odometer;
      openModal("pmsModal");
    });
  }

  if (addRideBtn) {
    addRideBtn.addEventListener("click", () => {
      document.getElementById("rideModalTitle").textContent = "Log a Ride";
      document.getElementById("rideIdInput").value = "";
      document.getElementById("rideForm").reset();
      document.getElementById("rideDateInput").value = new Date().toISOString().split('T')[0];
      document.getElementById("rideUpdateOdoCheckbox").checked = true;
      openModal("rideModal");
    });
  }

  if (addUpgradeBtn) {
    addUpgradeBtn.addEventListener("click", () => {
      document.getElementById("upgradeModalTitle").textContent = "Log a Part Upgrade";
      document.getElementById("upgradeIdInput").value = "";
      document.getElementById("upgradeForm").reset();
      document.getElementById("upgradeDateInput").value = new Date().toISOString().split('T')[0];
      document.getElementById("upgradeOdoInput").value = db.bike.odometer;
      openModal("upgradeModal");
    });
  }
};

const boot = async () => {
  // DB Boot
  await initDB();
  
  // UI General Boot
  initGlobalUI(renderAll);
  initNavigation();
  initQuickActions();

  // Components listeners boot with State changes hooks
  initDashboardListeners(renderAll);
  initMaintenanceListeners(renderAll);
  initPmsListeners(renderAll);
  initRidesListeners(renderAll);
  initUpgradesListeners(renderAll);
  initHistoryListeners();

  // Initial render
  await renderAll();
};

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
