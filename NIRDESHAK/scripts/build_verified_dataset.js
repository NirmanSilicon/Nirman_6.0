const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const verifiedStandards = [
  // ==================== DOMAIN 1: PPE & SAFETY ====================
  {
    canonical_id: "IS-2925-1984",
    is_number: "IS 2925:1984",
    title: "Specification for Industrial Safety Helmets (Second Revision)",
    scope: "Specifies physical, constructional, and performance requirements for industrial safety helmets intended to protect workers from falling objects and mechanical impact in industrial and construction environments.",
    category: "Personal Protective Equipment and Safety",
    description: "Standard covering helmets made of non-metallic materials (such as HDPE, ABS, fiberglass) for shock absorption, penetration resistance, flammability, and electrical insulation in workplaces.",
    application: "Construction sites, heavy manufacturing plants, refineries, mining surface works, and maintenance operations.",
    technical_requirements: {
      shell_materials: ["High-density polyethylene (HDPE)", "Acrylonitrile butadiene styrene (ABS)", "Fiberglass reinforced plastic"],
      weight_limit: "Maximum mass without attachments: 400g (unventilated) / 450g (ventilated)",
      harness_clearance: "Vertical clearance between crown and harness: 25 mm to 50 mm",
      chin_strap_width: "Minimum 19 mm width with breakaway release"
    },
    materials: {
      shell: "UV-stabilized non-metallic polymer",
      headband: "Sweat-resistant polyethylene or leatherette",
      harness: "Textile webbing (nylon/polyester) minimum 4-point attachment"
    },
    performance_requirements: {
      shock_absorption: "Transmitted force to headform shall not exceed 5.0 kN when subjected to 50 J impact energy",
      penetration_resistance: "3 kg conical drop striker from 1 m height shall not pierce through shell or contact headform",
      flammability: "Shell material shall not continue burning for more than 5 seconds after flame removal",
      water_absorption: "Maximum 0.5% mass increase after immersion"
    },
    safety_requirements: {
      electrical_insulation: "Leakage current shall not exceed 1.2 mA at 1.2 kV AC (Proof test: 3 kV AC for 1 minute)",
      ventilation: "Ventilation holes if provided shall have area between 150 mm² and 450 mm² and be protected from penetration"
    },
    testing_requirements: {
      shock_absorption_test: "Clause 6.1 / Annex A",
      penetration_test: "Clause 6.2 / Annex B",
      flammability_test: "Clause 6.3 / Annex C",
      electrical_resistance_test: "Clause 6.4 / Annex D",
      water_absorption_test: "Clause 6.5"
    },
    version: "Second Revision (1984)",
    publication_year: 1984,
    status: "active",
    amendments: [
      { number: 1, date: "1988-06" },
      { number: 2, date: "1991-03" },
      { number: 3, date: "1994-08" },
      { number: 4, date: "1998-11" },
      { number: 5, date: "2002-04" },
      { number: 6, date: "2006-09" },
      { number: 7, date: "2012-05" },
      { number: 8, date: "2018-02" }
    ],
    supersedes: ["IS 2925:1975"],
    superseded_by: null,
    certification: {
      regulatory_class: "Class A",
      mandatory: true,
      qco_name: "Helmet for Police Force, Civil Defence and Personal Protection (Quality Control) Order, 2023",
      gazette_no: "S.O. 4649(E)",
      gazette_date: "2023-10-23",
      effective_date: "2024-04-23",
      issuing_ministry: "Ministry of Commerce and Industry (DPIIT)",
      schedule_item: "Item 1",
      statutory_basis: "Bureau of Indian Standards Act, 2016 (Sections 16, 17, 25)",
      scheme: "Scheme-I (ISI Mark)",
      verification_status: "VERIFIED"
    },
    source: "https://www.services.bis.gov.in/",
    is_primary_candidate: true
  },
  {
    canonical_id: "IS-4151-2015",
    is_number: "IS 4151:2015",
    title: "Protective Helmets for Two Wheeler Riders — Specification (Fourth Revision)",
    scope: "Specifies requirements for protective headgear for drivers and passengers of two-wheeled motor vehicles, covering impact attenuation, retention system, and field of vision.",
    category: "Personal Protective Equipment and Safety",
    description: "National standard mandating protective helmets for vehicular two-wheeler riders to prevent fatal head injuries in traffic accidents.",
    application: "Motorcyclists, scooterists, and pillion riders on Indian public roads.",
    technical_requirements: {
      mass_limit: "Maximum mass of helmet: 1.2 kg (1200g) per Amendment 3",
      vision_clearance: "Horizontal field of vision: >= 105° on each side from median plane; upward >= 7°; downward >= 30°",
      shell_materials: ["ABS", "Polycarbonate", "Fiberglass composite"],
      protective_padding: "Expanded polystyrene (EPS) liner of density >= 24 kg/m³"
    },
    materials: {
      outer_shell: "Impact-resistant thermoplastic or composite resin",
      impact_liner: "High-density expanded polystyrene (EPS)",
      comfort_padding: "Hypoallergenic breathable foam and fabric"
    },
    performance_requirements: {
      impact_attenuation: "Peak headform acceleration shall not exceed 300g (2940 m/s²) and HIC shall not exceed 2400 under 2.5 m drop test",
      penetration_resistance: "Striker dropped from 3 m shall not make electrical contact with headform",
      retention_system_strength: "Dynamic displacement < 35 mm under 10 kg drop mass; residual displacement < 25 mm"
    },
    safety_requirements: {
      chin_strap_test: "Retention strap width >= 20 mm; quick release mechanism under load",
      audibility: "Must not restrict rider acoustic perception significantly",
      retro_reflective_marking: "Minimum 18 cm² reflective elements positioned on sides and rear"
    },
    testing_requirements: {
      impact_absorption: "Clause 8.1 / Annex A (conditioned at -10°C, +50°C, water spray, UV)",
      penetration: "Clause 8.2 / Annex B",
      retention_system: "Clause 8.3 / Annex C",
      audibility: "Clause 8.4",
      visor_test: "Conforming to IS 9973 optical requirements"
    },
    version: "Fourth Revision (2015)",
    publication_year: 2015,
    status: "active",
    amendments: [
      { number: 1, date: "2016-10" },
      { number: 2, date: "2018-09" },
      { number: 3, date: "2020-03" }
    ],
    supersedes: ["IS 4151:1993"],
    superseded_by: null,
    certification: {
      regulatory_class: "Class A",
      mandatory: true,
      qco_name: "Helmet for riders of Two-Wheeler Motor Vehicles (Quality Control) Order, 2020",
      gazette_no: "S.O. 4252(E)",
      gazette_date: "2020-11-26",
      effective_date: "2021-06-01",
      issuing_ministry: "Ministry of Road Transport and Highways (MoRTH)",
      schedule_item: "Single scheduled item",
      statutory_basis: "Bureau of Indian Standards Act, 2016 (Sections 16(1), 16(2), 25(3))",
      scheme: "Scheme-I (ISI Mark)",
      traffic_law_note: "Motor Vehicles Act 1988 Section 129 mandates wearing BIS-certified headgear on roads.",
      verification_status: "VERIFIED"
    },
    source: "https://www.services.bis.gov.in/",
    is_primary_candidate: true
  },
  {
    canonical_id: "IS-2745-1983",
    is_number: "IS 2745:1983",
    title: "Specification for Non-Metal Helmet for Firemen and Civil Defence Personnel (First Revision)",
    scope: "Covers requirements for non-metallic helmets designed for fire fighters and civil defence workers against falling debris, heat radiation, water, and electrical hazards.",
    category: "Personal Protective Equipment and Safety",
    description: "Specialized safety headgear standard for municipal and industrial fire fighting personnel featuring heat-deflecting brim and neck curtain protection.",
    application: "Fire services, municipal rescue departments, civil defence forces, industrial plant emergency response teams.",
    technical_requirements: {
      construction: "Molded shell with full brim, rear neck protector shield attachment, internal energy absorption harness",
      heat_resistance: "Must withstand radiant heat exposure without blistering, warping, or ignition",
      mass: "Maximum weight: 800g including harness and visor"
    },
    materials: {
      shell: "Molded fiberglass reinforced resin or high-temperature flame-retardant composite",
      neck_protector: "Aluminized fire-retardant fabric or aramid"
    },
    performance_requirements: {
      impact_resistance: "Drop test with 3.6 kg striker at 1.5 m: transmitted force <= 5.0 kN",
      penetration_resistance: "Drop test with 1.8 kg conical striker at 1.5 m: zero electrical contact with headform",
      flammability: "Self-extinguishing within 5 seconds after direct exposure to 1000°C burner flame for 10 s"
    },
    safety_requirements: {
      electrical_insulation: "Shell withstanding 5 kV AC breakdown voltage test for 1 minute",
      water_resistance: "Immersion resistance preventing water leakage into harness assembly"
    },
    testing_requirements: {
      impact_test: "Clause 7.1 / Annex A",
      penetration_test: "Clause 7.2 / Annex B",
      flame_retardancy_test: "Clause 7.3 / Annex C",
      electrical_proof_test: "Clause 7.4 / Annex D"
    },
    version: "First Revision (1983)",
    publication_year: 1983,
    status: "active",
    amendments: [
      { number: 1, date: "1989-12" }
    ],
    supersedes: ["IS 2745:1964"],
    superseded_by: null,
    certification: {
      regulatory_class: "Class A",
      mandatory: true,
      qco_name: "Helmet for Police Force, Civil Defence and Personal Protection (Quality Control) Order, 2023",
      gazette_no: "S.O. 4649(E)",
      gazette_date: "2023-10-23",
      effective_date: "2024-04-23",
      issuing_ministry: "Ministry of Commerce and Industry (DPIIT)",
      schedule_item: "Item 2",
      statutory_basis: "Bureau of Indian Standards Act, 2016 (Sections 16, 17, 25)",
      scheme: "Scheme-I (ISI Mark)",
      verification_status: "VERIFIED"
    },
    source: "https://www.services.bis.gov.in/",
    is_primary_candidate: true
  },
  {
    canonical_id: "IS-15298-Part-2-2016",
    is_number: "IS 15298 (Part 2):2016",
    title: "Personal Protective Equipment — Part 2: Safety Footwear (Second Revision)",
    scope: "Specifies basic and additional requirements for safety footwear used in industrial workplaces, including 200 Joules impact protection toecaps, slip resistance, and penetration resistance.",
    category: "Personal Protective Equipment and Safety",
    description: "Mandatory standard for industrial safety shoes and boots protecting against crushing, puncture, slip, chemical, and electrical shock hazards.",
    application: "Factory shop floors, heavy machinery workshops, logistics warehouses, construction sites, mining.",
    technical_requirements: {
      toecap_impact_energy: "200 Joules impact resistance (clearance under toecap >= 14 mm for size 42)",
      toecap_compression: "15 kN static compression load with minimum clearance preserved",
      upper_height: "Form A (low shoe), Form B (ankle boot), Form C (half-knee boot), Form D (knee boot)"
    },
    materials: {
      upper: "Grain leather or synthetic micro-fiber >= 1.2 mm thickness",
      outsole: "Polyurethane (PU) dual density, nitrile rubber, or thermoplastic polyurethane (TPU)",
      insole: "Non-metallic puncture resistant textile or anti-perforation steel midsole >= 1100 N"
    },
    performance_requirements: {
      slip_resistance: "Ceramic tile with NaLS detergent: heel slip >= 0.28, flat slip >= 0.32 (SRA/SRC)",
      tear_strength: "Upper tear strength >= 120 N; Outsole tear strength >= 8 kN/m",
      abrasion_resistance: "Outsole volume loss <= 150 mm³ after 1000 abrasion cycles"
    },
    safety_requirements: {
      penetration_resistance: "Puncture resistance >= 1100 N across entire sole surface",
      electrical_resistance: "Antistatic: between 100 kΩ and 1000 MΩ; Conductive: < 100 kΩ; Insulating: > 1000 MΩ"
    },
    testing_requirements: {
      impact_resistance: "Clause 5.3.2.2 / IS 15298 (Part 1)",
      compression_resistance: "Clause 5.3.2.3",
      penetration_resistance: "Clause 5.7.1",
      slip_resistance: "Clause 5.3.4"
    },
    version: "Second Revision (2016) [Transitioning to 2024]",
    publication_year: 2016,
    status: "active",
    amendments: [
      { number: 1, date: "2018-05" },
      { number: 2, date: "2021-08" }
    ],
    supersedes: ["IS 15298 (Part 2):2002"],
    superseded_by: null,
    certification: {
      regulatory_class: "Class A",
      mandatory: true,
      qco_name: "Personal Protective Equipment — Footwear (Quality Control) Order, 2020",
      gazette_no: "S.O. 3857(E) & S.O. 3417(E)",
      gazette_date: "2020-10-27 (S.O. 3857(E)) / 2026-06-25 (S.O. 3417(E))",
      effective_date: "2021-07-01",
      issuing_ministry: "Ministry of Commerce and Industry (DPIIT)",
      schedule_item: "Safety Footwear schedule",
      statutory_basis: "Bureau of Indian Standards Act, 2016 (Section 16)",
      scheme: "Scheme-I (ISI Mark) / Scheme-II (SDoC for permitted corporate buyers)",
      verification_status: "VERIFIED"
    },
    source: "https://www.bis.gov.in/",
    is_primary_candidate: true
  },

  // ==================== DOMAIN 2: ELECTRICAL EQUIPMENT & SWITCHGEAR ====================
  {
    canonical_id: "IS-1180-Part-1-2014",
    is_number: "IS 1180 (Part 1):2014",
    title: "Outdoor/Indoor Type Oil-Immersed Distribution Transformers Up to and Including 2 500 kVA, 33 kV — Specification Part 1: Mineral Oil Immersed (Fourth Revision)",
    scope: "Specifies requirements for mineral oil-immersed distribution transformers up to 2500 kVA and 33 kV, establishing maximum permissible losses for energy efficiency levels 1, 2, and 3.",
    category: "Electrical Equipment and Switchgear",
    description: "Crucial electrical infrastructure standard regulating distribution transformers to prevent catastrophic grid failures and mandate energy conservation across Indian DISCOM networks.",
    application: "State DISCOM distribution networks, commercial developments, rural power grids, industrial substations.",
    technical_requirements: {
      standard_ratings: ["16, 25, 63, 100, 160, 200, 250, 315, 400, 500, 630, 1000, 1250, 1600, 2000, 2500 kVA"],
      voltage_ratios: ["11 kV / 433 V", "22 kV / 433 V", "33 kV / 433 V"],
      cooling_type: "ONAN (Oil Natural Air Natural)",
      vector_group: "Dyn11"
    },
    materials: {
      core: "Cold Rolled Grain Oriented (CRGO) silicon steel or Amorphous metal alloy",
      windings: "High-conductivity electrolytic copper or EC-grade aluminium",
      dielectric_fluid: "Mineral insulating oil conforming to IS 335"
    },
    performance_requirements: {
      max_total_losses: "Strict ceiling limits at 50% and 100% rated load according to Energy Efficiency Level 1, 2, or 3",
      temperature_rise: "Maximum oil temperature rise: 35°C / 40°C; Maximum winding temperature rise: 40°C / 45°C",
      short_circuit_withstand: "Must withstand thermal and dynamic effects of external dead short-circuit for 2 seconds"
    },
    safety_requirements: {
      pressure_relief: "Explosion vent or pressure relief device (PRD) with trip contacts",
      insulation_levels: "Impulse withstand: 75 kVp for 11 kV; 170 kVp for 33 kV; Power frequency: 28 kV rms for 11 kV"
    },
    testing_requirements: {
      routine_tests: "Clause 21.2 (Winding resistance, voltage ratio, losses at 50% & 100%, dielectric breakdown of oil)",
      type_tests: "Clause 21.3 (Temperature rise, lightning impulse test, short circuit withstand)",
      special_tests: "Clause 21.4 (Noise level measurement, harmonics analysis)"
    },
    version: "Fourth Revision (2014)",
    publication_year: 2014,
    status: "active",
    amendments: [
      { number: 1, date: "2016-02" },
      { number: 2, date: "2018-07" },
      { number: 3, date: "2020-09" },
      { number: 4, date: "2022-04" }
    ],
    supersedes: ["IS 1180 (Part 1):1989", "IS 1180 (Part 2):1989"],
    superseded_by: null,
    certification: {
      regulatory_class: "Class A",
      mandatory: true,
      qco_name: "Electrical Transformers (Quality Control) Order, 2015",
      gazette_no: "S.O. 1221(E)",
      gazette_date: "2015-05-07",
      effective_date: "2015-08-01",
      issuing_ministry: "Ministry of Heavy Industries and Public Enterprises",
      schedule_item: "Item 1 of Table",
      statutory_basis: "Bureau of Indian Standards Act, 1986 (Section 14) / 2016 Act",
      scheme: "Scheme-I (ISI Mark)",
      verification_status: "VERIFIED"
    },
    source: "https://www.services.bis.gov.in/",
    is_primary_candidate: true
  },
  {
    canonical_id: "IS-694-2010",
    is_number: "IS 694:2010",
    title: "Polyvinyl Chloride Insulated Unsheathed and Sheathed Cables/Cords with Rigid and Flexible Conductor for Rated Voltages Up to and Including 450/750 V (Fourth Revision)",
    scope: "Specifies construction, dimensions, and test requirements for single-core and multi-core PVC-insulated cables and cords with rigid and flexible copper or aluminium conductor for rated voltages up to and including 450/750 V, with BIS Scheme-I certification extended up to and including 1100 V per PM/IS 694/5/March 2024 and QCO S.O. 189(E).",
    category: "Electrical Equipment and Switchgear",
    description: "The primary Indian Standard for building electrical wiring, household appliance cords, and low-voltage industrial cabling.",
    application: "Internal building electrification, residential wiring, control panels, small machinery power supply.",
    technical_requirements: {
      rated_voltage: "Up to and including 450/750 V (standard) / Up to 1100 V (QCO & Product Manual)",
      rated_voltage_in_standard: "Up to and including 450/750 V",
      qco_product_coverage: "PVC insulated cables for working voltages up to and including 1100 V",
      conductor_classes: ["Class 1 (solid)", "Class 2 (stranded)", "Class 5 (flexible) as per IS 8130"],
      insulation_types: ["Type A (general purpose)", "Type C (heat resistant HR)", "Type D (oil resistant)"],
      flame_retardance_categories: ["Standard", "FR (Flame Retardant)", "FR-LSH (Flame Retardant Low Smoke Halogen)"]
    },
    materials: {
      conductor: "Plain or tinned annealed electrolytic copper or EC-grade aluminium",
      insulation: "Polyvinyl chloride compound",
      sheath: "PVC compound Type ST1 or ST2"
    },
    performance_requirements: {
      conductor_resistance: "Conforming to IS 8130 at 20°C (e.g. max 12.1 Ω/km for 1.5 mm² copper flexible)",
      insulation_resistance: "Minimum volume resistivity at 27°C: 1 x 10^13 Ω-cm; at 70°C: 1 x 10^10 Ω-cm",
      high_voltage_spark_test: "Spark test voltage up to 10 kV AC peak; Water immersion HV withstand 3 kV AC for 5 min"
    },
    safety_requirements: {
      flame_propagation: "Oxygen index >= 29% for FR; >= 30% for FR-LSH; Temperature index >= 250°C",
      smoke_density: "Light transmittance >= 40% for FR-LSH cables",
      acid_gas_generation: "HCl gas emission <= 20% by mass for FR-LSH"
    },
    testing_requirements: {
      dimensional_checks: "Clause 14.1 (Conductor diameter, insulation thickness, sheath thickness)",
      electrical_tests: "Clause 14.2 (Conductor resistance, high voltage test, insulation resistance)",
      mechanical_tests: "Clause 14.3 (Tensile strength, elongation at break before and after accelerated ageing)",
      flammability_tests: "Clause 14.4 (Flammability test, oxygen index, smoke density)"
    },
    version: "Fourth Revision (2010)",
    publication_year: 2010,
    status: "active",
    amendments: [
      { number: 1, date: "2013-04" },
      { number: 2, date: "2016-09" },
      { number: 3, date: "2018-05" },
      { number: 4, date: "2020-08" },
      { number: 5, date: "2022-11" }
    ],
    supersedes: ["IS 694:1990"],
    superseded_by: null,
    certification: {
      regulatory_class: "Class A",
      mandatory: true,
      official_standard_title: "Polyvinyl Chloride Insulated Unsheathed and Sheathed Cables/Cords with Rigid and Flexible Conductor for Rated Voltages Up to and Including 450/750 V",
      qco_schedule_description: "PVC insulated cables for working voltages up to and including 1100 V.",
      product_manual_title: "Polyvinyl Chloride Insulated Unsheathed and Sheathed Cables/Cords with Rigid and Flexible Conductor for Rated Voltages Up to and Including 1100 V",
      certification_scope: "Cables and cords for working voltages up to and including 1100 V under BIS Scheme-I (ISI Mark)",
      rated_voltage_in_standard: "Up to and including 450/750 V",
      qco_product_coverage: "PVC insulated cables for working voltages up to and including 1100 V",
      discrepancy_note: "Official Indian Standard IS 694:2010 Fourth Revision defines rated voltages 'Up to and Including 450/750 V' (as affirmed by BIS Central Marks Department Circular dated 15 December 2014 and ETD 19). In contrast, the statutory Quality Control Order S.O. 189(E) dated 17 February 2003 (Schedule Serial 20, effective 17 August 2003) prescribes mandatory coverage for 'PVC insulated cables for working voltages up to and including 1100 V'. To bridge this statutory requirement, the BIS Product Manual PM/IS 694/5/March 2024 expands its title and certification scope to 'voltages up to and including 1100 V', granting ISI certification licenses up to 1100 V.",
      source_references: {
        official_standard_source: "BIS Central Marks Department circular dated 15 December 2014 & IS 694:2010 (Fourth Revision)",
        qco_source: "Official Gazette of India S.O. 189(E) dated 17 February 2003, Schedule Serial Number 20, Clause 1(2)",
        product_manual_source: "BIS Product Manual PM/IS 694/5/March 2024"
      },
      qco_name: "Electrical Wires, Cables, Appliances and Protection Devices and Accessories (Quality Control) Order, 2003",
      gazette_no: "S.O. 189(E)",
      gazette_date: "2003-02-17",
      effective_date: "2003-08-17",
      commencement_date: "2003-08-17",
      issuing_ministry: "Ministry of Commerce and Industry (DIPP / DPIIT)",
      schedule_item: "Serial Number 20 of Schedule",
      schedule_serial: 20,
      applicable_group: "Schedule serials 8 to 24 (6 months transition)",
      statutory_basis: "Bureau of Indian Standards Act, 1986 (Section 14) / 2016 Act",
      scheme: "Scheme-I (ISI Mark)",
      product_manual_ref: "PM/IS 694/5/March 2024",
      commencement_clause_note: "Came into force six months from the date of publication per Paragraph 1(2) of S.O. 189(E) for schedule serials 8 to 24 (effective 17 August 2003).",
      exclusion_note: "Scheduled under S.O. 189(E) Serial 20; excluded from S.O. 280(E) which regulates 13 other heavy-duty cable standards.",
      verification_status: "VERIFIED"
    },
    source: "https://www.services.bis.gov.in/",
    is_primary_candidate: true
  },
  {
    canonical_id: "IS-IEC-60898-1-2015",
    is_number: "IS/IEC 60898-1:2015",
    title: "Electrical Accessories — Circuit-Breakers for Overcurrent Protection for Household and Similar Installations — Part 1: Circuit-Breakers for a.c. Operation",
    scope: "Specifies a.c. circuit-breakers (Miniature Circuit Breakers - MCBs) for household and similar low-voltage installations for operation at 50 Hz, rated voltage not exceeding 440 V, rated current not exceeding 125 A, and short-circuit capacity not exceeding 25 kA.",
    category: "Electrical Equipment and Switchgear",
    description: "The active harmonized Indian Standard for MCBs protecting residential, commercial, and industrial electrical circuits against overload and short circuits.",
    application: "Sub-distribution boards, consumer distribution units, building electrical protection.",
    technical_requirements: {
      rated_voltages: ["240 V AC (single pole)", "415 V AC (multi pole)"],
      rated_currents: ["6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125 A"],
      tripping_characteristics: ["Type B (3In - 5In)", "Type C (5In - 10In)", "Type D (10In - 20In)"],
      rated_short_circuit_capacity: ["3000 A, 4500 A, 6000 A, 10000 A, 15000 A, 25000 A (Icn)"]
    },
    materials: {
      housing: "Flame-retardant high-tracking-index thermoset or engineered polymer (DMC/PA66)",
      contacts: "Silver-graphite or silver-nickel alloy",
      arc_chute: "De-ion arc splitter plates (copper-plated steel)"
    },
    performance_requirements: {
      overload_tripping: "Non-tripping current 1.13In for >= 1 h; Tripping current 1.45In within 1 h",
      short_circuit_breaking: "Must safely interrupt Icn at power factor 0.8 to 0.9 without fire or dangerous arcing",
      endurance: "4,000 electrical operating cycles under load + 6,000 mechanical operating cycles without load"
    },
    safety_requirements: {
      terminal_safety: "IP20 finger-safe terminals; terminal pull-out test per Clause 9.5",
      temperature_rise: "Maximum terminal temperature rise <= 60 K at rated current"
    },
    testing_requirements: {
      tripping_test: "Clause 9.10 (Verification of time-current characteristics B, C, D)",
      short_circuit_test: "Clause 9.12 (Standard duty test at rated short-circuit capacity)",
      temperature_rise_test: "Clause 9.8",
      dielectric_test: "Clause 9.7 (Impulse voltage withstand 4 kV / 6 kV)"
    },
    version: "First Revision (2015) [Canonical Successor to IS 8828:1996]",
    publication_year: 2015,
    status: "active",
    amendments: [
      { number: 1, date: "2018-02" }
    ],
    supersedes: ["IS 8828:1996"],
    superseded_by: null,
    certification: {
      regulatory_class: "Class A",
      mandatory: true,
      qco_name: "Electrical Wires, Cables, Appliances and Protection Devices and Accessories (Quality Control) Order, 2003",
      gazette_no: "S.O. 189(E)",
      gazette_date: "2003-02-17",
      effective_date: "2003-08-17",
      commencement_date: "2003-08-17",
      issuing_ministry: "Ministry of Commerce and Industry (DIPP / DPIIT)",
      schedule_item: "Serial Number 10 of Schedule (originally specified as IS 8828)",
      schedule_serial: 10,
      applicable_group: "Schedule serials 8 to 24 (6 months transition)",
      statutory_basis: "Bureau of Indian Standards Act, 1986 (Section 14) / 2016 Act",
      scheme: "Scheme-I (ISI Mark)",
      product_manual_ref: "PM/IS/IEC 60898-1",
      commencement_clause_note: "Original standard IS 8828 scheduled at Serial 10 came into force six months from publication per Paragraph 1(2) on 17 August 2003.",
      historical_predecessor_id: "IS-8828-1996",
      predecessor_standard: "IS 8828:1996",
      successor_adoption_note: "Original 2003 Gazette scheduled predecessor IS 8828. BIS Electrotechnical division harmonized IS 8828 with IEC 60898-1 and confirmed successor IS/IEC 60898-1 coverage under mandatory certification. Successor edition is not claimed to be explicitly listed in 2003 Gazette.",
      verification_status: "VERIFIED"
    },
    source: "https://www.services.bis.gov.in/",
    is_primary_candidate: true
  },
  {
    canonical_id: "IS-IEC-62271-100-2008",
    is_number: "IS/IEC 62271-100:2008",
    title: "High-Voltage Switchgear and Controlgear — Part 100: Alternating-Current Circuit-Breakers",
    scope: "Specifies three-pole high-voltage a.c. circuit-breakers designed for indoor and outdoor installation and for operation at frequencies of 50 Hz and voltages exceeding 1000 V.",
    category: "Electrical Equipment and Switchgear",
    description: "Standard covering high-voltage vacuum and SF6 gas circuit breakers installed in power transmission and distribution substations.",
    application: "Substations at 11 kV, 33 kV, 66 kV, 132 kV, 220 kV, 400 kV, industrial high-voltage intake switchyards.",
    technical_requirements: {
      interrupter_technologies: ["Vacuum circuit-breaker (VCB)", "Sulphur hexafluoride (SF6) puffer circuit-breaker"],
      operating_sequence: "O - 0.3s - CO - 3min - CO or CO - 15s - CO",
      rated_short_circuit_breaking_current: ["13.1 kA, 25 kA, 31.5 kA, 40 kA, 50 kA, 63 kA rms"]
    },
    materials: {
      interrupter_bottle: "Alumina ceramic vacuum interrupter envelope or epoxy-cast SF6 chamber",
      mechanism: "Spring-operated motor-charged mechanism"
    },
    performance_requirements: {
      basic_insulation_level_bil: "11 kV: 75 kVp; 33 kV: 170 kVp; 132 kV: 650 kVp; 220 kV: 1050 kVp; 400 kV: 1425 kVp",
      temperature_rise: "Maximum temperature rise of contacts: 65 K (silver plated); terminals: 50 K",
      mechanical_endurance: "Class M2: 10,000 operating cycles without maintenance"
    },
    safety_requirements: {
      interlocking: "Mechanical and electrical interlocks with earth switch and busbar isolators",
      internal_arc_classification: "IAC AFLR up to 40 kA for 1 second in metal-clad indoor switchboards"
    },
    testing_requirements: {
      type_tests: "Short-circuit make and break tests (T10, T30, T60, T100s, T100a), capacitive current switching, temperature rise, impulse voltage",
      routine_tests: "Power frequency voltage withstand on main circuits, dielectric test on control circuits, contact resistance, mechanical timing"
    },
    version: "First National Adoption (2008)",
    publication_year: 2008,
    status: "active",
    amendments: [],
    supersedes: ["IS 13118:1991"],
    superseded_by: null,
    certification: {
      regulatory_class: "Class B",
      mandatory: false,
      qco_name: null,
      gazette_no: null,
      gazette_date: null,
      effective_date: null,
      issuing_ministry: "Ministry of Power / Utility Specifications",
      statutory_basis: "Voluntary BIS Scheme-I licensing",
      scheme: "Scheme-I (Voluntary ISI Mark)",
      procurement_mandate_note: "No central QCO enacted. Utility procurement (POWERGRID/DISCOMs) mandates type testing via CPRI/ERDA per tender specifications.",
      verification_status: "VERIFIED"
    },
    source: "https://www.services.bis.gov.in/",
    is_primary_candidate: true
  },

  // ==================== DOMAIN 3: CIVIL CONSTRUCTION MATERIALS ====================
  {
    canonical_id: "IS-456-2000",
    is_number: "IS 456:2000",
    title: "Plain and Reinforced Concrete — Code of Practice (Fourth Revision)",
    scope: "Deals with the general structural use of plain and reinforced concrete in buildings and civil engineering structures.",
    category: "Civil Construction Materials",
    description: "The core national engineering design code for all reinforced concrete design, detailing, durability, and construction in India.",
    application: "Structural engineering design calculations, multi-storey buildings, commercial complexes, civil infrastructure.",
    technical_requirements: {
      grades_of_concrete: ["Ordinary: M10, M15, M20", "Standard: M25, M30, M35, M40, M45, M50, M55, M60", "High strength: M65, M70, M75, M80, M85, M90, M100"],
      design_methods: ["Limit State Method (LSM) - Primary", "Working Stress Method (WSM) - Annex B"],
      partial_safety_factors: ["Concrete in flexure/compression: 1.50", "Steel reinforcement: 1.15"]
    },
    materials: {
      cement: "OPC (IS 269), PPC (IS 1489), PSC (IS 455), Composite (IS 16415)",
      aggregates: "Coarse and fine aggregates conforming to IS 383",
      reinforcement: "High-strength deformed steel bars conforming to IS 1786 or structural steel conforming to IS 2062",
      water: "Potable water conforming to Clause 5.4 (pH >= 6.0)"
    },
    performance_requirements: {
      characteristic_strength: "fck verified by 28-day compressive strength of 150 mm cubes",
      durability_exposure_classes: ["Mild", "Moderate", "Severe", "Very Severe", "Extreme (Table 3, 4, 5)"],
      minimum_cement_content: "Ranging from 300 kg/m³ (mild) to 360 kg/m³ (extreme) for RCC",
      maximum_free_water_cement_ratio: "Ranging from 0.55 (mild) down to 0.40 (extreme) for RCC"
    },
    safety_requirements: {
      fire_resistance: "Minimum dimensions and cover for 0.5 h to 4 h fire ratings (Table 16A)",
      minimum_nominal_cover: "20 mm (slabs), 25 mm (beams), 40 mm (columns), 50 mm (footings)",
      crack_width_limits: "Maximum 0.3 mm for mild exposure; 0.2 mm for moderate/severe"
    },
    testing_requirements: {
      cube_compressive_strength: "Clause 15 (Sampling frequency and acceptance criteria)",
      slump_workability: "Clause 7 (Workability ranges 25 mm to 175 mm)",
      non_destructive_testing: "Rebound hammer (IS 13311 Pt 2) and ultrasonic pulse velocity (IS 13311 Pt 1)"
    },
    version: "Fourth Revision (2000)",
    publication_year: 2000,
    status: "active",
    amendments: [
      { number: 1, date: "2001-12" },
      { number: 2, date: "2005-08" },
      { number: 3, date: "2007-08" },
      { number: 4, date: "2013-05" },
      { number: 5, date: "2019-07" }
    ],
    supersedes: ["IS 456:1978"],
    superseded_by: null,
    certification: {
      regulatory_class: "Class C",
      mandatory: false,
      qco_name: null,
      gazette_no: null,
      gazette_date: null,
      effective_date: null,
      issuing_ministry: "Ministry of Housing and Urban Affairs / State PWDs / CPWD",
      statutory_basis: "Engineering design code referenced by municipal bylaws and NBC",
      scheme: "Non-certifiable (Code of Practice)",
      regulatory_note: "Not a product QCO. Adopted or referenced by building bylaws, CPWD Works Manual, and National Building Code.",
      verification_status: "VERIFIED"
    },
    source: "https://www.services.bis.gov.in/",
    is_primary_candidate: true
  },
  {
    canonical_id: "IS-1786-2008",
    is_number: "IS 1786:2008",
    title: "High Strength Deformed Steel Bars and Wires for Concrete Reinforcement — Specification (Fourth Revision)",
    scope: "Specifies requirements for high strength deformed steel bars and wires for concrete reinforcement produced by hot rolling followed by thermo-mechanical treatment (TMT).",
    category: "Civil Construction Materials",
    description: "The mandatory Indian standard for TMT rebar used as primary structural reinforcement in all reinforced concrete building and infrastructure construction.",
    application: "Reinforcement in foundations, columns, beams, slabs, seismic-resistant structures, bridges, flyovers, dams.",
    technical_requirements: {
      standard_nominal_sizes: ["4, 5, 6, 8, 10, 12, 16, 20, 25, 28, 32, 36, 40 mm"],
      steel_grades: ["Fe 415, Fe 415D", "Fe 500, Fe 500D", "Fe 550, Fe 550D", "Fe 600"],
      deformation_requirements: "Transverse ribs with height and spacing conforming to Clause 5 to ensure mechanical bond strength >= 0.040d"
    },
    materials: {
      steel_manufacturing: "Electric arc furnace, induction furnace with secondary refining, or basic oxygen furnace",
      chemical_composition: "Maximum Carbon: 0.25% (D grade); Max Sulphur: 0.040% (D grade); Max Phosphorus: 0.040% (D grade); Max S+P: 0.075%"
    },
    performance_requirements: {
      yield_strength: "Fe 415: >= 415 MPa; Fe 500: >= 500 MPa; Fe 500D: >= 500 MPa; Fe 550D: >= 550 MPa; Fe 600: >= 600 MPa",
      tensile_strength_ratio: "Fe 500D: Ultimate tensile strength (TS) >= 1.10 x Yield stress (YS) and TS >= 565 MPa",
      elongation: "Fe 415: >= 14.5%; Fe 500: >= 12.0%; Fe 500D: >= 16.0%; Total elongation at max force (Agt): >= 5.0% for D grades"
    },
    safety_requirements: {
      bendability: "180° cold bend without rupture around mandrel 2d to 5d depending on size and grade",
      rebend_test: "Bend through 135°, aged in boiling water (100°C) for 30 minutes, bent back 157.5° without cracking",
      seismic_resistance: "Mandatory use of 'D' (Ductile) grades for seismic zones III, IV, and V"
    },
    testing_requirements: {
      tensile_testing: "Clause 9.2 (Proof stress, tensile strength, elongation)",
      bend_and_rebend_testing: "Clause 9.3 and 9.4",
      chemical_analysis: "Clause 8.1",
      rib_geometry_verification: "Clause 9.5"
    },
    version: "Fourth Revision (2008)",
    publication_year: 2008,
    status: "active",
    amendments: [
      { number: 1, date: "2012-05" },
      { number: 2, date: "2016-04" },
      { number: 3, date: "2018-03" }
    ],
    supersedes: ["IS 1786:1985"],
    superseded_by: null,
    certification: {
      regulatory_class: "Class A",
      mandatory: true,
      qco_name: "Steel and Steel Products (Quality Control) Order, 2024",
      gazette_no: "S.O. 3716(E)",
      gazette_date: "2024-08-29",
      effective_date: "2024-08-30",
      issuing_ministry: "Ministry of Steel",
      schedule_item: "Scheduled Steel Item",
      statutory_basis: "Bureau of Indian Standards Act, 2016 (Section 16)",
      scheme: "Scheme-I (ISI Mark)",
      verification_status: "VERIFIED"
    },
    source: "https://www.services.bis.gov.in/",
    is_primary_candidate: true
  },
  {
    canonical_id: "IS-269-2015",
    is_number: "IS 269:2015",
    title: "Ordinary Portland Cement — Specification (Sixth Revision)",
    scope: "Covers manufacture, chemical composition, physical requirements, and packaging of Ordinary Portland Cement (OPC), unifying grades 33, 43, 53, 43S, and 53S into one consolidated specification.",
    category: "Civil Construction Materials",
    description: "The primary national cement standard governing Ordinary Portland Cement used in high-strength concrete, precast elements, and general construction.",
    application: "Precast prestressed concrete beams, multi-storey RCC frame buildings, bridges, heavy industrial slabs, concrete railway sleepers (S grades).",
    technical_requirements: {
      consolidated_grades: ["OPC 33", "OPC 43", "OPC 53", "OPC 43S (Sleeper)", "OPC 53S (Sleeper)"],
      fineness_specific_surface: "Minimum 225 m²/kg (Blaine method); Minimum 370 m²/kg for 43S/53S",
      setting_time: "Initial setting time >= 30 minutes; Final setting time <= 600 minutes"
    },
    materials: {
      clinker: "Intimate ground mixture of calcareous and argillaceous materials burned at clinkering temperature",
      retarder: "Natural gypsum conforming to IS 1290 (max 5% by mass)",
      performance_improver: "Fly ash / slag / limestone addition max 5% total"
    },
    performance_requirements: {
      compressive_strength_33: "3-day: >= 16 MPa; 7-day: >= 22 MPa; 28-day: 33 to 48 MPa",
      compressive_strength_43: "3-day: >= 23 MPa; 7-day: >= 33 MPa; 28-day: 43 to 58 MPa",
      compressive_strength_53: "3-day: >= 27 MPa; 7-day: >= 37 MPa; 28-day: >= 53 MPa",
      soundness: "Le-Chatelier expansion <= 10 mm; Autoclave expansion <= 0.8%"
    },
    safety_requirements: {
      chemical_limits: "Lime Saturation Factor (LSF): 0.66 to 1.02; Alumina-Iron ratio >= 0.66; Insoluble residue <= 5.0%; Magnesia <= 6.0%; Total loss on ignition <= 5.0%; Total sulphur <= 3.5%",
      chloride_content: "Maximum chloride content: 0.10% by mass (0.05% for prestressed concrete)"
    },
    testing_requirements: {
      chemical_analysis: "IS 4032",
      physical_testing: "IS 4031 (Part 1 to Part 15)",
      compressive_strength_test: "IS 4031 (Part 6) using standard mortar cubes",
      soundness_test: "IS 4031 (Part 3)"
    },
    version: "Sixth Revision (2015)",
    publication_year: 2015,
    status: "active",
    amendments: [],
    supersedes: ["IS 269:1989", "IS 8112:2013", "IS 12269:2013"],
    superseded_by: null,
    certification: {
      regulatory_class: "Class A",
      mandatory: true,
      qco_name: "Cement (Quality Control) Order, 2003",
      gazette_no: "S.O. 191(E)",
      gazette_date: "2003-02-17",
      effective_date: "2003-02-17",
      issuing_ministry: "Ministry of Commerce and Industry (DPIIT)",
      schedule_item: "Item 1 of Schedule",
      statutory_basis: "Bureau of Indian Standards Act, 1986 / 2016",
      scheme: "Scheme-I (ISI Mark)",
      amalgamation_note: "Consolidated older separate standards IS 8112 (43G) and IS 12269 (53G) into IS 269:2015.",
      verification_status: "VERIFIED"
    },
    source: "https://www.services.bis.gov.in/",
    is_primary_candidate: true
  },
  {
    canonical_id: "IS-1489-Part-1-2015",
    is_number: "IS 1489 (Part 1):2015",
    title: "Portland Pozzolana Cement — Specification Part 1: Fly Ash Based (Third Revision)",
    scope: "Covers manufacture, chemical and physical requirements, and packaging of fly ash-based Portland Pozzolana Cement.",
    category: "Civil Construction Materials",
    description: "Standard for blended cement containing pulverized fuel ash (fly ash), offering enhanced long-term strength, chemical resistance, lower heat of hydration, and sustainable construction benefits.",
    application: "Mass concrete (dams, foundations), marine structures, sewage treatment plants, hydraulic works, general residential masonry and plastering.",
    technical_requirements: {
      pozzolana_percentage: "Fly ash content between 15% and 35% by mass intimately ground or blended with OPC clinker",
      fineness_specific_surface: "Minimum 300 m²/kg (Blaine method)",
      setting_time: "Initial setting time >= 30 minutes; Final setting time <= 600 minutes"
    },
    materials: {
      opc_clinker: "High quality Portland cement clinker",
      pozzolana: "Fly ash conforming to IS 3812 (Part 1)",
      gypsum: "Natural gypsum conforming to IS 1290"
    },
    performance_requirements: {
      compressive_strength: "3-day: >= 16 MPa; 7-day: >= 22 MPa; 28-day: >= 33 MPa",
      drying_shrinkage: "Maximum drying shrinkage: 0.15%",
      soundness: "Le-Chatelier expansion <= 10 mm; Autoclave expansion <= 0.8%"
    },
    safety_requirements: {
      chemical_limits: "Magnesia <= 6.0%; Insoluble material <= X + 4.0% where X is pozzolana content; Total loss on ignition <= 5.0%; Sulphuric anhydride (SO3) <= 3.5%",
      chloride_content: "Maximum chloride content <= 0.10%"
    },
    testing_requirements: {
      pozzolana_content_determination: "Annex A (Selective chemical dissolution method)",
      compressive_strength: "IS 4031 (Part 6)",
      fineness: "IS 4031 (Part 2)",
      soundness: "IS 4031 (Part 3)"
    },
    version: "Third Revision (2015)",
    publication_year: 2015,
    status: "active",
    amendments: [],
    supersedes: ["IS 1489 (Part 1):1991"],
    superseded_by: null,
    certification: {
      regulatory_class: "Class A",
      mandatory: true,
      qco_name: "Cement (Quality Control) Order, 2003",
      gazette_no: "S.O. 191(E)",
      gazette_date: "2003-02-17",
      effective_date: "2003-02-17",
      issuing_ministry: "Ministry of Commerce and Industry (DPIIT)",
      schedule_item: "Item 2 of Schedule",
      statutory_basis: "Bureau of Indian Standards Act, 1986 / 2016",
      scheme: "Scheme-I (ISI Mark)",
      verification_status: "VERIFIED"
    },
    source: "https://www.services.bis.gov.in/",
    is_primary_candidate: true
  },

  // ==================== DOMAIN 4: INDUSTRIAL MACHINERY & MECHANICAL EQUIPMENT ====================
  {
    canonical_id: "IS-12615-2018",
    is_number: "IS 12615:2018",
    title: "Line Operated Three Phase a.c. Motors (IE CODE) — Efficiency Classes and Performance Specification (Third Revision)",
    scope: "Specifies energy efficiency classes (IE2, IE3, IE4) and performance parameters for line-operated three-phase squirrel cage induction motors in the power range from 0.12 kW up to 1000 kW, frame sizes 71 to 355.",
    category: "Industrial Machinery and Mechanical Equipment",
    description: "The mandatory energy efficiency standard for industrial electric motors driving pumps, fans, compressors, conveyors, and manufacturing plants across India.",
    application: "Industrial fluid pumps, blowers, air compressors, conveyor belts, machine tools, industrial automation drives.",
    technical_requirements: {
      efficiency_classes: ["IE2 (High Efficiency) - Minimum statutory baseline", "IE3 (Premium Efficiency)", "IE4 (Super Premium Efficiency)"],
      poles_covered: "2, 4, 6, and 8 poles",
      rated_frequency: "50 Hz ± 5%",
      rated_voltages: ["Up to and including 1000 V (typically 415 V)"]
    },
    materials: {
      stator_core: "Low-loss insulated cold-rolled electrical steel laminations",
      windings: "Class F or Class H dual-coated enamel electrolytic copper wire",
      rotor: "Die-cast high-conductivity aluminium or fabricated copper rotor cage",
      enclosure: "Cast iron or die-cast aluminium alloy frame"
    },
    performance_requirements: {
      efficiency_thresholds: "Full load and 75% load efficiency measured per IS 15999 (Part 2/Sec 1) [IEC 60034-2-1]",
      temperature_rise: "Maximum winding temperature rise limited to Class B (80 K) despite Class F insulation",
      breakdown_torque: "Minimum breakdown torque >= 160% to 200% of rated torque"
    },
    safety_requirements: {
      degree_of_protection: "Minimum IP55 protection against dust and water jets per IS/IEC 60034-5",
      terminal_box: "Adequately sized for cable termination with earthing terminals inside and outside frame"
    },
    testing_requirements: {
      efficiency_test: "Summation of losses method with indirect measurement of stray-load loss per IS 15999 (Part 2/Sec 1)",
      temperature_rise_test: "Resistance method under rated continuous duty (S1)",
      locked_rotor_test: "Measurement of locked rotor current and torque",
      high_voltage_dielectric: "1000 V + 2 x rated voltage (min 1500 V) for 1 minute"
    },
    version: "Third Revision (2018) [Fourth Revision 2026 published by BIS ETD 15]",
    publication_year: 2018,
    status: "active",
    amendments: [
      { number: 1, date: "2020-04" },
      { number: 2, date: "2024-03" }
    ],
    supersedes: ["IS 12615:2011"],
    superseded_by: null,
    certification: {
      regulatory_class: "Class A",
      mandatory: true,
      qco_name: "Energy Efficient Induction Motors — Three Phase Squirrel Cage (Quality Control) Order, 2017",
      gazette_no: "S.O. 178(E) & S.O. 3207(E)",
      gazette_date: "2017-01-18 (S.O. 178(E)) / 2017-09-29 (S.O. 3207(E))",
      effective_date: "2018-01-01",
      issuing_ministry: "Ministry of Commerce and Industry (DPIIT)",
      schedule_item: "Single scheduled item",
      statutory_basis: "Bureau of Indian Standards Act, 1986 (Section 14)",
      scheme: "Scheme-I (ISI Mark)",
      fourth_revision_note: "BIS ETD 15 published IS 12615:2026 and adopted it into lab testing scopes. DPIIT has not yet published an amending Gazette S.O. Legal transition date is UNRESOLVED.",
      verification_status: "VERIFIED"
    },
    source: "https://www.services.bis.gov.in/",
    is_primary_candidate: true
  },
  {
    canonical_id: "IS-1239-Part-1-2004",
    is_number: "IS 1239 (Part 1):2004",
    title: "Steel Tubes, Tubulars and Other Wrought Steel Fittings — Specification — Part 1: Steel Tubes (Sixth Revision)",
    scope: "Specifies requirements for welded (ERW) and seamless mild steel tubes of nominal sizes 15 mm to 150 mm in light, medium, and heavy series suitable for screwing or welding.",
    category: "Industrial Machinery and Mechanical Equipment",
    description: "Standard for commercial, domestic, and industrial mild steel piping used for water, gas, air, steam, and fire protection distribution networks.",
    application: "Fire sprinkler piping systems, building plumbing, chilled water HVAC conduits, industrial compressed air, steam lines.",
    technical_requirements: {
      classes_series: ["Light (Class A - Yellow band)", "Medium (Class B - Blue band)", "Heavy (Class C - Red band)"],
      nominal_bores: ["15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150 mm NB"],
      manufacturing_processes: ["Electric Resistance Welded (ERW)", "High Frequency Induction Welded (HFW)", "Hot Finished Seamless (HFS)"]
    },
    materials: {
      steel: "Killed or semi-killed carbon steel",
      chemical_composition: "Max Carbon: 0.20%; Max Manganese: 1.30%; Max Phosphorus: 0.040%; Max Sulphur: 0.040%",
      zinc_coating: "Hot-dip galvanized coating mass >= 400 g/m² for galvanized pipes"
    },
    performance_requirements: {
      tensile_strength: "Minimum tensile strength: 320 MPa; Minimum yield stress: 180 to 200 MPa",
      elongation: "Minimum elongation: 12% to 20% depending on size",
      hydrostatic_test_pressure: "Every tube shall withstand 5 MPa (50 bar) internal hydrostatic pressure held for at least 5 seconds without leakage"
    },
    safety_requirements: {
      cold_flattening_test: "Flattening to 75% of original diameter without crack at weld (at 90° to load) and 60% without crack elsewhere",
      cold_bend_test: "For tubes up to 50 mm NB: 90° cold bend around cylindrical mandrel of 6 x OD without crack or flaking"
    },
    testing_requirements: {
      tensile_test: "Clause 14.1 / IS 1608",
      hydrostatic_pressure_test: "Clause 14.3",
      cold_bend_test: "Clause 14.4",
      cold_flattening_test: "Clause 14.5",
      galvanizing_test: "IS 2633 (Preece dip test) and IS 6745 (mass of coating)"
    },
    version: "Sixth Revision (2004)",
    publication_year: 2004,
    status: "active",
    amendments: [
      { number: 1, date: "2006-03" },
      { number: 2, date: "2009-08" },
      { number: 3, date: "2013-11" },
      { number: 4, date: "2016-04" },
      { number: 5, date: "2018-09" },
      { number: 6, date: "2020-02" }
    ],
    supersedes: ["IS 1239 (Part 1):1990"],
    superseded_by: null,
    certification: {
      regulatory_class: "Class A",
      mandatory: true,
      qco_name: "Steel Tubes (Quality Control) Order, 2020",
      gazette_no: "S.O. 281(E)",
      gazette_date: "2020-01-21",
      effective_date: "2020-08-01",
      issuing_ministry: "Ministry of Commerce and Industry (DPIIT)",
      schedule_item: "Table, Item 1",
      statutory_basis: "Bureau of Indian Standards Act, 2016 (Section 16)",
      scheme: "Scheme-I (ISI Mark)",
      amendment_provision_verbatim: "For the purposes of this Table, the latest version of Indian Standards including the amendments issued thereof, as may be notified by the Bureau of Indian Standards from time to time, shall apply from the date of such notification.",
      verification_status: "VERIFIED"
    },
    source: "https://www.services.bis.gov.in/",
    is_primary_candidate: true
  },
  {
    canonical_id: "IS-8034-2018",
    is_number: "IS 8034:2018",
    title: "Submersible Pumpsets — Specification (Third Revision)",
    scope: "Specifies requirements for submersible pumpsets with water or oil filled motors for handling clear, cold water from deep tubewells, borewells, and sumps.",
    category: "Industrial Machinery and Mechanical Equipment",
    description: "National standard governing deep-well multi-stage centrifugal submersible pumps used extensively in agriculture and drinking water supply.",
    application: "Agricultural borewell irrigation, deep groundwater extraction, municipal rural water schemes (Jal Jeevan Mission), industrial water booster systems.",
    technical_requirements: {
      borewell_sizes: ["100 mm (4 inch)", "150 mm (6 inch)", "200 mm (8 inch)", "250 mm (10 inch)"],
      motor_types: ["Water filled wet-rotor", "Oil filled", "Encapsulated resin-filled stator"],
      discharge_head_range: "Heads up to 400 m; Flow discharges from 1 m³/h to over 200 m³/h"
    },
    materials: {
      impellers_and_diffusers: "Glass-filled Noryl polymer, cast bronze, or SS 304 investment cast",
      pump_shaft: "Martensitic or austenitic stainless steel (SS 410 / SS 304)",
      casing_and_bowls: "Graded cast iron FG 200 or fabricated stainless steel SS 304",
      bearings: "Water-lubricated rubber/carbon radial bearings with Mitchell thrust bearing"
    },
    performance_requirements: {
      pump_efficiency: "Minimum overall efficiency conforming to guaranteed performance curves per Table 1 to 4",
      temperature_rise: "Motor winding temperature rise within Class B or Class F insulation limits during continuous underwater operation",
      voltage_band: "Must start and operate smoothly across wide voltage variations (300 V to 440 V for 3-phase; 160 V to 240 V for 1-phase)"
    },
    safety_requirements: {
      non_return_valve: "Built-in spring-loaded NRV to prevent backflow and water hammer shock",
      submersible_cable_joint: "Waterproof vulcanized or heat-shrink joint withstanding 1.5 kV underwater insulation test"
    },
    testing_requirements: {
      performance_hydro_test: "Clause 14 (Head, discharge, power consumption, and overall efficiency testing at laboratory test bed)",
      hydrostatic_pressure_test: "Casing subjected to 1.5 times maximum shut-off head held for 5 minutes",
      insulation_resistance_test: "Underwater insulation resistance > 20 MΩ before run, > 2 MΩ immediately after run"
    },
    version: "Third Revision (2018)",
    publication_year: 2018,
    status: "active",
    amendments: [
      { number: 1, date: "2020-09" }
    ],
    supersedes: ["IS 8034:2002"],
    superseded_by: null,
    certification: {
      regulatory_class: "Class B",
      mandatory: false,
      qco_name: "Draft Pumps (Quality Control) Order (WTO: G/TBT/N/IND/308)",
      gazette_no: null,
      gazette_date: null,
      effective_date: null,
      issuing_ministry: "Ministry of Commerce and Industry (DPIIT)",
      statutory_basis: "Voluntary BIS Scheme-I licensing",
      scheme: "Scheme-I (Voluntary ISI Mark)",
      draft_qco_note: "No final S.O. enacted in Gazette of India. BIS operates active voluntary Scheme-I certification under Product Manual PM/8034/1. Mandated commercially for BEE Star Rating and PM-KUSUM.",
      verification_status: "VERIFIED"
    },
    source: "https://www.services.bis.gov.in/",
    is_primary_candidate: true
  },
  {
    canonical_id: "IS-3177-2020",
    is_number: "IS 3177:2020",
    title: "Electric Overhead Travelling Crane and Gantry Crane for all Applications — Code of Practice (Third Revision)",
    scope: "Covers mechanical, electrical, structural, and safety design calculations, manufacture, erection, and testing of electric overhead travelling (EOT) cranes and gantry cranes across all duty classes (M1 to M8).",
    category: "Industrial Machinery and Mechanical Equipment",
    description: "Comprehensive national engineering code of practice for industrial heavy lifting cranes used in factories, power stations, and steel plants.",
    application: "Steel manufacturing plants, thermal and hydro power plant turbine halls, heavy machinery assembly bays, container terminals, railway workshops.",
    technical_requirements: {
      duty_mechanism_classes: ["M1 to M8 per IS 13834 (Part 1) [ISO 4301-1] based on state of loading and total operating hours"],
      structural_design: "Conforming to IS 807 structural steel design standards using limit state principles",
      service_speeds: "Controlled hoist, cross travel (CT), and long travel (LT) speeds"
    },
    materials: {
      structural_steel: "Plates and sections conforming to IS 2062 Grade E250 / E350 Quality B/C",
      crane_hooks: "Forged shank hooks conforming to IS 15560 / IS 3815",
      wire_ropes: "Steel core wire ropes conforming to IS 2266 with tensile grade 1770 / 1960 N/mm²"
    },
    performance_requirements: {
      deflection_limit: "Maximum structural girder vertical deflection under safe working load: span / 750 (normal); span / 1000 (heavy/mill duty)",
      factor_of_safety: "Hoisting wire rope factor of safety between 4.0 and 9.0 depending on duty class",
      braking_capacity: "Dual electro-mechanical brakes for hoists capable of holding 150% to 200% of rated safe working load"
    },
    safety_requirements: {
      anti_collision_devices: "Infrared or laser anti-collision sensors for multiple cranes on shared runway",
      limit_switches: "Gravity-type and rotary-type limit switches for hoisting motion; limit switches for cross and long travel",
      overload_protection: "Electronic load-cell overload limiter cutting hoist power if load exceeds 110% of rated capacity"
    },
    testing_requirements: {
      deflection_test: "Clause 17.2 (Measurement of camber and girder deflection under 100% SWL)",
      overload_test: "Clause 17.3 (Static overload test at 125% SWL; Dynamic overload test at 110% SWL)",
      insulation_and_continuity: "Electrical resistance of all circuits and earthing continuity test"
    },
    version: "Third Revision (2020)",
    publication_year: 2020,
    status: "active",
    amendments: [],
    supersedes: ["IS 3177:1999"],
    superseded_by: null,
    certification: {
      regulatory_class: "Class C",
      mandatory: false,
      qco_name: null,
      gazette_no: null,
      gazette_date: null,
      effective_date: null,
      issuing_ministry: "Ministry of Labour and Employment / DGFASLI",
      statutory_basis: "Engineering Code of Practice enforced under Factories Act, 1948",
      scheme: "Non-certifiable (Engineered Capital Equipment Code)",
      regulatory_note: "Engineered capital system custom-built to building spans; not an off-the-shelf product. Enforced via Factory Inspectorate, competent persons testing, and third-party inspection (TPI).",
      verification_status: "VERIFIED"
    },
    source: "https://www.services.bis.gov.in/",
    is_primary_candidate: true
  },

  // ==================== SUPPORTING REFERENCES ====================
  {
    canonical_id: "IS-383-2016",
    is_number: "IS 383:2016",
    title: "Coarse and Fine Aggregate for Concrete — Specification (Third Revision)",
    scope: "Specifies requirements for natural gravel, crushed rock, crushed gravel, and manufactured sand (M-sand) used as coarse and fine aggregates in concrete.",
    category: "Civil Construction Materials",
    description: "Normative raw material specification supporting concrete structural design standards like IS 456.",
    application: "Fine and coarse aggregates in all structural and plain concrete mixes.",
    technical_requirements: {
      grading_zones: ["Zone I (coarse sand)", "Zone II (medium sand)", "Zone III (fine sand)", "Zone IV (very fine sand)"],
      coarse_aggregate_nominal_sizes: ["40 mm, 20 mm, 16 mm, 12.5 mm, 10 mm"]
    },
    materials: {
      source_materials: "Crushed rock, natural river gravel/sand, manufactured sand (M-sand), recycled concrete aggregate (RCA)"
    },
    performance_requirements: {
      crushing_value: "Aggregate crushing value <= 30% for concrete wear surfaces; <= 45% for other concrete",
      impact_value: "Aggregate impact value <= 30% for wear surfaces; <= 45% for other concrete",
      flakiness_and_elongation: "Combined flakiness and elongation index <= 35% for coarse aggregates"
    },
    safety_requirements: {
      deleterious_substances: "Clay lumps <= 1.0%; Total deleterious materials <= 5.0%; Alkali-aggregate reactivity non-reactive"
    },
    testing_requirements: {
      sieve_analysis: "IS 2386 (Part 1)",
      flakiness_elongation: "IS 2386 (Part 1)",
      crushing_impact: "IS 2386 (Part 4)"
    },
    version: "Third Revision (2016)",
    publication_year: 2016,
    status: "supporting_reference",
    amendments: [
      { number: 1, date: "2019-02" },
      { number: 2, date: "2021-08" }
    ],
    supersedes: ["IS 383:1970"],
    superseded_by: null,
    certification: {
      regulatory_class: "Class D",
      mandatory: false,
      qco_name: null,
      gazette_no: null,
      gazette_date: null,
      effective_date: null,
      issuing_ministry: "BIS Civil Engineering Department (CED 2)",
      statutory_basis: "Normative reference raw material standard",
      scheme: "Reference Standard (Referenced by IS 456:2000)",
      verification_status: "VERIFIED"
    },
    source: "https://www.services.bis.gov.in/",
    is_primary_candidate: false
  },
  {
    canonical_id: "IS-10262-2019",
    is_number: "IS 10262:2019",
    title: "Concrete Mix Proportioning — Guidelines (Second Revision)",
    scope: "Provides mathematical guidelines and step-by-step procedures for proportioning concrete mixes based on target strength, workability, and durability.",
    category: "Civil Construction Materials",
    description: "Standard engineering calculation method for designing concrete mixes from ordinary M10 to ultra-high-strength M100.",
    application: "Ready-mix concrete plants, concrete mix laboratory design, site trial batching.",
    technical_requirements: {
      concrete_classes: ["Standard concrete (M10 to M60)", "High-strength concrete (M65 to M100)", "Self-compacting concrete (SCC)", "Mass concrete"],
      target_mean_strength: "f'ck = fck + 1.65 x s (where s is standard deviation from Table 2)"
    },
    materials: {
      inputs: "Cement, supplementary cementitious materials (fly ash, GGBS, silica fume), coarse aggregates, fine aggregates, chemical admixtures (superplasticizers), water"
    },
    performance_requirements: {
      mix_design_steps: "1. Target strength calculation; 2. Water-cement ratio selection; 3. Water content estimation; 4. Calculation of cementitious content; 5. Proportion of coarse and fine aggregate; 6. Trial mix adjustments"
    },
    safety_requirements: {
      durability_compliance: "Mandates minimum cementitious content and maximum water-binder ratio to meet IS 456 durability tables"
    },
    testing_requirements: {
      trial_batching: "3 trial batches with differing water-cement ratios to establish 28-day strength curve"
    },
    version: "Second Revision (2019)",
    publication_year: 2019,
    status: "supporting_reference",
    amendments: [],
    supersedes: ["IS 10262:2009"],
    superseded_by: null,
    certification: {
      regulatory_class: "Class D",
      mandatory: false,
      qco_name: null,
      gazette_no: null,
      gazette_date: null,
      effective_date: null,
      issuing_ministry: "BIS Civil Engineering Department (CED 2)",
      statutory_basis: "Engineering calculation guideline",
      scheme: "Reference Standard (Referenced by Clause 9 of IS 456:2000)",
      verification_status: "VERIFIED"
    },
    source: "https://www.services.bis.gov.in/",
    is_primary_candidate: false
  },
  {
    canonical_id: "IS-3043-2018",
    is_number: "IS 3043:2018",
    title: "Code of Practice for Earthing (Second Revision)",
    scope: "Covers the design, installation, testing, and maintenance of earthing systems for electrical installations.",
    category: "Electrical Equipment and Switchgear",
    description: "The authoritative national engineering code for electrical earthing, substation ground grids, and personnel shock protection.",
    application: "Substations, distribution transformers, industrial power systems, lightning protection earthing.",
    technical_requirements: {
      earthing_methods: ["Pipe electrode", "Plate electrode", "Strip/conductor electrode", "Earth grid/mesh"],
      soil_resistivity_assessment: "Wenner four-electrode method for measuring soil resistivity"
    },
    materials: {
      electrodes: "Galvanized steel pipe/plate, copper-bonded steel rod, or solid electrolytic copper",
      earth_continuity_conductor: "GI flat strip or annealed copper tape"
    },
    performance_requirements: {
      earth_resistance_limits: "Large generating/transmission substations <= 0.5 Ω; Major distribution substations <= 1.0 Ω; Small substations <= 2.0 Ω; Domestic installations <= 5.0 Ω",
      fault_current_capacity: "Conductors sized to carry maximum earth fault current for 1.0 second or 3.0 seconds without overheating"
    },
    safety_requirements: {
      step_and_touch_potential: "Mesh potential and touch potential maintained strictly below tolerable thresholds per IEEE 80 / IS 3043 formulas"
    },
    testing_requirements: {
      earth_electrode_resistance: "Fall of potential method using earth tester (Clause 37)",
      continuity_test: "Earth loop impedance test"
    },
    version: "Second Revision (2018)",
    publication_year: 2018,
    status: "supporting_reference",
    amendments: [],
    supersedes: ["IS 3043:1987"],
    superseded_by: null,
    certification: {
      regulatory_class: "Class C",
      mandatory: false,
      qco_name: null,
      gazette_no: null,
      gazette_date: null,
      effective_date: null,
      issuing_ministry: "BIS Electrotechnical Department (ETD 30)",
      statutory_basis: "Engineering safety code referenced in electrical rules",
      scheme: "Reference Code of Practice",
      verification_status: "VERIFIED"
    },
    source: "https://www.services.bis.gov.in/",
    is_primary_candidate: false
  }
];

// Write verified_standards.json
const jsonPath = path.join(dataDir, 'verified_standards.json');
fs.writeFileSync(jsonPath, JSON.stringify(verifiedStandards, null, 2), 'utf8');
console.log(`Wrote ${verifiedStandards.length} standards to ${jsonPath}`);

// Write verified_standards.csv
const csvHeaders = [
  'canonical_id',
  'is_number',
  'title',
  'category',
  'version',
  'publication_year',
  'regulatory_class',
  'mandatory',
  'qco_name',
  'gazette_no',
  'gazette_date',
  'effective_date',
  'issuing_ministry',
  'is_primary_candidate',
  'verification_status',
  'source'
];

function escapeCsvField(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

const csvRows = [csvHeaders.join(',')];
for (const s of verifiedStandards) {
  const row = [
    escapeCsvField(s.canonical_id),
    escapeCsvField(s.is_number),
    escapeCsvField(s.title),
    escapeCsvField(s.category),
    escapeCsvField(s.version),
    escapeCsvField(s.publication_year),
    escapeCsvField(s.certification.regulatory_class),
    escapeCsvField(s.certification.mandatory),
    escapeCsvField(s.certification.qco_name || 'N/A'),
    escapeCsvField(s.certification.gazette_no || 'N/A'),
    escapeCsvField(s.certification.gazette_date || 'N/A'),
    escapeCsvField(s.certification.effective_date || 'N/A'),
    escapeCsvField(s.certification.issuing_ministry || 'N/A'),
    escapeCsvField(s.is_primary_candidate),
    escapeCsvField(s.certification.verification_status),
    escapeCsvField(s.source)
  ];
  csvRows.push(row.join(','));
}

const csvPath = path.join(dataDir, 'verified_standards.csv');
fs.writeFileSync(csvPath, csvRows.join('\n'), 'utf8');
console.log(`Wrote CSV with ${csvRows.length - 1} records to ${csvPath}`);

// Standard Relationships
const standardRelationships = [
  // 1. IS 8828:1996 -> IS/IEC 60898-1:2015
  {
    source_canonical_id: "IS-8828-1996",
    source_is_number: "IS 8828:1996",
    target_canonical_id: "IS-IEC-60898-1-2015",
    target_is_number: "IS/IEC 60898-1:2015",
    relationship_type: "predecessor_to",
    evidence: "Original standard IS 8828:1996 was scheduled at Serial 10 of S.O. 189(E) (effective 17 August 2003 per Clause 1(2)). BIS Electrotechnical division harmonized IS 8828 with IEC 60898-1 to formulate IS/IEC 60898-1, transferring certification licensing to the successor standard."
  },
  {
    source_canonical_id: "IS-IEC-60898-1-2015",
    source_is_number: "IS/IEC 60898-1:2015",
    target_canonical_id: "IS-8828-1996",
    target_is_number: "IS 8828:1996",
    relationship_type: "successor_to",
    evidence: "Active canonical national standard for MCBs replacing legacy IS 8828:1996. S.O. 189(E) Serial 10 originally mandated IS 8828 from 17 August 2003; mandatory Scheme-I licensing transferred to IS/IEC 60898-1 under BIS transition guidelines without claiming the 2003 Gazette explicitly named the 2015 edition."
  },
  // 2. IS 12615:2018 -> IS 12615:2026
  {
    source_canonical_id: "IS-12615-2018",
    source_is_number: "IS 12615:2018",
    target_canonical_id: "IS-12615-2026",
    target_is_number: "IS 12615:2026",
    relationship_type: "succeeded_by_revision",
    evidence: "Fourth Revision published by BIS ETD 15 in 2026. Legal Gazette amendment from DPIIT is pending (unresolved)."
  },
  // 3. IS 456:2000 -> IS 383:2016
  {
    source_canonical_id: "IS-456-2000",
    source_is_number: "IS 456:2000",
    target_canonical_id: "IS-383-2016",
    target_is_number: "IS 383:2016",
    relationship_type: "references_material_standard",
    evidence: "Clause 5.3 of IS 456:2000 mandates that all coarse and fine aggregates shall conform to IS 383."
  },
  // 4. IS 456:2000 -> IS 10262:2019
  {
    source_canonical_id: "IS-456-2000",
    source_is_number: "IS 456:2000",
    target_canonical_id: "IS-10262-2019",
    target_is_number: "IS 10262:2019",
    relationship_type: "references_design_guideline",
    evidence: "Clause 9.1 of IS 456:2000 specifies IS 10262 as the approved mathematical method for concrete mix proportioning."
  },
  // 5. IS 456:2000 -> IS 1786:2008
  {
    source_canonical_id: "IS-456-2000",
    source_is_number: "IS 456:2000",
    target_canonical_id: "IS-1786-2008",
    target_is_number: "IS 1786:2008",
    relationship_type: "references_reinforcement_standard",
    evidence: "Clause 5.6.1 of IS 456:2000 mandates high strength deformed steel bars shall conform to IS 1786."
  },
  // 6. IS 456:2000 -> IS 269:2015
  {
    source_canonical_id: "IS-456-2000",
    source_is_number: "IS 456:2000",
    target_canonical_id: "IS-269-2015",
    target_is_number: "IS 269:2015",
    relationship_type: "references_cement_standard",
    evidence: "Clause 5.1 of IS 456:2000 specifies Ordinary Portland Cement conforming to IS 269."
  },
  // 7. IS 456:2000 -> IS 1489 (Part 1):2015
  {
    source_canonical_id: "IS-456-2000",
    source_is_number: "IS 456:2000",
    target_canonical_id: "IS-1489-Part-1-2015",
    target_is_number: "IS 1489 (Part 1):2015",
    relationship_type: "references_cement_standard",
    evidence: "Clause 5.1 of IS 456:2000 specifies Portland Pozzolana Cement conforming to IS 1489 (Part 1)."
  },
  // 8. IS 1180 (Part 1):2014 -> IS 3043:2018
  {
    source_canonical_id: "IS-1180-Part-1-2014",
    source_is_number: "IS 1180 (Part 1):2014",
    target_canonical_id: "IS-3043-2018",
    target_is_number: "IS 3043:2018",
    relationship_type: "references_safety_code",
    evidence: "Distribution transformer neutral and body earthing installations must conform to IS 3043."
  },
  // 9. IS 694:2010 -> IS/IEC 60898-1:2015
  {
    source_canonical_id: "IS-694-2010",
    source_is_number: "IS 694:2010",
    target_canonical_id: "IS-IEC-60898-1-2015",
    target_is_number: "IS/IEC 60898-1:2015",
    relationship_type: "electrical_circuit_coordination",
    evidence: "PVC insulated cables (IS 694) are coordinated with MCBs (IS/IEC 60898-1) for overcurrent thermal protection under S.O. 189(E) regulations."
  },
  // 10. IS 2925:1984 -> IS 2745:1983
  {
    source_canonical_id: "IS-2925-1984",
    source_is_number: "IS 2925:1984",
    target_canonical_id: "IS-2745-1983",
    target_is_number: "IS 2745:1983",
    relationship_type: "related_safety_standard",
    evidence: "Both are personal protective headgear standards co-scheduled under the DPIIT Helmet QCO (S.O. 4649(E))."
  },
  // 11. IS 2925:1984 -> IS 15298 (Part 2):2016
  {
    source_canonical_id: "IS-2925-1984",
    source_is_number: "IS 2925:1984",
    target_canonical_id: "IS-15298-Part-2-2016",
    target_is_number: "IS 15298 (Part 2):2016",
    relationship_type: "complementary_ppe",
    evidence: "Industrial safety helmets and safety footwear form core mandatory personal protective equipment for factory and construction workers."
  },
  // 12. IS/IEC 60898-1:2015 -> IS/IEC 62271-100:2008
  {
    source_canonical_id: "IS-IEC-60898-1-2015",
    source_is_number: "IS/IEC 60898-1:2015",
    target_canonical_id: "IS-IEC-62271-100-2008",
    target_is_number: "IS/IEC 62271-100:2008",
    relationship_type: "hierarchical_protection_coordination",
    evidence: "Low-voltage downstream circuit breakers (IS/IEC 60898-1) coordinate with high-voltage upstream substation breakers (IS/IEC 62271-100) across distribution hierarchy."
  }
];

const relPath = path.join(dataDir, 'standard_relationships.json');
fs.writeFileSync(relPath, JSON.stringify(standardRelationships, null, 2), 'utf8');
console.log(`Wrote ${standardRelationships.length} relationships to ${relPath}`);

// Manifest
const manifest = {
  manifest_version: "2.3.0",
  project: "NIRDESHAK",
  created_at: new Date().toISOString(),
  auditor: "Senior Software Architect, AI/ML Engineer, Database Auditor",
  source_verification_baseline: "Gazette of India, BIS Official e-Sale, BIS Product Manuals, DPIIT / Ministry notifications",
  dataset_summary: {
    total_records: verifiedStandards.length,
    primary_candidates: verifiedStandards.filter(s => s.is_primary_candidate).length,
    supporting_references: verifiedStandards.filter(s => !s.is_primary_candidate).length,
    classification_counts: {
      class_a_mandatory_qco: verifiedStandards.filter(s => s.certification.regulatory_class === 'Class A').length,
      class_b_voluntary_bis: verifiedStandards.filter(s => s.certification.regulatory_class === 'Class B').length,
      class_c_code_of_practice: verifiedStandards.filter(s => s.certification.regulatory_class === 'Class C').length,
      class_d_reference_standard: verifiedStandards.filter(s => s.certification.regulatory_class === 'Class D').length
    },
    total_relationships: standardRelationships.length
  },
  special_reconciliation_notes: {
    "IS-694-2010": "Tripartite reconciliation maintained: Official Standard Title specifies 450/750 V per BIS CMD Circular dated 15 Dec 2014; Statutory QCO S.O. 189(E) Serial 20 specifies working voltages up to 1100 V (effective 17 Aug 2003); BIS Product Manual PM/IS 694/5/March 2024 specifies certification scope up to 1100 V."
  },
  unresolved_issues: [
    "IS 12615:2026 legal Gazette transition from 2018 edition is pending Ministry notification.",
    "IS 8034:2018 Pumps QCO remains a draft notified to WTO; no final Gazette S.O. enacted.",
    "IS 15298 (Part 2) Scheme-II facilitation window under S.O. 3417(E) has conditional eligibility."
  ]
};

const manifestPath = path.join(dataDir, 'data_source_manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
console.log(`Wrote manifest to ${manifestPath}`);
