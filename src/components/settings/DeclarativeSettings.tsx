import React from "react";
import { useTranslation } from "react-i18next";
import { Save, Sliders } from "lucide-react";
import type { RegisteredExtension } from "@potok/sdk-types";
import { useHUD } from "../../context/useHUD";
import { useDeclarativeSettings } from "../../hooks/useDeclarativeSettings";
import { Button } from "../ui";
import { buildDeclarativeLayoutRows } from "./declarativeSettingsTypes";
import { DeclarativeSettingsField } from "./DeclarativeSettingsField";

interface DeclarativeSettingsProps {
  ext: RegisteredExtension;
}

export const DeclarativeSettings: React.FC<DeclarativeSettingsProps> = React.memo(({ ext }) => {
  const { show: showHUD } = useHUD();
  const { t } = useTranslation("settings");
  const {
    config,
    settings,
    showPassword,
    handleTogglePassword,
    handleChange,
    handleSave,
  } = useDeclarativeSettings(ext);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave();
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

  const layoutRows = buildDeclarativeLayoutRows(config);

  const isFieldVisible = (key: string) => {
    const item = config[key];
    if (!item.dependsOn) return true;
    return !!settings[item.dependsOn];
  };

  return (
    <div className="settings-pane">
      <section className="settings-section">
        <h2 className="settings-section-title">
          <Sliders size={20} />
          <span>{t(ext.manifest.name || ext.id)}</span>
        </h2>

        <form onSubmit={handleSubmit} className="ui-form-stack">
          <div className="declarative-form-fields ui-form-stack">
            {layoutRows.map((row) => {
              if (row.type === "single") {
                if (!isFieldVisible(row.key)) return null;
                return (
                  <DeclarativeSettingsField
                    key={row.key}
                    extId={ext.id}
                    fieldKey={row.key}
                    item={config[row.key]}
                    value={settings[row.key]}
                    showPassword={!!showPassword[row.key]}
                    t={t}
                    onChange={handleChange}
                    onTogglePassword={handleTogglePassword}
                  />
                );
              }

              const visibleKeys = row.keys.filter(isFieldVisible);
              if (visibleKeys.length === 0) return null;

              const descriptionKey = visibleKeys.map((k) => config[k].descriptionHtml).find(Boolean);

              return (
                <div key={row.layoutRowName} className="settings-form-group declarative-inline-group">
                  <div className="declarative-inline-row">
                    {visibleKeys.map((key) => (
                      <DeclarativeSettingsField
                        key={key}
                        extId={ext.id}
                        fieldKey={key}
                        item={config[key]}
                        value={settings[key]}
                        showPassword={!!showPassword[key]}
                        isInline
                        t={t}
                        onChange={handleChange}
                        onTogglePassword={handleTogglePassword}
                      />
                    ))}
                  </div>
                  {descriptionKey && (
                    <span
                      className="settings-description declarative-row-description"
                      dangerouslySetInnerHTML={{
                        __html: descriptionKey.includes(":") ? t(descriptionKey) : descriptionKey,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="ui-form-actions">
            <Button type="submit" variant="primary" className="btn-gap-s">
              <Save size={16} />
              <span>{t("declarative.saveButton")}</span>
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
});

DeclarativeSettings.displayName = "DeclarativeSettings";
export default DeclarativeSettings;