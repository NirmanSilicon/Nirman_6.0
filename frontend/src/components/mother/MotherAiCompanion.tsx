import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useLanguage, Language } from '../../context/LanguageContext';
import { useOnlineStatus } from '../OfflineIndicator';
import {
  CompanionCapabilities,
  CompanionLiveVoiceClient,
  CompanionMessage,
  MotherCompanionContext,
  fetchCompanionCapabilities,
  sendCompanionMessage,
  summarizeCompanionConversation,
  synthesizeCompanionSpeech,
  transcribeCompanionAudio,
} from '../../services/companionService';
import { CompanionMemory } from '../../types';
import { DEMO_MOTHERS } from '../../data/centralDemoData';

interface CompanionCopy {
  tooltip: string;
  title: string;
  subtitle: string;
  statusReady: string;
  statusThinking: string;
  statusListening: string;
  statusSpeaking: string;
  statusLiveActive: string;
  statusOffline: string;
  welcomePrompt: string;
  suggestedTitle: string;
  suggestedQuestions: string[];
  inputPlaceholder: string;
  recordingBanner: string;
  transcribingBanner: string;
  liveBanner: string;
  speakingBanner: string;
  interruptSpeakLabel: string;
  listenLabel: string;
  stopLabel: string;
  loadingAudioLabel: string;
  speakerOnLabel: string;
  speakerOffLabel: string;
  liveVoiceLabel: string;
  endLiveLabel: string;
  micLabel: string;
  sendLabel: string;
  retryLabel: string;
  minimizeLabel: string;
  closeLabel: string;
  newChatLabel: string;
  clearHistoryLabel: string;
  saveToTimelineLabel: string;
  memoryTabLabel: string;
  chatTabLabel: string;
  voiceTag: string;
  liveTag: string;
  micDeniedError: string;
  emptyTranscriptError: string;
  offlineError: string;
  safetyNote: string;
  emergencyHeading: string;
  emergencyDisclaimer: string;
  call102Label: string;
  alertWorkerLabel: string;
  confirmAlertTitle: string;
  confirmAlertBody: string;
  confirmSendBtn: string;
  cancelLabel: string;
  alertSentText: string;
  consentTitle: string;
  consentNote: string;
  consentNoAudioNote: string;
  consentConfirmBtn: string;
  savedToast: string;
  privacyHeading: string;
  historyToggleTitle: string;
  historyToggleDesc: string;
  profileContextTitle: string;
  profileContextDesc: string;
  savedSummariesHeading: string;
  noSavedSummaries: string;
  clearAllSavedLabel: string;
  deleteLabel: string;
  modelInfoLabel: string;
}

const COMPANION_COPY: Record<Language, CompanionCopy> = {
  en: {
    tooltip: 'Ask JanmaSaathi',
    title: "Namaste! I'm JanmaSaathi",
    subtitle: 'Your pregnancy companion, here whenever you need guidance.',
    statusReady: 'Ready',
    statusThinking: 'Thinking...',
    statusListening: 'Listening...',
    statusSpeaking: 'Speaking...',
    statusLiveActive: 'Live Voice Active',
    statusOffline: 'Offline',
    welcomePrompt:
      'Ask anything about your pregnancy, nutrition, baby growth, or when to seek care—by typing or speaking.',
    suggestedTitle: 'Suggested questions',
    suggestedQuestions: [
      'What should I eat during pregnancy?',
      'How is my baby developing?',
      'What happens during my current trimester?',
      'When should I visit the hospital?',
      'Which symptoms need urgent attention?',
    ],
    inputPlaceholder: 'Type or speak your question...',
    recordingBanner: 'Listening... Tap mic to send',
    transcribingBanner: 'Understanding your voice...',
    liveBanner: 'Live voice connected — speak naturally anytime',
    speakingBanner: 'JanmaSaathi is speaking...',
    interruptSpeakLabel: 'Interrupt & Speak',
    listenLabel: 'Listen',
    stopLabel: 'Stop',
    loadingAudioLabel: 'Loading...',
    speakerOnLabel: 'Voice replies On',
    speakerOffLabel: 'Voice replies Off',
    liveVoiceLabel: 'Live Voice',
    endLiveLabel: 'End Live',
    micLabel: 'Speak question',
    sendLabel: 'Send message',
    retryLabel: 'Retry',
    minimizeLabel: 'Minimize',
    closeLabel: 'Close',
    newChatLabel: 'Clear chat',
    clearHistoryLabel: 'Clear conversation history',
    saveToTimelineLabel: 'Save summary to timeline',
    memoryTabLabel: 'Privacy & Saved',
    chatTabLabel: 'Chat',
    voiceTag: 'Voice',
    liveTag: 'Live',
    micDeniedError: 'Microphone access was denied. Please allow mic permission or type your question.',
    emptyTranscriptError: 'I could not hear clearly. Please try speaking again or type your question.',
    offlineError: 'You appear to be offline. Please reconnect to ask JanmaSaathi.',
    safetyNote: 'Guidance only — contact your Health Worker or hospital immediately for urgent symptoms.',
    emergencyHeading: 'Urgent Medical Attention Recommended',
    emergencyDisclaimer:
      'JanmaSaathi is a supportive guide, not a doctor. Severe symptoms need prompt checkup — do not delay care.',
    call102Label: 'Call 102 Ambulance',
    alertWorkerLabel: 'Alert Health Worker',
    confirmAlertTitle: 'Confirm sending urgent message to your Health Worker?',
    confirmAlertBody: 'This will notify your assigned Health Worker and log a symptom alert in your records.',
    confirmSendBtn: 'Confirm & Send Alert',
    cancelLabel: 'Cancel',
    alertSentText: 'Urgent symptom alert sent to your Health Worker.',
    consentTitle: 'Save Guidance Summary to Health Timeline?',
    consentNote:
      'This saves a brief personal guidance note to your Journey Timeline. It is not a clinical diagnosis.',
    consentNoAudioNote: 'No voice recordings are ever saved.',
    consentConfirmBtn: 'Save with My Consent',
    savedToast: 'Guidance summary saved to your Journey Timeline.',
    privacyHeading: 'Memory & Privacy Controls',
    historyToggleTitle: 'Keep Conversation History',
    historyToggleDesc: 'Keep messages across panel opens on this device.',
    profileContextTitle: 'Pregnancy Profile Personalization',
    profileContextDesc: 'Allow JanmaSaathi to use your gestational week, updates, and upcoming visits.',
    savedSummariesHeading: 'Saved Timeline Guidance Notes',
    noSavedSummaries: 'No saved guidance notes yet. You can save a summary from any chat with your consent.',
    clearAllSavedLabel: 'Clear all saved notes',
    deleteLabel: 'Remove',
    modelInfoLabel: 'Active AI voice & text service',
  },
  hi: {
    tooltip: 'जन्मसाथी से पूछें',
    title: 'नमस्ते! मैं जन्मसाथी हूँ',
    subtitle: 'आपकी गर्भावस्था की साथी, जब भी आपको मार्गदर्शन चाहिए।',
    statusReady: 'तैयार',
    statusThinking: 'सोच रही हूँ...',
    statusListening: 'सुन रही हूँ...',
    statusSpeaking: 'बोल रही हूँ...',
    statusLiveActive: 'लाइव आवाज़ चालू',
    statusOffline: 'ऑफ़लाइन',
    welcomePrompt:
      'अपनी गर्भावस्था, आहार, शिशु के विकास या जांच के बारे में कुछ भी पूछें — लिखकर या बोलकर।',
    suggestedTitle: 'सुझाए गए प्रश्न',
    suggestedQuestions: [
      'गर्भावस्था के दौरान मुझे क्या खाना चाहिए?',
      'मेरा शिशु कैसे बढ़ रहा है?',
      'मेरी वर्तमान तिमाही में क्या होता है?',
      'मुझे अस्पताल कब जाना चाहिए?',
      'किन लक्षणों पर तुरंत ध्यान देना चाहिए?',
    ],
    inputPlaceholder: 'अपना प्रश्न लिखें या बोलें...',
    recordingBanner: 'सुन रही हूँ... भेजने के लिए माइक दबाएं',
    transcribingBanner: 'आपकी आवाज़ समझ रही हूँ...',
    liveBanner: 'लाइव आवाज़ जुड़ी है — कभी भी स्वाभाविक रूप से बोलें',
    speakingBanner: 'जन्मसाथी बोल रही है...',
    interruptSpeakLabel: 'रोकें और बोलें',
    listenLabel: 'सुनें',
    stopLabel: 'रोकें',
    loadingAudioLabel: 'लोड हो रहा है...',
    speakerOnLabel: 'आवाज़ में उत्तर चालू',
    speakerOffLabel: 'आवाज़ में उत्तर बंद',
    liveVoiceLabel: 'लाइव बातचीत',
    endLiveLabel: 'लाइव बंद करें',
    micLabel: 'बोलकर पूछें',
    sendLabel: 'संदेश भेजें',
    retryLabel: 'पुनः प्रयास करें',
    minimizeLabel: 'छोटा करें',
    closeLabel: 'बंद करें',
    newChatLabel: 'चैट साफ करें',
    clearHistoryLabel: 'बातचीत इतिहास मिटाएं',
    saveToTimelineLabel: 'टाइमलाइन में सारांश सहेजें',
    memoryTabLabel: 'गोपनीयता व सहेजे गए',
    chatTabLabel: 'बातचीत',
    voiceTag: 'आवाज़',
    liveTag: 'लाइव',
    micDeniedError: 'माइक्रोफ़ोन की अनुमति नहीं मिली। कृपया अनुमति दें या लिखकर पूछें।',
    emptyTranscriptError: 'आवाज़ स्पष्ट नहीं सुनाई दी। कृपया फिर से बोलें या टाइप करें।',
    offlineError: 'आप अभी ऑफ़लाइन हैं। जन्मसाथी से बात करने के लिए इंटरनेट से जुड़ें।',
    safetyNote: 'केवल मार्गदर्शन के लिए — किसी भी गंभीर लक्षण पर तुरंत स्वास्थ्य कार्यकर्ता या अस्पताल से संपर्क करें।',
    emergencyHeading: 'तत्काल चिकित्सीय जांच की सलाह',
    emergencyDisclaimer:
      'जन्मसाथी केवल एक सहायक साथी है, डॉक्टर नहीं। गंभीर लक्षणों पर जांच में देर न करें।',
    call102Label: '102 एम्बुलेंस कॉल करें',
    alertWorkerLabel: 'स्वास्थ्य कार्यकर्ता को सूचित करें',
    confirmAlertTitle: 'क्या आप अपनी स्वास्थ्य कार्यकर्ता को यह ज़रूरी संदेश भेजना चाहती हैं?',
    confirmAlertBody: 'इससे आपकी स्वास्थ्य कार्यकर्ता को संदेश और लक्षण अपडेट भेज दिया जाएगा।',
    confirmSendBtn: 'पुष्टि करें और भेजें',
    cancelLabel: 'रद्द करें',
    alertSentText: 'आपकी स्वास्थ्य कार्यकर्ता को ज़रूरी सूचना भेज दी गई है।',
    consentTitle: 'क्या यह सारांश आपकी स्वास्थ्य टाइमलाइन में सहेजें?',
    consentNote: 'यह आपकी यात्रा टाइमलाइन में केवल एक व्यक्तिगत मार्गदर्शन नोट सहेजेगा, कोई डॉक्टर रिपोर्ट नहीं।',
    consentNoAudioNote: 'कोई भी आवाज़ रिकॉर्डिंग कभी सहेजी नहीं जाती।',
    consentConfirmBtn: 'मेरी सहमति से सहेजें',
    savedToast: 'सारांश आपकी टाइमलाइन में सहेजा गया।',
    privacyHeading: 'मेमोरी और गोपनीयता नियंत्रण',
    historyToggleTitle: 'बातचीत का इतिहास रखें',
    historyToggleDesc: 'इस डिवाइस पर बातचीत के संदेश संभाल कर रखें।',
    profileContextTitle: 'गर्भावस्था प्रोफ़ाइल संदर्भ',
    profileContextDesc: 'सप्ताह, स्वास्थ्य अपडेट और अगली जांच के अनुसार व्यक्तिगत मार्गदर्शन पाएं।',
    savedSummariesHeading: 'सहेजे गए टाइमलाइन नोट्स',
    noSavedSummaries: 'अभी कोई सहेजा गया नोट नहीं है। आप अपनी सहमति से किसी भी चैट का सारांश सहेज सकती हैं।',
    clearAllSavedLabel: 'सभी सहेजे गए नोट्स हटाएं',
    deleteLabel: 'हटाएं',
    modelInfoLabel: 'सक्रिय AI आवाज़ और पाठ सेवा',
  },
  or: {
    tooltip: 'ଜନ୍ମସାଥୀଙ୍କୁ ପଚାରନ୍ତୁ',
    title: 'ନମସ୍କାର! ମୁଁ ଜନ୍ମସାଥୀ',
    subtitle: 'ଆପଣଙ୍କ ଗର୍ଭାବସ୍ଥାର ସାଥୀ, ଯେତେବେଳେ ବି ପରାମର୍ଶ ଦରକାର।',
    statusReady: 'ପ୍ରସ୍ତୁତ',
    statusThinking: 'ଚିନ୍ତା କରୁଛି...',
    statusListening: 'ଶୁଣୁଛି...',
    statusSpeaking: 'କହୁଛି...',
    statusLiveActive: 'ଲାଇଭ୍ କଥାବାର୍ତ୍ତା ଚାଲୁ',
    statusOffline: 'ଅଫଲାଇନ୍',
    welcomePrompt:
      'ଆପଣଙ୍କ ଗର୍ଭାବସ୍ଥା, ଖାଦ୍ୟ, ଶିଶୁର ବିକାଶ କିମ୍ବା ଡାକ୍ତରୀ ଯାଞ୍ଚ ବିଷୟରେ ଯାହା ବି ପଚାରନ୍ତୁ — ଲେଖି କିମ୍ବା କହି।',
    suggestedTitle: 'ପ୍ରସ୍ତାବିତ ପ୍ରଶ୍ନ',
    suggestedQuestions: [
      'ଗର୍ଭାବସ୍ଥାରେ ମୁଁ କ’ଣ ଖାଇବା ଉଚିତ?',
      'ମୋ ଶିଶୁର ବିକାଶ କିପରି ହେଉଛି?',
      'ମୋର ବର୍ତ୍ତମାନର ତ୍ରୈମାସିକରେ କ’ଣ ହୁଏ?',
      'ମୁଁ କେତେବେଳେ ଡାକ୍ତରଖାନା ଯିବା ଉଚିତ?',
      'କେଉଁ ଲକ୍ଷଣଗୁଡ଼ିକ ପ୍ରତି ତୁରନ୍ତ ଧ୍ୟାନ ଦେବା ଦରକାର?',
    ],
    inputPlaceholder: 'ଆପଣଙ୍କ ପ୍ରଶ୍ନ ଲେଖନ୍ତୁ କିମ୍ବା କୁହନ୍ତୁ...',
    recordingBanner: 'ଶୁଣୁଛି... ପଠାଇବା ପାଇଁ ମାଇକ୍ ଦବାନ୍ତୁ',
    transcribingBanner: 'ଆପଣଙ୍କ କଥା ବୁଝୁଛି...',
    liveBanner: 'ଲାଇଭ୍ ଭଏସ୍ ସଂଯୁକ୍ତ — ଯେକୌଣସି ସମୟରେ ସ୍ୱାଭାବିକ ଭାବେ କୁହନ୍ତୁ',
    speakingBanner: 'ଜନ୍ମସାଥୀ କହୁଛନ୍ତି...',
    interruptSpeakLabel: 'ଅଟକାନ୍ତୁ ଓ କୁହନ୍ତୁ',
    listenLabel: 'ଶୁଣନ୍ତୁ',
    stopLabel: 'ରୋକନ୍ତୁ',
    loadingAudioLabel: 'ଲୋଡ୍ ହେଉଛି...',
    speakerOnLabel: 'ଆୱାଜ୍ ଉତ୍ତର ଚାଲୁ',
    speakerOffLabel: 'ଆୱାଜ୍ ଉତ୍ତର ବନ୍ଦ',
    liveVoiceLabel: 'ଲାଇଭ୍ ଭଏସ୍',
    endLiveLabel: 'ଲାଇଭ୍ ବନ୍ଦ କରନ୍ତୁ',
    micLabel: 'କହି ପଚାରନ୍ତୁ',
    sendLabel: 'ପଠାନ୍ତୁ',
    retryLabel: 'ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ',
    minimizeLabel: 'ଛୋଟ କରନ୍ତୁ',
    closeLabel: 'ବନ୍ଦ କରନ୍ତୁ',
    newChatLabel: 'ଚାଟ୍ ସଫା କରନ୍ତୁ',
    clearHistoryLabel: 'କଥାବାର୍ତ୍ତା ଇତିହାସ ଲିଭାନ୍ତୁ',
    saveToTimelineLabel: 'ଟାଇମଲାଇନରେ ସାରାଂଶ ସାଇତନ୍ତୁ',
    memoryTabLabel: 'ଗୋପନୀୟତା ଓ ସାଇତା',
    chatTabLabel: 'କଥାବାର୍ତ୍ତା',
    voiceTag: 'ଭଏସ୍',
    liveTag: 'ଲାଇଭ୍',
    micDeniedError: 'ମାଇକ୍ରୋଫୋନ୍ ଅନୁମତି ମିଳିଲା ନାହିଁ। ଦୟାକରି ଅନୁମତି ଦିଅନ୍ତୁ କିମ୍ବା ଲେଖି ପଚାରନ୍ତୁ।',
    emptyTranscriptError: 'କଥା ସ୍ପଷ୍ଟ ଶୁଣାଗଲା ନାହିଁ। ଦୟାକରି ପୁଣି କୁହନ୍ତୁ କିମ୍ବା ଟାଇପ୍ କରନ୍ତୁ।',
    offlineError: 'ଆପଣ ବର୍ତ୍ତମାନ ଅଫଲାଇନ୍ ଅଛନ୍ତି। ଜନ୍ମସାଥୀ ସହ କଥା ହେବା ପାଇଁ ଇଣ୍ଟରନେଟ୍ ସଂଯୋଗ କରନ୍ତୁ।',
    safetyNote: 'କେବଳ ମାର୍ଗଦର୍ଶନ ପାଇଁ — ଜରୁରୀ ଲକ୍ଷଣ ଦେଖାଗଲେ ତୁରନ୍ତ ସ୍ୱାସ୍ଥ୍ୟ କର୍ମୀ କିମ୍ବା ଡାକ୍ତରଖାନା ସହ ଯୋଗାଯୋଗ କରନ୍ତୁ।',
    emergencyHeading: 'ତୁରନ୍ତ ଡାକ୍ତରୀ ପରୀକ୍ଷା ପରାମର୍ଶ',
    emergencyDisclaimer:
      'ଜନ୍ମସାଥୀ କେବଳ ସହାୟତା ପାଇଁ, ଡାକ୍ତର ନୁହନ୍ତି। ଗୁରୁତର ଲକ୍ଷଣରେ ବିଳମ୍ବ କରନ୍ତୁ ନାହିଁ।',
    call102Label: '୧୦୨ ଆମ୍ବୁଲାନ୍ସ କଲ୍ କରନ୍ତୁ',
    alertWorkerLabel: 'ସ୍ୱାସ୍ଥ୍ୟ କର୍ମୀଙ୍କୁ ଜଣାନ୍ତୁ',
    confirmAlertTitle: 'ଆପଣଙ୍କ ସ୍ୱାସ୍ଥ୍ୟ କର୍ମୀଙ୍କୁ ଏହି ଜରୁରୀ ସୂଚନା ପଠାଇବେ କି?',
    confirmAlertBody: 'ଏହା ଆପଣଙ୍କ ନିୟୋଜିତ ସ୍ୱାସ୍ଥ୍ୟ କର୍ମୀଙ୍କୁ ମେସେଜ୍ ଓ ଲକ୍ଷଣ ସୂଚନା ପଠାଇବ।',
    confirmSendBtn: 'ନିଶ୍ଚିତ କରି ପଠାନ୍ତୁ',
    cancelLabel: 'ବାତିଲ କରନ୍ତୁ',
    alertSentText: 'ଆପଣଙ୍କ ସ୍ୱାସ୍ଥ୍ୟ କର୍ମୀଙ୍କୁ ଜରୁରୀ ସୂଚନା ପଠାଗଲା।',
    consentTitle: 'ଆପଣଙ୍କ ସ୍ୱାସ୍ଥ୍ୟ ଟାଇମଲାଇନରେ ସାରାଂଶ ସାଇତିବେ କି?',
    consentNote: 'ଏହା କେବଳ ଆପଣଙ୍କ ବ୍ୟକ୍ତିଗତ ପରାମର୍ଶ ଟିପ୍ପଣୀ ଭାବେ ସାଇତା ହେବ, ଡାକ୍ତରୀ ରିପୋର୍ଟ ନୁହେଁ।',
    consentNoAudioNote: 'କୌଣସି ଭଏସ୍ ରେକର୍ଡିଂ ସାଇତା ଯାଏ ନାହିଁ।',
    consentConfirmBtn: 'ମୋ ସମ୍ମତିରେ ସାଇତନ୍ତୁ',
    savedToast: 'ପରାମର୍ଶ ସାରାଂଶ ଆପଣଙ୍କ ଟାଇମଲାଇନରେ ସାଇତା ହେଲା।',
    privacyHeading: 'ସ୍ମୃତି ଓ ଗୋପନୀୟତା ନିୟନ୍ତ୍ରଣ',
    historyToggleTitle: 'କଥାବାର୍ତ୍ତା ଇତିହାସ ରଖନ୍ତୁ',
    historyToggleDesc: 'ଏହି ଡିଭାଇସରେ ପ୍ୟାନେଲ୍ ଖୋଲିବା ମଧ୍ୟରେ ବାର୍ତ୍ତା ରଖନ୍ତୁ।',
    profileContextTitle: 'ଗର୍ଭାବସ୍ଥା ପ୍ରୋଫାଇଲ୍ ବ୍ୟକ୍ତିଗତକରଣ',
    profileContextDesc: 'ଆପଣଙ୍କ ସପ୍ତାହ, ସ୍ୱାସ୍ଥ୍ୟ ଅପଡେଟ୍ ଓ ଆଗାମୀ ଯାଞ୍ଚ ଅନୁସାରେ ଉତ୍ତର ପାଆନ୍ତୁ।',
    savedSummariesHeading: 'ସାଇତା ହୋଇଥିବା ଟାଇମଲାଇନ୍ ଟିପ୍ପଣୀ',
    noSavedSummaries: 'ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ସାରାଂଶ ସାଇତା ହୋଇନାହିଁ। ଆପଣଙ୍କ ସମ୍ମତିରେ ଯେକୌଣସି ଚାଟ୍ ସାରାଂଶ ସାଇତି ପାରିବେ।',
    clearAllSavedLabel: 'ସମସ୍ତ ସାଇତା ଟିପ୍ପଣୀ ଲିଭାନ୍ତୁ',
    deleteLabel: 'ହଟାନ୍ତୁ',
    modelInfoLabel: 'ସକ୍ରିୟ AI ଭଏସ୍ ଓ ଟେକ୍ସଟ୍ ସେବା',
  },
};

const SESSION_CHAT_KEY_PREFIX = 'janmasaathi_companion_chat_v2_';
const SPEAKER_PREF_KEY = 'janmasaathi_companion_speaker_v1';

const CompanionEmblem: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M12 20.25C12 20.25 4.75 15.65 4.75 9.85C4.75 7.15 6.85 5 9.45 5C10.9 5 12 5.75 12 5.75C12 5.75 13.1 5 14.55 5C17.15 5 19.25 7.15 19.25 9.85C19.25 15.65 12 20.25 12 20.25Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 8.75C10.8 10.1 10.25 11.4 10.25 12.6C10.25 13.75 11.03 14.65 12 14.65C12.97 14.65 13.75 13.75 13.75 12.6C13.75 11.4 13.2 10.1 12 8.75Z"
      fill="currentColor"
    />
  </svg>
);

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export const MotherAiCompanion: React.FC = () => {
  const { user, isAuthLoading } = useAuth();
  const {
    mothers,
    appointments,
    healthUpdates,
    assessments,
    companionMemories,
    companionMemorySettings,
    saveCompanionMemory,
    deleteCompanionMemory,
    clearAllCompanionMemories,
    updateCompanionMemorySettings,
    sendMessage,
    addHealthUpdate,
  } = useData();
  const { language: appLanguage, formatNumber, formatName } = useLanguage();
  const isOnline = useOnlineStatus();

  // Strictly resolve ONLY the authenticated mother's own record (never leak another mother's profile via mothers[0])
  const mother = useMemo(() => {
    const targetId = user?.mcpId || user?.id;
    if (!targetId) return undefined;
    return (
      mothers.find((m) => m.id === targetId) ||
      DEMO_MOTHERS.find((m) => m.id === targetId)
    );
  }, [mothers, user]);

  const motherId = mother?.id || user?.mcpId || user?.id || '';
  const sessionKey = `${SESSION_CHAT_KEY_PREFIX}${motherId}`;

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeView, setActiveView] = useState<'chat' | 'privacy'>('chat');
  const [companionLang, setCompanionLang] = useState<Language>(appLanguage);
  const [speakerEnabled, setSpeakerEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(SPEAKER_PREF_KEY);
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const [messages, setMessages] = useState<CompanionMessage[]>(() => {
    if (!companionMemorySettings.historyEnabled) return [];
    try {
      const raw = localStorage.getItem(sessionKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [loadingAudioMessageId, setLoadingAudioMessageId] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<{
    message: string;
    retryAction?: () => void;
  } | null>(null);

  // Real-time Gemini Live WebSocket state
  const [capabilities, setCapabilities] = useState<CompanionCapabilities | null>(null);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [isLiveSpeaking, setIsLiveSpeaking] = useState(false);
  const [liveInputDraft, setLiveInputDraft] = useState('');
  const [liveOutputDraft, setLiveOutputDraft] = useState('');

  // Consented Timeline Saving Modal State
  const [consentPreview, setConsentPreview] = useState<{
    title: string;
    summary: string;
    topic: CompanionMemory['topic'];
    language: Language;
  } | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSavingMemory, setIsSavingMemory] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Explicit User-Confirmed Emergency Worker Alert State (never silent!)
  const [pendingWorkerAlert, setPendingWorkerAlert] = useState<{
    messageId: string;
    draftText: string;
    dangerSigns: string[];
  } | null>(null);
  const [sentAlertMessageIds, setSentAlertMessageIds] = useState<Record<string, boolean>>({});
  const [isSendingWorkerAlert, setIsSendingWorkerAlert] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const audioAbortRef = useRef<AbortController | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveClientRef = useRef<CompanionLiveVoiceClient | null>(null);
  const liveInputBufferRef = useRef('');
  const liveOutputBufferRef = useRef('');

  const copy = COMPANION_COPY[companionLang] || COMPANION_COPY.en;

  const motherMemories = useMemo(
    () => companionMemories.filter((m) => m.motherId === motherId),
    [companionMemories, motherId]
  );

  // Fetch capabilities once when panel opens and auth state has finished resolving
  useEffect(() => {
    if (isOpen && isOnline && !isAuthLoading && !capabilities) {
      fetchCompanionCapabilities(false)
        .then(setCapabilities)
        .catch(() => {});
    }
  }, [isOpen, isOnline, isAuthLoading, capabilities]);

  // Persist speaker toggle
  useEffect(() => {
    try {
      localStorage.setItem(SPEAKER_PREF_KEY, String(speakerEnabled));
    } catch {
      // ignore
    }
    liveClientRef.current?.setSpeakerEnabled(speakerEnabled);
    if (!speakerEnabled && playingMessageId) {
      stopAudioPlayback();
    }
  }, [speakerEnabled]);

  // Persist or purge in-session chat history strictly according to historyEnabled permission
  useEffect(() => {
    try {
      if (companionMemorySettings.historyEnabled) {
        localStorage.setItem(sessionKey, JSON.stringify(messages.slice(-40)));
      } else {
        localStorage.removeItem(sessionKey);
      }
    } catch {
      // ignore
    }
  }, [messages, companionMemorySettings.historyEnabled, sessionKey]);

  // Auto-sync companion language when app-level language switches
  useEffect(() => {
    setCompanionLang(appLanguage);
  }, [appLanguage]);

  // Auto-scroll
  useEffect(() => {
    if (isOpen && !isMinimized && activeView === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isThinking, liveInputDraft, liveOutputDraft, isOpen, isMinimized, activeView]);

  const stopAudioPlayback = useCallback(() => {
    if (audioAbortRef.current) {
      audioAbortRef.current.abort();
      audioAbortRef.current = null;
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.src = '';
      audioPlayerRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    liveClientRef.current?.interruptPlayback();
    setPlayingMessageId(null);
    setLoadingAudioMessageId(null);
    setIsLiveSpeaking(false);
  }, []);

  const stopRecordingCleanup = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
    setIsRecording(false);
    setRecordingSeconds(0);
  }, []);

  const disconnectLiveVoice = useCallback(() => {
    if (liveClientRef.current) {
      liveClientRef.current.disconnect();
      liveClientRef.current = null;
    }
    setIsLiveActive(false);
    setIsLiveSpeaking(false);
    setLiveInputDraft('');
    setLiveOutputDraft('');
    liveInputBufferRef.current = '';
    liveOutputBufferRef.current = '';
  }, []);

  useEffect(() => {
    return () => {
      stopAudioPlayback();
      stopRecordingCleanup();
      disconnectLiveVoice();
    };
  }, [stopAudioPlayback, stopRecordingCleanup, disconnectLiveVoice]);

  // Strictly build authorized, mother-only pregnancy context
  const getMotherContext = useCallback((): MotherCompanionContext => {
    if (!companionMemorySettings.useProfileContext) {
      return {
        motherId,
        memoryConsent: {
          useProfileContext: false,
          historyEnabled: companionMemorySettings.historyEnabled,
        },
      };
    }

    const weeks = mother?.gestationalAgeWeeks;
    const trimester =
      typeof weeks === 'number' ? (weeks <= 12 ? 1 : weeks <= 27 ? 2 : 3) : undefined;

    const motherAppt = appointments.find((a) => a.motherId === motherId) || null;
    const motherUpdates = healthUpdates
      .filter((u) => u.motherId === motherId)
      .slice(0, 3)
      .map((u) => ({
        submittedAt: u.submittedAt,
        observations: u.observations,
        symptoms: u.symptoms,
        notes: u.notes,
        reviewStatus: u.reviewStatus,
        reviewNotes: u.reviewNotes,
      }));
    const latestAsmt = assessments.find((a) => a.motherId === motherId) || null;

    let hydrationGlassesToday: number | null = null;
    try {
      const wRaw = localStorage.getItem('janmasaathi_water_glasses');
      if (wRaw !== null && !Number.isNaN(Number(wRaw))) {
        hydrationGlassesToday = Number(wRaw);
      }
    } catch {
      // ignore
    }

    return {
      motherId,
      firstName: mother?.name?.split(' ')[0],
      age: mother?.age,
      gestationalAgeWeeks: weeks,
      gestationalAgeDays: mother?.gestationalAgeDays,
      trimester,
      edd: mother?.edd,
      gravidity: mother?.gravidity,
      parity: mother?.parity,
      assignedWorkerName: mother?.assignedWorkerName,
      village: mother?.village,
      hydrationGlassesToday,
      nextAppointment: motherAppt
        ? {
            title: motherAppt.title,
            date: motherAppt.date,
            time: motherAppt.time,
            facility: motherAppt.facility,
          }
        : null,
      recentHealthUpdates: motherUpdates,
      latestAssessment: latestAsmt
        ? {
            recordedAt: latestAsmt.recordedAt,
            gestationalWeek: latestAsmt.gestationalWeek,
            systolicBP: latestAsmt.systolicBP,
            diastolicBP: latestAsmt.diastolicBP,
            hemoglobin: latestAsmt.hemoglobin,
            fetalMovementStatus: latestAsmt.fetalMovementStatus,
            dangerSigns: latestAsmt.dangerSigns,
            nutritionalAdvice: latestAsmt.nutritionalAdvice,
            symptomsNotes: latestAsmt.symptomsNotes,
          }
        : null,
      consentedMemories: motherMemories.slice(0, 4).map((m) => ({
        createdAt: m.savedAt,
        summary: m.summary,
        topic: m.topic,
      })),
      memoryConsent: {
        useProfileContext: true,
        historyEnabled: companionMemorySettings.historyEnabled,
      },
    };
  }, [
    mother,
    motherId,
    appointments,
    healthUpdates,
    assessments,
    motherMemories,
    companionMemorySettings,
  ]);

  const playMessageAudio = useCallback(
    async (msg: CompanionMessage) => {
      stopAudioPlayback();
      setVoiceError(null);

      if (!isOnline) {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(msg.text);
          utterance.lang =
            msg.language === 'hi' ? 'hi-IN' : msg.language === 'or' ? 'or-IN' : 'en-IN';
          utterance.onend = () => setPlayingMessageId(null);
          utterance.onerror = () => setPlayingMessageId(null);
          setPlayingMessageId(msg.id);
          window.speechSynthesis.speak(utterance);
          return;
        }
        setVoiceError({ message: copy.offlineError });
        return;
      }

      setLoadingAudioMessageId(msg.id);
      const controller = new AbortController();
      audioAbortRef.current = controller;

      try {
        const { audioBase64, mimeType } = await synthesizeCompanionSpeech({
          text: msg.text,
          language: msg.language,
        });

        if (controller.signal.aborted) return;

        const audio = new Audio(`data:${mimeType};base64,${audioBase64}`);
        audioPlayerRef.current = audio;

        audio.onended = () => {
          setPlayingMessageId(null);
          audioPlayerRef.current = null;
        };
        audio.onerror = () => {
          setPlayingMessageId(null);
          audioPlayerRef.current = null;
        };

        setLoadingAudioMessageId(null);
        setPlayingMessageId(msg.id);
        await audio.play();
      } catch (err: any) {
        if (controller.signal.aborted) return;
        setLoadingAudioMessageId(null);
        setPlayingMessageId(null);

        // Graceful fallback to local device voice ONLY if browser actually has a matching voice (hi/en)
        if (typeof window !== 'undefined' && 'speechSynthesis' in window && msg.language !== 'or') {
          const targetPrefix = msg.language === 'hi' ? 'hi' : 'en';
          const voices = window.speechSynthesis.getVoices();
          const hasMatchingVoice = voices.some((v) =>
            v.lang.toLowerCase().startsWith(targetPrefix)
          );
          if (hasMatchingVoice) {
            const utterance = new SpeechSynthesisUtterance(msg.text);
            utterance.lang = msg.language === 'hi' ? 'hi-IN' : 'en-IN';
            utterance.onend = () => setPlayingMessageId(null);
            utterance.onerror = () => setPlayingMessageId(null);
            setPlayingMessageId(msg.id);
            window.speechSynthesis.speak(utterance);
            return;
          }
        }

        const rawMsg = String(err?.message || '');
        const safeMsg =
          rawMsg && !rawMsg.trim().startsWith('{')
            ? rawMsg
            : 'Voice playback is temporarily busy. You can read the reply above.';
        setVoiceError({
          message: safeMsg,
          retryAction: () => playMessageAudio(msg),
        });
      }
    },
    [isOnline, copy.offlineError, stopAudioPlayback]
  );

  const handleTogglePlayback = async (msg: CompanionMessage) => {
    if (playingMessageId === msg.id || loadingAudioMessageId === msg.id) {
      stopAudioPlayback();
      return;
    }
    await playMessageAudio(msg);
  };

  const handleSendText = useCallback(
    async (
      rawText: string,
      viaVoice = false,
      overrideLang?: Language,
      options?: { replaceErrorId?: string; skipUserEcho?: boolean }
    ) => {
      const trimmed = rawText.trim();
      const activeLang = overrideLang || companionLang;
      const activeCopy = COMPANION_COPY[activeLang];
      if (!trimmed || isThinking) return;

      setVoiceError(null);
      stopAudioPlayback();

      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const userMsg: CompanionMessage = {
        id: `usr-${Date.now()}`,
        role: 'user',
        text: trimmed,
        language: activeLang,
        timestamp: nowTime,
        viaVoice,
      };

      const historySnapshot = messages
        .filter((m) => !m.isError)
        .map((m) => ({ role: m.role, text: m.text }));

      setMessages((prev) => {
        const filtered = options?.replaceErrorId
          ? prev.filter((m) => m.id !== options.replaceErrorId)
          : prev;
        return options?.skipUserEcho ? filtered : [...filtered, userMsg];
      });

      if (!viaVoice && !options?.skipUserEcho) {
        setInputText('');
      }

      if (!isOnline) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            text: activeCopy.offlineError,
            language: activeLang,
            timestamp: nowTime,
            isError: true,
            retryPayload: { text: trimmed, viaVoice, language: activeLang },
          },
        ]);
        return;
      }

      setIsThinking(true);
      try {
        const result = await sendCompanionMessage({
          message: trimmed,
          language: activeLang,
          history: historySnapshot,
          motherContext: getMotherContext(),
        });

        const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const aiMsg: CompanionMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          text: result.reply,
          language: result.language,
          timestamp: aiTime,
          urgencyLevel: result.urgencyLevel,
          dangerSignsDetected: result.dangerSignsDetected,
          clarificationNeeded: result.clarificationNeeded,
          suggestedTimelineSummary: result.suggestedTimelineSummary,
          model: result.model,
          mode: 'pipeline',
        };
        setMessages((prev) => [...prev, aiMsg]);

        // Automatically speak response if Speaker Toggle is ON
        if (speakerEnabled) {
          void playMessageAudio(aiMsg);
        }
      } catch (err: any) {
        const errTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            text: err?.message || activeCopy.offlineError,
            language: activeLang,
            timestamp: errTime,
            isError: true,
            retryPayload: { text: trimmed, viaVoice, language: activeLang },
          },
        ]);
      } finally {
        setIsThinking(false);
      }
    },
    [
      companionLang,
      isThinking,
      messages,
      isOnline,
      getMotherContext,
      speakerEnabled,
      playMessageAudio,
      stopAudioPlayback,
    ]
  );

  const handleRetryErrorBubble = (errMsg: CompanionMessage) => {
    if (!errMsg.retryPayload) return;
    handleSendText(errMsg.retryPayload.text, errMsg.retryPayload.viaVoice, errMsg.retryPayload.language, {
      replaceErrorId: errMsg.id,
      skipUserEcho: true,
    });
  };

  // Transcribe recorded blob with Retry support
  const processAudioBlob = useCallback(
    async (audioBlob: Blob, mimeType: string, activeLang: Language) => {
      const activeCopy = COMPANION_COPY[activeLang];
      setIsTranscribing(true);
      try {
        const audioBase64 = await blobToBase64(audioBlob);
        const transcript = await transcribeCompanionAudio({
          audioBase64,
          mimeType,
          language: activeLang,
        });

        if (!transcript) {
          setVoiceError({
            message: activeCopy.emptyTranscriptError,
            retryAction: () => processAudioBlob(audioBlob, mimeType, activeLang),
          });
        } else {
          await handleSendText(transcript, true, activeLang);
        }
      } catch (err: any) {
        setVoiceError({
          message: err?.message || activeCopy.emptyTranscriptError,
          retryAction: () => processAudioBlob(audioBlob, mimeType, activeLang),
        });
      } finally {
        setIsTranscribing(false);
      }
    },
    [handleSendText]
  );

  const startPushToTalkRecording = useCallback(async () => {
    setVoiceError(null);

    if (!isOnline) {
      setVoiceError({ message: copy.offlineError });
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setVoiceError({ message: copy.micDeniedError });
      return;
    }

    try {
      stopAudioPlayback();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const preferredMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

      const recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const chunks = [...audioChunksRef.current];
        const activeLang = companionLang;
        stopRecordingCleanup();

        if (chunks.length === 0) return;

        const audioBlob = new Blob(chunks, { type: mimeType });
        if (audioBlob.size < 400) {
          setVoiceError({ message: COMPANION_COPY[activeLang].emptyTranscriptError });
          return;
        }

        await processAudioBlob(audioBlob, mimeType, activeLang);
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch {
      stopRecordingCleanup();
      setVoiceError({ message: copy.micDeniedError });
    }
  }, [isOnline, copy, stopAudioPlayback, companionLang, stopRecordingCleanup, processAudioBlob]);

  const handleToggleRecording = async () => {
    if (isLiveActive) {
      disconnectLiveVoice();
      return;
    }

    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      return;
    }

    // Interrupt speaking immediately and begin listening!
    if (playingMessageId || loadingAudioMessageId) {
      stopAudioPlayback();
    }

    await startPushToTalkRecording();
  };

  // Explicit Interrupt & Speak control while JanmaSaathi is speaking
  const handleInterruptAndSpeak = async () => {
    stopAudioPlayback();
    if (!isLiveActive && !isRecording) {
      await startPushToTalkRecording();
    }
  };

  // Real-time Gemini Live API (`gemini-3.8-live`) Voice Session
  const handleToggleLiveVoice = async () => {
    setVoiceError(null);

    if (isLiveActive) {
      disconnectLiveVoice();
      return;
    }

    if (!isOnline) {
      setVoiceError({ message: copy.offlineError });
      return;
    }

    stopAudioPlayback();
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }

    liveInputBufferRef.current = '';
    liveOutputBufferRef.current = '';

    const client = new CompanionLiveVoiceClient({
      onReady: () => {
        setIsLiveActive(true);
      },
      onInputTranscription: (chunk) => {
        liveInputBufferRef.current += chunk;
        setLiveInputDraft(liveInputBufferRef.current);
      },
      onOutputTranscription: (chunk) => {
        liveOutputBufferRef.current += chunk;
        setLiveOutputDraft(liveOutputBufferRef.current);
      },
      onSpeakingChange: (speaking) => {
        setIsLiveSpeaking(speaking);
      },
      onInterrupted: () => {
        setIsLiveSpeaking(false);
        liveOutputBufferRef.current = '';
        setLiveOutputDraft('');
      },
      onTurnComplete: ({ urgencyLevel, dangerSignsDetected }) => {
        const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const userText = liveInputBufferRef.current.trim();
        const aiText = liveOutputBufferRef.current.trim();
        const additions: CompanionMessage[] = [];

        if (userText) {
          additions.push({
            id: `usr-live-${Date.now()}`,
            role: 'user',
            text: userText,
            language: companionLang,
            timestamp: nowTime,
            viaVoice: true,
            mode: 'live',
          });
        }
        if (aiText) {
          additions.push({
            id: `ai-live-${Date.now() + 1}`,
            role: 'assistant',
            text: aiText,
            language: companionLang,
            timestamp: nowTime,
            urgencyLevel,
            dangerSignsDetected,
            mode: 'live',
            model: capabilities?.liveModelEvaluated || 'gemini-3.8-live',
          });
        }
        if (additions.length > 0) {
          setMessages((prev) => [...prev, ...additions]);
        }
        liveInputBufferRef.current = '';
        liveOutputBufferRef.current = '';
        setLiveInputDraft('');
        setLiveOutputDraft('');
      },
      onFallbackRequired: (reason) => {
        disconnectLiveVoice();
        setVoiceError({
          message: reason,
        });
      },
      onError: (message) => {
        setVoiceError({ message });
      },
      onClose: () => {
        setIsLiveActive(false);
        setIsLiveSpeaking(false);
      },
    });

    liveClientRef.current = client;
    try {
      await client.connect({
        language: companionLang,
        motherContext: getMotherContext(),
        speakerEnabled,
      });
    } catch {
      disconnectLiveVoice();
      setVoiceError({ message: copy.micDeniedError });
    }
  };

  // Switch language cleanly (if Live Voice active, cleanly end Live session so next turn uses new language)
  const handleChangeLanguage = (nextLang: Language) => {
    if (nextLang === companionLang) return;
    if (isLiveActive) {
      disconnectLiveVoice();
    }
    setCompanionLang(nextLang);
  };

  // Consented Timeline Summary Preparation
  const handleRequestTimelineSave = async () => {
    if (messages.filter((m) => !m.isError).length === 0 || isSummarizing) return;
    setVoiceError(null);
    setIsSummarizing(true);

    const cleanMsgs = messages
      .filter((m) => !m.isError)
      .map((m) => ({ role: m.role, text: m.text }));

    try {
      if (isOnline) {
        const result = await summarizeCompanionConversation({
          messages: cleanMsgs,
          language: companionLang,
          motherContext: getMotherContext(),
        });
        setConsentPreview(result);
      } else {
        const lastAi = [...messages].reverse().find((m) => m.role === 'assistant' && !m.isError);
        setConsentPreview({
          title: 'JanmaSaathi Guidance Note',
          summary: lastAi?.text.slice(0, 320) || cleanMsgs[0].text.slice(0, 320),
          topic: 'general',
          language: companionLang,
        });
      }
    } catch (err: any) {
      const lastAi = [...messages].reverse().find((m) => m.role === 'assistant' && !m.isError);
      if (lastAi) {
        setConsentPreview({
          title: 'JanmaSaathi Guidance Note',
          summary: lastAi.suggestedTimelineSummary || lastAi.text.slice(0, 320),
          topic: 'general',
          language: companionLang,
        });
      } else {
        setVoiceError({ message: err?.message || 'Could not prepare summary.' });
      }
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleConfirmSaveToTimeline = async () => {
    if (!consentPreview || isSavingMemory) return;
    setIsSavingMemory(true);
    try {
      await saveCompanionMemory({
        motherId,
        title: consentPreview.title,
        summary: consentPreview.summary,
        topic: consentPreview.topic,
        language: consentPreview.language,
        gestationalWeek: mother?.gestationalAgeWeeks ?? 24,
      });
      setConsentPreview(null);
      setStatusNotice(copy.savedToast);
      setTimeout(() => setStatusNotice(null), 3500);
    } finally {
      setIsSavingMemory(false);
    }
  };

  // Explicit Mother-Confirmed Emergency Alert to Assigned Health Worker (NEVER silent!)
  const handleOpenWorkerAlertConfirm = (msg: CompanionMessage) => {
    const signs = msg.dangerSignsDetected?.length ? msg.dangerSignsDetected.join(', ') : 'Urgent symptom reported';
    const userPrompt = messages
      .slice()
      .reverse()
      .find((m) => m.role === 'user')?.text;
    setPendingWorkerAlert({
      messageId: msg.id,
      dangerSigns: msg.dangerSignsDetected || [],
      draftText: `Urgent symptom check requested (${signs}): ${userPrompt || 'Please call me or visit when available.'}`,
    });
  };

  const handleConfirmSendWorkerAlert = async () => {
    if (!pendingWorkerAlert || isSendingWorkerAlert) return;
    setIsSendingWorkerAlert(true);
    try {
      await sendMessage(
        pendingWorkerAlert.draftText,
        'mother',
        motherId,
        mother?.name || 'Priya Sharma',
        motherId
      );
      await addHealthUpdate({
        motherId,
        motherName: mother?.name || 'Priya Sharma',
        observations: pendingWorkerAlert.draftText,
        symptoms:
          pendingWorkerAlert.dangerSigns.length > 0
            ? pendingWorkerAlert.dangerSigns
            : ['Urgent Danger Sign Check'],
        notes: 'Submitted with mother confirmation from JanmaSaathi emergency guidance.',
        submittedBy: mother?.name || 'Priya Sharma',
      });
      setSentAlertMessageIds((prev) => ({ ...prev, [pendingWorkerAlert.messageId]: true }));
      setPendingWorkerAlert(null);
      setStatusNotice(copy.alertSentText);
      setTimeout(() => setStatusNotice(null), 4000);
    } finally {
      setIsSendingWorkerAlert(false);
    }
  };

  const handleClearCurrentChat = () => {
    stopAudioPlayback();
    if (isLiveActive) disconnectLiveVoice();
    setMessages([]);
    setVoiceError(null);
    setConsentPreview(null);
    setPendingWorkerAlert(null);
    try {
      localStorage.removeItem(sessionKey);
    } catch {
      // ignore
    }
  };

  const handleOpenPanel = () => {
    setIsOpen(true);
    setIsMinimized(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 220);
  };

  const handleMinimize = () => {
    setIsMinimized(true);
    setIsOpen(false);
  };

  const handleClose = () => {
    stopAudioPlayback();
    disconnectLiveVoice();
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    setIsOpen(false);
    setIsMinimized(false);
  };

  const isAnySpeaking = Boolean(playingMessageId) || isLiveSpeaking;

  const statusText = !isOnline
    ? copy.statusOffline
    : isLiveSpeaking
    ? copy.statusSpeaking
    : isLiveActive
    ? copy.statusLiveActive
    : isRecording
    ? copy.statusListening
    : isTranscribing || isThinking
    ? copy.statusThinking
    : playingMessageId
    ? copy.statusSpeaking
    : copy.statusReady;

  const formattedTimer = `${Math.floor(recordingSeconds / 60)}:${String(recordingSeconds % 60).padStart(2, '0')}`;
  const activeLangCap = capabilities?.languageSupport?.[companionLang];

  return (
    <>
      {/* 1. Floating Assistant Button (above MotherBottomNav, bottom-right) */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed right-4 sm:right-6 z-40 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] flex items-center"
          >
            <div className="group relative flex items-center">
              <div
                className="pointer-events-none mr-2.5 px-3 py-1.5 rounded-xl bg-[#30232A] text-[#F3F3E7] text-xs font-medium tracking-tight shadow-md whitespace-nowrap transition-all duration-200 opacity-95 group-hover:opacity-100 group-hover:-translate-x-0.5"
                role="status"
              >
                {copy.tooltip}
                {isMinimized && messages.length > 0 && (
                  <span className="ml-1.5 text-[#D9A2B5] tabular-nums">
                    · {formatNumber(messages.length)}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleOpenPanel}
                aria-label={copy.tooltip}
                className="animate-companion-float relative w-14 h-14 rounded-full bg-[#890149] text-white shadow-lg shadow-[#890149]/30 border border-[#D9A2B5]/40 flex items-center justify-center hover:bg-[#70013b] active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#890149] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F3F3E7]"
              >
                <CompanionEmblem className="w-7 h-7 text-white" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Assistant Conversation Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.section
            role="dialog"
            aria-label={copy.title}
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed z-40 flex flex-col overflow-hidden bg-[#F3F3E7] text-[#30232A] border border-[#D9A2B5] shadow-2xl rounded-2xl
              left-2 right-2 top-[calc(4.25rem+env(safe-area-inset-top,0px))] bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))]
              sm:left-auto sm:top-auto sm:right-6 sm:bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] sm:w-[420px] sm:max-w-[calc(100vw-3rem)] sm:h-[min(640px,calc(100dvh-7.5rem))]"
          >
            {/* 3. Header */}
            <header className="shrink-0 bg-[#890149] text-white px-4 pt-3.5 pb-2.5 border-b border-[#D9A2B5]/30">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-white/15 border border-[#D9A2B5]/40 flex items-center justify-center shrink-0 mt-0.5">
                    <CompanionEmblem className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-serif text-lg leading-tight text-white font-normal">
                      {copy.title}
                    </h2>
                    <p className="font-sans text-[11px] leading-snug text-[#F3F3E7]/90 mt-0.5">
                      {copy.subtitle}
                    </p>
                  </div>
                </div>

                {/* Speaker Toggle, Minimize & Close Controls */}
                <div className="flex items-center gap-0.5 shrink-0 -mr-1 -mt-1">
                  <button
                    type="button"
                    onClick={() => setSpeakerEnabled((v) => !v)}
                    aria-label={speakerEnabled ? copy.speakerOnLabel : copy.speakerOffLabel}
                    title={speakerEnabled ? copy.speakerOnLabel : copy.speakerOffLabel}
                    className={`min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                      speakerEnabled
                        ? 'text-white hover:bg-white/15'
                        : 'text-white/55 hover:text-white hover:bg-white/15'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {speakerEnabled ? 'volume_up' : 'volume_off'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleMinimize}
                    aria-label={copy.minimizeLabel}
                    title={copy.minimizeLabel}
                    className="min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center text-white/85 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">remove</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    aria-label={copy.closeLabel}
                    title={copy.closeLabel}
                    className="min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center text-white/85 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>
              </div>

              {/* Status + Mode Switch + Language Selector Row */}
              <div className="mt-2.5 pt-2 border-t border-white/15 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#F3F3E7]/95 min-w-0">
                    <span className="material-symbols-outlined text-[15px] text-[#D9A2B5] shrink-0">
                      {!isOnline
                        ? 'cloud_off'
                        : isLiveActive || isRecording
                        ? 'mic'
                        : isAnySpeaking
                        ? 'volume_up'
                        : 'verified'}
                    </span>
                    <span className="truncate">{statusText}</span>
                  </div>

                  <span aria-hidden="true" className="text-white/30 text-[11px]">·</span>

                  <button
                    type="button"
                    onClick={() => setActiveView((v) => (v === 'chat' ? 'privacy' : 'chat'))}
                    className="text-[11px] font-semibold text-[#F3F3E7] hover:underline whitespace-nowrap cursor-pointer"
                  >
                    {activeView === 'chat' ? copy.memoryTabLabel : copy.chatTabLabel}
                  </button>
                </div>

                {/* In-conversation Language Selector (Odia / Hindi / English) */}
                <div
                  className="flex items-center gap-0.5 p-0.5 rounded-lg bg-black/20 border border-white/15 shrink-0"
                  role="group"
                  aria-label="Companion language"
                >
                  {(
                    [
                      { code: 'or' as Language, label: 'ଓଡ଼ିଆ' },
                      { code: 'hi' as Language, label: 'हिन्दी' },
                      { code: 'en' as Language, label: 'EN' },
                    ] as const
                  ).map((item) => {
                    const active = companionLang === item.code;
                    return (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => handleChangeLanguage(item.code)}
                        className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                          active
                            ? 'bg-[#F3F3E7] text-[#890149] shadow-xs'
                            : 'text-white/85 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </header>

            {/* Toast / Status Notice */}
            {statusNotice && (
              <div className="shrink-0 bg-[#30232A] text-[#F3F3E7] px-3.5 py-2 text-xs font-medium flex items-center justify-between gap-2">
                <span>{statusNotice}</span>
                <button
                  type="button"
                  onClick={() => setStatusNotice(null)}
                  className="text-[#D9A2B5] hover:text-white cursor-pointer"
                  aria-label={copy.closeLabel}
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            )}

            {/* 4. Body: Either Chat View or Privacy & Saved Memories View */}
            {activeView === 'privacy' ? (
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-[#F3F3E7]">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-base text-[#890149] font-normal">
                    {copy.privacyHeading}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveView('chat')}
                    className="text-xs font-semibold text-[#890149] hover:underline cursor-pointer"
                  >
                    {copy.chatTabLabel}
                  </button>
                </div>

                {/* Permission Controls */}
                <div className="space-y-2.5">
                  <label className="flex items-start justify-between gap-3 p-3 rounded-xl bg-white border border-[#D9A2B5]/60 cursor-pointer">
                    <div className="space-y-0.5">
                      <span className="block text-xs font-semibold text-[#30232A]">
                        {copy.historyToggleTitle}
                      </span>
                      <span className="block text-[11px] text-[#30232A]/70 leading-snug">
                        {copy.historyToggleDesc}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={companionMemorySettings.historyEnabled}
                      onChange={(e) => {
                        const enabled = e.target.checked;
                        updateCompanionMemorySettings({ historyEnabled: enabled });
                        if (!enabled) {
                          try {
                            localStorage.removeItem(sessionKey);
                          } catch {
                            // ignore
                          }
                        }
                      }}
                      className="mt-1 h-4 w-4 accent-[#890149] shrink-0 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-start justify-between gap-3 p-3 rounded-xl bg-white border border-[#D9A2B5]/60 cursor-pointer">
                    <div className="space-y-0.5">
                      <span className="block text-xs font-semibold text-[#30232A]">
                        {copy.profileContextTitle}
                      </span>
                      <span className="block text-[11px] text-[#30232A]/70 leading-snug">
                        {copy.profileContextDesc}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={companionMemorySettings.useProfileContext}
                      onChange={(e) =>
                        updateCompanionMemorySettings({ useProfileContext: e.target.checked })
                      }
                      className="mt-1 h-4 w-4 accent-[#890149] shrink-0 cursor-pointer"
                    />
                  </label>
                </div>

                {/* Clear Active Conversation Button */}
                <button
                  type="button"
                  onClick={handleClearCurrentChat}
                  disabled={messages.length === 0}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white border border-[#D9A2B5]/80 text-xs font-semibold text-[#890149] hover:bg-[#D9A2B5]/15 disabled:opacity-45 cursor-pointer"
                >
                  {copy.clearHistoryLabel}
                </button>

                {/* Saved Consented Timeline Guidance Summaries */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-[#30232A]">
                      {copy.savedSummariesHeading}
                    </h4>
                    {motherMemories.length > 0 && (
                      <button
                        type="button"
                        onClick={() => clearAllCompanionMemories(motherId)}
                        className="text-[11px] font-semibold text-[#ba1a1a] hover:underline cursor-pointer"
                      >
                        {copy.clearAllSavedLabel}
                      </button>
                    )}
                  </div>

                  {motherMemories.length === 0 ? (
                    <p className="text-xs text-[#30232A]/70 bg-white rounded-xl p-3 border border-[#D9A2B5]/50 leading-relaxed">
                      {copy.noSavedSummaries}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {motherMemories.map((mem) => (
                        <div
                          key={mem.id}
                          className="bg-white rounded-xl p-3 border border-[#D9A2B5]/60 space-y-1.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-semibold text-[#30232A] leading-snug">
                              {mem.title}
                            </span>
                            <button
                              type="button"
                              onClick={() => deleteCompanionMemory(mem.id)}
                              className="text-[11px] font-semibold text-[#ba1a1a] hover:underline shrink-0 cursor-pointer"
                            >
                              {copy.deleteLabel}
                            </button>
                          </div>
                          <p className="text-[11px] text-[#30232A]/80 leading-relaxed">
                            {mem.summary}
                          </p>
                          <div className="text-[10px] text-[#30232A]/60 flex items-center gap-1.5">
                            <span>{formatNumber(mem.savedAt)}</span>
                            <span aria-hidden="true">·</span>
                            <span>Week {formatNumber(mem.gestationalWeek)}</span>
                            <span aria-hidden="true">·</span>
                            <span>Personal Note</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Transparent Active Model Info */}
                <div className="pt-2 border-t border-[#D9A2B5]/40 text-[11px] text-[#30232A]/70 space-y-1">
                  <p className="font-semibold text-[#30232A]">{copy.modelInfoLabel}</p>
                  <p>
                    {activeLangCap
                      ? `${activeLangCap.chatModel} · ${activeLangCap.transcribeModel} · ${activeLangCap.ttsModel}${
                          activeLangCap.liveApiSupported ? ` · ${capabilities?.liveModelEvaluated}` : ''
                        }`
                      : 'gemini-4-hydrogen · gemini-3.5-transcribe · gemini-3.8-flash-lite-tts · gemini-3.8-live'}
                  </p>
                  <p>{copy.consentNoAudioNote}</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-3.5 py-3.5 space-y-3 bg-[#F3F3E7]">
                {/* Informed Consent Confirmation Dialog before Saving Summary */}
                {consentPreview && (
                  <div className="bg-white rounded-2xl p-3.5 border border-[#890149]/35 shadow-sm space-y-2.5">
                    <h3 className="text-xs font-semibold text-[#890149]">{copy.consentTitle}</h3>
                    <div className="bg-[#F3F3E7] rounded-xl p-2.5 space-y-1">
                      <p className="text-xs font-semibold text-[#30232A]">{consentPreview.title}</p>
                      <p className="text-[11px] text-[#30232A]/85 leading-relaxed">
                        {consentPreview.summary}
                      </p>
                    </div>
                    <p className="text-[11px] text-[#30232A]/75 leading-snug">
                      {copy.consentNote} {copy.consentNoAudioNote}
                    </p>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setConsentPreview(null)}
                        className="px-3 py-2 rounded-xl border border-[#D9A2B5] text-xs font-medium text-[#30232A] hover:bg-[#F3F3E7] cursor-pointer"
                      >
                        {copy.cancelLabel}
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmSaveToTimeline}
                        disabled={isSavingMemory}
                        className="px-3.5 py-2 rounded-xl bg-[#890149] text-white text-xs font-semibold hover:bg-[#70013b] disabled:opacity-50 cursor-pointer"
                      >
                        {copy.consentConfirmBtn}
                      </button>
                    </div>
                  </div>
                )}

                {messages.length === 0 && !liveInputDraft && !liveOutputDraft ? (
                  <div className="space-y-4">
                    <div className="bg-white rounded-2xl rounded-tl-sm p-3.5 border border-[#D9A2B5]/60 shadow-2xs space-y-1.5">
                      <p className="font-sans text-xs sm:text-[13px] leading-relaxed text-[#30232A]">
                        {copy.welcomePrompt}
                      </p>
                      {companionMemorySettings.useProfileContext && mother && (
                        <p className="font-sans text-[11px] text-[#890149] font-medium">
                          {formatName(mother.name)} · Week {formatNumber(mother.gestationalAgeWeeks)} ·{' '}
                          {copy.liveVoiceLabel}:{' '}
                          {activeLangCap?.liveApiSupported !== false ? 'Ready' : 'Voice Pipeline'}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className="font-sans text-[11px] font-semibold text-[#30232A]/70 px-1">
                        {copy.suggestedTitle}
                      </p>
                      <div className="flex flex-col gap-2">
                        {copy.suggestedQuestions.map((question, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSendText(question, false)}
                            disabled={isThinking || isRecording || isTranscribing}
                            className="w-full min-h-[44px] text-left px-3.5 py-2.5 rounded-xl bg-white border border-[#D9A2B5]/70 text-[#30232A] font-sans text-xs sm:text-[13px] font-medium hover:border-[#890149] hover:bg-[#D9A2B5]/15 active:scale-[0.99] transition-all flex items-center justify-between gap-2 cursor-pointer disabled:opacity-60"
                          >
                            <span className="leading-snug">{question}</span>
                            <span className="material-symbols-outlined text-[18px] text-[#890149] shrink-0">
                              arrow_forward
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((msg) => {
                      const isMother = msg.role === 'user';
                      const isPlaying = playingMessageId === msg.id;
                      const isLoadingAudio = loadingAudioMessageId === msg.id;
                      const isEmergency = !isMother && !msg.isError && msg.urgencyLevel === 'emergency';
                      const alertSent = Boolean(sentAlertMessageIds[msg.id]);

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMother ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
                              isMother
                                ? 'bg-[#890149] text-white rounded-br-sm shadow-xs'
                                : msg.isError
                                ? 'bg-[#ffdad6] text-[#93000a] border border-[#ba1a1a]/30 rounded-bl-sm'
                                : 'bg-white text-[#30232A] border border-[#D9A2B5]/65 rounded-bl-sm shadow-2xs'
                            }`}
                          >
                            {msg.text}

                            {/* Retry button directly inside failed assistant error message */}
                            {msg.isError && msg.retryPayload && (
                              <div className="mt-2 pt-2 border-t border-[#ba1a1a]/20 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => handleRetryErrorBubble(msg)}
                                  disabled={isThinking}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#93000a] text-white text-[11px] font-semibold hover:opacity-90 cursor-pointer disabled:opacity-50"
                                >
                                  <span className="material-symbols-outlined text-[14px]">refresh</span>
                                  <span>{copy.retryLabel}</span>
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Emergency Safety Escalation Card (User-Confirmed Actions Only) */}
                          {isEmergency && (
                            <div className="mt-2 max-w-[92%] w-full rounded-xl bg-[#ffdad6]/65 border border-[#ba1a1a]/45 p-3 space-y-2">
                              <div className="flex items-start gap-2 text-[#93000a]">
                                <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">
                                  emergency
                                </span>
                                <div className="space-y-0.5">
                                  <p className="text-xs font-bold leading-snug">
                                    {copy.emergencyHeading}
                                  </p>
                                  <p className="text-[11px] leading-snug text-[#680005]">
                                    {copy.emergencyDisclaimer}
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                <a
                                  href="tel:102"
                                  className="min-h-[40px] px-3 py-1.5 rounded-lg bg-[#ba1a1a] text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:opacity-95"
                                >
                                  <span className="material-symbols-outlined text-[16px]">call</span>
                                  <span>{copy.call102Label}</span>
                                </a>

                                {!alertSent && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenWorkerAlertConfirm(msg)}
                                    className="min-h-[40px] px-3 py-1.5 rounded-lg bg-white border border-[#ba1a1a]/50 text-[#93000a] text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-white/90 cursor-pointer"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">
                                      support_agent
                                    </span>
                                    <span>
                                      {copy.alertWorkerLabel} ({formatName(mother?.assignedWorkerName || 'Sunita Devi')})
                                    </span>
                                  </button>
                                )}
                              </div>

                              {alertSent && (
                                <p className="text-[11px] font-semibold text-[#1b5e20]">
                                  {copy.alertSentText}
                                </p>
                              )}

                              {/* Explicit User Confirmation Step before notifying Health Worker */}
                              {pendingWorkerAlert?.messageId === msg.id && (
                                <div className="mt-2 p-2.5 rounded-lg bg-white border border-[#ba1a1a]/35 space-y-2">
                                  <p className="text-xs font-semibold text-[#30232A]">
                                    {copy.confirmAlertTitle}
                                  </p>
                                  <p className="text-[11px] text-[#30232A]/75 leading-snug">
                                    {copy.confirmAlertBody}
                                  </p>
                                  <textarea
                                    rows={2}
                                    value={pendingWorkerAlert.draftText}
                                    onChange={(e) =>
                                      setPendingWorkerAlert((prev) =>
                                        prev ? { ...prev, draftText: e.target.value } : null
                                      )
                                    }
                                    className="w-full rounded-lg border border-[#D9A2B5] p-2 text-xs text-[#30232A] bg-[#F3F3E7]/50 focus:outline-none focus:border-[#890149]"
                                  />
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setPendingWorkerAlert(null)}
                                      className="px-2.5 py-1.5 rounded-lg border border-[#D9A2B5] text-[11px] font-medium text-[#30232A] cursor-pointer"
                                    >
                                      {copy.cancelLabel}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleConfirmSendWorkerAlert}
                                      disabled={isSendingWorkerAlert || !pendingWorkerAlert.draftText.trim()}
                                      className="px-3 py-1.5 rounded-lg bg-[#890149] text-white text-[11px] font-semibold hover:bg-[#70013b] disabled:opacity-50 cursor-pointer"
                                    >
                                      {copy.confirmSendBtn}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Unboxed Metadata & Speaker Playback Control */}
                          <div className="mt-1 px-1 flex items-center gap-2 text-[10px] text-[#30232A]/65">
                            <span className="tabular-nums">{formatNumber(msg.timestamp)}</span>
                            {msg.viaVoice && isMother && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>{msg.mode === 'live' ? copy.liveTag : copy.voiceTag}</span>
                              </>
                            )}
                            {!isMother && !msg.isError && (
                              <>
                                <span aria-hidden="true">·</span>
                                <button
                                  type="button"
                                  onClick={() => handleTogglePlayback(msg)}
                                  aria-label={isPlaying ? copy.stopLabel : copy.listenLabel}
                                  className="inline-flex items-center gap-1 py-1 px-1.5 -my-1 rounded-md text-[#890149] font-semibold hover:bg-[#D9A2B5]/25 transition-colors cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[14px]">
                                    {isLoadingAudio
                                      ? 'hourglass_top'
                                      : isPlaying
                                      ? 'stop_circle'
                                      : 'volume_up'}
                                  </span>
                                  <span>
                                    {isLoadingAudio
                                      ? copy.loadingAudioLabel
                                      : isPlaying
                                      ? copy.stopLabel
                                      : copy.listenLabel}
                                  </span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Live streaming transcripts while Gemini Live turn is in progress */}
                    {liveInputDraft && (
                      <div className="flex flex-col items-end">
                        <div className="max-w-[86%] rounded-2xl rounded-br-sm px-3.5 py-2 text-[13px] bg-[#890149]/80 text-white">
                          {liveInputDraft}
                        </div>
                      </div>
                    )}
                    {liveOutputDraft && (
                      <div className="flex flex-col items-start">
                        <div className="max-w-[86%] rounded-2xl rounded-bl-sm px-3.5 py-2 text-[13px] bg-white border border-[#D9A2B5] text-[#30232A]">
                          {liveOutputDraft}
                        </div>
                      </div>
                    )}

                    {/* Typing Indicator */}
                    {isThinking && (
                      <div className="flex flex-col items-start">
                        <div className="bg-white border border-[#D9A2B5]/65 rounded-2xl rounded-bl-sm px-4 py-3 shadow-2xs flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#890149] animate-bounce [animation-delay:0ms]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-[#890149] animate-bounce [animation-delay:150ms]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-[#890149] animate-bounce [animation-delay:300ms]" />
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}

            {/* 5. Footer: Voice/Speaking Indicators + Error/Retry + Actions + Composer */}
            {activeView === 'chat' && (
              <footer className="shrink-0 bg-white border-t border-[#D9A2B5]/50 px-3 pt-2.5 pb-3 space-y-2">
                {/* Active Speaking Banner with One-Tap Interruption */}
                {isAnySpeaking && (
                  <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#890149]/10 border border-[#890149]/30 text-xs text-[#890149] font-medium">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="material-symbols-outlined text-[18px] shrink-0">
                        volume_up
                      </span>
                      <span className="truncate">{copy.speakingBanner}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleInterruptAndSpeak}
                      className="px-2.5 py-1 rounded-lg bg-[#890149] text-white text-[11px] font-semibold hover:bg-[#70013b] whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {copy.interruptSpeakLabel}
                    </button>
                  </div>
                )}

                {/* Live Gemini Voice Active Banner */}
                {isLiveActive && !isAnySpeaking && (
                  <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#890149]/8 border border-[#890149]/25 text-xs text-[#890149] font-medium">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="material-symbols-outlined text-[18px] shrink-0">
                        graphic_eq
                      </span>
                      <span className="truncate">{copy.liveBanner}</span>
                    </div>
                    <button
                      type="button"
                      onClick={disconnectLiveVoice}
                      className="px-2.5 py-1 rounded-lg border border-[#890149]/40 text-[#890149] text-[11px] font-semibold hover:bg-white whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {copy.endLiveLabel}
                    </button>
                  </div>
                )}

                {/* Voice Recording / Transcribing Indicator */}
                {(isRecording || isTranscribing) && (
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#890149]/8 border border-[#890149]/25 text-xs text-[#890149] font-medium">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="material-symbols-outlined text-[18px] shrink-0">
                        {isRecording ? 'graphic_eq' : 'hourglass_top'}
                      </span>
                      <span className="truncate">
                        {isRecording ? copy.recordingBanner : copy.transcribingBanner}
                      </span>
                    </div>
                    {isRecording && (
                      <span className="font-mono text-[11px] font-semibold tabular-nums shrink-0 ml-2">
                        {formatNumber(formattedTimer)}
                      </span>
                    )}
                  </div>
                )}

                {/* Voice / Network Notice with Retry button */}
                {voiceError && (
                  <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-[#ffdad6] text-[#93000a] text-[11px] font-medium">
                    <span className="leading-snug">{voiceError.message}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {voiceError.retryAction && (
                        <button
                          type="button"
                          onClick={voiceError.retryAction}
                          className="px-2 py-0.5 rounded bg-[#93000a] text-white font-semibold hover:opacity-90 cursor-pointer"
                        >
                          {copy.retryLabel}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setVoiceError(null)}
                        aria-label={copy.closeLabel}
                        className="p-0.5 hover:opacity-75 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">close</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Utility Row: Consented Timeline Save + Clear Chat + Safety Note */}
                <div className="flex items-center justify-between gap-2 text-[11px] text-[#30232A]/65 px-0.5">
                  {messages.filter((m) => !m.isError).length >= 2 &&
                  companionMemorySettings.allowTimelineSavePrompt ? (
                    <button
                      type="button"
                      onClick={handleRequestTimelineSave}
                      disabled={isSummarizing}
                      className="text-[#890149] font-semibold hover:underline truncate cursor-pointer disabled:opacity-50"
                    >
                      {isSummarizing ? copy.statusThinking : copy.saveToTimelineLabel}
                    </button>
                  ) : (
                    <span className="truncate pr-2">{copy.safetyNote}</span>
                  )}

                  <div className="flex items-center gap-2 shrink-0">
                    {activeLangCap?.liveApiSupported !== false && (
                      <button
                        type="button"
                        onClick={handleToggleLiveVoice}
                        className={`font-semibold whitespace-nowrap cursor-pointer ${
                          isLiveActive ? 'text-[#ba1a1a]' : 'text-[#890149] hover:underline'
                        }`}
                      >
                        {isLiveActive ? copy.endLiveLabel : copy.liveVoiceLabel}
                      </button>
                    )}
                    {messages.length > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <button
                          type="button"
                          onClick={handleClearCurrentChat}
                          className="text-[#890149] font-semibold hover:underline whitespace-nowrap cursor-pointer"
                        >
                          {copy.newChatLabel}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Input Bar: Microphone + Text Input + Send */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendText(inputText, false);
                  }}
                  className="flex items-center gap-2"
                >
                  <button
                    type="button"
                    onClick={handleToggleRecording}
                    disabled={isThinking || isTranscribing}
                    aria-label={copy.micLabel}
                    title={copy.micLabel}
                    className={`min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center border transition-all shrink-0 cursor-pointer disabled:opacity-50 ${
                      isRecording || isLiveActive
                        ? 'bg-[#890149] text-white border-[#890149] shadow-sm'
                        : 'bg-[#F3F3E7] text-[#890149] border-[#D9A2B5] hover:bg-[#D9A2B5]/25'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[21px]">
                      {isRecording || isLiveActive ? 'stop' : 'mic'}
                    </span>
                  </button>

                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    disabled={isRecording || isTranscribing}
                    placeholder={copy.inputPlaceholder}
                    className="flex-1 min-w-0 h-11 px-3.5 rounded-xl bg-[#F3F3E7] border border-[#D9A2B5]/80 font-sans text-xs sm:text-[13px] text-[#30232A] placeholder:text-[#30232A]/50 focus:outline-none focus:border-[#890149] disabled:opacity-60"
                  />

                  <button
                    type="submit"
                    disabled={!inputText.trim() || isThinking || isRecording || isTranscribing}
                    aria-label={copy.sendLabel}
                    title={copy.sendLabel}
                    className="min-w-[44px] min-h-[44px] rounded-xl bg-[#890149] text-white flex items-center justify-center hover:bg-[#70013b] active:scale-95 transition-all shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[20px]">send</span>
                  </button>
                </form>
              </footer>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
};
