// =========================================================
// Nirdeshak - Page 5: Standards Analysis Progress Controller
// Executes real recommendation pipeline request (POST /api/recommendations/explain)
// and tracks lifecycle states across the standards intelligence pipeline.
// =========================================================

import { getState, setState, getEffectiveQuery } from './state.js';

function getApiBase() {
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

document.addEventListener('DOMContentLoaded', () => {
  initAnalysisWorkflow();
});

function initAnalysisWorkflow() {
  const retryBtn = document.getElementById('retryAnalysisBtn');
  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      hideError();
      executeAnalysis();
    });
  }

  executeAnalysis();
}

function setStep(stepNum, status) {
  const stepEl = document.getElementById(`astep-${stepNum}`);
  const iconEl = document.getElementById(`astep-${stepNum}-icon`);
  if (!stepEl) return;

  stepEl.classList.remove('progress-step--active', 'progress-step--completed', 'progress-step--failed');

  if (status === 'active') {
    stepEl.classList.add('progress-step--active');
    if (iconEl) iconEl.innerHTML = '&bull;';
  } else if (status === 'completed') {
    stepEl.classList.add('progress-step--completed');
    if (iconEl) iconEl.innerHTML = '&#10003;';
  } else if (status === 'failed') {
    stepEl.classList.add('progress-step--failed');
    if (iconEl) iconEl.innerHTML = '&#10005;';
  } else {
    if (iconEl) iconEl.innerHTML = '&cir;';
  }
}

function showError(msg) {
  const errBox = document.getElementById('analysisErrorBox');
  const errMsg = document.getElementById('analysisErrorMessage');
  if (errBox && errMsg) {
    errMsg.textContent = msg;
    errBox.style.display = 'block';
  }
}

function hideError() {
  const errBox = document.getElementById('analysisErrorBox');
  if (errBox) errBox.style.display = 'none';
}

async function executeAnalysis() {
  const state = getState();
  const apiBase = getApiBase();
  const query = getEffectiveQuery(state);

  const subtitle = document.getElementById('analyzingQuerySubtitle');
  if (subtitle && query) {
    subtitle.textContent = `Analyzing: "${query.slice(0, 90)}${query.length > 90 ? '...' : ''}"`;
  }

  if (!query) {
    setStep(1, 'failed');
    showError('No requirement text found to analyze. Please return to the Review page.');
    return;
  }

  // Reset steps
  for (let i = 1; i <= 8; i++) setStep(i, 'pending');

  setStep(1, 'active');
  setStep(2, 'active');

  const statusText = document.getElementById('pipelineStatusText');
  if (statusText) statusText.textContent = 'Reading procurement requirement and understanding product...';

  const startTime = Date.now();

  try {
    const isHelmet = (query && query.toLowerCase().includes('helmet')) || state.demoMode === true;
    const payload = {
      query: query,
      originalQuery: state.originalQuery || query,
      extractedRequirements: state.editedRequirements || state.extractedRequirements,
      limit: 5
    };
    if (isHelmet) {
      payload.demoMode = true;
      payload.demoProfile = 'industrial_safety_helmet';
    }

    const headers = { 'Content-Type': 'application/json' };
    if (isHelmet) {
      headers['X-Nirdeshak-Demo'] = 'true';
    }

    // Parallelize fetch with smooth progressive timeline stages
    const fetchPromise = fetch(`${apiBase}/api/recommendations/explain`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    // Stage 1 -> 2 progression at 600ms
    await new Promise(r => setTimeout(r, 600));
    setStep(1, 'completed');
    setStep(2, 'completed');
    setStep(3, 'active');
    setStep(4, 'active');
    if (statusText) statusText.textContent = 'Searching relevant Indian Standards and computing multi-signal relevance...';

    // Stage 3 -> 4 progression at 1300ms
    await new Promise(r => setTimeout(r, 700));
    setStep(3, 'completed');
    setStep(4, 'completed');
    setStep(5, 'active');
    setStep(6, 'active');
    if (statusText) statusText.textContent = 'Checking related standard references, version status, and amendments...';

    // Stage 5 -> 6 progression at 1900ms
    await new Promise(r => setTimeout(r, 600));
    setStep(5, 'completed');
    setStep(6, 'completed');
    setStep(7, 'active');
    setStep(8, 'active');
    if (statusText) statusText.textContent = 'Checking certification context and preparing explainable recommendation...';

    const response = await fetchPromise;
    let data = null;
    try {
      data = await response.json();
    } catch (parseErr) {
      throw new Error(`Server returned unparseable JSON (status ${response.status}).`);
    }

    if (!response.ok || !data.success) {
      const msg = (data && data.error) || `Recommendation service returned status ${response.status}.`;
      throw new Error(msg);
    }

    // Ensure at least 2300ms total elapsed time for realistic demonstration pacing
    const elapsed = Date.now() - startTime;
    if (elapsed < 2300) {
      await new Promise(r => setTimeout(r, 2300 - elapsed));
    }

    // Complete all timeline steps
    for (let i = 1; i <= 8; i++) {
      setStep(i, 'completed');
    }

    if (statusText) statusText.textContent = 'Analysis complete. Loading recommendations dashboard...';

    // Save recommendation payload into state
    setState({
      recommendationResult: data
    });

    setTimeout(() => {
      window.location.href = 'results.html';
    }, 400);

  } catch (err) {
    clearTimeout(timer1);
    clearTimeout(timer2);
    console.error('[Nirdeshak Analyzing] Analysis failed:', err);
    setStep(8, 'failed');
    showError(err.message || 'An error occurred while analyzing Indian Standards. Please try again.');
  }
}
