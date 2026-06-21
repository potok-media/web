import React from "react";
import { useTranslation } from "react-i18next";
import { useConnectionHealth, useConnectionLatency } from "../context/AppSettingsContext";
import { Slot } from "./common/extension/Slot";

export const SidebarStatus: React.FC = React.memo(() => {
  const { connectionState } = useConnectionHealth();
  const { bffLatencyMs } = useConnectionLatency();
  const { t } = useTranslation("sidebar");
  const isConnected = connectionState === "connected";
  const getStatusColor = (configured: boolean, online: boolean, latency: number) => {
    if (!configured) return "offline";
    if (!online || latency < 0) return "error";
    if (latency <= 100) return "online";
    if (latency <= 300) return "warning";
    return "error";
  };

  const getLatencyLabel = (configured: boolean, online: boolean, latency: number) => {
    if (!configured) return t("statusOff");
    if (!online || latency < 0) return t("statusOffline");
    return `${latency} ms`;
  };

  return (
    <div className="sidebar-footer">
      <div className="sidebar-status-group">
        <div className="sidebar-status-row">
          <span className={`sidebar-status-dot ${isConnected ? getStatusColor(true, true, bffLatencyMs) : "offline"}`} />
          <span className="sidebar-status-label">{t("potokServer")}</span>
          <span className="sidebar-status-latency">
            {isConnected ? getLatencyLabel(true, true, bffLatencyMs) : t("statusOffline")}
          </span>
        </div>

        <Slot name="sidebar-status" />
      </div>
    </div>
  );
});

SidebarStatus.displayName = "SidebarStatus";
export default SidebarStatus;
