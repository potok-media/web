import React from "react";
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
        color,
        background: `${color}15`,
        border: `0.0625rem solid ${color}20`,
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

export const LocalSyncActiveView: React.FC = () => {
  return (
    <div className="strategy-card-wrapper trakt-connect">
      <div className="sync-active-badge local-mode">
        <CheckCircle size={14} className="sync-active-badge-dot local-mode" />
        <span className="sync-active-badge-text local-mode">
          Синхронизация активна
        </span>
      </div>

      <div>
        <h3 className="server-sync-title">Локальный режим</h3>
        <p className="server-sync-desc">
          Все данные вашей медиатеки и история просмотров хранятся исключительно на этом устройстве. Подключение к сети не требуется.
        </p>
      </div>

      <hr className="server-sync-divider" />

      <div className="local-benefits-grid">
        <BenefitRow
          icon={<AlertTriangle size={22} />}
          color="#10b981"
          title="Полная автономность"
          description="Все данные вашей медиатеки и история просмотров хранятся локально."
        />
        <BenefitRow
          icon={<Lock size={22} />}
          color="#fbbf24"
          title="Абсолютный контроль"
          description="Абсолютная приватность и безопасность без отправки вашей истории на внешние серверы."
        />
        <BenefitRow
          icon={<RefreshCw size={22} />}
          color="var(--accent)"
          title="Мгновенный отклик"
          description="Нулевая задержка сети при сохранении ваших отметок, истории и списков."
        />
      </div>
    </div>
  );
};
