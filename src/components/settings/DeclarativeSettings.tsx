import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Save, Eye, EyeOff, Sliders } from "lucide-react";
import type { RegisteredExtension } from "@potok/sdk-types";
import { useHUD } from "../../context/HUDContext";
import { ApiClient } from "../../network/ApiClient";
import { FocusableButton, FocusableInput } from "../common/TVNavigation";
import { ExtensionRegistry } from "../../utils/extensions/ExtensionRegistry";


interface DeclarativeSettingsProps {
  ext: RegisteredExtension;
}

export const DeclarativeSettings: React.FC<DeclarativeSettingsProps> = React.memo(({ ext }) => {
  const { show: showHUD } = useHUD();
  const { t } = useTranslation("settings");
  const [settings, setSettings] = useState<Record<string, string | number | boolean>>({});
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});

  const config = (ext.manifest.config || {}) as any;

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

  // Listen to live form updates triggered by the sandbox plugin
  useEffect(() => {
    const handleFormUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { pluginId, updates } = customEvent.detail;
      if (pluginId === ext.id && updates) {
        setSettings((prev) => ({
          ...prev,
          ...updates
        }));
      }
    };
    window.addEventListener("potok_plugin_update_settings_fields", handleFormUpdate);
    return () => {
      window.removeEventListener("potok_plugin_update_settings_fields", handleFormUpdate);
    };
  }, [ext.id]);

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
    setSettings((prev) => {
      const next = { ...prev, [key]: val };
      ExtensionRegistry.notifySettingsFieldChanged(ext.id, key, val, next);
      return next;
    });
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

    showHUD("success", t("declarative.saveSuccess"));
  };

  if (Object.keys(config).length === 0) {
    return (
      <div className="settings-pane">
        <section className="settings-section">
          <h2 className="settings-section-title">
            <Sliders size={20} />
            <span>{t(ext.manifest.name || ext.id)}</span>
          </h2>
          <p className="settings-label">{t("declarative.noSettings")}</p>
        </section>
      </div>
    );
  }

  const renderField = (key: string, isInline = false) => {
    const item = config[key];
    const val = settings[key];

    if (item.dependsOn) {
      const depValue = settings[item.dependsOn];
      if (!depValue) {
        return null;
      }
    }

    const labelText = item.label ? (item.label.includes(":") ? t(item.label) : item.label) : key;

    // Special renderer for notice type (read-only warning banners)
    if (item.type === "notice") {
      const displayVal = val !== undefined ? String(val) : String(item.default || "");
      if (!displayVal) return null; // Hide if no message to display
      return (
        <div key={key} className={isInline ? "" : "settings-form-group"} style={{ marginTop: "0.5rem" }}>
          <div className="settings-notice-banner" style={{
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.35)",
            borderRadius: "0.375rem",
            padding: "0.75rem 1rem",
            color: "#f87171",
            fontSize: "0.85rem",
            lineHeight: 1.4,
            maxWidth: "30rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            boxSizing: "border-box"
          }}>
            <span style={{ flex: 1 }} dangerouslySetInnerHTML={{ __html: displayVal }} />
          </div>
        </div>
      );
    }

    // Special renderer for boolean type (toggle switch style matching host)
    if (item.type === "boolean") {
      const checkedVal = val !== undefined ? !!val : !!item.default;
      return (
        <div key={key} className={isInline ? "" : "settings-form-group"} style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: isInline ? 1 : undefined, minWidth: 0 }}>
          <div className="potok-toggle-group" style={{ maxWidth: "30rem", width: "100%", justifyContent: "space-between", alignItems: "center", display: "flex" }}>
            <span className="settings-label" style={{ margin: 0 }}>
              {labelText}
            </span>
            <label className="potok-switch" style={{ flexShrink: 0, margin: 0 }}>
              <FocusableInput
                type="checkbox"
                id={`config-${ext.id}-${key}`}
                checked={checkedVal}
                onChange={(e) => handleChange(key, e.target.checked)}
              />
              <span className="potok-slider" />
            </label>
          </div>
          {!isInline && item.descriptionHtml && (
            <span
              className="settings-description"
              style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}
              dangerouslySetInnerHTML={{ __html: item.descriptionHtml.includes(":") ? t(item.descriptionHtml) : item.descriptionHtml }}
            />
          )}
        </div>
      );
    }

    const fieldInput = (() => {
      if (item.type === "number") {
        const numVal = val !== undefined ? Number(val) : Number(item.default);
        return (
          <FocusableInput
            type="number"
            id={`config-${ext.id}-${key}`}
            className="settings-input"
            value={isNaN(numVal) ? "" : numVal}
            onChange={(e) => handleChange(key, e.target.value === "" ? "" : Number(e.target.value))}
            style={{ width: "100%" }}
          />
        );
      }

      if (item.type === "select") {
        const strVal = val !== undefined ? String(val) : String(item.default);
        return (
          <select
            id={`config-${ext.id}-${key}`}
            className="settings-input"
            value={strVal}
            onChange={(e) => handleChange(key, e.target.value)}
            style={{
              width: "100%",
              background: "rgba(255, 255, 255, 0.05)",
              color: "#fff",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "0.375rem",
              padding: "0.5rem 2rem 0.5rem 0.75rem",
              cursor: "pointer",
              outline: "none",
              appearance: "none",
              backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 0.75rem center",
              backgroundSize: "1rem"
            }}
          >
            {item.options?.map((opt: any) => (
              <option key={opt.value} value={opt.value} style={{ background: "#1a1a1a", color: "#fff" }}>
                {opt.label ? (opt.label.includes(":") ? t(opt.label) : opt.label) : opt.value}
              </option>
            ))}
          </select>
        );
      }

      // String or password input
      const strVal = val !== undefined ? String(val) : String(item.default);
      const isPassword = isPasswordInput(key, item.label || "");

      if (isPassword) {
        return (
          <div style={{ display: "flex", gap: "0.5rem", width: "100%", alignItems: "center" }}>
            <FocusableInput
              type={showPassword[key] ? "text" : "password"}
              id={`config-${ext.id}-${key}`}
              className="settings-input"
              value={strVal}
              onChange={(e) => handleChange(key, e.target.value)}
              style={{ flex: 1, minWidth: 0 }}
            />
            <FocusableButton
              type="button"
              onClick={() => handleTogglePassword(key)}
              className="profile-btn"
              title={showPassword[key] ? t("declarative.hide") : t("declarative.show")}
              style={{ flexShrink: 0 }}
            >
              {showPassword[key] ? <EyeOff size={16} /> : <Eye size={16} />}
            </FocusableButton>
          </div>
        );
      }

      return (
        <FocusableInput
          type="text"
          id={`config-${ext.id}-${key}`}
          className="settings-input"
          value={strVal}
          onChange={(e) => handleChange(key, e.target.value)}
          style={{ width: "100%" }}
        />
      );
    })();

    if (isInline) {
      return (
        <div key={key} style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: key === "aiApiKey" ? 7 : 3, minWidth: 0 }}>
          <label htmlFor={`config-${ext.id}-${key}`} className="settings-label" style={{ marginBottom: "0.25rem" }}>
            {labelText}
          </label>
          {fieldInput}
        </div>
      );
    }

    return (
      <div key={key} style={{ display: "flex", flexDirection: "column", gap: "0.25rem", minWidth: 0 }} className="settings-form-group">
        <label htmlFor={`config-${ext.id}-${key}`} className="settings-label" style={{ marginBottom: "0.25rem" }}>
          {labelText}
        </label>
        {fieldInput}
        {!isInline && item.descriptionHtml && (
          <span
            className="settings-description"
            style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}
            dangerouslySetInnerHTML={{ __html: item.descriptionHtml.includes(":") ? t(item.descriptionHtml) : item.descriptionHtml }}
          />
        )}
      </div>
    );
  };

  const renderedRows: Array<{
    type: "single" | "row";
    key?: string;
    keys?: string[];
    layoutRowName?: string;
  }> = [];

  const processedKeys = new Set<string>();

  Object.keys(config).forEach((key) => {
    if (processedKeys.has(key)) return;

    const item = config[key];
    if (item.layoutRow) {
      const rowName = item.layoutRow;
      const rowKeys = Object.keys(config).filter(
        (k) => config[k].layoutRow === rowName
      );
      rowKeys.forEach((k) => processedKeys.add(k));
      renderedRows.push({
        type: "row",
        keys: rowKeys,
        layoutRowName: rowName,
      });
    } else {
      processedKeys.add(key);
      renderedRows.push({
        type: "single",
        key,
      });
    }
  });

  return (
    <div className="settings-pane">
      <section className="settings-section">
        <h2 className="settings-section-title">
          <Sliders size={20} />
          <span>{t(ext.manifest.name || ext.id)}</span>
        </h2>

        <form onSubmit={handleSave} className="settings-form-wrapper" style={{ display: "flex", flexDirection: "column", gap: "var(--space-m)" }}>
          <div className="declarative-form-fields" style={{ display: "flex", flexDirection: "column", gap: "var(--space-s)" }}>
            {renderedRows.map((row) => {
              if (row.type === "single") {
                return renderField(row.key!);
              }

              const visibleKeys = row.keys!.filter((key) => {
                const item = config[key];
                if (item.dependsOn) {
                  const depValue = settings[item.dependsOn];
                  return !!depValue;
                }
                return true;
              });

              if (visibleKeys.length === 0) return null;

              const descriptionKey = visibleKeys.map(k => config[k].descriptionHtml).find(Boolean);

              return (
                <div key={row.layoutRowName} className="settings-form-group" style={{ display: "flex", flexDirection: "column", gap: "0.25rem", width: "100%", maxWidth: "30rem" }}>
                  <div style={{ display: "flex", flexDirection: "row", gap: "0.75rem", alignItems: "flex-end", width: "100%" }}>
                    {visibleKeys.map((key) => renderField(key, true))}
                  </div>
                  {descriptionKey && (
                    <span
                      className="settings-description"
                      style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.25rem", lineHeight: "1.3" }}
                      dangerouslySetInnerHTML={{ __html: descriptionKey.includes(":") ? t(descriptionKey) : descriptionKey }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="settings-form-buttons-row">
            <FocusableButton type="submit" className="settings-btn-primary cursor-pointer btn-gap-s">
              <Save size={16} />
              <span>{t("declarative.saveButton")}</span>
            </FocusableButton>
          </div>
        </form>
      </section>
    </div>
  );
});

DeclarativeSettings.displayName = "DeclarativeSettings";
export default DeclarativeSettings;
