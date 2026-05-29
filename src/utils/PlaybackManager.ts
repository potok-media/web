import { ApiClient } from "../network/ApiClient";
import type { TorrentSearchResult, TorrentFileItem, MediaCard } from "../network/ApiClient";
import type { ActivePlayback } from "../context/AppSettingsContext";


interface PlayPlaybackParams {
  defaultPlayer?: string;
  torrent: TorrentSearchResult;
  file: TorrentFileItem;
  mediaItem: MediaCard;
  showHUD: (type: "success" | "error" | "info", msg: string) => void;
  playVideo: (playback: ActivePlayback) => void;
}

export async function playTorrentFile({
  defaultPlayer,
  torrent,
  file,
  mediaItem,
  showHUD,
  playVideo,
}: PlayPlaybackParams): Promise<void> {
  showHUD("info", "Готовим ссылку на стрим...");

  const hash = torrent.id || torrent.magnetUri || "";
  const tgUrl = ApiClient.torrentGoURL.trim();
  if (!tgUrl) {
    showHUD("error", "Адрес торрент-плеера не настроен.");
    return;
  }

  if (defaultPlayer === "infuse") {
    try {
      let ext = ".mkv";
      const originalPath = file.path || "";
      if (originalPath) {
        const match = originalPath.match(/\.[a-zA-Z0-9]{2,5}$/);
        if (match) {
          ext = match[0];
        }
      }

      const rawTitle = mediaItem.englishTitle || mediaItem.originalTitle || mediaItem.title || "";
      let cleanTitle = rawTitle.replace(/[^a-zA-Z0-9]+/g, ".").replace(/\.{2,}/g, ".").replace(/^\.|\.$/g, "");
      if (!cleanTitle) {
        cleanTitle = "Media";
      }

      const idTag = mediaItem.id ? `.{tmdb-${mediaItem.id}}` : "";
      let fileName = cleanTitle;

      const isTv = mediaItem.mediaType === "tv" || file.season !== undefined;
      if (isTv) {
        const s = String(file.season ?? 1).padStart(2, "0");
        const e = String(file.episode ?? 1).padStart(2, "0");
        fileName = `${cleanTitle}.S${s}E${e}${idTag}${ext}`;
      } else {
        fileName = `${cleanTitle}${idTag}${ext}`;
      }

      const cleanBase = tgUrl.replace(/\/+$/, "");
      const streamUrl = `${cleanBase}/stream/${hash.toLowerCase()}/${file.id}/${fileName}`;
      const encodedUrl = encodeURIComponent(streamUrl);

      triggerCustomProtocol(`infuse://x-callback-url/play?url=${encodedUrl}`);
      showHUD("success", "Открываем в Infuse!");
    } catch (err: unknown) {
      showHUD("error", "Ошибка Infuse: " + (err instanceof Error ? err.message : String(err)));
    }
  } else {
    // Native built-in web player!
    try {
      let ext = ".mkv";
      const originalPath = file.path || "";
      if (originalPath) {
        const match = originalPath.match(/\.[a-zA-Z0-9]{2,5}$/);
        if (match) {
          ext = match[0];
        }
      }

      const rawTitle = mediaItem.englishTitle || mediaItem.originalTitle || mediaItem.title || "";
      let cleanTitle = rawTitle.replace(/[^a-zA-Z0-9]+/g, ".").replace(/\.{2,}/g, ".").replace(/^\.|\.$/g, "");
      if (!cleanTitle) {
        cleanTitle = "Media";
      }

      const idTag = mediaItem.id ? `.{tmdb-${mediaItem.id}}` : "";
      let fileName = cleanTitle;

      const isTv = mediaItem.mediaType === "tv" || file.season !== undefined;
      if (isTv) {
        const s = String(file.season ?? 1).padStart(2, "0");
        const e = String(file.episode ?? 1).padStart(2, "0");
        fileName = `${cleanTitle}.S${s}E${e}${idTag}${ext}`;
      } else {
        fileName = `${cleanTitle}${idTag}${ext}`;
      }

      const cleanBase = tgUrl.replace(/\/+$/, "");
      let streamUrl = `${cleanBase}/stream/${hash.toLowerCase()}/${file.id}/${fileName}`;
      if (ext.toLowerCase() === ".mkv") {
        streamUrl += "?remux=true";
      }

      playVideo({
        streamUrl,
        title: mediaItem.title,
        mediaType: mediaItem.mediaType,
        id: mediaItem.id,
        season: file.season,
        episode: file.episode,
        torrentHash: hash,
      });
      showHUD("success", "Запускаем встроенный плеер...");
    } catch (err: unknown) {
      showHUD("error", "Ошибка запуска плеера: " + (err instanceof Error ? err.message : String(err)));
    }
  }
}

// Triggers custom desktop protocol schemes (infuse://) inside a hidden iframe
// to prevent the browser from starting its unload sequence, which cancels active SSE streams and pending requests.
const triggerCustomProtocol = (url: string) => {
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = url;
  document.body.appendChild(iframe);
  setTimeout(() => {
    if (iframe.parentNode) {
      document.body.removeChild(iframe);
    }
  }, 100);
};
