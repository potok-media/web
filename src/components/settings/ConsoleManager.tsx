import React, { useState, useEffect, useRef, useMemo } from "react";
import { Terminal, Trash2, Search, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { logger } from "../../utils/logger";
import type { LogEntry } from "../../utils/logger";
import { FocusableButton, FocusableInput } from "../common/TVNavigation";
import "../../styles/console.css";

export const ConsoleManager: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>(() => logger.getHistory());
  const [activeFilter, setActiveFilter] = useState<"all" | "info" | "warn" | "error">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Subscribe to logger events to get real-time logs
  useEffect(() => {
    const unsubscribe = logger.subscribe((entry) => {
      if (entry.id.startsWith("log-clear-")) {
        setLogs([]);
      } else {
        setLogs((prev) => {
          const next = [...prev, entry];
          if (next.length > 1000) {
            next.shift();
          }
          return next;
        });
      }
    });

    // Load current history on mount
    setLogs(logger.getHistory());

    return () => unsubscribe();
  }, []);

  // Filter logs based on type and search query
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesType = activeFilter === "all" || log.type === activeFilter;
      const matchesSearch =
        !searchQuery.trim() ||
        log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.type.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [logs, activeFilter, searchQuery]);

  // Auto-scroll to bottom when console mounts or logs/filters change
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [activeFilter, searchQuery, filteredLogs.length]);

  const handleClear = () => {
    logger.clearHistory();
  };

  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    const s = String(d.getSeconds()).padStart(2, "0");
    const ms = String(d.getMilliseconds()).padStart(3, "0");
    return `${h}:${m}:${s}.${ms}`;
  };

  const getLogIcon = (type: "info" | "warn" | "error") => {
    switch (type) {
      case "error":
        return <AlertCircle size={14} className="log-icon-error" />;
      case "warn":
        return <AlertTriangle size={14} className="log-icon-warn" />;
      default:
        return <Info size={14} className="log-icon-info" />;
    }
  };

  return (
    <div className="potok-vstack console-manager-container">
      <div className="console-toolbar">
        <div className="console-tabs">
          <FocusableButton
            className={`console-tab-btn ${activeFilter === "all" ? "active" : ""}`}
            onClick={() => setActiveFilter("all")}
          >
            <span>Все</span>
            <span className="console-badge bg-all">{logs.length}</span>
          </FocusableButton>
          <FocusableButton
            className={`console-tab-btn ${activeFilter === "info" ? "active" : ""}`}
            onClick={() => setActiveFilter("info")}
          >
            <span>Инфо</span>
            <span className="console-badge bg-info">
              {logs.filter((l) => l.type === "info").length}
            </span>
          </FocusableButton>
          <FocusableButton
            className={`console-tab-btn ${activeFilter === "warn" ? "active" : ""}`}
            onClick={() => setActiveFilter("warn")}
          >
            <span>Предупреждения</span>
            <span className="console-badge bg-warn">
              {logs.filter((l) => l.type === "warn").length}
            </span>
          </FocusableButton>
          <FocusableButton
            className={`console-tab-btn ${activeFilter === "error" ? "active" : ""}`}
            onClick={() => setActiveFilter("error")}
          >
            <span>Ошибки</span>
            <span className="console-badge bg-error">
              {logs.filter((l) => l.type === "error").length}
            </span>
          </FocusableButton>
        </div>

        <div className="console-actions">
          <div className="console-search-wrapper">
            <Search size={14} className="console-search-icon" />
            <FocusableInput
              type="text"
              placeholder="Фильтр логов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="console-search-input"
            />
          </div>
          <FocusableButton
            className="potok-btn potok-btn-ghost console-clear-btn"
            onClick={handleClear}
            title="Очистить консоль"
          >
            <Trash2 size={16} />
            <span>Очистить</span>
          </FocusableButton>
        </div>
      </div>

      <div className="console-viewport-wrapper">
        <div className="console-viewport-header">
          <Terminal size={14} />
          <span>Системный вывод Potok</span>
        </div>
        <div className="console-viewport" ref={containerRef}>
          {filteredLogs.length === 0 ? (
            <div className="console-empty">
              <Terminal size={32} className="console-empty-icon" />
              <span className="console-empty-text">Логи отсутствуют</span>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className={`console-line log-type-${log.type}`}>
                <div className="log-meta">
                  <span className="log-time">[{formatTime(log.timestamp)}]</span>
                  <span className={`log-badge badge-${log.type}`}>
                    {getLogIcon(log.type)}
                    <span>{log.type.toUpperCase()}</span>
                  </span>
                </div>
                <span className="log-msg selectable-text">{log.message}</span>
              </div>
            ))
          )}
          <div ref={consoleEndRef} />
        </div>
      </div>
    </div>
  );
};

export default ConsoleManager;
