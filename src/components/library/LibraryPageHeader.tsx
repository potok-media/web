import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Search as SearchIcon, X } from "lucide-react";
import { Chip, IconButton, Input } from "../ui";

interface LibraryCategory {
  title: string;
  emptyText?: string;
  emptySub?: string;
}

interface LibraryPageHeaderProps {
  isSearchPage: boolean;
  category: LibraryCategory | null;
  query: string;
  setQuery: (q: string) => void;
  itemsCount: number;
  collectionType: string;
}

export const LibraryPageHeader: React.FC<LibraryPageHeaderProps> = ({
  isSearchPage,
  category,
  query,
  setQuery,
  itemsCount,
  collectionType,
}) => {
  const { t } = useTranslation("media");
  const navigate = useNavigate();

  const categoriesList = [
    { id: "up-next", label: t("library.tabs.upNext") },
    { id: "watchlist", label: t("library.tabs.watchlist") },
    { id: "favorites", label: t("library.tabs.favorites") },
    { id: "history", label: t("library.tabs.history") },
  ];

  if (isSearchPage) {
    return (
      <header className="library-header">
        <h1 className="library-large-title">{t("library.searchTitle")}</h1>
        <div className="search-input-wrapper">
          <SearchIcon size="1.125rem" className="search-input-icon" />
          <Input
            type="text"
            className="search-page-input"
            placeholder={t("library.searchPlaceholder")}
            value={query}
            onChange={(e) => {
              const val = e.target.value;
              setQuery(val);
              if (val.trim()) {
                navigate(`/search?q=${encodeURIComponent(val.trim())}`, { replace: true });
              } else {
                navigate("/search", { replace: true });
              }
            }}
          />
          {query && (
            <IconButton
              className="search-input-clear-btn"
              onClick={() => {
                setQuery("");
                navigate("/search", { replace: true });
              }}
              title={t("library.clearSearch")}
              aria-label={t("library.clearSearch")}
            >
              <X size="1.125rem" />
            </IconButton>
          )}
        </div>
        {query.trim() && (
          <p className="library-metadata-count">{t("library.foundCount", { count: itemsCount })}</p>
        )}
      </header>
    );
  }

  return (
    <>
      {category && (
        <header className="library-header">
          <h1 className="library-large-title">{category.title}</h1>
          <p className="library-metadata-count">{t("library.totalCount", { count: itemsCount })}</p>
        </header>
      )}
      <div className="library-mobile-tabs-container">
        <div className="library-mobile-tabs-scroll">
          {categoriesList.map((cat) => (
            <Chip
              key={cat.id}
              active={collectionType === cat.id}
              onClick={() => navigate(`/library/${cat.id}`)}
              className="library-mobile-tab-chip"
            >
              {cat.label}
            </Chip>
          ))}
        </div>
      </div>
    </>
  );
};