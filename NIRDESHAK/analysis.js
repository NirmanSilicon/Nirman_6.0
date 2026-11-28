// =========================================================
// Nirdeshak - Page 2: New Analysis Input Logic
// Orchestrates user input selection, validation, state storage,
// and navigation to the processing stage.
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
  clearValidationError,
  setSelectedPdfFile
} from './input.js';

import {
  getState,
  setState,
  fileToDataUrl
} from './state.js';

const DEMO_SCENARIOS = {
  productDescription: "Procurement of industrial safety helmets for construction workers. The helmets should provide protection against mechanical impact and falling objects and be suitable for industrial work environments.",
  techSpec: "Industrial safety helmet with shell and harness for construction-site workers. Requirements include size, shell and harness construction, workmanship and finish, mass, shock absorption resistance, penetration resistance, flammability resistance, electrical resistance, water absorption and heat resistance.",
  nlQuery: "We need protective headgear for workers at construction sites. The helmet should protect against impacts and penetration and also meet the relevant fire, electrical, heat and water resistance requirements. Identify the applicable Indian Standard and the supporting testing or related standards.",
  nlQueryHindi: "निर्माण स्थल पर काम करने वाले श्रमिकों के लिए औद्योगिक सुरक्षा हेलमेट चाहिए। हेलमेट सिर को यांत्रिक आघात और गिरने वाली वस्तुओं से सुरक्षा दे। इसके लिए लागू भारतीय मानक बताइए।",
  nlQueryOdia: "ନିର୍ମାଣ ସ୍ଥଳରେ କାମ କରୁଥିବା ଶ୍ରମିକଙ୍କ ପାଇଁ ଔଦ୍ୟୋଗିକ ସୁରକ୍ଷା ହେଲମେଟ ଆବଶ୍ୟକ। ହେଲମେଟ ଯାନ୍ତ୍ରିକ ଆଘାତ ଏବଂ ପଡୁଥିବା ବସ୍ତୁରୁ ମୁଣ୍ଡକୁ ସୁରକ୍ଷା ଦେବା ଉଚିତ। ଏଥିପାଇଁ ପ୍ରୟୋଜ୍ୟ ଭାରତୀୟ ମାନକ କଣ?"
};

document.addEventListener('DOMContentLoaded', () => {
  initInputHandling({
    onInputTypeChange: () => clearValidationError(),
    onFileSelected: () => clearValidationError(),
    onFileRemoved: () => clearValidationError()
  });

  initNavigationActions();
  initDemoLoaders();
  restorePreviousInput();
});

/**
 * Attaches one-click demo scenario fill handlers for video recording.
 */
function initDemoLoaders() {
  const prodBtn = document.getElementById('loadDemoProductBtn');
  const techBtn = document.getElementById('loadDemoTechSpecBtn');
  const nlBtn = document.getElementById('loadDemoNlQueryBtn');
  const nlHindiBtn = document.getElementById('loadDemoNlQueryHindiBtn');
  const nlOdiaBtn = document.getElementById('loadDemoNlQueryOdiaBtn');
  const langSelect = document.getElementById('nlLanguageSelect');
  const pdfBtn = document.getElementById('loadDemoPdfBtn');

  if (prodBtn) {
    prodBtn.addEventListener('click', () => {
      const el = document.getElementById('inputProductDescription');
      if (el) {
        el.value = DEMO_SCENARIOS.productDescription;
        clearValidationError();
      }
    });
  }

  if (techBtn) {
    techBtn.addEventListener('click', () => {
      const el = document.getElementById('inputTechnicalSpecification');
      if (el) {
        el.value = DEMO_SCENARIOS.techSpec;
        clearValidationError();
      }
    });
  }

  if (nlBtn) {
    nlBtn.addEventListener('click', () => {
      const el = document.getElementById('inputNaturalLanguage');
      if (el) {
        el.value = DEMO_SCENARIOS.nlQuery;
        if (langSelect) langSelect.value = 'en';
        clearValidationError();
      }
    });
  }

  if (nlHindiBtn) {
    nlHindiBtn.addEventListener('click', () => {
      const el = document.getElementById('inputNaturalLanguage');
      if (el) {
        el.value = DEMO_SCENARIOS.nlQueryHindi;
        if (langSelect) langSelect.value = 'hi';
        clearValidationError();
      }
    });
  }

  if (nlOdiaBtn) {
    nlOdiaBtn.addEventListener('click', () => {
      const el = document.getElementById('inputNaturalLanguage');
      if (el) {
        el.value = DEMO_SCENARIOS.nlQueryOdia;
        if (langSelect) langSelect.value = 'or';
        clearValidationError();
      }
    });
  }

  if (langSelect) {
    langSelect.addEventListener('change', () => {
      const el = document.getElementById('inputNaturalLanguage');
      if (!el) return;
      if (langSelect.value === 'hi') {
        el.value = DEMO_SCENARIOS.nlQueryHindi;
      } else if (langSelect.value === 'or') {
        el.value = DEMO_SCENARIOS.nlQueryOdia;
      } else {
        el.value = DEMO_SCENARIOS.nlQuery;
      }
      clearValidationError();
    });
  }

  if (pdfBtn) {
    pdfBtn.addEventListener('click', async () => {
      try {
        pdfBtn.disabled = true;
        pdfBtn.textContent = 'Loading Demo Tender PDF...';
        const res = await fetch('/nirdeshak_demo_tender_industrial_safety_helmets.pdf');
        if (!res.ok) throw new Error('Failed to fetch demo tender PDF file.');
        const blob = await res.blob();
        const file = new File([blob], 'nirdeshak_demo_tender_industrial_safety_helmets.pdf', { type: 'application/pdf' });
        setSelectedPdfFile(file);
      } catch (err) {
        console.error('Error loading demo PDF:', err);
        showValidationError('Could not load demo PDF file automatically. Please choose the file manually.');
      } finally {
        pdfBtn.disabled = false;
        pdfBtn.textContent = '▶ Load Curated Demo Tender PDF (IS 2925)';
      }
    });
  }
}

/**
 * Initializes Continue and Clear buttons.
 */
function initNavigationActions() {
  const continueBtn = document.getElementById('continueBtn');
  const clearBtn = document.getElementById('clearBtn');

  if (continueBtn) {
    continueBtn.addEventListener('click', handleContinue);
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      clearActiveInput();
      clearValidationError();
    });
  }
}

/**
 * Restores previous input text or mode if navigating back from a later stage.
 */
function restorePreviousInput() {
  const saved = getState();
  if (!saved || !saved.inputMode) return;

  if (saved.inputMode && saved.inputMode !== 'tender-pdf') {
    selectInputType(saved.inputMode);
    const activeText = getActiveTextInput();
    if (activeText && saved.originalQuery && !activeText.value) {
      activeText.value = saved.originalQuery;
    }
  }
}

/**
 * Validates input and transitions to processing.html.
 */
async function handleContinue() {
  clearValidationError();
  const validation = validateActiveInput();

  if (!validation.valid) {
    return;
  }

  const continueBtn = document.getElementById('continueBtn');
  if (continueBtn) {
    continueBtn.disabled = true;
    continueBtn.textContent = 'Preparing...';
  }

  try {
    if (validation.inputType === 'tender-pdf') {
      const file = validation.file;
      const dataUrl = await fileToDataUrl(file);

      setState({
        inputMode: 'tender-pdf',
        originalQuery: file.name,
        tenderFileMetadata: {
          name: file.name,
          size: file.size,
          type: file.type || 'application/pdf',
          dataUrl: dataUrl
        },
        extractedRequirements: null,
        editedRequirements: null,
        recommendationResult: null
      });

    } else {
      setState({
        inputMode: validation.inputType,
        originalQuery: validation.rawText,
        tenderFileMetadata: null,
        extractedRequirements: null,
        editedRequirements: null,
        recommendationResult: null
      });
    }

    // Navigate to Page 3: Processing
    window.location.href = 'processing.html';

  } catch (err) {
    console.error('[Nirdeshak Analysis] Failed to store input state:', err);
    showValidationError('An unexpected error occurred while preparing your input. Please try again.');
    if (continueBtn) {
      continueBtn.disabled = false;
      continueBtn.textContent = 'Continue \u2192';
    }
  }
}
