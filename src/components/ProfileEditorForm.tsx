import React from "react";
import { Save, Play, Info } from "lucide-react";

interface ProfileEditorFormProps {
  isAdding: boolean;
  formName: string;
  setFormName: (val: string) => void;
  formGateway: string;
  setFormGateway: (val: string) => void;
  formTorrentGo: string;
  setFormTorrentGo: (val: string) => void;
  formSearchEngine: string;
  setFormSearchEngine: (val: string) => void;
  formTorrentGoAuthEnabled: boolean;
  setFormTorrentGoAuthEnabled: (val: boolean) => void;
  formTorrentGoAuthLogin: string;
  setFormTorrentGoAuthLogin: (val: string) => void;
  formTorrentGoAuthPassword: string;
  setFormTorrentGoAuthPassword: (val: string) => void;
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
  formTorrentGo,
  setFormTorrentGo,
  formSearchEngine,
  setFormSearchEngine,
  formTorrentGoAuthEnabled,
  setFormTorrentGoAuthEnabled,
  formTorrentGoAuthLogin,
  setFormTorrentGoAuthLogin,
  formTorrentGoAuthPassword,
  setFormTorrentGoAuthPassword,
  onSave,
  onCancel,
  isSettingsLocked = false,
}) => {
  return (
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

      <form onSubmit={onSave} className="settings-form-wrapper">
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
            placeholder="http://127.0.0.1:5000"
            value={formGateway}
            onChange={(e) => setFormGateway(e.target.value)}
            disabled={isSettingsLocked}
            required
          />
        </div>

        <div className="settings-form-group">
          <label className="settings-label">Адрес TorrentGo (Торрент-движок)</label>
          <input
            className="settings-input"
            type="text"
            placeholder="http://127.0.0.1:5282 (опционально)"
            value={formTorrentGo}
            onChange={(e) => setFormTorrentGo(e.target.value)}
            disabled={isSettingsLocked}
          />
        </div>

        <div className="settings-form-group">
          <label className="settings-label">Адрес Поисковика (Search Engine)</label>
          <input
            className="settings-input"
            type="text"
            placeholder="http://127.0.0.1:8081 (опционально)"
            value={formSearchEngine}
            onChange={(e) => setFormSearchEngine(e.target.value)}
            disabled={isSettingsLocked}
          />
        </div>

        <div className="settings-form-group settings-preference-group">
          <div className="settings-auth-checkbox-row">
            <input
              type="checkbox"
              id="torrentGoAuthEnabled"
              checked={formTorrentGoAuthEnabled}
              onChange={(e) => setFormTorrentGoAuthEnabled(e.target.checked)}
              disabled={isSettingsLocked}
              className={isSettingsLocked ? "" : "cursor-pointer"}
            />
            <label htmlFor="torrentGoAuthEnabled" className="settings-label settings-auth-checkbox-label">
              Включить авторизацию TorrentGo
            </label>
          </div>
        </div>

        {formTorrentGoAuthEnabled && (
          <div className="settings-auth-inputs-row">
            <div className="settings-form-group settings-auth-input-container">
              <label className="settings-label">Логин</label>
              <input
                className="settings-input"
                type="text"
                placeholder="admin"
                value={formTorrentGoAuthLogin}
                onChange={(e) => setFormTorrentGoAuthLogin(e.target.value)}
                disabled={isSettingsLocked}
              />
            </div>
            <div className="settings-form-group settings-auth-input-container">
              <label className="settings-label">Пароль</label>
              <input
                className="settings-input"
                type="password"
                placeholder="Пароль"
                value={formTorrentGoAuthPassword}
                onChange={(e) => setFormTorrentGoAuthPassword(e.target.value)}
                disabled={isSettingsLocked}
              />
            </div>
          </div>
        )}

        {!isSettingsLocked && (
          <div className="settings-form-buttons-row">
            <button type="submit" className="settings-btn-primary settings-auth-checkbox-row cursor-pointer btn-gap-s">
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
  );
});

ProfileEditorForm.displayName = "ProfileEditorForm";
export default ProfileEditorForm;
