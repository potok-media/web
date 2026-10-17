import React from "react";
import { usePlayback } from "../../context/PlaybackContext";
import { useWatchTogether } from "../../context/watchTogetherState";
import { WatchTogetherRail } from "../watchTogether/WatchTogetherRail";

export type PlaybackWorkspaceStageMode = "player" | "preview";
export type PlaybackWorkspaceVariant = "default" | "co-watch";

interface PlaybackWorkspaceProps {
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  backdropSrc?: string;
  stageMode?: PlaybackWorkspaceStageMode;
  stageContent?: React.ReactNode;
  mediaStageRef?: React.Ref<HTMLDivElement>;
  rail?: React.ReactNode;
  coWatchQueue?: React.ReactNode;
  coWatchQueueCount?: number;
  variant?: PlaybackWorkspaceVariant;
}

export const PlaybackWorkspace: React.FC<PlaybackWorkspaceProps> = ({
  id,
  className,
  style,
  backdropSrc,
  stageMode = "player",
  stageContent,
  mediaStageRef,
  rail,
  coWatchQueue,
  coWatchQueueCount = 0,
  variant = "default",
}) => {
  const { activePlayback, registerPlayerPortalTarget } = usePlayback();
  const watchTogether = useWatchTogether();
  const coWatchActive = Boolean(
    activePlayback && watchTogether.role && watchTogether.sessionActive,
  );
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
            <div ref={registerPlayerPortalTarget} className="streams-media-stage__surface">
              {stageContent}
            </div>
          </div>
          {resolvedRail}
        </div>
      </div>
    </div>
  );
};

export default PlaybackWorkspace;
