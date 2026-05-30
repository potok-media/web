import React, { useState, useEffect } from "react";
import { Sliders, Settings, Puzzle } from "lucide-react";
import { useAppSettings } from "../context/AppSettingsContext";
import { useHUD } from "../context/HUDContext";
import type { ConnectionProfile } from "../network/ApiTypes";
import ProfileSelector from "../components/ProfileSelector";
import ProfileEditorForm from "../components/ProfileEditorForm";
import ExtensionsManager from "../components/ExtensionsManager";
import { ExtensionSlot } from "../components/common/ExtensionSlot";
import { ExtensionRegistry } from "../utils/extensions/ExtensionRegistry";
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
  const [activeTab, setActiveTab] = useState<string>("general");
  const [, setTick] = useState(0);

  const isApple = typeof window !== "undefined" && 
    (/Mac|iPad|iPhone|iPod/.test(navigator.userAgent) || 
     (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

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

  // Subscribe to ExtensionRegistry changes to display extension tabs reactively
  useEffect(() => {
    const handleRegistryChange = () => setTick((t) => t + 1);
    ExtensionRegistry.addListener(handleRegistryChange);
    return () => ExtensionRegistry.removeListener(handleRegistryChange);
  }, []);

  const slotContributions = ExtensionRegistry.getSlotContributions("settings-tabs");
  const themes = [
    { id: "nordicFrost", name: "Nordic Frost", color: "#3a86c8" },
    { id: "amberGold", name: "Amber Gold", color: "#f59e0b" },
    { id: "sageMuted", name: "Sage Muted", color: "#4f9e71" },
    { id: "graphite", name: "Graphite", color: "#9ca3af" },
    { id: "system", name: "System Accent", color: "#3b82f6" },
  ];

  const renderGeneral = () => (
    <div className="settings-layout">
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
        <section className="settings-section">
          <h2 className="settings-section-title">
            <Sliders size={20} />
            <span>Внешний вид и плеер</span>
          </h2>
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
          <div className="settings-form-group settings-preference-group">
            <label className="settings-label">Плеер по умолчанию</label>
            <select
              className="settings-select"
              value={defaultPlayer || "native"}
              onChange={(e) => setDefaultPlayer(e.target.value)}
            >
              <option value="native">Встроенный веб-плеер</option>
              {isApple && <option value="infuse">Infuse</option>}
            </select>
          </div>
          <div className="settings-form-group settings-preference-group">
            <label className="settings-label">Масштаб интерфейса</label>
            <select
              className="settings-select"
              value={uiFontScale.toFixed(1)}
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
  );

  return (
    <div className="settings-page-container">
      <header className="settings-page-header">
        <h1 className="settings-page-title">Настройки</h1>
        <p className="settings-page-description">
          Управление подключениями, стилями интерфейса, внешними плеерами и плагинами.
        </p>
      </header>

      <div className="theme-options" style={{ marginBottom: "20px", display: "flex", gap: "8px", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "10px" }}>
        <button
          className={`theme-card ${activeTab === "general" ? "active" : ""}`}
          onClick={() => setActiveTab("general")}
          style={{ cursor: "pointer", display: "flex", gap: "8px", alignItems: "center" }}
        >
          <Settings size={14} />
          <span>Основные</span>
        </button>
        <button
          className={`theme-card ${activeTab === "extensions" ? "active" : ""}`}
          onClick={() => setActiveTab("extensions")}
          style={{ cursor: "pointer", display: "flex", gap: "8px", alignItems: "center" }}
        >
          <Puzzle size={14} />
          <span>Расширения</span>
        </button>
        {slotContributions.map((c) => {
          const render = ExtensionRegistry.getSlotRender(c.contribution.id);
          return (
            <button
              key={c.contribution.id}
              className={`theme-card ${activeTab === c.contribution.id ? "active" : ""}`}
              onClick={() => setActiveTab(c.contribution.id)}
              style={{ cursor: "pointer", display: "flex", gap: "8px", alignItems: "center" }}
            >
              <span>{render?.label || c.contribution.id}</span>
            </button>
          );
        })}
      </div>

      <div className="settings-content-wrapper">
        {activeTab === "general" && renderGeneral()}
        {activeTab === "extensions" && <ExtensionsManager />}
        {slotContributions.some((c) => c.contribution.id === activeTab) && (
          <ExtensionSlot name="settings-tabs" />
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
