import React from "react";
import { Play, RefreshCw } from "lucide-react";
import { ComponentRenderer } from "../common/extension/ComponentRenderer";

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
  compiledLayout: any;
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
          <button 
            className={`sb-tab-btn ${sandboxTab === "editor" ? "active" : ""}`}
            onClick={() => setSandboxTab("editor")}
          >
            Редактор кода (JavaScript)
          </button>
          <button 
            className={`sb-tab-btn ${sandboxTab === "result" ? "active" : ""}`}
            onClick={() => setSandboxTab("result")}
          >
            Превью результата
          </button>
        </div>

        <div className="sb-actions">
          <button className="sb-btn sb-btn-run" onClick={handleRun}>
            <Play size="0.875rem" />
            Запустить
          </button>
          <button className="sb-btn" onClick={handleReset}>
            <RefreshCw size="0.875rem" />
            Сбросить
          </button>
        </div>
      </div>

      {sandboxTab === "editor" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-m)" }}>
          <div className="sb-editor-panel">
            <div className="sb-editor-header">
              <span>main.js</span>
              {editorLoaded && <span style={{ color: "var(--accent-color)", fontWeight: "bold" }}>CONNECTED</span>}
            </div>
            {editorError && <div style={{ padding: "var(--space-m)", color: "var(--error)" }}>{editorError}</div>}
            <div 
              ref={containerRef} 
              style={{ 
                height: "25rem", 
                resize: "vertical", 
                overflow: "hidden", 
                minHeight: "15rem", 
                borderBottom: "1px solid rgba(255, 255, 255, 0.05)" 
              }} 
            />
          </div>

          <div className="sb-logs-panel">
            <div className="sb-logs-header">
              <span>КОНСОЛЬ ЛОГОВ</span>
              <span style={{ cursor: "pointer" }} onClick={clearLogs}>Очистить</span>
            </div>
            <div className="sb-logs-body" style={{ height: "8.75rem" }}>
              {logs.length > 0 ? (
                logs.map((log) => (
                  <div key={log.id} style={{ display: "flex", gap: "var(--space-xs)" }}>
                    <span style={{ color: "var(--text-muted)" }}>[{log.timestamp}]</span>
                    <span style={{ fontWeight: 700, color: "var(--accent-color)" }}>{log.type}</span>
                    <span style={{ color: "var(--text-secondary)" }}>{log.message}</span>
                  </div>
                ))
              ) : (
                <div style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Логи пусты. Запустите код и совершите действия.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {sandboxTab === "result" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-m)", width: "100%", height: "100%", minHeight: 0 }}>
          <div className="sb-preview-panel" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div className="sb-preview-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <span>Эмулируемый Экран Potok</span>
              <span style={{ fontSize: "var(--font-size-caption, 0.7rem)", color: "var(--text-muted)" }}>
                Контекст: Свободный рендер
              </span>
            </div>
            <div className="sb-preview-content" style={{ flex: 1, overflowY: "auto", background: "#0c1017", padding: "var(--space-m)" }}>
              {compiledLayout ? (
                <div className="potok-page-emu standalone-page">
                  <ComponentRenderer schema={compiledLayout} pluginId="potok-sandbox-plugin" />
                </div>
              ) : (
                <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "var(--space-xl)" }}>
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
