import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { i18n } from "../i18n";
import { type ActivePlayback, type PlaybackMeta } from "../context/AppSettingsContext";
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
  // Enrichable metadata (subtitles/duration) — comes from the context atom, NOT the descriptor, so late
  // enrichment updates tracks/duration without re-initializing the pipeline. See PlaybackMeta.
  playbackMeta?: PlaybackMeta,
) {
  const [audioTracks, setAudioTracks] = useState<{ id: number; name: string }[]>([]);
  const [currentAudioTrack, setCurrentAudioTrack] = useState(-1);
  const [subtitleTracks, setSubtitleTracks] = useState<{ id: number; name: string; stableId?: string }[]>(() => {
    if (playbackMeta?.subtitles && playbackMeta.subtitles.length > 0) {
      return playbackMeta.subtitles.map((sub, idx) => ({
        id: idx,
        name: sub.label || sub.name || `Sub ${idx + 1}`,
        stableId: sub.id || `${idx}_${sub.label || sub.name || "Subtitle"}`,
      }));
    }
    return [];
  });
  // Subtitle selection is keyed on a STABLE id, not a positional index — the track list is inherently
  // dynamic (injected subs arrive via enrich, inband HLS tracks appear at runtime), so a raw index silently
  // points at a different track when the list grows/reorders ("wrong subtitle"). The numeric
  // `currentSubtitleTrack` below is DERIVED from this id for render/consumers.
  const [selectedSubStableId, setSelectedSubStableId] = useState<string | null>(null);
  const [injectedSubtitles, setInjectedSubtitles] = useState<InjectedSubtitle[]>(() => {
    if (playbackMeta?.subtitles && playbackMeta.subtitles.length > 0) {
      return playbackMeta.subtitles.map((sub, idx) => ({
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
      // Preserve inband tracks by IDENTITY (stableId "inband:*"), not by the old `id >= length` test — that
      // test DROPPED an inband track when injectedSubtitles grew (its id fell below the new length). Reassign
      // positional ids so the invariant id === array index === video.textTracks index still holds.
      const inbandTracks = prev
        .filter((t) => t.stableId?.startsWith("inband:"))
        .map((t, j) => ({ ...t, id: injectedSubtitles.length + j }));
      return [...injectedTracks, ...inbandTracks];
    });
  }, [injectedSubtitles]);

  // Latest tracks, read by the index→stableId selector so it can stay referentially stable (consumers list
  // it in effect deps). And the DERIVED numeric index every consumer uses, resolved from the selected id.
  const subtitleTracksRef = useRef<{ id: number; name: string; stableId?: string }[]>([]);
  const currentSubtitleTrack = useMemo(
    () => (selectedSubStableId == null ? -1 : subtitleTracks.findIndex((t) => t.stableId === selectedSubStableId)),
    [selectedSubStableId, subtitleTracks],
  );
  const setCurrentSubtitleTrack = useCallback((index: number) => {
    setSelectedSubStableId(index < 0 ? null : (subtitleTracksRef.current[index]?.stableId ?? null));
  }, []);
  subtitleTracksRef.current = subtitleTracks;

  const [isMetadataLoading, setIsMetadataLoading] = useState(() => !!playback?.requiresBuffering);
  const [metadataDuration, setMetadataDuration] = useState(() => {
    if (playbackMeta?.duration && playbackMeta.duration > 0) return playbackMeta.duration;
    return 0;
  });
  const [isMetadataFetched, setIsMetadataFetched] = useState(() => {
    return !!(playbackMeta?.subtitles && playbackMeta.subtitles.length > 0);
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
        // Stable id = ordinal AMONG inband tracks (relative), independent of injectedSubtitles.length — so a
        // selected inband track survives injected subs arriving later and shifting absolute positions.
        inbandTracks.push({
          id: i,
          name: track.label || track.language || i18n.t("player:trackSelector.subtitlesFallback", { index: i + 1 }),
          stableId: `inband:${inbandTracks.length}`,
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

  const subtitlesJson = JSON.stringify(playbackMeta?.subtitles);
  const durationVal = playbackMeta?.duration;
  const introStartVal = playback?.introStart;
  const introEndVal = playback?.introEnd;
  const outroStartVal = playback?.outroStart;
  const outroEndVal = playback?.outroEnd;

  useEffect(() => {
    setInjectedSubtitles([]);
    setSubtitleTracks([]);
    setSelectedSubStableId(null);
    setMetadataDuration(0);
    setLocalIntroRange(null);
    setLocalOutroRange(null);
    setIsMetadataFetched(true);
  }, [streamHash, fileIndex]);

  useEffect(() => {
    const metaSubs = playbackMeta?.subtitles;
    const initialSubs = metaSubs && metaSubs.length > 0
      ? metaSubs.map((sub, idx) => ({
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

    if (playbackMeta?.duration && playbackMeta.duration > 0) {
      setMetadataDuration(playbackMeta.duration);
    }

    if (typeof introStartVal === "number" && typeof introEndVal === "number" && introEndVal > introStartVal) {
      setLocalIntroRange({ start: introStartVal, end: introEndVal });
    }

    if (typeof outroStartVal === "number" && typeof outroEndVal === "number" && outroEndVal > outroStartVal) {
      setLocalOutroRange({ start: outroStartVal, end: outroEndVal });
    }

    setIsMetadataFetched(true);
    // Keyed on the enrichable primitives only — NOT the whole `playback` object — so this re-merges on a
    // real subtitles/duration enrich without coupling to descriptor identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtitlesJson, durationVal, introStartVal, introEndVal, outroStartVal, outroEndVal]);

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