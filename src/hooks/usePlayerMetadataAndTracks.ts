import { useState, useEffect, useCallback } from "react";
import { i18n } from "../i18n";
import { type ActivePlayback } from "../context/AppSettingsContext";
import {
  mergeAndDeduplicateSubtitles,
  useSubtitleWindowFetch,
  type InjectedSubtitle,
} from "./player/playerSubtitleMetadata";

export const SUBTITLE_WINDOW_SEC = 15;

export function usePlayerMetadataAndTracks(
  streamHash: string,
  fileIndex: string,
  initialStreamUrl: string,
  audios?: { name: string; url: string }[],
  playback?: ActivePlayback,
) {
  const [audioTracks, setAudioTracks] = useState<{ id: number; name: string }[]>([]);
  const [currentAudioTrack, setCurrentAudioTrack] = useState(-1);
  const [subtitleTracks, setSubtitleTracks] = useState<{ id: number; name: string; stableId?: string }[]>(() => {
    if (playback?.subtitles && playback.subtitles.length > 0) {
      return playback.subtitles.map((sub, idx) => ({
        id: idx,
        name: sub.label || sub.name || `Sub ${idx + 1}`,
        stableId: sub.id || `${idx}_${sub.label || sub.name || "Subtitle"}`,
      }));
    }
    return [];
  });
  const [currentSubtitleTrack, setCurrentSubtitleTrack] = useState(-1);
  const [injectedSubtitles, setInjectedSubtitles] = useState<InjectedSubtitle[]>(() => {
    if (playback?.subtitles && playback.subtitles.length > 0) {
      return playback.subtitles.map((sub, idx) => ({
        id: sub.id || `${idx}_${sub.label || sub.name || "Subtitle"}`,
        label: sub.label || sub.name || `Sub ${idx + 1}`,
        srclang: sub.srclang || sub.language || "custom",
        src: sub.src || sub.url || "",
        codec: sub.format,
      }));
    }
    return [];
  });

  useEffect(() => {
    setSubtitleTracks((prev) => {
      const injectedTracks = injectedSubtitles.map((sub, idx) => ({
        id: idx,
        name: sub.label || `Sub ${idx + 1}`,
        stableId: sub.id,
      }));
      const inbandTracks = prev.filter((t) => t.id >= injectedSubtitles.length);
      return [...injectedTracks, ...inbandTracks];
    });
  }, [injectedSubtitles]);

  const [isMetadataLoading, setIsMetadataLoading] = useState(() => !!playback?.requiresBuffering);
  const [metadataDuration, setMetadataDuration] = useState(() => {
    if (playback?.duration && playback.duration > 0) return playback.duration;
    return 0;
  });
  const [isMetadataFetched, setIsMetadataFetched] = useState(() => {
    return !!(playback?.subtitles && playback.subtitles.length > 0);
  });
  const [localIntroRange, setLocalIntroRange] = useState<{ start: number; end: number } | null>(() => {
    if (playback && typeof playback.introStart === "number" && typeof playback.introEnd === "number" && playback.introEnd > playback.introStart) {
      return { start: playback.introStart, end: playback.introEnd };
    }
    return null;
  });
  const [localOutroRange, setLocalOutroRange] = useState<{ start: number; end: number } | null>(() => {
    if (playback && typeof playback.outroStart === "number" && typeof playback.outroEnd === "number" && playback.outroEnd > playback.outroStart) {
      return { start: playback.outroStart, end: playback.outroEnd };
    }
    return null;
  });

  const syncNativeTextTracks = useCallback((video: HTMLVideoElement | null) => {
    if (!video) return;

    const inbandTracks: { id: number; name: string; stableId?: string }[] = [];
    for (let i = injectedSubtitles.length; i < video.textTracks.length; i++) {
      const track = video.textTracks[i];
      if (track.kind === "subtitles" || track.kind === "captions") {
        inbandTracks.push({
          id: i,
          name: track.label || track.language || i18n.t("player:trackSelector.subtitlesFallback", { index: i + 1 }),
        });
      }
    }

    const injectedTracks = injectedSubtitles.map((sub, idx) => ({
      id: idx,
      name: sub.label || `Sub ${idx + 1}`,
      stableId: sub.id,
    }));
    setSubtitleTracks([...injectedTracks, ...inbandTracks]);
  }, [injectedSubtitles]);

  useEffect(() => {
    if (audios && audios.length > 0) {
      const tracks = audios.map((a, idx) => ({ id: idx, name: a.name }));
      setAudioTracks(tracks);

      let activeIdx = 0;
      try {
        const audioParam = new URL(initialStreamUrl).searchParams.get("audio");
        if (audioParam !== null) {
          const parsed = parseInt(audioParam, 10);
          if (!isNaN(parsed) && parsed >= 0 && parsed < audios.length) activeIdx = parsed;
        }
      } catch {
        const match = initialStreamUrl.match(/[?&]audio=(\d+)/i);
        if (match) {
          const parsed = parseInt(match[1], 10);
          if (parsed >= 0 && parsed < audios.length) activeIdx = parsed;
        }
      }
      setCurrentAudioTrack(activeIdx);
    }
  }, [audios, initialStreamUrl]);

  const subtitlesJson = JSON.stringify(playback?.subtitles);
  const durationVal = playback?.duration;
  const introStartVal = playback?.introStart;
  const introEndVal = playback?.introEnd;
  const outroStartVal = playback?.outroStart;
  const outroEndVal = playback?.outroEnd;

  useEffect(() => {
    setInjectedSubtitles([]);
    setSubtitleTracks([]);
    setCurrentSubtitleTrack(-1);
    setMetadataDuration(0);
    setLocalIntroRange(null);
    setLocalOutroRange(null);
    setIsMetadataFetched(true);
  }, [streamHash, fileIndex]);

  useEffect(() => {
    const initialSubs = playback?.subtitles && playback.subtitles.length > 0
      ? playback.subtitles.map((sub, idx) => ({
          id: sub.id || `${idx}_${sub.label || sub.name || "Subtitle"}`,
          label: sub.label || sub.name || `Sub ${idx + 1}`,
          srclang: sub.srclang || sub.language || "custom",
          src: sub.src || sub.url || "",
          codec: sub.format,
        }))
      : [];

    if (initialSubs.length > 0) {
      setInjectedSubtitles((prev) => mergeAndDeduplicateSubtitles(prev, initialSubs));
    }

    if (playback?.duration && playback.duration > 0) {
      setMetadataDuration(playback.duration);
    }

    if (playback && typeof playback.introStart === "number" && typeof playback.introEnd === "number" && playback.introEnd > playback.introStart) {
      setLocalIntroRange({ start: playback.introStart, end: playback.introEnd });
    }

    if (playback && typeof playback.outroStart === "number" && typeof playback.outroEnd === "number" && playback.outroEnd > playback.outroStart) {
      setLocalOutroRange({ start: playback.outroStart, end: playback.outroEnd });
    }

    setIsMetadataFetched(true);
  }, [playback, subtitlesJson, durationVal, introStartVal, introEndVal, outroStartVal, outroEndVal]);

  const { subtitleFetchPromises, fetchSubtitleWindow } = useSubtitleWindowFetch(streamHash, fileIndex);

  return {
    audioTracks,
    setAudioTracks,
    currentAudioTrack,
    setCurrentAudioTrack,
    subtitleTracks,
    setSubtitleTracks,
    currentSubtitleTrack,
    setCurrentSubtitleTrack,
    injectedSubtitles,
    setInjectedSubtitles,
    isMetadataLoading,
    setIsMetadataLoading,
    metadataDuration,
    isMetadataFetched,
    setIsMetadataFetched,
    syncNativeTextTracks,
    localIntroRange,
    localOutroRange,
    subtitleFetchPromises,
    fetchSubtitleWindow,
  };
}