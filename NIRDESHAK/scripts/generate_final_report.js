const fs = require('fs');
const path = require('path');
const { query, closePool } = require('../database');

async function generateFinalReport() {
  console.log('Generating NIRDESHAK_FINAL_MAPPING_QUALITY_REPORT.md...');

  const finalReportMd = `# NIRDESHAK — Final Mapping Quality and Relevance Audit Report
**Database:** \`nirdeshak_clean_20261126\`  
**Date of Audit:** November 28, 2026  
**Audit Protocol:** Strictly Read-Only  
**Associated Artifacts:**
- [\`NIRDESHAK_SINGLE_MAPPING_PRODUCT_AUDIT.csv\`](file:///d:/ME/PROJECTS/NIRDESHAK/NIRDESHAK_SINGLE_MAPPING_PRODUCT_AUDIT.csv)
- [\`NIRDESHAK_ZERO_MAPPING_PRODUCT_AUDIT.csv\`](file:///d:/ME/PROJECTS/NIRDESHAK/NIRDESHAK_ZERO_MAPPING_PRODUCT_AUDIT.csv)
- [\`NIRDESHAK_MULTI_MAPPING_PRODUCT_AUDIT.csv\`](file:///d:/ME/PROJECTS/NIRDESHAK/NIRDESHAK_MULTI_MAPPING_PRODUCT_AUDIT.csv)
- [\`NIRDESHAK_COVERAGE_STATUS_RECONCILIATION.md\`](file:///d:/ME/PROJECTS/NIRDESHAK/NIRDESHAK_COVERAGE_STATUS_RECONCILIATION.md)
- [\`NIRDESHAK_DUPLICATE_PRODUCT_FAMILY_AUDIT.md\`](file:///d:/ME/PROJECTS/NIRDESHAK/NIRDESHAK_DUPLICATE_PRODUCT_FAMILY_AUDIT.md)

---

## 1. Executive Summary & Macro Numbers

A comprehensive, read-only audit of the entire NIRDESHAK knowledge base was conducted across all 1,047 product families, 710 Indian Standards, and 1,125 active relationship mappings.

### Core Database Metrics
| Metric | Count | Percentage |
| :--- | :---: | :---: |
| **Total Product Families** | **1,047** | 100.00% |
| **Total Active Indian Standards** | **710** | — |
| **Total Product-Standard Mappings** | **1,125** | — |
| **Total Products with Active Mappings (>= 1)** | **979** | **93.51%** |
| **Total Products with Zero Mappings** | **68** | **6.49%** |
| **Distinct Products with >= 1 Primary Specification** | **778** | **74.31%** |
| **Distinct Products with Supporting-Only Mappings** | **201** | **19.20%** |

### Complete Mapping Distribution
| Mappings Per Product | Product Count | Share of Catalogue | Cumulative Coverage |
| :---: | :---: | :---: | :---: |
| **0 mappings** | 68 | 6.49% | 6.49% |
| **1 mapping** | 897 | 85.67% | 92.17% |
| **2 mappings** | 52 | 4.97% | 97.13% |
| **3 mappings** | 10 | 0.96% | 98.09% |
| **4 mappings** | 10 | 0.96% | 99.04% |
| **5 mappings** | 7 | 0.67% | 99.71% |
| **6–10 mappings** | 3 | 0.29% | 100.00% |
| **> 10 mappings** | 0 | 0.00% | 100.00% |

---

## 2. Audit of the 897 Products with Exactly One Mapping

An essential requirement of this audit was to examine whether products with exactly one mapping truly possess a **primary product specification** or merely a supporting reference.

### Breakdown of Single-Mapping Products by Relationship Type
| Relationship Type | Product Count | Percentage | Semantic Role |
| :--- | :---: | :---: | :--- |
| \`primary_specification\` | **732** | **81.61%** | True product specification (governs dimensions, rating, testing, certification). |
| \`code_of_practice\` | **98** | **10.93%** | Engineering practice code (e.g. installation, laying, structural usage). |
| \`safety_requirement\` | **36** | **4.01%** | Essential safety standard (e.g. electrical insulation, mechanical safety). |
| \`installation_requirement\` | **15** | **1.67%** | Field mounting, erection, or wiring guideline. |
| \`supporting_reference\` | **11** | **1.23%** | Normative terminology, symbols, or general material classification. |
| \`testing_method\` | **3** | **0.33%** | Laboratory testing protocol (e.g. tensile, chemical test). |
| \`material_requirement\` | **2** | **0.22%** | Base raw material standard. |
| **Total** | **897** | **100.00%** | — |

> [!IMPORTANT]
> **Key Finding:** Having a single mapping **does not guarantee** that a product has a primary standard. Exactly **165 out of 897 single-mapping products (18.39%)** are mapped solely to a supporting code of practice, installation guideline, or safety standard, lacking a standalone product specification.

The complete product-by-product breakdown is available in [\`NIRDESHAK_SINGLE_MAPPING_PRODUCT_AUDIT.csv\`](file:///d:/ME/PROJECTS/NIRDESHAK/NIRDESHAK_SINGLE_MAPPING_PRODUCT_AUDIT.csv).

---

## 3. Audit of the 68 Products with Zero Mappings

The 68 products lacking mappings were audited across all 17 BIS Division Councils to evaluate whether standards exist, whether they need further research, or whether they genuinely lack a standalone BIS product specification.

### Distribution by Division Council
| Division Council | Zero-Mapping Products | Percentage | Key Reasons & Regulatory Context |
| :--- | :---: | :---: | :--- |
| **Transport Engineering (TED)** | **42** | **61.76%** | Regulated under Central Motor Vehicles Rules (CMVR) by **Automotive Industry Standards (AIS)** formulated by ARAI rather than voluntary BIS ISI product specifications. Erroneous syringe mappings were removed during relevance cleanup. |
| **Civil Engineering (CED)** | **4** | **5.88%** | Specialized assemblies (e.g. crash bollards, sensor faucets, false flooring) or indexation pending (e.g. aluminium doors/windows has IS 1948). |
| **Environment and Ecology (EED)** | **4** | **5.88%** | Specialized environmental hardware/services (spill booms, e-waste shredders, flue gas analyzers). |
| **Water Resources (WRD)** | **4** | **5.88%** | Hydraulic instruments & barrages (piezometers, chemical injectors, rubber barrage weirs). |
| **Food and Agriculture (FAD)** | **3** | **4.41%** | FSSAI regulated (instant noodles) and agricultural machinery (laser land levellers, sugarcane harvesters). |
| **AYUSH** | **2** | **2.94%** | Regulated by Ayurvedic/Homoeopathic Pharmacopoeia of India (PCIM&H), not BIS. |
| **Electrotechnical (ETD)** | **2** | **2.94%** | Early streamer emission (ESE) arresters (non-conventional French NFC standard) and busbar trunking (IS/IEC 61439-6 exists). |
| **Management and Systems (MSD)** | **2** | **2.94%** | Management system frameworks (ISO 22301 Business Continuity), not physical products. |
| **Mechanical Engineering (MED)** | **2** | **2.94%** | Hydraulic hand pallet trucks (catalogue duplicates, IS standard under review). |
| **Metallurgical Engineering (MTD)** | **1** | **1.47%** | Electrolytic copper busbars (IS 613 exists, pending indexation). |
| **Production & General (PGD)** | **1** | **1.47%** | Fiber laser cutting machines (general machine safety IS/ISO standards apply). |
| **Textiles (TXD)** | **1** | **1.47%** | UHMWPE yarns (high-performance synthetic fiber specification pending). |
| **Total** | **68** | **100.00%** | — |

### Deep Dive: The 42 Transport Engineering Products
In the previous knowledge base state, 54 medical syringe standards (\`IS 10258\`, \`IS 10654\`, etc.) had been erroneously attached to automotive components (brakes, horns, mirrors, axles, seat belts, radiators, leaf springs).
When those invalid mappings were purged, these 42 products were left with zero mappings.

**Why do these products lack BIS standards?**
In India's automotive sector, safety components are governed under the **Automotive Industry Standards Committee (AISC)** and **CMVR**, with standards designated as **AIS-xxx** (e.g., AIS-010 for brakes, AIS-088 for rear-view mirrors, AIS-005 for safety belts, AIS-156 for EV batteries). While some have dual BIS standards, many manufacturers certify directly via ARAI/ICAT under CMVR rather than BIS ISI marking.

The complete product-by-product breakdown is available in [\`NIRDESHAK_ZERO_MAPPING_PRODUCT_AUDIT.csv\`](file:///d:/ME/PROJECTS/NIRDESHAK/NIRDESHAK_ZERO_MAPPING_PRODUCT_AUDIT.csv).

---

## 4. Multi-Mapping Products & Civil Engineering Over-Mapping Investigation

The audit analyzed all **82 multi-mapping products** (comprising 228 mapping records). The complete row-by-row audit is recorded in [\`NIRDESHAK_MULTI_MAPPING_PRODUCT_AUDIT.csv\`](file:///d:/ME/PROJECTS/NIRDESHAK/NIRDESHAK_MULTI_MAPPING_PRODUCT_AUDIT.csv).

A critical finding of this audit is the **systematic over-mapping of 5 Civil Engineering standards** across concrete products during earlier bulk expansion scripts:

| IS Number | Official Title | Current Mapping Count | Audit Assessment |
| :--- | :--- | :---: | :--- |
| **IS 15988:2013** | Seismic Evaluation and Strengthening of Existing Reinforced Concrete Buildings — Guidelines | **30 products** | **CRITICAL OVER-MAPPING:** Erroneously attached to standalone components like Kerbstones, Manhole Covers, Concrete Drainage Pipes, AAC Blocks, Paver Blocks, Admixtures, Fly Ash, and Aggregates. A kerbstone or drainage pipe is not an existing RC building requiring seismic retrofitting. |
| **IS 1893 (Part 1):2016** | Criteria for Earthquake Resistant Design of Structures — Part 1: General Provisions and Buildings | **12 products** | **OVER-MAPPING:** Inappropriately attached to Kerbstones, Manhole Covers, Precast Drainage Pipes, and Pavement Geogrids. Non-structural pavement elements do not undergo structural seismic building design. |
| **IS 456:2000** | Plain and Reinforced Concrete — Code of Practice | **31 products** | **MIXED VALIDITY:** Legitimate supporting code of practice for Ready-Mixed Concrete (\`IS 4926\`) and Reinforced Concrete Pipes (\`IS 458\`); unnecessary for AAC Masonry Blocks (governed by masonry code \`IS 1905\` and \`IS 2185 Part 3\`). |
| **IS 10262:2019** | Concrete Mix Proportioning — Guidelines | **21 products** | **LEGITIMATE SUPPORTING:** Valid mix design standard for ready-mix concrete, concrete paver blocks, and concrete pipes; marginal for factory aerated slurry (AAC). |
| **IS 516 (Part 1/Sec 1):2021** | Hardened Concrete — Methods of Test — Part 1: Compressive, Flexural and Split Tensile Strength | **21 products** | **LEGITIMATE TEST METHOD:** Valid laboratory testing reference, but must be categorized strictly as \`testing_method\`, never as a primary specification. |

---

## 5. Coverage Status Reconciliation Summary

A complete reconciliation between reported coverage and the actual database state was conducted in [\`NIRDESHAK_COVERAGE_STATUS_RECONCILIATION.md\`](file:///d:/ME/PROJECTS/NIRDESHAK/NIRDESHAK_COVERAGE_STATUS_RECONCILIATION.md).

### Key Reconciled Figures
- **Previous Claim:** 781 primary / 252 supporting / 1,033 covered / 14 unmapped.
- **Actual Database Reality:** 778 primary / 201 supporting-only / 979 covered / 68 zero-mapped.
- **Root Cause:** Purge of 77 invalid mappings in previous turns without running a trigger to update the \`product_families.coverage_status\` enum column.
- **Inconsistent Records:** Exactly **66 products** have stale statuses (65 orphaned statuses on zero-mapping products + 1 underclassified primary product, Product ID 302).

---

## 6. Duplicate Product Family Audit Summary

Detailed analysis in [\`NIRDESHAK_DUPLICATE_PRODUCT_FAMILY_AUDIT.md\`](file:///d:/ME/PROJECTS/NIRDESHAK/NIRDESHAK_DUPLICATE_PRODUCT_FAMILY_AUDIT.md) identified **4 confirmed duplicate pairs in Civil Engineering**:
1. **Autoclaved Aerated Concrete (AAC) Blocks:** Product 12 vs Product 611 (Identical names & mappings).
2. **Portland Slag Cement (PSC):** Product 3 vs Product 593 (Identical names & mappings).
3. **Ready-Mixed Concrete (RMC):** Product 6 (missing primary IS 4926) vs Product 599 (has IS 4926).
4. **White Portland Cement:** Product 4 vs Product 597 (both missing IS 8042 primary specification).

Additional duplicates outside Civil Engineering:
- Product 388 vs 819 (\`Hydraulic Hand Pallet Trucks\`)
- Product 339 vs 790 (\`Business Continuity Management ISO 22301\`)

---

## 7. Relationship Type Classification Integrity

NIRDESHAK's recommendation engine relies on strict relationship classification:
\`primary_specification\` > \`safety_requirement\` > \`testing_method\` > \`code_of_practice\` > \`material_requirement\` > \`installation_requirement\` > \`supporting_reference\`.

### Key Integrity Principles Established by Audit:
1. **Normative Test Method vs Primary Standard:**
   Standard \`IS 516\` or \`IS 1608\` should never be classified as a primary specification when a finished product standard (such as \`IS 2185\` or \`IS 1786\`) exists.
2. **General Building Code vs Component Standard:**
   Building codes (\`IS 456\`, \`IS 1893\`, \`IS 15988\`) govern structural systems and must not be blanket-mapped to manufactured building materials unless the standard specifically dictates their manufacturing specifications.
3. **Regulatory Domain Boundary:**
   Distinguish between BIS ISI certification, ARAI / AIS automotive approval under CMVR, and Pharmacopoeial standards under AYUSH.

---

## 8. Concrete 5-Step Actionable Roadmap (Next Phase)

When write operations and database modifications are authorized in the next task, implement the following roadmap:

\`\`\`mermaid
flowchart TD
    Step1["Step 1: Clean Up Over-Mapped Standards<br/>Remove IS 15988 & IS 1893 from kerbstones, pipes, manholes, admixtures"]
    Step2["Step 2: Reconcile Stale Coverage Statuses<br/>Update 66 products in product_families table"]
    Step3["Step 3: Deduplicate Product Families<br/>Safely merge 6 duplicate pairs without data loss"]
    Step4["Step 4: Index Direct Standards for Zero-Mapping Products<br/>Map IS 1948, IS 8042, IS 613, IS 4926, IS/IEC 61439-6"]
    Step5["Step 5: Introduce AIS / CMVR Automotive Extension<br/>Explicitly tag 42 TED products with AIS regulatory standards"]
    
    Step1 --> Step2 --> Step3 --> Step4 --> Step5
\`\`\`

1. **Step 1 — Strip Over-Mapped Civil Engineering Standards:**
   Remove the 30 inappropriate mappings of \`IS 15988:2013\` and the 12 inappropriate mappings of \`IS 1893:2016\` from kerbstones, manhole covers, drainage pipes, admixtures, and aggregates.
2. **Step 2 — Synchronize Coverage Status Column:**
   Execute a single SQL update script to synchronize \`product_families.coverage_status\` to match live \`product_standard_mappings\` counts, correcting all 66 stale records.
3. **Step 3 — Deduplicate Product Families:**
   Merge the 6 duplicate pairs (e.g. merge 611 into 12, 593 into 3, 599 into 6, 597 into 4) using the lower ID as the canonical record and preserving all unique standards and keywords.
4. **Step 4 — Attach Missing Primary Standards:**
   Map \`IS 8042:2015\` to White Portland Cement, \`IS 1948\` to Aluminium Windows, \`IS 613\` to Copper Busbars, and \`IS/IEC 61439-6\` to Busbar Trunking.
5. **Step 5 — Automotive Regulatory Extension:**
   For the 42 Transport Engineering items, introduce an \`AIS_STANDARDS\` / \`CMVR\` certification metadata flag in NIRDESHAK to distinguish automotive component compliance from standard BIS ISI marking.
`;

  fs.writeFileSync(path.join(__dirname, '../NIRDESHAK_FINAL_MAPPING_QUALITY_REPORT.md'), finalReportMd, 'utf8');
  console.log('Wrote NIRDESHAK_FINAL_MAPPING_QUALITY_REPORT.md');
  await closePool();
}

generateFinalReport().catch(e => {
  console.error(e);
  process.exit(1);
});
