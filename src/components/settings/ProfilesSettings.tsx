import React, { useState, useEffect } from "react";
import { useAppSettings } from "../../context/AppSettingsContext";
import { useHUD } from "../../context/HUDContext";
import type { ConnectionProfile } from "../../network/ApiTypes";
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
  } = useAppSettings();

  const { show: showHUD } = useHUD();
  const activeProfile = connectionProfiles.find((p) => p.id === activeProfileID) || null;

  const [isAdding, setIsAdding] = useState(false);
  const [formName, setFormName] = useState("");
  const [formGateway, setFormGateway] = useState("");
  const [formTorrentGo, setFormTorrentGo] = useState("");
  const [formSearchEngine, setFormSearchEngine] = useState("");
  const [formTorrentGoAuthEnabled, setFormTorrentGoAuthEnabled] = useState(false);
  const [formTorrentGoAuthLogin, setFormTorrentGoAuthLogin] = useState("");
  const [formTorrentGoAuthPassword, setFormTorrentGoAuthPassword] = useState("");

  const resetForm = () => {
    setFormName("");
    setFormGateway("");
    setFormTorrentGo("");
    setFormSearchEngine("");
    setFormTorrentGoAuthEnabled(false);
    setFormTorrentGoAuthLogin("");
    setFormTorrentGoAuthPassword("");
    setIsAdding(false);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formGateway.trim()) {
      showHUD("warning", "Заполните имя и URL шлюза");
      return;
    }

    const payload = {
      name: formName.trim(),
      gatewayURL: formGateway.trim().replace(/\/$/, ""),
      torrentGoURL: formTorrentGo.trim().replace(/\/$/, ""),
      searchEngineURL: formSearchEngine.trim().replace(/\/$/, ""),
      torrentGoAuthEnabled: formTorrentGoAuthEnabled,
      torrentGoAuthLogin: formTorrentGoAuthLogin.trim(),
      torrentGoAuthPassword: formTorrentGoAuthPassword || undefined,
    };

    if (isAdding) {
      addProfile(payload);
      showHUD("success", "Профиль успешно добавлен");
      resetForm();
    } else if (activeProfile) {
      updateProfile({ ...activeProfile, ...payload });
      showHUD("success", "Профиль успешно сохранен");
    }
  };

  const startEdit = (prof: ConnectionProfile) => {
    setIsAdding(false);
    setFormName(prof.name);
    setFormGateway(prof.gatewayURL);
    setFormTorrentGo(prof.torrentGoURL);
    setFormSearchEngine(prof.searchEngineURL);
    setFormTorrentGoAuthEnabled(prof.torrentGoAuthEnabled);
    setFormTorrentGoAuthLogin(prof.torrentGoAuthLogin);
    setFormTorrentGoAuthPassword(prof.torrentGoAuthPassword || "");
  };

  const startAdd = () => {
    setIsAdding(true);
    resetForm();
  };

  useEffect(() => {
    if (activeProfile && !isAdding) {
      startEdit(activeProfile);
    }
  }, [activeProfileID, isAdding]);

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
          formTorrentGo={formTorrentGo}
          setFormTorrentGo={setFormTorrentGo}
          formSearchEngine={formSearchEngine}
          setFormSearchEngine={setFormSearchEngine}
          formTorrentGoAuthEnabled={formTorrentGoAuthEnabled}
          setFormTorrentGoAuthEnabled={setFormTorrentGoAuthEnabled}
          formTorrentGoAuthLogin={formTorrentGoAuthLogin}
          setFormTorrentGoAuthLogin={setFormTorrentGoAuthLogin}
          formTorrentGoAuthPassword={formTorrentGoAuthPassword}
          setFormTorrentGoAuthPassword={setFormTorrentGoAuthPassword}
          onSave={handleSaveProfile}
          onCancel={resetForm}
          isSettingsLocked={isSettingsLocked}
        />
      </div>
    </div>
  );
};

ProfilesSettings.displayName = "ProfilesSettings";
export default ProfilesSettings;
