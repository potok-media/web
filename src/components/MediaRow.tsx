import React, { useRef, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { MediaCard } from "../network/ApiTypes";
import { MediaCardComponent, areMediaCardsEqual } from "./MediaCardComponent";
import { usePerformanceTrack } from "../utils/PerformanceMonitor";
import { PlatformManager } from "../utils/PlatformManager";
import { Focusable, FocusableContainer } from "./common/TVNavigation";

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
  usePerformanceTrack(`MediaRow: ${title}`);
  const rowRef = useRef<HTMLDivElement>(null);

  // Cap items at 10 to keep TV horizontal scrolling fast
  const displayItems = useMemo(() => items.slice(0, 10), [items]);

  // Staggered card mounting in TV mode to prevent UI thread blocking
  const [renderedCount, setRenderedCount] = useState(() => {
    return PlatformManager.isTV() ? Math.min(6, displayItems.length) : displayItems.length;
  });

  const prevItemsRef = useRef(items);
  if (items !== prevItemsRef.current) {
    prevItemsRef.current = items;
    setRenderedCount(PlatformManager.isTV() ? Math.min(6, displayItems.length) : displayItems.length);
  }

  // Lazy-load the remaining cards when the user scrolls horizontally near the edge (index >= 4)
  const handleCardFocus = useCallback((index: number) => {
    if (PlatformManager.isTV() && index >= 4 && renderedCount < displayItems.length) {
      setTimeout(() => {
        setRenderedCount(displayItems.length);
      }, 150);
    }
  }, [displayItems.length, renderedCount]);

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
            title={`Показать все в категории ${title}`}
          >
            <h2 className="carousel-title">{title}</h2>
            <ChevronRight className="carousel-title-chevron" size={20} />
          </Link>
        ) : (
          <h2 className="carousel-title">{title}</h2>
        )}
      </div>
      <FocusableContainer 
        focusKey={rowFocusKey}
        preferredChildFocusKey={firstCardFocusKey}
        saveLastFocusedChild={true}
        className="carousel-row" 
        ref={rowRef}
      >
        {displayItems.slice(0, renderedCount).map((item, index) => (
          <MediaCardComponent
            key={item.id}
            item={item}
            onClick={onCardClick}
            onFocus={() => handleCardFocus(index)}
            focusKey={index === 0 ? firstCardFocusKey : undefined}
          />
        ))}

        {/* Focusable "Show More" card at the end of the row */}
        {id && onSeeAllClick && renderedCount === displayItems.length && (
          <Focusable
            onEnterPress={() => {
              onSeeAllClick(id, title);
            }}
          >
            {({ ref: focusRef, focused }) => (
              <Link
                ref={focusRef}
                to={`/library/${id}`}
                className={`media-card more-card ${focused ? "focused" : ""}`}
                onClick={(e) => {
                  if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.altKey === false) {
                    e.preventDefault();
                    onSeeAllClick(id, title);
                  }
                }}
              >
                <div className="media-poster-wrap more-card-poster">
                  <div className="more-card-content">
                    <ChevronRight size={36} className="more-card-icon" />
                    <span className="more-card-text">Ещё</span>
                  </div>
                </div>
              </Link>
            )}
          </Focusable>
        )}
      </FocusableContainer>
    </div>
  );
}, areMediaRowsEqual);

MediaRow.displayName = "MediaRow";
export default MediaRow;
