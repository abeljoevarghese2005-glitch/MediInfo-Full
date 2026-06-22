// add_doctorprofile_keys.js
// Adds the `doctorProfile.tabs.info` key to all 10 locale files.
// (Language tab itself reuses existing profile.languageTab / languageTitle /
//  languageSubtitle / languageSaved keys — no duplication needed.)
// Run with: node add_doctorprofile_keys.js
// (ES module syntax — package.json has "type": "module")

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const LOCALES_DIR = path.join(__dirname, 'src', 'i18n', 'locales')

const LANGS = ['en', 'hi', 'mr', 'ta', 'te', 'kn', 'bn', 'ml', 'gu', 'pa']

const newKeys = {
  en: { doctorProfile: { tabs: { info: "Profile" } } },
  hi: { doctorProfile: { tabs: { info: "प्रोफ़ाइल" } } },
  mr: { doctorProfile: { tabs: { info: "प्रोफाइल" } } },
  ta: { doctorProfile: { tabs: { info: "சுயவிவரம்" } } },
  te: { doctorProfile: { tabs: { info: "ప్రొఫైల్" } } },
  kn: { doctorProfile: { tabs: { info: "ಪ್ರೊಫೈಲ್" } } },
  bn: { doctorProfile: { tabs: { info: "প্রোফাইল" } } },
  ml: { doctorProfile: { tabs: { info: "പ്രൊഫൈൽ" } } },
  gu: { doctorProfile: { tabs: { info: "પ્રોફાઇલ" } } },
  pa: { doctorProfile: { tabs: { info: "ਪ੍ਰੋਫਾਈਲ" } } },
}

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