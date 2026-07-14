import { useCallback, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { isHlsPlayback } from "../utils/hls/hlsPlaybackUtils";
import type { ActivePlayback } from "../context/playbackTypes";

export function usePlayerVideoError(
  playback: ActivePlayback,
  videoRef: RefObject<HTMLVideoElement | null>,
  setPlayerError: (error: string | null) => void,
  setIsMetadataLoading: (loading: boolean) => void,
  handleRefreshStream: () => void,
) {
  const { t } = useTranslation("player");

  return useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isHlsPlayback(playback, playback.streamUrl)) return;

    fetch(playback.streamUrl, { method: "HEAD" })
      .then((res) => {
        if (res.status === 403 || res.status === 401) setPlayerError(t("playback.accessRestricted"));
        else if (res.status === 410) handleRefreshStream();
        else setPlayerError(t("playback.loadFailed"));
      })
      .catch(() => setPlayerError(t("playback.loadFailed")))
      .finally(() => setIsMetadataLoading(false));
  }, [playback, videoRef, setPlayerError, setIsMetadataLoading, handleRefreshStream, t]);
}