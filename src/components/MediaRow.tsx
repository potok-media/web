import React, { useRef } from "react";
import { ChevronRight } from "lucide-react";
import type { MediaCard } from "../network/ApiTypes";
import { MediaCardComponent } from "./MediaCardComponent";

interface MediaRowProps {
  id?: string;
  title: string;
  items: MediaCard[];
  onCardClick: (item: MediaCard) => void;
  onSeeAllClick?: (id: string, title: string) => void;
}

export const MediaRow: React.FC<MediaRowProps> = React.memo(({ id, title, items, onCardClick, onSeeAllClick }) => {
  const rowRef = useRef<HTMLDivElement>(null);

  if (!items || items.length === 0) return null;

  return (
    <div className="carousel-container">
      <div className="carousel-header">
        {id && onSeeAllClick ? (
          <button 
            className="carousel-title-link"
            onClick={() => onSeeAllClick(id, title)}
            title={`Показать все в категории ${title}`}
          >
            <h2 className="carousel-title">{title}</h2>
            <ChevronRight className="carousel-title-chevron" size={20} />
          </button>
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
