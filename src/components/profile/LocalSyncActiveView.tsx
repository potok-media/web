import React from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle, AlertTriangle, Lock, RefreshCw } from "lucide-react";

const BenefitRow: React.FC<{ icon: React.ReactNode; color: string; title: string; description: string }> = ({
  icon,
  color,
  title,
  description,
}) => (
  <div className="benefit-card-local">
    <div
      className="benefit-card-icon-badge-local"
      style={{
        "--benefit-color": color,
        "--benefit-bg": `${color}15`,
        "--benefit-border": `0.0625rem solid ${color}20`,
      } as React.CSSProperties}
    >
      {icon}
    </div>
    <div className="benefit-info-col">
      <span className="benefit-title">{title}</span>
      <span className="benefit-desc">{description}</span>
    </div>
  </div>
);

export const LocalSyncActiveView: React.FC = () => {
  const { t } = useTranslation("profile");
  return (
    <div className="strategy-card-wrapper trakt-connect">
      <div className="sync-active-badge local-mode">
        <CheckCircle size={14} className="sync-active-badge-dot local-mode" />
        <span className="sync-active-badge-text local-mode">
          {t("localSync.syncActive")}
        </span>
      </div>

      <div>
        <h3 className="server-sync-title">{t("localSync.title")}</h3>
        <p className="server-sync-desc">
          {t("localSync.description")}
        </p>
      </div>

      <hr className="server-sync-divider" />

      <div className="local-benefits-grid">
        <BenefitRow
          icon={<AlertTriangle size={22} />}
          color="#10b981"
          title={t("localSync.benefits.fullyOffline.title")}
          description={t("localSync.benefits.fullyOffline.description")}
        />
        <BenefitRow
          icon={<Lock size={22} />}
          color="#fbbf24"
          title={t("localSync.benefits.absoluteControl.title")}
          description={t("localSync.benefits.absoluteControl.description")}
        />
        <BenefitRow
          icon={<RefreshCw size={22} />}
          color="var(--accent)"
          title={t("localSync.benefits.instantResponse.title")}
          description={t("localSync.benefits.instantResponse.description")}
        />
      </div>
    </div>
  );
};
