// =========================================================
// Nirdeshak - Page 1: Landing Page Controller
// =========================================================

import { clearState } from './state.js';

document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('startAnalysisBtn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      clearState();
    });
  }
});
