import React from "react";
import { Save, Play, Info } from "lucide-react";

interface ProfileEditorFormProps {
  isAdding: boolean;
  formName: string;
  setFormName: (val: string) => void;
  formGateway: string;
  setFormGateway: (val: string) => void;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
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
  isSettingsLocked = false,
}) => {
  return (
    <div className="settings-pane">
      <section className="settings-section">
        <h2 className="settings-section-title">
          <Play size={20} />
          <span>{isAdding ? "Новый профиль" : "Параметры соединения"}</span>
        </h2>

        {isSettingsLocked && (
          <div className="settings-lock-banner">
            <Info size={16} />
            <span>Настройки подключения заблокированы администратором.</span>
          </div>
        )}

        <form onSubmit={onSave} className="settings-form-wrapper" style={{ display: "flex", flexDirection: "column", gap: "var(--space-m)" }}>
          <div className="settings-form-group">
            <label className="settings-label">Название профиля</label>
            <input
              className="settings-input"
              type="text"
              placeholder="Основной сервер"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              disabled={isSettingsLocked}
              required
            />
          </div>

          <div className="settings-form-group">
            <label className="settings-label">Адрес Potok Gateway (BFF)</label>
            <input
              className="settings-input"
              type="text"
              placeholder="Адрес до BFF-шлюза"
              value={formGateway}
              onChange={(e) => setFormGateway(e.target.value)}
              disabled={isSettingsLocked}
              required
            />
          </div>

          {!isSettingsLocked && (
            <div className="settings-form-buttons-row" style={{ marginTop: "var(--space-s)" }}>
              <button type="submit" className="settings-btn-primary cursor-pointer btn-gap-s">
                <Save size={16} />
                <span>{isAdding ? "Создать профиль" : "Сохранить изменения"}</span>
              </button>
              {isAdding && (
                <button
                  type="button"
                  className="settings-btn-primary settings-form-btn-cancel"
                  onClick={onCancel}
                >
                  Отмена
                </button>
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
