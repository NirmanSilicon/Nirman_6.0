// =========================================================
// Nirdeshak - Page 4: Requirement Review Controller
// Handles displaying structured technical parameters, editing,
// and transitioning to standards analysis.
// =========================================================

import {
  renderExtractedRequirements,
  initRequirementsEdit,
  getExtractedRequirements,
  setExtractedRequirements
} from './requirementExtractor.js';

import { getState, setState } from './state.js';

document.addEventListener('DOMContentLoaded', () => {
  initRequirementReview();
});

function initRequirementReview() {
  const state = getState();
  const viewContainer = document.getElementById('requirementsViewMode');
  const continueBtn = document.getElementById('continueToAnalysisBtn');
  const copyBtn = document.getElementById('copyRequirementsJsonBtn');

  if (!state || (!state.extractedRequirements && !state.editedRequirements)) {
    if (viewContainer) {
      viewContainer.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--color-text-muted);">
          <p>No requirement specifications found in this session.</p>
          <a href="analysis.html" class="btn-primary" style="margin-top: 16px; display: inline-block; text-decoration: none;">&larr; Start New Analysis</a>
        </div>
      `;
    }
    if (continueBtn) continueBtn.disabled = true;
    return;
  }

  const activeReq = state.editedRequirements || state.extractedRequirements;
  setExtractedRequirements(activeReq);

  // Render view table
  if (viewContainer) {
    renderExtractedRequirements(activeReq, viewContainer);
  }

  // Initialize edit mode handlers
  initRequirementsEdit({
    onRequirementsUpdated: (updated) => {
      setState({
        editedRequirements: updated
      });
      // Re-render view mode with latest data
      if (viewContainer) {
        renderExtractedRequirements(updated, viewContainer);
      }
    }
  });

  // Copy JSON handler
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const current = getExtractedRequirements() || activeReq;
      const json = JSON.stringify(current, null, 2);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(json).then(() => {
          const originalText = copyBtn.textContent;
          copyBtn.textContent = 'Copied!';
          setTimeout(() => {
            copyBtn.textContent = originalText;
          }, 1500);
        }).catch(() => fallbackCopy(json, copyBtn));
      } else {
        fallbackCopy(json, copyBtn);
      }
    });
  }

  // Continue to Analysis
  if (continueBtn) {
    continueBtn.addEventListener('click', () => {
      const finalReq = getExtractedRequirements() || activeReq;
      setState({
        editedRequirements: finalReq
      });
      window.location.href = 'analyzing.html';
    });
  }
}

function fallbackCopy(text, btn) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => {
      btn.textContent = originalText;
    }, 1500);
  } catch (e) {
    console.warn('Copy command failed:', e);
  }
  document.body.removeChild(textarea);
}
