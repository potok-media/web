import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import type { WikiPagesMap } from "../../pages/wiki/wikiTypes";

interface WikiBreadcrumbsProps {
  activePage: string;
  referrerPage: string;
  setActivePage: (page: string) => void;
  pages: WikiPagesMap;
}

export const WikiBreadcrumbs: React.FC<WikiBreadcrumbsProps> = ({
  activePage,
  referrerPage,
  setActivePage,
  pages,
}) => {
  const { t } = useTranslation("wiki");

  return (
    <nav className="wiki-breadcrumbs" aria-label={t("breadcrumbs.docs")}>
      <span>{t("breadcrumbs.docs")}</span>
      <ChevronRight size="0.75rem" aria-hidden="true" />
      {activePage === "sandbox" ? (
        <>
          <span>{pages[referrerPage]?.category ?? t("breadcrumbs.docs")}</span>
          <ChevronRight size="0.75rem" aria-hidden="true" />
          <button
            type="button"
            className="wiki-breadcrumb-link"
            onClick={() => setActivePage(referrerPage)}
          >
            {pages[referrerPage]?.title ?? t("breadcrumbs.backToDoc")}
          </button>
          <ChevronRight size="0.75rem" aria-hidden="true" />
          <span className="wiki-breadcrumb-current">{t("breadcrumbs.sandbox")}</span>
        </>
      ) : (
        <>
          <span>{pages[activePage]?.category}</span>
          <ChevronRight size="0.75rem" aria-hidden="true" />
          <span className="wiki-breadcrumb-current">{pages[activePage]?.title}</span>
        </>
      )}
    </nav>
  );
};