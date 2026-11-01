import { playbackStorageKeys } from "../utils/playbackIdentity";
import { inferStreamTypeFromUrl } from "../utils/hls/hlsPlaybackUtils";
import { useMemo, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import type Hls from "hls.js";
import type { ActivePlayback } from "../context/playbackTypes";
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
    streamType?: ActivePlayback["streamType"];
    voice?: string;
    startAt: number;
  }) => void;
  setShowAudioMenu: (open: boolean) => void;
  setShowQualityMenu: (open: boolean) => void;
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
  setShowAudioMenu,
  setShowQualityMenu,
}: UsePlayerTrackSwitchingParams) {
  const { t } = useTranslation("player");

  const switchAudio = (id: number) => {
    setShowAudioMenu(false);
    const externalAudio = playback.audios?.[id];
    if (externalAudio) {
      const video = videoRef.current;
      const time = video
        ? seekOffset > 0
          ? seekOffset + video.currentTime
          : video.currentTime
        : 0;
      const { resumeKey } = playbackStorageKeys(playback);
      localStorage.setItem(resumeKey, time.toString());
      preferredAudioRef.current = { name: externalAudio.name };
      setCurrentAudioTrack(id);
      switchPlaybackSource({
        streamUrl: externalAudio.url,
        streamType: inferStreamTypeFromUrl(externalAudio.url, playback.streamType),
        voice: externalAudio.name,
        startAt: time,
      });
      return;
    }

    const isHls = playback.streamType === "m3u8" || playback.streamType === "hls";
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
    setShowQualityMenu(false);
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
