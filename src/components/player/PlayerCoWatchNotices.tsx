import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pause, Play, FastForward, Volume2, Captions } from "lucide-react";
import { useWatchTogether } from "../../context/watchTogetherState";
import type { WTNotice, WTNoticeAction } from "../../network/watchTogetherTypes";
import "../../styles/watch-together.css";

interface NoticeItem {
  id: number;
  action: WTNoticeAction;
  text: string;
}

const NOTICE_TTL_MS = 3500;
const MAX_NOTICES = 4;

const ICONS: Record<WTNoticeAction, React.ReactNode> = {
  pause: <Pause size="1rem" />,
  resume: <Play size="1rem" />,
  seek: <FastForward size="1rem" />,
  audio: <Volume2 size="1rem" />,
  subtitle: <Captions size="1rem" />,
};

// Transient "who did what" toasts shown during a co-watch session (to everyone except the actor). Rendered
// inside the player overlay. The host reflects its own emits locally so it also sees guest-initiated actions.
export const PlayerCoWatchNotices: React.FC = () => {
  const { t } = useTranslation("watchTogether");
  const { onNotice, clientId } = useWatchTogether();
  const [items, setItems] = useState<NoticeItem[]>([]);
  const nextIdRef = useRef(0);

  useEffect(() => {
    const buildText = (n: WTNotice): string => {
      const name = n.actorName || t("roleHost");
      switch (n.action) {
        case "pause": return t("notice.pause", { name });
        case "resume": return t("notice.resume", { name });
        case "seek": return t("notice.seek", { name, time: n.detail ?? "" });
        case "audio": return t("notice.audio", { name, track: n.detail ?? "" });
        case "subtitle":
          return n.detail ? t("notice.subtitle", { name, track: n.detail }) : t("notice.subtitleOff", { name });
        default: return "";
      }
    };

    return onNotice((n) => {
      if (n.actorId && n.actorId === clientId) return; // don't toast your own action
      const id = nextIdRef.current++;
      setItems((prev) => [...prev, { id, action: n.action, text: buildText(n) }].slice(-MAX_NOTICES));
      setTimeout(() => setItems((prev) => prev.filter((it) => it.id !== id)), NOTICE_TTL_MS);
    });
  }, [onNotice, t, clientId]);

  if (items.length === 0) return null;

  return (
    <div className="wt-notices" role="status" aria-live="polite">
      {items.map((it) => (
        <div key={it.id} className="wt-notice">
          <span className="wt-notice__icon">{ICONS[it.action]}</span>
          <span className="wt-notice__text">{it.text}</span>
        </div>
      ))}
    </div>
  );
};
