import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import de from './locales/de.json'
import ru from './locales/ru.json'
import zh from './locales/zh.json'
import ko from './locales/ko.json'
import ja from './locales/ja.json'
import it from './locales/it.json'
import tr from './locales/tr.json'
import es from './locales/es.json'
import el from './locales/el.json'
import uk from './locales/uk.json'
import fr from './locales/fr.json'

/**
 * 12 supported locales. P&S is most-played in:
 *   en, de, ru, zh, ko, ja, it, tr, es, el, uk, fr
 * Fallback chain: requested locale → English (universal).
 *
 * P&S in-game terminology (Hub, Mud, Captain, Tier, Lair, Hit Squad)
 * stays untranslated in every language — players already know these
 * names from their own game client.
 */
export const SUPPORTED_LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ru', label: 'Русский' },
  { code: 'zh', label: '中文' },
  { code: 'ko', label: '한국어' },
  { code: 'ja', label: '日本語' },
  { code: 'it', label: 'Italiano' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'es', label: 'Español' },
  { code: 'el', label: 'Ελληνικά' },
  { code: 'uk', label: 'Українська' },
  { code: 'fr', label: 'Français' },
] as const

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number]['code']

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LOCALES.map((l) => l.code),
    interpolation: { escapeValue: false }, // React handles XSS
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'wq:locale',
      caches: ['localStorage'],
    },
    resources: {
      en: { translation: en },
      de: { translation: de },
      ru: { translation: ru },
      zh: { translation: zh },
      ko: { translation: ko },
      ja: { translation: ja },
      it: { translation: it },
      tr: { translation: tr },
      es: { translation: es },
      el: { translation: el },
      uk: { translation: uk },
      fr: { translation: fr },
    },
  })

export default i18n
