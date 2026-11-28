// Multilingual translation strings for GoldenHour (English, Odia, Hindi)
// Aligned with PRD Section 6.2 (F-02) and content/i18n rules

export interface LanguageStrings {
  brandTagline: string;
  emergencyCareConnected: string;
  heroSubhead: string;
  getEmergencyHelp: string;
  trackMyRequest: string;
  call112Disclaimer: string;
  fourCategoriesTitle: string;
  fourCategoriesSubtitle: string;
  categories: {
    chestPain: {
      name: string;
      desc: string;
      clinicalNote: string;
    };
    stroke: {
      name: string;
      desc: string;
      clinicalNote: string;
    };
    bleeding: {
      name: string;
      desc: string;
      clinicalNote: string;
    };
    breathing: {
      name: string;
      desc: string;
      clinicalNote: string;
    };
  };
  matchingTitle: string;
  matchingSubtitle: string;
  steps: {
    step1: string;
    step2: string;
    step3: string;
    step4: string;
    step5: string;
  };
  accessibilityTTS: string;
  zeroPiiNotice: string;
}

export const I18N_STRINGS: Record<"en" | "od" | "hi", LanguageStrings> = {
  en: {
    brandTagline: "Tell the emergency room what is coming — before the patient arrives.",
    emergencyCareConnected: "Emergency Care, Connected.",
    heroSubhead: "GoldenHour connects patients, families, and ambulances with hospital emergency departments in real time — closing the critical communication gap before arrival.",
    getEmergencyHelp: "Raise Emergency Alert",
    trackMyRequest: "Track Case Status",
    call112Disclaimer: "For direct ambulance dispatch, always call 112. GoldenHour informs the receiving hospital so their medical team is pre-mobilized.",
    fourCategoriesTitle: "4 Standard Emergency Categories",
    fourCategoriesSubtitle: "Pre-arrival classification enables hospitals to mobilize the right clinical team, equipment, and resuscitation bay in advance.",
    categories: {
      chestPain: {
        name: "Acute Chest Pain",
        desc: "Suspected cardiac emergency, retrosternal crushing pain, arm/jaw radiation",
        clinicalNote: "Mobilizes Cath Lab & Interventional Cardiology",
      },
      stroke: {
        name: "Stroke Symptoms (FAST)",
        desc: "Sudden facial droop, arm weakness, slurred speech, acute confusion",
        clinicalNote: "Pre-clears CT Scanner & Code Stroke Team",
      },
      bleeding: {
        name: "Trauma & Major Bleeding",
        desc: "Severe uncontrolled hemorrhage, high-impact vehicular crash, open fractures",
        clinicalNote: "Alerts Trauma Surgeons & Blood Bank",
      },
      breathing: {
        name: "Severe Respiratory Distress",
        desc: "Inability to breathe or speak words, acute SpO2 desaturation, severe asthma",
        clinicalNote: "Readies High-Flow Oxygen & Critical Care ICU",
      },
    },
    matchingTitle: "5-Step Intelligent Hospital Matching",
    matchingSubtitle: "Transparent, rule-based routing based on registered capabilities, live receiving status, and road travel time — never paid promotions.",
    steps: {
      step1: "1. Registered Capability Verification",
      step2: "2. Live Receiving & Bed Availability",
      step3: "3. Road Distance & Real-Time Travel ETA",
      step4: "4. Information Freshness Verification",
      step5: "5. Transparent Recommendation with Criteria",
    },
    accessibilityTTS: "Read Instructions Aloud",
    zeroPiiNotice: "Zero PII Required: You do not need an account, password, patient name, or medical history to alert the hospital.",
  },
  od: {
    brandTagline: "ରୋଗୀ ପହଞ୍ଚିବା ପୂର୍ବରୁ ଜରୁରୀକାଳୀନ କକ୍ଷକୁ ସୂଚିତ କରନ୍ତୁ।",
    emergencyCareConnected: "ଜରୁରୀକାଳୀନ ଚିକିତ୍ସା, ସଂଯୁକ୍ତ।",
    heroSubhead: "ଗୋଲ୍ଡେନ୍ ଆୱାର୍ ପରିବାର, ଆମ୍ବୁଲାନ୍ସ ଏବଂ ଡାକ୍ତରଖାନା ଜରୁରୀକାଳୀନ ବିଭାଗକୁ ତୁରନ୍ତ ଯୋଡ଼ିଥାଏ — ଯାହାଦ୍ୱାରା ଡାକ୍ତରଖାନା ପୂର୍ବରୁ ପ୍ରସ୍ତୁତ ରହିପାରିବ।",
    getEmergencyHelp: "ଜରୁରୀକାଳୀନ ସୂଚନା ପଠାନ୍ତୁ",
    trackMyRequest: "ଅନୁରୋଧ ଟ୍ରାକ୍ କରନ୍ତୁ",
    call112Disclaimer: "ଆମ୍ବୁଲାନ୍ସ ଡାକିବା ପାଇଁ ସର୍ବଦା ୧୧୨ ରେ କଲ୍ କରନ୍ତୁ। ଗୋଲ୍ଡେନ୍ ଆୱାର୍ ଡାକ୍ତରଖାନାକୁ ଆଗୁଆ ପ୍ରସ୍ତୁତ କରେ।",
    fourCategoriesTitle: "୪ଟି ମୁଖ୍ୟ ଜରୁରୀକାଳୀନ ବିଭାଗ",
    fourCategoriesSubtitle: "ଡାକ୍ତରଖାନାରେ ଡାକ୍ତର ଏବଂ ଉପକରଣ ଆଗୁଆ ପ୍ରସ୍ତୁତ କରିବା ପାଇଁ ଲକ୍ଷଣ ବାଛନ୍ତୁ।",
    categories: {
      chestPain: {
        name: "ଛାତିରେ ଯନ୍ତ୍ରଣା (Chest Pain)",
        desc: "ହୃଦଘାତର ଆଶଙ୍କା, ଛାତି ଚାପି ହେବା, ବାମ ହାତକୁ ଯନ୍ତ୍ରଣା ବ୍ୟାପିବା",
        clinicalNote: "କ୍ୟାଥ୍ ଲ୍ୟାବ୍ ଓ ହୃଦରୋଗ ବିଶେଷଜ୍ଞଙ୍କୁ ଆଲର୍ଟ କରେ",
      },
      stroke: {
        name: "ଷ୍ଟ୍ରୋକ୍ ଲକ୍ଷଣ (Stroke - FAST)",
        desc: "ମୁହଁ ବଙ୍କା ହେବା, ହାତ ଅବଶ ହେବା, କଥା ଅସ୍ପଷ୍ଟ ହେବା",
        clinicalNote: "ସିଟି ସ୍କାନ୍ ଓ ନ୍ୟୁରୋଲୋଜିଷ୍ଟ୍ ପ୍ରସ୍ତୁତ ରଖେ",
      },
      bleeding: {
        name: "ଅତ୍ୟଧିକ ରକ୍ତସ୍ରାବ (Trauma)",
        desc: "ଗୁରୁତର ଦୁର୍ଘଟଣା, ବନ୍ଦ ନ ହେଉଥିବା ରକ୍ତସ୍ରାବ, ଗଭୀର ଆଘାତ",
        clinicalNote: "ଟ୍ରମା ସର୍ଜନ ଓ ବ୍ଲଡ୍ ବ୍ୟାଙ୍କ ସତର୍କ କରେ",
      },
      breathing: {
        name: "ଶ୍ୱାସକ୍ରିୟାରେ ଗୁରୁତର କଷ୍ଟ",
        desc: "ନିଶ୍ୱାସ ନେଇ ନପାରିବା, ଶରୀର ନୀଳ ପଡ଼ିବା, ଅକ୍ସିଜେନ୍ କମିଯିବା",
        clinicalNote: "ଅକ୍ସିଜେନ୍ ଓ ଆଇସିୟୁ ବେଡ୍ ପ୍ରସ୍ତୁତ କରେ",
      },
    },
    matchingTitle: "୫-ସ୍ତରୀୟ ସ୍ୱଚ୍ଛ ଡାକ୍ତରଖାନା ଚୟନ",
    matchingSubtitle: "ଉପଲବ୍ଧ ଚିକିତ୍ସା, ବେଡ୍ ଏବଂ ଦୂରତା ଆଧାରରେ ସଠିକ୍ ଡାକ୍ତରଖାନା ସୁପାରିଶ କରାଯାଏ।",
    steps: {
      step1: "୧. ପଞ୍ଜୀକୃତ ଚିକିତ୍ସା ସୁବିଧା ଯାଞ୍ଚ",
      step2: "୨. ଲାଇଭ୍ ବେଡ୍ ଓ ଗ୍ରହଣ ସ୍ଥିତି ଯାଞ୍ଚ",
      step3: "୩. ଦୂରତା ଓ ଆନୁମାନିକ ପହଞ୍ଚିବା ସମୟ",
      step4: "୪. ତଥ୍ୟର ସତେଜତା ନିଶ୍ଚିତକରଣ",
      step5: "୫. ସ୍ପଷ୍ଟ କାରଣ ସହିତ ସୁପାରିଶ",
    },
    accessibilityTTS: "ନିର୍ଦ୍ଦେଶାବଳୀ ଶୁଣନ୍ତୁ (Read Aloud)",
    zeroPiiNotice: "କୌଣସି ପଞ୍ଜୀକରଣ ବା ନାମ ଆବଶ୍ୟକ ନାହିଁ: ଆପଣ ସିଧାସଳଖ ଆଲର୍ଟ ପଠାଇ ପାରିବେ।",
  },
  hi: {
    brandTagline: "रोगी के पहुंचने से पहले आपातकालीन कक्ष को सूचित करें।",
    emergencyCareConnected: "आपातकालीन स्वास्थ्य समन्वय, अब डिजिटल।",
    heroSubhead: "गोल्डनऑवर परिवारों, एम्बुलेंस और अस्पताल के आपातकालीन विभागों को वास्तविक समय में जोड़ता है — ताकि अस्पताल पहुंचने से पहले तैयार हो सके।",
    getEmergencyHelp: "आपातकालीन अलर्ट भेजें",
    trackMyRequest: "केस स्थिति ट्रैक करें",
    call112Disclaimer: "एम्बुलेंस के लिए हमेशा 112 पर कॉल करें। गोल्डनऑवर अस्पताल की टीम को पूर्व-सूचित करता है।",
    fourCategoriesTitle: "4 मानक आपातकालीन श्रेणियां",
    fourCategoriesSubtitle: "अस्पताल में सही डॉक्टर और उपकरण पूर्व-तैयार करने के लिए लक्षण चुनें।",
    categories: {
      chestPain: {
        name: "सीने में तेज दर्द (Chest Pain)",
        desc: "दिल का दौरा होने का संदेह, सीने में भारीपन, बाएं हाथ में दर्द",
        clinicalNote: "कैथ लैब और कार्डियोलॉजिस्ट को सक्रिय करता है",
      },
      stroke: {
        name: "स्ट्रोक के लक्षण (Stroke - FAST)",
        desc: "चेहरे का टेढ़ा होना, हाथ की कमजोरी, बोलने में कठिनाई",
        clinicalNote: "सीटी स्कैन और न्यूरोलॉजिस्ट को तैयार रखता है",
      },
      bleeding: {
        name: "गंभीर रक्तस्राव एवं आघात (Trauma)",
        desc: "भारी रक्तस्राव, गंभीर सड़क दुर्घटना, गहरे घाव",
        clinicalNote: "ट्रॉमा सर्जन और ब्लड बैंक को तुरंत सूचित करता है",
      },
      breathing: {
        name: "सांस लेने में गंभीर कठिनाई",
        desc: "सांस न ले पाना, ऑक्सीजन का गिरना, गंभीर दमा",
        clinicalNote: "हाई-फ्लो ऑक्सीजन और आईसीयू को तैयार करता है",
      },
    },
    matchingTitle: "5-चरणीय पारदर्शी अस्पताल मिलान",
    matchingSubtitle: "सत्यापित क्षमताओं, वास्तविक समय की उपलब्धता और दूरी के आधार पर सही अस्पताल का चयन।",
    steps: {
      step1: "1. पंजीकृत आपातकालीन क्षमता जांच",
      step2: "2. लाइव बेड एवं भर्ती स्थिति जांच",
      step3: "3. वास्तविक सड़क दूरी और समय का अनुमान",
      step4: "4. डेटा की ताज़गी का सत्यापन",
      step5: "5. पारदर्शी कारणों के साथ अस्पताल सुझाव",
    },
    accessibilityTTS: "निर्देश सुनें (Read Aloud)",
    zeroPiiNotice: "कोई व्यक्तिगत जानकारी आवश्यक नहीं: बिना लॉगिन के तुरंत अस्पताल को सूचित करें।",
  },
};
