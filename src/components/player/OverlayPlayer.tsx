import React, { useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { PlayerCore } from "./PlayerCore";
import { useWatchTogether } from "../../context/watchTogetherState";
import type { ActivePlayback } from "../../context/playbackTypes";

export interface OverlayPlayerProps {
  playback: ActivePlayback;
  /** AppLayout-level close (clears the session slot + stops the playback). */
  onClose?: () => void;
  isNetworkOffline?: boolean;
}

/**
 * Overlay player — the ONLY player that renders into document.body, lifted by AppLayout when
 * activePlayback.mount === 'overlay'. Closing it stops the playback; a co-watch host additionally
 * leaves the room and returns to the route the room was started from, a guest leaves and goes home.
 */
export const OverlayPlayer: React.FC<OverlayPlayerProps> = (props) => {
  const { onClose: propsOnClose, ...playerProps } = props;
  const { role: coWatchRole, leave: coWatchLeave } = useWatchTogether();
  const navigate = useNavigate();

  const handlePlayerClose = useCallback(() => {
    if (coWatchRole === "host") {
      coWatchLeave();
      navigate(-1);
    } else if (coWatchRole === "guest") {
      coWatchLeave();
      navigate("/");
    }
    propsOnClose?.();
  }, [coWatchRole, coWatchLeave, navigate, propsOnClose]);

  return createPortal(
    <PlayerCore {...playerProps} onClose={handlePlayerClose} mount="overlay" />,
    document.body,
  );
};

export default OverlayPlayer;
