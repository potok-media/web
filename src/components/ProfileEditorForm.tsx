import React from "react";
import { useTranslation } from "react-i18next";
import { Save, Play, Info } from "lucide-react";
import { FocusableButton, FocusableInput } from "./common/TVNavigation";

interface ProfileEditorFormProps {
  isAdding: boolean;
  formName: string;
  setFormName: (val: string) => void;
  formGateway: string;
  setFormGateway: (val: string) => void;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
  saving?: boolean;
  isSettingsLocked?: boolean;
}

export const ProfileEditorForm: React.FC<ProfileEditorFormProps> = React.memo(({
  isAdding,
  formName,
  setFormName,
  formGateway,
  setFormGateway,
  onSave,
  onCancel,
  saving = false,
  isSettingsLocked = false,
}) => {
  const { t } = useTranslation("settings");
  return (
    <div className="settings-pane">
      <section className="settings-section">
        <h2 className="settings-section-title">
          <Play size="1.25rem" />
          <span>{isAdding ? t("profileEditor.newProfile") : t("profileEditor.connectionParams")}</span>
        </h2>

        {isSettingsLocked && (
          <div className="settings-lock-banner">
            <Info size="1rem" />
            <span>{t("profileEditor.lockedBanner")}</span>
          </div>
        )}

        <form onSubmit={onSave} className="settings-form-wrapper" style={{ display: "flex", flexDirection: "column", gap: "var(--space-m)" }}>
          <div className="settings-form-group">
            <label className="settings-label">{t("profileEditor.nameLabel")}</label>
            <FocusableInput
              className="settings-input"
              type="text"
              placeholder={t("profileEditor.namePlaceholder")}
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              disabled={isSettingsLocked || saving}
              required
            />
          </div>

          <div className="settings-form-group">
            <label className="settings-label">{t("profileEditor.gatewayLabel")}</label>
            <FocusableInput
              className="settings-input"
              type="text"
              placeholder={t("profileEditor.gatewayPlaceholder")}
              value={formGateway}
              onChange={(e) => setFormGateway(e.target.value)}
              disabled={isSettingsLocked || saving}
              required
            />
          </div>

          {!isSettingsLocked && (
            <div className="settings-form-buttons-row" style={{ marginTop: "var(--space-s)" }}>
              <FocusableButton type="submit" className="settings-btn-primary cursor-pointer btn-gap-s" disabled={saving}>
                <Save size="1rem" />
                <span>{saving ? t("profileEditor.checking") : isAdding ? t("profileEditor.createProfile") : t("profileEditor.saveChanges")}</span>
              </FocusableButton>
              {isAdding && (
                <FocusableButton
                  type="button"
                  className="settings-btn-primary settings-form-btn-cancel"
                  onClick={onCancel}
                  disabled={saving}
                >
                  {t("profileEditor.cancel")}
                </FocusableButton>
              )}
            </div>
          )}
        </form>
      </section>
    </div>
  );
});

ProfileEditorForm.displayName = "ProfileEditorForm";
export default ProfileEditorForm;
