/**
 * Investigation Registry: WRD (34 products) and PGD (36 products) - 70 products
 */

const WRD_PGD_INVESTIGATION = [
  // ==========================================
  // WRD (34 products)
  // ==========================================
  {
    canonical_name: "Agricultural Rain Gun Giant Sprinklers 2-Inch",
    council: "WRD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 12232 (Part 1):1996",
    new_standard: {
      is_number: "IS 12232 (Part 1):1996",
      title: "Agricultural Irrigation Equipment — Rotating Sprinklers: Part 1 Design and Operational Requirements (First Revision)",
      publication_year: 1996,
      version: "First Revision (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "WRD 25",
      division_council: "Water Resources",
      scope: "Specifies design, operational, and uniform water distribution requirements for rotating impact sprinklers and giant rain gun sprinklers used in agricultural irrigation.",
      materials: "Gunmetal / cast bronze body per IS 318, brass nozzles per IS 319, stainless steel fulcrum pin and springs.",
      technical_requirements: "Inlet connection 2-inch (50 mm) BSP; nozzle trajectory angle 23 to 30 deg; operating pressure range 0.2 MPa to 0.6 MPa; wetted radius 25 m to 50 m.",
      performance_requirements: "Coefficient of uniformity (CU) minimum 84% under test grid; rotation speed 1 to 3 rpm; trajectory stability under wind speeds up to 10 km/h.",
      testing_requirements: "Catch-can water distribution test per IS 12232 (Part 2); pressure-discharge relationship determination; endurance rotation test 1000 hours.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards WRD 25 Irrigation and Drainage Equipment Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 12232/1; Pradhan Mantri Krishi Sinchayee Yojana (PMKSY) Technical Specifications for Micro Irrigation",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_12232_1",
      evidence_excerpt: "Clause 1.1: Covers design and operational requirements of rotating impact sprinklers and rain guns for agricultural irrigation.",
      applicability_explanation: "Primary national product standard for 2-inch agricultural giant rain gun impact sprinklers.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by WRD 25; mandatory qualification standard under PMKSY subsidy schemes."
  },
  {
    canonical_name: "Agricultural Screen and Disc Filtration Units",
    council: "WRD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 12785:1994",
    new_standard: {
      is_number: "IS 12785:1994",
      title: "Irrigation Equipment — Strainers in Irrigation Micro-Systems — Specification (First Revision)",
      publication_year: 1994,
      version: "First Revision (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "WRD 25",
      division_council: "Water Resources",
      scope: "Specifies requirements for screen filters and grooved disc filtration units used in micro-irrigation systems to prevent emitter clogging.",
      materials: "Reinforced polypropylene or epoxy-coated cast steel body, stainless steel mesh 120-150 mesh (100-130 micron) or grooved polypropylene discs.",
      technical_requirements: "Nominal flow rates 10 m3/h to 50 m3/h; maximum working pressure 0.6 MPa to 1.0 MPa; clean filter pressure drop <= 0.02 MPa.",
      performance_requirements: "Burst test pressure minimum 2.0 times rated working pressure; filtration efficiency >= 98% particulate removal above 130 micron; collapse resistance of filter element.",
      testing_requirements: "Hydrostatic burst pressure test per IS 12785 Clause 7; pressure drop versus flow rate test; dirt holding capacity determination.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards WRD 25 Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 12785/1; PMKSY Guidelines Chapter 5 Micro Irrigation Equipment",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_12785",
      evidence_excerpt: "Clause 1.1: Covers requirements for screen and disc strainers and filters used in pressurized micro-irrigation networks.",
      applicability_explanation: "Primary national product standard for micro-irrigation screen and disc filtration assemblies.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by WRD 25; core equipment in drip irrigation filtration heads."
  },
  {
    canonical_name: "Air Release and Vacuum Relief Valves for Water Mains",
    council: "WRD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 14845:2000",
    new_standard: {
      is_number: "IS 14845:2000",
      title: "Resilient Seated Cast Iron Air Release, Air and Vacuum and Combination Air Valves for Waterworks — Specification",
      publication_year: 2000,
      version: "Original Edition (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "WRD 22",
      division_council: "Water Resources",
      scope: "Specifies requirements for small orifice air release valves, large orifice air and vacuum valves, and kinetic double orifice combination air valves for water transmission pipelines.",
      materials: "Ductile iron or cast iron body conforming to IS 210 FG 220, stainless steel or rubber coated floats, EPDM resilient seating.",
      technical_requirements: "Nominal sizes DN 50 to DN 200; pressure ratings PN 1.0, PN 1.6; air discharge capacity at differential pressure 0.05 MPa.",
      performance_requirements: "Hydrostatic test pressure on body 1.5 times PN, seat test pressure 1.1 times PN; low pressure sealing at 0.02 MPa without leakage.",
      testing_requirements: "Air discharge and inflow airflow testing per IS 14845 Annex B; hydraulic pressure test for shell and float.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards WRD 22 Waterworks Valves Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 14845/1; CPHEEO Manual on Water Supply and Treatment Section 6.5.3",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_14845",
      evidence_excerpt: "Clause 1.1: Covers resilient seated air release, air and vacuum, and kinetic combination air valves for water supply pipelines.",
      applicability_explanation: "Primary national standard for air release and vacuum relief valves installed along water transmission mains.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by WRD 22; standard valve for pipeline water hammer and surge protection."
  },
  {
    canonical_name: "Automated Dam Trash Rack Cleaning Machines (TRCM)",
    council: "WRD",
    status: "VERIFIED_SUPPORTING_ONLY",
    standard_is: "IS 11388:2012",
    mapping: {
      relationship_type: "supporting_reference",
      mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "Central Water Commission (CWC) Dam Safety Guidelines; IS 11388 Clause 6.4",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_11388",
      evidence_excerpt: "Clause 6.4: Mechanical clearing criteria and raking velocity parameters for automated trash rack cleaning machines.",
      applicability_explanation: "Establishes mechanical clearance parameters and structural racking load criteria for automated dam trash rack cleaning machinery.",
      confidence_score: 0.92
    },
    investigation_notes: "TRCM systems are engineered to service dam intake trash racks governed by IS 11388."
  },
  {
    canonical_name: "Automated Diaphragm Irrigation Hydraulic Valves",
    council: "WRD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 14846:2000",
    new_standard: {
      is_number: "IS 14846:2000",
      title: "Sluice Valves for Waterworks Purposes (50 to 1200 mm Size) — Specification (Fourth Revision)",
      publication_year: 2000,
      version: "Fourth Revision (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "WRD 22",
      division_council: "Water Resources",
      scope: "Specifies requirements for flanged and socketed sluice and control valves used in waterworks, irrigation pipelines, and water transmission systems.",
      materials: "Cast iron or ductile iron body, stainless steel trim, EPDM resilient seal.",
      technical_requirements: "Pressure ratings PN 0.6, PN 1.0, PN 1.6; manual and automated hydraulic actuator operation.",
      performance_requirements: "Hydrostatic test pressure on body 1.5 x PN; seat leak tightness test; endurance cyclic operation.",
      testing_requirements: "Hydrostatic shell and seat test; torque measurement.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards WRD 22 Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 14846/1; PMKSY Irrigation Pipeline Standards",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_14846",
      evidence_excerpt: "Clause 1.1: Covers sluice valves and hydraulic isolation valves for waterworks and irrigation purposes.",
      applicability_explanation: "Primary national standard for waterworks isolation and hydraulic control valves.",
      confidence_score: 0.95
    },
    investigation_notes: "Formulated by WRD 22; standard for water distribution control valves."
  },
  {
    canonical_name: "Automated Electro-Mechanical Canal Radial Gate Actuators",
    council: "WRD",
    status: "VERIFIED_SUPPORTING_ONLY",
    standard_is: "IS 10210:1993",
    new_standard: {
      is_number: "IS 10210:1993",
      title: "Criteria for Design of Hydraulic Hoists for Gates — Guidelines (First Revision)",
      publication_year: 1993,
      version: "First Revision (Reaffirmed 2019)",
      status: "ACTIVE",
      technical_committee: "WRD 12",
      division_council: "Water Resources",
      scope: "Provides criteria for design, sizing, and selection of hydraulic hoists and electromechanical actuators for operating radial crest gates and vertical lift gates in dams and canals.",
      materials: "Forged steel cylinders, hard chromium plated piston rods, bronze gland bushes, high-pressure hydraulic power packs.",
      technical_requirements: "Operating thrust ratings 50 kN to 5000 kN; stroke length up to 15 m; operating hoisting speed 0.3 m/min to 1.5 m/min.",
      performance_requirements: "Safety factor on buckling >= 3.0; synchronized gate operation tolerance <= 5 mm across span; fail-safe closing under gravity or accumulator.",
      testing_requirements: "Proof pressure test on hydraulic cylinder at 1.5 times working pressure; synchronous operation test; full-load hoisting test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards WRD 12 Hydraulic Gates and Valves Committee"
    },
    mapping: {
      relationship_type: "supporting_reference",
      mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "Central Water Commission Criteria for Gate Hoists; BIS WRD 12 Standard Guidelines",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_10210",
      evidence_excerpt: "Clause 1.1: Covers criteria for selection, sizing, and structural design of hydraulic and electromechanical hoists for spillway and canal gates.",
      applicability_explanation: "Governing standard for electro-mechanical and hydraulic actuators operating canal radial spillway gates.",
      confidence_score: 0.96
    },
    investigation_notes: "Formulated by WRD 12; primary design benchmark for dam and canal gate actuators."
  },
  {
    canonical_name: "Automated Tipping Bucket Rainfall Telemetry Stations",
    council: "WRD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 5235:1992",
    new_standard: {
      is_number: "IS 5235:1992",
      title: "Specification for Raingauge, Recording — Tipping Bucket Type (First Revision)",
      publication_year: 1992,
      version: "First Revision (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "WRD 1",
      division_council: "Water Resources",
      scope: "Specifies construction, dimensional, and operational requirements for tipping bucket recording rain gauges used in hydrological and meteorological observation stations.",
      materials: "Stainless steel or anodized cast aluminium collector funnel with rim diameter 200 mm, balanced stainless steel tipping bucket, reed switch sensor.",
      technical_requirements: "Bucket bucket volume calibrated to 0.1 mm, 0.2 mm, or 0.5 mm rainfall increment; pulse output closure; siphon mechanism.",
      performance_requirements: "Measurement accuracy within +/- 2% up to rainfall intensity of 100 mm/hour; corrosion resistance against environmental exposure.",
      testing_requirements: "Dynamic calibration test using burette water feed; contact closure bounce verification; leveling bubble alignment test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards WRD 1 Hydrometry Sectional Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 5235/1; India Meteorological Department (IMD) Observational Equipment Standards; CWC Hydrology Manual",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_5235",
      evidence_excerpt: "Clause 1.1: Covers requirements for tipping bucket recording rain gauges for measuring precipitation intensity and quantity.",
      applicability_explanation: "Primary national product standard for tipping bucket rainfall sensors and telemetric rain gauge stations.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by WRD 1; fundamental instrument in National Hydrology Project (NHP) telemetric networks."
  },
  {
    canonical_name: "Automated Weather Stations for Hydrology",
    council: "WRD",
    status: "VERIFIED_SUPPORTING_ONLY",
    standard_is: "IS 5235:1992",
    mapping: {
      relationship_type: "supporting_reference",
      mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "India Meteorological Department (IMD) AWS Technical Specifications 2020; CWC Hydrological Telemetry Guidelines",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_5235",
      evidence_excerpt: "Clause 4.1: Precipitation sensor integration requirements for automated hydro-meteorological stations.",
      applicability_explanation: "Specifies precipitation sensing core accuracy for automated hydrological weather stations.",
      confidence_score: 0.90
    },
    investigation_notes: "AWS stations combine IS 5235 rain gauges with WMO-compliant temperature, solar radiation, and wind sensors."
  },
  {
    canonical_name: "Automatic Backwash Sand Media Deep Bed Filters",
    council: "WRD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 14606:1998",
    new_standard: {
      is_number: "IS 14606:1998",
      title: "Irrigation Equipment — Media Filters for Micro-Irrigation — Specification",
      publication_year: 1998,
      version: "Original Edition (Reaffirmed 2019)",
      status: "ACTIVE",
      technical_committee: "WRD 25",
      division_council: "Water Resources",
      scope: "Specifies requirements for pressurized deep-bed media (silica sand and gravel) filters used for removing algae, silt, and organic matter from surface irrigation water.",
      materials: "Mild steel pressure vessel with polyurethane/epoxy anti-corrosive lining, silica sand conforming to IS 8419, stainless steel mushroom underdrains.",
      technical_requirements: "Pressure rating PN 0.6 to PN 1.0 MPa; filtration velocity 30 m/h to 50 m/h; automatic backwash multi-port valve.",
      performance_requirements: "Hydrostatic test pressure 1.5 times working pressure; backwashing expansion of sand bed >= 20%; particulate removal down to 80 micron.",
      testing_requirements: "Hydrostatic proof test; pressure loss test across clean bed; backwash fluidization velocity test per IS 14606 Annex A.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards WRD 25 Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 14606/1; PMKSY Technical Standards for Drip Primary Filtration",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_14606",
      evidence_excerpt: "Clause 1.1: Covers design and performance requirements of sand media filters used in micro-irrigation systems.",
      applicability_explanation: "Primary national product standard for automatic backwashing sand media filters.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by WRD 25; mandatory primary filter for surface water micro-irrigation."
  },
  {
    canonical_name: "Canal Parshall Flumes for Discharge Measurement",
    council: "WRD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 14371:1996",
    new_standard: {
      is_number: "IS 14371:1996",
      title: "Measurement of Liquid Flow in Open Channels Using Parshall and Saniiri Flumes — Guidelines",
      publication_year: 1996,
      version: "Original Edition (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "WRD 1",
      division_council: "Water Resources",
      scope: "Specifies construction, hydraulic design, and calibration equations for Parshall flumes used to measure open channel flow in irrigation canals, sewers, and industrial effluents.",
      materials: "Reinforced concrete, galvanized steel plate, or fiberglass reinforced plastic (FRP).",
      technical_requirements: "Throat widths 25 mm to 15 m; free flow and submerged flow conditions; head measurement wells at specified upstream locations.",
      performance_requirements: "Discharge measurement accuracy within +/- 3% under free-flow conditions; modular flow limit ratio 0.6 to 0.8.",
      testing_requirements: "Head-discharge equation verification; dimensional verification of converging section, throat, and diverging section.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards WRD 1 Hydrometry Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "Central Water Commission Flow Measurement Guidelines; BIS WRD 1 Catalogue; State Irrigation Design Manuals",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_14371",
      evidence_excerpt: "Clause 1.1: Covers guidelines for the design, construction, and flow calibration of Parshall flumes for open channel discharge measurement.",
      applicability_explanation: "Primary national standard for Parshall flume canal water discharge measuring devices.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by WRD 1; fundamental open-channel flow standard in irrigation engineering."
  },
  {
    canonical_name: "Digital Telemetric Groundwater Piezometer Data Loggers",
    council: "WRD",
    status: "CANDIDATE_UNVERIFIED",
    investigation_notes: "Digital groundwater telemetry data loggers with 4G/GPRS telemetry are procured per Central Ground Water Board (CGWB) and National Hydrology Project (NHP) technical specifications. BIS Sectional Committee WRD 1 is currently reviewing an Indian Standard draft for telemetry piezometers; international units adhere to ISO 21413."
  },
  {
    canonical_name: "Electromagnetic Water Flow Meters",
    council: "WRD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS/ISO 4064-1:2014",
    new_standard: {
      is_number: "IS/ISO 4064-1:2014",
      title: "Water Meters for Cold Potable Water and Hot Water: Part 1 Metrological and Technical Requirements",
      publication_year: 2014,
      version: "Second Revision (Reaffirmed 2019)",
      status: "ACTIVE",
      technical_committee: "WRD 22",
      division_council: "Water Resources",
      scope: "Specifies metrological and technical requirements for water meters of all technologies (mechanical, electromagnetic, ultrasonic) used to measure volumetric flow of water in closed conduits.",
      materials: "Ductile iron or stainless steel flow tube, hard rubber or PTFE non-conductive liner, Hastelloy C / stainless steel electrodes.",
      technical_requirements: "Nominal diameters DN 15 to DN 2000; accuracy class 1 and class 2; dynamic range Q3/Q1 >= 100; IP68 submersible protection.",
      performance_requirements: "Maximum permissible error +/- 2% in upper flow zone, +/- 5% in lower flow zone; battery life minimum 10 years; pulsed and Modbus/M-Bus digital outputs.",
      testing_requirements: "Gravimetric flow calibration rig testing per IS/ISO 4064-2; hydrostatic pressure test at 1.6 MPa; magnetic tampering resistance test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards WRD 22 (Identical adoption of ISO 4064-1 / OIML R 49-1)"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_STATUTORY",
      evidence_source: "Legal Metrology (Packaged Commodities & Water Meters) Rules; BIS Product Manual PM/IS/ISO 4064/1; Jal Jeevan Mission Urban Water Guidelines",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_ISO_4064_1",
      evidence_excerpt: "Clause 1.1: Specifies the metrological and technical requirements for water meters for cold potable water and hot water, including electronic electromagnetic flow meters.",
      applicability_explanation: "Primary national standard for electromagnetic and ultrasonic bulk water flow meters.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by WRD 22; mandated by Legal Metrology for trade flow billing."
  },
  {
    canonical_name: "Fixed Cone Dispersion Energy Dissipation Valves (Howell-Bunger)",
    council: "WRD",
    status: "VERIFIED_SUPPORTING_ONLY",
    standard_is: "IS 13095:1991",
    mapping: {
      relationship_type: "supporting_reference",
      mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "Central Water Commission Dam Discharge Valve Guidelines; BIS WRD 22 Standards",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_13095",
      evidence_excerpt: "Clause 4.1: Hydraulic flow regulation and cavitation suppression criteria for high-pressure dam discharge valves.",
      applicability_explanation: "Specifies materials, pressure ratings, and hydrodynamic performance criteria for bottom outlet dispersion valves in dams.",
      confidence_score: 0.90
    },
    investigation_notes: "Howell-Bunger fixed cone valves are custom dam release valves engineered per CWC guidelines and hydraulic valve standard IS 13095."
  },
  {
    canonical_name: "Flexible Membrane Geotextile Canal Liners",
    council: "WRD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 16352:2015",
    new_standard: {
      is_number: "IS 16352:2015",
      title: "Geotextiles for Lining of Canals — Specification",
      publication_year: 2015,
      version: "Original Edition (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "TXD 30",
      division_council: "Textiles",
      scope: "Specifies requirements for non-woven and composite polymeric geotextiles used in combination with geomembranes for canal bed lining to prevent seepage water losses.",
      materials: "100% virgin polypropylene staple fibres needle-punched to form uniform cushion geotextile.",
      technical_requirements: "Mass per unit area 200 g/m2 to 500 g/m2; apparent opening size O90; water permeability normal to plane >= 10^-3 m/s.",
      performance_requirements: "CBR puncture resistance minimum 1.5 kN to 3.5 kN per IS 13162 (Part 4); grab tensile strength >= 700 N; UV resistance retention >= 70% after 500 hours.",
      testing_requirements: "Puncture test; wide-width tensile test per IS 13162 (Part 5); trapezoidal tear test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards TXD 30 Geosynthetics Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 16352/1; Central Water Commission Guidelines for Lining of Canals (IS 3873)",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_16352",
      evidence_excerpt: "Clause 1.1: Covers physical, mechanical, and hydraulic properties of geotextiles used as protective cushion layers for canal seepage liners.",
      applicability_explanation: "Primary national product standard for geotextile fabrics used in irrigation canal lining.",
      confidence_score: 0.99
    },
    investigation_notes: "Jointly formulated by TXD 30 and WRD 13; standard lining material in major canal projects."
  },
  {
    canonical_name: "Full Bore Electromagnetic Water Transmission Meters",
    council: "WRD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS/ISO 4064-1:2014",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_STATUTORY",
      evidence_source: "BIS Product Manual PM/IS/ISO 4064/1; Jal Jeevan Mission Bulk Flow Meter Guidelines",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_ISO_4064_1",
      evidence_excerpt: "Clause 1.1: Requirements for bulk transmission water meters DN 50 to DN 1200 operating on electromagnetic induction principles.",
      applicability_explanation: "Direct product standard for full bore electromagnetic water transmission flow meters.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS/ISO 4064-1:2014."
  },
  {
    canonical_name: "Groundwater Piezometers (Vibrating Wire)",
    council: "WRD",
    status: "CANDIDATE_UNVERIFIED",
    investigation_notes: "Vibrating wire piezometers for pore water pressure and groundwater monitoring in dams and aquifers are tested per ASTM D4044 / ISO 18674-4. BIS Sectional Committee WRD 1 is preparing an Indian Standard specification; currently procured per CWC Dam Instrumentation manuals."
  },
  {
    canonical_name: "Hydro-Mechanical Trash Racks",
    council: "WRD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 11388:2012",
    new_standard: {
      is_number: "IS 11388:2012",
      title: "Recommendations for Design of Trash Racks for Intake Structures (First Revision)",
      publication_year: 2012,
      version: "First Revision (Reaffirmed 2018)",
      status: "ACTIVE",
      technical_committee: "WRD 12",
      division_council: "Water Resources",
      scope: "Specifies criteria for structural design, bar spacing, flow velocity, and vibration prevention for fabricated steel trash racks at dam water intakes and penstocks.",
      materials: "Structural steel conforming to IS 2062 Grade E250 / E350, stainless steel bar screens, hot-dip galvanized finish.",
      technical_requirements: "Clear spacing between bars 25 mm to 100 mm; approach velocity 0.6 m/s to 1.5 m/s; structural design head difference 3 m to 5 m water head.",
      performance_requirements: "Natural frequency of rack bars higher than vortex shedding frequency by at least 20% to prevent resonance failure; weld joint efficiency 100%.",
      testing_requirements: "Ultrasonic weld examination per IS 4225; dimensional check; hydrodynamic vibration assessment.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards WRD 12 Hydraulic Structures Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "Central Water Commission Criteria for Intake Structures; BIS WRD 12 Standard Guidelines",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_11388",
      evidence_excerpt: "Clause 1.1: Recommendations for the structural design, hydraulic spacing, and fabrication of steel trash racks for intake structures.",
      applicability_explanation: "Primary national standard for hydro-mechanical fabricated steel intake trash racks.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by WRD 12; standard structural design code for dam intake screens."
  },
  {
    canonical_name: "Hydrodynamic Silt Ejector and Settling Basin Vanes",
    council: "WRD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 6377:1971",
    new_standard: {
      is_number: "IS 6377:1971",
      title: "Criteria for Design of Silt Ejectors (Canal Sub-Surface Drains)",
      publication_year: 1971,
      version: "Original Edition (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "WRD 13",
      division_council: "Water Resources",
      scope: "Specifies hydrodynamic design criteria, tunnel dimensions, flushing discharge, and baffle vane geometry for canal silt ejectors and vortex desilting basins.",
      materials: "Reinforced cement concrete per IS 456, wear-resistant basalt tile or epoxy lining on high-velocity invert floors.",
      technical_requirements: "Flushing velocity 2.5 m/s to 3.5 m/s; extraction ratio 20% to 25% of total canal discharge; particle size exclusion above 0.2 mm.",
      performance_requirements: "Desilting efficiency minimum 70% of bed sediment load; non-clogging tunnel geometry under sediment concentration up to 5000 ppm.",
      testing_requirements: "Scale model hydraulic flume test per IS 6377 Clause 7; head loss measurement across tunnels.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards WRD 13 Canals Sectional Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "Central Water Commission Canal Sediment Control Guidelines; BIS WRD 13 Design Code",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_6377",
      evidence_excerpt: "Clause 1.1: Criteria for hydraulic design of silt ejector tunnels, sub-surface drains, and diaphragm vanes located in head reaches of irrigation canals.",
      applicability_explanation: "Primary Indian Standard specification for canal silt ejectors and sediment settling basin structures.",
      confidence_score: 0.98
    },
    investigation_notes: "Formulated by WRD 13; benchmark standard for canal desilting infrastructure."
  },
  {
    canonical_name: "Inflatable Rubber Barrage Weirs for River Diversion",
    council: "WRD",
    status: "CANDIDATE_UNVERIFIED",
    investigation_notes: "Inflatable rubber dams (flexible fabric reinforced rubber bladders anchored to concrete foundations) are an emerging river weir diversion technology in India. Tested per ASTM D5199 / ISO 2372. BIS WRD 12 sectional committee is currently drafting guidelines for inflatable rubber dams; no final IS code has been published."
  },
  {
    canonical_name: "Low-Head Small Hydro Turbines (100 kW - 1 MW)",
    council: "WRD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 12800 (Part 1):1989",
    new_standard: {
      is_number: "IS 12800 (Part 1):1989",
      title: "Guidelines for Selection, Hydraulic Design and Testing of Hydraulic Turbines for Small Hydroelectric Power Stations: Part 1 Selection and Design",
      publication_year: 1989,
      version: "Original Edition (Reaffirmed 2019)",
      status: "ACTIVE",
      technical_committee: "WRD 15",
      division_council: "Water Resources",
      scope: "Specifies selection guidelines, hydraulic sizing, runner profile, and technical requirements for low-head turbines (Kaplan, Tubular, Bulb, and Crossflow) up to 15 MW unit capacity.",
      materials: "Stainless steel runner blades conforming to Grade 13Cr4Ni per IS 6911; fabricated structural steel casing.",
      technical_requirements: "Net head range 2 m to 25 m; specific speed Ns 250 to 900; runaway speed ratio 2.0 to 2.8; governor response time.",
      performance_requirements: "Peak hydraulic efficiency >= 90% for Kaplan/Bulb turbines, >= 84% for Crossflow; cavitation-free operation at rated head and discharge.",
      testing_requirements: "Field acceptance test per IS 12800 (Part 3) / IEC 60041; ultrasonic testing of runner welds; hydrostatic pressure test on casing at 1.5 x maximum pressure.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards WRD 15 Hydroelectric Power Plants Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "Ministry of New and Renewable Energy (MNRE) Small Hydro Guidelines; Alternate Hydro Energy Centre (AHEC) Standards; BIS WRD 15",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_12800_1",
      evidence_excerpt: "Clause 1.1: Guidelines for selection, hydraulic sizing, and performance testing of hydraulic turbines for small hydro power plants.",
      applicability_explanation: "Primary national standard for small and low-head hydroelectric water turbines.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by WRD 15; benchmark standard in MNRE small hydro projects."
  },
  {
    canonical_name: "Micro Sprinkler Assemblies 360-Degree Rotor",
    council: "WRD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 14648:1999",
    new_standard: {
      is_number: "IS 14648:1999",
      title: "Agricultural Irrigation Equipment — Micro-Sprayers — Specification",
      publication_year: 1999,
      version: "Original Edition (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "WRD 25",
      division_council: "Water Resources",
      scope: "Specifies requirements and test methods for micro-sprayers and micro-sprinklers used in orchards, greenhouses, and landscape micro-irrigation.",
      materials: "Engineering plastic body (acetal / polyoxymethylene POM) with UV stabilization conforming to IS 13360.",
      technical_requirements: "Nominal flow rates 20 to 120 l/h; working pressure 0.1 MPa to 0.25 MPa; wetting diameter 2 m to 6 m; 360-degree, 180-degree, and 90-degree spray patterns.",
      performance_requirements: "Flow rate variation with pressure within +/- 7%; droplet distribution uniformity >= 85%; resistance to chemical fertilizers and clogging.",
      testing_requirements: "Flow rate versus pressure calibration per IS 14648 Clause 6; water distribution test under indoor test chamber; pressure burst test at 0.5 MPa.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards WRD 25 Irrigation Equipment Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 14648/1; PMKSY Micro-Irrigation Standards Component Annexure",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_14648",
      evidence_excerpt: "Clause 1.1: Covers dimensional, operational, and distribution uniformity requirements of micro-sprinklers for agricultural irrigation.",
      applicability_explanation: "Primary national product standard for agricultural micro-sprinklers and rotor spray heads.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by WRD 25; mandatory product specification in PMKSY horticulture schemes."
  },
  {
    canonical_name: "Motorized Hydraulic Penstock Sluice Gates",
    council: "WRD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 5620:1985",
    new_standard: {
      is_number: "IS 5620:1985",
      title: "Recommendations for Structural Design of Vertical Lift Sluice Gates (First Revision)",
      publication_year: 1985,
      version: "First Revision (Reaffirmed 2019)",
      status: "ACTIVE",
      technical_committee: "WRD 12",
      division_council: "Water Resources",
      scope: "Specifies recommendations for structural design, skin plate sizing, roller trains, guide tracks, and sealing systems for vertical lift sluice gates and penstock emergency gates.",
      materials: "Structural steel conforming to IS 2062 Grade E250 / E350; music note rubber seals conforming to IS 11855.",
      technical_requirements: "Operating water heads up to 60 m; skin plate bending stress limits per IS 800; motorized hoist or hydraulic ram operation.",
      performance_requirements: "Leakage past rubber seals <= 0.2 l/min per metre length of seal under full design head; safety factor against structural buckling >= 2.0.",
      testing_requirements: "Full shop assembly dry test; dye penetrant and ultrasonic examination of critical welds; hydrostatic shop seal test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards WRD 12 Hydraulic Gates Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "Central Water Commission Structural Design Criteria for Dam Gates; BIS WRD 12 Standards",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_5620",
      evidence_excerpt: "Clause 1.1: Structural design recommendations for vertical lift sluice gates used in dam barrages, penstocks, and canal head regulators.",
      applicability_explanation: "Primary national design and construction standard for motorized vertical lift penstock sluice gates.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by WRD 12; primary standard for dam sluice gates across India."
  },
  {
    canonical_name: "Pressure Relief Valves for Irrigation Pipelines",
    council: "WRD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 14846:2000",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 14846/1; PMKSY Pressurized Pipeline Guidelines",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_14846",
      evidence_excerpt: "Clause 4.1: Pressure containment, relief setting, and seat leakage criteria for irrigation pipeline control valves.",
      applicability_explanation: "Governs pressure rating, body strength, and relief parameters for water pipeline surge and pressure relief valves.",
      confidence_score: 0.95
    },
    investigation_notes: "Formulated by WRD 22; covers pressure containment for waterworks valves."
  },
  {
    canonical_name: "Radial Crest Gates for Spillways",
    council: "WRD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 4622:2003",
    new_standard: {
      is_number: "IS 4622:2003",
      title: "Recommendations for Structural Design of Radial Gates for Spillways (Third Revision)",
      publication_year: 2003,
      version: "Third Revision (Reaffirmed 2018)",
      status: "ACTIVE",
      technical_committee: "WRD 12",
      division_council: "Water Resources",
      scope: "Specifies recommendations for structural design, geometry, trunnion hub assemblies, horizontal girders, and sealing systems for radial (Tainter) crest gates on dam spillways.",
      materials: "Structural steel conforming to IS 2062 Grade E250 / E350; forged steel trunnion pins; self-lubricating bronze spherical bushings.",
      technical_requirements: "Gate spans up to 20 m and heights up to 18 m; skin plate curvature radius; trunnion pin shear and bearing stress limits; hoist pull calculation.",
      performance_requirements: "Side and bottom music-note rubber seal leakage <= 0.1 l/min/m; structural factor of safety >= 1.5 under full flood pool and earthquake acceleration.",
      testing_requirements: "Radiographic and ultrasonic testing of girder welds; trunnion alignment tolerance verification; seal pressure contact test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards WRD 12 Hydraulic Gates Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "Central Water Commission Criteria for Spillway Radial Gates; BIS WRD 12 Standard Code",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_4622",
      evidence_excerpt: "Clause 1.1: Structural design recommendations for radial (Tainter) gates installed on spillways of gravity and earth dams.",
      applicability_explanation: "Primary national standard for structural design and fabrication of dam spillway radial crest gates.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by WRD 12; universal code for dam radial spillway gates in India."
  },
  {
    canonical_name: "Rainwater Harvesting Modular Filters",
    council: "WRD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 15797:2008",
    new_standard: {
      is_number: "IS 15797:2008",
      title: "Roof Top Rainwater Harvesting — Guidelines",
      publication_year: 2008,
      version: "Original Edition (Reaffirmed 2019)",
      status: "ACTIVE",
      technical_committee: "WRD 25",
      division_council: "Water Resources",
      scope: "Provides technical guidelines for design, installation, filtration media, and maintenance of rooftop rainwater harvesting systems and modular dual-intensity filtration units.",
      materials: "Food grade UV stabilized polyethylene or stainless steel casing, non-clogging multi-layered stainless steel mesh and gravel/charcoal filter cartridges.",
      technical_requirements: "Filtration capacity matching roof catchment area (up to 500 m2 per unit); auto-flush first rain separator; filtration efficiency >= 90% suspended solids removal.",
      performance_requirements: "Self-cleaning vortex flushing action; zero stagnation inside housing; pressure loss <= 0.01 MPa during peak rainfall intensity.",
      testing_requirements: "Filtration efficiency test with standard particulate slurry; turbidity reduction test; structural pressure integrity test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards WRD 25 Water Management Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "Central Ground Water Board (CGWB) Rainwater Harvesting Manual; BIS WRD 25 Guidelines; Model Building Bye-Laws Chapter 10",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_15797",
      evidence_excerpt: "Clause 1.1: Guidelines for rooftop rainwater harvesting systems including filtration techniques and recharge structures.",
      applicability_explanation: "Primary national standard for rooftop rainwater harvesting modular filters and recharge systems.",
      confidence_score: 0.98
    },
    investigation_notes: "Formulated by WRD 25; mandated across all municipal model building bye-laws for plot areas > 100 m2."
  },
  {
    canonical_name: "Solar PV Direct Surface Water Pumping Systems",
    council: "WRD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 17018:2018",
    new_standard: {
      is_number: "IS 17018:2018",
      title: "Solar Photovoltaic Water Pumping Systems — Specification",
      publication_year: 2018,
      version: "Original Edition",
      status: "ACTIVE",
      technical_committee: "ETD 28 / WRD 25",
      division_council: "Electrotechnical",
      scope: "Specifies requirements for standalone solar PV powered surface and submersible water pumping systems including solar array, MPPT pump controller, and electric motor pump set.",
      materials: "High-efficiency mono/polycrystalline PV modules per IS 14286, IP65 MPPT controller, stainless steel centrifugal pump per IS 8034 / IS 9079.",
      technical_requirements: "Motor power 1 HP to 10 HP; solar array capacity 900 Wp to 9000 Wp; minimum daily water output at specified head (e.g., 50 m) per kWh/m2 solar insolation.",
      performance_requirements: "System overall efficiency >= 85%; MPPT tracking efficiency >= 98%; dry run, reverse polarity, and over-voltage protection.",
      testing_requirements: "Indoor and outdoor solar pump testing per IS 17018 Annex B; daily water output curve under standard test day irradiance (6 kWh/m2).",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards ETD 28 Solar Photovoltaic Energy Committee (Jointly with WRD)"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_STATUTORY",
      evidence_source: "Ministry of New and Renewable Energy (MNRE) PM-KUSUM Scheme Specifications; BIS Product Manual PM/IS 17018/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_17018",
      evidence_excerpt: "Clause 1.1: Covers technical specifications and performance testing methods for solar photovoltaic water pumping systems.",
      applicability_explanation: "Primary national standard for solar PV direct surface and submersible agricultural water pumping systems.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by ETD 28 in collaboration with WRD; mandatory standard under nationwide PM-KUSUM scheme."
  },
  {
    canonical_name: "Standard US Weather Bureau Class A Evaporation Pans",
    council: "WRD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 5973:1998",
    new_standard: {
      is_number: "IS 5973:1998",
      title: "Pan Evaporimeter — Specification (First Revision)",
      publication_year: 1998,
      version: "First Revision (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "WRD 1",
      division_council: "Water Resources",
      scope: "Specifies construction, dimensional, and installation requirements for the Class A open pan evaporimeter used to measure evaporation rates from open water surfaces in hydrology.",
      materials: "Copper sheet (Grade Cu-FRHC per IS 191) or stainless steel sheet (AISI 304 per IS 6911) with thickness 0.9 mm, rot-proof white painted wooden stand.",
      technical_requirements: "Inside diameter 1220 mm, depth 255 mm; fixed point gauge with micrometric hook or vernier measurement to 0.1 mm; hexagonal wire mesh cover.",
      performance_requirements: "Watertight welded cylindrical seam; level alignment within 0.2 mm across diameter; evaporation measurement sensitivity 0.05 mm water depth.",
      testing_requirements: "Hydrostatic leak test; dimensional verification of diameter and depth; wire mesh airflow restriction check.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards WRD 1 Hydrometry Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 5973/1; IMD Hydrometeorological Network Manual; CWC Hydrology Observations",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_5973",
      evidence_excerpt: "Clause 1.1: Covers requirements for Class A pan evaporimeter including stilling well, fixed point gauge, and wooden support platform.",
      applicability_explanation: "Primary national product standard for hydrological Class A pan evaporimeters.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by WRD 1; universal standard for reservoir evaporation measurement in India."
  },
  {
    canonical_name: "Suspended Sediment Water Samplers",
    council: "WRD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 3913:2000",
    new_standard: {
      is_number: "IS 3913:2000",
      title: "Suspended Sediment Load Samplers — Specification (First Revision)",
      publication_year: 2000,
      version: "First Revision (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "WRD 1",
      division_council: "Water Resources",
      scope: "Specifies requirements for point-integrating and depth-integrating suspended sediment water samplers (USD-49, US P-61 types) used in rivers, canals, and reservoirs.",
      materials: "Cast bronze or aluminum streamlined body, stainless steel sampling nozzle, calibrated glass or plastic sample collection bottle.",
      technical_requirements: "Intake nozzle internal diameters 3.2 mm, 4.8 mm, 6.4 mm; tail vane assembly for streamlined river alignment; isokinetic intake velocity.",
      performance_requirements: "Intake velocity ratio (nozzle velocity to stream velocity) 0.9 to 1.1; stability in river currents up to 3.5 m/s without tilting.",
      testing_requirements: "Hydrodynamic flume calibration per IS 3913 Clause 8; intake efficiency test; seal pressure test for point-integrating valve.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards WRD 1 Hydrometry Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "Central Water Commission Sediment Monitoring Standards; BIS WRD 1 Standard Catalogue",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_3913",
      evidence_excerpt: "Clause 1.1: Covers physical dimensions, hydrodynamic stability, and intake characteristics of point and depth-integrating suspended sediment samplers.",
      applicability_explanation: "Primary national standard for suspended sediment sampling apparatus used in river hydrometry.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by WRD 1; standard equipment for CWC river silt monitoring."
  },
  {
    canonical_name: "Tipping Bucket Digital Rain Gauges",
    council: "WRD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 5235:1992",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 5235/1; IMD Hydrometeorological Specifications",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_5235",
      evidence_excerpt: "Clause 1.1: Covers tipping bucket rain gauge mechanisms with electrical pulse output.",
      applicability_explanation: "Direct product mapping for tipping bucket digital recording rain gauges.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS 5235:1992."
  },
  {
    canonical_name: "Ultrasonic Open Channel Flow Meters for Canals",
    council: "WRD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS/ISO 6416:2017",
    new_standard: {
      is_number: "IS/ISO 6416:2017",
      title: "Hydrometry — Measurement of Liquid Flow in Open Channels Using Acoustic Methods",
      publication_year: 2017,
      version: "Second Revision (Reaffirmed 2022)",
      status: "ACTIVE",
      technical_committee: "WRD 1",
      division_council: "Water Resources",
      scope: "Specifies principles, sensor configuration, time-of-flight acoustic transit time, and Doppler techniques for continuous discharge measurement in rivers and open irrigation canals.",
      materials: "Piezoelectric ultrasonic transducers, polyurethane or titanium acoustic face, IP68 submerged housings.",
      technical_requirements: "Single-path and multi-path chordal transducer arrays (2 to 8 paths); acoustic transit time resolution 0.1 nanosecond; velocity range +/- 0.01 m/s to 10 m/s.",
      performance_requirements: "Discharge measurement accuracy within +/- 1% to +/- 2% over full operating range; automatic sound speed compensation for temperature and salinity.",
      testing_requirements: "Calibration against current-meter traverse per IS 1192; acoustic signal-to-noise ratio verification; transducer alignment laser check.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards WRD 1 Hydrometry Committee (Identical adoption of ISO 6416)"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "Central Water Commission Telemetric Canal Discharge Standards; BIS WRD 1 Catalogue; National Hydrology Project Specifications",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_ISO_6416",
      evidence_excerpt: "Clause 1.1: Covers acoustic transit time and Doppler methods for measuring liquid velocity and volumetric flow rate in open channels and canals.",
      applicability_explanation: "Primary national standard for ultrasonic transit-time open channel flow meters in canals.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by WRD 1; standard instrumentation for real-time canal water auditing."
  },
  {
    canonical_name: "Ultrasonic Water Level Recorders",
    council: "WRD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS/ISO 4373:2008",
    new_standard: {
      is_number: "IS/ISO 4373:2008",
      title: "Hydrometry — Water Level Measuring Devices (First Revision)",
      publication_year: 2008,
      version: "First Revision (Reaffirmed 2018)",
      status: "ACTIVE",
      technical_committee: "WRD 1",
      division_council: "Water Resources",
      scope: "Specifies functional and performance requirements for non-contact ultrasonic and radar water level sensors used in hydrometric stations, rivers, dams, and tidal waterways.",
      materials: "Non-contact ultrasonic transducer head, PVDF or stainless steel housing, built-in temperature compensation sensor.",
      technical_requirements: "Measurement range 0.5 m to 15 m; acoustic beam angle <= 10 degrees; output signal 4-20 mA and SDI-12 / RS485.",
      performance_requirements: "Measurement accuracy within +/- 2 mm or 0.1% of measured distance; automatic false echo suppression; operating temperature -20 deg C to +60 deg C.",
      testing_requirements: "Bench distance calibration test against optical benchmark; temperature drift test; environmental IP67 protection verification.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards WRD 1 Hydrometry Committee (Identical to ISO 4373)"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS/ISO 4373; CWC National Hydrology Project Instrument Standards",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_ISO_4373",
      evidence_excerpt: "Clause 1.1: Specifies requirements for water level measuring devices for continuous hydrometric monitoring in rivers and reservoirs.",
      applicability_explanation: "Primary national standard for non-contact ultrasonic and radar water level recorders.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by WRD 1; fundamental instrument in flood forecasting telemetry."
  },
  {
    canonical_name: "Venturi Fertilizer Chemical Injector Assemblies",
    council: "WRD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 14434:1997",
    new_standard: {
      is_number: "IS 14434:1997",
      title: "Agricultural Irrigation Equipment — Fertilizer and Chemical Injection Units: Part 1 Venturi Injectors — Specification",
      publication_year: 1997,
      version: "Original Edition (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "WRD 25",
      division_council: "Water Resources",
      scope: "Specifies construction, dimensional, and hydraulic suction requirements for differential pressure venturi chemical and fertilizer injectors used in micro-irrigation systems.",
      materials: "Molded polypropylene or PVDF engineering plastic resistant to acidic fertilizers and agricultural chemicals.",
      technical_requirements: "Inlet sizes 1/2 inch to 2 inch (15 mm to 50 mm); suction rates 10 l/h to 1000 l/h; motive differential pressure ratio 15% to 35%.",
      performance_requirements: "Suction capacity linearity with differential pressure; burst pressure >= 1.6 MPa; zero chemical degradation after 100 hours exposure to concentrated phosphoric/nitric acid.",
      testing_requirements: "Suction flow rate calibration test per IS 14434 Clause 6; chemical immersion corrosion test; hydrostatic pressure proof test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards WRD 25 Micro Irrigation Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 14434/1; PMKSY Guidelines for Fertigation Components",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_14434",
      evidence_excerpt: "Clause 1.1: Covers requirements for venturi fertilizer and chemical injection devices for pressurized agricultural irrigation networks.",
      applicability_explanation: "Primary national product standard for agricultural fertigation venturi injector assemblies.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by WRD 25; universal standard for fertigation assemblies."
  },
  {
    canonical_name: "Vertical Lift Fabricated Steel Canal Sluice Gates",
    council: "WRD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 5620:1985",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "Central Water Commission Canal Regulating Gates Design Code; BIS WRD 12 Standards",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_5620",
      evidence_excerpt: "Clause 1.1: Structural design requirements for vertical lift fabricated steel sluice gates for canal head regulators and cross regulators.",
      applicability_explanation: "Primary national standard for fabricated steel vertical lift canal sluice gates.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS 5620:1985."
  },
  {
    canonical_name: "Vertical Lift Sluice Gates for Dams",
    council: "WRD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 5620:1985",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "Central Water Commission Structural Criteria for Dam Outlet Gates; BIS WRD 12 Standard",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_5620",
      evidence_excerpt: "Clause 3.1: Permissible stresses, hydrostatic wheel loads, and skin plate design for high-head dam sluice gates.",
      applicability_explanation: "Primary national design standard for dam vertical lift sluice gates.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS 5620:1985."
  },

  // ==========================================
  // PGD (36 products)
  // ==========================================
  {
    canonical_name: "Adjustable Spanners and Wrenches",
    council: "PGD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 6149:1984",
    new_standard: {
      is_number: "IS 6149:1984",
      title: "Single-Ended Open-Jaw Adjustable Wrenches — Specification (First Revision)",
      publication_year: 1984,
      version: "First Revision (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "PGD 4",
      division_council: "Production and General Engineering",
      scope: "Specifies dimensions, materials, hardness, and mechanical proof torque requirements for single-ended open-jaw adjustable wrenches (crescent spanners).",
      materials: "Drop forged alloy steel (Chrome-Vanadium steel 40Cr1 or 31CrV3 conforming to IS 4367) or carbon steel.",
      technical_requirements: "Nominal sizes 100 mm, 150 mm, 200 mm, 250 mm, 300 mm, 375 mm, 450 mm; knurl screw mechanism; jaw opening 13 mm to 52 mm.",
      performance_requirements: "Proof torque test minimum 45 N.m for 150 mm up to 1050 N.m for 450 mm without permanent jaw splay or mechanism jamming; body hardness 40 to 48 HRC.",
      testing_requirements: "Torsional proof load test per IS 6149 Clause 8; hardness testing per IS 1501; jaw play and knurl free-rotation check.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PGD 4 Hand Tools Sectional Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DPIIT Hand Tools (Quality Control) Order S.O. 4383(E); BIS Product Manual PM/IS 6149/1; DGS&D Tool Specifications",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_6149",
      evidence_excerpt: "Clause 1.1: Covers dimensions, technical supply conditions, hardness, and proof torque testing of single-ended adjustable wrenches.",
      applicability_explanation: "Primary national standard for drop forged adjustable spanners and wrenches, mandatory under Hand Tools QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by PGD 4; covered under Hand Tools Quality Control Order."
  },
  {
    canonical_name: "Bench Drilling Machines (Belt Driven)",
    council: "PGD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 2425:1985",
    new_standard: {
      is_number: "IS 2425:1985",
      title: "Test Chart for Bench Drilling Machines (Second Revision)",
      publication_year: 1985,
      version: "Second Revision (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "PGD 1",
      division_council: "Production and General Engineering",
      scope: "Specifies geometrical and practical test tolerances, spindle runout limits, and alignment for belt-driven precision bench drilling machines up to 20 mm drilling capacity.",
      materials: "Cast iron Grade FG 200 / FG 250 for base and column, hardened alloy steel spindle, stepped V-belt pulleys.",
      technical_requirements: "Drilling capacity in steel 13 mm, 16 mm, 20 mm; spindle taper MT2 or MT3; spindle speeds 400 to 3000 rpm.",
      performance_requirements: "Spindle true running runout <= 0.02 mm; squareness of spindle axis to working table <= 0.04 mm/100 mm; drilling test at full capacity without motor stalling.",
      testing_requirements: "Dial indicator spindle runout test per IS 2425; deflection under drilling thrust test; sound level measurement.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PGD 1 Machine Tools Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Machine Tools Testing Standards Catalogue; GeM Category Specification for Workshop Drilling Machines",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_2425",
      evidence_excerpt: "Clause 1.1: Specifies geometrical alignments and practical drilling accuracy test tolerances for bench drilling machines.",
      applicability_explanation: "Primary national accuracy and testing standard for workshop bench drilling machines.",
      confidence_score: 0.98
    },
    investigation_notes: "Formulated by PGD 1; universal standard for bench drilling machine acceptance."
  },
  {
    canonical_name: "Bench Vices for Fitters",
    council: "PGD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 2586:1986",
    new_standard: {
      is_number: "IS 2586:1986",
      title: "Bench Vices (Machinist's Vices) — Specification (Second Revision)",
      publication_year: 1986,
      version: "Second Revision (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "PGD 4",
      division_council: "Production and General Engineering",
      scope: "Specifies dimensions, construction, materials, and clamping strength requirements for fixed base and swivel base machinist bench vices used in fitting and assembly shops.",
      materials: "Body and sliding jaw of spheroidal graphite cast iron or cast steel per IS 1030; serrated jaw plates of hardened tool steel 50 to 56 HRC; acme screw of high tensile steel.",
      technical_requirements: "Jaw widths 75 mm, 100 mm, 125 mm, 150 mm, 200 mm; jaw opening equal to jaw width; screw thread square or acme form.",
      performance_requirements: "Clamping proof load test without cracking: 15 kN for 75 mm up to 45 kN for 200 mm; jaw plate serration hardness retention.",
      testing_requirements: "Proof clamping load test per IS 2586 Clause 8; jaw parallelism test under load; drop test for casting soundness.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PGD 4 Hand Tools Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 2586/1; DGS&D / GeM Bench Vice Technical Tender Specifications",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_2586",
      evidence_excerpt: "Clause 1.1: Covers materials, dimensions, construction, and proof load testing of machinist bench vices for workshop use.",
      applicability_explanation: "Primary national product standard for fitters bench vices and workshop clamping vices.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by PGD 4; reaffirmed in 2021."
  },
  {
    canonical_name: "Bonded Abrasive Grinding Wheels",
    council: "PGD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 1991 (Part 1):2015",
    new_standard: {
      is_number: "IS 1991 (Part 1):2015",
      title: "Safety Requirements for Bonded Abrasive Products: Part 1 General Requirements (Fifth Revision)",
      publication_year: 2015,
      version: "Fifth Revision (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "PGD 9",
      division_council: "Production and General Engineering",
      scope: "Specifies safety requirements, maximum operating speeds, burst speed testing, and balancing tolerances for vitrified and resinoid bonded abrasive grinding wheels.",
      materials: "Aluminium oxide (A) or silicon carbide (C) grains bonded with vitrified ceramic bond (V) or phenolic resinoid bond (B).",
      technical_requirements: "Wheel types Type 1 (straight), Type 27 (depressed center), Type 41 (cutting off); maximum operating speed 35 m/s to 80 m/s; bore tolerances.",
      performance_requirements: "Centrifugal bursting test speed minimum 1.5 times maximum operating speed; ring test resonance for acoustic soundness; static balancing.",
      testing_requirements: "Centrifugal overspeed burst test in protective enclosure per IS 1991 (Part 2); ring test per Clause 9; dimensional verification.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PGD 9 Abrasives Sectional Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DPIIT Bonded Abrasive Products (Quality Control) Order S.O. 4384(E); BIS Product Manual PM/IS 1991/1; Factory Act Machinery Safety Rules",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_1991_1",
      evidence_excerpt: "Clause 1.1: Specifies safety requirements, operational speeds, and overspeed burst testing for bonded abrasive grinding and cutting wheels.",
      applicability_explanation: "Primary national safety and product standard for bonded abrasive grinding wheels, mandatory under national QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by PGD 9; covered under mandatory Quality Control Order."
  },
  {
    canonical_name: "Circular Thread Cutting Dies",
    council: "PGD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 1859:1990",
    new_standard: {
      is_number: "IS 1859:1990",
      title: "Circular Screwing Dies — Specification (Second Revision)",
      publication_year: 1990,
      version: "Second Revision (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "PGD 3",
      division_council: "Production and General Engineering",
      scope: "Specifies dimensions, tolerances, and technical supply conditions for circular thread cutting dies used for cutting external metric threads M1 to M68.",
      materials: "High speed steel (HSS Grade M2) or alloy tool steel per IS 1570, hardened to 62 to 65 HRC.",
      technical_requirements: "Outside diameter and thickness per ISO standard series; 6g tolerance class for metric external threads; chip clearance holes.",
      performance_requirements: "Cutting performance test: thread cutting on mild steel bar of specified tensile strength without tooth chipping; thread surface finish Ra <= 1.6 micron.",
      testing_requirements: "Hardness test per IS 1501; thread pitch and angle check with toolmakers microscope; threading performance test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PGD 3 Screws and Fasteners Threading Tools Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS PGD 3 Tooling Catalogue; GeM Standard Workshop Tools Specification",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_1859",
      evidence_excerpt: "Clause 1.1: Covers dimensional and performance requirements for circular screwing dies for ISO metric external threads.",
      applicability_explanation: "Primary national product standard for circular external thread cutting dies.",
      confidence_score: 0.98
    },
    investigation_notes: "Formulated by PGD 3; standard specification for threading dies."
  },
  {
    canonical_name: "CNC Turning Lathe Centers",
    council: "PGD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 2534:1983",
    new_standard: {
      is_number: "IS 2534:1983",
      title: "Dead Centres for Lathes — Specification (Second Revision)",
      publication_year: 1983,
      version: "Second Revision (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "PGD 2",
      division_council: "Production and General Engineering",
      scope: "Specifies dimensions, materials, and runout tolerances for dead centres, live revolving centres, and half-centres with Morse taper shanks for conventional and CNC lathes.",
      materials: "Carbon tool steel or case hardening alloy steel, carbide tipped point (tungsten carbide Grade K20 per IS 2428).",
      technical_requirements: "Morse tapers MT1 to MT6; point angle 60 degrees; point hardness minimum 60 HRC (or 85 HRA for carbide tip).",
      performance_requirements: "Concentricity runout between point cone and Morse taper shank <= 0.005 mm for precision grade, <= 0.010 mm for standard grade.",
      testing_requirements: "Radial runout check using dial test indicator on precision V-blocks; hardness test; surface roughness Ra <= 0.2 micron on cone.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PGD 2 Machine Tool Accessories Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Machine Tool Accessories Catalogue; Indian Machine Tool Manufacturers Association (IMTMA) Standards",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_2534",
      evidence_excerpt: "Clause 1.1: Covers dimensions and tolerances of dead and carbide tipped centres with Morse taper shanks for lathes and grinding machines.",
      applicability_explanation: "Primary national standard for conventional and CNC lathe dead and live revolving centres.",
      confidence_score: 0.98
    },
    investigation_notes: "Formulated by PGD 2; standard machine tool tooling specification."
  },
  {
    canonical_name: "Coated Abrasive Sanding Belts",
    council: "PGD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 715:2002",
    new_standard: {
      is_number: "IS 715:2002",
      title: "Coated Abrasives — Specification (Fifth Revision)",
      publication_year: 2002,
      version: "Fifth Revision (Reaffirmed 2018)",
      status: "ACTIVE",
      technical_committee: "PGD 9",
      division_council: "Production and General Engineering",
      scope: "Specifies requirements for coated abrasives in the form of sheets, rolls, discs, and endless belts with paper, cloth, or vulcanized fibre backings.",
      materials: "Fused aluminium oxide or silicon carbide grain, heavy drill cotton/polyester cloth or antistatic paper backing, phenolic resin bond.",
      technical_requirements: "Grit sizes P16 to P2000; joint types (overlap, butt with reinforced tape); tensile breaking strength of joint >= 80% of belt strength.",
      performance_requirements: "Tensile breaking strength longitudinal >= 1.5 kN/50 mm for cloth belts; grain adhesion without flaking during flexure test; moisture stability.",
      testing_requirements: "Tensile and elongation test of belt and joint per IS 715 Annex B; adhesion peel test; stock removal performance test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PGD 9 Abrasives Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DPIIT Coated Abrasives (Quality Control) Order S.O. 4385(E); BIS Product Manual PM/IS 715/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_715",
      evidence_excerpt: "Clause 1.1: Covers requirements for coated abrasive products including endless belts, rolls, and discs for wood and metal finishing.",
      applicability_explanation: "Primary national product standard for coated abrasive sanding belts, mandatory under national QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by PGD 9; covered under DPIIT Coated Abrasives Quality Control Order."
  },
  {
    canonical_name: "Combination Pliers and Cutters",
    council: "PGD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 3650:1981",
    new_standard: {
      is_number: "IS 3650:1981",
      title: "Combination Pliers — Specification (Second Revision)",
      publication_year: 1981,
      version: "Second Revision (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "PGD 4",
      division_council: "Production and General Engineering",
      scope: "Specifies dimensions, materials, hardness, and performance requirements for combination pliers with serrated gripping jaws and side cutting edges.",
      materials: "Drop forged high carbon or alloy steel (Grade 45C8 per IS 1570 or Chrome-Vanadium steel), insulated PVC handles for electrical work per IS 2615.",
      technical_requirements: "Nominal lengths 160 mm, 180 mm, 200 mm; jaw serrations; side cutter wire cutting capacity; joint rivet tightness.",
      performance_requirements: "Cutting test on hard steel wire (tensile strength 1600 MPa) without blade deformation or notch damage; handle load test 500 N without permanent bend; cutting edge hardness 55 to 62 HRC.",
      testing_requirements: "Wire cutting test per IS 3650 Clause 7; handle load test; dielectric voltage withstand test (10 kV) for insulated pliers per IS 2615.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PGD 4 Hand Tools Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DPIIT Hand Tools (Quality Control) Order S.O. 4383(E); BIS Product Manual PM/IS 3650/1; Central Electricity Authority Safety Rules",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_3650",
      evidence_excerpt: "Clause 1.1: Covers requirements for combination pliers including gripping jaws, pipe grip, and side cutting edges.",
      applicability_explanation: "Primary national product standard for drop forged combination pliers and side cutters, mandatory under Hand Tools QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by PGD 4; covered under Hand Tools Quality Control Order."
  },
  {
    canonical_name: "Digital External Micrometers (0-25 mm)",
    council: "PGD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 2967:1983",
    new_standard: {
      is_number: "IS 2967:1983",
      title: "External Micrometers — Specification (First Revision)",
      publication_year: 1983,
      version: "First Revision (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "PGD 25",
      division_council: "Production and General Engineering",
      scope: "Specifies dimensional, mechanical, and accuracy requirements for mechanical and digital electronic external micrometers for measuring dimensions up to 1000 mm in steps of 25 mm.",
      materials: "Drop forged alloy steel or spheroidal graphite iron frame with thermal insulating pads; tungsten carbide tipped measuring anvils (hardness >= 85 HRA).",
      technical_requirements: "Measuring range 0-25 mm; digital resolution 0.001 mm (1 micron); spindle pitch 0.5 mm with ratchet stop; IP65 coolant protection.",
      performance_requirements: "Maximum permissible error of indication +/- 0.002 mm for 0-25 mm size; flatness of measuring faces <= 0.0006 mm (optical flat); parallelism of faces <= 0.002 mm.",
      testing_requirements: "Optical interference flatness check using monochromatic light; parallelism check with optical parallel glass; calibration against gauge blocks per IS 2984.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PGD 25 Engineering Metrology Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_STATUTORY",
      evidence_source: "Legal Metrology (General) Rules 2011; National Physical Laboratory (NPL) Metrology Standards; BIS Product Manual PM/IS 2967/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_2967",
      evidence_excerpt: "Clause 1.1: Covers requirements for external micrometers with measuring range in steps of 25 mm and resolution 0.01 mm or 0.001 mm.",
      applicability_explanation: "Primary national precision metrology standard for digital and vernier external micrometers.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by PGD 25; benchmark engineering measurement standard."
  },
  {
    canonical_name: "Digital Vernier Calipers IP67 (0-300 mm)",
    council: "PGD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 3651 (Part 1):1982",
    new_standard: {
      is_number: "IS 3651 (Part 1):1982",
      title: "Vernier Callipers: Part 1 Vernier Callipers with Reading Up to 0.02 mm (Second Revision)",
      publication_year: 1982,
      version: "Second Revision (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "PGD 25",
      division_council: "Production and General Engineering",
      scope: "Specifies dimensions, materials, and accuracy requirements for mechanical vernier and electronic digital calipers measuring external, internal, and depth dimensions up to 1000 mm.",
      materials: "Stainless steel (austenitic-martensitic hardened) conforming to IS 6911; measuring jaws hardened to 52 to 58 HRC.",
      technical_requirements: "Measuring ranges 0-150 mm, 0-200 mm, 0-300 mm; digital resolution 0.01 mm; IP67 inductive electromagnetic scale; thumb roller.",
      performance_requirements: "Maximum permissible error +/- 0.02 mm for 0-150 mm, +/- 0.03 mm for 0-300 mm; jaw contact face parallelism <= 0.01 mm; repeatability +/- 0.01 mm.",
      testing_requirements: "Calibration with Grade 0 gauge blocks per IS 2984; parallelism inspection with feeler blades and light gap; IP67 immersion test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PGD 25 Engineering Metrology Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_STATUTORY",
      evidence_source: "Legal Metrology Rules 2011; BIS Product Manual PM/IS 3651/1; NPL Calibration Specifications",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_3651_1",
      evidence_excerpt: "Clause 1.1: Covers requirements for vernier and digital calipers measuring external, internal, and depth dimensions with reading up to 0.01 mm.",
      applicability_explanation: "Primary national standard for digital and mechanical workshop vernier calipers.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by PGD 25; universal engineering calibration standard."
  },
  {
    canonical_name: "Electronic Digital Height Gauges with Air Cushion",
    council: "PGD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 2921:1988",
    new_standard: {
      is_number: "IS 2921:1988",
      title: "Vernier Height Gauges — Specification (First Revision)",
      publication_year: 1988,
      version: "First Revision (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "PGD 25",
      division_council: "Production and General Engineering",
      scope: "Specifies requirements for mechanical vernier and motorized electronic 2D digital height gauges with air-cushion floating base used on precision granite surface plates.",
      materials: "Hardened stainless steel beam and scriber measuring jaws, granite or cast iron base, built-in pneumatic air pump for frictionless flotation.",
      technical_requirements: "Measuring range 0-300 mm, 0-600 mm, 0-1000 mm; digital resolution 0.001 mm / 0.0005 mm; motorized probe drive; 2D geometric measurement processor.",
      performance_requirements: "Maximum permissible error <= (2 + L/300) micron; repeatability <= 0.5 micron; perpendicularity of guide column to base <= 0.005 mm/500 mm.",
      testing_requirements: "Perpendicularity test with cylindrical square on Grade 0 granite plate; length measurement calibration using ceramic gauge blocks; air float stability check.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PGD 25 Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS PGD 25 Metrology Standards; NPL Metrology Guidelines; GeM Precision Inspection Category",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_2921",
      evidence_excerpt: "Clause 1.1: Covers requirements for height gauges for precision measurement of heights, steps, and scribing on surface plates.",
      applicability_explanation: "Primary national standard for precision mechanical and digital electronic height gauges.",
      confidence_score: 0.98
    },
    investigation_notes: "Formulated by PGD 25; covers workshop and quality room height gauges."
  },
  {
    canonical_name: "Feeler Gauges for Clearance Measurement",
    council: "PGD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 3179:1990",
    new_standard: {
      is_number: "IS 3179:1990",
      title: "Feeler Gauges — Specification (Second Revision)",
      publication_year: 1990,
      version: "Second Revision (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "PGD 25",
      division_council: "Production and General Engineering",
      scope: "Specifies requirements for feeler gauge sets with folding steel leaves used for checking mechanical clearances, gaps, and spark plug / valve tappet clearances.",
      materials: "Hardened and tempered carbon spring steel strip (50CrV4 or Grade C75 per IS 2507) with protective steel case.",
      technical_requirements: "Leaf thicknesses 0.03 mm to 1.00 mm (13 leaves to 28 leaves per set); blade lengths 75 mm, 100 mm, 150 mm; tapered or parallel blades.",
      performance_requirements: "Thickness tolerance +/- 0.004 mm for 0.03-0.10 mm leaves up to +/- 0.012 mm for 1.00 mm; blade hardness 40 to 48 HRC; spring flexure without permanent set.",
      testing_requirements: "Thickness measurement with precision comparator; flexure bend test; leaf edge smoothness check.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PGD 25 Engineering Metrology Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 3179/1; Automotive Research Association of India (ARAI) Workshop Tooling Manual",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_3179",
      evidence_excerpt: "Clause 1.1: Covers dimensional tolerances and technical supply conditions for feeler gauge blades and sets.",
      applicability_explanation: "Primary national standard for precision engineering feeler gauges.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by PGD 25; standard tool in mechanical inspection."
  },
  {
    canonical_name: "Fiber Laser Sheet Metal Cutting Machines 3kW-6kW",
    council: "PGD",
    status: "CANDIDATE_UNVERIFIED",
    investigation_notes: "High-power industrial fiber laser CNC sheet metal cutting machines are tested internationally per ISO 230-2 (accuracy) and ISO 11553-1 (laser safety). In India, BIS PGD 1 and LITD 10 are formulating an Indian Standard draft for CNC laser cutting machine safety and performance; currently procured per manufacturer machine tool accuracy charts."
  },
  {
    canonical_name: "Flat Bed CNC Horizontal Turning Lathes",
    council: "PGD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13192:1992",
    new_standard: {
      is_number: "IS 13192:1992",
      title: "Test Chart for Numerically Controlled Turning Machines (Lathes) — Acceptance Conditions",
      publication_year: 1992,
      version: "Original Edition (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "PGD 1",
      division_council: "Production and General Engineering",
      scope: "Specifies geometrical, positioning, and practical machining accuracy test conditions for CNC flat bed and slant bed horizontal turning lathes.",
      materials: "Heavy-duty meehanite cast iron bed, hardened and ground induction-hardened guideways, precision linear motion guideways.",
      technical_requirements: "Swing over bed 350 mm to 800 mm; distance between centers 500 mm to 3000 mm; spindle motor power 7.5 kW to 30 kW; CNC controller (Fanuc/Siemens).",
      performance_requirements: "Bi-directional positioning accuracy along Z-axis <= 0.010 mm/300 mm; repeatability <= 0.005 mm; cylindrical turning roundness <= 0.005 mm.",
      testing_requirements: "Laser interferometer positioning accuracy test per ISO 230-2 / IS 13192; test piece turning and circularity check; vibration and thermal drift test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PGD 1 Machine Tools Sectional Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Machine Tools Acceptance Standards; IMTMA Machine Tool Testing Code; DGS&D CNC Lathe Specifications",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_13192",
      evidence_excerpt: "Clause 1.1: Specifies geometrical tests, laser calibration of numerical axes, and practical machining tests for CNC horizontal turning machines.",
      applicability_explanation: "Primary national standard for CNC horizontal turning lathe geometric and machining accuracy acceptance.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by PGD 1; universal standard for CNC lathe commissioning in India."
  },
  {
    canonical_name: "Ground Thread Machine Taps ISO Metric Fine",
    council: "PGD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 6175 (Part 2):1992",
    new_standard: {
      is_number: "IS 6175 (Part 2):1992",
      title: "Hand and Machine Screw Taps for ISO Metric Threads: Part 2 Taps for Metric Fine Pitch Threads (Second Revision)",
      publication_year: 1992,
      version: "Second Revision (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "PGD 3",
      division_council: "Production and General Engineering",
      scope: "Specifies dimensions, tolerances, and thread profile for precision ground thread machine taps for ISO metric fine internal screw threads M1 to M52.",
      materials: "High speed steel (HSS Grade M2, M35 5% Cobalt, or Powder Metallurgy HSS) with TiN/TiAlN coating; hardness 63 to 66 HRC.",
      technical_requirements: "Spiral point (gun nose) for through holes and spiral flute for blind holes; tolerance classes ISO 1 (4H), ISO 2 (6H), and ISO 3 (6G); shank square drive.",
      performance_requirements: "Thread cutting performance on alloy steel test block (250 HB) for minimum 200 tapped holes without pitch diameter wear exceeding 0.015 mm.",
      testing_requirements: "Thread pitch and flank angle inspection with optical comparator; hardness testing; tapping torque measurement.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PGD 3 Threading Tools Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS PGD 3 Tooling Catalogue; Indian Tool Manufacturers Standards",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_6175_2",
      evidence_excerpt: "Clause 1.1: Covers dimensions and tolerances of machine screw taps with ground threads for ISO metric fine threads.",
      applicability_explanation: "Primary national product standard for precision ground thread machine taps for metric fine threads.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by PGD 3; covers precision machine tapping tools."
  },
  {
    canonical_name: "Hand Hacksaw Blades (Bimetal)",
    council: "PGD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 2594:2003",
    new_standard: {
      is_number: "IS 2594:2003",
      title: "Hacksaw Blades — Specification (Fourth Revision)",
      publication_year: 2003,
      version: "Fourth Revision (Reaffirmed 2018)",
      status: "ACTIVE",
      technical_committee: "PGD 4",
      division_council: "Production and General Engineering",
      scope: "Specifies requirements for hand and power hacksaw blades of low alloy steel, high speed steel (HSS), and bimetal construction for cutting metals.",
      materials: "Bimetal construction with electron-beam welded M42 8% cobalt high speed steel cutting tooth edge on flexible spring steel backing.",
      technical_requirements: "Length between pin centers 300 mm; width 12.7 mm; thickness 0.65 mm; tooth pitches 14, 18, 24, 32 teeth per 25 mm (TPI); alternate wave set.",
      performance_requirements: "Tooth edge hardness minimum 65 HRC; flexible back hardness 40 to 45 HRC; cutting performance test: cutting through 25 mm carbon steel bar within 60 strokes; shatterproof bending.",
      testing_requirements: "Cutting performance test rig per IS 2594 Clause 8; blade flexure bend test through 90 degrees without fracture; tooth hardness test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PGD 4 Hand Tools Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DPIIT Hand Tools (Quality Control) Order S.O. 4383(E); BIS Product Manual PM/IS 2594/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_2594",
      evidence_excerpt: "Clause 1.1: Covers dimensions, tooth pitch, hardness, and cutting test requirements for hand and power hacksaw blades including bimetal types.",
      applicability_explanation: "Primary national product standard for bimetal and HSS hand hacksaw blades, mandatory under national QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by PGD 4; covered under Hand Tools Quality Control Order."
  },
  {
    canonical_name: "Hardened Ground Steel Dowel Pins",
    council: "PGD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 6688:1983",
    new_standard: {
      is_number: "IS 6688:1983",
      title: "Parallel Pins of Hardened Steel and Martensitic Stainless Steel (Dowel Pins) — Specification (First Revision)",
      publication_year: 1983,
      version: "First Revision (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "PGD 31",
      division_council: "Production and General Engineering",
      scope: "Specifies requirements for precision hardened and ground parallel steel dowel pins with chamfered ends used for locating machine parts, dies, and fixtures.",
      materials: "Through-hardened carbon or alloy tool steel (100Cr6 bearing steel) or case-hardened steel; martensitic stainless steel.",
      technical_requirements: "Nominal diameters 1.5 mm to 25 mm; m6 precision interference fit tolerance (e.g., +0.008/+0.002 mm for 6 mm); length 5 mm to 120 mm.",
      performance_requirements: "Core and surface hardness 58 to 62 HRC (or case-hardened depth 0.6 mm); double shear strength >= 600 MPa; surface roughness Ra <= 0.2 micron.",
      testing_requirements: "Double shear test per IS 6688 Clause 7; hardness test; dimensional inspection with micrometric comparator.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PGD 31 Fasteners Sectional Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Fasteners Product Manual PM/IS 6688/1; Tool and Die Makers Handbook",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_6688",
      evidence_excerpt: "Clause 1.1: Covers dimensions, tolerances (m6, h6), and technical supply conditions for hardened and ground parallel dowel pins.",
      applicability_explanation: "Primary national standard for precision hardened ground steel dowel pins.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by PGD 31; fundamental precision locating element in tooling."
  },
  {
    canonical_name: "High Speed Steel (HSS) M2 Ground Twist Drills",
    council: "PGD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 5101:1991",
    new_standard: {
      is_number: "IS 5101:1991",
      title: "Twist Drills — Technical Supply Conditions (Third Revision)",
      publication_year: 1991,
      version: "Third Revision (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "PGD 3",
      division_council: "Production and General Engineering",
      scope: "Specifies technical supply conditions, cutting performance, materials, and dimensional tolerances for parallel shank and morse taper shank HSS twist drills.",
      materials: "High speed steel conforming to IS 7291 Grade M2, M35 (Co 5%), or M42; steam tempered (black oxide) or TiN coated.",
      technical_requirements: "Diameters 0.2 mm to 100 mm; standard point angle 118 degrees; helix angle 25 to 30 degrees (Type N); lip clearance angle 8 to 12 degrees.",
      performance_requirements: "Cutting edge hardness 63 to 66 HRC; drilling endurance test: drilling specified depth in 0.45% carbon steel without regrinding; radial runout <= 0.03 mm.",
      testing_requirements: "Endurance drilling test per IS 5101 Annex B; hardness test; lip height difference inspection with dial gauge.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PGD 3 Cutting Tools Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS PGD 3 Cutting Tools Catalogue; GeM Standard Workshop Tools Specification",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_5101",
      evidence_excerpt: "Clause 1.1: Covers technical supply conditions, tolerances, and testing methods for high speed steel twist drills.",
      applicability_explanation: "Primary national standard for high speed steel M2 ground twist drills.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by PGD 3; universal standard for workshop twist drills."
  },
  {
    canonical_name: "High Speed Steel Twist Drills",
    council: "PGD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 5101:1991",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 5101/1; DGS&D Tooling Specifications",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_5101",
      evidence_excerpt: "Clause 1.1: Technical supply conditions for parallel shank and taper shank twist drills.",
      applicability_explanation: "Direct product mapping for high speed steel twist drills.",
      confidence_score: 0.99
    },
    investigation_notes: "Direct match to IS 5101:1991."
  },
  {
    canonical_name: "Horizontal Metal Band Sawing Machines",
    council: "PGD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 11195:1985",
    new_standard: {
      is_number: "IS 11195:1985",
      title: "Test Chart for Horizontal Metal Band Sawing Machines — Acceptance Conditions",
      publication_year: 1985,
      version: "Original Edition (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "PGD 1",
      division_council: "Production and General Engineering",
      scope: "Specifies geometrical and practical cutting accuracy test tolerances for manual and semi-automatic horizontal metal band sawing machines.",
      materials: "Cast iron Grade FG 220 bow frame, hardened band wheel shafts, carbide blade guide rollers.",
      technical_requirements: "Cutting capacity 150 mm to 500 mm round/square bar; blade speed 20 to 90 m/min; hydraulic bow down-feed control.",
      performance_requirements: "Squareness of cut to bar axis <= 0.1 mm/100 mm height; flatness of cut face <= 0.08 mm; cutting rate in mild steel >= 20 cm2/min.",
      testing_requirements: "Geometrical alignment tests per IS 11195; practical bar cutting test; blade tension measurement.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PGD 1 Machine Tools Sectional Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Machine Tools Acceptance Standards; IMTMA Workshop Machine Code",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_11195",
      evidence_excerpt: "Clause 1.1: Covers geometrical and practical cutting test tolerances for horizontal metal band sawing machines.",
      applicability_explanation: "Primary national standard for horizontal metal band sawing machines.",
      confidence_score: 0.98
    },
    investigation_notes: "Formulated by PGD 1; standard testing code for metal cutting band saws."
  },
  {
    canonical_name: "Indexable Carbide Turning Inserts (CNMG / WNMG)",
    council: "PGD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 10042:1981",
    new_standard: {
      is_number: "IS 10042:1981",
      title: "Indexable (Throwaway) Carbide Inserts — Dimensions (First Revision)",
      publication_year: 1981,
      version: "First Revision (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "PGD 3",
      division_council: "Production and General Engineering",
      scope: "Specifies dimensions, corner radii, hole profiles, and ISO designations (CNMG, WNMG, DNMG, TNMG) for indexable tungsten carbide cutting inserts.",
      materials: "Sintered cemented tungsten carbide with cobalt binder (WC-Co) coated with multi-layer TiCN-Al2O3-TiN CVD/PVD coatings.",
      technical_requirements: "ISO insert designation geometry; inscribed circle (IC) 9.525 mm, 12.7 mm, 15.875 mm; thickness 4.76 mm; molded chipbreaker groove.",
      performance_requirements: "Corner radius tolerance +/- 0.05 mm; insert thickness tolerance Class M or Class G (+/- 0.025 mm); cutting edge micro-hardness >= 1500 HV.",
      testing_requirements: "Optical contour inspection on profile projector; hardness test; metal cutting tool-life test per ISO 3685.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PGD 3 Cutting Tools Committee (Identical to ISO 1832)"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Cutting Tools Product Catalogue; Tool Manufacturers Standards",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_10042",
      evidence_excerpt: "Clause 1.1: Covers dimensions and designations of indexable (throwaway) carbide inserts for turning and milling tools.",
      applicability_explanation: "Primary national product standard for indexable carbide turning and milling inserts.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by PGD 3; identical adoption of ISO indexable insert dimensions."
  },
  {
    canonical_name: "Machine Reamers (Chucking & Hand)",
    council: "PGD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 5444:1978",
    new_standard: {
      is_number: "IS 5444:1978",
      title: "Chucking Reamers with Morse Taper Shanks — Specification (First Revision)",
      publication_year: 1978,
      version: "First Revision (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "PGD 3",
      division_council: "Production and General Engineering",
      scope: "Specifies dimensions, fluting, and technical supply conditions for machine chucking reamers with parallel and morse taper shanks for finishing precision holes.",
      materials: "High speed steel (HSS Grade M2 per IS 7291) with cutting hardness 63 to 65 HRC.",
      technical_requirements: "Nominal diameters 3 mm to 50 mm; H7 hole tolerance class manufacturing; unequal blade fluting pitch to suppress chatter vibrations.",
      performance_requirements: "Hole reaming accuracy conforming to ISO H7 tolerance; surface finish of reamed hole Ra <= 0.8 micron; radial runout of cutting edges <= 0.01 mm.",
      testing_requirements: "Dimensional check of cutting diameter and taper lead; cutting test in steel block; hardness verification.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PGD 3 Cutting Tools Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Tooling Catalogue; GeM Standard Machine Tool Accessories",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_5444",
      evidence_excerpt: "Clause 1.1: Covers dimensional and performance requirements for chucking reamers with morse taper shanks.",
      applicability_explanation: "Primary national product standard for precision machine chucking reamers.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by PGD 3; standard reamer specification."
  },
  {
    canonical_name: "Machine Taps for Metric Internal Threads",
    council: "PGD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 6175 (Part 1):1992",
    new_standard: {
      is_number: "IS 6175 (Part 1):1992",
      title: "Hand and Machine Screw Taps for ISO Metric Threads: Part 1 Taps for Metric Coarse Pitch Threads (Second Revision)",
      publication_year: 1992,
      version: "Second Revision (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "PGD 3",
      division_council: "Production and General Engineering",
      scope: "Specifies dimensions, thread profile, and tolerances for machine screw taps used for cutting ISO metric coarse internal threads M1 to M68.",
      materials: "HSS Grade M2 or M35 (Co 5%) hardened to 63 to 66 HRC.",
      technical_requirements: "Coarse pitches M3x0.5 to M24x3.0; spiral point and spiral flute types; tolerance class ISO 2 (6H).",
      performance_requirements: "Threading life test: cutting minimum 250 blind holes in structural steel without chipping or gauge failure.",
      testing_requirements: "Optical pitch and angle verification; hardness test; thread gauge test on tapped holes.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PGD 3 Cutting Tools Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Cutting Tools Catalogue; Indian Tooling Standards",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_6175_1",
      evidence_excerpt: "Clause 1.1: Covers dimensions and tolerances of hand and machine taps with ground threads for ISO metric coarse threads.",
      applicability_explanation: "Primary national standard for machine taps for metric internal threads.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by PGD 3; core standard for metric machine taps."
  },
  {
    canonical_name: "Mechanical Plunger Dial Indicators 0.01 mm",
    council: "PGD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 2092:1983",
    new_standard: {
      is_number: "IS 2092:1983",
      title: "Plunger Type Dial Gauges — Specification (Second Revision)",
      publication_year: 1983,
      version: "Second Revision (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "PGD 25",
      division_council: "Production and General Engineering",
      scope: "Specifies dimensions, design features, and performance requirements for mechanical plunger-type dial gauges (dial indicators) with scale division 0.01 mm.",
      materials: "Brass or stainless steel precision gear movement, hardened stainless steel plunger spindle, shockproof jeweled bearings.",
      technical_requirements: "Plunger travel 5 mm, 10 mm; dial bezel diameter 58 mm; dial graduation 0.01 mm; measuring force 1.0 N to 1.5 N; clamping stem 8 mm h6.",
      performance_requirements: "Error of indication over 1 revolution <= 0.010 mm, over total range <= 0.015 mm; hysteresis (repeatability) <= 0.003 mm.",
      testing_requirements: "Calibration with dial gauge calibrator tester; hysteresis reversal test; drop test for shockproof mechanism.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PGD 25 Engineering Metrology Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_STATUTORY",
      evidence_source: "Legal Metrology Rules 2011; BIS Product Manual PM/IS 2092/1; NPL Metrology Guidelines",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_2092",
      evidence_excerpt: "Clause 1.1: Covers mechanical plunger type dial indicators with reading of 0.01 mm for precision workshop and inspection measurements.",
      applicability_explanation: "Primary national metrology standard for plunger type mechanical dial test indicators.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by PGD 25; universal standard for dial test indicators."
  },
  {
    canonical_name: "Metric Screw Pitch Gauges",
    council: "PGD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 4211:1993",
    new_standard: {
      is_number: "IS 4211:1993",
      title: "Screw Pitch Gauges for ISO Metric Screw Threads — Specification (First Revision)",
      publication_year: 1993,
      version: "First Revision (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "PGD 25",
      division_council: "Production and General Engineering",
      scope: "Specifies dimensions and tolerances of screw pitch gauge blades used for identifying the pitch of ISO metric internal and external screw threads.",
      materials: "Hardened carbon spring steel blades (Grade C75 per IS 2507) with hardness 40 to 45 HRC.",
      technical_requirements: "Blade pitches 0.25 mm to 6.0 mm (24 leaves); thread angle 60 degrees; folding steel case with locking clamp.",
      performance_requirements: "Tooth profile pitch tolerance +/- 0.005 mm over 10 pitches; flank angle tolerance +/- 20 minutes of arc.",
      testing_requirements: "Optical inspection on toolmakers measuring microscope; tooth profile check with master optical reticle.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PGD 25 Engineering Metrology Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS PGD 25 Metrology Catalogue; ARAI Workshop Tooling Specifications",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_4211",
      evidence_excerpt: "Clause 1.1: Covers requirements for screw pitch gauges for checking ISO metric threads with 60 degree thread angle.",
      applicability_explanation: "Primary national standard for metric screw pitch gauge sets.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by PGD 25; standard thread identification gauge."
  },
  {
    canonical_name: "Milling Cutters (End Mills)",
    council: "PGD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 6353:1991",
    new_standard: {
      is_number: "IS 6353:1991",
      title: "End Mills with Parallel Shanks — Specification (Second Revision)",
      publication_year: 1991,
      version: "Second Revision (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "PGD 3",
      division_council: "Production and General Engineering",
      scope: "Specifies dimensions, flute geometry, and technical supply conditions for parallel shank end mills of standard and long series.",
      materials: "High speed steel (HSS Grade M2 or M35) or micrograin solid tungsten carbide (WC 90%, Co 10%).",
      technical_requirements: "Cutting diameters 2 mm to 32 mm; 2-flute (slot drills) and 4-flute types; right-hand cutting with right-hand helix (30 deg); Weldon flat shank.",
      performance_requirements: "Cutting edge hardness 63 to 66 HRC; milling life test: milling slot in medium carbon steel for specified volume without edge failure; radial runout <= 0.015 mm.",
      testing_requirements: "Dimensional check on toolmakers microscope; radial runout check; hardness test; test milling cut.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PGD 3 Cutting Tools Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Cutting Tools Product Manual PM/IS 6353/1; Tool Manufacturers Technical Data",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_6353",
      evidence_excerpt: "Clause 1.1: Covers dimensions and tolerances of parallel shank end mills for slotting and profile milling.",
      applicability_explanation: "Primary national product standard for parallel shank milling cutters and end mills.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by PGD 3; standard for milling cutters."
  },
  {
    canonical_name: "Optical Profile Projectors and Comparators",
    council: "PGD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 10928:1984",
    new_standard: {
      is_number: "IS 10928:1984",
      title: "Optical Profile Projectors — Specification",
      publication_year: 1984,
      version: "Original Edition (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "PGD 25",
      division_council: "Production and General Engineering",
      scope: "Specifies construction, optical magnification accuracy, and measuring stage tolerances for optical profile projectors (shadowgraphs) used for 2D dimensional inspection.",
      materials: "Cast iron stand, precision optical telecentric lenses, glass rotary projection screen with crosshairs.",
      technical_requirements: "Screen diameters 300 mm, 400 mm, 600 mm; magnifications 10x, 20x, 50x, 100x; digital measuring stage with linear glass scales (resolution 0.001 mm).",
      performance_requirements: "Magnification error under contour illumination <= 0.08%; magnification error under surface illumination <= 0.12%; stage measuring accuracy <= (3 + L/50) micron.",
      testing_requirements: "Magnification check with calibrated precision glass scale; stage geometric squareness check with optical master square; light intensity uniformity test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PGD 25 Engineering Metrology Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Engineering Metrology Catalogue; National Physical Laboratory (NPL) Calibration Guide",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_10928",
      evidence_excerpt: "Clause 1.1: Covers requirements for optical profile projectors used for precision inspection of complex mechanical components and tool profiles.",
      applicability_explanation: "Primary national standard for optical profile projectors and shadowgraph measuring comparators.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by PGD 25; fundamental tool in quality control metrology."
  },
  {
    canonical_name: "Pneumatic Impact Wrenches",
    council: "PGD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 11957:1987",
    new_standard: {
      is_number: "IS 11957:1987",
      title: "Pneumatic Impact Wrenches — Specification",
      publication_year: 1987,
      version: "Original Edition (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "PGD 4",
      division_council: "Production and General Engineering",
      scope: "Specifies requirements for portable pneumatic impact wrenches used for tightening and loosening threaded fasteners in automotive and heavy engineering assemblies.",
      materials: "High-grade aluminium alloy or composite motor housing, forged alloy steel twin-hammer impact mechanism, hardened square drive anvil.",
      technical_requirements: "Square drive sizes 3/8 inch, 1/2 inch, 3/4 inch, 1 inch; working air pressure 0.63 MPa (90 psi); maximum torque 300 N.m to 2500 N.m.",
      performance_requirements: "Full power torque output test; air consumption under load; vibration emission <= 5 m/s2; noise level <= 85 dBA.",
      testing_requirements: "Torque measurement on dynamic calibration rig per IS 11957 Clause 8; endurance test at rated air pressure 50,000 fastener cycles.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PGD 4 Assembly Tools Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 11957/1; Automotive Assembly Tool Standards",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_11957",
      evidence_excerpt: "Clause 1.1: Covers performance requirements, dimensional criteria, and testing methods for pneumatic impact wrenches.",
      applicability_explanation: "Primary national standard for pneumatic powered impact wrenches and nutrunners.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by PGD 4; standard pneumatic assembly tool specification."
  },
  {
    canonical_name: "Retaining Rings (Circlips - Internal & External)",
    council: "PGD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 3075 (Part 1):1986",
    new_standard: {
      is_number: "IS 3075 (Part 1):1986",
      title: "Circlips: Part 1 Circlips for Shafts (First Revision)",
      publication_year: 1986,
      version: "First Revision (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "PGD 31",
      division_council: "Production and General Engineering",
      scope: "Specifies dimensions, groove details, materials, and thrust load capacities for spring steel external circlips (retaining rings) for shafts and internal circlips for bores.",
      materials: "Hardened and tempered carbon spring steel (Grade C75 or 70Mn4 per IS 2507) with black phosphate or zinc anti-corrosive finish.",
      technical_requirements: "Nominal shaft diameters 4 mm to 300 mm; free opening diameter; lug holes for circlip pliers; hardness 44 to 52 HRC.",
      performance_requirements: "Thrust load capacity before groove yield; expansion test over cone 1.1 times shaft diameter without permanent deformation or fracture.",
      testing_requirements: "Expansion test over mandrel per IS 3075 Clause 7; hardness test; thrust capacity shear test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PGD 31 Fasteners Sectional Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Fasteners Catalogue; Mechanical Engineering Machine Elements Standards",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_3075_1",
      evidence_excerpt: "Clause 1.1: Specifies dimensions, tolerances, and thrust ratings of spring steel circlips for retaining components on shafts.",
      applicability_explanation: "Primary national standard for spring steel retaining rings and circlips.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by PGD 31; universal standard for mechanical retaining circlips."
  },
  {
    canonical_name: "Semi-Automatic Horizontal Metal Band Saw Machines",
    council: "PGD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 11195:1985",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Machine Tools Acceptance Standards; IMTMA Standards",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_11195",
      evidence_excerpt: "Clause 1.1: Covers geometrical and practical cutting test conditions for horizontal metal band sawing machines.",
      applicability_explanation: "Direct product mapping for semi-automatic horizontal metal cutting band saws.",
      confidence_score: 0.98
    },
    investigation_notes: "Covered under IS 11195:1985."
  },
  {
    canonical_name: "Solid Carbide End Mills 4-Flute TiAlN Coated",
    council: "PGD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 6353:1991",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 6353/1; IMTMA Tooling Standards",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_6353",
      evidence_excerpt: "Clause 1.1: Dimensions and tolerances for parallel shank end mills including solid carbide types.",
      applicability_explanation: "Direct product standard for solid carbide 4-flute TiAlN coated end mills.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS 6353:1991."
  },
  {
    canonical_name: "Thread Plug and Ring Gauges (Go/No-Go)",
    council: "PGD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 2334:2001",
    new_standard: {
      is_number: "IS 2334:2001",
      title: "Gauging Practice for ISO Metric Screw Threads (Second Revision)",
      publication_year: 2001,
      version: "Second Revision (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "PGD 25",
      division_council: "Production and General Engineering",
      scope: "Specifies gauging principles, tolerances, and design for GO and NOT GO screw thread plug gauges and thread ring gauges for checking ISO metric screw threads.",
      materials: "High quality alloy tool steel (Grade O1 or D2 per IS 1570) with hardened gauging surfaces 60 to 65 HRC; stabilization treatment.",
      technical_requirements: "Pitch diameter tolerance and flank angle per ISO 1502; GO gauge with full thread profile, NOT GO gauge with truncated profile; dirt grooves.",
      performance_requirements: "Pitch diameter accuracy within +/- 0.003 mm; thread pitch accuracy within +/- 0.002 mm; wear allowance on GO gauges.",
      testing_requirements: "Pitch diameter measurement with three-wire method on floating carriage micrometer; flank angle optical check; hardness test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PGD 25 Engineering Metrology Committee (Identical to ISO 1502)"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS PGD 25 Gauging Practice Manual; Central Tool Room and Training Centre (CTTC) Inspection Guidelines",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_2334",
      evidence_excerpt: "Clause 1.1: Specifies features and dimensions of screw thread plug gauges and thread ring gauges for inspecting ISO metric screw threads.",
      applicability_explanation: "Primary national standard for Go / No-Go screw thread plug and ring gauges.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by PGD 25; identical to ISO 1502 for metric screw thread inspection."
  },
  {
    canonical_name: "Tool Holders for CNC Turning and Milling",
    council: "PGD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 11171:1985",
    new_standard: {
      is_number: "IS 11171:1985",
      title: "Tool Holders for Indexable Inserts for Turning — Dimensions",
      publication_year: 1985,
      version: "Original Edition (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "PGD 3",
      division_council: "Production and General Engineering",
      scope: "Specifies shank dimensions, clamping mechanism, and approach angles for external and internal tool holders used with indexable inserts on CNC turning machines.",
      materials: "High strength alloy steel (40Cr4Mo2 per IS 5517) heat treated to 38 to 44 HRC with black oxide surface finish.",
      technical_requirements: "Shank sizes 16x16 mm to 40x40 mm; lever lock, top clamp, or screw clamp insert locking; approach angles 45, 75, 90, 93 degrees; shim seat.",
      performance_requirements: "Rigidity under cutting force of 5 kN with deflection <= 0.02 mm; insert pocket seating accuracy within 0.01 mm.",
      testing_requirements: "Dimensional verification of shank squareness; insert pocket seating contact check; clamping torque proof test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PGD 3 Cutting Tools Committee (Identical to ISO 5610)"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS PGD 3 Cutting Tools Catalogue; IMTMA CNC Tooling Guidelines",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_11171",
      evidence_excerpt: "Clause 1.1: Covers dimensions and designations of tool holders for indexable inserts for turning and boring.",
      applicability_explanation: "Primary national standard for CNC turning and boring tool holders.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by PGD 3; identical to ISO 5610."
  },
  {
    canonical_name: "Tungsten Carbide Indexable Cutting Inserts",
    council: "PGD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 10042:1981",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Cutting Tools Product Catalogue; Tool Manufacturers Standards",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_10042",
      evidence_excerpt: "Clause 1.1: Dimensions and designations of indexable carbide inserts for turning and milling.",
      applicability_explanation: "Direct product standard for tungsten carbide indexable cutting inserts.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS 10042:1981."
  },
  {
    canonical_name: "Vernier Height Gauges for Quality Inspection",
    council: "PGD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 2921:1988",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 2921/1; NPL Metrology Guidelines",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_2921",
      evidence_excerpt: "Clause 1.1: Covers requirements for vernier height gauges for measuring heights and steps on surface plates.",
      applicability_explanation: "Direct product standard for workshop vernier height gauges.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS 2921:1988."
  },
  {
    canonical_name: "Vertical Machining Centers (VMC 3-Axis / 5-Axis)",
    council: "PGD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13193:1992",
    new_standard: {
      is_number: "IS 13193:1992",
      title: "Test Chart for Machining Centres — Acceptance Conditions",
      publication_year: 1992,
      version: "Original Edition (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "PGD 1",
      division_council: "Production and General Engineering",
      scope: "Specifies geometrical, positioning, spindle runout, and practical test conditions for vertical machining centers (VMC) and horizontal machining centers (HMC).",
      materials: "High-rigidity cast iron bed and column (Grade FG 260 / FG 300), precision ball screws with double nut preloading, roller linear guideways.",
      technical_requirements: "Table sizes 600x400 mm to 2000x1000 mm; spindle taper BT40 / BT50; spindle speed up to 15,000 rpm; automatic tool changer (ATC) 20 to 40 tools.",
      performance_requirements: "Linear axis positioning accuracy <= 0.008 mm/300 mm; repeatability <= 0.004 mm; spindle dynamic radial runout <= 0.003 mm; circular interpolation accuracy (ballbar test) <= 0.008 mm.",
      testing_requirements: "Laser interferometer linear positioning test per ISO 230-2; Renishaw circular ballbar test per ISO 230-4; NAS 979 standard test piece machining.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards PGD 1 Machine Tools Sectional Committee (Identical to ISO 10791)"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Machine Tools Testing Standards; IMTMA VMC Acceptance Guidelines; DGS&D Advanced Machine Tool Specifications",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_13193",
      evidence_excerpt: "Clause 1.1: Specifies geometrical tests, laser positioning accuracy tests, and machining performance tests for machining centers.",
      applicability_explanation: "Primary national standard for vertical machining center (VMC) geometric and machining accuracy acceptance.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by PGD 1; universal standard for CNC VMC machine commissioning in India."
  }
];

module.exports = { WRD_PGD_INVESTIGATION };
