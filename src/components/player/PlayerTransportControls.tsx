import React from "react";
import { useTranslation } from "react-i18next";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { TimeDisplay } from "./TimeDisplay";
import { IconButton, RangeInput } from "../ui";

interface PlayerTransportControlsProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isPlaying: boolean;
  onTogglePlay: () => void;
  duration: number;
  onSeekBy: (delta: number) => void;
  volume: number;
  isMuted: boolean;
  onVolumeChange: (vol: number) => void;
  onToggleMuted: () => void;
  seekOffset?: number;
  seekPreview?: number | null;
  hasPlaylist?: boolean;
  hasPrev?: boolean;
  hasNext?: boolean;
  playlistIndex?: number;
  onSelectPlaylistItem?: (index: number) => void;
}

export const PlayerTransportControls: React.FC<PlayerTransportControlsProps> = ({
  videoRef,
  isPlaying,
  onTogglePlay,
  duration,
  onSeekBy,
  volume,
  isMuted,
  onVolumeChange,
  onToggleMuted,
  seekOffset = 0,
  seekPreview = null,
  hasPlaylist,
  hasPrev,
  hasNext,
  playlistIndex,
  onSelectPlaylistItem,
}) => {
  const { t } = useTranslation("player");

  const changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    onVolumeChange(parseFloat(e.target.value));
  };

  const stopControlEvent = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div className="controls-group left">
      {hasPlaylist && (
        <IconButton
          className="control-icon-btn"
          onMouseDown={stopControlEvent}
          onClick={(e) => {
            stopControlEvent(e);
            onSelectPlaylistItem?.((playlistIndex ?? 0) - 1);
          }}
          disabled={!hasPrev}
          title={t("controls.prevEpisode", { defaultValue: "Previous episode" })}
          aria-label={t("controls.prevEpisode", { defaultValue: "Previous episode" })}
        >
          <SkipBack size="1.25rem" />
        </IconButton>
      )}

      <IconButton
        className="control-icon-btn"
        onMouseDown={stopControlEvent}
        onClick={(e) => {
          stopControlEvent(e);
          onSeekBy(-10);
        }}
        title={t("controls.rewind10Title")}
        aria-label={t("controls.rewind10Aria")}
      >
        <RotateCcw size="1.125rem" />
      </IconButton>

      <IconButton
        className="control-icon-btn"
        onMouseDown={stopControlEvent}
        onClick={(e) => {
          stopControlEvent(e);
          onTogglePlay();
        }}
        aria-label={isPlaying ? t("controls.pause") : t("controls.play")}
      >
        {isPlaying ? <Pause size="1.25rem" fill="currentColor" /> : <Play size="1.25rem" fill="currentColor" />}
      </IconButton>

      <IconButton
        className="control-icon-btn"
        onMouseDown={stopControlEvent}
        onClick={(e) => {
          stopControlEvent(e);
          onSeekBy(10);
        }}
        title={t("controls.forward10Title")}
        aria-label={t("controls.forward10Aria")}
      >
        <RotateCw size="1.125rem" />
      </IconButton>

      {hasPlaylist && (
        <IconButton
          className="control-icon-btn"
          onMouseDown={stopControlEvent}
          onClick={(e) => {
            stopControlEvent(e);
            onSelectPlaylistItem?.((playlistIndex ?? 0) + 1);
          }}
          disabled={!hasNext}
          title={t("controls.nextEpisode", { defaultValue: "Next episode" })}
          aria-label={t("controls.nextEpisode", { defaultValue: "Next episode" })}
        >
          <SkipForward size="1.25rem" />
        </IconButton>
      )}

      <div className="volume-control-wrapper">
        <IconButton
          className="control-icon-btn"
          onMouseDown={stopControlEvent}
          onClick={(e) => {
            stopControlEvent(e);
            onToggleMuted();
          }}
          aria-label={t("controls.toggleMute")}
        >
          {isMuted || volume === 0 ? <VolumeX size="1.25rem" /> : volume < 0.5 ? <Volume1 size="1.25rem" /> : <Volume2 size="1.25rem" />}
        </IconButton>
        <RangeInput
          min={0}
          max={1}
          step={0.05}
          value={isMuted ? 0 : volume}
          onChange={changeVolume}
          className="volume-slider"
          style={{ "--volume-percent": `${(isMuted ? 0 : volume) * 100}%` } as React.CSSProperties}
          aria-label={t("controls.volume")}
        />
      </div>

      <TimeDisplay videoRef={videoRef} initialDuration={duration} seekOffset={seekOffset} seekPreview={seekPreview} />
    </div>
  );
};