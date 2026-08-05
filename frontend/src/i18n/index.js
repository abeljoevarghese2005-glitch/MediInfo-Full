import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import hi from './locales/hi.json'
import mr from './locales/mr.json'
import ta from './locales/ta.json'
import te from './locales/te.json'
import kn from './locales/kn.json'
import bn from './locales/bn.json'
import ml from './locales/ml.json'
import gu from './locales/gu.json'
import pa from './locales/pa.json'

const savedLang = localStorage.getItem('niraamo_lang') || 'en'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      mr: { translation: mr },
      ta: { translation: ta },
      te: { translation: te },
      kn: { translation: kn },
      bn: { translation: bn },
      ml: { translation: ml },
      gu: { translation: gu },
      pa: { translation: pa },
    },
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n