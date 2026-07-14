import type { RefObject } from "react";
import type Hls from "hls.js";
import type { ActivePlayback } from "../../context/playbackTypes";
import type { AudioPreference } from "./audioPreference";

export interface PlayerAudioTrack {
  id: number;
  name: string;
}

export interface HlsQualityLevel {
  id: number;
  height?: number;
}

export interface HlsPlayerParams {
  videoRef: RefObject<HTMLVideoElement | null>;
  playback: ActivePlayback;
  currentAudioTrack: number;
  setCurrentAudioTrack: (id: number) => void;
  setAudioTracks: (tracks: PlayerAudioTrack[]) => void;
  preferredAudioRef: RefObject<AudioPreference | null>;
  syncNativeTextTracks: (video: HTMLVideoElement | null) => void;
  setSeekOffset: (offset: number) => void;
  setPlayerError: (error: string | null) => void;
  handleRefreshStream: () => void;
  setIsMetadataLoading: (loading: boolean) => void;
}

export interface HlsPlayerSessionRefs {
  hlsRef: RefObject<Hls | null>;
  playerSessionRef: RefObject<number>;
  syncNativeTextTracksRef: RefObject<(video: HTMLVideoElement | null) => void>;
}