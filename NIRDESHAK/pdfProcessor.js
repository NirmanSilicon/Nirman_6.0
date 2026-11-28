// =========================================================
// Nirdeshak - Step 2: Tender PDF Processing Module
// Government Portal Standard Implementation
// Handles: Uploading tender PDF documents to backend API,
// extracting readable text content, and handling PDF errors.
// =========================================================

/**
 * Uploads a tender PDF document to the Express backend for readable text extraction.
 * @param {File} file The PDF File object to upload.
 * @param {string} [apiBaseUrl=""] Base URL of backend server.
 * @returns {Promise<{ success: boolean, extractedText?: string, fileName?: string, error?: string }>}
 */
export async function uploadAndProcessPdf(file, apiBaseUrl) {
  apiBaseUrl = apiBaseUrl || "";

  if (!file) {
    return {
      success: false,
      error: "No PDF file provided for processing."
    };
  }

  var formData = new FormData();
  formData.append("tenderPdf", file, file.name);

  try {
    var response = await fetch(apiBaseUrl + "/api/process-tender", {
      method: "POST",
      body: formData
    });

    var data = null;
    try {
      data = await response.json();
    } catch (jsonErr) {
      return {
        success: false,
        error: "Server returned an unparseable response during PDF processing."
      };
    }

    if (!response.ok || !data.success) {
      var errorMsg = (data && data.error) ||
        ("Server error (" + response.status + "): Failed to process tender PDF.");
      return {
        success: false,
        error: errorMsg
      };
    }

    var extractedText = (data.extractedText || "").trim();
    if (!extractedText) {
      return {
        success: false,
        error: "No readable text could be extracted from the provided PDF document."
      };
    }

    return {
      success: true,
      extractedText: extractedText,
      fileName: data.fileName || file.name
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
