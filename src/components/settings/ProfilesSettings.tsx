import React, { useState, useEffect } from "react";
import { useSettings } from "../../context/AppSettingsContext";
import { useHUD } from "../../context/HUDContext";
import { ApiClient } from "../../network/ApiClient";
import ProfileSelector from "../ProfileSelector";
import ProfileEditorForm from "../ProfileEditorForm";

/**
 * Normalize + validate a gateway URL: add https:// if the scheme is missing, strip a trailing
 * slash, and reject garbage — it must parse to an http(s) URL with a real host (domain, IP or
 * localhost). Returns the cleaned URL or an error message.
 */
function normalizeGateway(raw: string): { ok: boolean; url: string; error?: string } {
  let s = raw.trim().replace(/\/+$/, "");
  if (!s) return { ok: false, url: "", error: "Введите адрес шлюза" };
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  let parsed: URL;
  try {
    parsed = new URL(s);
  } catch {
    return { ok: false, url: "", error: "Некорректный адрес (пример: https://api.example.com)" };
  }
  const host = parsed.hostname;
  const isValidHost = host === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(".");
  if (!isValidHost) return { ok: false, url: "", error: "Некорректный адрес сервера" };
  return { ok: true, url: s };
}

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
  const activeProfile = connectionProfiles.find((p) => p.id === activeProfileID) || null;

  const [isAdding, setIsAdding] = useState(false);
  const [formName, setFormName] = useState("");
  const [formGateway, setFormGateway] = useState("");
  const [saving, setSaving] = useState(false);

  // Mirror the selected profile into the form. While composing a NEW profile (isAdding) we leave
  // the form alone so the user's input isn't wiped. Keyed on the active profile's actual fields so
  // a save/select reflects immediately, but typing into an existing profile isn't overwritten
  // (activeProfile only changes on save).
  useEffect(() => {
    if (isAdding) return;
    setFormName(activeProfile?.name || "");
    setFormGateway(activeProfile?.gatewayURL || "");
  }, [activeProfileID, isAdding, activeProfile?.name, activeProfile?.gatewayURL]);

  const startEdit = () => {
    // ProfileSelector already calls onSelectProfile; we just exit add-mode and the effect above
    // loads the selected profile's fields into the form.
    setIsAdding(false);
  };

  const startAdd = () => {
    setIsAdding(true);
    setFormName("");
    setFormGateway("");
  };

  const cancelAdd = () => {
    setIsAdding(false); // the effect re-syncs the form to the active profile
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || isSettingsLocked) return;

    const name = formName.trim();
    if (!name) {
      showHUD("warning", "Введите название профиля");
      return;
    }
    const v = normalizeGateway(formGateway);
    if (!v.ok) {
      showHUD("error", v.error || "Некорректный адрес");
      return;
    }

    // Verify the gateway actually responds before saving — no more silently storing dead URLs.
    setSaving(true);
    let reachable = false;
    try {
      await ApiClient.performHandshake(v.url);
      reachable = true;
    } catch {
      reachable = false;
    }
    setSaving(false);

    if (!reachable) {
      showHUD("error", "Сервер не отвечает по этому адресу");
      return;
    }

    if (isAdding) {
      addProfile({
        name,
        gatewayURL: v.url,
        playerServerURL: "",
        searchEngineURL: "",
        playerServerAuthEnabled: false,
        playerServerAuthLogin: "",
      });
      setIsAdding(false); // effect loads the newly-added (auto-selected) profile into the form
      showHUD("success", "Профиль добавлен");
    } else if (activeProfile) {
      updateProfile({ ...activeProfile, name, gatewayURL: v.url });
      showHUD("success", "Сохранено");
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
