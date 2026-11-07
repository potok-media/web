import React from "react";
import { ListVideo } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { ActivePlayback } from "../../context/playbackTypes";
import { usePlayback } from "../../context/PlaybackContext";
import { useWatchTogether } from "../../context/watchTogetherState";
import { PlaybackStageLayout } from "../playback/PlaybackStageLayout";
import { InlinePlayer } from "../player/InlinePlayer";
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
  const navigate = useNavigate();
  const watchTogether = useWatchTogether();
  const { stopVideo } = usePlayback();
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

  // The room page owns close semantics: a guest leaves the room and goes home; the host leaves the
  // room and stops the playback (the lobby takes over once activePlayback clears).
  const handleClose = () => {
    if (watchTogether.role === "guest") {
      watchTogether.leave();
      navigate("/");
      return;
    }
    watchTogether.leave();
    stopVideo();
  };

  return (
    <PlaybackStageLayout
      backdropSrc={backdropSrc}
      mediaStageRef={mediaStageRef}
      variant="co-watch"
      rail={children ?? defaultRail}
      coWatchQueueCount={playback.playlist?.length || 1}
    >
      {playback.mount === "inline" ? (
        <InlinePlayer playback={playback} onClose={handleClose} />
      ) : null}
    </PlaybackStageLayout>
  );
};

export default WatchTogetherWorkspace;
