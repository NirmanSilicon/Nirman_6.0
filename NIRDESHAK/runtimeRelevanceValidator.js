// ============================================================================
// NIRDESHAK - Runtime Product & Indian Standard Relevance Validator
// Implements deterministic relevance gating across all 17 BIS Division Councils:
// 1. Confirms technical product-standard relationship
// 2. Classifies relationship (Primary vs Allied Supporting vs Material vs Test vs Safety)
// 3. Validates cross-domain compatibility (allows legitimate allied; rejects false links)
// 4. Filters out invalid, ungrounded, or cross-contaminated candidate standards
// ============================================================================

const COUNCIL_NORMALIZATION_MAP = {
  'AYD': 'AYUSH',
  'AYUSH': 'AYUSH',
  'CHD': 'CHEMICAL',
  'CHEMICAL': 'CHEMICAL',
  'CED': 'CIVIL ENGINEERING',
  'CIVIL ENGINEERING': 'CIVIL ENGINEERING',
  'LITD': 'ELECTRONICS AND INFORMATION TECHNOLOGY',
  'ELECTRONICS AND INFORMATION TECHNOLOGY': 'ELECTRONICS AND INFORMATION TECHNOLOGY',
  'ETD': 'ELECTROTECHNICAL',
  'ELECTROTECHNICAL': 'ELECTROTECHNICAL',
  'EED': 'ENVIRONMENT AND ECOLOGY',
  'ENVIRONMENT AND ECOLOGY': 'ENVIRONMENT AND ECOLOGY',
  'FAD': 'FOOD AND AGRICULTURE',
  'FOOD AND AGRICULTURE': 'FOOD AND AGRICULTURE',
  'MSD': 'MANAGEMENT AND SYSTEMS',
  'MANAGEMENT AND SYSTEMS': 'MANAGEMENT AND SYSTEMS',
  'MED': 'MECHANICAL ENGINEERING',
  'MECHANICAL ENGINEERING': 'MECHANICAL ENGINEERING',
  'MHD': 'MEDICAL EQUIPMENT AND HOSPITAL PLANNING',
  'MEDICAL EQUIPMENT AND HOSPITAL PLANNING': 'MEDICAL EQUIPMENT AND HOSPITAL PLANNING',
  'MTD': 'METALLURGICAL ENGINEERING',
  'METALLURGICAL ENGINEERING': 'METALLURGICAL ENGINEERING',
  'PCD': 'PETROLEUM, COAL AND RELATED PRODUCTS',
  'PETROLEUM, COAL AND RELATED PRODUCTS': 'PETROLEUM, COAL AND RELATED PRODUCTS',
  'PGD': 'PRODUCTION AND GENERAL ENGINEERING',
  'PRODUCTION AND GENERAL ENGINEERING': 'PRODUCTION AND GENERAL ENGINEERING',
  'SSD': 'SERVICE SECTOR',
  'SERVICE SECTOR': 'SERVICE SECTOR',
  'TXD': 'TEXTILES',
  'TEXTILES': 'TEXTILES',
  'TED': 'TRANSPORT ENGINEERING',
  'TRANSPORT ENGINEERING': 'TRANSPORT ENGINEERING',
  'WRD': 'WATER RESOURCES',
  'WATER RESOURCES': 'WATER RESOURCES'
};

function normalizeCouncil(str) {
  if (!str || typeof str !== 'string') return '';
  const trimmed = str.trim().toUpperCase();
  return COUNCIL_NORMALIZATION_MAP[trimmed] || trimmed;
}

/**
 * Known structural domain incompatibilities.
 * Prevents false semantic bleed where high vector similarity overrides technical domain boundaries.
 */
const DOMAIN_INCOMPATIBILITY_RULES = [
  {
    // Medical disposable items / syringes / needles / surgical tools -> Non-medical physical goods
    id: 'medical_disposable_mismatch',
    standardPattern: /(?:hypodermic syringe|catheter|needle|implant|blood bag|infusion|surgical blade|dialyzer)/i,
    standardNumbers: ['IS 10258', 'IS 13422', 'IS 3722', 'IS 3317', 'IS 10654'],
    incompatibleProductCouncils: [
      'TRANSPORT ENGINEERING', 'METALLURGICAL ENGINEERING', 'CIVIL ENGINEERING',
      'ELECTROTECHNICAL', 'WATER RESOURCES', 'PRODUCTION AND GENERAL ENGINEERING',
      'ENVIRONMENT AND ECOLOGY', 'AYUSH', 'FOOD AND AGRICULTURE', 'TEXTILES',
      'CHEMICAL', 'MANAGEMENT AND SYSTEMS', 'SERVICE SECTOR',
      'ELECTRONICS AND INFORMATION TECHNOLOGY', 'MECHANICAL ENGINEERING',
      'PETROLEUM, COAL AND RELATED PRODUCTS'
    ],
    allowedProductKeywords: ['syringe', 'needle', 'hypodermic', 'clinical injection', 'infusion', 'surgical blade', 'dialyzer'],
    reason: 'Medical disposable apparatus standards do not apply to automotive, civil, metallurgical, electrical, food, textile, environmental, chemical, or agricultural products.'
  },
  {
    // Road vehicle glazing / automotive safety glass -> Non-glazing vehicle hardware or general products
    id: 'road_glazing_mismatch',
    standardPattern: /(?:safety glass for road transport|road vehicles.*safety glass|windscreens? and windows)/i,
    standardNumbers: ['IS 2553 (Part 2)'],
    incompatibleProductCouncils: [
      'ELECTROTECHNICAL', 'ENVIRONMENT AND ECOLOGY', 'WATER RESOURCES', 'TEXTILES',
      'FOOD AND AGRICULTURE', 'AYUSH', 'MEDICAL EQUIPMENT AND HOSPITAL PLANNING',
      'MANAGEMENT AND SYSTEMS', 'MECHANICAL ENGINEERING', 'TRANSPORT ENGINEERING',
      'CIVIL ENGINEERING', 'METALLURGICAL ENGINEERING', 'CHEMICAL', 'SERVICE SECTOR', 'SSD'
    ],
    allowedProductKeywords: ['glass', 'glazing', 'windscreen', 'windshield', 'window pane', 'window glass', 'safety glass'],
    reason: 'Road vehicle safety glass specifications (IS 2553 Part 2) apply exclusively to transparent glazing materials (windshields/windows) and do not apply to tyres, seat belts, leaf springs, mirrors, airbags, or non-vehicle systems.'
  },
  {
    // Industrial Sluice / Water Works Valves -> Food, agriculture or consumer commodities
    id: 'industrial_valve_mismatch',
    standardPattern: /(?:sluice valves? for water works|gate valves?|check valves?|butterfly valves?)/i,
    standardNumbers: ['IS 14846', 'IS 778', 'IS 13095'],
    incompatibleProductCouncils: [
      'FOOD AND AGRICULTURE', 'TEXTILES', 'AYUSH', 'MEDICAL EQUIPMENT AND HOSPITAL PLANNING',
      'ELECTRONICS AND INFORMATION TECHNOLOGY', 'MANAGEMENT AND SYSTEMS', 'CHEMICAL'
    ],
    allowedProductKeywords: ['valve', 'pipeline', 'sluice', 'fluid', 'plumbing', 'water works', 'conduit', 'water supply'],
    reason: 'Industrial sluice/water valve standards do not apply to food products, textiles, chemicals, or consumer goods.'
  },
  {
    // Underwear / Apparel textiles -> Civil flooring / infrastructure
    id: 'apparel_underwear_mismatch',
    standardPattern: /(?:knitted thermal underwear|vests? and briefs?|undergarments?)/i,
    standardNumbers: ['IS 16738'],
    incompatibleProductCouncils: ['CED', 'ETD', 'MED', 'MTD', 'WRD'],
    allowedProductKeywords: ['underwear', 'thermal wear', 'knitwear', 'garment', 'apparel', 'textile'],
    reason: 'Thermal underwear textile specifications do not apply to civil building materials, flooring, or masonry.'
  },
  {
    // Cleanroom apparel fabrics -> Environmental oil spill booms
    id: 'cleanroom_oil_boom_mismatch',
    standardPattern: /(?:cleanroom apparel fabrics)/i,
    standardNumbers: ['IS 16890'],
    incompatibleProductCouncils: ['EED', 'WRD', 'CED', 'MED'],
    allowedProductKeywords: ['cleanroom', 'apparel', 'protective clothing', 'lint-free', 'garment'],
    reason: 'Cleanroom apparel fabric standard does not apply to environmental oil spill containment booms.'
  },
  {
    // Solar thermal water heaters -> Solar electrical PV cables
    id: 'solar_thermal_vs_pv_cable',
    standardPattern: /(?:solar flat plate collectors|solar water heating)/i,
    standardNumbers: ['IS 15758'],
    incompatibleProductCouncils: ['ETD'],
    allowedProductKeywords: ['collector', 'water heater', 'thermal', 'water heating'],
    reason: 'Thermal solar water heating collector standard does not apply to electrical DC photovoltaic cables.'
  },
  {
    // Medical electrical equipment -> Non-medical architectural doors & windows
    id: 'medical_electrical_vs_civil',
    standardPattern: /(?:medical electrical equipment.*basic safety)/i,
    standardNumbers: ['IS 13450'],
    incompatibleProductCouncils: ['CED', 'MTD'],
    allowedProductKeywords: ['medical', 'hospital', 'clinical', 'ventilator', 'diagnostic', 'patient', 'patient monitoring'],
    reason: 'Medical electrical safety standards (IS 13450) do not apply to architectural civil doors, windows, or building hardware.'
  }
];

/**
 * Checks whether a candidate standard is conclusively invalid for a product family.
 * @param {string} productName Canonical product family name
 * @param {string} productCouncil BIS Division Council of product (e.g. 'TED', 'CED', 'ETD')
 * @param {string} isNumber Standard number (e.g. 'IS 10258:2002')
 * @param {string} standardTitle Official title of standard
 * @param {string} standardCouncil Division council of standard
 * @returns {{ isInvalid: boolean, reason: string|null }}
 */
function isConclusivelyInvalid(productName, productCouncil, isNumber, standardTitle, standardCouncil) {
  const pName = (productName || '').toLowerCase();
  const pCouncil = normalizeCouncil(productCouncil);
  const sTitle = (standardTitle || '').toLowerCase();
  const sNum = (isNumber || '').trim();

  for (const rule of DOMAIN_INCOMPATIBILITY_RULES) {
    // Check if standard matches rule
    const matchesNum = rule.standardNumbers.some(num => sNum.includes(num));
    const matchesPattern = rule.standardPattern.test(sTitle);

    if (matchesNum || matchesPattern) {
      // Check if product council is in the incompatible list
      const councilIncompatible = rule.incompatibleProductCouncils.some(c => pCouncil.includes(c));
      const hasAllowedKeyword = rule.allowedProductKeywords.some(kw => pName.includes(kw));

      if (councilIncompatible && !hasAllowedKeyword) {
        return {
          isInvalid: true,
          reason: rule.reason
        };
      }
    }
  }

  return { isInvalid: false, reason: null };
}

/**
 * Validates a product-to-standard relationship and classifies it into one of the 10 formal classifications:
 * 1. VERIFIED_PRIMARY
 * 2. VERIFIED_NORMATIVE_REFERENCE
 * 3. VERIFIED_TEST_METHOD
 * 4. VERIFIED_MATERIAL_STANDARD
 * 5. VERIFIED_SAFETY_STANDARD
 * 6. VERIFIED_INSTALLATION_STANDARD
 * 7. VERIFIED_SUPPORTING_REFERENCE
 * 8. CANDIDATE_UNVERIFIED
 * 9. INVALID_UNRELATED_MAPPING
 * 10. HISTORICAL_OR_SUPERSEDED_REFERENCE
 *
 * @param {Object} product Product family record
 * @param {Object} standard Standard record
 * @param {Object} [meta] Mapping metadata (relationship_type, confidence_score, evidence_source)
 * @returns {Object} Validation verdict and enriched classification
 */
function validateStandardRelevance(product, standard, meta = {}) {
  const pName = ((product && product.canonical_name) || (product && product.canonicalName) || '').toLowerCase();
  const pCouncil = ((product && product.division_council) || (product && product.divisionCouncil) || '').toUpperCase().trim();
  const sTitle = ((standard && standard.title) || '').toLowerCase();
  const sNum = ((standard && standard.is_number) || '').trim();
  const sCouncil = ((standard && standard.division_council) || (standard && standard.divisionCouncil) || '').toUpperCase().trim();
  const sStatus = ((standard && standard.status) || '').toUpperCase().trim();

  // 1. Check for conclusive domain incompatibility
  const invalidCheck = isConclusivelyInvalid(pName, pCouncil, sNum, sTitle, sCouncil);
  if (invalidCheck.isInvalid) {
    return {
      isValid: false,
      classification: 'INVALID_UNRELATED_MAPPING',
      relevanceScore: 0.0,
      isPrimary: false,
      isCrossDomain: true,
      isLegitimateCrossDomain: false,
      reason: invalidCheck.reason,
      recommendedAction: 'EXCLUDE_FROM_RECOMMENDATIONS'
    };
  }

  // 2. Check if historical/superseded
  if (sStatus === 'SUPERSEDED' || sStatus === 'WITHDRAWN') {
    return {
      isValid: true,
      classification: 'HISTORICAL_OR_SUPERSEDED_REFERENCE',
      relevanceScore: 0.7,
      isPrimary: false,
      isCrossDomain: pCouncil !== sCouncil,
      isLegitimateCrossDomain: true,
      reason: `Historical or superseded standard (${sStatus}). Check newer revision.`,
      recommendedAction: 'DISPLAY_WITH_SUPERSEDED_NOTICE'
    };
  }

  // 3. Classify relationship type
  const rawType = (meta && meta.relationship_type) || (meta && meta.relationshipType) || '';
  const lowerType = rawType.toLowerCase();

  let classification = 'VERIFIED_SUPPORTING_REFERENCE';
  let isPrimary = false;

  if (lowerType === 'primary_specification' || (standard && standard.is_primary_candidate)) {
    classification = 'VERIFIED_PRIMARY';
    isPrimary = true;
  } else if (lowerType === 'normative_reference') {
    classification = 'VERIFIED_NORMATIVE_REFERENCE';
  } else if (lowerType === 'test_method' || sTitle.includes('method of test') || sTitle.includes('testing')) {
    classification = 'VERIFIED_TEST_METHOD';
  } else if (lowerType.includes('material') || sTitle.includes('raw material') || sTitle.includes('specification for steel') || sTitle.includes('compound')) {
    classification = 'VERIFIED_MATERIAL_STANDARD';
  } else if (lowerType === 'safety_requirement' || sTitle.includes('safety') || sTitle.includes('protection') || sTitle.includes('fire safety')) {
    classification = 'VERIFIED_SAFETY_STANDARD';
  } else if (lowerType === 'code_of_practice' || lowerType === 'installation_requirement' || sTitle.includes('code of practice') || sTitle.includes('installation') || sTitle.includes('earthing')) {
    classification = 'VERIFIED_INSTALLATION_STANDARD';
  } else if ((meta && meta.verification_status === 'CANDIDATE') || (meta && meta.confidence_score < 0.65)) {
    classification = 'CANDIDATE_UNVERIFIED';
  }

  const isCrossDomain = pCouncil.length > 0 && sCouncil.length > 0 && pCouncil !== sCouncil;

  return {
    isValid: true,
    classification,
    relevanceScore: isPrimary ? 1.0 : (meta.confidence_score ? parseFloat(meta.confidence_score) : 0.85),
    isPrimary,
    isCrossDomain,
    isLegitimateCrossDomain: isCrossDomain, // Already passed invalidCheck
    reason: isPrimary ? 'Verified Primary Specification for Product' : 'Verified Legitimate Allied / Supporting Standard',
    recommendedAction: isPrimary ? 'DISPLAY_AS_PRIMARY' : 'DISPLAY_AS_ALLIED'
  };
}

/**
 * Validates and filters candidate recommendations before ranking and final presentation.
 * Excludes invalid mappings, tags primary vs allied, and separates supporting references.
 *
 * @param {Array<Object>} candidates Enriched candidate standards
 * @param {Array<Object>} resolvedFamilies Product families matched for the query
 * @returns {Array<Object>} Sanitized, validated candidates with verified relevance
 */
function filterAndValidateCandidates(candidates = [], resolvedFamilies = []) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return [];
  }

  const primaryProduct = resolvedFamilies.length > 0 ? resolvedFamilies[0] : null;

  const validCandidates = [];
  for (const cand of candidates) {
    const verdict = validateStandardRelevance(primaryProduct, cand, {
      relationship_type: cand.mappingRelationship || cand.relationship_type,
      confidence_score: cand.mappingConfidence || cand.confidence_score,
      verification_status: cand.verification_status
    });

    if (!verdict.isValid) {
      console.warn(`[RelevanceValidator]: Filtered invalid candidate ${cand.is_number} for product "${primaryProduct ? primaryProduct.canonicalName : 'unknown'}": ${verdict.reason}`);
      continue;
    }

    validCandidates.push({
      ...cand,
      relevanceVerdict: verdict,
      relationshipClassification: verdict.classification,
      isPrimarySpecification: verdict.isPrimary,
      isCrossDomainLegitimate: verdict.isLegitimateCrossDomain
    });
  }

  return validCandidates;
}

module.exports = {
  DOMAIN_INCOMPATIBILITY_RULES,
  isConclusivelyInvalid,
  validateStandardRelevance,
  filterAndValidateCandidates
};

