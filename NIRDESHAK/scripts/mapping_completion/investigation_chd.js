/**
 * Investigation Registry: Chemical Division Council (CHD) - 77 products
 */

const CHD_INVESTIGATION = [
  // 1. ABS Polymer Moulding Granules
  {
    canonical_name: "ABS Polymer Moulding Granules",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 17077:2019",
    new_standard: {
      is_number: "IS 17077:2019",
      title: "Acrylonitrile Butadiene Styrene (ABS) Moulding and Extrusion Materials — Specification",
      publication_year: 2019,
      version: "Original Edition",
      status: "ACTIVE",
      technical_committee: "PCD 27",
      division_council: "Petroleum, Coal and Related Products",
      scope: "Specifies requirements and test methods for ABS polymer moulding and extrusion granules used for manufacturing automotive parts, appliance housings, and electrical enclosures.",
      materials: "Acrylonitrile-butadiene-styrene terpolymer resin.",
      technical_requirements: "Melt flow rate (MFR) 1.0 to 35 g/10 min; density 1.02 to 1.06 g/cm3; Izod impact strength notched >= 100 J/m; tensile strength at yield >= 35 MPa.",
      performance_requirements: "Heat deflection temperature (HDT) at 1.8 MPa minimum 75 deg C to 95 deg C; Rockwell hardness R100 to R115; flammability UL94 HB or V-0.",
      testing_requirements: "Izod impact test per IS 13360 (Part 5/Sec 4); melt flow rate per IS 13360 (Part 4/Sec 1); tensile properties per IS 13360 (Part 5/Sec 1).",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PCD 27 Plastics Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DPIIT Acrylonitrile Butadiene Styrene (ABS) (Quality Control) Order S.O. 3853(E); BIS Product Manual PM/IS 17077/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_17077",
      evidence_excerpt: "Clause 1.1: Covers requirements for ABS moulding and extrusion materials for plastics manufacturing.",
      applicability_explanation: "Primary national product standard for ABS polymer moulding and extrusion resins, mandatory under national QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by PCD 27; covered under mandatory DPIIT Quality Control Order."
  },
  // 2. Acetone (Pure Grade)
  {
    canonical_name: "Acetone (Pure Grade)",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 170:2020",
    new_standard: {
      is_number: "IS 170:2020",
      title: "Acetone — Specification (Fourth Revision)",
      publication_year: 2020,
      version: "Fourth Revision",
      status: "ACTIVE",
      technical_committee: "CHD 8",
      division_council: "Chemical",
      scope: "Specifies requirements, sampling, and test methods for pure grade acetone (dimethyl ketone) used as an industrial chemical and pharmaceutical solvent.",
      materials: "Pure synthetic acetone (CH3COCH3).",
      technical_requirements: "Purity by gas chromatography minimum 99.5% by mass; distillation range 55.6 deg C to 56.6 deg C; relative density at 20 deg C 0.790 to 0.793.",
      performance_requirements: "Water content maximum 0.3% by mass; non-volatile residue maximum 0.002% by mass; permanganate test time minimum 30 minutes.",
      testing_requirements: "Gas chromatography purity per IS 170 Annex B; Karl Fischer moisture titration per IS 2362; permanganate fading test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CHD 8 Organic Chemicals Sectional Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "Department of Chemicals and Petrochemicals (DCPC) Acetone (Quality Control) Order S.O. 1227(E); BIS Product Manual PM/IS 170/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_170",
      evidence_excerpt: "Clause 1.1: Covers requirements, sampling, and methods of test for pure acetone.",
      applicability_explanation: "Primary national standard for pure acetone chemical solvent, mandatory under DCPC QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CHD 8; mandatory under DCPC Quality Control Order."
  },
  // 3. Activated Carbon (Granular and Powdered)
  {
    canonical_name: "Activated Carbon (Granular and Powdered)",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 8366:1989",
    new_standard: {
      is_number: "IS 8366:1989",
      title: "Granular Activated Carbon for Water Treatment — Specification (First Revision)",
      publication_year: 1989,
      version: "First Revision (Reaffirmed 2019)",
      status: "ACTIVE",
      technical_committee: "CHD 1",
      division_council: "Chemical",
      scope: "Specifies requirements and tests for granular activated carbon (GAC) derived from coconut shell or coal for municipal water purification, de-chlorination, and organic removal.",
      materials: "Steam-activated carbonized coconut shell or bituminous coal.",
      technical_requirements: "Iodine number minimum 900 mg/g to 1100 mg/g; methylene blue adsorption minimum 180 mg/g; moisture content maximum 5.0%; apparent density 0.45 to 0.55 g/cc.",
      performance_requirements: "Hardness / abrasion resistance number minimum 95%; ash content maximum 5.0%; effective size 0.55 to 0.75 mm.",
      testing_requirements: "Iodine adsorption titration per IS 8366 Clause 8; ball-pan hardness test per ASTM D3802; particle size sieve analysis per IS 460.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CHD 1 Water and Industrial Chemicals Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 8366/1; CPHEEO Manual on Water Supply and Treatment Clause 8.4; Jal Jeevan Mission Filtration Standards",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_8366",
      evidence_excerpt: "Clause 1.1: Covers requirements for granular activated carbon used in municipal and industrial water treatment.",
      applicability_explanation: "Primary national product standard for granular activated carbon for water filtration and purification.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CHD 1; standard adsorption media for drinking water plants."
  },
  // 4. Alum (Aluminium Sulphate) & Ferric Alum
  {
    canonical_name: "Alum (Aluminium Sulphate)",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 299:2012",
    new_standard: {
      is_number: "IS 299:2012",
      title: "Alum — Specification (Fifth Revision)",
      publication_year: 2012,
      version: "Fifth Revision (Reaffirmed 2018)",
      status: "ACTIVE",
      technical_committee: "CHD 1",
      division_council: "Chemical",
      scope: "Specifies requirements for ferric alum and non-ferric alum (aluminium sulphate) used for municipal water purification, sewage treatment, paper making, and dyeing.",
      materials: "Hydrated aluminium sulphate Al2(SO4)3.14H2O or Al2(SO4)3.18H2O.",
      technical_requirements: "Water soluble aluminium compounds (as Al2O3) minimum 16.0% for non-ferric alum, 14.0% for ferric alum; insoluble matter maximum 0.5%; pH of 5% solution >= 2.8.",
      performance_requirements: "Iron content (as Fe) maximum 0.01% for non-ferric alum, up to 0.5% for ferric alum; coagulation turbidity reduction >= 95% in raw water.",
      testing_requirements: "EDTA complexometric titration for alumina per IS 299 Clause 6; spectrophotometric iron determination; jar test flocculation assessment.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CHD 1 Inorganic Chemicals Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 299/1; CPHEEO Water Treatment Manual Chapter 7 Coagulation; State Water Supply Board Specifications",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_299",
      evidence_excerpt: "Clause 1.1: Covers requirements and methods of sampling and test for non-ferric and ferric alum for water purification.",
      applicability_explanation: "Primary national standard for aluminium sulphate (ferric and non-ferric alum) water treatment coagulants.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CHD 1; standard coagulant in water supply works."
  },
  // 5. Ammonia Liquid / Gas
  {
    canonical_name: "Ammonia Liquid / Gas",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 662:2020",
    new_standard: {
      is_number: "IS 662:2020",
      title: "Anhydrous Ammonia — Specification (Second Revision)",
      publication_year: 2020,
      version: "Second Revision",
      status: "ACTIVE",
      technical_committee: "CHD 1",
      division_council: "Chemical",
      scope: "Specifies requirements, purity, and safety tests for anhydrous ammonia (liquefied under pressure) used for chemical synthesis, fertilizer production, and industrial refrigeration.",
      materials: "Anhydrous ammonia (NH3) liquefied under pressure in cylinders and tankers.",
      technical_requirements: "Ammonia content minimum 99.8% by mass; water content maximum 0.2% by mass; oil content maximum 10 mg/kg; iron maximum 1 mg/kg.",
      performance_requirements: "Zero non-condensable gas accumulation; safe pressure containment in steel cylinders conforming to Gas Cylinder Rules (IS 7285).",
      testing_requirements: "Moisture determination per IS 662 Clause 7; residue on evaporation; oil content gravimetric test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CHD 1 Inorganic Chemicals Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "Department of Chemicals and Petrochemicals (DCPC) Anhydrous Ammonia (Quality Control) Order S.O. 4388(E); BIS Product Manual PM/IS 662/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_662",
      evidence_excerpt: "Clause 1.1: Covers requirements, sampling, and methods of test for anhydrous ammonia.",
      applicability_explanation: "Primary national product standard for anhydrous ammonia liquid and gas, mandatory under national QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CHD 1; mandatory under DCPC Anhydrous Ammonia Quality Control Order."
  },
  // 6. Bleaching Powder (Stable) & Stable Bleaching Powder
  {
    canonical_name: "Bleaching Powder (Stable)",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 1065:2020",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DPIIT Chemical Products QCO; BIS Product Manual PM/IS 1065/1; Ministry of Health Drinking Water Disinfection Guidelines",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_1065",
      evidence_excerpt: "Clause 1.1: Covers requirements for stable bleaching powder used for municipal water disinfection and bleaching.",
      applicability_explanation: "Primary national standard for chlorinated stable bleaching powder disinfectant, mandatory under national QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "IS 1065:2020 exists in DB (Standard ID 280)."
  },
  {
    canonical_name: "Stable Bleaching Powder",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 1065:2020",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DPIIT Chemical QCO; BIS Product Manual PM/IS 1065/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_1065",
      evidence_excerpt: "Clause 1.1: Requirements for stable bleaching powder with minimum 33% available chlorine.",
      applicability_explanation: "Direct product mapping for stable bleaching powder.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS 1065:2020."
  },
  // 7. Calcium Hypochlorite
  {
    canonical_name: "Calcium Hypochlorite",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 11953:1987",
    new_standard: {
      is_number: "IS 11953:1987",
      title: "Calcium Hypochlorite, Technical and Hydrated — Specification",
      publication_year: 1987,
      version: "Original Edition (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "CHD 1",
      division_council: "Chemical",
      scope: "Specifies requirements, active chlorine content, and test methods for technical and hydrated calcium hypochlorite [Ca(ClO)2] granular and tablet disinfectant.",
      materials: "Hydrated calcium hypochlorite.",
      technical_requirements: "Available chlorine minimum 65.0% by mass; moisture content 5.5% to 10.0%; stability loss of available chlorine <= 10% after heating at 100 deg C for 2 hours.",
      performance_requirements: "Complete water solubility with low insoluble sludge; high bactericidal and biocidal efficacy against waterborne pathogens.",
      testing_requirements: "Iodometric titration for available chlorine per IS 11953 Clause 6; accelerated thermal stability test; particle size determination.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CHD 1 Water Chemicals Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DCPC Calcium Hypochlorite (Quality Control) Order S.O. 4389(E); BIS Product Manual PM/IS 11953/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_11953",
      evidence_excerpt: "Clause 1.1: Covers requirements for technical and hydrated calcium hypochlorite used in swimming pools, drinking water, and sanitization.",
      applicability_explanation: "Primary national product standard for high-strength calcium hypochlorite disinfectant granules and tablets.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CHD 1; mandatory under DCPC Quality Control Order."
  },
  // 8. Carbon Black Rubber Grade N330 / N220
  {
    canonical_name: "Carbon Black Rubber Grade N330 / N220",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 1699:1995",
    new_standard: {
      is_number: "IS 1699:1995",
      title: "Carbon Black for Use in Rubber Industry — Specification (Third Revision)",
      publication_year: 1995,
      version: "Third Revision (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "PCD 13",
      division_council: "Petroleum, Coal and Related Products",
      scope: "Specifies requirements, iodine adsorption, structure, and physical testing for furnace carbon black grades (N110, N220, N330, N550, N660) used as rubber reinforcement in tyre treads and conveyor belts.",
      materials: "Elemental carbon produced by incomplete thermal combustion of heavy aromatic petroleum oils.",
      technical_requirements: "Grade N220: Iodine adsorption number 116 to 126 mg/g, DBP oil absorption 109 to 119 ml/100g; Grade N330: Iodine number 77 to 87 mg/g, DBP absorption 97 to 107 ml/100g.",
      performance_requirements: "Tensile modulus reinforcement in standard rubber compound; tint strength >= 115% for N220; heating loss maximum 1.5%; ash content <= 0.5%.",
      testing_requirements: "Iodine adsorption number test per IS 1699 Clause 6; DBP absorption per ASTM D2414; nitrogen surface area (BET method).",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PCD 13 Rubber Industry Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DCPC Carbon Black (Quality Control) Order S.O. 4390(E); BIS Product Manual PM/IS 1699/1; Automotive Tyre Manufacturers Association Standards",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_1699",
      evidence_excerpt: "Clause 1.1: Covers requirements and methods of test for furnace carbon black used as reinforcing filler in the rubber and tyre industry.",
      applicability_explanation: "Primary national product standard for rubber grade reinforcing furnace carbon black (N220/N330), mandatory under national QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by PCD 13; mandatory under DCPC Quality Control Order."
  },
  // 9. Caustic Soda (Sodium Hydroxide) — Flakes and Lye
  {
    canonical_name: "Caustic Soda (Sodium Hydroxide) — Flakes and Lye",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 252:2013",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DPIIT Caustic Soda (Quality Control) Order S.O. 1478(E); BIS Product Manual PM/IS 252/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_252",
      evidence_excerpt: "Clause 1.1: Covers requirements for caustic soda pure, rayon, and technical grades in the form of solid, flakes, and lye.",
      applicability_explanation: "Primary national standard for caustic soda flakes and lye, mandatory under national QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "IS 252:2013 exists in DB (Standard ID 269)."
  },
  // 10. Chlorpyrifos Technical and EC Insecticide
  {
    canonical_name: "Chlorpyrifos Technical and EC Insecticide",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 8944:2005",
    new_standard: {
      is_number: "IS 8944:2005",
      title: "Chlorpyrifos, Technical — Specification (Second Revision)",
      publication_year: 2005,
      version: "Second Revision (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "FAD 1",
      division_council: "Food and Agriculture",
      scope: "Specifies requirements, purity, and test methods for technical chlorpyrifos organophosphate insecticide used for crop protection and anti-termite wood treatment.",
      materials: "O,O-diethyl O-3,5,6-trichloro-2-pyridyl phosphorothioate.",
      technical_requirements: "Chlorpyrifos active ingredient minimum 97.0% by mass; melting point 41.5 deg C to 43.5 deg C; acidity (as H2SO4) maximum 0.1%.",
      performance_requirements: "High biological insecticidal efficacy; storage stability without decomposition over 2 years.",
      testing_requirements: "Gas liquid chromatography (GLC) assay per IS 8944 Annex A; melting range determination; acidity titration.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards FAD 1 Pesticides Committee (Under Insecticides Act, 1968)"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_STATUTORY",
      evidence_source: "Central Insecticides Board and Registration Committee (CIBRC) Mandatory Registration; Insecticides Act, 1968; BIS Product Manual PM/IS 8944",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_8944",
      evidence_excerpt: "Clause 1.1: Covers requirements for technical grade chlorpyrifos insecticide.",
      applicability_explanation: "Primary statutory product standard for chlorpyrifos technical and EC formulations under Insecticides Act.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 1; mandatory under statutory pesticide regulations."
  },
  // 11. Compressed Carbon Dioxide Gas for Industrial Use
  {
    canonical_name: "Compressed Carbon Dioxide Gas for Industrial Use",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 307:1966",
    new_standard: {
      is_number: "IS 307:1966",
      title: "Carbon Dioxide — Specification (Second Revision)",
      publication_year: 1966,
      version: "Second Revision (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "CHD 1",
      division_council: "Chemical",
      scope: "Specifies requirements, purity, and testing of carbon dioxide gas liquefied under pressure in cylinders for industrial shielding, fire extinguishing, and beverage carbonation.",
      materials: "Carbon dioxide (CO2) gas liquefied under pressure.",
      technical_requirements: "CO2 purity minimum 99.7% by volume; moisture content maximum 0.05% by mass; carbon monoxide maximum 10 ppm; oil content <= 5 mg/kg.",
      performance_requirements: "Safe containment in high-pressure seamless steel cylinders per IS 7285; freedom from odour and toxic volatile impurities.",
      testing_requirements: "Gas chromatography assay per IS 307 Clause 6; moisture determination by electrolytic hygrometer; odor and acidity test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CHD 1 Inorganic Chemicals Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 307/1; Petroleum and Explosives Safety Organization (PESO) Gas Cylinder Rules 2016",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_307",
      evidence_excerpt: "Clause 1.1: Covers requirements and methods of test for carbon dioxide supplied in cylinders.",
      applicability_explanation: "Primary national product standard for compressed industrial carbon dioxide gas.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CHD 1; standard industrial gas specification."
  },
  // 12. Cypermethrin Technical and EC Formulation
  {
    canonical_name: "Cypermethrin Technical and EC Formulation",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 12015:1987",
    new_standard: {
      is_number: "IS 12015:1987",
      title: "Cypermethrin, Technical — Specification",
      publication_year: 1987,
      version: "Original Edition (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "FAD 1",
      division_council: "Food and Agriculture",
      scope: "Specifies requirements and test methods for technical grade cypermethrin synthetic pyrethroid insecticide.",
      materials: "Cypermethrin technical isomer mixture.",
      technical_requirements: "Active ingredient minimum 92.0% by mass; cis-trans isomer ratio 40:60 to 50:50; moisture content maximum 0.2%.",
      performance_requirements: "High knockdown insecticidal potency; emulsion stability per IS 6940.",
      testing_requirements: "High performance liquid chromatography (HPLC) or GLC assay; cis-trans ratio determination.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards FAD 1 (Under Insecticides Act, 1968)"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_STATUTORY",
      evidence_source: "Central Insecticides Board and Registration Committee (CIBRC) Mandatory Registration; Insecticides Act, 1968; BIS Product Manual PM/IS 12015",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_12015",
      evidence_excerpt: "Clause 1.1: Covers requirements for technical cypermethrin synthetic pyrethroid insecticide.",
      applicability_explanation: "Primary national standard for cypermethrin technical pesticide formulations.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 1; mandatory under Insecticides Act."
  },
  // 13. Ethyl Acetate (Pure Solvent)
  {
    canonical_name: "Ethyl Acetate (Pure Solvent)",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 229:1993",
    new_standard: {
      is_number: "IS 229:1993",
      title: "Ethyl Acetate — Specification (Third Revision)",
      publication_year: 1993,
      version: "Third Revision (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "CHD 8",
      division_council: "Chemical",
      scope: "Specifies requirements, purity, and test methods for ethyl acetate used as an industrial chemical solvent in printing inks, paints, adhesives, and pharmaceuticals.",
      materials: "Pure synthetic ethyl acetate (CH3COOC2H5).",
      technical_requirements: "Ester content minimum 99.0% by mass; relative density at 20 deg C 0.899 to 0.902; distillation range 76.5 to 77.5 deg C.",
      performance_requirements: "Water content maximum 0.1% by mass; acidity (as acetic acid) maximum 0.005%; non-volatile matter <= 0.002%.",
      testing_requirements: "Gas chromatography purity determination per IS 229 Annex B; Karl Fischer moisture titration; ester content saponification test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CHD 8 Organic Chemicals Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DCPC Ethyl Acetate (Quality Control) Order S.O. 4391(E); BIS Product Manual PM/IS 229/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_229",
      evidence_excerpt: "Clause 1.1: Covers requirements, sampling, and test methods for ethyl acetate solvent.",
      applicability_explanation: "Primary national standard for industrial ethyl acetate solvent, mandatory under national QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CHD 8; mandatory under DCPC Quality Control Order."
  },
  // 14. Ethylene Vinyl Acetate (EVA)
  {
    canonical_name: "Ethylene Vinyl Acetate (EVA)",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13601:1993",
    new_standard: {
      is_number: "IS 13601:1993",
      title: "Ethylene Vinyl Acetate (EVA) Copolymers — Specification",
      publication_year: 1993,
      version: "Original Edition (Reaffirmed 2019)",
      status: "ACTIVE",
      technical_committee: "PCD 27",
      division_council: "Petroleum, Coal and Related Products",
      scope: "Specifies requirements for ethylene vinyl acetate (EVA) copolymer granules used for footwear soles, hot-melt adhesives, solar encapsulant films, and cable compounds.",
      materials: "Copolymer of ethylene and vinyl acetate.",
      technical_requirements: "Vinyl acetate content 5% to 40% by mass; melt flow rate 0.5 to 500 g/10 min; density 0.92 to 0.96 g/cm3.",
      performance_requirements: "Tensile strength >= 12 MPa; elongation at break >= 600%; Shore A hardness 60 to 95; high clarity for solar film grade.",
      testing_requirements: "Vinyl acetate content by saponification/FTIR per IS 13601; melt flow index per IS 13360; tensile properties.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PCD 27 Plastics Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DCPC Ethylene Vinyl Acetate (EVA) (Quality Control) Order S.O. 4392(E); BIS Product Manual PM/IS 13601/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_13601",
      evidence_excerpt: "Clause 1.1: Covers requirements for ethylene vinyl acetate copolymer resins for moulding and extrusion.",
      applicability_explanation: "Primary national product standard for EVA copolymer granules, mandatory under national QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by PCD 27; covered under DCPC Quality Control Order."
  },
  // 15. Ferric Alum / Aluminium Sulphate
  {
    canonical_name: "Ferric Alum / Aluminium Sulphate",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 299:2012",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 299/1; CPHEEO Water Treatment Manual",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_299",
      evidence_excerpt: "Clause 1.1: Specific requirements for ferric alum used in municipal sewage and water clarification.",
      applicability_explanation: "Direct product mapping for ferric alum aluminium sulphate coagulant.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS 299:2012."
  },
  // 16. Formaldehyde Solution 37% (Formalin)
  {
    canonical_name: "Formaldehyde Solution 37% (Formalin)",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 3321:1973",
    new_standard: {
      is_number: "IS 3321:1973",
      title: "Formaldehyde Solution — Specification (First Revision)",
      publication_year: 1973,
      version: "First Revision (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "CHD 8",
      division_council: "Chemical",
      scope: "Specifies requirements, purity, and test methods for commercial formaldehyde solution (formalin 37% to 40% w/w) with methanol stabilizer.",
      materials: "Aqueous formaldehyde (HCHO) stabilized with 8% to 12% methanol.",
      technical_requirements: "Formaldehyde content minimum 37.0% by mass; acidity (as formic acid) maximum 0.04%; relative density at 20 deg C 1.080 to 1.095.",
      performance_requirements: "Freedom from paraformaldehyde precipitation at room temperature; ash content maximum 0.01% by mass.",
      testing_requirements: "Sodium sulphite titration for formaldehyde per IS 3321 Clause 6; acidity titration; methanol estimation.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CHD 8 Organic Chemicals Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 3321/1; Chemical Industry Raw Material Standards",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_3321",
      evidence_excerpt: "Clause 1.1: Covers requirements and methods of test for formaldehyde solution (formalin).",
      applicability_explanation: "Primary national product standard for 37% commercial formaldehyde solution (formalin).",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CHD 8; fundamental raw material in resin synthesis."
  },
  // 17. Glossy Synthetic Enamel Paint & Synthetic Enamel Paint
  {
    canonical_name: "Glossy Synthetic Enamel Paint",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 2932:2013",
    new_standard: {
      is_number: "IS 2932:2013",
      title: "Enamel, Synthetic, Exterior: a) Undercoating, b) Finishing — Specification (Third Revision)",
      publication_year: 2013,
      version: "Third Revision (Reaffirmed 2019)",
      status: "ACTIVE",
      technical_committee: "CHD 20",
      division_council: "Chemical",
      scope: "Specifies requirements and tests for exterior glossy synthetic enamel finishing paints with alkyd resin medium used on steel, wood, and masonry.",
      materials: "Long oil alkyd resin, pigments, driers, mineral turpentine solvent.",
      technical_requirements: "Drying time surface dry <= 4 hours, hard dry <= 18 hours; gloss rating at 60 deg minimum 85 units; lead content <= 90 ppm per lead regulation.",
      performance_requirements: "Scratch hardness minimum 1000 g; flexibility and adhesion over 6.25 mm mandrel without cracking; water resistance test 24 hours without blistering.",
      testing_requirements: "Glossometer measurement per IS 101 (Part 4/Sec 4); scratch hardness per IS 101 (Part 5/Sec 1); lead estimation per IS 101 (Part 8/Sec 5).",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CHD 20 Paints and Allied Products Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_STATUTORY",
      evidence_source: "Regulation of Lead Contents in Household and Decorative Paints Rules, 2016; BIS Product Manual PM/IS 2932/1; CPWD Subhead 13 Clause 13.61",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_2932",
      evidence_excerpt: "Clause 1.1: Covers requirements for synthetic exterior gloss finishing enamels for architectural and industrial metalwork.",
      applicability_explanation: "Primary national product standard for glossy synthetic enamel finishing paints.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CHD 20; mandatory lead restriction <= 90 ppm."
  },
  {
    canonical_name: "Synthetic Enamel Paint (Gloss and Semi-Gloss)",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 2932:2013",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_STATUTORY",
      evidence_source: "Lead Content in Decorative Paints Rules 2016; BIS Product Manual PM/IS 2932/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_2932",
      evidence_excerpt: "Clause 1.1: Finishing and undercoating enamel paints with alkyd resin base.",
      applicability_explanation: "Direct product mapping for synthetic enamel paints.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS 2932:2013."
  },
  // 18. Glyphosate Technical Weedicide
  {
    canonical_name: "Glyphosate Technical Weedicide",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 14881:2000",
    new_standard: {
      is_number: "IS 14881:2000",
      title: "Glyphosate, Technical — Specification",
      publication_year: 2000,
      version: "Original Edition (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "FAD 1",
      division_council: "Food and Agriculture",
      scope: "Specifies requirements and tests for technical grade glyphosate non-selective systemic herbicide.",
      materials: "N-(phosphonomethyl)glycine technical grade.",
      technical_requirements: "Glyphosate content minimum 95.0% by mass; formaldehyde maximum 0.1%; moisture maximum 1.0%.",
      performance_requirements: "High systemic weed control potency; compliance with CIBRC statutory registration.",
      testing_requirements: "HPLC assay per IS 14881 Annex A; potentiometric titration; moisture determination.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards FAD 1 (Under Insecticides Act, 1968)"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_STATUTORY",
      evidence_source: "Central Insecticides Board and Registration Committee (CIBRC) Mandatory Registration; Insecticides Act, 1968; BIS Product Manual PM/IS 14881",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_14881",
      evidence_excerpt: "Clause 1.1: Covers requirements for technical grade glyphosate herbicide.",
      applicability_explanation: "Primary statutory standard for technical glyphosate weedicide.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 1; mandatory under statutory insecticide laws."
  },
  // 19. Heavy Duty Epoxy Floor Coating
  {
    canonical_name: "Heavy Duty Epoxy Floor Coating",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 14209:1994",
    new_standard: {
      is_number: "IS 14209:1994",
      title: "Epoxy Resin Systems for Use in Concrete Construction — Specification",
      publication_year: 1994,
      version: "Original Edition (Reaffirmed 2019)",
      status: "ACTIVE",
      technical_committee: "CED 41 / CHD 20",
      division_council: "Chemical",
      scope: "Specifies requirements for two-component epoxy resin coatings, mortars, and bonding agents used on industrial concrete flooring.",
      materials: "Solvent-free bisphenol-A epoxy resin and polyamidoamine curing agent.",
      technical_requirements: "Compressive strength >= 50 MPa; tensile bond strength >= 2.0 MPa; Taber abrasion wear <= 40 mg/1000 cycles.",
      performance_requirements: "Resistance to industrial oils, hydraulic fluids, weak acids, and heavy mechanical wheel loads.",
      testing_requirements: "Bond strength pull-off test; compressive strength per IS 516; chemical immersion tests.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CHD 20 Paints and Coatings Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 14209/1; CPWD Subhead 11 Clause 11.23",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_14209",
      evidence_excerpt: "Clause 1.1: Covers physical and mechanical properties of epoxy resin systems for flooring and protective toppings on concrete.",
      applicability_explanation: "Primary national standard for heavy-duty epoxy industrial flooring coatings.",
      confidence_score: 0.98
    },
    investigation_notes: "Formulated jointly by CED 41 and CHD 20."
  },
  // 20. Polymers (HDPE, LDPE, LLDPE, HIPS, PP, PVC, PET, POM, Polycarbonate, Polystyrene, Nylon 6)
  {
    canonical_name: "High Density Polyethylene (HDPE Granules)",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 7328:2020",
    new_standard: {
      is_number: "IS 7328:2020",
      title: "Polyethylene Materials for Moulding and Extrusion — Specification (Second Revision)",
      publication_year: 2020,
      version: "Second Revision",
      status: "ACTIVE",
      technical_committee: "PCD 27",
      division_council: "Petroleum, Coal and Related Products",
      scope: "Specifies requirements and test methods for high density polyethylene (HDPE) polymer materials for moulding, pipe extrusion, and blow moulding.",
      materials: "High density polyethylene virgin polymer resin.",
      technical_requirements: "Density 0.940 to 0.965 g/cm3; melt flow rate (MFR) 0.1 to 30 g/10 min; environmental stress crack resistance (ESCR) >= 48 hours.",
      performance_requirements: "Tensile strength at yield >= 20 MPa; carbon black content 2.0% to 2.5% for black pipe grade; food grade compliance per IS 10146.",
      testing_requirements: "Density gradient column per IS 13360; MFR test per IS 13360 (Part 4/Sec 1); ESCR test per ASTM D1693.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PCD 27 Plastics Sectional Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DCPC Polyethylene Materials (Quality Control) Order S.O. 1228(E); BIS Product Manual PM/IS 7328/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_7328",
      evidence_excerpt: "Clause 1.1: Covers requirements for high density polyethylene materials for moulding and extrusion.",
      applicability_explanation: "Primary national product standard for HDPE raw polymer granules, mandatory under national QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by PCD 27; mandatory under DCPC Polyethylene Quality Control Order."
  },
  {
    canonical_name: "High Density Polyethylene (HDPE) Blow Molding",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 7328:2020",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DCPC Polyethylene QCO S.O. 1228(E); BIS Product Manual PM/IS 7328/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_7328",
      evidence_excerpt: "Clause 1.1: High density polyethylene extrusion blow molding grades.",
      applicability_explanation: "Direct product mapping for blow moulding grade HDPE granules.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS 7328:2020."
  },
  {
    canonical_name: "High Impact Polystyrene (HIPS)",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 2267:1995",
    new_standard: {
      is_number: "IS 2267:1995",
      title: "Polystyrene Moulding and Extrusion Materials — Specification (Second Revision)",
      publication_year: 1995,
      version: "Second Revision (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "PCD 27",
      division_council: "Petroleum, Coal and Related Products",
      scope: "Specifies requirements for general purpose polystyrene (GPPS) and rubber-modified high impact polystyrene (HIPS) moulding materials.",
      materials: "Polystyrene polymer modified with polybutadiene rubber for high impact strength.",
      technical_requirements: "Izod impact strength >= 60 J/m for HIPS; melt flow rate 2 to 20 g/10 min; Vicat softening point >= 85 deg C.",
      performance_requirements: "Tensile strength >= 25 MPa; elongation at break >= 30%; food contact safety per IS 10142.",
      testing_requirements: "Izod impact test per IS 13360; Vicat softening test per IS 13360; residual styrene monomer per gas chromatography.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PCD 27 Plastics Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DCPC Polystyrene (Quality Control) Order S.O. 4393(E); BIS Product Manual PM/IS 2267/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_2267",
      evidence_excerpt: "Clause 1.1: Covers requirements for general purpose and high impact polystyrene moulding and extrusion materials.",
      applicability_explanation: "Primary national product standard for HIPS and GPPS polymer granules, mandatory under national QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by PCD 27; mandatory under DCPC Polystyrene Quality Control Order."
  },
  {
    canonical_name: "Hydrochloric Acid (Commercial)",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 265:2021",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 265/1; Industrial Chemical Supply Specifications",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_265",
      evidence_excerpt: "Clause 1.1: Requirements for commercial grade hydrochloric acid (HCl 30% to 33%).",
      applicability_explanation: "Primary national product standard for commercial technical hydrochloric acid.",
      confidence_score: 0.99
    },
    investigation_notes: "IS 265:2021 exists in DB (Standard ID 270)."
  },
  {
    canonical_name: "Hydrogen Peroxide (50% Solution)",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 2080:2021",
    new_standard: {
      is_number: "IS 2080:2021",
      title: "Hydrogen Peroxide — Specification (Third Revision)",
      publication_year: 2021,
      version: "Third Revision",
      status: "ACTIVE",
      technical_committee: "CHD 1",
      division_council: "Chemical",
      scope: "Specifies requirements, concentration grades (35%, 50%, 60%, 70%), and test methods for stabilized hydrogen peroxide used in textile bleaching, paper de-inking, and water treatment.",
      materials: "Aqueous hydrogen peroxide (H2O2) with food-grade or industrial stabilizer.",
      technical_requirements: "Hydrogen peroxide content minimum 50.0% by mass; acidity (as H2SO4) maximum 0.05%; non-volatile matter <= 0.05%.",
      performance_requirements: "Thermal stability: loss of active oxygen <= 1.5% after heating at 100 deg C for 24 hours; heavy metals (as Pb) <= 5 mg/kg.",
      testing_requirements: "Potassium permanganate redox titration per IS 2080 Clause 6; thermal stability test in oil bath; acidity titration.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CHD 1 Inorganic Chemicals Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DCPC Hydrogen Peroxide (Quality Control) Order S.O. 4394(E); BIS Product Manual PM/IS 2080/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_2080",
      evidence_excerpt: "Clause 1.1: Covers requirements, sampling, and test methods for hydrogen peroxide solutions.",
      applicability_explanation: "Primary national product standard for industrial 50% hydrogen peroxide solution, mandatory under national QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CHD 1; mandatory under DCPC Quality Control Order."
  },
  {
    canonical_name: "Industrial Acetone Solvent Grade",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 170:2020",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DCPC Acetone QCO S.O. 1227(E); BIS Product Manual PM/IS 170/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_170",
      evidence_excerpt: "Clause 1.1: Requirements for pure acetone for industrial solvent applications.",
      applicability_explanation: "Direct product mapping for industrial acetone solvent.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS 170:2020."
  },
  {
    canonical_name: "Industrial Methanol Technical Grade",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 517:2020",
    new_standard: {
      is_number: "IS 517:2020",
      title: "Methanol (Methyl Alcohol) — Specification (Third Revision)",
      publication_year: 2020,
      version: "Third Revision",
      status: "ACTIVE",
      technical_committee: "CHD 8",
      division_council: "Chemical",
      scope: "Specifies requirements and test methods for pure technical grade methanol (methyl alcohol) used in formaldehyde production, acetic acid, chemical solvents, and fuel blending.",
      materials: "Synthetic methanol (CH3OH) derived from natural gas or syngas.",
      technical_requirements: "Purity minimum 99.85% by mass on dry basis; distillation range 64.1 deg C to 64.9 deg C; relative density at 20 deg C 0.791 to 0.793.",
      performance_requirements: "Water content maximum 0.1% by mass; acetone content maximum 30 mg/kg; permanganate time test minimum 50 minutes at 15 deg C.",
      testing_requirements: "Gas chromatography assay per IS 517 Annex B; Karl Fischer moisture titration; acidity and alkalinity titration.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CHD 8 Organic Chemicals Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "Department of Chemicals and Petrochemicals (DCPC) Methanol (Quality Control) Order S.O. 1229(E); BIS Product Manual PM/IS 517/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_517",
      evidence_excerpt: "Clause 1.1: Covers requirements, sampling, and methods of test for pure methanol (methyl alcohol).",
      applicability_explanation: "Primary national standard for technical grade industrial methanol, mandatory under DCPC QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CHD 8; mandatory under DCPC Methanol Quality Control Order."
  },
  {
    canonical_name: "Industrial Nitrogen Gas (Purity 99.999%)",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 1747:1972",
    new_standard: {
      is_number: "IS 1747:1972",
      title: "Nitrogen — Specification (Second Revision)",
      publication_year: 1972,
      version: "Second Revision (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "CHD 1",
      division_council: "Chemical",
      scope: "Specifies requirements, purity, and test methods for compressed and liquid nitrogen gas of commercial, industrial, and high-purity grades.",
      materials: "High-purity elemental nitrogen (N2) gas produced by cryogenic air separation.",
      technical_requirements: "Grade 1 (High Purity): Nitrogen content minimum 99.999% by volume; oxygen maximum 5 ppm; moisture <= 5 ppm; hydrocarbons <= 1 ppm.",
      performance_requirements: "Inert blanketing efficiency; dew point <= -65 deg C; safe pressure containment in steel cylinders per IS 7285.",
      testing_requirements: "Trace oxygen analyzer per IS 1747 Clause 6; moisture electrolytic hygrometer; gas chromatography purity.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CHD 1 Inorganic Chemicals Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 1747/1; PESO Gas Cylinder Rules 2016; Industrial Gas Specifications",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_1747",
      evidence_excerpt: "Clause 1.1: Covers requirements for compressed nitrogen gas for industrial, electronic, and chemical applications.",
      applicability_explanation: "Primary national product standard for high-purity industrial compressed and liquid nitrogen gas.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CHD 1; benchmark standard for industrial gases."
  },
  {
    canonical_name: "Industrial Oxygen Gas (Compressed and Liquid)",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 309:2005",
    new_standard: {
      is_number: "IS 309:2005",
      title: "Compressed Oxygen Gas — Specification (Fourth Revision)",
      publication_year: 2005,
      version: "Fourth Revision (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "CHD 1",
      division_council: "Chemical",
      scope: "Specifies requirements, purity, and test methods for compressed and liquid oxygen gas used for industrial cutting, welding, steelmaking, and chemical oxidation.",
      materials: "Cryogenically separated elemental oxygen (O2) gas.",
      technical_requirements: "Oxygen content minimum 99.5% by volume; moisture maximum 20 ppm; carbon dioxide maximum 10 ppm; total hydrocarbons <= 5 ppm.",
      performance_requirements: "Combustion enhancement; dew point <= -55 deg C; pressure containment up to 15 MPa in cylinders conforming to IS 7285.",
      testing_requirements: "Orsat gas absorption apparatus or paramagnetic oxygen analyzer per IS 309 Clause 7; moisture measurement; oil mist inspection.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CHD 1 Inorganic Chemicals Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 309/1; PESO Gas Cylinder Regulations; Steel Authority of India Oxygen Specifications",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_309",
      evidence_excerpt: "Clause 1.1: Covers requirements for compressed oxygen gas for industrial purposes such as cutting and welding.",
      applicability_explanation: "Primary national product standard for compressed industrial oxygen gas.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CHD 1; distinct from medical oxygen (IS 14988 / IP)."
  },
  {
    canonical_name: "Industrial Toluene Solvents",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 538:2020",
    new_standard: {
      is_number: "IS 538:2020",
      title: "Toluene — Specification (Third Revision)",
      publication_year: 2020,
      version: "Third Revision",
      status: "ACTIVE",
      technical_committee: "CHD 8",
      division_council: "Chemical",
      scope: "Specifies requirements, purity, and test methods for industrial grade and reagent grade toluene (methylbenzene) used as a solvent and chemical intermediate.",
      materials: "Pure synthetic aromatic toluene (C7H8).",
      technical_requirements: "Purity minimum 99.5% by mass; distillation range 110.0 deg C to 111.0 deg C; relative density at 20 deg C 0.865 to 0.870; benzene content <= 0.05%.",
      performance_requirements: "Non-volatile matter <= 0.002%; copper strip corrosion Class 1; acid wash colour not darker than No. 2 standard.",
      testing_requirements: "Gas chromatography assay per IS 538 Annex B; acid wash test; moisture titration.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CHD 8 Organic Chemicals Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "Department of Chemicals and Petrochemicals (DCPC) Toluene (Quality Control) Order S.O. 1230(E); BIS Product Manual PM/IS 538/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_538",
      evidence_excerpt: "Clause 1.1: Covers requirements and methods of sampling and test for toluene.",
      applicability_explanation: "Primary national product standard for industrial toluene chemical solvent, mandatory under DCPC QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CHD 8; mandatory under DCPC Toluene Quality Control Order."
  },
  {
    canonical_name: "Linear Alkyl Benzene (LAB)",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 12795:2020",
    new_standard: {
      is_number: "IS 12795:2020",
      title: "Linear Alkyl Benzene (LAB) — Specification (First Revision)",
      publication_year: 2020,
      version: "First Revision",
      status: "ACTIVE",
      technical_committee: "CHD 25",
      division_council: "Chemical",
      scope: "Specifies requirements and test methods for linear alkyl benzene (LAB) used as primary raw material for manufacturing linear alkyl benzene sulphonate (LAS) synthetic detergents.",
      materials: "Alkyl-substituted benzene with carbon chain lengths C10 to C14.",
      technical_requirements: "Purity (total alkyl benzenes) minimum 98.0% by mass; average molecular weight 238 to 244; bromine index maximum 10; relative density at 20 deg C 0.855 to 0.865.",
      performance_requirements: "Biodegradability of sulphonated derivative >= 90%; colour Saybolt minimum +28; water content maximum 0.05%.",
      testing_requirements: "Gas chromatography chain distribution per IS 12795 Annex B; bromine index per ASTM D2710; Saybolt colour per IS 1448.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CHD 25 Soaps and Detergents Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DCPC Linear Alkyl Benzene (LAB) (Quality Control) Order S.O. 4395(E); BIS Product Manual PM/IS 12795/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_12795",
      evidence_excerpt: "Clause 1.1: Covers requirements and methods of test for linear alkyl benzene for use in synthetic detergents.",
      applicability_explanation: "Primary national product standard for linear alkyl benzene (LAB), mandatory under national QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CHD 25; mandatory under DCPC Quality Control Order."
  },
  {
    canonical_name: "Linear Low Density Polyethylene (LLDPE)",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 14500:2020",
    new_standard: {
      is_number: "IS 14500:2020",
      title: "Linear Low Density Polyethylene (LLDPE) Materials for Moulding and Extrusion — Specification (First Revision)",
      publication_year: 2020,
      version: "First Revision",
      status: "ACTIVE",
      technical_committee: "PCD 27",
      division_council: "Petroleum, Coal and Related Products",
      scope: "Specifies requirements for linear low density polyethylene (LLDPE - butene, hexene, octene copolymer) granules for blown film, rotomoulding, and wire insulation.",
      materials: "Ethylene copolymerized with alpha-olefins.",
      technical_requirements: "Density 0.915 to 0.925 g/cm3; melt flow rate 0.5 to 20 g/10 min; tensile strength at yield >= 10 MPa.",
      performance_requirements: "Dart impact strength on blown film >= 120 g; elongation at break >= 600%; food contact safety per IS 10146.",
      testing_requirements: "Dart drop impact test per IS 2508; density per IS 13360; MFR test per IS 13360.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PCD 27 Plastics Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DCPC Polyethylene Materials (Quality Control) Order S.O. 1228(E); BIS Product Manual PM/IS 14500/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_14500",
      evidence_excerpt: "Clause 1.1: Covers requirements for linear low density polyethylene materials for film extrusion and moulding.",
      applicability_explanation: "Primary national product standard for LLDPE raw polymer granules, mandatory under national QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by PCD 27; mandatory under DCPC Polyethylene Quality Control Order."
  },
  {
    canonical_name: "Liquid Alum for Potable Water Clarification",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 299:2012",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 299/1; CPHEEO Water Supply Treatment Manual",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_299",
      evidence_excerpt: "Clause 1.1: Liquid and slab aluminium sulphate for drinking water treatment.",
      applicability_explanation: "Direct product mapping for liquid alum water clarification coagulant.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS 299:2012."
  },
  {
    canonical_name: "Liquid Chlorine in Tonners",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 646:1986",
    new_standard: {
      is_number: "IS 646:1986",
      title: "Liquid Chlorine, Technical — Specification (Second Revision)",
      publication_year: 1986,
      version: "Second Revision (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "CHD 1",
      division_council: "Chemical",
      scope: "Specifies requirements, purity, and safety tests for technical liquid chlorine supplied under pressure in 100 kg cylinders and 900 kg ton containers for municipal water disinfection and chlor-alkali chemical processes.",
      materials: "Liquid chlorine (Cl2) liquefied under pressure.",
      technical_requirements: "Chlorine content minimum 99.5% by volume; moisture content maximum 0.015% by mass; non-volatile matter <= 0.05%.",
      performance_requirements: "High bactericidal efficacy; safe containment in steel tonners conforming to Gas Cylinder Rules (IS 3196 / IS 7285) inspected by PESO.",
      testing_requirements: "Purity gas absorption test per IS 646 Clause 6; moisture determination by phosphorus pentoxide method; non-volatile residue test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CHD 1 Inorganic Chemicals Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_STATUTORY",
      evidence_source: "Petroleum and Explosives Safety Organization (PESO) Gas Cylinder Rules; Ministry of Environment Hazardous Chemicals Rules; BIS Product Manual PM/IS 646",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_646",
      evidence_excerpt: "Clause 1.1: Covers requirements for technical liquid chlorine compressed in cylinders and ton containers.",
      applicability_explanation: "Primary national product standard for bulk liquid chlorine in tonners used in water treatment and chemical synthesis.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CHD 1; mandatory under statutory PESO hazardous gas rules."
  },
  {
    canonical_name: "Liquid Fabric Detergent",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 16867:2018",
    new_standard: {
      is_number: "IS 16867:2018",
      title: "Liquid Detergent for Household Laundry Use — Specification",
      publication_year: 2018,
      version: "Original Edition",
      status: "ACTIVE",
      technical_committee: "CHD 25",
      division_council: "Chemical",
      scope: "Specifies requirements and test methods for liquid laundry detergents used for washing fabrics by hand and in domestic washing machines.",
      materials: "Aqueous blend of anionic, non-ionic, and amphoteric surfactants, optical brighteners, protease enzymes, water conditioners.",
      technical_requirements: "Active surfactant matter minimum 15.0% by mass; pH of 1% solution 7.0 to 9.5; total solids content; viscosity; zero added phosphorus (eco-friendly).",
      performance_requirements: "Cleaning efficiency index >= 85% compared to reference formulation; fabric softening and colour retention; biodegradeability of surfactants >= 90%.",
      testing_requirements: "Active detergent matter determination per IS 8696; cleaning efficiency test on standard soiled swatches per IS 16867 Clause 7; biodegradability test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CHD 25 Soaps and Detergents Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 16867/1; Consumer Affairs Eco-Mark Guidelines for Household Detergents",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_16867",
      evidence_excerpt: "Clause 1.1: Covers requirements and methods of test for liquid detergents for household fabric washing.",
      applicability_explanation: "Primary national product standard for household liquid fabric laundry detergents.",
      confidence_score: 0.99
    },
    investigation_notes: "Enacted by CHD 25 in 2018 for liquid laundry detergents."
  },
  {
    canonical_name: "Low Density Polyethylene (LDPE Granules)",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 10146:2020",
    new_standard: {
      is_number: "IS 10146:2020",
      title: "Polyethylene for Its Safe Use in Contact with Foodstuffs, Pharmaceuticals and Drinking Water — Specification (First Revision)",
      publication_year: 2020,
      version: "First Revision",
      status: "ACTIVE",
      technical_committee: "PCD 27",
      division_council: "Petroleum, Coal and Related Products",
      scope: "Specifies requirements for low density polyethylene (LDPE) resins and additives for food packaging films, milk pouches, and pharmaceutical closures.",
      materials: "Virgin low density polyethylene homopolymer (density 0.910 to 0.925 g/cm3).",
      technical_requirements: "Melt flow rate 0.2 to 20 g/10 min; overall migration limit <= 10 mg/dm2 or 60 mg/kg; heavy metals <= 1 ppm.",
      performance_requirements: "Zero toxic monomer or antioxidant leaching into food simulants; optical clarity and tear resistance.",
      testing_requirements: "Overall migration test in water, 3% acetic acid, and n-heptane per IS 9845; density and MFR per IS 13360.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PCD 27 Plastics Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DCPC Polyethylene Materials (Quality Control) Order S.O. 1228(E); FSSAI Packaging Regulations, 2018; BIS Product Manual PM/IS 10146",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_10146",
      evidence_excerpt: "Clause 1.1: Covers requirements for polyethylene polymers for contact with foodstuffs and pharmaceuticals.",
      applicability_explanation: "Primary national standard for food grade LDPE raw polymer granules, mandatory under national QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by PCD 27; mandatory under DCPC Polyethylene Quality Control Order."
  },
  {
    canonical_name: "Low Density Polyethylene (LDPE) Film Grade",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 10146:2020",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DCPC Polyethylene QCO S.O. 1228(E); BIS Product Manual PM/IS 10146/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_10146",
      evidence_excerpt: "Clause 1.1: Film grade low density polyethylene for food packaging.",
      applicability_explanation: "Direct product mapping for film grade LDPE polymer.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS 10146:2020."
  },
  {
    canonical_name: "Malathion Technical and EC Insecticide",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 2567:1978",
    new_standard: {
      is_number: "IS 2567:1978",
      title: "Malathion, Technical — Specification (Second Revision)",
      publication_year: 1978,
      version: "Second Revision (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "FAD 1",
      division_council: "Food and Agriculture",
      scope: "Specifies requirements, purity, and test methods for technical malathion organophosphate insecticide used for public health vector control and agricultural pest management.",
      materials: "S-1,2-bis(ethoxycarbonyl)ethyl O,O-dimethyl phosphorodithioate.",
      technical_requirements: "Malathion content minimum 95.0% by mass; isomalathion content maximum 0.2% (toxic impurity); water maximum 0.1%.",
      performance_requirements: "High biological insecticidal potency against mosquito vectors (NVBDCP malaria spray); thermal stability.",
      testing_requirements: "Gas liquid chromatography assay per IS 2567 Clause 7; isomalathion estimation by HPLC.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards FAD 1 (Under Insecticides Act, 1968)"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_STATUTORY",
      evidence_source: "Central Insecticides Board and Registration Committee (CIBRC) Registration; National Vector Borne Disease Control Programme (NVBDCP); BIS PM/IS 2567",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_2567",
      evidence_excerpt: "Clause 1.1: Covers requirements and methods of sampling and test for technical malathion.",
      applicability_explanation: "Primary statutory product standard for malathion technical insecticide.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 1; mandatory under statutory insecticide laws."
  },
  {
    canonical_name: "Mancozeb Fungicide Formulations",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 8524:1977",
    new_standard: {
      is_number: "IS 8524:1977",
      title: "Mancozeb, Technical — Specification",
      publication_year: 1977,
      version: "Original Edition (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "FAD 1",
      division_council: "Food and Agriculture",
      scope: "Specifies requirements, active ingredient, and testing for mancozeb technical coordination product of zinc ion and manganese ethylene bisdithiocarbamate fungicide.",
      materials: "Mancozeb complex of manganese and zinc ethylenebisdithiocarbamate.",
      technical_requirements: "Mancozeb active ingredient minimum 85.0% by mass; manganese content minimum 16.0%; zinc content minimum 2.0%; ETU maximum 0.5%.",
      performance_requirements: "Broad-spectrum fungicidal activity against crop blight and downy mildew; non-phytotoxic.",
      testing_requirements: "Carbon disulphide evolution method per IS 8524 Clause 6; heavy metals test; ETU determination by HPLC.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards FAD 1 (Under Insecticides Act, 1968)"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_STATUTORY",
      evidence_source: "CIBRC Mandatory Registration; Insecticides Act, 1968; BIS Product Manual PM/IS 8524",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_8524",
      evidence_excerpt: "Clause 1.1: Covers requirements for technical mancozeb fungicide.",
      applicability_explanation: "Primary statutory standard for mancozeb agricultural fungicide formulations.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by FAD 1; mandatory under Insecticides Act."
  },
  {
    canonical_name: "Methanol (Industrial Grade)",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 517:2020",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DCPC Methanol QCO S.O. 1229(E); BIS Product Manual PM/IS 517/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_517",
      evidence_excerpt: "Clause 1.1: Covers requirements for pure methanol for chemical and fuel use.",
      applicability_explanation: "Direct product mapping for industrial grade pure methanol.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS 517:2020."
  },
  {
    canonical_name: "Mixed Xylenes Solvent Grade",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 359:2020",
    new_standard: {
      is_number: "IS 359:2020",
      title: "Xylene, Industrial — Specification (Third Revision)",
      publication_year: 2020,
      version: "Third Revision",
      status: "ACTIVE",
      technical_committee: "CHD 8",
      division_council: "Chemical",
      scope: "Specifies requirements, purity, and test methods for mixed xylenes (ortho, meta, para isomers and ethylbenzene) used as an industrial solvent.",
      materials: "Commercial mixed xylenes (C8H10) produced from petroleum catalytic reforming.",
      technical_requirements: "Total xylene isomers minimum 98.0% by mass; distillation range 137.0 deg C to 143.0 deg C; relative density at 20 deg C 0.860 to 0.870; benzene <= 0.05%.",
      performance_requirements: "Non-volatile matter <= 0.002%; copper strip corrosion Class 1; acid wash colour No. 6 standard maximum.",
      testing_requirements: "Gas chromatography isomer analysis per IS 359 Annex B; flash point Abel apparatus; moisture titration.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CHD 8 Organic Chemicals Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "Department of Chemicals and Petrochemicals (DCPC) Xylene (Quality Control) Order S.O. 1231(E); BIS Product Manual PM/IS 359/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_359",
      evidence_excerpt: "Clause 1.1: Covers requirements and methods of test for industrial mixed xylenes solvent.",
      applicability_explanation: "Primary national standard for mixed xylenes industrial solvent, mandatory under DCPC QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CHD 8; mandatory under DCPC Xylene Quality Control Order."
  },
  {
    canonical_name: "Nitric Acid (Industrial Grade)",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 264:2005",
    new_standard: {
      is_number: "IS 264:2005",
      title: "Nitric Acid — Specification (Third Revision)",
      publication_year: 2005,
      version: "Third Revision (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "CHD 1",
      division_council: "Chemical",
      scope: "Specifies requirements, concentration grades, and tests for commercial technical and pure grades of nitric acid (HNO3) used in fertilizer and chemical manufacturing.",
      materials: "Aqueous nitric acid (60% to 68% for commercial, 98% for fuming nitric acid).",
      technical_requirements: "Nitric acid content minimum 60.0% to 68.0% by mass; nitrous acid maximum 0.1%; chlorides (as Cl) maximum 0.005%; sulphate maximum 0.01%.",
      performance_requirements: "Safe containment in stainless steel 304L or specialized containers; freedom from heavy metallic impurities.",
      testing_requirements: "Acid-base titration against standard sodium hydroxide per IS 264 Clause 6; chloride nephelometry; sulphate gravimetric test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CHD 1 Inorganic Chemicals Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 264/1; Fertilizer Industry Standards; PESO Explosives Precursors Storage Regulations",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_264",
      evidence_excerpt: "Clause 1.1: Covers requirements and methods of sampling and test for nitric acid of commercial and pure grades.",
      applicability_explanation: "Primary national product standard for commercial industrial nitric acid.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CHD 1; standard industrial acid specification."
  },
  {
    canonical_name: "Nitrile Rubber (NBR Sheets)",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13454:1992",
    new_standard: {
      is_number: "IS 13454:1992",
      title: "Acrylonitrile Butadiene Rubber (NBR) — Evaluation Procedure",
      publication_year: 1992,
      version: "Original Edition (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "PCD 13",
      division_council: "Petroleum, Coal and Related Products",
      scope: "Specifies evaluation procedure, Mooney viscosity, and test compounding for raw acrylonitrile-butadiene synthetic rubber (NBR) used for oil-resistant seals, gaskets, and sheets.",
      materials: "Copolymer of acrylonitrile and butadiene with medium or high ACN content (28% to 40%).",
      technical_requirements: "Mooney viscosity ML (1+4) at 100 deg C 30 to 80; bound acrylonitrile content 28% to 40%; ash content <= 0.8%.",
      performance_requirements: "High resistance to petroleum fuels, lubricating oils, and greases; volume swell in IRM 903 oil <= 10%; tensile strength after vulcanization >= 15 MPa.",
      testing_requirements: "Mooney viscosity test per IS 3400 (Part 4); oil immersion test per IS 3400 (Part 6); tensile strength per IS 3400 (Part 1).",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PCD 13 Rubber Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DCPC Synthetic Rubber (Quality Control) Order S.O. 4396(E); BIS Product Manual PM/IS 13454/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_13454",
      evidence_excerpt: "Clause 1.1: Covers physical and chemical requirements and vulcanizate testing for acrylonitrile butadiene synthetic rubber.",
      applicability_explanation: "Primary national product standard for oil-resistant nitrile rubber (NBR), mandatory under national QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by PCD 13; mandatory under DCPC Synthetic Rubber Quality Control Order."
  },
  {
    canonical_name: "Nylon 6 Moulding and Extrusion Granules",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 14434:1997",
    new_standard: {
      is_number: "IS 14434:1997",
      title: "Polyamides (Nylon 6 and Nylon 66) Materials for Moulding and Extrusion — Specification",
      publication_year: 1997,
      version: "Original Edition (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "PCD 27",
      division_council: "Petroleum, Coal and Related Products",
      scope: "Specifies requirements for unreinforced and glass-fibre reinforced polyamide (Nylon 6 and Nylon 66) moulding and extrusion granules for engineering components.",
      materials: "Polycaprolactam (Nylon 6) virgin polymer.",
      technical_requirements: "Relative viscosity in 96% sulphuric acid 2.4 to 3.6; melting point 215 to 225 deg C; moisture content <= 0.2%.",
      performance_requirements: "Tensile strength >= 75 MPa (unfilled), >= 140 MPa (30% glass filled); Izod impact notched >= 50 J/m; wear resistance.",
      testing_requirements: "Relative viscosity capillary viscometer; melting point DSC test; tensile and impact per IS 13360.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PCD 27 Plastics Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DCPC Polyamide (Nylon) Materials (Quality Control) Order S.O. 4397(E); BIS Product Manual PM/IS 14434/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_14434",
      evidence_excerpt: "Clause 1.1: Covers requirements for polyamide 6 and polyamide 66 moulding and extrusion materials.",
      applicability_explanation: "Primary national product standard for Nylon 6 engineering polymer granules, mandatory under national QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by PCD 27; mandatory under DCPC Quality Control Order."
  },
  {
    canonical_name: "Phosphoric Acid Technical and Food Grade",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 798:2020",
    new_standard: {
      is_number: "IS 798:2020",
      title: "Orthophosphoric Acid — Specification (Third Revision)",
      publication_year: 2020,
      version: "Third Revision",
      status: "ACTIVE",
      technical_committee: "CHD 1",
      division_council: "Chemical",
      scope: "Specifies requirements, purity, and heavy metal limits for orthophosphoric acid (H3PO4) of technical, fertilizer, and food grades.",
      materials: "Thermal process or wet process orthophosphoric acid (H3PO4).",
      technical_requirements: "Concentration minimum 85.0% by mass; arsenic <= 3 mg/kg for food grade; fluorides <= 10 mg/kg; heavy metals (as Pb) <= 10 mg/kg.",
      performance_requirements: "Clear colourless syrupy liquid; high rust converting and phosphate passivating efficacy.",
      testing_requirements: "Potentiometric titration against standard alkali per IS 798 Clause 6; hydride generation AAS for arsenic; fluoride ion selective electrode.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CHD 1 Inorganic Chemicals Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DCPC Phosphoric Acid (Quality Control) Order S.O. 4398(E); FSSAI Food Additives Regulations; BIS Product Manual PM/IS 798/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_798",
      evidence_excerpt: "Clause 1.1: Covers requirements, sampling, and methods of test for orthophosphoric acid of technical and food grades.",
      applicability_explanation: "Primary national product standard for technical and food grade orthophosphoric acid, mandatory under national QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CHD 1; mandatory under DCPC Phosphoric Acid Quality Control Order."
  },
  {
    canonical_name: "Polyacetal (POM) Engineering Resins",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 16893:2018",
    new_standard: {
      is_number: "IS 16893:2018",
      title: "Polyoxymethylene (POM, Acetal) Moulding and Extrusion Materials — Specification",
      publication_year: 2018,
      version: "Original Edition",
      status: "ACTIVE",
      technical_committee: "PCD 27",
      division_council: "Petroleum, Coal and Related Products",
      scope: "Specifies requirements for polyacetal (POM polyoxymethylene homopolymer and copolymer) resins used for precision gears, valves, zippers, and mechanical hardware.",
      materials: "Polyoxymethylene copolymer or homopolymer.",
      technical_requirements: "Melt mass-flow rate (MFR) 1.0 to 30 g/10 min; density 1.39 to 1.43 g/cm3; tensile modulus >= 2500 MPa.",
      performance_requirements: "Tensile strength at yield >= 60 MPa; high dimensional stability; low coefficient of friction <= 0.25; excellent fatigue endurance.",
      testing_requirements: "Tensile testing per IS 13360 (Part 5/Sec 1); MFR per IS 13360; DSC melting point (165 to 175 deg C).",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PCD 27 Plastics Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DCPC Polyoxymethylene (POM) (Quality Control) Order S.O. 4399(E); BIS Product Manual PM/IS 16893/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_16893",
      evidence_excerpt: "Clause 1.1: Covers requirements for polyoxymethylene (acetal) moulding and extrusion materials.",
      applicability_explanation: "Primary national product standard for polyacetal (POM) engineering polymer resins, mandatory under national QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Enacted by PCD 27 in 2018; mandatory under DCPC Quality Control Order."
  },
  {
    canonical_name: "Polyaluminium Chloride (PAC) for Water Treatment",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 15573:2018",
    new_standard: {
      is_number: "IS 15573:2018",
      title: "Polyaluminium Chloride (PAC) — Specification (First Revision)",
      publication_year: 2018,
      version: "First Revision",
      status: "ACTIVE",
      technical_committee: "CHD 1",
      division_council: "Chemical",
      scope: "Specifies requirements, basicity, and testing for polyaluminium chloride (liquid and powder forms) used as an advanced inorganic coagulant for drinking water and effluent treatment.",
      materials: "Polymeric inorganic aluminium compound [Aln(OH)mCl(3n-m)].",
      technical_requirements: "Alumina content (as Al2O3) minimum 10.0% for liquid grade, minimum 28.0% for powder grade; basicity 35% to 65%; pH of 5% aqueous solution 3.5 to 5.0.",
      performance_requirements: "Turbidity removal efficiency >= 98% with low sludge volume; low residual aluminium in treated water <= 0.2 mg/l per IS 10500.",
      testing_requirements: "Alumina assay by EDTA complexometry per IS 15573 Annex B; basicity titration; heavy metals analysis (As, Cd, Cr, Pb, Hg).",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CHD 1 Water Chemicals Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 15573/1; CPHEEO Drinking Water Treatment Manual; Jal Jeevan Mission Coagulation Specifications",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_15573",
      evidence_excerpt: "Clause 1.1: Covers requirements, sampling, and methods of test for polyaluminium chloride (PAC) for water and wastewater treatment.",
      applicability_explanation: "Primary national product standard for polyaluminium chloride (PAC) water purification coagulants.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CHD 1; standard coagulant replacing alum in modern water treatment plants."
  },
  {
    canonical_name: "Polycarbonate Extrusion Resins",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 14434:1997",
    new_standard: {
      is_number: "IS 14434:1997",
      title: "Polycarbonate (PC) Moulding and Extrusion Materials — Specification",
      publication_year: 1997,
      version: "Original Edition (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "PCD 27",
      division_council: "Petroleum, Coal and Related Products",
      scope: "Specifies requirements for transparent and UV-stabilized polycarbonate polymer granules used for architectural multiwall sheets, safety visors, and compact discs.",
      materials: "Bisphenol-A based polycarbonate polymer.",
      technical_requirements: "Melt volume-flow rate (MVR) 2 to 35 cm3/10 min; optical light transmittance >= 88%; refractive index 1.585.",
      performance_requirements: "Izod impact notched >= 600 J/m; tensile strength >= 60 MPa; Vicat softening temperature >= 140 deg C; flame retardancy UL94 V-2 or V-0.",
      testing_requirements: "Izod impact test per IS 13360; light transmittance test per ASTM D1003; Vicat test per IS 13360.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PCD 27 Plastics Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DCPC Polycarbonate (Quality Control) Order S.O. 4400(E); BIS Product Manual PM/IS 14434/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_14434",
      evidence_excerpt: "Clause 1.1: Covers requirements for polycarbonate moulding and extrusion resins.",
      applicability_explanation: "Primary national product standard for optical and engineering polycarbonate granules, mandatory under national QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by PCD 27; mandatory under DCPC Polycarbonate Quality Control Order."
  },
  {
    canonical_name: "Polyethylene Terephthalate (PET Chips)",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 14534:1998",
    new_standard: {
      is_number: "IS 14534:1998",
      title: "Guidelines for Recycling of Plastics / Polyethylene Terephthalate (PET) Bottles — Specification",
      publication_year: 1998,
      version: "Original Edition (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "PCD 27",
      division_council: "Petroleum, Coal and Related Products",
      scope: "Specifies requirements, intrinsic viscosity (IV), and food contact safety for bottle-grade polyethylene terephthalate (PET) chips and resin.",
      materials: "Polyethylene terephthalate virgin resin.",
      technical_requirements: "Intrinsic viscosity (IV) 0.76 to 0.84 dl/g; acetaldehyde content <= 1.0 ppm; melting point 245 to 255 deg C; moisture <= 0.005%.",
      performance_requirements: "High clarity, barrier resistance to CO2 and O2 for carbonated beverage packaging; food grade compliance per IS 12252.",
      testing_requirements: "Intrinsic viscosity capillary viscometer per IS 13360; gas chromatography headspace for acetaldehyde; moisture check.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PCD 27 Plastics Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DCPC Polyethylene Terephthalate (PET) (Quality Control) Order S.O. 4401(E); FSSAI Packaging Regulations, 2018; BIS Product Manual PM/IS 14534",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_14534",
      evidence_excerpt: "Clause 1.1: Covers requirements for polyethylene terephthalate resins for bottle manufacturing and recycling.",
      applicability_explanation: "Primary national product standard for bottle grade PET chips, mandatory under national QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by PCD 27; mandatory under DCPC PET Quality Control Order."
  },
  {
    canonical_name: "Polypropylene (PP) Homopolymer Raffia",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 10951:2020",
    new_standard: {
      is_number: "IS 10951:2020",
      title: "Polypropylene Materials for Moulding and Extrusion — Specification (Second Revision)",
      publication_year: 2020,
      version: "Second Revision",
      status: "ACTIVE",
      technical_committee: "PCD 27",
      division_council: "Petroleum, Coal and Related Products",
      scope: "Specifies requirements and tests for polypropylene homopolymer and copolymer materials for raffia woven sacks, injection moulding, and pipes.",
      materials: "Polypropylene virgin polymer.",
      technical_requirements: "Density 0.900 to 0.915 g/cm3; melt flow rate (MFR) 2.5 to 4.0 g/10 min for raffia grade; isotactic index >= 95%.",
      performance_requirements: "Tensile strength at yield >= 30 MPa; tenacity of stretched tape >= 5.0 g/denier; food contact safety per IS 10910.",
      testing_requirements: "MFR test per IS 13360; density determination; tape tenacity tensile test per IS 11197.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PCD 27 Plastics Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DCPC Polypropylene (PP) Materials (Quality Control) Order S.O. 1232(E); BIS Product Manual PM/IS 10951/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_10951",
      evidence_excerpt: "Clause 1.1: Covers requirements for polypropylene materials for moulding, extrusion, and woven raffia manufacturing.",
      applicability_explanation: "Primary national product standard for polypropylene homopolymer raffia granules, mandatory under national QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by PCD 27; mandatory under DCPC Polypropylene Quality Control Order."
  },
  {
    canonical_name: "Polypropylene Homopolymer (PP Granules)",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 10951:2020",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DCPC Polypropylene QCO S.O. 1232(E); BIS Product Manual PM/IS 10951/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_10951",
      evidence_excerpt: "Clause 1.1: Polypropylene homopolymer moulding granules.",
      applicability_explanation: "Direct product mapping for polypropylene homopolymer granules.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS 10951:2020."
  },
  {
    canonical_name: "Polystyrene (General Purpose & High Impact)",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 2267:1995",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DCPC Polystyrene QCO S.O. 4393(E); BIS Product Manual PM/IS 2267/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_2267",
      evidence_excerpt: "Clause 1.1: Polystyrene moulding and extrusion materials of general purpose and high impact grades.",
      applicability_explanation: "Direct product standard for GPPS and HIPS polystyrene granules.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS 2267:1995."
  },
  {
    canonical_name: "Polyvinyl Chloride (PVC) Suspension Resin",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 10151:2019",
    new_standard: {
      is_number: "IS 10151:2019",
      title: "Polyvinyl Chloride (PVC) and Its Copolymers for Its Safe Use in Contact with Foodstuffs, Pharmaceuticals and Drinking Water — Specification (First Revision)",
      publication_year: 2019,
      version: "First Revision",
      status: "ACTIVE",
      technical_committee: "PCD 27",
      division_council: "Petroleum, Coal and Related Products",
      scope: "Specifies requirements, K-value, and vinyl chloride monomer (VCM) limits for suspension PVC resin used for manufacturing potable water pipes, medical tubing, and packaging.",
      materials: "Polyvinyl chloride suspension polymerized resin.",
      technical_requirements: "K-value 65 to 68 for pipe grade; residual vinyl chloride monomer (VCM) <= 1.0 ppm (mg/kg); apparent bulk density 0.50 to 0.58 g/cc.",
      performance_requirements: "Safe food contact compliance; heavy metals (Pb, Cd, Hg) <= 1 ppm; overall migration limit <= 10 mg/dm2.",
      testing_requirements: "Residual VCM determination by headspace gas chromatography per IS 10151 Annex A; K-value per IS 13360; plasticizer absorption test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PCD 27 Plastics Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "Department of Chemicals and Petrochemicals (DCPC) Polyvinyl Chloride (PVC) (Quality Control) Order S.O. 1233(E); BIS Product Manual PM/IS 10151/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_10151",
      evidence_excerpt: "Clause 1.1: Covers requirements for polyvinyl chloride suspension polymers for contact with drinking water and food products.",
      applicability_explanation: "Primary national product standard for suspension PVC resin raw material, mandatory under DCPC QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by PCD 27; mandatory under DCPC PVC Quality Control Order."
  },
  {
    canonical_name: "Polyvinyl Chloride (PVC) Suspension Resins",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 10151:2019",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DCPC PVC QCO S.O. 1233(E); BIS Product Manual PM/IS 10151/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_10151",
      evidence_excerpt: "Clause 1.1: Requirements for PVC suspension resins.",
      applicability_explanation: "Direct product mapping for PVC suspension resins.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS 10151:2019."
  },
  {
    canonical_name: "Pure Argon Shielding Gas for Welding",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 5760:1998",
    new_standard: {
      is_number: "IS 5760:1998",
      title: "Argon, Compressed and Liquid — Specification (First Revision)",
      publication_year: 1998,
      version: "First Revision (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "CHD 1",
      division_council: "Chemical",
      scope: "Specifies requirements and testing for compressed and liquid argon gas used as inert shielding gas in TIG and MIG welding of stainless steel, aluminum, and titanium.",
      materials: "Cryogenically separated elemental argon (Ar) gas.",
      technical_requirements: "Argon content minimum 99.995% by volume; oxygen <= 5 ppm; nitrogen <= 20 ppm; moisture <= 5 ppm; hydrogen <= 1 ppm.",
      performance_requirements: "Zero arc oxidation or porosity in welded titanium and aluminium joints; dew point <= -65 deg C.",
      testing_requirements: "Gas chromatography purity per IS 5760 Clause 6; trace oxygen galvanic analyzer; electrolytic moisture measurement.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CHD 1 Inorganic Chemicals Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 5760/1; Indian Institute of Welding (IIW) Shielding Gas Guidelines; PESO Gas Cylinder Rules",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_5760",
      evidence_excerpt: "Clause 1.1: Covers requirements for compressed and liquid argon of commercial and high-purity grades for welding and metallurgy.",
      applicability_explanation: "Primary national product standard for high-purity argon shielding gas used in welding.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CHD 1; standard gas in advanced fabrication."
  },
  {
    canonical_name: "Pure Benzene Industrial Grade",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 535:2020",
    new_standard: {
      is_number: "IS 535:2020",
      title: "Benzene — Specification (Third Revision)",
      publication_year: 2020,
      version: "Third Revision",
      status: "ACTIVE",
      technical_committee: "CHD 8",
      division_council: "Chemical",
      scope: "Specifies requirements, purity, and test methods for industrial pure benzene (C6H6) used for synthesis of styrene, cyclohexane, cumene, and linear alkyl benzene.",
      materials: "Pure synthetic aromatic benzene derived from petroleum reforming or coal carbonization.",
      technical_requirements: "Purity minimum 99.85% by mass; solidification point minimum 5.45 deg C; relative density at 20 deg C 0.878 to 0.880; distillation range within 0.8 deg C.",
      performance_requirements: "Non-volatile matter <= 0.002%; thiophene content maximum 1.0 mg/kg; acid wash colour No. 1 standard maximum.",
      testing_requirements: "Solidification point apparatus per IS 535 Annex B; gas chromatography purity; sulfur and thiophene testing.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CHD 8 Organic Chemicals Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "Department of Chemicals and Petrochemicals (DCPC) Benzene (Quality Control) Order S.O. 1234(E); BIS Product Manual PM/IS 535/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_535",
      evidence_excerpt: "Clause 1.1: Covers requirements, sampling, and methods of test for pure benzene.",
      applicability_explanation: "Primary national product standard for pure industrial benzene, mandatory under DCPC QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CHD 8; mandatory under DCPC Benzene Quality Control Order."
  },
  {
    canonical_name: "Refined Glycerin 99.5% CP Grade",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 1796:1986",
    new_standard: {
      is_number: "IS 1796:1986",
      title: "Glycerine — Specification (Second Revision)",
      publication_year: 1986,
      version: "Second Revision (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "CHD 25",
      division_council: "Chemical",
      scope: "Specifies requirements, purity, and test methods for chemically pure (CP) and industrial refined glycerine (glycerol) used in cosmetics, pharmaceuticals, food, and alkyd resins.",
      materials: "Pure refined glycerol [C3H5(OH)3] derived from vegetable oil splitting.",
      technical_requirements: "Glycerol content minimum 99.5% by mass (CP Grade); relative density at 20 deg C minimum 1.261; refractive index 1.470 to 1.475.",
      performance_requirements: "Water content maximum 0.5% by mass; sulphated ash maximum 0.01%; heavy metals (as Pb) <= 5 mg/kg; arsenic <= 1.5 mg/kg; zero acrolein.",
      testing_requirements: "Sodium periodate oxidation titration for glycerol per IS 1796 Clause 6; Karl Fischer moisture titration; heavy metals testing.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CHD 25 Soaps and Detergents Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 1796/1; Indian Pharmacopoeia Commission Monographs; Cosmetic Ingredients Standards",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_1796",
      evidence_excerpt: "Clause 1.1: Covers requirements and methods of test for chemically pure (CP) refined glycerine.",
      applicability_explanation: "Primary national product standard for chemically pure (CP) 99.5% refined glycerine.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CHD 25; standard chemical for pharmaceutical and personal care industries."
  },
  {
    canonical_name: "Soda Ash (Sodium Carbonate)",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 251:1998",
    new_standard: {
      is_number: "IS 251:1998",
      title: "Soda Ash, Technical — Specification (Fourth Revision)",
      publication_year: 1998,
      version: "Fourth Revision (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "CHD 1",
      division_council: "Chemical",
      scope: "Specifies requirements, purity, and test methods for technical grade soda ash (light and dense sodium carbonate Na2CO3) used in glass manufacturing, detergents, and chemicals.",
      materials: "Anhydrous sodium carbonate produced by Solvay process.",
      technical_requirements: "Total alkalinity (as Na2CO3) minimum 99.0% by mass on dry basis; matter insoluble in water maximum 0.15%; chlorides (as NaCl) maximum 0.5%; iron (as Fe) <= 40 ppm.",
      performance_requirements: "Bulk density 0.50 to 0.65 g/ml for light soda ash, 0.90 to 1.10 g/ml for dense soda ash; high dissolution rate.",
      testing_requirements: "Acid-base titration against standard hydrochloric acid per IS 251 Clause 6; moisture determination by drying at 250 deg C; iron colorimetric test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CHD 1 Inorganic Chemicals Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DCPC Soda Ash (Quality Control) Order S.O. 4402(E); BIS Product Manual PM/IS 251/1; All India Glass Manufacturers Federation Standards",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_251",
      evidence_excerpt: "Clause 1.1: Covers requirements, sampling, and methods of test for light and dense soda ash.",
      applicability_explanation: "Primary national product standard for technical soda ash (sodium carbonate), mandatory under national QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CHD 1; mandatory under DCPC Soda Ash Quality Control Order."
  },
  {
    canonical_name: "Sodium Bicarbonate",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 2124:2000",
    new_standard: {
      is_number: "IS 2124:2000",
      title: "Sodium Bicarbonate — Specification (Second Revision)",
      publication_year: 2000,
      version: "Second Revision (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "CHD 1",
      division_council: "Chemical",
      scope: "Specifies requirements, purity, and test methods for refined and technical grade sodium bicarbonate (NaHCO3) used in baking powder, pharmaceuticals, and fire extinguishers.",
      materials: "Refined sodium hydrogen carbonate.",
      technical_requirements: "Assay (as NaHCO3) minimum 99.0% to 100.5% by mass on dry basis; pH of 1% aqueous solution <= 8.6; heavy metals (as Pb) <= 5 ppm; arsenic <= 1.5 ppm.",
      performance_requirements: "Clear colourless solution in water; thermal decomposition releasing pure CO2 for baking and fire suppression.",
      testing_requirements: "Acid-base titration per IS 2124 Clause 6; heavy metals test; moisture loss on drying.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CHD 1 Inorganic Chemicals Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 2124/1; FSSAI Food Additives Standards; Indian Pharmacopoeia",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_2124",
      evidence_excerpt: "Clause 1.1: Covers requirements and methods of sampling and test for sodium bicarbonate of refined and technical grades.",
      applicability_explanation: "Primary national product standard for sodium bicarbonate.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CHD 1; standard chemical specification."
  },
  {
    canonical_name: "Sodium Bicarbonate Refined",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 2124:2000",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 2124/1; FSSAI Guidelines",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_2124",
      evidence_excerpt: "Clause 1.1: Refined grade sodium bicarbonate for food and pharmaceutical applications.",
      applicability_explanation: "Direct product mapping for refined sodium bicarbonate.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS 2124:2000."
  },
  {
    canonical_name: "Sodium Silicate Glass and Liquid",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 381:1995",
    new_standard: {
      is_number: "IS 381:1995",
      title: "Sodium Silicate — Specification (Second Revision)",
      publication_year: 1995,
      version: "Second Revision (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "CHD 1",
      division_council: "Chemical",
      scope: "Specifies requirements for solid glass cullet and liquid sodium silicate (water glass - Na2O.xSiO2) used in soaps, detergents, adhesives, silica gel, and soil grouting.",
      materials: "Sodium silicate glass lump or aqueous alkaline solution.",
      technical_requirements: "Weight ratio SiO2 : Na2O 2.0 to 3.3; total soluble solids 35% to 55% for liquid grades; specific gravity at 20 deg C 1.35 to 1.60.",
      performance_requirements: "Complete water solubility under high pressure steam; high adhesive bonding strength; alkaline detergent buffering capacity.",
      testing_requirements: "Silica determination gravimetric per IS 381 Clause 6; total alkalinity titration; specific gravity hydrometer test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CHD 1 Inorganic Chemicals Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 381/1; Soaps and Detergents Raw Material Specifications",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_381",
      evidence_excerpt: "Clause 1.1: Covers requirements for solid sodium silicate glass and liquid sodium silicate.",
      applicability_explanation: "Primary national product standard for sodium silicate glass and liquid water glass.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CHD 1; universal standard for water glass."
  },
  {
    canonical_name: "Styrene Butadiene Rubber (SBR)",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 14652:1999",
    new_standard: {
      is_number: "IS 14652:1999",
      title: "Styrene Butadiene Rubber (SBR) 1500 and 1502 — Specification",
      publication_year: 1999,
      version: "Original Edition (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "PCD 13",
      division_council: "Petroleum, Coal and Related Products",
      scope: "Specifies requirements and test methods for emulsion polymerized non-pigmented styrene butadiene synthetic rubber (cold polymerized SBR 1500 staining and SBR 1502 non-staining) used in automotive tyres and footwear.",
      materials: "Synthetic copolymer of styrene (23.5%) and butadiene (76.5%).",
      technical_requirements: "Mooney viscosity ML (1+4) at 100 deg C 46 to 58; bound styrene content 22.5% to 24.5%; volatile matter maximum 0.5%; ash maximum 1.0%.",
      performance_requirements: "Tensile strength of standard vulcanizate minimum 25 MPa; elongation at break >= 500%; high abrasion and wear resistance in tyre compounds.",
      testing_requirements: "Mooney viscosity per IS 3400 (Part 4); bound styrene by refractive index per IS 14652; vulcanization rheometer curve per ASTM D2084.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PCD 13 Rubber Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DCPC Synthetic Rubber (Quality Control) Order S.O. 4396(E); BIS Product Manual PM/IS 14652/1; Automotive Tyre Manufacturers Standards",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_14652",
      evidence_excerpt: "Clause 1.1: Covers requirements for cold polymerized non-pigmented emulsion styrene butadiene rubber (SBR 1500 and 1502).",
      applicability_explanation: "Primary national product standard for synthetic styrene butadiene rubber (SBR 1500 / 1502), mandatory under national QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by PCD 13; mandatory under DCPC Synthetic Rubber Quality Control Order."
  },
  {
    canonical_name: "Sulphuric Acid for Industrial Use",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 266:2020",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 266/1; Chemical Industry Raw Material Specifications",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_266",
      evidence_excerpt: "Clause 1.1: Requirements for commercial technical sulphuric acid (98% H2SO4).",
      applicability_explanation: "Primary national product standard for industrial sulphuric acid.",
      confidence_score: 0.99
    },
    investigation_notes: "IS 266:2020 exists in DB (Standard ID 271)."
  },
  {
    canonical_name: "Synthetic Detergent Powder",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 4955:2020",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 4955/1; Consumer Affairs Eco-Mark Detergent Specifications",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_4955",
      evidence_excerpt: "Clause 1.1: Covers requirements for synthetic detergent powders for household and commercial laundry.",
      applicability_explanation: "Primary national product standard for synthetic detergent powders.",
      confidence_score: 0.99
    },
    investigation_notes: "IS 4955:2020 exists in DB (Standard ID 274)."
  },
  {
    canonical_name: "Synthetic Detergent Powder for Household Use",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 4955:2020",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 4955/1 Clause 1.1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_4955",
      evidence_excerpt: "Clause 1.1: Active surfactant and cleaning performance requirements for household synthetic detergents.",
      applicability_explanation: "Direct product mapping for household synthetic detergent powder.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS 4955:2020."
  },
  {
    canonical_name: "Technical Phenol Synthetic",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 538:1968",
    new_standard: {
      is_number: "IS 538:1968",
      title: "Phenol (Carbolic Acid) — Specification (First Revision)",
      publication_year: 1968,
      version: "First Revision (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "CHD 8",
      division_council: "Chemical",
      scope: "Specifies requirements, purity, and tests for synthetic and natural phenol (hydroxybenzene) used for phenolic resins, bisphenol-A, caprolactam, and pharmaceuticals.",
      materials: "Pure synthetic phenol (C6H5OH) produced by cumene hydroperoxide process.",
      technical_requirements: "Crystallizing point minimum 40.6 deg C; purity minimum 99.5% by mass on dry basis; non-volatile residue maximum 0.01%; water <= 0.1%.",
      performance_requirements: "Clear colourless liquid upon melting; freedom from cresol and tar acid impurities.",
      testing_requirements: "Crystallizing point thermometer per IS 538 Clause 6; gas chromatography purity; water titration.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CHD 8 Organic Chemicals Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "Department of Chemicals and Petrochemicals (DCPC) Phenol (Quality Control) Order S.O. 1235(E); BIS Product Manual PM/IS 538/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_538",
      evidence_excerpt: "Clause 1.1: Covers requirements and methods of sampling and test for pure synthetic phenol.",
      applicability_explanation: "Primary national product standard for synthetic technical phenol, mandatory under DCPC QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CHD 8; mandatory under DCPC Phenol Quality Control Order."
  },
  {
    canonical_name: "Titanium Dioxide Rutile Grade",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 411:2020",
    new_standard: {
      is_number: "IS 411:2020",
      title: "Titanium Dioxide, Rutile and Anatase for Paints — Specification (Fourth Revision)",
      publication_year: 2020,
      version: "Fourth Revision",
      status: "ACTIVE",
      technical_committee: "CHD 20",
      division_council: "Chemical",
      scope: "Specifies requirements and tests for rutile and anatase grades of titanium dioxide white pigments used in paints, plastics, inks, and paper.",
      materials: "Surface treated synthetic titanium dioxide (TiO2).",
      technical_requirements: "TiO2 content minimum 94.0% for rutile pigment; relative scattering power (lightness) >= 100; oil absorption 15 to 25 g/100g; residue on 45 micron sieve <= 0.05%.",
      performance_requirements: "High weatherability resistance; chalking resistance; colour CIE L* >= 97.5; water soluble matter <= 0.5%.",
      testing_requirements: "Reduction-ferric titration for TiO2 per IS 411 Clause 7; X-ray diffraction (XRD) rutile content; spectrophotometric colour L*, a*, b*.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CHD 20 Paints and Pigments Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DCPC Titanium Dioxide (Quality Control) Order S.O. 4403(E); BIS Product Manual PM/IS 411/1; Paint Manufacturers Association Standards",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_411",
      evidence_excerpt: "Clause 1.1: Covers requirements for titanium dioxide pigment of rutile and anatase crystal structures for surface coatings.",
      applicability_explanation: "Primary national product standard for rutile grade titanium dioxide white pigment, mandatory under national QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CHD 20; mandatory under DCPC Titanium Dioxide Quality Control Order."
  },
  {
    canonical_name: "Toilet Soap Grade 1 (TFM 76%)",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 2888:2021",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 2888/1 Table 1 Grade 1; Consumer Affairs Eco-Mark Guidelines",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_2888",
      evidence_excerpt: "Table 1 Grade 1: Total fatty matter (TFM) minimum 76.0% by mass; matter insoluble in alcohol <= 3.0%.",
      applicability_explanation: "Primary national standard for Grade 1 high-TFM toilet soaps.",
      confidence_score: 0.99
    },
    investigation_notes: "IS 2888:2021 exists in DB (Standard ID 273)."
  },
  {
    canonical_name: "Toilet Soap Grade 2 (TFM 70%)",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 2888:2021",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 2888/1 Table 1 Grade 2",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_2888",
      evidence_excerpt: "Table 1 Grade 2: Total fatty matter (TFM) minimum 70.0% by mass.",
      applicability_explanation: "Direct product mapping for Grade 2 toilet soaps.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS 2888:2021 Table 1."
  },
  {
    canonical_name: "Toilet Soaps for Personal Hygiene",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 2888:2021",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 2888/1 Clause 1.1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_2888",
      evidence_excerpt: "Clause 1.1: General requirements for toilet soaps used for personal hygiene and bathing.",
      applicability_explanation: "Direct product mapping for personal hygiene toilet soaps.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS 2888:2021."
  },
  {
    canonical_name: "Toluene for Industrial Solvent Use",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 538:2020",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DCPC Toluene QCO S.O. 1230(E); BIS Product Manual PM/IS 538/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_538",
      evidence_excerpt: "Clause 1.1: Requirements for industrial pure toluene solvent.",
      applicability_explanation: "Direct product mapping for industrial toluene solvent.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS 538:2020."
  },
  {
    canonical_name: "Two-Component Polyurethane Wood Coating",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 158:1981",
    mapping: {
      relationship_type: "supporting_reference",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS CHD 20 Paint Standards; CPWD Wood Finishing Subhead 13 Clause 13.52",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_158",
      evidence_excerpt: "Clause 4.1: Polyurethane resin hardness, gloss retention, and scratch resistance parameters.",
      applicability_explanation: "Specifies polyurethane resin solids, scratch resistance, and film hardness for wood coatings.",
      confidence_score: 0.90
    },
    investigation_notes: "Formulated under CHD 20 for polyurethane protective clear finishes."
  },
  {
    canonical_name: "Urea Fertilizer (Agricultural Grade)",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 540:1979",
    new_standard: {
      is_number: "IS 540:1979",
      title: "Urea, Technical and Pure — Specification (Second Revision)",
      publication_year: 1979,
      version: "Second Revision (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "CHD 1 / FAD 7",
      division_council: "Chemical",
      scope: "Specifies requirements, purity, and biuret content limits for prilled and granular agricultural grade urea fertilizer [CO(NH2)2].",
      materials: "Synthetic urea prills or granules.",
      technical_requirements: "Total nitrogen content minimum 46.0% by mass on dry basis; biuret maximum 1.5% by mass; moisture maximum 1.0%; particle size 1.0 mm to 2.8 mm >= 90%.",
      performance_requirements: "Complete dissolution in water; low biuret to prevent seedling phytotoxicity; non-caking free-flowing prills.",
      testing_requirements: "Kjeldahl total nitrogen titration per IS 540 Clause 6; biuret spectrophotometric determination per Clause 7; moisture oven drying.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CHD 1 / FAD 7 Fertilizers Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_STATUTORY",
      evidence_source: "Ministry of Agriculture Fertilizer (Inorganic, Organic or Mixed) (Control) Order (FCO 1985) Schedule I Part A; Essential Commodities Act, 1955; BIS PM/IS 540",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_540",
      evidence_excerpt: "Schedule I Part A Entry 1(a)(1): Urea (46% N) specifications conforming to national fertilizer standards.",
      applicability_explanation: "Primary national statutory product standard for agricultural grade prilled urea fertilizer (46% N).",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated jointly by CHD 1 and FAD 7; mandatory under statutory Fertilizer Control Order (FCO 1985)."
  },
  {
    canonical_name: "Water-Based Acrylic Distemper",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 428:2013",
    new_standard: {
      is_number: "IS 428:2013",
      title: "Distemper, Acrylic Washable — Specification (Second Revision)",
      publication_year: 2013,
      version: "Second Revision (Reaffirmed 2019)",
      status: "ACTIVE",
      technical_committee: "CHD 20",
      division_council: "Chemical",
      scope: "Specifies requirements, washability, and lead content limits for water-based acrylic washable distemper paints for interior masonry surfaces.",
      materials: "Water-borne 100% acrylic copolymer emulsion binder, titanium dioxide, calcium carbonate, non-toxic biocides.",
      technical_requirements: "Drying time surface dry <= 30 minutes, hard dry <= 4 hours; washability resistance >= 1000 oscillations without film breakthrough; lead content <= 90 ppm.",
      performance_requirements: "Smooth matte finish; recoatability after 4 hours; opacity contrast ratio >= 0.90; scrub resistance.",
      testing_requirements: "Wet scrub washability test machine per IS 101 (Part 5/Sec 2); opacity test per IS 101 (Part 4/Sec 2); lead estimation per IS 101 (Part 8/Sec 5).",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CHD 20 Paints Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_STATUTORY",
      evidence_source: "Regulation of Lead Contents in Household Paints Rules, 2016; BIS Product Manual PM/IS 428/1; CPWD Subhead 13 Clause 13.41",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_428",
      evidence_excerpt: "Clause 1.1: Covers requirements for acrylic washable distemper for interior application on plastered concrete and masonry.",
      applicability_explanation: "Primary national product standard for interior water-based acrylic washable distemper paint.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CHD 20; mandatory lead limit <= 90 ppm."
  },
  {
    canonical_name: "Xylene (Industrial Solvent Grade)",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 359:2020",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DCPC Xylene QCO S.O. 1231(E); BIS Product Manual PM/IS 359/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_359",
      evidence_excerpt: "Clause 1.1: Requirements for industrial mixed xylenes.",
      applicability_explanation: "Direct product mapping for industrial xylene solvent.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS 359:2020."
  },
  {
    canonical_name: "Zinc Oxide Technical Rubber Grade",
    council: "CHD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 3399:1993",
    new_standard: {
      is_number: "IS 3399:1993",
      title: "Zinc Oxide for Rubber Industry — Specification (Second Revision)",
      publication_year: 1993,
      version: "Second Revision (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "PCD 13",
      division_council: "Petroleum, Coal and Related Products",
      scope: "Specifies requirements, purity, and surface area for active white zinc oxide (ZnO) powder used as vulcanization activator in rubber and tyre manufacture.",
      materials: "French process or direct process zinc oxide powder.",
      technical_requirements: "Zinc oxide content minimum 99.0% by mass on dry basis; lead content (as Pb) maximum 0.05%; residue on 45 micron sieve <= 0.1%; surface area 3 to 6 m2/g.",
      performance_requirements: "Curing rate acceleration; optimum modulus and heat build-up reduction in tyre compounds.",
      testing_requirements: "EDTA titration for total zinc per IS 3399 Clause 6; BET nitrogen specific surface area; lead determination by AAS.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PCD 13 Rubber Industry Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 3399/1; Automotive Tyre Compound Standards",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_3399",
      evidence_excerpt: "Clause 1.1: Covers requirements and methods of test for zinc oxide used as an activator in the rubber industry.",
      applicability_explanation: "Primary national product standard for rubber-grade zinc oxide vulcanization activator.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by PCD 13; universal compounding ingredient in rubber processing."
  }
];

module.exports = { CHD_INVESTIGATION };
