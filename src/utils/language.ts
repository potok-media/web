import { Storage } from "./StorageService";

/** Persisted UI + TMDB content language (shared across i18n, API, formatters). */
export const LANGUAGE_STORAGE_KEY = "language";

export const SOURCE_LANGUAGE = "en";

/**
 * Resolve the initial language: saved preference → browser language → English.
 * `available` must list committed locale codes (e.g. from import.meta.glob).
 */
export function detectInitialLanguage(available: readonly string[]): string {
  const saved = Storage.get<string>(LANGUAGE_STORAGE_KEY, "");
  if (saved && available.includes(saved)) return saved;

  const nav =
    typeof navigator !== "undefined" && navigator.language
      ? navigator.language.split("-")[0]
      : "";
  if (nav && available.includes(nav)) return nav;

  return SOURCE_LANGUAGE;
}

/** Read the persisted language code (single source of truth after bootstrap). */
export function getActiveLanguage(): string {
  return Storage.get<string>(LANGUAGE_STORAGE_KEY, SOURCE_LANGUAGE);
}

/** Persist language and keep every consumer in sync. */
export function persistLanguage(language: string): void {
  Storage.set(LANGUAGE_STORAGE_KEY, language);
}

/**
 * Bootstrap storage on first launch so API/formatters match i18n detection
 * before the user opens Settings.
 */
export function bootstrapLanguageIfNeeded(
  resolved: string,
  available: readonly string[],
): string {
  const saved = Storage.get<string>(LANGUAGE_STORAGE_KEY, "");
  if (saved && available.includes(saved)) return saved;
  persistLanguage(resolved);
  return resolved;
}

/** Locale tag for Intl / toLocaleDateString (BCP-47 base code is sufficient). */
export function toIntlLocale(language = getActiveLanguage()): string {
  return language || SOURCE_LANGUAGE;
}