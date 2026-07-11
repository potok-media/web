import type { TFunction } from "i18next";

/** Reads the structured `sections` object for a wiki page from the i18n bundle. */
export function getWikiSections<T>(t: TFunction<"wiki">, pageKey: string): T {
  return t(`pages.${pageKey}.sections`, { returnObjects: true }) as T;
}
