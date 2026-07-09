import React, { useState, useEffect } from "react";
import { 
  FileCode, 
  Sliders, 
  Terminal, 
  ChevronDown, 
  Moon, 
  Sun,
  Layout,
  Type,
  CheckSquare,
  Film,
  PlayCircle
} from "lucide-react";

interface WikiSidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  filteredPages: [string, { title: string; category: string }][];
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
}

export const WikiSidebar: React.FC<WikiSidebarProps> = ({
  activePage,
  setActivePage,
  filteredPages,
  theme,
  setTheme,
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    "API": true,
    "UI: Контейнеры": false,
    "UI: Текст и Инфо": false,
    "UI: Формы и Ввод": false,
    "UI: Медиа": false,
    "UI: Рендеринг и Стриминг": false,
  });

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  useEffect(() => {
    const activeItem = filteredPages.find(([key]) => key === activePage);
    if (activeItem) {
      const activeCat = activeItem[1].category;
      if (activeCat && expandedGroups[activeCat] === false) {
        setExpandedGroups(prev => ({
          ...prev,
          [activeCat]: true
        }));
      }
    }
  }, [activePage, filteredPages, expandedGroups]);

  return (
    <aside className="wiki-sidebar-nav">
      <div className="wiki-sidebar-scroll-content">
        {/* Введение */}
        <div className="wiki-sidebar-group">
          <div className="wiki-sidebar-group-title">Введение</div>
          {filteredPages
            .filter(([, info]) => info.category === "Введение")
            .map(([key, info]) => (
              <div 
                className={`wiki-sidebar-item ${activePage === key ? "active" : ""}`}
                key={key}
                onClick={() => setActivePage(key)}
              >
                <FileCode size="0.875rem" />
                <span>{info.title}</span>
              </div>
            ))}
        </div>

        {/* API методы */}
        <div className="wiki-sidebar-group">
          <div 
            className="wiki-sidebar-group-title" 
            onClick={() => toggleGroup("API")}
          >
            <span>API методы</span>
            <ChevronDown
              size="0.875rem"
              className={`wiki-sidebar-chevron${expandedGroups["API"] ? " is-expanded" : ""}`}
            />
          </div>
          
          {expandedGroups["API"] && filteredPages
            .filter(([, info]) => info.category === "API")
            .map(([key, info]) => (
              <div 
                className={`wiki-sidebar-item ${activePage === key ? "active" : ""}`}
                key={key}
                onClick={() => setActivePage(key)}
              >
                <Sliders size="0.875rem" />
                <span>{info.title}</span>
              </div>
            ))}
        </div>

        {/* UI: Контейнеры */}
        <div className="wiki-sidebar-group">
          <div 
            className="wiki-sidebar-group-title" 
            onClick={() => toggleGroup("UI: Контейнеры")}
          >
            <span>UI: Разметка и Сетки</span>
            <ChevronDown
              size="0.875rem"
              className={`wiki-sidebar-chevron${expandedGroups["UI: Контейнеры"] ? " is-expanded" : ""}`}
            />
          </div>
          {expandedGroups["UI: Контейнеры"] && filteredPages
            .filter(([, info]) => info.category === "UI: Контейнеры")
            .map(([key, info]) => (
              <div 
                className={`wiki-sidebar-item ${activePage === key ? "active" : ""}`}
                key={key}
                onClick={() => setActivePage(key)}
              >
                <Layout size="0.875rem" />
                <span>{info.title}</span>
              </div>
            ))}
        </div>

        {/* UI: Текст и Инфо */}
        <div className="wiki-sidebar-group">
          <div 
            className="wiki-sidebar-group-title" 
            onClick={() => toggleGroup("UI: Текст и Инфо")}
          >
            <span>UI: Текст и Инфо</span>
            <ChevronDown
              size="0.875rem"
              className={`wiki-sidebar-chevron${expandedGroups["UI: Текст и Инфо"] ? " is-expanded" : ""}`}
            />
          </div>
          {expandedGroups["UI: Текст и Инфо"] && filteredPages
            .filter(([, info]) => info.category === "UI: Текст и Инфо")
            .map(([key, info]) => (
              <div 
                className={`wiki-sidebar-item ${activePage === key ? "active" : ""}`}
                key={key}
                onClick={() => setActivePage(key)}
              >
                <Type size="0.875rem" />
                <span>{info.title}</span>
              </div>
            ))}
        </div>

        {/* UI: Формы и Ввод */}
        <div className="wiki-sidebar-group">
          <div 
            className="wiki-sidebar-group-title" 
            onClick={() => toggleGroup("UI: Формы и Ввод")}
          >
            <span>UI: Формы и Ввод</span>
            <ChevronDown
              size="0.875rem"
              className={`wiki-sidebar-chevron${expandedGroups["UI: Формы и Ввод"] ? " is-expanded" : ""}`}
            />
          </div>
          {expandedGroups["UI: Формы и Ввод"] && filteredPages
            .filter(([, info]) => info.category === "UI: Формы и Ввод")
            .map(([key, info]) => (
              <div 
                className={`wiki-sidebar-item ${activePage === key ? "active" : ""}`}
                key={key}
                onClick={() => setActivePage(key)}
              >
                <CheckSquare size="0.875rem" />
                <span>{info.title}</span>
              </div>
            ))}
        </div>

        {/* UI: Медиа */}
        <div className="wiki-sidebar-group">
          <div 
            className="wiki-sidebar-group-title" 
            onClick={() => toggleGroup("UI: Медиа")}
          >
            <span>UI: Медиа компоненты</span>
            <ChevronDown
              size="0.875rem"
              className={`wiki-sidebar-chevron${expandedGroups["UI: Медиа"] ? " is-expanded" : ""}`}
            />
          </div>
          {expandedGroups["UI: Медиа"] && filteredPages
            .filter(([, info]) => info.category === "UI: Медиа")
            .map(([key, info]) => (
              <div 
                className={`wiki-sidebar-item ${activePage === key ? "active" : ""}`}
                key={key}
                onClick={() => setActivePage(key)}
              >
                <Film size="0.875rem" />
                <span>{info.title}</span>
              </div>
            ))}
        </div>

        {/* UI: Рендеринг и Стриминг */}
        <div className="wiki-sidebar-group">
          <div 
            className="wiki-sidebar-group-title" 
            onClick={() => toggleGroup("UI: Рендеринг и Стриминг")}
          >
            <span>UI: Плееры и Потоки</span>
            <ChevronDown
              size="0.875rem"
              className={`wiki-sidebar-chevron${expandedGroups["UI: Рендеринг и Стриминг"] ? " is-expanded" : ""}`}
            />
          </div>
          {expandedGroups["UI: Рендеринг и Стриминг"] && filteredPages
            .filter(([, info]) => info.category === "UI: Рендеринг и Стриминг")
            .map(([key, info]) => (
              <div 
                className={`wiki-sidebar-item ${activePage === key ? "active" : ""}`}
                key={key}
                onClick={() => setActivePage(key)}
              >
                <PlayCircle size="0.875rem" />
                <span>{info.title}</span>
              </div>
            ))}
        </div>

        {/* Разработка */}
        <div className="wiki-sidebar-group">
          <div className="wiki-sidebar-group-title">Разработка</div>
          <div 
            className={`wiki-sidebar-item ${activePage === "sandbox" ? "active" : ""}`}
            onClick={() => setActivePage("sandbox")}
          >
            <Terminal size="0.875rem" />
            <span>Песочница / Sandbox</span>
          </div>
        </div>
      </div>

      <div 
        className="wiki-theme-toggle"
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      >
        {theme === "light" ? (
          <>
            <Moon size="0.875rem" />
            <span>Темная тема</span>
          </>
        ) : (
          <>
            <Sun size="0.875rem" />
            <span>Светлая тема</span>
          </>
        )}
      </div>
    </aside>
  );
};
