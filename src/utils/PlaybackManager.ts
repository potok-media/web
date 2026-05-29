import { ApiClient } from "../network/ApiClient";
import type { TorrentSearchResult, TorrentFileItem, MediaCard } from "../network/ApiClient";
import type { ActivePlayback } from "../context/AppSettingsContext";
import { TorrentParser } from "./TorrentParser";

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

  const hash = ApiClient.getHashFromMagnet(torrent.magnetUri || "") || 
               ApiClient.getHashFromMagnet(torrent.link || "") || 
               torrent.id || 
               "";
  const tgUrl = ApiClient.torrentGoURL.trim();
  if (!tgUrl) {
    showHUD("error", "Адрес торрент-плеера не настроен.");
    return;
  }

  // Common parameters for URL generation
  const urlParams = {
    baseUrl: tgUrl,
    hash,
    index: file.id,
    originalPath: file.path,
    mediaType: mediaItem.mediaType,
    season: file.season,
    episode: file.episode,
    englishTitle: mediaItem.englishTitle,
    originalTitle: mediaItem.originalTitle,
    title: mediaItem.title,
    tmdbId: mediaItem.id,
  };

  if (defaultPlayer === "infuse") {
    try {
      const streamUrl = TorrentParser.generateStreamUrl(urlParams);
      const encodedUrl = encodeURIComponent(streamUrl);

      triggerCustomProtocol(`infuse://x-callback-url/play?url=${encodedUrl}`);
      showHUD("success", "Открываем в Infuse!");
    } catch (err: unknown) {
      showHUD("error", "Ошибка Infuse: " + (err instanceof Error ? err.message : String(err)));
    }
  } else {
    // Native built-in web player!
    try {
      let streamUrl = TorrentParser.generateStreamUrl(urlParams);
      
      const ext = TorrentParser.getFileExtension(file.path);
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
