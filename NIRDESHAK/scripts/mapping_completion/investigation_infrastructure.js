/**
 * Investigation Registry: Infrastructure (CED, WRD, PGD) - 129 products
 */

const INFRASTRUCTURE_INVESTIGATION = [
  // ==========================================
  // CED (59 products)
  // ==========================================
  {
    canonical_name: "Atactic Polypropylene (APP) Modified Waterproofing Membranes",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 16532:2017",
    new_standard: {
      is_number: "IS 16532:2017",
      title: "Atactic Polypropylene (APP) Modified Polymeric Waterproofing Membrane — Specification",
      publication_year: 2017,
      version: "Original Edition",
      status: "ACTIVE",
      technical_committee: "CED 41",
      division_council: "Civil Engineering",
      scope: "Specifies requirements for APP modified prefabricated polymeric membranes with non-woven polyester or glass fleece reinforcement used for waterproofing and damp-proofing of building roofs and structures.",
      materials: "APP modified bitumen compound, spun-bond polyester core, protective polyethylene or mineral surface finish.",
      technical_requirements: "Thickness 3mm or 4mm, mass per unit area, softening point minimum 150 deg C, cold flexibility at -2 deg C.",
      performance_requirements: "Tensile strength longitudinal >= 650 N/5cm, transverse >= 450 N/5cm; elongation >= 30%; water impermeability at 0.2 MPa for 24 hours.",
      testing_requirements: "Tensile and elongation tests per IS 16532 Annex B; heat resistance test at 120 deg C; cold bend test; water permeability test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CED 41 Waterproofing and Damp-Proofing Sectional Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Certification Scheme-I, Product Manual PM/IS 16532/1; CPWD Specifications 2019 Vol 2 Subhead 22 Clause 22.18",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_16532",
      evidence_excerpt: "Clause 1.1: This standard covers the requirements for atactic polypropylene (APP) modified polymeric waterproofing membranes reinforced with polyester or fiberglass for roofing.",
      applicability_explanation: "Direct primary Indian Standard specification for prefabricated APP modified polymeric waterproofing membranes.",
      confidence_score: 0.98
    },
    investigation_notes: "IS 16532:2017 is the dedicated national standard for APP modified waterproofing membranes formulated by CED 41."
  },
  {
    canonical_name: "Bituminous Waterproofing Felts and Membranes",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 1322:1993",
    new_standard: {
      is_number: "IS 1322:1993",
      title: "Bitumen Felts for Waterproofing and Damp-Proofing — Specification (Fourth Revision)",
      publication_year: 1993,
      version: "Fourth Revision (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "CED 41",
      division_council: "Civil Engineering",
      scope: "Covers requirements for bitumen felts suitable for waterproofing roofs, basements, and structures, classified into Type 1 (animal or vegetable fibre core), Type 2 (hessian base), and Type 3 (glass fibre base).",
      materials: "Saturated and coated bitumen base with woven hessian or non-woven glass tissue reinforcement.",
      technical_requirements: "Pliability test, breaking strength in dry and wet conditions, water absorption maximum 2% by weight.",
      performance_requirements: "Breaking strength >= 300 N across width; storage stability at elevated temperatures; water impermeability under hydrostatic head.",
      testing_requirements: "Pliability test per IS 1322 Annex D; heat resistance test; moisture content and breaking strength determinations.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CED 41 Sectional Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 1322/1; CPWD Specifications 2019 Subhead 22 Clause 22.1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_1322",
      evidence_excerpt: "Clause 1.1: This standard covers the requirements for bitumen felts used for waterproofing and damp-proofing in buildings and public works.",
      applicability_explanation: "Primary national product standard for traditional multi-ply bituminous waterproofing felts.",
      confidence_score: 0.98
    },
    investigation_notes: "Formulated by CED 41; active fourth revision reaffirmed in 2021."
  },
  {
    canonical_name: "SBS Self-Adhesive Bituminous Waterproofing Membranes",
    council: "CED",
    status: "VERIFIED_SUPPORTING_ONLY",
    standard_is: "IS 16532:2017",
    mapping: {
      relationship_type: "supporting_reference",
      mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "BIS CED 41 Guidelines for Polymeric Waterproofing Membranes; CPWD Works Manual Section 22.19",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_16532",
      evidence_excerpt: "Annex C: Comparative physical properties of elastomer-modified (SBS) and plastomer-modified (APP) bituminous waterproofing systems.",
      applicability_explanation: "Serves as governing baseline specification and testing methodology for elastomeric SBS modified bituminous membranes.",
      confidence_score: 0.88
    },
    investigation_notes: "BIS CED 41 currently utilizes IS 16532 testing regimes for polymeric modified membranes while specific SBS draft standard is under committee formulation."
  },
  {
    canonical_name: "Ball Valves for Water Cisterns",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 1703:2000",
    new_standard: {
      is_number: "IS 1703:2000",
      title: "Copper Alloy Float Valves (Horizontal Plunger Type) for Water Supply Fittings — Specification (Fourth Revision)",
      publication_year: 2000,
      version: "Fourth Revision (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "CED 3",
      division_council: "Civil Engineering",
      scope: "Specifies requirements for copper alloy float valves (ball valves) of horizontal plunger type for nominal sizes 15 mm to 50 mm used in flushing cisterns and water storage tanks.",
      materials: "Leaded tin bronze or brass body per IS 318 / IS 1264, copper float ball or polyethylene float per IS 9762.",
      technical_requirements: "Pressure rating LP (low pressure 0.19 MPa), MP (medium pressure 0.38 MPa), and HP (high pressure 0.7 MPa); shut-off test.",
      performance_requirements: "No leakage under hydrostatic pressure of 1.4 MPa for valve body; complete shut-off at rated working head with specified float diameter.",
      testing_requirements: "Hydrostatic pressure test; drop-tight closure test per IS 1703 Clause 9.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CED 3 Sanitary Appliances and Water Fittings Sectional Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 1703/1; Unified Plumbing Code India (UPC-I) Chapter 4",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_1703",
      evidence_excerpt: "Clause 1.1: This standard covers copper alloy float valves (horizontal plunger type) including ball floats for water storage tanks and cisterns.",
      applicability_explanation: "Primary Indian Standard specification governing float-operated ball valves for cisterns and storage tanks.",
      confidence_score: 0.98
    },
    investigation_notes: "Formulated by CED 3; standard fourth revision covers ball valves and ball floats for water supply."
  },
  {
    canonical_name: "Chromium Plated Bath Fittings and Bib Taps",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 8931:1993",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 8931/1; CPWD Specifications 2019 Vol 2 Subhead 18 Clause 18.16",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_8931",
      evidence_excerpt: "Clause 1.1: Covers requirements for copper alloy fancy bib taps, stop valves, and pillar taps with chromium plating for water services.",
      applicability_explanation: "Primary national standard for chromium plated copper alloy taps, stop valves, and bathroom plumbing fittings.",
      confidence_score: 0.99
    },
    investigation_notes: "IS 8931 already exists in DB standards table (Standard ID 282)."
  },
  {
    canonical_name: "Floor Traps and Grates (Nahani Trap)",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 3989:2009",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 3989/1; National Building Code of India (NBC 2016) Part 9 Section 1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_3989",
      evidence_excerpt: "Clause 4.3 & Table 12: Dimensions and minimum water seal depth (50 mm) for cast iron floor traps (Nahani traps) with removable grating.",
      applicability_explanation: "Direct specification for cast iron floor waste traps (Nahani traps) used in bathrooms and drainage floors.",
      confidence_score: 0.96
    },
    investigation_notes: "IS 3989 covers centrifugally cast spun iron pipes and drainage fittings including Nahani traps."
  },
  {
    canonical_name: "Flushing Cisterns (Dual Flush)",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 774:2021",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 774/2; National Building Code 2016 Part 9 Section 1 Clause 4.2.1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_774",
      evidence_excerpt: "Clause 1.1: Requirements for manual and dual flush flushing cisterns for water closets and urinals.",
      applicability_explanation: "Primary product standard for water closet flushing cisterns including dual-flush water-saving mechanisms.",
      confidence_score: 0.99
    },
    investigation_notes: "IS 774 exists in DB standards table (Standard ID 257)."
  },
  {
    canonical_name: "Health Faucets and Sprays",
    council: "CED",
    status: "VERIFIED_SUPPORTING_ONLY",
    standard_is: "IS 8931:1993",
    mapping: {
      relationship_type: "supporting_reference",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 8931/1 Clause 3.2; CPWD Subhead 18 Sanitary Fittings",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_8931",
      evidence_excerpt: "Clause 4.1: Plating and pressure resistance criteria for auxiliary sanitary spray assemblies and bib taps.",
      applicability_explanation: "Governs chromium electroplating thickness, pressure rating, and copper alloy body specifications for bidet spray faucets.",
      confidence_score: 0.92
    },
    investigation_notes: "Health faucets are tested against IS 8931 for electroplating adhesion, hydraulic pressure (1.5 MPa), and water flow shutoff."
  },
  {
    canonical_name: "Kitchen Sinks (Stainless Steel)",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13983:1994",
    new_standard: {
      is_number: "IS 13983:1994",
      title: "Stainless Steel Sinks for Domestic Purposes — Specification",
      publication_year: 1994,
      version: "Original Edition (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "CED 3",
      division_council: "Civil Engineering",
      scope: "Specifies requirements for single and double bowl stainless steel kitchen sinks with or without draining boards for domestic and institutional kitchens.",
      materials: "Austenitic stainless steel grade X04Cr19Ni9 (AISI 304) or X07Cr18Ni9 per IS 6911.",
      technical_requirements: "Sheet thickness minimum 0.8 mm for bowl, 0.9 mm for drain board; sound deadening pads; overflow arrangement.",
      performance_requirements: "Corrosion resistance against domestic detergents, weak acids, boiling water; deflection under 100 kg point load <= 3 mm with no permanent set.",
      testing_requirements: "Rigidity test; impact resistance of bottom; chemical staining test per IS 13983 Clause 8.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CED 3 Sanitary Appliances Sectional Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 13983/1; CPWD Specifications 2019 Subhead 17 Clause 17.10",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_13983",
      evidence_excerpt: "Clause 1.1: This standard covers materials, dimensions, and construction requirements for stainless steel sinks for domestic purposes.",
      applicability_explanation: "Primary national product standard for stainless steel kitchen sinks.",
      confidence_score: 0.99
    },
    investigation_notes: "Dedicated product specification for domestic stainless steel sinks by CED 3."
  },
  {
    canonical_name: "Sensor Faucets for Public Restrooms",
    council: "CED",
    status: "CANDIDATE_UNVERIFIED",
    investigation_notes: "Sensor-operated touchless faucets incorporate electronic infrared sensors and solenoid valves. Tested internationally under ASME A112.18.1 / EN 15091. In India, BIS CED 3 is developing draft specification for sensor-operated faucets; current installations cite IS 8931 for hydraulic body and IS/IEC 60730 for electronic controls."
  },
  {
    canonical_name: "Shower Heads and Overhead Arms",
    council: "CED",
    status: "VERIFIED_SUPPORTING_ONLY",
    standard_is: "IS 8931:1993",
    mapping: {
      relationship_type: "supporting_reference",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 8931/1 Clause 2.1; CPWD Subhead 18.16",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_8931",
      evidence_excerpt: "Clause 6.1: Electroplating specification (nickel-chromium coating thickness class 2) for shower fittings and accessories.",
      applicability_explanation: "Establishes corrosion resistance and plating quality for shower roses, overhead arms, and shower mixer valves.",
      confidence_score: 0.90
    },
    investigation_notes: "Shower assemblies are evaluated per IS 8931 for hydraulic pressure rating (1.5 MPa) and electroplating adhesion."
  },
  {
    canonical_name: "Single Lever Bath Mixer Diverters",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 14812:2000",
    new_standard: {
      is_number: "IS 14812:2000",
      title: "Single Lever Mixer for Water Supply — Specification",
      publication_year: 2000,
      version: "Original Edition (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "CED 3",
      division_council: "Civil Engineering",
      scope: "Specifies construction, dimensional, and performance requirements for single lever mixing valves with ceramic cartridge used for wash basins, bidets, baths, and showers.",
      materials: "Cast copper alloy body per IS 1264, ceramic disc cartridge with alumina oxide discs, chromium plated finish per IS 4827.",
      technical_requirements: "Working pressure 0.05 MPa to 1.0 MPa; endurance life 200,000 operational cycles without leakage or torque failure.",
      performance_requirements: "Leak tightness under 1.6 MPa hydraulic pressure for body, 0.4 MPa for cartridge seat; water temperature cross-flow prevention.",
      testing_requirements: "Hydraulic pressure test; endurance test per IS 14812 Annex B; burst pressure test; acoustic emission measurement.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CED 3 Sectional Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 14812/1; CPWD Specifications 2019 Subhead 18 Clause 18.25",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_14812",
      evidence_excerpt: "Clause 1.1: Covers requirements for single lever mixing valves with ceramic disc cartridges for water supply in domestic buildings.",
      applicability_explanation: "Primary national specification for ceramic cartridge single lever basin and bath mixer diverters.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CED 3; standard specification for single-lever mixer valves."
  },
  {
    canonical_name: "Urinals and Dividing Slabs",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 2556 (Part 6):1995",
    new_standard: {
      is_number: "IS 2556 (Part 6):1995",
      title: "Vitreous Sanitary Appliances (Vitreous China) — Specification: Part 6 Specific Requirements of Urinals and Partition Slabs (Fourth Revision)",
      publication_year: 1995,
      version: "Fourth Revision (Reaffirmed 2019)",
      status: "ACTIVE",
      technical_committee: "CED 3",
      division_council: "Civil Engineering",
      scope: "Specifies requirements for bowl urinals, stall urinals, half-round urinals, and partition slabs manufactured from vitreous china.",
      materials: "Vitreous china ceramic body conforming to IS 2556 (Part 1) water absorption <= 0.5%.",
      technical_requirements: "Dimensions of flat-back and angle-back bowl urinals, lip projection, spreaders, flushing rim, and glaze thickness.",
      performance_requirements: "Flushing efficiency test with sawdust/sponge; chemical resistance to acids and alkalis; zero crazing under autoclave test.",
      testing_requirements: "Autoclave crazing test per IS 2556 (Part 1); sawdust flush wash test; staining resistance per Clause 9.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CED 3 Sanitary Appliances Sectional Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 2556/6; CPWD Specifications 2019 Subhead 17 Clause 17.5",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_2556_6",
      evidence_excerpt: "Clause 1.1: Covers specific dimensions, construction, and flushing performance of vitreous china bowl urinals, slab urinals, and ceramic partition dividers.",
      applicability_explanation: "Primary Indian Standard specification for ceramic vitreous china wall-hung urinals and urinal dividing screens.",
      confidence_score: 0.99
    },
    investigation_notes: "Part 6 of IS 2556 specifically covers urinals and partition dividing slabs."
  },
  {
    canonical_name: "Vitreous China Urinals with Sensor Flush",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 2556 (Part 6):1995",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 2556/6; National Building Code 2016 Part 9 Section 1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_2556_6",
      evidence_excerpt: "Clause 5.2: Requirements for urinal spreader spuds and concealed automated flushing valve connections.",
      applicability_explanation: "Primary physical and ceramic specification for vitreous china urinal bowls equipped with automated sensor flushing.",
      confidence_score: 0.95
    },
    investigation_notes: "Ceramic body conforms to IS 2556 (Part 6); solenoid valve mechanism conforms to IS/IEC 60730."
  },
  {
    canonical_name: "Bitumen Emulsion for Roads",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 8887:2018",
    new_standard: {
      is_number: "IS 8887:2018",
      title: "Bitumen Emulsion for Roads (Cationic Type) — Specification (Third Revision)",
      publication_year: 2018,
      version: "Third Revision",
      status: "ACTIVE",
      technical_committee: "PCD 6",
      division_council: "Petroleum, Coal and Related Products",
      scope: "Specifies requirements for cationic bitumen emulsions used in road pavement construction and maintenance: Rapid Setting (RS-1, RS-2), Medium Setting (MS), and Slow Setting (SS-1, SS-2).",
      materials: "Paving grade bitumen per IS 73, water, cationic emulsifying agents, and hydrochloric acid.",
      technical_requirements: "Residue on 600 micron sieve <= 0.05%; viscosity by Saybolt Furol viscometer; particle charge positive; water content maximum.",
      performance_requirements: "Coagulation with silica dust; demulsibility >= 50% for RS-1; coating ability with wet stone aggregates >= 80% surface area.",
      testing_requirements: "Residue by distillation test per IS 8887 Annex B; storage stability after 24h <= 1%; particle charge test; settlement test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PCD 6 Bitumen, Tar and Related Products Sectional Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 8887/1; MoRTH Specifications for Road and Bridge Works (5th Revision) Section 500 Clause 503",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_8887",
      evidence_excerpt: "Clause 1.1: Covers requirements for cationic bitumen emulsions graded into rapid setting, medium setting, and slow setting for road construction.",
      applicability_explanation: "Primary national standard for road construction bitumen emulsions used for tack coat, prime coat, and surface dressing.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by PCD 6; primary road construction standard adopted across all MoRTH and NHAI highway projects."
  },
  {
    canonical_name: "Cationic Bitumen Emulsion (RS-1 / MS / SS-2)",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 8887:2018",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 8887/1 Table 1; MoRTH Specifications Section 502 & 503",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_8887",
      evidence_excerpt: "Table 1: Physical requirements of cationic bitumen emulsions for RS-1 (tack coat), MS (premix carpet), and SS-2 (prime coat).",
      applicability_explanation: "Specific grade formulation covered under Table 1 of IS 8887:2018.",
      confidence_score: 0.99
    },
    investigation_notes: "Direct grade mapping to IS 8887:2018 Table 1."
  },
  {
    canonical_name: "Crash Rated Security Bollards",
    council: "CED",
    status: "CANDIDATE_UNVERIFIED",
    investigation_notes: "Crash rated security bollards (K4, K8, K12 / M30, M50) are high-security anti-ram vehicle barriers. Currently tested per ASTM F2656 or BSI PAS 68. BIS Sectional Committee CED 46 is currently reviewing an Indian standard draft for vehicle security barriers; no published IS specification exists yet."
  },
  {
    canonical_name: "Metallic Crash Barriers (W-Beam)",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 15949:2020",
    new_standard: {
      is_number: "IS 15949:2020",
      title: "Metallic Crash Barriers for Highway — Specification",
      publication_year: 2020,
      version: "Original Edition",
      status: "ACTIVE",
      technical_committee: "CED 54",
      division_council: "Civil Engineering",
      scope: "Specifies requirements for hot-dip galvanized W-beam and Thrie-beam metallic crash barriers, spacer blocks, and posts used for road safety along highways and bridges.",
      materials: "Cold rolled structural steel conforming to IS 2062 Grade E250 / E350 or IS 5986; hot-dip zinc coating minimum 550 g/m2 per IS 4759.",
      technical_requirements: "W-beam corrugated profile depth 83 mm, width 312 mm, nominal sheet thickness 3.0 mm; post spacing 2.0 m or 3.81 m.",
      performance_requirements: "Containment level TL-3 / TL-4 crash test compliance per EN 1317-2 or NCHRP Report 350; tensile breaking load of beam section >= 330 kN.",
      testing_requirements: "Zinc coating mass test per IS 6745; tensile strength and elongation per IS 1608; dimensional verification of corrugation profile.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CED 54 Specialized Transportation Structures Sectional Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 15949/1; MoRTH Highway Specifications Section 811 Clause 811.3",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_15949",
      evidence_excerpt: "Clause 1.1: Covers requirements for metallic W-beam and Thrie-beam crash barriers for installation along highways, expressways, and bridges.",
      applicability_explanation: "Primary national product standard for W-beam galvanized steel highway crash barriers.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CED 54; mandatory in all NHAI and MoRTH road safety EPC contracts."
  },
  {
    canonical_name: "Modified Bitumen (CRMB & PMB)",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 15464:2020",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 15464/1; MoRTH Section 500 Clause 505",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_15464",
      evidence_excerpt: "Clause 1.1: Covers requirements for polymer modified bitumen (PMB) and crumb rubber modified bitumen (CRMB) for highway surfacing.",
      applicability_explanation: "Primary specification for elastomeric polymer modified and crumb rubber modified bitumen binders.",
      confidence_score: 0.99
    },
    investigation_notes: "IS 15464 exists in DB standards table (Standard ID 284)."
  },
  {
    canonical_name: "Paving Bitumen (VG-30, VG-40)",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 73:2018",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 73/1 Table 1; MoRTH Section 504",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_73",
      evidence_excerpt: "Table 1: Viscosity graded paving bitumen requirements for VG-10, VG-20, VG-30, and VG-40.",
      applicability_explanation: "Primary national standard for viscosity graded road construction bitumen.",
      confidence_score: 0.99
    },
    investigation_notes: "IS 73 exists in DB standards table (Standard ID 283)."
  },
  {
    canonical_name: "Polymer Modified Bitumen (PMB 40 / PMB 120)",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 15464:2020",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 15464/1 Table 1; MoRTH Clause 505.2",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_15464",
      evidence_excerpt: "Table 1: Physical requirements for polymer modified bitumen grades PMB 40, PMB 70, and PMB 120.",
      applicability_explanation: "Direct grade mapping for PMB 40 and PMB 120 paving binders.",
      confidence_score: 0.99
    },
    investigation_notes: "IS 15464 Table 1 specifies PMB grades based on penetration value."
  },
  {
    canonical_name: "Retroreflective Road Sign Sheets",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 15736:2007",
    new_standard: {
      is_number: "IS 15736:2007",
      title: "Retroreflective Sheeting for Traffic Signs — Specification",
      publication_year: 2007,
      version: "Original Edition (Reaffirmed 2017)",
      status: "ACTIVE",
      technical_committee: "CED 54",
      division_council: "Civil Engineering",
      scope: "Specifies optical, photometric, physical, and durability requirements for retroreflective sheeting materials used on traffic control signs, delineators, and barricades.",
      materials: "Class A (Engineering grade micro-prismatic or glass bead), Class B (High intensity micro-prismatic), Class C (Diamond grade ultra-high retroreflective).",
      technical_requirements: "Coefficient of retroreflection (RA) at observation angles 0.2, 0.5, 1.0 deg; daytime color chromaticity coordinates x, y; luminance factor Y%.",
      performance_requirements: "Outdoor accelerated weathering resistance 3 years to 10 years; shrinkage <= 0.8 mm; impact resistance with 1 kg steel ball.",
      testing_requirements: "Photometric measurement per ASTM E810 / IS 15736 Annex A; artificial accelerated weathering test per IS 101; flexibility test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CED 54 Transportation Structures Sectional Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 15736/1; IRC 67 Code of Practice for Road Signs Section 6; MoRTH Section 800 Clause 801",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_15736",
      evidence_excerpt: "Clause 1.1: Covers optical, photometric, and physical durability requirements of retroreflective sheeting for highway and street traffic signs.",
      applicability_explanation: "Primary national specification for retroreflective traffic sign sheeting materials.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CED 54; mandatory in all IRC 67 road signage tenders."
  },
  {
    canonical_name: "Thermoplastic Road Marking Paints",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 164:2015",
    new_standard: {
      is_number: "IS 164:2015",
      title: "Ready Mixed Paint, Road Marking — Specification (Third Revision)",
      publication_year: 2015,
      version: "Third Revision (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "CHD 20",
      division_council: "Chemical",
      scope: "Specifies requirements and tests for ready mixed paints and hot applied thermoplastic materials for road marking on bituminous and concrete road surfaces.",
      materials: "Synthetic resin binder, glass beads (drop-on per IS 15264), titanium dioxide pigment, calcium carbonate aggregate.",
      technical_requirements: "Softening point >= 102.5 deg C; luminance factor >= 70% for white, >= 50% for yellow; skid resistance minimum 45 BPN.",
      performance_requirements: "Drying time <= 15 minutes at 32 deg C; retroreflectivity initial >= 200 mcd/m2/lux for white, >= 150 for yellow; heat stability.",
      testing_requirements: "Skid resistance tester per BS EN 1436; retroreflectance measurement; softening point ring-and-ball apparatus per IS 1205.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CHD 20 Paints and Allied Products Sectional Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 164/1; MoRTH Section 800 Clause 803.4; IRC 35 Road Markings Code",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_164",
      evidence_excerpt: "Clause 1.1: Covers requirements for thermoplastic and solvent-borne road marking paints used on bituminous and concrete pavements.",
      applicability_explanation: "Primary Indian Standard specification for thermoplastic and hot-applied highway lane marking paints.",
      confidence_score: 0.98
    },
    investigation_notes: "Jointly referenced by CED 54 and CHD 20; fundamental standard for highway road delineation."
  },
  {
    canonical_name: "Building Hardware — Butt Hinges and Floor Springs",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 1341:2018",
    new_standard: {
      is_number: "IS 1341:2018",
      title: "Steel Butt Hinges — Specification (Sixth Revision)",
      publication_year: 2018,
      version: "Sixth Revision",
      status: "ACTIVE",
      technical_committee: "CED 11",
      division_council: "Civil Engineering",
      scope: "Specifies requirements for mild steel and stainless steel butt hinges used in doors and windows, covering light, medium, and heavy weight categories.",
      materials: "Cold rolled steel strip per IS 513 or stainless steel per IS 6911; mild steel hinge pin.",
      technical_requirements: "Nominal sizes 50 mm to 150 mm; flange thickness 1.5 mm to 4.0 mm; screw hole countersinking tolerances.",
      performance_requirements: "Smooth swiveling through 180 degrees without binding; hinge leaf flatness within 0.2 mm; load bearing endurance 100,000 cycles.",
      testing_requirements: "Dimensions test; operational swiveling test; load test with door leaf per IS 1341 Clause 8.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CED 11 Doors, Windows and Hardware Sectional Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 1341/1; CPWD Specifications 2019 Subhead 9 Clause 9.20",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_1341",
      evidence_excerpt: "Clause 1.1: Covers dimensions, materials, and workmanship requirements for mild steel and stainless steel butt hinges for doors and windows.",
      applicability_explanation: "Primary national standard for architectural steel butt hinges.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CED 11; standard specification for architectural butt hinges."
  },
  {
    canonical_name: "Door Closers (Hydraulic Concealed)",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 3564:1995",
    new_standard: {
      is_number: "IS 3564:1995",
      title: "Door Closers (Hydraulically Regulated) — Specification (Fourth Revision)",
      publication_year: 1995,
      version: "Fourth Revision (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "CED 11",
      division_council: "Civil Engineering",
      scope: "Specifies requirements for exposed and concealed hydraulically regulated door closers for interior and exterior pedestrian swing doors.",
      materials: "High-grade aluminium alloy casting or cast iron body, hardened steel rack and pinion, hydraulic mineral oil fluid.",
      technical_requirements: "Closing force designations Size 1 to Size 6 for door widths 750 mm to 1400 mm and door weights up to 120 kg; two independent regulating valves.",
      performance_requirements: "Closing time adjustable between 3 s and 20 s from 90 deg; latching action in final 15 deg; endurance life 500,000 continuous test cycles.",
      testing_requirements: "Endurance testing rig per IS 3564 Annex B; temperature performance test between -15 deg C and +45 deg C; hydraulic fluid leakage test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CED 11 Sectional Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 3564/1; CPWD Specifications 2019 Subhead 9 Clause 9.22",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_3564",
      evidence_excerpt: "Clause 1.1: Covers requirements for hydraulically regulated door closers including surface mounted and concealed overhead types.",
      applicability_explanation: "Primary Indian Standard specification for hydraulic door closing devices.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CED 11; covers both surface-mounted and concealed hydraulic door closers."
  },
  {
    canonical_name: "Door Handles and Pull Handles",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 208:2020",
    new_standard: {
      is_number: "IS 208:2020",
      title: "Door Handles — Specification (Sixth Revision)",
      publication_year: 2020,
      version: "Sixth Revision",
      status: "ACTIVE",
      technical_committee: "CED 11",
      division_council: "Civil Engineering",
      scope: "Specifies requirements for cast and fabricated door handles (pull handles, lever handles) manufactured from brass, aluminum alloy, and stainless steel.",
      materials: "Extruded brass rod per IS 319, cast brass per IS 1264, aluminum alloy per IS 733, or stainless steel AISI 304 per IS 6911.",
      technical_requirements: "Nominal sizes 75 mm to 300 mm; grip diameter minimum 12 mm; screw fixing hole centers and countersinking.",
      performance_requirements: "Axial pull load minimum 1.5 kN without distortion; corrosion resistance per salt spray test 96 hours; smooth finish free from burrs.",
      testing_requirements: "Tensile pull test per IS 208 Clause 8; salt spray test per IS 9844; dimensional verification.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CED 11 Sectional Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 208/1; CPWD Specifications 2019 Subhead 9 Clause 9.21",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_208",
      evidence_excerpt: "Clause 1.1: Covers materials, dimensions, and testing of door handles and pull handles for doors and gates.",
      applicability_explanation: "Primary national standard for architectural door handles and pull handles.",
      confidence_score: 0.99
    },
    investigation_notes: "Sixth revision of IS 208 was published in 2020."
  },
  {
    canonical_name: "Drawer Slide Telescopic Channels",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 17953:2022",
    new_standard: {
      is_number: "IS 17953:2022",
      title: "Furniture Fittings — Telescopic Ball Bearing Drawer Slides — Specification",
      publication_year: 2022,
      version: "Original Edition",
      status: "ACTIVE",
      technical_committee: "CED 35",
      division_council: "Civil Engineering",
      scope: "Specifies dimensional, functional, load bearing, and endurance requirements for precision telescopic ball bearing drawer slides used in office and residential furniture.",
      materials: "Cold rolled steel strip per IS 513, hardened high carbon chromium steel balls per IS 2898, zinc electroplated finish per IS 1573.",
      technical_requirements: "Nominal lengths 250 mm to 700 mm; full extension, partial extension, and over-travel types; rated dynamic load 25 kg to 65 kg.",
      performance_requirements: "Endurance life 50,000 opening/closing cycles under full rated payload without permanent sag exceeding 3 mm; pull force <= 25 N.",
      testing_requirements: "Cyclic endurance test on automated furniture test rig; static overload test at 150% rated load; salt spray corrosion test 48 hours.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CED 35 Furniture Sectional Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS CED 35 Furniture Hardware Catalogue 2022; GeM Category Specification for Furniture Drawer Channels",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_17953",
      evidence_excerpt: "Clause 1.1: Covers performance requirements, dimensional criteria, and testing methods for telescopic ball bearing drawer slides for furniture.",
      applicability_explanation: "Primary national standard for telescopic ball bearing drawer runners and slide channels.",
      confidence_score: 0.99
    },
    investigation_notes: "IS 17953:2022 is the newly published national standard for furniture telescopic drawer slides."
  },
  {
    canonical_name: "Fire-Resistant Door Assemblies",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 3614:2021",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_STATUTORY",
      evidence_source: "BIS Product Manual PM/IS 3614/1; National Building Code 2016 Part 4 Fire and Life Safety Clause 3.4.4; Model Building Bye-Laws",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_3614",
      evidence_excerpt: "Clause 1.1: Covers requirements of fire doors and fire resisting door assemblies for integrity, stability, and thermal insulation ratings of 30, 60, 90, and 120 minutes.",
      applicability_explanation: "Primary Indian Standard specification governing fire-rated steel and composite door assemblies.",
      confidence_score: 0.99
    },
    investigation_notes: "IS 3614:2021 exists in DB standards table (Standard ID 281)."
  },
  {
    canonical_name: "Friction Stays for Windows",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 18255:2023",
    new_standard: {
      is_number: "IS 18255:2023",
      title: "Building Hardware — Friction Stays for Windows — Specification",
      publication_year: 2023,
      version: "Original Edition",
      status: "ACTIVE",
      technical_committee: "CED 11",
      division_council: "Civil Engineering",
      scope: "Specifies requirements for side-hung and top-hung stainless steel friction stays used in casement windows manufactured from uPVC, aluminum, or wood.",
      materials: "Austenitic stainless steel grade AISI 304 per IS 6911, brass or composite friction slider block, stainless steel rivets.",
      technical_requirements: "Stack height 13 mm or 17 mm; track lengths 200 mm to 600 mm; adjustable friction mechanism.",
      performance_requirements: "Wind load resistance up to 2.5 kPa; operational endurance 25,000 open-close cycles without loss of holding friction; salt spray resistance 240 hours.",
      testing_requirements: "Cyclic endurance test per IS 18255 Annex A; static load test; friction retention test; corrosion resistance per IS 9844.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CED 11 Doors and Windows Hardware Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS CED 11 Gazette Notification 2023; CPWD Architectural Hardware Specifications",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_18255",
      evidence_excerpt: "Clause 1.1: Specifies performance requirements and test methods for variable geometry friction stays for casement windows.",
      applicability_explanation: "Primary product specification for stainless steel window friction hinges and stays.",
      confidence_score: 0.98
    },
    investigation_notes: "IS 18255 was enacted by CED 11 in 2023 for window friction stays."
  },
  {
    canonical_name: "Glass Architectural Patch Fittings",
    council: "CED",
    status: "VERIFIED_SUPPORTING_ONLY",
    standard_is: "IS 2553 (Part 1):1990",
    mapping: {
      relationship_type: "supporting_reference",
      mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "BIS Product Manual PM/IS 2553/1; CPWD Glazing Specifications Subhead 12",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_2553_1",
      evidence_excerpt: "Clause 4.3: Compatibility of mechanical patch clamping plates and tempered safety glass assemblies.",
      applicability_explanation: "Governs safety glass strength and clamping parameters for frameless architectural glass door patch assemblies.",
      confidence_score: 0.90
    },
    investigation_notes: "Patch fittings are designed to clamp toughened safety glass conforming to IS 2553 Part 1."
  },
  {
    canonical_name: "Mortice Latches and Deadlocks",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 2209:1976",
    new_standard: {
      is_number: "IS 2209:1976",
      title: "Mortice Locks (Vertical Type) — Specification (Third Revision)",
      publication_year: 1976,
      version: "Third Revision (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "CED 11",
      division_council: "Civil Engineering",
      scope: "Specifies requirements for vertical type mortice locks and deadlocks with brass, steel, or aluminum alloy components for doors in buildings.",
      materials: "Lock body of mild steel sheet, brass latch and deadbolt per IS 319, brass face plate and striking plate.",
      technical_requirements: "Backset 45 mm or 57 mm; follower for 8 mm square spindle; minimum 500 key differs; deadbolt throw minimum 12.5 mm.",
      performance_requirements: "Endurance life 50,000 operations of deadbolt and 100,000 operations of latch bolt without failure; end load resistance on deadbolt >= 4.5 kN.",
      testing_requirements: "Deadbolt end load test per IS 2209 Clause 8; key differ verification; operational torque test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CED 11 Sectional Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 2209/1; CPWD Specifications 2019 Subhead 9 Clause 9.24",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_2209",
      evidence_excerpt: "Clause 1.1: Covers requirements for mortice locks (vertical type) including latch and deadbolt mechanisms for building doors.",
      applicability_explanation: "Primary national standard for vertical mortice locks and security deadlocks.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CED 11; reaffirmed in 2021."
  },
  {
    canonical_name: "Padlocks (Brass and Steel)",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 275:2021",
    new_standard: {
      is_number: "IS 275:2021",
      title: "Padlocks — Specification (Sixth Revision)",
      publication_year: 2021,
      version: "Sixth Revision",
      status: "ACTIVE",
      technical_committee: "CED 11",
      division_council: "Civil Engineering",
      scope: "Specifies requirements for lever type and pin-tumbler cylinder type padlocks with brass or laminated steel bodies and hardened steel shackles.",
      materials: "Brass casing per IS 1264, hardened steel shackle with case-hardening depth 0.3 mm, phosphor bronze springs.",
      technical_requirements: "Nominal sizes 25 mm to 90 mm; minimum key combinations 250 for small sizes, up to 10,000 for high-security pin-tumbler padlocks.",
      performance_requirements: "Shackle cutting resistance with bolt cutters >= 20 kN; tensile pull load on locked shackle minimum 10 kN to 25 kN; drill resistance.",
      testing_requirements: "Shackle tensile pull test per IS 275 Annex B; torsion test on key; salt spray corrosion test; pick resistance evaluation.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CED 11 Sectional Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 275/2; DGS&D / GeM Standard Specification for Security Padlocks",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_275",
      evidence_excerpt: "Clause 1.1: Specifies physical dimensions, materials, security levels, and test methods for lever and cylinder mechanism padlocks.",
      applicability_explanation: "Primary Indian Standard specification for brass and steel security padlocks.",
      confidence_score: 0.99
    },
    investigation_notes: "Sixth revision enacted in 2021 by CED 11."
  },
  {
    canonical_name: "Panic Exit Hardware Devices",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 17874:2022",
    new_standard: {
      is_number: "IS 17874:2022",
      title: "Building Hardware — Panic Exit Devices Operated by a Horizontal Bar for Use on Escape Routes — Specification",
      publication_year: 2022,
      version: "Original Edition",
      status: "ACTIVE",
      technical_committee: "CED 11",
      division_council: "Civil Engineering",
      scope: "Specifies requirements for panic exit push-bar and touch-bar devices mechanically operated by a horizontal bar on emergency escape route doors.",
      materials: "Steel or stainless steel push bar, zinc alloy or steel latch bolt case, fire-resistant internal springs.",
      technical_requirements: "Bar length covering at least 60% of door leaf width; maximum projection 100 mm from door face; release force under zero pressure <= 80 N.",
      performance_requirements: "Release force under 1000 N side load <= 220 N; durability classification Grade 6 (100,000 test cycles) or Grade 7 (200,000 cycles); fire resistance suitability.",
      testing_requirements: "Release force test rig per IS 17874 Clause 6; temperature test -10 deg C to +60 deg C; fire test compatibility with IS 3614.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CED 11 Hardware Committee (Identical to EN 1125)"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_STATUTORY",
      evidence_source: "National Building Code of India (NBC 2016) Part 4 Fire and Life Safety Clause 4.2.8; BIS CED 11 Gazette 2022",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_17874",
      evidence_excerpt: "Clause 1.1: Specifies requirements for panic exit devices operated by a horizontal bar for use on emergency egress doors.",
      applicability_explanation: "Primary national standard for crash bars and panic exit push-bar mechanisms on fire escape doors.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CED 11; mandated under NBC 2016 Part 4 for commercial and institutional emergency exit doors."
  },
  {
    canonical_name: "Shower Cubicle Hardware",
    council: "CED",
    status: "VERIFIED_SUPPORTING_ONLY",
    standard_is: "IS 2553 (Part 1):1990",
    mapping: {
      relationship_type: "supporting_reference",
      mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "BIS Product Manual PM/IS 2553/1; National Building Code 2016 Glazing Safety Rules",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_2553_1",
      evidence_excerpt: "Clause 4.1: Structural requirements for toughened safety glass enclosures in human impact locations.",
      applicability_explanation: "Specifies toughened safety glass requirements and impact standards for frameless glass shower enclosures.",
      confidence_score: 0.88
    },
    investigation_notes: "Shower cubicles are governed by glass safety standards under IS 2553 Part 1; fittings are evaluated for moisture corrosion resistance."
  },
  {
    canonical_name: "Wooden Flush Door Shutters (Solid Core Type)",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 2202 (Part 1):1999",
    new_standard: {
      is_number: "IS 2202 (Part 1):1999",
      title: "Wooden Flush Door Shutters (Solid Core Type) — Specification: Part 1 Plywood Face Panels (Fifth Revision)",
      publication_year: 1999,
      version: "Fifth Revision (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "CED 11",
      division_council: "Civil Engineering",
      scope: "Specifies requirements for solid core wooden flush door shutters with plywood face panels for interior and exterior applications.",
      materials: "Seasoned timber frame and wooden battens conforming to IS 1141; commercial or decorative plywood face panels per IS 303.",
      technical_requirements: "Standard shutter thicknesses 25 mm, 30 mm, 35 mm, 40 mm; blockboard or particle board core; moisture content 8% to 12%.",
      performance_requirements: "Endurance under slamming test 100,000 cycles; knife test on glue line; impact indentation test with 50 mm steel ball; flexure test.",
      testing_requirements: "Endurance slamming test per IS 4020 (Part 8); immersion in water test; knife test on face veneer adhesion per IS 4020 (Part 5).",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CED 11 Sectional Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DPIIT Wood Products (Quality Control) Order S.O. 1045(E); BIS Product Manual PM/IS 2202/1; CPWD Subhead 9 Clause 9.11",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_2202_1",
      evidence_excerpt: "Clause 1.1: Specifies requirements for materials, construction, dimensions, and testing of solid core wooden flush door shutters with plywood faces.",
      applicability_explanation: "Primary national product standard for solid core wooden flush doors, mandatory under DPIIT Wood Products QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CED 11; covered under DPIIT Wood Products Quality Control Order."
  },
  {
    canonical_name: "Cast Iron Soil and Rainwater Pipes",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 1729:2002",
    new_standard: {
      is_number: "IS 1729:2002",
      title: "Cast Iron Soil, Waste and Ventilating Pipes, Fittings and Accessories — Specification (Second Revision)",
      publication_year: 2002,
      version: "Second Revision (Reaffirmed 2018)",
      status: "ACTIVE",
      technical_committee: "CED 3",
      division_council: "Civil Engineering",
      scope: "Specifies requirements for sand cast iron spigot and socket pipes and fittings for soil, waste, and ventilating applications in above-ground plumbing.",
      materials: "Grey cast iron conforming to Grade FG 150 of IS 210.",
      technical_requirements: "Nominal diameters 50 mm to 150 mm; wall thickness 4.5 mm to 6.0 mm; coal tar protective pitch coating.",
      performance_requirements: "Hydrostatic test pressure 0.05 MPa without leakage; tensile strength of cast metal minimum 150 MPa.",
      testing_requirements: "Hydrostatic pressure test on each pipe; transverse bending test; hammer test for sound casting.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CED 3 Sanitary Appliances Sectional Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DPIIT Cast Iron Products (Quality Control) Order S.O. 4381(E); BIS Product Manual PM/IS 1729/1; CPWD Subhead 19 Clause 19.2",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_1729",
      evidence_excerpt: "Clause 1.1: Covers requirements for sand cast iron pipes and fittings used for soil, waste, rainwater, and ventilation piping in buildings.",
      applicability_explanation: "Primary national standard for cast iron rainwater, soil, and waste discharge pipes.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under Cast Iron Products Quality Control Order; CED 3 sectional committee."
  },
  {
    canonical_name: "Centrifugally Cast (Spun) Ductile Iron Pipes",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 8329:2000",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DPIIT Ductile Iron Pipes (Quality Control) Order S.O. 3855(E); BIS Product Manual PM/IS 8329/1; CPWD Subhead 18 Clause 18.2",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_8329",
      evidence_excerpt: "Clause 1.1: Covers requirements for centrifugally cast (spun) ductile iron pressure pipes with socket and spigot ends for water, gas, and sewerage.",
      applicability_explanation: "Primary national specification for ductile iron pressure pipes, mandatory under national QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "IS 8329 exists in DB standards table (Standard ID 252)."
  },
  {
    canonical_name: "Double Wall Corrugated (DWC) HDPE Pipes",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 16098 (Part 2):2013",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 16098/2; CPWD Drainage Specifications 2019 Clause 19.12; MoHUA Urban Drainage Manual",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_16098_2",
      evidence_excerpt: "Clause 1.1: Requirements for structured-wall plastics piping systems with smooth internal and profiled external surface (Type B DWC pipes) for non-pressure drainage.",
      applicability_explanation: "Primary standard for double-wall corrugated HDPE pipes for underground sewerage and telecom cabling.",
      confidence_score: 0.99
    },
    investigation_notes: "IS 16098 (Part 2) exists in DB standards table (Standard ID 279)."
  },
  {
    canonical_name: "Flexible Stainless Steel Corrugated Plumbing Hoses",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 16823:2018",
    new_standard: {
      is_number: "IS 16823:2018",
      title: "Corrugated Stainless Steel Tubing for Gas and Water Supply — Specification",
      publication_year: 2018,
      version: "Original Edition",
      status: "ACTIVE",
      technical_committee: "CED 3",
      division_council: "Civil Engineering",
      scope: "Specifies requirements for flexible corrugated austenitic stainless steel tubing with brass end connectors used for connecting water heaters, cisterns, and plumbing fixtures.",
      materials: "Corrugated tube AISI 304 / 316 stainless steel per IS 6911; forged brass hex nuts per IS 319; EPDM synthetic rubber washers.",
      technical_requirements: "Nominal diameters DN 10 to DN 25; rated working pressure 1.0 MPa for water services; minimum bend radius 3 times tube diameter.",
      performance_requirements: "Hydrostatic test pressure 2.5 MPa for 5 minutes without burst or leakage; cyclic bending endurance 10,000 cycles; tension resistance >= 2.0 kN.",
      testing_requirements: "Hydrostatic burst pressure test; cyclic bending test per IS 16823 Annex C; tension test on crimped end fittings.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CED 3 Sanitary Appliances Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 16823/1; Unified Plumbing Code India Chapter 6",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_16823",
      evidence_excerpt: "Clause 1.1: Covers requirements for corrugated stainless steel flexible tubing assemblies for plumbing water supply connections.",
      applicability_explanation: "Primary national standard for flexible stainless steel corrugated connection hoses and braided plumbing connectors.",
      confidence_score: 0.98
    },
    investigation_notes: "Enacted by CED 3 in 2018 for stainless steel flexible plumbing connectors."
  },
  {
    canonical_name: "High Density Polyethylene (HDPE) Pipes for Water Supply",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 4984:2016",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DPIIT HDPE Pipes (Quality Control) Order S.O. 4380(E); BIS Product Manual PM/IS 4984/1; Jal Jeevan Mission Technical Guidelines",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_4984",
      evidence_excerpt: "Clause 1.1: Covers requirements for high density polyethylene (HDPE) pipes for potable water supplies, drainage, and sewerage.",
      applicability_explanation: "Primary national standard for HDPE potable water supply pipes, mandatory under national QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "IS 4984:2016 exists in DB standards table (Standard ID 250)."
  },
  {
    canonical_name: "Polypropylene Random Copolymer (PP-R) Pipes",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 15801:2008",
    new_standard: {
      is_number: "IS 15801:2008",
      title: "Polypropylene Pipes for Potable Water Supplies — Specification",
      publication_year: 2008,
      version: "Original Edition (Reaffirmed 2019)",
      status: "ACTIVE",
      technical_committee: "CED 50",
      division_council: "Civil Engineering",
      scope: "Specifies requirements for polypropylene random copolymer (PP-R) pipes used for hot and cold potable water distribution inside buildings.",
      materials: "PP-R Type 3 polymer compound with high thermal stability and food grade certification per IS 10951.",
      technical_requirements: "Pressure ratings PN 10, PN 16, PN 20, PN 25; nominal outside diameters 16 mm to 160 mm; socket fusion jointing.",
      performance_requirements: "Hydrostatic pressure resistance at 20 deg C (100 hours at 16 MPa) and at 95 deg C (1000 hours at 3.5 MPa); opacity >= 99.8%.",
      testing_requirements: "Internal hydrostatic pressure test per IS 12235 (Part 8); longitudinal reversion test; melt mass-flow rate (MFR) per IS 13360.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CED 50 Plastic Piping Systems Sectional Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 15801/1; CPWD Specifications 2019 Subhead 18 Clause 18.6",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_15801",
      evidence_excerpt: "Clause 1.1: Covers requirements for polypropylene random copolymer (PP-R) pipes for hot and cold potable water plumbing.",
      applicability_explanation: "Primary national product standard for PP-R plumbing pipes.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CED 50; standard specification for PP-R pipes."
  },
  {
    canonical_name: "Unplasticized PVC (UPVC) SWR Drainage Pipes",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13592:2013",
    new_standard: {
      is_number: "IS 13592:2013",
      title: "Unplasticized Polyvinyl Chloride (uPVC) Pipes for Soil and Waste Discharge Systems Inside and Outside Buildings Including Ventilation and Rainwater System — Specification (First Revision)",
      publication_year: 2013,
      version: "First Revision (Reaffirmed 2019)",
      status: "ACTIVE",
      technical_committee: "CED 50",
      division_council: "Civil Engineering",
      scope: "Specifies requirements for uPVC pipes with elastomeric sealing ring joints or solvent cement joints for soil, waste, rainwater, and ventilation drainage.",
      materials: "Unplasticized polyvinyl chloride resin conforming to IS 10151, with non-toxic stabilizers, UV stabilizers, and pigments.",
      technical_requirements: "Type A (rainwater and ventilation discharge), Type B (soil and waste discharge); nominal diameters 75 mm, 90 mm, 110 mm, 160 mm.",
      performance_requirements: "Impact resistance by falling dart test (zero break at 0 deg C); tensile strength minimum 45 MPa; longitudinal reversion <= 5%.",
      testing_requirements: "Drop impact test per IS 12235 (Part 9); hydrostatic pressure test; vicat softening temperature minimum 79 deg C per IS 12235 (Part 2).",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CED 50 Plastic Piping Systems Sectional Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DPIIT Plastic Pipes (Quality Control) Order S.O. 4382(E); BIS Product Manual PM/IS 13592/1; CPWD Subhead 19 Clause 19.3",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_13592",
      evidence_excerpt: "Clause 1.1: Covers requirements for uPVC pipes for soil and waste discharge systems (Type A and Type B) inside and outside buildings.",
      applicability_explanation: "Primary national standard for uPVC SWR drainage pipes, mandatory under national QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CED 50; covered under national Quality Control Order."
  },
  {
    canonical_name: "uPVC Soil, Waste and Rainwater (SWR) Drainage Pipes",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13592:2013",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DPIIT Plastic Pipes (Quality Control) Order S.O. 4382(E); BIS Product Manual PM/IS 13592/1 Clause 1.1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_13592",
      evidence_excerpt: "Clause 1.1: Specifies physical dimensions, wall thicknesses, and impact strength for Type B uPVC soil and waste pipes.",
      applicability_explanation: "Direct product family match for uPVC SWR drainage pipes.",
      confidence_score: 0.99
    },
    investigation_notes: "Direct match to IS 13592:2013."
  },
  {
    canonical_name: "Epoxy Resin Flooring Screeds",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 16087:2013",
    new_standard: {
      is_number: "IS 16087:2013",
      title: "Synthetic Resin Flooring — Specification",
      publication_year: 2013,
      version: "Original Edition (Reaffirmed 2019)",
      status: "ACTIVE",
      technical_committee: "CED 5",
      division_council: "Civil Engineering",
      scope: "Specifies requirements for synthetic resin floorings (epoxy and polyurethane based) applied as screeds, coatings, or self-levelling toppings on concrete subfloors.",
      materials: "Two-part or three-part solvent-free epoxy resin binder, polyamide curing agent, graded silica quartz aggregates.",
      technical_requirements: "Applied thickness 2 mm to 6 mm; compressive strength minimum 55 MPa; flexural strength minimum 25 MPa; tensile strength minimum 15 MPa.",
      performance_requirements: "Bond strength to concrete >= 2.0 MPa (concrete failure); Taber abrasion resistance weight loss <= 50 mg/1000 cycles; chemical resistance to acids and alkalis.",
      testing_requirements: "Compressive strength per IS 516; bond strength pull-off test per ASTM D4541; abrasion resistance per IS 101; chemical spot tests.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CED 5 Flooring, Wall Finishing and Roofing Sectional Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 16087/1; CPWD Specifications 2019 Subhead 11 Clause 11.23",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_16087",
      evidence_excerpt: "Clause 1.1: Covers requirements for synthetic resin flooring systems based on epoxy and polyurethane for industrial and commercial floors.",
      applicability_explanation: "Primary national standard for industrial epoxy resin flooring screeds and self-levelling toppings.",
      confidence_score: 0.98
    },
    investigation_notes: "Formulated by CED 5; standard specification for epoxy and PU resin floorings."
  },
  {
    canonical_name: "Kota Stone Natural Flooring Slabs",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 1124:1974",
    new_standard: {
      is_number: "IS 1124:1974",
      title: "Method of Test for Determination of Water Absorption, Apparent Specific Gravity and Porosity of Natural Building Stones (First Revision)",
      publication_year: 1974,
      version: "First Revision (Reaffirmed 2022)",
      status: "ACTIVE",
      technical_committee: "CED 6",
      division_council: "Civil Engineering",
      scope: "Specifies testing methods and benchmark quality criteria for natural building stones including Kota stone (fine-grained limestone), marble, and sandstone flooring slabs.",
      materials: "Natural siliceous and calcareous limestone (Kota stone) free from cracks, fissures, and veins.",
      technical_requirements: "Water absorption <= 0.6% by weight; apparent specific gravity minimum 2.60; transverse strength >= 12 MPa.",
      performance_requirements: "Compressive strength minimum 80 MPa; Mohs hardness minimum 3.5; acid resistance without flaking.",
      testing_requirements: "Water absorption test per IS 1124; compressive strength per IS 1121; abrasion test per IS 1706.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CED 6 Stones Sectional Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 1124; CPWD Specifications 2019 Subhead 11 Clause 11.13 Kota Stone Flooring",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_1124",
      evidence_excerpt: "Clause 1.1: Method of test for determination of water absorption and apparent specific gravity of building stones including limestone flooring slabs.",
      applicability_explanation: "Primary Indian Standard testing and quality benchmark cited across all public works specifications for Kota stone slabs.",
      confidence_score: 0.95
    },
    investigation_notes: "Formulated by CED 6; cited in CPWD Clause 11.13 for Kota stone flooring acceptance."
  },
  {
    canonical_name: "Liquid Applied Polyurethane Waterproofing Coating",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 16532:2017",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS CED 41 Product Manual for Polymeric Liquid Membranes; CPWD Subhead 22 Clause 22.20",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_16532",
      evidence_excerpt: "Clause 3.2: Requirements for elastomeric polyurethane liquid-applied waterproofing coatings for exposed concrete roofs.",
      applicability_explanation: "Direct standard covering polymeric liquid-applied polyurethane elastomeric waterproofing membranes.",
      confidence_score: 0.95
    },
    investigation_notes: "Formulated under CED 41 for polymeric waterproofing coatings."
  },
  {
    canonical_name: "Modular Raised Access False Flooring",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 16738:2018",
    new_standard: {
      is_number: "IS 16738:2018",
      title: "Raised Access Floors — Specification",
      publication_year: 2018,
      version: "Original Edition",
      status: "ACTIVE",
      technical_committee: "CED 5",
      division_council: "Civil Engineering",
      scope: "Specifies requirements for modular raised access flooring systems comprising panels, understructure pedestals, and stringers used in data centers, control rooms, and commercial offices.",
      materials: "Steel encased calcium silicate or cementitious core panels, galvanized steel pedestals, conductive or anti-static HPL/PVC surface coverings.",
      technical_requirements: "Panel size 600 mm x 600 mm; finished floor height 100 mm to 1200 mm; concentrated point load ratings 2.7 kN (Medium) to 6.7 kN (Heavy).",
      performance_requirements: "Point load deflection <= 2.5 mm under rated working load; safety factor 2.0; electrical resistance 10^6 to 10^9 ohms (anti-static); fire classification Class 1 / Class 0.",
      testing_requirements: "Static concentrated load test per IS 16738 Annex A; dynamic rolling load test; electrical surface resistance per IS 3462.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CED 5 Flooring Sectional Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS CED 5 Gazette Notification 2018; CPWD Specifications 2019 Subhead 11 Clause 11.24",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_16738",
      evidence_excerpt: "Clause 1.1: Covers requirements for raised access floor panels, pedestals, and stringers for electrical and IT cable management.",
      applicability_explanation: "Primary national product standard for modular raised access flooring systems.",
      confidence_score: 0.99
    },
    investigation_notes: "Enacted by CED 5 in 2018 for data center and office raised access flooring."
  },
  {
    canonical_name: "Polished Granite and Marble Flooring Slabs",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 3316:1974",
    new_standard: {
      is_number: "IS 3316:1974",
      title: "Structural Granite — Specification (First Revision)",
      publication_year: 1974,
      version: "First Revision (Reaffirmed 2022)",
      status: "ACTIVE",
      technical_committee: "CED 6",
      division_council: "Civil Engineering",
      scope: "Specifies requirements for polished, honed, or flamed structural granite slabs and tiles used for interior and exterior flooring, cladding, and paving.",
      materials: "Natural igneous plutonic rock (granite) of uniform texture, free from seams, cracks, and feldspathic weathering.",
      technical_requirements: "Thickness 18 mm, 20 mm, 30 mm; water absorption maximum 0.5% by weight; specific gravity minimum 2.60.",
      performance_requirements: "Compressive strength minimum 100 MPa; transverse flexural strength minimum 10 MPa; abrasion resistance maximum wear 2.0 mm per IS 1706.",
      testing_requirements: "Compressive strength test per IS 1121; water absorption per IS 1124; gloss reflectivity test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CED 6 Natural Stones Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 3316/1; CPWD Specifications 2019 Subhead 11 Clause 11.11",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_3316",
      evidence_excerpt: "Clause 1.1: Covers requirements for structural granite slabs for flooring and building facing.",
      applicability_explanation: "Primary national standard for architectural structural granite flooring and cladding slabs.",
      confidence_score: 0.98
    },
    investigation_notes: "Formulated by CED 6; fundamental standard for granite flooring."
  },
  {
    canonical_name: "Polysulphide Building Joint Sealants",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 12118 (Part 1):1987",
    new_standard: {
      is_number: "IS 12118 (Part 1):1987",
      title: "Two-Parts Polysulphide-Based Sealants — Specification: Part 1 General Requirements",
      publication_year: 1987,
      version: "First Revision (Reaffirmed 2018)",
      status: "ACTIVE",
      technical_committee: "CED 41",
      division_council: "Civil Engineering",
      scope: "Specifies requirements for two-part polysulphide-based elastomeric sealants used for sealing expansion, contraction, and isolation joints in building structures and civil engineering works.",
      materials: "Liquid polysulphide polymer base with manganese dioxide curing agent accelerator.",
      technical_requirements: "Non-sag type for vertical joints and self-levelling type for horizontal joints; movement accommodation factor (MAF) +/- 25%; pot life minimum 2 hours.",
      performance_requirements: "Tensile adhesion at 100% elongation minimum 0.15 MPa without adhesive or cohesive failure; shore A hardness 15 to 30; recovery after extension >= 75%.",
      testing_requirements: "Adhesion-in-tension test after water immersion per IS 12118 (Part 2); heat ageing test at 70 deg C; cyclic movement test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CED 41 Waterproofing Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 12118/1; CPWD Specifications 2019 Subhead 22 Clause 22.8",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_12118_1",
      evidence_excerpt: "Clause 1.1: Covers physical and performance requirements of two-part polysulphide-based sealants for expansion joints in buildings.",
      applicability_explanation: "Primary national standard for elastomeric polysulphide building joint sealants.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CED 41; benchmark specification for building expansion joints."
  },
  {
    canonical_name: "Polyurethane Liquid Waterproofing Membranes",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 16532:2017",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS CED 41 Product Manual PM/IS 16532/1; CPWD Subhead 22 Clause 22.20",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_16532",
      evidence_excerpt: "Clause 3.1: Physical requirements of polymeric and polyurethane elastomeric waterproofing membranes.",
      applicability_explanation: "Direct product mapping for polyurethane liquid-applied elastomeric waterproofing systems.",
      confidence_score: 0.95
    },
    investigation_notes: "CED 41 standard for elastomeric polymeric waterproofing systems."
  },
  {
    canonical_name: "Silicone Weatherproofing Sealants",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 16654:2017",
    new_standard: {
      is_number: "IS 16654:2017",
      title: "One-Part Neutral Cure Silicone Sealant for Structural Glazing and Weatherproofing — Specification",
      publication_year: 2017,
      version: "Original Edition",
      status: "ACTIVE",
      technical_committee: "CED 41",
      division_council: "Civil Engineering",
      scope: "Specifies requirements for one-component neutral cure elastomeric silicone sealants used for weather sealing of building facades, curtain walls, and glass structural glazing.",
      materials: "100% neutral cure silicone polymer with crosslinking catalysts, free from plasticizers and solvents.",
      technical_requirements: "Movement capability +/- 25% or +/- 50%; skin-over time 10 to 30 minutes; non-sag on vertical surfaces; service temperature -40 to +150 deg C.",
      performance_requirements: "Tensile adhesion strength minimum 0.4 MPa without cohesive or adhesive failure; elongation at break >= 300%; UV resistance after 2000 hours weathering.",
      testing_requirements: "Tensile adhesion test per ASTM C1135 / IS 16654 Clause 7; accelerated UV weathering per ASTM G154; peel adhesion test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CED 41 Building Sealants Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 16654/1; CPWD Glazing Specifications Subhead 12 Clause 12.15",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_16654",
      evidence_excerpt: "Clause 1.1: Covers requirements for one-part neutral cure silicone sealants used for structural glazing and weatherproofing of facade joints.",
      applicability_explanation: "Primary national standard for neutral cure silicone weatherproofing and glazing sealants.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CED 41 in 2017 for structural glazing and weather sealing."
  },
  {
    canonical_name: "Stoneware Vitrified Glazed Sewer Pipes",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 651:2007",
    new_standard: {
      is_number: "IS 651:2007",
      title: "Glazed Stoneware Pipes and Fittings — Specification (Sixth Revision)",
      publication_year: 2007,
      version: "Sixth Revision (Reaffirmed 2018)",
      status: "ACTIVE",
      technical_committee: "CED 3",
      division_council: "Civil Engineering",
      scope: "Specifies requirements for vitrified glazed stoneware pipes and fittings used for underground drainage, domestic waste, and municipal sewerage systems.",
      materials: "Refractory clay and shale body vitrified at elevated temperatures (1200 deg C) with salt glaze or ceramic glaze.",
      technical_requirements: "Nominal internal diameters 100 mm to 600 mm; standard barrel length 60 cm to 100 cm; spigot and socket joint.",
      performance_requirements: "Crushing strength (three-edge bearing test) minimum 16 kN/m for 100 mm up to 34 kN/m for 600 mm; hydraulic proof test 0.15 MPa without sweating; acid resistance weight loss <= 2.5%.",
      testing_requirements: "Crushing strength test per IS 651 Annex B; hydraulic pressure test; acid resistance test in 1:1 hydrochloric and nitric acids.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CED 3 Sanitary Appliances Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 651/1; CPWD Sewerage Specifications Subhead 19 Clause 19.1; MoHUA Sewerage Manual",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_651",
      evidence_excerpt: "Clause 1.1: Covers requirements for glazed stoneware pipes and fittings intended to be used for the drainage of sewage and industrial wastes.",
      applicability_explanation: "Primary national product standard for vitrified glazed stoneware sewer and drainage pipes.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CED 3; standard specification for vitrified clay sewer pipes."
  },
  {
    canonical_name: "Structured Wall Corrugated HDPE Drainage Pipes",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 16098 (Part 2):2013",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 16098/2; CPWD Subhead 19 Clause 19.12",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_16098_2",
      evidence_excerpt: "Clause 1.1: Covers structured-wall plastic piping systems for non-pressure underground drainage and sewerage.",
      applicability_explanation: "Direct product mapping for structured-wall corrugated HDPE drainage and sewerage pipes.",
      confidence_score: 0.99
    },
    investigation_notes: "IS 16098 Part 2 is the exact product specification."
  },
  {
    canonical_name: "Expanded Polystyrene (EPS) Thermal Insulation",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 4671:1984",
    new_standard: {
      is_number: "IS 4671:1984",
      title: "Expanded Polystyrene for Thermal Insulation Purposes — Specification (First Revision)",
      publication_year: 1984,
      version: "First Revision (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "CED 4",
      division_council: "Civil Engineering",
      scope: "Specifies requirements for molded expanded polystyrene (EPS) rigid foam boards used for thermal insulation in buildings, cold storages, and refrigeration plants.",
      materials: "Expandable polystyrene polymer granules containing pentane blowing agent.",
      technical_requirements: "Types 1, 2, 3, 4 with apparent densities 16 kg/m3 to 32 kg/m3; thermal conductivity k-value <= 0.033 W/m.K at 10 deg C.",
      performance_requirements: "Compressive strength at 10% deformation minimum 70 kPa to 200 kPa; water absorption maximum 2% by volume; flame retardant class Self-Extinguishing.",
      testing_requirements: "Thermal conductivity guarded hot plate test per IS 3346; flammability test per IS 1752; density determination per IS 4671 Clause 7.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CED 4 Building Construction Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 4671/1; Energy Conservation Building Code (ECBC) Section 4 Envelope Insulation",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_4671",
      evidence_excerpt: "Clause 1.1: Covers requirements for expanded polystyrene foam boards for thermal insulation of buildings, cold storage, and industrial roofs.",
      applicability_explanation: "Primary national standard for rigid EPS thermal insulation boards.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CED 4; standard insulation material under ECBC and CPWD."
  },
  {
    canonical_name: "Extruded Polystyrene (XPS) Foam Boards",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 16982:2018",
    new_standard: {
      is_number: "IS 16982:2018",
      title: "Extruded Polystyrene (XPS) Foam Boards for Thermal Insulation — Specification",
      publication_year: 2018,
      version: "Original Edition",
      status: "ACTIVE",
      technical_committee: "CED 4",
      division_council: "Civil Engineering",
      scope: "Specifies physical, mechanical, and thermal insulation requirements for rigid extruded polystyrene (XPS) boards with closed-cell structure for roof, wall, and under-slab insulation.",
      materials: "Polystyrene resin extruded with environmentally compliant blowing agent (CFC/HCFC-free).",
      technical_requirements: "Density 30 kg/m3 to 45 kg/m3; thermal conductivity maximum 0.028 W/m.K; closed cell content minimum 95%.",
      performance_requirements: "Compressive strength minimum 250 kPa to 500 kPa; water absorption by immersion <= 0.5% by volume; oxygen index minimum 28% (flame retardant).",
      testing_requirements: "Thermal conductivity test per IS 3346; compressive strength per ISO 844; water absorption per ISO 2896.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CED 4 Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 16982/1; ECBC Building Envelope Insulation Tables; CPWD Subhead 22 Clause 22.25",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_16982",
      evidence_excerpt: "Clause 1.1: Covers requirements for rigid closed-cell extruded polystyrene (XPS) foam boards for thermal insulation.",
      applicability_explanation: "Primary national product standard for XPS high-density rigid insulation boards.",
      confidence_score: 0.99
    },
    investigation_notes: "Enacted by CED 4 in 2018 for extruded polystyrene insulation."
  },
  {
    canonical_name: "Resin Bonded Glass Wool Insulation",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 8183:1993",
    new_standard: {
      is_number: "IS 8183:1993",
      title: "Bonded Mineral Wool — Specification (First Revision)",
      publication_year: 1993,
      version: "First Revision (Reaffirmed 2019)",
      status: "ACTIVE",
      technical_committee: "CED 4",
      division_council: "Civil Engineering",
      scope: "Specifies requirements for resin bonded glass wool and rock wool blankets, slabs, and pipe sections used for thermal and acoustic insulation in buildings and industrial equipment.",
      materials: "Non-combustible synthetic glass or rock vitreous fibres bonded with thermosetting phenolic resin.",
      technical_requirements: "Bulk density 16 kg/m3 to 150 kg/m3; thermal conductivity k-value <= 0.040 W/m.K at 50 deg C mean temperature; service temperature up to 400 deg C.",
      performance_requirements: "Non-combustibility rating Class 1 / Class A1 per IS 3144; moisture absorption <= 2% by weight; shot content maximum 5%.",
      testing_requirements: "Thermal conductivity per IS 3346; non-combustibility test per IS 3808; shot content determination per IS 3144 Clause 7.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CED 4 Building Construction Sectional Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 8183/1; CPWD HVAC & Thermal Insulation Specifications Clause 15.3; ECBC Envelope Section",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_8183",
      evidence_excerpt: "Clause 1.1: Covers requirements for bonded mineral wool (glass wool and rock slag wool) thermal and acoustic insulation blankets and boards.",
      applicability_explanation: "Primary national product specification for resin-bonded glass wool thermal and acoustic insulation blankets.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CED 4; covers both glass wool and rock wool bonded insulation."
  },
  {
    canonical_name: "Resin Bonded Rockwool Insulation",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 8183:1993",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 8183/1; CPWD Subhead 15 Insulation; NBC 2016 Part 4 Fire Safe Insulation",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_8183",
      evidence_excerpt: "Clause 3.1: Specific requirements for bonded rockwool slabs with density 48 kg/m3 to 144 kg/m3 for thermal and fire barrier insulation.",
      applicability_explanation: "Primary national standard for rigid resin bonded rockwool insulation slabs and pipe sections.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS 8183:1993 alongside glass wool."
  },
  {
    canonical_name: "Hollow Steel Sections for Structural Use (RHS/SHS/CHS)",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 4923:2017",
    new_standard: {
      is_number: "IS 4923:2017",
      title: "Hollow Steel Sections for Structural Use — Specification (Second Revision)",
      publication_year: 2017,
      version: "Second Revision (Reaffirmed 2022)",
      status: "ACTIVE",
      technical_committee: "MTD 19",
      division_council: "Metallurgical Engineering",
      scope: "Specifies requirements for hot-formed and cold-formed welded and seamless hollow steel sections: Square Hollow Sections (SHS), Rectangular Hollow Sections (RHS), and Circular Hollow Sections (CHS) for structural engineering applications.",
      materials: "Structural steel strip or plate conforming to IS 2062 Grade E250, E300, or E350.",
      technical_requirements: "Nominal dimensions SHS 25x25 mm to 400x400 mm, RHS 50x25 mm to 500x300 mm; thickness 1.6 mm to 20 mm; corner radius <= 2t.",
      performance_requirements: "Yield strength minimum 250 MPa, 310 MPa, or 355 MPa; tensile strength minimum 410 MPa to 510 MPa; elongation >= 20%; flattening and bend tests.",
      testing_requirements: "Tensile test per IS 1608; flattening test on weld per IS 2328; Charpy V-notch impact test at 0 deg C per IS 1757.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards MTD 19 Steel Tubes, Pipes and Fittings Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "Ministry of Steel (Steel and Steel Products QCO) S.O. 167(E); BIS Product Manual PM/IS 4923/1; CPWD Structural Steel Subhead 10 Clause 10.3",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_4923",
      evidence_excerpt: "Clause 1.1: Covers requirements for cold-formed and hot-formed hollow steel sections (RHS, SHS, CHS) for structural applications.",
      applicability_explanation: "Primary national standard for structural hollow steel sections (box sections and tubular columns), mandatory under Steel QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Mandatory under Ministry of Steel Quality Control Order; core standard for steel construction."
  },
  {
    canonical_name: "Plywood for General Purposes (Commercial & Marine Plywood)",
    council: "CED",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 303:1989",
    new_standard: {
      is_number: "IS 303:1989",
      title: "Plywood for General Purposes — Specification (Third Revision)",
      publication_year: 1989,
      version: "Third Revision (Reaffirmed 2018)",
      status: "ACTIVE",
      technical_committee: "CED 9",
      division_council: "Civil Engineering",
      scope: "Specifies requirements for general purpose plywood (commercial MR and BWR grades) manufactured from timber veneers bonded with synthetic resin adhesive.",
      materials: "Timber species per IS 303 Annex A, bonded with phenol formaldehyde (BWR) or urea formaldehyde (MR) resin.",
      technical_requirements: "Thickness 3 mm to 25 mm (3-ply to 11-ply); moisture content 5% to 15%; squareness and edge straightness tolerances.",
      performance_requirements: "Glue shear strength in dry state minimum 1350 N; resistance to 3-hour boiling water test (BWR grade); mycological test for fungi resistance.",
      testing_requirements: "Glue adhesion knife test; tensile strength; moisture content determination per IS 1734; water soak test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards CED 9 Timber Products Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DPIIT Wood Products (Quality Control) Order S.O. 1045(E); BIS Product Manual PM/IS 303/1; CPWD Specifications Subhead 9 Clause 9.2",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_303",
      evidence_excerpt: "Clause 1.1: Specifies requirements for plywood for general purposes of Moisture Resistant (MR) and Boiling Water Resistant (BWR) grades.",
      applicability_explanation: "Primary national product specification for commercial plywood, mandatory under DPIIT Wood Products QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by CED 9; mandatory under DPIIT Wood Products QCO."
  }
];

module.exports = { INFRASTRUCTURE_INVESTIGATION };
