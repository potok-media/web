import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSettings } from "../context/AppSettingsContext";
import { useSettingsExtensions } from "../hooks/useSettingsExtensions";
import { SettingsContentPanel } from "../components/settings/SettingsContentPanel";
import { SettingsSidebarNav } from "../components/settings/SettingsNavigation";
import "../styles/settings.css";

export const SettingsPage: React.FC = () => {
  const {
    accentTheme,
    defaultPlayer,
    bannerQuality,
    uiFontScale,
    language,
    developerMode,
    disableHttpProxy,
    setAccentTheme,
    setDefaultPlayer,
    setBannerQuality,
    setUiFontScale,
    setLanguage,
    setDeveloperMode,
    setDisableHttpProxy,
  } = useSettings();

  const [activeSection, setActiveSection] = useState("general");
  const { slotContributions, configExtensions } = useSettingsExtensions();

  const sectionIds = useMemo(() => [
    "general",
    "account",
    "profiles",
    "accessibility",
    "extensions",
    ...slotContributions.map((entry) => entry.contribution.id),
    ...configExtensions.map((extension) => `config-${extension.id}`),
  ], [configExtensions, slotContributions]);

  useEffect(() => {
    const scrollContainer = document.querySelector<HTMLElement>(".main-content");
    let animationFrame = 0;

    const updateActiveSection = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const topbarHeight = Number.parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue("--topbar-height"),
        ) || 0;
        const activationLine = topbarHeight + 32;
        let nextSection = sectionIds[0] || "general";

        sectionIds.forEach((sectionId) => {
          const section = document.getElementById(`settings-section-${sectionId}`);
          if (section && section.getBoundingClientRect().top <= activationLine) {
            nextSection = sectionId;
          }
        });

        setActiveSection((current) => current === nextSection ? current : nextSection);
      });
    };

    updateActiveSection();
    scrollContainer?.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      scrollContainer?.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, [sectionIds]);

  const handleNavigate = useCallback((sectionId: string) => {
    setActiveSection(sectionId);
    document.getElementById(`settings-section-${sectionId}`)?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  }, []);

  const panelProps = {
    accentTheme,
    setAccentTheme,
    defaultPlayer,
    setDefaultPlayer,
    bannerQuality,
    setBannerQuality,
    language,
    setLanguage,
    uiFontScale,
    setUiFontScale,
    developerMode,
    setDeveloperMode,
    disableHttpProxy,
    setDisableHttpProxy,
    slotContributions,
    configExtensions,
  };

  return (
    <div className="settings-page-container">
      <div className="settings-container">
        <aside className="settings-sidebar">
          <SettingsSidebarNav
            activeSection={activeSection}
            onNavigate={handleNavigate}
            slotContributions={slotContributions}
            configExtensions={configExtensions}
          />
        </aside>
        <main className="settings-main-content">
          <SettingsContentPanel {...panelProps} />
        </main>
      </div>
    </div>
  );
};

export default SettingsPage;
