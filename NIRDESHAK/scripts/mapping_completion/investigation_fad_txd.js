/**
 * investigation_fad_txd.js
 * Comprehensive regulatory and technical investigation for:
 * FAD: 71 products
 * TXD: 46 products
 * Total: 117 products
 */

const FAD_TXD_INVESTIGATION = [
  {
    "canonical_name": "Black Pepper Whole Malabar Garbled",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 1798:2020",
    "new_standard": {
      "is_number": "IS 1798:2020",
      "title": "Black Pepper, Whole and Ground — Specification",
      "publication_year": 2020,
      "version": "Third Revision",
      "status": "ACTIVE",
      "technical_committee": "FAD 9",
      "division_council": "Food and Agriculture",
      "scope": "Specifies requirements for dried berries of Piper nigrum (black pepper) in whole (garbled and ungarbled) and ground powder forms.",
      "materials": "Dried mature berries of Piper nigrum L.",
      "technical_requirements": "Extraneous matter (max 0.5% for garbled), light berries (max 2.0%), pinheads, moisture (max 12.0%), total ash, piperine content (min 4.0%), non-volatile ether extract.",
      "performance_requirements": "Pungent characteristic aroma, zero mould growth, freedom from mineral oil coating.",
      "testing_requirements": "Moisture per IS 1797, piperine by HPLC per ISO 5564, total ash per IS 1797.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 9 / Spices Board of India"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "Spices Board Export Regulations; AGMARK Black Pepper Grading Rules",
      "source_url": "https://www.indianspices.com",
      "evidence_excerpt": "Malabar garbled black pepper grading and quality specifications conform to IS 1798.",
      "applicability_explanation": "Primary national standard for whole black pepper.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by FAD 9 Spices and Condiments committee."
  },
  {
    "canonical_name": "Canned Alphonso Mango Fruit Pulp",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 3882:1979",
    "new_standard": {
      "is_number": "IS 3882:1979",
      "title": "Canned Mango Pulp — Specification",
      "publication_year": 1979,
      "version": "First Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "FAD 10",
      "division_council": "Food and Agriculture",
      "scope": "Specifies requirements for canned mango pulp prepared from sound ripe fruits of mango varieties (Alphonso, Totapuri, Kesar).",
      "materials": "Extracted mango fruit pulp packed in hermetically sealed sanitary tinplate cans.",
      "technical_requirements": "Total soluble solids TSS (min 19.0 Brix for Alphonso), acidity as citric acid (0.3% to 0.8%), vacuum in can (min 100 mm Hg), headspace (max 10%), heavy metals (tin <= 250 ppm, lead <= 1.0 ppm).",
      "performance_requirements": "Characteristic bright orange-yellow colour and natural aroma; commercial sterility (zero viable thermophilic or mesophilic spores).",
      "testing_requirements": "TSS by refractometer, acidity per IS 2860, incubation sterility test at 37°C and 55°C per IS 2860.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 10 / APEDA Processed Food Guidelines"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "APEDA Export Standards for Canned Mango Pulp; FSSAI Fruit Products Regulations",
      "source_url": "https://apeda.gov.in",
      "evidence_excerpt": "Alphonso mango pulp canning quality and export consignments conform to IS 3882.",
      "applicability_explanation": "Primary national standard for canned mango fruit pulp.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by FAD 10."
  },
  {
    "canonical_name": "Canned Condensed Milk",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 1166:2022",
    "new_standard": {
      "is_number": "IS 1166:2022",
      "title": "Condensed Milk, Partly Skimmed and Skimmed Condensed Milk — Specification",
      "publication_year": 2022,
      "version": "Third Revision",
      "status": "ACTIVE",
      "technical_committee": "FAD 19",
      "division_council": "Food and Agriculture",
      "scope": "Specifies requirements and test methods for sweetened condensed milk and condensed skimmed milk packed in hermetically sealed metal cans.",
      "materials": "Pure cow or buffalo milk concentrated by vacuum evaporation with added refined cane sugar.",
      "technical_requirements": "Milk fat (min 9.0% for sweetened condensed milk), milk solids (min 31.0%), sucrose (min 40.0%), titratable acidity, accelerated storage stability.",
      "performance_requirements": "Smooth velvety texture free from lactose crystals (sandiness); commercial sterility.",
      "testing_requirements": "Fat by Rose-Gottlieb method, total solids by gravimetry, microbiological examination per IS 5402.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 19 / FSSAI Compulsory BIS List"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "FSSAI Mandatory BIS Certification List; FSSAI Dairy Products Regulations",
      "source_url": "https://fssai.gov.in",
      "evidence_excerpt": "Compulsory Scheme-I BIS ISI marking for condensed milk conforming to IS 1166 under FSSAI statutory orders.",
      "applicability_explanation": "Mandatory statutory product specification for canned condensed milk in India.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by FAD 19. Mandatory ISI mark under FSSAI."
  },
  {
    "canonical_name": "Canned Sweet Corn Kernels in Brine",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 14596:1998",
    "new_standard": {
      "is_number": "IS 14596:1998",
      "title": "Canned Sweet Corn — Specification",
      "publication_year": 1998,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "FAD 10",
      "division_council": "Food and Agriculture",
      "scope": "Specifies requirements for canned sweet corn kernels (whole kernel style in brine and cream style) packed in hermetically sealed containers.",
      "materials": "Cut whole kernels of tender sweet corn (Zea mays var. saccharata) in potable water and edible salt brine.",
      "technical_requirements": "Drained weight (min 60% of net water capacity), alcohol-insoluble solids (max 27%), vacuum (min 100 mm Hg), defects (blemished kernels max 2%).",
      "performance_requirements": "Tender crisp kernels, bright yellow colour; commercially sterile.",
      "testing_requirements": "Drained weight per IS 2860, alcohol-insoluble solids per Annex B, sterility test.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 10 / FSSAI"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "FSSAI Processed Vegetables Regulations; BIS FAD 10 Specifications",
      "source_url": "https://fssai.gov.in",
      "evidence_excerpt": "Prescribes requirements for canned whole kernel sweet corn in brine.",
      "applicability_explanation": "Primary national standard for canned sweet corn.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by FAD 10."
  },
  {
    "canonical_name": "Carbonated Fruit Flavored Beverages",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 2346:1992",
    "new_standard": {
      "is_number": "IS 2346:1992",
      "title": "Carbonated Beverages — Specification",
      "publication_year": 1992,
      "version": "Second Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "FAD 14",
      "division_council": "Food and Agriculture",
      "scope": "Specifies requirements and test methods for carbonated beverages (fruit flavoured drinks, colas, ginger ale, soda water).",
      "materials": "Potable water conforming to IS 10500, dissolved carbon dioxide, permitted flavourings, sweeteners, and citric/malic acids.",
      "technical_requirements": "Carbonation volume (gas volume min 1.0 to 4.0 vols), total soluble solids TSS (Brix), pH (2.5 to 4.0), microbiological limits, heavy metals (lead <= 0.5 ppm, arsenic <= 0.25 ppm).",
      "performance_requirements": "Effervescent sparkle; zero coliforms or pathogenic bacteria.",
      "testing_requirements": "Gas volume measurement by manometer per Annex B, Brix by refractometer, microbiological tests per IS 5402.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 14 / FSSAI"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "FSSAI Carbonated Fruit Beverages Regulations; BIS FAD 14 Specifications",
      "source_url": "https://fssai.gov.in",
      "evidence_excerpt": "Prescribes quality and hygiene requirements for commercially bottled carbonated beverages.",
      "applicability_explanation": "Primary national standard for carbonated fruit-flavoured drinks.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by FAD 14."
  },
  {
    "canonical_name": "Cardamom (Elaichi - Small/Large)",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 1907:2020",
    "new_standard": {
      "is_number": "IS 1907:2020",
      "title": "Cardamom (Capsules and Seeds) — Specification",
      "publication_year": 2020,
      "version": "Third Revision",
      "status": "ACTIVE",
      "technical_committee": "FAD 9",
      "division_council": "Food and Agriculture",
      "scope": "Specifies requirements for small cardamom (Elettaria cardamomum Maton) capsules and seeds.",
      "materials": "Dried capsules and seeds of Elettaria cardamomum.",
      "technical_requirements": "Volatile oil content (min 3.5% to 7.0% v/w), empty capsules, immature capsules, moisture (max 11.0%), extraneous matter.",
      "performance_requirements": "Intense aromatic flavour; zero insect infestation or artificial colour addition.",
      "testing_requirements": "Volatile oil determination by steam distillation per IS 1797, moisture per IS 1797.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 9 / Spices Board"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "Spices Board of India Cardamom Rules; AGMARK Grading Rules",
      "source_url": "https://www.indianspices.com",
      "evidence_excerpt": "Prescribes quality and grading criteria for small cardamom capsules.",
      "applicability_explanation": "Primary national standard for small cardamom capsules and seeds.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by FAD 9."
  },
  {
    "canonical_name": "Chaff Cutters (Power Driven)",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 7897:2019",
    "new_standard": {
      "is_number": "IS 7897:2019",
      "title": "Agricultural Machinery — Chaff Cutter (Power Driven) — Safety and Performance Requirements",
      "publication_year": 2019,
      "version": "Second Revision",
      "status": "ACTIVE",
      "technical_committee": "FAD 11",
      "division_council": "Food and Agriculture",
      "scope": "Specifies safety and performance requirements for power-driven chaff cutters used for chopping green and dry fodder for livestock.",
      "materials": "Steel frame, feed rollers, cutting flywheel with tempered blades, safety reverse-gear mechanism.",
      "technical_requirements": "Throughput capacity (t/h), power consumption, cutting blade hardness (45 to 52 HRC), mandatory safety chute length (min 900 mm preventing hands reaching feed rollers), emergency stop lever, warning markings.",
      "performance_requirements": "Elimination of operator hand amputation accidents; uniform chop length.",
      "testing_requirements": "Safety distance measurement per Annex A, blade hardness per IS 1586, continuous operation test per IS 7897.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 11 / Ministry of Agriculture Safety Directives"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Ministry of Agriculture Chaff Cutter Safety Guidelines; SMAM Subsidy Testing Norms",
      "source_url": "https://farmech.gov.in",
      "evidence_excerpt": "Mandatory compliance with safety features and feeding chute dimensions of IS 7897 for all power chaff cutters.",
      "applicability_explanation": "Mandatory statutory safety and performance standard for power chaff cutters.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by FAD 11. Mandatory operator safety code."
  },
  {
    "canonical_name": "Chilli Powder (Lal Mirch)",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 2445:2017",
    "new_standard": {
      "is_number": "IS 2445:2017",
      "title": "Chilli Powder — Specification",
      "publication_year": 2017,
      "version": "Second Revision",
      "status": "ACTIVE",
      "technical_committee": "FAD 9",
      "division_council": "Food and Agriculture",
      "scope": "Prescribes requirements and test methods for chilli powder obtained by grinding clean dried ripe fruits of Capsicum annuum or Capsicum frutescens.",
      "materials": "Ground dried chillies without added colouring matter or foreign starch.",
      "technical_requirements": "Moisture (max 10.0%), total ash (max 8.0%), acid insoluble ash (max 1.25%), non-volatile ether extract (min 12.0%), capsaicin content, crude fibre (max 28.0%).",
      "performance_requirements": "Pungent fiery taste; zero Sudan dye contamination (Sudan I, II, III, IV absent).",
      "testing_requirements": "Capsaicin by HPLC, total ash per IS 1797, test for artificial colour per FSSAI manual.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 9 / FSSAI"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "FSSAI Food Safety and Standards (Food Products Standards) Regulations; AGMARK",
      "source_url": "https://fssai.gov.in",
      "evidence_excerpt": "Prescribes compositional and purity parameters for ground chilli powder.",
      "applicability_explanation": "Primary national standard for chilli powder.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by FAD 9."
  },
  {
    "canonical_name": "Cold-Extracted Extra Virgin Olive Oil",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 15686:2006",
    "new_standard": {
      "is_number": "IS 15686:2006",
      "title": "Olive Oil — Specification",
      "publication_year": 2006,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "FAD 4",
      "division_council": "Food and Agriculture",
      "scope": "Specifies requirements for virgin olive oil (Extra Virgin and Virgin), refined olive oil, and olive pomace oil.",
      "materials": "Oil obtained solely from fruit of Olea europaea L. by mechanical cold extraction.",
      "technical_requirements": "Free fatty acids as oleic acid (max 0.8% for extra virgin), peroxide value (max 20 meq O2/kg), fatty acid composition (oleic acid 55% to 83%), sterol profile, absorbance in UV (K270 <= 0.22, delta K <= 0.01).",
      "performance_requirements": "Fruit-like aroma, slight peppery bitterness; zero refined oil or solvent-extracted pomace oil blending.",
      "testing_requirements": "Fatty acid methyl esters by GC per ISO 12966, peroxide value per IS 548, UV absorbance per Annex B.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 4 / FSSAI"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "FSSAI Edible Oils Regulations; BIS FAD 4 Specifications",
      "source_url": "https://fssai.gov.in",
      "evidence_excerpt": "Prescribes purity and chemical criteria for cold extracted extra virgin olive oil.",
      "applicability_explanation": "Primary national standard for olive oil.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by FAD 4."
  },
  {
    "canonical_name": "Cold-Pressed Kachi Ghani Mustard Oil",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 546:1975",
    "new_standard": {
      "is_number": "IS 546:1975",
      "title": "Mustard Oil — Specification",
      "publication_year": 1975,
      "version": "Second Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "FAD 4",
      "division_council": "Food and Agriculture",
      "scope": "Specifies requirements and test methods for cold-pressed (kachi ghani) and expeller mustard oil obtained from Brassica juncea or Brassica campestris seeds.",
      "materials": "Raw cold-expressed oil from mustard seeds.",
      "technical_requirements": "Refractive index at 40°C (1.4646 to 1.4662), saponification value (169 to 177), iodine value (98 to 112), acid value (max 4.0 for raw kachi ghani), Bellier turbidity temperature, allyl isothiocyanate content (0.25% to 0.60%).",
      "performance_requirements": "Characteristic pungent aroma; negative tests for argemone oil, mineral oil, and castor oil.",
      "testing_requirements": "Argemone test per IS 548 (Part 2), Baudouin test per IS 548, acid value per IS 548 (Part 1).",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 4 / AGMARK Mustard Oil Rules"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "AGMARK Mustard Oil Grading Rules; FSSAI Edible Oils Regulations",
      "source_url": "https://dmi.gov.in",
      "evidence_excerpt": "Kachi Ghani grade 1 mustard oil conforms to IS 546 and AGMARK Special Grade.",
      "applicability_explanation": "Primary national standard for cold-pressed mustard oil.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by FAD 4."
  },
  {
    "canonical_name": "Combine Harvester Rubber Crawler Tracks",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 16298:2015",
    "new_standard": {
      "is_number": "IS 16298:2015",
      "title": "Agricultural Machinery — Rubber Tracks for Crawlers — Specification",
      "publication_year": 2015,
      "version": "Original Edition (Reaffirmed 2020)",
      "status": "ACTIVE",
      "technical_committee": "FAD 11",
      "division_council": "Food and Agriculture",
      "scope": "Specifies requirements, dimensions and test methods for endless rubber crawler tracks used on paddy combine harvesters and agricultural crawler tractors.",
      "materials": "Abrasion-resistant vulcanized rubber compound reinforced with continuous high-tensile steel cord helix and embedded forged steel guide lugs.",
      "technical_requirements": "Track pitch, width, lug height, carcass tensile breaking force, rubber-to-metal bonding adhesion, mud-ejection tread pattern.",
      "performance_requirements": "Exceptional flotation on swampy paddy soils (ground contact pressure <= 25 kPa); zero track de-tracking under heavy turning loads.",
      "testing_requirements": "Tensile strength test of steel carcass, peel adhesion test per IS 3400, field durability test.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 11 Farm Machinery Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "FMTTI Agricultural Machinery Test Guidelines; BIS FAD 11",
      "source_url": "https://farmech.gov.in",
      "evidence_excerpt": "Prescribes dimensional and strength specifications for rubber crawler tracks used on combine harvesters.",
      "applicability_explanation": "Primary national standard for combine harvester rubber tracks.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by FAD 11."
  },
  {
    "canonical_name": "Combine Harvesters (Paddy/Wheat)",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 15806:2008",
    "new_standard": {
      "is_number": "IS 15806:2008",
      "title": "Agricultural Tractors and Other Self-Propelled Machines — Combine Harvester — Test Code",
      "publication_year": 2008,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "FAD 11",
      "division_council": "Food and Agriculture",
      "scope": "Specifies test codes and performance evaluation for self-propelled wheeled and track-type combine harvesters for harvesting paddy and wheat.",
      "materials": "Heavy structural steel frame, diesel engine, cutter bar reel, threshing cylinder, concave, straw walkers, grain cleaning sieves.",
      "technical_requirements": "Cutter bar width, grain throughput capacity (t/h), grain loss limits (cutter bar loss <= 1%, unthreshed loss <= 0.5%, blower loss <= 0.5%), grain damage/breakage (max 2.0%), operator cab safety ROPS.",
      "performance_requirements": "High harvesting efficiency with clean grain bin output; compliance with CMVR road safety regulations.",
      "testing_requirements": "FMTTI field test code: 25 hours continuous harvesting test, grain loss evaluation per Annex B.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 11 / Ministry of Agriculture SMAM"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Ministry of Agriculture SMAM Guidelines; FMTTI Test Protocol",
      "source_url": "https://farmech.gov.in",
      "evidence_excerpt": "All combine harvesters sold in India must undergo mandatory commercial testing conforming to IS 15806.",
      "applicability_explanation": "Mandatory statutory performance and testing code for combine harvesters in India.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by FAD 11. Mandatory for commercial sale and agricultural subsidy."
  },
  {
    "canonical_name": "Compounded Cattle Feed for Dairy Cows",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 2052:2009",
    "new_standard": {
      "is_number": "IS 2052:2009",
      "title": "Compounded Feeds for Cattle — Specification",
      "publication_year": 2009,
      "version": "Fourth Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "FAD 5",
      "division_council": "Food and Agriculture",
      "scope": "Specifies requirements and test methods for compounded cattle feeds (Type I and Type II) in mash or pellet form for milk-producing cows and buffaloes.",
      "materials": "Grains, oilseed cakes (mustard, soy, cotton), wheat bran, molasses, mineral mixture, and vitamins.",
      "technical_requirements": "Crude protein (min 20.0% for Type I / 18.0% for Type II), crude fat (min 2.5% to 3.0%), crude fibre (max 12.0%), acid insoluble ash (max 3.0%), aflatoxin B1 (max 20 ppb), urea (max 1.0%).",
      "performance_requirements": "High palatability, promotes lactation milk yield; zero pathogenic Salmonella or toxic castor pomace.",
      "testing_requirements": "Crude protein by Kjeldahl per IS 7874 (Part 1), aflatoxin by HPLC/ELISA per IS 13426.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 5 / Department of Animal Husbandry and Dairying (DAHD)"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "DPIIT / DAHD Compounded Cattle Feeds (Quality Control) Order; National Dairy Development Board",
      "source_url": "https://dahd.nic.in",
      "evidence_excerpt": "Compulsory Scheme-I ISI marking for compounded cattle feeds conforming to IS 2052 across commercial dairy feed mills.",
      "applicability_explanation": "Mandatory statutory product specification for dairy cow compounded cattle feeds.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by FAD 5. Mandatory ISI mark under DAHD Quality Control Order."
  },
  {
    "canonical_name": "Coriander Powder (Dhania)",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 2444:2020",
    "new_standard": {
      "is_number": "IS 2444:2020",
      "title": "Coriander Powder — Specification",
      "publication_year": 2020,
      "version": "Second Revision",
      "status": "ACTIVE",
      "technical_committee": "FAD 9",
      "division_council": "Food and Agriculture",
      "scope": "Prescribes requirements and test methods for coriander powder obtained by grinding clean dried mature fruits of Coriandrum sativum L.",
      "materials": "Ground mature dried fruits of Coriandrum sativum.",
      "technical_requirements": "Moisture (max 9.0%), total ash (max 7.0%), acid insoluble ash (max 1.5%), volatile oil (min 0.25% v/w), non-volatile ether extract.",
      "performance_requirements": "Distinct pleasant aromatic odour; zero mould, insect fragments, or added starch.",
      "testing_requirements": "Volatile oil by distillation, moisture and ash per IS 1797.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 9 / FSSAI"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "FSSAI Food Product Standards; AGMARK Coriander Powder Rules",
      "source_url": "https://fssai.gov.in",
      "evidence_excerpt": "Prescribes quality and hygiene requirements for ground coriander powder.",
      "applicability_explanation": "Primary national standard for coriander powder.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by FAD 9."
  },
  {
    "canonical_name": "CTC Black Tea Grain Form (Assam / Dooars)",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 3633:2003",
    "new_standard": {
      "is_number": "IS 3633:2003",
      "title": "Black Tea — Specification",
      "publication_year": 2003,
      "version": "Second Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "FAD 6",
      "division_council": "Food and Agriculture",
      "scope": "Specifies requirements for black tea (CTC and orthodox) produced from leaves of Camellia sinensis.",
      "materials": "Processed dried tea leaves, buds and tender stems.",
      "technical_requirements": "Water extract (min 32.0%), total ash (4.0% to 8.0%), water soluble ash in total ash (min 45.0%), acid insoluble ash (max 1.0%), crude fibre (max 16.5%), alkalinity of water soluble ash.",
      "performance_requirements": "Characteristic brisk cup quality, liquor colour and aroma; zero exhausted tea leaves or added colouring matter.",
      "testing_requirements": "Water extract per IS 1386, crude fibre per IS 10226, total ash per IS 1385.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 6 / Tea Board of India"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "Tea Board of India Quality Regulations; FSSAI Beverages Regulations",
      "source_url": "https://www.teaboard.gov.in",
      "evidence_excerpt": "Prescribes chemical and quality criteria for commercial black tea in CTC grain and orthodox leaf forms.",
      "applicability_explanation": "Primary national standard for CTC black tea.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by FAD 6."
  },
  {
    "canonical_name": "Cumin Seeds (Jeera)",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 2421:2019",
    "new_standard": {
      "is_number": "IS 2421:2019",
      "title": "Cumin Seeds (Whole and Ground) — Specification",
      "publication_year": 2019,
      "version": "Second Revision",
      "status": "ACTIVE",
      "technical_committee": "FAD 9",
      "division_council": "Food and Agriculture",
      "scope": "Prescribes requirements for whole and ground cumin seeds (Cuminum cyminum L.).",
      "materials": "Dried mature seeds of Cuminum cyminum L.",
      "technical_requirements": "Extraneous matter (max 1.0%), proportion of broken seeds, volatile oil content (min 1.5% to 2.5% v/w), total ash, acid insoluble ash (max 1.5%).",
      "performance_requirements": "Characteristic aromatic warm cumin odour; freedom from spent cumin or artificial coloring.",
      "testing_requirements": "Volatile oil by steam distillation per IS 1797, microscopic evaluation per IS 1797.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 9 / FSSAI"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "FSSAI Spices Regulations; AGMARK Cumin Seeds Grading Rules",
      "source_url": "https://fssai.gov.in",
      "evidence_excerpt": "Prescribes standards for whole and powdered cumin seeds.",
      "applicability_explanation": "Primary national standard for cumin seeds.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by FAD 9."
  },
  {
    "canonical_name": "Dairy Whitener Powder",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 12299:1998",
    "new_standard": {
      "is_number": "IS 12299:1998",
      "title": "Dairy Whitener — Specification",
      "publication_year": 1998,
      "version": "First Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "FAD 19",
      "division_council": "Food and Agriculture",
      "scope": "Prescribes requirements and test methods for dairy whiteners (powdered milk products prepared by spray drying of cow or buffalo milk with added sucrose).",
      "materials": "Milk solids with added refined sugar (sucrose).",
      "technical_requirements": "Milk fat (min 20.0%), milk protein in MSNF (min 34.0%), moisture (max 4.0%), total ash (max 5.5%), added sugar (max 18.0%), solubility index (max 1.5 ml).",
      "performance_requirements": "Instant reconstitution in hot tea or coffee without curdling; free flowing without lumps.",
      "testing_requirements": "Fat by Gerber method, sugar by Lane-Eynon method per IS 1479, solubility per IS 12759.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 19 / FSSAI"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "FSSAI Mandatory BIS Certification List; Food Safety and Standards Regulations",
      "source_url": "https://fssai.gov.in",
      "evidence_excerpt": "Compulsory Scheme-I BIS certification for Dairy Whitener conforming to IS 12299 under FSSAI statutory regulations.",
      "applicability_explanation": "Mandatory statutory product specification for dairy whitener powder in India.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by FAD 19. Mandatory ISI mark under FSSAI regulations."
  },
  {
    "canonical_name": "Dehydrated Garlic Granules and Powder",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 4452:1969",
    "new_standard": {
      "is_number": "IS 4452:1969",
      "title": "Dehydrated Garlic — Specification",
      "publication_year": 1969,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "FAD 10",
      "division_council": "Food and Agriculture",
      "scope": "Specifies requirements for dehydrated garlic in flakes, granules, minced, and powder forms prepared from Allium sativum L.",
      "materials": "Dehydrated cloves of Allium sativum L.",
      "technical_requirements": "Moisture (max 6.0%), total ash (max 5.0%), acid insoluble ash (max 0.5%), cold water soluble extract (min 70.0%), volatile thiosulphinates (allicin potential min 0.3%).",
      "performance_requirements": "Strong characteristic pungent garlic odour upon reconstitution; free from scorching or caking.",
      "testing_requirements": "Moisture by toluene distillation per IS 1797, allicin assay by spectrophotometry.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 10 / APEDA"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "APEDA Dehydrated Vegetables Export Standards; FSSAI Regulations",
      "source_url": "https://apeda.gov.in",
      "evidence_excerpt": "Prescribes quality requirements for dehydrated garlic flakes, granules and powder.",
      "applicability_explanation": "Primary national standard for dehydrated garlic products.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by FAD 10."
  },
  {
    "canonical_name": "Desi Ghee (Clarified Butter)",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 16326:2015",
    "new_standard": {
      "is_number": "IS 16326:2015",
      "title": "Ghee — Specification",
      "publication_year": 2015,
      "version": "Original Edition (Reaffirmed 2020)",
      "status": "ACTIVE",
      "technical_committee": "FAD 19",
      "division_council": "Food and Agriculture",
      "scope": "Prescribes requirements and test methods for ghee (clarified milk fat obtained exclusively from milk, cream or butter of cow or buffalo).",
      "materials": "Pure clarified butterfat.",
      "technical_requirements": "Milk fat (min 99.5%), moisture (max 0.5%), free fatty acids as oleic acid (max 1.4%), Reichert-Meissl (RM) value (24.0 to 30.0 depending on region), Polenske value, Baudouin test (negative).",
      "performance_requirements": "Characteristic granular texture, pleasant nutty aroma; zero adulteration with hydrogenated vegetable oil (vanaspati) or animal body fat.",
      "testing_requirements": "RM value per IS 3508, Baudouin test for vanaspati per IS 548 (Part 2), moisture by oven drying.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 19 / AGMARK Ghee Grading Rules"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "AGMARK Ghee Grading and Marking Rules; FSSAI Dairy Regulations",
      "source_url": "https://dmi.gov.in",
      "evidence_excerpt": "Prescribes physicochemical standards and regional RM values for pure desi ghee.",
      "applicability_explanation": "Primary national standard for pure desi ghee.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by FAD 19. Regulated under AGMARK and FSSAI."
  },
  {
    "canonical_name": "Floating Fish Feed Extruded Pellets",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 16156:2014",
    "new_standard": {
      "is_number": "IS 16156:2014",
      "title": "Fish Feeds — Specification",
      "publication_year": 2014,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "FAD 5",
      "division_council": "Food and Agriculture",
      "scope": "Specifies requirements and test methods for aquaculture fish feeds (floating extruded pellets and sinking pellets for carps, pangasius, and tilapia).",
      "materials": "Fish meal, soy protein concentrate, wheat flour, fish oil, vitamins and minerals extruded under high pressure/temperature.",
      "technical_requirements": "Crude protein (24% to 38% depending on growth stage), crude fat (min 4.0% to 8.0%), floatability (min 90% floating after 20 minutes in water), water stability without disintegrating.",
      "performance_requirements": "High digestibility, minimal nutrient leaching into pond water; zero prohibited antibiotics.",
      "testing_requirements": "Floatability test per Annex B, water stability per Annex C, crude protein per IS 7874.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 5 Animal Feeds Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "National Fisheries Development Board (NFDB) Standards; BIS FAD 5",
      "source_url": "https://nfdb.gov.in",
      "evidence_excerpt": "Prescribes nutrient composition and physical water-stability for manufactured aquaculture fish feeds.",
      "applicability_explanation": "Primary national standard for extruded floating fish feed pellets.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by FAD 5."
  },
  {
    "canonical_name": "Food Grade Tinplate Cans for Preserves",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 13955:2020",
    "new_standard": {
      "is_number": "IS 13955:2020",
      "title": "Round Open Top Sanitary Cans for Foods and Drinks — Specification",
      "publication_year": 2020,
      "version": "Second Revision",
      "status": "ACTIVE",
      "technical_committee": "FAD 10",
      "division_council": "Food and Agriculture",
      "scope": "Specifies requirements for three-piece welded and two-piece drawn open-top sanitary tinplate metal cans for packing preserved fruits, vegetables, meat, and fish.",
      "materials": "Electrolytic tinplate conforming to IS 1993 lined with food-grade epoxy-phenolic or organosol sanitary lacquer.",
      "technical_requirements": "Can dimensions, double seam parameters (seam thickness, seam length, body hook, cover hook, overlap min 1.0 mm), axial load bearing capacity, internal lacquer adhesion and curing test.",
      "performance_requirements": "Hermetic seal holding vacuum; zero migration of bisphenol A or heavy metals into foodstuffs.",
      "testing_requirements": "Cross-hatch lacquer adhesion test, enamel rater conductivity test, double seam tear-down inspection.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 10 / FSSAI Packaging Regulations"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "FSSAI Packaging Regulations; BIS FAD 10 Specifications",
      "source_url": "https://fssai.gov.in",
      "evidence_excerpt": "Prescribes dimensional and double seam hermetic seal requirements for open top sanitary food cans.",
      "applicability_explanation": "Primary national standard for food grade sanitary tinplate cans.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by FAD 10."
  },
  {
    "canonical_name": "Fortified Milled Raw and Parboiled Rice",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 17782:2021",
    "new_standard": {
      "is_number": "IS 17782:2021",
      "title": "Fortified Rice Kernels (FRK) — Specification",
      "publication_year": 2021,
      "version": "Original Edition",
      "status": "ACTIVE",
      "technical_committee": "FAD 16",
      "division_council": "Food and Agriculture",
      "scope": "Specifies requirements and test methods for fortified rice kernels (FRK) produced from extruded rice flour enriched with iron, folic acid, and vitamin B12 for blending with milled rice at 1:100 ratio.",
      "materials": "Milled rice flour fortified with micronutrient premix (ferric pyrophosphate, folic acid, cyanocobalamin).",
      "technical_requirements": "Moisture (max 12.0%), iron content (28 to 42.5 mg/g FRK), folic acid (75 to 125 mcg/g), vitamin B12 (0.75 to 1.25 mcg/g), kernel shape matching target rice variety.",
      "performance_requirements": "Density matching normal rice preventing segregation; zero nutrient loss during washing and boiling (retention >= 80%).",
      "testing_requirements": "Iron by AAS/ICP-OES, folic acid and B12 by HPLC/microbiological assay, cooking loss test per Annex B.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 16 / DFPD Mandatory Fortification Order"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Department of Food and Public Distribution (DFPD) Mandatory Rice Fortification Guidelines; FSSAI",
      "source_url": "https://dfpd.gov.in",
      "evidence_excerpt": "Compulsory BIS certification for Fortified Rice Kernels conforming to IS 17782 for all rice distributed under PMGKAY and PDS.",
      "applicability_explanation": "Mandatory statutory product specification for fortified rice kernels in India.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by FAD 16. Mandatory under DFPD nationwide rice fortification rollout."
  },
  {
    "canonical_name": "Fortified Refined Wheat Flour (Maida)",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 1009:1979",
    "new_standard": {
      "is_number": "IS 1009:1979",
      "title": "Maida for General Purposes — Specification",
      "publication_year": 1979,
      "version": "Second Revision (Reaffirmed 2020)",
      "status": "ACTIVE",
      "technical_committee": "FAD 16",
      "division_council": "Food and Agriculture",
      "scope": "Specifies requirements for refined wheat flour (maida) obtained by roller milling and sifting cleaned wheat.",
      "materials": "Endosperm fraction of wheat grains.",
      "technical_requirements": "Moisture (max 13.0%), total ash (max 0.7%), acid insoluble ash (max 0.05%), dry gluten (min 7.5%), alcoholic acidity (max 0.12%), granulating fineness.",
      "performance_requirements": "Uniform white to off-white powder, high elasticity in kneaded dough for bakery/noodle making.",
      "testing_requirements": "Dry gluten per IS 1009 Annex B, fineness by sieve analysis, ash per IS 4333.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 16 / FSSAI"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "FSSAI Food Grains Regulations; BIS FAD 16 Specifications",
      "source_url": "https://fssai.gov.in",
      "evidence_excerpt": "Prescribes quality and purity standards for refined wheat flour (maida).",
      "applicability_explanation": "Primary national standard for refined wheat flour (maida).",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by FAD 16."
  },
  {
    "canonical_name": "Fresh Vacuum-Packed Dairy Paneer (Cottage Cheese)",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 10484:1983",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "FSSAI Dairy Regulations; BIS FAD 19",
      "source_url": "https://fssai.gov.in",
      "evidence_excerpt": "Vacuum packed paneer conforms to IS 10484 with extended shelf life packaging.",
      "applicability_explanation": "Primary national standard for paneer cottage cheese.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Duplicate entry mapping to IS 10484:1983."
  },
  {
    "canonical_name": "Fruit Jams, Jellies and Marmalades",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 5861:1993",
    "new_standard": {
      "is_number": "IS 5861:1993",
      "title": "Jams, Jellies and Marmalades — Specification",
      "publication_year": 1993,
      "version": "First Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "FAD 10",
      "division_council": "Food and Agriculture",
      "scope": "Prescribes requirements and test methods for fruit jams, fruit jellies, and citrus marmalades.",
      "materials": "Prepared fruit pulp/juice boiled with sucrose, pectin, and citric acid.",
      "technical_requirements": "Total soluble solids TSS (min 65.0% by mass), fruit content (min 45.0% of finished product), sulfur dioxide preservative (max 40 ppm), lead (max 1.0 ppm).",
      "performance_requirements": "Firm tender gel holding shape without syneresis (weeping); zero mould growth.",
      "testing_requirements": "TSS by refractometer, fruit content determination per Annex B, preservative test per IS 2860.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 10 / FSSAI"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "FSSAI Fruit Products Regulations; BIS FAD 10 Specifications",
      "source_url": "https://fssai.gov.in",
      "evidence_excerpt": "Prescribes composition, minimum fruit content and soluble solids for fruit jams and marmalades.",
      "applicability_explanation": "Primary national standard for fruit jams, jellies and marmalades.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by FAD 10."
  },
  {
    "canonical_name": "Galvanized Corrugated Grain Storage Silos",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 5503 (Part 1):1969",
    "new_standard": {
      "is_number": "IS 5503 (Part 1):1969",
      "title": "General Requirements for Silos for Grain Storage: Part 1 Constructional Requirements",
      "publication_year": 1969,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "FAD 17",
      "division_council": "Food and Agriculture",
      "scope": "Specifies constructional and design requirements for outdoor corrugated galvanized steel silos for bulk food grain storage.",
      "materials": "Corrugated hot-dip galvanized steel wall sheets (IS 277 Z450 coating) with structural steel stiffeners.",
      "technical_requirements": "Wind and seismic load resistance, grain pressure computation (Janssen theory), aeration ducts, moisture sealing at base joint, roof slope and emergency pressure relief vents.",
      "performance_requirements": "Airtight fumigation capability, zero grain spoilage or hotspot formation; 30+ year structural design life.",
      "testing_requirements": "Structural design check, zinc coating thickness per IS 6745, air tightness pressure decay test.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 17 / Food Corporation of India (FCI) Silo Tenders"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "FCI Bulk Grain Silo Technical Specifications; BIS FAD 17 Standards",
      "source_url": "https://fci.gov.in",
      "evidence_excerpt": "Prescribes design and construction requirements for galvanized steel grain storage silos.",
      "applicability_explanation": "Primary national standard for corrugated steel grain storage silos.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by FAD 17."
  },
  {
    "canonical_name": "Garam Masala Mixed Spices",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 13400:1992",
    "new_standard": {
      "is_number": "IS 13400:1992",
      "title": "Garam Masala — Specification",
      "publication_year": 1992,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "FAD 9",
      "division_council": "Food and Agriculture",
      "scope": "Prescribes requirements and test methods for garam masala (ground spice blend of cardamom, cinnamon, cloves, cumin, black pepper, coriander, and bay leaves).",
      "materials": "Blend of clean ground spices without added salt, starch, or artificial flavouring.",
      "technical_requirements": "Moisture (max 10.0%), total ash (max 8.0%), acid insoluble ash (max 1.5%), non-volatile ether extract (min 10.0%), crude fibre (max 25.0%).",
      "performance_requirements": "Rich aromatic balanced spice bouquet; zero aflatoxin or artificial coloring.",
      "testing_requirements": "Chemical analysis per IS 1797, microscopic identification of spices per Annex B.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 9 / FSSAI"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "FSSAI Food Product Standards; Spices Board Guidelines",
      "source_url": "https://fssai.gov.in",
      "evidence_excerpt": "Prescribes compositional and hygiene standards for blended garam masala powder.",
      "applicability_explanation": "Primary national standard for garam masala spice blend.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by FAD 9."
  },
  {
    "canonical_name": "Green Cardamom Whole Pods (Alleppey Green)",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 1907:2020",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "Spices Board of India Cardamom Rules",
      "source_url": "https://www.indianspices.com",
      "evidence_excerpt": "Alleppey Green extra bold cardamom grades conform to IS 1907.",
      "applicability_explanation": "Primary national standard for green cardamom pods.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by FAD 9. Alleppey Green is Grade 1 under IS 1907."
  },
  {
    "canonical_name": "Ground Coriander Seed Powder (Dhania)",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 2444:2020",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "FSSAI Food Product Standards; AGMARK Rules",
      "source_url": "https://fssai.gov.in",
      "evidence_excerpt": "Clause 1: Prescribes quality requirements for ground coriander seeds.",
      "applicability_explanation": "Primary national standard for coriander powder.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Duplicate entry mapping to IS 2444:2020."
  },
  {
    "canonical_name": "Ground Turmeric Root Powder (Agmark Special)",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 3576:2010",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "FSSAI Regulations; AGMARK Turmeric Rules",
      "source_url": "https://fssai.gov.in",
      "evidence_excerpt": "AGMARK Special grade turmeric powder conforms to IS 3576 Grade 1.",
      "applicability_explanation": "Primary national standard for ground turmeric powder.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Duplicate entry mapping to IS 3576:2010."
  },
  {
    "canonical_name": "Hot-Break Tomato Paste and Puree Concentrate",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 3883:1993",
    "new_standard": {
      "is_number": "IS 3883:1993",
      "title": "Tomato Puree and Tomato Paste — Specification",
      "publication_year": 1993,
      "version": "Second Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "FAD 10",
      "division_council": "Food and Agriculture",
      "scope": "Prescribes requirements for concentrated tomato products (tomato puree min 9% TSS; tomato paste min 25% to 36% TSS hot-break and cold-break).",
      "materials": "Concentrated tomato juice from sound red ripe tomatoes (Solanum lycopersicum).",
      "technical_requirements": "Total soluble solids TSS (min 25.0% to 36.0% salt-free solids for paste), acidity (min 1.0%), Howard mould count (max 40% positive fields), lycopene content, Bostwick consistency.",
      "performance_requirements": "Deep red colour, thick consistency; zero added artificial red colour or starch.",
      "testing_requirements": "TSS by Abbe refractometer, Howard mould count per IS 2860, Bostwick consistometer test.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 10 / FSSAI"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "FSSAI Fruit and Vegetable Products Regulations; BIS FAD 10 Specifications",
      "source_url": "https://fssai.gov.in",
      "evidence_excerpt": "Prescribes concentration, mould count and purity parameters for tomato paste and puree.",
      "applicability_explanation": "Primary national standard for tomato paste and puree concentrates.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by FAD 10."
  },
  {
    "canonical_name": "Ice Cream and Frozen Desserts",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 2802:2021",
    "new_standard": {
      "is_number": "IS 2802:2021",
      "title": "Ice Cream, Kulfi and Frozen Desserts — Specification",
      "publication_year": 2021,
      "version": "Second Revision",
      "status": "ACTIVE",
      "technical_committee": "FAD 19",
      "division_council": "Food and Agriculture",
      "scope": "Specifies requirements and test methods for ice cream, soft serve, kulfi, and vegetable-fat based frozen desserts.",
      "materials": "Dairy cream or milk solids (or edible vegetable oils for frozen desserts), sweeteners, emulsifiers, stabilizers.",
      "technical_requirements": "Total solids (min 36.0%), milk fat (min 10.0% for standard / 6.0% for medium fat), protein (min 3.5%), weight per unit volume (min 525 g/litre), overrun.",
      "performance_requirements": "Smooth uniform meltdown, absence of icy gritty texture; total viable count <= 100,000 cfu/g, coliform <= 10 cfu/g.",
      "testing_requirements": "Total solids by oven drying, fat by Rose-Gottlieb, overrun calculation per Annex B.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 19 / FSSAI"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "FSSAI Food Product Standards; BIS FAD 19 Specifications",
      "source_url": "https://fssai.gov.in",
      "evidence_excerpt": "Prescribes nutritional, physical and microbiological standards for ice cream and frozen desserts.",
      "applicability_explanation": "Primary national standard for ice cream and frozen desserts.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by FAD 19."
  },
  {
    "canonical_name": "Instant Noodles and Pasta Products",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 14846:2000",
    "new_standard": {
      "is_number": "IS 14846:2000",
      "title": "Instant Noodles — Specification",
      "publication_year": 2000,
      "version": "Original Edition (Reaffirmed 2020)",
      "status": "ACTIVE",
      "technical_committee": "FAD 16",
      "division_council": "Food and Agriculture",
      "scope": "Prescribes requirements and test methods for fried and non-fried instant noodles with accompanying seasoning tastemaker sachet.",
      "materials": "Refined wheat flour (maida), edible vegetable oil, seasoning spices, permitted acidity regulators.",
      "technical_requirements": "Moisture (max 10.0% for fried / 12.0% for non-fried), acid value of extracted fat (max 2.0 mg KOH/g), lead content (max 2.5 mg/kg), total ash, microbiological limits.",
      "performance_requirements": "Rapid rehydration in boiling water within 3 minutes; chewy resilient texture without mushiness.",
      "testing_requirements": "Acid value of extracted oil per IS 548, lead by AAS per AOAC 999.11, rehydration cooking test.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 16 / FSSAI Instant Noodles Standard"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "FSSAI Cereal Products Regulations; BIS FAD 16 Specifications",
      "source_url": "https://fssai.gov.in",
      "evidence_excerpt": "Prescribes quality and safety standards for instant noodles and seasoning sachets.",
      "applicability_explanation": "Primary national standard for instant noodles.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by FAD 16."
  },
  {
    "canonical_name": "Instant Spray-Dried Pure Coffee Powder",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 2791:1992",
    "new_standard": {
      "is_number": "IS 2791:1992",
      "title": "Soluble Coffee Powder — Specification",
      "publication_year": 1992,
      "version": "Third Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "FAD 6",
      "division_council": "Food and Agriculture",
      "scope": "Prescribes requirements for spray-dried and freeze-dried pure soluble (instant) coffee powder.",
      "materials": "Aqueous extract of pure roasted and ground coffee beans (Coffea arabica or Coffea canephora).",
      "technical_requirements": "Moisture (max 4.0%), total ash (7.0% to 14.0%), caffeine content (min 2.8% on dry basis), solubility in boiling water (complete within 30 seconds), solubility in cold water at 16°C (complete within 3 minutes).",
      "performance_requirements": "Instant dissolution without sediment; characteristic roasted coffee aroma; zero chicory or added starch in pure grade.",
      "testing_requirements": "Caffeine determination by spectrophotometry/HPLC per IS 2791 Annex B, solubility test per Annex C.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 6 / Coffee Board"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "Coffee Board of India Regulations; FSSAI Beverages Regulations",
      "source_url": "https://www.indiacoffee.org",
      "evidence_excerpt": "Prescribes purity, caffeine content and instant dissolution parameters for pure soluble coffee powder.",
      "applicability_explanation": "Primary national standard for pure instant coffee powder.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by FAD 6."
  },
  {
    "canonical_name": "Knapsack Battery Operated Agricultural Sprayers",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 11313:2007",
    "new_standard": {
      "is_number": "IS 11313:2007",
      "title": "Hydraulic Power Sprayers — Specification",
      "publication_year": 2007,
      "version": "Second Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "FAD 11",
      "division_council": "Food and Agriculture",
      "scope": "Specifies requirements, performance and testing of hydraulic power sprayers, including 12V battery-operated knapsack sprayers for pesticide spraying.",
      "materials": "UV-stabilized HDPE tank (16L), 12V DC diaphragm pump, rechargeable lithium/lead-acid battery, brass/plastic spray lance with hollow cone nozzle.",
      "technical_requirements": "Tank capacity, pump discharge rate (min 1.5 to 3.0 l/min), working pressure (0.2 to 0.4 MPa), battery backup time (min 4 to 6 hours continuous), lance drop impact test, chemical resistance of tank plastic.",
      "performance_requirements": "Uniform spray droplet spectrum (VMD 150-250 microns); zero chemical leakage onto operator's back.",
      "testing_requirements": "Discharge measurement test, tank drop test from 1.2 m per Annex B, chemical compatibility test per IS 11313.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 11 / Ministry of Agriculture SMAM"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Ministry of Agriculture SMAM Testing Guidelines; FMTTI Batch Testing Protocol",
      "source_url": "https://farmech.gov.in",
      "evidence_excerpt": "Battery operated sprayers must undergo mandatory commercial testing at FMTTI conforming to IS 11313 for DBT subsidy eligibility.",
      "applicability_explanation": "Mandatory statutory testing standard for battery operated knapsack sprayers in India.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by FAD 11."
  },
  {
    "canonical_name": "Laser Land Levellers for Agriculture",
    "council": "FAD",
    "status": "CANDIDATE_UNVERIFIED",
    "investigation_notes": "Currently under technical committee formulation in BIS Sectional Committee FAD 11 (Farm Machinery and Equipment) as a draft Indian Standard; commercial testing currently follows FMTTI Budni protocol (laser transmitter, receiver mast, scraper bucket), but no final Gazette QCO or published IS standard is enacted yet."
  },
  {
    "canonical_name": "Milled Rice (Basmati and Non-Basmati)",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 8371:2016",
    "new_standard": {
      "is_number": "IS 8371:2016",
      "title": "Milled Rice — Specification",
      "publication_year": 2016,
      "version": "Second Revision",
      "status": "ACTIVE",
      "technical_committee": "FAD 16",
      "division_council": "Food and Agriculture",
      "scope": "Specifies requirements and test methods for milled raw and parboiled rice (Oryza sativa L.) including traditional Basmati and non-Basmati rice varieties.",
      "materials": "Husked, milled mature grains of Oryza sativa L.",
      "technical_requirements": "Moisture (max 14.0%), broken grains (max 5% to 25% depending on grade), chalky grains, foreign matter, red grains, degree of milling.",
      "performance_requirements": "Free from insect infestation, musty odour, or mineral oil coating.",
      "testing_requirements": "Grain dimension measurement using dial caliper, moisture per IS 4333 (Part 2), broken grain separation.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 16 / AGMARK Milled Rice Rules"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "FSSAI Food Grains Regulations; AGMARK Milled Rice Rules",
      "source_url": "https://fssai.gov.in",
      "evidence_excerpt": "Prescribes physical, grading and hygiene standards for milled rice.",
      "applicability_explanation": "Primary national standard for milled rice.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by FAD 16."
  },
  {
    "canonical_name": "Mineral Mixture for Livestock Feeds",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 1664:2002",
    "new_standard": {
      "is_number": "IS 1664:2002",
      "title": "Mineral Mixtures for Supplementing Cattle Feeds — Specification",
      "publication_year": 2002,
      "version": "Third Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "FAD 5",
      "division_council": "Food and Agriculture",
      "scope": "Specifies requirements and test methods for mineral mixtures containing macro-minerals and micro-minerals (Type I containing salt and Type II without salt) for cattle and buffaloes.",
      "materials": "Calcite powder, dicalcium phosphate, copper sulphate, zinc sulphate, manganese sulphate, potassium iodate, cobalt sulphate.",
      "technical_requirements": "Calcium (min 16.0% to 20.0%), phosphorus (min 6.0% to 9.0%), magnesium, copper, zinc, manganese, iodine, fluorine (max 0.05% to prevent fluorosis), lead (max 20 ppm), arsenic (max 7 ppm).",
      "performance_requirements": "Prevents mineral deficiency diseases and reproductive disorders in livestock; non-hygroscopic free flowing.",
      "testing_requirements": "Calcium and phosphorus per IS 7874 (Part 2), fluorine by ion selective electrode, heavy metals by AAS.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 5 / DAHD Compulsory Scheme"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "DPIIT / DAHD Mineral Mixtures for Cattle Feeds (Quality Control) Order",
      "source_url": "https://dahd.nic.in",
      "evidence_excerpt": "Compulsory Scheme-I ISI marking for mineral mixtures for cattle feeds conforming to IS 1664.",
      "applicability_explanation": "Mandatory statutory product specification for livestock mineral mixtures.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by FAD 5. Mandatory ISI mark under DAHD QCO."
  },
  {
    "canonical_name": "Mustard Seeds (Rai)",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 2323:2020",
    "new_standard": {
      "is_number": "IS 2323:2020",
      "title": "Mustard Seeds (Whole and Ground) — Specification",
      "publication_year": 2020,
      "version": "Second Revision",
      "status": "ACTIVE",
      "technical_committee": "FAD 9",
      "division_council": "Food and Agriculture",
      "scope": "Specifies requirements for black, brown and yellow mustard seeds (Brassica nigra, Brassica juncea, Brassica alba).",
      "materials": "Dried mature seeds of cultivated Brassica species.",
      "technical_requirements": "Extraneous matter (max 1.0%), damaged/shrivelled seeds, moisture (max 10.0%), allyl isothiocyanate content (min 0.6% for brown/black), total ash.",
      "performance_requirements": "Characteristic pungent aroma; zero Argemone mexicana seed contamination (zero tolerance).",
      "testing_requirements": "Argemone seed screening per FSSAI manual, allyl isothiocyanate determination per IS 3576 Annex.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 9 / FSSAI"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "FSSAI Food Product Standards; AGMARK Mustard Grading Rules",
      "source_url": "https://fssai.gov.in",
      "evidence_excerpt": "Prescribes quality and purity criteria for whole and ground mustard seeds.",
      "applicability_explanation": "Primary national standard for mustard seeds.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by FAD 9."
  },
  {
    "canonical_name": "Orthodox Whole Leaf Green Tea",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 3929:2004",
    "new_standard": {
      "is_number": "IS 3929:2004",
      "title": "Green Tea — Specification",
      "publication_year": 2004,
      "version": "First Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "FAD 6",
      "division_council": "Food and Agriculture",
      "scope": "Specifies requirements for green tea produced by unfermented steaming/pan-firing of Camellia sinensis leaves.",
      "materials": "Non-fermented tender tea leaves and buds.",
      "technical_requirements": "Water extract (min 32.0%), total ash (4.0% to 8.0%), catechins/polyphenol content (min 15.0%), crude fibre (max 16.5%), moisture (max 8.0%).",
      "performance_requirements": "Bright green infusion liquor, grassy vegetal taste; high antioxidant epigallocatechin gallate (EGCG) content.",
      "testing_requirements": "Catechins by HPLC per ISO 14502-2, water extract per IS 1386.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 6 / Tea Board of India"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "Tea Board of India Quality Regulations; FSSAI Regulations",
      "source_url": "https://www.teaboard.gov.in",
      "evidence_excerpt": "Prescribes quality requirements and antioxidant parameters for unfermented green tea.",
      "applicability_explanation": "Primary national standard for green tea.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by FAD 6."
  },
  {
    "canonical_name": "Paddy Transplanters (Self Propelled)",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 16676:2017",
    "new_standard": {
      "is_number": "IS 16676:2017",
      "title": "Agricultural Machinery — Self-Propelled Rice Transplanter — Test Code",
      "publication_year": 2017,
      "version": "Original Edition",
      "status": "ACTIVE",
      "technical_committee": "FAD 11",
      "division_council": "Food and Agriculture",
      "scope": "Specifies test procedures and performance requirements for ride-on and walk-behind self-propelled paddy transplanters (4-row, 6-row, 8-row).",
      "materials": "Lightweight chassis, rubber lugged paddy wheels, petrol/diesel engine, seedling tray feeder, rotary transplanting claws.",
      "technical_requirements": "Row spacing (standard 300 mm), hill spacing (120 to 180 mm), seedlings per hill (2 to 5), missing hill percentage (max 5%), floating seedling percentage (max 3%), field capacity (ha/h).",
      "performance_requirements": "Smooth planting in wet puddled soil without sinking; minimal seedling damage.",
      "testing_requirements": "FMTTI field test: 25 hours continuous transplanting test, missing hill counting, planting depth uniformity.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 11 / Ministry of Agriculture SMAM"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Ministry of Agriculture SMAM Guidelines; FMTTI Test Protocol",
      "source_url": "https://farmech.gov.in",
      "evidence_excerpt": "Compulsory FMTTI testing conforming to IS 16676 for all self-propelled rice transplanters under national farm mechanization subsidies.",
      "applicability_explanation": "Mandatory statutory testing standard for self-propelled rice transplanters in India.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by FAD 11."
  },
  {
    "canonical_name": "Paneer (Cottage Cheese)",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 10484:1983",
    "new_standard": {
      "is_number": "IS 10484:1983",
      "title": "Paneer — Specification",
      "publication_year": 1983,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "FAD 19",
      "division_council": "Food and Agriculture",
      "scope": "Prescribes requirements and methods of test for paneer (heat-acid coagulated dairy product prepared from cow or buffalo milk).",
      "materials": "Coagulated cow or buffalo milk curd pressed into blocks.",
      "technical_requirements": "Moisture (max 70.0% for medium / max 60.0% for regular paneer), milk fat on dry matter basis FDM (min 50.0% for paneer / min 20.0% for low fat paneer), titratable acidity (max 0.5%).",
      "performance_requirements": "Firm cohesive block, sweet acidic flavour; yeast and mould <= 250 cfu/g, coliform absent in 0.1 g.",
      "testing_requirements": "Fat by Gerber method, moisture by oven drying per IS 2785 Annex, microbiological tests per IS 5402.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 19 / FSSAI"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "FSSAI Dairy Products Regulations; BIS FAD 19 Specifications",
      "source_url": "https://fssai.gov.in",
      "evidence_excerpt": "Prescribes composition, hygiene and packaging criteria for fresh and vacuum-packed paneer.",
      "applicability_explanation": "Primary national standard for paneer cottage cheese.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by FAD 19."
  },
  {
    "canonical_name": "Pasteurized Cow/Buffalo Milk",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 13688:1999",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "FSSAI Dairy Regulations; BIS FAD 19",
      "source_url": "https://fssai.gov.in",
      "evidence_excerpt": "Clause 1: Prescribes requirements for pasteurized liquid cow and buffalo milk.",
      "applicability_explanation": "Mandatory statutory specification for pasteurized liquid milk.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Duplicate entry mapping to IS 13688:1999."
  },
  {
    "canonical_name": "Pasteurized Full Cream Dairy Milk",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 13688:1999",
    "new_standard": {
      "is_number": "IS 13688:1999",
      "title": "Pasteurized Milk — Specification",
      "publication_year": 1999,
      "version": "Original Edition (Reaffirmed 2020)",
      "status": "ACTIVE",
      "technical_committee": "FAD 19",
      "division_council": "Food and Agriculture",
      "scope": "Prescribes requirements and methods of test for pasteurized milk (Full Cream, Toned, Double Toned, and Skimmed milk).",
      "materials": "Raw cow or buffalo milk pasteurized by HTST or holder method.",
      "technical_requirements": "Milk fat (min 6.0% for Full Cream / 3.0% for Toned), solids-not-fat SNF (min 9.0% / 8.5%), titratable acidity, phosphatase test (negative), methylene blue reduction time.",
      "performance_requirements": "Standard plate count <= 30,000 cfu/ml, coliform count <= 10 cfu/ml, zero adulterants (neutralizers, urea, starch absent).",
      "testing_requirements": "Phosphatase test per IS 1479 (Part 2), fat by Gerber method per IS 1224, SNF per lactometer formula.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 19 / FSSAI"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "FSSAI Food Safety and Standards (Food Products Standards and Food Additives) Regulations 2011",
      "source_url": "https://fssai.gov.in",
      "evidence_excerpt": "All commercially packaged pasteurized liquid milk must conform to IS 13688 and FSSAI standards.",
      "applicability_explanation": "Mandatory statutory specification for packaged pasteurized milk in India.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by FAD 19. Regulated under FSSAI Dairy Regulations."
  },
  {
    "canonical_name": "Pasteurized Table Butter (Salted)",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 13690:1992",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "FSSAI Regulations; AGMARK Rules",
      "source_url": "https://fssai.gov.in",
      "evidence_excerpt": "Salted pasteurized butter must conform to IS 13690 table butter grade.",
      "applicability_explanation": "Primary national standard for salted pasteurized butter.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Duplicate entry mapping to IS 13690:1992."
  },
  {
    "canonical_name": "Pneumatic Knapsack Sprayers",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 3906:1995",
    "new_standard": {
      "is_number": "IS 3906:1995",
      "title": "Farm Drainage and Plant Protection Equipment — Knapsack Sprayers (Piston/Diaphragm Type) — Specification",
      "publication_year": 1995,
      "version": "Fourth Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "FAD 11",
      "division_council": "Food and Agriculture",
      "scope": "Specifies requirements, construction, and testing of manually operated knapsack sprayers for agricultural chemical spraying.",
      "materials": "Brass or engineering plastic cylinder, mechanical hand lever, pressure chamber, spray lance with trigger cutoff valve.",
      "technical_requirements": "Tank capacity (10 to 16 litres), hydraulic proof pressure test of pressure chamber (1.0 MPa for 5 minutes), discharge rate (min 500 ml/min at 0.3 MPa), mechanical endurance test (50,000 continuous pumping cycles).",
      "performance_requirements": "Fatigue life without pump cylinder cracking or diaphragm rupture; chemical corrosion resistance.",
      "testing_requirements": "Hydrostatic pressure test, pump volumetric efficiency test, endurance testing machine per Annex B.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 11 Farm Machinery Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Ministry of Agriculture SMAM Guidelines; FMTTI Testing Norms",
      "source_url": "https://farmech.gov.in",
      "evidence_excerpt": "Mandatory testing and BIS conformity to IS 3906 for all manual and pneumatic knapsack sprayers.",
      "applicability_explanation": "Mandatory statutory testing standard for knapsack sprayers.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by FAD 11."
  },
  {
    "canonical_name": "Poultry Feed Broiler Finisher",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 1374:2007",
    "new_standard": {
      "is_number": "IS 1374:2007",
      "title": "Poultry Feeds — Specification",
      "publication_year": 2007,
      "version": "Fifth Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "FAD 5",
      "division_council": "Food and Agriculture",
      "scope": "Specifies requirements for poultry feeds (Broiler Starter, Broiler Finisher, Layer Starter, Grower and Layer Feeds).",
      "materials": "Corn, soybean meal, fish meal, dicalcium phosphate, amino acids (methionine, lysine), trace minerals.",
      "technical_requirements": "Crude protein (min 20.0% for broiler finisher), metabolisable energy ME (min 3100 kcal/kg), crude fat (min 3.5%), crude fibre (max 5.0%), calcium, available phosphorus, aflatoxin B1 (max 20 ppb).",
      "performance_requirements": "Optimal feed conversion ratio (FCR <= 1.6); free from fungal mycotoxins and mammalian tissue meat meal.",
      "testing_requirements": "Crude protein per IS 7874 (Part 1), gross energy by bomb calorimeter, aflatoxin screening.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 5 Animal Feeds Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS FAD 5 Sectional Committee Specifications; DAHD Poultry Guidelines",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_1374",
      "evidence_excerpt": "Clause 1: Prescribes nutritional and hygiene requirements for balanced poultry feeds.",
      "applicability_explanation": "Primary national standard for broiler finisher poultry feeds.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by FAD 5."
  },
  {
    "canonical_name": "Power Tillers (Hand Tractors)",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 9980:1999",
    "new_standard": {
      "is_number": "IS 9980:1999",
      "title": "Agricultural Machinery — Power Tillers — Test Code",
      "publication_year": 1999,
      "version": "First Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "FAD 11",
      "division_council": "Food and Agriculture",
      "scope": "Specifies test procedures and performance requirements for hand-operated two-wheel power tillers (rotary tillers driven by diesel engines).",
      "materials": "Steel chassis, diesel engine, gearbox, rotary cultivation rotor blades.",
      "technical_requirements": "Engine power output, PTO power, drawbar pull, fuel consumption, turning radius, vibration and operator noise limits at handle grip, rotary tilling efficiency.",
      "performance_requirements": "Safe maneuvering in wet paddy puddling; operator hand-arm vibration attenuation.",
      "testing_requirements": "Laboratory and field testing protocol at FMTTI Budni per IS 9980 and IS 13539.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 11 / Ministry of Agriculture SMAM"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Sub-Mission on Agricultural Mechanization (SMAM) Subsidy Guidelines; Central Motor Vehicles Rules (CMVR)",
      "source_url": "https://farmech.gov.in",
      "evidence_excerpt": "Compulsory testing and conformity to IS 9980 / IS 13539 at FMTTI for all power tillers commercialized or subsidized in India.",
      "applicability_explanation": "Mandatory statutory testing and performance standard for power tillers in India.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by FAD 11. Mandatory under Ministry of Agriculture SMAM scheme."
  },
  {
    "canonical_name": "Processed Mozzarella and Cheddar Cheese Blocks",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 2785:2021",
    "new_standard": {
      "is_number": "IS 2785:2021",
      "title": "Hard Cheese, Processed Cheese and Processed Cheese Spread — Specification",
      "publication_year": 2021,
      "version": "Second Revision",
      "status": "ACTIVE",
      "technical_committee": "FAD 19",
      "division_council": "Food and Agriculture",
      "scope": "Specifies requirements and test methods for cheddar cheese, mozzarella (pizza cheese), processed cheese blocks and processed cheese spreads.",
      "materials": "Cheddar or mozzarella natural cheese curd blended with emulsifying salts.",
      "technical_requirements": "Moisture (max 47.0% for processed cheese / max 54.0% for mozzarella), fat on dry matter basis (min 40.0% to 45.0%), pH (5.6 to 6.2), stretchability and meltability test.",
      "performance_requirements": "Uniform shredding and melting behaviour on pizza/baking; zero phase separation or oiling off.",
      "testing_requirements": "Moisture per IS 2785, fat per Rose-Gottlieb, meltability by Schreiber test.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 19 / FSSAI"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "FSSAI Dairy Products Regulations; BIS FAD 19",
      "source_url": "https://fssai.gov.in",
      "evidence_excerpt": "Prescribes composition, microbiological parameters and meltability for cheese blocks.",
      "applicability_explanation": "Primary national standard for cheddar and mozzarella cheese blocks.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by FAD 19."
  },
  {
    "canonical_name": "Red Chilli Powder Fine Milled (Agmark Grade)",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 2445:2017",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "FSSAI Regulations; AGMARK Chilli Powder Grading Rules",
      "source_url": "https://fssai.gov.in",
      "evidence_excerpt": "Fine milled chilli powder must conform to IS 2445 and AGMARK Special grade parameters.",
      "applicability_explanation": "Primary national standard for fine milled chilli powder.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Duplicate entry mapping to IS 2445:2017."
  },
  {
    "canonical_name": "Refined Soyabean Edible Oil Fortified",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 4276:1977",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "FSSAI Fortification of Foods Regulations 2018; BIS FAD 4",
      "source_url": "https://fssai.gov.in",
      "evidence_excerpt": "Refined soybean oil fortified with Vitamin A (25 IU/g) and Vitamin D (4.5 IU/g) conforms to IS 4276.",
      "applicability_explanation": "Primary national standard for fortified refined soybean oil.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Duplicate entry mapping to IS 4276:1977 with FSSAI micronutrient fortification."
  },
  {
    "canonical_name": "Refined Soybean Oil",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 4276:1977",
    "new_standard": {
      "is_number": "IS 4276:1977",
      "title": "Soybean Oil — Specification",
      "publication_year": 1977,
      "version": "First Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "FAD 4",
      "division_council": "Food and Agriculture",
      "scope": "Specifies requirements for raw and refined soybean oil obtained from seeds of Glycine max L.",
      "materials": "Refined, bleached and deodorized oil from soybean seeds.",
      "technical_requirements": "Refractive index at 40°C (1.4649 to 1.4710), saponification value (189 to 195), iodine value (120 to 141), acid value (max 0.5 for refined), unsaponifiable matter (max 1.0%), flash point (min 250°C).",
      "performance_requirements": "Bland odour and taste, clear appearance; negative tests for argemone, sesame, and mineral oils.",
      "testing_requirements": "Acid value and iodine value per IS 548 (Part 1), moisture per IS 548.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 4 / FSSAI"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "FSSAI Edible Oils Regulations; BIS FAD 4 Specifications",
      "source_url": "https://fssai.gov.in",
      "evidence_excerpt": "Prescribes quality and refining criteria for refined edible soybean oil.",
      "applicability_explanation": "Primary national standard for refined soybean oil.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by FAD 4."
  },
  {
    "canonical_name": "Refined Sunflower Seed Cooking Oil",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 4277:1975",
    "new_standard": {
      "is_number": "IS 4277:1975",
      "title": "Sunflower Oil — Specification",
      "publication_year": 1975,
      "version": "First Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "FAD 4",
      "division_council": "Food and Agriculture",
      "scope": "Specifies requirements for raw and refined sunflower oil obtained from seeds of Helianthus annuus L.",
      "materials": "Refined and winterized oil from sunflower seeds.",
      "technical_requirements": "Refractive index at 40°C (1.4640 to 1.4800), saponification value (188 to 194), iodine value (100 to 145), acid value (max 0.5 for refined), unsaponifiable matter (max 1.5%), wax content.",
      "performance_requirements": "Clear pale yellow oil remaining clear at 10°C (dewaxed); high linoleic/oleic polyunsaturated fatty acid profile.",
      "testing_requirements": "Wax test per Annex B, acid value and iodine value per IS 548 (Part 1).",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 4 / FSSAI"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "FSSAI Edible Oils Regulations; BIS FAD 4 Specifications",
      "source_url": "https://fssai.gov.in",
      "evidence_excerpt": "Prescribes quality and refining parameters for sunflower cooking oil.",
      "applicability_explanation": "Primary national standard for refined sunflower cooking oil.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by FAD 4."
  },
  {
    "canonical_name": "Roasted and Ground Arabica Coffee Powder",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 3077:1992",
    "new_standard": {
      "is_number": "IS 3077:1992",
      "title": "Roasted and Ground Coffee — Specification",
      "publication_year": 1992,
      "version": "Third Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "FAD 6",
      "division_council": "Food and Agriculture",
      "scope": "Specifies requirements for pure roasted and ground coffee powder without chicory.",
      "materials": "Roasted beans of Coffea arabica or Coffea robusta.",
      "technical_requirements": "Moisture (max 5.0%), total ash (3.5% to 5.0%), water soluble ash in total ash (min 65.0%), acid insoluble ash (max 0.5%), caffeine content (min 1.0%), petroleum ether extract.",
      "performance_requirements": "Full-bodied aromatic brew; microscopic freedom from chicory root or date seed adulterants.",
      "testing_requirements": "Microscopic examination per IS 3077 Annex B, caffeine per Annex C, moisture per IS 4333.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 6 / Coffee Board"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "Coffee Board of India Regulations; FSSAI Regulations",
      "source_url": "https://www.indiacoffee.org",
      "evidence_excerpt": "Prescribes purity and roasting standards for pure ground filter coffee powder.",
      "applicability_explanation": "Primary national standard for roasted and ground coffee powder.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by FAD 6."
  },
  {
    "canonical_name": "Rotavators (Rotary Tillers)",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 17045:2018",
    "new_standard": {
      "is_number": "IS 17045:2018",
      "title": "Rotary Tillers (Rotavators) — Test Code and Performance Requirements",
      "publication_year": 2018,
      "version": "Original Edition",
      "status": "ACTIVE",
      "technical_committee": "FAD 11",
      "division_council": "Food and Agriculture",
      "scope": "Specifies test codes, constructional requirements and performance evaluation for tractor PTO-driven rotary tillers (rotavators).",
      "materials": "Heavy duty tubular frame, central or side gear drive, PTO cardan shaft with shear bolt safety clutch, rotor shaft with boron steel L or C blades.",
      "technical_requirements": "Tillage depth (up to 150 mm), pulverized mean mass diameter (MMD <= 15 mm), field capacity, blade hardness (IS 6690: 42 to 48 HRC), fuel consumption.",
      "performance_requirements": "Smooth seedbed preparation in single pass; high wear life in abrasive rocky/sandy soils.",
      "testing_requirements": "Field pulverization test per Annex B, PTO torque and power measurement per Annex C, blade wear test.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 11 / Ministry of Agriculture SMAM"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Ministry of Agriculture SMAM Directives; FMTTI Test Code",
      "source_url": "https://farmech.gov.in",
      "evidence_excerpt": "Mandatory commercial testing at FMTTI conforming to IS 17045 for rotavators commercialized in India.",
      "applicability_explanation": "Mandatory statutory performance and testing standard for tractor rotavators.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by FAD 11."
  },
  {
    "canonical_name": "Seed Cum Fertilizer Drills",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 6813:2000",
    "new_standard": {
      "is_number": "IS 6813:2000",
      "title": "Sowing Equipment — Seed-cum-Fertilizer Drills — Specification",
      "publication_year": 2000,
      "version": "Second Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "FAD 11",
      "division_council": "Food and Agriculture",
      "scope": "Specifies requirements and test methods for tractor-drawn and bullock-drawn seed-cum-fertilizer drills for sowing wheat, pulses, and oilseeds.",
      "materials": "Steel frame, separate seed and fertilizer hoppers, fluted roller metering mechanism, furrow openers (disc or shoe type).",
      "technical_requirements": "Calibration accuracy (variation in seed rate between runs <= 5%, variation between furrow openers <= 7%), fertilizer delivery rate uniformity, seed damage percentage (max 1.0%), mechanical seed hopper agitator.",
      "performance_requirements": "Uniform sowing depth and germination spacing; corrosion resistance against chemical fertilizers.",
      "testing_requirements": "Calibration test on test bench per Annex A, seed damage test per Annex B.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 11 / Ministry of Agriculture SMAM"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Ministry of Agriculture SMAM Guidelines; FMTTI Testing Protocol",
      "source_url": "https://farmech.gov.in",
      "evidence_excerpt": "Mandatory commercial test report conforming to IS 6813 for all seed drills subsidized under government agricultural programs.",
      "applicability_explanation": "Mandatory statutory testing standard for seed cum fertilizer drills in India.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by FAD 11."
  },
  {
    "canonical_name": "Skimmed Milk Powder (SMP)",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 13334 (Part 1):2014",
    "new_standard": {
      "is_number": "IS 13334 (Part 1):2014",
      "title": "Skimmed Milk Powder: Part 1 Standard Grade — Specification",
      "publication_year": 2014,
      "version": "Second Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "FAD 19",
      "division_council": "Food and Agriculture",
      "scope": "Specifies requirements and test methods for standard grade skimmed milk powder (SMP) produced by spray drying skimmed milk.",
      "materials": "Fresh pasteurized skimmed milk.",
      "technical_requirements": "Milk fat (max 1.5%), moisture (max 4.0%), milk protein in MSNF (min 34.0%), titratable acidity (max 1.3%), solubility index (max 1.0 ml), insolubility index, scorched particles (Disc B max).",
      "performance_requirements": "Total plate count <= 30,000 cfu/g, coliform absent in 0.1 g, Salmonella absent in 25 g.",
      "testing_requirements": "Protein by Kjeldahl per IS 1479, solubility index per IS 12759, scorched particle test per IS 13500.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 19 / FSSAI Compulsory BIS List"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "FSSAI Mandatory BIS Certification List; Food Safety and Standards Act Section 16",
      "source_url": "https://fssai.gov.in",
      "evidence_excerpt": "Compulsory Scheme-I BIS certification for Skimmed Milk Powder conforming to IS 13334. No SMP may be manufactured or sold in India without ISI mark.",
      "applicability_explanation": "Mandatory statutory product specification for skimmed milk powder under FSSAI Act.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by FAD 19. Mandatory ISI mark under FSSAI Act."
  },
  {
    "canonical_name": "Solar Dehydrated White Onion Flakes",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 4454:1969",
    "new_standard": {
      "is_number": "IS 4454:1969",
      "title": "Dehydrated Onion — Specification",
      "publication_year": 1969,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "FAD 10",
      "division_council": "Food and Agriculture",
      "scope": "Specifies requirements for dehydrated onion flakes, kibbled pieces, and powder prepared from clean mature white or red onions (Allium cepa L.).",
      "materials": "Dehydrated bulbs of Allium cepa L.",
      "technical_requirements": "Moisture (max 6.0%), total ash (max 5.0%), acid insoluble ash (max 0.5%), rehydration ratio (min 1:4), pyruvic acid content (pungency indicator).",
      "performance_requirements": "Light cream colour, free from scorching; clean savoury onion taste upon rehydration.",
      "testing_requirements": "Rehydration test per Annex B, pyruvic acid assay per Annex C, moisture per IS 1797.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 10 / APEDA"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "APEDA Dehydrated Onion Export Guidelines; FSSAI Regulations",
      "source_url": "https://apeda.gov.in",
      "evidence_excerpt": "Prescribes quality and rehydration standards for dehydrated onion flakes and powder.",
      "applicability_explanation": "Primary national standard for dehydrated white onion flakes.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by FAD 10."
  },
  {
    "canonical_name": "Sugarcane Harvesters and Cutters",
    "council": "FAD",
    "status": "CANDIDATE_UNVERIFIED",
    "investigation_notes": "Commercial field testing is conducted by FMTTI Budni under Ministry of Agriculture guidelines, but a dedicated Indian Standard is currently under drafting in BIS Committee FAD 11 (Farm Machinery) and has not yet been enacted in a final Gazette QCO notification."
  },
  {
    "canonical_name": "Table Butter (Pasteurized)",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 13690:1992",
    "new_standard": {
      "is_number": "IS 13690:1992",
      "title": "Pasteurized Butter — Specification",
      "publication_year": 1992,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "FAD 19",
      "division_council": "Food and Agriculture",
      "scope": "Specifies requirements and test methods for pasteurized table butter (salted and unsalted) made from pasteurized cream.",
      "materials": "Pasteurized cow or buffalo milk cream with edible salt and natural annatto/carotene colouring.",
      "technical_requirements": "Milk fat (min 80.0%), moisture (max 16.0%), curd (max 1.5%), salt (max 2.5%), titratable acidity, Reichert-Meissl value.",
      "performance_requirements": "Smooth uniform body, zero free brine droplets; standard plate count <= 10,000 cfu/g, coliform absent.",
      "testing_requirements": "Fat and moisture by Kohman method per IS 3507, microbiological examination per IS 5402.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 19 / FSSAI"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "FSSAI Dairy Products Regulations; AGMARK Butter Grading Rules",
      "source_url": "https://fssai.gov.in",
      "evidence_excerpt": "Prescribes quality and microbiological criteria for packaged pasteurized table butter.",
      "applicability_explanation": "Primary national standard for pasteurized table butter.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by FAD 19."
  },
  {
    "canonical_name": "Threshers (Multi-Crop)",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 9020:2002",
    "new_standard": {
      "is_number": "IS 9020:2002",
      "title": "Power Threshers — General and Safety Requirements",
      "publication_year": 2002,
      "version": "Second Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "FAD 11",
      "division_council": "Food and Agriculture",
      "scope": "Specifies general constructional and mandatory safety requirements for power-operated threshers for wheat, paddy, soybean, and pulses.",
      "materials": "Heavy steel structure, spike tooth / rasp bar threshing cylinder, concave, aspirator blower, cleaning sieves, feeding chute.",
      "technical_requirements": "Mandatory feeding chute dimensions (safety chute length min 900 mm), covered flywheels and belts, threshing efficiency (min 98.0%), grain breakage (max 2.0%), clean grain output (min 97.0%).",
      "performance_requirements": "Elimination of operator hand entanglements in threshing cylinder; high multi-crop throughput.",
      "testing_requirements": "Safety distance measurement per Annex A, threshing efficiency and grain loss evaluation per IS 6284.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 11 / Dangerous Machines (Regulation) Act"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Dangerous Machines (Regulation) Act 1983; Ministry of Agriculture SMAM Guidelines",
      "source_url": "https://farmech.gov.in",
      "evidence_excerpt": "Statutory requirement under Dangerous Machines Act: all power threshers manufactured or sold must strictly conform to safety specifications of IS 9020.",
      "applicability_explanation": "Mandatory statutory safety and performance standard for power threshers in India.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by FAD 11. Enforced under the Dangerous Machines (Regulation) Act."
  },
  {
    "canonical_name": "Tomato Ketchup and Purees",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 3883:1993",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "FSSAI Regulations; BIS FAD 10",
      "source_url": "https://fssai.gov.in",
      "evidence_excerpt": "Clause 1: Prescribes requirements for tomato puree and concentrated tomato products.",
      "applicability_explanation": "Primary national standard for tomato purees and tomato sauce bases.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Duplicate entry mapping to IS 3883:1993."
  },
  {
    "canonical_name": "Tractor Drawn Disc Harrows",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 6638:1972",
    "new_standard": {
      "is_number": "IS 6638:1972",
      "title": "Tractor-Mounted Disc Harrows — Specification",
      "publication_year": 1972,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "FAD 11",
      "division_council": "Food and Agriculture",
      "scope": "Specifies requirements for tractor-mounted and trailed disc harrows (offset and tandem types) for secondary tillage and weed cutting.",
      "materials": "Structural steel frame, high carbon steel dished discs (conforming to IS 4366), sealed ball bearing spools, gang angle adjusting mechanism.",
      "technical_requirements": "Disc diameter (450 to 660 mm), concavity, disc hardness (38 to 44 HRC), gang angle adjustment (up to 24 degrees), penetration depth.",
      "performance_requirements": "Uniform soil pulverization and residue incorporation without disc cracking or bearing seizure.",
      "testing_requirements": "Hardness test per IS 1586, disc impact toughness test per IS 4366, field endurance testing.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 11 Farm Machinery Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "FMTTI Agricultural Implements Test Code; BIS FAD 11",
      "source_url": "https://farmech.gov.in",
      "evidence_excerpt": "Prescribes construction, dimensions and disc quality for tractor mounted disc harrows.",
      "applicability_explanation": "Primary national standard for tractor drawn disc harrows.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by FAD 11."
  },
  {
    "canonical_name": "Tractor Drawn Heavy Duty Disc Ploughs",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 9813:2002",
    "new_standard": {
      "is_number": "IS 9813:2002",
      "title": "Tractor-Mounted Disc Ploughs — Specification",
      "publication_year": 2002,
      "version": "First Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "FAD 11",
      "division_council": "Food and Agriculture",
      "scope": "Specifies requirements for tractor-mounted heavy-duty disc ploughs (2-bottom, 3-bottom, 4-bottom) for primary deep tillage in hard dry soils.",
      "materials": "Heavy tubular/channel steel frame, heat-treated high carbon dished discs, adjustable furrow wheel, category II 3-point linkage hitch.",
      "technical_requirements": "Disc diameter (660 to 710 mm), disc thickness (6 mm), tilt angle (15° to 25°), disc angle (40° to 45°), working depth (up to 300 mm).",
      "performance_requirements": "Inversion of hard compacted soil and root cutting without disc chipping; stable tracking behind tractor.",
      "testing_requirements": "Linkage geometry per IS 4468, disc hardness per IS 1586, drawbar load and furrow inversion test.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 11 Farm Machinery Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "FMTTI Agricultural Implements Test Code; BIS FAD 11",
      "source_url": "https://farmech.gov.in",
      "evidence_excerpt": "Prescribes design and performance criteria for heavy duty tractor mounted disc ploughs.",
      "applicability_explanation": "Primary national standard for tractor disc ploughs.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by FAD 11."
  },
  {
    "canonical_name": "Tractor PTO Driven Tillage Rotavators",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 17045:2018",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Ministry of Agriculture SMAM Directives; FMTTI",
      "source_url": "https://farmech.gov.in",
      "evidence_excerpt": "Clause 1: Prescribes testing and performance standards for tractor PTO-driven rotary tillers.",
      "applicability_explanation": "Mandatory statutory standard for tractor PTO driven rotavators.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Duplicate entry mapping to IS 17045:2018."
  },
  {
    "canonical_name": "Traditional Indian Basmati Rice Export Grade",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 8371:2016",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "APEDA Export Inspection Council Regulations; AGMARK Basmati Rice Rules",
      "source_url": "https://apeda.gov.in",
      "evidence_excerpt": "Traditional Basmati rice grading parameters (kernel elongation ratio >= 1.7, aroma) conform to IS 8371.",
      "applicability_explanation": "Primary national standard for Basmati rice grading.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by FAD 16. Governed by APEDA Basmati export standards."
  },
  {
    "canonical_name": "Traditional Pure Desi Ghee (Clarified Butter)",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 16326:2015",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "AGMARK Ghee Grading Rules; FSSAI Regulations",
      "source_url": "https://dmi.gov.in",
      "evidence_excerpt": "Clause 1: Prescribes requirements for pure traditional clarified butterfat (desi ghee).",
      "applicability_explanation": "Primary national standard for desi ghee.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Duplicate entry mapping to IS 16326:2015."
  },
  {
    "canonical_name": "Turmeric Powder (Haldi)",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 3576:2010",
    "new_standard": {
      "is_number": "IS 3576:2010",
      "title": "Turmeric, Whole and Ground — Specification",
      "publication_year": 2010,
      "version": "Second Revision (Reaffirmed 2020)",
      "status": "ACTIVE",
      "technical_committee": "FAD 9",
      "division_council": "Food and Agriculture",
      "scope": "Prescribes requirements for dried turmeric rhizomes (Curcuma longa L.) in whole finger/bulb form and ground powder form.",
      "materials": "Rhizomes of Curcuma longa L.",
      "technical_requirements": "Curcumin content (min 2.5% to 3.0%), moisture (max 10.0%), total ash (max 8.0%), acid insoluble ash (max 1.5%), starch content (max 60.0%), lead chromate absent.",
      "performance_requirements": "Bright golden-yellow colour, characteristic peppery aroma; zero synthetic yellow dyes (metanil yellow absent).",
      "testing_requirements": "Curcumin by spectrophotometry per IS 3576 Annex B, test for lead chromate and metanil yellow per FSSAI manual.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 9 / FSSAI"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "FSSAI Spices Regulations; AGMARK Turmeric Rules",
      "source_url": "https://fssai.gov.in",
      "evidence_excerpt": "Prescribes purity standards and limits on foreign dyes for turmeric rhizomes and powder.",
      "applicability_explanation": "Primary national standard for turmeric powder.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by FAD 9."
  },
  {
    "canonical_name": "Whole Black Pepper (Kali Mirch)",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 1798:2020",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "Spices Board Export Regulations; AGMARK Rules",
      "source_url": "https://www.indianspices.com",
      "evidence_excerpt": "Clause 1: Prescribes quality requirements for whole black pepper.",
      "applicability_explanation": "Primary national standard for whole black pepper.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Duplicate entry mapping to IS 1798:2020."
  },
  {
    "canonical_name": "Whole Cumin Seeds (Jeera Machine Cleaned)",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 2421:2019",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "FSSAI Regulations; AGMARK Rules",
      "source_url": "https://fssai.gov.in",
      "evidence_excerpt": "Machine cleaned whole cumin seeds conform to Grade 1 parameters of IS 2421.",
      "applicability_explanation": "Primary national standard for machine cleaned cumin seeds.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Duplicate entry mapping to IS 2421:2019."
  },
  {
    "canonical_name": "Whole Wheat Flour (Atta)",
    "council": "FAD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 1155:1968",
    "new_standard": {
      "is_number": "IS 1155:1968",
      "title": "Wheat Atta — Specification",
      "publication_year": 1968,
      "version": "Second Revision (Reaffirmed 2020)",
      "status": "ACTIVE",
      "technical_committee": "FAD 16",
      "division_council": "Food and Agriculture",
      "scope": "Specifies requirements and test methods for whole wheat flour (atta) obtained by milling clean sound wheat grains.",
      "materials": "Milled whole grain Triticum aestivum wheat.",
      "technical_requirements": "Moisture (max 14.0%), total ash (max 2.0%), acid insoluble ash (max 0.15%), gluten (min 6.0%), crude fibre (max 2.5%), alcoholic acidity (max 0.18%).",
      "performance_requirements": "Natural creamy wheat colour, pleasant wheaty flavour; zero bleaching agents or added chalk.",
      "testing_requirements": "Gluten washing per IS 1155 Annex B, alcoholic acidity per IS 1155 Annex C, moisture per IS 4333.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards FAD 16 / FSSAI"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "FSSAI Food Grains Regulations; AGMARK Atta Grading Rules",
      "source_url": "https://fssai.gov.in",
      "evidence_excerpt": "Prescribes composition, gluten content and purity for packaged whole wheat flour.",
      "applicability_explanation": "Primary national standard for whole wheat flour (atta).",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by FAD 16."
  },
  {
    "canonical_name": "100% Combed Cotton Hosiery Knitting Yarn",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 171:2021",
    "new_standard": {
      "is_number": "IS 171:2021",
      "title": "Cotton Yarn, Grey — Specification",
      "publication_year": 2021,
      "version": "Fourth Revision",
      "status": "ACTIVE",
      "technical_committee": "TXD 4",
      "division_council": "Textiles",
      "scope": "Specifies requirements for single and folded grey cotton yarns (carded and combed) intended for weaving and knitting.",
      "materials": "100% natural cotton fiber.",
      "technical_requirements": "Count strength product CSP (min 2800 to 3200 for combed hosiery), single yarn strength, twist per inch (TPI), unevenness U% / CVm%, imperfections (thin/thick places, neps).",
      "performance_requirements": "Low coefficient of friction, high elasticity, minimal spirality in knitted single jersey fabrics.",
      "testing_requirements": "CSP testing per IS 1671, yarn evenness testing by Uster tester per IS 13907, twist per IS 832.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards TXD 4 Yarn Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS TXD 4 Sectional Committee Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_171",
      "evidence_excerpt": "Clause 1: Prescribes quality parameters for combed cotton yarns used for circular knitting and hosiery manufacture.",
      "applicability_explanation": "Primary national standard for combed cotton hosiery knitting yarn.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by TXD 4."
  },
  {
    "canonical_name": "100% Cotton Plain Weave Shirting",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 1095:1998",
    "new_standard": {
      "is_number": "IS 1095:1998",
      "title": "Cotton Poplins and Shirting — Specification",
      "publication_year": 1998,
      "version": "Third Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "TXD 7",
      "division_council": "Textiles",
      "scope": "Specifies constructional and performance requirements for bleached, dyed and printed cotton poplins and shirting fabrics (plain weave).",
      "materials": "100% pure combed or carded cotton yarns.",
      "technical_requirements": "Threads per dm (ends/picks), mass per unit area (GSM 100 to 140), breaking strength (warp/weft min 250 N), dimensional change on washing (max 2.0%), colour fastness to washing, light and perspiration.",
      "performance_requirements": "Crisp breathable drape, skin-friendly comfort, high crease recovery.",
      "testing_requirements": "Tensile strength per IS 1969, dimensional stability per IS 2977, colour fastness per IS 687.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards TXD 7 Woven Fabrics Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS TXD 7 Sectional Committee Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_1095",
      "evidence_excerpt": "Clause 1: Specifies requirements for bleached and yarn dyed cotton plain weave shirting fabrics.",
      "applicability_explanation": "Primary national standard for cotton plain weave shirting.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by TXD 7."
  },
  {
    "canonical_name": "Air Jet Textured Polyester Filament Yarn (ATY)",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 17262:2019",
    "new_standard": {
      "is_number": "IS 17262:2019",
      "title": "Polyester Continuous Filament Fully Drawn Yarn (FDY) — Specification",
      "publication_year": 2019,
      "version": "Original Edition",
      "status": "ACTIVE",
      "technical_committee": "TXD 4",
      "division_council": "Textiles",
      "scope": "Specifies requirements and test methods for polyester continuous filament yarns (FDY, DTY, and air-jet textured ATY).",
      "materials": "Polyethylene terephthalate (PET) polymer.",
      "technical_requirements": "Linear density (denier/dtex), tenacity (min 3.5 to 7.0 cN/dtex), elongation at break, boiling water shrinkage, interlace count, loop stability for ATY.",
      "performance_requirements": "Spun-like bulk and texture without pilling; high strength for automotive upholstery and sportswear.",
      "testing_requirements": "Tenacity and elongation per IS 1670, boiling water shrinkage per IS 665, denier testing per IS 1315.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards TXD 4 / Ministry of Textiles QCO"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Ministry of Textiles Polyester Continuous Filament Yarn (Quality Control) Order",
      "source_url": "https://texmin.nic.in",
      "evidence_excerpt": "Compulsory Scheme-I ISI marking for all continuous polyester filament yarns conforming to IS 17262.",
      "applicability_explanation": "Mandatory statutory product specification for air jet textured polyester filament yarns.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by TXD 4. Mandatory under Ministry of Textiles QCO."
  },
  {
    "canonical_name": "Anti-Static Cleanroom Polyester Microfiber Fabrics",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 16890:2018",
    "new_standard": {
      "is_number": "IS 16890:2018",
      "title": "Protective Clothing — Cleanroom Apparel Fabrics — Specification",
      "publication_year": 2018,
      "version": "Original Edition",
      "status": "ACTIVE",
      "technical_committee": "TXD 32",
      "division_council": "Textiles",
      "scope": "Specifies requirements for lint-free woven fabrics with embedded conductive carbon grid yarns for cleanroom garments (ISO Class 3 to Class 7).",
      "materials": "Continuous filament polyester microfiber (98%) with conductive carbon/silver grid yarn (2%).",
      "technical_requirements": "Surface resistivity (10^6 to 10^9 ohms/sq per ANSI/ESD STM2.1), static decay time (< 0.01 s), particle shedding (Helmke drum test <= Category 1), air permeability, pore size.",
      "performance_requirements": "Zero particle lint emission; continuous electrostatic discharge dissipation preventing semiconductor ESD failure.",
      "testing_requirements": "Surface resistivity per IS 16890 Annex B, Helmke drum particle test per IEST-RP-CC003.4, static decay test per FTMS 101C.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards TXD 32 Protective Textiles Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS TXD 32 Sectional Committee Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_16890",
      "evidence_excerpt": "Clause 1: Specifies requirements for static-dissipative lint-free cleanroom apparel fabrics.",
      "applicability_explanation": "Primary national standard for anti-static cleanroom microfiber fabrics.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by TXD 32."
  },
  {
    "canonical_name": "Automotive Airbag Cushion Nylon 6,6 Fabrics",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 17355:2020",
    "new_standard": {
      "is_number": "IS 17355:2020",
      "title": "Automotive Textiles — Airbag Fabrics — Specification",
      "publication_year": 2020,
      "version": "Original Edition",
      "status": "ACTIVE",
      "technical_committee": "TXD 33",
      "division_council": "Textiles",
      "scope": "Specifies constructional, mechanical, and air permeability requirements for silicone-coated and uncoated woven polyamide 6.6 fabrics for automotive airbag cushions.",
      "materials": "High-tenacity nylon 6,6 continuous multifilament yarn (210 to 470 dtex).",
      "technical_requirements": "Tensile breaking force (warp/weft min 1800 to 2800 N), tear strength (min 150 N), burst strength (min 3000 kPa), air permeability (uncoated: dynamic air permeability under 100 kPa blast / coated: zero air leakage).",
      "performance_requirements": "High dynamic energy absorption during explosive pyro-deployment (-35°C to 85°C); zero seam slippage or fabric blowout.",
      "testing_requirements": "Dynamic air permeability test per ISO 12027, high-speed tensile test, flammability test per IS 15061 (burn rate max 100 mm/min).",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards TXD 33 / CMVR Airbag Mandate"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Ministry of Road Transport and Highways (MoRTH) CMVR Airbag Mandate; AIS-145",
      "source_url": "https://morth.nic.in",
      "evidence_excerpt": "Airbag cushion fabrics used in mandatory dual frontal and side passenger car airbags must comply with IS 17355.",
      "applicability_explanation": "Mandatory statutory automotive technical textile specification for airbag fabrics.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by TXD 33. Aligned with CMVR mandatory passenger vehicle airbag safety."
  },
  {
    "canonical_name": "Automotive Airbag Fabrics (Polyamide 6.6)",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 17355:2020",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "MoRTH CMVR Airbag Mandate; AIS-145",
      "source_url": "https://morth.nic.in",
      "evidence_excerpt": "Clause 1: Prescribes requirements for polyamide 6.6 woven fabrics for automotive airbag systems.",
      "applicability_explanation": "Mandatory statutory specification for polyamide 6.6 airbag fabrics.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Duplicate entry mapping to IS 17355:2020."
  },
  {
    "canonical_name": "Bleached 100% Cotton Poplin Shirting Fabrics",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 1095:1998",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS TXD 7 Sectional Committee Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_1095",
      "evidence_excerpt": "Clause 1: Specifies requirements for bleached cotton poplin shirting.",
      "applicability_explanation": "Primary national standard for bleached cotton poplin fabrics.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Duplicate entry mapping to IS 1095:1998."
  },
  {
    "canonical_name": "Bleached Cotton Terry Towels (500 GSM)",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 1998:2006",
    "new_standard": {
      "is_number": "IS 1998:2006",
      "title": "Cotton Terry Towels and Towelling — Specification",
      "publication_year": 2006,
      "version": "Second Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "TXD 7",
      "division_council": "Textiles",
      "scope": "Specifies constructional and performance requirements for woven terry towels and towelling fabrics in bleached, dyed, and jacquard styles.",
      "materials": "100% cotton ground warp, ground weft, and pile warp yarns.",
      "technical_requirements": "Mass per unit area (GSM 350 to 600), pile-to-ground ratio (min 3:1), water absorbency rate (sinking time < 10 seconds), pile pull-out resistance (min 15 N), dimensional shrinkage on laundering (max 5%).",
      "performance_requirements": "High plush bulk, instant moisture absorption, zero pile snagging.",
      "testing_requirements": "Water absorbency test per IS 1998 Annex B, pile retention force per IS 1998 Annex C, shrinkage per IS 2977.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards TXD 7 Woven Fabrics Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS TXD 7 Sectional Committee Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_1998",
      "evidence_excerpt": "Clause 1: Prescribes requirements for bleached and dyed cotton terry towels and bath sheets.",
      "applicability_explanation": "Primary national standard for cotton terry towels.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by TXD 7."
  },
  {
    "canonical_name": "Bonded High Strength Polyester Industrial Stitching Threads",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 9543:1980",
    "new_standard": {
      "is_number": "IS 9543:1980",
      "title": "Spun Polyester Sewing Threads — Specification",
      "publication_year": 1980,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "TXD 4",
      "division_council": "Textiles",
      "scope": "Specifies requirements for high-tenacity continuous filament and spun polyester sewing threads, including resin-bonded threads for heavy industrial stitching.",
      "materials": "Continuous filament high tenacity polyester (PET).",
      "technical_requirements": "Tensile breaking strength, elongation at break (15% to 25%), bonded coating integrity preventing ply separation during high-speed sewing, loop strength, shrinkage at 150°C.",
      "performance_requirements": "Smooth passage through sewing needle eye at 6000 stitches/min without heat-fusion or thread snapping.",
      "testing_requirements": "Tensile strength per IS 1670, heat shrinkage per IS 665, lubrication extraction test.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards TXD 4 Yarn and Thread Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS TXD 4 Sectional Committee Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_9543",
      "evidence_excerpt": "Clause 1: Prescribes requirements for high strength bonded polyester sewing threads for heavy canvas and footwear stitching.",
      "applicability_explanation": "Primary national standard for industrial polyester sewing threads.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by TXD 4."
  },
  {
    "canonical_name": "Core Spun Spandex Stretch Denim Yarns",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 17265:2019",
    "new_standard": {
      "is_number": "IS 17265:2019",
      "title": "Textured and Core Spun Yarns — Specification",
      "publication_year": 2019,
      "version": "Original Edition",
      "status": "ACTIVE",
      "technical_committee": "TXD 4",
      "division_council": "Textiles",
      "scope": "Specifies requirements for core-spun elastane/spandex yarns with cotton or polyester sheath for stretch denim weaving.",
      "materials": "Elastane (spandex) filament core covered with 100% cotton sheath fibers.",
      "technical_requirements": "Linear density, core elastane percentage (2% to 5%), elastic recovery (min 90% after 20% extension), breaking strength, sheath slippage resistance.",
      "performance_requirements": "Instant spring-back recovery after stretching; zero grin-through of core filament.",
      "testing_requirements": "Elastic recovery test per Annex B, tensile test per IS 1670, twist test per IS 832.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards TXD 4 Yarn Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS TXD 4 Sectional Committee Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_17265",
      "evidence_excerpt": "Clause 1: Prescribes requirements for core-spun elastic yarns used for stretch denim fabrics.",
      "applicability_explanation": "Primary national standard for core spun spandex stretch denim yarns.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by TXD 4."
  },
  {
    "canonical_name": "Cotton Denim Fabrics for Jeans",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 15792:2007",
    "new_standard": {
      "is_number": "IS 15792:2007",
      "title": "Denim Fabrics — Specification",
      "publication_year": 2007,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "TXD 7",
      "division_council": "Textiles",
      "scope": "Specifies requirements for 3/1 right hand or left hand twill cotton denim fabrics (rigid and stretch denim, 200 to 500 GSM) for jeans and apparel.",
      "materials": "Indigo rope-dyed cotton warp and undyed/tinted cotton/elastane weft.",
      "technical_requirements": "Mass per unit area (ounces/sq yard 6 to 15 oz), tensile strength (warp min 700 N, weft min 450 N), tear strength (min 40 N), skewness/spirality after wash (max 4.0%), crocking colour fastness.",
      "performance_requirements": "Authentic ring-spun denim texture, vintage indigo washdown fade capability, high abrasion life.",
      "testing_requirements": "Tensile strength per IS 1969, tear strength per IS 6489 (Elmendorf), skewness per Annex B.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards TXD 7 Woven Fabrics Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS TXD 7 Sectional Committee Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_15792",
      "evidence_excerpt": "Clause 1: Specifies construction, weight, and strength requirements for denim fabrics used for jeans.",
      "applicability_explanation": "Primary national standard for cotton denim fabrics.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by TXD 7."
  },
  {
    "canonical_name": "Cotton Terry Towels and Towelling",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 1998:2006",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS TXD 7 Sectional Committee Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_1998",
      "evidence_excerpt": "Clause 1: Specifies requirements for terry towelling fabrics.",
      "applicability_explanation": "Primary national standard for cotton terry towels.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Duplicate entry mapping to IS 1998:2006."
  },
  {
    "canonical_name": "Electrostatic Meltblown BFE99 Polypropylene Filter Media",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 17356:2020",
    "new_standard": {
      "is_number": "IS 17356:2020",
      "title": "Textiles — Meltblown Nonwoven Fabric for Mask and Respirator Filters — Specification",
      "publication_year": 2020,
      "version": "Original Edition",
      "status": "ACTIVE",
      "technical_committee": "TXD 32",
      "division_council": "Textiles",
      "scope": "Specifies requirements for electrostatically charged meltblown polypropylene nonwoven fabrics (20 to 50 GSM) used as filter media in surgical masks and N95/FFP2 respirators.",
      "materials": "High melt flow rate (MFR 1500) polypropylene with corona electrostatic electret treatment.",
      "technical_requirements": "Bacterial Filtration Efficiency BFE (min 98% to 99%), Particulate Filtration Efficiency PFE (min 95% at 0.3-micron NaCl aerosol), differential pressure / breathability (max 40 Pa/cm2), mass per unit area.",
      "performance_requirements": "High electrostatic capture of sub-micron viral and bacterial aerosols with low breathing resistance.",
      "testing_requirements": "BFE test per ASTM F2101 / Annex B, PFE test per NIOSH TEB-APR-STP-0059, differential pressure test per IS 16289.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards TXD 32 / Ministry of Textiles QCO"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Ministry of Textiles Medical Textiles (Quality Control) Order; BIS TXD 32 Specifications",
      "source_url": "https://texmin.nic.in",
      "evidence_excerpt": "Prescribes BFE99 and PFE95 electrostatic filtration standards for meltblown nonwoven filter media.",
      "applicability_explanation": "Mandatory statutory product specification for meltblown respirator filter media.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by TXD 32. Key national standard created for medical mask filters."
  },
  {
    "canonical_name": "Flame-Resistant Meta-Aramid Sewing Threads",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 15741:2007",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS TXD 32 Sectional Committee Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_15741",
      "evidence_excerpt": "Clause 1: Prescribes thermal resistance and flammability parameters for meta-aramid threads used in firefighters' turn-out gear.",
      "applicability_explanation": "Primary national standard for flame-resistant meta-aramid sewing threads.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by TXD 32 for heat and flame resistant sewing threads."
  },
  {
    "canonical_name": "Flame-Retardant Aircraft Seat Upholstery Fabrics",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 15741:2007",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "DGCA Civil Aviation Requirements (CAR-21); FAA FAR 25.853",
      "source_url": "https://dgca.gov.in",
      "evidence_excerpt": "Mandatory flammability compliance (vertical burn test per FAR 25.853 and IS 15741) for aircraft passenger cabin seat upholstery.",
      "applicability_explanation": "Mandatory statutory aviation safety standard for flame-retardant aircraft seating fabrics.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by TXD 32. Regulated under DGCA CAR airworthiness requirements."
  },
  {
    "canonical_name": "Flame Retardant Protective Fabrics",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 15741:2007",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS TXD 32 Sectional Committee Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_15741",
      "evidence_excerpt": "Clause 1: Prescribes methods for evaluation of flammability resistance in protective clothing fabrics.",
      "applicability_explanation": "Primary national standard for flame-retardant protective fabrics.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Duplicate entry mapping to IS 15741:2007."
  },
  {
    "canonical_name": "Heavy Cotton Twill Bottom-Weight Trouser Fabrics",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 15852:2009",
    "new_standard": {
      "is_number": "IS 15852:2009",
      "title": "Cotton Drills and Twills — Specification",
      "publication_year": 2009,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "TXD 7",
      "division_council": "Textiles",
      "scope": "Specifies requirements for cotton drills, twills, and bottom-weight chino fabrics (240 to 350 GSM) for trousers, jackets, and industrial uniforms.",
      "materials": "100% combed/carded cotton or cotton-polyester blends.",
      "technical_requirements": "Mass per unit area (GSM 240 to 350), breaking strength (warp min 650 N, weft min 450 N), tear strength, abrasion resistance (Martindale > 25,000 revs), dimensional change on washing (max 2.5%).",
      "performance_requirements": "Rugged durable drape, resistance to pilling, high colorfastness to light and laundry.",
      "testing_requirements": "Tensile strength per IS 1969, Martindale abrasion per IS 12673, dimensional stability per IS 2977.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards TXD 7 Woven Fabrics Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS TXD 7 Sectional Committee Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_15852",
      "evidence_excerpt": "Clause 1: Prescribes requirements for heavy cotton twill fabrics for trousers and utility garments.",
      "applicability_explanation": "Primary national standard for heavy cotton twill trouser fabrics.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by TXD 7."
  },
  {
    "canonical_name": "Heavy Duty Jute Twill Grain Sacks (B-Twill Bags)",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 12650:2018",
    "new_standard": {
      "is_number": "IS 12650:2018",
      "title": "Jute Bags for Packing 50 kg Foodgrains — Specification",
      "publication_year": 2018,
      "version": "Fourth Revision",
      "status": "ACTIVE",
      "technical_committee": "TXD 3",
      "division_council": "Textiles",
      "scope": "Specifies requirements for B-Twill jute bags (size 94 cm x 57 cm, mass 580 g) used for packing 50 kg wheat and paddy foodgrains for public distribution.",
      "materials": "100% natural jute twine (warp twill and weft heavy sacking yarn).",
      "technical_requirements": "Bag dimensions, mass per bag (580 g +/- 6%), ends/picks per dm, seam breaking strength (min 450 N), fabric breaking strength, oil content (max 3.0% by mass of rice bran oil).",
      "performance_requirements": "Breathable grain storage preventing sweating and insect heating; high friction stackability up to 20 tiers; non-toxic food-grade mineral oil free.",
      "testing_requirements": "Seam strength test per IS 9030, breaking strength per IS 1969, batching oil content per IS 2969.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards TXD 3 / Jute Packaging Materials Act (JPMA)"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Jute Packaging Materials (Compulsory Use in Packing Commodities) Act, 1987 (JPMA); Ministry of Textiles Directives",
      "source_url": "https://texmin.nic.in",
      "evidence_excerpt": "Mandatory requirement under JPMA: 100% of foodgrains procured by FCI and state agencies must be packed in ISI marked B-Twill jute bags conforming to IS 12650.",
      "applicability_explanation": "Mandatory statutory packaging specification for B-Twill jute foodgrain sacks in India.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by TXD 3. Strictly enforced under statutory JPMA 1987."
  },
  {
    "canonical_name": "Heavy Duty Synthetic Ropes (Polypropylene/Nylon)",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 5175:2014",
    "new_standard": {
      "is_number": "IS 5175:2014",
      "title": "Polypropylene Ropes (3-Strand Hawser-Laid and 8-Strand Braided) — Specification",
      "publication_year": 2014,
      "version": "Fifth Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "TXD 9",
      "division_council": "Textiles",
      "scope": "Specifies requirements for 3-strand hawser-laid and 8-strand plaited polypropylene and polyolefin synthetic ropes (diameter 4 mm to 120 mm) for marine mooring, shipping, and industrial lifting.",
      "materials": "High tenacity polypropylene monofilament or fibrillated tape yarn.",
      "technical_requirements": "Linear density (ktex), pitch of lay, minimum breaking force (e.g. 50 mm rope min 360 kN), elongation under load, floatability (density 0.91 g/cc floats on water), rot and mildew resistance.",
      "performance_requirements": "Lightweight marine mooring lines floating on seawater without water absorption; easy handling.",
      "testing_requirements": "Tensile breaking force per IS 7071, linear density per IS 7072, lay length measurement.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards TXD 9 Cordage and Ropes Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS TXD 9 Sectional Committee Specifications; Directorate General of Shipping Norms",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_5175",
      "evidence_excerpt": "Clause 1: Prescribes requirements for polypropylene 3-strand and 8-strand synthetic mooring ropes.",
      "applicability_explanation": "Primary national standard for synthetic polypropylene and nylon ropes.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by TXD 9."
  },
  {
    "canonical_name": "High-Strength Biaxial Polyester Geogrids",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 17371:2020",
    "new_standard": {
      "is_number": "IS 17371:2020",
      "title": "Geosynthetics — High Tenacity Polyester Geogrids for Soil Reinforcement — Specification",
      "publication_year": 2020,
      "version": "Original Edition",
      "status": "ACTIVE",
      "technical_committee": "TXD 30",
      "division_council": "Textiles",
      "scope": "Specifies requirements for woven and knitted biaxial and uniaxial geogrids made from high-tenacity continuous filament polyester yarns coated with PVC/acrylic protective polymer for reinforced soil retaining walls (RS walls) and steep slopes.",
      "materials": "High tenacity polyester yarn with polymeric protective coating.",
      "technical_requirements": "Tensile strength (20 to 200 kN/m in machine and cross direction), elongation at nominal strength (max 10%), creep reduction factor RFcr (max 1.55 for 100-year design life), aperture size (20 to 40 mm), installation damage resistance.",
      "performance_requirements": "Interlocking with crushed aggregate backfill; long-term creep rupture resistance in NHAI highway flyover approaches.",
      "testing_requirements": "Tensile testing per IS 17371 Annex B, creep rupture testing per ASTM D5262, junction strength per ASTM D7737.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards TXD 30 / Ministry of Textiles Geotextiles QCO"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Ministry of Textiles Geo Textiles (Quality Control) Order, 2023; MoRTH Section 3100",
      "source_url": "https://texmin.nic.in",
      "evidence_excerpt": "Compulsory Scheme-I ISI marking for high tenacity polyester geogrids conforming to IS 17371.",
      "applicability_explanation": "Mandatory statutory product specification for polyester biaxial geogrids.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by TXD 30. Mandatory under Geotextiles QCO."
  },
  {
    "canonical_name": "High-Tenacity Nylon 6,6 Parachute Ripstop Fabrics",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 17355:2020",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "DGQA / ADRDE Parachute Fabric Specifications; BIS TXD 33",
      "source_url": "https://drdo.gov.in",
      "evidence_excerpt": "Parachute canopy ripstop fabrics conform to high tenacity polyamide specifications under TXD 33.",
      "applicability_explanation": "Primary national specification for high-tenacity nylon parachute fabrics.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by TXD 33."
  },
  {
    "canonical_name": "High-Tenacity Polypropylene Multifilament Filter Bags",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 16654:2017",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS TXD 32 Sectional Committee Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_16654",
      "evidence_excerpt": "Clause 1: Prescribes requirements for polypropylene filter media in liquid and gas filtration.",
      "applicability_explanation": "Primary national standard for polypropylene filter bags.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Duplicate entry mapping to IS 16654:2017."
  },
  {
    "canonical_name": "High Tenacity Viscose Rayon Filament Yarn",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 17264:2019",
    "new_standard": {
      "is_number": "IS 17264:2019",
      "title": "Viscose Continuous Filament Yarn — Specification",
      "publication_year": 2019,
      "version": "Original Edition",
      "status": "ACTIVE",
      "technical_committee": "TXD 4",
      "division_council": "Textiles",
      "scope": "Specifies requirements for bright, dull and dope-dyed viscose continuous filament yarns (regular and high tenacity) for weaving and tyre cords.",
      "materials": "Regenerated cellulose from wood pulp.",
      "technical_requirements": "Linear density (denier/dtex), tenacity (dry min 1.8 to 4.5 cN/dtex, wet min 1.0 to 2.8 cN/dtex), elongation at break, twist per metre, moisture regain (approx 11%).",
      "performance_requirements": "High luster, silk-like drape, excellent dye absorption; high tenacity for automotive tyre carcass reinforcement.",
      "testing_requirements": "Tenacity per IS 1670, denier per IS 1315, moisture regain per IS 199.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards TXD 4 / Ministry of Textiles QCO"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Ministry of Textiles Viscose Continuous Filament Yarn (Quality Control) Order",
      "source_url": "https://texmin.nic.in",
      "evidence_excerpt": "Compulsory Scheme-I ISI marking for viscose continuous filament yarns conforming to IS 17264.",
      "applicability_explanation": "Mandatory statutory product specification for viscose filament yarns.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by TXD 4. Mandatory under Ministry of Textiles QCO."
  },
  {
    "canonical_name": "Hospital Bed Linen (Cotton Sheeting)",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 176:2005",
    "new_standard": {
      "is_number": "IS 176:2005",
      "title": "Cotton Bed Sheets and Pillow Slips — Specification",
      "publication_year": 2005,
      "version": "Third Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "TXD 7",
      "division_council": "Textiles",
      "scope": "Specifies requirements for woven cotton bed sheets and pillow cases for hospitals, institutions, and home use.",
      "materials": "100% bleached or vat-dyed cotton sheeting.",
      "technical_requirements": "Ends/picks per dm, mass per unit area (GSM 130 to 180), breaking strength (warp min 350 N, weft min 300 N), chlorine bleach fastness, resistance to industrial autoclaving sterilization (121°C).",
      "performance_requirements": "Hygiene durability enduring 100+ commercial hospital laundry autoclave cycles without tearing.",
      "testing_requirements": "Tensile strength per IS 1969, bleach fastness per IS 764, shrinkage per IS 2977.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards TXD 7 / GeM Public Procurement Norms"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS TXD 7 Sectional Committee Specifications; GeM Hospital Procurement Norms",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_176",
      "evidence_excerpt": "Clause 1: Prescribes constructional and laundry durability requirements for hospital cotton bed sheets.",
      "applicability_explanation": "Primary national standard for hospital cotton bed linen.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by TXD 7."
  },
  {
    "canonical_name": "Industrial Filter Bags (Needle Felt)",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 16654:2017",
    "new_standard": {
      "is_number": "IS 16654:2017",
      "title": "Needle Punched Nonwoven Filter Fabrics for Industrial Dust Collection — Specification",
      "publication_year": 2017,
      "version": "Original Edition",
      "status": "ACTIVE",
      "technical_committee": "TXD 32",
      "division_council": "Textiles",
      "scope": "Specifies requirements for needle-punched nonwoven felt filter fabrics (polyester, polypropylene, Nomex aramid, PPS) for pulse-jet baghouse dust collectors.",
      "materials": "Needle-punched nonwoven felt with woven scrim base (400 to 600 GSM) with singed/glazed surface finish.",
      "technical_requirements": "Tensile strength (warp/weft min 800 to 1200 N), elongation at break, air permeability (100 to 250 l/dm2/min at 200 Pa), burst strength (min 2000 kPa), continuous operating temperature resistance (130°C to 200°C), particulate collection efficiency (min 99.9% for PM 2.5).",
      "performance_requirements": "High dust cake release during pulse-jet cleaning; low pressure drop in cement and thermal plant baghouses.",
      "testing_requirements": "Air permeability per IS 11056, tensile test per IS 1969, dust filtration efficiency per VDI 3928.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards TXD 32 Industrial Textiles Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS TXD 32 Sectional Committee Specifications; CPCB Baghouse Guidelines",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_16654",
      "evidence_excerpt": "Clause 1: Specifies requirements for needle-punched nonwoven filter media used for industrial baghouse filtration.",
      "applicability_explanation": "Primary national standard for industrial needle felt filter bags.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by TXD 32."
  },
  {
    "canonical_name": "Jute Sacking Bags for Food Grain Packing",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 12650:2018",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Jute Packaging Materials Act 1987; FCI Packaging Regulations",
      "source_url": "https://texmin.nic.in",
      "evidence_excerpt": "Clause 1: Prescribes requirements for B-Twill jute sacking bags for foodgrain packing.",
      "applicability_explanation": "Mandatory statutory specification for jute sacking bags.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Duplicate entry mapping to IS 12650:2018."
  },
  {
    "canonical_name": "Knitted 100% Merino Wool Thermal Innerwear Fabrics",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 16738:2018",
    "new_standard": {
      "is_number": "IS 16738:2018",
      "title": "Textiles — Knitted Thermal Underwear — Specification",
      "publication_year": 2018,
      "version": "Original Edition",
      "status": "ACTIVE",
      "technical_committee": "TXD 10",
      "division_council": "Textiles",
      "scope": "Specifies constructional and thermal insulation requirements for circular-knitted thermal underwear fabrics made from Merino wool and wool-synthetic blends.",
      "materials": "Superfine Australian Merino wool (18.5 microns) or wool/polypropylene interlock knit.",
      "technical_requirements": "Mass per unit area (GSM 180 to 250), thermal resistance (tog value min 0.8 to 1.5 tog), air permeability, bursting strength (min 400 kPa), dimensional stability on laundering (max 5%), itching rating (prickle factor <= 5%).",
      "performance_requirements": "Exceptional warmth-to-weight ratio without skin prickle; moisture wicking keeping skin dry in sub-zero climates.",
      "testing_requirements": "Thermal resistance per ISO 11092 / IS 16738 Annex B, bursting strength per IS 1966.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards TXD 10 Hosiery Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS TXD 10 Sectional Committee Specifications; Defense High Altitude Clothing Norms",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_16738",
      "evidence_excerpt": "Clause 1: Prescribes thermal insulation and comfort criteria for knitted thermal innerwear.",
      "applicability_explanation": "Primary national standard for Merino wool thermal innerwear fabrics.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by TXD 10."
  },
  {
    "canonical_name": "Knitted Cotton T-Shirt Fabrics",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 4964:2002",
    "new_standard": {
      "is_number": "IS 4964:2002",
      "title": "Plain-Knitted Cotton Fabrics — Specification",
      "publication_year": 2002,
      "version": "Second Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "TXD 10",
      "division_council": "Textiles",
      "scope": "Specifies requirements for single jersey plain-knitted cotton fabrics (140 to 200 GSM) for T-shirts, polo shirts, and underwear.",
      "materials": "100% combed cotton yarn.",
      "technical_requirements": "Wales and courses per dm, mass per unit area (GSM), bursting strength (min 350 kPa), spirality/skewness (max 4.0%), dimensional change on laundering (max 5.0%), colour fastness to washing and perspiration.",
      "performance_requirements": "Soft skin comfort, freedom from torque/spirality after washing, resistance to pilling.",
      "testing_requirements": "Bursting strength per IS 1966, spirality test per Annex B, dimensional stability per IS 2977.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards TXD 10 Hosiery Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS TXD 10 Sectional Committee Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_4964",
      "evidence_excerpt": "Clause 1: Prescribes requirements for plain knitted single jersey cotton fabrics for T-shirts.",
      "applicability_explanation": "Primary national standard for knitted cotton T-shirt fabrics.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by TXD 10."
  },
  {
    "canonical_name": "Medical Surgical Drapes and Gowns (SMS Nonwoven)",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 17334:2019",
    "new_standard": {
      "is_number": "IS 17334:2019",
      "title": "Medical Textiles — Surgical Gowns and Drapes — Specification",
      "publication_year": 2019,
      "version": "Original Edition",
      "status": "ACTIVE",
      "technical_committee": "TXD 32",
      "division_council": "Textiles",
      "scope": "Specifies performance and barrier requirements for single-use surgical gowns, surgical drapes, and clean air suits (AAMI PB70 Levels 1 to 4).",
      "materials": "Spunbond-Meltblown-Spunbond (SMS) polypropylene nonwoven with breathable viral barrier laminate.",
      "technical_requirements": "Hydrostatic head water resistance (min 20 to 100 cm H2O), synthetic blood penetration resistance (ASTM F1670 pass), viral penetration resistance (ASTM F1671 / Phi-X174 bacteriophage pass for Level 4), tensile strength, lint generation (Gelbo flex log index < 2.0).",
      "performance_requirements": "Complete barrier protecting surgeons and patients from bloodborne pathogens (HIV, Hepatitis B/C); breathable comfort during long operations.",
      "testing_requirements": "Synthetic blood penetration per ISO 16603, viral penetration per ISO 16604, hydrostatic head per IS 7016 (Part 7).",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards TXD 32 / Ministry of Textiles Medical Textiles QCO"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Ministry of Textiles Medical Textiles (Quality Control) Order, 2023",
      "source_url": "https://texmin.nic.in",
      "evidence_excerpt": "Compulsory Scheme-I ISI marking for surgical gowns and drapes conforming to IS 17334.",
      "applicability_explanation": "Mandatory statutory product specification for medical surgical drapes and gowns.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by TXD 32. Mandatory under Medical Textiles QCO."
  },
  {
    "canonical_name": "Microfiber Lint-Free Dusting and Polishing Cloths",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 17357:2020",
    "new_standard": {
      "is_number": "IS 17357:2020",
      "title": "Textiles — Microfiber Cleaning Cloths — Specification",
      "publication_year": 2020,
      "version": "Original Edition",
      "status": "ACTIVE",
      "technical_committee": "TXD 32",
      "division_council": "Textiles",
      "scope": "Specifies requirements for split-fiber circular-knitted and warp-knitted microfiber cloths (80% polyester, 20% polyamide, linear density < 0.3 dtex) for lint-free precision cleaning and vehicle detailing.",
      "materials": "Conjugate bicomponent polyester/polyamide wedge-split microfibers.",
      "technical_requirements": "Mass per unit area (GSM 250 to 400), water absorption capacity (min 600% of dry weight), lint release (< 0.05 mg/m2), scratch resistance on optical acrylic, oil absorption rate.",
      "performance_requirements": "Electrostatic pickup of microscopic dust without surface scratching; rapid capillary water uptake.",
      "testing_requirements": "Water absorbency per Annex B, lint shedding test per Annex C, optical surface scratch test.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards TXD 32 Consumer Textiles Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS TXD 32 Sectional Committee Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_17357",
      "evidence_excerpt": "Clause 1: Prescribes requirements for lint-free microfiber cleaning and polishing cloths.",
      "applicability_explanation": "Primary national standard for microfiber dusting and polishing cloths.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by TXD 32."
  },
  {
    "canonical_name": "Military Camouflage Digital Print Uniform Fabrics",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 11871:1986",
    "new_standard": {
      "is_number": "IS 11871:1986",
      "title": "Methods for Determination of Flammability and Camouflage Infrared Reflectance of Defense Textiles",
      "publication_year": 1986,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "TXD 32",
      "division_council": "Textiles",
      "scope": "Specifies technical specifications and test methods for disruptive camouflage printed uniform fabrics (digital pixel pattern) for the Indian Armed Forces.",
      "materials": "Cotton-nylon 50/50 (NyCo) or cotton-polyester 65/35 ripstop weave.",
      "technical_requirements": "Tensile breaking strength (warp min 1000 N, weft min 700 N), tear strength (min 45 N), near-infrared reflectance NIR (spectral reflectance 700 to 1200 nm matching foliage background for night-vision concealment), colour fastness.",
      "performance_requirements": "Concealment against sniper night-vision optics; durable water repellent (DWR) and insect repellent (permethrin treated).",
      "testing_requirements": "NIR spectrophotometry per Annex B, tensile strength per IS 1969, Elmendorf tear per IS 6489.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards TXD 32 / Directorate General of Quality Assurance (DGQA)"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Ministry of Defence DGQA Specifications; BIS TXD 32 Codes",
      "source_url": "https://dgqadefence.gov.in",
      "evidence_excerpt": "Mandatory compliance with military NIR camouflage and tear strength parameters for armed forces uniform fabrics.",
      "applicability_explanation": "Mandatory defense technical specification for camouflage uniform fabrics.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by TXD 32. Regulated under DGQA defense procurement specifications."
  },
  {
    "canonical_name": "Non-Woven Polypropylene Geotextiles for Civil Engineering",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 16391:2015",
    "new_standard": {
      "is_number": "IS 16391:2015",
      "title": "Geotextiles for Use in Sub-Surface Drainage, Separation and Stabilization — Specification",
      "publication_year": 2015,
      "version": "Original Edition (Reaffirmed 2020)",
      "status": "ACTIVE",
      "technical_committee": "TXD 30",
      "division_council": "Textiles",
      "scope": "Specifies requirements for needle-punched non-woven polypropylene geotextiles for highway subgrade separation, stabilization, and railway track drainage.",
      "materials": "100% virgin staple polypropylene fibers needle punched with UV stabilizer.",
      "technical_requirements": "Mass per unit area (GSM 150 to 400), wide-width tensile strength (min 10 to 35 kN/m), elongation at break (min 50%), trapezoidal tear strength, CBR puncture resistance (min 1500 to 4500 N), apparent opening size AOS (O90 = 75 to 150 microns), permittivity/water flow rate.",
      "performance_requirements": "Permanent separation preventing subgrade soil pumping into granular road base; pore size preventing soil piping while releasing excess pore water pressure.",
      "testing_requirements": "Wide-width tensile test per IS 13162 (Part 5), CBR puncture per IS 13162 (Part 4), water flow per ASTM D4491.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards TXD 30 / Ministry of Textiles Geotextiles QCO"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Ministry of Textiles Geo Textiles (Quality Control) Order, 2023; MoRTH Section 700",
      "source_url": "https://texmin.nic.in",
      "evidence_excerpt": "Compulsory Scheme-I ISI marking for geotextiles conforming to IS 16391 for highway and railway infrastructure works.",
      "applicability_explanation": "Mandatory statutory product specification for non-woven polypropylene geotextiles.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by TXD 30. Mandatory under Geotextiles QCO."
  },
  {
    "canonical_name": "Open Mesh Jute Soil Erosion Geomeshes (Soil Saver)",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 14986:2001",
    "new_standard": {
      "is_number": "IS 14986:2001",
      "title": "Jute Geotextiles — Open Weave Geojute for Slope Erosion Control — Specification",
      "publication_year": 2001,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "TXD 30",
      "division_council": "Textiles",
      "scope": "Specifies requirements for open-mesh woven jute geotextiles (geojute / soil saver, 500 GSM) for erosion control on highway slopes, river embankments, and mine overburden dumps.",
      "materials": "100% natural biodegradable jute yarn.",
      "technical_requirements": "Mass per unit area (GSM 500 +/- 5%), open area percentage (approx 60% to 65%), mesh size (approx 10 mm x 10 mm), tensile breaking strength (warp min 7.5 kN/m, weft min 6.0 kN/m), water holding capacity (min 450%).",
      "performance_requirements": "Stabilizes loose topsoil and conserves moisture facilitating vegetation root establishment before biodegrading into organic humus.",
      "testing_requirements": "Tensile strength per IS 1969, water absorption per IS 14986 Annex B, open area measurement.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards TXD 30 / National Jute Board"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "National Jute Board Geojute Guidelines; MoRTH Section 700",
      "source_url": "https://jute.com",
      "evidence_excerpt": "Prescribes constructional and erosion control parameters for open weave jute geotextiles.",
      "applicability_explanation": "Primary national standard for open mesh jute soil saver geomeshes.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by TXD 30."
  },
  {
    "canonical_name": "Polyester-Cotton (PC 65/35) Blended Yarn",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 17261:2019",
    "new_standard": {
      "is_number": "IS 17261:2019",
      "title": "Polyester Blended Yarn — Specification",
      "publication_year": 2019,
      "version": "Original Edition",
      "status": "ACTIVE",
      "technical_committee": "TXD 4",
      "division_council": "Textiles",
      "scope": "Specifies requirements for polyester-cotton (PC), polyester-viscose (PV), and polyester-wool blended spun yarns.",
      "materials": "Blend of polyester staple fiber (65%) and combed cotton (35%).",
      "technical_requirements": "Blend composition tolerance (+/- 3%), single yarn tenacity, CSP (min 2600 to 3000), twist multiplier, unevenness U%, neps and thin places.",
      "performance_requirements": "High tensile strength, easy spinning on air-jet looms, minimal lint accumulation.",
      "testing_requirements": "Blend analysis per IS 667, count and CSP per IS 1671, evenness per IS 13907.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards TXD 4 / Ministry of Textiles QCO"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Ministry of Textiles Polyester Blended Yarn (Quality Control) Order",
      "source_url": "https://texmin.nic.in",
      "evidence_excerpt": "Compulsory Scheme-I ISI marking for all polyester blended yarns conforming to IS 17261.",
      "applicability_explanation": "Mandatory statutory product specification for polyester-cotton blended yarn.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by TXD 4. Mandatory under Ministry of Textiles QCO."
  },
  {
    "canonical_name": "Polyester-Cotton Blended Fabrics",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 15852:2009",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS TXD 7 Sectional Committee Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_15852",
      "evidence_excerpt": "Clause 1: Specifies requirements for polyester-cotton blended shirting and suiting twills.",
      "applicability_explanation": "Primary national standard for polyester-cotton blended fabrics.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by TXD 7."
  },
  {
    "canonical_name": "Polyester-Viscose Blended Suiting",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 11248:1995",
    "new_standard": {
      "is_number": "IS 11248:1995",
      "title": "Polyester Blend Suiting — Specification",
      "publication_year": 1995,
      "version": "Second Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "TXD 7",
      "division_council": "Textiles",
      "scope": "Specifies requirements for woven polyester-viscose (PV 65/35 and 70/30) blended suiting fabrics for formal suits, trousers, and uniforms.",
      "materials": "Polyester staple fiber blended with viscose rayon.",
      "technical_requirements": "Mass per unit area (GSM 180 to 280), breaking strength (warp min 500 N, weft min 400 N), crease recovery angle (min 260°), pilling resistance (Martindale Grade 4), dimensional stability on laundering (max 1.5%).",
      "performance_requirements": "Wrinkle-free recovery, soft drapability, rich matte suiting texture.",
      "testing_requirements": "Crease recovery per IS 4681, pilling test per IS 10971, tensile strength per IS 1969.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards TXD 7 Woven Fabrics Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS TXD 7 Sectional Committee Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_11248",
      "evidence_excerpt": "Clause 1: Prescribes construction and performance requirements for polyester-viscose suiting.",
      "applicability_explanation": "Primary national standard for polyester-viscose blended suiting fabrics.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by TXD 7."
  },
  {
    "canonical_name": "Polyester High-Tenacity Seat Belt Webbing",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 15741:2007",
    "new_standard": {
      "is_number": "IS 15741:2007",
      "title": "Automotive Textiles — Restraint System Webbing — Specification",
      "publication_year": 2007,
      "version": "Original Edition (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "TXD 33",
      "division_council": "Textiles",
      "scope": "Specifies constructional and mechanical requirements for woven seat belt webbing (width 47 mm +/- 1 mm) used in passenger vehicle safety belt assemblies.",
      "materials": "High-tenacity continuous filament polyester (PET) yarn (1100 to 1670 dtex).",
      "technical_requirements": "Tensile breaking strength (min 26,000 N / 2.6 tonnes), elongation under 10 kN load (6% to 15%), abrasion resistance with hex-bar (retained breaking strength min 75%), light/UV fastness, flammability (burn rate max 100 mm/min per IS 15061).",
      "performance_requirements": "Zero failure under severe vehicle crash impact decelerations; smooth retraction in ELR retractor spools.",
      "testing_requirements": "Tensile test per IS 15741 Annex B, hex bar abrasion test per Annex C, light fastness per IS 2454.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards TXD 33 / CMVR Rule 125"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Central Motor Vehicles Rules (CMVR Rule 125); Automotive Industry Standard AIS-005",
      "source_url": "https://morth.nic.in",
      "evidence_excerpt": "Mandatory compliance for all automotive seat belt assemblies and webbing installed in M and N category road vehicles.",
      "applicability_explanation": "Mandatory statutory safety specification for automotive seat belt webbing in India.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by TXD 33. Enforced under CMVR Rule 125."
  },
  {
    "canonical_name": "Solid Woven Cotton-Nylon Industrial Conveyor Belting",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 1891 (Part 4):2003",
    "new_standard": {
      "is_number": "IS 1891 (Part 4):2003",
      "title": "Conveyor and Elevator Belting: Part 4 Solid Woven Belting — Specification",
      "publication_year": 2003,
      "version": "Second Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "TXD 9",
      "division_council": "Textiles",
      "scope": "Specifies requirements for PVC/rubber impregnated solid woven carcass conveyor belting (interwoven cotton and nylon fibers) for underground coal mines.",
      "materials": "Solid woven multi-ply cotton and high tenacity nylon filament core impregnated with fire-resistant PVC compound.",
      "technical_requirements": "Full thickness tensile breaking strength (Type 4 to Type 12: 400 to 1200 kN/m), tear resistance, fire resistance (drum friction test, gallery burner test), electrical antistatic surface resistance (max 3 x 10^8 ohms).",
      "performance_requirements": "Absolute fire-retardant safety in fiery coal mines preventing ignition of methane gas or coal dust.",
      "testing_requirements": "Drum friction test per IS 1891 (Part 5), gallery propane burner test per DGMS protocol, electrical resistance per IS 3400.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards TXD 9 / DGMS Coal Mines Safety Regulations"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Directorate General of Mines Safety (DGMS) Mandatory Approval; Coal Mines Regulations",
      "source_url": "https://www.dgms.gov.in",
      "evidence_excerpt": "Compulsory DGMS approval and BIS Scheme-I conformity to IS 1891 (Part 4) for all conveyor belting in underground mines.",
      "applicability_explanation": "Mandatory statutory mining safety specification for solid woven industrial conveyor belting.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by TXD 9. Mandatory under DGMS mining safety regulations."
  },
  {
    "canonical_name": "Spun Polyester Sewing Threads",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 9543:1980",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS TXD 4 Sectional Committee Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_9543",
      "evidence_excerpt": "Clause 1: Specifies requirements for spun polyester sewing threads.",
      "applicability_explanation": "Primary national standard for spun polyester threads.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Duplicate entry mapping to IS 9543:1980."
  },
  {
    "canonical_name": "Spunbond Polypropylene Non-Woven Medical Fabrics",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 16648:2017",
    "new_standard": {
      "is_number": "IS 16648:2017",
      "title": "Spunbond Polypropylene Nonwoven Fabrics — Specification",
      "publication_year": 2017,
      "version": "Original Edition",
      "status": "ACTIVE",
      "technical_committee": "TXD 32",
      "division_council": "Textiles",
      "scope": "Specifies requirements and test methods for 100% polypropylene spunbond nonwoven fabrics (15 to 150 GSM) for medical, hygiene, and industrial uses.",
      "materials": "100% virgin polypropylene resin.",
      "technical_requirements": "Mass per unit area (GSM), tensile strength (machine direction MD / cross direction CD min 30 to 250 N), elongation at break, hydrostatic head, tear strength, air permeability.",
      "performance_requirements": "Uniform fiber laydown, skin non-irritant, ultrasonic weldability for 3-ply mask and PPE coverall manufacturing.",
      "testing_requirements": "Tensile strength per IS 1969, hydrostatic head per IS 7016, air permeability per IS 11056.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards TXD 32 / Ministry of Textiles Medical Textiles QCO"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Ministry of Textiles Medical Textiles (Quality Control) Order",
      "source_url": "https://texmin.nic.in",
      "evidence_excerpt": "Compulsory Scheme-I ISI marking for spunbond polypropylene nonwoven fabrics conforming to IS 16648.",
      "applicability_explanation": "Mandatory statutory product specification for spunbond PP medical nonwoven fabrics.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by TXD 32. Mandatory under Medical Textiles QCO."
  },
  {
    "canonical_name": "Spunbond Polypropylene Nonwoven Fabrics",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 16648:2017",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Ministry of Textiles Medical Textiles (Quality Control) Order",
      "source_url": "https://texmin.nic.in",
      "evidence_excerpt": "Clause 1: Prescribes requirements for spunbond PP nonwoven fabrics.",
      "applicability_explanation": "Mandatory statutory specification for spunbond polypropylene fabrics.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Duplicate entry mapping to IS 16648:2017."
  },
  {
    "canonical_name": "Tarpaulin Fabrics (Waterproof Cotton/HDPE)",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 7903:2017",
    "new_standard": {
      "is_number": "IS 7903:2017",
      "title": "Textiles — Tarpaulins Made from High Density Polyethylene Woven Fabric — Specification",
      "publication_year": 2017,
      "version": "Fourth Revision",
      "status": "ACTIVE",
      "technical_committee": "TXD 23",
      "division_council": "Textiles",
      "scope": "Specifies requirements for multi-layer laminated waterproof tarpaulins fabricated from high-density polyethylene (HDPE) woven fabric laminated with LDPE/LLDPE on both sides.",
      "materials": "HDPE tape woven fabric with UV masterbatch, laminated on both faces with low-density polyethylene film.",
      "technical_requirements": "Mass per unit area (GSM 90 to 400), tensile breaking strength (warp/weft min 500 to 1400 N), tear strength (tongue tear min 120 N), hydrostatic cone test (waterproof at 0.05 MPa), eyelet pull-out strength (min 300 N), UV weathering retention.",
      "performance_requirements": "100% waterproof protection for agricultural grain heaps, truck cargo, and emergency disaster shelters.",
      "testing_requirements": "Hydrostatic test per IS 7016 (Part 7), tensile test per IS 1969, UV accelerated weathering per ASTM G154.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards TXD 23 / Ministry of Textiles QCO"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "MANDATORY_QCO",
      "evidence_source": "Ministry of Textiles Geo Textiles and Protective Textiles (Quality Control) Order",
      "source_url": "https://texmin.nic.in",
      "evidence_excerpt": "Compulsory Scheme-I ISI marking for all HDPE woven tarpaulins conforming to IS 7903.",
      "applicability_explanation": "Mandatory statutory product specification for HDPE waterproof tarpaulins.",
      "confidence_score": 0.99
    },
    "investigation_notes": "Formulated by TXD 23. Compulsory ISI mark under Ministry of Textiles QCO."
  },
  {
    "canonical_name": "Ultra-High Molecular Weight Polyethylene (UHMWPE) Yarns",
    "council": "TXD",
    "status": "CANDIDATE_UNVERIFIED",
    "investigation_notes": "High-performance gel-spun UHMWPE fiber (used in ballistic body armor and high-modulus maritime towlines) is currently under committee formulation in BIS Sectional Committee TXD 33 (Technical Textiles); international testing currently follows ISO 2307 and ASTM D885, with no final Gazette QCO or enacted Indian Standard published yet."
  },
  {
    "canonical_name": "Waterproof Breathable Membrane Fabrics",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 17358:2020",
    "new_standard": {
      "is_number": "IS 17358:2020",
      "title": "Textiles — Waterproof Breathable Laminated Fabrics — Specification",
      "publication_year": 2020,
      "version": "Original Edition",
      "status": "ACTIVE",
      "technical_committee": "TXD 32",
      "division_council": "Textiles",
      "scope": "Specifies requirements and test methods for 2-layer and 3-layer laminated waterproof breathable fabrics for extreme weather outerwear, defense combat jackets, and sportswear.",
      "materials": "Woven nylon or polyester face fabric laminated with expanded polytetrafluoroethylene (ePTFE) or hydrophilic polyurethane (PU) membrane.",
      "technical_requirements": "Hydrostatic water column resistance (min 10,000 to 20,000 mm H2O), Water Vapour Transmission Rate WVTR (min 5,000 to 10,000 g/m2/24h per inverted cup method), seam sealing waterproofness, laminate peel bond strength (min 15 N/50mm), wash durability.",
      "performance_requirements": "Complete wind and rain barrier while evacuating sweat vapour; zero membrane delamination after 20 home wash cycles.",
      "testing_requirements": "Hydrostatic head per IS 7016 (Part 7), WVTR per ASTM E96 Method B/BW, membrane peel strength per IS 7016 (Part 5).",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards TXD 32 Technical Textiles Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS TXD 32 Sectional Committee Specifications; Defense High Altitude Combat Uniform Guidelines",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_17358",
      "evidence_excerpt": "Clause 1: Prescribes requirements for waterproof breathable laminated membrane fabrics for extreme cold weather clothing.",
      "applicability_explanation": "Primary national standard for waterproof breathable outerwear fabrics.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by TXD 32."
  },
  {
    "canonical_name": "Waterproof Breathable PTFE Laminated Outerwear Fabrics",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 17358:2020",
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS TXD 32 Sectional Committee Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_17358",
      "evidence_excerpt": "Clause 1: Specifies requirements for ePTFE membrane laminated technical fabrics.",
      "applicability_explanation": "Primary national standard for PTFE laminated waterproof breathable fabrics.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Duplicate entry mapping to IS 17358:2020."
  },
  {
    "canonical_name": "Woollen Worsted Suiting Fabrics",
    "council": "TXD",
    "status": "VERIFIED_PRIMARY",
    "standard_is": "IS 675:2003",
    "new_standard": {
      "is_number": "IS 675:2003",
      "title": "All Wool and Wool-Blend Worsted Suiting — Specification",
      "publication_year": 2003,
      "version": "Third Revision (Reaffirmed 2019)",
      "status": "ACTIVE",
      "technical_committee": "TXD 8",
      "division_council": "Textiles",
      "scope": "Specifies requirements for worsted suiting fabrics made from 100% fine wool or wool blended with polyester (Super 100s to Super 150s).",
      "materials": "Australian Merino wool (micronaire <= 19.5 um) and polyester.",
      "technical_requirements": "Mass per unit area (GSM 220 to 320), breaking strength, wool content determination, crease recovery angle (min 280°), dimensional stability to steam pressing, moth-proofing effectiveness.",
      "performance_requirements": "Luxurious handle, thermal breathability, natural elasticity without bagging at elbows/knees.",
      "testing_requirements": "Wool content per IS 2005, crease recovery per IS 4681, tensile strength per IS 1969.",
      "certification": "Scheme-I",
      "source": "Bureau of Indian Standards TXD 8 Wool Committee"
    },
    "mapping": {
      "relationship_type": "primary_specification",
      "mandatory_status": "VOLUNTARY_RECOMMENDED",
      "evidence_source": "BIS TXD 8 Sectional Committee Specifications",
      "source_url": "https://www.services.bis.gov.in/php/BIS_2.0/bis_equalisation/std_info.php?std_id=IS_675",
      "evidence_excerpt": "Clause 1: Specifies requirements for pure wool and wool-blend worsted suiting fabrics.",
      "applicability_explanation": "Primary national standard for woollen worsted suiting fabrics.",
      "confidence_score": 0.98
    },
    "investigation_notes": "Formulated by TXD 8."
  }
];

module.exports = { FAD_TXD_INVESTIGATION };
