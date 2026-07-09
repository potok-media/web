import type { GenericEpisodeItem } from "./types";

export const getStreamType = (ep: GenericEpisodeItem): string => {
  const url = ep.url || ep.audios?.[0]?.url || "";
  if (url.includes(".mpd")) return "DASH";
  if (url.includes(".m3u8")) return "HLS";
  const match = url.match(/\.[a-zA-Z0-9]{2,5}$/);
  return match ? match[0].replace(".", "").toUpperCase() : "MP4";
};

export const SENTINEL_KEY = "_";