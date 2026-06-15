import React, { useMemo } from "react";
import type { StreamUIItem } from "../network/ApiTypes";
import { extractBadges } from "../utils/mediaUtils";
import { formatBytes, formatPublishDate } from "../utils/formatters";
import { Focusable } from "./common/TVNavigation";

interface StreamRowComponentProps {
  stream: StreamUIItem;
  onClick: (stream: StreamUIItem) => void;
}

export const StreamRowComponent: React.FC<StreamRowComponentProps> = React.memo(({ stream, onClick }) => {
  const parsedTags = useMemo(() => {
    const extracted = extractBadges(stream.title);
    return Array.from(new Set([
      ...(stream.tags?.map((t: { kind: string; value: string }) => t.value) || []),
      ...extracted
    ])).slice(0, 6);
  }, [stream.title, stream.tags]);

  return (
    <Focusable onEnterPress={() => onClick(stream)}>
      {({ ref: focusRef, focused }) => {
        const setRefs = (node: HTMLDivElement | null) => {
          (focusRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        };
        return (
          <div 
            ref={setRefs}
            className={`stream-row ${focused ? "focused" : ""}`}
            onClick={() => onClick(stream)}
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
                  <span className="stream-play-action" style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--color-accent, #007aff)", fontWeight: 600 }}>
                    <span style={{ fontSize: "9px" }}>▶</span> Смотреть
                  </span>
                ) : (
                  <>
                    <span className="stream-stat-item seeds" title="Раздают (Сиды)">
                      <span className="stat-label">Раздают:</span>
                      <span className="stat-icon green">▲</span>
                      <span className="stream-peer-num">{stream.seeders ?? 0}</span>
                    </span>
                    <span className="stream-stat-item peers" title="Скачивают (Пиры)">
                      <span className="stat-label">Скачивают:</span>
                      <span className="stat-icon grey">▼</span>
                      <span className="stream-peer-num">{stream.leechers ?? 0}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      }}
    </Focusable>
  );
});

StreamRowComponent.displayName = "StreamRowComponent";
export default StreamRowComponent;
