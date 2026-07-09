import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSettings } from "../../context/AppSettingsContext";
import { useHUD } from "../../context/useHUD";
import { useProfileHandshake } from "../../hooks/useProfileHandshake";
import ProfileSelector from "../ProfileSelector";
import ProfileEditorForm from "../ProfileEditorForm";

export const ProfilesSettings: React.FC = () => {
  const {
    connectionProfiles,
    activeProfileID,
    isSettingsLocked,
    selectProfile,
    addProfile,
    deleteProfile,
    updateProfile,
  } = useSettings();

  const { show: showHUD } = useHUD();
  const { t } = useTranslation("settings");
  const { checkReachable, normalizeGateway } = useProfileHandshake();
  const activeProfile = connectionProfiles.find((p) => p.id === activeProfileID) || null;

  const [isAdding, setIsAdding] = useState(false);
  const [formName, setFormName] = useState("");
  const [formGateway, setFormGateway] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isAdding) return;
    setFormName(activeProfile?.name || "");
    setFormGateway(activeProfile?.gatewayURL || "");
  }, [activeProfileID, isAdding, activeProfile?.name, activeProfile?.gatewayURL]);

  const startEdit = () => setIsAdding(false);

  const startAdd = () => {
    setIsAdding(true);
    setFormName("");
    setFormGateway("");
  };

  const cancelAdd = () => setIsAdding(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || isSettingsLocked) return;

    const name = formName.trim();
    if (!name) {
      showHUD("warning", t("profiles.errorEmptyName"));
      return;
    }

    const v = normalizeGateway(formGateway);
    if (!v.ok) {
      showHUD("error", v.error ? t(v.error) : t("profiles.errorInvalidAddress"));
      return;
    }

    setSaving(true);
    const reachable = await checkReachable(v.url);
    setSaving(false);
    if (!reachable) return;

    if (isAdding) {
      addProfile({
        name,
        gatewayURL: v.url,
        playerServerURL: "",
        searchEngineURL: "",
        playerServerAuthEnabled: false,
        playerServerAuthLogin: "",
      });
      setIsAdding(false);
      showHUD("success", t("profiles.profileAdded"));
    } else if (activeProfile) {
      updateProfile({ ...activeProfile, name, gatewayURL: v.url });
      showHUD("success", t("profiles.saved"));
    }
  };

  return (
    <div className="settings-profiles-layout">
      <div className="settings-profiles-sidebar-col">
        <ProfileSelector
          connectionProfiles={connectionProfiles}
          activeProfileID={activeProfileID}
          onSelectProfile={selectProfile}
          onStartEdit={startEdit}
          onDeleteProfile={deleteProfile}
          onStartAdd={startAdd}
          showHUD={showHUD}
          isSettingsLocked={isSettingsLocked}
        />
      </div>
      <div className="settings-profiles-content-col">
        <ProfileEditorForm
          isAdding={isAdding}
          formName={formName}
          setFormName={setFormName}
          formGateway={formGateway}
          setFormGateway={setFormGateway}
          onSave={handleSaveProfile}
          onCancel={cancelAdd}
          saving={saving}
          isSettingsLocked={isSettingsLocked}
        />
      </div>
    </div>
  );
};

ProfilesSettings.displayName = "ProfilesSettings";
export default ProfilesSettings;