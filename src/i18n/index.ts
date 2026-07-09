import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import type { BackendModule, ReadCallback } from "i18next";
import enTranslations from "./locales/en.json";
import {
  bootstrapLanguageIfNeeded,
  detectInitialLanguage,
  persistLanguage,
  SOURCE_LANGUAGE,
} from "../utils/language";

export { LANGUAGE_STORAGE_KEY, SOURCE_LANGUAGE } from "../utils/language";

// Lazy loaders for every committed locale file. Vite code-splits each into its own chunk;
// the active non-source language is fetched on demand from our OWN origin (no third party).
const localeLoaders = import.meta.glob("./locales/*.json") as Record<
  string,
  () => Promise<{ default: Record<string, unknown> }>
>;

const codeFromPath = (path: string) => path.replace("./locales/", "").replace(".json", "");

/** Available languages are derived from the committed locale files — no env, no manual list. */
export const AVAILABLE_LANGUAGES = Object.keys(localeLoaders)
  .map(codeFromPath)
  .sort((a, b) =>
    a === SOURCE_LANGUAGE ? -1 : b === SOURCE_LANGUAGE ? 1 : a.localeCompare(b)
  );

/** Namespaces = top-level keys of the source file (grow as strings are migrated). */
export const NAMESPACES = Object.keys(enTranslations);

const RTL_LANGUAGES = new Set(["ar", "he", "fa", "ur"]);

const initialLanguage = bootstrapLanguageIfNeeded(
  detectInitialLanguage(AVAILABLE_LANGUAGES),
  AVAILABLE_LANGUAGES,
);

// One memoized load per language (whole file), sliced by namespace for i18next.
const fileCache = new Map<string, Promise<Record<string, unknown>>>();
function loadLanguageFile(lng: string): Promise<Record<string, unknown>> {
  const cached = fileCache.get(lng);
  if (cached) return cached;

  const loader = localeLoaders[`./locales/${lng}.json`];
  const promise = loader
    ? loader()
        .then((m) => (m && m.default) || {})
        .catch(() => ({}))
    : Promise.resolve({});

  fileCache.set(lng, promise);
  return promise;
}

/** Count string leaves in a nested object (optionally only non-empty ones). */
function countLeafStrings(obj: unknown, nonEmptyOnly = false): number {
  if (typeof obj === "string") return nonEmptyOnly ? (obj.trim() ? 1 : 0) : 1;
  if (obj && typeof obj === "object") {
    let n = 0;
    for (const v of Object.values(obj as Record<string, unknown>)) {
      n += countLeafStrings(v, nonEmptyOnly);
    }
    return n;
  }
  return 0;
}

const EN_LEAF_COUNT = countLeafStrings(enTranslations);

/**
 * Approximate translation coverage of a language (0–100), relative to the English source.
 * Source/unknown → 100. Used to nudge users of partially-translated languages toward Crowdin.
 */
export async function getLanguageCoverage(lng: string): Promise<number> {
  if (lng === SOURCE_LANGUAGE || EN_LEAF_COUNT === 0) return 100;
  const data = await loadLanguageFile(lng);
  const translated = countLeafStrings(data, true);
  return Math.max(0, Math.min(100, Math.round((translated / EN_LEAF_COUNT) * 100)));
}

const localeBackend: BackendModule = {
  type: "backend",
  init() {
    /* no-op */
  },
  read(language: string, namespace: string, callback: ReadCallback) {
    loadLanguageFile(language)
      .then((data) => callback(null, (data && data[namespace]) || {}))
      // Never hard-reject — fall back to empty so i18next uses fallbackLng/bundled en.
      .catch(() => callback(null, {}));
  },
};

/** Reflect the active language on <html lang> / <html dir> (a11y + RTL-ready). */
function applyDocumentLanguage(lng: string): void {
  if (typeof document === "undefined") return;
  document.documentElement.lang = lng;
  document.documentElement.dir = RTL_LANGUAGES.has(lng) ? "rtl" : "ltr";
}

i18next
  .use(localeBackend)
  .use(initReactI18next)
  .init({
    lng: initialLanguage,
    fallbackLng: SOURCE_LANGUAGE,
    supportedLngs: AVAILABLE_LANGUAGES,
    load: "languageOnly",
    ns: NAMESPACES,
    defaultNS: "common",
    // Lets the eagerly-bundled English source coexist with lazily-loaded languages.
    partialBundledLanguages: true,
    interpolation: { escapeValue: false }, // React already escapes
    returnEmptyString: false, // never blank the UI on an empty value
    react: { useSuspense: true },
  });

// Bundle the English source eagerly: the fallback language must always resolve with zero
// network, and the first paint must never flash raw keys.
for (const ns of NAMESPACES) {
  i18next.addResourceBundle(
    SOURCE_LANGUAGE,
    ns,
    (enTranslations as Record<string, unknown>)[ns],
    true,
    false
  );
}

i18next.on("languageChanged", (lng: string) => {
  persistLanguage(lng);
  applyDocumentLanguage(lng);
});
applyDocumentLanguage(i18next.language || SOURCE_LANGUAGE);

export const i18n = i18next;
export default i18next;
