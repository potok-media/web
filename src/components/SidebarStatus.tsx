import React from "react";
import { AlertTriangle } from "lucide-react";
import type { ServiceStatus } from "../network/ApiTypes";

interface SidebarStatusProps {
  isConnected: boolean;
  bffLatencyMs: number;
  services: ServiceStatus;
}

export const SidebarStatus: React.FC<SidebarStatusProps> = React.memo(({ isConnected, bffLatencyMs, services }) => {
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

        <div className="sidebar-status-row">
          <span className={`sidebar-status-dot ${isConnected ? getStatusColor(services.searchEngine.configured, services.searchEngine.online, services.searchEngine.latencyMs ?? -1) : "offline"}`} />
          <span className="sidebar-status-label">Поиск медиа</span>
          <span className="sidebar-status-latency">
            {isConnected ? getLatencyLabel(services.searchEngine.configured, services.searchEngine.online, services.searchEngine.latencyMs ?? -1) : "оффлайн"}
          </span>
        </div>

        <div className="sidebar-status-row">
          <span className={`sidebar-status-dot ${isConnected ? getStatusColor(services.torrentGo.configured, services.torrentGo.online, services.torrentGo.latencyMs ?? -1) : "offline"}`} />
          <span className="sidebar-status-label">Торрент-плеер</span>
          <span className="sidebar-status-latency">
            {isConnected ? getLatencyLabel(services.torrentGo.configured, services.torrentGo.online, services.torrentGo.latencyMs ?? -1) : "оффлайн"}
          </span>
        </div>
      </div>

      {isConnected && services.torrentGo.configured && !services.torrentGo.online && (
        <div className="sidebar-alert-offline">
          <AlertTriangle size={14} />
          <span>Торрент-плеер оффлайн</span>
        </div>
      )}
    </div>
  );
});

SidebarStatus.displayName = "SidebarStatus";
export default SidebarStatus;
