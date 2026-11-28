import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const en = {
  nav: { scan: "Scan", history: "History", recyclers: "Recyclers", more: "More" },
  scan: { title: "Snap the board", hint: "Fit the RAM stick inside the frame", shutter: "Take photo", gallery: "Gallery",
    analysing: "Reading the board…", consent: "Save my photo to help improve results", noCamera: "Camera unavailable. Pick a photo instead.",
    queued: "No internet. Scan saved and will upload automatically.", retake: "Retake", useAnyway: "Use anyway", poor: "Photo may be poor quality",
    blurry: "Blurry: hold steady", too_dark: "Too dark: add light", too_bright: "Too bright: avoid glare", good: "Looks good", failed: "Something went wrong. Try again." },
  result: { value: "Estimated value", range: "range, not a fixed price", whatToDo: "What to do", whereToGo: "Where to go", details: "Details",
    preset: { default: "Balanced", max_profit: "Max profit", greenest: "Greenest" }, notSure: "We're not sure",
    mock: "Demo mode: the AI model is not connected yet. These results are sample data.", reuse: "Reuse", metals: "Metals", cost: "Processing cost",
    components: "Components", count: "Count", conf: "Confidence", reusable: "May be reusable", boardConf: "Board confidence", how: "How this was calculated",
    asOf: "Prices as of", share: "Share", download: "Download", delete: "Delete scan", confirmDelete: "Delete this scan and its photo?",
    useLocation: "Use my location", noRecyclers: "No recyclers found", directions: "Directions", call: "Call", sample: "Sample data: verify before visiting",
    seeMap: "See all on map", authorisedOnly: "Authorised recyclers only", notEligible: "Not eligible", unsafe: "Never burn or acid-leach boards at home." },
  routes: { Reuse: "Reuse", Desolder: "Desolder", Hydromet: "Hydrometallurgy", Pyromet: "Pyrometallurgy" },
  crit: { value: "Value", cost: "Cost", energy: "Energy", co2: "CO₂", score: "Score", moreBetter: "more dots = better" },
  cls: { RAM_IC: "RAM chip", IC: "IC", CAPACITOR: "Capacitor", RESISTOR: "Resistor", CONNECTOR: "Connector", CRYSTAL: "Crystal" },
  history: { title: "Scan history", empty: "No scans yet", pending: "waiting to upload", upload: "Upload now" },
  rec: { title: "Authorised recyclers", near: "Showing recyclers near", allow: "Allow location for nearby results" },
  prices: { title: "Prices & assumptions", intro: "Every number in a result comes from these tables." },
  more: { title: "More", language: "Language", account: "Phone login (optional)", phone: "Phone number", sendCode: "Send code", code: "Code",
    verify: "Verify", logout: "Log out", anon: "Using anonymous mode", loggedIn: "Logged in as", prices: "How values are calculated", install: "Install the app from your browser menu to use it offline." },
  common: { loading: "Loading…", back: "Back" },
};
const hi: typeof en = {
  nav: { scan: "स्कैन", history: "इतिहास", recyclers: "रिसाइक्लर", more: "और" },
  scan: { title: "बोर्ड की फोटो लें", hint: "RAM स्टिक को फ्रेम में रखें", shutter: "फोटो लें", gallery: "गैलरी",
    analysing: "बोर्ड पढ़ रहे हैं…", consent: "नतीजे बेहतर करने के लिए मेरी फोटो सेव करें", noCamera: "कैमरा उपलब्ध नहीं। फोटो चुनें।",
    queued: "इंटरनेट नहीं है। स्कैन सेव हो गया, अपने आप अपलोड होगा।", retake: "दोबारा लें", useAnyway: "फिर भी इस्तेमाल करें", poor: "फोटो साफ़ नहीं हो सकती",
    blurry: "धुंधली: हाथ स्थिर रखें", too_dark: "अंधेरा: रोशनी बढ़ाएँ", too_bright: "बहुत तेज़: चमक से बचें", good: "ठीक है", failed: "कुछ गड़बड़ हुई। फिर कोशिश करें।" },
  result: { value: "अनुमानित कीमत", range: "रेंज, तय दाम नहीं", whatToDo: "क्या करें", whereToGo: "कहाँ जाएँ", details: "विवरण",
    preset: { default: "संतुलित", max_profit: "अधिकतम मुनाफ़ा", greenest: "सबसे हरित" }, notSure: "हमें यकीन नहीं है",
    mock: "डेमो मोड: AI मॉडल अभी जुड़ा नहीं है। ये नमूना नतीजे हैं।", reuse: "पुन: उपयोग", metals: "धातु", cost: "प्रोसेसिंग खर्च",
    components: "पुर्ज़े", count: "संख्या", conf: "भरोसा", reusable: "दोबारा इस्तेमाल हो सकता है", boardConf: "बोर्ड का भरोसा", how: "यह कैसे निकाला गया",
    asOf: "कीमतें", share: "शेयर", download: "डाउनलोड", delete: "स्कैन हटाएँ", confirmDelete: "यह स्कैन और फोटो हटाएँ?",
    useLocation: "मेरी लोकेशन इस्तेमाल करें", noRecyclers: "कोई रिसाइक्लर नहीं मिला", directions: "रास्ता", call: "कॉल", sample: "नमूना डेटा: जाने से पहले जाँच लें",
    seeMap: "नक्शे पर सब देखें", authorisedOnly: "सिर्फ़ अधिकृत रिसाइक्लर", notEligible: "योग्य नहीं", unsafe: "घर पर बोर्ड कभी न जलाएँ, न एसिड में डालें।" },
  routes: { Reuse: "पुन: उपयोग", Desolder: "डीसोल्डर", Hydromet: "हाइड्रोमेटलर्जी", Pyromet: "पायरोमेटलर्जी" },
  crit: { value: "मूल्य", cost: "खर्च", energy: "ऊर्जा", co2: "CO₂", score: "स्कोर", moreBetter: "ज़्यादा बिंदु = बेहतर" },
  cls: { RAM_IC: "RAM चिप", IC: "IC", CAPACITOR: "कैपेसिटर", RESISTOR: "रेज़िस्टर", CONNECTOR: "कनेक्टर", CRYSTAL: "क्रिस्टल" },
  history: { title: "स्कैन इतिहास", empty: "अभी कोई स्कैन नहीं", pending: "अपलोड होना बाकी", upload: "अभी अपलोड करें" },
  rec: { title: "अधिकृत रिसाइक्लर", near: "इनके पास के रिसाइक्लर", allow: "पास के नतीजों के लिए लोकेशन दें" },
  prices: { title: "कीमतें और मान्यताएँ", intro: "नतीजे का हर आँकड़ा इन तालिकाओं से आता है।" },
  more: { title: "और", language: "भाषा", account: "फ़ोन लॉगिन (वैकल्पिक)", phone: "फ़ोन नंबर", sendCode: "कोड भेजें", code: "कोड",
    verify: "सत्यापित करें", logout: "लॉग आउट", anon: "अनाम मोड में हैं", loggedIn: "लॉगिन:", prices: "कीमत कैसे निकलती है", install: "ऑफ़लाइन चलाने के लिए ब्राउज़र मेन्यू से ऐप इंस्टॉल करें।" },
  common: { loading: "लोड हो रहा है…", back: "वापस" },
};

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, hi: { translation: hi } },
  lng: localStorage.getItem("lang") || (navigator.language.startsWith("hi") ? "hi" : "en"),
  fallbackLng: "en", interpolation: { escapeValue: false },
});
i18n.on("languageChanged", (l) => { localStorage.setItem("lang", l); document.documentElement.lang = l; });
export default i18n;
