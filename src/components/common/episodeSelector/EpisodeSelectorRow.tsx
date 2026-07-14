import React from "react";
import { useTranslation } from "react-i18next";
import { Play, Check, CheckCircle2, Anchor, Pin, RotateCcw } from "lucide-react";
import { IconButton } from "../../ui";
import { formatLocalizedDate } from "../../../utils/formatDate";
import { getActiveLanguage, toIntlLocale } from "../../../utils/language";
import type { FileOverrideEntry, FileOverrideMode, GenericEpisodeItem } from "./types";
import { getStreamType } from "./utils";

interface EpisodeSelectorRowProps {
  episodeItem: GenericEpisodeItem;
  mediaType: string;
  backdropSrc?: string;
  posterSrc?: string;
  onPlay: () => void;
  fileOverrideEnabled?: boolean;
  fileOverride?: FileOverrideEntry;
  onEditFile?: (fileId: string, mode: FileOverrideMode) => void;
  onResetFileOverride?: (fileId: string) => void;
}

export const EpisodeSelectorRow: React.FC<EpisodeSelectorRowProps> = React.memo(({
  episodeItem,
  mediaType,
  backdropSrc,
  posterSrc,
  onPlay,
  fileOverrideEnabled = false,
  fileOverride,
  onEditFile,
  onResetFileOverride,
}) => {
  const { t } = useTranslation("media");

  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const displayTitle =
    episodeItem.title || t("episode.fallbackName", { number: episodeItem.episode });

  let displaySubtitle = "";
  if (mediaType === "tv") {
    displaySubtitle = t("selector.season", { number: episodeItem.season });
    if (episodeItem.airDate) {
      try {
        const airDateStr = formatLocalizedDate(
          episodeItem.airDate,
          { day: "numeric", month: "long" },
          toIntlLocale(getActiveLanguage()),
        );
        displaySubtitle += ` • ${airDateStr}`;
      } catch {
        /* safe fallback */
      }
    }
  }

  const imageUrl = episodeItem.stillPath || backdropSrc || posterSrc;

  const getAudiosLabel = (audios: GenericEpisodeItem["audios"]) => {
    if (!audios?.length) return "";
    if (audios.length === 1) return audios[0].name || "";
    return t("selector.audioCount", { count: audios.length });
  };

  const sizeLabel = episodeItem.sizeLabel || getAudiosLabel(episodeItem.audios);
  const streamType = getStreamType(episodeItem);

  return (
    <div
      className="file-card-row"
      onClick={onPlay}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPlay();
        }
      }}
    >
      <div className="file-card-banner">
        {imageUrl ? (
          <img src={imageUrl} alt={displayTitle} className="file-card-image" loading="lazy" />
        ) : (
          <div className="file-card-preview-placeholder" />
        )}
        <div className="file-card-banner-overlay" />
        {episodeItem.episode > 0 && (
          <span className="file-card-bg-number">{episodeItem.episode}</span>
        )}
        {episodeItem.isWatched && (
          <div className="file-card-badge-checked">
            <CheckCircle2 size="1.25rem" fill="var(--accent)" stroke="var(--bg-surface)" />
          </div>
        )}
      </div>

      <div className="file-card-info-panel">
        <h4 className="file-card-title">{displayTitle}</h4>
        {displaySubtitle && displaySubtitle !== displayTitle && (
          <span className="file-card-subtitle">{displaySubtitle}</span>
        )}
        {episodeItem.fileName && episodeItem.fileName !== displayTitle && (
          <span className="file-card-filename" title={episodeItem.fileName}>
            {episodeItem.fileName}
          </span>
        )}
      </div>

      <div className="file-card-details-panel">
        {episodeItem.isWatched && (
          <div className="file-card-watched-badge">
            <Check size="0.75rem" strokeWidth={3} />
            <span>{t("selector.watched")}</span>
          </div>
        )}
        {sizeLabel && <span className="file-card-size">{sizeLabel}</span>}
        {streamType && (
          <span className="file-card-ext-badge">{streamType.toLowerCase()}</span>
        )}
        {fileOverrideEnabled && fileOverride && (
          <span
            className={`file-card-override-badge file-card-override-badge--${fileOverride.mode === "pin" ? "pin" : "anchor"}`}
            title={fileOverride.mode === "pin" ? t("fileOverride.pinnedTo") : t("fileOverride.anchoredFrom")}
          >
            {fileOverride.mode === "pin" ? <Pin size="0.6875rem" /> : <Anchor size="0.6875rem" />}
            {fileOverride.season === 0
              ? t("selector.specials")
              : `S${fileOverride.season}`}
            {`·E${fileOverride.episode}`}
          </span>
        )}
      </div>

      {fileOverrideEnabled && (onEditFile || onResetFileOverride) && (
        <div className="file-card-override-actions" onClick={stop}>
          {onEditFile && (
            <>
              <IconButton
                className="file-card-override-btn"
                onClick={(e) => { stop(e); onEditFile(episodeItem.id, "anchor"); }}
                aria-label={t("fileOverride.anchorFromHere")}
                title={t("fileOverride.anchorFromHere")}
              >
                <Anchor size="0.9375rem" />
              </IconButton>
              <IconButton
                className="file-card-override-btn"
                onClick={(e) => { stop(e); onEditFile(episodeItem.id, "pin"); }}
                aria-label={t("fileOverride.pinThisFile")}
                title={t("fileOverride.pinThisFile")}
              >
                <Pin size="0.9375rem" />
              </IconButton>
            </>
          )}
          {fileOverride && onResetFileOverride && (
            <IconButton
              className="file-card-override-btn"
              onClick={(e) => { stop(e); onResetFileOverride(episodeItem.id); }}
              aria-label={t("fileOverride.reset")}
              title={t("fileOverride.reset")}
            >
              <RotateCcw size="0.9375rem" />
            </IconButton>
          )}
        </div>
      )}

      <IconButton
        className="file-card-play-btn"
        onClick={(e) => {
          e.stopPropagation();
          onPlay();
        }}
        aria-label={t("selector.play")}
      >
        <Play size="1rem" fill="currentColor" className="file-card-play-icon-fix" />
      </IconButton>
    </div>
  );
});