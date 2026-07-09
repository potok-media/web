import Hls from "hls.js";
import { logger } from "../logger";

function formatTimeRanges(tr?: TimeRanges): [number, number][] | null {
  if (!tr) return null;
  return Array.from({ length: tr.length }, (_, i) => [
    Number(tr.start(i).toFixed(1)),
    Number(tr.end(i).toFixed(1)),
  ]);
}

interface FragBufferedData {
  frag: { type: string; sn: number | string; start: number; startPTS?: number; endPTS?: number };
}

interface BufferAppendedData {
  type: string;
  timeRanges?: { audio?: TimeRanges; video?: TimeRanges };
}

interface HlsErrorData {
  type: string;
  details: string;
  fatal: boolean;
  response?: { code?: number };
  frag?: { sn?: number | string; url?: string };
}

const isDev = import.meta.env.DEV;

/** Dev-only HLS instrumentation. No-op in production builds. */
export function attachHlsDiagnostics(hls: Hls, video: HTMLVideoElement): void {
  if (!isDev) return;

  logger.warn("[HLS-DIAG] init", {
    version: Hls.version,
    playlistTTFB: hls.config.playlistLoadPolicy?.default?.maxTimeToFirstByteMs,
    playlistMaxLoad: hls.config.playlistLoadPolicy?.default?.maxLoadTimeMs,
  });

  hls.on(Hls.Events.FRAG_LOADING, (_e, data) => {
    logger.warn("[HLS-DIAG] FRAG_LOADING", {
      type: data.frag.type,
      sn: data.frag.sn,
      start: Number(data.frag.start.toFixed(1)),
      dur: Number(data.frag.duration.toFixed(2)),
    });
  });

  hls.on(Hls.Events.FRAG_BUFFERED, (_e, data: FragBufferedData) => {
    logger.warn("[HLS-DIAG] FRAG_BUFFERED", {
      type: data.frag.type,
      sn: data.frag.sn,
      start: Number(data.frag.start.toFixed(2)),
      startPTS: data.frag.startPTS != null ? Number(data.frag.startPTS.toFixed(2)) : null,
      endPTS: data.frag.endPTS != null ? Number(data.frag.endPTS.toFixed(2)) : null,
    });
  });

  hls.on(Hls.Events.BUFFER_APPENDED, (_e, data: BufferAppendedData) => {
    logger.warn("[HLS-DIAG] BUFFER_APPENDED", {
      type: data.type,
      audio: formatTimeRanges(data.timeRanges?.audio),
      video: formatTimeRanges(data.timeRanges?.video),
      curr: Number(video.currentTime.toFixed(2)),
    });
  });
}

export function logHlsDiagnosticError(hls: Hls, data: HlsErrorData): void {
  if (!isDev) return;
  logger.warn("[HLS-DIAG] ERROR", {
    type: data.type,
    details: data.details,
    fatal: data.fatal,
    code: data.response?.code,
    sn: data.frag?.sn,
    url: data.frag?.url,
    audioTracks: hls.audioTracks?.length,
    audioTrack: hls.audioTrack,
  });
}