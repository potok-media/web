import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  FileCode,
  Terminal,
  ChevronDown,
  Moon,
  Sun,
  Layout,
  Type,
  CheckSquare,
  Film,
  PlayCircle,
} from "lucide-react";
import { WIKI_CATEGORY_KEYS, type WikiCategoryKey } from "../../pages/wiki/wikiCategories";
import { WikiNavButton } from "./WikiNavButton";

interface WikiSidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  filteredPages: [string, { title: string; category: string; categoryKey: string }][];
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
}

const UI_GROUP_CONFIG: {
  categoryKey: WikiCategoryKey;
  sidebarKey: string;
  icon: React.ReactNode;
}[] = [
  { categoryKey: WIKI_CATEGORY_KEYS.uiContainers, sidebarKey: "uiContainers", icon: <Layout size="0.875rem" /> },
  { categoryKey: WIKI_CATEGORY_KEYS.uiText, sidebarKey: "uiText", icon: <Type size="0.875rem" /> },
  { categoryKey: WIKI_CATEGORY_KEYS.uiForms, sidebarKey: "uiForms", icon: <CheckSquare size="0.875rem" /> },
  { categoryKey: WIKI_CATEGORY_KEYS.uiMedia, sidebarKey: "uiMedia", icon: <Film size="0.875rem" /> },
  { categoryKey: WIKI_CATEGORY_KEYS.uiStreaming, sidebarKey: "uiStreaming", icon: <PlayCircle size="0.875rem" /> },
];

function SidebarPageItem({
  pageKey,
  title,
  icon,
  isActive,
  onSelect,
}: {
  pageKey: string;
  title: string;
  icon: React.ReactNode;
  isActive: boolean;
  onSelect: (key: string) => void;
}) {
  return (
    <WikiNavButton isActive={isActive} onClick={() => onSelect(pageKey)}>
      {icon}
      <span>{title}</span>
    </WikiNavButton>
  );
}

export const WikiSidebar: React.FC<WikiSidebarProps> = ({
  activePage,
  setActivePage,
  filteredPages,
  theme,
  setTheme,
}) => {
  const { t } = useTranslation("wiki");

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    [WIKI_CATEGORY_KEYS.api]: true,
    [WIKI_CATEGORY_KEYS.uiContainers]: false,
    [WIKI_CATEGORY_KEYS.uiText]: false,
    [WIKI_CATEGORY_KEYS.uiForms]: false,
    [WIKI_CATEGORY_KEYS.uiMedia]: false,
    [WIKI_CATEGORY_KEYS.uiStreaming]: false,
  });

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  useEffect(() => {
    const activeItem = filteredPages.find(([key]) => key === activePage);
    if (activeItem) {
      const activeCat = activeItem[1].categoryKey;
      if (activeCat && expandedGroups[activeCat] === false) {
        setExpandedGroups((prev) => ({ ...prev, [activeCat]: true }));
      }
    }
  }, [activePage, filteredPages, expandedGroups]);

  const pagesByCategory = (categoryKey: WikiCategoryKey) =>
    filteredPages.filter(([, info]) => info.categoryKey === categoryKey);

  return (
    <aside className="wiki-sidebar-nav">
      <div className="wiki-sidebar-scroll-content">
        <section className="wiki-sidebar-group" aria-label={t("sidebar.intro")}>
          <div className="wiki-sidebar-group-title">{t("sidebar.intro")}</div>
          {pagesByCategory(WIKI_CATEGORY_KEYS.intro).map(([key, info]) => (
            <SidebarPageItem
              key={key}
              pageKey={key}
              title={info.title}
              icon={<FileCode size="0.875rem" />}
              isActive={activePage === key}
              onSelect={setActivePage}
            />
          ))}
        </section>

        <section className="wiki-sidebar-group" aria-label={t("sidebar.api")}>
          <button
            type="button"
            className="wiki-sidebar-group-title"
            onClick={() => toggleGroup(WIKI_CATEGORY_KEYS.api)}
            aria-expanded={expandedGroups[WIKI_CATEGORY_KEYS.api]}
          >
            <span>{t("sidebar.api")}</span>
            <ChevronDown
              size="0.875rem"
              className={`wiki-sidebar-chevron${expandedGroups[WIKI_CATEGORY_KEYS.api] ? " is-expanded" : ""}`}
            />
          </button>

          {expandedGroups[WIKI_CATEGORY_KEYS.api] &&
            pagesByCategory(WIKI_CATEGORY_KEYS.api).map(([key, info]) => (
              <SidebarPageItem
                key={key}
                pageKey={key}
                title={info.title}
                icon={<FileCode size="0.875rem" />}
                isActive={activePage === key}
                onSelect={setActivePage}
              />
            ))}
        </section>

        {UI_GROUP_CONFIG.map((group) => (
          <section className="wiki-sidebar-group" key={group.categoryKey} aria-label={t(`sidebar.${group.sidebarKey}`)}>
            <button
              type="button"
              className="wiki-sidebar-group-title"
              onClick={() => toggleGroup(group.categoryKey)}
              aria-expanded={expandedGroups[group.categoryKey]}
            >
              <span>{t(`sidebar.${group.sidebarKey}`)}</span>
              <ChevronDown
                size="0.875rem"
                className={`wiki-sidebar-chevron${expandedGroups[group.categoryKey] ? " is-expanded" : ""}`}
              />
            </button>
            {expandedGroups[group.categoryKey] &&
              pagesByCategory(group.categoryKey).map(([key, info]) => (
                <SidebarPageItem
                  key={key}
                  pageKey={key}
                  title={info.title}
                  icon={group.icon}
                  isActive={activePage === key}
                  onSelect={setActivePage}
                />
              ))}
          </section>
        ))}

        <section className="wiki-sidebar-group" aria-label={t("sidebar.development")}>
          <div className="wiki-sidebar-group-title">{t("sidebar.development")}</div>
          <SidebarPageItem
            pageKey="sandbox"
            title={t("sidebar.sandbox")}
            icon={<Terminal size="0.875rem" />}
            isActive={activePage === "sandbox"}
            onSelect={setActivePage}
          />
        </section>
      </div>

      <WikiNavButton
        className="wiki-theme-toggle"
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      >
        {theme === "light" ? (
          <>
            <Moon size="0.875rem" />
            <span>{t("sidebar.themeDark")}</span>
          </>
        ) : (
          <>
            <Sun size="0.875rem" />
            <span>{t("sidebar.themeLight")}</span>
          </>
        )}
      </WikiNavButton>
    </aside>
  );
};