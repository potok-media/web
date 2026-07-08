import React, { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { ShieldAlert } from "lucide-react";
import type { RawStreamPayload } from "@potok/sdk-types";
import type { StreamUIItem } from "../../network/ApiTypes";
import { StreamFilterBar } from "../StreamFilterBar";
import StreamRowComponent from "../StreamRowComponent";
import StreamSkeletonList from "../StreamSkeletonList";
import { ScrollView } from "./ScrollView";


export interface StreamListProps {
  streams: RawStreamPayload[];
  loading?: boolean;
  showFilters?: boolean;
  emptyText?: string;
  onSelectStream: (stream: RawStreamPayload) => void;
  onRefresh?: () => void;
}

const mapStreamToUI = (stream: RawStreamPayload & {
  sizeBytes?: number;
  seeders?: number;
  leechers?: number;
  tracker?: string;
  publishDate?: string;
}, index: number, t: TFunction): StreamUIItem => {
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
  const provider = stream.provider || stream.tracker || t("source");
  const sizeBytes = typeof stream.size === 'number' ? stream.size : stream.sizeBytes;

  return {
    id: stream.url || stream.magnet || stream.hash || `${stream.title}-${index}`,
    title: stream.title || t("source"),
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
  emptyText,
  onSelectStream,
  onRefresh,
}) => {
  const { t } = useTranslation("streams");
  const resolvedEmptyText = emptyText ?? t("empty");
  const [sortOption, setSortOption] = useState<string>("seedersDesc");
  const [qualityFilter, setQualityFilter] = useState<string>("all");
  const [activeTracker, setActiveTracker] = useState<string>("all");
  const [seasonFilter, setSeasonFilter] = useState<string>("all");

  const trackers = useMemo(() => {
    return Array.from(new Set(streams.map((s) => s.provider || (s as any).tracker).filter((p): p is string => !!p)));
  }, [streams]);

  const availableSeasons = useMemo(() => {
    const set = new Set<number>();
    streams.forEach((s: any) => {
      if (s.seasons) {
        s.seasons.forEach((num: number) => set.add(num));
      } else if (s.season !== undefined && s.season !== null && s.season !== 0) {
        set.add(s.season);
      }
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [streams]);

  const processedStreams = useMemo(() => {
    const filtered = streams.filter((t) => {
      const provider = t.provider || (t as any).tracker || "";
      const matchesQuality = qualityFilter === "all" 
        || t.title.toLowerCase().includes(qualityFilter.toLowerCase())
        || (t.quality && t.quality.toLowerCase().includes(qualityFilter.toLowerCase()));
      const matchesTracker = activeTracker === "all" || provider === activeTracker;
      const matchesSeason = seasonFilter === "all"
        || (t as any).seasons?.includes(Number(seasonFilter))
        || (t as any).season === Number(seasonFilter)
        || (seasonFilter === "none" && !(t as any).seasons && ((t as any).season === undefined || (t as any).season === null || (t as any).season === 0));
      return matchesQuality && matchesTracker && matchesSeason;
    });

    const sorted = [...filtered].sort((a, b) => {
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

    return sorted.map((stream, index) => ({
      raw: stream,
      ui: mapStreamToUI(stream, index, t)
    }));
  }, [streams, qualityFilter, activeTracker, seasonFilter, sortOption, t]);

  const displayStreams = processedStreams;

  // Map UI item id -> raw payload so a single stable onClick can resolve the raw
  // stream, keeping StreamRowComponent's React.memo intact during D-pad scrolling.
  const rawById = useMemo(() => {
    const map = new Map<string, RawStreamPayload>();
    displayStreams.forEach((item) => map.set(item.ui.id, item.raw));
    return map;
  }, [displayStreams]);

  const handleSelectStream = useCallback((ui: StreamUIItem) => {
    const raw = rawById.get(ui.id);
    if (raw) {
      onSelectStream(raw);
    }
  }, [rawById, onSelectStream]);

  const handleRefreshClick = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  return (
    <div className="stream-list-container" style={{ display: "flex", flexDirection: "column", gap: "var(--space-m)" }}>
      {showFilters && (
        <StreamFilterBar
          countLabel={t("countLabel", { count: processedStreams.length })}
          qualityFilter={qualityFilter}
          setQualityFilter={setQualityFilter}
          activeTracker={activeTracker}
          setActiveTracker={setActiveTracker}
          trackers={trackers}
          onRefresh={handleRefreshClick}
          showSort={true}
          sortOption={sortOption}
          setSortOption={setSortOption}
          trackerLabel={t("filter.providerLabel")}
          allTrackersLabel={t("filter.allSources")}
          seasonFilter={seasonFilter}
          setSeasonFilter={setSeasonFilter}
          availableSeasons={availableSeasons}
        />
      )}

      <ScrollView orientation="vertical" className="streams-results-list" trackClassName="streams-results-track">
        {loading ? (
          <StreamSkeletonList />
        ) : displayStreams.length > 0 ? (
          displayStreams.map((item, index) => {
            return (
              <StreamRowComponent
                key={`${item.ui.id || "stream"}-${index}`}
                stream={item.ui}
                onClick={handleSelectStream}
                focusKey={index === 0 ? "STREAM_FIRST_ROW" : undefined}
              />
            );
          })
        ) : (
          <div className="stream-empty-state" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "var(--space-s)", padding: "var(--space-xl) var(--space-m)", color: "var(--text-secondary)" }}>
            <ShieldAlert size="2.5rem" opacity={0.5} />
            <span className="stream-empty-state-text" style={{ font: "var(--font-body)", textAlign: "center" }}>
              {resolvedEmptyText}
            </span>
          </div>
        )}
      </ScrollView>
    </div>
  );
};

export default StreamList;
