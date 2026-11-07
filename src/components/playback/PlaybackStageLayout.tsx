import React from "react";
import { usePlayback } from "../../context/PlaybackContext";
import { useWatchTogether } from "../../context/watchTogetherState";
import { WatchTogetherRail } from "../watchTogether/WatchTogetherRail";

export type PlaybackStageLayoutVariant = "default" | "co-watch";

interface PlaybackStageLayoutProps {
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  backdropSrc?: string;
  mediaStageRef?: React.Ref<HTMLDivElement>;
  /** Content of the media stage: an InlinePlayer or the preview overlay. */
  children?: React.ReactNode;
  rail?: React.ReactNode;
  coWatchQueue?: React.ReactNode;
  coWatchQueueCount?: number;
  variant?: PlaybackStageLayoutVariant;
}

/**
 * Host-side playback page layout: backdrop + centered shell + media stage + optional right rail.
 * Pure layout — it never mounts a player itself; hosts put an InlinePlayer into the stage (or leave
 * preview content there). The co-watch shell wraps the rail while a room is live. The stage surface
 * styling follows the mounted playback: black box for an inline player, transparent for preview
 * content — derived from activePlayback.mount, not a separate state axis.
 */
export const PlaybackStageLayout: React.FC<PlaybackStageLayoutProps> = ({
  id,
  className,
  style,
  backdropSrc,
  mediaStageRef,
  children,
  rail,
  coWatchQueue,
  coWatchQueueCount = 0,
  variant = "default",
}) => {
  const { activePlayback } = usePlayback();
  const watchTogether = useWatchTogether();
  const coWatchActive = Boolean(
    activePlayback && watchTogether.role && watchTogether.sessionActive,
  );
  const stageMode = activePlayback?.mount === "inline" ? "player" : "preview";
  const resolvedRail = coWatchActive ? (
    <section className="streams-page-content">
      <section className="torrent-files-panel torrent-files-panel--co-watch">
        <WatchTogetherRail queue={coWatchQueue ?? rail} queueCount={coWatchQueueCount} />
      </section>
    </section>
  ) : rail;
  const hasRail = resolvedRail !== null && resolvedRail !== undefined;
  const layoutVariantClass = variant === "co-watch" || coWatchActive
    ? " streams-page-layout--co-watch"
    : "";
  const customClass = className ? ` ${className}` : "";

  return (
    <div
      id={id}
      className={`streams-page-layout playback-workspace${layoutVariantClass}${customClass}`}
      style={style}
    >
      <div
        className="streams-page-backdrop"
        style={{ "--backdrop-image": `url(${backdropSrc || ""})` } as React.CSSProperties}
      />
      <div
        className={`streams-page-shell streams-page-shell--workspace${hasRail ? " streams-page-shell--split" : ""}`}
      >
        <div className={`streams-inline-workspace${hasRail ? " streams-inline-workspace--split" : ""}`}>
          <div ref={mediaStageRef} className={`streams-media-stage streams-media-stage--${stageMode}`}>
            <div className="streams-media-stage__surface">
              {children}
            </div>
          </div>
          {resolvedRail}
        </div>
      </div>
    </div>
  );
};

export default PlaybackStageLayout;
