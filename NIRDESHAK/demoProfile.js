// =========================================================
// Nirdeshak - Curated Prototype Demo Profile
// Profile: Industrial Safety Helmet (IS 2925:1984)
//
// Authoritative Sources:
// - Bureau of Indian Standards (BIS) e-Sale listing for IS 2925:1984
// - BIS Product Manual for Industrial Safety Helmets (IS 2925:1984, Jan 2019)
// - BIS LIMS Testing Requirements & Methods
// - Ministry of Commerce and Industry / DPIIT Quality Control Order:
//   Helmet for Police Force, Civil Defence and Personal Protection
//   (Quality Control) Order, 2023 (Gazette Notification S.O. 4649(E), 23 Oct 2023)
// =========================================================

const IS_DEMO_MODE_DEFAULT = true;

/**
 * Checks whether demo mode is active.
 * Controlled by process.env.DEMO_MODE ('true' | 'false').
 * Defaults to true if DEMO_MODE is not explicitly set to 'false'.
 */
function isDemoModeActive() {
  const envVal = process.env.DEMO_MODE;
  if (envVal === 'false' || envVal === '0') return false;
  return true;
}

/**
 * Detects query language and normalizes into an internal analysis representation.
 * Supports English, Hindi, and Odia.
 *
 * @param {string} text
 * @returns {{ languageCode: string, languageName: string, isMultilingual: boolean, originalQuery: string, normalizedQuery: string }}
 */
function detectAndNormalizeQuery(text) {
  if (!text || typeof text !== 'string') {
    return {
      languageCode: 'en',
      languageName: 'English',
      isMultilingual: false,
      originalQuery: '',
      normalizedQuery: ''
    };
  }

  const trimmed = text.trim();

  // Devanagari Unicode block (\u0900-\u097F)
  const isHindi = /[\u0900-\u097F]/.test(trimmed);
  // Odia Unicode block (\u0B00-\u0B7F)
  const isOdia = /[\u0B00-\u0B7F]/.test(trimmed);

  if (isHindi) {
    let norm = 'Procurement of industrial safety helmets for construction workers providing head protection against mechanical impact and falling objects with applicable Indian Standards.';
    if (/सीमेंट|सिमेंट/.test(trimmed)) {
      norm = 'Ordinary Portland Cement and Portland Pozzolana Cement for civil building construction';
    } else if (/सरिया|इस्पात/.test(trimmed)) {
      norm = 'High strength deformed steel bars (TMT rebars Fe 500D) for concrete reinforcement';
    } else if (/हॉर्न|हॉर्न/.test(trimmed)) {
      norm = 'Automotive electric horns for motor vehicles';
    } else if (/बैटरी/.test(trimmed)) {
      norm = 'Automotive starting lead-acid storage batteries for motor vehicles';
    } else if (/दरवाजा|खिड़की/.test(trimmed)) {
      norm = 'Aluminium doors, windows and ventilator frames for buildings';
    } else if (/सिरिंज|सुई/.test(trimmed)) {
      norm = 'Sterile single use hypodermic injection syringes for medical use';
    }
    return {
      languageCode: 'hi',
      languageName: 'हिन्दी (Hindi)',
      isMultilingual: true,
      originalQuery: trimmed,
      normalizedQuery: norm
    };
  }

  if (isOdia) {
    let norm = 'Procurement of industrial safety helmets for construction workers providing head protection against mechanical impact and falling objects with applicable Indian Standards.';
    if (/ସିମେଣ୍ଟ/.test(trimmed)) {
      norm = 'Ordinary Portland Cement and Portland Pozzolana Cement for civil building construction';
    } else if (/ଇସ୍ପାତ|ରଡ୍/.test(trimmed)) {
      norm = 'High strength deformed steel bars (TMT rebars Fe 500D) for concrete reinforcement';
    } else if (/ହର୍ଣ୍ଣ|ହର୍ଣ୍ଣ/.test(trimmed)) {
      norm = 'Automotive electric horns for motor vehicles';
    } else if (/ବ୍ୟାଟେରୀ/.test(trimmed)) {
      norm = 'Automotive starting lead-acid storage batteries for motor vehicles';
    } else if (/କବାଟ|ଝରକା/.test(trimmed)) {
      norm = 'Aluminium doors, windows and ventilator frames for buildings';
    } else if (/ସିରିଞ୍ଜ/.test(trimmed)) {
      norm = 'Sterile single use hypodermic injection syringes for medical use';
    }
    return {
      languageCode: 'or',
      languageName: 'ଓଡ଼ିଆ (Odia)',
      isMultilingual: true,
      originalQuery: trimmed,
      normalizedQuery: norm
    };
  }

  return {
    languageCode: 'en',
    languageName: 'English',
    isMultilingual: false,
    originalQuery: trimmed,
    normalizedQuery: trimmed
  };
}

/**
 * Curated BIS Authoritative Record for IS 2925:1984
 */
const CURATED_HELMET_STANDARD = {
  id: 2925,
  standardId: 2925,
  is_number: 'IS 2925:1984',
  title: 'Specification for Industrial Safety Helmets',
  status: 'Active',
  reaffirmed_year: 2020,
  publication_year: 1984,
  version: 'IS 2925:1984 (Reaffirmed 2020)',
  amendments_count: 8,
  amendments: [
    { number: 1, title: 'Amendment No. 1' },
    { number: 2, title: 'Amendment No. 2' },
    { number: 3, title: 'Amendment No. 3' },
    { number: 4, title: 'Amendment No. 4' },
    { number: 5, title: 'Amendment No. 5' },
    { number: 6, title: 'Amendment No. 6' },
    { number: 7, title: 'Amendment No. 7' },
    { number: 8, title: 'Amendment No. 8' }
  ],
  category: 'Industrial Safety / Personal Protective Equipment',
  application: 'Industrial workplaces, including construction environments requiring industrial head protection.',
  scope: 'Covers requirements regarding material, construction, workmanship and finish, mass, and the performance requirements for industrial safety helmets.',
  description: 'Indian Standard specification for industrial safety helmets designed to provide protection for wearers against falling objects, mechanical impact, and penetration in industrial and construction workplaces.',

  // 1. Technical Requirements (Section 8)
  technical_requirements: [
    'Shell (outer structural crown providing impact deflection)',
    'Harness (headband, cradle, and chinstrap assembly for energy distribution)',
    'Metal parts where applicable (corrosion-resistant attachment fittings)',
    'Sizes (520, 530, 540, 550, 560, 570, 580, 590, 600 mm or declared size range)',
    'Construction (shell and harness design ensuring structural integrity and head clearance)',
    'Workmanship and finish (smooth surfaces free from sharp burrs or structural defects)',
    'Mass (controlled lightweight design excluding accessories)'
  ],

  // 2. Performance Requirements (Section 9)
  performance_requirements: [
    'Shock absorption resistance',
    'Penetration resistance',
    'Flammability resistance',
    'Electrical resistance',
    'Water absorption',
    'Heat resistance'
  ],

  // 3. Safety Requirements (Section 10 - distinguished from tests)
  safety_requirements: [
    'Protection against mechanical impact (mitigation of kinetic energy from falling objects)',
    'Protection against penetration (prevention of skull contact by sharp dropped hazards)',
    'Flammability resistance (self-extinguishing performance to reduce flame propagation hazards)',
    'Electrical resistance (protection against accidental low-voltage contact and leakage current)',
    'Heat resistance (retention of protective structural integrity in elevated temperature environments)',
    'Water absorption-related performance (retention of mechanical strength under wet/humid conditions)'
  ],

  // 4. Testing Requirements (Section 11 - clauses within IS 2925 itself)
  testing_requirements: [
    { clause: 'Clause 4', title: 'Sizes', description: 'Head circumference fit verification (520 mm – 600 mm).' },
    { clause: 'Clause 5', title: 'Construction', description: 'Inspection of shell, harness, cradle clearance, and headband retention.' },
    { clause: 'Clause 6', title: 'Workmanship and finish', description: 'Visual and tactile examination for defects, burrs, or sharp edges.' },
    { clause: 'Clause 7', title: 'Mass', description: 'Determination of helmet mass excluding detachable accessories.' },
    { clause: 'Clause 8.1', title: 'Shock absorption resistance', description: 'Drop-impact shock attenuation test measuring transmitted peak force.' },
    { clause: 'Clause 8.2', title: 'Penetration resistance', description: 'Drop test using a sharp conical steel striker without headform contact.' },
    { clause: 'Clause 8.3', title: 'Flammability resistance', description: 'Direct burner flame exposure with self-extinguishing evaluation.' },
    { clause: 'Clause 8.4', title: 'Electrical resistance', description: 'High-voltage leakage current insulation resistance test.' },
    { clause: 'Clause 8.5', title: 'Water absorption', description: 'Immersion water absorption test determining shell mass increase.' },
    { clause: 'Clause 8.6', title: 'Heat resistance', description: 'Oven heating thermal conditioning test evaluating distortion.' }
  ],

  // Size Information (from BIS Product Manual)
  sizes: [
    '520 mm', '530 mm', '540 mm', '550 mm', '560 mm',
    '570 mm', '580 mm', '590 mm', '600 mm'
  ],

  // 5. Related / Allied Standards (Section 12 - conservatively categorized)
  related_standards: {
    testEquipment: [
      {
        is_number: 'IS 7692',
        title: 'Specification for headforms for testing of helmets',
        category: 'Test / Test-Equipment Related',
        direction: 'Outgoing Reference',
        source: 'BIS Helmet Publications / Testing Guidelines',
        description: 'Specifies anatomical headforms used for mounting helmets during shock absorption and penetration drop testing.'
      }
    ],
    sampling: [
      {
        is_number: 'IS 9695',
        title: 'Methods for sampling of helmets',
        category: 'Sampling Related',
        direction: 'Outgoing Reference',
        source: 'BIS Helmet Publications',
        description: 'Specifies statistical sampling plans and criteria for conformity for inspection of helmet lots.'
      }
    ],
    relatedHelmetProducts: [
      {
        is_number: 'IS 2745',
        title: 'Specification for non-metal helmet for firemen and civil defence personnel',
        category: 'Related Helmet Product',
        direction: 'Allied Sibling',
        source: 'BIS Catalogue',
        description: 'Standard for helmets designed for structural firefighting and civil defence services.'
      },
      {
        is_number: 'IS 4151',
        title: 'Protective helmets for motorcycle riders',
        category: 'Related Helmet Product',
        direction: 'Allied Sibling',
        source: 'BIS Catalogue',
        description: 'Standard for protective vehicular helmets for two-wheeler riders (distinct from industrial safety helmets).'
      },
      {
        is_number: 'IS 9562',
        title: 'Specification for non-metal helmet for police force',
        category: 'Related Helmet Product',
        direction: 'Allied Sibling',
        source: 'BIS Catalogue',
        description: 'Standard for protective non-metal riot and tactical helmets for law enforcement personnel.'
      }
    ],
    relatedComponents: [
      {
        is_number: 'IS 9973',
        title: 'Specification for visor for scooter helmets',
        category: 'Related Helmet Component',
        direction: 'Allied Component',
        source: 'BIS Catalogue',
        description: 'Specifies requirements for transparent eye-protection visors.'
      },
      {
        is_number: 'IS 9995',
        title: 'Specification for visor for non-metal police and firemen\'s helmets',
        category: 'Related Helmet Component',
        direction: 'Allied Component',
        source: 'BIS Catalogue',
        description: 'Specifies impact and optical requirements for protective visors attached to emergency services helmets.'
      }
    ]
  },

  // 6. Relationship Categorization Notices (Sections 13-16)
  normativeNotice: 'No separately verified normative reference is available in the curated record.',
  terminologyNotice: 'No separately verified terminology standard identified.',
  installationNotice: 'No separate installation standard identified for this product in the curated relationship data.',
  safetyStandardsNotice: 'No separately linked safety standard identified.',

  // 7. Version / Amendment Intelligence (Section 18 - dual source preserved)
  versionStatus: {
    statusCategory: 'active',
    statusValue: 'Active',
    version: 'IS 2925:1984',
    publicationYear: 1984,
    reaffirmedYear: 2020,
    hasAmendments: true,
    amendmentCount: 8,
    amendmentInfo: [
      'Amendment 1', 'Amendment 2', 'Amendment 3', 'Amendment 4',
      'Amendment 5', 'Amendment 6', 'Amendment 7', 'Amendment 8'
    ],
    // Explicit source distinction
    currentCatalogue: {
      source: 'BIS e-Sale Portal / Active Standards Catalogue',
      status: 'Active',
      reaffirmedYear: 2020,
      amendmentCount: 8,
      notes: 'Current active standard listing on BIS e-Sale indicates 8 published amendments.'
    },
    historicalProductManual: {
      source: 'BIS Product Manual for IS 2925:1984 (January 2019)',
      amendmentCount: 4,
      publicationDate: 'January 2019',
      notes: 'The January 2019 BIS Product Manual reflects 4 amendments in force at time of publication.'
    },
    isSuperseded: false,
    supersededBy: null,
    supersedes: null,
    summary: 'Active Indian Standard (Reaffirmed 2020, 8 Amendments per current BIS catalogue).'
  },

  // 8. Certification / Regulatory Context (Section 19)
  certification: {
    hasCertificationInfo: true,
    scheme: 'BIS Scheme-I / Standard Mark',
    qcoOrder: 'Helmet for Police Force, Civil Defence and Personal Protection (Quality Control) Order, 2023',
    qcoShortTitle: 'Helmet Quality Control Order, 2023',
    gazetteNotification: 'S.O. 4649(E)',
    notificationDate: '23 October 2023',
    standardCovered: 'IS 2925:1984 (Industrial safety helmets)',
    requirementExplicit: true,
    requirementValue: 'Mandatory BIS Standard Mark under Helmet QCO, 2023 (S.O. 4649(E))',
    regulatoryRequirement: 'Under S.O. 4649(E), industrial safety helmets shall conform to IS 2925:1984 and bear the Standard Mark under a licence from the Bureau of Indian Standards.',
    certificationScheme: 'Conformity assessment under Scheme-I of Schedule-II of the Bureau of Indian Standards (Conformity Assessment) Regulations, 2018.',
    manufacturerLicenseStatus: 'No specific manufacturer licence is fabricated in this demo profile. Verification of individual supplier licences must be conducted via the BIS Manakonline portal.',
    dataContext: 'authoritative_bis'
  },

  // 9. Gap Detection (Section 20)
  gapDetection: {
    hasGap: true,
    gapTitle: 'POTENTIAL REFERENCE GAP',
    gapStatus: 'Potential Gap — Human Verification Required',
    gapDescription: 'The procurement requirement specifies helmet testing and quality parameters but does not explicitly cite all supporting reference standards available in the BIS knowledge base.',
    potentialReferences: [
      {
        is_number: 'IS 7692',
        title: 'Specification for headforms for testing of helmets',
        role: 'Required for headform geometry and drop testing in Clause 8.1 (shock absorption) and Clause 8.2 (penetration)'
      },
      {
        is_number: 'IS 9695',
        title: 'Methods for sampling of helmets',
        role: 'Specifies lot sampling, sample size, and batch acceptance criteria for procurement verification'
      }
    ],
    gapDisclaimer: 'Note: This observation highlights potential references for human verification and does NOT imply that the tender specification is invalid or non-compliant.'
  },

  // Structured Evidence
  whyIdentified: [
    'Product category matches industrial safety helmets',
    'Application matches industrial/construction work',
    'Head-protection requirement matches',
    'Mechanical impact requirement matches',
    'Penetration protection requirement matches',
    'Safety/performance requirements align with the standard',
    'Testing requirements align directly with IS 2925 clauses'
  ],

  // Sources & Provenance
  sources: [
    'BIS Product Manual for IS 2925:1984 (Doc: PM/IS 2925/1/January 2019)',
    'BIS e-Sale Portal Standard Listing (IS 2925:1984, Reaffirmed 2020)',
    'BIS LIMS Laboratory Testing Protocol for IS 2925',
    'Ministry of Commerce and Industry / DPIIT Quality Control Order: S.O. 4649(E) (23 Oct 2023)'
  ],
  provenance: [
    'BIS Product Manual for IS 2925:1984',
    'BIS e-Sale standard listing',
    'BIS LIMS testing information',
    'Helmet Quality Control Order, 2023 (S.O. 4649(E))'
  ],

  source: 'BIS Product Manual for IS 2925:1984; BIS e-Sale listing; Helmet Quality Control Order, 2023 (S.O. 4649(E))',
  dataContext: 'authoritative_curated_demo'
};

/**
 * Evaluates whether a user query / requirement text aligns with the industrial safety helmet profile.
 * Supports natural language normalization across English, Hindi, and Odia.
 *
 * @param {string} text
 * @returns {boolean}
 */
function isHelmetQuery(text) {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase();

  const keywords = [
    'helmet',
    'industrial helmet',
    'safety helmet',
    'head protection',
    'headgear',
    'construction helmet',
    'worker head protection',
    'protective headgear',
    'impact protection',
    'penetration resistance',
    'is 2925',
    'is:2925',
    '2925',
    'shock absorption',
    'chinstrap',
    'protective helmet',
    'industrial safety helmet',
    // Hindi keywords
    'हेलमेट',
    'सुरक्षा हेलमेट',
    'औद्योगिक सुरक्षा हेलमेट',
    'सिर को',
    'यांत्रिक आघात',
    // Odia keywords
    'ହେଲମେଟ',
    'ସୁରକ୍ଷା ହେଲମେଟ',
    'ଔଦ୍ୟୋଗିକ ସୁରକ୍ଷା',
    'ମୁଣ୍ଡକୁ ସୁରକ୍ଷା'
  ];

  return keywords.some(k => lower.includes(k) || text.includes(k));
}

/**
 * Curated BIS Authoritative Record for IS 7692:1993 (Headforms for Testing of Helmets)
 * Referenced as Documented Testing Standard for Personal Protective Helmets.
 */
const CURATED_TESTING_STANDARD_HELMETS = {
  id: 6,
  is_number: 'IS 7692:1993',
  title: 'Specification for Headforms for Testing of Helmets',
  category: 'Test Equipment / Testing Standard',
  scope: 'Specifies anatomical dimensions, mass distribution, and resonant frequency of headforms for impact and retention testing.',
  technical_requirements: [
    'Standard headform sizes 535 mm, 575 mm, 605 mm',
    'Resonant frequency > 3000 Hz',
    'Low-damping metal alloy material'
  ],
  materials: ['Aluminium-silicon alloy', 'Magnesium K1A alloy'],
  performance_requirements: [
    'Triaxial accelerometer mount at center of gravity'
  ],
  safety_requirements: [],
  testing_requirements: [
    'Dimensional tolerance verification',
    'Mass calibration'
  ]
};

/**
 * Builds the complete explainable recommendation result for the curated helmet profile.
 *
 * @param {string} query
 * @param {Object} [extractedReqs]
 * @returns {Object} Full recommendation payload matching Nirdeshak schema
 */
function getCuratedHelmetRecommendation(query, extractedReqs = null) {
  const std = CURATED_HELMET_STANDARD;
  const langMeta = detectAndNormalizeQuery(query);

  const rec = {
    standardId: std.id,
    is_number: std.is_number,
    title: std.title,
    category: std.category,
    application: std.application,
    scope: std.scope,
    description: std.description,
    scores: {
      semantic: 0.94,
      text: 0.96,
      scopeApplication: 0.95,
      structured: 0.94,
      structuredRequirement: 0.94,
      final: 0.945,
      rank: 1,
      displayLabel: 'Primary Relevant Standard'
    },
    versionStatus: std.versionStatus,
    certification: std.certification,
    technicalRequirements: std.technical_requirements,
    performanceRequirements: std.performance_requirements,
    safetyRequirements: std.safety_requirements,
    testingRequirements: std.testing_requirements,
    relatedStandardsData: std.related_standards,
    // Flat list of related standards for backward compatibility with existing tests
    relatedStandards: [
      {
        relationship_type: 'test_equipment',
        is_mandatory: false,
        source: 'BIS Helmet Publications',
        standard: {
          id: 7692,
          is_number: 'IS 7692',
          title: 'Specification for headforms for testing of helmets',
          status: 'Active',
          category: 'Test Equipment'
        }
      },
      {
        relationship_type: 'sampling',
        is_mandatory: false,
        source: 'BIS Helmet Publications',
        standard: {
          id: 9695,
          is_number: 'IS 9695',
          title: 'Methods for sampling of helmets',
          status: 'Active',
          category: 'Sampling'
        }
      },
      {
        relationship_type: 'allied_product',
        is_mandatory: false,
        source: 'BIS Catalogue',
        standard: {
          id: 2745,
          is_number: 'IS 2745',
          title: 'Specification for non-metal helmet for firemen and civil defence personnel',
          status: 'Active',
          category: 'Related Helmet Product'
        }
      },
      {
        relationship_type: 'allied_product',
        is_mandatory: false,
        source: 'BIS Catalogue',
        standard: {
          id: 4151,
          is_number: 'IS 4151',
          title: 'Protective helmets for motorcycle riders',
          status: 'Active',
          category: 'Related Helmet Product'
        }
      },
      {
        relationship_type: 'allied_product',
        is_mandatory: false,
        source: 'BIS Catalogue',
        standard: {
          id: 9562,
          is_number: 'IS 9562',
          title: 'Specification for non-metal helmet for police force',
          status: 'Active',
          category: 'Related Helmet Product'
        }
      }
    ],
    technical_requirements: std.technical_requirements,
    performance_requirements: std.performance_requirements,
    safety_requirements: std.safety_requirements,
    testing_requirements: std.testing_requirements,
    version_information: {
      status: 'Active',
      version: std.versionStatus.version,
      publicationYear: std.versionStatus.publicationYear,
      reaffirmedYear: std.versionStatus.reaffirmedYear,
      amendments: std.versionStatus.amendmentInfo
    },
    amendment_information: std.versionStatus.amendmentInfo,
    supersession_status: 'Active (Reaffirmed 2020, not superseded)',
    certification_information: {
      hasCertificationInfo: true,
      scheme: std.certification.scheme,
      requirementExplicit: std.certification.requirementExplicit,
      requirementValue: std.certification.requirementValue
    },
    regulatory_information: std.certification.regulatoryRequirement,
    gaps: std.gapDetection,
    evidence: std.whyIdentified,
    normativeNotice: std.normativeNotice,
    terminologyNotice: std.terminologyNotice,
    installationNotice: std.installationNotice,
    safetyStandardsNotice: std.safetyStandardsNotice,
    gapDetection: std.gapDetection,
    sizes: std.sizes,
    whyIdentified: std.whyIdentified,
    explanation: {
      whyRelevant: 'IS 2925:1984 (Specification for Industrial Safety Helmets) is the primary relevant standard identified from the available curated standards evidence. It directly specifies requirements and tests for industrial safety helmets providing head protection against mechanical impact, falling objects, and penetration in industrial and construction workplaces.',
      evidence: std.whyIdentified
    },
    sources: std.sources,
    source: std.source,
    dataContext: std.dataContext,
    isPrimary: true,
    displayLabel: 'PRIMARY RELEVANT STANDARD',
    details: {
      scope: std.scope,
      application: std.application,
      technical_requirements: std.technical_requirements,
      technicalRequirements: std.technical_requirements,
      performance_requirements: std.performance_requirements,
      performanceRequirements: std.performance_requirements,
      safety_requirements: std.safety_requirements,
      safetyRequirements: std.safety_requirements,
      testing_requirements: std.testing_requirements,
      testingRequirements: std.testing_requirements,
      related_testing_standard: CURATED_TESTING_STANDARD_HELMETS
    },
    related_testing_standard: CURATED_TESTING_STANDARD_HELMETS,
    rank: 1,
    final_score: 0.945,
    semantic_similarity: 0.94,
    text_match: 0.96,
    scope_match: 0.95,
    requirement_match: 0.94
  };

  // Curated BIS Authoritative Record for IS 4151:2015 (Motorcycle Riders Protective Helmets)
  const rec2 = {
    standardId: 4151,
    id: 4151,
    is_number: 'IS 4151:2015',
    title: 'Protective Helmets for Motorcycle Riders',
    category: 'Personal Protective Equipment / Vehicular Headgear',
    application: 'Protective helmets for motorcycle, scooter, and two-wheeler vehicular riders on roads.',
    scope: 'Covers requirements regarding material, construction, workmanship and finish, mass, and performance requirements for protective helmets for motorcycle riders.',
    description: 'Indian Standard specification for motorcycle and scooter riders protective helmets. Identified as an allied protective headgear standard; distinct from industrial safety helmets.',
    rank: 2,
    final_score: 0.733,
    semantic_similarity: 0.74,
    text_match: 0.78,
    scope_match: 0.68,
    requirement_match: 0.65,
    scores: {
      semantic: 0.74,
      text: 0.78,
      scopeApplication: 0.68,
      structured: 0.65,
      structuredRequirement: 0.65,
      final: 0.733,
      rank: 2,
      displayLabel: 'Allied Headgear Standard'
    },
    // 1. Technical Requirements (Section 8 / Construction)
    technical_requirements: [
      'Shell: Rigid outer protective shell constructed of thermoplastic or thermoset composite materials designed to withstand high-velocity vehicular impact.',
      'Protective padding: Impact energy absorption liner made of expanded polystyrene (EPS) engineered to absorb and dissipate kinetic shock.',
      'Comfort padding: Inner lining and sweatband ensuring ergonomic fit, sweat dissipation, and head retention.',
      'Retention system: Chinstrap assembly and fastening mechanism maintaining helmet positioning upon dynamic impact.',
      'Visor aperture and attachment: Optical clearance and mechanical retention where a protective visor is fitted.',
      'Mass: Mass limitations specified per helmet nominal size category to prevent rider cervical fatigue.',
      'Workmanship and finish: Smooth surfaces free from dangerous inward projections, burrs, or sharp edges.'
    ],
    technicalRequirements: [
      'Shell: Rigid outer protective shell constructed of thermoplastic or thermoset composite materials designed to withstand high-velocity vehicular impact.',
      'Protective padding: Impact energy absorption liner made of expanded polystyrene (EPS) engineered to absorb and dissipate kinetic shock.',
      'Comfort padding: Inner lining and sweatband ensuring ergonomic fit, sweat dissipation, and head retention.',
      'Retention system: Chinstrap assembly and fastening mechanism maintaining helmet positioning upon dynamic impact.',
      'Visor aperture and attachment: Optical clearance and mechanical retention where a protective visor is fitted.',
      'Mass: Mass limitations specified per helmet nominal size category to prevent rider cervical fatigue.',
      'Workmanship and finish: Smooth surfaces free from dangerous inward projections, burrs, or sharp edges.'
    ],
    // 2. Performance Requirements
    performance_requirements: [
      'Impact absorption attenuation (transmitted acceleration below peak threshold when dropped onto flat and kerbstone anvils)',
      'Rigidity resistance (preservation of transverse and longitudinal structural integrity under compressive loading)',
      'Retention system dynamic displacement (resistance to dynamic displacement and chinstrap elongation)',
      'Retention roll-off / detachment resistance (helmet retention on headform during directional dislodgement forces)',
      'Peripheral vision angle retention (horizontal field of vision not less than 105 degrees from median plane)',
      'Audibility performance (sound transmission preservation for traffic alertness)'
    ],
    performanceRequirements: [
      'Impact absorption attenuation (transmitted acceleration below peak threshold when dropped onto flat and kerbstone anvils)',
      'Rigidity resistance (preservation of transverse and longitudinal structural integrity under compressive loading)',
      'Retention system dynamic displacement (resistance to dynamic displacement and chinstrap elongation)',
      'Retention roll-off / detachment resistance (helmet retention on headform during directional dislodgement forces)',
      'Peripheral vision angle retention (horizontal field of vision not less than 105 degrees from median plane)',
      'Audibility performance (sound transmission preservation for traffic alertness)'
    ],
    // 3. Safety Requirements
    safety_requirements: [
      'Protection against high-velocity vehicular collision and kinetic head impact on roads',
      'Prevention of helmet detachment during rider deceleration, roll-over, or roadway sliding',
      'Retention of unobstructed peripheral field of vision for road situational awareness',
      'Prevention of localized skull fracture through wide energy dissipation across EPS protective liner',
      'Chinstrap slippage limitation under sudden deceleration'
    ],
    safetyRequirements: [
      'Protection against high-velocity vehicular collision and kinetic head impact on roads',
      'Prevention of helmet detachment during rider deceleration, roll-over, or roadway sliding',
      'Retention of unobstructed peripheral field of vision for road situational awareness',
      'Prevention of localized skull fracture through wide energy dissipation across EPS protective liner',
      'Chinstrap slippage limitation under sudden deceleration'
    ],
    // 4. Testing Requirements
    testing_requirements: [
      { clause: 'Clause 8.1 / 9', title: 'Impact absorption test', description: 'Drop impact onto flat and kerbstone anvils measuring headform triaxial acceleration.' },
      { clause: 'Clause 9.2', title: 'Rigidity test', description: 'Compressive initial and maximum load deformation test along longitudinal and transverse axes.' },
      { clause: 'Clause 9.3', title: 'Dynamic test of retention system', description: 'Drop-weight impulse dynamic pull test measuring chinstrap elongation and displacement.' },
      { clause: 'Clause 9.4', title: 'Retention system detachment (roll-off) test', description: 'Rotational dislodgement evaluation ensuring helmet stays securely positioned on headform.' },
      { clause: 'Clause 9.5', title: 'Conditioning tests', description: 'Impact testing after thermal conditioning at ambient, heat (+50°C), cold (-20°C), and water immersion.' },
      { clause: 'Clause 9.6', title: 'Visor testing (where fitted)', description: 'Evaluation of luminous transmittance, refractive distortion, and scratch resistance.' }
    ],
    testingRequirements: [
      { clause: 'Clause 8.1 / 9', title: 'Impact absorption test', description: 'Drop impact onto flat and kerbstone anvils measuring headform triaxial acceleration.' },
      { clause: 'Clause 9.2', title: 'Rigidity test', description: 'Compressive initial and maximum load deformation test along longitudinal and transverse axes.' },
      { clause: 'Clause 9.3', title: 'Dynamic test of retention system', description: 'Drop-weight impulse dynamic pull test measuring chinstrap elongation and displacement.' },
      { clause: 'Clause 9.4', title: 'Retention system detachment (roll-off) test', description: 'Rotational dislodgement evaluation ensuring helmet stays securely positioned on headform.' },
      { clause: 'Clause 9.5', title: 'Conditioning tests', description: 'Impact testing after thermal conditioning at ambient, heat (+50°C), cold (-20°C), and water immersion.' },
      { clause: 'Clause 9.6', title: 'Visor testing (where fitted)', description: 'Evaluation of luminous transmittance, refractive distortion, and scratch resistance.' }
    ],
    // Standard-specific details object for Rank 2
    details: {
      scope: 'Covers requirements regarding material, construction, workmanship and finish, mass, and performance requirements for protective helmets for motorcycle riders.',
      application: 'Protective helmets for motorcycle, scooter, and two-wheeler vehicular riders on roads.',
      technical_requirements: [
        'Shell: Rigid outer protective shell constructed of thermoplastic or thermoset composite materials designed to withstand high-velocity vehicular impact.',
        'Protective padding: Impact energy absorption liner made of expanded polystyrene (EPS) engineered to absorb and dissipate kinetic shock.',
        'Comfort padding: Inner lining and sweatband ensuring ergonomic fit, sweat dissipation, and head retention.',
        'Retention system: Chinstrap assembly and fastening mechanism maintaining helmet positioning upon dynamic impact.',
        'Visor aperture and attachment: Optical clearance and mechanical retention where a protective visor is fitted.',
        'Mass: Mass limitations specified per helmet nominal size category to prevent rider cervical fatigue.',
        'Workmanship and finish: Smooth surfaces free from dangerous inward projections, burrs, or sharp edges.'
      ],
      technicalRequirements: [
        'Shell: Rigid outer protective shell constructed of thermoplastic or thermoset composite materials designed to withstand high-velocity vehicular impact.',
        'Protective padding: Impact energy absorption liner made of expanded polystyrene (EPS) engineered to absorb and dissipate kinetic shock.',
        'Comfort padding: Inner lining and sweatband ensuring ergonomic fit, sweat dissipation, and head retention.',
        'Retention system: Chinstrap assembly and fastening mechanism maintaining helmet positioning upon dynamic impact.',
        'Visor aperture and attachment: Optical clearance and mechanical retention where a protective visor is fitted.',
        'Mass: Mass limitations specified per helmet nominal size category to prevent rider cervical fatigue.',
        'Workmanship and finish: Smooth surfaces free from dangerous inward projections, burrs, or sharp edges.'
      ],
      performance_requirements: [
        'Impact absorption attenuation (transmitted acceleration below peak threshold when dropped onto flat and kerbstone anvils)',
        'Rigidity resistance (preservation of transverse and longitudinal structural integrity under compressive loading)',
        'Retention system dynamic displacement (resistance to dynamic displacement and chinstrap elongation)',
        'Retention roll-off / detachment resistance (helmet retention on headform during directional dislodgement forces)',
        'Peripheral vision angle retention (horizontal field of vision not less than 105 degrees from median plane)',
        'Audibility performance (sound transmission preservation for traffic alertness)'
      ],
      performanceRequirements: [
        'Impact absorption attenuation (transmitted acceleration below peak threshold when dropped onto flat and kerbstone anvils)',
        'Rigidity resistance (preservation of transverse and longitudinal structural integrity under compressive loading)',
        'Retention system dynamic displacement (resistance to dynamic displacement and chinstrap elongation)',
        'Retention roll-off / detachment resistance (helmet retention on headform during directional dislodgement forces)',
        'Peripheral vision angle retention (horizontal field of vision not less than 105 degrees from median plane)',
        'Audibility performance (sound transmission preservation for traffic alertness)'
      ],
      safety_requirements: [
        'Protection against high-velocity vehicular collision and kinetic head impact on roads',
        'Prevention of helmet detachment during rider deceleration, roll-over, or roadway sliding',
        'Retention of unobstructed peripheral field of vision for road situational awareness',
        'Prevention of localized skull fracture through wide energy dissipation across EPS protective liner',
        'Chinstrap slippage limitation under sudden deceleration'
      ],
      safetyRequirements: [
        'Protection against high-velocity vehicular collision and kinetic head impact on roads',
        'Prevention of helmet detachment during rider deceleration, roll-over, or roadway sliding',
        'Retention of unobstructed peripheral field of vision for road situational awareness',
        'Prevention of localized skull fracture through wide energy dissipation across EPS protective liner',
        'Chinstrap slippage limitation under sudden deceleration'
      ],
      testing_requirements: [
        { clause: 'Clause 8.1 / 9', title: 'Impact absorption test', description: 'Drop impact onto flat and kerbstone anvils measuring headform triaxial acceleration.' },
        { clause: 'Clause 9.2', title: 'Rigidity test', description: 'Compressive initial and maximum load deformation test along longitudinal and transverse axes.' },
        { clause: 'Clause 9.3', title: 'Dynamic test of retention system', description: 'Drop-weight impulse dynamic pull test measuring chinstrap elongation and displacement.' },
        { clause: 'Clause 9.4', title: 'Retention system detachment (roll-off) test', description: 'Rotational dislodgement evaluation ensuring helmet stays securely positioned on headform.' },
        { clause: 'Clause 9.5', title: 'Conditioning tests', description: 'Impact testing after thermal conditioning at ambient, heat (+50°C), cold (-20°C), and water immersion.' },
        { clause: 'Clause 9.6', title: 'Visor testing (where fitted)', description: 'Evaluation of luminous transmittance, refractive distortion, and scratch resistance.' }
      ],
      testingRequirements: [
        { clause: 'Clause 8.1 / 9', title: 'Impact absorption test', description: 'Drop impact onto flat and kerbstone anvils measuring headform triaxial acceleration.' },
        { clause: 'Clause 9.2', title: 'Rigidity test', description: 'Compressive initial and maximum load deformation test along longitudinal and transverse axes.' },
        { clause: 'Clause 9.3', title: 'Dynamic test of retention system', description: 'Drop-weight impulse dynamic pull test measuring chinstrap elongation and displacement.' },
        { clause: 'Clause 9.4', title: 'Retention system detachment (roll-off) test', description: 'Rotational dislodgement evaluation ensuring helmet stays securely positioned on headform.' },
        { clause: 'Clause 9.5', title: 'Conditioning tests', description: 'Impact testing after thermal conditioning at ambient, heat (+50°C), cold (-20°C), and water immersion.' },
        { clause: 'Clause 9.6', title: 'Visor testing (where fitted)', description: 'Evaluation of luminous transmittance, refractive distortion, and scratch resistance.' }
      ],
      related_testing_standard: CURATED_TESTING_STANDARD_HELMETS
    },
    related_testing_standard: CURATED_TESTING_STANDARD_HELMETS,
    // 5. Version Information
    versionStatus: {
      statusCategory: 'active',
      statusValue: 'Active',
      hasAmendments: true,
      amendmentCount: 3,
      amendmentInfo: ['Amendment No. 1', 'Amendment No. 2', 'Amendment No. 3'],
      isSuperseded: false,
      supersededBy: null,
      supersedes: 'IS 4151:1993 (Third Revision)',
      version: 'IS 4151:2015 (Fourth Revision)',
      publicationYear: 2015,
      reaffirmedYear: 2020,
      summary: 'Active Indian Standard for motorcycle protective helmets (Fourth Revision, Reaffirmed 2020).'
    },
    version_information: {
      status: 'Active',
      version: 'IS 4151:2015 (Fourth Revision)',
      publicationYear: 2015,
      reaffirmedYear: 2020,
      amendments: ['Amendment No. 1', 'Amendment No. 2', 'Amendment No. 3']
    },
    amendment_information: ['Amendment No. 1', 'Amendment No. 2', 'Amendment No. 3'],
    supersession_status: 'Active (Fourth Revision, supersedes IS 4151:1993)',
    // 6. Certification & Regulatory Information
    certification: {
      hasCertificationInfo: true,
      scheme: 'BIS Scheme-I / Standard Mark (ISI Licensing)',
      schemeDetected: true,
      requirementExplicit: true,
      requirementValue: 'Mandatory BIS Standard Mark under Section 129 of Motor Vehicles Act & Protective Helmets QCO',
      qcoOrder: 'Two Wheeler Mass Transit and Protective Helmets (Quality Control) Order',
      regulatoryRequirement: 'Under Section 129 of the Motor Vehicles Act, 1988, every person driving or riding a two-wheeler motorcycle shall wear protective headgear conforming to standards specified by BIS.',
      dataContext: 'authoritative_bis'
    },
    certification_information: {
      hasCertificationInfo: true,
      scheme: 'BIS Scheme-I / Standard Mark (ISI Licensing)',
      requirementExplicit: true,
      requirementValue: 'Mandatory BIS Standard Mark under Section 129 of Motor Vehicles Act & Protective Helmets QCO'
    },
    regulatory_information: 'Mandatory BIS Standard Mark certification under Section 129 of the Motor Vehicles Act, 1988 and Two Wheeler Protective Helmets Quality Control Order.',
    // 7. Related / Normative Standards
    related_standards: {
      testEquipment: [
        {
          is_number: 'IS 7692',
          title: 'Specification for headforms for testing of helmets',
          category: 'Test Equipment Related',
          direction: 'Outgoing Reference',
          source: 'BIS Testing Guidelines',
          description: 'Specifies anatomical headforms used for impact absorption drop testing and dynamic retention testing.'
        }
      ],
      relatedHelmetProducts: [
        {
          is_number: 'IS 2925',
          title: 'Specification for industrial safety helmets',
          category: 'Related Helmet Product',
          direction: 'Allied Sibling',
          source: 'BIS Catalogue',
          description: 'Industrial safety helmet standard providing vertical impact protection for workplace hazards (distinct from vehicular road helmets).'
        },
        {
          is_number: 'IS 2745',
          title: 'Specification for non-metal helmet for firemen and civil defence personnel',
          category: 'Related Helmet Product',
          direction: 'Allied Sibling',
          source: 'BIS Catalogue',
          description: 'Standard for emergency firefighting and rescue protective headgear.'
        }
      ],
      relatedComponents: [
        {
          is_number: 'IS 9973',
          title: 'Specification for visor for scooter helmets',
          category: 'Related Helmet Component',
          direction: 'Allied Component',
          source: 'BIS Catalogue',
          description: 'Optical, mechanical, and abrasion requirements for transparent visors mounted on two-wheeler helmets.'
        }
      ]
    },
    relatedStandardsData: {
      testEquipment: [
        {
          is_number: 'IS 7692',
          title: 'Specification for headforms for testing of helmets',
          category: 'Test Equipment Related',
          direction: 'Outgoing Reference',
          source: 'BIS Testing Guidelines',
          description: 'Specifies anatomical headforms used for impact absorption drop testing and dynamic retention testing.'
        }
      ],
      relatedHelmetProducts: [
        {
          is_number: 'IS 2925',
          title: 'Specification for industrial safety helmets',
          category: 'Related Helmet Product',
          direction: 'Allied Sibling',
          source: 'BIS Catalogue',
          description: 'Industrial safety helmet standard providing vertical impact protection for workplace hazards (distinct from vehicular road helmets).'
        }
      ],
      relatedComponents: [
        {
          is_number: 'IS 9973',
          title: 'Specification for visor for scooter helmets',
          category: 'Related Helmet Component',
          direction: 'Allied Component',
          source: 'BIS Catalogue',
          description: 'Optical, mechanical, and abrasion requirements for transparent visors mounted on two-wheeler helmets.'
        }
      ]
    },
    relatedStandards: [
      {
        relationship_type: 'test_equipment',
        is_mandatory: false,
        source: 'BIS Helmet Publications',
        standard: {
          id: 7692,
          is_number: 'IS 7692',
          title: 'Specification for headforms for testing of helmets',
          status: 'Active',
          category: 'Test Equipment'
        }
      },
      {
        relationship_type: 'allied_product',
        is_mandatory: false,
        source: 'BIS Catalogue',
        standard: {
          id: 2925,
          is_number: 'IS 2925:1984',
          title: 'Specification for Industrial Safety Helmets',
          status: 'Active',
          category: 'Primary Standard'
        }
      },
      {
        relationship_type: 'allied_component',
        is_mandatory: false,
        source: 'BIS Catalogue',
        standard: {
          id: 9973,
          is_number: 'IS 9973',
          title: 'Specification for visor for scooter helmets',
          status: 'Active',
          category: 'Related Helmet Component'
        }
      }
    ],
    // 8. Gap Detection
    gapDetection: {
      hasGap: true,
      gapTitle: 'ALLIED VEHICULAR STANDARD — SPECIFICATION GAP',
      gapStatus: 'Allied Standard — Specification Divergence',
      gapDescription: 'IS 4151:2015 is formulated for vehicular road safety and specifies kerbstone anvil drop impact and dynamic roll-off retention. While allied as protective headgear, it does not certify against industrial vertical penetration, overhead drop hazards, or industrial high-voltage electrical resistance specified in IS 2925:1984.',
      potentialReferences: [
        {
          is_number: 'IS 2925',
          title: 'Specification for industrial safety helmets',
          role: 'Required for industrial construction worksite head protection.'
        }
      ],
      gapDisclaimer: 'Note: This observation clarifies domain distinction between vehicular road safety headgear and industrial workplace safety headgear.'
    },
    gaps: {
      hasGap: true,
      gapTitle: 'ALLIED VEHICULAR STANDARD — SPECIFICATION GAP',
      gapStatus: 'Allied Standard — Specification Divergence',
      gapDescription: 'IS 4151:2015 is formulated for vehicular road safety and specifies kerbstone anvil drop impact and dynamic roll-off retention. While allied as protective headgear, it does not certify against industrial vertical penetration, overhead drop hazards, or industrial high-voltage electrical resistance specified in IS 2925:1984.',
      potentialReferences: [
        {
          is_number: 'IS 2925',
          title: 'Specification for industrial safety helmets',
          role: 'Required for industrial construction worksite head protection.'
        }
      ]
    },
    // 9. AI Grounded Explanation & Evidence
    evidence: [
      'Allied protective headgear product category overlap in BIS catalogue',
      'Kinetic impact attenuation and head retention requirements',
      'Mandatory BIS Scheme-I Standard Mark certification framework'
    ],
    explanation: {
      whyRelevant: 'IS 4151:2015 (Protective Helmets for Motorcycle Riders) is identified as an allied Indian Standard in the protective headgear domain. It provides extensive specifications for kinetic impact attenuation and head retention, but is specifically engineered for two-wheeler vehicular riders on roads rather than industrial construction workplace hazards.',
      evidence: [
        'Allied protective headgear product category overlap in BIS catalogue',
        'Kinetic impact attenuation and head retention requirements',
        'Mandatory BIS Scheme-I Standard Mark certification framework'
      ]
    },
    sources: [
      'BIS e-Sale Portal Standard Listing (IS 4151:2015, Fourth Revision, Reaffirmed 2020)',
      'Motor Vehicles Act, 1988 (Section 129) and Central Motor Vehicles Rules',
      'BIS LIMS Laboratory Testing Protocols for Two-Wheeler Helmets'
    ],
    source: 'BIS Catalogue for IS 4151:2015; Motor Vehicles Act, 1988',
    dataContext: 'authoritative_curated_demo',
    isPrimary: false
  };

  // Curated BIS Authoritative Record for IS 2745:1983 (Firemen & Civil Defence Helmets)
  const rec3 = {
    standardId: 2745,
    id: 2745,
    is_number: 'IS 2745:1983',
    title: 'Specification for Non-Metal Helmet for Firemen and Civil Defence Personnel',
    category: 'Personal Protective Equipment / Emergency Services',
    application: 'Head protection for fire fighting personnel, civil defence forces, and emergency rescue workers.',
    scope: 'Covers requirements regarding material, design, construction, finish, and performance for non-metal helmets intended for fire fighting, rescue, and civil defence operations.',
    description: 'Indian Standard specifying requirements for non-metal protective helmets for firemen and civil defence personnel providing heat, impact, and flame protection.',
    rank: 3,
    final_score: 0.648,
    semantic_similarity: 0.65,
    text_match: 0.68,
    scope_match: 0.62,
    requirement_match: 0.60,
    scores: {
      semantic: 0.65,
      text: 0.68,
      scopeApplication: 0.62,
      structured: 0.60,
      structuredRequirement: 0.60,
      final: 0.648,
      rank: 3,
      displayLabel: 'Emergency Services Headgear Standard'
    },
    // 1. Technical Requirements
    technical_requirements: [
      'Shell: Heat-resistant, non-metallic composite shell providing thermal barrier and projectile deflection.',
      'Headband and cradle assembly: Flame-retardant harness providing structural standoff clearance from shell crown.',
      'Neck curtain / flap attachment: Protection against falling embers, sparks, and hot liquids.',
      'Chin strap with quick-release fastener: Secure retention under operational emergency conditions.',
      'Reflective markings: High-visibility retro-reflective finish for low-light rescue operations.',
      'Workmanship and finish: Smooth non-conductive surfaces free from hazardous burrs or defects.',
      'Mass: Controlled mass ensuring operational mobility during prolonged emergency response.'
    ],
    technicalRequirements: [
      'Shell: Heat-resistant, non-metallic composite shell providing thermal barrier and projectile deflection.',
      'Headband and cradle assembly: Flame-retardant harness providing structural standoff clearance from shell crown.',
      'Neck curtain / flap attachment: Protection against falling embers, sparks, and hot liquids.',
      'Chin strap with quick-release fastener: Secure retention under operational emergency conditions.',
      'Reflective markings: High-visibility retro-reflective finish for low-light rescue operations.',
      'Workmanship and finish: Smooth non-conductive surfaces free from hazardous burrs or defects.',
      'Mass: Controlled mass ensuring operational mobility during prolonged emergency response.'
    ],
    // 2. Performance Requirements
    performance_requirements: [
      'Shock absorption resistance under elevated thermal radiant conditioning',
      'Penetration resistance under thermal and ambient exposure',
      'Flammability resistance (self-extinguishing after direct Bunsen burner flame exposure)',
      'Electrical insulation resistance (high-voltage protection against fallen power lines)',
      'Radiant heat resistance (mitigation of heat transfer to wearer skull)',
      'Water absorption resistance'
    ],
    performanceRequirements: [
      'Shock absorption resistance under elevated thermal radiant conditioning',
      'Penetration resistance under thermal and ambient exposure',
      'Flammability resistance (self-extinguishing after direct Bunsen burner flame exposure)',
      'Electrical insulation resistance (high-voltage protection against fallen power lines)',
      'Radiant heat resistance (mitigation of heat transfer to wearer skull)',
      'Water absorption resistance'
    ],
    // 3. Safety Requirements
    safety_requirements: [
      'Thermal barrier protection against radiant heat and burning embers in firefighting',
      'Mechanical impact and falling masonry hazard protection during structural rescue',
      'Electrical shock protection from accidental contact with exposed live overhead wiring',
      'Molten debris deflection without thermoplastic melting onto wearer head',
      'Secure retention during energetic rescue maneuvers'
    ],
    safetyRequirements: [
      'Thermal barrier protection against radiant heat and burning embers in firefighting',
      'Mechanical impact and falling masonry hazard protection during structural rescue',
      'Electrical shock protection from accidental contact with exposed live overhead wiring',
      'Molten debris deflection without thermoplastic melting onto wearer head',
      'Secure retention during energetic rescue maneuvers'
    ],
    // 4. Testing Requirements
    testing_requirements: [
      { clause: 'Clause 6', title: 'Design and construction', description: 'Inspection of non-metallic shell, standoff clearance, and neck curtain mountings.' },
      { clause: 'Clause 7.1', title: 'Shock absorption test', description: 'Drop striker impact test onto headform measuring peak transmitted force after thermal radiant exposure.' },
      { clause: 'Clause 7.2', title: 'Penetration test', description: 'Drop test with conical steel striker on shell crown after oven conditioning.' },
      { clause: 'Clause 7.3', title: 'Flammability test', description: 'Direct burner flame exposure evaluating self-extinguishing duration and afterglow.' },
      { clause: 'Clause 7.4', title: 'Electrical proof test', description: 'Immersion high-voltage insulation test to evaluate leakage current resistance.' },
      { clause: 'Clause 7.5', title: 'Radiant heat test', description: 'Radiant thermal panel exposure test measuring interior temperature rise.' }
    ],
    testingRequirements: [
      { clause: 'Clause 6', title: 'Design and construction', description: 'Inspection of non-metallic shell, standoff clearance, and neck curtain mountings.' },
      { clause: 'Clause 7.1', title: 'Shock absorption test', description: 'Drop striker impact test onto headform measuring peak transmitted force after thermal radiant exposure.' },
      { clause: 'Clause 7.2', title: 'Penetration test', description: 'Drop test with conical steel striker on shell crown after oven conditioning.' },
      { clause: 'Clause 7.3', title: 'Flammability test', description: 'Direct burner flame exposure evaluating self-extinguishing duration and afterglow.' },
      { clause: 'Clause 7.4', title: 'Electrical proof test', description: 'Immersion high-voltage insulation test to evaluate leakage current resistance.' },
      { clause: 'Clause 7.5', title: 'Radiant heat test', description: 'Radiant thermal panel exposure test measuring interior temperature rise.' }
    ],
    // Standard-specific details object for Rank 3
    details: {
      scope: 'Covers requirements regarding material, design, construction, finish, and performance for non-metal helmets intended for fire fighting, rescue, and civil defence operations.',
      application: 'Head protection for fire fighting personnel, civil defence forces, and emergency rescue workers.',
      technical_requirements: [
        'Shell: Heat-resistant, non-metallic composite shell providing thermal barrier and projectile deflection.',
        'Headband and cradle assembly: Flame-retardant harness providing structural standoff clearance from shell crown.',
        'Neck curtain / flap attachment: Protection against falling embers, sparks, and hot liquids.',
        'Chin strap with quick-release fastener: Secure retention under operational emergency conditions.',
        'Reflective markings: High-visibility retro-reflective finish for low-light rescue operations.',
        'Workmanship and finish: Smooth non-conductive surfaces free from hazardous burrs or defects.',
        'Mass: Controlled mass ensuring operational mobility during prolonged emergency response.'
      ],
      technicalRequirements: [
        'Shell: Heat-resistant, non-metallic composite shell providing thermal barrier and projectile deflection.',
        'Headband and cradle assembly: Flame-retardant harness providing structural standoff clearance from shell crown.',
        'Neck curtain / flap attachment: Protection against falling embers, sparks, and hot liquids.',
        'Chin strap with quick-release fastener: Secure retention under operational emergency conditions.',
        'Reflective markings: High-visibility retro-reflective finish for low-light rescue operations.',
        'Workmanship and finish: Smooth non-conductive surfaces free from hazardous burrs or defects.',
        'Mass: Controlled mass ensuring operational mobility during prolonged emergency response.'
      ],
      performance_requirements: [
        'Shock absorption resistance under elevated thermal radiant conditioning',
        'Penetration resistance under thermal and ambient exposure',
        'Flammability resistance (self-extinguishing after direct Bunsen burner flame exposure)',
        'Electrical insulation resistance (high-voltage protection against fallen power lines)',
        'Radiant heat resistance (mitigation of heat transfer to wearer skull)',
        'Water absorption resistance'
      ],
      performanceRequirements: [
        'Shock absorption resistance under elevated thermal radiant conditioning',
        'Penetration resistance under thermal and ambient exposure',
        'Flammability resistance (self-extinguishing after direct Bunsen burner flame exposure)',
        'Electrical insulation resistance (high-voltage protection against fallen power lines)',
        'Radiant heat resistance (mitigation of heat transfer to wearer skull)',
        'Water absorption resistance'
      ],
      safety_requirements: [
        'Thermal barrier protection against radiant heat and burning embers in firefighting',
        'Mechanical impact and falling masonry hazard protection during structural rescue',
        'Electrical shock protection from accidental contact with exposed live overhead wiring',
        'Molten debris deflection without thermoplastic melting onto wearer head',
        'Secure retention during energetic rescue maneuvers'
      ],
      safetyRequirements: [
        'Thermal barrier protection against radiant heat and burning embers in firefighting',
        'Mechanical impact and falling masonry hazard protection during structural rescue',
        'Electrical shock protection from accidental contact with exposed live overhead wiring',
        'Molten debris deflection without thermoplastic melting onto wearer head',
        'Secure retention during energetic rescue maneuvers'
      ],
      testing_requirements: [
        { clause: 'Clause 6', title: 'Design and construction', description: 'Inspection of non-metallic shell, standoff clearance, and neck curtain mountings.' },
        { clause: 'Clause 7.1', title: 'Shock absorption test', description: 'Drop striker impact test onto headform measuring peak transmitted force after thermal radiant exposure.' },
        { clause: 'Clause 7.2', title: 'Penetration test', description: 'Drop test with conical steel striker on shell crown after oven conditioning.' },
        { clause: 'Clause 7.3', title: 'Flammability test', description: 'Direct burner flame exposure evaluating self-extinguishing duration and afterglow.' },
        { clause: 'Clause 7.4', title: 'Electrical proof test', description: 'Immersion high-voltage insulation test to evaluate leakage current resistance.' },
        { clause: 'Clause 7.5', title: 'Radiant heat test', description: 'Radiant thermal panel exposure test measuring interior temperature rise.' }
      ],
      testingRequirements: [
        { clause: 'Clause 6', title: 'Design and construction', description: 'Inspection of non-metallic shell, standoff clearance, and neck curtain mountings.' },
        { clause: 'Clause 7.1', title: 'Shock absorption test', description: 'Drop striker impact test onto headform measuring peak transmitted force after thermal radiant exposure.' },
        { clause: 'Clause 7.2', title: 'Penetration test', description: 'Drop test with conical steel striker on shell crown after oven conditioning.' },
        { clause: 'Clause 7.3', title: 'Flammability test', description: 'Direct burner flame exposure evaluating self-extinguishing duration and afterglow.' },
        { clause: 'Clause 7.4', title: 'Electrical proof test', description: 'Immersion high-voltage insulation test to evaluate leakage current resistance.' },
        { clause: 'Clause 7.5', title: 'Radiant heat test', description: 'Radiant thermal panel exposure test measuring interior temperature rise.' }
      ],
      related_testing_standard: CURATED_TESTING_STANDARD_HELMETS
    },
    related_testing_standard: CURATED_TESTING_STANDARD_HELMETS,
    // 5. Version Information
    versionStatus: {
      statusCategory: 'active',
      statusValue: 'Active',
      hasAmendments: true,
      amendmentCount: 3,
      amendmentInfo: ['Amendment No. 1', 'Amendment No. 2', 'Amendment No. 3'],
      isSuperseded: false,
      supersededBy: null,
      supersedes: 'IS 2745:1969',
      version: 'IS 2745:1983 (First Revision, Reaffirmed 2018)',
      publicationYear: 1983,
      reaffirmedYear: 2018,
      summary: 'Active Indian Standard for civil defence and firemen protective headgear (First Revision, Reaffirmed 2018).'
    },
    version_information: {
      status: 'Active',
      version: 'IS 2745:1983 (First Revision, Reaffirmed 2018)',
      publicationYear: 1983,
      reaffirmedYear: 2018,
      amendments: ['Amendment No. 1', 'Amendment No. 2', 'Amendment No. 3']
    },
    amendment_information: ['Amendment No. 1', 'Amendment No. 2', 'Amendment No. 3'],
    supersession_status: 'Active (First Revision, supersedes IS 2745:1969)',
    // 6. Certification & Regulatory Information
    certification: {
      hasCertificationInfo: true,
      scheme: 'BIS Scheme-I / Standard Mark',
      schemeDetected: true,
      requirementExplicit: true,
      requirementValue: 'Mandatory BIS Standard Mark under S.O. 4649(E) (Quality Control Order 2023)',
      qcoOrder: 'Helmet for Police Force, Civil Defence and Personal Protection (Quality Control) Order, 2023',
      gazetteNotification: 'S.O. 4649(E)',
      regulatoryRequirement: 'Covered under S.O. 4649(E) requiring BIS Standard Mark under Scheme-I for civil defence personnel helmets.',
      dataContext: 'authoritative_bis'
    },
    certification_information: {
      hasCertificationInfo: true,
      scheme: 'BIS Scheme-I / Standard Mark',
      requirementExplicit: true,
      requirementValue: 'Mandatory BIS Standard Mark under S.O. 4649(E) (Quality Control Order 2023)'
    },
    regulatory_information: 'Covered under S.O. 4649(E) (Helmet Quality Control Order, 2023) requiring BIS Standard Mark under Scheme-I for civil defence personnel helmets.',
    // 7. Related / Normative Standards
    related_standards: {
      testEquipment: [
        {
          is_number: 'IS 7692',
          title: 'Specification for headforms for testing of helmets',
          category: 'Test Equipment Related',
          direction: 'Outgoing Reference',
          source: 'BIS Testing Guidelines',
          description: 'Anatomical headforms used for impact drop and thermal testing.'
        }
      ],
      relatedHelmetProducts: [
        {
          is_number: 'IS 2925',
          title: 'Specification for industrial safety helmets',
          category: 'Related Helmet Product',
          direction: 'Allied Sibling',
          source: 'BIS Catalogue',
          description: 'Industrial workplace headgear standard providing vertical mechanical protection.'
        },
        {
          is_number: 'IS 9562',
          title: 'Specification for non-metal helmet for police force',
          category: 'Related Helmet Product',
          direction: 'Allied Sibling',
          source: 'BIS Catalogue',
          description: 'Tactical police and security personnel riot headgear.'
        }
      ],
      relatedComponents: [
        {
          is_number: 'IS 9995',
          title: 'Specification for visor for non-metal police and firemen\'s helmets',
          category: 'Related Helmet Component',
          direction: 'Allied Component',
          source: 'BIS Catalogue',
          description: 'Heat and impact resistant protective face visors.'
        }
      ]
    },
    relatedStandardsData: {
      testEquipment: [
        {
          is_number: 'IS 7692',
          title: 'Specification for headforms for testing of helmets',
          category: 'Test Equipment Related',
          direction: 'Outgoing Reference',
          source: 'BIS Testing Guidelines',
          description: 'Anatomical headforms used for impact drop and thermal testing.'
        }
      ],
      relatedHelmetProducts: [
        {
          is_number: 'IS 2925',
          title: 'Specification for industrial safety helmets',
          category: 'Related Helmet Product',
          direction: 'Allied Sibling',
          source: 'BIS Catalogue',
          description: 'Industrial workplace headgear standard.'
        }
      ],
      relatedComponents: [
        {
          is_number: 'IS 9995',
          title: 'Specification for visor for non-metal police and firemen\'s helmets',
          category: 'Related Helmet Component',
          direction: 'Allied Component',
          source: 'BIS Catalogue',
          description: 'Heat and impact resistant protective face visors.'
        }
      ]
    },
    relatedStandards: [
      {
        relationship_type: 'test_equipment',
        is_mandatory: false,
        source: 'BIS Helmet Publications',
        standard: {
          id: 7692,
          is_number: 'IS 7692',
          title: 'Specification for headforms for testing of helmets',
          status: 'Active',
          category: 'Test Equipment'
        }
      },
      {
        relationship_type: 'allied_product',
        is_mandatory: false,
        source: 'BIS Catalogue',
        standard: {
          id: 2925,
          is_number: 'IS 2925:1984',
          title: 'Specification for Industrial Safety Helmets',
          status: 'Active',
          category: 'Primary Standard'
        }
      },
      {
        relationship_type: 'allied_component',
        is_mandatory: false,
        source: 'BIS Catalogue',
        standard: {
          id: 9995,
          is_number: 'IS 9995',
          title: 'Specification for visor for non-metal police and firemen\'s helmets',
          status: 'Active',
          category: 'Related Helmet Component'
        }
      }
    ],
    // 8. Gap Detection
    gapDetection: {
      hasGap: true,
      gapTitle: 'SPECIALIZED RESCUE STANDARD — ERGONOMIC DIVERGENCE',
      gapStatus: 'Emergency Service Allied Standard',
      gapDescription: 'IS 2745:1983 is designed for structural firefighting and rescue. It features heavy thermal composite layups and neck curtains that exceed industrial requirements while lacking the ventilated daily ergonomics and mass constraints of IS 2925:1984.',
      potentialReferences: [
        {
          is_number: 'IS 2925',
          title: 'Specification for industrial safety helmets',
          role: 'Primary standard for routine construction and factory workplace head protection.'
        }
      ],
      gapDisclaimer: 'Note: This observation highlights specialized emergency service requirements for human evaluation.'
    },
    gaps: {
      hasGap: true,
      gapTitle: 'SPECIALIZED RESCUE STANDARD — ERGONOMIC DIVERGENCE',
      gapStatus: 'Emergency Service Allied Standard',
      gapDescription: 'IS 2745:1983 is designed for structural firefighting and rescue. It features heavy thermal composite layups and neck curtains that exceed industrial requirements while lacking the ventilated daily ergonomics and mass constraints of IS 2925:1984.',
      potentialReferences: [
        {
          is_number: 'IS 2925',
          title: 'Specification for industrial safety helmets',
          role: 'Primary standard for routine construction and factory workplace head protection.'
        }
      ]
    },
    // 9. AI Grounded Explanation & Evidence
    evidence: [
      'Personal protective emergency headgear alignment in BIS catalogue',
      'Thermal radiant, flame, and ember resistance requirements',
      'Quality Control Order S.O. 4649(E) regulatory coverage'
    ],
    explanation: {
      whyRelevant: 'IS 2745:1983 (Specification for Non-Metal Helmet for Firemen and Civil Defence Personnel) is identified as an allied Indian Standard in emergency services personal protection. It covers high-temperature thermal resistance, flame retardance, and impact protection for civil defence and rescue personnel, distinct from routine industrial workplace headgear.',
      evidence: [
        'Personal protective emergency headgear alignment in BIS catalogue',
        'Thermal radiant, flame, and ember resistance requirements',
        'Quality Control Order S.O. 4649(E) regulatory coverage'
      ]
    },
    sources: [
      'BIS e-Sale Portal Standard Listing (IS 2745:1983, First Revision, Reaffirmed 2018)',
      'Helmet Quality Control Order, 2023 (Gazette Notification S.O. 4649(E))',
      'BIS Testing Methods for Emergency and Firefighting Headgear'
    ],
    source: 'BIS Catalogue for IS 2745:1983; Helmet Quality Control Order S.O. 4649(E)',
    dataContext: 'authoritative_curated_demo',
    isPrimary: false
  };

  const topRecommendations = [rec, rec2, rec3];

  return {
    success: true,
    query: query,
    originalQuery: query,
    multilingual: langMeta,
    count: topRecommendations.length,
    recommendations: topRecommendations,
    primaryStandard: rec,
    summary: 'IS 2925:1984 Specification for Industrial Safety Helmets identified as the primary relevant Indian Standard based on verified BIS product manual, e-Sale listing, and Quality Control Order (QCO) records.',
    limitations: [],
    explanationGenerated: true,
    demoProfile: 'industrial_safety_helmet',
    isCuratedDemo: true
  };
}

/**
 * Synthetic demonstration tender text for nirdeshak_demo_tender_industrial_safety_helmets.pdf
 */
const DEMO_HELMET_TENDER_TEXT = `STATE INFRASTRUCTURE DEVELOPMENT CORPORATION
NOTICE INVITING TENDER: Supply of Industrial Safety Helmets for Construction Site Workers
Tender Reference No: SIDC/PROC/2026/PPE-HELMET-084
Procurement Quantity: 5,000 Units

1. SCOPE OF PROCUREMENT:
Supply and delivery of 5,000 units of Industrial Safety Helmets with shell and harness, suitable for construction-site workers and field engineers deployed on major civil infrastructure works. The helmets must provide protection against mechanical impact, falling objects, and industrial workplace hazards.

2. TECHNICAL & PERFORMANCE SPECIFICATIONS:
- Product: Industrial safety helmet with shell and harness, suitable for construction-site workers.
- Application: Construction / industrial work environments requiring personal head protection.
- Worker Population: Civil engineering site workers, scaffolding personnel, and heavy machinery operators.
- Hazards: Mechanical impact, falling objects, lateral deformation hazards, high ambient thermal exposure.
- Requirements: Mechanical impact protection, falling-object protection, shell, harness, size, construction, workmanship, mass, shock absorption, penetration, flammability, electrical resistance, water absorption, heat resistance.
- Sizes: Standard head sizes 520, 530, 540, 550, 560, 570, 580, 590, 600 mm or declared size range.
- Workmanship and Finish: Smooth internal and external surfaces free from sharp edges, burrs, or molding defects.
- Mass: Controlled lightweight design satisfying maximum mass requirements excluding accessories.
- Shock Absorption Resistance: Capable of absorbing impact energy from falling objects.
- Penetration Resistance: Resistant to penetration by sharp conical strikers dropped under standard test conditions.
- Flammability Resistance: Materials must demonstrate self-extinguishing flame resistance upon burner exposure.
- Electrical Resistance: Insulation providing resistance against electrical hazards and leakage current.
- Water Absorption: Shell material resistant to water absorption upon prolonged immersion.
- Heat Resistance: Retains structural integrity and performance after accelerated thermal exposure.

3. TESTING & QUALITY CONFORMANCE:
Helmets shall be tested for sizes (Clause 4), construction (Clause 5), workmanship and finish (Clause 6), mass (Clause 7), shock absorption resistance (Clause 8.1), penetration resistance (Clause 8.2), flammability resistance (Clause 8.3), electrical resistance (Clause 8.4), water absorption (Clause 8.5), and heat resistance (Clause 8.6).

4. REGULATORY & STATUTORY COMPLIANCE:
Compliance with applicable Indian Standard (IS 2925:1984) and Helmet Quality Control Order (QCO) bearing BIS Standard Mark under a valid BIS licence.`;

/**
 * Curated extracted requirements for the industrial safety helmet demo profile.
 * Conforms strictly to the 12-key requirement extraction schema.
 */
function getCuratedHelmetExtractedRequirements(inputType = 'general', text = '') {
  const langMeta = detectAndNormalizeQuery(text);

  return {
    product_name: 'Industrial Safety Helmet',
    product_category: 'Industrial Safety / Personal Protective Equipment',
    application: 'Construction / industrial workplaces requiring personal head protection',
    procurement_quantity: '5,000 Units',
    worker_population: 'Civil construction workers and industrial personnel',
    hazards: 'Mechanical impact, falling objects, electrical hazards, thermal exposure',
    technical_requirements: [
      'Shell and harness construction',
      'Mechanical impact protection',
      'Falling-object protection',
      'Head retention and clearance',
      'Sizes: 520, 530, 540, 550, 560, 570, 580, 590, 600 mm',
      'Workmanship and smooth finish free from sharp burrs',
      'Controlled lightweight mass'
    ],
    materials: [
      'High-density structural shell with adjustable headband and harness'
    ],
    performance_requirements: [
      'Shock absorption resistance',
      'Penetration resistance',
      'Flammability resistance',
      'Electrical resistance',
      'Water absorption resistance',
      'Heat resistance'
    ],
    dimensions: [
      'Sizes: 520, 530, 540, 550, 560, 570, 580, 590, 600 mm or declared size range'
    ],
    environmental_conditions: [
      'Thermal exposure resistance',
      'Water immersion exposure'
    ],
    safety_requirements: [
      'Protection against mechanical impact',
      'Protection against penetration',
      'Flammability resistance',
      'Electrical resistance',
      'Heat resistance',
      'Water absorption'
    ],
    testing_requirements: [
      'Clause 4 — Sizes',
      'Clause 5 — Construction',
      'Clause 6 — Workmanship and finish',
      'Clause 7 — Mass',
      'Clause 8.1 — Shock absorption resistance',
      'Clause 8.2 — Penetration resistance',
      'Clause 8.3 — Flammability resistance',
      'Clause 8.4 — Electrical resistance',
      'Clause 8.5 — Water absorption',
      'Clause 8.6 — Heat resistance'
    ],
    certification_requirements: [
      'BIS Scheme-I / Standard Mark (ISI mark)',
      'Helmet Quality Control Order, 2023 (S.O. 4649(E))'
    ],
    existing_references: [
      'IS 2925:1984'
    ],
    potential_reference_gap: {
      hasGap: true,
      notice: 'The requirement specifies testing and quality parameters but does not explicitly cite supporting test-equipment (IS 7692) or sampling (IS 9695) standards.',
      supportingReferences: ['IS 7692', 'IS 9695']
    },
    multilingual: langMeta,
    important_keywords: [
      'industrial safety helmet',
      'head protection',
      'construction workers',
      'impact protection',
      'penetration resistance',
      'shock absorption',
      'IS 2925'
    ]
  };
}

module.exports = {
  isDemoModeActive,
  CURATED_HELMET_STANDARD,
  DEMO_HELMET_TENDER_TEXT,
  isHelmetQuery,
  detectAndNormalizeQuery,
  getCuratedHelmetExtractedRequirements,
  getCuratedHelmetRecommendation
};
