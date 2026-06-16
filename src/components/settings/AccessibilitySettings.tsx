import React from "react";
import { Eye, BookOpen } from "lucide-react";
import "../../styles/extensions.css";
import { Focusable, FocusableButton, FocusableInput } from "../common/TVNavigation";
import { TVSelect } from "../common/TVSelect";
import { usePlatform } from "../../hooks/usePlatform";

const FONT_SCALE_OPTIONS = [
  { value: 0.8, label: "Мелкий (80%)" },
  { value: 0.9, label: "Компактный (90%)" },
  { value: 1.0, label: "Стандартный (100%)" },
  { value: 1.1, label: "Увеличенный (110%)" },
  { value: 1.2, label: "Крупный (120%)" },
];

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
  const { isTV, isMobile } = usePlatform();
  const touchUI = isTV || isMobile;

  return (
    <div className="settings-pane">
      <section className="settings-section">
        <h2 className="settings-section-title">
          <Eye size={20} />
          <span>Специальные возможности</span>
        </h2>

        <div className="settings-form-group settings-preference-group">
          <label className="settings-label">Масштаб интерфейса</label>
          {touchUI ? (
            <TVSelect
              value={Number(uiFontScale.toFixed(1))}
              options={FONT_SCALE_OPTIONS}
              onChange={(v) => setUiFontScale(v)}
              focusKeyPrefix="SETTINGS_FONTSCALE_"
            />
          ) : (
            <Focusable>
              {({ ref, focused }) => (
                <select
                  ref={ref}
                  className={`settings-select ${focused ? "focused" : ""}`}
                  value={uiFontScale.toFixed(1)}
                  onChange={(e) => setUiFontScale(parseFloat(e.target.value))}
                >
                  <option value="0.8">Мелкий (80%)</option>
                  <option value="0.9">Компактный (90%)</option>
                  <option value="1.0">Стандартный (100%)</option>
                  <option value="1.1">Увеличенный (110%)</option>
                  <option value="1.2">Крупный (120%)</option>
                </select>
              )}
            </Focusable>
          )}
        </div>

        <div className="potok-toggle-group" style={{ marginTop: "var(--space-l)", maxWidth: "30rem", width: "100%" }}>
          <span className="settings-label" style={{ margin: 0 }}>Режим разработчика</span>
          <label className="potok-switch" style={{ flexShrink: 0 }}>
            <FocusableInput
              type="checkbox"
              checked={developerMode}
              onChange={(e) => setDeveloperMode(e.target.checked)}
            />
            <span className="potok-slider" />
          </label>
        </div>

        <div className="potok-toggle-group" style={{ marginTop: "var(--space-l)", maxWidth: "30rem", width: "100%" }}>
          <span className="settings-label" style={{ margin: 0 }}>Прямые запросы</span>
          <label className="potok-switch" style={{ flexShrink: 0 }}>
            <FocusableInput
              type="checkbox"
              checked={disableHttpProxy}
              onChange={(e) => setDisableHttpProxy(e.target.checked)}
            />
            <span className="potok-slider" />
          </label>
        </div>

        {developerMode && (
          <div style={{ marginTop: "var(--space-xl)", paddingTop: "var(--space-l)", borderTop: "var(--glass-border)", display: "flex", flexDirection: "column", gap: "8px", maxWidth: "30rem" }}>
            <label className="settings-label" style={{ margin: 0 }}>Документация и песочница</label>
            <span style={{ fontSize: "var(--font-size-caption, 0.75rem)", color: "var(--text-muted)", marginBottom: "8px" }}>
              Интерактивное руководство по созданию плагинов, спецификация API и песочница для отладки кода.
            </span>
            <FocusableButton
              onClick={() => window.open("/wiki", "_blank")}
              className="settings-btn-primary"
              style={{ alignSelf: "flex-start", padding: "0.625rem 1.25rem", display: "flex", alignItems: "center", gap: "8px" }}
            >
              <BookOpen size={16} />
              <span>Открыть Вики</span>
            </FocusableButton>
          </div>
        )}
      </section>
    </div>
  );
});

AccessibilitySettings.displayName = "AccessibilitySettings";
export default AccessibilitySettings;
