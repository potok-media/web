import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Send } from "lucide-react";
import { useWatchTogether } from "../../context/watchTogetherState";
import { Chip, IconButton, Input, cx } from "../ui";
import { PlayerCoWatchInfo } from "./PlayerCoWatchInfo";
import "../../styles/watch-together.css";

// Chat sidebar shown over the right edge of the player during a co-watch session. The player overlay shrinks
// (right: var(--wt-chat-width)) when this is open, so video + this panel sit side by side.
export const PlayerCoWatchChat: React.FC = () => {
  const { t } = useTranslation("watchTogether");
  const { role, chatOpen, chatMessages, sendChat, setChatOpen } = useWatchTogether();
  const [draft, setDraft] = useState("");
  const [tab, setTab] = useState<"chat" | "info">("chat");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el && tab === "chat") el.scrollTop = el.scrollHeight;
  }, [chatMessages, tab]);

  if (!role || !chatOpen) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    sendChat(draft);
    setDraft("");
  };

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
        <>
          <div className="wt-chat__list" ref={listRef}>
            {chatMessages.length === 0 ? (
              <p className="wt-chat__empty">{t("chat.empty")}</p>
            ) : (
              chatMessages.map((m) => (
                <div key={m.id} className={cx("wt-chat__msg", m.mine && "wt-chat__msg--mine")}>
                  {!m.mine && <span className="wt-chat__name">{m.name || t("roleGuest")}</span>}
                  <span className="wt-chat__text">{m.text}</span>
                </div>
              ))
            )}
          </div>

          <form className="wt-chat__form" onSubmit={submit}>
            <Input
              type="text"
              value={draft}
              maxLength={500}
              placeholder={t("chat.placeholder")}
              onChange={(e) => setDraft(e.target.value)}
            />
            <IconButton type="submit" className="control-icon-btn" aria-label={t("chat.send")} disabled={!draft.trim()}>
              <Send size="1.125rem" />
            </IconButton>
          </form>
        </>
      ) : (
        <PlayerCoWatchInfo />
      )}
    </aside>
  );
};
