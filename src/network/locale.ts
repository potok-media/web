import { SettingsService } from "../utils/SettingsService";

/**
 * Shared source for the `?language=` param on hydrated list fetches (ApiClient, SyncApiClient,
 * serverUserData). Centralized so every server-driven list asks TMDB-backed hydration for the
 * same locale the UI is displaying in.
 */
export function getRequestLanguage(): string {
  return SettingsService.getLanguage();
}

/** Appends `language` to a request path, preserving an existing query string. */
export function withLanguageParam(path: string, language: string = getRequestLanguage()): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}language=${encodeURIComponent(language)}`;
}
