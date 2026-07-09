import React from "react";
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
  return (
    <div className="wiki-section sb-layout">
      <div className="sb-header">
        <div className="sb-title-group">
          <Chip
            active={sandboxTab === "editor"}
            className="sb-tab-btn"
            onClick={() => setSandboxTab("editor")}
          >
            Редактор кода (JavaScript)
          </Chip>
          <Chip
            active={sandboxTab === "result"}
            className="sb-tab-btn"
            onClick={() => setSandboxTab("result")}
          >
            Превью результата
          </Chip>
        </div>

        <div className="sb-actions">
          <Button variant="primary" className="sb-btn sb-btn-run" onClick={handleRun}>
            <Play size="0.875rem" />
            Запустить
          </Button>
          <Button variant="secondary" className="sb-btn" onClick={handleReset}>
            <RefreshCw size="0.875rem" />
            Сбросить
          </Button>
        </div>
      </div>

      {sandboxTab === "editor" && (
        <div className="sb-panel-stack">
          <div className="sb-editor-panel">
            <div className="sb-editor-header">
              <span>main.js</span>
              {editorLoaded && <span className="sb-connected-label">CONNECTED</span>}
            </div>
            {editorError && <div className="sb-error-banner">{editorError}</div>}
            <div ref={containerRef} className="sb-editor-mount" />
          </div>

          <div className="sb-logs-panel">
            <div className="sb-logs-header">
              <span>КОНСОЛЬ ЛОГОВ</span>
              <span className="sb-clear-logs" onClick={clearLogs}>Очистить</span>
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
                <div className="sb-logs-empty">Логи пусты. Запустите код и совершите действия.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {sandboxTab === "result" && (
        <div className="sb-preview-stack">
          <div className="sb-preview-panel sb-preview-panel--flex">
            <div className="sb-preview-header sb-preview-header--flex">
              <span>Эмулируемый Экран Potok</span>
              <span className="sb-preview-hint">
                Контекст: Свободный рендер
              </span>
            </div>
            <div className="sb-preview-content sb-preview-content--scroll">
              {compiledLayout ? (
                <div className="potok-page-emu standalone-page">
                  <ComponentRenderer schema={compiledLayout} pluginId="potok-sandbox-plugin" />
                </div>
              ) : (
                <div className="sb-preview-empty">
                  Интерфейс не скомпилирован. Вернитесь во вкладку "Редактор" и нажмите "Запустить".
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