import React from "react";
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
  return (
    <div className="strategy-card-wrapper server-sync-padding">
      <div className="sync-active-badge">
        <CheckCircle size="0.5rem" className="sync-active-badge-dot" />
        <span className="sync-active-badge-text">
          Синхронизация активна
        </span>
      </div>

      <div className="server-sync-header">
        <h3 className="server-sync-title">Сервер Potok</h3>
        <p className="server-sync-desc">
          Все данные вашей медиатеки, история просмотров и закладки безопасно сохраняются на вашем личном сервере Potok.
        </p>
      </div>

      <hr className="server-sync-divider" />

      <div className="server-benefits-list">
        <BenefitRow
          icon={<ServerIcon size="0.875rem" />}
          color="#a855f7"
          title="Централизованное хранение"
          description="История и списки синхронизируются между всеми вашими клиентами через ваш сервер."
        />
        <BenefitRow
          icon={<Lock size="0.875rem" />}
          color="#10b981"
          title="Полный контроль"
          description="Ваши данные хранятся на вашей собственной базе данных PostgreSQL."
        />
        <BenefitRow
          icon={<User size="0.875rem" />}
          color="#fbbf24"
          title="Многопользовательский режим"
          description="Поддержка раздельных учетных записей с изолированной историей и настройками."
        />
      </div>
    </div>
  );
};
