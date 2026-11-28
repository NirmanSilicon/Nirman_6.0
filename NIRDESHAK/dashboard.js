// =========================================================
// Nirdeshak - Results Dashboard & Recommendation UI
// Step 12: Professional Procurement Results Dashboard
//
// Consumes POST /api/recommendations/explain
// Displays:
// 1. Search / query summary (Original requirement vs Analysis)
// 2. Result Summary (Standards found, Top relevance, Version status, Certification status)
// 3. Recommended Standards Cards with Rank, IS number, Title, Relevance %
// 4. Component score breakdown (Semantic, Keyword text, Scope/application, Structured)
// 5. Version & Amendment database status
// 6. Certification & Compliance evaluation (Scheme, Explicit requirement, Test data flag)
// 7. Related / Normative Standards (IS number, Title, Relationship type, Direction)
// 8. Grounded AI Explanation (Summary, Why relevant, Evidence, Limitations, Provenance notice)
// 9. Source & Provenance context
// 10. Expandable detail view with full keyboard accessibility
// 11. Loading, Error, and Empty states
// =========================================================

import { setReportData, initReportUI } from './report.js';
import { renderRecommendationCardsList } from './recommendationDisplay.js';
import { renderStandardDetailPanel } from './standardDetailDisplay.js';

let currentRecommendations = [];
let currentSelectedRank = 1;

/**
 * Resolves the backend API base URL.
 */
export function getApiBaseUrl() {
  if (typeof window !== 'undefined' && window.location) {
    if (
      window.location.protocol === 'file:' ||
      (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') ||
      (window.location.port !== '3000' && window.location.port !== '')
    ) {
      return 'http://localhost:3000';
    }
  }
  return '';
}

/**
 * Utility to escape HTML and prevent XSS.
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Formats a 0-1 floating score into a clean display percentage string.
 * Requirement: displayPercentage = finalScore * 100
 * Does not alter the actual underlying score or label it as legal accuracy.
 */
export function formatScorePercent(score) {
  if (typeof score !== 'number' || isNaN(score)) return '0.0%';
  const clamped = Math.max(0, Math.min(1, score));
  const pct = clamped * 100;
  return pct.toFixed(1) + '%';
}

/**
 * Normalizes status labels to neutral procurement terminology.
 */
export function formatStatusLabel(statusValue, statusCategory) {
  const raw = statusValue || statusCategory || 'Unknown';
  const lower = String(raw).toLowerCase();
  if (lower === 'current' || lower === 'active') return 'Active / Current';
  if (lower === 'superseded') return 'Superseded';
  if (lower === 'withdrawn') return 'Withdrawn';
  if (lower === 'under_revision') return 'Under Revision';
  return String(raw);
}

/**
 * Initializes the dashboard module on DOM load.
 */
export function initDashboard() {
  const refreshBtn = document.getElementById('refreshRecommendationsBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      if (window.lastQueryText) {
        fetchAndRenderRecommendations(window.lastQueryText);
      }
    });
  }

  // Initialize report UI controls
  initReportUI();

  // Register on window object for testing and global access
  if (typeof window !== 'undefined') {
    window.NirdeshakDashboard = {
      fetchAndRenderRecommendations,
      renderDashboard,
      renderLoading,
      renderError,
      renderEmpty,
      clearDashboard,
      formatScorePercent,
      escapeHtml,
      updateSelectedStandard,
      getSelectedRank: () => currentSelectedRank,
      getCurrentRecommendations: () => currentRecommendations
    };
  }
}

/**
 * Shows the loading state with professional government portal styling.
 */
export function renderLoading(message) {
  const dashboard = document.getElementById('resultsDashboard');
  const loading = document.getElementById('dashboardLoading');
  const error = document.getElementById('dashboardError');
  const empty = document.getElementById('dashboardEmpty');
  const content = document.getElementById('dashboardContent');
  const loadingText = document.getElementById('dashboardLoadingText');

  if (dashboard) dashboard.style.display = 'block';
  if (loading) loading.style.display = 'flex';
  if (error) error.style.display = 'none';
  if (empty) empty.style.display = 'none';
  if (content) content.style.display = 'none';

  if (loadingText) {
    loadingText.textContent = message || 'Analyzing procurement requirement...';
  }
}

/**
 * Shows an error state with a clean, safe, human-readable message.
 * Never displays internal SQL, API keys, or raw stack traces.
 */
export function renderError(message, details) {
  const dashboard = document.getElementById('resultsDashboard');
  const loading = document.getElementById('dashboardLoading');
  const error = document.getElementById('dashboardError');
  const empty = document.getElementById('dashboardEmpty');
  const content = document.getElementById('dashboardContent');
  const msgEl = document.getElementById('dashboardErrorMessage');
  const titleEl = document.getElementById('dashboardErrorTitle');

  if (dashboard) dashboard.style.display = 'block';
  if (loading) loading.style.display = 'none';
  if (empty) empty.style.display = 'none';
  if (content) content.style.display = 'none';

  if (error) {
    error.style.display = 'flex';
  }

  if (titleEl) {
    titleEl.textContent = 'Analysis Request Failed';
  }

  // Sanitize message to guarantee no keys or stack traces are visible
  let safeMsg = message || 'An unexpected error occurred while communicating with the recommendation service.';
  if (safeMsg.includes('AIzaSy') || safeMsg.includes('gemini') && safeMsg.includes('key')) {
    safeMsg = 'Authentication configuration error occurred.';
  }
  if (safeMsg.includes('SELECT') || safeMsg.includes('postgres') || safeMsg.includes('relation')) {
    safeMsg = 'Database query encountered an issue. Please retry.';
  }

  if (msgEl) {
    msgEl.textContent = safeMsg;
  }
}

/**
 * Shows an empty result state explaining the absence of results.
 */
export function renderEmpty(query) {
  const dashboard = document.getElementById('resultsDashboard');
  const loading = document.getElementById('dashboardLoading');
  const error = document.getElementById('dashboardError');
  const empty = document.getElementById('dashboardEmpty');
  const content = document.getElementById('dashboardContent');

  if (dashboard) dashboard.style.display = 'block';
  if (loading) loading.style.display = 'none';
  if (error) error.style.display = 'none';
  if (content) content.style.display = 'none';

  if (empty) {
    empty.style.display = 'block';
  }

  // Populate report data cache with empty-state payload so PDF report can be generated
  setReportData({
    query: query || '',
    originalQuery: query || '',
    count: 0,
    recommendations: [],
    summary: 'No matching standards were retrieved in the available database for this requirement.',
    limitations: ['Absence of retrieved standards in this development database does not establish that no applicable standard exists.'],
    explanationGenerated: false
  });
}

/**
 * Clears and hides the entire recommendations dashboard.
 */
export function clearDashboard() {
  const dashboard = document.getElementById('resultsDashboard');
  const loading = document.getElementById('dashboardLoading');
  const error = document.getElementById('dashboardError');
  const empty = document.getElementById('dashboardEmpty');
  const content = document.getElementById('dashboardContent');

  if (dashboard) dashboard.style.display = 'none';
  if (loading) loading.style.display = 'none';
  if (error) error.style.display = 'none';
  if (empty) empty.style.display = 'none';
  if (content) {
    content.style.display = 'none';
    content.innerHTML = '';
  }

  // Clear report data cache
  setReportData(null);
}

/**
 * Main dashboard API fetch and render orchestrator.
 * Sends POST /api/recommendations/explain with { query, limit }.
 *
 * @param {string} query User input text or requirement
 * @param {Object} [options]
 */
export async function fetchAndRenderRecommendations(query, options = {}) {
  const cleanQuery = typeof query === 'string' ? query.trim() : '';

  if (!cleanQuery) {
    renderError('Please provide a procurement requirement or technical specification to analyze.');
    return null;
  }

  // Save for refresh
  if (typeof window !== 'undefined') {
    window.lastQueryText = cleanQuery;
  }

  renderLoading('Analyzing procurement requirement & identifying standards...');

  const limit = options.limit || 5;
  const apiBase = getApiBaseUrl();
  const endpoint = `${apiBase}/api/recommendations/explain`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ query: cleanQuery, limit })
    });

    if (!res.ok) {
      let errorMsg = `Server returned status ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson && errJson.error) {
          errorMsg = errJson.error;
        }
      } catch (e) {
        // Non-JSON response
      }
      renderError(errorMsg);
      return null;
    }

    let data;
    try {
      data = await res.json();
    } catch (parseErr) {
      renderError('Received malformed response from the recommendation service.');
      return null;
    }

    if (!data || typeof data !== 'object') {
      renderError('Invalid response format received from recommendation engine.');
      return null;
    }

    if (!data.success) {
      renderError(data.error || 'Recommendation pipeline failed.');
      return null;
    }

    if (data.count === 0 || !Array.isArray(data.recommendations) || data.recommendations.length === 0) {
      renderEmpty(cleanQuery);
      return data;
    }

    renderDashboard(data, cleanQuery, options.originalQuery || cleanQuery);
    return data;

  } catch (netErr) {
    renderError('Network connection failure. Please ensure the Nirdeshak backend service is active.');
    return null;
  }
}

/**
 * Renders the full recommendations dashboard into the DOM.
 *
 * @param {Object} data Recommendation response payload from backend
 * @param {string} query Normalized query returned/used
 * @param {string} [originalQuery] Raw original query from user input
 */
export function renderDashboard(data, query, originalQuery) {
  const dashboard = document.getElementById('resultsDashboard');
  const loading = document.getElementById('dashboardLoading');
  const error = document.getElementById('dashboardError');
  const empty = document.getElementById('dashboardEmpty');
  const content = document.getElementById('dashboardContent');

  if (!dashboard || !content) return;

  if (loading) loading.style.display = 'none';
  if (error) error.style.display = 'none';
  if (empty) empty.style.display = 'none';
  dashboard.style.display = 'block';
  content.style.display = 'block';

  // Synchronize with PDF report generator
  setReportData(data, {
    originalQuery: originalQuery || query,
    query: data.query || query,
    extractedRequirements: typeof window !== 'undefined' && window.lastSubmission ? window.lastSubmission.requirements : null
  });

  const recommendations = Array.isArray(data.recommendations) ? data.recommendations : [];
  const topRec = recommendations[0] || null;
  const topRelevanceFormatted = topRec && topRec.scores ? formatScorePercent(topRec.scores.final) : 'N/A';

  // Version status overview
  let versionOverview = 'Current';
  if (topRec && topRec.versionStatus) {
    versionOverview = formatStatusLabel(topRec.versionStatus.statusValue, topRec.versionStatus.statusCategory);
  }

  // Certification overview
  let certOverview = 'Not Available';
  if (topRec && topRec.certification && topRec.certification.hasCertificationInfo) {
    certOverview = topRec.certification.requirementExplicit
      ? 'Mandatory Requirement Noted'
      : 'Information Available';
  }

  const queryUsed = data.query || query || '';
  const originalInput = originalQuery || queryUsed;
  const hasDistinctNormalized = originalInput.trim() !== queryUsed.trim();

  let html = '';

  // 1. Search / Query Summary Card
  html += `
    <div class="dashboard-query-card" role="region" aria-label="Query Summary">
      <div class="dashboard-query-card__header">
        <span class="dashboard-query-card__tag">Procurement Requirement</span>
        <span class="dashboard-query-card__status">&#10003; Processed</span>
      </div>
      <div class="dashboard-query-card__body">
        <div class="query-row">
          <span class="query-row__label">Original Requirement:</span>
          <span class="query-row__text" id="dashboardOriginalRequirement">${escapeHtml(originalInput)}</span>
        </div>
        ${data.multilingual && data.multilingual.isMultilingual ? `
        <div class="query-row">
          <span class="query-row__label">Detected Language:</span>
          <span class="query-row__text" style="color: #0369a1; font-weight: 700;">${escapeHtml(data.multilingual.languageName)}</span>
        </div>
        <div class="query-row query-row--normalized">
          <span class="query-row__label">Normalized Analysis Target:</span>
          <span class="query-row__text" id="dashboardNormalizedRequirement">${escapeHtml(data.multilingual.normalizedQuery)}</span>
        </div>
        ` : (hasDistinctNormalized ? `
        <div class="query-row query-row--normalized">
          <span class="query-row__label">Normalized Search Target:</span>
          <span class="query-row__text" id="dashboardNormalizedRequirement">${escapeHtml(queryUsed)}</span>
        </div>
        ` : '')}
      </div>
    </div>
  `;

  // 2. Result Summary Banner
  html += `
    <div class="dashboard-summary-bar" role="region" aria-label="Results Summary">
      <div class="summary-metric">
        <span class="summary-metric__label">Standards Found</span>
        <span class="summary-metric__value" id="summaryMetricCount">${data.count}</span>
      </div>
      <div class="summary-metric">
        <span class="summary-metric__label">Top Relevance</span>
        <span class="summary-metric__value summary-metric__value--highlight" id="summaryMetricRelevance">${topRelevanceFormatted}</span>
      </div>
      <div class="summary-metric">
        <span class="summary-metric__label">Database Version Status</span>
        <span class="summary-metric__value" id="summaryMetricVersion">${escapeHtml(versionOverview)}</span>
      </div>
      <div class="summary-metric">
        <span class="summary-metric__label">Certification Status</span>
        <span class="summary-metric__value" id="summaryMetricCertification">${escapeHtml(certOverview)}</span>
      </div>
    </div>
  `;

  currentRecommendations = recommendations;
  currentSelectedRank = 1;
  const selectedRec = recommendations[0] || null;

  // 3. Recommended Standards Section
  html += `
    <div class="recommendations-container" role="region" aria-label="Recommended Standards">
      <div class="recommendations-container__header">
        <h4 class="recommendations-container__title">Recommended Indian Standards</h4>
        <span class="recommendations-container__count">Showing ${recommendations.length} matched standard${recommendations.length === 1 ? '' : 's'}</span>
      </div>
      <div class="recommendations-list" id="recommendationsCardsList">
        ${renderRecommendationCardsList(recommendations, currentSelectedRank)}
      </div>
    </div>

    <!-- Detailed Standard Information Panel for Selected Standard -->
    <div id="standardDetailContainer" class="standard-detail-container">
      ${renderStandardDetailPanel(selectedRec, recommendations, currentSelectedRank)}
    </div>
  `;

  // 4. Global AI Summary & Limitations Box
  const filteredLimitations = (data.limitations || []).filter(l => !l.includes('prototype demonstration') && !l.includes('curated standards record'));
  if (data.summary || filteredLimitations.length > 0) {
    html += `
      <div class="dashboard-analysis-summary" role="region" aria-label="Recommendation Summary">
        <h5 class="dashboard-analysis-summary__title">Procurement Intelligence Summary</h5>
        ${data.summary ? `<p class="dashboard-analysis-summary__text">${escapeHtml(data.summary)}</p>` : ''}
        ${filteredLimitations.length > 0 ? `
          <div class="dashboard-analysis-summary__limitations">
            <span class="limitations-label">Notice on Limitations:</span>
            <ul>
              ${filteredLimitations.map(l => `<li>${escapeHtml(l)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  }

  // 5. Official Regulatory Advisory Box
  html += `
    <div class="dashboard-advisory-box" role="note">
      <div class="dashboard-advisory-box__header">
        <span class="dashboard-advisory-box__icon" aria-hidden="true">&#9432;</span>
        <span class="dashboard-advisory-box__title">Regulatory &amp; Legal Notice</span>
      </div>
      <p class="dashboard-advisory-box__text">
        Nirdeshak provides algorithmic and AI-assisted recommendations based on database records to expedite Indian Standards discovery.
        Final procurement specifications and regulatory compliance must be verified against current official publications and Quality Control Orders (QCOs) issued by the Bureau of Indian Standards (BIS) and relevant Ministries.
      </p>
    </div>
  `;

  content.innerHTML = html;

  // Bind expandable detail toggles with keyboard navigation
  bindDetailToggles(content);
  bindCardSelectionEvents(content);
  bindDetailTabEvents(content);

  // Smooth scroll to dashboard
  dashboard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Updates the currently active recommended standard in the detailed analysis panel.
 *
 * @param {number|string} rank
 */
export function updateSelectedStandard(rank) {
  const targetRank = parseInt(rank, 10);
  if (isNaN(targetRank)) return;
  currentSelectedRank = targetRank;

  const selectedRec = currentRecommendations.find(r => (r.rank || (r.scores && r.scores.rank)) === targetRank) || currentRecommendations[0];

  const cardsListEl = document.getElementById('recommendationsCardsList');
  if (cardsListEl) {
    cardsListEl.innerHTML = renderRecommendationCardsList(currentRecommendations, currentSelectedRank);
    bindCardSelectionEvents(cardsListEl);
    bindDetailToggles(cardsListEl);
  }

  const detailContainerEl = document.getElementById('standardDetailContainer');
  if (detailContainerEl && selectedRec) {
    detailContainerEl.innerHTML = renderStandardDetailPanel(selectedRec, currentRecommendations, currentSelectedRank);
    bindDetailTabEvents(detailContainerEl);
  }
}

/**
 * Binds click events on recommendation card selection buttons.
 */
function bindCardSelectionEvents(container) {
  const selectBtns = container.querySelectorAll('.btn-select-analysis');
  selectBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const rank = btn.getAttribute('data-rank');
      if (rank) {
        updateSelectedStandard(rank);
      }
    });
  });
}

/**
 * Binds click events on standard detail switcher tabs.
 */
function bindDetailTabEvents(container) {
  const tabBtns = container.querySelectorAll('.detail-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const rank = btn.getAttribute('data-rank');
      if (rank) {
        updateSelectedStandard(rank);
      }
    });
  });
}

/**
 * Binds toggle click and keyboard events to detail accordion buttons.
 */
function bindDetailToggles(container) {
  const toggleButtons = container.querySelectorAll('.btn-toggle-details');
  toggleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const detailsEl = document.getElementById(targetId);
      if (!detailsEl) return;

      const isExpanded = btn.getAttribute('aria-expanded') === 'true';
      const newExpanded = !isExpanded;

      btn.setAttribute('aria-expanded', String(newExpanded));
      detailsEl.style.display = newExpanded ? 'block' : 'none';

      const textEl = btn.querySelector('.btn-toggle-details__text');
      const iconEl = btn.querySelector('.btn-toggle-details__icon');

      if (textEl) {
        textEl.textContent = newExpanded ? 'Hide Detailed Breakdown' : 'View Detailed Breakdown & Explanation';
      }
      if (iconEl) {
        iconEl.innerHTML = newExpanded ? '&#9650;' : '&#9660;';
      }
    });

    // Support keyboard Enter and Space keys
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        btn.click();
      }
    });
  });
}
