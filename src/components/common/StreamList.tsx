import React, { useState, useMemo } from "react";
import { ShieldAlert } from "lucide-react";
import type { RawStreamPayload } from "../../network/SDKTypes";
import type { StreamUIItem } from "../../network/ApiTypes";
import { StreamFilterBar } from "../StreamFilterBar";
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
  nounPlurals?: [string, string, string];
}

const mapStreamToUI = (stream: RawStreamPayload & {
  sizeBytes?: number;
  seeders?: number;
  leechers?: number;
  tracker?: string;
  publishDate?: string;
}, index: number): StreamUIItem => {
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

  const seeds = stream.seeds !== undefined ? stream.seeds : stream.seeders;
  const peers = stream.peers !== undefined ? stream.peers : stream.leechers;
  const provider = stream.provider || stream.tracker || "Источник";
  const sizeBytes = typeof stream.size === 'number' ? stream.size : stream.sizeBytes;

  return {
    id: stream.url || stream.magnet || stream.hash || `${stream.title}-${index}`,
    title: stream.title || "Источник",
    sizeLabel: stream.quality ? stream.quality.toUpperCase() : "",
    sizeBytes,
    tracker: provider,
    seeders: seeds,
    leechers: peers,
    publishDate: stream.publishDate,
    tags: [
      ...(stream.kind && stream.kind !== "torrent"
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
  nounPlurals = ["источник", "источника", "источников"],
}) => {
  const [sortOption, setSortOption] = useState<string>("seedersDesc");
  const [qualityFilter, setQualityFilter] = useState<string>("all");
  const [activeTracker, setActiveTracker] = useState<string>("all");

  const trackers = useMemo(() => {
    return Array.from(new Set(streams.map((s) => s.provider || (s as any).tracker).filter((p): p is string => !!p)));
  }, [streams]);

  const filteredAndSortedStreams = useMemo(() => {
    const filtered = streams.filter((t) => {
      const provider = t.provider || (t as any).tracker || "";
      const matchesQuality = qualityFilter === "all" 
        || t.title.toLowerCase().includes(qualityFilter.toLowerCase())
        || (t.quality && t.quality.toLowerCase().includes(qualityFilter.toLowerCase()));
      const matchesTracker = activeTracker === "all" || provider === activeTracker;
      return matchesQuality && matchesTracker;
    });

    return [...filtered].sort((a, b) => {
      if (sortOption === "seedersDesc") {
        const seedsA = a.seeds !== undefined ? a.seeds : (a as any).seeders ?? 0;
        const seedsB = b.seeds !== undefined ? b.seeds : (b as any).seeders ?? 0;
        return seedsB - seedsA;
      }
      if (sortOption === "sizeDesc") {
        const sizeA = typeof a.size === 'number' ? a.size : (a as any).sizeBytes ?? 0;
        const sizeB = typeof b.size === 'number' ? b.size : (b as any).sizeBytes ?? 0;
        return sizeB - sizeA;
      }
      if (sortOption === "sizeAsc") {
        const sizeA = typeof a.size === 'number' ? a.size : (a as any).sizeBytes ?? 0;
        const sizeB = typeof b.size === 'number' ? b.size : (b as any).sizeBytes ?? 0;
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
        <StreamFilterBar
          countLabel={`${filteredAndSortedStreams.length} ${getPluralForm(filteredAndSortedStreams.length, nounPlurals)}`}
          qualityFilter={qualityFilter}
          setQualityFilter={setQualityFilter}
          activeTracker={activeTracker}
          setActiveTracker={setActiveTracker}
          trackers={trackers}
          onRefresh={handleRefreshClick}
          showSort={true}
          sortOption={sortOption}
          setSortOption={setSortOption}
          trackerLabel="Провайдер"
          allTrackersLabel="Все источники"
        />
      )}

      <div className="streams-results-list">
        {loading ? (
          <StreamSkeletonList />
        ) : filteredAndSortedStreams.length > 0 ? (
          filteredAndSortedStreams.map((stream, index) => {
            const streamUI = mapStreamToUI(stream, index);
            return (
              <StreamRowComponent
                key={`${streamUI.id || "stream"}-${index}`}
                stream={streamUI}
                onClick={() => onSelectStream(stream)}
              />
            );
          })
        ) : (
          <div className="stream-empty-state" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "var(--space-s)", padding: "var(--space-xl) var(--space-m)", color: "var(--text-secondary)" }}>
            <ShieldAlert size={40} opacity={0.5} />
            <span className="stream-empty-state-text" style={{ font: "var(--font-body)", textAlign: "center" }}>
              {emptyText}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StreamList;
