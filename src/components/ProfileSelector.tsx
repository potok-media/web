import React from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Settings as SettingsIcon, CheckCircle2, Circle } from "lucide-react";
import type { ConnectionProfile } from "../network/ApiTypes";
import { Button, IconButton } from "./ui";

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
  const { t } = useTranslation("settings");

  const handleDeleteClick = (e: React.MouseEvent, profileId: string) => {
    e.stopPropagation();
    if (connectionProfiles.length <= 1) {
      showHUD("error", t("profileSelector.cannotDeleteLast"));
      return;
    }
    onDeleteProfile(profileId);
    showHUD("info", t("profileSelector.profileDeleted"));
  };

  return (
    <section className="settings-section">
      <h2 className="settings-section-title">
        <SettingsIcon size="1.25rem" />
        <span>{t("profileSelector.title")}</span>
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
            <span className="profile-card-indicator">
              {p.id === activeProfileID ? <CheckCircle2 size="1.125rem" /> : <Circle size="1.125rem" />}
            </span>
            <div className="profile-card-info">
              <span className="profile-card-name">{p.name}</span>
              <span className="profile-card-url">{p.gatewayURL}</span>
            </div>
            <div className="profile-card-right">
              {p.id === activeProfileID && (
                <span className="profile-card-badge">{t("profileSelector.active")}</span>
              )}
              {!isSettingsLocked && (
                <IconButton
                  className="profile-btn delete"
                  onClick={(e) => handleDeleteClick(e, p.id)}
                  title={t("profileSelector.deleteProfile")}
                  aria-label={t("profileSelector.deleteProfile")}
                >
                  <Trash2 size="1rem" />
                </IconButton>
              )}
            </div>
          </div>
        ))}
      </div>

      {!isSettingsLocked && (
        <Button
          variant="primary"
          className="settings-add-profile-btn"
          onClick={onStartAdd}
          disabled={connectionProfiles.length >= 5}
        >
          <Plus size="1rem" />
          <span>{t("profileSelector.addProfile")}</span>
        </Button>
      )}
    </section>
  );
});

ProfileSelector.displayName = "ProfileSelector";
export default ProfileSelector;
