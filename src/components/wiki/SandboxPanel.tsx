import React from "react";
import { useTranslation } from "react-i18next";
import { Play, RefreshCw } from "lucide-react";
import type { UIComponentSchema } from "@potok/sdk-types";
import { ComponentRenderer } from "../common/extension/ComponentRenderer";
import { Button, Chip } from "../ui";

interface LogEntry {
  id: string;
  timestamp: string;
  type: string;
  message: string;
}

interface SandboxPanelProps {
  editorLoaded: boolean;
  editorError: string | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  sandboxTab: "editor" | "result";
  setSandboxTab: (tab: "editor" | "result") => void;
  logs: LogEntry[];
  clearLogs: () => void;
  handleRun: () => void;
  handleReset: () => void;
  compiledLayout: UIComponentSchema | null;
}

export const SandboxPanel: React.FC<SandboxPanelProps> = ({
  editorLoaded,
  editorError,
  containerRef,
  sandboxTab,
  setSandboxTab,
  logs,
  clearLogs,
  handleRun,
  handleReset,
  compiledLayout,
}) => {
  const { t } = useTranslation("wiki");

  return (
    <div className="wiki-section sb-layout">
      <div className="sb-header">
        <div className="sb-title-group">
          <Chip
            active={sandboxTab === "editor"}
            className="sb-tab-btn"
            onClick={() => setSandboxTab("editor")}
          >
            {t("sandbox.editorTab")}
          </Chip>
          <Chip
            active={sandboxTab === "result"}
            className="sb-tab-btn"
            onClick={() => setSandboxTab("result")}
          >
            {t("sandbox.previewTab")}
          </Chip>
        </div>

        <div className="sb-actions">
          <Button variant="primary" className="sb-btn sb-btn-run" onClick={handleRun}>
            <Play size="0.875rem" />
            {t("sandbox.run")}
          </Button>
          <Button variant="secondary" className="sb-btn" onClick={handleReset}>
            <RefreshCw size="0.875rem" />
            {t("sandbox.reset")}
          </Button>
        </div>
      </div>

      {sandboxTab === "editor" && (
        <div className="sb-panel-stack">
          <div className="sb-editor-panel">
            <div className="sb-editor-header">
              <span>{t("sandbox.mainFile")}</span>
              {editorLoaded && <span className="sb-connected-label">{t("sandbox.connected")}</span>}
            </div>
            {editorError && <div className="sb-error-banner">{editorError}</div>}
            <div ref={containerRef} className="sb-editor-mount" />
          </div>

          <div className="sb-logs-panel">
            <div className="sb-logs-header">
              <span>{t("sandbox.logsTitle")}</span>
              <span className="sb-clear-logs" onClick={clearLogs}>{t("sandbox.clearLogs")}</span>
            </div>
            <div className="sb-logs-body sb-logs-body--fixed">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <div key={log.id} className="sb-log-row">
                    <span className="sb-log-timestamp">[{log.timestamp}]</span>
                    <span className="sb-log-type">{log.type}</span>
                    <span className="sb-log-message">{log.message}</span>
                  </div>
                ))
              ) : (
                <div className="sb-logs-empty">{t("sandbox.logsEmpty")}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {sandboxTab === "result" && (
        <div className="sb-preview-stack">
          <div className="sb-preview-panel sb-preview-panel--flex">
            <div className="sb-preview-header sb-preview-header--flex">
              <span>{t("sandbox.previewTitle")}</span>
              <span className="sb-preview-hint">
                {t("sandbox.previewContext")}
              </span>
            </div>
            <div className="sb-preview-content sb-preview-content--scroll">
              {compiledLayout ? (
                <div className="potok-page-emu standalone-page">
                  <ComponentRenderer schema={compiledLayout} pluginId="potok-sandbox-plugin" />
                </div>
              ) : (
                <div className="sb-preview-empty">
                  {t("sandbox.previewEmpty")}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SandboxPanel;