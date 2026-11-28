// =========================================================
// Nirdeshak - Core UI Orchestrator
// Government Portal Standard Implementation
// Coordinates: Input handling (Step 1), Tender PDF processing (Step 2),
// and Structured Requirement Extraction (Step 3).
// =========================================================

import {
  initInputHandling,
  selectInputType,
  getSelectedInputType,
  getSelectedPdfFile,
  getActiveTextInput,
  validateActiveInput,
  clearActiveInput,
  showValidationError,
  clearValidationError
} from "./input.js";

import { uploadAndProcessPdf } from "./pdfProcessor.js";

import {
  extractRequirements,
  renderExtractedRequirements,
  initRequirementsEdit,
  getExtractedRequirements,
  setExtractedRequirements
} from "./requirementExtractor.js";

import {
  initDashboard,
  fetchAndRenderRecommendations,
  renderDashboard,
  renderLoading,
  renderError,
  renderEmpty,
  clearDashboard
} from "./dashboard.js";

/**
 * Shared Application UI State
 */
var state = {
  isProcessing: false,
  lastSubmission: null
};

// Cached DOM Elements
var elements = {};

/**
 * Resolves the backend API base URL.
 * When accessed directly via file:// or another origin, routes to http://localhost:3000.
 */
export function getApiBaseUrl() {
  if (typeof window !== "undefined" && window.location) {
    if (
      window.location.protocol === "file:" ||
      (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") ||
      (window.location.port !== "3000" && window.location.port !== "")
    ) {
      return "http://localhost:3000";
    }
  }
  return "";
}

/**
 * Main application initialization on DOMContentLoaded.
 */
document.addEventListener("DOMContentLoaded", function () {
  initElements();
  initInputHandling({
    onInputTypeChange: function () {
      clearValidationError();
      setProcessingState(false);
      hideConfirmation();
    },
    onFileSelected: function () {
      clearValidationError();
      setProcessingState(false);
      hideConfirmation();
    },
    onFileRemoved: function () {
      clearValidationError();
      setProcessingState(false);
      hideConfirmation();
    }
  });
  initRequirementsEdit({
    onRequirementsUpdated: function (updated) {
      if (state.lastSubmission) {
        state.lastSubmission.requirements = updated;
        window.lastSubmission = state.lastSubmission;
      }
      var newQuery = (updated && updated.product_name) || (state.lastSubmission && state.lastSubmission.text);
      if (newQuery) {
        fetchAndRenderRecommendations(newQuery, { originalQuery: state.lastSubmission ? state.lastSubmission.text : newQuery });
      }
    }
  });
  initActionButtons();
  initHeroButton();
  initDashboard();
  exposeGlobalInterface();
});

function initElements() {
  elements = {
    analyseBtn: document.getElementById("analyseBtn"),
    clearBtn: document.getElementById("clearBtn"),
    startAnalysisBtn: document.getElementById("startAnalysisBtn"),
    inputOptionsSection: document.getElementById("inputOptions"),
    processingStatus: document.getElementById("processingStatus"),
    submissionConfirmation: document.getElementById("submissionConfirmation"),
    confirmationTitle: document.getElementById("confirmationTitle"),
    submissionSummary: document.getElementById("submissionSummary"),
    extractedRequirementsSection: document.getElementById("extractedRequirementsSection"),
    pdfFileInput: document.getElementById("pdfFileInput")
  };
}

/**
 * Initializes Analyse and Clear buttons.
 */
function initActionButtons() {
  if (elements.analyseBtn) {
    elements.analyseBtn.addEventListener("click", function () {
      return handleAnalysisSubmission();
    });
  }

  if (elements.clearBtn) {
    elements.clearBtn.addEventListener("click", function () {
      return handleClearInput();
    });
  }
}

/**
 * Initializes the "Start New Analysis" hero button.
 */
function initHeroButton() {
  if (!elements.startAnalysisBtn) return;

  elements.startAnalysisBtn.addEventListener("click", function () {
    var currentHasContent = false;
    if (getSelectedInputType() === "tender-pdf") {
      currentHasContent = !!getSelectedPdfFile();
    } else {
      var activeInput = getActiveTextInput();
      currentHasContent = !!(activeInput && activeInput.value.trim());
    }

    if (currentHasContent) {
      return handleAnalysisSubmission();
    } else {
      if (elements.inputOptionsSection) {
        elements.inputOptionsSection.scrollIntoView({ behavior: "smooth" });
      }
      var inputToFocus = getActiveTextInput();
      if (inputToFocus) {
        inputToFocus.focus();
      } else if (elements.pdfFileInput) {
        elements.pdfFileInput.focus();
      }
    }
  });
}

/**
 * Updates UI processing state and button disabled flags.
 */
export function setProcessingState(isProcessing, message) {
  state.isProcessing = isProcessing;

  if (elements.processingStatus) {
    elements.processingStatus.textContent = message || "Processing request...";
    elements.processingStatus.style.display = isProcessing ? "block" : "none";
    if (isProcessing) {
      elements.processingStatus.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  if (elements.analyseBtn) {
    elements.analyseBtn.disabled = isProcessing;
    elements.analyseBtn.textContent = isProcessing ? (message || "Processing...") : "Analyse";
  }

  if (elements.startAnalysisBtn) {
    elements.startAnalysisBtn.disabled = isProcessing;
  }

  if (elements.clearBtn) {
    elements.clearBtn.disabled = isProcessing;
  }
}

/**
 * Validates active input, calls backend processing/extraction, and renders results.
 * Orchestrates: input.js -> pdfProcessor.js -> requirementExtractor.js.
 */
export async function handleAnalysisSubmission() {
  if (state.isProcessing) return null;

  clearValidationError();
  hideConfirmation();

  var validation = validateActiveInput();
  if (!validation.valid) {
    return null;
  }

  var submission = null;
  var apiBase = getApiBaseUrl();

  if (validation.inputType === "tender-pdf") {
    // 1. Process Tender PDF via pdfProcessor.js (Step 2)
    setProcessingState(true, "Processing tender document...");

    var pdfResult = await uploadAndProcessPdf(validation.file, apiBase);
    if (!pdfResult.success) {
      showValidationError(pdfResult.error);
      setProcessingState(false);
      return null;
    }

    // 2. Extract Requirements via requirementExtractor.js (Step 3)
    setProcessingState(true, "Extracting requirements from tender document...");

    var reqResult = await extractRequirements(
      pdfResult.extractedText,
      "tender-pdf",
      pdfResult.fileName,
      apiBase
    );

    if (!reqResult.success) {
      showValidationError(reqResult.error);
      setProcessingState(false);
      return null;
    }

    submission = {
      inputType: "tender-pdf",
      text: pdfResult.extractedText,
      fileName: pdfResult.fileName,
      fileSize: validation.file.size,
      file: validation.file,
      extractedText: pdfResult.extractedText,
      requirements: reqResult.requirements
    };

    setProcessingState(false);

  } else {
    // Text Inputs: Product Description, Technical Specification, Natural Language Query
    setProcessingState(true, "Extracting requirements...");

    var textReqResult = await extractRequirements(
      validation.text,
      validation.inputType,
      null,
      apiBase
    );

    if (!textReqResult.success) {
      showValidationError(textReqResult.error);
      setProcessingState(false);
      return null;
    }

    submission = {
      inputType: validation.inputType,
      text: validation.rawText,
      fileName: null,
      fileSize: null,
      file: null,
      requirements: textReqResult.requirements
    };

    setProcessingState(false);
  }

  state.lastSubmission = submission;
  window.lastSubmission = submission;
  window.nirdeshakSubmission = submission;

  // Dispatch custom DOM event
  try {
    var event = new CustomEvent("nirdeshakSubmission", { detail: submission });
    document.dispatchEvent(event);
  } catch (e) {}

  displayConfirmation(submission);

  // Trigger Step 12: Results Dashboard & Recommendation Pipeline
  var queryForDashboard = submission.text;
  if (!queryForDashboard && submission.requirements) {
    queryForDashboard = submission.requirements.product_name || submission.requirements.product_category || "";
  }
  if (queryForDashboard) {
    fetchAndRenderRecommendations(queryForDashboard, { originalQuery: submission.text || "" });
  }

  return submission;
}

/**
 * Resets active input field, cleared requirements, and hides confirmation.
 */
export function handleClearInput() {
  clearActiveInput();
  setExtractedRequirements(null);
  clearValidationError();
  setProcessingState(false);
  hideConfirmation();
  clearDashboard();
}

/**
 * Displays the confirmation card and extracted requirements table.
 */
export function displayConfirmation(submission) {
  if (!elements.submissionConfirmation || !elements.submissionSummary) return;

  var inputLabels = {
    "product-description": "Product Description",
    "technical-specification": "Technical Specification",
    "tender-pdf": "Tender Document (PDF)",
    "natural-language-query": "Natural Language Query"
  };

  if (elements.confirmationTitle) {
    if (submission.inputType === "tender-pdf") {
      elements.confirmationTitle.textContent = "Tender document processed successfully.";
    } else {
      elements.confirmationTitle.textContent = "Input received successfully.";
    }
  }

  var html = '<table class="summary-table"><tbody>';
  html += '<tr><th>Input Method</th><td>' + escapeHtml(inputLabels[submission.inputType] || submission.inputType) + '</td></tr>';

  if (submission.inputType === "tender-pdf") {
    html += '<tr><th>File Name</th><td>' + escapeHtml(submission.fileName || "") + '</td></tr>';
    html += '<tr><th>File Size</th><td>' + escapeHtml(formatFileSize(submission.fileSize || 0)) + ' (' + (submission.fileSize || 0).toLocaleString() + ' bytes)</td></tr>';
    var textLength = submission.extractedText ? submission.extractedText.length : 0;
    var wordsCount = countWords(submission.extractedText || "");
    html += '<tr><th>Extracted Content</th><td>' + textLength.toLocaleString() + ' characters | ' + wordsCount.toLocaleString() + ' words</td></tr>';
    html += '<tr><th>Status</th><td>Tender document processed & requirements structured</td></tr>';
    html += '</tbody></table>';

    // Extracted Text Preview Box
    html += '<div class="extracted-preview-box">';
    html += '  <div class="extracted-preview-header">';
    html += '    <span class="extracted-preview-title">Extracted Document Content</span>';
    html += '    <button type="button" class="btn-copy" id="copyExtractedBtn" title="Copy extracted text to clipboard">Copy Text</button>';
    html += '  </div>';
    html += '  <div class="extracted-preview-body" id="extractedPreviewText" tabindex="0">' + escapeHtml(submission.extractedText || "") + '</div>';
    html += '</div>';

  } else {
    html += '<tr><th>Content Preview</th><td>' + escapeHtml(submission.text) + '</td></tr>';
    html += '<tr><th>Input Metrics</th><td>' + submission.text.length + ' characters | ' + countWords(submission.text) + ' words</td></tr>';
    html += '<tr><th>Status</th><td>Text verified & requirements structured successfully</td></tr>';
    html += '</tbody></table>';
  }

  elements.submissionSummary.innerHTML = html;
  elements.submissionConfirmation.style.display = "block";

  // Setup Copy Text button if present
  var copyBtn = document.getElementById("copyExtractedBtn");
  if (copyBtn && submission.extractedText) {
    copyBtn.addEventListener("click", function () {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(submission.extractedText).then(function () {
          copyBtn.textContent = "Copied!";
          setTimeout(function () {
            copyBtn.textContent = "Copy Text";
          }, 2000);
        }).catch(function () {
          copyBtn.textContent = "Failed to copy";
        });
      }
    });
  }

  // Render Extracted Requirements Section
  if (submission.requirements) {
    renderExtractedRequirements(submission.requirements);
  } else if (elements.extractedRequirementsSection) {
    elements.extractedRequirementsSection.style.display = "none";
  }

  elements.submissionConfirmation.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/**
 * Hides confirmation card and requirements section.
 */
export function hideConfirmation() {
  if (elements.submissionConfirmation) {
    elements.submissionConfirmation.style.display = "none";
  }
  var reqSection = elements.extractedRequirementsSection || document.getElementById("extractedRequirementsSection");
  if (reqSection) {
    reqSection.style.display = "none";
  }
  clearDashboard();
}

/**
 * Formats byte size into human readable string.
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "0 Bytes";
  var k = 1024;
  var sizes = ["Bytes", "KB", "MB", "GB"];
  var i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Counts words in a string.
 */
export function countWords(str) {
  var trimmed = str ? str.trim() : "";
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Escapes HTML characters for safe rendering.
 */
export function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Exposes backwards-compatible global interface on window.Nirdeshak.
 */
function exposeGlobalInterface() {
  window.Nirdeshak = {
    selectInputType: selectInputType,
    submit: handleAnalysisSubmission,
    clear: handleClearInput,
    getState: function () {
      return {
        selectedInputType: getSelectedInputType(),
        selectedPdfFile: getSelectedPdfFile(),
        lastSubmission: state.lastSubmission,
        extractedRequirements: getExtractedRequirements(),
        isProcessing: state.isProcessing
      };
    },
    getLastSubmission: function () {
      return state.lastSubmission;
    },
    getExtractedRequirements: getExtractedRequirements,
    updateRequirements: function (newReqs) {
      setExtractedRequirements(newReqs);
      renderExtractedRequirements(newReqs);
    },
    fetchAndRenderRecommendations: fetchAndRenderRecommendations,
    clearDashboard: clearDashboard
  };
}
