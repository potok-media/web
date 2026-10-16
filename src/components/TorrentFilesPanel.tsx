import React from "react";
import { ArrowLeft, X } from "lucide-react";
import { EpisodeSelectorContent } from "./common/EpisodeSelectorContent";
import type { EpisodeSelectorContentProps } from "./common/EpisodeSelectorContent";
import { IconButton } from "./ui";
import { useWatchTogether } from "../context/watchTogetherState";
import { WatchTogetherRail } from "./watchTogether/WatchTogetherRail";

interface TorrentFilesPanelProps
  extends Omit<EpisodeSelectorContentProps, "isOpen" | "navigationAction"> {
  loading: boolean;
  loadingLabel: string;
  backLabel: string;
  busy?: boolean;
  error?: string | null;
  navigationAction?: "back" | "close";
}

const TorrentFilesSkeleton: React.FC<{
  title: string;
  loadingLabel: string;
  backLabel: string;
  onBack: () => void;
  navigationAction: "back" | "close";
}> = ({ title, loadingLabel, backLabel, onBack, navigationAction }) => (
  <div className="torrent-files-loading" role="status" aria-live="polite">
    <div className="torrent-files-loading__header">
      <IconButton className="modal-close-btn" onClick={onBack} aria-label={backLabel}>
        {navigationAction === "close" ? <X size="1.25rem" /> : <ArrowLeft size="1.25rem" />}
      </IconButton>
      <div className="torrent-files-loading__heading">
        <h2>{title}</h2>
        <span>{loadingLabel}</span>
      </div>
    </div>
    <div className="torrent-files-loading__rows" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => (
        <div className="torrent-files-loading__row" key={index}>
          <div className="skeleton-pulse torrent-files-loading__preview" />
          <div className="torrent-files-loading__copy">
            <div className="skeleton-pulse torrent-files-loading__line" />
            <div className="skeleton-pulse torrent-files-loading__line torrent-files-loading__line--short" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const TorrentFilesPanel: React.FC<TorrentFilesPanelProps> = ({
  loading,
  loadingLabel,
  backLabel,
  busy = false,
  error,
  isSaving = false,
  navigationAction = "back",
  ...selectorProps
}) => {
  const { role: coWatchRole } = useWatchTogether();

  const queue = error ? (
    <div className="torrent-files-loading" role="alert">
      <div className="torrent-files-loading__header">
        <IconButton className="modal-close-btn" onClick={selectorProps.onClose} aria-label={backLabel}>
          {navigationAction === "close" ? <X size="1.25rem" /> : <ArrowLeft size="1.25rem" />}
        </IconButton>
        <div className="torrent-files-loading__heading">
          <h2>{selectorProps.title}</h2>
          <span>{error}</span>
        </div>
      </div>
    </div>
  ) : loading ? (
    <TorrentFilesSkeleton
      title={selectorProps.title}
      loadingLabel={loadingLabel}
      backLabel={backLabel}
      onBack={selectorProps.onClose}
      navigationAction={navigationAction}
    />
  ) : (
    <EpisodeSelectorContent
      {...selectorProps}
      isOpen={true}
      isSaving={isSaving || busy}
      busyLabel={busy ? loadingLabel : undefined}
      navigationAction={navigationAction}
      presentation="playlist"
      hideHeader={Boolean(coWatchRole)}
    />
  );

  return (
    <section
      className={`torrent-files-panel ${coWatchRole ? "torrent-files-panel--co-watch" : ""}`}
      aria-busy={loading || busy}
    >
      {coWatchRole ? (
        <WatchTogetherRail queue={queue} queueCount={selectorProps.episodes.length} />
      ) : queue}
    </section>
  );
};

export default TorrentFilesPanel;
