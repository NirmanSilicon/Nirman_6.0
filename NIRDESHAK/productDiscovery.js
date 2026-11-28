// ============================================================================
// NIRDESHAK - Product Discovery & Multi-Sector Recommendation Engine
// Step: Universal Product-to-Standard Discovery Pipeline (12 Steps)
//
// Pipeline:
// 1. Input normalization & multilingual tokenization (EN, HI, OR)
// 2. Product alias & synonym matching (product_aliases)
// 3. Division Council prediction & cross-domain routing (17 BIS Councils)
// 4. Product family resolution (product_families)
// 5. Master catalogue lookup (product_categories, product_sectors)
// 6. Standards database hybrid search (vector cosine similarity + text)
// 7. Product-to-standard mapping lookup (product_standard_mappings)
// 8. Supporting standards retrieval (standard_relationships)
// 9. Multi-signal relevance ranking (Semantic 60%, Text 20%, Scope 10%, Req 10%)
// 10. Relevance explanation generation
// 11. Version status & statutory QCO mandate check (regulatory_orders)
// 12. Transparent recommendation packaging with safe fallback
// ============================================================================

const { query } = require('./database');
const { searchStandards } = require('./semanticSearch');
const { rankStandards } = require('./ranking');
const { getRelatedStandardsForId } = require('./relatedStandards');
const { evaluateVersionStatus } = require('./versionCheck');
const { filterAndValidateCandidates } = require('./runtimeRelevanceValidator');

// 17 BIS Division Councils Reference
const BIS_DIVISION_COUNCILS = {
  AYD: { code: 'AYD', name: 'Ayush Division Council', number: 1 },
  CHD: { code: 'CHD', name: 'Chemical Division Council', number: 2 },
  CED: { code: 'CED', name: 'Civil Engineering Division Council', number: 3 },
  LITD: { code: 'LITD', name: 'Electronics and Information Technology Division Council', number: 4 },
  ETD: { code: 'ETD', name: 'Electrotechnical Division Council', number: 5 },
  EED: { code: 'EED', name: 'Energy Management Division Council', number: 6 },
  FAD: { code: 'FAD', name: 'Food and Agriculture Division Council', number: 7 },
  MSD: { code: 'MSD', name: 'Management and Systems Division Council', number: 8 },
  MED: { code: 'MED', name: 'Mechanical Engineering Division Council', number: 9 },
  MHD: { code: 'MHD', name: 'Medical Equipment and Hospital Planning Division Council', number: 10 },
  MTD: { code: 'MTD', name: 'Metallurgical Engineering Division Council', number: 11 },
  PCD: { code: 'PCD', name: 'Petroleum, Coal and Related Products Division Council', number: 12 },
  PGD: { code: 'PGD', name: 'Production and General Engineering Division Council', number: 13 },
  SSD: { code: 'SSD', name: 'Services Sector Division Council', number: 14 },
  TXD: { code: 'TXD', name: 'Textiles Division Council', number: 15 },
  TED: { code: 'TED', name: 'Transport Engineering Division Council', number: 16 },
  WRD: { code: 'WRD', name: 'Water Resources Division Council', number: 17 }
};

/**
 * Step 1: Input text normalization and language tokenization
 * Handles English, Hindi (Devanagari), and Odia (Oriya) text.
 * Preserves technical acronyms, model ratings, and standard prefixes.
 *
 * @param {string} text Raw user input
 * @returns {Object} Normalized tokens, detected language, and cleaned query string
 */
function normalizeInput(text) {
  if (!text || typeof text !== 'string') {
    return {
      normalizedQuery: '',
      language: 'en',
      tokens: [],
      acronyms: []
    };
  }

  const trimmed = text.trim();

  // Detect and normalize multilingual inputs (Devanagari, Odia)
  const { detectAndNormalizeQuery } = require('./demoProfile');
  const langDetection = detectAndNormalizeQuery(trimmed);
  let effectiveText = trimmed;
  let language = langDetection.languageCode || 'en';

  if (langDetection.isMultilingual && langDetection.normalizedQuery) {
    effectiveText = langDetection.normalizedQuery;
  }

  // Preserve technical acronyms (e.g. PVC, XLPE, LED, HDPE, MCB, RCCB, CCTV, TMT, GIS, OPC, PPC, VCB)
  const acronyms = [];
  const acronymMatches = effectiveText.match(/\b[A-Z0-9]{2,8}\b/g) || [];
  for (const ac of acronymMatches) {
    if (!['THE', 'FOR', 'AND', 'NOT', 'ARE', 'BUT'].includes(ac)) {
      acronyms.push(ac.toUpperCase());
    }
  }

  // Clean and lowercase query
  const clean = effectiveText
    .replace(/[^\w\s\-\.\,\/\u0900-\u097F\u0B00-\u0B7F]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Extract content tokens (length >= 3)
  const stopWords = new Set([
    'the', 'and', 'for', 'with', 'from', 'supply', 'procurement', 'providing', 'laying',
    'installation', 'specification', 'specifications', 'requirements', 'material', 'equipment',
    'works', 'project', 'standard', 'indian', 'tender', 'delivery', 'testing', 'commercial'
  ]);

  const rawTokens = clean.toLowerCase().split(/[\s\,\-\/]+/);
  const tokens = rawTokens.filter(t => t.length >= 3 && !stopWords.has(t));

  return {
    normalizedQuery: clean,
    language,
    tokens: [...new Set(tokens)],
    acronyms: [...new Set(acronyms)]
  };
}

/**
 * Step 2: Product alias and synonym matching
 * Searches `product_aliases` and `product_families` for exact and partial matches.
 *
 * @param {string} queryText
 * @param {Array<string>} tokens
 * @param {number} limit
 * @returns {Promise<Array<Object>>} Matched aliases with product family details
 */
async function matchProductAliases(queryText, tokens = [], limit = 5) {
  const cleanText = (queryText || '').toLowerCase().trim();
  if (!cleanText) return [];

  try {
    // Retrieve potential candidate aliases matching query or query tokens
    const conditions = ['LOWER(pa.alias_term) ILIKE $1', 'LOWER(pf.canonical_name) ILIKE $1'];
    const params = [`%${cleanText}%`];

    // Check if query contains the alias term (minimum 4 characters to avoid false matches, unless abbreviation with context)
    params.push(cleanText);
    const cleanTextIdx = params.length;
    conditions.push(`($${cleanTextIdx} LIKE '%' || LOWER(pa.alias_term) || '%' AND LENGTH(pa.alias_term) >= 4)`);

    // Allow abbreviations (length < 4) only when exact word boundary matches
    conditions.push(`(pa.alias_type = 'abbreviation' AND LENGTH(pa.alias_term) < 4 AND $${cleanTextIdx} ~* ('\\y' || pa.alias_term || '\\y'))`);

    // Also add top query tokens (up to 10 content tokens, length >= 3)
    tokens.slice(0, 10).forEach((t) => {
      params.push(`%${t}%`);
      conditions.push(`(LOWER(pa.alias_term) ILIKE $${params.length} AND LENGTH(pa.alias_term) >= 3)`);
    });

    const sql = `
      SELECT 
        pa.id AS alias_id,
        pa.alias_term,
        pa.alias_type,
        pa.confidence_score AS alias_confidence,
        pa.provenance AS alias_provenance,
        pa.context_keywords,
        pf.id AS product_family_id,
        pf.family_code,
        pf.canonical_name,
        pf.division_council,
        pf.subcategory,
        pf.applications,
        pf.coverage_status,
        pc.category_name,
        ps.name AS sector_name,
        ps.sector_code
      FROM product_aliases pa
      JOIN product_families pf ON pa.product_family_id = pf.id
      LEFT JOIN product_categories pc ON pf.category_id = pc.id
      LEFT JOIN product_sectors ps ON pf.sector_id = ps.id
      WHERE ${conditions.join(' OR ')}
      ORDER BY 
        CASE 
          WHEN $${cleanTextIdx} LIKE '%' || LOWER(pa.alias_term) || '%' AND LENGTH(pa.alias_term) >= 8 THEN 1
          WHEN LOWER(pa.alias_term) = $${cleanTextIdx} THEN 2
          WHEN LOWER(pf.canonical_name) = $${cleanTextIdx} THEN 3
          ELSE 4
        END,
        LENGTH(pa.alias_term) DESC
      LIMIT 300;
    `;

    const res = await query(sql, params);
    if (!res.rows || res.rows.length === 0) return [];

    // Score candidates using deterministic word-overlap & phrase match in JS
    const qTokens = new Set(tokens.map(t => t.toLowerCase().replace(/s$/, '')));
    const qTokenCount = Math.max(qTokens.size, 1);

    const scored = [];

    for (const row of res.rows) {
      const aliasLower = (row.alias_term || '').toLowerCase();
      const canonLower = (row.canonical_name || '').toLowerCase();

      // Check abbreviation context filter
      if (row.alias_type === 'abbreviation' && aliasLower.length <= 3) {
        const ctxWords = Array.isArray(row.context_keywords) ? row.context_keywords : [];
        if (ctxWords.length > 0) {
          const hasContext = ctxWords.some(cw => cleanText.includes(cw.toLowerCase()));
          if (!hasContext) {
            // Skip this abbreviation because surrounding query lacks disambiguating context
            continue;
          }
        }
      }

      let score = 0;

      // Exact full match
      if (aliasLower === cleanText || canonLower === cleanText) {
        score = 100;
      } else if (aliasLower.replace(/[^\w\s]/g, '').trim() === cleanText.replace(/[^\w\s]/g, '').trim()) {
        score = 95;
      } else if (aliasLower.includes(' ') && cleanText.includes(aliasLower)) {
        // Multi-word phrase completely contained in query
        score = 88 + Math.min(10, aliasLower.split(' ').length * 3);
      } else if (cleanText.includes(' ') && aliasLower.includes(cleanText)) {
        // Alias contains the multi-word query
        score = 85;
      }

      // Token overlap scoring
      const aliasTokens = (row.alias_term + ' ' + row.canonical_name)
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .map(t => t.replace(/s$/, ''))
        .filter(t => t.length >= 3);

      const aliasTokenSet = new Set(aliasTokens);
      let matchedTokens = 0;
      qTokens.forEach(qt => {
        if (aliasTokenSet.has(qt)) matchedTokens++;
      });

      const overlapRatio = matchedTokens / qTokenCount;
      score = Math.max(score, matchedTokens * 25 + Math.round(overlapRatio * 30));

      // Quality bonuses
      if (row.alias_type === 'canonical') score += 5;
      if (row.alias_type === 'composite_synonym') score += 3;
      if (row.alias_type.startsWith('multilingual_')) score += 7;

      scored.push({
        ...row,
        matchScore: score
      });
    }

    // Sort by matchScore descending, then by term length
    scored.sort((a, b) => b.matchScore - a.matchScore || b.alias_term.length - a.alias_term.length);

    return scored.slice(0, limit);
  } catch (err) {
    console.warn('[ProductDiscovery]: Error matching aliases:', err.message);
    return [];
  }
}

/**
 * Step 3: Division Council prediction and cross-domain routing
 * Predicts the most likely BIS Division Council(s) for the input.
 * Supports cross-domain routing (e.g. Electric Pumps -> ETD + MED/WRD).
 *
 * @param {Array<Object>} matchedAliases
 * @param {Array<string>} tokens
 * @returns {Array<Object>} Ranked candidate Division Councils
 */
function predictDivisionCouncils(matchedAliases = [], tokens = []) {
  const councilScores = new Map();

  // Score from matched aliases / product families
  matchedAliases.forEach(alias => {
    const council = alias.division_council;
    if (council) {
      const current = councilScores.get(council) || 0;
      councilScores.set(council, current + 3.0);
    }
  });

  // Score from domain keyword patterns
  const keywordCouncilMap = [
    { keywords: ['wire', 'cable', 'switch', 'transformer', 'breaker', 'motor', 'electrical', 'voltage', 'current', 'led', 'luminaire', 'meter'], council: 'ETD' },
    { keywords: ['cement', 'concrete', 'steel', 'pipe', 'pvc', 'brick', 'aggregate', 'tile', 'civil', 'construction', 'building', 'reinforcement'], council: 'CED' },
    { keywords: ['pump', 'crane', 'compressor', 'valve', 'gear', 'boiler', 'machine', 'bearing', 'diesel', 'engine', 'tractor'], council: 'MED' },
    { keywords: ['helmet', 'ppe', 'glove', 'mask', 'respirator', 'harness', 'safety', 'protective', 'shield', 'eyewear'], council: 'CHD' },
    { keywords: ['fertilizer', 'pesticide', 'seed', 'food', 'grain', 'milk', 'water', 'oil', 'tea', 'spices'], council: 'FAD' },
    { keywords: ['computer', 'software', 'server', 'display', 'telecom', 'radio', 'cctv', 'biometric', 'smart'], council: 'LITD' },
    { keywords: ['solar', 'photovoltaic', 'wind', 'battery', 'energy', 'inverter', 'biomass'], council: 'EED' },
    { keywords: ['cotton', 'silk', 'yarn', 'fabric', 'textile', 'jute', 'carpet', 'geotextile', 'rope'], council: 'TXD' },
    { keywords: ['automobile', 'vehicle', 'tyre', 'brake', 'chassis', 'trailer', 'railway', 'locomotive'], council: 'TED' },
    { keywords: ['syringe', 'catheter', 'implant', 'x-ray', 'ventilator', 'medical', 'hospital', 'surgical'], council: 'MHD' },
    { keywords: ['ayurveda', 'unani', 'siddha', 'homeopathy', 'herbal', 'ayush'], council: 'AYD' },
    { keywords: ['dam', 'canal', 'irrigation', 'hydrology', 'borewell', 'water supply'], council: 'WRD' },
    { keywords: ['iron', 'steel', 'aluminium', 'copper', 'alloy', 'foundry', 'casting', 'forging'], council: 'MTD' },
    { keywords: ['petroleum', 'diesel', 'petrol', 'lubricant', 'coal', 'grease', 'bitumen', 'fuel'], council: 'PCD' }
  ];

  tokens.forEach(token => {
    keywordCouncilMap.forEach(rule => {
      if (rule.keywords.includes(token)) {
        const cur = councilScores.get(rule.council) || 0;
        councilScores.set(rule.council, cur + 1.0);
      }
    });
  });

  const sorted = Array.from(councilScores.entries())
    .map(([code, score]) => ({
      code,
      name: (BIS_DIVISION_COUNCILS[code] && BIS_DIVISION_COUNCILS[code].name) || code,
      score: Math.round(score * 100) / 100
    }))
    .sort((a, b) => b.score - a.score);

  return sorted;
}

/**
 * Step 4 & 5: Product family resolution and Master Catalogue lookup
 * Resolves unique product families from matched aliases.
 *
 * @param {Array<Object>} matchedAliases
 * @returns {Array<Object>} Deduplicated product families
 */
function resolveProductFamilies(matchedAliases = []) {
  const familyMap = new Map();

  matchedAliases.forEach(alias => {
    const fid = alias.product_family_id;
    if (fid && !familyMap.has(fid)) {
      familyMap.set(fid, {
        productFamilyId: fid,
        familyCode: alias.family_code,
        canonicalName: alias.canonical_name,
        divisionCouncil: alias.division_council,
        divisionCouncilName: (BIS_DIVISION_COUNCILS[alias.division_council] && BIS_DIVISION_COUNCILS[alias.division_council].name) || alias.division_council,
        categoryName: alias.category_name,
        sectorName: alias.sector_name,
        sectorCode: alias.sector_code,
        subcategory: alias.subcategory,
        applications: alias.applications,
        coverageStatus: alias.coverage_status,
        matchedAlias: alias.alias_term,
        matchedAliasType: alias.alias_type,
        matchScore: alias.matchScore || 0
      });
    }
  });

  return Array.from(familyMap.values());
}

/**
 * Step 7: Product-to-Standard mapping lookup
 * Fetches verified Indian Standards directly linked to the resolved product families.
 *
 * @param {Array<number>} familyIds
 * @returns {Promise<Array<Object>>} Directly mapped standards
 */
async function lookupProductStandards(familyIds = []) {
  if (!familyIds || familyIds.length === 0) return [];

  try {
    const placeholders = familyIds.map((_, i) => `$${i + 1}`).join(',');
    const sql = `
      SELECT 
        psm.id AS mapping_id,
        psm.product_family_id,
        psm.standard_id,
        psm.relationship_type,
        psm.applicability_explanation,
        psm.mandatory_status,
        psm.evidence_source,
        psm.confidence_score,
        s.id,
        s.canonical_id,
        s.is_number,
        s.title,
        s.scope,
        s.category,
        s.description,
        s.application,
        s.technical_requirements,
        s.materials,
        s.performance_requirements,
        s.safety_requirements,
        s.testing_requirements,
        s.version,
        s.publication_year,
        s.status,
        s.amendments,
        s.supersedes,
        s.superseded_by,
        s.certification,
        s.source,
        s.is_primary_candidate,
        s.division_council,
        s.standard_type,
        s.technical_committee,
        s.reaffirmation_year,
        s.verification_status,
        pf.canonical_name AS product_family_name,
        pf.family_code
      FROM product_standard_mappings psm
      JOIN standards s ON psm.standard_id = s.id
      JOIN product_families pf ON psm.product_family_id = pf.id
      WHERE psm.product_family_id IN (${placeholders})
      ORDER BY 
        CASE 
          WHEN LOWER(psm.relationship_type) = 'primary_specification' THEN 1
          WHEN LOWER(psm.relationship_type) = 'safety_requirement' THEN 2
          WHEN LOWER(psm.relationship_type) LIKE '%material%' THEN 3
          WHEN LOWER(psm.relationship_type) = 'code_of_practice' THEN 4
          WHEN LOWER(psm.relationship_type) = 'installation_requirement' THEN 5
          WHEN LOWER(psm.relationship_type) = 'testing_method' THEN 6
          ELSE 7
        END,
        psm.confidence_score DESC;
    `;

    const res = await query(sql, familyIds);
    return res.rows;
  } catch (err) {
    console.warn('[ProductDiscovery]: Error looking up product standard mappings:', err.message);
    return [];
  }
}

/**
 * Step 11: Regulatory orders and statutory mandate lookup
 * Retrieves Quality Control Orders, Gazette notifications, and Scheme-I details.
 *
 * @param {Array<number>} standardIds
 * @returns {Promise<Map<number, Object>>} Map of standard_id to regulatory data
 */
async function lookupRegulatoryOrders(standardIds = []) {
  const regMap = new Map();
  if (!standardIds || standardIds.length === 0) return regMap;

  try {
    const placeholders = standardIds.map((_, i) => `$${i + 1}`).join(',');
    const sql = `
      SELECT 
        srl.standard_id,
        srl.schedule_item,
        srl.schedule_serial,
        srl.commencement_date,
        srl.scheme,
        srl.is_mandatory,
        srl.product_coverage_description,
        ro.qco_code,
        ro.qco_name,
        ro.gazette_no,
        ro.gazette_date,
        ro.effective_date,
        ro.issuing_ministry,
        ro.statutory_basis,
        ro.status AS order_status,
        ro.official_evidence_url
      FROM standard_regulatory_links srl
      JOIN regulatory_orders ro ON srl.regulatory_order_id = ro.id
      WHERE srl.standard_id IN (${placeholders});
    `;

    const res = await query(sql, standardIds);
    res.rows.forEach(row => {
      regMap.set(row.standard_id, {
        isMandatoryQco: row.is_mandatory,
        qcoName: row.qco_name,
        gazetteNo: row.gazette_no,
        gazetteDate: row.gazette_date,
        commencementDate: row.commencement_date,
        issuingMinistry: row.issuing_ministry,
        statutoryBasis: row.statutory_basis,
        scheme: row.scheme,
        scheduleItem: row.schedule_item,
        scheduleSerial: row.schedule_serial,
        productCoverage: row.product_coverage_description,
        evidenceUrl: row.official_evidence_url
      });
    });
  } catch (err) {
    console.warn('[ProductDiscovery]: Error querying regulatory orders:', err.message);
  }

  return regMap;
}

/**
 * Step 12: Generates transparent safe fallback response when no standards match.
 * Explains the product family and Division Council responsible while maintaining zero fabrication.
 *
 * @param {string} queryText
 * @param {Array<Object>} resolvedFamilies
 * @param {Array<Object>} predictedCouncils
 * @returns {Object} Safe transparent fallback response
 */
function buildTransparentFallback(queryText, resolvedFamilies = [], predictedCouncils = []) {
  const topFamily = resolvedFamilies.length > 0 ? resolvedFamilies[0] : null;
  const topCouncil = predictedCouncils.length > 0 ? predictedCouncils[0] : null;

  let message = `No verified Indian Standard currently matched for query: "${queryText}".`;
  let contextDetails = 'NIRDESHAK does not fabricate standard numbers or certification requirements.';

  if (topFamily) {
    message = `No verified Indian Standard is currently indexed in the NIRDESHAK database for product family: "${topFamily.canonicalName}" (${topFamily.divisionCouncil}).`;
    contextDetails = `This product falls under the jurisdiction of the ${topFamily.divisionCouncilName || topFamily.divisionCouncil} (Technical Committee/Sector: ${topFamily.sectorName || 'General'}). NIRDESHAK's verified standards catalogue is actively expanding across all 17 Division Councils.`;
  } else if (topCouncil) {
    message = `No verified Indian Standard was matched for this requirement under the ${topCouncil.name} (${topCouncil.code}).`;
    contextDetails = 'Please check the product spelling, try broader technical terms, or consult the official Bureau of Indian Standards e-Sale portal at https://www.services.bis.gov.in.';
  }

  return {
    success: true,
    hasMatch: false,
    query: queryText,
    matchedProductFamilies: resolvedFamilies,
    predictedCouncils: predictedCouncils,
    count: 0,
    results: [],
    recommendations: [],
    summary: message,
    fallbackNotice: {
      isNoMatch: true,
      message,
      contextDetails,
      officialPortalUrl: 'https://www.services.bis.gov.in',
      statutoryNotice: 'Under the Bureau of Indian Standards Act, 2016, genuine compliance requires referencing official Gazette notifications and published BIS specifications.'
    }
  };
}

/**
 * Master Discovery Function: Executes the complete 12-step pipeline
 *
 * @param {string} queryText User input text (product description, spec, or query)
 * @param {Object} [options]
 * @param {number} [options.limit=5]
 * @param {boolean} [options.includeSupporting=true]
 * @returns {Promise<Object>} Complete discovery, ranking, and regulatory intelligence package
 */
async function discoverStandards(queryText, options = {}) {
  const limit = Math.max(1, Math.min(options.limit || 5, 20));

  // Step 1: Input text normalization
  const normalized = normalizeInput(queryText);
  if (!normalized.normalizedQuery) {
    return buildTransparentFallback('', [], []);
  }

  // Step 2: Product alias and synonym matching
  const matchedAliases = await matchProductAliases(normalized.normalizedQuery, normalized.tokens, 10);

  // Step 3: Division Council prediction and cross-domain routing
  const predictedCouncils = predictDivisionCouncils(matchedAliases, normalized.tokens);

  // Step 4 & 5: Product family resolution and master catalogue lookup
  const resolvedFamilies = resolveProductFamilies(matchedAliases);
  
  // Prioritize family IDs from genuine high-confidence matches (matchScore >= 65) to prevent unrelated partial runner-ups from bleeding mappings
  let relevantFamilyIds = [];
  if (resolvedFamilies.length > 0) {
    const topScore = resolvedFamilies[0].matchScore || 0;
    if (topScore >= 65) {
      relevantFamilyIds = resolvedFamilies
        .filter(f => (f.matchScore || 0) >= Math.max(60, topScore - 15))
        .map(f => f.productFamilyId);
    }
  }

  // Step 6: Standards database hybrid search (vector cosine similarity + text)
  let vectorCandidates = [];
  try {
    const searchRes = await searchStandards(normalized.normalizedQuery, {
      limit: limit * 2,
      includeSupporting: true
    });
    vectorCandidates = searchRes.results || [];
  } catch (err) {
    console.warn('[ProductDiscovery]: Vector search notice:', err.message);
  }

  // Step 7: Product-to-standard mapping lookup
  const directMappings = relevantFamilyIds.length > 0
    ? await lookupProductStandards(relevantFamilyIds)
    : [];

  // Merge direct mappings with vector search candidates
  const candidateMap = new Map();

  // First, add direct mappings (highest domain relevance)
  directMappings.forEach(dm => {
    candidateMap.set(dm.id, {
      ...dm,
      directMapping: true,
      mappingRelationship: dm.relationship_type,
      mappingConfidence: parseFloat(dm.confidence_score) || 1.0,
      applicabilityExplanation: dm.applicability_explanation,
      // Provide initial strong semantic score for directly mapped products
      similarity: parseFloat(dm.confidence_score) || 0.95
    });
  });

  // Then add vector candidates (avoiding duplicates)
  vectorCandidates.forEach(vc => {
    if (!candidateMap.has(vc.id)) {
      candidateMap.set(vc.id, vc);
    } else {
      // Merge similarity score from vector search if higher
      const existing = candidateMap.get(vc.id);
      if (vc.similarity && (!existing.similarity || vc.similarity > existing.similarity)) {
        existing.similarity = vc.similarity;
      }
    }
  });

  // Apply runtime relevance validation layer to eliminate cross-domain anomalies and invalid mappings
  const rawCandidates = Array.from(candidateMap.values());
  const mergedCandidates = filterAndValidateCandidates(rawCandidates, resolvedFamilies);

  // Step 12 Fallback check: if zero candidates found
  if (mergedCandidates.length === 0) {
    return buildTransparentFallback(normalized.normalizedQuery, resolvedFamilies, predictedCouncils);
  }

  // Step 9: Multi-signal relevance ranking (Semantic 60%, Text 20%, Scope 10%, Requirements 10%)
  const rankedCandidates = rankStandards(normalized.normalizedQuery, mergedCandidates);

  // Apply Direct Product Mapping Bonus (+0.15, max 1.0) to verified primary standards
  rankedCandidates.forEach(cand => {
    if (cand.directMapping) {
      const bonus = cand.mappingRelationship && cand.mappingRelationship.toLowerCase().includes('primary') ? 0.15 : 0.10;
      cand.scores.directMappingBonus = bonus;
      cand.scores.final = Math.min(1.0, Math.round((cand.scores.final + bonus) * 10000) / 10000);
    }
  });

  // Re-sort after applying direct mapping bonus
  rankedCandidates.sort((a, b) => {
    if (b.scores.final !== a.scores.final) return b.scores.final - a.scores.final;
    if (b.scores.semantic !== a.scores.semantic) return b.scores.semantic - a.scores.semantic;
    return a.id - b.id;
  });

  // Stricter matching threshold to avoid spurious matching of unknown or out-of-domain products:
  // Must have:
  // 1) Direct verified product-to-standard mapping, OR
  // 2) High semantic similarity (>= 0.72), OR
  // 3) Moderate semantic similarity (>= 0.60) WITH substantial text overlap (>= 0.35), OR
  // 4) Matched product alias WITH moderate semantic similarity (>= 0.62) AND text overlap (>= 0.25)
  const topCandidate = rankedCandidates[0];
  const topFamily = resolvedFamilies.length > 0 ? resolvedFamilies[0] : null;
  const topFamilyScore = topFamily ? (topFamily.matchScore || 0) : 0;
  
  // A direct mapping is only valid if the product family match is genuine (topFamilyScore >= 65)
  const hasStrongDirectMapping = directMappings.length > 0 && topFamilyScore >= 65;

  const hasSubstantialMatch = hasStrongDirectMapping ||
    (topCandidate && topCandidate.scores && (
      topCandidate.scores.semantic >= 0.72 ||
      (topCandidate.scores.semantic >= 0.55 && topCandidate.scores.text >= 0.35) ||
      (topCandidate.scores.text >= 0.50) ||
      (matchedAliases.length > 0 && topFamilyScore >= 50 && topCandidate.scores.semantic >= 0.60 && topCandidate.scores.text >= 0.25)
    ));

  if (!hasSubstantialMatch) {
    return buildTransparentFallback(normalized.normalizedQuery, resolvedFamilies, predictedCouncils);
  }

  // If matched product family has no verified standards mapped and candidate text overlap is weak:
  if (resolvedFamilies.length > 0 && directMappings.length === 0 && (!topCandidate || (topCandidate.scores && topCandidate.scores.text < 0.30))) {
    return buildTransparentFallback(normalized.normalizedQuery, resolvedFamilies, predictedCouncils);
  }

  // Step 8 & 11: Enrich with supporting standards, version checks, and regulatory QCO orders
  const topCandidates = rankedCandidates.slice(0, limit);
  const standardIds = topCandidates.map(c => c.id);
  const regMap = await lookupRegulatoryOrders(standardIds);

  // Enrich each candidate with comprehensive intelligence
  const enrichedRecommendations = await Promise.all(
    topCandidates.map(async (candidate, index) => {
      // Version status evaluation
      const versionStatus = evaluateVersionStatus(candidate);

      // Regulatory QCO details
      const regDetails = regMap.get(candidate.id) || null;

      // Normative / Supporting standards
      let relatedStandards = [];
      try {
        const relRes = await getRelatedStandardsForId(candidate.id, { direction: 'all' });
        relatedStandards = (relRes.results || []).map(r => ({
          relationshipId: r.relationshipId,
          relationshipType: r.relationshipType,
          direction: r.direction,
          standard: {
            id: r.standard.id,
            is_number: r.standard.is_number,
            title: r.standard.title,
            category: r.standard.category
          }
        }));
      } catch (rErr) {
        // Safe ignore
      }

      // Step 10: Generate factual grounded relevance explanation
      const matchedFamily = resolvedFamilies.length > 0 ? resolvedFamilies[0] : null;
      let relevanceExplanation = '';
      if (candidate.directMapping && candidate.applicabilityExplanation) {
        relevanceExplanation = candidate.applicabilityExplanation;
      } else if (candidate.scope) {
        relevanceExplanation = `Applies directly to requirements for ${candidate.category || 'this product domain'}. Scope: ${candidate.scope.slice(0, 200)}...`;
      } else {
        relevanceExplanation = `Verified Indian Standard for ${candidate.title}.`;
      }

      // Format certification and statutory mandate
      const isMandatory = regDetails ? regDetails.isMandatoryQco : false;
      const certificationSummary = isMandatory
        ? `Mandatory under ${regDetails.qcoName} (${regDetails.gazetteNo}, issued by ${regDetails.issuingMinistry}). Requires Scheme-I (ISI Mark) certification.`
        : (candidate.certification && candidate.certification.scheme) || 'Voluntary / Standard BIS Scheme-I Certification available.';

      return {
        ...candidate,
        rank: index + 1,
        division_council: candidate.division_council || (matchedFamily && matchedFamily.divisionCouncil) || 'General',
        divisionCouncilName: (BIS_DIVISION_COUNCILS[candidate.division_council] && BIS_DIVISION_COUNCILS[candidate.division_council].name) || candidate.division_council,
        standard_type: candidate.standard_type || 'Product Specification',
        relevanceExplanation,
        versionStatus: {
          ...versionStatus,
          reaffirmationYear: candidate.reaffirmation_year || null
        },
        regulatoryCompliance: regDetails ? {
          isMandatoryQco: true,
          qcoName: regDetails.qcoName,
          gazetteNo: regDetails.gazetteNo,
          gazetteDate: regDetails.gazetteDate,
          commencementDate: regDetails.commencementDate,
          issuingMinistry: regDetails.issuingMinistry,
          statutoryBasis: regDetails.statutoryBasis,
          scheme: regDetails.scheme,
          scheduleItem: regDetails.scheduleItem,
          scheduleSerial: regDetails.scheduleSerial,
          productCoverage: regDetails.productCoverage,
          evidenceUrl: regDetails.evidenceUrl
        } : {
          isMandatoryQco: false,
          status: 'Voluntary / QCO Not Established',
          scheme: 'Scheme-I (ISI Mark) Voluntary',
          notes: 'Standard BIS Scheme-I product certification is available on a voluntary basis unless mandated by specific departmental procurement specifications.'
        },
        certificationSummary,
        relatedStandards,
        matchedProductFamily: matchedFamily ? {
          canonicalName: matchedFamily.canonicalName,
          familyCode: matchedFamily.familyCode,
          divisionCouncil: matchedFamily.divisionCouncil
        } : null
      };
    })
  );

  return {
    success: true,
    hasMatch: enrichedRecommendations.length > 0,
    query: normalized.normalizedQuery,
    language: normalized.language,
    matchedProductFamilies: resolvedFamilies,
    predictedCouncils: predictedCouncils,
    count: enrichedRecommendations.length,
    limit,
    recommendations: enrichedRecommendations,
    summary: enrichedRecommendations.length > 0
      ? `Found ${enrichedRecommendations.length} applicable verified Indian Standard(s) across ${predictedCouncils.slice(0, 2).map(c => c.name).join(' and ')}.`
      : 'No verified Indian Standard matched.'
  };
}

/**
 * Autocomplete / Suggestion API for Product Search
 * Fast querying against `product_aliases` and `product_families`
 *
 * @param {string} searchTerm
 * @param {number} limit
 * @returns {Promise<Array<Object>>} Product suggestions
 */
async function suggestProducts(searchTerm, limit = 10) {
  if (!searchTerm || typeof searchTerm !== 'string' || !searchTerm.trim()) {
    return [];
  }

  const clean = searchTerm.trim().toLowerCase();
  try {
    const sql = `
      SELECT 
        pf.canonical_name,
        pf.family_code,
        pf.division_council,
        pc.category_name,
        pa.alias_term,
        CASE 
          WHEN LOWER(pa.alias_term) = LOWER($1) THEN 1
          WHEN LOWER(pf.canonical_name) = LOWER($1) THEN 2
          WHEN LOWER(pa.alias_term) LIKE LOWER($1) || '%' THEN 3
          WHEN LOWER(pf.canonical_name) LIKE LOWER($1) || '%' THEN 4
          ELSE 5
        END AS match_rank,
        LENGTH(pa.alias_term) AS term_len
      FROM product_aliases pa
      JOIN product_families pf ON pa.product_family_id = pf.id
      LEFT JOIN product_categories pc ON pf.category_id = pc.id
      WHERE LOWER(pa.alias_term) LIKE '%' || LOWER($1) || '%'
         OR LOWER(pf.canonical_name) LIKE '%' || LOWER($1) || '%'
      ORDER BY match_rank ASC, term_len ASC
      LIMIT $2;
    `;

    const res = await query(sql, [clean, limit]);
    
    // Deduplicate by canonical_name in memory
    const seen = new Set();
    const suggestions = [];
    for (const r of res.rows) {
      if (!seen.has(r.canonical_name)) {
        seen.add(r.canonical_name);
        suggestions.push({
          canonicalName: r.canonical_name,
          familyCode: r.family_code,
          divisionCouncil: r.division_council,
          categoryName: r.category_name,
          matchedTerm: r.alias_term
        });
      }
    }
    return suggestions;
  } catch (err) {
    console.warn('[ProductDiscovery]: Suggestion query error:', err.message);
    return [];
  }
}

module.exports = {
  BIS_DIVISION_COUNCILS,
  normalizeInput,
  matchProductAliases,
  predictDivisionCouncils,
  resolveProductFamilies,
  lookupProductStandards,
  lookupRegulatoryOrders,
  discoverStandards,
  suggestProducts,
  buildTransparentFallback
};
