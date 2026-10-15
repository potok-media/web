import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  CheckCircle2,
  MoreHorizontal,
  Pencil,
} from "lucide-react";
import { Button, IconButton, PopoverItem } from "../../ui";
import type { EpisodeSelectorPresentation } from "./types";

interface EpisodeSelectorHeaderProps {
  isEditing: boolean;
  onClose: () => void;
  onBackToFiles: () => void;
  title: string;
  subtitle?: string;
  mediaType: string;
  completedCount: number;
  totalCount: number;
  percentage: number;
  onStartEditing?: () => void;
  navigationAction?: "back" | "close";
  presentation?: EpisodeSelectorPresentation;
  repairMode?: boolean;
  onStopRepairing?: () => void;
}

export const EpisodeSelectorHeader: React.FC<EpisodeSelectorHeaderProps> = React.memo(({
  isEditing,
  onClose,
  onBackToFiles,
  title,
  subtitle,
  mediaType,
  completedCount,
  totalCount,
  percentage,
  onStartEditing,
  navigationAction = "close",
  presentation = "selector",
  repairMode = false,
  onStopRepairing,
}) => {
  const { t } = useTranslation("media");
  const isPlaylistPresentation = presentation === "playlist";
  const handleBackOrClose = isEditing
    ? onBackToFiles
    : repairMode && onStopRepairing
      ? onStopRepairing
      : onClose;
  const navigationLabel = isEditing || repairMode || navigationAction === "back"
    ? t("selector.back")
    : t("selector.close");
  const [showPopover, setShowPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowPopover(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasOptions = !isEditing && !repairMode && mediaType === "tv" && totalCount > 0 && Boolean(onStartEditing);
  const headerTitle = isPlaylistPresentation
    ? repairMode || isEditing
      ? t("selector.editMapping")
      : t("streams.episodeSelection")
    : title;
  const progressLabel = t("selector.progress", {
    completed: completedCount,
    total: totalCount,
    percentage: Math.round(percentage),
  });

  return (
    <div className="modal-header">
      <div className="modal-title-row">
        <IconButton className="modal-close-btn" onClick={handleBackOrClose} aria-label={navigationLabel}>
          <ArrowLeft size="1.25rem" />
        </IconButton>
        <div className="modal-title-text-group">
          <h3 className="modal-title modal-title-custom-size" title={isPlaylistPresentation ? headerTitle : title}>
            {headerTitle}
          </h3>
          {!isPlaylistPresentation && subtitle && (
            <span className="modal-subtitle modal-subtitle-text" title={subtitle}>{subtitle}</span>
          )}

          {mediaType === "tv" && totalCount > 0 && (
            <div className="tv-progress-container" title={progressLabel}>
              <CheckCircle2 size="0.75rem" fill="var(--accent)" stroke="var(--bg-surface)" />
              <span>{isPlaylistPresentation ? `${completedCount} / ${totalCount}` : progressLabel}</span>
            </div>
          )}

          {mediaType === "movie" && completedCount > 0 && (
            <div className="tv-progress-container">
              <CheckCircle2 size="0.75rem" fill="var(--accent)" stroke="var(--bg-surface)" />
              <span>{t("selector.watched")}</span>
            </div>
          )}
        </div>
      </div>

      <div className="modal-header-actions-row">
        {hasOptions && (
          <div className="popover-wrapper popover-wrapper-relative" ref={popoverRef}>
            {isPlaylistPresentation ? (
              <IconButton
                className="edit-btn popover-trigger-btn episode-selector-more-btn"
                onClick={() => setShowPopover(!showPopover)}
                aria-label={t("selector.more")}
                title={t("selector.more")}
              >
                <MoreHorizontal size="1rem" />
              </IconButton>
            ) : (
              <Button
                variant="ghost"
                className="edit-btn popover-trigger-btn"
                onClick={() => setShowPopover(!showPopover)}
              >
                <MoreHorizontal size="1rem" />
                <span>{t("selector.more")}</span>
              </Button>
            )}

            {showPopover && (
              <div className="popover-dropdown-menu popover-dropdown-menu-positioned">
                {onStartEditing && (
                  <PopoverItem
                    className="popover-menu-item"
                    onClick={() => {
                      onStartEditing();
                      setShowPopover(false);
                    }}
                  >
                    <Pencil size="1rem" className="popover-menu-item-icon-muted" />
                    <span>{t("selector.editMapping")}</span>
                  </PopoverItem>
                )}
              </div>
            )}
          </div>
        )}

        <Button variant="ghost" className="close-btn" onClick={handleBackOrClose}>
          {navigationLabel}
        </Button>
      </div>
    </div>
  );
});

EpisodeSelectorHeader.displayName = "EpisodeSelectorHeader";
export default EpisodeSelectorHeader;
