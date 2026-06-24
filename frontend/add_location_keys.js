// add_location_keys.js
// Usage: node add_location_keys.js src/i18n/locales

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = process.argv[2] || __dirname;

const LOCATION_NS = {
  en: {
    detecting: "Detecting location…",
    showingNearby: "showing nearby doctors",
    notSet: "Location not set — enable to sort by distance",
    enterAreaPlaceholder: "Enter area, city (e.g. Andheri, Mumbai)",
    lookingUp: "Looking up…",
    setLocation: "Set location",
    autoDetect: "Auto-detect",
    enterArea: "Enter area",
    areaNotFound: "Area not found. Try a different name.",
    geocodeFailed: "Could not look up location. Check your connection."
  },
  hi: {
    detecting: "स्थान खोजा जा रहा है…",
    showingNearby: "आस-पास के डॉक्टर दिखा रहे हैं",
    notSet: "स्थान सेट नहीं — दूरी क्रम के लिए सक्षम करें",
    enterAreaPlaceholder: "क्षेत्र, शहर दर्ज करें (जैसे: अंधेरी, मुंबई)",
    lookingUp: "खोजा जा रहा है…",
    setLocation: "स्थान सेट करें",
    autoDetect: "ऑटो-डिटेक्ट",
    enterArea: "क्षेत्र दर्ज करें",
    areaNotFound: "क्षेत्र नहीं मिला। कोई और नाम आज़माएं।",
    geocodeFailed: "स्थान खोजा नहीं जा सका। अपना कनेक्शन जांचें।"
  },
  mr: {
    detecting: "स्थान शोधले जात आहे…",
    showingNearby: "जवळचे डॉक्टर दाखवत आहे",
    notSet: "स्थान सेट केलेले नाही — अंतर क्रमवारीसाठी सक्षम करा",
    enterAreaPlaceholder: "क्षेत्र, शहर टाका (उदा: अंधेरी, मुंबई)",
    lookingUp: "शोधले जात आहे…",
    setLocation: "स्थान सेट करा",
    autoDetect: "ऑटो-डिटेक्ट",
    enterArea: "क्षेत्र टाका",
    areaNotFound: "क्षेत्र सापडले नाही. वेगळे नाव वापरून पहा.",
    geocodeFailed: "स्थान शोधता आले नाही. तुमचे कनेक्शन तपासा."
  },
  ta: {
    detecting: "இருப்பிடம் கண்டறியப்படுகிறது…",
    showingNearby: "அருகிலுள்ள மருத்துவர்களைக் காட்டுகிறது",
    notSet: "இருப்பிடம் அமைக்கப்படவில்லை — தூர வரிசைப்படுத்தலுக்கு இயக்கவும்",
    enterAreaPlaceholder: "பகுதி, நகரத்தை உள்ளிடவும் (எ.கா: அந்தேரி, மும்பை)",
    lookingUp: "தேடுகிறது…",
    setLocation: "இருப்பிடத்தை அமைக்கவும்",
    autoDetect: "தானியங்கி கண்டறிதல்",
    enterArea: "பகுதியை உள்ளிடவும்",
    areaNotFound: "பகுதி கிடைக்கவில்லை. வேறு பெயரை முயற்சிக்கவும்.",
    geocodeFailed: "இருப்பிடத்தைத் தேட முடியவில்லை. உங்கள் இணைப்பைச் சரிபார்க்கவும்."
  },
  te: {
    detecting: "స్థానం గుర్తించబడుతోంది…",
    showingNearby: "సమీప డాక్టర్లను చూపిస్తోంది",
    notSet: "స్థానం సెట్ చేయబడలేదు — దూర క్రమం కోసం ప్రారంభించండి",
    enterAreaPlaceholder: "ప్రాంతం, నగరం నమోదు చేయండి (ఉదా: అంధేరి, ముంబై)",
    lookingUp: "శోధిస్తోంది…",
    setLocation: "స్థానాన్ని సెట్ చేయండి",
    autoDetect: "ఆటో-డిటెక్ట్",
    enterArea: "ప్రాంతాన్ని నమోదు చేయండి",
    areaNotFound: "ప్రాంతం కనుగొనబడలేదు. వేరే పేరును ప్రయత్నించండి.",
    geocodeFailed: "స్థానాన్ని వెతకలేకపోయింది. మీ కనెక్షన్‌ని తనిఖీ చేయండి."
  },
  kn: {
    detecting: "ಸ್ಥಳವನ್ನು ಪತ್ತೆ ಮಾಡಲಾಗುತ್ತಿದೆ…",
    showingNearby: "ಹತ್ತಿರದ ವೈದ್ಯರನ್ನು ತೋರಿಸುತ್ತಿದೆ",
    notSet: "ಸ್ಥಳ ಹೊಂದಿಸಿಲ್ಲ — ದೂರ ವಿಂಗಡಣೆಗಾಗಿ ಸಕ್ರಿಯಗೊಳಿಸಿ",
    enterAreaPlaceholder: "ಪ್ರದೇಶ, ನಗರವನ್ನು ನಮೂದಿಸಿ (ಉದಾ: ಅಂಧೇರಿ, ಮುಂಬೈ)",
    lookingUp: "ಹುಡುಕಲಾಗುತ್ತಿದೆ…",
    setLocation: "ಸ್ಥಳವನ್ನು ಹೊಂದಿಸಿ",
    autoDetect: "ಸ್ವಯಂ-ಪತ್ತೆ",
    enterArea: "ಪ್ರದೇಶವನ್ನು ನಮೂದಿಸಿ",
    areaNotFound: "ಪ್ರದೇಶ ಕಂಡುಬಂದಿಲ್ಲ. ಬೇರೆ ಹೆಸರನ್ನು ಪ್ರಯತ್ನಿಸಿ.",
    geocodeFailed: "ಸ್ಥಳವನ್ನು ಹುಡುಕಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ನಿಮ್ಮ ಸಂಪರ್ಕವನ್ನು ಪರಿಶೀಲಿಸಿ."
  },
  bn: {
    detecting: "অবস্থান সনাক্ত করা হচ্ছে…",
    showingNearby: "কাছাকাছি ডাক্তার দেখাচ্ছে",
    notSet: "অবস্থান সেট করা নেই — দূরত্ব সাজানোর জন্য সক্ষম করুন",
    enterAreaPlaceholder: "এলাকা, শহর লিখুন (যেমন: আন্ধেরি, মুম্বাই)",
    lookingUp: "খোঁজা হচ্ছে…",
    setLocation: "অবস্থান সেট করুন",
    autoDetect: "অটো-ডিটেক্ট",
    enterArea: "এলাকা লিখুন",
    areaNotFound: "এলাকা পাওয়া যায়নি। অন্য নাম চেষ্টা করুন।",
    geocodeFailed: "অবস্থান খুঁজে পাওয়া যায়নি। আপনার সংযোগ পরীক্ষা করুন।"
  },
  ml: {
    detecting: "ലൊക്കേഷൻ കണ്ടെത്തുന്നു…",
    showingNearby: "സമീപത്തെ ഡോക്ടർമാരെ കാണിക്കുന്നു",
    notSet: "ലൊക്കേഷൻ സജ്ജമാക്കിയിട്ടില്ല — ദൂര ക്രമീകരണത്തിന് പ്രവർത്തനക്ഷമമാക്കുക",
    enterAreaPlaceholder: "പ്രദേശം, നഗരം നൽകുക (ഉദാ: അന്ധേരി, മുംബൈ)",
    lookingUp: "തിരയുന്നു…",
    setLocation: "ലൊക്കേഷൻ സജ്ജമാക്കുക",
    autoDetect: "ഓട്ടോ-ഡിറ്റക്ട്",
    enterArea: "പ്രദേശം നൽകുക",
    areaNotFound: "പ്രദേശം കണ്ടെത്തിയില്ല. മറ്റൊരു പേര് ശ്രമിക്കുക.",
    geocodeFailed: "ലൊക്കേഷൻ കണ്ടെത്താനായില്ല. നിങ്ങളുടെ കണക്ഷൻ പരിശോധിക്കുക."
  },
  gu: {
    detecting: "સ્થાન શોધાઈ રહ્યું છે…",
    showingNearby: "નજીકના ડૉક્ટરો બતાવી રહ્યા છીએ",
    notSet: "સ્થાન સેટ નથી — અંતર ક્રમ માટે સક્ષમ કરો",
    enterAreaPlaceholder: "વિસ્તાર, શહેર દાખલ કરો (દા.ત: અંધેરી, મુંબઈ)",
    lookingUp: "શોધાઈ રહ્યું છે…",
    setLocation: "સ્થાન સેટ કરો",
    autoDetect: "ઓટો-ડિટેક્ટ",
    enterArea: "વિસ્તાર દાખલ કરો",
    areaNotFound: "વિસ્તાર મળ્યો નથી. અલગ નામ અજમાવો.",
    geocodeFailed: "સ્થાન શોધી શકાયું નહીં. તમારું કનેક્શન તપાસો."
  },
  pa: {
    detecting: "ਸਥਾਨ ਦਾ ਪਤਾ ਲਗਾਇਆ ਜਾ ਰਿਹਾ ਹੈ…",
    showingNearby: "ਨੇੜਲੇ ਡਾਕਟਰ ਦਿਖਾ ਰਹੇ ਹਾਂ",
    notSet: "ਸਥਾਨ ਸੈੱਟ ਨਹੀਂ ਹੈ — ਦੂਰੀ ਕ੍ਰਮ ਲਈ ਸਮਰੱਥ ਕਰੋ",
    enterAreaPlaceholder: "ਖੇਤਰ, ਸ਼ਹਿਰ ਦਰਜ ਕਰੋ (ਜਿਵੇਂ: ਅੰਧੇਰੀ, ਮੁੰਬਈ)",
    lookingUp: "ਖੋਜਿਆ ਜਾ ਰਿਹਾ ਹੈ…",
    setLocation: "ਸਥਾਨ ਸੈੱਟ ਕਰੋ",
    autoDetect: "ਆਟੋ-ਡਿਟੈਕਟ",
    enterArea: "ਖੇਤਰ ਦਰਜ ਕਰੋ",
    areaNotFound: "ਖੇਤਰ ਨਹੀਂ ਮਿਲਿਆ। ਵੱਖਰਾ ਨਾਮ ਅਜ਼ਮਾਓ।",
    geocodeFailed: "ਸਥਾਨ ਨਹੀਂ ਲੱਭਿਆ ਜਾ ਸਕਿਆ। ਆਪਣਾ ਕਨੈਕਸ਼ਨ ਜਾਂਚੋ।"
  }
};

const files = fs.readdirSync(LOCALES_DIR).filter(f => f.endsWith('.json'));

for (const file of files) {
  const lang = file.replace('.json', '');
  if (!LOCATION_NS[lang]) {
    console.log(`⚠️  Skipped ${file} — no translation prepared for "${lang}"`);
    continue;
  }
  const filePath = path.join(LOCALES_DIR, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  if (data.location) {
    console.log(`⏭  ${file}: "location" namespace already exists — skipped`);
    continue;
  }

  data.location = LOCATION_NS[lang];
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`✅ ${file}: added "location" namespace`);
}

console.log('\nDone. Run check_i18n_keys.js again to confirm all 10 files still match.');