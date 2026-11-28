export interface Language {
  code: string;
  name: string;
  nativeName: string;
  dir?: 'ltr' | 'rtl';
  region: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  // Indian & South Asian Languages
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr', region: 'Global', flag: '🌐' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr', region: 'India', flag: '🇮🇳' },
  { code: 'od', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', dir: 'ltr', region: 'India (Odisha)', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', dir: 'ltr', region: 'India / Bangladesh', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', dir: 'ltr', region: 'India', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', dir: 'ltr', region: 'India / Sri Lanka', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', dir: 'ltr', region: 'India', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', dir: 'ltr', region: 'India', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', dir: 'ltr', region: 'India', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', dir: 'ltr', region: 'India', flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', dir: 'ltr', region: 'India', flag: '🇮🇳' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', dir: 'rtl', region: 'South Asia', flag: '🇵🇰' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', dir: 'ltr', region: 'India', flag: '🇮🇳' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', dir: 'ltr', region: 'Nepal / India', flag: '🇳🇵' },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्', dir: 'ltr', region: 'India', flag: '🇮🇳' },
  { code: 'si', name: 'Sinhala', nativeName: 'සිංහල', dir: 'ltr', region: 'Sri Lanka', flag: '🇱🇰' },

  // Middle East & West Asia
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl', region: 'Middle East & North Africa', flag: '🇸🇦' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', dir: 'rtl', region: 'Israel', flag: '🇮🇱' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', dir: 'rtl', region: 'Iran', flag: '🇮🇷' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', dir: 'ltr', region: 'Turkey', flag: '🇹🇷' },

  // Europe - Western & Southern
  { code: 'fr', name: 'French', nativeName: 'Français', dir: 'ltr', region: 'France & Francophonie', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', dir: 'ltr', region: 'Germany / Austria / Switzerland', flag: '🇩🇪' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', dir: 'ltr', region: 'Spain & Latin America', flag: '🇪🇸' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', dir: 'ltr', region: 'Portugal / Brazil', flag: '🇵🇹' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', dir: 'ltr', region: 'Italy', flag: '🇮🇹' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', dir: 'ltr', region: 'Netherlands / Belgium', flag: '🇳🇱' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', dir: 'ltr', region: 'Greece', flag: '🇬🇷' },

  // Europe - Eastern & Northern
  { code: 'ru', name: 'Russian', nativeName: 'Русский', dir: 'ltr', region: 'Eastern Europe / Central Asia', flag: '🇷🇺' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', dir: 'ltr', region: 'Ukraine', flag: '🇺🇦' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', dir: 'ltr', region: 'Poland', flag: '🇵🇱' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', dir: 'ltr', region: 'Czech Republic', flag: '🇨🇿' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', dir: 'ltr', region: 'Slovakia', flag: '🇸🇰' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', dir: 'ltr', region: 'Hungary', flag: '🇭🇺' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', dir: 'ltr', region: 'Romania', flag: '🇷🇴' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български', dir: 'ltr', region: 'Bulgaria', flag: '🇧🇬' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски', dir: 'ltr', region: 'Balkans', flag: '🇷🇸' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', dir: 'ltr', region: 'Croatia', flag: '🇭🇷' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', dir: 'ltr', region: 'Slovenia', flag: '🇸🇮' },
  { code: 'bs', name: 'Bosnian', nativeName: 'Bosanski', dir: 'ltr', region: 'Bosnia', flag: '🇧🇦' },
  { code: 'sq', name: 'Albanian', nativeName: 'Shqip', dir: 'ltr', region: 'Albania', flag: '🇦🇱' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', dir: 'ltr', region: 'Sweden', flag: '🇸🇪' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', dir: 'ltr', region: 'Norway', flag: '🇳🇴' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', dir: 'ltr', region: 'Denmark', flag: '🇩🇰' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', dir: 'ltr', region: 'Finland', flag: '🇫🇮' },
  { code: 'is', name: 'Icelandic', nativeName: 'Íslenska', dir: 'ltr', region: 'Iceland', flag: '🇮🇸' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti', dir: 'ltr', region: 'Estonia', flag: '🇪🇪' },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu', dir: 'ltr', region: 'Latvia', flag: '🇱🇻' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', dir: 'ltr', region: 'Lithuania', flag: '🇱🇹' },
  { code: 'ga', name: 'Irish', nativeName: 'Gaeilge', dir: 'ltr', region: 'Ireland', flag: '🇮🇪' },
  { code: 'cy', name: 'Welsh', nativeName: 'Cymraeg', dir: 'ltr', region: 'Wales', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },

  // East & Southeast Asia
  { code: 'zh-CN', name: 'Chinese Simplified', nativeName: '简体中文', dir: 'ltr', region: 'China / Singapore', flag: '🇨🇳' },
  { code: 'zh-TW', name: 'Chinese Traditional', nativeName: '繁體中文', dir: 'ltr', region: 'Taiwan / Hong Kong', flag: '🇹🇼' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', dir: 'ltr', region: 'Japan', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', dir: 'ltr', region: 'Korea', flag: '🇰🇷' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', dir: 'ltr', region: 'Vietnam', flag: '🇻🇳' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', dir: 'ltr', region: 'Thailand', flag: '🇹🇭' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', dir: 'ltr', region: 'Indonesia', flag: '🇮🇩' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', dir: 'ltr', region: 'Malaysia', flag: '🇲🇾' },
  { code: 'fil', name: 'Filipino', nativeName: 'Filipino', dir: 'ltr', region: 'Philippines', flag: '🇵🇭' },
  { code: 'my', name: 'Burmese', nativeName: 'မြန်မာစာ', dir: 'ltr', region: 'Myanmar', flag: '🇲🇲' },
  { code: 'km', name: 'Khmer', nativeName: 'ភាសាខ្មែរ', dir: 'ltr', region: 'Cambodia', flag: '🇰🇭' },
  { code: 'lo', name: 'Lao', nativeName: 'ພາສາລາວ', dir: 'ltr', region: 'Laos', flag: '🇱🇦' },
  { code: 'mn', name: 'Mongolian', nativeName: 'Монгол', dir: 'ltr', region: 'Mongolia', flag: '🇲🇳' },

  // Africa
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', dir: 'ltr', region: 'East Africa', flag: '🇰🇪' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', dir: 'ltr', region: 'Ethiopia', flag: '🇪🇹' },
  { code: 'so', name: 'Somali', nativeName: 'Soomaali', dir: 'ltr', region: 'Somalia / Horn of Africa', flag: '🇸🇴' },
  { code: 'zu', name: 'Zulu', nativeName: 'isiZulu', dir: 'ltr', region: 'South Africa', flag: '🇿🇦' },
  { code: 'xh', name: 'Xhosa', nativeName: 'isiXhosa', dir: 'ltr', region: 'South Africa', flag: '🇿🇦' },
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans', dir: 'ltr', region: 'South Africa / Namibia', flag: '🇿🇦' },
];
