import React, { useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { MediaCard } from "../network/ApiTypes";
import { MediaCardComponent, areMediaCardsEqual } from "./MediaCardComponent";
import { Focusable, FocusableContainer } from "./common/TVNavigation";
import { TVScrollView } from "./common/TVScrollView";
import { PlatformManager } from "../utils/PlatformManager";

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

  // Cap items at 10 to keep TV horizontal scrolling fast
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

  // Generate deterministic focus keys for the row and its first card
  const rowCleanId = (id || title).replace(/\s+/g, "-").toLowerCase();
  const rowFocusKey = `row-${rowCleanId}`;
  const firstCardFocusKey = displayItems.length > 0 
    ? `row-${rowCleanId}-first-card-${displayItems[0].id}-${displayItems[0].mediaType}`
    : undefined;

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
      <TVScrollView
        orientation="horizontal"
        className="carousel-viewport"
        renderTrack={({ trackProps }) => (
          <FocusableContainer
            focusKey={rowFocusKey}
            preferredChildFocusKey={firstCardFocusKey}
            saveLastFocusedChild={true}
            className={`carousel-row ${trackProps.className}`}
            ref={rowRef}
          >
            {displayItems.map((item, index) => (
              <MediaCardComponent
                key={`${item.mediaType || "movie"}-${item.id}`}
                item={item}
                onClick={onCardClick}
                // Stable per-card focusKey so focus can be restored to THIS card on Back (the first
                // card keeps its bespoke key, which is also the row's preferredChildFocusKey).
                focusKey={index === 0 ? firstCardFocusKey : `row-${rowCleanId}-card-${item.id}-${item.mediaType}`}
              />
            ))}

            {/* Focusable "Show More" card at the end of the row */}
            {PlatformManager.isTV() && id && onSeeAllClick && (
              <Focusable
                onEnterPress={() => {
                  onSeeAllClick(id, title);
                }}
              >
                {({ ref: focusRef, focused }) => (
                  <Link
                    ref={focusRef}
                    to={`/library/${id}`}
                    className={`media-card more-card is-visible ${focused ? "focused" : ""}`}
                    onClick={(e) => {
                      if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.altKey === false) {
                        e.preventDefault();
                        onSeeAllClick(id, title);
                      }
                    }}
                  >
                    <div className="media-poster-wrap more-card-poster">
                      <div className="more-card-content">
                        <ChevronRight size="2.25rem" className="more-card-icon" />
                        <span className="more-card-text">{t("row.more")}</span>
                      </div>
                    </div>
                  </Link>
                )}
              </Focusable>
            )}
          </FocusableContainer>
        )}
      />
    </div>
  );
}, areMediaRowsEqual);

MediaRow.displayName = "MediaRow";
export default MediaRow;
