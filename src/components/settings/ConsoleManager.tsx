import React, { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Terminal, Trash2, Search, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { logger } from "../../utils/logger";
import type { LogEntry } from "../../utils/logger";

import "../../styles/console.css";
import { Button, Chip, Input } from "../ui";

export const ConsoleManager: React.FC = () => {
  const { t } = useTranslation("settings");
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
        return <AlertCircle size="0.875rem" className="log-icon-error" />;
      case "warn":
        return <AlertTriangle size="0.875rem" className="log-icon-warn" />;
      default:
        return <Info size="0.875rem" className="log-icon-info" />;
    }
  };

  return (
    <div className="potok-vstack console-manager-container">
      <div className="console-toolbar">
        <div className="console-tabs">
          <Chip active={activeFilter === "all"} className="console-tab-btn" onClick={() => setActiveFilter("all")}>
            <span>{t("console.filterAll")}</span>
            <span className="console-badge bg-all">{logs.length}</span>
          </Chip>
          <Chip active={activeFilter === "info"} className="console-tab-btn" onClick={() => setActiveFilter("info")}>
            <span>{t("console.filterInfo")}</span>
            <span className="console-badge bg-info">
              {logs.filter((l) => l.type === "info").length}
            </span>
          </Chip>
          <Chip active={activeFilter === "warn"} className="console-tab-btn" onClick={() => setActiveFilter("warn")}>
            <span>{t("console.filterWarnings")}</span>
            <span className="console-badge bg-warn">
              {logs.filter((l) => l.type === "warn").length}
            </span>
          </Chip>
          <Chip active={activeFilter === "error"} className="console-tab-btn" onClick={() => setActiveFilter("error")}>
            <span>{t("console.filterErrors")}</span>
            <span className="console-badge bg-error">
              {logs.filter((l) => l.type === "error").length}
            </span>
          </Chip>
        </div>

        <div className="console-actions">
          <div className="console-search-wrapper">
            <Search size="0.875rem" className="console-search-icon" />
            <Input
              type="text"
              placeholder={t("console.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="console-search-input"
            />
          </div>
          <Button
            variant="ghost"
            className="console-clear-btn"
            onClick={handleClear}
            title={t("console.clearConsole")}
          >
            <Trash2 size="1rem" />
            <span>{t("console.clear")}</span>
          </Button>
        </div>
      </div>

      <div className="console-viewport-wrapper">
        <div className="console-viewport-header">
          <Terminal size="0.875rem" />
          <span>{t("console.systemOutput")}</span>
        </div>
        <div className="console-viewport" ref={containerRef}>
          {filteredLogs.length === 0 ? (
            <div className="console-empty">
              <Terminal size="2rem" className="console-empty-icon" />
              <span className="console-empty-text">{t("console.empty")}</span>
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
