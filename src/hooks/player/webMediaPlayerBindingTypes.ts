import type { ActivePlayback } from "../../context/playbackTypes";

export interface UseWebMediaPlayerBindingsParams {
  playback: ActivePlayback;
  onClose?: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** The live <video> node as state — effects that attach listeners/attachMedia must depend on this,
   *  because a portal container swap recreates the node and leaves videoRef pointing at the new one. */
  videoNode: HTMLVideoElement | null;
  /** Callback ref to put on the <video> element; keeps videoRef.current and videoNode in sync. */
  videoRefCallback: (node: HTMLVideoElement | null) => void;
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