import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Maximize,
  Minimize,
  Captions,
  Activity,
  Settings,
  ListVideo,
  Volume2,
  Airplay,
  MessageSquare,
} from "lucide-react";
import { TrackSelectorDropdown } from "./TrackSelectorDropdown";
import { CaptionsLoadingIcon } from "./SubtitleLoadingIcons";
import { IconButton, cx } from "../ui";
import { usePlayback } from "../../context/PlaybackContext";
import { useWatchTogether } from "../../context/watchTogetherState";
import type { ActivePlayback } from "../../context/playbackTypes";

interface TrackItem {
  id: number;
  name: string;
  loading?: boolean;
  error?: boolean;
}

interface PlayerUtilityControlsProps {
  showStats: boolean;
  onToggleStats: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  audioTracks: TrackItem[];
  currentAudioTrack: number;
  onSelectAudioTrack: (id: number) => void;
  showAudioMenu: boolean;
  onToggleAudioMenu: () => void;
  subtitleTracks: TrackItem[];
  subtitlesLoading?: boolean;
  currentSubtitleTrack: number;
  onSelectSubtitleTrack: (id: number) => void;
  showSubtitleMenu: boolean;
  onToggleSubtitleMenu: () => void;
  onUploadSubtitle?: (file: File) => void;
  onAddSubtitleUrl?: (url: string) => Promise<void>;
  qualityLevels: TrackItem[];
  currentQualityLevel: number;
  onSelectQualityLevel: (id: number) => void;
  showQualityMenu: boolean;
  onToggleQualityMenu: () => void;
  playlistItems: TrackItem[];
  playlistIndex?: number;
  onSelectPlaylistItem?: (index: number) => void;
  playlistDisabled?: boolean;
  showPlaylistMenu?: boolean;
  onTogglePlaylistMenu?: () => void;
  anySubReady: boolean;
  playback: ActivePlayback; // the player's actual descriptor (plugin players bypass the global PlaybackContext)
}

export const PlayerUtilityControls: React.FC<PlayerUtilityControlsProps> = ({
  showStats,
  onToggleStats,
  isFullscreen,
  onToggleFullscreen,
  audioTracks,
  currentAudioTrack,
  onSelectAudioTrack,
  showAudioMenu,
  onToggleAudioMenu,
  subtitleTracks,
  subtitlesLoading,
  currentSubtitleTrack,
  onSelectSubtitleTrack,
  showSubtitleMenu,
  onToggleSubtitleMenu,
  onUploadSubtitle,
  onAddSubtitleUrl,
  qualityLevels,
  currentQualityLevel,
  onSelectQualityLevel,
  showQualityMenu,
  onToggleQualityMenu,
  playlistItems,
  playlistIndex,
  onSelectPlaylistItem,
  playlistDisabled,
  showPlaylistMenu,
  onTogglePlaylistMenu,
  anySubReady,
  playback,
}) => {
  const { t } = useTranslation("player");
  const navigate = useNavigate();
  const { stopVideo } = usePlayback();
  const { createRoom, role: coWatchRole, chatOpen, setChatOpen } = useWatchTogether();

  const handleStartWatchTogether = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Use the player's own descriptor, not the global activePlayback — plugin-rendered players (HostMediaPlayer)
    // pass playback as a prop and never populate the global context, so activePlayback would be null there.
    if (!playback) return;
    createRoom(playback);
    stopVideo(); // closes the global player (no-op for a plugin player, which unmounts on navigation)
    navigate("/watch-together");
  };

  return (
    <div className="controls-group right">
      <IconButton
        className={cx("control-icon-btn", showStats && "active-accent")}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onToggleStats();
        }}
        title={t("controls.diagnosticsTitle")}
        aria-label={t("controls.diagnosticsAria")}
      >
        <Activity size="1.125rem" />
      </IconButton>

      {/* Start-co-watch button — hidden once a session is running (host or guest): it's no longer needed. */}
      {!coWatchRole && (
        <IconButton
          className="control-icon-btn"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={handleStartWatchTogether}
          title={t("controls.watchTogetherTitle")}
          aria-label={t("controls.watchTogetherAria")}
        >
          <Airplay size="1.125rem" />
        </IconButton>
      )}

      {coWatchRole && (
        <IconButton
          className={cx("control-icon-btn", chatOpen && "active-accent")}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setChatOpen(!chatOpen);
          }}
          title={t("controls.chatTitle")}
          aria-label={t("controls.chatTitle")}
        >
          <MessageSquare size="1.125rem" />
        </IconButton>
      )}

      <TrackSelectorDropdown
        icon={<Volume2 size="1.125rem" />}
        title={t("controls.audioTracks")}
        items={audioTracks}
        currentItemId={currentAudioTrack}
        onSelect={onSelectAudioTrack}
        isOpen={showAudioMenu}
        onToggle={onToggleAudioMenu}
      />

      <TrackSelectorDropdown
        icon={subtitlesLoading ? <CaptionsLoadingIcon size="1.125rem" /> : <Captions size="1.125rem" />}
        title={t("controls.subtitles")}
        items={subtitleTracks}
        currentItemId={currentSubtitleTrack}
        onSelect={onSelectSubtitleTrack}
        isOpen={showSubtitleMenu}
        onToggle={onToggleSubtitleMenu}
        showDisableOption={true}
        disableOptionLabel={t("controls.disable")}
        onUploadSubtitle={onUploadSubtitle}
        onAddSubtitleUrl={onAddSubtitleUrl}
        disabled={!anySubReady}
      />

      {playlistItems.length > 0 && (
        <TrackSelectorDropdown
          icon={<ListVideo size="1.125rem" />}
          title={t("controls.playlistEpisodes")}
          items={playlistItems}
          currentItemId={playlistIndex ?? -1}
          onSelect={onSelectPlaylistItem || (() => {})}
          isOpen={showPlaylistMenu || false}
          onToggle={onTogglePlaylistMenu || (() => {})}
          disabled={playlistDisabled}
        />
      )}

      {qualityLevels.length > 0 && (
        <TrackSelectorDropdown
          icon={<Settings size="1.125rem" />}
          title={t("controls.quality")}
          items={qualityLevels}
          currentItemId={currentQualityLevel}
          onSelect={onSelectQualityLevel}
          isOpen={showQualityMenu}
          onToggle={onToggleQualityMenu}
        />
      )}

      <IconButton
        className="control-icon-btn"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFullscreen();
        }}
        aria-label={t("controls.fullscreen")}
      >
        {isFullscreen ? <Minimize size="1.25rem" /> : <Maximize size="1.25rem" />}
      </IconButton>
    </div>
  );
};