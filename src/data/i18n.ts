import type { Language } from "../types/fairplay";

export interface Translations {
  brandName: string;
  tagline: string;
  tabs: {
    scanner: string;
    audit: string;
    lab: string;
    shield: string;
    hub: string;
    roadmap: string;
  };
  languageSwitchLabel: string;
  languageButtonText: string;
  footerText: string;
  scanner: {
    heroTitle: string;
    heroSubtitle: string;
    presetsLabel: string;
    gameTitleLabel: string;
    gameTitlePlaceholder: string;
    policyLabel: string;
    policyPlaceholder: string;
    analyzeButton: string;
    analyzingButton: string;
    downloadReport: string;
    riskScoreLabel: string;
    breakdownTitle: string;
    skillLabel: string;
    cosmeticLabel: string;
    gamblingLabel: string;
    patternsTitle: string;
    gamerAlertTitle: string;
    parentAlertTitle: string;
    emptyStateTitle: string;
    emptyStateDesc: string;
    riskBadges: {
      LOW: string;
      MEDIUM: string;
      HIGH: string;
    };
  };
  lab: {
    title: string;
    subtitle: string;
    subtabs: {
      roulette: string;
      gacha: string;
      wheel: string;
    };
    currencyLabel: string;
    rouletteTitle: string;
    rouletteDesc: string;
    europeanTitle: string;
    americanTitle: string;
    spinOnce: string;
    simulate1000: string;
    resetSim: string;
    gachaTitle: string;
    gachaDesc: string;
    singlePull: string;
    tenPull: string;
    pullUntilWin: string;
    wheelTitle: string;
    wheelDesc: string;
    spinWheel: string;
    revealCodeOdds: string;
  };
  shield: {
    title: string;
    subtitle: string;
    pcMode: string;
    extMode: string;
    shieldOn: string;
    shieldOff: string;
    blockedHeading: string;
    blockedBody: string;
    closeAndReturn: string;
    viewMathBreakdown: string;
    safeAllowedToast: string;
  };
  hub: {
    title: string;
    subtitle: string;
    metricsTitle: string;
    checklistTitle: string;
    directoryTitle: string;
    reportButton: string;
    communityFeedTitle: string;
  };
  roadmap: {
    title: string;
    subtitle: string;
    pipelineTitle: string;
    scalabilityTitle: string;
  };
}

export const TRANSLATIONS: Record<Language, Translations> = {
  en: {
    brandName: "FairPlay Lens",
    tagline: "Decoding the Line Between Gaming and Gambling",
    tabs: {
      scanner: "Scanner",
      audit: "Risk Audit",
      lab: "Probability Lab",
      shield: "FairPlay Shield",
      hub: "Parental Hub",
      roadmap: "Roadmap",
    },
    languageSwitchLabel: "Switch interface language to Hindi",
    languageButtonText: "हिन्दी / EN",
    footerText: "Built by Team ByteStorm • FairPlay Lens • Protecting Digital Players",
    scanner: {
      heroTitle: "Transparency Scanner",
      heroSubtitle:
        "Audit any video game or in-game shop policy to separate pure skill gameplay from hidden gambling mechanics.",
      presetsLabel: "One-Click Demo Presets",
      gameTitleLabel: "Game Title",
      gameTitlePlaceholder: "e.g. Aether Gacha RPG or Stardew Valley",
      policyLabel: "Monetization Policy or In-Game Shop Description",
      policyPlaceholder:
        "Paste shop text, drop rates (e.g. 0.6% mythic banner), currency packs, or countdown timers...",
      analyzeButton: "Scan Predatory Risk",
      analyzingButton: "Analyzing Mechanics...",
      downloadReport: "Download Risk Report (Print / PDF)",
      riskScoreLabel: "Predatory Risk Score",
      breakdownTitle: "Mechanic Classification",
      skillLabel: "Skill-Based",
      cosmeticLabel: "Cosmetic",
      gamblingLabel: "Gambling-Like (RNG)",
      patternsTitle: "Mechanic Deconstructor",
      gamerAlertTitle: "Alert for Gamers",
      parentAlertTitle: "Guidance for Parents",
      emptyStateTitle: "Select a preset or paste a game description to begin",
      emptyStateDesc:
        "FairPlay Lens breaks down hidden drop odds, psychological hooks, and real-money spending traps.",
      riskBadges: {
        LOW: "LOW RISK · SAFE",
        MEDIUM: "MEDIUM RISK · CAUTION",
        HIGH: "HIGH RISK · PREDATORY",
      },
    },
    lab: {
      title: "Probability & House Edge Lab",
      subtitle:
        "Interactive mathematical simulators proving why randomized real-money mechanics always favor the house over time.",
      subtabs: {
        roulette: "Roulette House Edge",
        gacha: "Gacha True Cost",
        wheel: "Weighted Wheel Illusion",
      },
      currencyLabel: "Currency",
      rouletteTitle: "American vs. European Roulette Comparator",
      rouletteDesc:
        "Compare 37 pockets (single 0, 2.70% house edge) against 38 pockets (0 and 00, 5.26% house edge) across 1,000 spins.",
      europeanTitle: "European Wheel (37 Pockets · 2.70% Edge)",
      americanTitle: "American Wheel (38 Pockets · 5.26% Edge)",
      spinOnce: "Spin 1x",
      simulate1000: "Simulate 1,000 Spins",
      resetSim: "Reset Simulation",
      gachaTitle: "Gacha & Loot Box True Cost Simulator",
      gachaDesc:
        "Adjust drop rate, pull price, and pity threshold to see how virtual gems translate into real money spent.",
      singlePull: "Single Pull",
      tenPull: "10x Summon",
      pullUntilWin: "Pull Until 1 Rare Win",
      wheelTitle: "Weighted Spinning Wheel (Near-Miss Illusion)",
      wheelDesc:
        "Every slice looks equal at 12.5%, yet hidden server weights and 1-tick near-miss stops engineer false hope.",
      spinWheel: "Spin Prize Wheel",
      revealCodeOdds: "Reveal True Code Odds",
    },
    shield: {
      title: "FairPlay Shield Live Simulation",
      subtitle:
        "Protect young players by selectively blocking real-money RNG popups while keeping core skill gameplay playable.",
      pcMode: "PC Game Companion Mode",
      extMode: "Chrome Extension Mode",
      shieldOn: "FairPlay Shield: ON",
      shieldOff: "FairPlay Shield: OFF",
      blockedHeading: "Uncertain RNG Component Blocked",
      blockedBody:
        "This spinning wheel/gacha mechanic has a 99.4% loss rate and uses real-money currency. Blocked to protect your wallet; your core game remains playable.",
      closeAndReturn: "Close Gambling Popup & Return to Game",
      viewMathBreakdown: "View Math Breakdown",
      safeAllowedToast: "Safe Skill-Based Gameplay Allowed",
    },
    hub: {
      title: "Safe-Gaming Dashboard & Parental Hub",
      subtitle:
        "Actionable family safeguards, verified zero-gambling game alternatives, and live community dark-pattern reporting.",
      metricsTitle: "Youth Exposure & Dark-Pattern Snapshot",
      checklistTitle: "Parental Quick-Action Checklist",
      directoryTitle: "Healthier Game Alternatives (Zero Gambling)",
      reportButton: "Report Predatory Game",
      communityFeedTitle: "Community Dark-Pattern Reports",
    },
    roadmap: {
      title: "System Architecture & Future Roadmap",
      subtitle:
        "How FairPlay Lens scales from browser-based pre-download checks to real-time PC selective overlays across India.",
      pipelineTitle: "End-to-End Detection & Protection Pipeline",
      scalabilityTitle: "Expansion & Regional Impact Roadmap",
    },
  },
  hi: {
    brandName: "FairPlay Lens",
    tagline: "गेमिंग और जुए के बीच की रेखा को समझना",
    tabs: {
      scanner: "स्कैनर",
      audit: "जोखिम ऑडिट",
      lab: "प्रायिकता लैब",
      shield: "फेयरप्ले शील्ड",
      hub: "अभिभावक हब",
      roadmap: "रोडमैप",
    },
    languageSwitchLabel: "Switch interface language to English",
    languageButtonText: "EN / हिन्दी",
    footerText: "टीम ByteStorm द्वारा निर्मित • FairPlay Lens • डिजिटल खिलाड़ियों की सुरक्षा",
    scanner: {
      heroTitle: "पारदर्शिता स्कैनर (Transparency Scanner)",
      heroSubtitle:
        "किसी भी वीडियो गेम या इन-गेम शॉप का विश्लेषण करें और असली कौशल गेमिंग व छिपे हुए जुए के मैकेनिक में अंतर पहचानें।",
      presetsLabel: "वन-क्लिक डेमो प्रीसेट",
      gameTitleLabel: "गेम का नाम",
      gameTitlePlaceholder: "जैसे: Aether Gacha RPG या Stardew Valley",
      policyLabel: "मुद्रीकरण नीति या इन-गेम शॉप विवरण",
      policyPlaceholder:
        "शॉप टेक्स्ट, ड्रॉप रेट (जैसे 0.6% बैनर), वर्चुअल कॉइन पैक या टाइमर पेस्ट करें...",
      analyzeButton: "जोखिम स्कैन करें",
      analyzingButton: "विश्लेषण हो रहा है...",
      downloadReport: "जोखिम रिपोर्ट डाउनलोड करें (Print / PDF)",
      riskScoreLabel: "प्रिडेटरी जोखिम स्कोर",
      breakdownTitle: "मैकेनिक वर्गीकरण",
      skillLabel: "कौशल-आधारित",
      cosmeticLabel: "कॉस्मेटिक",
      gamblingLabel: "जुए जैसा (RNG)",
      patternsTitle: "डार्क-पैटर्न विश्लेषण",
      gamerAlertTitle: "खिलाड़ियों के लिए चेतावनी",
      parentAlertTitle: "अभिभावकों के लिए सलाह",
      emptyStateTitle: "शुरू करने के लिए प्रीसेट चुनें या गेम विवरण दर्ज करें",
      emptyStateDesc:
        "FairPlay Lens छिपे हुए ड्रॉप ऑड्स, मनोवैज्ञानिक दबाव और असली पैसे के खर्च को उजागर करता है।",
      riskBadges: {
        LOW: "कम जोखिम · सुरक्षित",
        MEDIUM: "मध्यम जोखिम · सावधानी",
        HIGH: "उच्च जोखिम · खतरनाक",
      },
    },
    lab: {
      title: "प्रायिकता और हाउस एज लैब",
      subtitle:
        "इंटरैक्टिव गणितीय सिम्युलेटर जो साबित करते हैं कि रैंडम पैसे वाले गेम में लंबे समय में हमेशा कंपनी (हाउस) ही जीतती है।",
      subtabs: {
        roulette: "रूलेट हाउस एज",
        gacha: "गाचा असली लागत",
        wheel: "वेटेड स्पिन व्हील",
      },
      currencyLabel: "मुद्रा",
      rouletteTitle: "अमेरिकन बनाम यूरोपियन रूलेट तुलना",
      rouletteDesc:
        "1,000 स्पिन में देखें कि कैसे 38 पॉकेट (0 और 00, 5.26% एज) खिलाड़ी का बैलेंस दोगुनी तेजी से खत्म करता है।",
      europeanTitle: "यूरोपियन व्हील (37 पॉकेट · 2.70% एज)",
      americanTitle: "अमेरिकन व्हील (38 पॉकेट · 5.26% एज)",
      spinOnce: "1 बार घुमाएँ",
      simulate1000: "1,000 स्पिन चलाएँ",
      resetSim: "रीसेट करें",
      gachaTitle: "गाचा और लूट बॉक्स असली लागत सिम्युलेटर",
      gachaDesc:
        "ड्रॉप रेट, प्रति पुल कीमत और पिटी लिमिट बदलकर देखें कि वर्चुअल जेम्स में कितना असली पैसा खर्च होता है।",
      singlePull: "1 बार पुल",
      tenPull: "10x समन",
      pullUntilWin: "1 रेयर जीत तक पुल करें",
      wheelTitle: "वेटेड स्पिनिंग व्हील (नियर-मिस भ्रम)",
      wheelDesc:
        "हर हिस्सा देखने में 12.5% बराबर लगता है, लेकिन असली कोड में जैकपॉट केवल 0.5% पर सेट होता है।",
      spinWheel: "व्हील घुमाएँ",
      revealCodeOdds: "असली कोड ऑड्स दिखाएँ",
    },
    shield: {
      title: "फेयरप्ले शील्ड लाइव सिमुलेशन",
      subtitle:
        "पूरे गेम को बैन किए बिना केवल जुए जैसे RNG पॉपअप को ब्लॉक करके खिलाड़ियों को सुरक्षित रखें।",
      pcMode: "PC गेम कम्पैनियन मोड",
      extMode: "क्रोम एक्सटेंशन मोड",
      shieldOn: "फेयरप्ले शील्ड: चालू",
      shieldOff: "फेयरप्ले शील्ड: बंद",
      blockedHeading: "अनिश्चित RNG पॉपअप ब्लॉक किया गया",
      blockedBody:
        "इस स्पिनिंग व्हील/गाचा में 99.4% नुकसान की संभावना है और यह असली पैसे का उपयोग करता है। आपका वॉलेट सुरक्षित रखने के लिए इसे रोका गया है; मुख्य गेम अभी भी खेला जा सकता है।",
      closeAndReturn: "जुए का पॉपअप बंद करें और गेम पर लौटें",
      viewMathBreakdown: "गणित विश्लेषण देखें",
      safeAllowedToast: "सुरक्षित कौशल-आधारित गेमप्ले की अनुमति है",
    },
    hub: {
      title: "सुरक्षित-गेमिंग डैशबोर्ड और अभिभावक हब",
      subtitle:
        "परिवार के लिए सुरक्षा चेकलिस्ट, बिना जुए वाले स्वस्थ गेम विकल्प और लाइव कम्युनिटी रिपोर्टिंग।",
      metricsTitle: "युवा जोखिम और डार्क-पैटर्न आंकड़े",
      checklistTitle: "अभिभावक त्वरित-कार्रवाई चेकलिस्ट",
      directoryTitle: "बेहतर और सुरक्षित गेम विकल्प (शून्य जुआ)",
      reportButton: "खतरनाक गेम रिपोर्ट करें",
      communityFeedTitle: "कम्युनिटी द्वारा रिपोर्ट किए गए गेम",
    },
    roadmap: {
      title: "सिस्टम आर्किटेक्चर और भविष्य रोडमैप",
      subtitle:
        "कैसे FairPlay Lens ब्राउज़र स्कैनर से लेकर पूरे भारत में क्षेत्रीय भाषाओं के साथ PC शील्ड तक विस्तार करता है।",
      pipelineTitle: "एंड-टू-एंड पहचान और सुरक्षा पाइपलाइन",
      scalabilityTitle: "विस्तार और क्षेत्रीय प्रभाव योजना",
    },
  },
};
