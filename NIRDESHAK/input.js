// =========================================================
// Nirdeshak - Step 1: Input Handling Module
// Government Portal Standard Implementation
// Handles: Selection of 4 input methods, validation,
// file selection/removal, active input retrieval & clearing.
// =========================================================

import { formatFileSize } from "./script.js";

/**
 * Internal Input Module State
 */
var inputState = {
  selectedInputType: "product-description",
  selectedPdfFile: null
};

// Cached DOM Elements
var elements = {};

/**
 * Initializes elements and event listeners for Step 1 Input Handling.
 * @param {Object} options Callbacks for coordinating with parent UI.
 */
export function initInputHandling(options) {
  options = options || {};

  elements = {
    optionCards: document.querySelectorAll(".option-card"),
    inputPanes: {
      "product-description": document.getElementById("pane-product-description"),
      "technical-specification": document.getElementById("pane-technical-specification"),
      "tender-pdf": document.getElementById("pane-tender-pdf"),
      "natural-language-query": document.getElementById("pane-natural-language-query")
    },
    productDescInput: document.getElementById("inputProductDescription"),
    techSpecInput: document.getElementById("inputTechnicalSpecification"),
    nlQueryInput: document.getElementById("inputNaturalLanguage"),
    pdfFileInput: document.getElementById("pdfFileInput"),
    fileSelectedBox: document.getElementById("fileSelectedBox"),
    selectedFileName: document.getElementById("selectedFileName"),
    selectedFileSize: document.getElementById("selectedFileSize"),
    removeFileBtn: document.getElementById("removeFileBtn"),
    validationError: document.getElementById("validationError")
  };

  // 1. Setup Input Card Selection Listeners
  if (elements.optionCards) {
    elements.optionCards.forEach(function (card) {
      card.addEventListener("click", function () {
        var optionKey = card.getAttribute("data-option");
        if (optionKey === "tender-document") {
          optionKey = "tender-pdf";
        }
        selectInputType(optionKey);
        if (typeof options.onInputTypeChange === "function") {
          options.onInputTypeChange(optionKey);
        }
      });
    });
  }

  // 2. Setup PDF File Upload Listener
  if (elements.pdfFileInput) {
    elements.pdfFileInput.addEventListener("change", function () {
      var file = elements.pdfFileInput.files && elements.pdfFileInput.files[0];
      if (!file) return;

      var isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

      if (!isPdf) {
        showValidationError("Selected file is not a PDF. Please upload a valid PDF document (.pdf).");
        elements.pdfFileInput.value = "";
        inputState.selectedPdfFile = null;
        if (elements.fileSelectedBox) elements.fileSelectedBox.style.display = "none";
        if (typeof options.onValidationError === "function") {
          options.onValidationError("Selected file is not a PDF.");
        }
        return;
      }

      // Valid PDF file selected
      clearValidationError();
      inputState.selectedPdfFile = file;

      if (elements.selectedFileName) {
        elements.selectedFileName.textContent = file.name;
      }
      if (elements.selectedFileSize) {
        elements.selectedFileSize.textContent = formatFileSize(file.size);
      }
      if (elements.fileSelectedBox) {
        elements.fileSelectedBox.style.display = "flex";
      }

      if (typeof options.onFileSelected === "function") {
        options.onFileSelected(file);
      }
    });
  }

  // 3. Setup Product Autocomplete on Product Description Input
  if (elements.productDescInput) {
    var datalist = document.getElementById("productSuggestionsList");
    if (!datalist) {
      datalist = document.createElement("datalist");
      datalist.id = "productSuggestionsList";
      document.body.appendChild(datalist);
    }
    elements.productDescInput.setAttribute("list", "productSuggestionsList");

    var suggestDebounce = null;
    elements.productDescInput.addEventListener("input", function () {
      var val = elements.productDescInput.value.trim();
      clearTimeout(suggestDebounce);
      if (val.length < 3) return;

      suggestDebounce = setTimeout(async function () {
        try {
          var apiBase = (typeof window !== "undefined" && window.location && window.location.port !== "3000" && window.location.hostname !== "localhost") ? "http://localhost:3000" : "";
          var res = await fetch(apiBase + "/api/products/suggest?q=" + encodeURIComponent(val) + "&limit=6");
          if (res.ok) {
            var data = await res.json();
            if (data.success && Array.isArray(data.suggestions)) {
              datalist.innerHTML = "";
              data.suggestions.forEach(function (s) {
                var opt = document.createElement("option");
                opt.value = s.canonicalName;
                opt.label = s.divisionCouncil + (s.categoryName ? " - " + s.categoryName : "");
                datalist.appendChild(opt);
              });
            }
          }
        } catch (e) {
          // Graceful non-blocking suggestion failure
        }
      }, 250);
    });
  }

  // 3. Setup Remove File Button Listener
  if (elements.removeFileBtn) {
    elements.removeFileBtn.addEventListener("click", function () {
      removeSelectedPdfFile();
      if (typeof options.onFileRemoved === "function") {
        options.onFileRemoved();
      }
    });
  }

  // 4. Setup Input typing listeners to auto-clear validation errors
  var textInputs = [elements.productDescInput, elements.techSpecInput, elements.nlQueryInput];
  textInputs.forEach(function (input) {
    if (input) {
      input.addEventListener("input", function () {
        if (elements.validationError && elements.validationError.style.display !== "none") {
          clearValidationError();
        }
      });
    }
  });
}

/**
 * Switches the active input type and updates DOM panes & card attributes.
 * @param {string} inputType Option identifier ('product-description', etc.)
 */
export function selectInputType(inputType) {
  if (!elements.inputPanes || !elements.inputPanes[inputType]) return;

  inputState.selectedInputType = inputType;

  // Update option card button states
  if (elements.optionCards) {
    elements.optionCards.forEach(function (card) {
      var cardOption = card.getAttribute("data-option");
      if (cardOption === "tender-document") cardOption = "tender-pdf";
      var isSelected = cardOption === inputType;
      card.setAttribute("aria-pressed", isSelected ? "true" : "false");
      card.setAttribute("aria-selected", isSelected ? "true" : "false");
    });
  }

  // Toggle pane visibility
  Object.keys(elements.inputPanes).forEach(function (key) {
    var pane = elements.inputPanes[key];
    if (pane) {
      pane.style.display = key === inputType ? "block" : "none";
    }
  });

  clearValidationError();
}

/**
 * Returns the currently active input type.
 * @returns {string}
 */
export function getSelectedInputType() {
  return inputState.selectedInputType;
}

/**
 * Returns the currently selected PDF file (if any).
 * @returns {File|null}
 */
export function getSelectedPdfFile() {
  return inputState.selectedPdfFile;
}

/**
 * Sets a selected PDF file programmatically (e.g. for demo preloads).
 * @param {File} file
 */
export function setSelectedPdfFile(file) {
  if (!file) return;
  inputState.selectedPdfFile = file;
  if (elements.fileSelectedBox) {
    elements.fileSelectedBox.style.display = "block";
    if (elements.selectedFileName) elements.selectedFileName.textContent = file.name;
    if (elements.selectedFileSize) elements.selectedFileSize.textContent = formatFileSize(file.size);
  }
  clearValidationError();
}

/**
 * Returns the active textarea element based on the selected tab.
 * @returns {HTMLTextAreaElement|null}
 */
export function getActiveTextInput() {
  switch (inputState.selectedInputType) {
    case "product-description":
      return elements.productDescInput || document.getElementById("inputProductDescription");
    case "technical-specification":
      return elements.techSpecInput || document.getElementById("inputTechnicalSpecification");
    case "natural-language-query":
      return elements.nlQueryInput || document.getElementById("inputNaturalLanguage");
    default:
      return null;
  }
}

/**
 * Validates the currently active input before submission.
 * @returns {{ valid: boolean, inputType: string, text?: string, rawText?: string, file?: File, error?: string }}
 */
export function validateActiveInput() {
  var inputType = inputState.selectedInputType;

  if (inputType === "tender-pdf") {
    if (!inputState.selectedPdfFile) {
      var errorMsg = "Please select and upload a valid PDF tender document before proceeding.";
      showValidationError(errorMsg);
      if (elements.pdfFileInput) elements.pdfFileInput.focus();
      return { valid: false, inputType: inputType, error: errorMsg };
    }

    var isPdf = inputState.selectedPdfFile.type === "application/pdf" ||
                inputState.selectedPdfFile.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      var typeError = "Selected file is not a PDF. Please upload a valid PDF document (.pdf).";
      showValidationError(typeError);
      return { valid: false, inputType: inputType, error: typeError };
    }

    return {
      valid: true,
      inputType: inputType,
      file: inputState.selectedPdfFile
    };
  }

  // Text inputs: Product Description, Technical Specification, Natural Language Query
  var textEl = getActiveTextInput();
  var rawText = textEl ? textEl.value : "";
  var trimmedText = rawText.trim();

  if (!trimmedText) {
    var emptyMsg = "Please enter input before analysing.";
    if (inputType === "product-description") {
      emptyMsg = "Please enter a product or procurement description.";
    } else if (inputType === "technical-specification") {
      emptyMsg = "Please enter detailed technical specifications.";
    } else if (inputType === "natural-language-query") {
      emptyMsg = "Please enter your query regarding applicable Indian Standards.";
    }

    showValidationError(emptyMsg);
    if (textEl) {
      textEl.classList.add("has-error");
      textEl.focus();
    }
    return { valid: false, inputType: inputType, error: emptyMsg };
  }

  return {
    valid: true,
    inputType: inputType,
    text: trimmedText,
    rawText: rawText
  };
}

/**
 * Resets the active input field or removes the selected file.
 */
export function clearActiveInput() {
  if (inputState.selectedInputType === "tender-pdf") {
    removeSelectedPdfFile();
  } else {
    var textEl = getActiveTextInput();
    if (textEl) {
      textEl.value = "";
      textEl.classList.remove("has-error");
      textEl.focus();
    }
  }
  clearValidationError();
}

/**
 * Removes the selected PDF file and resets file UI elements.
 */
export function removeSelectedPdfFile() {
  inputState.selectedPdfFile = null;
  if (elements.pdfFileInput) {
    elements.pdfFileInput.value = "";
  }
  if (elements.fileSelectedBox) {
    elements.fileSelectedBox.style.display = "none";
  }
  if (elements.selectedFileName) {
    elements.selectedFileName.textContent = "";
  }
  if (elements.selectedFileSize) {
    elements.selectedFileSize.textContent = "";
  }
  clearValidationError();
}

/**
 * Displays an inline validation error message banner.
 * @param {string} message
 */
export function showValidationError(message) {
  var errorEl = elements.validationError || document.getElementById("validationError");
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.style.display = "block";
  errorEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/**
 * Clears and hides the inline validation error message.
 */
export function clearValidationError() {
  var errorEl = elements.validationError || document.getElementById("validationError");
  if (!errorEl) return;
  errorEl.textContent = "";
  errorEl.style.display = "none";

  var inputs = [
    elements.productDescInput || document.getElementById("inputProductDescription"),
    elements.techSpecInput || document.getElementById("inputTechnicalSpecification"),
    elements.nlQueryInput || document.getElementById("inputNaturalLanguage")
  ];
  inputs.forEach(function (el) {
    if (el) el.classList.remove("has-error");
  });
}
