import type { ActivePlayback } from "../../context/playbackTypes";

export interface WebMediaPlayerOptions {
  playback: ActivePlayback;
  onClose?: () => void;
  isNetworkOffline?: boolean;
  /** localStorage key prefix for the persisted volume/mute prefs (inline vs overlay namespaces). */
  volumeStorageKeyPrefix?: string;
}