import React from "react";
import { useTranslation } from "react-i18next";
import { Eye } from "lucide-react";
import { PopoverItem } from "./ui";

interface EpisodeContextMenuProps {
  x: number;
  y: number;
  isWatched: boolean;
  onToggleWatched: () => void;
  onClose: () => void;
}

export const EpisodeContextMenu: React.FC<EpisodeContextMenuProps> = ({
  x,
  y,
  isWatched,
  onToggleWatched,
  onClose,
}) => {
  const { t } = useTranslation("media");

  const menuWidth = 180;
  const menuHeight = 50;
  let renderX = x;
  let renderY = y;
  if (renderX + menuWidth > window.innerWidth) renderX = window.innerWidth - menuWidth - 10;
  if (renderY + menuHeight > window.innerHeight) renderY = window.innerHeight - menuHeight - 10;

  return (
    <>
      <div
        className="popover-overlay"
        onClick={onClose}
        onContextMenu={(e) => { e.preventDefault(); onClose(); }}
      />
      <div
        className="episode-card-context-menu"
        style={{ "--menu-left": `${renderX}px`, "--menu-top": `${renderY}px` } as React.CSSProperties}
      >
        <PopoverItem className="context-menu-item" onClick={onToggleWatched}>
          <Eye size="0.875rem" />
          <span>{isWatched ? t("seasons.unmarkWatched") : t("seasons.markWatched")}</span>
        </PopoverItem>
      </div>
    </>
  );
};