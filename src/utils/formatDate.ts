import { toIntlLocale } from "./language";

export interface LocalizedDateOptions {
  weekday?: "long" | "short" | "narrow";
  day?: "numeric" | "2-digit";
  month?: "numeric" | "2-digit" | "long" | "short" | "narrow";
  year?: "numeric" | "2-digit";
}

/** Format an ISO/date string using the active UI language. */
export function formatLocalizedDate(
  dateInput: string | Date,
  options: LocalizedDateOptions,
  locale?: string,
): string {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString(toIntlLocale(locale), options);
}