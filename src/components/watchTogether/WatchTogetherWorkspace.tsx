import React from "react";
import { ListVideo } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePlayback } from "../../context/PlaybackContext";
import type { ActivePlayback } from "../../context/playbackTypes";
import { WatchTogetherRail } from "./WatchTogetherRail";

interface WatchTogetherWorkspaceProps {
  playback: ActivePlayback;
  backdropSrc?: string;
  mediaStageRef?: React.Ref<HTMLDivElement>;
  children?: React.ReactNode;
}

export const WatchTogetherWorkspace: React.FC<WatchTogetherWorkspaceProps> = ({
  playback,
  backdropSrc,
  mediaStageRef,
  children,
}) => {
  const { t } = useTranslation("streams");
  const { registerPlayerPortalTarget } = usePlayback();
  const defaultRail = (
    <section className="streams-page-content">
      <section className="torrent-files-panel torrent-files-panel--co-watch">
        <WatchTogetherRail
          queueCount={1}
          queue={(
            <div className="wt-queue-current">
              <ListVideo size="1.5rem" />
              <div>
                <span>{t("watchTogether:queue")}</span>
                <strong>{playback.title}</strong>
              </div>
            </div>
          )}
        />
      </section>
    </section>
  );

  return (
    <div className="streams-page-layout streams-page-layout--co-watch">
      <div
        className="streams-page-backdrop"
        style={{ "--backdrop-image": `url(${backdropSrc || ""})` } as React.CSSProperties}
      />
      <div className="streams-page-shell streams-page-shell--workspace streams-page-shell--split">
        <div className="streams-inline-workspace streams-inline-workspace--split">
          <div ref={mediaStageRef} className="streams-media-stage streams-media-stage--player">
            <div ref={registerPlayerPortalTarget} className="streams-media-stage__surface" />
          </div>
          {children ?? defaultRail}
        </div>
      </div>
    </div>
  );
};

export default WatchTogetherWorkspace;
