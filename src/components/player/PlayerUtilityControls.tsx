import React from "react";
import { useTranslation } from "react-i18next";
import {
  Maximize,
  Minimize,
  Captions,
  Activity,
  Settings,
  ListVideo,
  Volume2,
} from "lucide-react";
import { TrackSelectorDropdown } from "./TrackSelectorDropdown";
import { CaptionsLoadingIcon } from "./SubtitleLoadingIcons";
import { IconButton, cx } from "../ui";

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
  showPlaylistMenu?: boolean;
  onTogglePlaylistMenu?: () => void;
  anySubReady: boolean;
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
  showPlaylistMenu,
  onTogglePlaylistMenu,
  anySubReady,
}) => {
  const { t } = useTranslation("player");

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