import React from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Settings as SettingsIcon } from "lucide-react";
import type { ConnectionProfile } from "../network/ApiTypes";
import { Focusable, FocusableButton } from "./common/TVNavigation";

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
          <Focusable
            key={p.id}
            onEnterPress={() => {
              onSelectProfile(p.id);
              onStartEdit(p);
            }}
          >
            {({ ref, focused }) => (
              <div
                ref={ref}
                className={`profile-card ${p.id === activeProfileID ? "active" : ""} ${focused ? "focused" : ""}`}
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
                    <FocusableButton
                      className="profile-btn delete"
                      onClick={(e) => handleDeleteClick(e, p.id)}
                      title={t("profileSelector.deleteProfile")}
                    >
                      <Trash2 size="1rem" />
                    </FocusableButton>
                  </div>
                )}
              </div>
            )}
          </Focusable>
        ))}
      </div>

      {!isSettingsLocked && (
        <FocusableButton
          className="settings-btn-primary settings-add-profile-btn"
          onClick={onStartAdd}
          disabled={connectionProfiles.length >= 5}
        >
          <Plus size="1rem" />
          <span>{t("profileSelector.addProfile")}</span>
        </FocusableButton>
      )}
    </section>
  );
});

ProfileSelector.displayName = "ProfileSelector";
export default ProfileSelector;
