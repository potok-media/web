import React, { useState, useMemo } from "react";
import { ShieldAlert } from "lucide-react";
import type { RawStreamPayload } from "../../network/SDKTypes";
import type { TorrentSearchResult } from "../../network/ApiTypes";
import { TorrentsFilterBar } from "../TorrentsFilterBar";
import StreamRowComponent from "../StreamRowComponent";
import StreamSkeletonList from "../StreamSkeletonList";
import { getPluralForm } from "../../utils/formatters";

export interface StreamListProps {
  streams: RawStreamPayload[];
  loading?: boolean;
  showFilters?: boolean;
  emptyText?: string;
  onSelectStream: (stream: RawStreamPayload) => void;
  onRefresh?: () => void;
}

const mapStreamToTorrent = (stream: RawStreamPayload, index: number): TorrentSearchResult => {
  const voiceTags = stream.voice
    ? stream.voice
        .split(/[,;]+/)
        .map((v) => v.trim())
        .filter(Boolean)
        .map((v) => {
          const vLower = v.toLowerCase();
          let emoji = "🎙️";
          if (vLower.includes("original") || vLower.includes("japan") || vLower.includes("eng")) {
            if (vLower.includes("sub") || vLower.includes("суб")) {
              emoji = "💬";
            } else {
              emoji = "🌐";
            }
          } else if (vLower.includes("sub") || vLower.includes("суб")) {
            emoji = "💬";
          }
          return { kind: "voice", value: `${emoji} ${v}` };
        })
    : [];

  return {
    id: stream.url || stream.magnet || stream.hash || `${stream.title}-${index}`,
    title: stream.title || "Онлайн источник",
    sizeLabel: stream.quality ? stream.quality.toUpperCase() : "",
    sizeBytes: typeof stream.size === 'number' ? stream.size : undefined,
    tracker: stream.provider || "Онлайн источник",
    seeders: stream.seeds,
    leechers: stream.peers,
    tags: [
      ...(stream.kind
        ? [{ kind: "kind", value: `⚡ ${(stream.kind === "hls" || stream.kind === "m3u8") ? "M3U8" : stream.kind.toUpperCase()}` }]
        : []),
      ...voiceTags,
    ],
  };
};

export const StreamList: React.FC<StreamListProps> = ({
  streams,
  loading = false,
  showFilters = true,
  emptyText = "Потоков не найдено. Попробуйте сменить фильтры.",
  onSelectStream,
  onRefresh,
}) => {
  const [sortOption] = useState<string>("seedersDesc");
  const [qualityFilter, setQualityFilter] = useState<string>("all");
  const [activeTracker, setActiveTracker] = useState<string>("all");

  const trackers = useMemo(() => {
    return Array.from(new Set(streams.map((s) => s.provider).filter((p): p is string => !!p)));
  }, [streams]);

  const filteredAndSortedStreams = useMemo(() => {
    const filtered = streams.filter((t) => {
      const matchesQuality = qualityFilter === "all" 
        || t.title.toLowerCase().includes(qualityFilter.toLowerCase())
        || (t.quality && t.quality.toLowerCase().includes(qualityFilter.toLowerCase()));
      const matchesTracker = activeTracker === "all" || t.provider === activeTracker;
      return matchesQuality && matchesTracker;
    });

    return [...filtered].sort((a, b) => {
      if (sortOption === "seedersDesc") {
        return (b.seeds ?? 0) - (a.seeds ?? 0);
      }
      if (sortOption === "sizeDesc") {
        const sizeA = typeof a.size === 'number' ? a.size : 0;
        const sizeB = typeof b.size === 'number' ? b.size : 0;
        return sizeB - sizeA;
      }
      if (sortOption === "sizeAsc") {
        const sizeA = typeof a.size === 'number' ? a.size : 0;
        const sizeB = typeof b.size === 'number' ? b.size : 0;
        return sizeA - sizeB;
      }
      return 0;
    });
  }, [streams, qualityFilter, activeTracker, sortOption]);

  const handleRefreshClick = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  return (
    <div className="stream-list-container" style={{ display: "flex", flexDirection: "column", gap: "var(--space-m)" }}>
      {showFilters && (
        <TorrentsFilterBar
          countLabel={`${filteredAndSortedStreams.length} ${getPluralForm(filteredAndSortedStreams.length, ["источник", "источника", "источников"])}`}
          qualityFilter={qualityFilter}
          setQualityFilter={setQualityFilter}
          activeTracker={activeTracker}
          setActiveTracker={setActiveTracker}
          trackers={trackers}
          onRefresh={handleRefreshClick}
          showSort={false}
          trackerLabel="Провайдер"
          allTrackersLabel="Все источники"
        />
      )}

      <div className="torrents-results-list">
        {loading ? (
          <StreamSkeletonList />
        ) : filteredAndSortedStreams.length > 0 ? (
          filteredAndSortedStreams.map((stream, index) => {
            const torrent = mapStreamToTorrent(stream, index);
            return (
              <StreamRowComponent
                key={torrent.id || index}
                torrent={torrent}
                onClick={() => onSelectStream(stream)}
              />
            );
          })
        ) : (
          <div className="torrent-empty-state" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "var(--space-s)", padding: "var(--space-xl) var(--space-m)", color: "var(--text-secondary)" }}>
            <ShieldAlert size={40} opacity={0.5} />
            <span className="torrent-empty-state-text" style={{ font: "var(--font-body)", textAlign: "center" }}>
              {emptyText}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StreamList;
