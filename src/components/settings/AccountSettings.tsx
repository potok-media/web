import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyRound, Save, Send, Link2Off } from "lucide-react";
import { useAuth } from "../../context/AppSettingsContext";
import { useHUD } from "../../context/useHUD";
import { AuthApiClient } from "../../network/AuthApiClient";
import type { TelegramWidgetAuth } from "../../network/ApiTypes";
import { Button, Field, Input } from "../ui";
import { TelegramLoginButton } from "../profile/TelegramLoginButton";
import { TelegramStartAuthButton } from "../profile/TelegramStartAuthButton";

const MIN_PASSWORD_LENGTH = 6;

// The Login Widget requires HTTPS; on HTTP fall back to the bot deep-link flow.
const canUseTelegramWidget = typeof window !== "undefined" && window.location.protocol === "https:";

const AccountSettings: React.FC = () => {
  const { t } = useTranslation("settings");
  const { show: showHUD } = useHUD();
  const { potokUser, telegramAuthEnabled, telegramBotUsername, updateUser } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState(potokUser?.username ?? "");
  const [saving, setSaving] = useState(false);

  if (!potokUser) return null;

  // Legacy cached users may lack the flag; only treat as password-less when explicitly false.
  const hasPassword = potokUser.hasPassword !== false;

  const validatePassword = (): boolean => {
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      showHUD("warning", t("account.passwordTooShort"));
      return false;
    }
    if (newPassword !== confirmPassword) {
      showHUD("warning", t("account.passwordsDoNotMatch"));
      return false;
    }
    return true;
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword.trim()) {
      showHUD("warning", t("account.fillAllFields"));
      return;
    }
    if (!validatePassword()) return;
    setSaving(true);
    try {
      await AuthApiClient.changePassword({ currentPassword, newPassword });
      showHUD("success", t("account.passwordChanged"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      showHUD("error", err instanceof Error ? err.message : t("account.fillAllFields"));
    } finally {
      setSaving(false);
    }
  };

  const handleSetCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      showHUD("warning", t("account.fillAllFields"));
      return;
    }
    if (!validatePassword()) return;
    setSaving(true);
    try {
      const updated = await AuthApiClient.setCredentials({ username: username.trim(), password: newPassword });
      updateUser(updated);
      showHUD("success", t("account.credentialsSaved"));
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      showHUD("error", err instanceof Error ? err.message : t("account.fillAllFields"));
    } finally {
      setSaving(false);
    }
  };

  const handleLinkTelegram = async (data: TelegramWidgetAuth) => {
    try {
      const updated = await AuthApiClient.linkTelegram(data);
      updateUser(updated);
      showHUD("success", t("account.telegramLinkedSuccess"));
    } catch (err: unknown) {
      showHUD("error", err instanceof Error ? err.message : t("account.fillAllFields"));
    }
  };

  const handleUnlinkTelegram = async () => {
    try {
      const updated = await AuthApiClient.unlinkTelegram();
      updateUser(updated);
      showHUD("info", t("account.telegramUnlinked"));
    } catch (err: unknown) {
      showHUD("error", err instanceof Error ? err.message : t("account.fillAllFields"));
    }
  };

  return (
    <div className="settings-pane">
      <section className="settings-section">
        <h2 className="settings-section-title">
          <KeyRound size="1.25rem" />
          <span>{hasPassword ? t("account.changePasswordTitle") : t("account.setupLoginTitle")}</span>
        </h2>
        <p className="settings-description">{t("account.signedInAs", { username: potokUser.username })}</p>

        {hasPassword ? (
          <form onSubmit={handleChangePassword} className="ui-form-stack">
            <Field label={t("account.currentPassword")} className="settings-form-group">
              <Input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={saving}
                required
              />
            </Field>
            <Field label={t("account.newPassword")} className="settings-form-group">
              <Input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={saving}
                required
              />
            </Field>
            <Field label={t("account.confirmPassword")} className="settings-form-group">
              <Input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={saving}
                required
              />
            </Field>
            <div className="ui-form-actions">
              <Button type="submit" variant="primary" className="btn-gap-s" disabled={saving}>
                <Save size="1rem" />
                <span>{saving ? t("account.saving") : t("account.savePassword")}</span>
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSetCredentials} className="ui-form-stack">
            <p className="settings-description">{t("account.setupLoginDesc")}</p>
            <Field label={t("account.usernameLabel")} className="settings-form-group">
              <Input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={saving}
                required
              />
            </Field>
            <Field label={t("account.passwordLabel")} className="settings-form-group">
              <Input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={saving}
                required
              />
            </Field>
            <Field label={t("account.confirmPassword")} className="settings-form-group">
              <Input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={saving}
                required
              />
            </Field>
            <div className="ui-form-actions">
              <Button type="submit" variant="primary" className="btn-gap-s" disabled={saving}>
                <Save size="1rem" />
                <span>{saving ? t("account.saving") : t("account.saveCredentials")}</span>
              </Button>
            </div>
          </form>
        )}
      </section>

      {telegramAuthEnabled && (
        <section className="settings-section">
          <h2 className="settings-section-title">
            <Send size="1.25rem" />
            <span>{t("account.telegramTitle")}</span>
          </h2>

          {potokUser.telegramLinked ? (
            <div className="ui-form-stack">
              <p className="settings-description">
                {potokUser.telegramUsername
                  ? t("account.telegramLinkedAs", { username: potokUser.telegramUsername })
                  : t("account.telegramLinked")}
              </p>
              <div className="ui-form-actions">
                <Button type="button" variant="secondary" className="btn-gap-s" onClick={handleUnlinkTelegram}>
                  <Link2Off size="1rem" />
                  <span>{t("account.telegramUnlink")}</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="ui-form-stack">
              <p className="settings-description">{t("account.telegramLinkDesc")}</p>
              {canUseTelegramWidget && telegramBotUsername ? (
                <TelegramLoginButton botUsername={telegramBotUsername} onAuth={handleLinkTelegram} />
              ) : (
                <TelegramStartAuthButton
                  label={t("account.telegramLinkButton")}
                  onComplete={(result) => updateUser(result.user)}
                />
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default AccountSettings;
