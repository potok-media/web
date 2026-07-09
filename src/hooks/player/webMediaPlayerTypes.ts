import type { ActivePlayback } from "../../context/playbackTypes";

export interface WebMediaPlayerOptions {
  playback: ActivePlayback;
  onClose?: () => void;
  isNetworkOffline?: boolean;
}