import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { ActivePlayback } from "../context/playbackTypes";

interface UsePlayerLoadingStateParams {
  isMetadataLoading: boolean;
  playback: ActivePlayback;
  connected: number | null;
  bytesPerSec: number | null;
  isMetadataFetched: boolean;
  hasProgressSince: number | null;
}

export function usePlayerLoadingState({
  isMetadataLoading,
  playback,
  connected,
  bytesPerSec,
  isMetadataFetched,
  hasProgressSince,
}: UsePlayerLoadingStateParams) {
  const { t } = useTranslation("player");

  return useMemo(() => {
    if (!isMetadataLoading) return null;
    if (!playback.requiresBuffering) {
      return { title: t("loading.init.title"), subtitle: t("loading.init.loadingStream"), step: 4 };
    }
    if (connected === null || connected === 0) {
      return { title: t("loading.peers.title"), subtitle: t("loading.peers.subtitle"), step: 1 };
    }
    if (!isMetadataFetched && !(hasProgressSince && Date.now() - hasProgressSince > 3000)) {
      return {
        title: t("loading.preparing.title"),
        subtitle: t("loading.preparing.subtitle", {
          peers: connected,
          speed: (bytesPerSec ? bytesPerSec / 1024 / 1024 : 0).toFixed(1),
        }),
        step: 2,
      };
    }
    if (!isMetadataFetched) {
      return { title: t("loading.tracks.title"), subtitle: t("loading.tracks.subtitle"), step: 3 };
    }
    return { title: t("loading.init.title"), subtitle: t("loading.init.subtitle"), step: 4 };
  }, [isMetadataLoading, playback.requiresBuffering, connected, bytesPerSec, isMetadataFetched, hasProgressSince, t]);
}