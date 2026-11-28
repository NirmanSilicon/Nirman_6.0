const fs = require('fs');
const path = require('path');
const { query, closePool } = require('../database');

async function generateMarkdownReports() {
  console.log('Generating markdown reports...');

  // 1. Fetch data for reconciliation
  const covStatusSummary = await query(`
    SELECT coverage_status, count(*) as count
    FROM product_families
    GROUP BY coverage_status
    ORDER BY count DESC;
  `);

  const staleRows = await query(`
    WITH product_counts AS (
      SELECT 
        pf.id,
        pf.canonical_name,
        pf.division_council,
        pf.coverage_status as stored_status,
        COUNT(psm.id) as mapping_count,
        COUNT(CASE WHEN psm.relationship_type = 'primary_specification' THEN 1 END) as primary_count,
        COUNT(CASE WHEN psm.relationship_type != 'primary_specification' THEN 1 END) as supporting_count
      FROM product_families pf
      LEFT JOIN product_standard_mappings psm ON pf.id = psm.product_family_id
      GROUP BY pf.id, pf.canonical_name, pf.division_council, pf.coverage_status
    )
    SELECT *,
      CASE 
        WHEN mapping_count = 0 AND stored_status = 'VERIFIED_SUPPORTING_ONLY' THEN 'ORPHANED_SUPPORTING_STATUS'
        WHEN mapping_count = 0 AND stored_status = 'VERIFIED_PRIMARY' THEN 'ORPHANED_PRIMARY_STATUS'
        WHEN mapping_count = 0 AND stored_status = 'CANDIDATE_UNVERIFIED' THEN 'ORPHANED_CANDIDATE_STATUS'
        WHEN primary_count > 0 AND stored_status = 'VERIFIED_SUPPORTING_ONLY' THEN 'UNDERCLASSIFIED_PRIMARY'
        WHEN primary_count = 0 AND mapping_count > 0 AND stored_status = 'VERIFIED_PRIMARY' THEN 'OVERCLASSIFIED_PRIMARY'
        ELSE 'OTHER_INCONSISTENCY'
      END as inconsistency_type
    FROM product_counts
    WHERE 
      (mapping_count = 0 AND stored_status NOT IN ('NO_APPLICABLE_STANDARD_FOUND', 'PRODUCT_CLARIFICATION_REQUIRED', 'DISCOVERED_CATALOGUE_ONLY'))
      OR (primary_count > 0 AND stored_status = 'VERIFIED_SUPPORTING_ONLY')
      OR (primary_count = 0 AND mapping_count > 0 AND stored_status = 'VERIFIED_PRIMARY')
    ORDER BY id ASC;
  `);

  // -------------------------------------------------------------
  // REPORT 1: NIRDESHAK_COVERAGE_STATUS_RECONCILIATION.md
  // -------------------------------------------------------------
  let reconMd = `# NIRDESHAK — Coverage Status Reconciliation Report
**Database:** \`nirdeshak_clean_20261126\`  
**Date of Audit:** November 28, 2026  
**Audit Mode:** Strictly Read-Only  

---

## 1. Executive Summary: The Coverage Number Discrepancy

Earlier progress reports for NIRDESHAK stated the following macro coverage metrics:
- **Verified Primary Products:** 781
- **Verified Supporting-Only Products:** 252
- **Candidate / Unverified Products:** 11
- **Products with No Applicable Standard Found:** 2
- **Products Requiring Clarification:** 1
- **Total "Covered" Products:** 1,033 (781 + 252)
- **Reported Unmapped Products:** 14

### Actual Live PostgreSQL Database State
A direct relational query of the active PostgreSQL database (\`product_families\` and \`product_standard_mappings\`) reveals the actual distribution:
- **Total Product Families:** 1,047
- **Total Active Indian Standards:** 710
- **Total Active Product-Standard Mappings:** 1,125
- **Distinct Products with >= 1 Primary Mapping:** 778 (732 single-mapping + 46 multi-mapping)
- **Distinct Products with Supporting-Only Mappings:** 201 (165 single-mapping + 36 multi-mapping)
- **Total Distinct Products with Active Mappings:** 979 (93.51%)
- **Total Distinct Products with 0 Active Mappings:** 68 (6.49%)

### Stored \`coverage_status\` Column Distribution in \`product_families\` Table
| Stored \`coverage_status\` Value | Database Row Count |
| :--- | :--- |
| \`VERIFIED_PRIMARY\` | 780 |
| \`VERIFIED_SUPPORTING_ONLY\` | 241 |
| \`CANDIDATE_UNVERIFIED\` | 23 |
| \`NO_APPLICABLE_STANDARD_FOUND\` | 2 |
| \`PRODUCT_CLARIFICATION_REQUIRED\` | 1 |
| **Total** | **1,047** |

---

## 2. Root Cause Analysis: Why Stored Statuses Diverged from Live Mappings

The numerical discrepancy between previous reports (1,033 covered / 14 unmapped) and current database realities (979 mapped / 68 zero-mapped) stems from a **data lifecycle synchronization gap** during the relevance remediation phase:

1. **Purging of 77 Invalid Mappings:**
   In earlier bulk knowledge expansions, 77 invalid mappings were introduced (notably 54 syringe standards like \`IS 10258\` erroneously attached across automotive components in Transport Engineering).
   During the deep relevance audit and remediation, these 77 erroneous mapping rows were deleted from \`product_standard_mappings\` to protect recommendation accuracy.

2. **Unsynchronized Column State:**
   While the mapping rows were correctly deleted from the join table, the \`coverage_status\` column on \`product_families\` was **not updated**.
   As a result:
   - 42 Transport Engineering products that previously held syringe mappings became zero-mapping products, but retained their historical \`VERIFIED_SUPPORTING_ONLY\` or \`CANDIDATE_UNVERIFIED\` flag.
   - Another 23 products across other divisions had mappings purged or re-evaluated without resetting the product-level enum.

3. **Underclassified Primary Product:**
   Product ID 302 (\`Electric Two-Wheeler Lithium-Ion Battery Packs (AIS 156 / IS 16046)\`) possesses a genuine \`primary_specification\` mapping to \`IS 16046 (Part 2):2018\`, but its stored status was never promoted from \`VERIFIED_SUPPORTING_ONLY\` to \`VERIFIED_PRIMARY\`.

---

## 3. Complete Inventory of Stale / Inconsistent Products (66 Records)

The following 66 products have stored \`coverage_status\` values in \`product_families\` that conflict with their actual relational mapping records:

| Product ID | Canonical Product Name | Division Council | Stored Status | Actual Mappings (Pri/Supp) | Inconsistency Classification |
| :---: | :--- | :--- | :--- | :---: | :--- |
`;

  for (const r of staleRows.rows) {
    reconMd += `| ${r.id} | ${r.canonical_name} | ${r.division_council} | \`${r.stored_status}\` | ${r.primary_count} Pri / ${r.supporting_count} Supp (${r.mapping_count} total) | \`${r.inconsistency_type}\` |\n`;
  }

  reconMd += `
---

## 4. Reconciliation Matrix and Correction Roadmap

To bring the database into complete mathematical and relational integrity (when write operations are sanctioned in the next phase), the following reconciliation rules must be applied:

1. **Zero-Mapping Products (65 Records):**
   - Products with 0 mappings must have their status transitioned to \`DISCOVERED_CATALOGUE_ONLY\` or \`NO_APPLICABLE_STANDARD_FOUND\` depending on whether candidate standards exist.
   - 42 Transport Engineering products should be classified as \`GOVERNED_BY_AIS_CMVR\` or \`PENDING_STANDARDS_INDEXATION\`.
   - 2 AYUSH products should be classified as \`GOVERNED_BY_AYUSH_PHARMACOPOEIA\`.

2. **Underclassified Primary Products (1 Record):**
   - Product ID 302 (\`Electric Two-Wheeler Lithium-Ion Battery Packs\`) must be updated from \`VERIFIED_SUPPORTING_ONLY\` to \`VERIFIED_PRIMARY\`.

3. **Automated Trigger / Consistency Constraint:**
   - In future database migrations, introduce an automated trigger or generated column view so that \`coverage_status\` dynamically mirrors the actual state of \`product_standard_mappings\`.
`;

  fs.writeFileSync(path.join(__dirname, '../NIRDESHAK_COVERAGE_STATUS_RECONCILIATION.md'), reconMd, 'utf8');
  console.log('Wrote NIRDESHAK_COVERAGE_STATUS_RECONCILIATION.md');

  // -------------------------------------------------------------
  // REPORT 2: NIRDESHAK_DUPLICATE_PRODUCT_FAMILY_AUDIT.md
  // -------------------------------------------------------------
  const dupData = await query(`
    SELECT 
      pf.id,
      pf.canonical_name,
      pf.division_council,
      pf.subcategory,
      pf.description,
      pf.applications,
      pf.coverage_status,
      json_agg(json_build_object(
        'mapping_id', psm.id,
        'relationship_type', psm.relationship_type,
        'verification_status', psm.verification_status,
        'is_number', s.is_number,
        'title', s.title
      )) as mappings
    FROM product_families pf
    LEFT JOIN product_standard_mappings psm ON pf.id = psm.product_family_id
    LEFT JOIN standards s ON psm.standard_id = s.id
    WHERE pf.id = ANY($1::int[])
    GROUP BY pf.id, pf.canonical_name, pf.division_council, pf.subcategory, pf.description, pf.applications, pf.coverage_status
    ORDER BY pf.canonical_name ASC, pf.id ASC;
  `, [[12, 611, 3, 593, 6, 599, 4, 597, 388, 819, 339, 790]]);

  let dupMd = `# NIRDESHAK — Duplicate Product Family Audit Report
**Database:** \`nirdeshak_clean_20261126\`  
**Date of Audit:** November 28, 2026  
**Audit Mode:** Strictly Read-Only  

---

## 1. Executive Summary

During the universal knowledge base expansion, NIRDESHAK's product catalogue grew from initial seed batches into a 1,047-family taxonomy across all 17 BIS Division Councils.
This read-only audit investigated potential duplicate product entries created across different expansion phases.

We have identified **4 major confirmed duplicate pairs in Civil Engineering**, as well as **2 duplicate pairs across Mechanical and Management systems**:
1. **Autoclaved Aerated Concrete (AAC) Blocks:** Product 12 vs Product 611
2. **Portland Slag Cement (PSC):** Product 3 vs Product 593
3. **Ready-Mixed Concrete (RMC):** Product 6 vs Product 599
4. **White Portland Cement:** Product 4 vs Product 597
5. **Hydraulic Hand Pallet Trucks:** Product 388 vs Product 819
6. **Business Continuity Management (ISO 22301):** Product 339 vs Product 790

---

## 2. Detailed Technical Comparison of Duplicate Pairs

### Pair 1: Autoclaved Aerated Concrete (AAC) Blocks (ID 12 vs ID 611)
- **Product ID 12:**
  - *Canonical Name:* \`Autoclaved Aerated Concrete (AAC) Blocks\`
  - *Division Council:* Civil Engineering (CED)
  - *Subcategory:* Masonry Units & Wall Materials (Precast Concrete)
  - *Mappings (5):* \`IS 2185 (Part 3):1984\` (Primary), \`IS 516 (Part 1/Sec 1):2021\` (Supporting), \`IS 456:2000\` (Supporting), \`IS 10262:2019\` (Supporting), \`IS 15988:2013\` (Supporting).
- **Product ID 611:**
  - *Canonical Name:* \`Autoclaved Aerated Concrete (AAC) Blocks\`
  - *Division Council:* Civil Engineering (CED)
  - *Subcategory:* Precast Concrete & Masonry Products
  - *Mappings (5):* Exactly identical 5 standards mapped with identical relationship types.
- **Root Cause & Impact:** Product 12 was seeded in the initial 58-product catalogue. Product 611 was ingested during the Batch 2 Civil Engineering bulk expansion. They represent the exact same physical building material. The duplicate causes dual hits and fragmented semantic ranking.

---

### Pair 2: Portland Slag Cement (PSC) (ID 3 vs ID 593)
- **Product ID 3:**
  - *Canonical Name:* \`Portland Slag Cement (PSC)\`
  - *Division Council:* Civil Engineering (CED)
  - *Subcategory:* Cement & Binding Materials
  - *Mappings (2):* \`IS 455:2015\` (Primary), \`IS 456:2000\` (Supporting).
- **Product ID 593:**
  - *Canonical Name:* \`Portland Slag Cement (PSC)\`
  - *Division Council:* Civil Engineering (CED)
  - *Subcategory:* Cement and Hydraulic Binders
  - *Mappings (2):* Exactly identical 2 standards mapped.
- **Root Cause & Impact:** Product 3 was an early seed; Product 593 was created during Cementitious materials expansion. Both point to \`IS 455\` (Specification for Portland Slag Cement).

---

### Pair 3: Ready-Mixed Concrete (RMC) (ID 6 vs ID 599)
- **Product ID 6:**
  - *Canonical Name:* \`Ready-Mixed Concrete (RMC)\`
  - *Division Council:* Civil Engineering (CED)
  - *Subcategory:* Concrete & Ready-Mix Products
  - *Mappings (4):* \`IS 10262:2019\` (Supporting), \`IS 516 (Part 1/Sec 1):2021\` (Supporting), \`IS 456:2000\` (Supporting), \`IS 15988:2013\` (Supporting). **Notice: Missed IS 4926!**
- **Product ID 599:**
  - *Canonical Name:* \`Ready Mixed Concrete (RMC)\`
  - *Division Council:* Civil Engineering (CED)
  - *Subcategory:* Concrete and Concrete Products
  - *Mappings (5):* \`IS 4926:2003\` (Primary Specification), \`IS 456:2000\` (Supporting), \`IS 10262:2019\` (Supporting), \`IS 516 (Part 1/Sec 1):2021\` (Supporting), \`IS 15988:2013\` (Supporting).
- **Root Cause & Impact:** Product 6 was created without its primary standard (\`IS 4926:2003 - Ready-Mixed Concrete — Code of Practice\`), holding only general supporting codes. Product 599 has the correct primary standard \`IS 4926\`. Merging should preserve Product 599's primary mapping while retaining canonical ID 6.

---

### Pair 4: White Portland Cement (ID 4 vs ID 597)
- **Product ID 4:**
  - *Canonical Name:* \`White Portland Cement\`
  - *Division Council:* Civil Engineering (CED)
  - *Mappings (1):* \`IS 456:2000\` (Supporting). **Notice: Missing IS 8042!**
- **Product ID 597:**
  - *Canonical Name:* \`White Portland Cement\`
  - *Division Council:* Civil Engineering (CED)
  - *Mappings (1):* \`IS 456:2000\` (Supporting).
- **Root Cause & Impact:** Both records are duplicates and both currently lack the primary Indian Standard \`IS 8042:2015 (White Portland Cement — Specification)\`. Both currently only hold a supporting link to \`IS 456:2000\`.

---

### Pair 5: Additional Duplicates Outside Civil Engineering
1. **Hydraulic Hand Pallet Trucks:**
   - Product 388 (\`Hydraulic Hand Pallet Trucks\`, Mechanical Engineering) - 0 mappings.
   - Product 819 (\`Hydraulic Hand Pallet Trucks 2500 kg\`, Mechanical Engineering) - 0 mappings.
2. **Business Continuity Management (ISO 22301):**
   - Product 339 (\`Business Continuity Management Systems (IS/ISO 22301)\`, Management and Systems) - 0 mappings.
   - Product 790 (\`Business Continuity Management ISO 22301 System\`, Management and Systems) - 0 mappings.

---

## 3. Recommended Resolution Roadmap (Future Phase)

*Note: As this audit is strictly read-only, no database records have been modified. When modification is authorized, follow this step-by-step merge protocol:*

1. **Retain Lower Canonical ID:**
   Retain the earlier seed ID (e.g. ID 12 for AAC Blocks, ID 3 for PSC, ID 6 for RMC, ID 4 for White Cement) to maintain external reference stability.
2. **Transfer Unique Mappings:**
   Transfer any superior mapping (e.g. \`IS 4926\` from 599 to 6) before deletion.
3. **Add Missing Primary Standards:**
   Map \`IS 8042:2015\` to Product 4 (White Portland Cement) as primary specification.
4. **Merge Synonyms & Aliases:**
   Aggregate all keywords, aliases, and applications from the higher-numbered duplicate into the surviving lower-numbered record.
5. **Safely Delete Orphan Duplicate:**
   Remove the redundant higher-numbered product family row and update search index embeddings.
`;

  fs.writeFileSync(path.join(__dirname, '../NIRDESHAK_DUPLICATE_PRODUCT_FAMILY_AUDIT.md'), dupMd, 'utf8');
  console.log('Wrote NIRDESHAK_DUPLICATE_PRODUCT_FAMILY_AUDIT.md');

  await closePool();
}

generateMarkdownReports().catch(e => {
  console.error(e);
  process.exit(1);
});
