// =========================================================
// Nirdeshak - Recommendation Display Module
// Handles: Dynamic rendering of Top-K recommendation cards,
// score attribution metrics, and interactive selection.
// =========================================================

/**
 * Escapes unsafe HTML characters to prevent XSS.
 * @param {string} str
 * @returns {string} Sanitized string
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Formats a 0-1 floating score into a clean percentage string.
 * @param {number} score Float between 0 and 1
 * @returns {string} Formatted percentage (e.g., "94.5%")
 */
export function formatScorePercent(score) {
  if (score === null || score === undefined || isNaN(score)) return '0.0%';
  const clamped = Math.max(0, Math.min(1, Number(score)));
  return `${(clamped * 100).toFixed(1)}%`;
}

export function formatFunctionalCategoryLabel(rec, isPrimary) {
  const rel = (rec.mappingRelationship || rec.relationship_type || rec.relationshipType || '').toLowerCase();
  const st = (rec.standard_type || '').toLowerCase();
  const cat = (rec.category || '').toLowerCase();
  const title = (rec.title || '').toLowerCase();

  if (isPrimary || rel.includes('primary') || st.includes('product specification')) {
    return 'Primary Product Specification';
  }
  if (rel.includes('code_of_practice') || rel.includes('code of practice') || title.includes('code of practice')) {
    return 'Normative Code of Practice';
  }
  if (rel.includes('normative') || rel.includes('reference')) {
    return 'Normative Reference';
  }
  if (rel.includes('test') || rel.includes('sampling') || title.includes('test') || title.includes('sampling') || cat.includes('testing')) {
    return 'Testing & Sampling Standard';
  }
  if (rel.includes('safety') || title.includes('safety') || cat.includes('safety')) {
    return 'Safety Requirement Standard';
  }
  if (rel.includes('material') || title.includes('material') || cat.includes('material')) {
    return 'Material & Component Specification';
  }
  if (rel.includes('installation') || rel.includes('maintenance') || rel.includes('workmanship')) {
    return 'Installation & Maintenance Code';
  }
  return 'Allied / Supporting Standard';
}

/**
 * Categorizes a recommendation into one of the 7 pre-tender functional sections:
 * A. Primary Indian Standards
 * B. Normative References & Codes of Practice
 * C. Testing & Sampling Standards
 * D. Safety Standards
 * E. Material & Component Standards
 * F. Installation & Maintenance Codes
 * G. Allied / Supporting Standards
 */
export function getRecommendationSectionKey(rec, isPrimary) {
  const label = formatFunctionalCategoryLabel(rec, isPrimary);
  if (label === 'Primary Product Specification') return 'A';
  if (label === 'Normative Code of Practice' || label === 'Normative Reference') return 'B';
  if (label === 'Testing & Sampling Standard') return 'C';
  if (label === 'Safety Requirement Standard') return 'D';
  if (label === 'Material & Component Specification') return 'E';
  if (label === 'Installation & Maintenance Code') return 'F';
  return 'G';
}

/**
 * Formats standard status into a human-readable badge label.
 * @param {string} statusValue
 * @param {string} statusCategory
 * @returns {string} Formatted label
 */
export function formatStatusLabel(statusValue, statusCategory) {
  const val = (statusValue || 'active').toLowerCase();
  const cat = (statusCategory || 'current').toLowerCase();

  if (val === 'withdrawn' || cat === 'withdrawn') return 'Withdrawn';
  if (val === 'superseded' || cat === 'superseded') return 'Superseded';
  if (val === 'under_revision' || cat === 'under_revision') return 'Under Revision';
  if (val === 'active' || cat === 'current') return 'Active';
  return 'Active';
}

/**
 * Renders an individual recommendation card.
 *
 * @param {Object} rec Recommendation data object
 * @param {number} rank 1-indexed rank
 * @param {boolean} isSelected Whether this card is currently selected for detailed view
 * @param {Object} [options={}] Optional rendering flags
 * @returns {string} Rendered HTML string
 */
export function renderRecommendationCard(rec, rank, isSelected = false, options = {}) {
  const cardId = `rec-card-${rank}`;
  const detailsId = `rec-details-${rank}`;

  // Extract scores cleanly
  const finalVal = rec.final_score !== undefined
    ? rec.final_score
    : (rec.scores ? rec.scores.final : 0);
  const semanticVal = rec.semantic_similarity !== undefined
    ? rec.semantic_similarity
    : (rec.scores ? rec.scores.semantic : 0);
  const textVal = rec.text_match !== undefined
    ? rec.text_match
    : (rec.scores ? rec.scores.text : 0);
  const scopeVal = rec.scope_match !== undefined
    ? rec.scope_match
    : (rec.scores ? (rec.scores.scopeApplication || rec.scores.scope) : 0);
  const reqVal = rec.requirement_match !== undefined
    ? rec.requirement_match
    : (rec.scores ? (rec.scores.structuredRequirement || rec.scores.structured) : 0);

  const finalPct = formatScorePercent(finalVal);
  const semanticPct = formatScorePercent(semanticVal);
  const textPct = formatScorePercent(textVal);
  const scopePct = formatScorePercent(scopeVal);
  const reqPct = formatScorePercent(reqVal);

  const vStatus = rec.versionStatus || {};
  const versionLabel = formatStatusLabel(vStatus.statusValue, vStatus.statusCategory);
  const isDevData = rec.dataContext === 'development_test' || (rec.source && rec.source.includes('DEVELOPMENT_TEST'));
  const isPrimary = rank === 1;

  const cardClasses = [
    'recommendation-card',
    isPrimary ? 'recommendation-card--primary' : 'recommendation-card--secondary',
    isSelected ? 'recommendation-card--selected' : '',
    rec.isCuratedDemo ? 'recommendation-card--curated' : ''
  ].filter(Boolean).join(' ');

  return `
    <article class="${cardClasses}" id="${cardId}" data-rank="${rank}" data-is-number="${escapeHtml(rec.is_number)}">
      <!-- Card Header -->
      <div class="recommendation-card__header">
        <div class="card-badge-row">
          <span class="card-rank-badge">Rank #${rank}</span>
          ${isPrimary ? `<span class="card-primary-label">PRIMARY RELEVANT STANDARD</span>` : ''}
          <span class="card-relation-badge" style="background: #eef2f6; color: #0a3161; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; border: 1px solid #cbd5e1;">
            ${escapeHtml(formatFunctionalCategoryLabel(rec, isPrimary))}
          </span>
          <span class="card-status-badge card-status-badge--${escapeHtml(String(vStatus.statusCategory || 'active').toLowerCase())}">
            ${rec.isCuratedDemo ? 'Status: Active (Reaffirmed 2020)' : `Database Status: ${escapeHtml(versionLabel)}`}
          </span>
          ${isDevData ? `<span class="card-context-badge">Development/Test Data</span>` : ''}
          ${rec.isCuratedDemo && isPrimary ? `<span class="card-context-badge" style="background: #e0f2fe; color: #0369a1; border-color: #bae6fd;">Curated BIS Standards Evidence</span>` : ''}
        </div>

        <div class="card-title-group" style="margin-top: 6px;">
          <h5 class="card-is-number" id="cardIsNumber-${rank}" style="font-size: ${isPrimary ? '20px' : '17px'}; color: #0a3161;">${escapeHtml(rec.is_number)}</h5>
          <h6 class="card-title-text" id="cardTitle-${rank}" style="font-size: ${isPrimary ? '15px' : '14px'}; color: #334155; margin-top: 2px;">${escapeHtml(rec.title)}</h6>
          ${isPrimary ? `
            <p class="form-hint" style="margin: 4px 0 0 0; color: #0a3161; font-weight: 600;">
              Primary relevant standard identified from the available standards evidence.
            </p>
          ` : (rec.description ? `
            <p class="form-hint" style="margin: 4px 0 0 0; color: #475569;">
              ${escapeHtml(rec.description)}
            </p>
          ` : '')}
        </div>
      </div>

      <!-- Primary Metrics Row -->
      <div class="recommendation-card__metrics">
        <div class="metric-score-box">
          <span class="metric-score-box__label">Overall Relevance Score</span>
          <div class="metric-score-box__value-row">
            <span class="metric-score-box__percent" id="cardFinalScore-${rank}">${finalPct}</span>
            <div class="metric-score-box__bar-bg" aria-hidden="true">
              <div class="metric-score-box__bar-fill" style="width: ${finalPct};"></div>
            </div>
          </div>
          <span class="metric-score-box__hint">Weighted multi-signal match: 0.60(Semantic) + 0.20(Text) + 0.10(Scope) + 0.10(Req)</span>
        </div>

        <!-- Component Scores Breakdown Grid -->
        <div class="component-scores-grid" aria-label="Component Score Breakdown">
          <div class="component-score-item">
            <span class="component-score-item__label">Semantic Similarity</span>
            <span class="component-score-item__value" id="cardSemanticScore-${rank}">${semanticPct}</span>
          </div>
          <div class="component-score-item">
            <span class="component-score-item__label">Keyword / Text Match</span>
            <span class="component-score-item__value" id="cardTextScore-${rank}">${textPct}</span>
          </div>
          <div class="component-score-item">
            <span class="component-score-item__label">Scope &amp; Application</span>
            <span class="component-score-item__value" id="cardScopeScore-${rank}">${scopePct}</span>
          </div>
          <div class="component-score-item">
            <span class="component-score-item__label">Structured Requirements</span>
            <span class="component-score-item__value" id="cardStructuredScore-${rank}">${reqPct}</span>
          </div>
        </div>
      </div>

      <!-- Action & Selection Controls -->
      <div class="recommendation-card__actions" style="margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
        <button
          type="button"
          class="btn-select-analysis view-details-btn ${isSelected ? 'btn-select-analysis--active' : ''}"
          id="viewDetailsBtn-${rank}"
          data-rank="${rank}"
          aria-pressed="${isSelected ? 'true' : 'false'}"
        >
          <span class="btn-select-icon" aria-hidden="true">${isSelected ? '&#10003;' : '&#9654;'}</span>
          <span class="btn-select-text">${isSelected ? 'Currently Viewing Details' : 'View Details'}</span>
        </button>

        <button
          type="button"
          class="btn-toggle-details"
          id="toggleDetailsBtn-${rank}"
          aria-expanded="false"
          aria-controls="${detailsId}"
          data-target="${detailsId}"
        >
          <span class="btn-toggle-details__text">View Verification Summary</span>
          <span class="btn-toggle-details__icon" aria-hidden="true">&#9660;</span>
        </button>
      </div>

      <!-- Collapsible Technical Verification Drawer -->
      <div class="recommendation-card__details" id="${detailsId}" style="display: none; margin-top: 14px; padding-top: 12px; border-top: 1px dashed #cbd5e1;">
        <div class="why-relevant-block" style="margin-bottom: 12px;">
          <strong style="color: #0a3161; font-size: 13px;">Why Relevant:</strong>
          <p id="cardWhyRelevant-${rank}" style="margin: 4px 0 8px 0; color: #334155; font-size: 13px;">
            ${escapeHtml((rec.explanation && rec.explanation.whyRelevant) || `Identified with rank #${rank} based on ${finalPct} calculated relevance to the procurement requirement.`)}
          </p>
        </div>

        <table class="version-table" style="width: 100%; font-size: 12px; margin-bottom: 8px;">
          <tbody>
            <tr>
              <th style="width: 35%;">IS Number</th>
              <td>${escapeHtml(rec.is_number)}</td>
            </tr>
            <tr>
              <th>Status / Category</th>
              <td>${escapeHtml(rec.category || 'Personal Protective Equipment')} &bull; ${escapeHtml(versionLabel)}</td>
            </tr>
            <tr>
              <th>Application</th>
              <td>${escapeHtml(rec.application || 'Industrial procurement requirement')}</td>
            </tr>
            <tr>
              <th>Data Context</th>
              <td>${isDevData ? 'Development/Test Data' : (rec.dataContext || 'Authoritative Standards Record')}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  `;
}

/**
 * Dynamically iterates through the recommendations array and generates
 * cards for each returned Indian Standard.
 *
 * @param {Array<Object>} recommendations Array of recommendation objects
 * @param {number} [selectedRank=1] The rank of the currently selected standard
 * @param {Object} [options={}] Optional configuration
 * @returns {string} Combined HTML string of all recommendation cards
 */
export function renderRecommendationCardsList(recommendations = [], selectedRank = 1, options = {}) {
  if (!Array.isArray(recommendations) || recommendations.length === 0) {
    return `
      <div class="empty-recommendations-banner" style="padding: 24px; text-align: center; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px;">
        <p style="color: #475569; margin: 0; font-weight: 500;">No recommendation cards to display.</p>
      </div>
    `;
  }

  // Pre-Tender Section Definitions
  const SECTION_CONFIG = {
    A: { title: 'Section A: Primary Applicable Indian Standards (Product Specifications)', icon: '&#128220;' },
    B: { title: 'Section B: Normative References & Codes of Practice', icon: '&#128218;' },
    C: { title: 'Section C: Testing & Sampling Standards', icon: '&#129514;' },
    D: { title: 'Section D: Safety Standards & Environmental Requirements', icon: '&#128737;' },
    E: { title: 'Section E: Material & Component Standards', icon: '&#9881;' },
    F: { title: 'Section F: Installation, Construction & Maintenance Codes', icon: '&#128736;' },
    G: { title: 'Section G: Allied & Complementary Standards', icon: '&#128279;' }
  };

  // Group recommendations by functional section key
  const sectionMap = new Map();
  ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach(key => sectionMap.set(key, []));

  recommendations.forEach((rec, idx) => {
    const rank = rec.rank || (rec.scores && rec.scores.rank) || (idx + 1);
    const isPrimary = rank === 1;
    const secKey = getRecommendationSectionKey(rec, isPrimary);
    sectionMap.get(secKey).push({ rec, rank, isSelected: rank === selectedRank });
  });

  // Render cards partitioned into visible functional sections
  const outputSections = [];
  for (const [secKey, items] of sectionMap.entries()) {
    if (items.length === 0) continue;
    const config = SECTION_CONFIG[secKey] || { title: `Section ${secKey}`, icon: '•' };

    const cardsHtml = items.map(item => {
      return renderRecommendationCard(item.rec, item.rank, item.isSelected, options);
    }).join('\n');

    outputSections.push(`
      <section class="recommendation-functional-section" data-section="${secKey}" style="margin-bottom: 20px;">
        <div class="section-group-banner" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 14px; background: #f8fafc; border-left: 4px solid #0a3161; border-radius: 4px; margin-bottom: 12px; border-top: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
          <h5 style="margin: 0; font-size: 13.5px; font-weight: 700; color: #0a3161; display: flex; align-items: center; gap: 8px;">
            <span aria-hidden="true">${config.icon}</span> ${escapeHtml(config.title)}
          </h5>
          <span style="font-size: 11px; font-weight: 600; color: #475569; background: #e2e8f0; padding: 2px 8px; border-radius: 10px;">
            ${items.length} Standard${items.length === 1 ? '' : 's'}
          </span>
        </div>
        <div class="section-cards-list">
          ${cardsHtml}
        </div>
      </section>
    `);
  }

  return outputSections.join('\n');
}

// Expose on window for browser scripts
if (typeof window !== 'undefined') {
  window.NirdeshakRecommendationDisplay = {
    renderRecommendationCard,
    renderRecommendationCardsList,
    formatScorePercent,
    formatStatusLabel,
    formatFunctionalCategoryLabel,
    getRecommendationSectionKey
  };
}
