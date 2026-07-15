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
import {
  collectSeasonNumbers,
  getStreamProvider,
  getStreamSeeders,
  getStreamSizeBytes,
  matchesSeasonFilter,
  type ExtendedStreamPayload,
} from "./streamListUtils";

export interface StreamListProps {
  streams: RawStreamPayload[];
  loading?: boolean;
  showFilters?: boolean;
  emptyText?: string;
  onSelectStream: (stream: RawStreamPayload) => void;
  onRefresh?: () => void;
  onBack?: () => void; // header back button (mid-width viewports where the info sidebar is hidden)
}

const mapStreamToUI = (stream: ExtendedStreamPayload, index: number, t: TFunction): StreamUIItem => {
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
  onBack,
}) => {
  const { t } = useTranslation("streams");
  const resolvedEmptyText = emptyText ?? t("empty");
  const [sortOption, setSortOption] = useState<string>("seedersDesc");
  const [qualityFilter, setQualityFilter] = useState<string>("all");
  const [activeTracker, setActiveTracker] = useState<string>("all");
  const [seasonFilter, setSeasonFilter] = useState<string>("all");

  const trackers = useMemo(() => {
    const extended = streams as ExtendedStreamPayload[];
    return Array.from(
      new Set(extended.map((s) => getStreamProvider(s)).filter((p) => !!p)),
    );
  }, [streams]);

  const availableSeasons = useMemo(
    () => collectSeasonNumbers(streams as ExtendedStreamPayload[]),
    [streams],
  );

  const processedStreams = useMemo(() => {
    const extendedStreams = streams as ExtendedStreamPayload[];
    const filtered = extendedStreams.filter((stream) => {
      const provider = getStreamProvider(stream);
      const matchesQuality =
        qualityFilter === "all" ||
        stream.title.toLowerCase().includes(qualityFilter.toLowerCase()) ||
        (stream.quality && stream.quality.toLowerCase().includes(qualityFilter.toLowerCase()));
      const matchesTracker = activeTracker === "all" || provider === activeTracker;
      const matchesSeason = matchesSeasonFilter(stream, seasonFilter);
      return matchesQuality && matchesTracker && matchesSeason;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortOption === "seedersDesc") {
        return getStreamSeeders(b) - getStreamSeeders(a);
      }
      if (sortOption === "sizeDesc") {
        return getStreamSizeBytes(b) - getStreamSizeBytes(a);
      }
      if (sortOption === "sizeAsc") {
        return getStreamSizeBytes(a) - getStreamSizeBytes(b);
      }
      return 0;
    });

    return sorted.map((stream, index) => ({
      raw: stream,
      ui: mapStreamToUI(stream, index, t),
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
    <div className="stream-list-container stream-list-container--gap">
      {showFilters && (
        <StreamFilterBar
          onBack={onBack}
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

              />
            );
          })
        ) : (
          <div className="stream-empty-state stream-empty-state--padded">
            <ShieldAlert size="2.5rem" opacity={0.5} />
            <span className="stream-empty-state-text stream-empty-state-text--center">
              {resolvedEmptyText}
            </span>
          </div>
        )}
      </ScrollView>
    </div>
  );
};

export default StreamList;
