import React from "react";
import { useTranslation } from "react-i18next";
import { Save, Play, Info } from "lucide-react";
import { Button, Field, Input } from "./ui";

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

        <form onSubmit={onSave} className="ui-form-stack">
          <Field label={t("profileEditor.nameLabel")} className="settings-form-group">
            <Input
              type="text"
              placeholder={t("profileEditor.namePlaceholder")}
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              disabled={isSettingsLocked || saving}
              required
            />
          </Field>

          <Field label={t("profileEditor.gatewayLabel")} className="settings-form-group">
            <Input
              type="text"
              placeholder={t("profileEditor.gatewayPlaceholder")}
              value={formGateway}
              onChange={(e) => setFormGateway(e.target.value)}
              disabled={isSettingsLocked || saving}
              required
            />
          </Field>

          {!isSettingsLocked && (
            <div className="ui-form-actions">
              <Button type="submit" variant="primary" className="btn-gap-s" disabled={saving}>
                <Save size="1rem" />
                <span>{saving ? t("profileEditor.checking") : isAdding ? t("profileEditor.createProfile") : t("profileEditor.saveChanges")}</span>
              </Button>
              {isAdding && (
                <Button
                  type="button"
                  variant="secondary"
                  className="settings-form-btn-cancel"
                  onClick={onCancel}
                  disabled={saving}
                >
                  {t("profileEditor.cancel")}
                </Button>
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