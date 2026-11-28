import {
  EcoReward,
  FourFactorScores,
  ItemCondition,
  WasteCategoryId,
  WasteCategoryMeta,
  WasteItemProfile,
} from '../types/eco';

export const DAILY_POINTS_CAP = 200;

export const WASTE_CATEGORIES: Record<WasteCategoryId, WasteCategoryMeta> = {
  biodegradable: {
    id: 'biodegradable',
    label: 'Biodegradable',
    shortLabel: 'Biodegradable',
    binName: 'Green Compost Bin',
    binColorName: 'Emerald Green',
    hex: '#16A34A',
    bgClass: 'bg-emerald-600',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-300',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    description: 'Organic matter that breaks down naturally via microbes into nutrient-rich compost.',
    examples: ['Banana peel', 'Food scraps', 'Coffee grounds', 'Yard trimmings', 'Uncoated paper napkins'],
    contaminationTip: 'Remove plastic stickers, twist ties, and synthetic tea bags before composting.',
    mapsQuery: 'compost+drop+off+organic+waste+bin+near+me',
  },
  'non-biodegradable': {
    id: 'non-biodegradable',
    label: 'Non-Biodegradable',
    shortLabel: 'Non-Biodeg.',
    binName: 'Teal Inert / Polymer Bin',
    binColorName: 'Teal Amber',
    hex: '#0D9488',
    bgClass: 'bg-teal-600',
    textClass: 'text-teal-700',
    borderClass: 'border-teal-300',
    badgeClass: 'bg-teal-100 text-teal-800 border-teal-200',
    description: 'Synthetic or mineral materials that persist for decades or centuries without biological decay.',
    examples: ['Foam packaging (PS #6)', 'Multi-layer pouches', 'Nylon/synthetic textiles', 'Broken ceramic'],
    contaminationTip: 'Keep separate from organic compost; clean dry plastics may qualify for specialized polymer recovery.',
    mapsQuery: 'plastic+recovery+waste+collection+center+near+me',
  },
  recyclable: {
    id: 'recyclable',
    label: 'Recyclable',
    shortLabel: 'Recyclable',
    binName: 'Blue Recycling Bin',
    binColorName: 'Cobalt Blue',
    hex: '#2563EB',
    bgClass: 'bg-blue-600',
    textClass: 'text-blue-700',
    borderClass: 'border-blue-300',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Clean, dry materials that can be reprocessed into new raw feedstock at a Material Recovery Facility.',
    examples: ['PET #1 bottles', 'Aluminum cans', 'Glass bottles', 'Cardboard boxes', 'Office paper'],
    contaminationTip: 'Empty and rinse containers. Food residue or liquids can spoil an entire recycling bale.',
    mapsQuery: 'recycling+bin+center+near+me',
  },
  'non-recyclable': {
    id: 'non-recyclable',
    label: 'Non-Recyclable',
    shortLabel: 'Non-Recyclable',
    binName: 'Slate General Residual Bin',
    binColorName: 'Charcoal Slate',
    hex: '#475569',
    bgClass: 'bg-slate-700',
    textClass: 'text-slate-700',
    borderClass: 'border-slate-300',
    badgeClass: 'bg-slate-200 text-slate-800 border-slate-300',
    description: 'Mixed laminates, greasy paper, or composite waste that cannot be mechanically recycled or composted.',
    examples: ['Chip wrappers', 'Greasy pizza box lid', 'Used tissues', 'Plastic-lined coffee cups', 'Broken mirror'],
    contaminationTip: 'Never "wish-cycle" these into the blue bin — they jam optical sorters and contaminate clean bales.',
    mapsQuery: 'public+trash+dustbin+waste+disposal+near+me',
  },
  'e-waste': {
    id: 'e-waste',
    label: 'E-Waste',
    shortLabel: 'E-Waste',
    binName: 'Purple E-Waste Kiosk',
    binColorName: 'Violet Purple',
    hex: '#7C3AED',
    bgClass: 'bg-violet-600',
    textClass: 'text-violet-700',
    borderClass: 'border-violet-300',
    badgeClass: 'bg-violet-100 text-violet-800 border-violet-200',
    description: 'Discarded electronics, PCBs, cables, and appliances containing recoverable gold, copper, and heavy metals.',
    examples: ['Smartphones', 'Laptops & keyboards', 'Charging cables', 'Circuit boards', 'Headphones'],
    contaminationTip: 'Wipe personal data and remove loose Li-ion batteries before drop-off at a certified e-waste hub.',
    mapsQuery: 'e-waste+recycling+drop+off+center+near+me',
  },
  hazardous: {
    id: 'hazardous',
    label: 'Hazardous Waste',
    shortLabel: 'Hazardous',
    binName: 'Red Hazardous Facility Bin',
    binColorName: 'Crimson Red',
    hex: '#DC2626',
    bgClass: 'bg-red-600',
    textClass: 'text-red-700',
    borderClass: 'border-red-300',
    badgeClass: 'bg-red-100 text-red-800 border-red-200',
    description: 'Flammable, toxic, corrosive, or reactive items that pose fire, groundwater, or health risks.',
    examples: ['Li-ion batteries', 'Aerosol spray cans', 'Paint & solvents', 'Fluorescent bulbs', 'Medical sharps'],
    contaminationTip: 'NEVER crush or place in household bins — Li-ion cells cause waste-truck fires.',
    mapsQuery: 'hazardous+waste+battery+disposal+center+near+me',
  },
};

export const CATEGORY_LIST: WasteCategoryMeta[] = [
  WASTE_CATEGORIES.biodegradable,
  WASTE_CATEGORIES['non-biodegradable'],
  WASTE_CATEGORIES.recyclable,
  WASTE_CATEGORIES['non-recyclable'],
  WASTE_CATEGORIES['e-waste'],
  WASTE_CATEGORIES.hazardous,
];

export const WASTE_ITEMS: WasteItemProfile[] = [
  {
    id: 'banana-peel',
    name: 'Banana Peel & Fruit Scraps',
    primaryCategory: 'biodegradable',
    applicableCategories: ['biodegradable'],
    materialClass: 'Organic Plant Biomass',
    resinOrCode: 'Organic / ASTM D6400',
    decompositionTime: '2–5 weeks',
    hazardLabel: 'None / Low',
    fourFactor: {
      recyclability: 45,
      biodegradability: 99,
      decompositionSpeed: 98,
      hazardSafety: 100,
    },
    prepSteps: [
      'Peel off any PLU plastic fruit stickers.',
      'Drop directly into the Green Compost Bin (no plastic bag unless certified compostable).',
    ],
    contaminationWarning: 'Keep plastic wrappers out of organic compost streams.',
    basePoints: 20,
    co2SavedKg: 0.28,
    emoji: '🍌',
    keywords: [
      'banana', 'orange', 'apple', 'lemon', 'pineapple', 'strawberry', 'fig',
      'pomegranate', 'cucumber', 'zucchini', 'broccoli', 'carrot', 'mushroom',
      'potato', 'corn', 'cabbage', 'salad', 'fruit', 'vegetable', 'peel', 'food',
      'bread', 'bagel', 'pretzel', 'pizza', 'espresso', 'coffee', 'leaf', 'flower',
    ],
  },
  {
    id: 'pet-bottle',
    name: 'PET Plastic Water Bottle',
    primaryCategory: 'recyclable',
    applicableCategories: ['non-biodegradable', 'recyclable'],
    materialClass: 'Thermoplastic Polyester',
    resinOrCode: 'Resin #1 (PET)',
    decompositionTime: '450+ years',
    hazardLabel: 'None / Low',
    fourFactor: {
      recyclability: 92,
      biodegradability: 5,
      decompositionSpeed: 12,
      hazardSafety: 90,
    },
    prepSteps: [
      'Empty remaining liquid completely.',
      'Lightly rinse, crush lengthwise to save bin volume, and twist cap back on.',
      'Place in the Blue Recycling Bin.',
    ],
    contaminationWarning: 'Liquid inside bottles wets paper/cardboard in single-stream bins.',
    basePoints: 25,
    co2SavedKg: 0.42,
    emoji: '🧴',
    keywords: [
      'water bottle', 'pop bottle', 'soda bottle', 'plastic bottle', 'bottle',
      'jug', 'pill bottle', 'lotion', 'shampoo', 'detergent', 'beer bottle',
      'dispenser', 'pet', 'plastic',
    ],
    soilOverridesTo: 'non-recyclable',
    soilNote: 'Heavily oil/chemical-soiled plastic cannot enter standard PET recycling.',
  },
  {
    id: 'aluminum-can',
    name: 'Aluminum Beverage Can',
    primaryCategory: 'recyclable',
    applicableCategories: ['non-biodegradable', 'recyclable'],
    materialClass: 'Non-Ferrous Metal',
    resinOrCode: 'Alloy 3004 / ALU #41',
    decompositionTime: '200–500 years',
    hazardLabel: 'None / Low',
    fourFactor: {
      recyclability: 99,
      biodegradability: 2,
      decompositionSpeed: 14,
      hazardSafety: 94,
    },
    prepSteps: [
      'Pour out any leftover drink and give a quick rinse.',
      'Do not crush flat if local MRF uses optical sorting; leave tab attached.',
      'Place in the Blue Recycling Bin.',
    ],
    contaminationWarning: 'Recycling 1 aluminum can saves 95% of the energy needed to make a virgin can.',
    basePoints: 30,
    co2SavedKg: 0.55,
    emoji: '🥫',
    keywords: [
      'can', 'tin', 'soda', 'cola', 'beer', 'beverage', 'aluminum', 'foil',
      'pan', 'bucket', 'thermos', 'cocktail shaker', 'metal',
    ],
  },
  {
    id: 'glass-bottle',
    name: 'Clear / Colored Glass Bottle',
    primaryCategory: 'recyclable',
    applicableCategories: ['non-biodegradable', 'recyclable'],
    materialClass: 'Silicate Glass',
    resinOrCode: 'GL #70–72 (Soda-Lime)',
    decompositionTime: '1,000,000+ years',
    hazardLabel: 'Moderate',
    fourFactor: {
      recyclability: 96,
      biodegradability: 0,
      decompositionSpeed: 2,
      hazardSafety: 78,
    },
    prepSteps: [
      'Empty contents and rinse clean.',
      'Remove metal/cork lids (recycle metal lids separately).',
      'Place gently in the Blue Recycling Bin (do not shatter).',
    ],
    contaminationWarning: 'Never mix Pyrex bakeware, ceramics, or window glass — they melt at different temperatures.',
    basePoints: 28,
    co2SavedKg: 0.48,
    emoji: '🍾',
    keywords: [
      'wine bottle', 'glass', 'jar', 'goblet', 'beaker', 'pitcher', 'vase',
      'milk can', 'perfume', 'bottle',
    ],
  },
  {
    id: 'paper-cardboard',
    name: 'Corrugated Cardboard & Paper',
    primaryCategory: 'recyclable',
    applicableCategories: ['biodegradable', 'recyclable'],
    materialClass: 'Cellulose Fiber',
    resinOrCode: 'PAP #20–22',
    decompositionTime: '2–6 months',
    hazardLabel: 'None / Low',
    fourFactor: {
      recyclability: 90,
      biodegradability: 86,
      decompositionSpeed: 80,
      hazardSafety: 98,
    },
    prepSteps: [
      'Flatten boxes completely and remove excessive packing tape.',
      'Keep dry and oil-free before placing in Blue Recycling Bin.',
    ],
    contaminationWarning: 'If soaked in grease or food (e.g., cheesy pizza box bottom), route to Green Compost instead!',
    basePoints: 22,
    co2SavedKg: 0.35,
    emoji: '📦',
    keywords: [
      'carton', 'cardboard', 'box', 'envelope', 'book', 'notebook', 'paper',
      'newspaper', 'magazine', 'menu', 'tissue', 'packet', 'comic', 'binder',
      'folder', 'mailing',
    ],
    soilOverridesTo: 'biodegradable',
    soilNote: 'Grease-soiled paper/cardboard cannot be pulped for recycling — compost it in the Green Bin!',
  },
  {
    id: 'li-ion-battery',
    name: 'Lithium-Ion Battery / Power Cell',
    primaryCategory: 'hazardous',
    applicableCategories: ['non-biodegradable', 'e-waste', 'hazardous'],
    materialClass: 'Electrochemical Cell',
    resinOrCode: 'UN 3480 / Li-Ion',
    decompositionTime: '100+ years (Toxic Leachate)',
    hazardLabel: 'Critical',
    fourFactor: {
      recyclability: 62,
      biodegradability: 0,
      decompositionSpeed: 5,
      hazardSafety: 12,
    },
    prepSteps: [
      'Tape exposed terminals with non-conductive electrical tape.',
      'Keep dry and away from heat or sharp objects.',
      'Deliver directly to a Red Hazardous / Battery Collection Kiosk.',
    ],
    contaminationWarning: 'CRITICAL FIRE RISK: Never throw batteries in household or blue recycling bins.',
    basePoints: 45,
    co2SavedKg: 1.15,
    emoji: '🔋',
    keywords: [
      'battery', 'power bank', 'cell', 'charger', 'adapter', 'flashlight',
      'lighter', 'lithium', 'alkaline', 'accumulator',
    ],
  },
  {
    id: 'smartphone-ewaste',
    name: 'Smartphone / Circuit Board / Electronics',
    primaryCategory: 'e-waste',
    applicableCategories: ['non-biodegradable', 'e-waste', 'hazardous'],
    materialClass: 'Mixed WEEE (Cu/Au/FR-4)',
    resinOrCode: 'WEEE Cat. 5/6',
    decompositionTime: '500–1,000+ years',
    hazardLabel: 'High',
    fourFactor: {
      recyclability: 78,
      biodegradability: 0,
      decompositionSpeed: 4,
      hazardSafety: 28,
    },
    prepSteps: [
      'Back up and factory-reset personal data.',
      'Do not dismantle swollen batteries at home.',
      'Drop off at a Purple Certified E-Waste Collection Center.',
    ],
    contaminationWarning: 'Contains lead, cadmium, and precious metals; requires certified smelting & recovery.',
    basePoints: 40,
    co2SavedKg: 1.4,
    emoji: '📱',
    keywords: [
      'cellular telephone', 'smartphone', 'iphone', 'mobile', 'laptop',
      'notebook', 'computer', 'keyboard', 'mouse', 'monitor', 'screen',
      'television', 'ipod', 'tablet', 'remote', 'printer', 'router', 'modem',
      'hard disc', 'speaker', 'headphone', 'earphone', 'earbud', 'camera',
      'cable', 'plug', 'circuit', 'electronic', 'watch', 'clock', 'calculator',
      'joystick', 'microphone',
    ],
  },
  {
    id: 'chip-wrapper-laminate',
    name: 'Multi-Layer Chip Bag / Foil Wrapper',
    primaryCategory: 'non-recyclable',
    applicableCategories: ['non-biodegradable', 'non-recyclable'],
    materialClass: 'Metallized BOPP Laminate',
    resinOrCode: 'Resin #7 (Other / MLP)',
    decompositionTime: '300–500 years',
    hazardLabel: 'None / Low',
    fourFactor: {
      recyclability: 8,
      biodegradability: 2,
      decompositionSpeed: 10,
      hazardSafety: 88,
    },
    prepSteps: [
      'Empty crumbs completely.',
      'Place in the Slate General Residual Bin (unless a TerraCycle MLP box is nearby).',
    ],
    contaminationWarning: 'Fused plastic + aluminum layers cannot be separated by municipal recycling machines.',
    basePoints: 15,
    co2SavedKg: 0.08,
    emoji: '🥡',
    keywords: [
      'bag', 'wrapper', 'pouch', 'packet', 'chip', 'snack', 'candy', 'cup',
      'coffee cup', 'straw', 'utensil', 'fork', 'spoon', 'knife', 'plate',
      'diaper', 'sponge', 'rubber', 'shoe', 'sock', 'mask', 'glove',
    ],
  },
  {
    id: 'foam-polystyrene',
    name: 'Expanded Polystyrene Foam / Clamshell',
    primaryCategory: 'non-biodegradable',
    applicableCategories: ['non-biodegradable', 'non-recyclable'],
    materialClass: 'Expanded Polystyrene',
    resinOrCode: 'Resin #6 (EPS)',
    decompositionTime: '500+ years (Microplastics)',
    hazardLabel: 'Moderate',
    fourFactor: {
      recyclability: 14,
      biodegradability: 0,
      decompositionSpeed: 5,
      hazardSafety: 72,
    },
    prepSteps: [
      'Keep intact (do not break into tiny static foam beads).',
      'Route to Teal Polymer / EPS Drop-off if clean, or Slate Residual Bin.',
    ],
    contaminationWarning: 'Breaks into persistent microplastics in waterways and soil.',
    basePoints: 18,
    co2SavedKg: 0.14,
    emoji: '🧊',
    keywords: [
      'styrofoam', 'foam', 'polystyrene', 'cooler', 'tray', 'clamshell',
      'packing', 'takeout', 'helmet', 'bucket', 'plastic bag',
    ],
  },
  {
    id: 'chemical-aerosol-hazard',
    name: 'Aerosol Can / Paint / Chemical Spray',
    primaryCategory: 'hazardous',
    applicableCategories: ['non-biodegradable', 'hazardous'],
    materialClass: 'Pressurized Chemical / Solvent',
    resinOrCode: 'HAZ-2.1 / Flammable',
    decompositionTime: '200+ years (VOC / Toxin Risk)',
    hazardLabel: 'Critical',
    fourFactor: {
      recyclability: 25,
      biodegradability: 0,
      decompositionSpeed: 8,
      hazardSafety: 10,
    },
    prepSteps: [
      'Do NOT puncture, incinerate, or crush the pressurized canister.',
      'Keep cap on and transport upright to a Red Hazardous Waste Facility.',
    ],
    contaminationWarning: 'Pressurized propellants and solvents can explode inside compaction trucks.',
    basePoints: 42,
    co2SavedKg: 0.95,
    emoji: '🧯',
    keywords: [
      'aerosol', 'spray', 'paint', 'perfume', 'hair spray', 'insecticide',
      'bleach', 'chemical', 'syringe', 'medicine', 'pill', 'oil', 'gas',
      'lighter', 'matches', 'bulb', 'lamp', 'thermometer', 'fire extinguisher',
    ],
  },
  {
    id: 'textile-fabric',
    name: 'Synthetic Textile / Old Footwear',
    primaryCategory: 'non-biodegradable',
    applicableCategories: ['non-biodegradable', 'non-recyclable'],
    materialClass: 'Polyester / Elastane Blend',
    resinOrCode: 'TEX-SYN',
    decompositionTime: '200+ years',
    hazardLabel: 'None / Low',
    fourFactor: {
      recyclability: 35,
      biodegradability: 8,
      decompositionSpeed: 15,
      hazardSafety: 85,
    },
    prepSteps: [
      'If wearable, donate to a textile reuse bin.',
      'If torn/unusable, drop in a Teal Synthetic Recovery / Textile Bin.',
    ],
    contaminationWarning: 'Synthetic fibers shed microplastics; keep out of curbside single-stream recycling.',
    basePoints: 20,
    co2SavedKg: 0.3,
    emoji: '👟',
    keywords: [
      'shoe', 'sneaker', 'boot', 'sandal', 'shirt', 'jersey', 'jean', 'jacket',
      'coat', 'sock', 'towel', 'backpack', 'umbrella', 'cloth', 'fabric',
    ],
  },
];

export function calculateFourFactorScore(
  base: FourFactorScores,
  condition: ItemCondition
): { score: number; adjusted: FourFactorScores } {
  const adjusted: FourFactorScores = { ...base };

  if (condition === 'soiled') {
    adjusted.recyclability = Math.max(5, Math.round(base.recyclability * 0.45));
    adjusted.hazardSafety = Math.max(5, base.hazardSafety - 8);
  } else if (condition === 'damaged') {
    adjusted.recyclability = Math.max(5, Math.round(base.recyclability * 0.8));
    adjusted.hazardSafety = Math.max(5, base.hazardSafety - 18);
  }

  // Weighted 4-factor circularity & safety index (0–100)
  const score = Math.round(
    adjusted.recyclability * 0.35 +
      adjusted.biodegradability * 0.25 +
      adjusted.decompositionSpeed * 0.15 +
      adjusted.hazardSafety * 0.25
  );

  return {
    score: Math.min(100, Math.max(1, score)),
    adjusted,
  };
}

export function resolveEffectiveCategory(
  item: WasteItemProfile,
  condition: ItemCondition
): WasteCategoryId {
  if (condition === 'soiled' && item.soilOverridesTo) {
    return item.soilOverridesTo;
  }
  if (condition === 'damaged' && item.primaryCategory === 'e-waste') {
    return 'hazardous';
  }
  return item.primaryCategory;
}

export const ECO_REWARDS: EcoReward[] = [
  {
    id: 'plant-tree',
    title: 'Plant 1 Native Sapling Certificate',
    partner: 'NeuroNexus Green Foundation',
    cost: 120,
    description: 'Funds 1 verified native tree plantation with GPS tag.',
    badge: '🌱',
  },
  {
    id: 'campus-coffee',
    title: '25% Off Reusable-Cup Coffee',
    partner: 'EcoBrew Partner Cafés',
    cost: 80,
    description: 'Show pass at participating cafés when bringing your own tumbler.',
    badge: '☕',
  },
  {
    id: 'transit-credit',
    title: 'Green Metro / E-Bike Pass (\$3)',
    partner: 'City Clean Mobility',
    cost: 160,
    description: 'Redeemable toward zero-emission bike share or transit rides.',
    badge: '🚲',
  },
  {
    id: 'tote-kit',
    title: 'Recycled Canvas Segregation Tote',
    partner: 'EcoPulse Circular Store',
    cost: 240,
    description: 'Two-compartment washable bag for dry & wet waste transport.',
    badge: '🛍️',
  },
];

export const BADGE_DEFINITIONS = [
  { id: 'first-scan', name: 'First Pulse', desc: 'Log your 1st verified disposal', icon: '⚡' },
  { id: 'streak-3', name: 'Circular Streak', desc: 'Maintain an active sorting streak', icon: '🔥' },
  { id: 'ewaste-guardian', name: 'E-Waste Guardian', desc: 'Safely route an E-Waste or Hazardous item', icon: '🛡️' },
  { id: 'sorter-5', name: 'Bin Architect', desc: 'Correctly sort 5+ waste items', icon: '♻️' },
  { id: 'score-150', name: 'EcoPulse Champion', desc: 'Reach 150+ lifetime EcoPoints', icon: '🏆' },
];

export const LEADERBOARD_PEERS = [
  { name: 'Priyani Mishra', team: 'NeuroNexus Lab', points: 420, streak: 9 },
  { name: 'Divypratap Singh', team: 'NeuroNexus Lead', points: 365, streak: 7 },
  { name: 'Pratik Patra', team: 'Vision Ops', points: 310, streak: 6 },
  { name: 'Prachet Giri', team: 'Geo Routing', points: 275, streak: 5 },
  { name: 'Nupur Chandra', team: 'Circular Design', points: 240, streak: 4 },
];
