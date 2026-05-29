import type { TorrentFileItem } from "../network/ApiClient";

export interface TorrentFileEpisodeInfo {
  episode?: number;
  season?: number;
  isSerial: boolean;
}

export class TorrentParser {
  private static regexps: { regex: RegExp; keys: string[] }[] = [
    { regex: /\bs(\d+)\.?ep?(\d+)\b/i, keys: ["season", "episode"] },
    { regex: /\b(\d{1,2})[x-](\d+)\b/i, keys: ["season", "episode"] },
    { regex: /\bs(\d{2})(\d{2,3})\b/i, keys: ["season", "episode"] },
    { regex: /season (\d+) episode (\d+)/i, keys: ["season", "episode"] },
    { regex: /сезон (\d+) серия (\d+)/i, keys: ["season", "episode"] },
    { regex: /(\d+) season (\d+) episode/i, keys: ["season", "episode"] },
    { regex: /(\d+) сезон (\d+) серия/i, keys: ["season", "episode"] },
    { regex: /episode (\d+)/i, keys: ["episode"] },
    { regex: /серия (\d+)/i, keys: ["episode"] },
    { regex: /(\d+) episode/i, keys: ["episode"] },
    { regex: /(\d+) серия/i, keys: ["episode"] },
    { regex: /season (\d+)/i, keys: ["season"] },
    { regex: /сезон (\d+)/i, keys: ["season"] },
    { regex: /(\d+) season/i, keys: ["season"] },
    { regex: /(\d+) сезон/i, keys: ["season"] },
    { regex: /\bs(\d+)\b/i, keys: ["season"] },
    { regex: /\bep?\.?(\d+)\b/i, keys: ["episode"] },
    { regex: /\b(\d{1,3}) of (\d+)\b/i, keys: ["episode"] },
    { regex: /\b(\d{1,3}) из (\d+)\b/i, keys: ["episode"] },
    { regex: / - (\d{1,3})\b/i, keys: ["episode"] },
    { regex: /\[(\d{1,3})\]/i, keys: ["episode"] },
    { regex: /(\d+) сер/i, keys: ["episode"] }
  ];

  private static folderRegexps: { regex: RegExp; key: string }[] = [
    { regex: /season (\d+)/i, key: "season" },
    { regex: /сезон (\d+)/i, key: "season" },
    { regex: /(\d+) season/i, key: "season" },
    { regex: /(\d+) сезон/i, key: "season" },
    { regex: /\bs(\d+)\b/i, key: "season" },
    { regex: /\btv[ -]?(\d+)\b/i, key: "season" },
    { regex: /\bтв[ -]?(\d+)\b/i, key: "season" }
  ];

  public static parseEpisode(
    path: string,
    mediaType: string,
    numberOfSeasons?: number,
    overrideSeason?: number,
    overrideEpisodeOffset?: number
  ): TorrentFileEpisodeInfo {
    const isSerial = mediaType === "tv" || (numberOfSeasons ?? 0) > 0;
    const info: TorrentFileEpisodeInfo = {
      episode: undefined,
      season: undefined,
      isSerial
    };

    const cleanPath = path.replace(/_/g, " ");
    const parts = cleanPath.split("/");
    const fileName = parts[parts.length - 1] || "";
    const folderName = parts.length > 1 ? parts[parts.length - 2] : "";

    // 1. Parse filename
    for (const { regex, keys } of this.regexps) {
      if (info.season !== undefined && info.episode !== undefined) { break; }
      const match = fileName.match(regex);
      if (match) {
        keys.forEach((key, index) => {
          const valStr = match[index + 1];
          if (valStr) {
            const value = parseInt(valStr, 10);
            if (!isNaN(value)) {
              if (key === "season" && info.season === undefined) {
                info.season = value;
              } else if (key === "episode" && info.episode === undefined) {
                info.episode = value;
              }
            }
          }
        });
      }
    }

    // 2. Parse folder name if season still missing
    if (folderName && info.season === undefined) {
      for (const { regex } of this.folderRegexps) {
        const match = folderName.match(regex);
        if (match && match[1]) {
          const value = parseInt(match[1], 10);
          if (!isNaN(value)) {
            info.season = value;
            break;
          }
        }
      }
    }

    // Default season for non-serials or if missing
    if (info.season === undefined) {
      info.season = isSerial ? undefined : 0;
    }

    // Special case: episode number at the very beginning of filename (e.g. "01.mkv")
    if (info.episode === undefined) {
      const startDigitsMatch = fileName.match(/^(\d{1,3})\b/);
      if (startDigitsMatch && startDigitsMatch[1]) {
        const value = parseInt(startDigitsMatch[1], 10);
        if (!isNaN(value)) {
          info.episode = value;
        }
      }
    }

    // 3. Validate parsed season against TMDB (before overrides!)
    if (numberOfSeasons && numberOfSeasons > 0 && info.season !== undefined && info.season > numberOfSeasons) {
      info.season = undefined; // Trigger manual fix / parsing failure
    }

    // 4. Apply Overrides (User overrides are the absolute source of truth!)
    if (overrideSeason !== undefined && overrideSeason !== null) {
      info.season = overrideSeason;
    }

    if (overrideEpisodeOffset !== undefined && overrideEpisodeOffset !== null && info.episode !== undefined) {
      info.episode = Math.max(1, info.episode + overrideEpisodeOffset);
    }

    return info;
  }

  public static cleanTitles(files: TorrentFileItem[]): TorrentFileItem[] {
    if (files.length <= 1) return files;

    const titles = files.map((f) => (f.title || "").split(" "));
    const firstParts = titles[0];
    if (!firstParts) return files;

    let commonLength = 0;
    while (commonLength < firstParts.length) {
      const part = firstParts[commonLength];
      if (titles.every((t) => t.length > commonLength && t[commonLength] === part)) {
        commonLength++;
      } else {
        break;
      }
    }

    if (commonLength === 0 || commonLength >= firstParts.length) return files;

    return files.map((file, index) => {
      const parts = titles[index];
      if (!parts || parts.length <= commonLength) return file;
      const newTitle = parts.slice(commonLength).join(" ").trim();
      return {
        ...file,
        title: newTitle || file.title
      };
    });
  }

  public static getFileExtension(path?: string): string {
    if (!path) return ".mkv";
    const match = path.match(/\.[a-zA-Z0-9]{2,5}$/);
    return match ? match[0] : ".mkv";
  }

  public static generateStreamUrl(params: {
    baseUrl: string;
    hash: string;
    index: string;
    originalPath?: string;
    mediaType?: string;
    season?: number;
    episode?: number;
    englishTitle?: string;
    originalTitle?: string;
    title?: string;
    tmdbId?: number;
  }): string {
    const ext = this.getFileExtension(params.originalPath);

    const rawTitle = params.englishTitle || params.originalTitle || params.title || "";
    let cleanTitle = rawTitle.replace(/[^a-zA-Z0-9]+/g, ".");
    cleanTitle = cleanTitle.replace(/\.{2,}/g, ".");
    cleanTitle = cleanTitle.replace(/^\.+|\.+$/g, ""); // Trim dots

    if (!cleanTitle) {
      cleanTitle = "Media";
    }

    const idTag = params.tmdbId ? `.{tmdb-${params.tmdbId}}` : "";
    let fileName = cleanTitle;

    if (params.mediaType === "tv") {
      const s = String(params.season ?? 1).padStart(2, "0");
      const e = String(params.episode ?? 1).padStart(2, "0");
      fileName = `${cleanTitle}.S${s}E${e}${idTag}${ext}`;
    } else {
      fileName = `${cleanTitle}${idTag}${ext}`;
    }

    const cleanBase = params.baseUrl.replace(/\/+$/, "");
    return `${cleanBase}/stream/${params.hash.toLowerCase()}/${params.index}/${fileName}`;
  }
}
