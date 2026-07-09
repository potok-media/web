import { useCallback, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { ApiClient } from "../network/ApiClient";
import { getProxyUrl } from "../utils/playerHelpers";
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
    const isHls =
      playback.streamType === "m3u8" ||
      playback.streamType === "hls" ||
      (!playback.streamType &&
        (playback.streamUrl.includes(".m3u8") || playback.streamUrl.includes("/hls/")));
    if (isHls) return;

    const diagnosticUrl = getProxyUrl(playback.streamUrl, ApiClient.baseURL, playback.headers);
    fetch(diagnosticUrl, { method: "HEAD" })
      .then((res) => {
        if (res.status === 403 || res.status === 401) setPlayerError(t("playback.accessRestricted"));
        else if (res.status === 410) handleRefreshStream();
        else setPlayerError(t("playback.loadFailed"));
      })
      .catch(() => setPlayerError(t("playback.loadFailed")))
      .finally(() => setIsMetadataLoading(false));
  }, [playback, videoRef, setPlayerError, setIsMetadataLoading, handleRefreshStream, t]);
}