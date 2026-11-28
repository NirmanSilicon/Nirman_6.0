// =========================================================
// Nirdeshak - Page 3: Document & Requirement Processing Controller
// Handles Tender PDF upload/extraction and structured requirement extraction.
// =========================================================

import { uploadAndProcessPdf } from './pdfProcessor.js';
import { extractRequirements } from './requirementExtractor.js';
import { getState, setState, dataUrlToFile } from './state.js';

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
  executeProcessing();
});

function setStepState(stepNumber, status, titleText, descText) {
  const stepEl = document.getElementById(`pstep-${stepNumber}`);
  const iconEl = document.getElementById(`pstep-${stepNumber}-icon`) || (stepEl ? stepEl.querySelector('.progress-step__icon') : null);
  const titleEl = document.getElementById(`pstep-${stepNumber}-title`);
  const descEl = document.getElementById(`pstep-${stepNumber}-desc`);

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

  if (titleText && titleEl) titleEl.textContent = titleText;
  if (descText && descEl) descEl.textContent = descText;
}

function showError(message) {
  const errorBox = document.getElementById('processingErrorBox');
  const errorMsg = document.getElementById('processingErrorMessage');
  if (errorBox && errorMsg) {
    errorMsg.textContent = message;
    errorBox.style.display = 'block';
  }
}

async function executeProcessing() {
  const state = getState();
  const apiBase = getApiBase();

  if (!state || (!state.originalQuery && !state.tenderFileMetadata)) {
    setStepState(1, 'failed', 'No Active Requirement', 'No input found in session.');
    showError('No active procurement requirement found. Please return to the Input page.');
    return;
  }

  try {
    if (state.inputMode === 'tender-pdf' && state.tenderFileMetadata) {
      // 1. File Received
      setStepState(1, 'completed', 'Tender Document Received', `File: ${state.tenderFileMetadata.name} (${Math.round((state.tenderFileMetadata.size || 0) / 1024)} KB)`);

      // 2. Process PDF via pdfProcessor.js
      setStepState(2, 'active', 'Extracting Text from Tender PDF', 'Uploading document and extracting readable specifications...');
      
      const file = dataUrlToFile(state.tenderFileMetadata.dataUrl, state.tenderFileMetadata.name);
      if (!file) {
        throw new Error('Unable to reconstruct file from session data.');
      }

      const pdfResult = await uploadAndProcessPdf(file, apiBase);
      if (!pdfResult.success) {
        setStepState(2, 'failed', 'Document Processing Failed', pdfResult.error);
        showError(pdfResult.error || 'Failed to extract text from the uploaded PDF.');
        return;
      }

      setStepState(2, 'completed', 'Document Processed', `Extracted ${pdfResult.extractedText.length} characters of document text.`);

      // 3. Extract Requirements via requirementExtractor.js
      setStepState(3, 'active', 'Extracting Requirements', 'Analyzing document content to identify technical parameters and ratings...');

      const reqResult = await extractRequirements(
        pdfResult.extractedText,
        'tender-pdf',
        pdfResult.fileName,
        apiBase
      );

      if (!reqResult.success) {
        setStepState(3, 'failed', 'Requirement Extraction Failed', reqResult.error);
        showError(reqResult.error || 'Failed to structure requirements from the document.');
        return;
      }

      setStepState(3, 'completed', 'Requirements Structured', `Identified product: "${reqResult.requirements.product_name || 'Standard specification'}"`);

      // 4. Preparing Review
      setStepState(4, 'completed', 'Ready for Review', 'Directing to requirement verification...');

      setState({
        extractedRequirements: reqResult.requirements,
        tenderFileMetadata: Object.assign({}, state.tenderFileMetadata, { extractedText: pdfResult.extractedText })
      });

      setTimeout(() => {
        window.location.href = 'requirements.html';
      }, 500);

    } else {
      // Text Input (Product Description, Technical Specification, Natural Language Query)
      setStepState(1, 'active', 'Reading procurement requirement...', 'Parsing submitted specification text...');
      await new Promise(r => setTimeout(r, 600));

      setStepState(1, 'completed', 'Requirement Received', `Mode: ${state.inputMode || 'text'}`);
      setStepState(2, 'active', 'Understanding product and application...', 'Analyzing domain and operational environment...');
      await new Promise(r => setTimeout(r, 700));

      setStepState(2, 'completed', 'Input Normalized', 'Prepared procurement requirement for parameter extraction.');
      setStepState(3, 'active', 'Identifying technical requirements...', 'Extracting technical parameters, safety requirements, and test criteria...');

      const reqResult = await extractRequirements(
        state.originalQuery,
        state.inputMode,
        null,
        apiBase
      );

      await new Promise(r => setTimeout(r, 800));

      if (!reqResult.success) {
        setStepState(3, 'failed', 'Requirement Extraction Failed', reqResult.error);
        showError(reqResult.error || 'Failed to extract structured requirements.');
        return;
      }

      setStepState(3, 'completed', 'Requirements Structured', `Identified product: "${reqResult.requirements.product_name || 'Procurement requirement'}"`);

      // 4. Preparing Review
      setStepState(4, 'completed', 'Ready for Review', 'Directing to requirement verification...');

      setState({
        extractedRequirements: reqResult.requirements
      });

      setTimeout(() => {
        window.location.href = 'requirements.html';
      }, 400);
    }

  } catch (err) {
    console.error('[Nirdeshak Processing] Unexpected processing error:', err);
    showError(err.message || 'An unexpected error occurred during requirement processing.');
  }
}
