import type {
  ChecklistItem,
  CommunityReport,
  EthicalGame,
  ScannerPreset,
} from "../types/fairplay";

export const SCANNER_PRESETS: ScannerPreset[] = [
  {
    id: "aether-gacha",
    label: "Aether Gacha RPG",
    labelHi: "Aether Gacha RPG",
    riskHint: "HIGH",
    title: "Aether Gacha RPG",
    description:
      "Features 0.6% 5-star character banners, 72-hour FOMO countdown timers, dual virtual currency (Astral Crystals converted into Summon Shards), and a 90-pull pity counter with flashy near-miss animations.",
    reportEn: {
      gameTitle: "Aether Gacha RPG",
      riskScore: 89,
      riskLevel: "HIGH",
      breakdown: {
        skillPct: 24,
        cosmeticPct: 14,
        gamblingPct: 62,
      },
      detectedPatterns: [
        {
          name: "0.6% Variable-Ratio Character Banners",
          severity: "HIGH",
          psychologyHook: "Variable-Ratio Reinforcement",
          explanation:
            "Ultra-low 0.6% base odds force dozens of paid attempts while unpredictable wins trigger slot-machine dopamine spikes.",
        },
        {
          name: "Dual-Currency Obfuscation",
          severity: "HIGH",
          psychologyHook: "Pain-of-Paying Disconnection",
          explanation:
            "Real money buys Astral Crystals which convert into Summon Shards, masking the exact ₹ / $ cost per random draw.",
        },
        {
          name: "72-Hour FOMO Banner Countdowns",
          severity: "MEDIUM",
          psychologyHook: "Artificial Scarcity & Urgency",
          explanation:
            "Expiring countdown clocks pressure young players to spend immediately before calculating true probability.",
        },
      ],
      gamerAlert:
        "At a 0.6% rate, reaching a guaranteed pity win can cost up to ₹14,400 ($180) for a single character. Never chase a banner out of FOMO.",
      parentAlert:
        "Parent Guidance: This game embeds casino-style randomized pulls behind anime RPG battles. Disable stored payment cards and set a ₹0 in-app purchase PIN.",
      summary:
        "Aether Gacha RPG pairs 0.6% character drop odds with dual-currency masking and urgent FOMO timers that strongly replicate gambling behavior.",
      analysisSource: "preset",
    },
    reportHi: {
      gameTitle: "Aether Gacha RPG",
      riskScore: 89,
      riskLevel: "HIGH",
      breakdown: {
        skillPct: 24,
        cosmeticPct: 14,
        gamblingPct: 62,
      },
      detectedPatterns: [
        {
          name: "0.6% वेरिएबल-रेशियो कैरेक्टर बैनर",
          severity: "HIGH",
          psychologyHook: "वेरिएबल-रेशियो रीइन्फोर्समेंट",
          explanation:
            "केवल 0.6% जीत की संभावना खिलाड़ी को बार-बार पैसे खर्च करने पर मजबूर करती है, ठीक स्लॉट मशीन की तरह।",
        },
        {
          name: "दोहरी वर्चुअल मुद्रा जाल",
          severity: "HIGH",
          psychologyHook: "खर्च का अहसास छिपाना",
          explanation:
            "असली रुपये को क्रिस्टल और फिर शार्ड्स में बदलने से हर स्पिन की असली कीमत समझ में नहीं आती।",
        },
        {
          name: "72-घंटे का FOMO काउंटडाउन टाइमर",
          severity: "MEDIUM",
          psychologyHook: "जल्दबाज़ी और कमी का दबाव",
          explanation:
            "चलते हुए टाइमर बच्चों पर बिना सोचे-समझे तुरंत पैसे खर्च करने का मानसिक दबाव बनाते हैं।",
        },
      ],
      gamerAlert:
        "0.6% ड्रॉप रेट पर एक कैरेक्टर की गारंटी के लिए ₹14,400 तक खर्च हो सकते हैं। FOMO में आकर पैसे न लगाएं।",
      parentAlert:
        "अभिभावक सलाह: इस RPG गेम में जुए जैसे रैंडम बैनर छिपे हैं। सेव किए गए कार्ड हटाएं और पेमेंट पिन अनिवार्य करें।",
      summary:
        "Aether Gacha RPG में 0.6% ड्रॉप रेट, दोहरी मुद्रा और FOMO टाइमर जैसे गंभीर जुए के मैकेनिक शामिल हैं।",
      analysisSource: "preset",
    },
  },
  {
    id: "pro-striker",
    label: "Pro Striker Ultimate Packs",
    labelHi: "Pro Striker Ultimate Packs",
    riskHint: "HIGH",
    title: "Pro Striker Ultimate Packs",
    description:
      "Competitive football mode featuring pay-to-win Ultimate Player Packs with obscured <1% drop odds, stadium pack opening fireworks (near-miss teasers), and an annual squad reset every September.",
    reportEn: {
      gameTitle: "Pro Striker Ultimate Packs",
      riskScore: 92,
      riskLevel: "HIGH",
      breakdown: {
        skillPct: 20,
        cosmeticPct: 8,
        gamblingPct: 72,
      },
      detectedPatterns: [
        {
          name: "Pay-to-Win Stat Loot Boxes",
          severity: "HIGH",
          psychologyHook: "Competitive Sunk-Cost Escalation",
          explanation:
            "Top-rated players are locked inside randomized paid packs, turning competitive matches into a wallet contest.",
        },
        {
          name: "Obscured Sub-1% Drop Odds",
          severity: "HIGH",
          psychologyHook: "Information Asymmetry",
          explanation:
            "Displays '<1%' without revealing whether the real chance is 0.9% or 0.02%, hiding true expected losses.",
        },
        {
          name: "Annual Reset Cycle",
          severity: "HIGH",
          psychologyHook: "Planned Obsolescence Loop",
          explanation:
            "Squads paid for this season become obsolete in the next annual release, restarting the spending cycle.",
        },
      ],
      gamerAlert:
        "High financial trap: Paid packs reset annually and obscure true sub-1% odds. Stick to offline Career Mode instead of Ultimate Packs.",
      parentAlert:
        "Parent Guidance: Sports branding often disguises loot-box gambling as harmless football collecting. Turn off pack-point purchases on consoles.",
      summary:
        "Pro Striker Ultimate Packs combines pay-to-win randomized player packs, vague odds, and annual progress wipes.",
      analysisSource: "preset",
    },
    reportHi: {
      gameTitle: "Pro Striker Ultimate Packs",
      riskScore: 92,
      riskLevel: "HIGH",
      breakdown: {
        skillPct: 20,
        cosmeticPct: 8,
        gamblingPct: 72,
      },
      detectedPatterns: [
        {
          name: "पे-टू-विन स्टैट लूट बॉक्स",
          severity: "HIGH",
          psychologyHook: "प्रतिस्पर्धा और संक-कॉस्ट दबाव",
          explanation:
            "ताकतवर खिलाड़ियों को रैंडम पैक में बंद करके जीतने के लिए बार-बार पैसे खर्च करने का दबाव बनाया जाता है।",
        },
        {
          name: "अस्पष्ट <1% ड्रॉप ऑड्स",
          severity: "HIGH",
          psychologyHook: "छिपी हुई प्रायिकता",
          explanation:
            "'<1%' लिखकर असली 0.05% की बेहद कम संभावना को छिपाया जाता है।",
        },
        {
          name: "वार्षिक स्क्वाड रीसेट",
          severity: "HIGH",
          psychologyHook: "हर साल नए सिरे से खर्च चक्र",
          explanation:
            "इस साल खरीदी गई टीम अगले सीज़न में बेकार हो जाती है, जिससे फिर से पैसे खर्च करने पड़ते हैं।",
        },
      ],
      gamerAlert:
        "सावधान: हर साल आपकी खरीदी टीम रीसेट हो जाती है। पैड पैक के बजाय ऑफलाइन करियर मोड खेलें।",
      parentAlert:
        "अभिभावक सलाह: स्पोर्ट्स गेम के भीतर लूट-बॉक्स जुए जैसा खर्च करा सकते हैं। कंसोल/फोन में इन-ऐप खरीद बंद करें।",
      summary:
        "Pro Striker Ultimate Packs में पे-टू-विन रैंडम पैक, अस्पष्ट ऑड्स और हर साल रीसेट होने वाला खर्च चक्र है।",
      analysisSource: "preset",
    },
  },
  {
    id: "battle-arena",
    label: "Battle Arena Royale",
    labelHi: "Battle Arena Royale",
    riskHint: "MEDIUM",
    title: "Battle Arena Royale",
    description:
      "Free-to-play competitive shooter with zero pay-to-win stats. Monetizes via a cosmetic-only seasonal Battle Pass, virtual V-Tokens, and a 24-hour rotating FOMO daily item shop.",
    reportEn: {
      gameTitle: "Battle Arena Royale",
      riskScore: 46,
      riskLevel: "MEDIUM",
      breakdown: {
        skillPct: 54,
        cosmeticPct: 34,
        gamblingPct: 12,
      },
      detectedPatterns: [
        {
          name: "24-Hour Rotating Daily Shop",
          severity: "MEDIUM",
          psychologyHook: "FOMO & Social Conformity",
          explanation:
            "Items rotate out daily with no guaranteed return date, nudging teens to buy outfits immediately to fit in with friends.",
        },
        {
          name: "Cosmetic-Only Fair Gameplay",
          severity: "LOW",
          psychologyHook: "Skill Integrity Preserved",
          explanation:
            "Outfits and emotes grant zero damage or speed advantages—match outcomes remain skill-based.",
        },
      ],
      gamerAlert:
        "Gameplay is fair and skill-driven, but the 24-hour shop uses FOMO. Wait 48 hours before buying any cosmetic skin.",
      parentAlert:
        "Parent Guidance: No random loot boxes here, so financial risk is moderate. Use a fixed monthly allowance so FOMO shops don't overspend.",
      summary:
        "Battle Arena Royale keeps combat 100% skill-based without loot boxes, though rotating daily shops apply moderate FOMO pressure.",
      analysisSource: "preset",
    },
    reportHi: {
      gameTitle: "Battle Arena Royale",
      riskScore: 46,
      riskLevel: "MEDIUM",
      breakdown: {
        skillPct: 54,
        cosmeticPct: 34,
        gamblingPct: 12,
      },
      detectedPatterns: [
        {
          name: "24-घंटे रोटेटिंग डेली शॉप",
          severity: "MEDIUM",
          psychologyHook: "FOMO और सामाजिक दबाव",
          explanation:
            "हर 24 घंटे में आइटम हटने का डर बच्चों को बिना सोचे कॉस्मेटिक खरीदने के लिए उकसाता है।",
        },
        {
          name: "कॉस्मेटिक-ओनली निष्पक्ष गेमप्ले",
          severity: "LOW",
          psychologyHook: "कौशल की सुरक्षा",
          explanation:
            "स्किन्स से गेम जीतने की ताकत नहीं बढ़ती—मुकाबला पूरी तरह कौशल पर आधारित रहता है।",
        },
      ],
      gamerAlert:
        "गेमप्ले निष्पक्ष है, लेकिन 24-घंटे की शॉप जल्दबाज़ी करवाती है। कोई भी स्किन खरीदने से पहले 2 दिन सोचें।",
      parentAlert:
        "अभिभावक सलाह: इसमें लूट बॉक्स नहीं हैं, लेकिन डेली शॉप से खर्च बढ़ सकता है। मासिक पॉकेट मनी सीमा तय करें।",
      summary:
        "Battle Arena Royale में कोई पे-टू-विन जुआ नहीं है, पर रोटेटिंग कॉस्मेटिक शॉप से मध्यम FOMO दबाव बनता है।",
      analysisSource: "preset",
    },
  },
  {
    id: "valley-harvest",
    label: "Valley Harvest Indie",
    labelHi: "Valley Harvest Indie",
    riskHint: "LOW",
    title: "Valley Harvest Indie",
    description:
      "Single one-time purchase indie farming and exploration game. Zero microtransactions, zero virtual currencies, no countdown timers, and 100% progression through player creativity and planning.",
    reportEn: {
      gameTitle: "Valley Harvest Indie",
      riskScore: 8,
      riskLevel: "LOW",
      breakdown: {
        skillPct: 88,
        cosmeticPct: 12,
        gamblingPct: 0,
      },
      detectedPatterns: [
        {
          name: "One-Time Transparent Purchase",
          severity: "LOW",
          psychologyHook: "Ethical Player Autonomy",
          explanation:
            "You pay once upfront and own the entire experience—zero surprise charges, zero paywalls, and zero random reward boxes.",
        },
      ],
      gamerAlert:
        "Safe benchmark: 100% of rewards are earned through gameplay, creativity, and planning with zero financial traps.",
      parentAlert:
        "Parent Guidance: Ideal safe-play choice. Zero risk of accidental charges or gambling-like conditioning.",
      summary:
        "Valley Harvest Indie sets the gold standard for ethical gaming with a single upfront price and zero gambling mechanics.",
      analysisSource: "preset",
    },
    reportHi: {
      gameTitle: "Valley Harvest Indie",
      riskScore: 8,
      riskLevel: "LOW",
      breakdown: {
        skillPct: 88,
        cosmeticPct: 12,
        gamblingPct: 0,
      },
      detectedPatterns: [
        {
          name: "एकमुश्त पारदर्शी खरीद",
          severity: "LOW",
          psychologyHook: "स्वस्थ रचनात्मक खेल",
          explanation:
            "एक बार कीमत चुकाने पर पूरा गेम मिलता है—कोई छिपा शुल्क, टाइमर या रैंडम लूट बॉक्स नहीं।",
        },
      ],
      gamerAlert:
        "सुरक्षित गेम: सभी इनाम आपकी मेहनत और रचनात्मकता से मिलते हैं, पैसों का कोई जाल नहीं है।",
      parentAlert:
        "अभिभावक सलाह: बच्चों के लिए पूरी तरह सुरक्षित विकल्प। अनचाहे खर्च या जुए की आदत का शून्य जोखिम।",
      summary:
        "Valley Harvest Indie बिना किसी माइक्रोट्रांजेक्शन और जुए के मैकेनिक के एक आदर्श सुरक्षित गेम है।",
      analysisSource: "preset",
    },
  },
];

export const ETHICAL_GAMES: EthicalGame[] = [
  {
    id: "stardew",
    title: "Stardew Valley",
    genre: "Farming & Life Sim",
    category: "Zero Microtransactions",
    priceInr: "₹479 one-time",
    priceUsd: "$14.99 one-time",
    ageRating: "10+ · Offline / Co-op",
    whySafe: "Complete game for one flat price; hundreds of hours of creative planning with zero shops.",
    whySafeHi: "एक बार की कीमत में पूरा गेम; बिना किसी इन-गेम शॉप के रचनात्मक खेल।",
  },
  {
    id: "hollow-knight",
    title: "Hollow Knight",
    genre: "Action Adventure",
    category: "Indie",
    priceInr: "₹480 one-time",
    priceUsd: "$14.99 one-time",
    ageRating: "10+ · Single Player",
    whySafe: "100% skill mastery and exploration; all expansions included free without paid currency.",
    whySafeHi: "पूरी तरह कौशल और अन्वेषण पर आधारित; कोई वर्चुअल मुद्रा नहीं।",
  },
  {
    id: "hades",
    title: "Hades",
    genre: "Roguelike Action",
    category: "Indie",
    priceInr: "₹1,100 one-time",
    priceUsd: "$24.99 one-time",
    ageRating: "12+ · Single Player",
    whySafe: "Randomness stays purely inside gameplay runs—never sold for real money.",
    whySafeHi: "गेम के अंदर की चुनौतियाँ केवल मनोरंजन के लिए हैं, पैसों से नहीं बिकतीं।",
  },
  {
    id: "minecraft",
    title: "Minecraft (Java / Standard)",
    genre: "Creative Sandbox",
    category: "Co-op / Story",
    priceInr: "₹1,999 one-time",
    priceUsd: "$29.99 one-time",
    ageRating: "7+ · Creative Co-op",
    whySafe: "Builds spatial engineering, logic, and teamwork without loot boxes in core play.",
    whySafeHi: "रचनात्मकता, तर्क और टीमवर्क बढ़ाता है; मुख्य गेम में कोई लूट बॉक्स नहीं।",
  },
  {
    id: "portal-2",
    title: "Portal 2",
    genre: "Physics Puzzle Co-op",
    category: "Co-op / Story",
    priceInr: "₹480 one-time",
    priceUsd: "$9.99 one-time",
    ageRating: "10+ · Co-op / Story",
    whySafe: "Pure spatial problem-solving and cooperative communication with zero RNG spending.",
    whySafeHi: "शुद्ध पहेली और भौतिकी आधारित सह-खेल; खर्च का कोई दबाव नहीं।",
  },
  {
    id: "celeste",
    title: "Celeste",
    genre: "Precision Platformer",
    category: "Zero Microtransactions",
    priceInr: "₹529 one-time",
    priceUsd: "$19.99 one-time",
    ageRating: "10+ · Single Player",
    whySafe: "Celebrates perseverance and skill with full accessibility assist modes and zero monetization.",
    whySafeHi: "धैर्य और कौशल को बढ़ावा देता है; शून्य इन-ऐप खरीद।",
  },
];

export const INITIAL_CHECKLIST: ChecklistItem[] = [
  {
    id: "disable-1click",
    titleEn: "Disable 1-Click & Biometric Store Purchases",
    titleHi: "1-क्लिक और बायोमेट्रिक खरीद बंद करें",
    detailEn: "Require an account password on Google Play, App Store, Steam, or PlayStation for every transaction.",
    detailHi: "हर ट्रांजेक्शन के लिए Google Play, App Store या Steam पर पासवर्ड अनिवार्य करें।",
  },
  {
    id: "spot-dual-currency",
    titleEn: "Spot Dual-Currency Conversion Traps",
    titleHi: "दोहरी वर्चुअल मुद्रा जाल पहचानें",
    detailEn: "Teach kids to convert 'Gems / Crystals / UC' back into real ₹ or $ before clicking confirm.",
    detailHi: "बच्चों को सिखाएं कि जेम्स या कॉइन्स को खरीदने से पहले असली रुपये में कीमत गिनें।",
  },
  {
    id: "discuss-rng-odds",
    titleEn: "Review Drop Rates Together Before Installing",
    titleHi: "इंस्टॉल करने से पहले ड्रॉप रेट जांचें",
    detailEn: "If a game advertises '<1% drop rate' or 'mystery packs', run it through the Transparency Scanner first.",
    detailHi: "यदि गेम में '<1% ड्रॉप रेट' या 'मिस्ट्री पैक' हो, तो पहले स्कैनर में जांच करें।",
  },
  {
    id: "prepaid-budget",
    titleEn: "Use Prepaid Gift Cards Instead of Saved Cards",
    titleHi: "सेव्ड कार्ड के बजाय प्रीपेड गिफ्ट कार्ड उपयोग करें",
    detailEn: "Never leave a parent's UPI, debit, or credit card linked directly to a gaming profile.",
    detailHi: "कभी भी माता-पिता का UPI या कार्ड सीधे गेमिंग अकाउंट से लिंक न छोड़ें।",
  },
];

export const INITIAL_COMMUNITY_REPORTS: CommunityReport[] = [
  {
    id: "rep-1",
    gameTitle: "Galaxy Spin Legends",
    platform: "Android / iOS",
    patternType: "Weighted Spin Wheel & Near-Miss",
    notes: "Grand prize wheel stops 1 millimeter away from jackpot 4 times in a row before prompting a ₹499 gem bundle.",
    submittedAt: "2026-11-24",
  },
  {
    id: "rep-2",
    gameTitle: "Cricket Clash Royale X",
    platform: "Mobile",
    patternType: "Pay-to-Win Loot Crates",
    notes: "Gold bowler cards only drop from paid ₹399 championship crates with undisclosed odds.",
    submittedAt: "2026-11-26",
  },
];

export const AUDIT_PARAMETERS: import("../types/fairplay").AuditParameter[] = [
  {
    id: "loot-boxes",
    category: "RNG & Odds",
    weight: 12,
    labelEn: "Paid Loot Boxes / Mystery Crates",
    labelHi: "पैड लूट बॉक्स / मिस्ट्री क्रेट",
    descEn: "Randomized reward packs purchased directly or indirectly with real money.",
    descHi: "असली पैसों से खरीदे जाने वाले अनिश्चित इनाम पैक।",
  },
  {
    id: "sub-1-drop",
    category: "RNG & Odds",
    weight: 11,
    labelEn: "Sub-1% Rare Drop Rates",
    labelHi: "1% से कम रेयर ड्रॉप रेट",
    descEn: "Top characters or items have under 1% chance per pull.",
    descHi: "शीर्ष आइटम मिलने की संभावना 1% से भी कम है।",
  },
  {
    id: "obscured-odds",
    category: "RNG & Odds",
    weight: 9,
    labelEn: "Obscured or Undisclosed Drop Odds",
    labelHi: "छिपे हुए या अस्पष्ट ऑड्स",
    descEn: "Uses vague '<1%' labels or hides exact pull probabilities.",
    descHi: "सटीक संख्या के बजाय '<1%' लिखकर असली नुकसान छिपाता है।",
  },
  {
    id: "near-miss",
    category: "RNG & Odds",
    weight: 7,
    labelEn: "Near-Miss Animations / Spin Teasers",
    labelHi: "नियर-मिस एनीमेशन भ्रम",
    descEn: "Wheels or pack animations routinely stop one slot away from the grand prize.",
    descHi: "व्हील बार-बार जैकपॉट के ठीक बगल में रुककर झूठी उम्मीद जगाता है।",
  },
  {
    id: "dual-currency",
    category: "Currency & Pricing",
    weight: 9,
    labelEn: "Dual-Currency Obfuscation",
    labelHi: "दोहरी वर्चुअल मुद्रा जाल",
    descEn: "Converts real money into gems, crystals, or tokens to mask true pull cost.",
    descHi: "असली रुपये को जेम्स/कॉइन में बदलकर असली खर्च छिपाता है।",
  },
  {
    id: "pay-to-win",
    category: "Currency & Pricing",
    weight: 12,
    labelEn: "Pay-to-Win Stat Advantages",
    labelHi: "पे-टू-विन ताकत का अंतर",
    descEn: "Paid packs grant combat power, speed, or rank boosts over free players.",
    descHi: "पैसों से खरीदे गए आइटम कौशल की बजाय जीतने की ताकत देते हैं।",
  },
  {
    id: "pity-gate",
    category: "Currency & Pricing",
    weight: 8,
    labelEn: "High Pity / Spend Escalation Gates",
    labelHi: "उच्च पिटी / खर्च सीमा",
    descEn: "Guarantees rare drops only after 60–180 paid pulls.",
    descHi: "गारंटी इनाम के लिए 60–180 बार पैसे खर्च करने पड़ते हैं।",
  },
  {
    id: "annual-reset",
    category: "Currency & Pricing",
    weight: 9,
    labelEn: "Annual / Seasonal Progress Reset",
    labelHi: "वार्षिक / सीज़नल रीसेट",
    descEn: "Paid items or squads expire each season or annual game release.",
    descHi: "हर साल या सीज़न में खरीदी गई चीज़ें बेकार हो जाती हैं।",
  },
  {
    id: "fomo-timers",
    category: "Psychological Pressure",
    weight: 8,
    labelEn: "FOMO Countdown Timers",
    labelHi: "FOMO काउंटडाउन टाइमर",
    descEn: "Expiring banners or 24-hour rotating shops force rushed spending.",
    descHi: "सीमित समय के टाइमर जल्दी खरीदने का मानसिक दबाव बनाते हैं।",
  },
  {
    id: "daily-streak-penalty",
    category: "Psychological Pressure",
    weight: 5,
    labelEn: "Daily Streak Loss Penalties",
    labelHi: "दैनिक लॉगिन स्ट्रीक दबाव",
    descEn: "Punishes missed days or sells paid streak-recovery tokens.",
    descHi: "रोज़ लॉगिन न करने पर नुकसान दिखाता है या पेमेंट मांगता है।",
  },
  {
    id: "social-pressure",
    category: "Psychological Pressure",
    weight: 5,
    labelEn: "Lobby Status / Peer-Pressure Cosmetics",
    labelHi: "सामाजिक दबाव और तुलना",
    descEn: "Highlights default-skin players or links social rank to paid bundles.",
    descHi: "मुफ्त खिलाड़ियों को कमतर दिखाकर खर्च के लिए उकसाता है।",
  },
  {
    id: "energy-paywall",
    category: "Psychological Pressure",
    weight: 6,
    labelEn: "Energy / Stamina Wait Paywalls",
    labelHi: "एनर्जी / स्टैमिना पेवॉल",
    descEn: "Stops gameplay mid-session unless players wait hours or pay to refill.",
    descHi: "खेल जारी रखने के लिए इंतज़ार या पैसे मांगता है।",
  },
  {
    id: "one-click-buy",
    category: "Access & Safeguards",
    weight: 6,
    labelEn: "1-Click Frictionless Store Checkout",
    labelHi: "1-क्लिक बिना पासवर्ड खरीद",
    descEn: "Allows instant purchases without PIN, password, or cooling-off delay.",
    descHi: "बिना पिन या पुष्टि के तुरंत पैसे कट जाते हैं।",
  },
  {
    id: "no-minor-gate",
    category: "Access & Safeguards",
    weight: 8,
    labelEn: "No Spend Cap or Minor Protection",
    labelHi: "नाबालिग सुरक्षा / खर्च सीमा का अभाव",
    descEn: "Lacks parental spend alerts, monthly limits, or age-verified store locks.",
    descHi: "मासिक खर्च सीमा या अभिभावक लॉक की कोई व्यवस्था नहीं है।",
  },
];
