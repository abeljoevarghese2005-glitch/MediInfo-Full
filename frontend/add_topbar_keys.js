// add_topbar_keys.js
// Usage: node add_topbar_keys.js src/i18n/locales

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = process.argv[2] || __dirname;

const TOPBAR_NS = {
  en: { aiChat: "AI Chat", openMenu: "Open menu" },
  hi: { aiChat: "AI चैट", openMenu: "मेनू खोलें" },
  mr: { aiChat: "AI चॅट", openMenu: "मेनू उघडा" },
  ta: { aiChat: "AI அரட்டை", openMenu: "மெனுவைத் திற" },
  te: { aiChat: "AI చాట్", openMenu: "మెనూ తెరవండి" },
  kn: { aiChat: "AI ಚಾಟ್", openMenu: "ಮೆನು ತೆರೆಯಿರಿ" },
  bn: { aiChat: "AI চ্যাট", openMenu: "মেনু খুলুন" },
  ml: { aiChat: "AI ചാറ്റ്", openMenu: "മെനു തുറക്കുക" },
  gu: { aiChat: "AI ચેટ", openMenu: "મેનુ ખોલો" },
  pa: { aiChat: "AI ਚੈਟ", openMenu: "ਮੇਨੂ ਖੋਲ੍ਹੋ" },
};

const files = fs.readdirSync(LOCALES_DIR).filter(f => f.endsWith('.json'));

for (const file of files) {
  const lang = file.replace('.json', '');
  if (!TOPBAR_NS[lang]) {
    console.log(`⚠️  Skipped ${file} — no translation prepared for "${lang}"`);
    continue;
  }
  const filePath = path.join(LOCALES_DIR, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  if (data.topBar) {
    console.log(`⏭  ${file}: "topBar" namespace already exists — skipped`);
    continue;
  }

  data.topBar = TOPBAR_NS[lang];
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`✅ ${file}: added "topBar" namespace`);
}

console.log('\nDone. Run check_i18n_keys.js again to confirm all 10 files still match.');