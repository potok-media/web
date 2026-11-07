import React from "react";
import { PlayerCore } from "./PlayerCore";
import type { ActivePlayback } from "../../context/playbackTypes";

export interface InlinePlayerProps {
  playback: ActivePlayback;
  /** The HOST page decides what closing means (usually: stop the player, keep the page). */
  onClose?: () => void;
  isNetworkOffline?: boolean;
}

/**
 * Inline player — embedded by a host page directly in its own stage (no portal). Dies with the host:
 * when the page unmounts the player is gone; nothing re-mounts it elsewhere. Keeps its own settings
 * namespace (potok_inline_*) so volume/mute prefs are separate from the overlay player.
 */
export const InlinePlayer: React.FC<InlinePlayerProps> = (props) => (
  <PlayerCore {...props} mount="inline" volumeStorageKeyPrefix="potok_inline" />
);

export default InlinePlayer;
