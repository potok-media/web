import React from "react";
import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";
import type { MediaCard } from "../../network/ApiTypes";
import { Pressable } from "../ui";
import { placeholderGradient } from "../../utils/placeholderGradient";
import { SearchSnippet } from "./SearchSnippet";

interface SearchResultRowProps {
  item: MediaCard;
  active: boolean;
  onSelect: (item: MediaCard) => void;
  onHover: () => void;
}

/** One rich result row for the search dropdown / command palette. */
export const SearchResultRow: React.FC<SearchResultRowProps> = React.memo(({ item, active, onSelect, onHover }) => {
  const { t } = useTranslation("media");
  const rating = item.tmdbRating;
  const meta: string[] = [];
  if (item.subtitle) meta.push(item.subtitle);
  if (item.numberOfSeasons) meta.push(t("search.seasons", { count: item.numberOfSeasons }));
  const typeLabel = item.badgeText
    ? t(`search.type.${item.badgeText}`, { defaultValue: item.badgeText })
    : t(item.mediaType === "tv" ? "card.typeSeries" : "card.typeMovie");
  // The alias line only helps when it differs from the displayed title — i.e. the query hit
  // an alternative title rather than the main one.
  const showAltMatch =
    item.matchedTitleSnippet &&
    item.matchedTitleSnippet.replace(/<\/?mark>/g, "").toLowerCase() !== item.title.toLowerCase();

  return (
    <Pressable
      className={`search-result-row${active ? " is-active" : ""}`}
      onPress={() => onSelect(item)}
      onMouseEnter={onHover}
    >
      <span className="search-result-poster" style={!item.posterSrc ? { background: placeholderGradient(item.potokId ?? item.title) } : undefined}>
        {item.posterSrc && <img src={item.posterSrc} alt="" loading="lazy" decoding="async" />}
      </span>
      <span className="search-result-body">
        <span className="search-result-title">
          {item.titleSnippet ? <SearchSnippet snippet={item.titleSnippet} /> : item.title}
        </span>
        {showAltMatch && (
          <span className="search-result-alt">
            {t("search.matchedOn")} <SearchSnippet snippet={item.matchedTitleSnippet!} />
          </span>
        )}
        <span className="search-result-meta">
          <span className="search-result-type">{typeLabel}</span>
          {meta.length > 0 && <span>{meta.join(" · ")}</span>}
        </span>
      </span>
      {rating != null && rating > 0 && (
        <span className="search-result-rating">
          <Star size="0.75rem" fill="currentColor" stroke="currentColor" />
          {rating.toFixed(1)}
        </span>
      )}
    </Pressable>
  );
});

SearchResultRow.displayName = "SearchResultRow";
export default SearchResultRow;
