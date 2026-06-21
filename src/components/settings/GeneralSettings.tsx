import React from "react";
import { useTranslation } from "react-i18next";
import { Sliders } from "lucide-react";
import { ExtensionRegistry } from "../../utils/extensions/ExtensionRegistry";
import { Focusable } from "../common/TVNavigation";
import { TVSelect, type TVSelectOption } from "../common/TVSelect";
import { usePlatform } from "../../hooks/usePlatform";
import { Slot } from "../common/extension/Slot";
import { AVAILABLE_LANGUAGES } from "../../i18n";

interface GeneralSettingsProps {
  accentTheme: string;
  setAccentTheme: (theme: string) => void;
  defaultPlayer: string | null;
  setDefaultPlayer: (player: string) => void;
  bannerQuality: string;
  setBannerQuality: (quality: string) => void;
  language: string;
  setLanguage: (lng: string) => void;
}

// Endonyms (the language's own name) — conventionally NOT translated.
const LANGUAGE_ENDONYMS: Record<string, string> = {
  ru: "Русский",
  en: "English",
};

export const GeneralSettings: React.FC<GeneralSettingsProps> = React.memo(({
  accentTheme,
  setAccentTheme,
  defaultPlayer,
  setDefaultPlayer,
  bannerQuality,
  setBannerQuality,
  language,
  setLanguage,
}) => {
  const { t } = useTranslation("settings");
  const isApple = typeof window !== "undefined" &&
    (/Mac|iPad|iPhone|iPod/.test(navigator.userAgent) ||
     (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  const { isTV, isMobile } = usePlatform();
  const touchUI = isTV || isMobile;

  const playerOptions: TVSelectOption<string>[] = [
    { value: "native", label: t("player.native") },
    ...(isApple ? [{ value: "infuse", label: "Infuse" }] : []),
  ];

  const bannerQualityOptions: TVSelectOption<string>[] = [
    { value: "auto", label: t("imageQuality.auto") },
    { value: "high", label: t("imageQuality.high") },
    { value: "max", label: t("imageQuality.max") },
  ];

  const languageOptions: TVSelectOption<string>[] = AVAILABLE_LANGUAGES.map((code) => ({
    value: code,
    label: LANGUAGE_ENDONYMS[code] || code.toUpperCase(),
  }));

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
          <span>{t("appearance.title")}</span>
        </h2>
        
        {hasAccentContribution ? (
          <Slot name="settings-color-accent" props={{ accentTheme }} />
        ) : (
          <div className="settings-form-group">
            <label className="settings-label">{t("accent.label")}</label>
            <div className="theme-options-grid">
              {themes.map((t) => (
                <Focusable
                  key={t.id}
                  onEnterPress={() => setAccentTheme(t.id)}
                >
                  {({ ref, focused }) => (
                    <div
                      ref={ref}
                      className={`theme-card-option ${accentTheme === t.id ? "active" : ""} ${focused ? "focused" : ""}`}
                      onClick={() => setAccentTheme(t.id)}
                    >
                      <span className="theme-dot" style={{ backgroundColor: t.color }} />
                      <span className="theme-option-name">{t.name}</span>
                    </div>
                  )}
                </Focusable>
              ))}
            </div>
          </div>
        )}

        <div className="settings-form-group settings-preference-group">
          <label className="settings-label">{t("player.label")}</label>
          {touchUI ? (
            <TVSelect
              value={defaultPlayer || "native"}
              options={playerOptions}
              onChange={(v) => setDefaultPlayer(v)}
              focusKeyPrefix="SETTINGS_PLAYER_"
            />
          ) : (
            <Focusable>
              {({ ref, focused }) => (
                <select
                  ref={ref}
                  className={`settings-select ${focused ? "focused" : ""}`}
                  value={defaultPlayer || "native"}
                  onChange={(e) => setDefaultPlayer(e.target.value)}
                >
                  <option value="native">{t("player.native")}</option>
                  {isApple && <option value="infuse">Infuse</option>}
                </select>
              )}
            </Focusable>
          )}
        </div>

        <div className="settings-form-group settings-preference-group">
          <label className="settings-label">{t("imageQuality.label")}</label>
          {touchUI ? (
            <TVSelect
              value={bannerQuality || "auto"}
              options={bannerQualityOptions}
              onChange={(v) => setBannerQuality(v)}
              focusKeyPrefix="SETTINGS_BANNER_"
            />
          ) : (
            <Focusable>
              {({ ref, focused }) => (
                <select
                  ref={ref}
                  className={`settings-select ${focused ? "focused" : ""}`}
                  value={bannerQuality || "auto"}
                  onChange={(e) => setBannerQuality(e.target.value)}
                >
                  <option value="auto">{t("imageQuality.auto")}</option>
                  <option value="high">{t("imageQuality.high")}</option>
                  <option value="max">{t("imageQuality.max")}</option>
                </select>
              )}
            </Focusable>
          )}
        </div>

        <div className="settings-form-group settings-preference-group">
          <label className="settings-label">{t("language.label")}</label>
          {touchUI ? (
            <TVSelect
              value={language}
              options={languageOptions}
              onChange={(v) => setLanguage(v)}
              focusKeyPrefix="SETTINGS_LANGUAGE_"
            />
          ) : (
            <Focusable>
              {({ ref, focused }) => (
                <select
                  ref={ref}
                  className={`settings-select ${focused ? "focused" : ""}`}
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  {languageOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              )}
            </Focusable>
          )}
        </div>
      </section>
    </div>
  );
});

GeneralSettings.displayName = "GeneralSettings";
export default GeneralSettings;
