import React, { useState } from "react";
import { useWikiPages } from "./wiki/useWikiPages";
import { SandboxPanel } from "../components/wiki/SandboxPanel";
import { WikiHeader } from "../components/wiki/WikiHeader";
import { WikiSidebar } from "../components/wiki/WikiSidebar";
import { WikiBreadcrumbs } from "../components/wiki/WikiBreadcrumbs";
import { WikiRightSidebar } from "../components/wiki/WikiRightSidebar";
import { useMonacoSandbox } from "../hooks/useMonacoSandbox";
import "../styles/wiki.css";

export const WikiPage: React.FC = () => {
  const pages = useWikiPages();
  const [activePage, setActivePage] = useState<string>("intro");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [searchQuery, setSearchQuery] = useState<string>("");
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

  const openInSandbox = (code: string) => {
    setReferrerPage(activePage);
    setActivePage("sandbox");
    setSandboxTab("result");
    updateSandboxCode(code);
  };

  const filteredPages = Object.entries(pages).filter(([_, info]) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      info.title.toLowerCase().includes(q) ||
      info.category.toLowerCase().includes(q)
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
        />

        <main className="wiki-content-center">
          <WikiBreadcrumbs
            activePage={activePage}
            referrerPage={referrerPage}
            setActivePage={setActivePage}
            pages={pages}
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
            pages[activePage]?.render(openInSandbox)
          )}
        </main>

        <WikiRightSidebar activePage={activePage} pages={pages} />
      </div>
    </div>
  );
};

export default WikiPage;