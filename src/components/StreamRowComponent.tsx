import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { StreamUIItem } from "../network/ApiTypes";
import { extractBadges } from "../utils/mediaUtils";
import { formatBytes, formatPublishDate } from "../utils/formatters";

interface StreamRowComponentProps {
  stream: StreamUIItem;
  onClick: (stream: StreamUIItem) => void;
}

export const StreamRowComponent: React.FC<StreamRowComponentProps> = React.memo(({ stream, onClick }) => {
  const { t } = useTranslation("streams");
  const parsedTags = useMemo(() => {
    const extracted = extractBadges(stream.title);
    return Array.from(new Set([
      ...(stream.tags?.map((t: { kind: string; value: string }) => t.value) || []),
      ...extracted
    ])).slice(0, 6);
  }, [stream.title, stream.tags]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick(stream);
    }
  };

  return (
    <div 
      className="stream-row"
      onClick={() => onClick(stream)}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="stream-header-row">
        <div className="stream-row-header-left">
          <h3 className="stream-title-text stream-row-title">
            {stream.title}
          </h3>
          
          <div className="stream-badges-row">
            {parsedTags.map((tagVal, i) => (
              <span key={i} className="stream-tag-badge">{tagVal}</span>
            ))}
          </div>
        </div>

        {(stream.sizeLabel || stream.sizeBytes) && (
          <span className="stream-size-badge stream-size-badge-fixed">
            {stream.sizeLabel || formatBytes(stream.sizeBytes)}
          </span>
        )}
      </div>

      <div className="stream-footer-row stream-row-footer-separator">
        <div className="stream-footer-left">
          {stream.publishDate && <span>{formatPublishDate(stream.publishDate)}</span>}
          {stream.tracker && <span className="tracker-name">{stream.tracker}</span>}
        </div>

        <div className="stream-footer-right">
          {(stream.seeders === undefined || stream.seeders === null) && (stream.leechers === undefined || stream.leechers === null) ? (
            <span className="stream-play-action">
              <span className="stream-play-icon">▶</span> {t("row.watch")}
            </span>
          ) : (
            <>
              <span className="stream-stat-item seeds" title={t("row.seedersTitle")}>
                <span className="stat-label">{t("row.seedersLabel")}</span>
                <span className="stat-icon green">▲</span>
                <span className="stream-peer-num">{stream.seeders ?? 0}</span>
              </span>
              <span className="stream-stat-item peers" title={t("row.leechersTitle")}>
                <span className="stat-label">{t("row.leechersLabel")}</span>
                <span className="stat-icon grey">▼</span>
                <span className="stream-peer-num">{stream.leechers ?? 0}</span>
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
