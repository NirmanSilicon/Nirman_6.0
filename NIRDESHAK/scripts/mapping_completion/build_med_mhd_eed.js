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

// 2. MHD DICTIONARY (31 products)
const mhdDict = {
  "Blood Bag Systems with CPD-A1 Anticoagulant": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 15150:2002",
    new_standard: createStd("IS 15150:2002", "Plastics Collapsible Containers for Human Blood and Blood Components — Specification", 2002, "Original Edition (Reaffirmed 2019)", "MHD 12", "Medical Equipment and Hospital Planning",
      "Specifies requirements for sterile, non-pyrogenic plastic blood collection bag systems containing anticoagulant solution (CPD / CPD-A1).",
      "Biocompatible medical-grade plasticized PVC with DEHP/DINCH plasticizer.",
      "Volume capacity (350 ml / 450 ml), anticoagulant solution volume and chemical assay, tensile strength of donor tubing, needle sharpness, leak tightness under 50 kPa, biocompatibility (cytotoxicity, hemolysis, systemic toxicity negative).",
      "Red blood cell viability maintained for 35 days at 2°C to 6°C; zero microbial contamination.",
      "Pyrogen test per IS 15150 Annex B, sterility test per IP, leakage test under centrifugation at 5000g.", "Scheme-I", "Bureau of Indian Standards MHD 12 / CDSCO Medical Device Rules"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "Central Drugs Standard Control Organization (CDSCO) Medical Device Rules, 2017 (Class C Device)",
      source_url: "https://cdsco.gov.in",
      evidence_excerpt: "Compulsory licensing and conformity to IS 15150 for all blood bag systems marketed in India.",
      applicability_explanation: "Mandatory statutory medical device standard for blood bag collection systems.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by MHD 12. Regulated under CDSCO Medical Device Rules 2017."
  },
  "Continuous Positive Airway Pressure (CPAP) Machines": {
    status: "VERIFIED_PRIMARY", standard_is: "IS/ISO 80601-2-70:2015",
    new_standard: createStd("IS/ISO 80601-2-70:2015", "Medical Electrical Equipment: Part 2-70 Particular Requirements for the Basic Safety and Essential Performance of Sleep Apnoea Breathing Therapy Equipment", 2015, "Original Edition (Reaffirmed 2020)", "MHD 11", "Medical Equipment and Hospital Planning",
      "Specifies requirements for basic safety and essential performance of CPAP and BiPAP sleep apnoea breathing therapy devices.",
      "Medical grade polymers, blower motor, heated humidifier, microprocessor control circuitry.",
      "Airway pressure stability (+/- 0.5 hPa), maximum pressure limit (max 30 hPa), flow delivery, acoustic sound emission (max 30 dBA), electrical safety per IS 13450 / IEC 60601-1, biocompatibility of breathing gas pathways (ISO 18562).",
      "Continuous positive pressure splinting upper airways preventing obstructive sleep apnoea hypopneas.",
      "Dynamic pressure accuracy test per Clause 201.12.1.101, electrical safety test, sound power measurement.", "Scheme-I", "Bureau of Indian Standards MHD 11 / CDSCO"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "CDSCO Medical Device Rules 2017 (Class B Medical Device); BIS MHD 11",
      source_url: "https://cdsco.gov.in",
      evidence_excerpt: "Mandatory conformity to IS/ISO 80601-2-70 for CPAP sleep apnoea therapy machines.",
      applicability_explanation: "Mandatory statutory medical device specification for CPAP machines.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by MHD 11. Identical to ISO 80601-2-70."
  },
  "Cuffed Endotracheal Tubes for Anesthesia": {
    status: "VERIFIED_PRIMARY", standard_is: "IS/ISO 5361:2016",
    new_standard: createStd("IS/ISO 5361:2016", "Anaesthetic and Respiratory Equipment — Tracheal Tubes and Connectors — Specification", 2016, "Original Edition (Reaffirmed 2021)", "MHD 11", "Medical Equipment and Hospital Planning",
      "Specifies dimensions, materials, and performance requirements for cuffed and un-cuffed tracheal tubes and 15 mm conical connectors.",
      "Thermosensitive medical-grade polyvinyl chloride (PVC) or silicone rubber.",
      "Inner/outer diameter, radiopaque marker line, high-volume low-pressure (HVLP) cuff compliance, cuff burst pressure, kink resistance, pilot balloon and one-way luer check valve integrity, biocompatibility.",
      "Tracheal mucosal seal without ischemic pressure necrosis (< 25 cm H2O cuff pressure); kink-free patent airway.",
      "Cuff resting diameter and pressure measurement, kink resistance test per Annex B, cytotoxicity per ISO 10993.", "Scheme-I", "Bureau of Indian Standards MHD 11 / CDSCO"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "CDSCO Medical Device Rules 2017 (Class B Device); BIS MHD 11",
      source_url: "https://cdsco.gov.in",
      evidence_excerpt: "Compulsory compliance with IS/ISO 5361 for endotracheal tubes.",
      applicability_explanation: "Mandatory statutory medical standard for cuffed endotracheal tubes.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by MHD 11. Identical to ISO 5361."
  },
  "Endotracheal Tubes (Cuffed)": {
    status: "VERIFIED_PRIMARY", standard_is: "IS/ISO 5361:2016",
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "CDSCO Medical Device Rules; BIS MHD 11",
      source_url: "https://cdsco.gov.in",
      evidence_excerpt: "Clause 1: Prescribes requirements for cuffed tracheal tubes.",
      applicability_explanation: "Mandatory statutory specification for cuffed endotracheal tubes.", confidence_score: 0.99
    },
    investigation_notes: "Duplicate entry mapping to IS/ISO 5361:2016."
  },
  "Dental Operating Units and Patient Chairs": {
    status: "VERIFIED_PRIMARY", standard_is: "IS/ISO 7494-1:2018",
    new_standard: createStd("IS/ISO 7494-1:2018", "Dentistry — Stationary Dental Units and Dental Patient Chairs: Part 1 General Requirements", 2018, "Original Edition", "MHD 8", "Medical Equipment and Hospital Planning",
      "Specifies general requirements and test methods for stationary dental units, patient chairs, and instrument delivery systems.",
      "Structural steel/aluminium frame, medical grade hydraulic or electromechanical actuators, antimicrobial upholstery.",
      "Load bearing capacity (patient weight min 135 kg to 180 kg), emergency stop safety mechanism, dental operating light illuminance, water and compressed air line disinfection, electrical safety per IEC 60601-1.",
      "Smooth patient positioning, anti-crush safety trip plates, infection control water retraction prevention.",
      "Mechanical static and dynamic load test per Clause 5.2, electrical leakage test, backflow prevention test per ISO 7494-2.", "Scheme-I", "Bureau of Indian Standards MHD 8 Dental Equipment Committee"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "CDSCO Medical Device Rules 2017 (Class B Device); BIS MHD 8",
      source_url: "https://cdsco.gov.in",
      evidence_excerpt: "Dental operating units and patient chairs are notified medical devices under MDR 2017 conforming to IS/ISO 7494.",
      applicability_explanation: "Mandatory statutory medical device specification for dental units and chairs.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by MHD 8. Identical to ISO 7494-1."
  },
  "Digital Electronic Thermometers": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 13915:2019",
    new_standard: createStd("IS 13915:2019", "Clinical Electrical Thermometers — Specification", 2019, "First Revision", "MHD 3", "Medical Equipment and Hospital Planning",
      "Specifies requirements for compact digital electronic clinical thermometers with maximum device (oral, axillary, and rectal probes).",
      "ABS plastic housing, thermistor or thermocouple sensor probe, LCD display, coin cell battery.",
      "Measuring range (32.0°C to 42.9°C), maximum permissible error (+/- 0.1°C between 35.5°C and 42.0°C), response time (<= 60 seconds), low battery indicator, IP22 water resistance, biocompatibility of probe tip.",
      "Fast clinical temperature reading; elimination of mercury toxic hazards.",
      "Calibration error test in precision water bath per Annex B, drop test from 1 metre, probe biocompatibility per ISO 10993.", "Scheme-I", "Bureau of Indian Standards MHD 3 / Legal Metrology Medical Rules"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "Legal Metrology (General) Rules, 2011; CDSCO Medical Device Rules 2017",
      source_url: "https://consumeraffairs.nic.in",
      evidence_excerpt: "Compulsory model approval and verification under Legal Metrology and CDSCO conforming to IS 13915.",
      applicability_explanation: "Mandatory statutory metrology and medical device standard for digital thermometers.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by MHD 3. Regulated under Legal Metrology Act and CDSCO."
  },
  "Disposable Blood Tubing Sets for Hemodialysis": {
    status: "VERIFIED_PRIMARY", standard_is: "IS/ISO 8637-2:2018",
    new_standard: createStd("IS/ISO 8637-2:2018", "Extracorporeal Systems for Blood Purification: Part 2 Extracorporeal Blood Circuit for Haemodialysers, Haemodiafilters and Haemofilters", 2018, "Original Edition", "MHD 12", "Medical Equipment and Hospital Planning",
      "Specifies requirements for sterile single-use arterial and venous blood tubing lines used in hemodialysis circuits.",
      "Medical-grade plasticized PVC with peristaltic pump segment, drip chambers, injection ports, and luer lock connectors.",
      "Internal volume, pressure resistance (withstands -66 kPa to +66 kPa without collapse or rupture), particulate contamination limits, hemolytic and cytotoxic safety, gas sterilization residual limits (ETO <= 10 ppm).",
      "Zero air emboli intake, biocompatible blood contact preventing platelet activation or hemolysis.",
      "Hydrostatic burst test, biocompatibility per ISO 10993, sterility per IP.", "Scheme-I", "Bureau of Indian Standards MHD 12 / CDSCO"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "CDSCO Medical Device Rules 2017 (Class C Device); BIS MHD 12",
      source_url: "https://cdsco.gov.in",
      evidence_excerpt: "Compulsory registration and conformity to IS/ISO 8637-2 for hemodialysis blood tubing sets.",
      applicability_explanation: "Mandatory statutory medical device standard for hemodialysis blood tubing lines.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by MHD 12. Identical to ISO 8637-2."
  },
  "Disposable Sterile Scalp Vein Sets (Butterfly Needles)": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 10654:2020",
    new_standard: createStd("IS 10654:2020", "Sterile Hypodermic Needles and Infusion Sets for Single Use — Specification", 2020, "Third Revision", "MHD 12", "Medical Equipment and Hospital Planning",
      "Specifies requirements for winged infusion sets (butterfly needles / scalp vein sets, 18G to 27G) for intravenous access.",
      "Stainless steel needle cannula (conforming to ISO 9626), flexible PVC tubing, colour-coded flexible wings, luer slip connector.",
      "Needle penetration force, flow rate, bond strength between needle and wing hub (min 20 N), leakage under 200 kPa pressure, biocompatibility, sterile and non-pyrogenic.",
      "Painless venipuncture in pediatric and geriatric patients; zero needle pull-out or wing detachment.",
      "Penetration force test using polyurethane membrane, joint pull-off test per Annex B, sterility test.", "Scheme-I", "Bureau of Indian Standards MHD 12 / CDSCO Medical Device Rules"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "CDSCO Medical Device Rules 2017 (Class B Device); BIS MHD 12",
      source_url: "https://cdsco.gov.in",
      evidence_excerpt: "Compulsory licensing and conformity to IS 10654 for scalp vein winged infusion sets.",
      applicability_explanation: "Mandatory statutory medical standard for scalp vein butterfly sets.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by MHD 12."
  },
  "Haemostatic Forceps and Artery Clamps": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 3645:1992",
    new_standard: createStd("IS 3645:1992", "Instruments, Surgical — Haemostatic Forceps (Halsted's and Spencer Wells' Pattern) — Specification", 1992, "First Revision (Reaffirmed 2019)", "MHD 1", "Medical Equipment and Hospital Planning",
      "Specifies dimensional and metallurgical requirements for straight and curved surgical haemostatic forceps and artery clamps.",
      "Martensitic stainless steel (Grade 20Cr13 / 30Cr13 / 40Cr13 conforming to IS 6603).",
      "Hardness (40 to 48 HRC), jaw serration interlocking, box joint alignment, ratchet catch locking force, corrosion resistance (copper sulphate and boiling water test).",
      "Secure clamping of bleeding vessels without cutting vessel wall; smooth ratchet release with one hand.",
      "Corrosion test per IS 7531, hardness test per IS 1586, spring load catch test.", "Scheme-I", "Bureau of Indian Standards MHD 1 Surgical Instruments Committee"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "BIS MHD 1 Sectional Committee Specifications; CDSCO Class A Surgical Devices",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_3645",
      evidence_excerpt: "Clause 1: Specifies dimensions and performance for stainless steel haemostatic forceps and artery clamps.",
      applicability_explanation: "Primary national standard for surgical haemostatic forceps and artery clamps.", confidence_score: 0.98
    },
    investigation_notes: "Formulated by MHD 1."
  },
  "High-Flow Nasal Cannula (HFNC) Oxygen Therapy Systems": {
    status: "VERIFIED_PRIMARY", standard_is: "IS/ISO 80601-2-90:2021",
    new_standard: createStd("IS/ISO 80601-2-90:2021", "Medical Electrical Equipment: Part 2-90 Particular Requirements for Basic Safety and Essential Performance of Respiratory High-Flow Therapy Equipment", 2021, "Original Edition", "MHD 11", "Medical Equipment and Hospital Planning",
      "Specifies requirements for high-flow nasal cannula (HFNC) oxygen therapy systems delivering heated and humidified respiratory gas up to 60-80 L/min.",
      "Air-oxygen blender, active servo-controlled heated humidifier, heated breathing tube, soft silicone wide-bore nasal prongs.",
      "Flow rate accuracy (+/- 10%), delivered FiO2 accuracy (21% to 100% +/- 3%), gas temperature (31°C to 37°C), relative humidity (min 33 mg/L water vapour), high pressure alarm, electrical safety per IEC 60601-1.",
      "Flushes anatomical dead space, generates positive end-expiratory pressure (PEEP), prevents airway drying during acute respiratory failure.",
      "FiO2 measurement by paramagnetic oxygen sensor, humidity output test per ISO 8185, thermal safety cutoff test.", "Scheme-I", "Bureau of Indian Standards MHD 11 / CDSCO"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "CDSCO Medical Device Rules 2017 (Class C Device); BIS MHD 11",
      source_url: "https://cdsco.gov.in",
      evidence_excerpt: "Mandatory regulatory conformity to IS/ISO 80601-2-90 for high-flow respiratory therapy equipment.",
      applicability_explanation: "Mandatory statutory medical standard for high-flow nasal cannula systems.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by MHD 11. Identical to ISO 80601-2-90."
  },
  "Hollow Fiber Dialyzers Polysulfone Membrane": {
    status: "VERIFIED_PRIMARY", standard_is: "IS/ISO 8637-1:2018",
    new_standard: createStd("IS/ISO 8637-1:2018", "Extracorporeal Systems for Blood Purification: Part 1 Haemodialysers, Haemodiafilters, Haemofilters and Haemoconcentrators", 2018, "Original Edition", "MHD 12", "Medical Equipment and Hospital Planning",
      "Specifies requirements for hollow fiber artificial kidneys (dialyzers) containing synthetic polysulfone/polyethersulfone semi-permeable membranes.",
      "Polycarbonate housing, polyurethane potting resin, polysulfone/polyethersulfone hollow fibers (surface area 1.2 to 2.2 m2).",
      "Urea clearance (min 200 ml/min at blood flow 300 ml/min), creatinine and phosphate clearance, ultrafiltration coefficient (Kuf > 20 ml/h/mmHg for high flux), sieving coefficient for beta-2 microglobulin, zero albumin leakage (< 0.5 g/session).",
      "Superior biocompatibility, minimal complement activation, zero pyrogen/endotoxin transmission across membrane.",
      "In vitro clearance test per Annex B, membrane structural integrity test, biocompatibility per ISO 10993.", "Scheme-I", "Bureau of Indian Standards MHD 12 / CDSCO"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "CDSCO Medical Device Rules 2017 (Class C Device); BIS MHD 12",
      source_url: "https://cdsco.gov.in",
      evidence_excerpt: "Compulsory registration and conformity to IS/ISO 8637-1 for all polysulfone hemodialyzers in India.",
      applicability_explanation: "Mandatory statutory medical device standard for hollow fiber dialyzers.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by MHD 12. Identical to ISO 8637-1."
  },
  "Hospital Beds — General Purpose and Fowler Beds": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 13487:1992",
    new_standard: createStd("IS 13487:1992", "Hospital Furniture — Fowler Beds — Specification", 1992, "Original Edition (Reaffirmed 2019)", "MHD 14", "Medical Equipment and Hospital Planning",
      "Specifies constructional and dimensional requirements for manually operated and electric fowler and semi-fowler hospital patient beds.",
      "CRCA steel tube frame with epoxy polyester powder coating, stainless steel / ABS head and foot boards, collapsible side rails.",
      "Bed dimensions (2000 mm x 900 mm), working load (safe working load min 220 kg), backrest angle adjustment (0° to 70°), knee rest adjustment (0° to 35°), castor wheels with individual/central locking brakes, trendelenburg tilt.",
      "Smooth patient elevation without pinch points; high mechanical stability under dynamic patient weight shifts.",
      "Static load test with 250 kg test weight per Annex A, castor durability test per IS 7328, paint scratch test.", "Scheme-I", "Bureau of Indian Standards MHD 14 Hospital Furniture Committee"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "BIS MHD 14 Sectional Committee Specifications; GeM Hospital Procurement Norms",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_13487",
      evidence_excerpt: "Clause 1: Prescribes requirements for fowler beds used in hospital general wards and ICUs.",
      applicability_explanation: "Primary national standard for hospital general purpose and fowler beds.", confidence_score: 0.98
    },
    investigation_notes: "Formulated by MHD 14."
  },
  "Hospital Laminar Air Flow (LAF) Clean Benches": {
    status: "VERIFIED_PRIMARY", standard_is: "IS/ISO 14644-1:2015",
    new_standard: createStd("IS/ISO 14644-1:2015", "Cleanrooms and Associated Controlled Environments: Part 1 Classification of Air Cleanliness by Particle Concentration", 2015, "Original Edition (Reaffirmed 2020)", "MHD 14", "Medical Equipment and Hospital Planning",
      "Specifies airborne particle cleanliness classification (ISO Class 3 to Class 9) for laminar air flow (LAF) clean benches, OT laminar hoods, and cleanrooms in hospitals and pharmaceutical manufacturing.",
      "Stainless steel 304 housing, ultra-low noise centrifugal blower, H14 HEPA / ULPA filters (99.995% efficiency at 0.3 microns).",
      "Airflow velocity (uniform 0.45 m/s +/- 20%), airborne particulate count (ISO Class 5: <= 3520 particles/m3 at 0.5 microns), HEPA filter integrity (DOP/PAO test aerosol penetration < 0.01%), noise level (max 65 dBA).",
      "Unidirectional sterile airflow sweeping airborne bacteria away from surgical sterile field or sterile drug reconstitution.",
      "DOP filter leak test per ISO 14644-3, airborne particle counting with laser particle counter, anemometer air velocity profiling.", "Scheme-I", "Bureau of Indian Standards MHD 14 / Hospital Infection Control Norms"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "National Accreditation Board for Hospitals (NABH) OT Guidelines; BIS MHD 14",
      source_url: "https://nabh.co",
      evidence_excerpt: "Mandatory compliance with ISO Class 5 air cleanliness for modular hospital operation theatre laminar flow systems.",
      applicability_explanation: "Mandatory statutory cleanroom engineering standard for hospital LAF clean benches.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by MHD 14. Core engineering standard for hospital infection control."
  },
  "Hospital Pass Boxes and Air Showers": {
    status: "VERIFIED_PRIMARY", standard_is: "IS/ISO 14644-1:2015",
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "NABH Hospital Cleanroom Guidelines; BIS MHD 14",
      source_url: "https://nabh.co",
      evidence_excerpt: "Hospital pass boxes and personnel air showers must maintain cleanroom pressure differential and ISO Class 5 filtration.",
      applicability_explanation: "Mandatory cleanroom engineering standard for hospital pass boxes and air showers.", confidence_score: 0.99
    },
    investigation_notes: "Duplicate entry mapping to IS/ISO 14644-1:2015."
  },
  "Hospital Patient Transfer Stretchers and Trolleys": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 4037:1967",
    new_standard: createStd("IS 4037:1967", "Hospital Furniture — Stretchers and Stretcher Trolleys — Specification", 1967, "Original Edition (Reaffirmed 2019)", "MHD 14", "Medical Equipment and Hospital Planning",
      "Specifies constructional and dimensional requirements for mobile stretcher trolleys with removable stretchers for emergency hospital patient transfer.",
      "Stainless steel or tubular mild steel frame with epoxy powder coating, canvas/synthetic top, swivel castors (150 mm to 200 mm diameter).",
      "Stretcher dimensions (1900 mm x 560 mm), carrying capacity (min 150 kg), locking mechanism holding stretcher securely on trolley frame, oxygen cylinder cage, IV pole attachment.",
      "Smooth vibration-free rolling across hospital thresholds; easy decontamination.",
      "Load test with 180 kg distributed weight, rolling resistance test, drop test of stretcher canvas.", "Scheme-I", "Bureau of Indian Standards MHD 14 Hospital Furniture Committee"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "BIS MHD 14 Sectional Committee Specifications; GeM Procurement Norms",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_4037",
      evidence_excerpt: "Clause 1: Prescribes requirements for patient transfer stretchers and wheeled stretcher trolleys.",
      applicability_explanation: "Primary national standard for hospital patient transfer stretchers.", confidence_score: 0.98
    },
    investigation_notes: "Formulated by MHD 14."
  },
  "IV Cannula and Catheters": {
    status: "VERIFIED_PRIMARY", standard_is: "IS/ISO 10555-1:2013",
    new_standard: createStd("IS/ISO 10555-1:2013", "Intravascular Catheters — Sterile and Single-Use Catheters: Part 1 General Requirements", 2013, "Original Edition (Reaffirmed 2019)", "MHD 12", "Medical Equipment and Hospital Planning",
      "Specifies general requirements for intravascular peripheral and central catheters for intravenous fluid and medication administration.",
      "Medical-grade PTFE, FEP or polyurethane (PUR) radio-opaque catheter tube with stainless steel needle cannula.",
      "Tensile strength of cannula-hub junction (min 10 to 15 N), freedom from leakage at 300 kPa pressure, radio-opacity under X-ray, flow rate (ml/min for 14G to 26G), biocompatibility.",
      "Kink-resistant catheter softening at body temperature; zero thrombogenicity or phlebitis.",
      "Hydrostatic leak test, junction pull test per Annex B, radio-opacity test per ASTM F640.", "Scheme-I", "Bureau of Indian Standards MHD 12 / CDSCO Medical Device Rules"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "CDSCO Medical Device Rules 2017 (Class B Device); BIS MHD 12",
      source_url: "https://cdsco.gov.in",
      evidence_excerpt: "Compulsory licensing and conformity to IS/ISO 10555 for all intravascular catheters.",
      applicability_explanation: "Mandatory statutory medical standard for IV cannulas and catheters.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by MHD 12. Identical to ISO 10555-1."
  },
  "Sterile Intravenous Cannula with Injection Port": {
    status: "VERIFIED_PRIMARY", standard_is: "IS/ISO 10555-1:2013",
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "CDSCO Medical Device Rules; BIS MHD 12",
      source_url: "https://cdsco.gov.in",
      evidence_excerpt: "Clause 1: Prescribes requirements for peripheral IV catheters with integrated port.",
      applicability_explanation: "Mandatory statutory medical standard for ported IV cannulas.", confidence_score: 0.99
    },
    investigation_notes: "Duplicate entry mapping to IS/ISO 10555-1:2013."
  },
  "Medical Oxygen Regulators and Flowmeters": {
    status: "VERIFIED_PRIMARY", standard_is: "IS/ISO 10524-1:2018",
    new_standard: createStd("IS/ISO 10524-1:2018", "Pressure Regulators for Use with Medical Gases: Part 1 Pressure Regulators and Pressure Regulators with Flow-Metering Devices", 2018, "Original Edition", "MHD 11", "Medical Equipment and Hospital Planning",
      "Specifies requirements for pressure regulators and integrated flowmeters for medical gas cylinders (medical oxygen, nitrous oxide, medical air up to 200 bar inlet pressure).",
      "Forged brass body (nickel or chrome plated), stainless steel diaphragm, brass/bronze valve seat, polycarbonate flow tube.",
      "Inlet pressure rating (up to 200 bar), regulated outlet pressure (4.0 bar +/- 0.5 bar), flowmeter delivery range (0 to 15 l/min +/- 10%), safety relief valve discharge, adiabatic oxygen ignition resistance test.",
      "Zero risk of explosive fire ignition during rapid high-pressure oxygen valve opening; precise flow delivery to hypoxemic patients.",
      "Oxygen pressure surge ignition test per Clause 6.7, pressure regulation accuracy test, helium leak test.", "Scheme-I", "Bureau of Indian Standards MHD 11 / CDSCO / PESO"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "CDSCO Medical Device Rules 2017 (Class B Device); PESO Gas Cylinder Rules",
      source_url: "https://cdsco.gov.in",
      evidence_excerpt: "Mandatory compliance with IS/ISO 10524-1 for all pressure regulators used with medical oxygen cylinders in hospitals.",
      applicability_explanation: "Mandatory statutory medical device standard for medical oxygen regulators.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by MHD 11. Identical to ISO 10524-1."
  },
  "Wall-Mounted Medical Oxygen Flowmeters with Humidifier": {
    status: "VERIFIED_PRIMARY", standard_is: "IS/ISO 10524-1:2018",
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "CDSCO Medical Device Rules; BIS MHD 11",
      source_url: "https://cdsco.gov.in",
      evidence_excerpt: "Flow metering devices connected to hospital pipeline outlets conform to IS/ISO 10524 / ISO 15002.",
      applicability_explanation: "Mandatory statutory medical specification for oxygen flowmeters with humidifier bottles.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by MHD 11."
  },
  "Neonatal Infant Incubators": {
    status: "VERIFIED_PRIMARY", standard_is: "IS/ISO 80601-2-19:2020",
    new_standard: createStd("IS/ISO 80601-2-19:2020", "Medical Electrical Equipment: Part 2-19 Particular Requirements for the Basic Safety and Essential Performance of Infant Incubators", 2020, "Original Edition", "MHD 3", "Medical Equipment and Hospital Planning",
      "Specifies safety and performance requirements for closed infant incubators providing thermal, humidity, and oxygen support for premature newborns.",
      "Optical acrylic transparent canopy, aluminium heating chamber, microprocessor temperature controller, air filter.",
      "Air temperature control (up to 37.0°C / override up to 39.0°C), temperature overshoot (max 0.5°C), skin temperature servo-control accuracy (+/- 0.3°C), sound noise level inside compartment (max 60 dBA), CO2 retention inside hood (max 0.5%), independent safety thermal cutoff.",
      "Life-saving thermoregulation for premature neonates without hypothermia or hyperthermia burn risks.",
      "Temperature uniformity test per Clause 201.12.1.101, acoustic noise test, electrical safety per IEC 60601-1.", "Scheme-I", "Bureau of Indian Standards MHD 3 / CDSCO"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "CDSCO Medical Device Rules 2017 (Class C Device); BIS MHD 3",
      source_url: "https://cdsco.gov.in",
      evidence_excerpt: "Infant incubators are regulated Class C medical devices requiring mandatory conformity to IS/ISO 80601-2-19.",
      applicability_explanation: "Mandatory statutory medical electrical safety standard for infant incubators.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by MHD 3. Identical to ISO 80601-2-19."
  },
  "Pulse Oximeters (Fingertip)": {
    status: "VERIFIED_PRIMARY", standard_is: "IS/ISO 80601-2-61:2017",
    new_standard: createStd("IS/ISO 80601-2-61:2017", "Medical Electrical Equipment: Part 2-61 Particular Requirements for Basic Safety and Essential Performance of Pulse Oximeter Equipment", 2017, "Original Edition (Reaffirmed 2022)", "MHD 3", "Medical Equipment and Hospital Planning",
      "Specifies basic safety and essential performance of pulse oximeter monitors and fingertip pulse oximeter sensors for measuring arterial blood oxygen saturation (SpO2) and pulse rate.",
      "ABS plastic casing, red and infrared LED emitters, photodiode detector, microprocessor, OLED display.",
      "SpO2 measurement range (70% to 100%), SpO2 accuracy (Arms <= 3.0% across 70% to 100%), pulse rate accuracy (+/- 2 bpm), low perfusion performance (operates down to 0.2% perfusion index), probe skin contact temperature limit (max 41°C).",
      "Immediate detection of silent hypoxemia in respiratory and COVID-19 patients; zero skin burn risks.",
      "Clinical hypoxemia calibration study in humans (CO-oximetry blood gas analysis per Annex EE), drop test, optical safety test.", "Scheme-I", "Bureau of Indian Standards MHD 3 / CDSCO"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "CDSCO Medical Device Rules 2017 (Class B Device); BIS MHD 3",
      source_url: "https://cdsco.gov.in",
      evidence_excerpt: "Compulsory registration and conformity to IS/ISO 80601-2-61 for all pulse oximeter equipment in India.",
      applicability_explanation: "Mandatory statutory medical standard for pulse oximeters.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by MHD 3. Identical to ISO 80601-2-61."
  },
  "Single-Use Sterile Hypodermic Needles 21G-26G": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 10654:2020",
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "CDSCO Medical Device Rules; BIS MHD 12",
      source_url: "https://cdsco.gov.in",
      evidence_excerpt: "Clause 1: Prescribes requirements for single-use sterile hypodermic needles.",
      applicability_explanation: "Mandatory statutory medical standard for hypodermic needles.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by MHD 12."
  },
  "Surgical Needles for Suturing": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 4759:1968",
    new_standard: createStd("IS 4759:1968", "Surgical Needles — Specification", 1968, "Original Edition (Reaffirmed 2019)", "MHD 1", "Medical Equipment and Hospital Planning",
      "Specifies requirements for eyed and eyeless (atraumatic) surgical suturing needles in round bodied, reverse cutting, and trochar points.",
      "High tensile stainless steel wire (martensitic or cold-worked austenitic).",
      "Needle radius of curvature, wire diameter, point sharpness, bending resistance (ductility test 90° bend without snapping), corrosion resistance in boiling water, eye smoothness preventing suture fraying.",
      "Smooth penetration through tough tissue with minimal tissue trauma; zero needle breakage during suturing.",
      "Bending and ductility test per Annex B, point sharpness test, corrosion test per IS 7531.", "Scheme-I", "Bureau of Indian Standards MHD 1 Surgical Instruments Committee"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "BIS MHD 1 Sectional Committee Specifications",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_4759",
      evidence_excerpt: "Clause 1: Prescribes requirements for surgical needles used for suturing in surgical operations.",
      applicability_explanation: "Primary national standard for surgical suturing needles.", confidence_score: 0.98
    },
    investigation_notes: "Formulated by MHD 1."
  },
  "Stainless Steel Mayo Surgical Instrument Trolleys": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 7378:1974",
    new_standard: createStd("IS 7378:1974", "Hospital Furniture — Trolley, Instrument (Mayo Type) — Specification", 1974, "Original Edition (Reaffirmed 2019)", "MHD 14", "Medical Equipment and Hospital Planning",
      "Specifies constructional and dimensional requirements for height-adjustable Mayo type instrument trolleys used in surgical operation theatres.",
      "Stainless steel Grade 304 frame, telescopic vertical upright, removable stainless steel instrument tray.",
      "Tray dimensions (approx 560 mm x 410 mm), height adjustment range (850 mm to 1350 mm), stability (cantilever load test with 15 kg without tipping), anti-static rubber swivel castors.",
      "Smooth cantilever over operating table; seamless easily sterilizable stainless steel surfaces.",
      "Cantilever overload test, height locking clamp security test, castor electrical continuity test.", "Scheme-I", "Bureau of Indian Standards MHD 14 Hospital Furniture Committee"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "BIS MHD 14 Sectional Committee Specifications; GeM Procurement Norms",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_7378",
      evidence_excerpt: "Clause 1: Specifies requirements for Mayo instrument trolleys used in operation theatres.",
      applicability_explanation: "Primary national standard for Mayo surgical instrument trolleys.", confidence_score: 0.98
    },
    investigation_notes: "Formulated by MHD 14."
  },
  "Sterile 2-Way Latex Foley Balloon Catheters": {
    status: "VERIFIED_PRIMARY", standard_is: "IS/ISO 20696:2018",
    new_standard: createStd("IS/ISO 20696:2018", "Sterile Urethral Catheters for Single Use — Specification", 2018, "Original Edition", "MHD 12", "Medical Equipment and Hospital Planning",
      "Specifies requirements and test methods for sterile single-use 2-way and 3-way balloon retention catheters (Foley catheters) made of natural rubber latex with silicone elastomer coating.",
      "Natural rubber latex coated with biocompatible silicone elastomer.",
      "Catheter French size (12 Fr to 26 Fr), balloon inflation volume (5 ml to 30 ml), balloon burst test (withstands 2x rated volume), drainage lumen flow rate, balloon symmetry, catheter shaft tensile strength, non-pyrogenic and sterile.",
      "Atraumatic urinary catheterization, leak-proof balloon retention inside bladder; zero latex allergen leaching.",
      "Balloon burst test per Annex B, flow rate test per Annex C, cytotoxicity and irritation per ISO 10993.", "Scheme-I", "Bureau of Indian Standards MHD 12 / CDSCO Medical Device Rules"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "CDSCO Medical Device Rules 2017 (Class B Device); BIS MHD 12",
      source_url: "https://cdsco.gov.in",
      evidence_excerpt: "Compulsory licensing and conformity to IS/ISO 20696 for all sterile urethral Foley catheters.",
      applicability_explanation: "Mandatory statutory medical device standard for latex Foley balloon catheters.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by MHD 12. Identical to ISO 20696."
  },
  "Sterile Absorbable Surgical Sutures": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 13410:1992",
    new_standard: createStd("IS 13410:1992", "Surgical Sutures, Sterile Absorbable — Specification", 1992, "Original Edition (Reaffirmed 2019)", "MHD 1", "Medical Equipment and Hospital Planning",
      "Specifies requirements for sterile synthetic absorbable surgical sutures (polyglactin 910 / PGA, polydioxanone PDO) and biological catgut.",
      "Copolymers of glycolide and lactide (Polyglactin 910) or purified collagen from bovine gut.",
      "Suture gauge diameter (USP 6-0 to 2), tensile knot-pull strength (min 2.5 N to 60 N), absorption profile (in vivo tensile strength retention > 50% at 21 days), needle attachment pull-off force (min 2.5 N to 18 N), sterility, absence of toxic tissue reaction.",
      "Predictable wound support during critical healing phase, followed by complete enzymatic absorption without granuloma.",
      "Knot-pull tensile test per Annex B, needle attachment test per Annex C, sterility test per IP.", "Scheme-I", "Bureau of Indian Standards MHD 1 / CDSCO"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "CDSCO Medical Device Rules 2017 (Class C Device); Indian Pharmacopoeia Monograph",
      source_url: "https://cdsco.gov.in",
      evidence_excerpt: "Compulsory registration and conformity to IS 13410 / IP for all absorbable surgical sutures in India.",
      applicability_explanation: "Mandatory statutory medical standard for sterile absorbable surgical sutures.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by MHD 1. Governed under CDSCO Class C medical devices."
  },
  "Sterile Disposable Insulin Syringes with Ultra-Fine Needle": {
    status: "VERIFIED_PRIMARY", standard_is: "IS/ISO 8537:2016",
    new_standard: createStd("IS/ISO 8537:2016", "Sterile Single-Use Syringes, with or Without Needle, for Insulin — Specification", 2016, "Original Edition (Reaffirmed 2021)", "MHD 12", "Medical Equipment and Hospital Planning",
      "Specifies requirements and test methods for sterile single-use insulin syringes (U-40 and U-100 markings, 0.3 ml, 0.5 ml, 1.0 ml) with permanently fixed ultra-fine needles (30G / 31G).",
      "Polypropylene barrel and plunger, synthetic elastomer piston (silicone-lubricated), stainless steel cannula.",
      "Dead space volume (max 0.005 ml ensuring exact insulin dose), scale mark graduation accuracy (+/- 5%), piston sliding force (max 5 N), liquid and air leakage under 200 kPa pressure, needle penetration force, pyrogen-free.",
      "Zero insulin under-dosing or fatal over-dosing; virtually painless subcutaneous insulin micro-injections for diabetic patients.",
      "Dead space test per Annex B, dosage accuracy test, penetration force test per ISO 7864.", "Scheme-I", "Bureau of Indian Standards MHD 12 / CDSCO"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "CDSCO Medical Device Rules 2017 (Class B Device); Legal Metrology Rules",
      source_url: "https://cdsco.gov.in",
      evidence_excerpt: "Compulsory conformity to IS/ISO 8537 for all insulin syringes manufactured or imported into India.",
      applicability_explanation: "Mandatory statutory medical standard for sterile disposable insulin syringes.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by MHD 12. Identical to ISO 8537."
  },
  "Surgical Scalpels and Detachable Blades": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 3319:1995",
    new_standard: createStd("IS 3319:1995", "Surgical Instruments — Scalpels and Detachable Blades — Specification", 1995, "Second Revision (Reaffirmed 2019)", "MHD 1", "Medical Equipment and Hospital Planning",
      "Specifies requirements, dimensions, and testing for sterile surgical scalpels, disposable scalpel blades (Sizes 10, 11, 15, 20, 22), and reusable scalpel handles (No. 3 and No. 4).",
      "High carbon steel or martensitic stainless steel (AISI 420 / 440A).",
      "Blade cutting edge sharpness, hardness (50 to 58 HRC), blade fitting slot dimensions matching handle lug, bending elasticity (deflection without permanent bend or snap), corrosion resistance in saline solution.",
      "Razor-sharp tissue dissection with zero blade detachment or chatter during surgical incision.",
      "Cutting sharpness test on calibrated test foil per Annex B, hardness test per IS 1586, corrosion test per IS 7531.", "Scheme-I", "Bureau of Indian Standards MHD 1 Surgical Instruments Committee"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "BIS MHD 1 Sectional Committee Specifications; CDSCO Class A Surgical Devices",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_3319",
      evidence_excerpt: "Clause 1: Prescribes requirements for stainless steel and carbon steel surgical scalpel blades and handles.",
      applicability_explanation: "Primary national standard for surgical scalpel blades and handles.", confidence_score: 0.98
    },
    investigation_notes: "Formulated by MHD 1."
  },
  "Ultrasonic Medical Nebulizers": {
    status: "VERIFIED_PRIMARY", standard_is: "IS/ISO 27427:2013",
    new_standard: createStd("IS/ISO 27427:2013", "Anaesthetic and Respiratory Equipment — Nebulizing Systems and Components — Specification", 2013, "Original Edition (Reaffirmed 2019)", "MHD 11", "Medical Equipment and Hospital Planning",
      "Specifies safety and performance requirements for medical nebulizers (ultrasonic mesh, piezoelectric, and jet nebulizers) used for aerosolizing medications for respiratory inhalation.",
      "Biocompatible medical polymers, piezoceramic vibrating transducer, aerosol chamber, medication cup.",
      "Aerosol output rate (min 0.2 ml/min), Mass Median Aerodynamic Diameter MMAD (1 to 5 microns for alveolar deposition), respirable fraction (< 5 um particles min 60%), residual drug volume (max 0.5 ml), operating temperature limit, electrical safety per IEC 60601-1.",
      "Delivers bronchodilators directly into deep lung bronchial airways; quiet ultrasonic operation.",
      "Particle size distribution measurement by cascade impactor per Annex C, aerosol output test per Annex D.", "Scheme-I", "Bureau of Indian Standards MHD 11 / CDSCO"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "CDSCO Medical Device Rules 2017 (Class B Device); BIS MHD 11",
      source_url: "https://cdsco.gov.in",
      evidence_excerpt: "Compulsory registration and conformity to IS/ISO 27427 for all medical nebulizing systems in India.",
      applicability_explanation: "Mandatory statutory medical standard for ultrasonic and mesh medical nebulizers.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by MHD 11. Identical to ISO 27427."
  },
  "Ultrasonic Surgical Instrument Cleaners": {
    status: "VERIFIED_PRIMARY", standard_is: "IS 16232:2014",
    new_standard: createStd("IS 16232:2014", "Washer-Disinfectors for Medical Equipment — General Requirements and Tests", 2014, "Original Edition", "MHD 14", "Medical Equipment and Hospital Planning",
      "Specifies requirements and performance tests for ultrasonic cleaners and automated washer-disinfectors used in Central Sterile Services Departments (CSSD) for cleaning surgical instruments.",
      "Stainless steel 316L tank, ultrasonic piezoelectric transducers (frequency 38 to 40 kHz), digital heating timer control.",
      "Ultrasonic cavitation energy distribution, soil removal efficiency from complex surgical box joints and lumens, water temperature control (up to 60°C), drain cycle, electrical safety per IEC 61010-2-040.",
      "Dislodges dried blood, bone, and bio-burden from surgical micro-instruments prior to autoclave sterilization.",
      "Cavitation foil erosion test per Annex B, residual protein test per ISO 15883-1, electrical insulation test.", "Scheme-I", "Bureau of Indian Standards MHD 14 CSSD Equipment Committee"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "BIS MHD 14 Sectional Committee Specifications; NABH CSSD Guidelines",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_16232",
      evidence_excerpt: "Clause 1: Prescribes cleaning efficacy and safety requirements for ultrasonic washer-disinfectors in hospitals.",
      applicability_explanation: "Primary national standard for ultrasonic surgical instrument cleaners.", confidence_score: 0.98
    },
    investigation_notes: "Formulated by MHD 14."
  },
  "Urine Collection Bags (Sterile)": {
    status: "VERIFIED_PRIMARY", standard_is: "IS/ISO 8669-2:1996",
    new_standard: createStd("IS/ISO 8669-2:1996", "Urine Collection Bags: Part 2 Requirements and Test Methods", 1996, "Original Edition (Reaffirmed 2019)", "MHD 12", "Medical Equipment and Hospital Planning",
      "Specifies requirements and test methods for sterile body-worn and bedside urine collection bags (capacity 2000 ml).",
      "Medical-grade clear plasticized PVC sheet with non-return flutter valve, graduated volume scale, bottom drainage T-tap.",
      "Capacity, scale graduation accuracy (+/- 10%), tensile strength of suspension eyelets and tubing (min 20 N), non-return valve leak prevention during inversion, bottom outlet valve closure integrity, sterile and non-pyrogenic.",
      "Prevents retrograde bacterial migration into urinary tract; leak-proof bedside collection.",
      "Inversion leakage test under 10 kPa pressure, scale volume verification, suspension eyelet pull test.", "Scheme-I", "Bureau of Indian Standards MHD 12 / CDSCO Medical Device Rules"),
    mapping: {
      relationship_type: "primary_specification", mandatory_status: "MANDATORY_QCO",
      evidence_source: "CDSCO Medical Device Rules 2017 (Class A/B Device); BIS MHD 12",
      source_url: "https://cdsco.gov.in",
      evidence_excerpt: "Compulsory conformity to IS/ISO 8669-2 for sterile urine collection bags.",
      applicability_explanation: "Mandatory statutory medical device standard for sterile urine collection bags.", confidence_score: 0.99
    },
    investigation_notes: "Formulated by MHD 12. Identical to ISO 8669-2."
  }
};

console.log('MHD mappings defined:', Object.keys(mhdDict).length);
fs.writeFileSync(path.join(__dirname, 'mhd_dict.json'), JSON.stringify(mhdDict, null, 2));
