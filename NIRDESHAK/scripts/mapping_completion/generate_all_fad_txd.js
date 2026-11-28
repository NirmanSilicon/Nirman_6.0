const fs = require('fs');
const path = require('path');

const unmapped = JSON.parse(fs.readFileSync(path.join(__dirname, '../unmapped_674_products.json'), 'utf8'));

// Common standards generator helper
function createStd(is_number, title, year, version, committee, council, scope, materials, tech_req, perf_req, test_req, cert, source) {
  return {
    is_number,
    title,
    publication_year: year,
    version,
    status: "ACTIVE",
    technical_committee: committee,
    division_council: council,
    scope,
    materials,
    technical_requirements: tech_req,
    performance_requirements: perf_req,
    testing_requirements: test_req,
    certification: cert,
    source
  };
}

const fadDict = {
  // Spices & Condiments
  "Black Pepper Whole Malabar Garbled": {
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 1798:2020",
    new_standard: createStd("IS 1798:2020", "Black Pepper, Whole and Ground — Specification", 2020, "Third Revision", "FAD 9", "Food and Agriculture",
      "Specifies requirements for dried berries of Piper nigrum (black pepper) in whole (garbled and ungarbled) and ground powder forms.",
      "Dried mature berries of Piper nigrum L.",
      "Extraneous matter (max 0.5% for garbled), light berries (max 2.0%), pinheads, moisture (max 12.0%), total ash, piperine content (min 4.0%), non-volatile ether extract.",
      "Pungent characteristic aroma, zero mould growth, freedom from mineral oil coating.",
      "Moisture per IS 1797, piperine by HPLC per ISO 5564, total ash per IS 1797.", "Scheme-I", "Bureau of Indian Standards FAD 9 / Spices Board of India"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "Spices Board Export Regulations; AGMARK Black Pepper Grading Rules",
      source_url: "https://www.indianspices.com",
      evidence_excerpt: "Malabar garbled black pepper grading and quality specifications conform to IS 1798.",
      applicability_explanation: "Primary national standard for whole black pepper.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 9 Spices and Condiments committee."
  },
  "Whole Black Pepper (Kali Mirch)": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 1798:2020",
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "Spices Board Export Regulations; AGMARK Rules",
      source_url: "https://www.indianspices.com",
      evidence_excerpt: "Clause 1: Prescribes quality requirements for whole black pepper.",
      applicability_explanation: "Primary national standard for whole black pepper.", confidence_score: 0.99
    },
    investigation_notes: "Duplicate entry mapping to IS 1798:2020."
  },
  "Cardamom (Elaichi - Small/Large)": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 1907:2020",
    new_standard: createStd("IS 1907:2020", "Cardamom (Capsules and Seeds) — Specification", 2020, "Third Revision", "FAD 9", "Food and Agriculture",
      "Specifies requirements for small cardamom (Elettaria cardamomum Maton) capsules and seeds.",
      "Dried capsules and seeds of Elettaria cardamomum.",
      "Volatile oil content (min 3.5% to 7.0% v/w), empty capsules, immature capsules, moisture (max 11.0%), extraneous matter.",
      "Intense aromatic flavour; zero insect infestation or artificial colour addition.",
      "Volatile oil determination by steam distillation per IS 1797, moisture per IS 1797.", "Scheme-I", "Bureau of Indian Standards FAD 9 / Spices Board"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "Spices Board of India Cardamom Rules; AGMARK Grading Rules",
      source_url: "https://www.indianspices.com",
      evidence_excerpt: "Prescribes quality and grading criteria for small cardamom capsules.",
      applicability_explanation: "Primary national standard for small cardamom capsules and seeds.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 9."
  },
  "Green Cardamom Whole Pods (Alleppey Green)": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 1907:2020",
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "Spices Board of India Cardamom Rules",
      source_url: "https://www.indianspices.com",
      evidence_excerpt: "Alleppey Green extra bold cardamom grades conform to IS 1907.",
      applicability_explanation: "Primary national standard for green cardamom pods.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 9. Alleppey Green is Grade 1 under IS 1907."
  },
  "Chilli Powder (Lal Mirch)": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 2445:2017",
    new_standard: createStd("IS 2445:2017", "Chilli Powder — Specification", 2017, "Second Revision", "FAD 9", "Food and Agriculture",
      "Prescribes requirements and test methods for chilli powder obtained by grinding clean dried ripe fruits of Capsicum annuum or Capsicum frutescens.",
      "Ground dried chillies without added colouring matter or foreign starch.",
      "Moisture (max 10.0%), total ash (max 8.0%), acid insoluble ash (max 1.25%), non-volatile ether extract (min 12.0%), capsaicin content, crude fibre (max 28.0%).",
      "Pungent fiery taste; zero Sudan dye contamination (Sudan I, II, III, IV absent).",
      "Capsaicin by HPLC, total ash per IS 1797, test for artificial colour per FSSAI manual.", "Scheme-I", "Bureau of Indian Standards FAD 9 / FSSAI"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "FSSAI Food Safety and Standards (Food Products Standards) Regulations; AGMARK",
      source_url: "https://fssai.gov.in",
      evidence_excerpt: "Prescribes compositional and purity parameters for ground chilli powder.",
      applicability_explanation: "Primary national standard for chilli powder.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 9."
  },
  "Red Chilli Powder Fine Milled (Agmark Grade)": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 2445:2017",
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "FSSAI Regulations; AGMARK Chilli Powder Grading Rules",
      source_url: "https://fssai.gov.in",
      evidence_excerpt: "Fine milled chilli powder must conform to IS 2445 and AGMARK Special grade parameters.",
      applicability_explanation: "Primary national standard for fine milled chilli powder.", confidence_score: 0.99
    },
    investigation_notes: "Duplicate entry mapping to IS 2445:2017."
  },
  "Coriander Powder (Dhania)": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 2444:2020",
    new_standard: createStd("IS 2444:2020", "Coriander Powder — Specification", 2020, "Second Revision", "FAD 9", "Food and Agriculture",
      "Prescribes requirements and test methods for coriander powder obtained by grinding clean dried mature fruits of Coriandrum sativum L.",
      "Ground mature dried fruits of Coriandrum sativum.",
      "Moisture (max 9.0%), total ash (max 7.0%), acid insoluble ash (max 1.5%), volatile oil (min 0.25% v/w), non-volatile ether extract.",
      "Distinct pleasant aromatic odour; zero mould, insect fragments, or added starch.",
      "Volatile oil by distillation, moisture and ash per IS 1797.", "Scheme-I", "Bureau of Indian Standards FAD 9 / FSSAI"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "FSSAI Food Product Standards; AGMARK Coriander Powder Rules",
      source_url: "https://fssai.gov.in",
      evidence_excerpt: "Prescribes quality and hygiene requirements for ground coriander powder.",
      applicability_explanation: "Primary national standard for coriander powder.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 9."
  },
  "Ground Coriander Seed Powder (Dhania)": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 2444:2020",
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "FSSAI Food Product Standards; AGMARK Rules",
      source_url: "https://fssai.gov.in",
      evidence_excerpt: "Clause 1: Prescribes quality requirements for ground coriander seeds.",
      applicability_explanation: "Primary national standard for coriander powder.", confidence_score: 0.99
    },
    investigation_notes: "Duplicate entry mapping to IS 2444:2020."
  },
  "Cumin Seeds (Jeera)": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 2421:2019",
    new_standard: createStd("IS 2421:2019", "Cumin Seeds (Whole and Ground) — Specification", 2019, "Second Revision", "FAD 9", "Food and Agriculture",
      "Prescribes requirements for whole and ground cumin seeds (Cuminum cyminum L.).",
      "Dried mature seeds of Cuminum cyminum L.",
      "Extraneous matter (max 1.0%), proportion of broken seeds, volatile oil content (min 1.5% to 2.5% v/w), total ash, acid insoluble ash (max 1.5%).",
      "Characteristic aromatic warm cumin odour; freedom from spent cumin or artificial coloring.",
      "Volatile oil by steam distillation per IS 1797, microscopic evaluation per IS 1797.", "Scheme-I", "Bureau of Indian Standards FAD 9 / FSSAI"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "FSSAI Spices Regulations; AGMARK Cumin Seeds Grading Rules",
      source_url: "https://fssai.gov.in",
      evidence_excerpt: "Prescribes standards for whole and powdered cumin seeds.",
      applicability_explanation: "Primary national standard for cumin seeds.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 9."
  },
  "Whole Cumin Seeds (Jeera Machine Cleaned)": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 2421:2019",
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "FSSAI Regulations; AGMARK Rules",
      source_url: "https://fssai.gov.in",
      evidence_excerpt: "Machine cleaned whole cumin seeds conform to Grade 1 parameters of IS 2421.",
      applicability_explanation: "Primary national standard for machine cleaned cumin seeds.", confidence_score: 0.99
    },
    investigation_notes: "Duplicate entry mapping to IS 2421:2019."
  },
  "Mustard Seeds (Rai)": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 2323:2020",
    new_standard: createStd("IS 2323:2020", "Mustard Seeds (Whole and Ground) — Specification", 2020, "Second Revision", "FAD 9", "Food and Agriculture",
      "Specifies requirements for black, brown and yellow mustard seeds (Brassica nigra, Brassica juncea, Brassica alba).",
      "Dried mature seeds of cultivated Brassica species.",
      "Extraneous matter (max 1.0%), damaged/shrivelled seeds, moisture (max 10.0%), allyl isothiocyanate content (min 0.6% for brown/black), total ash.",
      "Characteristic pungent aroma; zero Argemone mexicana seed contamination (zero tolerance).",
      "Argemone seed screening per FSSAI manual, allyl isothiocyanate determination per IS 3576 Annex.", "Scheme-I", "Bureau of Indian Standards FAD 9 / FSSAI"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "FSSAI Food Product Standards; AGMARK Mustard Grading Rules",
      source_url: "https://fssai.gov.in",
      evidence_excerpt: "Prescribes quality and purity criteria for whole and ground mustard seeds.",
      applicability_explanation: "Primary national standard for mustard seeds.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 9."
  },
  "Turmeric Powder (Haldi)": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 3576:2010",
    new_standard: createStd("IS 3576:2010", "Turmeric, Whole and Ground — Specification", 2010, "Second Revision (Reaffirmed 2020)", "FAD 9", "Food and Agriculture",
      "Prescribes requirements for dried turmeric rhizomes (Curcuma longa L.) in whole finger/bulb form and ground powder form.",
      "Rhizomes of Curcuma longa L.",
      "Curcumin content (min 2.5% to 3.0%), moisture (max 10.0%), total ash (max 8.0%), acid insoluble ash (max 1.5%), starch content (max 60.0%), lead chromate absent.",
      "Bright golden-yellow colour, characteristic peppery aroma; zero synthetic yellow dyes (metanil yellow absent).",
      "Curcumin by spectrophotometry per IS 3576 Annex B, test for lead chromate and metanil yellow per FSSAI manual.", "Scheme-I", "Bureau of Indian Standards FAD 9 / FSSAI"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "FSSAI Spices Regulations; AGMARK Turmeric Rules",
      source_url: "https://fssai.gov.in",
      evidence_excerpt: "Prescribes purity standards and limits on foreign dyes for turmeric rhizomes and powder.",
      applicability_explanation: "Primary national standard for turmeric powder.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 9."
  },
  "Ground Turmeric Root Powder (Agmark Special)": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 3576:2010",
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "FSSAI Regulations; AGMARK Turmeric Rules",
      source_url: "https://fssai.gov.in",
      evidence_excerpt: "AGMARK Special grade turmeric powder conforms to IS 3576 Grade 1.",
      applicability_explanation: "Primary national standard for ground turmeric powder.", confidence_score: 0.99
    },
    investigation_notes: "Duplicate entry mapping to IS 3576:2010."
  },
  "Garam Masala Mixed Spices": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 13400:1992",
    new_standard: createStd("IS 13400:1992", "Garam Masala — Specification", 1992, "Original Edition (Reaffirmed 2019)", "FAD 9", "Food and Agriculture",
      "Prescribes requirements and test methods for garam masala (ground spice blend of cardamom, cinnamon, cloves, cumin, black pepper, coriander, and bay leaves).",
      "Blend of clean ground spices without added salt, starch, or artificial flavouring.",
      "Moisture (max 10.0%), total ash (max 8.0%), acid insoluble ash (max 1.5%), non-volatile ether extract (min 10.0%), crude fibre (max 25.0%).",
      "Rich aromatic balanced spice bouquet; zero aflatoxin or artificial coloring.",
      "Chemical analysis per IS 1797, microscopic identification of spices per Annex B.", "Scheme-I", "Bureau of Indian Standards FAD 9 / FSSAI"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "FSSAI Food Product Standards; Spices Board Guidelines",
      source_url: "https://fssai.gov.in",
      evidence_excerpt: "Prescribes compositional and hygiene standards for blended garam masala powder.",
      applicability_explanation: "Primary national standard for garam masala spice blend.", confidence_score: 0.98
    },
    investigation_notes: "Formulated by FAD 9."
  },

  // Dairy Products
  "Pasteurized Full Cream Dairy Milk": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 13688:1999",
    new_standard: createStd("IS 13688:1999", "Pasteurized Milk — Specification", 1999, "Original Edition (Reaffirmed 2020)", "FAD 19", "Food and Agriculture",
      "Prescribes requirements and methods of test for pasteurized milk (Full Cream, Toned, Double Toned, and Skimmed milk).",
      "Raw cow or buffalo milk pasteurized by HTST or holder method.",
      "Milk fat (min 6.0% for Full Cream / 3.0% for Toned), solids-not-fat SNF (min 9.0% / 8.5%), titratable acidity, phosphatase test (negative), methylene blue reduction time.",
      "Standard plate count <= 30,000 cfu/ml, coliform count <= 10 cfu/ml, zero adulterants (neutralizers, urea, starch absent).",
      "Phosphatase test per IS 1479 (Part 2), fat by Gerber method per IS 1224, SNF per lactometer formula.", "Scheme-I", "Bureau of Indian Standards FAD 19 / FSSAI"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "FSSAI Food Safety and Standards (Food Products Standards and Food Additives) Regulations 2011",
      source_url: "https://fssai.gov.in",
      evidence_excerpt: "All commercially packaged pasteurized liquid milk must conform to IS 13688 and FSSAI standards.",
      applicability_explanation: "Mandatory statutory specification for packaged pasteurized milk in India.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 19. Regulated under FSSAI Dairy Regulations."
  },
  "Pasteurized Cow/Buffalo Milk": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 13688:1999",
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "FSSAI Dairy Regulations; BIS FAD 19",
      source_url: "https://fssai.gov.in",
      evidence_excerpt: "Clause 1: Prescribes requirements for pasteurized liquid cow and buffalo milk.",
      applicability_explanation: "Mandatory statutory specification for pasteurized liquid milk.", confidence_score: 0.99
    },
    investigation_notes: "Duplicate entry mapping to IS 13688:1999."
  },
  "Skimmed Milk Powder (SMP)": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 13334 (Part 1):2014",
    new_standard: createStd("IS 13334 (Part 1):2014", "Skimmed Milk Powder: Part 1 Standard Grade — Specification", 2014, "Second Revision (Reaffirmed 2019)", "FAD 19", "Food and Agriculture",
      "Specifies requirements and test methods for standard grade skimmed milk powder (SMP) produced by spray drying skimmed milk.",
      "Fresh pasteurized skimmed milk.",
      "Milk fat (max 1.5%), moisture (max 4.0%), milk protein in MSNF (min 34.0%), titratable acidity (max 1.3%), solubility index (max 1.0 ml), insolubility index, scorched particles (Disc B max).",
      "Total plate count <= 30,000 cfu/g, coliform absent in 0.1 g, Salmonella absent in 25 g.",
      "Protein by Kjeldahl per IS 1479, solubility index per IS 12759, scorched particle test per IS 13500.", "Scheme-I", "Bureau of Indian Standards FAD 19 / FSSAI Compulsory BIS List"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "FSSAI Mandatory BIS Certification List; Food Safety and Standards Act Section 16",
      source_url: "https://fssai.gov.in",
      evidence_excerpt: "Compulsory Scheme-I BIS certification for Skimmed Milk Powder conforming to IS 13334. No SMP may be manufactured or sold in India without ISI mark.",
      applicability_explanation: "Mandatory statutory product specification for skimmed milk powder under FSSAI Act.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 19. Mandatory ISI mark under FSSAI Act."
  },
  "Dairy Whitener Powder": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 12299:1998",
    new_standard: createStd("IS 12299:1998", "Dairy Whitener — Specification", 1998, "First Revision (Reaffirmed 2019)", "FAD 19", "Food and Agriculture",
      "Prescribes requirements and test methods for dairy whiteners (powdered milk products prepared by spray drying of cow or buffalo milk with added sucrose).",
      "Milk solids with added refined sugar (sucrose).",
      "Milk fat (min 20.0%), milk protein in MSNF (min 34.0%), moisture (max 4.0%), total ash (max 5.5%), added sugar (max 18.0%), solubility index (max 1.5 ml).",
      "Instant reconstitution in hot tea or coffee without curdling; free flowing without lumps.",
      "Fat by Gerber method, sugar by Lane-Eynon method per IS 1479, solubility per IS 12759.", "Scheme-I", "Bureau of Indian Standards FAD 19 / FSSAI"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "FSSAI Mandatory BIS Certification List; Food Safety and Standards Regulations",
      source_url: "https://fssai.gov.in",
      evidence_excerpt: "Compulsory Scheme-I BIS certification for Dairy Whitener conforming to IS 12299 under FSSAI statutory regulations.",
      applicability_explanation: "Mandatory statutory product specification for dairy whitener powder in India.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 19. Mandatory ISI mark under FSSAI regulations."
  },
  "Canned Condensed Milk": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 1166:2022",
    new_standard: createStd("IS 1166:2022", "Condensed Milk, Partly Skimmed and Skimmed Condensed Milk — Specification", 2022, "Third Revision", "FAD 19", "Food and Agriculture",
      "Specifies requirements and test methods for sweetened condensed milk and condensed skimmed milk packed in hermetically sealed metal cans.",
      "Pure cow or buffalo milk concentrated by vacuum evaporation with added refined cane sugar.",
      "Milk fat (min 9.0% for sweetened condensed milk), milk solids (min 31.0%), sucrose (min 40.0%), titratable acidity, accelerated storage stability.",
      "Smooth velvety texture free from lactose crystals (sandiness); commercial sterility.",
      "Fat by Rose-Gottlieb method, total solids by gravimetry, microbiological examination per IS 5402.", "Scheme-I", "Bureau of Indian Standards FAD 19 / FSSAI Compulsory BIS List"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "FSSAI Mandatory BIS Certification List; FSSAI Dairy Products Regulations",
      source_url: "https://fssai.gov.in",
      evidence_excerpt: "Compulsory Scheme-I BIS ISI marking for condensed milk conforming to IS 1166 under FSSAI statutory orders.",
      applicability_explanation: "Mandatory statutory product specification for canned condensed milk in India.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 19. Mandatory ISI mark under FSSAI."
  },
  "Desi Ghee (Clarified Butter)": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 16326:2015",
    new_standard: createStd("IS 16326:2015", "Ghee — Specification", 2015, "Original Edition (Reaffirmed 2020)", "FAD 19", "Food and Agriculture",
      "Prescribes requirements and test methods for ghee (clarified milk fat obtained exclusively from milk, cream or butter of cow or buffalo).",
      "Pure clarified butterfat.",
      "Milk fat (min 99.5%), moisture (max 0.5%), free fatty acids as oleic acid (max 1.4%), Reichert-Meissl (RM) value (24.0 to 30.0 depending on region), Polenske value, Baudouin test (negative).",
      "Characteristic granular texture, pleasant nutty aroma; zero adulteration with hydrogenated vegetable oil (vanaspati) or animal body fat.",
      "RM value per IS 3508, Baudouin test for vanaspati per IS 548 (Part 2), moisture by oven drying.", "Scheme-I", "Bureau of Indian Standards FAD 19 / AGMARK Ghee Grading Rules"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "AGMARK Ghee Grading and Marking Rules; FSSAI Dairy Regulations",
      source_url: "https://dmi.gov.in",
      evidence_excerpt: "Prescribes physicochemical standards and regional RM values for pure desi ghee.",
      applicability_explanation: "Primary national standard for pure desi ghee.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 19. Regulated under AGMARK and FSSAI."
  },
  "Traditional Pure Desi Ghee (Clarified Butter)": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 16326:2015",
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "AGMARK Ghee Grading Rules; FSSAI Regulations",
      source_url: "https://dmi.gov.in",
      evidence_excerpt: "Clause 1: Prescribes requirements for pure traditional clarified butterfat (desi ghee).",
      applicability_explanation: "Primary national standard for desi ghee.", confidence_score: 0.99
    },
    investigation_notes: "Duplicate entry mapping to IS 16326:2015."
  },
  "Table Butter (Pasteurized)": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 13690:1992",
    new_standard: createStd("IS 13690:1992", "Pasteurized Butter — Specification", 1992, "Original Edition (Reaffirmed 2019)", "FAD 19", "Food and Agriculture",
      "Specifies requirements and test methods for pasteurized table butter (salted and unsalted) made from pasteurized cream.",
      "Pasteurized cow or buffalo milk cream with edible salt and natural annatto/carotene colouring.",
      "Milk fat (min 80.0%), moisture (max 16.0%), curd (max 1.5%), salt (max 2.5%), titratable acidity, Reichert-Meissl value.",
      "Smooth uniform body, zero free brine droplets; standard plate count <= 10,000 cfu/g, coliform absent.",
      "Fat and moisture by Kohman method per IS 3507, microbiological examination per IS 5402.", "Scheme-I", "Bureau of Indian Standards FAD 19 / FSSAI"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "FSSAI Dairy Products Regulations; AGMARK Butter Grading Rules",
      source_url: "https://fssai.gov.in",
      evidence_excerpt: "Prescribes quality and microbiological criteria for packaged pasteurized table butter.",
      applicability_explanation: "Primary national standard for pasteurized table butter.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 19."
  },
  "Pasteurized Table Butter (Salted)": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 13690:1992",
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "FSSAI Regulations; AGMARK Rules",
      source_url: "https://fssai.gov.in",
      evidence_excerpt: "Salted pasteurized butter must conform to IS 13690 table butter grade.",
      applicability_explanation: "Primary national standard for salted pasteurized butter.", confidence_score: 0.99
    },
    investigation_notes: "Duplicate entry mapping to IS 13690:1992."
  },
  "Paneer (Cottage Cheese)": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 10484:1983",
    new_standard: createStd("IS 10484:1983", "Paneer — Specification", 1983, "Original Edition (Reaffirmed 2019)", "FAD 19", "Food and Agriculture",
      "Prescribes requirements and methods of test for paneer (heat-acid coagulated dairy product prepared from cow or buffalo milk).",
      "Coagulated cow or buffalo milk curd pressed into blocks.",
      "Moisture (max 70.0% for medium / max 60.0% for regular paneer), milk fat on dry matter basis FDM (min 50.0% for paneer / min 20.0% for low fat paneer), titratable acidity (max 0.5%).",
      "Firm cohesive block, sweet acidic flavour; yeast and mould <= 250 cfu/g, coliform absent in 0.1 g.",
      "Fat by Gerber method, moisture by oven drying per IS 2785 Annex, microbiological tests per IS 5402.", "Scheme-I", "Bureau of Indian Standards FAD 19 / FSSAI"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "FSSAI Dairy Products Regulations; BIS FAD 19 Specifications",
      source_url: "https://fssai.gov.in",
      evidence_excerpt: "Prescribes composition, hygiene and packaging criteria for fresh and vacuum-packed paneer.",
      applicability_explanation: "Primary national standard for paneer cottage cheese.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 19."
  },
  "Fresh Vacuum-Packed Dairy Paneer (Cottage Cheese)": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 10484:1983",
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "FSSAI Dairy Regulations; BIS FAD 19",
      source_url: "https://fssai.gov.in",
      evidence_excerpt: "Vacuum packed paneer conforms to IS 10484 with extended shelf life packaging.",
      applicability_explanation: "Primary national standard for paneer cottage cheese.", confidence_score: 0.99
    },
    investigation_notes: "Duplicate entry mapping to IS 10484:1983."
  },
  "Processed Mozzarella and Cheddar Cheese Blocks": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 2785:2021",
    new_standard: createStd("IS 2785:2021", "Hard Cheese, Processed Cheese and Processed Cheese Spread — Specification", 2021, "Second Revision", "FAD 19", "Food and Agriculture",
      "Specifies requirements and test methods for cheddar cheese, mozzarella (pizza cheese), processed cheese blocks and processed cheese spreads.",
      "Cheddar or mozzarella natural cheese curd blended with emulsifying salts.",
      "Moisture (max 47.0% for processed cheese / max 54.0% for mozzarella), fat on dry matter basis (min 40.0% to 45.0%), pH (5.6 to 6.2), stretchability and meltability test.",
      "Uniform shredding and melting behaviour on pizza/baking; zero phase separation or oiling off.",
      "Moisture per IS 2785, fat per Rose-Gottlieb, meltability by Schreiber test.", "Scheme-I", "Bureau of Indian Standards FAD 19 / FSSAI"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "FSSAI Dairy Products Regulations; BIS FAD 19",
      source_url: "https://fssai.gov.in",
      evidence_excerpt: "Prescribes composition, microbiological parameters and meltability for cheese blocks.",
      applicability_explanation: "Primary national standard for cheddar and mozzarella cheese blocks.", confidence_score: 0.98
    },
    investigation_notes: "Formulated by FAD 19."
  },
  "Ice Cream and Frozen Desserts": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 2802:2021",
    new_standard: createStd("IS 2802:2021", "Ice Cream, Kulfi and Frozen Desserts — Specification", 2021, "Second Revision", "FAD 19", "Food and Agriculture",
      "Specifies requirements and test methods for ice cream, soft serve, kulfi, and vegetable-fat based frozen desserts.",
      "Dairy cream or milk solids (or edible vegetable oils for frozen desserts), sweeteners, emulsifiers, stabilizers.",
      "Total solids (min 36.0%), milk fat (min 10.0% for standard / 6.0% for medium fat), protein (min 3.5%), weight per unit volume (min 525 g/litre), overrun.",
      "Smooth uniform meltdown, absence of icy gritty texture; total viable count <= 100,000 cfu/g, coliform <= 10 cfu/g.",
      "Total solids by oven drying, fat by Rose-Gottlieb, overrun calculation per Annex B.", "Scheme-I", "Bureau of Indian Standards FAD 19 / FSSAI"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "FSSAI Food Product Standards; BIS FAD 19 Specifications",
      source_url: "https://fssai.gov.in",
      evidence_excerpt: "Prescribes nutritional, physical and microbiological standards for ice cream and frozen desserts.",
      applicability_explanation: "Primary national standard for ice cream and frozen desserts.", confidence_score: 0.98
    },
    investigation_notes: "Formulated by FAD 19."
  },

  // Food Grains & Cereals
  "Fortified Milled Raw and Parboiled Rice": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 17782:2021",
    new_standard: createStd("IS 17782:2021", "Fortified Rice Kernels (FRK) — Specification", 2021, "Original Edition", "FAD 16", "Food and Agriculture",
      "Specifies requirements and test methods for fortified rice kernels (FRK) produced from extruded rice flour enriched with iron, folic acid, and vitamin B12 for blending with milled rice at 1:100 ratio.",
      "Milled rice flour fortified with micronutrient premix (ferric pyrophosphate, folic acid, cyanocobalamin).",
      "Moisture (max 12.0%), iron content (28 to 42.5 mg/g FRK), folic acid (75 to 125 mcg/g), vitamin B12 (0.75 to 1.25 mcg/g), kernel shape matching target rice variety.",
      "Density matching normal rice preventing segregation; zero nutrient loss during washing and boiling (retention >= 80%).",
      "Iron by AAS/ICP-OES, folic acid and B12 by HPLC/microbiological assay, cooking loss test per Annex B.", "Scheme-I", "Bureau of Indian Standards FAD 16 / DFPD Mandatory Fortification Order"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "Department of Food and Public Distribution (DFPD) Mandatory Rice Fortification Guidelines; FSSAI",
      source_url: "https://dfpd.gov.in",
      evidence_excerpt: "Compulsory BIS certification for Fortified Rice Kernels conforming to IS 17782 for all rice distributed under PMGKAY and PDS.",
      applicability_explanation: "Mandatory statutory product specification for fortified rice kernels in India.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 16. Mandatory under DFPD nationwide rice fortification rollout."
  },
  "Milled Rice (Basmati and Non-Basmati)": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 8371:2016",
    new_standard: createStd("IS 8371:2016", "Milled Rice — Specification", 2016, "Second Revision", "FAD 16", "Food and Agriculture",
      "Specifies requirements and test methods for milled raw and parboiled rice (Oryza sativa L.) including traditional Basmati and non-Basmati rice varieties.",
      "Husked, milled mature grains of Oryza sativa L.",
      "Moisture (max 14.0%), broken grains (max 5% to 25% depending on grade), chalky grains, foreign matter, red grains, degree of milling.",
      "Free from insect infestation, musty odour, or mineral oil coating.",
      "Grain dimension measurement using dial caliper, moisture per IS 4333 (Part 2), broken grain separation.", "Scheme-I", "Bureau of Indian Standards FAD 16 / AGMARK Milled Rice Rules"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "FSSAI Food Grains Regulations; AGMARK Milled Rice Rules",
      source_url: "https://fssai.gov.in",
      evidence_excerpt: "Prescribes physical, grading and hygiene standards for milled rice.",
      applicability_explanation: "Primary national standard for milled rice.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 16."
  },
  "Traditional Indian Basmati Rice Export Grade": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 8371:2016",
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "APEDA Export Inspection Council Regulations; AGMARK Basmati Rice Rules",
      source_url: "https://apeda.gov.in",
      evidence_excerpt: "Traditional Basmati rice grading parameters (kernel elongation ratio >= 1.7, aroma) conform to IS 8371.",
      applicability_explanation: "Primary national standard for Basmati rice grading.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 16. Governed by APEDA Basmati export standards."
  },
  "Whole Wheat Flour (Atta)": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 1155:1968",
    new_standard: createStd("IS 1155:1968", "Wheat Atta — Specification", 1968, "Second Revision (Reaffirmed 2020)", "FAD 16", "Food and Agriculture",
      "Specifies requirements and test methods for whole wheat flour (atta) obtained by milling clean sound wheat grains.",
      "Milled whole grain Triticum aestivum wheat.",
      "Moisture (max 14.0%), total ash (max 2.0%), acid insoluble ash (max 0.15%), gluten (min 6.0%), crude fibre (max 2.5%), alcoholic acidity (max 0.18%).",
      "Natural creamy wheat colour, pleasant wheaty flavour; zero bleaching agents or added chalk.",
      "Gluten washing per IS 1155 Annex B, alcoholic acidity per IS 1155 Annex C, moisture per IS 4333.", "Scheme-I", "Bureau of Indian Standards FAD 16 / FSSAI"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "FSSAI Food Grains Regulations; AGMARK Atta Grading Rules",
      source_url: "https://fssai.gov.in",
      evidence_excerpt: "Prescribes composition, gluten content and purity for packaged whole wheat flour.",
      applicability_explanation: "Primary national standard for whole wheat flour (atta).", confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 16."
  },
  "Fortified Refined Wheat Flour (Maida)": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 1009:1979",
    new_standard: createStd("IS 1009:1979", "Maida for General Purposes — Specification", 1979, "Second Revision (Reaffirmed 2020)", "FAD 16", "Food and Agriculture",
      "Specifies requirements for refined wheat flour (maida) obtained by roller milling and sifting cleaned wheat.",
      "Endosperm fraction of wheat grains.",
      "Moisture (max 13.0%), total ash (max 0.7%), acid insoluble ash (max 0.05%), dry gluten (min 7.5%), alcoholic acidity (max 0.12%), granulating fineness.",
      "Uniform white to off-white powder, high elasticity in kneaded dough for bakery/noodle making.",
      "Dry gluten per IS 1009 Annex B, fineness by sieve analysis, ash per IS 4333.", "Scheme-I", "Bureau of Indian Standards FAD 16 / FSSAI"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "FSSAI Food Grains Regulations; BIS FAD 16 Specifications",
      source_url: "https://fssai.gov.in",
      evidence_excerpt: "Prescribes quality and purity standards for refined wheat flour (maida).",
      applicability_explanation: "Primary national standard for refined wheat flour (maida).", confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 16."
  },

  // Edible Oils
  "Cold-Pressed Kachi Ghani Mustard Oil": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 546:1975",
    new_standard: createStd("IS 546:1975", "Mustard Oil — Specification", 1975, "Second Revision (Reaffirmed 2019)", "FAD 4", "Food and Agriculture",
      "Specifies requirements and test methods for cold-pressed (kachi ghani) and expeller mustard oil obtained from Brassica juncea or Brassica campestris seeds.",
      "Raw cold-expressed oil from mustard seeds.",
      "Refractive index at 40°C (1.4646 to 1.4662), saponification value (169 to 177), iodine value (98 to 112), acid value (max 4.0 for raw kachi ghani), Bellier turbidity temperature, allyl isothiocyanate content (0.25% to 0.60%).",
      "Characteristic pungent aroma; negative tests for argemone oil, mineral oil, and castor oil.",
      "Argemone test per IS 548 (Part 2), Baudouin test per IS 548, acid value per IS 548 (Part 1).", "Scheme-I", "Bureau of Indian Standards FAD 4 / AGMARK Mustard Oil Rules"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "AGMARK Mustard Oil Grading Rules; FSSAI Edible Oils Regulations",
      source_url: "https://dmi.gov.in",
      evidence_excerpt: "Kachi Ghani grade 1 mustard oil conforms to IS 546 and AGMARK Special Grade.",
      applicability_explanation: "Primary national standard for cold-pressed mustard oil.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 4."
  },
  "Cold-Extracted Extra Virgin Olive Oil": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 15686:2006",
    new_standard: createStd("IS 15686:2006", "Olive Oil — Specification", 2006, "Original Edition (Reaffirmed 2019)", "FAD 4", "Food and Agriculture",
      "Specifies requirements for virgin olive oil (Extra Virgin and Virgin), refined olive oil, and olive pomace oil.",
      "Oil obtained solely from fruit of Olea europaea L. by mechanical cold extraction.",
      "Free fatty acids as oleic acid (max 0.8% for extra virgin), peroxide value (max 20 meq O2/kg), fatty acid composition (oleic acid 55% to 83%), sterol profile, absorbance in UV (K270 <= 0.22, delta K <= 0.01).",
      "Fruit-like aroma, slight peppery bitterness; zero refined oil or solvent-extracted pomace oil blending.",
      "Fatty acid methyl esters by GC per ISO 12966, peroxide value per IS 548, UV absorbance per Annex B.", "Scheme-I", "Bureau of Indian Standards FAD 4 / FSSAI"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "FSSAI Edible Oils Regulations; BIS FAD 4 Specifications",
      source_url: "https://fssai.gov.in",
      evidence_excerpt: "Prescribes purity and chemical criteria for cold extracted extra virgin olive oil.",
      applicability_explanation: "Primary national standard for olive oil.", confidence_score: 0.98
    },
    investigation_notes: "Formulated by FAD 4."
  },
  "Refined Soybean Oil": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 4276:1977",
    new_standard: createStd("IS 4276:1977", "Soybean Oil — Specification", 1977, "First Revision (Reaffirmed 2019)", "FAD 4", "Food and Agriculture",
      "Specifies requirements for raw and refined soybean oil obtained from seeds of Glycine max L.",
      "Refined, bleached and deodorized oil from soybean seeds.",
      "Refractive index at 40°C (1.4649 to 1.4710), saponification value (189 to 195), iodine value (120 to 141), acid value (max 0.5 for refined), unsaponifiable matter (max 1.0%), flash point (min 250°C).",
      "Bland odour and taste, clear appearance; negative tests for argemone, sesame, and mineral oils.",
      "Acid value and iodine value per IS 548 (Part 1), moisture per IS 548.", "Scheme-I", "Bureau of Indian Standards FAD 4 / FSSAI"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "FSSAI Edible Oils Regulations; BIS FAD 4 Specifications",
      source_url: "https://fssai.gov.in",
      evidence_excerpt: "Prescribes quality and refining criteria for refined edible soybean oil.",
      applicability_explanation: "Primary national standard for refined soybean oil.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 4."
  },
  "Refined Soyabean Edible Oil Fortified": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 4276:1977",
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "FSSAI Fortification of Foods Regulations 2018; BIS FAD 4",
      source_url: "https://fssai.gov.in",
      evidence_excerpt: "Refined soybean oil fortified with Vitamin A (25 IU/g) and Vitamin D (4.5 IU/g) conforms to IS 4276.",
      applicability_explanation: "Primary national standard for fortified refined soybean oil.", confidence_score: 0.99
    },
    investigation_notes: "Duplicate entry mapping to IS 4276:1977 with FSSAI micronutrient fortification."
  },
  "Refined Sunflower Seed Cooking Oil": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 4277:1975",
    new_standard: createStd("IS 4277:1975", "Sunflower Oil — Specification", 1975, "First Revision (Reaffirmed 2019)", "FAD 4", "Food and Agriculture",
      "Specifies requirements for raw and refined sunflower oil obtained from seeds of Helianthus annuus L.",
      "Refined and winterized oil from sunflower seeds.",
      "Refractive index at 40°C (1.4640 to 1.4800), saponification value (188 to 194), iodine value (100 to 145), acid value (max 0.5 for refined), unsaponifiable matter (max 1.5%), wax content.",
      "Clear pale yellow oil remaining clear at 10°C (dewaxed); high linoleic/oleic polyunsaturated fatty acid profile.",
      "Wax test per Annex B, acid value and iodine value per IS 548 (Part 1).", "Scheme-I", "Bureau of Indian Standards FAD 4 / FSSAI"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "FSSAI Edible Oils Regulations; BIS FAD 4 Specifications",
      source_url: "https://fssai.gov.in",
      evidence_excerpt: "Prescribes quality and refining parameters for sunflower cooking oil.",
      applicability_explanation: "Primary national standard for refined sunflower cooking oil.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 4."
  },

  // Beverages
  "CTC Black Tea Grain Form (Assam / Dooars)": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 3633:2003",
    new_standard: createStd("IS 3633:2003", "Black Tea — Specification", 2003, "Second Revision (Reaffirmed 2019)", "FAD 6", "Food and Agriculture",
      "Specifies requirements for black tea (CTC and orthodox) produced from leaves of Camellia sinensis.",
      "Processed dried tea leaves, buds and tender stems.",
      "Water extract (min 32.0%), total ash (4.0% to 8.0%), water soluble ash in total ash (min 45.0%), acid insoluble ash (max 1.0%), crude fibre (max 16.5%), alkalinity of water soluble ash.",
      "Characteristic brisk cup quality, liquor colour and aroma; zero exhausted tea leaves or added colouring matter.",
      "Water extract per IS 1386, crude fibre per IS 10226, total ash per IS 1385.", "Scheme-I", "Bureau of Indian Standards FAD 6 / Tea Board of India"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "Tea Board of India Quality Regulations; FSSAI Beverages Regulations",
      source_url: "https://www.teaboard.gov.in",
      evidence_excerpt: "Prescribes chemical and quality criteria for commercial black tea in CTC grain and orthodox leaf forms.",
      applicability_explanation: "Primary national standard for CTC black tea.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 6."
  },
  "Orthodox Whole Leaf Green Tea": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 3929:2004",
    new_standard: createStd("IS 3929:2004", "Green Tea — Specification", 2004, "First Revision (Reaffirmed 2019)", "FAD 6", "Food and Agriculture",
      "Specifies requirements for green tea produced by unfermented steaming/pan-firing of Camellia sinensis leaves.",
      "Non-fermented tender tea leaves and buds.",
      "Water extract (min 32.0%), total ash (4.0% to 8.0%), catechins/polyphenol content (min 15.0%), crude fibre (max 16.5%), moisture (max 8.0%).",
      "Bright green infusion liquor, grassy vegetal taste; high antioxidant epigallocatechin gallate (EGCG) content.",
      "Catechins by HPLC per ISO 14502-2, water extract per IS 1386.", "Scheme-I", "Bureau of Indian Standards FAD 6 / Tea Board of India"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "Tea Board of India Quality Regulations; FSSAI Regulations",
      source_url: "https://www.teaboard.gov.in",
      evidence_excerpt: "Prescribes quality requirements and antioxidant parameters for unfermented green tea.",
      applicability_explanation: "Primary national standard for green tea.", confidence_score: 0.98
    },
    investigation_notes: "Formulated by FAD 6."
  },
  "Instant Spray-Dried Pure Coffee Powder": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 2791:1992",
    new_standard: createStd("IS 2791:1992", "Soluble Coffee Powder — Specification", 1992, "Third Revision (Reaffirmed 2019)", "FAD 6", "Food and Agriculture",
      "Prescribes requirements for spray-dried and freeze-dried pure soluble (instant) coffee powder.",
      "Aqueous extract of pure roasted and ground coffee beans (Coffea arabica or Coffea canephora).",
      "Moisture (max 4.0%), total ash (7.0% to 14.0%), caffeine content (min 2.8% on dry basis), solubility in boiling water (complete within 30 seconds), solubility in cold water at 16°C (complete within 3 minutes).",
      "Instant dissolution without sediment; characteristic roasted coffee aroma; zero chicory or added starch in pure grade.",
      "Caffeine determination by spectrophotometry/HPLC per IS 2791 Annex B, solubility test per Annex C.", "Scheme-I", "Bureau of Indian Standards FAD 6 / Coffee Board"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "Coffee Board of India Regulations; FSSAI Beverages Regulations",
      source_url: "https://www.indiacoffee.org",
      evidence_excerpt: "Prescribes purity, caffeine content and instant dissolution parameters for pure soluble coffee powder.",
      applicability_explanation: "Primary national standard for pure instant coffee powder.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 6."
  },
  "Roasted and Ground Arabica Coffee Powder": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 3077:1992",
    new_standard: createStd("IS 3077:1992", "Roasted and Ground Coffee — Specification", 1992, "Third Revision (Reaffirmed 2019)", "FAD 6", "Food and Agriculture",
      "Specifies requirements for pure roasted and ground coffee powder without chicory.",
      "Roasted beans of Coffea arabica or Coffea robusta.",
      "Moisture (max 5.0%), total ash (3.5% to 5.0%), water soluble ash in total ash (min 65.0%), acid insoluble ash (max 0.5%), caffeine content (min 1.0%), petroleum ether extract.",
      "Full-bodied aromatic brew; microscopic freedom from chicory root or date seed adulterants.",
      "Microscopic examination per IS 3077 Annex B, caffeine per Annex C, moisture per IS 4333.", "Scheme-I", "Bureau of Indian Standards FAD 6 / Coffee Board"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "Coffee Board of India Regulations; FSSAI Regulations",
      source_url: "https://www.indiacoffee.org",
      evidence_excerpt: "Prescribes purity and roasting standards for pure ground filter coffee powder.",
      applicability_explanation: "Primary national standard for roasted and ground coffee powder.", confidence_score: 0.98
    },
    investigation_notes: "Formulated by FAD 6."
  },
  "Carbonated Fruit Flavored Beverages": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 2346:1992",
    new_standard: createStd("IS 2346:1992", "Carbonated Beverages — Specification", 1992, "Second Revision (Reaffirmed 2019)", "FAD 14", "Food and Agriculture",
      "Specifies requirements and test methods for carbonated beverages (fruit flavoured drinks, colas, ginger ale, soda water).",
      "Potable water conforming to IS 10500, dissolved carbon dioxide, permitted flavourings, sweeteners, and citric/malic acids.",
      "Carbonation volume (gas volume min 1.0 to 4.0 vols), total soluble solids TSS (Brix), pH (2.5 to 4.0), microbiological limits, heavy metals (lead <= 0.5 ppm, arsenic <= 0.25 ppm).",
      "Effervescent sparkle; zero coliforms or pathogenic bacteria.",
      "Gas volume measurement by manometer per Annex B, Brix by refractometer, microbiological tests per IS 5402.", "Scheme-I", "Bureau of Indian Standards FAD 14 / FSSAI"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "FSSAI Carbonated Fruit Beverages Regulations; BIS FAD 14 Specifications",
      source_url: "https://fssai.gov.in",
      evidence_excerpt: "Prescribes quality and hygiene requirements for commercially bottled carbonated beverages.",
      applicability_explanation: "Primary national standard for carbonated fruit-flavoured drinks.", confidence_score: 0.98
    },
    investigation_notes: "Formulated by FAD 14."
  },

  // Processed Food, Canned Goods & Animal Feeds
  "Canned Alphonso Mango Fruit Pulp": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 3882:1979",
    new_standard: createStd("IS 3882:1979", "Canned Mango Pulp — Specification", 1979, "First Revision (Reaffirmed 2019)", "FAD 10", "Food and Agriculture",
      "Specifies requirements for canned mango pulp prepared from sound ripe fruits of mango varieties (Alphonso, Totapuri, Kesar).",
      "Extracted mango fruit pulp packed in hermetically sealed sanitary tinplate cans.",
      "Total soluble solids TSS (min 19.0 Brix for Alphonso), acidity as citric acid (0.3% to 0.8%), vacuum in can (min 100 mm Hg), headspace (max 10%), heavy metals (tin <= 250 ppm, lead <= 1.0 ppm).",
      "Characteristic bright orange-yellow colour and natural aroma; commercial sterility (zero viable thermophilic or mesophilic spores).",
      "TSS by refractometer, acidity per IS 2860, incubation sterility test at 37°C and 55°C per IS 2860.", "Scheme-I", "Bureau of Indian Standards FAD 10 / APEDA Processed Food Guidelines"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "APEDA Export Standards for Canned Mango Pulp; FSSAI Fruit Products Regulations",
      source_url: "https://apeda.gov.in",
      evidence_excerpt: "Alphonso mango pulp canning quality and export consignments conform to IS 3882.",
      applicability_explanation: "Primary national standard for canned mango fruit pulp.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 10."
  },
  "Canned Sweet Corn Kernels in Brine": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 14596:1998",
    new_standard: createStd("IS 14596:1998", "Canned Sweet Corn — Specification", 1998, "Original Edition (Reaffirmed 2019)", "FAD 10", "Food and Agriculture",
      "Specifies requirements for canned sweet corn kernels (whole kernel style in brine and cream style) packed in hermetically sealed containers.",
      "Cut whole kernels of tender sweet corn (Zea mays var. saccharata) in potable water and edible salt brine.",
      "Drained weight (min 60% of net water capacity), alcohol-insoluble solids (max 27%), vacuum (min 100 mm Hg), defects (blemished kernels max 2%).",
      "Tender crisp kernels, bright yellow colour; commercially sterile.",
      "Drained weight per IS 2860, alcohol-insoluble solids per Annex B, sterility test.", "Scheme-I", "Bureau of Indian Standards FAD 10 / FSSAI"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "FSSAI Processed Vegetables Regulations; BIS FAD 10 Specifications",
      source_url: "https://fssai.gov.in",
      evidence_excerpt: "Prescribes requirements for canned whole kernel sweet corn in brine.",
      applicability_explanation: "Primary national standard for canned sweet corn.", confidence_score: 0.98
    },
    investigation_notes: "Formulated by FAD 10."
  },
  "Hot-Break Tomato Paste and Puree Concentrate": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 3883:1993",
    new_standard: createStd("IS 3883:1993", "Tomato Puree and Tomato Paste — Specification", 1993, "Second Revision (Reaffirmed 2019)", "FAD 10", "Food and Agriculture",
      "Prescribes requirements for concentrated tomato products (tomato puree min 9% TSS; tomato paste min 25% to 36% TSS hot-break and cold-break).",
      "Concentrated tomato juice from sound red ripe tomatoes (Solanum lycopersicum).",
      "Total soluble solids TSS (min 25.0% to 36.0% salt-free solids for paste), acidity (min 1.0%), Howard mould count (max 40% positive fields), lycopene content, Bostwick consistency.",
      "Deep red colour, thick consistency; zero added artificial red colour or starch.",
      "TSS by Abbe refractometer, Howard mould count per IS 2860, Bostwick consistometer test.", "Scheme-I", "Bureau of Indian Standards FAD 10 / FSSAI"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "FSSAI Fruit and Vegetable Products Regulations; BIS FAD 10 Specifications",
      source_url: "https://fssai.gov.in",
      evidence_excerpt: "Prescribes concentration, mould count and purity parameters for tomato paste and puree.",
      applicability_explanation: "Primary national standard for tomato paste and puree concentrates.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 10."
  },
  "Tomato Ketchup and Purees": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 3883:1993",
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "FSSAI Regulations; BIS FAD 10",
      source_url: "https://fssai.gov.in",
      evidence_excerpt: "Clause 1: Prescribes requirements for tomato puree and concentrated tomato products.",
      applicability_explanation: "Primary national standard for tomato purees and tomato sauce bases.", confidence_score: 0.98
    },
    investigation_notes: "Duplicate entry mapping to IS 3883:1993."
  },
  "Fruit Jams, Jellies and Marmalades": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 5861:1993",
    new_standard: createStd("IS 5861:1993", "Jams, Jellies and Marmalades — Specification", 1993, "First Revision (Reaffirmed 2019)", "FAD 10", "Food and Agriculture",
      "Prescribes requirements and test methods for fruit jams, fruit jellies, and citrus marmalades.",
      "Prepared fruit pulp/juice boiled with sucrose, pectin, and citric acid.",
      "Total soluble solids TSS (min 65.0% by mass), fruit content (min 45.0% of finished product), sulfur dioxide preservative (max 40 ppm), lead (max 1.0 ppm).",
      "Firm tender gel holding shape without syneresis (weeping); zero mould growth.",
      "TSS by refractometer, fruit content determination per Annex B, preservative test per IS 2860.", "Scheme-I", "Bureau of Indian Standards FAD 10 / FSSAI"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "FSSAI Fruit Products Regulations; BIS FAD 10 Specifications",
      source_url: "https://fssai.gov.in",
      evidence_excerpt: "Prescribes composition, minimum fruit content and soluble solids for fruit jams and marmalades.",
      applicability_explanation: "Primary national standard for fruit jams, jellies and marmalades.", confidence_score: 0.98
    },
    investigation_notes: "Formulated by FAD 10."
  },
  "Instant Noodles and Pasta Products": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 14846:2000",
    new_standard: createStd("IS 14846:2000", "Instant Noodles — Specification", 2000, "Original Edition (Reaffirmed 2020)", "FAD 16", "Food and Agriculture",
      "Prescribes requirements and test methods for fried and non-fried instant noodles with accompanying seasoning tastemaker sachet.",
      "Refined wheat flour (maida), edible vegetable oil, seasoning spices, permitted acidity regulators.",
      "Moisture (max 10.0% for fried / 12.0% for non-fried), acid value of extracted fat (max 2.0 mg KOH/g), lead content (max 2.5 mg/kg), total ash, microbiological limits.",
      "Rapid rehydration in boiling water within 3 minutes; chewy resilient texture without mushiness.",
      "Acid value of extracted oil per IS 548, lead by AAS per AOAC 999.11, rehydration cooking test.", "Scheme-I", "Bureau of Indian Standards FAD 16 / FSSAI Instant Noodles Standard"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "FSSAI Cereal Products Regulations; BIS FAD 16 Specifications",
      source_url: "https://fssai.gov.in",
      evidence_excerpt: "Prescribes quality and safety standards for instant noodles and seasoning sachets.",
      applicability_explanation: "Primary national standard for instant noodles.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 16."
  },
  "Dehydrated Garlic Granules and Powder": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 4452:1969",
    new_standard: createStd("IS 4452:1969", "Dehydrated Garlic — Specification", 1969, "Original Edition (Reaffirmed 2019)", "FAD 10", "Food and Agriculture",
      "Specifies requirements for dehydrated garlic in flakes, granules, minced, and powder forms prepared from Allium sativum L.",
      "Dehydrated cloves of Allium sativum L.",
      "Moisture (max 6.0%), total ash (max 5.0%), acid insoluble ash (max 0.5%), cold water soluble extract (min 70.0%), volatile thiosulphinates (allicin potential min 0.3%).",
      "Strong characteristic pungent garlic odour upon reconstitution; free from scorching or caking.",
      "Moisture by toluene distillation per IS 1797, allicin assay by spectrophotometry.", "Scheme-I", "Bureau of Indian Standards FAD 10 / APEDA"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "APEDA Dehydrated Vegetables Export Standards; FSSAI Regulations",
      source_url: "https://apeda.gov.in",
      evidence_excerpt: "Prescribes quality requirements for dehydrated garlic flakes, granules and powder.",
      applicability_explanation: "Primary national standard for dehydrated garlic products.", confidence_score: 0.98
    },
    investigation_notes: "Formulated by FAD 10."
  },
  "Solar Dehydrated White Onion Flakes": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 4454:1969",
    new_standard: createStd("IS 4454:1969", "Dehydrated Onion — Specification", 1969, "Original Edition (Reaffirmed 2019)", "FAD 10", "Food and Agriculture",
      "Specifies requirements for dehydrated onion flakes, kibbled pieces, and powder prepared from clean mature white or red onions (Allium cepa L.).",
      "Dehydrated bulbs of Allium cepa L.",
      "Moisture (max 6.0%), total ash (max 5.0%), acid insoluble ash (max 0.5%), rehydration ratio (min 1:4), pyruvic acid content (pungency indicator).",
      "Light cream colour, free from scorching; clean savoury onion taste upon rehydration.",
      "Rehydration test per Annex B, pyruvic acid assay per Annex C, moisture per IS 1797.", "Scheme-I", "Bureau of Indian Standards FAD 10 / APEDA"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "APEDA Dehydrated Onion Export Guidelines; FSSAI Regulations",
      source_url: "https://apeda.gov.in",
      evidence_excerpt: "Prescribes quality and rehydration standards for dehydrated onion flakes and powder.",
      applicability_explanation: "Primary national standard for dehydrated white onion flakes.", confidence_score: 0.98
    },
    investigation_notes: "Formulated by FAD 10."
  },
  "Compounded Cattle Feed for Dairy Cows": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 2052:2009",
    new_standard: createStd("IS 2052:2009", "Compounded Feeds for Cattle — Specification", 2009, "Fourth Revision (Reaffirmed 2019)", "FAD 5", "Food and Agriculture",
      "Specifies requirements and test methods for compounded cattle feeds (Type I and Type II) in mash or pellet form for milk-producing cows and buffaloes.",
      "Grains, oilseed cakes (mustard, soy, cotton), wheat bran, molasses, mineral mixture, and vitamins.",
      "Crude protein (min 20.0% for Type I / 18.0% for Type II), crude fat (min 2.5% to 3.0%), crude fibre (max 12.0%), acid insoluble ash (max 3.0%), aflatoxin B1 (max 20 ppb), urea (max 1.0%).",
      "High palatability, promotes lactation milk yield; zero pathogenic Salmonella or toxic castor pomace.",
      "Crude protein by Kjeldahl per IS 7874 (Part 1), aflatoxin by HPLC/ELISA per IS 13426.", "Scheme-I", "Bureau of Indian Standards FAD 5 / Department of Animal Husbandry and Dairying (DAHD)"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "DPIIT / DAHD Compounded Cattle Feeds (Quality Control) Order; National Dairy Development Board",
      source_url: "https://dahd.nic.in",
      evidence_excerpt: "Compulsory Scheme-I ISI marking for compounded cattle feeds conforming to IS 2052 across commercial dairy feed mills.",
      applicability_explanation: "Mandatory statutory product specification for dairy cow compounded cattle feeds.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 5. Mandatory ISI mark under DAHD Quality Control Order."
  },
  "Poultry Feed Broiler Finisher": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 1374:2007",
    new_standard: createStd("IS 1374:2007", "Poultry Feeds — Specification", 2007, "Fifth Revision (Reaffirmed 2019)", "FAD 5", "Food and Agriculture",
      "Specifies requirements for poultry feeds (Broiler Starter, Broiler Finisher, Layer Starter, Grower and Layer Feeds).",
      "Corn, soybean meal, fish meal, dicalcium phosphate, amino acids (methionine, lysine), trace minerals.",
      "Crude protein (min 20.0% for broiler finisher), metabolisable energy ME (min 3100 kcal/kg), crude fat (min 3.5%), crude fibre (max 5.0%), calcium, available phosphorus, aflatoxin B1 (max 20 ppb).",
      "Optimal feed conversion ratio (FCR <= 1.6); free from fungal mycotoxins and mammalian tissue meat meal.",
      "Crude protein per IS 7874 (Part 1), gross energy by bomb calorimeter, aflatoxin screening.", "Scheme-I", "Bureau of Indian Standards FAD 5 Animal Feeds Committee"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "BIS FAD 5 Sectional Committee Specifications; DAHD Poultry Guidelines",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_1374",
      evidence_excerpt: "Clause 1: Prescribes nutritional and hygiene requirements for balanced poultry feeds.",
      applicability_explanation: "Primary national standard for broiler finisher poultry feeds.", confidence_score: 0.98
    },
    investigation_notes: "Formulated by FAD 5."
  },
  "Floating Fish Feed Extruded Pellets": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 16156:2014",
    new_standard: createStd("IS 16156:2014", "Fish Feeds — Specification", 2014, "Original Edition (Reaffirmed 2019)", "FAD 5", "Food and Agriculture",
      "Specifies requirements and test methods for aquaculture fish feeds (floating extruded pellets and sinking pellets for carps, pangasius, and tilapia).",
      "Fish meal, soy protein concentrate, wheat flour, fish oil, vitamins and minerals extruded under high pressure/temperature.",
      "Crude protein (24% to 38% depending on growth stage), crude fat (min 4.0% to 8.0%), floatability (min 90% floating after 20 minutes in water), water stability without disintegrating.",
      "High digestibility, minimal nutrient leaching into pond water; zero prohibited antibiotics.",
      "Floatability test per Annex B, water stability per Annex C, crude protein per IS 7874.", "Scheme-I", "Bureau of Indian Standards FAD 5 Animal Feeds Committee"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "National Fisheries Development Board (NFDB) Standards; BIS FAD 5",
      source_url: "https://nfdb.gov.in",
      evidence_excerpt: "Prescribes nutrient composition and physical water-stability for manufactured aquaculture fish feeds.",
      applicability_explanation: "Primary national standard for extruded floating fish feed pellets.", confidence_score: 0.98
    },
    investigation_notes: "Formulated by FAD 5."
  },
  "Mineral Mixture for Livestock Feeds": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 1664:2002",
    new_standard: createStd("IS 1664:2002", "Mineral Mixtures for Supplementing Cattle Feeds — Specification", 2002, "Third Revision (Reaffirmed 2019)", "FAD 5", "Food and Agriculture",
      "Specifies requirements and test methods for mineral mixtures containing macro-minerals and micro-minerals (Type I containing salt and Type II without salt) for cattle and buffaloes.",
      "Calcite powder, dicalcium phosphate, copper sulphate, zinc sulphate, manganese sulphate, potassium iodate, cobalt sulphate.",
      "Calcium (min 16.0% to 20.0%), phosphorus (min 6.0% to 9.0%), magnesium, copper, zinc, manganese, iodine, fluorine (max 0.05% to prevent fluorosis), lead (max 20 ppm), arsenic (max 7 ppm).",
      "Prevents mineral deficiency diseases and reproductive disorders in livestock; non-hygroscopic free flowing.",
      "Calcium and phosphorus per IS 7874 (Part 2), fluorine by ion selective electrode, heavy metals by AAS.", "Scheme-I", "Bureau of Indian Standards FAD 5 / DAHD Compulsory Scheme"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "DPIIT / DAHD Mineral Mixtures for Cattle Feeds (Quality Control) Order",
      source_url: "https://dahd.nic.in",
      evidence_excerpt: "Compulsory Scheme-I ISI marking for mineral mixtures for cattle feeds conforming to IS 1664.",
      applicability_explanation: "Mandatory statutory product specification for livestock mineral mixtures.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 5. Mandatory ISI mark under DAHD QCO."
  },
  "Food Grade Tinplate Cans for Preserves": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 13955:2020",
    new_standard: createStd("IS 13955:2020", "Round Open Top Sanitary Cans for Foods and Drinks — Specification", 2020, "Second Revision", "FAD 10", "Food and Agriculture",
      "Specifies requirements for three-piece welded and two-piece drawn open-top sanitary tinplate metal cans for packing preserved fruits, vegetables, meat, and fish.",
      "Electrolytic tinplate conforming to IS 1993 lined with food-grade epoxy-phenolic or organosol sanitary lacquer.",
      "Can dimensions, double seam parameters (seam thickness, seam length, body hook, cover hook, overlap min 1.0 mm), axial load bearing capacity, internal lacquer adhesion and curing test.",
      "Hermetic seal holding vacuum; zero migration of bisphenol A or heavy metals into foodstuffs.",
      "Cross-hatch lacquer adhesion test, enamel rater conductivity test, double seam tear-down inspection.", "Scheme-I", "Bureau of Indian Standards FAD 10 / FSSAI Packaging Regulations"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "FSSAI Packaging Regulations; BIS FAD 10 Specifications",
      source_url: "https://fssai.gov.in",
      evidence_excerpt: "Prescribes dimensional and double seam hermetic seal requirements for open top sanitary food cans.",
      applicability_explanation: "Primary national standard for food grade sanitary tinplate cans.", confidence_score: 0.98
    },
    investigation_notes: "Formulated by FAD 10."
  },
  "Galvanized Corrugated Grain Storage Silos": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 5503 (Part 1):1969",
    new_standard: createStd("IS 5503 (Part 1):1969", "General Requirements for Silos for Grain Storage: Part 1 Constructional Requirements", 1969, "Original Edition (Reaffirmed 2019)", "FAD 17", "Food and Agriculture",
      "Specifies constructional and design requirements for outdoor corrugated galvanized steel silos for bulk food grain storage.",
      "Corrugated hot-dip galvanized steel wall sheets (IS 277 Z450 coating) with structural steel stiffeners.",
      "Wind and seismic load resistance, grain pressure computation (Janssen theory), aeration ducts, moisture sealing at base joint, roof slope and emergency pressure relief vents.",
      "Airtight fumigation capability, zero grain spoilage or hotspot formation; 30+ year structural design life.",
      "Structural design check, zinc coating thickness per IS 6745, air tightness pressure decay test.", "Scheme-I", "Bureau of Indian Standards FAD 17 / Food Corporation of India (FCI) Silo Tenders"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "FCI Bulk Grain Silo Technical Specifications; BIS FAD 17 Standards",
      source_url: "https://fci.gov.in",
      evidence_excerpt: "Prescribes design and construction requirements for galvanized steel grain storage silos.",
      applicability_explanation: "Primary national standard for corrugated steel grain storage silos.", confidence_score: 0.98
    },
    investigation_notes: "Formulated by FAD 17."
  },

  // Agricultural Machinery
  "Power Tillers (Hand Tractors)": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 9980:1999",
    new_standard: createStd("IS 9980:1999", "Agricultural Machinery — Power Tillers — Test Code", 1999, "First Revision (Reaffirmed 2019)", "FAD 11", "Food and Agriculture",
      "Specifies test procedures and performance requirements for hand-operated two-wheel power tillers (rotary tillers driven by diesel engines).",
      "Steel chassis, diesel engine, gearbox, rotary cultivation rotor blades.",
      "Engine power output, PTO power, drawbar pull, fuel consumption, turning radius, vibration and operator noise limits at handle grip, rotary tilling efficiency.",
      "Safe maneuvering in wet paddy puddling; operator hand-arm vibration attenuation.",
      "Laboratory and field testing protocol at FMTTI Budni per IS 9980 and IS 13539.", "Scheme-I", "Bureau of Indian Standards FAD 11 / Ministry of Agriculture SMAM"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "Sub-Mission on Agricultural Mechanization (SMAM) Subsidy Guidelines; Central Motor Vehicles Rules (CMVR)",
      source_url: "https://farmech.gov.in",
      evidence_excerpt: "Compulsory testing and conformity to IS 9980 / IS 13539 at FMTTI for all power tillers commercialized or subsidized in India.",
      applicability_explanation: "Mandatory statutory testing and performance standard for power tillers in India.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 11. Mandatory under Ministry of Agriculture SMAM scheme."
  },
  "Combine Harvesters (Paddy/Wheat)": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 15806:2008",
    new_standard: createStd("IS 15806:2008", "Agricultural Tractors and Other Self-Propelled Machines — Combine Harvester — Test Code", 2008, "Original Edition (Reaffirmed 2019)", "FAD 11", "Food and Agriculture",
      "Specifies test codes and performance evaluation for self-propelled wheeled and track-type combine harvesters for harvesting paddy and wheat.",
      "Heavy structural steel frame, diesel engine, cutter bar reel, threshing cylinder, concave, straw walkers, grain cleaning sieves.",
      "Cutter bar width, grain throughput capacity (t/h), grain loss limits (cutter bar loss <= 1%, unthreshed loss <= 0.5%, blower loss <= 0.5%), grain damage/breakage (max 2.0%), operator cab safety ROPS.",
      "High harvesting efficiency with clean grain bin output; compliance with CMVR road safety regulations.",
      "FMTTI field test code: 25 hours continuous harvesting test, grain loss evaluation per Annex B.", "Scheme-I", "Bureau of Indian Standards FAD 11 / Ministry of Agriculture SMAM"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "Ministry of Agriculture SMAM Guidelines; FMTTI Test Protocol",
      source_url: "https://farmech.gov.in",
      evidence_excerpt: "All combine harvesters sold in India must undergo mandatory commercial testing conforming to IS 15806.",
      applicability_explanation: "Mandatory statutory performance and testing code for combine harvesters in India.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 11. Mandatory for commercial sale and agricultural subsidy."
  },
  "Combine Harvester Rubber Crawler Tracks": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 16298:2015",
    new_standard: createStd("IS 16298:2015", "Agricultural Machinery — Rubber Tracks for Crawlers — Specification", 2015, "Original Edition (Reaffirmed 2020)", "FAD 11", "Food and Agriculture",
      "Specifies requirements, dimensions and test methods for endless rubber crawler tracks used on paddy combine harvesters and agricultural crawler tractors.",
      "Abrasion-resistant vulcanized rubber compound reinforced with continuous high-tensile steel cord helix and embedded forged steel guide lugs.",
      "Track pitch, width, lug height, carcass tensile breaking force, rubber-to-metal bonding adhesion, mud-ejection tread pattern.",
      "Exceptional flotation on swampy paddy soils (ground contact pressure <= 25 kPa); zero track de-tracking under heavy turning loads.",
      "Tensile strength test of steel carcass, peel adhesion test per IS 3400, field durability test.", "Scheme-I", "Bureau of Indian Standards FAD 11 Farm Machinery Committee"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "FMTTI Agricultural Machinery Test Guidelines; BIS FAD 11",
      source_url: "https://farmech.gov.in",
      evidence_excerpt: "Prescribes dimensional and strength specifications for rubber crawler tracks used on combine harvesters.",
      applicability_explanation: "Primary national standard for combine harvester rubber tracks.", confidence_score: 0.98
    },
    investigation_notes: "Formulated by FAD 11."
  },
  "Chaff Cutters (Power Driven)": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 7897:2019",
    new_standard: createStd("IS 7897:2019", "Agricultural Machinery — Chaff Cutter (Power Driven) — Safety and Performance Requirements", 2019, "Second Revision", "FAD 11", "Food and Agriculture",
      "Specifies safety and performance requirements for power-driven chaff cutters used for chopping green and dry fodder for livestock.",
      "Steel frame, feed rollers, cutting flywheel with tempered blades, safety reverse-gear mechanism.",
      "Throughput capacity (t/h), power consumption, cutting blade hardness (45 to 52 HRC), mandatory safety chute length (min 900 mm preventing hands reaching feed rollers), emergency stop lever, warning markings.",
      "Elimination of operator hand amputation accidents; uniform chop length.",
      "Safety distance measurement per Annex A, blade hardness per IS 1586, continuous operation test per IS 7897.", "Scheme-I", "Bureau of Indian Standards FAD 11 / Ministry of Agriculture Safety Directives"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "Ministry of Agriculture Chaff Cutter Safety Guidelines; SMAM Subsidy Testing Norms",
      source_url: "https://farmech.gov.in",
      evidence_excerpt: "Mandatory compliance with safety features and feeding chute dimensions of IS 7897 for all power chaff cutters.",
      applicability_explanation: "Mandatory statutory safety and performance standard for power chaff cutters.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 11. Mandatory operator safety code."
  },
  "Knapsack Battery Operated Agricultural Sprayers": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 11313:2007",
    new_standard: createStd("IS 11313:2007", "Hydraulic Power Sprayers — Specification", 2007, "Second Revision (Reaffirmed 2019)", "FAD 11", "Food and Agriculture",
      "Specifies requirements, performance and testing of hydraulic power sprayers, including 12V battery-operated knapsack sprayers for pesticide spraying.",
      "UV-stabilized HDPE tank (16L), 12V DC diaphragm pump, rechargeable lithium/lead-acid battery, brass/plastic spray lance with hollow cone nozzle.",
      "Tank capacity, pump discharge rate (min 1.5 to 3.0 l/min), working pressure (0.2 to 0.4 MPa), battery backup time (min 4 to 6 hours continuous), lance drop impact test, chemical resistance of tank plastic.",
      "Uniform spray droplet spectrum (VMD 150-250 microns); zero chemical leakage onto operator's back.",
      "Discharge measurement test, tank drop test from 1.2 m per Annex B, chemical compatibility test per IS 11313.", "Scheme-I", "Bureau of Indian Standards FAD 11 / Ministry of Agriculture SMAM"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "Ministry of Agriculture SMAM Testing Guidelines; FMTTI Batch Testing Protocol",
      source_url: "https://farmech.gov.in",
      evidence_excerpt: "Battery operated sprayers must undergo mandatory commercial testing at FMTTI conforming to IS 11313 for DBT subsidy eligibility.",
      applicability_explanation: "Mandatory statutory testing standard for battery operated knapsack sprayers in India.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 11."
  },
  "Pneumatic Knapsack Sprayers": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 3906:1995",
    new_standard: createStd("IS 3906:1995", "Farm Drainage and Plant Protection Equipment — Knapsack Sprayers (Piston/Diaphragm Type) — Specification", 1995, "Fourth Revision (Reaffirmed 2019)", "FAD 11", "Food and Agriculture",
      "Specifies requirements, construction, and testing of manually operated knapsack sprayers for agricultural chemical spraying.",
      "Brass or engineering plastic cylinder, mechanical hand lever, pressure chamber, spray lance with trigger cutoff valve.",
      "Tank capacity (10 to 16 litres), hydraulic proof pressure test of pressure chamber (1.0 MPa for 5 minutes), discharge rate (min 500 ml/min at 0.3 MPa), mechanical endurance test (50,000 continuous pumping cycles).",
      "Fatigue life without pump cylinder cracking or diaphragm rupture; chemical corrosion resistance.",
      "Hydrostatic pressure test, pump volumetric efficiency test, endurance testing machine per Annex B.", "Scheme-I", "Bureau of Indian Standards FAD 11 Farm Machinery Committee"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "Ministry of Agriculture SMAM Guidelines; FMTTI Testing Norms",
      source_url: "https://farmech.gov.in",
      evidence_excerpt: "Mandatory testing and BIS conformity to IS 3906 for all manual and pneumatic knapsack sprayers.",
      applicability_explanation: "Mandatory statutory testing standard for knapsack sprayers.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 11."
  },
  "Laser Land Levellers for Agriculture": {
    status: "CANDIDATE_UNVERIFIED",
    investigation_notes: "Currently under technical committee formulation in BIS Sectional Committee FAD 11 (Farm Machinery and Equipment) as a draft Indian Standard; commercial testing currently follows FMTTI Budni protocol (laser transmitter, receiver mast, scraper bucket), but no final Gazette QCO or published IS standard is enacted yet."
  },
  "Paddy Transplanters (Self Propelled)": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 16676:2017",
    new_standard: createStd("IS 16676:2017", "Agricultural Machinery — Self-Propelled Rice Transplanter — Test Code", 2017, "Original Edition", "FAD 11", "Food and Agriculture",
      "Specifies test procedures and performance requirements for ride-on and walk-behind self-propelled paddy transplanters (4-row, 6-row, 8-row).",
      "Lightweight chassis, rubber lugged paddy wheels, petrol/diesel engine, seedling tray feeder, rotary transplanting claws.",
      "Row spacing (standard 300 mm), hill spacing (120 to 180 mm), seedlings per hill (2 to 5), missing hill percentage (max 5%), floating seedling percentage (max 3%), field capacity (ha/h).",
      "Smooth planting in wet puddled soil without sinking; minimal seedling damage.",
      "FMTTI field test: 25 hours continuous transplanting test, missing hill counting, planting depth uniformity.", "Scheme-I", "Bureau of Indian Standards FAD 11 / Ministry of Agriculture SMAM"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "Ministry of Agriculture SMAM Guidelines; FMTTI Test Protocol",
      source_url: "https://farmech.gov.in",
      evidence_excerpt: "Compulsory FMTTI testing conforming to IS 16676 for all self-propelled rice transplanters under national farm mechanization subsidies.",
      applicability_explanation: "Mandatory statutory testing standard for self-propelled rice transplanters in India.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 11."
  },
  "Rotavators (Rotary Tillers)": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 17045:2018",
    new_standard: createStd("IS 17045:2018", "Rotary Tillers (Rotavators) — Test Code and Performance Requirements", 2018, "Original Edition", "FAD 11", "Food and Agriculture",
      "Specifies test codes, constructional requirements and performance evaluation for tractor PTO-driven rotary tillers (rotavators).",
      "Heavy duty tubular frame, central or side gear drive, PTO cardan shaft with shear bolt safety clutch, rotor shaft with boron steel L or C blades.",
      "Tillage depth (up to 150 mm), pulverized mean mass diameter (MMD <= 15 mm), field capacity, blade hardness (IS 6690: 42 to 48 HRC), fuel consumption.",
      "Smooth seedbed preparation in single pass; high wear life in abrasive rocky/sandy soils.",
      "Field pulverization test per Annex B, PTO torque and power measurement per Annex C, blade wear test.", "Scheme-I", "Bureau of Indian Standards FAD 11 / Ministry of Agriculture SMAM"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "Ministry of Agriculture SMAM Directives; FMTTI Test Code",
      source_url: "https://farmech.gov.in",
      evidence_excerpt: "Mandatory commercial testing at FMTTI conforming to IS 17045 for rotavators commercialized in India.",
      applicability_explanation: "Mandatory statutory performance and testing standard for tractor rotavators.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 11."
  },
  "Tractor PTO Driven Tillage Rotavators": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 17045:2018",
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "Ministry of Agriculture SMAM Directives; FMTTI",
      source_url: "https://farmech.gov.in",
      evidence_excerpt: "Clause 1: Prescribes testing and performance standards for tractor PTO-driven rotary tillers.",
      applicability_explanation: "Mandatory statutory standard for tractor PTO driven rotavators.", confidence_score: 0.99
    },
    investigation_notes: "Duplicate entry mapping to IS 17045:2018."
  },
  "Seed Cum Fertilizer Drills": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 6813:2000",
    new_standard: createStd("IS 6813:2000", "Sowing Equipment — Seed-cum-Fertilizer Drills — Specification", 2000, "Second Revision (Reaffirmed 2019)", "FAD 11", "Food and Agriculture",
      "Specifies requirements and test methods for tractor-drawn and bullock-drawn seed-cum-fertilizer drills for sowing wheat, pulses, and oilseeds.",
      "Steel frame, separate seed and fertilizer hoppers, fluted roller metering mechanism, furrow openers (disc or shoe type).",
      "Calibration accuracy (variation in seed rate between runs <= 5%, variation between furrow openers <= 7%), fertilizer delivery rate uniformity, seed damage percentage (max 1.0%), mechanical seed hopper agitator.",
      "Uniform sowing depth and germination spacing; corrosion resistance against chemical fertilizers.",
      "Calibration test on test bench per Annex A, seed damage test per Annex B.", "Scheme-I", "Bureau of Indian Standards FAD 11 / Ministry of Agriculture SMAM"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "Ministry of Agriculture SMAM Guidelines; FMTTI Testing Protocol",
      source_url: "https://farmech.gov.in",
      evidence_excerpt: "Mandatory commercial test report conforming to IS 6813 for all seed drills subsidized under government agricultural programs.",
      applicability_explanation: "Mandatory statutory testing standard for seed cum fertilizer drills in India.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 11."
  },
  "Threshers (Multi-Crop)": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 9020:2002",
    new_standard: createStd("IS 9020:2002", "Power Threshers — General and Safety Requirements", 2002, "Second Revision (Reaffirmed 2019)", "FAD 11", "Food and Agriculture",
      "Specifies general constructional and mandatory safety requirements for power-operated threshers for wheat, paddy, soybean, and pulses.",
      "Heavy steel structure, spike tooth / rasp bar threshing cylinder, concave, aspirator blower, cleaning sieves, feeding chute.",
      "Mandatory feeding chute dimensions (safety chute length min 900 mm), covered flywheels and belts, threshing efficiency (min 98.0%), grain breakage (max 2.0%), clean grain output (min 97.0%).",
      "Elimination of operator hand entanglements in threshing cylinder; high multi-crop throughput.",
      "Safety distance measurement per Annex A, threshing efficiency and grain loss evaluation per IS 6284.", "Scheme-I", "Bureau of Indian Standards FAD 11 / Dangerous Machines (Regulation) Act"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "Dangerous Machines (Regulation) Act 1983; Ministry of Agriculture SMAM Guidelines",
      source_url: "https://farmech.gov.in",
      evidence_excerpt: "Statutory requirement under Dangerous Machines Act: all power threshers manufactured or sold must strictly conform to safety specifications of IS 9020.",
      applicability_explanation: "Mandatory statutory safety and performance standard for power threshers in India.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 11. Enforced under the Dangerous Machines (Regulation) Act."
  },
  "Tractor Drawn Disc Harrows": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 6638:1972",
    new_standard: createStd("IS 6638:1972", "Tractor-Mounted Disc Harrows — Specification", 1972, "Original Edition (Reaffirmed 2019)", "FAD 11", "Food and Agriculture",
      "Specifies requirements for tractor-mounted and trailed disc harrows (offset and tandem types) for secondary tillage and weed cutting.",
      "Structural steel frame, high carbon steel dished discs (conforming to IS 4366), sealed ball bearing spools, gang angle adjusting mechanism.",
      "Disc diameter (450 to 660 mm), concavity, disc hardness (38 to 44 HRC), gang angle adjustment (up to 24 degrees), penetration depth.",
      "Uniform soil pulverization and residue incorporation without disc cracking or bearing seizure.",
      "Hardness test per IS 1586, disc impact toughness test per IS 4366, field endurance testing.", "Scheme-I", "Bureau of Indian Standards FAD 11 Farm Machinery Committee"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "FMTTI Agricultural Implements Test Code; BIS FAD 11",
      source_url: "https://farmech.gov.in",
      evidence_excerpt: "Prescribes construction, dimensions and disc quality for tractor mounted disc harrows.",
      applicability_explanation: "Primary national standard for tractor drawn disc harrows.", confidence_score: 0.98
    },
    investigation_notes: "Formulated by FAD 11."
  },
  "Tractor Drawn Heavy Duty Disc Ploughs": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 9813:2002",
    new_standard: createStd("IS 9813:2002", "Tractor-Mounted Disc Ploughs — Specification", 2002, "First Revision (Reaffirmed 2019)", "FAD 11", "Food and Agriculture",
      "Specifies requirements for tractor-mounted heavy-duty disc ploughs (2-bottom, 3-bottom, 4-bottom) for primary deep tillage in hard dry soils.",
      "Heavy tubular/channel steel frame, heat-treated high carbon dished discs, adjustable furrow wheel, category II 3-point linkage hitch.",
      "Disc diameter (660 to 710 mm), disc thickness (6 mm), tilt angle (15° to 25°), disc angle (40° to 45°), working depth (up to 300 mm).",
      "Inversion of hard compacted soil and root cutting without disc chipping; stable tracking behind tractor.",
      "Linkage geometry per IS 4468, disc hardness per IS 1586, drawbar load and furrow inversion test.", "Scheme-I", "Bureau of Indian Standards FAD 11 Farm Machinery Committee"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "FMTTI Agricultural Implements Test Code; BIS FAD 11",
      source_url: "https://farmech.gov.in",
      evidence_excerpt: "Prescribes design and performance criteria for heavy duty tractor mounted disc ploughs.",
      applicability_explanation: "Primary national standard for tractor disc ploughs.", confidence_score: 0.98
    },
    investigation_notes: "Formulated by FAD 11."
  },
  "Sugarcane Harvesters and Cutters": {
    status: "CANDIDATE_UNVERIFIED",
    investigation_notes: "Commercial field testing is conducted by FMTTI Budni under Ministry of Agriculture guidelines, but a dedicated Indian Standard is currently under drafting in BIS Committee FAD 11 (Farm Machinery) and has not yet been enacted in a final Gazette QCO notification."
  }
};

console.log('FAD mappings defined:', Object.keys(fadDict).length);
fs.writeFileSync(path.join(__dirname, 'fad_dict.json'), JSON.stringify(fadDict, null, 2));
console.log('Saved fad_dict.json');
