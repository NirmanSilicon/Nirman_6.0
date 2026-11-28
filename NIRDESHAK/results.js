// =========================================================
// Nirdeshak - Page 6: Results & Recommendations Controller
// Consumes recommendation payload from sessionStorage, renders
// results dashboard, and coordinates PDF report generation.
// =========================================================

import {
  initDashboard,
  renderDashboard,
  renderEmpty,
  renderError
} from './dashboard.js';

import {
  initReportUI,
  setReportData,
  downloadPdfReport
} from './report.js';

import {
  getState,
  clearState,
  getEffectiveQuery
} from './state.js';

document.addEventListener('DOMContentLoaded', () => {
  initResultsPage();
});

function initResultsPage() {
  initDashboard();
  initReportUI();

  const startNewBtn = document.getElementById('startNewAnalysisBtn');
  if (startNewBtn) {
    startNewBtn.addEventListener('click', () => {
      clearState();
    });
  }

  const state = getState();
  const query = (state && (state.originalQuery || getEffectiveQuery(state))) || '';
  const result = state && state.recommendationResult;

  if (!result) {
    renderEmpty(query || 'No requirement specified');
    return;
  }

  if (result.success && Array.isArray(result.recommendations) && result.recommendations.length > 0) {
    // Render live recommendations dashboard
    renderDashboard(result, query);

    // Prime PDF report generator with the recommendation payload
    setReportData(result, {
      originalQuery: query,
      extractedRequirements: state && state.extractedRequirements,
      isCuratedDemo: !!(result.isCuratedDemo || (result.recommendations && result.recommendations[0] && (result.recommendations[0].is_number === 'IS 2925:1984' || result.recommendations[0].isCuratedDemo)))
    });
  } else {
    // Empty result handling
    renderEmpty(query);
  }
}
