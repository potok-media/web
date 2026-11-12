import React from "react";
import type { InjectedSubtitleTrack } from "../../hooks/subtitles/subtitleTypes";

interface PlayerVideoSurfaceProps {
  videoRef: React.Ref<HTMLVideoElement>;
  injectedSubtitles: InjectedSubtitleTrack[];
  subtitleBlobUrls: React.RefObject<Record<string, string>>;
  srcResetCounter: number;
  currentSubtitleTrack: number;
  autoPlay: boolean;
  /** Anime4K pipeline is drawing this video — the surface hides the element (decoding and
   *  audio keep running) and shows the WebGL canvas composited on top of it instead. */
  upscaleActive?: boolean;
  upscaleCanvasRef?: React.Ref<HTMLCanvasElement>;
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
  /** localStorage key prefix for persisting volume/mute. Inline and overlay players keep separate prefs. */
  volumeStorageKeyPrefix?: string;
}

export const PlayerVideoSurface: React.FC<PlayerVideoSurfaceProps> = ({
  videoRef,
  injectedSubtitles,
  subtitleBlobUrls,
  srcResetCounter,
  currentSubtitleTrack,
  autoPlay,
  upscaleActive = false,
  upscaleCanvasRef,
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
  volumeStorageKeyPrefix = "potok_player",
}) => (
  <div className="artplayer-video-container" onClick={onTogglePlay} onDoubleClick={onToggleFullscreen}>
    <video
      ref={videoRef}
      crossOrigin="anonymous"
      style={upscaleActive ? { opacity: 0 } : undefined}
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
        localStorage.setItem(`${volumeStorageKeyPrefix}_volume`, video.volume.toString());
        localStorage.setItem(`${volumeStorageKeyPrefix}_muted`, video.muted.toString());
      }}
      onError={onError}
      onEnded={onEnded}
      autoPlay={autoPlay}
      playsInline
      preload="auto"
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
    {/* Always mounted so the engine has a stable attach target; blank/transparent until the
        Anime4K pipeline drives it. DOM order keeps it above the video and below the libass
        subtitle canvas and the player chrome. */}
    <canvas ref={upscaleCanvasRef} className="player-upscale-canvas" />
  </div>
);
