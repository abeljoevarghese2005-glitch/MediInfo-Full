// check_i18n_keys.js
// Usage: node check_i18n_keys.js
// Run this from inside src/i18n/locales/ (or adjust LOCALES_DIR below)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = process.argv[2] || __dirname; // pass folder path as arg, or run from inside locales/
const BASE_LANG = 'en';

function flattenKeys(obj, prefix = '') {
  let keys = [];
  for (const k in obj) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (obj[k] && typeof obj[k] === 'object' && !Array.isArray(obj[k])) {
      keys = keys.concat(flattenKeys(obj[k], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

const files = fs.readdirSync(LOCALES_DIR).filter(f => f.endsWith('.json'));
if (!files.includes(`${BASE_LANG}.json`)) {
  console.error(`Could not find ${BASE_LANG}.json in ${LOCALES_DIR}`);
  process.exit(1);
}

const baseData = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, `${BASE_LANG}.json`), 'utf8'));
const baseKeys = new Set(flattenKeys(baseData));

console.log(`Base (en.json): ${baseKeys.size} keys\n`);

let anyIssues = false;

for (const file of files) {
  const lang = file.replace('.json', '');
  if (lang === BASE_LANG) continue;

  let data;
  try {
    data = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, file), 'utf8'));
  } catch (e) {
    console.log(`❌ ${file}: INVALID JSON — ${e.message}`);
    anyIssues = true;
    continue;
  }

  const keys = new Set(flattenKeys(data));
  const missing = [...baseKeys].filter(k => !keys.has(k));
  const extra = [...keys].filter(k => !baseKeys.has(k));

  if (missing.length === 0 && extra.length === 0) {
    console.log(`✅ ${file}: OK (${keys.size} keys, matches en.json)`);
  } else {
    anyIssues = true;
    console.log(`⚠️  ${file}: ${keys.size} keys`);
    if (missing.length > 0) {
      console.log(`   Missing (${missing.length}):`);
      missing.forEach(k => console.log(`     - ${k}`));
    }
    if (extra.length > 0) {
      console.log(`   Extra/unexpected (${extra.length}):`);
      extra.forEach(k => console.log(`     + ${k}`));
    }
  }
}

console.log('\n' + (anyIssues ? '❌ Issues found — fix above before relying on these translations.' : '✅ All locale files match en.json key structure.'));