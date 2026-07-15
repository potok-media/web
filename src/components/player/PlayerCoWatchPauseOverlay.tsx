import React from "react";
import { useTranslation } from "react-i18next";
import { Pause } from "lucide-react";
import { useWatchTogether } from "../../context/watchTogetherState";
import "../../styles/watch-together.css";

// Shown to a guest while the host has the video paused (driven by the sync-watch paused flag). A glassmorphic
// centered card over a dimmed, blurred backdrop — the co-watch counterpart to the transient action toasts.
export const PlayerCoWatchPauseOverlay: React.FC = () => {
  const { t } = useTranslation("watchTogether");
  const { role, hostPaused, hostPausedBy, hostStarted, participants, clientId } = useWatchTogether();

  // Shown to anyone whose session was paused by SOMEONE ELSE (host sees a guest's pause and vice-versa; the
  // person who paused doesn't need telling). Only after the session has really begun (not the start hold).
  if (!role || !hostPaused || !hostStarted || !hostPausedBy || hostPausedBy === clientId) return null;

  const actor = participants.find((p) => p.id === hostPausedBy);
  const actorName = actor?.name || (actor?.role === "guest" ? t("roleGuest") : t("roleHost"));

  return (
    <div className="wt-pause" role="status" aria-live="polite">
      <div className="wt-pause__card">
        <div className="wt-pause__badge">
          <span className="wt-pause__ring" />
          <span className="wt-pause__ring wt-pause__ring--delay" />
          <Pause size="1.75rem" strokeWidth={2.25} />
        </div>
        <div className="wt-pause__title">{t("pauseModal.title", { name: actorName })}</div>
        <div className="wt-pause__sub">
          {t("pauseModal.subtitle")}
          <span className="wt-pause__dots">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </div>
      </div>
    </div>
  );
};
