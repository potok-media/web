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
  const overrideLabel = stream.overrideBadge?.label;
  const parsedTags = useMemo(() => {
    const extracted = extractBadges(stream.title);
    return Array.from(new Set([
      ...(stream.tags?.map((tag: { kind: string; value: string }) => tag.value) || []),
      ...extracted,
    ]))
      .filter((value) => !overrideLabel || value !== overrideLabel)
      .slice(0, 6);
  }, [stream.title, stream.tags, overrideLabel]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick(stream);
    }
  };

  const row = (
    <div
      className={`stream-row${stream.isLastSelected ? " stream-row--last" : ""}`}
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
          {stream.missingFromResults && (
            <span className="stream-row-last-hint">{t("row.notInResults")}</span>
          )}

          <div className="stream-badges-row">
            {stream.overrideBadge && (
              <span
                className="stream-tag-badge override-badge"
                title={stream.overrideBadge.title || stream.overrideBadge.label}
              >
                <span className="stream-row-override-badge-text">{stream.overrideBadge.label}</span>
              </span>
            )}
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

  if (!stream.isLastSelected) return row;

  return (
    <div className="stream-row-last-shell">
      <span className="stream-row-last-caption">{t("row.lastSelected")}</span>
      {row}
    </div>
  );
});

StreamRowComponent.displayName = "StreamRowComponent";
export default StreamRowComponent;
