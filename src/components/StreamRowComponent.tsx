import React from "react";
import type { StreamUIItem } from "../network/ApiTypes";
import { extractBadges } from "../utils/torrentUtils";
import { formatBytes, formatPublishDate } from "../utils/formatters";

interface StreamRowComponentProps {
  stream: StreamUIItem;
  onClick: (stream: StreamUIItem) => void;
}

export const StreamRowComponent: React.FC<StreamRowComponentProps> = React.memo(({ stream, onClick }) => {
  const extracted = extractBadges(stream.title);
  const parsedTags = Array.from(new Set([
    ...(stream.tags?.map((t: { kind: string; value: string }) => t.value) || []),
    ...extracted
  ])).slice(0, 6);

  return (
    <div className="torrent-row" onClick={() => onClick(stream)}>
      <div className="torrent-header-row">
        <div className="torrent-row-header-left">
          <h3 className="torrent-title-text torrent-row-title">
            {stream.title}
          </h3>
          
          <div className="torrent-badges-row">
            {parsedTags.map((tagVal, i) => (
              <span key={i} className="torrent-tag-badge">{tagVal}</span>
            ))}
          </div>
        </div>

        {(stream.sizeLabel || stream.sizeBytes) && (
          <span className="torrent-size-badge">
            {stream.sizeLabel || formatBytes(stream.sizeBytes)}
          </span>
        )}
      </div>

      <div className="torrent-footer-row torrent-row-footer-separator">
        <div className="torrent-footer-left">
          {stream.publishDate && <span>{formatPublishDate(stream.publishDate)}</span>}
          {stream.tracker && <span className="tracker-name">{stream.tracker}</span>}
        </div>

        <div className="torrent-footer-right">
          {(stream.seeders === undefined || stream.seeders === null) && (stream.leechers === undefined || stream.leechers === null) ? (
            <span className="torrent-play-action" style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--color-accent, #007aff)", fontWeight: 600 }}>
              <span style={{ fontSize: "9px" }}>▶</span> Смотреть
            </span>
          ) : (
            <>
              <span>
                Раздают: <span className="torrent-peer-num">{stream.seeders ?? 0}</span>
              </span>
              <span>
                Скачивают: <span className="torrent-peer-num">{stream.leechers ?? 0}</span>
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
