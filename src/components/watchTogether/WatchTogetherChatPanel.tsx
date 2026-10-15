import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Send } from "lucide-react";
import { useWatchTogether } from "../../context/watchTogetherState";
import { Button, IconButton, Input } from "../ui";

const QUICK_REACTIONS = ["🔥", "😂", "😭", "👏", "❤️"] as const;

function messageInitial(name: string): string {
  return name.trim().charAt(0).toLocaleUpperCase() || "?";
}

/** Shared chat body used by both the inline workspace rail and the legacy player drawer. */
export const WatchTogetherChatPanel: React.FC = () => {
  const { t } = useTranslation("watchTogether");
  const { chatMessages, sendChat } = useWatchTogether();
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [chatMessages]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) return;
    sendChat(draft);
    setDraft("");
  };

  const sendReaction = (reaction: string) => {
    sendChat(reaction);
  };

  return (
    <div className="wt-chat-panel">
      <div className="wt-chat__list" ref={listRef} aria-live="polite">
        {chatMessages.length === 0 ? (
          <p className="wt-chat__empty">{t("chat.empty")}</p>
        ) : (
          chatMessages.map((message) => {
            const name = message.name || (message.mine ? t("you") : t("roleGuest"));
            const time = new Intl.DateTimeFormat(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            }).format(message.createdAt);

            return (
              <article key={message.id} className="wt-chat__msg">
                <span className="wt-chat__avatar" aria-hidden="true">{messageInitial(name)}</span>
                <div className="wt-chat__message-body">
                  <div className="wt-chat__meta">
                    <span className="wt-chat__name">{name}</span>
                    <time dateTime={new Date(message.createdAt).toISOString()}>{time}</time>
                  </div>
                  <p className="wt-chat__text">{message.text}</p>
                </div>
              </article>
            );
          })
        )}
      </div>

      <div className="wt-chat__composer">
        <div className="wt-chat__reactions" aria-label={t("chat.quickReactions")}>
          {QUICK_REACTIONS.map((reaction) => (
            <Button
              key={reaction}
              type="button"
              variant="secondary"
              size="sm"
              className="wt-chat__reaction"
              aria-label={`${t("chat.sendReaction")} ${reaction}`}
              onClick={() => sendReaction(reaction)}
            >
              {reaction}
            </Button>
          ))}
        </div>

        <form className="wt-chat__form" onSubmit={submit}>
          <Input
            type="text"
            value={draft}
            maxLength={500}
            placeholder={t("chat.placeholder")}
            aria-label={t("chat.placeholder")}
            onChange={(event) => setDraft(event.target.value)}
          />
          <IconButton
            type="submit"
            className="wt-chat__send"
            aria-label={t("chat.send")}
            disabled={!draft.trim()}
          >
            <Send size="1.125rem" />
          </IconButton>
        </form>
      </div>
    </div>
  );
};

export default WatchTogetherChatPanel;
