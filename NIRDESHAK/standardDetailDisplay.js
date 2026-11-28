// =========================================================
// Nirdeshak - Standard Detail Display Module
// Step: Multi-Standard Detailed Information Rendering
// Handles: Dynamic rendering of comprehensive standard details,
// requirements, clauses, related standards, version intelligence,
// certification/regulatory context, gaps, and RAG explanation
// for ANY selected recommended Indian Standard.
// =========================================================

/**
 * Escapes unsafe HTML characters to prevent XSS.
 * @param {string} str
 * @returns {string} Sanitized string
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Normalizes status labels to neutral procurement terminology.
 */
export function formatStatusLabel(statusValue, statusCategory) {
  const raw = statusValue || statusCategory || 'Active';
  const lower = String(raw).toLowerCase();
  if (lower === 'current' || lower === 'active') return 'Active / Current';
  if (lower === 'superseded') return 'Superseded';
  if (lower === 'withdrawn') return 'Withdrawn';
  if (lower === 'under_revision') return 'Under Revision';
  return String(raw);
}

/**
 * Normalizes and parses a testing requirement item (object or string clause).
 */
export function formatTestingClause(t) {
  if (typeof t === 'object' && t !== null && (t.clause || t.title)) {
    return {
      clause: t.clause || '',
      title: t.title || '',
      description: t.description || ''
    };
  }
  const str = String(t).trim();
  const match = str.match(/^(Clause\s+[0-9A-Za-z.\/]+)\s*[-:]\s*([^(]+?)(?:\s*\((.*)\))?$/i);
  if (match) {
    return {
      clause: match[1].trim(),
      title: match[2].trim(),
      description: match[3] ? match[3].trim() : ''
    };
  }
  return {
    clause: '',
    title: str,
    description: ''
  };
}

/**
 * Identifies the documented testing standard for a given standard record.
 */
export function findDocumentedTestingStandard(std) {
  if (!std) return null;
  if (std.details && std.details.related_testing_standard) {
    return std.details.related_testing_standard;
  }
  if (std.related_testing_standard) {
    return std.related_testing_standard;
  }

  // Check relatedStandards array
  const rels = std.relatedStandards || std.related_standards || [];
  if (Array.isArray(rels)) {
    for (const r of rels) {
      const type = (r.relationship_type || r.relationshipType || '').toLowerCase();
      const cat = (r.standard && r.standard.category ? r.standard.category : (r.category || '')).toLowerCase();
      const isNum = (r.standard && r.standard.is_number ? r.standard.is_number : (r.is_number || '')).toUpperCase();
      if (type.includes('test') || cat.includes('test') || isNum.includes('7692')) {
        return r.standard || r;
      }
    }
  }

  // Check related_standards categorized object
  if (std.related_standards && typeof std.related_standards === 'object') {
    const testList = std.related_standards.testEquipment || std.related_standards.testing || [];
    if (Array.isArray(testList) && testList.length > 0) {
      return testList[0];
    }
  }

  return null;
}

/**
 * Renders the documented testing standard card.
 */
function renderDocumentedTestingStandardBox(testStd) {
  if (!testStd) return '';
  const testStdNumber = testStd.is_number || testStd.number || '';
  const testStdTitle = testStd.title || '';
  const testStdScope = testStd.scope || testStd.description || '';
  const testStdReqs = (testStd.testing_requirements && testStd.testing_requirements.length > 0)
    ? testStd.testing_requirements
    : (testStd.testingRequirements || testStd.technical_requirements || testStd.technicalRequirements || []);

  return `
    <div class="demo-testing-standard-card" style="margin-top: 14px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px 16px;">
      <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 6px; flex-wrap: wrap;">
        <span style="background: #166534; color: #ffffff; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Documented Testing Standard</span>
        <strong style="color: #14532d; font-size: 13px;">${escapeHtml(testStdNumber)}: ${escapeHtml(testStdTitle)}</strong>
      </div>
      ${testStdScope ? `<p style="font-size: 12px; color: #166534; margin: 0 0 8px 0; line-height: 1.4;">${escapeHtml(testStdScope)}</p>` : ''}
      ${testStdReqs.length > 0 ? `
        <div style="font-size: 11px; font-weight: 700; color: #14532d; margin-bottom: 4px; text-transform: uppercase;">Testing Specifications:</div>
        <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #166534; line-height: 1.5;">
          ${testStdReqs.map(r => `<li>${escapeHtml(typeof r === 'object' ? (r.title || r.description || JSON.stringify(r)) : String(r))}</li>`).join('')}
        </ul>
      ` : ''}
    </div>
  `;
}

/**
 * Renders the complete, multi-section detailed analysis view for a selected Indian Standard.
 *
 * @param {Object} std Selected standard object
 * @param {Array<Object>} [allRecommendations=[]] All candidate recommendations for tab switcher
 * @param {number} [selectedRank=1] Currently active rank
 * @returns {string} HTML markup for the detailed analysis panel
 */
export function renderStandardDetailPanel(std, allRecommendations = [], selectedRank = 1) {
  if (!std || typeof std !== 'object') {
    return `
      <div class="standard-detail-empty" style="padding: 24px; text-align: center; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px;">
        <p style="color: #64748b; margin: 0;">Select a recommended Indian Standard above to review its full technical details and requirements.</p>
      </div>
    `;
  }

  const rank = std.rank || (std.scores && std.scores.rank) || selectedRank || 1;
  const isPrimary = rank === 1;
  const isNumber = std.is_number || 'Unknown Standard';
  const title = std.title || 'Standard Specification';
  const scope = std.scope || 'Information not available';
  const application = std.application || 'Information not available';

  const vStatus = std.versionStatus || std.version_information || {};
  const statusLabel = formatStatusLabel(vStatus.statusValue || vStatus.status, vStatus.statusCategory);
  const versionStr = vStatus.version || (std.publication_year ? `${isNumber} (${std.publication_year})` : isNumber);
  const pubYear = vStatus.publicationYear || std.publication_year || 'N/A';
  const reaffirmedYear = vStatus.reaffirmedYear || std.reaffirmed_year || null;
  const amendmentCount = vStatus.amendmentCount || (Array.isArray(vStatus.amendmentInfo) ? vStatus.amendmentInfo.length : (Array.isArray(vStatus.amendments) ? vStatus.amendments.length : 0));
  const supersessionStr = std.supersession_status || (vStatus.isSuperseded ? `Superseded by ${vStatus.supersededBy}` : (vStatus.supersedes ? `Supersedes ${vStatus.supersedes}` : 'Active (not superseded)'));

  // Standard-specific details object with graceful fallbacks
  const details = std.details || {};

  // Technical Requirements
  const techReqs = (Array.isArray(details.technical_requirements) && details.technical_requirements.length > 0)
    ? details.technical_requirements
    : ((Array.isArray(details.technicalRequirements) && details.technicalRequirements.length > 0)
      ? details.technicalRequirements
      : ((Array.isArray(std.technical_requirements) && std.technical_requirements.length > 0)
        ? std.technical_requirements
        : ((Array.isArray(std.technicalRequirements) && std.technicalRequirements.length > 0)
          ? std.technicalRequirements
          : [])));

  // Performance Requirements
  const perfReqs = (Array.isArray(details.performance_requirements) && details.performance_requirements.length > 0)
    ? details.performance_requirements
    : ((Array.isArray(details.performanceRequirements) && details.performanceRequirements.length > 0)
      ? details.performanceRequirements
      : ((Array.isArray(std.performance_requirements) && std.performance_requirements.length > 0)
        ? std.performance_requirements
        : ((Array.isArray(std.performanceRequirements) && std.performanceRequirements.length > 0)
          ? std.performanceRequirements
          : [])));

  // Safety Requirements
  const safetyReqs = (Array.isArray(details.safety_requirements) && details.safety_requirements.length > 0)
    ? details.safety_requirements
    : ((Array.isArray(details.safetyRequirements) && details.safetyRequirements.length > 0)
      ? details.safetyRequirements
      : ((Array.isArray(std.safety_requirements) && std.safety_requirements.length > 0)
        ? std.safety_requirements
        : ((Array.isArray(std.safetyRequirements) && std.safetyRequirements.length > 0)
          ? std.safetyRequirements
          : [])));

  // Testing Requirements clauses
  let testingReqs = (Array.isArray(details.testing_requirements) && details.testing_requirements.length > 0)
    ? details.testing_requirements
    : ((Array.isArray(details.testingRequirements) && details.testingRequirements.length > 0)
      ? details.testingRequirements
      : ((Array.isArray(std.testing_requirements) && std.testing_requirements.length > 0)
        ? std.testing_requirements
        : ((Array.isArray(std.testingRequirements) && std.testingRequirements.length > 0)
          ? std.testingRequirements
          : [])));

  // Documented Testing Standard (Step 8)
  const testStd = details.related_testing_standard || std.related_testing_standard || findDocumentedTestingStandard(std);

  // Certification & Regulatory
  const cert = std.certification || std.certification_information || {};
  const certScheme = cert.scheme || 'Information not available';
  const certExplicit = !!cert.requirementExplicit;
  const certValue = cert.requirementValue || 'Information not available';
  const qcoOrder = cert.qcoOrder || 'Information not available';
  const regReq = std.regulatory_information || cert.regulatoryRequirement || 'Information not available';
  const gazette = cert.gazetteNotification || null;

  // Gaps
  const gaps = std.gapDetection || std.gaps || { hasGap: false };

  // Explanation & Evidence
  const explanation = std.explanation || {};
  const whyRelevant = explanation.whyRelevant || (std.description || 'Information not available');
  const evidenceList = Array.isArray(explanation.evidence) && explanation.evidence.length > 0
    ? explanation.evidence
    : (Array.isArray(std.evidence) && std.evidence.length > 0 ? std.evidence : (Array.isArray(std.whyIdentified) ? std.whyIdentified : []));

  // Sources
  const sourcesList = Array.isArray(std.sources) && std.sources.length > 0
    ? std.sources
    : (std.source ? [std.source] : ['Official BIS Standards Repository']);

  // Tabs for switching standards
  const tabsHtml = Array.isArray(allRecommendations) && allRecommendations.length > 1 ? `
    <div class="detail-nav-tabs" role="tablist" aria-label="Recommended Standards Detail Switcher" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #e2e8f0;">
      <span style="font-size: 13px; font-weight: 700; color: #0a3161; align-self: center; margin-right: 8px;">Inspect Details:</span>
      ${allRecommendations.map((r, i) => {
        const rRank = r.rank || (r.scores && r.scores.rank) || (i + 1);
        const isActive = rRank === rank;
        return `
          <button
            type="button"
            role="tab"
            class="detail-tab-btn ${isActive ? 'detail-tab-btn--active' : ''}"
            id="detailTabBtn-${rRank}"
            data-rank="${rRank}"
            aria-selected="${isActive ? 'true' : 'false'}"
            style="padding: 7px 14px; font-size: 12.5px; font-weight: 700; border-radius: 6px; cursor: pointer; border: 1px solid ${isActive ? '#0a3161' : '#cbd5e1'}; background: ${isActive ? '#0a3161' : '#ffffff'}; color: ${isActive ? '#ffffff' : '#334155'}; transition: all 0.15s ease;"
          >
            Rank #${rRank}: ${escapeHtml(r.is_number)}
          </button>
        `;
      }).join('')}
    </div>
  ` : '';

  return `
    <section class="standard-detail-panel" id="standardDetailPanel" role="region" aria-labelledby="detailPanelHeading" style="margin-top: 24px; padding: 24px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
      
      <!-- Top Navigation Tabs -->
      ${tabsHtml}

      <!-- Header Banner for Selected Standard -->
      <div class="detail-panel-banner" style="background: #f8fafc; border-left: 4px solid #0a3161; padding: 16px 20px; border-radius: 0 6px 6px 0; margin-bottom: 22px;">
        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 8px;">
          <span class="card-rank-badge" style="background: #0a3161; color: #ffffff; padding: 3px 10px; border-radius: 4px; font-size: 12px; font-weight: 700;">Rank #${rank}</span>
          ${isPrimary ? `<span class="card-primary-label" style="background: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; border: 1px solid #bae6fd;">PRIMARY RELEVANT STANDARD</span>` : `<span class="card-primary-label" style="background: #f1f5f9; color: #475569; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; border: 1px solid #cbd5e1;">ALLIED / ALTERNATIVE STANDARD</span>`}
          <span class="card-status-badge card-status-badge--active" style="padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">Status: ${escapeHtml(statusLabel)} ${reaffirmedYear ? `(Reaffirmed ${reaffirmedYear})` : ''}</span>
        </div>
        <h3 id="detailPanelHeading" style="font-size: 22px; color: #0a3161; margin: 0 0 6px 0;">${escapeHtml(isNumber)}: ${escapeHtml(title)}</h3>
        <p style="margin: 0; color: #475569; font-size: 13.5px; line-height: 1.5;">
          <strong>Applicable Product / Application:</strong> ${escapeHtml(application)}
        </p>
      </div>

      <!-- Scope & Product Application Card -->
      <div class="detail-section" style="margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #e2e8f0;">
        <div class="detail-section__header" style="margin-bottom: 8px;">
          <h5 class="detail-section__title" style="font-size: 14px; font-weight: 700; color: #0a3161; text-transform: uppercase;">Scope &amp; Specification Domain</h5>
        </div>
        <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #1e293b;">
          ${escapeHtml(scope)}
        </p>
      </div>

      <!-- AI-Generated Grounded Explanation & Why Identified -->
      <div class="detail-section detail-section--ai" style="margin-bottom: 18px; padding: 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px;">
        <div class="detail-section__header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <h5 class="detail-section__title" style="font-size: 13px; font-weight: 700; color: #166534; text-transform: uppercase; margin: 0;">AI-Generated Explanation (Grounded Evidence)</h5>
          <span class="detail-section__tag" style="background: #dcfce7; color: #15803d; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">Grounded Evidence</span>
        </div>
        <p class="explanation-row__content" id="cardWhyRelevant-${rank}" style="font-size: 13px; line-height: 1.6; color: #14532d; margin: 0 0 10px 0;">
          ${escapeHtml(whyRelevant)}
        </p>
        ${evidenceList.length > 0 ? `
          <div style="margin-top: 10px; border-top: 1px solid #bbf7d0; padding-top: 10px;">
            <span style="font-size: 11.5px; font-weight: 700; color: #166534; text-transform: uppercase;">Supporting Evidence Factors:</span>
            <ul style="margin: 6px 0 0 0; padding-left: 20px; font-size: 12.5px; color: #1e293b; line-height: 1.5;">
              ${evidenceList.map(ev => `<li>${escapeHtml(ev)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>

      <!-- Technical Requirements Section -->
      <div class="detail-section" style="margin-bottom: 18px;">
        <div class="detail-section__header" style="margin-bottom: 8px;">
          <h5 class="detail-section__title" style="font-size: 14px; font-weight: 700; color: #0a3161; text-transform: uppercase;">TECHNICAL REQUIREMENTS</h5>
        </div>
        ${techReqs.length > 0 ? `
          <ul class="demo-req-card__list" style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.6; color: #334155;">
            ${techReqs.map(t => {
              const str = typeof t === 'object' && t !== null ? (t.description || t.title || JSON.stringify(t)) : String(t);
              const parts = str.split(/:\s*(.*)/s);
              if (parts.length > 1 && parts[0].length < 40) {
                return `<li><strong>${escapeHtml(parts[0])}:</strong> ${escapeHtml(parts[1])}</li>`;
              }
              return `<li>${escapeHtml(str)}</li>`;
            }).join('')}
          </ul>
          ${Array.isArray(std.sizes) && std.sizes.length > 0 ? `
            <div class="demo-size-chips" style="margin-top: 10px; display: flex; gap: 6px; flex-wrap: wrap;">
              ${std.sizes.map(s => `<span class="demo-size-chip" style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">${escapeHtml(s)}</span>`).join('')}
            </div>
          ` : ''}
        ` : `
          <p style="font-size: 12.5px; color: #64748b; font-style: italic; margin: 0;">Information not available in verified record.</p>
        `}
      </div>

      <!-- Performance Requirements & Safety Requirements Grid -->
      <div class="demo-requirements-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 18px;">
        <!-- Performance Requirements -->
        <div class="demo-req-card" style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 16px;">
          <h6 class="demo-req-card__title" style="font-size: 13px; font-weight: 700; color: #0a3161; margin: 0 0 10px 0; text-transform: uppercase;">PERFORMANCE REQUIREMENTS</h6>
          ${perfReqs.length > 0 ? `
            <ul class="demo-req-card__list" style="margin: 0; padding-left: 20px; font-size: 12.5px; line-height: 1.5; color: #334155;">
              ${perfReqs.map(p => `<li>${escapeHtml(typeof p === 'object' ? (p.title || JSON.stringify(p)) : p)}</li>`).join('')}
            </ul>
          ` : `
            <p style="font-size: 12px; color: #64748b; font-style: italic; margin: 0;">Information not available</p>
          `}
        </div>

        <!-- Safety Requirements -->
        <div class="demo-req-card" style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 16px;">
          <h6 class="demo-req-card__title" style="font-size: 13px; font-weight: 700; color: #0a3161; margin: 0 0 10px 0; text-transform: uppercase;">SAFETY REQUIREMENTS</h6>
          ${safetyReqs.length > 0 ? `
            <ul class="demo-req-card__list" style="margin: 0; padding-left: 20px; font-size: 12.5px; line-height: 1.5; color: #334155;">
              ${safetyReqs.map(s => `<li>${escapeHtml(typeof s === 'object' ? (s.title || JSON.stringify(s)) : s)}</li>`).join('')}
            </ul>
          ` : `
            <p style="font-size: 12px; color: #64748b; font-style: italic; margin: 0;">Information not available</p>
          `}
        </div>
      </div>

      <!-- Testing Requirements Section -->
      <div class="detail-section" style="margin-bottom: 18px;">
        <div class="detail-section__header" style="margin-bottom: 8px;">
          <h5 class="detail-section__title" style="font-size: 14px; font-weight: 700; color: #0a3161; text-transform: uppercase;">TESTING REQUIREMENTS (${escapeHtml(isNumber.split(':')[0])})</h5>
        </div>
        ${testingReqs.length > 0 ? `
          <ul class="demo-req-card__list" style="list-style: none; padding-left: 0; margin: 0;">
            ${testingReqs.map(t => {
              const item = formatTestingClause(t);
              if (item.clause) {
                return `
                  <li class="demo-clause-item" style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 12.5px; color: #334155;">
                    <span class="demo-clause-code" style="font-weight: 700; color: #0a3161;">${escapeHtml(item.clause)}:</span>
                    <strong>${escapeHtml(item.title || '')}</strong>${item.description ? ` &ndash; ${escapeHtml(item.description)}` : ''}
                  </li>
                `;
              }
              return `<li style="padding: 4px 0; font-size: 12.5px; color: #334155;">&bull; ${escapeHtml(item.title || String(t))}</li>`;
            }).join('')}
          </ul>
        ` : `
          <p style="font-size: 12.5px; color: #64748b; font-style: italic; margin: 0;">Information not available in verified record.</p>
        `}
        ${renderDocumentedTestingStandardBox(testStd)}
      </div>

      <!-- Related / Allied Standards Section -->
      <div class="detail-section" style="margin-bottom: 18px;">
        <div class="detail-section__header" style="margin-bottom: 8px;">
          <h5 class="detail-section__title" style="font-size: 14px; font-weight: 700; color: #0a3161; text-transform: uppercase;">RELATED / ALLIED STANDARDS</h5>
        </div>
        ${renderRelatedStandardsTable(std)}
      </div>

      <!-- Version & Amendment Intelligence -->
      <div class="detail-section" style="margin-bottom: 18px;">
        <div class="detail-section__header" style="margin-bottom: 8px;">
          <h5 class="detail-section__title" style="font-size: 14px; font-weight: 700; color: #0a3161; text-transform: uppercase;">Version &amp; Amendment Intelligence</h5>
        </div>
        <table class="detail-table" style="width: 100%; border-collapse: collapse; font-size: 12.5px;">
          <tbody>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <th style="width: 30%; padding: 8px 10px; background: #f8fafc; color: #0a3161; text-align: left;">Standard Version</th>
              <td style="padding: 8px 10px; color: #1e293b;">${escapeHtml(versionStr)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <th style="padding: 8px 10px; background: #f8fafc; color: #0a3161; text-align: left;">Publication / Reaffirmation</th>
              <td style="padding: 8px 10px; color: #1e293b;">Published ${escapeHtml(String(pubYear))} ${reaffirmedYear ? `&bull; Reaffirmed ${reaffirmedYear}` : ''}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <th style="padding: 8px 10px; background: #f8fafc; color: #0a3161; text-align: left;">Published Amendments</th>
              <td style="padding: 8px 10px; color: #1e293b;">${amendmentCount > 0 ? `${amendmentCount} verified amendment(s) in database catalogue` : 'No amendments recorded'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <th style="padding: 8px 10px; background: #f8fafc; color: #0a3161; text-align: left;">Supersession Status</th>
              <td style="padding: 8px 10px; color: #1e293b;">${escapeHtml(supersessionStr)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Certification & Regulatory / QCO Information -->
      <div class="demo-regulatory-card" style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 16px; margin-bottom: 18px;">
        <h5 class="demo-regulatory-card__title" style="font-size: 13px; font-weight: 700; color: #166534; margin: 0 0 10px 0; text-transform: uppercase;">BIS Certification &amp; Regulatory / QCO Context</h5>
        <div style="font-size: 12.5px; line-height: 1.6; color: #14532d;">
          <p style="margin: 0 0 6px 0;"><strong>Conformity Assessment Scheme:</strong> ${escapeHtml(certScheme)}</p>
          <p style="margin: 0 0 6px 0;"><strong>Quality Control Order:</strong> ${escapeHtml(qcoOrder)}</p>
          ${gazette ? `<p style="margin: 0 0 6px 0;"><strong>Statutory Reference:</strong> ${escapeHtml(gazette)}</p>` : ''}
          <p style="margin: 0 0 6px 0;"><strong>Regulatory Requirement:</strong> ${escapeHtml(regReq)}</p>
          <p style="margin: 0; font-size: 11.5px; color: #15803d; border-top: 1px solid #bbf7d0; padding-top: 6px; margin-top: 6px;">
            <strong>Compliance Note:</strong> Distinguishes regulatory applicability from individual supplier licence status. Verification of individual manufacturer licences should be conducted on the BIS Manakonline portal.
          </p>
        </div>
      </div>

      <!-- Identified Specification Gaps Section -->
      ${gaps && gaps.hasGap ? `
        <div class="demo-gap-card" role="region" aria-label="Potential Reference Gap" style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 16px; margin-bottom: 18px;">
          <div class="demo-gap-card__header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <h5 class="demo-gap-card__title" style="font-size: 13px; font-weight: 700; color: #92400e; margin: 0; text-transform: uppercase;">${escapeHtml(gaps.gapTitle || 'POTENTIAL REFERENCE GAP')}</h5>
            <span class="demo-gap-badge" style="background: #fef3c7; color: #b45309; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">${escapeHtml(gaps.gapStatus || 'Human Verification Required')}</span>
          </div>
          <p class="demo-gap-card__desc" style="font-size: 12.5px; color: #78350f; margin: 0 0 8px 0; line-height: 1.5;">
            ${escapeHtml(gaps.gapDescription || 'Identified potential specification considerations.')}
          </p>
          ${Array.isArray(gaps.potentialReferences) && gaps.potentialReferences.length > 0 ? `
            <ul class="demo-gap-card__list" style="margin: 0 0 8px 0; padding-left: 20px; font-size: 12px; color: #78350f; line-height: 1.5;">
              ${gaps.potentialReferences.map(r => `<li><strong>${escapeHtml(r.is_number)}:</strong> ${escapeHtml(r.title || '')} &ndash; ${escapeHtml(r.role || '')}</li>`).join('')}
            </ul>
          ` : ''}
          <p class="demo-gap-card__note" style="margin: 0; font-size: 11px; color: #92400e; font-style: italic;">
            ${escapeHtml(gaps.gapDisclaimer || 'Notice: This observation highlights potential references for human verification and does NOT imply that the tender specification is invalid.')}
          </p>
        </div>
      ` : ''}

      <!-- Source & Provenance Section -->
      <div class="detail-section detail-section--provenance" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px;">
        <div class="detail-section__header" style="margin-bottom: 6px;">
          <h5 class="detail-section__title" style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; margin: 0;">Source &amp; Provenance Record</h5>
        </div>
        <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
          ${sourcesList.map(s => escapeHtml(s)).join(' &bull; ')}
        </p>
      </div>

    </section>
  `;
}

/**
 * Helper to render related standards table from either categorized object or flat array.
 */
function renderRelatedStandardsTable(std) {
  const relObj = std.related_standards || std.relatedStandardsData || {};
  let rows = [];

  if (typeof relObj === 'object' && !Array.isArray(relObj) && relObj !== null) {
    if (Array.isArray(relObj.testEquipment)) {
      relObj.testEquipment.forEach(item => {
        rows.push({
          is_number: item.is_number,
          category: item.category || 'Test Equipment',
          title: item.title,
          description: item.description || ''
        });
      });
    }
    if (Array.isArray(relObj.sampling)) {
      relObj.sampling.forEach(item => {
        rows.push({
          is_number: item.is_number,
          category: item.category || 'Sampling Related',
          title: item.title,
          description: item.description || ''
        });
      });
    }
    if (Array.isArray(relObj.relatedHelmetProducts)) {
      relObj.relatedHelmetProducts.forEach(item => {
        rows.push({
          is_number: item.is_number,
          category: item.category || 'Related Product',
          title: item.title,
          description: item.description || ''
        });
      });
    }
    if (Array.isArray(relObj.relatedComponents)) {
      relObj.relatedComponents.forEach(item => {
        rows.push({
          is_number: item.is_number,
          category: item.category || 'Related Component',
          title: item.title,
          description: item.description || ''
        });
      });
    }
  }

  // Fallback to flat relatedStandards array
  if (rows.length === 0 && Array.isArray(std.relatedStandards)) {
    std.relatedStandards.forEach(rel => {
      const s = rel.standard || {};
      rows.push({
        is_number: s.is_number || rel.is_number || 'Standard',
        category: rel.relationship_type || rel.relationshipType || s.category || 'Related',
        title: s.title || rel.title || '',
        description: s.description || ''
      });
    });
  }

  if (rows.length === 0) {
    return `<p style="font-size: 12.5px; color: #64748b; font-style: italic; margin: 0;">Information not available in verified record.</p>`;
  }

  return `
    <table class="detail-table" style="width: 100%; border-collapse: collapse; font-size: 12.5px;">
      <thead>
        <tr style="background: #f8fafc; border-bottom: 2px solid #cbd5e1; text-align: left;">
          <th style="padding: 8px 10px; width: 22%; color: #0a3161;">Standard</th>
          <th style="padding: 8px 10px; width: 28%; color: #0a3161;">Category</th>
          <th style="padding: 8px 10px; color: #0a3161;">Title &amp; Scope</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 10px; font-weight: 700; color: #0a3161;">${escapeHtml(r.is_number)}</td>
            <td style="padding: 8px 10px;"><span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${escapeHtml(r.category)}</span></td>
            <td style="padding: 8px 10px; color: #334155;">${escapeHtml(r.title)} ${r.description ? `<br><small style="color: #64748b;">${escapeHtml(r.description)}</small>` : ''}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// Register on window for browser scripts
if (typeof window !== 'undefined') {
  window.NirdeshakStandardDetailDisplay = {
    renderStandardDetailPanel,
    formatStatusLabel,
    escapeHtml
  };
}
