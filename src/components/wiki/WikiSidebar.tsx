import React from "react";
import { 
  FileCode, 
  Sliders, 
  Tv, 
  Terminal, 
  ChevronDown, 
  Moon, 
  Sun 
} from "lucide-react";

interface WikiSidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  filteredPages: [string, { title: string; category: string }][];
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  apiExpanded: boolean;
  setApiExpanded: (expanded: boolean) => void;
  componentsExpanded: boolean;
  setComponentsExpanded: (expanded: boolean) => void;
}

export const WikiSidebar: React.FC<WikiSidebarProps> = ({
  activePage,
  setActivePage,
  filteredPages,
  theme,
  setTheme,
  apiExpanded,
  setApiExpanded,
  componentsExpanded,
  setComponentsExpanded,
}) => {
  return (
    <aside className="wiki-sidebar-nav">
      <div className="wiki-sidebar-scroll-content">
        <div className="wiki-sidebar-group">
          <div className="wiki-sidebar-group-title">Введение</div>
          {filteredPages
            .filter(([_, info]) => info.category === "Введение")
            .map(([key, info]) => (
              <div 
                className={`wiki-sidebar-item ${activePage === key ? "active" : ""}`}
                key={key}
                onClick={() => setActivePage(key)}
              >
                <FileCode size={14} />
                <span>{info.title}</span>
              </div>
            ))}
        </div>

        <div className="wiki-sidebar-group">
          <div 
            className="wiki-sidebar-group-title" 
            onClick={() => setApiExpanded(!apiExpanded)}
          >
            <span>API методы</span>
            <ChevronDown 
              size={14} 
              style={{ 
                transform: apiExpanded ? "rotate(0deg)" : "rotate(-90deg)", 
                transition: "transform 0.2s" 
              }} 
            />
          </div>
          
          {apiExpanded && filteredPages
            .filter(([_, info]) => info.category === "API")
            .map(([key, info]) => (
              <div 
                className={`wiki-sidebar-item ${activePage === key ? "active" : ""}`}
                key={key}
                onClick={() => setActivePage(key)}
              >
                <Sliders size={14} />
                <span>{info.title}</span>
              </div>
            ))}
        </div>

        <div className="wiki-sidebar-group">
          <div 
            className="wiki-sidebar-group-title" 
            onClick={() => setComponentsExpanded(!componentsExpanded)}
          >
            <span>Компоненты UI</span>
            <ChevronDown 
              size={14} 
              style={{ 
                transform: componentsExpanded ? "rotate(0deg)" : "rotate(-90deg)", 
                transition: "transform 0.2s" 
              }} 
            />
          </div>
          
          {componentsExpanded && filteredPages
            .filter(([_, info]) => info.category === "Компоненты")
            .map(([key, info]) => (
              <div 
                className={`wiki-sidebar-item ${activePage === key ? "active" : ""}`}
                key={key}
                onClick={() => setActivePage(key)}
              >
                <Tv size={14} />
                <span>{info.title}</span>
              </div>
            ))}
        </div>

        <div className="wiki-sidebar-group">
          <div className="wiki-sidebar-group-title">Разработка</div>
          <div 
            className={`wiki-sidebar-item ${activePage === "sandbox" ? "active" : ""}`}
            onClick={() => setActivePage("sandbox")}
          >
            <Terminal size={14} />
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
            <Moon size={14} />
            <span>Темная тема</span>
          </>
        ) : (
          <>
            <Sun size={14} />
            <span>Светлая тема</span>
          </>
        )}
      </div>
    </aside>
  );
};
