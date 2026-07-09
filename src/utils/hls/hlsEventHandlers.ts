import Hls from "hls.js";
import { logger } from "../logger";
import { attachHlsDiagnostics, logHlsDiagnosticError } from "./hlsDiagnostics";
import type { HlsPlayerSessionRefs, HlsQualityLevel, PlayerAudioTrack } from "./hlsPlayerTypes";

interface HlsHandlerCallbacks {
  setAudioTracks: (tracks: PlayerAudioTrack[]) => void;
  setCurrentAudioTrack: (id: number) => void;
  setRawLevels: (levels: HlsQualityLevel[]) => void;
  setCurrentQualityLevel: (level: number) => void;
  setHlsActiveLevel: (level: number) => void;
  setIsMetadataLoading: (loading: boolean) => void;
  setPlayerError: (error: string | null) => void;
}

export function bindHlsEventHandlers(
  hls: Hls,
  video: HTMLVideoElement,
  sessionId: number,
  refs: HlsPlayerSessionRefs,
  callbacks: HlsHandlerCallbacks,
): void {
  const isActiveSession = () => refs.playerSessionRef.current === sessionId;

  attachHlsDiagnostics(hls, video);

  hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_e, data: { audioTracks?: { name?: string; lang?: string }[] }) => {
    if (!isActiveSession()) return;
    const tracks = (data.audioTracks || []).map((t, i) => ({
      id: i,
      name: t.name || t.lang || `Audio ${i + 1}`,
    }));
    callbacks.setAudioTracks(tracks);
    callbacks.setCurrentAudioTrack(hls.audioTrack);
  });

  hls.on(Hls.Events.AUDIO_TRACK_SWITCHING, () => {});

  hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_e, data: { id: number }) => {
    if (!isActiveSession()) return;
    callbacks.setCurrentAudioTrack(data.id);
  });

  hls.on(Hls.Events.MANIFEST_PARSED, () => {
    if (!isActiveSession()) return;

    const levels = hls.levels.map((lvl, index) => ({
      id: index,
      height: lvl.height,
    }));
    callbacks.setRawLevels(levels);
    callbacks.setCurrentQualityLevel(hls.currentLevel);
    callbacks.setHlsActiveLevel(hls.currentLevel);
    callbacks.setIsMetadataLoading(false);
    refs.syncNativeTextTracksRef.current(video);
  });

  hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data: { level: number }) => {
    if (!isActiveSession()) return;
    callbacks.setCurrentQualityLevel(data.level);
    callbacks.setHlsActiveLevel(data.level);
  });

  hls.on(Hls.Events.ERROR, (_event, data) => {
    if (!isActiveSession()) return;
    logHlsDiagnosticError(hls, data);

    if (!data.fatal) return;

    switch (data.type) {
      case Hls.ErrorTypes.NETWORK_ERROR:
        logger.warn("[useHlsPlayer] Hls network error, retrying...", data);
        hls.startLoad();
        break;
      case Hls.ErrorTypes.MEDIA_ERROR:
        logger.warn("[useHlsPlayer] Hls media error, recovering...", data);
        hls.recoverMediaError();
        break;
      default:
        logger.error("[useHlsPlayer] Fatal Hls error:", data);
        callbacks.setPlayerError("Ошибка при воспроизведении HLS потока.");
        callbacks.setIsMetadataLoading(false);
        break;
    }
  });
}