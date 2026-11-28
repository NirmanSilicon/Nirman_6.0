// =========================================================
// Nirdeshak - Multi-Page Client-Side State Manager
// Coordinates analysis state across multi-page workflow using sessionStorage.
// =========================================================

const STORAGE_KEY = 'nirdeshak_analysis_state';

/**
 * Returns default empty analysis state.
 */
export function getDefaultState() {
  return {
    originalQuery: '',
    inputMode: 'product-description', // 'product-description' | 'technical-specification' | 'tender-pdf' | 'natural-language-query'
    tenderFileMetadata: null, // { name: string, size: number, type: string, dataUrl: string, extractedText?: string }
    extractedRequirements: null,
    editedRequirements: null,
    recommendationResult: null,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Loads current state from sessionStorage.
 * @returns {Object} Current state object.
 */
export function getState() {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return getDefaultState();
    }
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();
    const parsed = JSON.parse(raw);
    return Object.assign(getDefaultState(), parsed);
  } catch (err) {
    console.warn('[Nirdeshak State] Failed to parse sessionStorage state:', err);
    return getDefaultState();
  }
}

/**
 * Merges updates into current state and writes to sessionStorage.
 * @param {Object} updates Partial state updates.
 * @returns {Object} Updated state.
 */
export function setState(updates) {
  try {
    const current = getState();
    const next = Object.assign({}, current, updates, { lastUpdated: new Date().toISOString() });
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
    return next;
  } catch (err) {
    console.warn('[Nirdeshak State] Failed to save sessionStorage state:', err);
    return getState();
  }
}

/**
 * Clears analysis state from sessionStorage.
 */
export function clearState() {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch (err) {
    console.warn('[Nirdeshak State] Failed to clear sessionStorage state:', err);
  }
}

/**
 * Converts a File object to a Base64 Data URL string for storage.
 * @param {File} file
 * @returns {Promise<string>}
 */
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve('');
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Converts a Base64 Data URL back into a File / Blob object.
 * @param {string} dataUrl
 * @param {string} [fileName='tender.pdf']
 * @returns {File|Blob}
 */
export function dataUrlToFile(dataUrl, fileName = 'tender.pdf') {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  try {
    return new File([u8arr], fileName, { type: mime });
  } catch (e) {
    // Fallback for older environments
    const blob = new Blob([u8arr], { type: mime });
    blob.name = fileName;
    return blob;
  }
}

/**
 * Determines the most appropriate text query to submit for recommendations.
 * @param {Object} state Current analysis state.
 * @returns {string} Text query.
 */
export function getEffectiveQuery(state) {
  if (!state) return '';
  const req = state.editedRequirements || state.extractedRequirements;
  if (req && req.product_name && req.product_name.trim()) {
    return req.product_name.trim();
  }
  if (state.originalQuery && state.originalQuery.trim()) {
    return state.originalQuery.trim();
  }
  if (state.tenderFileMetadata && state.tenderFileMetadata.extractedText) {
    return state.tenderFileMetadata.extractedText.slice(0, 300);
  }
  return '';
}
