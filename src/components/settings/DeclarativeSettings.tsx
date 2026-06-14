import React, { useState, useEffect } from "react";
import { Save, Eye, EyeOff, Sliders } from "lucide-react";
import type { RegisteredExtension } from "@potok/sdk-types";
import { useHUD } from "../../context/HUDContext";
import { ApiClient } from "../../network/ApiClient";
import { FocusableButton, FocusableInput } from "../common/TVNavigation";


interface DeclarativeSettingsProps {
  ext: RegisteredExtension;
}

export const DeclarativeSettings: React.FC<DeclarativeSettingsProps> = React.memo(({ ext }) => {
  const { show: showHUD } = useHUD();
  const [settings, setSettings] = useState<Record<string, string | number | boolean>>({});
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});

  const config = ext.manifest.config || {};

  // Load settings on component mount or extension change
  useEffect(() => {
    const initialSettings: Record<string, string | number | boolean> = {};
    Object.keys(config).forEach((key) => {
      const configItem = config[key];
      const localStorageKey = `potok_plugin:scoped:${ext.id}:${key}`;
      const storedValue = localStorage.getItem(localStorageKey);

      if (storedValue !== null) {
        if (configItem.type === "boolean") {
          initialSettings[key] = storedValue === "true";
        } else if (configItem.type === "number") {
          const parsed = Number(storedValue);
          initialSettings[key] = isNaN(parsed) ? (configItem.default as number) : parsed;
        } else {
          initialSettings[key] = storedValue;
        }
      } else {
        initialSettings[key] = configItem.default;
      }
    });
    setSettings(initialSettings);
  }, [ext, config]);

  const isPasswordInput = (key: string, label: string) => {
    const k = key.toLowerCase();
    const l = label.toLowerCase();
    return (
      k.includes("key") ||
      k.includes("password") ||
      k.includes("token") ||
      l.includes("key") ||
      l.includes("password") ||
      l.includes("token")
    );
  };

  const handleTogglePassword = (key: string) => {
    setShowPassword((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleChange = (key: string, val: string | number | boolean) => {
    setSettings((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    Object.keys(config).forEach((key) => {
      const localStorageKey = `potok_plugin:scoped:${ext.id}:${key}`;
      const value = settings[key] !== undefined ? settings[key] : config[key].default;
      localStorage.setItem(localStorageKey, String(value));
    });

    if (ext.id === "potok-torrents") {
      ApiClient.invalidateCache();
    }

    window.dispatchEvent(
      new CustomEvent("potok_plugin_settings_updated", {
        detail: { pluginId: ext.id }
      })
    );

    showHUD("success", "Настройки плагина успешно сохранены");
  };

  if (Object.keys(config).length === 0) {
    return (
      <div className="settings-pane">
        <section className="settings-section">
          <h2 className="settings-section-title">
            <Sliders size={20} />
            <span>{ext.manifest.name || ext.id}</span>
          </h2>
          <p className="settings-label">Для этого плагина нет доступных настроек.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="settings-pane">
      <section className="settings-section">
        <h2 className="settings-section-title">
          <Sliders size={20} />
          <span>{ext.manifest.name || ext.id}</span>
        </h2>

        <form onSubmit={handleSave} className="settings-form-wrapper" style={{ display: "flex", flexDirection: "column", gap: "var(--space-m)" }}>
          <div className="declarative-form-fields" style={{ display: "flex", flexDirection: "column", gap: "var(--space-s)" }}>
            {Object.keys(config).map((key) => {
              const item = config[key];
              const val = settings[key];

              if (item.dependsOn) {
                const depValue = settings[item.dependsOn];
                if (!depValue) {
                  return null;
                }
              }

              if (item.type === "boolean") {
                const checkedVal = val !== undefined ? !!val : !!item.default;
                return (
                  <div key={key} className="settings-form-group settings-preference-group">
                    <div className="settings-auth-checkbox-row">
                      <FocusableInput
                        type="checkbox"
                        id={`config-${ext.id}-${key}`}
                        checked={checkedVal}
                        onChange={(e) => handleChange(key, e.target.checked)}
                        className="cursor-pointer"
                      />
                      <label htmlFor={`config-${ext.id}-${key}`} className="settings-label settings-auth-checkbox-label">
                        {item.label || key}
                      </label>
                    </div>
                  </div>
                );
              }

              if (item.type === "number") {
                const numVal = val !== undefined ? Number(val) : Number(item.default);
                return (
                  <div key={key} className="settings-form-group">
                    <label htmlFor={`config-${ext.id}-${key}`} className="settings-label">
                      {item.label || key}
                    </label>
                    <FocusableInput
                      type="number"
                      id={`config-${ext.id}-${key}`}
                      className="settings-input"
                      value={isNaN(numVal) ? "" : numVal}
                      onChange={(e) => handleChange(key, e.target.value === "" ? "" : Number(e.target.value))}
                    />
                  </div>
                );
              }

              // String or password input
              const strVal = val !== undefined ? String(val) : String(item.default);
              const isPassword = isPasswordInput(key, item.label || "");

              return (
                <div key={key} className="settings-form-group">
                  <label htmlFor={`config-${ext.id}-${key}`} className="settings-label">
                    {item.label || key}
                  </label>
                  {isPassword ? (
                    <div style={{ display: "flex", gap: "0.5rem", width: "100%", maxWidth: "30rem", alignItems: "center" }}>
                      <FocusableInput
                        type={showPassword[key] ? "text" : "password"}
                        id={`config-${ext.id}-${key}`}
                        className="settings-input"
                        value={strVal}
                        onChange={(e) => handleChange(key, e.target.value)}
                      />
                      <FocusableButton
                        type="button"
                        onClick={() => handleTogglePassword(key)}
                        className="profile-btn"
                        title={showPassword[key] ? "Скрыть" : "Показать"}
                        style={{ flexShrink: 0 }}
                      >
                        {showPassword[key] ? <EyeOff size={16} /> : <Eye size={16} />}
                      </FocusableButton>
                    </div>
                  ) : (
                    <FocusableInput
                      type="text"
                      id={`config-${ext.id}-${key}`}
                      className="settings-input"
                      value={strVal}
                      onChange={(e) => handleChange(key, e.target.value)}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="settings-form-buttons-row">
            <FocusableButton type="submit" className="settings-btn-primary cursor-pointer btn-gap-s">
              <Save size={16} />
              <span>Сохранить настройки</span>
            </FocusableButton>
          </div>
        </form>
      </section>
    </div>
  );
});

DeclarativeSettings.displayName = "DeclarativeSettings";
export default DeclarativeSettings;
