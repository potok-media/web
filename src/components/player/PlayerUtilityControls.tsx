import React from "react";
import { useTranslation } from "react-i18next";
import {
  Maximize,
  Minimize,
  Activity,
  PictureInPicture,
  Settings,
  ListVideo,
  Airplay,
  MessageSquare,
} from "lucide-react";
import { TrackSelectorDropdown } from "./TrackSelectorDropdown";
import { PlayerSettingsMenu } from "./PlayerSettingsMenu";
import type { SettingsMenuSection } from "../../hooks/usePlayerMenus";
import { IconButton, cx } from "../ui";
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
  isPictureInPicture: boolean;
  isPictureInPictureSupported: boolean;
  onTogglePictureInPicture: () => void;
  audioTracks: TrackItem[];
  currentAudioTrack: number;
  onSelectAudioTrack: (id: number) => void;
  subtitleTracks: TrackItem[];
  currentSubtitleTrack: number;
  onSelectSubtitleTrack: (id: number) => void;
  qualityLevels: TrackItem[];
  currentQualityLevel: number;
  onSelectQualityLevel: (id: number) => void;
  showSettingsMenu: boolean;
  settingsMenuSection: SettingsMenuSection;
  onOpenSettingsMenu: (section?: SettingsMenuSection) => void;
  onCloseSettingsMenu: () => void;
  onSettingsMenuSectionChange: (section: SettingsMenuSection) => void;
  playlistItems: TrackItem[];
  playlistIndex?: number;
  onSelectPlaylistItem?: (index: number) => void;
  showPlaylistSelector?: boolean;
  coWatchInRail?: boolean;
  playlistDisabled?: boolean;
  showPlaylistMenu?: boolean;
  onTogglePlaylistMenu?: () => void;
  playback: ActivePlayback; // the player's actual descriptor (plugin players bypass the global PlaybackContext)
}

export const PlayerUtilityControls: React.FC<PlayerUtilityControlsProps> = ({
  showStats,
  onToggleStats,
  isFullscreen,
  onToggleFullscreen,
  isPictureInPicture,
  isPictureInPictureSupported,
  onTogglePictureInPicture,
  audioTracks,
  currentAudioTrack,
  onSelectAudioTrack,
  subtitleTracks,
  currentSubtitleTrack,
  onSelectSubtitleTrack,
  qualityLevels,
  currentQualityLevel,
  onSelectQualityLevel,
  showSettingsMenu,
  settingsMenuSection,
  onOpenSettingsMenu,
  onCloseSettingsMenu,
  onSettingsMenuSectionChange,
  playlistItems,
  playlistIndex,
  onSelectPlaylistItem,
  showPlaylistSelector = true,
  coWatchInRail = false,
  playlistDisabled,
  showPlaylistMenu,
  onTogglePlaylistMenu,
  playback,
}) => {
  const { t } = useTranslation("player");
  const {
    createRoom,
    role: coWatchRole,
    sessionActive: coWatchSessionActive,
    chatOpen,
    setChatOpen,
  } = useWatchTogether();

  const handleStartWatchTogether = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Use the player's own descriptor, not the global activePlayback — plugin-rendered players (HostMediaPlayer)
    // pass playback as a prop and never populate the global context, so activePlayback would be null there.
    if (!playback) return;
    createRoom(playback);
    // The room adopts the running player; stopping it or navigating would discard its media pipeline.
    if (coWatchInRail && isFullscreen) onToggleFullscreen();
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

      {coWatchRole && coWatchSessionActive && (
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

      {showPlaylistSelector && playlistItems.length > 0 && (
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

      <div className="selector-menu-container">
        <IconButton
          className={cx("control-icon-btn", showSettingsMenu && "active-accent")}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            if (showSettingsMenu) onCloseSettingsMenu();
            else onOpenSettingsMenu(null);
          }}
          title={t("settings.title")}
          aria-label={t("settings.title")}
        >
          <Settings size="1.125rem" />
        </IconButton>
        <PlayerSettingsMenu
          isOpen={showSettingsMenu}
          section={settingsMenuSection}
          onSectionChange={onSettingsMenuSectionChange}
          onClose={onCloseSettingsMenu}
          audioTracks={audioTracks}
          currentAudioTrack={currentAudioTrack}
          onSelectAudioTrack={onSelectAudioTrack}
          subtitleTracks={subtitleTracks}
          currentSubtitleTrack={currentSubtitleTrack}
          onSelectSubtitleTrack={onSelectSubtitleTrack}
          qualityLevels={qualityLevels}
          currentQualityLevel={currentQualityLevel}
          onSelectQualityLevel={onSelectQualityLevel}
        />
      </div>

      {isPictureInPictureSupported && (
        <IconButton
          className={cx("control-icon-btn", isPictureInPicture && "active-accent")}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onTogglePictureInPicture();
          }}
          title={t("controls.pip")}
          aria-label={t("controls.pip")}
        >
          <PictureInPicture size="1.125rem" />
        </IconButton>
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
