import type { RefObject } from "react";
import type Hls from "hls.js";
import type { ActivePlayback } from "../../context/playbackTypes";
import { getFileExtension } from "../playerHelpers";
import { logger } from "../logger";

const NATIVE_EXTENSIONS = ["mp4", "m3u8", "webm", "ogg", "mp3", "wav", "mpd", "m4v", "m4a"];

export function isSmartTVUserAgent(): boolean {
  return /web0s|webos|tizen|smarttv|smart-tv|lg|samsung/i.test(navigator.userAgent);
}

export function isHlsPlayback(playback: ActivePlayback, streamUrl: string): boolean {
  // streamType is authoritative — the plugin declares it in the descriptor. The `.m3u8` check is a
  // provider-neutral fallback (the standard HLS playlist extension) for descriptors that omit streamType.
  // The old `/hls/` sniff was a TorrentGo URL convention and was removed so the player stays provider-agnostic.
  return (
    playback.streamType === "m3u8" ||
    playback.streamType === "hls" ||
    (!playback.streamType && streamUrl.includes(".m3u8"))
  );
}

export function getUnsupportedNativeFormatError(streamUrl: string): string | null {
  const ext = getFileExtension(streamUrl);
  if (ext && !NATIVE_EXTENSIONS.includes(ext)) {
    return `Формат файла (.${ext}) не поддерживается вашим браузером. Пожалуйста, откройте видео во внешнем плеере (VLC, Infuse) или воспользуйтесь Smart TV.`;
  }
  return null;
}

export function getPlaybackResumePosition(playback: ActivePlayback): number {
  const resumeKey = `potok_playback_resume:${playback.id}:${playback.season ?? 0}:${playback.episode ?? 0}`;
  const savedResume = localStorage.getItem(resumeKey);
  if (!savedResume) return 0;
  const parsed = Number(savedResume);
  return !Number.isNaN(parsed) && parsed > 0 ? parsed : 0;
}

export function teardownVideoAndHls(
  videoRef: RefObject<HTMLVideoElement | null>,
  hlsRef: RefObject<Hls | null>,
  bumpSession: () => void,
): void {
  bumpSession();
  const video = videoRef.current;
  if (video) {
    try {
      video.pause();
      video.src = "";
      video.removeAttribute("src");
      video.load();
    } catch (e) {
      logger.error("[useHlsPlayer] Video teardown error:", e);
    }
  }
  if (hlsRef.current) {
    try {
      hlsRef.current.destroy();
    } catch (e) {
      logger.error("[useHlsPlayer] Hls destroy error:", e);
    }
    hlsRef.current = null;
  }
}