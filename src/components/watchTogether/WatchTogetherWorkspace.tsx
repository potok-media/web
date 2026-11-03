import React from "react";
import { ListVideo } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ActivePlayback } from "../../context/playbackTypes";
import { PlaybackWorkspace } from "../playback/PlaybackWorkspace";
import { WatchTogetherQueuePanel } from "./WatchTogetherQueuePanel";

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
  // A session descriptor without a playlist (e.g. a direct movie stream) has no queue to show —
  // fall back to the current-title card.
  const defaultRail = playback.playlist?.length ? (
    <WatchTogetherQueuePanel playback={playback} />
  ) : (
    <div className="wt-queue-current">
      <ListVideo size="1.5rem" />
      <div>
        <span>{t("watchTogether:queue")}</span>
        <strong>{playback.title}</strong>
      </div>
    </div>
  );

  return (
    <PlaybackWorkspace
      backdropSrc={backdropSrc}
      mediaStageRef={mediaStageRef}
      rail={children ?? defaultRail}
      coWatchQueueCount={playback.playlist?.length || 1}
      variant="co-watch"
    />
  );
};

export default WatchTogetherWorkspace;
