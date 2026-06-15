/**
 * Rewrites the size segment of a TMDB image URL (e.g. `/t/p/original/x.jpg` →
 * `/t/p/w300/x.jpg`). Used to shrink images on weak TV hardware where decoding
 * full-size JPEGs tanks FPS. No-op for non-TMDB URLs.
 */
export const resizeTmdbImage = (url: string | undefined | null, size: string): string => {
  if (!url) return url || "";
  return url.replace(/\/t\/p\/(w\d+|h\d+|original)\//, `/t/p/${size}/`);
};

/**
 * Извлекает теги качества, источника, HDR и года выпуска из строки названия раздачи.
 */
export const extractBadges = (title: string): string[] => {
  const badges: string[] = [];
  const lowercase = title.toLowerCase();

  // 1. Качество
  if (lowercase.includes("2160p") || lowercase.includes("4k")) {
    badges.push("2160p");
  } else if (lowercase.includes("1080p")) {
    badges.push("1080p");
  } else if (lowercase.includes("720p")) {
    badges.push("720p");
  }

  // 2. Источник
  const sources = ["web-dl", "webrip", "bluray", "bdrip", "hdrip", "dvdrip"];
  for (const s of sources) {
    if (lowercase.includes(s)) {
      badges.push(s.toUpperCase());
      break;
    }
  }

  // 3. HDR / Dolby Vision
  if (lowercase.includes("hdr")) {
    badges.push("HDR");
  } else if (lowercase.includes("dolby vision") || lowercase.includes(" dv ")) {
    badges.push("DV");
  }

  // 4. Год
  const yearMatch = title.match(/\b(19\d\d|20[0-2]\d)\b/);
  if (yearMatch) {
    badges.push(yearMatch[0]);
  }

  return badges;
};
