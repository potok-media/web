export interface InjectedSubtitleTrack {
  id: string;
  label: string;
  srclang: string;
  src: string;
  codec?: string;
}

export interface SubtitleTrackUiItem {
  id: number;
  name: string;
  stableId?: string;
}

export type SubtitleReadiness = "ready" | "error";