import React, { createContext, useContext } from "react";

interface WikiPageContextValue {
  openPage: (pageKey: string) => void;
}

export const WikiPageContext = createContext<WikiPageContextValue | null>(null);

export function useWikiPageNav() {
  return useContext(WikiPageContext);
}

interface WikiPageLinkProps {
  page: string;
  children?: React.ReactNode;
}

export const WikiPageLink: React.FC<WikiPageLinkProps> = ({ page, children }) => {
  const nav = useWikiPageNav();

  return (
    <button
      type="button"
      className="wiki-breadcrumb-link"
      onClick={() => nav?.openPage(page)}
    >
      {children}
    </button>
  );
};