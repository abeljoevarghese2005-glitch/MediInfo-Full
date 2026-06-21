// add_profile_role_keys.js
// Usage: node add_profile_role_keys.js src/i18n/locales
// Merges new keys into the EXISTING "profile" namespace (doesn't overwrite the namespace).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = process.argv[2] || __dirname;

const NEW_KEYS = {
  en: { profileTab: "Profile", roles: { patient: "Patient", doctor: "Doctor", pharmacist: "Pharmacist" } },
  hi: { profileTab: "प्रोफाइल", roles: { patient: "मरीज़", doctor: "डॉक्टर", pharmacist: "फार्मासिस्ट" } },
  mr: { profileTab: "प्रोफाइल", roles: { patient: "रुग्ण", doctor: "डॉक्टर", pharmacist: "फार्मासिस्ट" } },
  ta: { profileTab: "சுயவிவரம்", roles: { patient: "நோயாளி", doctor: "மருத்துவர்", pharmacist: "மருந்தாளர்" } },
  te: { profileTab: "ప్రొఫైల్", roles: { patient: "రోగి", doctor: "డాక్టర్", pharmacist: "ఫార్మసిస్ట్" } },
  kn: { profileTab: "ಪ್ರೊಫೈಲ್", roles: { patient: "ರೋಗಿ", doctor: "ವೈದ್ಯ", pharmacist: "ಫಾರ್ಮಾಸಿಸ್ಟ್" } },
  bn: { profileTab: "প্রোফাইল", roles: { patient: "রোগী", doctor: "ডাক্তার", pharmacist: "ফার্মাসিস্ট" } },
  ml: { profileTab: "പ്രൊഫൈൽ", roles: { patient: "രോഗി", doctor: "ഡോക്ടർ", pharmacist: "ഫാർമസിസ്റ്റ്" } },
  gu: { profileTab: "પ્રોફાઇલ", roles: { patient: "દર્દી", doctor: "ડૉક્ટર", pharmacist: "ફાર્માસિસ્ટ" } },
  pa: { profileTab: "ਪ੍ਰੋਫਾਈਲ", roles: { patient: "ਮਰੀਜ਼", doctor: "ਡਾਕਟਰ", pharmacist: "ਫਾਰਮਾਸਿਸਟ" } },
};

const files = fs.readdirSync(LOCALES_DIR).filter(f => f.endsWith('.json'));

for (const file of files) {
  const lang = file.replace('.json', '');
  if (!NEW_KEYS[lang]) {
    console.log(`⚠️  Skipped ${file} — no translation prepared for "${lang}"`);
    continue;
  }
  const filePath = path.join(LOCALES_DIR, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  if (!data.profile) {
    console.log(`❌ ${file}: no "profile" namespace found — skipping (unexpected)`);
    continue;
  }

  if (data.profile.profileTab) {
    console.log(`⏭  ${file}: profile.profileTab already exists — skipped`);
    continue;
  }

  data.profile.profileTab = NEW_KEYS[lang].profileTab;
  data.profile.roles = NEW_KEYS[lang].roles;

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`✅ ${file}: added profile.profileTab and profile.roles`);
}

console.log('\nDone. Run check_i18n_keys.js again to confirm all 10 files still match.');