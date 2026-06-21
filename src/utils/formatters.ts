import { Storage } from "./StorageService";

/** Active UI locale, read from storage (worker-safe — no React/i18n dependency here). */
function currentLocale(): string {
  return Storage.get<string>("language", "en");
}

const BYTE_UNITS = ["byte", "kilobyte", "megabyte", "gigabyte", "terabyte"] as const;

/**
 * Human-readable byte size, localized via Intl (unit name + decimal separator per locale).
 * e.g. 16298319 -> "15.54 MB" (en) / "15,54 МБ" (ru)
 */
export const formatBytes = (bytes?: number): string => {
  if (bytes === undefined || bytes === null || bytes === 0) return "";
  const k = 1024;
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), BYTE_UNITS.length - 1);
  const val = bytes / Math.pow(k, i);
  return new Intl.NumberFormat(currentLocale(), {
    style: "unit",
    unit: BYTE_UNITS[i],
    unitDisplay: "short",
    maximumFractionDigits: 2,
  }).format(val);
};

/**
 * ISO date -> localized relative time. Intl.RelativeTimeFormat handles plural forms and the
 * "ago"/"назад" wording natively for every locale, so no manual plural tables are needed.
 */
export const formatPublishDate = (dateStr?: string): string => {
  if (!dateStr) return "";

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);
  const diffMonths = Math.floor(diffDays / 30.4);
  const diffYears = Math.floor(diffDays / 365);

  const rtf = new Intl.RelativeTimeFormat(currentLocale(), { numeric: "auto" });
  if (diffSec < 60) return rtf.format(-diffSec, "second");
  if (diffMin < 60) return rtf.format(-diffMin, "minute");
  if (diffHrs < 24) return rtf.format(-diffHrs, "hour");
  if (diffDays < 30) return rtf.format(-diffDays, "day");
  if (diffMonths < 12) return rtf.format(-diffMonths, "month");
  return rtf.format(-diffYears, "year");
};

/**
 * Parse a relative date STRING coming from the backend/scrapers into a timestamp for sorting.
 * This intentionally stays locale-independent: it parses server-provided Russian relative
 * strings (data), not UI copy. If the backend ever localizes these, revisit this parser.
 */
export const parseRelativeDate = (relStr?: string): number => {
  if (!relStr) return 0;
  const parsedTime = Date.parse(relStr);
  if (!isNaN(parsedTime)) {
    return parsedTime;
  }
  const now = Date.now();
  const match = relStr.match(/(\d+)\s+(минут|минуту|минуты|час|часа|часов|день|дня|дней|месяц|месяца|месяцев|год|года|лет)/i);
  if (!match) return now;
  const num = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  let ms = 1000 * 60; // 1 minute
  if (unit.startsWith("час")) ms = 1000 * 60 * 60;
  else if (unit.startsWith("ден") || unit.startsWith("дня") || unit.startsWith("дне")) ms = 1000 * 60 * 60 * 24;
  else if (unit.startsWith("мес")) ms = 1000 * 60 * 60 * 24 * 30;
  else if (unit.startsWith("год") || unit.startsWith("лет")) ms = 1000 * 60 * 60 * 24 * 365;

  return now - num * ms;
};
