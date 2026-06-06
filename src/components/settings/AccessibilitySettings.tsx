import React from "react";
import { Eye, BookOpen } from "lucide-react";
import "../../styles/extensions.css";

interface AccessibilitySettingsProps {
  uiFontScale: number;
  setUiFontScale: (scale: number) => void;
  developerMode: boolean;
  setDeveloperMode: (val: boolean) => void;
}

export const AccessibilitySettings: React.FC<AccessibilitySettingsProps> = React.memo(({
  uiFontScale,
  setUiFontScale,
  developerMode,
  setDeveloperMode,
}) => {
  return (
    <div className="settings-pane">
      <section className="settings-section">
        <h2 className="settings-section-title">
          <Eye size={20} />
          <span>Специальные возможности</span>
        </h2>

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

        <div className="potok-toggle-group" style={{ marginTop: "var(--space-l)", maxWidth: "30rem", width: "100%" }}>
          <span className="settings-label" style={{ margin: 0 }}>Режим разработчика</span>
          <label className="potok-switch" style={{ flexShrink: 0 }}>
            <input
              type="checkbox"
              checked={developerMode}
              onChange={(e) => setDeveloperMode(e.target.checked)}
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
            <button
              onClick={() => window.open("/wiki", "_blank")}
              className="settings-btn-primary"
              style={{ alignSelf: "flex-start", padding: "0.625rem 1.25rem", display: "flex", alignItems: "center", gap: "8px" }}
            >
              <BookOpen size={16} />
              <span>Открыть Вики</span>
            </button>
          </div>
        )}
      </section>
    </div>
  );
});

AccessibilitySettings.displayName = "AccessibilitySettings";
export default AccessibilitySettings;
