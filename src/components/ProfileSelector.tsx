import React from "react";
import { Plus, Trash2, Settings as SettingsIcon } from "lucide-react";
import type { ConnectionProfile } from "../network/ApiTypes";

interface ProfileSelectorProps {
  connectionProfiles: ConnectionProfile[];
  activeProfileID: string | null;
  onSelectProfile: (id: string) => void;
  onStartEdit: (prof: ConnectionProfile) => void;
  onDeleteProfile: (id: string) => void;
  onStartAdd: () => void;
  showHUD: (type: "success" | "error" | "info" | "warning", msg: string) => void;
  isSettingsLocked?: boolean;
}

export const ProfileSelector: React.FC<ProfileSelectorProps> = React.memo(({
  connectionProfiles,
  activeProfileID,
  onSelectProfile,
  onStartEdit,
  onDeleteProfile,
  onStartAdd,
  showHUD,
  isSettingsLocked = false,
}) => {
  const handleDeleteClick = (e: React.MouseEvent, profileId: string) => {
    e.stopPropagation();
    if (connectionProfiles.length <= 1) {
      showHUD("error", "Нельзя удалить единственный профиль");
      return;
    }
    onDeleteProfile(profileId);
    showHUD("info", "Профиль удален");
  };

  return (
    <section className="settings-section">
      <h2 className="settings-section-title">
        <SettingsIcon size={20} />
        <span>Профили подключения</span>
      </h2>

      <div className="profiles-list">
        {connectionProfiles.map((p) => (
          <div
            key={p.id}
            className={`profile-card ${p.id === activeProfileID ? "active" : ""}`}
            onClick={() => {
              onSelectProfile(p.id);
              onStartEdit(p);
            }}
          >
            <div className="profile-card-info">
              <span className="profile-card-name">{p.name}</span>
              <span className="profile-card-url">{p.gatewayURL}</span>
            </div>
            {!isSettingsLocked && (
              <div className="profile-actions">
                <button
                  className="profile-btn delete"
                  onClick={(e) => handleDeleteClick(e, p.id)}
                  title="Удалить профиль"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {!isSettingsLocked && (
        <button
          className="settings-btn-primary settings-add-profile-btn"
          onClick={onStartAdd}
        >
          <Plus size={16} />
          <span>Добавить профиль</span>
        </button>
      )}
    </section>
  );
});

ProfileSelector.displayName = "ProfileSelector";
export default ProfileSelector;
