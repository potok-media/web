import React, { type RefObject } from "react";
import type { InjectedSubtitleTrack } from "../../hooks/subtitles/subtitleTypes";

interface PlayerVideoSurfaceProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  injectedSubtitles: InjectedSubtitleTrack[];
  subtitleBlobUrls: RefObject<Record<string, string>>;
  srcResetCounter: number;
  currentSubtitleTrack: number;
  onTogglePlay: () => void;
  onToggleFullscreen: () => void;
  onPlayState: (playing: boolean) => void;
  onPlaying: () => void;
  onCanPlay: () => void;
  onSeeking: () => void;
  onSeeked: () => void;
  onWaiting: () => void;
  onStalled: () => void;
  onDurationChange: (duration: number) => void;
  onVolumeChange: (volume: number, muted: boolean) => void;
  onError: () => void;
  onEnded: () => void;
}

export const PlayerVideoSurface: React.FC<PlayerVideoSurfaceProps> = ({
  videoRef,
  injectedSubtitles,
  subtitleBlobUrls,
  srcResetCounter,
  currentSubtitleTrack,
  onTogglePlay,
  onToggleFullscreen,
  onPlayState,
  onPlaying,
  onCanPlay,
  onSeeking,
  onSeeked,
  onWaiting,
  onStalled,
  onDurationChange,
  onVolumeChange,
  onError,
  onEnded,
}) => (
  <div className="artplayer-video-container" onClick={onTogglePlay} onDoubleClick={onToggleFullscreen}>
    <video
      ref={videoRef}
      crossOrigin="anonymous"

      onPlay={() => onPlayState(true)}
      onPlaying={onPlaying}
      onCanPlay={onCanPlay}
      onSeeking={onSeeking}
      onSeeked={onSeeked}
      onWaiting={onWaiting}
      onStalled={onStalled}
      onPause={() => onPlayState(false)}
      onDurationChange={(e) => onDurationChange(e.currentTarget.duration)}
      onVolumeChange={(e) => {
        const video = e.currentTarget;
        onVolumeChange(video.volume, video.muted);
        localStorage.setItem("potok_player_volume", video.volume.toString());
        localStorage.setItem("potok_player_muted", video.muted.toString());
      }}
      onError={onError}
      onEnded={onEnded}
      autoPlay
    >
      {injectedSubtitles.map((track, index) => {
        const isAss = track.codec === "ass" || track.codec === "ssa";
        const isUpload = track.src?.startsWith("blob:");
        const src = isAss
          ? undefined
          : isUpload
            ? subtitleBlobUrls.current[track.id] || track.src
            : undefined;
        return (
          <track
            key={`${track.id}_${srcResetCounter}`}
            kind="subtitles"
            label={track.label}
            srcLang={track.srclang}
            src={src}
            default={currentSubtitleTrack === index}
          />
        );
      })}
    </video>
  </div>
);