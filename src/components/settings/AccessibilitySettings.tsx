import React from "react";
import { useTranslation } from "react-i18next";
import { Eye, BookOpen } from "lucide-react";
import "../../styles/extensions.css";
import { Button, Field, Select, Switch } from "../ui";

const FONT_SCALE_VALUES = [0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5] as const;

interface AccessibilitySettingsProps {
  uiFontScale: number;
  setUiFontScale: (scale: number) => void;
  developerMode: boolean;
  setDeveloperMode: (val: boolean) => void;
  disableHttpProxy: boolean;
  setDisableHttpProxy: (val: boolean) => void;
}

export const AccessibilitySettings: React.FC<AccessibilitySettingsProps> = React.memo(({
  uiFontScale,
  setUiFontScale,
  developerMode,
  setDeveloperMode,
  disableHttpProxy,
  setDisableHttpProxy,
}) => {
  const { t } = useTranslation("settings");

  const fontScaleOptions = React.useMemo(
    () =>
      FONT_SCALE_VALUES.map((value) => ({
        value,
        label: t(`accessibility.fontScale.${Math.round(value * 100)}`),
      })),
    [t]
  );

  return (
    <div className="settings-pane">
      <section className="settings-section">
        <h2 className="settings-section-title">
          <Eye size="1.25rem" />
          <span>{t("accessibility.title")}</span>
        </h2>

        <Field
          label={t("accessibility.uiScale")}
          hint={t("accessibility.uiScaleDesc")}
          className="settings-form-group settings-preference-group"
        >
          <Select
            className="settings-select"
            value={uiFontScale}
            options={fontScaleOptions}
            onChange={(v) => setUiFontScale(typeof v === "number" ? v : parseFloat(v))}
          />
        </Field>

        <Field
          label={t("accessibility.developerMode")}
          hint={t("accessibility.developerModeDesc")}
          className="settings-form-group settings-preference-group"
        >
          <Switch checked={developerMode} onCheckedChange={setDeveloperMode} />
        </Field>

        <Field
          label={t("accessibility.directRequests")}
          hint={t("accessibility.directRequestsDesc")}
          className="settings-form-group settings-preference-group"
        >
          <Switch checked={disableHttpProxy} onCheckedChange={setDisableHttpProxy} />
        </Field>

        {developerMode && (
          <div className="accessibility-wiki-section">
            <label className="settings-label settings-toggle-label">{t("accessibility.docsTitle")}</label>
            <span className="accessibility-wiki-desc">
              {t("accessibility.docsDescription")}
            </span>
            <Button
              variant="primary"
              className="accessibility-wiki-btn"
              onClick={() => window.open("/wiki", "_blank")}
            >
              <BookOpen size="1rem" />
              <span>{t("accessibility.openWiki")}</span>
            </Button>
          </div>
        )}
      </section>
    </div>
  );
});

AccessibilitySettings.displayName = "AccessibilitySettings";
export default AccessibilitySettings;
