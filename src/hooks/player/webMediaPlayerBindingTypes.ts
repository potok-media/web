import type { ActivePlayback } from "../../context/playbackTypes";

export interface UseWebMediaPlayerBindingsParams {
  playback: ActivePlayback;
  onClose?: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  overlayRef: React.RefObject<HTMLDivElement | null>;
  isPlaying: boolean;
  duration: number;
  seekOffset: number;
  seekPreview: number | null;
  isBuffering: boolean;
  setIsPlaying: (value: boolean) => void;
  setDuration: (value: number) => void;
  setSeekOffset: (value: number) => void;
  setSeekPreview: (value: number | null) => void;
  setIsBuffering: (value: boolean) => void;
  setPlayerError: (value: string | null) => void;
  setIsClosed: (value: boolean) => void;
}