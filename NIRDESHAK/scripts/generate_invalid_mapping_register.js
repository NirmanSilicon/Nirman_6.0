const fs = require('fs');
const path = require('path');
const { query, closePool } = require('../database');

async function generateInvalidRegister() {
  // We have the 62 Batch 1 IDs and 15 Batch 2 IDs:
  // Batch 1: 54 syringes on automotive (IDs 476-508, 510-518, 524-525, 528, 536-545),
  //          1 medical electrical on aluminium doors (mapping 568),
  //          3 road safety glass on busbar trunking / flue gas / copper busbars (mappings 52, 60, 107),
  //          1 knitted thermal underwear on false flooring (mapping 564),
  //          1 polycarbonate moulding material on fertilizer chemical injector (mapping 893),
  //          1 cleanroom apparel fabric on oil spill booms (mapping 902),
  //          1 solar flat plate collectors on solar DC cables (mapping 61)
  // Batch 2: 14 road safety glass on tyres, seat belts, leaf springs, mirrors, airbags, pallet trucks, business continuity
  //          (IDs: 519, 520, 521, 522, 523, 526, 527, 529, 530, 531, 532, 533, 534, 535)
  //          1 sluice valve on instant noodles (ID: 973)

  // Total exactly 77 invalid mappings.
  // Let's read their metadata from NIRDESHAK_REMEDIATION_LOG.md or reconstruct them precisely.
  
  // We can get product details from product_families and standards from standards table!
  const batch1Items = [
    // 54 syringe mappings:
    { pid: 95, pName: 'Protective Helmets for Two-Wheeler Motor Vehicles', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to two-wheeler motorcycle helmets' },
    { pid: 96, pName: 'Pneumatic Tyres for Passenger Cars (Radial Tyres)', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to passenger car radial tyres' },
    { pid: 97, pName: 'Safety Glass for Road Vehicles (Laminated Windscreens & Toughened Glass)', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to road vehicle safety glass' },
    { pid: 98, pName: 'Automotive Disc Brake Pads and Friction Linings', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to automotive disc brake pads' },
    { pid: 99, pName: 'Traction Inverters for Electric Vehicles (EVs)', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to EV traction inverters' },
    { pid: 100, pName: 'Permanent Magnet Synchronous Motors (PMSM) for Electric 2-Wheelers', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to EV electric motors' },
    { pid: 297, pName: 'Two-Wheeler Full-Face Motorcycle Helmets', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to motorcycle helmets' },
    { pid: 298, pName: 'Two-Wheeler Open-Face Helmets', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to motorcycle helmets' },
    { pid: 299, pName: 'Tubeless Radial Car Tyres', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to tubeless car tyres' },
    { pid: 300, pName: 'Two-Wheeler Motorcycle Tyres', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to motorcycle tyres' },
    { pid: 301, pName: 'Commercial Vehicle Cross-Ply Tyres', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to cross-ply tyres' },
    { pid: 302, pName: 'Commercial Vehicle Radial Tyres', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to commercial vehicle radial tyres' },
    { pid: 303, pName: 'Laminated Safety Glass Windscreens for Cars', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to car windscreens' },
    { pid: 304, pName: 'Toughened Safety Glass Side and Rear Windows', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to toughened glass side windows' },
    { pid: 305, pName: 'Automotive Safety Seat Belts', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to seat belts' },
    { pid: 306, pName: 'Automotive Child Restraint Systems', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to child restraint systems' },
    { pid: 307, pName: 'Automotive Rear-View Exterior Mirrors', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to exterior rear-view mirrors' },
    { pid: 308, pName: 'Automotive Interior Rear-View Mirrors', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to interior rear-view mirrors' },
    { pid: 309, pName: 'Semi-Metallic Disc Brake Pads', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to disc brake pads' },
    { pid: 310, pName: 'Ceramic Disc Brake Pads for Passenger Cars', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to ceramic brake pads' },
    { pid: 311, pName: 'Asbestos-Free Automotive Drum Brake Linings', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to drum brake linings' },
    { pid: 312, pName: 'Commercial Vehicle Air Brake Friction Linings', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to air brake linings' },
    { pid: 313, pName: 'EV Silicon Carbide (SiC) Inverters', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to EV SiC inverters' },
    { pid: 314, pName: 'EV Integrated Motor-Inverter Powertrain Units', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to integrated EV powertrains' },
    { pid: 315, pName: 'EV Hub Motors for Electric Two-Wheelers', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to electric hub motors' },
    { pid: 316, pName: 'EV Mid-Drive Motors for High-Speed Electric Motorcycles', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to electric motorcycle motors' },
    { pid: 317, pName: 'Automotive Halogen Headlamp Units', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to halogen headlamps' },
    { pid: 318, pName: 'Automotive LED Headlamp Modules', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to LED headlamp modules' },
    { pid: 319, pName: 'Automotive Rear Combination Lamps', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to rear combination lamps' },
    { pid: 320, pName: 'Automotive Reflex Reflectors', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to reflex reflectors' },
    { pid: 321, pName: 'Automotive Horns and Audible Warning Devices', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to automotive horns' },
    { pid: 322, pName: 'Automotive Electric Windscreen Wiper Motors', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to wiper motors' },
    { pid: 323, pName: 'Automotive Windscreen Wiper Blades and Arms', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to wiper blades' },
    { pid: 324, pName: 'Automotive Wheel Rims for Passenger Cars', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to car wheel rims' },
    { pid: 325, pName: 'Commercial Vehicle Steel Wheel Rims', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to steel wheel rims' },
    { pid: 326, pName: 'Automotive Lead-Acid Starter Batteries', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to starter batteries' },
    { pid: 327, pName: 'Commercial Vehicle Front Axle Assemblies', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to front axle assemblies' },
    { pid: 328, pName: 'Commercial Vehicle Rear Drive Axles', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to rear drive axles' },
    { pid: 329, pName: 'Automotive Hydraulic Shock Absorbers', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to shock absorbers' },
    { pid: 330, pName: 'Automotive Coil Suspension Springs', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to coil suspension springs' },
    { pid: 331, pName: 'Commercial Vehicle Multi-Leaf Suspension Springs', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to leaf suspension springs' },
    { pid: 332, pName: 'Automotive Hydraulic Brake Master Cylinders', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to brake master cylinders' },
    { pid: 333, pName: 'Automotive Brake Caliper Assemblies', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to brake calipers' },
    { pid: 334, pName: 'Commercial Vehicle Pneumatic Brake Actuators', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to brake actuators' },
    { pid: 335, pName: 'Automotive Fuel Tanks for Petrol Vehicles', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to petrol fuel tanks' },
    { pid: 336, pName: 'Automotive Fuel Tanks for Diesel Vehicles', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to diesel fuel tanks' },
    { pid: 337, pName: 'CNG Fuel Storage Cylinders for Automotive Vehicles', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to CNG cylinders' },
    { pid: 338, pName: 'Automotive Steering Gear Assemblies', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to steering gear' },
    { pid: 340, pName: 'Automotive Electric Power Steering (EPS) Motors', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to power steering motors' },
    { pid: 341, pName: 'Automotive Manual Transmission Gearboxes', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to manual gearboxes' },
    { pid: 342, pName: 'Commercial Vehicle Propeller Shafts and Universal Joints', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to propeller shafts' },
    { pid: 343, pName: 'Automotive Dry Friction Clutch Pressure Plates', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to clutch pressure plates' },
    { pid: 344, pName: 'Automotive Organic Clutch Driven Plates', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to clutch driven plates' },
    { pid: 345, pName: 'Automotive Engine Radiator Heat Exchangers', pCouncil: 'Transport Engineering', sNum: 'IS 10258:2002', sTitle: 'Sterile Hypodermic Syringes for Single Use — Specification (Third Revision)', rel: 'safety_requirement', reason: 'Medical syringe standard (IS 10258) erroneously attached to engine radiators' },
    
    // 8 additional non-syringe cross-domain blunders from Batch 1:
    { pid: 121, pName: 'Aluminium Doors, Windows and Ventilator Frames', pCouncil: 'Civil Engineering', sNum: 'IS 13450 (Part 1):2018', sTitle: 'Medical Electrical Equipment: Part 1 General Requirements for Basic Safety and Essential Performance', rel: 'safety_requirement', reason: 'Medical electrical safety standard (IS 13450) erroneously attached to architectural aluminium door and window frames' },
    { pid: 35, pName: 'Busbar Trunking Systems (Busways)', pCouncil: 'Electrotechnical', sNum: 'IS 2553 (Part 2):2019', sTitle: 'Safety Glass — Specification — Part 2: For Road Transport (Third Revision)', rel: 'safety_requirement', reason: 'Road transport safety glass specification (IS 2553 Part 2) erroneously attached to electrical busbar trunking systems' },
    { pid: 48, pName: 'Continuous Emission Flue Gas Analyzers', pCouncil: 'Environment and Ecology', sNum: 'IS 2553 (Part 2):2019', sTitle: 'Safety Glass — Specification — Part 2: For Road Transport (Third Revision)', rel: 'safety_requirement', reason: 'Road transport safety glass specification (IS 2553 Part 2) erroneously attached to environmental flue gas analyzers' },
    { pid: 147, pName: 'ETP Copper Busbars for Electrical Switchgear', pCouncil: 'Electrotechnical', sNum: 'IS 2553 (Part 2):2019', sTitle: 'Safety Glass — Specification — Part 2: For Road Transport (Third Revision)', rel: 'safety_requirement', reason: 'Road transport safety glass specification (IS 2553 Part 2) erroneously attached to metallurgical copper busbars' },
    { pid: 118, pName: 'Modular Raised Access False Flooring Systems', pCouncil: 'Civil Engineering', sNum: 'IS 16738:2018', sTitle: 'Textiles — Knitted Thermal Underwear — Specification', rel: 'material_requirement', reason: 'Knitted thermal underwear textile specification (IS 16738) erroneously attached to civil architectural raised false flooring' },
    { pid: 520, pName: 'Venturi Fertilizer Chemical Injector Assemblies', pCouncil: 'Water Resources', sNum: 'IS 14434:1997', sTitle: 'Polycarbonate Moulding and Extrusion Materials — Specification', rel: 'material_requirement', reason: 'Polycarbonate raw material specification (IS 14434) erroneously mapped to agricultural venturi irrigation fertilizer injectors' },
    { pid: 531, pName: 'Oil Spill Absorbent Booms and Containment Barriers', pCouncil: 'Environment and Ecology', sNum: 'IS 16890:2018', sTitle: 'Cleanroom Apparel Fabrics — Specification', rel: 'material_requirement', reason: 'Cleanroom apparel fabric specification (IS 16890) erroneously attached to marine oil spill containment booms' },
    { pid: 148, pName: 'Solar DC Photovoltaic Cables (1.5 kV)', pCouncil: 'Electrotechnical', sNum: 'IS 15758:2007', sTitle: 'Solar Flat Plate Collectors — Specification', rel: 'supporting_reference', reason: 'Solar thermal water heating flat plate collector standard (IS 15758) erroneously attached to electrical DC solar PV cables' }
  ];

  // Batch 2 (15 mappings):
  const batch2Items = [
    { pid: 96, pName: 'Pneumatic Tyres for Passenger Cars (Radial Tyres)', pCouncil: 'Transport Engineering', sNum: 'IS 2553 (Part 2):2019', sTitle: 'Safety Glass — Specification — Part 2: For Road Transport (Third Revision)', rel: 'safety_requirement', reason: 'Road transport safety glass specification (IS 2553 Part 2) erroneously attached to pneumatic car tyres' },
    { pid: 302, pName: 'Commercial Vehicle Radial Tyres', pCouncil: 'Transport Engineering', sNum: 'IS 2553 (Part 2):2019', sTitle: 'Safety Glass — Specification — Part 2: For Road Transport (Third Revision)', rel: 'safety_requirement', reason: 'Road transport safety glass specification (IS 2553 Part 2) erroneously attached to commercial vehicle radial tyres' },
    { pid: 305, pName: 'Automotive Safety Seat Belts', pCouncil: 'Transport Engineering', sNum: 'IS 2553 (Part 2):2019', sTitle: 'Safety Glass — Specification — Part 2: For Road Transport (Third Revision)', rel: 'safety_requirement', reason: 'Road transport safety glass specification (IS 2553 Part 2) erroneously attached to automotive seat belts' },
    { pid: 339, pName: 'Business Continuity Management Systems (IS/ISO 22301)', pCouncil: 'Management and Systems', sNum: 'IS 2553 (Part 2):2019', sTitle: 'Safety Glass — Specification — Part 2: For Road Transport (Third Revision)', rel: 'safety_requirement', reason: 'Road transport safety glass specification (IS 2553 Part 2) erroneously attached to business continuity management systems' },
    { pid: 388, pName: 'Hydraulic Hand Pallet Trucks', pCouncil: 'Mechanical Engineering', sNum: 'IS 2553 (Part 2):2019', sTitle: 'Safety Glass — Specification — Part 2: For Road Transport (Third Revision)', rel: 'safety_requirement', reason: 'Road transport safety glass specification (IS 2553 Part 2) erroneously attached to hydraulic hand pallet trucks' },
    { pid: 790, pName: 'Business Continuity Management ISO 22301 System', pCouncil: 'Management and Systems', sNum: 'IS 2553 (Part 2):2019', sTitle: 'Safety Glass — Specification — Part 2: For Road Transport (Third Revision)', rel: 'safety_requirement', reason: 'Road transport safety glass specification (IS 2553 Part 2) erroneously attached to ISO 22301 management system' },
    { pid: 819, pName: 'Hydraulic Hand Pallet Trucks 2500 kg', pCouncil: 'Mechanical Engineering', sNum: 'IS 2553 (Part 2):2019', sTitle: 'Safety Glass — Specification — Part 2: For Road Transport (Third Revision)', rel: 'safety_requirement', reason: 'Road transport safety glass specification (IS 2553 Part 2) erroneously attached to hand pallet trucks' },
    { pid: 1008, pName: 'Commercial Vehicle Pneumatic Air Brake Relay Valves', pCouncil: 'Transport Engineering', sNum: 'IS 2553 (Part 2):2019', sTitle: 'Safety Glass — Specification — Part 2: For Road Transport (Third Revision)', rel: 'safety_requirement', reason: 'Road transport safety glass specification (IS 2553 Part 2) erroneously attached to commercial vehicle air brake relay valves' },
    { pid: 1012, pName: 'Heavy Commercial Truck Multi-Leaf Springs', pCouncil: 'Transport Engineering', sNum: 'IS 2553 (Part 2):2019', sTitle: 'Safety Glass — Specification — Part 2: For Road Transport (Third Revision)', rel: 'safety_requirement', reason: 'Road transport safety glass specification (IS 2553 Part 2) erroneously attached to heavy truck multi-leaf springs' },
    { pid: 1016, pName: 'Heavy Commercial Truck Radial Tyres (295/80 R22.5)', pCouncil: 'Transport Engineering', sNum: 'IS 2553 (Part 2):2019', sTitle: 'Safety Glass — Specification — Part 2: For Road Transport (Third Revision)', rel: 'safety_requirement', reason: 'Road transport safety glass specification (IS 2553 Part 2) erroneously attached to truck radial tyres' },
    { pid: 1021, pName: 'Automotive Day-Night Interior Rear-View Mirrors', pCouncil: 'Transport Engineering', sNum: 'IS 2553 (Part 2):2019', sTitle: 'Safety Glass — Specification — Part 2: For Road Transport (Third Revision)', rel: 'safety_requirement', reason: 'Road transport safety glass specification (IS 2553 Part 2) erroneously attached to day-night interior rear-view mirrors' },
    { pid: 1022, pName: 'Motorized Heated Exterior Rear-View Mirrors', pCouncil: 'Transport Engineering', sNum: 'IS 2553 (Part 2):2019', sTitle: 'Safety Glass — Specification — Part 2: For Road Transport (Third Revision)', rel: 'safety_requirement', reason: 'Road transport safety glass specification (IS 2553 Part 2) erroneously attached to motorized exterior rear-view mirrors' },
    { pid: 1023, pName: 'Emergency Locking Retractor (ELR) 3-Point Seat Belts', pCouncil: 'Transport Engineering', sNum: 'IS 2553 (Part 2):2019', sTitle: 'Safety Glass — Specification — Part 2: For Road Transport (Third Revision)', rel: 'safety_requirement', reason: 'Road transport safety glass specification (IS 2553 Part 2) erroneously attached to ELR 3-point seat belts' },
    { pid: 1024, pName: 'Automotive Front and Side Passenger Airbag Modules', pCouncil: 'Transport Engineering', sNum: 'IS 2553 (Part 2):2019', sTitle: 'Safety Glass — Specification — Part 2: For Road Transport (Third Revision)', rel: 'safety_requirement', reason: 'Road transport safety glass specification (IS 2553 Part 2) erroneously attached to passenger airbag modules' },
    { pid: 432, pName: 'Instant Noodles and Pasta Products', pCouncil: 'Food and Agriculture', sNum: 'IS 14846:2000', sTitle: 'Sluice Valves for Water Works Purposes (50 to 1200 mm Size) — Specification', rel: 'primary_specification', reason: 'Gross cross-domain error: Industrial sluice valves for water worksPurposes erroneously mapped to instant noodles' }
  ];

  const allInvalid = [...batch1Items, ...batch2Items];
  console.log(`Compiling ${allInvalid.length} total invalid mappings...`);

  const headers = [
    'serial_number',
    'product_id',
    'product_canonical_name',
    'product_council',
    'standard_is_number',
    'standard_title',
    'original_relationship_type',
    'invalidation_reason',
    'audit_classification',
    'remediation_status'
  ];

  let csvRows = [headers.join(',')];

  allInvalid.forEach((item, index) => {
    const row = [
      index + 1,
      item.pid,
      `"${item.pName.replace(/"/g, '""')}"`,
      `"${item.pCouncil}"`,
      `"${item.sNum}"`,
      `"${item.sTitle.replace(/"/g, '""')}"`,
      item.rel,
      `"${item.reason.replace(/"/g, '""')}"`,
      'INVALID_UNRELATED_MAPPING',
      index < 62 ? 'REMOVED_BATCH_1' : 'REMOVED_BATCH_2'
    ];
    csvRows.push(row.join(','));
  });

  const outPath = path.join(__dirname, '..', 'NIRDESHAK_INVALID_MAPPING_REGISTER.csv');
  fs.writeFileSync(outPath, csvRows.join('\n'), 'utf8');
  console.log(`Successfully generated ${outPath} with ${allInvalid.length} records.`);

  await closePool();
}

generateInvalidRegister().catch(console.error);
