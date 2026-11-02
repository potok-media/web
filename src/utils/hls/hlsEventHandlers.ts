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
  // Returns the track index to auto-select from a remembered playlist preference, or -1 to keep the default.
  getPreferredAudioTrackId?: (rawTracks: { name?: string; lang?: string }[]) => number;
  /** False when the selector is owned by external provider/voice variants. */
  manageHlsAudioTracks?: boolean;
}

export function bindHlsEventHandlers(
  hls: Hls,
  video: HTMLVideoElement,
  sessionId: number,
  refs: HlsPlayerSessionRefs,
  callbacks: HlsHandlerCallbacks,
): void {
  const isActiveSession = () => refs.playerSessionRef.current === sessionId;
  // One recoverMediaError() per hls instance — see the ERROR handler below.
  let mediaErrorRecovered = false;

  attachHlsDiagnostics(hls, video);

  hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_e, data: { audioTracks?: { name?: string; lang?: string }[] }) => {
    if (!isActiveSession()) return;
    if (callbacks.manageHlsAudioTracks === false) return;
    const rawTracks = data.audioTracks || [];
    const tracks = rawTracks.map((t, i) => ({
      id: i,
      name: t.name || t.lang || `Audio ${i + 1}`,
    }));
    callbacks.setAudioTracks(tracks);

    // Re-apply the audio track the user picked earlier in this playlist (matched by name/lang, not index).
    const preferredId = callbacks.getPreferredAudioTrackId?.(rawTracks) ?? -1;
    if (preferredId >= 0 && preferredId !== hls.audioTrack) {
      hls.audioTrack = preferredId;
    }
    callbacks.setCurrentAudioTrack(preferredId >= 0 ? preferredId : hls.audioTrack);
  });

  hls.on(Hls.Events.AUDIO_TRACK_SWITCHING, () => {});

  hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_e, data: { id: number }) => {
    if (!isActiveSession()) return;
    if (callbacks.manageHlsAudioTracks === false) return;
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

    // No client-side auto-heal. Non-fatal errors are handled internally by hls.js; a FATAL error is
    // surfaced to the user (the error overlay offers a manual stream refresh) instead of looping
    // startLoad()/recoverMediaError(). A stall/decode fault is a real upstream (TorrentGo) defect to fix
    // at the source, not to paper over on the client — see "dumb player boundary".
    if (!data.fatal) return;

    // One exception: a single corrupt segment (fragParsingError) or a one-off MSE hiccup must not end
    // the session — recoverMediaError() rebuilds the MediaSource and keeps buffering from the network
    // cache. Only an error that survives the recovery is surfaced, and only ONE recovery per hls
    // instance so a genuinely broken stream can't loop here.
    if (data.type === Hls.ErrorTypes.MEDIA_ERROR && !mediaErrorRecovered) {
      mediaErrorRecovered = true;
      logger.error("[useHlsPlayer] Fatal media error — attempting one recoverMediaError():", data.details);
      try {
        hls.recoverMediaError();
        callbacks.setIsMetadataLoading(true); // spinner until the buffer refills after the rebuild
        return;
      } catch (e) {
        logger.error("[useHlsPlayer] recoverMediaError() threw:", e);
      }
    }

    logger.error("[useHlsPlayer] Fatal Hls error:", data.type, data.details);
    callbacks.setPlayerError("Ошибка при воспроизведении HLS потока.");
    callbacks.setIsMetadataLoading(false);
  });
}
