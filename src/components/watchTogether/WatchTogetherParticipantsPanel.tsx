import React from "react";
import { useTranslation } from "react-i18next";
import { Copy, Link2 } from "lucide-react";
import { useWatchTogether } from "../../context/watchTogetherState";
import { Button, IconButton } from "../ui";
import { ParticipantList } from "./ParticipantList";

interface WatchTogetherParticipantsPanelProps {
  onCopyLink: () => void;
}

export const WatchTogetherParticipantsPanel: React.FC<WatchTogetherParticipantsPanelProps> = ({
  onCopyLink,
}) => {
  const { t } = useTranslation("watchTogether");
  const wt = useWatchTogether();
  const shareLink = wt.getShareLink();

  return (
    <div className="wt-participants-panel">
      <div className="wt-participants-panel__heading">
        {t("onlineCount", { count: wt.participants.length })}
      </div>

      <ParticipantList
        participants={wt.participants}
        selfId={wt.clientId}
        pings={wt.pings}
        showTitle={false}
      />

      <section className="wt-participants-panel__share" aria-label={t("roomLink") }>
        <div className="wt-participants-panel__share-icon" aria-hidden="true">
          <Link2 size="1rem" />
        </div>
        <div className="wt-participants-panel__share-copy">
          <span>{t("roomLink")}</span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onCopyLink}
            title={shareLink}
          >
            <span className="wt-participants-panel__share-url">{shareLink}</span>
          </Button>
        </div>
        <IconButton
          size="sm"
          className="wt-participants-panel__copy"
          aria-label={t("copyLink")}
          title={t("copyLink")}
          onClick={onCopyLink}
        >
          <Copy size="1rem" />
        </IconButton>
      </section>
    </div>
  );
};

export default WatchTogetherParticipantsPanel;
