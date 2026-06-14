import React, { useEffect, useState } from "react";
import { performanceMonitor } from "../../utils/PerformanceMonitor";
import { PlatformManager } from "../../utils/PlatformManager";
import type { FpsDropReport } from "../../utils/PerformanceMonitor";

export const DiagnosticsOverlay: React.FC = () => {
  const [metrics, setMetrics] = useState(() => ({ ...performanceMonitor.metrics }));
  const [fps, setFps] = useState(() => performanceMonitor.getFps());
  const [longTaskCount, setLongTaskCount] = useState(0);
  const [inputLatency, setInputLatency] = useState(0);
  const [lastDropReport, setLastDropReport] = useState<FpsDropReport | null>(() => performanceMonitor.lastFpsDropReport);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const diagParam = searchParams.get("diagnostics");
    
    if (diagParam === "true") {
      localStorage.setItem("showDiagnostics", "true");
    } else if (diagParam === "false") {
      localStorage.setItem("showDiagnostics", "false");
    }

    const showDiagnostics = localStorage.getItem("showDiagnostics");
    const developerMode = localStorage.getItem("developerMode") === "true";
    const isAndroidTV = PlatformManager.getPlatform() === "android-tv";
    
    const visible = showDiagnostics === "true" || 
                    (isAndroidTV && showDiagnostics !== "false") || 
                    developerMode;
                    
    setIsVisible(visible);

    if (!visible) return;

    const handleUpdate = () => {
      setMetrics({ ...performanceMonitor.metrics });
      setFps(performanceMonitor.getFps());
      setLongTaskCount(performanceMonitor.longTasks.length);
      setInputLatency(Math.round(performanceMonitor.inputLatency));
      setLastDropReport(performanceMonitor.lastFpsDropReport);
    };

    performanceMonitor.addListener(handleUpdate);
    
    // Periodically force update FPS since it runs on requestAnimationFrame
    const interval = setInterval(() => {
      setFps(performanceMonitor.getFps());
    }, 500);

    return () => {
      performanceMonitor.removeListener(handleUpdate);
      clearInterval(interval);
    };
  }, []);

  if (!isVisible) return null;

  // Sort components by weight (total time spent rendering)
  const sortedComponents = Object.entries(metrics)
    .map(([name, m]) => ({
      name,
      count: m.count,
      avg: Math.round((m.totalDuration / m.count) * 10) / 10,
      max: Math.round(m.maxDuration * 10) / 10,
      total: Math.round(m.totalDuration),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const getFpsColor = (f: number) => {
    if (f >= 50) return "#4ade80"; // Light green
    if (f >= 30) return "#facc15"; // Yellow
    return "#f87171"; // Red
  };

  const getInputLatencyColor = (l: number) => {
    if (l === 0) return "#94a3b8"; // Slate
    if (l <= 16) return "#4ade80"; // 60 FPS budget
    if (l <= 32) return "#facc15"; // 30 FPS budget
    return "#f87171"; // Slow
  };

  return (
    <div
      style={{
        position: "fixed",
        top: "24px",
        right: "24px",
        zIndex: 9999999, // Ensure it floats above Monaco and everything
        width: "280px",
        maxHeight: "90vh",
        overflowY: "auto",
        background: "rgba(15, 15, 20, 0.92)",
        backdropFilter: "blur(20px)",
        borderRadius: "12px",
        border: "1.5px solid rgba(255, 255, 255, 0.12)",
        padding: "16px",
        color: "#ffffff",
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: "12px",
        boxShadow: "0 12px 36px rgba(0, 0, 0, 0.6)",
        pointerEvents: "auto", // Allow user to scroll/interact with the diagnostics
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", paddingBottom: "8px" }}>
        <span style={{ fontWeight: "bold", letterSpacing: "0.5px", textTransform: "uppercase", color: "#818cf8" }}>
          Potok Diagnostics
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            performanceMonitor.clearMetrics();
          }}
          style={{
            background: "rgba(255, 255, 255, 0.1)",
            border: "none",
            borderRadius: "4px",
            color: "#ffffff",
            padding: "2px 8px",
            fontSize: "10px",
            cursor: "pointer",
            pointerEvents: "auto",
          }}
        >
          Сброс
        </button>
      </div>

      {/* Main performance stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
        <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "8px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ color: "#94a3b8", fontSize: "10px", marginBottom: "4px" }}>Внутренний FPS</div>
          <div style={{ fontSize: "20px", fontWeight: "bold", color: getFpsColor(fps) }}>
            {fps} <span style={{ fontSize: "10px", fontWeight: "normal" }}>кадр/с</span>
          </div>
        </div>
        <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "8px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ color: "#94a3b8", fontSize: "10px", marginBottom: "4px" }}>D-pad задержка</div>
          <div style={{ fontSize: "20px", fontWeight: "bold", color: getInputLatencyColor(inputLatency) }}>
            {inputLatency > 0 ? `${inputLatency} мс` : "--"}
          </div>
        </div>
      </div>

      {/* FPS Drop Report details (MOVED TO TOP FOR HIGH VISIBILITY) */}
      {lastDropReport && (
        <div style={{ border: "1.5px solid rgba(248, 113, 113, 0.4)", borderRadius: "8px", padding: "10px", background: "rgba(248, 113, 113, 0.04)", marginBottom: "16px" }}>
          <div style={{ fontWeight: "bold", color: "#f87171", textTransform: "uppercase", fontSize: "10px", marginBottom: "8px", letterSpacing: "0.5px", display: "flex", justifyContent: "space-between" }}>
            <span>Сбой FPS ({lastDropReport.fps} кадр/с):</span>
            <span style={{ color: "#a3e635" }}>{lastDropReport.time}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "350px", overflowY: "auto", paddingRight: "4px" }}>
            {lastDropReport.activities.slice().reverse().map((act, idx) => {
              let color = "#94a3b8"; // Slate default
              let badgeBg = "rgba(148, 163, 184, 0.1)";
              let label = act.type.toUpperCase();

              if (act.type === "longtask") {
                color = "#f87171";
                badgeBg = "rgba(248, 113, 113, 0.15)";
              } else if (act.type === "render") {
                const isHeavy = act.description.includes("ms") && parseInt(act.description.match(/\d+/)?.[0] || "0") > 16;
                color = isHeavy ? "#fb923c" : "#a3e635";
                badgeBg = isHeavy ? "rgba(251, 146, 60, 0.1)" : "rgba(163, 230, 53, 0.1)";
              } else if (act.type === "api") {
                color = "#38bdf8";
                badgeBg = "rgba(56, 189, 248, 0.1)";
              } else if (act.type === "route") {
                color = "#c084fc";
                badgeBg = "rgba(192, 132, 252, 0.1)";
              } else if (act.type === "scroll" || act.type === "keydown") {
                color = "#fbbf24";
                badgeBg = "rgba(251, 191, 36, 0.1)";
              }

              return (
                <div key={idx} style={{ fontSize: "10px", lineHeight: "1.3", borderBottom: "1px solid rgba(255, 255, 255, 0.05)", paddingBottom: "4px", display: "flex", flexDirection: "column", gap: "2px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "8px", color: "#64748b" }}>{act.time}</span>
                    <span style={{ fontSize: "8px", fontWeight: "bold", color, background: badgeBg, padding: "1px 4px", borderRadius: "3px" }}>{label}</span>
                  </div>
                  <div style={{ color: "#e2e8f0" }}>{act.description}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Platform & Long Tasks details */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px", padding: "8px", background: "rgba(255,255,255,0.02)", borderRadius: "6px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#94a3b8" }}>Платформа:</span>
          <span style={{ fontWeight: "600", color: "#38bdf8" }}>{PlatformManager.getPlatform().toUpperCase()}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#94a3b8" }}>Фризы V8 (&gt;50мс):</span>
          <span style={{ fontWeight: "600", color: longTaskCount > 0 ? "#f87171" : "#4ade80" }}>
            {longTaskCount} шт.
          </span>
        </div>
      </div>

      {/* Top Heavy components list */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontWeight: "bold", color: "#94a3b8", textTransform: "uppercase", fontSize: "10px", marginBottom: "8px", letterSpacing: "0.5px" }}>
          Топ тяжелых компонентов:
        </div>
        {sortedComponents.length === 0 ? (
          <div style={{ color: "#64748b", fontStyle: "italic", textAlign: "center", padding: "10px 0" }}>
            Нет данных рендеринга...
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {sortedComponents.map((item) => {
              const isHeavy = item.avg > 16 || item.count > 15;
              return (
                <div
                  key={item.name}
                  style={{
                    padding: "6px 8px",
                    background: isHeavy ? "rgba(248, 113, 113, 0.08)" : "rgba(255, 255, 255, 0.02)",
                    borderRadius: "4px",
                    borderLeft: `3px solid ${isHeavy ? "#f87171" : "#4ade80"}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                  }}
                >
                  <div style={{ fontWeight: "600", color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.name}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8", fontSize: "10px" }}>
                    <span>Рендеров: <strong style={{ color: "#e2e8f0" }}>{item.count}</strong></span>
                    <span>Ср: <strong style={{ color: "#e2e8f0" }}>{item.avg}мс</strong> (max: {item.max}мс)</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DiagnosticsOverlay;
