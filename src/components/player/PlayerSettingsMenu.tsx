import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  AudioLines,
  Captions,
  Check,
  ChevronLeft,
  ChevronRight,
  MonitorUp,
  SkipForward,
  Sparkles,
} from "lucide-react";
import { SpinnerIcon } from "./SubtitleLoadingIcons";
import { Button, Switch } from "../ui";
import { useSkipFillers } from "../../utils/skipFillers";
import { useAnime4kUpscalePref, type Anime4kUpscalePref } from "../../utils/anime4k/prefs";
import { isAnime4kSupported } from "../../hooks/player/useAnime4kUpscale";
import type { SettingsMenuSection } from "../../hooks/usePlayerMenus";

interface TrackItem {
  id: number;
  name: string;
  loading?: boolean;
  error?: boolean;
}

interface PlayerSettingsMenuProps {
  isOpen: boolean;
  section: SettingsMenuSection;
  onSectionChange: (section: SettingsMenuSection) => void;
  onClose: () => void;
  audioTracks: TrackItem[];
  currentAudioTrack: number;
  onSelectAudioTrack: (id: number) => void;
  subtitleTracks: TrackItem[];
  currentSubtitleTrack: number;
  onSelectSubtitleTrack: (id: number) => void;
  qualityLevels: TrackItem[];
  currentQualityLevel: number;
  onSelectQualityLevel: (id: number) => void;
}

const SECTION_ICON_SIZE = "1rem";

// Two-level settings popover (YouTube-style): a root list of sections, each opening a list of
// options inside the same popover; picking an option returns to the root. Rendered next to the ⚙
// control button, same container as the former quality popup — no portal, no z-index layering.
export const PlayerSettingsMenu: React.FC<PlayerSettingsMenuProps> = ({
  isOpen,
  section,
  onSectionChange,
  onClose,
  audioTracks,
  currentAudioTrack,
  onSelectAudioTrack,
  subtitleTracks,
  currentSubtitleTrack,
  onSelectSubtitleTrack,
  qualityLevels,
  currentQualityLevel,
  onSelectQualityLevel,
}) => {
  const { t } = useTranslation("player");
  const [skipFillers, setSkipFillers] = useSkipFillers();
  const [upscalePref, setUpscalePref] = useAnime4kUpscalePref();
  // Support is probed once (WebGL1 + float-linear context); unsupported devices never see the section.
  const [anime4kSupported] = useState(() => isAnime4kSupported());

  const upscaleOptions: Array<{ id: number; pref: Anime4kUpscalePref }> = [
    { id: 0, pref: "auto" },
    { id: 1, pref: "high" },
    { id: 2, pref: "medium" },
    { id: 3, pref: "light" },
    { id: 4, pref: "off" },
  ];
  const upscaleLabel = (pref: Anime4kUpscalePref) => t(`upscale.${pref}`);

  // Esc steps back to the root first, then closes the popover entirely.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      if (section) onSectionChange(null);
      else onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, section, onSectionChange, onClose]);

  if (!isOpen) return null;

  const currentName = (items: TrackItem[], currentId: number, fallback: string) =>
    items.find((item) => item.id === currentId)?.name ?? fallback;

  const sections: Array<{
    key: Exclude<SettingsMenuSection, null>;
    icon: React.ReactNode;
    label: string;
    value: string;
  }> = [
    // Hide the section when there is no real choice: qualityLevels always includes the Auto entry,
    // so anything below two entries means "Auto only".
    ...(qualityLevels.length >= 2
      ? [{
          key: "quality" as const,
          icon: <MonitorUp size={SECTION_ICON_SIZE} />,
          label: t("settings.quality"),
          value: currentName(qualityLevels, currentQualityLevel, t("quality.auto")),
        }]
      : []),
    {
      key: "audio" as const,
      icon: <AudioLines size={SECTION_ICON_SIZE} />,
      label: t("settings.audio"),
      value: currentName(audioTracks, currentAudioTrack, t("controls.defaultAudioTrack")),
    },
    ...(subtitleTracks.length > 0
      ? [{
          key: "subtitles" as const,
          icon: <Captions size={SECTION_ICON_SIZE} />,
          label: t("settings.subtitles"),
          value: currentSubtitleTrack === -1
            ? t("controls.disable")
            : currentName(subtitleTracks, currentSubtitleTrack, t("controls.disable")),
        }]
      : []),
    ...(anime4kSupported
      ? [{
          key: "upscale" as const,
          icon: <Sparkles size={SECTION_ICON_SIZE} />,
          label: t("settings.upscale"),
          value: upscaleLabel(upscalePref),
        }]
      : []),
  ];

  const sectionItems: Record<Exclude<SettingsMenuSection, null>, TrackItem[]> = {
    quality: qualityLevels,
    audio: audioTracks,
    subtitles: subtitleTracks,
    upscale: upscaleOptions.map((option) => ({ id: option.id, name: upscaleLabel(option.pref) })),
  };
  const sectionCurrent: Record<Exclude<SettingsMenuSection, null>, number> = {
    quality: currentQualityLevel,
    audio: currentAudioTrack,
    subtitles: currentSubtitleTrack,
    upscale: upscaleOptions.find((option) => option.pref === upscalePref)?.id ?? 0,
  };
  const sectionSelect: Record<Exclude<SettingsMenuSection, null>, (id: number) => void> = {
    quality: onSelectQualityLevel,
    audio: onSelectAudioTrack,
    subtitles: onSelectSubtitleTrack,
    upscale: (id) => setUpscalePref(upscaleOptions.find((option) => option.id === id)?.pref ?? "auto"),
  };

  const activeSection = section && sections.some((s) => s.key === section) ? section : null;
  const active = sections.find((s) => s.key === activeSection);

  // Fixed-width slot keeps the option text aligned whether or not the Check icon is shown.
  const selectionSlot = (selected: boolean) => (
    <span className="settings-menu-check">
      {selected && <Check size={14} />}
    </span>
  );

  return (
    <div className="player-settings-menu" onClick={(e) => e.stopPropagation()}>
      {!activeSection && (
        <div className="settings-menu-root">
          {sections.map((s) => (
            <div
              key={s.key}
              className="dropdown-menu-item settings-menu-row"
              role="button"
              onClick={() => onSectionChange(s.key)}
              title={s.value}
            >
              <span className="settings-menu-icon">{s.icon}</span>
              <span className="settings-menu-label">{s.label}</span>
              <span className="settings-menu-value">
                <span>{s.value}</span>
                <ChevronRight size={14} />
              </span>
            </div>
          ))}
          <div className="dropdown-divider" />
          <label
            className="dropdown-menu-item settings-menu-toggle"
            onClick={(e) => e.stopPropagation()}
            title={t("settings.skipFillers")}
          >
            <span className="settings-menu-icon">
              <SkipForward size={SECTION_ICON_SIZE} />
            </span>
            <span className="settings-menu-label">{t("settings.skipFillers")}</span>
            <Switch
              checked={skipFillers}
              onCheckedChange={setSkipFillers}
              aria-label={t("settings.skipFillers")}
            />
          </label>
        </div>
      )}

      {activeSection && active && (
        <div className="settings-menu-submenu">
          <div className="settings-menu-back-row">
            <Button
              variant="ghost"
              size="sm"
              className="settings-menu-back"
              onClick={() => onSectionChange(null)}
            >
              <ChevronLeft size={14} />
              <span>{t("settings.title")}</span>
            </Button>
          </div>
          <div className="dropdown-divider" />
          <div className="settings-menu-options">
            {activeSection === "subtitles" && (
              <div
                className="dropdown-menu-item settings-menu-option"
                role="button"
                onClick={() => {
                  onSelectSubtitleTrack(-1);
                  onSectionChange(null);
                }}
                title={t("controls.disable")}
              >
                {selectionSlot(currentSubtitleTrack === -1)}
                <span>{t("controls.disable")}</span>
              </div>
            )}
            {sectionItems[activeSection].map((track) => {
              const busy = !!(track.loading || track.error);
              const selected = sectionCurrent[activeSection] === track.id;
              return (
                <div
                  key={track.id}
                  className={`dropdown-menu-item settings-menu-option${busy ? " is-busy" : ""}`}
                  role="button"
                  onClick={() => {
                    if (busy) return;
                    sectionSelect[activeSection](track.id);
                    onSectionChange(null);
                  }}
                  aria-busy={track.loading || undefined}
                  aria-disabled={busy || undefined}
                  title={track.error ? t("trackSelector.loadError") : track.name}
                >
                  {track.loading && <SpinnerIcon size={14} />}
                  {track.error && <AlertCircle size={14} />}
                  {!busy && selectionSlot(selected)}
                  <span className="settings-menu-text">{track.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
