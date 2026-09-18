import React, { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ShieldAlert } from "lucide-react";
import type { RawStreamPayload } from "@potok/sdk-types";
import type { StreamUIItem } from "../../network/ApiTypes";
import { StreamFilterBar } from "../StreamFilterBar";
import StreamRowComponent from "../StreamRowComponent";
import StreamSkeletonList from "../StreamSkeletonList";
import { ScrollView } from "./ScrollView";
import {
  collectSeasonNumbers,
  findStreamByIdentity,
  getStreamProvider,
  getStreamSeeders,
  getStreamSizeBytes,
  isSameStream,
  mapStreamToUI,
  matchesSeasonFilter,
  mergePinStream,
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
  isSearching?: boolean;
  searchStartedAt?: number | null;
  searchTimeoutMs?: number;
  lastSelected?: RawStreamPayload | null;
}

export const StreamList: React.FC<StreamListProps> = ({
  streams,
  loading = false,
  showFilters = true,
  emptyText,
  onSelectStream,
  onRefresh,
  onBack,
  isSearching = false,
  searchStartedAt = null,
  searchTimeoutMs,
  lastSelected = null,
}) => {
  const { t } = useTranslation("streams");
  const resolvedEmptyText = emptyText ?? t("empty");
  const [sortOption, setSortOption] = useState<string>("seedersDesc");
  const [qualityFilter, setQualityFilter] = useState<string>("all");
  const [activeTracker, setActiveTracker] = useState<string>("all");
  const [seasonFilter, setSeasonFilter] = useState<string>("all");

  const extendedStreams = streams as ExtendedStreamPayload[];
  const storedPin = lastSelected as ExtendedStreamPayload | null;

  const trackers = useMemo(
    () => Array.from(new Set(extendedStreams.map((s) => getStreamProvider(s)).filter((p) => !!p))),
    [extendedStreams],
  );

  const availableSeasons = useMemo(
    () => collectSeasonNumbers(extendedStreams),
    [extendedStreams],
  );

  const pinLive = useMemo(
    () => (storedPin ? findStreamByIdentity(extendedStreams, storedPin) : undefined),
    [extendedStreams, storedPin],
  );

  const pinRaw = useMemo(
    () => (storedPin ? mergePinStream(storedPin, pinLive) : undefined),
    [storedPin, pinLive],
  );

  const pinItem = useMemo(() => {
    if (!pinRaw) return null;
    return {
      raw: pinRaw,
      ui: mapStreamToUI(pinRaw, -1, t, {
        isLastSelected: true,
        missingFromResults: !loading && !pinLive,
      }),
    };
  }, [pinRaw, pinLive, loading, t]);

  const processedStreams = useMemo(() => {
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
      if (sortOption === "seedersDesc") return getStreamSeeders(b) - getStreamSeeders(a);
      if (sortOption === "sizeDesc") return getStreamSizeBytes(b) - getStreamSizeBytes(a);
      if (sortOption === "sizeAsc") return getStreamSizeBytes(a) - getStreamSizeBytes(b);
      return 0;
    });

    return sorted.map((stream, index) => ({ raw: stream, ui: mapStreamToUI(stream, index, t) }));
  }, [extendedStreams, qualityFilter, activeTracker, seasonFilter, sortOption, t]);

  const displayStreams = useMemo(() => {
    if (!pinRaw) return processedStreams;
    return processedStreams.filter((item) => !isSameStream(item.raw, pinRaw));
  }, [processedStreams, pinRaw]);

  const rawById = useMemo(() => {
    const map = new Map<string, RawStreamPayload>();
    if (pinItem) map.set(pinItem.ui.id, pinItem.raw);
    displayStreams.forEach((item) => map.set(item.ui.id, item.raw));
    return map;
  }, [displayStreams, pinItem]);

  const handleSelectStream = useCallback((ui: StreamUIItem) => {
    const raw = rawById.get(ui.id);
    if (raw) onSelectStream(raw);
  }, [rawById, onSelectStream]);

  const handleRefreshClick = () => {
    if (onRefresh) onRefresh();
  };

  const showSkeletons = loading && displayStreams.length === 0;
  const showEmpty = !showSkeletons && displayStreams.length === 0 && !pinItem;

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
          isSearching={isSearching}
          searchStartedAt={searchStartedAt}
          searchTimeoutMs={searchTimeoutMs}
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
        {pinItem && (
          <StreamRowComponent
            key={`last-selected-${pinItem.ui.id}`}
            stream={pinItem.ui}
            onClick={handleSelectStream}
          />
        )}
        {showSkeletons ? (
          <StreamSkeletonList />
        ) : displayStreams.length > 0 ? (
          displayStreams.map((item, index) => (
            <StreamRowComponent
              key={`${item.ui.id || "stream"}-${index}`}
              stream={item.ui}
              onClick={handleSelectStream}
            />
          ))
        ) : showEmpty ? (
          <div className="stream-empty-state stream-empty-state--padded">
            <ShieldAlert size="2.5rem" opacity={0.5} />
            <span className="stream-empty-state-text stream-empty-state-text--center">
              {resolvedEmptyText}
            </span>
          </div>
        ) : null}
      </ScrollView>
    </div>
  );
};

export default StreamList;
