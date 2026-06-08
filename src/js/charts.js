/* src/js/charts.js */

let mileageChartInstance = null;
let expensesChartInstance = null;

// Global chart settings for Dark Mode themes
const setupChartDefaults = () => {
  if (typeof Chart === 'undefined') return;

  Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";
  Chart.defaults.font.size = 11;
  Chart.defaults.color = '#8e9aae'; // var(--text-secondary)
  
  Chart.defaults.plugins.tooltip.backgroundColor = '#131722';
  Chart.defaults.plugins.tooltip.titleColor = '#f1f3f9';
  Chart.defaults.plugins.tooltip.bodyColor = '#f1f3f9';
  Chart.defaults.plugins.tooltip.borderColor = 'rgba(255, 255, 255, 0.08)';
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.cornerRadius = 6;
};

/**
 * Initialize or update dashboard Chart.js canvases.
 * @param {Object} monthlyDistances - Monthly distance mapping
 * @param {Object} expenses - Expenses mapping
 */
export function updateDashboardCharts(monthlyDistances, expenses) {
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js CDN is not loaded yet.');
    return;
  }

  setupChartDefaults();

  // 1. MILEAGE BAR CHART
  const mileageCtx = document.getElementById('mileageChart');
  if (mileageCtx) {
    if (mileageChartInstance) {
      mileageChartInstance.destroy();
    }

    const labels = Object.keys(monthlyDistances);
    const data = Object.values(monthlyDistances);

    mileageChartInstance = new Chart(mileageCtx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Distance Ridden (km)',
          data: data,
          backgroundColor: 'rgba(0, 210, 255, 0.15)',
          borderColor: '#00d2ff',
          borderWidth: 2,
          borderRadius: 4,
          hoverBackgroundColor: 'rgba(0, 210, 255, 0.3)',
          hoverBorderColor: '#00d2ff',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            grid: {
              display: false,
              drawBorder: false
            },
            ticks: {
              color: '#8e9aae'
            }
          },
          y: {
            grid: {
              color: 'rgba(255, 255, 255, 0.04)',
              drawBorder: false
            },
            ticks: {
              color: '#8e9aae',
              callback: function(value) {
                return value + ' km';
              }
            }
          }
        }
      }
    });
  }

  // 2. EXPENSES DOUGHNUT CHART
  const expensesCtx = document.getElementById('expensesChart');
  if (expensesCtx) {
    if (expensesChartInstance) {
      expensesChartInstance.destroy();
    }

    const labels = Object.keys(expenses);
    const data = Object.values(expenses);
    const hasExpenses = data.reduce((a, b) => a + b, 0) > 0;

    expensesChartInstance = new Chart(expensesCtx, {
      type: 'doughnut',
      data: {
        labels: hasExpenses ? labels : ['No Data'],
        datasets: [{
          data: hasExpenses ? data : [1],
          backgroundColor: hasExpenses 
            ? ['rgba(255, 159, 0, 0.2)', 'rgba(161, 95, 251, 0.2)']
            : ['rgba(255, 255, 255, 0.05)'],
          borderColor: hasExpenses
            ? ['#ff9f00', '#a15ffb']
            : ['rgba(255, 255, 255, 0.15)'],
          borderWidth: 2,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              padding: 16,
              color: '#8e9aae',
              font: {
                weight: '600'
              }
            }
          },
          tooltip: {
            enabled: hasExpenses,
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.raw || 0;
                return ` ${label}: ₱${value.toFixed(2)}`;
              }
            }
          }
        }
      }
    });
  }
}
