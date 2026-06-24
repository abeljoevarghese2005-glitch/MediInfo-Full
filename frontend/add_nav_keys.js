// add_nav_keys.js
// Usage: node add_nav_keys.js src/i18n/locales
// Adds a new "nav" namespace (sidebar labels) to every locale JSON file.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = process.argv[2] || __dirname;

const NAV_NS = {
  en: { menu: "Menu", home: "Home", bookDoctor: "Book a Doctor", myAppointments: "My Appointments", liveQueue: "Live Queue", reminders: "Reminders", profile: "Profile", dashboard: "Dashboard" },
  hi: { menu: "मेनू", home: "होम", bookDoctor: "डॉक्टर बुक करें", myAppointments: "मेरी अपॉइंटमेंट", liveQueue: "लाइव कतार", reminders: "रिमाइंडर", profile: "प्रोफाइल", dashboard: "डैशबोर्ड" },
  mr: { menu: "मेनू", home: "होम", bookDoctor: "डॉक्टर बुक करा", myAppointments: "माझ्या अपॉइंटमेंट", liveQueue: "लाइव्ह रांग", reminders: "रिमाइंडर", profile: "प्रोफाइल", dashboard: "डॅशबोर्ड" },
  ta: { menu: "மெனு", home: "முகப்பு", bookDoctor: "மருத்துவரை பதிவு செய்", myAppointments: "என் அப்பாயிண்ட்மென்ட்கள்", liveQueue: "லைவ் வரிசை", reminders: "நினைவூட்டல்கள்", profile: "சுயவிவரம்", dashboard: "டாஷ்போர்டு" },
  te: { menu: "మెనూ", home: "హోమ్", bookDoctor: "డాక్టర్‌ను బుక్ చేయండి", myAppointments: "నా అపాయింట్‌మెంట్‌లు", liveQueue: "లైవ్ క్యూ", reminders: "రిమైండర్‌లు", profile: "ప్రొఫైల్", dashboard: "డాష్‌బోర్డ్" },
  kn: { menu: "ಮೆನು", home: "ಹೋಮ್", bookDoctor: "ವೈದ್ಯರನ್ನು ಬುಕ್ ಮಾಡಿ", myAppointments: "ನನ್ನ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್‌ಗಳು", liveQueue: "ಲೈವ್ ಕ್ಯೂ", reminders: "ರಿಮೈಂಡರ್‌ಗಳು", profile: "ಪ್ರೊಫೈಲ್", dashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್" },
  bn: { menu: "মেনু", home: "হোম", bookDoctor: "ডাক্তার বুক করুন", myAppointments: "আমার অ্যাপয়েন্টমেন্ট", liveQueue: "লাইভ কিউ", reminders: "রিমাইন্ডার", profile: "প্রোফাইল", dashboard: "ড্যাশবোর্ড" },
  ml: { menu: "മെനു", home: "ഹോം", bookDoctor: "ഡോക്ടറെ ബുക്ക് ചെയ്യുക", myAppointments: "എന്റെ അപ്പോയിന്റ്മെന്റുകൾ", liveQueue: "ലൈവ് ക്യൂ", reminders: "റിമൈൻഡറുകൾ", profile: "പ്രൊഫൈൽ", dashboard: "ഡാഷ്ബോർഡ്" },
  gu: { menu: "મેનુ", home: "હોમ", bookDoctor: "ડૉક્ટર બુક કરો", myAppointments: "મારી એપોઇન્ટમેન્ટ", liveQueue: "લાઇવ કતાર", reminders: "રિમાઇન્ડર", profile: "પ્રોફાઇલ", dashboard: "ડેશબોર્ડ" },
  pa: { menu: "ਮੇਨੂ", home: "ਹੋਮ", bookDoctor: "ਡਾਕਟਰ ਬੁੱਕ ਕਰੋ", myAppointments: "ਮੇਰੀਆਂ ਅਪਾਇੰਟਮੈਂਟਾਂ", liveQueue: "ਲਾਈਵ ਕਤਾਰ", reminders: "ਰਿਮਾਈਂਡਰ", profile: "ਪ੍ਰੋਫਾਈਲ", dashboard: "ਡੈਸ਼ਬੋਰਡ" },
};

const files = fs.readdirSync(LOCALES_DIR).filter(f => f.endsWith('.json'));

for (const file of files) {
  const lang = file.replace('.json', '');
  if (!NAV_NS[lang]) {
    console.log(`⚠️  Skipped ${file} — no translation prepared for "${lang}"`);
    continue;
  }
  const filePath = path.join(LOCALES_DIR, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  if (data.nav) {
    console.log(`⏭  ${file}: "nav" namespace already exists — skipped`);
    continue;
  }

  data.nav = NAV_NS[lang];
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`✅ ${file}: added "nav" namespace`);
}

console.log('\nDone. Run check_i18n_keys.js again to confirm all 10 files still match.');