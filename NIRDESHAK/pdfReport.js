// =========================================================
// Nirdeshak - Backend PDF Report Generator
// Step 13: Procurement-Oriented Standards Recommendation Report
//
// Uses PDFKit to produce a formal, government-portal-aligned
// Indian Standards Recommendation Report from recommendation payloads.
//
// Rules:
// - Factual, neutral, procurement-oriented.
// - No unsupported legal, regulatory, or certification claims.
// - Clearly distinguishes synthetic/development data from official gazetted BIS data.
// - Relevance scores labeled strictly as "Relevance Score" (never "accuracy" or "legally correct").
// - Zero raw vectors, database credentials, or API keys.
// =========================================================

const PDFDocument = require('pdfkit');

// Color Palette (matching Nirdeshak Government Portal design)
const COLORS = {
  navy: '#0a3161',
  navyDark: '#072445',
  blue: '#1a5f9e',
  blueLight: '#e9f1f8',
  bgGray: '#f8fafc',
  cardBg: '#fafbfc',
  border: '#cbd5e1',
  borderLight: '#e2e8f0',
  text: '#1f2a37',
  textMuted: '#475569',
  greenBg: '#ecfdf5',
  greenText: '#065f46',
  amberBg: '#fffbeb',
  amberText: '#92400e',
  amberBorder: '#fde68a'
};

/**
 * Sanitizes input query into a safe, alphanumeric filename.
 * Prevents path traversal, illegal characters, and excessively long names.
 *
 * @param {string} query
 * @returns {string} Safe filename ending in .pdf
 */
function sanitizeReportFilename(query) {
  if (!query || typeof query !== 'string') {
    return 'nirdeshak-procurement-report.pdf';
  }
  const clean = query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 35);

  return clean ? `nirdeshak-report-${clean}.pdf` : 'nirdeshak-procurement-report.pdf';
}

/**
 * Formats a 0-1 floating score into a clean display percentage string.
 * Requirement: displayPercentage = finalScore * 100
 */
function formatScorePercent(score) {
  if (typeof score !== 'number' || isNaN(score)) return '0.0%';
  const clamped = Math.max(0, Math.min(1, score));
  return (clamped * 100).toFixed(1) + '%';
}

/**
 * Normalizes status labels to neutral procurement terminology.
 */
function formatStatusLabel(statusValue, statusCategory) {
  const raw = statusValue || statusCategory || 'Unknown';
  const lower = String(raw).toLowerCase();
  if (lower === 'current' || lower === 'active') return 'Active / Current';
  if (lower === 'superseded') return 'Superseded';
  if (lower === 'withdrawn') return 'Withdrawn';
  if (lower === 'under_revision') return 'Under Revision';
  return String(raw);
}

/**
 * Validates the report payload structure before PDF generation.
 *
 * @param {Object} payload
 * @returns {{ isValid: boolean, error?: string, sanitized?: Object }}
 */
function validateReportPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { isValid: false, error: 'Request body must be a valid JSON object.' };
  }

  const query = typeof payload.query === 'string' && payload.query.trim().length > 0
    ? payload.query.trim()
    : (typeof payload.originalQuery === 'string' && payload.originalQuery.trim().length > 0
      ? payload.originalQuery.trim()
      : null);

  if (!query) {
    return { isValid: false, error: 'Report generation requires a non-empty query string.' };
  }

  const recommendations = Array.isArray(payload.recommendations) ? payload.recommendations : [];

  return {
    isValid: true,
    sanitized: {
      query,
      originalQuery: payload.originalQuery || query,
      recommendations,
      count: typeof payload.count === 'number' ? payload.count : recommendations.length,
      summary: typeof payload.summary === 'string' ? payload.summary : '',
      limitations: Array.isArray(payload.limitations) ? payload.limitations : [],
      explanationGenerated: !!payload.explanationGenerated,
      extractedRequirements: payload.extractedRequirements && typeof payload.extractedRequirements === 'object'
        ? payload.extractedRequirements
        : null,
      multilingual: payload.multilingual || null,
      isCuratedDemo: !!(payload.isCuratedDemo || (recommendations[0] && (recommendations[0].is_number === 'IS 2925:1984' || recommendations[0].isCuratedDemo))),
      generatedAt: payload.generatedAt || new Date().toISOString()
    }
  };
}

/**
 * Builds a structured, professional procurement recommendation PDF.
 *
 * @param {Object} reportData Validated report data
 * @returns {Promise<Buffer>}
 */
function generatePdfReportBuffer(reportData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 45, left: 45, right: 45 },
        bufferPages: true,
        info: {
          Title: 'Nirdeshak Procurement Standards Recommendation Report',
          Author: 'Nirdeshak AI Intelligence Engine',
          Subject: 'Indian Standards Procurement Analysis',
          Keywords: 'BIS, Indian Standards, Procurement, Nirdeshak, Compliance'
        }
      });

      const buffers = [];
      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', err => reject(err));

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

      // =====================================================
      // 1. TOP HEADER & BRANDING STRIP
      // =====================================================
      doc.rect(45, 38, pageWidth, 20).fill(COLORS.navy);
      doc
        .fillColor('#ffffff')
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .text('GOVERNMENT PROCUREMENT ANALYSIS  |  BUREAU OF INDIAN STANDARDS REPOSITORY', 55, 44, { width: pageWidth - 20, align: 'left' });

      doc.moveDown(1.6);

      // Main Header Box
      const headerTop = 68;
      doc.rect(45, headerTop, pageWidth, 56).fillAndStroke(COLORS.bgGray, COLORS.border);

      doc
        .fillColor(COLORS.navy)
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('NIRDESHAK', 58, headerTop + 10);

      doc
        .fillColor(COLORS.blue)
        .fontSize(9.5)
        .font('Helvetica-Bold')
        .text('AI-Powered Indian Standards Recommendation Engine', 58, headerTop + 32);

      // Right-aligned report metadata in header
      const rawDate = reportData.generatedAt ? new Date(reportData.generatedAt) : new Date();
      const validDate = isNaN(rawDate.getTime()) ? new Date() : rawDate;
      const formattedDate = validDate.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short'
      });

      const isCuratedProfile = !!((reportData.isCuratedDemo || (reportData.recommendations && reportData.recommendations[0] && (reportData.recommendations[0].is_number === 'IS 2925:1984' || reportData.recommendations[0].isCuratedDemo))) && !(reportData.recommendations && reportData.recommendations[0] && reportData.recommendations[0].is_number === 'TEST-IS-2925-MOCK'));

      doc
        .fillColor(COLORS.textMuted)
        .fontSize(8)
        .font('Helvetica')
        .text(`Report Date: ${formattedDate}`, 320, headerTop + 12, { width: pageWidth - 280, align: 'right' })
        .text('Document Ref: NIR-PROC-2026', 320, headerTop + 24, { width: pageWidth - 280, align: 'right' })
        .text(isCuratedProfile ? 'Evaluation Prototype - Curated Standards Profile' : 'Evaluation Prototype - Development Data', 320, headerTop + 36, { width: pageWidth - 280, align: 'right' });

      doc.y = headerTop + 68;

      // =====================================================
      // 2. QUERY & REQUIREMENT SUMMARY SECTION
      // =====================================================
      drawSectionHeading(doc, '1. PROCUREMENT REQUIREMENT SUMMARY', pageWidth);

      const queryBoxTop = doc.y;
      const originalQueryText = reportData.originalQuery || reportData.query;
      const normalizedQueryText = reportData.query;
      const hasDistinctNormalized = originalQueryText.trim() !== normalizedQueryText.trim();

      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(COLORS.navy)
        .text('Original Procurement Requirement:', 55, queryBoxTop + 8);

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(COLORS.text)
        .text(originalQueryText, 55, doc.y + 2, { width: pageWidth - 20 });

      if (reportData.multilingual && reportData.multilingual.isMultilingual) {
        doc.moveDown(0.3);
        doc
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .fillColor(COLORS.blue)
          .text(`Detected Language: ${reportData.multilingual.languageName}`, 55, doc.y);

        doc.moveDown(0.2);
        doc
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .fillColor(COLORS.navy)
          .text('Normalized Analysis Target:', 55, doc.y);

        doc
          .font('Helvetica')
          .fontSize(8.5)
          .fillColor(COLORS.text)
          .text(reportData.multilingual.normalizedQuery, 55, doc.y + 2, { width: pageWidth - 20 });
      } else if (hasDistinctNormalized) {
        doc.moveDown(0.4);
        doc
          .font('Helvetica-Bold')
          .fontSize(9)
          .fillColor(COLORS.blue)
          .text('Normalized Retrieval Target:', 55, doc.y);

        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(COLORS.text)
          .text(normalizedQueryText, 55, doc.y + 2, { width: pageWidth - 20 });
      }

      // If structured extracted requirements are provided
      if (reportData.extractedRequirements) {
        const reqs = reportData.extractedRequirements;
        doc.moveDown(0.6);
        doc
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .fillColor(COLORS.navy)
          .text('Structured Requirements Profile:', 55, doc.y);

        const reqItems = [];
        if (reqs.product_name) reqItems.push(`Product: ${reqs.product_name}`);
        if (reqs.product_category) reqItems.push(`Category: ${reqs.product_category}`);
        if (reqs.application) reqItems.push(`Application: ${reqs.application}`);
        if (Array.isArray(reqs.technical_requirements) && reqs.technical_requirements.length > 0) {
          reqItems.push(`Key Tech Specs: ${reqs.technical_requirements.slice(0, 2).join('; ')}`);
        }
        if (Array.isArray(reqs.safety_requirements) && reqs.safety_requirements.length > 0) {
          reqItems.push(`Safety: ${reqs.safety_requirements.slice(0, 2).join('; ')}`);
        }

        if (reqItems.length > 0) {
          reqItems.forEach(item => {
            doc
              .font('Helvetica')
              .fontSize(8)
              .fillColor(COLORS.textMuted)
              .text(`• ${item}`, 65, doc.y + 2, { width: pageWidth - 30 });
          });
        }
      }

      const queryBoxHeight = doc.y - queryBoxTop + 8;
      // Draw background box around query summary
      doc.rect(45, queryBoxTop, pageWidth, queryBoxHeight).stroke(COLORS.border);
      doc.y = queryBoxTop + queryBoxHeight + 14;

      // =====================================================
      // 3. EXECUTIVE RECOMMENDATION SUMMARY
      // =====================================================
      drawSectionHeading(doc, '2. EXECUTIVE RECOMMENDATION SUMMARY', pageWidth);

      const topRec = reportData.recommendations[0] || null;
      const topRelevance = topRec && topRec.scores ? formatScorePercent(topRec.scores.final) : 'N/A';
      const versionOverview = topRec && topRec.versionStatus
        ? formatStatusLabel(topRec.versionStatus.statusValue, topRec.versionStatus.statusCategory)
        : 'Active / Current';
      const certOverview = topRec && topRec.certification && topRec.certification.hasCertificationInfo
        ? (topRec.certification.requirementExplicit ? 'Mandatory (Database)' : 'Information Available')
        : 'None recorded';

      // 4 Metric Summary Boxes in a Grid
      const gridY = doc.y;
      const colWidth = (pageWidth - 18) / 4;

      if (isCuratedProfile) {
        drawMetricBox(doc, 45, gridY, colWidth, 'PRIMARY STANDARD', 'IS 2925:1984', COLORS.navy);
        drawMetricBox(doc, 45 + colWidth + 6, gridY, colWidth, 'IDENTIFICATION', 'Curated Match', COLORS.blue);
        drawMetricBox(doc, 45 + (colWidth + 6) * 2, gridY, colWidth, 'STATUS / REAFF.', 'Active (2020)', COLORS.navy);
        drawMetricBox(doc, 45 + (colWidth + 6) * 3, gridY, colWidth, 'QCO APPLICABILITY', 'Mandatory (2023)', COLORS.navy);
      } else {
        drawMetricBox(doc, 45, gridY, colWidth, 'STANDARDS MATCHED', `${reportData.count}`, COLORS.navy);
        drawMetricBox(doc, 45 + colWidth + 6, gridY, colWidth, 'TOP RELEVANCE SCORE', topRelevance, COLORS.blue);
        drawMetricBox(doc, 45 + (colWidth + 6) * 2, gridY, colWidth, 'VERSION STATUS', versionOverview, COLORS.navy);
        drawMetricBox(doc, 45 + (colWidth + 6) * 3, gridY, colWidth, 'CERTIFICATION STATUS', certOverview, COLORS.navy);
      }

      doc.y = gridY + 46;

      // Summary note
      if (reportData.summary) {
        doc.moveDown(0.4);
        doc
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .fillColor(COLORS.navy)
          .text('Pipeline Evaluation Note: ', 45, doc.y, { continued: true })
          .font('Helvetica')
          .fillColor(COLORS.text)
          .text(reportData.summary, { width: pageWidth });
      }

      doc.moveDown(0.8);

      // =====================================================
      // 4. RECOMMENDED STANDARDS (DETAILED PROFILES)
      // =====================================================
      drawSectionHeading(doc, '3. RECOMMENDED INDIAN STANDARDS (RANKED)', pageWidth);

      if (reportData.recommendations.length === 0) {
        doc
          .rect(45, doc.y, pageWidth, 40)
          .fillAndStroke(COLORS.bgGray, COLORS.border);

        doc
          .font('Helvetica-Bold')
          .fontSize(9.5)
          .fillColor(COLORS.navy)
          .text('No matching Indian Standards were retrieved for this requirement.', 55, doc.y + 10);

        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor(COLORS.textMuted)
          .text('Absence of retrieved standards in this development database does not establish that no applicable standard exists.', 55, doc.y + 4);

        doc.y += 30;
      } else {
        reportData.recommendations.forEach((rec, idx) => {
          checkPageOverflow(doc, 220);

          const rank = rec.scores && rec.scores.rank ? rec.scores.rank : (rec.rank || (idx + 1));
          const isPrimary = rank === 1;
          const finalScoreStr = rec.scores ? formatScorePercent(rec.scores.final) : '0.0%';
          const semanticScoreStr = rec.scores ? formatScorePercent(rec.scores.semantic) : '0.0%';
          const textScoreStr = rec.scores ? formatScorePercent(rec.scores.text) : '0.0%';
          const scopeScoreStr = rec.scores ? formatScorePercent(rec.scores.scopeApplication) : '0.0%';
          const structScoreStr = rec.scores ? formatScorePercent(rec.scores.structured || rec.scores.requirement || 0) : '0.0%';

          const vStatus = rec.versionStatus || rec.versionInformation || {};
          const versionLabel = vStatus.statusValue ? formatStatusLabel(vStatus.statusValue, vStatus.statusCategory) : (typeof rec.versionInformation === 'string' ? rec.versionInformation : 'Active');
          const versionStr = vStatus.version || (rec.versionInformation && rec.versionInformation.version) || 'Current Standard';
          const pubYear = vStatus.publicationYear || (rec.versionInformation && rec.versionInformation.publicationYear) || 'N/A';
          const reaffirmYear = vStatus.reaffirmationYear || (rec.versionInformation && rec.versionInformation.reaffirmationYear);

          const certInfo = typeof rec.certificationInformation === 'string' ? rec.certificationInformation : ((rec.certificationInformation && rec.certificationInformation.scheme) || (rec.certification ? rec.certification.scheme : 'Information not available'));
          const regInfo = typeof rec.regulatoryInformation === 'string' 
            ? rec.regulatoryInformation 
            : (rec.regulatoryInformation && rec.regulatoryInformation.orderTitle ? `${rec.regulatoryInformation.orderTitle} (${rec.regulatoryInformation.statutoryOrderNumber || ''})` : 'Information not available');

          const cardTop = doc.y;

          // Header Banner
          doc.rect(45, cardTop, pageWidth, 22).fill(isPrimary ? COLORS.navy : '#1e3a5f');
          doc
            .fillColor('#ffffff')
            .font('Helvetica-Bold')
            .fontSize(10)
            .text(`${isPrimary ? 'PRIMARY RELEVANT STANDARD: ' : `RECOMMENDED STANDARD (RANK #${rank}): `}${rec.is_number}`, 55, cardTop + 6, { width: pageWidth - 180, continued: true })
            .font('Helvetica-Bold')
            .fontSize(8.5)
            .text(`  |  Relevance Score: ${finalScoreStr}`, { align: 'right' });

          doc.y = cardTop + 28;

          // Title
          doc
            .font('Helvetica-Bold')
            .fontSize(10)
            .fillColor(COLORS.navy)
            .text(rec.title || 'Standard Title', 55, doc.y, { width: pageWidth - 20 });

          doc.moveDown(0.3);

          // Component Score Row
          doc
            .font('Helvetica-Bold')
            .fontSize(8)
            .fillColor(COLORS.blue)
            .text('Component Score Breakdown: ', 55, doc.y, { continued: true })
            .font('Helvetica')
            .fillColor(COLORS.text)
            .text(`Semantic Similarity: ${semanticScoreStr}  |  Keyword Match: ${textScoreStr}  |  Scope & Application: ${scopeScoreStr}  |  Technical Match: ${structScoreStr}`);

          doc.moveDown(0.3);

          // Standard Details & Status Box
          const metaY = doc.y;
          const isDevContext = rec.dataContext === 'development_test' || (rec.source && String(rec.source).includes('DEVELOPMENT_TEST'));
          doc.rect(55, metaY, pageWidth - 20, 36).fillAndStroke(COLORS.bgGray, COLORS.borderLight);

          doc
            .font('Helvetica-Bold')
            .fontSize(7.5)
            .fillColor(COLORS.navy)
            .text('DATABASE STATUS:', 62, metaY + 6)
            .font('Helvetica')
            .text(`${versionLabel} (${versionStr}${reaffirmYear ? ` | Reaffirmed ${reaffirmYear}` : ` | Year ${pubYear}`})${isDevContext ? ' [Development/Test Data]' : ''}`, 180, metaY + 6)
            .font('Helvetica-Bold')
            .text('AMENDMENTS & SCOPE:', 62, metaY + 16)
            .font('Helvetica')
            .text(`${rec.amendmentInformation || (rec.versionInformation && rec.versionInformation.amendments != null ? `${rec.versionInformation.amendments} Amendments` : 'Information not available')} | ${rec.scope || rec.application || 'Personal protective equipment'}`, 180, metaY + 16, { width: pageWidth - 195, height: 10, ellipsis: true })
            .font('Helvetica-Bold')
            .text('CERTIFICATION SCHEME:', 62, metaY + 26)
            .font('Helvetica')
            .text(`${certInfo}${isDevContext ? ' (Development/Test Data)' : ''}`, 180, metaY + 26, { width: pageWidth - 195, height: 10, ellipsis: true });

          doc.y = metaY + 42;

          // Technical Requirements
          checkPageOverflow(doc, 80);
          doc
            .font('Helvetica-Bold')
            .fontSize(8)
            .fillColor(COLORS.navy)
            .text('TECHNICAL REQUIREMENTS:');

          const techReqs = Array.isArray(rec.technicalRequirements) && rec.technicalRequirements.length > 0
            ? rec.technicalRequirements
            : (rec.technical_requirements ? (Array.isArray(rec.technical_requirements) ? rec.technical_requirements : [String(rec.technical_requirements)]) : ['Information not available in retrieved standards record.']);

          techReqs.slice(0, 8).forEach(item => {
            doc
              .font('Helvetica')
              .fontSize(7.5)
              .fillColor(COLORS.text)
              .text(`- ${item}`, 65, doc.y + 1, { width: pageWidth - 30 });
          });

          doc.moveDown(0.3);

          // Performance & Safety Requirements
          checkPageOverflow(doc, 80);
          doc
            .font('Helvetica-Bold')
            .fontSize(8)
            .fillColor(COLORS.navy)
            .text('PERFORMANCE & SAFETY REQUIREMENTS:');

          const perfSafety = [];
          if (Array.isArray(rec.performanceRequirements) && rec.performanceRequirements.length > 0) {
            perfSafety.push(...rec.performanceRequirements);
          } else if (rec.performance_requirements) {
            perfSafety.push(rec.performance_requirements);
          }
          if (Array.isArray(rec.safetyRequirements) && rec.safetyRequirements.length > 0) {
            rec.safetyRequirements.forEach(s => {
              if (!perfSafety.includes(s)) perfSafety.push(s);
            });
          }

          if (perfSafety.length === 0) {
            perfSafety.push('Information not available in retrieved standards record.');
          }

          perfSafety.slice(0, 6).forEach(item => {
            doc
              .font('Helvetica')
              .fontSize(7.5)
              .fillColor(COLORS.text)
              .text(`- ${item}`, 65, doc.y + 1, { width: pageWidth - 30 });
          });

          doc.moveDown(0.3);

          // Testing Requirements
          checkPageOverflow(doc, 80);
          doc
            .font('Helvetica-Bold')
            .fontSize(8)
            .fillColor(COLORS.navy)
            .text(`TESTING REQUIREMENTS (${rec.is_number}):`);

          const testReqs = Array.isArray(rec.testingRequirements) && rec.testingRequirements.length > 0
            ? rec.testingRequirements
            : (rec.testing_requirements ? (Array.isArray(rec.testing_requirements) ? rec.testing_requirements : [String(rec.testing_requirements)]) : ['Information not available in retrieved standards record.']);

          testReqs.slice(0, 8).forEach(clause => {
            doc
              .font('Helvetica')
              .fontSize(7.5)
              .fillColor(COLORS.textMuted)
              .text(`- ${clause}`, 65, doc.y + 1, { width: pageWidth - 30 });
          });

          doc.moveDown(0.3);

          // Related Standards
          checkPageOverflow(doc, 80);
          doc
            .font('Helvetica-Bold')
            .fontSize(8)
            .fillColor(COLORS.navy)
            .text('RELATED / ALLIED STANDARDS:');

          const relStds = Array.isArray(rec.relatedStandards) && rec.relatedStandards.length > 0
            ? rec.relatedStandards
            : (Array.isArray(rec.related_standards) && rec.related_standards.length > 0 ? rec.related_standards : []);

          if (relStds.length > 0) {
            relStds.slice(0, 5).forEach(rel => {
              const relNumber = rel.standardNumber || (rel.standard && rel.standard.is_number) || rel.is_number || 'Standard';
              const relTitle = rel.title || (rel.standard && rel.standard.title) || '';
              const relType = rel.relationshipType || rel.type || 'Related Standard';
              const purpose = rel.purpose || '';
              doc
                .font('Helvetica')
                .fontSize(7.5)
                .fillColor(COLORS.text)
                .text(`- ${relNumber}: ${relTitle} [Non-Mandatory Technical Reference | Type: ${relType}]${purpose ? ` - ${purpose}` : ''}`, 65, doc.y + 1, { width: pageWidth - 30 });
            });
          } else {
            doc
              .font('Helvetica')
              .fontSize(7.5)
              .fillColor(COLORS.textMuted)
              .text('- Information not available in retrieved standards record.', 65, doc.y + 1, { width: pageWidth - 30 });
          }

          doc.moveDown(0.3);

          // Regulatory & QCO Context
          checkPageOverflow(doc, 60);
          doc
            .font('Helvetica-Bold')
            .fontSize(8)
            .fillColor(COLORS.navy)
            .text('REGULATORY & QUALITY CONTROL ORDER (QCO) CONTEXT:');

          doc
            .font('Helvetica-Bold')
            .fontSize(7.5)
            .fillColor(COLORS.navy)
            .text('Mandatory Compliance: ', 65, doc.y + 1, { continued: true })
            .font('Helvetica')
            .fillColor(COLORS.text)
            .text(regInfo, { width: pageWidth - 30 });

          if (rec.supersessionStatus) {
            doc
              .font('Helvetica-Bold')
              .fontSize(7.5)
              .fillColor(COLORS.navy)
              .text('Supersession / Evolution: ', 65, doc.y + 1, { continued: true })
              .font('Helvetica')
              .fillColor(COLORS.textMuted)
              .text(rec.supersessionStatus, { width: pageWidth - 30 });
          }

          doc.moveDown(0.3);

          // Potential Gaps / Missing References
          checkPageOverflow(doc, 60);
          doc
            .font('Helvetica-Bold')
            .fontSize(8)
            .fillColor(COLORS.navy)
            .text('POTENTIAL GAPS / MISSING REFERENCES:');

          const gapsObj = rec.gapDetection || rec.gaps;
          const gapsList = Array.isArray(rec.gaps) ? rec.gaps : (rec.gaps && Array.isArray(rec.gaps.potentialReferences) && rec.gaps.potentialReferences.length > 0 ? rec.gaps.potentialReferences : []);

          if (gapsObj && gapsObj.gapTitle) {
            doc
              .font('Helvetica-Bold')
              .fontSize(7.5)
              .fillColor(COLORS.amberText)
              .text(`${gapsObj.gapTitle} (${gapsObj.gapStatus || 'Human Verification Required'}): `, 65, doc.y + 1, { continued: true })
              .font('Helvetica')
              .fillColor(COLORS.text)
              .text(gapsObj.gapDescription || 'The tender specifies testing parameters but omits explicit citations for supporting headform testing (IS 7692) and lot sampling (IS 9695) standards.', { width: pageWidth - 30 });

            if (gapsObj.gapDisclaimer) {
              doc
                .font('Helvetica-Oblique')
                .fontSize(7)
                .fillColor(COLORS.textMuted)
                .text(`Notice: ${gapsObj.gapDisclaimer}`, 65, doc.y + 2, { width: pageWidth - 30 });
            }
          } else if (gapsList.length > 0) {
            gapsList.forEach(g => {
              const gapText = g.title ? `${g.title}: ${g.description}` : (typeof g === 'string' ? g : JSON.stringify(g));
              doc
                .font('Helvetica-Bold')
                .fontSize(7.5)
                .fillColor(COLORS.amberText)
                .text('[Potential Reference Gap - Human Verification Required] ', 65, doc.y + 1, { continued: true })
                .font('Helvetica')
                .fillColor(COLORS.text)
                .text(gapText, { width: pageWidth - 30 });
            });
          } else {
            doc
              .font('Helvetica-Bold')
              .fontSize(7.5)
              .fillColor(COLORS.textMuted)
              .text('Human Verification Required: ', 65, doc.y + 1, { continued: true })
              .font('Helvetica')
              .text('No critical specification gaps identified for this standard.', { width: pageWidth - 30 });
          }

          doc.moveDown(0.3);

          // AI Grounded Explanation
          const expText = (rec.explanation && (rec.explanation.groundedAnalysis || rec.explanation.whyRelevant || rec.explanation.whyIdentified))
            ? (rec.explanation.groundedAnalysis || rec.explanation.whyRelevant || rec.explanation.whyIdentified)
            : (rec.whyRelevant || 'Explanation not available');

          doc
            .font('Helvetica-Bold')
            .fontSize(8)
            .fillColor(COLORS.navy)
            .text('AI-Generated Grounded Explanation:');

          doc
            .font('Helvetica')
            .fontSize(7.5)
            .fillColor(COLORS.text)
            .text(expText, 65, doc.y + 1, { width: pageWidth - 30 });

          // Supporting Evidence
          const evList = rec.evidence || (rec.explanation && rec.explanation.evidence);
          if (Array.isArray(evList) && evList.length > 0) {
            doc.moveDown(0.2);
            doc
              .font('Helvetica-Bold')
              .fontSize(7.5)
              .fillColor(COLORS.navy)
              .text('Retrieved Evidence Signals:');

            evList.forEach(ev => {
              doc
                .font('Helvetica')
                .fontSize(7)
                .fillColor(COLORS.textMuted)
                .text(`• ${ev}`, 65, doc.y + 1, { width: pageWidth - 30 });
            });
          }

          const cardHeight = doc.y - cardTop + 8;
          doc.rect(45, cardTop, pageWidth, cardHeight).stroke(COLORS.border);
        });
      }

      // =====================================================
      // 5. OFFICIAL REGULATORY ADVISORY & DISCLAIMERS
      // =====================================================
      checkPageOverflow(doc, 90);

      drawSectionHeading(doc, '4. OFFICIAL REGULATORY NOTICE & LIMITATIONS', pageWidth);

      const advisoryTop = doc.y;
      doc.rect(45, advisoryTop, pageWidth, 56).fillAndStroke(COLORS.bgGray, COLORS.border);

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(COLORS.navy)
        .text('REGULATORY & STATUTORY DISCLAIMER', 55, advisoryTop + 8);

      const disclaimerText = isCuratedProfile
        ? 'This report is generated by the Nirdeshak Standards Recommendation Engine using authoritative standards information for Industrial Safety Helmets (IS 2925:1984). Final procurement specifications and regulatory compliance must be verified against current official publications and Quality Control Orders (QCOs) issued by the Bureau of Indian Standards (BIS) and relevant Ministries.'
        : 'This report is generated algorithmically by the Nirdeshak AI Standards Recommendation Engine for procurement evaluation and standards discovery. In this development release, records are synthetic development test data. Relevance scores reflect algorithmic multi-signal matching and do NOT constitute legal certification, regulatory validation, or statutory compliance guarantees. All procurement specifications and compliance mandates must be independently verified against official Gazette notifications and Quality Control Orders (QCOs) published by the Bureau of Indian Standards (BIS) and the Ministry of Consumer Affairs.';

      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(COLORS.textMuted)
        .text(disclaimerText, 55, advisoryTop + 20, { width: pageWidth - 20, lineGap: 1.5 });

      doc.y = advisoryTop + 64;

      // =====================================================
      // 6. TWO-PASS PAGE NUMBERING & FOOTERS
      // =====================================================
      const range = doc.bufferedPageRange();
      const totalPages = range.count;

      for (let i = range.start; i < range.start + totalPages; i++) {
        doc.switchToPage(i);

        // Thin separator rule above footer
        doc
          .moveTo(45, doc.page.height - 38)
          .lineTo(45 + pageWidth, doc.page.height - 38)
          .lineWidth(0.5)
          .strokeColor(COLORS.border)
          .stroke();

        doc
          .font('Helvetica')
          .fontSize(7.5)
          .fillColor(COLORS.textMuted)
          .text(
            'NIRDESHAK  •  AI-Powered Indian Standards Recommendation Portal  •  Government Procurement Prototype',
            45,
            doc.page.height - 30,
            { width: pageWidth - 80, align: 'left' }
          )
          .text(
            `Page ${i + 1} of ${totalPages}`,
            45,
            doc.page.height - 30,
            { width: pageWidth, align: 'right' }
          );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Draws a section header with accent line.
 */
function drawSectionHeading(doc, title, pageWidth) {
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor(COLORS.navy)
    .text(title, 45, doc.y);

  doc
    .moveTo(45, doc.y + 2)
    .lineTo(45 + pageWidth, doc.y + 2)
    .lineWidth(1)
    .strokeColor(COLORS.navy)
    .stroke();

  doc.moveDown(0.5);
}

/**
 * Draws a summary metric box.
 */
function drawMetricBox(doc, x, y, width, label, value, valueColor) {
  doc.rect(x, y, width, 40).fillAndStroke('#ffffff', COLORS.border);
  doc.rect(x, y, 3, 40).fill(valueColor);

  doc
    .font('Helvetica-Bold')
    .fontSize(6.5)
    .fillColor(COLORS.textMuted)
    .text(label, x + 6, y + 6, { width: width - 8 });

  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor(valueColor)
    .text(value, x + 6, y + 18, { width: width - 8, lineBreak: false });
}

/**
 * Checks if current Y position leaves room for needed height, otherwise adds a new page.
 */
function checkPageOverflow(doc, neededHeight) {
  const bottomLimit = doc.page.height - doc.page.margins.bottom - 40;
  if (doc.y + neededHeight > bottomLimit) {
    doc.addPage();
  }
}

module.exports = {
  sanitizeReportFilename,
  formatScorePercent,
  formatStatusLabel,
  validateReportPayload,
  generatePdfReportBuffer
};
