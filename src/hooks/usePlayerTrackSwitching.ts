import { useMemo, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import type Hls from "hls.js";
import type { ActivePlayback } from "../context/playbackTypes";

interface UsePlayerTrackSwitchingParams {
  playback: ActivePlayback;
  videoRef: RefObject<HTMLVideoElement | null>;
  hlsRef: RefObject<Hls | null>;
  seekOffset: number;
  rawLevels: Array<{ id: number; height?: number }>;
  hlsActiveLevel: number;
  setCurrentAudioTrack: (id: number) => void;
  setCurrentQualityLevel: (id: number) => void;
  playVideo: (next: ActivePlayback) => void;
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
  playVideo,
  setShowAudioMenu,
  setShowQualityMenu,
}: UsePlayerTrackSwitchingParams) {
  const { t } = useTranslation("player");

  const switchAudio = (id: number) => {
    setShowAudioMenu(false);
    const isHls = playback.streamType === "m3u8" || playback.streamType === "hls";
    if (isHls && hlsRef.current) {
      hlsRef.current.audioTrack = id;
      setCurrentAudioTrack(id);
      return;
    }

    const video = videoRef.current;
    const time = video
      ? seekOffset > 0
        ? seekOffset + video.currentTime
        : video.currentTime
      : 0;
    const resumeKey = `potok_playback_resume:${playback.id}:${playback.season ?? 0}:${playback.episode ?? 0}`;
    localStorage.setItem(resumeKey, time.toString());
    setCurrentAudioTrack(id);
    const newUrl =
      playback.audios && playback.audios[id] ? playback.audios[id].url : playback.streamUrl;
    playVideo({ ...playback, streamUrl: newUrl });
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