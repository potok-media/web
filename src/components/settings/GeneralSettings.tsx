import React from "react";
import { useTranslation } from "react-i18next";
import { Sliders } from "lucide-react";
import { ExtensionRegistry } from "../../utils/extensions/ExtensionRegistry";
import { Field, Pressable, Select } from "../ui";
import type { SelectOption } from "../ui";
import { Slot } from "../common/extension/Slot";
import { AVAILABLE_LANGUAGES, getLanguageCoverage } from "../../i18n";

const CROWDIN_URL = "https://crowdin.com/project/potok";

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

const LANGUAGE_ENDONYMS: Record<string, string> = {
  en: "English",
  ru: "Русский",
  uk: "Українська",
  de: "Deutsch",
  fr: "Français",
  it: "Italiano",
  es: "Español",
  pt: "Português (Brasil)",
  pl: "Polski",
  tr: "Türkçe",
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
     (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

  const playerOptions: SelectOption<string>[] = [
    { value: "native", label: t("player.native") },
    ...(isApple ? [{ value: "infuse", label: "Infuse" }] : []),
  ];

  const bannerQualityOptions: SelectOption<string>[] = [
    { value: "auto", label: t("imageQuality.auto") },
    { value: "high", label: t("imageQuality.high") },
    { value: "max", label: t("imageQuality.max") },
  ];

  const languageOptions: SelectOption<string>[] = AVAILABLE_LANGUAGES.map((code) => ({
    value: code,
    label: LANGUAGE_ENDONYMS[code] || code.toUpperCase(),
  }));

  const [langCoverage, setLangCoverage] = React.useState<number | null>(null);
  React.useEffect(() => {
    let active = true;
    getLanguageCoverage(language).then((c) => {
      if (active) setLangCoverage(c);
    });
    return () => {
      active = false;
    };
  }, [language]);

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

  const langHint =
    langCoverage !== null && langCoverage < 100 ? (
      <>
        {t("language.incomplete", { percent: langCoverage })}{" "}
        <a href={CROWDIN_URL} target="_blank" rel="noopener noreferrer">
          {t("language.helpTranslate")}
        </a>
      </>
    ) : undefined;

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
          <Field
            label={t("accent.label")}
            hint={t("accent.desc")}
            className="settings-form-group settings-preference-group"
          >
            <div className="settings-swatch-row">
              {themes.map((theme) => (
                <Pressable
                  key={theme.id}
                  className={`settings-swatch ${accentTheme === theme.id ? "active" : ""}`}
                  onPress={() => setAccentTheme(theme.id)}
                  aria-pressed={accentTheme === theme.id}
                  aria-label={theme.name}
                  title={theme.name}
                  style={{ "--theme-color": theme.color } as React.CSSProperties}
                >
                  <span aria-hidden="true" />
                </Pressable>
              ))}
            </div>
          </Field>
        )}

        <Field
          label={t("player.label")}
          className="settings-form-group settings-preference-group"
        >
          <Select
            value={defaultPlayer || "native"}
            options={playerOptions}
            onChange={setDefaultPlayer}
          />
        </Field>

        <Field
          label={t("imageQuality.label")}
          className="settings-form-group settings-preference-group"
        >
          <div className="settings-segmented" role="group" aria-label={t("imageQuality.label")}>
            {bannerQualityOptions.map((o) => {
              const active = (bannerQuality || "auto") === o.value;
              return (
                <Pressable
                  key={o.value}
                  className={`seg-btn ${active ? "active" : ""}`}
                  aria-pressed={active}
                  onPress={() => setBannerQuality(o.value)}
                >
                  {o.label}
                </Pressable>
              );
            })}
          </div>
        </Field>

        <Field
          label={t("language.label")}
          hint={langHint}
          className="settings-form-group settings-preference-group"
        >
          <Select value={language} options={languageOptions} onChange={setLanguage} />
        </Field>
      </section>
    </div>
  );
});

GeneralSettings.displayName = "GeneralSettings";
export default GeneralSettings;