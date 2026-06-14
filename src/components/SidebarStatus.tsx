import React from "react";
import { useConnectionHealth, useConnectionLatency } from "../context/AppSettingsContext";

export const SidebarStatus: React.FC = React.memo(() => {
  const { connectionState } = useConnectionHealth();
  const { bffLatencyMs } = useConnectionLatency();
  const isConnected = connectionState === "connected";
  const getStatusColor = (configured: boolean, online: boolean, latency: number) => {
    if (!configured) return "offline";
    if (!online || latency < 0) return "error";
    if (latency <= 100) return "online";
    if (latency <= 300) return "warning";
    return "error";
  };

  const getLatencyLabel = (configured: boolean, online: boolean, latency: number) => {
    if (!configured) return "выкл";
    if (!online || latency < 0) return "оффлайн";
    return `${latency} ms`;
  };

  return (
    <div className="sidebar-footer">
      <div className="sidebar-status-group">
        <div className="sidebar-status-row">
          <span className={`sidebar-status-dot ${isConnected ? getStatusColor(true, true, bffLatencyMs) : "offline"}`} />
          <span className="sidebar-status-label">Сервер Potok</span>
          <span className="sidebar-status-latency">
            {isConnected ? getLatencyLabel(true, true, bffLatencyMs) : "оффлайн"}
          </span>
        </div>

        <div id="sidebar-status-slot" />
      </div>
    </div>
  );
});

SidebarStatus.displayName = "SidebarStatus";
export default SidebarStatus;
