import type { Language, SampleCase } from '../types/fraud.ts';

export interface TranslationContent {
  brandName: string;
  nav: {
    home: string;
    checkFraud: string;
    howItWorks: string;
    team: string;
    primaryCta: string;
  };
  languageLabel: string;
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    description: string;
    primaryBtn: string;
    secondaryBtn: string;
    helplineNote: string;
    imageAlt: string;
  };
  pillars: {
    sectionTitle: string;
    sectionSubtitle: string;
    items: {
      number: string;
      key: 'detect' | 'alert' | 'protect';
      title: string;
      subtitle: string;
      description: string;
      actionLabel: string;
      targetChannel: 'sms' | 'upi' | 'link';
    }[];
  };
  coverage: {
    sectionTitle: string;
    sectionSubtitle: string;
    channels: {
      title: string;
      channelTag: string;
      fraudPattern: string;
      safePattern: string;
    }[];
    helplineCard: {
      title: string;
      number: string;
      portal: string;
      steps: string[];
    };
  };
  team: {
    eyebrow: string;
    title: string;
    description: string;
    missionPoints: string[];
    ctaLabel: string;
  };
  footer: {
    rights: string;
    builtBy: string;
    helpline: string;
  };
  video: {
    eyebrow: string;
    title: string;
    description: string;
    watchOnYoutube: string;
    items: {
      youtubeId: string;
      tabLabel: string;
      title: string;
      source: string;
    }[];
  };
  checker: {
    title: string;
    subtitle: string;
    channelLabel: string;
    channels: {
      auto: string;
      sms: string;
      upi: string;
      link: string;
    };
    inputLabel: string;
    placeholder: string;
    charCount: string;
    analyzeBtn: string;
    analyzingBtn: string;
    clearBtn: string;
    samplesTitle: string;
    samples: Record<string, string>;
    emptyTitle: string;
    emptyDescription: string;
    emptyGuide: string[];
    loadingText: string;
    errorTitle: string;
    retryBtn: string;
    verdictSafe: string;
    verdictFraud: string;
    riskScoreLabel: string;
    detectedChannelLabel: string;
    findingsTitle: string;
    actionTitle: string;
    copyBtn: string;
    copiedBtn: string;
    emergencyBanner: string;
    historyTitle: string;
    historyEmpty: string;
    historyColumns: {
      content: string;
      channel: string;
      verdict: string;
      score: string;
    };
    voice: {
      sectionLabel: string;
      speakInLabel: string;
      startBtn: string;
      stopBtn: string;
      transcribingBtn: string;
      recordingStatus: string;
      hint: string;
      permissionError: string;
      unsupportedError: string;
    };
  };
}

export const SAMPLE_CASES: SampleCase[] = [
  {
    id: 'sms-fraud',
    channel: 'sms',
    expectedType: 'FRAUD',
    labelKey: 'smsFraud',
    value:
      'URGENT: Dear SBI User, your YONO account will be blocked today at 6 PM due to pending PAN KYC. Update immediately at http://sbi-kyc-verify-now.xyz/login or call +91-9831044219.',
  },
  {
    id: 'sms-safe',
    channel: 'sms',
    expectedType: 'SAFE',
    labelKey: 'smsSafe',
    value:
      'Dear Customer, INR 1,250.00 debited from A/c XX4821 on 21-11-26 via UPI Ref 632519402811. Available Bal: INR 18,420.50. If not done by you, call 1800112211 - SBI.',
  },
  {
    id: 'upi-fraud',
    channel: 'upi',
    expectedType: 'FRAUD',
    labelKey: 'upiFraud',
    value: 'claim-cashback-prize99@okaxis',
  },
  {
    id: 'upi-safe',
    channel: 'upi',
    expectedType: 'SAFE',
    labelKey: 'upiSafe',
    value: 'bharatpe.merchant4812@icici',
  },
  {
    id: 'link-fraud',
    channel: 'link',
    expectedType: 'FRAUD',
    labelKey: 'linkFraud',
    value: 'http://india-post-parcel-delivery-fee.top/track?id=9982',
  },
  {
    id: 'link-safe',
    channel: 'link',
    expectedType: 'SAFE',
    labelKey: 'linkSafe',
    value: 'https://cybercrime.gov.in/Webform/Accept.aspx',
  },
];

export const TRANSLATIONS: Record<Language, TranslationContent> = {
  en: {
    brandName: 'SATARK SETU',
    nav: {
      home: 'Home',
      checkFraud: 'Check Fraud',
      howItWorks: 'How It Works',
      team: 'Team CODE CRAFT',
      primaryCta: 'Check Fraud',
    },
    languageLabel: 'Language',
    hero: {
      eyebrow: 'Detect · Alert · Protect',
      title: 'SATARK SETU',
      subtitle: 'Digital Fraud Defense Bridge for Every Citizen',
      description:
        'Verify suspicious SMS messages, UPI payment IDs, and unknown links before you tap or pay. Built in Odia, Hindi, and English so families stay protected together.',
      primaryBtn: 'Check Fraud Now',
      secondaryBtn: 'Explore How It Works',
      helplineNote: 'National Cyber Crime Helpline: 1930 · cybercrime.gov.in',
      imageAlt: 'Citizen holding a smartphone showing a verified blue security shield',
    },
    pillars: {
      sectionTitle: 'Three Steps to Stay Safe Online',
      sectionSubtitle:
        'Every suspicious message passes through clear verification before any money or personal data leaves your phone.',
      items: [
        {
          number: '01.',
          key: 'detect',
          title: 'Detect',
          subtitle: 'SMS · UPI · Phishing Links',
          description:
            'Inspects urgent KYC threats, spoofed bank headers, deceptive UPI handles, and lookalike website domains in seconds.',
          actionLabel: 'Test SMS Detection',
          targetChannel: 'sms',
        },
        {
          number: '02.',
          key: 'alert',
          title: 'Alert',
          subtitle: 'Clear SAFE or FRAUD Risk Score',
          description:
            'Returns an immediate green SAFE or red FRAUD verdict with a 0–100 risk score and plain-language warning signals.',
          actionLabel: 'Check a UPI ID',
          targetChannel: 'upi',
        },
        {
          number: '03.',
          key: 'protect',
          title: 'Protect',
          subtitle: 'Actionable Citizen Guidance',
          description:
            'Gives step-by-step instructions in Odia, Hindi, and English to block scammers and report incidents to 1930 immediately.',
          actionLabel: 'Verify a Link',
          targetChannel: 'link',
        },
      ],
    },
    coverage: {
      sectionTitle: 'What SATARK SETU Verifies',
      sectionSubtitle:
        'Compare common fraud tactics against legitimate bank, merchant, and government patterns.',
      channels: [
        {
          title: 'SMS & Message Scams',
          channelTag: 'SMS Analysis',
          fraudPattern:
            'Fake account-block warnings, KYC expiry threats, unknown mobile numbers, and shortened or strange domains.',
          safePattern:
            'Standard transaction debit/credit alerts from official bank sender IDs without urgent external login links.',
        },
        {
          title: 'UPI ID & Collect Traps',
          channelTag: 'UPI Verification',
          fraudPattern:
            'Handles promising lottery prizes, cashback claims, or customer-care refunds asking you to enter your UPI PIN.',
          safePattern:
            'Verified merchant or personal handles where you never enter a UPI PIN to receive money.',
        },
        {
          title: 'Deceptive Website Links',
          channelTag: 'URL Inspection',
          fraudPattern:
            'Lookalike domains using .xyz, .top, or misspelled bank/courier names to steal OTPs and card numbers.',
          safePattern:
            'Authentic HTTPS portals on official domains such as .gov.in, .nic.in, or verified bank websites.',
        },
      ],
      helplineCard: {
        title: 'If You Already Shared an OTP or Paid a Scammer',
        number: '1930',
        portal: 'cybercrime.gov.in',
        steps: [
          'Call 1930 immediately within the golden hour to freeze fraudulent transfers.',
          'Call your bank helpline to temporarily block your UPI ID, debit card, or net banking.',
          'Save screenshots of the SMS, UPI handle, and transaction ID for your complaint.',
        ],
      },
    },
    team: {
      eyebrow: 'Presented by Team CODE CRAFT',
      title: 'Built for Multilingual Cyber Awareness',
      description:
        'SATARK SETU is designed by Team CODE CRAFT to bridge the digital safety gap across Odisha and India by delivering instant fraud verification in Odia, Hindi, and English.',
      missionPoints: [
        'Instant SMS, UPI ID, and Link risk evaluation with transparent 0–100 scoring',
        'Native script support in Odia (ଓଡ଼ିଆ), Hindi (हिन्दी), and English',
        'Zero-jargon safety steps built for students, elders, and small merchants',
      ],
      ctaLabel: 'Open Fraud Checker',
    },
    footer: {
      rights: 'SATARK SETU · Detect · Alert · Protect',
      builtBy: 'Created by Team CODE CRAFT',
      helpline: 'Emergency Helpline: 1930',
    },
    video: {
      eyebrow: 'Solution Video Guide',
      title: 'How to Spot & Stop All Types of Cyber Fraud',
      description:
        'Watch official guides covering fake KYC SMS, phishing links, digital arrest calls, UPI traps, and 1930 reporting.',
      watchOnYoutube: 'Watch on YouTube',
      items: [
        {
          youtubeId: '3d8wbhQFHIg',
          tabLabel: 'KYC & SMS',
          title: 'Protect Yourself from Fake KYC & SMS Scams',
          source: 'State Bank of India',
        },
        {
          youtubeId: 'JWd3ex1vxMo',
          tabLabel: 'Phishing Links',
          title: 'Fake KYC Calls & Deceptive Links Explained',
          source: 'CyberDost I4C (MHA)',
        },
        {
          youtubeId: 'gFwOIIWEjns',
          tabLabel: 'Digital Arrest',
          title: 'Digital Arrest Scams — How to Stay Safe',
          source: 'State Bank of India',
        },
        {
          youtubeId: 'wsVX8AQDMBQ',
          tabLabel: 'UPI & 1930',
          title: 'UPI Scam? What to Do Immediately — 1930 Helpline',
          source: '1930 Helpline Guide',
        },
        {
          youtubeId: '3RMWM4oNQ8A',
          tabLabel: 'RBI Security',
          title: 'RBI Cyber Security Awareness',
          source: 'Reserve Bank of India',
        },
      ],
    },
    checker: {
      title: 'Check Fraud',
      subtitle:
        'Paste any SMS message, UPI ID, or website link below to receive a SAFE or FRAUD verdict with a 0–100 risk score.',
      channelLabel: 'Input Type',
      channels: {
        auto: 'Auto Detect',
        sms: 'SMS Text',
        upi: 'UPI ID',
        link: 'Link / URL',
      },
      inputLabel: 'Paste SMS, UPI ID, or Link',
      placeholder:
        'Example: "Your KYC is suspended, click http://..." or "prize-refund@okaxis" or "https://..."',
      charCount: 'characters',
      analyzeBtn: 'Check Fraud',
      analyzingBtn: 'Analyzing...',
      clearBtn: 'Clear',
      samplesTitle: 'Try Realistic Examples',
      samples: {
        smsFraud: 'Fraud KYC SMS',
        smsSafe: 'Safe Bank Alert',
        upiFraud: 'Fraud Prize UPI',
        upiSafe: 'Safe Merchant UPI',
        linkFraud: 'Phishing Link',
        linkSafe: 'Official .gov.in Link',
      },
      emptyTitle: 'Ready to Verify Your Message, UPI ID, or Link',
      emptyDescription:
        'Paste suspicious content on the left or pick any sample above. SATARK SETU checks sender urgency, domain authenticity, and UPI trap patterns.',
      emptyGuide: [
        'Green SAFE (0–35 Risk Score): No active scam indicators found; follow normal caution.',
        'Red FRAUD (65–100 Risk Score): High-risk scam pattern detected; do not click, pay, or share OTP.',
      ],
      loadingText: 'Inspecting text patterns, domain structure, and scam signals...',
      errorTitle: 'Verification Could Not Complete',
      retryBtn: 'Try Again',
      verdictSafe: 'SAFE',
      verdictFraud: 'FRAUD',
      riskScoreLabel: 'Risk Score',
      detectedChannelLabel: 'Detected Channel',
      findingsTitle: 'Key Findings',
      actionTitle: 'Recommended Action',
      copyBtn: 'Copy Report',
      copiedBtn: 'Copied',
      emergencyBanner:
        'Do not click links, enter your UPI PIN, or share OTP. If money was deducted, dial 1930 immediately.',
      historyTitle: 'Recent Checks in This Session',
      historyEmpty: 'Your checked SMS, UPI IDs, and links will appear here for quick comparison.',
      historyColumns: {
        content: 'Checked Input',
        channel: 'Type',
        verdict: 'Verdict',
        score: 'Risk Score',
      },
      voice: {
        sectionLabel: 'Voice Message Input',
        speakInLabel: 'Voice Language',
        startBtn: 'Record Voice',
        stopBtn: 'Stop Recording',
        transcribingBtn: 'Transcribing...',
        recordingStatus: 'Recording',
        hint: 'Speak a suspicious call, SMS, or scam message in English, Hindi, or Odia.',
        permissionError: 'Microphone access was denied. Please allow mic permission in your browser.',
        unsupportedError: 'Voice recording is not supported in this browser.',
      },
    },
  },

  hi: {
    brandName: 'SATARK SETU',
    nav: {
      home: 'होम',
      checkFraud: 'धोखाधड़ी जांचें',
      howItWorks: 'यह कैसे काम करता है',
      team: 'टीम CODE CRAFT',
      primaryCta: 'धोखाधड़ी जांचें',
    },
    languageLabel: 'भाषा',
    hero: {
      eyebrow: 'पहचानें · सतर्क करें · सुरक्षित रखें',
      title: 'सतर्क सेतु',
      subtitle: 'हर नागरिक के लिए डिजिटल सुरक्षा सेतु',
      description:
        'किसी भी संदिग्ध SMS, UPI आईडी या अनजान लिंक पर क्लिक या भुगतान करने से पहले जांच करें। उड़िया, हिंदी और अंग्रेज़ी में उपलब्ध ताकि हर परिवार सुरक्षित रहे।',
      primaryBtn: 'अभी जांच करें',
      secondaryBtn: 'प्रक्रिया देखें',
      helplineNote: 'राष्ट्रीय साइबर अपराध हेल्पलाइन: 1930 · cybercrime.gov.in',
      imageAlt: 'नागरिक के हाथ में स्मार्टफोन जिस पर सुरक्षित नीला शील्ड आइकन दिख रहा है',
    },
    pillars: {
      sectionTitle: 'ऑनलाइन सुरक्षित रहने के तीन कदम',
      sectionSubtitle:
        'पैसे भेजने या कोई जानकारी साझा करने से पहले हर संदिग्ध संदेश की स्पष्ट जांच करें।',
      items: [
        {
          number: '01.',
          key: 'detect',
          title: 'पहचानें (Detect)',
          subtitle: 'SMS · UPI · फ़िशिंग लिंक',
          description:
            'फर्जी KYC धमकी, नकली बैंक संदेश, संदिग्ध UPI हैंडल और मिलते-जुलते फर्जी वेबसाइट लिंक की तुरंत पहचान करता है।',
          actionLabel: 'SMS जांच आज़माएं',
          targetChannel: 'sms',
        },
        {
          number: '02.',
          key: 'alert',
          title: 'सतर्क करें (Alert)',
          subtitle: 'स्पष्ट SAFE या FRAUD जोखिम स्कोर',
          description:
            'तुरंत हरे रंग में SAFE या लाल रंग में FRAUD परिणाम, 0–100 जोखिम स्कोर और सरल चेतावनी संकेत दिखाता है।',
          actionLabel: 'UPI आईडी जांचें',
          targetChannel: 'upi',
        },
        {
          number: '03.',
          key: 'protect',
          title: 'सुरक्षित रखें (Protect)',
          subtitle: 'सरल और तुरंत सुरक्षा उपाय',
          description:
            'ठगों को ब्लॉक करने और 1930 साइबर हेल्पलाइन पर तुरंत शिकायत दर्ज करने के लिए स्पष्ट कदम बताता है।',
          actionLabel: 'लिंक सत्यापित करें',
          targetChannel: 'link',
        },
      ],
    },
    coverage: {
      sectionTitle: 'सतर्क सेतु क्या जांचता है',
      sectionSubtitle:
        'आम साइबर ठगी के तरीकों की असली बैंक, व्यापारी और सरकारी संकेतों से तुलना करें।',
      channels: [
        {
          title: 'SMS और संदेश ठगी',
          channelTag: 'SMS विश्लेषण',
          fraudPattern:
            'खाता बंद होने की धमकी, KYC अपडेट के नाम पर डर, अनजान मोबाइल नंबर और संदिग्ध छोटे लिंक।',
          safePattern:
            'आधिकारिक बैंक सेंडर आईडी से आने वाले सामान्य लेन-देन अलर्ट, जिनमें किसी बाहरी लॉगिन लिंक का दबाव नहीं होता।',
        },
        {
          title: 'UPI आईडी और कलेक्ट जाल',
          channelTag: 'UPI जांच',
          fraudPattern:
            'लॉटरी इनाम, कैशबैक या रिफंड के नाम पर UPI पिन डालने को कहने वाले नकली हैंडल।',
          safePattern:
            'सत्यापित दुकानदार या परिचित UPI आईडी — याद रखें, पैसे प्राप्त करने के लिए कभी UPI पिन नहीं डालना होता।',
        },
        {
          title: 'नकली वेबसाइट लिंक',
          channelTag: 'URL जांच',
          fraudPattern:
            '.xyz, .top या गलत स्पेलिंग वाले बैंक/कूरियर डोमेन जो OTP और कार्ड विवरण चुराने के लिए बनाए जाते हैं।',
          safePattern:
            '.gov.in, .nic.in या सत्यापित बैंक वेबसाइट जैसे आधिकारिक और सुरक्षित HTTPS पोर्टल।',
        },
      ],
      helplineCard: {
        title: 'यदि आपने पहले ही OTP साझा कर दिया है या भुगतान कर दिया है',
        number: '1930',
        portal: 'cybercrime.gov.in',
        steps: [
          'संदिग्ध लेन-देन रोकने के लिए तुरंत 1930 पर कॉल करें।',
          'अपने बैंक को कॉल करके UPI, डेबिट कार्ड या नेट बैंकिंग अस्थायी रूप से ब्लॉक करवाएं।',
          'शिकायत के लिए SMS, UPI आईडी और ट्रांज़ैक्शन आईडी का स्क्रीनशॉट सुरक्षित रखें।',
        ],
      },
    },
    team: {
      eyebrow: 'टीम CODE CRAFT द्वारा प्रस्तुत',
      title: 'बहुभाषी साइबर जागरूकता के लिए निर्मित',
      description:
        'सतर्क सेतु को टीम CODE CRAFT द्वारा ओडिशा और पूरे भारत के नागरिकों को उड़िया, हिंदी और अंग्रेज़ी में तुरंत ठगी से बचाने के लिए बनाया गया है।',
      missionPoints: [
        'SMS, UPI आईडी और लिंक की 0–100 जोखिम स्कोर के साथ तुरंत जांच',
        'उड़िया (ଓଡ଼ିଆ), हिंदी और अंग्रेज़ी में आसान भाषा समर्थन',
        'छात्रों, बुजुर्गों और छोटे व्यापारियों के लिए बिना कठिन तकनीकी शब्दों के सुरक्षा सलाह',
      ],
      ctaLabel: 'धोखाधड़ी जांच खोलें',
    },
    footer: {
      rights: 'सतर्क सेतु · पहचानें · सतर्क करें · सुरक्षित रखें',
      builtBy: 'टीम CODE CRAFT द्वारा निर्मित',
      helpline: 'आपातकालीन हेल्पलाइन: 1930',
    },
    video: {
      eyebrow: 'समाधान वीडियो गाइड',
      title: 'हर तरह के साइबर फ्रॉड से बचने का तरीका',
      description:
        'फर्जी KYC SMS, फ़िशिंग लिंक, डिजिटल अरेस्ट कॉल, UPI जाल और 1930 हेल्पलाइन पर शिकायत के आधिकारिक वीडियो देखें।',
      watchOnYoutube: 'YouTube पर देखें',
      items: [
        {
          youtubeId: '3d8wbhQFHIg',
          tabLabel: 'KYC व SMS',
          title: 'फर्जी KYC और SMS ठगी से खुद को सुरक्षित रखें',
          source: 'भारतीय स्टेट बैंक (SBI)',
        },
        {
          youtubeId: 'JWd3ex1vxMo',
          tabLabel: 'फ़िशिंग लिंक',
          title: 'फर्जी KYC कॉल और नकली लिंक का जाल',
          source: 'CyberDost I4C (गृह मंत्रालय)',
        },
        {
          youtubeId: 'gFwOIIWEjns',
          tabLabel: 'डिजिटल अरेस्ट',
          title: 'डिजिटल अरेस्ट स्कैम से कैसे बचें',
          source: 'भारतीय स्टेट बैंक (SBI)',
        },
        {
          youtubeId: 'wsVX8AQDMBQ',
          tabLabel: 'UPI व 1930',
          title: 'UPI धोखाधड़ी होने पर तुरंत क्या करें — 1930 हेल्पलाइन',
          source: '1930 हेल्पलाइन गाइड',
        },
        {
          youtubeId: '3RMWM4oNQ8A',
          tabLabel: 'RBI सलाह',
          title: 'RBI साइबर सुरक्षा जागरूकता संदेश',
          source: 'भारतीय रिज़र्व बैंक (RBI)',
        },
      ],
    },
    checker: {
      title: 'धोखाधड़ी जांचें',
      subtitle:
        'नीचे कोई भी SMS संदेश, UPI आईडी या वेबसाइट लिंक पेस्ट करें और 0–100 जोखिम स्कोर के साथ SAFE या FRAUD परिणाम देखें।',
      channelLabel: 'इनपुट प्रकार',
      channels: {
        auto: 'स्वतः पहचान',
        sms: 'SMS संदेश',
        upi: 'UPI आईडी',
        link: 'लिंक / URL',
      },
      inputLabel: 'SMS, UPI आईडी या लिंक पेस्ट करें',
      placeholder:
        'उदाहरण: "आपका KYC बंद हो जाएगा, क्लिक करें http://..." या "prize-refund@okaxis" या "https://..."',
      charCount: 'अक्षर',
      analyzeBtn: 'जांच करें',
      analyzingBtn: 'जांच हो रही है...',
      clearBtn: 'साफ़ करें',
      samplesTitle: 'उदाहरण चुनकर जांचें',
      samples: {
        smsFraud: 'फर्जी KYC SMS',
        smsSafe: 'सुरक्षित बैंक अलर्ट',
        upiFraud: 'फर्जी इनाम UPI',
        upiSafe: 'सत्यापित व्यापारी UPI',
        linkFraud: 'फ़िशिंग लिंक',
        linkSafe: 'आधिकारिक .gov.in लिंक',
      },
      emptyTitle: 'संदेश, UPI आईडी या लिंक जांचने के लिए तैयार',
      emptyDescription:
        'बाईं ओर संदिग्ध सामग्री पेस्ट करें या ऊपर से कोई उदाहरण चुनें। सतर्क सेतु संदेश की जल्दबाज़ी, डोमेन की असलियत और UPI जाल की जांच करता है।',
      emptyGuide: [
        'हरा SAFE (0–35 जोखिम स्कोर): कोई सक्रिय ठगी संकेत नहीं मिला; सामान्य सावधानी रखें।',
        'लाल FRAUD (65–100 जोखिम स्कोर): उच्च जोखिम वाली ठगी का संकेत; लिंक न खोलें, भुगतान न करें और OTP न बताएं।',
      ],
      loadingText: 'संदेश के पैटर्न, डोमेन संरचना और ठगी के संकेतों की जांच की जा रही है...',
      errorTitle: 'जांच पूरी नहीं हो सकी',
      retryBtn: 'पुनः प्रयास करें',
      verdictSafe: 'सुरक्षित (SAFE)',
      verdictFraud: 'धोखाधड़ी (FRAUD)',
      riskScoreLabel: 'जोखिम स्कोर',
      detectedChannelLabel: 'पहचाना गया माध्यम',
      findingsTitle: 'मुख्य जांच बिंदु',
      actionTitle: 'सुझाया गया कदम',
      copyBtn: 'रिपोर्ट कॉपी करें',
      copiedBtn: 'कॉपी हो गया',
      emergencyBanner:
        'लिंक पर क्लिक न करें, UPI पिन न डालें और OTP साझा न करें। यदि पैसे कट गए हैं तो तुरंत 1930 पर कॉल करें।',
      historyTitle: 'इस सत्र की हालिया जांच',
      historyEmpty: 'आपकी जांची गई SMS, UPI आईडी और लिंक की सूची यहां दिखाई देगी।',
      historyColumns: {
        content: 'जांची गई सामग्री',
        channel: 'प्रकार',
        verdict: 'परिणाम',
        score: 'जोखिम स्कोर',
      },
      voice: {
        sectionLabel: 'वॉइस संदेश से जांचें',
        speakInLabel: 'आवाज़ की भाषा',
        startBtn: 'माइक से बोलें',
        stopBtn: 'रिकॉर्डिंग रोकें',
        transcribingBtn: 'लिखा जा रहा है...',
        recordingStatus: 'रिकॉर्ड हो रहा है',
        hint: 'अंग्रेज़ी, हिंदी या उड़िया में संदिग्ध कॉल, SMS या संदेश बोलकर दर्ज करें।',
        permissionError: 'माइक्रोफ़ोन की अनुमति नहीं मिली। कृपया ब्राउज़र में माइक की अनुमति दें।',
        unsupportedError: 'इस ब्राउज़र में वॉइस रिकॉर्डिंग उपलब्ध नहीं है।',
      },
    },
  },

  or: {
    brandName: 'SATARK SETU',
    nav: {
      home: 'ହୋମ୍',
      checkFraud: 'ଠକେଇ ଯାଞ୍ଚ',
      howItWorks: 'କିପରି କାମ କରେ',
      team: 'ଟିମ୍ CODE CRAFT',
      primaryCta: 'ଠକେଇ ଯାଞ୍ଚ',
    },
    languageLabel: 'ଭାଷା',
    hero: {
      eyebrow: 'ଚିହ୍ନଟ · ସତର୍କ · ସୁରକ୍ଷା',
      title: 'ସତର୍କ ସେତୁ',
      subtitle: 'ପ୍ରତ୍ୟେକ ନାଗରିକଙ୍କ ପାଇଁ ଡିଜିଟାଲ୍ ସୁରକ୍ଷା ସେତୁ',
      description:
        'କୌଣସି ସନ୍ଦେହଜନକ SMS, UPI ଆଇଡି କିମ୍ବା ଅଜଣା ଲିଙ୍କ୍‌ରେ କ୍ଲିକ୍ କିମ୍ବା ପେମେଣ୍ଟ୍ କରିବା ପୂର୍ବରୁ ଯାଞ୍ଚ କରନ୍ତୁ। ଓଡ଼ିଆ, ହିନ୍ଦୀ ଏବଂ ଇଂରାଜୀରେ ଉପଲବ୍ଧ ଯାହାଦ୍ୱାରା ପରିବାର ସୁରକ୍ଷିତ ରହିବେ।',
      primaryBtn: 'ଏବେ ଠକେଇ ଯାଞ୍ଚ କରନ୍ତୁ',
      secondaryBtn: 'କିପରି କାମ କରେ ଦେଖନ୍ତୁ',
      helplineNote: 'ଜାତୀୟ ସାଇବର ଅପରାଧ ହେଲ୍ପଲାଇନ୍: 1930 · cybercrime.gov.in',
      imageAlt: 'ସୁରକ୍ଷିତ ନୀଳ ଶିଲ୍ଡ ଦେଖାଉଥିବା ସ୍ମାର୍ଟଫୋନ୍ ଧରିଥିବା ନାଗରିକ',
    },
    pillars: {
      sectionTitle: 'ଅନଲାଇନ୍ ସୁରକ୍ଷିତ ରହିବାର ତିନୋଟି ସୋପାନ',
      sectionSubtitle:
        'ଟଙ୍କା ପଠାଇବା କିମ୍ବା ବ୍ୟକ୍ତିଗତ ତଥ୍ୟ ଦେବା ପୂର୍ବରୁ ପ୍ରତ୍ୟେକ ସନ୍ଦେହଜନକ ବାର୍ତ୍ତା ଯାଞ୍ଚ କରନ୍ତୁ।',
      items: [
        {
          number: '01.',
          key: 'detect',
          title: 'ଚିହ୍ନଟ (Detect)',
          subtitle: 'SMS · UPI · ଫିସିଂ ଲିଙ୍କ୍',
          description:
            'ଜରୁରୀ KYC ଧମକ, ନକଲି ବ୍ୟାଙ୍କ ବାର୍ତ୍ତା, ସନ୍ଦେହଜନକ UPI ହ୍ୟାଣ୍ଡେଲ୍ ଏବଂ ନକଲି ୱେବସାଇଟ୍ ଡୋମେନ୍ କିଛି ସେକେଣ୍ଡରେ ଚିହ୍ନଟ କରେ।',
          actionLabel: 'SMS ଯାଞ୍ଚ ପରୀକ୍ଷା କରନ୍ତୁ',
          targetChannel: 'sms',
        },
        {
          number: '02.',
          key: 'alert',
          title: 'ସତର୍କ (Alert)',
          subtitle: 'ସ୍ପଷ୍ଟ SAFE କିମ୍ବା FRAUD ରିସ୍କ୍ ସ୍କୋର୍',
          description:
            'ସବୁଜ SAFE କିମ୍ବା ଲାଲ୍ FRAUD ଫଳାଫଳ ସହିତ 0–100 ରିସ୍କ୍ ସ୍କୋର୍ ଏବଂ ସରଳ ଭାଷାରେ ସତର୍କ ସଙ୍କେତ ଦେଖାଏ।',
          actionLabel: 'UPI ଆଇଡି ଯାଞ୍ଚ କରନ୍ତୁ',
          targetChannel: 'upi',
        },
        {
          number: '03.',
          key: 'protect',
          title: 'ସୁରକ୍ଷା (Protect)',
          subtitle: 'ସରଳ ନାଗରିକ ସୁରକ୍ଷା ପଦକ୍ଷେପ',
          description:
            'ଠକଙ୍କୁ ବ୍ଲକ୍ କରିବା ଏବଂ 1930 ସାଇବର ହେଲ୍ପଲାଇନ୍‌ରେ ତୁରନ୍ତ ଅଭିଯୋଗ କରିବା ପାଇଁ ସ୍ପଷ୍ଟ ମାର୍ଗଦର୍ଶନ ଦିଏ।',
          actionLabel: 'ଲିଙ୍କ୍ ସତ୍ୟାପନ କରନ୍ତୁ',
          targetChannel: 'link',
        },
      ],
    },
    coverage: {
      sectionTitle: 'ସତର୍କ ସେତୁ କ’ଣ ଯାଞ୍ଚ କରେ',
      sectionSubtitle:
        'ସାଧାରଣ ସାଇବର ଠକେଇ କୌଶଳ ସହିତ ପ୍ରକୃତ ବ୍ୟାଙ୍କ, ବ୍ୟବସାୟୀ ଏବଂ ସରକାରୀ ସଙ୍କେତର ତୁଳନା କରନ୍ତୁ।',
      channels: [
        {
          title: 'SMS ଓ ମେସେଜ୍ ଠକେଇ',
          channelTag: 'SMS ବିଶ୍ଳେଷଣ',
          fraudPattern:
            'ଆକାଉଣ୍ଟ୍ ବନ୍ଦ ହେବା ଧମକ, KYC ଅପଡେଟ୍ ଭୟ, ଅଜଣା ମୋବାଇଲ୍ ନମ୍ବର ଏବଂ ସନ୍ଦେହଜନକ ଅଜଣା ଲିଙ୍କ୍।',
          safePattern:
            'ସରକାରୀ ବ୍ୟାଙ୍କ ସେଣ୍ଡର୍ ଆଇଡିରୁ ଆସୁଥିବା ସାଧାରଣ ଟଙ୍କା କାରବାର ସୂଚନା, ଯେଉଁଥିରେ ବାହ୍ୟ ଲଗଇନ୍ ଚାପ ନଥାଏ।',
        },
        {
          title: 'UPI ଆଇଡି ଓ କଲେକ୍ଟ୍ ଜାଲ',
          channelTag: 'UPI ଯାଞ୍ଚ',
          fraudPattern:
            'ଲଟେରୀ ପୁରସ୍କାର, କ୍ୟାସବ୍ୟାକ୍ କିମ୍ବା ରିଫଣ୍ଡ୍ ନାଁରେ UPI ପିନ୍ ଦେବାକୁ କହୁଥିବା ନକଲି ହ୍ୟାଣ୍ଡେଲ୍।',
          safePattern:
            'ଯାଞ୍ଚ ହୋଇଥିବା ବ୍ୟବସାୟୀ କିମ୍ବା ପରିଚିତ UPI ଆଇଡି — ମନେରଖନ୍ତୁ, ଟଙ୍କା ପାଇବା ପାଇଁ କେବେ UPI ପିନ୍ ଦେବାକୁ ପଡ଼େ ନାହିଁ।',
        },
        {
          title: 'ନକଲି ୱେବସାଇଟ୍ ଲିଙ୍କ୍',
          channelTag: 'URL ଯାଞ୍ଚ',
          fraudPattern:
            'OTP ଏବଂ କାର୍ଡ ତଥ୍ୟ ଚୋରି କରିବା ପାଇଁ .xyz, .top କିମ୍ବା ଭୁଲ୍ ବନାନ ଥିବା ବ୍ୟାଙ୍କ/କୋରିଅର୍ ଡୋମେନ୍।',
          safePattern:
            '.gov.in, .nic.in କିମ୍ବା ପ୍ରକୃତ ବ୍ୟାଙ୍କ ୱେବସାଇଟ୍ ଭଳି ବିଶ୍ୱସ୍ତ HTTPS ପୋର୍ଟାଲ୍।',
        },
      ],
      helplineCard: {
        title: 'ଯଦି ଆପଣ ପୂର୍ବରୁ OTP ଦେଇଛନ୍ତି କିମ୍ବା ଟଙ୍କା ପଠାଇଛନ୍ତି',
        number: '1930',
        portal: 'cybercrime.gov.in',
        steps: [
          'ଠକେଇ ଟଙ୍କା ସ୍ଥାନାନ୍ତର ଅଟକାଇବା ପାଇଁ ତୁରନ୍ତ 1930 ନମ୍ବରରେ କଲ୍ କରନ୍ତୁ।',
          'ଆପଣଙ୍କ ବ୍ୟାଙ୍କ ହେଲ୍ପଲାଇନ୍‌ରେ କଲ୍ କରି UPI, ଡେବିଟ୍ କାର୍ଡ କିମ୍ବା ନେଟ୍ ବ୍ୟାଙ୍କିଂ ବ୍ଲକ୍ କରନ୍ତୁ।',
          'ଅଭିଯୋଗ ପାଇଁ SMS, UPI ଆଇଡି ଏବଂ ଟ୍ରାଞ୍ଜାକ୍ସନ୍ ଆଇଡିର ସ୍କ୍ରିନଶଟ୍ ସୁରକ୍ଷିତ ରଖନ୍ତୁ।',
        ],
      },
    },
    team: {
      eyebrow: 'ଟିମ୍ CODE CRAFT ଦ୍ୱାରା ପ୍ରସ୍ତୁତ',
      title: 'ବହୁଭାଷୀ ସାଇବର ସଚେତନତା ପାଇଁ ନିର୍ମିତ',
      description:
        'ଓଡ଼ିଶା ଏବଂ ଭାରତର ପ୍ରତ୍ୟେକ ନାଗରିକଙ୍କୁ ଓଡ଼ିଆ, ହିନ୍ଦୀ ଏବଂ ଇଂରାଜୀରେ ତୁରନ୍ତ ଠକେଇ ଯାଞ୍ଚ ସୁବିଧା ଦେବା ପାଇଁ ଟିମ୍ CODE CRAFT ଦ୍ୱାରା ସତର୍କ ସେତୁ ତିଆରି କରାଯାଇଛି।',
      missionPoints: [
        '0–100 ରିସ୍କ୍ ସ୍କୋର୍ ସହିତ ତୁରନ୍ତ SMS, UPI ଆଇଡି ଏବଂ ଲିଙ୍କ୍ ଯାଞ୍ଚ',
        'ଓଡ଼ିଆ (ଓଡ଼ିଆ), ହିନ୍ଦୀ (हिन्दी) ଏବଂ ଇଂରାଜୀରେ ସହଜ ଭାଷା ସମର୍ଥନ',
        'ଛାତ୍ର, ବୟସ୍କ ଏବଂ କ୍ଷୁଦ୍ର ବ୍ୟବସାୟୀଙ୍କ ପାଇଁ ସରଳ ସୁରକ୍ଷା ମାର୍ଗଦର୍ଶନ',
      ],
      ctaLabel: 'ଠକେଇ ଯାଞ୍ଚ ଖୋଲନ୍ତୁ',
    },
    footer: {
      rights: 'ସତର୍କ ସେତୁ · ଚିହ୍ନଟ · ସତର୍କ · ସୁରକ୍ଷା',
      builtBy: 'ଟିମ୍ CODE CRAFT ଦ୍ୱାରା ନିର୍ମିତ',
      helpline: 'ଜରୁରୀ ହେଲ୍ପଲାଇନ୍: 1930',
    },
    video: {
      eyebrow: 'ସମାଧାନ ଭିଡିଓ ଗାଇଡ୍',
      title: 'ସବୁ ପ୍ରକାର ସାଇବର ଠକେଇରୁ ରକ୍ଷା ପାଇବାର ଉପାୟ',
      description:
        'ନକଲି KYC SMS, ଫିସିଂ ଲିଙ୍କ୍, ଡିଜିଟାଲ୍ ଆରେଷ୍ଟ୍ କଲ୍, UPI ଜାଲ ଏବଂ 1930 ହେଲ୍ପଲାଇନ୍ ଅଭିଯୋଗ ବିଷୟରେ ସରକାରୀ ଭିଡିଓ ଦେଖନ୍ତୁ।',
      watchOnYoutube: 'YouTube ରେ ଦେଖନ୍ତୁ',
      items: [
        {
          youtubeId: '3d8wbhQFHIg',
          tabLabel: 'KYC ଓ SMS',
          title: 'ନକଲି KYC ଏବଂ SMS ଠକେଇରୁ ନିଜକୁ ସୁରକ୍ଷିତ ରଖନ୍ତୁ',
          source: 'ଷ୍ଟେଟ୍ ବ୍ୟାଙ୍କ ଅଫ୍ ଇଣ୍ଡିଆ (SBI)',
        },
        {
          youtubeId: 'JWd3ex1vxMo',
          tabLabel: 'ଫିସିଂ ଲିଙ୍କ୍',
          title: 'ନକଲି KYC କଲ୍ ଏବଂ ଠକ ଲିଙ୍କ୍ ଜାଲ',
          source: 'CyberDost I4C (ଗୃହ ମନ୍ତ୍ରାଳୟ)',
        },
        {
          youtubeId: 'gFwOIIWEjns',
          tabLabel: 'ଡିଜିଟାଲ୍ ଆରେଷ୍ଟ୍',
          title: 'ଡିଜିଟାଲ୍ ଆରେଷ୍ଟ୍ ଠକେଇରୁ କିପରି ବଞ୍ଚିବେ',
          source: 'ଷ୍ଟେଟ୍ ବ୍ୟାଙ୍କ ଅଫ୍ ଇଣ୍ଡିଆ (SBI)',
        },
        {
          youtubeId: 'wsVX8AQDMBQ',
          tabLabel: 'UPI ଓ 1930',
          title: 'UPI ଠକେଇ ହେଲେ ତୁରନ୍ତ କ’ଣ କରିବେ — 1930 ହେଲ୍ପଲାଇନ୍',
          source: '1930 ହେଲ୍ପଲାଇନ୍ ଗାଇଡ୍',
        },
        {
          youtubeId: '3RMWM4oNQ8A',
          tabLabel: 'RBI ସଚେତନତା',
          title: 'RBI ସାଇବର ସୁରକ୍ଷା ସଚେତନତା',
          source: 'ଭାରତୀୟ ରିଜର୍ଭ ବ୍ୟାଙ୍କ (RBI)',
        },
      ],
    },
    checker: {
      title: 'ଠକେଇ ଯାଞ୍ଚ କରନ୍ତୁ',
      subtitle:
        'ତଳେ କୌଣସି SMS ବାର୍ତ୍ତା, UPI ଆଇଡି କିମ୍ବା ୱେବସାଇଟ୍ ଲିଙ୍କ୍ ପେଷ୍ଟ୍ କରନ୍ତୁ ଏବଂ 0–100 ରିସ୍କ୍ ସ୍କୋର୍ ସହିତ SAFE କିମ୍ବା FRAUD ଫଳାଫଳ ଦେଖନ୍ତୁ।',
      channelLabel: 'ଇନପୁଟ୍ ପ୍ରକାର',
      channels: {
        auto: 'ସ୍ୱୟଂ ଚିହ୍ନଟ',
        sms: 'SMS ବାର୍ତ୍ତା',
        upi: 'UPI ଆଇଡି',
        link: 'ଲିଙ୍କ୍ / URL',
      },
      inputLabel: 'SMS, UPI ଆଇଡି କିମ୍ବା ଲିଙ୍କ୍ ପେଷ୍ଟ୍ କରନ୍ତୁ',
      placeholder:
        'ଉଦାହରଣ: "ଆପଣଙ୍କ KYC ବନ୍ଦ ହୋଇଯିବ, କ୍ଲିକ୍ କରନ୍ତୁ http://..." କିମ୍ବା "prize-refund@okaxis" କିମ୍ବା "https://..."',
      charCount: 'ଅକ୍ଷର',
      analyzeBtn: 'ଠକେଇ ଯାଞ୍ଚ କରନ୍ତୁ',
      analyzingBtn: 'ଯାଞ୍ଚ ଚାଲିଛି...',
      clearBtn: 'ସଫା କରନ୍ତୁ',
      samplesTitle: 'ନମୁନା ବାଛି ପରୀକ୍ଷା କରନ୍ତୁ',
      samples: {
        smsFraud: 'ନକଲି KYC SMS',
        smsSafe: 'ସୁରକ୍ଷିତ ବ୍ୟାଙ୍କ ସୂଚନା',
        upiFraud: 'ନକଲି ପୁରସ୍କାର UPI',
        upiSafe: 'ସୁରକ୍ଷିତ ବ୍ୟବସାୟୀ UPI',
        linkFraud: 'ଫିସିଂ ଲିଙ୍କ୍',
        linkSafe: 'ସରକାରୀ .gov.in ଲିଙ୍କ୍',
      },
      emptyTitle: 'ଆପଣଙ୍କ ବାର୍ତ୍ତା, UPI ଆଇଡି କିମ୍ବା ଲିଙ୍କ୍ ଯାଞ୍ଚ ପାଇଁ ପ୍ରସ୍ତୁତ',
      emptyDescription:
        'ବାମ ପାର୍ଶ୍ୱରେ ସନ୍ଦେହଜନକ ବିଷୟ ପେଷ୍ଟ୍ କରନ୍ତୁ କିମ୍ବା ଉପରୁ କୌଣସି ନମୁନା ବାଛନ୍ତୁ। ସତର୍କ ସେତୁ ଜରୁରୀ ଧମକ, ଡୋମେନ୍ ସତ୍ୟତା ଏବଂ UPI ଜାଲ ପରୀକ୍ଷା କରେ।',
      emptyGuide: [
        'ସବୁଜ SAFE (0–35 ରିସ୍କ୍ ସ୍କୋର୍): କୌଣସି ସକ୍ରିୟ ଠକେଇ ସଙ୍କେତ ମିଳିନାହିଁ; ସାଧାରଣ ସତର୍କତା ଅବଲମ୍ବନ କରନ୍ତୁ।',
        'ଲାଲ୍ FRAUD (65–100 ରିସ୍କ୍ ସ୍କୋର୍): ଉଚ୍ଚ ଠକେଇ ବିପଦ ଚିହ୍ନଟ ହୋଇଛି; ଲିଙ୍କ୍ ଖୋଲନ୍ତୁ ନାହିଁ, ଟଙ୍କା ଦିଅନ୍ତୁ ନାହିଁ କିମ୍ବା OTP ଜଣାନ୍ତୁ ନାହିଁ।',
      ],
      loadingText: 'ବାର୍ତ୍ତା ଧାରା, ଡୋମେନ୍ ଗଠନ ଏବଂ ଠକେଇ ସଙ୍କେତ ଯାଞ୍ଚ କରାଯାଉଛି...',
      errorTitle: 'ଯାଞ୍ଚ ସମ୍ପୂର୍ଣ୍ଣ ହୋଇପାରିଲା ନାହିଁ',
      retryBtn: 'ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ',
      verdictSafe: 'ସୁରକ୍ଷିତ (SAFE)',
      verdictFraud: 'ଠକେଇ (FRAUD)',
      riskScoreLabel: 'ରିସ୍କ୍ ସ୍କୋର୍',
      detectedChannelLabel: 'ଚିହ୍ନଟ ମାଧ୍ୟମ',
      findingsTitle: 'ମୁଖ୍ୟ ଯାଞ୍ଚ ତଥ୍ୟ',
      actionTitle: 'ପରାମର୍ଶିତ ପଦକ୍ଷେପ',
      copyBtn: 'ରିପୋର୍ଟ୍ କପି କରନ୍ତୁ',
      copiedBtn: 'କପି ହୋଇଗଲା',
      emergencyBanner:
        'ଲିଙ୍କ୍‌ରେ କ୍ଲିକ୍ କରନ୍ତୁ ନାହିଁ, UPI ପିନ୍ ଦିଅନ୍ତୁ ନାହିଁ କିମ୍ବା OTP ବାଣ୍ଟନ୍ତୁ ନାହିଁ। ଯଦି ଟଙ୍କା କଟିଯାଇଛି, ତୁରନ୍ତ 1930 କୁ କଲ୍ କରନ୍ତୁ।',
      historyTitle: 'ଏହି ସେସନ୍‌ର ସାମ୍ପ୍ରତିକ ଯାଞ୍ଚ',
      historyEmpty: 'ଆପଣ ଯାଞ୍ଚ କରିଥିବା SMS, UPI ଆଇଡି ଏବଂ ଲିଙ୍କ୍ ଏଠାରେ ଦେଖାଯିବ।',
      historyColumns: {
        content: 'ଯାଞ୍ଚ ହୋଇଥିବା ବିଷୟ',
        channel: 'ପ୍ରକାର',
        verdict: 'ଫଳାଫଳ',
        score: 'ରିସ୍କ୍ ସ୍କୋର୍',
      },
      voice: {
        sectionLabel: 'ଭଏସ୍ ବାର୍ତ୍ତା ଦ୍ୱାରା ଯାଞ୍ଚ',
        speakInLabel: 'ଭଏସ୍ ଭାଷା',
        startBtn: 'ମାଇକ୍‌ରେ କୁହନ୍ତୁ',
        stopBtn: 'ରେକର୍ଡିଂ ବନ୍ଦ କରନ୍ତୁ',
        transcribingBtn: 'ଲେଖାଯାଉଛି...',
        recordingStatus: 'ରେକର୍ଡ୍ ହେଉଛି',
        hint: 'ଇଂରାଜୀ, ହିନ୍ଦୀ କିମ୍ବା ଓଡ଼ିଆରେ ସନ୍ଦେହଜନକ କଲ୍, SMS କିମ୍ବା ବାର୍ତ୍ତା କୁହନ୍ତୁ।',
        permissionError: 'ମାଇକ୍ରୋଫୋନ୍ ଅନୁମତି ମିଳିଲା ନାହିଁ। ଦୟାକରି ବ୍ରାଉଜର୍‌ରେ ମାଇକ୍ ଅନୁମତି ଦିଅନ୍ତୁ।',
        unsupportedError: 'ଏହି ବ୍ରାଉଜର୍‌ରେ ଭଏସ୍ ରେକର୍ଡିଂ ସମର୍ଥିତ ନୁହେଁ।',
      },
    },
  },
};
