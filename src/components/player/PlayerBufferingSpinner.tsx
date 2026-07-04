import React from "react";

// Lightweight centered spinner shown mid-playback while a segment loads (a cold seek or a network
// dip). Distinct from PlayerLoadingOverlay, which is the full initial-startup card. Rendered only
// after a short delay by the caller so quick in-buffer seeks don't flash it.
export const PlayerBufferingSpinner: React.FC = () => (
  <div className="player-buffering-spinner" aria-live="polite" aria-busy="true">
    <div className="player-buffering-ring" />
  </div>
);
