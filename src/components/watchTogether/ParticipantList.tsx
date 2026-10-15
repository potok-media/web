import React from "react";
import { useTranslation } from "react-i18next";
import type { WTParticipant } from "../../network/watchTogetherTypes";

interface ParticipantListProps {
  participants: WTParticipant[];
  selfId: string;
  pings?: Record<string, number>; // participant id → RTT-to-host (ms); when given, shown as a badge per guest
  showTitle?: boolean;
}

export const ParticipantList: React.FC<ParticipantListProps> = React.memo(({
  participants,
  selfId,
  pings,
  showTitle = true,
}) => {
  const { t } = useTranslation("watchTogether");
  return (
    <section className="wt-participants">
      {showTitle ? (
        <h3 className="wt-participants__title">{t("participants", { count: participants.length })}</h3>
      ) : null}
      <ul className="wt-participants__list">
        {participants.map((p) => {
          // The host is the sync hub, so it has no ping to itself; guests show their measured RTT once known.
          const ping = pings && p.role === "guest" ? pings[p.id] : undefined;
          const displayName = p.name || (p.role === "host" ? t("roleHost") : t("roleGuest"));
          const initial = displayName.trim().charAt(0).toLocaleUpperCase() || "?";
          return (
            <li key={p.id} className="wt-participants__item">
              <span className="wt-participants__avatar" aria-hidden="true">
                {initial}
                <span className="wt-participants__online-dot" />
              </span>
              <span className="wt-participants__identity">
                <span className="wt-participants__name">
                  {displayName}
                  {p.id === selfId ? ` ${t("you")}` : ""}
                </span>
                {p.role === "host" ? (
                  <span className="wt-participants__role">{t("roleHost")}</span>
                ) : null}
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
