// =========================================================
// Nirdeshak - Step 3: Requirement Extraction Module
// Government Portal Standard Implementation
// Handles: Calling the requirement extraction API,
// parsing & validating structured JSON, displaying requirements,
// Edit Requirements form, and Copy JSON functionality.
// =========================================================

import { escapeHtml } from "./script.js";

/**
 * Requirement Extractor Module State
 */
var extractorState = {
  extractedRequirements: null
};

// Cached DOM elements
var elements = {};

/**
 * Initializes elements and event handlers for Step 3 Requirement Extraction & Editing.
 * @param {Object} options Callbacks for coordinating with parent UI.
 */
export function initRequirementsEdit(options) {
  options = options || {};

  elements = {
    extractedRequirementsSection: document.getElementById("extractedRequirementsSection"),
    requirementsViewMode: document.getElementById("requirementsViewMode"),
    requirementsEditMode: document.getElementById("requirementsEditMode"),
    editRequirementsBtn: document.getElementById("editRequirementsBtn"),
    saveRequirementsBtn: document.getElementById("saveRequirementsBtn"),
    cancelEditRequirementsBtn: document.getElementById("cancelEditRequirementsBtn"),
    copyRequirementsJsonBtn: document.getElementById("copyRequirementsJsonBtn"),

    // Edit form inputs
    editProductName: document.getElementById("editProductName"),
    editProductCategory: document.getElementById("editProductCategory"),
    editApplication: document.getElementById("editApplication"),
    editTechnicalRequirements: document.getElementById("editTechnicalRequirements"),
    editMaterials: document.getElementById("editMaterials"),
    editPerformanceRequirements: document.getElementById("editPerformanceRequirements"),
    editDimensions: document.getElementById("editDimensions"),
    editEnvironmentalConditions: document.getElementById("editEnvironmentalConditions"),
    editSafetyRequirements: document.getElementById("editSafetyRequirements"),
    editTestingRequirements: document.getElementById("editTestingRequirements"),
    editCertificationRequirements: document.getElementById("editCertificationRequirements"),
    editImportantKeywords: document.getElementById("editImportantKeywords")
  };

  // 1. Edit Requirements button
  if (elements.editRequirementsBtn) {
    elements.editRequirementsBtn.addEventListener("click", function () {
      openRequirementsEditMode();
    });
  }

  // 2. Cancel Edit button
  if (elements.cancelEditRequirementsBtn) {
    elements.cancelEditRequirementsBtn.addEventListener("click", function () {
      if (elements.requirementsEditMode) elements.requirementsEditMode.style.display = "none";
      if (elements.requirementsViewMode) elements.requirementsViewMode.style.display = "block";
    });
  }

  // 3. Save Requirements button
  if (elements.saveRequirementsBtn) {
    elements.saveRequirementsBtn.addEventListener("click", function () {
      var updated = saveEditedRequirements();
      if (typeof options.onRequirementsUpdated === "function") {
        options.onRequirementsUpdated(updated);
      }
    });
  }

  // 4. Copy JSON button
  if (elements.copyRequirementsJsonBtn) {
    elements.copyRequirementsJsonBtn.addEventListener("click", function () {
      copyRequirementsJson();
    });
  }
}

/**
 * Sends input text / document content to backend to extract structured procurement requirements.
 * @param {string} text Text content to analyze.
 * @param {string} [inputType="general"] Input method identifier.
 * @param {string} [fileName=null] File name if source is PDF.
 * @param {string} [apiBaseUrl=""] Base URL of backend server.
 * @returns {Promise<{ success: boolean, requirements?: Object, error?: string }>}
 */
export async function extractRequirements(text, inputType, fileName, apiBaseUrl) {
  apiBaseUrl = apiBaseUrl || "";

  var payload = {
    text: text,
    inputType: inputType || "general",
    demoMode: true
  };
  if (fileName) {
    payload.fileName = fileName;
  }

  try {
    var response = await fetch(apiBaseUrl + "/api/extract-requirements", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Nirdeshak-Demo": "true"
      },
      body: JSON.stringify(payload)
    });

    var data = null;
    try {
      data = await response.json();
    } catch (jsonErr) {
      return {
        success: false,
        error: "Server returned an unparseable response during requirement extraction."
      };
    }

    if (!response.ok || !data.success) {
      var errorMsg = (data && data.error) || "Failed to extract requirements due to an AI service error. Please try again.";
      return {
        success: false,
        error: errorMsg
      };
    }

    var sanitized = validateAndSanitizeRequirements(data.requirements);
    setExtractedRequirements(sanitized);

    return {
      success: true,
      requirements: sanitized
    };

  } catch (networkError) {
    var msg = "Backend service is unavailable. Please check if the server is running.";
    if (networkError && networkError.message &&
        !networkError.message.includes("Failed to fetch") &&
        !networkError.message.includes("NetworkError")) {
      msg = networkError.message;
    }
    return {
      success: false,
      error: msg
    };
  }
}

/**
 * Renders the extracted requirements into a clean, formal government portal table.
 * @param {Object} reqs Sanitized requirements object.
 */
export function renderExtractedRequirements(reqs) {
  var section = elements.extractedRequirementsSection || document.getElementById("extractedRequirementsSection");
  var viewMode = elements.requirementsViewMode || document.getElementById("requirementsViewMode");
  var editMode = elements.requirementsEditMode || document.getElementById("requirementsEditMode");

  if (!section || !viewMode) return;

  var renderItemWithBadge = function (rawItem) {
    var str = typeof rawItem === "string" ? rawItem : (rawItem && rawItem.text ? rawItem.text : String(rawItem || ""));
    if (!str) return "";

    var badgeHtml = "";
    var cleanText = str;

    if (/\[USER PROVIDED\]/i.test(str)) {
      badgeHtml = ' <span class="param-source-badge badge-source-user">[USER PROVIDED]</span>';
      cleanText = str.replace(/\s*\[USER PROVIDED\]/i, "");
    } else if (/\[VERIFIED INDIAN STANDARD(?::\s*([^\]]+))?\]/i.test(str)) {
      var m = str.match(/\[VERIFIED INDIAN STANDARD(?::\s*([^\]]+))?\]/i);
      var label = m[1] ? "VERIFIED INDIAN STANDARD: " + m[1] : "VERIFIED INDIAN STANDARD";
      badgeHtml = ' <span class="param-source-badge badge-source-verified">[' + escapeHtml(label) + ']</span>';
      cleanText = str.replace(/\s*\[VERIFIED INDIAN STANDARD(?::\s*([^\]]+))?\]/i, "");
    } else if (/\[AI SUGGESTED\]/i.test(str)) {
      badgeHtml = ' <span class="param-source-badge badge-source-ai">[AI SUGGESTED]</span>';
      cleanText = str.replace(/\s*\[AI SUGGESTED\]/i, "");
    } else if (/\[REQUIRES CONFIRMATION\]/i.test(str)) {
      badgeHtml = ' <span class="param-source-badge badge-source-confirm">[REQUIRES CONFIRMATION]</span>';
      cleanText = str.replace(/\s*\[REQUIRES CONFIRMATION\]/i, "");
    }

    return '<li class="req-item"><span class="req-text">' + escapeHtml(cleanText) + '</span>' + badgeHtml + '</li>';
  };

  var renderList = function (arr) {
    if (!arr || !Array.isArray(arr) || arr.length === 0) {
      return '<span class="req-empty">None specified</span>';
    }
    var out = '<ul class="req-bullet-list">';
    arr.forEach(function (item) {
      out += renderItemWithBadge(item);
    });
    out += '</ul>';
    return out;
  };

  var renderValue = function (val) {
    if (!val || typeof val !== "string" || !val.trim()) {
      return '<span class="req-empty">Not specified</span>';
    }
    return '<strong>' + escapeHtml(val.trim()) + '</strong>';
  };

  var html = '<table class="requirements-table"><tbody>';
  if (reqs.multilingual && reqs.multilingual.isMultilingual) {
    html += '<tr><th>Detected Language</th><td><span class="card-context-badge" style="background: #e0f2fe; color: #0369a1; font-weight: 700;">' + escapeHtml(reqs.multilingual.languageName) + '</span></td></tr>';
    html += '<tr><th>Original Query</th><td>' + escapeHtml(reqs.multilingual.originalQuery) + '</td></tr>';
    html += '<tr><th>Normalized Target</th><td><strong>' + escapeHtml(reqs.multilingual.normalizedQuery) + '</strong></td></tr>';
  }
  html += '<tr><th>Product</th><td>' + renderValue(reqs.product_name) + '</td></tr>';
  html += '<tr><th>Category</th><td>' + renderValue(reqs.product_category) + '</td></tr>';
  html += '<tr><th>Application</th><td>' + renderValue(reqs.application) + '</td></tr>';
  html += '<tr><th>Technical Requirements</th><td>' + renderList(reqs.technical_requirements) + '</td></tr>';
  html += '<tr><th>Materials &amp; Construction</th><td>' + renderList(reqs.materials) + '</td></tr>';
  html += '<tr><th>Performance Requirements</th><td>' + renderList(reqs.performance_requirements) + '</td></tr>';
  html += '<tr><th>Dimensions &amp; Ratings</th><td>' + renderList(reqs.dimensions) + '</td></tr>';
  html += '<tr><th>Environmental Conditions</th><td>' + renderList(reqs.environmental_conditions) + '</td></tr>';
  html += '<tr><th>Safety Requirements</th><td>' + renderList(reqs.safety_requirements) + '</td></tr>';
  html += '<tr><th>Testing Requirements</th><td>' + renderList(reqs.testing_requirements) + '</td></tr>';
  html += '<tr><th>Certification Requirements</th><td>' + renderList(reqs.certification_requirements) + '</td></tr>';
  html += '<tr><th>Important Keywords</th><td>' + renderList(reqs.important_keywords) + '</td></tr>';
  html += '</tbody></table>';

  if (reqs.clarification_questions && Array.isArray(reqs.clarification_questions) && reqs.clarification_questions.length > 0) {
    html += '<div class="req-clarifications-card">';
    html += '<h4 style="margin: 0 0 8px 0; font-size: 13.5px; color: #92400e; display: flex; align-items: center; gap: 6px;">';
    html += '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>';
    html += 'Optional Technical Clarifications (AI Recommended to Refine Discovery)</h4>';
    html += '<ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #78350f; line-height: 1.5;">';
    reqs.clarification_questions.forEach(function (q) {
      html += '<li>' + escapeHtml(q) + '</li>';
    });
    html += '</ul>';
    html += '</div>';
  }

  viewMode.innerHTML = html;
  viewMode.style.display = "block";
  if (editMode) {
    editMode.style.display = "none";
  }
  section.style.display = "block";
}

/**
 * Opens the interactive Edit Requirements mode and populates existing values.
 */
export function openRequirementsEditMode() {
  var reqs = extractorState.extractedRequirements || {};

  var listToText = function (arr) {
    if (!arr || !Array.isArray(arr)) return "";
    return arr.join("\n");
  };

  var el = elements;
  if (el.editProductName) el.editProductName.value = reqs.product_name || "";
  if (el.editProductCategory) el.editProductCategory.value = reqs.product_category || "";
  if (el.editApplication) el.editApplication.value = reqs.application || "";

  if (el.editTechnicalRequirements) el.editTechnicalRequirements.value = listToText(reqs.technical_requirements);
  if (el.editMaterials) el.editMaterials.value = listToText(reqs.materials);
  if (el.editPerformanceRequirements) el.editPerformanceRequirements.value = listToText(reqs.performance_requirements);
  if (el.editDimensions) el.editDimensions.value = listToText(reqs.dimensions);
  if (el.editEnvironmentalConditions) el.editEnvironmentalConditions.value = listToText(reqs.environmental_conditions);
  if (el.editSafetyRequirements) el.editSafetyRequirements.value = listToText(reqs.safety_requirements);
  if (el.editTestingRequirements) el.editTestingRequirements.value = listToText(reqs.testing_requirements);
  if (el.editCertificationRequirements) el.editCertificationRequirements.value = listToText(reqs.certification_requirements);
  if (el.editImportantKeywords) el.editImportantKeywords.value = listToText(reqs.important_keywords);

  if (el.requirementsViewMode) el.requirementsViewMode.style.display = "none";
  if (el.requirementsEditMode) el.requirementsEditMode.style.display = "block";
}

/**
 * Saves edited requirements from the edit form, updates state, and refreshes the view table.
 * @returns {Object} Updated requirements.
 */
export function saveEditedRequirements() {
  var textToList = function (txt) {
    if (!txt) return [];
    return txt
      .split("\n")
      .map(function (s) { return s.trim(); })
      .filter(function (s) { return s.length > 0; });
  };

  var el = elements;
  var updated = {
    product_name: el.editProductName ? el.editProductName.value.trim() : "",
    product_category: el.editProductCategory ? el.editProductCategory.value.trim() : "",
    application: el.editApplication ? el.editApplication.value.trim() : "",
    technical_requirements: textToList(el.editTechnicalRequirements ? el.editTechnicalRequirements.value : ""),
    materials: textToList(el.editMaterials ? el.editMaterials.value : ""),
    performance_requirements: textToList(el.editPerformanceRequirements ? el.editPerformanceRequirements.value : ""),
    dimensions: textToList(el.editDimensions ? el.editDimensions.value : ""),
    environmental_conditions: textToList(el.editEnvironmentalConditions ? el.editEnvironmentalConditions.value : ""),
    safety_requirements: textToList(el.editSafetyRequirements ? el.editSafetyRequirements.value : ""),
    testing_requirements: textToList(el.editTestingRequirements ? el.editTestingRequirements.value : ""),
    certification_requirements: textToList(el.editCertificationRequirements ? el.editCertificationRequirements.value : ""),
    important_keywords: textToList(el.editImportantKeywords ? el.editImportantKeywords.value : "")
  };

  setExtractedRequirements(updated);
  renderExtractedRequirements(updated);

  try {
    var ev = new CustomEvent("nirdeshakRequirementsUpdated", { detail: updated });
    document.dispatchEvent(ev);
  } catch (e) {}

  return updated;
}

/**
 * Copies formatted requirements JSON to clipboard.
 */
export function copyRequirementsJson() {
  var currentReqs = extractorState.extractedRequirements || {};
  var jsonText = JSON.stringify(currentReqs, null, 2);
  var btn = elements.copyRequirementsJsonBtn || document.getElementById("copyRequirementsJsonBtn");

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(jsonText).then(function () {
      if (btn) {
        btn.textContent = "Copied JSON!";
        setTimeout(function () {
          btn.textContent = "Copy JSON";
        }, 2000);
      }
    }).catch(function () {
      if (btn) btn.textContent = "Failed";
    });
  }
}

/**
 * Returns currently stored extracted requirements.
 * @returns {Object|null}
 */
export function getExtractedRequirements() {
  return extractorState.extractedRequirements;
}

/**
 * Sets extracted requirements in module state and global window.
 * @param {Object|null} reqs
 */
export function setExtractedRequirements(reqs) {
  extractorState.extractedRequirements = reqs;
  if (typeof window !== "undefined") {
    window.extractedRequirements = reqs;
  }
}

/**
 * Validates and sanitizes extracted requirements object.
 * Guarantees all 12 schema keys exist with consistent types.
 * @param {Object} parsed
 * @returns {Object}
 */
export function validateAndSanitizeRequirements(parsed) {
  if (!parsed || typeof parsed !== "object") {
    parsed = {};
  }

  var cleanString = function (val) {
    if (typeof val === "string") return val.trim();
    if (val === null || val === undefined) return "";
    return String(val).trim();
  };

  var cleanArray = function (val) {
    if (!val) return [];
    if (Array.isArray(val)) {
      return val
        .map(function (item) {
          if (typeof item === "object" && item !== null) {
            return Object.entries(item).map(function (e) {
              return e[0].replace(/_/g, " ") + ": " + (typeof e[1] === "object" ? JSON.stringify(e[1]) : e[1]);
            }).join(", ");
          }
          return typeof item === "string" ? item.trim() : String(item || "").trim();
        })
        .filter(function (item) { return item.length > 0; });
    }
    if (typeof val === "object" && val !== null) {
      return Object.entries(val)
        .map(function (e) {
          return e[0].replace(/_/g, " ") + ": " + (typeof e[1] === "object" ? JSON.stringify(e[1]) : e[1]);
        })
        .filter(function (item) { return item.length > 0; });
    }
    if (typeof val === "string" && val.trim()) return [val.trim()];
    return [];
  };

  return {
    product_name: cleanString(parsed.product_name),
    product_category: cleanString(parsed.product_category),
    application: cleanString(parsed.application),
    technical_requirements: cleanArray(parsed.technical_requirements),
    materials: cleanArray(parsed.materials),
    performance_requirements: cleanArray(parsed.performance_requirements),
    dimensions: cleanArray(parsed.dimensions),
    environmental_conditions: cleanArray(parsed.environmental_conditions),
    safety_requirements: cleanArray(parsed.safety_requirements),
    testing_requirements: cleanArray(parsed.testing_requirements),
    certification_requirements: cleanArray(parsed.certification_requirements),
    important_keywords: cleanArray(parsed.important_keywords),
    clarification_questions: Array.isArray(parsed.clarification_questions) ? parsed.clarification_questions : [],
    multilingual: parsed.multilingual || null,
    metadata: parsed.metadata || null
  };
}
