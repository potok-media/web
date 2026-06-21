import React from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle, Server as ServerIcon, Lock, User } from "lucide-react";

const BenefitRow: React.FC<{ icon: React.ReactNode; color: string; title: string; description: string }> = ({
  icon,
  color,
  title,
  description,
}) => (
  <div className="benefit-row-container">
    <div
      className="benefit-icon-badge"
      style={{
        color,
        background: `${color}1e`,
        border: `0.0625rem solid ${color}33`,
      }}
    >
      {icon}
    </div>
    <div className="benefit-info-col">
      <span className="benefit-title">{title}</span>
      <span className="benefit-desc">{description}</span>
    </div>
  </div>
);

export const ServerSyncActiveView: React.FC = () => {
  const { t } = useTranslation("profile");
  return (
    <div className="strategy-card-wrapper server-sync-padding">
      <div className="sync-active-badge">
        <CheckCircle size="0.5rem" className="sync-active-badge-dot" />
        <span className="sync-active-badge-text">
          {t("serverSync.syncActive")}
        </span>
      </div>

      <div className="server-sync-header">
        <h3 className="server-sync-title">{t("serverSync.title")}</h3>
        <p className="server-sync-desc">
          {t("serverSync.description")}
        </p>
      </div>

      <hr className="server-sync-divider" />

      <div className="server-benefits-list">
        <BenefitRow
          icon={<ServerIcon size="0.875rem" />}
          color="#a855f7"
          title={t("serverSync.benefits.centralized.title")}
          description={t("serverSync.benefits.centralized.description")}
        />
        <BenefitRow
          icon={<Lock size="0.875rem" />}
          color="#10b981"
          title={t("serverSync.benefits.fullControl.title")}
          description={t("serverSync.benefits.fullControl.description")}
        />
        <BenefitRow
          icon={<User size="0.875rem" />}
          color="#fbbf24"
          title={t("serverSync.benefits.multiUser.title")}
          description={t("serverSync.benefits.multiUser.description")}
        />
      </div>
    </div>
  );
};
