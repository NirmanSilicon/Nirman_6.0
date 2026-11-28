// =========================================================
// Nirdeshak - Universal Product Requirement Profile Engine
// Implements 4-Level Requirement Extraction Architecture:
// Level 1: 17 BIS Division Councils (CED, ETD, MED, CHD, FAD, LITD, MTD, TED, PCD, TXD, MHD, PGD, WRD, EED, AYD, SSD, MSD)
// Level 2: Product Category Schemas
// Level 3: Product Family Catalog Matching (1,047 families)
// Level 4: Applicable Indian Standards Enrichment (710 standards)
// Source Attribution: [USER PROVIDED], [VERIFIED INDIAN STANDARD], [AI SUGGESTED], [REQUIRES CONFIRMATION]
// =========================================================

const { query } = require('./database');
const { isHelmetQuery, getCuratedHelmetExtractedRequirements, detectAndNormalizeQuery } = require('./demoProfile');

/**
 * 17 BIS Division Council Master Baseline Profiles
 */
const DIVISION_COUNCIL_PROFILES = {
  CED: {
    council_code: 'CED',
    council_name: 'Civil Engineering Division Council',
    domain: 'Civil Engineering & Construction Materials',
    typical_applications: 'Building construction, civil infrastructure, structural engineering, and public works',
    materials: [
      'Structural steel, reinforced concrete, or Portland cement composite [AI SUGGESTED]',
      'Weather-resistant masonry or architectural mineral binder [AI SUGGESTED]'
    ],
    technical_requirements: [
      'Structural load-bearing and compressive strength grade [AI SUGGESTED]',
      'Dimensional tolerances conforming to standard construction practices [AI SUGGESTED]',
      'Workmanship and surface finish free from cracks and voids [AI SUGGESTED]'
    ],
    performance_requirements: [
      'Compressive and tensile strength under static and dynamic loading [AI SUGGESTED]',
      'Durability and moisture resistance under ambient exposure [AI SUGGESTED]',
      'Resistance to environmental degradation and carbonation [AI SUGGESTED]'
    ],
    dimensions: [
      'Standard construction nominal dimensions and tolerances [AI SUGGESTED]'
    ],
    environmental_conditions: [
      'Outdoor ambient exposure (-10°C to +50°C) with variable humidity [AI SUGGESTED]',
      'Resistance to wet-dry cycles and direct precipitation [AI SUGGESTED]'
    ],
    safety_requirements: [
      'Structural stability preventing catastrophic brittle collapse [AI SUGGESTED]',
      'Fire-retardant or non-combustible material composition [AI SUGGESTED]'
    ],
    testing_requirements: [
      'Compressive strength testing under standardized hydraulic press [AI SUGGESTED]',
      'Dimensional verification and soundness test [AI SUGGESTED]'
    ],
    certification_requirements: [
      'Bureau of Indian Standards Scheme-I (ISI Mark) [AI SUGGESTED]',
      'Compliance with applicable Civil Engineering Quality Control Orders (QCO) [AI SUGGESTED]'
    ]
  },
  ETD: {
    council_code: 'ETD',
    council_name: 'Electrotechnical Division Council',
    domain: 'Electrical Equipment, Power Systems & Electronics',
    typical_applications: 'Power distribution, industrial electrification, commercial and residential power systems',
    materials: [
      'High-conductivity electrolytic copper or EC-grade aluminium conductor [AI SUGGESTED]',
      'High-grade dielectric insulation (PVC, XLPE, or ceramic/epoxy) [AI SUGGESTED]',
      'Flame-retardant outer protective enclosure or sheath [AI SUGGESTED]'
    ],
    technical_requirements: [
      'Rated system voltage and continuous current carrying capacity [AI SUGGESTED]',
      'Insulation resistance and dielectric breakdown strength [AI SUGGESTED]',
      'Short-circuit withstand capacity and impulse voltage withstand [AI SUGGESTED]'
    ],
    performance_requirements: [
      'Conductor resistance at 20°C conforming to electrical grade limits [AI SUGGESTED]',
      'Temperature rise under full rated operational load [AI SUGGESTED]',
      'High-voltage AC spark test / dielectric withstand without puncture [AI SUGGESTED]'
    ],
    dimensions: [
      'Standard rated dimensions, conductor cross-sections, or frame sizes [AI SUGGESTED]'
    ],
    environmental_conditions: [
      'Operating ambient temperature: -5°C to +45°C; Relative humidity up to 95% [AI SUGGESTED]',
      'Resistance to electrical tracking and indoor/outdoor thermal cycling [AI SUGGESTED]'
    ],
    safety_requirements: [
      'Protection against direct and indirect electric shock hazard [AI SUGGESTED]',
      'Flame retardance and smoke emission suppression [AI SUGGESTED]',
      'Grounding/earthing terminal provision and creepage distance compliance [AI SUGGESTED]'
    ],
    testing_requirements: [
      'High-voltage dielectric withstand test [AI SUGGESTED]',
      'Insulation resistance measurement at 500 V / 1000 V DC [AI SUGGESTED]',
      'Temperature rise test under rated continuous duty [AI SUGGESTED]'
    ],
    certification_requirements: [
      'BIS Scheme-I Certification Mark (ISI Mark) [AI SUGGESTED]',
      'Statutory compliance with Ministry of Power / DPIIT Electrical Equipment QCO [AI SUGGESTED]'
    ]
  },
  MED: {
    council_code: 'MED',
    council_name: 'Mechanical Engineering Division Council',
    domain: 'Mechanical Engineering, Pumps, Piping & Machinery',
    typical_applications: 'Fluid transport, industrial manufacturing, pumping operations, and thermal systems',
    materials: [
      'High-grade cast iron (FG 200/260), cast carbon steel, or stainless steel (SS304/SS316) [AI SUGGESTED]',
      'Wear-resistant bronze or mechanical polymer internal components [AI SUGGESTED]'
    ],
    technical_requirements: [
      'Design operating pressure rating, flow capacity, and power input [AI SUGGESTED]',
      'Precision machining tolerances and dynamic rotational balance [AI SUGGESTED]',
      'Corrosion and cavitation resistance of fluid-contacting surfaces [AI SUGGESTED]'
    ],
    performance_requirements: [
      'Hydrostatic pressure containment without leakage or deformation [AI SUGGESTED]',
      'Volumetric efficiency and head-capacity performance curve [AI SUGGESTED]',
      'Vibration and acoustic noise levels within industrial ISO limits [AI SUGGESTED]'
    ],
    dimensions: [
      'Flange connections, nominal bore (DN), and mounting dimensions [AI SUGGESTED]'
    ],
    environmental_conditions: [
      'Operating fluid temperature: 0°C to +80°C (or declared range) [AI SUGGESTED]',
      'Industrial plant environmental exposure with dust and moisture [AI SUGGESTED]'
    ],
    safety_requirements: [
      'Safety pressure relief or bypass protection against overpressure [AI SUGGESTED]',
      'Mechanical guard interlocks around rotating shafts and couplings [AI SUGGESTED]'
    ],
    testing_requirements: [
      'Hydrostatic pressure proof test at 1.5x design pressure [AI SUGGESTED]',
      'Performance characteristic testing across operating envelope [AI SUGGESTED]',
      'Dynamic balance and mechanical seal leakage verification [AI SUGGESTED]'
    ],
    certification_requirements: [
      'Bureau of Indian Standards Scheme-I (ISI Mark) [AI SUGGESTED]',
      'Compliance with heavy machinery / pump statutory Quality Control Orders [AI SUGGESTED]'
    ]
  },
  CHD: {
    council_code: 'CHD',
    council_name: 'Chemical Division Council',
    domain: 'Chemicals, Plastics, Polymers, Rubber & Safety Products',
    typical_applications: 'Industrial processing, personal protective equipment, laboratory testing, and sanitation',
    materials: [
      'Chemical-grade synthetic polymer, elastomers, or high-purity chemical compound [AI SUGGESTED]',
      'Inert, non-reactive stabilizer and non-toxic additive compounds [AI SUGGESTED]'
    ],
    technical_requirements: [
      'Chemical purity percentage, active content assay, and specific gravity [AI SUGGESTED]',
      'pH value, insoluble matter limits, and moisture content control [AI SUGGESTED]',
      'Chemical compatibility and resistance to intended hazardous reagents [AI SUGGESTED]'
    ],
    performance_requirements: [
      'Chemical barrier efficacy or active ingredient potency [AI SUGGESTED]',
      'Accelerated thermal stability and shelf-life retention [AI SUGGESTED]',
      'Mechanical resistance to tear, puncture, or degradation under chemical contact [AI SUGGESTED]'
    ],
    dimensions: [
      'Standard packaging volume, mass, or ergonomic sizing specifications [AI SUGGESTED]'
    ],
    environmental_conditions: [
      'Storage in dry, ventilated conditions away from direct sunlight (15°C to 35°C) [AI SUGGESTED]',
      'Resistance to chemical fumes, vapors, and liquid splashing [AI SUGGESTED]'
    ],
    safety_requirements: [
      'Safe handling guidelines and toxic impurity threshold limits [AI SUGGESTED]',
      'Skin irritation safety, non-flammability or flash point compliance [AI SUGGESTED]'
    ],
    testing_requirements: [
      'Chemical assay, gas chromatography, or titration analysis [AI SUGGESTED]',
      'Impurity limits testing (heavy metals, free alkali/acid) [AI SUGGESTED]',
      'Physical barrier or chemical resistance testing [AI SUGGESTED]'
    ],
    certification_requirements: [
      'BIS Scheme-I Certification Mark (ISI Mark) [AI SUGGESTED]',
      'Compliance with Chemical & Petrochemical Quality Control Orders [AI SUGGESTED]'
    ]
  },
  FAD: {
    council_code: 'FAD',
    council_name: 'Food and Agriculture Division Council',
    domain: 'Food Products, Agricultural Machinery & Inputs',
    typical_applications: 'Food processing, human consumption, agricultural operations, and irrigation',
    materials: [
      'Food-contact grade stainless steel (SS304/SS316) or food-grade polymers [AI SUGGESTED]',
      'High-grade agricultural seed, raw agricultural produce, or edible grade ingredients [AI SUGGESTED]'
    ],
    technical_requirements: [
      'Moisture content percentage and total solids concentration [AI SUGGESTED]',
      'Physical cleanliness free from foreign matter, filth, and insect infestation [AI SUGGESTED]',
      'Nutritional composition or operational efficiency parameters [AI SUGGESTED]'
    ],
    performance_requirements: [
      'Hygienic processing stability and biological stability [AI SUGGESTED]',
      'Shelf-life preservation and organoleptic taste/odor standards [AI SUGGESTED]'
    ],
    dimensions: [
      'Standard retail/bulk package sizes or equipment processing capacity [AI SUGGESTED]'
    ],
    environmental_conditions: [
      'Cool, dry, hygienic storage protected from vermin and contamination [AI SUGGESTED]'
    ],
    safety_requirements: [
      'Zero pathogenic microbial contamination (Salmonella, E. coli, Listeria) [AI SUGGESTED]',
      'Strict limits on heavy metals (Pb, As, Cd), aflatoxins, and pesticide residues [AI SUGGESTED]'
    ],
    testing_requirements: [
      'Microbiological examination as per standardized BIS/FSSAI methods [AI SUGGESTED]',
      'Chemical proximate analysis and pesticide residue screening [AI SUGGESTED]'
    ],
    certification_requirements: [
      'Bureau of Indian Standards Scheme-I (ISI Mark) [AI SUGGESTED]',
      'Mandatory Food Safety and Standards Authority of India (FSSAI) / QCO conformance [AI SUGGESTED]'
    ]
  },
  LITD: {
    council_code: 'LITD',
    council_name: 'Electronics and Information Technology Division Council',
    domain: 'Electronics, IT Hardware & Telecommunications',
    typical_applications: 'Data processing, communication, telecommunications, and industrial automation',
    materials: [
      'Flame-retardant PCB substrate (FR4), RoHS-compliant lead-free alloys [AI SUGGESTED]',
      'Shielded conductive enclosures providing electromagnetic interference protection [AI SUGGESTED]'
    ],
    technical_requirements: [
      'Input operating voltage, frequency, power consumption, and thermal limits [AI SUGGESTED]',
      'Data transmission interface standards and protocol compatibility [AI SUGGESTED]',
      'Dielectric withstand and touch-current leakage limits [AI SUGGESTED]'
    ],
    performance_requirements: [
      'High-speed data throughput, signal integrity, and low harmonic distortion [AI SUGGESTED]',
      'Continuous duty MTBF (Mean Time Between Failures) reliability [AI SUGGESTED]'
    ],
    dimensions: [
      'Standard rack-mount, desktop, or modular form factor dimensions [AI SUGGESTED]'
    ],
    environmental_conditions: [
      'Indoor operating temperature: 0°C to +40°C; non-condensing humidity [AI SUGGESTED]'
    ],
    safety_requirements: [
      'Electrical isolation preventing electric shock and fire hazards [AI SUGGESTED]',
      'Electromagnetic Compatibility (EMC/EMI) emission and immunity suppression [AI SUGGESTED]'
    ],
    testing_requirements: [
      'Electrical safety testing as per IS 13252 / IEC 60950 / IEC 62368 [AI SUGGESTED]',
      'Conducted and radiated EMI/EMC compliance testing [AI SUGGESTED]'
    ],
    certification_requirements: [
      'MeitY Compulsory Registration Scheme (CRS) / BIS Scheme-II [AI SUGGESTED]',
      'Electronics and IT Goods (Requirement for Compulsory Registration) Order [AI SUGGESTED]'
    ]
  },
  MTD: {
    council_code: 'MTD',
    council_name: 'Metallurgical Engineering Division Council',
    domain: 'Metals, Steels, Alloys & Foundry Products',
    typical_applications: 'Structural fabrication, reinforcement, automotive manufacturing, and metal forming',
    materials: [
      'Killed steel, prime billets, high-grade iron ore, or non-ferrous alloys [AI SUGGESTED]',
      'Controlled micro-alloying elements (vanadium, niobium, boron) [AI SUGGESTED]'
    ],
    technical_requirements: [
      'Specified chemical composition limits (Carbon, Manganese, Sulphur, Phosphorus) [AI SUGGESTED]',
      'Carbon Equivalent (CE) maximum limit for weldability [AI SUGGESTED]',
      'Nominal size, cross-sectional area, and mass per meter run [AI SUGGESTED]'
    ],
    performance_requirements: [
      'Yield strength (0.2% proof stress) and ultimate tensile strength [AI SUGGESTED]',
      'Percentage elongation at break and uniform elongation [AI SUGGESTED]',
      'Bend and rebend capability around standardized mandrels without fracture [AI SUGGESTED]'
    ],
    dimensions: [
      'Standard nominal bar diameter (mm) or beam profile dimensions [AI SUGGESTED]'
    ],
    environmental_conditions: [
      'Ambient atmospheric exposure with protective rust-inhibiting measures [AI SUGGESTED]'
    ],
    safety_requirements: [
      'High-ductility seismic resistance preventing sudden brittle failure [AI SUGGESTED]',
      'Surface defect limitations: free from seams, cracks, laminations, and piping [AI SUGGESTED]'
    ],
    testing_requirements: [
      'Tensile test, yield stress, and elongation per IS 1608 [AI SUGGESTED]',
      'Bend and rebend test per IS 1599 [AI SUGGESTED]',
      'Chemical spectrometric analysis for elemental composition [AI SUGGESTED]'
    ],
    certification_requirements: [
      'BIS Scheme-I Certification Mark (ISI Mark) [AI SUGGESTED]',
      'Steel and Steel Products (Quality Control) Order issued by Ministry of Steel [AI SUGGESTED]'
    ]
  },
  TED: {
    council_code: 'TED',
    council_name: 'Transport Engineering Division Council',
    domain: 'Automotive, Railways, Marine & Transport Equipment',
    typical_applications: 'Motor vehicles, transport systems, rolling stock, and marine equipment',
    materials: [
      'Automotive-grade deep drawing sheet steel, vulcanized synthetic rubber, or safety glass [AI SUGGESTED]',
      'Corrosion-resistant high-tensile fasteners and lightweight engineering composites [AI SUGGESTED]'
    ],
    technical_requirements: [
      'Load capacity rating, maximum operating speed rating, and axle weight [AI SUGGESTED]',
      'Mounting interface compatibility and vibration resistance [AI SUGGESTED]'
    ],
    performance_requirements: [
      'Endurance testing under high-speed dynamic loading and cyclic fatigue [AI SUGGESTED]',
      'Braking and rolling resistance performance under wet and dry conditions [AI SUGGESTED]'
    ],
    dimensions: [
      'Standard automotive tire sizes, rim diameter, or vehicle mounting dimensions [AI SUGGESTED]'
    ],
    environmental_conditions: [
      'Operating temperature: -20°C to +60°C road surface conditions; weather exposed [AI SUGGESTED]'
    ],
    safety_requirements: [
      'Crash impact energy absorption and anti-burst structural integrity [AI SUGGESTED]',
      'High-visibility photometric performance or fail-safe mechanical retention [AI SUGGESTED]'
    ],
    testing_requirements: [
      'High-speed endurance test on dynamometer test drum [AI SUGGESTED]',
      'Drop striker impact test or burst pressure testing [AI SUGGESTED]'
    ],
    certification_requirements: [
      'BIS Scheme-I Certification Mark (ISI Mark) [AI SUGGESTED]',
      'Compliance with Central Motor Vehicle Rules (CMVR) and Automotive QCOs [AI SUGGESTED]'
    ]
  },
  PCD: {
    council_code: 'PCD',
    council_name: 'Petroleum, Coal and Related Products Division Council',
    domain: 'Petroleum Products, Lubricants, Fuels, Coal & Bitumen',
    typical_applications: 'Combustion fuels, industrial lubrication, road paving, and thermal power',
    materials: [
      'Refined hydrocarbon base oils, synthetic esters, or penetration-grade bitumen [AI SUGGESTED]',
      'Anti-wear, anti-oxidant, and viscosity-index improver additive packages [AI SUGGESTED]'
    ],
    technical_requirements: [
      'Kinematic viscosity at 40°C and 100°C, and Viscosity Index (VI) [AI SUGGESTED]',
      'Flash point (Cleveland Open Cup / Pensky-Martens) and pour point limits [AI SUGGESTED]',
      'Maximum sulphur content, ash percentage, and water content [AI SUGGESTED]'
    ],
    performance_requirements: [
      'Thermal and oxidation stability preventing sludge and varnish formation [AI SUGGESTED]',
      'Four-ball weld load and extreme pressure lubrication film strength [AI SUGGESTED]'
    ],
    dimensions: [
      'Standard drum packaging (210L), tanker delivery, or viscosity grade (VG) [AI SUGGESTED]'
    ],
    environmental_conditions: [
      'Operating temperature: -10°C to +150°C in heavy machinery systems [AI SUGGESTED]'
    ],
    safety_requirements: [
      'High flash point minimizing explosion and fire hazards during operation [AI SUGGESTED]',
      'Safe spill-containment and toxicity threshold adherence [AI SUGGESTED]'
    ],
    testing_requirements: [
      'Kinematic viscosity measurement as per IS 1448 [AI SUGGESTED]',
      'Flash point determination and copper strip corrosion test [AI SUGGESTED]'
    ],
    certification_requirements: [
      'Bureau of Indian Standards Scheme-I (ISI Mark) [AI SUGGESTED]',
      'Petroleum and Explosives Safety Organization (PESO) / MoPNG QCO compliance [AI SUGGESTED]'
    ]
  },
  TXD: {
    council_code: 'TXD',
    council_name: 'Textiles Division Council',
    domain: 'Textiles, Yarns, Technical Fabrics & Protective Clothing',
    typical_applications: 'Protective apparel, uniforms, geotextiles, industrial fabrics, and household textiles',
    materials: [
      '100% combed cotton, polyester/cotton blends, or high-tenacity aramid fibers [AI SUGGESTED]',
      'Eco-friendly AZO-free dyestuffs and non-hazardous functional finishing agents [AI SUGGESTED]'
    ],
    technical_requirements: [
      'Fibre composition percentage, yarn count, and weave construction [AI SUGGESTED]',
      'Mass per unit area (GSM - Grams per Square Meter) with specified tolerances [AI SUGGESTED]',
      'Ends per inch (EPI) and Picks per inch (PPI) thread density [AI SUGGESTED]'
    ],
    performance_requirements: [
      'Tensile breaking strength (warp and weft) and tear resistance [AI SUGGESTED]',
      'Colour fastness to washing, light, perspiration, and rubbing [AI SUGGESTED]',
      'Dimensional stability (shrinkage resistance) after repeated laundering [AI SUGGESTED]'
    ],
    dimensions: [
      'Fabric roll width (120 cm to 150 cm) and cut garment sizing specifications [AI SUGGESTED]'
    ],
    environmental_conditions: [
      'Standard atmospheric conditions for textile testing: 27°C ± 2°C and 65% ± 2% RH [AI SUGGESTED]'
    ],
    safety_requirements: [
      'Free from restricted carcinogenic aromatic amines and formaldehyde [AI SUGGESTED]',
      'Flame retardance or antistatic dissipation properties where specified [AI SUGGESTED]'
    ],
    testing_requirements: [
      'Tensile strength testing by grab/strip method per IS 1969 [AI SUGGESTED]',
      'Tear strength testing by Elmendorf apparatus per IS 6489 [AI SUGGESTED]',
      'Colour fastness evaluations per IS 687 / IS 766 [AI SUGGESTED]'
    ],
    certification_requirements: [
      'Bureau of Indian Standards Scheme-I (ISI Mark) [AI SUGGESTED]',
      'Ministry of Textiles Technical Textiles Quality Control Orders [AI SUGGESTED]'
    ]
  },
  MHD: {
    council_code: 'MHD',
    council_name: 'Medical Equipment and Hospital Planning Division Council',
    domain: 'Medical Devices, Diagnostic Equipment & Hospital Supplies',
    typical_applications: 'Clinical diagnosis, patient monitoring, surgical interventions, and healthcare protection',
    materials: [
      'Medical-grade biocompatible silicone, virgin PVC, SS316L surgical steel, or titanium [AI SUGGESTED]',
      'Non-pyrogenic, non-toxic, and non-hemolytic medical polymers [AI SUGGESTED]'
    ],
    technical_requirements: [
      'Sensor measurement accuracy, clinical diagnostic tolerance, and resolution [AI SUGGESTED]',
      'Hermetic sealing and sterility assurance level (SAL 10^-6) [AI SUGGESTED]',
      'Electrical isolation conforming to Medical Electrical Equipment standards [AI SUGGESTED]'
    ],
    performance_requirements: [
      'High-precision continuous clinical parameter measurement [AI SUGGESTED]',
      'Endurance through repeated autoclave sterilization cycles [AI SUGGESTED]'
    ],
    dimensions: [
      'Standard medical gauge, French catheter scale, or ergonomic patient-contact dimensions [AI SUGGESTED]'
    ],
    environmental_conditions: [
      'Clean hospital environment: 18°C to 26°C; sterile storage conditions [AI SUGGESTED]'
    ],
    safety_requirements: [
      'Patient leakage current within microampere limits (Type CF/BF applied parts) [AI SUGGESTED]',
      'Cytotoxicity and skin sensitization clearance as per ISO 10993 / IS 12572 [AI SUGGESTED]'
    ],
    testing_requirements: [
      'Medical electrical safety testing per IS 13450 / IEC 60601-1 [AI SUGGESTED]',
      'Biocompatibility testing and sterility verification [AI SUGGESTED]'
    ],
    certification_requirements: [
      'Central Drugs Standard Control Organisation (CDSCO) Medical Device Registration [AI SUGGESTED]',
      'Bureau of Indian Standards Scheme-I (ISI Mark) where notified under Medical QCOs [AI SUGGESTED]'
    ]
  },
  PGD: {
    council_code: 'PGD',
    council_name: 'Production and General Engineering Division Council',
    domain: 'Machine Tools, Fasteners, Bearings & Metrology',
    typical_applications: 'Precision manufacturing, machining, mechanical assembly, and metrology',
    materials: [
      'High Speed Steel (HSS), cemented tungsten carbide, or alloy tool steel [AI SUGGESTED]',
      'High-strength heat-treated structural alloy steel (Grades 8.8, 10.9, 12.9) [AI SUGGESTED]'
    ],
    technical_requirements: [
      'Dimensional tolerance class (ISO IT grades) and surface roughness (Ra value) [AI SUGGESTED]',
      'Thread geometry, pitch accuracy, and hardness across core and case [AI SUGGESTED]'
    ],
    performance_requirements: [
      'Tool wear life, cutting edge retention, and resistance to chipping [AI SUGGESTED]',
      'Torque tightening proof load and fatigue endurance under dynamic cyclic stress [AI SUGGESTED]'
    ],
    dimensions: [
      'Standard metric thread sizes (M6 to M36), shank diameters, or bore dimensions [AI SUGGESTED]'
    ],
    environmental_conditions: [
      'Industrial machining environment with cutting fluids, coolants, and thermal cycles [AI SUGGESTED]'
    ],
    safety_requirements: [
      'Zero catastrophic brittle fracture under rated tightening torque [AI SUGGESTED]',
      'Safe chip evacuation and protective safety guard compatibility [AI SUGGESTED]'
    ],
    testing_requirements: [
      'Rockwell/Vickers hardness testing as per IS 1586 [AI SUGGESTED]',
      'Proof load testing and dimensional verification using optical comparators [AI SUGGESTED]'
    ],
    certification_requirements: [
      'BIS Scheme-I Certification Mark (ISI Mark) [AI SUGGESTED]',
      'Machine Tools and Fasteners Quality Control Orders [AI SUGGESTED]'
    ]
  },
  WRD: {
    council_code: 'WRD',
    council_name: 'Water Resources Division Council',
    domain: 'Water Resources, Irrigation, Dams & Canals',
    typical_applications: 'River valley projects, dam construction, canal irrigation, and bulk water supply',
    materials: [
      'Ductile iron, high-density polyethylene (PE100), or reinforced structural steel [AI SUGGESTED]',
      'Corrosion-resistant epoxy barrier coating on all water-wetted surfaces [AI SUGGESTED]'
    ],
    technical_requirements: [
      'Nominal diameter (DN), pressure rating (PN 6 to PN 25), and discharge discharge capacity [AI SUGGESTED]',
      'Hydraulic flow coefficient and minimum wall thickness [AI SUGGESTED]'
    ],
    performance_requirements: [
      'Hydrostatic proof test pressure without sweating or pressure drop [AI SUGGESTED]',
      'Resistance to water hammer surge pressures and soil overburden loads [AI SUGGESTED]'
    ],
    dimensions: [
      'Large diameter pipe sizing (DN 100 to DN 2000) and standard laying lengths [AI SUGGESTED]'
    ],
    environmental_conditions: [
      'Underground buried soil exposure or submerged aquatic hydraulic conditions [AI SUGGESTED]'
    ],
    safety_requirements: [
      'Surge relief valve protection against high-pressure water hammer transients [AI SUGGESTED]',
      'Toxicological safety: lining materials non-hazardous to drinking water [AI SUGGESTED]'
    ],
    testing_requirements: [
      'Factory hydrostatic pressure test at 1.5x working pressure [AI SUGGESTED]',
      'Ring stiffness and tensile weld inspection [AI SUGGESTED]'
    ],
    certification_requirements: [
      'BIS Scheme-I Certification Mark (ISI Mark) [AI SUGGESTED]',
      'Compliance with National Water Mission specifications [AI SUGGESTED]'
    ]
  },
  EED: {
    council_code: 'EED',
    council_name: 'Environment and Ecology Division Council',
    domain: 'Environmental Protection, Pollution Control & Waste Management',
    typical_applications: 'Industrial effluent treatment, air emission monitoring, and solid waste handling',
    materials: [
      'Corrosion-resistant FRP (Fiberglass Reinforced Plastic), SS316, or specialized filter media [AI SUGGESTED]',
      'UV-stabilized virgin polymer geomembranes [AI SUGGESTED]'
    ],
    technical_requirements: [
      'Pollutant capture efficiency percentage (BOD, COD, Particulate Matter PM2.5/PM10) [AI SUGGESTED]',
      'Maximum allowable acoustic noise emission levels (dBA) [AI SUGGESTED]'
    ],
    performance_requirements: [
      'Continuous duty filtration without breakthrough or channel clogging [AI SUGGESTED]',
      'Low energy consumption per cubic meter of treated effluent/air [AI SUGGESTED]'
    ],
    dimensions: [
      'Modular treatment unit dimensions, duct diameter, or flow capacity (m³/hour) [AI SUGGESTED]'
    ],
    environmental_conditions: [
      'Harsh industrial chemical effluent and acidic/alkaline atmosphere exposure [AI SUGGESTED]'
    ],
    safety_requirements: [
      'Zero hazardous gas leakage into operator workspace [AI SUGGESTED]',
      'Fail-safe emergency shutdown and secondary containment bunds [AI SUGGESTED]'
    ],
    testing_requirements: [
      'Stack emission testing using isokinetic sampling probes [AI SUGGESTED]',
      'Treated effluent water quality testing as per standard APHA/BIS methods [AI SUGGESTED]'
    ],
    certification_requirements: [
      'Compliance with Central Pollution Control Board (CPCB) standards [AI SUGGESTED]',
      'Applicable BIS Environmental Management & Product Specifications [AI SUGGESTED]'
    ]
  },
  AYD: {
    council_code: 'AYD',
    council_name: 'AYUSH Division Council',
    domain: 'Ayurveda, Yoga, Naturopathy, Unani, Siddha & Homeopathy',
    typical_applications: 'Traditional medicine, herbal pharmaceuticals, and therapeutic wellness',
    materials: [
      'Authentic botanical crude herbs, standardized dry plant extracts, or purified minerals [AI SUGGESTED]',
      'Pharmaceutical-grade excipients free from toxic residues [AI SUGGESTED]'
    ],
    technical_requirements: [
      'Botanical authentication and active phytochemical marker compound percentage [AI SUGGESTED]',
      'Total ash percentage, acid-insoluble ash, and extractive values [AI SUGGESTED]'
    ],
    performance_requirements: [
      'Standard disintegration time and batch-to-batch phytochemical consistency [AI SUGGESTED]',
      'Shelf-life stability under tropical storage conditions [AI SUGGESTED]'
    ],
    dimensions: [
      'Standard pharmaceutical dosage packaging (tablets, capsules, syrups, powders) [AI SUGGESTED]'
    ],
    environmental_conditions: [
      'Controlled storage: Cool, dry place below 25°C protected from light and moisture [AI SUGGESTED]'
    ],
    safety_requirements: [
      'Heavy metal limits: Lead (<10 ppm), Arsenic (<3 ppm), Cadmium (<0.3 ppm), Mercury (<1 ppm) [AI SUGGESTED]',
      'Microbial limits: Zero Salmonella, E. coli, and total bacterial count within pharmacopoeial limits [AI SUGGESTED]'
    ],
    testing_requirements: [
      'High-Performance Thin-Layer Chromatography (HPTLC) / HPLC fingerprinting [AI SUGGESTED]',
      'Atomic Absorption Spectrometry (AAS) heavy metal testing [AI SUGGESTED]'
    ],
    certification_requirements: [
      'Ministry of AYUSH GMP Certification / AYUSH Standard Mark [AI SUGGESTED]',
      'Bureau of Indian Standards Scheme-I Certification where applicable [AI SUGGESTED]'
    ]
  },
  SSD: {
    council_code: 'SSD',
    council_name: 'Service Sector Division Council',
    domain: 'Services, Education, Healthcare & Financial Quality',
    typical_applications: 'Hospitality services, educational institutions, retail, and IT service delivery',
    materials: [
      'Standardized operational service delivery frameworks and digital audit logs [AI SUGGESTED]'
    ],
    technical_requirements: [
      'Service Level Agreement (SLA) response times and process benchmarks [AI SUGGESTED]',
      'Information security and data privacy safeguards [AI SUGGESTED]'
    ],
    performance_requirements: [
      'Customer satisfaction rating and service availability uptime (>99.5%) [AI SUGGESTED]'
    ],
    dimensions: [
      'Service capacity, staffing ratio, and facility area per client [AI SUGGESTED]'
    ],
    environmental_conditions: [
      'Clean, accessible, and climate-controlled service delivery environment [AI SUGGESTED]'
    ],
    safety_requirements: [
      'Fire evacuation drills, occupational health protocols, and emergency medical kits [AI SUGGESTED]'
    ],
    testing_requirements: [
      'Third-party service conformity audits and customer grievance redressal audits [AI SUGGESTED]'
    ],
    certification_requirements: [
      'BIS Service Quality Certification Scheme / ISO 9001 [AI SUGGESTED]'
    ]
  },
  MSD: {
    council_code: 'MSD',
    council_name: 'Management and Systems Division Council',
    domain: 'Management Systems, Quality, Environment & Risk',
    typical_applications: 'Corporate governance, integrated quality management, and risk compliance',
    materials: [
      'Documented Quality Management System (QMS) policies, procedures, and records [AI SUGGESTED]'
    ],
    technical_requirements: [
      'Standardized PDCA (Plan-Do-Check-Act) management framework implementation [AI SUGGESTED]',
      'Internal audit frequency and management review schedule [AI SUGGESTED]'
    ],
    performance_requirements: [
      'Continual process improvement metrics and timely corrective action closure [AI SUGGESTED]'
    ],
    dimensions: [
      'Organizational scope, business units, and operational site boundaries [AI SUGGESTED]'
    ],
    environmental_conditions: [
      'Organizational workplace operating environment [AI SUGGESTED]'
    ],
    safety_requirements: [
      'Hazard identification, risk assessment, and incident mitigation procedures [AI SUGGESTED]'
    ],
    testing_requirements: [
      'Stage-1 readiness review and Stage-2 comprehensive certification audits [AI SUGGESTED]'
    ],
    certification_requirements: [
      'Bureau of Indian Standards Management Systems Certification (IS/ISO 9001 / IS/ISO 14001) [AI SUGGESTED]'
    ]
  }
};

/**
 * Product-specific Category Parameter Schemas
 * Maps specific product categories to tailored, highly descriptive parameter templates.
 */
const CATEGORY_PARAMETER_SCHEMAS = {
  // PPE - Safety Glasses & Eye Protectors
  safety_glasses: {
    match_terms: ['safety glasses', 'eye protector', 'protective spectacles', 'safety goggles', 'face shield', 'welding goggle', 'visors'],
    council: 'CHD',
    category: 'Personal Protective Equipment / Eye and Face Protection',
    application: 'Industrial workplaces requiring ocular protection against flying particles, dust, chemical splash, and optical radiation',
    technical_requirements: [
      'Optical clarity conforming to Optical Class 1 (continuous work without distortion) [AI SUGGESTED]',
      'Impact protection rating against high-speed flying fragments [AI SUGGESTED]',
      'Lateral eye coverage with integrated or wraparound side shields [AI SUGGESTED]',
      'Compatibility with prescription eyewear (OTG - Over The Glasses design) where specified [REQUIRES CONFIRMATION]'
    ],
    materials: [
      'High-impact optical-grade polycarbonate or chemically-toughened glass lenses [AI SUGGESTED]',
      'Durable polyamide (nylon) or elastomer frame with soft brow and nose bridge cushions [AI SUGGESTED]',
      'Anti-fog inner coating and scratch-resistant hard-coat outer lens treatment [AI SUGGESTED]'
    ],
    performance_requirements: [
      'Ballistic drop-ball or steel projectile impact resistance without lens cracking or dislodgement [AI SUGGESTED]',
      'Luminous transmittance: >= 85% for clear lenses; appropriate optical density for shaded/tinted lenses [AI SUGGESTED]',
      'Ultraviolet (UV) radiation cut-off filtering (UV380 or UV400 protection) [AI SUGGESTED]'
    ],
    dimensions: [
      'Universal ergonomic fit with adjustable temple arm lengths and inclination angles [AI SUGGESTED]',
      'Lens height >= 45 mm providing wide uninterrupted field of view (>= 120 degrees) [AI SUGGESTED]'
    ],
    environmental_conditions: [
      'Operating temperature range: -5°C to +55°C without warping or lens delamination [AI SUGGESTED]',
      'Resistance to industrial humidity, sweat corrosion, and mild chemical solvent vapors [AI SUGGESTED]'
    ],
    safety_requirements: [
      'Robust retention preventing sharp fracture edges upon severe projectile impact [AI SUGGESTED]',
      'Skin-contact materials non-allergenic and free from heavy metals or phthalates [AI SUGGESTED]',
      'Flame and ignition resistance: non-combustible when exposed to hot steel rod [AI SUGGESTED]'
    ],
    testing_requirements: [
      'Mechanical impact test (steel ball drop or high-velocity projectile impact test) [AI SUGGESTED]',
      'Optical properties test: spherical, astigmatic, and prismatic refractive power [AI SUGGESTED]',
      'Surface abrasion / scratch resistance test and anti-fog persistence test [AI SUGGESTED]'
    ],
    certification_requirements: [
      'Bureau of Indian Standards Scheme-I (ISI Mark) under IS 5983 / IS 8521 [AI SUGGESTED]',
      'Personal Protective Equipment Quality Control Orders [AI SUGGESTED]'
    ],
    clarifications: [
      'Is protection required against high-velocity mechanical impacts (e.g. grinding, chipping) or chemical liquid splashes/vapors?',
      'Are clear unshaded lenses required, or is optical radiation filtering (UV, infrared, or welding shade) needed?',
      'Do workers require anti-fog coatings for humid/sweaty conditions, or over-the-glasses (OTG) fitment for prescription spectacle wearers?'
    ]
  },

  // PPE - Safety Shoes & Footwear
  safety_shoes: {
    match_terms: ['safety shoe', 'safety footwear', 'industrial boot', 'safety boot', 'toe protection boot', 'work boots'],
    council: 'CHD',
    category: 'Personal Protective Equipment / Protective Footwear',
    application: 'Industrial workplaces, construction sites, and manufacturing plants requiring heavy foot protection',
    technical_requirements: [
      'Internal protective toecap rated for 200 Joules impact energy and 15 kN static compression [AI SUGGESTED]',
      'Slip resistance classification (SRA / SRB / SRC) on ceramic and steel surfaces [AI SUGGESTED]',
      'Anti-perforation midsole protection resistant to minimum 1100 N puncture force [AI SUGGESTED]'
    ],
    materials: [
      'Water-resistant full-grain leather or high-tenacity microfiber upper (thickness >= 1.2 mm) [AI SUGGESTED]',
      'Dual-density polyurethane (PU) or nitrile rubber slip-resistant oil-resistant outsole [AI SUGGESTED]',
      'Non-metallic composite or steel toecap and anti-puncture steel/Kevlar midsole [AI SUGGESTED]'
    ],
    performance_requirements: [
      'Outsole abrasion resistance (maximum volume loss <= 150 mm³) [AI SUGGESTED]',
      'Upper leather tear strength >= 120 N; Outsole tear strength >= 8 kN/m [AI SUGGESTED]',
      'Energy absorption of seat region (heel area) minimum 20 Joules [AI SUGGESTED]'
    ],
    dimensions: [
      'Standard Indian footwear sizes: 5 to 12 (UK/India sizing) with ergonomic wide toe box [AI SUGGESTED]'
    ],
    environmental_conditions: [
      'Operating in wet, muddy, oily, or hot industrial floor environments up to 120°C (300°C for HRO outsoles) [AI SUGGESTED]'
    ],
    safety_requirements: [
      'Electrical properties: Antistatic (100 kΩ to 1000 MΩ) or Electrical Hazard (EH) insulating where specified [REQUIRES CONFIRMATION]',
      'Fuel oil, acid, and alkali resistance of outsole [AI SUGGESTED]'
    ],
    testing_requirements: [
      'Impact resistance test (200 J drop striker per IS 15298 Part 1) [AI SUGGESTED]',
      'Compression resistance test (15 kN static press per IS 15298 Part 1) [AI SUGGESTED]',
      'Outsole slip resistance test on detergent and glycerol lubricants [AI SUGGESTED]'
    ],
    certification_requirements: [
      'Bureau of Indian Standards Scheme-I (ISI Mark) conforming to IS 15298 (Part 2):2016 [AI SUGGESTED]',
      'Mandatory Footwear (Quality Control) Order, 2020 issued by DPIIT [AI SUGGESTED]'
    ],
    clarifications: [
      'What footwear protection level is required: S1 (basic+antistatic), S1P (+puncture resistant), or S3 (water-resistant)?',
      'Is antistatic (dissipative) conductivity required, or electrical hazard (dielectric insulating) resistance?',
      'Are composite non-metallic toecaps required (for airport/metal-detector clearance), or traditional steel toecaps?'
    ]
  },

  // Electrical - PVC Insulated Cables & Wires
  pvc_cables: {
    match_terms: ['pvc insulated', 'pvc cable', 'pvc cables', 'electrical cable', 'electrical cables', 'copper wire', 'copper cable', 'copper cables', 'building wire', 'flexible cable', 'flexible cord', 'power cable', 'wiring cord', 'cable', 'cables'],
    council: 'ETD',
    category: 'Electrical Equipment / Wires and Cables',
    application: 'Fixed building wiring, electrical panel interconnections, and industrial power distribution up to 1100 V',
    technical_requirements: [
      'Rated working voltage: Up to and including 1100 V AC (450/750 V per standard specification) [AI SUGGESTED]',
      'Conductor class: Class 1 (solid), Class 2 (stranded), or Class 5 (flexible) copper/aluminium [REQUIRES CONFIRMATION]',
      'Insulation grade: Type A (70°C general purpose), Type C (heat-resistant HR), or Type D (oil-resistant) [AI SUGGESTED]',
      'Flame retardance category: Standard, FR (Flame Retardant), or FR-LSH (Low Smoke Low Halogen) [REQUIRES CONFIRMATION]'
    ],
    materials: [
      'High-conductivity annealed electrolytic plain or tinned copper / EC-grade aluminium conductor [AI SUGGESTED]',
      'Lead-free Virgin PVC dielectric insulation compound [AI SUGGESTED]',
      'Outer protective PVC compound Type ST1 or ST2 sheath [AI SUGGESTED]'
    ],
    performance_requirements: [
      'Maximum conductor electrical resistance at 20°C conforming strictly to IS 8130 [AI SUGGESTED]',
      'Insulation volume resistivity at 27°C >= 1 x 10^13 Ω-cm; at 70°C >= 1 x 10^10 Ω-cm [AI SUGGESTED]',
      'High-voltage water immersion withstand: 3000 V AC rms for 5 minutes without breakdown [AI SUGGESTED]'
    ],
    dimensions: [
      'Nominal conductor cross-sectional area (e.g. 1.0, 1.5, 2.5, 4.0, 6.0, 10, 16 mm² or multi-core) [AI SUGGESTED]',
      'Insulation radial thickness and overall cable outer diameter [AI SUGGESTED]'
    ],
    environmental_conditions: [
      'Maximum continuous operating conductor temperature: 70°C (85°C for HR grade) [AI SUGGESTED]',
      'Minimum installation temperature: -15°C; resistant to moisture and tropical ambient humidity [AI SUGGESTED]'
    ],
    safety_requirements: [
      'Self-extinguishing flame propagation: Oxygen index >= 29%; Temperature index >= 250°C [AI SUGGESTED]',
      'Smoke density: minimum 40% light transmittance for FR-LSH cables [AI SUGGESTED]',
      'Acid gas emission: maximum 20% by weight halogen evolution for FR-LSH grades [AI SUGGESTED]'
    ],
    testing_requirements: [
      'Conductor resistance measurement at 20°C per IS 8130 [AI SUGGESTED]',
      'High-voltage AC spark test and water bath dielectric withstand test [AI SUGGESTED]',
      'Tensile strength and percentage elongation of insulation before and after thermal ageing [AI SUGGESTED]',
      'Flammability test as per IS 10810 (Part 53 / 61) [AI SUGGESTED]'
    ],
    certification_requirements: [
      'Bureau of Indian Standards Scheme-I (ISI Mark) conforming to IS 694:2010 [AI SUGGESTED]',
      'Mandatory Electrical Wires and Protection Devices Quality Control Order, 2003 (S.O. 189(E)) [AI SUGGESTED]'
    ],
    clarifications: [
      'What conductor metal is required: high-conductivity Copper or EC-grade Aluminium?',
      'What cross-sectional area (sq mm) and number of cores (single core, 2-core, 3-core, 4-core) are needed?',
      'Is standard commercial PVC required, or Flame Retardant (FR) / Flame Retardant Low Smoke Halogen (FR-LSH)?'
    ]
  },

  // Electrical - Switchgear & Circuit Breakers
  circuit_breakers: {
    match_terms: ['circuit breaker', 'vacuum circuit breaker', 'mcb', 'mccb', 'air circuit breaker', 'vcb', 'switchgear', 'isolator'],
    council: 'ETD',
    category: 'Electrotechnical / Switchgear and Controlgear',
    application: 'Medium and low-voltage electrical power distribution, substation protection, and short-circuit fault interruption',
    technical_requirements: [
      'Rated system voltage and operational frequency (e.g. 11 kV, 3-Phase, 50 Hz) [AI SUGGESTED]',
      'Rated normal continuous current carrying capacity (e.g. 630 A, 1250 A, 2000 A) [AI SUGGESTED]',
      'Rated short-circuit breaking capacity: e.g. 25 kA / 31.5 kA for 3 seconds [AI SUGGESTED]',
      'Operating mechanism: Stored energy spring operated (motorized/manual) [AI SUGGESTED]'
    ],
    materials: [
      'High-grade epoxy or porcelain vacuum interrupter bottle housing [AI SUGGESTED]',
      'High-conductivity electrolytic copper busbars and silver-plated contact tips [AI SUGGESTED]',
      'Powder-coated sheet steel enclosure (minimum 2.0 mm thickness) [AI SUGGESTED]'
    ],
    performance_requirements: [
      'Rated operating duty cycle: O - 0.3s - CO - 3min - CO [AI SUGGESTED]',
      'Mechanical endurance: Class M2 (minimum 10,000 operational cycles) [AI SUGGESTED]',
      'Temperature rise of contacts and busbars within standard limits [AI SUGGESTED]'
    ],
    dimensions: [
      'Standard indoor cubicle panel dimensions (e.g. 800 mm width x 1600 mm depth x 2100 mm height) [AI SUGGESTED]'
    ],
    environmental_conditions: [
      'Indoor substation installation (-5°C to +45°C; relative humidity up to 95%) [AI SUGGESTED]'
    ],
    safety_requirements: [
      'Mechanical and electrical safety interlocks preventing racked-in operation when breaker is closed [AI SUGGESTED]',
      'Integral earthing switch with making capacity conforming to IS/IEC 62271-100 [AI SUGGESTED]'
    ],
    testing_requirements: [
      'Short-time and peak withstand current tests conforming to IS/IEC 62271-100 [AI SUGGESTED]',
      'Power frequency voltage withstand test and lightning impulse voltage test [AI SUGGESTED]',
      'Mechanical operating endurance test [AI SUGGESTED]'
    ],
    certification_requirements: [
      'Bureau of Indian Standards Scheme-I (ISI Mark) conforming to IS/IEC 62271-100 / IS/IEC 60947-2 [AI SUGGESTED]',
      'DPIIT Circuit Breakers Quality Control Order [AI SUGGESTED]'
    ],
    clarifications: [
      'What rated voltage and breaking capacity are required (e.g. 11 kV / 25 kA vs 415 V / 50 kA)?',
      'What operating mechanism is needed: Motorized spring operated or manual handle?',
      'What trip unit protection is specified: Microprocessor based LSIG or thermal-magnetic release?'
    ]
  },

  // Civil - Portland Cement & Concrete
  cement: {
    match_terms: ['cement', 'portland cement', 'opc', 'ppc', 'ordinary portland cement', 'pozzolana cement', 'slag cement'],
    council: 'CED',
    category: 'Civil Engineering / Cement and Concrete Products',
    application: 'Structural concrete, reinforced civil construction, masonry mortar, and precast infrastructure components',
    technical_requirements: [
      'Cement type and strength grade: OPC 43, OPC 53, or Portland Pozzolana Cement (PPC) [REQUIRES CONFIRMATION]',
      'Fineness specific surface (Blaine method) >= 225 m²/kg (>= 300 m²/kg for PPC) [AI SUGGESTED]',
      'Initial setting time >= 30 minutes; Final setting time <= 600 minutes [AI SUGGESTED]'
    ],
    materials: [
      'Intimately ground mixture of Portland cement clinker and natural high-purity gypsum retarder (max 5%) [AI SUGGESTED]',
      'Performance improver (fly ash / granulated blast furnace slag) within standardized mineral limits [AI SUGGESTED]'
    ],
    performance_requirements: [
      'Compressive strength: 3-day (>= 23/27 MPa), 7-day (>= 33/37 MPa), 28-day (>= 43/53 MPa for OPC 43/53) [AI SUGGESTED]',
      'Soundness: Le-Chatelier expansion <= 10 mm; Autoclave expansion <= 0.8% [AI SUGGESTED]'
    ],
    dimensions: [
      'Supplied in standard 50 kg HDPE/PP woven sacks or bulk pneumatic delivery tankers [AI SUGGESTED]'
    ],
    environmental_conditions: [
      'Storage in weatherproof dry godowns raised on timber platforms protected from moisture ingress [AI SUGGESTED]'
    ],
    safety_requirements: [
      'Chemical purity limits: Insoluble residue <= 5.0%; Magnesia (MgO) <= 6.0%; Total sulphur (SO3) <= 3.5% [AI SUGGESTED]',
      'Total chloride content <= 0.10% by mass (0.05% for prestressed concrete applications) [AI SUGGESTED]'
    ],
    testing_requirements: [
      'Compressive strength testing on standard mortar cubes per IS 4031 (Part 6) [AI SUGGESTED]',
      'Consistency and setting time determination per IS 4031 (Part 4 and Part 5) [AI SUGGESTED]',
      'Soundness test by Le-Chatelier and Autoclave methods per IS 4031 (Part 3) [AI SUGGESTED]',
      'Complete chemical analysis per IS 4032 [AI SUGGESTED]'
    ],
    certification_requirements: [
      'Bureau of Indian Standards Scheme-I (ISI Mark) conforming to IS 269:2015 (OPC) or IS 1489 (PPC) [AI SUGGESTED]',
      'Mandatory Cement (Quality Control) Order, 2003 (S.O. 191(E)) issued by DPIIT [AI SUGGESTED]'
    ],
    clarifications: [
      'What cement grade or type is required: Ordinary Portland Cement (OPC 43 / OPC 53) or Pozzolana Cement (PPC)?',
      'Is sulphate-resisting or low-heat cement required for marine / high-moisture foundations?',
      'What is the delivery mode: standard 50 kg moisture-proof bags or bulk container tankers?'
    ]
  },

  // Metallurgical - Steel Rebars (TMT)
  steel_rebars: {
    match_terms: ['steel bar', 'tmt bar', 'reinforcement bar', 'deformed steel bar', 'fe 500', 'fe 550', 'rebar', 'concrete reinforcement steel'],
    council: 'MTD',
    category: 'Metallurgical Engineering / Steel Reinforcement for Concrete',
    application: 'Reinforced concrete structures, bridges, high-rise buildings, and seismic-resistant infrastructure',
    technical_requirements: [
      'Strength grade designation: Fe 500, Fe 500D, Fe 550, or Fe 550D (High Ductility) [REQUIRES CONFIRMATION]',
      'Transverse ribs and longitudinal ribs geometry ensuring high concrete bond strength [AI SUGGESTED]',
      'Nominal diameters: 8, 10, 12, 16, 20, 25, 28, 32 mm with nominal mass tolerances [AI SUGGESTED]'
    ],
    materials: [
      'Thermo-Mechanically Treated (TMT) low-carbon killed steel from virgin iron billets [AI SUGGESTED]',
      'Strict chemical limits: Carbon <= 0.25%, Sulphur <= 0.040%, Phosphorus <= 0.040% [AI SUGGESTED]'
    ],
    performance_requirements: [
      '0.2% Proof stress (Yield strength) >= 500 MPa (or 550 MPa for Fe 550) [AI SUGGESTED]',
      'Tensile-to-Yield ratio (UTS/YS) >= 1.12 (1.10 for standard) ensuring structural plasticity [AI SUGGESTED]',
      'Total elongation at maximum force (uniform elongation) >= 5.0% (>= 16% total elongation for "D" grade) [AI SUGGESTED]'
    ],
    dimensions: [
      'Nominal diameter (mm), nominal cross-sectional area, and nominal mass per meter [AI SUGGESTED]'
    ],
    environmental_conditions: [
      'Atmospheric storage protected from standing water and excessive surface pitting rust [AI SUGGESTED]'
    ],
    safety_requirements: [
      'Superior seismic ductility preventing sudden brittle collapse during earthquake cycles [AI SUGGESTED]',
      'Bend and rebend without transverse or longitudinal surface cracks around specified mandrels [AI SUGGESTED]'
    ],
    testing_requirements: [
      'Tensile proof stress, ultimate tensile strength, and elongation test per IS 1608 [AI SUGGESTED]',
      'Cold bend test and 135-degree rebend test per IS 1599 [AI SUGGESTED]',
      'Rib deformation geometry and concrete bond pull-out test [AI SUGGESTED]',
      'Chemical spectrographic analysis of each manufacturing heat [AI SUGGESTED]'
    ],
    certification_requirements: [
      'Bureau of Indian Standards Scheme-I (ISI Mark) conforming to IS 1786:2008 [AI SUGGESTED]',
      'Mandatory Steel and Steel Products (Quality Control) Order issued by Ministry of Steel [AI SUGGESTED]'
    ],
    clarifications: [
      'What strength grade is required: Fe 500, Fe 500D (Earthquake/Ductile), or Fe 550D?',
      'What are the required nominal bar diameters (e.g. 8 mm, 12 mm, 16 mm, 25 mm) and delivery lengths?',
      'Is Corrosion Resistant Steel (CRS / epoxy coated) required for coastal / saline environments?'
    ]
  },

  // Mechanical - Water Pumps
  water_pumps: {
    match_terms: ['water pump', 'centrifugal pump', 'submersible pump', 'monobloc pump', 'agricultural pump', 'borewell pump'],
    council: 'MED',
    category: 'Mechanical Engineering / Pumps and Pumping Equipment',
    application: 'Agricultural irrigation, municipal drinking water supply, industrial effluent dewatering, and building booster sets',
    technical_requirements: [
      'Rated pump discharge capacity (LPS or m³/hr) and total dynamic head (meters) [AI SUGGESTED]',
      'Pump configuration: Horizontal centrifugal, single-stage monobloc, or multi-stage submersible [REQUIRES CONFIRMATION]',
      'Power supply prime mover: Single-phase 230 V or Three-phase 415 V 50 Hz electric motor [REQUIRES CONFIRMATION]'
    ],
    materials: [
      'High-grade closed-grain cast iron (FG 200/260) or stainless steel pump casing [AI SUGGESTED]',
      'Dynamically balanced bronze, cast iron, or SS304/SS316 impeller [AI SUGGESTED]',
      'High-tensile stainless steel shaft with mechanical carbon/ceramic face seal [AI SUGGESTED]'
    ],
    performance_requirements: [
      'Overall pump efficiency meeting BEE Energy Efficiency star rating limits [AI SUGGESTED]',
      'Hydrostatic casing pressure proof test at 1.5x maximum working discharge pressure [AI SUGGESTED]',
      'Net Positive Suction Head Required (NPSHR) preventing cavitation erosion [AI SUGGESTED]'
    ],
    dimensions: [
      'Suction and delivery pipe nominal connection sizes (e.g. 50x50 mm, 80x65 mm, 100x100 mm) [AI SUGGESTED]'
    ],
    environmental_conditions: [
      'Pumping clean cold water (temperature up to 45°C; total dissolved solids <= 1000 ppm) [AI SUGGESTED]',
      'Ambient plant or field temperature up to 50°C; IP55 or IP68 for submersible motors [AI SUGGESTED]'
    ],
    safety_requirements: [
      'Thermal overload protector (TOP) in motor windings preventing burnout [AI SUGGESTED]',
      'Fully enclosed rotating couplings and protective grounding terminals [AI SUGGESTED]'
    ],
    testing_requirements: [
      'Hydraulic performance test curve (Head vs Discharge vs Power vs Efficiency) per IS 9137 / IS 5120 [AI SUGGESTED]',
      'Casing hydrostatic pressure test [AI SUGGESTED]',
      'Motor high-voltage insulation withstand and full-load temperature rise test [AI SUGGESTED]'
    ],
    certification_requirements: [
      'Bureau of Indian Standards Scheme-I (ISI Mark) conforming to IS 6595 / IS 1520 / IS 14220 [AI SUGGESTED]',
      'Bureau of Energy Efficiency (BEE) Star Rating and Pumps Quality Control Order [AI SUGGESTED]'
    ],
    clarifications: [
      'What are the operating duty parameters: required flow rate (LPS/m³h) and total head (meters)?',
      'What type of installation: Open-well monobloc, surface centrifugal, or deep borewell submersible?',
      'What power supply is available: Single-phase 230 V or Three-phase 415 V AC?'
    ]
  },

  // Electrical - Electric Motors
  electric_motors: {
    match_terms: ['electric motor', 'induction motor', 'three phase motor', 'single phase motor', 'ac motor', 'industrial motor'],
    council: 'ETD',
    category: 'Electrotechnical / Electric Motors and Generators',
    application: 'Industrial machine drives, pumps, fans, compressors, conveyors, and mechanical equipment',
    technical_requirements: [
      'Motor rating: kW / HP continuous duty (S1 duty cycle) [AI SUGGESTED]',
      'Supply voltage and frequency: 415 V ± 10%, 3-phase, 50 Hz ± 5% [REQUIRES CONFIRMATION]',
      'Synchronous speed / number of poles: 2-Pole (3000 rpm), 4-Pole (1500 rpm), or 6-Pole (1000 rpm) [REQUIRES CONFIRMATION]',
      'Efficiency class: IE2 (High Efficiency) or IE3 (Premium Efficiency) per IS 12615 [AI SUGGESTED]'
    ],
    materials: [
      'Cast iron frame and end shields (or high-grade aluminium alloy for smaller frames) [AI SUGGESTED]',
      'Class F insulation with Class B temperature rise limit; dual-coated enamelled copper wire [AI SUGGESTED]',
      'Low-loss silicon electrical steel core laminations [AI SUGGESTED]'
    ],
    performance_requirements: [
      'Full-load efficiency conforming to mandatory IE2/IE3 limits [AI SUGGESTED]',
      'Breakdown torque >= 200% of full load torque; locked rotor current within standard limits [AI SUGGESTED]',
      'Low vibration velocity severity conforming to Class A of IS 12075 [AI SUGGESTED]'
    ],
    dimensions: [
      'Standard IEC frame sizes (e.g. 80M, 90L, 100L, 132M, 160M, 200L) with foot (B3) or flange (B5) mounting [AI SUGGESTED]'
    ],
    environmental_conditions: [
      'Ambient operating temperature: -20°C to +50°C; Ingress protection IP55 minimum [AI SUGGESTED]'
    ],
    safety_requirements: [
      'Dual external and internal earthing terminals [AI SUGGESTED]',
      'Thermal endurance and flame retardance of terminal block assembly [AI SUGGESTED]'
    ],
    testing_requirements: [
      'Efficiency determination by summation of losses method per IS 12615 [AI SUGGESTED]',
      'High-voltage withstand test (1000 V + 2x rated voltage for 1 minute) [AI SUGGESTED]',
      'Full-load temperature rise test by resistance method [AI SUGGESTED]'
    ],
    certification_requirements: [
      'Bureau of Indian Standards Scheme-I (ISI Mark) conforming to IS 12615 / IS 325 [AI SUGGESTED]',
      'Electric Motors (Quality Control) Order issued by DPIIT [AI SUGGESTED]'
    ],
    clarifications: [
      'What power rating (kW / HP) and rotational speed (e.g. 1500 rpm / 4-pole) are required?',
      'What mounting arrangement is needed: Foot mounting (B3), Flange mounting (B5), or Face mounting (B14)?',
      'What energy efficiency level: IE2 (High Efficiency) or IE3 (Premium Efficiency)?'
    ]
  },

  // Electrical - Power & Distribution Transformers
  transformers: {
    match_terms: ['transformer', 'distribution transformer', 'power transformer', 'step down transformer', 'oil filled transformer'],
    council: 'ETD',
    category: 'Electrotechnical / Transformers and Power Conversion',
    application: 'Electrical utilities, commercial sub-stations, and industrial plant step-down power distribution',
    technical_requirements: [
      'Rated kVA capacity: (e.g. 100, 250, 500, 1000, 2500 kVA) [AI SUGGESTED]',
      'Voltage ratio: 11 kV / 433 V or 33 kV / 433 V (or declared primary/secondary voltages) [REQUIRES CONFIRMATION]',
      'Vector group designation: Dyn11 (Delta-Star with neutral) [AI SUGGESTED]',
      'Cooling type: ONAN (Oil Natural Air Natural) or Dry-type AN [REQUIRES CONFIRMATION]'
    ],
    materials: [
      'High-grade Cold Rolled Grain Oriented (CRGO) magnetic silicon steel core laminations [AI SUGGESTED]',
      'Electrolytic copper or EC-grade aluminium winding conductor with paper/enamel insulation [AI SUGGESTED]',
      'Inhibited or uninhibited mineral insulating transformer oil conforming to IS 335 [AI SUGGESTED]'
    ],
    performance_requirements: [
      'Total maximum allowable electrical losses at 50% and 100% loading conforming strictly to BEE/IS 1180 limits [AI SUGGESTED]',
      'Short-circuit dynamic withstand capability without internal mechanical distortion [AI SUGGESTED]',
      'Temperature rise limits: Winding <= 55°C; Top oil <= 50°C above ambient [AI SUGGESTED]'
    ],
    dimensions: [
      'Tank dimensions, roller center spacing, and overall clearance clearances [AI SUGGESTED]'
    ],
    environmental_conditions: [
      'Outdoor tropical ambient temperature up to 50°C; severe solar radiation [AI SUGGESTED]'
    ],
    safety_requirements: [
      'Conservator tank with silica gel dehydrating breather and magnetic oil level gauge [AI SUGGESTED]',
      'Pressure relief device (PRD) and Buchholz relay protection for ratings above 1000 kVA [AI SUGGESTED]'
    ],
    testing_requirements: [
      'No-load loss and load loss measurement at 75°C per IS 1180 (Part 1) [AI SUGGESTED]',
      'Separate source AC withstand voltage test and induced overvoltage test [AI SUGGESTED]',
      'Transformer oil breakdown voltage (BDV) and moisture testing per IS 335 [AI SUGGESTED]'
    ],
    certification_requirements: [
      'Bureau of Indian Standards Scheme-I (ISI Mark) conforming to IS 1180 (Part 1):2014 [AI SUGGESTED]',
      'Distribution Transformers (Quality Control) Order and BEE Star Labeling compliance [AI SUGGESTED]'
    ],
    clarifications: [
      'What is the rated capacity (kVA) and voltage ratio (e.g. 11 kV to 433 V)?',
      'What cooling type is specified: Oil-immersed ONAN or Dry-type Cast Resin?',
      'What BEE Energy Efficiency star rating or maximum total loss level is required?'
    ]
  },

  // LITD / Solar - Solar Photovoltaic Modules
  solar_panels: {
    match_terms: ['solar panel', 'solar pv module', 'photovoltaic module', 'solar module', 'monocrystalline solar', 'polycrystalline solar'],
    council: 'LITD',
    category: 'Electronics and Renewable Energy / Solar Photovoltaic Systems',
    application: 'Rooftop solar power systems, utility-scale photovoltaic solar parks, and off-grid solar power generation',
    technical_requirements: [
      'Cell technology: Mono-PERC, Polycrystalline, N-Type TOPCon, or Heterojunction (HJT) [REQUIRES CONFIRMATION]',
      'Nominal peak power output (Wp): e.g. 330 Wp, 450 Wp, 540 Wp, 650 Wp [AI SUGGESTED]',
      'Maximum system voltage: 1000 V DC or 1500 V DC [AI SUGGESTED]',
      'Bifaciality factor (for bifacial modules generating from both sides) where specified [REQUIRES CONFIRMATION]'
    ],
    materials: [
      'High-transmittance low-iron tempered front glass (minimum 3.2 mm thickness) [AI SUGGESTED]',
      'Anodized aluminium alloy corrosion-resistant frame with grounding holes [AI SUGGESTED]',
      'UV-resistant EVA / POE encapsulant and multi-layer weather-resistant backsheet [AI SUGGESTED]',
      'IP68 rated junction box with integrated bypass diodes and solar MC4 connectors [AI SUGGESTED]'
    ],
    performance_requirements: [
      'Module conversion efficiency >= 20.0% under Standard Test Conditions (STC: 1000 W/m², 25°C, AM1.5) [AI SUGGESTED]',
      'Low temperature coefficient of maximum power (Pmax <= -0.35%/°C) [AI SUGGESTED]',
      'Linear power degradation warranty: <= 2% in Year 1, and >= 80% output retained after 25 years [AI SUGGESTED]'
    ],
    dimensions: [
      'Standard physical module dimensions (e.g. ~2278 mm x 1134 mm x 35 mm) and cable lead length [AI SUGGESTED]'
    ],
    environmental_conditions: [
      'Operating ambient temperature: -40°C to +85°C; resistant to sand, dust, and ammonia/salt mist [AI SUGGESTED]'
    ],
    safety_requirements: [
      'Electrical Class II insulation and fire safety rating (Class C per UL 790) [AI SUGGESTED]',
      'Mechanical surface load withstand: 5400 Pa front load (snow/wind) and 2400 Pa rear wind load [AI SUGGESTED]',
      'Potential Induced Degradation (PID) resistance and Hot-spot endurance [AI SUGGESTED]'
    ],
    testing_requirements: [
      'Design qualification and type approval testing conforming to IS 14286 / IEC 61215 [AI SUGGESTED]',
      'Safety qualification testing conforming to IS/IEC 61730 (Part 1 and Part 2) [AI SUGGESTED]',
      'Electroluminescence (EL) imaging verification free from micro-cracks [AI SUGGESTED]'
    ],
    certification_requirements: [
      'Bureau of Indian Standards Compulsory Registration Scheme (CRS) / Scheme-II under IS 14286 & IS/IEC 61730 [AI SUGGESTED]',
      'Ministry of New and Renewable Energy (MNRE) Approved List of Models and Manufacturers (ALMM) [AI SUGGESTED]'
    ],
    clarifications: [
      'What cell technology and power rating (Wp) are required: Mono-PERC, Polycrystalline, or TOPCon?',
      'Are Monofacial or Bifacial (dual-glass) modules required?',
      'Is inclusion in MNRE ALMM (Approved List of Models and Manufacturers) mandatory for this procurement?'
    ]
  },

  // Fire Safety - Fire Extinguishers
  fire_extinguishers: {
    match_terms: ['fire extinguisher', 'dry powder extinguisher', 'co2 extinguisher', 'foam extinguisher', 'fire safety equipment'],
    council: 'CED',
    category: 'Civil Engineering / Fire Protection and Safety Equipment',
    application: 'Commercial offices, industrial factories, warehouses, public institutions, and residential safety',
    technical_requirements: [
      'Extinguisher extinguishing agent type: ABC Dry Chemical Powder (MAP based), CO2 gas, or Water/AFFF Foam [REQUIRES CONFIRMATION]',
      'Nominal agent charge capacity: 2 kg, 4 kg, 6 kg, 9 kg, or 50 kg wheeled unit [AI SUGGESTED]',
      'Minimum fire rating classification (e.g. 21A / 144B for 6 kg ABC powder) [AI SUGGESTED]',
      'Discharge duration >= 15 seconds; Effective discharge throw range >= 4 meters [AI SUGGESTED]'
    ],
    materials: [
      'Cold rolled steel deep-drawn welded body or seamless manganese steel gas cylinder [AI SUGGESTED]',
      'Epoxy-polyester internal lining and pure polyester powder external anti-corrosive red coating [AI SUGGESTED]',
      'Forged brass chrome-plated control valve with stainless steel safety pin [AI SUGGESTED]'
    ],
    performance_requirements: [
      'Hydraulic burst pressure proof test: minimum 2.5x working pressure (35 bar for stored pressure) [AI SUGGESTED]',
      'Operating temperature range: -30°C to +60°C [AI SUGGESTED]',
      'Total agent discharge percentage >= 85% of total rated mass [AI SUGGESTED]'
    ],
    dimensions: [
      'Cylinder height, outer diameter, and total gross charged weight [AI SUGGESTED]'
    ],
    environmental_conditions: [
      'Wall-mounted or trolley-mounted indoor and outdoor ambient weather exposure [AI SUGGESTED]'
    ],
    safety_requirements: [
      'Controllable squeeze-grip discharge mechanism with tamper-evident safety seal [AI SUGGESTED]',
      'Pressure relief burst disc protection on CO2 high-pressure cylinders [AI SUGGESTED]',
      'Non-toxic, electrically non-conductive extinguishing powder compound [AI SUGGESTED]'
    ],
    testing_requirements: [
      'Hydraulic pressure test and burst pressure test per IS 15683 [AI SUGGESTED]',
      'Fire knockdown rating test on standardized Class A wood cribs and Class B liquid fuel trays [AI SUGGESTED]',
      'Discharge time, throw range, and chemical analysis of extinguishing agent [AI SUGGESTED]'
    ],
    certification_requirements: [
      'Bureau of Indian Standards Scheme-I (ISI Mark) conforming to IS 15683:2018 [AI SUGGESTED]',
      'Fire Fighting Equipment (Quality Control) Order issued by Ministry of Commerce and Industry [AI SUGGESTED]'
    ],
    clarifications: [
      'What extinguishing agent type is required: ABC Dry Chemical Powder, Carbon Dioxide (CO2), Clean Agent, or Foam?',
      'What capacity size is needed (e.g. 2 kg, 4 kg, 6 kg, 9 kg)?',
      'What specific fire hazards are targeted: Class A (solids), Class B (liquids), Class C (gases), or Electrical fires?'
    ]
  },

  // Mechanical - Industrial Valves
  industrial_valves: {
    match_terms: ['industrial valve', 'gate valve', 'globe valve', 'check valve', 'ball valve', 'butterfly valve', 'sluice valve'],
    council: 'MED',
    category: 'Mechanical Engineering / Piping and Industrial Valves',
    application: 'Water pipelines, industrial process piping, oil and gas networks, steam supply, and chemical handling',
    technical_requirements: [
      'Valve type: Gate (isolating), Globe (throttling), Check / Non-Return (preventing backflow), or Ball/Butterfly [REQUIRES CONFIRMATION]',
      'Nominal size: DN 15 to DN 1200 mm; Pressure rating: Class 150 / 300 / 600 or PN 10 / PN 16 [AI SUGGESTED]',
      'End connection: Flanged (RF/FF to ASME B16.5 / IS 1538), Butt-weld, or Screwed ends [REQUIRES CONFIRMATION]',
      'Operation mode: Handwheel, Gear operator, Pneumatic actuator, or Electric motor actuator [REQUIRES CONFIRMATION]'
    ],
    materials: [
      'Body and bonnet: Cast carbon steel (WCB), Ductile iron (GGG40), or Stainless steel (CF8M/SS316) [AI SUGGESTED]',
      'Trim: 13% Chromium stainless steel (Trim 8 / Trim 5) or Stellite hard-faced seating faces [AI SUGGESTED]',
      'Stem: Martensitic or Austenitic stainless steel with graphite gland packing [AI SUGGESTED]'
    ],
    performance_requirements: [
      'Zero shell leakage during high-pressure hydrostatic testing [AI SUGGESTED]',
      'Zero seat leakage (conforming to API 598 or ISO 5208 Rate A for resilient seats) [AI SUGGESTED]'
    ],
    dimensions: [
      'Face-to-face dimensions conforming strictly to ASME B16.10 or IS 14846 [AI SUGGESTED]'
    ],
    environmental_conditions: [
      'Fluid service temperature: -29°C to +425°C depending on material trim [AI SUGGESTED]'
    ],
    safety_requirements: [
      'Blow-out proof stem design and fire-safe certified construction [AI SUGGESTED]',
      'Anti-static electrical continuity grounding between ball/plug and body [AI SUGGESTED]'
    ],
    testing_requirements: [
      'Hydrostatic shell test at 1.5x cold working pressure per IS 14846 / API 598 [AI SUGGESTED]',
      'Hydrostatic and low-pressure air seat leakage testing [AI SUGGESTED]'
    ],
    certification_requirements: [
      'Bureau of Indian Standards Scheme-I (ISI Mark) conforming to IS 14846 / IS 778 [AI SUGGESTED]',
      'Valves Quality Control Order issued by DPIIT [AI SUGGESTED]'
    ],
    clarifications: [
      'What valve style is required: Sluice/Gate valve, Ball valve, Butterfly valve, or Non-Return valve?',
      'What is the nominal size (DN in mm) and pressure rating (PN / Class)?',
      'What fluid media is being handled: Drinking water, industrial steam, corrosive chemicals, or hydrocarbons?'
    ]
  },

  // Food / WRD - Packaged Drinking Water
  packaged_water: {
    match_terms: ['packaged drinking water', 'mineral water', 'bottled water', 'packaged water'],
    council: 'FAD',
    category: 'Food and Agriculture / Packaged Water and Beverages',
    application: 'Safe hygienic drinking water for human consumption in public, office, and household sectors',
    technical_requirements: [
      'Source processing: Multi-barrier purification (filtration, reverse osmosis, UV disinfection, and ozonation) [AI SUGGESTED]',
      'Remineralization with essential mineral salts (Magnesium, Potassium, Calcium) [AI SUGGESTED]',
      'Total Dissolved Solids (TDS): 75 to 500 mg/L [AI SUGGESTED]'
    ],
    materials: [
      'Food-grade virgin polyethylene terephthalate (PET) bottles conforming to IS 12252 [AI SUGGESTED]',
      'Tamper-evident food-grade polypropylene closures with tamper-proof seal ring [AI SUGGESTED]'
    ],
    performance_requirements: [
      'Organoleptic quality: Colorless, clear, odorless, and agreeable refreshing taste [AI SUGGESTED]',
      'pH value between 6.5 and 8.5 [AI SUGGESTED]'
    ],
    dimensions: [
      'Standard container volumes: 250 ml, 500 ml, 1 Litre, 2 Litre, and 20 Litre bulk refill jars [AI SUGGESTED]'
    ],
    environmental_conditions: [
      'Hygienic storage protected from direct sunlight, fuel fumes, and foreign contaminants [AI SUGGESTED]'
    ],
    safety_requirements: [
      'Microbiological safety: Zero total coliform, E. coli, Salmonella, Pseudomonas aeruginosa, and virus [AI SUGGESTED]',
      'Heavy metals limits: Lead <= 0.01 mg/L, Arsenic <= 0.01 mg/L, Mercury <= 0.001 mg/L, Cadmium <= 0.003 mg/L [AI SUGGESTED]',
      'Pesticide residues: Individual pesticide <= 0.0001 mg/L; Total pesticides <= 0.0005 mg/L [AI SUGGESTED]'
    ],
    testing_requirements: [
      'Microbiological testing per IS 14543 Annex D [AI SUGGESTED]',
      'Pesticide residue testing by Gas Chromatography Mass Spectrometry (GC-MS) [AI SUGGESTED]',
      'Chemical and mineral testing per IS 3025 [AI SUGGESTED]'
    ],
    certification_requirements: [
      'Mandatory Bureau of Indian Standards Scheme-I (ISI Mark) conforming to IS 14543:2004 [AI SUGGESTED]',
      'Mandatory statutory certification under FSSAI Regulations and DPIIT QCO [AI SUGGESTED]'
    ],
    clarifications: [
      'What packaging volume is required: 250ml/500ml/1L retail PET bottles, or 20L bulk refill dispensers?',
      'Is Packaged Drinking Water (other than natural mineral water per IS 14543) or Natural Mineral Water (IS 13428) required?'
    ]
  },

  // PPE - Protective Gloves
  protective_gloves: {
    match_terms: ['protective gloves', 'safety gloves', 'leather gloves', 'rubber gloves', 'nitrile gloves', 'industrial gloves', 'chemical resistant gloves', 'surgical gloves', 'gloves'],
    council: 'CHD',
    category: 'Personal Protective Equipment / Hand and Arm Protection',
    application: 'Industrial workplaces requiring protection against mechanical abrasions, chemical hazards, thermal burns, or medical contamination',
    technical_requirements: [
      'Mechanical resistance levels (Abrasion, Blade cut, Tear, Puncture) conforming to IS 6994 / IS 15354 [AI SUGGESTED]',
      'Dexterity level (Grade 1 to 5) ensuring ergonomic finger mobility [AI SUGGESTED]',
      'Cuff style: Knit wrist, safety cuff, or extended gauntlet cuff (length >= 300 mm) [REQUIRES CONFIRMATION]'
    ],
    materials: [
      'Split grain leather, high-density polyethylene (HPPE), nitrile polymer, or natural rubber latex [AI SUGGESTED]',
      'Seamless knitted liner (13 gauge or 15 gauge) with breathable micro-foam palm coating [AI SUGGESTED]'
    ],
    performance_requirements: [
      'Abrasion resistance >= 2000 cycles (Level 2 or higher) [AI SUGGESTED]',
      'Blade cut resistance index or TDM cut test force >= 5 N [AI SUGGESTED]',
      'Liquid chemical permeation breakthrough time >= 30 minutes for declared challenge reagents [AI SUGGESTED]'
    ],
    dimensions: [
      'Standard ergonomic hand sizes: 7 (Small), 8 (Medium), 9 (Large), 10 (Extra Large) conforming to IS 6994 [AI SUGGESTED]'
    ],
    environmental_conditions: [
      'Dry, damp, or oily handling environments; operational temperature from -10°C to +80°C [AI SUGGESTED]'
    ],
    safety_requirements: [
      'Skin-compatibility: Free from restricted aromatic amines, heavy metals, and soluble latex protein allergens [AI SUGGESTED]',
      'Electrostatic dissipation or thermal insulation properties where specified [REQUIRES CONFIRMATION]'
    ],
    testing_requirements: [
      'Mechanical risk testing (Abrasion, Cut, Tear, Puncture) per IS 6994 / IS 15354 [AI SUGGESTED]',
      'Water permeability / leak test by air pressure or water inflation per IS 13422 [AI SUGGESTED]',
      'Chemical permeation testing per IS 15428 [AI SUGGESTED]'
    ],
    certification_requirements: [
      'Bureau of Indian Standards Scheme-I (ISI Mark) conforming to IS 6994 / IS 15354 / IS 13422 [AI SUGGESTED]',
      'Personal Protective Equipment Quality Control Orders [AI SUGGESTED]'
    ],
    clarifications: [
      'What specific hazards are targeted: Mechanical abrasion/cut, Chemical liquid splash, Electrical shock, or Thermal heat?',
      'What glove material is preferred: Heavy leather, seamless knitted HPPE composite, or Nitrile/Latex coating?',
      'What glove size distribution and cuff length (wrist vs gauntlet) are required?'
    ]
  },

  // Medical - Medical Equipment & Supplies
  medical_equipment: {
    match_terms: ['medical equipment', 'medical face mask', 'surgical mask', 'n95 mask', 'respirator', 'surgical gloves', 'hypodermic syringe', 'hospital bed', 'medical device'],
    council: 'MHD',
    category: 'Medical Equipment and Hospital Planning / Healthcare Supplies',
    application: 'Clinical care, infection prevention, surgical procedures, and patient treatment in hospitals and clinics',
    technical_requirements: [
      'Bacterial Filtration Efficiency (BFE) >= 98% and Particle Filtration Efficiency (PFE) >= 95% [AI SUGGESTED]',
      'Differential pressure (breathability) <= 40 Pa/cm² [AI SUGGESTED]',
      'Synthetic blood fluid penetration resistance >= 120 mmHg [AI SUGGESTED]'
    ],
    materials: [
      'Multi-layer non-woven fabric: Outer spunbond, middle electrostatically charged meltblown, inner hypoallergenic spunbond [AI SUGGESTED]',
      'Biocompatible malleable nose clip and latex-free elastic earloops/headbands [AI SUGGESTED]'
    ],
    performance_requirements: [
      'Continuous particle filtration without airborne particulate bypass [AI SUGGESTED]',
      'Tensile strength of earloops/attachment straps >= 10 N [AI SUGGESTED]'
    ],
    dimensions: [
      'Standard adult ergonomic mask dimensions (approx. 175 mm x 95 mm) or universal fit contour [AI SUGGESTED]'
    ],
    environmental_conditions: [
      'Clean hospital and clinical environment; sterile shelf packaging [AI SUGGESTED]'
    ],
    safety_requirements: [
      'Microbial cleanliness (bioburden) <= 30 CFU/g [AI SUGGESTED]',
      'Cytotoxicity and skin irritation clearance as per IS/ISO 10993 [AI SUGGESTED]'
    ],
    testing_requirements: [
      'Bacterial filtration efficiency test using Staphylococcus aureus aerosol per IS 16289 [AI SUGGESTED]',
      'Synthetic blood penetration resistance test per IS 16289 [AI SUGGESTED]',
      'Breathability differential pressure test [AI SUGGESTED]'
    ],
    certification_requirements: [
      'Bureau of Indian Standards Scheme-I (ISI Mark) conforming to IS 16289:2014 / IS 9473 [AI SUGGESTED]',
      'CDSCO Medical Device manufacturing license / Medical Devices Rules, 2017 [AI SUGGESTED]'
    ],
    clarifications: [
      'What protection class is required: Type I, Type II, or Type IIR (fluid-resistant surgical mask)?',
      'Is sterile individual blister packaging or non-sterile bulk dispenser packaging required?',
      'Is BIS Scheme-I (ISI Mark) or CDSCO Class A/B medical device certification required?'
    ]
  },

  // Agricultural - Agricultural Machinery & Sprayers
  agricultural_machinery: {
    match_terms: ['agricultural machinery', 'agricultural sprayer', 'knapsack sprayer', 'power tiller', 'tractor', 'rotavator', 'thresher', 'seed drill', 'farm equipment'],
    council: 'FAD',
    category: 'Food and Agriculture / Agricultural Machinery and Equipment',
    application: 'Crop protection, plant health spraying, field cultivation, and agricultural farm mechanization',
    technical_requirements: [
      'Working tank capacity (e.g. 16 Litres knapsack or 500 Litres tractor-mounted) [AI SUGGESTED]',
      'Operating pump pressure: 0.2 to 0.4 MPa (manual) or 1.5 to 3.0 MPa (power operated) [AI SUGGESTED]',
      'Discharge flow rate and uniform spray swath droplet distribution [AI SUGGESTED]'
    ],
    materials: [
      'Chemical-resistant UV-stabilized virgin HDPE tank body resistant to agrochemical degradation [AI SUGGESTED]',
      'Corrosion-resistant brass or stainless steel pump chamber, lance, and adjustable hollow-cone nozzle [AI SUGGESTED]'
    ],
    performance_requirements: [
      'Continuous volumetric spraying rate without pressure fluctuation or nozzle clogging [AI SUGGESTED]',
      'Drop test durability: Tank withstanding drop from 1 meter height when fully loaded without fracture or leakage [AI SUGGESTED]'
    ],
    dimensions: [
      'Tank dimensions, dry weight (<= 5.0 kg for knapsack), and lance length (minimum 60 cm) [AI SUGGESTED]'
    ],
    environmental_conditions: [
      'Outdoor agricultural field conditions, direct tropical sunlight up to 50°C, and exposure to corrosive agrochemicals [AI SUGGESTED]'
    ],
    safety_requirements: [
      'Zero chemical leakage from pressure relief valve or trigger shut-off assembly [AI SUGGESTED]',
      'Ergonomic padded shoulder harness straps preventing operator back fatigue [AI SUGGESTED]'
    ],
    testing_requirements: [
      'Discharge rate and spray angle verification per IS 3906 / IS 10134 [AI SUGGESTED]',
      'Hydrostatic pressure proof test and tank drop endurance test [AI SUGGESTED]',
      'Chemical resistance test with standard agrochemical formulations [AI SUGGESTED]'
    ],
    certification_requirements: [
      'Bureau of Indian Standards Scheme-I (ISI Mark) conforming to IS 3906 (Knapsack) or IS 11306 [AI SUGGESTED]',
      'Central Farm Machinery Training & Testing Institute (CFMTTI) commercial test report compliance [AI SUGGESTED]'
    ],
    clarifications: [
      'What prime mover is required: Manual lever-operated, Battery-powered electric, or Engine-driven?',
      'What tank capacity (e.g. 16 Litres knapsack vs 500 Litres tractor-drawn) is needed?',
      'What spray nozzles are specified: Hollow cone, flat fan, or adjustable trigger lance?'
    ]
  },

  // Textiles - Textile Fabrics & Apparel
  textile_fabric: {
    match_terms: ['textile fabric', 'textile', 'woven fabric', 'cotton fabric', 'polyester fabric', 'protective clothing fabric', 'canvas fabric', 'suiting fabric', 'shirting fabric', 'fabrics'],
    council: 'TXD',
    category: 'Textiles / Woven and Protective Fabrics',
    application: 'Industrial workwear, security uniforms, defense protective clothing, and commercial apparel',
    technical_requirements: [
      'Fibre composition: 100% Cotton, 67/33 Polyester-Cotton, or Inherently Flame Retardant (IFR) blend [REQUIRES CONFIRMATION]',
      'Fabric mass per unit area (GSM): e.g. 180, 240, 280, or 320 g/m² (± 5% tolerance) [AI SUGGESTED]',
      'Weave structure: 2/1 or 3/1 Twill weave, Plain weave, or Ripstop weave [AI SUGGESTED]'
    ],
    materials: [
      'Combed ring-spun cotton and high-tenacity polyester staple yarn [AI SUGGESTED]',
      'Vat dyes or reactive dyestuffs with high colour fastness properties [AI SUGGESTED]'
    ],
    performance_requirements: [
      'Tensile breaking strength: Warp >= 800 N; Weft >= 600 N (per IS 1969) [AI SUGGESTED]',
      'Tear strength: Warp >= 35 N; Weft >= 30 N (Elmendorf method per IS 6489) [AI SUGGESTED]',
      'Colour fastness to washing (Grade 4 minimum), light (Grade 5 minimum), and perspiration (Grade 4) [AI SUGGESTED]',
      'Dimensional stability: Maximum shrinkage <= 2.0% in warp and weft after repeated washing [AI SUGGESTED]'
    ],
    dimensions: [
      'Nominal fabric roll width: 147 cm to 152 cm (58 to 60 inches) with firm selvedges [AI SUGGESTED]'
    ],
    environmental_conditions: [
      'Standard tropical wear conditions, resistant to perspiration and UV sunlight fading [AI SUGGESTED]'
    ],
    safety_requirements: [
      'Skin-friendly: Free from AZO dyes, formaldehyde (<= 75 ppm), and banned pentachlorophenol [AI SUGGESTED]',
      'pH value of aqueous extract between 6.0 and 8.0 [AI SUGGESTED]'
    ],
    testing_requirements: [
      'Tensile strength and elongation test per IS 1969 [AI SUGGESTED]',
      'Tear strength test per IS 6489 [AI SUGGESTED]',
      'Colour fastness testing suite per IS 687 (Washing) and IS 2454 (Artificial Light) [AI SUGGESTED]',
      'Chemical test for free formaldehyde and banned amine identification [AI SUGGESTED]'
    ],
    certification_requirements: [
      'Bureau of Indian Standards Scheme-I (ISI Mark) conforming to IS 15852 / IS 11248 [AI SUGGESTED]',
      'Ministry of Textiles Technical Textiles Quality Control Orders [AI SUGGESTED]'
    ],
    clarifications: [
      'What blend ratio is required: 100% Cotton, Poly-Cotton blend, or Flame Retardant synthetic?',
      'What target fabric weight (GSM) and weave pattern (Plain vs Twill) are specified?',
      'Are specialized functional finishes needed (e.g. Water repellent, Oil repellent, Anti-microbial)?'
    ]
  },

  // Chemical - Industrial Chemicals & Disinfectants
  chemical_products: {
    match_terms: ['chemical product', 'chemical', 'caustic soda', 'sulphuric acid', 'hydrochloric acid', 'disinfectant fluid', 'bleaching powder', 'sodium hypochlorite', 'chemicals'],
    council: 'CHD',
    category: 'Chemical / Heavy Industrial Chemicals and Disinfectants',
    application: 'Industrial manufacturing, municipal water sanitation, effluent neutralization, and surface disinfection',
    technical_requirements: [
      'Active chemical assay concentration percentage (e.g. 98% pure, 33% solution, or 10-12% active chlorine) [AI SUGGESTED]',
      'Specific gravity / density and dynamic viscosity at 27°C [AI SUGGESTED]',
      'Insoluble matter and maximum allowable heavy metal impurity limits [AI SUGGESTED]'
    ],
    materials: [
      'Virgin synthesized industrial chemical compound free from recycled industrial contaminants [AI SUGGESTED]',
      'Corrosion-resistant packaging: UN-approved HDPE carboys, lined steel drums, or dedicated ISO road tankers [AI SUGGESTED]'
    ],
    performance_requirements: [
      'High chemical reactivity, fast neutralization efficiency, and high disinfection killing rate [AI SUGGESTED]',
      'Chemical stability retaining active content over specified shelf-life duration [AI SUGGESTED]'
    ],
    dimensions: [
      'Supplied in standard 50 kg drums, 200 L barrels, 1000 L IBC totes, or bulk road tankers [AI SUGGESTED]'
    ],
    environmental_conditions: [
      'Store in cool, dry, well-ventilated dedicated chemical store away from incompatible acids/bases [AI SUGGESTED]'
    ],
    safety_requirements: [
      'Corrosive hazard safety: Neutralization protocols, secondary containment bunds, and eye-wash station compliance [AI SUGGESTED]',
      'Material Safety Data Sheet (MSDS / SDS) conforming to GHS hazard labeling [AI SUGGESTED]'
    ],
    testing_requirements: [
      'Chemical titration assay and active ingredient determination per IS standards [AI SUGGESTED]',
      'Impurities analysis (Heavy metals, iron, chlorides, sulphates) per IS 252 / IS 261 [AI SUGGESTED]'
    ],
    certification_requirements: [
      'Bureau of Indian Standards Scheme-I (ISI Mark) conforming to IS 252 (Caustic Soda) / IS 261 / IS 1061 [AI SUGGESTED]',
      'Chemicals (Quality Control) Orders issued by Department of Chemicals and Petrochemicals [AI SUGGESTED]'
    ],
    clarifications: [
      'What active concentration grade (e.g. Rayon grade, Technical grade, or Pure grade) is required?',
      'What physical form is specified: Solid flakes/pellets or liquid aqueous lye solution?',
      'What packaging and delivery arrangement: 50 kg moisture-proof HDPE bags or bulk tanker delivery?'
    ]
  },

  // WRD / Water - Water Treatment Equipment
  water_treatment: {
    match_terms: ['water treatment equipment', 'water treatment plant', 'ro plant', 'water purifier', 'reverse osmosis', 'water filter', 'demineralization plant', 'softener', 'water treatment'],
    council: 'WRD',
    category: 'Water Resources and Environment / Water Purification and Treatment',
    application: 'Industrial boiler feed water, commercial drinking water purification, and municipal water treatment',
    technical_requirements: [
      'Plant treatment capacity (e.g. 500 LPH, 1000 LPH, 5000 LPH, or 10 KLD) [AI SUGGESTED]',
      'Raw water feed TDS tolerance (up to 2000 ppm) and permeate recovery ratio (>= 50%) [AI SUGGESTED]',
      'Multi-stage filtration: Sand filter, activated carbon, micron cartridge, RO membrane, and UV sterilization [AI SUGGESTED]'
    ],
    materials: [
      'SS304/SS316 high-pressure piping and skid frame; FRP composite filter pressure vessels [AI SUGGESTED]',
      'Polyamide thin-film composite (TFC) reverse osmosis spiral wound membranes [AI SUGGESTED]',
      'High-pressure multistage stainless steel centrifugal booster pump [AI SUGGESTED]'
    ],
    performance_requirements: [
      'Total Dissolved Solids (TDS) salt rejection rate >= 95% [AI SUGGESTED]',
      'Treated permeate water flow stability and low energy consumption per m³ [AI SUGGESTED]'
    ],
    dimensions: [
      'Skid dimensions, pipe header diameter, and footprint layout [AI SUGGESTED]'
    ],
    environmental_conditions: [
      'Operating temperature: 10°C to 40°C; ambient indoor plant environment [AI SUGGESTED]'
    ],
    safety_requirements: [
      'High-pressure and low-pressure automatic cut-off safety switches [AI SUGGESTED]',
      'Food-grade certified contact surfaces non-leaching into potable water [AI SUGGESTED]'
    ],
    testing_requirements: [
      'Membrane salt rejection and flux performance verification [AI SUGGESTED]',
      'Hydrostatic pressure proof test of piping skid at 1.5x operating pressure [AI SUGGESTED]',
      'Permeate water chemical and microbiological testing per IS 10500 [AI SUGGESTED]'
    ],
    certification_requirements: [
      'Bureau of Indian Standards Scheme-I (ISI Mark) conforming to IS 16240 / IS 14724 [AI SUGGESTED]',
      'Water Treatment Equipment Quality Control Orders [AI SUGGESTED]'
    ],
    clarifications: [
      'What is the design permeate flow capacity (Liters Per Hour or m³/day)?',
      'What are the raw feed water characteristics (TDS, Hardness, Silica, Biological load)?',
      'What post-treatment is required: UV disinfection, remineralization cartridge, or ozonation?'
    ]
  },

  // Food / MED - Food Processing Machinery
  food_processing: {
    match_terms: ['food processing machinery', 'food machinery', 'grain mill', 'flour mill', 'oil expeller', 'milk processing', 'food mixer', 'food packaging machine'],
    council: 'FAD',
    category: 'Food and Agriculture / Food Processing and Dairy Machinery',
    application: 'Commercial grain milling, food processing, dairy manufacturing, and hygienic food packaging',
    technical_requirements: [
      'Processing throughput capacity (e.g. 500 kg/hr, 1 Ton/hr, or 2000 Litres/hr) [AI SUGGESTED]',
      'Hygienic Clean-in-Place (CIP) design preventing dead zones and bacterial accumulation [AI SUGGESTED]',
      'Drive motor rating: Three-phase 415 V 50 Hz electric motor with variable frequency drive (VFD) [AI SUGGESTED]'
    ],
    materials: [
      'All food-contact surfaces fabricated from food-grade stainless steel SS304 or SS316L (mirror polished Ra <= 0.8 µm) [AI SUGGESTED]',
      'Food-grade sanitary elastomers (EPDM, Viton, or Silicone compliant with FDA/IS food contact) [AI SUGGESTED]'
    ],
    performance_requirements: [
      'Continuous production efficiency with minimal product loss (< 0.5%) [AI SUGGESTED]',
      'Precise temperature control during processing preventing thermal degradation of nutrients [AI SUGGESTED]'
    ],
    dimensions: [
      'Machine overall footprint, hopper intake height, and discharge clearance [AI SUGGESTED]'
    ],
    environmental_conditions: [
      'Washdown food plant environment: IP65 washdown electrical protection; ambient 10°C to 45°C [AI SUGGESTED]'
    ],
    safety_requirements: [
      'Safety interlock switches on all inspection covers and rotating shafts [AI SUGGESTED]',
      'Emergency stop pushbuttons located at operator station [AI SUGGESTED]'
    ],
    testing_requirements: [
      'Throughput capacity and energy consumption performance test [AI SUGGESTED]',
      'Hygienic cleanability and swab microbiological swab verification [AI SUGGESTED]',
      'Acoustic noise level test (< 85 dBA at operator ear level) [AI SUGGESTED]'
    ],
    certification_requirements: [
      'Compliance with BIS Food Hygiene & Machinery Safety standards (IS/ISO 14159) [AI SUGGESTED]',
      'FSSAI food processing machinery guidelines and Machinery QCOs [AI SUGGESTED]'
    ],
    clarifications: [
      'What food product is being processed: Dry grains/flour, liquid dairy/beverages, or paste/bakery?',
      'What target throughput capacity (kg/hr or Liters/hr) is needed?',
      'Is automated PLC-based touchscreen control required, or manual electro-mechanical operation?'
    ]
  },

  // Metallurgical - Structural Steel Products
  structural_steel: {
    match_terms: ['structural steel', 'steel beam', 'steel channel', 'steel angle', 'steel joist', 'hot rolled steel', 'structural steel products', 'isbe', 'ismc', 'isnt', 'steel section', 'steel sections'],
    council: 'MTD',
    category: 'Metallurgical Engineering / Structural Steel Beams, Channels and Sections',
    application: 'Industrial building frames, highway bridges, warehouse roof trusses, transmission towers, and civil structures',
    technical_requirements: [
      'Steel grade designation: E250 (Fe 410W), E300, E350 (Fe 490), or E450 Quality A/BR/B0/C [REQUIRES CONFIRMATION]',
      'Section profile type: ISMB (Standard Beam), ISMC (Standard Channel), ISA (Equal/Unequal Angle), or Hollow Sections [REQUIRES CONFIRMATION]',
      'Dimensional tolerances on depth, flange width, web thickness, and straightness conforming strictly to IS 1852 [AI SUGGESTED]'
    ],
    materials: [
      'Hot-rolled structural steel from continuously cast prime billets or slabs [AI SUGGESTED]',
      'Strict chemical composition: Carbon <= 0.23%, Manganese <= 1.50%, Sulphur <= 0.045%, Phosphorus <= 0.045% [AI SUGGESTED]',
      'Carbon Equivalent (CE) <= 0.42 ensuring high field weldability [AI SUGGESTED]'
    ],
    performance_requirements: [
      'Yield strength (0.2% proof stress) >= 250 MPa (or 350 MPa for E350 grade) [AI SUGGESTED]',
      'Ultimate tensile strength: 410 to 540 MPa with percentage elongation >= 23% [AI SUGGESTED]',
      'Charpy V-notch impact toughness: Minimum 27 Joules at 0°C (for Quality BR) or -20°C (for Quality B0) [AI SUGGESTED]'
    ],
    dimensions: [
      'Section designation (e.g. ISMB 300, ISMC 200, ISA 100x100x10), sectional area, and nominal mass per meter [AI SUGGESTED]'
    ],
    environmental_conditions: [
      'Atmospheric outdoor civil exposure; surface prepared by grit blasting (SA 2.5) with red-oxide zinc-chromate primer [AI SUGGESTED]'
    ],
    safety_requirements: [
      'Structural ductility and high seismic energy dissipation preventing catastrophic brittle fracture [AI SUGGESTED]',
      'Surface free from laminations, cracks, heavy seams, and blister defects [AI SUGGESTED]'
    ],
    testing_requirements: [
      'Tensile test, yield stress, and percentage elongation per IS 1608 [AI SUGGESTED]',
      'Charpy V-notch impact test per IS 1757 [AI SUGGESTED]',
      'Bend test around specified pin diameter per IS 1599 [AI SUGGESTED]',
      'Chemical analysis of each cast heat by optical emission spectrometry [AI SUGGESTED]'
    ],
    certification_requirements: [
      'Bureau of Indian Standards Scheme-I (ISI Mark) conforming to IS 2062:2011 [AI SUGGESTED]',
      'Mandatory Steel and Steel Products (Quality Control) Order issued by Ministry of Steel [AI SUGGESTED]'
    ],
    clarifications: [
      'What structural section profile is required: I-Beams (ISMB), Channels (ISMC), Angles (ISA), or Hollow Sections?',
      'What steel strength grade is specified: E250 (standard structural), E350 (high-tensile), or E450?',
      'What sub-quality impact level is required: Quality A (non-impact), Quality BR (impact at room temp), or Quality B0 (impact at 0°C)?'
    ]
  }
};

/**
 * Searches the 1,047 product families in PostgreSQL using full-text and trigram matching.
 * @param {string} text User input string
 * @returns {Promise<Object|null>} Matched product family record or null
 */
async function matchProductFamily(text) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return null;
  }
  const clean = text.trim();

  try {
    // 1. Check exact canonical name match
    const exactRes = await query(
      `SELECT pf.*
       FROM product_families pf
       WHERE pf.canonical_name ILIKE $1
       LIMIT 1`,
      [clean]
    );
    if (exactRes.rows.length > 0) {
      return exactRes.rows[0];
    }

    // 2. Check substring matching in canonical_name or alternate_names / common_synonyms
    const subRes = await query(
      `SELECT pf.*
       FROM product_families pf
       WHERE pf.canonical_name ILIKE $1
          OR pf.common_synonyms::text ILIKE $1
          OR pf.technical_keywords::text ILIKE $1
          OR pf.alternate_names::text ILIKE $1
       ORDER BY
         CASE WHEN pf.canonical_name ILIKE $1 THEN 1 ELSE 2 END,
         LENGTH(pf.canonical_name) ASC
       LIMIT 1`,
      [`%${clean}%`]
    );
    if (subRes.rows.length > 0) {
      return subRes.rows[0];
    }

    // 3. Token-based word search against canonical_name
    const stopWords = ['with', 'from', 'that', 'this', 'have', 'need', 'procurement', 'require', 'required', 'industries', 'industrial', 'for', 'and', 'the', 'suitable', 'good', 'quality'];
    const words = clean.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !stopWords.includes(w));
    if (words.length > 0) {
      const minMatch = words.length === 1 ? 1 : 2;
      const conditions = words.map((_, i) => `pf.canonical_name ILIKE $${i + 1}`).join(' OR ');
      const tokenRes = await query(
        `SELECT pf.*,
                (SELECT COUNT(*) FROM unnest(ARRAY[${words.map((_, i) => `$${i + 1}`).join(',')}]) AS w
                 WHERE pf.canonical_name ILIKE '%' || w || '%') as match_count
         FROM product_families pf
         WHERE ${conditions}
         ORDER BY match_count DESC,
                  CASE WHEN pf.canonical_name ILIKE '%pvc%' AND pf.canonical_name ILIKE '%cable%' THEN 1 ELSE 2 END,
                  LENGTH(pf.canonical_name) ASC
         LIMIT 5`,
        words.map(w => `%${w}%`)
      );

      if (tokenRes.rows.length > 0) {
        const best = tokenRes.rows[0];
        // Only accept match if at least minMatch words matched
        if (parseInt(best.match_count, 10) >= minMatch) {
          return best;
        }
      }
    }

    return null;
  } catch (err) {
    console.warn('[universalRequirementProfiles] DB search warning:', err.message);
    return null;
  }
}

/**
 * Retrieves verified standards mapped to a product family.
 * @param {number} productFamilyId Product family ID
 * @returns {Promise<Array<Object>>} List of mapped standards with technical fields
 */
async function getMappedStandardsForFamily(productFamilyId) {
  if (!productFamilyId) return [];
  try {
    const res = await query(
      `SELECT s.id, s.is_number, s.title, s.scope, s.category, s.division_council,
              s.technical_requirements, s.materials, s.performance_requirements,
              s.safety_requirements, s.testing_requirements, s.certification,
              s.version, s.publication_year, s.status,
              psm.relationship_type, psm.mandatory_status, psm.applicability_explanation
       FROM product_standard_mappings psm
       JOIN standards s ON psm.standard_id = s.id
       WHERE psm.product_family_id = $1
       ORDER BY
         CASE WHEN psm.relationship_type = 'primary_specification' THEN 1
              WHEN psm.relationship_type = 'safety_requirement' THEN 2
              ELSE 3 END,
         s.id ASC`,
      [productFamilyId]
    );
    return res.rows;
  } catch (err) {
    console.warn('[universalRequirementProfiles] Mapped standards query warning:', err.message);
    return [];
  }
}

/**
 * Extracts explicit user-provided constraints from the raw input text.
 * @param {string} text Raw user input
 * @returns {Object} Extracted user facts
 */
function extractUserProvidedFacts(text) {
  if (!text || typeof text !== 'string') return {};
  const lower = text.toLowerCase();
  const facts = {
    quantity: null,
    materials: [],
    ratings: [],
    explicit_standards: []
  };

  // Quantity detection (e.g. 5000 units, 100 sets, 500 pcs)
  const qtyMatch = text.match(/\b(\d[\d,]*)\s*(units?|pieces?|pcs?|nos?|sets?|meters?|mtrs?|kg|liters?)\b/i);
  if (qtyMatch) {
    facts.quantity = qtyMatch[0];
  }

  // Common user specified materials
  const materialKeywords = [
    { pattern: /\b(copper|cu)\b/i, label: 'Copper conductor specified by user' },
    { pattern: /\b(aluminium|aluminum|al)\b/i, label: 'Aluminium material specified by user' },
    { pattern: /\b(polycarbonate)\b/i, label: 'Polycarbonate material specified by user' },
    { pattern: /\b(stainless\s*steel|ss304|ss316)\b/i, label: 'Stainless steel construction specified by user' },
    { pattern: /\b(cast\s*iron)\b/i, label: 'Cast iron material specified by user' },
    { pattern: /\b(leather)\b/i, label: 'Leather construction specified by user' },
    { pattern: /\b(hdpe)\b/i, label: 'High-density polyethylene (HDPE) specified by user' }
  ];
  materialKeywords.forEach(mk => {
    if (mk.pattern.test(text)) {
      facts.materials.push(mk.label);
    }
  });

  // Voltage / Rating detection
  const ratingMatches = text.match(/\b(\d+\s*(?:v|kv|kw|hp|amp|a|kva|mhz|ghz|mpa|bar|mm))\b/gi);
  if (ratingMatches) {
    ratingMatches.slice(0, 5).forEach(r => facts.ratings.push(`User specified rating: ${r.trim()}`));
  }

  // Standards mentioned explicitly in user text
  const stdMatches = text.match(/\b(IS\s*[:/]?\s*\d+(?:\s*\([^)]+\))?(?::\d{4})?)\b/gi);
  if (stdMatches) {
    stdMatches.forEach(s => facts.explicit_standards.push(s.trim()));
  }

  return facts;
}

/**
 * Converts a JSON/object from the standards table into formatted bullet points.
 * @param {Object|Array|string} fieldVal Field content from database
 * @param {string} standardNumber Applicable standard (e.g. IS 2925:1984)
 * @returns {Array<string>} Formatted items with [VERIFIED INDIAN STANDARD: ...] tag
 */
function formatStandardItems(fieldVal, standardNumber) {
  if (!fieldVal) return [];
  const tag = `[VERIFIED INDIAN STANDARD: ${standardNumber}]`;
  const items = [];

  if (Array.isArray(fieldVal)) {
    fieldVal.forEach(item => {
      if (typeof item === 'string' && item.trim()) {
        items.push(`${item.trim()} ${tag}`);
      } else if (typeof item === 'object' && item !== null) {
        Object.entries(item).forEach(([k, v]) => {
          items.push(`${k.replace(/_/g, ' ')}: ${typeof v === 'object' ? JSON.stringify(v) : v} ${tag}`);
        });
      }
    });
  } else if (typeof fieldVal === 'object') {
    Object.entries(fieldVal).forEach(([k, v]) => {
      const label = k.replace(/_/g, ' ');
      if (Array.isArray(v)) {
        items.push(`${label}: ${v.join(', ')} ${tag}`);
      } else if (typeof v === 'object' && v !== null) {
        items.push(`${label}: ${JSON.stringify(v)} ${tag}`);
      } else if (v) {
        items.push(`${label}: ${v} ${tag}`);
      }
    });
  } else if (typeof fieldVal === 'string' && fieldVal.trim()) {
    items.push(`${fieldVal.trim()} ${tag}`);
  }

  return items;
}

/**
 * Core Universal Requirement Extraction Engine
 * Generates structured technical parameters for any product across all 17 BIS Division Councils.
 * @param {string} text User input text
 * @param {string} [inputType="general"] Input method
 * @returns {Promise<Object>} Sanitized 12-key requirements object with metadata
 */
async function extractUniversalRequirements(text, inputType = 'general') {
  const trimmedText = (text || '').trim();
  const langMeta = detectAndNormalizeQuery(trimmedText);

  // 1. Maintain 100% backward compatibility for Industrial Safety Helmet demo
  if (isHelmetQuery(trimmedText)) {
    const helmetReqs = getCuratedHelmetExtractedRequirements(inputType, trimmedText);
    return {
      success: true,
      requirements: helmetReqs,
      isCuratedDemo: true,
      council: 'CED',
      matchedFamily: 'Industrial Safety Helmet'
    };
  }

  // 2. Extract facts directly stated by user
  const userFacts = extractUserProvidedFacts(trimmedText);

  // 3. Match against product category schemas (Level 2)
  let categorySchema = null;
  const lowerText = trimmedText.toLowerCase();
  for (const [key, schema] of Object.entries(CATEGORY_PARAMETER_SCHEMAS)) {
    if (schema.match_terms.some(term => lowerText.includes(term))) {
      categorySchema = schema;
      break;
    }
  }

  // 4. Match against 1,047 Catalogue Product Families in PostgreSQL (Level 3)
  let matchedFamily = await matchProductFamily(trimmedText);

  // If a category schema is matched, ensure matchedFamily is compatible
  if (categorySchema && matchedFamily) {
    const termMatches = categorySchema.match_terms.some(t => matchedFamily.canonical_name.toLowerCase().includes(t));
    if (!termMatches) {
      // Discard mismatched family to avoid false attribution
      matchedFamily = null;
    }
  }

  // Determine Division Council code
  let councilCode = 'CED';
  if (categorySchema) {
    councilCode = categorySchema.council;
  } else if (matchedFamily && matchedFamily.division_council) {
    const dcLower = matchedFamily.division_council.toLowerCase();
    for (const [code, p] of Object.entries(DIVISION_COUNCIL_PROFILES)) {
      if (dcLower.includes(p.council_name.toLowerCase()) || dcLower.includes(code.toLowerCase()) || dcLower.includes(p.domain.toLowerCase())) {
        councilCode = code;
        break;
      }
    }
  }
  const councilProfile = DIVISION_COUNCIL_PROFILES[councilCode] || DIVISION_COUNCIL_PROFILES.CED;

  // 5. Query Applicable Indian Standards (Level 4)
  let mappedStandards = [];
  if (matchedFamily) {
    mappedStandards = await getMappedStandardsForFamily(matchedFamily.id);
  }
  const primaryStd = mappedStandards.find(s => s.relationship_type === 'primary_specification') || mappedStandards[0] || null;

  // Determine Product Name, Category & Application
  let productName = '';
  if (categorySchema) {
    const matchedTerm = categorySchema.match_terms.find(t => lowerText.includes(t));
    if (matchedFamily && matchedTerm && matchedFamily.canonical_name.toLowerCase().includes(matchedTerm)) {
      productName = matchedFamily.canonical_name;
    } else if (matchedTerm) {
      productName = matchedTerm.replace(/\b\w/g, c => c.toUpperCase());
    } else {
      productName = matchedFamily ? matchedFamily.canonical_name : 'Specified Product';
    }
  } else if (matchedFamily) {
    productName = matchedFamily.canonical_name;
  } else {
    productName = trimmedText.split('\n')[0].substring(0, 60).replace(/[^\w\s-]/g, '').trim() || 'Industrial Procurement Item';
  }

  const productCategory = (categorySchema && categorySchema.category) ||
    (matchedFamily && matchedFamily.subcategory) ||
    councilProfile.domain;

  const application = (categorySchema && categorySchema.application) ||
    (matchedFamily && matchedFamily.applications) ||
    councilProfile.typical_applications;

  // 6. Build the 12 Technical Requirement Sections
  const technicalReqs = [];
  const materials = [];
  const performanceReqs = [];
  const dimensions = [];
  const environmental = [];
  const safetyReqs = [];
  const testingReqs = [];
  const certificationReqs = [];
  const keywords = [];

  // A. User-Provided Facts ([USER PROVIDED])
  if (userFacts.quantity) {
    technicalReqs.push(`Procurement quantity: ${userFacts.quantity} [USER PROVIDED]`);
  }
  userFacts.ratings.forEach(r => technicalReqs.push(`${r} [USER PROVIDED]`));
  userFacts.materials.forEach(m => materials.push(`${m} [USER PROVIDED]`));

  // B. Standards-Derived Requirements ([VERIFIED INDIAN STANDARD: ...])
  if (primaryStd) {
    const stdNum = primaryStd.is_number;
    if (primaryStd.technical_requirements) {
      technicalReqs.push(...formatStandardItems(primaryStd.technical_requirements, stdNum));
    }
    if (primaryStd.materials) {
      materials.push(...formatStandardItems(primaryStd.materials, stdNum));
    }
    if (primaryStd.performance_requirements) {
      performanceReqs.push(...formatStandardItems(primaryStd.performance_requirements, stdNum));
    }
    if (primaryStd.safety_requirements) {
      safetyReqs.push(...formatStandardItems(primaryStd.safety_requirements, stdNum));
    }
    if (primaryStd.testing_requirements) {
      testingReqs.push(...formatStandardItems(primaryStd.testing_requirements, stdNum));
    }
    if (primaryStd.certification) {
      certificationReqs.push(...formatStandardItems(primaryStd.certification, stdNum));
    }
  }

  // C. Category-Level or Council-Level Suggestions ([AI SUGGESTED] & [REQUIRES CONFIRMATION])
  const baseSource = categorySchema || councilProfile;

  if (technicalReqs.length < 3 && baseSource.technical_requirements) {
    baseSource.technical_requirements.forEach(item => {
      if (!technicalReqs.some(r => r.includes(item.replace(/\s*\[.*\]$/, '')))) {
        technicalReqs.push(item);
      }
    });
  }

  if (materials.length < 2 && baseSource.materials) {
    baseSource.materials.forEach(item => {
      if (!materials.some(m => m.includes(item.replace(/\s*\[.*\]$/, '')))) {
        materials.push(item);
      }
    });
  }

  if (performanceReqs.length < 2 && baseSource.performance_requirements) {
    baseSource.performance_requirements.forEach(item => {
      if (!performanceReqs.some(p => p.includes(item.replace(/\s*\[.*\]$/, '')))) {
        performanceReqs.push(item);
      }
    });
  }

  if (dimensions.length === 0 && baseSource.dimensions) {
    dimensions.push(...baseSource.dimensions);
  }

  if (environmental.length === 0 && baseSource.environmental_conditions) {
    environmental.push(...baseSource.environmental_conditions);
  }

  if (safetyReqs.length === 0 && baseSource.safety_requirements) {
    safetyReqs.push(...baseSource.safety_requirements);
  }

  if (testingReqs.length === 0 && baseSource.testing_requirements) {
    testingReqs.push(...baseSource.testing_requirements);
  }

  if (certificationReqs.length === 0 && baseSource.certification_requirements) {
    certificationReqs.push(...baseSource.certification_requirements);
  }

  // Keywords
  keywords.push(productName.toLowerCase());
  if (categorySchema) {
    keywords.push(...categorySchema.match_terms.slice(0, 4));
  }
  if (matchedFamily && matchedFamily.technical_keywords) {
    const tk = Array.isArray(matchedFamily.technical_keywords)
      ? matchedFamily.technical_keywords
      : Object.values(matchedFamily.technical_keywords);
    keywords.push(...tk.slice(0, 4).map(k => String(k).toLowerCase()));
  }
  if (primaryStd) {
    keywords.push(primaryStd.is_number.toLowerCase());
  }
  keywords.push(councilProfile.council_name.toLowerCase());

  // Clarifications
  let clarifications = [];
  if (categorySchema && categorySchema.clarifications) {
    clarifications = [...categorySchema.clarifications];
  } else {
    clarifications = [
      `What is the primary operational environment and duty cycle for this ${productName}?`,
      `Are specific dimensional ratings, capacity ranges, or material grades required?`,
      `Is mandatory statutory Quality Control Order (QCO) certification needed for procurement?`
    ];
  }

  // Final structured requirements object conforming to 12-key schema
  const resultRequirements = {
    product_name: productName,
    product_category: productCategory,
    application: application,
    technical_requirements: technicalReqs,
    materials: materials,
    performance_requirements: performanceReqs,
    dimensions: dimensions,
    environmental_conditions: environmental,
    safety_requirements: safetyReqs,
    testing_requirements: testingReqs,
    certification_requirements: certificationReqs,
    important_keywords: Array.from(new Set(keywords)),
    clarification_questions: clarifications,
    multilingual: langMeta,
    metadata: {
      division_council: councilCode,
      council_name: councilProfile.council_name,
      matched_catalogue_family: matchedFamily ? matchedFamily.canonical_name : null,
      primary_standard: primaryStd ? primaryStd.is_number : null,
      has_standards_derived_requirements: !!primaryStd,
      has_ai_suggestions: true,
      has_user_provided_facts: userFacts.ratings.length > 0 || userFacts.materials.length > 0 || !!userFacts.quantity
    }
  };

  return {
    success: true,
    requirements: resultRequirements,
    council: councilCode,
    matchedFamily: matchedFamily ? matchedFamily.canonical_name : null
  };
}

module.exports = {
  DIVISION_COUNCIL_PROFILES,
  CATEGORY_PARAMETER_SCHEMAS,
  matchProductFamily,
  getMappedStandardsForFamily,
  extractUserProvidedFacts,
  extractUniversalRequirements
};
