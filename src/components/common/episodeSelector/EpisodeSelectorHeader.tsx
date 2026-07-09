import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  CheckCircle2,
  ListVideo,
  MoreHorizontal,
  Pencil,
} from "lucide-react";
import { Button, IconButton, PopoverItem } from "../../ui";

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
  parsingFailed: boolean;
  onStartEditing?: () => void;
  onOpenAsPlaylist?: () => void;
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
  parsingFailed,
  onStartEditing,
  onOpenAsPlaylist,
}) => {
  const { t } = useTranslation("media");
  const handleBackOrClose = isEditing ? onBackToFiles : onClose;
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

  const hasOptions =
    !isEditing && mediaType === "tv" && totalCount > 0 && (onOpenAsPlaylist || onStartEditing);

  return (
    <div className="modal-header">
      <div className="modal-title-row">
        <IconButton className="modal-close-btn" onClick={handleBackOrClose} aria-label={isEditing ? t("selector.back") : t("selector.close")}>
          <ArrowLeft size="1.25rem" />
        </IconButton>
        <div className="modal-title-text-group">
          <h3 className="modal-title modal-title-custom-size">{title}</h3>
          {subtitle && <span className="modal-subtitle modal-subtitle-text">{subtitle}</span>}

          {mediaType === "tv" && totalCount > 0 && (
            <div className="tv-progress-container">
              <CheckCircle2 size="0.75rem" fill="var(--accent)" stroke="var(--bg-surface)" />
              <span>
                {t("selector.progress", {
                  completed: completedCount,
                  total: totalCount,
                  percentage: Math.round(percentage),
                })}
              </span>
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
        {parsingFailed && !isEditing && (
          <div className="parsing-hint-banner">
            {t("selector.parsingHintQuestion")} <br />
            {t("selector.parsingHintBody")}
          </div>
        )}

        {hasOptions && (
          <div className="popover-wrapper popover-wrapper-relative" ref={popoverRef}>
            <Button
              variant="ghost"
              className="edit-btn popover-trigger-btn"
              onClick={() => setShowPopover(!showPopover)}
            >
              <MoreHorizontal size="1rem" />
              <span>{t("selector.more")}</span>
            </Button>

            {showPopover && (
              <div className="popover-dropdown-menu popover-dropdown-menu-positioned">
                {onOpenAsPlaylist && (
                  <PopoverItem
                    className="popover-menu-item"
                    onClick={() => {
                      onOpenAsPlaylist();
                      setShowPopover(false);
                    }}
                  >
                    <ListVideo size="1rem" className="popover-menu-item-icon-accent" />
                    <span>{t("selector.openAsPlaylist")}</span>
                  </PopoverItem>
                )}

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
          {isEditing ? t("selector.back") : t("selector.close")}
        </Button>
      </div>
    </div>
  );
});

EpisodeSelectorHeader.displayName = "EpisodeSelectorHeader";
export default EpisodeSelectorHeader;