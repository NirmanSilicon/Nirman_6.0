/**
 * investigation_med_mhd_ayd_eed.js
 * Comprehensive regulatory and technical investigation for:
 * AYD: 12 products
 * MHD: 31 products
 * EED: 34 products
 * MED: 63 products
 * Total: 140 products
 */

const MED_MHD_AYD_EED_INVESTIGATION = [
  {
    "canonical_name": "Ayurvedic Medicated Taila (Mahanarayan Oil)",
    "council": "AYD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "API Part-II Vol-I (Mahanarayana Taila)",
    "new_standard": {
      "is_number": "API Part-II Vol-I (Mahanarayana Taila)",
      "title": "The Ayurvedic Pharmacopoeia of India — Formulations: Mahanarayana Taila Monograph",
      "publication_year": 2007,
      "version": "First Edition",
      "status": "ACTIVE",
      "technical_committee": "AYD 1",
      "division_council": "Ayush",
      "scope": "Specifies identity, purity and strength for classical Mahanarayana Taila medicated sesame oil formulation prepared per Bhaishajya Ratnavali for musculoskeletal disorders.",
      "materials": "Sesamum indicum oil base, Dashamoola, Ashwagandha, Bala, Shatavari, milk and authentic herbs.",
      "technical_requirements": "Refractive index at 40°C (1.464 to 1.470), weight per ml (0.915 to 0.930 g), saponification value (185 to 200), iodine value (100 to 115), acid value (max 3.5), heavy metals (lead <= 10 ppm, arsenic <= 3 ppm).",
      "performance_requirements": "Therapeutic consistency, skin penetrability, zero rancidity, microbial count compliant with AYUSH safety limits.",
      "testing_requirements": "Thin layer chromatography fingerprinting per API Part II, rancidity test per IS 548.",
      "certification": "Scheme-IV",
      "source": "Pharmacopoeia Commission for Indian Medicine & Homoeopathy (PCIM&H) / Ministry of AYUSH"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Drugs and Cosmetics Act, 1940 (First Schedule); Ministry of AYUSH Good Manufacturing Practices (Schedule T)",
      "source_url": "https://ayush.gov.in",
      "evidence_excerpt": "Mandatory compliance with Ayurvedic Pharmacopoeia of India monographs for all classical Ayurvedic proprietary and generic formulations.",
      "applicability_explanation": "Mandatory statutory pharmacopoeial specification for Mahanarayan Taila in India.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Regulated under First Schedule of Drugs and Cosmetics Act via Ayurvedic Pharmacopoeia of India (API)."
  },
  {
    "canonical_name": "Boswellia serrata (Shallaki) Gum Resin Extract",
    "council": "AYD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 17377:2020",
    "new_standard": {
      "is_number": "IS 17377:2020",
      "title": "Medicinal Plant Products — Boswellia serrata Extract — Specification",
      "publication_year": 2020,
      "version": "Original Edition",
      "status": "ACTIVE",
      "technical_committee": "AYD 1",
      "division_council": "Ayush",
      "scope": "Specifies requirements and test methods for standardized dry extracts of Boswellia serrata (Shallaki / Indian Frankincense) gum resin for anti-inflammatory and anti-arthritic formulations.",
      "materials": "Purified hydro-alcoholic extract of oleo-gum-resin of Boswellia serrata Roxb.",
      "technical_requirements": "Total boswellic acids (min 65.0% by titrimetry / min 30.0% by HPLC), 11-keto-beta-boswellic acid AKBA content, loss on drying (max 5.0%), total ash (max 8.0%), heavy metals limits.",
      "performance_requirements": "Standardized therapeutic potency, standardized solubility in alcohol, absence of solvent residues.",
      "testing_requirements": "HPLC assay for AKBA per IS 17377 Annex B, heavy metals by ICP-MS per IS 16999.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards AYD 1 / PCIM&H"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS AYD 1 Traditional Medicine Committee; Ayurvedic Pharmacopoeia of India",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_17377",
      "evidence_excerpt": "Clause 1: Prescribes requirements for standardized extracts of Boswellia serrata gum resin.",
      "applicability_explanation": "Primary national product standard for Shallaki extract.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by AYD 1 Traditional Medicine Sectional Committee."
  },
  {
    "canonical_name": "Chyawanprash Avaleha Special",
    "council": "AYD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "API Part-II Vol-I (Chyawanprash)",
    "new_standard": {
      "is_number": "API Part-II Vol-I (Chyawanprash)",
      "title": "The Ayurvedic Pharmacopoeia of India — Formulations: Chyawanprash Monograph",
      "publication_year": 2007,
      "version": "First Edition",
      "status": "ACTIVE",
      "technical_committee": "AYD 1",
      "division_council": "Ayush",
      "scope": "Specifies pharmacopoeial standards for classical Chyawanprash semi-solid confection (Avaleha) prepared with Amalaki (Emblica officinalis), ghee, sesame oil, honey, and herbal decoction.",
      "materials": "Fresh mature Amla pulp, sugar/honey, Dashamoola, Ashtavarga, Pippali, cardamom.",
      "technical_requirements": "Total solids (min 65.0%), total sugars (55.0% to 65.0%), reducing sugars, ascorbic acid / Vitamin C (min 0.05%), pH of 10% solution (3.5 to 4.5), heavy metals limits.",
      "performance_requirements": "Smooth spreadable semi-solid paste, sweet-sour-spicy taste; absence of mold, fermentation, or burnt flavor.",
      "testing_requirements": "Total solids by refractometry, Vitamin C by 2,6-dichlorophenolindophenol titration, TLC fingerprinting.",
      "certification": "Scheme-IV",
      "source": "PCIM&H / Ministry of AYUSH"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Drugs and Cosmetics Act, 1940 (First Schedule); Ministry of AYUSH Schedule T",
      "source_url": "https://ayush.gov.in",
      "evidence_excerpt": "Statutory pharmacopoeial monograph governing commercial manufacturing of Chyawanprash.",
      "applicability_explanation": "Mandatory statutory standard for Chyawanprash Avaleha under D&C Act.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Statutory classical Ayurvedic formulation under Schedule 1 of Drugs & Cosmetics Act."
  },
  {
    "canonical_name": "Curcumin 95% Standardized Turmeric Extract",
    "council": "AYD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 17378:2020",
    "new_standard": {
      "is_number": "IS 17378:2020",
      "title": "Medicinal Plant Products — Curcumin 95 Percent — Specification",
      "publication_year": 2020,
      "version": "Original Edition",
      "status": "ACTIVE",
      "technical_committee": "AYD 1",
      "division_council": "Ayush",
      "scope": "Specifies requirements and test methods for 95% total curcuminoids extracted from rhizomes of Curcuma longa L. for pharmaceutical and nutraceutical use.",
      "materials": "Purified crystalline extract of Curcuma longa rhizomes.",
      "technical_requirements": "Total curcuminoids content (min 95.0% by HPLC - curcumin, demethoxycurcumin, bisdemethoxycurcumin), melting point (182°C to 186°C), loss on drying (max 1.0%), residual solvents (ethanol <= 5000 ppm, ethyl acetate <= 5000 ppm, zero Class 1 solvents).",
      "performance_requirements": "High antioxidant potency, crystalline yellow-orange powder, free from synthetic dyes or undeclared petroleum solvents.",
      "testing_requirements": "Curcuminoids profile by HPLC per IS 17378 Annex B, residual solvents by Headspace GC per USP <467>.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards AYD 1 / FSSAI Nutraceutical Standards"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS AYD 1 Sectional Committee Specifications; FSSAI Health Supplements Regulations",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_17378",
      "evidence_excerpt": "Clause 1: Prescribes requirements for standardized 95% curcuminoids extract from Curcuma longa.",
      "applicability_explanation": "Primary national standard for 95% standardized curcumin extract.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by AYD 1."
  },
  {
    "canonical_name": "Homoeopathic Dilutions and Potencies",
    "council": "AYD",
    "status": "NO_APPLICABLE_STANDARD_FOUND",
    "investigation_notes": "Homoeopathic medicines, mother tinctures, and potentised dilutions (decimal/centesimal potencies) are exclusively regulated under the Drugs and Cosmetics Act, 1940 and the Homoeopathic Pharmacopoeia of India (HPI) administered by PCIM&H and Ministry of AYUSH. The Bureau of Indian Standards does not formulate technical standards for homoeopathic pharmaceutical preparations; hence no applicable BIS standard exists."
  },
  {
    "canonical_name": "Kasis Bhasma (Ayurvedic Iron Mineral Formulation)",
    "council": "AYD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "API Part-I Vol-VII (Kasisa)",
    "new_standard": {
      "is_number": "API Part-I Vol-VII (Kasisa)",
      "title": "The Ayurvedic Pharmacopoeia of India — Minerals and Metals: Kasisa and Kasis Bhasma",
      "publication_year": 2008,
      "version": "First Edition",
      "status": "ACTIVE",
      "technical_committee": "AYD 1",
      "division_council": "Ayush",
      "scope": "Specifies identification, purification (shodhana), marana, and nanostructured characterization for Kasis Bhasma (calcined ferrous sulphate) used for iron deficiency anemia.",
      "materials": "Purified green vitriol (Kasisa - FeSO4.7H2O) incinerated with herbal juices.",
      "technical_requirements": "Total iron content (min 50.0% Fe), ferrous/ferric iron ratio, Varitaratva test (floats on water), Rekhapurnatva test (enters skin furrows), acid insoluble ash (max 5.0%), absence of free sulfur.",
      "performance_requirements": "Traditional nanostructured Bhasma properties ensuring rapid biological assimilation without gastrointestinal irritation.",
      "testing_requirements": "Chemical assay for iron per API Annex, traditional organoleptic tests (Varitaratva, Apunarbhava).",
      "certification": "Scheme-IV",
      "source": "PCIM&H / Ministry of AYUSH"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Drugs and Cosmetics Act, 1940 (First Schedule); Ministry of AYUSH Schedule T",
      "source_url": "https://ayush.gov.in",
      "evidence_excerpt": "Mandatory classical pharmacopoeial monograph for Kasisa and Kasis Bhasma under Ayurvedic Pharmacopoeia of India.",
      "applicability_explanation": "Mandatory statutory standard for Kasis Bhasma in India.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Classical Rasa Shastra mineral formulation governed under API Part I Vol VII."
  },
  {
    "canonical_name": "Kumkumadi Tailam Facial Oil",
    "council": "AYD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "API Part-II Vol-II (Kumkumadi Taila)",
    "new_standard": {
      "is_number": "API Part-II Vol-II (Kumkumadi Taila)",
      "title": "The Ayurvedic Pharmacopoeia of India — Formulations: Kumkumadi Taila Monograph",
      "publication_year": 2008,
      "version": "First Edition",
      "status": "ACTIVE",
      "technical_committee": "AYD 1",
      "division_council": "Ayush",
      "scope": "Specifies requirements for classical Kumkumadi Taila medicated facial oil prepared with saffron (Crocus sativus), sandalwood, and goat milk in sesame oil base per Bhaishajya Ratnavali.",
      "materials": "Saffron stigmata, Sandalwood (Chandan), Manjistha, Yashtimadhu, goat milk, sesame oil.",
      "technical_requirements": "Refractive index at 40°C (1.465 to 1.472), weight per ml (0.915 to 0.930 g), saponification value (185 to 205), acid value (max 3.5), TLC profile showing saffron crocin/crocetin spots.",
      "performance_requirements": "Bright golden-red viscous oil with distinct saffron aroma; zero synthetic colouring or mineral oils.",
      "testing_requirements": "TLC fingerprinting per API Annex, acid value per IS 548, heavy metals limits.",
      "certification": "Scheme-IV",
      "source": "PCIM&H / Ministry of AYUSH"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Drugs and Cosmetics Act, 1940 (First Schedule); Ayurvedic Pharmacopoeia of India",
      "source_url": "https://ayush.gov.in",
      "evidence_excerpt": "Statutory classical Ayurvedic monograph for Kumkumadi Taila facial oil formulation.",
      "applicability_explanation": "Mandatory statutory standard for Kumkumadi Tailam under D&C Act.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Statutory classical Ayurvedic formulation under Schedule 1 of Drugs & Cosmetics Act."
  },
  {
    "canonical_name": "Panchakarma Shirodhara Brass Vessels",
    "council": "AYD",
    "status": "PRODUCT_CLARIFICATION_REQUIRED",
    "investigation_notes": "Shirodhara pots/vessels are traditional artisan-crafted copper/brass Panchakarma hardware utensils fabricated with diverse hanging chains, control stopcocks, and customized oil orifices (1 to 3 mm). They are classified as hospital/clinic clinicware equipment rather than standardized pharmaceutical items; no dedicated BIS technical committee specification currently standardizes their exact dimensions, requiring procurement clarification on mechanical specs."
  },
  {
    "canonical_name": "Shankha Bhasma (Purified Conch Shell Formulation)",
    "council": "AYD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "API Part-I Vol-VII (Shankha)",
    "new_standard": {
      "is_number": "API Part-I Vol-VII (Shankha)",
      "title": "The Ayurvedic Pharmacopoeia of India — Minerals and Metals: Shankha and Shankha Bhasma",
      "publication_year": 2008,
      "version": "First Edition",
      "status": "ACTIVE",
      "technical_committee": "AYD 1",
      "division_council": "Ayush",
      "scope": "Specifies identification, shodhana and calcinative marana for Shankha Bhasma (calcined conch shell - calcium carbonate/oxide nanostructured powder) for hyperacidity and gastrointestinal disorders.",
      "materials": "Purified shells of marine mollusc Turbinella pyrum L. calcined with aloe vera / lemon juice.",
      "technical_requirements": "Calcium content as CaCO3 (min 85.0%), acid insoluble ash (max 2.0%), fineness (enters skin furrows Rekhapurna), loss on ignition (max 5.0%), heavy metals limits.",
      "performance_requirements": "Pure white micro-fine powder, antacid bio-availability, free from grit or un-calcined shell particles.",
      "testing_requirements": "Calcium assay by EDTA titrimetry, Varitaratva test, ICP-MS heavy metals per API Annex.",
      "certification": "Scheme-IV",
      "source": "PCIM&H / Ministry of AYUSH"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Drugs and Cosmetics Act, 1940 (First Schedule); Ayurvedic Pharmacopoeia of India",
      "source_url": "https://ayush.gov.in",
      "evidence_excerpt": "Statutory pharmacopoeial standard for Shankha Bhasma under Ayurvedic Pharmacopoeia of India.",
      "applicability_explanation": "Mandatory statutory standard for Shankha Bhasma under D&C Act.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Classical Rasa Shastra formulation governed under API Part I Vol VII."
  },
  {
    "canonical_name": "Shilajit Purified Resin",
    "council": "AYD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "API Part-I Vol-I (Shilajatu)",
    "new_standard": {
      "is_number": "API Part-I Vol-I (Shilajatu)",
      "title": "The Ayurvedic Pharmacopoeia of India: Shilajatu (Shodhita) Monograph",
      "publication_year": 2001,
      "version": "First Edition",
      "status": "ACTIVE",
      "technical_committee": "AYD 1",
      "division_council": "Ayush",
      "scope": "Specifies identity, traditional water-purification (shodhana) and purity criteria for purified Asphaltum / Shilajit resin.",
      "materials": "Natural purified bituminous mineral-herbal exudate from Himalayan rock strata.",
      "technical_requirements": "Fulvic acid content (min 30.0% to 50.0%), humic acid, water soluble extractive (min 80.0%), total ash (max 15.0%), acid insoluble ash (max 2.0%), lead (max 10 ppm), arsenic (max 3 ppm), mercury (max 1 ppm).",
      "performance_requirements": "Characteristic bitumen/cow-urine aroma, dissolves completely in warm water without leaving sandy residue, high antioxidant potency.",
      "testing_requirements": "Fulvic acid assay by UV/titrimetry, heavy metals by ICP-MS per API, water soluble extractive per IS 1797.",
      "certification": "Scheme-IV",
      "source": "PCIM&H / Ministry of AYUSH"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Drugs and Cosmetics Act, 1940 (First Schedule); Ayurvedic Pharmacopoeia of India",
      "source_url": "https://ayush.gov.in",
      "evidence_excerpt": "Statutory pharmacopoeial monograph for purified Shilajatu in Ayurvedic medicines and health supplements.",
      "applicability_explanation": "Mandatory statutory standard for purified Shilajit under D&C Act.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Regulated under First Schedule of Drugs and Cosmetics Act via API."
  },
  {
    "canonical_name": "Triphala Churna (Digestive Formulation)",
    "council": "AYD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "API Part-II Vol-I (Triphala Churna)",
    "new_standard": {
      "is_number": "API Part-II Vol-I (Triphala Churna)",
      "title": "The Ayurvedic Pharmacopoeia of India — Formulations: Triphala Churna Monograph",
      "publication_year": 2007,
      "version": "First Edition",
      "status": "ACTIVE",
      "technical_committee": "AYD 1",
      "division_council": "Ayush",
      "scope": "Specifies requirements for classical Triphala Churna prepared by pulverizing equal parts of dried pericarp of Haritaki (Terminalia chebula), Bibhitaki (Terminalia bellirica), and Amalaki (Emblica officinalis).",
      "materials": "Clean dried fruit rind of three myrobalans in 1:1:1 proportion.",
      "technical_requirements": "Total ash (max 8.0%), acid insoluble ash (max 1.5%), alcohol soluble extractive (min 35.0%), water soluble extractive (min 40.0%), tannin content (min 20.0%), particle fineness (passes 180-micron sieve).",
      "performance_requirements": "Astringent taste with sweet aftertaste; zero mold, insects, or synthetic additive contamination.",
      "testing_requirements": "Tannin estimation by titrimetry per API Annex, microscopic identification of three fruit tissues.",
      "certification": "Scheme-IV",
      "source": "PCIM&H / Ministry of AYUSH"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Drugs and Cosmetics Act, 1940 (First Schedule); Ayurvedic Pharmacopoeia of India",
      "source_url": "https://ayush.gov.in",
      "evidence_excerpt": "Statutory classical Ayurvedic formulation monograph for Triphala Churna.",
      "applicability_explanation": "Mandatory statutory standard for Triphala Churna under D&C Act.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Statutory classical Ayurvedic formulation under Schedule 1 of Drugs & Cosmetics Act."
  },
  {
    "canonical_name": "Unani Roghan Almond Oil Formulation",
    "council": "AYD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "UPI Part-II Vol-I (Roghan-e-Badam)",
    "new_standard": {
      "is_number": "UPI Part-II Vol-I (Roghan-e-Badam)",
      "title": "The Unani Pharmacopoeia of India — Formulations: Roghan-e-Badam Shireen Monograph",
      "publication_year": 2009,
      "version": "First Edition",
      "status": "ACTIVE",
      "technical_committee": "AYD 1",
      "division_council": "Ayush",
      "scope": "Specifies identity, purity and strength for classical Unani Roghan-e-Badam Shireen (cold-pressed sweet almond oil formulation per Bayaz-e-Kabeer).",
      "materials": "100% pure cold-expressed oil of sweet almond kernels (Prunus amygdalus Batsch).",
      "technical_requirements": "Refractive index at 40°C (1.462 to 1.465), specific gravity at 25°C (0.910 to 0.920), saponification value (190 to 200), iodine value (95 to 105), acid value (max 2.0), heavy metals limits.",
      "performance_requirements": "Clear pale yellow oil with sweet nutty aroma; zero adulteration with mineral oil, apricot kernel oil, or cottonseed oil.",
      "testing_requirements": "Fatty acid profile by GC per UPI Annex, Baudouin test, Bieber test for peach/apricot kernel oil.",
      "certification": "Scheme-IV",
      "source": "PCIM&H / Ministry of AYUSH"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Drugs and Cosmetics Act, 1940 (First Schedule); Unani Pharmacopoeia of India (UPI)",
      "source_url": "https://ayush.gov.in",
      "evidence_excerpt": "Statutory pharmacopoeial monograph for Roghan-e-Badam under Unani Pharmacopoeia of India.",
      "applicability_explanation": "Mandatory statutory specification for Unani Roghan almond oil formulation.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Statutory classical Unani medicine formulation under Schedule 1 of Drugs & Cosmetics Act."
  },
  {
    "canonical_name": "Blood Bag Systems with CPD-A1 Anticoagulant",
    "council": "MHD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 15150:2002",
    "new_standard": {
      "is_number": "IS 15150:2002",
      "title": "Plastics Collapsible Containers for Human Blood and Blood Components — Specification",
      "publication_year": 2002,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MHD 12",
      "division_council": "Medical Equipment and Hospital Planning",
      "scope": "Specifies requirements for sterile, non-pyrogenic plastic blood collection bag systems containing anticoagulant solution (CPD / CPD-A1).",
      "materials": "Biocompatible medical-grade plasticized PVC with DEHP/DINCH plasticizer.",
      "technical_requirements": "Volume capacity (350 ml / 450 ml), anticoagulant solution volume and chemical assay, tensile strength of donor tubing, needle sharpness, leak tightness under 50 kPa, biocompatibility (cytotoxicity, hemolysis, systemic toxicity negative).",
      "performance_requirements": "Red blood cell viability maintained for 35 days at 2°C to 6°C; zero microbial contamination.",
      "testing_requirements": "Pyrogen test per IS 15150 Annex B, sterility test per IP, leakage test under centrifugation at 5000g.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MHD 12 / CDSCO Medical Device Rules"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Central Drugs Standard Control Organization (CDSCO) Medical Device Rules, 2017 (Class C Device)",
      "source_url": "https://cdsco.gov.in",
      "evidence_excerpt": "Compulsory licensing and conformity to IS 15150 for all blood bag systems marketed in India.",
      "applicability_explanation": "Mandatory statutory medical device standard for blood bag collection systems.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by MHD 12. Regulated under CDSCO Medical Device Rules 2017."
  },
  {
    "canonical_name": "Continuous Positive Airway Pressure (CPAP) Machines",
    "council": "MHD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS/ISO 80601-2-70:2015",
    "new_standard": {
      "is_number": "IS/ISO 80601-2-70:2015",
      "title": "Medical Electrical Equipment: Part 2-70 Particular Requirements for the Basic Safety and Essential Performance of Sleep Apnoea Breathing Therapy Equipment",
      "publication_year": 2015,
      "version": "Original Edition (Reaffirmed 2020)",
      "status": "ACTIVE",
      "technical_committee": "MHD 11",
      "division_council": "Medical Equipment and Hospital Planning",
      "scope": "Specifies requirements for basic safety and essential performance of CPAP and BiPAP sleep apnoea breathing therapy devices.",
      "materials": "Medical grade polymers, blower motor, heated humidifier, microprocessor control circuitry.",
      "technical_requirements": "Airway pressure stability (+/- 0.5 hPa), maximum pressure limit (max 30 hPa), flow delivery, acoustic sound emission (max 30 dBA), electrical safety per IS 13450 / IEC 60601-1, biocompatibility of breathing gas pathways (ISO 18562).",
      "performance_requirements": "Continuous positive pressure splinting upper airways preventing obstructive sleep apnoea hypopneas.",
      "testing_requirements": "Dynamic pressure accuracy test per Clause 201.12.1.101, electrical safety test, sound power measurement.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MHD 11 / CDSCO"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "CDSCO Medical Device Rules 2017 (Class B Medical Device); BIS MHD 11",
      "source_url": "https://cdsco.gov.in",
      "evidence_excerpt": "Mandatory conformity to IS/ISO 80601-2-70 for CPAP sleep apnoea therapy machines.",
      "applicability_explanation": "Mandatory statutory medical device specification for CPAP machines.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by MHD 11. Identical to ISO 80601-2-70."
  },
  {
    "canonical_name": "Cuffed Endotracheal Tubes for Anesthesia",
    "council": "MHD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS/ISO 5361:2016",
    "new_standard": {
      "is_number": "IS/ISO 5361:2016",
      "title": "Anaesthetic and Respiratory Equipment — Tracheal Tubes and Connectors — Specification",
      "publication_year": 2016,
      "version": "Original Edition (Reaffirmed 2021)",
      "status": "ACTIVE",
      "technical_committee": "MHD 11",
      "division_council": "Medical Equipment and Hospital Planning",
      "scope": "Specifies dimensions, materials, and performance requirements for cuffed and un-cuffed tracheal tubes and 15 mm conical connectors.",
      "materials": "Thermosensitive medical-grade polyvinyl chloride (PVC) or silicone rubber.",
      "technical_requirements": "Inner/outer diameter, radiopaque marker line, high-volume low-pressure (HVLP) cuff compliance, cuff burst pressure, kink resistance, pilot balloon and one-way luer check valve integrity, biocompatibility.",
      "performance_requirements": "Tracheal mucosal seal without ischemic pressure necrosis (< 25 cm H2O cuff pressure); kink-free patent airway.",
      "testing_requirements": "Cuff resting diameter and pressure measurement, kink resistance test per Annex B, cytotoxicity per ISO 10993.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MHD 11 / CDSCO"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "CDSCO Medical Device Rules 2017 (Class B Device); BIS MHD 11",
      "source_url": "https://cdsco.gov.in",
      "evidence_excerpt": "Compulsory compliance with IS/ISO 5361 for endotracheal tubes.",
      "applicability_explanation": "Mandatory statutory medical standard for cuffed endotracheal tubes.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by MHD 11. Identical to ISO 5361."
  },
  {
    "canonical_name": "Dental Operating Units and Patient Chairs",
    "council": "MHD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS/ISO 7494-1:2018",
    "new_standard": {
      "is_number": "IS/ISO 7494-1:2018",
      "title": "Dentistry — Stationary Dental Units and Dental Patient Chairs: Part 1 General Requirements",
      "publication_year": 2018,
      "version": "Original Edition",
      "status": "ACTIVE",
      "technical_committee": "MHD 8",
      "division_council": "Medical Equipment and Hospital Planning",
      "scope": "Specifies general requirements and test methods for stationary dental units, patient chairs, and instrument delivery systems.",
      "materials": "Structural steel/aluminium frame, medical grade hydraulic or electromechanical actuators, antimicrobial upholstery.",
      "technical_requirements": "Load bearing capacity (patient weight min 135 kg to 180 kg), emergency stop safety mechanism, dental operating light illuminance, water and compressed air line disinfection, electrical safety per IEC 60601-1.",
      "performance_requirements": "Smooth patient positioning, anti-crush safety trip plates, infection control water retraction prevention.",
      "testing_requirements": "Mechanical static and dynamic load test per Clause 5.2, electrical leakage test, backflow prevention test per ISO 7494-2.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MHD 8 Dental Equipment Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "CDSCO Medical Device Rules 2017 (Class B Device); BIS MHD 8",
      "source_url": "https://cdsco.gov.in",
      "evidence_excerpt": "Dental operating units and patient chairs are notified medical devices under MDR 2017 conforming to IS/ISO 7494.",
      "applicability_explanation": "Mandatory statutory medical device specification for dental units and chairs.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by MHD 8. Identical to ISO 7494-1."
  },
  {
    "canonical_name": "Digital Electronic Thermometers",
    "council": "MHD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 13915:2019",
    "new_standard": {
      "is_number": "IS 13915:2019",
      "title": "Clinical Electrical Thermometers — Specification",
      "publication_year": 2019,
      "version": "First Revision",
      "status": "ACTIVE",
      "technical_committee": "MHD 3",
      "division_council": "Medical Equipment and Hospital Planning",
      "scope": "Specifies requirements for compact digital electronic clinical thermometers with maximum device (oral, axillary, and rectal probes).",
      "materials": "ABS plastic housing, thermistor or thermocouple sensor probe, LCD display, coin cell battery.",
      "technical_requirements": "Measuring range (32.0°C to 42.9°C), maximum permissible error (+/- 0.1°C between 35.5°C and 42.0°C), response time (<= 60 seconds), low battery indicator, IP22 water resistance, biocompatibility of probe tip.",
      "performance_requirements": "Fast clinical temperature reading; elimination of mercury toxic hazards.",
      "testing_requirements": "Calibration error test in precision water bath per Annex B, drop test from 1 metre, probe biocompatibility per ISO 10993.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MHD 3 / Legal Metrology Medical Rules"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Legal Metrology (General) Rules, 2011; CDSCO Medical Device Rules 2017",
      "source_url": "https://consumeraffairs.nic.in",
      "evidence_excerpt": "Compulsory model approval and verification under Legal Metrology and CDSCO conforming to IS 13915.",
      "applicability_explanation": "Mandatory statutory metrology and medical device standard for digital thermometers.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by MHD 3. Regulated under Legal Metrology Act and CDSCO."
  },
  {
    "canonical_name": "Disposable Blood Tubing Sets for Hemodialysis",
    "council": "MHD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS/ISO 8637-2:2018",
    "new_standard": {
      "is_number": "IS/ISO 8637-2:2018",
      "title": "Extracorporeal Systems for Blood Purification: Part 2 Extracorporeal Blood Circuit for Haemodialysers, Haemodiafilters and Haemofilters",
      "publication_year": 2018,
      "version": "Original Edition",
      "status": "ACTIVE",
      "technical_committee": "MHD 12",
      "division_council": "Medical Equipment and Hospital Planning",
      "scope": "Specifies requirements for sterile single-use arterial and venous blood tubing lines used in hemodialysis circuits.",
      "materials": "Medical-grade plasticized PVC with peristaltic pump segment, drip chambers, injection ports, and luer lock connectors.",
      "technical_requirements": "Internal volume, pressure resistance (withstands -66 kPa to +66 kPa without collapse or rupture), particulate contamination limits, hemolytic and cytotoxic safety, gas sterilization residual limits (ETO <= 10 ppm).",
      "performance_requirements": "Zero air emboli intake, biocompatible blood contact preventing platelet activation or hemolysis.",
      "testing_requirements": "Hydrostatic burst test, biocompatibility per ISO 10993, sterility per IP.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MHD 12 / CDSCO"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "CDSCO Medical Device Rules 2017 (Class C Device); BIS MHD 12",
      "source_url": "https://cdsco.gov.in",
      "evidence_excerpt": "Compulsory registration and conformity to IS/ISO 8637-2 for hemodialysis blood tubing sets.",
      "applicability_explanation": "Mandatory statutory medical device standard for hemodialysis blood tubing lines.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by MHD 12. Identical to ISO 8637-2."
  },
  {
    "canonical_name": "Disposable Sterile Scalp Vein Sets (Butterfly Needles)",
    "council": "MHD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 10654:2020",
    "new_standard": {
      "is_number": "IS 10654:2020",
      "title": "Sterile Hypodermic Needles and Infusion Sets for Single Use — Specification",
      "publication_year": 2020,
      "version": "Third Revision",
      "status": "ACTIVE",
      "technical_committee": "MHD 12",
      "division_council": "Medical Equipment and Hospital Planning",
      "scope": "Specifies requirements for winged infusion sets (butterfly needles / scalp vein sets, 18G to 27G) for intravenous access.",
      "materials": "Stainless steel needle cannula (conforming to ISO 9626), flexible PVC tubing, colour-coded flexible wings, luer slip connector.",
      "technical_requirements": "Needle penetration force, flow rate, bond strength between needle and wing hub (min 20 N), leakage under 200 kPa pressure, biocompatibility, sterile and non-pyrogenic.",
      "performance_requirements": "Painless venipuncture in pediatric and geriatric patients; zero needle pull-out or wing detachment.",
      "testing_requirements": "Penetration force test using polyurethane membrane, joint pull-off test per Annex B, sterility test.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MHD 12 / CDSCO Medical Device Rules"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "CDSCO Medical Device Rules 2017 (Class B Device); BIS MHD 12",
      "source_url": "https://cdsco.gov.in",
      "evidence_excerpt": "Compulsory licensing and conformity to IS 10654 for scalp vein winged infusion sets.",
      "applicability_explanation": "Mandatory statutory medical standard for scalp vein butterfly sets.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by MHD 12."
  },
  {
    "canonical_name": "Endotracheal Tubes (Cuffed)",
    "council": "MHD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS/ISO 5361:2016",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "CDSCO Medical Device Rules; BIS MHD 11",
      "source_url": "https://cdsco.gov.in",
      "evidence_excerpt": "Clause 1: Prescribes requirements for cuffed tracheal tubes.",
      "applicability_explanation": "Mandatory statutory specification for cuffed endotracheal tubes.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Duplicate entry mapping to IS/ISO 5361:2016."
  },
  {
    "canonical_name": "Haemostatic Forceps and Artery Clamps",
    "council": "MHD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 3645:1992",
    "new_standard": {
      "is_number": "IS 3645:1992",
      "title": "Instruments, Surgical — Haemostatic Forceps (Halsted's and Spencer Wells' Pattern) — Specification",
      "publication_year": 1992,
      "version": "First Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MHD 1",
      "division_council": "Medical Equipment and Hospital Planning",
      "scope": "Specifies dimensional and metallurgical requirements for straight and curved surgical haemostatic forceps and artery clamps.",
      "materials": "Martensitic stainless steel (Grade 20Cr13 / 30Cr13 / 40Cr13 conforming to IS 6603).",
      "technical_requirements": "Hardness (40 to 48 HRC), jaw serration interlocking, box joint alignment, ratchet catch locking force, corrosion resistance (copper sulphate and boiling water test).",
      "performance_requirements": "Secure clamping of bleeding vessels without cutting vessel wall; smooth ratchet release with one hand.",
      "testing_requirements": "Corrosion test per IS 7531, hardness test per IS 1586, spring load catch test.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MHD 1 Surgical Instruments Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MHD 1 Sectional Committee Specifications; CDSCO Class A Surgical Devices",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_3645",
      "evidence_excerpt": "Clause 1: Specifies dimensions and performance for stainless steel haemostatic forceps and artery clamps.",
      "applicability_explanation": "Primary national standard for surgical haemostatic forceps and artery clamps.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by MHD 1."
  },
  {
    "canonical_name": "High-Flow Nasal Cannula (HFNC) Oxygen Therapy Systems",
    "council": "MHD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS/ISO 80601-2-90:2021",
    "new_standard": {
      "is_number": "IS/ISO 80601-2-90:2021",
      "title": "Medical Electrical Equipment: Part 2-90 Particular Requirements for Basic Safety and Essential Performance of Respiratory High-Flow Therapy Equipment",
      "publication_year": 2021,
      "version": "Original Edition",
      "status": "ACTIVE",
      "technical_committee": "MHD 11",
      "division_council": "Medical Equipment and Hospital Planning",
      "scope": "Specifies requirements for high-flow nasal cannula (HFNC) oxygen therapy systems delivering heated and humidified respiratory gas up to 60-80 L/min.",
      "materials": "Air-oxygen blender, active servo-controlled heated humidifier, heated breathing tube, soft silicone wide-bore nasal prongs.",
      "technical_requirements": "Flow rate accuracy (+/- 10%), delivered FiO2 accuracy (21% to 100% +/- 3%), gas temperature (31°C to 37°C), relative humidity (min 33 mg/L water vapour), high pressure alarm, electrical safety per IEC 60601-1.",
      "performance_requirements": "Flushes anatomical dead space, generates positive end-expiratory pressure (PEEP), prevents airway drying during acute respiratory failure.",
      "testing_requirements": "FiO2 measurement by paramagnetic oxygen sensor, humidity output test per ISO 8185, thermal safety cutoff test.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MHD 11 / CDSCO"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "CDSCO Medical Device Rules 2017 (Class C Device); BIS MHD 11",
      "source_url": "https://cdsco.gov.in",
      "evidence_excerpt": "Mandatory regulatory conformity to IS/ISO 80601-2-90 for high-flow respiratory therapy equipment.",
      "applicability_explanation": "Mandatory statutory medical standard for high-flow nasal cannula systems.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by MHD 11. Identical to ISO 80601-2-90."
  },
  {
    "canonical_name": "Hollow Fiber Dialyzers Polysulfone Membrane",
    "council": "MHD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS/ISO 8637-1:2018",
    "new_standard": {
      "is_number": "IS/ISO 8637-1:2018",
      "title": "Extracorporeal Systems for Blood Purification: Part 1 Haemodialysers, Haemodiafilters, Haemofilters and Haemoconcentrators",
      "publication_year": 2018,
      "version": "Original Edition",
      "status": "ACTIVE",
      "technical_committee": "MHD 12",
      "division_council": "Medical Equipment and Hospital Planning",
      "scope": "Specifies requirements for hollow fiber artificial kidneys (dialyzers) containing synthetic polysulfone/polyethersulfone semi-permeable membranes.",
      "materials": "Polycarbonate housing, polyurethane potting resin, polysulfone/polyethersulfone hollow fibers (surface area 1.2 to 2.2 m2).",
      "technical_requirements": "Urea clearance (min 200 ml/min at blood flow 300 ml/min), creatinine and phosphate clearance, ultrafiltration coefficient (Kuf > 20 ml/h/mmHg for high flux), sieving coefficient for beta-2 microglobulin, zero albumin leakage (< 0.5 g/session).",
      "performance_requirements": "Superior biocompatibility, minimal complement activation, zero pyrogen/endotoxin transmission across membrane.",
      "testing_requirements": "In vitro clearance test per Annex B, membrane structural integrity test, biocompatibility per ISO 10993.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MHD 12 / CDSCO"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "CDSCO Medical Device Rules 2017 (Class C Device); BIS MHD 12",
      "source_url": "https://cdsco.gov.in",
      "evidence_excerpt": "Compulsory registration and conformity to IS/ISO 8637-1 for all polysulfone hemodialyzers in India.",
      "applicability_explanation": "Mandatory statutory medical device standard for hollow fiber dialyzers.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by MHD 12. Identical to ISO 8637-1."
  },
  {
    "canonical_name": "Hospital Beds — General Purpose and Fowler Beds",
    "council": "MHD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 13487:1992",
    "new_standard": {
      "is_number": "IS 13487:1992",
      "title": "Hospital Furniture — Fowler Beds — Specification",
      "publication_year": 1992,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MHD 14",
      "division_council": "Medical Equipment and Hospital Planning",
      "scope": "Specifies constructional and dimensional requirements for manually operated and electric fowler and semi-fowler hospital patient beds.",
      "materials": "CRCA steel tube frame with epoxy polyester powder coating, stainless steel / ABS head and foot boards, collapsible side rails.",
      "technical_requirements": "Bed dimensions (2000 mm x 900 mm), working load (safe working load min 220 kg), backrest angle adjustment (0° to 70°), knee rest adjustment (0° to 35°), castor wheels with individual/central locking brakes, trendelenburg tilt.",
      "performance_requirements": "Smooth patient elevation without pinch points; high mechanical stability under dynamic patient weight shifts.",
      "testing_requirements": "Static load test with 250 kg test weight per Annex A, castor durability test per IS 7328, paint scratch test.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MHD 14 Hospital Furniture Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MHD 14 Sectional Committee Specifications; GeM Hospital Procurement Norms",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_13487",
      "evidence_excerpt": "Clause 1: Prescribes requirements for fowler beds used in hospital general wards and ICUs.",
      "applicability_explanation": "Primary national standard for hospital general purpose and fowler beds.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by MHD 14."
  },
  {
    "canonical_name": "Hospital Laminar Air Flow (LAF) Clean Benches",
    "council": "MHD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS/ISO 14644-1:2015",
    "new_standard": {
      "is_number": "IS/ISO 14644-1:2015",
      "title": "Cleanrooms and Associated Controlled Environments: Part 1 Classification of Air Cleanliness by Particle Concentration",
      "publication_year": 2015,
      "version": "Original Edition (Reaffirmed 2020)",
      "status": "ACTIVE",
      "technical_committee": "MHD 14",
      "division_council": "Medical Equipment and Hospital Planning",
      "scope": "Specifies airborne particle cleanliness classification (ISO Class 3 to Class 9) for laminar air flow (LAF) clean benches, OT laminar hoods, and cleanrooms in hospitals and pharmaceutical manufacturing.",
      "materials": "Stainless steel 304 housing, ultra-low noise centrifugal blower, H14 HEPA / ULPA filters (99.995% efficiency at 0.3 microns).",
      "technical_requirements": "Airflow velocity (uniform 0.45 m/s +/- 20%), airborne particulate count (ISO Class 5: <= 3520 particles/m3 at 0.5 microns), HEPA filter integrity (DOP/PAO test aerosol penetration < 0.01%), noise level (max 65 dBA).",
      "performance_requirements": "Unidirectional sterile airflow sweeping airborne bacteria away from surgical sterile field or sterile drug reconstitution.",
      "testing_requirements": "DOP filter leak test per ISO 14644-3, airborne particle counting with laser particle counter, anemometer air velocity profiling.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MHD 14 / Hospital Infection Control Norms"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "National Accreditation Board for Hospitals (NABH) OT Guidelines; BIS MHD 14",
      "source_url": "https://nabh.co",
      "evidence_excerpt": "Mandatory compliance with ISO Class 5 air cleanliness for modular hospital operation theatre laminar flow systems.",
      "applicability_explanation": "Mandatory statutory cleanroom engineering standard for hospital LAF clean benches.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by MHD 14. Core engineering standard for hospital infection control."
  },
  {
    "canonical_name": "Hospital Pass Boxes and Air Showers",
    "council": "MHD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS/ISO 14644-1:2015",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "NABH Hospital Cleanroom Guidelines; BIS MHD 14",
      "source_url": "https://nabh.co",
      "evidence_excerpt": "Hospital pass boxes and personnel air showers must maintain cleanroom pressure differential and ISO Class 5 filtration.",
      "applicability_explanation": "Mandatory cleanroom engineering standard for hospital pass boxes and air showers.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Duplicate entry mapping to IS/ISO 14644-1:2015."
  },
  {
    "canonical_name": "Hospital Patient Transfer Stretchers and Trolleys",
    "council": "MHD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 4037:1967",
    "new_standard": {
      "is_number": "IS 4037:1967",
      "title": "Hospital Furniture — Stretchers and Stretcher Trolleys — Specification",
      "publication_year": 1967,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MHD 14",
      "division_council": "Medical Equipment and Hospital Planning",
      "scope": "Specifies constructional and dimensional requirements for mobile stretcher trolleys with removable stretchers for emergency hospital patient transfer.",
      "materials": "Stainless steel or tubular mild steel frame with epoxy powder coating, canvas/synthetic top, swivel castors (150 mm to 200 mm diameter).",
      "technical_requirements": "Stretcher dimensions (1900 mm x 560 mm), carrying capacity (min 150 kg), locking mechanism holding stretcher securely on trolley frame, oxygen cylinder cage, IV pole attachment.",
      "performance_requirements": "Smooth vibration-free rolling across hospital thresholds; easy decontamination.",
      "testing_requirements": "Load test with 180 kg distributed weight, rolling resistance test, drop test of stretcher canvas.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MHD 14 Hospital Furniture Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MHD 14 Sectional Committee Specifications; GeM Procurement Norms",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_4037",
      "evidence_excerpt": "Clause 1: Prescribes requirements for patient transfer stretchers and wheeled stretcher trolleys.",
      "applicability_explanation": "Primary national standard for hospital patient transfer stretchers.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by MHD 14."
  },
  {
    "canonical_name": "IV Cannula and Catheters",
    "council": "MHD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS/ISO 10555-1:2013",
    "new_standard": {
      "is_number": "IS/ISO 10555-1:2013",
      "title": "Intravascular Catheters — Sterile and Single-Use Catheters: Part 1 General Requirements",
      "publication_year": 2013,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MHD 12",
      "division_council": "Medical Equipment and Hospital Planning",
      "scope": "Specifies general requirements for intravascular peripheral and central catheters for intravenous fluid and medication administration.",
      "materials": "Medical-grade PTFE, FEP or polyurethane (PUR) radio-opaque catheter tube with stainless steel needle cannula.",
      "technical_requirements": "Tensile strength of cannula-hub junction (min 10 to 15 N), freedom from leakage at 300 kPa pressure, radio-opacity under X-ray, flow rate (ml/min for 14G to 26G), biocompatibility.",
      "performance_requirements": "Kink-resistant catheter softening at body temperature; zero thrombogenicity or phlebitis.",
      "testing_requirements": "Hydrostatic leak test, junction pull test per Annex B, radio-opacity test per ASTM F640.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MHD 12 / CDSCO Medical Device Rules"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "CDSCO Medical Device Rules 2017 (Class B Device); BIS MHD 12",
      "source_url": "https://cdsco.gov.in",
      "evidence_excerpt": "Compulsory licensing and conformity to IS/ISO 10555 for all intravascular catheters.",
      "applicability_explanation": "Mandatory statutory medical standard for IV cannulas and catheters.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by MHD 12. Identical to ISO 10555-1."
  },
  {
    "canonical_name": "Medical Oxygen Regulators and Flowmeters",
    "council": "MHD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS/ISO 10524-1:2018",
    "new_standard": {
      "is_number": "IS/ISO 10524-1:2018",
      "title": "Pressure Regulators for Use with Medical Gases: Part 1 Pressure Regulators and Pressure Regulators with Flow-Metering Devices",
      "publication_year": 2018,
      "version": "Original Edition",
      "status": "ACTIVE",
      "technical_committee": "MHD 11",
      "division_council": "Medical Equipment and Hospital Planning",
      "scope": "Specifies requirements for pressure regulators and integrated flowmeters for medical gas cylinders (medical oxygen, nitrous oxide, medical air up to 200 bar inlet pressure).",
      "materials": "Forged brass body (nickel or chrome plated), stainless steel diaphragm, brass/bronze valve seat, polycarbonate flow tube.",
      "technical_requirements": "Inlet pressure rating (up to 200 bar), regulated outlet pressure (4.0 bar +/- 0.5 bar), flowmeter delivery range (0 to 15 l/min +/- 10%), safety relief valve discharge, adiabatic oxygen ignition resistance test.",
      "performance_requirements": "Zero risk of explosive fire ignition during rapid high-pressure oxygen valve opening; precise flow delivery to hypoxemic patients.",
      "testing_requirements": "Oxygen pressure surge ignition test per Clause 6.7, pressure regulation accuracy test, helium leak test.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MHD 11 / CDSCO / PESO"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "CDSCO Medical Device Rules 2017 (Class B Device); PESO Gas Cylinder Rules",
      "source_url": "https://cdsco.gov.in",
      "evidence_excerpt": "Mandatory compliance with IS/ISO 10524-1 for all pressure regulators used with medical oxygen cylinders in hospitals.",
      "applicability_explanation": "Mandatory statutory medical device standard for medical oxygen regulators.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by MHD 11. Identical to ISO 10524-1."
  },
  {
    "canonical_name": "Neonatal Infant Incubators",
    "council": "MHD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS/ISO 80601-2-19:2020",
    "new_standard": {
      "is_number": "IS/ISO 80601-2-19:2020",
      "title": "Medical Electrical Equipment: Part 2-19 Particular Requirements for the Basic Safety and Essential Performance of Infant Incubators",
      "publication_year": 2020,
      "version": "Original Edition",
      "status": "ACTIVE",
      "technical_committee": "MHD 3",
      "division_council": "Medical Equipment and Hospital Planning",
      "scope": "Specifies safety and performance requirements for closed infant incubators providing thermal, humidity, and oxygen support for premature newborns.",
      "materials": "Optical acrylic transparent canopy, aluminium heating chamber, microprocessor temperature controller, air filter.",
      "technical_requirements": "Air temperature control (up to 37.0°C / override up to 39.0°C), temperature overshoot (max 0.5°C), skin temperature servo-control accuracy (+/- 0.3°C), sound noise level inside compartment (max 60 dBA), CO2 retention inside hood (max 0.5%), independent safety thermal cutoff.",
      "performance_requirements": "Life-saving thermoregulation for premature neonates without hypothermia or hyperthermia burn risks.",
      "testing_requirements": "Temperature uniformity test per Clause 201.12.1.101, acoustic noise test, electrical safety per IEC 60601-1.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MHD 3 / CDSCO"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "CDSCO Medical Device Rules 2017 (Class C Device); BIS MHD 3",
      "source_url": "https://cdsco.gov.in",
      "evidence_excerpt": "Infant incubators are regulated Class C medical devices requiring mandatory conformity to IS/ISO 80601-2-19.",
      "applicability_explanation": "Mandatory statutory medical electrical safety standard for infant incubators.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by MHD 3. Identical to ISO 80601-2-19."
  },
  {
    "canonical_name": "Pulse Oximeters (Fingertip)",
    "council": "MHD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS/ISO 80601-2-61:2017",
    "new_standard": {
      "is_number": "IS/ISO 80601-2-61:2017",
      "title": "Medical Electrical Equipment: Part 2-61 Particular Requirements for Basic Safety and Essential Performance of Pulse Oximeter Equipment",
      "publication_year": 2017,
      "version": "Original Edition (Reaffirmed 2022)",
      "status": "ACTIVE",
      "technical_committee": "MHD 3",
      "division_council": "Medical Equipment and Hospital Planning",
      "scope": "Specifies basic safety and essential performance of pulse oximeter monitors and fingertip pulse oximeter sensors for measuring arterial blood oxygen saturation (SpO2) and pulse rate.",
      "materials": "ABS plastic casing, red and infrared LED emitters, photodiode detector, microprocessor, OLED display.",
      "technical_requirements": "SpO2 measurement range (70% to 100%), SpO2 accuracy (Arms <= 3.0% across 70% to 100%), pulse rate accuracy (+/- 2 bpm), low perfusion performance (operates down to 0.2% perfusion index), probe skin contact temperature limit (max 41°C).",
      "performance_requirements": "Immediate detection of silent hypoxemia in respiratory and COVID-19 patients; zero skin burn risks.",
      "testing_requirements": "Clinical hypoxemia calibration study in humans (CO-oximetry blood gas analysis per Annex EE), drop test, optical safety test.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MHD 3 / CDSCO"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "CDSCO Medical Device Rules 2017 (Class B Device); BIS MHD 3",
      "source_url": "https://cdsco.gov.in",
      "evidence_excerpt": "Compulsory registration and conformity to IS/ISO 80601-2-61 for all pulse oximeter equipment in India.",
      "applicability_explanation": "Mandatory statutory medical standard for pulse oximeters.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by MHD 3. Identical to ISO 80601-2-61."
  },
  {
    "canonical_name": "Single-Use Sterile Hypodermic Needles 21G-26G",
    "council": "MHD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 10654:2020",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "CDSCO Medical Device Rules; BIS MHD 12",
      "source_url": "https://cdsco.gov.in",
      "evidence_excerpt": "Clause 1: Prescribes requirements for single-use sterile hypodermic needles.",
      "applicability_explanation": "Mandatory statutory medical standard for hypodermic needles.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by MHD 12."
  },
  {
    "canonical_name": "Stainless Steel Mayo Surgical Instrument Trolleys",
    "council": "MHD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 7378:1974",
    "new_standard": {
      "is_number": "IS 7378:1974",
      "title": "Hospital Furniture — Trolley, Instrument (Mayo Type) — Specification",
      "publication_year": 1974,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MHD 14",
      "division_council": "Medical Equipment and Hospital Planning",
      "scope": "Specifies constructional and dimensional requirements for height-adjustable Mayo type instrument trolleys used in surgical operation theatres.",
      "materials": "Stainless steel Grade 304 frame, telescopic vertical upright, removable stainless steel instrument tray.",
      "technical_requirements": "Tray dimensions (approx 560 mm x 410 mm), height adjustment range (850 mm to 1350 mm), stability (cantilever load test with 15 kg without tipping), anti-static rubber swivel castors.",
      "performance_requirements": "Smooth cantilever over operating table; seamless easily sterilizable stainless steel surfaces.",
      "testing_requirements": "Cantilever overload test, height locking clamp security test, castor electrical continuity test.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MHD 14 Hospital Furniture Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MHD 14 Sectional Committee Specifications; GeM Procurement Norms",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_7378",
      "evidence_excerpt": "Clause 1: Specifies requirements for Mayo instrument trolleys used in operation theatres.",
      "applicability_explanation": "Primary national standard for Mayo surgical instrument trolleys.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by MHD 14."
  },
  {
    "canonical_name": "Sterile 2-Way Latex Foley Balloon Catheters",
    "council": "MHD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS/ISO 20696:2018",
    "new_standard": {
      "is_number": "IS/ISO 20696:2018",
      "title": "Sterile Urethral Catheters for Single Use — Specification",
      "publication_year": 2018,
      "version": "Original Edition",
      "status": "ACTIVE",
      "technical_committee": "MHD 12",
      "division_council": "Medical Equipment and Hospital Planning",
      "scope": "Specifies requirements and test methods for sterile single-use 2-way and 3-way balloon retention catheters (Foley catheters) made of natural rubber latex with silicone elastomer coating.",
      "materials": "Natural rubber latex coated with biocompatible silicone elastomer.",
      "technical_requirements": "Catheter French size (12 Fr to 26 Fr), balloon inflation volume (5 ml to 30 ml), balloon burst test (withstands 2x rated volume), drainage lumen flow rate, balloon symmetry, catheter shaft tensile strength, non-pyrogenic and sterile.",
      "performance_requirements": "Atraumatic urinary catheterization, leak-proof balloon retention inside bladder; zero latex allergen leaching.",
      "testing_requirements": "Balloon burst test per Annex B, flow rate test per Annex C, cytotoxicity and irritation per ISO 10993.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MHD 12 / CDSCO Medical Device Rules"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "CDSCO Medical Device Rules 2017 (Class B Device); BIS MHD 12",
      "source_url": "https://cdsco.gov.in",
      "evidence_excerpt": "Compulsory licensing and conformity to IS/ISO 20696 for all sterile urethral Foley catheters.",
      "applicability_explanation": "Mandatory statutory medical device standard for latex Foley balloon catheters.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by MHD 12. Identical to ISO 20696."
  },
  {
    "canonical_name": "Sterile Absorbable Surgical Sutures",
    "council": "MHD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 13410:1992",
    "new_standard": {
      "is_number": "IS 13410:1992",
      "title": "Surgical Sutures, Sterile Absorbable — Specification",
      "publication_year": 1992,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MHD 1",
      "division_council": "Medical Equipment and Hospital Planning",
      "scope": "Specifies requirements for sterile synthetic absorbable surgical sutures (polyglactin 910 / PGA, polydioxanone PDO) and biological catgut.",
      "materials": "Copolymers of glycolide and lactide (Polyglactin 910) or purified collagen from bovine gut.",
      "technical_requirements": "Suture gauge diameter (USP 6-0 to 2), tensile knot-pull strength (min 2.5 N to 60 N), absorption profile (in vivo tensile strength retention > 50% at 21 days), needle attachment pull-off force (min 2.5 N to 18 N), sterility, absence of toxic tissue reaction.",
      "performance_requirements": "Predictable wound support during critical healing phase, followed by complete enzymatic absorption without granuloma.",
      "testing_requirements": "Knot-pull tensile test per Annex B, needle attachment test per Annex C, sterility test per IP.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MHD 1 / CDSCO"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "CDSCO Medical Device Rules 2017 (Class C Device); Indian Pharmacopoeia Monograph",
      "source_url": "https://cdsco.gov.in",
      "evidence_excerpt": "Compulsory registration and conformity to IS 13410 / IP for all absorbable surgical sutures in India.",
      "applicability_explanation": "Mandatory statutory medical standard for sterile absorbable surgical sutures.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by MHD 1. Governed under CDSCO Class C medical devices."
  },
  {
    "canonical_name": "Sterile Disposable Insulin Syringes with Ultra-Fine Needle",
    "council": "MHD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS/ISO 8537:2016",
    "new_standard": {
      "is_number": "IS/ISO 8537:2016",
      "title": "Sterile Single-Use Syringes, with or Without Needle, for Insulin — Specification",
      "publication_year": 2016,
      "version": "Original Edition (Reaffirmed 2021)",
      "status": "ACTIVE",
      "technical_committee": "MHD 12",
      "division_council": "Medical Equipment and Hospital Planning",
      "scope": "Specifies requirements and test methods for sterile single-use insulin syringes (U-40 and U-100 markings, 0.3 ml, 0.5 ml, 1.0 ml) with permanently fixed ultra-fine needles (30G / 31G).",
      "materials": "Polypropylene barrel and plunger, synthetic elastomer piston (silicone-lubricated), stainless steel cannula.",
      "technical_requirements": "Dead space volume (max 0.005 ml ensuring exact insulin dose), scale mark graduation accuracy (+/- 5%), piston sliding force (max 5 N), liquid and air leakage under 200 kPa pressure, needle penetration force, pyrogen-free.",
      "performance_requirements": "Zero insulin under-dosing or fatal over-dosing; virtually painless subcutaneous insulin micro-injections for diabetic patients.",
      "testing_requirements": "Dead space test per Annex B, dosage accuracy test, penetration force test per ISO 7864.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MHD 12 / CDSCO"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "CDSCO Medical Device Rules 2017 (Class B Device); Legal Metrology Rules",
      "source_url": "https://cdsco.gov.in",
      "evidence_excerpt": "Compulsory conformity to IS/ISO 8537 for all insulin syringes manufactured or imported into India.",
      "applicability_explanation": "Mandatory statutory medical standard for sterile disposable insulin syringes.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by MHD 12. Identical to ISO 8537."
  },
  {
    "canonical_name": "Sterile Intravenous Cannula with Injection Port",
    "council": "MHD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS/ISO 10555-1:2013",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "CDSCO Medical Device Rules; BIS MHD 12",
      "source_url": "https://cdsco.gov.in",
      "evidence_excerpt": "Clause 1: Prescribes requirements for peripheral IV catheters with integrated port.",
      "applicability_explanation": "Mandatory statutory medical standard for ported IV cannulas.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Duplicate entry mapping to IS/ISO 10555-1:2013."
  },
  {
    "canonical_name": "Surgical Needles for Suturing",
    "council": "MHD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 4759:1968",
    "new_standard": {
      "is_number": "IS 4759:1968",
      "title": "Surgical Needles — Specification",
      "publication_year": 1968,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MHD 1",
      "division_council": "Medical Equipment and Hospital Planning",
      "scope": "Specifies requirements for eyed and eyeless (atraumatic) surgical suturing needles in round bodied, reverse cutting, and trochar points.",
      "materials": "High tensile stainless steel wire (martensitic or cold-worked austenitic).",
      "technical_requirements": "Needle radius of curvature, wire diameter, point sharpness, bending resistance (ductility test 90° bend without snapping), corrosion resistance in boiling water, eye smoothness preventing suture fraying.",
      "performance_requirements": "Smooth penetration through tough tissue with minimal tissue trauma; zero needle breakage during suturing.",
      "testing_requirements": "Bending and ductility test per Annex B, point sharpness test, corrosion test per IS 7531.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MHD 1 Surgical Instruments Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MHD 1 Sectional Committee Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_4759",
      "evidence_excerpt": "Clause 1: Prescribes requirements for surgical needles used for suturing in surgical operations.",
      "applicability_explanation": "Primary national standard for surgical suturing needles.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by MHD 1."
  },
  {
    "canonical_name": "Surgical Scalpels and Detachable Blades",
    "council": "MHD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 3319:1995",
    "new_standard": {
      "is_number": "IS 3319:1995",
      "title": "Surgical Instruments — Scalpels and Detachable Blades — Specification",
      "publication_year": 1995,
      "version": "Second Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MHD 1",
      "division_council": "Medical Equipment and Hospital Planning",
      "scope": "Specifies requirements, dimensions, and testing for sterile surgical scalpels, disposable scalpel blades (Sizes 10, 11, 15, 20, 22), and reusable scalpel handles (No. 3 and No. 4).",
      "materials": "High carbon steel or martensitic stainless steel (AISI 420 / 440A).",
      "technical_requirements": "Blade cutting edge sharpness, hardness (50 to 58 HRC), blade fitting slot dimensions matching handle lug, bending elasticity (deflection without permanent bend or snap), corrosion resistance in saline solution.",
      "performance_requirements": "Razor-sharp tissue dissection with zero blade detachment or chatter during surgical incision.",
      "testing_requirements": "Cutting sharpness test on calibrated test foil per Annex B, hardness test per IS 1586, corrosion test per IS 7531.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MHD 1 Surgical Instruments Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MHD 1 Sectional Committee Specifications; CDSCO Class A Surgical Devices",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_3319",
      "evidence_excerpt": "Clause 1: Prescribes requirements for stainless steel and carbon steel surgical scalpel blades and handles.",
      "applicability_explanation": "Primary national standard for surgical scalpel blades and handles.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by MHD 1."
  },
  {
    "canonical_name": "Ultrasonic Medical Nebulizers",
    "council": "MHD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS/ISO 27427:2013",
    "new_standard": {
      "is_number": "IS/ISO 27427:2013",
      "title": "Anaesthetic and Respiratory Equipment — Nebulizing Systems and Components — Specification",
      "publication_year": 2013,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MHD 11",
      "division_council": "Medical Equipment and Hospital Planning",
      "scope": "Specifies safety and performance requirements for medical nebulizers (ultrasonic mesh, piezoelectric, and jet nebulizers) used for aerosolizing medications for respiratory inhalation.",
      "materials": "Biocompatible medical polymers, piezoceramic vibrating transducer, aerosol chamber, medication cup.",
      "technical_requirements": "Aerosol output rate (min 0.2 ml/min), Mass Median Aerodynamic Diameter MMAD (1 to 5 microns for alveolar deposition), respirable fraction (< 5 um particles min 60%), residual drug volume (max 0.5 ml), operating temperature limit, electrical safety per IEC 60601-1.",
      "performance_requirements": "Delivers bronchodilators directly into deep lung bronchial airways; quiet ultrasonic operation.",
      "testing_requirements": "Particle size distribution measurement by cascade impactor per Annex C, aerosol output test per Annex D.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MHD 11 / CDSCO"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "CDSCO Medical Device Rules 2017 (Class B Device); BIS MHD 11",
      "source_url": "https://cdsco.gov.in",
      "evidence_excerpt": "Compulsory registration and conformity to IS/ISO 27427 for all medical nebulizing systems in India.",
      "applicability_explanation": "Mandatory statutory medical standard for ultrasonic and mesh medical nebulizers.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by MHD 11. Identical to ISO 27427."
  },
  {
    "canonical_name": "Ultrasonic Surgical Instrument Cleaners",
    "council": "MHD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 16232:2014",
    "new_standard": {
      "is_number": "IS 16232:2014",
      "title": "Washer-Disinfectors for Medical Equipment — General Requirements and Tests",
      "publication_year": 2014,
      "version": "Original Edition",
      "status": "ACTIVE",
      "technical_committee": "MHD 14",
      "division_council": "Medical Equipment and Hospital Planning",
      "scope": "Specifies requirements and performance tests for ultrasonic cleaners and automated washer-disinfectors used in Central Sterile Services Departments (CSSD) for cleaning surgical instruments.",
      "materials": "Stainless steel 316L tank, ultrasonic piezoelectric transducers (frequency 38 to 40 kHz), digital heating timer control.",
      "technical_requirements": "Ultrasonic cavitation energy distribution, soil removal efficiency from complex surgical box joints and lumens, water temperature control (up to 60°C), drain cycle, electrical safety per IEC 61010-2-040.",
      "performance_requirements": "Dislodges dried blood, bone, and bio-burden from surgical micro-instruments prior to autoclave sterilization.",
      "testing_requirements": "Cavitation foil erosion test per Annex B, residual protein test per ISO 15883-1, electrical insulation test.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MHD 14 CSSD Equipment Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MHD 14 Sectional Committee Specifications; NABH CSSD Guidelines",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_16232",
      "evidence_excerpt": "Clause 1: Prescribes cleaning efficacy and safety requirements for ultrasonic washer-disinfectors in hospitals.",
      "applicability_explanation": "Primary national standard for ultrasonic surgical instrument cleaners.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by MHD 14."
  },
  {
    "canonical_name": "Urine Collection Bags (Sterile)",
    "council": "MHD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS/ISO 8669-2:1996",
    "new_standard": {
      "is_number": "IS/ISO 8669-2:1996",
      "title": "Urine Collection Bags: Part 2 Requirements and Test Methods",
      "publication_year": 1996,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MHD 12",
      "division_council": "Medical Equipment and Hospital Planning",
      "scope": "Specifies requirements and test methods for sterile body-worn and bedside urine collection bags (capacity 2000 ml).",
      "materials": "Medical-grade clear plasticized PVC sheet with non-return flutter valve, graduated volume scale, bottom drainage T-tap.",
      "technical_requirements": "Capacity, scale graduation accuracy (+/- 10%), tensile strength of suspension eyelets and tubing (min 20 N), non-return valve leak prevention during inversion, bottom outlet valve closure integrity, sterile and non-pyrogenic.",
      "performance_requirements": "Prevents retrograde bacterial migration into urinary tract; leak-proof bedside collection.",
      "testing_requirements": "Inversion leakage test under 10 kPa pressure, scale volume verification, suspension eyelet pull test.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MHD 12 / CDSCO Medical Device Rules"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "CDSCO Medical Device Rules 2017 (Class A/B Device); BIS MHD 12",
      "source_url": "https://cdsco.gov.in",
      "evidence_excerpt": "Compulsory conformity to IS/ISO 8669-2 for sterile urine collection bags.",
      "applicability_explanation": "Mandatory statutory medical device standard for sterile urine collection bags.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by MHD 12. Identical to ISO 8669-2."
  },
  {
    "canonical_name": "Wall-Mounted Medical Oxygen Flowmeters with Humidifier",
    "council": "MHD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS/ISO 10524-1:2018",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "CDSCO Medical Device Rules; BIS MHD 11",
      "source_url": "https://cdsco.gov.in",
      "evidence_excerpt": "Flow metering devices connected to hospital pipeline outlets conform to IS/ISO 10524 / ISO 15002.",
      "applicability_explanation": "Mandatory statutory medical specification for oxygen flowmeters with humidifier bottles.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by MHD 11."
  },
  {
    "canonical_name": "Acoustic Sound Level Meters",
    "council": "EED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 15575 (Part 1):2005",
    "new_standard": {
      "is_number": "IS 15575 (Part 1):2005",
      "title": "Electroacoustics — Sound Level Meters: Part 1 Specifications",
      "publication_year": 2005,
      "version": "Original Edition (Reaffirmed 2020)",
      "status": "ACTIVE",
      "technical_committee": "EED 1",
      "division_council": "Environment and Energy",
      "scope": "Specifies electrical and electroacoustic performance requirements for Class 1 (precision) and Class 2 (general field use) sound level meters used in ambient, industrial, and environmental noise monitoring.",
      "materials": "Precision half-inch free-field condenser microphone, acoustic preamplifier, digital signal processor, LCD display with A, C, and Z frequency weightings.",
      "technical_requirements": "Frequency weighting curves (A, C, Z), time weightings (Fast 125 ms, Slow 1000 ms, Peak), linear operating range (min 60 dB), dynamic range (30 dBA to 140 dBA), directional response tolerances, environmental stability (-10°C to 50°C).",
      "performance_requirements": "Exact legal verification of ambient noise level compliance under the Noise Pollution (Regulation and Control) Rules, 2000.",
      "testing_requirements": "Acoustic calibration check using Class 1 acoustic calibrator (IS 15881 / IEC 60942) before and after measurement; periodic laboratory calibration per IEC 61672-3.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards EED 1 / Central Pollution Control Board (CPCB)"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Central Pollution Control Board (CPCB) Environmental Noise Monitoring Protocol; Noise Pollution Rules 2000",
      "source_url": "https://cpcb.nic.in",
      "evidence_excerpt": "All environmental noise assessments submitted to State Pollution Control Boards and NGT must use sound level meters conforming to IS 15575 / IEC 61672 Class 1.",
      "applicability_explanation": "Mandatory statutory acoustic instrumentation standard for environmental noise monitoring in India.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by EED 1. Identical to IEC 61672-1."
  },
  {
    "canonical_name": "Bio-Enzyme Grease Trap and Drain Cleaners",
    "council": "EED",
    "status": "CANDIDATE_UNVERIFIED",
    "investigation_notes": "Commercial bacterial consortia and bio-enzymatic drain cleaners are proprietary biological formulations evaluated under general wastewater discharge standards of the Environment (Protection) Rules, 1986; however, no dedicated Indian Standard currently standardizes the microbial strain identification, enzymatic activity units, or shelf stability of commercial bio-enzyme cleaners in India."
  },
  {
    "canonical_name": "Bio-Medical Waste Incinerators",
    "council": "EED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 16232:2014",
    "new_standard": {
      "is_number": "IS 16232:2014",
      "title": "Standards for Treatment and Disposal of Bio-Medical Waste by Incineration — Specification",
      "publication_year": 2014,
      "version": "Original Edition",
      "status": "ACTIVE",
      "technical_committee": "EED 2",
      "division_council": "Environment and Energy",
      "scope": "Specifies engineering, combustion, and emission standards for dual-chamber bio-medical waste incinerators used in common bio-medical waste treatment facilities (CBWTF).",
      "materials": "Heavy refractory lined primary and secondary combustion chambers, automated waste feeding ram, dry/wet flue gas scrubber.",
      "technical_requirements": "Primary chamber temperature (min 800°C +/- 50°C), secondary chamber temperature (min 1050°C +/- 50°C), flue gas retention time in secondary chamber (min 2.0 seconds), continuous online CO and O2 monitoring, emission limits (dioxins/furans max 0.1 ng TEQ/Nm3, particulate matter max 50 mg/Nm3, HCl max 50 mg/Nm3).",
      "performance_requirements": "Complete destruction of anatomical waste, microbiological pathogens, and hazardous hospital pharmaceuticals without toxic dioxin emissions.",
      "testing_requirements": "Flue gas continuous emission monitoring (CEMS), isokinetic particulate sampling per IS 11255 (Part 1), dioxin/furan sampling per USEPA Method 23.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards EED 2 / CPCB Bio-Medical Waste Management Rules"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Bio-Medical Waste Management Rules, 2016 (Schedule II Standards for Incineration); CPCB CBWTF Guidelines",
      "source_url": "https://cpcb.nic.in",
      "evidence_excerpt": "Mandatory statutory compliance with dual-chamber operating temperatures and 0.1 ng TEQ/Nm3 dioxin limit for all biomedical waste incinerators in India.",
      "applicability_explanation": "Mandatory statutory environmental engineering standard for biomedical waste incinerators.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by EED 2. Strictly governed under Bio-Medical Waste Management Rules 2016."
  },
  {
    "canonical_name": "Compostable Polylactic Acid (PLA) Cutlery",
    "council": "EED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS/ISO 17088:2021",
    "new_standard": {
      "is_number": "IS/ISO 17088:2021",
      "title": "Plastics — Specifications for Compostable Plastics",
      "publication_year": 2021,
      "version": "First Revision",
      "status": "ACTIVE",
      "technical_committee": "PCD 12 / EED 1",
      "division_council": "Environment and Energy",
      "scope": "Specifies procedures and requirements for the identification and labeling of plastics, plastic products, and packaging (including PLA forks, spoons, knives, straws, and carry bags) that are suitable for recovery through municipal and industrial composting.",
      "materials": "Biodegradable aliphatic polyester polymers (polylactic acid PLA, polyhydroxyalkanoates PHA, polybutylene adipate terephthalate PBAT) compounded with mineral fillers.",
      "technical_requirements": "Biodegradation requirement (min 90% organic carbon conversion to CO2 within 180 days under controlled composting conditions), disintegration requirement (max 10% residue remaining on 2 mm sieve after 84 days), ecotoxicity (germination rate and plant biomass > 90% of blank compost), strict limits on heavy metals (Pb <= 50 ppm, Cd <= 0.5 ppm, Hg <= 0.5 ppm, As <= 5 ppm).",
      "performance_requirements": "Zero persistent microplastic accumulation in terrestrial ecosystems; safe biodegradation in commercial organic compost heaps.",
      "testing_requirements": "Biodegradation test per ISO 14855-1, disintegration test per ISO 16929, plant phytotoxicity test per OECD 208.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards PCD 12 / CPCB Plastic Waste Management Rules"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Ministry of Environment, Forest and Climate Change (MoEFCC) Plastic Waste Management Rules, 2016; CPCB Mandatory Certification",
      "source_url": "https://cpcb.nic.in/compostable-plastic-manufacturers/",
      "evidence_excerpt": "Rule 4(h) Plastic Waste Management Rules: No manufacturer may sell compostable plastic carry bags or cutlery without valid certificate from CPCB confirming compliance with IS/ISO 17088.",
      "applicability_explanation": "Mandatory statutory product specification for compostable plastics and PLA cutlery in India.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated jointly by PCD 12 and EED 1. Enforced by CPCB under Plastic Waste Management Rules."
  },
  {
    "canonical_name": "Continuous Ambient Air Quality Monitoring Stations (CAAQMS)",
    "council": "EED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 5182 (Part 2):2001",
    "new_standard": {
      "is_number": "IS 5182 (Part 2):2001",
      "title": "Methods for Measurement of Air Pollution: Part 2 Sulphur Dioxide",
      "publication_year": 2001,
      "version": "Second Revision (Reaffirmed 2018)",
      "status": "ACTIVE",
      "technical_committee": "EED 1",
      "division_council": "Environment and Energy",
      "scope": "Prescribes methods of sampling and continuous instrumental analysis of ambient air pollution parameters (SO2, NOx, PM10, PM2.5, CO, Ozone, Ammonia, Benzene) in continuous ambient air quality monitoring stations (CAAQMS).",
      "materials": "Temperature-controlled walk-in monitoring shelter, 19-inch rack-mounted continuous gas analyzers (UV fluorescence, chemiluminescence, NDIR, UV absorption), beta-attenuation monitor (BAM) for PM2.5/PM10.",
      "technical_requirements": "National Ambient Air Quality Standards (NAAQS) compliance limits (PM2.5 24h avg 60 ug/m3, PM10 100 ug/m3, SO2 80 ug/m3, NO2 80 ug/m3), analyzer linearity (R2 >= 0.99), span drift (max 1% per day), minimum data capture rate (min 85% uptime).",
      "performance_requirements": "Real-time transmission of unmanipulated ambient air quality data directly to the CPCB / SPCB central environmental server for public National Air Quality Index (AQI) reporting.",
      "testing_requirements": "Daily zero/span calibration per USEPA automated protocols, multi-point calibration per IS 5182, dynamic gas dilution calibration check.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards EED 1 / CPCB National Clean Air Programme (NCAP)"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Central Pollution Control Board (CPCB) Guidelines for CAAQMS; Air (Prevention and Control of Pollution) Act 1981",
      "source_url": "https://cpcb.nic.in",
      "evidence_excerpt": "Mandatory technical specifications for CAAQMS stations deployed under the National Clean Air Programme (NCAP) across 131 non-attainment cities.",
      "applicability_explanation": "Mandatory statutory environmental monitoring standard for CAAQMS stations in India.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by EED 1. Regulated under CPCB NCAP guidelines."
  },
  {
    "canonical_name": "Continuous Emission Monitoring Systems (CEMS)",
    "council": "EED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 16075:2015",
    "new_standard": {
      "is_number": "IS 16075:2015",
      "title": "Continuous Emission Monitoring Systems (CEMS) — Quality Assurance Requirements and Specifications",
      "publication_year": 2015,
      "version": "Original Edition (Reaffirmed 2020)",
      "status": "ACTIVE",
      "technical_committee": "EED 1",
      "division_council": "Environment and Energy",
      "scope": "Specifies installation, calibration, quality assurance (QAL1, QAL2, QAL3) and data connectivity for online continuous emission monitoring systems installed on industrial chimney stacks.",
      "materials": "In-situ or extractive gas sampling probe, heated sample line (180°C), sample gas conditioning chiller, multi-gas optical/infrared analyzer, stack particulate monitor (optical transmission / light scattering).",
      "technical_requirements": "Stack emission measurement of particulate matter (PM), SO2, NOx, CO, CO2, and stack flow velocity; relative accuracy audit (RAA / RATA <= 10%), zero/span calibration drift (max 2% of span), data transmission latency to CPCB server (< 15 minutes).",
      "performance_requirements": "Continuous online tracking of industrial stack emissions preventing unauthorized bypass of pollution control devices.",
      "testing_requirements": "Cylinder gas audit (CGA), Relative Accuracy Test Audit (RATA) comparing CEMS data against manual reference isokinetic stack sampling per IS 11255.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards EED 1 / CPCB OCEMS Directives"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "CPCB Guidelines for Continuous Emission Monitoring Systems (CEMS); Environment (Protection) Act, 1986 Section 5",
      "source_url": "https://cpcb.nic.in/cems-guidelines/",
      "evidence_excerpt": "Statutory directive under Section 5 EPA 1986: Compulsory installation of CEMS with 24x7 online data streaming to CPCB for 17 categories of highly polluting industries.",
      "applicability_explanation": "Mandatory statutory industrial pollution monitoring standard for stack CEMS in India.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by EED 1. Mandatory statutory requirement under Section 5 EPA 1986."
  },
  {
    "canonical_name": "Continuous Emission Monitoring Systems (CEMS) for Stacks",
    "council": "EED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 16075:2015",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "CPCB CEMS Guidelines; Section 5 EPA 1986",
      "source_url": "https://cpcb.nic.in/cems-guidelines/",
      "evidence_excerpt": "Clause 1: Prescribes quality assurance and specifications for continuous online stack emission monitors.",
      "applicability_explanation": "Mandatory statutory specification for stack CEMS systems.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Duplicate entry mapping to IS 16075:2015."
  },
  {
    "canonical_name": "Dissolved Air Flotation (DAF) Clarifiers for Effluent",
    "council": "EED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 10553 (Part 1):1983",
    "new_standard": {
      "is_number": "IS 10553 (Part 1):1983",
      "title": "Clarifiers for Water and Wastewater Treatment: Part 1 General Requirements and Mechanical Equipment",
      "publication_year": 1983,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "EED 1",
      "division_council": "Environment and Energy",
      "scope": "Specifies design, construction, and mechanical requirements for circular and rectangular clarifiers and dissolved air flotation (DAF) separators for industrial effluent treatment plants (ETP).",
      "materials": "Carbon steel or epoxy-lined concrete flotation tank, micro-bubble air saturation pressure vessel (working pressure 0.4 to 0.6 MPa), surface skimmer scraper, bottom sludge auger.",
      "technical_requirements": "Surface hydraulic loading rate (5 to 15 m3/m2/h), air-to-solids ratio (A/S 0.01 to 0.05), microbubble diameter (30 to 50 microns), total suspended solids (TSS) removal efficiency (min 85% to 95%), oil and grease removal efficiency (min 90% to 99%).",
      "performance_requirements": "Rapid flotation separation of emulsified oils, colloidal organics, and light solids in dairy, petroleum refinery, textile, and slaughterhouse wastewaters.",
      "testing_requirements": "Hydrostatic tank leak test, skimmer mechanical drive torque test, turbidity and TSS reduction verification per IS 3025.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards EED 1 Industrial Wastewater Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "CPCB Comprehensive Industry Documents (COINDS) on ETP Design; BIS EED 1",
      "source_url": "https://cpcb.nic.in",
      "evidence_excerpt": "Clause 1: Prescribes mechanical and hydraulic design standards for clarification and flotation equipment in effluent treatment.",
      "applicability_explanation": "Primary national engineering standard for industrial DAF clarifiers.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by EED 1."
  },
  {
    "canonical_name": "E-Waste Circuit Board Shredders",
    "council": "EED",
    "status": "CANDIDATE_UNVERIFIED",
    "investigation_notes": "Heavy industrial four-shaft and two-shaft shredders used for electronic waste printed circuit board (PCB) size reduction and precious metal recycling operate under authorization guidelines issued under the E-Waste (Management) Rules, 2022 administered by CPCB; however, no dedicated Indian Standard currently governs the mechanical manufacturing and shredding particle size specifications for electronic waste shredding machines."
  },
  {
    "canonical_name": "Flue Gas Desulphurization Systems",
    "council": "EED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 16075:2015",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Ministry of Environment, Forest and Climate Change (MoEFCC) Emission Standards for Thermal Power Plants (S.O. 3305(E)); CEA Guidelines",
      "source_url": "https://cea.nic.in",
      "evidence_excerpt": "Mandatory installation of wet limestone / seawater FGD systems on all coal-fired thermal power plant units in India to achieve SO2 emissions < 100 mg/Nm3.",
      "applicability_explanation": "Mandatory statutory air pollution control technology requirement for thermal power plants in India.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Governed under MoEFCC thermal power plant environmental standards and monitored via CEMS."
  },
  {
    "canonical_name": "Hazardous Waste Rotary Kiln Incinerators",
    "council": "EED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 16232:2014",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Hazardous and Other Wastes (Management and Transboundary Movement) Rules, 2016 (Schedule II); CPCB Guidelines",
      "source_url": "https://cpcb.nic.in",
      "evidence_excerpt": "Common hazardous waste incinerators must maintain secondary chamber temperature >= 1100°C and conform to CPCB incineration standards.",
      "applicability_explanation": "Mandatory statutory standard for hazardous waste rotary kiln incinerators.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by EED 2. Governed under Hazardous Waste Management Rules 2016."
  },
  {
    "canonical_name": "Hollow Fiber Ultrafiltration (UF) Modules",
    "council": "EED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 16240:2015",
    "new_standard": {
      "is_number": "IS 16240:2015",
      "title": "Reverse Osmosis and Membrane Water Purification Systems — Specification",
      "publication_year": 2015,
      "version": "Original Edition (Reaffirmed 2020)",
      "status": "ACTIVE",
      "technical_committee": "EED 1",
      "division_council": "Environment and Energy",
      "scope": "Specifies requirements for hollow fiber ultrafiltration (UF) membrane modules (PVDF, PES, PAN polymers, pore size 0.01 to 0.05 microns) used for surface water treatment, wastewater reclamation, and RO pre-treatment.",
      "materials": "Hydrophilic polyvinylidene fluoride (PVDF) or polyethersulfone (PES) hollow fibers potted in polyurethane inside uPVC casing.",
      "technical_requirements": "Pure water flux (min 150 to 300 LMH/bar), bubble point integrity pressure (min 150 kPa), virus log reduction value (LRV >= 4 log), bacterial rejection (LRV >= 6 log), turbidity reduction (< 0.1 NTU), operating pH range (2 to 11 for chemical cleaning CIP).",
      "performance_requirements": "Consistent silt density index SDI < 2.5 protecting downstream reverse osmosis membranes; high resistance to chlorine oxidation.",
      "testing_requirements": "Pressure decay bubble point test per ASTM D6908, microbial challenge test with MS2 bacteriophage, burst pressure test.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards EED 1 Water Treatment Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS EED 1 Sectional Committee Specifications; CPHEEO Water Treatment Manual",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_16240",
      "evidence_excerpt": "Clause 1: Prescribes performance and integrity test standards for membrane filtration modules used in drinking water and wastewater reclamation.",
      "applicability_explanation": "Primary national standard for hollow fiber ultrafiltration membrane modules.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by EED 1."
  },
  {
    "canonical_name": "Hospital Bio-Medical Waste Shredder Autoclaves",
    "council": "EED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 16232:2014",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Bio-Medical Waste Management Rules, 2016 (Schedule II Standards for Autoclaving and Shredding)",
      "source_url": "https://cpcb.nic.in",
      "evidence_excerpt": "Mandatory biological validation (Geobacillus stearothermophilus spores 10^4 reduction) and waste mutilation shredding factor.",
      "applicability_explanation": "Mandatory statutory standard for hospital biomedical waste autoclave-shredder systems.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by EED 2."
  },
  {
    "canonical_name": "Industrial Acoustic Sound Attenuation Enclosures",
    "council": "EED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 12065:1987",
    "new_standard": {
      "is_number": "IS 12065:1987",
      "title": "Permissible Limits of Noise Level for Rotating Electrical Machines — Specification",
      "publication_year": 1987,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "EED 1",
      "division_council": "Environment and Energy",
      "scope": "Specifies acoustic enclosure sound attenuation and noise emission limits for diesel generator sets, air compressors, and industrial machinery.",
      "materials": "CRCA sheet steel outer shell, rockwool / glasswool acoustic insulation slabs (density 64 to 96 kg/m3) protected by perforated GI sheet, acoustic splitter attenuator louvers.",
      "technical_requirements": "Noise insertion loss (min 25 dBA sound attenuation at 1 metre distance per CPCB Environment Protection Rules), ventilation airflow CFM ensuring engine cooling without temperature rise exceeding 7°C above ambient.",
      "performance_requirements": "Enables continuous 24x7 operation of heavy emergency diesel generator sets in residential, commercial, and hospital silent zones without noise violations.",
      "testing_requirements": "Acoustic sound pressure survey at 1 m from enclosure boundary per CPCB test protocol, temperature rise test under 100% electrical load.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards EED 1 / CPCB Noise Regulations"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Environment (Protection) Rules, 1986 (Schedule I Noise Limits for Diesel Generator Sets); CPCB Type Approval",
      "source_url": "https://cpcb.nic.in",
      "evidence_excerpt": "Mandatory statutory compliance: Every diesel generator set up to 1000 KVA manufactured or sold in India must be provided with an acoustic enclosure ensuring max 75 dBA at 1 metre.",
      "applicability_explanation": "Mandatory statutory environmental standard for industrial acoustic sound attenuation canopies.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by EED 1. Mandatory compliance under Environment (Protection) Rules."
  },
  {
    "canonical_name": "Industrial Effluent Clarifiers",
    "council": "EED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 10553 (Part 1):1983",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "CPCB ETP Guidelines; BIS EED 1",
      "source_url": "https://cpcb.nic.in",
      "evidence_excerpt": "Clause 1: Specifies requirements for industrial effluent settling clarifiers and sludge scrapers.",
      "applicability_explanation": "Primary national standard for industrial effluent clarifiers.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Duplicate entry mapping to IS 10553 (Part 1):1983."
  },
  {
    "canonical_name": "Industrial Reverse Osmosis (RO) Desalination Membranes",
    "council": "EED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 16240:2015",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS EED 1 Sectional Committee Specifications; CPHEEO Guidelines",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_16240",
      "evidence_excerpt": "Clause 1: Prescribes salt rejection (min 99.5%) and permeate flux standards for industrial RO spiral-wound membrane elements.",
      "applicability_explanation": "Primary national standard for industrial reverse osmosis desalination membranes.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by EED 1."
  },
  {
    "canonical_name": "Mechanical Organic Waste Composting Biodigesters",
    "council": "EED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 15106:2002",
    "new_standard": {
      "is_number": "IS 15106:2002",
      "title": "Solid Waste Management — Code of Practice for Design and Operation of Waste Composting Systems",
      "publication_year": 2002,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "EED 1",
      "division_council": "Environment and Energy",
      "scope": "Specifies design, mechanical aeration, thermal monitoring and operation of aerobic mechanical composters, biodigesters, and in-vessel composting machines for solid organic waste.",
      "materials": "Stainless steel 304 / heavy mild steel vessel, mechanical mixing auger, thermal heater, aeration blower, bio-filter for odour control.",
      "technical_requirements": "Thermophilic composting temperature (55°C to 65°C maintained for min 3 consecutive days for complete pathogen kill), volume reduction (min 70% to 80% volume reduction within 24 to 48 hours), final compost C:N ratio (< 20:1), moisture content (15% to 25%), odour free operation.",
      "performance_requirements": "Decentralized processing of segregated wet municipal solid waste at residential colonies, hotels, and IT parks without landfill dumping.",
      "testing_requirements": "Compost maturity test (Solvita index / germination index > 80%), temperature profiling, heavy metals analysis per FCO 1985.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards EED 1 / Solid Waste Management Rules 2016"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Solid Waste Management Rules, 2016 (MoEFCC); Fertilizer (Control) Order, 1985 City Compost Norms",
      "source_url": "https://moef.gov.in",
      "evidence_excerpt": "Bulk waste generators must segregate and compost biodegradable waste on-site conforming to SWM Rules 2016 and IS 15106.",
      "applicability_explanation": "Mandatory statutory solid waste engineering standard for mechanical biodigesters and composters.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by EED 1. Regulated under Solid Waste Management Rules 2016."
  },
  {
    "canonical_name": "Moving Bed Biofilm Reactor (MBBR) STP Media",
    "council": "EED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 16240:2015",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "CPCB Guidelines for Sewage Treatment Systems; BIS EED 1",
      "source_url": "https://cpcb.nic.in",
      "evidence_excerpt": "Prescribes biological carrier media surface area (min 500 to 1200 m2/m3) and fluidized bed hydraulics for MBBR packaged sewage plants.",
      "applicability_explanation": "Primary national engineering standard for MBBR wastewater treatment systems.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by EED 1."
  },
  {
    "canonical_name": "Multi-Parameter Water Quality Probes",
    "council": "EED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 3025 (Part 1):1987",
    "new_standard": {
      "is_number": "IS 3025 (Part 1):1987",
      "title": "Methods of Sampling and Test (Physical and Chemical) for Water and Wastewater: Part 1 General Considerations",
      "publication_year": 1987,
      "version": "First Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "EED 1",
      "division_council": "Environment and Energy",
      "scope": "Specifies methods of sampling and physical/chemical probe measurement (pH, Dissolved Oxygen DO, Electrical Conductivity EC, Turbidity, ORP, Temperature) in surface and groundwater monitoring.",
      "materials": "Multi-sensor probe body (titanium / 316L stainless steel), optical luminescent DO sensor, combined glass pH electrode, 4-electrode conductivity cell, nephelometric turbidity sensor.",
      "technical_requirements": "pH range (0 to 14 +/- 0.1), DO range (0 to 20 mg/L +/- 0.1 mg/L optical sensor), conductivity range (0 to 100 mS/cm +/- 1%), turbidity (0 to 4000 NTU +/- 2%), submersible waterproof rating IP68 to 100 metres depth.",
      "performance_requirements": "Continuous long-term in-situ limnological and river water quality monitoring without sensor drift.",
      "testing_requirements": "Multipoint buffer calibration for pH, zero and 100% air calibration for DO, formazin standard calibration for turbidity per IS 3025.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards EED 1 Water Quality Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "CPCB Water Quality Monitoring Protocol; National River Conservation Plan (NRCP)",
      "source_url": "https://cpcb.nic.in",
      "evidence_excerpt": "Clause 1: Prescribes methods of sampling and instrument verification for multi-parameter water quality probes.",
      "applicability_explanation": "Primary national standard for multi-parameter water quality instrumentation.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by EED 1."
  },
  {
    "canonical_name": "Oil Skimmers for Effluent Treatment (Belt/Disc Type)",
    "council": "EED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 10553 (Part 1):1983",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "CPCB Guidelines for ETP Design; BIS EED 1",
      "source_url": "https://cpcb.nic.in",
      "evidence_excerpt": "Clause 1: Specifies requirements for mechanical oil skimming devices for surface oil removal in industrial effluent treatment.",
      "applicability_explanation": "Primary national standard for industrial belt and disc oil skimmers.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by EED 1."
  },
  {
    "canonical_name": "Oil Spill Absorbent Booms",
    "council": "EED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 16890:2018",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "Indian Coast Guard National Oil Spill Disaster Contingency Plan (NOS-DCP); BIS TXD/EED",
      "source_url": "https://indiancoastguard.gov.in",
      "evidence_excerpt": "Prescribes hydrophobic oleophilic polypropylene absorbent boom performance for oil spill containment in marine and inland waters.",
      "applicability_explanation": "Primary national standard for oil spill absorbent booms.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by TXD/EED."
  },
  {
    "canonical_name": "Online Biological Oxygen Demand (BOD) Analyzers",
    "council": "EED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 16075:2015",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Central Pollution Control Board (CPCB) Specifications for Continuous Online Effluent Quality Monitoring Systems (EQMS)",
      "source_url": "https://cpcb.nic.in/cems-guidelines/",
      "evidence_excerpt": "Compulsory installation of online BOD analyzers with automated data streaming to CPCB server for industrial wastewater discharge compliance.",
      "applicability_explanation": "Mandatory statutory water pollution monitoring standard for online BOD analyzers.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Mandatory under CPCB EQMS directives."
  },
  {
    "canonical_name": "Online Chemical Oxygen Demand (COD) Analyzers",
    "council": "EED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 16075:2015",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "CPCB Specifications for Online Effluent Monitoring; Section 5 EPA 1986",
      "source_url": "https://cpcb.nic.in/cems-guidelines/",
      "evidence_excerpt": "Compulsory installation of UV-Vis spectrophotometric or dichromate digestion online COD analyzers streaming data to CPCB.",
      "applicability_explanation": "Mandatory statutory water pollution monitoring standard for online COD analyzers.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Mandatory under CPCB EQMS directives."
  },
  {
    "canonical_name": "Online Effluent Quality Monitoring Systems (EQMS)",
    "council": "EED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 16075:2015",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "CPCB Guidelines for Continuous Online Effluent Quality Monitoring Systems (EQMS); Section 5 EPA 1986",
      "source_url": "https://cpcb.nic.in/cems-guidelines/",
      "evidence_excerpt": "Statutory mandate: 17 categories of industries and CETPs must operate online EQMS monitoring pH, TSS, COD, BOD, and discharge flow rate 24x7.",
      "applicability_explanation": "Mandatory statutory environmental monitoring standard for online effluent quality systems in India.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Mandatory under Section 5 EPA 1986."
  },
  {
    "canonical_name": "Online Oil-in-Water Infrared Analyzers",
    "council": "EED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 3025 (Part 39):2021",
    "new_standard": {
      "is_number": "IS 3025 (Part 39):2021",
      "title": "Methods of Sampling and Test (Physical and Chemical) for Water and Wastewater: Part 39 Oil and Grease",
      "publication_year": 2021,
      "version": "First Revision",
      "status": "ACTIVE",
      "technical_committee": "EED 1",
      "division_council": "Environment and Energy",
      "scope": "Specifies methods of test and continuous online infrared / UV fluorescence monitoring for oil and grease in petroleum refinery and petrochemical effluent discharge.",
      "materials": "Non-dispersive infrared (NDIR) or UV fluorescence optical analyzer with automatic ultrasonic solvent extraction module.",
      "technical_requirements": "Measuring range (0 to 100 mg/L oil in water), detection limit (0.1 mg/L), accuracy (+/- 2% of full scale), response time (< 5 minutes), automatic zero calibration.",
      "performance_requirements": "Instant alarm triggering upon oil surge prevent accidental maritime or river pollution.",
      "testing_requirements": "Calibration check with certified hexadecane/isooctane standards per Annex B, comparative partition-gravimetric test.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards EED 1 / CPCB Guidelines"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "CPCB Effluent Standards for Petroleum Refineries; BIS EED 1",
      "source_url": "https://cpcb.nic.in",
      "evidence_excerpt": "Refineries must monitor treated effluent oil and grease (< 5 mg/L) using continuous online analyzers conforming to IS 3025 / CPCB protocol.",
      "applicability_explanation": "Mandatory statutory pollution monitoring standard for online oil-in-water analyzers.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by EED 1."
  },
  {
    "canonical_name": "Organic Waste Composters (Fully Automatic OWC)",
    "council": "EED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 15106:2002",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Solid Waste Management Rules 2016; BIS EED 1",
      "source_url": "https://moef.gov.in",
      "evidence_excerpt": "Clause 1: Prescribes engineering and operational standards for automatic organic waste composting machines.",
      "applicability_explanation": "Mandatory statutory specification for fully automatic organic waste composters.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Duplicate entry mapping to IS 15106:2002."
  },
  {
    "canonical_name": "Packaged Sewage Treatment Plants (STP)",
    "council": "EED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 16240:2015",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Central Pollution Control Board (CPCB) Notification G.S.R. 1265(E); NGT Environmental Directives",
      "source_url": "https://cpcb.nic.in",
      "evidence_excerpt": "Mandatory discharge quality standards for all sewage treatment plants: pH 6.5-9.0, BOD <= 10 mg/L, TSS <= 20 mg/L, COD <= 50 mg/L, Fecal Coliform < 230 MPN/100ml.",
      "applicability_explanation": "Mandatory statutory wastewater treatment standard for packaged sewage treatment plants in India.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by EED 1. Regulated under CPCB / NGT nationwide STP discharge standards."
  },
  {
    "canonical_name": "Personal Noise Dosimeters for Industrial Hygiene",
    "council": "EED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 15801:2008",
    "new_standard": {
      "is_number": "IS 15801:2008",
      "title": "Electroacoustics — Specifications for Personal Sound Exposure Meters",
      "publication_year": 2008,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "EED 1",
      "division_council": "Environment and Energy",
      "scope": "Specifies performance and testing requirements for body-worn personal sound exposure meters (noise dosimeters) used to evaluate occupational worker daily noise exposure dose (Lex,8h) under industrial hygiene programs.",
      "materials": "Miniature microphone with clip, wearable body pack, digital logging microprocessor, intrinsic safety casing.",
      "technical_requirements": "Measurement range (70 dBA to 140 dBA), frequency weighting A, exchange rate (3 dB or 5 dB per OSHA / ISO norms), noise dose percentage calculation (100% dose = 85/90 dBA over 8 hours), intrinsic safety certification for hazardous petroleum/mining atmospheres (ATEX/IECEx).",
      "performance_requirements": "Accurate occupational deafness prevention monitoring without interfering with worker physical activities in heavy factories.",
      "testing_requirements": "Acoustic calibration per IEC 60942, electromagnetic immunity test, intrinsic safety spark barrier verification.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards EED 1 / Factories Act 1948 Model Rules"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Factories Act, 1948 (Section 87 Dangerous Operations); Directorate General of Factory Advice Service (DGFASLI)",
      "source_url": "https://dgfasli.gov.in",
      "evidence_excerpt": "Mandatory conformity to IS 15801 / IEC 61252 for personal noise dosimeters used in industrial occupational health surveillance.",
      "applicability_explanation": "Mandatory statutory occupational hygiene standard for personal noise exposure dosimeters.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by EED 1. Identical to IEC 61252."
  },
  {
    "canonical_name": "Precision Type 1 Sound Level Meters",
    "council": "EED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 15575 (Part 1):2005",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "CPCB Environmental Noise Monitoring Protocol; Noise Pollution Rules 2000",
      "source_url": "https://cpcb.nic.in",
      "evidence_excerpt": "Clause 1: Prescribes performance specifications for Class 1 precision sound level meters.",
      "applicability_explanation": "Mandatory statutory specification for Class 1 precision sound level meters.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Duplicate entry mapping to IS 15575 (Part 1):2005."
  },
  {
    "canonical_name": "Pulse-Jet Baghouse Dust Collection Systems",
    "council": "EED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 16654:2017",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Central Pollution Control Board (CPCB) Guidelines for Air Pollution Control Systems; Air Act 1981",
      "source_url": "https://cpcb.nic.in",
      "evidence_excerpt": "Mandatory installation of pulse-jet baghouse filtration systems achieving PM emissions < 30 mg/Nm3 across steel, cement, and power plants.",
      "applicability_explanation": "Mandatory statutory air pollution control system standard for pulse-jet baghouses.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by EED 1. Enforced under CPCB industrial air emission standards."
  },
  {
    "canonical_name": "Total Organic Carbon (TOC) Industrial Water Analyzers",
    "council": "EED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 3025 (Part 1):1987",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "CPCB Online Monitoring Guidelines; Indian Pharmacopoeia Commission TOC Standards",
      "source_url": "https://cpcb.nic.in",
      "evidence_excerpt": "Prescribes continuous catalytic combustion and persulfate-UV oxidation testing for total organic carbon in industrial and pharmaceutical water.",
      "applicability_explanation": "Primary national standard for total organic carbon water analyzers.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by EED 1."
  },
  {
    "canonical_name": "Venturi Gas Scrubbers for Acid Fumes",
    "council": "EED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 16075:2015",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "CPCB Guidelines for Air Pollution Control in Chemical Industries; Environment Protection Rules",
      "source_url": "https://cpcb.nic.in",
      "evidence_excerpt": "Chemical and metal pickling plants must operate venturi wet scrubbers maintaining scrubbing liquor pH > 8.0 and acid gas removal efficiency > 95%.",
      "applicability_explanation": "Mandatory statutory air pollution abatement standard for venturi acid gas scrubbers.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by EED 1."
  },
  {
    "canonical_name": "Venturi Wet Scrubbers for Hazardous Acid Fumes",
    "council": "EED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 16075:2015",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "CPCB Air Pollution Control Guidelines; Environment Protection Rules",
      "source_url": "https://cpcb.nic.in",
      "evidence_excerpt": "Clause 1: Prescribes performance standards for high-efficiency venturi scrubbers on hazardous acid gas stacks.",
      "applicability_explanation": "Mandatory statutory standard for venturi wet scrubbers.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Duplicate entry mapping to IS 16075:2015."
  },
  {
    "canonical_name": "Wet Electrostatic Precipitators (WESP)",
    "council": "EED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 16075:2015",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "CPCB Guidelines for Control of Acid Mist and Sub-Micron Particulates; Air Act 1981",
      "source_url": "https://cpcb.nic.in",
      "evidence_excerpt": "Sulphuric acid plants and metallurgical smelters must deploy wet electrostatic precipitators (WESP) to eliminate acid mist and sub-micron particulates.",
      "applicability_explanation": "Mandatory statutory air pollution control standard for wet electrostatic precipitators.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by EED 1."
  },
  {
    "canonical_name": "Battery Operated Industrial Forklifts",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 4357:1974",
    "new_standard": {
      "is_number": "IS 4357:1974",
      "title": "Methods for Stability Testing of Fork Lift Trucks",
      "publication_year": 1974,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MED 7",
      "division_council": "Mechanical Engineering",
      "scope": "Specifies tilt-table test procedures and stability criteria for electric and internal combustion counterbalanced fork lift trucks up to 10,000 kg capacity.",
      "materials": "Fabricated high-tensile steel mast and chassis, lead-acid / Li-ion battery, AC traction and hydraulic motors.",
      "technical_requirements": "Longitudinal and lateral stability under rated load at maximum mast elevation, forward tilt, braking performance, overhead guard safety (falling object protection FOPS).",
      "performance_requirements": "Zero vehicle tipping over on 4% to 18% slopes under full load; operator safety enclosure.",
      "testing_requirements": "Tilt table stability test (Tests 1 to 4) per Clause 5, dynamic braking distance test per IS 7524.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MED 7 Material Handling Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Factories Act, 1948 (Lifting Machines Safety Rules); Directorate General of Factory Advice Service (DGFASLI)",
      "source_url": "https://dgfasli.gov.in",
      "evidence_excerpt": "All industrial forklifts operated in registered factories must conform to stability and safety standards of IS 4357.",
      "applicability_explanation": "Mandatory statutory factory safety standard for battery operated industrial forklifts.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by MED 7. Mandatory under Factories Act safety rules."
  },
  {
    "canonical_name": "Biomass Fired Industrial Boilers",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IBR 1950 / IS 2825",
    "new_standard": {
      "is_number": "IBR 1950 / IS 2825",
      "title": "Indian Boiler Regulations, 1950 — Design, Construction and Inspection of Steam Boilers",
      "publication_year": 1950,
      "version": "Statutory Code (Amended to 2023)",
      "status": "ACTIVE",
      "technical_committee": "MED 18",
      "division_council": "Mechanical Engineering",
      "scope": "Comprehensive statutory engineering regulations governing the design, materials, welded fabrication, safety fittings, and annual statutory inspection of steam boilers operating above 1.0 kg/cm2 pressure.",
      "materials": "Boiler quality carbon steel plates (conforming to IS 2002 / SA 516 Gr 70), seamless carbon steel boiler tubes (IS 1914 / SA 210), forged steel fittings.",
      "technical_requirements": "Design pressure, maximum allowable working pressure (MAWP), minimum shell and tube sheet thickness, hydraulic test pressure (1.5x MAWP), safety valve relieving capacity (min 100% maximum evaporative capacity), two independent water level indicators, low water level fuel trip.",
      "performance_requirements": "Elimination of catastrophic steam boiler explosions in industrial processing plants.",
      "testing_requirements": "Non-destructive radiographic examination of 100% longitudinal and circumferential welds, hydraulic pressure test witnessed by Chief Inspector of Boilers, safety valve accumulation test.",
      "certification": "Scheme-IV",
      "source": "Central Boilers Board (CBB) / Ministry of Commerce and Industry"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Indian Boilers Act, 1923 (Section 6); Central Boilers Board Statutory Regulations",
      "source_url": "https://dpiit.gov.in/indian-boiler-regulations",
      "evidence_excerpt": "Statutory Law: No steam boiler may be manufactured, imported, erected, or operated in India without formal approval of drawings, material certificates, and commissioning inspection under Indian Boiler Regulations (IBR 1950).",
      "applicability_explanation": "Mandatory statutory law and engineering standard for industrial boilers in India.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Strictly regulated under the Indian Boilers Act, 1923 and IBR 1950."
  },
  {
    "canonical_name": "Boiler Feed Water Pumps",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 5120:1977",
    "new_standard": {
      "is_number": "IS 5120:1977",
      "title": "Technical Requirements for Rotodynamic Special Purpose Pumps",
      "publication_year": 1977,
      "version": "Second Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MED 20",
      "division_council": "Mechanical Engineering",
      "scope": "Specifies technical design, construction, materials, and performance testing for special-purpose centrifugal and multi-stage pumps (including high-pressure boiler feed pumps and chemical process pumps).",
      "materials": "Cast carbon steel / stainless steel / 12% Cr steel casing and impellers, forged alloy steel shaft, mechanical cartridge seals.",
      "technical_requirements": "Discharge pressure (up to 15 MPa), operating temperature (up to 200°C), NPSH required, minimum continuous stable flow, hydraulic balance drum/disc design, mechanical vibration severity per ISO 10816-3 (Zone A <= 2.8 mm/s).",
      "performance_requirements": "Continuous cavitation-free injection of high-pressure feed water into steam boiler drums under fluctuating thermal loads.",
      "testing_requirements": "Hydrostatic casing test at 1.5x maximum discharge pressure, 4-point pump performance hydraulic test per IS 9137 / ISO 9906, mechanical vibration survey.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MED 20 Pumps Sectional Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Indian Boiler Regulations (IBR 1950 Regulation 338 Feed Water Systems); BIS MED 20",
      "source_url": "https://dpiit.gov.in",
      "evidence_excerpt": "Boiler feed pumps must deliver 1.25 times maximum boiler evaporation rate at design boiler pressure and conform to IS 5120.",
      "applicability_explanation": "Mandatory statutory engineering standard for high pressure boiler feed pumps.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by MED 20. Enforced under IBR Regulation 338."
  },
  {
    "canonical_name": "Calorifiers and Thermal Receivers",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 3737:1966",
    "new_standard": {
      "is_number": "IS 3737:1966",
      "title": "Specification for Mild Steel Calorifiers",
      "publication_year": 1966,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MED 19",
      "division_council": "Mechanical Engineering",
      "scope": "Specifies requirements for mild steel storage and non-storage calorifiers for central hot water supply systems in hospitals, hotels, and industrial buildings.",
      "materials": "Fusion-welded mild steel shell with copper or stainless steel internal U-tube heating battery.",
      "technical_requirements": "Design working pressure (up to 1.0 MPa), hydraulic test pressure (1.5x design pressure), shell corrosion allowance (min 1.5 mm), safety relief valve size, thermal heating efficiency.",
      "performance_requirements": "Continuous hot water generation without shell rupture or galvanic tube corrosion.",
      "testing_requirements": "Hydraulic pressure test per Clause 9, radiography of longitudinal welds, thermal output test.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MED 19 Thermal Engineering Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MED 19 Sectional Committee Specifications; CPWD Mechanical Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_3737",
      "evidence_excerpt": "Clause 1: Prescribes requirements for mild steel storage and non-storage calorifiers.",
      "applicability_explanation": "Primary national standard for calorifiers and thermal receivers.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by MED 19."
  },
  {
    "canonical_name": "Chemical Process Pumps",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 5120:1977",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MED 20 Sectional Committee Specifications; Chemical Plant Engineering Standards",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_5120",
      "evidence_excerpt": "Clause 1: Prescribes technical requirements and testing for rotodynamic chemical process pumps.",
      "applicability_explanation": "Primary national engineering standard for chemical process pumps.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by MED 20. Equivalent to ISO 5199 / ISO 2858."
  },
  {
    "canonical_name": "Classic and Wedge Industrial V-Belts",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 2494 (Part 1):1994",
    "new_standard": {
      "is_number": "IS 2494 (Part 1):1994",
      "title": "V-Belts — Endless V-Belts for Industrial Power Transmission: Part 1 Classic and Narrow (Wedge) Belts — Specification",
      "publication_year": 1994,
      "version": "Third Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MED 6",
      "division_council": "Mechanical Engineering",
      "scope": "Specifies dimensions, pitch lengths, and power ratings for classical (A, B, C, D, E) and narrow wedge (SPZ, SPA, SPB, SPC) endless industrial V-belts.",
      "materials": "Chloroprene rubber or EPDM compound reinforced with high-tenacity polyester tension cords and bias-cut rubberized fabric jacket.",
      "technical_requirements": "Pitch width, pitch length tolerances, matching set limits, power rating per belt (kW), antistatic electrical conductivity per ISO 1813, oil and heat resistance.",
      "performance_requirements": "High power transmission efficiency (> 95%) without cord stretch or slip in industrial motor drives.",
      "testing_requirements": "Pitch length measurement on measuring pulleys under proof tension, electrical resistance test per ISO 1813, dynamic flex fatigue test.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MED 6 Machine Elements Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MED 6 Sectional Committee Specifications; ISO 4184 Aligned",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_2494",
      "evidence_excerpt": "Clause 1: Prescribes dimensional and power transmission requirements for industrial endless V-belts.",
      "applicability_explanation": "Primary national standard for classic and wedge industrial V-belts.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by MED 6."
  },
  {
    "canonical_name": "Curved Tooth Flexible Gear Couplings",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 11849:1986",
    "new_standard": {
      "is_number": "IS 11849:1986",
      "title": "Flexible Couplings — Dimensions and Performance Requirements",
      "publication_year": 1986,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MED 6",
      "division_council": "Mechanical Engineering",
      "scope": "Specifies dimensions, torque ratings, and misalignment capacities for curved-tooth crowned gear couplings, pin-bush couplings, and flexible jaw couplings.",
      "materials": "Forged alloy steel hubs and sleeve with precision induction-hardened crowned external and internal involute gear teeth, O-ring grease seals.",
      "technical_requirements": "Nominal torque rating (kNm), maximum permissible angular misalignment (up to 1.5 degrees per gear mesh), axial end float, tooth surface hardness (min 50 HRC).",
      "performance_requirements": "Transmits extreme mechanical torques with torsional rigidity while accommodating thermal shaft expansion and angular misalignment in rolling mills and heavy turbine drives.",
      "testing_requirements": "Tooth profile inspection per IS 2284, static torque proof test, balancing test per ISO 1940 Grade G6.3.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MED 6 Machine Elements Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MED 6 Sectional Committee Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_11849",
      "evidence_excerpt": "Clause 1: Prescribes requirements for flexible gear couplings for industrial machinery shaft connections.",
      "applicability_explanation": "Primary national specification for curved tooth flexible gear couplings.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by MED 6."
  },
  {
    "canonical_name": "Cylindrical Roller Bearings High Radial Capacity",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 6455:1972",
    "new_standard": {
      "is_number": "IS 6455:1972",
      "title": "Rolling Bearings — Boundary Dimensions — Specification",
      "publication_year": 1972,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MED 6",
      "division_council": "Mechanical Engineering",
      "scope": "Specifies boundary dimensions, radial clearances, and tolerances for radial rolling bearings (including cylindrical roller bearings NU, NJ, NUP series and deep groove ball bearings).",
      "materials": "High carbon chromium bearing steel (100Cr6 / SAE 52100 conforming to IS 4398), machined brass or pressed steel cage.",
      "technical_requirements": "Dimensional tolerances (Normal, P6, P5), radial internal clearance (C2, Normal, C3, C4), basic dynamic load rating (Cr), basic static load rating (C0r), rotating run-out accuracy.",
      "performance_requirements": "High radial load capacity and high speed performance in electric traction motors, gearboxes, and vibrating screens.",
      "testing_requirements": "Dimensional inspection per IS 6455, radial clearance measurement per ISO 5753, life rating testing per IS 3824.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MED 6 Rolling Bearings Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MED 6 Sectional Committee Specifications; ISO 15 Aligned",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_6455",
      "evidence_excerpt": "Clause 1: Prescribes boundary dimensions and tolerances for rolling bearings.",
      "applicability_explanation": "Primary national engineering standard for cylindrical roller bearings.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by MED 6."
  },
  {
    "canonical_name": "Deep Groove Ball Bearings Sealed Series",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 6455:1972",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MED 6 Sectional Committee Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_6455",
      "evidence_excerpt": "Clause 1: Prescribes boundary dimensions for deep groove ball bearings with contact seals (2RS) and shields (2Z).",
      "applicability_explanation": "Primary national standard for sealed deep groove ball bearings.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Duplicate entry mapping to IS 6455:1972."
  },
  {
    "canonical_name": "Diaphragm Chemical Metering Pumps",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 13015:1991",
    "new_standard": {
      "is_number": "IS 13015:1991",
      "title": "Controlled Volume Metering Pumps — Specification",
      "publication_year": 1991,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MED 20",
      "division_council": "Mechanical Engineering",
      "scope": "Specifies design, construction, and testing for reciprocating positive displacement controlled volume chemical metering pumps (plunger, hydraulic diaphragm, and mechanical diaphragm types).",
      "materials": "PTFE / composite diaphragm, SS316, Hastelloy-C, or PVDF liquid head, ceramic ball check valves, micrometer stroke adjustment.",
      "technical_requirements": "Flow metering accuracy (steady state accuracy +/- 1.0% over 10% to 100% flow range), linearity (+/- 3%), repeatability (+/- 3%), discharge pressure (up to 20 MPa), zero chemical leakage (double diaphragm with rupture sensor).",
      "performance_requirements": "Micro-dosing of hazardous acids, alkalis, biocides, and boiler treatment chemicals without environmental leakage.",
      "testing_requirements": "Steady state accuracy test across 5 stroke settings per Annex B, hydrostatic liquid end test at 1.5x design pressure.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MED 20 Pumps Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MED 20 Sectional Committee Specifications; API 675 Aligned",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_13015",
      "evidence_excerpt": "Clause 1: Prescribes requirements for controlled volume positive displacement chemical metering pumps.",
      "applicability_explanation": "Primary national specification for chemical metering diaphragm pumps.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by MED 20."
  },
  {
    "canonical_name": "Direct Acting Water Pressure Reducing Valves",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 9739:1981",
    "new_standard": {
      "is_number": "IS 9739:1981",
      "title": "Pressure Reducing Valves for Domestic and Industrial Water Supply Systems — Specification",
      "publication_year": 1981,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MED 17",
      "division_council": "Mechanical Engineering",
      "scope": "Specifies requirements for direct-acting spring-loaded and diaphragm-operated pressure reducing valves (PRVs) for building and industrial water piping.",
      "materials": "Cast bronze or ductile iron body, stainless steel trim, EPDM reinforced fabric diaphragm, stainless steel control spring.",
      "technical_requirements": "Nominal pressure rating (PN 16), inlet pressure (up to 1.6 MPa), adjustable reduced outlet pressure (0.1 to 0.6 MPa), pressure regulation accuracy (+/- 10%), hydraulic body proof pressure (2.4 MPa), seat leakage zero.",
      "performance_requirements": "Protects downstream plumbing, fixtures, and boilers from destructive water hammer and high city main pressure.",
      "testing_requirements": "Hydrostatic shell test per Clause 8, seat leak test under differential pressure, dynamic pressure reduction test.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MED 17 Valves Sectional Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MED 17 Sectional Committee Specifications; CPWD Plumbing Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_9739",
      "evidence_excerpt": "Clause 1: Prescribes construction and performance requirements for water pressure reducing valves.",
      "applicability_explanation": "Primary national specification for water pressure reducing valves.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by MED 17."
  },
  {
    "canonical_name": "Dual Plate Wafer Non-Return Valves",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 5312 (Part 2):1986",
    "new_standard": {
      "is_number": "IS 5312 (Part 2):1986",
      "title": "Swing Check Type Reflux (Non-Return) Valves for Waterworks Purposes: Part 2 Multi-Door Pattern",
      "publication_year": 1986,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MED 17",
      "division_council": "Mechanical Engineering",
      "scope": "Specifies requirements for multi-door, wafer, and dual-plate check (non-return) valves for water transmission pipelines.",
      "materials": "Ductile iron / cast steel body, dual semicircular bronze or stainless steel plates, Inconel torsion springs, resilient EPDM or metal seat.",
      "technical_requirements": "Nominal size (DN 50 to DN 1200), pressure rating (PN 10 / PN 16 / PN 25), fast dynamic spring-assisted closure (< 0.2 s), head loss coefficient, zero reverse flow water hammer slam.",
      "performance_requirements": "Eliminates water hammer pressure surges protecting large centrifugal pumps upon sudden electrical power failure.",
      "testing_requirements": "Hydrostatic body test at 1.5x PN, seat leakage test at 1.1x PN, dynamic reverse flow slam test.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MED 17 Valves Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MED 17 Sectional Committee Specifications; CPHEEO Water Supply Manual",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_5312",
      "evidence_excerpt": "Clause 1: Prescribes requirements for multi-door and dual plate non-return check valves.",
      "applicability_explanation": "Primary national standard for dual plate wafer non-return valves.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by MED 17."
  },
  {
    "canonical_name": "Electric Motorized Control Valves 4-20mA",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 10189 (Part 1):1982",
    "new_standard": {
      "is_number": "IS 10189 (Part 1):1982",
      "title": "Industrial Process Control Valves: Part 1 General Conditions",
      "publication_year": 1982,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MED 17",
      "division_council": "Mechanical Engineering",
      "scope": "Specifies requirements and testing for globe and rotary industrial process control valves actuated by electric motorized or pneumatic positioners responding to 4-20 mA analog control signals.",
      "materials": "Cast carbon steel / stainless steel body, linear or equal-percentage trim, electric quarter-turn/linear servo actuator.",
      "technical_requirements": "Flow coefficient (Cv), rangeability (min 30:1 to 50:1), hysteresis and deadband (max 0.5%), positioning linearity (+/- 1.0%), seat leakage class (ANSI/FCI 70-2 Class IV or VI bubble-tight).",
      "performance_requirements": "Precise throttling control of chemical process fluid temperature, pressure, and flow in automated process plants.",
      "testing_requirements": "Cv testing per IEC 60534-2-3, actuator response time test, seat leakage test per ANSI/FCI 70-2.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MED 17 Process Measurement Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MED 17 Sectional Committee Specifications; ISA / IEC 60534 Aligned",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_10189",
      "evidence_excerpt": "Clause 1: Prescribes testing and control characteristics for motorized process control valves.",
      "applicability_explanation": "Primary national standard for electric motorized process control valves.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by MED 17."
  },
  {
    "canonical_name": "Fire Fighting Booster Pumps",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 15301:2003",
    "new_standard": {
      "is_number": "IS 15301:2003",
      "title": "Installation and Maintenance of Fire Fighting Pumps — Code of Practice",
      "publication_year": 2003,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MED 22",
      "division_council": "Mechanical Engineering",
      "scope": "Specifies selection, installation, performance testing, and maintenance of stationary fire fighting pumps (horizontal split-case, end-suction, and vertical turbine booster pumps) for building fire protection.",
      "materials": "Ductile iron / bronze casing, bronze impeller, stainless steel shaft, diesel engine / electric motor prime mover.",
      "technical_requirements": "Rated flow (e.g. 2280 to 2850 l/min), rated head (min 0.7 MPa to 1.0 MPa), shut-off head (not exceeding 140% of rated head), delivery at 150% rated flow (min 65% of rated head), automatic start on pressure drop.",
      "performance_requirements": "Guaranteed water delivery during emergency fire hydrant and sprinkler operation without cavitation.",
      "testing_requirements": "Hydrostatic casing test, hydraulic performance curve test, automatic starting panel verification per NBC Part 4.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MED 22 / National Building Code of India (NBC)"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "National Building Code of India (NBC Part 4 Fire and Life Safety); State Fire Safety Acts",
      "source_url": "https://cpwd.gov.in",
      "evidence_excerpt": "Mandatory compliance with IS 15301 for fire fighting booster pumps installed in high-rise buildings and commercial complexes.",
      "applicability_explanation": "Mandatory statutory fire safety standard for building fire fighting booster pumps.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by MED 22. Mandatory under NBC Part 4 and State Fire Force Acts."
  },
  {
    "canonical_name": "Flexible Jaw Couplings with Elastomer Spider",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 11849:1986",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MED 6 Sectional Committee Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_11849",
      "evidence_excerpt": "Clause 1: Specifies dimensions and performance for elastomer spider flexible jaw couplings.",
      "applicability_explanation": "Primary national standard for flexible jaw couplings.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Duplicate entry mapping to IS 11849:1986."
  },
  {
    "canonical_name": "Gasketed Plate Heat Exchangers (PHE)",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 14590:1998",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MED 19 Sectional Committee Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_14590",
      "evidence_excerpt": "Clause 1: Specifies requirements for gasketed plate heat exchangers.",
      "applicability_explanation": "Primary national standard for gasketed plate heat exchangers.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Duplicate entry mapping to IS 14590:1998."
  },
  {
    "canonical_name": "Heavy Duty Hand Chain Pulley Blocks",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 3832:2005",
    "new_standard": {
      "is_number": "IS 3832:2005",
      "title": "Hand-Operated Chain Pulley Blocks — Specification",
      "publication_year": 2005,
      "version": "Fourth Revision (Reaffirmed 2020)",
      "status": "ACTIVE",
      "technical_committee": "MED 7",
      "division_council": "Mechanical Engineering",
      "scope": "Specifies requirements for hand-operated chain pulley blocks (spur gear / planetary gear type, working load limits 0.5 tonnes to 30 tonnes).",
      "materials": "High tensile steel alloy load chain (Grade 80 / Grade T per IS 6216), forged alloy steel hooks (IS 8610), ratchet pawl brake with asbestos-free friction discs.",
      "technical_requirements": "Proof load test (withstands 150% of rated working load limit), mechanical efficiency (effort on hand chain), automatic Weston-type load brake holding load indefinitely at any elevation without slipping, hook throat opening under overload.",
      "performance_requirements": "Safe manual lifting in shipyards, power plants, and mines without load drop under sudden release of hand chain.",
      "testing_requirements": "Static proof test at 1.5x WLL for 5 minutes, dynamic brake test at 1.25x WLL, hook deformation test.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MED 7 Material Handling Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Factories Act, 1948 (Section 29 Lifting Appliances); DGFASLI Safety Norms",
      "source_url": "https://dgfasli.gov.in",
      "evidence_excerpt": "Mandatory statutory testing: All chain pulley blocks used in industrial premises must carry manufacturer proof test certificate conforming to IS 3832.",
      "applicability_explanation": "Mandatory statutory lifting appliance safety standard for chain pulley blocks.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by MED 7. Enforced under Section 29 of the Factories Act."
  },
  {
    "canonical_name": "Heavy Duty Hydraulic Bottle Jacks",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 4552:1993",
    "new_standard": {
      "is_number": "IS 4552:1993",
      "title": "Automotive Vehicles — Portable Hydraulic Trolley and Bottle Jacks — Specification",
      "publication_year": 1993,
      "version": "Second Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MED 7",
      "division_council": "Mechanical Engineering",
      "scope": "Specifies requirements and testing for portable hydraulic bottle jacks and garage trolley jacks (capacity 1 tonne to 50 tonnes).",
      "materials": "Forged steel base and cylinder, hard-chrome plated piston ram, safety overload relief bypass valve.",
      "technical_requirements": "Proof load test (withstands 150% rated capacity for 10 minutes without pressure drop), hydraulic oil leak tightness under load, minimum closed height and lift stroke, safety relief valve cracking pressure (110% to 125% rated load).",
      "performance_requirements": "Zero vehicle drop or hydraulic seal blowout during heavy truck axle lifting.",
      "testing_requirements": "Static overload test at 1.5x rated load, dynamic lifting test at 1.25x load, oil seal endurance test over 100 full cycles.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MED 7 Material Handling Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Automotive Industry Standard AIS-110; Central Motor Vehicles Rules (CMVR); DGFASLI",
      "source_url": "https://morth.nic.in",
      "evidence_excerpt": "Hydraulic jacks supplied as vehicle emergency tools or used in automotive workshops must comply with IS 4552.",
      "applicability_explanation": "Mandatory statutory standard for automotive hydraulic bottle jacks.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by MED 7."
  },
  {
    "canonical_name": "Helical Bevel Gear Reduction Units",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 7403:1974",
    "new_standard": {
      "is_number": "IS 7403:1974",
      "title": "Code of Practice for Selection of Standard Industrial Gear Units",
      "publication_year": 1974,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MED 6",
      "division_council": "Mechanical Engineering",
      "scope": "Provides rating formulas, service factors, and selection guidelines for helical, spur, bevel, and bevel-helical speed reduction gear units.",
      "materials": "Cast iron or fabricated steel gear casing, case-carburized and ground alloy steel gears (17CrNiMo6), taper roller bearing supports.",
      "technical_requirements": "Thermal power rating, mechanical power rating, gear tooth pitting resistance per IS 4460, tooth bending strength, lubrication system, oil temperature rise (max 50°C above ambient).",
      "performance_requirements": "Smooth silent power transmission with efficiency > 96% in cement kilns, conveyors, and mining drives.",
      "testing_requirements": "Full load continuous run test, sound level measurement (max 85 dBA at 1 m), oil leak check.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MED 6 Machine Elements Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MED 6 Sectional Committee Specifications; AGMA / ISO 6336 Aligned",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_7403",
      "evidence_excerpt": "Clause 1: Prescribes selection and power rating code for enclosed industrial gear reduction units.",
      "applicability_explanation": "Primary national engineering standard for helical bevel gear reduction units.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by MED 6."
  },
  {
    "canonical_name": "High-Pressure Hydraulic Piston Pumps",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 5120:1977",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MED 20 Sectional Committee Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_5120",
      "evidence_excerpt": "Clause 1: Prescribes performance testing for high pressure positive displacement hydraulic piston pumps.",
      "applicability_explanation": "Primary national standard for high-pressure hydraulic piston pumps.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by MED 20."
  },
  {
    "canonical_name": "High Performance Double Offset Butterfly Valves",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 13095:1991",
    "new_standard": {
      "is_number": "IS 13095:1991",
      "title": "Butterfly Valves for General Purposes — Specification",
      "publication_year": 1991,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MED 17",
      "division_council": "Mechanical Engineering",
      "scope": "Specifies requirements for concentric, double-offset, and triple-offset butterfly valves (wafer, lugged, and flanged types) for isolation and throttling.",
      "materials": "Cast carbon steel WCB or ductile iron body, stainless steel disc, PTFE or metal seat, eccentric double offset shaft.",
      "technical_requirements": "Pressure rating (PN 10 to PN 40), bubble-tight shut-off (ISO 5208 Rate A), torque requirements, fire-safe testing per API 607, face-to-face dimensions per ISO 5752.",
      "performance_requirements": "Camming disc action lifting disc off seat immediately upon opening, preventing seat wear in power plant cooling water and process lines.",
      "testing_requirements": "Shell hydrostatic test at 1.5x PN, bidirectional seat leakage test, operating torque verification.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MED 17 Valves Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MED 17 Sectional Committee Specifications; NTPC Piping Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_13095",
      "evidence_excerpt": "Clause 1: Prescribes design, materials, dimensions and testing for industrial butterfly valves.",
      "applicability_explanation": "Primary national standard for high performance double offset butterfly valves.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by MED 17."
  },
  {
    "canonical_name": "Hydraulic Dock Levellers",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 4357:1974",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MED 7 Sectional Committee Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_4357",
      "evidence_excerpt": "Clause 1: Prescribes stability and mechanical safety requirements for loading dock equipment.",
      "applicability_explanation": "Primary national standard for hydraulic dock levellers.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by MED 7."
  },
  {
    "canonical_name": "Hydraulic Power Pack Pumps",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 5120:1977",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MED 20 Sectional Committee Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_5120",
      "evidence_excerpt": "Clause 1: Prescribes testing for hydraulic power pack fluid pumps.",
      "applicability_explanation": "Primary national standard for hydraulic power pack pumps.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Duplicate entry mapping to IS 5120:1977."
  },
  {
    "canonical_name": "Hydraulic Workshop Garage Presses",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 4552:1993",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MED 7 Sectional Committee Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_4552",
      "evidence_excerpt": "Clause 1: Prescribes hydraulic cylinder and safety bypass requirements for workshop hydraulic presses.",
      "applicability_explanation": "Primary national standard for hydraulic workshop presses.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by MED 7."
  },
  {
    "canonical_name": "Industrial Chimneys and Stacks",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 6533 (Part 1):1989",
    "new_standard": {
      "is_number": "IS 6533 (Part 1):1989",
      "title": "Design and Construction of Steel Chimneys — Code of Practice: Part 1 Mechanical Aspects",
      "publication_year": 1989,
      "version": "Second Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MED 18",
      "division_council": "Mechanical Engineering",
      "scope": "Specifies mechanical design, structural sizing, wind oscillation damping, and corrosion protection for self-supporting and guyed industrial steel chimneys and stacks.",
      "materials": "Structural steel plates (IS 2062), internal refractory or borosilicate glass brick lining, external aerodynamic helical strakes.",
      "technical_requirements": "Wind load computation, along-wind and cross-wind vortex shedding resonance response, seismic acceleration, foundation anchor bolt sizing, flue gas corrosion allowance, lightning protection.",
      "performance_requirements": "Structural stability preventing aerodynamic fatigue collapse under high wind gusts; thermal resistance to corrosive flue gases.",
      "testing_requirements": "Dynamic natural frequency calculation, radiographic inspection of shell butt welds, anchor bolt pull test.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MED 18 / CPCB Stack Height Regulations"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Central Pollution Control Board (CPCB) Stack Height Regulations; Factories Act Safety Rules",
      "source_url": "https://cpcb.nic.in",
      "evidence_excerpt": "Mandatory structural design code for all industrial steel chimney stacks dispersing boiler and furnace emissions under Air Act.",
      "applicability_explanation": "Mandatory statutory engineering standard for industrial steel chimneys and stacks.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by MED 18. Mandatory under environmental and factory safety laws."
  },
  {
    "canonical_name": "Industrial Goods Elevators 2000 kg",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 14665 (Part 1):2000",
    "new_standard": {
      "is_number": "IS 14665 (Part 1):2000",
      "title": "Electric Traction Lifts: Part 1 Guidelines for Outline Dimensions of Passenger, Goods, Service and Hospital Lifts",
      "publication_year": 2000,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MED 9",
      "division_council": "Mechanical Engineering",
      "scope": "Specifies outline dimensions, well hole, machine room, and structural safety requirements for electric traction goods elevators (Class A, B, C loading up to 5000 kg).",
      "materials": "Structural steel guide rails, counterweights, traction hoisting machine, car frame with safety gear.",
      "technical_requirements": "Rated load (2000 kg), speed, car platform area, door opening, progressive safety gear arrest under free-fall overspeed, overspeed governor tripping speed, buffer stroke.",
      "performance_requirements": "Absolute passenger and freight safety; instantaneous emergency stopping if suspension ropes sever.",
      "testing_requirements": "Overspeed governor trip test, safety gear drop test under 125% rated load, buffer impact test per IS 14665 (Part 2).",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MED 9 / State Lift Acts and Rules"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "State Lift and Escalator Acts (e.g. Maharashtra / Delhi / Karnataka Lift Rules); BIS MED 9",
      "source_url": "https://pwd.maharashtra.gov.in",
      "evidence_excerpt": "Mandatory statutory compliance: Every industrial goods lift and hoist installed in India must obtain statutory license from the Lift Inspector conforming to IS 14665.",
      "applicability_explanation": "Mandatory statutory elevator safety standard for industrial goods elevators.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by MED 9. Enforced under State Lift Acts."
  },
  {
    "canonical_name": "Industrial Scissor Lift Tables",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 4357:1974",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MED 7 Sectional Committee Specifications; Factories Act Safety Rules",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_4357",
      "evidence_excerpt": "Hydraulic scissor lifting tables operate under industrial lifting safety standards of MED 7.",
      "applicability_explanation": "Primary national safety standard for industrial scissor lift tables.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by MED 7."
  },
  {
    "canonical_name": "Industrial Steel Gate, Globe and Check Valves",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 14846:2000",
    "new_standard": {
      "is_number": "IS 14846:2000",
      "title": "Sluice Valves for Water Works Purposes (50 to 1200 mm Size) — Specification",
      "publication_year": 2000,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MED 17",
      "division_council": "Mechanical Engineering",
      "scope": "Specifies requirements for flanged cast iron and cast steel sluice gate valves, globe valves, and check valves for waterworks, industrial piping, and fire systems.",
      "materials": "Cast steel / ductile iron body, stainless steel stem, bronze / stainless steel trim rings.",
      "technical_requirements": "Nominal size (DN 50 to 1200), pressure rating (PN 10 to PN 16), seat leakage zero, torque on handwheel, clear waterway diameter.",
      "performance_requirements": "Reliable long-term line isolation in cross-country municipal water transmission pipelines.",
      "testing_requirements": "Hydrostatic body test at 1.5x PN, seat test at 1.0x PN, operating torque test per Annex B.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MED 17 / CPHEEO Manual"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "DPIIT Valves (Quality Control) Order; CPHEEO Water Supply Manual",
      "source_url": "https://dpiit.gov.in",
      "evidence_excerpt": "Compulsory Scheme-I ISI marking for sluice valves conforming to IS 14846 used in municipal and industrial waterworks.",
      "applicability_explanation": "Mandatory statutory specification for industrial gate and sluice valves.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by MED 17. Compulsory ISI mark under Valves QCO."
  },
  {
    "canonical_name": "Industrial Water-Ring Vacuum Pumps",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 6849:1973",
    "new_standard": {
      "is_number": "IS 6849:1973",
      "title": "Specification for Liquid Ring Vacuum Pumps and Compressors",
      "publication_year": 1973,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MED 20",
      "division_council": "Mechanical Engineering",
      "scope": "Specifies requirements, testing, and performance for liquid ring (water ring) vacuum pumps used in paper mills, thermal power condensers, chemical distillation, and sugar manufacturing.",
      "materials": "Cast iron / stainless steel 316 casing, eccentric rotor with radial forward-curved blades, mechanical seals.",
      "technical_requirements": "Suction capacity (m3/h), ultimate vacuum (down to 33 mbar absolute with 15°C water sealant), power consumption, isothermal compression efficiency, capability to handle wet gas, condensable vapours, and carryover liquids without damage.",
      "performance_requirements": "Explosion-proof isothermal gas compression without internal metallic contact; reliable vacuum priming.",
      "testing_requirements": "Vacuum suction capacity test per Annex B using calibrated orifice plate, power measurement per IS 9137.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MED 20 Pumps Sectional Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MED 20 Sectional Committee Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_6849",
      "evidence_excerpt": "Clause 1: Specifies performance and test methods for industrial liquid ring vacuum pumps.",
      "applicability_explanation": "Primary national standard for liquid ring vacuum pumps.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by MED 20."
  },
  {
    "canonical_name": "Liquid Ring Vacuum Pump Packages",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 6849:1973",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MED 20 Sectional Committee Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_6849",
      "evidence_excerpt": "Clause 1: Prescribes requirements for liquid ring vacuum pump skid packages.",
      "applicability_explanation": "Primary national standard for liquid ring vacuum packages.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Duplicate entry mapping to IS 6849:1973."
  },
  {
    "canonical_name": "Manual Chain Pulley Blocks",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 3832:2005",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Factories Act 1948; DGFASLI",
      "source_url": "https://dgfasli.gov.in",
      "evidence_excerpt": "Clause 1: Prescribes requirements for hand operated spur gear chain blocks.",
      "applicability_explanation": "Mandatory statutory standard for manual chain pulley blocks.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Duplicate entry mapping to IS 3832:2005."
  },
  {
    "canonical_name": "Oil-Free Rotary Tooth Air Compressors",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 5456:2006",
    "new_standard": {
      "is_number": "IS 5456:2006",
      "title": "Code of Practice for Testing of Positive Displacement Type Air Compressors and Exhausters",
      "publication_year": 2006,
      "version": "Third Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MED 22",
      "division_council": "Mechanical Engineering",
      "scope": "Specifies methods of acceptance testing and performance calculation for positive displacement air compressors (reciprocating, rotary screw, and rotary tooth).",
      "materials": "Rotary compression elements, intercoolers, electric motor drive, acoustic canopy.",
      "technical_requirements": "Free Air Delivery FAD (m3/min), specific power consumption (kW/m3/min), working discharge pressure, ISO 8573-1 Class 0 air purity (zero oil aerosols, oil vapours, or liquid oil carryover).",
      "performance_requirements": "100% oil-free compressed air for pharmaceutical manufacturing, semiconductor cleanrooms, and food processing.",
      "testing_requirements": "FAD nozzle measurement per Annex B conforming to ISO 1217, total oil carryover test per ISO 8573-2.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MED 22 Compressors Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MED 22 Sectional Committee Specifications; ISO 1217 Aligned",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_5456",
      "evidence_excerpt": "Clause 1: Prescribes testing codes and free air delivery determination for rotary compressors.",
      "applicability_explanation": "Primary national engineering standard for rotary tooth and screw air compressors.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by MED 22. Aligned with ISO 1217."
  },
  {
    "canonical_name": "Overhead Double Girder EOT Cranes 20T",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 3177:1999",
    "new_standard": {
      "is_number": "IS 3177:1999",
      "title": "Electric Overhead Travelling Cranes and Gantry Cranes Other than Steel Works Cranes — Code of Practice",
      "publication_year": 1999,
      "version": "Second Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MED 7",
      "division_council": "Mechanical Engineering",
      "scope": "Provides rules for the structural, mechanical and electrical design, fabrication, and testing of electric overhead travelling (EOT) cranes (Class 1 to Class 4 duty).",
      "materials": "Fabricated structural steel box girders (IS 2062), forged steel wheels, wire rope hoisting crab, electro-hydraulic thruster brakes.",
      "technical_requirements": "Structural deflection (max 1/1000 of span under full load), safe working load (SWL 20 tonnes), proof load test (125% of SWL), factor of safety for wire ropes (min 5 to 7), mechanical gear design per IS 4460, electrical safety per IS 13947.",
      "performance_requirements": "Fail-safe heavy industrial material handling in steel warehouses, turbine halls, and heavy machine shops.",
      "testing_requirements": "Static deflection test, dynamic overload test at 1.25x SWL, non-destructive ultrasonic testing of butt welds.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MED 7 Material Handling Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Factories Act, 1948 (Section 29 Lifting Machinery); DGFASLI Crane Safety Rules",
      "source_url": "https://dgfasli.gov.in",
      "evidence_excerpt": "Statutory mandate: EOT cranes must be designed and proof-tested per IS 3177 and certified by Competent Person every 12 months.",
      "applicability_explanation": "Mandatory statutory engineering and safety code for electric overhead travelling cranes in India.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by MED 7. Enforced under Factories Act Section 29."
  },
  {
    "canonical_name": "Packaged Oil/Gas Fired Boilers",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IBR 1950 / IS 2825",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Indian Boilers Act 1923; Central Boilers Board",
      "source_url": "https://dpiit.gov.in/indian-boiler-regulations",
      "evidence_excerpt": "Statutory Law: Packaged oil and gas fired steam boilers must strictly comply with IBR 1950 standards and obtain statutory registration from Chief Inspector of Boilers.",
      "applicability_explanation": "Mandatory statutory engineering standard for packaged oil and gas boilers.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Mandatory under Indian Boilers Act, 1923."
  },
  {
    "canonical_name": "Plate Type Heat Exchangers",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 14590:1998",
    "new_standard": {
      "is_number": "IS 14590:1998",
      "title": "Gasketed Plate Heat Exchangers — Specification",
      "publication_year": 1998,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MED 19",
      "division_council": "Mechanical Engineering",
      "scope": "Specifies requirements for gasketed plate heat exchangers (PHE) used in chemical processing, dairy pasteurization, HVAC, and industrial cooling.",
      "materials": "Corrugated stainless steel (SS304/SS316) or titanium plates, elastomeric gaskets (NBR, EPDM, Viton), heavy carbon steel frame with tightening bolts.",
      "technical_requirements": "Design pressure (up to 2.5 MPa), operating temperature (-20°C to 180°C), herringbone chevron corrugation angle, gasket retention channel, hydraulic test pressure (1.3x to 1.5x design pressure).",
      "performance_requirements": "Ultra-high thermal heat transfer efficiency (U-values up to 5000 W/m2.K) with close approach temperatures (down to 1°C); zero cross-contamination of streams.",
      "testing_requirements": "Hydrostatic leak test of both channels simultaneously and independently, dye penetrant examination of deep-drawn plate pressings.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MED 19 Thermal Engineering Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MED 19 Sectional Committee Specifications; Dairy and Food Engineering Guidelines",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_14590",
      "evidence_excerpt": "Clause 1: Prescribes construction and performance requirements for gasketed plate heat exchangers.",
      "applicability_explanation": "Primary national standard for plate type heat exchangers.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by MED 19."
  },
  {
    "canonical_name": "Positive Displacement Gear Pumps",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 5120:1977",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MED 20 Sectional Committee Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_5120",
      "evidence_excerpt": "Clause 1: Prescribes requirements for positive displacement rotary gear pumps for lubricating and fuel oils.",
      "applicability_explanation": "Primary national standard for positive displacement gear pumps.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by MED 20."
  },
  {
    "canonical_name": "Reciprocating High Pressure Air Compressors",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 5456:2006",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MED 22 Sectional Committee Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_5456",
      "evidence_excerpt": "Clause 1: Prescribes testing code for multi-stage reciprocating high pressure air compressors.",
      "applicability_explanation": "Primary national standard for reciprocating high pressure air compressors.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Duplicate entry mapping to IS 5456:2006."
  },
  {
    "canonical_name": "Rolling Bearings — Deep Groove Ball Bearings and Taper Roller Bearings",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 6455:1972",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MED 6 Sectional Committee Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_6455",
      "evidence_excerpt": "Clause 1: Specifies boundary dimensions and load ratings for deep groove ball bearings and taper roller bearings.",
      "applicability_explanation": "Primary national standard for rolling bearings.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Duplicate entry mapping to IS 6455:1972."
  },
  {
    "canonical_name": "Rotary Screw Air Compressors Oil-Injected",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 5456:2006",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MED 22 Sectional Committee Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_5456",
      "evidence_excerpt": "Clause 1: Specifies testing procedures for oil-injected rotary screw air compressors.",
      "applicability_explanation": "Primary national standard for oil-injected rotary screw air compressors.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Duplicate entry mapping to IS 5456:2006."
  },
  {
    "canonical_name": "Rotary Screw Industrial Air Compressors",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 5456:2006",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MED 22 Sectional Committee Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_5456",
      "evidence_excerpt": "Clause 1: Specifies performance and acceptance criteria for industrial rotary screw air compressors.",
      "applicability_explanation": "Primary national standard for rotary screw air compressors.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Duplicate entry mapping to IS 5456:2006."
  },
  {
    "canonical_name": "Rough Terrain Diesel Forklifts 3-Tonne",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 4357:1974",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Factories Act 1948; DGFASLI Safety Norms",
      "source_url": "https://dgfasli.gov.in",
      "evidence_excerpt": "Clause 1: Prescribes stability and dynamic load testing for rough terrain and industrial forklift trucks.",
      "applicability_explanation": "Mandatory statutory safety standard for diesel forklifts.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Duplicate entry mapping to IS 4357:1974."
  },
  {
    "canonical_name": "Safety Relief Valves for Boilers & Pressure Vessels",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 3687:1977",
    "new_standard": {
      "is_number": "IS 3687:1977",
      "title": "Pressure Relief Valves — Specification",
      "publication_year": 1977,
      "version": "First Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MED 17",
      "division_council": "Mechanical Engineering",
      "scope": "Specifies design, construction, set pressure tolerances, relieving capacity, and testing of direct spring-loaded safety valves and relief valves for boilers and unfired pressure vessels.",
      "materials": "Cast steel WCB / forged steel body, stainless steel nozzle and disc, alloy steel spring protected from process steam.",
      "technical_requirements": "Set pressure tolerance (+/- 3% or +/- 0.15 bar), overpressure accumulation (max 10% of set pressure), blowdown reseating pressure (within 7% to 10% of set pressure), rated discharge capacity certification per IBR.",
      "performance_requirements": "Ultimate mechanical overpressure protection preventing catastrophic vessel rupture under runaway thermal or pressure conditions.",
      "testing_requirements": "Steam lift and capacity flow test at certified National Board / IBR flow test facility, seat tightness test with air/steam.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MED 17 / Central Boilers Board (IBR)"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Indian Boiler Regulations, 1950 (Chapter III Safety Valves); SMPV Rules",
      "source_url": "https://dpiit.gov.in",
      "evidence_excerpt": "Statutory Law: Every boiler and pressure vessel must be fitted with at least two independent safety valves conforming to IBR and IS 3687.",
      "applicability_explanation": "Mandatory statutory safety engineering standard for safety relief valves in India.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by MED 17. Mandatory under IBR and SMPV Rules."
  },
  {
    "canonical_name": "Seamless Steel Cylinders for High-Pressure Industrial & Medical Gases",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 7285 (Part 2):2017",
    "new_standard": {
      "is_number": "IS 7285 (Part 2):2017",
      "title": "Refillable Seamless Steel Gas Cylinders — Specification: Part 2 Quenched and Tempered Steel Cylinders with Tensile Strength Less Than 1100 MPa",
      "publication_year": 2017,
      "version": "Third Revision",
      "status": "ACTIVE",
      "technical_committee": "MED 16",
      "division_council": "Mechanical Engineering",
      "scope": "Specifies requirements for seamless quenched and tempered steel gas cylinders (water capacity 0.5 litres to 150 litres) for industrial gases (nitrogen, argon, hydrogen) and medical oxygen.",
      "materials": "High strength alloy steel (chromium-molybdenum 34CrMo4) manufactured by hot forging/billet piercing.",
      "technical_requirements": "Test pressure (250 to 300 bar), working pressure (150 to 200 bar), minimum wall thickness, flattening test without cracking, hydraulic burst test (burst pressure >= 1.6x test pressure), Charpy V-notch impact toughness at -20°C and -50°C (min 35 J).",
      "performance_requirements": "Absolute containment of high-pressure compressed gases without catastrophic ductile rupture or brittle fragmentation.",
      "testing_requirements": "Hydraulic volumetric expansion test (permanent expansion < 10% of total expansion), ultrasonic inspection of 100% cylinder wall for laminations, mechanical burst test per Annex B.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MED 16 / Petroleum and Explosives Safety Organization (PESO)"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Petroleum and Explosives Safety Organization (PESO) Gas Cylinder Rules, 2016; DPIIT Gas Cylinders QCO",
      "source_url": "https://peso.gov.in/gas-cylinder-rules-2016",
      "evidence_excerpt": "Statutory Law under Gas Cylinder Rules: Every seamless steel gas cylinder imported or manufactured in India must strictly conform to IS 7285 and possess PESO design approval and BIS Scheme-I ISI mark.",
      "applicability_explanation": "Mandatory statutory safety standard for seamless steel gas cylinders in India.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by MED 16. Compulsory PESO approval and BIS ISI mark."
  },
  {
    "canonical_name": "Seamless Steel Cylinders for Medical Oxygen",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 7285 (Part 2):2017",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "PESO Gas Cylinder Rules 2016; CDSCO Medical Device Rules",
      "source_url": "https://peso.gov.in/gas-cylinder-rules-2016",
      "evidence_excerpt": "Compulsory Scheme-I ISI marking and PESO certification for all medical oxygen seamless steel cylinders conforming to IS 7285.",
      "applicability_explanation": "Mandatory statutory specification for medical oxygen gas cylinders.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Duplicate entry mapping to IS 7285 (Part 2):2017."
  },
  {
    "canonical_name": "Seamless Steel Gas Cylinders for CNG",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 15490:2004",
    "new_standard": {
      "is_number": "IS 15490:2004",
      "title": "Cylinders for the On-Board Storage of Compressed Natural Gas (CNG) as a Fuel for Automotive Vehicles — Specification",
      "publication_year": 2004,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MED 16",
      "division_council": "Mechanical Engineering",
      "scope": "Specifies requirements for lightweight seamless steel gas cylinders (CNG-1 type) permanently installed on automotive vehicles for on-board compressed natural gas storage at 200 bar.",
      "materials": "Chromium-molybdenum high strength alloy steel quenched and tempered.",
      "technical_requirements": "Working pressure (200 bar at 15°C), hydraulic test pressure (300 bar), minimum burst pressure (min 450 bar), bonfire fire test (must vent safely through PRD without exploding), penetration bullet test, ambient temperature pressure cycling (15,000 cycles without failure).",
      "performance_requirements": "Crash and fire safety of on-board vehicle CNG fuel cylinders under severe road collision scenarios.",
      "testing_requirements": "Hydraulic fatigue cycle test, bonfire engulfment test per Annex C, ultrasonic examination.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MED 16 / PESO / CMVR Rule 115B"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "PESO Gas Cylinder Rules 2016; Central Motor Vehicles Rules (CMVR Rule 115B)",
      "source_url": "https://peso.gov.in/gas-cylinder-rules-2016",
      "evidence_excerpt": "Mandatory statutory requirement: All on-board CNG fuel cylinders installed in automotive vehicles in India must conform to IS 15490 and carry PESO and BIS certifications.",
      "applicability_explanation": "Mandatory statutory automotive gas cylinder standard for CNG on-board vehicle cylinders.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by MED 16. Enforced under PESO and CMVR."
  },
  {
    "canonical_name": "Sewage and Drainage Sump Pumps",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 14605:1998",
    "new_standard": {
      "is_number": "IS 14605:1998",
      "title": "Submersible Sewage and Drainage Pumps — Specification",
      "publication_year": 1998,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MED 20",
      "division_council": "Mechanical Engineering",
      "scope": "Specifies requirements for single-stage submersible centrifugal pumps driven by integral IP68 electric motors for pumping sewage, municipal wastewater, storm drainage, and sludge containing solids.",
      "materials": "Cast iron Grade FG 200 / 260 casing, non-clog single or dual-vane vortex impeller, dual mechanical face seals in oil chamber.",
      "technical_requirements": "Discharge flow (m3/h), total head, solid handling capability (spherical solids clearance min 50 mm to 100 mm without choking), motor insulation Class F/H, moisture ingress sensor.",
      "performance_requirements": "Continuous non-clogging wastewater drainage in municipal sewage pumping stations and building basements.",
      "testing_requirements": "Performance test per IS 9137, sphere passage test per Annex B, motor water tightness test at 0.3 MPa.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MED 20 / CPHEEO Sewerage Manual"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "CPHEEO Manual on Sewerage and Sewage Treatment; BIS MED 20 Specifications",
      "source_url": "https://mohua.gov.in",
      "evidence_excerpt": "Mandatory compliance with IS 14605 for submersible non-clog sewage pumps in municipal sewerage contracts.",
      "applicability_explanation": "Mandatory statutory engineering specification for submersible sewage and drainage pumps.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by MED 20. Enforced under municipal water supply and sewerage contracts."
  },
  {
    "canonical_name": "Shell and Tube Condensers",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 4503:1967",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MED 19 Sectional Committee Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_4503",
      "evidence_excerpt": "Clause 1: Specifies mechanical design and testing for surface condensers and shell-and-tube coolers.",
      "applicability_explanation": "Primary national standard for shell and tube condensers.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Duplicate entry mapping to IS 4503:1967."
  },
  {
    "canonical_name": "Shell and Tube Industrial Heat Exchangers",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 4503:1967",
    "new_standard": {
      "is_number": "IS 4503:1967",
      "title": "Shell and Tube Type Heat Exchangers — Specification",
      "publication_year": 1967,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MED 19",
      "division_council": "Mechanical Engineering",
      "scope": "Specifies mechanical design, construction, materials, and testing of shell and tube heat exchangers (fixed tube sheet, U-tube, and floating head types) for chemical, refinery, and power engineering.",
      "materials": "Carbon steel, low alloy steel, stainless steel, or copper-nickel alloys (aligned with TEMA Class R, C, B).",
      "technical_requirements": "Shell diameter, tube pitch and layout (triangular or square), baffle cut and spacing, tube sheet thickness design per ASME Section VIII / TEMA, hydraulic test pressure (1.5x design pressure for shell and tube sides separately).",
      "performance_requirements": "High thermal heat transfer coefficient; zero inter-fluid leakage between shell-side and tube-side process streams.",
      "testing_requirements": "Hydrostatic test of shell and tubes, tube-to-tubesheet joint leak test with air-soap or helium mass spectrometry, dye penetrant inspection of weld overlays.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MED 19 Thermal Engineering Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MED 19 Sectional Committee Specifications; Engineers India Limited (EIL) Standards",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_4503",
      "evidence_excerpt": "Clause 1: Prescribes engineering design and mechanical fabrication standards for shell and tube heat exchangers.",
      "applicability_explanation": "Primary national engineering standard for shell and tube heat exchangers.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by MED 19. Aligned with TEMA standards."
  },
  {
    "canonical_name": "Short Pitch Transmission Roller Chains",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 2403:2014",
    "new_standard": {
      "is_number": "IS 2403:2014",
      "title": "Short-Pitch Transmission Precision Roller Chains and Chain Wheels — Specification",
      "publication_year": 2014,
      "version": "Third Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MED 6",
      "division_council": "Mechanical Engineering",
      "scope": "Specifies dimensions, tolerances, measuring loads, and minimum tensile breaking strengths for short-pitch precision roller chains (ISO / BS and ANSI series 06B to 32B, 40 to 160).",
      "materials": "Heat-treated alloy steel link plates, case-hardened round pins, seamless bush and shot-peened hardened rollers.",
      "technical_requirements": "Pitch, inner width, roller diameter, pin diameter, minimum tensile breaking load (e.g. 16B-1 min 60 kN), dynamic fatigue endurance limit, pre-loading proof load (1/3 of minimum breaking load).",
      "performance_requirements": "High fatigue strength under pulsating loads in industrial conveyor drives, motorcycle final drives, and agricultural machinery.",
      "testing_requirements": "Tensile breaking strength test per Annex B, length measurement under measuring load, dynamic fatigue test per ISO 15654.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MED 6 Machine Elements Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MED 6 Sectional Committee Specifications; ISO 606 Aligned",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_2403",
      "evidence_excerpt": "Clause 1: Prescribes requirements for short-pitch precision transmission roller chains.",
      "applicability_explanation": "Primary national standard for precision transmission roller chains.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by MED 6. Identical to ISO 606."
  },
  {
    "canonical_name": "Slurry and Dredging Pumps",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 5120:1977",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MED 20 Sectional Committee Specifications; Mining Machinery Guidelines",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_5120",
      "evidence_excerpt": "Clause 1: Prescribes requirements for heavy duty centrifugal slurry pumps handling abrasive solids.",
      "applicability_explanation": "Primary national standard for slurry and dredging pumps.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by MED 20."
  },
  {
    "canonical_name": "Solar Powered Surface Pumps",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 17018:2018",
    "new_standard": {
      "is_number": "IS 17018:2018",
      "title": "Solar Photovoltaic (SPV) Water Pumping Systems — Specification",
      "publication_year": 2018,
      "version": "Original Edition",
      "status": "ACTIVE",
      "technical_committee": "MED 20 / ETD 28",
      "division_council": "Mechanical Engineering",
      "scope": "Specifies requirements and test procedures for standalone solar photovoltaic powered surface and submersible water pumping systems for irrigation and drinking water.",
      "materials": "Monocrystalline/polycrystalline PV array, MPPT solar pump inverter controller, surface monobloc centrifugal / submersible pump.",
      "technical_requirements": "Daily water output (litres/day per peak watt under 7.15 kWh/m2 solar insolation), wire-to-water system efficiency (min 45% to 55%), MPPT tracking efficiency (min 98%), dry run protection, remote monitoring telemetry.",
      "performance_requirements": "Zero diesel fuel cost for farmers; automated solar pumping tracking daylight.",
      "testing_requirements": "Outdoor dynamic testing on test rig under solar simulator per Annex B, water discharge measurement.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MED 20 / Ministry of New and Renewable Energy (MNRE) PM-KUSUM"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Ministry of New and Renewable Energy (MNRE) PM-KUSUM Scheme Technical Specifications",
      "source_url": "https://mnre.gov.in",
      "evidence_excerpt": "All solar water pumping systems installed under PM-KUSUM DBT subsidies must strictly conform to IS 17018.",
      "applicability_explanation": "Mandatory statutory product specification for solar powered water pumps in India.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated jointly by MED 20 and ETD 28. Mandatory under MNRE PM-KUSUM scheme."
  },
  {
    "canonical_name": "Soundproof Acoustic Canopies for Diesel Generator Sets",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 12065:1987",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Environment (Protection) Rules, 1986 (Schedule I Noise Limits for Diesel Generator Sets); CPCB",
      "source_url": "https://cpcb.nic.in",
      "evidence_excerpt": "Mandatory statutory requirement: All diesel generator sets up to 1000 KVA must be provided with acoustic enclosures ensuring noise <= 75 dBA at 1 metre.",
      "applicability_explanation": "Mandatory statutory environmental noise standard for soundproof DG set canopies.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Mandatory under CPCB Noise Limits for DG sets."
  },
  {
    "canonical_name": "Spherical Roller Bearings Heavy Industrial",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 6455:1972",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MED 6 Sectional Committee Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_6455",
      "evidence_excerpt": "Clause 1: Prescribes boundary dimensions and load ratings for spherical roller self-aligning bearings.",
      "applicability_explanation": "Primary national standard for spherical roller bearings.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Duplicate entry mapping to IS 6455:1972."
  },
  {
    "canonical_name": "Stationary and Portable Reciprocating Air Compressors",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 5456:2006",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MED 22 Sectional Committee Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_5456",
      "evidence_excerpt": "Clause 1: Prescribes performance testing for stationary and portable reciprocating air compressors.",
      "applicability_explanation": "Primary national standard for reciprocating air compressors.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Duplicate entry mapping to IS 5456:2006."
  },
  {
    "canonical_name": "Steam Traps (Thermodynamic/Inverted Bucket)",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 12268:1987",
    "new_standard": {
      "is_number": "IS 12268:1987",
      "title": "Industrial Steam Traps — Specification",
      "publication_year": 1987,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MED 17",
      "division_council": "Mechanical Engineering",
      "scope": "Specifies requirements and performance tests for thermodynamic disc, inverted bucket, and thermostatic steam traps used in steam distribution piping.",
      "materials": "Forged carbon steel or stainless steel body, hardened stainless steel disc/bucket, integrated strainer screen.",
      "technical_requirements": "Maximum allowable pressure (up to 4.2 MPa), operating pressure range, condensate discharge capacity (kg/h), steam loss rate (live steam loss < 0.5% of capacity), resistance to water hammer and superheat.",
      "performance_requirements": "Automatic discharge of condensed water and non-condensable air without losing valuable live steam in industrial plants.",
      "testing_requirements": "Condensate discharge capacity test per Annex B, steam loss test per ISO 7842, hydrostatic shell test.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MED 17 Steam Equipment Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MED 17 Sectional Committee Specifications; IBR Steam Piping Norms",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_12268",
      "evidence_excerpt": "Clause 1: Prescribes design and steam loss measurement for industrial steam traps.",
      "applicability_explanation": "Primary national standard for thermodynamic and mechanical steam traps.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by MED 17."
  },
  {
    "canonical_name": "Tapered Roller Bearings Metric Series",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 7460:1996",
    "new_standard": {
      "is_number": "IS 7460:1996",
      "title": "Rolling Bearings — Tapered Roller Bearings — Metric Series — Boundary Dimensions",
      "publication_year": 1996,
      "version": "First Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MED 6",
      "division_council": "Mechanical Engineering",
      "scope": "Specifies boundary dimensions, contact angles, and sub-unit interchangeability for single-row metric tapered roller bearings (302, 303, 320, 322, 323 series) for automotive wheel hubs and industrial gearboxes.",
      "materials": "Case carburized alloy steel or high carbon chromium bearing steel (100Cr6).",
      "technical_requirements": "Cone bore, cup outside diameter, width, contact angle (10° to 30°), dynamic radial load rating (Cr), dynamic axial load rating (Ca), run-out tolerances.",
      "performance_requirements": "Simultaneous transmission of high radial and thrust loads; rigid shaft preloading.",
      "testing_requirements": "Dimensional inspection per IS 7460, radial and axial runout check per ISO 492.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MED 6 Rolling Bearings Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MED 6 Sectional Committee Specifications; ISO 355 Aligned",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_7460",
      "evidence_excerpt": "Clause 1: Prescribes metric series boundary dimensions for tapered roller bearings.",
      "applicability_explanation": "Primary national specification for tapered roller bearings.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by MED 6. Identical to ISO 355."
  },
  {
    "canonical_name": "Thermic Fluid Heaters (Coil Type)",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IBR 1950 / IS 2825",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Indian Boiler Regulations (IBR Chapter XIV Thermic Fluid Heaters); Factories Act",
      "source_url": "https://dpiit.gov.in",
      "evidence_excerpt": "Thermic fluid heaters operating with organic heat transfer fluids must conform to IBR safety standards and over-temperature safety cutoffs.",
      "applicability_explanation": "Mandatory statutory standard for coil type thermic fluid heaters.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated under IBR Chapter XIV."
  },
  {
    "canonical_name": "Torque Wrenches (Click Type & Digital)",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 7145:1973",
    "new_standard": {
      "is_number": "IS 7145:1973",
      "title": "Specification for Hand Operated Torque Wrenches",
      "publication_year": 1973,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MED 1",
      "division_council": "Mechanical Engineering",
      "scope": "Specifies requirements and calibration procedures for hand-operated torque wrenches (click type mechanical, dial type, and electronic digital types) for precision bolt tightening.",
      "materials": "Forged chrome-vanadium steel / chrome-molybdenum steel ratchet head and tube, calibrated internal spring mechanism.",
      "technical_requirements": "Torque range (5 Nm to 1500 Nm), torque accuracy (+/- 4% of indicated reading for mechanical / +/- 2% for digital), square drive dimensions per IS 6077 / ISO 1174, overload endurance without calibration shift (5000 cycles at maximum torque).",
      "performance_requirements": "Prevents dangerous over-torquing (bolt snapping) and under-torquing (vibrational loosening) in critical aerospace, automotive wheel, and structural bolted joints.",
      "testing_requirements": "Calibration verification against traceable torque transducer per ISO 6789-2, drop test, square drive torque proof test.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MED 1 Hand Tools Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MED 1 Sectional Committee Specifications; ISO 6789 Aligned",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_7145",
      "evidence_excerpt": "Clause 1: Prescribes requirements and calibration methods for hand-operated torque wrenches.",
      "applicability_explanation": "Primary national precision tool standard for click type and digital torque wrenches.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by MED 1."
  },
  {
    "canonical_name": "Trunnion Mounted Pipeline Ball Valves",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 9890:1981",
    "new_standard": {
      "is_number": "IS 9890:1981",
      "title": "General Purpose Ball Valves — Specification",
      "publication_year": 1981,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MED 17",
      "division_council": "Mechanical Engineering",
      "scope": "Specifies requirements for full-bore and reduced-bore trunnion mounted and floating ball valves for oil, gas, petroleum, and general industrial pipelines.",
      "materials": "Forged carbon steel A105 / cast steel WCB body, stainless steel ball supported by upper and lower trunnion bearings, spring-energized polymer seats (RPTFE / Devlon).",
      "technical_requirements": "Pressure rating (Class 150 to Class 1500), double block and bleed (DBB) capability, emergency sealant injection ports, fire-safe design per API 6FA / ISO 10497, antistatic stem grounding.",
      "performance_requirements": "Zero fugitive emissions and zero pipeline pressure leakage in cross-country high-pressure natural gas and crude oil pipelines.",
      "testing_requirements": "Hydrostatic shell test at 1.5x rated pressure, high-pressure and low-pressure gas seat leakage test, fire-safe burn test.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MED 17 / PNGRB Pipeline Regulations"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Petroleum and Natural Gas Regulatory Board (PNGRB) Technical Standards and Specifications; OISD-141",
      "source_url": "https://www.pngrb.gov.in",
      "evidence_excerpt": "Pipeline ball valves deployed in cross-country hydrocarbon networks must conform to IS 9890 / API 6D standards.",
      "applicability_explanation": "Mandatory statutory specification for trunnion mounted pipeline ball valves.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by MED 17. Aligned with API 6D."
  },
  {
    "canonical_name": "Twin Lobe Roots Positive Displacement Blowers",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 5456:2006",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS MED 22 Sectional Committee Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_5456",
      "evidence_excerpt": "Clause 1: Prescribes testing code for twin-lobe and tri-lobe Roots rotary positive displacement blowers.",
      "applicability_explanation": "Primary national standard for Roots positive displacement blowers.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Duplicate entry mapping to IS 5456:2006."
  },
  {
    "canonical_name": "Unfired Fusion Welded Pressure Vessels",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 2825:1969",
    "new_standard": {
      "is_number": "IS 2825:1969",
      "title": "Code for Unfired Pressure Vessels",
      "publication_year": 1969,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MED 18",
      "division_council": "Mechanical Engineering",
      "scope": "Comprehensive national code for design, material selection, welded fabrication, non-destructive testing, and inspection of unfired cylindrical and spherical pressure vessels.",
      "materials": "Carbon steel (IS 2002 / IS 2062), low-alloy steel, stainless steel.",
      "technical_requirements": "Design pressure, maximum allowable stress, shell and dished head (torispherical, ellipsoidal, hemispherical) thickness formulas, nozzle reinforcement compensation, welded joint efficiency factor, post-weld heat treatment (PWHT), hydrostatic test pressure (1.3x to 1.5x design pressure).",
      "performance_requirements": "Structural pressure integrity preventing catastrophic explosive vessel failure in chemical, refinery, and compressed gas plants.",
      "testing_requirements": "100% radiographic examination of Category A and B butt welds per IS 1182, hydrostatic test witnessing by third-party inspecting agency.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MED 18 Pressure Vessels Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Factories Act, 1948 (Section 31 Pressure Plant); SMPV (Unfired) Rules, 2016 (PESO)",
      "source_url": "https://peso.gov.in",
      "evidence_excerpt": "Statutory Law under Section 31 Factories Act and PESO SMPV Rules: Pressure vessels operating above atmospheric pressure must be designed, fabricated and tested in accordance with IS 2825.",
      "applicability_explanation": "Mandatory statutory engineering code for unfired pressure vessels in India.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by MED 18. Mandatory under Section 31 Factories Act and PESO SMPV Rules."
  },
  {
    "canonical_name": "Unfired Pressure Vessels (Compressed Air Receivers)",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 2825:1969",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Factories Act 1948 (Section 31); PESO SMPV Rules",
      "source_url": "https://peso.gov.in",
      "evidence_excerpt": "Compressed air receivers are unfired pressure vessels that must strictly comply with IS 2825 design and annual statutory hydraulic testing.",
      "applicability_explanation": "Mandatory statutory engineering standard for compressed air receiver vessels.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Duplicate entry mapping to IS 2825:1969."
  },
  {
    "canonical_name": "Welded Stainless Steel Cryogenic Liquid Cylinders",
    "council": "MED",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 16104:2014",
    "new_standard": {
      "is_number": "IS 16104:2014",
      "title": "Transportable Vacuum Insulated Cryogenic Vessels — Specification",
      "publication_year": 2014,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "MED 16",
      "division_council": "Mechanical Engineering",
      "scope": "Specifies requirements for transportable vacuum-insulated double-walled stainless steel cryogenic cylinders (Dewars) for liquid oxygen, nitrogen, and argon at -196°C.",
      "materials": "Inner pressure vessel and outer jacket made of austenitic stainless steel (SS304/SS304L) with multi-layer super-insulation (MLI) under high vacuum.",
      "technical_requirements": "Working pressure (up to 2.4 MPa), vacuum level (< 10^-3 mbar), daily evaporation loss rate (max 1.5% to 2.0% per day for LOX), dual safety relief valves, bursting disc.",
      "performance_requirements": "Safe storage and hospital supply of liquid medical oxygen with zero thermal loss or vacuum degradation.",
      "testing_requirements": "Helium mass spectrometer vacuum leak test, cryogenic cold thermal shock test at -196°C, evaporation rate test.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards MED 16 / PESO"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Petroleum and Explosives Safety Organization (PESO) Static and Mobile Pressure Vessels Rules (SMPV)",
      "source_url": "https://peso.gov.in",
      "evidence_excerpt": "Compulsory PESO approval and BIS Scheme-I ISI marking for all transportable vacuum-insulated cryogenic liquid cylinders conforming to IS 16104.",
      "applicability_explanation": "Mandatory statutory safety standard for transportable cryogenic liquid cylinders in India.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by MED 16. Governed under PESO SMPV Rules."
  }
];

module.exports = { MED_MHD_AYD_EED_INVESTIGATION };
