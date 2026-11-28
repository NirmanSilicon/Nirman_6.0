/**
 * Investigation Registry: LITD (36 products) and ETD (49 products) - 85 products
 */

const LITD_ETD_INVESTIGATION = [
  // ==========================================
  // LITD (36 products)
  // ==========================================
  {
    canonical_name: "Biometric Fingerprint Scanners",
    council: "LITD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13252 (Part 1):2010",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_CRS",
      evidence_source: "MeitY Compulsory Registration Scheme (CRS) Order Phase II S.O. 2905(E); UIDAI Aadhaar Authentication Device Specifications",
      source_url: "https://www.meity.gov.in/esdm/standards",
      evidence_excerpt: "Schedule Entry: Optical and capacitive fingerprint scanners for biometric authentication covered under IS 13252 (Part 1) safety requirements.",
      applicability_explanation: "Primary mandatory standard for electronic safety of biometric fingerprint scanners under MeitY CRS.",
      confidence_score: 0.99
    },
    investigation_notes: "IS 13252 (Part 1):2010 exists in DB (Standard ID 260); mandated under MeitY CRS Phase II."
  },
  {
    canonical_name: "CCTV Cameras and Video Surveillance Equipment",
    council: "LITD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13252 (Part 1):2010",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_CRS",
      evidence_source: "MeitY Public Procurement (Preference to Make in India) Order for CCTV Cameras S.O. 2064(E); MeitY CRS Phase III",
      source_url: "https://www.meity.gov.in/esdm/standards",
      evidence_excerpt: "Schedule Entry: Closed Circuit Television (CCTV) cameras / equipment covered under IS 13252 (Part 1).",
      applicability_explanation: "Primary national standard for safety and power compliance of CCTV cameras and security surveillance hardware.",
      confidence_score: 0.99
    },
    investigation_notes: "Mandatory under MeitY CRS and Public Procurement Cyber Security Order."
  },
  {
    canonical_name: "Cellular IoT Industrial Gateways",
    council: "LITD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13252 (Part 1):2010",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_CRS",
      evidence_source: "MeitY CRS Phase II; Telecommunication Engineering Centre (TEC) Mandatory Testing MTCTE Phase III",
      source_url: "https://www.meity.gov.in/esdm/standards",
      evidence_excerpt: "Schedule: Communication equipment and data gateways for industrial telemetry under IS 13252 (Part 1).",
      applicability_explanation: "Primary electrical safety and equipment standard for cellular IoT communication gateways.",
      confidence_score: 0.98
    },
    investigation_notes: "Covered under IS 13252 (Part 1) safety and TEC MTCTE radio interface regulations."
  },
  {
    canonical_name: "Commercial Soundbars and Audio Systems",
    council: "LITD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 616:2017",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_CRS",
      evidence_source: "MeitY Compulsory Registration Scheme (CRS) Phase I S.O. 2357(E); BIS Product Manual PM/IS 616",
      source_url: "https://www.meity.gov.in/esdm/standards",
      evidence_excerpt: "Schedule Entry 4: Audio systems with input power 200W and above covered under IS 616.",
      applicability_explanation: "Primary mandatory standard for electrical and acoustic safety of commercial audio systems and soundbars.",
      confidence_score: 0.99
    },
    investigation_notes: "IS 616:2017 exists in DB (Standard ID 262); mandatory under MeitY CRS."
  },
  {
    canonical_name: "Digital IP Dome Surveillance Cameras",
    council: "LITD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13252 (Part 1):2010",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_CRS",
      evidence_source: "MeitY Order S.O. 2064(E); MeitY CRS Phase III Schedule Entry",
      source_url: "https://www.meity.gov.in/esdm/standards",
      evidence_excerpt: "Schedule Entry: CCTV cameras including IP dome cameras conforming to IS 13252 (Part 1).",
      applicability_explanation: "Mandatory standard for electrical safety of digital IP dome surveillance cameras.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS 13252 (Part 1):2010."
  },
  {
    canonical_name: "Digital Voice Recorders",
    council: "LITD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 616:2017",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_CRS",
      evidence_source: "MeitY Compulsory Registration Scheme Phase I; BIS Product Manual PM/IS 616",
      source_url: "https://www.meity.gov.in/esdm/standards",
      evidence_excerpt: "Schedule Entry: Audio recording apparatus and electronic dictation systems under IS 616.",
      applicability_explanation: "Primary national safety standard for portable and desktop digital voice recording devices.",
      confidence_score: 0.98
    },
    investigation_notes: "Covered under IS 616:2017."
  },
  {
    canonical_name: "Electronic Cash Register Machines",
    council: "LITD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13252 (Part 1):2010",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_CRS",
      evidence_source: "MeitY Compulsory Registration Scheme Phase II S.O. 2905(E); BIS Product Manual PM/IS 13252/1",
      source_url: "https://www.meity.gov.in/esdm/standards",
      evidence_excerpt: "Schedule Entry 18: Electronic cash registers covered under IS 13252 (Part 1).",
      applicability_explanation: "Primary mandatory standard for electronic cash registers (ECR).",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS 13252 (Part 1):2010."
  },
  {
    canonical_name: "Electronic Cash Registers (ECR)",
    council: "LITD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13252 (Part 1):2010",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_CRS",
      evidence_source: "MeitY CRS Phase II Schedule Entry 18; BIS Product Manual PM/IS 13252/1",
      source_url: "https://www.meity.gov.in/esdm/standards",
      evidence_excerpt: "Schedule Entry 18: Electronic cash registers under IS 13252 (Part 1).",
      applicability_explanation: "Direct product mapping for electronic cash registers.",
      confidence_score: 0.99
    },
    investigation_notes: "Direct match to IS 13252 (Part 1):2010."
  },
  {
    canonical_name: "Electronic Point of Sale (POS) Terminals",
    council: "LITD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13252 (Part 1):2010",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_CRS",
      evidence_source: "MeitY Compulsory Registration Scheme Phase II S.O. 2905(E); BIS Product Manual PM/IS 13252/1",
      source_url: "https://www.meity.gov.in/esdm/standards",
      evidence_excerpt: "Schedule Entry 19: Point of sale (POS) terminals covered under IS 13252 (Part 1).",
      applicability_explanation: "Primary national standard for electronic point-of-sale terminals.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS 13252 (Part 1):2010."
  },
  {
    canonical_name: "Enterprise Managed Ethernet Switches",
    council: "LITD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13252 (Part 1):2010",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_CRS",
      evidence_source: "MeitY CRS Phase III; Telecommunication Engineering Centre (TEC) MTCTE Essential Requirements for IP Routers and Switches",
      source_url: "https://www.meity.gov.in/esdm/standards",
      evidence_excerpt: "Schedule: Data networking equipment including managed Ethernet switches covered under IS 13252 (Part 1).",
      applicability_explanation: "Primary national standard for electrical and physical safety of enterprise Ethernet network switches.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS 13252 (Part 1):2010 and TEC MTCTE requirements."
  },
  {
    canonical_name: "Enterprise Server Rack Chassis Units",
    council: "LITD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13252 (Part 1):2010",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_CRS",
      evidence_source: "MeitY Compulsory Registration Scheme Phase II S.O. 2905(E) Item 16; BIS Product Manual PM/IS 13252/1",
      source_url: "https://www.meity.gov.in/esdm/standards",
      evidence_excerpt: "Schedule Entry 16: Servers and server chassis units covered under IS 13252 (Part 1).",
      applicability_explanation: "Primary mandatory standard for enterprise computing servers and rack server chassis units.",
      confidence_score: 0.99
    },
    investigation_notes: "Mandated under MeitY CRS Phase II."
  },
  {
    canonical_name: "Enterprise Wi-Fi 6 Wireless Access Points",
    council: "LITD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13252 (Part 1):2010",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_CRS",
      evidence_source: "MeitY CRS Phase III; DoT TEC Mandatory Testing and Certification of Telecom Equipment (MTCTE) ER for Wi-Fi CPE",
      source_url: "https://www.meity.gov.in/esdm/standards",
      evidence_excerpt: "Schedule: Wireless access points and routers covered under IS 13252 (Part 1) safety requirements.",
      applicability_explanation: "Primary national standard for electrical safety of enterprise Wi-Fi wireless access points.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS 13252 (Part 1):2010."
  },
  {
    canonical_name: "External USB Hard Drives / SSDs",
    council: "LITD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13252 (Part 1):2010",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_CRS",
      evidence_source: "MeitY Compulsory Registration Scheme Phase II S.O. 2905(E) Item 20; BIS Product Manual PM/IS 13252/1",
      source_url: "https://www.meity.gov.in/esdm/standards",
      evidence_excerpt: "Schedule Entry 20: External hard disk drives and solid state storage drives covered under IS 13252 (Part 1).",
      applicability_explanation: "Primary mandatory standard for external USB hard drives and portable solid state storage drives.",
      confidence_score: 0.99
    },
    investigation_notes: "Mandated under MeitY CRS Phase II."
  },
  {
    canonical_name: "Facial Recognition Time Attendance Terminals",
    council: "LITD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13252 (Part 1):2010",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_CRS",
      evidence_source: "MeitY CRS Phase II Biometric Authentication Devices; BIS Product Manual PM/IS 13252/1",
      source_url: "https://www.meity.gov.in/esdm/standards",
      evidence_excerpt: "Schedule Entry: Electronic biometric identification terminals and time attendance devices under IS 13252 (Part 1).",
      applicability_explanation: "Primary national standard for electrical safety of facial recognition and biometric attendance terminals.",
      confidence_score: 0.98
    },
    investigation_notes: "Covered under IS 13252 (Part 1):2010."
  },
  {
    canonical_name: "Gallium Nitride (GaN) Multi-Port Desktop Chargers",
    council: "LITD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13252 (Part 1):2010",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_CRS",
      evidence_source: "MeitY Compulsory Registration Scheme Phase I S.O. 2357(E) Item 5; BIS Product Manual PM/IS 13252/1",
      source_url: "https://www.meity.gov.in/esdm/standards",
      evidence_excerpt: "Schedule Entry 5: Power adaptors for IT equipment and mobile devices covered under IS 13252 (Part 1).",
      applicability_explanation: "Primary mandatory standard for power adapters and desktop GaN fast chargers.",
      confidence_score: 0.99
    },
    investigation_notes: "GaN chargers are classified as power adaptors for IT equipment under MeitY CRS."
  },
  {
    canonical_name: "Human Machine Interface (HMI) Touch Terminals",
    council: "LITD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13252 (Part 1):2010",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "BIS LITD 7 IT Equipment Standards; Industrial Automation Equipment Guidelines",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_13252_1",
      evidence_excerpt: "Clause 1.1: General safety requirements for information technology equipment including industrial display terminals.",
      applicability_explanation: "Primary national electrical safety standard for industrial touch screen HMI operator panels.",
      confidence_score: 0.95
    },
    investigation_notes: "Covered under IS 13252 (Part 1) and IS/IEC 61131-2."
  },
  {
    canonical_name: "Industrial Managed Ethernet Switches",
    council: "LITD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13252 (Part 1):2010",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_CRS",
      evidence_source: "MeitY CRS Networking Equipment; TEC MTCTE Essential Requirements for LAN Switches",
      source_url: "https://www.meity.gov.in/esdm/standards",
      evidence_excerpt: "Schedule: Data switches and industrial networking equipment under IS 13252 (Part 1).",
      applicability_explanation: "Primary national standard for industrial managed Ethernet switches.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS 13252 (Part 1):2010."
  },
  {
    canonical_name: "Inkjet and Ink Tank Printers",
    council: "LITD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13252 (Part 1):2010",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_CRS",
      evidence_source: "MeitY Compulsory Registration Scheme Phase I S.O. 2357(E) Item 3; BIS Product Manual PM/IS 13252/1",
      source_url: "https://www.meity.gov.in/esdm/standards",
      evidence_excerpt: "Schedule Entry 3: Printers and plotters covered under IS 13252 (Part 1).",
      applicability_explanation: "Primary mandatory standard for inkjet, ink tank, and laser computer printers.",
      confidence_score: 0.99
    },
    investigation_notes: "Mandated under MeitY CRS Phase I."
  },
  {
    canonical_name: "Multi-Function Printers (MFP)",
    council: "LITD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13252 (Part 1):2010",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_CRS",
      evidence_source: "MeitY CRS Phase I Item 3 & Item 7 (Scanners); BIS Product Manual PM/IS 13252/1",
      source_url: "https://www.meity.gov.in/esdm/standards",
      evidence_excerpt: "Schedule Entry 3 & 7: Printers, copiers, and multi-function printing devices under IS 13252 (Part 1).",
      applicability_explanation: "Primary mandatory standard for multi-function printing and scanning devices.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS 13252 (Part 1):2010."
  },
  {
    canonical_name: "Network Attached Storage (NAS) Appliances",
    council: "LITD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13252 (Part 1):2010",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_CRS",
      evidence_source: "MeitY CRS Phase II Item 16 (Storage and Server Systems); BIS Product Manual PM/IS 13252/1",
      source_url: "https://www.meity.gov.in/esdm/standards",
      evidence_excerpt: "Schedule Entry 16: Data storage systems and NAS appliances covered under IS 13252 (Part 1).",
      applicability_explanation: "Primary mandatory standard for network attached data storage appliances.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS 13252 (Part 1):2010."
  },
  {
    canonical_name: "Network Video Recorders (NVR) for IP CCTV",
    council: "LITD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13252 (Part 1):2010",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_CRS",
      evidence_source: "MeitY Order S.O. 2064(E) CCTV Systems; BIS Product Manual PM/IS 13252/1",
      source_url: "https://www.meity.gov.in/esdm/standards",
      evidence_excerpt: "Schedule Entry: CCTV recording equipment, NVR and DVR units covered under IS 13252 (Part 1).",
      applicability_explanation: "Primary mandatory standard for network video recorders and CCTV recording appliances.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS 13252 (Part 1):2010."
  },
  {
    canonical_name: "Optical Line Terminals (OLT for FTTH Networks)",
    council: "LITD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13252 (Part 1):2010",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_CRS",
      evidence_source: "DoT TEC Mandatory Testing MTCTE Phase II; MeitY CRS Communication Equipment",
      source_url: "https://www.meity.gov.in/esdm/standards",
      evidence_excerpt: "Schedule: Optical transmission equipment and OLT chassis covered under IS 13252 (Part 1).",
      applicability_explanation: "Primary national standard for electrical and laser safety of optical line terminals.",
      confidence_score: 0.98
    },
    investigation_notes: "Covered under IS 13252 (Part 1) and TEC MTCTE requirements."
  },
  {
    canonical_name: "Optical Network Units (ONU / ONT Modems)",
    council: "LITD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13252 (Part 1):2010",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_CRS",
      evidence_source: "DoT TEC MTCTE Phase II Essential Requirements; MeitY CRS Phase III",
      source_url: "https://www.meity.gov.in/esdm/standards",
      evidence_excerpt: "Schedule: Customer premises optical modems and ONUs covered under IS 13252 (Part 1).",
      applicability_explanation: "Primary national standard for FTTH optical network units and customer modems.",
      confidence_score: 0.98
    },
    investigation_notes: "Covered under IS 13252 (Part 1):2010."
  },
  {
    canonical_name: "Outdoor Bullet CCTV Surveillance Cameras",
    council: "LITD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13252 (Part 1):2010",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_CRS",
      evidence_source: "MeitY Order S.O. 2064(E); MeitY CRS Phase III",
      source_url: "https://www.meity.gov.in/esdm/standards",
      evidence_excerpt: "Schedule Entry: CCTV cameras including weather-proof outdoor bullet cameras covered under IS 13252 (Part 1).",
      applicability_explanation: "Primary mandatory standard for outdoor bullet CCTV surveillance cameras.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS 13252 (Part 1):2010."
  },
  {
    canonical_name: "Point of Sale (POS) Terminals",
    council: "LITD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13252 (Part 1):2010",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_CRS",
      evidence_source: "MeitY CRS Phase II Item 19; BIS Product Manual PM/IS 13252/1",
      source_url: "https://www.meity.gov.in/esdm/standards",
      evidence_excerpt: "Schedule Entry 19: Point of sale (POS) electronic terminals covered under IS 13252 (Part 1).",
      applicability_explanation: "Direct product mapping for point of sale terminals.",
      confidence_score: 0.99
    },
    investigation_notes: "Direct match to IS 13252 (Part 1):2010."
  },
  {
    canonical_name: "Power over Ethernet (PoE) Sourcing Injectors",
    council: "LITD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13252 (Part 1):2010",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_CRS",
      evidence_source: "MeitY CRS Phase I Item 5 (Power Adaptors); BIS Product Manual PM/IS 13252/1",
      source_url: "https://www.meity.gov.in/esdm/standards",
      evidence_excerpt: "Schedule Entry 5: Power adaptors and DC power sourcing equipment under IS 13252 (Part 1).",
      applicability_explanation: "Primary national standard for electrical power sourcing injectors and PoE adapters.",
      confidence_score: 0.98
    },
    investigation_notes: "Covered under IS 13252 (Part 1):2010."
  },
  {
    canonical_name: "Programmable Logic Controllers (PLC)",
    council: "LITD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS/IEC 61131-2:2007",
    new_standard: {
      is_number: "IS/IEC 61131-2:2007",
      title: "Programmable Controllers: Part 2 Equipment Requirements and Tests (First Revision)",
      publication_year: 2007,
      version: "First Revision (Reaffirmed 2018)",
      status: "ACTIVE",
      technical_committee: "LITD 10",
      division_council: "Electronics and Information Technology",
      scope: "Specifies electrical, mechanical, and environmental requirements and tests for programmable logic controllers (PLCs) and associated industrial automation peripherals.",
      materials: "Industrial electronic controller assembly, flame retardant polycarbonate housing, conformal coated printed circuit boards.",
      technical_requirements: "Input/output digital and analog modules, operating DC voltage 24V or AC 230V, optical isolation minimum 1.5 kV, scan cycle time, industrial communication protocols.",
      performance_requirements: "Electromagnetic compatibility (EMC) immunity per IEC 61000-4; vibration resistance 1g at 10-150 Hz; operating temperature 0 to 55 deg C; dielectric withstand.",
      testing_requirements: "EMC electrostatic discharge test; electrical fast transient (EFT) burst test; surge immunity test; thermal cycling test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards LITD 10 Industrial Automation Committee (Identical to IEC 61131-2)"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Industrial Automation Catalogue; Ministry of Heavy Industries Smart Manufacturing Guidelines",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_IEC_61131_2",
      evidence_excerpt: "Clause 1.1: Specifies equipment requirements and test methods for programmable logic controllers and associated industrial peripherals.",
      applicability_explanation: "Primary national product standard for programmable logic controllers (PLC) used in industrial automation.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by LITD 10; identical adoption of IEC 61131-2."
  },
  {
    canonical_name: "Smart Card Contactless Readers (NFC)",
    council: "LITD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13252 (Part 1):2010",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_CRS",
      evidence_source: "MeitY CRS Phase II Item 21 (Smart Card Readers); BIS Product Manual PM/IS 13252/1",
      source_url: "https://www.meity.gov.in/esdm/standards",
      evidence_excerpt: "Schedule Entry 21: Smart card readers and contactless NFC readers covered under IS 13252 (Part 1).",
      applicability_explanation: "Primary mandatory standard for electrical safety of contactless smart card and NFC readers.",
      confidence_score: 0.99
    },
    investigation_notes: "Mandated under MeitY CRS Phase II."
  },
  {
    canonical_name: "Smart Card Readers and Encoders",
    council: "LITD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13252 (Part 1):2010",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_CRS",
      evidence_source: "MeitY CRS Phase II Item 21; BIS Product Manual PM/IS 13252/1",
      source_url: "https://www.meity.gov.in/esdm/standards",
      evidence_excerpt: "Schedule Entry 21: Smart card readers covered under IS 13252 (Part 1).",
      applicability_explanation: "Direct product mapping for smart card readers and encoders.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS 13252 (Part 1):2010."
  },
  {
    canonical_name: "Smart Televisions (LED/OLED)",
    council: "LITD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 616:2017",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_CRS",
      evidence_source: "MeitY Compulsory Registration Scheme Phase I S.O. 2357(E) Item 2; BEE Mandatory Energy Star Labeling for Colour Televisions",
      source_url: "https://www.meity.gov.in/esdm/standards",
      evidence_excerpt: "Schedule Entry 2: Electronic display monitors and television sets with screen size 32 inches and above covered under IS 616.",
      applicability_explanation: "Primary mandatory standard for electrical safety of LED, OLED, and smart televisions.",
      confidence_score: 0.99
    },
    investigation_notes: "Mandatory under MeitY CRS Phase I and BEE Energy Rating."
  },
  {
    canonical_name: "Smartphones and Cellular Mobile Handsets",
    council: "LITD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 16333 (Part 3):2022",
    new_standard: {
      is_number: "IS 16333 (Part 3):2022",
      title: "Mobile Phone Handsets: Part 3 Indian Language Support for Mobile Phone Handsets — Specification (First Revision)",
      publication_year: 2022,
      version: "First Revision",
      status: "ACTIVE",
      technical_committee: "LITD 16",
      division_council: "Electronics and Information Technology",
      scope: "Specifies requirements for Indian language text input and message display for mobile phone handsets covering all 22 official scheduled Indian languages.",
      materials: "Smartphone hardware platform, display touch screen, cellular radio modem conforming to 4G/5G 3GPP specifications.",
      technical_requirements: "Input mechanism (virtual or physical keypad) supporting Devanagari and regional scripts; font rendering; SMS sending and receiving in official Indian languages.",
      performance_requirements: "Full font glyph display without clipping; language input switching <= 2 keystrokes; SAR limit <= 1.6 W/kg per DoT regulations.",
      testing_requirements: "Indian language rendering verification per IS 16333 (Part 3) test cases; electrical safety test per IS 13252 (Part 1); battery safety per IS 16046.",
      certification: "Scheme-II",
      source: "Bureau of Indian Standards LITD 16 Computer Hardware Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_STATUTORY",
      evidence_source: "Ministry of Electronics and Information Technology (MeitY) Mobile Phone Handsets Indian Language Order S.O. 3127(E); MeitY CRS Phase I Item 14",
      source_url: "https://www.meity.gov.in/esdm/standards",
      evidence_excerpt: "Schedule: Mandatory compliance of all mobile phone handsets sold in India with IS 16333 (Part 3) for Indian language display and input.",
      applicability_explanation: "Primary national statutory product standard for smartphones and cellular mobile phone handsets.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by LITD 16; mandatory under MeitY Gazette Order."
  },
  {
    canonical_name: "Switched-Mode Power Supply (SMPS) Units",
    council: "LITD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13252 (Part 1):2010",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_CRS",
      evidence_source: "MeitY Compulsory Registration Scheme Phase II S.O. 2905(E) Item 17; BIS Product Manual PM/IS 13252/1",
      source_url: "https://www.meity.gov.in/esdm/standards",
      evidence_excerpt: "Schedule Entry 17: Power adaptors and switched-mode power supplies (SMPS) with input power rating <= 2000W covered under IS 13252 (Part 1).",
      applicability_explanation: "Primary mandatory standard for switched-mode power supply (SMPS) units used in computers and electronic equipment.",
      confidence_score: 0.99
    },
    investigation_notes: "Mandated under MeitY CRS Phase II."
  },
  {
    canonical_name: "Thermal Imaging Body Temperature Screening Cameras",
    council: "LITD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13252 (Part 1):2010",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_CRS",
      evidence_source: "MeitY CRS Phase III CCTV and Thermal Imaging Devices; BIS Product Manual PM/IS 13252/1",
      source_url: "https://www.meity.gov.in/esdm/standards",
      evidence_excerpt: "Schedule: Electronic thermal screening cameras covered under IS 13252 (Part 1) safety requirements.",
      applicability_explanation: "Primary national standard for electrical safety of thermal body temperature screening camera systems.",
      confidence_score: 0.98
    },
    investigation_notes: "Covered under IS 13252 (Part 1):2010."
  },
  {
    canonical_name: "Unmanaged Ethernet Switches",
    council: "LITD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13252 (Part 1):2010",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_CRS",
      evidence_source: "MeitY CRS Phase III Networking Equipment; BIS Product Manual PM/IS 13252/1",
      source_url: "https://www.meity.gov.in/esdm/standards",
      evidence_excerpt: "Schedule: Data networking LAN switches covered under IS 13252 (Part 1).",
      applicability_explanation: "Primary mandatory standard for unmanaged desktop and rackmount Ethernet switches.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS 13252 (Part 1):2010."
  },
  {
    canonical_name: "Video Projectors (Commercial)",
    council: "LITD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13252 (Part 1):2010",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_CRS",
      evidence_source: "MeitY Compulsory Registration Scheme Phase I S.O. 2357(E) Item 6; BIS Product Manual PM/IS 13252/1",
      source_url: "https://www.meity.gov.in/esdm/standards",
      evidence_excerpt: "Schedule Entry 6: Visual display units and video projectors covered under IS 13252 (Part 1).",
      applicability_explanation: "Primary mandatory standard for commercial and institutional video projectors.",
      confidence_score: 0.99
    },
    investigation_notes: "Mandated under MeitY CRS Phase I."
  },
  {
    canonical_name: "Wi-Fi Access Points and Routers",
    council: "LITD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13252 (Part 1):2010",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_CRS",
      evidence_source: "MeitY CRS Phase III; DoT TEC MTCTE Rules for Wi-Fi CPE",
      source_url: "https://www.meity.gov.in/esdm/standards",
      evidence_excerpt: "Schedule: Wireless routers and Wi-Fi access points covered under IS 13252 (Part 1).",
      applicability_explanation: "Primary mandatory standard for domestic and commercial Wi-Fi routers and access points.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS 13252 (Part 1):2010."
  },

  // ==========================================
  // ETD (49 products)
  // ==========================================
  {
    canonical_name: "Airfield Runway and Taxiway Lighting Luminaires",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 10322 (Part 5/Sec 6):2013",
    new_standard: {
      is_number: "IS 10322 (Part 5/Sec 6):2013",
      title: "Luminaires: Part 5 Particular Requirements: Section 6 Luminaires for Airfield Lighting",
      publication_year: 2013,
      version: "Original Edition (Reaffirmed 2018)",
      status: "ACTIVE",
      technical_committee: "ETD 24",
      division_council: "Electrotechnical",
      scope: "Specifies requirements for elevated and inset (flush-mounted) lighting fittings for use on airfield runways, taxiways, and apron stands.",
      materials: "Die-cast marine grade aluminium alloy body, tempered optical prism glass lens, IP68 silicone gaskets, stainless steel hardware.",
      technical_requirements: "Photometric intensity and beam dispersion conforming to ICAO Annex 14 / DGCA CAR; static hydraulic load resistance up to 200 kN for inset runway lights.",
      performance_requirements: "Series isolating transformer operation (6.6A constant current circuit); temperature rise <= 160 deg C on top lens; water immersion proofing.",
      testing_requirements: "Photometric goniophotometer measurement; hydraulic static load test per ICAO Aerodrome Design Manual; water spray IP68 test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards ETD 24 Illumination Engineering Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_STATUTORY",
      evidence_source: "Directorate General of Civil Aviation (DGCA) Civil Aviation Requirements (CAR) Section 4 Series B; Airports Authority of India (AAI) Specifications",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_10322_5_6",
      evidence_excerpt: "Clause 1.1: Covers requirements for elevated and inset lighting luminaires used in aeronautical ground lighting systems on airfields.",
      applicability_explanation: "Primary national standard for airfield runway and taxiway ground lighting luminaires.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by ETD 24; mandatory under DGCA aerodrome safety regulations."
  },
  {
    canonical_name: "Automotive Primary Wiring Cables",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 2465:1984",
    new_standard: {
      is_number: "IS 2465:1984",
      title: "Cables for Motor Vehicles — Specification (Second Revision)",
      publication_year: 1984,
      version: "Second Revision (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "ETD 35",
      division_council: "Electrotechnical",
      scope: "Specifies requirements for single-core and multi-core PVC insulated low-voltage electric cables (up to 60 V dc) used for starting, lighting, and ignition wiring in motor vehicles.",
      materials: "High-conductivity annealed bare or tinned copper conductor conforming to IS 8130 Class 5; heat-resistant automotive grade PVC insulation per IS 5831.",
      technical_requirements: "Conductor cross-sections 0.5 mm2 to 120 mm2; temperature rating -40 deg C to +105 deg C; thin wall (FLRY) and thick wall types.",
      performance_requirements: "Resistance to petrol, diesel, motor engine oils, and battery electrolyte; flame retardancy (self-extinguishing <= 30 seconds); scrape abrasion resistance.",
      testing_requirements: "Heat ageing test at 105 deg C for 120 hours; fluid resistance test per IS 2465 Clause 8; scrape abrasion test on automated rig.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards ETD 35 Power Cables Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DPIIT Electrical Wires, Cables and Accessories QCO; Central Motor Vehicle Rules (CMVR) Rule 124; ARAI Automotive Electrical Standards",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_2465",
      evidence_excerpt: "Clause 1.1: Covers requirements for low-tension cables used for electrical wiring in road vehicles.",
      applicability_explanation: "Primary national product standard for automotive primary low-voltage wiring cables.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by ETD 35; mandatory in automotive manufacturing."
  },
  {
    canonical_name: "Cable Glands for Armoured Cables",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 12943:1990",
    new_standard: {
      is_number: "IS 12943:1990",
      title: "Brass Cable Glands for Electrical Cables — Specification",
      publication_year: 1990,
      version: "Original Edition (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "ETD 35",
      division_council: "Electrotechnical",
      scope: "Specifies dimensional, material, and electrical mechanical retention requirements for indoor and outdoor brass cable glands for armoured and unarmoured electrical power cables.",
      materials: "Extruded brass rod per IS 319 (Grade 1), neoprene or nitrile synthetic rubber compression seal rings, brass lock nuts.",
      technical_requirements: "Types: Single compression for indoor unarmoured cables, double compression weatherproof for steel tape/wire armoured cables; entry thread ISO metric M16 to M100.",
      performance_requirements: "Cable retention pull-out resistance >= 2.0 kN; ingress protection IP66/IP67; earth continuity electrical resistance <= 0.05 ohms across gland body.",
      testing_requirements: "Cable pull-out tension test per IS 12943 Clause 8; water ingress test per IS/IEC 60529; short-circuit earth fault test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards ETD 35 Cable Accessories Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 12943/1; Central Electricity Authority (CEA) Construction Regulations Schedule V",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_12943",
      evidence_excerpt: "Clause 1.1: Covers design, dimensions, and performance of brass cable glands for terminating armoured and unarmoured power and control cables.",
      applicability_explanation: "Primary national product standard for double-compression brass cable glands for armoured cables.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by ETD 35; standard termination hardware in all electrical substations."
  },
  {
    canonical_name: "Coaxial Television RF Cables",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 11967 (Part 1):1987",
    new_standard: {
      is_number: "IS 11967 (Part 1):1987",
      title: "Radio Frequency Coaxial Cables: Part 1 General Requirements and Methods of Test",
      publication_year: 1987,
      version: "Original Edition (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "ETD 35",
      division_council: "Electrotechnical",
      scope: "Specifies construction, transmission characteristics, impedance (50 ohm and 75 ohm), and testing methods for radio frequency coaxial cables (RG-6, RG-11, RG-59) used for television and telecommunications.",
      materials: "Solid bare copper or copper-clad steel center conductor, gas-injected physical foamed polyethylene dielectric, bonded aluminum foil with tinned copper braid shield, PVC/PE jacket.",
      technical_requirements: "Characteristic impedance 75 +/- 3 ohms; velocity of propagation >= 82%; structural return loss (SRL) >= 20 dB up to 1000 MHz; attenuation limits at 50 to 1000 MHz.",
      performance_requirements: "Screening effectiveness (shielding attenuation) >= 85 dB; spark test on jacket at 3 kV ac; cold bend test at -20 deg C.",
      testing_requirements: "Time domain reflectometry (TDR) impedance test; vector network analyzer attenuation measurement per IS 11967; braid coverage percentage check.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards ETD 35 Power Cables Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS ETD 35 Cable Standards; Telecom Regulatory Authority of India (TRAI) Digital Cable TV Network Technical Standards",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_11967_1",
      evidence_excerpt: "Clause 1.1: Specifies physical, electrical, and transmission requirements for flexible RF coaxial cables used in television and radio distribution.",
      applicability_explanation: "Primary national standard for RG-6 and RG-11 coaxial television RF transmission cables.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by ETD 35; standard for CATV and satellite television cables."
  },
  {
    canonical_name: "Crimping Cable Terminals and Lugs",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 8309:1993",
    new_standard: {
      is_number: "IS 8309:1993",
      title: "Compression Type Tubular Terminal Ends for Aluminium and Copper Conductors of Insulated Cables — Specification (First Revision)",
      publication_year: 1993,
      version: "First Revision (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "ETD 35",
      division_council: "Electrotechnical",
      scope: "Specifies dimensions, barrel profile, and mechanical and electrical test requirements for crimping type tubular terminal lugs for copper and aluminum conductors 1.5 mm2 to 1000 mm2.",
      materials: "High-conductivity seamless copper tube conforming to IS 1897 (electro-tinned minimum 5 micron) or aluminium alloy conforming to IS 5082.",
      technical_requirements: "Barrel entry chamfer, inspection hole, bolt fixing hole dimensions; cross-section designations 1.5 to 1000 mm2.",
      performance_requirements: "Tensile pull-out strength after crimping conforming to specified mechanical force without conductor slippage; electrical resistance of connection <= conductor resistance.",
      testing_requirements: "Tensile pull-out test on calibrated tensile tester per IS 8309 Clause 8; electrical temperature rise test under full rated current; tin coating thickness check.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards ETD 35 Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 8309/1; Central Electricity Authority (CEA) Technical Standards for Electrical Wiring",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_8309",
      evidence_excerpt: "Clause 1.1: Covers dimensions, materials, and testing of compression type tubular terminal lugs for terminating power cables.",
      applicability_explanation: "Primary national product standard for copper and aluminum compression cable lugs and crimp terminals.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by ETD 35; standard electrical termination hardware."
  },
  {
    canonical_name: "Distribution Boards (Enclosures)",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13032:1991",
    new_standard: {
      is_number: "IS 13032:1991",
      title: "Miniature Circuit-Breaker Boards for Low Voltage Distribution — Specification",
      publication_year: 1991,
      version: "Original Edition (Reaffirmed 2019)",
      status: "ACTIVE",
      technical_committee: "ETD 31",
      division_council: "Electrotechnical",
      scope: "Specifies requirements for enclosed factory-built low-voltage distribution boards (SPN and TPN DBs) housing miniature circuit breakers, RCCBs, and isolating switches for indoor installations.",
      materials: "Cold rolled close annealed (CRCA) steel sheet thickness minimum 1.2 mm to 1.6 mm, epoxy polyester powder coated, copper busbars per IS 613.",
      technical_requirements: "Single pole and neutral (SPN 4-way to 16-way), triple pole and neutral (TPN 4-way to 12-way); rated current up to 250A; insulated copper busbar; DIN rails.",
      performance_requirements: "Ingress protection IP42 / IP43 for indoor, IP54 for industrial; short-circuit withstand rating 10 kA / 16 kA; insulation resistance > 10 megohms at 500V dc.",
      testing_requirements: "Dielectric voltage withstand test (2.5 kV) per IS 13032; temperature rise test at rated current; mechanical impact IK08 test; earthing continuity check.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards ETD 31 Low-Voltage Switchgear Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 13032/1; CPWD Electrical Specifications 2018 Subhead 2 Clause 2.8; National Electrical Code of India 2023",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_13032",
      evidence_excerpt: "Clause 1.1: Covers requirements for metal-enclosed distribution boards fitted with miniature circuit breakers for domestic and commercial electrical distribution.",
      applicability_explanation: "Primary national standard for sheet steel enclosed MCB distribution boards (DBs).",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by ETD 31; standard for building electrical distribution enclosures."
  },
  {
    canonical_name: "Domestic Electric Food Mixers and Grinders",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 4250:1980",
    new_standard: {
      is_number: "IS 4250:1980",
      title: "Domestic Electric Food-Mixers (Liquidizers and Grinders) — Specification (Second Revision)",
      publication_year: 1980,
      version: "Second Revision (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "ETD 32",
      division_council: "Electrotechnical",
      scope: "Specifies construction, electrical safety, performance, and endurance requirements for domestic electric food mixers, liquidizers, blenders, and dry/wet grinders.",
      materials: "Molded ABS or polycarbonate motor housing, stainless steel jars (AISI 304 per IS 6911), food-grade rubber lids and brass drive couplers.",
      technical_requirements: "Universal ac motor with rated input power 450W to 1000W; motor operating voltage 230V single phase; 3-speed control with incher switch; overload protector (OLP).",
      performance_requirements: "Electrical insulation resistance >= 2 megohms; high voltage breakdown test 1.5 kV ac; temperature rise of motor winding <= 75 K; grinding efficiency test with standard dal/turmeric.",
      testing_requirements: "Continuous running endurance test 200 hours per IS 4250 Clause 12; thermal overload trip test; jar leak tightness under liquidizer operation.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards ETD 32 Electrical Appliances Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DPIIT Electrical Appliances (Quality Control) Order, 2003 S.O. 189(E) Schedule Serial No. 12; BIS Product Manual PM/IS 4250/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_4250",
      evidence_excerpt: "S.O. 189(E) Schedule Serial 12: Domestic electric food-mixers (liquidizers and grinders) covered under IS 4250.",
      applicability_explanation: "Primary national product standard for domestic electric food mixers, mixer-grinders, and liquidizers, mandatory under S.O. 189(E) QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Mandatory under DPIIT Electrical Appliances Quality Control Order 2003 S.O. 189(E) Schedule Serial 12."
  },
  {
    canonical_name: "Early Streamer Emission (ESE) Lightning Arresters",
    council: "ETD",
    status: "NO_APPLICABLE_STANDARD_FOUND",
    investigation_notes: "BIS Electrotechnical Sectional Committee ETD 30 (Surge Arresters and Lightning Protection) has formally evaluated Early Streamer Emission (ESE) air terminals and rejected them as valid Indian Standards. In India, statutory building codes (NBC 2016 Part 8 Section 2 and National Electrical Code 2023) mandate conventional Faraday cage / mesh lightning protection conforming to IS/IEC 62305. ESE devices follow the French national standard NF C 17-102 and do NOT possess a recognized Bureau of Indian Standards product specification."
  },
  {
    canonical_name: "Electromagnetic Power Contactors",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS/IEC 60947-4-1:2012",
    new_standard: {
      is_number: "IS/IEC 60947-4-1:2012",
      title: "Low-Voltage Switchgear and Controlgear: Part 4 Contactors and Motor-Starters, Section 1 Electromechanical Contactors and Motor-Starters",
      publication_year: 2012,
      version: "Third Revision (Reaffirmed 2019)",
      status: "ACTIVE",
      technical_committee: "ETD 31",
      division_council: "Electrotechnical",
      scope: "Specifies requirements for electromechanical ac and dc contactors and motor-starters intended to close and open electrical circuits for motor switching up to 1000V ac.",
      materials: "Thermoset molding DMC body, silver-nickel or silver-tin-oxide contacts, copper magnetic coil.",
      technical_requirements: "Utilization categories AC-1, AC-3, AC-4; rated operational current 9A to 800A; control coil voltages 24V to 415V; auxiliary contact blocks.",
      performance_requirements: "Making and breaking capacity: 10 times rated current for AC-3; electrical endurance minimum 1 million operations; mechanical endurance 10 million cycles.",
      testing_requirements: "Short-circuit coordination Type 2 test per IS/IEC 60947-4-1; dielectric test (2.5 kV); temperature rise test on main terminals.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards ETD 31 (Identical to IEC 60947-4-1)"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DPIIT Low Voltage Switchgear (Quality Control) Order S.O. 4386(E); BIS Product Manual PM/IS/IEC 60947-4-1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_IEC_60947_4_1",
      evidence_excerpt: "Clause 1.1: Covers electromechanical contactors and motor starters intended to be used in low-voltage electrical distribution and motor control.",
      applicability_explanation: "Primary national product standard for industrial electromagnetic power contactors and motor starters, mandatory under Switchgear QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by ETD 31; mandatory under DPIIT Low Voltage Switchgear Quality Control Order."
  },
  {
    canonical_name: "Electronic Ballasts for Fluorescent Lamps",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13021 (Part 2):1991",
    new_standard: {
      is_number: "IS 13021 (Part 2):1991",
      title: "AC Supplied Electronic Ballasts for Tubular Fluorescent Lamps — Performance Requirements",
      publication_year: 1991,
      version: "Original Edition (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "ETD 24",
      division_council: "Electrotechnical",
      scope: "Specifies performance, electrical safety, and electromagnetic compatibility requirements for high-frequency electronic ballasts for tubular fluorescent lamps.",
      materials: "Solid-state electronic inverter circuit, SMD components, electromagnetic filter choke, extruded aluminum or polycarbonate housing.",
      technical_requirements: "Supply voltage 230V ac at 50 Hz; operating frequency 20 kHz to 50 kHz; power factor >= 0.95; total harmonic distortion (THD) <= 15%.",
      performance_requirements: "Ballast lumen factor >= 0.95; lamp current crest factor <= 1.7; endurance life 50,000 hours at rated case temperature (Tc 75 deg C).",
      testing_requirements: "Harmonic current measurement per IS 14700 (Part 3/Sec 2); endurance thermal cycling test; electrical surge test per IEC 61547.",
      certification: "Scheme-II",
      source: "Bureau of Indian Standards ETD 24 (Mandatory under MeitY CRS Phase I)"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_CRS",
      evidence_source: "MeitY Compulsory Registration Scheme Phase I S.O. 2357(E) Item 1; BIS Product Manual PM/IS 13021",
      source_url: "https://www.meity.gov.in/esdm/standards",
      evidence_excerpt: "Schedule Entry 1: Electronic ballasts for tubular fluorescent lamps covered under IS 13021 (Part 2).",
      applicability_explanation: "Primary mandatory standard for AC electronic ballasts under MeitY Compulsory Registration Scheme.",
      confidence_score: 0.99
    },
    investigation_notes: "Mandatory under MeitY CRS Phase I."
  },
  {
    canonical_name: "Emergency Lighting Units",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 10322 (Part 5/Sec 8):2013",
    new_standard: {
      is_number: "IS 10322 (Part 5/Sec 8):2013",
      title: "Luminaires: Part 5 Particular Requirements: Section 8 Luminaires for Emergency Lighting",
      publication_year: 2013,
      version: "Original Edition (Reaffirmed 2018)",
      status: "ACTIVE",
      technical_committee: "ETD 24",
      division_council: "Electrotechnical",
      scope: "Specifies requirements for emergency lighting luminaires for use with emergency power supplies and self-contained battery units on 230V systems.",
      materials: "Flame-retardant polycarbonate housing (UL94 V-0), high-efficiency LED modules, rechargeable Ni-Cd or LiFePO4 battery pack.",
      technical_requirements: "Rated emergency duration 1 hour to 3 hours; automatic changeover time <= 0.5 s upon mains failure; photoluminescent exit signage.",
      performance_requirements: "Emergency lumen output minimum 50 lm; deep discharge battery protection; battery charging circuit with overcharge protection; temperature rise.",
      testing_requirements: "Photometric emergency discharge curve test per IS 10322 (Part 5/Sec 8); battery endurance test; thermal cycling test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards ETD 24 Illumination Engineering Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_STATUTORY",
      evidence_source: "National Building Code of India (NBC 2016) Part 4 Fire and Life Safety Clause 3.4.7; BIS Product Manual PM/IS 10322",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_10322_5_8",
      evidence_excerpt: "Clause 1.1: Covers requirements for self-contained and centrally powered luminaires for emergency escape lighting and illuminated safety exit signs.",
      applicability_explanation: "Primary national standard for self-contained emergency lighting units and illuminated fire escape signs.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by ETD 24; mandated across all commercial buildings under NBC 2016 Part 4."
  },
  {
    canonical_name: "Evacuated Tube Solar Collectors",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 16542:2016",
    new_standard: {
      is_number: "IS 16542:2016",
      title: "Direct Expansible All-Glass Evacuated Tubes for Solar Water Heating Systems — Specification",
      publication_year: 2016,
      version: "Original Edition (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "MED 4 / ETD 28",
      division_council: "Electrotechnical",
      scope: "Specifies requirements for twin-glass coaxial evacuated solar collector tubes with selective absorption coating for domestic and industrial solar water heaters.",
      materials: "High borosilicate glass 3.3 conforming to ISO 3585, aluminium-nitrogen-aluminium (Al-N-Al) selective absorbing film, barium getter.",
      technical_requirements: "Outer tube diameter 47 mm or 58 mm; length 1500 mm or 1800 mm; vacuum level <= 5 x 10^-3 Pa; absorptance >= 0.92; emittance <= 0.08 at 80 deg C.",
      performance_requirements: "Stagnation temperature >= 200 deg C; thermal shock resistance: cold water immersion at 100 deg C without fracture; hail impact resistance (25 mm ice ball at 20 m/s).",
      testing_requirements: "Thermal shock test per IS 16542 Clause 8; hail impact test on ice gun rig; vacuum retention getter inspection.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards Non-Conventional Energy Sources Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_STATUTORY",
      evidence_source: "Ministry of New and Renewable Energy (MNRE) Solar Thermal Quality Standards Order; BIS Product Manual PM/IS 16542/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_16542",
      evidence_excerpt: "Clause 1.1: Covers dimensional and performance requirements for evacuated solar collector glass tubes for water heating.",
      applicability_explanation: "Primary national product standard for evacuated tube collector (ETC) solar water heating elements.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated jointly by MED 4 and ETD 28; mandatory under MNRE solar thermal regulations."
  },
  {
    canonical_name: "Fire Survival Mineral Cables",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 16805:2019",
    new_standard: {
      is_number: "IS 16805:2019",
      title: "Mineral Insulated Cables and Their Terminations with a Rated Voltage Not Exceeding 750 V — Specification",
      publication_year: 2019,
      version: "Original Edition",
      status: "ACTIVE",
      technical_committee: "ETD 35",
      division_council: "Electrotechnical",
      scope: "Specifies requirements for copper-sheathed mineral insulated (MI) fire survival electrical power and control cables and their sealing pot terminations.",
      materials: "High-conductivity solid copper conductors, highly compressed magnesium oxide (MgO) mineral powder insulation, seamless copper outer sheath.",
      technical_requirements: "Voltage rating 500V (light duty) and 750V (heavy duty); conductor sizes 1.5 mm2 to 240 mm2; operating temperature up to 250 deg C continuous.",
      performance_requirements: "Fire survival circuit integrity under fire with water spray and mechanical shock at 950 deg C for 3 hours (CWZ protocol per BS 6387); zero halogen emission; zero smoke.",
      testing_requirements: "Fire test with mechanical shock and water per IS 16805 / BS 6387; high voltage dielectric test (2.5 kV); insulation resistance test at elevated temperature.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards ETD 35 Power Cables Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_STATUTORY",
      evidence_source: "National Building Code of India (NBC 2016) Part 4 Clause 3.4.6 Essential Fire Circuits; BIS ETD 35 Standards",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_16805",
      evidence_excerpt: "Clause 1.1: Covers construction and fire survival testing of mineral insulated cables intended for emergency fire lift, sprinkler, and extraction circuits.",
      applicability_explanation: "Primary national product standard for mineral insulated fire survival electrical power cables.",
      confidence_score: 0.99
    },
    investigation_notes: "Enacted by ETD 35 in 2019; mandated in high-rise buildings and metro tunnels for emergency life safety circuits."
  },
  {
    canonical_name: "Fire Survival Mineral Insulated Copper Cables",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 16805:2019",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_STATUTORY",
      evidence_source: "NBC 2016 Part 4 Life Safety Rules; BIS ETD 35 Standards",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_16805",
      evidence_excerpt: "Clause 1.1: Covers requirements for copper-sheathed mineral insulated fire resistant cables.",
      applicability_explanation: "Direct product mapping for mineral insulated copper fire survival cables.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS 16805:2019."
  },
  {
    canonical_name: "Flameproof Luminaires for Hazardous Areas",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS/IEC 60079-1:2014",
    new_standard: {
      is_number: "IS/IEC 60079-1:2014",
      title: "Explosive Atmospheres: Part 1 Equipment Protection by Flameproof Enclosures 'd' (First Revision)",
      publication_year: 2014,
      version: "First Revision (Reaffirmed 2019)",
      status: "ACTIVE",
      technical_committee: "ETD 22",
      division_council: "Electrotechnical",
      scope: "Specifies constructional and test requirements for electrical equipment and luminaires protected by flameproof enclosures 'd' for use in explosive gas atmospheres (Zone 1 and Zone 2).",
      materials: "Cast aluminium alloy LM6 body, toughened borosilicate glass wellglass dome, neoprene O-rings, stainless steel fasteners.",
      technical_requirements: "Gas groups IIA, IIB, IIC; temperature classes T1 to T6; flameproof flanged and spigoted joint gaps <= 0.15 mm; IP66 enclosure rating.",
      performance_requirements: "Non-transmission of internal ignition to surrounding atmosphere; overpressure explosion test withstanding 1.5 times reference pressure (minimum 1.0 MPa) without rupture.",
      testing_requirements: "Overpressure explosion test per IS/IEC 60079-1 Clause 15; thermal test; flameproof joint gap measurement with feeler gauges; CIMFR Dhanbad certification.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards ETD 22 Electrical Apparatus for Explosive Atmospheres Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_STATUTORY",
      evidence_source: "Petroleum and Explosives Safety Organization (PESO) Approval Rules; Directorate General of Mines Safety (DGMS); BIS Product Manual PM/IS/IEC 60079-1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_IEC_60079_1",
      evidence_excerpt: "Clause 1.1: Specifies requirements for electrical equipment including luminaires protected by flameproof enclosures for hazardous explosive atmospheres.",
      applicability_explanation: "Primary national statutory standard for flameproof explosion-proof luminaires used in oil refineries, chemical plants, and mines.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by ETD 22; mandatory PESO / DGMS statutory compliance."
  },
  {
    canonical_name: "Flexible Copper Control Cables",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 694:2010",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DPIIT Electrical Wires and Cables QCO 2003 S.O. 189(E) Schedule Serial 20; BIS Product Manual PM/IS 694/5",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_694",
      evidence_excerpt: "Schedule Serial 20: PVC insulated flexible copper cords and control cables for working voltages up to and including 1100V.",
      applicability_explanation: "Primary national standard for PVC insulated flexible copper multi-core control cables, mandatory under S.O. 189(E).",
      confidence_score: 0.99
    },
    investigation_notes: "IS 694:2010 exists in DB (Standard ID 242)."
  },
  {
    canonical_name: "Hazardous Area Flameproof Wellglass Luminaires",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS/IEC 60079-1:2014",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_STATUTORY",
      evidence_source: "PESO Statutory Approval Mandate; BIS Product Manual PM/IS/IEC 60079-1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_IEC_60079_1",
      evidence_excerpt: "Clause 1.1: Flameproof enclosure requirements for wellglass lighting luminaires in gas groups IIA, IIB, IIC.",
      applicability_explanation: "Direct product mapping for hazardous area flameproof wellglass luminaires.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS/IEC 60079-1:2014."
  },
  {
    canonical_name: "Heavy Duty Industrial Wall Exhaust Fans",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 2312:1967",
    new_standard: {
      is_number: "IS 2312:1967",
      title: "Propeller Type AC Ventilating Fans — Specification (First Revision)",
      publication_year: 1967,
      version: "First Revision (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "ETD 32",
      division_council: "Electrotechnical",
      scope: "Specifies requirements for propeller-type ac ventilating exhaust fans for domestic, commercial, and industrial wall installations.",
      materials: "Die-cast aluminium or pressed steel impeller blades, heavy-duty induction motor with class B/F insulation, steel wire finger guard.",
      technical_requirements: "Impeller blade sweep 225 mm, 300 mm, 380 mm, 450 mm, 600 mm, 900 mm; operating speeds 700 rpm to 1400 rpm; operating voltage 230V single phase or 415V three phase.",
      performance_requirements: "Air delivery (air flow rate) minimum 650 m3/h for 225 mm up to 25,000 m3/h for 900 mm; service value (m3/min/Watt); noise level limits.",
      testing_requirements: "Air delivery test using anemometer or pitot tube traverse in test chamber per IS 2312 Clause 11; electrical insulation resistance test at 500V; high voltage test at 1.5 kV.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards ETD 32 Electrical Appliances Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS 2312/1; CPWD Electrical Specifications Subhead 3 Clause 3.6",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_2312",
      evidence_excerpt: "Clause 1.1: Covers design, performance, and electrical safety of ac propeller type exhaust and ventilating fans for industrial and building use.",
      applicability_explanation: "Primary national product standard for heavy-duty industrial and commercial propeller wall exhaust fans.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by ETD 32; reaffirmed in 2021."
  },
  {
    canonical_name: "High Mast Lighting Towers with Winch",
    council: "ETD",
    status: "VERIFIED_SUPPORTING_ONLY",
    standard_is: "IS 875 (Part 3):2015",
    mapping: {
      relationship_type: "supporting_reference",
      mandatory_status: "VOLUNTARY_RECOMMENDED",
      evidence_source: "Institution of Lighting Professionals (ILP) Technical Report TR-07 High Masts; CPWD Electrical Subhead 8 Clause 8.12; IS 875 Part 3 Wind Loads",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_875_3",
      evidence_excerpt: "Clause 6.3: Basic wind speed, terrain factor, and aerodynamic drag coefficients for polygonal high mast lighting shafts.",
      applicability_explanation: "Specifies fundamental wind load, dynamic gust response, and structural engineering design criteria for high mast lighting towers.",
      confidence_score: 0.90
    },
    investigation_notes: "High mast lighting shafts are engineered per IS 875 (Part 3) for wind stability; luminaires on the carriage conform to IS 10322."
  },
  {
    canonical_name: "High Rupturing Capacity (HRC) Fuse Links",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13703 (Part 2/Sec 1):1993",
    new_standard: {
      is_number: "IS 13703 (Part 2/Sec 1):1993",
      title: "Low-Voltage Fuses for Large Rupturing Capacity: Part 2 Fuses for Use by Authorized Persons, Section 1 Supplementary Requirements (First Revision)",
      publication_year: 1993,
      version: "First Revision (Reaffirmed 2019)",
      status: "ACTIVE",
      technical_committee: "ETD 31",
      division_council: "Electrotechnical",
      scope: "Specifies dimensional, electrical, and breaking capacity requirements for low-voltage high rupturing capacity (HRC) cartridge fuse links for industrial electrical distribution networks.",
      materials: "High-grade steatite ceramic cartridge body, silver-plated copper fuse element, high-purity granular silica quartz arc-quenching sand.",
      technical_requirements: "Current ratings 2A to 1250A; rated voltage 415V / 500V ac; breaking capacity minimum 80 kA at 415V; utilization category gG (general purpose) and aM (motor circuit).",
      performance_requirements: "Total clearing I2t limits; non-shattering of ceramic body during 80 kA short circuit interruption; temperature rise on contact blades <= 65 K at rated current.",
      testing_requirements: "Short-circuit breaking capacity test at high-power testing laboratory (CPRI / ERDA) per IS 13703; temperature rise test; time-current characteristic verification.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards ETD 31 (Identical to IEC 60269-2)"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DPIIT Electrical Protection Devices QCO 2003 S.O. 189(E) Schedule Serial No. 6; BIS Product Manual PM/IS 13703",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_13703_2_1",
      evidence_excerpt: "S.O. 189(E) Schedule Serial 6: Low voltage fuses for large rupturing capacity covered under IS 13703.",
      applicability_explanation: "Primary national standard for industrial HRC cartridge fuse links, mandatory under S.O. 189(E) QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by ETD 31; mandatory under DPIIT Electrical Protection Devices Quality Control Order S.O. 189(E) Schedule Serial 6."
  },
  {
    canonical_name: "High Rupturing Capacity (HRC) Knife Blade Fuses",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13703 (Part 2/Sec 1):1993",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "S.O. 189(E) Schedule Serial 6; BIS Product Manual PM/IS 13703",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_13703_2_1",
      evidence_excerpt: "Schedule Serial 6: Knife blade contact HRC fuses for industrial distribution switchboards under IS 13703.",
      applicability_explanation: "Direct product mapping for DIN-type knife blade HRC fuse links.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS 13703 (Part 2/Sec 1):1993."
  },
  {
    canonical_name: "High Temperature Low Sag (HTLS) Conductors",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 398 (Part 6):2018",
    new_standard: {
      is_number: "IS 398 (Part 6):2018",
      title: "Aluminium Conductors for Overhead Transmission Purposes — Specification: Part 6 High Temperature Low Sag (HTLS) Conductors",
      publication_year: 2018,
      version: "Original Edition",
      status: "ACTIVE",
      technical_committee: "ETD 37",
      division_council: "Electrotechnical",
      scope: "Specifies requirements for high temperature low sag (HTLS) overhead conductors (INVAR core, composite carbon fibre core, or gap-type) for electrical transmission lines.",
      materials: "Thermal resistant aluminium alloy (Al-Zr) strands over Invar steel, high-strength steel, or carbon fibre composite core.",
      technical_requirements: "Continuous operating temperature 150 deg C to 210 deg C; ampacity increase 1.5 to 2.0 times conventional ACSR; sag at maximum operating temperature within statutory ground clearance.",
      performance_requirements: "Tensile breaking load of complete conductor >= 95% rated UTS; radial thermal expansion coefficient; stress-strain characteristics; vibration fatigue resistance 10^8 cycles.",
      testing_requirements: "High temperature current-temperature ampacity test per IS 398 (Part 6); composite core tensile test; aeolian vibration test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards ETD 37 Overhead Transmission Conductors Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_STATUTORY",
      evidence_source: "Central Electricity Authority (CEA) Technical Standards for Construction of Electrical Plants and Electric Lines Regulations Clause 84; Power Grid Corporation Standards",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_398_6",
      evidence_excerpt: "Clause 1.1: Covers requirements for high temperature low sag conductors intended for reconductoring and high-capacity overhead transmission lines.",
      applicability_explanation: "Primary national product standard for HTLS overhead transmission line conductors.",
      confidence_score: 0.99
    },
    investigation_notes: "Enacted by ETD 37 in 2018; mandatory in CEA power transmission line upgrades."
  },
  {
    canonical_name: "Instrumentation Screened Cables",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 1554 (Part 1):1988",
    new_standard: {
      is_number: "IS 1554 (Part 1):1988",
      title: "PVC Insulated (Heavy Duty) Electric Cables: Part 1 For Working Voltages Up to and Including 1100 V (Third Revision)",
      publication_year: 1988,
      version: "Third Revision (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "ETD 35",
      division_council: "Electrotechnical",
      scope: "Specifies requirements for PVC insulated single-core and multi-core armoured and screened control, instrumentation, and power cables up to 1100V.",
      materials: "Annealed plain or tinned copper conductor conforming to IS 8130, PVC Type A insulation, individual and overall aluminum-mylar tape screen with drain wire, galvanized steel wire/strip armour.",
      technical_requirements: "Core cross-sections 0.5 mm2 to 2.5 mm2; screening coverage 100% with drain wire; electrostatic coupling attenuation.",
      performance_requirements: "High voltage test 3.0 kV ac; insulation resistance minimum 100 megohms-km; fire retardant low smoke (FRLS) sheath oxygen index >= 29%.",
      testing_requirements: "Electrostatic screening efficiency test; spark testing on insulation; flammability test per IS 10810 (Part 53).",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards ETD 35 Power Cables Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DPIIT Electrical Wires and Cables QCO 2003 S.O. 189(E) Schedule Serial No. 19; BIS Product Manual PM/IS 1554/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_1554_1",
      evidence_excerpt: "Schedule Serial 19: PVC insulated heavy duty electric cables for working voltages up to and including 1100V under IS 1554 (Part 1).",
      applicability_explanation: "Primary national standard for heavy-duty screened and armoured instrumentation cables, mandatory under S.O. 189(E).",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by ETD 35; mandatory under DPIIT Cables Quality Control Order S.O. 189(E) Schedule Serial 19."
  },
  {
    canonical_name: "Instrumentation Shielded Multipair Cables",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 1554 (Part 1):1988",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "S.O. 189(E) Schedule Serial 19; BIS Product Manual PM/IS 1554/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_1554_1",
      evidence_excerpt: "Schedule Serial 19: Multipair shielded signal cables under IS 1554 (Part 1).",
      applicability_explanation: "Direct product mapping for shielded multipair instrumentation cables.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS 1554 (Part 1):1988."
  },
  {
    canonical_name: "LED Batten Tubes (T8 Retrofit)",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 16102 (Part 1):2012",
    new_standard: {
      is_number: "IS 16102 (Part 1):2012",
      title: "Self-Ballasted LED Lamps for General Lighting Services: Part 1 Safety Requirements",
      publication_year: 2012,
      version: "Original Edition (Reaffirmed 2017)",
      status: "ACTIVE",
      technical_committee: "ETD 24",
      division_council: "Electrotechnical",
      scope: "Specifies electrical, thermal, and mechanical safety requirements for self-ballasted tubular LED lamps (retrofit LED batten tubes) for general lighting services up to 250V.",
      materials: "Extruded aluminium heat sink channel, flame retardant polycarbonate diffuser, surface mount LED package, internal constant current driver.",
      technical_requirements: "Cap bases G13, G5 or batten fitting; operating voltage 140V to 280V ac; power factor >= 0.90; insulation resistance >= 4 megohms.",
      performance_requirements: "Luminous efficacy >= 100 lm/W; colour rendering index (CRI) >= 80; photobiological safety Exempt Group per IS 16108; creepage distance and clearance.",
      testing_requirements: "High voltage electrical insulation test at 2.0 kV; temperature rise test on driver components; photobiological UV-blue light hazard check; drop test.",
      certification: "Scheme-II",
      source: "Bureau of Indian Standards ETD 24 (Mandatory under MeitY CRS Phase I)"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_CRS",
      evidence_source: "MeitY Compulsory Registration Scheme Phase I S.O. 2357(E) Item 15; BEE Mandatory Star Labeling for LED Lamps",
      source_url: "https://www.meity.gov.in/esdm/standards",
      evidence_excerpt: "Schedule Entry 15: Self-ballasted LED lamps and tubular LED retrofits covered under IS 16102 (Part 1).",
      applicability_explanation: "Primary mandatory national safety standard for self-ballasted LED batten tubes under MeitY CRS.",
      confidence_score: 0.99
    },
    investigation_notes: "Mandatory under MeitY CRS Phase I and BEE Star Labeling."
  },
  {
    canonical_name: "LED Floodlights for Stadiums",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 10322 (Part 5/Sec 5):2013",
    new_standard: {
      is_number: "IS 10322 (Part 5/Sec 5):2013",
      title: "Luminaires: Part 5 Particular Requirements: Section 5 Floodlights (First Revision)",
      publication_year: 2013,
      version: "First Revision (Reaffirmed 2018)",
      status: "ACTIVE",
      technical_committee: "ETD 24",
      division_council: "Electrotechnical",
      scope: "Specifies requirements for floodlighting luminaires used for exterior sports stadiums, building facades, and industrial yards.",
      materials: "Die-cast aluminium alloy body with powder coated anti-corrosive finish, toughened glass cover, optical lenses, stainless steel mounting bracket.",
      technical_requirements: "Power ratings 200W to 1200W; surge protection 10 kV/10 kA; IP66 weatherproof enclosure; optical beam angles 15, 30, 60 degrees; CRI >= 80.",
      performance_requirements: "High lumen output up to 150,000 lm; wind load resistance up to 55 m/s; thermal management with Tc <= 75 deg C; no flickering for high-speed broadcast.",
      testing_requirements: "Goniophotometer luminous distribution test; IP66 water jet test per IS/IEC 60529; wind resistance mechanical proof test.",
      certification: "Scheme-II",
      source: "Bureau of Indian Standards ETD 24 (Mandatory under MeitY CRS Phase III)"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_CRS",
      evidence_source: "MeitY Compulsory Registration Scheme Phase III Item 35; BIS Product Manual PM/IS 10322/5/5",
      source_url: "https://www.meity.gov.in/esdm/standards",
      evidence_excerpt: "Schedule Entry 35: Floodlights covered under IS 10322 (Part 5/Sec 5).",
      applicability_explanation: "Primary mandatory standard for high-power LED floodlights under MeitY CRS.",
      confidence_score: 0.99
    },
    investigation_notes: "Mandatory under MeitY CRS Phase III."
  },
  {
    canonical_name: "LED Highbay Industrial Lights",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 10322 (Part 5/Sec 1):2012",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_CRS",
      evidence_source: "MeitY Compulsory Registration Scheme Phase III Item 34; BIS Product Manual PM/IS 10322/5/1",
      source_url: "https://www.meity.gov.in/esdm/standards",
      evidence_excerpt: "Schedule Entry 34: Fixed general purpose luminaires including industrial highbay luminaires under IS 10322 (Part 5/Sec 1).",
      applicability_explanation: "Primary mandatory standard for industrial LED highbay and lowbay lighting luminaires.",
      confidence_score: 0.99
    },
    investigation_notes: "IS 10322 (Part 5/Sec 1) exists in DB (Standard ID 278); mandated under MeitY CRS."
  },
  {
    canonical_name: "Lighting Automation Sensors",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS/IEC 60669-2-1:2008",
    new_standard: {
      is_number: "IS/IEC 60669-2-1:2008",
      title: "Switches for Household and Similar Fixed Electrical Installations: Part 2 Particular Requirements, Section 1 Electronic Switches",
      publication_year: 2008,
      version: "Second Revision (Reaffirmed 2019)",
      status: "ACTIVE",
      technical_committee: "ETD 31",
      division_council: "Electrotechnical",
      scope: "Specifies requirements for electronic switches, passive infrared (PIR) occupancy sensors, microwave motion detectors, and daylight sensors for automated lighting control.",
      materials: "Flame-retardant thermoplastic housing (UL94 V-0), solid-state semiconductor triac or relay switching contact, Fresnel infrared optical lens.",
      technical_requirements: "Supply voltage 230V ac at 50 Hz; switching capacity up to 10A LED load; detection coverage 360 degrees up to 10 m range; adjustable time delay 10 s to 30 min.",
      performance_requirements: "Endurance life minimum 40,000 switching operations; standby power consumption <= 0.5W; EMC immunity against electrical bursts.",
      testing_requirements: "Electrical endurance test under inrush current of LED drivers per IS/IEC 60669-2-1; thermal cycling test; detection pattern verification.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards ETD 31 (Identical to IEC 60669-2-1)"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "Energy Conservation Building Code (ECBC) Lighting Automation Controls Clause 5.3; BIS ETD 31 Standards",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_IEC_60669_2_1",
      evidence_excerpt: "Clause 1.1: Covers electronic switches and motion/light sensors for automatic control of lighting in buildings.",
      applicability_explanation: "Primary national product standard for PIR and microwave occupancy and daylight lighting automation sensors.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by ETD 31; standard specified under ECBC building automation rules."
  },
  {
    canonical_name: "Medium Voltage XLPE Power Cables 11kV/33kV",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 7098 (Part 2):2011",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DPIIT Electrical Wires and Cables QCO S.O. 280(E); BIS Product Manual PM/IS 7098/2; Central Electricity Authority Grid Standards",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_7098_2",
      evidence_excerpt: "Clause 1.1: Covers requirements for crosslinked polyethylene (XLPE) insulated cables for working voltages from 3.3 kV up to and including 33 kV.",
      applicability_explanation: "Primary national standard for medium voltage 11kV and 33kV XLPE power distribution cables, mandatory under national QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "IS 7098 (Part 2):2011 exists in DB (Standard ID 277); mandatory under DPIIT QCO."
  },
  {
    canonical_name: "Metallic Cable Trays (Perforated/Ladder)",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS/IEC 61537:2006",
    new_standard: {
      is_number: "IS/IEC 61537:2006",
      title: "Cable Management — Cable Tray Systems and Cable Ladder Systems",
      publication_year: 2006,
      version: "Original Edition (Reaffirmed 2019)",
      status: "ACTIVE",
      technical_committee: "ETD 35",
      division_council: "Electrotechnical",
      scope: "Specifies requirements and tests for cable tray systems and cable ladder systems for the support and accommodation of electrical cables.",
      materials: "Pre-galvanized mild steel sheet, hot-dip galvanized steel per IS 4759 (coating thickness minimum 65 micron), or stainless steel AISI 304.",
      technical_requirements: "Widths 50 mm to 1000 mm; side rail heights 50 mm, 75 mm, 100 mm; sheet thickness 1.6 mm, 2.0 mm, 2.5 mm; ladder rung spacing 250 mm.",
      performance_requirements: "Safe working load (SWL) capacity with maximum deflection <= 1/100 of support span under full cable weight; electrical earthing continuity <= 0.05 ohms/m.",
      testing_requirements: "Safe working load test on two-span continuous test rig per IS/IEC 61537 Clause 10; electrical continuity test; salt spray corrosion test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards ETD 35 Cable Management Committee (Identical to IEC 61537)"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS/IEC 61537; Central Electricity Authority (CEA) Technical Standards Clause 54; CPWD Subhead 4 Clause 4.10",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_IEC_61537",
      evidence_excerpt: "Clause 1.1: Specifies requirements and tests for metallic cable tray and ladder systems for routing power and control cables in industrial plants.",
      applicability_explanation: "Primary national standard for perforated and ladder type metallic cable tray support systems.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by ETD 35; universal standard for industrial cable management."
  },
  {
    canonical_name: "Microprocessor Numerical Feeder Protection Relays",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS/IEC 60255-1:2009",
    new_standard: {
      is_number: "IS/IEC 60255-1:2009",
      title: "Measuring Relays and Protection Equipment: Part 1 Common Requirements",
      publication_year: 2009,
      version: "Original Edition (Reaffirmed 2019)",
      status: "ACTIVE",
      technical_committee: "ETD 31",
      division_council: "Electrotechnical",
      scope: "Specifies common performance, electrical safety, and electromagnetic compatibility requirements for digital and numerical protection relays used in electrical power grids.",
      materials: "19-inch rack mount metal chassis, DSP microprocessor architecture, optical fiber and Ethernet communication ports (IEC 61850 protocol).",
      technical_requirements: "Protection functions: Overcurrent (50/51), earth fault (50N/51N), thermal overload (49), directional overcurrent (67); auxiliary supply 24V to 250V dc; current input 1A or 5A CT.",
      performance_requirements: "Operating time accuracy within +/- 5% or 10 ms; transient overreach <= 5%; reset ratio >= 0.95; high-speed tripping contact operation <= 15 ms.",
      testing_requirements: "Dielectric insulation test at 2.0 kV; impulse voltage withstand test (5 kV); EMC immunity against 1 MHz burst and electrostatic discharge per IEC 60255-26.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards ETD 31 Relays Committee (Identical to IEC 60255-1)"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_STATUTORY",
      evidence_source: "Central Electricity Authority (Technical Standards for Connectivity to the Grid) Regulations; Power Grid Corporation Numerical Relay Specifications",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_IEC_60255_1",
      evidence_excerpt: "Clause 1.1: Specifies common requirements for measuring relays and protection equipment for power systems.",
      applicability_explanation: "Primary national standard for microprocessor-based numerical feeder protection relays.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by ETD 31; mandatory under CEA Grid Regulations for power substation protection."
  },
  {
    canonical_name: "Modular Domestic Switches (6A/16A)",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 3854:1997",
    new_standard: {
      is_number: "IS 3854:1997",
      title: "Switches for Domestic and Similar Purposes — Specification (Second Revision)",
      publication_year: 1997,
      version: "Second Revision (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "ETD 31",
      division_council: "Electrotechnical",
      scope: "Specifies requirements for manually operated general purpose switches (piano and modular flush switches) for ac circuits up to 250V and rated current up to 16A.",
      materials: "Flame-retardant polybutylene terephthalate (PBT) or polycarbonate molding, silver-cadmium oxide contacts, phosphor bronze contact springs, brass terminal screws.",
      technical_requirements: "Current ratings 6A, 10A, 16A, 20A, 25A; rated voltage 250V ac; 1-way and 2-way switching; modular snap-in grid mounting.",
      performance_requirements: "Making and breaking capacity: 200 operations at 1.25 times rated current and 1.1 times rated voltage; normal operational endurance 40,000 operations without contact welding; temperature rise <= 45 K on terminals.",
      testing_requirements: "Electrical endurance test on automated switching machine per IS 3854 Clause 18; glow wire test at 850 deg C; insulation resistance test at 500V; tracking resistance test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards ETD 31 Wiring Accessories Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DPIIT Electrical Wires, Cables, Appliances and Protection Devices (Quality Control) Order, 2003 S.O. 189(E) Schedule Serial No. 3; BIS Product Manual PM/IS 3854/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_3854",
      evidence_excerpt: "S.O. 189(E) Schedule Serial 3: Switches for domestic and similar purposes covered under IS 3854.",
      applicability_explanation: "Primary national product standard for modular and piano domestic electrical switches, mandatory under S.O. 189(E) QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Mandatory under DPIIT Electrical Accessories Quality Control Order 2003 S.O. 189(E) Schedule Serial 3."
  },
  {
    canonical_name: "Oil-Filled Room Radiators (OFR)",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 302 (Part 2/Sec 30):2007",
    new_standard: {
      is_number: "IS 302 (Part 2/Sec 30):2007",
      title: "Safety of Household and Similar Electrical Appliances: Part 2 Particular Requirements, Section 30 Room Heaters",
      publication_year: 2007,
      version: "Second Revision (Reaffirmed 2018)",
      status: "ACTIVE",
      technical_committee: "ETD 32",
      division_council: "Electrotechnical",
      scope: "Specifies electrical and fire safety requirements for electric room heaters including oil-filled radiators (OFR 9-fin, 11-fin, 13-fin), fan heaters, and radiant heaters for household use.",
      materials: "Welded stamped steel heating fins filled with mineral di-electric heat transfer oil, nickel-chromium heating element, safety tip-over switch, thermostat.",
      technical_requirements: "Input power 1000W to 2500W; rated voltage 230V single phase; dual heat settings; thermal cut-out with automatic reset; tip-over tilt safety switch.",
      performance_requirements: "Electrical leakage current <= 0.75 mA; high voltage breakdown test 1.5 kV ac; surface temperature limits on handles <= 60 deg C; automatic power cutoff when tilted by 15 degrees.",
      testing_requirements: "Abnormal operation test (draped towel fire hazard test) per IS 302 (Part 2/Sec 30); tip-over test; oil expansion pressure test; stability test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards ETD 32 Electrical Appliances Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DPIIT Electrical Appliances (Quality Control) Order, 2003 S.O. 189(E) Schedule Serial No. 11; BIS Product Manual PM/IS 302/2/30",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_302_2_30",
      evidence_excerpt: "S.O. 189(E) Schedule Serial 11: Electric room heaters covered under IS 302-2-30.",
      applicability_explanation: "Primary national product safety standard for domestic oil-filled room radiators and electric room heaters, mandatory under S.O. 189(E) QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Mandatory under DPIIT Electrical Appliances Quality Control Order 2003 S.O. 189(E) Schedule Serial 11."
  },
  {
    canonical_name: "Optical Fibre Telecommunication Cables",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 14927 (Part 1):2001",
    new_standard: {
      is_number: "IS 14927 (Part 1):2001",
      title: "Optical Fibre Cables: Part 1 Generic Specification (First Revision)",
      publication_year: 2001,
      version: "First Revision (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "ETD 35",
      division_council: "Electrotechnical",
      scope: "Specifies requirements and test procedures for optical fibre telecommunication cables (duct, armoured underground, aerial ADSS) for communication networks.",
      materials: "Single-mode ITU-T G.652D silica glass optical fibres, thixotropic jelly filling, loose PBT buffer tubes, FRP central strength member, corrugated steel tape armour, HDPE outer jacket.",
      technical_requirements: "Fibre counts 6F to 288F; attenuation at 1310 nm <= 0.36 dB/km, at 1550 nm <= 0.22 dB/km; chromatic dispersion <= 18 ps/(nm.km) at 1550 nm.",
      performance_requirements: "Tensile load performance without fibre strain; crush resistance >= 2.0 kN/100 mm; water penetration resistance: zero water leakage through 1 m sample under 1 m head for 24 hours.",
      testing_requirements: "Optical attenuation measurement using OTDR per IS 14927 (Part 1); tensile load test; repeated bending test; temperature cycling test -40 to +70 deg C.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards ETD 35 (Aligned with IEC 60794-1)"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_STATUTORY",
      evidence_source: "DoT Telecommunication Engineering Centre (TEC) Generic Requirements for Optical Fibre Cables; BharatNet Tender Specifications; BIS ETD 35",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_14927_1",
      evidence_excerpt: "Clause 1.1: Covers generic specification, mechanical, environmental, and transmission testing of optical fibre telecommunication cables.",
      applicability_explanation: "Primary national product standard for optical fibre telecommunication cables used in broadband and telecom backbones.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by ETD 35; universal technical standard in BharatNet and telecom rollouts."
  },
  {
    canonical_name: "Plugs and Socket Outlets",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 1293:2019",
    new_standard: {
      is_number: "IS 1293:2019",
      title: "Plugs and Socket-Outlets for Household and Similar Purposes of Rated Voltage Up to and Including 250 V and Rated Current Up to and Including 16 A — Specification (Fourth Revision)",
      publication_year: 2019,
      version: "Fourth Revision",
      status: "ACTIVE",
      technical_committee: "ETD 31",
      division_council: "Electrotechnical",
      scope: "Specifies requirements for 2-pin and 3-pin plugs and fixed or portable socket-outlets for ac circuits up to 250V and rated current up to 16A.",
      materials: "Flame-retardant urea formaldehyde or polycarbonate molding, brass contact pins and sleeves with nickel plating, child-safety shutter mechanism.",
      technical_requirements: "Current ratings 2.5A, 6A, 16A; solid brass earth pin longer than live/neutral pins; socket with integral safety shutter.",
      performance_requirements: "Making and breaking test: 50 cycles at 1.25 times rated current; operational endurance 10,000 insertions; temperature rise <= 45 K on terminal screws; withdrawal force within specified limits.",
      testing_requirements: "Endurance insertion test rig per IS 1293 Clause 20; withdrawal force gauge test; glow wire test at 850 deg C; tracking resistance test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards ETD 31 Wiring Accessories Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DPIIT Electrical Accessories (Quality Control) Order S.O. 189(E) Schedule Serial No. 4; BIS Product Manual PM/IS 1293/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_1293",
      evidence_excerpt: "S.O. 189(E) Schedule Serial 4: Plugs and socket-outlets for household and similar purposes covered under IS 1293.",
      applicability_explanation: "Primary national product standard for household electrical plugs and socket-outlets, mandatory under S.O. 189(E) QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Mandatory under DPIIT Electrical Accessories Quality Control Order 2003 S.O. 189(E) Schedule Serial 4."
  },
  {
    canonical_name: "Rigid PVC Electrical Conduits",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 9537 (Part 3):1983",
    new_standard: {
      is_number: "IS 9537 (Part 3):1983",
      title: "Conduits for Electrical Installations — Specification: Part 3 Rigid Plain Conduits of Insulating Material (First Revision)",
      publication_year: 1983,
      version: "First Revision (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "ETD 31",
      division_council: "Electrotechnical",
      scope: "Specifies requirements for rigid non-metallic polyvinyl chloride (uPVC) smooth bore conduits used for electrical wiring in residential and commercial buildings.",
      materials: "Unplasticized polyvinyl chloride (uPVC) polymer compound, flame-retardant and UV stabilized.",
      technical_requirements: "Mechanical classifications: Light mechanical duty (LMS), Medium (MMS), and Heavy (HMS); outside diameters 16 mm, 20 mm, 25 mm, 32 mm, 40 mm, 50 mm.",
      performance_requirements: "Compression resistance: withstands 750 N (Medium) or 1250 N (Heavy) without cracking; impact resistance at 0 deg C; flame retardancy (burn length <= 50 mm); dielectric strength 2 kV for 15 minutes.",
      testing_requirements: "Compression test between steel plates per IS 9537 (Part 3); cold impact test with falling hammer; flammability burner test; electrical breakdown test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards ETD 31 Conduits Sectional Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DPIIT Electrical Conduits (Quality Control) Order S.O. 4387(E); BIS Product Manual PM/IS 9537/3; CPWD Electrical Specifications Subhead 4 Clause 4.1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_9537_3",
      evidence_excerpt: "Clause 1.1: Covers requirements for rigid non-metallic conduits for protection of electrical wiring in electrical installations.",
      applicability_explanation: "Primary national product standard for rigid uPVC electrical conduit pipes, mandatory under national QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by ETD 31; mandatory under DPIIT Electrical Conduits Quality Control Order."
  },
  {
    canonical_name: "Rigid Steel Conduits for Wiring",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 9537 (Part 2):1981",
    new_standard: {
      is_number: "IS 9537 (Part 2):1981",
      title: "Conduits for Electrical Installations — Specification: Part 2 Rigid Steel Conduits (First Revision)",
      publication_year: 1981,
      version: "First Revision (Reaffirmed 2021)",
      status: "ACTIVE",
      technical_committee: "ETD 31",
      division_council: "Electrotechnical",
      scope: "Specifies requirements for threaded and non-threaded rigid steel conduits with black enameled or hot-dip galvanized finish used for electrical wiring installations.",
      materials: "Cold rolled mild steel tube with continuous electric resistance longitudinal weld.",
      technical_requirements: "Outside diameters 16 mm, 20 mm, 25 mm, 32 mm, 40 mm, 50 mm; wall thickness 1.2 mm to 2.0 mm; metric ISO conduit threads; zinc coating >= 300 g/m2.",
      performance_requirements: "Heavy mechanical strength classification (withstands 4000 N compression); bending test around mandrel 6 times diameter without weld seam splitting; electrical continuity resistance <= 0.05 ohms.",
      testing_requirements: "Compression proof test per IS 9537 (Part 2); reverse bend test; copper sulphate dip test for zinc adherence; internal burr freedom check.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards ETD 31 Conduits Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DPIIT Electrical Conduits (Quality Control) Order S.O. 4387(E); BIS Product Manual PM/IS 9537/2; CPWD Electrical Specifications Subhead 4 Clause 4.2",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_9537_2",
      evidence_excerpt: "Clause 1.1: Covers requirements for rigid steel conduits with stove enameled or galvanized protection for surface and concealed electrical wiring.",
      applicability_explanation: "Primary national product standard for rigid metallic steel electrical wiring conduits, mandatory under national QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by ETD 31; covered under national Quality Control Order."
  },
  {
    canonical_name: "Rubber Insulated Trailing Cables",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 9968 (Part 1):1988",
    new_standard: {
      is_number: "IS 9968 (Part 1):1988",
      title: "Elastomer Insulated Cables: Part 1 For Working Voltages Up to and Including 1100 V (First Revision)",
      publication_year: 1988,
      version: "First Revision (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "ETD 35",
      division_council: "Electrotechnical",
      scope: "Specifies requirements for flexible rubber (elastomeric) insulated and sheathed trailing power cables for electric arc welders, mobile cranes, mines, and portable industrial equipment.",
      materials: "Tinned flexible copper conductor Class 5 conforming to IS 8130, ethylene propylene rubber (EPR) insulation, heavy duty chloroprene (PCP / Neoprene) or CSP outer sheath.",
      technical_requirements: "Rated voltage up to 1100V; temperature rating -25 deg C to +90 deg C; flexible multi-core configurations.",
      performance_requirements: "High flexibility withstanding 20,000 continuous reverse bending cycles without wire breakage; oil resistance; flame retardance; tear resistance.",
      testing_requirements: "Two-pulley flexing test on automated carriage per IS 10810 (Part 54); oil immersion test; spark test at 6 kV; tensile strength of elastomer.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards ETD 35 Power Cables Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DPIIT Electrical Wires and Cables QCO 2003 S.O. 189(E) Schedule Serial No. 17; BIS Product Manual PM/IS 9968/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_9968_1",
      evidence_excerpt: "S.O. 189(E) Schedule Serial 17: Elastomer insulated cables for working voltages up to and including 1100V covered under IS 9968 (Part 1).",
      applicability_explanation: "Primary national product standard for rubber insulated trailing and welding cables, mandatory under S.O. 189(E) QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by ETD 35; mandatory under DPIIT Cables Quality Control Order S.O. 189(E) Schedule Serial 17."
  },
  {
    canonical_name: "Solar Charge Controllers (MPPT/PWM)",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 16221 (Part 2):2015",
    new_standard: {
      is_number: "IS 16221 (Part 2):2015",
      title: "Safety of Power Converters for Use in Photovoltaic Power Systems: Part 2 Particular Requirements for Inverters and Charge Controllers",
      publication_year: 2015,
      version: "Original Edition",
      status: "ACTIVE",
      technical_committee: "ETD 28",
      division_council: "Electrotechnical",
      scope: "Specifies electrical, thermal, and functional safety requirements for solar charge controllers (PWM and MPPT) and grid-tied/off-grid inverters used in photovoltaic power systems.",
      materials: "Industrial electronic power converter assembly, MOSFET/IGBT switching bridge, microprocessor controller, aluminum heatsink enclosure.",
      technical_requirements: "System DC voltages 12V, 24V, 48V, up to 150V DC array input; maximum power point tracking (MPPT) algorithm; battery charge stages (bulk, absorption, float, equalization).",
      performance_requirements: "MPPT tracking efficiency >= 98%; conversion efficiency >= 96%; reverse current protection, battery overcharge, deep discharge, and short circuit protection.",
      testing_requirements: "MPPT dynamic tracking test per EN 50530 / IS 16221; high voltage dielectric insulation test; environmental heat and humidity cycling test.",
      certification: "Scheme-II",
      source: "Bureau of Indian Standards ETD 28 Solar Photovoltaic Committee (Mandatory under MNRE Quality Control Order)"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_STATUTORY",
      evidence_source: "Ministry of New and Renewable Energy (MNRE) Solar Photovoltaics, Systems, Devices and Components (Quality Control) Order S.O. 3449(E); BIS Product Manual PM/IS 16221",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_16221_2",
      evidence_excerpt: "Schedule Entry: Power converters including solar charge controllers and inverters covered under IS 16221 (Part 2).",
      applicability_explanation: "Primary mandatory national standard for solar MPPT and PWM charge controllers under MNRE Solar Quality Control Order.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by ETD 28; mandatory under MNRE Solar Photovoltaics Quality Control Order."
  },
  {
    canonical_name: "Solar DC Cables (1.5 kV)",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 17293:2020",
    new_standard: {
      is_number: "IS 17293:2020",
      title: "Electric Cables for Photovoltaic Systems with a Voltage Rating of 1.5 kV DC — Specification",
      publication_year: 2020,
      version: "Original Edition",
      status: "ACTIVE",
      technical_committee: "ETD 35",
      division_council: "Electrotechnical",
      scope: "Specifies requirements for cross-linked halogen-free insulated and sheathed flexible single-core DC cables rated at 1.5 kV DC (between conductors) for utility-scale and rooftop solar PV installations.",
      materials: "Tinned flexible annealed copper conductor Class 5 per IS 8130, cross-linked polyolefin (XLPO) halogen-free insulation and outer sheath.",
      technical_requirements: "Conductor cross-sections 2.5 mm2 to 240 mm2; voltage rating 1.5 kV DC (1.8 kV max); temperature rating -40 deg C to +120 deg C (20,000 hours service life).",
      performance_requirements: "UV and ozone resistance per EN 50396; flame retardant per IS 10810 (Part 53); acid and alkali resistance; low smoke zero halogen (LSZH) emission.",
      testing_requirements: "Accelerated thermal endurance test per IEC 60216; UV weathering test; dynamic penetration test with sharp blade; cold impact test at -40 deg C.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards ETD 35 Power Cables Committee (Harmonized with EN 50618)"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_STATUTORY",
      evidence_source: "Ministry of New and Renewable Energy (MNRE) Solar Technical Specifications; Solar Energy Corporation of India (SECI) EPC Guidelines; BIS Product Manual PM/IS 17293",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_17293",
      evidence_excerpt: "Clause 1.1: Covers requirements for single-core cross-linked insulated cables rated for 1.5 kV DC for interconnection of solar photovoltaic arrays.",
      applicability_explanation: "Primary national product standard for 1.5 kV DC solar photovoltaic cables.",
      confidence_score: 0.99
    },
    investigation_notes: "Enacted by ETD 35 in 2020; mandatory in all grid-connected solar power plants."
  },
  {
    canonical_name: "Solar Water Pumping Systems (Surface and Submersible)",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 17018:2018",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_STATUTORY",
      evidence_source: "Ministry of New and Renewable Energy (MNRE) PM-KUSUM Scheme Specifications; BIS Product Manual PM/IS 17018/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_17018",
      evidence_excerpt: "Clause 1.1: Covers technical specifications and performance testing methods for solar photovoltaic water pumping systems.",
      applicability_explanation: "Primary national standard for solar photovoltaic surface and submersible agricultural water pumping systems.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by ETD 28; mandatory under nationwide PM-KUSUM scheme."
  },
  {
    canonical_name: "Static Automatic Transfer Switches (STS)",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS/IEC 62310-1:2005",
    new_standard: {
      is_number: "IS/IEC 62310-1:2005",
      title: "Static Transfer Systems (STS): Part 1 General and Safety Requirements",
      publication_year: 2005,
      version: "Original Edition (Reaffirmed 2019)",
      status: "ACTIVE",
      technical_committee: "ETD 31",
      division_council: "Electrotechnical",
      scope: "Specifies safety and operational requirements for solid-state static automatic transfer systems (STS) used for seamless high-speed power transfer between independent AC sources in data centers and hospitals.",
      materials: "Solid-state silicon controlled rectifiers (SCR / Thyristor) power switching bridges, microprocessor control unit, dual redundant power supplies.",
      technical_requirements: "Current ratings 100A to 1200A; voltage 415V three phase; transfer time <= 4 ms (quarter cycle) without phase overlap; break-before-make transition.",
      performance_requirements: "Zero disruption to IT power supplies (CBEMA / ITIC curve compliance); short-circuit withstand rating 50 kA for 100 ms; efficiency >= 99%.",
      testing_requirements: "High-speed transient transfer time verification on storage oscilloscope per IS/IEC 62310-1; overload test; dielectric withstand test (2.5 kV).",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards ETD 31 Low Voltage Switchgear Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "VOLUNTARY_SCHEME_I",
      evidence_source: "BIS Product Manual PM/IS/IEC 62310; Data Center Infrastructure Tier Standard (Uptime Institute / TIA-942)",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_IEC_62310_1",
      evidence_excerpt: "Clause 1.1: Covers general and safety requirements for static transfer systems ensuring continuity of load supply through controlled source transfer.",
      applicability_explanation: "Primary national product standard for solid-state static automatic transfer switches (STS).",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by ETD 31; standard equipment in mission-critical data center power architecture."
  },
  {
    canonical_name: "Station Class High Voltage Surge Arresters 33kV",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 15086 (Part 4):2014",
    new_standard: {
      is_number: "IS 15086 (Part 4):2014",
      title: "Surge Arresters: Part 4 Metal-Oxide Surge Arresters Without Gaps for A.C. Systems (First Revision)",
      publication_year: 2014,
      version: "First Revision (Reaffirmed 2019)",
      status: "ACTIVE",
      technical_committee: "ETD 30",
      division_council: "Electrotechnical",
      scope: "Specifies requirements for gapless zinc-oxide (ZnO) surge arresters for protection of 11kV, 33kV, 66kV, 132kV, and higher voltage AC electrical power networks against lightning and switching surges.",
      materials: "Non-linear metal oxide (zinc oxide ZnO) varistor blocks, silicon rubber composite polymer housing or porcelain insulator housing, pressure relief diaphragm.",
      technical_requirements: "Rated voltage 30 kV for 33kV system; nominal discharge current 10 kA (Class 1 / Class 2); line discharge class 2; continuous operating voltage (MCOV) 24 kV.",
      performance_requirements: "Residual voltage at 10 kA steep current impulse <= 85 kV; high current impulse withstand (2 x 100 kA); pressure relief capability without violent shattering.",
      testing_requirements: "High-current impulse test at CPRI / ERDA high-voltage lab per IS 15086 (Part 4); residual voltage test; partial discharge test (< 10 pC); cantilevering mechanical load test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards ETD 30 Surge Arresters Committee (Identical to IEC 60099-4)"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_STATUTORY",
      evidence_source: "Central Electricity Authority (CEA) Technical Standards for Construction of Electrical Substations Clause 43; State Electricity Transmission Utilities Standards",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_15086_4",
      evidence_excerpt: "Clause 1.1: Specifies requirements for gapless metal-oxide surge arresters for protection of high-voltage transmission and distribution power substations.",
      applicability_explanation: "Primary national product standard for station-class gapless zinc-oxide surge arresters on 33kV power networks.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by ETD 30; mandatory in all grid power substation installations."
  },
  {
    canonical_name: "Stationary Lead-Acid Batteries (Tubular and VRLA)",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 1651:2013",
    new_standard: {
      is_number: "IS 1651:2013",
      title: "Stationary Cells and Batteries, Lead-Acid Type (with Tubular Positive Plates) — Specification (Fourth Revision)",
      publication_year: 2013,
      version: "Fourth Revision (Reaffirmed 2018)",
      status: "ACTIVE",
      technical_committee: "ETD 11",
      division_council: "Electrotechnical",
      scope: "Specifies requirements for stationary lead-acid cells and batteries with tubular positive plates in transparent or hard rubber containers for power substations and UPS backup.",
      materials: "Spine grid antimony-lead alloy with gauntlet tube containing lead dioxide active material; dilute sulphuric acid electrolyte (specific gravity 1.200 to 1.215).",
      technical_requirements: "Capacities 20 Ah to 5000 Ah at 10-hour discharge rate (C10); nominal cell voltage 2.0V; ceramic vent plugs with flame arrestor.",
      performance_requirements: "Ampere-hour efficiency >= 90%; watt-hour efficiency >= 75%; deep discharge cyclic life minimum 1500 cycles at 80% DOD; float life 15 to 20 years.",
      testing_requirements: "C10 capacity verification test per IS 1651 Clause 8; life cycle endurance test; float charge stability test; internal resistance check.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards ETD 11 Secondary Cells and Batteries Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "Ministry of Environment, Forest and Climate Change Battery Waste Management Rules 2022; BIS Product Manual PM/IS 1651/1; CEA Substation DC Power Standards",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_1651",
      evidence_excerpt: "Clause 1.1: Covers requirements for stationary lead-acid batteries with tubular positive plates used in power generating stations, substations, and telecommunications.",
      applicability_explanation: "Primary national product standard for stationary tubular lead-acid storage battery banks.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by ETD 11; standard DC backup power in power utilities."
  },
  {
    canonical_name: "Submersible Flat Cables",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 694:2010",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DPIIT Electrical Wires and Cables QCO 2003 S.O. 189(E) Schedule Serial No. 20; BIS Product Manual PM/IS 694/5 Section 3.4",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_694",
      evidence_excerpt: "S.O. 189(E) Schedule Serial 20: 3-core flat PVC insulated and sheathed submersible pump cables for working voltages up to 1100V.",
      applicability_explanation: "Primary national standard for PVC insulated 3-core flat submersible pump cables, mandatory under S.O. 189(E) QCO.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS 694:2010 Schedule Serial 20."
  },
  {
    canonical_name: "Surge Protective Devices (Type 1 and Type 2 SPD)",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS/IEC 61643-11:2011",
    new_standard: {
      is_number: "IS/IEC 61643-11:2011",
      title: "Low-Voltage Surge Protective Devices: Part 11 Surge Protective Devices Connected to Low-Voltage Power Systems — Requirements and Test Methods",
      publication_year: 2011,
      version: "Original Edition (Reaffirmed 2019)",
      status: "ACTIVE",
      technical_committee: "ETD 30",
      division_council: "Electrotechnical",
      scope: "Specifies performance, electrical safety, and testing requirements for Type 1, Type 2, and Type 3 surge protective devices (SPDs) connected to 50 Hz ac power circuits up to 1000V.",
      materials: "High-energy zinc oxide varistors (MOV), spark gap / gas discharge tube (GDT), thermal disconnector, flame-retardant DIN rail housing.",
      technical_requirements: "Type 1: Lightning impulse current Iimp (10/350 microsec) >= 12.5 kA per pole; Type 2: Nominal discharge current In (8/20 microsec) >= 20 kA; voltage protection level Up <= 1.5 kV.",
      performance_requirements: "Safe thermal disconnection under end-of-life condition without arc fire; short-circuit current rating (ISCCR) up to 50 kA; visual trip indicator.",
      testing_requirements: "Class I and Class II impulse discharge tests per IS/IEC 61643-11; thermal stability test; temporary overvoltage (TOV) withstand test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards ETD 30 (Identical to IEC 61643-11)"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_STATUTORY",
      evidence_source: "Central Electricity Authority (Safety Requirements for Construction, Operation and Maintenance) Regulations Clause 42; National Electrical Code 2023 Part 1 Section 8",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_IEC_61643_11",
      evidence_excerpt: "Clause 1.1: Covers requirements and test methods for low-voltage surge protective devices against lightning surges and electrical switching transients.",
      applicability_explanation: "Primary national product standard for low-voltage Type 1 and Type 2 electrical surge protective devices (SPD).",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by ETD 30; mandated under NEC 2023 and CEA electrical safety rules."
  },
  {
    canonical_name: "Thermal Bimetallic Motor Overload Relays",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS/IEC 60947-4-1:2012",
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_QCO",
      evidence_source: "DPIIT Low Voltage Switchgear QCO S.O. 4386(E); BIS Product Manual PM/IS/IEC 60947-4-1 Clause 5.7",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_IEC_60947_4_1",
      evidence_excerpt: "Clause 5.7: Thermal bimetallic overload relays with phase failure sensitivity for motor branch protection.",
      applicability_explanation: "Primary national standard for thermal bimetallic motor overload protection relays.",
      confidence_score: 0.99
    },
    investigation_notes: "Covered under IS/IEC 60947-4-1:2012."
  },
  {
    canonical_name: "Tubular Flooded Lead-Acid Solar Batteries",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 13369:1992",
    new_standard: {
      is_number: "IS 13369:1992",
      title: "Stationary Lead-Acid Batteries with Tubular Positive Plates in Transparent Containers — Specification",
      publication_year: 1992,
      version: "Original Edition (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "ETD 11",
      division_council: "Electrotechnical",
      scope: "Specifies requirements for deep-cycle stationary lead-acid batteries with tubular positive plates housed in transparent SAN / polypropylene containers for solar PV systems.",
      materials: "Lead-antimony-selenium alloy spine grid, polyester gauntlet tubes, microporous polyethylene separators, transparent SAN jar.",
      technical_requirements: "C10 rated capacities 40 Ah to 2000 Ah; electrolyte specific gravity 1.240 at 27 deg C; vent plugs with ceramic filter.",
      performance_requirements: "Cycle life >= 1500 cycles at 80% depth of discharge; self-discharge rate <= 3% per month; ampere-hour efficiency >= 90%.",
      testing_requirements: "Cycle life endurance test per IS 13369 Clause 8; capacity check at C10 and C20 rates; loss of capacity on storage test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards ETD 11 Secondary Cells Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_STATUTORY",
      evidence_source: "Ministry of New and Renewable Energy (MNRE) Off-Grid Solar Power System Guidelines; BIS Product Manual PM/IS 13369/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_13369",
      evidence_excerpt: "Clause 1.1: Covers requirements for stationary lead-acid tubular batteries in transparent containers for telecommunications and solar power systems.",
      applicability_explanation: "Primary national product standard for solar deep-cycle tubular flooded lead-acid batteries.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by ETD 11; standard storage battery in off-grid solar systems."
  },
  {
    canonical_name: "Valve Regulated Lead Acid (VRLA) Gel Batteries",
    council: "ETD",
    status: "VERIFIED_PRIMARY",
    standard_is: "IS 15549:2005",
    new_standard: {
      is_number: "IS 15549:2005",
      title: "Stationary Valve Regulated Lead-Acid Batteries — Specification",
      publication_year: 2005,
      version: "Original Edition (Reaffirmed 2020)",
      status: "ACTIVE",
      technical_committee: "ETD 11",
      division_council: "Electrotechnical",
      scope: "Specifies requirements for maintenance-free stationary valve-regulated lead-acid (VRLA) batteries using absorbed glass mat (AGM) or thixotropic gelled electrolyte.",
      materials: "Lead-calcium-tin high-purity alloy grids, AGM separator or fumed silica gel electrolyte, self-resealing neoprene safety relief valve, ABS flame-retardant jar.",
      technical_requirements: "Capacities 100 Ah to 3000 Ah at C10 rate; internal gas recombination efficiency >= 95%; float charging voltage 2.23V to 2.27V per cell at 27 deg C.",
      performance_requirements: "Zero electrolyte leakage; thermal runaway resistance; cyclic endurance 1200 cycles at 80% DOD; design float life 10 to 12 years.",
      testing_requirements: "Gas emission measurement test per IS 15549 Clause 7; short-circuit current and internal resistance test; high-rate discharge test.",
      certification: "Scheme-I",
      source: "Bureau of Indian Standards ETD 11 Secondary Cells and Batteries Committee"
    },
    mapping: {
      relationship_type: "primary_specification",
      mandatory_status: "MANDATORY_STATUTORY",
      evidence_source: "DoT TEC Generic Requirements for VRLA Batteries; Ministry of Power Substation Telecom Guidelines; BIS Product Manual PM/IS 15549/1",
      source_url: "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_15549",
      evidence_excerpt: "Clause 1.1: Covers requirements for valve regulated lead-acid (VRLA) batteries with immobilized electrolyte for telecommunications and power backup.",
      applicability_explanation: "Primary national product standard for stationary VRLA AGM and gel batteries.",
      confidence_score: 0.99
    },
    investigation_notes: "Formulated by ETD 11; universal standard for telecom tower and UPS VRLA batteries."
  }
];

module.exports = { LITD_ETD_INVESTIGATION };
