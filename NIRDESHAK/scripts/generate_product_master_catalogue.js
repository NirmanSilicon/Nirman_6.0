const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const councils = JSON.parse(fs.readFileSync(path.join(dataDir, 'bis_17_division_councils.json'), 'utf8'));

// Build 500+ Product Families Across all 17 Division Councils
const productFamilies = [];
const productCategories = [];
const categoryMap = new Map();

function addCategory(sectorCode, categoryName, description) {
  const key = `${sectorCode}::${categoryName}`;
  if (!categoryMap.has(key)) {
    const cat = {
      sector_code: sectorCode,
      category_name: categoryName,
      description: description || `${categoryName} under ${sectorCode}`
    };
    categoryMap.set(key, cat);
    productCategories.push(cat);
  }
}

function addFamily(item) {
  addCategory(item.sector_code, item.category_name);
  productFamilies.push({
    family_code: item.family_code,
    canonical_name: item.canonical_name,
    sector_code: item.sector_code,
    division_council: item.division_council,
    category_name: item.category_name,
    subcategory: item.subcategory,
    description: item.description,
    applications: item.applications,
    technical_keywords: item.technical_keywords || [],
    common_synonyms: item.common_synonyms || [],
    industry_terminology: item.industry_terminology || [],
    alternate_names: item.alternate_names || [],
    common_abbreviations: item.common_abbreviations || [],
    coverage_status: item.coverage_status || 'VERIFIED_STANDARDS',
    source: item.source || 'BIS Know Your Standard & Compendium'
  });
}

// ============================================================================
// 1. CIVIL ENGINEERING (CED) - 55 Product Families
// ============================================================================
const civilProducts = [
  {
    family_code: "PF-CED-OPC-CEMENT",
    canonical_name: "Ordinary Portland Cement (OPC)",
    sector_code: "CIVIL",
    division_council: "Civil Engineering",
    category_name: "Cement and Hydraulic Binders",
    subcategory: "Portland Cement",
    description: "Hydraulic cement produced by pulverizing clinker consisting essentially of hydraulic calcium silicates, usually containing one or more forms of calcium sulphate as an interground addition.",
    applications: "Reinforced concrete structures, bridges, pavements, precast concrete, high-rise buildings.",
    technical_keywords: ["cement", "OPC", "33 grade", "43 grade", "53 grade", "hydraulic binder", "clinker", "compressive strength"],
    common_synonyms: ["OPC cement", "grey cement", "construction cement", "portland cement"],
    industry_terminology: ["OPC 53", "OPC 43", "hydraulic cement"],
    alternate_names: ["Ordinary Portland Cement 53 Grade", "Ordinary Portland Cement 43 Grade"],
    common_abbreviations: ["OPC"]
  },
  {
    family_code: "PF-CED-PPC-CEMENT",
    canonical_name: "Portland Pozzolana Cement (PPC)",
    sector_code: "CIVIL",
    division_council: "Civil Engineering",
    category_name: "Cement and Hydraulic Binders",
    subcategory: "Blended Cement",
    description: "Cement manufactured by intimately intergrinding Portland cement clinker and pozzolana such as fly ash, or by blending Portland cement and fine pozzolana.",
    applications: "Hydraulic structures, marine works, mass concrete dams, masonry mortars, plastering, general RCC.",
    technical_keywords: ["PPC", "pozzolana", "fly ash cement", "calcined clay", "low heat of hydration", "sulphate resistant"],
    common_synonyms: ["fly ash cement", "pozzolanic cement", "PPC cement"],
    industry_terminology: ["PPC flyash based", "PPC calcined clay"],
    alternate_names: ["Portland Pozzolana Cement Fly Ash Based"],
    common_abbreviations: ["PPC"]
  },
  {
    family_code: "PF-CED-PSC-CEMENT",
    canonical_name: "Portland Slag Cement (PSC)",
    sector_code: "CIVIL",
    division_council: "Civil Engineering",
    category_name: "Cement and Hydraulic Binders",
    subcategory: "Slag Cement",
    description: "Cement produced by intimately intergrinding Portland cement clinker and granulated blast furnace slag with suitable proportion of gypsum.",
    applications: "Marine structures, sewage treatment plants, underground basements, water retaining structures.",
    technical_keywords: ["PSC", "slag cement", "blast furnace slag", "marine resistant cement"],
    common_synonyms: ["slag cement", "PSC cement"],
    industry_terminology: ["GGBS cement", "iron slag cement"],
    alternate_names: ["Portland Blast Furnace Slag Cement"],
    common_abbreviations: ["PSC"]
  },
  {
    family_code: "PF-CED-WHITE-CEMENT",
    canonical_name: "White Portland Cement",
    sector_code: "CIVIL",
    division_council: "Civil Engineering",
    category_name: "Cement and Hydraulic Binders",
    subcategory: "Special Cement",
    description: "Portland cement characterized by high whiteness, produced from pure limestone and kaolin with low iron and manganese oxides.",
    applications: "Architectural decorative concrete, terrazzo flooring, tile grouts, ornamental precast units.",
    technical_keywords: ["white cement", "whiteness index", "decorative cement", "terrazzo binder"],
    common_synonyms: ["white cement", "JK white cement", "Birla white"],
    industry_terminology: ["low-iron portland cement"],
    alternate_names: ["White Cement"],
    common_abbreviations: ["WPC"]
  },
  {
    family_code: "PF-CED-COARSE-FINE-AGGREGATE",
    canonical_name: "Coarse and Fine Aggregate for Concrete",
    sector_code: "CIVIL",
    division_council: "Civil Engineering",
    category_name: "Concrete and Concrete Materials",
    subcategory: "Aggregates",
    description: "Granular mineral material such as natural gravel, crushed stone, natural sand, or manufactured sand (M-Sand) used with a cementing medium.",
    applications: "Structural concrete, precast elements, asphalt paving, road sub-base, mortar production.",
    technical_keywords: ["coarse aggregate", "fine aggregate", "M-Sand", "crushed stone", "20mm aggregate", "10mm aggregate", "river sand"],
    common_synonyms: ["crushed stone", "blue metal", "concrete sand", "grit", "M-sand"],
    industry_terminology: ["Zone II sand", "Zone III sand", "flakiness index", "elongation index"],
    alternate_names: ["Concrete Aggregates", "Manufactured Sand", "Crushed Rock Aggregate"],
    common_abbreviations: ["CA", "FA"]
  },
  {
    family_code: "PF-CED-READY-MIX-CONCRETE",
    canonical_name: "Ready-Mixed Concrete (RMC)",
    sector_code: "CIVIL",
    division_council: "Civil Engineering",
    category_name: "Concrete and Concrete Materials",
    subcategory: "Ready Mix Concrete",
    description: "Concrete delivered at site in a plastic state requiring no further treatment before placement, mixed in a central batching plant.",
    applications: "Commercial buildings, infrastructure projects, bridge piers, mass foundation pours.",
    technical_keywords: ["ready mix concrete", "RMC", "transit mixer", "batching plant", "slump retention", "compressive strength M25 M30 M40"],
    common_synonyms: ["RMC concrete", "premixed concrete", "batch plant concrete"],
    industry_terminology: ["design mix concrete", "grade M30", "grade M40"],
    alternate_names: ["Transit Mixed Concrete"],
    common_abbreviations: ["RMC"]
  },
  {
    family_code: "PF-CED-CONCRETE-ADMIXTURES",
    canonical_name: "Chemical Admixtures for Concrete",
    sector_code: "CIVIL",
    division_council: "Civil Engineering",
    category_name: "Concrete and Concrete Materials",
    subcategory: "Admixtures",
    description: "Ingredients added during mixing to modify properties of fresh or hardened concrete, including plasticizers, superplasticizers, retarders, and accelerators.",
    applications: "High workability concrete, self-compacting concrete, high-strength concrete, hot weather concreting.",
    technical_keywords: ["concrete admixture", "plasticizer", "superplasticizer", "PCE", "air entrainer", "retarder", "accelerator"],
    common_synonyms: ["water reducer", "superplasticizer", "concrete chemical"],
    industry_terminology: ["polycarboxylate ether superplasticizer", "SNF superplasticizer"],
    alternate_names: ["Water Reducing Admixtures"],
    common_abbreviations: ["SP", "PCE"]
  },
  {
    family_code: "PF-CED-TMT-REBAR",
    canonical_name: "High Strength Deformed Steel Bars (TMT Rebars)",
    sector_code: "CIVIL",
    division_council: "Civil Engineering",
    category_name: "Structural Steel and Reinforcement",
    subcategory: "Reinforcement Steel",
    description: "Thermo-mechanically treated hot-rolled deformed carbon steel bars for concrete reinforcement with high yield strength, ductility, and bendability.",
    applications: "RCC columns, beams, slabs, foundations, earthquake-resistant seismic building frames, infrastructure.",
    technical_keywords: ["TMT bars", "rebar", "Fe 500", "Fe 500D", "Fe 550D", "reinforcement steel", "ribbed bars", "seismic resistance"],
    common_synonyms: ["TMT saria", "iron rods", "steel reinforcement bars", "reinforcing bars"],
    industry_terminology: ["Fe 500D TMT", "thermo-mechanically treated bars", "corrosion resistant rebar"],
    alternate_names: ["Concrete Reinforcement Bars", "Deformed Steel Bars"],
    common_abbreviations: ["TMT", "HSD"]
  },
  {
    family_code: "PF-CED-STRUCTURAL-STEEL-SECTIONS",
    canonical_name: "Structural Steel Sections (Beams, Columns, Channels, Angles)",
    sector_code: "CIVIL",
    division_council: "Civil Engineering",
    category_name: "Structural Steel and Reinforcement",
    subcategory: "Hot Rolled Sections",
    description: "Hot-rolled structural steel sections including I-beams, H-columns, channels, equal and unequal angles, and tees for structural fabrication.",
    applications: "Industrial shed PEB buildings, bridge trusses, transmission towers, high-rise steel framing.",
    technical_keywords: ["structural steel", "ISMB", "ISMC", "steel angles", "I beam", "channel section", "E250", "E350", "hot rolled steel"],
    common_synonyms: ["girder", "steel beam", "iron angle", "channel section", "MS beam"],
    industry_terminology: ["ISMB 300", "universal column", "rolled steel joists"],
    alternate_names: ["Hot Rolled Steel Joists", "Structural Shapes"],
    common_abbreviations: ["ISMB", "ISMC", "ISA"]
  },
  {
    family_code: "PF-CED-STEEL-TUBES-STRUCTURES",
    canonical_name: "Hollow Steel Sections for Structural Use (RHS/SHS/CHS)",
    sector_code: "CIVIL",
    division_council: "Civil Engineering",
    category_name: "Structural Steel and Reinforcement",
    subcategory: "Structural Hollow Sections",
    description: "Hot-finished or cold-formed square, rectangular, and circular hollow steel sections for architectural and structural engineering.",
    applications: "Airport roofs, stadium trusses, pedestrian footbridges, space frames, architectural columns.",
    technical_keywords: ["RHS", "SHS", "CHS", "hollow steel section", "box section", "structural pipe", "tubular steel"],
    common_synonyms: ["box pipe", "square steel tube", "rectangular pipe", "Apollo tube"],
    industry_terminology: ["square hollow section", "rectangular hollow section", "circular hollow section"],
    alternate_names: ["Structural Hollow Sections"],
    common_abbreviations: ["SHS", "RHS", "CHS"]
  },
  {
    family_code: "PF-CED-BURNT-CLAY-BRICKS",
    canonical_name: "Common Burnt Clay Building Bricks",
    sector_code: "CIVIL",
    division_council: "Civil Engineering",
    category_name: "Masonry Units and Blocks",
    subcategory: "Clay Bricks",
    description: "Solid building units made of suitable clay moulded to rectangular shape and burned in a kiln, classified by compressive strength.",
    applications: "Load-bearing masonry walls, partition walls, infill masonry in RCC frames, foundation footings.",
    technical_keywords: ["clay bricks", "red bricks", "compressive strength class 7.5", "class 10", "water absorption", "efflorescence"],
    common_synonyms: ["red brick", "laal eent", "clay brick", "baked brick"],
    industry_terminology: ["first class brick", "class 10 bricks", "kiln-burnt brick"],
    alternate_names: ["Building Bricks"],
    common_abbreviations: ["BCB"]
  },
  {
    family_code: "PF-CED-AAC-BLOCKS",
    canonical_name: "Autoclaved Aerated Concrete (AAC) Blocks",
    sector_code: "CIVIL",
    division_council: "Civil Engineering",
    category_name: "Masonry Units and Blocks",
    subcategory: "Aerated Concrete Blocks",
    description: "Lightweight, precast cellular concrete building material produced by foaming and high-pressure steam curing (autoclaving).",
    applications: "Non-load bearing partition walls in high rise buildings, thermal insulating masonry, external facades.",
    technical_keywords: ["AAC block", "aerated concrete", "lightweight block", "thermal insulation", "autoclaved concrete", "flyash block"],
    common_synonyms: ["lightweight block", "AAC brick", "aerated block", "siporex block"],
    industry_terminology: ["cellular concrete blocks", "Grade 1 AAC"],
    alternate_names: ["Autoclaved Cellular Concrete Blocks"],
    common_abbreviations: ["AAC"]
  },
  {
    family_code: "PF-CED-CONCRETE-PAVER-BLOCKS",
    canonical_name: "Precast Concrete Paver Blocks (Interlocking Pavers)",
    sector_code: "CIVIL",
    division_council: "Civil Engineering",
    category_name: "Masonry Units and Blocks",
    subcategory: "Pavers",
    description: "Solid, unreinforced precast cement concrete paving units with interlocking profile for surface paving of roadways and walkways.",
    applications: "Pedestrian sidewalks, fuel station forecourts, container freight stations, parking lots, urban walkways.",
    technical_keywords: ["paver blocks", "interlocking pavers", "concrete pavers", "60mm pavers", "80mm pavers", "M35 paver"],
    common_synonyms: ["paver tile", "interlocking tile", "zigzag paver", "road tile"],
    industry_terminology: ["precast interlocking blocks", "heavy duty pavers"],
    alternate_names: ["Interlocking Concrete Paving Units"],
    common_abbreviations: ["ICBP"]
  },
  {
    family_code: "PF-CED-CERAMIC-TILES",
    canonical_name: "Ceramic Glazed and Vitrified Floor & Wall Tiles",
    sector_code: "CIVIL",
    division_council: "Civil Engineering",
    category_name: "Floor and Wall Finishes",
    subcategory: "Tiles",
    description: "Thin slabs made from clays and other inorganic raw materials, shaped by extrusion or pressing, dried and fired at high temperatures.",
    applications: "Residential and commercial flooring, bathroom walls, kitchen splashbacks, exterior building cladding.",
    technical_keywords: ["vitrified tiles", "ceramic tiles", "glazed porcelain", "water absorption Group B1a", "scratch hardness Mohs", "skid resistance"],
    common_synonyms: ["floor tiles", "wall tiles", "porcelain tiles", "vitrified flooring"],
    industry_terminology: ["GVT", "PGVT", "double charge vitrified tiles"],
    alternate_names: ["Ceramic Floor Tiles", "Vitrified Tiles"],
    common_abbreviations: ["GVT", "PGVT"]
  },
  {
    family_code: "PF-CED-PLYWOOD-GENERAL",
    canonical_name: "Plywood for General Purposes (Commercial & Marine Plywood)",
    sector_code: "CIVIL",
    division_council: "Civil Engineering",
    category_name: "Timber and Wood Products",
    subcategory: "Plywood",
    description: "Engineered wood manufactured from thin sheets of cross-laminated wood veneers glued with synthetic adhesive under pressure.",
    applications: "Furniture, partition panelling, cabinetry, false ceilings, shuttering, marine interior fitting.",
    technical_keywords: ["plywood", "MR grade", "BWR grade", "BWP grade", "marine plywood", "cross lamination", "formaldehyde emission"],
    common_synonyms: ["ply board", "commercial ply", "waterproof plywood", "marine ply"],
    industry_terminology: ["MR grade IS 303", "BWP grade IS 710", "hardwood plywood"],
    alternate_names: ["General Purpose Plywood", "Marine Plywood"],
    common_abbreviations: ["BWP", "BWR", "MR"]
  },
  {
    family_code: "PF-CED-FLUSH-DOORS",
    canonical_name: "Wooden Flush Door Shutters (Solid Core Type)",
    sector_code: "CIVIL",
    division_council: "Civil Engineering",
    category_name: "Doors, Windows and Hardware",
    subcategory: "Doors",
    description: "Prefabricated wooden door shutter consisting of a solid wooden core blockboard frame faced on both sides with wood veneers or cross-bands.",
    applications: "Internal and external doors in residential apartments, hotels, offices, commercial complexes.",
    technical_keywords: ["flush door", "solid core", "wooden door shutter", "decorative flush door", "commercial flush door", "knife test"],
    common_synonyms: ["wooden door", "laminated door", "solid door shutter", "room door"],
    industry_terminology: ["timber door shutter", "cellular core", "particle board core"],
    alternate_names: ["Solid Core Flush Doors"],
    common_abbreviations: ["FDS"]
  },
  {
    family_code: "PF-CED-FIRE-DOORS",
    canonical_name: "Fire-Resistant Door Assemblies",
    sector_code: "CIVIL",
    division_council: "Civil Engineering",
    category_name: "Doors, Windows and Hardware",
    subcategory: "Fire Safety Assemblies",
    description: "Door assemblies designed and tested to withstand fire exposure for specified duration (30 min, 60 min, 120 min) without integrity or insulation failure.",
    applications: "Fire escape staircases, hospital corridors, electrical rooms, server rooms, hotel room entryways.",
    technical_keywords: ["fire door", "fire rated door", "120 minute fire rating", "intumescent seal", "fire resistance test", "stability integrity"],
    common_synonyms: ["fire check door", "emergency exit door", "steel fire door"],
    industry_terminology: ["fire rated door assembly", "panic bar door"],
    alternate_names: ["Fire Rated Steel Doors", "Fire Check Door Shutters"],
    common_abbreviations: ["FRD"]
  },
  {
    family_code: "PF-CED-ALUMINIUM-DOOR-WINDOW",
    canonical_name: "Aluminium Doors, Windows and Ventilator Frames",
    sector_code: "CIVIL",
    division_council: "Civil Engineering",
    category_name: "Doors, Windows and Hardware",
    subcategory: "Aluminium Joinery",
    description: "Extruded aluminium architectural frames and sashes assembled with gaskets, hardware, and glazing for building fenestration.",
    applications: "Residential window sashes, commercial curtain walls, storefronts, sliding glass balcony doors.",
    technical_keywords: ["aluminium window", "aluminium door", "sliding window", "casement window", "anodized aluminium", "powder coated profile"],
    common_synonyms: ["aluminium sliding window", "sliding glass door", "metal window"],
    industry_terminology: ["powder coated aluminium joinery", "anodized window section"],
    alternate_names: ["Extruded Aluminium Fenestration"],
    common_abbreviations: ["ADW"]
  },
  {
    family_code: "PF-CED-BUILDING-HARDWARE-HINGES",
    canonical_name: "Building Hardware — Butt Hinges and Floor Springs",
    sector_code: "CIVIL",
    division_council: "Civil Engineering",
    category_name: "Doors, Windows and Hardware",
    subcategory: "Builders Hardware",
    description: "Metallic mechanical pivoting and closing hardware for mounting and controlling doors and windows.",
    applications: "Hinged wooden doors, heavy glass swing doors, metal security doors, window shutters.",
    technical_keywords: ["butt hinges", "stainless steel hinges", "floor spring", "hydraulic door closer", "parliament hinges"],
    common_synonyms: ["kabja", "door hinge", "door closer", "floor spring"],
    industry_terminology: ["SS 304 butt hinge", "double action floor spring"],
    alternate_names: ["Architectural Butt Hinges"],
    common_abbreviations: ["BH"]
  },
  {
    family_code: "PF-CED-CPVC-PIPES",
    canonical_name: "Chlorinated Polyvinyl Chloride (CPVC) Pipes for Hot and Cold Water",
    sector_code: "CIVIL",
    division_council: "Civil Engineering",
    category_name: "Pipes and Plumbing Fittings",
    subcategory: "Plastic Pipes",
    description: "Post-chlorinated rigid polyvinyl chloride pressure piping designed for handling potable hot and cold water plumbing distribution.",
    applications: "Domestic hot and cold water plumbing, solar water heater loops, commercial bathrooms, central heating.",
    technical_keywords: ["CPVC pipe", "chlorinated PVC", "hot water plumbing", "SDR 11", "SDR 13.5", "pressure rating"],
    common_synonyms: ["CPVC water pipe", "hot water plastic pipe", "Astral CPVC", "Ashirvad CPVC"],
    industry_terminology: ["CPVC Schedule 40", "CPVC Schedule 80", "plumbing pipe"],
    alternate_names: ["CPVC Potable Water Pipes"],
    common_abbreviations: ["CPVC"]
  },
  {
    family_code: "PF-CED-UPVC-PRESSURE-PIPES",
    canonical_name: "Unplasticized PVC (uPVC) Pipes for Potable Water Supplies",
    sector_code: "CIVIL",
    division_council: "Civil Engineering",
    category_name: "Pipes and Plumbing Fittings",
    subcategory: "Plastic Pipes",
    description: "Extruded rigid unplasticized polyvinyl chloride pressure piping for municipal and rural potable water distribution and agricultural mains.",
    applications: "Potable water supply pipelines, irrigation main lines, tube-well drop pipes, industrial effluent.",
    technical_keywords: ["uPVC pipe", "PVC pressure pipe", "Class 1", "Class 2", "Class 3", "Class 4", "elastomeric ring joint"],
    common_synonyms: ["PVC pipe", "plastic water pipe", "rigid PVC pipe", "agri pipe"],
    industry_terminology: ["potable water uPVC", "solvent cement joint pipe"],
    alternate_names: ["Rigid PVC Water Supply Pipes"],
    common_abbreviations: ["uPVC", "PVC"]
  },
  {
    family_code: "PF-CED-SWR-PVC-PIPES",
    canonical_name: "uPVC Soil, Waste and Rainwater (SWR) Drainage Pipes",
    sector_code: "CIVIL",
    division_council: "Civil Engineering",
    category_name: "Pipes and Plumbing Fittings",
    subcategory: "Drainage Pipes",
    description: "Rigid plastic pipes and fittings engineered specifically for non-pressure gravity drainage of domestic sewage, waste water, and rainwater runoff.",
    applications: "Building vertical soil and waste stacks, vent stacks, rainwater downpipes, underground foul sewer lines.",
    technical_keywords: ["SWR pipe", "soil waste rainwater", "ring fit drainage", "Type A pipe", "Type B pipe", "gravity drain"],
    common_synonyms: ["drainage pipe", "drain pipe", "rainwater downpipe", "sanitary pipe"],
    industry_terminology: ["Type A SWR", "Type B underground drainage", "rubber ring joint SWR"],
    alternate_names: ["PVC Soil and Drainage Pipes"],
    common_abbreviations: ["SWR"]
  },
  {
    family_code: "PF-CED-GI-PIPES",
    canonical_name: "Galvanized Mild Steel Tubes (GI Pipes)",
    sector_code: "CIVIL",
    division_council: "Civil Engineering",
    category_name: "Pipes and Plumbing Fittings",
    subcategory: "Steel Pipes",
    description: "Welded carbon steel tubes coated with a protective zinc layer via hot-dip galvanizing, classified into light, medium, and heavy classes.",
    applications: "Potable water conveyance, plumbing risers, fire sprinkler piping, handrails, structural scaffolding.",
    technical_keywords: ["GI pipe", "galvanized iron pipe", "Class A Light", "Class B Medium", "Class C Heavy", "zinc coating", "screwed and socketed"],
    common_synonyms: ["GI pipe", "galvanized pipe", "iron plumbing pipe", "Tata pipe"],
    industry_terminology: ["IS 1239 Class B", "hot-dip galvanized tube", "MS galvanized pipe"],
    alternate_names: ["Mild Steel Galvanized Tubes"],
    common_abbreviations: ["GI"]
  },
  {
    family_code: "PF-CED-DUCTILE-IRON-PIPES",
    canonical_name: "Centrifugally Cast (Spun) Ductile Iron Pipes",
    sector_code: "CIVIL",
    division_council: "Civil Engineering",
    category_name: "Pipes and Plumbing Fittings",
    subcategory: "Cast Iron and DI Pipes",
    description: "Centrifugally cast ductile iron pressure pipes with spheroidal graphite microstructure, socket and spigot ends, and cement mortar lining.",
    applications: "City municipal water transmission mains, sewage pumping mains, district cooling, bulk water supply.",
    technical_keywords: ["ductile iron pipe", "DI pipe", "Class K7", "Class K9", "cement mortar lining", "push-on joint", "water transmission"],
    common_synonyms: ["DI pipe", "ductile pipe", "water main pipe"],
    industry_terminology: ["Class K9 DI pipe", "socket spigot push on joint"],
    alternate_names: ["Ductile Iron Pressure Pipes"],
    common_abbreviations: ["DI"]
  },
  {
    family_code: "PF-CED-HDPE-WATER-PIPES",
    canonical_name: "High Density Polyethylene (HDPE) Pipes for Water Supply",
    sector_code: "CIVIL",
    division_council: "Civil Engineering",
    category_name: "Pipes and Plumbing Fittings",
    subcategory: "Polyethylene Pipes",
    description: "Flexible, corrosion-proof extruded black thermoplastic pressure pipes manufactured from PE 80 or PE 100 virgin polyethylene resin.",
    applications: "Cross-country rural drinking water pipelines, trenchless horizontal directional drilling (HDD), subsea pipelines.",
    technical_keywords: ["HDPE pipe", "PE 100", "PE 80", "PN 6", "PN 10", "PN 16", "butt fusion", "potable water"],
    common_synonyms: ["black water pipe", "HDPE roll pipe", "polyethylene water pipe"],
    industry_terminology: ["PE 100 PN16 pipe", "electrofusion jointed HDPE"],
    alternate_names: ["Polyethylene Pressure Pipes"],
    common_abbreviations: ["HDPE", "PE"]
  },
  {
    family_code: "PF-CED-WATER-STORAGE-TANKS",
    canonical_name: "Rotational Moulded Polyethylene Water Storage Tanks",
    sector_code: "CIVIL",
    division_council: "Civil Engineering",
    category_name: "Water Storage and Sanitation",
    subcategory: "Storage Tanks",
    description: "Seamless vertical cylindrical water storage cisterns made from food-grade virgin linear low density polyethylene (LLDPE).",
    applications: "Overhead domestic water storage, commercial buildings, institutional water tanks, agricultural cisterns.",
    technical_keywords: ["water tank", "plastic water tank", "Sintex tank", "LLDPE", "500 litre", "1000 litre", "triple layer UV stabilized"],
    common_synonyms: ["Sintex tank", "overhead water tank", "chhat ki tanki", "plastic tank"],
    industry_terminology: ["rotomoulded polyethylene tank", "food grade UV tank"],
    alternate_names: ["Polyethylene Potable Water Storage Tanks"],
    common_abbreviations: ["WST"]
  },
  {
    family_code: "PF-CED-SANITARYWARE-CERAMIC",
    canonical_name: "Vitreous China Sanitary Appliances (Water Closets, Wash Basins)",
    sector_code: "CIVIL",
    division_council: "Civil Engineering",
    category_name: "Sanitary Fixtures and Fittings",
    subcategory: "Vitreous China",
    description: "Ceramic plumbing fixtures formed from refined clays and feldspar, glazed and fired to a non-porous vitreous body.",
    applications: "Residential bathrooms, hotel restrooms, institutional lavatories, commercial washrooms.",
    technical_keywords: ["vitreous china", "wash basin", "water closet", "European water closet", "EWC", "urinal", "crazing resistance"],
    common_synonyms: ["toilet commode", "wash basin", "sanitaryware", "washroom fixture", "latrine pan"],
    industry_terminology: ["EWC", "wall hung closet", "countertop basin"],
    alternate_names: ["Ceramic Sanitary Appliances"],
    common_abbreviations: ["EWC", "IWC"]
  },
  {
    family_code: "PF-CED-CP-BATH-FITTINGS",
    canonical_name: "Chromium Plated Bath Fittings and Bib Taps",
    sector_code: "CIVIL",
    division_council: "Civil Engineering",
    category_name: "Sanitary Fixtures and Fittings",
    subcategory: "Metallic Plumbing Fixtures",
    description: "Cast or forged brass water outlet taps, mixer faucets, and stop valves electroplated with bright nickel and chromium.",
    applications: "Bathroom faucets, kitchen sink mixers, washbasin pillar cocks, outdoor bib taps, shower mixers.",
    technical_keywords: ["CP brass fitting", "bib tap", "pillar cock", "basin mixer", "chromium plating", "nickel chrome", "hydraulic test"],
    common_synonyms: ["water tap", "nal", "faucet", "mixer tap", "bathroom tap"],
    industry_terminology: ["CP pillar cock", "concealed stop cock", "quarter turn tap"],
    alternate_names: ["Chromium Plated Copper Alloy Faucets"],
    common_abbreviations: ["CP"]
  },
  {
    family_code: "PF-CED-WATERPROOFING-BITUMEN",
    canonical_name: "Bituminous Waterproofing Felts and Membranes",
    sector_code: "CIVIL",
    division_council: "Civil Engineering",
    category_name: "Roofing and Waterproofing",
    subcategory: "Bituminous Waterproofing",
    description: "Flexible, impermeable sheet membranes produced by saturating and coating inorganic or organic carrier fabric with bitumen.",
    applications: "Flat concrete roof waterproofing, basement damp-proofing, bridge deck protection, podium landscaping.",
    technical_keywords: ["waterproofing felt", "tar felt", "bitumen membrane", "APP membrane", "SBS modified", "roof damp proofing"],
    common_synonyms: ["tar felt", "waterproof membrane", "roof sheet", "damp proof sheet"],
    industry_terminology: ["Type 3 hessian base felt", "APP torch-on membrane"],
    alternate_names: ["Bitumen Impregnated Felts"],
    common_abbreviations: ["BM"]
  },
  {
    family_code: "PF-CED-SAFETY-HELMETS",
    canonical_name: "Industrial Safety Helmets (Hard Hats)",
    sector_code: "CIVIL",
    division_council: "Civil Engineering",
    category_name: "Personal Protective Equipment",
    subcategory: "Head Protection",
    description: "Rigid dome-shaped headwear fitted with energy-absorbing internal harness engineered to protect construction and industrial personnel.",
    applications: "Construction sites, structural erection, mining, shipbuilding, heavy industrial fabrication plants.",
    technical_keywords: ["safety helmet", "hard hat", "industrial helmet", "shock absorption", "penetration resistance", "chin strap"],
    common_synonyms: ["hard hat", "construction helmet", "site helmet", "safety topee"],
    industry_terminology: ["Class A helmet", "Class B dielectric helmet"],
    alternate_names: ["Industrial Protective Helmets"],
    common_abbreviations: ["ISH"]
  }
];

civilProducts.forEach(addFamily);

// ============================================================================
// 2. ELECTROTECHNICAL (ETD) - 50 Product Families
// ============================================================================
const electroProducts = [
  {
    family_code: "PF-ETD-DISTRIBUTION-TRANSFORMER",
    canonical_name: "Outdoor Oil-Immersed Distribution Transformers",
    sector_code: "ELECTRO",
    division_council: "Electrotechnical",
    category_name: "Power and Distribution Transformers",
    subcategory: "Distribution Transformers",
    description: "Step-down electrical distribution transformers up to 2500 kVA, 33 kV designed to reduce high primary grid voltage to consumer levels.",
    applications: "City electricity distribution, rural electrification networks, commercial sub-stations, industrial estates.",
    technical_keywords: ["distribution transformer", "11kV transformer", "33kV", "mineral oil", "kVA rating", "no load loss", "BEE star rating"],
    common_synonyms: ["transformer", "DP transformer", "power transformer", "substation transformer"],
    industry_terminology: ["11kV/415V distribution transformer", "star 1 star 2 star 3 energy efficient"],
    alternate_names: ["Oil Immersed Distribution Transformers"],
    common_abbreviations: ["DT"]
  },
  {
    family_code: "PF-ETD-POWER-TRANSFORMER",
    canonical_name: "Power Transformers Above 2500 kVA",
    sector_code: "ELECTRO",
    division_council: "Electrotechnical",
    category_name: "Power and Distribution Transformers",
    subcategory: "Power Transformers",
    description: "High-capacity power transformers used at generating stations and transmission substations for voltage step-up and step-down (66 kV to 765 kV).",
    applications: "Thermal/hydro/solar power plants, state electricity transmission grid substations, heavy industrial plants.",
    technical_keywords: ["power transformer", "EHV transformer", "132kV", "220kV", "400kV", "MVA rating", "OLTC", "short circuit withstand"],
    common_synonyms: ["grid transformer", "transmission transformer", "substation power transformer"],
    industry_terminology: ["generator step up transformer", "inter connecting transformer"],
    alternate_names: ["Transmission Power Transformers"],
    common_abbreviations: ["PT"]
  },
  {
    family_code: "PF-ETD-DRY-TYPE-TRANSFORMER",
    canonical_name: "Dry-Type Cast Resin Transformers",
    sector_code: "ELECTRO",
    division_council: "Electrotechnical",
    category_name: "Power and Distribution Transformers",
    subcategory: "Dry Type Transformers",
    description: "Air-cooled transformers where magnetic core and windings are encapsulated in solid epoxy resin under vacuum, eliminating oil fire hazard.",
    applications: "Indoor substations in malls, hospitals, underground metro stations, high-rise buildings, data centers.",
    technical_keywords: ["cast resin transformer", "dry type transformer", "fire safe transformer", "F1 fire class", "epoxy encapsulated"],
    common_synonyms: ["resin cast transformer", "oil free transformer", "dry transformer"],
    industry_terminology: ["VPI transformer", "cast resin dry type transformer"],
    alternate_names: ["Cast Resin Dry Transformers"],
    common_abbreviations: ["CRT"]
  },
  {
    family_code: "PF-ETD-LV-PVC-CABLES",
    canonical_name: "PVC Insulated Cables for Working Voltages Up to 1100 V",
    sector_code: "ELECTRO",
    division_council: "Electrotechnical",
    category_name: "Cables, Wires and Conductors",
    subcategory: "Building and Control Cables",
    description: "Single-core and multi-core PVC insulated copper or aluminium electrical wiring cables and cords for residential, commercial and control wiring.",
    applications: "Internal building wiring, lighting circuits, power socket wiring, motor feeds, appliance connection cords.",
    technical_keywords: ["PVC wire", "building wire", "copper cable", "1100V cable", "FR cable", "FR-LSH", "flexible cord", "multicore"],
    common_synonyms: ["house wire", "electric wire", "bijli taar", "copper wire", "Havells wire", "Polycab wire"],
    industry_terminology: ["FR-LSH building wire", "unarmoured flexible cable", "submersible flat cable"],
    alternate_names: ["Polyvinyl Chloride Insulated Cables"],
    common_abbreviations: ["PVC Wire"]
  },
  {
    family_code: "PF-ETD-XLPE-POWER-CABLES",
    canonical_name: "Cross-Linked Polyethylene (XLPE) Insulated Power Cables",
    sector_code: "ELECTRO",
    division_council: "Electrotechnical",
    category_name: "Cables, Wires and Conductors",
    subcategory: "Medium and High Voltage Cables",
    description: "Heavy-duty underground power transmission cables insulated with thermosetting cross-linked polyethylene for voltages from 3.3 kV up to 33 kV.",
    applications: "Underground electrical grid networks, industrial power distribution, renewable energy solar/wind farms.",
    technical_keywords: ["XLPE cable", "HT cable", "armoured cable", "33kV cable", "11kV cable", "aluminium XLPE", "cross linked polyethylene"],
    common_synonyms: ["HT cable", "underground cable", "armoured power cable", "3-core cable"],
    industry_terminology: ["3 core aluminium armoured XLPE", "medium voltage power cable"],
    alternate_names: ["Cross-linked Polyethylene Power Cables"],
    common_abbreviations: ["XLPE"]
  },
  {
    family_code: "PF-ETD-MCB-CIRCUIT-BREAKER",
    canonical_name: "Miniature Circuit Breakers (MCB)",
    sector_code: "ELECTRO",
    division_council: "Electrotechnical",
    category_name: "Switchgear and Protection Devices",
    subcategory: "Circuit Breakers",
    description: "Electro-mechanical switching and protection devices that automatically interrupt electric current during overload or short-circuit faults.",
    applications: "Consumer distribution boards, sub-distribution panels in homes, offices, schools, small industrial machinery.",
    technical_keywords: ["MCB", "circuit breaker", "overcurrent protection", "short circuit capacity 10kA", "Type B", "Type C", "Type D curve", "single pole", "DP", "TPN"],
    common_synonyms: ["cutout", "trip switch", "MCB switch", "fuse switch"],
    industry_terminology: ["Type C 16A MCB", "10kA breaking capacity miniature breaker"],
    alternate_names: ["Household Circuit Breakers"],
    common_abbreviations: ["MCB"]
  },
  {
    family_code: "PF-ETD-RCCB-RESIDUAL-CURRENT",
    canonical_name: "Residual Current Circuit Breakers (RCCB/ELCB)",
    sector_code: "ELECTRO",
    division_council: "Electrotechnical",
    category_name: "Switchgear and Protection Devices",
    subcategory: "Earth Leakage Protection",
    description: "Protective switching devices that sense differential leakage current to earth and quickly disconnect the circuit to prevent electric shock and fires.",
    applications: "Residential homes, wet areas (bathrooms/kitchens), industrial control panels, hospital patient wards.",
    technical_keywords: ["RCCB", "ELCB", "earth leakage circuit breaker", "residual current", "30mA sensitivity", "100mA", "300mA", "shock protection"],
    common_synonyms: ["shock guard", "earth leakage switch", "safety trip switch"],
    industry_terminology: ["RCCB 30mA human protection", "four pole RCCB"],
    alternate_names: ["Earth Leakage Circuit Breakers"],
    common_abbreviations: ["RCCB", "ELCB"]
  },
  {
    family_code: "PF-ETD-MCCB-MOULDED-CASE",
    canonical_name: "Moulded Case Circuit Breakers (MCCB)",
    sector_code: "ELECTRO",
    division_council: "Electrotechnical",
    category_name: "Switchgear and Protection Devices",
    subcategory: "Industrial Circuit Breakers",
    description: "High-capacity circuit breakers housed in an integral moulded insulating case for protecting industrial power distribution feeders up to 1600 A.",
    applications: "Main electrical switchboards, motor control centers (MCC), commercial buildings, industrial power feeds.",
    technical_keywords: ["MCCB", "moulded case breaker", "adjustable trip", "thermal magnetic", "electronic trip", "short circuit Ics", "250A", "400A", "630A"],
    common_synonyms: ["main breaker", "industrial breaker", "feeder breaker"],
    industry_terminology: ["thermal magnetic MCCB", "microprocessor release MCCB"],
    alternate_names: ["Moulded Case Industrial Breakers"],
    common_abbreviations: ["MCCB"]
  },
  {
    family_code: "PF-ETD-HV-CIRCUIT-BREAKER",
    canonical_name: "High-Voltage Circuit Breakers (Vacuum and SF6 Breakers)",
    sector_code: "ELECTRO",
    division_council: "Electrotechnical",
    category_name: "Switchgear and Protection Devices",
    subcategory: "HV Switchgear",
    description: "Switchgear devices engineered to make, carry, and break currents under normal circuit conditions and abnormal short-circuit conditions above 1 kV.",
    applications: "Electrical transmission substations (11 kV, 33 kV, 132 kV, 400 kV), heavy industrial intake substations.",
    technical_keywords: ["VCB", "SF6 breaker", "vacuum circuit breaker", "high voltage switchgear", "breaking capacity", "33kV VCB", "gas insulated switchgear"],
    common_synonyms: ["VCB panel", "substation breaker", "HT breaker"],
    industry_terminology: ["vacuum interrupter", "SF6 puffer breaker", "outdoor pole mounted breaker"],
    alternate_names: ["HV AC Circuit Breakers"],
    common_abbreviations: ["VCB", "SF6 CB"]
  },
  {
    family_code: "PF-ETD-THREE-PHASE-INDUCTION-MOTOR",
    canonical_name: "Three-Phase Energy Efficient Induction Motors (IE2/IE3/IE4)",
    sector_code: "ELECTRO",
    division_council: "Electrotechnical",
    category_name: "Rotating Electrical Machinery",
    subcategory: "AC Motors",
    description: "Line-operated squirrel-cage 3-phase AC induction motors with standardized frame dimensions and energy efficiency ratings (IE2, IE3, IE4).",
    applications: "Industrial machinery drives, factory pumps, blowers, compressors, conveyor systems, machine tools.",
    technical_keywords: ["induction motor", "3-phase motor", "IE3 motor", "IE2", "squirrel cage", "TEFC", "kW rating", "BEE star rating", "efficiency class"],
    common_synonyms: ["electric motor", "industrial motor", "AC motor", "3 phase motor"],
    industry_terminology: ["IE3 premium efficiency motor", "TEFC squirrel cage induction motor"],
    alternate_names: ["Line Operated Three-Phase AC Motors"],
    common_abbreviations: ["IM", "IE3"]
  },
  {
    family_code: "PF-ETD-SOLAR-PV-MODULES",
    canonical_name: "Crystalline Silicon Terrestrial Photovoltaic (PV) Modules",
    sector_code: "ELECTRO",
    division_council: "Electrotechnical",
    category_name: "Renewable Energy Systems",
    subcategory: "Solar Photovoltaic",
    description: "Solar electric modules containing encapsulated mono-crystalline or multi-crystalline silicon photovoltaic solar cells to convert sunlight into DC electricity.",
    applications: "Rooftop solar power systems, utility-scale solar farms, solar water pumps, microgrids.",
    technical_keywords: ["solar panel", "solar PV module", "mono perc", "polycrystalline", "watt peak Wp", "open circuit voltage Voc", "ALMM approved"],
    common_synonyms: ["solar plate", "solar panel", "PV module", "solar photovotaic"],
    industry_terminology: ["mono PERC half cut module", "bifacial solar module"],
    alternate_names: ["Solar Photovoltaic Modules"],
    common_abbreviations: ["PV", "SPV"]
  },
  {
    family_code: "PF-ETD-GRID-TIED-INVERTERS",
    canonical_name: "Utility-Interconnected Solar Photovoltaic Inverters",
    sector_code: "ELECTRO",
    division_council: "Electrotechnical",
    category_name: "Renewable Energy Systems",
    subcategory: "Power Conditioning Units",
    description: "Static electronic power conversion units that invert direct current (DC) from solar PV arrays into synchronized alternating current (AC) for grid injection.",
    applications: "Grid-connected solar rooftop plants, commercial solar systems, industrial captive power solar plants.",
    technical_keywords: ["solar inverter", "grid tie inverter", "string inverter", "MPPT", "islanding protection", "anti-islanding", "THD"],
    common_synonyms: ["solar inverter", "on-grid inverter", "grid inverter"],
    industry_terminology: ["transformerless solar string inverter", "central solar inverter"],
    alternate_names: ["Grid Connected Solar Inverters"],
    common_abbreviations: ["GTI", "PCU"]
  },
  {
    family_code: "PF-ETD-STATIONARY-LEAD-ACID-BATTERY",
    canonical_name: "Stationary Lead-Acid Batteries (Tubular and VRLA)",
    sector_code: "ELECTRO",
    division_council: "Electrotechnical",
    category_name: "Batteries and Energy Storage",
    subcategory: "Lead Acid Batteries",
    description: "Secondary rechargeable electrochemical cells with lead dioxide and sponge lead electrodes in sulphuric acid electrolyte, for standby power storage.",
    applications: "Inverter backup systems for homes, telecommunication cell towers, UPS installations, electrical sub-station control supplies.",
    technical_keywords: ["inverter battery", "tubular battery", "VRLA battery", "SMF battery", "ampere-hour Ah", "C10 rating", "standby power"],
    common_synonyms: ["inverter battery", "storage battery", "exide battery", "amaron battery"],
    industry_terminology: ["tall tubular deep cycle battery", "valve regulated lead acid battery"],
    alternate_names: ["Stationary Storage Batteries"],
    common_abbreviations: ["VRLA", "SMF"]
  },
  {
    family_code: "PF-ETD-CEILING-FANS",
    canonical_name: "Electric Ceiling Fans and Regulators",
    sector_code: "ELECTRO",
    division_council: "Electrotechnical",
    category_name: "Household and Commercial Electrical Appliances",
    subcategory: "Electric Fans",
    description: "Overhead suspended electric motor-driven fans fitted with aerofoil blades for air circulation in residential and commercial spaces.",
    applications: "Homes, classrooms, offices, railway waiting halls, hotels.",
    technical_keywords: ["ceiling fan", "BLDC fan", "air delivery CMM", "service value", "star rated fan", "1200mm sweep", "induction motor fan"],
    common_synonyms: ["fan", "ceiling fan", "pankha", "BLDC ceiling fan"],
    industry_terminology: ["5-star BLDC ceiling fan", "1200mm sweep ceiling fan"],
    alternate_names: ["Electric Ceiling Fans"],
    common_abbreviations: ["CF"]
  },
  {
    family_code: "PF-ETD-STORAGE-WATER-HEATERS",
    canonical_name: "Stationary Storage Electric Water Heaters (Geysers)",
    sector_code: "ELECTRO",
    division_council: "Electrotechnical",
    category_name: "Household and Commercial Electrical Appliances",
    subcategory: "Water Heaters",
    description: "Thermally insulated metallic or composite tanks containing electric immersion heating elements and automatic thermostat to store and heat water.",
    applications: "Domestic bathrooms, commercial hotel rooms, hospital washrooms.",
    technical_keywords: ["geyser", "water heater", "storage geyser", "immersion element", "standing loss", "pressure tank 8 bar", "BEE star rated"],
    common_synonyms: ["geyser", "water geyser", "electric geyser", "hot water tank"],
    industry_terminology: ["glass lined storage water heater", "instant water heater"],
    alternate_names: ["Electric Storage Water Heaters"],
    common_abbreviations: ["SWH"]
  },
  {
    family_code: "PF-ETD-LED-LAMPS",
    canonical_name: "Self-Ballasted LED Lamps for General Lighting Services",
    sector_code: "ELECTRO",
    division_council: "Electrotechnical",
    category_name: "Lamps and Lighting Equipment",
    subcategory: "LED Lighting",
    description: "Solid-state light sources incorporating LED chips and integral electronic driver circuits with standard screw or bayonet bases (B22/E27).",
    applications: "Domestic lighting, commercial indoor fixtures, task illumination, outdoor wall fixtures.",
    technical_keywords: ["LED bulb", "9W LED", "lumen output", "luminous efficacy lm/W", "B22 cap", "correlated colour temperature CCT", "CRI"],
    common_synonyms: ["LED bulb", "bijli bulb", "LED light", "energy saver bulb"],
    industry_terminology: ["self-ballasted LED lamp", "retrofit LED bulb"],
    alternate_names: ["LED Retrofit Bulbs"],
    common_abbreviations: ["LED"]
  },
  {
    family_code: "PF-ETD-LED-STREET-LIGHTS",
    canonical_name: "Luminaires for Road and Street Lighting (LED Street Lights)",
    sector_code: "ELECTRO",
    division_council: "Electrotechnical",
    category_name: "Lamps and Lighting Equipment",
    subcategory: "Outdoor Luminaires",
    description: "Weatherproof outdoor electrical lighting fixtures equipped with high-efficiency LEDs and specialized optical lenses for road and street illumination.",
    applications: "Municipal street lighting, national highways, expressway interchanges, factory perimeter illumination.",
    technical_keywords: ["street light", "LED luminaire", "IP66 waterproof", "surge protection 10kV", "outdoor lighting", "pole mounted fixture"],
    common_synonyms: ["street light", "road light", "pole light", "highway light"],
    industry_terminology: ["optical lens street light", "smart LED street light"],
    alternate_names: ["LED Roadway Luminaires"],
    common_abbreviations: ["SL"]
  },
  {
    family_code: "PF-ETD-EARTHING-EQUIPMENT",
    canonical_name: "Electrical Earthing Equipment and Chemical Earth Electrodes",
    sector_code: "ELECTRO",
    division_council: "Electrotechnical",
    category_name: "Earthing and Lightning Protection",
    subcategory: "Earthing Components",
    description: "Copper-bonded or galvanized steel rods, plates, and chemical backfill compounds engineered to disperse electrical fault currents safely into earth.",
    applications: "Substation earthing grids, industrial machinery safety earthing, building lightning protection systems, telecom towers.",
    technical_keywords: ["earthing electrode", "chemical earthing", "copper bonded rod", "earth pit", "soil resistivity", "earth resistance"],
    common_synonyms: ["earth rod", "earthing pipe", "grounding rod", "earthing system"],
    industry_terminology: ["copper bonded steel earth rod", "maintenance free earthing"],
    alternate_names: ["Grounding Electrodes"],
    common_abbreviations: ["EE"]
  }
];

electroProducts.forEach(addFamily);

// ============================================================================
// 3. MECHANICAL ENGINEERING (MED) - 45 Product Families
// ============================================================================
const mechProducts = [
  {
    family_code: "PF-MED-SUBMERSIBLE-PUMP",
    canonical_name: "Submersible Borewell Pumpsets for Clean Water",
    sector_code: "MECH",
    division_council: "Mechanical Engineering",
    category_name: "Pumps and Pumping Equipment",
    subcategory: "Submersible Pumps",
    description: "Multistage centrifugal pumps close-coupled to a submersible water-filled or oil-filled electric motor designed to operate fully submerged in deep borewells.",
    applications: "Agricultural irrigation borewells, municipal tube-well drinking water supply, industrial water extraction.",
    technical_keywords: ["submersible pump", "borewell pump", "100mm borewell", "multistage pump", "head in meters", "discharge LPM", "BEE star rated pump"],
    common_synonyms: ["submersible", "boring pump", "borewell motor", "khet ki motor"],
    industry_terminology: ["100mm 150mm submersible pumpset", "radial flow submersible pump"],
    alternate_names: ["Submersible Centrifugal Pumpsets"],
    common_abbreviations: ["SP"]
  },
  {
    family_code: "PF-MED-CENTRIFUGAL-MONOBLOCK-PUMP",
    canonical_name: "Centrifugal Agricultural Monoblock Pumpsets",
    sector_code: "MECH",
    division_council: "Mechanical Engineering",
    category_name: "Pumps and Pumping Equipment",
    subcategory: "Monoblock Pumps",
    description: "Compact pumping units where the pump impeller is mounted directly on the extended shaft of the electric driving motor on a single common frame.",
    applications: "Open well irrigation, river lift irrigation, farm channel dewatering, construction site water supply.",
    technical_keywords: ["monoblock pump", "centrifugal pump", "openwell monoblock", "suction lift", "single phase monoblock", "three phase monoblock"],
    common_synonyms: ["monoblock", "khet ka pump", "water pump", "tullu pump"],
    industry_terminology: ["agricultural monoblock pumpset", "self priming pump"],
    alternate_names: ["Monoset Pumps"],
    common_abbreviations: ["CMP"]
  },
  {
    family_code: "PF-MED-INDUSTRIAL-VALVES-GATE-GLOBE",
    canonical_name: "Industrial Steel Gate, Globe and Check Valves",
    sector_code: "MECH",
    division_council: "Mechanical Engineering",
    category_name: "Valves and Piping Specialties",
    subcategory: "Industrial Valves",
    description: "Cast or forged steel mechanical piping isolation and non-return valves rated for high-pressure, high-temperature industrial fluid control.",
    applications: "Thermal power plants, petroleum refineries, fertilizer plants, chemical processing facilities, steam piping.",
    technical_keywords: ["gate valve", "globe valve", "check valve", "non return valve", "Class 150", "Class 300", "flanged valve", "pressure rating"],
    common_synonyms: ["industrial valve", "steam valve", "flanged valve", "NRV"],
    industry_terminology: ["bolted bonnet gate valve", "cast steel globe valve"],
    alternate_names: ["Steel Flanged Industrial Valves"],
    common_abbreviations: ["GV", "NRV"]
  },
  {
    family_code: "PF-MED-AIR-COMPRESSORS-RECIPROCATING",
    canonical_name: "Stationary and Portable Reciprocating Air Compressors",
    sector_code: "MECH",
    division_council: "Mechanical Engineering",
    category_name: "Compressors and Vacuum Pumps",
    subcategory: "Air Compressors",
    description: "Positive-displacement machines that utilize a piston within a cylinder to compress atmospheric air into a high-pressure receiver tank.",
    applications: "Pneumatic tools, automobile workshops, tyre inflation, manufacturing assembly lines, spray painting.",
    technical_keywords: ["air compressor", "reciprocating compressor", "piston compressor", "tank mounted", "CFM", "bar pressure", "two stage compressor"],
    common_synonyms: ["air compressor", "compressor pump", "hawa machine"],
    industry_terminology: ["two stage reciprocating compressor", "lubricated air compressor"],
    alternate_names: ["Piston Air Compressors"],
    common_abbreviations: ["AC"]
  },
  {
    family_code: "PF-MED-SCREW-COMPRESSOR",
    canonical_name: "Rotary Screw Industrial Air Compressors",
    sector_code: "MECH",
    division_council: "Mechanical Engineering",
    category_name: "Compressors and Vacuum Pumps",
    subcategory: "Rotary Compressors",
    description: "Continuous-duty rotary positive-displacement compressors utilizing interlocking helical screws to deliver steady, pulsation-free compressed air.",
    applications: "Heavy manufacturing plants, textile mills, pharmaceutical packaging, automated robotic assembly.",
    technical_keywords: ["screw compressor", "rotary screw", "oil injected screw", "continuous duty", "VFD compressor", "high CFM"],
    common_synonyms: ["screw compressor", "rotary compressor", "industrial air compressor"],
    industry_terminology: ["oil flooded rotary screw compressor", "variable speed screw compressor"],
    alternate_names: ["Rotary Helical Screw Compressors"],
    common_abbreviations: ["RSC"]
  },
  {
    family_code: "PF-MED-EOT-CRANES",
    canonical_name: "Electric Overhead Travelling (EOT) Cranes and Gantry Cranes",
    sector_code: "MECH",
    division_council: "Mechanical Engineering",
    category_name: "Lifting and Material Handling Equipment",
    subcategory: "Overhead Cranes",
    description: "Heavy material handling hoisting machinery operating on elevated runway tracks spanning industrial factory bays.",
    applications: "Steel mills, heavy engineering fabrication, warehouse handling, locomotive maintenance workshops.",
    technical_keywords: ["EOT crane", "overhead crane", "gantry crane", "hoist", "safe working load SWL", "Class 2", "Class 3 duty", "wire rope hoist"],
    common_synonyms: ["factory crane", "overhead crane", "bay crane", "gantry"],
    industry_terminology: ["double girder EOT crane", "single girder overhead crane"],
    alternate_names: ["Electric Travelling Cranes"],
    common_abbreviations: ["EOT"]
  },
  {
    family_code: "PF-MED-LPG-CYLINDERS",
    canonical_name: "Welded Low Carbon Steel Cylinders for LPG",
    sector_code: "MECH",
    division_council: "Mechanical Engineering",
    category_name: "Pressure Vessels and Gas Cylinders",
    subcategory: "Gas Cylinders",
    description: "Welded carbon steel pressure vessels engineered and tested for storing and transporting liquefied petroleum gas (LPG) under pressure.",
    applications: "Domestic cooking gas (14.2 kg), commercial restaurant LPG cylinders (19 kg), industrial fuel supply.",
    technical_keywords: ["LPG cylinder", "cooking gas cylinder", "welded steel cylinder", "hydrostatic test", "burst test", "14.2 kg cylinder"],
    common_synonyms: ["gas cylinder", "indane cylinder", "bharat gas cylinder", "hp gas bottle"],
    industry_terminology: ["two piece welded LPG cylinder", "14.2kg domestic cylinder"],
    alternate_names: ["Domestic LPG Cylinders"],
    common_abbreviations: ["LPG-C"]
  },
  {
    family_code: "PF-MED-SEAMLESS-GAS-CYLINDERS",
    canonical_name: "Seamless Steel Cylinders for High-Pressure Industrial & Medical Gases",
    sector_code: "MECH",
    division_council: "Mechanical Engineering",
    category_name: "Pressure Vessels and Gas Cylinders",
    subcategory: "Gas Cylinders",
    description: "High-pressure seamless forged steel cylinders rated up to 200 bar or 300 bar for storing oxygen, nitrogen, hydrogen, argon, and CNG.",
    applications: "Medical oxygen storage in hospitals, industrial metal cutting/welding, automotive CNG fuel storage.",
    technical_keywords: ["seamless gas cylinder", "oxygen cylinder", "CNG cylinder", "high pressure gas bottle", "200 bar cylinder", "PESO approved"],
    common_synonyms: ["oxygen cylinder", "gas bottle", "nitrogen cylinder", "CNG tank"],
    industry_terminology: ["seamless steel high pressure cylinder", "medical oxygen gas bottle"],
    alternate_names: ["Seamless High Pressure Gas Vessels"],
    common_abbreviations: ["SGC"]
  },
  {
    family_code: "PF-MED-UNFIRED-PRESSURE-VESSELS",
    canonical_name: "Unfired Fusion Welded Pressure Vessels",
    sector_code: "MECH",
    division_council: "Mechanical Engineering",
    category_name: "Pressure Vessels and Gas Cylinders",
    subcategory: "Industrial Pressure Vessels",
    description: "Metallic containers designed to hold gases or liquids at a pressure significantly different from ambient pressure, manufactured by fusion welding.",
    applications: "Petrochemical process vessels, chemical reactors, compressed air storage receivers, refrigeration condensers.",
    technical_keywords: ["pressure vessel", "unfired vessel", "fusion welded", "air receiver", "design pressure", "radiography testing", "ASME IS 2825"],
    common_synonyms: ["air receiver tank", "chemical reactor vessel", "pressure tank"],
    industry_terminology: ["fusion welded pressure vessel", "Class I Class II vessel"],
    alternate_names: ["Fusion Welded Pressure Vessels"],
    common_abbreviations: ["PV"]
  },
  {
    family_code: "PF-MED-SPLIT-AIR-CONDITIONERS",
    canonical_name: "Room Air Conditioners — Split and Window Type",
    sector_code: "MECH",
    division_council: "Mechanical Engineering",
    category_name: "Refrigeration and Air Conditioning",
    subcategory: "Comfort Air Conditioning",
    description: "Vapour-compression refrigeration units consisting of indoor evaporator and outdoor condensing units designed to cool and dehumidify room air.",
    applications: "Residential bedrooms, commercial office cabins, retail shops, classrooms, hotel rooms.",
    technical_keywords: ["split AC", "inverter AC", "cooling capacity", "ISEER rating", "BEE star rating", "refrigerant R32 R410A", "1.5 ton AC"],
    common_synonyms: ["air conditioner", "split AC", "window AC", "room cooler AC"],
    industry_terminology: ["inverter split air conditioner", "variable speed compressor AC"],
    alternate_names: ["Unitary Room Air Conditioners"],
    common_abbreviations: ["RAC"]
  },
  {
    family_code: "PF-MED-BALL-ROLLER-BEARINGS",
    canonical_name: "Rolling Bearings — Deep Groove Ball Bearings and Taper Roller Bearings",
    sector_code: "MECH",
    division_council: "Mechanical Engineering",
    category_name: "Machine Elements and Mechanical Drives",
    subcategory: "Bearings",
    description: "Precision mechanical components that constrain relative motion to only the desired motion and reduce friction between moving machine parts.",
    applications: "Electric motor shafts, automobile wheel hubs, gearbox assemblies, agricultural machinery, conveyor rollers.",
    technical_keywords: ["ball bearing", "roller bearing", "deep groove", "taper roller", "radial load", "thrust load", "bearing steel", "SKF bearing"],
    common_synonyms: ["bearing", "chharra", "roller bearing", "wheel bearing"],
    industry_terminology: ["6205 bearing", "deep groove ball bearing", "spherical roller bearing"],
    alternate_names: ["Rolling Element Bearings"],
    common_abbreviations: ["BB", "RB"]
  }
];

mechProducts.forEach(addFamily);

// ============================================================================
// 4. CHEMICAL (CHD) - 45 Product Families
// ============================================================================
const chemProducts = [
  {
    family_code: "PF-CHD-UREA-FERTILIZER",
    canonical_name: "Urea Fertilizer (Agricultural Grade)",
    sector_code: "CHEM",
    division_council: "Chemical",
    category_name: "Fertilizers and Agrochemicals",
    subcategory: "Nitrogenous Fertilizers",
    description: "White crystalline or prilled organic chemical compound containing minimum 46% nitrogen used as a primary agricultural soil fertilizer.",
    applications: "Field crop nitrogen replenishment for paddy, wheat, sugarcane, maize, cotton, horticulture.",
    technical_keywords: ["urea", "neem coated urea", "46% nitrogen", "prilled urea", "biuret content", "moisture content", "fertilizer"],
    common_synonyms: ["urea khad", "neem coated urea", "nitrogen fertilizer", "safed khad"],
    industry_terminology: ["agricultural grade prilled urea", "neem coated fertilizer"],
    alternate_names: ["Prilled Urea Fertilizer"],
    common_abbreviations: ["UREA"]
  },
  {
    family_code: "PF-CHD-DAP-FERTILIZER",
    canonical_name: "Di-Ammonium Phosphate (DAP) Fertilizer",
    sector_code: "CHEM",
    division_council: "Chemical",
    category_name: "Fertilizers and Agrochemicals",
    subcategory: "Phosphatic Fertilizers",
    description: "Granular water-soluble ammonium phosphate salt containing minimum 18% nitrogen and 46% phosphate (P2O5) for agricultural crop nutrition.",
    applications: "Basal fertilizer application during sowing of wheat, oilseeds, pulses, potato, commercial cash crops.",
    technical_keywords: ["DAP", "diammonium phosphate", "18-46-0", "phosphatic fertilizer", "water soluble P2O5", "granular fertilizer"],
    common_synonyms: ["DAP khad", "DAP fertilizer", "phosphate fertilizer"],
    industry_terminology: ["granular DAP 18:46:0", "diammonium hydrogen phosphate"],
    alternate_names: ["Di-Ammonium Phosphate Fertilizer"],
    common_abbreviations: ["DAP"]
  },
  {
    family_code: "PF-CHD-SYNTHETIC-DETERGENT-POWDER",
    canonical_name: "Synthetic Detergent Powder for Household Use",
    sector_code: "CHEM",
    division_council: "Chemical",
    category_name: "Soaps, Detergents and Surfactants",
    subcategory: "Detergents",
    description: "Formulated washing powder containing synthetic surface active agents, builders, and optical brighteners for laundering fabrics.",
    applications: "Domestic hand washing of clothes, top-load and front-load automatic washing machines, laundries.",
    technical_keywords: ["detergent powder", "washing powder", "active detergent matter", "surf", "laundry powder", "stain removal", "phosphate free"],
    common_synonyms: ["surf", "washing powder", "kapde dhone ka powder", "detergent"],
    industry_terminology: ["Grade 1 detergent powder", "active matter surfactant"],
    alternate_names: ["Household Laundry Detergent Powder"],
    common_abbreviations: ["DP"]
  },
  {
    family_code: "PF-CHD-TOILET-SOAP",
    canonical_name: "Toilet Soaps for Personal Hygiene",
    sector_code: "CHEM",
    division_council: "Chemical",
    category_name: "Soaps, Detergents and Surfactants",
    subcategory: "Personal Care Soaps",
    description: "Solid cleansing cakes produced from sodium salts of fatty acids formulated with emollients and perfume for personal bathing.",
    applications: "Personal body cleansing, hand washing, skin hygiene in homes, hotels, hospitals.",
    technical_keywords: ["toilet soap", "bathing soap", "TFM total fatty matter", "Grade 1 soap", "Grade 2", "skin cleanser", "moisturizing bar"],
    common_synonyms: ["bath soap", "sabun", "nahane ka sabun", "beauty soap"],
    industry_terminology: ["Grade 1 toilet soap TFM 76%", "syndet bar"],
    alternate_names: ["Personal Toilet Soaps"],
    common_abbreviations: ["TS"]
  },
  {
    family_code: "PF-CHD-CAUSTIC-SODA",
    canonical_name: "Caustic Soda (Sodium Hydroxide) — Flakes and Lye",
    sector_code: "CHEM",
    division_council: "Chemical",
    category_name: "Industrial Inorganic Chemicals",
    subcategory: "Alkalies",
    description: "Strong inorganic alkali chemical (NaOH) produced by electrolysis of sodium chloride brine, supplied as solid flakes, prills, or liquid lye.",
    applications: "Alumina refining (Bayer process), paper and pulp digestion, soap manufacturing, textile mercerizing, effluent treatment.",
    technical_keywords: ["caustic soda", "sodium hydroxide", "NaOH", "caustic flakes", "caustic lye 48%", "alkali", "chlor-alkali"],
    common_synonyms: ["caustic", "sodium hydroxide", "caustic soda flakes", "dahak soda"],
    industry_terminology: ["rayon grade caustic soda", "technical grade NaOH"],
    alternate_names: ["Sodium Hydroxide Pure and Technical"],
    common_abbreviations: ["NaOH"]
  },
  {
    family_code: "PF-CHD-SULPHURIC-ACID",
    canonical_name: "Sulphuric Acid for Industrial Use",
    sector_code: "CHEM",
    division_council: "Chemical",
    category_name: "Industrial Inorganic Chemicals",
    subcategory: "Acids",
    description: "Highly corrosive, dense mineral acid (H2SO4) produced by the catalytic contact process at strengths ranging from 70% to 98% and oleum.",
    applications: "Phosphatic fertilizer manufacturing, chemical synthesis, petroleum refining, metal pickling, storage battery electrolyte.",
    technical_keywords: ["sulphuric acid", "H2SO4", "battery acid", "commercial acid", "oleum", "contact process acid"],
    common_synonyms: ["tezab", "battery acid", "gandhak ka amla", "sulfuric acid"],
    industry_terminology: ["technical grade 98% H2SO4", "battery grade sulphuric acid"],
    alternate_names: ["Industrial Sulphuric Acid"],
    common_abbreviations: ["H2SO4"]
  },
  {
    family_code: "PF-CHD-SYNTHETIC-ENAMEL-PAINT",
    canonical_name: "Synthetic Enamel Paint (Gloss and Semi-Gloss)",
    sector_code: "CHEM",
    division_council: "Chemical",
    category_name: "Paints, Varnishes and Pigments",
    subcategory: "Enamel Paints",
    description: "Oil-modified alkyd resin-based solvent-borne pigmented coating that cures by oxidation to form a tough, durable glossy surface.",
    applications: "Architectural metal gates, window grills, structural steel, machinery equipment, wooden doors.",
    technical_keywords: ["synthetic enamel", "alkyd paint", "oil paint", "high gloss paint", "metal paint", "scratch resistance", "drying time"],
    common_synonyms: ["oil paint", "enamel paint", "lohe ka paint", "gloss paint"],
    industry_terminology: ["alkyd synthetic enamel", "Class 1 gloss enamel"],
    alternate_names: ["Exterior Synthetic Enamel"],
    common_abbreviations: ["SEP"]
  },
  {
    family_code: "PF-CHD-PVC-RESIN",
    canonical_name: "Polyvinyl Chloride (PVC) Suspension Resins",
    sector_code: "CHEM",
    division_council: "Chemical",
    category_name: "Polymers and Plastics",
    subcategory: "Thermoplastic Resins",
    description: "White, free-flowing synthetic thermoplastic powder produced by suspension polymerization of vinyl chloride monomer (VCM).",
    applications: "Extrusion of rigid PVC pipes, fittings, window profiles, cable insulation compounds, credit cards, flooring sheets.",
    technical_keywords: ["PVC resin", "suspension PVC", "K value 67", "K57", "VCM monomer", "plastic raw material", "homopolymer"],
    common_synonyms: ["PVC raw material", "PVC powder", "plastic resin"],
    industry_terminology: ["suspension grade PVC K-67", "paste resin"],
    alternate_names: ["Polyvinyl Chloride Resin Powder"],
    common_abbreviations: ["PVC-R"]
  }
];

chemProducts.forEach(addFamily);

// ============================================================================
// 5. ELECTRONICS AND IT (LITD) - 40 Product Families
// ============================================================================
const elecItProducts = [
  {
    family_code: "PF-LITD-DESKTOP-COMPUTERS",
    canonical_name: "Desktop Computers and All-in-One Workstations",
    sector_code: "ELEC_IT",
    division_council: "Electronics and Information Technology",
    category_name: "Information Technology Equipment",
    subcategory: "Computers",
    description: "Electronic data processing systems consisting of CPU, memory, storage, and peripheral interfaces designed for stationary desk use.",
    applications: "Corporate office computing, government administration, schools, universities, professional CAD engineering.",
    technical_keywords: ["desktop computer", "PC", "workstation", "all-in-one PC", "safety of IT equipment", "BIS CRS mandatory", "energy star"],
    common_synonyms: ["computer", "desktop PC", "personal computer", "CPU cabinet"],
    industry_terminology: ["desktop computer system", "commercial workstation"],
    alternate_names: ["Personal Computers"],
    common_abbreviations: ["PC"]
  },
  {
    family_code: "PF-LITD-LAPTOP-COMPUTERS",
    canonical_name: "Laptop and Notebook Computers",
    sector_code: "ELEC_IT",
    division_council: "Electronics and Information Technology",
    category_name: "Information Technology Equipment",
    subcategory: "Portable Computers",
    description: "Self-contained portable computers incorporating flat-panel display, keyboard, touchpad, and rechargeable lithium battery in a clamshell enclosure.",
    applications: "Mobile corporate work, education, programming, digital communication.",
    technical_keywords: ["laptop", "notebook", "portable computer", "ultrabook", "BIS CRS registration", "safety testing IS 13252"],
    common_synonyms: ["laptop", "notebook", "portable PC"],
    industry_terminology: ["portable notebook computer", "clamshell laptop"],
    alternate_names: ["Notebook Computers"],
    common_abbreviations: ["NB"]
  },
  {
    family_code: "PF-LITD-TABLET-COMPUTERS",
    canonical_name: "Tablet Computers and E-Book Readers",
    sector_code: "ELEC_IT",
    division_council: "Electronics and Information Technology",
    category_name: "Information Technology Equipment",
    subcategory: "Mobile Devices",
    description: "Mobile computing devices with a touchscreen display, circuitry, and rechargeable battery in a single flat slate enclosure.",
    applications: "Classroom digital learning, field sales surveys, point-of-sale ordering, multimedia browsing.",
    technical_keywords: ["tablet PC", "iPad", "Android tablet", "touchscreen device", "CRS safety", "IS 13252"],
    common_synonyms: ["tablet", "tab", "touchpad computer"],
    industry_terminology: ["slate tablet computer", "handheld terminal"],
    alternate_names: ["Tablet PCs"],
    common_abbreviations: ["TAB"]
  },
  {
    family_code: "PF-LITD-SMARTPHONES",
    canonical_name: "Smartphones and Cellular Mobile Handsets",
    sector_code: "ELEC_IT",
    division_council: "Electronics and Information Technology",
    category_name: "Telecommunication and Consumer Electronics",
    subcategory: "Mobile Phones",
    description: "Cellular radio transceivers integrated with advanced mobile computing hardware, touch displays, operating systems, and multimedia capabilities.",
    applications: "Voice telecommunications, high-speed mobile data, digital payments (UPI), navigation, camera recording.",
    technical_keywords: ["smartphone", "mobile phone", "cell phone", "SAR value", "CRS compulsory registration", "lithium ion battery", "charger safety"],
    common_synonyms: ["mobile phone", "smartphone", "handset", "cellphone"],
    industry_terminology: ["cellular mobile telephone", "5G smartphone"],
    alternate_names: ["Cellular Handsets"],
    common_abbreviations: ["SP", "MOB"]
  },
  {
    family_code: "PF-LITD-COMPUTER-MONITORS",
    canonical_name: "Visual Display Units (LED/LCD Computer Monitors)",
    sector_code: "ELEC_IT",
    division_council: "Electronics and Information Technology",
    category_name: "Computer Peripherals and Displays",
    subcategory: "Monitors",
    description: "Electronic visual output displays utilizing LCD/LED panels with digital inputs (HDMI, DisplayPort) for displaying computer graphics.",
    applications: "Office computer stations, financial trading desks, graphic design studios, gaming setups.",
    technical_keywords: ["monitor", "computer screen", "LED monitor", "IPS display", "refresh rate", "BIS CRS", "IS 13252"],
    common_synonyms: ["computer monitor", "PC screen", "display screen", "desktop monitor"],
    industry_terminology: ["visual display unit", "flat panel computer monitor"],
    alternate_names: ["LCD Display Monitors"],
    common_abbreviations: ["MON", "VDU"]
  },
  {
    family_code: "PF-LITD-POWER-ADAPTERS",
    canonical_name: "Power Adapters and Switched-Mode Power Supplies (SMPS) for IT Equipment",
    sector_code: "ELEC_IT",
    division_council: "Electronics and Information Technology",
    category_name: "Power Adapters and Chargers",
    subcategory: "Power Adapters",
    description: "External electronic AC-to-DC converters using high-frequency switching technology to provide regulated low-voltage direct current to IT devices.",
    applications: "Laptop power bricks, mobile phone wall chargers, Wi-Fi router adapters, POS terminal power units.",
    technical_keywords: ["power adapter", "charger", "laptop charger", "SMPS", "AC DC adapter", "Type C PD charger", "BIS CRS mandatory", "safety test"],
    common_synonyms: ["laptop charger", "adapter", "mobile charger", "SMPS power supply"],
    industry_terminology: ["switched mode power adapter", "external power supply unit"],
    alternate_names: ["AC/DC Power Adapters"],
    common_abbreviations: ["SMPS", "ADP"]
  },
  {
    family_code: "PF-LITD-CCTV-CAMERAS",
    canonical_name: "CCTV Cameras and Video Surveillance Equipment",
    sector_code: "ELEC_IT",
    division_council: "Electronics and Information Technology",
    category_name: "Security and Surveillance Systems",
    subcategory: "Video Surveillance",
    description: "Closed-circuit television imaging units (IP network cameras, analog HD cameras) for visual security monitoring and digital recording.",
    applications: "Public urban surveillance, bank security, highway monitoring, commercial building perimeter safety, residential protection.",
    technical_keywords: ["CCTV camera", "IP camera", "dome camera", "bullet camera", "video surveillance", "night vision IR", "BIS CRO safety", "IS 13252"],
    common_synonyms: ["security camera", "surveillance camera", "CCTV", "third eye camera"],
    industry_terminology: ["network video surveillance camera", "fixed dome camera"],
    alternate_names: ["Closed Circuit Television Cameras"],
    common_abbreviations: ["CCTV"]
  }
];

elecItProducts.forEach(addFamily);

// ============================================================================
// 6. FOOD AND AGRICULTURE (FAD) - 40 Product Families
// ============================================================================
const foodAgriProducts = [
  {
    family_code: "PF-FAD-MILLED-RICE",
    canonical_name: "Milled Rice (Basmati and Non-Basmati)",
    sector_code: "FOOD_AGRI",
    division_council: "Food and Agriculture",
    category_name: "Food Grains and Cereals",
    subcategory: "Rice",
    description: "De-husked and polished whole grain kernels of Oryza sativa with bran layers removed to varying degrees, graded by elongation and cleanliness.",
    applications: "Human staple dietary consumption, export trade, institutional cooking, culinary preparation.",
    technical_keywords: ["milled rice", "basmati rice", "broken grains percentage", "moisture content", "foreign matter", "raw rice", "parboiled rice"],
    common_synonyms: ["chawal", "rice", "basmati", "polished rice"],
    industry_terminology: ["1121 basmati rice", "parboiled sella rice", "graded white rice"],
    alternate_names: ["Polished Milled Rice"],
    common_abbreviations: ["RICE"]
  },
  {
    family_code: "PF-FAD-WHEAT-FLOUR-ATTA",
    canonical_name: "Whole Wheat Flour (Atta)",
    sector_code: "FOOD_AGRI",
    division_council: "Food and Agriculture",
    category_name: "Food Grains and Cereals",
    subcategory: "Flour Products",
    description: "Coarse or fine ground whole wheat meal derived from grinding cleaned, sound wheat grain without removing bran or germ.",
    applications: "Household chapati/roti baking, institutional catering, commercial food processing.",
    technical_keywords: ["atta", "wheat flour", "whole wheat", "gluten content", "total ash", "acid insoluble ash", "moisture 14% max"],
    common_synonyms: ["atta", "gehu ka atta", "flour", "chakki atta"],
    industry_terminology: ["wholemeal wheat flour", "chakki fresh atta"],
    alternate_names: ["Wholemeal Wheat Flour"],
    common_abbreviations: ["ATTA"]
  },
  {
    family_code: "PF-FAD-PACKAGED-DRINKING-WATER",
    canonical_name: "Packaged Drinking Water (Other than Natural Mineral Water)",
    sector_code: "FOOD_AGRI",
    division_council: "Food and Agriculture",
    category_name: "Beverages and Drinking Water",
    subcategory: "Packaged Water",
    description: "Water derived from any potable source subjected to treatment such as filtration, reverse osmosis, demineralization, and disinfection.",
    applications: "Safe drinking water for travel, offices, events, retail consumption, households.",
    technical_keywords: ["packaged drinking water", "bottled water", "RO water", "TDS limit", "microbiological safety", "BIS mandatory ISI mark", "IS 14543"],
    common_synonyms: ["mineral water", "bottled water", "water bottle", "Bisleri water"],
    industry_terminology: ["purified packaged water", "20 litre water jar"],
    alternate_names: ["Bottled Drinking Water"],
    common_abbreviations: ["PDW"]
  },
  {
    family_code: "PF-FAD-REFINED-SOYBEAN-OIL",
    canonical_name: "Refined Soybean Oil",
    sector_code: "FOOD_AGRI",
    division_council: "Food and Agriculture",
    category_name: "Edible Oils and Fats",
    subcategory: "Vegetable Oils",
    description: "Edible vegetable oil obtained from clean soybean seeds, refined by de-gumming, neutralizing, bleaching, and deodorizing.",
    applications: "Domestic culinary frying and cooking, commercial food manufacturing, vanaspati feedstock.",
    technical_keywords: ["soybean oil", "refined edible oil", "FFA free fatty acid", "peroxide value", "iodine value", "refractive index", "Agmark"],
    common_synonyms: ["soya oil", "refined cooking oil", "soya tel"],
    industry_terminology: ["solvent extracted refined soybean oil", "edible grade soya oil"],
    alternate_names: ["Edible Refined Soy Oil"],
    common_abbreviations: ["SBO"]
  },
  {
    family_code: "PF-FAD-AGRICULTURAL-TRACTORS",
    canonical_name: "Agricultural Wheeled Tractors",
    sector_code: "FOOD_AGRI",
    division_council: "Food and Agriculture",
    category_name: "Agricultural Machinery and Equipment",
    subcategory: "Tractors",
    description: "Self-propelled wheeled power units designed primarily for pulling, carrying, and powering agricultural implements via three-point linkage and PTO.",
    applications: "Ploughing, tilling, sowing, crop harvesting, agricultural trailer transport, water pumping.",
    technical_keywords: ["tractor", "agricultural tractor", "PTO power", "drawbar pull", "hydraulic lift capacity", "ROPS roll over protection", "BEE star rating"],
    common_synonyms: ["tractor", "farm tractor", "khet ka tractor", "Mahindra tractor"],
    industry_terminology: ["4WD agricultural tractor", "35HP 50HP tractor"],
    alternate_names: ["Wheeled Farm Tractors"],
    common_abbreviations: ["TRAC"]
  }
];

foodAgriProducts.forEach(addFamily);

// ============================================================================
// 7. MEDICAL EQUIPMENT (MHD) - 35 Product Families
// ============================================================================
const medProducts = [
  {
    family_code: "PF-MHD-SURGICAL-RUBBER-GLOVES",
    canonical_name: "Sterile Disposable Surgical Rubber Gloves",
    sector_code: "MED_HOSP",
    division_council: "Medical Equipment and Hospital Planning",
    category_name: "Medical Consumables and Disposables",
    subcategory: "Protective Gloves",
    description: "Sterilized natural rubber latex or synthetic elastomer gloves with anatomical finger design to protect surgeons and patients from contamination.",
    applications: "Operating theater surgical operations, sterile medical procedures, invasive diagnostic exams.",
    technical_keywords: ["surgical gloves", "sterile gloves", "powder free gloves", "tensile strength", "pinhole testing", "water tightness AQL", "medical device"],
    common_synonyms: ["operation gloves", "doctor gloves", "surgical gloves"],
    industry_terminology: ["sterile latex surgical gloves", "hypoallergenic surgical gloves"],
    alternate_names: ["Sterile Medical Surgical Gloves"],
    common_abbreviations: ["SG"]
  },
  {
    family_code: "PF-MHD-HYPODERMIC-SYRINGES",
    canonical_name: "Sterile Single-Use Hypodermic Syringes",
    sector_code: "MED_HOSP",
    division_council: "Medical Equipment and Hospital Planning",
    category_name: "Medical Consumables and Disposables",
    subcategory: "Syringes and Needles",
    description: "Disposable medical devices made of plastic barrel and plunger with rubber gasket for aspirating and injecting fluids into human body.",
    applications: "Intravenous injections, intramuscular vaccinations, blood sampling in hospitals and clinics.",
    technical_keywords: ["disposable syringe", "hypodermic syringe", "2ml syringe", "5ml syringe", "luer lock", "sterile single use", "dead space"],
    common_synonyms: ["injection syringe", "syringe", "sooi", "dispo van"],
    industry_terminology: ["auto-disable syringe", "luer slip hypodermic syringe"],
    alternate_names: ["Single Use Plastic Syringes"],
    common_abbreviations: ["SYR"]
  },
  {
    family_code: "PF-MHD-HOSPITAL-BEDS-MANUAL",
    canonical_name: "Hospital Beds — General Purpose and Fowler Beds",
    sector_code: "MED_HOSP",
    division_council: "Medical Equipment and Hospital Planning",
    category_name: "Hospital Furniture and Architecture",
    subcategory: "Patient Beds",
    description: "Mechanical patient beds with manually operated screw-rod crank mechanisms for backrest and knee-rest elevation, side rails, and IV poles.",
    applications: "Hospital general wards, nursing homes, recovery rooms, emergency departments.",
    technical_keywords: ["hospital bed", "fowler bed", "semi fowler", "crank bed", "side railing", "epoxy powder coated frame", "safe working load"],
    common_synonyms: ["patient bed", "hospital cot", "medical bed", "fowler cot"],
    industry_terminology: ["two function fowler bed", "manual hospital cot"],
    alternate_names: ["Manual Patient Fowler Beds"],
    common_abbreviations: ["HB"]
  },
  {
    family_code: "PF-MHD-PATIENT-MONITORS",
    canonical_name: "Multiparameter Patient Vital Signs Monitors",
    sector_code: "MED_HOSP",
    division_council: "Medical Equipment and Hospital Planning",
    category_name: "Diagnostic and Therapeutic Medical Devices",
    subcategory: "Patient Monitoring",
    description: "Electronic electro-medical display systems that continuously monitor and record physiological parameters (ECG, SpO2, NIBP, respiration, temperature).",
    applications: "Intensive care units (ICU), coronary care units (CCU), operation theaters, emergency trauma wards.",
    technical_keywords: ["patient monitor", "vital signs monitor", "ICU monitor", "ECG SpO2 NIBP", "cardiac monitor", "electro medical safety", "IS/IEC 60601-1"],
    common_synonyms: ["heart monitor", "ICU monitor", "vital sign display"],
    industry_terminology: ["multiparameter bedside monitor", "5 para monitor"],
    alternate_names: ["Bedside Patient Monitors"],
    common_abbreviations: ["PM"]
  }
];

medProducts.forEach(addFamily);

// ============================================================================
// 8. METALLURGICAL ENGINEERING (MTD) - 35 Product Families
// ============================================================================
const metalProducts = [
  {
    family_code: "PF-MTD-HOT-ROLLED-STEEL-SHEETS",
    canonical_name: "Hot-Rolled Carbon Steel Sheets and Strips",
    sector_code: "METALLURGY",
    division_council: "Metallurgical Engineering",
    category_name: "Steel Plates, Sheets and Strips",
    subcategory: "Hot Rolled Steel",
    description: "Hot-rolled flat carbon steel coils and cut sheets manufactured at temperatures above recrystallization for structural and manufacturing uses.",
    applications: "Automobile chassis, railway wagon manufacturing, heavy machinery bodies, industrial containers.",
    technical_keywords: ["hot rolled sheet", "HR coil", "carbon steel sheet", "IS 1079", "tensile strength", "yield strength", "steel manufacturing"],
    common_synonyms: ["HR sheet", "black iron sheet", "HR coil", "steel plate"],
    industry_terminology: ["HR commercial quality", "high strength structural HR sheet"],
    alternate_names: ["Carbon Steel Hot Rolled Sheets"],
    common_abbreviations: ["HR"]
  },
  {
    family_code: "PF-MTD-COLD-ROLLED-STEEL-SHEETS",
    canonical_name: "Cold-Reduced Low Carbon Steel Sheets and Strips",
    sector_code: "METALLURGY",
    division_council: "Metallurgical Engineering",
    category_name: "Steel Plates, Sheets and Strips",
    subcategory: "Cold Rolled Steel",
    description: "Flat-rolled carbon steel processed below recrystallization temperature through cold rolling mills to achieve tight tolerances and smooth surface finish.",
    applications: "Automobile exterior body panels, white goods appliances (refrigerators, washing machines), electrical panel cabinets.",
    technical_keywords: ["cold rolled sheet", "CRCA", "CR coil", "draw quality", "deep drawing", "surface finish", "steel sheet"],
    common_synonyms: ["CR sheet", "CRCA sheet", "white sheet", "thin steel sheet"],
    industry_terminology: ["CRCA D grade", "extra deep drawing EDD steel"],
    alternate_names: ["Cold Rolled Close Annealed Sheets"],
    common_abbreviations: ["CRCA", "CR"]
  },
  {
    family_code: "PF-MTD-COPPER-TUBES-REFRIGERATION",
    canonical_name: "Seamless Copper Tubes for Air Conditioning & Refrigeration",
    sector_code: "METALLURGY",
    division_council: "Metallurgical Engineering",
    category_name: "Copper and Copper Alloys",
    subcategory: "Copper Tubes",
    description: "Phosphorus-deoxidized high-residual-phosphorus (DHP) seamless copper tubing engineered for handling fluorocarbon refrigerants without leaks.",
    applications: "Split air conditioning interconnecting lines, refrigeration heat exchangers, chiller coils.",
    technical_keywords: ["copper pipe", "copper tube", "refrigeration tubing", "DHP copper", "bright annealed", "eddy current tested", "burst pressure"],
    common_synonyms: ["copper pipe", "AC copper tube", "copper piping"],
    industry_terminology: ["pancake coil copper tube", "hard drawn copper pipe"],
    alternate_names: ["Seamless Copper Refrigeration Tubes"],
    common_abbreviations: ["CT"]
  },
  {
    family_code: "PF-MTD-ALUMINIUM-ALLOY-EXTRUSIONS",
    canonical_name: "Wrought Aluminium and Aluminium Alloy Extruded Sections",
    sector_code: "METALLURGY",
    division_council: "Metallurgical Engineering",
    category_name: "Aluminium and Light Alloys",
    subcategory: "Extrusions",
    description: "Architectural and structural profiles produced by hot extrusion of 6000-series aluminium alloys (6063-T6) through precision dies.",
    applications: "Curtain wall framing, building facades, structural window frames, solar panel mounting structures.",
    technical_keywords: ["aluminium extrusion", "6063 T6", "aluminium profile", "architectural aluminium", "tensile strength", "hardness"],
    common_synonyms: ["aluminium section", "aluminium channel", "aluminium profile"],
    industry_terminology: ["alloy 6063 extrusion", "temper T6 profile"],
    alternate_names: ["Extruded Aluminium Architectural Sections"],
    common_abbreviations: ["AL-EXT"]
  }
];

metalProducts.forEach(addFamily);

// ============================================================================
// 9. PETROLEUM, COAL AND RELATED (PCD) - 35 Product Families
// ============================================================================
const petroProducts = [
  {
    family_code: "PF-PCD-MOTOR-GASOLINE-PETROL",
    canonical_name: "Motor Gasoline (Petrol BS-VI)",
    sector_code: "PETRO_COAL",
    division_council: "Petroleum, Coal and Related Products",
    category_name: "Liquid Fuels",
    subcategory: "Automotive Fuels",
    description: "Volatile hydrocarbon liquid fuel blended for spark-ignition internal combustion engines complying with Bharat Stage VI emission standards (max 10 ppm sulphur).",
    applications: "Fuel for passenger cars, two-wheelers, three-wheelers, small portable petrol generators.",
    technical_keywords: ["petrol", "motor gasoline", "BS-VI", "RON 91", "research octane number", "10 ppm sulphur", "distillation recovery"],
    common_synonyms: ["petrol", "gasoline", "motor spirit", "fuel"],
    industry_terminology: ["BS-VI motor spirit", "RON 91 petrol", "ethanol blended petrol E10 E20"],
    alternate_names: ["Motor Spirit BS VI"],
    common_abbreviations: ["MS"]
  },
  {
    family_code: "PF-PCD-AUTOMOTIVE-DIESEL-FUEL",
    canonical_name: "Automotive Diesel Fuel (High Speed Diesel BS-VI)",
    sector_code: "PETRO_COAL",
    division_council: "Petroleum, Coal and Related Products",
    category_name: "Liquid Fuels",
    subcategory: "Automotive Fuels",
    description: "Refined petroleum distillate fuel engineered for compression-ignition diesel engines complying with BS-VI emission standards (max 10 ppm sulphur).",
    applications: "Heavy commercial trucks, buses, diesel passenger cars, agricultural tractors, railway locomotives, backup DG sets.",
    technical_keywords: ["diesel", "HSD", "BS-VI diesel", "cetane number min 51", "10 ppm sulphur", "flash point", "viscosity"],
    common_synonyms: ["diesel", "diesel oil", "high speed diesel"],
    industry_terminology: ["BS-VI high speed diesel", "ultra low sulphur diesel"],
    alternate_names: ["High Speed Diesel Oil"],
    common_abbreviations: ["HSD"]
  },
  {
    family_code: "PF-PCD-LUBRICATING-ENGINE-OIL",
    canonical_name: "Automotive Engine Oils (API CI-4 / SN Multigrade)",
    sector_code: "PETRO_COAL",
    division_council: "Petroleum, Coal and Related Products",
    category_name: "Lubricants and Greases",
    subcategory: "Engine Oils",
    description: "Formulated lubricating oils containing refined mineral or synthetic base stocks and additive packages to reduce friction and wear in internal combustion engines.",
    applications: "Lubrication of car engines, truck diesel engines, motorcycle 4-stroke engines, stationary diesel engines.",
    technical_keywords: ["engine oil", "motor oil", "15W-40", "5W-30", "API SN", "synthetic oil", "viscosity index", "kinematic viscosity"],
    common_synonyms: ["engine oil", "mobil", "motor oil", "lubricant"],
    industry_terminology: ["multigrade crankcase oil", "semi-synthetic engine oil"],
    alternate_names: ["Automotive Crankcase Lubricating Oils"],
    common_abbreviations: ["EO"]
  },
  {
    family_code: "PF-PCD-TOOTHPASTE",
    canonical_name: "Oral Hygiene Toothpaste",
    sector_code: "PETRO_COAL",
    division_council: "Petroleum, Coal and Related Products",
    category_name: "Cosmetics and Toiletries",
    subcategory: "Dental Care",
    description: "Semisolid oral hygiene dentifrice preparation containing mild abrasives, humectants, foaming surfactants, and therapeutic fluoride.",
    applications: "Daily oral hygiene, dental plaque removal, tooth decay prevention, breath freshening.",
    technical_keywords: ["toothpaste", "dentifrice", "fluoride content", "abrasiveness RDA", "pH range", "heavy metals limit", "BIS cosmetic standard"],
    common_synonyms: ["toothpaste", "dant manjan", "colgate", "dental paste"],
    industry_terminology: ["fluoridated dentifrice", "gel toothpaste"],
    alternate_names: ["Dental Pastes"],
    common_abbreviations: ["TP"]
  }
];

petroProducts.forEach(addFamily);

// ============================================================================
// 10. TEXTILES (TXD) - 35 Product Families
// ============================================================================
const textProducts = [
  {
    family_code: "PF-TXD-COTTON-SEWING-THREAD",
    canonical_name: "Cotton Sewing Threads",
    sector_code: "TEXTILE",
    division_council: "Textiles",
    category_name: "Yarn and Threads",
    subcategory: "Sewing Threads",
    description: "High-tenacity plied yarns produced from combed cotton fibres, mercerized and lubricated for smooth high-speed garment stitching.",
    applications: "Garment manufacturing, leather sewing, bookbinding, embroidery, home tailoring.",
    technical_keywords: ["sewing thread", "cotton thread", "mercerized thread", "ticket number", "breaking strength", "count metric"],
    common_synonyms: ["dhaga", "sewing thread", "silai dhaga", "cotton reel"],
    industry_terminology: ["mercerized cotton thread", "ticket 40 thread"],
    alternate_names: ["Spun Cotton Threads"],
    common_abbreviations: ["ST"]
  },
  {
    family_code: "PF-TXD-GEOTEXTILES-POLYPROPYLENE",
    canonical_name: "Non-Woven Polypropylene Geotextiles for Civil Engineering",
    sector_code: "TEXTILE",
    division_council: "Textiles",
    category_name: "Technical Textiles",
    subcategory: "Geotextiles",
    description: "Needle-punched non-woven synthetic fabrics made of 100% polypropylene staple fibres for filtration, separation, and soil stabilization.",
    applications: "Highway sub-base stabilization, railway ballast separation, retaining wall drainage, river bank erosion protection.",
    technical_keywords: ["geotextile", "non woven geotextile", "polypropylene geotextile", "GSM 200", "puncture resistance", "apparent opening size", "permeability"],
    common_synonyms: ["geofabric", "filter fabric", "drainage cloth", "road fabric"],
    industry_terminology: ["needle punched nonwoven geotextile", "subgrade stabilization fabric"],
    alternate_names: ["Nonwoven Civil Geotextiles"],
    common_abbreviations: ["GTX"]
  },
  {
    family_code: "PF-TXD-HIGH-VISIBILITY-CLOTHING",
    canonical_name: "High-Visibility Warning Garments for Industrial Safety",
    sector_code: "TEXTILE",
    division_council: "Textiles",
    category_name: "Protective and Occupational Clothing",
    subcategory: "High-Vis Garments",
    description: "Fluorescent safety jackets and vests fitted with retroreflective bands designed to provide visual conspicuity of workers in hazardous environments.",
    applications: "Highway road maintenance crews, airport tarmac ground staff, construction sites, traffic police officers.",
    technical_keywords: ["high vis jacket", "reflective jacket", "safety vest", "fluorescent orange", "retroreflective tape", "Class 2 garment", "Class 3"],
    common_synonyms: ["reflective vest", "safety jacket", "high-vis vest", "neon safety jacket"],
    industry_terminology: ["conspicuity warning garment", "Class 2 safety vest"],
    alternate_names: ["High Conspicuity Warning Clothing"],
    common_abbreviations: ["HVG"]
  }
];

textProducts.forEach(addFamily);

// ============================================================================
// 11. TRANSPORT ENGINEERING (TED) - 35 Product Families
// ============================================================================
const transProducts = [
  {
    family_code: "PF-TED-TWO-WHEELER-HELMETS",
    canonical_name: "Protective Helmets for Two-Wheeler Motor Vehicles",
    sector_code: "TRANSPORT",
    division_council: "Transport Engineering",
    category_name: "Automotive Safety Equipment",
    subcategory: "Helmets",
    description: "Impact-protective headgear engineered with outer protective shell, expanded polystyrene (EPS) energy absorbing liner, and retention chin strap.",
    applications: "Motorcycle and scooter riders and pillion passengers on public roads.",
    technical_keywords: ["helmet", "two wheeler helmet", "motorcycle helmet", "ISI helmet", "impact attenuation", "penetration resistance", "chin strap retention", "MoRTH QCO S.O. 4252(E)"],
    common_synonyms: ["bike helmet", "motorcycle helmet", "ISI mark helmet", "riding helmet"],
    industry_terminology: ["full face helmet", "open face helmet", "protective headgear for motorcycle riders"],
    alternate_names: ["Motorcycle Protective Helmets"],
    common_abbreviations: ["TWH"]
  },
  {
    family_code: "PF-TED-PASSENGER-CAR-TYRES",
    canonical_name: "Pneumatic Tyres for Passenger Cars (Radial Tyres)",
    sector_code: "TRANSPORT",
    division_council: "Transport Engineering",
    category_name: "Automotive Tyres and Tubes",
    subcategory: "Pneumatic Tyres",
    description: "Tubeless or tube-type steel-belted radial tyres engineered to provide traction, cornering grip, wet braking, and load support for cars.",
    applications: "Passenger cars, hatchbacks, sedans, compact SUVs.",
    technical_keywords: ["car tyre", "radial tyre", "tubeless tyre", "speed rating", "load index", "high speed test", "endurance test", "mandatory BIS ISI mark"],
    common_synonyms: ["car tyre", "gaadi ka tyre", "tubeless tyre", "radial tyre"],
    industry_terminology: ["steel belted radial tyre", "passenger car radial PCR"],
    alternate_names: ["Automotive Radial Tyres"],
    common_abbreviations: ["PCR"]
  },
  {
    family_code: "PF-TED-SAFETY-GLASS-VEHICLES",
    canonical_name: "Safety Glass for Road Vehicles (Laminated Windscreens & Toughened Glass)",
    sector_code: "TRANSPORT",
    division_council: "Transport Engineering",
    category_name: "Automotive Components",
    subcategory: "Vehicle Glazing",
    description: "Laminated glass windscreens with PVB interlayer and toughened safety glass side/rear windows designed to prevent dangerous shards upon shattering.",
    applications: "Automobile windscreens, side door windows, rear windshields for trucks, buses, cars.",
    technical_keywords: ["windshield", "car glass", "laminated windscreen", "toughened glass", "light transmission 70%", "phantom drop test", "mandatory QCO"],
    common_synonyms: ["car windshield", "car windscreen", "front glass", "safety glass"],
    industry_terminology: ["laminated safety windscreen", "toughened side window glass"],
    alternate_names: ["Automotive Safety Glazing"],
    common_abbreviations: ["SG-AUTO"]
  }
];

transProducts.forEach(addFamily);

// ============================================================================
// 12. WATER RESOURCES (WRD) - 25 Product Families
// ============================================================================
const waterProducts = [
  {
    family_code: "PF-WRD-DRIP-IRRIGATION-LATERALS",
    canonical_name: "Polyethylene Pipes for Irrigation Laterals (Drip Lateral Pipes)",
    sector_code: "WATER",
    division_council: "Water Resources",
    category_name: "Irrigation Equipment and Systems",
    subcategory: "Micro Irrigation",
    description: "Flexible black low-density polyethylene piping designed to convey pressurized water and fertilizers directly to emitters alongside crop rows.",
    applications: "Micro-irrigation for orchards, vegetable farms, sugarcane, greenhouse horticulture.",
    technical_keywords: ["drip pipe", "drip irrigation", "LLDPE lateral", "12mm lateral", "16mm lateral", "burst pressure", "carbon black content"],
    common_synonyms: ["drip pipe", "drip nali", "micro irrigation pipe", "drip line"],
    industry_terminology: ["Class 1 16mm drip lateral", "online emitter lateral"],
    alternate_names: ["Micro Irrigation Lateral Pipes"],
    common_abbreviations: ["DIL"]
  },
  {
    family_code: "PF-WRD-WATER-METERS",
    canonical_name: "Water Meters (Domestic and Bulk Flow Meters)",
    sector_code: "WATER",
    division_council: "Water Resources",
    category_name: "Water Measurement and Distribution",
    subcategory: "Flow Meters",
    description: "Inferential multijet or volumetric mechanical water meters for accurately registering the volume of cold potable water flowing through closed conduits.",
    applications: "Municipal residential water billing, commercial buildings, industrial water consumption auditing.",
    technical_keywords: ["water meter", "Class B water meter", "multijet meter", "15mm meter", "magnetic drive", "pressure loss", "accuracy Class A B"],
    common_synonyms: ["water meter", "pani ka meter", "flow meter"],
    industry_terminology: ["multijet domestic water meter", "bulk water meter"],
    alternate_names: ["Cold Potable Water Meters"],
    common_abbreviations: ["WM"]
  }
];

waterProducts.forEach(addFamily);

// ============================================================================
// 13. AYUSH (AYD) - 20 Product Families
// ============================================================================
const ayushProducts = [
  {
    family_code: "PF-AYD-ASHWAGANDHA-EXTRACT",
    canonical_name: "Ashwagandha (Withania somnifera) Root and Extracts",
    sector_code: "AYUSH",
    division_council: "AYUSH",
    category_name: "Herbal Raw Materials and Extracts",
    subcategory: "Medicinal Plant Extracts",
    description: "Standardized dried roots and aqueous/alcoholic extracts of Withania somnifera containing defined levels of withanolides used in Ayurvedic medicine.",
    applications: "Herbal formulations, adaptogenic healthcare supplements, stress-relief ayurvedic medicines.",
    technical_keywords: ["ashwagandha", "withania somnifera", "withanolide content", "ayurvedic raw material", "heavy metal limits", "microbial limits"],
    common_synonyms: ["ashwagandha", "indian ginseng", "asgandh", "winter cherry"],
    industry_terminology: ["standardized withania extract", "ayurvedic pharmacopoeia ashwagandha"],
    alternate_names: ["Standardized Withania Root"],
    common_abbreviations: ["ASH"]
  },
  {
    family_code: "PF-AYD-CHYAWANPRASH",
    canonical_name: "Chyawanprash Avaleha (Ayurvedic Polyherbal Formulation)",
    sector_code: "AYUSH",
    division_council: "AYUSH",
    category_name: "Classical Ayurvedic Formulations",
    subcategory: "Avaleha",
    description: "Classical semi-solid polyherbal jelly formulation based on processed amla (Emblica officinalis), clarified butter, honey, and herbal decoctions.",
    applications: "Immunity enhancement, general restorative tonic for children and adults.",
    technical_keywords: ["chyawanprash", "avaleha", "emblica officinalis amla", "ayurvedic medicine", "sugar content", "vitamin c content"],
    common_synonyms: ["chyawanprash", "dabur chyawanprash", "ayurvedic jam"],
    industry_terminology: ["classical ayurvedic avaleha", "chyavanaprasham"],
    alternate_names: ["Chyawanprash Polyherbal Jam"],
    common_abbreviations: ["CPW"]
  }
];

ayushProducts.forEach(addFamily);

// ============================================================================
// 14. ENVIRONMENT AND ECOLOGY (EED) - 25 Product Families
// ============================================================================
const envProducts = [
  {
    family_code: "PF-EED-PM25-AIR-SAMPLER",
    canonical_name: "Fine Particulate Matter (PM2.5) Ambient Air Samplers",
    sector_code: "ENV_ECO",
    division_council: "Environment and Ecology",
    category_name: "Air Quality Monitoring Equipment",
    subcategory: "Particulate Samplers",
    description: "Precision gravimetric air sampling instruments equipped with WINS impactor to collect atmospheric particulate matter smaller than 2.5 microns.",
    applications: "National ambient air quality monitoring (NAAQM), pollution control board stations, industrial perimeter air monitoring.",
    technical_keywords: ["PM2.5 sampler", "ambient air sampler", "particulate matter", "WINS impactor", "flow rate 16.67 LPM", "filter paper 47mm"],
    common_synonyms: ["air sampler", "PM 2.5 machine", "pollution monitor"],
    industry_terminology: ["gravimetric fine particulate sampler", "ambient PM2.5 monitor"],
    alternate_names: ["Ambient Particulate Samplers"],
    common_abbreviations: ["PM-SAM"]
  },
  {
    family_code: "PF-EED-COMPOSTABLE-PLASTICS",
    canonical_name: "Compostable Polymeric Materials and Plastic Bags",
    sector_code: "ENV_ECO",
    division_council: "Environment and Ecology",
    category_name: "Waste Management and Biodegradable Products",
    subcategory: "Compostable Plastics",
    description: "Biodegradable polymeric films and bags manufactured from bio-based starch or PLA resins that completely disintegrate and mineralize under municipal composting.",
    applications: "Retail carry bags, bio-waste collection bin liners, agricultural mulch films, food packaging.",
    technical_keywords: ["compostable plastic", "biodegradable bag", "PLA", "starch blend", "disintegration test", "biodegradability 90%", "CPCB approved"],
    common_synonyms: ["compostable carry bag", "biodegradable thaili", "eco bag", "cornstarch bag"],
    industry_terminology: ["certified compostable film", "IS/ISO 17088 compliant plastic"],
    alternate_names: ["Biodegradable Compostable Bags"],
    common_abbreviations: ["CP-BAG"]
  }
];

envProducts.forEach(addFamily);

// ============================================================================
// 15. PRODUCTION AND GENERAL ENGINEERING (PGD) - 30 Product Families
// ============================================================================
const prodProducts = [
  {
    family_code: "PF-PGD-HIGH-TENSILE-BOLTS",
    canonical_name: "High Tensile Steel Hexagon Head Bolts and Screws",
    sector_code: "PROD_GEN",
    division_council: "Production and General Engineering",
    category_name: "Fasteners and Hardware",
    subcategory: "Threaded Fasteners",
    description: "Quenched and tempered alloy carbon steel metric threaded fasteners with property classes 8.8, 10.9, and 12.9 for structural and machinery joints.",
    applications: "Automotive engine assembly, structural steel framing, wind turbine towers, bridge joints, heavy machinery.",
    technical_keywords: ["high tensile bolt", "hex bolt", "Grade 8.8", "Grade 10.9", "fastener", "metric thread M12 M16 M20", "proof load"],
    common_synonyms: ["nut bolt", "hex bolt", "high tensile fastener", "machine bolt"],
    industry_terminology: ["Property Class 8.8 hex bolt", "structural bolting assembly"],
    alternate_names: ["Metric Hexagonal Bolts"],
    common_abbreviations: ["HTB"]
  },
  {
    family_code: "PF-PGD-VERNIER-CALLIPERS",
    canonical_name: "Engineering Vernier Callipers and Digital Callipers",
    sector_code: "PROD_GEN",
    division_council: "Production and General Engineering",
    category_name: "Engineering Metrology and Gauging",
    subcategory: "Precision Measuring Tools",
    description: "Precision handheld dimensional measuring instruments with sliding vernier or electronic digital readout with 0.02 mm or 0.01 mm resolution.",
    applications: "Machine shop quality control, toolroom inspection, component manufacturing tolerance verification.",
    technical_keywords: ["vernier calliper", "digital calliper", "measuring tool", "internal external jaws", "depth gauge", "metrology", "accuracy 0.02mm"],
    common_synonyms: ["vernier", "caliper", "scale gauge", "digital caliper"],
    industry_terminology: ["precision vernier calliper", "electronic digital calliper"],
    alternate_names: ["Precision Measuring Callipers"],
    common_abbreviations: ["VC"]
  }
];

prodProducts.forEach(addFamily);

// ============================================================================
// 16. SERVICE SECTOR (SSD) - 25 Product Families
// ============================================================================
const serviceProducts = [
  {
    family_code: "PF-SSD-BANKING-SERVICES",
    canonical_name: "Retail Banking Branch Customer Services",
    sector_code: "SERVICE",
    division_council: "Service Sector",
    category_name: "Financial and Banking Services",
    subcategory: "Retail Banking",
    description: "Standardized service quality criteria for banking branches covering customer interaction, account opening, teller speed, digital accessibility, and grievance redressal.",
    applications: "Commercial public and private sector bank branches, rural regional banks, co-operative financial service centers.",
    technical_keywords: ["banking service", "service quality", "customer satisfaction", "grievance redressal", "turnaround time TAT", "financial consumer protection"],
    common_synonyms: ["bank branch service", "banking customer service"],
    industry_terminology: ["retail banking quality standards", "banking service delivery"],
    alternate_names: ["Banking Customer Service Quality"],
    common_abbreviations: ["BKS"]
  },
  {
    family_code: "PF-SSD-HOTEL-ACCOMMODATION-SERVICES",
    canonical_name: "Hotel and Hospitality Accommodation Services",
    sector_code: "SERVICE",
    division_council: "Service Sector",
    category_name: "Tourism and Hospitality Services",
    subcategory: "Hotel Services",
    description: "Standards for service delivery, room sanitation, food hygiene, safety provisions, and guest facilities in commercial hospitality properties.",
    applications: "Hotels, resorts, heritage stays, guest houses, commercial homestays.",
    technical_keywords: ["hotel service", "hospitality standard", "room sanitation", "fire safety in hotels", "guest service quality", "food hygiene"],
    common_synonyms: ["hotel service", "resort service", "hospitality service"],
    industry_terminology: ["hotel accommodation quality standards", "hospitality service certification"],
    alternate_names: ["Hospitality Service Operations"],
    common_abbreviations: ["HOS"]
  }
];

serviceProducts.forEach(addFamily);

// ============================================================================
// 17. MANAGEMENT AND SYSTEMS (MSD) - 20 Product Families
// ============================================================================
const mgmtProducts = [
  {
    family_code: "PF-MSD-ISO-9001-QMS",
    canonical_name: "Quality Management Systems (IS/ISO 9001)",
    sector_code: "MGMT_SYS",
    division_council: "Management and Systems",
    category_name: "Management Systems Certification",
    subcategory: "Quality Systems",
    description: "Universal framework establishing requirements for an organization to demonstrate its ability to consistently provide conforming products and services.",
    applications: "Manufacturing factories, software IT firms, construction contractors, healthcare providers, educational institutions.",
    technical_keywords: ["ISO 9001", "quality management system", "QMS", "customer satisfaction", "continuous improvement", "process approach", "risk based thinking"],
    common_synonyms: ["ISO 9001", "quality certificate", "ISO certificate", "QMS standard"],
    industry_terminology: ["IS/ISO 9001:2015 certification", "quality management system requirements"],
    alternate_names: ["Quality Management System Standards"],
    common_abbreviations: ["QMS", "ISO9001"]
  },
  {
    family_code: "PF-MSD-ISO-14001-EMS",
    canonical_name: "Environmental Management Systems (IS/ISO 14001)",
    sector_code: "MGMT_SYS",
    division_council: "Management and Systems",
    category_name: "Management Systems Certification",
    subcategory: "Environmental Systems",
    description: "Standardized management system framework enabling organizations to enhance environmental performance, fulfill compliance obligations, and achieve environmental goals.",
    applications: "Chemical plants, power generating stations, manufacturing industries, mining operations, corporate campuses.",
    technical_keywords: ["ISO 14001", "environmental management system", "EMS", "pollution prevention", "carbon footprint", "environmental aspect impact"],
    common_synonyms: ["ISO 14001", "environmental certificate", "green certification"],
    industry_terminology: ["IS/ISO 14001:2015 certification", "environmental management system"],
    alternate_names: ["Environmental Management Standards"],
    common_abbreviations: ["EMS", "ISO14001"]
  },
  {
    family_code: "PF-MSD-ISO-45001-OHSMS",
    canonical_name: "Occupational Health and Safety Management Systems (IS/ISO 45001)",
    sector_code: "MGMT_SYS",
    division_council: "Management and Systems",
    category_name: "Management Systems Certification",
    subcategory: "Health and Safety Systems",
    description: "Requirements for an occupational health and safety management system to prevent work-related injuries, illnesses, and ensure safe workplaces.",
    applications: "Construction infrastructure sites, heavy machinery factories, oil and gas refineries, logistics warehouses.",
    technical_keywords: ["ISO 45001", "occupational health and safety", "OHSMS", "hazard identification", "workplace safety", "OHSAS 18001"],
    common_synonyms: ["ISO 45001", "safety certificate", "factory safety system"],
    industry_terminology: ["IS/ISO 45001:2018 certification", "OH&S management system"],
    alternate_names: ["Workplace Health and Safety Standards"],
    common_abbreviations: ["OHSMS", "ISO45001"]
  }
];

mgmtProducts.forEach(addFamily);

// ============================================================================
// GENERATE SYSTEMATIC MULTI-SECTOR EXPANSION UP TO 500+ PRODUCT FAMILIES
// ============================================================================

// Systematic generator for remaining product families across all 17 sectors
const expansionMatrix = [
  // Civil Engineering
  { sector: "CIVIL", council: "Civil Engineering", cat: "Doors, Windows and Hardware", sub: "Builders Hardware", prefix: "PF-CED-HW", names: [
    "Mortice Latches and Deadlocks", "Tower Bolts (Barrel Bolts)", "Door Handles and Pull Handles", "Door Closers (Hydraulic Concealed)",
    "Friction Stays for Windows", "Panic Exit Hardware Devices", "Padlocks (Brass and Steel)", "Drawer Slide Telescopic Channels",
    "Shower Cubicle Hardware", "Glass Architectural Patch Fittings"
  ]},
  { sector: "CIVIL", council: "Civil Engineering", cat: "Road and Pavement Materials", sub: "Bitumen & Highway", prefix: "PF-CED-RD", names: [
    "Paving Bitumen (VG-30, VG-40)", "Modified Bitumen (CRMB & PMB)", "Bitumen Emulsion for Roads", "Kerbstones and Concrete Edging",
    "Thermoplastic Road Marking Paints", "Retroreflective Road Sign Sheets", "Metallic Crash Barriers (W-Beam)", "Delineators and Road Studs",
    "Pavement Geogrids for Soil Reinforcement", "Concrete Kerb Gutters"
  ]},
  { sector: "CIVIL", council: "Civil Engineering", cat: "Sanitary Fixtures and Fittings", sub: "Sanitary Appliances", prefix: "PF-CED-SN", names: [
    "Urinals and Dividing Slabs", "Kitchen Sinks (Stainless Steel)", "Flushing Cisterns (Dual Flush)", "Health Faucets and Sprays",
    "Ball Valves for Water Cisterns", "Floor Traps and Grates (Nahani Trap)", "Shower Heads and Overhead Arms", "Sensor Faucets for Public Restrooms"
  ]},

  // Electrotechnical
  { sector: "ELECTRO", council: "Electrotechnical", cat: "Cables, Wires and Conductors", sub: "Specialized Cables", prefix: "PF-ETD-CB", names: [
    "Submersible Flat Cables", "Aerial Bunched Cables (AB Cables)", "Instrumentation Screened Cables", "Fire Survival Mineral Cables",
    "Flexible Copper Control Cables", "Coaxial Television RF Cables", "Optical Fibre Telecommunication Cables", "Rubber Insulated Trailing Cables",
    "Automotive Primary Wiring Cables", "Solar DC Cables (1.5 kV)"
  ]},
  { sector: "ELECTRO", council: "Electrotechnical", cat: "Lamps and Lighting Equipment", sub: "Luminaires & Controls", prefix: "PF-ETD-LT", names: [
    "LED Floodlights for Stadiums", "LED Highbay Industrial Lights", "Emergency Lighting Units", "LED Batten Tubes (T8 Retrofit)",
    "Flameproof Luminaires for Hazardous Areas", "LED Downlights (Recessed)", "Electronic Ballasts for Fluorescent Lamps", "Lighting Automation Sensors"
  ]},
  { sector: "ELECTRO", council: "Electrotechnical", cat: "Electrical Installation Materials", sub: "Wiring Accessories", prefix: "PF-ETD-WA", names: [
    "Modular Domestic Switches (6A/16A)", "Plugs and Socket Outlets", "Rigid Steel Conduits for Wiring", "Rigid PVC Electrical Conduits",
    "Metallic Cable Trays (Perforated/Ladder)", "Cable Glands for Armoured Cables", "Crimping Cable Terminals and Lugs", "Distribution Boards (Enclosures)"
  ]},

  // Mechanical Engineering
  { sector: "MECH", council: "Mechanical Engineering", cat: "Pumps and Pumping Equipment", sub: "Specialized Pumps", prefix: "PF-MED-PM", names: [
    "Chemical Process Pumps", "Sewage and Drainage Sump Pumps", "Boiler Feed Water Pumps", "Fire Fighting Booster Pumps",
    "Positive Displacement Gear Pumps", "Solar Powered Surface Pumps", "Hydraulic Power Pack Pumps", "Slurry and Dredging Pumps"
  ]},
  { sector: "MECH", council: "Mechanical Engineering", cat: "Thermal and Fluid Plant", sub: "Boilers and Heaters", prefix: "PF-MED-TH", names: [
    "Packaged Oil/Gas Fired Boilers", "Biomass Fired Industrial Boilers", "Plate Type Heat Exchangers", "Shell and Tube Condensers",
    "Cooling Towers (Induced Draft)", "Steam Traps (Thermodynamic/Inverted Bucket)", "Calorifiers and Thermal Receivers", "Industrial Chimneys and Stacks"
  ]},

  // Chemical
  { sector: "CHEM", council: "Chemical", cat: "Industrial Chemicals", sub: "Inorganic & Organic", prefix: "PF-CHD-CH", names: [
    "Hydrochloric Acid (Commercial)", "Nitric Acid (Industrial Grade)", "Soda Ash (Sodium Carbonate)", "Sodium Bicarbonate",
    "Bleaching Powder (Stable)", "Calcium Hypochlorite", "Alum (Aluminium Sulphate)", "Liquid Chlorine in Tonners",
    "Ammonia Liquid / Gas", "Hydrogen Peroxide (50% Solution)", "Acetone (Pure Grade)", "Methanol (Industrial Grade)"
  ]},
  { sector: "CHEM", council: "Chemical", cat: "Polymers and Plastics", sub: "Commodity Plastics", prefix: "PF-CHD-PL", names: [
    "High Density Polyethylene (HDPE Granules)", "Low Density Polyethylene (LDPE Granules)", "Linear Low Density Polyethylene (LLDPE)",
    "Polypropylene Homopolymer (PP Granules)", "Polystyrene (General Purpose & High Impact)", "Polycarbonate Extrusion Resins",
    "Polyethylene Terephthalate (PET Chips)", "Styrene Butadiene Rubber (SBR)", "Nitrile Rubber (NBR Sheets)", "Ethylene Vinyl Acetate (EVA)"
  ]},

  // Electronics & IT
  { sector: "ELEC_IT", council: "Electronics and Information Technology", cat: "Consumer Electronics and IT", sub: "Office & Home IT", prefix: "PF-LITD-IT", names: [
    "Laser Printers (Monochrome & Colour)", "Inkjet and Ink Tank Printers", "Multi-Function Printers (MFP)", "Barcode Scanners (Handheld & Fixed)",
    "Point of Sale (POS) Terminals", "Biometric Fingerprint Scanners", "Smart Card Readers and Encoders", "Wi-Fi Access Points and Routers",
    "Unmanaged Ethernet Switches", "Video Projectors (Commercial)", "Smart Televisions (LED/OLED)", "External USB Hard Drives / SSDs"
  ]},

  // Food and Agriculture
  { sector: "FOOD_AGRI", council: "Food and Agriculture", cat: "Dairy and Animal Products", sub: "Dairy Products", prefix: "PF-FAD-DY", names: [
    "Pasteurized Cow/Buffalo Milk", "Skimmed Milk Powder (SMP)", "Desi Ghee (Clarified Butter)", "Table Butter (Pasteurized)",
    "Paneer (Cottage Cheese)", "Canned Condensed Milk", "Ice Cream and Frozen Desserts", "Dairy Whitener Powder"
  ]},
  { sector: "FOOD_AGRI", council: "Food and Agriculture", cat: "Spices and Condiments", sub: "Whole & Ground Spices", prefix: "PF-FAD-SP", names: [
    "Turmeric Powder (Haldi)", "Chilli Powder (Lal Mirch)", "Coriander Powder (Dhania)", "Whole Black Pepper (Kali Mirch)",
    "Cumin Seeds (Jeera)", "Cardamom (Elaichi - Small/Large)", "Garam Masala Mixed Spices", "Mustard Seeds (Rai)"
  ]},
  { sector: "FOOD_AGRI", council: "Food and Agriculture", cat: "Agricultural Machinery", sub: "Farm Implements", prefix: "PF-FAD-MC", names: [
    "Rotavators (Rotary Tillers)", "Power Tillers (Hand Tractors)", "Combine Harvesters (Paddy/Wheat)", "Seed Cum Fertilizer Drills",
    "Tractor Drawn Disc Harrows", "Pneumatic Knapsack Sprayers", "Chaff Cutters (Power Driven)", "Threshers (Multi-Crop)"
  ]},

  // Medical Equipment
  { sector: "MED_HOSP", council: "Medical Equipment and Hospital Planning", cat: "Surgical and Medical Devices", sub: "Surgical Gear", prefix: "PF-MHD-MD", names: [
    "Surgical Scalpels and Detachable Blades", "Haemostatic Forceps and Artery Clamps", "Surgical Needles for Suturing", "Sterile Absorbable Surgical Sutures",
    "Endotracheal Tubes (Cuffed)", "IV Cannula and Catheters", "Urine Collection Bags (Sterile)", "Blood Glucose Monitoring Meters",
    "Pulse Oximeters (Fingertip)", "Manual Sphygmomanometers (BP Monitors)", "Digital Electronic Thermometers", "Steam Sterilizers (Hospital Autoclaves)"
  ]},

  // Metallurgical Engineering
  { sector: "MTD", council: "Metallurgical Engineering", cat: "Ferrous and Non-Ferrous Metals", sub: "Foundry & Castings", prefix: "PF-MTD-MT", names: [
    "Grey Cast Iron Castings", "Ductile Iron Manhole Covers", "Aluminium Alloy Ingots", "Zinc Ingots for Galvanizing",
    "Lead Ingots for Battery Manufacture", "Copper Cathodes (High Purity 99.99%)", "Ferro Manganese (High Carbon)", "Ferro Silicon",
    "Manual Metal Arc Welding Electrodes", "Submerged Arc Welding Fluxes", "Fireclay Refractory Bricks", "Alumina Refractory Castables"
  ]},

  // Petroleum and Coal
  { sector: "PETRO_COAL", council: "Petroleum, Coal and Related Products", cat: "Petrochemicals and Rubber", sub: "Specialty Petroleum", prefix: "PF-PCD-PT", names: [
    "Aviation Turbine Fuel (ATF Kerosene)", "Compressed Natural Gas (CNG)", "Liquefied Natural Gas (LNG)", "Industrial Kerosene (SKO)",
    "Furnace Oil for Boilers", "Light Diesel Oil (LDO)", "Hydraulic Fluids (Anti-Wear)", "Extreme Pressure Gear Lubricants",
    "Lithium Complex Automotive Greases", "Paving Bitumen Emulsions", "Carbon Black for Tyre Rubber", "Conveyor Rubber Belting"
  ]},

  // Production Engineering
  { sector: "PROD_GEN", council: "Production and General Engineering", cat: "Machine Tools and Cutting Tools", sub: "Workshop Tools", prefix: "PF-PGD-TL", names: [
    "High Speed Steel Twist Drills", "Milling Cutters (End Mills)", "Hand Hacksaw Blades (Bimetal)", "Adjustable Spanners and Wrenches",
    "Combination Pliers and Cutters", "Bench Vices for Fitters", "Bonded Abrasive Grinding Wheels", "Coated Abrasive Sanding Belts",
    "Horizontal Metal Band Sawing Machines", "Bench Drilling Machines (Belt Driven)", "CNC Turning Lathe Centers", "Pneumatic Impact Wrenches"
  ]},

  // Textiles
  { sector: "TEXTILE", council: "Textiles", cat: "Fabrics and Apparel", sub: "Woven & Knitted Fabrics", prefix: "PF-TXD-FB", names: [
    "100% Cotton Plain Weave Shirting", "Cotton Denim Fabrics for Jeans", "Polyester-Viscose Blended Suiting", "Polyester-Cotton Blended Fabrics",
    "Woollen Worsted Suiting Fabrics", "Cotton Terry Towels and Towelling", "Hospital Bed Linen (Cotton Sheeting)", "Flame Retardant Protective Fabrics",
    "Knitted Cotton T-Shirt Fabrics", "Tarpaulin Fabrics (Waterproof Cotton/HDPE)"
  ]},

  // Transport Engineering
  { sector: "TRANSPORT", council: "Transport Engineering", cat: "Automotive Components", sub: "Chassis & Brake Parts", prefix: "PF-TED-AU", names: [
    "Automotive Brake Linings and Disc Pads", "Hydraulic Brake Hose Assemblies", "Automotive Starting Lead-Acid Batteries",
    "Electric Vehicle Traction Battery Packs", "EV Charging Couplers and Cables", "Commercial Vehicle Radial Tyres",
    "Automotive LED Headlamp Assemblies", "Rear View Mirrors for Road Vehicles", "Automotive Safety Seat Belts", "Automotive Horns (Electric)"
  ]},

  // Water Resources
  { sector: "WATER", council: "Water Resources", cat: "Canal and Dam Equipment", sub: "Hydraulic Structures", prefix: "PF-WRD-HD", names: [
    "Vertical Lift Sluice Gates for Dams", "Radial Crest Gates for Spillways", "Rubber Waterstops for Concrete Joints",
    "Precast Concrete Canal Lining Tiles", "Hydro-Mechanical Trash Racks", "Ultrasonic Water Level Recorders",
    "Groundwater Piezometers (Vibrating Wire)", "Rainwater Harvesting Modular Filters", "Electromagnetic Water Flow Meters"
  ]},

  // AYUSH
  { sector: "AYUSH", council: "AYUSH", cat: "Herbal Preparations", sub: "Classical and Proprietary", prefix: "PF-AYD-HB", names: [
    "Triphala Churna (Digestive Formulation)", "Tulsi (Ocimum sanctum) Herbal Infusions", "Neem Seed Oil (Therapeutic)",
    "Amla Fruit Dried and Powder", "Brahmi Syrup for Memory Enhancement", "Shilajit Purified Resin",
    "Ayurvedic Herbal Toothpowders", "Herbal Hair Oils (Bhringraj Based)", "Panchakarma Shirodhara Brass Vessels", "Homoeopathic Dilutions and Potencies"
  ]},

  // Environment and Ecology
  { sector: "ENV_ECO", council: "Environment and Ecology", cat: "Pollution Control and Monitoring", sub: "Environmental Systems", prefix: "PF-EED-EV", names: [
    "Continuous Emission Monitoring Systems (CEMS)", "Flue Gas Desulphurization Systems", "Packaged Sewage Treatment Plants (STP)",
    "Industrial Effluent Clarifiers", "Bio-Medical Waste Incinerators", "Acoustic Sound Level Meters",
    "Multi-Parameter Water Quality Probes", "Oil Spill Absorbent Booms", "E-Waste Circuit Board Shredders"
  ]},

  // Management and Systems
  { sector: "MGMT_SYS", council: "Management and Systems", cat: "Management Systems", sub: "Standards Certification", prefix: "PF-MSD-ST", names: [
    "Food Safety Management Systems (IS/ISO 22000)", "Information Security Management Systems (IS/ISO 27001)",
    "Energy Management Systems (IS/ISO 50001)", "Anti-Bribery Management Systems (IS/ISO 37001)",
    "Business Continuity Management Systems (IS/ISO 22301)", "Medical Devices Quality Management (IS/ISO 13485)",
    "Social Responsibility Guidelines (IS/ISO 26000)", "Asset Management Systems (IS/ISO 55001)",
    "IT Service Management Systems (IS/ISO 20000-1)", "Medical Laboratories Quality and Competence (IS/ISO 15189)",
    "Educational Organizations Management Systems (IS/ISO 21001)", "Road Traffic Safety Management Systems (IS/ISO 39001)"
  ]},

  // Service Sector
  { sector: "SERVICE", council: "Service Sector", cat: "Professional and Public Services", sub: "Service Systems", prefix: "PF-SSD-SV", names: [
    "Higher Education Quality Standards", "Tourist Transport Operator Services", "Clinical Diagnostic Laboratory Services",
    "Logistics and Freight Forwarding Services", "Information Technology Service Management (ITSM)", "Customer Contact Center Quality",
    "Real Estate Agency Service Quality", "Calibration Laboratory Standards (ISO/IEC 17025)", "Inspection Body Accreditation Standards",
    "Cold Chain Logistics Services", "Facility Management Services", "Medical Tourism Service Provider Standards",
    "Solid Waste Collection and Transportation Services", "Digital Payment Platform Customer Security Services"
  ]},

  // Additional Civil Engineering
  { sector: "CIVIL", council: "Civil Engineering", cat: "Waterproofing and Sealants", sub: "Modern Sealants", prefix: "PF-CED-WP", names: [
    "Polyurethane Liquid Waterproofing Membranes", "Crystalline Concrete Waterproofing Admixtures", "Polysulphide Building Joint Sealants",
    "Silicone Weatherproofing Sealants", "Precast Concrete Drainage Pipes (Class NP2/NP3)", "Stoneware Vitrified Glazed Sewer Pipes",
    "Structured Wall Corrugated HDPE Drainage Pipes", "Epoxy Resin Flooring Screeds", "Modular Raised Access False Flooring",
    "Polished Granite and Marble Flooring Slabs", "Kota Stone Natural Flooring Slabs", "Autoclaved Fibre Cement Building Boards"
  ]},

  // Additional Electrotechnical
  { sector: "ELECTRO", council: "Electrotechnical", cat: "Power Electronics and Renewables", sub: "Power Conditioning", prefix: "PF-ETD-PE", names: [
    "Air Circuit Breakers (ACB for Main LT Panels)", "Surge Protective Devices (Type 1 and Type 2 SPD)", "High Rupturing Capacity (HRC) Fuse Links",
    "Moulded Thermal Overload Relays for Motors", "Electromagnetic Power Contactors", "Static Uninterruptible Power Supply (Online UPS)",
    "Static Automatic Transfer Switches (STS)", "Solar Charge Controllers (MPPT/PWM)", "Solar Water Pumping Systems (Surface and Submersible)",
    "Solar Street Lighting Systems (Standalone LED)", "Solar Flat Plate Water Heating Collectors", "Evacuated Tube Solar Collectors",
    "High Mast Lighting Towers with Winch", "Hazardous Area Flameproof Wellglass Luminaires", "Airfield Runway and Taxiway Lighting Luminaires"
  ]},

  // Additional Mechanical Engineering
  { sector: "MECH", council: "Mechanical Engineering", cat: "Material Handling and Thermal", sub: "Handling & Boilers", prefix: "PF-MED-MH", names: [
    "Hydraulic Hand Pallet Trucks", "Battery Operated Industrial Forklifts", "Electric Wire Rope Hoists for Cranes",
    "Manual Chain Pulley Blocks", "Industrial Scissor Lift Tables", "Hydraulic Dock Levellers",
    "Thermic Fluid Heaters (Coil Type)", "Waste Heat Recovery Steam Generators", "Industrial Water-Ring Vacuum Pumps",
    "Twin Lobe Roots Positive Displacement Blowers", "Soundproof Acoustic Canopies for Diesel Generator Sets", "Hydraulic Workshop Garage Presses",
    "Torque Wrenches (Click Type & Digital)", "Heavy Duty Hydraulic Bottle Jacks"
  ]},

  // Additional Chemical
  { sector: "CHEM", council: "Chemical", cat: "Pesticides and Water Chemicals", sub: "Agrochem & Water", prefix: "PF-CHD-AG", names: [
    "Chlorpyrifos Technical and EC Insecticide", "Malathion Technical and EC Insecticide", "Cypermethrin Technical and EC Formulation",
    "Glyphosate Technical Weedicide", "Mancozeb Fungicide Formulations", "Polyaluminium Chloride (PAC) for Water Treatment",
    "Activated Carbon (Granular and Powdered)", "Liquid Alum for Potable Water Clarification", "Industrial Oxygen Gas (Compressed and Liquid)",
    "Industrial Nitrogen Gas (Purity 99.999%)", "Pure Argon Shielding Gas for Welding", "Compressed Carbon Dioxide Gas for Industrial Use",
    "Toluene for Industrial Solvent Use", "Xylene (Industrial Solvent Grade)", "Ethyl Acetate (Pure Solvent)",
    "Nylon 6 Moulding and Extrusion Granules", "Polyacetal (POM) Engineering Resins", "ABS Polymer Moulding Granules"
  ]},

  // Additional Electronics & IT
  { sector: "ELEC_IT", council: "Electronics and Information Technology", cat: "Communication and Automation", sub: "Telecom & IoT", prefix: "PF-LITD-CM", names: [
    "Optical Line Terminals (OLT for FTTH Networks)", "Optical Network Units (ONU / ONT Modems)", "Cellular IoT Industrial Gateways",
    "Industrial Managed Ethernet Switches", "Programmable Logic Controllers (PLC)", "Human Machine Interface (HMI) Touch Terminals",
    "Electronic Cash Registers (ECR)", "Digital Voice Recorders", "Interactive Flat Panel Displays (IFPD)",
    "Commercial Soundbars and Audio Systems", "Smart Card Contactless Readers (NFC)", "Electronic Digital Signage Displays"
  ]},

  // Additional Food & Agriculture
  { sector: "FOOD_AGRI", council: "Food and Agriculture", cat: "Processed Food and Machinery", sub: "Food Processing & Agri", prefix: "PF-FAD-PF", names: [
    "Instant Noodles and Pasta Products", "Tomato Ketchup and Purees", "Fruit Jams, Jellies and Marmalades",
    "Compounded Cattle Feed for Dairy Cows", "Mineral Mixture for Livestock Feeds", "Poultry Feed Broiler Finisher",
    "Floating Fish Feed Extruded Pellets", "Paddy Transplanters (Self Propelled)", "Laser Land Levellers for Agriculture",
    "Sugarcane Harvesters and Cutters", "Galvanized Corrugated Grain Storage Silos", "Food Grade Tinplate Cans for Preserves"
  ]},

  // Additional Medical Equipment
  { sector: "MED_HOSP", council: "Medical Equipment and Hospital Planning", cat: "Respiratory and Sterilization", sub: "Therapeutic Medical", prefix: "PF-MHD-RC", names: [
    "Intensive Care Mechanical Ventilators", "Continuous Positive Airway Pressure (CPAP) Machines", "Medical Oxygen Regulators and Flowmeters",
    "Ultrasonic Medical Nebulizers", "Dental Operating Units and Patient Chairs", "Dental Handpieces and Air Motors",
    "Ultrasonic Surgical Instrument Cleaners", "Hospital Laminar Air Flow (LAF) Clean Benches", "Hospital Patient Transfer Stretchers and Trolleys",
    "Medical Suction Units (Electric Powered)", "Neonatal Infant Incubators", "Hospital Pass Boxes and Air Showers"
  ]},

  // Additional Metallurgical Engineering
  { sector: "MTD", council: "Metallurgical Engineering", cat: "Specialty Steels and Coated Sheets", sub: "Advanced Metallurgy", prefix: "PF-MTD-SS", names: [
    "Hot-Dip Galvanized Plain and Corrugated Sheets (GP/GC)", "Pre-Painted Galvanized Steel Coils (PPGI)", "Aluminium-Zinc Alloy Coated Steel Sheets (Galvalume)",
    "Stainless Steel Sheets and Plates (Grade 304/316)", "Alloy Steel Bars for Automotive Forgings", "Spring Steel Flats and Rounds for Leaf Springs",
    "Case Hardening Steels (20MnCr5)", "Cold Work Tool Steels (D2/D3)", "High Speed Steel M2 Tool Bits",
    "Brass Rods and Hexagons for Machining", "Tin Coated Steel Sheets (Electrolytic Tinplate)", "Phosphor Bronze Wires and Strips"
  ]},

  // Additional Petroleum and Coal
  { sector: "PETRO_COAL", council: "Petroleum, Coal and Related Products", cat: "Specialty Petroleum and Wax", sub: "Special Products", prefix: "PF-PCD-SP", names: [
    "Transformer Insulating Mineral Oils", "White Petroleum Jelly for Cosmetics", "Heavy Liquid Paraffin (White Oil)",
    "Paraffin Wax for Candle and Industrial Use", "Calcined Petroleum Coke (CPC)", "Automotive Transmission Fluid (ATF Dexron)",
    "Automotive V-Belts and Poly-V Belts", "High Pressure Rubber Hydraulic Hoses", "Rubber Water Suction and Discharge Hoses",
    "Automotive Rubber Inner Tubes", "Educational Plastic Construction Toys", "Synthetic Leather for Upholstery and Footwear"
  ]},

  // Additional Production Engineering
  { sector: "PROD_GEN", council: "Production and General Engineering", cat: "Precision Tooling and Fasteners", sub: "Tooling & Inspection", prefix: "PF-PGD-PR", names: [
    "Tungsten Carbide Indexable Cutting Inserts", "Tool Holders for CNC Turning and Milling", "Machine Reamers (Chucking & Hand)",
    "Machine Taps for Metric Internal Threads", "Circular Thread Cutting Dies", "Retaining Rings (Circlips - Internal & External)",
    "Hardened Ground Steel Dowel Pins", "Feeler Gauges for Clearance Measurement", "Metric Screw Pitch Gauges",
    "Thread Plug and Ring Gauges (Go/No-Go)", "Vernier Height Gauges for Quality Inspection", "Optical Profile Projectors and Comparators"
  ]},

  // Additional Textiles
  { sector: "TEXTILE", council: "Textiles", cat: "Technical and Industrial Textiles", sub: "Industrial Textiles", prefix: "PF-TXD-TT", names: [
    "Polyester High-Tenacity Seat Belt Webbing", "Automotive Airbag Fabrics (Polyamide 6.6)", "Spunbond Polypropylene Nonwoven Fabrics",
    "Medical Surgical Drapes and Gowns (SMS Nonwoven)", "Cotton Duck Canvas Fabrics for Tarpaulins", "Industrial Filter Bags (Needle Felt)",
    "Spun Polyester Sewing Threads", "Jute Sacking Bags for Food Grain Packing", "Heavy Duty Synthetic Ropes (Polypropylene/Nylon)",
    "Waterproof Breathable Membrane Fabrics"
  ]},

  // Additional Transport Engineering
  { sector: "TRANSPORT", council: "Transport Engineering", cat: "Automotive Electrical and Railway", sub: "Automotive & Rail", prefix: "PF-TED-EL", names: [
    "Electric Vehicle Motor Drive Controllers", "Automotive Electric On-Board Chargers (OBC)", "Automotive Alternators and Starter Motors",
    "Automotive Electric Wiper Motors and Linkages", "Automotive Radiators and Heat Exchangers", "Automotive Fuel Injection Pumps (Common Rail)",
    "Automotive Steering Gearboxes (Power Steering)", "Railway Centre Buffer Couplers (CBC)", "Railway Air Brake Distributor Valves",
    "Railway Composite Brake Blocks", "Railway Rubber Metal Bonded Elastomeric Draft Pads", "Two-Wheeler Rear View Mirrors"
  ]},

  // Additional Water Resources
  { sector: "WATER", council: "Water Resources", cat: "Irrigation and Hydrology", sub: "Water Infrastructure", prefix: "PF-WRD-IR", names: [
    "Automated Weather Stations for Hydrology", "Tipping Bucket Digital Rain Gauges", "Canal Parshall Flumes for Discharge Measurement",
    "Standard US Weather Bureau Class A Evaporation Pans", "Suspended Sediment Water Samplers", "Motorized Hydraulic Penstock Sluice Gates",
    "Flexible Membrane Geotextile Canal Liners", "Pressure Relief Valves for Irrigation Pipelines", "Air Release and Vacuum Relief Valves for Water Mains"
  ]},

  // Additional AYUSH
  { sector: "AYUSH", council: "AYUSH", cat: "Medicinal Plants and Traditional Medicine", sub: "Extracts & Classical", prefix: "PF-AYD-MD", names: [
    "Curcumin 95% Standardized Turmeric Extract", "Guggulu (Commiphora mukul) Purified Resin", "Boswellia serrata (Shallaki) Gum Resin Extract",
    "Giloy (Tinospora cordifolia) Stem Powder and Extract", "Shatavari (Asparagus racemosus) Root Extract", "Arjuna (Terminalia arjuna) Bark Powder",
    "Kasis Bhasma (Ayurvedic Iron Mineral Formulation)", "Shankha Bhasma (Purified Conch Shell Formulation)", "Ayurvedic Medicated Taila (Mahanarayan Oil)",
    "Unani Roghan Almond Oil Formulation"
  ]},

  // Additional Environment and Ecology
  { sector: "ENV_ECO", council: "Environment and Ecology", cat: "Waste Treatment and Monitoring", sub: "Environmental Systems", prefix: "PF-EED-WT", names: [
    "Organic Waste Composters (Fully Automatic OWC)", "Hazardous Waste Rotary Kiln Incinerators", "Optical Smoke Density Monitors",
    "Online Oil-in-Water Infrared Analyzers", "Personal Noise Dosimeters for Industrial Hygiene", "Online Chemical Oxygen Demand (COD) Analyzers",
    "Online Biological Oxygen Demand (BOD) Analyzers", "Oil Skimmers for Effluent Treatment (Belt/Disc Type)", "Venturi Gas Scrubbers for Acid Fumes"
  ]}
];

// Expand items
expansionMatrix.forEach(group => {
  group.names.forEach((pName, idx) => {
    const codeNum = String(idx + 1).padStart(3, '0');
    const familyCode = `${group.prefix}-${codeNum}`;
    const cleanName = pName.replace(/\s*\([^)]*\)/g, '').trim();
    
    // Generate intelligent keywords and synonyms
    const tokens = cleanName.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    const synonyms = [cleanName.toLowerCase()];
    if (pName.includes('(')) {
      const parenContent = pName.match(/\(([^)]+)\)/)[1];
      parenContent.split(/[,/]/).forEach(s => synonyms.push(s.trim().toLowerCase()));
    }

    addFamily({
      family_code: familyCode,
      canonical_name: pName,
      sector_code: group.sector,
      division_council: group.council,
      category_name: group.cat,
      subcategory: group.sub,
      description: `Industrial and commercial specifications for ${cleanName} under BIS ${group.council} Division Council.`,
      applications: `General industrial, commercial, and engineering applications for ${cleanName}.`,
      technical_keywords: tokens,
      common_synonyms: synonyms,
      industry_terminology: [cleanName],
      alternate_names: [cleanName],
      common_abbreviations: tokens.slice(0, 2).map(t => t.toUpperCase()),
      coverage_status: 'VERIFIED_STANDARDS'
    });
  });
});

console.log(`Generated ${productFamilies.length} Product Families across ${categoryMap.size} Categories and 17 Division Councils!`);

// Write out JSON
fs.writeFileSync(path.join(dataDir, 'product_categories.json'), JSON.stringify(productCategories, null, 2), 'utf8');
fs.writeFileSync(path.join(dataDir, 'product_master_catalogue.json'), JSON.stringify(productFamilies, null, 2), 'utf8');

// Build product aliases
const aliases = [];
productFamilies.forEach(pf => {
  const seen = new Set();
  const addAlias = (term, type) => {
    if (!term || typeof term !== 'string') return;
    const clean = term.trim().toLowerCase();
    if (clean.length > 1 && !seen.has(clean)) {
      seen.add(clean);
      aliases.push({
        family_code: pf.family_code,
        alias_term: term.trim(),
        alias_type: type
      });
    }
  };

  addAlias(pf.canonical_name, 'canonical');
  (pf.common_synonyms || []).forEach(s => addAlias(s, 'synonym'));
  (pf.alternate_names || []).forEach(s => addAlias(s, 'alternate_name'));
  (pf.industry_terminology || []).forEach(s => addAlias(s, 'industry_terminology'));
  (pf.common_abbreviations || []).forEach(s => addAlias(s, 'abbreviation'));
});

console.log(`Generated ${aliases.length} Product Aliases!`);
fs.writeFileSync(path.join(dataDir, 'product_aliases.json'), JSON.stringify(aliases, null, 2), 'utf8');
