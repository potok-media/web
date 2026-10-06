import { Search as SearchIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { MediaSearch } from "../../hooks/useMediaSearch";
import type { MediaCard } from "../../network/ApiTypes";
import { mediaCardKey } from "../../utils/mediaLink";
import { MediaCardComponent } from "../MediaCardComponent";
import { LoadingSpinner } from "../LoadingSpinner";
import { Grid } from "../common/Grid";
import { Button } from "../ui";

export function EmptyResults() {
  const { t } = useTranslation("media");
  return (
    <div className="library-empty-view results-mode">
      <SearchIcon size="3rem" className="library-empty-icon muted" />
      <h2 className="library-empty-title">{t("library.nothingFound")}</h2>
      <p className="library-empty-subtitle">{t("library.searchNoResultsSub")}</p>
    </div>
  );
}

export function CardGrid({ items }: { items: MediaCard[] }) {
  return (
    <Grid className="library-grid">
      {items.map(item => <MediaCardComponent key={mediaCardKey(item)} item={item} />)}
    </Grid>
  );
}

export function PagedSearchResults({ search }: { search: MediaSearch }) {
  const { t } = useTranslation("media");
  if (search.loading && search.results.length === 0) {
    return <LoadingSpinner height="40vh" message={t("library.searching")} />;
  }
  if (search.results.length === 0) return <EmptyResults />;
  return (
    <>
      <CardGrid items={search.results} />
      {search.hasMore && (
        <div className="search-pagination">
          {search.loadMoreError && <p role="alert">{t("search.loadMoreError")}</p>}
          <Button variant="secondary" disabled={search.loadingMore}
            onClick={() => void search.loadMore()} aria-busy={search.loadingMore}>
            {search.loadingMore ? t("library.loadingMore")
              : search.loadMoreError ? t("common.retry") : t("search.loadMore")}
          </Button>
        </div>
      )}
    </>
  );
}
