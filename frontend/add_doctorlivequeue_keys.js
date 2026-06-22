// add_doctorlivequeue_keys.js
// Adds the `doctorLiveQueue` namespace to all 10 locale files.
// Run with: node add_doctorlivequeue_keys.js
// (ES module syntax — package.json has "type": "module")

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const LOCALES_DIR = path.join(__dirname, 'src', 'i18n', 'locales')

const LANGS = ['en', 'hi', 'mr', 'ta', 'te', 'kn', 'bn', 'ml', 'gu', 'pa']

// Translations per language for the doctorLiveQueue namespace.
const newKeys = {
  en: {
    doctorLiveQueue: {
      header: {
        title: "Live Queue",
        subtitle: "Today's confirmed patients",
        refresh: "Refresh"
      },
      loading: "Loading queue…",
      empty: {
        title: "No patients in queue today",
        subtitle: "Confirmed appointments will appear here."
      },
      progress: {
        title: "Queue Progress",
        status: "{{done}} done · {{remaining}} remaining",
        totalToday: "{{count}} total patients today"
      },
      issueFallback: "General consultation",
      current: {
        nowConsulting: "Now Consulting",
        markingDone: "Marking done…",
        doneNextPatient: "Done — Next Patient"
      },
      allSeen: {
        title: "All patients seen!",
        subtitle: "Queue complete for today."
      },
      waiting: {
        title: "Waiting ({{count}})"
      },
      summary: {
        title: "Today's Summary",
        totalScheduled: "Total scheduled",
        completed: "Completed",
        inProgress: "In progress",
        waiting: "Waiting"
      },
      completedSection: {
        title: "Completed ({{count}})"
      }
    }
  },
  hi: {
    doctorLiveQueue: {
      header: {
        title: "लाइव कतार",
        subtitle: "आज के पुष्ट मरीज़",
        refresh: "रीफ़्रेश करें"
      },
      loading: "कतार लोड हो रही है…",
      empty: {
        title: "आज कतार में कोई मरीज़ नहीं है",
        subtitle: "पुष्ट अपॉइंटमेंट यहाँ दिखाई देंगे।"
      },
      progress: {
        title: "कतार की प्रगति",
        status: "{{done}} पूर्ण · {{remaining}} शेष",
        totalToday: "आज कुल {{count}} मरीज़"
      },
      issueFallback: "सामान्य परामर्श",
      current: {
        nowConsulting: "अभी परामर्श में",
        markingDone: "पूर्ण किया जा रहा है…",
        doneNextPatient: "पूर्ण — अगला मरीज़"
      },
      allSeen: {
        title: "सभी मरीज़ देखे जा चुके हैं!",
        subtitle: "आज की कतार पूर्ण हो गई है।"
      },
      waiting: {
        title: "प्रतीक्षा में ({{count}})"
      },
      summary: {
        title: "आज का सारांश",
        totalScheduled: "कुल निर्धारित",
        completed: "पूर्ण",
        inProgress: "प्रगति में",
        waiting: "प्रतीक्षा में"
      },
      completedSection: {
        title: "पूर्ण ({{count}})"
      }
    }
  },
  mr: {
    doctorLiveQueue: {
      header: {
        title: "थेट रांग",
        subtitle: "आजचे पुष्ट रुग्ण",
        refresh: "रिफ्रेश करा"
      },
      loading: "रांग लोड होत आहे…",
      empty: {
        title: "आज रांगेत कोणतेही रुग्ण नाहीत",
        subtitle: "पुष्ट केलेल्या भेटी येथे दिसतील."
      },
      progress: {
        title: "रांगेची प्रगती",
        status: "{{done}} पूर्ण · {{remaining}} शिल्लक",
        totalToday: "आज एकूण {{count}} रुग्ण"
      },
      issueFallback: "सामान्य सल्ला",
      current: {
        nowConsulting: "सध्या सल्लामसलत",
        markingDone: "पूर्ण करत आहे…",
        doneNextPatient: "पूर्ण — पुढील रुग्ण"
      },
      allSeen: {
        title: "सर्व रुग्ण पाहिले!",
        subtitle: "आजची रांग पूर्ण झाली."
      },
      waiting: {
        title: "प्रतीक्षेत ({{count}})"
      },
      summary: {
        title: "आजचा सारांश",
        totalScheduled: "एकूण नियोजित",
        completed: "पूर्ण",
        inProgress: "प्रगतीपथावर",
        waiting: "प्रतीक्षेत"
      },
      completedSection: {
        title: "पूर्ण ({{count}})"
      }
    }
  },
  ta: {
    doctorLiveQueue: {
      header: {
        title: "நேரடி வரிசை",
        subtitle: "இன்றைய உறுதிசெய்யப்பட்ட நோயாளிகள்",
        refresh: "புதுப்பிக்க"
      },
      loading: "வரிசை ஏற்றப்படுகிறது…",
      empty: {
        title: "இன்று வரிசையில் நோயாளிகள் இல்லை",
        subtitle: "உறுதிசெய்யப்பட்ட சந்திப்புகள் இங்கே தோன்றும்."
      },
      progress: {
        title: "வரிசை முன்னேற்றம்",
        status: "{{done}} முடிந்தது · {{remaining}} மீதமுள்ளது",
        totalToday: "இன்று மொத்தம் {{count}} நோயாளிகள்"
      },
      issueFallback: "பொது ஆலோசனை",
      current: {
        nowConsulting: "இப்போது ஆலோசனை",
        markingDone: "முடிக்கப்படுகிறது…",
        doneNextPatient: "முடிந்தது — அடுத்த நோயாளி"
      },
      allSeen: {
        title: "அனைத்து நோயாளிகளும் பார்க்கப்பட்டனர்!",
        subtitle: "இன்றைய வரிசை முடிந்தது."
      },
      waiting: {
        title: "காத்திருப்பு ({{count}})"
      },
      summary: {
        title: "இன்றைய சுருக்கம்",
        totalScheduled: "மொத்த திட்டமிடப்பட்டவை",
        completed: "முடிந்தது",
        inProgress: "நடைபெறுகிறது",
        waiting: "காத்திருப்பு"
      },
      completedSection: {
        title: "முடிந்தது ({{count}})"
      }
    }
  },
  te: {
    doctorLiveQueue: {
      header: {
        title: "ప్రత్యక్ష క్యూ",
        subtitle: "నేటి నిర్ధారిత రోగులు",
        refresh: "రిఫ్రెష్ చేయండి"
      },
      loading: "క్యూ లోడ్ అవుతోంది…",
      empty: {
        title: "నేడు క్యూలో రోగులు లేరు",
        subtitle: "నిర్ధారిత అపాయింట్‌మెంట్‌లు ఇక్కడ కనిపిస్తాయి."
      },
      progress: {
        title: "క్యూ పురోగతి",
        status: "{{done}} పూర్తయింది · {{remaining}} మిగిలి ఉంది",
        totalToday: "నేడు మొత్తం {{count}} రోగులు"
      },
      issueFallback: "సాధారణ సంప్రదింపు",
      current: {
        nowConsulting: "ఇప్పుడు సంప్రదింపు",
        markingDone: "పూర్తి చేస్తోంది…",
        doneNextPatient: "పూర్తయింది — తదుపరి రోగి"
      },
      allSeen: {
        title: "అందరు రోగులను చూశారు!",
        subtitle: "నేటి క్యూ పూర్తయింది."
      },
      waiting: {
        title: "వేచి ఉన్నారు ({{count}})"
      },
      summary: {
        title: "నేటి సారాంశం",
        totalScheduled: "మొత్తం షెడ్యూల్ చేయబడింది",
        completed: "పూర్తయింది",
        inProgress: "పురోగతిలో",
        waiting: "వేచి ఉన్నారు"
      },
      completedSection: {
        title: "పూర్తయింది ({{count}})"
      }
    }
  },
  kn: {
    doctorLiveQueue: {
      header: {
        title: "ಲೈವ್ ಕ್ಯೂ",
        subtitle: "ಇಂದಿನ ದೃಢಪಡಿಸಿದ ರೋಗಿಗಳು",
        refresh: "ರಿಫ್ರೆಶ್ ಮಾಡಿ"
      },
      loading: "ಕ್ಯೂ ಲೋಡ್ ಆಗುತ್ತಿದೆ…",
      empty: {
        title: "ಇಂದು ಕ್ಯೂನಲ್ಲಿ ಯಾವುದೇ ರೋಗಿಗಳಿಲ್ಲ",
        subtitle: "ದೃಢಪಡಿಸಿದ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್‌ಗಳು ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತವೆ."
      },
      progress: {
        title: "ಕ್ಯೂ ಪ್ರಗತಿ",
        status: "{{done}} ಪೂರ್ಣಗೊಂಡಿದೆ · {{remaining}} ಬಾಕಿ ಉಳಿದಿದೆ",
        totalToday: "ಇಂದು ಒಟ್ಟು {{count}} ರೋಗಿಗಳು"
      },
      issueFallback: "ಸಾಮಾನ್ಯ ಸಲಹೆ",
      current: {
        nowConsulting: "ಈಗ ಸಲಹೆ ನೀಡಲಾಗುತ್ತಿದೆ",
        markingDone: "ಪೂರ್ಣಗೊಳಿಸಲಾಗುತ್ತಿದೆ…",
        doneNextPatient: "ಪೂರ್ಣಗೊಂಡಿದೆ — ಮುಂದಿನ ರೋಗಿ"
      },
      allSeen: {
        title: "ಎಲ್ಲಾ ರೋಗಿಗಳನ್ನು ನೋಡಲಾಗಿದೆ!",
        subtitle: "ಇಂದಿನ ಕ್ಯೂ ಪೂರ್ಣಗೊಂಡಿದೆ."
      },
      waiting: {
        title: "ಕಾಯುತ್ತಿದ್ದಾರೆ ({{count}})"
      },
      summary: {
        title: "ಇಂದಿನ ಸಾರಾಂಶ",
        totalScheduled: "ಒಟ್ಟು ನಿಗದಿಪಡಿಸಲಾಗಿದೆ",
        completed: "ಪೂರ್ಣಗೊಂಡಿದೆ",
        inProgress: "ಪ್ರಗತಿಯಲ್ಲಿದೆ",
        waiting: "ಕಾಯುತ್ತಿದ್ದಾರೆ"
      },
      completedSection: {
        title: "ಪೂರ್ಣಗೊಂಡಿದೆ ({{count}})"
      }
    }
  },
  bn: {
    doctorLiveQueue: {
      header: {
        title: "লাইভ কিউ",
        subtitle: "আজকের নিশ্চিত রোগীরা",
        refresh: "রিফ্রেশ করুন"
      },
      loading: "কিউ লোড হচ্ছে…",
      empty: {
        title: "আজ কিউতে কোনো রোগী নেই",
        subtitle: "নিশ্চিত অ্যাপয়েন্টমেন্টগুলি এখানে দেখা যাবে।"
      },
      progress: {
        title: "কিউ অগ্রগতি",
        status: "{{done}} সম্পন্ন · {{remaining}} বাকি",
        totalToday: "আজ মোট {{count}} জন রোগী"
      },
      issueFallback: "সাধারণ পরামর্শ",
      current: {
        nowConsulting: "বর্তমানে পরামর্শ চলছে",
        markingDone: "সম্পন্ন করা হচ্ছে…",
        doneNextPatient: "সম্পন্ন — পরবর্তী রোগী"
      },
      allSeen: {
        title: "সব রোগী দেখা হয়ে গেছে!",
        subtitle: "আজকের কিউ সম্পন্ন।"
      },
      waiting: {
        title: "অপেক্ষায় ({{count}})"
      },
      summary: {
        title: "আজকের সারসংক্ষেপ",
        totalScheduled: "মোট নির্ধারিত",
        completed: "সম্পন্ন",
        inProgress: "চলমান",
        waiting: "অপেক্ষায়"
      },
      completedSection: {
        title: "সম্পন্ন ({{count}})"
      }
    }
  },
  ml: {
    doctorLiveQueue: {
      header: {
        title: "ലൈവ് ക്യൂ",
        subtitle: "ഇന്നത്തെ സ്ഥിരീകരിച്ച രോഗികൾ",
        refresh: "പുതുക്കുക"
      },
      loading: "ക്യൂ ലോഡ് ചെയ്യുന്നു…",
      empty: {
        title: "ഇന്ന് ക്യൂവിൽ രോഗികളില്ല",
        subtitle: "സ്ഥിരീകരിച്ച അപ്പോയിന്റ്മെന്റുകൾ ഇവിടെ കാണാം."
      },
      progress: {
        title: "ക്യൂ പുരോഗതി",
        status: "{{done}} പൂർത്തിയായി · {{remaining}} ശേഷിക്കുന്നു",
        totalToday: "ഇന്ന് മൊത്തം {{count}} രോഗികൾ"
      },
      issueFallback: "സാധാരണ കൺസൾട്ടേഷൻ",
      current: {
        nowConsulting: "ഇപ്പോൾ കൺസൾട്ടേഷൻ",
        markingDone: "പൂർത്തിയാക്കുന്നു…",
        doneNextPatient: "പൂർത്തിയായി — അടുത്ത രോഗി"
      },
      allSeen: {
        title: "എല്ലാ രോഗികളെയും കണ്ടു!",
        subtitle: "ഇന്നത്തെ ക്യൂ പൂർത്തിയായി."
      },
      waiting: {
        title: "കാത്തിരിക്കുന്നു ({{count}})"
      },
      summary: {
        title: "ഇന്നത്തെ സംഗ്രഹം",
        totalScheduled: "മൊത്തം ഷെഡ്യൂൾ ചെയ്തവ",
        completed: "പൂർത്തിയായി",
        inProgress: "പുരോഗമിക്കുന്നു",
        waiting: "കാത്തിരിക്കുന്നു"
      },
      completedSection: {
        title: "പൂർത്തിയായി ({{count}})"
      }
    }
  },
  gu: {
    doctorLiveQueue: {
      header: {
        title: "લાઇવ ક્યૂ",
        subtitle: "આજના પુષ્ટ દર્દીઓ",
        refresh: "રિફ્રેશ કરો"
      },
      loading: "ક્યૂ લોડ થઈ રહી છે…",
      empty: {
        title: "આજે ક્યૂમાં કોઈ દર્દી નથી",
        subtitle: "પુષ્ટ થયેલ એપોઇન્ટમેન્ટ્સ અહીં દેખાશે."
      },
      progress: {
        title: "ક્યૂ પ્રગતિ",
        status: "{{done}} પૂર્ણ · {{remaining}} બાકી",
        totalToday: "આજે કુલ {{count}} દર્દીઓ"
      },
      issueFallback: "સામાન્ય સલાહ",
      current: {
        nowConsulting: "હાલમાં સલાહ ચાલુ છે",
        markingDone: "પૂર્ણ કરી રહ્યા છીએ…",
        doneNextPatient: "પૂર્ણ — આગળનો દર્દી"
      },
      allSeen: {
        title: "બધા દર્દીઓ જોવાઈ ગયા!",
        subtitle: "આજની ક્યૂ પૂર્ણ થઈ."
      },
      waiting: {
        title: "રાહ જોઈ રહ્યા છે ({{count}})"
      },
      summary: {
        title: "આજનો સારાંશ",
        totalScheduled: "કુલ નિર્ધારિત",
        completed: "પૂર્ણ",
        inProgress: "ચાલુ છે",
        waiting: "રાહ જોઈ રહ્યા છે"
      },
      completedSection: {
        title: "પૂર્ણ ({{count}})"
      }
    }
  },
  pa: {
    doctorLiveQueue: {
      header: {
        title: "ਲਾਈਵ ਕਿਊ",
        subtitle: "ਅੱਜ ਦੇ ਪੁਸ਼ਟੀ ਕੀਤੇ ਮਰੀਜ਼",
        refresh: "ਰਿਫ੍ਰੈਸ਼ ਕਰੋ"
      },
      loading: "ਕਿਊ ਲੋਡ ਹੋ ਰਹੀ ਹੈ…",
      empty: {
        title: "ਅੱਜ ਕਿਊ ਵਿੱਚ ਕੋਈ ਮਰੀਜ਼ ਨਹੀਂ",
        subtitle: "ਪੁਸ਼ਟੀ ਕੀਤੀਆਂ ਮੁਲਾਕਾਤਾਂ ਇੱਥੇ ਦਿਖਾਈ ਦੇਣਗੀਆਂ।"
      },
      progress: {
        title: "ਕਿਊ ਪ੍ਰਗਤੀ",
        status: "{{done}} ਪੂਰਾ · {{remaining}} ਬਾਕੀ",
        totalToday: "ਅੱਜ ਕੁੱਲ {{count}} ਮਰੀਜ਼"
      },
      issueFallback: "ਆਮ ਸਲਾਹ",
      current: {
        nowConsulting: "ਹੁਣ ਸਲਾਹ ਜਾਰੀ ਹੈ",
        markingDone: "ਪੂਰਾ ਕੀਤਾ ਜਾ ਰਿਹਾ ਹੈ…",
        doneNextPatient: "ਪੂਰਾ — ਅਗਲਾ ਮਰੀਜ਼"
      },
      allSeen: {
        title: "ਸਾਰੇ ਮਰੀਜ਼ ਦੇਖੇ ਜਾ ਚੁੱਕੇ ਹਨ!",
        subtitle: "ਅੱਜ ਦੀ ਕਿਊ ਪੂਰੀ ਹੋ ਗਈ।"
      },
      waiting: {
        title: "ਉਡੀਕ ਵਿੱਚ ({{count}})"
      },
      summary: {
        title: "ਅੱਜ ਦਾ ਸਾਰ",
        totalScheduled: "ਕੁੱਲ ਨਿਯਤ",
        completed: "ਪੂਰਾ",
        inProgress: "ਜਾਰੀ ਹੈ",
        waiting: "ਉਡੀਕ ਵਿੱਚ"
      },
      completedSection: {
        title: "ਪੂਰਾ ({{count}})"
      }
    }
  }
}

// Deep merge helper: merges `source` into `target`, mutating target.
function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key])
    ) {
      if (!target[key] || typeof target[key] !== 'object') {
        target[key] = {}
      }
      deepMerge(target[key], source[key])
    } else {
      target[key] = source[key]
    }
  }
  return target
}

let successCount = 0
let failCount = 0

for (const lang of LANGS) {
  const filePath = path.join(LOCALES_DIR, `${lang}.json`)
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const json = JSON.parse(raw)
    deepMerge(json, newKeys[lang])
    fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf-8')
    console.log(`✔ Updated ${lang}.json`)
    successCount++
  } catch (err) {
    console.error(`✘ Failed on ${lang}.json:`, err.message)
    failCount++
  }
}

console.log(`\nDone. ${successCount} updated, ${failCount} failed.`)