import React, { useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { MediaCard } from "../network/ApiTypes";
import { MediaCardComponent } from "./MediaCardComponent";
import { areMediaCardsEqual } from "./mediaCardCompare";
import { ScrollView } from "./common/ScrollView";

interface MediaRowProps {
  id?: string;
  title: string;
  items: MediaCard[];
  onCardClick: (item: MediaCard) => void;
  onSeeAllClick?: (id: string, title: string) => void;
}

const areMediaRowsEqual = (prevProps: MediaRowProps, nextProps: MediaRowProps): boolean => {
  if (prevProps.id !== nextProps.id) return false;
  if (prevProps.title !== nextProps.title) return false;
  if (prevProps.items.length !== nextProps.items.length) return false;
  for (let i = 0; i < prevProps.items.length; i++) {
    if (!areMediaCardsEqual(prevProps.items[i], nextProps.items[i])) {
      return false;
    }
  }
  return true;
};

export const MediaRow: React.FC<MediaRowProps> = React.memo(
  ({ id, title, items, onCardClick, onSeeAllClick }) => {
  const { t } = useTranslation("media");
  const rowRef = useRef<HTMLDivElement>(null);

  // Cap items at 10 to keep horizontal scrolling fast
  const displayItems = useMemo(() => items.slice(0, 10), [items]);

  if (!items || items.length === 0) return null;

  const handleSeeAllClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.altKey === false) {
      if (onSeeAllClick && id) {
        e.preventDefault();
        onSeeAllClick(id, title);
      }
    }
  };

  return (
    <div className="carousel-container">
      <div className="carousel-header">
        {id && onSeeAllClick ? (
          <Link 
            to={`/library/${id}`}
            className="carousel-title-link"
            onClick={handleSeeAllClick}
            title={t("row.seeAllTitle", { title })}
          >
            <h2 className="carousel-title">{title}</h2>
            <ChevronRight className="carousel-title-chevron" size="1.25rem" />
          </Link>
        ) : (
          <h2 className="carousel-title">{title}</h2>
        )}
      </div>
      <ScrollView
        orientation="horizontal"
        className="carousel-viewport"
        renderTrack={({ trackProps }) => (
          <div
            className={`carousel-row ${trackProps.className}`}
            ref={rowRef}
          >
            {displayItems.map((item) => (
              <MediaCardComponent
                key={`${item.mediaType || "movie"}-${item.id}`}
                item={item}
                onClick={onCardClick}
              />
            ))}
          </div>
        )}
      />
    </div>
  );
}, areMediaRowsEqual);

MediaRow.displayName = "MediaRow";
export default MediaRow;
