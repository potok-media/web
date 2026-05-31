import React from "react";
import { Sliders } from "lucide-react";
import type { TorrentSearchResult } from "../network/ApiTypes";
import { extractBadges } from "../utils/torrentUtils";
import { formatBytes, formatPublishDate } from "../utils/formatters";

interface StreamRowComponentProps {
  torrent: TorrentSearchResult;
  onClick: (torrent: TorrentSearchResult) => void;
}

export const StreamRowComponent: React.FC<StreamRowComponentProps> = React.memo(({ torrent, onClick }) => {
  const parsedTags = torrent.tags && torrent.tags.length > 0
    ? torrent.tags.slice(0, 6).map(tag => tag.value)
    : extractBadges(torrent.title);

  return (
    <div className="torrent-row" onClick={() => onClick(torrent)}>
      <div className="torrent-header-row">
        <div className="torrent-row-header-left">
          <h3 className="torrent-title-text torrent-row-title">
            {torrent.title}
          </h3>
          
          <div className="torrent-badges-row">
            {torrent.override && (
              <span className="torrent-tag-badge override-badge">
                <Sliders size={11} className="torrent-row-override-badge-icon" />
                <span className="torrent-row-override-badge-text">
                  S{torrent.override.season}
                  {torrent.override.episodeOffset !== undefined && torrent.override.episodeOffset !== null && torrent.override.episodeOffset !== 0 ? ` Off: ${torrent.override.episodeOffset > 0 ? "+" : ""}${torrent.override.episodeOffset}` : ""}
                </span>
              </span>
            )}
            {parsedTags.map((tagVal, i) => (
              <span key={i} className="torrent-tag-badge">{tagVal}</span>
            ))}
          </div>
        </div>

        {(torrent.sizeLabel || torrent.sizeBytes) && (
          <span className="torrent-size-badge">
            {torrent.sizeLabel || formatBytes(torrent.sizeBytes)}
          </span>
        )}
      </div>

      <div className="torrent-footer-row torrent-row-footer-separator">
        <div className="torrent-footer-left">
          {torrent.publishDate && <span>{formatPublishDate(torrent.publishDate)}</span>}
          {torrent.tracker && <span className="tracker-name">{torrent.tracker}</span>}
        </div>

        <div className="torrent-footer-right">
          {(torrent.seeders === undefined || torrent.seeders === null) && (torrent.leechers === undefined || torrent.leechers === null) ? (
            <span className="torrent-play-action" style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--color-accent, #007aff)", fontWeight: 600 }}>
              <span style={{ fontSize: "9px" }}>▶</span> Смотреть
            </span>
          ) : (
            <>
              <span>
                Раздают: <span className="torrent-peer-num">{torrent.seeders ?? 0}</span>
              </span>
              <span>
                Скачивают: <span className="torrent-peer-num">{torrent.leechers ?? 0}</span>
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

StreamRowComponent.displayName = "StreamRowComponent";
export default StreamRowComponent;
