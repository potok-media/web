import React from "react";
import { Sliders } from "lucide-react";
import { ExtensionRegistry } from "../../utils/extensions/ExtensionRegistry";

interface GeneralSettingsProps {
  accentTheme: string;
  setAccentTheme: (theme: string) => void;
  defaultPlayer: string | null;
  setDefaultPlayer: (player: string) => void;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = React.memo(({
  accentTheme,
  setAccentTheme,
  defaultPlayer,
  setDefaultPlayer,
}) => {
  const isApple = typeof window !== "undefined" && 
    (/Mac|iPad|iPhone|iPod/.test(navigator.userAgent) || 
     (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  const themes = [
    { id: "nordicFrost", name: "Nordic Frost", color: "#3a86c8" },
    { id: "amberGold", name: "Amber Gold", color: "#f59e0b" },
    { id: "sageMuted", name: "Sage Muted", color: "#4f9e71" },
    { id: "graphite", name: "Graphite", color: "#9ca3af" },
    { id: "system", name: "System Accent", color: "#3b82f6" },
  ];

  const [hasAccentContribution, setHasAccentContribution] = React.useState(() => {
    return ExtensionRegistry.getSlotContributions("settings-color-accent").length > 0;
  });

  React.useEffect(() => {
    const handleUpdate = () => {
      setHasAccentContribution(
        ExtensionRegistry.getSlotContributions("settings-color-accent").length > 0
      );
    };
    ExtensionRegistry.addListener(handleUpdate);
    return () => {
      ExtensionRegistry.removeListener(handleUpdate);
    };
  }, []);

  return (
    <div className="settings-pane">
      <section className="settings-section">
        <h2 className="settings-section-title">
          <Sliders size={20} />
          <span>Внешний вид и плеер</span>
        </h2>
        
        {hasAccentContribution ? (
          <div
            id="settings-color-accent-slot"
            data-props={JSON.stringify({ accentTheme })}
          />
        ) : (
          <div className="settings-form-group">
            <label className="settings-label">Цветовой акцент</label>
            <div className="theme-options-grid">
              {themes.map((t) => (
                <div
                  key={t.id}
                  className={`theme-card-option ${accentTheme === t.id ? "active" : ""}`}
                  onClick={() => setAccentTheme(t.id)}
                >
                  <span className="theme-dot" style={{ backgroundColor: t.color }} />
                  <span className="theme-option-name">{t.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

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
      </section>
    </div>
  );
});

GeneralSettings.displayName = "GeneralSettings";
export default GeneralSettings;
