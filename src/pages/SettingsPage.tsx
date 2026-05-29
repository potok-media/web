import React, { useState, useEffect } from "react";
import { Sliders } from "lucide-react";
import { useAppSettings } from "../context/AppSettingsContext";
import { useHUD } from "../context/HUDContext";
import type { ConnectionProfile } from "../network/ApiTypes";
import ProfileSelector from "../components/ProfileSelector";
import ProfileEditorForm from "../components/ProfileEditorForm";
import "../styles/settings.css";

export const SettingsPage: React.FC = () => {
  const {
    connectionProfiles,
    activeProfileID,
    accentTheme,
    defaultPlayer,
    uiFontScale,
    isSettingsLocked,
    selectProfile,
    addProfile,
    deleteProfile,
    updateProfile,
    setAccentTheme,
    setDefaultPlayer,
    setUiFontScale,
  } = useAppSettings();

  const { show: showHUD } = useHUD();

  // Selected profile to edit
  const activeProfile = connectionProfiles.find((p) => p.id === activeProfileID) || null;

  // Form states for creating/editing profile
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
      updateProfile({
        ...activeProfile,
        ...payload,
      });
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
    setFormName("");
    setFormGateway("");
    setFormTorrentGo("");
    setFormSearchEngine("");
    setFormTorrentGoAuthEnabled(false);
    setFormTorrentGoAuthLogin("");
    setFormTorrentGoAuthPassword("");
  };

  useEffect(() => {
    if (activeProfile && !isAdding) {
      startEdit(activeProfile);
    }
  }, [activeProfileID, isAdding]);

  const themes = [
    { id: "nordicFrost", name: "Nordic Frost", color: "#3a86c8" },
    { id: "amberGold", name: "Amber Gold", color: "#f59e0b" },
    { id: "sageMuted", name: "Sage Muted", color: "#4f9e71" },
    { id: "graphite", name: "Graphite", color: "#9ca3af" },
    { id: "system", name: "System Accent", color: "#3b82f6" },
  ];

  return (
    <div className="settings-page-container">
      <header className="settings-page-header">
        <h1 className="settings-page-title">Настройки</h1>
        <p className="settings-page-description">
          Управление подключениями, стилями интерфейса и внешними плеерами.
        </p>
      </header>

      <div className="settings-layout">
        {/* Left Column: Connection Profiles & Preferences */}
        <div className="settings-profile-column">
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

          {/* Preferences Section */}
          <section className="settings-section">
            <h2 className="settings-section-title">
              <Sliders size={20} />
              <span>Внешний вид и плеер</span>
            </h2>

            {/* Theme Selector */}
            <div className="settings-form-group">
              <label className="settings-label">Цветовой акцент</label>
              <div className="theme-options">
                {themes.map((t) => (
                  <div
                    key={t.id}
                    className={`theme-card ${accentTheme === t.id ? "active" : ""}`}
                    onClick={() => setAccentTheme(t.id)}
                  >
                    <span className="theme-dot" style={{ backgroundColor: t.color }} />
                    <span>{t.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Default Player */}
            <div className="settings-form-group settings-preference-group">
              <label className="settings-label">Плеер по умолчанию</label>
              <select
                className="settings-select"
                value={defaultPlayer || "native"}
                onChange={(e) => setDefaultPlayer(e.target.value)}
              >
                <option value="native">Встроенный веб-плеер</option>
                <option value="infuse">Infuse Client (Дип-линк)</option>
              </select>
            </div>

            {/* Font Scale */}
            <div className="settings-form-group settings-preference-group">
              <label className="settings-label">Масштаб интерфейса ({Math.round(uiFontScale * 100)}%)</label>
              <select
                className="settings-select"
                value={uiFontScale}
                onChange={(e) => setUiFontScale(parseFloat(e.target.value))}
              >
                <option value="0.8">Мелкий (80%)</option>
                <option value="0.9">Компактный (90%)</option>
                <option value="1.0">Стандартный (100%)</option>
                <option value="1.1">Увеличенный (110%)</option>
                <option value="1.2">Крупный (120%)</option>
              </select>
            </div>
          </section>
        </div>

        {/* Right Column: Profile Editor Form */}
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

export default SettingsPage;
