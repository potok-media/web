import React from "react";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PlayerResumeToast } from "./PlayerResumeToast";
import { PlayerLoadingOverlay } from "./PlayerLoadingOverlay";
import { PlayerBufferingSpinner } from "./PlayerBufferingSpinner";
import { PlayerErrorOverlay } from "./PlayerErrorOverlay";

interface LoadingState {
  title: string;
  subtitle: string;
  step: number;
}

interface PlayerOverlayStackProps {
  showResumeToast: boolean;
  resumeTime: number;
  onSeek: (time: number) => void;
  onDismissResume: () => void;
  isMetadataLoading: boolean;
  loadingState: LoadingState | null;
  showSpinner: boolean;
  playerError: string | null;
  streamUrl: string;
  onRefresh: () => void;
  onClose: () => void;
  isNetworkOffline: boolean;
}

export const PlayerOverlayStack: React.FC<PlayerOverlayStackProps> = ({
  showResumeToast,
  resumeTime,
  onSeek,
  onDismissResume,
  isMetadataLoading,
  loadingState,
  showSpinner,
  playerError,
  streamUrl,
  onRefresh,
  onClose,
  isNetworkOffline,
}) => {
  const { t } = useTranslation("player");

  return (
    <>
      {showResumeToast && (
        <PlayerResumeToast resumeTime={resumeTime} onSeek={onSeek} onClose={onDismissResume} />
      )}
      {isMetadataLoading && loadingState && (
        <PlayerLoadingOverlay loadingState={loadingState} onClose={onClose} />
      )}
      {showSpinner && !isMetadataLoading && !playerError && <PlayerBufferingSpinner />}
      {playerError && (
        <PlayerErrorOverlay
          error={playerError}
          streamUrl={streamUrl}
          onRefresh={onRefresh}
          onClose={onClose}
        />
      )}
      {isNetworkOffline && (
        <div className="player-network-offline-banner">
          <AlertTriangle size="1.125rem" />
          <span>{t("offline.banner")}</span>
        </div>
      )}
    </>
  );
};