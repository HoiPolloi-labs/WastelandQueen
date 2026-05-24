import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

// English stays eager — it's the fallback every locale resolves to, so
// without it the first render would flash raw keys before any async
// load resolves.
import en from './locales/en.json'

/**
 * 12 supported locales. P&S is most-played in:
 *   en, de, ru, zh, ko, ja, it, tr, es, el, uk, fr
 * Fallback chain: requested locale → English (universal).
 *
 * PERF (review-pass wave 2): only English ships in the main bundle
 * (~28kB raw / 8kB gzip). The other 11 locales are dynamic-imported on
 * demand — pulling the entire 12-locale set into the main chunk was
 * ~303kB raw / ~100kB gzip since most visitors only need one. Vite emits
 * each as `locale-<code>-<hash>.js`. See `lazyLoaders` below.
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

// Code-split each non-English locale into its own chunk. The first language
// switch (or initial detection) triggers an async load; subsequent uses are
// cached by the bundler + i18next's resource store.
const lazyLoaders: Record<Exclude<LocaleCode, 'en'>, () => Promise<{ default: Record<string, unknown> }>> = {
  de: () => import('./locales/de.json'),
  ru: () => import('./locales/ru.json'),
  zh: () => import('./locales/zh.json'),
  ko: () => import('./locales/ko.json'),
  ja: () => import('./locales/ja.json'),
  it: () => import('./locales/it.json'),
  tr: () => import('./locales/tr.json'),
  es: () => import('./locales/es.json'),
  el: () => import('./locales/el.json'),
  uk: () => import('./locales/uk.json'),
  fr: () => import('./locales/fr.json'),
}

async function ensureLoaded(lng: string): Promise<void> {
  if (lng === 'en') return
  if (!(lng in lazyLoaders)) return
  if (i18n.hasResourceBundle(lng, 'translation')) return
  const loader = lazyLoaders[lng as Exclude<LocaleCode, 'en'>]
  const mod = await loader()
  i18n.addResourceBundle(lng, 'translation', mod.default, true, true)
}

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
    // Only ship English resources in the main bundle; the rest get
    // lazy-loaded below. `partialBundledLanguages: true` tells i18next
    // it's expected that some locales arrive after init — no warnings.
    resources: {
      en: { translation: en },
    },
    partialBundledLanguages: true,
  })

// Kick off the detected locale's load eagerly so the initial render can
// resolve real translations instead of falling back to EN for a beat.
void ensureLoaded(i18n.language)

// Any subsequent language switch (LanguageSwitcher click) triggers the
// async load + adds it to the i18next bundle.
i18n.on('languageChanged', (lng) => {
  void ensureLoaded(lng)
})

// Keep <html lang> in sync with i18next so screen readers and the browser's
// own translation prompt pick the right locale. Without this, the document
// stays at whatever <html lang="…"> was in the static template (currently "de")
// regardless of what the user actually sees.
const syncHtmlLang = (lng: string) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng.split('-')[0] ?? 'en'
  }
}
syncHtmlLang(i18n.language || 'en')
i18n.on('languageChanged', syncHtmlLang)

/**
 * Public hook for explicitly preloading a locale before switching to it —
 * the LanguageSwitcher can call this on hover/focus so the JSON is already
 * cached by the time the user clicks.
 */
export function preloadLocale(lng: LocaleCode): Promise<void> {
  return ensureLoaded(lng)
}

export default i18n
