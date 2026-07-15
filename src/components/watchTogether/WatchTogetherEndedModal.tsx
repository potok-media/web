import React from "react";
import { useTranslation } from "react-i18next";
import { DoorClosed } from "lucide-react";
import { Overlay } from "../common/Overlay";
import { Button } from "../ui";
import { useWatchTogether } from "../../context/watchTogetherState";
import "../../styles/watch-together.css";

// Shown to a guest after the host closes the room. Global (rendered above every page), because the guest has
// already been sent home by then.
export const WatchTogetherEndedModal: React.FC = () => {
  const { t } = useTranslation("watchTogether");
  const { hostEnded, dismissHostEnded } = useWatchTogether();

  return (
    <Overlay open={hostEnded} onClose={dismissHostEnded} variant="modal" closeOnBackdrop={false} className="wt-ended-panel">
      <div className="wt-ended">
        <div className="wt-ended__badge">
          <DoorClosed size="1.75rem" strokeWidth={2.25} />
        </div>
        <h2 className="wt-ended__title">{t("ended.title")}</h2>
        <p className="wt-ended__text">{t("ended.text")}</p>
        <Button variant="primary" size="md" fullWidth onClick={dismissHostEnded}>
          {t("ended.ok")}
        </Button>
      </div>
    </Overlay>
  );
};
