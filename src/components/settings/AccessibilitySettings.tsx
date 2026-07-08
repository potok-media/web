import React from "react";
import { useTranslation } from "react-i18next";
import { Eye, BookOpen } from "lucide-react";
import "../../styles/extensions.css";

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

        <div className="settings-form-group settings-preference-group">
          <label className="settings-label">{t("accessibility.uiScale")}</label>
          <select
            className="settings-select"
            value={uiFontScale.toFixed(1)}
            onChange={(e) => setUiFontScale(parseFloat(e.target.value))}
          >
            {fontScaleOptions.map((opt) => (
              <option key={opt.value} value={opt.value.toFixed(1)}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="potok-toggle-group" style={{ marginTop: "var(--space-l)", maxWidth: "30rem", width: "100%" }}>
          <span className="settings-label" style={{ margin: 0 }}>{t("accessibility.developerMode")}</span>
          <label className="potok-switch" style={{ flexShrink: 0 }}>
            <input
              type="checkbox"
              checked={developerMode}
              onChange={(e) => setDeveloperMode(e.target.checked)}
            />
            <span className="potok-slider" />
          </label>
        </div>

        <div className="potok-toggle-group" style={{ marginTop: "var(--space-l)", maxWidth: "30rem", width: "100%" }}>
          <span className="settings-label" style={{ margin: 0 }}>{t("accessibility.directRequests")}</span>
          <label className="potok-switch" style={{ flexShrink: 0 }}>
            <input
              type="checkbox"
              checked={disableHttpProxy}
              onChange={(e) => setDisableHttpProxy(e.target.checked)}
            />
            <span className="potok-slider" />
          </label>
        </div>

        {developerMode && (
          <div style={{ marginTop: "var(--space-xl)", paddingTop: "var(--space-l)", borderTop: "var(--glass-border)", display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: "30rem" }}>
            <label className="settings-label" style={{ margin: 0 }}>{t("accessibility.docsTitle")}</label>
            <span style={{ fontSize: "var(--font-size-caption, 0.75rem)", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
              {t("accessibility.docsDescription")}
            </span>
            <button
              type="button"
              onClick={() => window.open("/wiki", "_blank")}
              className="settings-btn-primary"
              style={{ alignSelf: "flex-start", padding: "0.625rem 1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <BookOpen size="1rem" />
              <span>{t("accessibility.openWiki")}</span>
            </button>
          </div>
        )}
      </section>
    </div>
  );
});

AccessibilitySettings.displayName = "AccessibilitySettings";
export default AccessibilitySettings;
