import { useCallback, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { isHlsPlayback } from "../utils/hls/hlsPlaybackUtils";
import { getCurrentPlaylistItem } from "../context/playbackTypes";
import type { ActivePlayback } from "../context/playbackTypes";

/**
 * Fatal <video> error path for non-HLS sources. R1: there is no refresh/re-resolve — a dead
 * link is a dead link; the overlay shows the failure. (hls.js keeps its own recoverMediaError
 * hygiene internally.)
 */
export function usePlayerVideoError(
  playback: ActivePlayback,
  videoRef: RefObject<HTMLVideoElement | null>,
  setPlayerError: (error: string | null) => void,
  setIsMetadataLoading: (loading: boolean) => void,
) {
  const { t } = useTranslation("player");

  return useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const currentItem = getCurrentPlaylistItem(playback);
    const streamUrl = currentItem?.streamUrl ?? "";
    if (!streamUrl || isHlsPlayback(playback, streamUrl)) return;

    fetch(streamUrl, { method: "HEAD" })
      .then((res) => {
        if (res.status === 403 || res.status === 401) setPlayerError(t("playback.accessRestricted"));
        else setPlayerError(t("playback.loadFailed"));
      })
      .catch(() => setPlayerError(t("playback.loadFailed")))
      .finally(() => setIsMetadataLoading(false));
  }, [playback, videoRef, setPlayerError, setIsMetadataLoading, t]);
}
