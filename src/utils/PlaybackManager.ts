import { ApiClient } from "../network/ApiClient";
import type { TorrentSearchResult, TorrentFileItem, MediaCard } from "../network/ApiClient";


interface PlayPlaybackParams {
  defaultPlayer?: string;
  torrent: TorrentSearchResult;
  file: TorrentFileItem;
  mediaItem: MediaCard;
  showHUD: (type: "success" | "error" | "info", msg: string) => void;
}

export async function playTorrentFile({
  defaultPlayer,
  torrent,
  file,
  mediaItem,
  showHUD,
}: PlayPlaybackParams): Promise<void> {
  showHUD("info", "Готовим ссылку на стрим...");

  const hash = torrent.id || torrent.magnetUri || "";
  const tgUrl = ApiClient.torrentGoURL.trim();
  if (!tgUrl) {
    showHUD("error", "Адрес торрент-плеера не настроен.");
    return;
  }

  if (defaultPlayer === "infuse") {
    // Infuse requires saving stream first and getting playable links
    try {
      const streams = await ApiClient.saveInfuseItemAndGetStreams({
        hash,
        index: file.id,
        originalPath: file.path || "",
        title: mediaItem.title,
        mediaType: mediaItem.mediaType,
        tmdbId: mediaItem.id,
        season: file.season,
        episode: file.episode,
        originalTitle: mediaItem.originalTitle,
        poster: mediaItem.posterSrc,
        link: torrent.link,
        magnetUri: torrent.magnetUri,
      });
      if (streams && streams.length > 0) {
        triggerCustomProtocol(`infuse://x-callback-url/play?url=${encodeURIComponent(streams[0])}`);
        showHUD("success", "Открываем в Infuse!");
      } else {
        showHUD("error", "Infuse: Ссылка пуста");
      }
    } catch (err: unknown) {
      showHUD("error", "Ошибка Infuse: " + (err instanceof Error ? err.message : String(err)));
    }
  } else {
    // Native built-in player placeholder
    showHUD("info", "Встроенный веб-плеер находится в разработке.");
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
