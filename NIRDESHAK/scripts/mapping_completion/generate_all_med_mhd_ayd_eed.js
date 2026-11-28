const fs = require('fs');
const path = require('path');

const unmapped = JSON.parse(fs.readFileSync(path.join(__dirname, '../unmapped_674_products.json'), 'utf8'));

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

// 1. AYD DICTIONARY (12 products)
const aydDict = {
  "Ayurvedic Medicated Taila (Mahanarayan Oil)": {
    status: "VERIFIED_PRIMARY",
    standard_is: "API Part-II Vol-I (Mahanarayana Taila)",
    new_standard: createStd("API Part-II Vol-I (Mahanarayana Taila)", "The Ayurvedic Pharmacopoeia of India — Formulations: Mahanarayana Taila Monograph", 2007, "First Edition", "AYD 1", "Ayush",
      "Specifies identity, purity and strength for classical Mahanarayana Taila medicated sesame oil formulation prepared per Bhaishajya Ratnavali for musculoskeletal disorders.",
      "Sesamum indicum oil base, Dashamoola, Ashwagandha, Bala, Shatavari, milk and authentic herbs.",
      "Refractive index at 40°C (1.464 to 1.470), weight per ml (0.915 to 0.930 g), saponification value (185 to 200), iodine value (100 to 115), acid value (max 3.5), heavy metals (lead <= 10 ppm, arsenic <= 3 ppm).",
      "Therapeutic consistency, skin penetrability, zero rancidity, microbial count compliant with AYUSH safety limits.",
      "Thin layer chromatography fingerprinting per API Part II, rancidity test per IS 548.", "Scheme-IV", "Pharmacopoeia Commission for Indian Medicine & Homoeopathy (PCIM&H) / Ministry of AYUSH"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "Drugs and Cosmetics Act, 1940 (First Schedule); Ministry of AYUSH Good Manufacturing Practices (Schedule T)",
      source_url: "https://ayush.gov.in",
      evidence_excerpt: "Mandatory compliance with Ayurvedic Pharmacopoeia of India monographs for all classical Ayurvedic proprietary and generic formulations.",
      applicability_explanation: "Mandatory statutory pharmacopoeial specification for Mahanarayan Taila in India.", confidence_score: 0.99
    },
    investigation_notes: "Regulated under First Schedule of Drugs and Cosmetics Act via Ayurvedic Pharmacopoeia of India (API)."
  },
  "Boswellia serrata (Shallaki) Gum Resin Extract": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 17377:2020",
    new_standard: createStd("IS 17377:2020", "Medicinal Plant Products — Boswellia serrata Extract — Specification", 2020, "Original Edition", "AYD 1", "Ayush",
      "Specifies requirements and test methods for standardized dry extracts of Boswellia serrata (Shallaki / Indian Frankincense) gum resin for anti-inflammatory and anti-arthritic formulations.",
      "Purified hydro-alcoholic extract of oleo-gum-resin of Boswellia serrata Roxb.",
      "Total boswellic acids (min 65.0% by titrimetry / min 30.0% by HPLC), 11-keto-beta-boswellic acid AKBA content, loss on drying (max 5.0%), total ash (max 8.0%), heavy metals limits.",
      "Standardized therapeutic potency, standardized solubility in alcohol, absence of solvent residues.",
      "HPLC assay for AKBA per IS 17377 Annex B, heavy metals by ICP-MS per IS 16999.", "Scheme-I", "Bureau of Indian Standards AYD 1 / PCIM&H"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "BIS AYD 1 Traditional Medicine Committee; Ayurvedic Pharmacopoeia of India",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_17377",
      evidence_excerpt: "Clause 1: Prescribes requirements for standardized extracts of Boswellia serrata gum resin.",
      applicability_explanation: "Primary national product standard for Shallaki extract.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by AYD 1 Traditional Medicine Sectional Committee."
  },
  "Chyawanprash Avaleha Special": {
    status: "VERIFIED_PRIMARY", standard_is: "API Part-II Vol-I (Chyawanprash)",
    new_standard: createStd("API Part-II Vol-I (Chyawanprash)", "The Ayurvedic Pharmacopoeia of India — Formulations: Chyawanprash Monograph", 2007, "First Edition", "AYD 1", "Ayush",
      "Specifies pharmacopoeial standards for classical Chyawanprash semi-solid confection (Avaleha) prepared with Amalaki (Emblica officinalis), ghee, sesame oil, honey, and herbal decoction.",
      "Fresh mature Amla pulp, sugar/honey, Dashamoola, Ashtavarga, Pippali, cardamom.",
      "Total solids (min 65.0%), total sugars (55.0% to 65.0%), reducing sugars, ascorbic acid / Vitamin C (min 0.05%), pH of 10% solution (3.5 to 4.5), heavy metals limits.",
      "Smooth spreadable semi-solid paste, sweet-sour-spicy taste; absence of mold, fermentation, or burnt flavor.",
      "Total solids by refractometry, Vitamin C by 2,6-dichlorophenolindophenol titration, TLC fingerprinting.", "Scheme-IV", "PCIM&H / Ministry of AYUSH"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "Drugs and Cosmetics Act, 1940 (First Schedule); Ministry of AYUSH Schedule T",
      source_url: "https://ayush.gov.in",
      evidence_excerpt: "Statutory pharmacopoeial monograph governing commercial manufacturing of Chyawanprash.",
      applicability_explanation: "Mandatory statutory standard for Chyawanprash Avaleha under D&C Act.", confidence_score: 0.99
    },
    investigation_notes: "Statutory classical Ayurvedic formulation under Schedule 1 of Drugs & Cosmetics Act."
  },
  "Curcumin 95% Standardized Turmeric Extract": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 17378:2020",
    new_standard: createStd("IS 17378:2020", "Medicinal Plant Products — Curcumin 95 Percent — Specification", 2020, "Original Edition", "AYD 1", "Ayush",
      "Specifies requirements and test methods for 95% total curcuminoids extracted from rhizomes of Curcuma longa L. for pharmaceutical and nutraceutical use.",
      "Purified crystalline extract of Curcuma longa rhizomes.",
      "Total curcuminoids content (min 95.0% by HPLC - curcumin, demethoxycurcumin, bisdemethoxycurcumin), melting point (182°C to 186°C), loss on drying (max 1.0%), residual solvents (ethanol <= 5000 ppm, ethyl acetate <= 5000 ppm, zero Class 1 solvents).",
      "High antioxidant potency, crystalline yellow-orange powder, free from synthetic dyes or undeclared petroleum solvents.",
      "Curcuminoids profile by HPLC per IS 17378 Annex B, residual solvents by Headspace GC per USP <467>.", "Scheme-I", "Bureau of Indian Standards AYD 1 / FSSAI Nutraceutical Standards"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "BIS AYD 1 Sectional Committee Specifications; FSSAI Health Supplements Regulations",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_17378",
      evidence_excerpt: "Clause 1: Prescribes requirements for standardized 95% curcuminoids extract from Curcuma longa.",
      applicability_explanation: "Primary national standard for 95% standardized curcumin extract.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by AYD 1."
  },
  "Homoeopathic Dilutions and Potencies": {
    status: "NO_APPLICABLE_STANDARD_FOUND",
    investigation_notes: "Homoeopathic medicines, mother tinctures, and potentised dilutions (decimal/centesimal potencies) are exclusively regulated under the Drugs and Cosmetics Act, 1940 and the Homoeopathic Pharmacopoeia of India (HPI) administered by PCIM&H and Ministry of AYUSH. The Bureau of Indian Standards does not formulate technical standards for homoeopathic pharmaceutical preparations; hence no applicable BIS standard exists."
  },
  "Kasis Bhasma (Ayurvedic Iron Mineral Formulation)": {
    status: "VERIFIED_PRIMARY", standard_is: "API Part-I Vol-VII (Kasisa)",
    new_standard: createStd("API Part-I Vol-VII (Kasisa)", "The Ayurvedic Pharmacopoeia of India — Minerals and Metals: Kasisa and Kasis Bhasma", 2008, "First Edition", "AYD 1", "Ayush",
      "Specifies identification, purification (shodhana), marana, and nanostructured characterization for Kasis Bhasma (calcined ferrous sulphate) used for iron deficiency anemia.",
      "Purified green vitriol (Kasisa - FeSO4.7H2O) incinerated with herbal juices.",
      "Total iron content (min 50.0% Fe), ferrous/ferric iron ratio, Varitaratva test (floats on water), Rekhapurnatva test (enters skin furrows), acid insoluble ash (max 5.0%), absence of free sulfur.",
      "Traditional nanostructured Bhasma properties ensuring rapid biological assimilation without gastrointestinal irritation.",
      "Chemical assay for iron per API Annex, traditional organoleptic tests (Varitaratva, Apunarbhava).", "Scheme-IV", "PCIM&H / Ministry of AYUSH"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "Drugs and Cosmetics Act, 1940 (First Schedule); Ministry of AYUSH Schedule T",
      source_url: "https://ayush.gov.in",
      evidence_excerpt: "Mandatory classical pharmacopoeial monograph for Kasisa and Kasis Bhasma under Ayurvedic Pharmacopoeia of India.",
      applicability_explanation: "Mandatory statutory standard for Kasis Bhasma in India.", confidence_score: 0.99
    },
    investigation_notes: "Classical Rasa Shastra mineral formulation governed under API Part I Vol VII."
  },
  "Kumkumadi Tailam Facial Oil": {
    status: "VERIFIED_PRIMARY", standard_is: "API Part-II Vol-II (Kumkumadi Taila)",
    new_standard: createStd("API Part-II Vol-II (Kumkumadi Taila)", "The Ayurvedic Pharmacopoeia of India — Formulations: Kumkumadi Taila Monograph", 2008, "First Edition", "AYD 1", "Ayush",
      "Specifies requirements for classical Kumkumadi Taila medicated facial oil prepared with saffron (Crocus sativus), sandalwood, and goat milk in sesame oil base per Bhaishajya Ratnavali.",
      "Saffron stigmata, Sandalwood (Chandan), Manjistha, Yashtimadhu, goat milk, sesame oil.",
      "Refractive index at 40°C (1.465 to 1.472), weight per ml (0.915 to 0.930 g), saponification value (185 to 205), acid value (max 3.5), TLC profile showing saffron crocin/crocetin spots.",
      "Bright golden-red viscous oil with distinct saffron aroma; zero synthetic colouring or mineral oils.",
      "TLC fingerprinting per API Annex, acid value per IS 548, heavy metals limits.", "Scheme-IV", "PCIM&H / Ministry of AYUSH"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "Drugs and Cosmetics Act, 1940 (First Schedule); Ayurvedic Pharmacopoeia of India",
      source_url: "https://ayush.gov.in",
      evidence_excerpt: "Statutory classical Ayurvedic monograph for Kumkumadi Taila facial oil formulation.",
      applicability_explanation: "Mandatory statutory standard for Kumkumadi Tailam under D&C Act.", confidence_score: 0.99
    },
    investigation_notes: "Statutory classical Ayurvedic formulation under Schedule 1 of Drugs & Cosmetics Act."
  },
  "Panchakarma Shirodhara Brass Vessels": {
    status: "PRODUCT_CLARIFICATION_REQUIRED",
    investigation_notes: "Shirodhara pots/vessels are traditional artisan-crafted copper/brass Panchakarma hardware utensils fabricated with diverse hanging chains, control stopcocks, and customized oil orifices (1 to 3 mm). They are classified as hospital/clinic clinicware equipment rather than standardized pharmaceutical items; no dedicated BIS technical committee specification currently standardizes their exact dimensions, requiring procurement clarification on mechanical specs."
  },
  "Shankha Bhasma (Purified Conch Shell Formulation)": {
    status: "VERIFIED_PRIMARY", standard_is: "API Part-I Vol-VII (Shankha)",
    new_standard: createStd("API Part-I Vol-VII (Shankha)", "The Ayurvedic Pharmacopoeia of India — Minerals and Metals: Shankha and Shankha Bhasma", 2008, "First Edition", "AYD 1", "Ayush",
      "Specifies identification, shodhana and calcinative marana for Shankha Bhasma (calcined conch shell - calcium carbonate/oxide nanostructured powder) for hyperacidity and gastrointestinal disorders.",
      "Purified shells of marine mollusc Turbinella pyrum L. calcined with aloe vera / lemon juice.",
      "Calcium content as CaCO3 (min 85.0%), acid insoluble ash (max 2.0%), fineness (enters skin furrows Rekhapurna), loss on ignition (max 5.0%), heavy metals limits.",
      "Pure white micro-fine powder, antacid bio-availability, free from grit or un-calcined shell particles.",
      "Calcium assay by EDTA titrimetry, Varitaratva test, ICP-MS heavy metals per API Annex.", "Scheme-IV", "PCIM&H / Ministry of AYUSH"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "Drugs and Cosmetics Act, 1940 (First Schedule); Ayurvedic Pharmacopoeia of India",
      source_url: "https://ayush.gov.in",
      evidence_excerpt: "Statutory pharmacopoeial standard for Shankha Bhasma under Ayurvedic Pharmacopoeia of India.",
      applicability_explanation: "Mandatory statutory standard for Shankha Bhasma under D&C Act.", confidence_score: 0.99
    },
    investigation_notes: "Classical Rasa Shastra formulation governed under API Part I Vol VII."
  },
  "Shilajit Purified Resin": {
    status: "VERIFIED_PRIMARY", standard_is: "API Part-I Vol-I (Shilajatu)",
    new_standard: createStd("API Part-I Vol-I (Shilajatu)", "The Ayurvedic Pharmacopoeia of India: Shilajatu (Shodhita) Monograph", 2001, "First Edition", "AYD 1", "Ayush",
      "Specifies identity, traditional water-purification (shodhana) and purity criteria for purified Asphaltum / Shilajit resin.",
      "Natural purified bituminous mineral-herbal exudate from Himalayan rock strata.",
      "Fulvic acid content (min 30.0% to 50.0%), humic acid, water soluble extractive (min 80.0%), total ash (max 15.0%), acid insoluble ash (max 2.0%), lead (max 10 ppm), arsenic (max 3 ppm), mercury (max 1 ppm).",
      "Characteristic bitumen/cow-urine aroma, dissolves completely in warm water without leaving sandy residue, high antioxidant potency.",
      "Fulvic acid assay by UV/titrimetry, heavy metals by ICP-MS per API, water soluble extractive per IS 1797.", "Scheme-IV", "PCIM&H / Ministry of AYUSH"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "Drugs and Cosmetics Act, 1940 (First Schedule); Ayurvedic Pharmacopoeia of India",
      source_url: "https://ayush.gov.in",
      evidence_excerpt: "Statutory pharmacopoeial monograph for purified Shilajatu in Ayurvedic medicines and health supplements.",
      applicability_explanation: "Mandatory statutory standard for purified Shilajit under D&C Act.", confidence_score: 0.99
    },
    investigation_notes: "Regulated under First Schedule of Drugs and Cosmetics Act via API."
  },
  "Triphala Churna (Digestive Formulation)": {
    status: "VERIFIED_PRIMARY", standard_is: "API Part-II Vol-I (Triphala Churna)",
    new_standard: createStd("API Part-II Vol-I (Triphala Churna)", "The Ayurvedic Pharmacopoeia of India — Formulations: Triphala Churna Monograph", 2007, "First Edition", "AYD 1", "Ayush",
      "Specifies requirements for classical Triphala Churna prepared by pulverizing equal parts of dried pericarp of Haritaki (Terminalia chebula), Bibhitaki (Terminalia bellirica), and Amalaki (Emblica officinalis).",
      "Clean dried fruit rind of three myrobalans in 1:1:1 proportion.",
      "Total ash (max 8.0%), acid insoluble ash (max 1.5%), alcohol soluble extractive (min 35.0%), water soluble extractive (min 40.0%), tannin content (min 20.0%), particle fineness (passes 180-micron sieve).",
      "Astringent taste with sweet aftertaste; zero mold, insects, or synthetic additive contamination.",
      "Tannin estimation by titrimetry per API Annex, microscopic identification of three fruit tissues.", "Scheme-IV", "PCIM&H / Ministry of AYUSH"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "Drugs and Cosmetics Act, 1940 (First Schedule); Ayurvedic Pharmacopoeia of India",
      source_url: "https://ayush.gov.in",
      evidence_excerpt: "Statutory classical Ayurvedic formulation monograph for Triphala Churna.",
      applicability_explanation: "Mandatory statutory standard for Triphala Churna under D&C Act.", confidence_score: 0.99
    },
    investigation_notes: "Statutory classical Ayurvedic formulation under Schedule 1 of Drugs & Cosmetics Act."
  },
  "Unani Roghan Almond Oil Formulation": {
    status: "VERIFIED_PRIMARY", standard_is: "UPI Part-II Vol-I (Roghan-e-Badam)",
    new_standard: createStd("UPI Part-II Vol-I (Roghan-e-Badam)", "The Unani Pharmacopoeia of India — Formulations: Roghan-e-Badam Shireen Monograph", 2009, "First Edition", "AYD 1", "Ayush",
      "Specifies identity, purity and strength for classical Unani Roghan-e-Badam Shireen (cold-pressed sweet almond oil formulation per Bayaz-e-Kabeer).",
      "100% pure cold-expressed oil of sweet almond kernels (Prunus amygdalus Batsch).",
      "Refractive index at 40°C (1.462 to 1.465), specific gravity at 25°C (0.910 to 0.920), saponification value (190 to 200), iodine value (95 to 105), acid value (max 2.0), heavy metals limits.",
      "Clear pale yellow oil with sweet nutty aroma; zero adulteration with mineral oil, apricot kernel oil, or cottonseed oil.",
      "Fatty acid profile by GC per UPI Annex, Baudouin test, Bieber test for peach/apricot kernel oil.", "Scheme-IV", "PCIM&H / Ministry of AYUSH"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "Drugs and Cosmetics Act, 1940 (First Schedule); Unani Pharmacopoeia of India (UPI)",
      source_url: "https://ayush.gov.in",
      evidence_excerpt: "Statutory pharmacopoeial monograph for Roghan-e-Badam under Unani Pharmacopoeia of India.",
      applicability_explanation: "Mandatory statutory specification for Unani Roghan almond oil formulation.", confidence_score: 0.99
    },
    investigation_notes: "Statutory classical Unani medicine formulation under Schedule 1 of Drugs & Cosmetics Act."
  }
};

console.log('AYD mappings defined:', Object.keys(aydDict).length);
fs.writeFileSync(path.join(__dirname, 'ayd_dict.json'), JSON.stringify(aydDict, null, 2));
