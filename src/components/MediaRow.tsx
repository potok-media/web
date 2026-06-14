import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { MediaCard } from "../network/ApiTypes";
import { MediaCardComponent } from "./MediaCardComponent";
import { usePerformanceTrack } from "../utils/PerformanceMonitor";

interface MediaRowProps {
  id?: string;
  title: string;
  items: MediaCard[];
  onCardClick: (item: MediaCard) => void;
  onSeeAllClick?: (id: string, title: string) => void;
}

export const MediaRow: React.FC<MediaRowProps> = React.memo(({ id, title, items, onCardClick, onSeeAllClick }) => {
  usePerformanceTrack(`MediaRow: ${title}`);
  const rowRef = useRef<HTMLDivElement>(null);

  if (!items || items.length === 0) return null;

  const handleSeeAllClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
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
            title={`Показать все в категории ${title}`}
          >
            <h2 className="carousel-title">{title}</h2>
            <ChevronRight className="carousel-title-chevron" size={20} />
          </Link>
        ) : (
          <h2 className="carousel-title">{title}</h2>
        )}
      </div>
      <div className="carousel-row" ref={rowRef}>
        {items.map((item) => (
          <MediaCardComponent
            key={item.id}
            item={item}
            onClick={onCardClick}
          />
        ))}
      </div>
    </div>
  );
});

MediaRow.displayName = "MediaRow";
export default MediaRow;
