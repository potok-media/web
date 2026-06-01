import React from "react";
import { RotateCw } from "lucide-react";

interface UpdateBannerProps {
  availableUpdatesCount: number;
  onViewUpdates: () => void;
}

export const UpdateBanner: React.FC<UpdateBannerProps> = ({
  availableUpdatesCount,
  onViewUpdates,
}) => {
  if (availableUpdatesCount === 0) return null;

  return (
    <div className="potok-update-banner">
      <div className="potok-update-banner-text-wrap" style={{ flexDirection: "row", alignItems: "center", gap: "12px", flex: 1 }}>
        <div className="potok-update-banner-icon-box">
          <RotateCw size={16} className="animate-spin-slow" />
        </div>
        <div className="potok-update-banner-text-wrap">
          <span className="potok-update-banner-title">
            Доступны обновления расширений
          </span>
          <span className="potok-update-banner-subtitle">
            Найдено {availableUpdatesCount} новых версий для ваших установленных плагинов.
          </span>
        </div>
      </div>
      <button 
        type="button"
        className="potok-update-banner-btn" 
        onClick={onViewUpdates}
      >
        Посмотреть и обновить
      </button>
    </div>
  );
};

export default UpdateBanner;
