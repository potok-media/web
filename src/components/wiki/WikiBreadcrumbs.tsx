import React from "react";
import { ChevronRight } from "lucide-react";
import { PAGES } from "../../pages/wiki/wikiData";

interface WikiBreadcrumbsProps {
  activePage: string;
  referrerPage: string;
  setActivePage: (page: string) => void;
}

export const WikiBreadcrumbs: React.FC<WikiBreadcrumbsProps> = ({
  activePage,
  referrerPage,
  setActivePage,
}) => {
  return (
    <div className="wiki-breadcrumbs">
      <span>Документация</span>
      <ChevronRight size="0.75rem" />
      {activePage === "sandbox" ? (
        <>
          <span>{PAGES[referrerPage]?.category || "Документация"}</span>
          <ChevronRight size="0.75rem" />
          <span
            className="wiki-breadcrumb-link"
            onClick={() => setActivePage(referrerPage)}
          >
            {PAGES[referrerPage]?.title || "Назад к документу"}
          </span>
          <ChevronRight size="0.75rem" />
          <span className="wiki-breadcrumb-current">
            Песочница
          </span>
        </>
      ) : (
        <>
          <span>{PAGES[activePage]?.category}</span>
          <ChevronRight size="0.75rem" />
          <span className="wiki-breadcrumb-current">
            {PAGES[activePage]?.title}
          </span>
        </>
      )}
    </div>
  );
};
