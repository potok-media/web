import type { ActivePlayback } from "../context/playbackTypes";

function transliterate(word: string): string {
  const converter: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
    и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
    с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch",
    ь: "", ы: "y", ъ: "", э: "e", ю: "yu", я: "ya",
    А: "A", Б: "B", В: "V", Г: "G", Д: "D", Е: "E", Ё: "E", Ж: "Zh", З: "Z",
    И: "I", Й: "Y", К: "K", Л: "L", М: "M", Н: "N", О: "O", П: "P", Р: "R",
    С: "S", Т: "T", У: "U", Ф: "F", Х: "H", Ц: "C", Ч: "Ch", Ш: "Sh", Щ: "Sch",
    Ь: "", Ы: "Y", Ъ: "", Э: "E", Ю: "Yu", Я: "Ya",
  };

  return word
    .split("")
    .map((char) => (converter[char] !== undefined ? converter[char] : char))
    .join("");
}

/** Build a clean filename URL for external players (Infuse). */
export function cleanStreamUrlForExternalPlayer(playback: ActivePlayback): string {
  let url = playback.streamUrl;

  const queryIndex = url.indexOf("?");
  if (queryIndex !== -1) {
    url = url.substring(0, queryIndex);
  }

  const lastSlashIndex = url.lastIndexOf("/");
  if (lastSlashIndex === -1) {
    return url;
  }

  const basePath = url.substring(0, lastSlashIndex + 1);
  const originalFilename = url.substring(lastSlashIndex + 1);

  const extMatch = originalFilename.match(/\.([a-zA-Z0-9]{2,5})$/);
  const ext = extMatch ? extMatch[1] : "mp4";

  let englishTitle = playback.englishTitle || playback.originalTitle || playback.title || "";
  englishTitle = transliterate(englishTitle);
  englishTitle = englishTitle
    .replace(/[^a-zA-Z0-9\s.\-_]/g, "")
    .trim()
    .replace(/[\s\-_]+/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\.+|\.+$/g, "");

  if (!englishTitle) {
    englishTitle = "Video";
  }

  let snEn = "";
  if (playback.mediaType === "tv") {
    const s = playback.season !== undefined ? playback.season : 1;
    const e = playback.episode !== undefined ? playback.episode : 1;
    snEn = `S${String(s).padStart(2, "0")}E${String(e).padStart(2, "0")}.`;
  }

  const tmdbStr = playback.id ? `{tmdb-${playback.id}}.` : "";
  const cleanFilename = `${englishTitle}.${snEn}${tmdbStr}${ext}`;

  return basePath + cleanFilename;
}