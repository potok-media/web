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
  { value: 1.3, label: "Очень крупный (130%)" },
  { value: 1.4, label: "Огромный (140%)" },
  { value: 1.5, label: "Максимальный (150%)" },
];

// On TV the UI scale is the root font-size multiplier (everything is rem-based, so this enlarges the
// whole UI crisply at native resolution — see AppSettingsContext). 3 plain presets instead of the
// desktop font-percent steps; values are bigger than desktop because of the 10-foot viewing distance.
const TV_SIZE_PRESETS = [
  { value: 1.6, label: "Крупнее" },
  { value: 1.4, label: "Стандарт" },
  { value: 1.2, label: "Компактнее" },
];

// Snap a stored uiFontScale to the nearest preset so the control always shows a selected option.
function nearestTvPreset(scale: number): number {
  return TV_SIZE_PRESETS.reduce(
    (best, p) => (Math.abs(p.value - scale) < Math.abs(best - scale) ? p.value : best),
    TV_SIZE_PRESETS[1].value
  );
}

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
          <Eye size="1.25rem" />
          <span>Специальные возможности</span>
        </h2>

        <div className="settings-form-group settings-preference-group">
          <label className="settings-label">{isTV ? "Размер интерфейса" : "Масштаб интерфейса"}</label>
          {isTV ? (
            <TVSelect
              value={nearestTvPreset(uiFontScale)}
              options={TV_SIZE_PRESETS}
              onChange={(v) => setUiFontScale(v)}
              focusKeyPrefix="SETTINGS_TVSIZE_"
            />
          ) : touchUI ? (
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
                  <option value="1.3">Очень крупный (130%)</option>
                  <option value="1.4">Огромный (140%)</option>
                  <option value="1.5">Максимальный (150%)</option>
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
          <div style={{ marginTop: "var(--space-xl)", paddingTop: "var(--space-l)", borderTop: "var(--glass-border)", display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: "30rem" }}>
            <label className="settings-label" style={{ margin: 0 }}>Документация и песочница</label>
            <span style={{ fontSize: "var(--font-size-caption, 0.75rem)", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
              Интерактивное руководство по созданию плагинов, спецификация API и песочница для отладки кода.
            </span>
            <FocusableButton
              onClick={() => window.open("/wiki", "_blank")}
              className="settings-btn-primary"
              style={{ alignSelf: "flex-start", padding: "0.625rem 1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <BookOpen size="1rem" />
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
