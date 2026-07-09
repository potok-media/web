import React from "react";
import { Button } from "../ui";
import { useWikiPageNav } from "./wikiPageContext";

interface WikiPageLinkProps {
  page: string;
  children?: React.ReactNode;
}

export const WikiPageLink: React.FC<WikiPageLinkProps> = ({ page, children }) => {
  const nav = useWikiPageNav();

  return (
    <Button
      variant="ghost"
      className="wiki-breadcrumb-link"
      onClick={() => nav?.openPage(page)}
    >
      {children}
    </Button>
  );
};