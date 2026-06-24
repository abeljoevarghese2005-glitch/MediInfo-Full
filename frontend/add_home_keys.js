// add_home_keys.js
// Usage: node add_home_keys.js src/i18n/locales

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = process.argv[2] || __dirname;

const HOME_NS = {
  en: {
    goodMorning: "Good morning,", goodAfternoon: "Good afternoon,", goodEvening: "Good evening,",
    greeting: "Hi {{name}}, how can we help today?",
    searchPlaceholder: "Search medicines or conditions",
    viewAppointments: "View Appointments →",
    nearbyDoctors: "Nearby Doctors",
    sortingByDistance: "Sorting by distance…",
    sortedByDistance: "Sorted by distance from your location",
    enableLocation: "Enable location for distance sorting",
    seeAll: "See all →",
    noDoctorsFound: "No doctors found",
    previouslyVisited: "Previously Visited",
    quickRebook: "Quick rebook in one tap",
    noPreviousDoctors: "Doctors you visit will show up here for quick rebooking.",
    rebook: "Rebook",
    bookNow: "Book Now",
    yrsExp: "{{years}} yrs",
    consultationFee: "Consultation Fee",
    issuePlaceholder: "e.g. Persistent cough for 5 days...",
    bookFee: "Book — ₹{{fee}}"
  },
  hi: {
    goodMorning: "सुप्रभात,", goodAfternoon: "नमस्कार,", goodEvening: "शुभ संध्या,",
    greeting: "नमस्ते {{name}}, आज हम आपकी कैसे मदद कर सकते हैं?",
    searchPlaceholder: "दवाएं या बीमारियां खोजें",
    viewAppointments: "अपॉइंटमेंट देखें →",
    nearbyDoctors: "आस-पास के डॉक्टर",
    sortingByDistance: "दूरी के अनुसार क्रमबद्ध हो रहा है…",
    sortedByDistance: "आपके स्थान से दूरी के अनुसार क्रमबद्ध",
    enableLocation: "दूरी क्रम के लिए स्थान सक्षम करें",
    seeAll: "सभी देखें →",
    noDoctorsFound: "कोई डॉक्टर नहीं मिला",
    previouslyVisited: "पहले देखे गए",
    quickRebook: "एक टैप में फिर से बुक करें",
    noPreviousDoctors: "आपके द्वारा देखे गए डॉक्टर यहां त्वरित पुनः बुकिंग के लिए दिखाई देंगे।",
    rebook: "फिर से बुक करें",
    bookNow: "अभी बुक करें",
    yrsExp: "{{years}} वर्ष",
    consultationFee: "परामर्श शुल्क",
    issuePlaceholder: "जैसे: 5 दिनों से लगातार खांसी...",
    bookFee: "बुक करें — ₹{{fee}}"
  },
  mr: {
    goodMorning: "सुप्रभात,", goodAfternoon: "नमस्कार,", goodEvening: "शुभ संध्याकाळ,",
    greeting: "नमस्कार {{name}}, आज आम्ही तुम्हाला कशी मदत करू शकतो?",
    searchPlaceholder: "औषधे किंवा आजार शोधा",
    viewAppointments: "अपॉइंटमेंट पहा →",
    nearbyDoctors: "जवळचे डॉक्टर",
    sortingByDistance: "अंतरानुसार क्रमवारी लावत आहे…",
    sortedByDistance: "तुमच्या स्थानापासूनच्या अंतरानुसार क्रमवारी",
    enableLocation: "अंतर क्रमवारीसाठी स्थान सक्षम करा",
    seeAll: "सर्व पहा →",
    noDoctorsFound: "कोणतेही डॉक्टर सापडले नाहीत",
    previouslyVisited: "आधी भेट दिलेले",
    quickRebook: "एका टॅपमध्ये पुन्हा बुक करा",
    noPreviousDoctors: "तुम्ही भेट दिलेले डॉक्टर येथे जलद पुनर्बुकिंगसाठी दिसतील.",
    rebook: "पुन्हा बुक करा",
    bookNow: "आता बुक करा",
    yrsExp: "{{years}} वर्षे",
    consultationFee: "सल्ला शुल्क",
    issuePlaceholder: "उदा. 5 दिवसांपासून सतत खोकला...",
    bookFee: "बुक करा — ₹{{fee}}"
  },
  ta: {
    goodMorning: "காலை வணக்கம்,", goodAfternoon: "மதிய வணக்கம்,", goodEvening: "மாலை வணக்கம்,",
    greeting: "வணக்கம் {{name}}, இன்று உங்களுக்கு எப்படி உதவலாம்?",
    searchPlaceholder: "மருந்துகள் அல்லது நோய்களைத் தேடுங்கள்",
    viewAppointments: "அப்பாயிண்ட்மென்ட்களைப் பார்க்க →",
    nearbyDoctors: "அருகிலுள்ள மருத்துவர்கள்",
    sortingByDistance: "தூரத்தின் அடிப்படையில் வரிசைப்படுத்தப்படுகிறது…",
    sortedByDistance: "உங்கள் இருப்பிடத்திலிருந்து தூரத்தின் அடிப்படையில் வரிசைப்படுத்தப்பட்டது",
    enableLocation: "தூர வரிசைப்படுத்தலுக்கு இருப்பிடத்தை இயக்கவும்",
    seeAll: "அனைத்தையும் காண →",
    noDoctorsFound: "மருத்துவர்கள் எவரும் கிடைக்கவில்லை",
    previouslyVisited: "முன்பு சென்றவை",
    quickRebook: "ஒரே தட்டலில் விரைவாக மீண்டும் பதிவு செய்யவும்",
    noPreviousDoctors: "நீங்கள் சந்தித்த மருத்துவர்கள் விரைவான மறு பதிவுக்காக இங்கே தோன்றுவார்கள்.",
    rebook: "மீண்டும் பதிவு செய்",
    bookNow: "இப்போது பதிவு செய்",
    yrsExp: "{{years}} ஆண்டுகள்",
    consultationFee: "ஆலோசனை கட்டணம்",
    issuePlaceholder: "எ.கா. 5 நாட்களாக தொடர்ந்து இருமல்...",
    bookFee: "பதிவு செய் — ₹{{fee}}"
  },
  te: {
    goodMorning: "శుభోదయం,", goodAfternoon: "శుభ మధ్యాహ్నం,", goodEvening: "శుభ సాయంత్రం,",
    greeting: "నమస్తే {{name}}, ఈరోజు మేము మీకు ఎలా సహాయపడగలము?",
    searchPlaceholder: "మందులు లేదా వ్యాధులను శోధించండి",
    viewAppointments: "అపాయింట్‌మెంట్‌లను చూడండి →",
    nearbyDoctors: "సమీప డాక్టర్లు",
    sortingByDistance: "దూరం ఆధారంగా క్రమబద్ధీకరిస్తోంది…",
    sortedByDistance: "మీ స్థానం నుండి దూరం ఆధారంగా క్రమబద్ధీకరించబడింది",
    enableLocation: "దూర క్రమం కోసం స్థానాన్ని ప్రారంభించండి",
    seeAll: "అన్నీ చూడండి →",
    noDoctorsFound: "డాక్టర్లు కనుగొనబడలేదు",
    previouslyVisited: "మునుపు సందర్శించినవి",
    quickRebook: "ఒకే ట్యాప్‌లో త్వరగా రీబుక్ చేయండి",
    noPreviousDoctors: "మీరు సందర్శించిన డాక్టర్లు త్వరిత రీబుకింగ్ కోసం ఇక్కడ కనిపిస్తారు.",
    rebook: "మళ్ళీ బుక్ చేయండి",
    bookNow: "ఇప్పుడే బుక్ చేయండి",
    yrsExp: "{{years}} సం.",
    consultationFee: "సంప్రదింపు ఫీజు",
    issuePlaceholder: "ఉదా. 5 రోజులుగా నిరంతర దగ్గు...",
    bookFee: "బుక్ చేయండి — ₹{{fee}}"
  },
  kn: {
    goodMorning: "ಶುಭೋದಯ,", goodAfternoon: "ಶುಭ ಮಧ್ಯಾಹ್ನ,", goodEvening: "ಶುಭ ಸಂಜೆ,",
    greeting: "ನಮಸ್ಕಾರ {{name}}, ಇಂದು ನಾವು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?",
    searchPlaceholder: "ಔಷಧಿಗಳು ಅಥವಾ ಕಾಯಿಲೆಗಳನ್ನು ಹುಡುಕಿ",
    viewAppointments: "ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್‌ಗಳನ್ನು ವೀಕ್ಷಿಸಿ →",
    nearbyDoctors: "ಹತ್ತಿರದ ವೈದ್ಯರು",
    sortingByDistance: "ದೂರದ ಆಧಾರದ ಮೇಲೆ ವಿಂಗಡಿಸಲಾಗುತ್ತಿದೆ…",
    sortedByDistance: "ನಿಮ್ಮ ಸ್ಥಳದಿಂದ ದೂರದ ಆಧಾರದ ಮೇಲೆ ವಿಂಗಡಿಸಲಾಗಿದೆ",
    enableLocation: "ದೂರ ವಿಂಗಡಣೆಗಾಗಿ ಸ್ಥಳವನ್ನು ಸಕ್ರಿಯಗೊಳಿಸಿ",
    seeAll: "ಎಲ್ಲವನ್ನೂ ನೋಡಿ →",
    noDoctorsFound: "ಯಾವುದೇ ವೈದ್ಯರು ಕಂಡುಬಂದಿಲ್ಲ",
    previouslyVisited: "ಹಿಂದೆ ಭೇಟಿ ನೀಡಿದವರು",
    quickRebook: "ಒಂದೇ ಟ್ಯಾಪ್‌ನಲ್ಲಿ ತ್ವರಿತ ಮರುಬುಕಿಂಗ್",
    noPreviousDoctors: "ನೀವು ಭೇಟಿ ನೀಡುವ ವೈದ್ಯರು ತ್ವರಿತ ಮರುಬುಕಿಂಗ್‌ಗಾಗಿ ಇಲ್ಲಿ ಕಾಣಿಸಿಕೊಳ್ಳುತ್ತಾರೆ.",
    rebook: "ಮತ್ತೆ ಬುಕ್ ಮಾಡಿ",
    bookNow: "ಈಗ ಬುಕ್ ಮಾಡಿ",
    yrsExp: "{{years}} ವರ್ಷ",
    consultationFee: "ಸಮಾಲೋಚನಾ ಶುಲ್ಕ",
    issuePlaceholder: "ಉದಾ. 5 ದಿನಗಳಿಂದ ನಿರಂತರ ಕೆಮ್ಮು...",
    bookFee: "ಬುಕ್ ಮಾಡಿ — ₹{{fee}}"
  },
  bn: {
    goodMorning: "শুভ সকাল,", goodAfternoon: "শুভ অপরাহ্ন,", goodEvening: "শুভ সন্ধ্যা,",
    greeting: "নমস্কার {{name}}, আজ আমরা আপনাকে কীভাবে সাহায্য করতে পারি?",
    searchPlaceholder: "ওষুধ বা রোগ খুঁজুন",
    viewAppointments: "অ্যাপয়েন্টমেন্ট দেখুন →",
    nearbyDoctors: "কাছাকাছি ডাক্তার",
    sortingByDistance: "দূরত্ব অনুযায়ী সাজানো হচ্ছে…",
    sortedByDistance: "আপনার অবস্থান থেকে দূরত্ব অনুযায়ী সাজানো",
    enableLocation: "দূরত্ব সাজানোর জন্য অবস্থান সক্ষম করুন",
    seeAll: "সব দেখুন →",
    noDoctorsFound: "কোনো ডাক্তার পাওয়া যায়নি",
    previouslyVisited: "পূর্বে দেখা",
    quickRebook: "এক ট্যাপে দ্রুত পুনরায় বুক করুন",
    noPreviousDoctors: "আপনি যেসব ডাক্তারের কাছে গিয়েছেন তারা দ্রুত পুনরায় বুকিংয়ের জন্য এখানে দেখা যাবে।",
    rebook: "পুনরায় বুক করুন",
    bookNow: "এখনই বুক করুন",
    yrsExp: "{{years}} বছর",
    consultationFee: "পরামর্শ ফি",
    issuePlaceholder: "যেমন: ৫ দিন ধরে ক্রমাগত কাশি...",
    bookFee: "বুক করুন — ₹{{fee}}"
  },
  ml: {
    goodMorning: "സുപ്രഭാതം,", goodAfternoon: "ഉച്ച വന്ദനം,", goodEvening: "ശുഭ സന്ധ്യ,",
    greeting: "നമസ്കാരം {{name}}, ഇന്ന് ഞങ്ങൾക്ക് നിങ്ങളെ എങ്ങനെ സഹായിക്കാം?",
    searchPlaceholder: "മരുന്നുകൾ അല്ലെങ്കിൽ രോഗങ്ങൾ തിരയുക",
    viewAppointments: "അപ്പോയിന്റ്മെന്റുകൾ കാണുക →",
    nearbyDoctors: "സമീപത്തെ ഡോക്ടർമാർ",
    sortingByDistance: "ദൂരം അനുസരിച്ച് ക്രമീകരിക്കുന്നു…",
    sortedByDistance: "നിങ്ങളുടെ സ്ഥലത്ത് നിന്നുള്ള ദൂരം അനുസരിച്ച് ക്രമീകരിച്ചിരിക്കുന്നു",
    enableLocation: "ദൂര ക്രമീകരണത്തിന് ലൊക്കേഷൻ പ്രവർത്തനക്ഷമമാക്കുക",
    seeAll: "എല്ലാം കാണുക →",
    noDoctorsFound: "ഡോക്ടർമാരെ കണ്ടെത്തിയില്ല",
    previouslyVisited: "മുമ്പ് സന്ദർശിച്ചവ",
    quickRebook: "ഒറ്റ ടാപ്പിൽ വേഗത്തിൽ വീണ്ടും ബുക്ക് ചെയ്യുക",
    noPreviousDoctors: "നിങ്ങൾ സന്ദർശിക്കുന്ന ഡോക്ടർമാർ വേഗത്തിലുള്ള റീബുക്കിംഗിനായി ഇവിടെ കാണിക്കും.",
    rebook: "വീണ്ടും ബുക്ക് ചെയ്യുക",
    bookNow: "ഇപ്പോൾ ബുക്ക് ചെയ്യുക",
    yrsExp: "{{years}} വർഷം",
    consultationFee: "കൺസൾട്ടേഷൻ ഫീസ്",
    issuePlaceholder: "ഉദാ: 5 ദിവസമായി തുടർച്ചയായ ചുമ...",
    bookFee: "ബുക്ക് ചെയ്യുക — ₹{{fee}}"
  },
  gu: {
    goodMorning: "સુપ્રભાત,", goodAfternoon: "શુભ બપોર,", goodEvening: "શુભ સાંજ,",
    greeting: "નમસ્તે {{name}}, આજે અમે તમારી કેવી રીતે મદદ કરી શકીએ?",
    searchPlaceholder: "દવાઓ અથવા બીમારીઓ શોધો",
    viewAppointments: "એપોઇન્ટમેન્ટ જુઓ →",
    nearbyDoctors: "નજીકના ડૉક્ટરો",
    sortingByDistance: "અંતર પ્રમાણે ક્રમબદ્ધ થઈ રહ્યું છે…",
    sortedByDistance: "તમારા સ્થાનથી અંતર પ્રમાણે ક્રમબદ્ધ",
    enableLocation: "અંતર ક્રમ માટે સ્થાન સક્ષમ કરો",
    seeAll: "બધા જુઓ →",
    noDoctorsFound: "કોઈ ડૉક્ટર મળ્યા નથી",
    previouslyVisited: "પહેલા મુલાકાત લીધેલ",
    quickRebook: "એક ટેપમાં ઝડપી ફરી બુક કરો",
    noPreviousDoctors: "તમે મુલાકાત લીધેલા ડૉક્ટરો અહીં ઝડપી ફરી બુકિંગ માટે દેખાશે.",
    rebook: "ફરી બુક કરો",
    bookNow: "હમણાં બુક કરો",
    yrsExp: "{{years}} વર્ષ",
    consultationFee: "પરામર્શ ફી",
    issuePlaceholder: "દા.ત. 5 દિવસથી સતત ખાંસી...",
    bookFee: "બુક કરો — ₹{{fee}}"
  },
  pa: {
    goodMorning: "ਸ਼ੁਭ ਸਵੇਰ,", goodAfternoon: "ਸ਼ੁਭ ਦੁਪਹਿਰ,", goodEvening: "ਸ਼ੁਭ ਸ਼ਾਮ,",
    greeting: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ {{name}}, ਅੱਜ ਅਸੀਂ ਤੁਹਾਡੀ ਕਿਵੇਂ ਮਦਦ ਕਰ ਸਕਦੇ ਹਾਂ?",
    searchPlaceholder: "ਦਵਾਈਆਂ ਜਾਂ ਬਿਮਾਰੀਆਂ ਖੋਜੋ",
    viewAppointments: "ਅਪਾਇੰਟਮੈਂਟਾਂ ਵੇਖੋ →",
    nearbyDoctors: "ਨੇੜਲੇ ਡਾਕਟਰ",
    sortingByDistance: "ਦੂਰੀ ਅਨੁਸਾਰ ਕ੍ਰਮਬੱਧ ਹੋ ਰਿਹਾ ਹੈ…",
    sortedByDistance: "ਤੁਹਾਡੇ ਸਥਾਨ ਤੋਂ ਦੂਰੀ ਅਨੁਸਾਰ ਕ੍ਰਮਬੱਧ",
    enableLocation: "ਦੂਰੀ ਕ੍ਰਮ ਲਈ ਸਥਾਨ ਸਮਰੱਥ ਕਰੋ",
    seeAll: "ਸਾਰੇ ਵੇਖੋ →",
    noDoctorsFound: "ਕੋਈ ਡਾਕਟਰ ਨਹੀਂ ਮਿਲਿਆ",
    previouslyVisited: "ਪਹਿਲਾਂ ਮਿਲੇ",
    quickRebook: "ਇੱਕ ਟੈਪ ਵਿੱਚ ਤੇਜ਼ੀ ਨਾਲ ਮੁੜ ਬੁੱਕ ਕਰੋ",
    noPreviousDoctors: "ਤੁਹਾਡੇ ਵੱਲੋਂ ਮਿਲੇ ਡਾਕਟਰ ਇੱਥੇ ਤੇਜ਼ ਮੁੜ-ਬੁਕਿੰਗ ਲਈ ਦਿਖਾਈ ਦੇਣਗੇ।",
    rebook: "ਮੁੜ ਬੁੱਕ ਕਰੋ",
    bookNow: "ਹੁਣੇ ਬੁੱਕ ਕਰੋ",
    yrsExp: "{{years}} ਸਾਲ",
    consultationFee: "ਸਲਾਹ ਫੀਸ",
    issuePlaceholder: "ਜਿਵੇਂ: 5 ਦਿਨਾਂ ਤੋਂ ਲਗਾਤਾਰ ਖੰਘ...",
    bookFee: "ਬੁੱਕ ਕਰੋ — ₹{{fee}}"
  }
};

const files = fs.readdirSync(LOCALES_DIR).filter(f => f.endsWith('.json'));

for (const file of files) {
  const lang = file.replace('.json', '');
  if (!HOME_NS[lang]) {
    console.log(`⚠️  Skipped ${file} — no translation prepared for "${lang}"`);
    continue;
  }
  const filePath = path.join(LOCALES_DIR, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  if (data.home) {
    console.log(`⏭  ${file}: "home" namespace already exists — skipped`);
    continue;
  }

  data.home = HOME_NS[lang];
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`✅ ${file}: added "home" namespace`);
}

console.log('\nDone. Run check_i18n_keys.js again to confirm all 10 files still match.');