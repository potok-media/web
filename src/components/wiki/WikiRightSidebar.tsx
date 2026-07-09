import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui";
import type { WikiPagesMap } from "../../pages/wiki/wikiTypes";

interface WikiRightSidebarProps {
  activePage: string;
  pages: WikiPagesMap;
}

export const WikiRightSidebar: React.FC<WikiRightSidebarProps> = ({
  activePage,
  pages,
}) => {
  const { t } = useTranslation("wiki");

  const scrollToAnchor = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (activePage === "sandbox") return null;

  const toc = pages[activePage]?.toc ?? [];
  if (toc.length === 0) return null;

  return (
    <aside className="wiki-sidebar-toc">
      <div className="toc-title">{t("toc.title")}</div>
      <nav aria-label={t("toc.title")}>
        {toc.map((item) => (
          <Button
            variant="ghost"
            fullWidth
            className="toc-item"
            key={item.id}
            onClick={() => scrollToAnchor(item.id)}
          >
            {item.text}
          </Button>
        ))}
      </nav>
    </aside>
  );
};