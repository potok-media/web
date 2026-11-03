import { playbackStorageKeys } from "../utils/playbackIdentity";
import { inferStreamTypeFromUrl } from "../utils/hls/hlsPlaybackUtils";
import { isPlayableUrl } from "../utils/playableUrl";
import { isSameBaseStreamUrl } from "../utils/audioTrackOwnership";
import { resolveEpisodeVoice } from "../utils/playlistResolver";
import { logger } from "../utils/logger";
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
  setPlayerError: (error: string | null) => void;
  setIsBuffering: (value: boolean) => void;
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
  setPlayerError,
  setIsBuffering,
  setShowAudioMenu,
  setShowQualityMenu,
}: UsePlayerTrackSwitchingParams) {
  const { t } = useTranslation("player");

  const currentLogicalTime = () => {
    const video = videoRef.current;
    return video ? (seekOffset > 0 ? seekOffset + video.currentTime : video.currentTime) : 0;
  };

  // Swap the playing source to an external audio entry that carries its own (distinct) playable url.
  const swapToExternalAudio = (id: number, externalAudio: { name: string; url: string }) => {
    const time = currentLogicalTime();
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
  };

  // Switch the voice of the CURRENT episode by re-resolving it through the owning plugin. The voice is
  // baked into online-balancers streams (the CDN ignores ?audio=N), so a same-base audio entry can only
  // be switched to via a fresh resolution under the picked voice name.
  const switchExternalAudioByReResolve = async (id: number, externalAudio: { name: string; url: string }) => {
    setIsBuffering(true);
    try {
      const info = await resolveEpisodeVoice(playback, externalAudio.name);
      if (info) {
        if (!isPlayableUrl(info.streamUrl)) {
          throw new Error("voice re-resolve returned no playable streamUrl");
        }
        const time = currentLogicalTime();
        const { resumeKey } = playbackStorageKeys(playback);
        localStorage.setItem(resumeKey, time.toString());
        preferredAudioRef.current = { name: externalAudio.name };
        setCurrentAudioTrack(id);
        const st = info.streamType;
        switchPlaybackSource({
          streamUrl: info.streamUrl,
          streamType:
            st === "m3u8" || st === "hls" || st === "mp4" || st === "dash"
              ? st
              : inferStreamTypeFromUrl(info.streamUrl, playback.streamType),
          voice: info.voice ?? externalAudio.name,
          startAt: time,
        });
        return;
      }
      // No plugin capable of re-resolving: preserve the legacy behavior and swap directly when the
      // entry carries a playable url (entries without one were never switchable — see the error below).
      if (isPlayableUrl(externalAudio.url)) {
        swapToExternalAudio(id, externalAudio);
        return;
      }
      throw new Error("playback has no plugin data to re-resolve the voice");
    } catch (error) {
      // Rejection means the plugin could not match the voice (or the network failed): keep the
      // current working source and selection untouched, surface a clear error.
      logger.error("[usePlayerTrackSwitching] voice re-resolve failed:", error);
      setPlayerError(t("playback.audioSwitchFailed"));
    } finally {
      setIsBuffering(false);
    }
  };

  const switchAudio = (id: number) => {
    setShowAudioMenu(false);
    const externalAudio = playback.audios?.[id];
    if (externalAudio) {
      // A distinct playable stream (differs from the current url beyond the ?audio= selector) can be
      // swapped to directly. A same-base url — or no resolved url at all — means the voice is baked
      // into the stream, so switching requires a plugin re-resolve of the current episode.
      if (isPlayableUrl(externalAudio.url) && !isSameBaseStreamUrl(externalAudio.url, playback.streamUrl)) {
        swapToExternalAudio(id, externalAudio);
        return;
      }
      void switchExternalAudioByReResolve(id, externalAudio);
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
