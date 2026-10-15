import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { useWatchTogether } from "../../context/watchTogetherState";
import { Chip, IconButton } from "../ui";
import { WatchTogetherChatPanel } from "../watchTogether/WatchTogetherChatPanel";
import { PlayerCoWatchInfo } from "./PlayerCoWatchInfo";
import "../../styles/watch-together.css";

// Chat sidebar shown over the right edge of the player during a co-watch session. The player overlay shrinks
// (right: var(--wt-chat-width)) when this is open, so video + this panel sit side by side.
export const PlayerCoWatchChat: React.FC = () => {
  const { t } = useTranslation("watchTogether");
  const { role, chatOpen, setChatOpen } = useWatchTogether();
  const [tab, setTab] = useState<"chat" | "info">("chat");

  if (!role || !chatOpen) return null;

  return (
    <aside
      className="wt-chat"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <header className="wt-chat__header">
        <div className="wt-chat__tabs" role="tablist">
          <Chip active={tab === "chat"} onClick={() => setTab("chat")}>
            {t("chat.tabChat")}
          </Chip>
          <Chip active={tab === "info"} onClick={() => setTab("info")}>
            {t("chat.tabInfo")}
          </Chip>
        </div>
        <IconButton
          className="control-icon-btn"
          aria-label={t("chat.close")}
          onClick={() => setChatOpen(false)}
        >
          <X size="1.125rem" />
        </IconButton>
      </header>

      {tab === "chat" ? (
        <WatchTogetherChatPanel />
      ) : (
        <PlayerCoWatchInfo />
      )}
    </aside>
  );
};
