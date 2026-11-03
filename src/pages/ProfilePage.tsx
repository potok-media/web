import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AppSettingsContext";
import { Chip } from "../components/ui";
import { PotokAuthView } from "../components/profile/PotokAuthView";
import { ProfileAccountSection } from "../components/profile/ProfileAccountSection";
import { ProfileStatusSection } from "../components/profile/ProfileStatusSection";
import { ProfileHistorySection } from "../components/profile/ProfileHistorySection";
import type { TitleStatus } from "../utils/userData";
import "../styles/profile.css";

const STATUS_SECTIONS: TitleStatus[] = ["watching", "planned", "completed", "on_hold", "dropped"];

const SECTION_IDS = ["account", ...STATUS_SECTIONS, "history"] as const;
type SectionId = (typeof SECTION_IDS)[number];

const isSectionId = (value: string | undefined): value is SectionId =>
  !!value && (SECTION_IDS as readonly string[]).includes(value);

export const ProfilePage: React.FC = () => {
  const { t } = useTranslation("profile");
  const { potokToken, login } = useAuth();
  const { section } = useParams<{ section: string }>();
  const navigate = useNavigate();

  if (!potokToken) {
    return (
      <div className="profile-auth-screen-container">
        <PotokAuthView onSuccess={(data) => {
          login(data.token, data.user);
        }} />
      </div>
    );
  }

  const activeSection: SectionId = isSectionId(section) ? section : "account";

  return (
    <div className="profile-container">
      <nav className="profile-tabs" aria-label={t("page.title")}>
        {SECTION_IDS.map((id) => (
          <Chip
            key={id}
            active={activeSection === id}
            onClick={() => navigate(id === "account" ? "/profile" : `/profile/${id}`)}
            className="profile-tab-chip"
          >
            {t(`page.tabs.${id}`)}
          </Chip>
        ))}
      </nav>

      {activeSection === "account" ? (
        <div className="profile-section">
          <ProfileAccountSection />
        </div>
      ) : STATUS_SECTIONS.includes(activeSection as TitleStatus) ? (
        <div className="profile-section">
          <ProfileStatusSection status={activeSection as TitleStatus} />
        </div>
      ) : (
        <div className="profile-section">
          <ProfileHistorySection />
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
