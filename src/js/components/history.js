/* src/js/components/history.js */
import { formatDateString, formatNum, compileTimelineData } from '../utils.js';

// Renders the full chronological history timeline panel
export const renderFullHistoryTimeline = (filterType = "all") => {
  const container = document.getElementById("historyTimeline");
  if (!container) return;

  let timelineItems = compileTimelineData();
  
  if (filterType !== "all") {
    timelineItems = timelineItems.filter(item => item.type === filterType);
  }

  if (timelineItems.length === 0) {
    container.innerHTML = `<div class="empty-state">No timeline logs match the selected filter.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="timeline full">
      ${timelineItems.map(item => {
        let iconMarkup = "";
        
        if (item.type === "maintenance") {
          iconMarkup = `<span class="timeline-full-marker-inner" style="color: var(--color-orange)">🔧</span>`;
        } else if (item.type === "ride") {
          iconMarkup = `<span class="timeline-full-marker-inner" style="color: var(--color-cyan)">🏍️</span>`;
        } else if (item.type === "upgrade") {
          iconMarkup = `<span class="timeline-full-marker-inner" style="color: var(--color-purple)">✨</span>`;
        }

        const tagClass = `tag-${item.type}`;

        return `
          <div class="timeline-item ${item.type}">
            <div class="timeline-marker">${iconMarkup}</div>
            <div class="timeline-content">
              <div class="timeline-meta">
                <span>${formatDateString(item.date)}</span>
                ${item.odometer ? `<span class="odo">${formatNum(item.odometer)} km</span>` : ''}
              </div>
              <div class="timeline-title">
                ${item.title}
                <span class="timeline-tag ${tagClass}">${item.type}</span>
              </div>
              <div class="timeline-desc" style="font-size: 13px;">${item.description}</div>
              <div class="timeline-details text-muted" style="font-size: 11px; margin-top: 6px; font-family: var(--font-mono); border-top: 1px dashed var(--border-color); padding-top: 4px;">
                ${item.details}
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
};

// Initialize filter selectors on the History Tab
export const initHistoryListeners = () => {
  document.querySelectorAll("[data-timeline-filter]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-timeline-filter]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      const filter = btn.getAttribute("data-timeline-filter");
      renderFullHistoryTimeline(filter);
    });
  });
};
