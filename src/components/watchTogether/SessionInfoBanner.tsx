import React from "react";
import { useTranslation } from "react-i18next";
import { Film, Tv } from "lucide-react";
import type { WTSessionInfo } from "../../network/watchTogetherTypes";

interface SessionInfoBannerProps {
  info: WTSessionInfo;
}

// Shown on the connection/lobby page: a banner (artwork left, title right) for what's being watched, plus a
// scrollable episode list when the session is a playlist. Purely informative.
export const SessionInfoBanner: React.FC<SessionInfoBannerProps> = React.memo(({ info }) => {
  const { t } = useTranslation("watchTogether");
  const art = info.posterSrc || info.backdropSrc;
  const playlist = info.playlist ?? [];
  const isPlaylist = playlist.length > 1;
  const current = info.playlistIndex != null ? playlist[info.playlistIndex] : undefined;

  return (
    <section className="wt-session">
      <div
        className="wt-session__hero"
        style={info.backdropSrc ? ({ "--wt-session-backdrop": `url(${info.backdropSrc})` } as React.CSSProperties) : undefined}
      >
        {art ? (
          <img className="wt-session__art" src={art} alt="" loading="lazy" />
        ) : (
          <div className="wt-session__art wt-session__art--placeholder">
            {info.mediaType === "tv" ? <Tv size="1.5rem" /> : <Film size="1.5rem" />}
          </div>
        )}
        <div className="wt-session__meta">
          <span className="wt-session__label">{t("nowWatching")}</span>
          <h2 className="wt-session__title">{info.title}</h2>
          {current && (
            <span className="wt-session__ep">S{current.season}E{current.episode}</span>
          )}
        </div>
      </div>

      {isPlaylist && (
        <ul className="wt-session__playlist">
          {playlist.map((ep, i) => (
            <li
              key={`${ep.season}-${ep.episode}-${i}`}
              className={`wt-session__episode ${i === info.playlistIndex ? "wt-session__episode--current" : ""}`}
            >
              <span className="wt-session__episode-num">S{ep.season}E{ep.episode}</span>
              <span className="wt-session__episode-title">{ep.title || t("episodeN", { n: ep.episode })}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
});
