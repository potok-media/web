import React from "react";
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
  return (
    <div className="settings-pane">
      <section className="settings-section">
        <h2 className="settings-section-title">
          <Play size="1.25rem" />
          <span>{isAdding ? "Новый профиль" : "Параметры соединения"}</span>
        </h2>

        {isSettingsLocked && (
          <div className="settings-lock-banner">
            <Info size="1rem" />
            <span>Настройки подключения заблокированы администратором.</span>
          </div>
        )}

        <form onSubmit={onSave} className="settings-form-wrapper" style={{ display: "flex", flexDirection: "column", gap: "var(--space-m)" }}>
          <div className="settings-form-group">
            <label className="settings-label">Название профиля</label>
            <FocusableInput
              className="settings-input"
              type="text"
              placeholder="Основной сервер"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              disabled={isSettingsLocked || saving}
              required
            />
          </div>

          <div className="settings-form-group">
            <label className="settings-label">Адрес Potok Gateway (BFF)</label>
            <FocusableInput
              className="settings-input"
              type="text"
              placeholder="Адрес до BFF-шлюза"
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
                <span>{saving ? "Проверка…" : isAdding ? "Создать профиль" : "Сохранить изменения"}</span>
              </FocusableButton>
              {isAdding && (
                <FocusableButton
                  type="button"
                  className="settings-btn-primary settings-form-btn-cancel"
                  onClick={onCancel}
                  disabled={saving}
                >
                  Отмена
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
