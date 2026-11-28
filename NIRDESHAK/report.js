// =========================================================
// Nirdeshak - PDF Report Generation UI Module
// Step 13: Dedicated Frontend Report Controller
//
// Responsibilities:
// - PDF report request orchestration
// - Payload preparation from existing recommendation data
// - Loading & disabled state management
// - Blob download handling via Content-Disposition filename
// - Validation of report response (content-type, binary integrity)
// - Accessible, human-friendly error and success notifications
// =========================================================

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

// Active report data cache
let activeReportPayload = null;

/**
 * Updates the cached recommendation data for report generation.
 *
 * @param {Object} data Recommendation response from POST /api/recommendations/explain
 * @param {Object} [meta] Additional contextual metadata (e.g. originalQuery, extractedRequirements)
 */
export function setReportData(data, meta = {}) {
  if (!data || typeof data !== 'object') {
    activeReportPayload = null;
    return;
  }

  activeReportPayload = {
    query: data.query || meta.originalQuery || '',
    originalQuery: meta.originalQuery || data.query || '',
    recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
    count: typeof data.count === 'number' ? data.count : (data.recommendations ? data.recommendations.length : 0),
    summary: data.summary || '',
    limitations: Array.isArray(data.limitations) ? data.limitations : [],
    explanationGenerated: !!data.explanationGenerated,
    extractedRequirements: meta.extractedRequirements || data.extractedRequirements || null,
    multilingual: data.multilingual || meta.multilingual || null,
    isCuratedDemo: !!(data.isCuratedDemo || meta.isCuratedDemo || (data.recommendations && data.recommendations[0] && (data.recommendations[0].is_number === 'IS 2925:1984' || data.recommendations[0].isCuratedDemo))),
    generatedAt: new Date().toISOString()
  };
}

/**
 * Retrieves the currently cached report data.
 *
 * @returns {Object|null}
 */
export function getReportData() {
  return activeReportPayload;
}

/**
 * Updates the Download Report button state in the UI.
 *
 * @param {boolean} isLoading
 * @param {string} [customText]
 */
export function setReportLoadingState(isLoading, customText) {
  const btn = document.getElementById('downloadPdfReportBtn');
  const textEl = document.getElementById('downloadPdfBtnText');

  if (btn) {
    btn.disabled = isLoading;
    if (isLoading) {
      btn.classList.add('btn-primary--loading');
      btn.setAttribute('aria-busy', 'true');
    } else {
      btn.classList.remove('btn-primary--loading');
      btn.removeAttribute('aria-busy');
    }
  }

  if (textEl) {
    textEl.textContent = customText || (isLoading ? 'Preparing procurement report...' : 'Download PDF Report');
  }
}

/**
 * Displays a temporary status or error notification for report generation.
 *
 * @param {string} message
 * @param {'success'|'error'|'info'} [type='info']
 */
export function showReportStatusMessage(message, type = 'info') {
  let statusEl = document.getElementById('reportStatusMessage');
  if (!statusEl) {
    const actions = document.querySelector('.dashboard-header__actions');
    if (actions) {
      statusEl = document.createElement('div');
      statusEl.id = 'reportStatusMessage';
      statusEl.className = 'report-status-message';
      statusEl.setAttribute('role', 'status');
      statusEl.setAttribute('aria-live', 'polite');
      actions.parentNode.insertBefore(statusEl, actions.nextSibling);
    }
  }

  if (!statusEl) return;

  statusEl.className = `report-status-message report-status-message--${type}`;
  statusEl.textContent = message;
  statusEl.style.display = 'block';

  // Automatically hide after 4 seconds
  setTimeout(() => {
    if (statusEl) {
      statusEl.style.display = 'none';
    }
  }, 4000);
}

/**
 * Extracts the filename from a Content-Disposition header.
 *
 * @param {string|null} header
 * @returns {string} Sanitized filename
 */
export function extractFilenameFromHeader(header) {
  if (!header) return 'nirdeshak-procurement-report.pdf';
  const match = header.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return 'nirdeshak-procurement-report.pdf';
}

/**
 * Requests the PDF report from POST /api/reports/pdf and initiates download.
 *
 * @param {Object} [overridePayload] Optional custom payload for programmatic/test invocation
 * @returns {Promise<boolean>} Success indicator
 */
export async function downloadPdfReport(overridePayload) {
  const payload = overridePayload || activeReportPayload;

  if (!payload || !payload.query) {
    showReportStatusMessage('Please perform an analysis before generating the procurement report.', 'error');
    return false;
  }

  setReportLoadingState(true, 'Preparing procurement report...');

  try {
    const apiBase = getApiBaseUrl();
    const endpoint = `${apiBase}/api/reports/pdf`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/pdf, application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      let errorMsg = `Server error (${res.status})`;
      try {
        const errJson = await res.json();
        if (errJson && errJson.error) {
          errorMsg = errJson.error;
        }
      } catch (e) {}

      showReportStatusMessage(`PDF generation failed: ${errorMsg}`, 'error');
      setReportLoadingState(false);
      return false;
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/pdf')) {
      showReportStatusMessage('Server returned an unexpected document format.', 'error');
      setReportLoadingState(false);
      return false;
    }

    const blob = await res.blob();
    if (!blob || blob.size === 0) {
      showReportStatusMessage('Generated PDF report is empty.', 'error');
      setReportLoadingState(false);
      return false;
    }

    const disposition = res.headers.get('content-disposition');
    const filename = extractFilenameFromHeader(disposition);

    // Trigger browser download via object URL
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    }, 200);

    setReportLoadingState(false);
    showReportStatusMessage('Procurement report downloaded successfully.', 'success');
    return true;

  } catch (netErr) {
    showReportStatusMessage('Network connection error while downloading report.', 'error');
    setReportLoadingState(false);
    return false;
  }
}

/**
 * Initializes the report button listener.
 */
export function initReportUI() {
  const downloadBtn = document.getElementById('downloadPdfReportBtn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      downloadPdfReport();
    });

    downloadBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        downloadPdfReport();
      }
    });
  }

  // Register on window object for testing and global orchestration
  if (typeof window !== 'undefined') {
    window.NirdeshakReport = {
      setReportData,
      getReportData,
      downloadPdfReport,
      setReportLoadingState,
      showReportStatusMessage,
      extractFilenameFromHeader
    };
  }
}

export const initPdfReport = initReportUI;
