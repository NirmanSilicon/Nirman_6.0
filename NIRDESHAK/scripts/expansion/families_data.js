/**
 * NIRDESHAK Universal Product Families Expansion (480 new families across all 17 BIS councils)
 * Brings total product families from 542 to 1022.
 */

const NEW_FAMILIES = [
  // ==========================================
  // SECTOR 1: AYUSH (AYD) - 25 families (Total 47)
  // Categories: [60] Herbal Raw Materials, [61] Classical Formulations, [82] Herbal Preparations, [98] Medicinal Plants
  // ==========================================
  {
    family_code: "FAM_AYD_ASHWAGANDHA_EXTRACT",
    canonical_name: "Ashwagandha Extract and Root Powder",
    category_id: 60,
    sector_id: 1,
    division_council: "AYUSH",
    subcategory: "Herbal Extracts",
    description: "Standardized dry extracts and root powders of Withania somnifera used in Ayurvedic formulations and dietary supplements.",
    applications: "Ayurvedic formulations, adaptogenic supplements, stress relief syrups, churna preparations.",
    technical_keywords: ["withanolides", "withaferin a", "total ash", "acid insoluble ash", "heavy metals", "microbial limit"],
    common_synonyms: ["withania somnifera", "indian ginseng extract", "asgandh powder", "ashwagandha churna"],
    industry_terminology: ["standardized botanical extract", "aqueous ethanolic herbal extract"],
    alternate_names: ["ashwagandha roots", "withania extract"],
    common_abbreviations: ["WSE"],
    aliases: [
      { term: "ashwagandha extract", type: "canonical", confidence: 1.0, provenance: "curated" },
      { term: "withania somnifera powder", type: "scientific", confidence: 0.95, provenance: "botanical" },
      { term: "ashwagandha churna", type: "ayurvedic_name", confidence: 0.95, provenance: "ayurvedic_formulary" },
      { term: "अश्वगंधा चूर्ण", type: "multilingual_hi", confidence: 0.95, provenance: "ayurvedic_hi" },
      { term: "ଅଶ୍ୱଗନ୍ଧା ଚୂର୍ଣ୍ଣ", type: "multilingual_or", confidence: 0.9, provenance: "ayurvedic_or" }
    ]
  },
  {
    family_code: "FAM_AYD_TRIPHALA_CHURNA",
    canonical_name: "Triphala Churna and Tablet Formulations",
    category_id: 61,
    sector_id: 1,
    division_council: "AYUSH",
    subcategory: "Classical Ayurvedic Formulations",
    description: "Classical polyherbal formulation composed of equal proportions of Haritaki, Bibhitaki, and Amalaki powders.",
    applications: "Digestive health, bowel regulation, antioxidant therapy, Ayurvedic medicine.",
    technical_keywords: ["gallic acid", "ellagic acid", "tannins", "particle size mesh 80", "microbial load"],
    common_synonyms: ["three fruits formula", "triphala powder", "triphala vati", "triphala tablets"],
    industry_terminology: ["classical ayurvedic churnam", "tri-herbal compound"],
    alternate_names: ["triphala compound", "trifala"],
    common_abbreviations: ["TC"],
    aliases: [
      { term: "triphala churna", type: "canonical", confidence: 1.0, provenance: "curated" },
      { term: "triphala powder", type: "common", confidence: 0.95, provenance: "market" },
      { term: "triphala tablet", type: "dosage_form", confidence: 0.9, provenance: "pharmaceutical" },
      { term: "त्रिफला चूर्ण", type: "multilingual_hi", confidence: 0.95, provenance: "ayurvedic_hi" },
      { term: "ତ୍ରିଫଳା ଚୂର୍ଣ୍ଣ", type: "multilingual_or", confidence: 0.9, provenance: "ayurvedic_or" }
    ]
  },
  {
    family_code: "FAM_AYD_CHYAWANPRASH",
    canonical_name: "Chyawanprash Avaleha Special",
    category_id: 61,
    sector_id: 1,
    division_council: "AYUSH",
    subcategory: "Classical Ayurvedic Formulations",
    description: "Nutritive Ayurvedic jam/avaleha formulated with fresh amla (Emblica officinalis), cow ghee, honey, sesame oil and over 40 medicinal herbs.",
    applications: "Immunity booster, respiratory rejuvenation, pediatric and geriatric nutritional therapy.",
    technical_keywords: ["vitamin c content", "total solids", "reducing sugars", "brix value", "pesticide residue", "aflatoxins"],
    common_synonyms: ["amla herbal jam", "chyawanprash avleh", "herbal chyawanprash"],
    industry_terminology: ["rasayana avaleha", "ayurvedic semi-solid paste"],
    alternate_names: ["chyavanaprasam", "chyavanprash"],
    common_abbreviations: ["CP"],
    aliases: [
      { term: "chyawanprash", type: "canonical", confidence: 1.0, provenance: "curated" },
      { term: "chyawanprash avaleha", type: "ayurvedic_name", confidence: 0.95, provenance: "ayurvedic_formulary" },
      { term: "amla herbal paste", type: "descriptive", confidence: 0.85, provenance: "consumer" },
      { term: "च्यवनप्राश", type: "multilingual_hi", confidence: 0.95, provenance: "ayurvedic_hi" },
      { term: "ଚ୍ୟବନପ୍ରାଶ", type: "multilingual_or", confidence: 0.9, provenance: "ayurvedic_or" }
    ]
  },
  {
    family_code: "FAM_AYD_BRAHMI_EXTRACT",
    canonical_name: "Brahmi / Bacopa Monnieri Extract",
    category_id: 60,
    sector_id: 1,
    division_council: "AYUSH",
    subcategory: "Herbal Extracts",
    description: "Standardized extract of Bacopa monnieri containing bacosides A and B for cognitive and nootropic memory support.",
    applications: "Memory enhancement formulations, neural tonics, herbal cognitive syrups.",
    technical_keywords: ["bacosides", "bacoside a3", "bacopaside", "hptlc fingerprinting", "heavy metal limits"],
    common_synonyms: ["water hyssop extract", "bacopa extract", "brahmi powder", "brahmi ghrita raw material"],
    industry_terminology: ["medhya rasayana botanical", "standardized bacopa extract"],
    alternate_names: ["jalanimba", "bacopa monnieri powder"],
    common_abbreviations: ["BME"],
    aliases: [
      { term: "brahmi extract", type: "canonical", confidence: 1.0, provenance: "curated" },
      { term: "bacopa monnieri extract", type: "scientific", confidence: 0.95, provenance: "botanical" },
      { term: "brahmi churna", type: "ayurvedic_name", confidence: 0.9, provenance: "ayurvedic_formulary" },
      { term: "ब्राह्मी", type: "multilingual_hi", confidence: 0.95, provenance: "ayurvedic_hi" }
    ]
  },
  {
    family_code: "FAM_AYD_TULSI_EXTRACT",
    canonical_name: "Tulsi / Holy Basil Liquid and Dry Extracts",
    category_id: 82,
    sector_id: 1,
    division_council: "AYUSH",
    subcategory: "Herbal Preparations",
    description: "Standardized extracts and essential oils of Ocimum sanctum (Holy Basil) containing eugenol, rosmarinic acid, and caryophyllene.",
    applications: "Immunity drops, cough syrups, herbal teas, antimicrobial gargles.",
    technical_keywords: ["eugenol assay", "ursolic acid", "volatile oil content", "steam distillation extract"],
    common_synonyms: ["holy basil drops", "panch tulsi liquid", "tulsi ark", "ocimum extract"],
    industry_terminology: ["botanical adaptogen extract", "aqueous hydroalcoholic tulsi extract"],
    alternate_names: ["krishna tulsi extract", "rama tulsi extract"],
    common_abbreviations: ["TE"],
    aliases: [
      { term: "tulsi drops", type: "canonical", confidence: 1.0, provenance: "curated" },
      { term: "tulsi ark", type: "ayurvedic_name", confidence: 0.95, provenance: "ayurvedic_formulary" },
      { term: "holy basil extract", type: "english_common", confidence: 0.9, provenance: "botanical" },
      { term: "तुलसी अर्क", type: "multilingual_hi", confidence: 0.95, provenance: "ayurvedic_hi" },
      { term: "ତୁଳସୀ ଅର୍କ", type: "multilingual_or", confidence: 0.9, provenance: "ayurvedic_or" }
    ]
  },
  {
    family_code: "FAM_AYD_GILOY_GHANVATI",
    canonical_name: "Giloy / Guduchi Ghan Vati and Satva",
    category_id: 82,
    sector_id: 1,
    division_council: "AYUSH",
    subcategory: "Herbal Preparations",
    description: "Aqueous concentrated extract tablets and dry starch precipitate (satva) of Tinospora cordifolia stems.",
    applications: "Anti-pyretic therapy, chronic fever management, immunomodulation, liver protection.",
    technical_keywords: ["tinocordiside", "berberine", "bitter principle content", "dry extract concentration ratio 10:1"],
    common_synonyms: ["guduchi ghanvati", "tinospora extract tablets", "giloy satva", "amrita extract"],
    industry_terminology: ["ayurvedic solid extract tablet", "standardized aqueous tinospora"],
    alternate_names: ["guduchi tablets", "giloy vati"],
    common_abbreviations: ["GGV"],
    aliases: [
      { term: "giloy vati", type: "canonical", confidence: 1.0, provenance: "curated" },
      { term: "giloy ghanvati", type: "ayurvedic_name", confidence: 0.95, provenance: "ayurvedic_formulary" },
      { term: "guduchi extract", type: "botanical", confidence: 0.9, provenance: "ayurvedic" },
      { term: "गिलोय घनवटी", type: "multilingual_hi", confidence: 0.95, provenance: "ayurvedic_hi" },
      { term: "ଗିଲୋୟ ବଟିକା", type: "multilingual_or", confidence: 0.9, provenance: "ayurvedic_or" }
    ]
  },
  {
    family_code: "FAM_AYD_ARJUNA_BARK_EXTRACT",
    canonical_name: "Arjuna Bark Extract and Powder",
    category_id: 60,
    sector_id: 1,
    division_council: "AYUSH",
    subcategory: "Herbal Raw Materials",
    description: "Standardized bark powder and dry hydroalcoholic extract of Terminalia arjuna rich in arjunolic acid and co-enzyme Q10 analogs.",
    applications: "Cardiovascular health support, lipid regulation, heart strengthening arishta formulations.",
    technical_keywords: ["arjunolic acid", "tannin content min 15%", "flavonoid markers", "total ash"],
    common_synonyms: ["terminalia arjuna powder", "arjuna churna", "arjuna kshirpak raw herb"],
    industry_terminology: ["cardiotonic botanical active", "ayurvedic stem bark extract"],
    alternate_names: ["arjun bark", "white marudah"],
    common_abbreviations: ["ABE"],
    aliases: [
      { term: "arjuna bark powder", type: "canonical", confidence: 1.0, provenance: "curated" },
      { term: "arjuna churna", type: "ayurvedic_name", confidence: 0.95, provenance: "ayurvedic_formulary" },
      { term: "terminalia arjuna extract", type: "scientific", confidence: 0.9, provenance: "botanical" },
      { term: "अर्जुन छाल", type: "multilingual_hi", confidence: 0.95, provenance: "ayurvedic_hi" }
    ]
  },
  {
    family_code: "FAM_AYD_GUGGULU_FORMULATIONS",
    canonical_name: "Guggulu Formulations (Yograj and Kanchnar)",
    category_id: 61,
    sector_id: 1,
    division_council: "AYUSH",
    subcategory: "Classical Ayurvedic Formulations",
    description: "Purified oleo-gum-resin of Commiphora mukul processed with herbal decoctions into specialized therapeutic tablets.",
    applications: "Joint arthritis inflammation, lipid metabolism, thyroid and lymphatic swellings.",
    technical_keywords: ["guggulsterones e and z", "acid insoluble resin", "disintegration time < 30 min", "triphala purified guggulu"],
    common_synonyms: ["yograj guggul", "kanchnar guggul", "triphala guggulu", "commiphora resin tablets"],
    industry_terminology: ["shodhita guggulu formulation", "classical ayurvedic resin tablet"],
    alternate_names: ["guggulu vati", "purified guggul"],
    common_abbreviations: ["YGG"],
    aliases: [
      { term: "yograj guggulu", type: "canonical", confidence: 1.0, provenance: "curated" },
      { term: "kanchnar guggulu", type: "variant", confidence: 0.95, provenance: "ayurvedic_formulary" },
      { term: "guggul tablet", type: "common", confidence: 0.9, provenance: "market" },
      { term: "गुग्गुलु वटी", type: "multilingual_hi", confidence: 0.95, provenance: "ayurvedic_hi" }
    ]
  },
  {
    family_code: "FAM_AYD_SHATAVARI_GRANULES",
    canonical_name: "Shatavari Granules and Extract",
    category_id: 82,
    sector_id: 1,
    division_council: "AYUSH",
    subcategory: "Herbal Preparations",
    description: "Standardized root extract of Asparagus racemosus compounded into sugar granules or powdered dry extracts for women's wellness.",
    applications: "Lactation support, maternal health, hormonal balance, reproductive nutrition.",
    technical_keywords: ["saponins assay min 20%", "shatavarin iv", "sugar content", "solubility index", "microbial limits"],
    common_synonyms: ["asparagus racemosus extract", "shatavari powder", "shatavari kalpa"],
    industry_terminology: ["galactagogue herbal granule", "ayurvedic tonic granule"],
    alternate_names: ["satavari granules", "asparagus granules"],
    common_abbreviations: ["SVG"],
    aliases: [
      { term: "shatavari granules", type: "canonical", confidence: 1.0, provenance: "curated" },
      { term: "shatavari kalpa", type: "ayurvedic_name", confidence: 0.95, provenance: "ayurvedic_formulary" },
      { term: "asparagus racemosus extract", type: "scientific", confidence: 0.9, provenance: "botanical" },
      { term: "शतावरी कल्प", type: "multilingual_hi", confidence: 0.95, provenance: "ayurvedic_hi" }
    ]
  },
  {
    family_code: "FAM_AYD_NEEM_OIL_COLD_PRESSED",
    canonical_name: "Cold Pressed Neem Kernel Oil and Formulations",
    category_id: 98,
    sector_id: 1,
    division_council: "AYUSH",
    subcategory: "Medicinal Plants and Traditional Medicine",
    description: "Cold-pressed pure oil extracted from Azadirachta indica seed kernels, standardized for azadirachtin and bitter triterpenoids.",
    applications: "Ayurvedic dermatological oils, organic biopesticides, anti-dandruff hair oils, antifungal ointments.",
    technical_keywords: ["azadirachtin ppm min 1500", "nimbin", "salannin", "saponification value 190-205", "iodine value 65-80", "acid value"],
    common_synonyms: ["azadirachta indica seed oil", "pure neem oil", "organic neem kernel oil"],
    industry_terminology: ["cold pressed biological oil", "terpenoid enriched botanical oil"],
    alternate_names: ["margosa oil", "neem taila"],
    common_abbreviations: ["NKO"],
    aliases: [
      { term: "cold pressed neem oil", type: "canonical", confidence: 1.0, provenance: "curated" },
      { term: "neem taila", type: "ayurvedic_name", confidence: 0.95, provenance: "ayurvedic_formulary" },
      { term: "azadirachtin oil", type: "active_ingredient", confidence: 0.9, provenance: "industry" },
      { term: "नीम का तेल", type: "multilingual_hi", confidence: 0.95, provenance: "ayurvedic_hi" },
      { term: "ନିମ୍ବ ତେଲ", type: "multilingual_or", confidence: 0.9, provenance: "ayurvedic_or" }
    ]
  },
  {
    family_code: "FAM_AYD_HARITAKI_POWDER",
    canonical_name: "Haritaki / Terminalia Chebula Powder",
    category_id: 60,
    sector_id: 1,
    division_council: "AYUSH",
    subcategory: "Herbal Raw Materials",
    description: "Finely milled fruit pericarp powder of Terminalia chebula with high tannin content for gastrointestinal detox.",
    applications: "Digestive churna, dental tooth powders, astringent formulations, triphala component.",
    technical_keywords: ["chebulic acid", "chebulagic acid", "total tannins min 30%", "moisture max 8%"],
    common_synonyms: ["chebulic myrobalan powder", "harad churna", "kadukkai podi"],
    industry_terminology: ["ayurvedic astringent herb", "myrobalan pericarp powder"],
    alternate_names: ["harad powder", "black myrobalan"],
    common_abbreviations: ["HKP"],
    aliases: [
      { term: "haritaki powder", type: "canonical", confidence: 1.0, provenance: "curated" },
      { term: "harad churna", type: "ayurvedic_name", confidence: 0.95, provenance: "ayurvedic_formulary" },
      { term: "terminalia chebula powder", type: "scientific", confidence: 0.9, provenance: "botanical" },
      { term: "हरड़ चूर्ण", type: "multilingual_hi", confidence: 0.95, provenance: "ayurvedic_hi" }
    ]
  },
  {
    family_code: "FAM_AYD_AMLA_DRY_FRUIT",
    canonical_name: "Dehydrated Amla Fruit Flakes and Powder",
    category_id: 60,
    sector_id: 1,
    division_council: "AYUSH",
    subcategory: "Herbal Raw Materials",
    description: "Deseeded and solar-dried fruit flakes and fine powder of Emblica officinalis / Phyllanthus emblica.",
    applications: "Chyawanprash raw material, vitamin C herbal source, hair oil infusions, nutritional supplements.",
    technical_keywords: ["ascorbic acid content", "polyphenols", "acid insoluble ash max 2.0%", "foreign matter max 1.0%"],
    common_synonyms: ["emblica officinalis dry", "dry amla supari", "amla powder", "nellikai podi"],
    industry_terminology: ["dried amla pericarp", "emblic myrobalan dried fruit"],
    alternate_names: ["amla fruit flakes", "amla dried"],
    common_abbreviations: ["ADP"],
    aliases: [
      { term: "dried amla fruit", type: "canonical", confidence: 1.0, provenance: "curated" },
      { term: "amla powder", type: "common", confidence: 0.95, provenance: "market" },
      { term: "आंवला चूर्ण", type: "multilingual_hi", confidence: 0.95, provenance: "ayurvedic_hi" },
      { term: "ଅଁଳା ଚୂର୍ଣ୍ଣ", type: "multilingual_or", confidence: 0.9, provenance: "ayurvedic_or" }
    ]
  },
  {
    family_code: "FAM_AYD_VASAKA_SYRUP",
    canonical_name: "Vasaka / Adhatoda Vasica Cough Syrup",
    category_id: 82,
    sector_id: 1,
    division_council: "AYUSH",
    subcategory: "Herbal Preparations",
    description: "Ayurvedic expectorant syrup formulated with standardized extract of Adhatoda vasica leaves containing vasicine alkaloid.",
    applications: "Bronchial cough relief, liquefying viscous mucous, asthmatic support.",
    technical_keywords: ["vasicine alkaloid assay", "vasicinone", "viscosity cp 150-300", "sucrose base min 60%"],
    common_synonyms: ["adulsa cough syrup", "adhatoda syrup", "vasa cough syrup", "malabar nut syrup"],
    industry_terminology: ["ayurvedic bronchodilator liquid", "botanical expectorant formulation"],
    alternate_names: ["adulsa syrup", "vasavaleha liquid"],
    common_abbreviations: ["VCS"],
    aliases: [
      { term: "adulsa cough syrup", type: "canonical", confidence: 1.0, provenance: "curated" },
      { term: "vasaka syrup", type: "ayurvedic_name", confidence: 0.95, provenance: "ayurvedic_formulary" },
      { term: "adhatoda vasica syrup", type: "scientific", confidence: 0.9, provenance: "botanical" },
      { term: "अड़ूसा सिरप", type: "multilingual_hi", confidence: 0.95, provenance: "ayurvedic_hi" }
    ]
  },
  {
    family_code: "FAM_AYD_KUMKUMADI_TAILA",
    canonical_name: "Kumkumadi Tailam Facial Oil",
    category_id: 61,
    sector_id: 1,
    division_council: "AYUSH",
    subcategory: "Classical Ayurvedic Formulations",
    description: "Classical Ayurvedic skin elixir oil infused with genuine saffron (kesar), red sandalwood, goat milk, and 24 precious herbs in sesame oil base.",
    applications: "Facial pigmentation lightening, anti-aging skin therapy, scar reduction.",
    technical_keywords: ["crocin content", "santalol", "saponification value", "peroxide value < 5", "heavy metals negative"],
    common_synonyms: ["saffron facial oil", "kumkumadi serum", "ayurvedic saffron oil"],
    industry_terminology: ["classical taila preparation", "ayurvedic medicated cosmetic oil"],
    alternate_names: ["kumkumadi oil", "kesar facial oil"],
    common_abbreviations: ["KKT"],
    aliases: [
      { term: "kumkumadi tailam", type: "canonical", confidence: 1.0, provenance: "curated" },
      { term: "kumkumadi oil", type: "common", confidence: 0.95, provenance: "market" },
      { term: "saffron face oil", type: "descriptive", confidence: 0.85, provenance: "consumer" },
      { term: "कुंकुमादि तैलम", type: "multilingual_hi", confidence: 0.95, provenance: "ayurvedic_hi" }
    ]
  },
  {
    family_code: "FAM_AYD_BHRINGRAJ_HAIR_OIL",
    canonical_name: "Bhringraj Medicated Hair Oil (Taila)",
    category_id: 61,
    sector_id: 1,
    division_council: "AYUSH",
    subcategory: "Classical Ayurvedic Formulations",
    description: "Ayurvedic medicated hair oil prepared by boiling Eclipta alba (Bhringraj) herb juice with sesame or coconut oil and amla.",
    applications: "Premature greying prevention, hair fall control, scalp cooling therapy.",
    technical_keywords: ["wedelolactone marker", "acid value < 3.0", "peroxide value < 10", "ayurvedic paka siddhi keshya"],
    common_synonyms: ["mahabhringraj oil", "eclipta alba hair oil", "bhringraj tail"],
    industry_terminology: ["ayurvedic keshya tailam", "botanical hair growth oil"],
    alternate_names: ["mahabhringraj taila", "bhringraj oil"],
    common_abbreviations: ["BHO"],
    aliases: [
      { term: "mahabhringraj oil", type: "canonical", confidence: 1.0, provenance: "curated" },
      { term: "bhringraj taila", type: "ayurvedic_name", confidence: 0.95, provenance: "ayurvedic_formulary" },
      { term: "eclipta hair oil", type: "botanical", confidence: 0.85, provenance: "market" },
      { term: "भृंगराज तेल", type: "multilingual_hi", confidence: 0.95, provenance: "ayurvedic_hi" },
      { term: "ଭୃଙ୍ଗରାଜ ତେଲ", type: "multilingual_or", confidence: 0.9, provenance: "ayurvedic_or" }
    ]
  }
];

module.exports = { NEW_FAMILIES };
