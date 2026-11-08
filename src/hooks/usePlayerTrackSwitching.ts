import { playbackStorageKeys, currentItemIdentity } from "../utils/playbackIdentity";
import { inferStreamTypeFromUrl } from "../utils/hls/hlsPlaybackUtils";
import { isPlayableUrl } from "../utils/playableUrl";
import { logger } from "../utils/logger";
import { useMemo, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import type Hls from "hls.js";
import type { ActivePlayback, PlaylistItem } from "../context/playbackTypes";
import { getCurrentPlaylistItem } from "../context/playbackTypes";
import type { AudioPreference } from "../utils/hls/audioPreference";

interface UsePlayerTrackSwitchingParams {
  playback: ActivePlayback;
  videoRef: RefObject<HTMLVideoElement | null>;
  hlsRef: RefObject<Hls | null>;
  seekOffset: number;
  rawLevels: Array<{ id: number; height?: number }>;
  hlsActiveLevel: number;
  setCurrentAudioTrack: (id: number) => void;
  setCurrentQualityLevel: (id: number) => void;
  preferredAudioRef: RefObject<AudioPreference | null>;
  switchPlaybackSource: (patch: {
    streamUrl: string;
    streamType?: PlaylistItem["streamType"];
    voice?: string;
    startAt: number;
  }) => void;
  setPlayerError: (error: string | null) => void;
}

export function usePlayerTrackSwitching({
  playback,
  videoRef,
  hlsRef,
  seekOffset,
  rawLevels,
  hlsActiveLevel,
  setCurrentAudioTrack,
  setCurrentQualityLevel,
  preferredAudioRef,
  switchPlaybackSource,
  setPlayerError,
}: UsePlayerTrackSwitchingParams) {
  const { t } = useTranslation("player");

  // R2/R3: voice candidates live on the CURRENT playlist item only.
  const currentItem = getCurrentPlaylistItem(playback);

  const currentLogicalTime = () => {
    const video = videoRef.current;
    return video ? (seekOffset > 0 ? seekOffset + video.currentTime : video.currentTime) : 0;
  };

  /**
   * Switch the voice by a LOCAL swap (R1): the picked candidate carries its own ready url,
   * which replaces the current item's streamUrl via switchPlaybackSource (an immutable patch
   * of playlist[playlistIndex]). No re-resolve, no network.
   */
  const swapToExternalAudio = (id: number, externalAudio: { name: string; url: string }) => {
    if (!isPlayableUrl(externalAudio.url)) {
      logger.error("[usePlayerTrackSwitching] audio entry has no playable url:", externalAudio.name);
      setPlayerError(t("playback.audioSwitchFailed"));
      return;
    }
    const time = currentLogicalTime();
    const { resumeKey } = playbackStorageKeys(currentItemIdentity(playback));
    localStorage.setItem(resumeKey, time.toString());
    preferredAudioRef.current = { name: externalAudio.name };
    setCurrentAudioTrack(id);
    switchPlaybackSource({
      streamUrl: externalAudio.url,
      streamType: inferStreamTypeFromUrl(externalAudio.url, currentItem?.streamType),
      voice: externalAudio.name,
      startAt: time,
    });
  };

  const switchAudio = (id: number) => {
    const externalAudio = currentItem?.audios?.[id];
    if (externalAudio) {
      swapToExternalAudio(id, externalAudio);
      return;
    }

    const isHls = currentItem?.streamType === "m3u8" || currentItem?.streamType === "hls";
    if (isHls && hlsRef.current) {
      hlsRef.current.audioTrack = id;
      // Remember this choice for the rest of the playlist (matched by name similarity on later episodes).
      const chosen = hlsRef.current.audioTracks?.[id];
      if (chosen) {
        preferredAudioRef.current = { name: chosen.name };
      }
      setCurrentAudioTrack(id);
      return;
    }

    setCurrentAudioTrack(id);
  };

  const switchQuality = (id: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = id;
      setCurrentQualityLevel(id);
    }
  };

  const displayQualityLevels = useMemo(() => {
    if (rawLevels.length === 0) return [];
    const activeLevel = hlsActiveLevel >= 0 ? rawLevels.find((l) => l.id === hlsActiveLevel) : null;
    const autoLabel = activeLevel?.height
      ? t("quality.autoWithHeight", { height: activeLevel.height })
      : t("quality.auto");
    return [
      { id: -1, name: autoLabel },
      ...rawLevels.map((l) => ({
        id: l.id,
        name: l.height ? `${l.height}p` : t("quality.levelNumbered", { number: l.id + 1 }),
      })),
    ];
  }, [rawLevels, hlsActiveLevel, t]);

  return { switchAudio, switchQuality, displayQualityLevels };
}
