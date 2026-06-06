import React from "react";
import { ExternalLink } from "lucide-react";
import { PAGES } from "../../pages/wiki/wikiData";

interface WikiRightSidebarProps {
  activePage: string;
}

export const WikiRightSidebar: React.FC<WikiRightSidebarProps> = ({
  activePage,
}) => {
  const scrollToAnchor = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (activePage === "sandbox") return null;

  return (
    <aside className="wiki-sidebar-toc">
      <div className="toc-title">На этой странице</div>
      {PAGES[activePage]?.toc.map((item) => (
        <div 
          className="toc-item" 
          key={item.id}
          onClick={() => scrollToAnchor(item.id)}
        >
          {item.text}
        </div>
      ))}

      <a href="https://github.com/itdoginfo/potok-plugin-sdk" target="_blank" rel="noreferrer" className="toc-edit-link">
        <ExternalLink size={12} />
        <span>Редактировать документацию</span>
      </a>
    </aside>
  );
};
