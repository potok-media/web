import React from "react";
import { useTranslation } from "react-i18next";
import { Crown, User } from "lucide-react";
import type { WTParticipant } from "../../network/watchTogetherTypes";

interface ParticipantListProps {
  participants: WTParticipant[];
  selfId: string;
  pings?: Record<string, number>; // participant id → RTT-to-host (ms); when given, shown as a badge per guest
}

export const ParticipantList: React.FC<ParticipantListProps> = React.memo(({ participants, selfId, pings }) => {
  const { t } = useTranslation("watchTogether");
  return (
    <section className="wt-participants">
      <h3 className="wt-participants__title">{t("participants", { count: participants.length })}</h3>
      <ul className="wt-participants__list">
        {participants.map((p) => {
          // The host is the sync hub, so it has no ping to itself; guests show their measured RTT once known.
          const ping = pings && p.role === "guest" ? pings[p.id] : undefined;
          return (
            <li key={p.id} className="wt-participants__item">
              {p.role === "host" ? <Crown size="1rem" className="wt-participants__icon" /> : <User size="1rem" />}
              <span className="wt-participants__name">
                {p.name || (p.role === "host" ? t("roleHost") : t("roleGuest"))}
                {p.id === selfId ? ` ${t("you")}` : ""}
              </span>
              {pings && (
                <span className={`wt-participants__ping wt-participants__ping--${pingLevel(ping)}`}>
                  {ping === undefined ? "—" : t("ping", { ms: ping })}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
});

// Colour bucket for a ping value: good (<120 ms), ok (<250 ms), bad (≥250 ms), or unknown.
function pingLevel(ms: number | undefined): "good" | "ok" | "bad" | "none" {
  if (ms === undefined) return "none";
  if (ms < 120) return "good";
  if (ms < 250) return "ok";
  return "bad";
}
