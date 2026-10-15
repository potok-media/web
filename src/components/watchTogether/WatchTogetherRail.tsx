import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHUD } from "../../context/useHUD";
import { useWatchTogether } from "../../context/watchTogetherState";
import { Chip } from "../ui";
import { WatchTogetherChatPanel } from "./WatchTogetherChatPanel";
import { WatchTogetherParticipantsPanel } from "./WatchTogetherParticipantsPanel";

interface WatchTogetherRailProps {
  queue: React.ReactNode;
  queueCount?: number;
}

type RailTab = "chat" | "queue" | "participants";

/** The single right-hand workspace for an active co-watch room. */
export const WatchTogetherRail: React.FC<WatchTogetherRailProps> = ({ queue, queueCount = 0 }) => {
  const { t } = useTranslation("watchTogether");
  const { show: showHUD } = useHUD();
  const wt = useWatchTogether();
  const [activeTab, setActiveTab] = useState<RailTab>(wt.chatOpen ? "chat" : "queue");

  useEffect(() => {
    if (wt.chatOpen) {
      setActiveTab("chat");
      return;
    }
    setActiveTab((current) => current === "chat" ? "queue" : current);
  }, [wt.chatOpen]);

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(wt.getShareLink());
      showHUD("success", t("copied"));
    } catch {
      showHUD("error", t("copyFailed"));
    }
  };

  const selectTab = (tab: RailTab) => {
    setActiveTab(tab);
    wt.setChatOpen(tab === "chat");
  };

  return (
    <div className="wt-rail wt-rail--active">
      <header className="wt-rail__header wt-rail__header--active">
        <div className="wt-rail__tabs" role="tablist" aria-label={t("title")}>
          <Chip
            type="button"
            className="wt-rail__tab"
            active={activeTab === "chat"}
            role="tab"
            aria-selected={activeTab === "chat"}
            aria-controls="wt-rail-panel"
            onClick={() => selectTab("chat")}
          >
            <span>{t("chat.tabChat")}</span>
          </Chip>
          <Chip
            type="button"
            className="wt-rail__tab"
            active={activeTab === "queue"}
            role="tab"
            aria-selected={activeTab === "queue"}
            aria-controls="wt-rail-panel"
            onClick={() => selectTab("queue")}
          >
            <span>{t("queue")}</span>
            <span className="wt-rail__badge">{queueCount}</span>
          </Chip>
          <Chip
            type="button"
            className="wt-rail__tab"
            active={activeTab === "participants"}
            role="tab"
            aria-selected={activeTab === "participants"}
            aria-controls="wt-rail-panel"
            onClick={() => selectTab("participants")}
          >
            <span>{t("participantsTab")}</span>
            <span className="wt-rail__badge">{wt.participants.length}</span>
          </Chip>
        </div>
      </header>

      <div id="wt-rail-panel" className="wt-rail__body" role="tabpanel">
        {activeTab === "chat" ? <WatchTogetherChatPanel /> : null}
        {activeTab === "queue" ? queue : null}
        {activeTab === "participants" ? (
          <WatchTogetherParticipantsPanel onCopyLink={copyInvite} />
        ) : null}
      </div>
    </div>
  );
};

export default WatchTogetherRail;
