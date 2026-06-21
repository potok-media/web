import React from "react";
import { useTranslation } from "react-i18next";
import { formatTime } from "../../utils/playerHelpers";

interface PlayerResumeToastProps {
  resumeTime: number;
  onSeek: (time: number) => void;
  onClose: () => void;
}

export const PlayerResumeToast: React.FC<PlayerResumeToastProps> = ({
  resumeTime,
  onSeek,
  onClose,
}) => {
  const { t } = useTranslation("player");
  return (
    <div className="player-resume-toast" onClick={(e) => e.stopPropagation()}>
      <span className="player-resume-toast-text">
        {t("resume.continuedFrom", { time: formatTime(resumeTime) })}
      </span>
      <div className="player-resume-toast-divider" />
      <button
        className="player-resume-toast-btn"
        onClick={() => {
          onSeek(0);
          onClose();
        }}
      >
        {t("resume.startOver")}
      </button>
    </div>
  );
};
