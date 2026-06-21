import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import type { BackendModule, ReadCallback } from "i18next";
import { Storage } from "../utils/StorageService";
import enTranslations from "./locales/en.json";

/** Persisted settings key for the chosen language (shared with AppSettingsContext). */
export const LANGUAGE_STORAGE_KEY = "language";

/** Source / base / fallback language — always complete, always the last-resort fallback. */
export const SOURCE_LANGUAGE = "en";

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

/** Active language: persisted choice → browser/system language → English. */
function detectInitialLanguage(): string {
  const saved = Storage.get<string>(LANGUAGE_STORAGE_KEY, "");
  if (saved && AVAILABLE_LANGUAGES.includes(saved)) return saved;

  const nav =
    typeof navigator !== "undefined" && navigator.language
      ? navigator.language.split("-")[0]
      : "";
  if (nav && AVAILABLE_LANGUAGES.includes(nav)) return nav;

  return SOURCE_LANGUAGE;
}

// One memoized load per language (whole file), sliced by namespace for i18next.
const fileCache = new Map<string, Promise<Record<string, any>>>();
function loadLanguageFile(lng: string): Promise<Record<string, any>> {
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
    lng: detectInitialLanguage(),
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

i18next.on("languageChanged", applyDocumentLanguage);
applyDocumentLanguage(i18next.language || SOURCE_LANGUAGE);

export const i18n = i18next;
export default i18next;
