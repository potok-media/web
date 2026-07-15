import React from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { useWatchTogether } from "../../context/watchTogetherState";
import "../../styles/watch-together.css";

// Shown to the host while it holds the start until every guest has reported ready (the ready-handshake).
// Same glassmorphic card as the pause overlay, with a spinner.
export const PlayerCoWatchWaitOverlay: React.FC = () => {
  const { t } = useTranslation("watchTogether");
  const { role, sessionActive, startGateOpen } = useWatchTogether();

  if (role !== "host" || !sessionActive || startGateOpen) return null;

  return (
    <div className="wt-pause" role="status" aria-live="polite">
      <div className="wt-pause__card">
        <div className="wt-pause__badge">
          <Loader2 className="wt-spin" size="1.75rem" strokeWidth={2.25} />
        </div>
        <div className="wt-pause__title">{t("waitModal.title")}</div>
        <div className="wt-pause__sub">{t("waitModal.subtitle")}</div>
      </div>
    </div>
  );
};
