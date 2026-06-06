import React, { useEffect, useState } from "react";
import { PAGES } from "./wiki/wikiData";
import { SandboxPanel } from "../components/wiki/SandboxPanel";
import { WikiHeader } from "../components/wiki/WikiHeader";
import { WikiSidebar } from "../components/wiki/WikiSidebar";
import { WikiBreadcrumbs } from "../components/wiki/WikiBreadcrumbs";
import { WikiRightSidebar } from "../components/wiki/WikiRightSidebar";
import { useMonacoSandbox } from "../hooks/useMonacoSandbox";
import "../styles/wiki.css";

export const WikiPage: React.FC = () => {
  const [activePage, setActivePage] = useState<string>("intro");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [apiExpanded, setApiExpanded] = useState(true);
  const [componentsExpanded, setComponentsExpanded] = useState(false);
  const [referrerPage, setReferrerPage] = useState<string>("intro");

  const {
    sandboxTab,
    setSandboxTab,
    editorLoaded,
    editorError,
    compiledLayout,
    logs,
    clearLogs,
    containerRef,
    handleRun,
    handleReset,
    updateSandboxCode,
  } = useMonacoSandbox(activePage, theme);

  useEffect(() => {
    const componentKeys = [
      "layout-components", "card-components", "text-components", "status-components",
      "input-components", "select-editor-components", "media-cards-components",
      "hero-loading-components", "episode-components", "cast-overview-components",
      "stream-row-list-components", "search-filter-components", "player-profile-selector"
    ];
    const coreKeys = [
      "manifest", "state", "http", "storage", "ui-methods", "slots", "media-sources"
    ];

    if (componentKeys.includes(activePage)) {
      setComponentsExpanded(true);
    }
    if (coreKeys.includes(activePage)) {
      setApiExpanded(true);
    }
  }, [activePage]);

  const openInSandbox = (code: string) => {
    setReferrerPage(activePage);
    setActivePage("sandbox");
    setSandboxTab("result");
    updateSandboxCode(code);
  };

  const filteredPages = Object.entries(PAGES).filter(([_, info]) => {
    if (!searchQuery) return true;
    return (
      info.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      info.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className={`wiki-container theme-${theme}`}>
      <WikiHeader 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery} 
      />

      <div className={`wiki-body-layout ${activePage === "sandbox" ? "layout-sandbox-view" : ""}`}>
        <WikiSidebar
          activePage={activePage}
          setActivePage={setActivePage}
          filteredPages={filteredPages}
          theme={theme}
          setTheme={setTheme}
          apiExpanded={apiExpanded}
          setApiExpanded={setApiExpanded}
          componentsExpanded={componentsExpanded}
          setComponentsExpanded={setComponentsExpanded}
        />

        <main className="wiki-content-center">
          <WikiBreadcrumbs
            activePage={activePage}
            referrerPage={referrerPage}
            setActivePage={setActivePage}
          />

          {activePage === "sandbox" ? (
            <SandboxPanel
              editorLoaded={editorLoaded}
              editorError={editorError}
              containerRef={containerRef}
              sandboxTab={sandboxTab}
              setSandboxTab={setSandboxTab}
              logs={logs}
              clearLogs={clearLogs}
              handleRun={handleRun}
              handleReset={handleReset}
              compiledLayout={compiledLayout}
            />
          ) : (
            PAGES[activePage]?.render(openInSandbox)
          )}
        </main>

        <WikiRightSidebar activePage={activePage} />
      </div>
    </div>
  );
};

export default WikiPage;
