import React from "react";
import { useTranslation } from "react-i18next";
import { useWatchTogether } from "../../context/watchTogetherState";
import { useHUD } from "../../context/useHUD";
import { SessionInfoBanner } from "../watchTogether/SessionInfoBanner";
import { ShareLinkPanel } from "../watchTogether/ShareLinkPanel";
import { ParticipantList } from "../watchTogether/ParticipantList";

// The "Info" tab of the co-watch sidebar: what's being watched (banner + playlist), the invite link, and the
// participant roster with each guest's ping — the same room details as the connection lobby, in-player.
export const PlayerCoWatchInfo: React.FC = () => {
  const { t } = useTranslation("watchTogether");
  const { show: showHUD } = useHUD();
  const { sessionInfo, getShareLink, participants, clientId, pings } = useWatchTogether();
  const link = getShareLink();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      showHUD("success", t("copied"));
    } catch {
      showHUD("error", t("copyFailed"));
    }
  };

  return (
    <div className="wt-chat__info">
      {sessionInfo && <SessionInfoBanner info={sessionInfo} />}
      {link && <ShareLinkPanel link={link} onCopy={handleCopy} />}
      <ParticipantList participants={participants} selfId={clientId} pings={pings} />
    </div>
  );
};
