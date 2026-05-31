/**
 * Преобразует число байт в понятную человеку строку размера с русскими обозначениями.
 * Например: 16298319 -> "15,54 МБ"
 */
export const formatBytes = (bytes?: number): string => {
  if (bytes === undefined || bytes === null || bytes === 0) return "";
  const k = 1024;
  const sizes = ["Б", "КБ", "МБ", "ГБ", "ТБ"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = bytes / Math.pow(k, i);
  return `${val.toFixed(2).replace(".", ",")} ${sizes[i]}`;
};

/**
 * Возвращает правильную форму существительного во множественном числе для русских числительных.
 */
export const getPluralForm = (num: number, forms: [string, string, string]): string => {
  const n = Math.abs(num) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return forms[2];
  if (n1 > 1 && n1 < 5) return forms[1];
  if (n1 === 1) return forms[0];
  return forms[2];
};

/**
 * Преобразует ISO дату в относительное время на русском языке (например: "2 дня назад").
 */
export const formatPublishDate = (dateStr?: string): string => {
  if (!dateStr) return "";
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return dateStr;
  }
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);
  const diffMonths = Math.floor(diffDays / 30.4);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSec < 60) {
    return "только что";
  }
  if (diffMin < 60) {
    return `${diffMin} ${getPluralForm(diffMin, ["минуту", "минуты", "минут"])} назад`;
  }
  if (diffHrs < 24) {
    return `${diffHrs} ${getPluralForm(diffHrs, ["час", "часа", "часов"])} назад`;
  }
  if (diffDays < 30) {
    return `${diffDays} ${getPluralForm(diffDays, ["день", "дня", "дней"])} назад`;
  }
  if (diffMonths < 12) {
    return `${diffMonths} ${getPluralForm(diffMonths, ["месяц", "месяца", "месяцев"])} назад`;
  }
  return `${diffYears} ${getPluralForm(diffYears, ["год", "года", "лет"])} назад`;
};

/**
 * Преобразует относительную строку даты в числовой timestamp для сортировки.
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
